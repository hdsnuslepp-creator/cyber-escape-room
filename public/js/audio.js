/**
 * Cyber Escape Room — Sound Effects + chill procedural background music
 */
const AudioFX = (() => {
  let ctx = null;
  let enabled = localStorage.getItem('cer_sound') !== 'off';
  let musicOn = localStorage.getItem('cer_music') !== 'off';
  let volume = clampVolume(parseInt(localStorage.getItem('cer_volume') || '70', 10));
  let masterGain = null;
  let musicGain = null;
  let musicNodes = [];
  let previewTimer = null;

  function clampVolume(v) {
    return Math.min(100, Math.max(0, Number.isFinite(v) ? v : 70));
  }

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.connect(masterGain);
      applyMasterGain();
      applyMusicGain();
    }
    return ctx;
  }

  function applyMasterGain() {
    if (!masterGain) return;
    masterGain.gain.value = enabled && volume > 0 ? volume / 100 : 0;
  }

  function applyMusicGain() {
    if (!musicGain) return;
    musicGain.gain.value = musicOn && enabled && volume > 0 ? 0.35 : 0;
  }

  function out(node) {
    node.connect(masterGain);
  }

  function setEnabled(on) {
    enabled = on;
    localStorage.setItem('cer_sound', on ? 'on' : 'off');
    applyMasterGain();
    applyMusicGain();
    updateUI();
    if (on && volume > 0) {
      resume();
      if (musicOn) startMusic();
      else click();
    } else {
      stopMusic();
    }
  }

  function setVolume(v, preview = false) {
    volume = clampVolume(v);
    localStorage.setItem('cer_volume', String(volume));
    if (volume > 0 && !enabled) {
      enabled = true;
      localStorage.setItem('cer_sound', 'on');
    }
    applyMasterGain();
    applyMusicGain();
    updateUI();
    if (preview && enabled && volume > 0) {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => click(), 80);
    }
  }

  function toggleMusic() {
    musicOn = !musicOn;
    localStorage.setItem('cer_music', musicOn ? 'on' : 'off');
    applyMusicGain();
    updateUI();
    if (musicOn && enabled && volume > 0) {
      resume();
      startMusic();
    } else {
      stopMusic();
    }
  }

  function startMusic() {
    if (musicNodes.length || !musicOn || !enabled || volume === 0) return;
    try {
      const ac = getCtx();
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.connect(musicGain);

      const chords = [
        [130.81, 164.81, 196.0],
        [146.83, 174.61, 220.0],
        [123.47, 155.56, 185.0],
        [138.59, 164.81, 207.65],
      ];
      let chordIdx = 0;

      function playChord() {
        if (!musicOn) return;
        const freqs = chords[chordIdx % chords.length];
        chordIdx++;
        freqs.forEach((f, i) => {
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.type = 'sine';
          osc.frequency.value = f;
          g.gain.setValueAtTime(0, ac.currentTime);
          g.gain.linearRampToValueAtTime(0.06 / (i + 1), ac.currentTime + 0.8);
          g.gain.linearRampToValueAtTime(0, ac.currentTime + 5.5);
          osc.connect(g);
          g.connect(filter);
          osc.start();
          osc.stop(ac.currentTime + 6);
        });
      }

      playChord();
      const interval = setInterval(() => {
        if (!musicOn || !enabled) {
          clearInterval(interval);
          return;
        }
        playChord();
      }, 5500);

      musicNodes = [{ stop: () => clearInterval(interval) }];
    } catch { /* ignore */ }
  }

  function stopMusic() {
    musicNodes.forEach((n) => n.stop && n.stop());
    musicNodes = [];
  }

  function toggle() {
    setEnabled(!enabled);
  }

  function updateUI() {
    document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
      btn.textContent = enabled && volume > 0 ? '🔊 Sound On' : '🔇 Sound Off';
      btn.setAttribute('aria-pressed', enabled && volume > 0 ? 'true' : 'false');
      btn.classList.toggle('sound-toggle--off', !enabled || volume === 0);
    });
    document.querySelectorAll('[data-music-toggle]').forEach((btn) => {
      btn.textContent = musicOn ? '🎵 Music On' : '🎵 Music Off';
      btn.setAttribute('aria-pressed', musicOn ? 'true' : 'false');
      btn.classList.toggle('sound-toggle--off', !musicOn);
    });
    document.querySelectorAll('[data-sound-volume]').forEach((s) => { s.value = String(volume); });
    document.querySelectorAll('[data-sound-volume-label]').forEach((l) => { l.textContent = volume + '%'; });
    document.querySelectorAll('.sound-controls').forEach((el) => {
      el.classList.toggle('sound-controls--muted', !enabled);
    });
  }

  function tone(freq, duration, type = 'square', vol = 0.08, when = 0) {
    if (!enabled || volume === 0) return;
    try {
      const ac = getCtx();
      const t = ac.currentTime + when;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      out(gain);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch { /* ignore */ }
  }

  function noiseBurst(duration = 0.12, vol = 0.06) {
    if (!enabled || volume === 0) return;
    try {
      const ac = getCtx();
      const bufferSize = ac.sampleRate * duration;
      const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buffer;
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      src.connect(filter);
      filter.connect(gain);
      out(gain);
      src.start();
    } catch { /* ignore */ }
  }

  function arpeggio(notes, step = 0.09, type = 'square', vol = 0.07) {
    notes.forEach((f, i) => tone(f, step * 1.4, type, vol, i * step));
  }

  function sweep(startFreq, endFreq, duration, vol = 0.06) {
    if (!enabled || volume === 0) return;
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startFreq, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + duration);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.connect(gain);
      out(gain);
      osc.start();
      osc.stop(ac.currentTime + duration + 0.05);
    } catch { /* ignore */ }
  }

  return {
    resume() {
      try { getCtx().resume(); } catch { /* ignore */ }
    },

    initUI() {
      document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => toggle());
      });
      document.querySelectorAll('[data-music-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => toggleMusic());
      });
      document.querySelectorAll('[data-sound-volume]').forEach((slider) => {
        slider.addEventListener('input', () => {
          resume();
          setVolume(parseInt(slider.value, 10), true);
        });
      });
      updateUI();
    },

    toggle,
    toggleMusic,
    setEnabled,
    setVolume,
    isEnabled,
    getVolume,
    startMusic,
    stopMusic,

    click: () => tone(1200, 0.04, 'square', 0.05),
    type: () => tone(900 + Math.random() * 200, 0.025, 'square', 0.03),
    submit: () => {
      tone(600, 0.06, 'square', 0.06);
      setTimeout(() => tone(800, 0.08, 'square', 0.05), 60);
    },
    boot: () => {
      sweep(120, 520, 0.35, 0.05);
      setTimeout(() => arpeggio([392, 494, 587, 784], 0.07, 'square', 0.06), 200);
    },
    flagFound: () => {
      tone(880, 0.06, 'triangle', 0.08);
      setTimeout(() => tone(1100, 0.08, 'triangle', 0.07), 70);
    },
    hint: () => {
      tone(440, 0.1, 'triangle', 0.07);
      setTimeout(() => tone(554, 0.12, 'triangle', 0.06), 90);
    },
    success: () => arpeggio([523, 659, 784, 1047], 0.1, 'sine', 0.09),
    error: () => {
      tone(220, 0.15, 'sawtooth', 0.09);
      setTimeout(() => tone(165, 0.25, 'sawtooth', 0.08), 120);
      noiseBurst(0.08, 0.04);
    },
    lifeLost: () => {
      tone(311, 0.2, 'sawtooth', 0.1);
      setTimeout(() => tone(196, 0.35, 'sawtooth', 0.09), 150);
    },
    levelComplete: () => {
      arpeggio([392, 523, 659, 784, 988], 0.11, 'sine', 0.08);
      setTimeout(() => sweep(400, 900, 0.25, 0.04), 400);
    },
    doorUnlock: () => {
      arpeggio([220, 277, 330, 440], 0.08, 'square', 0.06);
      setTimeout(() => tone(880, 0.2, 'sine', 0.08), 320);
    },
    roomTransition: () => sweep(300, 150, 0.2, 0.04),
    gameOver: () => {
      tone(330, 0.25, 'sawtooth', 0.1);
      setTimeout(() => tone(220, 0.35, 'sawtooth', 0.09), 200);
      setTimeout(() => tone(110, 0.5, 'sawtooth', 0.08), 450);
      noiseBurst(0.2, 0.05);
    },
    certificate: () => arpeggio([523, 659, 784, 988, 1175], 0.14, 'sine', 0.1),
    quizCorrect: () => tone(784, 0.1, 'sine', 0.08),
    quizWrong: () => tone(200, 0.15, 'square', 0.06),
    achievement: () => {
      arpeggio([659, 784, 988], 0.08, 'sine', 0.09);
      setTimeout(() => tone(1175, 0.25, 'sine', 0.1), 200);
    },
    scoreBonus: () => {
      tone(523, 0.08, 'sine', 0.07);
      setTimeout(() => tone(784, 0.12, 'sine', 0.08), 100);
    },
  };
})();
