
function refreshDynamicLabels() {

  if (typeof refreshColorInfoLabels === 'function') refreshColorInfoLabels();

  if (typeof updateCropInfo === 'function' && typeof cropSrcCanvas !== 'undefined' && cropSrcCanvas) {
    try { updateCropInfo(); } catch (_) {}
  }

  if (typeof updateImgInfo === 'function' && typeof imgData !== 'undefined' && imgData) {
    try { updateImgInfo(); } catch (_) {}
  }

  if (typeof rebuildRecipe === 'function' && typeof viewMode !== 'undefined' && viewMode === 'converted') {
    try { rebuildRecipe(); } catch (_) {}
  }

  if (typeof renderFavorites === 'function') {
    try { renderFavorites(); } catch (_) {}
  }

}

async function init() {

  if (typeof initI18n === 'function') {
    await initI18n();
  }

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
  attachPaletteNumberToggle();
  attachHistoryControls();
  attachShareControls();

  window.addEventListener('i18nchange', refreshDynamicLabels);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
