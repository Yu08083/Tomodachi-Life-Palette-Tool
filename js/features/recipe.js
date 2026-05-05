
const RECIPE_STORAGE_PREFIX = 'supoito_progress_';
let recipeCheckState = {};
let recipeKey = '';
let recipeBlinkRAF = null;
let recipeBlinkStart = 0;
let recipeBlinkActive = false;

function _hashConvertedData(d) {
  if (!d) return '';
  let h = 5381;
  const map = d.paletteMap;
  for (let i = 0; i < map.length; i++) {
    h = ((h << 5) + h + map[i]) | 0;
  }
  return `${d.width}x${d.height}_${(h >>> 0).toString(36)}`;
}

function _loadCheckState(key) {
  try {
    const raw = localStorage.getItem(RECIPE_STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function _saveCheckState(key, state) {
  try {
    localStorage.setItem(RECIPE_STORAGE_PREFIX + key, JSON.stringify(state));
  } catch (e) {}
}

function computeRecipe() {
  if (!convertedData) return [];
  const counts = new Map();
  let total = 0;
  const map = convertedData.paletteMap;
  for (let i = 0; i < map.length; i++) {
    const idx = map[i];
    if (idx < 0) continue;
    counts.set(idx, (counts.get(idx) || 0) + 1);
    total++;
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([idx, count]) => ({ idx, count, pct: total ? count / total : 0, total }));
}

function rebuildRecipe() {
  const wrap   = document.getElementById('recipe-wrap');
  const listEl = document.getElementById('recipe-list');
  const summaryEl = document.getElementById('recipe-summary');
  if (!wrap || !listEl) return;

  if (viewMode !== 'converted' || !convertedData) {
    wrap.classList.add('hidden');
    return;
  }

  const recipe = computeRecipe();
  if (recipe.length === 0) {
    wrap.classList.add('hidden');
    return;
  }

  recipeKey = _hashConvertedData(convertedData);
  recipeCheckState = _loadCheckState(recipeKey);

  wrap.classList.remove('hidden');
  const total = recipe[0].total;
  const checkedCount = recipe.filter(it => recipeCheckState[it.idx]).length;
  summaryEl.innerHTML = `合計 ${recipe.length} 色 / ${total} セル <span class="recipe-progress">${checkedCount}/${recipe.length} 完了</span>`;

  listEl.innerHTML = '';
  recipe.forEach(item => {
    const p = PALETTE[item.idx];
    const checked = !!recipeCheckState[item.idx];
    const row = document.createElement('div');
    row.className = 'recipe-row' + (checked ? ' checked' : '');
    row.dataset.idx = item.idx;
    row.innerHTML = `
      <button class="recipe-check" data-idx="${item.idx}" aria-label="完了チェック">
        <span class="recipe-check-mark"></span>
      </button>
      <div class="recipe-swatch" style="background:${p.h}"></div>
      <div class="recipe-info">
        <div class="recipe-pos">${p.row + 1}行目 ${p.col + 1}列目</div>
        <div class="recipe-hex">${p.h.toUpperCase()}</div>
      </div>
      <div class="recipe-count">
        <div class="recipe-num">${item.count}<span class="recipe-unit">cells</span></div>
        <div class="recipe-pct">${(item.pct * 100).toFixed(1)}%</div>
      </div>
      <button class="recipe-blink" data-idx="${item.idx}" aria-label="セルを点滅" title="セルを点滅">
        <span class="recipe-blink-icon"></span>
      </button>
    `;

    row.querySelector('.recipe-check').addEventListener('click', e => {
      e.stopPropagation();
      toggleRecipeCheck(item.idx);
    });

    row.querySelector('.recipe-blink').addEventListener('click', e => {
      e.stopPropagation();
      blinkPaletteCells(item.idx);
    });

    const infoCols = row.querySelectorAll('.recipe-swatch, .recipe-info, .recipe-count');
    infoCols.forEach(el => {
      el.addEventListener('mouseenter', () => setHoverPalette(item.idx));
      el.addEventListener('mouseleave', () => setHoverPalette(-1));
      el.addEventListener('click', () => {
        if (hoverPaletteIdx === item.idx) setHoverPalette(-1);
        else setHoverPalette(item.idx);
      });
    });

    listEl.appendChild(row);
  });
}

function toggleRecipeCheck(idx) {
  if (recipeCheckState[idx]) delete recipeCheckState[idx];
  else recipeCheckState[idx] = true;
  _saveCheckState(recipeKey, recipeCheckState);

  const row = document.querySelector(`.recipe-row[data-idx="${idx}"]`);
  if (row) row.classList.toggle('checked', !!recipeCheckState[idx]);

  const recipe = computeRecipe();
  const checkedCount = recipe.filter(it => recipeCheckState[it.idx]).length;
  const summaryEl = document.getElementById('recipe-summary');
  if (summaryEl && recipe.length) {
    const total = recipe[0].total;
    summaryEl.innerHTML = `合計 ${recipe.length} 色 / ${total} セル <span class="recipe-progress">${checkedCount}/${recipe.length} 完了</span>`;
  }
}

function blinkPaletteCells(palIdx) {
  if (!convertedData || !overlayCanvas) return;
  recipeBlinkActive = true;
  recipeBlinkStart = performance.now();
  if (recipeBlinkRAF) cancelAnimationFrame(recipeBlinkRAF);

  setHoverPalette(palIdx);

  const blinkLoop = (now) => {
    if (!recipeBlinkActive || hoverPaletteIdx !== palIdx) {
      recipeBlinkRAF = null;
      return;
    }
    const elapsed = now - recipeBlinkStart;
    if (elapsed > 4000) {
      recipeBlinkActive = false;
      drawHighlight(palIdx);
      recipeBlinkRAF = null;
      return;
    }
    drawHighlightWithBlink(palIdx, elapsed);
    recipeBlinkRAF = requestAnimationFrame(blinkLoop);
  };
  recipeBlinkRAF = requestAnimationFrame(blinkLoop);
}

function drawHighlightWithBlink(palIdx, elapsedMs) {
  if (!overlayCanvas || !convertedData) return;
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  const phase = (elapsedMs % 600) / 600;
  const pulse = 0.3 + 0.7 * Math.abs(Math.sin(phase * Math.PI));

  ctx.fillStyle = `rgba(0, 0, 0, ${0.4 + 0.25 * pulse})`;
  ctx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  const w = convertedData.width;
  const h = convertedData.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (convertedData.paletteMap[y * w + x] === palIdx) {
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
  }
  ctx.restore();

  ctx.strokeStyle = `rgba(255, 200, 60, ${0.6 + 0.4 * pulse})`;
  ctx.lineWidth = Math.max(2, zoom * 0.18);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (convertedData.paletteMap[y * w + x] === palIdx) {
        ctx.strokeRect(x * zoom + 0.5, y * zoom + 0.5, zoom - 1, zoom - 1);
      }
    }
  }

  ctx.strokeStyle = 'rgba(232, 90, 12, 1)';
  ctx.lineWidth = Math.max(1, zoom * 0.1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (convertedData.paletteMap[y * w + x] === palIdx) {
        ctx.strokeRect(x * zoom + 0.5, y * zoom + 0.5, zoom - 1, zoom - 1);
      }
    }
  }

  if (lastSelPx >= 0) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(2, zoom * 0.3);
    ctx.strokeRect(lastSelPx * zoom, lastSelPy * zoom, zoom, zoom);
  }
}

function drawHighlight(palIdx) {
  if (!overlayCanvas) return;

  if (recipeBlinkActive) recipeBlinkActive = false;

  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  if (palIdx < 0 || viewMode !== 'converted' || !convertedData) {
    if (lastSelPx >= 0) drawSelectionOverlay(lastSelPx, lastSelPy);
    return;
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  const w = convertedData.width;
  const h = convertedData.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (convertedData.paletteMap[y * w + x] === palIdx) {
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(232, 90, 12, 0.95)';
  ctx.lineWidth = Math.max(1, zoom * 0.12);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (convertedData.paletteMap[y * w + x] === palIdx) {
        ctx.strokeRect(x * zoom + 0.5, y * zoom + 0.5, zoom - 1, zoom - 1);
      }
    }
  }

  if (lastSelPx >= 0) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(2, zoom * 0.3);
    ctx.strokeRect(lastSelPx * zoom, lastSelPy * zoom, zoom, zoom);
  }
}

function setHoverPalette(palIdx) {
  if (recipeBlinkActive && palIdx !== hoverPaletteIdx) {
    recipeBlinkActive = false;
  }
  hoverPaletteIdx = palIdx;

  document.querySelectorAll('.palette-cell').forEach(cell => {
    cell.classList.toggle('hover-target', parseInt(cell.dataset.idx, 10) === palIdx);
  });
  document.querySelectorAll('.recipe-row').forEach(row => {
    row.classList.toggle('hover-target', parseInt(row.dataset.idx, 10) === palIdx);
  });
  drawHighlight(palIdx);
}

function attachPaletteHover() {
  document.querySelectorAll('.palette-cell').forEach(cell => {
    const idx = parseInt(cell.dataset.idx, 10);
    cell.addEventListener('mouseenter', () => setHoverPalette(idx));
    cell.addEventListener('mouseleave', () => setHoverPalette(-1));

    cell.addEventListener('click', () => {
      if (hoverPaletteIdx === idx) setHoverPalette(-1);
      else setHoverPalette(idx);
    });
  });
}
