
let tlRecorder = null;
let tlStream = null;
let tlChunks = [];
let tlStartTime = 0;
let tlInterval = null;

function toggleTimelapse() {
  if (tlRecorder) stopTimelapse();
  else            startTimelapse();
}

function startTimelapse() {
  if (typeof pixelCanvas === 'undefined' || !pixelCanvas) return;
  if (typeof MediaRecorder === 'undefined') {
    alert((typeof t === 'function') ? t('view.tlUnsupported') : 'Recording is not supported in this browser.');
    return;
  }

  let mime = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm;codecs=vp8';
  if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
  if (!MediaRecorder.isTypeSupported(mime)) {
    alert((typeof t === 'function') ? t('view.tlUnsupported') : 'WebM recording is not supported in this browser.');
    return;
  }

  try {
    tlStream = pixelCanvas.captureStream(15);
  } catch (e) {
    alert((typeof t === 'function') ? t('view.tlUnsupported') : 'Cannot capture canvas.');
    return;
  }

  tlChunks = [];
  try {
    tlRecorder = new MediaRecorder(tlStream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  } catch (e) {
    tlStream.getTracks().forEach(t => t.stop());
    tlStream = null;
    alert((typeof t === 'function') ? t('view.tlUnsupported') : 'MediaRecorder failed.');
    return;
  }

  tlRecorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) tlChunks.push(ev.data); };
  tlRecorder.onstop = () => {
    const blob = new Blob(tlChunks, { type: 'video/webm' });
    if (blob.size === 0) {
      alert((typeof t === 'function') ? t('view.tlEmpty') : 'Recording was empty. Try again.');
      tlChunks = [];
      tlRecorder = null;
      if (tlStream) { tlStream.getTracks().forEach(t => t.stop()); tlStream = null; }
      _updateTimelapseButtonState();
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spoito-timelapse-${_tlTimestamp()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    tlChunks = [];
    tlRecorder = null;
    if (tlStream) {
      tlStream.getTracks().forEach(t => t.stop());
      tlStream = null;
    }
    _updateTimelapseButtonState();
  };

  try {
    tlRecorder.start();
  } catch (e) {
    tlRecorder = null;
    if (tlStream) { tlStream.getTracks().forEach(t => t.stop()); tlStream = null; }
    alert((typeof t === 'function') ? t('view.tlUnsupported') : 'Recording failed.');
    return;
  }

  if (typeof renderPixelCanvas === 'function') {
    try { renderPixelCanvas(); } catch (_) {}
  }

  tlStartTime = Date.now();
  if (tlInterval) clearInterval(tlInterval);
  tlInterval = setInterval(_updateTimelapseElapsed, 500);
  _updateTimelapseButtonState();
}

function stopTimelapse() {
  if (!tlRecorder) return;
  if (tlInterval) { clearInterval(tlInterval); tlInterval = null; }
  try { tlRecorder.stop(); } catch (e) {}
}

function _updateTimelapseElapsed() {
  if (!tlRecorder) return;
  const elapsed = Math.floor((Date.now() - tlStartTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const el = document.getElementById('tl-elapsed');
  if (el) el.textContent = `${m}:${String(s).padStart(2, '0')}`;
}

function _updateTimelapseButtonState() {
  const recording = !!tlRecorder;
  const btn = document.getElementById('timelapse-btn');
  if (btn) {
    btn.classList.toggle('recording', recording);
    const key = recording ? 'view.tlStop' : 'view.tlStart';
    const txt = (typeof t === 'function') ? t(key) : '';
    if (txt) btn.textContent = txt;
    btn.setAttribute('data-i18n', key);
  }
  const el = document.getElementById('tl-elapsed');
  if (el) {
    el.classList.toggle('hidden', !recording);
    if (!recording) el.textContent = '';
  }
}

function _tlTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
