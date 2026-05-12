
var _bgPresetCurrent = {
  catId: null,
  presetId: null,
  image: null,
  detect: null,
  slots: [],
  gridSize: 64,
  dither: false,
  placing: null,
  _previewScale: 1,
};

async function openBgPresetMode() {
  document.getElementById('upload-section').classList.add('hidden');
  document.getElementById('bg-preset-section').classList.remove('hidden');
  if (typeof loadBgPresets === 'function' && !bgPresetLoaded) {
    try { await loadBgPresets(); } catch (_) {}
  }
  if (!_bgPresetCurrent.catId) {
    _bgPresetInitPickers();
  }
  setTimeout(() => {
    document.getElementById('bg-preset-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

function closeBgPresetMode() {
  if (_bgPresetCurrent.placing) _bgPresetCancelPlace();
  document.getElementById('bg-preset-section').classList.add('hidden');
  document.getElementById('upload-section').classList.remove('hidden');
}

function _bgPresetInitPickers() {
  const cats = bgPresetCategories();
  const catSelect = document.getElementById('bg-category-select');
  const presetSelect = document.getElementById('bg-preset-select');
  if (!catSelect || !presetSelect) return;

  catSelect.innerHTML = '';
  for (const cat of cats) {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = t(cat.nameKey);
    opt.dataset.i18n = cat.nameKey;
    if ((cat.presets || []).length === 0) opt.disabled = true;
    catSelect.appendChild(opt);
  }

  const firstWith = cats.find(c => (c.presets || []).length > 0);
  if (firstWith) {
    catSelect.value = firstWith.id;
    _bgPresetCurrent.catId = firstWith.id;
    _bgPresetFillPresets(firstWith.id);
  }
}

function _bgPresetFillPresets(catId) {
  const cat = bgPresetCategoryById(catId);
  const presetSelect = document.getElementById('bg-preset-select');
  if (!cat || !presetSelect) return;

  presetSelect.innerHTML = '';
  const presets = cat.presets || [];
  for (const p of presets) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = t(p.nameKey);
    opt.dataset.i18n = p.nameKey;
    presetSelect.appendChild(opt);
  }

  if (presets.length > 0) {
    presetSelect.value = presets[0].id;
    _bgPresetSelectPreset(catId, presets[0].id);
  }
}

async function _bgPresetSelectPreset(catId, presetId) {
  if (_bgPresetCurrent.placing) _bgPresetCancelPlace();
  _bgPresetCurrent.catId = catId;
  _bgPresetCurrent.presetId = presetId;
  const url = bgPresetImageUrl(catId, presetId);
  if (!url) return;

  try {
    const img = await loadBgPresetImage(url);
    _bgPresetCurrent.image = img;
    _bgPresetCurrent.detect = detectBlueRegions(img);
    _bgPresetCurrent.slots = _bgPresetCurrent.detect.regions.map(() => ({
      fileName: null,
      sourceCanvas: null,
      convertedCanvas: null,
      scale: 1, tx: 0, ty: 0,
    }));
    _bgPresetRenderPreview();
    _bgPresetRenderSlots();
  } catch (e) {
    console.error(e);
    alert(t('bg.loadFail'));
  }
}

function _bgPresetEnterPlaceMode(idx, sourceCanvas, fileName) {
  const region = _bgPresetCurrent.detect.regions[idx];
  const coverScale = Math.max(region.w / sourceCanvas.width, region.h / sourceCanvas.height);

  _bgPresetCurrent.placing = {
    idx,
    sourceCanvas,
    fileName,
    scale: coverScale,
    tx: 0,
    ty: 0,
    coverScale,
    dragState: null,
    pinchState: null,
  };
  _bgPresetUpdatePlaceToolbar();
  _bgPresetRenderPreview();
}

function _bgPresetReEditSlot(idx) {
  const slot = _bgPresetCurrent.slots[idx];
  if (!slot || !slot.sourceCanvas) return;
  const region = _bgPresetCurrent.detect.regions[idx];
  const coverScale = Math.max(region.w / slot.sourceCanvas.width, region.h / slot.sourceCanvas.height);

  _bgPresetCurrent.placing = {
    idx,
    sourceCanvas: slot.sourceCanvas,
    fileName: slot.fileName,
    scale: slot.scale || coverScale,
    tx: slot.tx || 0,
    ty: slot.ty || 0,
    coverScale,
    dragState: null,
    pinchState: null,
  };
  _bgPresetUpdatePlaceToolbar();
  _bgPresetRenderPreview();
}

function _bgPresetCancelPlace() {
  _bgPresetCurrent.placing = null;
  _bgPresetUpdatePlaceToolbar();
  _bgPresetRenderPreview();
}

function _bgPresetResetPlace() {
  const p = _bgPresetCurrent.placing;
  if (!p) return;
  p.scale = p.coverScale;
  p.tx = 0;
  p.ty = 0;
  _bgPresetRenderPreview();
}

function _bgPresetZoomPlace(factor) {
  const p = _bgPresetCurrent.placing;
  if (!p) return;
  p.scale = Math.max(p.coverScale * 0.2, Math.min(p.coverScale * 8, p.scale * factor));
  _bgPresetRenderPreview();
}

function _bgPresetConfirmPlace() {
  const p = _bgPresetCurrent.placing;
  if (!p) return;
  const region = _bgPresetCurrent.detect.regions[p.idx];
  const slot = _bgPresetCurrent.slots[p.idx];

  const cropped = document.createElement('canvas');
  cropped.width = region.w;
  cropped.height = region.h;
  const cctx = cropped.getContext('2d');
  cctx.imageSmoothingEnabled = true;
  cctx.imageSmoothingQuality = 'high';

  const sw = p.sourceCanvas.width;
  const sh = p.sourceCanvas.height;
  const dispW = sw * p.scale;
  const dispH = sh * p.scale;
  const dx = (region.w - dispW) / 2 + p.tx;
  const dy = (region.h - dispH) / 2 + p.ty;
  cctx.drawImage(p.sourceCanvas, dx, dy, dispW, dispH);

  const aspect = region.w / region.h;
  let dotW, dotH;
  if (aspect >= 1) {
    dotW = _bgPresetCurrent.gridSize;
    dotH = Math.max(1, Math.round(_bgPresetCurrent.gridSize / aspect));
  } else {
    dotH = _bgPresetCurrent.gridSize;
    dotW = Math.max(1, Math.round(_bgPresetCurrent.gridSize * aspect));
  }
  const dot = document.createElement('canvas');
  dot.width = dotW;
  dot.height = dotH;
  const dctx = dot.getContext('2d');
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = 'high';
  dctx.drawImage(cropped, 0, 0, dotW, dotH);
  bgPresetConvertImage(dot, _bgPresetCurrent.dither);

  slot.fileName = p.fileName;
  slot.sourceCanvas = p.sourceCanvas;
  slot.scale = p.scale;
  slot.tx = p.tx;
  slot.ty = p.ty;
  slot.convertedCanvas = dot;

  _bgPresetCurrent.placing = null;
  _bgPresetUpdatePlaceToolbar();
  _bgPresetRenderPreview();
  _bgPresetRenderSlots();
}

function _bgPresetUpdatePlaceToolbar() {
  const toolbar = document.getElementById('bg-place-toolbar');
  if (!toolbar) return;
  const placing = _bgPresetCurrent.placing;
  if (placing) {
    toolbar.classList.remove('hidden');
    const nameEl = document.getElementById('bg-place-filename');
    if (nameEl) nameEl.textContent = placing.fileName || '';
    const badgeEl = document.getElementById('bg-place-badge');
    if (badgeEl) badgeEl.textContent = String(placing.idx + 1);
  } else {
    toolbar.classList.add('hidden');
  }
}

function _bgPresetRenderPreview() {
  const wrap = document.getElementById('bg-preset-preview-wrap');
  const canvas = document.getElementById('bg-preset-preview');
  if (!wrap || !canvas || !_bgPresetCurrent.image) return;

  const img = _bgPresetCurrent.image;
  const detect = _bgPresetCurrent.detect;
  const maxW = Math.min(wrap.clientWidth - 4, 600);
  const scale = Math.min(maxW / img.width, 1);
  _bgPresetCurrent._previewScale = scale;

  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  canvas.width = dw;
  canvas.height = dh;
  canvas.style.width = dw + 'px';
  canvas.style.height = dh + 'px';

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(img, 0, 0, dw, dh);

  const placing = _bgPresetCurrent.placing;

  for (let i = 0; i < detect.regions.length; i++) {
    if (placing && i === placing.idx) continue;
    const r = detect.regions[i];
    const slot = _bgPresetCurrent.slots[i];
    if (!slot || !slot.convertedCanvas) continue;
    _bgPresetDrawSlotInRegion(ctx, slot, r, i, detect, scale);
  }

  if (placing) {
    const r = detect.regions[placing.idx];
    _bgPresetDrawPlacingInRegion(ctx, placing, r, detect, scale);

    const dim = document.createElement('canvas');
    dim.width = dw;
    dim.height = dh;
    const dctx = dim.getContext('2d');
    dctx.fillStyle = 'rgba(15, 15, 20, 0.6)';
    dctx.fillRect(0, 0, dw, dh);
    dctx.globalCompositeOperation = 'destination-out';
    const mask = extractRegionMaskCanvas(detect, placing.idx);
    if (mask) {
      dctx.drawImage(mask, r.minX * scale, r.minY * scale, r.w * scale, r.h * scale);
    }
    ctx.drawImage(dim, 0, 0);
  }

  for (let i = 0; i < detect.regions.length; i++) {
    const r = detect.regions[i];
    const rx = r.minX * scale;
    const ry = r.minY * scale;
    const rw = r.w * scale;
    const rh = r.h * scale;

    const isPlacing = placing && i === placing.idx;
    if (placing && !isPlacing) continue;

    ctx.strokeStyle = isPlacing ? '#FFB155' : '#E85A0C';
    ctx.lineWidth = isPlacing ? 3 : 2;
    ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);

    const badgeR = 14;
    const bx = rx + badgeR + 4;
    const by = ry + badgeR + 4;
    ctx.fillStyle = isPlacing ? '#FFB155' : '#E85A0C';
    ctx.beginPath();
    ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), bx, by + 1);
  }

  _bgPresetSetupInteractions();
}

function _bgPresetDrawSlotInRegion(ctx, slot, region, idx, detect, scale) {
  const r = region;
  const rdw = Math.round(r.w * scale);
  const rdh = Math.round(r.h * scale);
  const temp = document.createElement('canvas');
  temp.width = rdw;
  temp.height = rdh;
  const tctx = temp.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(slot.convertedCanvas, 0, 0, rdw, rdh);

  const mask = extractRegionMaskCanvas(detect, idx);
  if (mask) {
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(mask, 0, 0, rdw, rdh);
  }
  ctx.drawImage(temp, r.minX * scale, r.minY * scale);
}

function _bgPresetDrawPlacingInRegion(ctx, placing, region, detect, scale) {
  const r = region;
  const rdw = Math.round(r.w * scale);
  const rdh = Math.round(r.h * scale);
  const temp = document.createElement('canvas');
  temp.width = rdw;
  temp.height = rdh;
  const tctx = temp.getContext('2d');
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = 'high';

  const sw = placing.sourceCanvas.width;
  const sh = placing.sourceCanvas.height;
  const dispW_region = sw * placing.scale;
  const dispH_region = sh * placing.scale;
  const dx_region = (r.w - dispW_region) / 2 + placing.tx;
  const dy_region = (r.h - dispH_region) / 2 + placing.ty;

  tctx.drawImage(
    placing.sourceCanvas,
    dx_region * scale,
    dy_region * scale,
    dispW_region * scale,
    dispH_region * scale
  );

  const mask = extractRegionMaskCanvas(detect, placing.idx);
  if (mask) {
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(mask, 0, 0, rdw, rdh);
  }
  ctx.drawImage(temp, r.minX * scale, r.minY * scale);
}

function _bgPresetSetupInteractions() {
  const canvas = document.getElementById('bg-preset-preview');
  if (!canvas || canvas._bgInteractionsAttached) return;
  canvas._bgInteractionsAttached = true;

  canvas.addEventListener('mousedown', _bgPresetOnMouseDown);
  window.addEventListener('mousemove', _bgPresetOnMouseMove);
  window.addEventListener('mouseup',   _bgPresetOnMouseUp);
  canvas.addEventListener('wheel',     _bgPresetOnWheel, { passive: false });
  canvas.addEventListener('touchstart', _bgPresetOnTouchStart, { passive: false });
  canvas.addEventListener('touchmove',  _bgPresetOnTouchMove,  { passive: false });
  canvas.addEventListener('touchend',   _bgPresetOnTouchEnd);
  canvas.addEventListener('touchcancel',_bgPresetOnTouchEnd);
  canvas.addEventListener('click', _bgPresetOnCanvasClick);
}

function _bgPresetOnCanvasClick(e) {
  if (_bgPresetCurrent.placing) return;
  if (_bgPresetCurrent._didDrag) {
    _bgPresetCurrent._didDrag = false;
    return;
  }
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const scale = _bgPresetCurrent._previewScale;
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;
  const detect = _bgPresetCurrent.detect;
  if (!detect) return;
  for (let i = 0; i < detect.regions.length; i++) {
    const r = detect.regions[i];
    if (x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY) {
      _bgPresetTriggerSlotUpload(i);
      return;
    }
  }
}

function _bgPresetOnMouseDown(e) {
  const p = _bgPresetCurrent.placing;
  if (!p) return;
  e.preventDefault();
  p.dragState = { startX: e.clientX, startY: e.clientY, startTx: p.tx, startTy: p.ty };
}

function _bgPresetOnMouseMove(e) {
  const p = _bgPresetCurrent.placing;
  if (!p || !p.dragState) return;
  const scale = _bgPresetCurrent._previewScale;
  const dx = (e.clientX - p.dragState.startX) / scale;
  const dy = (e.clientY - p.dragState.startY) / scale;
  p.tx = p.dragState.startTx + dx;
  p.ty = p.dragState.startTy + dy;
  _bgPresetRenderPreview();
}

function _bgPresetOnMouseUp() {
  const p = _bgPresetCurrent.placing;
  if (!p) return;
  p.dragState = null;
}

function _bgPresetOnWheel(e) {
  const p = _bgPresetCurrent.placing;
  if (!p) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  p.scale = Math.max(p.coverScale * 0.2, Math.min(p.coverScale * 8, p.scale * factor));
  _bgPresetRenderPreview();
}

function _bgPresetOnTouchStart(e) {
  const p = _bgPresetCurrent.placing;
  if (!p) return;
  e.preventDefault();
  const ts = e.touches;
  if (ts.length === 1) {
    p.dragState = { startX: ts[0].clientX, startY: ts[0].clientY, startTx: p.tx, startTy: p.ty };
    p.pinchState = null;
  } else if (ts.length === 2) {
    const dx = ts[0].clientX - ts[1].clientX;
    const dy = ts[0].clientY - ts[1].clientY;
    p.pinchState = { startDist: Math.sqrt(dx*dx + dy*dy), startScale: p.scale };
    p.dragState = null;
  }
}

function _bgPresetOnTouchMove(e) {
  const p = _bgPresetCurrent.placing;
  if (!p) return;
  e.preventDefault();
  const ts = e.touches;
  if (ts.length === 1 && p.dragState) {
    const scale = _bgPresetCurrent._previewScale;
    const dx = (ts[0].clientX - p.dragState.startX) / scale;
    const dy = (ts[0].clientY - p.dragState.startY) / scale;
    p.tx = p.dragState.startTx + dx;
    p.ty = p.dragState.startTy + dy;
    _bgPresetRenderPreview();
  } else if (ts.length === 2 && p.pinchState) {
    const dx = ts[0].clientX - ts[1].clientX;
    const dy = ts[0].clientY - ts[1].clientY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const ratio = dist / p.pinchState.startDist;
    p.scale = Math.max(p.coverScale * 0.2, Math.min(p.coverScale * 8, p.pinchState.startScale * ratio));
    _bgPresetRenderPreview();
  }
}

function _bgPresetOnTouchEnd(e) {
  const p = _bgPresetCurrent.placing;
  if (!p) return;
  if (!e.touches || e.touches.length === 0) {
    p.dragState = null;
    p.pinchState = null;
  } else if (e.touches.length === 1) {
    p.pinchState = null;
    p.dragState = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startTx: p.tx, startTy: p.ty };
  }
}

function _bgPresetRenderSlots() {
  const wrap = document.getElementById('bg-preset-slots');
  if (!wrap) return;
  wrap.innerHTML = '';
  const detect = _bgPresetCurrent.detect;
  if (!detect) return;

  for (let i = 0; i < detect.regions.length; i++) {
    const slot = _bgPresetCurrent.slots[i];
    const row = document.createElement('div');
    row.className = 'bg-slot-row';
    row.dataset.idx = String(i);

    const badge = document.createElement('span');
    badge.className = 'bg-slot-badge';
    badge.textContent = String(i + 1);

    const label = document.createElement('span');
    label.className = 'bg-slot-name';
    label.textContent = slot.fileName || t('bg.notSelected');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn small';
    btn.setAttribute('data-i18n', slot.convertedCanvas ? 'bg.change' : 'bg.choose');
    btn.textContent = t(slot.convertedCanvas ? 'bg.change' : 'bg.choose');
    btn.onclick = () => _bgPresetTriggerSlotUpload(i);

    row.appendChild(badge);
    row.appendChild(label);
    row.appendChild(btn);

    if (slot.convertedCanvas) {
      const adjust = document.createElement('button');
      adjust.type = 'button';
      adjust.className = 'btn small ghost';
      adjust.setAttribute('data-i18n', 'bg.adjust');
      adjust.textContent = t('bg.adjust');
      adjust.onclick = () => _bgPresetReEditSlot(i);
      row.appendChild(adjust);

      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'btn small ghost';
      clear.setAttribute('data-i18n', 'bg.clear');
      clear.textContent = t('bg.clear');
      clear.onclick = () => {
        slot.fileName = null;
        slot.sourceCanvas = null;
        slot.convertedCanvas = null;
        slot.scale = 1; slot.tx = 0; slot.ty = 0;
        _bgPresetRenderSlots();
        _bgPresetRenderPreview();
      };
      row.appendChild(clear);
    }

    wrap.appendChild(row);
  }
}

function _bgPresetTriggerSlotUpload(idx) {
  let input = document.getElementById('bg-preset-file-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.id = 'bg-preset-file-input';
    input.style.display = 'none';
    document.body.appendChild(input);
  }
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) _bgPresetHandleFile(idx, file);
    input.value = '';
  };
  input.click();
}

function _bgPresetHandleFile(idx, file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    _bgPresetEnterPlaceMode(idx, c, file.name);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert(t('crop.loadFail'));
  };
  img.src = url;
}

function _bgPresetRefreshAllConversions() {
  if (!_bgPresetCurrent.detect) return;
  for (let i = 0; i < _bgPresetCurrent.slots.length; i++) {
    const slot = _bgPresetCurrent.slots[i];
    if (!slot.sourceCanvas) continue;
    const region = _bgPresetCurrent.detect.regions[i];
    const cropped = document.createElement('canvas');
    cropped.width = region.w;
    cropped.height = region.h;
    const cctx = cropped.getContext('2d');
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = 'high';
    const sw = slot.sourceCanvas.width;
    const sh = slot.sourceCanvas.height;
    const sc = slot.scale || Math.max(region.w / sw, region.h / sh);
    const dispW = sw * sc;
    const dispH = sh * sc;
    const dx = (region.w - dispW) / 2 + (slot.tx || 0);
    const dy = (region.h - dispH) / 2 + (slot.ty || 0);
    cctx.drawImage(slot.sourceCanvas, dx, dy, dispW, dispH);

    const aspect = region.w / region.h;
    let dotW, dotH;
    if (aspect >= 1) {
      dotW = _bgPresetCurrent.gridSize;
      dotH = Math.max(1, Math.round(_bgPresetCurrent.gridSize / aspect));
    } else {
      dotH = _bgPresetCurrent.gridSize;
      dotW = Math.max(1, Math.round(_bgPresetCurrent.gridSize * aspect));
    }
    const dot = document.createElement('canvas');
    dot.width = dotW;
    dot.height = dotH;
    const dctx = dot.getContext('2d');
    dctx.imageSmoothingEnabled = true;
    dctx.imageSmoothingQuality = 'high';
    dctx.drawImage(cropped, 0, 0, dotW, dotH);
    bgPresetConvertImage(dot, _bgPresetCurrent.dither);
    slot.convertedCanvas = dot;
  }
  _bgPresetRenderPreview();
}

function _bgPresetGenerate() {
  if (!_bgPresetCurrent.image || !_bgPresetCurrent.detect) return;
  if (_bgPresetCurrent.placing) _bgPresetCancelPlace();

  const hasAny = _bgPresetCurrent.slots.some(s => s.convertedCanvas);
  if (!hasAny) {
    alert(t('bg.noSlotsFilled'));
    return;
  }

  const out = bgPresetBuildComposite(
    _bgPresetCurrent.image,
    _bgPresetCurrent.detect,
    _bgPresetCurrent.slots
  );

  if (typeof finalizeImageLoad !== 'function') return;
  document.getElementById('bg-preset-section').classList.add('hidden');
  finalizeImageLoad(out, true);

  if (typeof convertImage === 'function') {
    try {
      convertedData = convertImage(out, out.width, out.height, out.width, false);
    } catch (_) {}
  }
  if (typeof setViewMode === 'function') {
    try { setViewMode('converted'); } catch (_) {}
  }
  if (typeof fitZoomToConverted === 'function') {
    try { fitZoomToConverted(); } catch (_) {}
  }
  if (typeof renderPixelCanvas === 'function') {
    try { renderPixelCanvas(); } catch (_) {}
  }
  if (typeof rebuildRecipe === 'function') {
    try { rebuildRecipe(); } catch (_) {}
  }
  if (typeof updateBrushStatus === 'function') {
    try { updateBrushStatus(); } catch (_) {}
  }
}

function attachBgPresetHandlers() {
  const openBtn = document.getElementById('bg-preset-mode-btn');
  if (openBtn) openBtn.addEventListener('click', openBgPresetMode);

  const backBtn = document.getElementById('bg-preset-back');
  if (backBtn) backBtn.addEventListener('click', closeBgPresetMode);

  const catSelect = document.getElementById('bg-category-select');
  if (catSelect) catSelect.addEventListener('change', e => _bgPresetFillPresets(e.target.value));

  const presetSelect = document.getElementById('bg-preset-select');
  if (presetSelect) presetSelect.addEventListener('change', e => _bgPresetSelectPreset(_bgPresetCurrent.catId, e.target.value));

  const gridSelect = document.getElementById('bg-preset-grid');
  if (gridSelect) {
    gridSelect.value = String(_bgPresetCurrent.gridSize);
    gridSelect.addEventListener('change', e => {
      _bgPresetCurrent.gridSize = parseInt(e.target.value, 10);
      _bgPresetRefreshAllConversions();
    });
  }

  const ditherToggle = document.getElementById('bg-preset-dither');
  if (ditherToggle) {
    ditherToggle.checked = _bgPresetCurrent.dither;
    ditherToggle.addEventListener('change', e => {
      _bgPresetCurrent.dither = !!e.target.checked;
      _bgPresetRefreshAllConversions();
    });
  }

  const genBtn = document.getElementById('bg-preset-generate');
  if (genBtn) genBtn.addEventListener('click', _bgPresetGenerate);

  const placeOk = document.getElementById('bg-place-confirm');
  if (placeOk) placeOk.addEventListener('click', _bgPresetConfirmPlace);
  const placeCancel = document.getElementById('bg-place-cancel');
  if (placeCancel) placeCancel.addEventListener('click', _bgPresetCancelPlace);
  const placeReset = document.getElementById('bg-place-reset');
  if (placeReset) placeReset.addEventListener('click', _bgPresetResetPlace);
  const placeZin = document.getElementById('bg-place-zoom-in');
  if (placeZin) placeZin.addEventListener('click', () => _bgPresetZoomPlace(1.2));
  const placeZout = document.getElementById('bg-place-zoom-out');
  if (placeZout) placeZout.addEventListener('click', () => _bgPresetZoomPlace(1 / 1.2));

  window.addEventListener('i18nchange', () => {
    if (_bgPresetCurrent.detect) {
      _bgPresetRenderSlots();
      _bgPresetUpdatePlaceToolbar();
    }
  });
}
