
const SHARE_BASE_URL = 'https://yu08083.github.io/Tomodachi-Life-Palette-Tool/';
const SHARE_EMOJIS = ['🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍'];

function _shareRandomUrl() {
  const r = Math.random().toString(36).slice(2, 8);
  return SHARE_BASE_URL + '?' + r;
}

function _shareRandomEmojis(n) {
  const pool = SHARE_EMOJIS.slice();
  const out = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function _buildTweetText() {
  const e = _shareRandomEmojis(4);
  const body = t('share.tweetText');
  const tagline = t('share.tweetTagline');
  return `${e[0]} すぽいと帳 / Spoito-cho ${e[1]}\n\n${body}\n\n${e[2]} ${tagline} ${e[3]}`;
}

function shareTweet() {
  const url = _shareRandomUrl();
  const text = _buildTweetText();
  const intent = 'https://twitter.com/intent/tweet'
    + '?text=' + encodeURIComponent(text)
    + '&url=' + encodeURIComponent(url);
  window.open(intent, '_blank', 'noopener,noreferrer');
  closeModal('modal-share');
}

async function shareCopyLink() {
  const url = _shareRandomUrl();
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      ok = true;
    }
  } catch (e) {}
  if (!ok) {
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) {}
  }
  if (ok) _shareToast(t('share.copied'));
  closeModal('modal-share');
}

async function shareNative() {
  const url = _shareRandomUrl();
  const text = t('share.tweetText');
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Spoito-cho',
        text,
        url
      });
      closeModal('modal-share');
    } catch (e) {}
  }
}

function _shareToast(msg) {
  let el = document.getElementById('share-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'share-toast';
    el.className = 'share-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2000);
}

function attachShareControls() {
  const btn = document.getElementById('share-btn');
  if (btn) btn.addEventListener('click', () => openModal('modal-share'));

  const tweetBtn = document.getElementById('share-tweet-btn');
  if (tweetBtn) tweetBtn.addEventListener('click', shareTweet);

  const copyBtn = document.getElementById('share-copy-btn');
  if (copyBtn) copyBtn.addEventListener('click', shareCopyLink);

  const nativeBtn = document.getElementById('share-native-btn');
  if (nativeBtn) {
    if (navigator.share) {
      nativeBtn.classList.remove('hidden');
      nativeBtn.addEventListener('click', shareNative);
    } else {
      nativeBtn.classList.add('hidden');
    }
  }
}
