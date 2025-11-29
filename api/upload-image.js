// api/upload-image.js
// Качване на снимка в GitHub през Vercel Function – токен от ENV

export default async function handler(req, res) {
  console.log("📥 [API] upload-image.js");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Only POST allowed" });
  }

  try {
    // ⚙️ 1) ВЗИМАМЕ токена от ENV (в Vercel ключът ти е GITHUB_TOKEN)
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      console.log("❌ Missing GITHUB_TOKEN env");
      return res
        .status(500)
        .json({ ok: false, error: "Server missing token" });
    }

    // ⚙️ 2) Body от клиента
    const rawBody = req.body || "{}";
    const body =
      typeof rawBody === "string" ? JSON.parse(rawBody || "{}") : rawBody;

    const { fileName, fileBase64, path } = body;
    console.log("📄 fileName:", fileName);
    console.log("📂 path:", path);

    if (!fileName || !fileBase64) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing fileName or fileBase64" });
    }

    // ⚙️ 3) Repo настройки
    const REPO = process.env.GITHUB_REPO || "SoulFlameAdmin/bbqcorner";
    const BRANCH = process.env.GITHUB_BRANCH || "main";

    // махаме 'data:image/...;base64,' ако има
    const pureBase64 = fileBase64.includes(",")
      ? fileBase64.split(",")[1]
      : fileBase64;

    const UPLOAD_PATH = path || `public/uploads/${Date.now()}-${fileName}`;
    console.log("⬆ Uploading to:", UPLOAD_PATH);

    // ⚙️ 4) PUT към GitHub
    const githubRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${UPLOAD_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
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
    console.log("📦 GitHub response:", json);

    if (!githubRes.ok || !json.content || !json.content.download_url) {
      return res.status(500).json({ ok: false, json });
    }

    const url = json.content.download_url;
    return res.status(200).json({
      ok: true,
      via: "vercel-github",
      url,
    });
  } catch (err) {
    console.log("💥 API error:", err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
}
