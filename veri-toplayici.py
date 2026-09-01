#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Otonom Açık Veri Toplayıcı (hasinder.ai)
========================================
GitHub Actions içinde çalışan bu betik, internet üzerindeki açık ve GÜVENLİ
JSON veri portallarından (resmî istatistikler, döviz verileri) güncel bilgileri
çeker ve bunları hasinder.ai'nin standart Q&A şemasına ({ "soru", "cevap" })
dönüştürüp hasinder-ai-data/otonom-veri.json dosyasına yazar.

Güvenlik ilkeleri (decoupled mimari):
- YALNIZCA dışarıdan veri çeker; sisteme ait hiçbir özel veri dışarı gönderilmez.
- Hiçbir API anahtarı gömülü değildir (sadece anahtarsız açık uç noktalar kullanılır).
- Üretilen JSON saf metin içerir; HTML/script/enjeksiyon barındırmaz.
- Üretilen dosya daha sonra otonom-ajan.py güvenlik süzgecinden geçirilir;
  zararlı/bozuk içerik asla repoya/canlı sisteme giremez.
- Bağımlılık yoktur (yalnızca Python standart kütüphanesi: urllib, json).

Kullanım:  python veri-toplayici.py
"""

import os
import re
import json
import sys
import urllib.request

SCRIPT_DIZINI = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIZINI, "hasinder-ai-data")
CIKTI_DOSYASI = os.path.join(DATA_DIR, "otonom-veri.json")
TIME_OUT = 30

# Anahtarsız, açık ve resmî veri kaynakları
DUNYA_BANKASI = "http://api.worldbank.org/v2/country/TUR/indicator/{kodu}?format=json&per_page=6&date=2018:2026"
FRANKFURTER = "https://api.frankfurter.app/latest?from=USD&to=TRY"

# Türkiye ekonomisi / dış ticaret göstergeleri (anahtar kelimeler: dış ticaret,
# gümrük, ekonomi, istatistik). Her kod için Türkçe etiket.
GOSTERGELER = {
    "TX.VAL.MRCH.CD.WT": "mal ihracatı (USD)",
    "TM.VAL.MRCH.CD.WT": "mal ithalatı (USD)",
    "NY.GDP.MKTP.CD":   "Gayri Safi Yurt İçi Hasıla (GSYİH, USD)",
    "FP.CPI.TOTL.ZG":   "yıllık tüketici fiyat enflasyonu (%)",
    "BN.CAB.XOKA.CD":   "cari işlemler dengesi (USD)",
    "NE.TRD.GNFS.ZS":   "mal ve hizmet ticaretinin GSYİH içindeki payı (%)",
}

# Enjeksiyon / zararlı içerik kalıpları (üretilen metni de güvenceye alır)
TEHLIKELI_KALIPLAR = [
    "<script", "javascript:", "<?php", "onload=", "onerror=", "onclick=",
    "<iframe", "vbscript:", "data:text/html", "eval(", "document.cookie",
    "alert(", "<embed", "<object", "<svg",
]


def _safe_get(url):
    """Belirtilen URL'den JSON döndürür; hata durumunda None."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "hasinder.ai/1.0"})
        with urllib.request.urlopen(req, timeout=TIME_OUT) as r:
            if r.status != 200:
                return None
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        print(f"  [uyari] kaynak okunamadi: {url} -> {e}")
        return None


def _temiz_metin(parca):
    """Metni güvenli düz metne çevirir (HTML/script kalıntısı temizlenir)."""
    if not parca:
        return ""
    metin = re.sub(r"<[^>]+>", "", str(parca))          # HTML etiketleri
    metin = metin.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    metin = re.sub(r"\s+", " ", metin).strip()
    return metin


def _guvenli_mi(metin):
    """Üretilen metin zararlı kalıp içeriyorsa True döner (reddedilir)."""
    alt = metin.lower()
    return any(k in alt for k in TEHLIKELI_KALIPLAR)


def _sayi_format(sayi, ek):
    """Değeri sade bir sayı biçimine çevirir."""
    if sayi is None:
        return "veri bulunamadı"
    try:
        deger = float(sayi)
    except (TypeError, ValueError):
        return str(sayi)
    buyuk = abs(deger) >= 1_000_000_000
    if buyuk:
        return f"{deger / 1_000_000_000:.2f} milyar USD"
    if abs(deger) >= 1_000_000:
        return f"{deger / 1_000_000:.2f} milyon USD"
    return f"{deger:,.2f} {ek}"


def dunya_bankasi_verileri():
    """Dünya Bankası göstergelerinden Türkçe Q&A kayıtları üretir."""
    kayitlar = []
    for kod, etiket in GOSTERGELER.items():
        veri = _safe_get(DUNYA_BANKASI.format(kodu=kod))
        if not veri or not isinstance(veri, list) or len(veri) < 2:
            continue
        satirlar = veri[1] or []
        if not satirlar:
            continue
        for satir in satirlar:
            yil = satir.get("date")
            deger = satir.get("value")
            if not yil or deger is None:
                continue
            soru = f"Türkiye'nin {yil} yılı {etiket} ne kadardı?"
            aciklama = (
                f"Türkiye'nin {yil} yılı {etiket} {_sayi_format(deger, '')} olarak "
                "kaydedilmiştir. Değer, resmî veri portalı Dünya Bankası açık "
                "API'sinden (World Bank Open Data) alınmıştır."
            )
            kayitlar.append({"soru": soru, "cevap": aciklama})
    return kayitlar


def doviz_verileri():
    """Frankfurter açık döviz API'sinden USD->TRY bilgisi üretir."""
    veri = _safe_get(FRANKFURTER)
    if not veri or "rates" not in veri:
        return []
    try:
        oran = veri["rates"].get("TRY")
        tarih = veri.get("date", "güncel")
        oran_s = f"{float(oran):,.2f}"
    except (TypeError, ValueError):
        return []
    soru = "1 Amerikan Doları kaç Türk Lirası?"
    cevap = (
        f"Güncel döviz verilerine göre 1 Amerikan Doları {oran_s} Türk Lirası "
        f"değerindedir (döviz kuru tarihi: {tarih}). Kaynak: açık döviz API'si "
        "Frankfurter App."
    )
    return [{"soru": soru, "cevap": cevap}]


def ana():
    print("Otonom Veri Toplayici Calisiyor...")
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)

    kayitlar = []
    print(" * Dunya Bankasi (Türkiye ekonomi/dis ticaret) taranıyor...")
    kayitlar += dunya_bankasi_verileri()
    print(" * Frankfurter (doviz) taranıyor...")
    kayitlar += doviz_verileri()

    # Toplam ve güvenlik kontrolü
    toplam = len(kayitlar)
    temizler = [k for k in kayitlar if not (_guvenli_mi(k["soru"]) or _guvenli_mi(k["cevap"]))]
    print(f"Toplanan ham kayit: {toplam}, guvenlik suzgecinden gecen: {len(temizler)}")

    if not temizler:
        print("SONUC: Olusturulacak yeni veri yok. Mevcut veriler degismeyecek.")
        sys.exit(0)

    # Zaman bilgisi dışında ortamdan bağımsız, tekrarlanabilir çıktı üretir.
    cikti = {
        "olusturuldu": "otonom",
        "kaynaklar": ["World Bank Open Data", "Frankfurter App"],
        "dataset": temizler,
    }

    with open(CIKTI_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(cikti, f, ensure_ascii=False, indent=4)

    print(f"SONUC: {len(temizler)} güvenli kayit {CIKTI_DOSYASI} dosyasina yazildi.")
    sys.exit(0)


if __name__ == "__main__":
    ana()
