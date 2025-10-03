// /js/a11y.js
export function moveFocus(el) {
  try { el?.focus?.({ preventScroll: true }); } catch {}
}

export function getFocusable(container) {
  if (!container) return [];
  const candidates = container.querySelectorAll(
    [
      'a[href]',
      'area[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'summary',
      'iframe',
      'audio[controls]',
      'video[controls]',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')
  );
  return [...candidates].filter(el =>
    !el.closest('[inert]') &&
    !el.closest('[aria-hidden="true"]') &&
    isVisible(el)
  );
}

export function trapFocus(modalEl, { onEscape } = {}) {
  function onKeydown(e) {
    if (!modalEl) return;
    if (e.key === 'Escape') { onEscape?.(e); return; }
    if (e.key !== 'Tab') return;

    const els = getFocusable(modalEl);
    if (!els.length) { e.preventDefault(); return; }

    const first = els[0];
    const last  = els[els.length - 1];
    const active = /** @type {HTMLElement|null} */ (typeof document !== 'undefined' ? document.activeElement : null);

    // If focus is outside the trap, pull it in.
    if (!modalEl.contains(active)) {
      e.preventDefault();
      first.focus();
      return;
    }
    if (e.shiftKey && active === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault(); first.focus();
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', onKeydown);
  }
  return () => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', onKeydown);
    }
  };
}

export function livePolite(el, msg) {
  if (!el) return;
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.setAttribute('role', 'status');
  // Force re-announce even if same text:
  el.textContent = ''; 
  requestAnimationFrame(() => { el.textContent = msg; });
}

function isVisible(el) {
  if (!el || el.hidden) return false;
  const rects = el.getClientRects();
  if (!rects || !rects.length) return false;
  const style = window.getComputedStyle ? getComputedStyle(el) : null;
  if (style && (style.visibility === 'hidden' || style.display === 'none')) return false;
  return true;
}