
var _cameraStream = null;
var _cameraFacing = 'environment';

async function openCameraModal() {
  const modal = document.getElementById('camera-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  try {
    await _cameraStartStream();
  } catch (e) {
    console.warn('[camera] start failed:', e);
    alert(t('camera.notAvailable'));
    closeCameraModal();
  }
}

function closeCameraModal() {
  _cameraStopStream();
  const modal = document.getElementById('camera-modal');
  if (modal) modal.classList.add('hidden');
}

async function _cameraStartStream() {
  _cameraStopStream();
  const constraints = {
    audio: false,
    video: { facingMode: { ideal: _cameraFacing }, width: { ideal: 1920 }, height: { ideal: 1920 } }
  };
  _cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
  const video = document.getElementById('camera-video');
  if (video) {
    video.srcObject = _cameraStream;
    video.playsInline = true;
    await video.play().catch(() => {});
  }
}

function _cameraStopStream() {
  if (_cameraStream) {
    try { _cameraStream.getTracks().forEach(t => t.stop()); } catch (_) {}
    _cameraStream = null;
  }
  const video = document.getElementById('camera-video');
  if (video) video.srcObject = null;
}

async function _cameraFlip() {
  _cameraFacing = _cameraFacing === 'environment' ? 'user' : 'environment';
  try {
    await _cameraStartStream();
  } catch (e) {
    console.warn('[camera] flip failed:', e);
    _cameraFacing = _cameraFacing === 'environment' ? 'user' : 'environment';
    try { await _cameraStartStream(); } catch (_) {}
  }
}

function _cameraCapture() {
  const video = document.getElementById('camera-video');
  if (!video || !video.videoWidth) return;
  const w = video.videoWidth;
  const h = video.videoHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (_cameraFacing === 'user') {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);

  closeCameraModal();
  if (typeof openCropTool === 'function') {
    const scaled = (typeof _downscaleIfTooBig === 'function') ? _downscaleIfTooBig(c) : c;
    rawSourceCanvas = scaled;
    document.getElementById('upload-section').classList.add('hidden');
    openCropTool(scaled);
  }
}

function attachCameraHandlers() {
  const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const btn = document.getElementById('camera-btn');
  if (!supported) {
    if (btn) btn.style.display = 'none';
    return;
  }
  if (btn) btn.addEventListener('click', openCameraModal);

  const cap = document.getElementById('camera-capture');
  if (cap) cap.addEventListener('click', _cameraCapture);
  const flip = document.getElementById('camera-flip');
  if (flip) flip.addEventListener('click', _cameraFlip);
  const close = document.getElementById('camera-close');
  if (close) close.addEventListener('click', closeCameraModal);
}
