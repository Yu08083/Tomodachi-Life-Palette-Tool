
function attachUploadHandlers() {

  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => _handleUploadedFile(e.target.files[0]));

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    _handleUploadedFile(file);
  });

  if (demoBtn) {
    demoBtn.addEventListener('click', loadDemoImage);
  }

  function _resetToUpload() {
    uploadSec.classList.remove('hidden');
    mainContent.classList.add('hidden');
    const bgSec = document.getElementById('bg-preset-section');
    if (bgSec) bgSec.classList.add('hidden');
    closeCropTool();
    imgData = null;
    convertedData = null;
    rawSourceCanvas = null;
    viewMode = 'original';
    fileInput.value = '';
    noSelectMsg.classList.remove('hidden');
    colorInfo.classList.add('hidden');
    hoverPaletteIdx = -1;
    lastSelPx = -1;
    lastSelPy = -1;
    if (typeof pixelEditorDeactivate === 'function') {
      try { pixelEditorDeactivate(); } catch (_) {}
    }
    if (typeof pixelEditorClearHistory === 'function') {
      try { pixelEditorClearHistory(); } catch (_) {}
    }
    rebuildRecipe();
    const mobBar = document.getElementById('mobile-color-bar');
    if (mobBar) mobBar.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetBtn.addEventListener('click', _resetToUpload);

  const backBtn = document.getElementById('back-to-upload-btn');
  if (backBtn) backBtn.addEventListener('click', _resetToUpload);

  const recropBtn = document.getElementById('recrop-btn');
  if (recropBtn) {
    recropBtn.addEventListener('click', () => {
      if (!rawSourceCanvas) return;
      mainContent.classList.add('hidden');
      openCropTool(rawSourceCanvas);
    });
  }
}

function _handleUploadedFile(file) {
  if (!file) return;
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.json')) {
    if (typeof shareWorkImportFile === 'function') {
      shareWorkImportFile(file);
    }
    return;
  }
  if (file.type && file.type.startsWith('image/')) {
    loadImageFile(file);
  }
}

const MAX_UPLOAD_SIDE = 1600;

function _downscaleIfTooBig(srcCanvas) {
  if (!srcCanvas) return srcCanvas;
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const max = Math.max(w, h);
  if (max <= MAX_UPLOAD_SIDE) return srcCanvas;
  const s = MAX_UPLOAD_SIDE / max;
  const nw = Math.round(w * s);
  const nh = Math.round(h * s);
  const out = document.createElement('canvas');
  out.width = nw;
  out.height = nh;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(srcCanvas, 0, 0, nw, nh);
  return out;
}

function _fitZoomToOriginalView(w, h) {
  if (w <= 16 && h <= 16) return 16;
  if (w <= 32 && h <= 32) return 8;
  if (w <= 64 && h <= 64) return 4;
  if (w <= 128 && h <= 128) return 2;
  const wrap = document.getElementById('canvas-wrapper');
  if (!wrap) return 1;
  const avail = Math.max(240, (wrap.clientWidth || 600) - 40);
  if (w <= avail && h <= avail) return 1;
  const fit = Math.min(avail / w, avail / h);
  if (fit >= 0.75) return 1;
  if (fit >= 0.5)  return 0.5;
  return 0.25;
}

function loadImageFile(file) {
  if (!file) return;

  const url = URL.createObjectURL(file);
  const img = new Image();

img.onload = () => {
    const tmp = document.createElement('canvas');
    tmp.width  = img.width;
    tmp.height = img.height;
    const ctx = tmp.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    URL.revokeObjectURL(url);

    const scaled = _downscaleIfTooBig(tmp);
    rawSourceCanvas = scaled;

    openCropTool(scaled);
  };

  img.onerror = () => {
    alert(t('crop.loadFail'));
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

function finalizeImageLoad(canvas, isCropped) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  imgData = {
    width: w,
    height: h,
    data: ctx.getImageData(0, 0, w, h).data,
    originalCanvas: canvas,
    cropped: isCropped
  };

  convertedData = null;
  viewMode = 'original';
  if (typeof isolateEnabled !== 'undefined') {
    isolateEnabled = false;
    isolateTargetIdx = -1;
  }
  if (typeof _updateIsolateButtonState === 'function') _updateIsolateButtonState();
  if (typeof _updateDoneButtonState === 'function') _updateDoneButtonState();
  document.getElementById('view-original-btn').classList.add('active');
  document.getElementById('view-converted-btn').classList.remove('active');
  document.getElementById('convert-controls').classList.remove('hidden');
  const dlBtnInit = document.getElementById('download-btn');
  if (dlBtnInit) {
    dlBtnInit.classList.remove('hidden');
    dlBtnInit.setAttribute('data-i18n-html', 'view.saveOriginal');
    if (typeof t === 'function') dlBtnInit.innerHTML = t('view.saveOriginal');
  }
  const dlPbnInit = document.getElementById('download-pbn-btn');
  if (dlPbnInit) {
    dlPbnInit.classList.remove('hidden');
    dlPbnInit.setAttribute('data-i18n-html', 'view.savePosterized');
    if (typeof t === 'function') dlPbnInit.innerHTML = t('view.savePosterized');
  }

  if (typeof _fitZoomToOriginalView === 'function') {
    zoom = _fitZoomToOriginalView(w, h);
  } else if (w <= 16 && h <= 16)        zoom = 16;
  else if (w <= 32 && h <= 32)   zoom = 8;
  else if (w <= 64 && h <= 64)   zoom = 4;
  else if (w <= 128 && h <= 128) zoom = 2;
  else                           zoom = 1;

  if (typeof _zoomPerMode === 'object' && _zoomPerMode) {
    _zoomPerMode.original = null;
    _zoomPerMode.converted = null;
  }

  updateImgInfo();
  setupCanvases();
  buildPaletteGrid();
  if (typeof rebuildConvertedData === 'function') rebuildConvertedData();
  else rebuildRecipe();

  lastSelPx = -1;
  lastSelPy = -1;
  hoverPaletteIdx = -1;
  noSelectMsg.classList.remove('hidden');
  colorInfo.classList.add('hidden');
  const pill = document.getElementById('canvas-selection-pill');
  if (pill) pill.classList.add('hidden');

  uploadSec.classList.add('hidden');
  closeCropTool();
  mainContent.classList.remove('hidden');

  const recropBtn = document.getElementById('recrop-btn');
  if (recropBtn) {
    recropBtn.classList.toggle('hidden', !rawSourceCanvas);
  }

  setTimeout(() => {
    mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);

  if (typeof historyAdd === 'function' && !window._historyRestoreInProgress) {
    historyAdd(canvas, w, h);
  }
}

function loadImageFromImg(img) {
  window._historyRestoreInProgress = true;
  const tmp = document.createElement('canvas');
  tmp.width  = img.naturalWidth || img.width;
  tmp.height = img.naturalHeight || img.height;
  const ctx = tmp.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  rawSourceCanvas = tmp;
  if (tmp.width === tmp.height) {
    finalizeImageLoad(tmp, false);
  } else {
    openCropTool(tmp);
  }
  setTimeout(() => { window._historyRestoreInProgress = false; }, 100);
}

function generateDemoCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 16, 16);

  const COLORS = {
    'Y': '#FFD43A', 'O': '#E08800',
    'B': '#3A2A1F', 'R': '#FF6B7A', 'M': '#D63333'
  };

  const PATTERN = [
    '....OOOOOOOO....',
    '..OOYYYYYYYYOO..',
    '.OYYYYYYYYYYYYO.',
    '.OYYYYYYYYYYYYO.',
    'OYYYBBYYYYBBYYYO',
    'OYYYBBYYYYBBYYYO',
    'OYYYYYYYYYYYYYYO',
    'OYRRYYYYYYYYRRYO',
    'OYRRYYYYYYYYRRYO',
    'OYYYYYMYYMYYYYYO',
    'OYYYYYMMMMYYYYYO',
    'OYYYYYYMMYYYYYYO',
    '.OYYYYYYYYYYYYO.',
    '.OYYYYYYYYYYYYO.',
    '..OOYYYYYYYYOO..',
    '....OOOOOOOO....',
  ];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = PATTERN[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = COLORS[ch] || '#FF00FF';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function loadDemoImage() {
  const canvas = generateDemoCanvas();
  canvas.toBlob(blob => {
    if (!blob) {
      alert(t('crop.demoFail'));
      return;
    }
    loadImageFile(blob);
  }, 'image/png');
}

function parseHexInput(s) {
  if (!s) return null;
  let h = s.trim().replace(/^#/, '').toLowerCase();
  if (!/^[0-9a-f]+$/.test(h)) return null;

  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  if (h.length !== 6) return null;

  const v = parseInt(h, 16);
  return {
    r: (v >> 16) & 255,
    g: (v >> 8) & 255,
    b: v & 255
  };
}

function _parsePaletteNumberInput(s) {
  if (!s) return null;
  const trimmed = String(s).trim().replace(/^[#№]+/, '');
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  const n = parseInt(trimmed, 10);
  if (n < 1 || n > PALETTE.length) return null;
  const p = PALETTE[n - 1];
  if (!p) return null;
  return hexToRgb(p.h);
}

function attachHexInput() {
  const input = document.getElementById('hex-input');
  const btn   = document.getElementById('hex-input-btn');
  if (!input || !btn) return;

  const submit = () => {
    let rgb = _parsePaletteNumberInput(input.value);
    if (!rgb) rgb = parseHexInput(input.value);
    if (!rgb) {
      input.classList.add('error');
      setTimeout(() => input.classList.remove('error'), 800);
      return;
    }
    input.classList.remove('error');
    selectColor(rgb.r, rgb.g, rgb.b, -1, -1);
  };

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') submit();
  });
}
