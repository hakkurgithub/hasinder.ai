#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HAS İNSAN DER İcra Kurulları Tarayıcısı (hasinder.ai)
=====================================================
hasinder.com portalindaki icra kurullari, yonetim yapilari ve komisyon
bilgilerini periyodik olarak tarar ve hasinder.ai'nin standart Q&A semasina
({ "soru", "cevap" }) donusturerek hasinder-ai-data/icra-kurullari.json
dosyasina yazar.

Güvenlik (decoupled mimari):
- Yalnizca diğerdan veri ceker; sisteme ait hicbir ozel veri dişari gonderilmez.
- Hicbir API anahtari gomulu degildir.
- Sayfadaki script/style/noscript/iframe/object/svg gibi calistirilabilir veya
  zararli icerikleri ayiklar; sadece duz metin toplar.
- Uretilen dosya daha sonra otonom-ajan.py güvenlik suzgecinden gecirilir;
  zararli/bozuk icerik asla repoya giremez.

Bagimliliklar: requests, beautifulsoup4  (workflow: pip install requests beautifulsoup4)

Kullanim:  python scraper.py
"""

import os
import re
import json
import sys

import requests
from bs4 import BeautifulSoup

SCRIPT_DIZINI = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIZINI, "hasinder-ai-data")
CIKTI_DOSYASI = os.path.join(DATA_DIR, "icra-kurullari.json")

KURULLAR_URL = "https://www.hasinder.com/kurullar.php"
DESTEK_URL = "https://www.hasinder.com/"

# Bot korumasini asmak icin gercekci tarayici basligi (403 engelini onler).
BASLIKLAR = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "tr,en;q=0.8,en-US;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Calistirilabilir / zararli icerik etiketleri (tarama sirasinda ayiklanir)
AYIKLA = ("script", "style", "noscript", "iframe", "object", "embed", "svg")
# Zararli metin kalibi (yineleyen guvenlik kontrolu)
TEHLIKELI_KALIPLAR = [
    "<script", "javascript:", "<?php", "onload=", "onerror=", "onclick=",
    "<iframe", "vbscript:", "data:text/html", "eval(", "document.cookie",
    "alert(", "<embed", "<object", "<svg",
]


def _sayfa_getir(url):
    """Sayfayi ceker ve BeautifulSoup nesnesi dondurur; hata durumunda None."""
    try:
        r = requests.get(url, headers=BASLIKLAR, timeout=25)
        if r.status_code != 200:
            print(f"  [uyari] HTTP {r.status_code}: {url}")
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        for etiket in AYIKLA:
            for node in soup.find_all(etiket):
                node.decompose()
        return soup
    except Exception as e:
        print(f"  [uyari] sayfa okunamadi: {url} -> {e}")
        return None


def _temiz_metin(parca):
    """Ham paragrafi temiz, tek satirlik duz metne cevirir."""
    if not parca:
        return ""
    metin = re.sub(r"<[^>]+>", "", str(parca))
    metin = metin.replace("\xa0", " ")
    metin = re.sub(r"\s+", " ", metin).strip()
    # Sayfa kirliligi: tarih/config buton artiklari
    metin = re.sub(r"\b\d{1,2}\.\d{1,2}\.\d{4}\b", "", metin)  # 29.03.2026
    metin = re.sub(r"\bDetaylar\b", "", metin, flags=re.IGNORECASE)
    return " ".join(metin.split())


def _tr_lower(metin):
    """Türkçe karakterleri düz ASCII'ye çevirerek küçültür (İ quirk'i engeller)."""
    if not metin:
        return ""
    return (
        metin.replace("İ", "i").replace("I", "ı").replace("Ş", "s")
        .replace("Ğ", "g").replace("Ü", "u").replace("Ö", "o").replace("Ç", "c")
        .lower()
    )


def _guvenli_mi(metin):
    alt = (metin or "").lower()
    return any(k in alt for k in TEHLIKELI_KALIPLAR)


def kurullari_tara():
    """kurullar.php sayfasindaki icra kurulu / komisyon kartlarini toplar."""
    print(f" * {KURULLAR_URL} taraniyor...")
    soup = _sayfa_getir(KURULLAR_URL)
    kayitlar = []

    if soup is not None:
        # Her komisyon bir "card-hover" karti icindedir (baslik + tarih + aciklama
        # + kurul baskâni + iletisim bilgileri).
        kartlar = soup.select("div.card-hover")
        for kart in kartlar:
            tam = _temiz_metin(kart.get_text(" ", strip=True))
            if not tam or "icra kurulu" not in _tr_lower(tam):
                continue
            if _guvenli_mi(tam):
                continue
            # Baslik = ilk "İcra Kurulu" bolumune kadar olan kısım
            eslesme = re.search(r"(.+?İcra Kurulu)", tam, re.IGNORECASE)
            baslik = eslesme.group(1).strip() if eslesme else tam
            soru = f"{baslik} nedir ve görevleri nelerdir?"
            kayitlar.append({"soru": soru, "cevap": tam})

    # Kurullar sayfasi bos/ulasilamazsa anasayfadan en az genel bir kayit olustur
    if not kayitlar:
        print(" * kurullar sayfasindan veri toplanamadi, anasayfa deneniyor...")
        soup = _sayfa_getir(DESTEK_URL)
        if soup is not None:
            icerik = " ".join(
                _temiz_metin(p.get_text(" ", strip=True))
                for p in soup.find_all(["p", "li"])
            )
            if len(icerik) > 30 and not _guvenli_mi(icerik):
                kayitlar.append({
                    "soru": "HAS İNSAN DER icra kurullari ve yonetim yapisi nedir?",
                    "cevap": f"HAS İNSAN DER icra kurullari ve yonetim yapisi: {icerik[:1800]}",
                })

    return kayitlar


def ana():
    print("Icra Kurullari Tarayicisi Calisiyor...")
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)

    kayitlar = kurullari_tara()

    # Son guvenlik kontrolu
    temizler = [
        k for k in kayitlar
        if not (_guvenli_mi(k["soru"]) or _guvenli_mi(k["cevap"]))
        and isinstance(k.get("cevap"), str) and len(k["cevap"].strip()) >= 15
    ]
    print(f"Toplanan kayit: {len(kayitlar)}, guvenlik suzgecinden gecen: {len(temizler)}")

    if not temizler:
        print("SONUC: Tarama sonucu temiz veri elde edilemedi. Dosya guncellenmedi.")
        sys.exit(0)

    cikti = {
        "olusturuldu": "otonom",
        "kaynak": "https://www.hasinder.com/kurullar.php",
        "dataset": temizler,
    }
    with open(CIKTI_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(cikti, f, ensure_ascii=False, indent=4)

    print(f"SONUC: {len(temizler)} güvenli icra kurulu kaydi {CIKTI_DOSYASI} dosyasina yazildi.")
    sys.exit(0)


if __name__ == "__main__":
    ana()