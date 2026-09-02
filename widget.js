// ==========================================================================
// hasinder.ai EVRENSEL WIDGET
// --------------------------------------------------------------------------
// Harici sitelere <div data-hasinder="gumruk"></div> + bu script ile gomulur.
// - Hafif: yalnizca standart fetch + DOM (bagimlilik yok)
// - Izole: Shadow DOM ile hedef sitenin CSS'inden etkilenmez / etkilemez
// - cPanel'i yormaz: veriler dogrudan GitHub Raw hasinder-ai-data/ havuzundan alinir
// - "HAS INSAN DER" felsefesi: toplumsal fayda odakli, insan onceci iletisim dili
// --------------------------------------------------------------------------
// Kullanim:
//   <script src="https://cdn.jsdelivr.net/gh/hakkurgithub/hasinder.ai@main/widget.js"></script>
//   <div data-hasinder data-hasinder-sabit data-hasinder-konum="gumruk" data-hasinder-baslik="Gumruk Sorular">
//   </div>
// Veri havuzunu disaridan beslemek icin: window.HasinderWidget.veri = [...]
// ==========================================================================
(function () {
  'use strict';

  var GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/hakkurgithub/hasinder.ai/main/hasinder-ai-data/';
  var DATA_FILES = [
    'emlak-terimleri.json', 'emlak-yatirim-dataset.json', 'finans-vergi-dataset.json',
    'gayrimenkul-hukuk-dataset.json', 'gumruk-dis-ticaret-dataset.json',
    'gumruk-musavirligi-2006-sinav.json', 'gumruk-musavirligi-2008-sinav.json',
    'gumruk-musavirligi-2010-sinav.json', 'gumruk-musavirligi-2011-sinav.json',
    'gumruk-musavirligi-2012-sinav.json', 'gumruk-musavirligi-2013-sinav.json',
    'gumruk-musavirligi-2014-sinav.json', 'gumruk-musavirligi-2015-sinav.json',
    'gumruk-musavirligi-2017-sinav.json', 'gumruk-musavirligi-2018-sinav.json',
    'gumruk-tarife-cetveli-detayli.json', 'gumruk-tarife-cetveli-fasillar.json',
    'hasinder-platform-dataset.json', 'lojistik-tasimacilik-dataset.json',
    'mevzuat-dataset.json', 'sehir-bilgileri.json', 'sirket-is-hukuku-dataset.json',
    'soru-cevap-dataset.json', 'turkiye-ekonomi-dataset.json',
    'icra-kurullari.json', 'otonom-veri.json', 'b2b-ticaret-dataset.json',
    'dis-ticaret-terimleri.json'
  ];

  var TR_HARF = { 'ı': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u', 'I': 'i' };
  var STOPWORDS = new Set([
    'bir', 've', 'ile', 'icin', 'ne', 'nedir', 'nasil', 'mi', 'mu',
    'var', 'yok', 'ben', 'sen', 'o', 'bu', 'su', 'da', 'de', 'ki', 'en', 'cok',
    'ama', 'gibi', 'kadar', 'daha', 'ise', 'hakkinda', 'istiyorum', 'lutfen',
    'bana', 'bize', 'siz', 'biz', 'hangi', 'kac', 'nerede', 'olan', 'olarak',
    'sonra', 'once', 'sadece', 'yani', 'acaba', 'ya', 'hem', 'veya', 'her',
    'pek', 'hemen', 'simdi', 'bugun', 'sey', 'musunuz', 'misiniz', 'sunu',
    'bunu', 'sunlari', 'aciklar', 'misin', 'anlat', 'soyler', 'soyle', 'edin',
    'ederim', 'tesekkur', 'merhaba', 'selam'
  ]);

  function normalize(m) {
    return String(m).toLocaleLowerCase('tr')
      .replace(/[ışğüöçâîû]/g, function (h) { return TR_HARF[h] || h; })
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sorguyuTemizle(girdi) {
    return normalize(String(girdi))
      .replace(/\bne anlama gelir\b/g, ' ')
      .replace(/\bne demek\b/g, ' ')
      .replace(/\bne demektir\b/g, ' ')
      .replace(/\bneye yarar\b/g, ' ')
      .replace(/\bne ise yarar\b/g, ' ')
      .replace(/\bne icin\b/g, ' ')
      .replace(/\bne kadar\b/g, ' ')
      .replace(/\bnedir\b|\bnasil\b|\banlami nedir\b|\banlami\b|\banlama\b|\bacikla\b|\bkaç\b|\bkac\b|\bkactir\b|\bneredir\b/g, ' ')
      .replace(/[?.,!]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function icerikKelimeleri(metin) {
    return normalize(sorguyuTemizle(metin)).split(' ').filter(function (k) { return k.length > 1 && !STOPWORDS.has(k); });
  }

  function kelimeEslesir(a, b) {
    if (a === b) return true;
    var kisa = a.length <= b.length ? a : b;
    var uzun = a.length <= b.length ? b : a;
    return kisa.length >= 4 && (uzun.startsWith(kisa) || kisa.startsWith(uzun));
  }

  function eslesmeDetay(ku, sk) {
    if (!ku.length || !sk.length) return { skor: 0, sayi: 0 };
    var es = 0, kul = new Set();
    for (var i = 0; i < ku.length; i++) {
      for (var j = 0; j < sk.length; j++) {
        if (!kul.has(j) && kelimeEslesir(ku[i], sk[j])) { es++; kul.add(j); break; }
      }
    }
    return { skor: es / Math.sqrt(ku.length * sk.length), sayi: es };
  }

  function enIyiEslesme(qa, girdi) {
    var kelimeler = icerikKelimeleri(girdi), enIyi = { skor: 0, sayi: 0, kayit: null };
    for (var i = 0; i < qa.length; i++) {
      var d = eslesmeDetay(kelimeler, qa[i].__k);
      if (d.skor > enIyi.skor) enIyi = { skor: d.skor, sayi: d.sayi, kayit: qa[i] };
    }
    return enIyi;
  }

  function terimBul(terimler, girdi) {
    var kelimeler = normalize(girdi).split(' ');
    var eslesen = [];
    for (var i = 0; i < terimler.length; i++) {
      var t = terimler[i];
      var tk = normalize(t.terim || '').split(' ').filter(Boolean);
      if (!tk.length) continue;
      var ortak = 0;
      for (var j = 0; j < tk.length; j++) if (kelimeler.indexOf(tk[j]) !== -1) ortak++;
      var skor = ortak / tk.length;
      // Ilk sozcuk soruda gecmiyorsa (orn. 'kambiyo mevzuati...') alt esik yakinlastirma
      var ilkSon = tk[0] && tk[0].length >= 3 && kelimeler.indexOf(tk[0]) !== -1;
      if (skor >= 0.5 || ilkSon) eslesen.push({ t: t, skor: skor });
    }
    eslesen.sort(function (a, b) { return b.skor - a.skor; });
    return eslesen.map(function (o) { return o.t; });
  }

  function terimSorusuMu(girdi) {
    return /(nedir|ne demek|ne anlama|anlami|acikla)/.test(normalize(girdi));
  }

  function konumAnahtarlari(konum) {
    // Konum (site/sektoer) -> anahtar kelime kupesi. Bogun yoksa null (tum veri).
    if (!konum) return null;
    var k = {
      'gumruk': ['gumruk', 'gumrukleme', 'beyanname', 'kambiyo', 'dis ticaret', 'tarife', 'icra', 'mevzuat'],
      'emlak': ['emlak', 'arazi', 'tapu', 'gayrimenkul', 'sehir', 'yatirim'],
      'b2b': ['b2b', 'ticaret', 'sirket', 'is hukuku', 'lojistik', 'vergi'],
      'finans': ['finans', 'ekonomi', 'vergi', 'doviz', 'yatirim', 'kredi']
    };
    return k[konum.toLowerCase()] || null;
  }

  function qaFiltre(qa, konum) {
    var anahtarlar = konumAnahtarlari(konum);
    if (!anahtarlar) return qa;
    var dag = icerikKelimeleri(anahtarlar.join(' '));
    return qa.filter(function (k) {
      var kk = k.__k || [];
      return kk.some(function (w) { return surfaceMatch(w, dag); });
    });
  }

  function surfaceMatch(w, dag) {
    for (var i = 0; i < dag.length; i++) if (kelimeEslesir(w, dag[i])) return true;
    return false;
  }

  // ---------- Veri yukleme (GitHub Raw, cPanel isteksiz) ----------
  function veriCek(konum, onOk, onHata) {
    if (window.HasinderWidget && window.HasinderWidget.veri) {
      onOk(HasinderWidget.veri);
      return;
    }
    var qa = [];
    var terimler = [];
    Promise.all(DATA_FILES.map(function (f) {
      return fetch(GITHUB_RAW_BASE + f)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (d) {
          if (Array.isArray(d.terimler)) terimler = terimler.concat(d.terimler);
          var arr = Array.isArray(d) ? d : (d.dataset || d.qa || []);
          for (var i = 0; i < arr.length; i++) {
            var o = arr[i];
            if (o && o.soru && o.cevap && String(o.cevap).length >= 15) qa.push(o);
          }
        })
        .catch(function () { /* tek bir dosya basarisiz olursa atla */ });
    })).then(function () {
      qa.forEach(function (k) { k.__k = icerikKelimeleri(k.soru); });
      onOk(qaFiltre(qa, konum), terimler);
    }).catch(onHata);
  }

  // ---------- Arayuz (Shadow DOM, bagimsiz stil) ----------
  function css() {
    return '' +
      '*{box-sizing:border-box;margin:0;padding:0}' +
      '.hi-widget{font-family:Arial,Helvetica,sans-serif;max-width:560px;border:1px solid #d1d5db;' +
      'border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.08);background:#fff}' +
      '.hi-baslik{background:#0d9488;color:#fff;padding:12px 16px;font-size:15px;font-weight:700;' +
      'display:flex;justify-content:space-between;align-items:center}' +
      '.hi-noktalar{display:flex;gap:4px}' +
      '.hi-nokta{width:8px;height:8px;border-radius:50%;background:#93e6d6}' +
      '.hi-kutu{max-height:340px;overflow-y:auto;padding:14px}' +
      '.hi-soru{background:#f3f4f6;border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;' +
      'font-size:14px;color:#1f2937;transition:background .15s}' +
      '.hi-soru:hover{background:#e5e7eb}' +
      '.hi-cevap{background:#e0f2fe;border-left:3px solid #0d9488;border-radius:6px;padding:10px 12px;' +
      'margin:2px 0 12px;font-size:13px;line-height:1.5;color:#0369a1;white-space:pre-wrap}' +
      '.hi-soru-alani{display:flex;gap:8px;padding:12px;border-top:1px solid #e5e7eb}' +
      '.hi-input{flex:1;border:1px solid #d1d5db;border-radius:8px;padding:9px 12px;font-size:13px;outline:none}' +
      '.hi-gonder{background:#0d9488;color:#fff;border:none;border-radius:8px;padding:0 18px;font-weight:700;cursor:pointer}' +
      '.hi-alt{margin-top:10px;padding:8px;font-size:11px;color:#6b7280;text-align:center;' +
      'background:#f9fafb}' +
      '.hi-alt a{color:#0d9488;text-decoration:none}' +
      '.hi-yukleniyor{color:#6b7280;font-size:13px;padding:14px;min-height:60px}' +
      '.hi-durum{font-size:11px;color:#6b7280;padding:0 14px 8px}';
  }

  function sabitCss() {
    return '' +
      '.hi-sabit{position:fixed;right:20px;bottom:20px;width:380px;max-width:calc(100vw - 40px);' +
      'z-index:2147483000;display:none;box-shadow:0 8px 30px rgba(0,0,0,.18);border-radius:14px}' +
      '.hi-sabit.hi-acik{display:block}' +
      '.hi-ac{cursor:pointer;position:fixed;right:20px;bottom:20px;width:60px;height:60px;' +
      'border-radius:50%;border:none;background:#0d9488;color:#fff;font-size:26px;font-weight:700;' +
      'box-shadow:0 6px 22px rgba(13,148,136,.45);z-index:2147483001;line-height:1}' +
      '.hi-sabit.hi-acik + .hi-ac{display:none}.hi-ac{display:block}' +
      '.hi-sabit.hi-acik ~ .hi-ac{display:none}' +
      '.hi-ac:hover{background:#0f766e}' +
      '.hi-sabit .hi-kutu{max-height:46vh;min-height:140px}';
  }

  function widgetOlustur(el) {
    var konum = el.getAttribute('data-hasinder-konum') || null;
    var baslik = el.getAttribute('data-hasinder-baslik') || 'hasinder.ai Asistan';
    var sabit = el.hasAttribute('data-hasinder-sabit');
    var onSoruVar = el.getAttribute('data-hasinder-onsoru') !== 'kapat';

    var root = el.attachShadow ? el.attachShadow({ mode: 'open' }) : el;
    var st = document.createElement('style');
    st.textContent = css() + sabitCss();
    root.appendChild(st);

    var kap = document.createElement('div');
    kap.className = 'hi-widget' + (sabit ? ' hi-sabit' : '');
    kap.innerHTML =
      '<div class="hi-baslik"><span>' + escapeHtml(baslik) + '</span><span class="hi-noktalar">' +
      '<span class="hi-nokta"></span><span class="hi-nokta"></span><span class="hi-nokta"></span></span></div>' +
      '<div class="hi-kutu hi-yukleniyor">hasinder.ai bilgi havuzu yukleniyor...</div>' +
      '<div class="hi-soru-alani">' +
      '<input class="hi-input" type="text" placeholder="Soru sorun..." maxlength="300">' +
      '<button class="hi-gonder">Sor</button></div>' +
      '<div class="hi-durum">V: 0 kayit</div>' +
      '<div class="hi-alt">HAS INSAN DER<span style="font-weight:700"> &bull; hasinder.ai</span> &bull; ' +
      '<a href="https://hasinder.com" target="_blank" rel="noopener">hasinder.com</a>' +
      (sabit ? ' &bull; <a href="#" class="hi-kapat">Kapat</a>' : '') + '</div>';
    root.appendChild(kap);

    var kutu = kap.querySelector('.hi-kutu');
    var durum = kap.querySelector('.hi-durum');
    var input = kap.querySelector('.hi-input');
    var gonder = kap.querySelector('.hi-gonder');
    var kapat = kap.querySelector('.hi-kapat');

    if (sabit) {
      var ac = document.createElement('button');
      ac.className = 'hi-ac';
      ac.type = 'button';
      ac.setAttribute('aria-label', 'hasinder.ai asistana sorun');
      ac.textContent = '?';
      root.appendChild(ac);
      ac.addEventListener('click', function () {
        kap.classList.toggle('hi-acik');
        if (kap.classList.contains('hi-acik')) input.focus();
      });
      if (kapat) kapat.addEventListener('click', function (e) {
        e.preventDefault();
        kap.classList.remove('hi-acik');
      });
      setTimeout(function () { kap.classList.add('hi-acik'); }, 1200);
    }

    var qa = [];
    var terimler = [];

    function soruGoster() {
      if (!onSoruVar) {
        kutu.innerHTML = '<div style="padding:14px;font-size:13px;line-height:1.6;color:#1f2937">' +
          'Merhaba! Size nasil yardimci olabilirim? Asagidaki alandan sorunuzu yazin, ' +
          '<a href="https://hasinder.com" target="_blank" rel="noopener">hasinder.com</a> ' +
          'uzmanlarina ulasmaniz icin yardimci olalim.</div>';
        return;
      }
      if (!qa.length) {
        kutu.innerHTML = '<div class="hi-yukleniyor">Bu kategoriye ait kayit henuz yok.</div>';
        return;
      }
      kutu.innerHTML = '';
      qa.slice(0, 12).forEach(function (k) {
        var s = document.createElement('div');
        s.className = 'hi-soru';
        s.textContent = k.soru;
        var c = document.createElement('div');
        c.className = 'hi-cevap';
        c.style.display = 'none';
        c.textContent = k.cevap;
        s.addEventListener('click', function () {
          c.style.display = c.style.display === 'none' ? 'block' : 'none';
        });
        kutu.appendChild(s);
        kutu.appendChild(c);
      });
    }

    function cevapla() {
      var soru = input.value.trim();
      if (!soru) return;
      var en = enIyiEslesme(qa, soru);
      if (en.kayit && en.skor >= 0.45 && en.sayi >= 1) {
        kutu.innerHTML = '';
        var s2 = document.createElement('div');
        s2.className = 'hi-soru';
        s2.textContent = en.kayit.soru;
        var c2 = document.createElement('div');
        c2.className = 'hi-cevap';
        c2.textContent = en.kayit.cevap + '\n\n[Kaynak: hasinder.ai veri havuzu]';
        kutu.appendChild(s2);
        kutu.appendChild(c2);
        return;
      }
      var sozluk = terimBul(terimler, soru);
      if (sozluk.length && terimSorusuMu(soru)) {
        kutu.innerHTML = '';
        var baslikB = document.createElement('div');
        baslikB.className = 'hi-soru';
        baslikB.textContent = sozluk[0].terim;
        var acB = document.createElement('div');
        acB.className = 'hi-cevap';
        acB.textContent = sozluk[0].aciklama + '\n\n[Kaynak: hasinder.ai terim sozlugu]';
        kutu.appendChild(baslikB);
        kutu.appendChild(acB);
        return;
      }
      kutu.innerHTML = '<div style="padding:14px;font-size:13px;line-height:1.6;color:#1f2937">' +
        'Bu soruya yerel havuzda net bir karsilik bulamadim. ' +
        'Detayli bilgi icin <a href="https://hasinder.com" target="_blank" rel="noopener">hasinder.com</a> ' +
        'uzmanlarina ulasabilirsiniz.</div>';
    }

    gonder.addEventListener('click', cevapla);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') cevapla(); });

    // Veri yukle (optik: GitHub Raw direkt)
    veriCek(konum, function (hazir_, terimler_) {
      qa = hazir_;
      terimler = terimler_;
      durum.textContent = 'Hazir - ' + qa.length + ' kayit';
      soruGoster();
    }, function () {
      kutu.innerHTML = '<div class="hi-yukleniyor">Veri yuklenemedi. Sayfayi yenileyin veya daha sonra deneyin.</div>';
    });

    return {
      qaGetir: function () { return qa; },
      soruSor: function (s) { input.value = s; cevapla(); }
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function init() {
    var elems = document.querySelectorAll('[data-hasinder]');
    for (var i = 0; i < elems.length; i++) widgetOlustur(elems[i]);
  }

  window.HasinderWidget = {
    veri: null, // disaridan veri beslemek icin (opsiyonel)
    baslat: init,
    widgetOlustur: widgetOlustur
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();