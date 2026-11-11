// FitOnlineCoach, Cloudflare Pages (tryb _worker.js): filmy mp4 z odpowiedzia 206 na Range.
// Pages sam zwraca 200 z calym plikiem (test 11.11.2026), a Safari na iPhonie wtedy nie odtwarza filmu.
// Wywolywany tylko dla adresow z _routes.json (12 plikow .mp4 po nazwie, bo gwiazdka w srodku wzorca jest nieudokumentowana);
// reszta strony idzie statycznie z regulami _headers (ktore NIE obejmuja odpowiedzi stad, wiec naglowki ustawiamy w kodzie).
// Nowy film = dopisz jego sciezke do _routes.json (test_worker.mjs i spr_pages.js sekcja 6 to wykryja).
// Na GitHub Pages to zwykly plik, nic nie robi.
export default {
  async fetch(request, env) {
    // passThroughOnException nie dziala w trybie _worker.js: przy bledzie oddajemy plik tak, jak Pages (200, caly)
    try { return await filmy(request, env); } catch { return env.ASSETS.fetch(request); }
  },
};

async function filmy(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.endsWith('.mp4') || !['GET', 'HEAD'].includes(request.method)) return env.ASSETS.fetch(request);
  // zawsze caly plik (bez Range i warunkow); filmy maja ponizej 0,5 MB, wiec trzymanie w pamieci jest tanie
  const res = await env.ASSETS.fetch(new Request(url, { method: 'GET' }));
  if (res.status !== 200) return res;
  const body = new Uint8Array(await res.arrayBuffer()), size = body.length;
  const h = new Headers(res.headers);
  h.delete('Content-Encoding');
  h.set('Accept-Ranges', 'bytes');
  h.set('Cache-Control', 'public, max-age=3600');
  h.set('X-Content-Type-Options', 'nosniff');
  if (url.hostname.endsWith('.pages.dev')) h.set('X-Robots-Tag', 'noindex');
  // RFC 9110 §13.2.2: If-None-Match przed Range; przegladarka z aktualnym filmem dostaje 304 jak dotad z Pages
  const inm = request.headers.get('If-None-Match'), et = (h.get('ETag') || '').replace(/^W\//, '');
  if (inm && et && (inm.trim() === '*' || inm.split(',').some(t => t.trim().replace(/^W\//, '') === et))) {
    h.delete('Content-Length');
    return new Response(null, { status: 304, headers: h });
  }

  const r = zakres(request, h, size);
  if (r === null) {
    h.set('Content-Length', String(size));
    return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers: h });
  }
  if (r === 416) {
    h.set('Content-Range', `bytes */${size}`);
    h.set('Content-Length', '0');
    return new Response(null, { status: 416, headers: h });
  }
  const [a, b] = r;
  h.set('Content-Range', `bytes ${a}-${b}/${size}`);
  h.set('Content-Length', String(b - a + 1));
  return new Response(request.method === 'HEAD' ? null : body.subarray(a, b + 1), { status: 206, headers: h });
}

// RFC 9110 §14: null = caly plik (brak Range, inna jednostka, kilka zakresow, zly zapis, If-Range nie pasuje),
// 416 = zakres poza plikiem, [a, b] = bajty od a do b wlacznie.
function zakres(request, h, size) {
  const range = request.headers.get('Range');
  if (!range) return null;
  const ifRange = request.headers.get('If-Range');
  if (ifRange && ifRange !== h.get('ETag') && ifRange !== h.get('Last-Modified')) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (n === 0 || size === 0) return 416;
    return [Math.max(0, size - n), size - 1];
  }
  const a = Number(m[1]);
  if (m[2] !== '' && Number(m[2]) < a) return null;
  if (a >= size) return 416;
  return [a, m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)];
}
