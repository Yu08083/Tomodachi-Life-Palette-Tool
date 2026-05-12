
var _enhanceState = { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 };
var _enhanceRafPending = false;

function enhanceGetFilterString() {
  const s = _enhanceState;
  if (s.brightness === 0 && s.contrast === 0 && s.saturation === 0) return 'none';
  return 'brightness(' + (100 + s.brightness) + '%) contrast(' + (100 + s.contrast) + '%) saturate(' + (100 + s.saturation) + '%)';
}

function enhanceIsActive() {
  const s = _enhanceState;
  return s.brightness !== 0 || s.contrast !== 0 || s.saturation !== 0 || s.sharpness > 0;
}

function enhanceBakeToCanvas(canvas) {
  if (!canvas || !enhanceIsActive()) return canvas;
  const w = canvas.width, h = canvas.height;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  src.getContext('2d').drawImage(canvas, 0, 0);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.filter = enhanceGetFilterString();
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0);
  ctx.restore();
  if (_enhanceState.sharpness > 0) {
    _enhanceSharpenInPlace(canvas, _enhanceState.sharpness / 100);
  }
  return canvas;
}

function enhanceBakeCopy(srcCanvas) {
  if (!srcCanvas) return null;
  const w = srcCanvas.width, h = srcCanvas.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (enhanceIsActive()) {
    ctx.save();
    ctx.filter = enhanceGetFilterString();
    ctx.drawImage(srcCanvas, 0, 0);
    ctx.restore();
    if (_enhanceState.sharpness > 0) {
      _enhanceSharpenInPlace(out, _enhanceState.sharpness / 100);
    }
  } else {
    ctx.drawImage(srcCanvas, 0, 0);
  }
  return out;
}

function _enhanceSharpenInPlace(canvas, amount) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  let src;
  try { src = ctx.getImageData(0, 0, w, h); } catch (_) { return; }
  const sd = src.data;
  const out = ctx.createImageData(w, h);
  const od = out.data;
  const k = amount;
  const center = 1 + 4 * k;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        od[idx] = sd[idx]; od[idx+1] = sd[idx+1]; od[idx+2] = sd[idx+2]; od[idx+3] = sd[idx+3];
        continue;
      }
      for (let cc = 0; cc < 3; cc++) {
        const v = center * sd[idx + cc]
                - k * sd[idx + cc - 4]
                - k * sd[idx + cc + 4]
                - k * sd[idx + cc - w * 4]
                - k * sd[idx + cc + w * 4];
        od[idx + cc] = v < 0 ? 0 : (v > 255 ? 255 : v);
      }
      od[idx + 3] = sd[idx + 3];
    }
  }
  ctx.putImageData(out, 0, 0);
}

function _enhanceReset() {
  _enhanceState = { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 };
  const ids = ['enh-brightness', 'enh-contrast', 'enh-saturation', 'enh-sharpness'];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.value = '0';
    const out = document.getElementById(id + '-val');
    if (out) out.textContent = '0';
  }
  _enhanceTriggerRedraw();
}

function _enhanceTriggerRedraw() {
  if (typeof drawCropCanvas === 'function') drawCropCanvas();
}

function _enhanceScheduleApply() {
  if (_enhanceRafPending) return;
  _enhanceRafPending = true;
  requestAnimationFrame(() => {
    _enhanceRafPending = false;
    _enhanceTriggerRedraw();
  });
}

function _enhanceOnSlider(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  const out = document.getElementById(id + '-val');
  const handler = () => {
    const n = parseInt(el.value, 10);
    _enhanceState[key] = isNaN(n) ? 0 : n;
    if (out) out.textContent = el.value;
    _enhanceScheduleApply();
  };
  el.addEventListener('input', handler);
  el.addEventListener('change', handler);
}

function enhanceOnCropOpen() {
  _enhanceReset();
}

function attachEnhanceHandlers() {
  _enhanceOnSlider('enh-brightness', 'brightness');
  _enhanceOnSlider('enh-contrast',   'contrast');
  _enhanceOnSlider('enh-saturation', 'saturation');
  _enhanceOnSlider('enh-sharpness',  'sharpness');

  const resetBtn = document.getElementById('enh-reset');
  if (resetBtn) resetBtn.addEventListener('click', _enhanceReset);

  const toggleBtn = document.getElementById('enh-toggle');
  const panel = document.getElementById('enh-panel');
  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('hidden');
      toggleBtn.classList.toggle('open');
    });
  }
}
