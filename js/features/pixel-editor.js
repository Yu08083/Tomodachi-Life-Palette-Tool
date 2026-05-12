
var pixelEditorActive = false;
var pixelEditorTool = 'pencil';
var pixelEditorColorIdx = -1;

var _editorHistory = [];
var _editorRedoStack = [];
var _EDITOR_HISTORY_MAX = 50;
var _editorBaseSnapshot = null;

var _editorDrag = null;
var _editorRecipeTimer = null;

function pixelEditorToggle() {
  if (!pixelEditorCanActivate()) return;
  if (pixelEditorActive) pixelEditorDeactivate();
  else pixelEditorActivate();
}

function pixelEditorCanActivate() {
  return (typeof viewMode !== 'undefined' && viewMode === 'converted'
          && typeof convertedData !== 'undefined' && convertedData);
}

function pixelEditorActivate() {
  if (!pixelEditorCanActivate()) return;
  pixelEditorActive = true;
  if (pixelEditorColorIdx < 0 && typeof closestIdx !== 'undefined' && closestIdx >= 0) {
    pixelEditorColorIdx = closestIdx;
  }
  if (pixelEditorColorIdx < 0) pixelEditorColorIdx = 0;

  if (convertedData && convertedData.paletteMap && !_editorBaseSnapshot) {
    _editorBaseSnapshot = new Int16Array(convertedData.paletteMap);
  }

  if (typeof switchTab === 'function') {
    try { switchTab('palette'); } catch (_) {}
  }

  document.body.classList.add('pe-editing');
  _editorShowUI(true);
  _editorShowColorInfo();
  _editorUpdateUI();
}

function _editorShowColorInfo() {
  if (pixelEditorColorIdx < 0) return;
  if (typeof PALETTE === 'undefined' || !PALETTE[pixelEditorColorIdx]) return;
  if (typeof selectColor !== 'function' || typeof hexToRgb !== 'function') return;
  const p = PALETTE[pixelEditorColorIdx];
  const c = hexToRgb(p.h);
  if (c) {
    try { selectColor(c.r, c.g, c.b, -1, -1); } catch (_) {}
  }
}

function pixelEditorDeactivate() {
  if (_editorDrag) _editorEndDrag();
  pixelEditorActive = false;
  document.body.classList.remove('pe-editing');
  _editorShowUI(false);
  _editorUpdateUI();
}

function pixelEditorReset() {
  if (!convertedData || !_editorBaseSnapshot) return;
  if (_editorHistory.length === 0 && _editorRedoStack.length === 0) return;

  const msg = (typeof t === 'function') ? t('editor.resetConfirm') : 'Reset all edits?';
  if (typeof confirm === 'function' && !confirm(msg)) return;

  const map = convertedData.paletteMap;
  const changes = [];
  for (let i = 0; i < map.length; i++) {
    if (map[i] !== _editorBaseSnapshot[i]) {
      changes.push([i, map[i], _editorBaseSnapshot[i]]);
    }
  }
  if (changes.length === 0) return;
  _editorApplyChanges(changes);
  _editorHistory.length = 0;
  _editorRedoStack.length = 0;
  _editorRefreshAfterEdit();
}

function pixelEditorSetTool(tool) {
  if (!['pencil','eraser','eyedropper','bucket','swap'].includes(tool)) return;
  pixelEditorTool = tool;
  _editorUpdateUI();
}

function pixelEditorSetColor(idx) {
  if (typeof idx !== 'number' || idx < 0) return;
  pixelEditorColorIdx = idx;
  if (pixelEditorActive) _editorShowColorInfo();
  _editorUpdateUI();
}

function _editorShowUI(on) {
  const toolbar = document.getElementById('pixel-editor-toolbar');
  if (toolbar) toolbar.classList.toggle('hidden', !on);
  const editBtn = document.getElementById('edit-btn');
  if (editBtn) editBtn.classList.toggle('active', on);
  const canvas = document.getElementById('pixel-canvas');
  if (canvas) canvas.classList.toggle('editing', on);
}

function _editorBuildColorPopup() {
  const grid = document.getElementById('pe-color-grid');
  if (!grid) return;
  if (grid.children.length > 0) return;
  if (typeof PALETTE === 'undefined' || !PALETTE.length) return;
  for (let i = 0; i < PALETTE.length; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'pe-color-cell';
    cell.style.background = PALETTE[i].h;
    cell.dataset.idx = String(i);
    cell.title = '#' + (i + 1) + ' ' + PALETTE[i].h.toUpperCase();
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      pixelEditorSetColor(i);
      _editorCloseColorPopup();
    });
    grid.appendChild(cell);
  }
}

function _editorToggleColorPopup() {
  const pop = document.getElementById('pe-color-popup');
  if (!pop) return;
  if (pop.classList.contains('hidden')) {
    _editorBuildColorPopup();
    _editorMarkSelectedColorCell();
    pop.classList.remove('hidden');
    setTimeout(() => {
      document.addEventListener('click', _editorOutsidePopupClick);
      document.addEventListener('keydown', _editorPopupKey);
    }, 0);
  } else {
    _editorCloseColorPopup();
  }
}

function _editorCloseColorPopup() {
  const pop = document.getElementById('pe-color-popup');
  if (pop) pop.classList.add('hidden');
  document.removeEventListener('click', _editorOutsidePopupClick);
  document.removeEventListener('keydown', _editorPopupKey);
}

function _editorOutsidePopupClick(e) {
  const pop = document.getElementById('pe-color-popup');
  const sw = document.getElementById('pe-current-color');
  if (!pop) return;
  if (pop.contains(e.target)) return;
  if (sw && sw.contains(e.target)) return;
  _editorCloseColorPopup();
}

function _editorPopupKey(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    _editorCloseColorPopup();
  }
}

function _editorMarkSelectedColorCell() {
  const grid = document.getElementById('pe-color-grid');
  if (!grid) return;
  const cells = grid.children;
  for (let i = 0; i < cells.length; i++) {
    cells[i].classList.toggle('selected', i === pixelEditorColorIdx);
  }
}

function _editorUpdateUI() {
  document.querySelectorAll('.pe-tool-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === pixelEditorTool);
  });
  const sw = document.getElementById('pe-current-color');
  if (sw) {
    if (pixelEditorColorIdx >= 0 && typeof PALETTE !== 'undefined' && PALETTE[pixelEditorColorIdx]) {
      sw.style.background = PALETTE[pixelEditorColorIdx].h;
      sw.classList.remove('none');
    } else {
      sw.style.background = '';
      sw.classList.add('none');
    }
  }
  _editorMarkSelectedColorCell();
  const undoBtn = document.getElementById('pe-undo');
  const redoBtn = document.getElementById('pe-redo');
  if (undoBtn) undoBtn.disabled = _editorHistory.length === 0;
  if (redoBtn) redoBtn.disabled = _editorRedoStack.length === 0;

  const editBtn = document.getElementById('edit-btn');
  if (editBtn) {
    const can = pixelEditorCanActivate();
    editBtn.classList.toggle('hidden', !can);
  }

  if (typeof updatePaletteHighlight === 'function' && pixelEditorActive && pixelEditorColorIdx >= 0) {
    _editorHighlightSelectedColor();
  }
}

function _editorHighlightSelectedColor() {
  document.querySelectorAll('.palette-cell').forEach(cell => {
    const i = parseInt(cell.dataset.idx, 10);
    cell.classList.toggle('pe-selected', i === pixelEditorColorIdx);
  });
}

function _editorGetPixelCoords(clientX, clientY) {
  if (!convertedData) return null;
  const canvas = document.getElementById('pixel-canvas');
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const ratioX = canvas.width / rect.width;
  const ratioY = canvas.height / rect.height;
  const cx = (clientX - rect.left) * ratioX;
  const cy = (clientY - rect.top) * ratioY;
  let px = Math.floor(cx / zoom);
  let py = Math.floor(cy / zoom);
  if (px < 0 || py < 0 || px >= convertedData.width || py >= convertedData.height) return null;
  return { px, py };
}

function pixelEditorHandlePointerDown(e) {
  if (!pixelEditorActive) return false;
  if (viewMode !== 'converted' || !convertedData) return false;

  e.preventDefault();

  const coords = _editorGetPixelCoords(e.clientX, e.clientY);
  if (!coords) return true;

  if (pixelEditorTool === 'eyedropper') {
    _editorEyedropper(coords.px, coords.py);
    return true;
  }
  if (pixelEditorTool === 'bucket') {
    _editorRunOp('bucket', coords.px, coords.py);
    return true;
  }
  if (pixelEditorTool === 'swap') {
    _editorRunOp('swap', coords.px, coords.py);
    return true;
  }

  _editorDrag = {
    tool: pixelEditorTool,
    visited: new Set(),
    changes: [],
    lastPx: coords.px,
    lastPy: coords.py,
  };
  _editorPaintAt(coords.px, coords.py);

  const canvas = document.getElementById('pixel-canvas');
  if (canvas && canvas.setPointerCapture) {
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }
  return true;
}

function pixelEditorHandlePointerMove(e) {
  if (!_editorDrag || !pixelEditorActive) return false;
  const coords = _editorGetPixelCoords(e.clientX, e.clientY);
  if (!coords) return true;
  const lx = _editorDrag.lastPx, ly = _editorDrag.lastPy;
  if (lx !== coords.px || ly !== coords.py) {
    _editorLinePixels(lx, ly, coords.px, coords.py, (px, py) => _editorPaintAt(px, py));
    _editorDrag.lastPx = coords.px;
    _editorDrag.lastPy = coords.py;
  }
  return true;
}

function pixelEditorHandlePointerUp(e) {
  if (!_editorDrag) return false;
  _editorEndDrag();
  return true;
}

function _editorEndDrag() {
  if (!_editorDrag) return;
  const drag = _editorDrag;
  _editorDrag = null;
  if (drag.changes.length > 0) {
    _editorCommitOp({ tool: drag.tool, changes: drag.changes });
    _editorRefreshAfterEdit();
  }
}

function _editorPaintAt(px, py) {
  if (!_editorDrag) return;
  const i = py * convertedData.width + px;
  if (_editorDrag.visited.has(i)) return;
  _editorDrag.visited.add(i);

  const oldIdx = convertedData.paletteMap[i];
  const newIdx = _editorDrag.tool === 'eraser' ? -1 : pixelEditorColorIdx;
  if (oldIdx === newIdx) return;

  convertedData.paletteMap[i] = newIdx;
  _editorWritePixel(i, newIdx);
  _editorDrag.changes.push([i, oldIdx, newIdx]);
}

function _editorLinePixels(x0, y0, x1, y1, fn) {
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    fn(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function _editorWritePixel(i, idx) {
  const p = i * 4;
  const data = convertedData.data;
  if (idx < 0) {
    data[p] = 0; data[p+1] = 0; data[p+2] = 0; data[p+3] = 0;
  } else {
    const palRgb = getPaletteRgb();
    const c = palRgb[idx];
    data[p] = c.r; data[p+1] = c.g; data[p+2] = c.b; data[p+3] = 255;
  }
  const ctx = convertedData.originalCanvas.getContext('2d');
  const w = convertedData.width;
  const x = i % w;
  const y = (i - x) / w;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(data.buffer, p, 4), 1, 1), x, y);
  _editorScheduleRender();
}

var _editorRenderTimer = null;
function _editorScheduleRender() {
  if (_editorRenderTimer) return;
  _editorRenderTimer = requestAnimationFrame(() => {
    _editorRenderTimer = null;
    if (typeof renderPixelCanvas === 'function') renderPixelCanvas();
  });
}

function _editorEyedropper(px, py) {
  const i = py * convertedData.width + px;
  const idx = convertedData.paletteMap[i];
  if (idx < 0) return;
  pixelEditorColorIdx = idx;
  pixelEditorSetTool('pencil');
  _editorUpdateUI();
}

function _editorRunOp(tool, px, py) {
  const changes = [];
  if (tool === 'bucket') _editorPlanBucket(px, py, changes);
  else if (tool === 'swap') _editorPlanSwap(px, py, changes);
  if (changes.length === 0) return;
  _editorApplyChanges(changes);
  _editorCommitOp({ tool, changes });
  _editorRefreshAfterEdit();
}

function _editorPlanBucket(px, py, changes) {
  if (pixelEditorColorIdx < 0) return;
  const w = convertedData.width, h = convertedData.height;
  const map = convertedData.paletteMap;
  const startIdx = py * w + px;
  const target = map[startIdx];
  if (target === pixelEditorColorIdx) return;
  const seen = new Uint8Array(w * h);
  const stack = [startIdx];
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    if (map[i] !== target) continue;
    seen[i] = 1;
    changes.push([i, target, pixelEditorColorIdx]);
    const x = i % w, y = (i - x) / w;
    if (x > 0)     stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0)     stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
}

function _editorPlanSwap(px, py, changes) {
  if (pixelEditorColorIdx < 0) return;
  const w = convertedData.width, h = convertedData.height;
  const map = convertedData.paletteMap;
  const target = map[py * w + px];
  if (target === pixelEditorColorIdx) return;
  for (let i = 0; i < map.length; i++) {
    if (map[i] === target) changes.push([i, target, pixelEditorColorIdx]);
  }
}

function _editorApplyChanges(changes) {
  if (!convertedData) return;
  const palRgb = getPaletteRgb();
  const data = convertedData.data;
  const map = convertedData.paletteMap;
  for (let k = 0; k < changes.length; k++) {
    const [i, , newIdx] = changes[k];
    map[i] = newIdx;
    const p = i * 4;
    if (newIdx < 0) {
      data[p] = 0; data[p+1] = 0; data[p+2] = 0; data[p+3] = 0;
    } else {
      const c = palRgb[newIdx];
      data[p] = c.r; data[p+1] = c.g; data[p+2] = c.b; data[p+3] = 255;
    }
  }
  const ctx = convertedData.originalCanvas.getContext('2d');
  const img = new ImageData(
    new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    convertedData.width,
    convertedData.height
  );
  ctx.putImageData(img, 0, 0);
}

function _editorCommitOp(op) {
  _editorHistory.push(op);
  if (_editorHistory.length > _EDITOR_HISTORY_MAX) _editorHistory.shift();
  _editorRedoStack.length = 0;
  _editorUpdateUI();
}

function _editorTransformAndSnapshot(transformFn) {
  if (!convertedData || !convertedData.paletteMap) return;
  const w = convertedData.width, h = convertedData.height;
  const oldMap = new Int16Array(convertedData.paletteMap);
  const result = transformFn(convertedData.paletteMap, w, h);
  if (!result) return;
  const { newMap, newW, newH } = result;
  _editorApplyMapDims(newMap, newW, newH);
  _editorHistory.push({
    type: 'transform',
    before: { map: oldMap, w, h },
    after: { map: new Int16Array(newMap), w: newW, h: newH },
  });
  if (_editorHistory.length > _EDITOR_HISTORY_MAX) _editorHistory.shift();
  _editorRedoStack.length = 0;
  _editorRefreshAfterEdit(true);
}

function _editorApplyMapDims(map, w, h) {
  if (!convertedData) return;
  const palRgb = getPaletteRgb();
  const newData = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < map.length; i++) {
    const idx = map[i];
    const p = i * 4;
    if (idx < 0) {
      newData[p] = 0; newData[p+1] = 0; newData[p+2] = 0; newData[p+3] = 0;
    } else {
      const c = palRgb[idx];
      newData[p] = c.r; newData[p+1] = c.g; newData[p+2] = c.b; newData[p+3] = 255;
    }
  }
  convertedData.paletteMap = map;
  convertedData.width = w;
  convertedData.height = h;
  convertedData.data = newData;
  if (convertedData.originalCanvas) {
    convertedData.originalCanvas.width = w;
    convertedData.originalCanvas.height = h;
    const ctx = convertedData.originalCanvas.getContext('2d');
    const img = new ImageData(new Uint8ClampedArray(newData), w, h);
    ctx.putImageData(img, 0, 0);
  }
}

function pixelEditorRotate(dir) {
  if (!pixelEditorActive) return;
  _editorTransformAndSnapshot((oldMap, w, h) => {
    let newW, newH;
    let newMap;
    if (dir === 'cw') {
      newW = h; newH = w;
      newMap = new Int16Array(newW * newH);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          newMap[x * newW + (h - 1 - y)] = oldMap[y * w + x];
    } else if (dir === 'ccw') {
      newW = h; newH = w;
      newMap = new Int16Array(newW * newH);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          newMap[(w - 1 - x) * newW + y] = oldMap[y * w + x];
    } else {
      return null;
    }
    return { newMap, newW, newH };
  });
}

function pixelEditorFlip(axis) {
  if (!pixelEditorActive) return;
  _editorTransformAndSnapshot((oldMap, w, h) => {
    const newMap = new Int16Array(w * h);
    if (axis === 'h') {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          newMap[y * w + (w - 1 - x)] = oldMap[y * w + x];
    } else if (axis === 'v') {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          newMap[(h - 1 - y) * w + x] = oldMap[y * w + x];
    } else {
      return null;
    }
    return { newMap, newW: w, newH: h };
  });
}

function pixelEditorUndo() {
  if (_editorHistory.length === 0) return;
  const op = _editorHistory.pop();
  if (op.type === 'transform') {
    _editorApplyMapDims(new Int16Array(op.before.map), op.before.w, op.before.h);
  } else {
    const reverseChanges = op.changes.map(([i, o]) => [i, undefined, o]);
    _editorApplyChanges(reverseChanges);
  }
  _editorRedoStack.push(op);
  _editorRefreshAfterEdit(op.type === 'transform');
}

function pixelEditorRedo() {
  if (_editorRedoStack.length === 0) return;
  const op = _editorRedoStack.pop();
  if (op.type === 'transform') {
    _editorApplyMapDims(new Int16Array(op.after.map), op.after.w, op.after.h);
  } else {
    _editorApplyChanges(op.changes);
  }
  _editorHistory.push(op);
  _editorRefreshAfterEdit(op.type === 'transform');
}

function _editorRefreshAfterEdit(transformed) {
  if (!convertedData) return;
  const used = new Set();
  const map = convertedData.paletteMap;
  for (let i = 0; i < map.length; i++) {
    const v = map[i];
    if (v >= 0) used.add(v);
  }
  convertedData.usedSet = used;

  if (transformed) {
    if (typeof setupCanvases === 'function') {
      try { setupCanvases(); } catch (_) {}
    }
    if (typeof fitZoomToConverted === 'function') {
      try { fitZoomToConverted(); } catch (_) {}
    }
    if (typeof updateImgInfo === 'function') {
      try { updateImgInfo(); } catch (_) {}
    }
  }

  if (typeof renderPixelCanvas === 'function') renderPixelCanvas();
  _editorScheduleRecipeRebuild();
  _editorUpdateUI();
}

function _editorScheduleRecipeRebuild() {
  if (_editorRecipeTimer) clearTimeout(_editorRecipeTimer);
  _editorRecipeTimer = setTimeout(() => {
    _editorRecipeTimer = null;
    if (typeof rebuildRecipe === 'function') {
      try { rebuildRecipe(); } catch (_) {}
    }
    if (typeof applyPaletteUsedFilter === 'function') {
      try { applyPaletteUsedFilter(); } catch (_) {}
    }
  }, 250);
}

function attachPixelEditorHandlers() {
  const editBtn = document.getElementById('edit-btn');
  if (editBtn) editBtn.addEventListener('click', pixelEditorToggle);

  document.querySelectorAll('.pe-tool-btn').forEach(b => {
    b.addEventListener('click', () => pixelEditorSetTool(b.dataset.tool));
  });
  const undoBtn = document.getElementById('pe-undo');
  if (undoBtn) undoBtn.addEventListener('click', pixelEditorUndo);
  const redoBtn = document.getElementById('pe-redo');
  if (redoBtn) redoBtn.addEventListener('click', pixelEditorRedo);
  const resetBtn = document.getElementById('pe-reset');
  if (resetBtn) resetBtn.addEventListener('click', pixelEditorReset);

  const rotCcw = document.getElementById('pe-rot-ccw');
  if (rotCcw) rotCcw.addEventListener('click', () => pixelEditorRotate('ccw'));
  const rotCw = document.getElementById('pe-rot-cw');
  if (rotCw) rotCw.addEventListener('click', () => pixelEditorRotate('cw'));
  const flipH = document.getElementById('pe-flip-h');
  if (flipH) flipH.addEventListener('click', () => pixelEditorFlip('h'));
  const flipV = document.getElementById('pe-flip-v');
  if (flipV) flipV.addEventListener('click', () => pixelEditorFlip('v'));

  const colorSwatch = document.getElementById('pe-current-color');
  if (colorSwatch) {
    colorSwatch.addEventListener('click', (e) => {
      e.stopPropagation();
      _editorToggleColorPopup();
    });
  }

  const exitBtn = document.getElementById('pe-exit');
  if (exitBtn) exitBtn.addEventListener('click', pixelEditorDeactivate);

  const canvas = document.getElementById('pixel-canvas');
  if (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      if (pixelEditorHandlePointerDown(e)) e.stopPropagation();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (pixelEditorHandlePointerMove(e)) e.stopPropagation();
    });
    canvas.addEventListener('pointerup', (e) => {
      if (pixelEditorHandlePointerUp(e)) e.stopPropagation();
    });
    canvas.addEventListener('pointercancel', () => _editorEndDrag());
  }

  document.addEventListener('keydown', (e) => {
    if (!pixelEditorActive) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      pixelEditorUndo();
    } else if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
               ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')) {
      e.preventDefault();
      pixelEditorRedo();
    } else if (e.key === 'Escape') {
      pixelEditorDeactivate();
    } else if (e.key === 'b' || e.key === 'B') {
      pixelEditorSetTool('pencil');
    } else if (e.key === 'e' || e.key === 'E') {
      pixelEditorSetTool('eraser');
    } else if (e.key === 'i' || e.key === 'I') {
      pixelEditorSetTool('eyedropper');
    } else if (e.key === 'g' || e.key === 'G') {
      pixelEditorSetTool('bucket');
    } else if (e.key === 's' || e.key === 'S') {
      pixelEditorSetTool('swap');
    }
  });

  const paletteGrid = document.getElementById('palette-grid');
  if (paletteGrid) {
    paletteGrid.addEventListener('click', (e) => {
      if (!pixelEditorActive) return;
      const cell = e.target.closest('.palette-cell');
      if (!cell) return;
      const idx = parseInt(cell.dataset.idx, 10);
      if (!isNaN(idx)) pixelEditorSetColor(idx);
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('spoito:viewmode', () => _editorUpdateUI());
  }
}

function pixelEditorOnViewModeChange() {
  if (pixelEditorActive && viewMode !== 'converted') {
    pixelEditorDeactivate();
  }
  _editorUpdateUI();
}

function pixelEditorClearHistory() {
  _editorHistory.length = 0;
  _editorRedoStack.length = 0;
  _editorBaseSnapshot = null;
  _editorUpdateUI();
}
