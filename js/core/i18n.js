
const I18N_SUPPORTED = ['ja', 'en', 'ko', 'fr', 'es', 'zh-TW', 'zh-CN', 'de', 'it', 'nl', 'pt-BR', 'ru'];
const I18N_FALLBACK  = 'ja';
const I18N_STORAGE   = 'spoito_lang';

const I18N_NATIVE_NAMES = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  fr: 'Français',
  es: 'Español',
  'zh-TW': '繁體中文',
  'zh-CN': '简体中文',
  de: 'Deutsch',
  it: 'Italiano',
  nl: 'Nederlands',
  'pt-BR': 'Português (BR)',
  ru: 'Русский'
};

let i18nDict = {};
let i18nCurrent = I18N_FALLBACK;

function i18nDetect() {
  try {
    const url = new URL(window.location.href);
    const urlLang = url.searchParams.get('lang');
    if (urlLang && I18N_SUPPORTED.includes(urlLang)) return urlLang;
  } catch (_) {  }

  try {
    const saved = localStorage.getItem(I18N_STORAGE);
    if (saved && I18N_SUPPORTED.includes(saved)) return saved;
  } catch (_) {  }

  const cands = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || I18N_FALLBACK];

  const REGION_MAP = {
    'zh-hant': 'zh-TW', 'zh-tw': 'zh-TW', 'zh-hk': 'zh-TW', 'zh-mo': 'zh-TW',
    'zh-hans': 'zh-CN', 'zh-cn': 'zh-CN', 'zh-sg': 'zh-CN', 'zh-my': 'zh-CN',
    'pt-br':   'pt-BR'
  };

  for (const lang of cands) {
    const lower = String(lang).toLowerCase();

    const exact = I18N_SUPPORTED.find(s => s.toLowerCase() === lower);
    if (exact) return exact;

    if (REGION_MAP[lower]) return REGION_MAP[lower];

    const code = lower.split('-')[0];
    const partial = I18N_SUPPORTED.find(s => s.toLowerCase() === code);
    if (partial) return partial;
  }
  return I18N_FALLBACK;
}

async function i18nLoad(lang) {
  if (!I18N_SUPPORTED.includes(lang)) lang = I18N_FALLBACK;
  try {
    const res = await fetch(`./js/i18n/${lang}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    i18nDict = await res.json();
    i18nCurrent = lang;
    document.documentElement.lang = lang;
    i18nApply();
    i18nUpdateSwitcher();
    window.dispatchEvent(new CustomEvent('i18nchange', { detail: { lang } }));
  } catch (e) {
    console.warn(`[i18n] ${lang}.json 読み込み失敗`, e);
    if (lang !== I18N_FALLBACK) await i18nLoad(I18N_FALLBACK);
  }
}

function t(key, params) {
  let val = key.split('.').reduce((o, k) => (o == null ? o : o[k]), i18nDict);
  if (val == null) return key;
  if (params && typeof val === 'string') {
    val = val.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : `{${k}}`));
  }
  return val;
}

function i18nApply() {

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const v = t(key);
    if (v !== key) el.textContent = v;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    const v = t(key);
    if (v !== key) el.innerHTML = v;
  });

  document.querySelectorAll('*').forEach(el => {
    for (const name of el.getAttributeNames()) {
      if (!name.startsWith('data-i18n-attr-')) continue;
      const attrName = name.slice('data-i18n-attr-'.length);
      const key = el.getAttribute(name);
      const v = t(key);
      if (v !== key) el.setAttribute(attrName, v);
    }
  });

  const titleVal = t('meta.title');
  if (titleVal !== 'meta.title') document.title = titleVal;

  const descVal = t('meta.description');
  if (descVal !== 'meta.description') {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', descVal);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', descVal);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', descVal);
  }

  if (titleVal !== 'meta.title') {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', titleVal);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', titleVal);
  }
}

function i18nUpdateSwitcher() {

  document.querySelectorAll('[data-lang]').forEach(btn => {
    const isActive = btn.dataset.lang === i18nCurrent;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
    btn.setAttribute('aria-checked', String(isActive));
  });

  const currentLabel = document.querySelector('.lang-switch .lang-current');
  if (currentLabel) {
    currentLabel.textContent = I18N_NATIVE_NAMES[i18nCurrent] || i18nCurrent;
    currentLabel.lang = i18nCurrent;
  }
}

function i18nSetupSwitcher() {
  const root = document.querySelector('.lang-switch');
  if (!root) return;

  const menu = root.querySelector('.lang-menu');

  if (menu && menu.parentNode !== document.body) {
    document.body.appendChild(menu);
  }

  let backdrop = document.querySelector('.lang-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'lang-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
  }
  backdrop.addEventListener('click', () => closeLangMenu());

  if (menu && menu.children.length === 0) {
    I18N_SUPPORTED.forEach(code => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.lang = code;
      btn.lang = code;
      btn.setAttribute('role', 'menuitemradio');
      btn.setAttribute('aria-checked', 'false');
      btn.textContent = I18N_NATIVE_NAMES[code] || code;
      menu.appendChild(btn);
    });
  }

  if (menu) {
    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lang]');
      if (!btn) return;
      const lang = btn.dataset.lang;
      try { localStorage.setItem(I18N_STORAGE, lang); } catch (_) {}
      i18nLoad(lang);
      closeLangMenu();
    });
  }

  const toggle = root.querySelector('.lang-toggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !root.classList.contains('is-open');
      if (willOpen) openLangMenu();
      else          closeLangMenu();
    });
  }

  window.addEventListener('scroll', () => {
    if (root.classList.contains('is-open') && !isMobileLayout()) positionLangMenu();
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (root.classList.contains('is-open')) {
      if (isMobileLayout()) {

      } else {
        positionLangMenu();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (root.contains(e.target)) return;
    if (menu && menu.contains(e.target)) return;
    if (backdrop && backdrop.contains(e.target)) return;
    closeLangMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLangMenu();
  });

  function isMobileLayout() {
    return window.matchMedia('(max-width: 600px)').matches;
  }

  function openLangMenu() {
    if (!isMobileLayout()) {
      positionLangMenu();
    }
    root.classList.add('is-open');
    if (menu) menu.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
    if (isMobileLayout()) document.body.classList.add('lang-sheet-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  function positionLangMenu() {
    if (!toggle || !menu) return;
    const r = toggle.getBoundingClientRect();
    menu.style.top = (r.bottom + 8) + 'px';
    const rightFromWindow = Math.max(12, window.innerWidth - r.right);
    menu.style.right = rightFromWindow + 'px';
  }

  function closeLangMenu() {
    root.classList.remove('is-open');
    if (menu) menu.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    document.body.classList.remove('lang-sheet-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
}

async function initI18n() {
  i18nSetupSwitcher();
  await i18nLoad(i18nDetect());
}

window.t = t;
window.initI18n = initI18n;
window.i18nGetLang = () => i18nCurrent;
window.i18nNativeName = (code) => I18N_NATIVE_NAMES[code] || code;
