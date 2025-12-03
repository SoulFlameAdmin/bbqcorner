// novindex2/siteContent.js – мост между сайта и Firestore + LocalStorage

console.log("🔥 siteContent.js зареден.");

// Взимаме Firestore DB от firebase-config.js (сложен е на window.firebaseDb)
const db = window.firebaseDb;

if (!db) {
  console.error("❌ Firestore db липсва! firebase-config.js не е зареден.");
}

// Firestore imports (от Firebase CDN v11)
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Тук пазим целия каталог (категории, продукти, добавки, thumbnails)
const COLLECTION = "bbq_site";
const DOC_ID     = "catalog_v1";
const LS_KEY     = "BBQ_MAIN_CATALOG";

/* ==============================
   🔥 CRUD към Firestore
   ============================== */

async function loadFromFirestore() {
  if (!db) return null;
  try {
    const ref  = doc(db, COLLECTION, DOC_ID);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn("⚠️ Firestore: документът catalog_v1 още не съществува.");
      return null;
    }

    const data = snap.data();
    console.log("🔥 Данни заредени от Firestore:", data);
    return data;
  } catch (e) {
    console.error("❌ Грешка при Firestore load():", e);
    return null;
  }
}

/**
 * Записва ПЪЛНИЯ payload в Firestore.
 * ВАЖНО: тук НЯМА merge – презаписва целия документ,
 * за да могат тритите неща наистина да изчезват.
 */

async function saveToFirestore(payload) {
  if (!db) return false;
  try {
    // 🔥 правим копие и чистим всички addons_labels, независимо от case
    const cleanPayload = { ...payload };

    // махаме стандартното поле
    delete cleanPayload.addons_labels;
    delete cleanPayload.ADDONS_LABELS;

    // защитно – ако някъде е вкаранo вътре
    if (cleanPayload.catalog && cleanPayload.catalog.addons_labels) {
      delete cleanPayload.catalog.addons_labels;
    }
    if (cleanPayload.CATALOG && cleanPayload.CATALOG.addons_labels) {
      delete cleanPayload.CATALOG.addons_labels;
    }

    // още по-защитно: чистим всички root полета, които по някакъв начин
    // се казват addons_labels (какъвто и case да е)
    Object.keys(cleanPayload).forEach((k) => {
      if (k.toLowerCase() === "addons_labels") {
        delete cleanPayload[k];
      }
    });

    // Firestore не приема undefined → JSON round-trip
    const cleaned = JSON.parse(JSON.stringify(cleanPayload));

    const ref = doc(db, COLLECTION, DOC_ID);
    await setDoc(ref, cleaned); // FULL overwrite

    console.log(
      "🔥 Записано във Firestore (bbq_site/catalog_v1, FULL OVERWRITE).",
      cleaned
    );
    return true;
  } catch (e) {
    console.error("❌ Грешка при Firestore save():", e);
    return false;
  }
}


/* ==============================
   🔔 Helper за събитие
   ============================== */

function dispatchStoreReady(state) {
  try {
    const ev = new CustomEvent("bbq-store-ready", {
      detail: state
    });
    window.dispatchEvent(ev);
  } catch (e) {
    console.warn("⚠️ Неуспешно dispatch на bbq-store-ready:", e);
  }
}

/* ==============================
   🧠 Глобален BBQ_STORE API
   ============================== */

const BBQ_STORE = {
  // вътрешно състояние
  _state: null,

  // getter за удобно четене: BBQ_STORE.state
  get state() {
    return this._state;
  },

  /**
   * Основно зареждане:
   * 1) Firestore
   * 2) /api/catalog (ако някога имаш backend)
   * 3) LocalStorage (fallback)
   */
  async load() {
    // 1) 🔥 Firestore
    let data = await loadFromFirestore();

    // 2) ☁️ API fallback (ако някой ден имаш backend)
    if (!data) {
      try {
        const r = await fetch("/api/catalog", { cache: "no-store" });
        if (r.ok) {
          data = await r.json();
          console.log("☁️ Заредено от /api/catalog:", data);
        }
      } catch (e) {
        console.warn("API /api/catalog недостъпен:", e);
      }
    }

    // 3) 💾 LocalStorage fallback
    if (!data) {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          data = JSON.parse(raw);
          console.log("💾 Заредено от localStorage:", data);
        }
      } catch (e) {
        console.warn("LocalStorage catalog празен/повреден:", e);
      }
    }

    if (!data) {
      console.warn("⚠️ Няма данни за каталог (Firestore/API/LocalStorage).");
      this._state = null;
      return null;
    }

    // ✅ имаме данни -> пазим в state + кеш в localStorage
    this._state = data;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("⚠️ Неуспешно кеширане в localStorage:", e);
    }

    // казваме на целия сайт, че данните са готови
    dispatchStoreReady(this._state);

    return data;
  },

  /**
   * Запис + обновяване на state.
   * Тук payload трябва да е ПЪЛНИЯТ каталог от модератора:
   * { CATALOG, ORDER, ADDONS, cat_thumbs, addons_labels, savedAt }
   */
  async save(payload) {
    let via = null;

    // 1) 🔥 Firestore – ПЪЛЕН overwrite
    const okFs = await saveToFirestore(payload);
    if (okFs) {
      via = "firestore";
    } else {
      // 2) ☁️ API fallback (ако някой ден имаш backend)
      try {
        const r = await fetch("/api/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (r.ok) {
          via = "api";
        }
      } catch (e) {
        console.warn("❌ API /api/catalog недостъпен:", e);
      }

      // 3) 💾 LocalStorage fallback, ако и Firestore, и API паднат
      if (!via) {
        try {
          // Тук НЕ merge-ваме, а директно презаписваме
          localStorage.setItem(LS_KEY, JSON.stringify(payload));
          via = "local";
          console.log("💾 Записано в localStorage (FULL OVERWRITE).");
        } catch (err) {
          console.error("❌ LocalStorage save провален:", err);
          return { ok: false, error: err };
        }
      }
    }

    // ако сме стигнали до тук, има успешен запис в някакъв слой
    // обновяваме вътрешното състояние – използваме payload директно
    this._state = payload;

    // кеш в localStorage (дори да сме писали във Firestore – за по-бърз старт)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this._state));
    } catch (e) {
      console.warn("⚠️ Неуспешно кеширане в localStorage (след save):", e);
    }

    // известяване на останалата част от сайта
    dispatchStoreReady(this._state);

    return { ok: true, via };
  }
};

// за достъп от други скриптове
window.BBQ_STORE = BBQ_STORE;

// Автоматично първоначално зареждане при стартиране на сайта
// (moderator.js и novindex2.js могат ПАК да викат load() ако искат)
BBQ_STORE.load().catch((e) => {
  console.warn("⚠️ Първоначално BBQ_STORE.load() даде грешка:", e);
});

console.log("🔥 siteContent.js готов (BBQ_STORE е на window).");
