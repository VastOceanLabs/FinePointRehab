/* =============================================================================
   fpr-reminders.js — Daily exercise-reminder UX
   =============================================================================

   Two responsibilities, both depend on FPRNative being loaded first:

   1. Dashboard settings card: if the page contains a #reminders-card element
      (only dashboard.html does), wires up the toggle + time picker, persists
      preferences in localStorage, and calls FPRNative.scheduleDailyReminder
      / cancelReminders accordingly.

   2. First-launch prompt: on the homepage, inside the Capacitor Android app
      only, on the first visit, shows a friendly card asking the user to
      enable daily reminders. Dismissed permanently if rejected or accepted.

   Web users see the dashboard card (with an "Install the Android app to
   receive reminders" note) but never see the first-launch prompt.

   Single source of truth for reminder preferences:
     localStorage["FPR_v1_reminders"] = JSON.stringify({ enabled, time })
     where time is "HH:MM" 24-hour format.
   ============================================================================= */

(function () {
  'use strict';

  var PREFS_KEY = 'FPR_v1_reminders';
  var PROMPT_DISMISSED_KEY = 'FPR_v1_remindersPromptDismissed';

  function safeJSON(s, fallback) {
    try { return JSON.parse(s); } catch (_) { return fallback; }
  }

  function loadPrefs() {
    return safeJSON(localStorage.getItem(PREFS_KEY), {}) || {};
  }

  function savePrefs(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (_) {}
  }

  function isNative() {
    return !!(window.FPRNative && window.FPRNative.isNative);
  }

  function fmtTimeForHumans(hhmm) {
    // "18:00" -> "6:00 PM"
    var parts = (hhmm || '18:00').split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1] || '00';
    var period = h >= 12 ? 'PM' : 'AM';
    var h12 = ((h + 11) % 12) + 1;
    return h12 + ':' + m + ' ' + period;
  }

  // ---------- Apply preferences (called on every page load) ---------------
  function applyPrefs() {
    if (!window.FPRNative) return Promise.resolve({ scheduled: false, reason: 'no-fpr' });
    var prefs = loadPrefs();
    if (prefs.enabled) {
      var parts = (prefs.time || '18:00').split(':');
      var h = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10) || 0;
      return window.FPRNative.scheduleDailyReminder({
        hour: h,
        minute: m,
        title: 'Time for your exercise',
        body: 'Five minutes of practice keeps your gains. Tap to start.',
      });
    }
    return window.FPRNative.cancelReminders();
  }

  // ---------- Dashboard settings card -------------------------------------
  function setupDashboardCard() {
    var card = document.getElementById('reminders-card');
    if (!card) return; // not on dashboard

    var enabledInput = document.getElementById('reminder-enabled');
    var timeInput = document.getElementById('reminder-time');
    var statusEl = document.getElementById('reminder-status');
    var webNoteEl = document.getElementById('reminder-web-note');
    if (!enabledInput || !timeInput) return;

    var prefs = loadPrefs();
    enabledInput.checked = !!prefs.enabled;
    timeInput.value = prefs.time || '18:00';
    if (webNoteEl) webNoteEl.style.display = isNative() ? 'none' : '';

    function updateStatus() {
      if (!statusEl) return;
      if (!isNative()) {
        statusEl.textContent = 'Install the Android app to receive reminders. (Toggling here saves your preference for when you do.)';
        return;
      }
      var p = loadPrefs();
      if (!p.enabled) {
        statusEl.textContent = 'Reminders are off.';
      } else {
        statusEl.textContent = 'Daily reminder set for ' + fmtTimeForHumans(p.time || '18:00') + '.';
      }
    }

    function onChange() {
      var newPrefs = {
        enabled: !!enabledInput.checked,
        time: timeInput.value || '18:00',
      };
      savePrefs(newPrefs);

      if (!isNative()) {
        updateStatus();
        return;
      }
      applyPrefs().then(function (r) {
        if (r && r.reason === 'permission-denied') {
          if (statusEl) statusEl.textContent = 'Notification permission was denied. Enable in Android settings → Apps → FinePointRehab → Notifications.';
          enabledInput.checked = false;
          savePrefs({ enabled: false, time: newPrefs.time });
        } else {
          updateStatus();
        }
      });
    }

    enabledInput.addEventListener('change', onChange);
    timeInput.addEventListener('change', onChange);
    updateStatus();
  }

  // ---------- First-launch prompt (Capacitor app only) --------------------
  function isHomePage() {
    var p = location.pathname;
    return p === '/' || p.endsWith('/index.html');
  }

  function setupFirstLaunchPrompt() {
    if (!isNative()) return;
    if (!isHomePage()) return;
    if (localStorage.getItem(PROMPT_DISMISSED_KEY)) return;
    if (loadPrefs().enabled) return;

    var prompt = document.createElement('div');
    prompt.className = 'fpr-reminders-prompt';
    prompt.setAttribute('role', 'dialog');
    prompt.setAttribute('aria-label', 'Enable daily exercise reminders');
    prompt.innerHTML = [
      '<style>',
      '.fpr-reminders-prompt {',
      '  position: fixed;',
      '  bottom: max(16px, env(safe-area-inset-bottom, 16px));',
      '  left: 16px; right: 16px;',
      '  max-width: 480px; margin: 0 auto;',
      '  background: linear-gradient(135deg, #0f1630, #1a1f3a);',
      '  color: #eaf6ff;',
      '  border: 1px solid #6fd3f5;',
      '  border-radius: 14px;',
      '  padding: 16px;',
      '  box-shadow: 0 12px 36px rgba(0,0,0,0.5);',
      '  z-index: 5000;',
      '  display: flex; flex-direction: column; gap: 14px;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
      '  animation: fprPromptSlide 0.45s cubic-bezier(.18,.89,.32,1.28);',
      '}',
      '@keyframes fprPromptSlide {',
      '  0% { opacity: 0; transform: translateY(40px) scale(.95); }',
      '  100% { opacity: 1; transform: translateY(0) scale(1); }',
      '}',
      '.fpr-reminders-prompt-row { display: flex; align-items: flex-start; gap: 12px; }',
      '.fpr-reminders-prompt-icon { font-size: 28px; flex-shrink: 0; line-height: 1; }',
      '.fpr-reminders-prompt-text strong { display: block; margin-bottom: 4px; font-size: 16px; color: #eaf6ff; }',
      '.fpr-reminders-prompt-text p { margin: 0; font-size: 14px; opacity: 0.85; line-height: 1.4; color: #b8c5d1; }',
      '.fpr-reminders-prompt-actions { display: flex; gap: 8px; }',
      '.fpr-reminders-prompt-actions button {',
      '  flex: 1; padding: 12px 16px;',
      '  border-radius: 10px; font-weight: 700;',
      '  border: none; cursor: pointer; min-height: 48px;',
      '  font-family: inherit; font-size: 14px;',
      '  transition: background 0.15s, transform 0.1s;',
      '}',
      '.fpr-reminders-prompt-actions button:active { transform: scale(.97); }',
      '.fpr-rp-yes { background: #6fd3f5; color: #07101e; }',
      '.fpr-rp-yes:hover { background: #8fdff7; }',
      '.fpr-rp-no { background: rgba(255,255,255,0.06); color: #b8c5d1; border: 1px solid rgba(255,255,255,0.18); }',
      '.fpr-rp-no:hover { background: rgba(255,255,255,0.12); }',
      '</style>',
      '<div class="fpr-reminders-prompt-row">',
      '  <span class="fpr-reminders-prompt-icon" aria-hidden="true">🔔</span>',
      '  <div class="fpr-reminders-prompt-text">',
      '    <strong>Stay consistent with daily practice</strong>',
      '    <p>A gentle reminder each evening keeps your gains. Works offline — no account needed. You can change the time or turn it off anytime in your dashboard.</p>',
      '  </div>',
      '</div>',
      '<div class="fpr-reminders-prompt-actions">',
      '  <button class="fpr-rp-no" type="button">Not now</button>',
      '  <button class="fpr-rp-yes" type="button">Enable reminders</button>',
      '</div>',
    ].join('');

    document.body.appendChild(prompt);

    var yesBtn = prompt.querySelector('.fpr-rp-yes');
    var noBtn = prompt.querySelector('.fpr-rp-no');

    function dismiss() {
      try { localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now())); } catch (_) {}
      prompt.style.animation = 'fprPromptSlide 0.3s reverse';
      setTimeout(function () { prompt.remove(); }, 280);
    }

    yesBtn.addEventListener('click', function () {
      yesBtn.disabled = true;
      yesBtn.textContent = 'Setting up…';
      window.FPRNative.scheduleDailyReminder({
        hour: 18,
        minute: 0,
        title: 'Time for your exercise',
        body: 'Five minutes of practice keeps your gains. Tap to start.',
      }).then(function (r) {
        if (r && r.scheduled) {
          savePrefs({ enabled: true, time: '18:00' });
          window.FPRNative.haptic('success').catch(function () {});
        }
        dismiss();
      });
    });

    noBtn.addEventListener('click', dismiss);
  }

  // ---------- Init --------------------------------------------------------
  function init() {
    setupDashboardCard();
    // Slight delay before showing first-launch prompt so it doesn't compete
    // with the splash → first-paint transition.
    setTimeout(setupFirstLaunchPrompt, 1200);
    // Re-apply current prefs on every load so reinstalls / new devices pick up
    applyPrefs().catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
