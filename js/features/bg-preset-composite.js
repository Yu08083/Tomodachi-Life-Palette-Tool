
function bgPresetCompositeRegion(targetCtx, baseImage, region, userCanvas, useCover) {
  const rw = region.w;
  const rh = region.h;
  const rx = region.minX;
  const ry = region.minY;

  const fitCanvas = document.createElement('canvas');
  fitCanvas.width = rw;
  fitCanvas.height = rh;
  const fitCtx = fitCanvas.getContext('2d');
  fitCtx.imageSmoothingEnabled = false;
  fitCtx.clearRect(0, 0, rw, rh);

  const uw = userCanvas.width;
  const uh = userCanvas.height;
  const scaleCover  = Math.max(rw / uw, rh / uh);
  const scaleContain = Math.min(rw / uw, rh / uh);
  const s = useCover ? scaleCover : scaleContain;
  const dw = Math.round(uw * s);
  const dh = Math.round(uh * s);
  const dx = Math.round((rw - dw) / 2);
  const dy = Math.round((rh - dh) / 2);

  fitCtx.drawImage(userCanvas, dx, dy, dw, dh);

  const maskCanvas = extractRegionMaskCanvas(_bgPresetCurrent.detect, region.index);
  if (maskCanvas) {
    fitCtx.globalCompositeOperation = 'destination-in';
    fitCtx.drawImage(maskCanvas, 0, 0);
    fitCtx.globalCompositeOperation = 'source-over';
  }

  targetCtx.drawImage(fitCanvas, rx, ry);
}

function bgPresetBuildComposite(baseImage, detect, slots) {
  const c = document.createElement('canvas');
  c.width = baseImage.width;
  c.height = baseImage.height;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(baseImage, 0, 0);

  for (let i = 0; i < detect.regions.length; i++) {
    const slot = slots[i];
    if (!slot || !slot.convertedCanvas) continue;
    const region = detect.regions[i];
    bgPresetCompositeRegion(ctx, baseImage, region, slot.convertedCanvas, slot.useCover !== false);
  }
  return c;
}

var _bgPaletteLabCache = null;

function _bgSrgbToLinear(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function bgRgbToLab(r, g, b) {
  const rl = _bgSrgbToLinear(r);
  const gl = _bgSrgbToLinear(g);
  const bl = _bgSrgbToLinear(b);
  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  let y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.00000;
  let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;
  const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16/116);
  const fx = f(x), fy = f(y), fz = f(z);
  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function bgGetPaletteLab() {
  const palRgb = getPaletteRgb();
  if (_bgPaletteLabCache && _bgPaletteLabCache.length === palRgb.length) {
    return _bgPaletteLabCache;
  }
  _bgPaletteLabCache = palRgb.map(c => bgRgbToLab(c.r, c.g, c.b));
  return _bgPaletteLabCache;
}

function bgFindNearestPaletteIdxLab(r, g, b, palLab) {
  const lab = bgRgbToLab(r, g, b);
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palLab.length; i++) {
    const p = palLab[i];
    const dL = lab.L - p.L;
    const da = lab.a - p.a;
    const dB = lab.b - p.b;
    const d = dL*dL + da*da + dB*dB;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

function _bgClamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

function _bgDiffuse(buf, x, y, W, H, er, eg, eb, factor) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i]   += er * factor;
  buf[i+1] += eg * factor;
  buf[i+2] += eb * factor;
}

function bgPresetConvertImage(srcCanvas, dither) {
  const palRgb = getPaletteRgb();
  const palLab = bgGetPaletteLab();
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const ctx = srcCanvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  if (dither) {
    const buf = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) buf[i] = data[i];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (buf[i + 3] < 10) {
          data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 0;
          continue;
        }
        const r = _bgClamp(buf[i],   0, 255);
        const g = _bgClamp(buf[i+1], 0, 255);
        const b = _bgClamp(buf[i+2], 0, 255);
        const idx = bgFindNearestPaletteIdxLab(r, g, b, palLab);
        const c = palRgb[idx];
        data[i] = c.r; data[i+1] = c.g; data[i+2] = c.b; data[i+3] = 255;
        const er = r - c.r;
        const eg = g - c.g;
        const eb = b - c.b;
        _bgDiffuse(buf, x+1, y,   w, h, er, eg, eb, 7/16);
        _bgDiffuse(buf, x-1, y+1, w, h, er, eg, eb, 3/16);
        _bgDiffuse(buf, x,   y+1, w, h, er, eg, eb, 5/16);
        _bgDiffuse(buf, x+1, y+1, w, h, er, eg, eb, 1/16);
      }
    }
  } else {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 10) {
        data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 0;
        continue;
      }
      const idx = bgFindNearestPaletteIdxLab(data[i], data[i+1], data[i+2], palLab);
      const c = palRgb[idx];
      data[i] = c.r; data[i+1] = c.g; data[i+2] = c.b; data[i+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return srcCanvas;
}

function bgPresetDownscaleToRegion(sourceCanvas, regionW, regionH, gridSize, dither) {
  const aspect = sourceCanvas.width / sourceCanvas.height;
  let outW, outH;
  if (aspect >= 1) {
    outW = gridSize;
    outH = Math.max(1, Math.round(gridSize / aspect));
  } else {
    outH = gridSize;
    outW = Math.max(1, Math.round(gridSize * aspect));
  }

  const ds = document.createElement('canvas');
  ds.width = outW;
  ds.height = outH;
  const dctx = ds.getContext('2d');
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = 'high';
  dctx.drawImage(sourceCanvas, 0, 0, outW, outH);

  bgPresetConvertImage(ds, !!dither);
  return ds;
}
