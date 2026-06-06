/**
 * Renders and handles engine-driven training rooms.
 */
const RoomEngine = (() => {
  const LEGACY_ROOMS = new Set([
    'phishing', 'attachment', 'fake_login', 'ch1_boss',
    'password', 'mfa', 'ch2_boss',
    'cipher', 'steganography',
    'sql', 'db_forensics',
    'logs', 'siem',
    'social', 'insider',
    'backup', 'ransomware',
  ]);

  let activeRoomId = null;
  let selectedOption = null;
  let callbacks = {};

  function isEngineRoom(roomId) {
    return !LEGACY_ROOMS.has(roomId) && EngineRooms.has(roomId);
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function mount(roomId, cbs) {
    activeRoomId = roomId;
    selectedOption = null;
    callbacks = cbs || {};

    const def = EngineRooms.get(roomId);
    const meta = Campaign.getRoom(roomId);
    const shell = document.getElementById('engineRoomShell');
    const body = document.getElementById('engineRoomBody');
    const btn = document.getElementById('btn-engine');
    const feedback = document.getElementById('feedback-engine');
    const tutor = document.getElementById('tutor-engine');

    if (!def || !shell || !body) return;

    shell.className = 'room-shell room-theme room-theme--' + (def.theme || 'server');
    if (def.isBoss || meta.isBoss) shell.classList.add('boss-room');

    const tag = document.getElementById('engineRoomTag');
    if (tag) tag.textContent = meta.tag || '[ SYSTEM: TRAINING MODULE ]';

    const badge = document.getElementById('engineRoomBadge');
    if (badge) badge.textContent = meta.label || roomId;

    const title = document.getElementById('engineRoomTitle');
    if (title) title.textContent = meta.title || roomId;

    const desc = document.getElementById('engineRoomDesc');
    if (desc) {
      const theme = meta.theme || '';
      desc.innerHTML = theme
        ? `<span class="level-theme">${escapeHtml(theme)}</span> — ${escapeHtml(meta.story || meta.goal || '')}`
        : escapeHtml(meta.story || meta.goal || '');
    }

    const banner = document.getElementById('engineChapterBanner');
    if (banner) {
      if (def.isBoss || meta.isBoss) {
        banner.className = 'act-banner act-banner--boss';
        banner.textContent = meta.actTitle ? `${meta.actTitle} — Boss` : 'Boss Mission';
      } else {
        banner.className = 'act-banner chapter-banner';
        banner.textContent = meta.actTitle || '';
      }
    }

    body.innerHTML = `
      <div class="scenario-box engine-scenario">${escapeHtml(def.scenario || '')}</div>
      <p class="log-prompt engine-prompt">${escapeHtml(def.prompt || 'Choose the best response:')}</p>
      <div class="option-grid" id="engineOptions"></div>
    `;

    const container = document.getElementById('engineOptions');
    container.innerHTML = '';
    (def.options || []).forEach((opt) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option-btn';
      b.textContent = opt.text;
      b.addEventListener('click', () => {
        AudioFX.click();
        selectedOption = opt.id;
        container.querySelectorAll('.option-btn').forEach((el) => el.classList.remove('option-btn--selected'));
        b.classList.add('option-btn--selected');
        if (btn) btn.disabled = false;
        if (feedback) feedback.hidden = true;
      });
      container.appendChild(b);
    });

    if (btn) {
      btn.disabled = true;
      btn.textContent = def.submitLabel || 'SUBMIT';
    }
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = '';
    }
    if (tutor) tutor.hidden = true;
  }

  function submit() {
    if (!activeRoomId) return;
    const def = EngineRooms.get(activeRoomId);
    const chosen = def?.options?.find((o) => o.id === selectedOption);
    if (!chosen) return;

    AudioFX.submit();
    if (chosen.correct) {
      if (callbacks.onComplete) callbacks.onComplete();
    } else if (callbacks.onMistake) {
      callbacks.onMistake(chosen.ctx || 'default');
    }
  }

  function getHintLevel(roomId, level) {
    const hints = EngineRooms.HINTS[roomId] || ['Think about what attackers exploit in this scenario.'];
    return hints[Math.min(level, hints.length - 1)];
  }

  function bindSubmit() {
    const btn = document.getElementById('btn-engine');
    if (btn && !btn.dataset.engineBound) {
      btn.dataset.engineBound = '1';
      btn.addEventListener('click', () => submit());
    }
  }

  return {
    isEngineRoom,
    mount,
    submit,
    getHintLevel,
    bindSubmit,
    getActiveRoomId: () => activeRoomId,
  };
})();
