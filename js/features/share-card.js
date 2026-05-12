
var _shareCardCurrentCanvas = null;

function _shareCardResolveData(explicit) {
  if (explicit) return explicit;
  if (typeof convertedData !== 'undefined' && convertedData) return convertedData;
  return null;
}

function _shareCardGetStats(explicitData) {
  const data = _shareCardResolveData(explicitData);
  let pxTotal = 0, colors = 0, diff = null, dotW = 0, dotH = 0;
  if (!data) return { pxTotal, colors, diff, dotW, dotH };
  try {
    if (data.paletteMap) {
      dotW = data.width || 0;
      dotH = data.height || 0;
      const map = data.paletteMap;
      const set = new Set();
      for (let i = 0; i < map.length; i++) {
        const v = map[i];
        if (v >= 0) { pxTotal++; set.add(v); }
      }
      colors = set.size;
    } else if (data.originalCanvas) {
      dotW = data.width || data.originalCanvas.width;
      dotH = data.height || data.originalCanvas.height;
    }
  } catch (_) {}
  if (!explicitData) {
    try {
      if (typeof computeDifficultyScore === 'function') {
        const d = computeDifficultyScore();
        if (d && typeof d.score === 'number') diff = Math.round(d.score);
      } else if (typeof computeDifficulty === 'function') {
        const d = computeDifficulty();
        if (d && typeof d.score === 'number') diff = Math.round(d.score);
      }
    } catch (_) {}
  } else if (typeof computeDifficultyFromData === 'function') {
    try {
      const d = computeDifficultyFromData(explicitData);
      if (d && typeof d.score === 'number') diff = Math.round(d.score);
    } catch (_) {}
  }
  return { pxTotal, colors, diff, dotW, dotH };
}

function _shareCardGetSourceCanvas(explicitData) {
  const data = _shareCardResolveData(explicitData);
  if (!data) {
    if (typeof imgData !== 'undefined' && imgData && imgData.originalCanvas) return imgData.originalCanvas;
    return null;
  }
  if (data.originalCanvas && data.originalCanvas.width > 0) return data.originalCanvas;
  if (data.paletteMap && data.data) {
    const w = data.width, h = data.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    img.data.set(data.data);
    ctx.putImageData(img, 0, 0);
    return c;
  }
  return null;
}

async function _shareCardBuild(explicitData) {
  const SIZE = 1080;
  const card = document.createElement('canvas');
  card.width = SIZE;
  card.height = SIZE;
  const ctx = card.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, '#FFF6E8');
  grad.addColorStop(1, '#FFE3C6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = '#FFB155';
  ctx.lineWidth = 6;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(28, 28, SIZE - 56, SIZE - 56);
  ctx.setLineDash([]);

  ctx.fillStyle = '#E85A0C';
  ctx.beginPath();
  ctx.arc(105, 105, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#E85A0C';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '700 28px "Noto Sans JP", sans-serif';
  ctx.fillText('SPOITO-CHO', 130, 92);
  ctx.fillStyle = '#3A1F0A';
  ctx.font = '800 44px "Noto Sans JP", sans-serif';
  ctx.fillText('すぽいと帳', 130, 130);

  const src = _shareCardGetSourceCanvas(explicitData);
  const artArea = { x: 100, y: 200, w: SIZE - 200, h: SIZE - 460 };
  ctx.fillStyle = '#FFFFFF';
  _roundRect(ctx, artArea.x, artArea.y, artArea.w, artArea.h, 24);
  ctx.fill();
  ctx.strokeStyle = '#F4C9A0';
  ctx.lineWidth = 3;
  _roundRect(ctx, artArea.x, artArea.y, artArea.w, artArea.h, 24);
  ctx.stroke();

  if (src) {
    const pad = 30;
    const innerW = artArea.w - pad * 2;
    const innerH = artArea.h - pad * 2;
    const s = Math.min(innerW / src.width, innerH / src.height);
    const dW = Math.round(src.width * s);
    const dH = Math.round(src.height * s);
    const dX = Math.round(artArea.x + (artArea.w - dW) / 2);
    const dY = Math.round(artArea.y + (artArea.h - dH) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, dX, dY, dW, dH);
  } else {
    ctx.fillStyle = '#C19A6B';
    ctx.font = '600 32px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('shareCard.noArt'), artArea.x + artArea.w / 2, artArea.y + artArea.h / 2);
  }

  const stats = _shareCardGetStats(explicitData);
  const statsY = SIZE - 220;
  const statsH = 110;
  const statsX = 70;
  const statsW = SIZE - 140;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  _roundRect(ctx, statsX, statsY, statsW, statsH, 18);
  ctx.fill();

  const items = [];
  if (stats.dotW && stats.dotH) items.push({ label: t('shareCard.size'),   value: `${stats.dotW}×${stats.dotH}` });
  if (stats.pxTotal)            items.push({ label: t('shareCard.pixels'), value: stats.pxTotal.toLocaleString() });
  if (stats.colors)             items.push({ label: t('shareCard.colors'), value: `${stats.colors} ${t('shareCard.colorsUnit')}` });
  if (stats.diff != null)       items.push({ label: t('shareCard.diff'),   value: String(stats.diff) });

  const cellW = statsW / Math.max(1, items.length);
  ctx.textAlign = 'center';
  for (let i = 0; i < items.length; i++) {
    const cx = statsX + cellW * (i + 0.5);
    ctx.fillStyle = '#9A6A3C';
    ctx.font = '600 20px "Noto Sans JP", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(items[i].label, cx, statsY + 22);

    ctx.fillStyle = '#3A1F0A';
    ctx.font = '800 36px "Noto Sans JP", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(items[i].value, cx, statsY + 52);
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;
  ctx.fillStyle = '#9A6A3C';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '500 22px "Noto Sans JP", sans-serif';
  ctx.fillText(dateStr, 70, SIZE - 60);
  ctx.textAlign = 'right';
  ctx.font = '600 22px "Noto Sans JP", sans-serif';
  ctx.fillText('yu08083.github.io/Tomodachi-Life-Palette-Tool', SIZE - 70, SIZE - 60);

  return card;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function _shareCardPreview(explicitData) {
  const card = await _shareCardBuild(explicitData);
  const out = document.getElementById('share-card-preview');
  const wrap = document.getElementById('share-card-preview-wrap');
  if (!out || !wrap) return;
  wrap.classList.remove('hidden');
  const maxW = Math.min(wrap.clientWidth - 8, 480);
  const s = maxW / card.width;
  out.width = Math.round(card.width * s);
  out.height = Math.round(card.height * s);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(card, 0, 0, out.width, out.height);
  _shareCardCurrentCanvas = card;
}

async function openShareCardModal(explicitData) {
  if (typeof openModal === 'function') openModal('modal-share-card');
  await _shareCardPreview(explicitData);
}

function _shareCardDownload() {
  const c = _shareCardCurrentCanvas;
  if (!c) return;
  c.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const hms = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    a.download = `supoito_share_${ymd}_${hms}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

async function _shareCardCopy() {
  const c = _shareCardCurrentCanvas;
  if (!c) return;
  try {
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    if (!blob || !navigator.clipboard || !window.ClipboardItem) {
      alert(t('shareCard.copyFail'));
      return;
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    const btn = document.getElementById('share-card-copy');
    if (btn) {
      const old = btn.textContent;
      btn.textContent = t('shareCard.copied');
      setTimeout(() => { btn.textContent = old; }, 1500);
    }
  } catch (e) {
    console.warn(e);
    alert(t('shareCard.copyFail'));
  }
}

async function _shareCardWebShare() {
  const c = _shareCardCurrentCanvas;
  if (!c || !navigator.share) return;
  try {
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    if (!blob) return;
    const file = new File([blob], 'supoito_share.png', { type: 'image/png' });
    const data = { files: [file], title: t('shareCard.shareTitle'), text: t('shareCard.shareText') };
    if (navigator.canShare && !navigator.canShare(data)) {
      delete data.files;
    }
    await navigator.share(data);
  } catch (e) {
    console.warn(e);
  }
}

function attachShareCardHandlers() {
  const dl = document.getElementById('share-card-download');
  if (dl) dl.addEventListener('click', _shareCardDownload);

  const cp = document.getElementById('share-card-copy');
  if (cp) cp.addEventListener('click', _shareCardCopy);

  const ws = document.getElementById('share-card-native');
  if (ws) {
    if (navigator.share && navigator.canShare) {
      ws.classList.remove('hidden');
      ws.addEventListener('click', _shareCardWebShare);
    } else {
      ws.classList.add('hidden');
    }
  }
}
