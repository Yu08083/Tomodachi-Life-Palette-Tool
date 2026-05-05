

function switchTab(mode) {
  currentMode = mode;
  document.getElementById('tab-palette').classList.toggle('active', mode === 'palette');
  document.getElementById('tab-fullcolor').classList.toggle('active', mode === 'fullcolor');
  document.getElementById('mode-palette').classList.toggle('hidden', mode !== 'palette');
  document.getElementById('mode-fullcolor').classList.toggle('hidden', mode !== 'fullcolor');

  if (mode === 'fullcolor' && lastSelPx >= 0) {
    const src = getActiveData();
    if (src) {
      const idx = (lastSelPy * src.width + lastSelPx) * 4;
      const r = src.data[idx];
      const g = src.data[idx + 1];
      const b = src.data[idx + 2];
      const hsv = rgbToHsv(r, g, b);
      updateFullColorGuide(hsv, r, g, b);
    }
  }
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('hidden');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('hidden');
}

function attachModalHandlers() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(m => {
        m.classList.add('hidden');
      });
    }
  });
}

function attachResizeHandler() {
  let timer = null;
  window.addEventListener('resize', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (lastSelPx >= 0) {
        const src = getActiveData();
        if (!src) return;
        const idx = (lastSelPy * src.width + lastSelPx) * 4;
        const r = src.data[idx];
        const g = src.data[idx + 1];
        const b = src.data[idx + 2];
        const hsv = rgbToHsv(r, g, b);
        if (currentMode === 'fullcolor') {
          updateFullColorGuide(hsv, r, g, b);
        }
      }
    }, 150);
  });
}
