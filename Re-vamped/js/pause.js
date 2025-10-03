// /js/pause.js
export function bindPause({
  areaEl,
  overlayEl,
  buttonEl,
  onChange, // (paused:boolean) => void
  labels = { pause: 'Pause', resume: 'Resume' },
  overlayClickResumes = true,
  escapeResumes = true
}) {
  let paused = false;

  function reflect() {
    areaEl?.classList.toggle('is-paused', paused);
    // Block interaction under overlay when paused:
    if (areaEl) areaEl.inert = !!paused; // supported in modern browsers; fine to set boolean

    overlayEl?.classList.toggle('hidden', !paused);
    if (overlayEl) overlayEl.setAttribute('aria-hidden', String(!paused));

    if (buttonEl) {
      buttonEl.textContent = paused ? labels.resume : labels.pause;
      buttonEl.setAttribute('aria-pressed', String(paused));
    }
    onChange?.(paused);
  }

  function set(p) {
    if (p === paused) return;
    paused = !!p;
    reflect();
  }

  const onButtonClick = () => set(!paused);
  buttonEl?.addEventListener('click', onButtonClick);

  const onOverlayClick = (e) => {
    if (!overlayClickResumes || !paused) return;
    // avoid unintended clicks if overlay has children
    if (e.target === overlayEl) set(false);
  };
  overlayEl?.addEventListener('click', onOverlayClick);

  const onKeydown = (e) => {
    if (!escapeResumes || !paused) return;
    if (e.key === 'Escape') set(false);
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', onKeydown);
  }

  // initialize UI to match initial state (unpaused)
  reflect();

  function destroy() {
    buttonEl?.removeEventListener('click', onButtonClick);
    overlayEl?.removeEventListener('click', onOverlayClick);
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', onKeydown);
    }
    // clean up inert just in case
    if (areaEl) areaEl.inert = false;
  }

  return {
    isPaused: () => paused,
    setPaused: set,
    destroy
  };
}