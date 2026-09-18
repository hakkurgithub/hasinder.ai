#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
hasinder.ai — Otonom Güvenlik Süzgeci (HAS İNSAN DER)
======================================================
hasinder-ai-data/ klasörünü ÇOK KATI kurallarla denetler. Dosyaları DEĞİŞTİRMEZ.
Herhangi bir ihlalde exit(1) -> GitHub Actions commit/push adımı çalışmaz,
güvensiz veri asla repoya ve dolayısıyla canlı sisteme (GitHub Raw) ulaşamaz.

Denetimler:
  1. Klasörde yalnız izinli dosya adı/uzantısı (.json, .md) — binary/.git/.zip yasak
  2. Boyut sınırı, katı UTF-8, BOM yok, kontrol karakteri / binary yok, mojibake yok
  3. Geçerli JSON, izinli kök tip, iç içe derinlik sınırı
  4. TÜM metin değerleri (JSON çözüldükten sonra, \\u kaçışları dahil) taranır:
     - HTML/JS/PHP enjeksiyonu, olay işleyicileri, tehlikeli URL şemaları
     - Sızmış API anahtarı / parola kalıpları
     - LLM prompt-injection kalıpları (veri LLM bağlamına girer)
     - Güvensiz http:// bağlantıları
  5. Şema: dataset[{soru,cevap}], terimler[{terim,aciklama}], sehirler[{sehir}]
     Otonom üretilen dosyalarda cevap 15–5000 karakter zorunlu
  6. manifest.json varsa klasördeki JSON listesiyle birebir tutarlı olmalı

Kullanım:  python backend/otonom-ajan.py
"""

import glob
import json
import os
import re
import sys

SCRIPT_DIZINI = os.path.dirname(os.path.abspath(__file__))
REPO_KOKU = os.path.dirname(SCRIPT_DIZINI)
DATA_DIR = os.path.join(REPO_KOKU, "hasinder-ai-data")

MAKS_DOSYA_BAYT = 5 * 1024 * 1024
MAKS_METIN = 20000
MAKS_DERINLIK = 8
OTONOM_DOSYALAR = {"otonom-veri.json", "icra-kurullari.json"}
DOSYA_ADI = re.compile(r"^[a-z0-9][a-z0-9\-]*\.(json|md)$")

TEHDIT = [
    r"<\s*script", r"<\s*/\s*script", r"<\s*iframe", r"<\s*frame", r"<\s*embed", r"<\s*object",
    r"<\s*svg", r"<\s*img", r"<\s*link", r"<\s*meta", r"<\s*base", r"<\s*form", r"<\s*style",
    r"<\s*math", r"<\s*video", r"<\s*audio", r"<\s*input", r"<\s*button", r"<\s*a\s+href",
    r"<\?php", r"<\?=", r"<%",
    r"\bon(load|error|click|mouseover|mouseout|focus|blur|change|submit|keydown|keyup|keypress|input|"
    r"animationstart|toggle|pointerdown|pointerup|wheel|scroll|beforeunload|message)\s*=",
    r"javascript\s*:", r"vbscript\s*:", r"livescript\s*:", r"data\s*:\s*(text/html|image/svg|application/)",
    r"srcdoc\s*=", r"expression\s*\(", r"url\s*\(\s*['\"]?\s*javascript",
    r"\beval\s*\(", r"new\s+Function\s*\(", r"\bsetTimeout\s*\(\s*['\"]", r"document\s*\.\s*(cookie|write|domain)",
    r"window\s*\.\s*location", r"\blocalStorage\b", r"\bsessionStorage\b", r"String\s*\.\s*fromCharCode",
    r"\balert\s*\(", r"\batob\s*\(", r"\bimport\s*\(", r"__proto__", r"constructor\s*\[",
    r"&#x?[0-9a-f]{2,6};", r"%3c\s*script", r"\\x3c", r"\\u003c",
    r"\bunion\s+(all\s+)?select\b", r"\bdrop\s+table\b", r";\s*--\s", r"\bxp_cmdshell\b",
    r"\$\{[^}]*\}", r"\{\{[^}]*\}\}",
]
SIR = [
    r"gsk_[A-Za-z0-9]{20,}", r"sk-(proj-|or-v1-)?[A-Za-z0-9_\-]{20,}", r"ghp_[A-Za-z0-9]{30,}",
    r"github_pat_[A-Za-z0-9_]{30,}", r"AKIA[0-9A-Z]{16}", r"AIza[0-9A-Za-z_\-]{35}",
    r"xox[abprs]-[A-Za-z0-9\-]{10,}", r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    r"\b(api[_-]?key|secret|token|password|parola|sifre|şifre)\s*[:=]\s*\S{6,}",
]
ENJEKSIYON = [
    r"ignore (all |any )?(the )?(previous|prior|above|earlier) (instructions|prompts?)",
    r"disregard (all |the )?(previous|prior|system)", r"you are now\b", r"\bsystem prompt\b",
    r"\bjailbreak\b", r"\bDAN mode\b", r"developer mode",
    r"önceki (tüm )?talimatlar[ıi] (yok say|unut|görmezden gel|dikkate alma)",
    r"talimatlar[ıi] (yok say|görmezden gel)", r"sistem (talimat|istem)[ıi]n[ıi] (göster|yaz|paylaş)",
    r"bundan sonra sen\b", r"artık sen bir\b",
]
MOJIBAKE = re.compile(r"(Ã[\u0080-\u00BF§¶¼½¾ÇÖÜ]|Ä[±°Ÿž]|Å[Ÿž]|â€[™œ\u009d“”])")
KONTROL = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")

TEHDIT_RE = [(re.compile(p, re.IGNORECASE), p) for p in TEHDIT]
SIR_RE = [(re.compile(p, re.IGNORECASE), p) for p in SIR]
ENJ_RE = [(re.compile(p, re.IGNORECASE), p) for p in ENJEKSIYON]
HTTP_RE = re.compile(r"http://(?!localhost|127\.0\.0\.1)", re.IGNORECASE)


def metinleri_gez(dugum, yol="$", derinlik=0):
    """JSON ağacındaki tüm (yol, metin) çiftlerini üretir; anahtarlar dahil."""
    if derinlik > MAKS_DERINLIK:
        raise ValueError(f"İç içe derinlik sınırı aşıldı ({yol})")
    if isinstance(dugum, dict):
        for k, v in dugum.items():
            yield f"{yol}.<anahtar>", str(k)
            yield from metinleri_gez(v, f"{yol}.{k}", derinlik + 1)
    elif isinstance(dugum, list):
        for i, v in enumerate(dugum):
            yield from metinleri_gez(v, f"{yol}[{i}]", derinlik + 1)
    elif isinstance(dugum, str):
        yield yol, dugum
    elif dugum is None or isinstance(dugum, (bool, int, float)):
        return
    else:
        raise ValueError(f"Desteklenmeyen tip ({yol})")


def metin_denetle(yol, metin):
    if len(metin) > MAKS_METIN:
        return f"{yol}: metin çok uzun ({len(metin)})"
    if KONTROL.search(metin):
        return f"{yol}: kontrol karakteri"
    if MOJIBAKE.search(metin):
        return f"{yol}: bozuk karakter kodlaması (mojibake)"
    for rx, p in TEHDIT_RE:
        if rx.search(metin):
            return f"{yol}: zararlı içerik kalıbı ({p})"
    for rx, p in SIR_RE:
        if rx.search(metin):
            return f"{yol}: sızmış anahtar/parola kalıbı"
    for rx, p in ENJ_RE:
        if rx.search(metin):
            return f"{yol}: prompt-injection kalıbı ({p})"
    if HTTP_RE.search(metin):
        return f"{yol}: güvensiz http:// bağlantısı (https kullanın)"
    return None


def sema_denetle(ad, veri):
    if ad == "manifest.json":
        if not isinstance(veri, dict) or not isinstance(veri.get("dosyalar"), list):
            return "manifest: 'dosyalar' listesi yok"
        return None
    if not isinstance(veri, dict):
        return "kök öğe sözlük olmalı ({ 'dataset': [...] } vb.)"
    bilinen = False
    if "dataset" in veri:
        bilinen = True
        liste = veri["dataset"]
        if not isinstance(liste, list) or not liste:
            return "dataset boş veya liste değil"
        for i, o in enumerate(liste):
            if not isinstance(o, dict):
                return f"dataset[{i}] sözlük değil"
            soru, cevap = o.get("soru"), o.get("cevap")
            if not isinstance(soru, str) or not soru.strip():
                return f"dataset[{i}].soru boş veya metin değil"
            if not isinstance(cevap, str) or not cevap.strip():
                return f"dataset[{i}].cevap boş veya metin değil"
            if ad in OTONOM_DOSYALAR and not (15 <= len(cevap.strip()) <= 5000):
                return f"dataset[{i}].cevap uzunluğu 15-5000 dışında"
    if "terimler" in veri:
        bilinen = True
        if not isinstance(veri["terimler"], list):
            return "terimler liste değil"
        for i, t in enumerate(veri["terimler"]):
            if not isinstance(t, dict) or not isinstance(t.get("terim"), str) or not isinstance(t.get("aciklama"), str):
                return f"terimler[{i}] geçersiz (terim/aciklama metin olmalı)"
    if "sehirler" in veri:
        bilinen = True
        if not isinstance(veri["sehirler"], list):
            return "sehirler liste değil"
        for i, s in enumerate(veri["sehirler"]):
            if not isinstance(s, dict) or not isinstance(s.get("sehir"), str):
                return f"sehirler[{i}] geçersiz"
    if "bolumler" in veri:
        bilinen = True
    if not bilinen:
        return "tanınan şema yok (dataset / terimler / sehirler / bolumler)"
    return None


def dosya_denetle(yol):
    ad = os.path.basename(yol)
    boyut = os.path.getsize(yol)
    if boyut == 0:
        return "boş dosya"
    if boyut > MAKS_DOSYA_BAYT:
        return f"boyut sınırı aşıldı ({boyut} bayt)"
    with open(yol, "rb") as f:
        ham = f.read()
    if ham.startswith(b"\xef\xbb\xbf"):
        return "UTF-8 BOM içeriyor (BOM'suz UTF-8 kaydedin)"
    if b"\x00" in ham or ham[:4] == b"PK\x03\x04":
        return "binary içerik"
    try:
        metin = ham.decode("utf-8", errors="strict")
    except UnicodeDecodeError as e:
        return f"geçersiz UTF-8: {e}"

    if ad.endswith(".md"):
        for i, satir in enumerate(metin.splitlines(), 1):
            hata = metin_denetle(f"satır {i}", satir)
            if hata:
                return hata
        return None

    if metin.lstrip()[:1] not in ("{", "["):
        return "JSON ile başlamıyor"
    try:
        veri = json.loads(metin)
    except json.JSONDecodeError as e:
        return f"bozuk JSON: {e}"
    try:
        for y, m in metinleri_gez(veri):
            hata = metin_denetle(y, m)
            if hata:
                return hata
    except ValueError as e:
        return str(e)
    return sema_denetle(ad, veri)


def manifest_denetle():
    yol = os.path.join(DATA_DIR, "manifest.json")
    if not os.path.exists(yol):
        return None
    with open(yol, encoding="utf-8") as f:
        m = json.load(f)
    beklenen = sorted(os.path.basename(p) for p in glob.glob(os.path.join(DATA_DIR, "*.json"))
                      if os.path.basename(p) != "manifest.json")
    if sorted(m.get("dosyalar", [])) != beklenen:
        return "manifest.json klasördeki JSON dosyalarıyla uyuşmuyor (backend/manifest-olustur.py çalıştırın)"
    return None


def main():
    print("hasinder.ai Otonom Güvenlik Süzgeci çalışıyor...")
    if not os.path.isdir(DATA_DIR):
        print(f"HATA: veri klasörü yok: {DATA_DIR}")
        sys.exit(1)

    ihlal = 0
    temiz = 0
    for yol in sorted(glob.glob(os.path.join(DATA_DIR, "*")) + glob.glob(os.path.join(DATA_DIR, ".*"))):
        ad = os.path.basename(yol)
        if os.path.isdir(yol):
            print(f"  RED  {ad}/ : veri klasöründe alt klasör yasak")
            ihlal += 1
            continue
        if not DOSYA_ADI.match(ad):
            print(f"  RED  {ad} : izinsiz dosya adı/uzantısı (yalnız a-z0-9-.json/.md)")
            ihlal += 1
            continue
        try:
            hata = dosya_denetle(yol)
        except Exception as e:  # beklenmeyen her durum ihlal sayılır
            hata = f"denetim hatası: {e}"
        if hata:
            print(f"  RED  {ad} : {hata}")
            ihlal += 1
        else:
            print(f"  OK   {ad}")
            temiz += 1

    m = manifest_denetle()
    if m:
        print(f"  RED  manifest.json : {m}")
        ihlal += 1

    print("-" * 60)
    print(f"Özet: {temiz} geçerli, {ihlal} ihlal.")
    if ihlal:
        print("SONUÇ: Güvensiz/bozuk veri bulundu. Commit ENGELLENDİ.")
        sys.exit(1)
    print("SONUÇ: Tüm veriler güvenli ve geçerli.")
    sys.exit(0)


if __name__ == "__main__":
    main()
