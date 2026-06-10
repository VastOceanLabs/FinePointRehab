/**
 * FinePointRehab Engagement Layer
 * Plain script (no modules) — safe to include with `defer` on any page.
 *
 * Aggregates the progress data the games already write under the FPR_v1_
 * namespace (totalSessions, streak, per-exercise sessions/best) into:
 *   - points + level (written to FPR_v1_points / FPR_v1_level, the keys the
 *     dashboard reads; points are seeded retroactively at 50/session so
 *     existing users keep their history)
 *   - a daily challenge with a once-per-day bonus
 *   - a renderable home-page progress strip
 *
 * It never writes to any key a game reads, so it cannot affect gameplay.
 */
(function () {
  'use strict';

  var PREFIX = 'FPR_v1_';
  var POINTS_PER_SESSION = 50;
  var CHALLENGE_BONUS = 50;

  var LEVELS = [
    { level: 1, points: 0, title: 'Taking First Steps' },
    { level: 2, points: 200, title: 'Building Momentum' },
    { level: 3, points: 500, title: 'Finding Your Rhythm' },
    { level: 4, points: 1000, title: 'Gaining Confidence' },
    { level: 5, points: 1750, title: 'Steady Progress' },
    { level: 6, points: 2750, title: 'Developing Mastery' },
    { level: 7, points: 4000, title: 'Sustained Growth' },
    { level: 8, points: 5500, title: 'Advanced Practice' },
    { level: 9, points: 7500, title: 'Expert Navigator' },
    { level: 10, points: 10000, title: 'Recovery Champion' }
  ];

  var CHALLENGES = [
    { id: 'one-session', text: 'Complete 1 session', target: 1, metric: 'sessions' },
    { id: 'two-sessions', text: 'Complete 2 sessions', target: 2, metric: 'sessions' },
    { id: 'two-games', text: 'Play 2 different games', target: 2, metric: 'games' },
    { id: 'three-sessions', text: 'Complete 3 sessions', target: 3, metric: 'sessions' }
  ];

  /* ------------------------------------------------------------ storage */
  // The shared /js/utils.js storage wrapper JSON-stringifies values, so a
  // count can be stored as `"10"` (with literal quotes) and arrays can be
  // double-encoded. unwrap() tolerates raw, quoted, and double-encoded data.
  function get(key) {
    try { return localStorage.getItem(PREFIX + key); } catch (e) { return null; }
  }
  function set(key, val) {
    try { localStorage.setItem(PREFIX + key, String(val)); } catch (e) { /* private mode */ }
  }
  function unwrap(raw) {
    if (raw === null || raw === undefined) return null;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  }
  function getInt(key, fallback) {
    var v = parseInt(unwrap(get(key)), 10);
    return isNaN(v) ? (fallback || 0) : v;
  }
  function getJSON(key, fallback) {
    try {
      var v = JSON.parse(get(key));
      if (typeof v === 'string') v = JSON.parse(v);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }

  function todayYMD() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayDiff(fromYMD, toYMD) {
    var f = fromYMD.split('-'), t = toYMD.split('-');
    var a = Date.UTC(+f[0], +f[1] - 1, +f[2]);
    var b = Date.UTC(+t[0], +t[1] - 1, +t[2]);
    return Math.round((b - a) / 86400000);
  }

  /* -------------------------------------------- per-exercise data scan */
  // Games are inconsistent about ids ('bubble' vs 'bubble_tap') and key
  // shapes; scan every FPR_v1_exercise:<id>:sessions key rather than trust
  // a registry.
  function scanExerciseSessions() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var m = k && k.match(/^FPR_v1_exercise:([^:]+):sessions$/);
        if (m) out[m[1]] = parseInt(unwrap(localStorage.getItem(k)), 10) || 0;
      }
    } catch (e) { /* storage unavailable */ }
    return out;
  }

  // Best score for a card: try several historical key shapes, take the max.
  function getBestScore(candidateIds) {
    var best = 0;
    candidateIds.forEach(function (id) {
      [
        'exercise:' + id + ':best',
        'PB_' + id,
        id + 'PersonalBest'
      ].forEach(function (k) {
        var v = parseInt(unwrap(get(k)), 10);
        if (!isNaN(v) && v > best) best = v;
      });
    });
    return best;
  }

  /* ------------------------------------------------------ points/level */
  function syncPoints(totalSessions) {
    var points = getInt('points', 0);
    // Retroactive credit so long-time users don't start at zero, and
    // forward credit for sessions recorded since the last visit.
    var earnedBase = getInt('pointsBaseSessions', 0);
    if (totalSessions > earnedBase) {
      points += (totalSessions - earnedBase) * POINTS_PER_SESSION;
      set('pointsBaseSessions', totalSessions);
      set('points', points);
    } else if (get('points') === null) {
      points = totalSessions * POINTS_PER_SESSION;
      set('pointsBaseSessions', totalSessions);
      set('points', points);
    }
    return points;
  }

  function levelFor(points) {
    var cur = LEVELS[0];
    for (var i = 0; i < LEVELS.length; i++) {
      if (points >= LEVELS[i].points) cur = LEVELS[i];
    }
    var next = LEVELS[cur.level] || null; // LEVELS is 0-indexed; level N's next is index N
    return {
      level: cur.level,
      title: cur.title,
      isMax: !next,
      progressPct: next ? Math.min(100, Math.round(((points - cur.points) / (next.points - cur.points)) * 100)) : 100,
      pointsIntoLevel: points - cur.points,
      pointsForNext: next ? next.points - cur.points : 0
    };
  }

  /* ------------------------------------------------------------ streak */
  function displayStreak() {
    var streak = getInt('streak', 0);
    var last = unwrap(get('lastActiveDate'));
    if (!last || typeof last !== 'string' || !streak) return 0;
    var gap;
    try { gap = dayDiff(last, todayYMD()); } catch (e) { return 0; }
    if (gap <= 1) return streak;
    // Weekend amnesty mirror of progress.js: Fri/Sat/Sun -> Mon keeps streak
    if (gap <= 3 && new Date().getDay() === 1) return streak;
    return 0;
  }

  /* ---------------------------------------------------- daily tracking */
  function syncDayTrack(totalSessions, perEx) {
    var today = todayYMD();
    var track = getJSON('dayTrack', null);
    if (!track || track.date !== today) {
      track = { date: today, total0: totalSessions, perEx0: perEx };
      set('dayTrack', JSON.stringify(track));
    }
    var sessionsToday = Math.max(0, totalSessions - (track.total0 || 0));
    var gamesToday = 0;
    for (var id in perEx) {
      var base = (track.perEx0 && track.perEx0[id]) || 0;
      if (perEx[id] > base) gamesToday++;
    }
    return { sessionsToday: sessionsToday, gamesToday: gamesToday };
  }

  function challengeForToday() {
    var d = new Date();
    var dayIndex = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return CHALLENGES[dayIndex % CHALLENGES.length];
  }

  function syncChallenge(todayStats) {
    var ch = challengeForToday();
    var progress = ch.metric === 'games' ? todayStats.gamesToday : todayStats.sessionsToday;
    var done = progress >= ch.target;
    var today = todayYMD();
    var bonusAwarded = get('challengeAwarded') === today;
    if (done && !bonusAwarded) {
      set('points', getInt('points', 0) + CHALLENGE_BONUS);
      set('challengeAwarded', today);
      bonusAwarded = true;
    }
    return {
      id: ch.id,
      text: ch.text,
      target: ch.target,
      progress: Math.min(progress, ch.target),
      done: done,
      bonus: CHALLENGE_BONUS,
      bonusAwarded: bonusAwarded
    };
  }

  /* ------------------------------------------------------------- stats */
  function getStats() {
    var perEx = scanExerciseSessions();
    var totalSessions = getInt('totalSessions', 0);
    var points = syncPoints(totalSessions);
    var todayStats = syncDayTrack(totalSessions, perEx);
    var challenge = syncChallenge(todayStats);
    points = getInt('points', points); // may have grown via challenge bonus
    var lvl = levelFor(points);
    set('level', lvl.level); // keep dashboard's key in sync
    var achievements = getJSON('achievements', []);
    return {
      points: points,
      level: lvl,
      streak: displayStreak(),
      totalSessions: totalSessions,
      sessionsToday: todayStats.sessionsToday,
      gamesToday: todayStats.gamesToday,
      achievementCount: Array.isArray(achievements) ? achievements.length : 0,
      challenge: challenge,
      isNewUser: totalSessions === 0
    };
  }

  /* ------------------------------------------------------ home strip UI */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderHomeStrip(el) {
    if (!el) return;
    var s = getStats();
    var ch = s.challenge;
    var challengeHTML =
      '<div class="pc-challenge' + (ch.done ? ' done' : '') + '">' +
        '<div class="pc-ch-title">' + (ch.done ? '✅ Challenge complete! +' + ch.bonus + ' pts' : '⭐ Daily challenge') + '</div>' +
        '<div class="pc-ch-text">' +
          (ch.done
            ? 'Brilliant work — come back tomorrow for a new one.'
            : esc(ch.text) + ' <strong>(' + ch.progress + '/' + ch.target + ')</strong> · +' + ch.bonus + ' pts') +
        '</div>' +
      '</div>';

    if (s.isNewUser) {
      el.innerHTML =
        '<div class="progress-card" role="region" aria-label="Your progress">' +
          '<div class="pc-level">' +
            '<div class="pc-level-badge" aria-hidden="true">1</div>' +
            '<div class="pc-level-info">' +
              '<p class="pc-level-title">Your journey starts here</p>' +
              '<div class="pc-xp-label">Finish your first session to earn ' + POINTS_PER_SESSION + ' points and start a streak.</div>' +
            '</div>' +
          '</div>' +
          challengeHTML +
        '</div>';
      return;
    }

    el.innerHTML =
      '<div class="progress-card" role="region" aria-label="Your progress">' +
        '<div class="pc-level">' +
          '<div class="pc-level-badge" aria-hidden="true">' + s.level.level + '</div>' +
          '<div class="pc-level-info">' +
            '<p class="pc-level-title">Level ' + s.level.level + ' — ' + esc(s.level.title) + '</p>' +
            '<div class="pc-xp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + s.level.progressPct + '" aria-label="Progress to next level">' +
              '<div class="pc-xp-fill" style="width:' + s.level.progressPct + '%"></div>' +
            '</div>' +
            '<div class="pc-xp-label">' +
              (s.level.isMax ? 'Maximum level reached — incredible!' : (s.level.pointsIntoLevel + ' / ' + s.level.pointsForNext + ' XP to next level')) +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pc-stats">' +
          '<div class="pc-stat"><div class="num">' + s.points.toLocaleString() + '</div><div class="lbl">Points</div></div>' +
          '<div class="pc-stat"><div class="num"><span class="flame">🔥</span> ' + s.streak + '</div><div class="lbl">Day streak</div></div>' +
          '<div class="pc-stat"><div class="num">' + s.totalSessions.toLocaleString() + '</div><div class="lbl">Sessions</div></div>' +
        '</div>' +
        challengeHTML +
      '</div>';
  }

  /* ----------------------------------------- exercise card best scores */
  function fillBestScores(root) {
    var nodes = (root || document).querySelectorAll('[data-ex-ids]');
    Array.prototype.forEach.call(nodes, function (node) {
      var ids = node.getAttribute('data-ex-ids').split(',').map(function (x) { return x.trim(); });
      var best = getBestScore(ids);
      if (best > 0) {
        node.textContent = '🏆 Best: ' + best.toLocaleString();
        node.classList.add('has-best');
      }
    });
  }

  /* ------------------------------------------------------------ expose */
  window.FPREngagement = {
    getStats: getStats,
    renderHomeStrip: renderHomeStrip,
    fillBestScores: fillBestScores,
    getBestScore: getBestScore
  };

  // Auto-wire if the page has the expected mount points.
  function init() {
    var strip = document.getElementById('fpr-progress-strip');
    if (strip) renderHomeStrip(strip);
    fillBestScores(document);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
