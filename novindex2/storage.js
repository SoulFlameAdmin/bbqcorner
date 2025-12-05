// novindex2/storage.js
// ===========================================
// 📦 Firebase Storage Upload Manager
// Работи 100% във Vercel и локално.
// Качва снимки → връща URL + path
// ===========================================

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

// Взимаме инстанцията от firebase-config.js
const app = window.firebaseApp;
const storage = getStorage(app);

// ===========================================
// 🧹 sanitizeName(name)
// Чисти името на файла → само букви, цифри и - _ .
// ===========================================
function sanitizeName(name) {
  return name.replace(/[^a-z0-9.\-_]/gi, "_");
}

// ===========================================
// 📌 uploadProductImage(file, categoryKey, productKey)
// Път: products/{categoryKey}/{productKey}/{timestamp}_{filename}
// ===========================================
async function uploadProductImage(file, categoryKey, productKey) {
  try {
    const safeName = sanitizeName(file.name);
    const timestamp = Date.now();
    const path = `products/${categoryKey}/${productKey}/${timestamp}_${safeName}`;

    const fileRef = ref(storage, path);

    // качваме файла
    const snap = await uploadBytes(fileRef, file);

    // взимаме публичния URL
    const url = await getDownloadURL(snap.ref);

    return { url, path };
  } catch (err) {
    console.error("❌ uploadProductImage error:", err);
    throw err;
  }
}

// ===========================================
// 📌 uploadCategoryThumb(file, categoryKey)
// Път: categories/{categoryKey}/{timestamp}_{filename}
// ===========================================
async function uploadCategoryThumb(file, categoryKey) {
  try {
    const safeName = sanitizeName(file.name);
    const timestamp = Date.now();
    const path = `categories/${categoryKey}/${timestamp}_${safeName}`;

    const fileRef = ref(storage, path);
    const snap = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snap.ref);

    return { url, path };
  } catch (err) {
    console.error("❌ uploadCategoryThumb error:", err);
    throw err;
  }
}

// ===========================================
// 🌐 Изнасяме uploader-а глобално,
// за да работи от moderator.js, който не е module
// ===========================================
window.BBQ_UPLOAD = {
  uploadProductImage,
  uploadCategoryThumb,

  // универсална кратка функция: upload(file, cat, prod)
  async upload(file, categoryKey, productKey) {
    const { url } = await uploadProductImage(file, categoryKey, productKey);
    return url;
  }
};

console.log("🔥 storage.js зареден — BBQ_UPLOAD е достъпен глобално.");
