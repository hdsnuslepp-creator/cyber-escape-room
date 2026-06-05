/**
 * Cyber Escape Room Platform — Main Game Controller
 */
(function () {
  'use strict';

  const REQUIRED_PHISHING_FLAGS = 3;
  const PHISHING_FLAG_KEYS = new Set(['sender', 'link', 'urgency']);

  const PASSWORDS = [
    { id: 'a', text: 'password123', correct: false, ctx: 'password123' },
    { id: 'b', text: 'Summer2024!', correct: false, ctx: 'Summer2024' },
    { id: 'c', text: 'Tr0ub4dor&3', correct: false, ctx: 'Tr0ub4dor' },
    { id: 'd', text: 'k9#mP2$vL8@xQ4!nR', correct: true, ctx: 'correct' },
  ];

  const SQL_OPTIONS = [
    { id: 'a', text: 'Add input length validation only', correct: false, ctx: 'default' },
    { id: 'b', text: 'Use parameterized query: db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password])', correct: true, ctx: 'parameterized' },
    { id: 'c', text: 'Escape HTML characters in the input', correct: false, ctx: 'default' },
    { id: 'd', text: 'Block usernames containing quotes', correct: false, ctx: 'default' },
  ];

  const SOCIAL_OPTIONS = [
    { id: 'a', text: 'Give your password so they can help quickly', correct: false, ctx: 'give_password' },
    { id: 'b', text: 'Hang up and call IT using the official number on the company website', correct: true, ctx: 'verify_callback' },
    { id: 'c', text: 'Share your MFA code instead of your password', correct: false, ctx: 'give_mfa' },
    { id: 'd', text: 'Ask them to email you a link and click it', correct: false, ctx: 'default' },
  ];

  const MFA_OPTIONS = [
    { id: 'a', text: 'Read the code aloud to the agent on the phone', correct: false, ctx: 'share_code' },
    { id: 'b', text: 'Ignore the message — never share MFA codes with anyone', correct: true, ctx: 'correct' },
    { id: 'c', text: 'Text the code to the number so they can verify faster', correct: false, ctx: 'share_code' },
    { id: 'd', text: 'Enter the code on a link they send you', correct: false, ctx: 'default' },
  ];

  const RANSOMWARE_OPTIONS = [
    { id: 'a', text: 'Pay the Bitcoin immediately to get your files back', correct: false, ctx: 'pay' },
    { id: 'b', text: 'Disconnect from the network and report to IT immediately', correct: true, ctx: 'correct' },
    { id: 'c', text: 'Restart the computer and hope it goes away', correct: false, ctx: 'restart' },
    { id: 'd', text: 'Download the "decryption tool" from the popup', correct: false, ctx: 'download' },
  ];

  const LOG_ENTRIES = [
    { time: '09:01:12', user: 'jsmith', ip: '192.168.1.45', status: 'SUCCESS', location: 'Office — NYC' },
    { time: '09:02:33', user: 'admin', ip: '203.45.67.89', status: 'FAIL', location: 'Unknown — RU' },
    { time: '09:02:34', user: 'admin', ip: '203.45.67.89', status: 'FAIL', location: 'Unknown — RU' },
    { time: '09:02:35', user: 'root', ip: '203.45.67.89', status: 'FAIL', location: 'Unknown — RU' },
    { time: '09:02:36', user: 'administrator', ip: '203.45.67.89', status: 'FAIL', location: 'Unknown — RU' },
    { time: '09:02:37', user: 'admin', ip: '203.45.67.89', status: 'FAIL', location: 'Unknown — RU' },
    { time: '09:03:01', user: 'mwilson', ip: '10.0.0.12', status: 'SUCCESS', location: 'Remote — CA' },
    { time: '09:04:22', user: 'guest', ip: '172.16.0.5', status: 'FAIL', location: 'Office — NYC' },
  ];

  const ATTACK_IP = '203.45.67.89';
  const IP_OPTIONS = ['192.168.1.45', '203.45.67.89', '10.0.0.12', '172.16.0.5'];
  const CIPHER_ANSWER = 'TOP SECRET';

  let currentScreen = 'intro';
  let foundFlags = new Set();
  let selectedPassword = null;
  let selectedSql = null;
  let selectedIp = null;
  let selectedSocial = null;
  let selectedMfa = null;
  let selectedRansomware = null;
  let hintLevels = {};
  let quizData = [];
  let quizAnswers = {};

  const gameHeader = document.getElementById('gameHeader');
  const progressBar = document.getElementById('progressBar');

  function init() {
    AudioFX.initUI();
    buildProgressBar();
    bindGlobalEvents();
    initRooms();
    updateHud();
    Achievements.renderLeaderboard('introLeaderboard');
  }

  function buildProgressBar() {
    progressBar.innerHTML = GameState.ROOMS.map(
      (r, i) => `<div class="progress-step" data-room="${r}" title="${GameState.getRoomLabel(r)}"></div>`
    ).join('') + '<div class="progress-step" data-room="quiz" title="Quiz"></div>';
  }

  function bind(el, event, handler) {
    if (el) el.addEventListener(event, handler);
  }

  function bindGlobalEvents() {
    bind(document.getElementById('btnStart'), 'click', startGame);
    bind(document.getElementById('btnRestart'), 'click', () => location.reload());
    bind(document.getElementById('btnRetry'), 'click', () => location.reload());
    bind(document.getElementById('btnPrint'), 'click', () => window.print());

    document.querySelectorAll('[data-hint-room]').forEach((btn) => {
      btn.addEventListener('click', () => useHint(btn.dataset.hintRoom));
    });

    bind(document.getElementById('btn-phishing'), 'click', submitPhishing);
    bind(document.getElementById('btn-password'), 'click', submitPassword);
    bind(document.getElementById('btn-cipher'), 'click', submitCipher);
    bind(document.getElementById('btn-sql'), 'click', submitSql);
    bind(document.getElementById('btn-logs'), 'click', submitLogs);
    bind(document.getElementById('btn-social'), 'click', submitSocial);
    bind(document.getElementById('btn-mfa'), 'click', submitMfa);
    bind(document.getElementById('btn-ransomware'), 'click', submitRansomware);
    bind(document.getElementById('btn-quiz'), 'click', submitQuiz);

    bind(document.getElementById('cipherAnswer'), 'keydown', (e) => {
      if (e.key.length === 1) AudioFX.type();
      if (e.key === 'Enter') submitCipher();
    });

    bind(document.getElementById('studentName'), 'keydown', (e) => {
      if (e.key.length === 1) AudioFX.type();
      if (e.key === 'Enter') startGame();
    });
  }

  function initRooms() {
    initPhishing();
    initPassword();
    initLogs();
    initSql();
    initSocial();
    initMfa();
    initRansomware();
  }

  async function startGame() {
    const name = document.getElementById('studentName').value.trim();
    if (!name) {
      alert('Please enter your name to begin.');
      return;
    }

    AudioFX.resume();
    AudioFX.boot();
    AudioFX.startMusic();
    GameState.reset(name);
    Achievements.reset();
    hintLevels = {};
    foundFlags = new Set();
    selectedPassword = null;
    selectedSql = null;
    selectedIp = null;
    selectedSocial = null;
    selectedMfa = null;
    selectedRansomware = null;

    gameHeader.hidden = false;
    initRooms();

    GameState.startTimer((_, formatted) => {
      document.getElementById('hudTime').textContent = formatted;
    });

    showScreen('phishing');
  }

  function showScreen(screenId, opts = {}) {
    const wasInGame = currentScreen !== 'intro' && currentScreen !== 'gameover';
    currentScreen = screenId;
    document.querySelectorAll('.screen').forEach((el) => {
      const active = el.dataset.screen === screenId;
      el.classList.toggle('screen--active', active);
      if (active) {
        el.classList.remove('screen--enter');
        void el.offsetWidth;
        el.classList.add('screen--enter');
      }
    });
    if (opts.playTransition !== false && wasInGame && screenId !== 'gameover') {
      AudioFX.roomTransition();
    }
    updateProgress();
    updateHud();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgress() {
    const state = GameState.getState();
    const order = [...GameState.ROOMS, 'quiz', 'certificate'];
    const idx = order.indexOf(currentScreen === 'gameover' ? 'intro' : currentScreen);

    progressBar.querySelectorAll('.progress-step').forEach((step, i) => {
      step.classList.remove('progress-step--complete', 'progress-step--current');
      if (i < idx) step.classList.add('progress-step--complete');
      else if (i === idx) step.classList.add('progress-step--current');
    });
  }

  function pulseScore() {
    const el = document.getElementById('hudScore');
    el.classList.remove('hud__value--pulse');
    void el.offsetWidth;
    el.classList.add('hud__value--pulse');
  }

  function updateHud() {
    const s = GameState.getState();
    document.getElementById('hudScore').textContent = s.score;
    document.getElementById('hudLives').textContent = '❤'.repeat(s.lives) + '🖤'.repeat(GameState.MAX_LIVES - s.lives);
  }

  function showFeedback(id, msg, type) {
    const el = document.getElementById(id);
    el.hidden = false;
    el.textContent = msg;
    el.className = 'feedback feedback--' + type;
  }

  function hideFeedback(id) {
    const el = document.getElementById(id);
    el.hidden = true;
    el.textContent = '';
  }

  function showTutor(roomId, msg) {
    const el = document.getElementById('tutor-' + roomId);
    if (!el) return;
    el.hidden = false;
    el.innerHTML = '<strong>🤖 AI Tutor:</strong> ' + escapeHtml(msg);
  }

  async function handleMistake(roomId, context) {
    AudioFX.error();
    const prevLives = GameState.getState().lives;
    const dead = GameState.recordMistake(roomId);
    if (!dead && GameState.getState().lives < prevLives) {
      AudioFX.lifeLost();
    }
    updateHud();
    const msg = await TutorClient.explain(roomId, context);
    showTutor(roomId, msg);
    showFeedback('feedback-' + roomId, msg, 'error');
    if (dead) {
      GameState.stopTimer();
      AudioFX.gameOver();
      setTimeout(() => showScreen('gameover'), 1200);
    }
    return dead;
  }

  async function useHint(roomId) {
    AudioFX.hint();
    const level = hintLevels[roomId] || 0;
    hintLevels[roomId] = level + 1;
    const hint = await TutorClient.hint(roomId, level);
    GameState.recordHint(roomId, hint);
    updateHud();
    showTutor(roomId, 'Hint: ' + hint);
  }

  async function completeRoom(roomId) {
    AudioFX.levelComplete();
    GameState.completeRoom(roomId);
    Achievements.checkAfterRoom(roomId);
    const summary = await TutorClient.summary(roomId, GameState.getState().roomStats);
    showTutor(roomId, summary);
    showFeedback('feedback-' + roomId, summary + ' Room unlocked!', 'success');

    const rooms = GameState.ROOMS;
    const idx = rooms.indexOf(roomId);
    const next = rooms[idx + 1];

    setTimeout(async () => {
      if (next) showScreen(next);
      else await startQuiz();
    }, 2000);
  }

  // --- Phishing ---
  function initPhishing() {
    foundFlags = new Set();
    document.getElementById('flagCount').textContent = '0';
    document.getElementById('btn-phishing').disabled = true;
    hideFeedback('feedback-phishing');
    document.getElementById('tutor-phishing').hidden = true;

    document.querySelectorAll('[data-screen="phishing"] .phishing-target').forEach((el) => {
      el.classList.remove('phishing-target--found');
      el.onclick = onPhishingClick;
      el.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPhishingClick.call(el, e);
        }
      };
    });
  }

  function onPhishingClick(e) {
    e.preventDefault();
    const flag = this.dataset.flag;
    if (!flag || this.classList.contains('phishing-target--found')) return;

    AudioFX.click();

    if (PHISHING_FLAG_KEYS.has(flag)) {
      this.classList.add('phishing-target--found');
      foundFlags.add(flag);
      AudioFX.flagFound();
      document.getElementById('flagCount').textContent = String(foundFlags.size);
      if (foundFlags.size >= REQUIRED_PHISHING_FLAGS) {
        document.getElementById('btn-phishing').disabled = false;
        AudioFX.doorUnlock();
        showFeedback('feedback-phishing', 'All 3 red flags found!', 'success');
      }
    } else if (flag === 'attachment') {
      showTutor('phishing', 'Good eye — .exe attachments are dangerous, but this room needs 3 core flags: sender, link, and urgency.');
    } else {
      handleMistake('phishing', 'wrong_click');
    }
  }

  async function submitPhishing() {
    AudioFX.submit();
    if (foundFlags.size >= REQUIRED_PHISHING_FLAGS) {
      await completeRoom('phishing');
    }
  }

  // --- Password ---
  function initPassword() {
    const container = document.getElementById('passwordOptions');
    container.innerHTML = '';
    selectedPassword = null;
    document.getElementById('btn-password').disabled = true;
    hideFeedback('feedback-password');
    document.getElementById('tutor-password').hidden = true;

    PASSWORDS.forEach((pw) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'password-option';
      btn.innerHTML = `<span class="password-option__radio"></span><span>${escapeHtml(pw.text)}</span>`;
      btn.addEventListener('click', () => {
        AudioFX.click();
        selectedPassword = pw.id;
        container.querySelectorAll('.password-option').forEach((el) => el.classList.remove('password-option--selected'));
        btn.classList.add('password-option--selected');
        document.getElementById('btn-password').disabled = false;
        hideFeedback('feedback-password');
      });
      container.appendChild(btn);
    });
  }

  async function submitPassword() {
    AudioFX.submit();
    const chosen = PASSWORDS.find((p) => p.id === selectedPassword);
    if (!chosen) return;
    if (chosen.correct) {
      await completeRoom('password');
    } else {
      await handleMistake('password', chosen.ctx);
    }
  }

  // --- Cipher ---
  async function submitCipher() {
    AudioFX.submit();
    const val = document.getElementById('cipherAnswer').value.trim().toUpperCase().replace(/\s+/g, ' ');
    if (!val) {
      showFeedback('feedback-cipher', 'Enter the door code.', 'error');
      return;
    }
    if (val === CIPHER_ANSWER) {
      await completeRoom('cipher');
    } else {
      await handleMistake('cipher', 'default');
    }
  }

  // --- SQL ---
  function initSql() {
    const container = document.getElementById('sqlOptions');
    container.innerHTML = '';
    selectedSql = null;
    document.getElementById('btn-sql').disabled = true;
    hideFeedback('feedback-sql');
    document.getElementById('tutor-sql').hidden = true;

    SQL_OPTIONS.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => {
        AudioFX.click();
        selectedSql = opt.id;
        container.querySelectorAll('.option-btn').forEach((el) => el.classList.remove('option-btn--selected'));
        btn.classList.add('option-btn--selected');
        document.getElementById('btn-sql').disabled = false;
      });
      container.appendChild(btn);
    });
  }

  async function submitSql() {
    AudioFX.submit();
    const chosen = SQL_OPTIONS.find((o) => o.id === selectedSql);
    if (!chosen) return;
    if (chosen.correct) {
      await completeRoom('sql');
    } else {
      await handleMistake('sql', chosen.ctx);
    }
  }

  // --- Logs ---
  function initLogs() {
    selectedIp = null;
    document.getElementById('btn-logs').disabled = true;
    hideFeedback('feedback-logs');
    document.getElementById('tutor-logs').hidden = true;

    document.getElementById('logTableBody').innerHTML = LOG_ENTRIES.map((e) => {
      const cls = e.status === 'FAIL' ? 'status--fail' : 'status--success';
      const hl = e.ip === ATTACK_IP && e.status === 'FAIL' ? ' class="row--highlight"' : '';
      return `<tr${hl}><td>${e.time}</td><td>${e.user}</td><td>${e.ip}</td><td class="${cls}">${e.status}</td><td>${e.location}</td></tr>`;
    }).join('');

    const container = document.getElementById('ipOptions');
    container.innerHTML = '';
    IP_OPTIONS.forEach((ip) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ip-option';
      btn.textContent = ip;
      btn.addEventListener('click', () => {
        AudioFX.click();
        selectedIp = ip;
        container.querySelectorAll('.ip-option').forEach((el) => el.classList.remove('ip-option--selected'));
        btn.classList.add('ip-option--selected');
        document.getElementById('btn-logs').disabled = false;
      });
      container.appendChild(btn);
    });
  }

  async function submitLogs() {
    AudioFX.submit();
    if (!selectedIp) return;
    if (selectedIp === ATTACK_IP) {
      await completeRoom('logs');
    } else {
      await handleMistake('logs', selectedIp);
    }
  }

  // --- Social ---
  function initSocial() {
    const container = document.getElementById('socialOptions');
    container.innerHTML = '';
    selectedSocial = null;
    document.getElementById('btn-social').disabled = true;
    hideFeedback('feedback-social');
    document.getElementById('tutor-social').hidden = true;

    SOCIAL_OPTIONS.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => {
        AudioFX.click();
        selectedSocial = opt.id;
        container.querySelectorAll('.option-btn').forEach((el) => el.classList.remove('option-btn--selected'));
        btn.classList.add('option-btn--selected');
        document.getElementById('btn-social').disabled = false;
      });
      container.appendChild(btn);
    });
  }

  async function submitSocial() {
    AudioFX.submit();
    const chosen = SOCIAL_OPTIONS.find((o) => o.id === selectedSocial);
    if (!chosen) return;
    if (chosen.correct) {
      await completeRoom('social');
    } else {
      await handleMistake('social', chosen.ctx);
    }
  }

  function initOptionRoom(containerId, options, onSelect) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => {
        AudioFX.click();
        onSelect(opt.id, btn, container);
      });
      container.appendChild(btn);
    });
  }

  function initMfa() {
    selectedMfa = null;
    document.getElementById('btn-mfa').disabled = true;
    hideFeedback('feedback-mfa');
    document.getElementById('tutor-mfa').hidden = true;
    initOptionRoom('mfaOptions', MFA_OPTIONS, (id, btn, container) => {
      selectedMfa = id;
      container.querySelectorAll('.option-btn').forEach((el) => el.classList.remove('option-btn--selected'));
      btn.classList.add('option-btn--selected');
      document.getElementById('btn-mfa').disabled = false;
    });
  }

  async function submitMfa() {
    AudioFX.submit();
    const chosen = MFA_OPTIONS.find((o) => o.id === selectedMfa);
    if (!chosen) return;
    if (chosen.correct) {
      await completeRoom('mfa');
    } else {
      await handleMistake('mfa', chosen.ctx);
    }
  }

  function initRansomware() {
    selectedRansomware = null;
    document.getElementById('btn-ransomware').disabled = true;
    hideFeedback('feedback-ransomware');
    document.getElementById('tutor-ransomware').hidden = true;
    initOptionRoom('ransomwareOptions', RANSOMWARE_OPTIONS, (id, btn, container) => {
      selectedRansomware = id;
      container.querySelectorAll('.option-btn').forEach((el) => el.classList.remove('option-btn--selected'));
      btn.classList.add('option-btn--selected');
      document.getElementById('btn-ransomware').disabled = false;
    });
  }

  async function submitRansomware() {
    AudioFX.submit();
    const chosen = RANSOMWARE_OPTIONS.find((o) => o.id === selectedRansomware);
    if (!chosen) return;
    if (chosen.correct) {
      await completeRoom('ransomware');
    } else {
      await handleMistake('ransomware', chosen.ctx);
    }
  }

  // --- Quiz ---
  async function startQuiz() {
    quizData = await TutorClient.fetchQuiz();
    quizAnswers = {};
    renderQuiz();
    showScreen('quiz');
  }

  function renderQuiz() {
    const container = document.getElementById('quizContainer');
    container.innerHTML = quizData.map((q, qi) => `
      <div class="quiz-question" data-q="${qi}">
        <p class="quiz-question__text">${qi + 1}. ${escapeHtml(q.question)}</p>
        <div class="quiz-options">
          ${q.options.map((opt, oi) => `
            <button type="button" class="quiz-option" data-q="${qi}" data-o="${oi}">${escapeHtml(opt)}</button>
          `).join('')}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.quiz-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        AudioFX.click();
        const qi = btn.dataset.q;
        quizAnswers[qi] = parseInt(btn.dataset.o, 10);
        container.querySelectorAll(`.quiz-option[data-q="${qi}"]`).forEach((el) => el.classList.remove('quiz-option--selected'));
        btn.classList.add('quiz-option--selected');
        if (Object.keys(quizAnswers).length === quizData.length) {
          document.getElementById('btn-quiz').disabled = false;
        }
      });
    });
  }

  async function submitQuiz() {
    AudioFX.submit();
    quizData.forEach((q, i) => {
      setTimeout(() => {
        if (quizAnswers[i] === q.correct) AudioFX.quizCorrect();
        else AudioFX.quizWrong();
      }, i * 100);
    });

    let correct = 0;
    quizData.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) correct++;
    });

    GameState.setQuizScore(correct, quizData.length);
    const timeBonus = GameState.applyTimeBonus();
    if (timeBonus > 0) {
      AudioFX.scoreBonus();
      pulseScore();
    }
    Achievements.checkOnComplete();
    updateHud();
    if (correct >= 3) AudioFX.success();

    showFeedback(
      'feedback-quiz',
      `Quiz: ${correct}/${quizData.length} correct (+${correct * 20} pts)${timeBonus ? ` | Speed bonus: +${timeBonus}` : ''}`,
      correct >= 3 ? 'success' : 'info'
    );

    GameState.stopTimer();
    await saveResults();
    const s = GameState.getState();
    Achievements.saveLeaderboard({
      name: s.studentName,
      score: s.score,
      time: s.elapsedSeconds,
      achievements: Achievements.getUnlockedList().length,
    });
    renderCertificate();
    setTimeout(() => {
      AudioFX.certificate();
      showScreen('certificate');
    }, 1500);
  }

  async function saveResults() {
    const url = AppConfig.apiUrl('/sessions');
    if (!url) return;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(GameState.getResultsPayload()),
      });
    } catch {
      /* works offline without server */
    }
  }

  function renderCertificate() {
    const s = GameState.getState();
    document.getElementById('certName').textContent = s.studentName;
    document.getElementById('certDate').textContent = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const hardest = GameState.getHardestRoom();
    document.getElementById('certStats').innerHTML = `
      <div class="cert-stat"><span>Score</span><strong>${s.score}</strong></div>
      <div class="cert-stat"><span>Time</span><strong>${GameState.formatTime(s.elapsedSeconds)}</strong></div>
      <div class="cert-stat"><span>Time Bonus</span><strong>+${s.timeBonus || 0}</strong></div>
      <div class="cert-stat"><span>Mistakes</span><strong>${s.mistakes}</strong></div>
      <div class="cert-stat"><span>Hints Used</span><strong>${s.hintsUsed.length}</strong></div>
      <div class="cert-stat"><span>Hardest Room</span><strong>${GameState.getRoomLabel(hardest)}</strong></div>
      <div class="cert-stat"><span>Quiz</span><strong>${s.quizScore ? s.quizScore.correct + '/' + s.quizScore.total : '—'}</strong></div>
    `;

    const ach = Achievements.getUnlockedList();
    document.getElementById('certAchievements').innerHTML = ach.length
      ? `<h3>🏅 Achievements (${ach.length})</h3><div class="achievement-badges">${ach.map((a) => `<span class="achievement-badge" title="${a.desc}">${a.icon} ${a.title}</span>`).join('')}</div>`
      : '';

    Achievements.renderLeaderboard('certLeaderboard', s.studentName);
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
