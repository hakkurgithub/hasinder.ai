# hasinder.ai — HAS İNSAN DER Hibrit Yapay Zekâ Asistanı

"Has insan" olma idealinden doğan, toplumsal fayda odaklı açık kaynak yapay zekâ asistanı.
Gümrük ve dış ticaret, gayrimenkul, B2B ticaret, lojistik, finans-vergi, şirket/iş hukuku,
Türkiye ekonomisi ve 81 il hakkında soruları yanıtlar.

## Mimari (decoupled / serverless)

```
Tarayıcı (hasinder.ai.hasinder.com — cPanel, yalnız HTML/CSS/JS)
  │  app.js (motor + arayüz)   widget.js (harici siteler)
  │
  ├─1─► GitHub Raw  hasinder-ai-data/*.json      (bilgi bankası, salt-okunur)
  ├─2─► Ollama      http://localhost:11434        (yalnız yerelde / ?ollama=1)
  ├─3─► Cloudflare Worker  cloudflare-worker/     (Groq → Gemini → OpenRouter; anahtar Worker Secret'ta)
  └─4─► WhatsApp uzman yönlendirmesi

GitHub Actions (cron)
  backend/scraper.py → backend/veri-toplayici.py → backend/manifest-olustur.py
  → backend/otonom-ajan.py (katı güvenlik süzgeci; ihlalde commit engellenir) → commit
```

## Klasör yapısı

| Yol | Nerede çalışır | Açıklama |
|---|---|---|
| `index.html`, `style.css`, `app.js`, `widget.js`, `widget-ornek.html` | cPanel + jsDelivr | Frontend |
| `hasinder-ai-data/` | GitHub (Raw) | Bilgi bankası + `manifest.json` |
| `backend/` | GitHub Actions | Otonom ajanlar, güvenlik süzgeci |
| `cloudflare-worker/` | Cloudflare | LLM proxy (serverless) |
| `deploy/` | Yerel / Actions | cPanel paketi ve `.htaccess` şablonu |
| `araclar/` | Yerel | Konsol asistanı (Python/Node), GTİP sorgu aracı |
| `.github/` | GitHub Actions | Veri ajanı, bekçi, cPanel/Worker yayını |

cPanel'e **yalnız** frontend dosyaları ve `deploy/cpanel.htaccess` (→ `.htaccess`) yüklenir.
Veri, `.git`, `.py`, `.pyc`, `.env` asla yüklenmez.

## Kurulum

### 1. LLM proxy (Cloudflare Worker, ücretsiz)
1. dash.cloudflare.com → Workers & Pages → Create → Worker → adı `hasinder-ai-proxy` → Deploy.
2. Edit code → `cloudflare-worker/llm-proxy.js` içeriğini yapıştır → Deploy.
3. Settings → Variables and Secrets → **Secret** `GROQ_API_KEY` ekle (opsiyonel: `GEMINI_API_KEY`, `OPENROUTER_API_KEY`).
   Text değişken `GROQ_MODEL` = `openai/gpt-oss-120b`.
4. `https://hasinder-ai-proxy.<hesap>.workers.dev/saglik` → `{"durum":"ok","saglayicilar":["groq"]}` görmelisiniz.
5. `app.js` içindeki `LLM_PROXY_URL` değerine Worker adresini yazın.

### 2. GitHub
Push sonrası Actions otomatik çalışır. cPanel otomatik yayını için repo → Settings → Secrets → Actions:
`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR` (ör. `hasinder.ai.hasinder.com/` — sonu `/`).

### 2b. Repo temizliği (tek komut)
Zip `D:\hasinder.ai` üzerine çıkarıldıktan sonra:
`powershell -ExecutionPolicy Bypass -File deploy\github-temizle.ps1`
(eski kök dosyaları siler, manifest + güvenlik süzgecini çalıştırır, commit + push yapar)

### 3. cPanel (elle)
`powershell -ExecutionPolicy Bypass -File deploy\cpanel-paketle.ps1` → `_cpanel.zip` dosyasını
subdomain kök klasörüne yükleyip çıkarın.

### 4. Yerel geliştirme
```powershell
cd D:\hasinder.ai
python -m http.server 8080      # http://localhost:8080
```
Yerelde veri önce `hasinder-ai-data/` klasöründen okunur, Ollama otomatik denenir
(`ollama pull llama3.1`). Canlı sitede Ollama için adrese `?ollama=1` ekleyin ve
Ollama'yı `OLLAMA_ORIGINS=https://hasinder.ai.hasinder.com` ile başlatın.

Konsol: `python araclar\konsol.py` veya `node araclar\konsol.js`
(Sıra: Ollama → Groq [Cloudflare Worker] → OpenRouter → WhatsApp. Anahtar gerekmez; farklı Worker için `HASINDER_LLM_PROXY` ortam değişkeni.)

### 5. Groq testi (GitHub Actions)

Actions → **LLM Proxy Testi (Groq)** → *Run workflow*. Worker sağlığını ve cPanel + GitHub Pages origin'lerinden Groq cevabını doğrular; her gün 06:17 UTC'de otomatik çalışır.

## Widget (harici siteler)

```html
<script src="https://cdn.jsdelivr.net/gh/hakkurgithub/hasinder.ai@main/widget.js" defer></script>
<div data-hasinder data-hasinder-sabit data-hasinder-konum="gumruk" data-hasinder-baslik="Gümrük Asistanı"></div>
```
Nitelikler: `data-hasinder-sabit`, `data-hasinder-konum` (gumruk|emlak|b2b|finans),
`data-hasinder-onsoru="kapat"`, `data-hasinder-otomatik="ac"`. Yeni alan adı eklenecekse
Worker'da `IZINLI_ORIGINLER` değişkenine yazın.

## Bilgi bankasını genişletme

`hasinder-ai-data/` içine `{"dataset":[{"soru":"...","cevap":"..."}]}` biçiminde yeni bir
`.json` ekleyin, ardından:
```powershell
python backend\manifest-olustur.py
python backend\otonom-ajan.py
```
Süzgeç geçerse commit/push edin; frontend yeni dosyayı manifest üzerinden otomatik yükler.

Lisans: MIT · HAS İNSAN DER
