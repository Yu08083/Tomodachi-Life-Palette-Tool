
var cropSrcCanvas = null;
var cropDispW = 0;
var cropDispH = 0;
var cropScale = 1;
var cropDrag = null;

const CROP_HANDLE_KEYS = ['nw', 'ne', 'sw', 'se'];
const CROP_MIN_SHORT = 4;

function fitAspectRect(sw, sh, aw, ah) {
  const aspect = aw / ah;
  let w, h;
  if (sw / sh >= aspect) {
    h = sh;
    w = Math.round(h * aspect);
  } else {
    w = sw;
    h = Math.round(w / aspect);
  }
  if (w > sw) { w = sw; h = Math.round(w / aspect); }
  if (h > sh) { h = sh; w = Math.round(h * aspect); }
  return {
    x: Math.floor((sw - w) / 2),
    y: Math.floor((sh - h) / 2),
    w,
    h,
  };
}

function _cropAspectRatio() {
  const a = getCurrentCropAspect();
  return a.w / a.h;
}

function openCropTool(srcCanvas) {
  cropSrcCanvas = srcCanvas;

  cropAspectId = '1:1';
  const fit = fitAspectRect(srcCanvas.width, srcCanvas.height, 1, 1);
  cropBox = fit;

  document.getElementById('upload-section').classList.add('hidden');
  document.getElementById('crop-section').classList.remove('hidden');

  refreshCropAspectButtons();
  fitCropDisplay();
  drawCropCanvas();
  updateCropInfo();

  setTimeout(() => {
    document.getElementById('crop-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

function closeCropTool() {
  const section = document.getElementById('crop-section');
  if (section) section.classList.add('hidden');
}

function fitCropDisplay() {
  const wrap = document.getElementById('crop-canvas-wrap');
  if (!wrap || !cropSrcCanvas) return;

  const availW = Math.max(240, wrap.clientWidth - 4);
  const availH = Math.max(240, Math.floor(window.innerHeight * 0.55));

  const sw = cropSrcCanvas.width;
  const sh = cropSrcCanvas.height;
  const scaleW = availW / sw;
  const scaleH = availH / sh;
  cropScale = Math.min(scaleW, scaleH, 4);
  cropDispW = Math.round(sw * cropScale);
  cropDispH = Math.round(sh * cropScale);

  const c = document.getElementById('crop-canvas');
  if (c) {
    c.width  = cropDispW;
    c.height = cropDispH;
  }
}

function drawCropCanvas() {
  const c = document.getElementById('crop-canvas');
  if (!c || !cropSrcCanvas) return;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cropDispW, cropDispH);

  ctx.drawImage(cropSrcCanvas, 0, 0, cropDispW, cropDispH);

  const bx = cropBox.x * cropScale;
  const by = cropBox.y * cropScale;
  const bw = cropBox.w * cropScale;
  const bh = cropBox.h * cropScale;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, cropDispW, by);
  ctx.fillRect(0, by + bh, cropDispW, cropDispH - (by + bh));
  ctx.fillRect(0, by, bx, bh);
  ctx.fillRect(bx + bw, by, cropDispW - (bx + bw), bh);

  ctx.strokeStyle = '#E85A0C';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    const gx = bx + bw * i / 3;
    const gy = by + bh * i / 3;
    ctx.beginPath();
    ctx.moveTo(gx, by);
    ctx.lineTo(gx, by + bh);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, gy);
    ctx.lineTo(bx + bw, gy);
    ctx.stroke();
  }

  const isTouchDevice = (typeof window !== 'undefined' && window.matchMedia &&
                          window.matchMedia('(pointer: coarse)').matches);
  const handleSize = isTouchDevice ? 18 : 14;
  const corners = getHandlePositions(bx, by, bw, bh);
  ctx.fillStyle = '#E85A0C';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  for (const [, [hx, hy]] of Object.entries(corners)) {
    ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  }
}

function getHandlePositions(bx, by, bw, bh) {
  return {
    nw: [bx,        by],
    ne: [bx + bw,   by],
    sw: [bx,        by + bh],
    se: [bx + bw,   by + bh],
  };
}

function updateCropInfo() {
  const el = document.getElementById('crop-info');
  if (!el) return;
  el.textContent = t('crop.sizeInfo', {
    sw: cropSrcCanvas.width,
    sh: cropSrcCanvas.height,
    cw: cropBox.w,
    ch: cropBox.h
  });
}

function getCanvasPos(e) {
  const c = document.getElementById('crop-canvas');
  const rect = c.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

  const sx = cx * (c.width  / rect.width);
  const sy = cy * (c.height / rect.height);
  return { x: sx, y: sy };
}

function hitHandle(px, py) {
  const bx = cropBox.x * cropScale;
  const by = cropBox.y * cropScale;
  const bw = cropBox.w * cropScale;
  const bh = cropBox.h * cropScale;
  const handles = getHandlePositions(bx, by, bw, bh);
  const isTouchDevice = (typeof window !== 'undefined' && window.matchMedia &&
                          window.matchMedia('(pointer: coarse)').matches);
  const tol = isTouchDevice ? 26 : 18;
  for (const key of CROP_HANDLE_KEYS) {
    const [hx, hy] = handles[key];
    if (Math.abs(px - hx) <= tol && Math.abs(py - hy) <= tol) {
      return key;
    }
  }
  return null;
}

function hitInsideBox(px, py) {
  const bx = cropBox.x * cropScale;
  const by = cropBox.y * cropScale;
  const bw = cropBox.w * cropScale;
  const bh = cropBox.h * cropScale;
  return px >= bx && px <= bx + bw && py >= by && py <= by + bh;
}

function startCropDrag(e) {
  e.preventDefault();
  const { x, y } = getCanvasPos(e);
  const handle = hitHandle(x, y);
  if (handle) {
    cropDrag = {
      type: 'resize',
      handle,
      startX: x, startY: y,
      startBox: { ...cropBox }
    };
  } else if (hitInsideBox(x, y)) {
    cropDrag = {
      type: 'move',
      startX: x, startY: y,
      startBox: { ...cropBox }
    };
  } else {
    cropDrag = null;
  }
}

function moveCropDrag(e) {
  if (!cropDrag) return;
  e.preventDefault();
  const { x, y } = getCanvasPos(e);

  const dx = (x - cropDrag.startX) / cropScale;
  const dy = (y - cropDrag.startY) / cropScale;
  const sw = cropSrcCanvas.width;
  const sh = cropSrcCanvas.height;

  if (cropDrag.type === 'move') {
    let nx = cropDrag.startBox.x + dx;
    let ny = cropDrag.startBox.y + dy;
    nx = Math.max(0, Math.min(sw - cropBox.w, nx));
    ny = Math.max(0, Math.min(sh - cropBox.h, ny));
    cropBox.x = Math.round(nx);
    cropBox.y = Math.round(ny);
  } else if (cropDrag.type === 'resize') {
    resizeCropBox(cropDrag.handle, cropDrag.startBox, dx, dy, sw, sh);
  }

  drawCropCanvas();
  updateCropInfo();
}

function endCropDrag() {
  cropDrag = null;
}

function resizeCropBox(handle, startBox, dx, dy, sw, sh) {
  const aspect = _cropAspectRatio();
  const oldX = startBox.x;
  const oldY = startBox.y;
  const oldW = startBox.w;
  const oldH = startBox.h;
  const oldR = oldX + oldW;
  const oldB = oldY + oldH;

  let signX, signY, anchorX, anchorY;
  switch (handle) {
    case 'nw': signX = -1; signY = -1; anchorX = oldR; anchorY = oldB; break;
    case 'ne': signX =  1; signY = -1; anchorX = oldX; anchorY = oldB; break;
    case 'sw': signX = -1; signY =  1; anchorX = oldR; anchorY = oldY; break;
    case 'se': signX =  1; signY =  1; anchorX = oldX; anchorY = oldY; break;
  }

  const deltaWFromX = signX * dx;
  const deltaWFromY = signY * dy * aspect;
  const widthDelta  = Math.max(deltaWFromX, deltaWFromY);

  let newW = Math.round(oldW + widthDelta);
  let newH = Math.round(newW / aspect);

  const minW = Math.max(CROP_MIN_SHORT, Math.round(CROP_MIN_SHORT * aspect));
  const minH = Math.max(CROP_MIN_SHORT, Math.round(CROP_MIN_SHORT / aspect));
  if (newW < minW || newH < minH) {
    newW = Math.max(minW, Math.round(minH * aspect));
    newH = Math.max(minH, Math.round(newW / aspect));
  }

  let newX = (signX > 0) ? anchorX : anchorX - newW;
  let newY = (signY > 0) ? anchorY : anchorY - newH;

  if (newX < 0) {
    const over = -newX;
    newW -= over;
    newH = Math.round(newW / aspect);
    newX = 0;
    if (signY < 0) newY = anchorY - newH;
  }
  if (newY < 0) {
    const over = -newY;
    newH -= over;
    newW = Math.round(newH * aspect);
    newY = 0;
    if (signX < 0) newX = anchorX - newW;
  }
  if (newX + newW > sw) {
    newW = sw - newX;
    newH = Math.round(newW / aspect);
    if (signY < 0) newY = anchorY - newH;
  }
  if (newY + newH > sh) {
    newH = sh - newY;
    newW = Math.round(newH * aspect);
    if (signX < 0) newX = anchorX - newW;
  }

  if (newW < CROP_MIN_SHORT || newH < CROP_MIN_SHORT) return;

  cropBox.x = Math.round(newX);
  cropBox.y = Math.round(newY);
  cropBox.w = Math.round(newW);
  cropBox.h = Math.round(newH);
}

var _cropCallbackOnApply = null;
var _cropCallbackOnCancel = null;
var _cropPrevAspectId = null;

function openCropToolForCallback(srcCanvas, aspectW, aspectH, onApply, onCancel) {
  _cropCallbackOnApply  = onApply  || function(){};
  _cropCallbackOnCancel = onCancel || function(){};
  _cropPrevAspectId = cropAspectId;

  CROP_ASPECT_PRESETS['__region__'] = { id: '__region__', w: aspectW, h: aspectH, labelKey: '' };
  cropAspectId = '__region__';

  cropSrcCanvas = srcCanvas;
  cropBox = fitAspectRect(srcCanvas.width, srcCanvas.height, aspectW, aspectH);

  const sec = document.getElementById('crop-section');
  if (sec) sec.classList.remove('hidden');

  const aspectBar = document.querySelector('.crop-aspect-bar');
  if (aspectBar) aspectBar.style.display = 'none';

  fitCropDisplay();
  drawCropCanvas();
  updateCropInfo();

  setTimeout(() => {
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

function _cropExitCallback(applied, out) {
  const onApply  = _cropCallbackOnApply;
  const onCancel = _cropCallbackOnCancel;
  _cropCallbackOnApply  = null;
  _cropCallbackOnCancel = null;

  const aspectBar = document.querySelector('.crop-aspect-bar');
  if (aspectBar) aspectBar.style.display = '';
  if (_cropPrevAspectId) {
    cropAspectId = _cropPrevAspectId;
    _cropPrevAspectId = null;
  }
  delete CROP_ASPECT_PRESETS['__region__'];

  closeCropTool();

  if (applied) onApply(out);
  else onCancel();
}

function applyCrop() {
  if (!cropSrcCanvas) return;

  const out = document.createElement('canvas');
  out.width  = cropBox.w;
  out.height = cropBox.h;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    cropSrcCanvas,
    cropBox.x, cropBox.y, cropBox.w, cropBox.h,
    0, 0, cropBox.w, cropBox.h
  );

  if (_cropCallbackOnApply) {
    _cropExitCallback(true, out);
    return;
  }

  finalizeImageLoad(out, true);
}

function cancelCrop() {
  if (_cropCallbackOnApply || _cropCallbackOnCancel) {
    _cropExitCallback(false, null);
    return;
  }
  if (!cropSrcCanvas) return;
  finalizeImageLoad(cropSrcCanvas, false);
}

function resetCropBox() {
  if (!cropSrcCanvas) return;
  const a = getCurrentCropAspect();
  cropBox = fitAspectRect(cropSrcCanvas.width, cropSrcCanvas.height, a.w, a.h);
  drawCropCanvas();
  updateCropInfo();
}

function setCropAspect(aspectId) {
  if (!CROP_ASPECT_PRESETS[aspectId] || !cropSrcCanvas) return;
  cropAspectId = aspectId;
  const a = getCurrentCropAspect();
  cropBox = fitAspectRect(cropSrcCanvas.width, cropSrcCanvas.height, a.w, a.h);
  refreshCropAspectButtons();
  drawCropCanvas();
  updateCropInfo();
}

function refreshCropAspectButtons() {
  document.querySelectorAll('.crop-aspect-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.aspect === cropAspectId);
  });
}

function attachCropHandlers() {
  const c = document.getElementById('crop-canvas');
  if (!c) return;

  c.addEventListener('mousedown', startCropDrag);
  window.addEventListener('mousemove', moveCropDrag);
  window.addEventListener('mouseup', endCropDrag);

  c.addEventListener('touchstart', startCropDrag, { passive: false });
  window.addEventListener('touchmove', moveCropDrag, { passive: false });
  window.addEventListener('touchend', endCropDrag);
  window.addEventListener('touchcancel', endCropDrag);

  document.getElementById('crop-apply-btn').addEventListener('click', applyCrop);
  document.getElementById('crop-cancel-btn').addEventListener('click', cancelCrop);
  document.getElementById('crop-reset-btn').addEventListener('click', resetCropBox);

  document.querySelectorAll('.crop-aspect-btn').forEach(btn => {
    btn.addEventListener('click', () => setCropAspect(btn.dataset.aspect));
  });

  const flipHBtn = document.getElementById('crop-flip-h-btn');
  const flipVBtn = document.getElementById('crop-flip-v-btn');
  const rotBtn   = document.getElementById('crop-rotate-btn');
  if (flipHBtn) flipHBtn.addEventListener('click', () => transformCropSource('flipH'));
  if (flipVBtn) flipVBtn.addEventListener('click', () => transformCropSource('flipV'));
  if (rotBtn)   rotBtn.addEventListener('click',   () => transformCropSource('rotate'));

  let timer = null;
  window.addEventListener('resize', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (!document.getElementById('crop-section').classList.contains('hidden')) {
        fitCropDisplay();
        drawCropCanvas();
      }
    }, 150);
  });
}

function transformCropSource(action) {
  if (!cropSrcCanvas) return;
  const oldW = cropSrcCanvas.width;
  const oldH = cropSrcCanvas.height;

  let newW, newH;
  if (action === 'rotate') { newW = oldH; newH = oldW; }
  else                     { newW = oldW; newH = oldH; }

  const out = document.createElement('canvas');
  out.width  = newW;
  out.height = newH;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.save();
  if (action === 'flipH') {
    ctx.translate(newW, 0);
    ctx.scale(-1, 1);
  } else if (action === 'flipV') {
    ctx.translate(0, newH);
    ctx.scale(1, -1);
  } else if (action === 'rotate') {
    ctx.translate(newW, 0);
    ctx.rotate(Math.PI / 2);
  }
  ctx.drawImage(cropSrcCanvas, 0, 0);
  ctx.restore();

  cropSrcCanvas = out;
  rawSourceCanvas = out;

  if (action === 'rotate') {
    const a = getCurrentCropAspect();
    cropBox = fitAspectRect(newW, newH, a.w, a.h);
  } else {
    cropBox.x = Math.max(0, Math.min(newW - cropBox.w, cropBox.x));
    cropBox.y = Math.max(0, Math.min(newH - cropBox.h, cropBox.y));
  }

  fitCropDisplay();
  drawCropCanvas();
  updateCropInfo();
}
