
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

function bgPresetConvertImage(srcCanvas) {
  const palRgb = getPaletteRgb();
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const ctx = srcCanvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
      continue;
    }
    const idx = findNearestPaletteIdx(data[i], data[i + 1], data[i + 2], palRgb);
    const c = palRgb[idx];
    data[i] = c.r; data[i + 1] = c.g; data[i + 2] = c.b; data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return srcCanvas;
}

function bgPresetDownscaleToRegion(sourceCanvas, regionW, regionH, gridSize) {
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

  bgPresetConvertImage(ds);
  return ds;
}
