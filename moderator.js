document.addEventListener("DOMContentLoaded", () => {
  const PASSWORD = "bbqcornera123";
  const STORAGE_KEY = "bbq_full_catalog";
  const MODE = new URLSearchParams(location.search).get("mode");

  if (MODE !== "moderator") {
    console.log("🟡 Не е в Moderator Mode — спирам скрипта");
    return;
  }

  console.log("🟠 Moderator Mode активиран — пълен контрол.");

  /* 🟧 BANNER */
  const banner = document.createElement("div");
  banner.textContent = "🟠 MODERATOR MODE (Редакция на всички елементи)";
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#ff7a00",
    color: "#fff",
    fontWeight: "900",
    padding: "8px 20px",
    borderRadius: "0 0 16px 16px",
    zIndex: "9999",
  });
  document.body.appendChild(banner);

  /* 🧰 PANEL */
  const panel = document.createElement("div");
  panel.className = "moderator-panel";
  panel.innerHTML = `
    <button id="addCategory">➕ Категория</button>
    <button id="addProduct">➕ Продукт</button>
    <button id="trash">🗑️ Кошче</button>
    <button id="saveAll">💾 Запази</button>
    <button id="exit">🚪 Изход</button>
  `;
  Object.assign(panel.style, {
    position: "fixed",
    top: "50px",
    right: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    background: "#111",
    padding: "10px",
    borderRadius: "12px",
    zIndex: "9999",
    boxShadow: "0 8px 25px rgba(0,0,0,.3)",
  });
  panel.querySelectorAll("button").forEach((b) => {
    Object.assign(b.style, {
      background: "#ff7a00",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontWeight: "800",
      padding: "6px 10px",
      cursor: "pointer",
    });
  });
  document.body.appendChild(panel);

  /* 🧠 Общи помощници */
  const grid = document.querySelector("#productGrid") || document.querySelector("#menuGrid") || document.body;
  const trash = [];

  function saveAll() {
    const data = [];
    document.querySelectorAll(".product-card, .category-card").forEach((el) => {
      const type = el.classList.contains("product-card") ? "product" : "category";
      data.push({
        type,
        name: el.querySelector(".product-name, .cat-name")?.textContent.trim() || "",
        desc: el.querySelector(".product-desc, .cat-desc")?.textContent.trim() || "",
        price: el.querySelector(".product-price")?.textContent.trim() || "",
        img: el.querySelector("img")?.src || "",
        addons: Array.from(el.querySelectorAll(".addon-item")).map((x) => x.textContent.trim()),
      });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log("💾 Данните са запазени в localStorage");
  }

  function reloadFromStorage() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!saved.length) return;
    grid.innerHTML = "";
    saved.forEach((p) => {
      if (p.type === "category") return addCategory(p.name, p.img, false);
      else addProduct(p.name, p.desc, p.price, p.img, p.addons, false);
    });
  }

  /* 🟠 INLINE редакция */
  function makeEditable(el) {
    el.contentEditable = true;
    el.style.outline = "1px dashed #ff7a00";
    el.style.borderRadius = "4px";
  }

  /* 🟠 Продукт шаблон */
  function addProduct(name = "Нов продукт", desc = "Описание...", price = "0.00 лв", img = "snimki/default.jpg", addons = [], autosave = true) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.style.position = "relative";
    card.style.padding = "10px";
    card.style.border = "1px solid #ccc";
    card.style.borderRadius = "10px";
    card.style.margin = "10px";
    card.style.width = "220px";
    card.style.display = "inline-block";
    card.draggable = true;

    card.innerHTML = `
      <img src="${img}" alt="${name}" style="width:100%;border-radius:10px;cursor:pointer;">
      <div class="product-name">${name}</div>
      <div class="product-desc">${desc}</div>
      <div class="product-price">${price}</div>
      <div class="addons">
        ${addons.map((a) => `<div class="addon-item">${a}</div>`).join("")}
        <button class="add-addon">➕ Добави добавка</button>
      </div>
      <button class="delete-btn">🗑️</button>
    `;
    grid.appendChild(card);

    // Editables
    makeEditable(card.querySelector(".product-name"));
    makeEditable(card.querySelector(".product-desc"));
    makeEditable(card.querySelector(".product-price"));

    // Image change
    card.querySelector("img").addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => (card.querySelector("img").src = ev.target.result);
        reader.readAsDataURL(file);
      };
      input.click();
    });

    // Delete
    card.querySelector(".delete-btn").addEventListener("click", () => {
      const check = prompt("Въведи паролата за изтриване:");
      if (check !== PASSWORD) return alert("❌ Грешна парола!");
      trash.push(card);
      card.remove();
      saveAll();
    });

    // Addons
    card.querySelector(".add-addon").addEventListener("click", () => {
      const addonName = prompt("Въведи име на добавка:");
      if (!addonName) return;
      const addon = document.createElement("div");
      addon.className = "addon-item";
      addon.textContent = addonName;
      addon.contentEditable = true;
      card.querySelector(".addons").insertBefore(addon, card.querySelector(".add-addon"));
      saveAll();
    });

    // Drag & Drop
    card.addEventListener("dragstart", () => (window._dragged = card));
    card.addEventListener("dragover", (e) => e.preventDefault());
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      const dragged = window._dragged;
      if (dragged && dragged !== card) {
        card.parentNode.insertBefore(dragged, card.nextSibling);
        saveAll();
      }
    });

    if (autosave) saveAll();
  }

  /* 🟠 Категория шаблон */
  function addCategory(name = "Нова категория", img = "snimki/produkti/default.jpg", autosave = true) {
    const card = document.createElement("div");
    card.className = "category-card";
    card.style.position = "relative";
    card.style.border = "2px solid #ff7a00";
    card.style.padding = "10px";
    card.style.margin = "10px";
    card.style.width = "240px";
    card.style.borderRadius = "12px";
    card.style.display = "inline-block";
    card.style.background = "#fff8f1";
    card.innerHTML = `
      <img src="${img}" alt="${name}" style="width:100%;border-radius:10px;cursor:pointer;">
      <div class="cat-name">${name}</div>
      <div class="cat-desc">Описание на категорията...</div>
      <button class="delete-btn">🗑️</button>
    `;
    grid.appendChild(card);
    makeEditable(card.querySelector(".cat-name"));
    makeEditable(card.querySelector(".cat-desc"));

    card.querySelector("img").addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => (card.querySelector("img").src = ev.target.result);
        reader.readAsDataURL(file);
      };
      input.click();
    });

    card.querySelector(".delete-btn").addEventListener("click", () => {
      const check = prompt("Въведи паролата за изтриване:");
      if (check !== PASSWORD) return alert("❌ Грешна парола!");
      trash.push(card);
      card.remove();
      saveAll();
    });

    if (autosave) saveAll();
  }

  /* 🟠 Събития от панела */
  document.getElementById("addProduct").onclick = () => addProduct();
  document.getElementById("addCategory").onclick = () => addCategory();
  document.getElementById("saveAll").onclick = () => {
    if (confirm("💾 Да запазя ли промените?")) {
      saveAll();
      alert("✅ Промените са запазени успешно!");
    } else {
      alert("❌ Промените не са запазени.");
      window.location.href = "file:///E:/BBQ_SITE/index.html";
    }
  };
  document.getElementById("trash").onclick = () => {
    if (!trash.length) return alert("Кошчето е празно.");
    if (confirm("♻️ Да възстановя всички изтрити елементи?")) {
      trash.forEach((el) => grid.appendChild(el));
      trash.length = 0;
      saveAll();
    }
  };
  document.getElementById("exit").onclick = () => {
    window.location.href = "file:///E:/BBQ_SITE/index.html";
  };

  /* ♻️ Зареждане на локални данни */
  reloadFromStorage();

  // Подсказка
  console.log("✅ Можеш да редактираш текст, снимки, добавки, категории и продукти директно на страницата.");
});
