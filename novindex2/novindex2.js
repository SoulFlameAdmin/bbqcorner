



/* E:\BBQ_SITE\novindex2\novindex2.js */
"use strict";

// Флаг: дали сме в MODERATOR MODE
const IS_MOD = localStorage.getItem("bbq_mode_flag") === "true";

if (IS_MOD) {
  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("is-mod");
  });
}


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


/* ==========================================================
   APPLY CATALOG STATE – задължително за Firestore зареждане
   Стабилен FIX → запазва САМО addons, без да нарушава структурата
   ========================================================== */
function applyCatalogState(data) {
  if (!data || typeof data !== "object") return;

  // 1) CATALOG – ПЪЛЕН override (но поправяме само items→addons)
  if (data.CATALOG && typeof data.CATALOG === "object") {

    // изчистваме старото (както си било)
    Object.keys(CATALOG).forEach((k) => { delete CATALOG[k]; });

    for (const [key, value] of Object.entries(data.CATALOG)) {
      // копираме цялата структура
      CATALOG[key] = { ...value };

      /* 🔥 FIX #1: ITEMS – винаги връщаме addons */
      if (Array.isArray(value.items)) {
        CATALOG[key].items = value.items.map(it => ({
          ...it,
          addons: Array.isArray(it.addons) ? it.addons : []
        }));
      }

      /* 🔥 FIX #2: GROUPS → items вътре също пазим addons */
      if (Array.isArray(value.groups)) {
        CATALOG[key].groups = value.groups.map(g => ({
          ...g,
          items: Array.isArray(g.items)
            ? g.items.map(it => ({
                ...it,
                addons: Array.isArray(it.addons) ? it.addons : []
              }))
            : g.items
        }));
      }
    }
  }

  // 2) ORDER
  if (Array.isArray(data.ORDER)) {
    ORDER.length = 0;
    ORDER.push(...data.ORDER);
  }

  // 3) ADDONS – само merge (не трием нищо)
  if (data.ADDONS && typeof data.ADDONS === "object") {
    Object.assign(ADDONS, data.ADDONS);
  }

  // 4) Миниатюри
  if (data.cat_thumbs && typeof data.cat_thumbs === "object") {
    Object.assign(CAT_THUMBS, data.cat_thumbs);
  }
}

/* ==========================================================
   🔥 ADDONS DEBUG MODE
   Активира се с ?debugAddons=1
   ========================================================== */
(function addonsDebugMode() {
  const params = new URLSearchParams(location.search);
  if (!params.get("debugAddons")) return;

  console.log("%c🔥 ADDONS DEBUG MODE ACTIVATED", "color:#ff7a00; font-size:16px; font-weight:900;");

  // ===== VISUAL OVERLAY =====
  const box = document.createElement("div");
  box.style.position = "fixed";
  box.style.bottom = "20px";
  box.style.right = "20px";
  box.style.background = "rgba(0,0,0,0.85)";
  box.style.border = "2px solid #ff7a00";
  box.style.color = "#fff";
  box.style.padding = "14px 18px";
  box.style.fontSize = "14px";
  box.style.borderRadius = "12px";
  box.style.zIndex = "999999";
  box.style.maxWidth = "380px";
  box.style.backdropFilter = "blur(4px)";
  box.style.boxShadow = "0 0 18px rgba(255, 140, 0, 0.4)";
  box.innerHTML = `
    <div style="font-weight:900; color:#ffb347; margin-bottom:6px;">
      🔥 Addons Debug
    </div>
    <button id="btnPrintAddons" style="
      padding:6px 12px; border:none; background:#ff7a00;
      border-radius:6px; color:#fff; cursor:pointer; margin-bottom:8px;">
      Print Addons
    </button>
    <button id="btnPrintCatalog" style="
      padding:6px 12px; border:none; background:#2aa2ff;
      border-radius:6px; color:#fff; cursor:pointer;">
      Print Full Catalog
    </button>
  `;
  document.body.appendChild(box);

  document.getElementById("btnPrintAddons").onclick = () => {
    console.log("%c🔍 ADDONS CHECK", "color:#ffb347; font-size:14px; font-weight:700;");

    ORDER.forEach(catKey => {
      const cat = CATALOG[catKey];
      if (!cat) return;

      console.log(
        `%c📂 Category: ${catKey}`,
        "color:#ffdd99; font-size:13px; font-weight:700;"
      );

      if (!Array.isArray(cat.items)) {
        console.log(`   ❌ cat.items missing`);
        return;
      }

      cat.items.forEach((item, i) => {
        if (!item) return;

        if (!Array.isArray(item.addons) || item.addons.length === 0) {
          console.log(`   ⚠️ [${i}] ${item.name} → No addons`);
        } else {
          console.log(`   ✅ [${i}] ${item.name} → ${item.addons.length} addons`, item.addons);
        }
      });
    });
  };

  document.getElementById("btnPrintCatalog").onclick = () => {
    console.log("%c📘 FULL CATALOG STATE", "color:#2aa2ff; font-size:14px; font-weight:700;");
    console.log(JSON.parse(JSON.stringify(CATALOG))); // deep clone for clarity
  };

  // ===== MARK PRODUCTS WITH/WITHOUT ADDONS =====
  window.addEventListener("activate", () => {
    setTimeout(() => {
      document.querySelectorAll(".product").forEach((card, index) => {
        const catKey = params.get("cat") || ORDER[0];
        const cat = CATALOG[catKey];
        if (!cat || !cat.items || !cat.items[index]) return;

        const item = cat.items[index];
        const badge = document.createElement("div");
        badge.style.position = "absolute";
        badge.style.top = "6px";
        badge.style.right = "6px";
        badge.style.padding = "3px 6px";
        badge.style.borderRadius = "6px";
        badge.style.fontSize = "11px";
        badge.style.fontWeight = "900";
        badge.style.zIndex = "999";

        if (!Array.isArray(item.addons) || item.addons.length === 0) {
          badge.style.background = "#ff4747";
          badge.textContent = "NO ADDONS";
        } else {
          badge.style.background = "#4CAF50";
          badge.textContent = item.addons.length + " ADDONS";
        }

        card.appendChild(badge);
      });
    }, 350);
  });

})();


/* =====================================================
   ☁️ Зареждане от облака (Firestore / API / localStorage)
   ===================================================== */
(async function loadFromCloud(){
  try {
    // 1) Firestore през BBQ_STORE
    if (window.BBQ_STORE && typeof window.BBQ_STORE.load === "function") {
      const data = await window.BBQ_STORE.load();
      if (data && typeof data === "object") {
        applyCatalogState(data);                 // ⬅️ ТУК ползваме helper-а
        console.log("✅ Данните са заредени през BBQ_STORE.");

        if (typeof window.__bbqAfterCloud === "function") {
          window.__bbqAfterCloud("firestore");
        }
        return;
      }
    }

    // 2) /api/catalog fallback
    const r = await fetch("/api/catalog", { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();

    if (data && typeof data === "object") {
      applyCatalogState(data);                  // ⬅️ пак helper
      console.log("✅ Данните са заредени от облака (/api/catalog).");
    }

    if (typeof window.__bbqAfterCloud === "function") {
      window.__bbqAfterCloud("api");
    }
  } catch (e) {
    console.warn("☁️ Облакът е недостъпен, зареждам от localStorage:", e);
    try {
      const raw = localStorage.getItem("BBQ_MAIN_CATALOG");
      if (raw) {
        const data = JSON.parse(raw);
        applyCatalogState(data);                // ⬅️ и тук
        console.log("✅ Заредено локално копие (offline fallback).");
      }
    } catch (e2) {
      console.warn("⚠️ Local fallback също неуспешен:", e2);
    }

    if (typeof window.__bbqAfterCloud === "function") {
      window.__bbqAfterCloud("local");
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

/* Сайдбар рендер – извиква се и първоначално, и след Firestore */
function renderSidebar(){
  if (!sidebar) return;
  sidebar.innerHTML = ORDER.map(key=>{
    const cat = CATALOG[key];
    if (!cat) return "";
    const label = (key === "promocii") ? "ПРОМОЦИИ" : cat.title;
    const img   = CAT_THUMBS[key];
    return `<a class="cat" data-cat="${key}" role="link" tabindex="0" aria-label="${esc(label)}">
              <div class="box" style="background-image:url('${img}')" data-label="${esc(label)}"></div>
            </a>`;
  }).join("");
}

/* 🧰 Инструменти върху категориите в сайдбара (редакция/изтриване и т.н.) */
function setupSidebarHoverTools() {
  if (!sidebar) return;

  const hosts = sidebar.querySelectorAll(".cat");
  hosts.forEach(host => {
    host.style.position = "relative";

    // да не закачаме по 100 пъти едни и същи слушатели
    if (host.dataset.toolsBound === "1") return;

    const tools = host.querySelector(".cat-hover-tools");
    if (!tools) return;

Object.assign(tools.style, {
  position: "absolute",
  top: "6px",
  right: "6px",
  display: "inline-flex",     // ❗ винаги inline-flex, не го крий тук
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

    // 🖱️ hover поведение – само когато НЕ сме в MOD
    if (!IS_MOD) {
      host.addEventListener("mouseenter", () => {
        tools.style.display = "inline-flex";
      });
      host.addEventListener("mouseleave", () => {
        tools.style.display = "none";
      });
    }

    host.dataset.toolsBound = "1";
  });
}

// първоначален рендер (преди да дойдат данните от Firestore)
if (!IS_MOD) {
  renderSidebar();          // в нормален режим си го рисуваме от JS
}
// в MOD само закачаме инструментите върху HTML-а от index2.html
setupSidebarHoverTools();

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

  // 🔶 Custom добавки, идващи от Firestore (it.addons)
  let customAddonsBlock = "";
  if (Array.isArray(it.addons) && it.addons.length) {
    customAddonsBlock = `
      <div class="addons">
        <div class="hdr">Добавки</div>
        ${
          it.addons.map(a => {
            const code  = (a.code || a.label || a.name || "").replace(/"/g, "&quot;");
            const label = esc(a.label || a.name || "Добавка");
            const price = Number(a.price || 0);

            return `
              <label class="addon-row">
                <input
                  type="checkbox"
                  class="addon-checkbox"
                  data-code="${code}"
                  data-price="${price}"
                >
                <span class="addon-icon">+</span>
                <span class="addon-name">${label}</span>
                <span class="addon-price">${price ? fmtLv(price) : ""}</span>
              </label>
            `;
          }).join("")
        }
      </div>
    `;
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
        ${ customAddonsBlock }

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



// Алиас за категории – sandvichi да отива към burgeri
const KEY_ALIAS = { sandvichi: "burgeri" };

/* ===== Активиране на категория + рендер ===== */
let current = null;

function activate(cat, { fromNav = false, replace = false } = {}) {
  // realCat може да се пренастройва по-надолу
  let realCat = KEY_ALIAS[cat] || cat;

  /* 🧡 ПРОМОЦИИ — промо страница */
  if (cat === "promocii") {
    current = "promocii";
    showPromosIframe(true);

    if (sidebar) {
      sidebar
        .querySelectorAll(".cat")
        .forEach((c) =>
          c.classList.toggle("active", c.dataset.cat === "promocii")
        );
    }

    const url = new URL(location.href);
    if (url.searchParams.get("cat") !== "promocii") {
      url.searchParams.set("cat", "promocii");
      if (replace) history.replaceState({ cat: "promocii" }, "", url);
      else if (fromNav) history.pushState({ cat: "promocii" }, "", url);
    }

    if (titleEl) titleEl.textContent = "ПРОМОЦИИ";
    if (grid) grid.innerHTML = "";

    // ако сме в режим модератор – включваме редакторските функции
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

  // === останалите категории ===
  showPromosIframe(false);

  // ако няма такава категория – падане към burgeri
  const exists = !!CATALOG[realCat];
  if (!exists) {
    cat = "burgeri";
    realCat = "burgeri";
  }

  current = realCat;

  if (sidebar) {
    sidebar
      .querySelectorAll(".cat")
      .forEach((c) =>
        c.classList.toggle("active", c.dataset.cat === realCat)
      );
  }

  if (titleEl)
    titleEl.textContent =
      CATALOG[realCat]?.title || realCat.toUpperCase();

  const url2 = new URL(location.href);
  if (url2.searchParams.get("cat") !== cat) {
    // пазим оригиналния slug (?cat=sandvichi)
    url2.searchParams.set("cat", cat);
    if (replace) history.replaceState({ cat }, "", url2);
    else if (fromNav) history.pushState({ cat }, "", url2);
  }

  const data = CATALOG[cat];
  if (!grid) return;

  // 🧩 Fallback: ако категорията няма items, вземи burgeri
  if (!data || !Array.isArray(data.items)) {
    const alias = { strandjanki: "burgeri", sandvichi: "burgeri" };
    const fallback = alias[cat];
    if (fallback && CATALOG[fallback]) {
      current = fallback;
      activate(fallback, { fromNav, replace });
      return;
    }
  }

  // === view: water2 (вода) ===
  if (data.view === "water2") {
    grid.innerHTML = `
      <div class="water-wrapper">
        ${data.groups
          .map(
            (g) => `
          <section class="water-block">
            <h2>${g.heading}</h2>
            <div class="water-grid">
              ${g.pair
                .map(
                  (p) => `
                <div class="water-card">
                  <img src="${p.src}" alt="${esc(p.label)}">
                  <div class="water-name">${esc(p.label)}</div>
                  ${
                    typeof p.price === "number"
                      ? `
                    <div class="price-badge">
                      <div class="lv">${fmtLv(p.price)}</div>
                      <div class="eur">${fmtEur(p.price)}</div>
                    </div>
                    <button class="add-btn"
                            data-name="${p.label.replace(/"/g, "&quot;")}"
                            data-price="${p.price}"
                            data-img="${p.src}">+</button>
                  `
                      : ``
                  }
                </div>
              `
                )
                .join("")}
            </div>
          </section>
        `
          )
          .join("")}
      </div>
    `;
    bindAddButtons();
    recalcMobileOffsets();
    ensurePlusRightUniversal();
    return;
  }

  // === view: gallery ===
  if (data.view === "gallery") {
    const hellPrice = data.hellPrice ?? 2.0;

    grid.innerHTML = data.groups
      .map((group) => {
        const pics = group.images
          .map((src) => {
            const label = esc(prettyLabel(src));
            return `
            <div>
              <div class="tile">
                <img src="${src}" alt="${label}">
                <div class="price-badge">
                  <div class="lv">${fmtLv(hellPrice)}</div>
                  <div class="eur">${fmtEur(hellPrice)}</div>
                </div>
                <button class="add-btn"
                        data-name="${label.replace(/"/g, "&quot;")}"
                        data-price="${hellPrice}"
                        data-img="${src}">+</button>
              </div>
              <div class="caption">${label}</div>
            </div>`;
          })
          .join("");

        return `
          <h2 class="sec-title">${esc(group.heading)}</h2>
          <div class="gallery">${pics}</div>
        `;
      })
      .join("");

    bindAddButtons();
    recalcMobileOffsets();
    ensureMobilePlusRight();
    return;
  }

  // === view: groups (подсекции с продукти) ===
  if (data.groups && Array.isArray(data.groups)) {
    const groupsHTML = data.groups
      .map(
        (group) => `
        <h2 class="sec-title">${esc(group.heading)}</h2>
        <div class="grid-products">
         ${group.items
           ?.map((it, i) =>
             productCardHTML(it, i, catHasAddons(current))
           )
           .join("")}
        </div>
      `
      )
      .join("");

    grid.innerHTML = groupsHTML;
    bindAddButtons();
    recalcMobileOffsets();
    ensureMobilePlusRight();
    renderAddonsSidePanels(realCat);
    return;
  }

  // === стандартен списък с продукти ===
  const items = data?.items || [];
  if (items.length === 0) {
    grid.innerHTML =
      `<p style="padding:16px;font-weight:700">Няма продукти в тази категория.</p>`;
    recalcMobileOffsets();
    return;
  }

  grid.innerHTML = `
    <div class="grid-products">
      ${items
        .map((it, i) =>
          productCardHTML(it, i, catHasAddons(current))
        )
        .join("")}
    </div>
  `;
  bindAddButtons();
  recalcMobileOffsets();
  ensureMobilePlusRight();
  renderAddonsSidePanels(realCat);
}




