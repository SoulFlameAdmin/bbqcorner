// api/upload-image.js
// Vercel Serverless функция за качване на снимка в GitHub (с Bearer token)

export default async function handler(req, res) {
  console.log("📥 [API] upload-image.js получи заявка");

  // ❗ Само POST заявки
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Only POST allowed" });
  }

  try {
    // 🛡️ 1. Взимаме токена от Authorization header
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      console.log("❌ [API] Missing Authorization header");
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    const GITHUB_TOKEN = authHeader.replace("Bearer ", "").trim();
    if (!GITHUB_TOKEN) {
      console.log("❌ [API] Bearer token was empty");
      return res.status(400).json({ ok: false, error: "Token empty" });
    }

    console.log("🔑 [API] Получен Bearer Token (OK)");

    // 🧩 2. Body (може да е string → парсваме)
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

    // 🧬 3. GitHub upload данни
    const REPO = process.env.GITHUB_REPO || "SoulFlameAdmin/bbqcorner";
    const BRANCH = process.env.GITHUB_BRANCH || "main";

    // 🧹 махаме data:image/...;base64,
    const pureBase64 = fileBase64.includes(",")
      ? fileBase64.split(",")[1]
      : fileBase64;

    const UPLOAD_PATH = path || `public/uploads/${Date.now()}-${fileName}`;

    console.log("⬆ [API] Uploading to:", UPLOAD_PATH);

    // 🚀 4. Upload към GitHub
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
