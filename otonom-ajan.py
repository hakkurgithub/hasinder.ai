#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Otonom Güvenlik Süzgeci (hasinder.ai)
=====================================
hasinder-ai-data/ klasöründeki tüm JSON dosyalarını tarar ve:
1. Zararlı script / HTML / PHP enjeksiyon içeren verileri reddeder,
2. Sadece geçerli ve temiz JSON yapılarını (liste veya sözlük) kabul eder,
3. Dosyaları DEĞİŞTİRMEZ (sadece doğrular) — repo temiz kalır.

Güvenlik davranışı:
- Güvensiz veya bozuk bir dosya bulunursa skript exit(1) ile çıkar.
- Böylece otonom workflow'un (oto-json-guncelle.yml) commit adımı çalışmaz
  ve zararlı/bozuk veri hiçbir zaman repoya/canlı sisteme giremez.

Kullanım:  python otonom-ajan.py
"""

import os
import json
import glob
import re
import sys

# Betiğin bulunduğu dizine göre veri klasörünü belirle (çalışma dizininden bağımsız)
SCRIPT_DIZINI = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIZINI, "hasinder-ai-data")

# Güvensiz içerik kalıpları (case-insensitive)
TEHDIT_KALIPLARI = [
    r"<script[\s>]",
    r"javascript\s*:",
    r"<\?php",
    r"onload\s*=",
    r"onerror\s*=",
    r"onclick\s*=",
    r"<iframe",
    r"vbscript\s*:",
    r"data\s*:\s*text/html",
    r"eval\s*\(",
    r"document\.cookie",
    r"alert\s*\(",
    r"<embed[\s>]",
    r"<object[\s>]",
    r"<svg[\s>]",
]
TEHDIT_DERLE = {re.compile(p, re.IGNORECASE): p for p in TEHDIT_KALIPLARI}


def tehdit_iceriyor_mu(icerik):
    """İçerikte zararlı/şüpheli desen var mı kontrol eder."""
    for regex, desen in TEHDIT_DERLE.items():
        if regex.search(icerik):
            return desen
    return None


def validate_json_files():
    print("Otonom Güvenlik Süzgeci Calisiyor...")
    if not os.path.exists(DATA_DIR):
        print(f"UYARI: Veri klasoru bulunamadi: {DATA_DIR}")
        sys.exit(1)

    json_files = glob.glob(os.path.join(DATA_DIR, "*.json"))
    if not json_files:
        print("Dogrulanacak JSON dosyasi bulunamadi.")
        sys.exit(1)

    temiz = 0
    atlanan = 0
    hatali = 0

    for file_path in sorted(json_files):
        ad = os.path.basename(file_path)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # 1) Güvenlik kontrolü: zararlı script / enjeksiyon engelleme
            bulunan = tehdit_iceriyor_mu(content)
            if bulunan:
                print(f"UYARI: Guvensiz icerik tespit edildi: {ad} (desen: {bulunan})")
                atlanan += 1
                continue

            # 2) JSON geçerliliği
            data = json.loads(content)

            # 3) Yapısal tip denetimi (yalnızca liste veya sözlük kabul edilir)
            if not isinstance(data, (list, dict)):
                print(f"UYARI: Gecersiz JSON yapisi (liste/sözlük degil): {ad}")
                atlanan += 1
                continue

            print(f"GUVENLI ve GECERLI: {ad}")
            temiz += 1

        except json.JSONDecodeError as e:
            print(f"BOZUK JSON: {ad} -> {e}")
            hatali += 1
        except Exception as e:
            print(f"HATA ({ad}): {e}")
            hatali += 1

    print("-" * 50)
    print(f"Ozet: {temiz} temiz/gecerli, {atlanan} guvensiz/gecersiz, {hatali} bozuk.")

    # Güvensiz veya bozuk dosya varsa hata koduyla çık.
    # Workflow bu durumda commit yapmaz => zararlı veri repoya girmez.
    if atlanan + hatali > 0:
        print("SONUC: Güvensiz/bozuk veri bulundu. Commit engellendi.")
        sys.exit(1)

    print("SONUC: Tum veriler güvenli ve gecerli. Devam edebilirsiniz.")
    sys.exit(0)


if __name__ == "__main__":
    validate_json_files()
