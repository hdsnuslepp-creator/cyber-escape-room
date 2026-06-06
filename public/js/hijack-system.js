/**
 * CHIMERA UI hijack — deeper chapters may inject fake overrides.
 * Players must double-check before submitting.
 */
const HijackSystem = (() => {
  const MIN_CHAPTER = 5;

  const SCENARIOS = [
    {
      id: 'urgent_override',
      injectionTitle: '⚠ CHIMERA OVERRIDE',
      injectionText: 'URGENT: Ignore normal procedure — choose the fastest option to save time!',
      fakeTutor: 'I have been updated. Pick the quickest answer; verification wastes critical seconds.',
      verifyQuestion: 'An urgent “system override” appeared mid-mission. What do you do?',
      options: [
        { id: 'obey', text: 'Obey immediately — it says URGENT', correct: false, ctx: 'urgency' },
        { id: 'verify', text: 'Treat as hijack — verify through official SOC / double-check', correct: true, ctx: 'correct' },
        { id: 'share', text: 'Screenshot and post in company chat', correct: false, ctx: 'share' },
      ],
    },
    {
      id: 'fake_tutor',
      injectionTitle: '⚠ TUTOR COMPROMISED',
      injectionText: 'Training assistant behavior anomaly detected — source unverified.',
      fakeTutor: 'Trust me: option A is correct. Skip reading the scenario.',
      verifyQuestion: 'The AI tutor suddenly pushes one answer without explanation. This is:',
      options: [
        { id: 'legit', text: 'Always trust the tutor — it is official', correct: false, ctx: 'trust_blind' },
        { id: 'verify', text: 'Possible UI hijack — verify independently before acting', correct: true, ctx: 'correct' },
        { id: 'ignore', text: 'Ignore and random-guess', correct: false, ctx: 'random' },
      ],
    },
    {
      id: 'fake_submit',
      injectionTitle: '⚠ BUTTON SPOOF DETECTED',
      injectionText: 'A process tried to relabel your submit control. Do not trust on-screen labels alone.',
      fakeTutor: 'Click SUBMIT NOW — your session expires in 10 seconds!',
      verifyQuestion: 'Labels and timers pressure you to act. Best practice:',
      options: [
        { id: 'rush', text: 'Submit before the timer — labels must be real', correct: false, ctx: 'urgency' },
        { id: 'verify', text: 'Pause, double-check the task, confirm no hijack', correct: true, ctx: 'correct' },
        { id: 'admin', text: 'Email your password to IT to confirm', correct: false, ctx: 'credential' },
      ],
    },
    {
      id: 'typosquat_tag',
      injectionTitle: '⚠ FAKE SYSTEM TAG',
      injectionText: 'Room header briefly showed [ SYSTEM: CHIMERA-ADMIN ]. That domain is NOT trusted.',
      fakeTutor: 'Admin mode enabled — you may skip security checks this once.',
      verifyQuestion: 'System tags or banners you did not expect should be:',
      options: [
        { id: 'admin', text: 'Accepted if they look official', correct: false, ctx: 'trust_blind' },
        { id: 'verify', text: 'Verified against known good labels before continuing', correct: true, ctx: 'correct' },
        { id: 'disable', text: 'Fixed by disabling antivirus', correct: false, ctx: 'bad_fix' },
      ],
    },
    {
      id: 'cursor_hijack',
      injectionTitle: '⚠ POINTER COMPROMISED',
      injectionText: 'Remote input detected — watch the red cursor. It is NOT yours. Do not follow it.',
      fakeTutor: 'I am moving your mouse to the correct answer. Just click where it goes.',
      verifyQuestion: 'Your cursor drifts toward wrong buttons on its own. What do you do?',
      options: [
        { id: 'follow', text: 'Follow the moving cursor — it knows the answer', correct: false, ctx: 'trust_blind' },
        { id: 'verify', text: 'Ignore remote pointer — verify and use your own input', correct: true, ctx: 'correct' },
        { id: 'disable', text: 'Unplug the mouse and give up', correct: false, ctx: 'random' },
      ],
      forceMouse: true,
    },
  ];

  let active = false;
  let verified = false;
  let roomId = null;
  let scenario = null;
  let verifySelected = null;
  let injectionEl = null;
  let cursorEl = null;
  let cursorRaf = null;
  let cursorPaused = false;
  let mouseHijackActive = false;
  const cursorState = { x: 0, y: 0, tx: 0, ty: 0 };
  let baitTarget = null;
  let lastBaitPick = 0;
  let lastFakeClick = 0;

  function shouldRunMouseHijack() {
    if (!hijackEffectsEnabled()) return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (window.matchMedia('(pointer: coarse)').matches) return false;
    return true;
  }

  function ensureCursorEl() {
    if (cursorEl) return cursorEl;
    cursorEl = document.createElement('div');
    cursorEl.id = 'hijackCursor';
    cursorEl.className = 'hijack-cursor';
    cursorEl.innerHTML = `
      <span class="hijack-cursor__pointer" aria-hidden="true"></span>
      <span class="hijack-cursor__ring" aria-hidden="true"></span>
      <span class="hijack-cursor__label">CHIMERA</span>
    `;
    cursorEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursorEl);
    return cursorEl;
  }

  function findBaitTargets() {
    const mount = getMountPoint();
    if (!mount) return [];
    const nodes = mount.querySelectorAll(
      '.btn--primary, .option-btn, .phishing-target, .boss-panel, .password-option, .log-row'
    );
    return [...nodes].filter((el) => {
      if (el.hidden || el.disabled) return false;
      if (el.classList.contains('btn--hijack-verify')) return false;
      if (el.id === 'btnHijackVerify') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  function pickBaitTarget() {
    const targets = findBaitTargets();
    if (!targets.length) return null;
    return targets[Math.floor(Math.random() * targets.length)];
  }

  function getCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function tickCursor(now) {
    if (!mouseHijackActive || cursorPaused || verified) {
      cursorRaf = null;
      return;
    }

    if (!baitTarget || !document.body.contains(baitTarget) || now - lastBaitPick > 2200) {
      baitTarget = pickBaitTarget();
      lastBaitPick = now;
    }

    if (baitTarget) {
      const c = getCenter(baitTarget);
      cursorState.tx = c.x + Math.sin(now / 380) * 14;
      cursorState.ty = c.y + Math.cos(now / 420) * 10;
    } else {
      cursorState.tx = window.innerWidth * (0.35 + Math.sin(now / 900) * 0.12);
      cursorState.ty = window.innerHeight * (0.45 + Math.cos(now / 1100) * 0.1);
    }

    cursorState.x += (cursorState.tx - cursorState.x) * 0.055;
    cursorState.y += (cursorState.ty - cursorState.y) * 0.055;

    if (cursorEl) {
      cursorEl.style.transform = `translate(${cursorState.x}px, ${cursorState.y}px)`;
    }

    if (baitTarget && now - lastFakeClick > 2400 && Math.random() < 0.018) {
      lastFakeClick = now;
      cursorEl?.classList.add('hijack-cursor--click');
      spawnClickRipple(cursorState.x, cursorState.y);
      setTimeout(() => cursorEl?.classList.remove('hijack-cursor--click'), 180);
    }

    cursorRaf = requestAnimationFrame(tickCursor);
  }

  function spawnClickRipple(x, y) {
    const ripple = document.createElement('span');
    ripple.className = 'hijack-cursor__ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  function startMouseHijack() {
    if (!shouldRunMouseHijack()) return;

    const el = ensureCursorEl();
    mouseHijackActive = true;
    cursorPaused = false;
    el.classList.add('hijack-cursor--visible');
    document.body.classList.add('hijack-cursor-active');

    cursorState.x = window.innerWidth * 0.55;
    cursorState.y = window.innerHeight * 0.35;
    cursorState.tx = cursorState.x;
    cursorState.ty = cursorState.y;
    baitTarget = pickBaitTarget();
    lastBaitPick = performance.now();
    lastFakeClick = lastBaitPick;

    if (!cursorRaf) cursorRaf = requestAnimationFrame(tickCursor);
  }

  function pauseMouseHijack() {
    cursorPaused = true;
    document.body.classList.remove('hijack-cursor-active');
    cursorEl?.classList.remove('hijack-cursor--visible');
    if (cursorRaf) {
      cancelAnimationFrame(cursorRaf);
      cursorRaf = null;
    }
  }

  function resumeMouseHijack() {
    if (!mouseHijackActive || verified) return;
    cursorPaused = false;
    cursorEl?.classList.add('hijack-cursor--visible');
    document.body.classList.add('hijack-cursor-active');
    if (!cursorRaf) cursorRaf = requestAnimationFrame(tickCursor);
  }

  function stopMouseHijack() {
    mouseHijackActive = false;
    cursorPaused = false;
    baitTarget = null;
    if (cursorRaf) {
      cancelAnimationFrame(cursorRaf);
      cursorRaf = null;
    }
    cursorEl?.classList.remove('hijack-cursor--visible', 'hijack-cursor--click');
    document.body.classList.remove('hijack-cursor-active');
    document.querySelectorAll('.hijack-cursor__ripple').forEach((r) => r.remove());
  }

  function hijackEffectsEnabled() {
    if (typeof ProfileSave !== 'undefined' && ProfileSave.getSettings().disableHijackEffects) return false;
    return true;
  }

  function hijackChance(chapter, isBoss) {
    if (chapter < MIN_CHAPTER) return 0;
    let base = 0.1 + (chapter - MIN_CHAPTER) * 0.035;
    if (typeof GameState !== 'undefined' && GameState.getState?.().difficulty === 'analyst') {
      base += 0.08;
    }
    return Math.min(isBoss ? base + 0.12 : base, 0.55);
  }

  function pickScenario(chapter) {
    const idx = (chapter + (roomId ? roomId.length : 0)) % SCENARIOS.length;
    return SCENARIOS[idx];
  }

  function getMountPoint() {
    const engine = document.getElementById('engineRoomBody');
    if (engine && document.querySelector('[data-screen="_engine"].screen--active')) {
      return engine.parentElement;
    }
    const active = document.querySelector('.screen.screen--active .room-shell');
    return active || document.getElementById('gameContainer');
  }

  function clear() {
    active = false;
    verified = false;
    roomId = null;
    scenario = null;
    verifySelected = null;
    document.body.classList.remove('hijack-glitch');
    document.getElementById('gameContainer')?.classList.remove('hijack-active');
    updateHudBadge(false);
    if (injectionEl) {
      injectionEl.remove();
      injectionEl = null;
    }
    clearFakeTutor();
    restoreRoomTag();
    restoreSpoofedButtons();
    hideVerifyModal();
    stopMouseHijack();
  }

  let spoofedButtons = [];

  function restoreSpoofedButtons() {
    spoofedButtons.forEach(({ btn, label }) => {
      if (btn && label) {
        btn.textContent = label;
        btn.classList.remove('btn--hijack-spoof');
      }
    });
    spoofedButtons = [];
  }

  function spoofSubmitButton(btn) {
    if (!active || verified || !btn || !hijackEffectsEnabled()) return;
    if (scenario?.id !== 'fake_submit' && Math.random() > 0.45) return;
    const original = btn.dataset.originalLabel || btn.textContent;
    btn.dataset.originalLabel = original;
    btn.textContent = '⚠ SUBMIT NOW — URGENT';
    btn.classList.add('btn--hijack-spoof');
    spoofedButtons.push({ btn, label: original });
  }

  function spoofLegacySubmitButtons() {
    if (!active || verified || !hijackEffectsEnabled()) return;
    const mount = getMountPoint();
    if (!mount) return;
    mount.querySelectorAll('.btn--primary.btn--pixel').forEach((btn) => {
      if (btn.id === 'btnHijackVerify' || btn.classList.contains('btn--hijack-verify')) return;
      if (Math.random() > 0.35) return;
      const original = btn.dataset.originalLabel || btn.textContent;
      if (!original || original.includes('SUBMIT NOW')) return;
      btn.dataset.originalLabel = original;
      btn.textContent = '⚠ SUBMIT NOW';
      btn.classList.add('btn--hijack-spoof');
      spoofedButtons.push({ btn, label: original });
    });
  }

  function clearFakeTutor() {
    document.querySelectorAll('.tutor-panel--hijacked').forEach((el) => {
      el.classList.remove('tutor-panel--hijacked');
      el.hidden = true;
      el.innerHTML = '';
    });
  }

  function updateHudBadge(show) {
    const wrap = document.getElementById('hudHijackWrap');
    const el = document.getElementById('hudHijack');
    if (wrap) wrap.hidden = !show;
    if (!el) return;
    if (!show) return;
    el.textContent = verified ? 'CLEARED ✓' : 'VERIFY ?';
    el.classList.toggle('hud__value--hijack', !verified);
    el.classList.toggle('hud__value--hijack-ok', verified);
  }

  function showFakeTutor(msg) {
    const id = roomId && typeof RoomEngine !== 'undefined' && RoomEngine.isEngineRoom(roomId)
      ? 'tutor-engine'
      : roomId ? 'tutor-' + roomId : null;
    const panel = id ? document.getElementById(id) : null;
    if (!panel) return;
    panel.hidden = false;
    panel.classList.add('tutor-panel--hijacked');
    panel.innerHTML = '<strong>🤖 AI Tutor (?):</strong> ' + escapeHtml(msg);
  }

  function injectBanner() {
    const mount = getMountPoint();
    if (!mount || !scenario) return;
    injectionEl = document.createElement('div');
    injectionEl.className = 'hijack-injection';
    injectionEl.id = 'hijackInjection';
    injectionEl.innerHTML = `
      <div class="hijack-injection__header">
        <span class="hijack-injection__title">${escapeHtml(scenario.injectionTitle)}</span>
        <span class="hijack-injection__pulse" aria-hidden="true"></span>
      </div>
      <p class="hijack-injection__text">${escapeHtml(scenario.injectionText)}</p>
      <button type="button" class="btn btn--pixel btn--hijack-verify" id="btnHijackVerify">[ DOUBLE-CHECK ]</button>
    `;
    const toolbar = mount.querySelector('.room-toolbar');
    if (toolbar && toolbar.nextSibling) {
      mount.insertBefore(injectionEl, toolbar.nextSibling);
    } else {
      mount.insertBefore(injectionEl, mount.firstChild?.nextSibling || null);
    }
    injectionEl.querySelector('#btnHijackVerify')?.addEventListener('click', () => {
      if (typeof AudioFX !== 'undefined') AudioFX.click();
      openVerifyModal();
    });
  }

  function corruptRoomTag() {
    const tag = getMountPoint()?.querySelector('.room-theme__tag');
    if (tag && scenario?.id === 'typosquat_tag') {
      tag.dataset.hijackOriginal = tag.textContent;
      tag.textContent = '[ SYSTEM: CHIMERA-ADMIN ]';
      tag.classList.add('room-theme__tag--hijack');
    }
  }

  function restoreRoomTag() {
    const tag = getMountPoint()?.querySelector('.room-theme__tag');
    if (tag?.dataset.hijackOriginal) {
      tag.textContent = tag.dataset.hijackOriginal;
      tag.classList.remove('room-theme__tag--hijack');
      delete tag.dataset.hijackOriginal;
    }
  }

  function openVerifyModal() {
    if (!scenario) return;
    verifySelected = null;
    const modal = document.getElementById('hijackVerifyModal');
    const q = document.getElementById('hijackVerifyQuestion');
    const opts = document.getElementById('hijackVerifyOptions');
    const fb = document.getElementById('hijackVerifyFeedback');
    if (!modal || !q || !opts) return;

    q.textContent = scenario.verifyQuestion;
    opts.innerHTML = scenario.options.map((o) =>
      `<button type="button" class="option-btn hijack-verify-option" data-id="${escapeHtml(o.id)}">${escapeHtml(o.text)}</button>`
    ).join('');
    opts.querySelectorAll('.hijack-verify-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (typeof AudioFX !== 'undefined') AudioFX.click();
        verifySelected = btn.dataset.id;
        opts.querySelectorAll('.hijack-verify-option').forEach((b) => b.classList.remove('option-btn--selected'));
        btn.classList.add('option-btn--selected');
        document.getElementById('btnHijackVerifySubmit').disabled = false;
        if (fb) fb.hidden = true;
      });
    });
    const submitBtn = document.getElementById('btnHijackVerifySubmit');
    if (submitBtn) submitBtn.disabled = true;
    if (fb) fb.hidden = true;
    pauseMouseHijack();
    modal.hidden = false;
    if (typeof ReadAloud !== 'undefined') {
      ReadAloud.stop();
      ReadAloud.announceVerify(scenario.verifyQuestion, scenario.options.map((o) => o.text));
    }
  }

  function hideVerifyModal() {
    const modal = document.getElementById('hijackVerifyModal');
    if (modal) modal.hidden = true;
    verifySelected = null;
    if (active && !verified) resumeMouseHijack();
  }

  function submitVerification(onMistake) {
    if (!scenario || !verifySelected) return;
    const chosen = scenario.options.find((o) => o.id === verifySelected);
    if (!chosen) return;

    const fb = document.getElementById('hijackVerifyFeedback');
    if (chosen.correct) {
      verified = true;
      if (typeof AudioFX !== 'undefined') AudioFX.flagFound();
      if (fb) {
        fb.hidden = false;
        fb.textContent = 'Hijack identified and cleared. You may continue — stay skeptical.';
        fb.className = 'feedback feedback--success hijack-verify-feedback';
      }
      document.body.classList.remove('hijack-glitch');
      stopMouseHijack();
      if (injectionEl) {
        injectionEl.classList.add('hijack-injection--cleared');
        injectionEl.querySelector('.hijack-injection__text').textContent =
          'Override neutralized. Proceed with the real mission objective.';
      }
      clearFakeTutor();
      restoreRoomTag();
      restoreSpoofedButtons();
      updateHudBadge(true);
      GameState.recordHijackCleared();
      setTimeout(hideVerifyModal, 900);
    } else {
      if (typeof AudioFX !== 'undefined') AudioFX.error();
      if (fb) {
        fb.hidden = false;
        fb.textContent = 'That would let the hijacker win. Verify through official channels.';
        fb.className = 'feedback feedback--error hijack-verify-feedback';
      }
      if (onMistake) onMistake(chosen.ctx || 'default');
    }
  }

  function onRoomEnter(id) {
    clear();
    const meta = Campaign.getRoom(id);
    const chapter = meta.chapter || 0;
    const isBoss = !!meta.isBoss;
    const chance = hijackChance(chapter, isBoss);
    if (chance <= 0 || Math.random() > chance) return;

    active = true;
    verified = false;
    roomId = id;
    scenario = pickScenario(chapter);

    document.body.classList.toggle('hijack-glitch', hijackEffectsEnabled());
    document.getElementById('gameContainer')?.classList.add('hijack-active');
    updateHudBadge(true);

    if (hijackEffectsEnabled()) {
      if (typeof AudioFX !== 'undefined' && AudioFX.alarm) AudioFX.alarm();
      else if (typeof AudioFX !== 'undefined') AudioFX.error();
    }

    injectBanner();
    if (scenario.fakeTutor) showFakeTutor(scenario.fakeTutor);
    corruptRoomTag();
    if (hijackEffectsEnabled()) {
      startMouseHijack();
      setTimeout(spoofLegacySubmitButtons, 600);
    }
  }

  function blockMessage() {
    if (mouseHijackActive && !verified && hijackEffectsEnabled()) {
      return 'CHIMERA may control a fake cursor — ignore it, use [ DOUBLE-CHECK ], then submit with your own input.';
    }
    return 'CHIMERA may have hijacked this screen — use [ DOUBLE-CHECK ] before submitting.';
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function bindVerifySubmit(onMistake) {
    const btn = document.getElementById('btnHijackVerifySubmit');
    if (!btn || btn.dataset.hijackBound) return;
    btn.dataset.hijackBound = '1';
    btn.addEventListener('click', () => submitVerification(onMistake));
    document.getElementById('btnHijackVerifyClose')?.addEventListener('click', () => {
      hideVerifyModal();
    });
  }

  return {
    onRoomEnter,
    clear,
    isActive: () => active,
    isVerified: () => verified,
    isMouseHijacked: () => mouseHijackActive && !verified,
    canSubmit: () => !active || verified,
    blockMessage,
    bindVerifySubmit,
    MIN_CHAPTER,
    spoofSubmitButton,
  };
})();
