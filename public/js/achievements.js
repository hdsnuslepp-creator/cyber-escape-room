/**
 * Achievements & local leaderboard (localStorage — works on GitHub Pages)
 */
const Achievements = (() => {
  const STORAGE_KEY = 'cer_leaderboard';
  const MAX_ENTRIES = 10;

  const DEFS = [
    { id: 'first_click', icon: '🏆', title: 'First Click', desc: 'Complete the Phishing Inbox mission.' },
    { id: 'password_master', icon: '🔑', title: 'Password Master', desc: 'Complete Password Vault with zero mistakes.' },
    { id: 'cryptographer', icon: '🔐', title: 'Cryptographer', desc: 'Solve the Cipher Lab without using hints.' },
    { id: 'database_defender', icon: '🛡️', title: 'Database Defender', desc: 'Fix the SQL Breach on the first try.' },
    { id: 'threat_hunter', icon: '🎯', title: 'Threat Hunter', desc: 'Complete Log Forensics in under 2 minutes.' },
    { id: 'human_firewall', icon: '🧠', title: 'Human Firewall', desc: 'Perfect score on Social Engineering.' },
    { id: 'zero_trust', icon: '📱', title: 'Zero Trust Agent', desc: 'Complete the MFA Lockdown mission.' },
    { id: 'cyber_escape_champion', icon: '🏅', title: 'Cyber Escape Champion', desc: 'Complete all 56 missions and stop Project Chimera.' },
    { id: 'chapter_one_clear', icon: '📧', title: 'Email Contained', desc: 'Defeat the Chapter 1 boss before the timer expires.' },
    { id: 'credential_lockdown', icon: '🔒', title: 'Credential Lockdown', desc: 'Defeat the Chapter 2 boss before the timer expires.' },
    { id: 'stego_hunter', icon: '🖼️', title: 'Stego Hunter', desc: 'Extract a hidden payload from the steganography lab.' },
    { id: 'backup_hero', icon: '💾', title: 'Backup Hero', desc: 'Select the correct clean backup before the final boss.' },
    { id: 'hijack_hunter', icon: '🛡️', title: 'Hijack Hunter', desc: 'Correctly double-check 5 CHIMERA UI hijacks.' },
    { id: 'no_hints', icon: '💡', title: 'No Help Needed', desc: 'Complete the campaign without using any hints.' },
    { id: 'perfect_quiz', icon: '📝', title: 'Quiz Master', desc: 'Perfect score on the Lightning Debrief.' },
    { id: 'flawless', icon: '✨', title: 'Flawless Run', desc: 'Complete with zero mistakes.' },
    { id: 'speed_demon', icon: '⚡', title: 'Speed Demon', desc: 'Escape in under 10 minutes.' },
  ];

  let unlocked = new Set();

  function reset() {
    unlocked = new Set();
  }

  function unlock(id) {
    if (unlocked.has(id)) return null;
    const def = DEFS.find((a) => a.id === id);
    if (!def) return null;
    unlocked.add(id);
    showToast(def);
    AudioFX.achievement();
    return def;
  }

  function showToast(def) {
    const el = document.getElementById('achievementToast');
    if (!el) return;
    document.getElementById('achievementTitle').textContent = def.title;
    document.getElementById('achievementDesc').textContent = def.desc;
    document.querySelector('#achievementToast .achievement-toast__icon').textContent = def.icon;
    el.hidden = false;
    el.classList.remove('achievement-toast--hide');
    el.classList.add('achievement-toast--show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      el.classList.remove('achievement-toast--show');
      el.classList.add('achievement-toast--hide');
      setTimeout(() => { el.hidden = true; }, 400);
    }, 3200);
  }

  function checkAfterRoom(roomId) {
    const s = GameState.getState();
    switch (roomId) {
      case 'phishing':
        unlock('first_click');
        break;
      case 'ch1_boss':
        unlock('chapter_one_clear');
        break;
      case 'ch2_boss':
        unlock('credential_lockdown');
        break;
      case 'steganography':
        unlock('stego_hunter');
        break;
      case 'backup':
        unlock('backup_hero');
        break;
      case 'password':
        if ((s.roomMistakes.password || 0) === 0) unlock('password_master');
        break;
      case 'cipher':
        if ((s.roomHints.cipher || 0) === 0) unlock('cryptographer');
        break;
      case 'sql':
        if ((s.roomMistakes.sql || 0) === 0) unlock('database_defender');
        break;
      case 'logs':
        if (GameState.getRoomDuration('logs') <= 120) unlock('threat_hunter');
        break;
      case 'social':
        if ((s.roomMistakes.social || 0) === 0) unlock('human_firewall');
        break;
      case 'mfa':
        unlock('zero_trust');
        break;
      case 'ransomware':
        unlock('cyber_escape_champion');
        break;
    }
    if (s.completedRooms.length === GameState.ROOMS.length) {
      unlock('cyber_escape_champion');
    }
  }

  function checkOnComplete() {
    const s = GameState.getState();
    if (s.hintsUsed.length === 0) unlock('no_hints');
    if (s.mistakes === 0) unlock('flawless');
    if (s.elapsedSeconds <= 600) unlock('speed_demon');
    if (s.quizScore && s.quizScore.correct === s.quizScore.total) unlock('perfect_quiz');
  }

  function getUnlockedList() {
    return DEFS.filter((a) => unlocked.has(a.id));
  }

  function saveLeaderboard(entry) {
    const list = loadLeaderboard();
    list.push({
      name: entry.name,
      score: entry.score,
      time: entry.time,
      achievements: entry.achievements,
      date: new Date().toISOString(),
    });
    list.sort((a, b) => b.score - a.score || a.time - b.time);
    const trimmed = list.slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed.findIndex((e) => e.name === entry.name && e.score === entry.score) + 1;
  }

  function loadLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function renderLeaderboard(containerId, highlightName) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const list = loadLeaderboard();
    if (!list.length) {
      el.innerHTML = '<p class="leaderboard-empty">&gt; NO OPERATIVES LOGGED — BE FIRST</p>';
      return;
    }
    el.innerHTML = `
      <table class="leaderboard-table">
        <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Time</th></tr></thead>
        <tbody>
          ${list.map((e, i) => {
            const hl = highlightName && e.name === highlightName ? ' class="leaderboard-row--you"' : '';
            return `<tr${hl}><td>${i + 1}</td><td>${escapeHtml(e.name)}</td><td>${e.score}</td><td>${GameState.formatTime(e.time)}</td></tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  return {
    DEFS,
    reset,
    unlock,
    checkAfterRoom,
    checkOnComplete,
    getUnlockedList,
    saveLeaderboard,
    loadLeaderboard,
    renderLeaderboard,
  };
})();
