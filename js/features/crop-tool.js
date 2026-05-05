

var cropSrcCanvas = null;
var cropDispW = 0;
var cropDispH = 0;
var cropScale = 1;
var cropBox = { x: 0, y: 0, size: 0 };
var cropDrag = null;

const CROP_HANDLE_KEYS = ['nw', 'ne', 'sw', 'se'];

function openCropTool(srcCanvas) {
  cropSrcCanvas = srcCanvas;

  const minSide = Math.min(srcCanvas.width, srcCanvas.height);
  cropBox = {
    x: Math.floor((srcCanvas.width  - minSide) / 2),
    y: Math.floor((srcCanvas.height - minSide) / 2),
    size: minSide
  };

  document.getElementById('upload-section').classList.add('hidden');
  document.getElementById('crop-section').classList.remove('hidden');

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
  const bs = cropBox.size * cropScale;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, cropDispW, by);
  ctx.fillRect(0, by + bs, cropDispW, cropDispH - (by + bs));
  ctx.fillRect(0, by, bx, bs);
  ctx.fillRect(bx + bs, by, cropDispW - (bx + bs), bs);

  ctx.strokeStyle = '#E85A0C';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 1, by + 1, bs - 2, bs - 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bs - 1, bs - 1);

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    const gx = bx + bs * i / 3;
    const gy = by + bs * i / 3;
    ctx.beginPath();
    ctx.moveTo(gx, by);
    ctx.lineTo(gx, by + bs);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, gy);
    ctx.lineTo(bx + bs, gy);
    ctx.stroke();
  }

  const handleSize = 14;
  const corners = getHandlePositions(bx, by, bs);
  ctx.fillStyle = '#E85A0C';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  for (const [, [hx, hy]] of Object.entries(corners)) {
    ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  }
}

function getHandlePositions(bx, by, bs) {
  return {
    nw: [bx,      by],
    ne: [bx + bs, by],
    sw: [bx,      by + bs],
    se: [bx + bs, by + bs],
  };
}

function updateCropInfo() {
  const el = document.getElementById('crop-info');
  if (!el) return;
  el.textContent = `元画像 ${cropSrcCanvas.width}×${cropSrcCanvas.height}px → 切り出し ${cropBox.size}×${cropBox.size}px`;
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
  const bs = cropBox.size * cropScale;
  const handles = getHandlePositions(bx, by, bs);
  const tol = 18;
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
  const bs = cropBox.size * cropScale;
  return px >= bx && px <= bx + bs && py >= by && py <= by + bs;
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
    nx = Math.max(0, Math.min(sw - cropBox.size, nx));
    ny = Math.max(0, Math.min(sh - cropBox.size, ny));
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
  const oldX = startBox.x;
  const oldY = startBox.y;
  const oldS = startBox.size;
  const oldR = oldX + oldS;
  const oldB = oldY + oldS;

  let newX = oldX, newY = oldY, newS = oldS;




  let signX, signY, anchorX, anchorY;
  switch (handle) {
    case 'nw': signX = -1; signY = -1; anchorX = oldR; anchorY = oldB; break;
    case 'ne': signX =  1; signY = -1; anchorX = oldX; anchorY = oldB; break;
    case 'sw': signX = -1; signY =  1; anchorX = oldR; anchorY = oldY; break;
    case 'se': signX =  1; signY =  1; anchorX = oldX; anchorY = oldY; break;
  }

  const deltaX = signX * dx;
  const deltaY = signY * dy;
  const delta = Math.max(deltaX, deltaY);
  newS = Math.max(8, Math.round(oldS + delta));

  newX = (signX > 0) ? anchorX : anchorX - newS;
  newY = (signY > 0) ? anchorY : anchorY - newS;

  if (newX < 0) {
    const over = -newX;
    newX = 0;
    newS -= over;
    if (signY < 0) newY = anchorY - newS;
  }
  if (newY < 0) {
    const over = -newY;
    newY = 0;
    newS -= over;
    if (signX < 0) newX = anchorX - newS;
  }
  if (newX + newS > sw) {
    newS = sw - newX;
    if (signY < 0) newY = anchorY - newS;
  }
  if (newY + newS > sh) {
    newS = sh - newY;
    if (signX < 0) newX = anchorX - newS;
  }

  if (newS < 8) return;

  cropBox.x = Math.round(newX);
  cropBox.y = Math.round(newY);
  cropBox.size = Math.round(newS);
}

function applyCrop() {
  if (!cropSrcCanvas) return;

  const out = document.createElement('canvas');
  out.width  = cropBox.size;
  out.height = cropBox.size;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    cropSrcCanvas,
    cropBox.x, cropBox.y, cropBox.size, cropBox.size,
    0, 0, cropBox.size, cropBox.size
  );

  finalizeImageLoad(out, true);
}

function cancelCrop() {

  if (!cropSrcCanvas) return;
  finalizeImageLoad(cropSrcCanvas, false);
}

function resetCropBox() {
  if (!cropSrcCanvas) return;
  const minSide = Math.min(cropSrcCanvas.width, cropSrcCanvas.height);
  cropBox = {
    x: Math.floor((cropSrcCanvas.width  - minSide) / 2),
    y: Math.floor((cropSrcCanvas.height - minSide) / 2),
    size: minSide
  };
  drawCropCanvas();
  updateCropInfo();
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
    const minSide = Math.min(newW, newH);
    cropBox = {
      x: Math.floor((newW - minSide) / 2),
      y: Math.floor((newH - minSide) / 2),
      size: minSide
    };
  } else {
    cropBox.x = Math.max(0, Math.min(newW - cropBox.size, cropBox.x));
    cropBox.y = Math.max(0, Math.min(newH - cropBox.size, cropBox.y));
  }

  fitCropDisplay();
  drawCropCanvas();
  updateCropInfo();
}
