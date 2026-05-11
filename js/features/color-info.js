
function selectColor(r, g, b, px, py) {
  const hex = rgbToHex(r, g, b);
  const hsv = rgbToHsv(r, g, b);

  document.getElementById('selected-swatch').style.background = hex;
  document.getElementById('hex-val').textContent = hex;
  document.getElementById('rgb-val').textContent = `${r}, ${g}, ${b}`;
  document.getElementById('hsv-val').textContent = `${hsv.h}°, ${hsv.s}%, ${hsv.v}%`;

  const posEl = document.getElementById('pixel-pos');
  if (px >= 0 && py >= 0) {
    const label = (viewMode === 'converted') ? t('color.convertedPrefix') : '';
    posEl.textContent = `${label}X:${px + 1} Y:${py + 1}`;
  } else {
    posEl.textContent = t('color.hexInputPos');
  }

  updateCanvasSelectionPill(px, py, hex);

  let bestDist = Infinity, bestIdx = 0;
  PALETTE.forEach((p, i) => {
    const c = hexToRgb(p.h);
    const d = colorDist(r, g, b, c.r, c.g, c.b);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  });
  closestIdx = bestIdx;
  updatePaletteHighlight(bestIdx, bestDist);

  updateFullColorGuide(hsv, r, g, b);

  if (px >= 0) {
    lastSelPx = px;
    lastSelPy = py;
    drawSelectionOverlay(px, py);
  } else {

    lastSelPx = -1;
    lastSelPy = -1;
    if (typeof clearOverlayWithGrid === 'function') {
      clearOverlayWithGrid();
    } else if (overlayCanvas) {
      const ctx = overlayCanvas.getContext('2d');
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
  }

  noSelectMsg.classList.add('hidden');
  colorInfo.classList.remove('hidden');

  if (typeof refreshIsolateOnSelection === 'function') {
    refreshIsolateOnSelection();
  }
  if (typeof refreshDoneOnSelection === 'function') {
    refreshDoneOnSelection();
  }
}

function _pickTextColorForBg(r, g, b) {
  const toLin = v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  const cWhite = 1.05 / (L + 0.05);
  const cBlack = (L + 0.05) / 0.05;
  return cWhite >= cBlack;
}

function buildPaletteGrid() {
  const grid = document.getElementById('palette-grid');
  if (!grid) return;
  grid.innerHTML = '';
  PALETTE.forEach((p, i) => {
    const cell = document.createElement('div');
    cell.className = 'palette-cell';
    cell.style.background = p.h;
    cell.title = `${p.h}\n${t('color.rowCol', { row: p.row + 1, col: p.col + 1 })}`;
    cell.dataset.idx = i;

    const num = document.createElement('span');
    num.className = 'palette-cell-num';
    num.textContent = (p.row * 12 + p.col + 1);
    const r = parseInt(p.h.slice(1, 3), 16);
    const g = parseInt(p.h.slice(3, 5), 16);
    const b = parseInt(p.h.slice(5, 7), 16);
    const useWhite = _pickTextColorForBg(r, g, b);
    num.style.color = useWhite ? '#FFFFFF' : '#000000';
    num.style.textShadow = useWhite
      ? '0 1px 2px rgba(0,0,0,0.6), 0 0 1px rgba(0,0,0,0.5)'
      : '0 1px 2px rgba(255,255,255,0.6), 0 0 1px rgba(255,255,255,0.5)';
    cell.appendChild(num);

    grid.appendChild(cell);
  });

  attachPaletteHover();
}

function attachPaletteNumberToggle() {
  const toggle = document.getElementById('palette-show-numbers');
  const grid = document.getElementById('palette-grid');
  if (!toggle || !grid) return;
  const KEY = 'spoito_palette_show_numbers';
  const saved = localStorage.getItem(KEY) === '1';
  toggle.checked = saved;
  grid.classList.toggle('show-numbers', saved);
  toggle.addEventListener('change', () => {
    grid.classList.toggle('show-numbers', toggle.checked);
    localStorage.setItem(KEY, toggle.checked ? '1' : '0');
  });
}

function attachPaletteUsedOnlyToggle() {
  const toggle = document.getElementById('palette-used-only');
  const grid = document.getElementById('palette-grid');
  if (!toggle || !grid) return;
  let saved = false;
  try { saved = localStorage.getItem(PALETTE_USED_ONLY_KEY) === '1'; } catch (_) {}
  toggle.checked = saved;
  paletteUsedOnly = saved;
  grid.classList.toggle('used-only', saved);
  applyPaletteUsedFilter();
  toggle.addEventListener('change', () => {
    paletteUsedOnly = toggle.checked;
    grid.classList.toggle('used-only', toggle.checked);
    try { localStorage.setItem(PALETTE_USED_ONLY_KEY, toggle.checked ? '1' : '0'); } catch (_) {}
    applyPaletteUsedFilter();
  });
}

function applyPaletteUsedFilter() {
  const grid = document.getElementById('palette-grid');
  if (!grid) return;
  if (!paletteUsedOnly) {
    grid.querySelectorAll('.palette-cell').forEach(c => c.classList.remove('unused'));
    return;
  }
  const used = new Set();
  if (typeof convertedData !== 'undefined' && convertedData && convertedData.usedSet) {
    convertedData.usedSet.forEach(i => used.add(i));
  } else if (typeof convertedData !== 'undefined' && convertedData && convertedData.indices) {
    convertedData.indices.forEach(i => { if (i >= 0) used.add(i); });
  }
  const checks = (typeof doneState !== 'undefined') ? doneState : null;
  grid.querySelectorAll('.palette-cell').forEach(c => {
    const idx = parseInt(c.dataset.idx, 10);
    const isUsed = used.has(idx);
    const isDone = checks ? checks.isDone(idx) : false;
    c.classList.toggle('unused', !isUsed || isDone);
  });
}

function updatePaletteHighlight(bestIdx, bestDist) {
  document.querySelectorAll('.palette-cell').forEach((cell, i) => {
    cell.classList.toggle('closest', i === bestIdx);
  });
  const best = PALETTE[bestIdx];
  document.getElementById('closest-swatch').style.background = best.h;
  document.getElementById('closest-hex').textContent = best.h.toUpperCase();
  document.getElementById('closest-pos').textContent = t('color.rowCol', { row: best.row + 1, col: best.col + 1 });
  document.getElementById('closest-dist').textContent = Math.round(bestDist) + t('color.distHint');

  lastClosestIdx = bestIdx;
  lastClosestDist = bestDist;
}

let lastClosestIdx = null;
let lastClosestDist = null;

function refreshColorInfoLabels() {

  document.querySelectorAll('.palette-cell').forEach((cell, i) => {
    const p = PALETTE[i];
    if (p) cell.title = `${p.h}\n${t('color.rowCol', { row: p.row + 1, col: p.col + 1 })}`;
  });

  if (lastClosestIdx != null) {
    const best = PALETTE[lastClosestIdx];
    document.getElementById('closest-pos').textContent = t('color.rowCol', { row: best.row + 1, col: best.col + 1 });
    document.getElementById('closest-dist').textContent = Math.round(lastClosestDist) + t('color.distHint');
  }

  const posEl = document.getElementById('pixel-pos');
  if (posEl && posEl.textContent && posEl.textContent !== '-') {

    if (typeof viewMode !== 'undefined' && viewMode === 'converted'
        && typeof lastSelPx !== 'undefined' && lastSelPx >= 0) {
      posEl.textContent = `${t('color.convertedPrefix')}X:${lastSelPx + 1} Y:${lastSelPy + 1}`;
    }
  }
}

function updateCanvasSelectionPill(px, py, hex) {
  const pill   = document.getElementById('canvas-selection-pill');
  if (!pill) return;
  if (px < 0 || py < 0) { pill.classList.add('hidden'); return; }

  let gridW, gridH;
  if (viewMode === 'converted' && convertedData) {
    gridW = convertedData.width; gridH = convertedData.height;
  } else if (imgData) {
    if (imgData.width >= imgData.height) {
      gridW = gridSize; gridH = Math.max(1, Math.round(gridSize * imgData.height / imgData.width));
    } else {
      gridH = gridSize; gridW = Math.max(1, Math.round(gridSize * imgData.width / imgData.height));
    }
  } else { gridW = gridH = 1; }

  let col, row;
  if (viewMode === 'converted') { col = px + 1; row = py + 1; }
  else {
    col = Math.max(1, Math.min(gridW, Math.floor(px / (imgData.width  / gridW)) + 1));
    row = Math.max(1, Math.min(gridH, Math.floor(py / (imgData.height / gridH)) + 1));
  }

  const seq = (row - 1) * gridW + col;
  const total = gridW * gridH;

  document.getElementById('csp-swatch').style.background = hex;
  document.getElementById('csp-pos').textContent =
    t('color.rowCol', { row, col });
  document.getElementById('csp-seq').textContent = `#${seq}/${total}`;
  pill.classList.remove('hidden');
}
