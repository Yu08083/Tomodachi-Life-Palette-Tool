

var zoom = 1;
var imgData = null;
var rawSourceCanvas = null;
var convertedData = null;
var viewMode = 'original';
var currentMode = 'palette';
var closestIdx = -1;
var rulerEnabled = false;
var gridEnabled = false;
var gridSubdivision = 8;
var paletteUsedOnly = false;
var isolateEnabled = false;
var isolateTargetIdx = -1;
var mirrorMode = 'off';
var lastSelPx = -1;
var lastSelPy = -1;
var interactionMode = 'select';

var gridSize = 32;
var ditherEnabled = false;

var hoverPaletteIdx = -1;

const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 2, 4, 8, 12, 16];
const MAX_CANVAS_SIDE = 4096;
const MIN_CANVAS_SIDE = 64;

const GRID_STORAGE_KEY = 'spoito_grid_enabled';
const GRID_SUB_STORAGE_KEY = 'spoito_grid_subdivision';
const PALETTE_USED_ONLY_KEY = 'spoito_palette_used_only';
const ISOLATE_STORAGE_KEY = 'spoito_isolate_enabled';

var cropBox = { x: 0, y: 0, w: 0, h: 0 };
var cropAspectId = '1:1';

const CROP_ASPECT_PRESETS = {
  '1:1':  { id: '1:1',  w: 256, h: 256, labelKey: 'crop.aspect11'   },
  'book': { id: 'book', w: 180, h: 256, labelKey: 'crop.aspectBook' },
  'tv':   { id: 'tv',   w: 256, h: 131, labelKey: 'crop.aspectTV'   },
  'game': { id: 'game', w: 256, h: 144, labelKey: 'crop.aspectGame' },
  'wall': { id: 'wall', w: 172, h: 256, labelKey: 'crop.aspectWall' },
};

function getCurrentCropAspect() {
  return CROP_ASPECT_PRESETS[cropAspectId] || CROP_ASPECT_PRESETS['1:1'];
}

var dropZone, fileInput, uploadSec, mainContent;
var pixelCanvas, overlayCanvas;
var zoomLabel, zoomInBtn, zoomOutBtn, resetBtn;
var noSelectMsg, colorInfo, imgInfoEl;
var demoBtn;

function cacheDomRefs() {
  dropZone      = document.getElementById('drop-zone');
  fileInput     = document.getElementById('file-input');
  uploadSec     = document.getElementById('upload-section');
  mainContent   = document.getElementById('main-content');
  pixelCanvas   = document.getElementById('pixel-canvas');
  overlayCanvas = document.getElementById('overlay-canvas');
  zoomLabel     = document.getElementById('zoom-label');
  zoomInBtn     = document.getElementById('zoom-in');
  zoomOutBtn    = document.getElementById('zoom-out');
  resetBtn      = document.getElementById('reset-btn');
  noSelectMsg   = document.getElementById('no-select-msg');
  colorInfo     = document.getElementById('color-info');
  imgInfoEl     = document.getElementById('img-info');
  demoBtn       = document.getElementById('demo-btn');
}
