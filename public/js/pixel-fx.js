/**
 * 8-bit pixel animations — floaters, sprites, mission bursts.
 */
const PixelFX = (() => {
  const DIFFICULTY_META = {
    easy: { label: 'EASY', lives: 5, color: '#00ff88' },
    normal: { label: 'NORMAL', lives: 3, color: '#00e5ff' },
    hard: { label: 'HARD', lives: 2, color: '#ff3355' },
  };

  function init() {
    initFloaters();
    initDifficultyPicker();
    document.body.classList.add('pixel-game-active');
  }

  function initFloaters() {
    let layer = document.getElementById('pixelBg');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'pixelBg';
      layer.className = 'pixel-bg';
      layer.setAttribute('aria-hidden', 'true');
      document.body.prepend(layer);
    }
    if (layer.dataset.ready) return;
    layer.dataset.ready = '1';
    const colors = ['#00ff66', '#00ccff', '#ffcc00', '#ff3366'];
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('span');
      p.className = 'pixel-bg__bit';
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${6 + Math.random() * 10}s`;
      p.style.animationDelay = `${Math.random() * 8}s`;
      p.style.background = colors[i % colors.length];
      p.style.opacity = `${0.15 + Math.random() * 0.35}`;
      layer.appendChild(p);
    }
  }

  function initDifficultyPicker() {
    const picker = document.getElementById('difficultyPicker');
    const select = document.getElementById('difficultySelect');
    if (!picker || !select) return;

    picker.querySelectorAll('.difficulty-card').forEach((card) => {
      if (card.dataset.diffBound) return;
      card.dataset.diffBound = '1';
      card.addEventListener('click', () => {
        const level = card.dataset.difficulty;
        if (!level) return;
        select.value = level;
        syncDifficultyCards(level);
        if (typeof AudioFX !== 'undefined') AudioFX.click();
        card.classList.add('difficulty-card--pick');
        setTimeout(() => card.classList.remove('difficulty-card--pick'), 200);
      });
    });

    syncDifficultyCards(select.value || 'normal');
  }

  function syncDifficultyCards(level) {
    const norm = typeof GameState !== 'undefined'
      ? GameState.normalizeDifficulty(level)
      : level;
    document.querySelectorAll('.difficulty-card').forEach((card) => {
      const on = card.dataset.difficulty === norm;
      card.classList.toggle('difficulty-card--active', on);
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const select = document.getElementById('difficultySelect');
    if (select && select.value !== norm) select.value = norm;
  }

  function updateDifficultyHud(difficulty) {
    const el = document.getElementById('hudDifficulty');
    if (!el) return;
    const norm = typeof GameState !== 'undefined'
      ? GameState.normalizeDifficulty(difficulty)
      : difficulty;
    const meta = DIFFICULTY_META[norm] || DIFFICULTY_META.normal;
    el.textContent = meta.label;
    el.dataset.level = norm;
    el.style.color = meta.color;
  }

  function missionClear() {
    burst(document.getElementById('gameContainer'), '#00ff88');
    document.body.classList.add('pixel-flash-clear');
    setTimeout(() => document.body.classList.remove('pixel-flash-clear'), 350);
  }

  function lifeLost() {
    const lives = document.getElementById('hudLives');
    if (lives) {
      lives.classList.remove('hud__value--life-lost');
      void lives.offsetWidth;
      lives.classList.add('hud__value--life-lost');
    }
    document.body.classList.add('pixel-flash-damage');
    setTimeout(() => document.body.classList.remove('pixel-flash-damage'), 280);
  }

  function burst(container, color) {
    if (!container) return;
    const wrap = document.createElement('div');
    wrap.className = 'pixel-burst';
    wrap.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 10; i++) {
      const bit = document.createElement('span');
      bit.className = 'pixel-burst__bit';
      bit.style.background = color;
      bit.style.setProperty('--bx', `${(Math.random() - 0.5) * 160}px`);
      bit.style.setProperty('--by', `${-20 - Math.random() * 100}px`);
      bit.style.animationDelay = `${i * 25}ms`;
      wrap.appendChild(bit);
    }
    container.appendChild(wrap);
    wrap.addEventListener('animationend', () => wrap.remove());
    setTimeout(() => wrap.remove(), 900);
  }

  function animateAgent(scope) {
    const root = scope || document;
    root.querySelectorAll('.pixel-agent:not([data-agent-ready])').forEach((el) => {
      el.dataset.agentReady = '1';
    });
  }

  return {
    init,
    syncDifficultyCards,
    updateDifficultyHud,
    missionClear,
    lifeLost,
    burst,
    animateAgent,
  };
})();
