/**
 * Facility map — 7 sectors + CORE. Each sector = 3 missions + boss door.
 * Sectors 1–2 use dedicated modules; 3–7 + CORE use FacilitySectorGeneric.
 */
(function () {
  'use strict';

  const SECTORS = [
    {
      id: 1,
      label: 'INBOX',
      title: 'THE EMAIL',
      tagline: 'Something got through.',
      bossFlag: 'ch1BossComplete',
      nextId: 2,
      legacy: true,
      missions: [
        { flag: 'inboxComplete', terminal: 'pc', scene: 'PhishingScene', usePanel: 'initialize' },
        { flag: 'attachmentComplete', terminal: 'server', scene: 'AttachmentScene' },
        { flag: 'fakeLoginComplete', terminal: 'pc', scene: 'FakeLoginScene' },
      ],
    },
    {
      id: 2,
      label: 'BREACH',
      title: 'THE BREACH',
      tagline: 'The attacker is inside.',
      bossFlag: 'ch2BossComplete',
      nextId: 3,
      module: 'FacilitySector2',
      terminals: { pc: 'PASSWORD', archive: 'MFA', server: 'AUDIT' },
      missions: [
        { flag: 's2PasswordComplete', terminal: 'pc', panelTitle: 'PASSWORD VAULT', panelSub: 'Rotate compromised credentials', scene: 'PasswordScene' },
        { flag: 's2MfaComplete', terminal: 'archive', panelTitle: 'MFA KIOSK', panelSub: 'Never share verification codes', scene: 'MFAScene', requires: 's2PasswordComplete' },
        { flag: 's2CredentialComplete', terminal: 'server', panelTitle: 'CREDENTIAL AUDIT', panelSub: 'Apply the correct access policy', scene: 'CredentialScene', requires: 's2MfaComplete' },
      ],
      intro: ['Sector 2.', 'The Breach.', 'Valid credentials were stolen.', 'Rotate them before the attacker moves.'],
      doorPrompt: 'The attacker is pivoting.\nCut access now — or trace where they went.',
      doorChoices: [
        { label: '[ LOCK THEM OUT ]', stance: 'shutdown', response: 'Good.\nThey will knock again.\nThey always do.' },
        { label: '[ TRACE THE PIVOT ]', stance: 'listen', response: 'Brave.\nSector 3 holds what they took.\n…when you are ready.' },
      ],
      completeQuote: '"They were inside — then you locked the door."',
    },
    {
      id: 3,
      label: 'SIGNALS',
      title: 'DARK SIGNALS',
      tagline: 'Someone is communicating inside the network.',
      bossFlag: 'ch3BossComplete',
      nextId: 4,
      palette: { void: 0x040608, wall: 0x101418, edge: 0x44ff88, floor: 0x0c1810, floorAlt: 0x081410, a: 0x228855, b: 0x44aa66, c: 0x336644 },
      graffiti: ['THE WIRE REMEMBERS', '581 LEFT A FREQUENCY', 'LISTEN CLOSER'],
      terminals: { pc: 'CIPHER', archive: 'STEGO', server: 'DNS' },
      missions: [
        { flag: 's3CipherComplete', terminal: 'pc', puzzleId: 's3_cipher', unlockFlag: 'justUnlockedS3Stego', requires: null },
        { flag: 's3StegoComplete', terminal: 'archive', puzzleId: 's3_stego', unlockFlag: 'justUnlockedS3DeadDrop', requires: 's3CipherComplete' },
        { flag: 's3DeadDropComplete', terminal: 'server', puzzleId: 's3_dead_drop', requires: 's3StegoComplete' },
      ],
      intro: ['Sector 3.', 'Dark Signals.', 'Encrypted chatter on the wire.', 'Decode before ransomware deploys.'],
      doorPrompt: 'C2 traffic is live.\nCut the channel — or follow it deeper.',
      doorChoices: [
        { label: '[ SEVER C2 ]', stance: 'shutdown', response: 'The signal dies.\nFor now.' },
        { label: '[ FOLLOW THE BEACON ]', stance: 'listen', response: 'Then you will see\nwhat they wanted from the database.' },
      ],
      completeQuote: '"The signals stopped — but something was already copied."',
    },
    {
      id: 4,
      label: 'DATABASE',
      title: 'DATABASE UNDER SIEGE',
      tagline: 'Customer data is at risk.',
      bossFlag: 'ch4BossComplete',
      nextId: 5,
      palette: { void: 0x060408, wall: 0x181018, edge: 0xff6644, floor: 0x140c10, floorAlt: 0x100810, a: 0xaa4433, b: 0xcc5544, c: 0x883322 },
      graffiti: ['DATA LEAKING', '581 TRIED TO PATCH THIS', 'TOO LATE?'],
      terminals: { pc: 'SQL', archive: 'FORENSICS', server: 'API' },
      missions: [
        { flag: 's4SqlComplete', terminal: 'pc', puzzleId: 's4_sql', unlockFlag: 'justUnlockedS4Db', requires: null },
        { flag: 's4DbComplete', terminal: 'archive', puzzleId: 's4_db', unlockFlag: 'justUnlockedS4Api', requires: 's4SqlComplete' },
        { flag: 's4ApiComplete', terminal: 'server', puzzleId: 's4_api', requires: 's4DbComplete' },
      ],
      intro: ['Sector 4.', 'Database Under Siege.', 'SQL injection foothold confirmed.', 'Patch before exfiltration completes.'],
      doorPrompt: 'Export jobs are running.\nKill the dump — or hunt the attacker.',
      doorChoices: [
        { label: '[ KILL EXPORT ]', stance: 'shutdown', response: 'The pipe closes.\nThey will find another.' },
        { label: '[ HUNT THE ATTACKER ]', stance: 'listen', response: 'Good.\nSector 5 is where they hide.' },
      ],
      completeQuote: '"The database held — this time."',
    },
    {
      id: 5,
      label: 'HUNTER',
      title: 'THREAT HUNTER',
      tagline: 'Find the attacker.',
      bossFlag: 'ch5BossComplete',
      nextId: 6,
      palette: { void: 0x04060a, wall: 0x0c1420, edge: 0x44aaff, floor: 0x0a1218, floorAlt: 0x080e14, a: 0x3366aa, b: 0x4488cc, c: 0x224466 },
      graffiti: ['TRUST NOTHING', '581 SAW THEM FIRST', 'HUNT'],
      terminals: { pc: 'LOGS', archive: 'SIEM', server: 'NETFLOW' },
      missions: [
        { flag: 's5LogsComplete', terminal: 'pc', puzzleId: 's5_logs', unlockFlag: 'justUnlockedS5Siem', requires: null },
        { flag: 's5SiemComplete', terminal: 'archive', puzzleId: 's5_siem', unlockFlag: 'justUnlockedS5Network', requires: 's5LogsComplete' },
        { flag: 's5NetworkComplete', terminal: 'server', puzzleId: 's5_network', requires: 's5SiemComplete' },
      ],
      intro: ['Sector 5.', 'Threat Hunter.', 'CHIMERA leaves traces in logs.', 'Trust nothing you did not verify.'],
      doorPrompt: 'You know where they are.\nBlock them — or bait them.',
      doorChoices: [
        { label: '[ BLOCK ATTACKER ]', stance: 'shutdown', response: 'Predictable.\nThey expected that.' },
        { label: '[ SET A TRAP ]', stance: 'listen', response: 'Clever.\nSector 6 tests people, not systems.' },
      ],
      completeQuote: '"You found them in the wire."',
    },
    {
      id: 6,
      label: 'HUMAN',
      title: 'HUMAN FIREWALL',
      tagline: "The weakest link isn't technology.",
      bossFlag: 'ch6BossComplete',
      nextId: 7,
      palette: { void: 0x080608, wall: 0x181018, edge: 0xff66cc, floor: 0x140c14, floorAlt: 0x100810, a: 0xaa4488, b: 0xcc66aa, c: 0x883366 },
      graffiti: ['PEOPLE BREAK', '581 TRUSTED SOMEONE', 'VERIFY HUMANS'],
      terminals: { pc: 'VISHING', archive: 'INSIDER', server: 'PHYSSEC' },
      missions: [
        { flag: 's6SocialComplete', terminal: 'pc', puzzleId: 's6_social', unlockFlag: 'justUnlockedS6Insider', requires: null },
        { flag: 's6InsiderComplete', terminal: 'archive', puzzleId: 's6_insider', unlockFlag: 'justUnlockedS6Physical', requires: 's6SocialComplete' },
        { flag: 's6PhysicalComplete', terminal: 'server', puzzleId: 's6_physical', requires: 's6InsiderComplete' },
      ],
      intro: ['Sector 6.', 'Human Firewall.', 'Vishing. Insiders. Tailgaters.', 'Verify humans like you verify systems.'],
      doorPrompt: 'The mole is exposed.\nContain them — or learn who they work for.',
      doorChoices: [
        { label: '[ CONTAIN INSIDER ]', stance: 'shutdown', response: 'Clean.\nFor a moment.' },
        { label: '[ INTERROGATE QUIETLY ]', stance: 'listen', response: 'Then you will understand\nwhy Sector 7 is burning.' },
      ],
      completeQuote: '"The human factor — contained."',
    },
    {
      id: 7,
      label: 'ALERT',
      title: 'RED ALERT',
      tagline: 'The attack escalates.',
      bossFlag: 'ch7BossComplete',
      nextId: 'core',
      palette: { void: 0x0a0404, wall: 0x201010, edge: 0xff4422, floor: 0x180c0c, floorAlt: 0x140808, a: 0xcc3322, b: 0xff5544, c: 0x992211 },
      graffiti: ['ESCALATION', '581 NEVER MADE IT HERE', 'SEGMENT NOW'],
      terminals: { pc: 'MALWARE', archive: 'LATERAL', server: 'INCIDENT' },
      missions: [
        { flag: 's7MalwareComplete', terminal: 'pc', puzzleId: 's7_malware', unlockFlag: 'justUnlockedS7Lateral', requires: null },
        { flag: 's7LateralComplete', terminal: 'archive', puzzleId: 's7_lateral', unlockFlag: 'justUnlockedS7Incident', requires: 's7MalwareComplete' },
        { flag: 's7IncidentComplete', terminal: 'server', puzzleId: 's7_incident', requires: 's7LateralComplete' },
      ],
      intro: ['Sector 7.', 'Red Alert.', 'Malware detonates east-west.', 'Execute IR before total compromise.'],
      doorPrompt: 'The network is segmenting.\nLock down — or push to the CORE.',
      doorChoices: [
        { label: '[ SEGMENT NETWORK ]', stance: 'shutdown', response: 'Contained.\nThe CORE awaits.' },
        { label: '[ PUSH TO CORE ]', stance: 'listen', response: 'Brave.\nThat is where CHIMERA lives.' },
      ],
      completeQuote: '"Total compromise — prevented."',
    },
    {
      id: 'core',
      label: 'CORE',
      title: 'OPERATION CHIMERA',
      tagline: 'Project Chimera ends here.',
      bossFlag: 'coreComplete',
      nextId: null,
      isCore: true,
      palette: { void: 0x020204, wall: 0x0a0818, edge: 0xff0088, floor: 0x0c0814, floorAlt: 0x080610, a: 0xaa2288, b: 0xff44aa, c: 0x662266 },
      graffiti: ['581 WAS RIGHT', 'DO NOT ANSWER', '1998'],
      terminals: { pc: 'BACKUP', archive: 'DECRYPT', server: 'MAINFRAME' },
      missions: [
        { flag: 'coreBackupComplete', terminal: 'pc', puzzleId: 'core_backup', unlockFlag: 'justUnlockedCoreDecrypt', requires: null },
        { flag: 'coreDecryptComplete', terminal: 'archive', puzzleId: 'core_decrypt', unlockFlag: 'justUnlockedCoreMainframe', requires: 'coreBackupComplete' },
        { flag: 'coreMainframeComplete', terminal: 'server', puzzleId: 'core_mainframe', requires: 'coreDecryptComplete' },
      ],
      intro: ['THE CORE.', 'All threads converge.', '581 tried to warn you.', 'End Project CHIMERA.'],
      doorPrompt: 'This is the end.\nShut CHIMERA down — or hear the truth.',
      doorChoices: [
        { label: '[ SHUT DOWN CHIMERA ]', stance: 'shutdown', response: 'Predictable.\nThey trained you well.\nBut you always come back, 1998.' },
        { label: '[ HEAR THE TRUTH ]', stance: 'listen', response: 'Then you know\nwhy 581 disappeared.' },
      ],
      completeQuote: '"Project CHIMERA — ended."',
    },
  ];

  const PUZZLES = {
    s3_cipher: {
      title: 'SECTOR 3 — CIPHER LAB', prompt: 'Caesar cipher shift −3: "WRS VHFUHAW" decodes to?',
      options: [
        { id: 'a', text: 'TOP SECRET', correct: true },
        { id: 'b', text: 'RUN FAST', correct: false },
        { id: 'c', text: 'HELP ME', correct: false },
        { id: 'd', text: 'LOCK OUT', correct: false },
      ],
      flag: 's3CipherComplete', unlockFlag: 'justUnlockedS3Stego', roomId: 'cipher',
      failMsg: 'Wrong shift — the message stays hidden.', bg: 0x0c1810, stroke: 0x44ff88,
    },
    s3_stego: {
      title: 'SECTOR 3 — STEGANOGRAPHY', prompt: 'Hidden text found in image metadata. Most likely payload?',
      options: [
        { id: 'a', text: 'Company picnic schedule', correct: false },
        { id: 'b', text: 'EXFIL: DEPLOY RANSOMWARE 0600', correct: true },
        { id: 'c', text: 'Happy birthday message', correct: false },
        { id: 'd', text: 'Printer maintenance log', correct: false },
      ],
      flag: 's3StegoComplete', unlockFlag: 'justUnlockedS3DeadDrop', roomId: 'steganography',
      failMsg: 'That is noise — look for command language.', bg: 0x0c1810, stroke: 0x44aa66,
    },
    s3_dead_drop: {
      title: 'SECTOR 3 — DNS DEAD DROP', prompt: 'Which DNS query pattern indicates a dead-drop C2 channel?',
      options: [
        { id: 'a', text: 'Normal A records to CDN', correct: false },
        { id: 'b', text: 'Long random subdomains to same external IP every 60s', correct: true },
        { id: 'c', text: 'MX record for mail server', correct: false },
        { id: 'd', text: 'PTR lookup for printer', correct: false },
      ],
      flag: 's3DeadDropComplete', roomId: 'dead_drop',
      failMsg: 'Beaconing uses DNS tunneling — try again.', bg: 0x081410, stroke: 0x336644,
    },
    s4_sql: {
      title: 'SECTOR 4 — SQL INJECTION', prompt: 'Best fix for a vulnerable login query?',
      options: [
        { id: 'a', text: 'Add input length validation only', correct: false },
        { id: 'b', text: 'Use parameterized queries with bound parameters', correct: true },
        { id: 'c', text: 'Escape HTML in the input', correct: false },
        { id: 'd', text: 'Block quotes in usernames', correct: false },
      ],
      flag: 's4SqlComplete', unlockFlag: 'justUnlockedS4Db', roomId: 'sql',
      failMsg: 'Parameterization stops injection at the source.', bg: 0x140c10, stroke: 0xff6644,
    },
    s4_db: {
      title: 'SECTOR 4 — DB FORENSICS', prompt: 'Which export job indicates active data theft?',
      options: [
        { id: 'a', text: 'EXP-4412 — jsmith (12 records)', correct: false },
        { id: 'b', text: 'EXP-4419 — svc-backup (52,840 records to external IP)', correct: true },
        { id: 'c', text: 'EXP-4420 — mwilson (3 records)', correct: false },
        { id: 'd', text: 'EXP-4421 — etl-nightly (8,200 records)', correct: false },
      ],
      flag: 's4DbComplete', unlockFlag: 'justUnlockedS4Api', roomId: 'db_forensics',
      failMsg: 'Volume + external destination = exfiltration.', bg: 0x140c10, stroke: 0xcc5544,
    },
    s4_api: {
      title: 'SECTOR 4 — API BREACH', prompt: 'API key found in public GitHub. First response?',
      options: [
        { id: 'a', text: 'Delete the repo and hope nobody noticed', correct: false },
        { id: 'b', text: 'Revoke key immediately, rotate, audit access logs', correct: true },
        { id: 'c', text: 'Change the key prefix only', correct: false },
        { id: 'd', text: 'Wait for the next sprint', correct: false },
      ],
      flag: 's4ApiComplete', roomId: 'api_breach',
      failMsg: 'Assume compromise — revoke and rotate now.', bg: 0x100810, stroke: 0x883322,
    },
    s5_logs: {
      title: 'SECTOR 5 — LOG ANALYSIS', prompt: 'Which IP shows brute-force attack behavior?',
      options: [
        { id: 'a', text: '192.168.1.45 (single success, NYC)', correct: false },
        { id: 'b', text: '203.45.67.89 (rapid admin/root failures, Unknown RU)', correct: true },
        { id: 'c', text: '10.0.0.12 (remote CA)', correct: false },
        { id: 'd', text: '172.16.0.5 (single fail)', correct: false },
      ],
      flag: 's5LogsComplete', unlockFlag: 'justUnlockedS5Siem', roomId: 'logs',
      failMsg: 'Look for rapid failed auth from one external IP.', bg: 0x0a1218, stroke: 0x44aaff,
    },
    s5_siem: {
      title: 'SECTOR 5 — SIEM CORRELATION', prompt: 'Which alert chain indicates a real attack?',
      options: [
        { id: 'a', text: 'Single failed login', correct: false },
        { id: 'b', text: 'Brute force → impossible travel → large outbound transfer', correct: true },
        { id: 'c', text: 'Printer offline Floor 3', correct: false },
        { id: 'd', text: 'Password expiry reminder', correct: false },
      ],
      flag: 's5SiemComplete', unlockFlag: 'justUnlockedS5Network', roomId: 'siem',
      failMsg: 'Correlate auth, geo, and exfil alerts.', bg: 0x0a1218, stroke: 0x4488cc,
    },
    s5_network: {
      title: 'SECTOR 5 — NETFLOW', prompt: 'Which traffic pattern is C2 beaconing?',
      options: [
        { id: 'a', text: 'Steady HTTPS to known CDN', correct: false },
        { id: 'b', text: 'Small periodic outbound packets to unknown IP every 60s', correct: true },
        { id: 'c', text: 'Large video stream to YouTube', correct: false },
        { id: 'd', text: 'Internal DNS to domain controller', correct: false },
      ],
      flag: 's5NetworkComplete', roomId: 'network',
      failMsg: 'Beaconing is small, regular, and external.', bg: 0x080e14, stroke: 0x224466,
    },
    s6_social: {
      title: 'SECTOR 6 — VISHING', prompt: 'Caller claims urgent IT support. Safest response?',
      options: [
        { id: 'a', text: 'Give password for faster help', correct: false },
        { id: 'b', text: 'Hang up — call IT via official number on company site', correct: true },
        { id: 'c', text: 'Share MFA code instead', correct: false },
        { id: 'd', text: 'Click link they email you', correct: false },
      ],
      flag: 's6SocialComplete', unlockFlag: 'justUnlockedS6Insider', roomId: 'social',
      failMsg: 'Verify identity out-of-band — never share secrets.', bg: 0x140c14, stroke: 0xff66cc,
    },
    s6_insider: {
      title: 'SECTOR 6 — INSIDER THREAT', prompt: 'Who shows suspicious exfiltration behavior?',
      options: [
        { id: 'a', text: 'Alice Chen — normal activity', correct: false },
        { id: 'b', text: 'Bob Martinez — 2.4 GB at 3 AM with USB', correct: true },
        { id: 'c', text: 'Carol Reed — on vacation', correct: false },
        { id: 'd', text: 'Dave Park — lunch browsing', correct: false },
      ],
      flag: 's6InsiderComplete', unlockFlag: 'justUnlockedS6Physical', roomId: 'insider',
      failMsg: 'Off-hours bulk transfer to removable media.', bg: 0x140c14, stroke: 0xcc66aa,
    },
    s6_physical: {
      title: 'SECTOR 6 — PHYSICAL SEC', prompt: 'Unknown person tailgates you at the lobby. Response?',
      options: [
        { id: 'a', text: 'Hold the door — be polite', correct: false },
        { id: 'b', text: 'Stop them — alert security, do not allow unbadged entry', correct: true },
        { id: 'c', text: 'Ignore it — not your job', correct: false },
        { id: 'd', text: 'Plug in the USB they dropped', correct: false },
      ],
      flag: 's6PhysicalComplete', roomId: 'physical',
      failMsg: 'Tailgating bypasses every digital control.', bg: 0x100810, stroke: 0x883366,
    },
    s7_malware: {
      title: 'SECTOR 7 — MALWARE LAB', prompt: 'Sandbox shows encryption + lateral spread. Classification?',
      options: [
        { id: 'a', text: 'Benign adware', correct: false },
        { id: 'b', text: 'Ransomware with worm-like propagation', correct: true },
        { id: 'c', text: 'Browser cookie tracker', correct: false },
        { id: 'd', text: 'Font installer', correct: false },
      ],
      flag: 's7MalwareComplete', unlockFlag: 'justUnlockedS7Lateral', roomId: 'malware',
      failMsg: 'Encryption + spread = ransomware worm.', bg: 0x180c0c, stroke: 0xff4422,
    },
    s7_lateral: {
      title: 'SECTOR 7 — LATERAL MOVEMENT', prompt: 'Which activity indicates credential dumping?',
      options: [
        { id: 'a', text: 'Normal user reading email', correct: false },
        { id: 'b', text: 'PsExec + LSASS memory access from compromised host', correct: true },
        { id: 'c', text: 'Scheduled Windows Update', correct: false },
        { id: 'd', text: 'VPN login from employee laptop', correct: false },
      ],
      flag: 's7LateralComplete', unlockFlag: 'justUnlockedS7Incident', roomId: 'lateral',
      failMsg: 'PsExec + LSASS = classic lateral attack.', bg: 0x180c0c, stroke: 0xff5544,
    },
    s7_incident: {
      title: 'SECTOR 7 — INCIDENT RESPONSE', prompt: 'First step in active ransomware IR playbook?',
      options: [
        { id: 'a', text: 'Pay the ransom immediately', correct: false },
        { id: 'b', text: 'Isolate affected systems from the network', correct: true },
        { id: 'c', text: 'Reboot everything and hope', correct: false },
        { id: 'd', text: 'Download decryptor from popup', correct: false },
      ],
      flag: 's7IncidentComplete', roomId: 'incident',
      failMsg: 'Contain first — then investigate.', bg: 0x140808, stroke: 0x992211,
    },
    core_backup: {
      title: 'CORE — BACKUP VAULT', prompt: 'Which backup is safe to restore? (Ransomware hit June 4)',
      options: [
        { id: 'a', text: 'backup_2024-05-28', correct: false },
        { id: 'b', text: 'backup_2024-06-01 (pre-infection)', correct: true },
        { id: 'c', text: 'backup_2024-06-04', correct: false },
        { id: 'd', text: 'backup_2024-06-05', correct: false },
      ],
      flag: 'coreBackupComplete', unlockFlag: 'justUnlockedCoreDecrypt', roomId: 'backup',
      failMsg: 'Restore from last known-clean snapshot.', bg: 0x0c0814, stroke: 0xff0088,
    },
    core_decrypt: {
      title: 'CORE — RECOVERY', prompt: 'Ransom note demands Bitcoin. Correct response?',
      options: [
        { id: 'a', text: 'Pay immediately', correct: false },
        { id: 'b', text: 'Isolate, restore clean backup, report — never pay', correct: true },
        { id: 'c', text: 'Restart and ignore', correct: false },
        { id: 'd', text: 'Download popup decryptor', correct: false },
      ],
      flag: 'coreDecryptComplete', unlockFlag: 'justUnlockedCoreMainframe', roomId: 'decryption',
      failMsg: 'Paying funds criminals — restore from backup.', bg: 0x0c0814, stroke: 0xff44aa,
    },
    core_mainframe: {
      title: 'CORE — MAINFRAME', prompt: 'Unauthorized jobs on legacy mainframe. Priority action?',
      options: [
        { id: 'a', text: 'Let jobs finish — downtime is costly', correct: false },
        { id: 'b', text: 'Halt unauthorized jobs, preserve logs, fail-safe', correct: true },
        { id: 'c', text: 'Email the attacker', correct: false },
        { id: 'd', text: 'Delete all logs to save space', correct: false },
      ],
      flag: 'coreMainframeComplete', roomId: 'mainframe',
      failMsg: 'Stop unauthorized jobs — preserve evidence.', bg: 0x080610, stroke: 0x662266,
    },
  };

  function normalizeId(id) {
    return id === 'core' ? 'core' : Number(id);
  }

  function get(id) {
    const nid = normalizeId(id);
    return SECTORS.find((s) => s.id === nid) || SECTORS[0];
  }

  function getNumericId(id) {
    return id === 'core' ? 8 : Number(id);
  }

  function bossFlagFor(id) {
    return get(id).bossFlag;
  }

  function isBossComplete(p, id) {
    return !!p[get(id).bossFlag];
  }

  function isSectorUnlocked(p, id) {
    const nid = normalizeId(id);
    if (nid === 1) return true;
    if (nid === 'core') return isBossComplete(p, 7);
    const prev = get(nid - 1);
    return isBossComplete(p, prev.id);
  }

  function resolveFacilitySector(p) {
    if (!isBossComplete(p, 1)) return 1;
    if (!isBossComplete(p, 2)) return 2;
    if (!isBossComplete(p, 3)) return 3;
    if (!isBossComplete(p, 4)) return 4;
    if (!isBossComplete(p, 5)) return 5;
    if (!isBossComplete(p, 6)) return 6;
    if (!isBossComplete(p, 7)) return 7;
    return 'core';
  }

  function missionComplete(p, mission) {
    return !!p[mission.flag];
  }

  function allMissionsComplete(p, sectorId) {
    const sec = get(sectorId);
    return sec.missions.every((m) => missionComplete(p, m));
  }

  function getActiveMission(p, sectorId) {
    const sec = get(sectorId);
    for (const m of sec.missions) {
      if (!missionComplete(p, m)) return m;
    }
    return null;
  }

  function getMissionByTerminal(sectorId, terminal) {
    return get(sectorId).missions.find((m) => m.terminal === terminal);
  }

  function getPuzzle(puzzleId) {
    return PUZZLES[puzzleId] || null;
  }

  function sectorLabels() {
    return SECTORS.map((s) => ({ n: s.isCore ? null : s.id, core: !!s.isCore, label: s.label }));
  }

  function missionLabels(sectorId) {
    const sec = get(sectorId);
    const names = {
      pc: sec.terminals?.pc || 'TERMINAL A',
      archive: sec.terminals?.archive || 'TERMINAL B',
      server: sec.terminals?.server || 'TERMINAL C',
    };
    return sec.missions.map((m, i) => ({
      label: names[m.terminal] || `Mission ${i + 1}`,
      flag: m.flag,
    }));
  }

  window.FacilitySectors = {
    SECTORS,
    PUZZLES,
    get,
    getNumericId,
    bossFlagFor,
    isBossComplete,
    isSectorUnlocked,
    resolveFacilitySector,
    missionComplete,
    allMissionsComplete,
    getActiveMission,
    getMissionByTerminal,
    getPuzzle,
    sectorLabels,
    missionLabels,
  };
})();
