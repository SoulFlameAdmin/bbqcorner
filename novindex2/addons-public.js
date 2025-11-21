// E:\BBQ_SITE\novindex2\addons-public.js
// Показва панела "Добавки" за всеки продукт, базиран на CATALOG[*].items[*].addons

(function () {
  // чакаме да има CATALOG, grid и activate
  function currentCat() {
    const p = new URLSearchParams(location.search);
    return p.get("cat") || (typeof current !== "undefined" ? current : "burgeri");
  }

  function renderSavedAddonsPanels(catKeyOverride) {
    if (typeof CATALOG === "undefined") return;
    if (typeof grid === "undefined" || !grid) return;

    const key = (catKeyOverride || currentCat()).toLowerCase();
    const category = CATALOG[key];
    if (!category || !Array.isArray(category.items)) return;

    const cards = [...grid.querySelectorAll(".product")];

    cards.forEach((card, index) => {
      const item = category.items[index];
      if (!item || !Array.isArray(item.addons) || !item.addons.length) {
        const oldPanel = card.querySelector(".addons-side");
        if (oldPanel) oldPanel.remove();
        return;
      }

      let sidePanel = card.querySelector(".addons-side");
      if (!sidePanel) {
        sidePanel = document.createElement("div");
        sidePanel.className = "addons-side";
        card.style.position = "relative";
        card.appendChild(sidePanel);
      } else {
        sidePanel.innerHTML = "";
      }

      const titleDiv = document.createElement("div");
      titleDiv.className = "title";
      titleDiv.textContent = "Добавки";
      sidePanel.appendChild(titleDiv);

      item.addons.forEach((a) => {
        if (a.checked === false) return;

        const row = document.createElement("div");
        row.className = "addon-row";

        const lbl = document.createElement("span");
        lbl.textContent = `+ ${a.label || ""}`;

        const price = document.createElement("span");
        const p = parseFloat(a.price || 0);
        price.textContent = `${isFinite(p) ? p.toFixed(2) : "0.00"} лв`;

        const right = document.createElement("div");
        right.className = "addon-right";
        right.append(price);

        row.append(lbl, right);
        sidePanel.appendChild(row);
      });
    });
  }

  // Инжектираме CSS за панелчето (ако го няма)
  (function ensureAddonsSideCSS() {
    if (document.querySelector("style[data-addons-side-css]")) return;
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

      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(10px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `;
    const style = document.createElement("style");
    style.setAttribute("data-addons-side-css", "1");
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // Хукваме се към activate, но без да пипаме MOD кода
  function hookActivate() {
    if (typeof window.activate !== "function") return;

    if (window.__addonsPublicHooked) return;
    window.__addonsPublicHooked = true;

    const _activate = window.activate;
    window.activate = function (cat, opts) {
      _activate(cat, opts);
      renderSavedAddonsPanels(cat || currentCat());
    };

    // първо зареждане
    renderSavedAddonsPanels(currentCat());
  }

  // чакаме DOM + глобалната activate
  document.addEventListener("DOMContentLoaded", () => {
    const interval = setInterval(() => {
      if (typeof window.activate === "function" &&
          typeof window.CATALOG  !== "undefined" &&
          typeof window.grid     !== "undefined") {
        clearInterval(interval);
        hookActivate();
      }
    }, 80);
    setTimeout(() => clearInterval(interval), 5000);
  });
})();
