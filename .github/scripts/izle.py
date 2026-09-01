#!/usr/bin/env python3
"""Otonom Veri Bekcsi - izleme ve canlandirma betigi.

GitHub Actions icinde calisir. Gorevleri:
  1. Son otonom ajan run'unu sorgular ve raporlar.
  2. Veri dosyalarindaki kayit sayilarini raporlar.
  3. Ajan durmus/basarisizsa workflow_dispatch ile yeniden baslatir.

Ortam degiskenleri:
  GITHUB_TOKEN      : Repo-scoped action token (actions: write + contents: read)
  GITHUB_REPOSITORY : ornek: "hakkurgithub/hasinder.ai"
  GITHUB_API_URL    : ornek: "https://api.github.com"
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = os.environ.get("GITHUB_REPOSITORY", "")
API = os.environ.get("GITHUB_API_URL", "https://api.github.com").rstrip("/")

ANA_AJAN_ISMI = "Otonom Veri Guncelleme Ajani"
VERI_KLASORU = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "hasinder-ai-data")


def api(path, method="GET", data=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(
        API + path,
        data=body,
        method=method,
        headers={
            "Authorization": "Bearer " + TOKEN,
            "Accept": "application/vnd.github+json",
            "User-Agent": "otonom-bekci",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as e:
        return -1, {"err": str(e)}


def son_ajan_runu():
    """Ana otonom ajanin en son acik/hedef run'unu bulur."""
    st, data = api("/repos/%s/actions/runs?per_page=20" % REPO)
    if st != 200 or not data.get("workflow_runs"):
        return None
    for r in data["workflow_runs"]:
        # Yalniz veri ureten ana ajana odaklan; push tetikleyicisini da say.
        if ANA_AJAN_ISMI in (r.get("name") or ""):
            return r
    return None


def veri_raporu():
    print("=== VERI KAYIT SAYILARI ===")
    top = 0
    if os.path.isdir(VERI_KLASORU):
        for f in sorted(os.listdir(VERI_KLASORU)):
            if not f.endswith(".json"):
                continue
            p = os.path.join(VERI_KLASORU, f)
            try:
                with open(p, encoding="utf-8") as fh:
                    d = json.load(fh)
                arr = d if isinstance(d, list) else d.get("dataset", d.get("qa", []))
                n = len(arr) if isinstance(arr, list) else 0
                top += n
                print("  %s : %d kayit" % (f, n))
            except Exception:
                print("  %s : BOZUK" % f)
    print("TOPLAM KAYIT: %d" % top)
    return top


def yeniden_baslat():
    print("Ana otonom ajani yeniden baslatiyorum (workflow_dispatch) ...")
    st, data = api(
        "/repos/%s/actions/workflows/oto-json-guncelle.yml/dispatches" % REPO,
        "POST",
        {"ref": "main"},
    )
    if st == 204:
        print("Restart tetiklendi (HTTP 204).")
    else:
        print("Restart BASARISIZ (HTTP %s): %s" % (st, data))


def main():
    if not TOKEN or not REPO:
        print("GITHUB_TOKEN / GITHUB_REPOSITORY eksik; izleme atlaniyor.")
        return

    run = son_ajan_runu()
    print("=== SON OTONOM AJAN CALISMASI ===")
    if not run:
        print("  BULUNAMADI (hic run yok).")
    else:
        print("  id %s | event %s | status %s | conclusion %s | %s" % (
            run["id"], run.get("event"), run.get("status"),
            run.get("conclusion"), run.get("created_at")))

    veri_raporu()

    if not run:
        print("Sonuc: ilk tetikleme gerekiyor -> yeniden baslat.")
        yeniden_baslat()
        return

    status = run.get("status")
    conclusion = run.get("conclusion")
    if status == "completed" and conclusion in ("success",):
        print("Sonuc: Ajan saglikli, mudahale gerekmiyor.")
    elif status == "completed" and conclusion in ("failure", "cancelled", "timed_out"):
        print("Sonuc: Ajan basarisiz (%s) -> yeniden baslat." % conclusion)
        yeniden_baslat()
    else:
        print("Sonuc: Ajan hala calisiyor/kuyrukta (%s) -> mudahale yok." % status)


if __name__ == "__main__":
    main()
