
const SHARE_WORK_HASH_KEY = 'img';
const SHARE_WORK_MAX_BYTES = 8000;
const SHARE_WORK_FORMAT = 'spoito-cho-work';
const SHARE_WORK_VERSION = 1;
const SHARE_WORK_EXT = '.spoito.json';

function _shareEncodeImage(canvas) {
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1] || '';
  return base64;
}

function _shareBuildWorkUrl(canvas) {
  const base64 = _shareEncodeImage(canvas);
  const safe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (safe.length > SHARE_WORK_MAX_BYTES) {
    return { url: null, size: safe.length, tooLarge: true };
  }
  const base = location.origin + location.pathname;
  return {
    url: base + '#' + SHARE_WORK_HASH_KEY + '=' + safe,
    size: safe.length,
    tooLarge: false
  };
}

function _shareDecodeImageFromHash() {
  if (!location.hash || location.hash.length < 2) return null;
  const m = location.hash.substring(1).match(/(?:^|&)img=([^&]+)/);
  if (!m) return null;
  let safe = m[1];
  safe = safe.replace(/-/g, '+').replace(/_/g, '/');
  while (safe.length % 4) safe += '=';
  return 'data:image/png;base64,' + safe;
}

function _shareDrawQR(targetEl, text) {
  if (typeof qrcode === 'undefined') {
    targetEl.textContent = 'QR library not loaded';
    return;
  }
  let qr = null;
  for (let n = 4; n <= 40; n++) {
    try {
      const q = qrcode(n, 'M');
      q.addData(text);
      q.make();
      qr = q;
      break;
    } catch (e) {}
  }
  if (!qr) {
    targetEl.innerHTML = '<div class="share-qr-error" data-i18n="share.qrTooLarge">画像が大きすぎてQRに収まりません</div>';
    if (typeof applyTranslations === 'function') applyTranslations();
    return;
  }
  const moduleCount = qr.getModuleCount();
  const cellSize = Math.max(2, Math.floor(280 / moduleCount));
  const margin = cellSize * 4;
  const size = cellSize * moduleCount + margin * 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#1A0F05';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
      }
    }
  }
  targetEl.innerHTML = '';
  canvas.className = 'share-qr-canvas';
  canvas.alt = 'QR Code';
  targetEl.appendChild(canvas);
}

function _shareGetCanvas() {
  if (!imgData) return null;
  const src = (typeof getActiveData === 'function') ? getActiveData() : imgData;
  if (!src) return null;
  const tmp = document.createElement('canvas');
  tmp.width = src.width;
  tmp.height = src.height;
  const tctx = tmp.getContext('2d');
  const id = tctx.createImageData(src.width, src.height);
  id.data.set(src.data);
  tctx.putImageData(id, 0, 0);
  return tmp;
}

function shareWorkExportFile() {
  const canvas = _shareGetCanvas();
  if (!canvas) {
    alert(t('share.noImage'));
    return;
  }
  const base64 = _shareEncodeImage(canvas);
  const payload = {
    format: SHARE_WORK_FORMAT,
    version: SHARE_WORK_VERSION,
    savedAt: Date.now(),
    image: {
      width: canvas.width,
      height: canvas.height,
      data: base64
    }
  };
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = 'spoito_' + canvas.width + 'x' + canvas.height + '_' + stamp + SHARE_WORK_EXT;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  if (typeof _shareToast === 'function') _shareToast(t('share.fileExported'));
}

function shareWorkImportFile(file) {
  if (!file) return;
  const name = (file.name || '').toLowerCase();
  if (!name.endsWith('.json')) {
    alert(t('share.invalidFile'));
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const payload = JSON.parse(e.target.result);
      if (payload.format !== SHARE_WORK_FORMAT) {
        alert(t('share.invalidFile'));
        return;
      }
      const dataUrl = 'data:image/png;base64,' + payload.image.data;
      const img = new Image();
      img.onload = () => {
        if (typeof loadImageFromImg === 'function') {
          loadImageFromImg(img);
          closeModal('modal-share-work');
        }
      };
      img.onerror = () => alert(t('share.invalidFile'));
      img.src = dataUrl;
    } catch (err) {
      alert(t('share.invalidFile'));
    }
  };
  reader.onerror = () => alert(t('share.invalidFile'));
  reader.readAsText(file);
}

function openShareWorkModal() {
  const canvas = _shareGetCanvas();
  if (!canvas) {
    alert(t('share.noImage'));
    return;
  }

  const result = _shareBuildWorkUrl(canvas);
  const qrTarget = document.getElementById('share-work-qr');
  const urlBox   = document.getElementById('share-work-url');
  const sizeEl   = document.getElementById('share-work-size');
  const sizeTlEl = document.getElementById('share-work-size-tl');
  const tooLargeEl = document.getElementById('share-work-too-large');
  const contentEl  = document.getElementById('share-work-content');
  const sizeText = (result.size / 1024).toFixed(1) + ' KB';

  if (result.tooLarge) {
    if (tooLargeEl) tooLargeEl.classList.remove('hidden');
    if (contentEl) contentEl.classList.add('hidden');
    if (sizeTlEl) sizeTlEl.textContent = sizeText;
  } else {
    if (tooLargeEl) tooLargeEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');
    if (sizeEl) sizeEl.textContent = sizeText;
    if (urlBox) urlBox.value = result.url;
    if (qrTarget) _shareDrawQR(qrTarget, result.url);
  }

  openModal('modal-share-work');
}

async function shareWorkCopyUrl() {
  const urlBox = document.getElementById('share-work-url');
  if (!urlBox) return;
  const url = urlBox.value;
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      ok = true;
    }
  } catch (e) {}
  if (!ok) {
    urlBox.select();
    try { ok = document.execCommand('copy'); } catch (e) {}
  }
  if (ok && typeof _shareToast === 'function') _shareToast(t('share.copied'));
}

function shareWorkRestoreFromHash() {
  const dataUrl = _shareDecodeImageFromHash();
  if (!dataUrl) return false;
  const img = new Image();
  img.onload = () => {
    if (typeof loadImageFromImg === 'function') {
      loadImageFromImg(img);
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch (e) {}
    }
  };
  img.onerror = () => {};
  img.src = dataUrl;
  return true;
}

function attachShareWorkControls() {
  const btn = document.getElementById('share-work-btn');
  if (btn) btn.addEventListener('click', openShareWorkModal);

  const copyBtn = document.getElementById('share-work-copy-btn');
  if (copyBtn) copyBtn.addEventListener('click', shareWorkCopyUrl);

  const exportBtn = document.getElementById('share-work-export-btn');
  if (exportBtn) exportBtn.addEventListener('click', shareWorkExportFile);

  const exportTlBtn = document.getElementById('share-work-export-tl-btn');
  if (exportTlBtn) exportTlBtn.addEventListener('click', shareWorkExportFile);

  const importBtn = document.getElementById('share-work-import-btn');
  const importInput = document.getElementById('share-work-import-input');
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) shareWorkImportFile(file);
      importInput.value = '';
    });
  }

  setTimeout(shareWorkRestoreFromHash, 100);
}
