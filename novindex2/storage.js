// novindex2/storage.js
// ===========================================
// 📦 Firebase Storage за снимки
// Път: products/{category}/{productId}/{filename}.jpg
// ===========================================

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

// използваме app-а, който сложихме на window във firebase-config.js
const app = window.firebaseApp;
const storage = getStorage(app);

// лека чистка на името на файла
function sanitizeName(name) {
  return name.replace(/[^a-z0-9.\-_]/gi, "_");
}

/**
 * Качва снимка за ПРОДУКТ:
 * products/{categoryKey}/{productKey}/{timestamp_safeName}
 */
async function uploadProductImage(file, categoryKey, productKey) {
  const safeName = sanitizeName(file.name);
  const path = `products/${categoryKey}/${productKey}/${Date.now()}_${safeName}`;

  const storageRef = ref(storage, path);
  const snapshot   = await uploadBytes(storageRef, file);
  const url        = await getDownloadURL(snapshot.ref);

  return { url, path }; // url -> за img, path -> инфо ако ти трябва
}

/**
 * (за следващ етап) – качва thumbnail за категория:
 * categories/{categoryKey}/{timestamp_safeName}
 */
async function uploadCategoryThumb(file, categoryKey) {
  const safeName = sanitizeName(file.name);
  const path = `categories/${categoryKey}/${Date.now()}_${safeName}`;

  const storageRef = ref(storage, path);
  const snapshot   = await uploadBytes(storageRef, file);
  const url        = await getDownloadURL(snapshot.ref);

  return { url, path };
}

// Правим функциите достъпни за moderator.js (който НЕ е module)
window.BBQ_UPLOAD = {
  uploadProductImage,
  uploadCategoryThumb,

  // удобен alias, ако искаш просто URL
  async upload(file, categoryKey, productKey) {
    const { url } = await uploadProductImage(file, categoryKey, productKey);
    return url;
  }
};

console.log("🔥 storage.js готов (BBQ_UPLOAD е на window).");
