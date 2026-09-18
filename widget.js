/* ==========================================================================
 * hasinder.ai — Evrensel Widget (HAS İNSAN DER)
 * --------------------------------------------------------------------------
 * Kullanım (harici siteler):
 *   <script src="https://cdn.jsdelivr.net/gh/hakkurgithub/hasinder.ai@main/widget.js" defer></script>
 *   <div data-hasinder data-hasinder-sabit data-hasinder-konum="gumruk"
 *        data-hasinder-baslik="Gümrük Asistanı"></div>
 * Nitelikler:
 *   data-hasinder-sabit          -> sağ altta açılır panel (yoksa satır içi)
 *   data-hasinder-konum          -> gumruk | emlak | b2b | finans (örnek soru filtresi)
 *   data-hasinder-onsoru="kapat" -> örnek soru listesini gizler
 *   data-hasinder-otomatik="ac"  -> sabit panel sayfa açılınca açılır
 * Motor: app.js (window.HasinderMotor) — yoksa widget.js ile aynı adresten yüklenir.
 * Shadow DOM: hedef sitenin CSS'i ile çakışmaz. Tüm metinler textContent ile basılır (XSS yok).
 * ========================================================================== */
(function () {
  'use strict';
  if (window.HasinderWidget) return;

  var BETIK = document.currentScript;
  var TABAN = (function () {
    try { return new URL('.', (BETIK && BETIK.src) || location.href).href; }
    catch (e) { return 'https://cdn.jsdelivr.net/gh/hakkurgithub/hasinder.ai@main/'; }
  })();

  var motorSozu = null;
  function motorYukle() {
    if (window.HasinderMotor) return Promise.resolve(window.HasinderMotor);
    if (motorSozu) return motorSozu;
    motorSozu = new Promise(function (coz, reddet) {
      var s = document.createElement('script');
      s.src = TABAN + 'app.js';
      s.async = true;
      s.onload = function () { window.HasinderMotor ? coz(window.HasinderMotor) : reddet(new Error('Motor bulunamadı')); };
      s.onerror = function () { reddet(new Error('app.js yüklenemedi')); };
      document.head.appendChild(s);
    });
    return motorSozu;
  }

  var CSS =
    ':host{all:initial}' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    '.hw{font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2937;max-width:560px;' +
    'border:1px solid #d1d5db;border-radius:12px;overflow:hidden;background:#fff;display:flex;flex-direction:column}' +
    '.hw-bas{background:#0d9488;color:#fff;padding:11px 14px;font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:8px}' +
    '.hw-kapat{background:none;border:0;color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:0 4px}' +
    '.hw-kutu{height:320px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f9fafb}' +
    '.hw-m{padding:9px 12px;border-radius:10px;max-width:90%;white-space:pre-wrap;word-wrap:break-word;font-size:13.5px}' +
    '.hw-k{align-self:flex-end;background:#ccfbf1;color:#134e4a}' +
    '.hw-a{align-self:flex-start;background:#fff;border:1px solid #e5e7eb}' +
    '.hw-a a{color:#0f766e}' +
    '.hw-kay{display:block;margin-top:6px;font-size:11px;color:#6b7280}' +
    '.hw-bekle{color:#6b7280;font-style:italic}' +
    '.hw-oneriler{display:flex;flex-wrap:wrap;gap:6px}' +
    '.hw-oneri{border:1px solid #99f6e4;background:#fff;color:#0f766e;border-radius:14px;padding:5px 10px;font:inherit;font-size:12.5px;cursor:pointer;text-align:left}' +
    '.hw-oneri:hover{background:#f0fdfa}' +
    '.hw-giris{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}' +
    '.hw-input{flex:1;border:1px solid #d1d5db;border-radius:8px;padding:9px 11px;font:inherit;font-size:13.5px;min-width:0}' +
    '.hw-input:focus,.hw-oneri:focus-visible,.hw-gonder:focus-visible,.hw-ac:focus-visible{outline:2px solid #0d9488;outline-offset:1px}' +
    '.hw-gonder{background:#0d9488;color:#fff;border:0;border-radius:8px;padding:0 16px;font:inherit;font-weight:700;cursor:pointer}' +
    '.hw-gonder:disabled{opacity:.6;cursor:wait}' +
    '.hw-alt{font-size:11px;color:#6b7280;text-align:center;padding:6px;background:#fff}' +
    '.hw-alt a{color:#0f766e;text-decoration:none}' +
    '.sabit{position:fixed;right:20px;bottom:80px;width:380px;max-width:calc(100vw - 32px);z-index:2147483000;' +
    'box-shadow:0 10px 30px rgba(15,118,110,.25);display:none}' +
    '.sabit.acik{display:flex}' +
    '.sabit .hw-kutu{height:min(46vh,380px)}' +
    '.hw-ac{position:fixed;right:20px;bottom:20px;z-index:2147483001;height:46px;padding:0 20px;border-radius:23px;border:0;' +
    'background:#0d9488;color:#fff;font:700 13px system-ui,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(13,148,136,.4)}' +
    '.hw-ac:hover{background:#0f766e}' +
    '@media (prefers-reduced-motion:no-preference){.sabit.acik{animation:hwAc .18s ease-out}}' +
    '@keyframes hwAc{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';

  function metniCiz(hedef, metin) {
    String(metin).split(/(https:\/\/[^\s]+)/g).forEach(function (parca) {
      if (/^https:\/\/[^\s]+$/.test(parca)) {
        var a = document.createElement('a');
        a.href = parca; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = parca.length > 50 ? parca.slice(0, 47) + '…' : parca;
        hedef.appendChild(a);
      } else if (parca) {
        hedef.appendChild(document.createTextNode(parca));
      }
    });
  }

  function el(etiket, sinif, metin) {
    var e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin != null) e.textContent = metin;
    return e;
  }

  function widgetOlustur(hedef) {
    if (hedef.__hasinder) return hedef.__hasinder;
    var konum = hedef.getAttribute('data-hasinder-konum') || '';
    var baslik = hedef.getAttribute('data-hasinder-baslik') || 'hasinder.ai Asistan';
    var sabit = hedef.hasAttribute('data-hasinder-sabit');
    var onSoru = hedef.getAttribute('data-hasinder-onsoru') !== 'kapat';
    var otoAc = hedef.getAttribute('data-hasinder-otomatik') === 'ac';

    var kok = hedef.attachShadow ? hedef.attachShadow({ mode: 'open' }) : hedef;
    var stil = el('style'); stil.textContent = CSS; kok.appendChild(stil);

    var panel = el('div', 'hw' + (sabit ? ' sabit' : ''));
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', baslik);
    var bas = el('div', 'hw-bas'); bas.appendChild(el('span', '', baslik));
    var kutu = el('div', 'hw-kutu'); kutu.setAttribute('aria-live', 'polite');
    var giris = el('div', 'hw-giris');
    var input = el('input', 'hw-input');
    input.type = 'text'; input.maxLength = 500; input.placeholder = 'Sorunuzu yazın…';
    input.setAttribute('aria-label', 'Sorunuz');
    var gonder = el('button', 'hw-gonder', 'Sor'); gonder.type = 'button';
    giris.appendChild(input); giris.appendChild(gonder);
    var alt = el('div', 'hw-alt');
    alt.appendChild(document.createTextNode('HAS İNSAN DER · '));
    var link = el('a', '', 'hasinder.com'); link.href = 'https://hasinder.com'; link.target = '_blank'; link.rel = 'noopener';
    alt.appendChild(link);
    panel.appendChild(bas); panel.appendChild(kutu); panel.appendChild(giris); panel.appendChild(alt);
    kok.appendChild(panel);

    if (sabit) {
      var kapat = el('button', 'hw-kapat', '×'); kapat.type = 'button'; kapat.setAttribute('aria-label', 'Kapat');
      bas.appendChild(kapat);
      var ac = el('button', 'hw-ac', 'hasinder.ai'); ac.type = 'button';
      ac.setAttribute('aria-label', 'hasinder.ai asistanını aç');
      kok.appendChild(ac);
      var degistir = function (acik) {
        panel.classList.toggle('acik', acik);
        ac.setAttribute('aria-expanded', acik ? 'true' : 'false');
        if (acik) input.focus();
      };
      ac.addEventListener('click', function () { degistir(!panel.classList.contains('acik')); });
      kapat.addEventListener('click', function () { degistir(false); ac.focus(); });
      if (otoAc) setTimeout(function () { degistir(true); }, 1200);
    }

    var gecmis = [], mesgul = false, motor = null;

    function mesaj(kim, metin, kaynak) {
      var m = el('div', 'hw-m ' + (kim === 'k' ? 'hw-k' : 'hw-a'));
      metniCiz(m, metin);
      if (kaynak) m.appendChild(el('span', 'hw-kay', kaynak));
      kutu.appendChild(m);
      kutu.scrollTop = kutu.scrollHeight;
      return m;
    }

    async function sor(metin) {
      metin = String(metin || '').trim();
      if (!metin || mesgul) return;
      mesgul = true; gonder.disabled = true;
      var liste = kutu.querySelector('.hw-oneriler'); if (liste) liste.remove();
      mesaj('k', metin);
      var bekle = mesaj('a', 'Yanıt hazırlanıyor…'); bekle.classList.add('hw-bekle');
      var cevap;
      try {
        motor = motor || await motorYukle();
        cevap = await motor.cevapla(metin, gecmis);
      } catch (e) {
        console.warn('[hasinder.ai widget]', e);
        cevap = { metin: 'Asistana şu an ulaşılamıyor. Uzmanımıza WhatsApp ile yazabilirsiniz:\nhttps://wa.me/905333715577', kaynak: 'Uzman Yönlendirme' };
      }
      bekle.remove();
      mesaj('a', cevap.metin, cevap.kaynak);
      gecmis.push({ role: 'user', content: metin }, { role: 'assistant', content: cevap.metin });
      if (gecmis.length > 16) gecmis = gecmis.slice(-16);
      mesgul = false; gonder.disabled = false;
    }

    gonder.addEventListener('click', function () { var t = input.value; input.value = ''; sor(t); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); gonder.click(); } });

    var yukleniyor = mesaj('a', 'Bilgi bankası yükleniyor…'); yukleniyor.classList.add('hw-bekle');
    motorYukle().then(function (m) { motor = m; return m.hazirla(); }).then(function (ist) {
      yukleniyor.remove();
      mesaj('a', ist.kayit ? 'Merhaba! Sorunuzu yazın, yardımcı olayım.' : 'Bilgi bankasına ulaşılamadı; sorunuzu yine de yazabilirsiniz.');
      if (onSoru && ist.kayit) {
        var ornekler = motor.ornekSorular(konum, 6);
        if (ornekler.length) {
          var liste = el('div', 'hw-oneriler');
          ornekler.forEach(function (s) {
            var b = el('button', 'hw-oneri', s); b.type = 'button';
            b.addEventListener('click', function () { sor(s); });
            liste.appendChild(b);
          });
          kutu.appendChild(liste);
        }
      }
    }).catch(function (e) {
      yukleniyor.remove();
      console.warn('[hasinder.ai widget]', e);
      mesaj('a', 'Asistan yüklenemedi. Sayfayı yenileyin veya https://hasinder.com adresini ziyaret edin.');
    });

    var api = { soruSor: sor, ac: function () { if (sabit) panel.classList.add('acik'); } };
    hedef.__hasinder = api;
    return api;
  }

  function baslat() {
    var hedefler = document.querySelectorAll('[data-hasinder]');
    for (var i = 0; i < hedefler.length; i++) widgetOlustur(hedefler[i]);
  }

  window.HasinderWidget = { baslat: baslat, widgetOlustur: widgetOlustur, motorYukle: motorYukle };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat);
  else baslat();
})();
