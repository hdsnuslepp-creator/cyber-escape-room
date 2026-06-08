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
      ruleOfThree: true,
      terminals: { pc: 'LOGIN', archive: 'ARCHIVE' },
      missions: [
        { flag: 'inboxComplete', terminal: 'pc', scene: 'PhishingScene', usePanel: 'initialize' },
        {
          flag: 'attachmentComplete',
          terminal: 'archive',
          panelTitle: 'SANDBOX NODE 02',
          panelSub: 'Attachment quarantine — analyze payload',
          scene: 'AttachmentScene',
          requires: 'inboxComplete',
        },
        {
          flag: 'fakeLoginComplete',
          terminal: 'pc',
          panelTitle: 'WEB SHIELD NODE 01',
          panelSub: 'Authentication gateway compromised',
          scene: 'FakeLoginScene',
          requires: 'attachmentComplete',
        },
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
        { flag: 's2PasswordComplete', terminal: 'pc', panelTitle: 'VAULT NODE 03', panelSub: 'Credential rotation required', scene: 'PasswordScene' },
        { flag: 's2MfaComplete', terminal: 'archive', panelTitle: 'AUTH NODE 04', panelSub: 'Verification channel under attack', scene: 'MFAScene', requires: 's2PasswordComplete' },
        { flag: 's2CredentialComplete', terminal: 'server', panelTitle: 'AUDIT NODE 05', panelSub: 'Shared credentials detected on network', scene: 'CredentialScene', requires: 's2MfaComplete' },
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
      nodeTitle: 'CIPHER NODE 07',
      status: 'ENCRYPTED RELAY TRAFFIC',
      briefing: 'Intercept captured from internal relay B-14.\nAttacker used Caesar rotation on command payload.',
      instruction: 'DECRYPT TRANSMISSION — APPLY ROTATION',
      feed: 'IN  >> WRS VHFUHAW\nKEY >> ROT-3 [BRUTE FORCING]',
      options: [
        { id: 'a', text: 'OUT >> TOP SECRET', correct: true },
        { id: 'b', text: 'OUT >> RUN FAST', correct: false },
        { id: 'c', text: 'OUT >> HELP ME', correct: false },
        { id: 'd', text: 'OUT >> LOCK OUT', correct: false },
      ],
      flag: 's3CipherComplete', unlockFlag: 'justUnlockedS3Stego', roomId: 'cipher',
      failMsg: '>> DECRYPT FAILED — wrong rotation key.', bg: 0x0c1810, stroke: 0x44ff88,
    },
    s3_stego: {
      nodeTitle: 'STEGO NODE 08',
      status: 'HIDDEN PAYLOAD IN IMAGE METADATA',
      briefing: 'Employee wallpaper file flagged by DLP.\nExtracted EXIF comment contains command language.',
      instruction: 'IDENTIFY MALICIOUS PAYLOAD',
      feed: 'FILE >> team_photo.jpg\nMETA >> Comment field [REDACTED]',
      options: [
        { id: 'a', text: 'PAYLOAD: company picnic schedule', correct: false },
        { id: 'b', text: 'PAYLOAD: EXFIL DEPLOY RANSOMWARE 0600', correct: true },
        { id: 'c', text: 'PAYLOAD: happy birthday message', correct: false },
        { id: 'd', text: 'PAYLOAD: printer maintenance log', correct: false },
      ],
      flag: 's3StegoComplete', unlockFlag: 'justUnlockedS3DeadDrop', roomId: 'steganography',
      failMsg: '>> NO THREAT — that is benign noise.', bg: 0x0c1810, stroke: 0x44aa66,
    },
    s3_dead_drop: {
      nodeTitle: 'DNS NODE 09',
      status: 'SUSPICIOUS QUERY PATTERN',
      briefing: 'Netflow shows periodic DNS lookups to unknown resolver.\nPossible dead-drop C2 channel on internal host.',
      instruction: 'FLAG BEACONING PATTERN',
      feed: 'HOST >> ws-441.internal\nQUERIES >> 847 in 24h to ext resolver',
      options: [
        { id: 'a', text: 'PTR  normal CDN A-records', correct: false },
        { id: 'b', text: 'TXT  random subdomains → same IP every 60s', correct: true },
        { id: 'c', text: 'MX   mail server lookup', correct: false },
        { id: 'd', text: 'PTR  printer reverse lookup', correct: false },
      ],
      flag: 's3DeadDropComplete', roomId: 'dead_drop',
      failMsg: '>> TUNNEL MISSED — beacon still active.', bg: 0x081410, stroke: 0x336644,
    },
    s4_sql: {
      nodeTitle: 'SQL NODE 10',
      status: 'INJECTION FOOTHOLD ON LOGIN FORM',
      briefing: 'Web app auth query concatenates user input.\nAttacker payload: admin\' OR 1=1--',
      instruction: 'DEPLOY PATCH TO QUERY HANDLER',
      feed: 'APP  >> portal.acme/login\nVULN >> string concat in WHERE clause',
      options: [
        { id: 'a', text: 'PATCH: input length validation only', correct: false },
        { id: 'b', text: 'PATCH: parameterized queries + bound params', correct: true },
        { id: 'c', text: 'PATCH: HTML escape on input', correct: false },
        { id: 'd', text: 'PATCH: block quotes in username', correct: false },
      ],
      flag: 's4SqlComplete', unlockFlag: 'justUnlockedS4Db', roomId: 'sql',
      failMsg: '>> INJECTION STILL OPEN — parameterize the query.', bg: 0x140c10, stroke: 0xff6644,
    },
    s4_db: {
      nodeTitle: 'FORENSICS NODE 11',
      status: 'ACTIVE EXPORT JOBS DETECTED',
      briefing: 'Database audit log shows bulk export tasks running.\nOne job is routing records to external IP.',
      instruction: 'TERMINATE EXFILTRATION JOB',
      feed: 'JOBS >> 4 active exports\nALERT >> svc-backup destination unknown',
      options: [
        { id: 'a', text: 'KILL EXP-4412  jsmith        12 rec', correct: false },
        { id: 'b', text: 'KILL EXP-4419  svc-backup    52840 rec → ext', correct: true },
        { id: 'c', text: 'KILL EXP-4420  mwilson       3 rec', correct: false },
        { id: 'd', text: 'KILL EXP-4421  etl-nightly   8200 rec', correct: false },
      ],
      flag: 's4DbComplete', unlockFlag: 'justUnlockedS4Api', roomId: 'db_forensics',
      failMsg: '>> WRONG JOB — exfil still running.', bg: 0x140c10, stroke: 0xcc5544,
    },
    s4_api: {
      nodeTitle: 'API NODE 12',
      status: 'EXPOSED KEY IN PUBLIC REPO',
      briefing: 'GitHub scan found production API key in commit history.\nAssume active compromise — rotate immediately.',
      instruction: 'EXECUTE KEY REVOCATION PROTOCOL',
      feed: 'REPO >> acme/backend-public\nKEY  >> sk_live_**** [EXPOSED 6h ago]',
      options: [
        { id: 'a', text: 'ACT: delete repo — no audit', correct: false },
        { id: 'b', text: 'ACT: revoke + rotate + audit access logs', correct: true },
        { id: 'c', text: 'ACT: rename key prefix only', correct: false },
        { id: 'd', text: 'ACT: defer to next sprint', correct: false },
      ],
      flag: 's4ApiComplete', roomId: 'api_breach',
      failMsg: '>> KEY STILL VALID — revoke and rotate now.', bg: 0x100810, stroke: 0x883322,
    },
    s5_logs: {
      nodeTitle: 'LOG NODE 13',
      status: 'BRUTE-FORCE SIGNATURE DETECTED',
      briefing: 'Auth log spike on admin portal.\nMultiple failed root attempts from single external source.',
      instruction: 'BLOCK ATTACKING SOURCE',
      feed: 'WINDOW >> last 15 min\nFAILS  >> 847 admin/root attempts',
      options: [
        { id: 'a', text: 'SRC 192.168.1.45   1 fail   NYC', correct: false },
        { id: 'b', text: 'SRC 203.45.67.89   847 fail RU', correct: true },
        { id: 'c', text: 'SRC 10.0.0.12      1 ok     CA', correct: false },
        { id: 'd', text: 'SRC 172.16.0.5     1 fail   local', correct: false },
      ],
      flag: 's5LogsComplete', unlockFlag: 'justUnlockedS5Siem', roomId: 'logs',
      failMsg: '>> WRONG IP — brute force continues.', bg: 0x0a1218, stroke: 0x44aaff,
    },
    s5_siem: {
      nodeTitle: 'SIEM NODE 14',
      status: 'CORRELATED ALERT CHAIN',
      briefing: 'Three alerts fired in sequence within 12 minutes.\nDetermine if this is a live attack chain.',
      instruction: 'CONFIRM ATTACK SEQUENCE',
      feed: 'T+0  brute force on VPN\nT+4  impossible travel login\nT+11 large outbound transfer',
      options: [
        { id: 'a', text: 'CHAIN: single failed login — ignore', correct: false },
        { id: 'b', text: 'CHAIN: brute → travel → exfil — ACTIVE', correct: true },
        { id: 'c', text: 'CHAIN: printer offline floor 3', correct: false },
        { id: 'd', text: 'CHAIN: password expiry reminder', correct: false },
      ],
      flag: 's5SiemComplete', unlockFlag: 'justUnlockedS5Network', roomId: 'siem',
      failMsg: '>> FALSE NEGATIVE — attack chain missed.', bg: 0x0a1218, stroke: 0x4488cc,
    },
    s5_network: {
      nodeTitle: 'NETFLOW NODE 15',
      status: 'BEACON TRAFFIC ON VLAN 7',
      briefing: 'Netflow analyzer flagged periodic outbound packets.\nSmall payload, fixed interval, unknown destination.',
      instruction: 'IDENTIFY C2 BEACON',
      feed: 'HOST >> ws-finance-03\nPATTERN >> 64B every 60s to 198.51.100.44',
      options: [
        { id: 'a', text: 'FLOW steady HTTPS to known CDN', correct: false },
        { id: 'b', text: 'FLOW 64B periodic to unknown IP', correct: true },
        { id: 'c', text: 'FLOW large stream to video CDN', correct: false },
        { id: 'd', text: 'FLOW internal DNS to DC', correct: false },
      ],
      flag: 's5NetworkComplete', roomId: 'network',
      failMsg: '>> BEACON ACTIVE — wrong traffic pattern.', bg: 0x080e14, stroke: 0x224466,
    },
    s6_social: {
      nodeTitle: 'VISHING NODE 16',
      status: 'INBOUND CALL — SPOOFED IT SUPPORT',
      briefing: 'Caller demanding immediate password reset.\nCallback number does not match IT directory.',
      instruction: 'EXECUTE VISHING RESPONSE',
      feed: 'CALLER >> "IT Support" ext. 4499\nREQUEST >> password + MFA over phone',
      options: [
        { id: 'a', text: 'ACK  provide password for speed', correct: false },
        { id: 'b', text: 'DENY  hang up — call IT via official site', correct: true },
        { id: 'c', text: 'ACK  read MFA code to verify', correct: false },
        { id: 'd', text: 'ACK  open link caller will email', correct: false },
      ],
      flag: 's6SocialComplete', unlockFlag: 'justUnlockedS6Insider', roomId: 'social',
      failMsg: '>> SOCIAL ENGINEERED — verify out-of-band.', bg: 0x140c14, stroke: 0xff66cc,
    },
    s6_insider: {
      nodeTitle: 'INSIDER NODE 17',
      status: 'ANOMALOUS DATA TRANSFER',
      briefing: 'DLP flagged off-hours bulk copy to removable media.\nReview user activity logs for exfiltration.',
      instruction: 'FLAG SUSPICIOUS SUBJECT',
      feed: 'SCAN >> 4 users active 03:00–04:00\nTHRESH >> 500MB+ to USB',
      options: [
        { id: 'a', text: 'USER Alice Chen    normal activity', correct: false },
        { id: 'b', text: 'USER Bob Martinez  2.4GB @ 03:14 USB', correct: true },
        { id: 'c', text: 'USER Carol Reed    on vacation', correct: false },
        { id: 'd', text: 'USER Dave Park     lunch browsing', correct: false },
      ],
      flag: 's6InsiderComplete', unlockFlag: 'justUnlockedS6Physical', roomId: 'insider',
      failMsg: '>> WRONG SUBJECT — exfil continues.', bg: 0x140c14, stroke: 0xcc66aa,
    },
    s6_physical: {
      nodeTitle: 'PHYSSEC NODE 18',
      status: 'TAILGATE EVENT — LOBBY CAM 2',
      briefing: 'Unbadged individual entered behind authorized employee.\nPhysical breach bypasses all digital controls.',
      instruction: 'EXECUTE PHYSICAL RESPONSE',
      feed: 'CAM  >> lobby-east 14:22\nEVENT >> door held — no badge scan',
      options: [
        { id: 'a', text: 'RESP hold door — be polite', correct: false },
        { id: 'b', text: 'RESP stop entry — alert security', correct: true },
        { id: 'c', text: 'RESP ignore — not my sector', correct: false },
        { id: 'd', text: 'RESP plug in dropped USB', correct: false },
      ],
      flag: 's6PhysicalComplete', roomId: 'physical',
      failMsg: '>> PHYSICAL BREACH — tailgater inside.', bg: 0x100810, stroke: 0x883366,
    },
    s7_malware: {
      nodeTitle: 'SANDBOX NODE 19',
      status: 'DETONATION COMPLETE — SAMPLE 7A',
      briefing: 'Sandbox report: file encryption routines + network spread.\nClassify sample before releasing host.',
      instruction: 'CLASSIFY MALWARE FAMILY',
      feed: 'BEHAV >> encrypt /tmp + spread via SMB\nORIGIN >> email attachment invoice.pdf.exe',
      options: [
        { id: 'a', text: 'TYPE benign adware', correct: false },
        { id: 'b', text: 'TYPE ransomware worm propagation', correct: true },
        { id: 'c', text: 'TYPE browser cookie tracker', correct: false },
        { id: 'd', text: 'TYPE font installer', correct: false },
      ],
      flag: 's7MalwareComplete', unlockFlag: 'justUnlockedS7Lateral', roomId: 'malware',
      failMsg: '>> MISCLASSIFIED — host still at risk.', bg: 0x180c0c, stroke: 0xff4422,
    },
    s7_lateral: {
      nodeTitle: 'LATERAL NODE 20',
      status: 'DOMAIN CONTROLLER ACCESS ATTEMPT',
      briefing: 'AD monitor shows remote execution from compromised workstation.\nMemory access on LSASS process detected.',
      instruction: 'IDENTIFY LATERAL ATTACK',
      feed: 'SRC  >> ws-441.finance\nDST  >> dc01.corp\nTOOL >> PsExec + LSASS dump',
      options: [
        { id: 'a', text: 'ACT normal user reading email', correct: false },
        { id: 'b', text: 'ACT PsExec + LSASS from compromised host', correct: true },
        { id: 'c', text: 'ACT scheduled Windows Update', correct: false },
        { id: 'd', text: 'ACT VPN login employee laptop', correct: false },
      ],
      flag: 's7LateralComplete', unlockFlag: 'justUnlockedS7Incident', roomId: 'lateral',
      failMsg: '>> LATERAL MOVE UNDETECTED — credentials at risk.', bg: 0x180c0c, stroke: 0xff5544,
    },
    s7_incident: {
      nodeTitle: 'IR NODE 21',
      status: 'ACTIVE RANSOMWARE — FILE SERVER 2',
      briefing: 'Encryption spreading on VLAN 4.\nIR playbook loaded — execute first containment step.',
      instruction: 'EXECUTE IR PLAYBOOK STEP 1',
      feed: 'ALERT >> 847 files encrypted in 4 min\nHOSTS >> fs-02, ws-118, ws-203',
      options: [
        { id: 'a', text: 'STEP pay ransom immediately', correct: false },
        { id: 'b', text: 'STEP isolate affected segment from network', correct: true },
        { id: 'c', text: 'STEP reboot all hosts', correct: false },
        { id: 'd', text: 'STEP download popup decryptor', correct: false },
      ],
      flag: 's7IncidentComplete', roomId: 'incident',
      failMsg: '>> CONTAIN FIRST — spread continues.', bg: 0x140808, stroke: 0x992211,
    },
    core_backup: {
      nodeTitle: 'BACKUP VAULT',
      status: 'RANSOMWARE EVENT — JUNE 4',
      briefing: 'Recovery team needs clean restore point.\nInfection timeline confirmed — select pre-infection snapshot.',
      instruction: 'MOUNT RESTORE SNAPSHOT',
      feed: 'INFECT >> 2024-06-04 02:17\nVAULT >> 4 snapshots available',
      options: [
        { id: 'a', text: 'SNAP backup_2024-05-28', correct: false },
        { id: 'b', text: 'SNAP backup_2024-06-01 pre-infection', correct: true },
        { id: 'c', text: 'SNAP backup_2024-06-04', correct: false },
        { id: 'd', text: 'SNAP backup_2024-06-05', correct: false },
      ],
      flag: 'coreBackupComplete', unlockFlag: 'justUnlockedCoreDecrypt', roomId: 'backup',
      failMsg: '>> SNAPSHOT INFECTED — select pre-infection point.', bg: 0x0c0814, stroke: 0xff0088,
    },
    core_decrypt: {
      nodeTitle: 'RECOVERY NODE',
      status: 'RANSOM DEMAND RECEIVED',
      briefing: 'Bitcoin wallet address in ransom note.\nFacility recovery protocol overrides payment request.',
      instruction: 'EXECUTE RECOVERY PROTOCOL',
      feed: 'NOTE >> "Pay 50 BTC within 72h"\nWALLET >> bc1q**** [UNVERIFIED]',
      options: [
        { id: 'a', text: 'PROTO pay immediately', correct: false },
        { id: 'b', text: 'PROTO isolate + restore clean backup + report', correct: true },
        { id: 'c', text: 'PROTO restart and ignore', correct: false },
        { id: 'd', text: 'PROTO download popup decryptor', correct: false },
      ],
      flag: 'coreDecryptComplete', unlockFlag: 'justUnlockedCoreMainframe', roomId: 'decryption',
      failMsg: '>> PAYMENT DENIED — restore from backup.', bg: 0x0c0814, stroke: 0xff44aa,
    },
    core_mainframe: {
      nodeTitle: 'MAINFRAME CORE',
      status: 'UNAUTHORIZED BATCH JOBS RUNNING',
      briefing: 'Legacy mainframe queue shows jobs submitted from guest account.\nHalt unauthorized execution — preserve logs.',
      instruction: 'HALT UNAUTHORIZED JOBS',
      feed: 'QUEUE >> 3 active jobs\nSUBMIT >> guest@legacy [ELEVATED?]',
      options: [
        { id: 'a', text: 'ACT let jobs finish — avoid downtime', correct: false },
        { id: 'b', text: 'ACT halt jobs + preserve logs + fail-safe', correct: true },
        { id: 'c', text: 'ACT email the attacker', correct: false },
        { id: 'd', text: 'ACT delete all logs', correct: false },
      ],
      flag: 'coreMainframeComplete', roomId: 'mainframe',
      failMsg: '>> JOBS STILL RUNNING — halt and preserve evidence.', bg: 0x080610, stroke: 0x662266,
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

  function getMissionByTerminal(sectorId, terminal, p) {
    const list = get(sectorId).missions.filter((m) => m.terminal === terminal);
    if (p) {
      for (const m of list) {
        if (!missionComplete(p, m)) return m;
      }
      return list[list.length - 1] || null;
    }
    return list[0] || null;
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
