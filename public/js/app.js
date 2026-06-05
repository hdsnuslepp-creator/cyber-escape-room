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

  const ATTACHMENT_FLAG_KEYS = new Set(['macro', 'link']);
  const REQUIRED_ATTACHMENT_FLAGS = 2;
  const FAKE_LOGIN_OPTIONS = [
    { id: 'a', text: 'https://login.acmecorp.com/auth', correct: true, ctx: 'correct' },
    { id: 'b', text: 'https://login-acmecorp.com/auth', correct: false, ctx: 'typosquat' },
    { id: 'c', text: 'https://acmecorp-secure.com/login', correct: false, ctx: 'typosquat' },
    { id: 'd', text: 'https://acmec0rp.com/signin', correct: false, ctx: 'typosquat' },
  ];
  const CH1_BOSS_URL_OPTIONS = [
    { id: 'fake', text: 'https://paypa1-verify.com/login', correct: true },
    { id: 'real', text: 'https://paypal.com/signin', correct: false },
    { id: 'other', text: 'https://secure-paypal.com/auth', correct: false },
  ];
  const CH1_BOSS_TIME_SEC = 90;

  let currentScreen = 'intro';
  let hintLevels = {};
  let pendingChapterId = 1;
  let foundFlags = new Set();
  let attachmentFlags = new Set();
  let selectedFakeLogin = null;
  let ch1BossTimerId = null;
  let ch1BossSecondsLeft = CH1_BOSS_TIME_SEC;
  let ch1BossTasks = new Set();
  let selectedPassword = null;
  let selectedSql = null;
  let selectedIp = null;
  let selectedSocial = null;
  let selectedMfa = null;
  const BOSS_TIME_SEC = 300;
  const BOSS_TASK_KEYS = ['phishing', 'cipher', 'sql', 'logs', 'mfa'];
  let bossTimerId = null;
  let bossSecondsLeft = BOSS_TIME_SEC;
  let bossTasksComplete = new Set();
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
    runBootSequence();
  }

  function runBootSequence() {
    const container = document.getElementById('bootSequence');
    const actions = document.getElementById('introActions');
    if (!container || !actions) {
      if (actions) actions.hidden = false;
      Achievements.renderLeaderboard('introLeaderboard');
      return;
    }

    const lines = [
      { html: '<span class="prompt">&gt;</span> LOADING SECURE_TRAINING_ROOM.EXE' },
      { html: '<span class="prompt">&gt;</span> CAMPAIGN MODE: 9 CHAPTERS / 27 MISSIONS', cls: 'boot-line--ok' },
      { html: '<span class="prompt">&gt;</span> CHECKING FIREWALL... <span class="boot-ok">OK</span>', cls: 'boot-line--ok' },
      { html: '<span class="prompt">&gt;</span> CONNECTING TO MAINFRAME... <span class="boot-ok">OK</span>', cls: 'boot-line--ok' },
      { html: '<span class="prompt">&gt;</span> THREAT LEVEL: CRITICAL', cls: 'boot-line--warn' },
      { html: '<span class="prompt">&gt;</span> <span class="blink">BREACH DETECTED — CONTAINMENT REQUIRED</span>', cls: 'boot-line--danger' },
    ];

    let i = 0;
    function showNext() {
      if (i >= lines.length) {
        actions.hidden = false;
        actions.classList.add('intro-actions--show');
        Achievements.renderLeaderboard('introLeaderboard');
        return;
      }
      const line = lines[i++];
      const el = document.createElement('p');
      el.className = 'terminal-line boot-line' + (line.cls ? ' ' + line.cls : '');
      el.innerHTML = line.html;
      container.appendChild(el);
      if (typeof AudioFX !== 'undefined' && AudioFX.type) AudioFX.type();
      setTimeout(showNext, i === 1 ? 300 : 480 + Math.random() * 220);
    }
    showNext();
  }

  function buildProgressBar() {
    progressBar.innerHTML = GameState.ROOMS.map((r) => {
      const c = Campaign.getRoom(r);
      return `<div class="progress-step" data-room="${r}" title="${c.actTitle} — ${c.title}"></div>`;
    }).join('') + '<div class="progress-step" data-room="quiz" title="Final Debrief Quiz"></div>';
  }

  function bind(el, event, handler) {
    if (el) el.addEventListener(event, handler);
  }

  function bindGlobalEvents() {
    bind(document.getElementById('btnStart'), 'click', startGame);
    bind(document.getElementById('btnChapterContinue'), 'click', enterChapter);
    bind(document.getElementById('btnRestart'), 'click', () => location.reload());
    bind(document.getElementById('btnRetry'), 'click', () => location.reload());
    bind(document.getElementById('btnPrint'), 'click', () => window.print());

    document.querySelectorAll('[data-hint-room]').forEach((btn) => {
      btn.addEventListener('click', () => useHint(btn.dataset.hintRoom));
    });

    bind(document.getElementById('btn-phishing'), 'click', submitPhishing);
    bind(document.getElementById('btn-attachment'), 'click', submitAttachment);
    bind(document.getElementById('btn-fake_login'), 'click', submitFakeLogin);
    bind(document.getElementById('btn-password'), 'click', submitPassword);
    bind(document.getElementById('btn-cipher'), 'click', submitCipher);
    bind(document.getElementById('btn-sql'), 'click', submitSql);
    bind(document.getElementById('btn-logs'), 'click', submitLogs);
    bind(document.getElementById('btn-social'), 'click', submitSocial);
    bind(document.getElementById('btn-mfa'), 'click', submitMfa);
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
    initAttachment();
    initFakeLogin();
    initPassword();
    initLogs();
    initSql();
    initSocial();
    initMfa();
  }

  async function startGame() {
    const name = document.getElementById('studentName').value.trim();
    if (!name) {
      alert('Enter your agent codename to initialize breach.');
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
    attachmentFlags = new Set();
    selectedFakeLogin = null;
    stopBossTimer();
    stopCh1BossTimer();

    gameHeader.classList.remove('header--intro');
    progressBar.classList.remove('header__progress--idle');
    initRooms();

    GameState.startTimer((_, formatted) => {
      document.getElementById('hudTime').textContent = formatted;
    });

    showChapterIntro(1);
  }

  function showChapterIntro(chapterId) {
    pendingChapterId = chapterId;
    const ch = Campaign.getChapter(chapterId);
    if (!ch) return;

    document.getElementById('chapterLabel').textContent = `Chapter ${chapterId}`;
    document.getElementById('chapterTitle').textContent = ch.title;
    document.getElementById('chapterTagline').textContent = `"${ch.tagline}"`;

    const completed = new Set(GameState.getState().completedRooms);
    const entries = Object.entries(Campaign.ROOM_CATALOG)
      .filter(([, r]) => r.chapter === chapterId && (r.num > 0 || r.isBoss))
      .sort((a, b) => {
        if (a[1].isBoss) return 1;
        if (b[1].isBoss) return -1;
        return a[1].num - b[1].num;
      });

    document.getElementById('chapterRoomList').innerHTML = entries.map(([id, r]) => {
      const done = completed.has(id);
      const locked = r.locked || (!r.playable && !done);
      const cls = done ? 'chapter-room chapter-room--done' : locked ? 'chapter-room chapter-room--locked' : 'chapter-room';
      const label = r.isBoss ? `BOSS: ${r.title || ch.boss?.title}` : `${r.num}. ${r.title}`;
      const suffix = done ? ' ✓' : locked ? ' 🔒' : '';
      return `<div class="${cls}">${escapeHtml(label)}${suffix}</div>`;
    }).join('');

    showScreen('chapter');
  }

  function enterChapter() {
    AudioFX.click();
    const roomId = Campaign.getChapterFirstRoom(pendingChapterId);
    if (roomId) {
      refreshRoomChrome(roomId);
      showScreen(roomId);
    }
  }

  function refreshRoomChrome(roomId) {
    const meta = Campaign.getRoom(roomId);
    const screen = document.querySelector(`[data-screen="${roomId}"]`);
    if (!screen || !meta.chapter) return;

    const tag = screen.querySelector('.room-theme__tag');
    if (tag && meta.tag) tag.textContent = meta.tag;

    screen.querySelectorAll('[data-chapter-banner], .act-banner:not(.act-banner--boss)').forEach((el) => {
      if (!el.classList.contains('act-banner--boss') && meta.actTitle) {
        el.textContent = meta.actTitle;
      }
    });

    const badge = screen.querySelector('.room-badge:not(.room-badge--boss)');
    if (badge && meta.label) badge.textContent = meta.label;

    const h2 = screen.querySelector('.level-header h2');
    if (h2 && meta.title && !meta.isBoss) h2.textContent = meta.title;

    const desc = screen.querySelector('.level-desc');
    if (desc && (meta.story || meta.goal)) {
      const theme = meta.theme || '';
      desc.innerHTML = theme
        ? `<span class="level-theme">${escapeHtml(theme)}</span> — ${escapeHtml(meta.story || meta.goal)}`
        : escapeHtml(meta.story || meta.goal);
    }
  }

  function showScreen(screenId, opts = {}) {
    if (currentScreen === 'ransomware' && screenId !== 'ransomware') {
      stopBossTimer();
    }
    if (currentScreen === 'ch1_boss' && screenId !== 'ch1_boss') {
      stopCh1BossTimer();
    }
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
    if (GameState.ROOMS.includes(screenId)) {
      refreshRoomChrome(screenId);
      GameState.enterRoom(screenId);
      if (screenId === 'ransomware') initBossRoom();
      if (screenId === 'ch1_boss') initCh1BossRoom();
    }
    updateProgress();
    updateHud();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getProgressIndex() {
    if (currentScreen === 'gameover' || currentScreen === 'intro') return -1;
    if (currentScreen === 'chapter') {
      const nextRoom = Campaign.getChapterFirstRoom(pendingChapterId);
      return nextRoom ? GameState.ROOMS.indexOf(nextRoom) : 0;
    }
    const roomIdx = GameState.ROOMS.indexOf(currentScreen);
    if (roomIdx >= 0) return roomIdx;
    if (currentScreen === 'quiz') return GameState.ROOMS.length;
    if (currentScreen === 'certificate') return GameState.ROOMS.length + 1;
    return 0;
  }

  function updateProgress() {
    const idx = getProgressIndex();

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
    document.getElementById('hudLives').textContent = '♥'.repeat(s.lives) + '♡'.repeat(GameState.MAX_LIVES - s.lives);
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
    AudioFX.roomComplete(roomId);
    GameState.completeRoom(roomId);
    Achievements.checkAfterRoom(roomId);
    const summary = await TutorClient.summary(roomId, GameState.getState().roomStats);
    showTutor(roomId, summary);
    showFeedback('feedback-' + roomId, summary + ' Mission complete!', 'success');

    await advanceCampaign(roomId);
  }

  async function advanceCampaign(fromRoomId) {
    const next = Campaign.getNextStep(fromRoomId);
    setTimeout(async () => {
      if (next?.type === 'chapter') {
        showChapterIntro(next.chapterId);
      } else if (next?.type === 'quiz') {
        await startQuiz();
      } else if (typeof next === 'string') {
        refreshRoomChrome(next);
        showScreen(next);
      }
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
      if (!foundFlags.has(flag)) {
        foundFlags.add(flag);
        document.querySelectorAll(`[data-screen="phishing"] [data-flag="${flag}"]`).forEach((el) => {
          el.classList.add('phishing-target--found');
        });
        AudioFX.flagFound();
        document.getElementById('flagCount').textContent = String(foundFlags.size);
        if (foundFlags.size >= REQUIRED_PHISHING_FLAGS) {
          document.getElementById('btn-phishing').disabled = false;
          AudioFX.doorUnlock();
          showFeedback('feedback-phishing', 'All 3 red flags found!', 'success');
        }
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

  // --- Attachment Sandbox ---
  function initAttachment() {
    attachmentFlags = new Set();
    document.getElementById('attachmentFlagCount').textContent = '0';
    document.getElementById('btn-attachment').disabled = true;
    hideFeedback('feedback-attachment');
    document.getElementById('tutor-attachment').hidden = true;

    document.querySelectorAll('[data-screen="attachment"] .phishing-target').forEach((el) => {
      el.classList.remove('phishing-target--found');
      el.onclick = onAttachmentClick;
      el.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAttachmentClick.call(el, e);
        }
      };
    });
  }

  function onAttachmentClick(e) {
    e.preventDefault();
    const flag = this.dataset.flag;
    if (!flag || this.classList.contains('phishing-target--found')) return;

    AudioFX.click();

    if (ATTACHMENT_FLAG_KEYS.has(flag)) {
      if (!attachmentFlags.has(flag)) {
        attachmentFlags.add(flag);
        this.classList.add('phishing-target--found');
        AudioFX.flagFound();
        document.getElementById('attachmentFlagCount').textContent = String(attachmentFlags.size);
        if (attachmentFlags.size >= REQUIRED_ATTACHMENT_FLAGS) {
          document.getElementById('btn-attachment').disabled = false;
          AudioFX.doorUnlock();
          showFeedback('feedback-attachment', 'Both PDF threats identified!', 'success');
        }
      }
    } else if (flag === 'title') {
      showTutor('attachment', 'Urgency is suspicious, but focus on the macro warning and the fake download link.');
    } else {
      handleMistake('attachment', 'wrong_click');
    }
  }

  async function submitAttachment() {
    AudioFX.submit();
    if (attachmentFlags.size >= REQUIRED_ATTACHMENT_FLAGS) {
      await completeRoom('attachment');
    }
  }

  // --- Fake Login Portal ---
  function initFakeLogin() {
    selectedFakeLogin = null;
    document.getElementById('btn-fake_login').disabled = true;
    hideFeedback('feedback-fake_login');
    document.getElementById('tutor-fake_login').hidden = true;

    initOptionRoom('fakeLoginOptions', FAKE_LOGIN_OPTIONS, (id, btn, container) => {
      selectedFakeLogin = id;
      container.querySelectorAll('.option-btn').forEach((el) => el.classList.remove('option-btn--selected'));
      btn.classList.add('option-btn--selected');
      document.getElementById('btn-fake_login').disabled = false;
      hideFeedback('feedback-fake_login');
    });
  }

  async function submitFakeLogin() {
    AudioFX.submit();
    const chosen = FAKE_LOGIN_OPTIONS.find((o) => o.id === selectedFakeLogin);
    if (!chosen) return;
    if (chosen.correct) {
      await completeRoom('fake_login');
    } else {
      await handleMistake('fake_login', chosen.ctx);
    }
  }

  // --- Chapter 1 Boss ---
  function stopCh1BossTimer() {
    if (ch1BossTimerId) {
      clearInterval(ch1BossTimerId);
      ch1BossTimerId = null;
    }
  }

  function updateCh1BossTimerUI() {
    const el = document.getElementById('ch1BossTimer');
    if (el) el.textContent = GameState.formatTime(ch1BossSecondsLeft);
  }

  function updateCh1BossTaskUI() {
    const countEl = document.getElementById('ch1BossTaskCount');
    if (countEl) countEl.textContent = String(ch1BossTasks.size);

    if (ch1BossTasks.has('quarantine')) {
      document.querySelector('[data-boss="quarantine"]')?.classList.add('boss-panel--done');
      const s = document.getElementById('ch1StatusQuarantine');
      if (s) s.textContent = '✓ Quarantined';
    }
    if (ch1BossTasks.has('block')) {
      document.querySelector('[data-boss="block"]')?.classList.add('boss-panel--done');
      const s = document.getElementById('ch1StatusBlock');
      if (s) s.textContent = '✓ Blocked';
    }
  }

  async function completeCh1BossTask(task) {
    if (ch1BossTasks.has(task)) return;
    ch1BossTasks.add(task);
    AudioFX.flagFound();
    updateCh1BossTaskUI();
    if (ch1BossTasks.size >= 2) {
      stopCh1BossTimer();
      AudioFX.submit();
      await completeRoom('ch1_boss');
    }
  }

  function initCh1BossRoom() {
    stopCh1BossTimer();
    ch1BossSecondsLeft = CH1_BOSS_TIME_SEC;
    ch1BossTasks = new Set();
    hideFeedback('feedback-ch1_boss');
    document.getElementById('tutor-ch1_boss').hidden = true;

    document.querySelectorAll('[data-screen="ch1_boss"] .boss-panel').forEach((p) => {
      p.classList.remove('boss-panel--done');
    });
    const qStatus = document.getElementById('ch1StatusQuarantine');
    const bStatus = document.getElementById('ch1StatusBlock');
    if (qStatus) qStatus.textContent = 'Pending';
    if (bStatus) bStatus.textContent = 'Pending';

    document.querySelectorAll('.ch1-quarantine').forEach((el) => {
      el.classList.remove('phishing-target--found');
      el.onclick = (e) => {
        e.preventDefault();
        if (ch1BossTasks.has('quarantine')) return;
        AudioFX.click();
        el.classList.add('phishing-target--found');
        completeCh1BossTask('quarantine');
      };
    });

    initBossOptions('ch1BossUrlOptions', CH1_BOSS_URL_OPTIONS, async (id) => {
      if (ch1BossTasks.has('block')) return;
      if (id === 'fake') {
        await completeCh1BossTask('block');
      } else {
        await handleMistake('ch1_boss', 'wrong_url');
      }
    });

    updateCh1BossTimerUI();
    updateCh1BossTaskUI();

    ch1BossTimerId = setInterval(async () => {
      ch1BossSecondsLeft -= 1;
      updateCh1BossTimerUI();
      if (ch1BossSecondsLeft <= 0) {
        stopCh1BossTimer();
        showFeedback('feedback-ch1_boss', 'Initial compromise succeeded — containment window expired!', 'error');
        await handleMistake('ch1_boss', 'boss_timeout');
      }
    }, 1000);
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

  // --- Final Boss (Room 8) ---
  function stopBossTimer() {
    if (bossTimerId) {
      clearInterval(bossTimerId);
      bossTimerId = null;
    }
  }

  function updateBossTimerUI() {
    const el = document.getElementById('bossTimer');
    if (el) el.textContent = GameState.formatTime(bossSecondsLeft);
  }

  function updateBossTaskUI() {
    const countEl = document.getElementById('bossTaskCount');
    if (countEl) countEl.textContent = String(bossTasksComplete.size);
    const statusMap = {
      phishing: 'Phishing',
      cipher: 'Cipher',
      sql: 'Sql',
      logs: 'Logs',
      mfa: 'Mfa',
    };
    BOSS_TASK_KEYS.forEach((key) => {
      const panel = document.querySelector(`[data-boss="${key}"]`);
      const status = document.getElementById('bossStatus' + statusMap[key]);
      if (bossTasksComplete.has(key)) {
        panel?.classList.add('boss-panel--done');
        if (status) status.textContent = '✓ Secured';
      }
    });
    if (bossTasksComplete.size >= BOSS_TASK_KEYS.length) {
      document.getElementById('bossContain').hidden = false;
      initBossContain();
    }
  }

  function completeBossTask(task) {
    if (bossTasksComplete.has(task)) return;
    bossTasksComplete.add(task);
    AudioFX.flagFound();
    updateBossTaskUI();
  }

  function initBossOptions(containerId, options, onPick) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = options.map((o) =>
      `<button type="button" class="option-btn boss-option-btn" data-id="${escapeHtml(o.id)}">${escapeHtml(o.text)}</button>`
    ).join('');
    container.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (bossTasksComplete.has(container.closest('[data-boss]')?.dataset.boss)) return;
        AudioFX.click();
        container.querySelectorAll('.option-btn').forEach((b) => b.classList.remove('option-btn--selected'));
        btn.classList.add('option-btn--selected');
        onPick(btn.dataset.id);
      });
    });
  }

  function initBossContain() {
    const container = document.getElementById('bossContainOptions');
    if (!container || container.dataset.bound) return;
    container.dataset.bound = '1';
    initBossOptions('bossContainOptions', RANSOMWARE_OPTIONS, async (id) => {
      const chosen = RANSOMWARE_OPTIONS.find((o) => o.id === id);
      if (chosen?.correct) {
        AudioFX.submit();
        stopBossTimer();
        await completeRoom('ransomware');
      } else {
        await handleMistake('ransomware', chosen?.ctx || 'default');
      }
    });
  }

  function initBossRoom() {
    stopBossTimer();
    bossSecondsLeft = BOSS_TIME_SEC;
    bossTasksComplete = new Set();
    hideFeedback('feedback-ransomware');
    document.getElementById('tutor-ransomware').hidden = true;
    document.getElementById('bossContain').hidden = true;
    const containOpts = document.getElementById('bossContainOptions');
    if (containOpts) {
      containOpts.innerHTML = '';
      delete containOpts.dataset.bound;
    }

    document.querySelectorAll('.boss-panel').forEach((p) => p.classList.remove('boss-panel--done'));
    ['Phishing', 'Cipher', 'Sql', 'Logs', 'Mfa'].forEach((n) => {
      const s = document.getElementById('bossStatus' + n);
      if (s) s.textContent = 'Pending';
    });

    const cipherInput = document.getElementById('bossCipherInput');
    if (cipherInput) cipherInput.value = '';

    document.querySelectorAll('.boss-phish-target').forEach((el) => {
      el.classList.remove('phishing-target--found');
      el.onclick = (e) => {
        e.preventDefault();
        if (bossTasksComplete.has('phishing')) return;
        AudioFX.click();
        el.classList.add('phishing-target--found');
        completeBossTask('phishing');
      };
    });

    const cipherBtn = document.getElementById('bossCipherBtn');
    if (cipherBtn) {
      cipherBtn.onclick = async () => {
        if (bossTasksComplete.has('cipher')) return;
        const val = document.getElementById('bossCipherInput').value.trim().toUpperCase();
        if (val === CIPHER_ANSWER) {
          AudioFX.submit();
          completeBossTask('cipher');
        } else {
          await handleMistake('ransomware', 'wrong_cipher');
        }
      };
    }

    initBossOptions('bossSqlOptions', [
      { id: 'b', text: 'Use parameterized query', correct: true },
      { id: 'a', text: 'Add input length validation only', correct: false },
    ], async (id) => {
      if (bossTasksComplete.has('sql')) return;
      if (id === 'b') {
        AudioFX.submit();
        completeBossTask('sql');
      } else {
        await handleMistake('ransomware', 'default');
      }
    });

    initBossOptions('bossIpOptions', IP_OPTIONS.map((ip) => ({
      id: ip,
      text: ip,
      correct: ip === ATTACK_IP,
    })), async (id) => {
      if (bossTasksComplete.has('logs')) return;
      if (id === ATTACK_IP) {
        AudioFX.submit();
        completeBossTask('logs');
      } else {
        await handleMistake('ransomware', 'wrong_ip');
      }
    });

    initBossOptions('bossMfaOptions', [
      { id: 'b', text: 'Ignore — never share MFA codes', correct: true },
      { id: 'a', text: 'Read the code aloud to the agent', correct: false },
    ], async (id) => {
      if (bossTasksComplete.has('mfa')) return;
      if (id === 'b') {
        AudioFX.submit();
        completeBossTask('mfa');
      } else {
        await handleMistake('ransomware', 'share_code');
      }
    });

    updateBossTimerUI();
    updateBossTaskUI();

    bossTimerId = setInterval(async () => {
      bossSecondsLeft -= 1;
      updateBossTimerUI();
      if (bossSecondsLeft <= 0) {
        stopBossTimer();
        showFeedback('feedback-ransomware', 'Ransomware deployed — containment window expired!', 'error');
        await handleMistake('ransomware', 'boss_timeout');
      }
    }, 1000);
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

    const mapEl = document.getElementById('certCampaignMap');
    if (mapEl) {
      const showSecret = Campaign.canUnlockSecret(s);
      mapEl.innerHTML = Campaign.renderCampaignMap(s.completedRooms, { showSecret });
      const secretEl = document.getElementById('certSecretTeaser');
      if (secretEl) secretEl.hidden = showSecret;
    }
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
