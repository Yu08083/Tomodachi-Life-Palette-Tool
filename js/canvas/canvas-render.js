

function setupCanvases() {
  renderPixelCanvas();
}

function renderPixelCanvas() {
  const src = getActiveData();
  if (!src) return;

  const w = src.width, h = src.height;
  pixelCanvas.width    = w * zoom;
  pixelCanvas.height   = h * zoom;
  overlayCanvas.width  = w * zoom;
  overlayCanvas.height = h * zoom;

  const ctx = pixelCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = (zoom < 1);
  ctx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);

  ctx.drawImage(src.originalCanvas, 0, 0, w * zoom, h * zoom);

  drawColorMaskOverlay(ctx);

  if (rulerEnabled) drawRulerCrosshair(ctx, w, h);

  zoomLabel.textContent = (zoom < 1) ? Math.round(zoom * 100) + '%' : zoom + '×';

  rebuildRuler();

  if (hoverPaletteIdx >= 0) {
    drawHighlight(hoverPaletteIdx);
  } else if (lastSelPx >= 0) {
    drawSelectionOverlay(lastSelPx, lastSelPy);
  } else {
    clearOverlayWithGrid();
  }

  if (mirrorMode !== 'off') {
    const ctx2 = overlayCanvas.getContext('2d');
    drawMirrorAxes(ctx2);
    if (lastSelPx >= 0) drawMirrorHighlight(lastSelPx, lastSelPy);
  }
}

function clearOverlayWithGrid() {
  if (!overlayCanvas) return;
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (gridEnabled) drawGridOverlay(ctx);
}

function drawGridOverlay(ctx) {
  const src = getActiveData();
  if (!src) return;
  const W = src.width * zoom;
  const H = src.height * zoom;
  const sub = (typeof gridSubdivision === 'number' && (gridSubdivision === 8 || gridSubdivision === 16)) ? gridSubdivision : 8;

  let gridW, gridH;
  if (viewMode === 'original' && imgData && typeof gridSize === 'number') {
    const aspect = imgData.width / imgData.height;
    if (aspect >= 1) {
      gridW = gridSize;
      gridH = Math.max(1, Math.round(gridSize / aspect));
    } else {
      gridH = gridSize;
      gridW = Math.max(1, Math.round(gridSize * aspect));
    }
  } else {
    gridW = src.width;
    gridH = src.height;
  }

  const cellW = W / gridW;
  const cellH = H / gridH;

  ctx.save();

  if (cellW >= 4 && cellH >= 4) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 1; x < gridW; x++) {
      const px = Math.round(x * cellW) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
    }
    for (let y = 1; y < gridH; y++) {
      const py = Math.round(y * cellH) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
    }
    ctx.stroke();
  }

  const cxIdx = gridW / 2;
  const cyIdx = gridH / 2;
  const baseLine = Math.max(cellW, cellH);
  ctx.strokeStyle = 'rgba(232, 90, 12, 0.55)';
  ctx.lineWidth = Math.max(1, baseLine * 0.18);
  ctx.beginPath();
  const offX = (typeof gridOffsetX === 'number') ? gridOffsetX : 0;
  const offY = (typeof gridOffsetY === 'number') ? gridOffsetY : 0;
  const startX = ((offX % sub) + sub) % sub;
  const startY = ((offY % sub) + sub) % sub;
  for (let x = startX; x < gridW; x += sub) {
    if (Math.abs(x - cxIdx) < 0.001) continue;
    const px = x * cellW + 0.5;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
  }
  for (let y = startY; y < gridH; y += sub) {
    if (Math.abs(y - cyIdx) < 0.001) continue;
    const py = y * cellH + 0.5;
    ctx.moveTo(0, py);
    ctx.lineTo(W, py);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(214, 64, 4, 0.92)';
  ctx.lineWidth = Math.max(2, baseLine * 0.32);
  ctx.beginPath();
  const cxPx = Math.round(cxIdx * cellW) + 0.5;
  const cyPx = Math.round(cyIdx * cellH) + 0.5;
  if (gridW >= 2) {
    ctx.moveTo(cxPx, 0);
    ctx.lineTo(cxPx, H);
  }
  if (gridH >= 2) {
    ctx.moveTo(0, cyPx);
    ctx.lineTo(W, cyPx);
  }
  ctx.stroke();

  ctx.restore();
}

function drawRulerCrosshair(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.strokeStyle = 'rgba(232, 90, 12, 0.55)';
  ctx.lineWidth = Math.max(1, zoom <= 2 ? 1 : 1.5);
  ctx.setLineDash([Math.max(3, zoom), Math.max(2, zoom * 0.5)]);

  ctx.beginPath();
  ctx.moveTo(cx * zoom, 0);
  ctx.lineTo(cx * zoom, h * zoom);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, cy * zoom);
  ctx.lineTo(w * zoom, cy * zoom);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();
}

const _RULER_NICE_STEPS = [1, 2, 4, 8, 16, 32, 64, 128, 256];
const _RULER_MIN_TICK_PX = 26;

function rebuildRuler() {
  const stage = document.getElementById('canvas-stage');
  const top   = document.getElementById('ruler-top');
  const left  = document.getElementById('ruler-left');
  if (!stage || !top || !left) return;

  if (!rulerEnabled) {
    stage.classList.remove('ruler-on');
    top.innerHTML  = '';
    left.innerHTML = '';
    return;
  }

  const src = getActiveData();
  if (!src) return;
  const w = src.width;
  const h = src.height;

  stage.classList.add('ruler-on');

  let step = 1;
  for (const s of _RULER_NICE_STEPS) {
    step = s;
    if (s * zoom >= _RULER_MIN_TICK_PX) break;
  }

  const cxIdx = Math.floor(w / 2);
  const cyIdx = Math.floor(h / 2);

  top.style.width = (w * zoom) + 'px';
  let topHtml = '';
  for (let x = 0; x < w; x += step) {
    const isCenter = (x === cxIdx);
    const isMajor  = (x !== 0 && x % 8 === 0);
    const cls = ['ruler-tick'];
    if (x === 0)     cls.push('first');
    if (isCenter)    cls.push('center');
    else if (isMajor) cls.push('major');
    const centerPx = x * zoom + zoom / 2;
    topHtml += `<div class="${cls.join(' ')}" style="left:${centerPx}px">${x + 1}</div>`;
  }
  top.innerHTML = topHtml;

  left.style.height = (h * zoom) + 'px';
  let leftHtml = '';
  for (let y = 0; y < h; y += step) {
    const isCenter = (y === cyIdx);
    const isMajor  = (y !== 0 && y % 8 === 0);
    const cls = ['ruler-tick'];
    if (y === 0)     cls.push('first');
    if (isCenter)    cls.push('center');
    else if (isMajor) cls.push('major');
    const centerPx = y * zoom + zoom / 2;
    leftHtml += `<div class="${cls.join(' ')}" style="top:${centerPx}px">${y + 1}</div>`;
  }
  left.innerHTML = leftHtml;
}

function drawSelectionOverlay(px, py) {
  if (hoverPaletteIdx >= 0) return;

  clearOverlayWithGrid();

  const ctx = overlayCanvas.getContext('2d');
  const cellX = px * zoom;
  const cellY = py * zoom;
  const cellW = zoom;
  const cellH = zoom;

  ctx.save();
  ctx.strokeStyle = 'rgba(232, 90, 12, 0.7)';
  ctx.lineWidth = Math.max(1, Math.round(zoom * 0.08));
  ctx.setLineDash([Math.max(4, zoom * 0.3), Math.max(3, zoom * 0.2)]);
  ctx.beginPath();
  ctx.moveTo(0, cellY + cellH / 2);
  ctx.lineTo(overlayCanvas.width, cellY + cellH / 2);
  ctx.moveTo(cellX + cellW / 2, 0);
  ctx.lineTo(cellX + cellW / 2, overlayCanvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.save();
  const ringPad = Math.max(3, Math.round(zoom * 0.25));
  const lwOuter = Math.max(3, Math.round(zoom * 0.18));
  const lwInner = Math.max(2, Math.round(zoom * 0.12));

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = lwOuter + lwInner;
  ctx.strokeRect(
    cellX - ringPad,
    cellY - ringPad,
    cellW + ringPad * 2,
    cellH + ringPad * 2
  );

  ctx.strokeStyle = '#E85A0C';
  ctx.lineWidth = lwInner;
  ctx.strokeRect(
    cellX - ringPad,
    cellY - ringPad,
    cellW + ringPad * 2,
    cellH + ringPad * 2
  );
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cellX + 0.5, cellY + 0.5, cellW - 1, cellH - 1);
  ctx.restore();
}

function toggleRuler() {
  rulerEnabled = !rulerEnabled;
  const btn = document.getElementById('ruler-btn');
  if (btn) btn.classList.toggle('active', rulerEnabled);
  renderPixelCanvas();
}

function toggleGrid() {
  gridEnabled = !gridEnabled;
  const btn = document.getElementById('grid-btn');
  if (btn) btn.classList.toggle('active', gridEnabled);
  const sub = document.getElementById('grid-sub-toggle');
  if (sub) sub.classList.toggle('hidden', !gridEnabled);
  try {
    localStorage.setItem(GRID_STORAGE_KEY, gridEnabled ? '1' : '0');
  } catch (_) {}
  renderPixelCanvas();
}

function setGridSubdivision(n) {
  if (n !== 8 && n !== 16) return;
  gridSubdivision = n;
  document.querySelectorAll('.grid-sub-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.sub, 10) === n);
  });
  try {
    localStorage.setItem(GRID_SUB_STORAGE_KEY, String(n));
  } catch (_) {}
  if (gridEnabled) renderPixelCanvas();
}

function initGrid() {
  let saved = false;
  try {
    saved = localStorage.getItem(GRID_STORAGE_KEY) === '1';
  } catch (_) {}
  gridEnabled = saved;
  const btn = document.getElementById('grid-btn');
  if (btn) btn.classList.toggle('active', gridEnabled);

  let savedSub = 8;
  try {
    const v = parseInt(localStorage.getItem(GRID_SUB_STORAGE_KEY), 10);
    if (v === 8 || v === 16) savedSub = v;
  } catch (_) {}
  gridSubdivision = savedSub;
  document.querySelectorAll('.grid-sub-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.sub, 10) === savedSub);
    b.addEventListener('click', () => setGridSubdivision(parseInt(b.dataset.sub, 10)));
  });
  const sub = document.getElementById('grid-sub-toggle');
  if (sub) sub.classList.toggle('hidden', !gridEnabled);
}

function _getMaskFillStyle() {
  const c = (typeof isolateMaskColor === 'string' && isolateMaskColor) ? isolateMaskColor : '#FFFFFF';
  const a = (typeof isolateMaskOpacity === 'number' && isolateMaskOpacity >= 0 && isolateMaskOpacity <= 1) ? isolateMaskOpacity : 0.85;
  const m = /^#([0-9A-Fa-f]{6})$/.exec(c);
  if (!m) return `rgba(255, 255, 255, ${a})`;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function drawColorMaskOverlay(ctx) {
  const isolateActive = isolateEnabled && isolateTargetIdx >= 0;
  const doneActive = doneState.any();
  if (!isolateActive && !doneActive) return;

  const src = getActiveData();
  if (!src) return;
  const w = src.width, h = src.height;

  let map = null;
  if (viewMode === 'converted' && convertedData) {
    map = convertedData.paletteMap;
  } else if (viewMode === 'original' && imgData) {
    if (typeof _ensureOriginalPaletteMap === 'function') {
      map = _ensureOriginalPaletteMap();
    }
  }
  if (!map) return;

  ctx.save();
  ctx.fillStyle = _getMaskFillStyle();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = map[y * w + x];
      const isolateBlocks = isolateActive && idx !== isolateTargetIdx;
      const doneBlocks    = doneActive && doneState.isDone(idx);
      if (isolateBlocks || doneBlocks) {
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
  }
  ctx.restore();
}

function drawIsolateOverlay(ctx) {
  drawColorMaskOverlay(ctx);
}

function toggleIsolate() {
  if (!isolateEnabled) {
    if (typeof closestIdx === 'undefined' || closestIdx < 0) {
      const btnPanel = document.getElementById('isolate-btn-panel');
      if (btnPanel) {
        btnPanel.classList.add('shake');
        setTimeout(() => btnPanel.classList.remove('shake'), 400);
      }
      return;
    }
    isolateEnabled = true;
    isolateTargetIdx = closestIdx;
  } else {
    isolateEnabled = false;
    isolateTargetIdx = -1;
  }
  try {
    localStorage.setItem(ISOLATE_STORAGE_KEY, isolateEnabled ? '1' : '0');
  } catch (_) {}
  _updateIsolateButtonState();
  renderPixelCanvas();
}

function _updateIsolateButtonState() {
  const longKey  = isolateEnabled ? 'color.isolateOn'      : 'color.isolateOff';
  const shortKey = isolateEnabled ? 'color.isolateOnShort' : 'color.isolateOffShort';
  const longText  = (typeof t === 'function') ? t(longKey)  : '';
  const shortText = (typeof t === 'function') ? t(shortKey) : '';
  document.querySelectorAll('.isolate-btn').forEach(btn => {
    btn.classList.toggle('active', isolateEnabled);
    const useShort = btn.classList.contains('isolate-btn-mobile-only');
    const text = useShort ? shortText : longText;
    const key  = useShort ? shortKey  : longKey;
    if (text) btn.textContent = text;
    btn.setAttribute('data-i18n', key);
    btn.disabled = (typeof closestIdx === 'undefined' || closestIdx < 0) && !isolateEnabled;
  });
}

function refreshIsolateOnSelection() {
  if (isolateEnabled && typeof closestIdx !== 'undefined' && closestIdx >= 0) {
    isolateTargetIdx = closestIdx;
    renderPixelCanvas();
  }
  _updateIsolateButtonState();
}

function attachIsolateSettings() {
  const btn = document.getElementById('isolate-settings-btn');
  const pop = document.getElementById('isolate-settings-popover');
  if (!btn || !pop) return;

  const presets = [
    { color: '#FFFFFF', label: '白' },
    { color: '#000000', label: '黒' },
    { color: '#808080', label: '灰' },
    { color: '#FFE3C6', label: '薄橙' },
    { color: '#D6E4F0', label: '薄青' },
    { color: '#E5D6F0', label: '薄紫' },
  ];
  const sw = document.getElementById('iss-swatches');
  if (sw && sw.children.length === 0) {
    presets.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'iss-swatch';
      b.style.background = p.color;
      b.dataset.color = p.color;
      b.title = p.label;
      b.setAttribute('aria-label', p.label);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        isolateMaskColor = p.color;
        _markActiveSwatch();
        if (typeof renderPixelCanvas === 'function') renderPixelCanvas();
      });
      sw.appendChild(b);
    });
    _markActiveSwatch();
  }

  const op = document.getElementById('iss-opacity');
  const opVal = document.getElementById('iss-opacity-val');
  if (op) {
    const handler = () => {
      const n = parseInt(op.value, 10);
      if (isNaN(n)) return;
      isolateMaskOpacity = Math.max(0, Math.min(1, n / 100));
      if (opVal) opVal.textContent = n + '%';
      if (typeof renderPixelCanvas === 'function') renderPixelCanvas();
    };
    op.addEventListener('input', handler);
    op.addEventListener('change', handler);
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.classList.toggle('hidden');
    if (!pop.classList.contains('hidden')) {
      _markActiveSwatch();
      _positionPopoverNearButton(pop, btn);
      setTimeout(() => {
        document.addEventListener('click', _outsideIsolatePopover);
        document.addEventListener('keydown', _isolatePopoverKey);
        window.addEventListener('resize', _repositionIsolatePopover);
        window.addEventListener('scroll', _repositionIsolatePopover, true);
      }, 0);
    } else {
      document.removeEventListener('click', _outsideIsolatePopover);
      document.removeEventListener('keydown', _isolatePopoverKey);
      window.removeEventListener('resize', _repositionIsolatePopover);
      window.removeEventListener('scroll', _repositionIsolatePopover, true);
    }
  });
}

function _repositionIsolatePopover() {
  const pop = document.getElementById('isolate-settings-popover');
  const btn = document.getElementById('isolate-settings-btn');
  if (!pop || !btn || pop.classList.contains('hidden')) return;
  _positionPopoverNearButton(pop, btn);
}

function _markActiveSwatch() {
  const sw = document.getElementById('iss-swatches');
  if (!sw) return;
  for (let i = 0; i < sw.children.length; i++) {
    const b = sw.children[i];
    b.classList.toggle('active', b.dataset.color === isolateMaskColor);
  }
}

function _outsideIsolatePopover(e) {
  const pop = document.getElementById('isolate-settings-popover');
  const btn = document.getElementById('isolate-settings-btn');
  if (!pop) return;
  if (pop.contains(e.target) || (btn && btn.contains(e.target))) return;
  pop.classList.add('hidden');
  document.removeEventListener('click', _outsideIsolatePopover);
  document.removeEventListener('keydown', _isolatePopoverKey);
}

function _isolatePopoverKey(e) {
  if (e.key === 'Escape') {
    const pop = document.getElementById('isolate-settings-popover');
    if (pop) pop.classList.add('hidden');
    document.removeEventListener('click', _outsideIsolatePopover);
    document.removeEventListener('keydown', _isolatePopoverKey);
    window.removeEventListener('resize', _repositionIsolatePopover);
    window.removeEventListener('scroll', _repositionIsolatePopover, true);
  }
}

function attachGridOffset() {
  const btn = document.getElementById('grid-offset-btn');
  const pop = document.getElementById('grid-offset-popover');
  if (!btn || !pop) return;

  const xEl = document.getElementById('gop-x');
  const yEl = document.getElementById('gop-y');

  function syncDisplay() {
    if (xEl) xEl.textContent = (typeof gridOffsetX === 'number') ? gridOffsetX.toString() : '0';
    if (yEl) yEl.textContent = (typeof gridOffsetY === 'number') ? gridOffsetY.toString() : '0';
  }

  pop.querySelectorAll('.gop-btn[data-axis]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const axis = b.dataset.axis;
      const delta = parseFloat(b.dataset.delta);
      if (isNaN(delta)) return;
      if (axis === 'x') gridOffsetX = +(gridOffsetX + delta).toFixed(1);
      else              gridOffsetY = +(gridOffsetY + delta).toFixed(1);
      syncDisplay();
      if (!gridEnabled) {
        gridEnabled = true;
        const gb = document.getElementById('grid-btn');
        if (gb) gb.classList.add('active');
        const gs = document.getElementById('grid-sub-toggle');
        if (gs) gs.classList.remove('hidden');
      }
      try { localStorage.setItem('spoito_grid_off_x', String(gridOffsetX)); } catch (_) {}
      try { localStorage.setItem('spoito_grid_off_y', String(gridOffsetY)); } catch (_) {}
      if (typeof renderPixelCanvas === 'function') renderPixelCanvas();
    });
  });

  const reset = document.getElementById('gop-reset');
  if (reset) {
    reset.addEventListener('click', (e) => {
      e.stopPropagation();
      gridOffsetX = 0;
      gridOffsetY = 0;
      try {
        localStorage.removeItem('spoito_grid_off_x');
        localStorage.removeItem('spoito_grid_off_y');
      } catch (_) {}
      syncDisplay();
      if (typeof renderPixelCanvas === 'function') renderPixelCanvas();
    });
  }

  const closeBtn = document.getElementById('gop-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pop.classList.add('hidden');
      document.removeEventListener('keydown', _gridOffsetPopoverKey);
    });
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.classList.toggle('hidden');
    if (!pop.classList.contains('hidden')) {
      syncDisplay();
      _positionGridOffsetPopover();
      setTimeout(() => {
        document.addEventListener('keydown', _gridOffsetPopoverKey);
        window.addEventListener('resize', _positionGridOffsetPopover);
      }, 0);
    } else {
      document.removeEventListener('keydown', _gridOffsetPopoverKey);
      window.removeEventListener('resize', _positionGridOffsetPopover);
    }
  });

  try {
    const sx = parseFloat(localStorage.getItem('spoito_grid_off_x') || '0');
    const sy = parseFloat(localStorage.getItem('spoito_grid_off_y') || '0');
    if (!isNaN(sx)) gridOffsetX = sx;
    if (!isNaN(sy)) gridOffsetY = sy;
    syncDisplay();
  } catch (_) {}
}

function _outsideGridOffsetPopover(e) {
  const pop = document.getElementById('grid-offset-popover');
  const btn = document.getElementById('grid-offset-btn');
  if (!pop) return;
  if (pop.contains(e.target) || (btn && btn.contains(e.target))) return;
  pop.classList.add('hidden');
  document.removeEventListener('click', _outsideGridOffsetPopover);
  document.removeEventListener('keydown', _gridOffsetPopoverKey);
}

function _positionGridOffsetPopover() {
  const pop = document.getElementById('grid-offset-popover');
  if (!pop || pop.classList.contains('hidden')) return;

  const isMobile = window.matchMedia('(max-width: 600px)').matches;
  if (isMobile) {
    pop.style.left = 'auto';
    pop.style.right = '8px';
    pop.style.top = '8px';
    pop.style.bottom = 'auto';
    return;
  }

  const wrap = document.getElementById('canvas-wrapper');
  if (!wrap) {
    pop.style.right = '16px';
    pop.style.top = '16px';
    pop.style.left = 'auto';
    pop.style.bottom = 'auto';
    return;
  }
  const r = wrap.getBoundingClientRect();
  pop.style.visibility = 'hidden';
  pop.style.left = '0';
  pop.style.top = '0';
  pop.style.right = 'auto';
  pop.style.bottom = 'auto';
  requestAnimationFrame(() => {
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const margin = 12;

    let left = r.right - pw - margin;
    if (left < margin) left = margin;
    if (left + pw > vw - margin) left = vw - pw - margin;

    let top = r.top + margin;
    if (top < margin) top = margin;
    if (top + ph > vh - margin) top = vh - ph - margin;

    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.style.visibility = '';
  });
}

function _gridOffsetPopoverKey(e) {
  if (e.key === 'Escape') {
    const pop = document.getElementById('grid-offset-popover');
    if (pop) pop.classList.add('hidden');
    document.removeEventListener('keydown', _gridOffsetPopoverKey);
  }
}

function _repositionGridOffsetPopover() {
  const pop = document.getElementById('grid-offset-popover');
  const btn = document.getElementById('grid-offset-btn');
  if (!pop || !btn || pop.classList.contains('hidden')) return;
  _positionPopoverNearButton(pop, btn);
}

function _positionPopoverNearButton(pop, btn) {
  const r = btn.getBoundingClientRect();
  pop.style.visibility = 'hidden';
  pop.style.left = '0';
  pop.style.top = '0';
  pop.style.right = 'auto';
  pop.style.bottom = 'auto';
  requestAnimationFrame(() => {
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const margin = 8;

    let left = r.left;
    if (left + pw > vw - margin) left = vw - pw - margin;
    if (left < margin) left = margin;

    let top = r.bottom + 6;
    if (top + ph > vh - margin) {
      const above = r.top - 6 - ph;
      if (above >= margin) {
        top = above;
      } else {
        top = vh - ph - margin;
      }
    }
    if (top < margin) top = margin;

    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.style.visibility = '';
  });
}

function initIsolate() {
  let saved = false;
  try { saved = localStorage.getItem(ISOLATE_STORAGE_KEY) === '1'; } catch (_) {}
  if (saved && typeof closestIdx !== 'undefined' && closestIdx >= 0) {
    isolateEnabled = true;
    isolateTargetIdx = closestIdx;
  } else {
    isolateEnabled = false;
    isolateTargetIdx = -1;
  }
  _updateIsolateButtonState();
}

function toggleDoneColor() {
  if (typeof closestIdx === 'undefined' || closestIdx < 0) {
    document.querySelectorAll('.done-btn').forEach(btn => {
      btn.classList.add('shake');
      setTimeout(() => btn.classList.remove('shake'), 400);
    });
    return;
  }
  doneState.toggle(closestIdx);
}

function resetDoneColors() {
  doneState.reset();
}

function _updateDoneButtonState() {
  const hasSel = (typeof closestIdx !== 'undefined' && closestIdx >= 0);
  const isDone = hasSel && doneState.isDone(closestIdx);
  const longKey  = isDone ? 'color.markDoneOn'      : 'color.markDoneOff';
  const shortKey = isDone ? 'color.markDoneOnShort' : 'color.markDoneOffShort';
  const longText  = (typeof t === 'function') ? t(longKey)  : '';
  const shortText = (typeof t === 'function') ? t(shortKey) : '';
  document.querySelectorAll('.done-btn').forEach(btn => {
    btn.classList.toggle('active', isDone);
    const useShort = btn.classList.contains('done-btn-mobile-only');
    const text = useShort ? shortText : longText;
    const key  = useShort ? shortKey  : longKey;
    if (text) btn.textContent = text;
    btn.setAttribute('data-i18n', key);
    btn.disabled = !hasSel;
  });

  const resetBtn = document.getElementById('done-reset-btn');
  if (resetBtn) resetBtn.classList.toggle('hidden', !doneState.any());

  const counter = document.getElementById('done-counter');
  if (counter) {
    if (typeof convertedData !== 'undefined' && convertedData && convertedData.usedSet) {
      const total = convertedData.usedSet.size;
      const done = doneState.count();
      counter.textContent = (typeof t === 'function')
        ? t('color.doneCounter', { n: done, m: total })
        : `${done}/${total}`;
      counter.classList.toggle('hidden', total === 0);
    } else {
      counter.classList.add('hidden');
    }
  }
}

function refreshDoneOnSelection() {
  _updateDoneButtonState();
}

const MIRROR_STORAGE_KEY = 'spoito_mirror_mode';
const MIRROR_MODES = ['off', 'v', 'h', 'both'];

function toggleMirror() {
  mirrorMode = (mirrorMode === 'off') ? 'v' : 'off';
  _updateMirrorButtonState();
  try { localStorage.setItem(MIRROR_STORAGE_KEY, mirrorMode); } catch (_) {}
  renderPixelCanvas();
}

function setMirrorAxis(axis) {
  if (!MIRROR_MODES.includes(axis) || axis === 'off') return;
  mirrorMode = axis;
  _updateMirrorButtonState();
  try { localStorage.setItem(MIRROR_STORAGE_KEY, mirrorMode); } catch (_) {}
  renderPixelCanvas();
}

function _updateMirrorButtonState() {
  const btn = document.getElementById('mirror-btn');
  if (btn) btn.classList.toggle('active', mirrorMode !== 'off');
  const sub = document.getElementById('mirror-sub-toggle');
  if (sub) sub.classList.toggle('hidden', mirrorMode === 'off');
  document.querySelectorAll('.mirror-sub-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mirror === mirrorMode);
  });
}

function initMirror() {
  let saved = 'off';
  try { saved = localStorage.getItem(MIRROR_STORAGE_KEY) || 'off'; } catch (_) {}
  if (!MIRROR_MODES.includes(saved)) saved = 'off';
  mirrorMode = saved;
  _updateMirrorButtonState();
}

function _getMirroredPoints(px, py, w, h) {
  if (mirrorMode === 'off') return [];
  const mx = w - 1 - px;
  const my = h - 1 - py;
  const out = [];
  if (mirrorMode === 'v')    out.push([mx, py]);
  if (mirrorMode === 'h')    out.push([px, my]);
  if (mirrorMode === 'both') { out.push([mx, py], [px, my], [mx, my]); }
  return out.filter(([x, y]) => !(x === px && y === py));
}

function drawMirrorAxes(ctx) {
  if (mirrorMode === 'off') return;
  const src = getActiveData();
  if (!src) return;
  const W = src.width * zoom, H = src.height * zoom;
  ctx.save();
  ctx.strokeStyle = 'rgba(214, 64, 4, 0.55)';
  ctx.lineWidth = Math.max(1, zoom * 0.18);
  ctx.setLineDash([Math.max(6, zoom * 0.6), Math.max(4, zoom * 0.4)]);
  ctx.beginPath();
  if (mirrorMode === 'v' || mirrorMode === 'both') {
    const x = Math.round(W / 2) + 0.5;
    ctx.moveTo(x, 0); ctx.lineTo(x, H);
  }
  if (mirrorMode === 'h' || mirrorMode === 'both') {
    const y = Math.round(H / 2) + 0.5;
    ctx.moveTo(0, y); ctx.lineTo(W, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawMirrorHighlight(px, py) {
  if (mirrorMode === 'off') return;
  const src = getActiveData();
  if (!src) return;
  const pts = _getMirroredPoints(px, py, src.width, src.height);
  if (!pts.length) return;
  const ctx = overlayCanvas.getContext('2d');
  ctx.save();
  ctx.strokeStyle = 'rgba(214, 64, 4, 0.85)';
  ctx.lineWidth = Math.max(2, zoom * 0.18);
  ctx.fillStyle = 'rgba(255, 201, 60, 0.30)';
  for (const [mx, my] of pts) {
    const x = mx * zoom, y = my * zoom;
    ctx.fillRect(x, y, zoom, zoom);
    ctx.strokeRect(x + 0.5, y + 0.5, zoom - 1, zoom - 1);
  }
  ctx.restore();
}
