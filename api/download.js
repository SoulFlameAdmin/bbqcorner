const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const ALLOWED = [
  "youtube.com","www.youtube.com","m.youtube.com","youtu.be",
  "instagram.com","www.instagram.com",
  "facebook.com","www.facebook.com","m.facebook.com","fb.watch"
];

function fail(res, code, message) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ ok:false, error:message }));
}

function safeUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!ALLOWED.includes(u.hostname.toLowerCase())) return null;
    return u.toString();
  } catch { return null; }
}

function findOutput(prefix) {
  const dir = "/tmp";
  const base = path.basename(prefix);
  const hit = fs.readdirSync(dir).find(name => name.startsWith(base + "."));
  return hit ? path.join(dir, hit) : null;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") return fail(res, 405, "Use GET.");
  const source = safeUrl(String(req.query.url || ""));
  if (!source) return fail(res, 400, "Поддържат се публични YouTube, Instagram и Facebook линкове.");

  const format = req.query.format === "mp3" ? "mp3" : "mp4";
  const quality = ["best","1080","720"].includes(req.query.quality) ? req.query.quality : "best";
  const bin = path.join(process.cwd(), "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
  if (!fs.existsSync(bin)) return fail(res, 500, "yt-dlp binary липсва от deployment-а.");

  const token = Date.now() + "-" + Math.random().toString(36).slice(2,8);
  const prefix = path.join("/tmp", "soulflame-" + token);
  const output = prefix + ".%(ext)s";

  const common = [
    "--no-playlist","--no-warnings","--restrict-filenames",
    "--socket-timeout","20","--retries","2","--fragment-retries","2",
    "--max-filesize","500M","-o",output,
    "--ffmpeg-location",ffmpegPath
  ];

  let args;
  if (format === "mp3") {
    args = [...common,"-x","--audio-format","mp3","--audio-quality","0",source];
  } else {
    const q = quality === "1080"
      ? "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/best[height<=1080]"
      : quality === "720"
      ? "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/best[height<=720]"
      : "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best";
    args = [...common,"-f",q,"--merge-output-format","mp4",source];
  }

  let stderr = "";
  const child = spawn(bin, args, { stdio:["ignore","ignore","pipe"] });
  child.stderr.on("data", d => { stderr += d.toString(); if (stderr.length > 12000) stderr = stderr.slice(-12000); });

  const timeout = setTimeout(() => child.kill("SIGKILL"), 295000);

  child.on("error", err => {
    clearTimeout(timeout);
    return fail(res, 500, "Downloader engine error: " + err.message);
  });

  child.on("close", code => {
    clearTimeout(timeout);
    const file = findOutput(prefix);
    if (code !== 0 || !file) {
      const compact = stderr.split("\n").filter(Boolean).slice(-3).join(" | ");
      return fail(res, code === null ? 504 : 422, compact || "Източникът не можа да бъде обработен.");
    }

    const ext = path.extname(file).slice(1).toLowerCase() || format;
    const stat = fs.statSync(file);
    res.statusCode = 200;
    res.setHeader("Content-Type", ext === "mp3" ? "audio/mpeg" : "video/mp4");
    res.setHeader("Content-Length", String(stat.size));
    res.setHeader("Content-Disposition", 'attachment; filename="soulflame-download.' + ext + '"');
    res.setHeader("Cache-Control", "private, no-store");

    const stream = fs.createReadStream(file);
    const cleanup = () => { try { fs.unlinkSync(file); } catch {} };
    stream.on("error", () => { cleanup(); if (!res.headersSent) fail(res,500,"File streaming error."); else res.end(); });
    res.on("close", cleanup);
    stream.pipe(res);
  });
};
