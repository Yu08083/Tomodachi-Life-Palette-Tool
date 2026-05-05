

var zoom = 1;
var imgData = null;
var rawSourceCanvas = null;
var convertedData = null;
var viewMode = 'original';
var currentMode = 'palette';
var closestIdx = -1;
var rulerEnabled = false;
var lastSelPx = -1;
var lastSelPy = -1;
var interactionMode = 'select';

var gridSize = 32;
var ditherEnabled = false;

var hoverPaletteIdx = -1;

const ZOOM_STEPS = [1, 2, 4, 8, 12, 16];
const MAX_CANVAS_SIDE = 4096;

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
