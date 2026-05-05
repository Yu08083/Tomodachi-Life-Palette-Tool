

function setupCanvases() {
  renderPixelCanvas();
}

function renderPixelCanvas() {
  const src = getActiveData();
  if (!src) return;

  const w = src.width, h = src.height;
  pixelCanvas.width    = w * zoom;
  pixelCanvas.height   = h * zoom;
  overlayCanvas.width  = w * zoom;
  overlayCanvas.height = h * zoom;

  const ctx = pixelCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);

  ctx.drawImage(src.originalCanvas, 0, 0, w * zoom, h * zoom);

  if (zoom >= 2) {
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x++) {
      ctx.beginPath();
      ctx.moveTo(x * zoom, 0);
      ctx.lineTo(x * zoom, h * zoom);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * zoom);
      ctx.lineTo(w * zoom, y * zoom);
      ctx.stroke();
    }

    if (w >= 32 || h >= 32) {
      const step = (w >= 128 || h >= 128) ? 16 : 8;
      ctx.strokeStyle = 'rgba(232, 90, 12, 0.45)';
      ctx.lineWidth = Math.max(1, zoom * 0.18);
      for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x * zoom, 0);
        ctx.lineTo(x * zoom, h * zoom);
        ctx.stroke();
      }
      for (let y = step; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y * zoom);
        ctx.lineTo(w * zoom, y * zoom);
        ctx.stroke();
      }
    }
  }

  if (rulerEnabled) drawRuler(ctx, w, h);

  zoomLabel.textContent = zoom + '×';

  if (hoverPaletteIdx >= 0) {
    drawHighlight(hoverPaletteIdx);
  } else if (lastSelPx >= 0) {
    drawSelectionOverlay(lastSelPx, lastSelPy);
  }
}

function drawRuler(ctx, w, h) {
  ctx.save();

  const cx = w / 2;
  const cy = h / 2;

  ctx.strokeStyle = 'rgba(232, 90, 12, 0.85)';
  ctx.lineWidth = Math.max(1, zoom <= 2 ? 1 : 2);
  ctx.setLineDash([Math.max(3, zoom), Math.max(2, zoom * 0.5)]);
  ctx.beginPath();
  ctx.moveTo(cx * zoom, 0);
  ctx.lineTo(cx * zoom, h * zoom);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, cy * zoom);
  ctx.lineTo(w * zoom, cy * zoom);
  ctx.stroke();
  ctx.setLineDash([]);

  if (zoom >= 8) {
    const fs = Math.min(Math.floor(zoom * 0.55), 11);
    ctx.font = `bold ${fs}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let x = 0; x < w; x++) {
      const label = String(x + 1);
      const px = x * zoom + zoom / 2;
      const py = zoom / 2;
      const isCenter = (x === cx - 1 || x === cx);
      ctx.fillStyle = isCenter ? 'rgba(232, 90, 12, 0.9)' : 'rgba(255,255,255,0.75)';
      ctx.fillRect(px - fs * 0.55, py - fs * 0.65, fs * 1.1, fs * 1.3);
      ctx.fillStyle = isCenter ? '#fff' : '#333';
      ctx.fillText(label, px, py);
    }
    for (let y = 0; y < h; y++) {
      const label = String(y + 1);
      const px = zoom / 2;
      const py = y * zoom + zoom / 2;
      const isCenter = (y === cy - 1 || y === cy);
      ctx.fillStyle = isCenter ? 'rgba(232, 90, 12, 0.9)' : 'rgba(255,255,255,0.75)';
      ctx.fillRect(px - fs * 0.55, py - fs * 0.65, fs * 1.1, fs * 1.3);
      ctx.fillStyle = isCenter ? '#fff' : '#333';
      ctx.fillText(label, px, py);
    }
  } else if (zoom >= 4) {
    const px = cx * zoom;
    const py = cy * zoom;
    ctx.fillStyle = 'rgba(232, 90, 12, 0.95)';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', px, py);
  } else {
    const px = cx * zoom;
    const py = cy * zoom;
    ctx.fillStyle = 'rgba(232, 90, 12, 0.95)';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSelectionOverlay(px, py) {
  const ctx = overlayCanvas.getContext('2d');

  if (hoverPaletteIdx >= 0) return;

  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  ctx.strokeStyle = '#E85A0C';
  ctx.lineWidth = Math.max(2, zoom * 0.3);
  ctx.strokeRect(px * zoom, py * zoom, zoom, zoom);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px * zoom - 1, py * zoom - 1, zoom + 2, zoom + 2);
}

function toggleRuler() {
  rulerEnabled = !rulerEnabled;
  const btn = document.getElementById('ruler-btn');
  btn.classList.toggle('active', rulerEnabled);
  renderPixelCanvas();
}
