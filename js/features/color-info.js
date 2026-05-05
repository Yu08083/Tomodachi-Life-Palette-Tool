

function selectColor(r, g, b, px, py) {
  const hex = rgbToHex(r, g, b);
  const hsv = rgbToHsv(r, g, b);

  document.getElementById('selected-swatch').style.background = hex;
  document.getElementById('hex-val').textContent = hex;
  document.getElementById('rgb-val').textContent = `${r}, ${g}, ${b}`;
  document.getElementById('hsv-val').textContent = `${hsv.h}°, ${hsv.s}%, ${hsv.v}%`;

  const posEl = document.getElementById('pixel-pos');
  if (px >= 0 && py >= 0) {
    const label = (viewMode === 'converted') ? '変換後 ' : '';
    posEl.textContent = `${label}X:${px + 1} Y:${py + 1}`;
  } else {
    posEl.textContent = 'HEX 入力';
  }

  let bestDist = Infinity, bestIdx = 0;
  PALETTE.forEach((p, i) => {
    const c = hexToRgb(p.h);
    const d = colorDist(r, g, b, c.r, c.g, c.b);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  });
  closestIdx = bestIdx;
  updatePaletteHighlight(bestIdx, bestDist);

  updateFullColorGuide(hsv, r, g, b);

  if (px >= 0) {
    lastSelPx = px;
    lastSelPy = py;
    drawSelectionOverlay(px, py);
  } else {

    lastSelPx = -1;
    lastSelPy = -1;
    if (overlayCanvas) {
      const ctx = overlayCanvas.getContext('2d');
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
  }

  noSelectMsg.classList.add('hidden');
  colorInfo.classList.remove('hidden');
}

function buildPaletteGrid() {
  const grid = document.getElementById('palette-grid');
  if (!grid) return;
  grid.innerHTML = '';
  PALETTE.forEach((p, i) => {
    const cell = document.createElement('div');
    cell.className = 'palette-cell';
    cell.style.background = p.h;
    cell.title = `${p.h}\n${p.row + 1}行目 ${p.col + 1}列目`;
    cell.dataset.idx = i;
    grid.appendChild(cell);
  });

  attachPaletteHover();
}

function updatePaletteHighlight(bestIdx, bestDist) {
  document.querySelectorAll('.palette-cell').forEach((cell, i) => {
    cell.classList.toggle('closest', i === bestIdx);
  });
  const best = PALETTE[bestIdx];
  document.getElementById('closest-swatch').style.background = best.h;
  document.getElementById('closest-hex').textContent = best.h.toUpperCase();
  document.getElementById('closest-pos').textContent = `${best.row + 1}行目 ${best.col + 1}列目`;
  document.getElementById('closest-dist').textContent = Math.round(bestDist) + '  (低いほど近い)';
}
