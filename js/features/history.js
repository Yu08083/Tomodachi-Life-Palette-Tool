
const HISTORY_KEY = 'spoito_history_v1';
const HISTORY_MAX = 10;
const HISTORY_THUMB_SIZE = 256;

function _historyLoad() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function _historySave(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

function _historyMakeThumb(srcCanvas) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const maxSide = HISTORY_THUMB_SIZE;
  let tw = w, th = h;
  if (w > maxSide || h > maxSide) {
    if (w >= h) {
      tw = maxSide;
      th = Math.round(h * maxSide / w);
    } else {
      th = maxSide;
      tw = Math.round(w * maxSide / h);
    }
  }
  const out = document.createElement('canvas');
  out.width = tw;
  out.height = th;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(srcCanvas, 0, 0, tw, th);
  return out.toDataURL('image/png');
}

function historyAdd(srcCanvas, originalW, originalH) {
  if (!srcCanvas || !srcCanvas.width || !srcCanvas.height) return false;
  let list = _historyLoad();
  let dataUrl;
  try {
    dataUrl = _historyMakeThumb(srcCanvas);
  } catch (e) {
    return false;
  }
  const item = {
    id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    dataUrl,
    width: originalW || srcCanvas.width,
    height: originalH || srcCanvas.height,
    savedAt: Date.now()
  };
  list = list.filter(x => x.dataUrl !== dataUrl);
  list.unshift(item);
  while (list.length > HISTORY_MAX) list.pop();

  let ok = _historySave(list);
  while (!ok && list.length > 1) {
    list.pop();
    ok = _historySave(list);
  }
  if (!ok && typeof t === 'function') {
    console.warn(t('history.storageFail'));
  }
  if (typeof renderHistoryList === 'function') renderHistoryList();
  return ok;
}

function historyRemove(id) {
  const list = _historyLoad().filter(x => x.id !== id);
  _historySave(list);
  renderHistoryList();
}

function historyClear() {
  if (!confirm(t('history.confirmClear'))) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistoryList();
}

function _formatHistoryDate(savedAt) {
  const now = Date.now();
  const diff = now - savedAt;
  const day = 24 * 60 * 60 * 1000;
  const today0 = new Date(); today0.setHours(0,0,0,0);
  const yest0 = new Date(today0.getTime() - day);
  const sd = new Date(savedAt);
  if (sd >= today0) return t('history.today');
  if (sd >= yest0) return t('history.yesterday');
  const days = Math.floor((today0.getTime() - sd.setHours(0,0,0,0)) / day);
  return t('history.savedAgo', { n: days });
}

function _renderHistoryInto(targetSec, listEl, emptyEl, clearBtn, list) {
  if (clearBtn) clearBtn.textContent = t('history.clear');
  if (emptyEl) emptyEl.textContent = t('history.empty');

  if (!listEl) return;
  listEl.innerHTML = '';

  if (list.length === 0) {
    if (targetSec) targetSec.classList.add('history-empty-state');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (targetSec) targetSec.classList.remove('history-empty-state');
  if (clearBtn) clearBtn.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');

  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.dataset.id = item.id;

    const img = document.createElement('img');
    img.className = 'history-thumb';
    img.src = item.dataUrl;
    img.alt = '';
    img.loading = 'lazy';
    card.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'history-meta';
    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'history-size';
    sizeSpan.textContent = `${item.width}×${item.height}`;
    const dateSpan = document.createElement('span');
    dateSpan.className = 'history-date';
    dateSpan.textContent = _formatHistoryDate(item.savedAt);
    meta.appendChild(sizeSpan);
    meta.appendChild(dateSpan);
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'history-actions';
    const useBtn = document.createElement('button');
    useBtn.type = 'button';
    useBtn.className = 'history-use-btn';
    useBtn.textContent = t('history.use');
    useBtn.addEventListener('click', () => {
      const modal = document.getElementById('modal-history');
      if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
      historyRestore(item.id);
    });
    actions.appendChild(useBtn);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'history-remove-btn';
    removeBtn.setAttribute('aria-label', t('history.remove'));
    removeBtn.title = t('history.remove');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      historyRemove(item.id);
    });
    actions.appendChild(removeBtn);

    card.appendChild(actions);
    listEl.appendChild(card);
  });
}

function renderHistoryList() {
  const list = _historyLoad();

  const sec = document.getElementById('history-section');
  if (sec) {
    const titleEl = sec.querySelector('.history-title');
    if (titleEl) titleEl.textContent = t('history.title');
    _renderHistoryInto(
      sec,
      sec.querySelector('#history-list'),
      sec.querySelector('#history-empty'),
      sec.querySelector('#history-clear-btn'),
      list
    );
  }

  const modal = document.getElementById('modal-history');
  if (modal) {
    const titleEl2 = modal.querySelector('h2');
    if (titleEl2) titleEl2.textContent = t('history.title');
    _renderHistoryInto(
      modal,
      modal.querySelector('#history-list-modal'),
      modal.querySelector('#history-empty-modal'),
      modal.querySelector('#history-clear-btn-modal'),
      list
    );
  }

  const openBtn = document.getElementById('history-open-btn');
  if (openBtn) openBtn.textContent = t('history.title');
}

function historyRestore(id) {
  const list = _historyLoad();
  const item = list.find(x => x.id === id);
  if (!item) return;
  const img = new Image();
  img.onload = () => {
    if (typeof loadImageFromImg === 'function') {
      loadImageFromImg(img);
    }
  };
  img.src = item.dataUrl;
}

function attachHistoryControls() {
  const clearBtn = document.getElementById('history-clear-btn');
  if (clearBtn) clearBtn.addEventListener('click', historyClear);
  const clearBtnModal = document.getElementById('history-clear-btn-modal');
  if (clearBtnModal) clearBtnModal.addEventListener('click', historyClear);
  renderHistoryList();
  window.addEventListener('i18nchange', renderHistoryList);
}
