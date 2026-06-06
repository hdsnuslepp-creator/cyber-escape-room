/**
 * Read-aloud for dyslexia accessibility — Web Speech API.
 * Mobile: iOS requires speech to start from a tap; Android is more permissive.
 */
const ReadAloud = (() => {
  let queueTimer = null;
  let queueId = 0;
  let cachedVoices = [];
  let voicesBound = false;
  let warmedUp = false;
  let voiceLoadAttempts = 0;
  let voicePollTimer = null;
  let fabPulseTimer = null;
  const MAX_VOICE_ATTEMPTS = 30;

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

  /** Delayed auto-read works on desktop/Android; iOS needs a direct tap. */
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

  function isEnglishVoice(voice) {
    const lang = (voice.lang || '').toLowerCase().replace('_', '-');
    const name = (voice.name || '').toLowerCase();
    if (lang.startsWith('en')) return true;
    if (!lang && /english|zira|david|mark|aria|jenny|guy|sonia|susan|hazel|george|samantha|alex|fred|victoria|karen|moira|tessa|daniel|fiona|natasha|william|libby|ryan|thomas|olivia|mia|nancy|andrew|emma|brian|siri|com\.apple/i.test(name)) {
      return true;
    }
    return false;
  }

  function loadVoices() {
    if (!isSupported()) return [];
    const all = window.speechSynthesis.getVoices();
    let voices = all.filter(isEnglishVoice);
    if (!voices.length && all.length) voices = [...all];
    voices.sort((a, b) => {
      if (a.default !== b.default) return a.default ? -1 : 1;
      if (a.localService !== b.localService) return a.localService ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    cachedVoices = voices;
    return cachedVoices;
  }

  function platformVoiceHint(voices) {
    if (!isSupported()) {
      return 'Read-aloud is not supported in this browser. Try Chrome, Edge, or Safari on your phone.';
    }
    if (isIOS()) {
      return voices.length
        ? `${voices.length} voice${voices.length === 1 ? '' : 's'} available. On iPhone/iPad, tap READ to hear each question — auto-read may not work. Change voice in Settings → Accessibility → Spoken Content → Voices.`
        : 'Uses your iPhone\'s built-in voice. Tap Preview or READ after each tap. Change voice in Settings → Accessibility → Spoken Content → Voices.';
    }
    if (/Android/i.test(navigator.userAgent)) {
      return voices.length
        ? `${voices.length} voice${voices.length === 1 ? '' : 's'} available. Install more in Android Settings → Accessibility → Text-to-speech.`
        : 'Uses your phone\'s text-to-speech. Tap Preview or READ if nothing plays automatically.';
    }
    if (voices.length) {
      return `${voices.length} voice${voices.length === 1 ? '' : 's'} available. Install more in Windows Settings → Time & language → Speech.`;
    }
    return 'No voices loaded yet — tap Preview or start the game. On desktop, install voices in system speech settings, then refresh.';
  }

  function updateVoiceStatus(voices) {
    const note = document.querySelector('.read-aloud-voice-note');
    if (!note) return;
    note.textContent = platformVoiceHint(voices);
  }

  function populateVoiceSelect(selectEl) {
    if (!selectEl || !isSupported()) return;
    const voices = loadVoices();
    const saved = ProfileSave?.getSettings?.()?.readAloudVoice;
    const prev = selectEl.value || saved;
    selectEl.innerHTML = '';

    if (isIOS() && !voices.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Device default voice (iPhone/iPad)';
      selectEl.appendChild(opt);
      selectEl.disabled = true;
      updateVoiceStatus(voices);
      return;
    }

    if (!voices.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = voiceLoadAttempts >= MAX_VOICE_ATTEMPTS
        ? 'No voices found — check phone or system speech settings'
        : 'Loading voices…';
      selectEl.appendChild(opt);
      selectEl.disabled = true;
      updateVoiceStatus(voices);
      return;
    }

    selectEl.disabled = false;
    voices.forEach((voice) => {
      const opt = document.createElement('option');
      opt.value = voice.voiceURI;
      opt.textContent = formatVoiceLabel(voice);
      selectEl.appendChild(opt);
    });

    const pick = voices.find((v) => v.voiceURI === prev) || getSelectedVoice();
    if (pick) selectEl.value = pick.voiceURI;
    updateVoiceStatus(voices);
  }

  function scheduleVoiceRefresh() {
    if (voicePollTimer) return;
    voiceLoadAttempts = 0;

    const tick = () => {
      voiceLoadAttempts += 1;
      const voices = loadVoices();
      const selectEl = document.getElementById('readAloudVoice');
      if (selectEl) populateVoiceSelect(selectEl);

      if (voices.length || voiceLoadAttempts >= MAX_VOICE_ATTEMPTS) {
        voicePollTimer = null;
        return;
      }
      voicePollTimer = setTimeout(tick, 250);
    };

    tick();
  }

  function warmUpSpeech() {
    if (!isSupported()) return;
    resumeSpeechEngine();
    loadVoices();

    if (!warmedUp) {
      warmedUp = true;
      try {
        const kick = new SpeechSynthesisUtterance(' ');
        kick.volume = 0.01;
        kick.onend = () => window.speechSynthesis.cancel();
        kick.onerror = () => window.speechSynthesis.cancel();
        window.speechSynthesis.speak(kick);
      } catch {
        /* ignore */
      }
    }

    scheduleVoiceRefresh();
  }

  function bindVoiceEngine() {
    if (!isSupported() || voicesBound) return;
    voicesBound = true;

    window.speechSynthesis.addEventListener('voiceschanged', () => {
      loadVoices();
      populateVoiceSelect(document.getElementById('readAloudVoice'));
    });

    scheduleVoiceRefresh();
  }

  function formatVoiceLabel(voice) {
    const tag = voice.localService ? '' : ' · online';
    return `${voice.name} (${voice.lang || 'unknown'})${tag}`;
  }

  function getSelectedVoice() {
    const voices = cachedVoices.length ? cachedVoices : loadVoices();
    const uri = ProfileSave?.getSettings?.()?.readAloudVoice
      || document.getElementById('readAloudVoice')?.value;
    if (uri) {
      const saved = voices.find((v) => v.voiceURI === uri);
      if (saved) return saved;
    }
    return voices.find((v) => v.default && isEnglishVoice(v))
      || voices.find((v) => v.localService)
      || voices[0]
      || null;
  }

  function configureUtterance(utter) {
    const voice = getSelectedVoice();
    if (voice && !isIOS()) {
      utter.voice = voice;
      utter.lang = voice.lang || 'en-US';
    } else {
      utter.lang = 'en-US';
    }
    utter.rate = isMobile() ? 0.88 : 0.92;
    utter.pitch = 1;
    utter.volume = 1;
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
        if (i < lines.length) {
          queueTimer = setTimeout(next, gap);
        }
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
    if (cipherInput) {
      parts.push('Type your decoded answer in the text field.');
    }

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

  function updateVoicePickerVisibility(show) {
    const wrap = document.getElementById('readAloudVoiceWrap');
    if (wrap) wrap.hidden = !show || !isSupported();
    if (show && isSupported()) {
      warmUpSpeech();
      populateVoiceSelect(document.getElementById('readAloudVoice'));
    }
  }

  function previewVoice() {
    if (!isSupported()) return;
    warmUpSpeech();
    resumeSpeechEngine();
    stop();
    queueId += 1;
    const utter = new SpeechSynthesisUtterance(
      'Mission briefing. Question one. Option one. Verify the sender before you click.'
    );
    configureUtterance(utter);
    utter.onerror = () => populateVoiceSelect(document.getElementById('readAloudVoice'));
    window.speechSynthesis.speak(utter);
  }

  function bindVoicePicker(onVoiceChange) {
    bindVoiceEngine();
    const selectEl = document.getElementById('readAloudVoice');
    const previewBtn = document.getElementById('btnVoicePreview');
    warmUpSpeech();
    populateVoiceSelect(selectEl);

    if (selectEl && !selectEl.dataset.readBound) {
      selectEl.dataset.readBound = '1';
      selectEl.addEventListener('change', () => {
        warmUpSpeech();
        if (typeof onVoiceChange === 'function') onVoiceChange(selectEl.value);
        previewVoice();
      });
      selectEl.addEventListener('focus', warmUpSpeech);
      selectEl.addEventListener('click', warmUpSpeech);
    }

    if (previewBtn && !previewBtn.dataset.readBound) {
      previewBtn.dataset.readBound = '1';
      previewBtn.addEventListener('click', () => {
        if (typeof AudioFX !== 'undefined') AudioFX.click();
        previewVoice();
      });
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
    populateVoiceSelect,
    updateVoicePickerVisibility,
    previewVoice,
    bindVoicePicker,
    updateFab,
    bindFab,
    syncMobileReadButtons,
  };
})();
