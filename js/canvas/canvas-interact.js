

function pickPixelFromCoords(clientX, clientY) {
  const src = getActiveData();
  if (!src) return;
  const rect = pixelCanvas.getBoundingClientRect();
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;

  const px = Math.floor(cx / zoom);
  const py = Math.floor(cy / zoom);
  if (px < 0 || py < 0 || px >= src.width || py >= src.height) return;

  const idx = (py * src.width + px) * 4;
  const r = src.data[idx];
  const g = src.data[idx + 1];
  const b = src.data[idx + 2];
  const a = src.data[idx + 3];
  if (a < 10) return;

  selectColor(r, g, b, px, py);
}

function handleCanvasClick(e) {
  if (interactionMode !== 'select') return;
  pickPixelFromCoords(e.clientX, e.clientY);
}

function handleCanvasTouchStart(e) {
  if (interactionMode !== 'select') return;
  if (!e.touches || e.touches.length !== 1) return;
  e.preventDefault();
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
  zoom = ZOOM_STEPS[idx - 1];
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
