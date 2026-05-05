

function init() {
  cacheDomRefs();

  attachUploadHandlers();
  attachCropHandlers();
  attachCanvasInteractions();
  attachZoomControls();
  attachConvertControls();
  attachHexInput();
  attachFavorites();
  attachCopyStepsButton();
  attachModalHandlers();
  attachResizeHandler();

  buildPaletteGrid();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
