/**
 * Operative profile — campaign save, Phaser progress, shared room clears.
 */
const ProfileSave = (() => {
  const CAMPAIGN_KEY = 'cer_campaign_v1';
  const PHASER_KEY = 'cer_phaser_v1';
  const SETTINGS_KEY = 'cer_settings_v1';

  const DEFAULT_SETTINGS = {
    difficulty: 'standard',
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

  function getPhaserProgress() {
    return readJson(PHASER_KEY, {
      agentName: '',
      inboxComplete: false,
      attachmentComplete: false,
      fakeLoginComplete: false,
      ch1BossComplete: false,
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

  function syncPhaserFromTraining(completedRooms) {
    const set = new Set(completedRooms || []);
    const cur = getPhaserProgress();
    savePhaserProgress({
      inboxComplete: cur.inboxComplete || set.has('phishing'),
      attachmentComplete: cur.attachmentComplete || set.has('attachment'),
      fakeLoginComplete: cur.fakeLoginComplete || set.has('fake_login'),
      ch1BossComplete: cur.ch1BossComplete || set.has('ch1_boss'),
    });
  }

  function syncTrainingRoomClear(roomId) {
    const phaser = getPhaserProgress();
    const map = {
      phishing: 'inboxComplete',
      attachment: 'attachmentComplete',
      fake_login: 'fakeLoginComplete',
      ch1_boss: 'ch1BossComplete',
    };
    if (map[roomId]) {
      savePhaserProgress({ [map[roomId]]: true });
    }
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
      ['Difficulty', payload.difficulty || 'standard'],
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
    syncPhaserFromTraining,
    syncTrainingRoomClear,
    exportCampaignCsv,
  };
})();
