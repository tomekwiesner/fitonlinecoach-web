/* Poradniki FitOnlineCoach: wspólny skrypt spisu i wszystkich poradników. Bez narzędzi budowania.
   Okienko zgód i skrypt zgód = kopia strony głównej (strona-start/index.html), zbudowana skryptem
   strona-www-galeria/2026-11-11-poradnik1/_zgody/zbuduj_zgody.py. Jedyna różnica: pomiar kliknięć (PORADNIKI niżej).
   Numery pikseli są w foc-marketing.js, nie tutaj; muszą być równe FOC_MARKETING strony głównej (ten sam klucz zgody).
   ⚠ Zmiana zgód na stronie głównej = ponowne zbudowanie tego pliku, test _zgody/test_zgody.js i F40 (_zgody/f40_poradnik.js)
   oraz zgłoszenie do działu prawnego: polityka prywatności opisuje dokładnie ten kod. */

/* Tryb zgody Google: domyślnie wszystko zabronione, zanim cokolwiek się wczyta */
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted',
  wait_for_update: 500
});

/*BANER-START*/
document.body.insertAdjacentHTML('afterbegin', `<div class="cc" id="cc" role="dialog" aria-live="polite" aria-label="Zgoda na pliki cookies">
  <div class="cc-in">
    <div class="cc-txt">
      <b>Ciasteczka</b>
      <p><span data-cc="ga4" hidden>Za Twoją zgodą FitOnlineCoach włącza statystyki Google
        Analytics oraz reklamy Meta (m.in. Facebook, Instagram)
        i&nbsp;Google: pomiar i&nbsp;dopasowanie reklam do
        Ciebie. Korzystają z&nbsp;plików cookies i&nbsp;adresu
        IP. Zgodę wycofasz w&nbsp;„Ustawieniach cookies” na dole strony.</span><span data-cc="!ga4">Na Twoim urządzeniu zapisujemy pliki niezbędne do działania strony. Reklamy — tylko za zgodą.</span>
        Szczegóły w&nbsp;<a href="https://app.fitonlinecoach.com/polityka-prywatnosci" target="_blank" rel="noopener">polityce prywatności</a>.</p>
    </div>
    <div class="cc-btns">
      <button class="cc-btn primary" id="ccAll" type="button">Zgadzam się</button>
      <button class="cc-btn" id="ccNec" type="button">Tylko niezbędne</button>
      <button class="cc-link" id="ccSettings" type="button">Ustawienia</button>
    </div>
    <div class="cc-opts" id="ccOpts">
      <div class="cc-opt locked">
        <input type="checkbox" id="ccNecCb" checked disabled>
        <label for="ccNecCb"><b>Niezbędne</b>
          <span>Zawsze włączone, bez nich strona nie działa.</span></label>
      </div>
      <div class="cc-opt" data-cc="ga4" hidden>
        <input type="checkbox" id="ccAnaCb">
        <label for="ccAnaCb"><b>Statystyki</b>
          <span>Google Analytics: ile osób odwiedza stronę, skąd przychodzą i&nbsp;co klikają — żeby ją poprawiać.</span></label>
      </div>
      <div class="cc-opt">
        <input type="checkbox" id="ccMktCb">
        <label for="ccMktCb"><b>Reklamy</b>
          <span data-cc="ads" hidden>Meta (m.in. Facebook, Instagram) i&nbsp;Google: mierzymy skuteczność naszych reklam
            i&nbsp;dopasowujemy je do Ciebie. Za tą zgodą aplikacja zapamięta też w&nbsp;przeglądarce na 30 dni, z&nbsp;której
            reklamy lub linku do nas trafiasz. <a href="https://business.safety.google/privacy/" target="_blank" rel="noopener">Jak Google wykorzystuje dane.</a></span><span data-cc="!ads">Za tą zgodą
            aplikacja zapamięta w&nbsp;przeglądarce na 30 dni, z&nbsp;której reklamy lub linku do nas trafiasz.</span></label>
      </div>
      <div class="cc-btns">
        <button class="cc-btn primary" id="ccSave" type="button">Zapisz</button>
      </div>
    </div>
  </div>
</div>`);
/*BANER-KONIEC*/

/*ZGODY-START*/
(() => {
  /* 2026-10-07 (decyzja Tomka D11): WERSJA 2 — „Reklamy” obejmują też zapamiętanie źródła wizyty (UTM i identyfikatory
     kliknięć) na 30 dni w aplikacji, więc zgody v1 (węższy cel) przestają działać (w praktyce nikt ich nie ma:
     na serwerze baner v1 nigdy się nie pokazał, bo gniazda FOC_MARKETING były puste).
     FORMAT CZYTA APKA (src/lib/utm.ts): foc_consent = encodeURIComponent(JSON.stringify({v: 2, a, m, t})),
     a = Statystyki, m = Reklamy (true/false), t = chwila decyzji (ISO); path=/, domain=.fitonlinecoach.com
     (na localhost bez domain), 365 dni, Secure, SameSite=Lax. Zmiana formatu albo wersji = zmiana w apce.
     2026-10-08 (D11, runda napraw): dochodzi pole k = zestaw narzędzi opisanych w banerze w chwili decyzji
     (f = Meta, g = Google Ads, a = GA4; '' = sama pamięć źródła w apce). Apka go nie czyta. Gdy zestaw się zmieni
     (wpisany identyfikator), strona pyta od nowa — zgoda dana przy opisie bez Instagrama i Google nie może włączyć
     Pixela (art. 4 pkt 11 i art. 7 RODO przez art. 400 PKE). „a” zapisujemy tylko, gdy wiersz „Statystyki” był w banerze. */
  const NAZWA = 'foc_consent', WERSJA = 2, DNI = 365;
  const cfg = window.FOC_MARKETING || {};
  const el = id => document.getElementById(id);
  const baner = el('cc');
  const jest = {ga4: !!cfg.ga4Id, ads: !!(cfg.metaPixelId || cfg.googleAdsId)};
  const ZESTAW = (cfg.metaPixelId ? 'f' : '') + (cfg.googleAdsId ? 'g' : '') + (cfg.ga4Id ? 'a' : '');
  /* znaczniki data-cc w banerze: pokazujemy tylko opis narzędzi, które naprawdę są wpisane */
  baner.querySelectorAll('[data-cc]').forEach(e => {
    const k = e.dataset.cc;
    e.hidden = k[0] === '!' ? jest[k.slice(1)] : !jest[k];
  });

  /* zgoda zapisywana na domenie nadrzędnej — dzięki temu obowiązuje też w app.fitonlinecoach.com */
  /* 2026-10-07 (D11): dokładnie fitonlinecoach.com albo jej subdomeny — nie „cokolwiek kończące się na fitonlinecoach.com” */
  const domena = () => /(^|\.)fitonlinecoach\.com$/.test(location.hostname) ? '; domain=.fitonlinecoach.com' : '';
  const zapisz = z => {
    document.cookie = `${NAZWA}=${encodeURIComponent(JSON.stringify(z))}; path=/${domena()}; max-age=${DNI * 86400}; Secure; SameSite=Lax`;
  };
  const odczytaj = () => {
    const m = document.cookie.match(new RegExp('(?:^|; )' + NAZWA + '=([^;]*)'));
    if (!m) return null;
    try {
      const z = JSON.parse(decodeURIComponent(m[1]));
      return z && z.v === WERSJA && (z.k || '') === ZESTAW ? z : null;
    } catch (_) { return null; }
  };

  /* Każde narzędzie ma WŁASNĄ flagę „już wczytane". Dzięki temu, gdy klient najpierw
     zgodzi się tylko na statystyki, a potem w „Ustawieniach" dołoży marketing,
     brakujące narzędzia doładują się od razu — bez przeładowania strony —
     a żadne nie wczyta się (ani nie policzy wejścia) drugi raz. */
  let gtagJs = false, ga4Wczytane = false, adsWczytane = false, pixelWczytany = false;
  /* 2026-11-11 (prawo, luka sprzed D31): zgoda wycofana w INNEJ karcie zmienia ciasteczko, ale flagi wczytania w tej karcie
     zostają true do przeładowania. Przed każdym zdarzeniem czytamy więc zgodę z ciasteczka; gdy któreś wczytane narzędzie
     straciło zgodę (albo zgody nie ma), nic nie wysyłamy — gtag bez send_to poszedłby do wszystkich wczytanych celów. */
  /* 2026-11-11 (prawo): adres bez identyfikatorów kliknięć reklam — jedna funkcja dla config GA4 i dla adresu strony
     po kliknięciu w menu (pushState niżej, w skrypcie przystanków). Utm zostaje; URL.toString() nie zostawia pustego „?”. */
  const bezIdKlikniec = href => { try { const u = new URL(href); ['gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'msclkid'].forEach(k => u.searchParams.delete(k)); return u.toString(); } catch (_) { return href.split('?')[0]; } };
  window.FOC_BEZ_ID_KLIKNIEC = bezIdKlikniec;
  const zgodaAktualna = () => { const z = odczytaj(); return !!z && !!(z.a || z.m) && !((adsWczytane || pixelWczytany) && !z.m) && !(ga4Wczytane && !z.a); };
  const wczytajNarzedzia = z => {
    const chceGa4 = !!(z.a && cfg.ga4Id), chceAds = !!(z.m && cfg.googleAdsId);
    /* Google: jedna biblioteka obsługuje i Ads, i Analytics */
    if ((chceGa4 || chceAds) && !gtagJs) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + (chceGa4 ? cfg.ga4Id : cfg.googleAdsId);
      document.head.appendChild(s);
      gtag('js', new Date());
      gtagJs = true;
    }
    /* 2026-11-11 (prawo, luka sprzed D31): GA4 nie dostaje identyfikatorów kliknięć reklam (gclid, fbclid…) w adresie strony
       ani w adresie poprzedniej strony (przejścia spis → poradnik → strona główna) — polityka przy „Statystykach” opisuje tylko
       oznaczenia kampanii (utm), te zostają. URL.toString() nie zostawia pustego „?”; pusty referrer = pole pominięte. */
    if (chceGa4 && !ga4Wczytane) {
      const ustGa4 = {anonymize_ip: true, page_location: bezIdKlikniec(location.href)};
      if (document.referrer) ustGa4.page_referrer = bezIdKlikniec(document.referrer);
      gtag('config', cfg.ga4Id, ustGa4); ga4Wczytane = true;
    }
    if (chceAds && !adsWczytane) { gtag('config', cfg.googleAdsId); adsWczytane = true; }
    /* Meta Pixel — tylko przy zgodzie marketingowej */
    if (z.m && cfg.metaPixelId && !pixelWczytany) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s)
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      /* 2026-11-01 (przegląd prawny, pkt 11): bez zdarzeń automatycznych Meta (kliknięcia przycisków), polityka ich nie opisuje */
      fbq('set', 'autoConfig', false, cfg.metaPixelId);
      fbq('init', cfg.metaPixelId);
      fbq('track', 'PageView');
      pixelWczytany = true;
    }
  };

  const zastosuj = (z, zapisac) => {
    if (zapisac) zapisz(z);
    /* 2026-10-11 (uwaga kontrolera, D11): sygnały reklamowe Google (ad_*) dostają „granted” TYLKO wtedy, gdy wpisany jest
       identyfikator narzędzia reklamowego (Meta albo Google Ads) — wtedy opis „Reklam” w banerze mówi o Instagramie
       i Google (znacznik data-cc="ads"). Przy samej pamięci źródła w apce albo samym GA4 zgoda „Reklamy” nie może dawać
       Google zgody na reklamy, bo baner o tym nie informuje (art. 4 pkt 11 RODO, art. 399–400 PKE). Pole z.m zostaje
       bez zmian — czyta je apka (pamięć źródła). Nieznany stan zgody = brak zgody. */
    const reklamyGoogle = z.m && jest.ads ? 'granted' : 'denied';
    gtag('consent', 'update', {
      ad_storage: reklamyGoogle,
      ad_user_data: reklamyGoogle,
      ad_personalization: reklamyGoogle,
      analytics_storage: z.a ? 'granted' : 'denied'
    });
    /* 2026-10-04 (przegląd prawny, F40): wycofanie zgody bez wyjścia ze strony. Wczytanego Pixela i gtag nie da się
       „odładować", a flagi wczytania zostają true — bez tego po „Tylko niezbędne" dalej leciałyby zdarzenia
       (InitiateCheckout, Lead…) i odczyty _fbp. Dlatego: revoke dla Meta, skasowanie ciasteczek wycofanego celu
       (każdy wariant domeny) i przeładowanie — po nim narzędzia bez zgody się nie wczytają. Wybór jest już zapisany
       wyżej, a Google dostał „denied". Art. 7 ust. 3 i art. 6 ust. 1 lit. a RODO, art. 399–400 PKE. */
    const cofaReklamy = (pixelWczytany || adsWczytane) && !z.m;
    const cofaStaty = ga4Wczytane && !z.a;
    if (cofaReklamy || cofaStaty) {
      try { if (cofaReklamy && window.fbq) fbq('consent', 'revoke'); } catch (_) {}
      const doSkasowania = n => (cofaReklamy && /^(_fbp|_fbc|_gcl_.+)$/.test(n)) || (cofaStaty && /^(_ga|_ga_.+)$/.test(n));
      document.cookie.split('; ').map(c => c.split('=')[0]).filter(doSkasowania).forEach(n =>
        ['', domena(), '; domain=' + location.hostname].forEach(d => {
          document.cookie = n + '=; path=/' + d + '; max-age=0';
        }));
      location.reload();
      return;
    }
    if (z.a || z.m) wczytajNarzedzia(z);
    window.FOC_ZGODA = z;
    document.dispatchEvent(new CustomEvent('foc:zgoda', {detail: z}));
    baner.classList.remove('show');
    el('ccOpts').classList.remove('show');
  };

  const nowa = (a, m) => ({v: WERSJA, a: !!a && jest.ga4, m: !!m, k: ZESTAW, t: new Date().toISOString()});

  el('ccAll').addEventListener('click', () => zastosuj(nowa(true, true), true));
  el('ccNec').addEventListener('click', () => zastosuj(nowa(false, false), true));
  /* po rozwinięciu telefon pokazuje od razu wiersze wyboru: bez tego „Reklamy” zostają pod „Zapisz” i nic nie podpowiada przewinięcia */
  const doWyboru = () => { baner.scrollTop = el('ccOpts').offsetTop; };
  el('ccSettings').addEventListener('click', () => { el('ccOpts').classList.toggle('show'); doWyboru(); });
  el('ccSave').addEventListener('click', () => zastosuj(nowa(el('ccAnaCb').checked, el('ccMktCb').checked), true));

  const pokaz = () => {
    const z = odczytaj();
    if (z) { el('ccAnaCb').checked = z.a; el('ccMktCb').checked = z.m; el('ccOpts').classList.add('show'); }
    baner.classList.add('show');
    doWyboru();
  };
  el('ccReopen').addEventListener('click', pokaz);

  /* ===== Pomiar konwersji: klik w „Kup plan” (plan, z kwotą), „Opieka indywidualna” (z kwotą) i hero „Dołącz”
     (lista planów /plany, osobne zdarzenie bez kwoty) — rozdzielone 2026-11-10 (D31; wcześniej jedno begin_checkout bez kwoty) =====
     Nasłuch na CAŁYM dokumencie, bo przycisk „Kup plan" jest podmieniany skryptem
     przy przełączaniu planów — nasłuch przypięty do samego przycisku by go zgubił.
     Zdarzenie leci wyłącznie, gdy narzędzie jest realnie wczytane (czyli była zgoda
     i wpisany identyfikator). Nigdy nie zatrzymuje przejścia do aplikacji. */
  /* Z-E7: źródło reklamy (utm_*) z adresu strony doklejamy do linków do aplikacji —
     apka dopisuje je do konta przy rejestracji i zakupie (src/lib/utm.ts).
     2026-10-07 (decyzja Tomka D11): oprócz utm_* także identyfikatory kliknięć reklam (gclid, gbraid, wbraid — Google;
     fbclid — Meta; ttclid — TikTok; msclkid — Microsoft), i do WSZYSTKICH linków do apki poza regulaminem i polityką
     (np. „Aplikacja” w menu). Bez warunku zgody, bo strona niczego tu nie zapisuje ani nie odczytuje z urządzenia —
     tylko przepisuje adres na adres (art. 399 PKE tego nie obejmuje; F24 odrzucone przez weryfikatora prawa).
     Apka zapisuje je przy koncie i zakupie na podstawie art. 6 ust. 1 lit. f RODO (prawo sprzeciwu), a w pamięci
     przeglądarki na 30 dni tylko za zgodą „Reklamy” z banera wyżej (foc_consent v2, m: true).
     Wartość do 500 znaków (było 100): nowe fbclid bywają dłuższe, a ucięty identyfikator kliknięcia jest bezwartościowy.
     Wcześniej nie przechodziło nawet przy „Kup plan" (?kup=1): reklama → strona → apka gubiła źródło.
     Raz przy wczytaniu, a nie przy kliknięciu — wtedy działa też otwarcie w nowej karcie środkowym przyciskiem. */
  const ZRODLO_WIZYTY = /^(utm_[a-z]+|gclid|gbraid|wbraid|fbclid|ttclid|msclkid)$/;
  const utmStrony = [...new URLSearchParams(location.search)].filter(([k]) => ZRODLO_WIZYTY.test(k));
  if (utmStrony.length) document.querySelectorAll('a[href*="app.fitonlinecoach.com"]:not([href*="/regulamin"]):not([href*="/polityka"])').forEach(a => {
    try {
      const u = new URL(a.href);
      utmStrony.forEach(([k, v]) => { if (!u.searchParams.has(k)) u.searchParams.set(k, v.slice(0, 500)); });
      a.href = u.toString();
    } catch (_) { /* zły adres — zostaje jak był */ }
  });

  /* ===== PORADNIKI: pomiar oferty zamiast nasłuchu strony głównej (opis „Pomiar konwersji” wyżej dotyczy strony głównej) =====
     2026-11-11: dokładnie wzór D31 strony głównej („Kup plan”), te same pola, nazwy i warunki zgody — bez żadnych dodatkowych pól.
     Jedyna różnica: kwota z atrybutu data-cena przy linku oferty (wstawia go zbuduj_poradnik.py z JSON-LD strony głównej,
     ta sama liczba co w tekście oferty), bo poradnik nie ma w <head> danych Product. Link bez data-cena = brak zdarzenia
     (regulamin, „Zaloguj się”, oferta przy zamkniętej sprzedaży). Wolno wysłać tylko rodzaj oferty, kwotę, PLN i adres bez „?”
     (ocena prawa D31-strona, 10.11). Każdą zmianę zdarzeń zgłosić prawu. */
  document.addEventListener('click', e => {
    const a = e.target && e.target.closest ? e.target.closest('a[href*="app.fitonlinecoach.com"]') : null;
    if (!a || !zgodaAktualna()) return;   /* zgoda mogła zostać wycofana w innej karcie */
    const adres = (a.getAttribute('href') || '').split('?')[0];
    const cena = Number(a.getAttribute('data-cena')) || 0;
    const oferta = cena ? adres.replace(/\/$/, '').split('/').pop() : '';
    if (!oferta) return;
    try {
      if (ga4Wczytane || adsWczytane) gtag('event', 'begin_checkout', {currency: 'PLN', value: cena, items: [{item_id: oferta, price: cena}], link_url: adres});
      const etykieta = adsWczytane && (cfg.adsKonwersje || {})[oferta];   /* konwersja Google Ads tylko po zgodzie na „Reklamy” */
      if (etykieta) gtag('event', 'conversion', {send_to: cfg.googleAdsId + '/' + etykieta, value: cena, currency: 'PLN'});
      if (pixelWczytany && window.fbq) fbq('track', 'InitiateCheckout', {value: cena, currency: 'PLN', content_ids: [oferta], content_type: 'product'});
    } catch (_) { /* pomiar nigdy nie może zepsuć kliknięcia */ }
  }, true);

  /* Baner pojawia się tylko wtedy, gdy jest o co pytać.
     2026-10-08 (decyzja Tomka D11, runda napraw): jest o co pytać także przy pustych gniazdach — za zgodą na „Reklamy”
     aplikacja zapamiętuje źródło wizyty na 30 dni (src/lib/utm.ts). Wcześniej baner milczał, dopóki gniazda były puste,
     więc nikt nie mógł się zgodzić i pamięć źródła nigdy by nie zadziałała. Wariant (b) — pamięć 30 dni dopiero po
     wpisaniu identyfikatorów — to PAMIEC_ZRODLA_W_APCE = false; wtedy przy pustych gniazdach znika baner i link
     „Ustawienia cookies”, a polityka apki (pkt 10) musi przestać odsyłać do okienka zgód.
     Nad bramką „Już wkrótce” baner sam nie wyskakuje: z bramki nie da się przejść do zakupu ani rejestracji, więc
     pytanie nie miałoby celu. Pojawia się po zdjęciu bramki (kod podglądu, a w dniu startu — dla wszystkich). */
  const PAMIEC_ZRODLA_W_APCE = true;
  const czySledzimy = PAMIEC_ZRODLA_W_APCE || !!(cfg.metaPixelId || cfg.googleAdsId || cfg.ga4Id);
  window.FOC_SLEDZENIE_AKTYWNE = czySledzimy;
  el('ccReopen').hidden = !czySledzimy;   /* bez banera nie ma też linku w stopce */

  const zapisana = odczytaj();
  if (zapisana) zastosuj(zapisana, false);
  else if (czySledzimy) setTimeout(pokaz, 900);
})();
/*ZGODY-KONIEC*/

/* Menu na telefonie */
(() => {
const burger = document.getElementById('burger');
const nav = document.getElementById('navLinks');
/* Zakryte przez zasłonę: cała treść strony ORAZ logo w nagłówku. Logo zostaje pod
   zasłoną, więc bez tego dawało się na nie wejść klawiszem Tab, choć go nie widać.
   Sam nagłówek zostaje aktywny — inaczej zniknąłby też hamburger i menu. */
const logo = document.querySelector('#header .logo');
const zakryte = () => [...document.body.children].filter(e => e.id !== 'header')
  .concat(logo ? [logo] : []);
burger.setAttribute('aria-expanded', 'false');
burger.setAttribute('aria-controls', 'navLinks');

const ustawMenu = otwarte => {
  burger.classList.toggle('open', otwarte);
  nav.classList.toggle('open', otwarte);
  burger.setAttribute('aria-expanded', String(otwarte));
  /* `inert` nie działa na sam nagłówek — wtedy zniknąłby też hamburger i menu */
  zakryte().forEach(e => { if (otwarte) e.setAttribute('inert', ''); else e.removeAttribute('inert'); });
  if (otwarte) { const pierwszy = nav.querySelector('a'); if (pierwszy) pierwszy.focus(); }
  else burger.focus();
};

burger.addEventListener('click', () => ustawMenu(!nav.classList.contains('open')));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => ustawMenu(false)));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && nav.classList.contains('open')) ustawMenu(false);
});
})();
