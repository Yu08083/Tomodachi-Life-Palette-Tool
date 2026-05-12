
function hueToPresses(h) {
  const anchors = [
    { h: 360, p: 0   },
    { h: 300, p: 26  },
    { h: 240, p: 64  },
    { h: 180, p: 100 },
    { h: 120, p: 136 },
    { h: 60,  p: 174 },
    { h: 0,   p: 200 }
  ];
  if (h === 0) return 200;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a1 = anchors[i];
    const a2 = anchors[i + 1];
    if (h <= a1.h && h >= a2.h) {
      const ratio = (a1.h - h) / (a1.h - a2.h);
      return Math.round(a1.p + ratio * (a2.p - a1.p));
    }
  }
  return 0;
}

function valueToPresses(v) {
  const vNorm = v / 100;
  const pos = Math.pow(vNorm, 1 / 2.26);
  const presses = Math.round((1 - pos) * 111);
  return Math.max(0, Math.min(111, presses));
}

function saturationToPresses(s) {
  const sNorm = s / 100;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const v = 0.49 * mid + 0.2 * Math.pow(mid, 38) + 0.31 * Math.pow(mid, 3.9);
    if (v < sNorm) lo = mid; else hi = mid;
  }
  const pos = (lo + hi) / 2;
  const presses = Math.round(pos * 212);
  return Math.max(0, Math.min(212, presses));
}

function updateFullColorGuide(hsv, r, g, b) {
  const { h, s, v } = hsv;

  const huePresses = hueToPresses(h);
  const huePct = (huePresses / 200) * 100;

  document.getElementById('hue-indicator').style.left = huePct + '%';
  document.getElementById('hue-num').textContent = h;
  document.getElementById('hue-presses-r').textContent = huePresses;
  document.getElementById('hue-presses-l').textContent = (200 - huePresses);

  drawSvSquare(h);
  const svCanvas = document.getElementById('sv-canvas');

  const satPresses = saturationToPresses(s);
  const valPresses = valueToPresses(v);

  const sxPct = (satPresses / 212) * 100;
  const syPct = (valPresses / 111) * 100;
  const ind = document.getElementById('sv-indicator');
  ind.style.left = sxPct + '%';
  ind.style.top  = syPct + '%';

  document.getElementById('sat-presses-r').textContent = satPresses;
  document.getElementById('sat-presses-l').textContent = (212 - satPresses);
  document.getElementById('val-presses-d').textContent = valPresses;
  document.getElementById('val-presses-u').textContent = (111 - valPresses);

  const stepsBox = document.getElementById('steps-box');
  stepsBox.innerHTML = `
    <ol>
      <li>「フルカラー」タブを選択する</li>
      <li>正方形を一番左上（白）に戻す</li>
      <li>そこから右へ <strong>約 ${satPresses} 回</strong>、下へ <strong>約 ${valPresses} 回</strong> 動かす</li>
      <li>色相スライダーを一番左（ZL）まで戻す</li>
      <li>そこから右（ZR）へ <strong>約 ${huePresses} 回</strong> 動かす<br>（一番右から左（ZL）へ ${200 - huePresses} 回でもOK）</li>
    </ol>
  `;

  setLastGuideValues({
    hex: rgbToHex(r, g, b),
    h, s, v,
    huePresses, satPresses, valPresses
  });
}

function drawSvSquare(hue) {
  const canvas = document.getElementById('sv-canvas');
  const ctx = canvas.getContext('2d');

  const cssW = canvas.clientWidth || 280;
  const cssH = canvas.clientHeight || 140;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  const W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.fillRect(0, 0, W, H);

  const gradS = ctx.createLinearGradient(0, 0, W, 0);
  gradS.addColorStop(0, 'rgba(255,255,255,1)');
  gradS.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradS;
  ctx.fillRect(0, 0, W, H);

  const gradV = ctx.createLinearGradient(0, 0, 0, H);
  gradV.addColorStop(0, 'rgba(0,0,0,0)');
  gradV.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = gradV;
  ctx.fillRect(0, 0, W, H);
}

let lastGuideValues = null;

function setLastGuideValues(values) {
  lastGuideValues = values;
}

function copyGuideSteps() {
  if (!lastGuideValues) {
    alert(t('fullcolor.selectFirst'));
    return;
  }
  const v = lastGuideValues;
  const lines = [
    `${t('fullcolor.clipTitle')}: ${v.hex}`,
    `${t('fullcolor.clipHsv')}: ${v.h}°, ${v.s}%, ${v.v}%`,
    ``,
    t('fullcolor.clipHeader'),
    t('fullcolor.clipStep1'),
    t('fullcolor.clipStep2'),
    t('fullcolor.clipStep3', { sat: v.satPresses, val: v.valPresses }),
    t('fullcolor.clipStep4'),
    t('fullcolor.clipStep5', { hue: v.huePresses }),
    t('fullcolor.clipStep5b', { hueRev: 200 - v.huePresses }),
  ].join('\n');

  navigator.clipboard?.writeText(lines).then(() => {
    flashCopyBtn(true);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = lines;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      flashCopyBtn(true);
    } catch (e) {
      flashCopyBtn(false);
    }
    document.body.removeChild(ta);
  });
}

function flashCopyBtn(ok) {
  const btn = document.getElementById('copy-steps-btn');
  if (!btn) return;

  const original = t('fullcolor.copySteps');
  btn.textContent = ok ? t('fullcolor.copyOk') : t('fullcolor.copyFail');
  btn.classList.add('flash');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('flash');
  }, 1500);
}

function attachCopyStepsButton() {
  const btn = document.getElementById('copy-steps-btn');
  if (btn) btn.addEventListener('click', copyGuideSteps);
}
