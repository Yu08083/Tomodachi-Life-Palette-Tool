(function () {
  let loupeEnabled = false;

  function _loadPref() {
    try {
      const v = localStorage.getItem('spoito_loupe');
      loupeEnabled = (v === '1');
    } catch (_) { loupeEnabled = false; }
  }
  function _savePref() {
    try { localStorage.setItem('spoito_loupe', loupeEnabled ? '1' : '0'); } catch (_) {}
  }

  function _updateToggleUI() {
    const cb = document.getElementById('loupe-toggle');
    if (!cb) return;
    cb.checked = loupeEnabled;
  }

  function _initToggle() {
    _loadPref();
    const cb = document.getElementById('loupe-toggle');
    if (!cb) return;
    _updateToggleUI();
    cb.addEventListener('change', () => {
      loupeEnabled = cb.checked;
      _savePref();
      if (!loupeEnabled) _hideLoupe();
    });
  }

  function _showLoupe(clientX, clientY) {
    if (!loupeEnabled) return;
    const loupe = document.getElementById('loupe');
    const lc = document.getElementById('loupe-canvas');
    const src = document.getElementById('pixel-canvas');
    if (!loupe || !lc || !src) return;

    const rect = src.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right ||
        clientY < rect.top || clientY > rect.bottom) {
      _hideLoupe();
      return;
    }

    const w = src.width, h = src.height;
    const localX = ((clientX - rect.left) / rect.width) * w;
    const localY = ((clientY - rect.top) / rect.height) * h;

    const LOUPE_PX = 160;
    const ZOOM_PX = 24;
    const ctx = lc.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, LOUPE_PX, LOUPE_PX);
    const sx = Math.max(0, Math.min(w - ZOOM_PX, localX - ZOOM_PX / 2));
    const sy = Math.max(0, Math.min(h - ZOOM_PX, localY - ZOOM_PX / 2));
    try {
      ctx.drawImage(src, sx, sy, ZOOM_PX, ZOOM_PX, 0, 0, LOUPE_PX, LOUPE_PX);
    } catch (_) { return; }

    loupe.classList.remove('hidden');

    const offsetY = 90;
    let top = clientY - offsetY;
    let left = clientX;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const half = LOUPE_PX / 2;

    if (top - LOUPE_PX < 8) {
      top = clientY + offsetY + LOUPE_PX;
    }
    if (top < LOUPE_PX + 8) top = LOUPE_PX + 8;
    if (top > vh - 8) top = vh - 8;
    if (left < half + 8) left = half + 8;
    if (left > vw - half - 8) left = vw - half - 8;

    loupe.style.left = left + 'px';
    loupe.style.top  = top  + 'px';
  }

  function _hideLoupe() {
    const loupe = document.getElementById('loupe');
    if (loupe) loupe.classList.add('hidden');
  }

  function _attachCanvasHandlers() {
    const src = document.getElementById('pixel-canvas');
    if (!src) return;
    src.addEventListener('pointerdown', (e) => {
      _showLoupe(e.clientX, e.clientY);
    }, { passive: true });
    src.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') {
        if (e.buttons === 0 && !(e.pressure > 0)) return;
      }
      _showLoupe(e.clientX, e.clientY);
    }, { passive: true });
    src.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') _showLoupe(e.clientX, e.clientY);
    });
    const end = () => _hideLoupe();
    src.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') _hideLoupe();
    });
    src.addEventListener('pointercancel', end);
    src.addEventListener('pointerleave', end);
  }

  function _init() {
    _initToggle();
    _attachCanvasHandlers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
