/* novindex2.js */
"use strict";

/* ===========================
   🧭 ПЪТИЩА И ПОМОЩНИ НЕЩА
   =========================== */

/* 🔶 Промоции: лого и линкове (само за миниатюрата в сайдбара) */
const PROMO_IMG = (location.protocol === "file:")
  ? "file:///E:/BBQ_SITE/promociqlogo.jpg"
  : "/promociqlogo.jpg";
const PROMO_LINK_LOCAL = "file:///E:/BBQ_SITE/index7.html";
const PROMO_LINK_WEB   = "/index7.html";

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

/* ➜ Универсално: гарантира, че има бутон "+" след цената и го позиционира (като при вода) */
function ensurePlusRightUniversal(){
  const hosts = document.querySelectorAll('.product, .tile, .water-card');
  hosts.forEach(card => {
    const pad   = card.querySelector('.pad') || card;
    const price = pad.querySelector('.price-badge') || card.querySelector('.price-badge');
    if (!price) return;

    let plus = pad.querySelector('.add-btn') ||
               pad.querySelector('.mobile-add-btn') ||
               card.querySelector('.add-btn');

    if (!plus) {
      plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'add-btn';
      plus.textContent = '+';
    } else {
      plus.classList.add('add-btn');
      plus.classList.remove('mobile-add-btn');
    }

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

/* ====== LS ключове (index2 -> index3) ====== */
const LS_CART_ITEMS = "bbq_cart_items";
const LS_CART_TOTAL = "bbq_cart_total";
const LS_ORDER_NOTE = "bbq_order_note";
const noteWrapper   = document.getElementById("noteWrapper");
const orderNoteEl   = document.getElementById("orderNote");

/* Добавяне към количката */
function addToCart(item){
  CART.push(item);
  updateCartUI();
}

/* Основен рендер на количката */
function updateCartUI(){
  // бройка върху бутона
  cartCount.textContent = CART.length;

  // празна количка
  if (CART.length === 0){
    cartItemsEl.innerHTML = `<div class="cart-empty">Количката е празна.</div>`;
    cartTotalRow.style.display = "none";
    orderNowBtn.disabled = true;
    noteWrapper.style.display = "none";
    persistCartSnapshot();
    return;
  }

  // редове + видими добавки
  cartItemsEl.innerHTML = CART.map(it => {
    const addonsLine = it.addons?.length
      ? `<div style="font-size:12px; opacity:.8; margin-top:2px">
           + ${it.addons.map(a=>`${esc(a.label)} (${fmtLv(a.price)})`).join(", ")}
         </div>` : "";
    return `
      <div class="cart-item">
        <img src="${it.img}" alt="${esc(it.baseName || it.name)}">
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

  // премахване
  cartItemsEl.querySelectorAll("[data-remove]").forEach((btn)=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-remove");
      const i = CART.findIndex(x => String(x._id) === id);
      if (i>=0){ CART.splice(i,1); updateCartUI(); }
    });
  });

  // тотал + UI
  const total = CART.reduce((s, x)=> s + (Number(x.price)||0), 0);
  cartTotal.textContent = `${fmtLv(total)}  (${fmtEur(total)})`;
  cartTotalRow.style.display = "";
  orderNowBtn.disabled = false;
  noteWrapper.style.display = "block";

  persistCartSnapshot();

  // запис на бележката (връзваме само веднъж)
  if (!orderNoteEl.dataset.bound) {
    orderNoteEl.addEventListener("input", () => {
      localStorage.setItem(LS_ORDER_NOTE, orderNoteEl.value);
    });
    orderNoteEl.dataset.bound = "1";
  }
}

function restoreOrderNote(){
  orderNoteEl.value = localStorage.getItem(LS_ORDER_NOTE) || "";
}

function persistCartSnapshot(){
  try{
    const itemsSnapshot = CART.map(({_id, name, baseName, price, basePrice, img, addons}) => ({
      _id, name, baseName, price, basePrice, img, addons: addons || []
    }));
    const total = CART.reduce((s, x)=> s + (Number(x.price)||0), 0);
    localStorage.setItem(LS_CART_ITEMS, JSON.stringify(itemsSnapshot));
    localStorage.setItem(LS_CART_TOTAL, String(total));
    localStorage.setItem(LS_ORDER_NOTE, orderNoteEl.value || "");
  }catch(e){ console.warn("LS error:", e); }
}

function restoreCartFromLS() {
  try {
    const raw = localStorage.getItem(LS_CART_ITEMS);
    const items = JSON.parse(raw || "[]");

    if (Array.isArray(items) && items.length > 0) {
      items.forEach(it => CART.push({
        _id: it._id || (Date.now() + "" + Math.random()),
        name: it.name || "Без име",
        baseName: it.baseName || it.name || "Без име",
        price: Number(it.price) || Number(it.basePrice) || 0,
        basePrice: Number(it.basePrice) || Number(it.price) || 0,
        img: it.img || "",
        addons: Array.isArray(it.addons) ? it.addons : []
      }));
    }

    updateCartUI();
    restoreOrderNote();
  } catch (e) {
    console.warn("⚠️ Грешка при възстановяване на количката от LocalStorage:", e);
  }
}

/* Отваряне/затваряне на модала */
function openCart(){
  updateCartUI();
  cartOverlay.style.display = "flex";
  cartOverlay.setAttribute("aria-hidden","false");
  cartBtn.setAttribute("aria-expanded","true");   // a11y
}
function closeCart(){
  cartOverlay.style.display = "none";
  cartOverlay.setAttribute("aria-hidden","true");
  cartBtn.setAttribute("aria-expanded","false");  // a11y
}
document.getElementById("cartClose").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", (e)=>{ if(e.target === cartOverlay) closeCart(); });
cartBtn.addEventListener("click", openCart);
// затваряне с Escape
document.addEventListener("keydown", (e)=>{
  if (e.key === "Escape" && cartOverlay.style.display === "flex") closeCart();
});

/* Поръчай сега → index3.html (локално или уеб) */
orderNowBtn.addEventListener("click", ()=>{
  if (CART.length === 0) return;
  persistCartSnapshot();
  const target = (location.protocol === "file:") ? "file:///E:/BBQ_SITE/index3.html" : "index3.html";
  window.location.href = target;
});

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

/* === ПРОМОЦИИ (A + B) === */
const PROMOS = [
  {
    id: "promo1",
    a: { name: "ТЕЛЕШКА ПЛЕСКАВИЦА", img: "snimki/produkti/2menu/sharska.jpg" },
    b: { name: "Кола Кен", img: "snimki/produkti/КОЛА/kolaken.jpg" },
    price: 9.99,
    hero: "snimki/produkti/2menu/sharska.jpg"
  }
];

/* Подредба на категориите */
const ORDER = [
  "promocii",
  "burgeri","palachinki","strandzhanki","kartofi","salati","portsii","dobavki",
  "hell","voda","gazirana_voda","fanta","studen_chai","kola"
];

const sidebar = document.getElementById("sidebar");
const grid    = document.getElementById("productGrid");
const titleEl = document.getElementById("catTitle");

/* Делегиран клик за „Всичко“ (veg/sauce) */
grid.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-all");
  if (!btn) return;
  const group = btn.dataset.target;
  const host  = btn.closest(".addons");
  if (!group || !host) return;

  const boxes = [...host.querySelectorAll(`.addon-checkbox[data-group="${group}"]`)];
  if (!boxes.length) return;

  const allChecked = boxes.every(b => b.checked);
  boxes.forEach(b => b.checked = !allChecked);
});

/* Сайдбар рендер */
sidebar.innerHTML = ORDER.map(key=>{
  const label = (key === "promocii") ? "ПРОМОЦИИ" : (CATALOG[key].title);
  const img   = CAT_THUMBS[key];
  return `<a class="cat" data-cat="${key}" role="link" tabindex="0" aria-label="${label}">
            <div class="box" style="background-image:url('${img}')" data-label="${label}"></div>
          </a>`;
}).join("");

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

  let leftColAfterPhoto = "";
  let actionsRowHTML = "";
  let wholeAddonsBlock = "";

  let mobileVeg = "";
  let mobileSauces = "";
  let mobileAddons = "";
  let mobileAddBtn = `
    <button class="mobile-add-btn add-btn"
      data-name="${(it.name || "").replace(/"/g,"&quot;")}"
      data-price="${it.price}"
      data-img="${it.img}">+</button>
  `;

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

      leftColAfterPhoto = `
        <div class="addons addons-underimg">
          <div class="hdr">
            Изберете с какво да бъде
            <button type="button" class="btn-all" data-target="veg">Всичко</button>
          </div>
          ${vegList.map(x => `
            <label>
              <input type="checkbox" class="addon-checkbox" data-group="veg" data-code="${x.c}" data-price="0"> ${x.t}
            </label>
          `).join("")}
        </div>`;
      actionsRowHTML = `
        <div class="actions-row">
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
          <button class="add-btn"
            data-name="${(it.name || "").replace(/"/g,"&quot;")}"
            data-price="${it.price}"
            data-img="${it.img}">+</button>
        </div>`;

      mobileVeg = `
        <div class="mobile-veg">
          <div class="hdr">
            Изберете с какво да бъде
            <button type="button" class="btn-all" data-target="veg">Всичко</button>
          </div>
          ${vegList.map(x => `
            <label>
              <input type="checkbox" class="addon-checkbox" data-group="veg" data-code="${x.c}" data-price="0"> ${x.t}
            </label>
          `).join("")}
        </div>`;
      mobileSauces = `
        <div class="mobile-sauces">
          <div class="hdr">
            Сосове
            <button type="button" class="btn-all" data-target="sauce">Всичко</button>
          </div>
          ${sauces.map(x => `
            <label>
              <input type="checkbox" class="addon-checkbox" data-group="sauce" data-code="${x.c}" data-price="0"> ${x.t}
            </label>
          `).join("")}
        </div>`;
    } else if (current === "portsii") {
      wholeAddonsBlock = `
        <div class="actions-row">
          <div class="addons">
            <div class="hdr">Добавки</div>
            <label><input type="checkbox" class="addon-checkbox" data-code="pitka" data-price="1.5"> + Питка</label>
            <label><input type="checkbox" class="addon-checkbox" data-code="raz" data-price="1.5"> + Разядка 100 гр</label>
          </div>
          <button class="add-btn"
            data-name="${(it.name || "").replace(/"/g,"&quot;")}"
            data-price="${it.price}"
            data-img="${it.img}">+</button>
        </div>`;
      mobileAddons = `
        <div class="mobile-addons">
          <div class="hdr">Добавки</div>
          <label><input type="checkbox" class="addon-checkbox" data-code="pitka" data-price="1.5"> + Питка</label>
          <label><input type="checkbox" class="addon-checkbox" data-code="raz" data-price="1.5"> + Разядка 100 гр</label>
        </div>`;
    } else if (current === "strandzhanki") {
      wholeAddonsBlock = `
        <div class="actions-row">
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
          <button class="add-btn"
            data-name="${(it.name || "").replace(/"/g,"&quot;")}"
            data-price="${it.price}"
            data-img="${it.img}">+</button>
        </div>`;
      mobileSauces = `
        <div class="mobile-sauces">
          <div class="hdr">
            Сосове
            <button type="button" class="btn-all" data-target="sauce">Всичко</button>
          </div>
          <label><input type="checkbox" class="addon-checkbox" data-group="sauce" data-code="ketchup" data-price="0"> Кетчуп</label>
          <label><input type="checkbox" class="addon-checkbox" data-group="sauce" data-code="mayo"    data-price="0"> Майонеза</label>
          <label><input type="checkbox" class="addon-checkbox" data-group="sauce" data-code="mustard" data-price="0"> Горчица</label>
          <label><input type="checkbox" class="addon-checkbox" data-group="sauce" data-code="chili"   data-price="0"> Люто</label>
        </div>`;
    }
  }

  return `
    <article class="product ${i % 2 ? "even" : ""}">
      <div class="leftcol">
        <div class="photo" style="background-image:url('${it.img}')"></div>
        ${mobileTitle}
        ${leftColAfterPhoto}
      </div>

      <div class="pad">
        <h3 class="title">${esc(it.name)}</h3>
        ${desc}

        ${mobileVeg}
        ${mobileSauces}
        ${mobileAddons}

        ${pricePlusRow}

        ${ current === "burgeri" ? actionsRowHTML : (wholeAddonsBlock || "") }

        ${mobileAddBtn}
      </div>
    </article>`;
}

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
  grid.querySelectorAll(".add-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const card = btn.closest(".product");
      const baseName  = btn.getAttribute("data-name");
      const basePrice = Number(btn.getAttribute("data-price")) || 0;
      const img       = btn.getAttribute("data-img") || "";

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
      if (parts.length) {
        const line = `${baseName}: ${parts.join("; ")}`;
        const cur  = (orderNoteEl.value || "").trim();
        orderNoteEl.value = cur ? (cur + "\n" + line) : line;
        localStorage.setItem(LS_ORDER_NOTE, orderNoteEl.value);
      }

      btn.textContent = "✓";
      setTimeout(()=> btn.textContent = "+", 450);

      checks.forEach(ch => ch.checked = false);
    });
  });
}

/* === ПРОМО: „+“ → добавяне в количката като един артикул (централен бутон) === */
function bindPromoButtons(){
  grid.querySelectorAll(".promo-card .promo-add").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".promo-card");
      const id = card?.getAttribute("data-promo-id");
      const p = PROMOS.find(x => x.id === id);
      if (!p) return;

      const displayName = `ПРОМО: ${p.a.name} + ${p.b.name}`;
      const img = p.hero || p.a.img || p.b.img || "";
      const price = Number(p.price) || 0;

      addToCart({
        _id: Date.now() + "" + Math.random(),
        name: displayName,
        baseName: displayName,
        price: price,
        basePrice: price,
        img,
        addons: [{ code: "promo", label: "Промо пакет", price: 0 }]
      });

      // запис в бележката (по-ясно за кухнята)
      const line = `${displayName} (${fmtLv(price)} / ${fmtEur(price)})`;
      const cur  = (orderNoteEl.value || "").trim();
      orderNoteEl.value = cur ? (cur + "\n" + line) : line;
      localStorage.setItem(LS_ORDER_NOTE, orderNoteEl.value);

      // малка визуална обратна връзка
      const was = btn.textContent;
      btn.textContent = "✓";
      setTimeout(() => (btn.textContent = was), 450);
    });
  });
}

/* ===== Активиране на категория + рендер ===== */
let current = null;

function activate(cat, {fromNav=false, replace=false} = {}){

  /* 🧡 ПРОМОЦИИ — статичен изглед като Снимка 1 (централен „+“) */
  if (cat === "promocii") {
    current = "promocii";
    sidebar.querySelectorAll(".cat")
      .forEach(c => c.classList.toggle("active", c.dataset.cat === "promocii"));

    const url = new URL(location.href);
    if (url.searchParams.get("cat") !== "promocii") {
      url.searchParams.set("cat", "promocii");
      if (replace) history.replaceState({ cat: "promocii" }, "", url);
      else if (fromNav) history.pushState({ cat: "promocii" }, "", url);
    }

    titleEl.textContent = "ПРОМОЦИИ";

    grid.innerHTML = `
      <section class="promo-wrap">
        <h2 class="promo-head">🔥 Corner BBQ — Промоции</h2>
        <div class="promo-grid">
          ${PROMOS.map(p => `
            <article class="promo-card" data-promo-id="${p.id}">
              <div class="promo-sides">
                <div class="promo-img" style="background-image:url('${p.a.img}')"></div>
                <div class="promo-img" style="background-image:url('${p.b.img}')"></div>
              </div>
              <div class="promo-price">${fmtLv(p.price)}</div>
              <!-- Централният кръгъл „+“ -->
              <button class="promo-add" type="button" aria-label="Добави промо">+</button>
            </article>
          `).join("")}
        </div>
      </section>
    `;

    bindPromoButtons();
    recalcMobileOffsets();
    ensurePlusRightUniversal?.();
    return;
  }

  const exists = !!CATALOG[cat];
  if(!exists) cat = "burgeri";
  current = cat;

  sidebar.querySelectorAll(".cat").forEach(c=>c.classList.toggle("active", c.dataset.cat===cat));
  titleEl.textContent = CATALOG[cat]?.title || cat.toUpperCase();

  const url2 = new URL(location.href);
  if (url2.searchParams.get("cat") !== cat) {
    url2.searchParams.set("cat", cat);
    if (replace) history.replaceState({cat}, "", url2);
    else if (fromNav) history.pushState({cat}, "", url2);
  }

  const data = CATALOG[cat];

  if (data.view === "water2") {
    grid.innerHTML = `
      <div class="water-wrapper">
        ${data.groups.map(g=>`
          <section class="water-block">
            <h2>${g.heading}</h2>
            <div class="water-grid">
              ${g.pair.map(p=>`
                <div class="water-card">
                  <img src="${p.src}" alt="${p.label}">
                  <div class="water-name">${p.label}</div>
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
    return;
  }

  if (data.view === "gallery") {
    const hellPrice = data.hellPrice ?? 2.00;
    grid.innerHTML = data.groups.map(group=>{
      const pics = group.images.map(src=>{
        const label = prettyLabel(src);
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
        <h2 class="sec-title">${group.heading}</h2>
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
      <h2 class="sec-title">${group.heading}</h2>
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

/* POP DELAY в сайдбара */
const POP_DELAY = 100; // ms
function shouldBypassDelay(evt){ return evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey || evt.button === 1; }
function popThenActivate(el, key){
  el.classList.remove("is-pressed"); el.classList.add("is-popping"); el.dataset.locked = "1";
  setTimeout(()=>{ activate(key, {fromNav:true}); el.classList.remove("is-popping"); delete el.dataset.locked; }, POP_DELAY);
}

/* Чети cat от URL при зареждане */
function initFromURL(){
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat") || "burgeri";
  activate(cat, {replace:true});
}

/* Възстанови количката при първо зареждане */
restoreCartFromLS();
restoreOrderNote();
initFromURL();

/* Събития за сайдбар картите */
sidebar.querySelectorAll(".cat").forEach(catEl=>{
  const key = catEl.dataset.cat;
  catEl.addEventListener("touchstart", ()=>{
    catEl.classList.add("is-pressed");
    setTimeout(()=>catEl.classList.remove("is-pressed"), 120);
  }, {passive:true});
  catEl.addEventListener("mousedown", ()=>catEl.classList.add("is-pressed"));
  catEl.addEventListener("mouseleave", ()=>catEl.classList.remove("is-pressed"));
  catEl.addEventListener("mouseup",   ()=>catEl.classList.remove("is-pressed"));
  catEl.addEventListener("click", (e)=>{
    if (shouldBypassDelay(e)) return;
    e.preventDefault();
    if (catEl.dataset.locked==="1" || key===current) return;
    popThenActivate(catEl, key);
  });
  catEl.addEventListener("keydown", (e)=>{
    if (e.key==="Enter" || e.key===" "){
      e.preventDefault();
      if (catEl.dataset.locked==="1" || key===current) return;
      popThenActivate(catEl, key);
    }
  });
});

/* Back/Forward */
addEventListener("popstate", (e)=>{
  const cat = (e.state && e.state.cat) || new URLSearchParams(location.search).get("cat") || "burgeri";
  activate(cat, {replace:true});
});

/* Почистване на класове при pageshow */
addEventListener("pageshow", ()=>{
  sidebar.querySelectorAll(".cat").forEach(c=>{ c.classList.remove("is-pressed","is-popping"); delete c.dataset.locked; });
});

/* Плаващо движение на бутона „Начало“ */
(function(){
  const home = document.querySelector(".home-pill");
  const content = document.querySelector(".content");
  if(!home || !content) return;

  const TOP = 16, BOTTOM_MARGIN = 16, SPEED = 0.25;
  let cur = 0, target = 0, rafId = 0;

  function maxShift(){ return Math.max(0, window.innerHeight - TOP - BOTTOM_MARGIN - home.offsetHeight); }
  function updateLeft(){
    const rect = content.getBoundingClientRect();
    home.style.left = (rect.left + 20) + "px";
  }
  function onScroll(){
    const doc = document.documentElement;
    const scrollMax = Math.max(1, doc.scrollHeight - window.innerHeight);
    const progress = window.scrollY / scrollMax;
    target = progress * maxShift();
    if(!rafId) rafId = requestAnimationFrame(tick);
  }
  function tick(){
    rafId = 0;
    cur += (target - cur) * SPEED;
    home.style.transform = `translateY(${cur.toFixed(2)}px)`;
    if (Math.abs(target - cur) > 0.5) rafId = requestAnimationFrame(tick);
  }
  addEventListener("scroll", onScroll, {passive:true});
  addEventListener("resize", ()=>{ updateLeft(); onScroll(); });
  updateLeft(); onScroll();
})();

/* HOME според средата */
(function(){
  const home = document.querySelector(".home-pill");
  if (!home) return;
  const HOME_LOCAL = "file:///E:/BBQ_SITE/index.html";
  const HOME_WEB   = "index.html";
  home.addEventListener("click", function(e){
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1) return;
    e.preventDefault();
    const target = (location.protocol === "file:") ? HOME_LOCAL : HOME_WEB;
    window.location.href = target;
  });
})();

/* ===== ДИНАМИЧНИ ОФСЕТИ (мобилен) ===== */
function recalcMobileOffsets(){
  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  if(!isMobile) return;

  const cart = document.getElementById("cartBtn");
  const sb   = document.querySelector(".sidebar");

  const cartH = cart ? Math.ceil(cart.offsetHeight) + 12 : 54;
  const sbH   = sb   ? Math.ceil(sb.getBoundingClientRect().height) : 100;

  document.documentElement.style.setProperty("--mobile-cart-h", cartH + "px");
  document.documentElement.style.setProperty("--mobile-sidebar-h", sbH + "px");
}
addEventListener("load", recalcMobileOffsets, { once:true });
addEventListener("resize", recalcMobileOffsets);
addEventListener("orientationchange", recalcMobileOffsets);

const sidebarNode = document.getElementById("sidebar");
if (sidebarNode) {
  const sbObserver = new MutationObserver(recalcMobileOffsets);
  sbObserver.observe(sidebarNode, { childList:true, subtree:true });
}

/* Скриване/показване на сайдбара при скрол */
let lastScrollY = window.scrollY;
let ticking = false;

function handleScrollHideSidebar() {
  const sidebarEl = document.querySelector(".sidebar");
  if (!sidebarEl) { ticking = false; return; }

  const currentY = window.scrollY;
  if (currentY > lastScrollY + 10) {
    sidebarEl.classList.add("hide-on-scroll");
  } else if (currentY < lastScrollY - 10) {
    sidebarEl.classList.remove("hide-on-scroll");
  }
  lastScrollY = currentY;
  ticking = false;
}

addEventListener("scroll", () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(handleScrollHideSidebar);
  }
}, { passive:true });

/* === FULLSCREEN ZOOM: двойно докосване/клик === */
(function(){
  const lb     = document.getElementById('bbqLightbox');
  const lbImg  = document.getElementById('bbqLightImg');
  const lbClose= lb ? lb.querySelector('.close') : null;
  if (!lb || !lbImg || !lbClose) return;

  function extractBgUrl(el){
    const bg = getComputedStyle(el).backgroundImage || '';
    const m = bg.match(/url\(["']?(.*?)["']?\)/i);
    return m ? m[1] : '';
  }
  function openLightboxFrom(el){
    const src = el.tagName === 'IMG' ? el.src : extractBgUrl(el);
    if(!src) return;
    lbImg.src = src;
    lb.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    lb.classList.remove('show');
    document.body.style.overflow = '';
  }

  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', e => { if(e.target===lb) closeLightbox(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeLightbox(); });

  // Desktop: двойно кликване
  document.addEventListener('dblclick', e => {
    const photo = e.target.closest('.photo, .water-card img, .tile img');
    if (!photo) return;
    openLightboxFrom(photo);
  });

  // Mobile: двойно докосване
  let lastTap = 0, tapTarget = null;
  document.addEventListener('touchend', e => {
    const photo = e.target.closest('.photo, .water-card img, .tile img');
    if (!photo) return;
    const now = Date.now();
    if (tapTarget === photo && (now - lastTap) < 300) {
      openLightboxFrom(photo);
      tapTarget = null; lastTap = 0;
    } else {
      tapTarget = photo; lastTap = now;
    }
  }, { passive:true });
})();
