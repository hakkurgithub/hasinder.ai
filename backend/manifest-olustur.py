#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
hasinder.ai — Veri Manifesti (HAS İNSAN DER)
hasinder-ai-data/*.json listesini hasinder-ai-data/manifest.json dosyasına yazar.
Frontend (app.js) bu listeyi GitHub Raw'dan okur; yeni veri dosyası eklemek için
JS kodunu değiştirmek gerekmez. Çıktı deterministiktir (liste değişmezse dosya da değişmez).

Kullanım:  python backend/manifest-olustur.py
"""
import glob
import json
import os
import re

REPO_KOKU = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(REPO_KOKU, "hasinder-ai-data")
CIKTI = os.path.join(DATA_DIR, "manifest.json")
AD = re.compile(r"^[a-z0-9][a-z0-9\-]*\.json$")


def main():
    dosyalar = sorted(
        os.path.basename(p) for p in glob.glob(os.path.join(DATA_DIR, "*.json"))
        if os.path.basename(p) != "manifest.json" and AD.match(os.path.basename(p))
    )
    icerik = {"proje": "hasinder.ai", "kurum": "HAS İNSAN DER", "surum": 1, "dosyalar": dosyalar}
    with open(CIKTI, "w", encoding="utf-8", newline="\n") as f:
        json.dump(icerik, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"manifest.json yazıldı: {len(dosyalar)} dosya")


if __name__ == "__main__":
    main()
