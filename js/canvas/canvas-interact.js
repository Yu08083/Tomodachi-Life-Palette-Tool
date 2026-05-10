

function pickPixelFromCoords(clientX, clientY) {
  const src = getActiveData();
  if (!src) return;
  const rect = pixelCanvas.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return;

  const ratioX = pixelCanvas.width  / rect.width;
  const ratioY = pixelCanvas.height / rect.height;
  const dxCss = clientX - rect.left;
  const dyCss = clientY - rect.top;
  const cx = dxCss * ratioX;
  const cy = dyCss * ratioY;

  let px = Math.floor(cx / zoom);
  let py = Math.floor(cy / zoom);

  if (px < 0) px = 0;
  if (py < 0) py = 0;
  if (px >= src.width)  px = src.width  - 1;
  if (py >= src.height) py = src.height - 1;

  const idx = (py * src.width + px) * 4;
  const r = src.data[idx];
  const g = src.data[idx + 1];
  const b = src.data[idx + 2];

  selectColor(r, g, b, px, py);
}

let _lastTouchPickAt = 0;

function handleCanvasClick(e) {
  if (interactionMode !== 'select') return;
  if (Date.now() - _lastTouchPickAt < 500) return;
  pickPixelFromCoords(e.clientX, e.clientY);
}

function handleCanvasTouchStart(e) {
  if (interactionMode !== 'select') return;
  if (!e.touches || e.touches.length !== 1) return;
  e.preventDefault();
  _lastTouchPickAt = Date.now();
  const t = e.touches[0];
  pickPixelFromCoords(t.clientX, t.clientY);
}

function attachCanvasInteractions() {
  pixelCanvas.addEventListener('click', handleCanvasClick);
  pixelCanvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
}

function canApplyZoom(nextZoom) {
  const src = getActiveData();
  if (!src) return false;
  if (src.width  * nextZoom > MAX_CANVAS_SIDE) return false;
  if (src.height * nextZoom > MAX_CANVAS_SIDE) return false;
  if (src.width  * nextZoom < MIN_CANVAS_SIDE) return false;
  if (src.height * nextZoom < MIN_CANVAS_SIDE) return false;
  return true;
}

function zoomInClick() {
  let idx = ZOOM_STEPS.indexOf(zoom);
  if (idx === -1) idx = ZOOM_STEPS.findIndex(z => z >= zoom) - 1;
  if (idx < 0) idx = 0;
  if (idx >= ZOOM_STEPS.length - 1) return;

  const nextZoom = ZOOM_STEPS[idx + 1];
  if (!canApplyZoom(nextZoom)) return;
  zoom = nextZoom;
  renderPixelCanvas();
}

function zoomOutClick() {
  let idx = ZOOM_STEPS.indexOf(zoom);
  if (idx === -1) idx = ZOOM_STEPS.findIndex(z => z >= zoom);
  if (idx <= 0) return;

  const nextZoom = ZOOM_STEPS[idx - 1];
  if (!canApplyZoom(nextZoom)) return;
  zoom = nextZoom;
  renderPixelCanvas();
}

function attachZoomControls() {
  zoomInBtn.addEventListener('click', zoomInClick);
  zoomOutBtn.addEventListener('click', zoomOutClick);
}

function setInteractionMode(mode) {
  interactionMode = mode;
  document.getElementById('mode-select-btn').classList.toggle('active', mode === 'select');
  document.getElementById('mode-move-btn').classList.toggle('active', mode === 'move');

  const wrapper = document.getElementById('canvas-wrapper');
  if (mode === 'move') wrapper.classList.add('move-mode');
  else                 wrapper.classList.remove('move-mode');
}
