/**
 * Read-aloud for dyslexia accessibility — Web Speech API.
 */
const ReadAloud = (() => {
  let queueTimer = null;
  let queueId = 0;
  let cachedVoices = [];
  let voicesBound = false;

  function isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  function isEnabled() {
    if (!isSupported()) return false;
    return ProfileSave?.getSettings?.()?.dyslexiaMode === true;
  }

  function stripHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.innerHTML = str;
    return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function loadVoices() {
    if (!isSupported()) return [];
    cachedVoices = window.speechSynthesis.getVoices().filter((v) => /^en(-|$)/i.test(v.lang));
    cachedVoices.sort((a, b) => {
      if (a.default !== b.default) return a.default ? -1 : 1;
      if (a.localService !== b.localService) return a.localService ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return cachedVoices;
  }

  function formatVoiceLabel(voice) {
    const tag = voice.localService ? '' : ' · online';
    return `${voice.name} (${voice.lang})${tag}`;
  }

  function getSelectedVoice() {
    const voices = cachedVoices.length ? cachedVoices : loadVoices();
    const uri = ProfileSave?.getSettings?.()?.readAloudVoice;
    if (uri) {
      const saved = voices.find((v) => v.voiceURI === uri);
      if (saved) return saved;
    }
    return voices.find((v) => v.default && /^en/i.test(v.lang))
      || voices.find((v) => v.localService)
      || voices[0]
      || null;
  }

  function configureUtterance(utter) {
    const voice = getSelectedVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = 'en-US';
    }
    utter.rate = 0.9;
    utter.pitch = 1;
  }

  function stop() {
    queueId += 1;
    if (queueTimer) {
      clearTimeout(queueTimer);
      queueTimer = null;
    }
    if (isSupported()) window.speechSynthesis.cancel();
  }

  function speak(text) {
    if (!isEnabled() || !text) return Promise.resolve();
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
    stop();
    const id = queueId;
    const lines = parts.map((p) => stripHtml(p)).filter(Boolean);
    if (!lines.length) return;

    let i = 0;
    function next() {
      if (id !== queueId) return;
      if (i >= lines.length) return;
      const line = lines[i++];
      const utter = new SpeechSynthesisUtterance(line);
      configureUtterance(utter);
      utter.onend = () => {
        if (id !== queueId) return;
        if (i < lines.length) {
          queueTimer = setTimeout(next, gapMs);
        }
      };
      utter.onerror = () => {
        if (id !== queueId) return;
        queueTimer = setTimeout(next, gapMs);
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

  function populateVoiceSelect(selectEl) {
    if (!selectEl || !isSupported()) return;
    const voices = loadVoices();
    const saved = ProfileSave?.getSettings?.()?.readAloudVoice;
    const prev = selectEl.value || saved;
    selectEl.innerHTML = '';

    if (!voices.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Loading voices…';
      selectEl.appendChild(opt);
      return;
    }

    voices.forEach((voice) => {
      const opt = document.createElement('option');
      opt.value = voice.voiceURI;
      opt.textContent = formatVoiceLabel(voice);
      selectEl.appendChild(opt);
    });

    const pick = voices.find((v) => v.voiceURI === prev) || getSelectedVoice();
    if (pick) selectEl.value = pick.voiceURI;
  }

  function updateVoicePickerVisibility(show) {
    const wrap = document.getElementById('readAloudVoiceWrap');
    if (wrap) wrap.hidden = !show || !isSupported();
  }

  function previewVoice() {
    if (!isSupported()) return;
    stop();
    const utter = new SpeechSynthesisUtterance(
      'Mission briefing. Question one. Option one. Verify the sender before you click.'
    );
    configureUtterance(utter);
    window.speechSynthesis.speak(utter);
  }

  function bindVoicePicker(onVoiceChange) {
    const selectEl = document.getElementById('readAloudVoice');
    const previewBtn = document.getElementById('btnVoicePreview');
    populateVoiceSelect(selectEl);

    if (selectEl && !selectEl.dataset.readBound) {
      selectEl.dataset.readBound = '1';
      selectEl.addEventListener('change', () => {
        if (typeof onVoiceChange === 'function') onVoiceChange(selectEl.value);
        previewVoice();
      });
    }

    if (previewBtn && !previewBtn.dataset.readBound) {
      previewBtn.dataset.readBound = '1';
      previewBtn.addEventListener('click', () => {
        if (typeof AudioFX !== 'undefined') AudioFX.click();
        previewVoice();
      });
    }

    if (!voicesBound && isSupported()) {
      voicesBound = true;
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        populateVoiceSelect(document.getElementById('readAloudVoice'));
      });
      loadVoices();
    }
  }

  function updateFab(show) {
    const fab = document.getElementById('btnReadAloud');
    if (!fab) return;
    fab.hidden = !show;
  }

  function bindFab(repeatFn) {
    const fab = document.getElementById('btnReadAloud');
    if (!fab || fab.dataset.readBound) return;
    fab.dataset.readBound = '1';
    fab.addEventListener('click', () => {
      if (typeof AudioFX !== 'undefined') AudioFX.click();
      repeatFn();
    });
  }

  return {
    isSupported,
    isEnabled,
    stop,
    speak,
    speakParts,
    announceRoom,
    announceBrief,
    announceChapter,
    announceQuiz,
    announceVerify,
    populateVoiceSelect,
    updateVoicePickerVisibility,
    previewVoice,
    bindVoicePicker,
    updateFab,
    bindFab,
  };
})();
