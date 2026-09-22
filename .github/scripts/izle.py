#!/usr/bin/env python3
"""hasinder.ai Otonom Veri Bekcisi (HAS İNSAN DER).

- Ana ajan son 26 saatte hic calismadiysa -> yeniden baslatir.
- Son calisma basarisizsa -> yeniden baslatir; ANCAK art arda 3 basarisizlikta
  sonsuz donguye girmez, bekciyi kirmizi (exit 1) yapar ve GitHub e-posta ile uyarir.
"""
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

TOKEN = os.environ.get("GH_TOKEN", "") or os.environ.get("GITHUB_TOKEN", "")
REPO = os.environ.get("GH_REPO", "") or os.environ.get("GITHUB_REPOSITORY", "")
API = os.environ.get("GITHUB_API_URL", "https://api.github.com").rstrip("/")
WORKFLOW = "oto-json-guncelle.yml"
VERI = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "hasinder-ai-data")


def api(yol, method="GET", veri=None):
    req = urllib.request.Request(
        API + yol, method=method,
        data=json.dumps(veri).encode() if veri is not None else None,
        headers={"Authorization": "Bearer " + TOKEN, "Accept": "application/vnd.github+json",
                 "User-Agent": "hasinder-ai-bekci", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            ham = r.read()
            return r.status, (json.loads(ham) if ham else {})
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as e:  # ag hatasi
        return -1, {"hata": str(e)}


def veri_raporu():
    toplam = 0
    for f in sorted(os.listdir(VERI)) if os.path.isdir(VERI) else []:
        if not f.endswith(".json") or f == "manifest.json":
            continue
        try:
            with open(os.path.join(VERI, f), encoding="utf-8") as fh:
                d = json.load(fh)
            n = len(d.get("dataset", [])) if isinstance(d, dict) else len(d)
        except Exception:
            print(f"  {f}: BOZUK")
            continue
        toplam += n
        print(f"  {f}: {n}")
    print(f"TOPLAM: {toplam} kayit")


def yeniden_baslat():
    st, _ = api(f"/repos/{REPO}/actions/workflows/{WORKFLOW}/dispatches", "POST", {"ref": "main"})
    print("Yeniden baslatma:", "OK" if st == 204 else f"BASARISIZ (HTTP {st})")


def main():
    if not TOKEN or not REPO:
        print("Token/repo yok; izleme atlandi.")
        return 0
    veri_raporu()
    st, d = api(f"/repos/{REPO}/actions/workflows/{WORKFLOW}/runs?per_page=5")
    runs = d.get("workflow_runs", []) if st == 200 else []
    if not runs:
        print("Hic calisma yok -> ilk tetikleme.")
        yeniden_baslat()
        return 0

    son = runs[0]
    print(f"Son calisma: {son.get('status')}/{son.get('conclusion')} @ {son.get('created_at')}")
    if son.get("status") != "completed":
        print("Ajan calisiyor/kuyrukta -> mudahale yok.")
        return 0

    ardisik_hata = 0
    for r in runs:
        if r.get("status") == "completed" and r.get("conclusion") in ("failure", "timed_out", "cancelled"):
            ardisik_hata += 1
        else:
            break
    if ardisik_hata >= 3:
        print(f"UYARI: Ajan art arda {ardisik_hata} kez basarisiz. Sonsuz dongu engellendi; loglari inceleyin.")
        return 1
    if ardisik_hata:
        print("Son calisma basarisiz -> yeniden baslatiliyor.")
        yeniden_baslat()
        return 0

    zaman = dt.datetime.fromisoformat(son["created_at"].replace("Z", "+00:00"))
    if dt.datetime.now(dt.timezone.utc) - zaman > dt.timedelta(hours=26):
        print("26 saattir calisma yok -> yeniden baslatiliyor.")
        yeniden_baslat()
    else:
        print("Ajan saglikli.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
