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

  function renderOptions(container, def, btn, feedback) {
    container.className = 'option-grid';
    container.innerHTML = '';
    (def.options || []).forEach((opt) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option-btn';
      b.textContent = opt.text;
      b.addEventListener('click', () => selectOption(opt.id, container, btn, feedback));
      container.appendChild(b);
    });
  }

  function renderToggleUI(container, def, btn, feedback) {
    container.className = 'engine-toggle-grid';
    container.innerHTML = (def.options || []).map((opt) =>
      `<button type="button" class="engine-toggle" data-id="${escapeHtml(opt.id)}">
        <span class="engine-toggle__led"></span>
        <span class="engine-toggle__text">${escapeHtml(opt.text)}</span>
      </button>`
    ).join('');
    container.querySelectorAll('.engine-toggle').forEach((el) => {
      el.addEventListener('click', () => selectOption(el.dataset.id, container, btn, feedback, '.engine-toggle'));
    });
  }

  function renderDashboardUI(container, def, btn, feedback) {
    const alerts = (def.alerts || []).map((a) => `<li class="engine-alert">${escapeHtml(a)}</li>`).join('');
    container.innerHTML = `
      <div class="engine-dashboard">
        <p class="engine-dashboard__label">⚠ LIVE ALERTS</p>
        <ul class="engine-dashboard__alerts">${alerts}</ul>
        <div class="option-grid" id="engineDashOptions"></div>
      </div>`;
    const opts = container.querySelector('#engineDashOptions');
    renderOptions(opts, def, btn, feedback);
  }

  function renderRankedUI(container, def, btn, feedback) {
    container.className = 'option-grid engine-ranked-grid';
    container.innerHTML = '';
    (def.options || []).forEach((opt) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option-btn engine-ranked-btn';
      b.dataset.id = opt.id;
      b.textContent = opt.text;
      b.addEventListener('click', () => selectOption(opt.id, container, btn, feedback, '.engine-ranked-btn'));
      container.appendChild(b);
    });
  }

  function selectOption(id, container, btn, feedback, selector = '.option-btn') {
    AudioFX.click();
    selectedOption = id;
    container.querySelectorAll(selector).forEach((el) => el.classList.remove('option-btn--selected'));
    const target = container.querySelector(`[data-id="${id}"]`) ||
      [...container.querySelectorAll(selector)].find((el) => el.dataset.id === id);
    if (target) {
      target.classList.add('option-btn--selected');
    }
    if (btn) btn.disabled = false;
    if (feedback) feedback.hidden = true;
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
      <div id="engineOptions"></div>
    `;

    const container = document.getElementById('engineOptions');
    const uiType = def.uiType || 'options';
    if (uiType === 'toggle') renderToggleUI(container, def, btn, feedback);
    else if (uiType === 'dashboard') renderDashboardUI(container, def, btn, feedback);
    else if (uiType === 'ranked') renderRankedUI(container, def, btn, feedback);
    else renderOptions(container, def, btn, feedback);

    if (btn) {
      btn.disabled = true;
      btn.textContent = def.submitLabel || 'SUBMIT';
      btn.dataset.originalLabel = def.submitLabel || 'SUBMIT';
    }
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = '';
    }
    if (tutor) tutor.hidden = true;

    if (typeof HijackSystem !== 'undefined') {
      HijackSystem.spoofSubmitButton(btn);
    }
  }

  function submit() {
    if (!activeRoomId) return;
    if (typeof HijackSystem !== 'undefined' && !HijackSystem.canSubmit()) {
      const fb = document.getElementById('feedback-engine');
      if (fb) {
        fb.hidden = false;
        fb.textContent = HijackSystem.blockMessage();
        fb.className = 'feedback feedback--error';
      }
      if (typeof AudioFX !== 'undefined') AudioFX.hint();
      return;
    }
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
