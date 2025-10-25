



/* novindex2.js */
"use strict";

/* ===========================
   🧭 ПЪТИЩА И ПОМОЩНИ НЕЩА
   =========================== */

/* 🔶 Промоции: лого и линкове (само за миниатюрата в сайдбара) */
const PROMO_IMG = (location.protocol === "file:")
  ? "file:///E:/BBQ_SITE/promociqlogo.jpg"
  : "promociqlogo.jpg";
const PROMO_LINK_LOCAL = "file:///E:/BBQ_SITE/index7.html";
const PROMO_LINK_WEB   = "index7.html";

/* малък helper за безопасен текст в HTML */
const esc = (s) => String(s)
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;");

/* Цени – конвертор */
const BGN_PER_EUR = 1.95583;
const fmtLv  = v => (Number(v)||0).toFixed(2).replace(".",",") + " лв.";
const fmtEur = v => ((Number(v)||0) / BGN_PER_EUR).toFixed(2).replace(".",",") + " €";

/* Лека помощна функция за мобилни отмествания */
function recalcMobileOffsets(){
  ensureMobilePlusRight();
  ensurePlusRightUniversal();
}

/* ➜ На телефон мести бутона точно вдясно от цената */
function ensureMobilePlusRight(){
  const isPhone = window.matchMedia("(max-width:900px)").matches;
  if (!isPhone) return;

  document.querySelectorAll(".product .pad").forEach(pad => {
    const price = pad.querySelector(".price-badge");
    const btn   = pad.querySelector(".mobile-add-btn") || pad.querySelector(".add-btn");
    if (!price || !btn) return;

    let row = pad.querySelector(".price-plus");
    if (!row){
      row = document.createElement("div");
      row.className = "price-plus";
      price.replaceWith(row);
      row.appendChild(price);
    }
    row.appendChild(btn);
    btn.style.display = "inline-flex";
    btn.style.width   = "auto";
    btn.style.margin  = "0";
  });
}
window.addEventListener("load",  ensureMobilePlusRight);
window.addEventListener("resize", ensureMobilePlusRight);

/* ➜ Универсално: само преместваме съществуващия “+” след цената. НЕ създаваме нов! */
function ensurePlusRightUniversal(){
  const hosts = document.querySelectorAll('.product, .tile, .water-card');
  hosts.forEach(card => {
    const pad   = card.querySelector('.pad') || card;
    const price = pad.querySelector('.price-badge') || card.querySelector('.price-badge');
    if (!price) return;

    // ако по погрешка има повече от един "+" — запази само първия
    const allPlus = pad.querySelectorAll('.add-btn');
    if (allPlus.length > 1) {
      allPlus.forEach((b, i) => { if (i > 0) b.remove(); });
    }

    const plus = pad.querySelector('.add-btn') || card.querySelector('.add-btn');
    if (!plus) return;

    plus.classList.add('add-btn');
    plus.classList.remove('mobile-add-btn');

    if (plus !== price.nextElementSibling) {
      price.insertAdjacentElement('afterend', plus);
    }
  });
}


/* ===========================
   📦 КОЛИЧКА
   =========================== */

const CART = [];
const cartBtn      = document.getElementById("cartBtn");
const cartCount    = document.getElementById("cartCount");
const cartOverlay  = document.getElementById("cartOverlay");
const cartItemsEl  = document.getElementById("cartItems");
const cartTotalRow = document.getElementById("cartTotalRow");
const cartTotal    = document.getElementById("cartTotal");
const orderNowBtn  = document.getElementById("orderNow");

/* ====== LS ключове ====== */
const LS_CART_ITEMS = "bbq_cart_items";
const LS_CART_TOTAL = "bbq_cart_total";
const LS_ORDER_NOTE = "bbq_order_note";
const noteWrapper   = document.getElementById("noteWrapper");
const orderNoteEl   = document.getElementById("orderNote");

/* Добавяне към количката */
function addToCart(item){
  // гард срещу празни артикули
  if (!item || !item.baseName || !(item.price >= 0)) return;
  CART.push(item);
  updateCartUI();
}

/* Основен рендер на количката */
function updateCartUI(){
  if (!cartItemsEl) return;

  if (cartCount) cartCount.textContent = CART.length;

  if (CART.length === 0){
    cartItemsEl.innerHTML = `<div class="cart-empty">Количката е празна.</div>`;
    if (cartTotalRow) cartTotalRow.style.display = "none";
    if (orderNowBtn) orderNowBtn.disabled = true;
    if (noteWrapper) noteWrapper.style.display = "none";
    persistCartSnapshot();
    return;
  }

  cartItemsEl.innerHTML = CART.map(it => {
    const addonsLine = it.addons?.length
      ? `<div style="font-size:12px; opacity:.8; margin-top:2px">
           + ${it.addons.map(a=>`${esc(a.label)} (${fmtLv(a.price)})`).join(", ")}
         </div>` : "";
    return `
      <div class="cart-item">
        <img src="${esc(it.img||"")}" alt="${esc(it.baseName || it.name)}">
        <div>
          <div class="name">${esc(it.baseName || it.name)}</div>
          ${addonsLine}
          <div class="price" style="margin-top:4px">
            ${fmtLv(it.price)} <span style="opacity:.75">(${fmtEur(it.price)})</span>
          </div>
        </div>
        <div><button class="add-btn" data-remove="${it._id}">✕</button></div>
      </div>`;
  }).join("");

  cartItemsEl.querySelectorAll("[data-remove]").forEach((btn)=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-remove");
      const i = CART.findIndex(x => String(x._id) === id);
      if (i>=0){ CART.splice(i,1); updateCartUI(); }
    });
  });

  const total = CART.reduce((s, x)=> s + (Number(x.price)||0), 0);
  if (cartTotal) cartTotal.textContent = `${fmtLv(total)}  (${fmtEur(total)})`;
  if (cartTotalRow) cartTotalRow.style.display = "";
  if (orderNowBtn) orderNowBtn.disabled = false;
  if (noteWrapper) noteWrapper.style.display = "block";

  persistCartSnapshot();

  if (orderNoteEl && !orderNoteEl.dataset.bound) {
    orderNoteEl.addEventListener("input", () => {
      localStorage.setItem(LS_ORDER_NOTE, orderNoteEl.value);
    });
    orderNoteEl.dataset.bound = "1";
  }
}

function restoreOrderNote(){
  if (orderNoteEl){
    orderNoteEl.value = localStorage.getItem(LS_ORDER_NOTE) || "";
  }
}

function persistCartSnapshot(){
  try{
    const itemsSnapshot = CART.map(({_id, name, baseName, price, basePrice, img, addons}) => ({
      _id, name, baseName, price, basePrice, img, addons: addons || []
    }));
    const total = CART.reduce((s, x)=> s + (Number(x.price)||0), 0);
    localStorage.setItem(LS_CART_ITEMS, JSON.stringify(itemsSnapshot));
    localStorage.setItem(LS_CART_TOTAL, String(total));
    if (orderNoteEl) localStorage.setItem(LS_ORDER_NOTE, orderNoteEl.value || "");
  }catch(e){ console.warn("LS error:", e); }
}

function restoreCartFromLS() {
  try {
    const raw = localStorage.getItem(LS_CART_ITEMS);
    const items = JSON.parse(raw || "[]");

    if (Array.isArray(items) && items.length > 0) {
      items.forEach(it => {
        const price = Number(it.price ?? it.basePrice ?? 0);
        const baseName = it.baseName || it.name || "";
        if (!baseName) return; // пропускаме счупени записи
        CART.push({
          _id: it._id || (Date.now() + "" + Math.random()),
          name: it.name || baseName,
          baseName,
          price,
          basePrice: Number(it.basePrice ?? price),
          img: it.img || "",
          addons: Array.isArray(it.addons) ? it.addons : []
        });
      });
    }

    updateCartUI();
    restoreOrderNote();
  } catch (e) {
    console.warn("⚠️ Грешка при възстановяване на количката от LocalStorage:", e);
  }
}

/* Отваряне/затваряне на модала */
function openCart(){
  if (!cartOverlay || !cartBtn) return;
  updateCartUI();
  cartOverlay.style.display = "flex";
  cartOverlay.setAttribute("aria-hidden","false");
  cartBtn.setAttribute("aria-expanded","true");
}
function closeCart(){
  if (!cartOverlay || !cartBtn) return;
  cartOverlay.style.display = "none";
  cartOverlay.setAttribute("aria-hidden","true");
  cartBtn.setAttribute("aria-expanded","false");
}
const cartCloseBtn = document.getElementById("cartClose");
if (cartCloseBtn) cartCloseBtn.addEventListener("click", closeCart);
if (cartOverlay) {
  cartOverlay.addEventListener("click", (e)=>{ if(e.target === cartOverlay) closeCart(); });
}
if (cartBtn) cartBtn.addEventListener("click", openCart);
document.addEventListener("keydown", (e)=>{ if (e.key === "Escape" && cartOverlay && cartOverlay.style.display === "flex") closeCart(); });

/* Поръчай сега → index3.html (локално или уеб) */
if (orderNowBtn){
  orderNowBtn.addEventListener("click", ()=>{
    if (CART.length === 0) return;
    persistCartSnapshot();
    const target = (location.protocol === "file:") ? "file:///E:/BBQ_SITE/index3.html" : "index3.html";
    window.location.href = target;
  });
}

/* ===========================
   🖼️ КАТЕГОРИИ/КАТАЛОГ
   =========================== */

/* Миниатюри (сайдбар) */
const CAT_THUMBS = {
  promocii: PROMO_IMG,
  burgeri:"snimki/produkti/1menu/burger.jpg",
  palachinki:"snimki/produkti/1menu/palachinki.jpg",
  strandzhanki:"snimki/produkti/1menu/strandjanka.jpg",
  kartofi:"snimki/produkti/1menu/kartofi.jpg",
  salati:"snimki/produkti/1menu/salata.jpg",
  portsii:"snimki/produkti/1menu/porciq.jpg",
  sosove:"snimki/produkti/1menu/sosove.jpg",
  dobavki:"snimki/produkti/1menu/dobavki.jpg",
  deserti:"snimki/produkti/1menu/desert.jpg",
  bezalkoholni:"snimki/produkti/1menu/bezalkoholno.jpg",
  bira:"snimki/produkti/1menu/bira.jpg",
  hell:"snimki/produkti/1menu/hell.jpg",
  voda:"snimki/produkti/ВОДА/voda_snimka.jpg",
  gazirana_voda:"snimki/produkti/ГАЗИРАНА_ВОДА/gaziranavoda_snimka.jpg",
  fanta:"snimki/produkti/ФАНТА/fanta_logo.jpg",
  studen_chai:"snimki/produkti/СТУДЕН_ЧАЙ/studen_chai_logo.jpg",
  kola:"snimki/produkti/КОЛА/kola_logo.jpg",
  sok:"snimki/produkti/СОК/cappy_logo.jpg",
  airqn:"snimki/produkti/АЙРАН/vereq_logo.jpg",
  xixo:"snimki/produkti/ХИХО/xixo_logo.jpg"
};

/* === ДОБАВКИ (универсални) === */
const ADDONS = {
  pitka:   { code:"pitka",   label:"Питка",          price:1.50 },
  raz:     { code:"raz",     label:"Разядка 100 гр", price:1.50 },
  ketchup: { code:"ketchup", label:"Кетчуп",      price:0 },
  mayo:    { code:"mayo",    label:"Майонеза",    price:0 },
  mustard: { code:"mustard", label:"Горчица",     price:0 },
  chili:   { code:"chili",   label:"Люто",        price:0 },
  sharena: { code:"sharena", label:"Шарена сол",  price:0 },
};

/* Каталог с цени в лв. */
const CATALOG = {
  burgeri:{title:"САНДВИЧИ",items:[
    {name:"КОНСКА ПЛЕСКАВИЦА", price:9.00, img:"snimki/produkti/2menu/konski.jpg",
      desc:"Конско месо на жар със свежи зеленчуци, три вида сосове (кетчуп, майонеза, горчица), пресни картофки и прясна питка (самун)."},
    {name:"ТЕЛЕШКА ПЛЕСКАВИЦА", price:9.00, img:"snimki/produkti/2menu/sharska.jpg",
      desc:"Телешко мляно месо на жар със свежи зеленчуци, три вида сосове (кетчуп, майонеза, горчица), пресни картофки и прясна питка (самун)."},
    {name:"ШАРСКА ПЛЕСКАВИЦА", price:9.50, img:"snimki/produkti/2menu/sharska.jpg",
      desc:"Телешко мляно месо с кашкавал на жар със свежи зеленчуци, три вида сосове (кетчуп, майонеза, горчица), пресни картофки и прясна питка (самун)."},
    {name:"СВИНСКА ВЕШАЛИЦА", price:9.00, img:"snimki/produkti/2menu/sharska.jpg",
      desc:"Крехко свинско контрафиле на жар със свежи зеленчуци, три вида сосове (кетчуп, майонеза, горчица), пресни картофки и прясна питка (самун)."},
    {name:"ПИЛЕШКИ СТЕК", price:9.00, img:"snimki/produkti/2menu/pileshkistek.jpg",
      desc:"Пилешко филе на жар със свежи зеленчуци, три вида сосове (кетчуп, майонеза, горчица), пресни картофки и прясна питка (самун)."},
    {name:"ВЕГЕТАРИАНСКИ", price:5.00, img:"snimki/produkti/2menu/vegan.jpg",
      desc:"Свежи зеленчуци , пресни картофки и прясна питка (самун)."},
    {name:"ДВОЙНА ШАРСКА ПЛЕСКАВИЦА", price:12.50, img:"snimki/produkti/2menu/sharska.jpg",
      desc:"Двойна телешка плескавица с кашкавал на жар със свежи зеленчуци, пресни картофки и прясна питка (самун)."},
    {name:"ДВОЙНА КОНСКА ПЛЕСКАВИЦА", price:12.00, img:"snimki/produkti/2menu/konski.jpg",
      desc:"Мляно конско месо на жар със свежи зеленчуци, пресни картофки и прясна питка (самун)."},
    {name:"ДВОЙНА СВИНСКА ВЕШАЛИЦА", price:12.00, img:"snimki/produkti/2menu/sharska.jpg",
      desc:"Двойно свинско контрафиле на жар със свежи зеленчуци, пресни картофки и прясна питка (самун)."},
    {name:"ДВОЕН ПИЛЕШКИ СТЕК", price:12.00, img:"snimki/produkti/2menu/pileshkistek.jpg",
      desc:"Двойно пилешко филе на жар със свежи зеленчуци, пресни картофки и прясна питка (самун)."},
    {name:"ДВОЙНА ТЕЛЕШКА ПЛЕСКАВИЦА", price:12.00, img:"snimki/produkti/2menu/sharska.jpg",
      desc:"Двойна телешка плескавица на жар със свежи зеленчуци, пресни картофки и прясна питка (самун)."},
    {name:"БУРГЕР С ДЪРПАНО ТЕЛЕШКО", price:12.50, img:"snimki/produkti/2menu/durpano.jpg",
      desc:"Дърпано телешко на жар със свежи зеленчуци, пресни картофки и прясна питка (самун)."}
  ]},
  palachinki:{
    title:"ПАЛАЧИНКИ",
    groups:[
      { heading:"СЛАДКИ", items:[
        {name:"ПАЛАЧИНКА СЪС NUCREMA ШОКОЛАД",price:5.00,img:"snimki/produkti/ПАЛАЧИНКИ/shokolad.jpg"},
        {name:"ПАЛАЧИНКА СЪС NUCREMA ШОКОЛАД И БАНАН",price:6.00,img:"snimki/produkti/ПАЛАЧИНКИ/shokoladibanan.png"},
        {name:"ПАЛАЧИНКА С МЕД И ОРЕХИ",price:5.50,img:"snimki/produkti/ПАЛАЧИНКИ/mediorehi.png"},
        {name:"ПАЛАЧИНКА СЪС СЛАДКО ОТ БОРОВИНКИ",price:5.00,img:"snimki/produkti/ПАЛАЧИНКИ/borovinki.png"},
        {name:"ПАЛАЧИНКА СЪС СЛАДКО ОТ ПРАСКОВА",price:5.00,img:"snimki/produkti/ПАЛАЧИНКИ/praskovi.png"},
        {name:"ПАЛАЧИНКА СЪС СЛАДКО ОТ ЯГОДИ",price:5.00,img:"snimki/produkti/ПАЛАЧИНКИ/qgodi.png"}
      ]},
      { heading:"СОЛЕНИ", items:[
        {name:"ПАЛАЧИНКА С КАШКАВАЛ И БЕКОН",price:6.00,img:"snimki/produkti/ПАЛАЧИНКИ/kashkavalibekon.png"},
        {name:"СИРЕНЕ И СЛАДКО",price:5.50,img:"snimki/produkti/ПАЛАЧИНКИ/sirene.png"},
        {name:"ПАЛАЧИНКА СЪС СИРЕНЕ",price:5.00,img:"snimki/produkti/ПАЛАЧИНКИ/sirene.png"},
        {name:"ПАЛАЧИНКА СЪС КАШКАВАЛ",price:5.50,img:"snimki/produkti/ПАЛАЧИНКИ/kashkaval.png"},
        {name:"ПАЛАЧИНКА СЪС СИРЕНЕ И КАШКАВАЛ",price:6.00,img:"snimki/produkti/ПАЛАЧИНКИ/kashkavalisirene.png"},
        {name:"ПАЛАЧИНКА С МАСЛО",price:4.50,img:"snimki/produkti/ПАЛАЧИНКИ/maslo.png"}
      ]}
    ]
  },
  strandzhanki:{ title:"СТРАНДЖАНКИ", items:[
    {name:"ТЕЛЕШКА СТРАНДЖАНКА",price:5.00,img:CAT_THUMBS.strandzhanki},
    {name:"СВИНСКА СТРАНДЖАНКА",price:5.00,img:CAT_THUMBS.strandzhanki}
  ]},
  kartofi:{ title:"КАРТОФИ", items:[
    {name:"ПЪРЖЕНИ КАРТОФИ 200 ГРАМА",price:4.00,img:"snimki/produkti/КАРТОФИ/kartofi.jpg"},
    {name:"КАРТОФИ С ЧЕДЪР И БЕКОН",price:6.50,img:"snimki/produkti/КАРТОФИ/kartofisbekonichedur.jpg"},
    {name:"КАРТОФИ С ЧЕДЪР",price:5.00,img:"snimki/produkti/КАРТОФИ/kartofischedur.jpg"}
  ]},
  salati:{
    title:"САЛАТИ",
    items:[
      {name:"САЛАТА ЦЕЗАР",price:8.50,img:CAT_THUMBS.salati,
       desc:"Айсберг, чери домати, крутони, сос Цезар, пилешко филе, пармезан"}
    ]
  },
  portsii:{ title:"ПОРЦИИ", items:[
    {name:"ТЕЛЕШКА ПЛЕСКАВИЦА ПОРЦИЯ",price:11.50,img:"snimki/produkti/ПОРЦИИ/sharsko.jpg",
      desc:"Мляно телешко месо на скара, със свежи зеленчуци и пресни картофи. Без питка и без разядка. ~550 г."},
    {name:"КОНСКА ПЛЕСКАВИЦА ПОРЦИЯ",price:11.50,img:"snimki/produkti/ПОРЦИИ/sharsko.jpg",
      desc:"Прясно мляно конско на жар, със свежи зеленчуци и картофи. Без питка и без разядка. ~550 г."},
    {name:"ПИЛЕШКО ФИЛЕ ПОРЦИЯ",price:11.00,img:"snimki/produkti/ПОРЦИИ/pileshko.jpg",
      desc:"Прясно пилешко филе на жар с гарнитура пресни картофи и свежи зеленчуци. Без питка и без разядка. ~550 г."},
    {name:"СВИНСКО ФИЛЕ ПОРЦИЯ",price:11.00,img:"snimki/produkti/ПОРЦИИ/svinsko.jpg",
      desc:"Крехко свинско контра филе на жар с картофи и свежа гарнитура. Без питка и без разядка. ~550 г."},
    {name:"ТЕЛЕШКИ КЕБАПЧЕТА ПОРЦИЯ",price:9.50,img:"snimki/produkti/ПОРЦИИ/kebapche.jpg",
      desc:"Ароматни телешки кебапчета на жар с пресни картофи и салата. Без питка и без разядка. ~550 г."},
    {name:"ШАРСКА ПЛЕСКАВИЦА ПОРЦИЯ",price:12.50,img:"snimki/produkti/ПОРЦИИ/sharsko.jpg",
      desc:"Телешка плескавица с кашкавал, гарнирана с пресни картофи и зеленчуци. Без питка и без разядка. ~550 г."}
  ]},
  dobavki:{ title:"ДОБАВКИ", items:[
    {name:"СИРЕНЕ 100 ГРАМА",   price:1.50, img:"snimki/produkti/ДОБАВКИ/sirene100grama.png"},
    {name:"КАШКАВАЛ 100 ГРАМА", price:1.50, img:"snimki/produkti/ДОБАВКИ/kashkaval100grama.png"},
    {name:"РАЗЯТКА",            price:1.00, img:"snimki/produkti/ДОБАВКИ/razqtka.png"},
    {name:"МЕСО ДОБАВКА",       price:4.00, img:"snimki/produkti/ДОБАВКИ/meso.jpg"},
    {name:"ПИТКА",              price:1.50, img:"snimki/produkti/ДОБАВКИ/pitka2.jpg"}
  ]},
  sosove:{ title:"СОСОВЕ", items:[
    {name:"ДОМАШНА РАЗЯДКА 100ГР", price:1.50, img:CAT_THUMBS.sosove},
    {name:"ДОМАШНА МАЙОНЕЗА",     price:1.50, img:CAT_THUMBS.sosove},
    {name:"ЛЮТЕНИЦА",             price:1.50, img:CAT_THUMBS.sosove},
    {name:"КЕТЧУП",               price:1.00, img:CAT_THUMBS.sosove},
    {name:"ГОРЧИЦА",              price:1.00, img:CAT_THUMBS.sosove},
    {name:"СОС ЦЕЗАР",            price:1.50, img:CAT_THUMBS.sosove}
  ]},
  deserti:{ title:"ДЕСЕРТИ", items:[
    {name:"ЛЕК ДЕСЕРТ С ЧИЯ, МЮСЛИ И СУШЕНИ ПЛОДОВЕ",price:4.50,img:CAT_THUMBS.deserti},
    {name:"ЛЕК ДЕСЕРТ С ЧИЯ, МЮСЛИ И СЛАДКО ОТ БОРОВИНКИ",price:4.50,img:CAT_THUMBS.deserti}
  ]},
  bezalkoholni:{ title:"БЕЗАЛКОХОЛНИ", items:[
    {name:"КОЛА КЕН",price:2.00,img:CAT_THUMBS.bezalkoholni},
    {name:"ФАНТА ПОРТОКАЛ КЕН",price:2.00,img:CAT_THUMBS.bezalkoholni},
    {name:"КОКА КОЛА БУТИЛКА",price:2.50,img:CAT_THUMBS.bezalkoholni},
    {name:"ФАНТА ПОРТОКАЛ БУТИЛКА",price:2.50,img:CAT_THUMBS.bezalkoholni},
    {name:"СПРАЙТ БУТИЛКА",price:2.50,img:CAT_THUMBS.bezalkoholni},
    {name:"СТУДЕН ЧАЙ",price:2.50,img:CAT_THUMBS.bezalkoholni},
    {name:"КАПИ ПЪЛПИ",price:2.50,img:CAT_THUMBS.bezalkoholni},
    {name:"КАПИ КУТИЯ",price:1.70,img:CAT_THUMBS.bezalkoholni},
    {name:"СОДА БУТИЛКА",price:1.90,img:CAT_THUMBS.bezalkoholni},
    {name:"МАЛКА МИНЕРАЛНА ВОДА",price:1.50,img:CAT_THUMBS.bezalkoholni},
    {name:"ГОЛЯМА МИНЕРАЛНА ВОДА",price:2.00,img:CAT_THUMBS.bezalkoholni},
    {name:"КАПИ ЛИМОНАДА",price:2.50,img:CAT_THUMBS.bezalkoholni},
    {name:"ТОНИК БУТИЛКА",price:1.90,img:CAT_THUMBS.bezalkoholni}
  ]},
  bira:{ title:"БИРА", items:[
    {name:"БИРА КОРОНА",price:3.50,img:CAT_THUMBS.bira},
    {name:"ХАЙНИКЕН",price:4.00,img:CAT_THUMBS.bira},
    {name:"СТЕЛА АРТОА",price:4.50,img:CAT_THUMBS.bira}
  ]},
  hell:{
    title:"HELL",
    view:"gallery",
    hellPrice:2.00,
    groups:[
      { heading:"HELL -250мл", images:[
          "snimki/hell_sminki/normal/hell_apple.jpg",
          "snimki/hell_sminki/normal/hell_clasic.jpg",
          "snimki/hell_sminki/normal/hell_classic.jpg",
          "snimki/hell_sminki/normal/hell_redgrape.jpg",
          "snimki/hell_sminki/normal/hell_watermelon.jpg"
      ]},
      { heading:"ICE COFFE HELL -250 мл", images:[
          "snimki/hell_sminki/ice_coffe/ice_coffe_capochino.png",
          "snimki/hell_sminki/ice_coffe/ice_coffe_caramel.png",
          "snimki/hell_sminki/ice_coffe/ice_coffe_coconut.png",
          "snimki/hell_sminki/ice_coffe/ice_coffe_doubleespresso.png",
          "snimki/hell_sminki/ice_coffe/ice_coffe_late.png",
          "snimki/hell_sminki/ice_coffe/ice_coffe_pinklatte.png",
          "snimki/hell_sminki/ice_coffe/ice_coffe_vanilia.png",
          "snimki/hell_sminki/ice_hell_distachio.png"
      ]}
    ]
  },
  voda:{
    title:"ВОДА",
    view:"water2",
    groups:[
      { heading:"Devin", pair:[
          {src:"snimki/produkti/ВОДА/golqma_devin.jpg", label:"Голяма Девин -1,5Л", price:2.00},
          {src:"snimki/produkti/ВОДА/malka_devin.jpg", label:"Малка Девин -500мл",  price:1.50}
      ]},
      { heading:"Банкя", pair:[
          {src:"snimki/produkti/ВОДА/golqma_bankq.jpg", label:"Голяма Банкя -1,5Л", price:2.00},
          {src:"snimki/produkti/ВОДА/malka_bankq.jpg", label:"Малка Банкя -500мл",  price:1.50}
      ]}
    ]
  },
  gazirana_voda:{
    title:"ГАЗИРАНА ВОДА",
    view:"water2",
    groups:[
      { heading:"Марки", pair:[
          {src:"snimki/produkti/ГАЗИРАНА_ВОДА/shveps.jpg",  label:"Schweppes -500мл", price:1.90},
          {src:"snimki/produkti/ГАЗИРАНА_ВОДА/sprait.jpg",  label:"Sprite -500мл",    price:1.90}
      ]}
    ]
  },
  fanta:{
    title:"ФАНТА",
    items:[
      {name:"Фанта Портокал -330мл",      price:2.00, img:"snimki/produkti/ФАНТА/fanta_portokal.jpg"},
      {name:"Фанта Лимон -330мл",         price:2.00, img:"snimki/produkti/ФАНТА/fanta_lemon.jpg"},
      {name:"Фанта Лайчи -330мл",         price:2.00, img:"snimki/produkti/ФАНТА/fanta_laici.jpg"},
      {name:"Фанта Tutti Frutti -330мл",  price:2.00, img:"snimki/produkti/ФАНТА/fanta_tutti.jpg"},
      {name:"Фанта Зелена ябълка 330мл", price:2.00, img:"snimki/produkti/ФАНТА/fanta_greenapple.jpg"},
      {name:"Фанта Боровинка -330мл",     price:2.00, img:"snimki/produkti/ФАНТА/sinq_blueberry.jpg"}
    ]
  },
  studen_chai:{
    title:"СТУДЕН ЧАЙ",
    items:[
      { name:"Fuze Tea Горски плод -500мл", price:2.50, img:"snimki/produkti/СТУДЕН_ЧАЙ/fuze_tea_forest_frut.jpg" },
      { name:"Fuze Tea Праскова -500мл",    price:2.50, img:"snimki/produkti/СТУДЕН_ЧАЙ/fuze_tea_praskova.jpg" }
    ]
  },
  kola:{
    title:"КОЛА",
    items:[
      {name:"Кола Кен -330мл",        price:2.00, img:"snimki/produkti/КОЛА/kolaken.jpg"},
      {name:"Кола Кен Zero -330мл",   price:2.00, img:"snimki/produkti/КОЛА/kolakenzero.jpg"},
      {name:"Кола ПВЦ -500мл",        price:2.50, img:"snimki/produkti/КОЛА/kolapvc.jpg"},
      {name:"Кола ПВЦ Zero -500мл",   price:2.50, img:"snimki/produkti/КОЛА/kolapvczero.jpg"}
    ]
  },
  sok:{
    title:"СОК",
    items:[
      {name:"Cappy Портокал -500мл", price:2.50, img:"snimki/produkti/СОК/cappy_orange.jpg"},
      {name:"Cappy Лимон -500мл",    price:2.50, img:"snimki/produkti/СОК/cappy_lemon.jpg"}
    ]
  },
  airqn:{
    title:"АЙРЯН",
    groups:[
      { heading:"Верея", items:[
          {name:"Айрян Верея Голям -480мл", price:2.00, img:"snimki/produkti/АЙРАН/airan_vereq_golqm.jpg"},
          {name:"Айрян Верея Малък -300мл", price:1.50, img:"snimki/produkti/АЙРАН/airan_vereq_maluk.jpg"}
      ]},
      { heading:"Meggle", items:[
          {name:"Голям Айрян Meggle Бутилка 500 мл", price:2.80, img:"snimki/produkti/АЙРАН/megle_airan_butilka.jpg"},
          {name:"Айрян Meggle Кофичка -300мл",    price:2.00, img:"snimki/produkti/АЙРАН/megle_airan_kofa.jpg"},
          {name:"Айрян Meggle Плодов Кофичка -330мл",  price:3.00, img:"snimki/produkti/АЙРАН/mwgle_airan_plodov.jpg"}
      ]}
    ]
  },
  xixo:{
    title:"XIXO",
    items:[
      {name:"XIXO Cola -250мл",               price:1.10, img:"snimki/produkti/ХИХО/xixo_cola.jpg"},
      {name:"XIXO Cherry Cola -250мл",        price:1.10, img:"snimki/produkti/ХИХО/xixo_cherry_cola.jpg"},
      {name:"XIXO Диня -250мл",               price:1.10, img:"snimki/produkti/ХИХО/xixo_dinq.jpg"},
      {name:"XIXO Горски плод -250мл",        price:1.10, img:"snimki/produkti/ХИХО/xixo_gorski_plod.jpg"},
      {name:"XIXO Green Fusion -250мл",       price:1.10, img:"snimki/produkti/ХИХО/xixo_green_fusion.jpg"},
      {name:"XIXO Круша -250мл",              price:1.10, img:"snimki/produkti/ХИХО/xixo_krusha.jpg"},
      {name:"XIXO Лимон -250мл",              price:1.10, img:"snimki/produkti/ХИХО/xixo_limon.jpg"},
      {name:"XIXO Манго и ананас -250мл",     price:1.10, img:"snimki/produkti/ХИХО/xixo_mango_and_pineapple.jpg"},
      {name:"XIXO Розова лимонада -250мл",    price:1.10, img:"snimki/produkti/ХИХО/xixo_pink_lemonade.jpg"},
      {name:"XIXO Праскова -250мл",           price:1.10, img:"snimki/produkti/ХИХО/xixo_praskova.jpg"},
      {name:"XIXO Ягода",                      price:1.10, img:"snimki/produkti/ХИХО/xixo_qgoda.jpg"},
      {name:"XIXO Tutti Frutti -250мл",       price:1.10, img:"snimki/produkti/ХИХО/xixo_tuti_fruity.jpg"}
    ]
  }
};


const BASE_CATALOG = typeof structuredClone === "function"
  ? structuredClone(CATALOG)
  : JSON.parse(JSON.stringify(CATALOG));


/* Подредба на категориите */
const ORDER = [
  "promocii",
  "burgeri","palachinki","strandzhanki","kartofi","salati","portsii","dobavki",
  "hell","voda","gazirana_voda","fanta","studen_chai","kola"
];


/* =====================================================
   ☁️ Зареждане от облака (Upstash Redis) + fallback
   ===================================================== */
(async function loadFromCloud(){
  try {
    const r = await fetch("/api/catalog", { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();

    if (data && typeof data === "object") {
      if (data.CATALOG)    Object.assign(CATALOG, data.CATALOG);
      if (Array.isArray(data.ORDER)) { ORDER.length = 0; ORDER.push(...data.ORDER); }
      if (data.ADDONS)     Object.assign(ADDONS, data.ADDONS);
      if (data.cat_thumbs) Object.assign(CAT_THUMBS, data.cat_thumbs);
      console.log("✅ Данните са заредени от облака.");
    }
  } catch (e) {
    console.warn("☁️ Облакът е недостъпен, зареждам от localStorage:", e);
    try {
      const raw = localStorage.getItem("BBQ_MAIN_CATALOG");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.CATALOG)    Object.assign(CATALOG, data.CATALOG);
      if (Array.isArray(data.ORDER)) { ORDER.length = 0; ORDER.push(...data.ORDER); }
      if (data.ADDONS)     Object.assign(ADDONS, data.ADDONS);
      if (data.cat_thumbs) Object.assign(CAT_THUMBS, data.cat_thumbs);
      console.log("✅ Заредено локално копие (offline fallback).");
    } catch (e2) {
      console.warn("⚠️ Local fallback също неуспешен:", e2);
    }
  }
})();

function ensureShape(key, shape){
  const c = CATALOG[key] || {};
  if (shape === "water2") {
    if (c.view !== "water2" || !Array.isArray(c.groups)) CATALOG[key] = BASE_CATALOG[key];
  } else if (shape === "gallery") {
    if (c.view !== "gallery" || !Array.isArray(c.groups)) CATALOG[key] = BASE_CATALOG[key];
  } else if (shape === "groups") {
    if (!Array.isArray(c.groups)) CATALOG[key] = BASE_CATALOG[key];
  }
}
ensureShape("voda","water2");
ensureShape("gazirana_voda","water2");
ensureShape("hell","gallery");
ensureShape("palachinki","groups");



const sidebar = document.getElementById("sidebar");
const grid    = document.getElementById("productGrid");
const titleEl = document.getElementById("catTitle");

function showPromosIframe(show){
  // винаги махаме/слагаме класа САМО тук
  if (show) {
    document.body.classList.add('is-promos');
  } else {
    document.body.classList.remove('is-promos');
  }

  // ако имаш контейнер за промо секцията – покажи/скрий го
  const sec = document.getElementById('promosSection');
  if (sec) sec.style.display = show ? 'block' : 'none';

  // fail-safe: когато НЕ сме в промо изглед,
  // увери се, че критичните бутони/елементи са видими
  if (!show) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = ''; // reset
    const cartOverlay = document.getElementById('cartOverlay');
    const cartBtn = document.getElementById('cartBtn');
    if (cartOverlay) cartOverlay.style.display = 'none';
    if (cartBtn)      cartBtn.setAttribute('aria-expanded','false');
  }
}



/* Делегиран клик за „Всичко“ (veg/sauce) — стабилно за desktop и mobile */
if (grid){
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("button.btn-all");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const group = btn.dataset.target;            // "veg" или "sauce"
    const card  = btn.closest(".product");       // цялата карта
    if (!group || !card) return;

    const boxes = Array.from(card.querySelectorAll(`input.addon-checkbox[data-group="${group}"]`));
    if (!boxes.length) return;

    const shouldCheck = !boxes.every(b => b.checked); // ако не са всички чекнати → чекваме всички
    for (const b of boxes) {
      b.checked = shouldCheck;
      b.dispatchEvent(new Event("change", { bubbles: true })); // подсигури логика по change
    }
  });
}


/* Сайдбар рендер */
if (sidebar){
  sidebar.innerHTML = ORDER.map(key=>{
    const label = (key === "promocii") ? "ПРОМОЦИИ" : (CATALOG[key].title);
    const img   = CAT_THUMBS[key];
    return `<a class="cat" data-cat="${key}" role="link" tabindex="0" aria-label="${esc(label)}">
              <div class="box" style="background-image:url('${img}')" data-label="${esc(label)}"></div>
            </a>`;
  }).join("");
}

/* pretty label за HELL */
function prettyLabel(src){
  let f = src.split("/").pop().split(".")[0].toLowerCase();
  f = f.replace(/^hell_/,"").replace(/^ice_coffe_/,"").replace(/^ice_hell_/,"");
  const map = {
    apple:"Apple", clasic:"Classic", classic:"Black Cherry",
    redgrape:"Red Grape", watermelon:"Watermelon",
    capochino:"Cappuccino", cappuccino:"Cappuccino", caramel:"Salted Caramel",
    coconut:"Coconut", doubleespresso:"Double Espresso", doublespresso:"Double Espresso",
    late:"Latte", latte:"Latte", pinklatte:"Pink Latte",
    vanilia:"Vanilla", vanilla:"Vanilla", distachio:"Pistachio", pistachio:"Pistachio",
    slimvanilla:"Vanilla"
  };
  if (map[f]) return map[f];
  return f.replace(/[_-]+/g," ").replace(/\b\w/g, m=>m.toUpperCase());
}

const catHasAddons = (cat) => (cat === "portsii" || cat === "burgeri" || cat === "strandzhanki");

/* === РЕНДЕР НА ПРОДУКТ === */
function productCardHTML(it, i, withAddons = false) {
  const desc = it.desc ? `<p class="desc">${esc(it.desc)}</p>` : "";

  const pricePlusRow = `
    <div class="price-plus">
      <div class="price-badge">
        <div class="lv">${fmtLv(it.price)}</div>
        <div class="eur">${fmtEur(it.price)}</div>
      </div>
      <button class="add-btn"
        data-name="${(it.name || "").replace(/"/g,"&quot;")}"
        data-price="${it.price}"
        data-img="${it.img}">+</button>
    </div>
  `;

  const mobileTitle = `<h3 class="mobile-title">${esc(it.name)}</h3>`;

  // --- десен блок с добавки + единствен "+" до цената ---
  let addonsBlock = "";
  let wholeAddonsBlock = "";

  if (withAddons) {
    if (current === "burgeri") {
      const isPulled = /ДЪРПАНО/i.test(it.name || "");
      const vegList = isPulled
        ? [
            { c:"cheddar", t:"Течен чедър" },
            { c:"bbq",     t:"Барбекю сос" },
            { c:"car_on",  t:"Карамелизиран лук" },
            { c:"pickles", t:"Кисели краставички" },
            { c:"mayo_h",  t:"Домашна майонеза" },
            { c:"fries",   t:"Картофки" }
          ]
        : [
            { c:"tomato",   t:"Домат" },
            { c:"fries",    t:"Пресни картофки" },
            { c:"onion",    t:"Червен лук" },
            { c:"iceberg",  t:"Айсберг" },
            { c:"razyadka", t:"Разядка" }
          ];

      const sauces = [
        { c:"ketchup", t:"Кетчуп" },
        { c:"mayo",    t:"Майонеза" },
        { c:"mustard", t:"Горчица" },
        { c:"chili",   t:"Люто" }
      ];

      addonsBlock = `
        <div class="addons">
          <div class="hdr">
            Изберете с какво да бъде
            <button type="button" class="btn-all" data-target="veg">Всичко</button>
          </div>
          ${vegList.map(x => `
            <label>
              <input type="checkbox" class="addon-checkbox" data-group="veg" data-code="${x.c}" data-price="0"> ${x.t}
            </label>
          `).join("")}
        </div>

        <div class="addons">
          <div class="hdr">
            Сосове
            <button type="button" class="btn-all" data-target="sauce">Всичко</button>
          </div>
          ${sauces.map(x => `
            <label>
              <input type="checkbox" class="addon-checkbox" data-group="sauce" data-code="${x.c}" data-price="0"> ${x.t}
            </label>
          `).join("")}
        </div>
      `;
    } else if (current === "portsii") {
      // платени добавки – в дясната колона, без втори "+" бутон
      wholeAddonsBlock = `
        <div class="addons">
          <div class="hdr">Добавки</div>
          <label><input type="checkbox" class="addon-checkbox" data-code="pitka" data-price="1.5"> + Питка</label>
          <label><input type="checkbox" class="addon-checkbox" data-code="raz"   data-price="1.5"> + Разядка 100 гр</label>
        </div>
      `;
    } else if (current === "strandzhanki") {
      // сосове – в дясната колона, без втори "+" бутон
      wholeAddonsBlock = `
        <div class="addons">
          <div class="hdr">
            Сосове
            <button type="button" class="btn-all" data-target="sauce">Всичко</button>
          </div>
          <label><input type="checkbox" class="addon-checkbox" data-group="sauce" data-code="ketchup" data-price="0"> Кетчуп</label>
          <label><input type="checkbox" class="addon-checkbox" data-group="sauce" data-code="mayo"    data-price="0"> Майонеза</label>
          <label><input type="checkbox" class="addon-checkbox" data-group="sauce" data-code="mustard" data-price="0"> Горчица</label>
          <label><input type="checkbox" class="addon-checkbox" data-group="sauce" data-code="chili"   data-price="0"> Люто</label>
        </div>
      `;
    }
  }

  return `
    <article class="product ${i % 2 ? "even" : ""}">
      <div class="leftcol">
        <div class="photo" style="background-image:url('${it.img}')"></div>
      </div>

      <div class="pad">
        <h3 class="title">${esc(it.name)}</h3>
        ${desc}

        ${ current === "burgeri" ? addonsBlock : (wholeAddonsBlock || "") }

        ${pricePlusRow}
      </div>
    </article>`;
}


// 🚗 "Достави" → Google Maps навигация (origin = моето местоположение, dest = адрес от поръчката)
function getPosition(opts = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('no-geo'));
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button.btn[data-action="maps"]');
  if (!btn) return;

  // 1) Дестинация (адрес на клиента)
  let destination = (btn.dataset.address || localStorage.getItem('bbq_last_address') || '').trim();
  if (!destination) { alert('Няма адрес за доставка.'); return; }

  // 2) Origin: GPS → My Location → (по избор) фиксиран адрес
  let originParam = '';
  try {
    const pos = await getPosition();
    originParam = `&origin=${pos.coords.latitude},${pos.coords.longitude}`;
  } catch {
    // ако няма HTTPS/разрешение
    originParam = `&origin=My+Location`;
    // ако искаш винаги от обекта, разкоментирай реда отдолу и махни горния:
    // originParam = `&origin=${encodeURIComponent('Corner BBQ, Хасково')}`;
  }

  // 3) URL за навигация
  const url = 'https://www.google.com/maps/dir/?api=1'
            + originParam
            + '&destination=' + encodeURIComponent(destination)
            + '&travelmode=driving'
            + '&dir_action=navigate';

  // 4) Отваряне (на мобилно – директно в текущия таб)
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    // iOS/Android – опитай app, после web
    // window.location.href = `comgooglemaps://?daddr=${encodeURIComponent(destination)}&directionsmode=driving`;
    // setTimeout(() => { window.location.href = url; }, 300); // fallback към web
    window.location.href = url; // прост и стабилен вариант
  } else {
    window.open(url, '_blank', 'noopener');
  }
});

/* --- Увеличаване при двоен клик (desktop) --- */
document.addEventListener("dblclick", e => {
  const imgEl = e.target.closest(".photo");
  if (!imgEl) return;
  const alreadyZoomed = imgEl.classList.contains("zoomed");
  document.querySelectorAll(".photo.zoomed").forEach(el => el.classList.remove("zoomed"));
  if (alreadyZoomed) {
    document.body.style.overflow = "";
  } else {
    imgEl.classList.add("zoomed");
    document.body.style.overflow = "hidden";
  }
});

/* --- Double-tap за мобилни --- */
document.addEventListener("touchend", (e) => {
  const imgEl = e.target.closest(".photo");
  if (!imgEl) return;
  const now = Date.now();
  const last = imgEl._lastTap || 0;
  if (now - last < 280) {
    const already = imgEl.classList.contains("zoomed");
    document.querySelectorAll(".photo.zoomed").forEach(el => el.classList.remove("zoomed"));
    if (!already) {
      imgEl.classList.add("zoomed");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    imgEl._lastTap = 0;
  } else {
    imgEl._lastTap = now;
  }
}, { passive: true });

/* помощник за изреченията при бележката */
function groupPhrase(card, group, kind){
  if (!card) return "";
  const all = [...card.querySelectorAll(`.addon-checkbox[data-group="${group}"]`)];
  if (!all.length) return "";

  const labelOf = (b) => (b.closest("label")?.textContent || "")
                          .trim()
                          .replace(/^\+\s*/, "");

  const allNames = all.map(labelOf);
  const sel      = all.filter(b => b.checked);
  const selNames = sel.map(labelOf);

  if (sel.length === all.length && sel.length > 0) {
    return kind === "veg" ? "с всичко" : "всички сосове";
  }
  if (sel.length > 0) {
    const missing = allNames.filter(n => !selNames.includes(n));
    const base = kind === "veg" ? "всичко без — " : "всички сосове без — ";
    return base + (missing.length ? missing.join(", ") : "(нищо)");
  }
  return "";
}

/* Добавяне – слушатели за стандартните продукти */
function bindAddButtons(){
  if (!grid) return;
  grid.querySelectorAll(".add-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const card = btn.closest(".product, .tile, .water-card");

      const baseName  = btn.getAttribute("data-name")?.trim();
      const basePrice = Number(btn.getAttribute("data-price"));
      const img       = btn.getAttribute("data-img") || "";

      if (!baseName || !(basePrice >= 0)) {
        // няма валидни данни – игнорираме
        return;
      }

      const checks = card ? [...card.querySelectorAll(".addon-checkbox:checked")] : [];
      const addons = checks.map(ch => {
        const code  = ch.getAttribute("data-code");
        const def   = ADDONS[code] || {};
        const price = Number(ch.getAttribute("data-price")) || def.price || 0;
        const labelFromDOM = (ch.closest("label")?.textContent || "").trim();
        const labelClean = (labelFromDOM || def.label || "Добавка").replace(/^\+\s*/, "");
        return { code, label: labelClean, price };
      });

      const addonsTotal = addons.reduce((s,a)=>s+a.price,0);
      const fullPrice   = basePrice + addonsTotal;

      const nameWithAddons = addons.length
        ? `${baseName} (+ ${addons.map(a=>a.label).join(", ")})`
        : baseName;

      addToCart({
        _id: Date.now()+""+Math.random(),
        name: nameWithAddons,
        baseName,
        price: fullPrice,
        basePrice,
        addons,
        img
      });

      const vegLine   = card ? groupPhrase(card, "veg",   "veg")   : "";
      const sauceLine = card ? groupPhrase(card, "sauce", "sauce") : "";
      const parts = [vegLine, sauceLine].filter(Boolean);
      if (parts.length && orderNoteEl) {
        const line = `${baseName}: ${parts.join("; ")}`;
        const cur  = (orderNoteEl.value || "").trim();
        orderNoteEl.value = cur ? (cur + "\n" + line) : line;
        localStorage.setItem(LS_ORDER_NOTE, orderNoteEl.value);
      }

      const was = btn.textContent;
      btn.textContent = "✓";
      setTimeout(()=> btn.textContent = was || "+", 450);

      checks.forEach(ch => ch.checked = false);
    });
  });
}


function onPromoMessage(e){
  const d = e?.data || {};
  if (d.type !== "bbq:addPromo") return;

  // Поддръжка на НОВ формат: {name, price, img, items}
  if (d.name || d.items) {
    const displayName = String(d.name || "Промо пакет").trim();
    const price = Number(d.price || 0);
    const img   = d.img || d.image || "";

    // Записваме вложените продукти като "addons" (само за инфо)
    const addons = Array.isArray(d.items)
      ? d.items.map(x => ({ code: x.name || "", label: x.name || "", price: 0 }))
      : [];

    addToCart({
      _id: Date.now() + "" + Math.random(),
      name: displayName,
      baseName: displayName,
      price, basePrice: price,
      img, addons
    });

    if (orderNoteEl){
      const line = `${displayName} (${fmtLv(price)} / ${fmtEur(price)})`;
      const cur  = (orderNoteEl.value || "").trim();
      orderNoteEl.value = cur ? (cur + "\n" + line) : line;
      localStorage.setItem(LS_ORDER_NOTE, orderNoteEl.value);
    }
    return;
  }

  // Поддръжка на СТАР формат: {a:{name,img}, b:{name,img}, price, hero}
  const aName = d.a?.name?.trim() || "A";
  const bName = d.b?.name?.trim() || "B";
  const displayName = (d.name && String(d.name).trim()) || `ПРОМО: ${aName} + ${bName}`;
  const price = Number(d.price || 0);
  const img   = d.hero || d.a?.img || d.b?.img || "";
  const itemsLine = `${aName} + ${bName}`;

  addToCart({
    _id: Date.now() + "" + Math.random(),
    name: displayName,
    baseName: displayName,
    price, basePrice: price,
    img,
    addons: [{ code: "promo", label: itemsLine, price: 0 }]
  });

  if (orderNoteEl){
    const line = `${displayName} (${fmtLv(price)} / ${fmtEur(price)})`;
    const cur  = (orderNoteEl.value || "").trim();
    orderNoteEl.value = cur ? (cur + "\n" + line) : line;
    localStorage.setItem(LS_ORDER_NOTE, orderNoteEl.value);
  }
}



/* === Приемане на ПРОМО елементи от index7 чрез postMessage (ако ползваш iframe) === */
window.addEventListener("message", onPromoMessage, false);


const KEY_ALIAS = { sandvichi: "burgeri" };


/* ===== Активиране на категория + рендер ===== */
let current = null;

function activate(cat, {fromNav=false, replace=false} = {}){
    const realCat = KEY_ALIAS[cat] || cat;
  /* 🧡 ПРОМОЦИИ — ако ползваш iframe промо страница */
if (cat === "promocii") {
  current = "promocii";
  showPromosIframe(true);

  if (sidebar){
    sidebar.querySelectorAll(".cat")
      .forEach(c => c.classList.toggle("active", c.dataset.cat === "promocii"));
  }

  const url = new URL(location.href);
  if (url.searchParams.get("cat") !== "promocii") {
    url.searchParams.set("cat", "promocii");
    if (replace) history.replaceState({ cat: "promocii" }, "", url);
    else if (fromNav) history.pushState({ cat: "promocii" }, "", url);
  }

  if (titleEl) titleEl.textContent = "ПРОМОЦИИ";

  if (grid) grid.innerHTML = "";



if (new URLSearchParams(location.search).get("mode") === "moderator") {
  setTimeout(() => {
    window.enableInlineEditing?.();
    window.enableProductDnd?.();
    window.injectDeleteButtons?.();
    window.fixEditLayers?.();
    window.ensurePlusRightUniversal?.();
    window.ensureMobilePlusRight?.();
  }, 0);
}

  recalcMobileOffsets();
  ensurePlusRightUniversal();
  return;
}


  // === останалите категории

  showPromosIframe(false);
  const exists = !!CATALOG[realCat];
  if (!exists) cat = realCat = "burgeri";

  current = realCat;

  if (sidebar){
    sidebar.querySelectorAll(".cat")
      .forEach(c => c.classList.toggle("active", c.dataset.cat === realCat));
  }
  if (titleEl) titleEl.textContent = CATALOG[realCat]?.title || realCat.toUpperCase();

  const url2 = new URL(location.href);
  if (url2.searchParams.get("cat") !== cat) {
    url2.searchParams.set("cat", cat); // пазим оригиналния, за да може да стои ?cat=sandvichi
    if (replace) history.replaceState({cat}, "", url2);
    else if (fromNav) history.pushState({cat}, "", url2);
  }

  const data = CATALOG[cat];
  if (!grid) return;

  // 🧩 Fallback: ако категорията няма items, вземи burgeri (за да работи редакторът)
  if (!data || !Array.isArray(data.items)) {
    const alias = { strandjanki: "burgeri", sandvichi: "burgeri" };
    const fallback = alias[cat];
    if (fallback && CATALOG[fallback]) {
      current = fallback;
      activate(fallback, { fromNav, replace });
      return;
    }
  }

  if (data.view === "water2") {
    grid.innerHTML = `
      <div class="water-wrapper">
        ${data.groups.map(g=>`
          <section class="water-block">
            <h2>${g.heading}</h2>
            <div class="water-grid">
              ${g.pair.map(p=>`
                <div class="water-card">
                  <img src="${p.src}" alt="${esc(p.label)}">
                  <div class="water-name">${esc(p.label)}</div>
                  ${typeof p.price === "number" ? `
                    <div class="price-badge">
                      <div class="lv">${fmtLv(p.price)}</div>
                      <div class="eur">${fmtEur(p.price)}</div>
                    </div>
                    <button class="add-btn" data-name="${p.label.replace(/"/g,"&quot;")}" data-price="${p.price}" data-img="${p.src}">+</button>
                  ` : ``}
                </div>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    `;
    bindAddButtons();
    recalcMobileOffsets();
    ensurePlusRightUniversal();
    return;
  }

  if (data.view === "gallery") {
    const hellPrice = data.hellPrice ?? 2.00;
    grid.innerHTML = data.groups.map(group=>{
      const pics = group.images.map(src=>{
        const label = esc(prettyLabel(src));
        return `
        <div>
          <div class="tile">
            <img src="${src}" alt="${label}">
            <div class="price-badge">
              <div class="lv">${fmtLv(hellPrice)}</div>
              <div class="eur">${fmtEur(hellPrice)}</div>
            </div>
            <button class="add-btn" data-name="${label.replace(/"/g,"&quot;")}" data-price="${hellPrice}" data-img="${src}">+</button>
          </div>
          <div class="caption">${label}</div>
        </div>`;
      }).join("");
      return `
        <h2 class="sec-title">${esc(group.heading)}</h2>
        <div class="gallery">${pics}</div>
      `;
    }).join("");
    bindAddButtons();
    recalcMobileOffsets();
    ensureMobilePlusRight();
    return;
  }

  if (data.groups && Array.isArray(data.groups)) {
    const groupsHTML = data.groups.map(group => `
      <h2 class="sec-title">${esc(group.heading)}</h2>
      <div class="grid-products">
       ${group.items?.map((it,i)=> productCardHTML(it,i, catHasAddons(current))).join("")}
      </div>
    `).join("");
    grid.innerHTML = groupsHTML;
    bindAddButtons();
    recalcMobileOffsets();
    ensureMobilePlusRight();
    return;
  }

  const items = (data?.items)||[];
  if (items.length === 0) {
    grid.innerHTML = `<p style="padding:16px;font-weight:700">Няма продукти в тази категория.</p>`;
    recalcMobileOffsets();
    return;
  }
  grid.innerHTML = `
    <div class="grid-products">
      ${items.map((it,i)=> productCardHTML(it,i, catHasAddons(current))).join("")}
    </div>
  `;
  bindAddButtons();
  recalcMobileOffsets();
  ensureMobilePlusRight();
}

/* ===== Инициализация ===== */
function shouldBypassDelay(evt){ return evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey || evt.button === 1; }
const POP_DELAY = 100;
function popThenActivate(el, key){
  if (!el) return activate(key, {fromNav:true});
  el.classList.remove("is-pressed"); el.classList.add("is-popping"); el.dataset.locked = "1";
  setTimeout(()=>{ activate(key, {fromNav:true}); el.classList.remove("is-popping"); delete el.dataset.locked; }, POP_DELAY);
}
function initFromURL(){
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat") || "burgeri";
  activate(cat, {replace:true});
}

restoreCartFromLS();
restoreOrderNote?.();
initFromURL();

if (sidebar){
  sidebar.querySelectorAll(".cat").forEach(catEl=>{
    const key = catEl.dataset.cat;
    catEl.addEventListener("click", (e)=>{
      if (shouldBypassDelay(e)) return;
      e.preventDefault();
      if (catEl.dataset.locked==="1" || key===current) return;
      popThenActivate(catEl, key);
    });
  });
}
























/* ===========================
   🟠 MODERATOR MODE (ULTRA PRO)
   =========================== */
document.addEventListener("DOMContentLoaded", () => {

    
      /* =====================================================
     🟠 Persistent MODERATOR MODE (запазва се след рефреш)
     ===================================================== */
  const LS_MODE_FLAG = "bbq_mode_flag";
  const urlParams = new URLSearchParams(window.location.search);
  let isModerator = false;

  // 1️⃣ Проверяваме дали вече има записан режим
  if (localStorage.getItem(LS_MODE_FLAG) === "true") {
    isModerator = true;

    // Ако URL няма параметър — добавяме го (за стабилност)
    if (!urlParams.get("mode")) {
      urlParams.set("mode", "moderator");
      const newUrl = `${location.pathname}?${urlParams.toString()}`;
      history.replaceState({}, "", newUrl);
    }
  }

  // 2️⃣ Ако има параметър в URL — влизаме в модератор режим
  if (urlParams.get("mode") === "moderator") {
    isModerator = true;
    localStorage.setItem(LS_MODE_FLAG, "true");
  }

  // 3️⃣ Ако не сме в модератор режим — изтриваме записа
  if (!isModerator) {
    localStorage.removeItem(LS_MODE_FLAG);
  }


// >>> LOAD ONLY IN MOD MODE — START
if (isModerator) {
  // Чернови (CATALOG/ORDER) — ако ги има
  const savedCatalog = localStorage.getItem("CATALOG");
  const savedOrder   = localStorage.getItem("ORDER");
  if (savedCatalog) Object.assign(CATALOG, JSON.parse(savedCatalog));
  if (savedOrder) { ORDER.length = 0; ORDER.push(...JSON.parse(savedOrder)); }

  // Перманентен снапшот (BBQ_MAIN_CATALOG)
  const savedMainData = localStorage.getItem("BBQ_MAIN_CATALOG");
  if (savedMainData) {
    try {
      const data = JSON.parse(savedMainData);
      if (data.CATALOG)     Object.assign(CATALOG, data.CATALOG);
      if (Array.isArray(data.ORDER)) { ORDER.length = 0; ORDER.push(...data.ORDER); }
      if (data.cat_thumbs)  Object.assign(CAT_THUMBS, data.cat_thumbs);
      if (data.ADDON_LABELS) ADDON_LABELS = data.ADDON_LABELS;
      if (data.ADDONS)      Object.assign(ADDONS, data.ADDONS);
    } catch(e){ console.warn("MAIN load error:", e); }
  }
}
// >>> LOAD ONLY IN MOD MODE — END


  // 4️⃣ Функция за изход
  const exitModeratorMode = () => {
    localStorage.removeItem(LS_MODE_FLAG);
    urlParams.delete("mode");
    const newUrl = `${location.pathname}`;
    history.replaceState({}, "", newUrl);
    location.reload();
  };

// Възстановяване на CATALOG/ORDER от localStorage при зареждане
// ❗ СЕГА: само в модератор режим
if (isModerator) {
  const savedCatalog = localStorage.getItem("CATALOG");
  const savedOrder   = localStorage.getItem("ORDER");
  if (savedCatalog) Object.assign(CATALOG, JSON.parse(savedCatalog));
  if (savedOrder) {
    ORDER.length = 0;
    ORDER.push(...JSON.parse(savedOrder));
  }
}


  // Ако не сме в модератор режим — прекратяваме
  if (!isModerator) return;


  /* ===== Settings ===== */
  const MOD_PASSWORD     = "0000"; // <— СМЕНИ МЕ
  const LS_MOD_DATA      = "bbq_mod_data_v3";     // Save (перманентно)
  const LS_MOD_DRAFT     = "bbq_mod_draft_v3";    // Autosave чернова
  const LS_MOD_TRASH     = "bbq_mod_trash_v2";    // Кошче
  const DEFAULT_CAT_THUMB= "snimki/produkti/1menu/default.jpg";

  /* ===== Utils ===== */
  const save = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const read = (k,d=null)=>{try{return JSON.parse(localStorage.getItem(k)||"null")??d;}catch{return d;}};
  const esc  = s=>String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]));
  const lvParse  = t => { const n=String(t||"").replace(/\s*лв\.?\s*$/i,"").replace(",","."); const v=parseFloat(n); return isFinite(v)?v:0; };
  const lvFormat = n => (Number(n)||0).toFixed(2).replace(".",",")+" лв.";
  const askPass  = (msg="Парола") => prompt(msg,"") === MOD_PASSWORD;
  const toast = (m="Готово")=>{
    const d=document.createElement("div");
    d.textContent=m; Object.assign(d.style,{
      position:"fixed",left:"50%",transform:"translateX(-50%)",bottom:"22px",
      background:"#111",color:"#fff",padding:"10px 14px",borderRadius:"12px",
      zIndex:"99999",fontWeight:"800",boxShadow:"0 8px 28px rgba(0,0,0,.35)",opacity:"0",transition:"opacity .15s"
    }); document.body.appendChild(d); requestAnimationFrame(()=>d.style.opacity="1");
    setTimeout(()=>{d.style.opacity="0"; setTimeout(()=>d.remove(),180)},1300);
  };

  /* ===== Addons editor memory (пер-категория) =====
     { addons_labels: { burgeri: { veg:[..], sauce:[..] }, strandzhanki:{...}, portsii:{ paid:[ {code,label,price}, ... ] } } }
  */
  const getMemory = ()=>read(LS_MOD_DRAFT,{});
  const setMemory = (obj)=>save(LS_MOD_DRAFT,obj);

  /* ===== Snapshot runtime → object ===== */

const snapshotRuntime = ()=>{
  const snap = { order:[...ORDER], catalog:{}, cat_thumbs:{}, addons_labels: read(LS_MOD_DRAFT,{}).addons_labels || {} };
  ORDER.forEach(k=>{
    const c = CATALOG[k] || {};
    const normItem = it => ({
      name: it.name||"Продукт",
      desc: it.desc||"",
      price: Number(it.price)||0,
      img: it.img||""
    });

    snap.catalog[k] = {
      title: c.title || k.toUpperCase(),
      view: c.view || undefined,
      hellPrice: c.hellPrice || undefined,
      items: Array.isArray(c.items) ? c.items.map(normItem) : undefined,
      groups: Array.isArray(c.groups) ? c.groups.map(g => ({
        heading: g.heading || "",
        items: Array.isArray(g.items) ? g.items.map(normItem) : undefined,
        images: Array.isArray(g.images) ? [...g.images] : undefined,
        pair: Array.isArray(g.pair) ? g.pair.map(p => ({...p})) : undefined
      })) : undefined
    };
    snap.cat_thumbs[k] = CAT_THUMBS[k] || DEFAULT_CAT_THUMB;
  });
  return snap;
};


const applySaved = (data)=>{
  if(!data||typeof data!=="object") return;

  if(Array.isArray(data.order)&&data.order.length){
    const known=new Set(ORDER);
    data.order.forEach(k=>{ if(!known.has(k)) ORDER.push(k); });
    const rest=ORDER.filter(k=>!data.order.includes(k));
    ORDER.length=0; data.order.forEach(k=>ORDER.push(k)); rest.forEach(k=>ORDER.push(k));
  }

  if(data.catalog&&typeof data.catalog==="object"){
    Object.entries(data.catalog).forEach(([key,val])=>{
      if(!CATALOG[key]){ CATALOG[key]={ title:val.title||key.toUpperCase(), items:[] }; }
      CATALOG[key].title     = val.title || CATALOG[key].title;
      CATALOG[key].view      = val.view ?? CATALOG[key].view;
      CATALOG[key].hellPrice = val.hellPrice ?? CATALOG[key].hellPrice;
      if (Array.isArray(val.items))  CATALOG[key].items  = val.items;
      if (Array.isArray(val.groups)) CATALOG[key].groups = val.groups;
    });
  }

  if(data.cat_thumbs) Object.assign(CAT_THUMBS, data.cat_thumbs||{});
  if(data.addons_labels) {
    const mem=getMemory(); mem.addons_labels = data.addons_labels; setMemory(mem);
  }
};


  const persistDraft = ()=> save(LS_MOD_DRAFT, { ...snapshotRuntime(), addons_labels: read(LS_MOD_DRAFT,{}).addons_labels || {} });
  const savePermanent = ()=> save(LS_MOD_DATA, snapshotRuntime());

  /* ===== Trash ===== */
  const trashPush = entry => { const a=read(LS_MOD_TRASH,[]); a.unshift({ ...entry, ts:Date.now() }); save(LS_MOD_TRASH,a); };
  const trashList = ()=> read(LS_MOD_TRASH,[]);
  const trashDel  = i => { const a=trashList(); a.splice(i,1); save(LS_MOD_TRASH,a); };
  const trashPurge= ()=> save(LS_MOD_TRASH,[]);

  const openTrashUI = ()=>{
    const items=trashList();
    const wrap=document.createElement("div");
    Object.assign(wrap.style,{position:"fixed",inset:"0",zIndex:"100000",background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:"22px"});
    const box=document.createElement("div");
    Object.assign(box.style,{background:"#fff",borderRadius:"14px",width:"min(900px,96vw)",maxHeight:"86vh",overflow:"auto",boxShadow:"0 18px 60px rgba(0,0,0,.35)",padding:"14px"});
    box.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 style="margin:0">🗑 Кошче</h3>
        <div>
          <button data-a="purge" style="margin-right:8px">Изчисти</button>
          <button data-a="close">Затвори</button>
        </div>
      </div>
      <div class="tlist">${!items.length?'<div style="opacity:.7;padding:8px 0">Празно</div>':''}</div>`;
    const list=box.querySelector(".tlist");
    items.forEach((it,idx)=>{
      const when=new Date(it.ts||Date.now()).toLocaleString();
      const row=document.createElement("div");
      Object.assign(row.style,{border:"1px solid #eee",borderRadius:"10px",padding:"10px 12px",margin:"8px 0",display:"grid",gridTemplateColumns:"1fr auto",gap:"8px"});
      row.innerHTML=`
        <div>
          <div><b>${esc(it.kind.toUpperCase())}</b> • ${esc(it.title||it.catKey||"")}</div>
          <div style="opacity:.7;font-size:12px">${when}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button data-i="${idx}" data-a="restore">Възстанови</button>
          <button data-i="${idx}" data-a="del">Премахни</button>
        </div>`;
      list.appendChild(row);
    });
    wrap.appendChild(box); document.body.appendChild(wrap);
    const close=()=>wrap.remove();
    box.addEventListener("click",(e)=>{
      const b=e.target.closest("button"); if(!b) return;
      const a=b.dataset.a;
      if(a==="close") return close();
      if(a==="purge"){ if(askPass("Парола за изчистване")){ trashPurge(); close(); toast("Кошчето е изчистено"); } return; }
      const i=Number(b.dataset.i); const arr=trashList(); const entry=arr[i]; if(!entry) return;

      if(a==="restore"){
        if(entry.kind==="product"){
          const {catKey,index,item}=entry;
          if(!CATALOG[catKey]) CATALOG[catKey]={title:catKey.toUpperCase(),items:[]};
          const L=CATALOG[catKey].items; const pos=Math.max(0,Math.min(index??L.length,L.length));
          L.splice(pos,0,item); persistDraft(); trashDel(i); activate(catKey,{replace:true}); toast("Възстановен продукт");
        } else if(entry.kind==="category"){
          const {catKey,title,items,thumb,index}=entry;
          if(!ORDER.includes(catKey)){ const pos=Math.max(0,Math.min(index??ORDER.length,ORDER.length)); ORDER.splice(pos,0,catKey); }
          CATALOG[catKey]={title:title||catKey.toUpperCase(),items:items||[]}; if(thumb) CAT_THUMBS[catKey]=thumb;
          persistDraft(); trashDel(i); rebuildSidebar(); popThenActivate(null,catKey); toast("Възстановена категория");
        }
      }
      if(a==="del"){ trashDel(i); b.closest("div[style]").remove(); }
    });
    wrap.addEventListener("click",(e)=>{ if(e.target===wrap) close(); });
  };

  /* ===== Addons labels: read/store and apply after render ===== */
  const getAddonsFor = (catKey)=>{
    const mem=read(LS_MOD_DRAFT,{});
    return (mem.addons_labels&&mem.addons_labels[catKey]) || null;
  };
  const putAddonsFor = (catKey, data)=>{
    const mem=read(LS_MOD_DRAFT,{});
    mem.addons_labels = mem.addons_labels || {};
    mem.addons_labels[catKey] = data;
    setMemory(mem);
    persistDraft();
  };

  // При рендер – ако има дефиниции от редактора, сменяме етикетите и/или цените
  const applyAddonsLabelsToDOM = (catKey)=>{
    const def = getAddonsFor(catKey);
    if(!def) return;

    // групи без цени
    ["veg","sauce"].forEach(g=>{
      const arr = def[g];
      if(!Array.isArray(arr)) return;
      const boxes = [...document.querySelectorAll(`.addon-checkbox[data-group="${g}"]`)];
      boxes.forEach((b,i)=>{
        const label = b.closest("label");
        if(label && arr[i]) {
          label.childNodes[label.childNodes.length-1].nodeValue = " " + arr[i];
        }
      });
    });

    // платени добавки (portsii)
    if(Array.isArray(def.paid)){
      const paid = def.paid;
      const boxes = [...document.querySelectorAll(`.product .addon-checkbox:not([data-group])`)];
      boxes.forEach((b,i)=>{
        const labelEl=b.closest("label");
        if(!labelEl || !paid[i]) return;
        const {label,price} = paid[i];
        b.setAttribute("data-price", Number(price)||0);
        labelEl.childNodes[labelEl.childNodes.length-1].nodeValue = ` + ${label}`;
      });
    }
  };

  /* ===== Helpers ===== */
  const currentCat = ()=> new URLSearchParams(location.search).get("cat") || current || "burgeri";

  /* ===== Sidebar build + DnD + edit buttons ===== */
  const rebuildSidebar = ()=>{
    if(!sidebar) return;

    sidebar.innerHTML = ORDER.map(key=>{
      const label=(key==="promocii") ? "ПРОМОЦИИ" : (CATALOG[key]?.title || key.toUpperCase());
      const img  = CAT_THUMBS[key] || DEFAULT_CAT_THUMB;
      return `
        <a class="cat" draggable="true" data-cat="${esc(key)}" role="link" tabindex="0" aria-label="${esc(label)}">
          <div class="box cat-box" style="background-image:url('${img}')" data-label="${esc(label)}">
            <span class="cat-hover-tools" aria-hidden="true">
              <button class="cat-pic" title="Смени картинка">📁</button>
              <button class="cat-rename" title="Преименувай">🖊</button>
              <button class="cat-delete" title="Изтрий">🗑</button>
            </span>
          </div>
          <div class="cat-label">${esc(label)}</div>
        </a>`;
    }).join("") + `
      <a class="cat cat--add" role="button" tabindex="0" aria-label="Добави категория">
        <div class="box" style="display:flex;align-items:center;justify-content:center"><span style="font-size:42px">+</span></div>
        <div class="cat-label">Добави категория</div>
      </a>`;

    // навигация
    sidebar.querySelectorAll(".cat").forEach(el=>{
      const key=el.dataset.cat;
      el.addEventListener("click",(e)=>{
        if(el.classList.contains("cat--add")) return;
        if(e.target.closest(".cat-hover-tools")) return;
        if(shouldBypassDelay(e)) return;
        e.preventDefault(); if(!key||key===current) return;
        popThenActivate(el,key);
      });
    });

    // инструменти
    sidebar.querySelectorAll(".cat-box").forEach(b=>b.style.position="relative");
    sidebar.querySelectorAll(".cat-hover-tools").forEach(t=>{
      Object.assign(t.style,{position:"absolute",top:"6px",right:"6px",display:"none",gap:"6px"});
      t.parentElement.addEventListener("mouseenter",()=>t.style.display="inline-flex");
      t.parentElement.addEventListener("mouseleave",()=>t.style.display="none");
      t.querySelectorAll("button").forEach(b=>Object.assign(b.style,{border:"none",borderRadius:"8px",padding:"4px 6px",background:"rgba(0,0,0,.55)",color:"#fff",cursor:"pointer"}));
    });

    // смяна на икона (📁)
    sidebar.querySelectorAll(".cat-pic").forEach(btn=>{
      btn.addEventListener("click",(e)=>{
        e.stopPropagation();
        const catKey=e.target.closest(".cat")?.dataset?.cat; if(!catKey) return;
        const input=document.createElement("input"); input.type="file"; input.accept="image/*";
        input.onchange=ev=>{
          const f=ev.target.files?.[0]; if(!f) return;
          const r=new FileReader(); r.onload=ev2=>{ CAT_THUMBS[catKey]=ev2.target.result; persistDraft(); rebuildSidebar(); };
          r.readAsDataURL(f);
        };
        input.click();
      });
    });

    // преименуване (🖊)
    sidebar.querySelectorAll(".cat-rename").forEach(btn=>{
      btn.addEventListener("click",(e)=>{
        e.stopPropagation();
        const catKey=e.target.closest(".cat")?.dataset?.cat;
        const old=CATALOG[catKey]?.title||catKey.toUpperCase();
        const t=prompt("Ново име на категория:",old); if(!t) return;
        if(!CATALOG[catKey]) CATALOG[catKey]={title:t,items:[]}; else CATALOG[catKey].title=t;
        persistDraft(); rebuildSidebar();
        if(currentCat()===catKey && titleEl) titleEl.textContent=t;
      });
    });

    // изтриване (🗑) – работи и за току-що създадени категории
    sidebar.querySelectorAll(".cat-delete").forEach(btn=>{
      btn.addEventListener("click",(e)=>{
        e.stopPropagation();
        const catKey=e.target.closest(".cat")?.dataset?.cat;
        if(catKey==="promocii"){ alert("ПРОМОЦИИ не може да се изтрива."); return; }
        if(ORDER.length<=1){ alert("Трябва да има поне една категория."); return; }
        if(!askPass("Парола за изтриване на категория")) return;
        const idx=ORDER.indexOf(catKey);
        trashPush({ kind:"category", catKey, title:CATALOG[catKey]?.title||catKey, items:(CATALOG[catKey]?.items||[]).map(x=>({...x})), thumb:CAT_THUMBS[catKey]||"", index:idx });
        if(idx>=0) ORDER.splice(idx,1);
        try{ delete CATALOG[catKey]; }catch{}
        persistDraft(); rebuildSidebar();
        const next=ORDER[0] || "burgeri"; popThenActivate(null,next);
        toast("Категорията е в Кошчето");
      });
    });

    // „+“ плочка
    sidebar.querySelector(".cat--add")?.addEventListener("click",(e)=>{
      e.preventDefault();
      let key=prompt("Слъг (латиница), напр. 'pizza':",""); if(!key) return;
      key=key.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,""); if(!key){ alert("Невалиден ключ."); return; }
      if(ORDER.includes(key)){ alert("Вече има такава категория."); return; }
      const title=prompt("Заглавие:", "НОВА КАТЕГОРИЯ")||"НОВА КАТЕГОРИЯ";
      ORDER.push(key); CATALOG[key]={title,items:[]}; CAT_THUMBS[key]=CAT_THUMBS[key]||DEFAULT_CAT_THUMB;
      persistDraft(); rebuildSidebar(); popThenActivate(null,key);
    });

    // Drag&Drop на категориите
    let drag=null;
    sidebar.querySelectorAll(".cat:not(.cat--add)").forEach(el=>{
      el.addEventListener("dragstart", ()=>{ drag=el; el.style.opacity=".5"; });
      el.addEventListener("dragend",   ()=>{ el.style.opacity="1"; drag=null; });
      el.addEventListener("dragover",  e=>e.preventDefault());
      el.addEventListener("drop",      e=>{
        e.preventDefault(); if(!drag||drag===el) return;
        el.parentNode.insertBefore(drag, el.nextSibling);
        const keys=[...sidebar.querySelectorAll(".cat:not(.cat--add)")].map(x=>x.dataset.cat);
        ORDER.length=0; keys.forEach(k=>ORDER.push(k)); persistDraft(); toast("Подредено");
      });
    });
  };

  /* ===== inline редакция (заглавия/описания/цени/снимки) ===== */
  const enableInlineEditing = ()=>{
    document.querySelectorAll(".product .title, .product .desc, .price-badge .lv").forEach(el=>{
      el.contentEditable="true"; el.setAttribute("data-mod","1");
      el.style.outline="1px dashed #ff7a00"; el.style.cursor="text";
      el.addEventListener("input",()=>{
        const key=currentCat(); const cards=[...grid.querySelectorAll(".product")];
        const i=cards.findIndex(x=>x.contains(el)); if(i<0) return;
        const item=(CATALOG[key]?.items||[])[i]; if(!item) return;
        if(el.classList.contains("title")) item.name = el.textContent.trim();
        else if(el.classList.contains("desc")) item.desc = el.textContent.trim();
        else if(el.classList.contains("lv"))  item.price= lvParse(el.textContent);
        persistDraft();
      });
    });

    // смяна на снимки (карта/галерия/вода)
    document.querySelectorAll(".product .photo, .tile img, .water-card img").forEach(img=>{
      img.style.cursor="pointer";
      img.addEventListener("click",()=>{
        const input=document.createElement("input"); input.type="file"; input.accept="image/*";
        input.onchange=e=>{
          const f=e.target.files?.[0]; if(!f) return;
          const r=new FileReader(); r.onload=ev=>{
            const url=ev.target.result; if(img.tagName==="IMG") img.src=url; else img.style.backgroundImage=`url('${url}')`;
            const key=currentCat(); const cards=[...grid.querySelectorAll(".product")];
            const i=cards.findIndex(x=>x.contains(img)); if(i>=0 && CATALOG[key]?.items?.[i]){ CATALOG[key].items[i].img=url; persistDraft(); }
          }; r.readAsDataURL(f);
        };
        input.click();
      });
    });

    // РЕДАКТОР за Сосове/Добавки:
    // 1) правим текстовете в чекбоксовете редактируеми (label)
    document.querySelectorAll(".addons label").forEach(lbl=>{
      const txtNode = [...lbl.childNodes].find(n=>n.nodeType===3); // текст след чекбокса
      if(!txtNode) return;
      lbl.setAttribute("contenteditable","true");
      lbl.addEventListener("blur",()=>{
        const key=currentCat();
        const group=lbl.querySelector(".addon-checkbox")?.dataset.group || null;
        const code =lbl.querySelector(".addon-checkbox")?.dataset.code  || null;
        const raw = (lbl.textContent||"").trim().replace(/^\+\s*/,"");
        const mem = getMemory() || {};
        // групи без цена (veg/sauce)
        if(group==="veg"||group==="sauce"){
          const all=[...lbl.parentElement.parentElement.querySelectorAll(`.addon-checkbox[data-group="${group}"]`)];
          const idx=all.findIndex(b=>b.closest("label")===lbl);
          mem[group]=mem[group]||[]; mem[group][idx]=raw;
        }else{
          // платени (portsii)
          mem.paid = mem.paid || [];
          const all=[...lbl.parentElement.parentElement.querySelectorAll(`.addon-checkbox:not([data-group])`)];
          const idx=all.findIndex(b=>b.closest("label")===lbl);
          const price = Number(all[idx].getAttribute("data-price")||0);
          mem.paid[idx] = { code, label: raw, price };
        }
        putAddonsFor(key, mem);
      });
    });

    // 2) бърза промяна на цена за платените добавки (двойно клик върху label)
    document.querySelectorAll('.addons label .addon-checkbox:not([data-group])').forEach(box=>{
      const lbl=box.closest("label");
      lbl.addEventListener("dblclick",(e)=>{
        e.preventDefault();
        const cur=Number(box.getAttribute("data-price")||0);
        const p=prompt("Цена за тази добавка:", cur); if(p==null) return;
        const val=Number(String(p).replace(",","."));
        if(!isFinite(val)) return;
        box.setAttribute("data-price", val);
        const key=currentCat(); const mem=getMemory()||{}; mem.paid=mem.paid||[];
        const all=[...lbl.parentElement.parentElement.querySelectorAll(`.addon-checkbox:not([data-group])`)];
        const idx=all.findIndex(b=>b===box);
        const labelText=(lbl.textContent||"").trim().replace(/^\+\s*/,"");
        const code=box.getAttribute("data-code")||"";
        mem.paid[idx]={ code, label: labelText, price: val };
        putAddonsFor(key, mem);
        toast("Цена обновена");
      });
    });
  };

  /* ===== DnD продукти в категория ===== */
  const domProductsToArray = ()=>{
    const list=[]; if(!grid) return list;
    grid.querySelectorAll(".product").forEach(p=>{
      const name=p.querySelector(".title")?.textContent.trim()||"Продукт";
      const desc=p.querySelector(".desc")?.textContent.trim()||"";
      const lvEl=p.querySelector(".price-badge .lv"); const price=lvEl?lvParse(lvEl.textContent):0;
      let img=""; const bg=p.querySelector(".photo")?.style?.backgroundImage||""; const m=bg.match(/url\(['"]?(.*?)['"]?\)/i); if(m&&m[1]) img=m[1];
      list.push({name,desc,price,img});
    }); return list;
  };
  const enableProductDnd = ()=>{
    let drag=null;
    grid?.querySelectorAll(".product").forEach(card=>{
      card.draggable=true;
      card.addEventListener("dragstart",()=>{drag=card; card.style.opacity=".4";});
      card.addEventListener("dragend",()=>{card.style.opacity="1"; drag=null;});
      card.addEventListener("dragover",e=>e.preventDefault());
      card.addEventListener("drop",e=>{
        e.preventDefault(); if(!drag||drag===card) return;
        card.parentNode.insertBefore(drag, card.nextSibling);
        const key=currentCat(); const arr=domProductsToArray(); if(CATALOG[key]){ CATALOG[key].items=arr; persistDraft(); toast("Подредено"); }
      });
    });
  };

  /* ===== Delete product with password → Trash ===== */
  const injectDeleteButtons = ()=>{
    grid?.querySelectorAll(".product").forEach((card,idx)=>{
      if(card.querySelector(".mod-del")) return;
      const b=document.createElement("button");
      b.className="mod-del"; b.textContent="🗑";
      Object.assign(b.style,{position:"absolute",top:"8px",right:"8px",zIndex:"5",background:"rgba(0,0,0,.6)",color:"#fff",border:"none",borderRadius:"10px",padding:"4px 8px",cursor:"pointer"});
      card.style.position="relative"; card.appendChild(b);
      b.addEventListener("click",()=>{
        if(!askPass("Парола за изтриване на продукт")) return;
        const key=currentCat(); const list=CATALOG[key]?.items; if(list&&list[idx]){
          const item={...list[idx]}; trashPush({kind:"product",catKey:key,index:idx,item,title:item.name});
          list.splice(idx,1); persistDraft(); activate(key,{replace:true}); toast("В кошчето");
        }
      });
    });
  };

  /* ===== Hook към activate(), за да се прилагат редакторските екстри след всеки рендер ===== */
  const _activate=activate;
  activate=function(cat,opts){
    _activate(cat,opts);
    // Прилага персонални етикети/цени за добавките (ако има запазени)
    applyAddonsLabelsToDOM(cat);
    enableInlineEditing();
    enableProductDnd();
    injectDeleteButtons();
    ensurePlusRightUniversal();
    ensureMobilePlusRight();
  };



/* ===== Автоматична конверсия лев ↔ евро ===== */
async function updateEuroRatesAndPrices() {
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=BGN&symbols=EUR");
    const data = await res.json();
    window.BGN_TO_EUR = data?.rates?.EUR || 1.95583;
  } catch {
    window.BGN_TO_EUR = 1.95583;
  }
}

function applyEuroConversion() {
  document.querySelectorAll(".price-badge").forEach(badge => {
    const lvEl = badge.querySelector(".lv");
    if (!lvEl) return;
    const lvValue = parseFloat(lvEl.textContent.replace(",", "."));
    const eurValue = (lvValue / (window.BGN_TO_EUR || 1.95583)).toFixed(2);
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

/* При стартиране */
updateEuroRatesAndPrices().then(applyEuroConversion);

/* При промяна на цена */
document.body.addEventListener("input", e => {
  if (e.target.classList.contains("lv")) applyEuroConversion();
});


  /* ===== Плаващи бутони ===== */
  const addBtn = (label, bottom, onClick, style = {}) => {
    const b = document.createElement("button");
    b.textContent = label;
    Object.assign(b.style, {
      position: "fixed",
      right: "20px",
      bottom: bottom + "px",
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
    }, style);

    b.addEventListener("mouseenter", () => {
      b.style.transform = "translateY(-2px)";
      b.style.boxShadow = "0 8px 24px rgba(0,0,0,.4)";
    });
    b.addEventListener("mouseleave", () => {
      b.style.transform = "translateY(0)";
      b.style.boxShadow = "0 6px 20px rgba(0,0,0,.3)";
    });

    b.addEventListener("click", onClick);
    document.body.appendChild(b);
    return b;
  };

  /* 🗑 Кошче */
  addBtn("🗑 Кошче", 320, openTrashUI, { background: "#333" });

  /* ➕ Добави продукт */
  addBtn("➕ Добави продукт", 260, () => {
    const key = currentCat();
    if (!CATALOG[key]) CATALOG[key] = { title: key.toUpperCase(), items: [] };
    CATALOG[key].items.push({
      name: "Нов продукт",
      desc: "Описание...",
      price: 0,
      img: "snimki/default.jpg"
    });
    persistDraft();
    activate(key, { replace: true });
  });

// Перманентно запазване на новия продукт
localStorage.setItem("CATALOG", JSON.stringify(CATALOG));
localStorage.setItem("ORDER", JSON.stringify(ORDER));

 
/* =====================================================
   ➕ ДОБАВИ ДОБАВКА — ВИЗУАЛЕН РЕЖИМ С КРЪГЧЕТА
   ===================================================== */
addBtn("➕ Добави добавка", 220, () => {
  toast("Избери продукт, към който да добавиш добавки 👇");
  isAddonsEditMode = true;

  document.querySelectorAll(".product").forEach((card, i) => {
    card.style.position = "relative";

    // създаваме златно кръгче в горния ляв ъгъл
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
      zIndex: "9999", // ← много важно, за да не е зад снимката
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "900",
      color: "#ffb300",
      transition: "all 0.15s ease",
      userSelect: "none"
    });

    mark.addEventListener("mouseenter", () => (mark.style.transform = "scale(1.1)"));
    mark.addEventListener("mouseleave", () => (mark.style.transform = "scale(1)"));

    mark.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isAddonsEditMode) return;

      mark.innerHTML = "✓";
      mark.style.background = "#ffb300";
      mark.style.color = "#fff";

      openAddonsEditor(i, card);

      // премахваме останалите кръгчета
      isAddonsEditMode = false;
      document.querySelectorAll(".select-mark").forEach(m => { if (m !== mark) m.remove(); });
    });

    card.appendChild(mark);
  });
}, {
  background: "#ffb300",
  color: "#fff",
  fontWeight: "900",
  border: "none",
  borderRadius: "14px",
  padding: "10px 16px",
  position: "fixed",
  right: "20px",
  zIndex: "10000"
});




  /* 📁 Нова категория */
  addBtn("📁 Нова категория", 140, () => {
    let key = prompt("Слъг (латиница), напр. 'pizza':", "");
    if (!key) return;
    key = key.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
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



addBtn("💾 Запази всичко в основния сайт", 50, async () => {
  // 1) събираме моментна снимка от редактора
  const draft = JSON.parse(localStorage.getItem("bbq_mod_draft_v3") || "{}") || {};
  const payload = {
    CATALOG: JSON.parse(JSON.stringify(CATALOG)),
    ORDER:   [...ORDER],
    ADDONS:  JSON.parse(JSON.stringify(ADDONS)),
    cat_thumbs: { ...CAT_THUMBS, ...(draft.cat_thumbs || {}) },
    addons_labels: draft.addons_labels || {},
    savedAt: new Date().toISOString()
  };

  // 2) опит за облачен запис (Upstash Redis през /api/catalog)
  try {
    const r = await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error(await r.text());

    toast("✅ Записано в основния сайт. Излез от MOD (Изход) и рефрешни.");
  } catch (err) {
    console.warn("Cloud save failed, falling back to localStorage:", err);

    // 3) fallback – локален запис (офлайн/временен)
    try {
      localStorage.setItem("BBQ_MAIN_CATALOG", JSON.stringify(payload));
      toast("⚠️ Записано локално (офлайн режим). Излез от MOD и рефрешни.");
    } catch (e2) {
      alert("❌ Проблем при запис: " + e2.message);
    }
  }
});

/* =====================================================
   🧠 Зареждане на добавките от паметта
   ===================================================== */
try {
  const savedAddons = localStorage.getItem("BBQ_ADDONS");
  if (savedAddons) {
    const data = JSON.parse(savedAddons);
    if (data && typeof data === "object") {
      Object.assign(ADDONS, data);
      console.log("✅ Добавките са заредени от паметта:", ADDONS);
    }
  }
} catch (err) {
  console.warn("⚠️ Грешка при зареждане на добавките:", err);
}


/* ===== Динамичен редактор за добавки към продукт ===== */


/* ===== 🧩 Режим за избор на продукт за добавки (с кръгчета) ===== */
let isAddonsEditMode = false;

function enableAddonsEditMode() {
  toast("Избери продукт, към който да добавиш добавки 👇");
  isAddonsEditMode = true;

  // добавяме кръгче в горния ляв ъгъл на всяка карта
  document.querySelectorAll(".product").forEach((card, i) => {
    card.style.position = "relative";

    const mark = document.createElement("div");
    mark.className = "select-mark";
    Object.assign(mark.style, {
      position: "absolute",
      top: "6px",
      left: "6px",
      width: "26px",
      height: "26px",
      borderRadius: "50%",
      border: "2px solid #ffb300",
      background: "#fff",
      boxShadow: "0 2px 6px rgba(0,0,0,.2)",
      cursor: "pointer",
      zIndex: "10",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "900",
      color: "#ffb300",
      transition: "all 0.15s ease"
    });
    mark.innerHTML = "";

    mark.addEventListener("mouseenter", () => {
      mark.style.transform = "scale(1.1)";
    });
    mark.addEventListener("mouseleave", () => {
      mark.style.transform = "scale(1)";
    });

    // При натискане избира конкретния продукт
    mark.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isAddonsEditMode) return;
      mark.innerHTML = "✓";
      mark.style.background = "#ffb300";
      mark.style.color = "#fff";
      openAddonsEditor(i, card);
      isAddonsEditMode = false;

      // премахваме всички други чекчета
      document.querySelectorAll(".select-mark").forEach((m) => {
        if (m !== mark) m.remove();
      });
    });

    card.appendChild(mark);
  });
}

/* ===== 🧱 Панел за добавки към продукт ===== */

/* ===== 🟠 Бутон „Добави добавка“ (само за храни) ===== */
addBtn("➕ Добави добавка", 220, () => {
  const key = currentCat().toLowerCase();

  // Категории, при които няма добавки (напитки)
  const blockedCats = [
    "napitki", "drinks", "vodi", "voda", "hell", "hiho",
    "fanta", "cola", "pepsi", "chai", "studeni_chai", "gazirana_voda" , "kola" ,"palachinki"
  ];

  if (blockedCats.some(b => key.includes(b))) {
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

    mark.addEventListener("mouseenter", () => (mark.style.transform = "scale(1.1)"));
    mark.addEventListener("mouseleave", () => (mark.style.transform = "scale(1)"));

    mark.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isAddonsEditMode) return;

      mark.innerHTML = "✓";
      mark.style.background = "#ffb300";
      mark.style.color = "#fff";

      openAddonsEditor(i, card);

      // премахваме останалите кръгчета
      isAddonsEditMode = false;
      document.querySelectorAll(".select-mark").forEach((m) => {
        if (m !== mark) m.remove();
      });
    });

    card.appendChild(mark);
  });
}, {
  background: "#ffb300",
  color: "#fff",
  fontWeight: "900",
  border: "none",
  borderRadius: "14px",
  padding: "10px 16px",
  position: "fixed",
  right: "20px",
  zIndex: "10000"
});


/* =====================================================
   🧩 Popup редактор за добавки с цена — с перманентно запазване
   ===================================================== */
function openAddonsEditor(index, cardEl) {
  const key = currentCat().toLowerCase();
  const category = CATALOG[key];
  if (!category) return toast("⚠️ Категорията не е намерена");

  // вземаме всички продукти (items + groups)
  let allItems = [];
  if (category.items) allItems = category.items;
  else if (category.groups) category.groups.forEach(g => allItems = allItems.concat(g.items || []));

  const item = allItems[index];
  if (!item) return;
  if (!item.addons) item.addons = [];

  document.querySelector(".addons-popup")?.remove();

  // overlay
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

  // кутия
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

  // 🧩 Добавяне на нов ред
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
    const selectedAddons = item.addons.filter(a => a.checked);
    // 💾 Перманентно записваме данните
    if (!CATALOG[key].items[index]) CATALOG[key].items[index] = item;
    CATALOG[key].items[index].addons = item.addons;
    localStorage.setItem("CATALOG", JSON.stringify(CATALOG));

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

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = "Добавки";
    sidePanel.appendChild(title);

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
        if (pass === "0000") {
          item.addons = item.addons.filter(x => x !== a);
          toast(`🗑️ ${a.label} премахната`);
          row.remove();
          CATALOG[key].items[index].addons = item.addons;
          localStorage.setItem("CATALOG", JSON.stringify(CATALOG));
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

/* ==============================================
   🎨 Стилизация за външен панел с добавки вдясно
   ============================================== */
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
  const s = document.createElement("style");
  s.textContent = css;
  document.head.appendChild(s);
})();



/* ==============================================
   🎨 Стилизация за външен панел с добавки вдясно
   ============================================== */
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
  const s = document.createElement("style");
  s.textContent = css;
  document.head.appendChild(s);
})();

/* =====================================================
   🟠 Визуален банер за MODERATOR MODE с бутон Изход
   ===================================================== */
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

/* =====================================================
   🧭 РЕНДЕРИРАНЕ НА ПРОДУКТИ В MODERATOR MODE (FULL)
   ===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const qs = new URLSearchParams(location.search);
  const isModerator = qs.get("mode") === "moderator";
  if (!isModerator) return;

  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = "";

  // Ако няма категории – създаваме базова
  if (!ORDER.length) {
    ORDER.push("promocii");
    CATALOG["promocii"] = {
      title: "ПРОМОЦИИ",
      items: [
        { name: "BBQ Бургер", desc: "Класика на жар", price: 8.99, img: "snimki/default.jpg" },
        { name: "Палачинка XL", desc: "Голям размер", price: 5.50, img: "snimki/default.jpg" }
      ]
    };
    localStorage.setItem("CATALOG", JSON.stringify(CATALOG));
    localStorage.setItem("ORDER", JSON.stringify(ORDER));
  }

  // Рендериране
  ORDER.forEach(key => {
    const cat = CATALOG[key];
    if (!cat) return;

    const h = document.createElement("h2");
    h.textContent = cat.title;
    h.style.cssText = "color:#ff7a00;font-weight:900;margin-top:20px;";
    grid.appendChild(h);

    (cat.items || []).forEach((item, i) => {
      const card = document.createElement("div");
      card.className = "product";
      card.style.cssText = `
        border:1px solid #ffb300;
        padding:10px;
        margin:8px 0;
        border-radius:10px;
        background:#fff;
        max-width:360px;
        box-shadow:0 2px 6px rgba(0,0,0,0.1);
      `;
      card.innerHTML = `
        <div style="font-weight:700;">${item.name || "Без име"}</div>
        <div style="color:#444;">${parseFloat(item.price||0).toFixed(2)} лв.</div>
        <button class="editAddonsBtn"
          style="background:#ff7a00;color:#fff;border:none;
          border-radius:8px;padding:6px 12px;margin-top:6px;cursor:pointer;">
          Добавки
        </button>
      `;
      card.querySelector(".editAddonsBtn").onclick = () => openAddonsEditor(i, card);
      grid.appendChild(card);
    });

    // бутон „➕ Нов продукт“
    const addItemBtn = document.createElement("button");
    addItemBtn.textContent = "➕ Нов продукт";
    Object.assign(addItemBtn.style, {
      background: "#ffb300",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      padding: "8px 14px",
      fontWeight: "700",
      cursor: "pointer",
      marginTop: "10px"
    });
    addItemBtn.onclick = () => {
      const name = prompt("Име на продукта:");
      const price = parseFloat(prompt("Цена:") || "0");
      if (!name) return;
      cat.items.push({ name, price, addons: [] });
      localStorage.setItem("CATALOG", JSON.stringify(CATALOG));
      localStorage.setItem("ORDER", JSON.stringify(ORDER));
      toast("✅ Добавен е нов продукт!");
      location.reload();
    };
    grid.appendChild(addItemBtn);
  });
});

  /* ===== Boot ===== */
  applySaved(read(LS_MOD_DATA,null));
  applySaved(read(LS_MOD_DRAFT,null));
  rebuildSidebar();
  const cur=currentCat(); if(titleEl && CATALOG[cur]?.title) titleEl.textContent = CATALOG[cur].title;
  activate(cur, {replace:true});
});

