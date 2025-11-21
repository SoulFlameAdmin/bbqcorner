// api/upload-image.js
// ✓ Работи с Vercel Serverless Functions
// ✓ Работи с GitHub API
// ✓ Връща директен публичен URL
// ✓ Пише логове за DEBUG в response
// =============================================

export default async function handler(req, res) {
  console.log("📥 [API] upload-image.js получи заявка");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Only POST allowed" });
  }

  try {
    const { fileName, fileBase64, path } = req.body;
    console.log("📄 [API] fileName:", fileName);
    console.log("📂 [API] path:", path);

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = "SoulFlameAdmin/bbqcorner";
    const BRANCH = "main";

    if (!GITHUB_TOKEN) {
      console.log("❌ [API] Missing GITHUB token!!!");
      return res.status(500).json({ ok: false, error: "Missing token" });
    }

    const UPLOAD_PATH = path || `public/uploads/${fileName}`;

    console.log("⬆ [API] Uploading to:", UPLOAD_PATH);

    const githubRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${UPLOAD_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Upload from CornerBBQ Moderator",
          content: fileBase64,
          branch: BRANCH,
        }),
      }
    );

    const json = await githubRes.json();
    console.log("📦 [API] GitHub API response:", json);

    if (!json.content || !json.content.download_url) {
      console.log("❌ [API] GitHub upload failed");
      return res.status(500).json({ ok: false, json });
    }

    const url = json.content.download_url;

    console.log("✅ [API] УСПЕХ →", url);

    return res.status(200).json({
      ok: true,
      via: "vercel-github",
      url: url,
    });
  } catch (err) {
    console.log("💥 [API ERROR]", err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
}
