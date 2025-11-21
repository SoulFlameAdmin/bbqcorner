import requests
import os

# Къде да запишем снимките
save_dir = r"E:\BBQ_SITE\snimki\produkti"
os.makedirs(save_dir, exist_ok=True)

# Линковете към снимките
urls = [
    "https://corner.vent.bg/images/d84bf17b-304c-f011-adf7-6451065cebaa_1.jpg?01102025014454",
    "https://corner.vent.bg/images/c5aa0a79-8134-f011-adea-6451065cebaa_1.jpg?01102025014454",
    "https://corner.vent.bg/images/a8b42cd5-442f-f011-ade6-6451065cebaa_1.jpg?01102025014454",
    "https://corner.vent.bg/images/d13f4ef9-432f-f011-ade6-6451065cebaa_1.jpg?01102025014454",
    "https://corner.vent.bg/images/051207c4-442f-f011-ade6-6451065cebaa_1.jpg?01102025014454",
    "https://corner.vent.bg/images/9222cbec-432f-f011-ade6-6451065cebaa_1.jpg?01102025014454",
    "https://corner.vent.bg/images/bc5f3564-432f-f011-ade6-6451065cebaa_1.jpg?01102025014454",
    "https://corner.vent.bg/images/bd0d7d21-134d-f011-adf7-6451065cebaa_0.jpg?01102025014454",
    "https://corner.vent.bg/images/bc0d7d21-134d-f011-adf7-6451065cebaa_0.jpg?01102025014454",
    "https://corner.vent.bg/images/625a9c31-134d-f011-adf7-6451065cebaa_0.jpg?01102025014454",
    "https://corner.vent.bg/images/9dc9e8ba-422f-f011-ade6-6451065cebaa_1.jpg?01102025014454",
    "https://corner.vent.bg/images/d412c69a-3f2f-f011-ade6-6451065cebaa_1.jpg?01102025014454",
    "https://corner.vent.bg/images/4e5cce22-3e2f-f011-ade6-6451065cebaa_1.jpg?01102025014454",
    "https://corner.vent.bg/images/5c9b0055-134d-f011-adf7-6451065cebaa_0.jpg?01102025014453",
    "https://corner.vent.bg/images/01983b62-134d-f011-adf7-6451065cebaa_0.jpg?01102025014453",
    "https://corner.vent.bg/images/d8015f3c-134d-f011-adf7-6451065cebaa_0.jpg?01102025014453",
    "https://corner.vent.bg/images/625a9c31-134d-f011-adf7-6451065cebaa_0.jpg?01102025014453",
    "https://corner.vent.bg/images/bd0d7d21-134d-f011-adf7-6451065cebaa_0.jpg?01102025014453",
    "https://corner.vent.bg/images/bc0d7d21-134d-f011-adf7-6451065cebaa_0.jpg?01102025014453",
    "https://corner.vent.bg/images/1903b86a-134d-f011-adf7-6451065cebaa_0.jpg?01102025014452",
    "https://corner.vent.bg/images/02983b62-134d-f011-adf7-6451065cebaa_0.jpg?01102025014452",
    "https://corner.vent.bg/images/01983b62-134d-f011-adf7-6451065cebaa_0.jpg?01102025014452",
    "https://corner.vent.bg/images/9187164b-134d-f011-adf7-6451065cebaa_0.jpg?01102025014452",
    "https://corner.vent.bg/images/9087164b-134d-f011-adf7-6451065cebaa_0.jpg?01102025014452",
    "https://corner.vent.bg/images/d9015f3c-134d-f011-adf7-6451065cebaa_0.png?01102025014452",
    "https://corner.vent.bg/images/d8015f3c-134d-f011-adf7-6451065cebaa_0.jpg?01102025014452",
    "https://corner.vent.bg/images/625a9c31-134d-f011-adf7-6451065cebaa_0.jpg?01102025014452",
    "https://corner.vent.bg/images/bc0d7d21-134d-f011-adf7-6451065cebaa_0.jpg?01102025014452"
]

# Сваляне на файловете
for i, url in enumerate(urls, start=1):
    try:
        ext = ".jpg"
        if ".png" in url.lower():
            ext = ".png"
        filename = f"img{i}{ext}"
        filepath = os.path.join(save_dir, filename)

        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            with open(filepath, "wb") as f:
                f.write(r.content)
            print(f"[OK] {filename}")
        else:
            print(f"[ERR] {url} -> {r.status_code}")
    except Exception as e:
        print(f"[FAIL] {url} -> {e}")
