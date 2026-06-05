/**
 * Cyber Escape Room — 9-chapter campaign (27 rooms + bosses)
 * Playable path implements core chapters; full map shown in UI.
 */
const Campaign = (() => {
  const CHAPTERS = [
    {
      id: 1,
      title: 'The Email',
      tagline: 'Something got through.',
      boss: { id: 'ch1_boss', title: 'Stop the Initial Compromise' },
    },
    {
      id: 2,
      title: 'The Breach',
      tagline: 'The attacker is inside.',
      boss: { id: 'ch2_boss', title: 'Lock the Attacker Out', locked: true },
    },
    {
      id: 3,
      title: 'Dark Signals',
      tagline: 'Someone is communicating inside the network.',
      boss: { id: 'ch3_boss', title: 'Reveal Attacker Plans', locked: true },
    },
    {
      id: 4,
      title: 'Database Under Siege',
      tagline: 'Customer data is at risk.',
      boss: { id: 'ch4_boss', title: 'Save the Customer Database', locked: true },
    },
    {
      id: 5,
      title: 'Threat Hunter',
      tagline: 'Find the attacker.',
      boss: { id: 'ch5_boss', title: 'Track Attacker Location', locked: true },
    },
    {
      id: 6,
      title: 'Human Firewall',
      tagline: "The weakest link isn't technology.",
      boss: { id: 'ch6_boss', title: 'Unmask the Mole', locked: true },
    },
    {
      id: 7,
      title: 'Red Alert',
      tagline: 'The attack begins.',
      boss: { id: 'ch7_boss', title: 'Prevent Total Compromise', locked: true },
    },
    {
      id: 8,
      title: 'Ransomware Crisis',
      tagline: 'Everything depends on you.',
      boss: { id: 'ransomware', title: 'Stop the Ransomware' },
    },
    {
      id: 9,
      title: 'Black Site Ω',
      tagline: 'Project Chimera awaits.',
      secret: true,
      boss: { id: 'ch9_boss', title: 'Project Chimera', locked: true },
    },
  ];

  const ROOM_CATALOG = {
    phishing: {
      chapter: 1, num: 1, title: 'Phishing Inbox', theme: 'Mail Client',
      goal: 'Find the malicious email', story: 'An employee received a suspicious message. Identify every malicious indicator.',
      tag: "[ SYSTEM: MAIL CLIENT '98 ]", playable: true,
    },
    attachment: {
      chapter: 1, num: 2, title: 'Attachment Sandbox', theme: 'PDF Analyzer',
      goal: 'Analyze a suspicious PDF', story: 'The email contained an attachment. Inspect the PDF sandbox before opening it company-wide.',
      tag: '[ SYSTEM: ATTACHMENT SANDBOX ]', playable: true,
    },
    fake_login: {
      chapter: 1, num: 3, title: 'Fake Login Portal', theme: 'Browser Shield',
      goal: 'Identify the cloned website', story: 'Users were redirected to a login portal. Find the typosquatted fake site.',
      tag: '[ SYSTEM: WEB SHIELD ]', playable: true,
    },
    ch1_boss: {
      chapter: 1, num: 0, title: 'Chapter 1 Boss', theme: 'Incident Response',
      goal: 'Stop the initial compromise', story: 'Quarantine the threat and block the fake portal before credentials leak.',
      tag: '[ BOSS: INITIAL COMPROMISE ]', playable: true, isBoss: true,
    },
    password: {
      chapter: 2, num: 4, title: 'Password Vault', theme: 'Credential Policy',
      goal: 'Repair weak password policies', story: 'Attackers obtained weak credentials. Enforce a password that meets security standards.',
      tag: '[ SYSTEM: MS-DOS TERMINAL ]', playable: true,
    },
    mfa: {
      chapter: 2, num: 5, title: 'MFA Lockdown', theme: 'Account Protection',
      goal: 'Deploy MFA', story: 'Roll out multi-factor authentication before the attacker reuses stolen passwords.',
      tag: '[ SYSTEM: MFA CONSOLE ]', playable: true,
    },
    ch2_boss: { chapter: 2, num: 0, title: 'Lock the Attacker Out', locked: true, playable: false, isBoss: true },
    cipher: {
      chapter: 3, num: 7, title: 'Cipher Lab', theme: 'Encrypted Comms',
      goal: 'Decode attacker messages', story: 'Intercept encrypted commands on the wire. Shift each letter back by 3.',
      tag: '[ SYSTEM: MILITARY CONSOLE ]', playable: true,
    },
    steganography: { chapter: 3, num: 8, title: 'Steganography', locked: true, playable: false },
    dead_drop: { chapter: 3, num: 9, title: 'Dead Drop Server', locked: true, playable: false },
    ch3_boss: { chapter: 3, num: 0, title: 'Reveal Attacker Plans', locked: true, playable: false, isBoss: true },
    sql: {
      chapter: 4, num: 10, title: 'SQL Injection', theme: 'Database Patch',
      goal: 'Patch vulnerable queries', story: 'The login form is vulnerable. Apply the fix before data is exfiltrated.',
      tag: '[ SYSTEM: SERVER RACK ]', playable: true,
    },
    db_forensics: { chapter: 4, num: 11, title: 'Database Forensics', locked: true, playable: false },
    api_breach: { chapter: 4, num: 12, title: 'API Breach', locked: true, playable: false },
    ch4_boss: { chapter: 4, num: 0, title: 'Save the Customer Database', locked: true, playable: false, isBoss: true },
    logs: {
      chapter: 5, num: 13, title: 'Log Analysis', theme: 'SIEM Feed',
      goal: 'Review server logs', story: 'Authentication logs show brute-force activity. Identify the attacker IP.',
      tag: '[ SYSTEM: LOG FORENSICS ]', playable: true,
    },
    siem: { chapter: 5, num: 14, title: 'SIEM Dashboard', locked: true, playable: false },
    network: { chapter: 5, num: 15, title: 'Network Traffic', locked: true, playable: false },
    ch5_boss: { chapter: 5, num: 0, title: 'Track Attacker Location', locked: true, playable: false, isBoss: true },
    social: {
      chapter: 6, num: 16, title: 'Social Engineering', theme: 'Human Factor',
      goal: 'Spot manipulation attempts', story: 'An attacker is calling employees. Choose the response that breaks the chain.',
      tag: '[ SYSTEM: SOC DASHBOARD ]', playable: true,
    },
    insider: { chapter: 6, num: 17, title: 'Insider Threat', locked: true, playable: false },
    physical: { chapter: 6, num: 18, title: 'Physical Security', locked: true, playable: false },
    ch6_boss: { chapter: 6, num: 0, title: 'Unmask the Mole', locked: true, playable: false, isBoss: true },
    malware: { chapter: 7, num: 19, title: 'Malware Sandbox', locked: true, playable: false },
    lateral: { chapter: 7, num: 20, title: 'Lateral Movement', locked: true, playable: false },
    incident: { chapter: 7, num: 21, title: 'Incident Response', locked: true, playable: false },
    ch7_boss: { chapter: 7, num: 0, title: 'Prevent Total Compromise', locked: true, playable: false, isBoss: true },
    backup: { chapter: 8, num: 22, title: 'Backup Recovery', locked: true, playable: false },
    decryption: { chapter: 8, num: 23, title: 'Decryption Key Hunt', locked: true, playable: false },
    mainframe: { chapter: 8, num: 24, title: 'Mainframe Core', locked: true, playable: false },
    ransomware: {
      chapter: 8, num: 0, title: 'Final Boss — Ransomware Crisis', theme: 'Mainframe Core',
      goal: 'Stop ransomware before timer hits zero', story: 'Every skill you learned is required. Contain the breach in 5 minutes.',
      tag: '[ FINAL BOSS: MAINFRAME CORE ]', playable: true, isBoss: true,
    },
    zero_day: { chapter: 9, num: 25, title: 'Zero-Day', locked: true, playable: false, secret: true },
    ai_security: { chapter: 9, num: 26, title: 'AI Security System', locked: true, playable: false, secret: true },
    quantum: { chapter: 9, num: 27, title: 'Quantum Vault', locked: true, playable: false, secret: true },
    ch9_boss: { chapter: 9, num: 0, title: 'Project Chimera', locked: true, playable: false, isBoss: true, secret: true },
  };

  /** Playable sequence: chapter intros + rooms */
  const SEQUENCE = [
    { type: 'chapter', chapterId: 1 },
    'phishing', 'attachment', 'fake_login', 'ch1_boss',
    { type: 'chapter', chapterId: 2 },
    'password', 'mfa',
    { type: 'chapter', chapterId: 3 },
    'cipher',
    { type: 'chapter', chapterId: 4 },
    'sql',
    { type: 'chapter', chapterId: 5 },
    'logs',
    { type: 'chapter', chapterId: 6 },
    'social',
    { type: 'chapter', chapterId: 8 },
    'ransomware',
  ];

  function getChapter(id) {
    return CHAPTERS.find((c) => c.id === id) || null;
  }

  function getRoom(id) {
    const r = ROOM_CATALOG[id];
    if (!r) {
      return {
        chapter: 0, num: 0, title: id, theme: '', goal: '', story: '',
        tag: '', label: id, chapterTitle: '', chapterTagline: '',
      };
    }
    const ch = getChapter(r.chapter);
    const label = r.isBoss
      ? `Chapter ${r.chapter} — BOSS`
      : `Chapter ${r.chapter} — Room ${r.num}`;
    return {
      ...r,
      chapterTitle: ch?.title || '',
      chapterTagline: ch?.tagline || '',
      label,
      actTitle: ch ? `Chapter ${r.chapter}: ${ch.title}` : '',
    };
  }

  function getPlayableRoomIds() {
    return SEQUENCE.filter((s) => typeof s === 'string');
  }

  function getTotalCatalogRooms() {
    return Object.keys(ROOM_CATALOG).filter((k) => ROOM_CATALOG[k].num > 0 && !ROOM_CATALOG[k].isBoss).length;
  }

  function getNextStep(currentRoomId) {
    if (!currentRoomId) {
      return SEQUENCE[0];
    }
    let idx = -1;
    if (currentRoomId === 'intro') {
      idx = -1;
    } else {
      idx = SEQUENCE.findIndex((s) => s === currentRoomId);
    }
    return SEQUENCE[idx + 1] ?? { type: 'quiz' };
  }

  function getChapterFirstRoom(chapterId) {
    const chIdx = SEQUENCE.findIndex((s) => s.type === 'chapter' && s.chapterId === chapterId);
    if (chIdx < 0) return null;
    for (let i = chIdx + 1; i < SEQUENCE.length; i++) {
      if (typeof SEQUENCE[i] === 'string') return SEQUENCE[i];
      if (SEQUENCE[i].type === 'chapter') break;
    }
    return null;
  }

  function renderCampaignMap(completedRooms, options = {}) {
    const completed = new Set(completedRooms);
    let html = '';
    CHAPTERS.forEach((ch) => {
      if (ch.secret && !options.showSecret) return;
      const rooms = Object.entries(ROOM_CATALOG)
        .filter(([, r]) => r.chapter === ch.id && r.num > 0)
        .sort((a, b) => a[1].num - b[1].num);
      html += `<div class="campaign-map__chapter${ch.secret ? ' campaign-map__chapter--secret' : ''}">
        <h4>Chapter ${ch.id}: ${ch.title}</h4>
        <p class="campaign-map__tagline">"${ch.tagline}"</p>
        <ul class="campaign-map__rooms">`;
      rooms.forEach(([id, r]) => {
        const done = completed.has(id);
        const locked = r.locked || !r.playable;
        const cls = done ? 'campaign-map__room--done' : locked ? 'campaign-map__room--locked' : 'campaign-map__room--open';
        html += `<li class="campaign-map__room ${cls}">${r.num}. ${r.title}${done ? ' ✓' : locked ? ' 🔒' : ''}</li>`;
      });
      const boss = ROOM_CATALOG[ch.boss?.id] || { title: ch.boss?.title };
      const bossDone = completed.has(ch.boss?.id);
      html += `<li class="campaign-map__room campaign-map__room--boss${bossDone ? ' campaign-map__room--done' : ''}">BOSS: ${boss.title || ch.boss?.title}</li>`;
      html += '</ul></div>';
    });
    return html;
  }

  function canUnlockSecret(state) {
    return state.completedRooms.length >= getPlayableRoomIds().length
      && state.quizScore?.correct === state.quizScore?.total
      && state.mistakes === 0;
  }

  return {
    CHAPTERS,
    ROOM_CATALOG,
    SEQUENCE,
    getChapter,
    getRoom,
    getPlayableRoomIds,
    getTotalCatalogRooms,
    getNextStep,
    getChapterFirstRoom,
    renderCampaignMap,
    canUnlockSecret,
  };
})();
