// Silnik 3D strony (PROJEKT.md B.3). Jedno płótno i jeden kontekst WebGL przenoszone do aktywnego hosta
// (największy udział widoczności). Rysowanie tylko na żądanie: sprężyna kąta, zmiana rozmiaru, powiększenie.
// Host „dl": ekran to żywy DOM nałożony homografią; host „hero" (B.7): ekran to tekstura na płaszczyźnie ekranu.
// Host „omnie" (B.6, talerz: true): talerz red25 z kalkomanią we własnej scenie; pozę, kamerę i kwadrat płótna liczy strona
// (FOC_FIZ.rzutOmnie) i podaje co klatkę przez talerz(nazwa, stan) — obrys maski hasła i obraz mają jedno źródło.
// Geometria telefonu i kamera z window.FOC_FIZ (blok FIZYKA w index.html) — ta sama, z której strona
// liczy homografię ekranu DOM, więc nakładka i bryła się pokrywają. Test: strona3d/testy/sonda.mjs … dlaczego.
import * as THREE from './vendor/three.module.js?v=20260926';

const V = '?v=20260926', ST = Math.PI / 180, FIZ = window.FOC_FIZ, TEL = FIZ.TELEFON;
/* światło dobrane pomiarem względem Cycles (E3, render_podglady.mjs): otoczenie × mnożnik materiału, światło kluczowe */
const POKRETLA = { otoczenie: 0.9, klucz: 2.6, env_tytan: 0.4, env_stal: 5 };
const std = (kolor, o) => new THREE.MeshStandardMaterial({ color: kolor, side: THREE.FrontSide, ...o });
const MAT = {
  tytan: () => std('#4C4C4D', { metalness: 1, roughness: 0.32 }),
  anteny: () => std('#0C0C0D', { roughness: 0.45 }),
  szklo_przod: () => std('#050506', { roughness: 0.04 }),
  tyl: () => std('#262628', { roughness: 0.55 }),
  cc: () => std('#1A1C1E', { roughness: 0.2 }),
  port: () => std('#000000', { roughness: 1 }),
  guma: () => std('#E53944', { roughness: 0.78 }),
  tarcza: () => std('#A5292F', { roughness: 0.78 }),                     // guma × 0,72 (TARCZA_CIEMNIEJ)
  stal: () => std(new THREE.Color().setRGB(0.8, 0.8, 0.82, THREE.LinearSRGBColorSpace), { metalness: 1, roughness: 0.3 }),
  kalkomania: mapa => std('#ffffff', { map: mapa, transparent: true, roughness: 0.3, emissive: '#ffffff', emissiveMap: mapa,
    emissiveIntensity: 0.15, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
};

/* format eksport_web.py: Int16/Int8 znormalizowane, środek i skala części na siatce */
async function wczytajModel(nazwa, mapa) {
  const [j, bin] = await Promise.all([fetch(`assets/3d/${nazwa}.json${V}`).then(r => r.json()),
    fetch(`assets/3d/${nazwa}.bin${V}`).then(r => r.arrayBuffer())]);
  const grupa = new THREE.Group();
  for (const c of j.czesci) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Int16Array(bin, c.off.pos, c.nV * 3), 3, true));
    g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(bin, c.off.nrm, c.nV * 3), 3, true));
    if (c.off.uv !== undefined) g.setAttribute('uv', new THREE.BufferAttribute(new Uint16Array(bin, c.off.uv, c.nV * 2), 2, true));
    g.setIndex(new THREE.BufferAttribute(new (c.idx32 ? Uint32Array : Uint16Array)(bin, c.off.idx, c.nI), 1));
    const m = new THREE.Mesh(g, MAT[c.mat](mapa));
    m.name = c.mat;
    m.frustumCulled = false;                                     /* model zawsze w kadrze: bez liczenia sfer z Int16 w 1. klatce */
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.sqrt(3));   /* sortowanie i tak liczyło sferę (36 ms przy 4× CPU, E10); pozycje w [−1, 1] */
    m.position.fromArray(c.srodek);
    m.scale.setScalar(c.skala);
    grupa.add(m);
  }
  return grupa;
}

export async function start({ diag = false } = {}) {
  const dpr = devicePixelRatio || 1, prBaza = Math.min(dpr, (navigator.deviceMemory ?? 8) <= 4 ? 1.5 : 2);
  const r = new THREE.WebGLRenderer({ alpha: true, premultipliedAlpha: true, antialias: dpr < 2, powerPreference: 'high-performance' });
  r.toneMapping = THREE.NoToneMapping;
  r.outputColorSpace = THREE.SRGBColorSpace;
  const cv = r.domElement;
  cv.className = 'gl3d';
  cv.setAttribute('aria-hidden', 'true');

  const scena = new THREE.Scene();
  /* kompilacja i próbna klatka po jednej siatce, z przerwą między zadaniami: naraz to przy 4× CPU zadania ok. 75 i 180 ms (E10).
     Programy z próbnej klatki na płótnie (cel renderowania ma inną przestrzeń barw, więc inne programy); po każdej próbie
     w tym samym zadaniu płótno wraca do obrazu aktywnego hosta (po), więc próba nigdy nie trafia na ekran. */
  const odpocznij = () => new Promise(ok => setTimeout(ok));
  const rozgrzej = async (sc, k, po) => {
    const siatki = [];
    sc.traverse(n => n.isMesh && siatki.push(n));
    for (const m of siatki) { await r.compileAsync(m, k, sc); await odpocznij(); }
    const wid = siatki.map(m => m.visible);
    for (const m of siatki) {
      siatki.forEach(x => { x.visible = x === m; });
      r.render(sc, k);
      siatki.forEach((x, i) => { x.visible = wid[i]; });
      r.clear(); po();
      await odpocznij();
    }
  };
  const [envJ, telefon] = await Promise.all([fetch(`assets/3d/studio_env.json${V}`).then(x => x.json()), wczytajModel('iphone16pro')]);
  /* otoczenie po PMREM wypieczone raz (strona3d/testy/pmrem_wypiek.mjs + .py: ten sam PMREMGenerator na studio_env.jpg, sRGB 8 bit):
     shader filtra GGX (256 próbek) kompilował się w ANGLE/D3D11 ok. 1 s i blokował stronę przy starcie silnika (E10) */
  const envMapa = await new THREE.TextureLoader().loadAsync(`assets/3d/studio_env_pmrem.webp${V}`);
  await envMapa.image.decode();                                /* dekodowanie poza wątkiem strony, nie przy wysyłce w 1. klatce */
  Object.assign(envMapa, { mapping: THREE.CubeUVReflectionMapping, colorSpace: THREE.SRGBColorSpace, flipY: false,
    generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const kb = envJ.swiatlo_kierunkowe_blender;                  // Blender (x, y, z), Z w górę → three (x, z, −y)
  const klucz = new THREE.DirectionalLight('#ffffff', POKRETLA.klucz);
  klucz.position.set(kb[0], kb[2], -kb[1]);
  scena.add(klucz);
  const oswietl = g => g.traverse(n => { if (n.isMesh) Object.assign(n.material, { envMap: envMapa,
    envMapIntensity: envJ.skala * POKRETLA.otoczenie * (POKRETLA['env_' + n.name] ?? 1) }); });
  oswietl(telefon);
  /* model w px skali 1 (K0 px/mm), kamera otworkowa na osi w odległości F — jak FIZ.rzutTel */
  telefon.scale.setScalar(TEL.K0);
  telefon.rotation.order = 'YXZ';
  scena.add(telefon);
  const kam = new THREE.PerspectiveCamera();
  /* poza jak CSS rotateY(ry) rotateX(rx) rotateZ(rz); w three oś y w górę, więc rx i rz ze znakiem minus */
  const ustawPoze = ([ry, rx, rz]) => { telefon.rotation.set(-rx * ST, ry * ST, -rz * ST); telefon.updateMatrixWorld(true); };
  /* środek bryły w (ox, oy) hosta: przesunięty punkt główny zamiast przesuniętej kamery; F: ogniskowa hosta w px skali 1 */
  const ustawKamere = (U, F = TEL.F) => {
    const blisko = F - 400, k = blisko / F;
    kam.position.set(0, 0, F);
    kam.updateMatrixWorld(true);
    kam.projectionMatrix.makePerspective(-U.ox * k, (U.w - U.ox) * k, U.oy * k, -(U.h - U.oy) * k, blisko, F + 400);
    kam.projectionMatrixInverse.copy(kam.projectionMatrix).invert();
  };
  /* ekran hero: obraz „cover" od góry, zaokrąglone rogi i wyspa wypalone w teksturę; płaszczyzna na szkle + 0,05 mm */
  const E = TEL.ekran, ekranMesh = new THREE.Mesh(new THREE.PlaneGeometry(E.w, E.h), new THREE.MeshBasicMaterial({ transparent: true }));
  ekranMesh.position.set(E.cx, E.cy, E.z + 0.05);
  ekranMesh.visible = false;
  telefon.add(ekranMesh);
  const tekstura = async url => {
    const im = new Image();
    im.src = url;
    await im.decode();
    const W = im.naturalWidth, H = Math.round(W * E.h / E.w), c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = W; c.height = H;
    const k = Math.max(W / im.naturalWidth, H / im.naturalHeight), wy = TEL.wyspa, kx = W / E.w, ky = H / E.h;
    g.beginPath(); g.roundRect(0, 0, W, H, E.r_mm * kx); g.clip();
    g.drawImage(im, (W - im.naturalWidth * k) / 2, 0, im.naturalWidth * k, im.naturalHeight * k);
    g.fillStyle = '#000';
    g.beginPath(); g.roundRect((W - wy.w * kx) / 2, (E.h / 2 - (wy.cy - E.cy) - wy.h / 2) * ky, wy.w * kx, wy.h * ky, wy.h * ky / 2); g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
    return t;
  };
  /* scena pod host: kamera, poza, ekran-tekstura tylko w hoście, który ją ma */
  const przygotuj = (h, U, poza) => {
    ustawKamere(U, h.F);
    ustawPoze(poza);
    ekranMesh.visible = !!h.tex;
    /* mapa null → tekstura to inny program shadera: rozgrzej() skompilował wariant bez mapy, więc bez needsUpdate ekran hero był biały */
    if (h.tex && ekranMesh.material.map !== h.tex) { ekranMesh.material.map = h.tex; ekranMesh.material.needsUpdate = true; }
  };
  ustawKamere({ w: 500, h: 1000, ox: 250, oy: 500 });
  /* próbna klatka (płótno jeszcze poza stroną): uniformy programów i pierwsze wysłanie danych teraz, w bezczynności po load,
     a nie w pierwszej klatce hosta w trakcie przewijania (E8: zadanie ok. 130 ms przy 4× wolniejszym CPU) */
  await rozgrzej(scena, kam, () => {});

  /* talerz „O mnie": własna scena i kamera, model wczytywany dopiero przy rejestracji hosta. Świat w metrach, model w mm
     (skala w macierzy pozy). Kamera bez obrotu w (0, Yc, d); punkt główny (x0, y0) i kwadrat płótna (ox, oy, S) w px sekcji. */
  const scenaT = new THREE.Scene(), kamT = new THREE.PerspectiveCamera();
  scenaT.add(klucz.clone());
  let talerz = null;
  const wczytajTalerz = async () => {
    const mapa = await new THREE.TextureLoader().loadAsync(`assets/3d/talerz_red25_napis.webp${V}`);
    mapa.colorSpace = THREE.SRGBColorSpace;
    mapa.anisotropy = Math.min(4, r.capabilities.getMaxAnisotropy());
    await mapa.image.decode();                                   /* dekodowanie poza wątkiem strony (E10) */
    r.initTexture(mapa);                                         /* dekodowanie i wysyłka teraz, nie w pierwszej klatce toczenia (E8: 150 ms przy 4× CPU) */
    const g = await wczytajModel('talerz_red25', mapa);
    oswietl(g);
    g.matrixAutoUpdate = false;
    scenaT.add(g);
    kamT.position.set(0, 1, 6); kamT.updateMatrixWorld(true);
    /* próbna klatka jak wyżej; płótno bywa w innym hoście: jego obraz wraca jeszcze w tym samym zadaniu, bez mignięcia */
    await rozgrzej(scenaT, kamT, () => { if (aktywny && !stracony) rysuj(aktywny); });
    talerz = g;
    if (aktywny && !stracony) rysuj(aktywny);
  };
  const ustawTalerz = st => {
    const k = st.kam, n = k.d - 1, q = n / k.f;
    kamT.position.set(0, k.Yc, k.d);
    kamT.updateMatrixWorld(true);
    kamT.projectionMatrix.makePerspective((st.ox - k.x0) * q, (st.ox + st.S - k.x0) * q, (k.y0 - st.oy) * q, (k.y0 - st.oy - st.S) * q, n, k.d + 1);
    kamT.projectionMatrixInverse.copy(kamT.projectionMatrix).invert();
    talerz.matrix.fromArray(st.M);
    talerz.matrixWorldNeedsUpdate = true;
  };

  const hosty = {}, api = { diag: { utraty: 0, klatki: 0, host: '' } };
  let aktywny = null, raf = 0, tPop = 0, stracony = false, rozmiar = '';
  const html = document.documentElement;

  /* bufor płótna zmieniany raz: setPixelRatio + setSize zmieniały go dwa razy, a każda zmiana czeka synchronicznie na proces GPU
     (przy zajętym GPU zadanie do 250 ms przy zmianie hosta, E10). Styl jak w setSize. */
  const wymiar = (w, h, pr) => { r.setDrawingBufferSize(w, h, pr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; };
  const prTeraz = () => Math.min(prBaza * (window.visualViewport ? visualViewport.scale : 1), 3);
  /* talerz schowany, płótno już u niego: bufor na rozmiar talerza (h.S) w bezczynności, a nie w klatce wyzwolenia toczenia
     (tam zadanie ok. 40 ms przy 4× CPU, E10). Płótno jest wtedy puste, więc nic nie widać. */
  const wymiarPozniej = h => (window.requestIdleCallback || setTimeout)(() => {
    if (aktywny !== h || h.stan || stracony) return;
    const S = h.S(), pr = prTeraz(), wym = `${S}x${S}@${pr}`;
    if (wym !== rozmiar) { rozmiar = wym; wymiar(S, S, pr); r.clear(); }
  });
  const rysuj = h => {
    if (h.obraz && !h.tex) return;                               /* hero: dopiero z teksturą ekranu (do tego czasu zdjęcie) */
    const pr = prTeraz();
    if (h.talerz) {                                              /* bez stanu (talerz schowany) albo modelu: przezroczyste płótno */
      if (!h.stan || !talerz) { if (h.S && !h.stan) wymiarPozniej(h); return r.clear(); }
      const wym = `${h.stan.S}x${h.stan.S}@${pr}`;
      if (wym !== rozmiar) { rozmiar = wym; wymiar(h.stan.S, h.stan.S, pr); }
      cv.style.transform = `translate(${h.stan.ox}px,${h.stan.oy}px)`;
      ustawTalerz(h.stan);
      r.render(scenaT, kamT);
      if (h.kl) h.kl.hidden = true;                              /* płótno wróciło: klisza zbędna */
      api.diag.klatki++;
      if (!html.classList.contains('gl-on')) html.classList.add('gl-on');
      return h.poRysunku && h.poRysunku();
    }
    const { U, s } = h.uklad();
    const wym = `${U.w * s}x${U.h * s}@${pr}`;
    if (wym !== rozmiar) { rozmiar = wym; wymiar(U.w * s, U.h * s, pr); }
    przygotuj(h, U, h.sp.x);
    r.render(scena, kam);
    api.diag.klatki++;
    if (!html.classList.contains('gl-on')) html.classList.add('gl-on');
    h.poRysunku && h.poRysunku();
  };
  const klatka = now => {
    raf = 0;
    const dt = tPop ? (now - tPop) / 1000 : 1 / 60;
    let dalej = false;
    for (const h of Object.values(hosty)) {
      const ruch = FIZ.sprezyna(h.sp, h.cel, dt);
      if (ruch || h.brud) {
        h.brud = false;
        h.poKlatce && h.poKlatce({ ry: h.sp.x[0], rx: h.sp.x[1], rz: h.sp.x[2] });
        if (h === aktywny && udzial.get(h.el) > 0) rysuj(h);
      }
      dalej = dalej || ruch;
    }
    tPop = dalej ? now : 0;
    if (dalej) raf = requestAnimationFrame(klatka);
  };
  const brudny = h => { if (h) h.brud = true; if (!raf && !stracony && !document.hidden) raf = requestAnimationFrame(klatka); };

  /* aktywny host = największy udział widoczności; płótno idzie do niego, pod nakładkę ekranu. Wyjątek: host w trakcie
     animacji (trzyma(), talerz „O mnie" w locie) zatrzymuje płótno, dopóki go widać — mały telefon wideo ma udział ~1,
     zanim jeszcze się pokaże, i uciąłby przewrotkę. Po końcu animacji wybór od nowa (talerz() niżej). */
  const udzial = new Map();
  /* talerz oddaje płótno (telefonowi wideo), a leżący talerz jest jeszcze na ekranie: jego klatka zostaje w tym samym miejscu
     jako 2D kopia (klisza). Render i drawImage w jednym zadaniu — bufor WebGL jest jeszcze ważny, bez preserveDrawingBuffer.
     Zdjęcie zapasowe to inny widok: bez kliszy talerz zmieniał kształt albo znikał (E10). Ważna, dopóki strona podaje ten sam
     stan (talerz() niżej); nowy stan to nowa klisza, powrót płótna ją chowa. Kamera po wartościach: strona liczy ją od
     nowa przy każdym resize (pasek przeglądarki na telefonie). */
  const tenSam = (a, b) => !!(a && b) && ['f', 'd', 'Yc', 'x0', 'y0'].every(q => a.kam[q] === b.kam[q]) && a.ox === b.ox && a.oy === b.oy && a.S === b.S && a.M.every((v, i) => v === b.M[i]);
  const klisza = h => {
    if (!h.stan || !talerz || stracony) return;
    rysuj(h);
    const k = h.kl || (h.kl = document.createElement('canvas'));
    if (!k.parentNode) { k.className = 'gl3d-klisza'; k.setAttribute('aria-hidden', 'true'); }
    k.width = cv.width; k.height = cv.height;
    k.style.cssText = `position:absolute;left:0;top:0;z-index:4;pointer-events:none;width:${cv.style.width};height:${cv.style.height};transform:${cv.style.transform}`;
    k.getContext('2d').drawImage(cv, 0, 0);
    h.el.insertBefore(k, cv.parentNode === h.el ? cv : null);
    k.hidden = false; h.klSt = h.stan;
  };
  const wybierz = () => {
    let naj = null, max = 0;
    for (const h of Object.values(hosty)) { const u = udzial.get(h.el) || 0; if (u > max) { max = u; naj = h; } }
    if (aktywny && aktywny.trzyma && aktywny.trzyma() && udzial.get(aktywny.el) > 0) naj = aktywny;
    /* po przeniesieniu rysujemy od razu: inaczej przez klatkę nowy host pokazałby obraz poprzedniego */
    if (naj && naj !== aktywny) {
      const stary = aktywny;
      if (stary && stary.talerz) klisza(stary);
      aktywny = naj;                                             /* przed odejscie: ono woła talerz(), a ten wybierz() */
      stary && stary.odejscie && stary.odejscie();               /* talerz: strona wraca do rysowania zapasowego */
      cv.style.transform = ''; naj.el.insertBefore(cv, naj.ekran || null); api.diag.host = naj.nazwa;
      if (!stracony) rysuj(naj);
    }
    return naj;
  };
  const io = new IntersectionObserver(wpisy => {
    wpisy.forEach(w => udzial.set(w.target, w.isIntersecting ? w.intersectionRatio : 0));
    const naj = wybierz();
    if (naj) brudny(naj);                                        /* poza ekranem nie rysujemy, więc po powrocie jedna klatka */
  }, { threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1] });
  const ro = new ResizeObserver(w => w.forEach(e => { const h = Object.values(hosty).find(h => h.el === e.target); h && brudny(h); }));
  window.visualViewport && visualViewport.addEventListener('resize', () => aktywny && brudny(aktywny));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; tPop = 0; } else if (aktywny) brudny(aktywny);
  });

  /* utrata kontekstu: wracają zdjęcia, bez ponownej próby w tej sesji */
  let znacznik = null;
  const pokazDiag = () => { if (znacznik) znacznik.textContent = `3D ${api.diag.host || '-'} | utraty ${api.diag.utraty}${stracony ? ' (zdjecia)' : ''}`; };
  cv.addEventListener('webglcontextlost', () => {
    stracony = true; api.diag.utraty++;
    cancelAnimationFrame(raf); raf = 0;
    html.classList.remove('gl-on');
    Object.values(hosty).forEach(h => { if (h.kl) h.kl.hidden = true; h.utrata && h.utrata(); });
    pokazDiag();
  });
  if (diag) {
    znacznik = document.createElement('div');
    znacznik.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99999;font:11px/1.3 monospace;color:#99E66D;background:#000c;padding:3px 6px;border-radius:4px;pointer-events:none';
    document.body.appendChild(znacznik);
    setInterval(pokazDiag, 1000);
  }

  Object.assign(api, {
    get stracony() { return stracony; },
    /* opcje: el (host), ekran (nakładka; płótno idzie przed nią, bez niej na koniec hosta), uklad() → {U, s}, kat,
       F (ogniskowa, domyślnie TEL.F), obraz (url ekranu-tekstury), poKlatce(kat), poRysunku(), utrata(), odejscie() (płótno
       przeszło do innego hosta), talerz (host talerza „O mnie": bez kąta i układu, stan przez talerz()), trzyma() (true =
       animacja w toku, płótno zostaje), S() (bok płótna talerza w px, gdy jeszcze bez stanu) */
    host(nazwa, o) {
      const kt = o.kat || { ry: 0, rx: 0 }, k = [kt.ry, kt.rx, kt.rz || 0], h = { nazwa, ...o, sp: { x: k.slice(), v: [0, 0, 0] }, cel: k.slice(), brud: true };
      hosty[nazwa] = h;
      if (o.talerz && !talerz) wczytajTalerz().then(() => brudny(h), e => console.warn('3D: talerz', e));
      if (o.obraz) tekstura(o.obraz).then(t => { if (hosty[nazwa] !== h) return t.dispose(); h.tex = t; brudny(h); }, e => console.warn('3D: ekran hero', e));
      io.observe(o.el); ro.observe(o.el);
    },
    /* host znika (hero po przejściu w układ telefonu): płótno wychodzi z niego, jeśli tam było */
    usun(nazwa) {
      const h = hosty[nazwa];
      if (!h) return;
      delete hosty[nazwa];
      io.unobserve(h.el); ro.unobserve(h.el); udzial.delete(h.el);
      if (h.tex) h.tex.dispose();
      if (aktywny === h) { aktywny = null; cv.remove(); api.diag.host = ''; }
    },
    cel(nazwa, kat) { const h = hosty[nazwa]; h.cel = [kat.ry, kat.rx, kat.rz || 0]; brudny(h); },
    poza(nazwa, kat) { const h = hosty[nazwa]; h.cel = [kat.ry, kat.rx, kat.rz || 0]; h.sp = { x: h.cel.slice(), v: [0, 0, 0] }; brudny(h); },
    stan: nazwa => { const h = hosty[nazwa]; return h && { x: h.sp.x.slice(), cel: h.cel.slice(), aktywny: h === aktywny, gotowy: h.talerz ? !!talerz : !h.obraz || !!h.tex }; },
    /* talerz „O mnie": stan {M, kam, ox, oy, S} z FOC_FIZ.rzutOmnie albo null (schowany). true = narysowany w 3D albo
       kliszą (płótno u innego hosta, stan bez zmian), false = strona rysuje zapasowo (model jeszcze się wczytuje, host
       nieaktywny, utrata kontekstu) */
    talerz(nazwa, st) {
      const h = hosty[nazwa];
      if (!h) return false;
      h.stan = st;
      if (h === aktywny && !(h.trzyma && h.trzyma())) wybierz();   /* koniec animacji: płótno może przejść dalej (odejscie woła nas znowu) */
      if (h !== aktywny || !talerz || stracony) {
        if (!h.kl || h.kl.hidden || stracony || !st) return !!h.kl && !(h.kl.hidden = stracony || !tenSam(st, h.klSt));
        /* klisza widoczna, stan inny (pasek przeglądarki zmienił kamerę): nowa klisza i obraz hosta z powrotem, jedno zadanie */
        if (!tenSam(st, h.klSt)) { klisza(h); cv.style.transform = ''; if (aktywny) rysuj(aktywny); }
        return true;
      }
      rysuj(h);
      return true;
    },
    /* zdjęcie zapasowe talerza (render_podglady.mjs omnie): stan jak wyżej, kwadrat S × pr */
    zdjecieTalerz(st, pr) {
      r.setPixelRatio(pr); r.setSize(st.S, st.S, false); rozmiar = '';
      ustawTalerz(st);
      r.render(scenaT, kamT);
      const url = cv.toDataURL('image/png');
      if (aktywny) brudny(aktywny);
      return url;
    },
    /* TYLKO TESTY: punkty [mm] w bieżącej pozie rzutowane kamerą three.js → px hosta */
    rzut(nazwa, pkt) {
      const h = hosty[nazwa], { U, s } = h.uklad(), v = new THREE.Vector3();
      przygotuj(h, U, h.sp.x);
      return pkt.map(p => { v.fromArray(p).applyMatrix4(telefon.matrixWorld).project(kam); return [(v.x + 1) / 2 * U.w * s, (1 - v.y) / 2 * U.h * s]; });
    },
    /* zdjęcie zapasowe: poza kat na przezroczystym tle, host w skali 1 × pr (render_podglady.mjs dl) */
    zdjecie(nazwa, kat, pr) {
      const h = hosty[nazwa], { U } = h.uklad();
      r.setPixelRatio(pr); r.setSize(U.w, U.h, false); rozmiar = '';
      przygotuj(h, U, [kat.ry, kat.rx, kat.rz || 0]);
      r.render(scena, kam);
      const url = cv.toDataURL('image/png');
      if (aktywny) brudny(aktywny);
      return url;
    },
  });
  return api;
}
