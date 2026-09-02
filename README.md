# hasinder.ai - Genel Yapay Zeka Asistani

hasinder.com, goodbuy.hasinder.com ve akademi.hasinder.com platformlarina hitap
eden genel yapay zeka asistani. Gayrimenkul, gumruk ve dis ticaret, B2B ticaret,
Hasinder platformu, Goodbuy Real Estate AI, Has Ozel Akademi ve 81 il hakkinda
sorulan sorulara cevap verir. Bilmedigi sorulari WhatsApp uzerinden uzmana iletir.

## Ozellikler

- **Hibrit beyin:** Once yerel veri setinde akilli eslestirme yapar (ucretsiz, cevrimdisi),
  bulamazsa sirasiyla yerel Ollama'ya (sinirsiz, bagimsiz) ve bulut LLM'e sorar
  (web'de kullanici anahtari ile Gemini; konsolda `/key` ile OpenRouter).
- **Tamamen bagimsiz ve sinirsiz:** Ollama ile calisirken internet, API anahtari
  veya herhangi bir limit OLMAZ. Kod ve veriler tamamen sizin.
- **Web arayuzu:** Modern sohbet sayfasi - GitHub Pages'de sunucusuz calisir.
- **Konsol arayuzu:** Python veya Node.js ile terminalde calisir.
- **Acik kaynak veri:** Tum bilgi bankasi `hasinder-ai-data/` klasorundeki
  acik JSON/Markdown dosyalarindan gelir - kolayca genisletilebilir.
- **Genisletilmis bilgi bankasi:** 4313 soru-cevap, 132 terim, 81 sehir bilgisi.
- **WhatsApp yonlendirme:** Cevap bulunamayan sorular WhatsApp uzerinden
  uzmana iletilir (wa.me/905333715577).
- **Evrensel Widget:** Harici sitelere Shadow DOM ile gomulen hafif asistan
  (`widget.js`) - cPanel'e istek atmadan dogrudan GitHub Raw veri ceker.

## Klasor Yapisi

```
.
├── index.html                  # Web sohbet arayuzu
├── style.css                   # Turkuvaz tema stilleri
├── app.js                      # Web icin hibrit beyin
├── konsol.py                   # Python konsol surumu (Python 3.8+, ek paket gerekmez)
├── konsol.js                   # Node.js konsol surumu (Node 18+, ek paket gerekmez)
└── hasinder-ai-data/           # Bilgi bankasi (acik kaynak veriler)
    ├── goodbuy-real-estate-prompt.md # AI kimligi ve kurallari (sistem promptu)
    ├── soru-cevap-dataset.json # Genel soru-cevap veri seti
    ├── hasinder-platform-dataset.json # Hasinder/Goodbuy/Akademi platform verisi
    ├── gumruk-dis-ticaret-dataset.json # Gumruk ve dis ticaret mevzuati
    ├── gayrimenkul-hukuk-dataset.json # Tapu, imar ve gayrimenkul hukuku
    ├── gumruk-musavirligi-2006-sinav.json # 2006 Gümrük Müşavirliği Ön Eleme Sınavı (100 soru + seçenek açıklamalı)
    ├── gumruk-musavirligi-2008-sinav.json # 2008 Gümrük Müşavirliği Mesleki Yeterlilik Sınavı (50 soru + seçenek açıklamalı)
    ├── gumruk-musavirligi-2010-sinav.json # 2010 Gümrük Müşavirliği Mesleki Yeterlilik Sınavı (50 soru + seçenek açıklamalı)
    ├── gumruk-musavirligi-2011-sinav.json # 2011 Gümrük Müşavirliği Sınavları
    ├── gumruk-musavirligi-2012-sinav.json # 2012 Gümrük Müşavirliği Sınavları
    ├── gumruk-musavirligi-2013-sinav.json # 2013 Gümrük Müşavirliği Sınavları
    ├── gumruk-musavirligi-2014-sinav.json # 2014 Gümrük Müşavirliği Sınavları
    ├── gumruk-musavirligi-2015-sinav.json # 2015 Gümrük Müşavirliği Yazılı Sınavı
    ├── gumruk-musavirligi-2017-sinav.json # 2017 Gümrük Müşavirliği Sınavı (cevap anahtarlı)
    ├── gumruk-musavirligi-2018-sinav.json # 2018 Gümrük Müşavirliği Sınavı (cevap anahtarlı)
    ├── gumruk-tarife-cetveli-fasillar.json # Türk Gümrük Tarife Cetveli - 99 Fasıl + 21 Bölüm
    ├── b2b-ticaret-dataset.json # B2B ticaret, tedarik zinciri, sozlesmeler
    ├── lojistik-tasimacilik-dataset.json # Lojistik ve tasimacilik
    ├── finans-vergi-dataset.json # Finans ve vergi mevzuati
    ├── sirket-is-hukuku-dataset.json # Sirket kurulusu ve is hukuku
    ├── turkiye-ekonomi-dataset.json # Turkiye ekonomi ve makro gostergeler
    ├── emlak-yatirim-dataset.json # Gayrimenkul yatirimi ve krediler
    ├── emlak-terimleri.json    # Terimler sozlugu
    └── sehir-bilgileri.json    # 81 il sehir ve bolge bilgileri
```

## Bilgi Kategorileri

| Kategori | Kapsam |
|----------|--------|
| Hasinder | Platform, 20 icra kurulu, TIB Borsa, Hatay Yatirim Projesi |
| Goodbuy | AI satis asistani, paketler, analiz araclari |
| Akademi | 15 derslik Gumruk ve Dis Ticaret uzmanlasma programi |
| Gumruk | 4458 sayili Kanun, beyanname, muayene, rejimler, cezalar |
| Dis Ticaret | INCOTERMS 2020, odeme sekilleri, tesvikler, lojistik |
| B2B Ticaret | Pazar yerleri, pazarlik, sozlesmeler, acente/distributor |
| Lojistik | Tasima modlari, depolama, sigorta, belgeler |
| Finans/Vergi | KDV, kurumlar vergisi, Eximbank, kur riski, krediler |
| Sirket/Is Hukuku | Kurulus sureci, kidem/ihbar tazminati, ISG |
| Turkiye Ekonomisi | Ihracat/ithalat, enflasyon, faiz, GSYH |
| Emlak Yatirim | Kira verimi, GYO/GYF, konut kredisi, tapu masraflari |
| Sınavlar | 2006 (100 soru), 2008 (50 soru), 2010 (50 soru) — her seçeneğin açıklaması ayrı konu olarak eklendi |
| Tapu/Imar/Hukuk | Tapu islemleri, ipotek, imar, kentsel donusum, kira hukuku |
| Sehirler | 81 il, populer bolgeler, arazi fiyatlari |

## Hizli Baslangic

### Web (yerel)

Tarayici guvenligi `file://` uzerinden veri okumayi engeller, bu yuzden
kucuk bir yerel sunucu calistirin:

```bash
# Node.js ile
npx serve .

# veya Python ile
python -m http.server 8000
```

Sonra tarayicida `http://localhost:8000` (veya serve'in gosterdigi adres) acin.

### Konsol

```bash
# Node.js ile (ek kurulum gerekmez)
node konsol.js

# veya Python ile
python konsol.py
```

Konsol komutlari: `/key`, `/model`, `/temizle`, `/yardim`, `/cikis`

## LLM Modlari (Bagimsiz ve Hibrit)

### 1. Ollama ile Tam Bagimsiz Mod (ONERILEN)

Ollama, yapay zeka modellerini kendi bilgisayarinizda calistirir.
**Internet, API anahtari ve limit yok. Tamamen bedava ve sinirsiz.**

```bash
# 1. Ollama'yi kur: https://ollama.com
# 2. Llama 3.1 modelini indir:
ollama pull llama3.1

# 3. Asistani calistir - otomatik algilar:
node konsol.js
```

Ollama calisiyorsa asistan once Ollama'yi kullanir. Web surumunde de ayni
sekilde `http://localhost:11434` adresinden otomatik baglanir.

### 2. Bulut LLM (Opsiyonel Yedek)

Ollama yoksa, kendi bulut API anahtarınızla LLM kullanilabilir:

**Web'de (Google Gemini):**
1. [aistudio.google.com](https://aistudio.google.com) adresinden ucretsiz Gemini API anahtari olusturun.
2. Sitedaki **LLM** butonuna tiklayip anahtarinizi girin (tarayicida `localStorage`'da saklanir, koda gomulmez).

**Konsolda (OpenRouter):**
1. [openrouter.ai](https://openrouter.ai) adresinden ucretsiz hesap acip anahtar olusturun.
2. `/key sk-or-v1-xxxxx...` yazin veya ortam degiskeni kullanin:

```bash
$env:OPENROUTER_API_KEY = "sk-or-v1-xxxxx..."
node konsol.js
```

## Evrensel Widget (Harici Siteler Icin)

`widget.js` ile hasinder.ai asistanini herhangi bir HTML sayfaya gomun.
Widget Shadow DOM kullanir, boylece hedef sitenin stili/JS'i ile cakismaz;
verileri sunucunuzu (cPanel) yormadan **dogrudan GitHub Raw** `hasinder-ai-data/`
havuzundan ceker. **HAS INSAN DER** felsefesine uygun olarak 7/24 erisilebilir.

### Kurulum (3 adim)

```html
<!-- 1) Widget scriptini yukleyin (jsDelivr CDN - MIME dogru, raw.githubusercontent engellenir) -->
<script src="https://cdn.jsdelivr.net/gh/hakkurgithub/hasinder.ai@main/widget.js"></script>

<!-- 2) Gomulecegi yere kapsayici ekleyin (bos kalir; sabit modda sag-altta yuzer) -->
<div data-hasinder data-hasinder-sabit data-hasinder-konum="gumruk"></div>
```

Isteg e bagli ozellikler:

- `data-hasinder-sabit`: Widget acilir kapanir panel olarak ekranin sag altina sabitlenir
  (buton olarak gorunur, tiklaninca acilir). Bu ozellik verilmezse widget gomuldugu
  yerde inline olarak cizilir.
- `data-hasinder-konum` (opsiyonel): `gumruk`, `emlak`, `b2b`, `finans` -
  yalnizca o sektor icin veri yukler. Bos birakilirsa tum havuz kullanilir.
- `data-hasinder-baslik`: Ustte gorunen baslik.
- Disaridan veri beslemek: `window.HasinderWidget.veri = [...]` tanimlayin.

Canli ornek: `widget-ornek.html` dosyasini tarayicida acin.

## GitHub'a Yukleme ve GitHub Pages ile Yayinlama

1. Yeni bir depo olusturun: [github.com/new](https://github.com/new)
2. Bu klasoru depoya gonderin:

```bash
git init
git add .
git commit -m "Goodbuy Real Estate AI - ilk surum"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/DEPO_ADI.git
git push -u origin main
```

3. GitHub Pages'i acin: Depo > **Settings** > **Pages** >
   Source: `main` branch, `/ (root)` > **Save**
4. Birkac dakika icinde siteniz yayinda olur:
   `https://KULLANICI_ADINIZ.github.io/DEPO_ADI/`

> **Guvenlik notu:** Koda HICBIR API anahtari gomulu degildir. Web surumunde Ollama
> otomatik algilanir (siniirsiz ve ucretsiz); olmazsa kullanici kendi Google Gemini
> anahtarini tarayicida (LLM butonu ile, localStorage'da) girer. Konsol surumu
> `OPENROUTER_API_KEY` ortam degiskenini veya `/key` komutunu kullanir.

## Bilgi Bankasini Genisletme

Kod degistirmeden asistanin bilgisini artirabilirsiniz:

- **Yeni soru-cevap:** Herhangi bir `*-dataset.json` icindeki `dataset` dizisine
  `{"soru": "...", "cevap": "..."}` ekleyin. Yeni bir konu alani icin yeni bir
  `konu-dataset.json` dosyasi olusturup `app.js` ve `konsol.js`/`konsol.py`
  icindeki `dosyalar` listesine ekleyin.
- **Yeni terim:** `emlak-terimleri.json` icindeki `terimler` dizisine
  `{"terim": "...", "aciklama": "...", "kategori": "..."}` ekleyin.
- **Yeni sehir:** `sehir-bilgileri.json` icindeki `sehirler` dizisine ekleyin.
- **Kisilik/kurallar:** `goodbuy-real-estate-prompt.md` dosyasini duzenleyin.

## Lisans

MIT
