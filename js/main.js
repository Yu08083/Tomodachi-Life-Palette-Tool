
function refreshDynamicLabels() {

  if (typeof refreshColorInfoLabels === 'function') refreshColorInfoLabels();

  if (typeof updateCropInfo === 'function' && typeof cropSrcCanvas !== 'undefined' && cropSrcCanvas) {
    try { updateCropInfo(); } catch (_) {}
  }

  if (typeof updateImgInfo === 'function' && typeof imgData !== 'undefined' && imgData) {
    try { updateImgInfo(); } catch (_) {}
  }

  if (typeof updateBrushStatus === 'function') {
    try { updateBrushStatus(); } catch (_) {}
  }

  if (typeof rebuildRecipe === 'function' && typeof viewMode !== 'undefined' && viewMode === 'converted') {
    try { rebuildRecipe(); } catch (_) {}
  }

  if (typeof renderFavorites === 'function') {
    try { renderFavorites(); } catch (_) {}
  }

  if (typeof _updateIsolateButtonState === 'function') {
    try { _updateIsolateButtonState(); } catch (_) {}
  }

  if (typeof _updateDoneButtonState === 'function') {
    try { _updateDoneButtonState(); } catch (_) {}
  }

}

async function init() {

  if (typeof initI18n === 'function') {
    await initI18n();
  }

  if (typeof loadBgPresets === 'function') {
    try { await loadBgPresets(); } catch (_) {}
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

  if (typeof attachBgPresetHandlers === 'function') {
    try { attachBgPresetHandlers(); } catch (_) {}
  }

  buildPaletteGrid();
  attachPaletteNumberToggle();
  attachPaletteUsedOnlyToggle();
  attachHistoryControls();
  attachShareControls();
  attachShareWorkControls();

  initGrid();
  if (typeof initIsolate === 'function') initIsolate();
  if (typeof initMirror === 'function') initMirror();

  document.querySelectorAll('.grid-sub-btn').forEach(b => {
    b.addEventListener('click', () => setGridSubdivision(parseInt(b.dataset.sub, 10)));
  });
  document.querySelectorAll('.mirror-sub-btn').forEach(b => {
    b.addEventListener('click', () => setMirrorAxis(b.dataset.mirror));
  });

  window.addEventListener('i18nchange', refreshDynamicLabels);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
