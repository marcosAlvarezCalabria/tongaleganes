/* Ventana emergente de reserva con selector de zona 3D.
   Uso en tu web:
     <script src="tattoo-reserva.js" defer></script>
     <button data-tattoo-reserva data-whatsapp="34600000000" data-estudio="Tu estudio">Reservar</button>
   Opcional: data-src="/otra-ruta/index.html" si subes la carpeta reserva/ a otra ruta. */
(() => {
  if (window.TattooReserva) return;
  window.TattooReserva = {};
  const SRC = '/reserva/index.html';
  let overlay, frame, lastFocus;
  function open(btn) {
    lastFocus = btn;
    const base = btn.dataset.src || SRC;
    const src = base + (base.includes('?') ? '&' : '?') + new URLSearchParams({ wa: btn.dataset.whatsapp || '', estudio: btn.dataset.estudio || '' });
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Reserva de tatuaje');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:2vmin;background:rgba(29,31,32,.7);opacity:0;transition:opacity .2s';
      frame = document.createElement('iframe');
      frame.title = 'Selector de zona del tatuaje';
      frame.allow = 'fullscreen';
      frame.style.cssText = 'width:min(1280px,100%);height:min(860px,100%);border:0;border-radius:0;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.35)';
      overlay.appendChild(frame);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      document.body.appendChild(overlay);
    }
    if (frame.getAttribute('src') !== src) frame.src = src;
    overlay.style.display = 'grid';
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; frame.focus(); });
  }
  function close() {
    if (!overlay) return;
    overlay.style.opacity = '0';
    document.documentElement.style.overflow = '';
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
    lastFocus && lastFocus.focus();
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tattoo-reserva]');
    if (btn) { e.preventDefault(); open(btn); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay && overlay.style.display !== 'none') close(); });
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !frame || e.source !== frame.contentWindow) return;
    const t = e.data && e.data.type;
    if (t === 'tattoo-reserva:zonas') window.dispatchEvent(new CustomEvent('tattoo-reserva:zonas', { detail: e.data }));
    if (t === 'tattoo-reserva:cerrar' || t === 'tattoo-reserva:enviada' || t === 'tattoo-reserva:zonas') close();
  });
  Object.assign(window.TattooReserva, { open: (opts = {}) => { const b = document.createElement('button'); Object.assign(b.dataset, opts); open(b); }, close });
})();
