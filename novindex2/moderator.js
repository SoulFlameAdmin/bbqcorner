/* ===========================================================
 * E:\BBQ_SITE\novindex2\moderator.js
 * БЛОК 1: ИНИЦИАЛИЗАЦИЯ НА MODERATOR MODE И РЕЖИМ ФЛАГ
 * (START)
 * =========================================================== */


document.addEventListener("DOMContentLoaded", () => {
  // Флаг в localStorage, който пази дали сме в MOD режим
  const LS_MODE_FLAG = "bbq_mode_flag";

  // Параметрите в URL – използваме ?mode=moderator
  const urlParams = new URLSearchParams(window.location.search);

  // Локална променлива – в този момент още не знаем дали сме MOD
  let isModerator = false;

  // 1) Ако има записан флаг в localStorage – означава, че сме били в MOD преди рефреш
  if (localStorage.getItem(LS_MODE_FLAG) === "true") {
    isModerator = true;

    // Ако в URL няма ?mode=moderator – добавяме го за стабилност
    if (!urlParams.get("mode")) {
      urlParams.set("mode", "moderator");
      const newUrl = `${location.pathname}?${urlParams.toString()}`;
      history.replaceState({}, "", newUrl);
    }
  }

  // 2) Ако в URL ИМА mode=moderator → маркираме като MOD и записваме флаг
  if (urlParams.get("mode") === "moderator") {
    isModerator = true;
    localStorage.setItem(LS_MODE_FLAG, "true");
  }

  // 3) Ако НЕ сме в MOD режим → чистим флага (да не остава боклук)
  if (!isModerator) {
    localStorage.removeItem(LS_MODE_FLAG);
  }

  // Функция за излизане от MOD режим – чисти флаг и параметър от URL
  function exitModeratorMode() {
    // чистим флага за режима
    localStorage.removeItem(LS_MODE_FLAG);

    const url = new URL(location.href);
    url.searchParams.delete("mode");   // махаме ?mode=moderator, но оставяме ?cat=...
    location.href = url.toString();    // прехвърляме към нормалния изглед

    // важна част – след смяната презареждаме, за да се хване новото меню
    setTimeout(() => location.reload(), 150);
  }


  // Ако НЕ сме модератор – спираме целия файл тук
  if (!isModerator) return;
  /* ===========================================================
   * БЛОК 1 (END)
   * =========================================================== */


   /* ===========================================================
   * БЛОК 2: НАСТРОЙКИ, УТИЛИТИ ФУНКЦИИ И ПОЛЕЗНИ ПОМОЩНИЦИ
   * (START)
   * =========================================================== */

  // ГЛАВНА парола за модератора (смени я!)
  const MOD_PASSWORD = "0000";

  // Ключове за localStorage – отделяме чернови, перманентни и кошче
  const LS_MOD_DATA   = "bbq_mod_data_v3";   // перманентно запазени данни
  const LS_MOD_DRAFT  = "bbq_mod_draft_v3";  // чернова / autosave
  const LS_MOD_TRASH  = "bbq_mod_trash_v2";  // кошче

  // Дефолтна снимка за категория, ако няма друга
  const DEFAULT_CAT_THUMB = "snimki/produkti/1menu/default.jpg";

  // Глобален флаг – дали сме в режим "избирам продукт за добавки"
  let isAddonsEditMode = false;

  // Запис в localStorage
  const save = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  // Четене от localStorage с безопасен parse и дефолтна стойност
  const read = (key, fallback = null) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  };

  // Escape за HTML – за да не чупим DOM
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

  // Превръщане на "12,50 лв." → 12.5
  const lvParse = (text) => {
    const normalized = String(text || "")
      .replace(/\s*лв\.?\s*$/i, "")
      .replace(",", ".");
    const v = parseFloat(normalized);
    return Number.isFinite(v) ? v : 0;
  };

  // Превръщане на число → "12,50 лв."
  const lvFormat = (n) =>
    (Number(n) || 0).toFixed(2).replace(".", ",") + " лв.";

  // Малка функция за парола
  const askPass = (msg = "Парола") => prompt(msg, "") === MOD_PASSWORD;

  // Тост нотификация в долната част на екрана
  const toast = (message = "Готово") => {
    const box = document.createElement("div");
    box.textContent = message;

    Object.assign(box.style, {
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      bottom: "22px",
      background: "#111",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: "12px",
      zIndex: "99999",
      fontWeight: "800",
      boxShadow: "0 8px 28px rgba(0,0,0,.35)",
      opacity: "0",
      transition: "opacity 0.15s"
    });

    document.body.appendChild(box);
    requestAnimationFrame(() => {
      box.style.opacity = "1";
    });

    setTimeout(() => {
      box.style.opacity = "0";
      setTimeout(() => box.remove(), 180);
    }, 1300);
  };

  // Памет за добавките по категории (в LS_MOD_DRAFT)
  const getMemory = () => read(LS_MOD_DRAFT, {});
  const setMemory = (obj) => save(LS_MOD_DRAFT, obj);

  // ============================
  // 🧩 UPLOAD НА СНИМКИ ЧРЕЗ Firebase Storage (storage.js)
  // ============================
  async function uploadImageViaApi(file, categoryKey, productKey) {
    if (!window.BBQ_UPLOAD || typeof window.BBQ_UPLOAD.upload !== "function") {
      console.error("[moderator] BBQ_UPLOAD.upload липсва – увери се, че novindex2/storage.js е зареден преди moderator.js");
      throw new Error("BBQ_UPLOAD.upload is not available");
    }

    // връща директно публичния URL от Firebase Storage
    const url = await window.BBQ_UPLOAD.upload(file, categoryKey, productKey);
    return url;
  }

  /* ===========================================================
   * БЛОК 2 (END)
   * =========================================================== */

/* ===========================================================
 * БЛОК 3: SNAPSHOT НА ТЕКУЩОТО МЕНЮ (CATALOG / ORDER / THUMBS)
 * Този snapshot се праща към BBQ_STORE.save() → Firestore
 * ВАЖНО: пазим ВСИЧКО, включително groups (подзаглавия)
 * =========================================================== */

function snapshotRuntime() {
  const mem = typeof getMemory === "function" ? getMemory() : {};

  // помощна функция за нормализиране на един продукт
  const normalizeItem = (it) => {
    if (!it || typeof it !== "object") {
      return { name: "Продукт", desc: "", price: 0, img: "" };
    }

    const base = {
      name: it.name || "Продукт",
      desc: it.desc || "",
      price: Number(it.price) || 0,
      img: it.img || ""
    };

    // пазим addons (със всичките полета – price, label, checked и т.н.)
    if (Array.isArray(it.addons)) {
      base.addons = it.addons.map((a) => ({ ...a }));
    }

    return base;
  };

  const snapCatalog = {};
  const snapThumbs  = {};

  // минаваме по подредбата на категориите
  ORDER.forEach((key) => {
    const cat = CATALOG[key];
    if (!cat) return;

    const out = {};

    // заглавие на категорията
    if (cat.title) out.title = cat.title;

    // специални режими (HELL, ВОДА)
    if (cat.view) out.view = cat.view;
    if (typeof cat.hellPrice === "number") {
      out.hellPrice = Number(cat.hellPrice) || 0;
    }

    // стандартни продукти
    if (Array.isArray(cat.items)) {
      out.items = cat.items.map(normalizeItem);
    }

    // 🔥 GROUPS = подзаглавия + вътрешни структури
    if (Array.isArray(cat.groups)) {
      out.groups = cat.groups.map((g) => {
        const gOut = {
          heading: g.heading || ""
        };

        // групи с вътрешни ITEMS (напр. палачинки, айрян)
        if (Array.isArray(g.items)) {
          gOut.items = g.items.map(normalizeItem);
        }

        // галерия (HELL) – списък от снимки
        if (Array.isArray(g.images)) {
          gOut.images = [...g.images];
        }

        // вода / gasirana_voda – pair (лява/дясна карта)
        if (Array.isArray(g.pair)) {
          gOut.pair = g.pair.map((p) => ({
            ...p,
            price: Number(p.price) || 0
          }));
        }

        // индивидуални цени за снимките (ако ги има)
        if (Array.isArray(g.prices)) {
          gOut.prices = g.prices.map((pr) => Number(pr) || 0);
        }

        return gOut;
      });
    }

    snapCatalog[key] = out;

    // миниатюра за сайдбара
    if (CAT_THUMBS[key]) {
      snapThumbs[key] = CAT_THUMBS[key];
    }
  });

  // финален payload – това отива в Firestore / localStorage
  const snap = {
    CATALOG: snapCatalog,
    ORDER:   [...ORDER],
    ADDONS:  { ...ADDONS },
    cat_thumbs: snapThumbs,
    addons_labels: mem.addons_labels || {},
    savedAt: new Date().toISOString()
  };

  return snap;
}


/* ===========================================================
 * APPLY SAVED
 * =========================================================== */

const applySaved = (data) => {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data.order)) {
    ORDER.length = 0;
    data.order.forEach((k) => ORDER.push(k));
  }

  if (data.catalog && typeof data.catalog === "object") {
    Object.entries(data.catalog).forEach(([key, val]) => {
      if (!CATALOG[key]) CATALOG[key] = { title: val.title, items: [] };

      CATALOG[key].title     = val.title     || CATALOG[key].title;
      CATALOG[key].view      = val.view      ?? CATALOG[key].view;
      CATALOG[key].hellPrice = val.hellPrice ?? CATALOG[key].hellPrice;

      if (Array.isArray(val.items)) {
        CATALOG[key].items = val.items.map((it) => ({
          ...it,
          addons: Array.isArray(it.addons) ? it.addons : []
        }));
      }

      // ❗ НЕ пипаме groups – те идват директно от Firestore
    });
  }

  if (data.cat_thumbs) {
    Object.assign(CAT_THUMBS, data.cat_thumbs);
  }

  if (data.addons_labels) {
    const mem = getMemory();
    mem.addons_labels = data.addons_labels;
    setMemory(mem);
  }
};

const persistDraft = () => {
  const snap = snapshotRuntime();
  const mem = getMemory();
  snap.addons_labels = mem.addons_labels || {};
  save(LS_MOD_DRAFT, snap);
};

const savePermanent = () => {
  save(LS_MOD_DATA, snapshotRuntime());
};

/* ===========================================================
 * БЛОК 3 (END)
 * =========================================================== */



  /* ===========================================================
   * БЛОК 4: КОШЧЕ (TRASH) ЗА ПРОДУКТИ И КАТЕГОРИИ
   * (START)
   * =========================================================== */

  const trashPush = (entry) => {
    const arr = read(LS_MOD_TRASH, []);
    arr.unshift({ ...entry, ts: Date.now() });
    save(LS_MOD_TRASH, arr);
  };

  const trashList = () => read(LS_MOD_TRASH, []);
  const trashDel = (i) => {
    const arr = trashList();
    arr.splice(i, 1);
    save(LS_MOD_TRASH, arr);
  };
  const trashPurge = () => save(LS_MOD_TRASH, []);

  const openTrashUI = () => {
    const items = trashList();

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "100000",
      background: "rgba(0,0,0,.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "22px"
    });

    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#fff",
      borderRadius: "14px",
      width: "min(900px,96vw)",
      maxHeight: "86vh",
      overflow: "auto",
      boxShadow: "0 18px 60px rgba(0,0,0,.35)",
      padding: "14px"
    });

    box.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 style="margin:0">🗑 Кошче</h3>
        <div>
          <button data-a="purge" style="margin-right:8px">Изчисти</button>
          <button data-a="close">Затвори</button>
        </div>
      </div>
      <div class="tlist">
        ${
          !items.length
            ? '<div style="opacity:.7;padding:8px 0">Празно</div>'
            : ""
        }
      </div>
    `;

    const list = box.querySelector(".tlist");

    items.forEach((it, idx) => {
      const when = new Date(it.ts || Date.now()).toLocaleString();
      const row = document.createElement("div");
      Object.assign(row.style, {
        border: "1px solid #eee",
        borderRadius: "10px",
        padding: "10px 12px",
        margin: "8px 0",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "8px"
      });

      row.innerHTML = `
        <div>
          <div><b>${esc(it.kind.toUpperCase())}</b> • ${esc(
        it.title || it.catKey || ""
      )}</div>
          <div style="opacity:.7;font-size:12px">${when}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button data-i="${idx}" data-a="restore">Възстанови</button>
          <button data-i="${idx}" data-a="del">Премахни</button>
        </div>
      `;
      list.appendChild(row);
    });

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    box.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const action = btn.dataset.a;

      if (action === "close") return close();

      if (action === "purge") {
        if (askPass("Парола за изчистване")) {
          trashPurge();
          close();
          toast("Кошчето е изчистено");
        }
        return;
      }

      const i = Number(btn.dataset.i);
      const arr = trashList();
      const entry = arr[i];
      if (!entry) return;

      if (action === "restore") {
        const entry = arr[i];
        if (!entry) return;

        if (entry.kind === "product") {
          const { catKey, index, item, groupIndex, isHell } = entry;

          // ако няма категория – създаваме я
          if (!CATALOG[catKey]) {
            CATALOG[catKey] = { title: catKey.toUpperCase(), items: [] };
          }

          // 🔥 СПЕЦИАЛЕН СЛУЧАЙ: HELL / gallery продукт (плочка)
          if (isHell && typeof groupIndex === "number") {
            const cat = CATALOG[catKey];
            cat.view = cat.view || "gallery";
            cat.groups = cat.groups || [];

            if (!cat.groups[groupIndex]) {
              cat.groups[groupIndex] = {
                heading: "",
                images: [],
                prices: [],
                items: []
              };
            }

            const g = cat.groups[groupIndex];

            if (!Array.isArray(g.images)) g.images = [];
            if (!Array.isArray(g.prices)) g.prices = [];
            if (!Array.isArray(g.items))  g.items  = [];

            const len = g.images.length;
            const pos = Math.max(0, Math.min(index ?? len, len));

            const priceNum =
              typeof item.price === "number"
                ? item.price
                : (cat.hellPrice ?? 0);

            const imgUrl = item.img || "";

            g.images.splice(pos, 0, imgUrl);
            g.prices.splice(pos, 0, priceNum);
            g.items.splice(pos, 0, {
              name: item.name || "Продукт",
              desc: "",
              price: priceNum,
              img: imgUrl
            });

            persistDraft();
            trashDel(i);
            activate(catKey, { replace: true });
            toast("Възстановен продукт (HELL)");
            return;
          }

          // 🧊 Нормален продукт (не HELL gallery)
          const L = CATALOG[catKey].items || (CATALOG[catKey].items = []);
          const pos = Math.max(0, Math.min(index ?? L.length, L.length));
          L.splice(pos, 0, item);

          persistDraft();
          trashDel(i);
          activate(catKey, { replace: true });
          toast("Възстановен продукт");
        } else if (entry.kind === "category") {
          const { catKey, title, items, thumb, index } = entry;

          if (!ORDER.includes(catKey)) {
            const pos = Math.max(
              0,
              Math.min(index ?? ORDER.length, ORDER.length)
            );
            ORDER.splice(pos, 0, catKey);
          }

          CATALOG[catKey] = {
            title: title || catKey.toUpperCase(),
            items: items || []
          };
          if (thumb) CAT_THUMBS[catKey] = thumb;

          persistDraft();
          trashDel(i);
          rebuildSidebar();
          popThenActivate(null, catKey);
          toast("Възстановена категория");
        }
      }

      if (action === "del") {
        trashDel(i);
        btn.closest("div[style]").remove();
      }
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  };

  /* ===========================================================
   * БЛОК 4 (END)
   * =========================================================== */


  /* ===========================================================
   * БЛОК 5: ADDONS LABELS – ЗАРЕЖДАНЕ/ЗАПИС + ПРИЛАГАНЕ В DOM
   * (START)
   * =========================================================== */

  const getAddonsFor = (catKey) => {
    const mem = read(LS_MOD_DRAFT, {});
    return (mem.addons_labels && mem.addons_labels[catKey]) || null;
  };

  const putAddonsFor = (catKey, data) => {
    const mem = read(LS_MOD_DRAFT, {});
    mem.addons_labels = mem.addons_labels || {};
    mem.addons_labels[catKey] = data;
    setMemory(mem);
    persistDraft();
  };

  const applyAddonsLabelsToDOM = (catKey) => {
    const def = getAddonsFor(catKey);
    if (!def) return;

    // Групи без цена (veg / sauce)
    ["veg", "sauce"].forEach((groupName) => {
      const arr = def[groupName];
      if (!Array.isArray(arr)) return;

      const boxes = [
        ...document.querySelectorAll(
          `.addon-checkbox[data-group="${groupName}"]`
        )
      ];

      boxes.forEach((box, i) => {
        const label = box.closest("label");
        if (label && arr[i]) {
          label.childNodes[label.childNodes.length - 1].nodeValue =
            " " + arr[i];
        }
      });
    });

    // Платени добавки (paid)
    if (Array.isArray(def.paid)) {
      const paid = def.paid;
      const boxes = [
        ...document.querySelectorAll(
          `.product .addon-checkbox:not([data-group])`
        )
      ];
      boxes.forEach((box, i) => {
        const labelEl = box.closest("label");
        if (!labelEl || !paid[i]) return;
        const { label, price } = paid[i];
        box.setAttribute("data-price", Number(price) || 0);
        labelEl.childNodes[labelEl.childNodes.length - 1].nodeValue =
          ` + ${label}`;
      });
    }
  };


  /* ===========================================================
   * БЛОК 5 (END)
   * =========================================================== */
  // Текуща категория – взимаме ?cat= от URL или падaме към глобалния current
  const currentCat = () =>
    new URLSearchParams(location.search).get("cat") ||
    (typeof current !== "undefined" ? current : "burgeri");


  const rebuildSidebar = () => {
    if (!sidebar) return;

    sidebar.innerHTML =
      ORDER.map((key) => {
        const label =
          key === "promocii"
            ? "ПРОМОЦИИ"
            : CATALOG[key]?.title || key.toUpperCase();
        const img = CAT_THUMBS[key] || DEFAULT_CAT_THUMB;

        return `
        <a class="cat" draggable="true" data-cat="${esc(
          key
        )}" role="link" tabindex="0" aria-label="${esc(label)}">
          <div class="box cat-box" style="background-image:url('${img}')" data-label="${esc(
          label
        )}">
            <span class="cat-hover-tools" aria-hidden="true">
              <button class="cat-pic" title="Смени картинка">📁</button>
              <button class="cat-rename" title="Преименувай">🖊</button>
              <button class="cat-delete" title="Изтрий">🗑</button>
            </span>
          </div>
          <div class="cat-label">${esc(label)}</div>
        </a>`;
      }).join("") +
      `
      <a class="cat cat--add" role="button" tabindex="0" aria-label="Добави категория">
        <div class="box" style="display:flex;align-items:center;justify-content:center">
          <span style="font-size:42px">+</span>
        </div>
        <div class="cat-label">Добави категория</div>
      </a>`;

    // Навигация – клик върху категория
    sidebar.querySelectorAll(".cat").forEach((el) => {
      const key = el.dataset.cat;

      el.addEventListener("click", (e) => {
        if (el.classList.contains("cat--add")) return;
        // ако цъкаме върху бутоните 📁 / 🖊 / 🗑 – не сменяме категорията
        if (e.target.closest(".cat-hover-tools")) return;
        if (typeof shouldBypassDelay === "function" && shouldBypassDelay(e)) return;

        e.preventDefault();
        if (!key || key === current) return;

        if (typeof popThenActivate === "function") {
          popThenActivate(el, key);
          return;
        }

        if (typeof activate === "function") {
          activate(key, { replace: true });
          const url = new URL(location.href);
          url.searchParams.set("cat", key);
          history.replaceState({}, "", url.toString());
          return;
        }

        const url = new URL(location.href);
        url.searchParams.set("cat", key);
        location.href = url.toString();
      });
    });

    // инструменти (смяна на снимка, rename, delete) – ВИНАГИ видими в MOD
    sidebar.querySelectorAll(".cat-box").forEach((box) => {
      box.style.position = "relative";
    });

    sidebar.querySelectorAll(".cat-hover-tools").forEach((tools) => {
      Object.assign(tools.style, {
        position: "absolute",
        top: "6px",
        right: "6px",
        display: "inline-flex",   // <- ключово: да се виждат постоянно
        gap: "6px",
        zIndex: "10"
      });

      tools.querySelectorAll("button").forEach((btn) => {
        Object.assign(btn.style, {
          border: "none",
          borderRadius: "8px",
          padding: "4px 6px",
          background: "rgba(0,0,0,.70)",
          color: "#fff",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "700",
          boxShadow: "0 2px 6px rgba(0,0,0,.35)"
        });
      });
    });

// Смяна на картинка (категории) през Vercel /api/upload-image
sidebar.querySelectorAll(".cat-pic").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    const catKey = e.target.closest(".cat")?.dataset?.cat;
    if (!catKey) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;

      try {
        // 🔥 качваме във Vercel / GitHub
        const url = await uploadImageViaApi(file, catKey, "thumb");

        // 1) записваме URL в CAT_THUMBS
        CAT_THUMBS[catKey] = url;

        // 2) обновяваме визуално бокса
        const catEl = sidebar.querySelector(`.cat[data-cat="${catKey}"] .cat-box`);
        if (catEl) {
          catEl.style.backgroundImage = `url('${url}')`;
        }

        // 3) пазим чернова
        persistDraft();
        toast("📸 Картинката на категорията е качена!");

      } catch (err) {
        console.error("Upload error (cat thumb):", err);
        toast("❌ Грешка при качване на картинка");
      }
    };

    input.click();
  });
});

    // Преименуване на категория
    sidebar.querySelectorAll(".cat-rename").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const catKey = e.target.closest(".cat")?.dataset?.cat;
        if (!catKey) return;

        const oldTitle = CATALOG[catKey]?.title || catKey.toUpperCase();
        const newTitle = prompt("Ново име на категория:", oldTitle);
        if (!newTitle) return;

        if (!CATALOG[catKey]) {
          CATALOG[catKey] = { title: newTitle, items: [] };
        } else {
          CATALOG[catKey].title = newTitle;
        }

        persistDraft();
        rebuildSidebar();

        if (currentCat() === catKey && titleEl) {
          titleEl.textContent = newTitle;
        }
      });
    });

    // Изтриване на категория
    sidebar.querySelectorAll(".cat-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const catKey = e.target.closest(".cat")?.dataset?.cat;
        if (!catKey) return;

        if (catKey === "promocii") {
          alert("ПРОМОЦИИ не може да се изтрива.");
          return;
        }

        if (ORDER.length <= 1) {
          alert("Трябва да има поне една категория.");
          return;
        }

        if (!askPass("Парола за изтриване на категория")) return;

        const idx = ORDER.indexOf(catKey);
        trashPush({
          kind: "category",
          catKey,
          title: CATALOG[catKey]?.title || catKey,
          items: (CATALOG[catKey]?.items || []).map((x) => ({ ...x })),
          thumb: CAT_THUMBS[catKey] || "",
          index: idx
        });

        if (idx >= 0) ORDER.splice(idx, 1);
        try {
          delete CATALOG[catKey];
        } catch {}

        persistDraft();
        rebuildSidebar();

        const next = ORDER[0] || "burgeri";
        popThenActivate(null, next);
        toast("Категорията е в Кошчето");
      });
    });

    // "+" плочка – добавя нова категория
    sidebar.querySelector(".cat--add")?.addEventListener("click", (e) => {
      e.preventDefault();
      let key = prompt("Слъг (латиница), напр. 'pizza':", "");
      if (!key) return;

      key = key
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      if (!key) {
        alert("Невалиден ключ.");
        return;
      }

      if (ORDER.includes(key)) {
        alert("Вече има такава категория.");
        return;
      }

      const title = prompt("Заглавие:", "НОВА КАТЕГОРИЯ") || "НОВА КАТЕГОРИЯ";
      ORDER.push(key);
      CATALOG[key] = { title, items: [] };
      CAT_THUMBS[key] = CAT_THUMBS[key] || DEFAULT_CAT_THUMB;

      persistDraft();
      rebuildSidebar();
      popThenActivate(null, key);
    });

    // Drag&Drop подреждане на категориите
    let dragged = null;

    sidebar.querySelectorAll(".cat:not(.cat--add)").forEach((el) => {
      el.addEventListener("dragstart", () => {
        dragged = el;
        el.style.opacity = ".5";
      });

      el.addEventListener("dragend", () => {
        el.style.opacity = "1";
        dragged = null;
      });

      el.addEventListener("dragover", (e) => e.preventDefault());

      el.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!dragged || dragged === el) return;

        el.parentNode.insertBefore(dragged, el.nextSibling);

        const keys = [
          ...sidebar.querySelectorAll(".cat:not(.cat--add)")
        ].map((x) => x.dataset.cat);

        ORDER.length = 0;
        keys.forEach((k) => ORDER.push(k));

        persistDraft();
        toast("Подредено");
      });
    });

    // 🗑 икона "кошче" в сайдбара, ако имаш такава
    const sidebarTrashIcon =
      sidebar.querySelector(".sidebar-trash") ||
      sidebar.querySelector("#sidebar-trash");

    if (sidebarTrashIcon && !sidebarTrashIcon.dataset.boundTrash) {
      sidebarTrashIcon.dataset.boundTrash = "1";
      sidebarTrashIcon.style.cursor = "pointer";

      sidebarTrashIcon.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openTrashUI();
      });
    }
  };


  /* ===========================================================
   * БЛОК 6 (END)
   * =========================================================== */


/* ===========================================================
 * БЛОК 7: INLINE РЕДАКЦИЯ НА ПРОДУКТИ (ТЕКСТ/ЦЕНИ/СНИМКИ)
 * (START)
 * =========================================================== */

const enableInlineEditing = () => {
  // Заглавие / описание / цена + caption за HELL
  document
    .querySelectorAll(
      ".product .title, .product .desc, .price-badge .lv, .gallery .caption"
    )
    .forEach((el) => {
      el.contentEditable = "true";
      el.setAttribute("data-mod", "1");
      el.style.outline = "1px dashed #ff7a00";
      el.style.cursor = "text";

      el.addEventListener("input", () => {
        const key    = currentCat();
        const catObj = CATALOG[key] || {};
        const cards  = grid ? [...grid.querySelectorAll(".product")] : [];
        const index  = cards.findIndex((x) => x.contains(el));

        // 🔥 СПЕЦИАЛЕН СЛУЧАЙ: HELL (view:'gallery')
        if (index < 0 && catObj.view === "gallery") {
          const tile = el.closest(".tile");
          if (!tile) return;

          const gIdx   = Number(tile.dataset.g);
          const imgIdx = Number(tile.dataset.i);

          if (!Array.isArray(catObj.groups) || !catObj.groups[gIdx]) return;
          const group = catObj.groups[gIdx];

          // 2а) Цена – .lv вътре в плочката
          if (el.classList.contains("lv")) {
            const newPrice = lvParse(el.textContent);

            if (!Array.isArray(group.prices)) group.prices = [];
            group.prices[imgIdx] = newPrice;

            el.textContent = lvFormat(newPrice);
            persistDraft();
            applyEuroConversion();
            return;
          }


          // 2б) Име под снимката – .caption (HELL)
          if (el.classList.contains("caption")) {
            const newName = ((el.textContent || "").trim()) || "Продукт";

            // 🔥 1) Пазим името и в labels – това чете основният сайт
            if (!Array.isArray(group.labels)) group.labels = [];
            group.labels[imgIdx] = newName;

            // 🔥 2) Пазим го и в items – за модератора / бъдещи функции
            if (!Array.isArray(group.items)) group.items = [];

            if (!group.items[imgIdx]) {
              const priceFromGroup =
                Array.isArray(group.prices)
                  ? group.prices[imgIdx]
                  : (catObj.hellPrice || 0);

              const imgFromGroup =
                Array.isArray(group.images)
                  ? group.images[imgIdx]
                  : "";

              group.items[imgIdx] = {
                name: newName,
                desc: "",
                price: priceFromGroup,
                img: imgFromGroup
              };
            } else {
              group.items[imgIdx].name = newName;
            }

            // 🔁 записваме черновата, после "Запази всичко" я праща към Firestore
            persistDraft();
            return;
          }



          // за gallery нямаме други editable елементи
          return;
        }

        // === нормални категории с .product карти
        if (index < 0) return;

        const item = (catObj.items || [])[index];
        if (!item) return;

        if (el.classList.contains("title")) {
          item.name = el.textContent.trim();
        } else if (el.classList.contains("desc")) {
          item.desc = el.textContent.trim();
        } else if (el.classList.contains("lv")) {
          item.price = lvParse(el.textContent);
        }

        persistDraft();
      });
    });

  // 🔠 Заглавия на секциите (sec-title) – за всички категории с groups
  const keyForGroups = currentCat();
  if (CATALOG[keyForGroups] && Array.isArray(CATALOG[keyForGroups].groups)) {
    document.querySelectorAll(".sec-title").forEach((titleEl, idx) => {
      titleEl.contentEditable = "true";
      titleEl.setAttribute("data-mod", "1");
      titleEl.style.outline = "1px dashed #ff7a00";
      titleEl.style.cursor = "text";

      titleEl.addEventListener("input", () => {
        const cat = CATALOG[currentCat()];
        if (!cat || !Array.isArray(cat.groups)) return;
        if (!cat.groups[idx]) return;
        cat.groups[idx].heading = titleEl.textContent.trim();
        persistDraft();
      });
    });
  }


  // Смяна на снимки (Vercel + GitHub upload)
  document
    .querySelectorAll(".product .photo, .tile img, .water-card img")
    .forEach((img) => {
      img.style.cursor = "pointer";

      img.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        input.onchange = async (e) => {
          const file = (e.target.files && e.target.files[0]);
          if (!file) return;

          const key    = currentCat();
          const catObj = CATALOG[key] || {};

          // по подразбиране търсим .product карта
          const cards = grid ? [...grid.querySelectorAll(".product")] : [];
          let index   = cards.findIndex((x) => x.contains(img));

          try {
            const productKey = index >= 0 ? `item_${index}` : "tile";

            // 1) качваме файла към /api/upload-image -> GitHub
            const url = await uploadImageViaApi(file, key, productKey);

            // 2) обновяваме DOM
            if (img.tagName === "IMG") {
              img.src = url;
            } else {
              img.style.backgroundImage = `url('${url}')`;
            }

            // 3А) Нормален продукт – пазим в CATALOG[key].items[index].img
            if (index >= 0 && catObj.items && catObj.items[index]) {
              catObj.items[index].img = url;
            }
            // 3Б) HELL / GALLERY – update по група и индекс в галерията
            else if (catObj.view === "gallery") {
              const tileEl    = img.closest(".tile");
              const galleryEl = tileEl ? tileEl.closest(".gallery") : null;
              if (tileEl && galleryEl && Array.isArray(catObj.groups)) {
                const galleries = [
                  ...document.querySelectorAll(".gallery")
                ];
                const groupIdx = galleries.indexOf(galleryEl);
                if (groupIdx >= 0 && catObj.groups[groupIdx]) {
                  const imgsInGroup = [
                    ...galleryEl.querySelectorAll(".tile img")
                  ];
                  const imgIdx = imgsInGroup.indexOf(img);
                  const group  = catObj.groups[groupIdx];

                  if (imgIdx >= 0) {
                    if (!Array.isArray(group.images)) group.images = [];
                    group.images[imgIdx] = url;

                    if (!Array.isArray(group.items)) group.items = [];
                    if (!group.items[imgIdx]) {
                      group.items[imgIdx] = {
                        name:
                          (group.items[imgIdx]?.name) ||
                          "Продукт",
                        desc: "",
                        price:
                          (Array.isArray(group.prices)
                            ? group.prices[imgIdx]
                            : catObj.hellPrice) || 0,
                        img: url
                      };
                    } else {
                      group.items[imgIdx].img = url;
                    }
                  }
                }
              }
            }

            persistDraft();
            toast("📸 Снимката е качена!");

          } catch (err) {
            console.error("Upload error:", err);
            toast("❌ Грешка при качване на снимка");
          }
        };

        input.click();
      });
    });

  // Редакция на текстовете на добавките
  document.querySelectorAll(".addons label").forEach((lbl) => {
    const txtNode = [...lbl.childNodes].find((n) => n.nodeType === 3);
    if (!txtNode) return;

    lbl.setAttribute("contenteditable", "true");

    lbl.addEventListener("blur", () => {
      const key = currentCat();
      const box = lbl.querySelector(".addon-checkbox");
      if (!box) return;

      const group = box.dataset.group || null;
      const code  = box.dataset.code  || null;
      const raw   = (lbl.textContent || "").trim().replace(/^\+\s*/, "");
      const mem   = getMemory() || {};

      if (group === "veg" || group === "sauce") {
        const all = [
          ...lbl.parentElement.parentElement.querySelectorAll(
            `.addon-checkbox[data-group="${group}"]`
          )
        ];
        const idx = all.findIndex((b) => b.closest("label") === lbl);
        mem[group] = mem[group] || [];
        mem[group][idx] = raw;
      } else {
        mem.paid = mem.paid || [];
        const all = [
          ...lbl.parentElement.parentElement.querySelectorAll(
            `.addon-checkbox:not([data-group])`
          )
        ];
        const idx   = all.findIndex((b) => b === box);
        const price = Number(all[idx].getAttribute("data-price") || 0);
        mem.paid[idx] = { code, label: raw, price };
      }

      putAddonsFor(key, mem);
    });
  });

  // Двоен клик – бърза смяна на цена на платени добавки
  document
    .querySelectorAll(".addons .addon-checkbox:not([data-group])")
    .forEach((box) => {
      const lbl = box.closest("label");
      if (!lbl) return;

      lbl.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const cur = Number(box.getAttribute("data-price") || 0);
        const p   = prompt("Цена за тази добавка:", cur);
        if (p == null) return;

        const val = Number(String(p).replace(",", "."));
        if (!Number.isFinite(val)) return;

        box.setAttribute("data-price", val);

        const key = currentCat();
        const mem = getMemory() || {};
        mem.paid = mem.paid || [];

        const all = [
          ...lbl.parentElement.parentElement.querySelectorAll(
            `.addon-checkbox:not([data-group])`
          )
        ];
        const idx = all.findIndex((b) => b === box);

        const labelText = (lbl.textContent || "")
          .trim()
          .replace(/^\+\s*/, "");
        const code = box.getAttribute("data-code") || "";

        mem.paid[idx] = { code, label: labelText, price: val };
        putAddonsFor(key, mem);

        toast("Цена обновена");
      });
    });
};

/* ===========================================================
 * БЛОК 7 (END)
 * =========================================================== */


/* ===========================================================
 * БЛОК 8: DnD НА ПРОДУКТИ + ИЗТРИВАНЕ С ПАРОЛА
 * (START)
 * =========================================================== */

const domProductsToArray = () => {
  const list = [];
  if (!grid) return list;

  const key      = currentCat();
  const srcItems = (CATALOG[key]?.items) || [];

  grid.querySelectorAll(".product").forEach((p, idx) => {
    const name =
      p.querySelector(".title")?.textContent.trim() || "Продукт";
    const desc = p.querySelector(".desc")?.textContent.trim() || "";
    const lvEl = p.querySelector(".price-badge .lv");
    const price = lvEl ? lvParse(lvEl.textContent) : 0;

    let img = "";
    const bg = p.querySelector(".photo")?.style?.backgroundImage || "";
    const m = bg.match(/url\(['"]?(.*?)['"]?\)/i);
    if (m && m[1]) img = m[1];

    const src = srcItems[idx];
    let addons;
    if (src && Array.isArray(src.addons) && src.addons.length) {
      addons = src.addons.map(a => ({ ...a }));
    }

    const item = { name, desc, price, img };
    if (addons) item.addons = addons;

    list.push(item);
  });

  return list;
};


const enableProductDnd = () => {
  if (!grid) return;

  let dragged = null;

  grid.querySelectorAll(".product").forEach((card) => {
    card.draggable = true;

    card.addEventListener("dragstart", () => {
      dragged = card;
      card.style.opacity = ".4";
    });

    card.addEventListener("dragend", () => {
      card.style.opacity = "1";
      dragged = null;
    });

    card.addEventListener("dragover", (e) => e.preventDefault());

    card.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!dragged || dragged === card) return;

      card.parentNode.insertBefore(dragged, card.nextSibling);

      const key = currentCat();
      const arr = domProductsToArray();
      if (CATALOG[key]) {
        CATALOG[key].items = arr;
        persistDraft();
        toast("Подредено");
      }
    });
  });
};


/* 🔥 Универсално кошче за всички .product карти (всички категории) */
const injectDeleteButtons = () => {
  if (!grid) return;

  const key = currentCat();
  const cat = CATALOG[key] || {};
  if (!Array.isArray(cat.items)) return;

  const cards = [...grid.querySelectorAll(".product")];
  if (!cards.length) return;

  cards.forEach((card) => {
    // вече има кошче → не пипаме
    if (card.querySelector(".mod-del")) return;

    const btn = document.createElement("button");
    btn.className = "mod-del";
    btn.textContent = "🗑";

    Object.assign(btn.style, {
      position: "absolute",
      top: "8px",
      right: "8px",
      zIndex: "5",
      background: "rgba(0,0,0,0.6)",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      padding: "4px 8px",
      cursor: "pointer"
    });

    // за да стоят правилно бутоните
    if (!card.style.position || card.style.position === "static") {
      card.style.position = "relative";
    }

    card.appendChild(btn);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof askPass === "function") {
        if (!askPass("Парола за изтриване на продукт")) return;
      }

      const keyNow = currentCat();
      const catNow = CATALOG[keyNow] || {};
      const curCards = [...(grid?.querySelectorAll(".product") || [])];
      const realIndex = curCards.indexOf(card);
      if (realIndex < 0 || !Array.isArray(catNow.items)) return;

      const item = catNow.items[realIndex] || {};
      const name =
        item.name ||
        card.querySelector(".title")?.textContent.trim() ||
        "Продукт";

      const lvEl = card.querySelector(".price-badge .lv");
      const price =
        typeof item.price === "number"
          ? item.price
          : lvEl
          ? lvParse(lvEl.textContent)
          : 0;

      let img = item.img || item.image || "";
      if (!img) {
        const bg =
          card.querySelector(".photo")?.style?.backgroundImage || "";
        const m = bg.match(/url\(['"]?(.*?)['"]?\)/i);
        if (m && m[1]) img = m[1];
      }

      // 🗑 пращаме в глобалното кошче
      trashPush({
        kind: "product",
        catKey: keyNow,
        index: realIndex,
        item: { name, price, img },
        title: name
      });

      // махаме от данните
      catNow.items.splice(realIndex, 1);

      persistDraft();
      activate(keyNow, { replace: true });
      toast("В кошчето");
    });
  });
};


// 🔥 Специално кошче / delete за HELL (gallery плочки)
const injectHellDeleteButtons = () => {
  const key = currentCat();
  const cat = CATALOG[key] || {};
  if (cat.view !== "gallery" || !Array.isArray(cat.groups)) return;

  const galleries = [...document.querySelectorAll(".gallery")];
  if (!galleries.length) return;

  galleries.forEach((galleryEl, gIdx) => {
    const group = cat.groups[gIdx];
    if (!group) return;

    const tiles = [...galleryEl.querySelectorAll(".tile")];

    tiles.forEach((tile) => {
      // ако вече има бутон – не добавяме втори
      if (tile.querySelector(".mod-del")) return;

      const btn = document.createElement("button");
      btn.className = "mod-del";
      btn.textContent = "🗑";

      Object.assign(btn.style, {
        position: "absolute",
        top: "8px",
        right: "8px",
        zIndex: "5",
        background: "rgba(0,0,0,.6)",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "4px 8px",
        cursor: "pointer"
      });

      tile.style.position = "relative";
      tile.appendChild(btn);

      btn.addEventListener("click", () => {
        if (typeof askPass === "function") {
          if (!askPass("Парола за изтриване на продукт")) return;
        }

        // 💡 пресмятаме индекса по текущия DOM
        const curGallery   = tile.closest(".gallery");
        const allGalleries = [...document.querySelectorAll(".gallery")];
        const curGIdx      = allGalleries.indexOf(curGallery);
        if (curGIdx < 0 || !cat.groups[curGIdx]) return;

        const curGroup = cat.groups[curGIdx];
        const tilesNow = [...curGallery.querySelectorAll(".tile")];
        const imgIdx   = tilesNow.indexOf(tile);
        if (imgIdx < 0) return;

        const img =
          Array.isArray(curGroup.images) ? curGroup.images[imgIdx] : "";
        const price =
          Array.isArray(curGroup.prices) &&
          typeof curGroup.prices[imgIdx] === "number"
            ? curGroup.prices[imgIdx]
            : curGroup.hellPrice ?? cat.hellPrice ?? 0;
        const name =
          Array.isArray(curGroup.items) && curGroup.items[imgIdx]
            ? curGroup.items[imgIdx].name || "Продукт"
            : "Продукт";

        // 🗑 пращаме в глобалното кошче
        trashPush({
          kind: "product",
          catKey: key,
          index: imgIdx,
          groupIndex: curGIdx,
          isHell: true,
          item: { name, price, img },
          title: name
        });

        // махаме от данните
        if (Array.isArray(curGroup.images)) curGroup.images.splice(imgIdx, 1);
        if (Array.isArray(curGroup.prices)) curGroup.prices.splice(imgIdx, 1);
        if (Array.isArray(curGroup.items))  curGroup.items.splice(imgIdx, 1);

        persistDraft();
        activate(key, { replace: true });
        toast("В кошчето");
      });
    });
  });
};


/* ===========================================================
 * БЛОК 8 (END)
 * =========================================================== */


// Рендер на подзаглавията (groups) за НЕ-gallery категории
//podzaglaviq buton 

// Рендер на подзаглавията (groups) – винаги веднага под заглавието
// Рендер на подзаглавията (groups) – около продуктите
function renderSubheadingsForModerator(catKey) {
  const key = catKey || currentCat();
  const cat = CATALOG[key];
  if (!cat) return;
  if (!Array.isArray(cat.groups) || !cat.groups.length) return;
  if (typeof titleEl === "undefined" || !titleEl) return;

  const parent = titleEl.parentElement || document.body;

  // махаме стари подзаглавия, добавени от модератора
  parent
    .querySelectorAll(".sec-title[data-from='mod']")
    .forEach((el) => el.remove());

  let ref = titleEl;

  cat.groups.forEach((g, idx) => {
    const h = document.createElement("div");
    h.className = "sec-title";
    h.dataset.from = "mod";          // за чистене
    h.dataset.groupIndex = idx;      // индекс в cat.groups
    h.textContent = g.heading || `Подзаглавие ${idx + 1}`;

    Object.assign(h.style, {
      margin: "10px 0 6px",
      fontWeight: "900",
      fontSize: "20px",
      color: "#ff7a00"
    });

    // по подразбиране – под заглавието, над box-овете
    parent.insertBefore(h, ref.nextSibling);
    ref = h;
  });
}
let draggedSub = null;

function syncSubheadingOrder() {
  const key = currentCat();
  const cat = CATALOG[key];
  if (!cat || !Array.isArray(cat.groups)) return;
  if (typeof titleEl === "undefined" || !titleEl) return;

  const parent = titleEl.parentElement || document.body;
  const els = [...parent.querySelectorAll(".sec-title[data-from='mod']")];

  const old = cat.groups.slice();
  const reordered = [];

  els.forEach((el, idx) => {
    const oldIdx = Number(el.dataset.groupIndex);
    if (old[oldIdx]) reordered.push(old[oldIdx]);
    el.dataset.groupIndex = idx;
  });

  cat.groups = reordered;
  persistDraft();
}

// позволява да местиш подзаглавията над/под box-овете
function enableSubheadingDnd() {
  if (typeof titleEl === "undefined" || !titleEl) return;

  const parent = titleEl.parentElement || document.body;
  const headings = [...parent.querySelectorAll(".sec-title[data-from='mod']")];

  headings.forEach((h) => {
    h.draggable = true;

    h.addEventListener("dragstart", () => {
      draggedSub = h;
      h.style.opacity = ".4";
    });

    h.addEventListener("dragend", () => {
      if (draggedSub) draggedSub.style.opacity = "1";
      draggedSub = null;
    });

    h.addEventListener("dragover", (e) => e.preventDefault());

    // drop върху друго подзаглавие → разместване между тях
    h.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!draggedSub || draggedSub === h) return;
      parent.insertBefore(draggedSub, h.nextSibling);
      syncSubheadingOrder();
    });
  });

  // drop върху grid-а с продукти → над или под box-овете
  if (grid) {
    grid.addEventListener("dragover", (e) => {
      if (!draggedSub) return;
      e.preventDefault();
    });

    grid.addEventListener("drop", (e) => {
      if (!draggedSub) return;
      e.preventDefault();

      const rect = grid.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      // ако пуснеш в горната половина на grid-а → подзаглавието отива над box-овете
      if (e.clientY < midY) {
        parent.insertBefore(draggedSub, grid);
      } else {
        // долна половина → подзаглавието отива под box-овете
        if (grid.nextSibling) parent.insertBefore(draggedSub, grid.nextSibling);
        else parent.appendChild(draggedSub);
      }
      syncSubheadingOrder();
    });
  }
}

  /* ===========================================================
   * БЛОК 9: HOOK КЪМ activate() + КОНВЕРСИЯ BGN → EUR
   * (START)
   * =========================================================== */

const _activate = activate;
activate = function (cat, opts) {
  _activate(cat, opts);

  const key = cat || currentCat();

  renderSubheadingsForModerator(key); // рисуване
  enableSubheadingDnd();              // 👉 drag & drop за тях

  applyAddonsLabelsToDOM(key);
  enableInlineEditing();
  enableProductDnd();
  injectDeleteButtons();
  injectHellDeleteButtons();
  renderAddonsSidePanels(key);

  if (typeof ensurePlusRightUniversal === "function")
    ensurePlusRightUniversal();
  if (typeof ensureMobilePlusRight === "function")
    ensureMobilePlusRight();

  applyEuroConversion();
};



  // Динамичен курс BGN → EUR
  async function updateEuroRatesAndPrices() {
    try {
      const res = await fetch(
        "https://api.exchangerate.host/latest?base=BGN&symbols=EUR"
      );
      const data = await res.json();
      window.BGN_TO_EUR = data?.rates?.EUR || 1.95583;
    } catch {
      window.BGN_TO_EUR = 1.95583;
    }
  }

  function applyEuroConversion() {
    document.querySelectorAll(".price-badge").forEach((badge) => {
      const lvEl = badge.querySelector(".lv");
      if (!lvEl) return;

      const lvValue = parseFloat(lvEl.textContent.replace(",", "."));
      const eurValue = (
        lvValue / (window.BGN_TO_EUR || 1.95583)
      ).toFixed(2);

      let eurEl = badge.querySelector(".eur");
      if (!eurEl) {
        eurEl = document.createElement("span");
        eurEl.className = "eur";
        eurEl.style.marginLeft = "6px";
        eurEl.style.fontSize = "0.9em";
        eurEl.style.opacity = "0.85";
        badge.appendChild(eurEl);
      }

      eurEl.textContent = `${eurValue} €`;
    });
  }

  updateEuroRatesAndPrices().then(applyEuroConversion);

  document.body.addEventListener("input", (e) => {
    if (e.target.classList.contains("lv")) applyEuroConversion();
  });

  /* ===========================================================
   * БЛОК 9 (END)
   * =========================================================== */


  /* ===========================================================
   * БЛОК 10: ПЛАВАЩИ БУТОНИ – КОШЧЕ, НОВ ПРОДУКТ, НОВА КАТЕГОРИЯ,
   * ДОБАВКИ, ЗАПИС КЪМ ОСНОВНИЯ САЙТ
   * (START)
   * =========================================================== */

  const addBtn = (label, bottom, onClick, extraStyle = {}) => {
    const btn = document.createElement("button");
    btn.textContent = label;

    Object.assign(
      btn.style,
      {
        position: "fixed",
        right: "20px",
        bottom: `${bottom}px`,
        background: "#ff7a00",
        color: "#fff",
        border: "none",
        borderRadius: "12px",
        padding: "10px 16px",
        fontWeight: "900",
        cursor: "pointer",
        zIndex: "9999",
        boxShadow: "0 6px 20px rgba(0,0,0,.3)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease"
      },
      extraStyle
    );

    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-2px)";
      btn.style.boxShadow = "0 8px 24px rgba(0,0,0,.4)";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateY(0)";
      btn.style.boxShadow = "0 6px 20px rgba(0,0,0,.3)";
    });

    btn.addEventListener("click", onClick);
    document.body.appendChild(btn);

    return btn;
  };

  // 🗑 – Кошче
  addBtn("🗑 Кошче", 320, openTrashUI, { background: "#333" });

// ➕ – Нов продукт
addBtn("➕ Добави продукт", 260, () => {
  const key = currentCat();
  if (!CATALOG[key]) {
    CATALOG[key] = { title: key.toUpperCase(), items: [] };
  }

  const cat = CATALOG[key];

  // 🔥 СПЕЦИАЛЕН СЛУЧАЙ: HELL (view:'gallery') – създаваме нова плочка
  if (cat.view === "gallery" && Array.isArray(cat.groups) && cat.groups.length) {
    const defaultImg   = "snimki/produkti/hell/default.jpg";  // по твой вкус
    const defaultPrice = cat.hellPrice ?? 0;
    const defaultName  = "Default";

    // помощник – добавя плочка в дадена група
    const addTileToGroup = (g) => {
      if (!g) return;

      if (!Array.isArray(g.images)) g.images = [];
      if (!Array.isArray(g.prices)) g.prices = [];
      if (!Array.isArray(g.items))  g.items  = [];
      if (!Array.isArray(g.labels)) g.labels = [];

      const idx = g.images.length;

      g.images[idx] = defaultImg;
      g.prices[idx] = defaultPrice;
      g.labels[idx] = defaultName;
      g.items[idx]  = {
        name: defaultName,
        desc: "",
        price: defaultPrice,
        img: defaultImg
      };
    };

    // 1) основната секция – HELL -250мл (обикновено е първата група)
    const mainGroup = cat.groups[0];

    // 2) ICE COFFE HELL -250 мл – търсим по heading
    const coffeeGroup = cat.groups.find(
      (g, idx) =>
        idx !== 0 &&
        typeof g.heading === "string" &&
        g.heading.toLowerCase().includes("ice coffe")
    );

    addTileToGroup(mainGroup);
    if (coffeeGroup && coffeeGroup !== mainGroup) {
      addTileToGroup(coffeeGroup);
    }

    persistDraft();
    activate(key, { replace: true });
    toast("Нов HELL продукт добавен");
    return;
  }

  // 🧊 Нормални категории – старото поведение
  cat.items = cat.items || [];
  cat.items.push({
    name: "Нов продукт",
    desc: "Описание...",
    price: 0,
    img: "snimki/default.jpg"
  });

  persistDraft();
  activate(key, { replace: true });
});





// ➕ – Ново подзаглавие (group) за всяка категория
addBtn("➕ Добави подзаглавие", 230, () => {
  const key = currentCat();

  // ако няма категорията – създаваме я
  if (!CATALOG[key]) {
    CATALOG[key] = { title: key.toUpperCase(), items: [] };
  }

  const cat = CATALOG[key];

  let heading = prompt("Име на подзаглавие (например 'Ice Coffee Hell'):", "");
  if (!heading) return;

  // гарантираме, че има масив groups
  cat.groups = Array.isArray(cat.groups) ? cat.groups : [];

  // създаваме нов group (празен box, в който после ще добавяш продукти)
  cat.groups.push({
    heading: heading.trim(),
    images: [],
    prices: [],
    items: [],
    labels: [],
    pair: []
  });

  persistDraft();
  activate(key, { replace: true });
  toast("✅ Ново подзаглавие е добавено");
}, {
  background: "#ff7a00",
  color: "#fff"
});


  // ➕ – Добави добавка (само за храни)
  addBtn(
    "➕ Добави добавка",
    220,
    () => {
      const key = currentCat().toLowerCase();

      const blockedCats = [
        "napitki",
        "drinks",
        "vodi",
        "voda",
        "hell",
        "hiho",
        "fanta",
        "cola",
        "pepsi",
        "chai",
        "studeni_chai",
        "gazirana_voda",
        "kola",
        "palachinki"
      ];

      if (blockedCats.some((b) => key.includes(b))) {
        toast("❌ Тази категория няма добавки (напитки)");
        return;
      }

      toast("Избери продукт, към който да добавиш добавки 👇");
      isAddonsEditMode = true;

      document.querySelectorAll(".product").forEach((card, i) => {
        card.style.position = "relative";

        const mark = document.createElement("div");
        mark.className = "select-mark";

        Object.assign(mark.style, {
          position: "absolute",
          top: "8px",
          left: "8px",
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          border: "2px solid #ffb300",
          background: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,.2)",
          cursor: "pointer",
          zIndex: "9999",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "900",
          color: "#ffb300",
          transition: "all 0.15s ease",
          userSelect: "none"
        });

        mark.addEventListener(
          "mouseenter",
          () => (mark.style.transform = "scale(1.1)")
        );
        mark.addEventListener(
          "mouseleave",
          () => (mark.style.transform = "scale(1)")
        );

        mark.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!isAddonsEditMode) return;

          mark.innerHTML = "✓";
          mark.style.background = "#ffb300";
          mark.style.color = "#fff";

          openAddonsEditor(i, card);

          isAddonsEditMode = false;
          document.querySelectorAll(".select-mark").forEach((m) => {
            if (m !== mark) m.remove();
          });
        });

        card.appendChild(mark);
      });
    },
    {
      background: "#ffb300",
      color: "#fff",
      fontWeight: "900",
      border: "none",
      borderRadius: "14px",
      padding: "10px 16px",
      position: "fixed",
      right: "20px",
      zIndex: "10000"
    }
  );

  // 📁 – Нова категория
  addBtn("📁 Нова категория", 140, () => {
    let key = prompt("Слъг (латиница), напр. 'pizza':", "");
    if (!key) return;

    key = key
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    if (!key) {
      alert("Невалиден ключ.");
      return;
    }

    if (ORDER.includes(key)) {
      alert("Вече съществува.");
      return;
    }

    const title = prompt("Заглавие:", "НОВА КАТЕГОРИЯ") || "НОВА КАТЕГОРИЯ";

    ORDER.push(key);
    CATALOG[key] = { title, items: [] };
    CAT_THUMBS[key] = CAT_THUMBS[key] || DEFAULT_CAT_THUMB;

    persistDraft();
    rebuildSidebar();
    popThenActivate(null, key);
  });






  // 💾 – Запази ВСИЧКО в основния сайт (Firestore + кеш)
  addBtn("💾 Запази всичко в основния сайт", 50, () => {
    saveToCloud();
  });

  /* ===========================================================
   * БЛОК 10 (END)
   * =========================================================== */

/* ===========================================================
 * БЛОК 11А: РЕНДЕР НА ЗАПИСАНИТЕ ДОБАВКИ ОТ CATALOG
 * (ПАНЕЛЧЕТА ВДЯСНО НА КАРТИТЕ)
 * =========================================================== */

function renderAddonsSidePanels(catKey) {
  const key = (catKey || currentCat()).toLowerCase();
  const category = CATALOG[key];
  if (!category || !Array.isArray(category.items)) return;
  if (!grid) return;

  const cards = [...grid.querySelectorAll(".product")];

  category.items.forEach((item, idx) => {
    const cardEl = cards[idx];
    if (!cardEl) return;

    // махаме стар панел, ако има
    const oldPanel = cardEl.querySelector(".addons-side");
    if (oldPanel) oldPanel.remove();

    if (!item || !Array.isArray(item.addons)) return;

    const selected = item.addons.filter(a => a && a.checked);
    if (!selected.length) return;

    // създаваме нов панел
    const sidePanel = document.createElement("div");
    sidePanel.className = "addons-side";

    const titleDiv = document.createElement("div");
    titleDiv.className = "title";
    titleDiv.textContent = "Добавки";
    sidePanel.appendChild(titleDiv);

    selected.forEach((a) => {
      const row = document.createElement("div");
      row.className = "addon-row";

      const lbl = document.createElement("span");
      lbl.textContent = `+ ${a.label}`;

      const price = document.createElement("span");
      const priceNum = parseFloat(a.price || 0);
      price.textContent = `${priceNum.toFixed(2)} лв`;

      const right = document.createElement("div");
      right.className = "addon-right";
      right.append(price);

      row.append(lbl, right);
      sidePanel.appendChild(row);
    });

    cardEl.style.position = "relative";
    cardEl.appendChild(sidePanel);
  });
}



  /* ===========================================================
   * БЛОК 11: POPUP РЕДАКТОР ЗА ДОБАВКИ + CSS ЗА ДЯСНОТО ПАНЕЛЧЕ
   * (START)
   * =========================================================== */

  function openAddonsEditor(index, cardEl) {
    const key = currentCat().toLowerCase();
    const category = CATALOG[key];
    if (!category) return toast("⚠️ Категорията не е намерена");

    let allItems = [];
    if (category.items) allItems = category.items;
    else if (category.groups)
      category.groups.forEach(
        (g) => (allItems = allItems.concat(g.items || []))
      );

    const item = allItems[index];
    if (!item) return;

    if (!item.addons) item.addons = [];

    document.querySelector(".addons-popup")?.remove();

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.55)",
      zIndex: "100000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeIn .2s ease"
    });
    overlay.className = "addons-popup";

    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#fff",
      borderRadius: "16px",
      width: "min(420px, 95%)",
      padding: "20px",
      boxShadow: "0 10px 40px rgba(0,0,0,.3)",
      fontFamily: "Segoe UI, sans-serif",
      position: "relative"
    });

    const title = document.createElement("h3");
    title.textContent = "Добавки към продукта";
    title.style.color = "#ff7a00";
    box.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✖";
    Object.assign(closeBtn.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "none",
      border: "none",
      fontSize: "18px",
      cursor: "pointer"
    });
    closeBtn.onclick = () => overlay.remove();
    box.appendChild(closeBtn);

    const list = document.createElement("div");
    box.appendChild(list);

    const addRowBtn = document.createElement("button");
    addRowBtn.textContent = "+ Добави нова добавка";
    Object.assign(addRowBtn.style, {
      display: "block",
      margin: "10px auto",
      background: "#eee",
      border: "1px solid #ccc",
      borderRadius: "8px",
      padding: "6px 12px",
      cursor: "pointer"
    });
    addRowBtn.onclick = () => {
      item.addons.push({ label: "", price: "0.00", checked: false });
      renderList();
    };
    box.appendChild(addRowBtn);

    function renderList() {
      list.innerHTML = "";
      item.addons.forEach((a) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.marginBottom = "8px";
        row.style.gap = "6px";

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.checked = !!a.checked;
        chk.onchange = () => (a.checked = chk.checked);

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "име на добавка";
        nameInput.value = a.label || "";
        Object.assign(nameInput.style, {
          flex: "1",
          padding: "5px 8px",
          border: "1px solid #ccc",
          borderRadius: "6px"
        });
        nameInput.oninput = () => (a.label = nameInput.value);

        const priceInput = document.createElement("input");
        priceInput.type = "number";
        priceInput.min = "0";
        priceInput.step = "0.10";
        priceInput.placeholder = "цена";
        priceInput.value = a.price || "";
        Object.assign(priceInput.style, {
          width: "70px",
          padding: "4px 6px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          textAlign: "right"
        });
        priceInput.oninput = () => (a.price = priceInput.value);

        const lvLabel = document.createElement("span");
        lvLabel.textContent = "лв";
        lvLabel.style.fontWeight = "600";
        lvLabel.style.color = "#444";

        row.append(chk, nameInput, priceInput, lvLabel);
        list.appendChild(row);
      });
    }

    renderList();

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "💾 Запази";
    Object.assign(saveBtn.style, {
      display: "block",
      margin: "12px auto 0",
      background: "#ff7a00",
      color: "#fff",
      fontWeight: "900",
      border: "none",
      borderRadius: "8px",
      padding: "8px 16px",
      cursor: "pointer"
    });

    saveBtn.onclick = () => {
      const selectedAddons = item.addons.filter((a) => a.checked);

if (!CATALOG[key].items[index]) CATALOG[key].items[index] = item;
CATALOG[key].items[index].addons = item.addons;

// 🧩 записваме в черновата → после „💾 Запази всичко“ ще го прати към Firestore
persistDraft();

      if (selectedAddons.length === 0) {
        toast("⚠️ Не си избрал добавки!");
        overlay.remove();
        return;
      }

      toast("✅ Добавките са записани");

      let sidePanel = cardEl.querySelector(".addons-side");
      if (!sidePanel) {
        sidePanel = document.createElement("div");
        sidePanel.className = "addons-side";
        cardEl.style.position = "relative";
        cardEl.appendChild(sidePanel);
      } else {
        sidePanel.innerHTML = "";
      }

      const titleDiv = document.createElement("div");
      titleDiv.className = "title";
      titleDiv.textContent = "Добавки";
      sidePanel.appendChild(titleDiv);

      selectedAddons.forEach((a) => {
        const row = document.createElement("div");
        row.className = "addon-row";

        const lbl = document.createElement("span");
        lbl.textContent = `+ ${a.label}`;

        const price = document.createElement("span");
        price.textContent = `${parseFloat(a.price).toFixed(2)} лв`;

        const del = document.createElement("button");
        del.textContent = "✖";
        del.onclick = () => {
          const pass = prompt("🔒 Въведи парола за изтриване:");
          if (pass === MOD_PASSWORD) {
item.addons = item.addons.filter((x) => x !== a);
toast(`🗑️ ${a.label} премахната`);
row.remove();
CATALOG[key].items[index].addons = item.addons;

// 🧩 пак пазим в черновата
persistDraft();

          } else {
            alert("❌ Грешна парола!");
          }
        };

        const right = document.createElement("div");
        right.className = "addon-right";
        right.append(price, del);

        row.append(lbl, right);
        sidePanel.appendChild(row);
      });

      overlay.remove();
    };

    box.appendChild(saveBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // CSS за панела с добавки вдясно – инжектираме веднъж
  (function ensureAddonsSideCSS() {
    const css = `
    .product, .menu-item, .item-card {
      overflow: visible !important;
      position: relative !important;
      z-index: 5;
    }

    .addons-side {
      position: absolute;
      left: 105%;
      top: 0;
      margin-left: 10px;
      background: #fff;
      border: 1px solid #ffb30055;
      border-radius: 10px;
      padding: 10px 14px;
      box-shadow: 0 4px 18px rgba(0,0,0,.08);
      min-width: 190px;
      z-index: 9999;
      transition: all 0.25s ease;
      animation: slideInRight .25s ease forwards;
    }

    .addons-side .title {
      font-weight: 700;
      color: #ff7a00;
      margin-bottom: 6px;
      text-align: center;
    }

    .addons-side .addon-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .addons-side button {
      background: none;
      border: none;
      color: #ff4d4d;
      font-weight: 900;
      cursor: pointer;
      margin-left: 6px;
    }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  })();

  /* ===========================================================
   * БЛОК 11 (END)
   * =========================================================== */
function cleanUndefined(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function saveToCloud() {
  const snap = snapshotRuntime();
  const mem  = getMemory();

  // 🔥 ЯСЕН payload към бекенда
  let payload = {
    // малки букви – това очаква /api/save-menu и BBQ_STORE.save()
    catalog: snap.catalog,            // тук е hell + groups + labels + prices
    order: snap.order,
    addons: window.ADDONS || {},
    cat_thumbs: snap.cat_thumbs,
    addons_labels: mem.addons_labels || {},
    savedAt: new Date().toISOString()
  };

  // по желание – дублираме в главни букви, ако някъде още се ползват
  payload.CATALOG       = payload.catalog;
  payload.ORDER         = payload.order;
  payload.ADDONS        = payload.addons;
  payload.CAT_THUMBS    = payload.cat_thumbs;
  payload.ADDONS_LABELS = payload.addons_labels;

  // 🧹 махаме undefined, за да не гърми Firestore
  payload = cleanUndefined(payload);

  try {
    console.log("BBQ SAVE PAYLOAD:", payload); // 👁 да видиш в DevTools > Console

    const res = await window.BBQ_STORE.save(payload);

    if (!res || !res.ok) {
      console.error("Save error:", res);
      toast("❌ Грешка при записа в облака");
      return;
    }

    // записваме и локално като „официален“ snapshot
    save(LS_MOD_DATA, snap);

    toast("✔ Записано в основния сайт (" + res.via + ")");
  } catch (e) {
    console.error("Save error:", e);
    toast("❌ Проблем при запис");
  }
}


  /* ===========================================================
   * БЛОК 12: ВИЗУАЛЕН БАНЕР "MODERATOR MODE" + BOOT
   * (START)
   * =========================================================== */

  (function showModeratorBanner() {
    if (document.querySelector("#moderator-banner")) return;

    const banner = document.createElement("div");
    banner.id = "moderator-banner";
    banner.innerHTML = `
      <span>🟠 MODERATOR MODE</span>
      <button id="exitModeratorBtn" style="
        margin-left:15px;
        background:#fff;
        color:#ff7a00;
        font-weight:700;
        border:none;
        border-radius:8px;
        padding:4px 10px;
        cursor:pointer;
      ">Изход</button>
    `;

    Object.assign(banner.style, {
      position: "fixed",
      top: "0",
      left: "50%",
      transform: "translateX(-50%)",
      background: "linear-gradient(90deg, #ff7a00, #ffb300)",
      color: "#fff",
      fontWeight: "900",
      fontSize: "18px",
      padding: "10px 30px",
      borderRadius: "0 0 14px 14px",
      zIndex: "1000000",
      textShadow: "0 2px 5px rgba(0,0,0,0.3)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      letterSpacing: "1px",
      userSelect: "none"
    });

    document.body.appendChild(banner);

    document.getElementById("exitModeratorBtn").onclick = exitModeratorMode;
  })();

  // BOOT: при стартиране прилагаме запазените данни и активираме текущата категория
  applySaved(read(LS_MOD_DATA, null));
  applySaved(read(LS_MOD_DRAFT, null));
  rebuildSidebar();

  const cur = currentCat();
  if (typeof titleEl !== "undefined" && titleEl && CATALOG[cur]?.title) {
    titleEl.textContent = CATALOG[cur].title;
  }

  activate(cur, { replace: true });

  /* ===========================================================
   * БЛОК 12 (END)
   * =========================================================== */





// ==========================================================
// 🔥 СИНХРОНИЗАЦИЯ НА МОДЕРАТОРА С FIRESTORE
// Изпраща snapshotRuntime() към Firestore чрез BBQ_STORE.save()
// ==========================================================

// 🔄 Свързваме бутона #mod-save с нашия глобален saveToCloud()
document.addEventListener("click", (e) => {
  const saveBtn = e.target.closest("#mod-save");
  if (!saveBtn) return;
  saveToCloud();   // използваме вече готовия payload { CATALOG, ORDER, ... }
});


});