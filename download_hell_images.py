# -*- coding: utf-8 -*-
"""
HELL image crawler/downloader
Сваля изображения на кенове от официалните сайтове:
- https://www.hellenergy.com (продукти)
- https://hellicecoffee.com/products/ (Ice Coffee)
Записва в: E:\BBQ_SITE\hell_sminki
"""

import os, re, sys, time, itertools
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

# === НАСТРОЙКИ ===
OUT_DIR = r"E:\BBQ_SITE\hell_sminki"
START_URLS = [
    "https://www.hellenergy.com/en/products/",      # основен продуктов каталог (англ.)
    "https://www.hellenergy.com/in/in-products/",   # алтернативен регион, ако EN не зареди
    "https://hellicecoffee.com/products/",          # ICE COFFEE продукти
]
ALLOWED_DOMAINS = {"www.hellenergy.com", "hellicecoffee.com"}
# Ще пазим само типични продуктови изображения
IMG_ALLOW_PATTERNS = [
    r"/products?/", r"/product/", r"/uploads/", r"/wp-content/", r"/media/",
    r"/ice[-_]?coffee", r"hell.*(classic|zero|black|apple|grape|peach|berry|new|focus|multi|night)",
]
IMG_EXTS = {".png", ".jpg", ".jpeg", ".webp"}  # ще конвертираме имената, но не съдържанието

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HELL-ImageBot/1.0"
}

# === Помощни ===
os.makedirs(OUT_DIR, exist_ok=True)

def looks_like_product_img(url: str) -> bool:
    u = url.lower()
    if not any(u.endswith(ext) or (f"{ext}?" in u) for ext in IMG_EXTS):
        return False
    return any(re.search(pat, u) for pat in IMG_ALLOW_PATTERNS)

def normalize_filename(url: str) -> str:
    path = urlparse(url).path
    base = os.path.basename(path)
    # изчисти query
    base = re.sub(r"[?#].*$", "", base)
    if not base:
        base = "hell.png"
    # по-красиви имена
    base = base.lower()
    base = re.sub(r"(%20|\s)+", "-", base)
    base = re.sub(r"[^a-z0-9\.\-_]+", "-", base).strip("-")
    # гаранция за разширение
    _, ext = os.path.splitext(base)
    if ext.lower() not in IMG_EXTS:
        base += ".png"
    return base

def uniquify(path: str) -> str:
    if not os.path.exists(path):
        return path
    root, ext = os.path.splitext(path)
    for i in itertools.count(2):
        cand = f"{root}-{i}{ext}"
        if not os.path.exists(cand):
            return cand

def fetch(url: str) -> requests.Response:
    return requests.get(url, headers=HEADERS, timeout=30)

def collect_imgs_from_html(base_url: str, html: str) -> set[str]:
    soup = BeautifulSoup(html, "html.parser")
    candidates = set()

    # <img src=...>
    for tag in soup.find_all("img"):
        src = tag.get("src") or tag.get("data-src") or tag.get("data-lazy-src")
        if not src: 
            continue
        full = urljoin(base_url, src)
        candidates.add(full)

    # background-image: url(...) в inline style
    for tag in soup.select("[style]"):
        m = re.findall(r"url\(['\"]?([^'\"\)]+)", tag["style"])
        for s in m:
            candidates.add(urljoin(base_url, s))

    # и от <source srcset> / <img srcset>
    for tag in soup.find_all(["source","img"]):
        srcset = tag.get("srcset")
        if srcset:
            for part in srcset.split(","):
                url_part = part.strip().split(" ")[0]
                if url_part:
                    candidates.add(urljoin(base_url, url_part))

    # филтрирай по домейн и шаблон
    final = set()
    for u in candidates:
        netloc = urlparse(u).netloc
        if netloc and netloc not in ALLOWED_DOMAINS:
            continue
        if looks_like_product_img(u):
            final.add(u)
    return final

def crawl_and_download():
    seen_pages = set()
    img_urls = set()

    # първо – вземи изображения директно от стартовите страници
    for url in START_URLS:
        try:
            r = fetch(url)
            if r.status_code == 200:
                img_urls |= collect_imgs_from_html(url, r.text)
                seen_pages.add(url)
        except Exception as e:
            print(f"[warn] {url}: {e}")

    # второ – обиколи линковете от продуктови плочки (само в рамките на домейните)
    to_visit = set()
    for url in list(seen_pages):
        try:
            r = fetch(url); r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            for a in soup.find_all("a", href=True):
                full = urljoin(url, a["href"])
                p = urlparse(full)
                if p.netloc in ALLOWED_DOMAINS and full not in seen_pages:
                    # вероятни продуктови страници
                    if re.search(r"/product", p.path, re.I) or re.search(r"/products", p.path, re.I):
                        to_visit.add(full)
        except Exception as e:
            print(f"[warn] follow {url}: {e}")

    # посети до 60 страници максимум
    for url in list(to_visit)[:60]:
        try:
            r = fetch(url)
            if r.status_code == 200:
                img_urls |= collect_imgs_from_html(url, r.text)
                time.sleep(0.5)
        except Exception as e:
            print(f"[warn] visit {url}: {e}")

    print(f"[info] намерени изображения: {len(img_urls)}")
    # изтегляне
    saved = 0
    for u in sorted(img_urls):
        try:
            resp = fetch(u)
            if resp.status_code != 200 or ("image" not in resp.headers.get("Content-Type","")):
                continue
            fname = normalize_filename(u)
            out_path = uniquify(os.path.join(OUT_DIR, fname))
            with open(out_path, "wb") as f:
                f.write(resp.content)
            saved += 1
            print(f"[ok] {out_path}")
        except Exception as e:
            print(f"[err] {u}: {e}")

    print(f"[done] запазени файлове: {saved} → {OUT_DIR}")

if __name__ == "__main__":
    crawl_and_download()
