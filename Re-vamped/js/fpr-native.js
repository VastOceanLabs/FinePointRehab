/* =============================================================================
   fpr-native.js — FinePointRehab Native Enhancement Layer
   =============================================================================

   Single point of contact for native-vs-web capability bridging. When the page
   is running inside the Capacitor Android app, this layer routes calls to
   richer native plugins (Android's VibrationEffect, scheduled LocalNotifications,
   status-bar theming, etc.). When running in a plain browser, the same calls
   degrade to Web APIs (navigator.vibrate, web Notifications) — or no-op
   silently if neither is available.

   Public API (always available on window.FPRNative):

     FPRNative.isNative                 -> boolean
     FPRNative.platform                 -> 'android' | 'ios' | 'web'

     FPRNative.haptic(type, opts?)      -> Promise<void>
       type ∈ 'light' | 'medium' | 'heavy'
            | 'success' | 'warning' | 'error'
            | 'selection' | 'tick'
            | 'milestone'  (custom waveform for streak celebrations)

     FPRNative.scheduleDailyReminder(opts?) -> Promise<{scheduled: boolean}>
       opts: { hour=18, minute=0, title, body, id=1 }

     FPRNative.cancelReminders(ids?)    -> Promise<void>
     FPRNative.requestNotificationPermission() -> Promise<'granted'|'denied'|'unsupported'>

     FPRNative.setStatusBar({ style?: 'dark'|'light', color?: '#hex' })
     FPRNative.hideSplash()             -> Promise<void>
     FPRNative.exitApp()                -> Promise<void>     (Android only)

   Design notes:
     - All methods return Promises that NEVER reject. Failures resolve to a
       sensible default. Game JS should not need try/catch around these calls.
     - The script must load BEFORE the game's IIFE that uses it. Include it
       in <head> with `defer` or in the body before the inline <script>.
     - In Capacitor, plugins are auto-registered on window.Capacitor.Plugins.
       In the browser, window.Capacitor is undefined → we use web fallbacks.

   Usage example (in any game's inline JS):

     // Replace:
     if (navigator.vibrate) navigator.vibrate(15);
     // With:
     FPRNative.haptic('light');

     // For milestone celebrations:
     FPRNative.haptic('milestone');     // rich waveform on Android, fallback on web

   ============================================================================= */

(function () {
  'use strict';

  // ----- Platform detection -------------------------------------------------
  var cap = (typeof window !== 'undefined') ? window.Capacitor : null;
  var IS_NATIVE = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  var PLATFORM = IS_NATIVE
    ? (cap.getPlatform ? cap.getPlatform() : 'android')
    : 'web';

  function plugin(name) {
    return (cap && cap.Plugins && cap.Plugins[name]) ? cap.Plugins[name] : null;
  }

  // Detect iOS (web or native) — navigator.vibrate is unsupported on iOS Safari
  var IS_IOS = /iPad|iPhone|iPod/.test((navigator && navigator.userAgent) || '')
    || PLATFORM === 'ios';

  // ----- Haptics ------------------------------------------------------------
  // Capacitor Haptics plugin exposes:
  //   Haptics.impact({ style: 'LIGHT' | 'MEDIUM' | 'HEAVY' })
  //   Haptics.notification({ type: 'SUCCESS' | 'WARNING' | 'ERROR' })
  //   Haptics.selectionStart/Changed/End()
  //   Haptics.vibrate({ duration: ms })  // raw fallback
  //
  // Web fallback uses navigator.vibrate (Android only — iOS blocks it).

  var IMPACT_MAP = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' };
  var NOTIFY_MAP = { success: 'SUCCESS', warning: 'WARNING', error: 'ERROR' };

  // Web vibration fallback patterns — duration in ms (or array of on/off pulses)
  var WEB_VIBRATE = {
    light: 10,
    medium: 20,
    heavy: 40,
    selection: 5,
    tick: 8,
    success: [20, 30, 20],
    warning: [30, 40, 30],
    error: [60, 40, 60],
    milestone: [40, 30, 60, 30, 90],
  };

  function safe(p) {
    return Promise.resolve(p).catch(function () { /* swallow */ });
  }

  function haptic(type, opts) {
    type = type || 'light';
    opts = opts || {};

    if (IS_NATIVE) {
      var Haptics = plugin('Haptics');
      if (!Haptics) return Promise.resolve();

      if (IMPACT_MAP[type]) {
        return safe(Haptics.impact({ style: IMPACT_MAP[type] }));
      }
      if (NOTIFY_MAP[type]) {
        return safe(Haptics.notification({ type: NOTIFY_MAP[type] }));
      }
      if (type === 'selection') {
        return safe(Haptics.selectionChanged());
      }
      if (type === 'tick') {
        // Subtle, repeatable tap feedback
        return safe(Haptics.impact({ style: 'LIGHT' }));
      }
      if (type === 'milestone') {
        // Layered rich feedback — sequence of impacts for celebration
        return safe(Haptics.notification({ type: 'SUCCESS' }))
          .then(function () {
            return new Promise(function (r) { setTimeout(r, 80); });
          })
          .then(function () {
            return safe(Haptics.impact({ style: 'HEAVY' }));
          });
      }
      // Custom duration fallback
      if (opts.duration) {
        return safe(Haptics.vibrate({ duration: opts.duration }));
      }
      return Promise.resolve();
    }

    // ----- Web fallback -----
    if (IS_IOS) return Promise.resolve(); // iOS Safari blocks navigator.vibrate
    if (!navigator || typeof navigator.vibrate !== 'function') return Promise.resolve();
    try {
      var pattern = WEB_VIBRATE[type];
      if (pattern == null && opts.duration) pattern = opts.duration;
      if (pattern != null) navigator.vibrate(pattern);
    } catch (_) { /* ignore */ }
    return Promise.resolve();
  }

  // ----- Local Notifications (daily exercise reminders) --------------------
  // Native: schedules a recurring local notification on the device. No server,
  // no network needed. Survives reboots and works offline. This is the single
  // biggest adherence lever for home rehab apps.
  // Web fallback: uses Notifications API where supported, but daily scheduling
  // requires the page to be open — so it's effectively a no-op until the user
  // installs the Android app.

  function requestNotificationPermission() {
    if (IS_NATIVE) {
      var LN = plugin('LocalNotifications');
      if (!LN) return Promise.resolve('unsupported');
      return safe(LN.requestPermissions()).then(function (r) {
        if (!r) return 'denied';
        return r.display === 'granted' ? 'granted' : 'denied';
      });
    }
    if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
    if (Notification.permission === 'granted') return Promise.resolve('granted');
    if (Notification.permission === 'denied') return Promise.resolve('denied');
    try {
      return Notification.requestPermission().then(function (p) { return p; });
    } catch (_) {
      return Promise.resolve('denied');
    }
  }

  function scheduleDailyReminder(opts) {
    opts = opts || {};
    var hour = (opts.hour != null) ? opts.hour : 18;     // 6pm default
    var minute = (opts.minute != null) ? opts.minute : 0;
    var id = opts.id || 1;
    var title = opts.title || 'Time for your exercise';
    var body = opts.body || 'Five minutes of practice keeps your gains. Tap to start.';

    if (!IS_NATIVE) return Promise.resolve({ scheduled: false, reason: 'web' });
    var LN = plugin('LocalNotifications');
    if (!LN) return Promise.resolve({ scheduled: false, reason: 'plugin-missing' });

    return requestNotificationPermission().then(function (perm) {
      if (perm !== 'granted') return { scheduled: false, reason: 'permission-denied' };
      return safe(LN.schedule({
        notifications: [{
          id: id,
          title: title,
          body: body,
          schedule: {
            on: { hour: hour, minute: minute },
            allowWhileIdle: true,
            repeats: true,
          },
          smallIcon: 'ic_stat_icon_config_sample',
          channelId: 'fpr-reminders',
        }],
      })).then(function () { return { scheduled: true }; });
    });
  }

  function cancelReminders(ids) {
    if (!IS_NATIVE) return Promise.resolve();
    var LN = plugin('LocalNotifications');
    if (!LN) return Promise.resolve();
    var toCancel = (ids && ids.length ? ids : [1]).map(function (i) { return { id: i }; });
    return safe(LN.cancel({ notifications: toCancel }));
  }

  // ----- Status bar (app only — no-op on web) ------------------------------
  function setStatusBar(opts) {
    if (!IS_NATIVE) return Promise.resolve();
    var SB = plugin('StatusBar');
    if (!SB) return Promise.resolve();
    var calls = [];
    if (opts && opts.style) {
      var s = opts.style.toUpperCase();
      calls.push(safe(SB.setStyle({ style: s === 'DARK' ? 'DARK' : 'LIGHT' })));
    }
    if (opts && opts.color) {
      calls.push(safe(SB.setBackgroundColor({ color: opts.color })));
    }
    return Promise.all(calls);
  }

  // ----- Splash screen control ---------------------------------------------
  function hideSplash() {
    if (!IS_NATIVE) return Promise.resolve();
    var SS = plugin('SplashScreen');
    if (!SS) return Promise.resolve();
    return safe(SS.hide());
  }

  // ----- App lifecycle ------------------------------------------------------
  function exitApp() {
    if (!IS_NATIVE) return Promise.resolve();
    var App = plugin('App');
    if (!App || !App.exitApp) return Promise.resolve();
    return safe(App.exitApp());
  }

  // ----- Expose --------------------------------------------------------------
  window.FPRNative = {
    isNative: IS_NATIVE,
    platform: PLATFORM,
    haptic: haptic,
    requestNotificationPermission: requestNotificationPermission,
    scheduleDailyReminder: scheduleDailyReminder,
    cancelReminders: cancelReminders,
    setStatusBar: setStatusBar,
    hideSplash: hideSplash,
    exitApp: exitApp,
  };

  // Auto-tag <html> so CSS can target native-vs-web differently if needed
  // (e.g., hide an "Install our Android app" promo when already in the app).
  try {
    document.documentElement.setAttribute(
      'data-fpr-platform',
      IS_NATIVE ? PLATFORM : 'web'
    );
    if (IS_NATIVE) document.documentElement.classList.add('fpr-native');
  } catch (_) { /* no DOM yet, fine */ }

  // Auto-hide the native splash once DOM is ready — game pages don't need it
  // lingering past first paint.
  if (IS_NATIVE) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(hideSplash, 50);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(hideSplash, 50);
      });
    }
  }
})();
