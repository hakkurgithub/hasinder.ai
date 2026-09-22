# hasinder.ai - GitHub repo temizligi ve yayini (HAS İNSAN DER)
# Kullanim (D:\hasinder.ai icinde, zip cikarildiktan sonra):
#   powershell -ExecutionPolicy Bypass -File deploy\github-temizle.ps1
$ErrorActionPreference = "Stop"
$kok = Split-Path -Parent $PSScriptRoot
Set-Location $kok
if (-not (Test-Path ".git")) { throw "Bu klasor bir git deposu degil: $kok" }

# 1) Eski / yanlis konumdaki dosyalari repodan ve diskten kaldir
$eski = @(
  "scraper.py", "veri-toplayici.py", "otonom-ajan.py",
  "konsol.py", "konsol.js", "tarife_sorgula.py",
  "emlak-terimleri.json", "sehir-bilgileri.json", "soru-cevap-dataset.json",
  "package.json", "package-lock.json", "cohere-dataset.jsonl", "tur.traineddata",
  "hasinder-ai-repo.zip", "hasinder-ai-cpanel.zip", "tani.html"
)
foreach ($f in $eski) {
  $izli = git ls-files -- $f
  if ($izli) { git rm -q -- $f; Write-Host "silindi (git): $f" }
  elseif (Test-Path $f) { Remove-Item -Force $f; Write-Host "silindi (disk): $f" }
}
Get-ChildItem -Recurse -Directory -Force -Filter "__pycache__" | Remove-Item -Recurse -Force

# 2) Manifest + guvenlik suzgeci
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
if ($py) {
  & $py.Source backend\manifest-olustur.py
  & $py.Source backend\otonom-ajan.py
  if ($LASTEXITCODE -ne 0) { throw "Guvenlik suzgeci ihlal buldu; commit yapilmadi." }
} else {
  Write-Host "UYARI: Python bulunamadi; manifest/suzgec atlandi (GitHub Actions calistiracak)."
}

# 3) Commit + push
git add -A
git status --short
git commit -m "hasinder.ai v2: temiz yapi (backend/, araclar/, cloudflare-worker/, deploy/), yeni workflow'lar, eski dosyalar kaldirildi"
if ($LASTEXITCODE -ne 0) { Write-Host "Commit edilecek degisiklik yok." }
git push origin main
if ($LASTEXITCODE -ne 0) { throw "Push basarisiz. 'git pull --rebase origin main' calistirip tekrar deneyin." }
Write-Host "TAMAM: GitHub guncellendi."
