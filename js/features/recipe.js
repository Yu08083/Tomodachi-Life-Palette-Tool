
const RECIPE_STORAGE_PREFIX = 'supoito_progress_';
let recipeCheckState = {};
let recipeKey = '';
let recipeBlinkRAF = null;
let recipeBlinkStart = 0;
let recipeBlinkActive = false;

const doneState = {
  isDone(idx) {
    return idx != null && idx >= 0 && !!recipeCheckState[idx];
  },
  any() {
    for (const k in recipeCheckState) if (recipeCheckState[k]) return true;
    return false;
  },
  count() {
    let n = 0;
    for (const k in recipeCheckState) if (recipeCheckState[k]) n++;
    return n;
  },
  set(idx, value) {
    if (idx == null || idx < 0) return;
    if (value) recipeCheckState[idx] = true;
    else       delete recipeCheckState[idx];
    if (recipeKey) _saveCheckState(recipeKey, recipeCheckState);
    doneState._notify();
  },
  toggle(idx) {
    if (idx == null || idx < 0) return;
    doneState.set(idx, !recipeCheckState[idx]);
  },
  reset() {
    if (!doneState.any()) return;
    for (const k in recipeCheckState) delete recipeCheckState[k];
    if (recipeKey) _saveCheckState(recipeKey, recipeCheckState);
    doneState._notify();
  },
  _notify() {
    if (typeof updateRecipeRowChecks === 'function') updateRecipeRowChecks();
    if (typeof updateRecipeSummary === 'function') updateRecipeSummary();
    if (typeof _updateDoneButtonState === 'function') _updateDoneButtonState();
    if (typeof applyPaletteUsedFilter === 'function') applyPaletteUsedFilter();
    if (typeof renderPixelCanvas === 'function') renderPixelCanvas();
  },
  _refreshAfterRebuild() {
    doneState._notify();
  },
};

function isDoneColor(idx) { return doneState.isDone(idx); }

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

  if (!convertedData) {
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
  summaryEl.innerHTML = t('recipe.summaryHtml', { colors: recipe.length, cells: total, done: checkedCount });

  if (typeof _updateDoneButtonState === 'function') _updateDoneButtonState();

  listEl.innerHTML = '';
  recipe.forEach(item => {
    const p = PALETTE[item.idx];
    const checked = !!recipeCheckState[item.idx];
    const row = document.createElement('div');
    row.className = 'recipe-row' + (checked ? ' checked' : '');
    row.dataset.idx = item.idx;
    row.innerHTML = `
      <button class="recipe-check" data-idx="${item.idx}" aria-label="${t('recipe.checkAria')}">
        <span class="recipe-check-mark"></span>
      </button>
      <div class="recipe-swatch" style="background:${p.h}"></div>
      <div class="recipe-info">
        <div class="recipe-pos">${t('color.rowCol', { row: p.row + 1, col: p.col + 1 })}</div>
        <div class="recipe-hex">${p.h.toUpperCase()}</div>
      </div>
      <div class="recipe-count">
        <div class="recipe-num">${item.count}<span class="recipe-unit">cells</span></div>
        <div class="recipe-pct">${(item.pct * 100).toFixed(1)}%</div>
      </div>
      <button class="recipe-blink" data-idx="${item.idx}" aria-label="${t('recipe.blinkAria')}" title="${t('recipe.blinkTitle')}">
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

  doneState._refreshAfterRebuild();
  if (typeof updateDifficultyDisplay === 'function') updateDifficultyDisplay();
}

function updateRecipeRowChecks() {
  document.querySelectorAll('.recipe-row[data-idx]').forEach(row => {
    const idx = parseInt(row.dataset.idx, 10);
    row.classList.toggle('checked', doneState.isDone(idx));
  });
}

function updateRecipeSummary() {
  const summaryEl = document.getElementById('recipe-summary');
  if (!summaryEl) return;
  const recipe = computeRecipe();
  if (!recipe.length) { summaryEl.innerHTML = ''; return; }
  const total = recipe[0].total;
  const checkedCount = recipe.filter(it => doneState.isDone(it.idx)).length;
  summaryEl.innerHTML = t('recipe.summaryHtml', { colors: recipe.length, cells: total, done: checkedCount });
}

function toggleRecipeCheck(idx) {
  doneState.toggle(idx);
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
  clearOverlayWithGrid();
  const ctx = overlayCanvas.getContext('2d');

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

  clearOverlayWithGrid();
  const ctx = overlayCanvas.getContext('2d');

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

      const p = PALETTE[idx];
      if (p && typeof selectColor === 'function') {
        const c = hexToRgb(p.h);
        selectColor(c.r, c.g, c.b, -1, -1);
      }
    });
  });
}

function computeDifficulty() {
  if (!convertedData) return null;
  const colors = convertedData.usedSet ? convertedData.usedSet.size : 0;
  if (!colors) return null;

  const W = convertedData.width, H = convertedData.height;
  const map = convertedData.paletteMap;
  const bounds = new Map();
  const counts = new Map();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = map[y * W + x];
      if (idx < 0) continue;
      counts.set(idx, (counts.get(idx) || 0) + 1);
      const b = bounds.get(idx);
      if (!b) bounds.set(idx, { x0: x, y0: y, x1: x, y1: y });
      else {
        if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x;
        if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      }
    }
  }

  let scatterSum = 0, n = 0;
  bounds.forEach((b, idx) => {
    const c = counts.get(idx) || 0;
    if (c < 2) return;
    const area = (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1);
    const density = c / area;
    scatterSum += (1 - density);
    n++;
  });
  const scatter = n > 0 ? scatterSum / n : 0;

  const colorFactor = Math.min(50, Math.round(50 * Math.log2(colors + 1) / Math.log2(85)));
  const scatterFactor = Math.round(50 * scatter);
  const score = Math.max(1, Math.min(100, colorFactor + scatterFactor));

  let label, tier;
  if (score < 20)       { label = 'easy';   tier = 1; }
  else if (score < 40)  { label = 'normal'; tier = 2; }
  else if (score < 60)  { label = 'medium'; tier = 3; }
  else if (score < 80)  { label = 'hard';   tier = 4; }
  else                  { label = 'expert'; tier = 5; }

  return { score, label, tier, colors, scatter };
}

function updateDifficultyDisplay() {
  const el = document.getElementById('difficulty-badge');
  if (!el) return;
  const d = computeDifficulty();
  if (!d) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.className = `difficulty-badge diff-tier-${d.tier}`;
  el.classList.remove('hidden');
  const labelTxt = (typeof t === 'function') ? t('difficulty.' + d.label) : d.label;
  const aria = (typeof t === 'function')
    ? t('difficulty.aria', { score: d.score, label: labelTxt })
    : `Difficulty ${d.score} (${labelTxt})`;
  el.setAttribute('aria-label', aria);
  el.innerHTML =
    `<span class="diff-score">${d.score}</span>` +
    `<span class="diff-label">${labelTxt}</span>` +
    `<button class="diff-help-btn" type="button" onclick="openModal('modal-difficulty')" aria-label="?"><span aria-hidden="true">?</span></button>`;
}
