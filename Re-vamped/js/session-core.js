// /js/session-core.js
// Session Core Infrastructure - Timer Management for FinePointRehab
// Part of Phase 2: Foundation Enhancement (F1.1)

export function createSession({ durationMs, onTick, onEnd, onPauseChange, autoPauseOnHide = true }) {
  let remainingMs = clampMs(durationMs);
  let timerId = null;
  let paused = false;
  let ended = false;

  function tick() {
    if (paused || ended) return;
    remainingMs -= 100;
    if (remainingMs <= 0) {
      remainingMs = 0;
      stop();
      if (!ended) {
        ended = true;
        onTick?.(remainingMs);
        onEnd?.();
      }
      return;
    }
    onTick?.(remainingMs);
  }

  function start() {
    stop();
    ended = false;
    paused = false;
    timerId = setInterval(tick, 100);
    onTick?.(remainingMs);
  }

  function stop() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function pause() {
    if (!paused) {
      paused = true;
      onPauseChange?.(true);
    }
  }

  function resume() {
    if (!ended && paused) {
      paused = false;
      onPauseChange?.(false);
    }
  }

  function end() {
    if (ended) return; // prevent double onEnd
    stop();
    ended = true;
    onEnd?.();
  }

  function setDuration(ms) {
    remainingMs = clampMs(ms);
    onTick?.(remainingMs);
  }

  function timeRemaining() { return Math.max(0, remainingMs); }
  function isPaused() { return paused; }
  function isEnded() { return ended; }

  // visibility handling with cleanup
  let visHandler = null;
  if (autoPauseOnHide && typeof document !== "undefined") {
    visHandler = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', visHandler);
  }

  function destroy() {
    stop();
    if (visHandler && typeof document !== "undefined") {
      document.removeEventListener('visibilitychange', visHandler);
      visHandler = null;
    }
  }

  return {
    start,
    stop,
    pause,
    resume,
    end,
    setDuration,
    timeRemaining,
    isPaused,
    isEnded,
    destroy
  };
}

// Utility function to clamp duration within reasonable limits
function clampMs(ms) {
  const v = Number(ms) || 0;
  return Math.max(0, Math.min(v, 60 * 60 * 1000)); // 0 to 60 minutes maximum
}