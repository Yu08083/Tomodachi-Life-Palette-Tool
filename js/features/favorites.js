
const FAV_STORAGE_KEY = 'supoito_favorites';
const FAV_MAX = 24;
let favorites = [];

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY);
    favorites = raw ? JSON.parse(raw) : [];
  } catch (e) {
    favorites = [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favorites));
  } catch (e) {}
}

function addFavorite(hex) {
  if (!hex) return;
  const norm = hex.toUpperCase();
  favorites = favorites.filter(f => f.hex !== norm);
  favorites.unshift({ hex: norm, time: Date.now() });
  if (favorites.length > FAV_MAX) favorites = favorites.slice(0, FAV_MAX);
  saveFavorites();
  renderFavorites();
}

function removeFavorite(hex) {
  favorites = favorites.filter(f => f.hex !== hex.toUpperCase());
  saveFavorites();
  renderFavorites();
}

function clearFavorites() {
  if (!favorites.length) return;
  if (!confirm(t('favorites.confirmClear'))) return;
  favorites = [];
  saveFavorites();
  renderFavorites();
}

function renderFavorites() {
  const wrap = document.getElementById('favorites-wrap');
  const list = document.getElementById('favorites-list');
  const empty = document.getElementById('favorites-empty');
  const count = document.getElementById('favorites-count');
  if (!wrap || !list) return;

  count.textContent = `${favorites.length} / ${FAV_MAX}`;

  if (favorites.length === 0) {
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  list.classList.remove('hidden');
  empty.classList.add('hidden');
  list.innerHTML = '';

  favorites.forEach(f => {
    const cell = document.createElement('div');
    cell.className = 'fav-cell';
    cell.title = f.hex;
    cell.innerHTML = `
      <button class="fav-swatch" style="background:${f.hex}" data-hex="${f.hex}" aria-label="${t('favorites.reselectAria', { hex: f.hex })}"></button>
      <button class="fav-remove" data-hex="${f.hex}" aria-label="${t('favorites.removeAria')}">×</button>
      <span class="fav-hex">${f.hex}</span>
    `;
    cell.querySelector('.fav-swatch').addEventListener('click', () => {
      const rgb = parseHexInput(f.hex);
      if (rgb) selectColor(rgb.r, rgb.g, rgb.b, -1, -1);
    });
    cell.querySelector('.fav-remove').addEventListener('click', e => {
      e.stopPropagation();
      removeFavorite(f.hex);
    });
    list.appendChild(cell);
  });
}

function attachFavorites() {
  loadFavorites();
  renderFavorites();

  const addBtn = document.getElementById('fav-add-btn');
  const clearBtn = document.getElementById('fav-clear-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const hexEl = document.getElementById('hex-val');
      if (!hexEl) return;
      const hex = hexEl.textContent.trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
        alert(t('fullcolor.selectFirst'));
        return;
      }
      addFavorite(hex);
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFavorites);
  }
}
