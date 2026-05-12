
var bgPresetData = null;
var bgPresetLoaded = false;

async function loadBgPresets() {
  if (bgPresetLoaded) return bgPresetData;
  try {
    const res = await fetch('./js/data/backgrounds.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    bgPresetData = await res.json();
    bgPresetLoaded = true;
    console.log('[bg-preset] loaded', (bgPresetData.categories || []).length, 'categories');
  } catch (e) {
    console.error('[bg-preset] load failed:', e);
    bgPresetData = { categories: [], blueColor: { r: 5, g: 75, b: 186, tolerance: 30 } };
    bgPresetLoaded = true;
  }
  return bgPresetData;
}

function bgPresetCategories() {
  if (!bgPresetData) return [];
  return bgPresetData.categories || [];
}

function bgPresetCategoryById(id) {
  if (!bgPresetData) return null;
  return (bgPresetData.categories || []).find(c => c.id === id) || null;
}

function bgPresetById(catId, presetId) {
  const cat = bgPresetCategoryById(catId);
  if (!cat) return null;
  return (cat.presets || []).find(p => p.id === presetId) || null;
}

function bgPresetImageUrl(catId, presetId) {
  const p = bgPresetById(catId, presetId);
  if (!p) return null;
  return `./assets/backgrounds/${catId}/${p.file}`;
}

function loadBgPresetImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed: ' + url));
    img.src = url;
  });
}

function _isBluePixel(r, g, b, target, tol) {
  const dr = r - target.r;
  const dg = g - target.g;
  const db = b - target.b;
  return (dr * dr + dg * dg + db * db) <= tol * tol;
}

function detectBlueRegions(image) {
  const w = image.width;
  const h = image.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  const cfg = (bgPresetData && bgPresetData.blueColor) || { r: 5, g: 75, b: 186, tolerance: 80 };

  const mask = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (_isBluePixel(data[i], data[i+1], data[i+2], cfg, cfg.tolerance)) {
      mask[p] = 1;
    }
  }

  const dilated = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (mask[p] === 1) {
        dilated[p] = 1;
        continue;
      }
      let any = 0;
      if (x > 0     && mask[p - 1] === 1) any = 1;
      else if (x < w - 1 && mask[p + 1] === 1) any = 1;
      else if (y > 0     && mask[p - w] === 1) any = 1;
      else if (y < h - 1 && mask[p + w] === 1) any = 1;
      dilated[p] = any;
    }
  }
  for (let i = 0; i < mask.length; i++) mask[i] = dilated[i];

  const labels = new Int32Array(w * h);
  let nextLabel = 0;
  const regions = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (mask[p] !== 1 || labels[p] !== 0) continue;
      nextLabel++;
      const stack = [p];
      let minX = x, maxX = x, minY = y, maxY = y, count = 0;
      while (stack.length) {
        const q = stack.pop();
        if (labels[q] !== 0) continue;
        labels[q] = nextLabel;
        const qx = q % w;
        const qy = (q - qx) / w;
        if (qx < minX) minX = qx;
        if (qx > maxX) maxX = qx;
        if (qy < minY) minY = qy;
        if (qy > maxY) maxY = qy;
        count++;
        if (qx > 0     && mask[q - 1] === 1 && labels[q - 1] === 0)         stack.push(q - 1);
        if (qx < w - 1 && mask[q + 1] === 1 && labels[q + 1] === 0)         stack.push(q + 1);
        if (qy > 0     && mask[q - w] === 1 && labels[q - w] === 0)         stack.push(q - w);
        if (qy < h - 1 && mask[q + w] === 1 && labels[q + w] === 0)         stack.push(q + w);
      }
      regions.push({
        id: nextLabel,
        minX, minY, maxX, maxY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
        count
      });
    }
  }

  const minArea = Math.max(100, Math.floor(w * h * 0.0005));
  const filtered = regions.filter(r => r.count >= minArea);

  filtered.sort((a, b) => {
    const rowA = Math.floor(a.minY / 64);
    const rowB = Math.floor(b.minY / 64);
    if (rowA !== rowB) return rowA - rowB;
    return a.minX - b.minX;
  });

  filtered.forEach((r, i) => { r.index = i; });

  return { width: w, height: h, mask, labels, regions: filtered, allLabels: nextLabel };
}

function extractRegionMaskCanvas(detect, regionIndex) {
  const region = detect.regions[regionIndex];
  if (!region) return null;
  const w = detect.width;
  const labels = detect.labels;

  const rw = region.w;
  const rh = region.h;
  const c = document.createElement('canvas');
  c.width = rw;
  c.height = rh;
  const ctx = c.getContext('2d');
  const imageData = ctx.createImageData(rw, rh);
  const out = imageData.data;
  const targetLabel = region.id;

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const sx = x + region.minX;
      const sy = y + region.minY;
      const p = sy * w + sx;
      const o = (y * rw + x) * 4;
      if (labels[p] === targetLabel) {
        out[o] = 255; out[o+1] = 255; out[o+2] = 255; out[o+3] = 255;
      } else {
        out[o] = 0; out[o+1] = 0; out[o+2] = 0; out[o+3] = 0;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return c;
}
