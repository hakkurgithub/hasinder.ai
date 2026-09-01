// ==========================================
// HASINDER.AI - HİBRİT BEYİN (WEB)
// 1) Yerel açık kaynak veri tabanında akıllı eşleştirme
// 2) Ollama yerel LLM (varsa - sınırsız, ücretsiz)
// 3) Kullanıcı anahtarıyla Google Gemini (opsiyonel yedek)
// Not: Hiçbir API anahtarı koda gömülü DEĞİLDİR (güvenlik).
// ==========================================

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/hakkurgithub/hasinder.ai/main/hasinder-ai-data/";
const OLLAMA_URL = "http://localhost:11434";
const OLLAMA_MODEL = "llama3.1";

const DATA_FILES = [
    "emlak-terimleri.json",
    "emlak-yatirim-dataset.json",
    "finans-vergi-dataset.json",
    "gayrimenkul-hukuk-dataset.json",
    "gumruk-dis-ticaret-dataset.json",
    "gumruk-musavirligi-2006-sinav.json",
    "gumruk-musavirligi-2008-sinav.json",
    "gumruk-musavirligi-2010-sinav.json",
    "gumruk-musavirligi-2011-sinav.json",
    "gumruk-musavirligi-2012-sinav.json",
    "gumruk-musavirligi-2013-sinav.json",
    "gumruk-musavirligi-2014-sinav.json",
    "gumruk-musavirligi-2015-sinav.json",
    "gumruk-musavirligi-2017-sinav.json",
    "gumruk-musavirligi-2018-sinav.json",
    "gumruk-tarife-cetveli-detayli.json",
    "gumruk-tarife-cetveli-fasillar.json",
    "hasinder-platform-dataset.json",
    "lojistik-tasimacilik-dataset.json",
    "mevzuat-dataset.json",
    "sehir-bilgileri.json",
    "sirket-is-hukuku-dataset.json",
    "soru-cevap-dataset.json",
    "turkiye-ekonomi-dataset.json",
    "icra-kurullari.json",
    "otonom-veri.json"
];

// ---------- Türkçe Metin Normalizasyonu ----------
const TR_HARF = { 'ı': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u', 'I': 'i' };

function normalize(metin) {
    return metin.toLocaleLowerCase('tr')
        .replace(/[ışğüöçâîû]/g, h => TR_HARF[h] || h)
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const STOPWORDS = new Set([
    'bir', 've', 'ile', 'icin', 'ne', 'nedir', 'nasil', 'mi', 'mu',
    'var', 'yok', 'ben', 'sen', 'o', 'bu', 'su', 'da', 'de', 'ki', 'en', 'cok',
    'ama', 'gibi', 'kadar', 'daha', 'ise', 'hakkinda', 'istiyorum', 'lutfen',
    'bana', 'bize', 'siz', 'biz', 'hangi', 'kac', 'nerede', 'olan', 'olarak',
    'sonra', 'once', 'sadece', 'yani', 'acaba', 'ya', 'hem', 'veya', 'her',
    'pek', 'hemen', 'simdi', 'bugun', 'sey', 'musunuz', 'misiniz', 'sunu',
    'bunu', 'sunlari', 'aciklar', 'misin', 'anlat', 'soyler', 'soyle', 'edin',
    'ederim', 'tesekkur', 'merhaba', 'selam'
]);

const SELAM_REGEX = /^(merhaba|selam|selamlar|hey|gunaydin|iyi gunler|iyi aksamlar|iyi bayramlar|hello|hi|naber|nasilsin|hosgeldin)\b/;

function icerikKelimeleri(metin) {
    return normalize(metin).split(' ').filter(k => k.length > 1 && !STOPWORDS.has(k));
}

function kelimeEslesir(a, b) {
    if (a === b) return true;
    const kisa = a.length <= b.length ? a : b;
    const uzun = a.length <= b.length ? b : a;
    return kisa.length >= 4 && (uzun.startsWith(kisa) || kisa.startsWith(uzun));
}

function eslesmeDetay(kullaniciKelimeler, soruKelimeler) {
    if (!kullaniciKelimeler.length || !soruKelimeler.length) return { skor: 0, sayi: 0 };
    let eslesme = 0;
    const kullanilan = new Set();
    for (const kk of kullaniciKelimeler) {
        for (let i = 0; i < soruKelimeler.length; i++) {
            if (!kullanilan.has(i) && kelimeEslesir(kk, soruKelimeler[i])) {
                eslesme++;
                kullanilan.add(i);
                break;
            }
        }
    }
    return { skor: eslesme / Math.sqrt(kullaniciKelimeler.length * soruKelimeler.length), sayi: eslesme };
}

// ---------- Veri Yükleme ----------
let veri = { qa: [], terimler: [], sehirler: [], prompt: '' };

async function jsonCek(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
}

async function loadDatasets() {
    let yuklenen = 0;
    for (const fileName of DATA_FILES) {
        // Decoupled mimari: Merkezi hafiza GitHub reposudur. Web arayuzu verileri
        // GitHub Raw uzerinden dinamik ve salt-okunur ceker. Yerel hasinder-ai-data/
        // yalnizca gelistirme/test icin son care yedek kaynak olarak kullanilir.
        const yollar = [GITHUB_RAW_BASE + fileName, "hasinder-ai-data/" + fileName];
        for (const yol of yollar) {
            try {
                const data = await jsonCek(yol);
                if (Array.isArray(data)) {
                    veri.qa = veri.qa.concat(data);
                } else if (data && typeof data === 'object') {
                    if (Array.isArray(data.dataset)) veri.qa = veri.qa.concat(data.dataset);
                    if (Array.isArray(data.terimler)) veri.terimler = data.terimler;
                    if (Array.isArray(data.sehirler)) veri.sehirler = data.sehirler;
                }
                yuklenen++;
                break;
            } catch (e) { /* sonraki yolu dene */ }
        }
    }
    try {
        const r = await fetch(GITHUB_RAW_BASE + "goodbuy-real-estate-prompt.md");
        if (r.ok) veri.prompt = await r.text();
    } catch (e) { /* prompt yoksa varsayilan kullan */ }

    if (!veri.prompt) {
        veri.prompt = "Sen hasinder.ai yapay zeka asistanısın. hasinder.com, goodbuy.hasinder.com ve akademi.hasinder.com platformlarında gayrimenkul, gümrük, dış ticaret, B2B ticaret ve ekonomi konularında yardımcı olursun. Sorulara net, doğru ve kısa cevap ver.";
    }

    veri.qa = veri.qa.filter(o => o && typeof o === 'object' && !('dogruMu' in o) && o.soru && o.cevap && String(o.cevap).trim().length >= 15);
    veri.qa.forEach(k => k.__k = icerikKelimeleri(k.soru || ''));

    const durumSpan = document.getElementById("durum");
    if (durumSpan) {
        durumSpan.textContent = `hasinder.ai (Aktif - ${veri.qa.length} Kayıt)`;
        durumSpan.style.backgroundColor = "#10b981";
        durumSpan.style.color = "white";
        durumSpan.style.padding = "4px 8px";
        durumSpan.style.borderRadius = "4px";
    }
}

// ---------- Arama ----------
function enIyiEslesme(girdi) {
    const kelimeler = icerikKelimeleri(girdi);
    let enIyi = { skor: 0, sayi: 0, kayit: null };
    for (const k of veri.qa) {
        const d = eslesmeDetay(kelimeler, k.__k);
        if (d.skor > enIyi.skor) enIyi = { skor: d.skor, sayi: d.sayi, kayit: k };
    }
    return enIyi;
}

function enIyiEslesmeler(girdi, adet = 5) {
    const kelimeler = icerikKelimeleri(girdi);
    const skorlu = [];
    for (const k of veri.qa) {
        const d = eslesmeDetay(kelimeler, k.__k);
        if (d.skor > 0.05) skorlu.push({ skor: d.skor, kayit: k });
    }
    return skorlu.sort((a, b) => b.skor - a.skor).slice(0, adet).map(o => o.kayit);
}

function terimBul(girdi) {
    const kelimeler = normalize(girdi).split(' ');
    const skorlu = [];
    for (const t of veri.terimler) {
        const tk = normalize(t.terim || '').split(' ').filter(Boolean);
        if (!tk.length) continue;
        const eslesen = tk.filter(w => kelimeler.includes(w));
        const skor = eslesen.length / tk.length;
        const ilk = tk[0] && kelimeler.includes(tk[0]) && tk[0].length >= 3;
        if (skor >= 0.5 || ilk) skorlu.push({ t, skor });
    }
    return skorlu.sort((a, b) => b.skor - a.skor).map(o => o.t);
}

function sehirBul(girdi) {
    const norm = normalize(girdi);
    for (const s of veri.sehirler) {
        const adlar = [s.sehir, ...(s.ilceler || [])].map(normalize);
        if (adlar.some(ad => ad && new RegExp(`\\b${ad}\\b`).test(norm))) return s;
    }
    return null;
}

function sehirCevabi(s) {
    return `${s.sehir} bölgesi hakkında bilgiler:\n` +
        `- Popüler bölgeler: ${(s.populerBolgeler || []).join(', ')}\n` +
        `- Ortalama arazi fiyatı: ${s.araziOrtalamaFiyat}\n` +
        `- İlçeler: ${(s.ilceler || []).join(', ')}\n\n` +
        `${s.notlar}\n\n` +
        `Detaylı bilgi için sorunuzu daha spesifik sorabilirsiniz.`;
}

function bilgiBankasiMetni(girdi) {
    const qc = enIyiEslesmeler(girdi, 5).map(o => `S: ${o.soru}\nC: ${o.cevap}`).join('\n\n');
    const tr = veri.terimler.slice(0, 10).map(t => `- ${t.terim}: ${t.aciklama}`).join('\n');
    const sh = veri.sehirler.slice(0, 3).map(s =>
        `- ${s.sehir}: Fiyat ${s.araziOrtalamaFiyat}. Popüler: ${(s.populerBolgeler || []).join(', ')}. ${s.notlar}`).join('\n');
    return `### Soru-Cevap Örnekleri:\n${qc}\n\n### Emlak Terimleri:\n${tr}\n\n### Şehir Bilgileri:\n${sh}`;
}

// ---------- Ollama Yerel LLM (isteğe bağlı) ----------
async function ollamaAktifMi() {
    try {
        const r = await fetch(OLLAMA_URL + "/api/tags", { signal: AbortSignal.timeout(2500) });
        return r.ok;
    } catch { return false; }
}

async function ollamaSor(gecmis, soru) {
    const sistem = veri.prompt + '\n\n## BILGI BANKASI (aşağıdaki açık kaynak verilerine dayanarak cevap ver):\n\n' + bilgiBankasiMetni(soru);
    gecmis.push({ role: 'user', content: soru });
    const r = await fetch(OLLAMA_URL + "/api/chat", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, messages: [{ role: 'system', content: sistem }, ...gecmis.slice(-10)], stream: false })
    });
    if (!r.ok) { gecmis.pop(); throw new Error('Ollama hatası ' + r.status); }
    const d = await r.json();
    const cevap = d.message.content.trim();
    gecmis.push({ role: 'assistant', content: cevap });
    return cevap;
}

// ---------- Google Gemini (opsiyonel yedek - kullanıcı anahtarı) ----------
async function geminiSor(apiKey, model, gecmis, soru) {
    const sistem = 'MODEL:hasinder.ai\n\n' + veri.prompt + '\n\n## BILGI BANKASI:\n\n' + bilgiBankasiMetni(soru);
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: sistem + '\n\nKullanıcı sorusu:\n' + soru }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2000 } })
    });
    if (!r.ok) { const e = await r.text(); throw new Error('Gemini hatası ' + r.status + ': ' + e.slice(0, 150)); }
    const d = await r.json();
    const metin = d?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (!metin) throw new Error('Gemini boş yanıt (API anahtarı geçersiz olabilir)');
    return metin.trim();
}

// ---------- Ana Cevap Motoru ----------
async function cevapUret(gecmis, girdi) {
    if (SELAM_REGEX.test(normalize(girdi))) {
        const selam = veri.qa.find(o => o.soru === 'Merhaba');
        return { metin: selam ? selam.cevap : 'Merhaba! Size nasıl yardımcı olabilirim?', kaynak: 'Veri Seti' };
    }

    const { skor, sayi, kayit } = enIyiEslesme(girdi);
    if (skor >= 0.45 && sayi >= 2) return { metin: kayit.cevap, kaynak: 'Veri Seti' };

    const terimler = terimBul(girdi);
    const sehir = sehirBul(girdi);
    const terimSorusu = /(nedir|ne demek|ne anlama|anlami|acikla)/.test(normalize(girdi));

    if (terimler.length > 0 && terimSorusu) {
        return { metin: terimler.slice(0, 3).map(t => `${t.terim} (${t.kategori})\n${t.aciklama}`).join('\n\n'), kaynak: 'Terim Sözlüğü' };
    }
    if (sehir) return { metin: sehirCevabi(sehir), kaynak: 'Şehir Bilgileri' };
    if (terimler.length > 0 && icerikKelimeleri(girdi).length <= 6) {
        return { metin: terimler.slice(0, 3).map(t => `${t.terim} (${t.kategori})\n${t.aciklama}`).join('\n\n'), kaynak: 'Terim Sözlüğü' };
    }

    if (ollamaDurum) {
        try { return { metin: await ollamaSor(gecmis, girdi), kaynak: 'Yerel LLM (Ollama)' }; }
        catch (e) { console.warn('Ollama başarısız', e); }
    }

    const geminiKey = localStorage.getItem('hasinder_gemini_key');
    if (geminiKey) {
        const model = localStorage.getItem('hasinder_gemini_model') || 'gemini-2.0-flash';
        try { return { metin: await geminiSor(geminiKey, model, gecmis, girdi), kaynak: 'Bulut LLM (Gemini)' }; }
        catch (e) { return { metin: `Bulut LLM'ye ulaşılamadı: ${e.message}\n\nSorunuzu WhatsApp üzerinden uzmanımıza iletebilirsiniz:\nhttps://wa.me/905333715577?text=${encodeURIComponent('Merhaba, şu soruma cevap bulamadım: ' + girdi)}`, kaynak: 'Hata' }; }
    }

    return {
        metin: 'Bu soruya şu an yerel veri tabanında net bir karşılık bulamadım.\n\n' +
            'Cevap kalitesini artırmak için:\n' +
            '1) Ollama kurun (ollama.com) → otomatik algılanır, sınırsız ve ücretsiz çalışır.\n' +
            '2) veya sağ üstteki "LLM" ikonundan Google Gemini API anahtarı girin (opsiyonel).\n\n' +
            'Uzmanımıza şuradan WhatsApp ile ulaşabilirsiniz:\nhttps://wa.me/905333715577?text=' + encodeURIComponent('Merhaba, şu soruma cevap bulamadım: ' + girdi),
        kaynak: 'WhatsApp'
    };
}

// ---------- Güvenli Markdown Render (XSS korumalı) ----------
function renderMarkdown(text) {
    const paragraf = document.createElement('div');
    const satirlar = String(text).split('\n');
    for (const satir of satirlar) {
        const p = document.createElement('div');
        p.style.margin = '2px 0';
        if (/^https?:\/\/\S+$/.test(satir.trim())) {
            const a = document.createElement('a');
            a.href = satir.trim();
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = satir.trim();
            p.appendChild(a);
        } else {
            p.textContent = satir;
        }
        paragraf.appendChild(p);
    }
    return paragraf;
}

const chatBox = document.getElementById("mesajlar");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
let ollamaDurum = false;
const gecmis = [];

function appendMessage(sender, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = sender === "user" ? "user-message" : "ai-message";
    const kim = document.createElement("strong");
    kim.textContent = sender === "user" ? "Siz:" : "hasinder.ai:";
    msgDiv.appendChild(kim);
    msgDiv.appendChild(document.createElement("br"));
    msgDiv.appendChild(renderMarkdown(text));
    if (chatBox) {
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

async function gonder(text) {
    appendMessage("user", text);
    const loadingId = "loading-" + Date.now();
    if (chatBox) {
        const ld = document.createElement("div");
        ld.id = loadingId;
        ld.className = "ai-message";
        ld.textContent = "hasinder.ai düşünüyor...";
        chatBox.appendChild(ld);
    }

    let cevap;
    try { cevap = await cevapUret(gecmis, text); }
    catch (e) { cevap = { metin: 'Beklenmeyen bir hata oluştu: ' + e.message, kaynak: 'Hata' }; }

    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) loadingElement.remove();
    appendMessage("ai", cevap.metin + (cevap.kaynak ? `\n\n[Kaynak: ${cevap.kaynak}]` : ''));
}

if (sendBtn) {
    sendBtn.addEventListener("click", () => {
        const text = userInput.value.trim();
        if (!text) return;
        userInput.value = "";
        gonder(text);
    });
}

if (userInput) {
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendBtn.click();
    });
}

// LLM ayar butonu (Gemini anahtarı) - header'a eklenebilir
async function llmAyarMenu() {
    const mevcut = localStorage.getItem('hasinder_gemini_key');
    const anahtar = prompt(mevcut ? 'Google Gemini API anahtarı (değiştirmek için yazın, silmek için boş bırakın):' : 'Google Gemini API anahtarı girin (opsiyonel, yoksa sadece yerel + Ollama çalışır):', '');
    if (anahtar === null) return;
    if (anahtar === '') { localStorage.removeItem('hasinder_gemini_key'); alert('Gemini anahtarı kaldırıldı.'); }
    else { localStorage.setItem('hasinder_gemini_key', anahtar.trim()); alert('Gemini anahtarı kaydedildi.'); }
}

const llmBtn = document.getElementById("llm-btn");
if (llmBtn) llmBtn.addEventListener("click", llmAyarMenu);

window.loadGeminiAyarlari = llmAyarMenu;

window.onload = async () => {
    await loadDatasets();
    ollamaDurum = await ollamaAktifMi();
    appendMessage("ai", (ollamaDurum
        ? "Merhaba! hasinder.ai hazır. Yerel LLM (Ollama) aktif - sınırsız ve ücretsiz çalışıyor."
        : "Merhaba! hasinder.ai hazır. Yerel veri tabanı üzerinden yardımcı olabilirim. Ollama kurarsanız sınırsız LLM de devreye girer."));
};
