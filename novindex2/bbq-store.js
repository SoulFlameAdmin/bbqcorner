// novindex2/bbq-store.js
// ======================================================
// ☁️ Firestore слой за Corner BBQ
// Прави window.BBQ_STORE.load() и window.BBQ_STORE.save()
// да работят стабилно с Firebase Firestore.
// ======================================================

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// DB идва от firebase-config.js
const db = window.firebaseDb;

if (!db) {
  console.error(
    "[BBQ_STORE] Firebase DB не е наличен. Увери се, че firebase-config.js се зарежда преди bbq-store.js"
  );
}

// ⬆ ИМЕТО НА КОЛЕКЦИЯТА И ДОКУМЕНТА (не ги пипай без нужда)
const COLLECTION = "bbq_site";
const DOCUMENT   = "catalog_v1";

window.BBQ_STORE = {

  // ======================================================
  // 📥 LOAD — Зареждане от Firestore
  // Вика се от novindex2.js → loadFromCloud()
  // ======================================================
  async load() {
    if (!db) return null;

    try {
      const ref  = doc(db, COLLECTION, DOCUMENT);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        console.log("[BBQ_STORE] Doc още не съществува → връщам null");
        return null;
      }

      const data = snap.data();
      console.log("✅ [BBQ_STORE] Заредени данни от Firestore:", data);

      // Връщаме структурата като при стария JSON файл
      return {
        ...data,
        ok: true,
        via: "firestore"
      };

    } catch (e) {
      console.error("[BBQ_STORE] Грешка при load() от Firestore:", e);
      return null;
    }
  },

  // ======================================================
  // 💾 SAVE — Запис в Firestore
  // Вика се от moderator.js → saveToCloud()
  // ======================================================
  async save(payload) {
    if (!db) {
      console.error("[BBQ_STORE] Няма db → прекратявам запис.");
      return { ok: false, via: "no-db" };
    }

    try {
      const ref = doc(db, COLLECTION, DOCUMENT);

      // -----------------------------
      // 1) Премахваме addons_labels:
      // Firestore хвърля грешка за nested entity
      // -----------------------------
      const cleanPayload = { ...payload };
      if (cleanPayload.addons_labels) {
        delete cleanPayload.addons_labels;
      }

      // -----------------------------
      // 2) Гарантираме ЧИСТ JSON:
      // премахва undefined, функции, прототипи
      // -----------------------------
      const jsonSafe = JSON.parse(JSON.stringify(cleanPayload));

      // -----------------------------
      // 3) Добавяме метаданни (време)
      // -----------------------------
      const toSave = {
        ...jsonSafe,
        savedAtISO: jsonSafe.savedAt || new Date().toISOString(),
        updatedAt: serverTimestamp()
      };

      // -----------------------------
      // 4) Запис в Firestore
      // -----------------------------
      await setDoc(ref, toSave);

      // -----------------------------
      // 5) Локален кеш (fallback)
      // -----------------------------
      try {
        localStorage.setItem("BBQ_MAIN_CATALOG", JSON.stringify(cleanPayload));
      } catch (err) {
        console.warn("[BBQ_STORE] Не мога да запиша локален кеш:", err);
      }

      console.log("✅ [BBQ_STORE] Данните са записани в Firestore");
      return { ok: true, via: "firestore" };

    } catch (e) {
      console.error("[BBQ_STORE] Грешка при save():", e);
      return { ok: false, via: "firestore-error", error: String(e) };
    }
  }
};
