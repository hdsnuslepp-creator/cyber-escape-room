/**
 * Achievements & local leaderboard (localStorage — works on GitHub Pages)
 */
const Achievements = (() => {
  const STORAGE_KEY = 'cer_leaderboard';
  const MAX_ENTRIES = 10;

  const DEFS = [
    { id: 'first_room', icon: '🚪', title: 'First Door Open', desc: 'Complete your first room.' },
    { id: 'no_hints', icon: '💡', title: 'No Help Needed', desc: 'Escape without using any hints.' },
    { id: 'perfect_quiz', icon: '📝', title: 'Quiz Master', desc: 'Score 5/5 on the final quiz.' },
    { id: 'flawless', icon: '✨', title: 'Flawless Run', desc: 'Complete with zero mistakes.' },
    { id: 'speed_demon', icon: '⚡', title: 'Speed Demon', desc: 'Escape in under 10 minutes.' },
    { id: 'survivor', icon: '❤️', title: 'Last Life Legend', desc: 'Escape with only 1 life remaining.' },
    { id: 'high_scorer', icon: '🏆', title: 'High Scorer', desc: 'Finish with 1200+ points.' },
    { id: 'all_rooms', icon: '🔓', title: 'Full Escape', desc: 'Complete all 8 security rooms.' },
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
    if (s.completedRooms.length === 1) unlock('first_room');
    if (s.completedRooms.length === GameState.ROOMS.length) unlock('all_rooms');
  }

  function checkOnComplete() {
    const s = GameState.getState();
    if (s.hintsUsed.length === 0) unlock('no_hints');
    if (s.mistakes === 0) unlock('flawless');
    if (s.elapsedSeconds <= 600) unlock('speed_demon');
    if (s.lives === 1) unlock('survivor');
    if (s.score >= 1200) unlock('high_scorer');
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
      el.innerHTML = '<p class="leaderboard-empty">No scores yet — be the first!</p>';
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
