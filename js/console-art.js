
(function() {
  if (typeof window === 'undefined' || !window.console) return;
  if (window._spoitoConsoleInit) return;
  window._spoitoConsoleInit = true;

  const C = {
    O:    '#FF6B1A',
    OD:   '#FF8533',
    INK:  '#D9B891',
    INK2: '#C9A77A',
    INK3: '#A87E5D',
    Y:    '#FFD43A',
    G:    '#5AC882',
    B:    '#5EB8F0',
    P:    '#B388E0',
    PINK: '#FA82B4',
    R:    '#FF6B6B',
    K:    '#1A1A1A'
  };

  const S = {
    logo:    `color:${C.O};font-family:'JetBrains Mono','Courier New',monospace;font-weight:800;font-size:13px;line-height:1.15;text-shadow:1px 1px 0 rgba(217,79,8,0.4);`,
    sub:     `color:${C.INK2};font-size:12px;font-family:sans-serif;`,
    greet:   `color:${C.OD};font-size:15px;font-weight:800;font-family:sans-serif;padding:4px 0;`,
    sect:    `color:${C.O};font-size:11px;font-weight:800;font-family:'JetBrains Mono',monospace;letter-spacing:0.15em;`,
    label:   `color:${C.O};font-weight:800;font-size:12px;font-family:'JetBrains Mono',monospace;`,
    val:     `color:${C.INK};font-size:12px;font-family:'JetBrains Mono',monospace;`,
    cmd:     `background:${C.K};color:${C.Y};font-weight:800;padding:3px 10px;border-radius:4px;font-size:12px;font-family:'JetBrains Mono',monospace;`,
    cmdDesc: `color:${C.INK2};font-size:12px;font-family:sans-serif;padding-left:8px;`,
    rule:    `color:${C.O};font-family:monospace;font-size:11px;`,
    hint:    `color:${C.INK3};font-size:11px;font-style:italic;font-family:sans-serif;`,
    cap:     `color:${C.INK3};font-size:11px;font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;`,
    flag:    `font-size:14px;`,
    word:    `color:${C.INK};font-size:13px;font-weight:700;font-family:sans-serif;padding-left:6px;`,
    rowLbl:  `color:${C.INK2};font-size:10px;font-family:'JetBrains Mono',monospace;padding-right:4px;`
  };

  const PAL = [
    '#FFFFFF','#F1F0F8','#F0F0F8','#F0F7FF','#F0FBF3','#F1F3EE','#F4FAF0','#FCFDEF','#FEF3EF','#FAF0EF','#FDEDDD','#FE0000',
    '#EBEBEB','#CFC8E9','#C7CDE7','#C8E8FD','#C9F1D7','#C8DBC8','#DAEFC8','#FBF9C8','#FCD6C9','#EFC9C8','#E4CFB0','#FFFF00',
    '#D5D5D3','#A692D7','#929FD4','#92D6FD','#93E6BA','#92BC94','#BBE194','#FAF492','#FAB492','#E19691','#CAA976','#05FF00',
    '#BCBCBC','#6500C2','#004BC0','#08C2FD','#00DA90','#019616','#92D315','#F9F001','#F68400','#D42700','#90620D','#01FFFF',
    '#9C9C9A','#5600A9','#0040A4','#01A5D8','#02BC7B','#04800E','#7DB50C','#D6CE01','#D57101','#B62100','#774200','#0000FE',
    '#727272','#420084','#013281','#0283AB','#00935F','#01650D','#638D0D','#A8A301','#A85801','#901600','#5D380C','#8801FE',
    '#000000','#22004C','#001648','#014962','#015534','#013800','#355001','#605D00','#612E01','#510D00','#34220C','#FF00C2'
  ];

  function pix(idx, w, h) {
    const c = (idx === -1) ? 'transparent' : PAL[idx];
    return `background:${c};padding:${h}px ${w}px;font-size:0;line-height:1;`;
  }

  function rainbow(text, size) {
    const colors = [C.R, C.O, C.Y, C.G, C.B, C.P];
    let str = '';
    const arr = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      str += '%c' + ch;
      if (ch === ' ') {
        arr.push('font-size:' + size + 'px;');
      } else {
        arr.push(`color:${colors[i % colors.length]};font-size:${size}px;font-weight:800;text-shadow:1px 1px 0 rgba(0,0,0,0.18);font-family:sans-serif;`);
      }
    }
    return [str, ...arr];
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 6)        return { en: 'Working late?',  ja: '夜更かしお疲れさま' };
    if (h < 12)       return { en: 'Good morning',   ja: 'おはようございます' };
    if (h < 18)       return { en: 'Hello there',    ja: 'こんにちは' };
                       return { en: 'Good evening',  ja: 'こんばんは' };
  }

  function drawArt(rows, pixW, pixH) {
    for (const row of rows) {
      let str = '';
      const styles = [];
      for (const idx of row) {
        str += '%c ';
        styles.push(pix(idx, pixW, pixH));
      }
      console.log(str, ...styles);
    }
  }

  function drawPaletteGrid(cellW, cellH) {
    for (let row = 0; row < 7; row++) {
      let str = '';
      const styles = [];
      for (let col = 0; col < 12; col++) {
        const idx = row * 12 + col;
        str += '%c ';
        styles.push(pix(idx, cellW, cellH));
      }
      console.log(str, ...styles);
    }
  }

  const SCENE = [
    [73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73,73],
    [73,73,74,74, 0,74,74,74,74,74,74,74,74, 3,74,74,74,74,74,26,74,74,74,74,74, 0,74,74,74,74,74,73],
    [74,74,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,49,74],
    [49,49,37,37,49,71,71,61,71,49,49,49,49,49, 3,49,49,49,49,49,49,49,49,49,71,71,49,49,49,49,49,49],
    [49,37,37,25,25,25,25,25,25,14,14,14,25,25,25,25,25,25,25,25,25,25,25,14,14,25,25,25,25,25,25,49],
    [37,25,25,13,13,13,13,13, 9, 9, 9,13,13,13,13,13,13,13,13,13,13,13,13,13, 9,13,13,13,13,13,25,37],
    [25,13,13,13,21,21,21,21,21,21,20,20,21,21,21,21,21,21,21,21,21,21,21,21,21, 2, 2,21,21,21,13,25],
    [13,13,21,21,21,33,33,33,33,33, 8, 8,33,33,33,33,33,33,33,33,33,33,33,33,33,10,10,33,33,33,21,13],
    [21,21,33,33,33,33,32,32,32,32,32,32,32,32,32,31,31,31,32,32,32,32,72,32,32,32,32,32,33,33,21,21],
    [21,33,32,32,32,32,32, 1, 1,14,14,75,32,19,43,43,19,32,32,75,14,14, 1, 1,32,72,72,32,32,32,33,21],
    [33,32,32,32, 1,14,75,62,75,62,75,32,19,43,23,23,43,19,32,75,62,75,62,14, 1,32,32,32,32,32,32,33],
    [32,32,75,62, 1,14,75,62,62,14,75,32,32,19,23,23,19,32,32,75,14,62,62,75,14, 1,62,75,32,32,32,32],
    [32,75,62,14,75, 1,75,57,45,11,69,75,32,32,44,44,32,32,75,75,14,62,75,62, 1,14,62,75,75,32,32,32],
    [75,62,14,11,57,11,11,56,11,69,81,75,12,36,12,32,32,75,62,14,75,62,75, 1,14,75,78,77,76,75,75,32],
    [62, 1,11,57,22,22,80,22,57,11,75,75,36,60,12,36,75,75,75,77,76,78,76,77,78,76,77,78,76,77,75,32],
    [75,11,46,22,80,46,22,80,46,70,82,70,46,46,70,82,46,70,77,53,65,52,40,76,78,65,77,64,53,65,41,66],
    [70,46,68,15,15,27,15,15,27,15,27,15,27,15,27,15,15,27,15,15,27,15,15,27,15,15,27,15,15,15,15,46],
    [46,68,39,39,51,39,51,39,51,39,51,39,47,47,47,39,51,39,51,39,51,39,51,39,51,63,39,51,39,51,39,68],
    [68,58,51,63,38,50,63,38,50,38,63,50,38,50,38,72,72,38,38,50,63,38,50,38,51,63,38,50,63,51,63,58],
    [58,46,24,36,12,34,48,60,22,34,12,24, 7,36,72,72,72,72,22,34,12, 7,36,24,48,12,34,22,36,24,34,46],
    [46,82,53, 5,53,29,41,30,53,29,65, 4,29,41,72,72,72,72,53,41,29,53,16,41,53,29,53,41,18,29, 6,46],
    [82,80,53,29,11,53,29,41,23,53,29,67,79,55,42,72,72,17,28,53,35,29,59,53, 4,83,53,29,54,30,41,82]
  ];

  const BRUSH = [
    [-1,-1,-1,-1,-1,-1, 7, 7, 7,-1,-1,-1,-1,-1,-1,-1,-1,-1],
    [-1,-1,-1,-1,-1, 7,19,19,19, 7,-1,-1,-1,-1,-1,-1,-1,-1],
    [-1,-1,-1,-1, 7,19,19,19,19,19, 7,-1,-1,-1,-1,-1,-1,-1],
    [-1,-1,-1, 7,19,19,43,43,43,19,19, 7,-1,-1,-1,-1,-1,-1],
    [-1,-1, 7,19,43,43,43,43,43,43,43,19, 7,-1,-1,-1,-1,-1],
    [-1, 7,19,43,43,38,38,38,38,38,43,43,19, 7,-1,-1,-1,-1],
    [ 7,19,43,38,38,38,33,33,38,38,38,43,19, 7,-1,-1,-1,-1],
    [-1, 7,19,33,38,33,33,33,33,38,19, 7,-1,-1,-1,-1,-1,-1],
    [-1,-1, 7,19,33,33,33,33,33,19, 7,-1,-1,-1,-1,-1,-1,-1],
    [-1,-1,-1, 7,19,19,33,33,19,82,82,82,82,-1,-1,-1,-1,-1],
    [-1,-1,-1,-1, 7,19,19,19,82,70,55,55,55,82,82,-1,-1,-1],
    [-1,-1,-1,-1,-1, 7, 7, 7,-1,82,82,82,70,55,55,55,82,-1],
    [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,82,82,82,82,70,55,82],
    [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,82,82,82,82,82]
  ];

  const art = '\n' +
'   ███████╗██████╗  ██████╗ ██╗████████╗ ██████╗\n' +
'   ██╔════╝██╔══██╗██╔═══██╗██║╚══██╔══╝██╔═══██╗\n' +
'   ███████╗██████╔╝██║   ██║██║   ██║   ██║   ██║\n' +
'   ╚════██║██╔═══╝ ██║   ██║██║   ██║   ██║   ██║\n' +
'   ███████║██║     ╚██████╔╝██║   ██║   ╚██████╔╝\n' +
'   ╚══════╝╚═╝      ╚═════╝ ╚═╝   ╚═╝    ╚═════╝\n';

  console.log('%c' + art, S.logo);
  console.log(...rainbow('   Spoito-cho', 24));
  console.log('%c   トモダチコレクション わくわく生活 — Color picker tool', S.sub);
  console.log('');

  console.log('%c━━ THE 84 COLORS ━━━━━━━━━━━━━━━━━━━━━━', S.sect);
  drawPaletteGrid(6, 6);
  console.log('%c   12 columns × 7 rows · the entire in-game paint palette', S.cap);
  console.log('');

  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', S.rule);
  {
    const msg = '   猫と和解せよ';
    const palCols = [11, 23, 35, 47, 59, 71, 83, 39, 32, 18, 25, 49, 67];
    let s = '';
    const st = [];
    for (let i = 0; i < msg.length; i++) {
      const ch = msg[i];
      s += '%c' + ch;
      if (ch === ' ') {
        st.push('font-size:26px;');
      } else {
        const col = PAL[palCols[i % palCols.length]];
        st.push(`color:${col};font-size:26px;font-weight:900;font-family:'Hiragino Maru Gothic ProN','Yu Gothic','Meiryo',sans-serif;text-shadow:1px 1px 0 rgba(0,0,0,0.18),0 0 4px rgba(255,255,255,0.4);padding:2px 1px;`);
      }
    }
    console.log(s, ...st);
  }
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', S.rule);
  console.log('');

  const g = greeting();
  console.log(`%c${g.ja}`, S.greet);
  console.log('');

  console.log('%c━━ ABOUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', S.sect);
  console.log('%c GitHub  %c https://github.com/Yu08083/Tomodachi-Life-Palette-Tool', S.label, S.val);
  console.log('%c Author  %c @yu_   on  X', S.label, S.val);
  console.log('%c License %c MIT  —  fork & modify freely', S.label, S.val);
  console.log('%c Stack   %c Vanilla JS · HTML · CSS  (no framework, no tracker)', S.label, S.val);
  console.log('%c Scope   %c 12 languages · 84-color palette · zero server', S.label, S.val);
  console.log('');

  console.log('%c━━ TRY THESE ━━━━━━━━━━━━━━━━━━━━━━━━━━━', S.sect);
  console.log('%c spoito.about()   %cAbout this project', S.cmd, S.cmdDesc);
  console.log('%c spoito.colors()  %cView all 84 palette colors (sortable table)', S.cmd, S.cmdDesc);
  console.log('%c spoito.scene()   %cDawn landscape — every one of the 84 colors used at least once', S.cmd, S.cmdDesc);
  console.log('%c spoito.brush()   %cThe tool icon, in pixels', S.cmd, S.cmdDesc);
  console.log('%c spoito.thanks()  %cThanks in 12 languages', S.cmd, S.cmdDesc);
  console.log('%c spoito.help()    %cAll available commands', S.cmd, S.cmdDesc);
  console.log('');

  console.log('%c   No images leave your browser. Everything runs locally.', S.hint);
  console.log('%c   画像はあなたのブラウザの外には出ません。すべてローカル処理。', S.hint);
  console.log('');

  function _rule() {
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', S.rule);
  }

  const VERSION = '1.0.0';

  const api = {
    get version() { return VERSION; },

    about() {
      _rule();
      console.log(...rainbow(' Spoito-cho ', 20));
      console.log('');
      console.log('%cすぽいと帳 / Spoito-cho', S.greet);
      console.log('%cA pixel-art-friendly color picker for Tomodachi Life paint mode.', S.val);
      console.log('');
      console.log('%cFEATURES', S.sect);
      console.log('%c  ▸ %cPick colors from any image, find best 84-palette match', S.label, S.val);
      console.log('%c  ▸ %cFull-color HSV navigator with step-by-step operation guide', S.label, S.val);
      console.log('%c  ▸ %cExport as pixel art PNG or paint-by-numbers PNG', S.label, S.val);
      console.log('%c  ▸ %cMirror axis · isolate · done-tracking · difficulty score (1-100)', S.label, S.val);
      console.log('%c  ▸ %cWebM time-lapse recording · QR code share', S.label, S.val);
      console.log('%c  ▸ %c12 languages — auto-detected from your browser', S.label, S.val);
      console.log('%c  ▸ %cZero server · zero analytics · zero tracking', S.label, S.val);
      _rule();
      return '';
    },

    colors() {
      _rule();
      console.log('%cTomodachi Life — 84-color palette', S.greet);
      console.log('%c12 columns × 7 rows  ·  numbered 1–84 (left→right, top→bottom)', S.sub);
      console.log('');
      drawPaletteGrid(7, 7);
      console.log('');

      console.log('%cFull data (sortable in DevTools)', S.sect);
      const data = PAL.map((hex, i) => ({
        '#':   i + 1,
        hex:   hex.toUpperCase(),
        row:   Math.floor(i / 12) + 1,
        col:   (i % 12) + 1
      }));
      console.table(data);
      _rule();
      return '';
    },

    scene() {
      _rule();
      console.log('%c🌅 Dawn over the painted lake — every 1 of the 84 colors used', S.greet);
      console.log('%c夜明けの空・湖・村・森・草原 — ゲーム内 84 色を全部 1 マスずつ使ってる', S.sub);
      console.log('');
      drawArt(SCENE, 5, 5);
      console.log('%c   ← every pixel is one of the 84 in-game colors  ·  84/84 used', S.cap);
      _rule();
      return '';
    },

    brush() {
      _rule();
      console.log('%c🖌  The icon of すぽいと帳, in actual game pixels', S.greet);
      console.log('');
      drawArt(BRUSH, 5, 5);
      console.log('%c   yellow-cream bristles · orange paint · wooden handle', S.cap);
      _rule();
      return '';
    },

    thanks() {
      _rule();
      console.log('%c💛 Thanks for being here!', S.greet);
      console.log('%c12 languages of gratitude:', S.sub);
      console.log('');
      const greetings = [
        ['🇯🇵', 'ja',    'ありがとう'],
        ['🌍', 'en',    'Thank you'],
        ['🇰🇷', 'ko',    '감사합니다'],
        ['🇫🇷', 'fr',    'Merci'],
        ['🇪🇸', 'es',    'Gracias'],
        ['🇹🇼', 'zh-TW', '謝謝'],
        ['🇨🇳', 'zh-CN', '谢谢'],
        ['🇩🇪', 'de',    'Danke'],
        ['🇮🇹', 'it',    'Grazie'],
        ['🇳🇱', 'nl',    'Bedankt'],
        ['🇧🇷', 'pt-BR', 'Obrigado'],
        ['🇷🇺', 'ru',    'Спасибо']
      ];
      greetings.forEach((row) => {
        console.log(
          '%c ' + row[0] + ' %c ' + row[1].padEnd(6) + ' %c' + row[2],
          S.flag, S.label, S.word
        );
      });
      console.log('');
      console.log('%cTo Tomodachi Life players around the world,', S.sub);
      console.log('%cand to anyone reading source code: ありがとう ✨', S.sub);
      _rule();
      return '';
    },

    help() {
      _rule();
      console.log('%cAvailable commands', S.greet);
      console.log('');
      console.log('%c spoito.about()   %cAbout this project', S.cmd, S.cmdDesc);
      console.log('%c spoito.colors()  %cView all 84 palette colors', S.cmd, S.cmdDesc);
      console.log('%c spoito.scene()   %cDawn landscape — every one of the 84 colors used at least once', S.cmd, S.cmdDesc);
      console.log('%c spoito.brush()   %cTool icon in pixels', S.cmd, S.cmdDesc);
      console.log('%c spoito.thanks()  %cThanks in 12 languages', S.cmd, S.cmdDesc);
      console.log('%c spoito.help()    %cThis message', S.cmd, S.cmdDesc);
      console.log('%c spoito.version   %cVersion info', S.cmd, S.cmdDesc);
      _rule();
      return '';
    }
  };

  Object.defineProperty(window, 'spoito', {
    value: Object.freeze(api),
    writable: false,
    configurable: false
  });

  Object.defineProperty(window, 'tomodati', {
    get() {
      const warm = 'color:#FFAA4D;font-size:15px;font-weight:700;font-family:"Hiragino Maru Gothic ProN","Yu Gothic","Meiryo",sans-serif;padding:6px 0;';
      const muted = 'color:#C9A77A;font-size:14px;font-family:"Hiragino Maru Gothic ProN","Yu Gothic","Meiryo",sans-serif;';
      const emph = 'color:#FF5555;font-size:22px;font-weight:900;font-family:"Hiragino Maru Gothic ProN","Yu Gothic","Meiryo",sans-serif;text-shadow:0 0 8px rgba(255,85,85,0.55),1px 1px 0 rgba(0,0,0,0.3);padding:0 6px;';

      console.log('%c今いるトモダチを大切に', warm);
      console.log('%c私には%c「もう」%cいません', muted, emph, muted);

      setTimeout(() => {
        console.clear();
        const myst    = 'color:#9B7FE0;font-size:13px;font-family:"Hiragino Maru Gothic ProN","Yu Gothic",sans-serif;';
        const mystEm  = 'color:#A88FE8;font-size:15px;font-weight:800;font-family:"Hiragino Maru Gothic ProN","Yu Gothic",sans-serif;padding:4px 0;';
        const cipher  = 'color:#5EB8F0;font-size:20px;font-weight:800;font-family:"JetBrains Mono","Courier New",monospace;letter-spacing:0.12em;padding:14px 0;text-shadow:0 0 6px rgba(94,184,240,0.5);';
        const tiny    = 'color:#7A6A55;font-size:11px;font-style:italic;font-family:sans-serif;padding:4px 0;';

        console.log('%c更に深く知りたい方は', mystEm);
        console.log('%c暗号を解いてください', mystEm);
        console.log('');
        console.log('%cツイッターのアカウントを特定してください', myst);
        console.log('%cIDは', myst);
        console.log('%c73686c6c616463736e', cipher);
        console.log('%c※ 73686c6c616463736e は暗号化済みです', tiny);
      }, 3500);

      return '';
    },
    configurable: false
  });
})();


  Object.defineProperty(window, 'spoito', {
    value: Object.freeze(api),
    writable: false,
    configurable: false
  });
