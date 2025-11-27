// api/upload-image.js
// Vercel Serverless функция за качване на снимка в GitHub

export default async function handler(req, res) {
  console.log("📥 [API] upload-image.js получи заявка");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Only POST allowed" });
  }

  try {
    // понякога body идва като string → парсваме го
    const rawBody = req.body || "{}";
    const body =
      typeof rawBody === "string" ? JSON.parse(rawBody || "{}") : rawBody;

    const { fileName, fileBase64, path } = body;
    console.log("📄 [API] fileName:", fileName);
    console.log("📂 [API] path:", path);

    if (!fileName || !fileBase64) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing fileName or fileBase64" });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = "SoulFlameAdmin/bbqcorner";
    const BRANCH = "main";

    if (!GITHUB_TOKEN) {
      console.log("❌ [API] Missing GITHUB token!!!");
      return res.status(500).json({ ok: false, error: "Missing token" });
    }

    // махаме "data:image/...;base64," ако го има
    const pureBase64 = fileBase64.includes(",")
      ? fileBase64.split(",")[1]
      : fileBase64;

    const UPLOAD_PATH = path || `public/uploads/${Date.now()}-${fileName}`;

    console.log("⬆ [API] Uploading to:", UPLOAD_PATH);

    const githubRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${UPLOAD_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          message: `Upload from CornerBBQ Moderator: ${fileName}`,
          content: pureBase64,
          branch: BRANCH,
        }),
      }
    );

    const json = await githubRes.json();
    console.log("📦 [API] GitHub API response:", json);

    if (!githubRes.ok || !json.content || !json.content.download_url) {
      console.log("❌ [API] GitHub upload failed");
      return res.status(500).json({ ok: false, json });
    }

    const url = json.content.download_url;
    console.log("✅ [API] УСПЕХ →", url);

    return res.status(200).json({
      ok: true,
      via: "vercel-github",
      url,
    });
  } catch (err) {
    console.log("💥 [API ERROR]", err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
}
