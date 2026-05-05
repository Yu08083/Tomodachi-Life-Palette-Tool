

let _palRgbCache = null;
function getPaletteRgb() {
  if (!_palRgbCache) {
    _palRgbCache = PALETTE.map(p => hexToRgb(p.h));
  }
  return _palRgbCache;
}

function _clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

let _logoImageCache = null;
let _logoSafeForCanvas = null;
let _logoLoadPromise = null;

function _testLogoCanvasSafety(logo) {
  try {
    const test = document.createElement('canvas');
    test.width = 8;
    test.height = 8;
    const tctx = test.getContext('2d');
    tctx.drawImage(logo, 0, 0, 8, 8);
    test.toDataURL('image/png');
    return true;
  } catch (e) {
    return false;
  }
}

function _loadLogoSafe(src) {
  if (_logoLoadPromise) return _logoLoadPromise;

  _logoLoadPromise = (async () => {
    if (typeof fetch === 'function' && typeof createImageBitmap === 'function') {
      try {
        const res = await fetch(src);
        if (res.ok) {
          const blob = await res.blob();
          const bmp = await createImageBitmap(blob);
          if (_testLogoCanvasSafety(bmp)) {
            _logoImageCache = bmp;
            _logoSafeForCanvas = true;
            return bmp;
          }
        }
      } catch (e) {
        console.warn('logo fetch+createImageBitmap failed:', e);
      }
    }

    if (typeof fetch === 'function') {
      try {
        const res = await fetch(src);
        if (res.ok) {
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          const img = await new Promise(resolve => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => resolve(null);
            i.src = objUrl;
          });
          if (img && _testLogoCanvasSafety(img)) {
            _logoImageCache = img;
            _logoSafeForCanvas = true;
            return img;
          }
        }
      } catch (e) {
        console.warn('logo fetch+Image failed:', e);
      }
    }

    const existing = document.getElementById('branding-logo');
    if (existing) {
      const ready = await new Promise(resolve => {
        if (existing.complete) {
          resolve(existing.naturalWidth > 0 ? existing : null);
          return;
        }
        existing.addEventListener('load', () => resolve(existing), { once: true });
        existing.addEventListener('error', () => resolve(null), { once: true });
      });
      if (ready && _testLogoCanvasSafety(ready)) {
        _logoImageCache = ready;
        _logoSafeForCanvas = true;
        return ready;
      }
    }

    _logoSafeForCanvas = false;
    return null;
  })();

  return _logoLoadPromise;
}

function _drawFallbackLogo(ctx, cx, cy, radius) {
  const g = ctx.createRadialGradient(cx, cy - radius * 0.2, radius * 0.1, cx, cy, radius);
  g.addColorStop(0, '#FFB373');
  g.addColorStop(0.6, '#FF6B1A');
  g.addColorStop(1, '#E5530A');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  const dotR = radius * 0.18;
  const dotCenterX = cx;
  const dotCenterY = cy + radius * 0.05;
  const dotOffset = radius * 0.42;
  const dots = [
    { x: dotCenterX - dotOffset,            y: dotCenterY - dotOffset * 0.2, color: '#FFC93C' },
    { x: dotCenterX,                        y: dotCenterY - dotOffset * 0.6, color: '#FF8FA3' },
    { x: dotCenterX + dotOffset,            y: dotCenterY - dotOffset * 0.2, color: '#4ECDC4' },
    { x: dotCenterX - dotOffset * 0.6,      y: dotCenterY + dotOffset * 0.5, color: '#FFFFFF' },
    { x: dotCenterX + dotOffset * 0.6,      y: dotCenterY + dotOffset * 0.5, color: '#3A1F0A' },
  ];
  dots.forEach(d => {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.y, dotR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,31,10,0.4)';
    ctx.lineWidth = Math.max(1, radius * 0.025);
    ctx.stroke();
  });
}

function _safeToBlob(canvas, resolve) {
  try {
    canvas.toBlob(b => {
      if (b) {
        resolve(b);
      } else {
        console.warn('canvas.toBlob returned null, trying toDataURL');
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const bin = atob(dataUrl.split(',')[1]);
          const len = bin.length;
          const arr = new Uint8Array(len);
          for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/png' }));
        } catch (e) {
          console.error('toDataURL fallback failed:', e);
          resolve(null);
        }
      }
    }, 'image/png');
  } catch (e) {
    console.error('canvas.toBlob threw:', e);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const bin = atob(dataUrl.split(',')[1]);
      const len = bin.length;
      const arr = new Uint8Array(len);
      for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
      resolve(new Blob([arr], { type: 'image/png' }));
    } catch (e2) {
      console.error('toDataURL fallback (after throw) failed:', e2);
      resolve(null);
    }
  }
}

function findNearestPaletteIdx(r, g, b, palRgb) {
  let bestIdx = 0, bestDist = Infinity;
  for (let k = 0; k < palRgb.length; k++) {
    const c = palRgb[k];
    const d = colorDist(r, g, b, c.r, c.g, c.b);
    if (d < bestDist) { bestDist = d; bestIdx = k; }
  }
  return bestIdx;
}

function convertImage(srcCanvas, srcWidth, srcHeight, gridSize, dither) {

  const aspect = srcWidth / srcHeight;
  let outW, outH;
  if (aspect >= 1) {
    outW = gridSize;
    outH = Math.max(1, Math.round(gridSize / aspect));
  } else {
    outH = gridSize;
    outW = Math.max(1, Math.round(gridSize * aspect));
  }

  const dsCanvas = document.createElement('canvas');
  dsCanvas.width  = outW;
  dsCanvas.height = outH;
  const dsCtx = dsCanvas.getContext('2d');
  dsCtx.imageSmoothingEnabled = true;
  dsCtx.imageSmoothingQuality = 'high';
  dsCtx.clearRect(0, 0, outW, outH);
  dsCtx.drawImage(srcCanvas, 0, 0, outW, outH);

  const imageData = dsCtx.getImageData(0, 0, outW, outH);
  const data = imageData.data;
  const palRgb = getPaletteRgb();
  const paletteMap = new Int16Array(outW * outH);

  if (dither) {

    const buf = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) buf[i] = data[i];

    for (let y = 0; y < outH; y++) {
      for (let x = 0; x < outW; x++) {
        const i = (y * outW + x) * 4;
        const a = buf[i + 3];
        const p = y * outW + x;

        if (a < 10) {
          paletteMap[p] = -1;
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
          continue;
        }

        const r = _clamp(buf[i],     0, 255);
        const g = _clamp(buf[i + 1], 0, 255);
        const b = _clamp(buf[i + 2], 0, 255);

        const idx = findNearestPaletteIdx(r, g, b, palRgb);
        paletteMap[p] = idx;
        const newC = palRgb[idx];

        data[i]     = newC.r;
        data[i + 1] = newC.g;
        data[i + 2] = newC.b;
        data[i + 3] = 255;

        const er = r - newC.r;
        const eg = g - newC.g;
        const eb = b - newC.b;

        _diffuse(buf, x + 1, y,     outW, outH, er, eg, eb, 7 / 16);
        _diffuse(buf, x - 1, y + 1, outW, outH, er, eg, eb, 3 / 16);
        _diffuse(buf, x,     y + 1, outW, outH, er, eg, eb, 5 / 16);
        _diffuse(buf, x + 1, y + 1, outW, outH, er, eg, eb, 1 / 16);
      }
    }
  } else {

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const a = data[i + 3];
      if (a < 10) {
        paletteMap[p] = -1;
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
        continue;
      }
      const idx = findNearestPaletteIdx(data[i], data[i + 1], data[i + 2], palRgb);
      paletteMap[p] = idx;
      const newC = palRgb[idx];
      data[i]     = newC.r;
      data[i + 1] = newC.g;
      data[i + 2] = newC.b;
      data[i + 3] = 255;
    }
  }

  dsCtx.putImageData(imageData, 0, 0);

  return {
    width: outW,
    height: outH,
    data: imageData.data,
    originalCanvas: dsCanvas,
    paletteMap
  };
}

function _diffuse(buf, x, y, W, H, er, eg, eb, factor) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i]     += er * factor;
  buf[i + 1] += eg * factor;
  buf[i + 2] += eb * factor;
}

function getActiveData() {
  return (viewMode === 'converted' && convertedData) ? convertedData : imgData;
}

function rebuildConvertedData() {
  if (!imgData) return;
  convertedData = convertImage(
    imgData.originalCanvas,
    imgData.width,
    imgData.height,
    gridSize,
    ditherEnabled
  );

  if (viewMode === 'converted') {
    fitZoomToConverted();
    renderPixelCanvas();
    if (lastSelPx >= 0 && lastSelPx < convertedData.width &&
        lastSelPy >= 0 && lastSelPy < convertedData.height) {
      drawSelectionOverlay(lastSelPx, lastSelPy);
    } else {
      lastSelPx = -1;
      lastSelPy = -1;
      noSelectMsg.classList.remove('hidden');
      colorInfo.classList.add('hidden');
    }
  }

  rebuildRecipe();
}

function fitZoomToConverted() {
  if (!convertedData) return;
  const max = Math.max(convertedData.width, convertedData.height);
  if (max <= 16)        zoom = 16;
  else if (max <= 24)   zoom = 12;
  else if (max <= 32)   zoom = 8;
  else if (max <= 48)   zoom = 8;
  else if (max <= 64)   zoom = 4;
  else if (max <= 128)  zoom = 4;
  else if (max <= 192)  zoom = 2;
  else                  zoom = 2;
}

function setViewMode(mode) {
  if (mode === viewMode) return;
  if (mode === 'converted' && !imgData) return;

  viewMode = mode;

  document.getElementById('view-original-btn').classList.toggle('active', mode === 'original');
  document.getElementById('view-converted-btn').classList.toggle('active', mode === 'converted');
  document.getElementById('convert-controls').classList.toggle('hidden', mode !== 'converted');
  const dlBtn = document.getElementById('download-btn');
  if (dlBtn) dlBtn.classList.toggle('hidden', mode !== 'converted');
  const dlPbnBtn = document.getElementById('download-pbn-btn');
  if (dlPbnBtn) dlPbnBtn.classList.toggle('hidden', mode !== 'converted');

  if (mode === 'converted') {
    if (!convertedData) rebuildConvertedData();
    fitZoomToConverted();
  } else {
    if (imgData.width <= 16 && imgData.height <= 16)        zoom = 16;
    else if (imgData.width <= 32 && imgData.height <= 32)   zoom = 8;
    else if (imgData.width <= 64 && imgData.height <= 64)   zoom = 4;
    else if (imgData.width <= 128 && imgData.height <= 128) zoom = 2;
    else                                                    zoom = 1;
  }

  updateImgInfo();

  hoverPaletteIdx = -1;
  lastSelPx = -1;
  lastSelPy = -1;
  noSelectMsg.classList.remove('hidden');
  colorInfo.classList.add('hidden');

  renderPixelCanvas();
  rebuildRecipe();
}

function updateImgInfo() {
  if (!imgData) return;
  if (viewMode === 'converted' && convertedData) {
    imgInfoEl.textContent =
      `変換後 ${convertedData.width}×${convertedData.height} ` +
      `（元 ${imgData.width}×${imgData.height}px）`;
  } else {
    let txt = `${imgData.width}×${imgData.height}px / ${imgData.width * imgData.height} ピクセル`;
    if (imgData.width === 16 && imgData.height === 16) {
      txt += '  [ゲーム内ペイント対応サイズ]';
    }
    if (imgData.cropped) {
      txt += '  [クロップ済み]';
    }
    imgInfoEl.textContent = txt;
  }
}

function attachConvertControls() {
  document.getElementById('view-original-btn').addEventListener('click', () => setViewMode('original'));
  document.getElementById('view-converted-btn').addEventListener('click', () => setViewMode('converted'));

  _loadLogoSafe('./assets/favicon.png');

  document.querySelectorAll('.grid-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newSize = parseInt(btn.dataset.size, 10);
      if (newSize === gridSize) return;
      gridSize = newSize;
      document.querySelectorAll('.grid-size-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.size, 10) === gridSize);
      });
      rebuildConvertedData();
      updateImgInfo();
    });
  });

  const ditherEl = document.getElementById('dither-toggle');
  if (ditherEl) {
    ditherEl.addEventListener('change', () => {
      ditherEnabled = ditherEl.checked;
      rebuildConvertedData();
    });
  }

  const dlBtn = document.getElementById('download-btn');
  if (dlBtn) {
    dlBtn.addEventListener('click', downloadConvertedImage);
  }

  const dlPbnBtn = document.getElementById('download-pbn-btn');
  if (dlPbnBtn) {
    dlPbnBtn.addEventListener('click', downloadPaintByNumbersImage);
  }
}

function downloadConvertedImage() {
  if (viewMode !== 'converted' || !convertedData) return;

  const sourceCanvas = convertedData.originalCanvas;
  if (!sourceCanvas) return;

  composeBrandedImage(sourceCanvas, convertedData.width, convertedData.height)
    .then(blob => {
      if (!blob) {
        console.error('composeBrandedImage が null を返しました');
        alert('画像の生成に失敗しました\n\n詳細はブラウザの開発者ツール（F12）のコンソールをご確認ください。');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date();
      const ymd = ts.getFullYear() + String(ts.getMonth() + 1).padStart(2, '0') + String(ts.getDate()).padStart(2, '0');
      const hms = String(ts.getHours()).padStart(2, '0') + String(ts.getMinutes()).padStart(2, '0') + String(ts.getSeconds()).padStart(2, '0');
      const dither = ditherEnabled ? '_dither' : '';
      a.download = `supoito_${convertedData.width}x${convertedData.height}${dither}_${ymd}_${hms}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    })
    .catch(err => {
      console.error('ドット絵生成エラー:', err);
      alert('画像の生成に失敗しました\n\n詳細はブラウザの開発者ツール（F12）のコンソールをご確認ください。');
    });
}

function composeBrandedImage(srcCanvas, srcW, srcH) {
  return new Promise((resolve, reject) => {
    try {
      let scale = 1;
      const minOutW = 512;
      const maxOutW = 1024;
      if (srcW * scale < minOutW) {
        scale = Math.ceil(minOutW / srcW);
      }
      if (srcW * scale > maxOutW) {
        scale = Math.max(1, Math.floor(maxOutW / srcW));
      }

      const imgW = srcW * scale;
      const imgH = srcH * scale;

      const bandH = Math.round(imgW * 0.19);
      const padX  = Math.round(imgW * 0.04);

      const outW = imgW;
      const outH = imgH + bandH;

      const out = document.createElement('canvas');
      out.width  = outW;
      out.height = outH;
      const ctx = out.getContext('2d');

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outW, imgH);
      ctx.drawImage(srcCanvas, 0, 0, srcW, srcH, 0, 0, imgW, imgH);

      const grad = ctx.createLinearGradient(0, imgH, 0, outH);
      grad.addColorStop(0, '#FFE8CF');
      grad.addColorStop(1, '#FFD9A8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, imgH, outW, bandH);

      ctx.fillStyle = '#FF6B1A';
      ctx.fillRect(0, imgH, outW, Math.max(3, Math.round(bandH * 0.05)));

      const logoSize = Math.round(bandH * 0.78);
      const logoY = imgH + Math.round((bandH - logoSize) / 2);
      const logoX = padX;

      ctx.imageSmoothingEnabled = true;
      const textX = logoX + logoSize + Math.round(bandH * 0.22);

      const titleSize = Math.round(bandH * 0.38);
      const subSize   = Math.round(bandH * 0.18);
      const urlSize   = Math.round(bandH * 0.16);

      ctx.fillStyle = '#3A1F0A';
      ctx.font = `800 ${titleSize}px "M PLUS Rounded 1c", "Hiragino Sans", "Yu Gothic", sans-serif`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      const titleY = imgH + Math.round(bandH * 0.42);
      ctx.fillText('すぽいと帳', textX, titleY);

      ctx.fillStyle = '#8C5A30';
      ctx.font = `700 ${subSize}px "M PLUS Rounded 1c", "Hiragino Sans", "Yu Gothic", sans-serif`;
      const subY = imgH + Math.round(bandH * 0.66);
      ctx.fillText('トモダチコレクション わくわく生活用', textX, subY);

      ctx.fillStyle = '#E5530A';
      ctx.font = `700 ${urlSize}px "JetBrains Mono", "SF Mono", monospace`;
      const urlY = imgH + Math.round(bandH * 0.90);
      ctx.fillText('yu08083.github.io/Tomodachi-Life-Palette-Tool', textX, urlY);

      const stampText = `${srcW}×${srcH}`;
      ctx.fillStyle = '#E5530A';
      ctx.font = `800 ${subSize}px "JetBrains Mono", "SF Mono", monospace`;
      const stampW = ctx.measureText(stampText).width;
      ctx.fillText(stampText, outW - padX - stampW, subY);

      _loadLogoSafe('./assets/favicon.png').then(logoImg => {
        const cx = logoX + logoSize / 2;
        const cy = logoY + logoSize / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, logoSize / 2 + 4, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.restore();

        let drewImage = false;
        if (logoImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          try {
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
            drewImage = true;
          } catch (e) {}
          ctx.restore();
        }
        if (!drewImage) {
          _drawFallbackLogo(ctx, cx, cy, logoSize / 2);
        }
        _safeToBlob(out, resolve);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function downloadPaintByNumbersImage() {
  if (viewMode !== 'converted' || !convertedData) return;

  const maxSide = Math.max(convertedData.width, convertedData.height);
  if (maxSide >= 192) {
    const ok = confirm(
      `${convertedData.width}×${convertedData.height} の番号塗り絵PNGを生成します。\n` +
      `ファイルが大きく（5〜15MB目安）、生成に数十秒かかる場合があります。\n` +
      `続行しますか？`
    );
    if (!ok) return;
  }

  composePaintByNumbers(convertedData)
    .then(blob => {
      if (!blob) {
        console.error('composePaintByNumbers が null を返しました');
        alert('画像の生成に失敗しました\n\n詳細はブラウザの開発者ツール（F12）のコンソールをご確認ください。');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date();
      const ymd = ts.getFullYear() + String(ts.getMonth() + 1).padStart(2, '0') + String(ts.getDate()).padStart(2, '0');
      const hms = String(ts.getHours()).padStart(2, '0') + String(ts.getMinutes()).padStart(2, '0') + String(ts.getSeconds()).padStart(2, '0');
      a.download = `supoito_pbn_${convertedData.width}x${convertedData.height}_${ymd}_${hms}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    })
    .catch(err => {
      console.error('番号塗り絵生成エラー:', err);
      alert('画像の生成に失敗しました\n\n詳細はブラウザの開発者ツール（F12）のコンソールをご確認ください。');
    });
}

function composePaintByNumbers(d) {
  return new Promise((resolve, reject) => {
    try {
      const w = d.width, h = d.height;
      const map = d.paletteMap;

      const usedSet = new Set();
      for (let i = 0; i < map.length; i++) if (map[i] >= 0) usedSet.add(map[i]);
      const usedList = [...usedSet].sort((a, b) => {
        const pa = PALETTE[a], pb = PALETTE[b];
        return (pa.row * 12 + pa.col) - (pb.row * 12 + pb.col);
      });
      const idxToNum = new Map();
      usedList.forEach(idx => {
        const p = PALETTE[idx];
        idxToNum.set(idx, p.row * 12 + p.col + 1);
      });

      const maxSide = Math.max(w, h);
      let cellPx;
      if (maxSide <= 32)       cellPx = 48;
      else if (maxSide <= 64)  cellPx = 36;
      else if (maxSide <= 128) cellPx = 24;
      else if (maxSide <= 192) cellPx = 18;
      else                     cellPx = 14;

      const imgW = w * cellPx;
      const imgH = h * cellPx;

      const chromeUnit = Math.max(48, cellPx * 1.5);

      const padX    = Math.round(chromeUnit * 0.6);
      const headerH = Math.round(chromeUnit * 1.2);
      const bandH   = Math.round(chromeUnit * 1.6);

      const legendCols = Math.min(4, usedList.length);
      const legendRows = Math.ceil(usedList.length / legendCols);
      const legendItemH = Math.round(chromeUnit * 0.7);
      const legendH = legendRows * legendItemH + Math.round(chromeUnit * 0.3);

      const outW = imgW + padX * 2;
      const outH = headerH + imgH + legendH + bandH;

      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outW, outH);

      ctx.imageSmoothingEnabled = true;
      ctx.fillStyle = '#3A1F0A';
      ctx.font = `800 ${Math.round(chromeUnit * 0.5)}px "M PLUS Rounded 1c", "Hiragino Sans", "Yu Gothic", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText('番号塗り絵（パレット番号 1〜84）', padX, headerH / 2);

      const sizeText = `${w}×${h}  /  ${usedList.length}色`;
      ctx.font = `700 ${Math.round(chromeUnit * 0.34)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#9C7553';
      ctx.textAlign = 'right';
      ctx.fillText(sizeText, outW - padX, headerH / 2);
      ctx.textAlign = 'left';

      const offsetX = padX;
      const offsetY = headerH;

      const numFontSize = Math.round(cellPx * 0.42);
      ctx.font = `800 ${numFontSize}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = map[y * w + x];
          const cx = offsetX + x * cellPx;
          const cy = offsetY + y * cellPx;

          if (idx < 0) {
            ctx.fillStyle = '#F5F5F5';
            ctx.fillRect(cx, cy, cellPx, cellPx);
          } else {
            const palHex = PALETTE[idx].h;
            ctx.fillStyle = palHex;
            ctx.fillRect(cx, cy, cellPx, cellPx);

            const num = idxToNum.get(idx);
            const numStr = String(num).padStart(2, '0');
            const rgb = hexToRgb(palHex);
            const luma = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
            const textColor = luma < 140 ? '#FFFFFF' : '#1A0F05';
            const haloColor = luma < 140 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)';

            ctx.lineWidth = Math.max(2, Math.round(numFontSize * 0.18));
            ctx.strokeStyle = haloColor;
            ctx.strokeText(numStr, cx + cellPx / 2, cy + cellPx / 2 + 1);
            ctx.fillStyle = textColor;
            ctx.fillText(numStr, cx + cellPx / 2, cy + cellPx / 2 + 1);
          }
        }
      }

      ctx.strokeStyle = 'rgba(58, 31, 10, 0.55)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + x * cellPx + 0.5, offsetY);
        ctx.lineTo(offsetX + x * cellPx + 0.5, offsetY + imgH);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y++) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + y * cellPx + 0.5);
        ctx.lineTo(offsetX + imgW, offsetY + y * cellPx + 0.5);
        ctx.stroke();
      }

      ctx.strokeStyle = '#FF8F4D';
      ctx.lineWidth = 2;
      const midX = offsetX + (w / 2) * cellPx;
      const midY = offsetY + (h / 2) * cellPx;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(midX, offsetY);
      ctx.lineTo(midX, offsetY + imgH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(offsetX, midY);
      ctx.lineTo(offsetX + imgW, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      const legendY0 = offsetY + imgH + Math.round(chromeUnit * 0.3);
      ctx.fillStyle = '#FF6B1A';
      ctx.fillRect(padX, legendY0 - 4, outW - padX * 2, 2);

      const colW = (outW - padX * 2) / legendCols;
      ctx.font = `700 ${Math.round(chromeUnit * 0.32)}px "M PLUS Rounded 1c", "Hiragino Sans", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      usedList.forEach((idx, n) => {
        const num = idxToNum.get(idx);
        const numStr = String(num).padStart(2, '0');
        const col = n % legendCols;
        const row = Math.floor(n / legendCols);
        const x = padX + col * colW;
        const y = legendY0 + row * legendItemH + legendItemH / 2;
        const p = PALETTE[idx];

        const swSize = Math.round(legendItemH * 0.6);
        ctx.fillStyle = p.h;
        ctx.fillRect(x, y - swSize / 2, swSize, swSize);
        ctx.strokeStyle = '#3A1F0A';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y - swSize / 2 + 0.5, swSize - 1, swSize - 1);

        ctx.fillStyle = '#FF6B1A';
        ctx.font = `800 ${Math.round(chromeUnit * 0.34)}px "JetBrains Mono", monospace`;
        ctx.fillText(numStr, x + swSize + 8, y);

        const numW = ctx.measureText(numStr).width;
        ctx.fillStyle = '#3A1F0A';
        ctx.font = `700 ${Math.round(chromeUnit * 0.28)}px "M PLUS Rounded 1c", "Hiragino Sans", sans-serif`;
        ctx.fillText(`${p.row + 1}行 ${p.col + 1}列`, x + swSize + 8 + numW + 8, y);
      });

      const bandY = offsetY + imgH + legendH;
      const bandGrad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
      bandGrad.addColorStop(0, '#FFE8CF');
      bandGrad.addColorStop(1, '#FFD9A8');
      ctx.fillStyle = bandGrad;
      ctx.fillRect(0, bandY, outW, bandH);

      ctx.fillStyle = '#FF6B1A';
      ctx.fillRect(0, bandY, outW, Math.max(3, Math.round(bandH * 0.05)));

      const logoSize = Math.round(bandH * 0.78);
      const logoY = bandY + (bandH - logoSize) / 2;
      const logoX = padX;

      const textX = logoX + logoSize + Math.round(bandH * 0.22);

      ctx.fillStyle = '#3A1F0A';
      ctx.font = `800 ${Math.round(bandH * 0.34)}px "M PLUS Rounded 1c", "Hiragino Sans", sans-serif`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillText('すぽいと帳', textX, bandY + bandH * 0.45);

      ctx.fillStyle = '#8C5A30';
      ctx.font = `700 ${Math.round(bandH * 0.18)}px "M PLUS Rounded 1c", "Hiragino Sans", sans-serif`;
      ctx.fillText('トモダチコレクション わくわく生活用', textX, bandY + bandH * 0.70);

      ctx.fillStyle = '#E5530A';
      ctx.font = `700 ${Math.round(bandH * 0.17)}px "JetBrains Mono", monospace`;
      ctx.fillText('yu08083.github.io/Tomodachi-Life-Palette-Tool', textX, bandY + bandH * 0.92);

      _loadLogoSafe('./assets/favicon.png').then(logoImg => {
        const cx = logoX + logoSize / 2;
        const cy = logoY + logoSize / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, logoSize / 2 + 4, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.restore();

        let drewImage = false;
        if (logoImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          try {
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
            drewImage = true;
          } catch (e) {}
          ctx.restore();
        }
        if (!drewImage) {
          _drawFallbackLogo(ctx, cx, cy, logoSize / 2);
        }
        _safeToBlob(out, resolve);
      });
    } catch (e) {
      reject(e);
    }
  });
}
