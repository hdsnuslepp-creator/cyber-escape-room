/**
 * Operative profile — campaign save, Phaser progress, shared room clears.
 */
const ProfileSave = (() => {
  const CAMPAIGN_KEY = 'cer_campaign_v1';
  const PHASER_KEY = 'cer_phaser_v1';
  const SETTINGS_KEY = 'cer_settings_v1';

  const DEFAULT_SETTINGS = {
    difficulty: 'normal',
    disableHijackEffects: false,
    reducedEffects: false,
    dyslexiaMode: false,
  };

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...readJson(SETTINGS_KEY, {}) };
  }

  function saveSettings(partial) {
    const next = { ...getSettings(), ...partial };
    writeJson(SETTINGS_KEY, next);
    return next;
  }

  function saveCampaign(payload) {
    if (!payload?.studentName) return false;
    writeJson(CAMPAIGN_KEY, { ...payload, savedAt: Date.now() });
    syncPhaserFromTraining(payload.completedRooms || []);
    return true;
  }

  function loadCampaign() {
    return readJson(CAMPAIGN_KEY, null);
  }

  function clearCampaign() {
    localStorage.removeItem(CAMPAIGN_KEY);
  }

  const SECTOR_MISSION_DEFAULTS = {
    s3CipherComplete: false, s3StegoComplete: false, s3DeadDropComplete: false, ch3BossComplete: false,
    s4SqlComplete: false, s4DbComplete: false, s4ApiComplete: false, ch4BossComplete: false,
    s5LogsComplete: false, s5SiemComplete: false, s5NetworkComplete: false, ch5BossComplete: false,
    s6SocialComplete: false, s6InsiderComplete: false, s6PhysicalComplete: false, ch6BossComplete: false,
    s7MalwareComplete: false, s7LateralComplete: false, s7IncidentComplete: false, ch7BossComplete: false,
    coreBackupComplete: false, coreDecryptComplete: false, coreMainframeComplete: false, coreComplete: false,
  };

  function getPhaserProgress() {
    return readJson(PHASER_KEY, {
      agentName: '',
      avatarConfigured: false,
      avatarHair: 'black',
      avatarSkin: 'light',
      avatarSuit: 'cyan',
      avatarHeadgear: 'none',
      facilitySector: 1,
      inboxComplete: false,
      attachmentComplete: false,
      fakeLoginComplete: false,
      ch1BossComplete: false,
      s2PasswordComplete: false,
      s2MfaComplete: false,
      s2CredentialComplete: false,
      ch2BossComplete: false,
      ...SECTOR_MISSION_DEFAULTS,
      hasKey: false,
      lives: 3,
      score: 1000,
      chimeraActive: true,
    });
  }

  function savePhaserProgress(data) {
    const next = { ...getPhaserProgress(), ...data, savedAt: Date.now() };
    writeJson(PHASER_KEY, next);
    return next;
  }

  /** Wipe Sector 1 mission flags so the facility run starts fresh at LOGIN terminal. */
  function resetPhaserRun() {
    const cur = getPhaserProgress();
    const fresh = {
      agentName: cur.agentName || 'TRAINEE 1998',
      avatarConfigured: cur.avatarConfigured || false,
      avatarHair: cur.avatarHair || 'black',
      avatarSkin: cur.avatarSkin || 'light',
      avatarSuit: cur.avatarSuit || 'cyan',
      avatarHeadgear: cur.avatarHeadgear || 'none',
      facilitySector: 1,
      inboxComplete: false,
      attachmentComplete: false,
      fakeLoginComplete: false,
      ch1BossComplete: false,
      s2PasswordComplete: false,
      s2MfaComplete: false,
      s2CredentialComplete: false,
      ch2BossComplete: false,
      ...SECTOR_MISSION_DEFAULTS,
      hasKey: false,
      lives: 3,
      score: 1000,
      chimeraActive: true,
      savedAt: Date.now(),
    };
    writeJson(PHASER_KEY, fresh);
    return fresh;
  }

  function syncPhaserFromTraining(completedRooms) {
    const set = new Set(completedRooms || []);
    const cur = getPhaserProgress();
    savePhaserProgress({
      inboxComplete: cur.inboxComplete || set.has('phishing'),
      attachmentComplete: cur.attachmentComplete || set.has('attachment'),
      fakeLoginComplete: cur.fakeLoginComplete || set.has('fake_login'),
      ch1BossComplete: cur.ch1BossComplete || set.has('ch1_boss'),
      s2PasswordComplete: cur.s2PasswordComplete || set.has('password'),
      s2MfaComplete: cur.s2MfaComplete || set.has('mfa'),
      s2CredentialComplete: cur.s2CredentialComplete || set.has('credential_audit'),
      ch2BossComplete: cur.ch2BossComplete || set.has('ch2_boss'),
      s3CipherComplete: cur.s3CipherComplete || set.has('cipher'),
      s3StegoComplete: cur.s3StegoComplete || set.has('steganography'),
      s3DeadDropComplete: cur.s3DeadDropComplete || set.has('dead_drop'),
      ch3BossComplete: cur.ch3BossComplete || set.has('ch3_boss'),
      s4SqlComplete: cur.s4SqlComplete || set.has('sql'),
      s4DbComplete: cur.s4DbComplete || set.has('db_forensics'),
      s4ApiComplete: cur.s4ApiComplete || set.has('api_breach'),
      ch4BossComplete: cur.ch4BossComplete || set.has('ch4_boss'),
      s5LogsComplete: cur.s5LogsComplete || set.has('logs'),
      s5SiemComplete: cur.s5SiemComplete || set.has('siem'),
      s5NetworkComplete: cur.s5NetworkComplete || set.has('network'),
      ch5BossComplete: cur.ch5BossComplete || set.has('ch5_boss'),
      s6SocialComplete: cur.s6SocialComplete || set.has('social'),
      s6InsiderComplete: cur.s6InsiderComplete || set.has('insider'),
      s6PhysicalComplete: cur.s6PhysicalComplete || set.has('physical'),
      ch6BossComplete: cur.ch6BossComplete || set.has('ch6_boss'),
      s7MalwareComplete: cur.s7MalwareComplete || set.has('malware'),
      s7LateralComplete: cur.s7LateralComplete || set.has('lateral'),
      s7IncidentComplete: cur.s7IncidentComplete || set.has('incident'),
      ch7BossComplete: cur.ch7BossComplete || set.has('ch7_boss'),
      coreBackupComplete: cur.coreBackupComplete || set.has('backup'),
      coreDecryptComplete: cur.coreDecryptComplete || set.has('decryption'),
      coreMainframeComplete: cur.coreMainframeComplete || set.has('mainframe'),
      coreComplete: cur.coreComplete || set.has('ch14_boss') || set.has('ransomware'),
    });
  }

  function syncTrainingRoomClear(roomId) {
    const map = {
      phishing: 'inboxComplete',
      attachment: 'attachmentComplete',
      fake_login: 'fakeLoginComplete',
      ch1_boss: 'ch1BossComplete',
      password: 's2PasswordComplete',
      mfa: 's2MfaComplete',
      credential_audit: 's2CredentialComplete',
      ch2_boss: 'ch2BossComplete',
      cipher: 's3CipherComplete',
      steganography: 's3StegoComplete',
      dead_drop: 's3DeadDropComplete',
      ch3_boss: 'ch3BossComplete',
      sql: 's4SqlComplete',
      db_forensics: 's4DbComplete',
      api_breach: 's4ApiComplete',
      ch4_boss: 'ch4BossComplete',
      logs: 's5LogsComplete',
      siem: 's5SiemComplete',
      network: 's5NetworkComplete',
      ch5_boss: 'ch5BossComplete',
      social: 's6SocialComplete',
      insider: 's6InsiderComplete',
      physical: 's6PhysicalComplete',
      ch6_boss: 'ch6BossComplete',
      malware: 's7MalwareComplete',
      lateral: 's7LateralComplete',
      incident: 's7IncidentComplete',
      ch7_boss: 'ch7BossComplete',
      backup: 'coreBackupComplete',
      decryption: 'coreDecryptComplete',
      mainframe: 'coreMainframeComplete',
      ch14_boss: 'coreComplete',
      ransomware: 'coreComplete',
    };
    if (map[roomId]) {
      savePhaserProgress({ [map[roomId]]: true });
    }
  }

  function formatDifficultyLabel(difficulty) {
    const legacy = { casual: 'easy', standard: 'normal', analyst: 'hard' };
    const key = legacy[difficulty] || difficulty || 'normal';
    return { easy: 'Easy', normal: 'Normal', hard: 'Hard' }[key] || key;
  }

  function exportCampaignCsv(payload) {
    if (!payload) return '';
    const rows = [
      ['Field', 'Value'],
      ['Agent', payload.studentName],
      ['Score', payload.score],
      ['Time (sec)', payload.completionTimeSeconds ?? payload.elapsedSeconds ?? ''],
      ['Mistakes', payload.mistakes],
      ['Hints', (payload.hintsUsed || []).length],
      ['Hijacks Cleared', payload.hijacksCleared ?? 0],
      ['Rooms Cleared', (payload.completedRooms || []).length],
      ['Difficulty', formatDifficultyLabel(payload.difficulty || 'normal')],
    ];
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  return {
    getSettings,
    saveSettings,
    saveCampaign,
    loadCampaign,
    clearCampaign,
    getPhaserProgress,
    savePhaserProgress,
    resetPhaserRun,
    syncPhaserFromTraining,
    syncTrainingRoomClear,
    exportCampaignCsv,
  };
})();
