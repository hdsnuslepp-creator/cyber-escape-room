/**
 * Cyber Escape Room Platform — Main Game Controller
 */
(function () {
  'use strict';

  const REQUIRED_PHISHING_FLAGS = 3;
  const PHISHING_FLAG_KEYS = new Set(['sender', 'link', 'urgency']);
  const PHISHING_DECOY_FLAGS = new Set(['greeting', 'body', 'signoff', 'attachment']);

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
  const CH2_BOSS_TIME_SEC = 90;
  const CH2_BOSS_PASSWORD_OPTIONS = [
    { id: 'weak', text: 'Admin2024!', correct: false },
    { id: 'strong', text: 'k9#mP2$vL8@xQ4!nR', correct: true },
    { id: 'medium', text: 'Summer2024!', correct: false },
  ];
  const CH2_BOSS_MFA_OPTIONS = [
    { id: 'share', text: 'Read the code aloud to the agent', correct: false },
    { id: 'ignore', text: 'Never share MFA codes — hang up', correct: true },
    { id: 'text', text: 'Text the code to verify faster', correct: false },
  ];
  const DB_FORENSICS_OPTIONS = [
    { id: 'a', text: 'EXP-4412 — jsmith (12 records)', correct: false, ctx: 'default' },
    { id: 'b', text: 'EXP-4419 — svc-backup (52,840 records to external IP)', correct: true, ctx: 'correct' },
    { id: 'c', text: 'EXP-4420 — mwilson (3 records)', correct: false, ctx: 'default' },
    { id: 'd', text: 'EXP-4421 — etl-nightly (8,200 records)', correct: false, ctx: 'default' },
  ];
  const SIEM_OPTIONS = [
    { id: 'a', text: 'Single failed login attempt', correct: false, ctx: 'default' },
    { id: 'b', text: 'Brute force → impossible travel → large outbound transfer', correct: true, ctx: 'correct' },
    { id: 'c', text: 'Printer offline on Floor 3', correct: false, ctx: 'default' },
    { id: 'd', text: 'Password expiry reminder email', correct: false, ctx: 'default' },
  ];
  const INSIDER_OPTIONS = [
    { id: 'a', text: 'Alice Chen — normal activity', correct: false, ctx: 'default' },
    { id: 'b', text: 'Bob Martinez — 2.4 GB at 3 AM with USB', correct: true, ctx: 'correct' },
    { id: 'c', text: 'Carol Reed — on vacation', correct: false, ctx: 'default' },
    { id: 'd', text: 'Dave Park — lunch break browsing', correct: false, ctx: 'default' },
  ];
  const BACKUP_OPTIONS = [
    { id: 'a', text: 'backup_2024-05-28', correct: false, ctx: 'old' },
    { id: 'b', text: 'backup_2024-06-01', correct: true, ctx: 'correct' },
    { id: 'c', text: 'backup_2024-06-04', correct: false, ctx: 'infected' },
    { id: 'd', text: 'backup_2024-06-05', correct: false, ctx: 'infected' },
  ];
  const STEGO_PAYLOAD = 'EXFIL: DEPLOY RANSOMWARE 0600';

  let currentScreen = 'intro';
  let hintLevels = {};
  let pendingChapterId = 1;
  let foundFlags = new Set();
  let attachmentFlags = new Set();
  let selectedFakeLogin = null;
  let ch1BossTimerId = null;
  let ch1BossSecondsLeft = CH1_BOSS_TIME_SEC;
  let ch1BossTasks = new Set();
  let ch2BossTimerId = null;
  let ch2BossSecondsLeft = CH2_BOSS_TIME_SEC;
  let ch2BossTasks = new Set();
  let stegoFound = false;
  let selectedDbForensics = null;
  let selectedSiem = null;
  let selectedInsider = null;
  let selectedBackup = null;
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
  let quizCurrentIndex = 0;
  let quizLocked = false;
  let quizStreak = 0;
  let quizTimerId = null;
  let quizSecondsLeft = 0;
  const QUIZ_SECONDS_PER_ROUND = 18;
  let campaignAdvanceTimer = null;
  let completingRoom = false;
  let pendingBriefRoomId = null;

  const gameHeader = document.getElementById('gameHeader');
  const progressBar = document.getElementById('progressBar');

  function init() {
    AudioFX.initUI();
    RoomEngine.bindSubmit();
    bind(document.getElementById('btn-engine-hint'), 'click', () => {
      if (RoomEngine.isEngineRoom(currentScreen)) useHint(currentScreen);
    });
    HijackSystem.bindVerifySubmit((ctx) => {
      if (GameState.ROOMS.includes(currentScreen)) handleMistake(currentScreen, ctx);
    });
    ReadAloud.bindFab(repeatReadAloud);
    bind(document.getElementById('btn-engine-read'), 'click', () => {
      AudioFX.click();
      if (RoomEngine.isEngineRoom(currentScreen)) ReadAloud.announceRoom(currentScreen);
    });
    const dysEl = document.getElementById('dyslexiaMode');
    if (dysEl) {
      dysEl.addEventListener('change', () => {
        ProfileSave.saveSettings({ dyslexiaMode: dysEl.checked });
        ReadAloud.warmUpSpeech();
        syncReadAloudUi();
        if (!dysEl.checked) ReadAloud.stop();
      });
    }
    buildProgressBar();
    bindGlobalEvents();
    initRooms();
    updateHud();
    runBootSequence();
    initIntroFromSave();
    ReadAloud.removeLegacyVoicePicker?.();
  }

  function initIntroFromSave() {
    const settings = ProfileSave.getSettings();
    const diffEl = document.getElementById('difficultySelect');
    const fxEl = document.getElementById('disableHijackFx');
    const dysEl = document.getElementById('dyslexiaMode');
    if (diffEl) diffEl.value = GameState.normalizeDifficulty(settings.difficulty || 'normal');
    if (fxEl) fxEl.checked = !!settings.disableHijackEffects;
    if (dysEl) dysEl.checked = !!settings.dyslexiaMode;
    syncReadAloudUi();

    const saved = ProfileSave.loadCampaign();
    const resumeBtn = document.getElementById('btnResume');
    if (resumeBtn && saved?.studentName && (saved.completedRooms || []).length > 0) {
      resumeBtn.hidden = false;
      resumeBtn.textContent = `[ RESUME: ${saved.studentName.toUpperCase()} — CH.${saved.pendingChapterId || Campaign.getCurrentChapter(saved.completedRooms)} ]`;
    }
  }

  function syncReadAloudUi() {
    const on = ReadAloud.isEnabled();
    const inGame = currentScreen !== 'intro';
    ReadAloud.updateFab(on && inGame);
    ReadAloud.syncMobileReadButtons(on && inGame);
    const briefRead = document.getElementById('btnBriefRead');
    const briefOpen = document.getElementById('missionBriefModal') && !document.getElementById('missionBriefModal').hidden;
    if (briefRead) briefRead.hidden = !on || !briefOpen;
  }

  function repeatReadAloud() {
    if (!ReadAloud.isEnabled()) return;

    const hijackModal = document.getElementById('hijackVerifyModal');
    if (hijackModal && !hijackModal.hidden) {
      const q = document.getElementById('hijackVerifyQuestion')?.textContent || '';
      const opts = [...document.querySelectorAll('.hijack-verify-option')].map((b) => b.textContent.trim());
      ReadAloud.announceVerify(q, opts);
      return;
    }

    const briefModal = document.getElementById('missionBriefModal');
    if (briefModal && !briefModal.hidden && pendingBriefRoomId) {
      const meta = Campaign.getRoom(pendingBriefRoomId);
      const ch = Campaign.getChapter(meta.chapter);
      ReadAloud.announceBrief(
        meta.title,
        meta.story || meta.goal || '',
        ch?.briefing ? `Objective: ${ch.briefing}` : 'Complete the mission without losing all lives.'
      );
      return;
    }
    if (currentScreen === 'quiz') {
      if (quizData[quizCurrentIndex]) {
        ReadAloud.announceQuiz([quizData[quizCurrentIndex]]);
      }
      return;
    }
    if (GameState.ROOMS.includes(currentScreen)) {
      ReadAloud.announceRoom(currentScreen);
      return;
    }
    if (currentScreen === 'chapter') {
      ReadAloud.announceChapter(Campaign.getChapter(pendingChapterId));
    }
  }

  function persistSave() {
    const s = GameState.getState();
    if (!s.studentName) return;
    const data = GameState.serialize();
    data.pendingChapterId = pendingChapterId;
    ProfileSave.saveCampaign(data);
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
      { html: '<span class="prompt">&gt;</span> CAMPAIGN MODE: 14 CHAPTERS / 56 MISSIONS', cls: 'boot-line--ok' },
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
    progressBar.innerHTML = Campaign.CHAPTERS.map((ch) =>
      `<div class="progress-step progress-step--chapter" data-chapter="${ch.id}" title="Chapter ${ch.id}: ${ch.title}"><span>${ch.id}</span></div>`
    ).join('') + '<div class="progress-step progress-step--chapter" data-room="quiz" title="Lightning Debrief"><span>Q</span></div>';
  }

  function bind(el, event, handler) {
    if (el) el.addEventListener(event, handler);
  }

  function bindGlobalEvents() {
    bind(document.getElementById('btnStart'), 'click', startGame);
    bind(document.getElementById('btnResume'), 'click', resumeGame);
    bind(document.getElementById('btnChapterContinue'), 'click', enterChapter);
    bind(document.getElementById('btnBriefStart'), 'click', confirmMissionBrief);
    bind(document.getElementById('btnRestart'), 'click', () => { ProfileSave.clearCampaign(); location.reload(); });
    bind(document.getElementById('btnRetry'), 'click', () => { ProfileSave.clearCampaign(); location.reload(); });
    bind(document.getElementById('btnRetryChapter'), 'click', retryFailedChapter);
    bind(document.getElementById('btnPrint'), 'click', () => window.print());
    bind(document.getElementById('btnExportResults'), 'click', exportResultsCsv);

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
    bind(document.getElementById('btn-steganography'), 'click', submitSteganography);
    bind(document.getElementById('btn-db_forensics'), 'click', submitDbForensics);
    bind(document.getElementById('btn-siem'), 'click', submitSiem);
    bind(document.getElementById('btn-insider'), 'click', submitInsider);
    bind(document.getElementById('btn-backup'), 'click', submitBackup);

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
    initSteganography();
    initDbForensics();
    initSiem();
    initInsider();
    initBackup();
  }

  async function startGame() {
    const name = document.getElementById('studentName').value.trim();
    if (!name) {
      alert('Enter your agent codename to initialize breach.');
      return;
    }

    const difficulty = document.getElementById('difficultySelect')?.value || 'normal';
    ProfileSave.saveSettings({
      difficulty: GameState.normalizeDifficulty(difficulty),
      disableHijackEffects: !!document.getElementById('disableHijackFx')?.checked,
      dyslexiaMode: !!document.getElementById('dyslexiaMode')?.checked,
    });
    syncReadAloudUi();

    AudioFX.resume();
    AudioFX.boot();
    AudioFX.startMusic();
    ReadAloud.warmUpSpeech();
    GameState.reset(name, { difficulty });
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
    stopCh2BossTimer();
    HijackSystem.clear();
    completingRoom = false;
    if (campaignAdvanceTimer) {
      clearTimeout(campaignAdvanceTimer);
      campaignAdvanceTimer = null;
    }
    stegoFound = false;
    selectedDbForensics = null;
    selectedSiem = null;
    selectedInsider = null;
    selectedBackup = null;

    gameHeader.classList.remove('header--intro');
    progressBar.classList.remove('header__progress--idle');
    initRooms();

    GameState.startTimer((_, formatted) => {
      document.getElementById('hudTime').textContent = formatted;
    });

    const startChapter = getStartChapterFromUrl();
    if (startChapter > 1) {
      skipProgressToChapter(startChapter);
      showChapterIntro(startChapter);
    } else {
      showChapterIntro(1);
    }
    persistSave();
  }

  function resumeGame() {
    const saved = ProfileSave.loadCampaign();
    if (!saved?.studentName) return;

    ProfileSave.saveSettings({
      difficulty: GameState.normalizeDifficulty(saved.difficulty || 'normal'),
      disableHijackEffects: !!document.getElementById('disableHijackFx')?.checked,
      dyslexiaMode: !!document.getElementById('dyslexiaMode')?.checked,
    });
    syncReadAloudUi();

    AudioFX.resume();
    AudioFX.boot();
    AudioFX.startMusic();
    ReadAloud.warmUpSpeech();
    GameState.restore(saved);
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
    stopCh2BossTimer();
    HijackSystem.clear();
    completingRoom = false;
    if (campaignAdvanceTimer) {
      clearTimeout(campaignAdvanceTimer);
      campaignAdvanceTimer = null;
    }
    stegoFound = false;
    selectedDbForensics = null;
    selectedSiem = null;
    selectedInsider = null;
    selectedBackup = null;

    gameHeader.classList.remove('header--intro');
    progressBar.classList.remove('header__progress--idle');
    initRooms();

    pendingChapterId = saved.pendingChapterId || Campaign.getCurrentChapter(saved.completedRooms);
    const elapsed = saved.elapsedSeconds ?? 0;
    GameState.startTimer((_, formatted) => {
      document.getElementById('hudTime').textContent = formatted;
    }, elapsed);
    updateHud();
    showChapterIntro(pendingChapterId);
  }

  function getStartChapterFromUrl() {
    const raw = new URLSearchParams(location.search).get('chapter');
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1 || n > Campaign.CHAPTERS.length) return 1;
    return n;
  }

  function skipProgressToChapter(chapterId) {
    const firstRoom = Campaign.getChapterFirstRoom(chapterId);
    if (!firstRoom) return;
    const idx = GameState.ROOMS.indexOf(firstRoom);
    if (idx <= 0) return;
    GameState.ROOMS.slice(0, idx).forEach((roomId) => {
      if (!GameState.getState().completedRooms.includes(roomId)) {
        GameState.completeRoom(roomId);
      }
    });
    updateProgress();
  }

  function showChapterIntro(chapterId) {
    pendingChapterId = chapterId;
    const ch = Campaign.getChapter(chapterId);
    if (!ch) return;

    document.getElementById('chapterLabel').textContent = `Chapter ${chapterId}`;
    document.getElementById('chapterTitle').textContent = ch.title;
    document.getElementById('chapterTagline').textContent = `"${ch.tagline}"`;

    const introEl = document.getElementById('chapterIntro');
    const briefEl = document.getElementById('chapterBriefing');
    const objEl = document.getElementById('chapterObjectives');
    if (introEl) introEl.textContent = ch.intro || '';
    if (briefEl) briefEl.textContent = ch.briefing ? `Focus: ${ch.briefing}` : '';
    if (objEl) {
      objEl.innerHTML = (ch.objectives || []).map((o) => `<li>${escapeHtml(o)}</li>`).join('');
    }

    const gameLink = document.getElementById('chapterGameLink');
    if (gameLink && chapterId === 1) {
      gameLink.href = 'game.html?chapter=1';
      gameLink.hidden = false;
    } else if (gameLink) {
      gameLink.hidden = chapterId > 1;
    }

    GameState.setPendingChapter(chapterId);
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

    const hijackWarn = document.getElementById('chapterHijackWarn');
    if (hijackWarn) hijackWarn.hidden = chapterId < HijackSystem.MIN_CHAPTER;

    persistSave();
    showScreen('chapter');
  }

  function getNextIncompleteRoomInChapter(chapterId) {
    const completed = new Set(GameState.getState().completedRooms);
    const ids = Campaign.CHAPTER_ROOMS[chapterId] || [];
    return ids.find((id) => !completed.has(id)) || null;
  }

  function enterChapter() {
    AudioFX.click();
    const roomId = getNextIncompleteRoomInChapter(pendingChapterId);
    if (!roomId) {
      const nextChapter = pendingChapterId + 1;
      if (nextChapter <= Campaign.CHAPTERS.length) {
        showChapterIntro(nextChapter);
      }
      return;
    }
    showMissionBrief(roomId);
  }

  function showMissionBrief(roomId) {
    pendingBriefRoomId = roomId;
    const meta = Campaign.getRoom(roomId);
    const ch = Campaign.getChapter(meta.chapter);
    document.getElementById('briefTitle').textContent = meta.title;
    document.getElementById('briefStory').textContent = meta.story || meta.goal || '';
    document.getElementById('briefObjective').textContent = ch?.briefing
      ? `Objective: ${ch.briefing}`
      : 'Complete the mission without losing all lives.';
    document.getElementById('missionBriefModal').hidden = false;
    syncReadAloudUi();
    ReadAloud.stop();
  }

  function confirmMissionBrief() {
    AudioFX.click();
    document.getElementById('missionBriefModal').hidden = true;
    const roomId = pendingBriefRoomId;
    pendingBriefRoomId = null;
    if (!roomId) return;
    if (GameState.getState().completedRooms.includes(roomId)) return;
    refreshRoomChrome(roomId);
    showScreen(roomId);
  }

  function retryFailedChapter() {
    const s = GameState.getState();
    const chapterId = s.lastFailedChapter || Campaign.getRoom(s.lastFailedRoom || '').chapter || pendingChapterId;
    if (!chapterId) return;
    AudioFX.click();
    GameState.retryChapter(chapterId);
    pendingChapterId = chapterId;
    document.body.classList.remove('fail-screen-active');
    const elapsed = s.elapsedSeconds ?? 0;
    GameState.startTimer((_, formatted) => {
      document.getElementById('hudTime').textContent = formatted;
    }, elapsed);
    persistSave();
    showChapterIntro(chapterId);
  }

  function exportResultsCsv() {
    const payload = { ...GameState.getResultsPayload(), difficulty: GameState.getState().difficulty };
    const csv = ProfileSave.exportCampaignCsv(payload);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cyber-escape-${(payload.studentName || 'agent').replace(/\W+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
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

  function feedbackElId(roomId) {
    return RoomEngine.isEngineRoom(roomId) ? 'feedback-engine' : 'feedback-' + roomId;
  }

  function tutorElId(roomId) {
    return RoomEngine.isEngineRoom(roomId) ? 'tutor-engine' : 'tutor-' + roomId;
  }

  function blockIfHijacked(roomId) {
    if (HijackSystem.canSubmit()) return false;
    showFeedback(feedbackElId(roomId), HijackSystem.blockMessage(), 'error');
    AudioFX.hint();
    return true;
  }

  function mountEngineRoom(roomId) {
    RoomEngine.mount(roomId, {
      onComplete: () => completeRoom(roomId),
      onMistake: (ctx) => handleMistake(roomId, ctx),
    });
  }

  function showScreen(screenId, opts = {}) {
    ReadAloud.stop();
    if (currentScreen === 'quiz' && screenId !== 'quiz') {
      stopQuizTimer();
    }
    if (currentScreen === 'ransomware' && screenId !== 'ransomware') {
      stopBossTimer();
    }
    if (currentScreen === 'ch1_boss' && screenId !== 'ch1_boss') {
      stopCh1BossTimer();
    }
    if (currentScreen === 'ch2_boss' && screenId !== 'ch2_boss') {
      stopCh2BossTimer();
    }
    if (!GameState.ROOMS.includes(screenId)) {
      HijackSystem.clear();
    }
    const wasInGame = currentScreen !== 'intro' && currentScreen !== 'gameover';
    const engineActive = RoomEngine.isEngineRoom(screenId);
    currentScreen = screenId;
    document.querySelectorAll('.screen').forEach((el) => {
      const isEngineShell = el.dataset.screen === '_engine';
      let active = el.dataset.screen === screenId;
      if (engineActive) active = isEngineShell;
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
      GameState.enterRoom(screenId);
      if (engineActive) {
        mountEngineRoom(screenId);
      } else {
        refreshRoomChrome(screenId);
        if (screenId === 'ransomware') initBossRoom();
        else if (screenId === 'ch1_boss') initCh1BossRoom();
        else if (screenId === 'ch2_boss') initCh2BossRoom();
        else reinitRoomOnEnter(screenId);
      }
      setTimeout(() => {
        if (currentScreen === screenId && GameState.ROOMS.includes(screenId)) {
          HijackSystem.onRoomEnter(screenId);
        }
      }, 480);
    }
    updateProgress();
    updateHud();
    syncReadAloudUi();
    document.body.classList.toggle('fail-screen-active', screenId === 'gameover');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getProgressIndex() {
    return Campaign.getChapterProgressIndex(GameState.getState().completedRooms);
  }

  function getActiveChapterStep() {
    if (currentScreen === 'gameover' || currentScreen === 'intro') return -1;
    if (currentScreen === 'quiz') return Campaign.CHAPTERS.length;
    if (currentScreen === 'certificate') return Campaign.CHAPTERS.length + 1;
    if (currentScreen === 'chapter') return pendingChapterId;
    if (GameState.ROOMS.includes(currentScreen)) {
      return Campaign.getRoom(currentScreen).chapter || pendingChapterId;
    }
    return pendingChapterId;
  }

  function updateProgress() {
    const chaptersComplete = getProgressIndex();
    const activeChapter = getActiveChapterStep();

    progressBar.querySelectorAll('.progress-step').forEach((step, i) => {
      step.classList.remove('progress-step--complete', 'progress-step--current');
      const chNum = step.dataset.chapter ? parseInt(step.dataset.chapter, 10) : null;
      if (step.dataset.room === 'quiz') {
        if (currentScreen === 'quiz') step.classList.add('progress-step--current');
        else if (chaptersComplete >= Campaign.CHAPTERS.length) step.classList.add('progress-step--complete');
        return;
      }
      if (chNum <= chaptersComplete) step.classList.add('progress-step--complete');
      else if (chNum === activeChapter) step.classList.add('progress-step--current');
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
    const maxLives = GameState.getMaxLives(s.difficulty);
    document.getElementById('hudScore').textContent = s.score;
    document.getElementById('hudLives').textContent = '♥'.repeat(s.lives) + '♡'.repeat(Math.max(0, maxLives - s.lives));
    document.querySelectorAll('[data-hint-room]').forEach((btn) => {
      btn.hidden = !GameState.hintsAllowed();
    });
    const engineHint = document.getElementById('btn-engine-hint');
    if (engineHint) engineHint.hidden = !GameState.hintsAllowed();
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
    const el = document.getElementById(tutorElId(roomId));
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
    showFeedback(feedbackElId(roomId), msg, 'error');
    if (dead) {
      GameState.stopTimer();
      AudioFX.gameOver();
      persistSave();
      renderGameOver(roomId);
      setTimeout(() => showScreen('gameover'), 1200);
    } else {
      persistSave();
    }
    return dead;
  }

  async function useHint(roomId) {
    if (!GameState.hintsAllowed()) {
      showTutor(roomId, 'Hard mode — hints disabled. Apply your training.');
      return;
    }
    AudioFX.hint();
    const level = hintLevels[roomId] || 0;
    hintLevels[roomId] = level + 1;
    let hint;
    if (RoomEngine.isEngineRoom(roomId)) {
      hint = RoomEngine.getHintLevel(roomId, level);
    } else {
      hint = await TutorClient.hint(roomId, level);
    }
    GameState.recordHint(roomId, hint);
    updateHud();
    showTutor(roomId, 'Hint: ' + hint);
  }

  function reinitRoomOnEnter(roomId) {
    const inits = {
      phishing: initPhishing,
      attachment: initAttachment,
      fake_login: initFakeLogin,
      password: initPassword,
      cipher: initCipher,
      steganography: initSteganography,
      sql: initSql,
      db_forensics: initDbForensics,
      logs: initLogs,
      siem: initSiem,
      social: initSocial,
      insider: initInsider,
      mfa: initMfa,
      backup: initBackup,
    };
    if (inits[roomId]) inits[roomId]();
  }

  function initCipher() {
    const input = document.getElementById('cipherAnswer');
    if (input) input.value = '';
    hideFeedback('feedback-cipher');
    const tutor = document.getElementById('tutor-cipher');
    if (tutor) tutor.hidden = true;
  }

  async function completeRoom(roomId) {
    if (blockIfHijacked(roomId)) return;
    if (completingRoom || GameState.getState().completedRooms.includes(roomId)) return;
    completingRoom = true;
    try {
      const submitBtn = document.getElementById('btn-' + roomId);
      if (submitBtn) submitBtn.disabled = true;
      if (RoomEngine.isEngineRoom(roomId)) {
        const eb = document.getElementById('btn-engine');
        if (eb) eb.disabled = true;
      }

      AudioFX.roomComplete(roomId);
      GameState.completeRoom(roomId);
      ProfileSave.syncTrainingRoomClear(roomId);
      persistSave();
      Achievements.checkAfterRoom(roomId);
      const stats = GameState.getResultsPayload().roomStats;
      const summary = await TutorClient.summary(roomId, stats);
      showTutor(roomId, summary);
      showFeedback(feedbackElId(roomId), summary + ' Mission complete!', 'success');

      await advanceCampaign(roomId);
    } finally {
      completingRoom = false;
    }
  }

  async function advanceCampaign(fromRoomId) {
    const next = Campaign.getNextStep(fromRoomId);
    if (campaignAdvanceTimer) clearTimeout(campaignAdvanceTimer);
    return new Promise((resolve) => {
      campaignAdvanceTimer = setTimeout(async () => {
        campaignAdvanceTimer = null;
        if (next?.type === 'chapter') {
          showChapterIntro(next.chapterId);
        } else if (next?.type === 'quiz') {
          await startQuiz();
        } else if (typeof next === 'string') {
          if (!GameState.getState().completedRooms.includes(next)) {
            refreshRoomChrome(next);
            showMissionBrief(next);
          }
        }
        resolve();
      }, 2000);
    });
  }

  // --- Phishing ---
  function initPhishing() {
    foundFlags = new Set();
    document.getElementById('flagCount').textContent = '0';
    document.getElementById('btn-phishing').disabled = true;
    hideFeedback('feedback-phishing');
    document.getElementById('tutor-phishing').hidden = true;

    document.querySelectorAll('[data-screen="phishing"] .phishing-target').forEach((el) => {
      el.classList.remove('phishing-target--found', 'phishing-target--decoy');
      el.onclick = onPhishingClick;
      el.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPhishingClick.call(el, e);
        }
      };
    });
  }

  async function onPhishingClick(e) {
    e.preventDefault();
    const flag = this.dataset.flag;
    if (!flag || this.classList.contains('phishing-target--found')) return;
    if (this.classList.contains('phishing-target--decoy')) return;

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
    } else if (PHISHING_DECOY_FLAGS.has(flag)) {
      this.classList.add('phishing-target--decoy');
      const msg = await TutorClient.explain('phishing', flag);
      showTutor('phishing', msg);
      showFeedback('feedback-phishing', msg, 'info');
    } else {
      await handleMistake('phishing', 'wrong_click');
    }
  }

  async function submitPhishing() {
    if (blockIfHijacked('phishing')) return;
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
      const msg = 'Urgency is suspicious, but focus on the macro warning and the fake download link.';
      showTutor('attachment', msg);
      showFeedback('feedback-attachment', msg, 'info');
    } else {
      handleMistake('attachment', 'wrong_click');
    }
  }

  async function submitAttachment() {
    if (blockIfHijacked('attachment')) return;
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
    if (blockIfHijacked('fake_login')) return;
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

  // --- Chapter 2 Boss ---
  function stopCh2BossTimer() {
    if (ch2BossTimerId) {
      clearInterval(ch2BossTimerId);
      ch2BossTimerId = null;
    }
  }

  function updateCh2BossTimerUI() {
    const el = document.getElementById('ch2BossTimer');
    if (el) el.textContent = GameState.formatTime(ch2BossSecondsLeft);
  }

  function updateCh2BossTaskUI() {
    const countEl = document.getElementById('ch2BossTaskCount');
    if (countEl) countEl.textContent = String(ch2BossTasks.size);

    if (ch2BossTasks.has('rotate')) {
      document.querySelector('[data-screen="ch2_boss"] [data-boss="rotate"]')?.classList.add('boss-panel--done');
      const s = document.getElementById('ch2StatusRotate');
      if (s) s.textContent = '✓ Rotated';
    }
    if (ch2BossTasks.has('mfa')) {
      document.querySelector('[data-screen="ch2_boss"] [data-boss="mfa"]')?.classList.add('boss-panel--done');
      const s = document.getElementById('ch2StatusMfa');
      if (s) s.textContent = '✓ MFA enforced';
    }
  }

  async function completeCh2BossTask(task) {
    if (ch2BossTasks.has(task)) return;
    ch2BossTasks.add(task);
    AudioFX.flagFound();
    updateCh2BossTaskUI();
    if (ch2BossTasks.size >= 2) {
      stopCh2BossTimer();
      AudioFX.submit();
      await completeRoom('ch2_boss');
    }
  }

  function initCh2BossRoom() {
    stopCh2BossTimer();
    ch2BossSecondsLeft = CH2_BOSS_TIME_SEC;
    ch2BossTasks = new Set();
    hideFeedback('feedback-ch2_boss');
    document.getElementById('tutor-ch2_boss').hidden = true;

    document.querySelectorAll('[data-screen="ch2_boss"] .boss-panel').forEach((p) => {
      p.classList.remove('boss-panel--done');
    });
    const rStatus = document.getElementById('ch2StatusRotate');
    const mStatus = document.getElementById('ch2StatusMfa');
    if (rStatus) rStatus.textContent = 'Pending';
    if (mStatus) mStatus.textContent = 'Pending';

    initBossOptions('ch2BossPasswordOptions', CH2_BOSS_PASSWORD_OPTIONS, async (id) => {
      if (ch2BossTasks.has('rotate')) return;
      const opt = CH2_BOSS_PASSWORD_OPTIONS.find((o) => o.id === id);
      if (opt?.correct) {
        await completeCh2BossTask('rotate');
      } else {
        await handleMistake('ch2_boss', 'weak_password');
      }
    });

    initBossOptions('ch2BossMfaOptions', CH2_BOSS_MFA_OPTIONS, async (id) => {
      if (ch2BossTasks.has('mfa')) return;
      const opt = CH2_BOSS_MFA_OPTIONS.find((o) => o.id === id);
      if (opt?.correct) {
        await completeCh2BossTask('mfa');
      } else {
        await handleMistake('ch2_boss', 'share_code');
      }
    });

    updateCh2BossTimerUI();
    updateCh2BossTaskUI();

    ch2BossTimerId = setInterval(async () => {
      ch2BossSecondsLeft -= 1;
      updateCh2BossTimerUI();
      if (ch2BossSecondsLeft <= 0) {
        stopCh2BossTimer();
        showFeedback('feedback-ch2_boss', 'Credentials still compromised — attacker pivoted deeper!', 'error');
        await handleMistake('ch2_boss', 'boss_timeout');
      }
    }, 1000);
  }

  // --- Steganography ---
  function initSteganography() {
    stegoFound = false;
    hideFeedback('feedback-steganography');
    document.getElementById('tutor-steganography').hidden = true;
    document.getElementById('btn-steganography').disabled = true;
    const dataEl = document.getElementById('stegoData');
    const statusEl = document.querySelector('.stego-readout__status');
    if (dataEl) {
      dataEl.hidden = true;
      dataEl.textContent = '';
    }
    if (statusEl) statusEl.textContent = 'AWAITING SCAN…';

    document.querySelectorAll('.stego-hotspot').forEach((el) => {
      el.classList.remove('stego-hotspot--found');
      const scan = async (e) => {
        e.preventDefault();
        if (el.classList.contains('stego-hotspot--found')) return;
        AudioFX.click();
        el.classList.add('stego-hotspot--found');
        const region = el.dataset.stego;
        if (region === 'payload') {
          stegoFound = true;
          if (statusEl) statusEl.textContent = 'PAYLOAD DETECTED';
          if (dataEl) {
            dataEl.hidden = false;
            dataEl.textContent = STEGO_PAYLOAD;
          }
          document.getElementById('btn-steganography').disabled = false;
          AudioFX.flagFound();
        } else {
          if (statusEl) statusEl.textContent = 'No payload in this region — try elsewhere.';
          showFeedback('feedback-steganography', 'Nothing hidden here. Attackers often hide data in least-significant bits at image edges.', 'info');
        }
      };
      el.onclick = scan;
      el.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          scan(e);
        }
      };
    });
  }

  async function submitSteganography() {
    if (blockIfHijacked('steganography')) return;
    AudioFX.submit();
    if (stegoFound) {
      await completeRoom('steganography');
    } else {
      showFeedback('feedback-steganography', 'Find the hidden payload first.', 'error');
    }
  }

  function initGenericOptionRoom(roomId, containerId, options) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const btn = document.getElementById('btn-' + roomId);
    if (btn) btn.disabled = true;
    hideFeedback('feedback-' + roomId);
    const tutor = document.getElementById('tutor-' + roomId);
    if (tutor) tutor.hidden = true;

    initOptionRoom(containerId, options, (id, btnEl, cont) => {
      if (roomId === 'db_forensics') selectedDbForensics = id;
      else if (roomId === 'siem') selectedSiem = id;
      else if (roomId === 'insider') selectedInsider = id;
      else if (roomId === 'backup') selectedBackup = id;
      cont.querySelectorAll('.option-btn').forEach((el) => el.classList.remove('option-btn--selected'));
      btnEl.classList.add('option-btn--selected');
      if (btn) btn.disabled = false;
      hideFeedback('feedback-' + roomId);
    });
  }

  function initDbForensics() {
    selectedDbForensics = null;
    initGenericOptionRoom('db_forensics', 'dbForensicsOptions', DB_FORENSICS_OPTIONS);
  }

  async function submitDbForensics() {
    if (blockIfHijacked('db_forensics')) return;
    AudioFX.submit();
    const chosen = DB_FORENSICS_OPTIONS.find((o) => o.id === selectedDbForensics);
    if (!chosen) return;
    if (chosen.correct) {
      await completeRoom('db_forensics');
    } else {
      await handleMistake('db_forensics', chosen.ctx);
    }
  }

  function initSiem() {
    selectedSiem = null;
    initGenericOptionRoom('siem', 'siemOptions', SIEM_OPTIONS);
  }

  async function submitSiem() {
    if (blockIfHijacked('siem')) return;
    AudioFX.submit();
    const chosen = SIEM_OPTIONS.find((o) => o.id === selectedSiem);
    if (!chosen) return;
    if (chosen.correct) {
      await completeRoom('siem');
    } else {
      await handleMistake('siem', chosen.ctx);
    }
  }

  function initInsider() {
    selectedInsider = null;
    initGenericOptionRoom('insider', 'insiderOptions', INSIDER_OPTIONS);
  }

  async function submitInsider() {
    if (blockIfHijacked('insider')) return;
    AudioFX.submit();
    const chosen = INSIDER_OPTIONS.find((o) => o.id === selectedInsider);
    if (!chosen) return;
    if (chosen.correct) {
      await completeRoom('insider');
    } else {
      await handleMistake('insider', chosen.ctx);
    }
  }

  function initBackup() {
    selectedBackup = null;
    initGenericOptionRoom('backup', 'backupOptions', BACKUP_OPTIONS);
  }

  async function submitBackup() {
    if (blockIfHijacked('backup')) return;
    AudioFX.submit();
    const chosen = BACKUP_OPTIONS.find((o) => o.id === selectedBackup);
    if (!chosen) return;
    if (chosen.correct) {
      await completeRoom('backup');
    } else {
      await handleMistake('backup', chosen.ctx);
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
    if (blockIfHijacked('password')) return;
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
    if (blockIfHijacked('cipher')) return;
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
    if (blockIfHijacked('sql')) return;
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
    if (blockIfHijacked('logs')) return;
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
    if (blockIfHijacked('social')) return;
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
    if (blockIfHijacked('mfa')) return;
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

  // --- Lightning Debrief Quiz ---
  function stopQuizTimer() {
    if (quizTimerId) {
      clearInterval(quizTimerId);
      quizTimerId = null;
    }
  }

  function quizFlash(kind) {
    const flash = document.getElementById('quizFlash');
    if (!flash) return;
    flash.classList.remove('quiz-arena__flash--correct', 'quiz-arena__flash--wrong');
    void flash.offsetWidth;
    flash.classList.add(kind === 'correct' ? 'quiz-arena__flash--correct' : 'quiz-arena__flash--wrong');
  }

  function burstQuizFx(kind) {
    const fx = document.getElementById('quizFx');
    if (!fx) return;
    const colors = kind === 'correct'
      ? ['#00ff88', '#ffcc00', '#00e5ff', '#88ffcc']
      : ['#ff3355', '#ff6644', '#ff8899'];
    const count = kind === 'correct' ? 14 : 8;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'quiz-arena__particle';
      p.style.setProperty('--qx', `${(Math.random() - 0.5) * 220}px`);
      p.style.setProperty('--qy', `${-30 - Math.random() * 140}px`);
      p.style.setProperty('--qr', `${Math.random() * 360}deg`);
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = `${i * 25}ms`;
      fx.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  function popQuizScore() {
    const pop = document.getElementById('quizScorePop');
    if (!pop) return;
    pop.hidden = false;
    pop.classList.remove('quiz-arena__score-pop--show');
    void pop.offsetWidth;
    pop.classList.add('quiz-arena__score-pop--show');
    setTimeout(() => {
      pop.classList.remove('quiz-arena__score-pop--show');
      pop.hidden = true;
    }, 900);
  }

  function playQuizIntro() {
    const arena = document.getElementById('quizArena');
    if (!arena) return;
    arena.classList.remove('quiz-arena--boot');
    void arena.offsetWidth;
    arena.classList.add('quiz-arena--boot');
    setTimeout(() => arena.classList.remove('quiz-arena--boot'), 1000);
  }

  function updateQuizTimerUi() {
    const el = document.getElementById('quizTimer');
    const ring = document.getElementById('quizTimerRing');
    const pct = Math.max(0, (quizSecondsLeft / QUIZ_SECONDS_PER_ROUND) * 100);
    if (el) {
      el.textContent = String(quizSecondsLeft);
      el.classList.toggle('quiz-arena__timer--urgent', quizSecondsLeft <= 5);
      el.classList.toggle('quiz-arena__timer--tick', true);
      clearTimeout(el._tickTimer);
      el._tickTimer = setTimeout(() => el.classList.remove('quiz-arena__timer--tick'), 180);
    }
    if (ring) ring.style.setProperty('--quiz-progress', `${pct}%`);
  }

  function startQuizTimer() {
    stopQuizTimer();
    quizSecondsLeft = QUIZ_SECONDS_PER_ROUND;
    updateQuizTimerUi();
    quizTimerId = setInterval(() => {
      quizSecondsLeft -= 1;
      updateQuizTimerUi();
      if (quizSecondsLeft <= 0) {
        stopQuizTimer();
        if (!quizLocked) handleQuizTimeout();
      }
    }, 1000);
  }

  function renderQuizProgress() {
    const dots = document.getElementById('quizProgress');
    if (!dots) return;
    dots.innerHTML = quizData.map((_, i) => {
      let cls = 'quiz-arena__dot';
      if (i < quizCurrentIndex) cls += ' quiz-arena__dot--done';
      else if (i === quizCurrentIndex) cls += ' quiz-arena__dot--current';
      const ans = quizAnswers[i];
      if (ans !== undefined && ans === quizData[i].correct) cls += ' quiz-arena__dot--correct';
      else if (ans !== undefined && ans !== quizData[i].correct) cls += ' quiz-arena__dot--wrong';
      return `<span class="${cls}" style="animation-delay:${i * 80}ms" aria-hidden="true"></span>`;
    }).join('');
    const counter = document.getElementById('quizCounter');
    if (counter) {
      counter.textContent = `Round ${quizCurrentIndex + 1} / ${quizData.length}`;
      counter.classList.remove('quiz-arena__counter--pulse');
      void counter.offsetWidth;
      counter.classList.add('quiz-arena__counter--pulse');
    }
  }

  function animateQuizOptionsIn() {
    const options = document.getElementById('quizOptions');
    if (!options) return;
    options.querySelectorAll('.quiz-arena__option').forEach((btn, i) => {
      btn.style.animationDelay = `${120 + i * 70}ms`;
      btn.classList.add('quiz-arena__option--in');
    });
  }

  function renderQuizQuestion() {
    const q = quizData[quizCurrentIndex];
    if (!q) return;

    quizLocked = false;
    const card = document.getElementById('quizCard');
    const prompt = document.getElementById('quizPrompt');
    const options = document.getElementById('quizOptions');
    const explain = document.getElementById('quizExplain');
    const streakEl = document.getElementById('quizStreak');
    const feedback = document.getElementById('feedback-quiz');

    if (card) {
      card.classList.remove(
        'quiz-arena__card--correct', 'quiz-arena__card--wrong',
        'quiz-arena__card--enter', 'quiz-arena__card--exit', 'quiz-arena__card--shake'
      );
      void card.offsetWidth;
      card.classList.add('quiz-arena__card--enter');
    }
    if (prompt) {
      prompt.textContent = q.question;
      prompt.classList.remove('quiz-arena__prompt--in');
      void prompt.offsetWidth;
      prompt.classList.add('quiz-arena__prompt--in');
    }
    if (explain) {
      explain.hidden = true;
      explain.textContent = '';
      explain.classList.remove('quiz-arena__explain--in');
    }
    if (feedback) feedback.hidden = true;
    if (streakEl && quizStreak < 2) streakEl.hidden = true;

    if (options) {
      options.innerHTML = q.options.map((opt, oi) =>
        `<button type="button" class="quiz-arena__option" data-o="${oi}">${escapeHtml(opt)}</button>`
      ).join('');
      options.querySelectorAll('.quiz-arena__option').forEach((btn) => {
        btn.addEventListener('click', () => handleQuizAnswer(parseInt(btn.dataset.o, 10)));
      });
      animateQuizOptionsIn();
    }

    renderQuizProgress();
    startQuizTimer();
  }

  function showQuizStreak() {
    const streakEl = document.getElementById('quizStreak');
    if (!streakEl || quizStreak < 2) return;
    streakEl.hidden = false;
    streakEl.textContent = `🔥 ${quizStreak} IN A ROW!`;
    streakEl.classList.remove('quiz-arena__streak--pop');
    void streakEl.offsetWidth;
    streakEl.classList.add('quiz-arena__streak--pop');
  }

  function advanceQuizRound() {
    const card = document.getElementById('quizCard');
    if (quizCurrentIndex >= quizData.length - 1) {
      finishQuiz();
      return;
    }
    if (card) {
      card.classList.add('quiz-arena__card--exit');
      setTimeout(() => {
        quizCurrentIndex += 1;
        renderQuizQuestion();
      }, 340);
    } else {
      quizCurrentIndex += 1;
      renderQuizQuestion();
    }
  }

  function resolveQuizRound(chosenIndex, timedOut = false) {
    if (quizLocked) return;
    quizLocked = true;
    stopQuizTimer();

    const q = quizData[quizCurrentIndex];
    const correctIndex = q.correct;
    const isCorrect = !timedOut && chosenIndex === correctIndex;
    quizAnswers[quizCurrentIndex] = timedOut ? -1 : chosenIndex;

    if (isCorrect) {
      quizStreak += 1;
      AudioFX.quizCorrect();
      GameState.addBonus(25);
      pulseScore();
      quizFlash('correct');
      burstQuizFx('correct');
      popQuizScore();
    } else {
      quizStreak = 0;
      AudioFX.quizWrong();
      quizFlash('wrong');
      burstQuizFx('wrong');
    }

    const card = document.getElementById('quizCard');
    const explain = document.getElementById('quizExplain');
    const options = document.getElementById('quizOptions');

    if (card) {
      card.classList.remove('quiz-arena__card--enter');
      card.classList.add(isCorrect ? 'quiz-arena__card--correct' : 'quiz-arena__card--wrong');
      if (!isCorrect) {
        card.classList.add('quiz-arena__card--shake');
      }
    }

    if (options) {
      options.querySelectorAll('.quiz-arena__option').forEach((btn, oi) => {
        btn.disabled = true;
        btn.classList.remove('quiz-arena__option--in');
        if (oi === correctIndex) {
          btn.classList.add('quiz-arena__option--correct', 'quiz-arena__option--reveal');
        } else if (oi === chosenIndex && !isCorrect) {
          btn.classList.add('quiz-arena__option--wrong', 'quiz-arena__option--reveal');
        }
      });
    }

    if (explain) {
      explain.hidden = false;
      explain.textContent = timedOut
        ? `⏱ Time's up! ${q.explanation || 'The safest choice was highlighted in green.'}`
        : isCorrect
          ? `✓ Correct! ${q.explanation || ''}`
          : `✗ Not quite. ${q.explanation || ''}`;
      explain.classList.add('quiz-arena__explain--in');
    }

    showQuizStreak();
    renderQuizProgress();

    setTimeout(() => advanceQuizRound(), isCorrect ? 1400 : 1800);
  }

  function handleQuizAnswer(optionIndex) {
    AudioFX.click();
    resolveQuizRound(optionIndex);
  }

  function handleQuizTimeout() {
    resolveQuizRound(-1, true);
  }

  async function startQuiz() {
    stopQuizTimer();
    quizData = await TutorClient.fetchQuiz();
    quizAnswers = {};
    quizCurrentIndex = 0;
    quizLocked = false;
    quizStreak = 0;
    showScreen('quiz');
    playQuizIntro();
    renderQuizQuestion();
  }

  async function finishQuiz() {
    stopQuizTimer();
    AudioFX.submit();

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

    const perfect = correct === quizData.length;
    const passed = correct >= Math.ceil(quizData.length * 0.67);
    if (perfect) {
      AudioFX.success();
      burstQuizFx('correct');
      quizFlash('correct');
    } else if (passed) {
      AudioFX.roomTransition();
    }

    const arena = document.getElementById('quizArena');
    const rank = perfect ? 'OPERATIVE ELITE' : passed ? 'FIELD READY' : 'NEEDS REVIEW';
    if (arena) {
      arena.classList.add('quiz-arena--complete', perfect ? 'quiz-arena--complete--perfect' : '');
    }

    const feedback = document.getElementById('feedback-quiz');
    showFeedback(
      'feedback-quiz',
      `${rank} — ${correct}/${quizData.length} correct (+${correct * 20} pts)${timeBonus ? ` | Speed bonus: +${timeBonus}` : ''}`,
      perfect ? 'success' : passed ? 'info' : 'error'
    );
    if (feedback) {
      feedback.classList.add('quiz-arena__feedback--reveal');
    }

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
    }, 2200);
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

  function renderGameOver(failedRoomId) {
    const s = GameState.getState();
    const roomId = failedRoomId || s.lastFailedRoom || currentScreen;
    const room = Campaign.getRoom(roomId);
    const totalRooms = GameState.ROOMS.length;
    const cleared = s.completedRooms.length;

    document.getElementById('failAgentName').textContent = s.studentName || 'Agent';
    document.getElementById('failDate').textContent = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const chimeraLine = room.chapter >= 5
      ? ' CHIMERA may have exploited rushed decisions — double-check next time.'
      : '';
    document.getElementById('failCause').textContent =
      `All lives lost during "${room.title}" (${room.actTitle || room.label}).${chimeraLine}`;

    document.getElementById('failStats').innerHTML = `
      <div class="cert-stat cert-stat--fail"><span>Score</span><strong>${s.score}</strong></div>
      <div class="cert-stat cert-stat--fail"><span>Time</span><strong>${GameState.formatTime(s.elapsedSeconds)}</strong></div>
      <div class="cert-stat cert-stat--fail"><span>Missions Cleared</span><strong>${cleared} / ${totalRooms}</strong></div>
      <div class="cert-stat cert-stat--fail"><span>Mistakes</span><strong>${s.mistakes}</strong></div>
      <div class="cert-stat cert-stat--fail"><span>Hints Used</span><strong>${s.hintsUsed.length}</strong></div>
      <div class="cert-stat cert-stat--fail"><span>Hijacks Cleared</span><strong>${s.hijacksCleared || 0}</strong></div>
    `;

    const mapEl = document.getElementById('failCampaignMap');
    if (mapEl) {
      mapEl.innerHTML = Campaign.renderCampaignMap(s.completedRooms, { failedRoom: roomId });
    }

    const tips = [
      'Pause before clicking — urgency is a common attack pattern.',
      'Use hints when stuck; each mistake costs a life.',
      'Verify sender, links, and pressure tactics on every email exercise.',
    ];
    if (room.chapter >= 5) {
      tips.unshift('Ignore the red CHIMERA cursor — it is fake. Use your own mouse and double-check before submitting.');
    }
    document.getElementById('failTips').innerHTML = tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
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
