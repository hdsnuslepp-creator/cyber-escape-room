/**
 * Cyber Escape Room — 14-chapter campaign (56 rooms)
 */
const Campaign = (() => {
  const CHAPTERS = [
    { id: 1, title: 'The Email', tagline: 'Something got through.', boss: { id: 'ch1_boss', title: 'Stop the Initial Compromise' } },
    { id: 2, title: 'The Breach', tagline: 'The attacker is inside.', boss: { id: 'ch2_boss', title: 'Lock the Attacker Out' } },
    { id: 3, title: 'Dark Signals', tagline: 'Someone is communicating inside the network.', boss: { id: 'ch3_boss', title: 'Reveal Attacker Plans' } },
    { id: 4, title: 'Database Under Siege', tagline: 'Customer data is at risk.', boss: { id: 'ch4_boss', title: 'Save the Customer Database' } },
    { id: 5, title: 'Threat Hunter', tagline: 'Find the attacker.', boss: { id: 'ch5_boss', title: 'Track Attacker Location' } },
    { id: 6, title: 'Human Firewall', tagline: "The weakest link isn't technology.", boss: { id: 'ch6_boss', title: 'Unmask the Mole' } },
    { id: 7, title: 'Red Alert', tagline: 'The attack escalates.', boss: { id: 'ch7_boss', title: 'Prevent Total Compromise' } },
    { id: 8, title: 'Ransomware Crisis', tagline: 'Everything depends on you.', boss: { id: 'ransomware', title: 'Stop the Ransomware' } },
    { id: 9, title: 'Cloud Zero Trust', tagline: 'Misconfigs expose the crown jewels.', boss: { id: 'ch9_boss', title: 'Lock the Cloud Perimeter' } },
    { id: 10, title: 'Supply Chain', tagline: 'Trust no installer.', boss: { id: 'ch10_boss', title: 'Restore Trusted Delivery' } },
    { id: 11, title: 'ICS / OT', tagline: 'When cyber hits physical.', boss: { id: 'ch11_boss', title: 'Protect Critical Infrastructure' } },
    { id: 12, title: 'AI Threats', tagline: 'Synthetic deception.', boss: { id: 'ch12_boss', title: 'Stop AI-Driven Fraud' } },
    { id: 13, title: 'Digital Forensics', tagline: 'Every byte tells a story.', boss: { id: 'ch13_boss', title: 'Build the Case' } },
    { id: 14, title: 'Operation Chimera', tagline: 'Project Chimera ends here.', boss: { id: 'ch14_boss', title: 'Stop Project Chimera' } },
  ];

  /** 4 missions per chapter × 14 = 56 rooms */
  const CHAPTER_ROOMS = {
    1: ['phishing', 'attachment', 'fake_login', 'ch1_boss'],
    2: ['password', 'mfa', 'credential_audit', 'ch2_boss'],
    3: ['cipher', 'steganography', 'dead_drop', 'ch3_boss'],
    4: ['sql', 'db_forensics', 'api_breach', 'ch4_boss'],
    5: ['logs', 'siem', 'network', 'ch5_boss'],
    6: ['social', 'insider', 'physical', 'ch6_boss'],
    7: ['malware', 'lateral', 'incident', 'ch7_boss'],
    8: ['backup', 'decryption', 'mainframe', 'ransomware'],
    9: ['cloud_misconfig', 'iam_privilege', 's3_exposure', 'ch9_boss'],
    10: ['dependency_hijack', 'signed_malware', 'vendor_phishing', 'ch10_boss'],
    11: ['scada_alert', 'plc_logic', 'safety_override', 'ch11_boss'],
    12: ['ai_phishing', 'deepfake_call', 'prompt_injection', 'ch12_boss'],
    13: ['memory_dump', 'timeline_analysis', 'artifact_hunt', 'ch13_boss'],
    14: ['zero_day', 'ai_security', 'quantum', 'ch14_boss'],
  };

  const ROOM_META = {
    phishing: { num: 1, title: 'Phishing Inbox', theme: 'Mail Client', tag: "[ SYSTEM: MAIL CLIENT '98 ]", story: 'Identify malicious indicators in a suspicious email.' },
    attachment: { num: 2, title: 'Attachment Sandbox', theme: 'PDF Analyzer', tag: '[ SYSTEM: ATTACHMENT SANDBOX ]', story: 'Inspect a PDF preview before it spreads company-wide.' },
    fake_login: { num: 3, title: 'Fake Login Portal', theme: 'Browser Shield', tag: '[ SYSTEM: WEB SHIELD ]', story: 'Find the typosquatted login portal.' },
    ch1_boss: { num: 0, title: 'Stop the Initial Compromise', theme: 'Incident Response', tag: '[ BOSS: INITIAL COMPROMISE ]', story: 'Quarantine email and block the fake portal in 90 seconds.', isBoss: true },
    password: { num: 5, title: 'Password Vault', theme: 'Credential Policy', tag: '[ SYSTEM: MS-DOS TERMINAL ]', story: 'Choose a password that meets security standards.' },
    mfa: { num: 6, title: 'MFA Lockdown', theme: 'Account Protection', tag: '[ SYSTEM: MFA CONSOLE ]', story: 'Never share MFA codes with anyone posing as IT.' },
    credential_audit: { num: 7, title: 'Credential Audit', theme: 'Policy Review', tag: '[ SYSTEM: AUDIT CONSOLE ]', story: 'Fix shared admin credentials discovered in a wiki leak.' },
    ch2_boss: { num: 0, title: 'Lock the Attacker Out', theme: 'Credential Lockdown', tag: '[ BOSS: CREDENTIAL LOCKDOWN ]', story: 'Rotate passwords and enforce MFA under time pressure.', isBoss: true },
    cipher: { num: 9, title: 'Cipher Lab', theme: 'Encrypted Comms', tag: '[ SYSTEM: MILITARY CONSOLE ]', story: 'Decode intercepted commands (Caesar −3).' },
    steganography: { num: 10, title: 'Steganography', theme: 'Hidden Data', tag: '[ SYSTEM: STEGANO LAB ]', story: 'Find concealed data inside an innocent image.' },
    dead_drop: { num: 11, title: 'Dead Drop Server', theme: 'DNS Tunneling', tag: '[ SYSTEM: DNS MONITOR ]', story: 'Identify DNS dead-drop command traffic.' },
    ch3_boss: { num: 0, title: 'Reveal Attacker Plans', theme: 'Signal Intelligence', tag: '[ BOSS: DARK SIGNALS ]', story: 'Contain C2 before ransomware deploys.', isBoss: true },
    sql: { num: 13, title: 'SQL Injection', theme: 'Database Patch', tag: '[ SYSTEM: SERVER RACK ]', story: 'Patch a vulnerable login query.' },
    db_forensics: { num: 14, title: 'Database Forensics', theme: 'Data Exfiltration', tag: '[ SYSTEM: DB FORENSICS ]', story: 'Identify stolen customer records in export logs.' },
    api_breach: { num: 15, title: 'API Breach', theme: 'Cloud Keys', tag: '[ SYSTEM: API GATEWAY ]', story: 'Respond to a leaked API key in public GitHub.' },
    ch4_boss: { num: 0, title: 'Save the Customer Database', theme: 'DB Crisis', tag: '[ BOSS: DATABASE SIEGE ]', story: 'Priority actions to stop an active data dump.', isBoss: true },
    logs: { num: 17, title: 'Log Analysis', theme: 'SIEM Feed', tag: '[ SYSTEM: LOG FORENSICS ]', story: 'Find the attacker IP in authentication logs.' },
    siem: { num: 18, title: 'SIEM Dashboard', theme: 'Alert Correlation', tag: '[ SYSTEM: SIEM DASHBOARD ]', story: 'Correlate alerts into an attack timeline.' },
    network: { num: 19, title: 'Network Traffic', theme: 'NetFlow', tag: '[ SYSTEM: NETFLOW ANALYZER ]', story: 'Classify beaconing traffic to external IPs.' },
    ch5_boss: { num: 0, title: 'Track Attacker Location', theme: 'Threat Hunt', tag: '[ BOSS: THREAT HUNTER ]', story: 'Block the attacker and isolate compromised hosts.', isBoss: true },
    social: { num: 21, title: 'Social Engineering', theme: 'Human Factor', tag: '[ SYSTEM: SOC DASHBOARD ]', story: 'Choose the safest response to a vishing call.' },
    insider: { num: 22, title: 'Insider Threat', theme: 'Internal Investigation', tag: '[ SYSTEM: HR SECURITY ]', story: 'Spot suspicious employee data movement.' },
    physical: { num: 23, title: 'Physical Security', theme: 'Facility Ops', tag: '[ SYSTEM: PHYSSEC DESK ]', story: 'Respond to tailgating and a lobby USB drop.' },
    ch6_boss: { num: 0, title: 'Unmask the Mole', theme: 'Insider Response', tag: '[ BOSS: HUMAN FIREWALL ]', story: 'Contain insider and physical breach together.', isBoss: true },
    malware: { num: 25, title: 'Malware Sandbox', theme: 'Detonation Lab', tag: '[ SYSTEM: MALWARE LAB ]', story: 'Classify behavior of a detonated sample.' },
    lateral: { num: 26, title: 'Lateral Movement', theme: 'AD Attack', tag: '[ SYSTEM: DOMAIN MONITOR ]', story: 'Recognize PsExec and credential dumping.' },
    incident: { num: 27, title: 'Incident Response', theme: 'IR Playbook', tag: '[ SYSTEM: IR PORTAL ]', story: 'Execute the first step of the IR playbook.' },
    ch7_boss: { num: 0, title: 'Prevent Total Compromise', theme: 'Crisis Command', tag: '[ BOSS: RED ALERT ]', story: 'Segment the network before malware spreads.', isBoss: true },
    backup: { num: 29, title: 'Backup Recovery', theme: 'Restore Point', tag: '[ SYSTEM: BACKUP VAULT ]', story: 'Select the last clean backup snapshot.' },
    decryption: { num: 30, title: 'Decryption Key Hunt', theme: 'Recovery Ops', tag: '[ SYSTEM: RECOVERY DESK ]', story: 'Recover without paying the ransom.' },
    mainframe: { num: 31, title: 'Mainframe Core', theme: 'Legacy Systems', tag: '[ SYSTEM: MAINFRAME OPS ]', story: 'Halt unauthorized jobs on the mainframe.' },
    ransomware: { num: 0, title: 'Ransomware Crisis', theme: 'Mainframe Core', tag: '[ FINAL BOSS: MAINFRAME CORE ]', story: 'Complete 5 containment tasks in 5 minutes.', isBoss: true },
    cloud_misconfig: { num: 33, title: 'Cloud Misconfiguration', theme: 'Cloud Posture', tag: '[ SYSTEM: CSPM ]', story: 'Fix a publicly exposed backup bucket.' },
    iam_privilege: { num: 34, title: 'IAM Privilege Escalation', theme: 'Identity', tag: '[ SYSTEM: IAM AUDITOR ]', story: 'Remove excessive admin from a temp account.' },
    s3_exposure: { num: 35, title: 'S3 Exposure', theme: 'Object Storage', tag: '[ SYSTEM: S3 GUARD ]', story: 'Respond to a public PII bucket policy change.' },
    ch9_boss: { num: 0, title: 'Lock the Cloud Perimeter', theme: 'Cloud Command', tag: '[ BOSS: ZERO TRUST ]', story: 'Org-wide cloud lockdown after breach.', isBoss: true },
    dependency_hijack: { num: 37, title: 'Dependency Hijack', theme: 'DevSecOps', tag: '[ SYSTEM: CI/CD SCAN ]', story: 'Respond to a poisoned npm package.' },
    signed_malware: { num: 38, title: 'Signed Malware', theme: 'Code Trust', tag: '[ SYSTEM: SIGNING CA ]', story: 'Contain a vendor update signed with stolen cert.' },
    vendor_phishing: { num: 39, title: 'Vendor Phishing', theme: 'BEC', tag: '[ SYSTEM: FINANCE SOC ]', story: 'Detect business email compromise wire fraud.' },
    ch10_boss: { num: 0, title: 'Restore Trusted Delivery', theme: 'Supply Chain', tag: '[ BOSS: SUPPLY CHAIN ]', story: 'Rebuild trust in the software pipeline.', isBoss: true },
    scada_alert: { num: 41, title: 'SCADA Alert', theme: 'OT Monitoring', tag: '[ SYSTEM: SCADA SOC ]', story: 'Investigate unauthorized PLC writes.' },
    plc_logic: { num: 42, title: 'PLC Logic Tamper', theme: 'OT Engineering', tag: '[ SYSTEM: PLC WORKBENCH ]', story: 'Restore tampered ladder logic safely.' },
    safety_override: { num: 43, title: 'Safety Override', theme: 'OT Safety', tag: '[ SYSTEM: SAFETY INTERLOCK ]', story: 'Reject social engineering of safety systems.' },
    ch11_boss: { num: 0, title: 'Protect Critical Infrastructure', theme: 'OT Command', tag: '[ BOSS: ICS / OT ]', story: 'Fail-safe OT network during active attack.', isBoss: true },
    ai_phishing: { num: 45, title: 'AI Phishing', theme: 'Deepfake', tag: '[ SYSTEM: EXEC COMMS ]', story: 'Verify a cloned executive voice request.' },
    deepfake_call: { num: 46, title: 'Deepfake Video Call', theme: 'Synthetic Media', tag: '[ SYSTEM: VIDEO VERIFY ]', story: 'Authenticate a suspicious CFO video call.' },
    prompt_injection: { num: 47, title: 'Prompt Injection', theme: 'LLM Security', tag: '[ SYSTEM: AI GATEWAY ]', story: 'Harden an internal chatbot against injection.' },
    ch12_boss: { num: 0, title: 'Stop AI-Driven Fraud', theme: 'AI Defense', tag: '[ BOSS: AI THREATS ]', story: 'Stop synthetic fraud targeting leadership.', isBoss: true },
    memory_dump: { num: 49, title: 'Memory Dump Analysis', theme: 'Live Forensics', tag: '[ SYSTEM: VOLATILITY LAB ]', story: 'Acquire RAM before evidence is lost.' },
    timeline_analysis: { num: 50, title: 'Timeline Analysis', theme: 'Event Correlation', tag: '[ SYSTEM: TIMELINE ]', story: 'Identify attack stage from correlated events.' },
    artifact_hunt: { num: 51, title: 'Artifact Hunt', theme: 'Disk Forensics', tag: '[ SYSTEM: ARTIFACT DB ]', story: 'Find strongest persistence evidence on disk.' },
    ch13_boss: { num: 0, title: 'Build the Case', theme: 'Forensic Command', tag: '[ BOSS: FORENSICS ]', story: 'Complete investigation for prosecution.', isBoss: true },
    zero_day: { num: 53, title: 'Zero-Day Exploit', theme: 'Virtual Patching', tag: '[ SYSTEM: EDGE DEFENSE ]', story: 'Mitigate an unpatched VPN zero-day.' },
    ai_security: { num: 54, title: 'AI Security System', theme: 'Model Integrity', tag: '[ SYSTEM: ML SECOPS ]', story: 'Recover from poisoned training data.' },
    quantum: { num: 55, title: 'Quantum Vault', theme: 'Post-Quantum Crypto', tag: '[ SYSTEM: QUANTUM VAULT ]', story: 'Plan quantum-safe protection for long-term secrets.' },
    ch14_boss: { num: 0, title: 'Stop Project Chimera', theme: 'Final Operation', tag: '[ BOSS: OPERATION CHIMERA ]', story: 'Final boss — coordinate all skills to stop Chimera.', isBoss: true },
  };

  function buildRoomCatalog() {
    const catalog = {};
    Object.entries(CHAPTER_ROOMS).forEach(([chId, ids]) => {
      ids.forEach((id) => {
        const m = ROOM_META[id] || { num: 0, title: id, theme: '', tag: '', story: '' };
        catalog[id] = {
          chapter: Number(chId),
          num: m.num,
          title: m.title,
          theme: m.theme,
          goal: m.story,
          story: m.story,
          tag: m.tag,
          playable: true,
          isBoss: !!m.isBoss,
        };
      });
    });
    return catalog;
  }

  const ROOM_CATALOG = buildRoomCatalog();

  function buildSequence() {
    const seq = [];
    CHAPTERS.forEach((ch) => {
      seq.push({ type: 'chapter', chapterId: ch.id });
      (CHAPTER_ROOMS[ch.id] || []).forEach((roomId) => seq.push(roomId));
    });
    return seq;
  }

  const SEQUENCE = buildSequence();

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
    return getPlayableRoomIds().length;
  }

  function getNextStep(currentRoomId) {
    let idx = -1;
    if (currentRoomId && currentRoomId !== 'intro') {
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
      const ids = CHAPTER_ROOMS[ch.id] || [];
      html += `<div class="campaign-map__chapter">
        <h4>Chapter ${ch.id}: ${ch.title}</h4>
        <p class="campaign-map__tagline">"${ch.tagline}"</p>
        <ul class="campaign-map__rooms">`;
      ids.forEach((id) => {
        const r = ROOM_CATALOG[id];
        if (!r) return;
        const done = completed.has(id);
        const cls = done ? 'campaign-map__room--done' : 'campaign-map__room--open';
        const label = r.isBoss ? `BOSS: ${r.title}` : `${r.num}. ${r.title}`;
        html += `<li class="campaign-map__room ${cls}">${label}${done ? ' ✓' : ''}</li>`;
      });
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
    CHAPTER_ROOMS,
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
