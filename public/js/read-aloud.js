/**
 * Read-aloud accessibility — Web Speech API (device default voice).
 * Mobile: iOS requires speech to start from a tap; Android is more permissive.
 */
const ReadAloud = (() => {
  let queueTimer = null;
  let queueId = 0;
  let warmedUp = false;
  let fabPulseTimer = null;

  function isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  function isIOS() {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isMobile() {
    if (typeof window === 'undefined') return false;
    if (isIOS()) return true;
    if (/Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) return true;
    return window.matchMedia?.('(max-width: 640px)')?.matches ?? false;
  }

  function shouldAutoRead() {
    return !isIOS();
  }

  function isEnabled() {
    if (!isSupported()) return false;
    const settings = ProfileSave?.getSettings?.()?.dyslexiaMode;
    if (settings === true) return true;
    return !!document.getElementById('dyslexiaMode')?.checked;
  }

  function stripHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.innerHTML = str;
    return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function resumeSpeechEngine() {
    if (!isSupported()) return;
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
  }

  function configureUtterance(utter) {
    utter.lang = 'en-US';
    utter.rate = isMobile() ? 0.88 : 0.92;
    utter.pitch = 1;
    utter.volume = 1;
  }

  function warmUpSpeech() {
    if (!isSupported()) return;
    resumeSpeechEngine();
    if (warmedUp) return;
    warmedUp = true;
    try {
      window.speechSynthesis.getVoices();
      const kick = new SpeechSynthesisUtterance(' ');
      kick.volume = 0.01;
      kick.onend = () => window.speechSynthesis.cancel();
      kick.onerror = () => window.speechSynthesis.cancel();
      window.speechSynthesis.speak(kick);
    } catch {
      /* ignore */
    }
  }

  function stop() {
    queueId += 1;
    if (queueTimer) {
      clearTimeout(queueTimer);
      queueTimer = null;
    }
    if (fabPulseTimer) {
      clearTimeout(fabPulseTimer);
      fabPulseTimer = null;
    }
    if (isSupported()) window.speechSynthesis.cancel();
    clearTapHint();
  }

  function speak(text) {
    if (!isEnabled() || !text) return Promise.resolve();
    warmUpSpeech();
    resumeSpeechEngine();
    clearTapHint();
    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(stripHtml(text));
      configureUtterance(utter);
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  }

  function speakParts(parts, gapMs = 450) {
    if (!isEnabled()) return;
    warmUpSpeech();
    resumeSpeechEngine();
    stop();
    queueId += 1;
    const id = queueId;
    const lines = parts.map((p) => stripHtml(p)).filter(Boolean);
    if (!lines.length) return;
    clearTapHint();

    const gap = isMobile() ? Math.max(gapMs, 500) : gapMs;
    let i = 0;

    function next() {
      if (id !== queueId) return;
      if (i >= lines.length) return;
      resumeSpeechEngine();
      const line = lines[i++];
      const utter = new SpeechSynthesisUtterance(line);
      configureUtterance(utter);
      utter.onend = () => {
        if (id !== queueId) return;
        if (i < lines.length) queueTimer = setTimeout(next, gap);
      };
      utter.onerror = () => {
        if (id !== queueId) return;
        queueTimer = setTimeout(next, gap);
      };
      window.speechSynthesis.speak(utter);
    }
    next();
  }

  function gatherEngineParts(roomId) {
    const def = EngineRooms.get(roomId);
    const meta = Campaign.getRoom(roomId);
    const parts = [];
    if (meta.title) parts.push(meta.title);
    if (def?.scenario) parts.push(def.scenario);
    if (def?.alerts?.length) {
      parts.push('Alerts.');
      parts.push(...def.alerts);
    }
    if (def?.prompt) parts.push(def.prompt);
    (def?.options || []).forEach((o, idx) => {
      parts.push(`Option ${idx + 1}. ${o.text}`);
    });
    return parts;
  }

  function gatherLegacyParts(roomId) {
    const meta = Campaign.getRoom(roomId);
    const parts = [];
    if (meta.title) parts.push(meta.title);
    if (meta.story) parts.push(meta.story);

    const screen = document.querySelector(`[data-screen="${roomId}"]`);
    if (!screen) return parts;

    screen.querySelectorAll('.log-prompt, .cipher-prompt, .boss-prompt').forEach((el) => {
      if (el.textContent.trim()) parts.push(el.textContent.trim());
    });

    const opts = screen.querySelectorAll('.option-btn, .password-option, .boss-panel[data-boss]');
    if (opts.length) {
      opts.forEach((el, idx) => {
        const t = el.textContent.trim();
        if (t) parts.push(`Option ${idx + 1}. ${t}`);
      });
    }

    const cipherInput = screen.querySelector('#cipherAnswer');
    if (cipherInput) parts.push('Type your decoded answer in the text field.');

    return parts;
  }

  function announceRoom(roomId) {
    if (!isEnabled() || !roomId) return;
    const parts = RoomEngine.isEngineRoom(roomId)
      ? gatherEngineParts(roomId)
      : gatherLegacyParts(roomId);
    speakParts(parts);
  }

  function announceBrief(title, story, objective) {
    if (!isEnabled()) return;
    speakParts([title, story, objective].filter(Boolean));
  }

  function announceChapter(ch) {
    if (!isEnabled() || !ch) return;
    const parts = [
      `Chapter ${ch.id}. ${ch.title}`,
      ch.intro,
      ch.briefing ? `Focus. ${ch.briefing}` : '',
    ];
    if (ch.objectives?.length) {
      parts.push('Objectives.');
      parts.push(...ch.objectives);
    }
    speakParts(parts);
  }

  function announceQuiz(questions) {
    if (!isEnabled() || !questions?.length) return;
    const parts = ['Final debrief quiz.'];
    questions.forEach((q, qi) => {
      parts.push(`Question ${qi + 1}. ${q.question}`);
      q.options.forEach((opt, oi) => {
        parts.push(`Option ${oi + 1}. ${opt}`);
      });
    });
    speakParts(parts, 350);
  }

  function announceVerify(question, optionTexts) {
    if (!isEnabled()) return;
    const parts = ['Double-check. Possible user interface hijack.', question];
    optionTexts.forEach((t, i) => parts.push(`Option ${i + 1}. ${t}`));
    speakParts(parts);
  }

  function hintTapToRead(message) {
    const fab = document.getElementById('btnReadAloud');
    const banner = document.getElementById('readAloudMobileHint');
    const text = message || (isIOS()
      ? 'Tap READ to hear this question (required on iPhone).'
      : 'Tap READ to hear this question.');

    if (banner) {
      banner.hidden = false;
      banner.textContent = text;
    }
    if (fab) {
      fab.classList.add('read-aloud-fab--pulse');
      fab.setAttribute('aria-label', text);
      if (fabPulseTimer) clearTimeout(fabPulseTimer);
      fabPulseTimer = setTimeout(() => fab.classList.remove('read-aloud-fab--pulse'), 12000);
    }
  }

  function clearTapHint() {
    const banner = document.getElementById('readAloudMobileHint');
    const fab = document.getElementById('btnReadAloud');
    if (banner) banner.hidden = true;
    if (fab) {
      fab.classList.remove('read-aloud-fab--pulse');
      fab.setAttribute('aria-label', 'Read current question aloud');
    }
  }

  function updateFab(show) {
    const fab = document.getElementById('btnReadAloud');
    if (!fab) return;
    fab.hidden = !show;
    document.body.classList.toggle('read-aloud-active', !!show);
  }

  function bindFab(repeatFn) {
    const fab = document.getElementById('btnReadAloud');
    if (!fab || fab.dataset.readBound) return;
    fab.dataset.readBound = '1';
    fab.addEventListener('click', () => {
      warmUpSpeech();
      if (typeof AudioFX !== 'undefined') AudioFX.click();
      repeatFn();
    });

    const briefRead = document.getElementById('btnBriefRead');
    if (briefRead && !briefRead.dataset.readBound) {
      briefRead.dataset.readBound = '1';
      briefRead.addEventListener('click', () => {
        warmUpSpeech();
        if (typeof AudioFX !== 'undefined') AudioFX.click();
        repeatFn();
      });
    }
  }

  function syncMobileReadButtons(show) {
    document.querySelectorAll('.btn--read-aloud, #btnBriefRead').forEach((btn) => {
      btn.hidden = !show;
    });
  }

  /** Strip voice picker removed in v4 — clears stale cached HTML on mobile. */
  function removeLegacyVoicePicker() {
    document.getElementById('readAloudVoiceWrap')?.remove();
    document.getElementById('btnVoicePreview')?.remove();
    document.getElementById('readAloudVoice')?.remove();
    document.querySelectorAll('.read-aloud-voice-wrap, .read-aloud-voice-row, .read-aloud-voice-note').forEach((el) => {
      el.remove();
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', removeLegacyVoicePicker);
    } else {
      removeLegacyVoicePicker();
    }
  }

  return {
    isSupported,
    isEnabled,
    isMobile,
    isIOS,
    shouldAutoRead,
    stop,
    speak,
    speakParts,
    announceRoom,
    announceBrief,
    announceChapter,
    announceQuiz,
    announceVerify,
    warmUpSpeech,
    hintTapToRead,
    clearTapHint,
    updateFab,
    bindFab,
    syncMobileReadButtons,
    removeLegacyVoicePicker,
  };
})();
