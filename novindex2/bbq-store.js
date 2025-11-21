// novindex2/bbq-store.js
// ======================================================
// ☁️ Firestore слой за Corner BBQ
// Прави window.BBQ_STORE.load() и window.BBQ_STORE.save()
// да работят с Firebase Firestore.
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

// ЕДНА централна колекция/документ в Firestore за цялото меню
// Можеш да промениш "bbq_main" и "catalog" по твое желание
const COLLECTION = "bbq_site";
const DOCUMENT   = "catalog_v1";

window.BBQ_STORE = {
  // =========================================
  // Зареждане от Firestore
  // Вика се от novindex2.js → loadFromCloud()
  // =========================================
  async load() {
    if (!db) return null;

    try {
      const ref  = doc(db, COLLECTION, DOCUMENT);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        console.log(
          "[BBQ_STORE] Doc още не съществува в Firestore → връщам null"
        );
        return null;
      }

      const data = snap.data();
      console.log("✅ [BBQ_STORE] Данните са заредени от Firestore:", data);

      // Връщаме структурата така, че да е съвместима с novindex2.js:
      // data.CATALOG, data.ORDER, data.ADDONS, data.cat_thumbs, data.addons_labels
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

  // =========================================
  // Запис към Firestore
  // Вика се от moderator.js → saveToCloud()
  // =========================================
  async save(payload) {
    if (!db) {
      console.error("[BBQ_STORE] Няма db, не мога да записвам.");
      return { ok: false, via: "no-db" };
    }

    try {
      const ref = doc(db, COLLECTION, DOCUMENT);

      // Добавяме serverTimestamp за ориентир в Firestore
      const toSave = {
        ...payload,
        savedAtISO: payload.savedAt || new Date().toISOString(),
        updatedAt: serverTimestamp()
      };

      await setDoc(ref, toSave);

      // Локален кеш – за fallback, ако /api/catalog падне
      try {
        localStorage.setItem("BBQ_MAIN_CATALOG", JSON.stringify(payload));
      } catch (e) {
        console.warn("[BBQ_STORE] Не мога да запиша локален кеш:", e);
      }

      console.log("✅ [BBQ_STORE] Данните са записани в Firestore");
      return { ok: true, via: "firestore" };
    } catch (e) {
      console.error("[BBQ_STORE] Грешка при save() към Firestore:", e);
      return { ok: false, via: "firestore-error", error: String(e) };
    }
  }
};
