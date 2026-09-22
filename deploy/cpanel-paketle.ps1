# hasinder.ai — cPanel yükleme paketi (HAS İNSAN DER)
# Kullanım:  cd D:\hasinder.ai ;  powershell -ExecutionPolicy Bypass -File deploy\cpanel-paketle.ps1
# Çıktı:     D:\hasinder.ai\_cpanel\  ve  D:\hasinder.ai\_cpanel.zip  (yalnız frontend)
$ErrorActionPreference = "Stop"
$kok = Split-Path -Parent $PSScriptRoot
$hedef = Join-Path $kok "_cpanel"
$zip = Join-Path $kok "_cpanel.zip"

if (Test-Path $hedef) { Remove-Item -Recurse -Force $hedef }
if (Test-Path $zip) { Remove-Item -Force $zip }
New-Item -ItemType Directory -Path $hedef | Out-Null

$dosyalar = @("index.html", "style.css", "app.js", "widget.js", "widget-ornek.html")
foreach ($d in $dosyalar) { Copy-Item (Join-Path $kok $d) $hedef }
Copy-Item (Join-Path $kok "deploy\cpanel.htaccess") (Join-Path $hedef ".htaccess")

Compress-Archive -Path (Get-ChildItem -Force $hedef).FullName -DestinationPath $zip -Force
Write-Host "Hazır: $zip"
Get-ChildItem -Force $hedef | Select-Object Name, Length | Format-Table
