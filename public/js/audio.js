/**
 * Cyber Escape Room — SFX (Web Audio) + background music (HTML Audio)
 */
const AudioFX = (() => {
  const MUSIC_VERSION = '2';
  const MUSIC_SRC = new URL(`audio/vinyl-hearth-v2.mp3?v=${MUSIC_VERSION}`, window.location.href).href;

  let ctx = null;
  let masterGain = null;
  let enabled = localStorage.getItem('cer_sound') !== 'off';
  let musicOn = localStorage.getItem('cer_music') !== 'off';
  let volume = clampVolume(parseInt(localStorage.getItem('cer_volume') || '10', 10));
  let musicEl = null;
  let previewTimer = null;

  function clampVolume(v) {
    return Math.min(100, Math.max(0, Number.isFinite(v) ? v : 10));
  }

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      applyMasterGain();
    }
    return ctx;
  }

  function resume() {
    try {
      getCtx().resume();
    } catch { /* ignore */ }
  }

  function initMusicElement() {
    if (musicEl && musicEl.src === MUSIC_SRC) return;
    if (musicEl) {
      musicEl.pause();
      musicEl = null;
    }
    musicEl = new Audio(MUSIC_SRC);
    musicEl.loop = true;
    musicEl.preload = 'auto';
    musicEl.volume = musicVolume();
  }

  function musicVolume() {
    if (!musicOn || !enabled || volume === 0) return 0;
    return (volume / 100) * 0.55;
  }

  function applyMasterGain() {
    if (!masterGain) return;
    masterGain.gain.value = enabled && volume > 0 ? volume / 100 : 0;
  }

  function applyMusicVolume() {
    if (!musicEl) return;
    musicEl.volume = musicVolume();
  }

  function startMusic() {
    if (!musicOn || !enabled || volume === 0) return;
    initMusicElement();
    applyMusicVolume();
    musicEl.play().catch(() => { /* needs user gesture */ });
  }

  function pauseMusic() {
    if (musicEl) musicEl.pause();
  }

  function stopMusic() {
    if (!musicEl) return;
    musicEl.pause();
    musicEl.currentTime = 0;
  }

  function sfxClick() {
    tone(1200, 0.04, 'square', 0.05);
  }

  function setEnabled(on) {
    enabled = on;
    localStorage.setItem('cer_sound', on ? 'on' : 'off');
    applyMasterGain();
    applyMusicVolume();
    updateButtons();
    if (on && volume > 0) {
      resume();
      if (musicOn) startMusic();
      else sfxClick();
    } else {
      pauseMusic();
    }
  }

  function setVolume(v, preview = false) {
    volume = clampVolume(v);
    localStorage.setItem('cer_volume', String(volume));
    applyMasterGain();
    applyMusicVolume();
    updateVolumeUI();
    updateButtons();
    if (musicOn && enabled && volume > 0) {
      resume();
      startMusic();
    } else if (volume === 0) {
      pauseMusic();
    }
    if (preview && enabled && volume > 0) {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => sfxClick(), 80);
    }
  }

  function toggleMusic() {
    musicOn = !musicOn;
    localStorage.setItem('cer_music', musicOn ? 'on' : 'off');
    updateButtons();
    resume();
    if (musicOn && enabled && volume > 0) {
      startMusic();
    } else {
      pauseMusic();
    }
  }

  function toggle() {
    setEnabled(!enabled);
  }

  function isEnabled() {
    return enabled;
  }

  function getVolume() {
    return volume;
  }

  function sliderPercent(val, min, max) {
    if (!Number.isFinite(val) || max <= min) return 0;
    return Math.round(((val - min) / (max - min)) * 100);
  }

  function paintSlider(slider) {
    if (!slider) return;
    const min = parseInt(slider.min, 10) || 0;
    const max = parseInt(slider.max, 10) || 100;
    const val = parseInt(slider.value, 10);
    const pct = sliderPercent(val, min, max);
    slider.style.setProperty('--volume', pct + '%');
    slider.setAttribute('aria-valuenow', String(pct));
    const label = slider.closest('.volume-control')?.querySelector('[data-sound-volume-label]');
    if (label) label.textContent = pct + '%';
  }

  function updateVolumeUI() {
    document.querySelectorAll('[data-sound-volume]').forEach((slider) => {
      slider.value = String(volume);
      paintSlider(slider);
    });
  }

  function updateButtons() {
    document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
      btn.textContent = enabled ? 'SOUND: ON' : 'SOUND: OFF';
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      btn.classList.toggle('sound-toggle--off', !enabled);
    });
    document.querySelectorAll('[data-music-toggle]').forEach((btn) => {
      btn.textContent = musicOn ? 'MUSIC: ON' : 'MUSIC: OFF';
      btn.setAttribute('aria-pressed', musicOn ? 'true' : 'false');
      btn.classList.toggle('sound-toggle--off', !musicOn);
    });
  }

  function updateUI() {
    updateButtons();
    updateVolumeUI();
  }

  function out(node) {
    node.connect(masterGain);
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

  function bindControls() {
    document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
      if (btn.dataset.audioBound) return;
      btn.dataset.audioBound = '1';
      btn.addEventListener('click', () => {
        resume();
        toggle();
      });
    });

    document.querySelectorAll('[data-music-toggle]').forEach((btn) => {
      if (btn.dataset.audioBound) return;
      btn.dataset.audioBound = '1';
      btn.addEventListener('click', () => {
        resume();
        toggleMusic();
      });
    });

    document.querySelectorAll('[data-sound-volume]').forEach((slider) => {
      if (slider.dataset.audioBound) return;
      slider.dataset.audioBound = '1';
      paintSlider(slider);
      slider.addEventListener('input', () => {
        paintSlider(slider);
        resume();
        setVolume(parseInt(slider.value, 10), true);
      });
    });
  }

  function initUI() {
    bindControls();
    initMusicElement();
    updateUI();
  }

  function levelComplete() {
    arpeggio([392, 523, 659, 784, 988], 0.11, 'sine', 0.08);
    setTimeout(() => sweep(400, 900, 0.25, 0.04), 400);
  }

  function roomComplete(roomId) {
    switch (roomId) {
      case 'phishing':
        // Win98 mail sent chime
        arpeggio([523, 659, 784, 1047], 0.09, 'square', 0.07);
        break;
      case 'attachment':
        arpeggio([440, 554, 659], 0.08, 'square', 0.07);
        setTimeout(() => tone(880, 0.12, 'square', 0.07), 200);
        break;
      case 'fake_login':
        arpeggio([523, 659, 784], 0.1, 'sine', 0.08);
        break;
      case 'ch1_boss':
        sweep(200, 880, 0.25, 0.06);
        setTimeout(() => arpeggio([392, 523, 659, 784], 0.1, 'square', 0.08), 280);
        break;
      case 'password':
        // DOS terminal beeps
        tone(880, 0.05, 'square', 0.07);
        setTimeout(() => tone(1100, 0.05, 'square', 0.07), 90);
        setTimeout(() => tone(1320, 0.14, 'square', 0.08), 180);
        break;
      case 'cipher':
        // Military console access granted
        tone(220, 0.12, 'sawtooth', 0.06);
        setTimeout(() => tone(330, 0.12, 'sawtooth', 0.06), 130);
        setTimeout(() => tone(660, 0.2, 'square', 0.08), 280);
        break;
      case 'sql':
        // Server rack data sync
        arpeggio([440, 554, 659, 784, 988], 0.06, 'square', 0.06);
        setTimeout(() => tone(1175, 0.1, 'square', 0.07), 350);
        break;
      case 'logs':
        // Bank vault approved
        arpeggio([392, 494, 587], 0.12, 'sine', 0.09);
        setTimeout(() => tone(784, 0.25, 'sine', 0.1), 380);
        break;
      case 'social':
        // SOC alert cleared
        sweep(880, 440, 0.2, 0.05);
        setTimeout(() => arpeggio([523, 659, 784], 0.1, 'triangle', 0.08), 220);
        break;
      case 'mfa':
        // Hacker terminal bypass
        tone(330, 0.08, 'sawtooth', 0.08);
        setTimeout(() => tone(220, 0.08, 'sawtooth', 0.07), 90);
        setTimeout(() => sweep(200, 880, 0.3, 0.06), 180);
        break;
      case 'ch2_boss':
        arpeggio([330, 440, 554, 659], 0.09, 'square', 0.08);
        setTimeout(() => tone(880, 0.2, 'sine', 0.09), 320);
        break;
      case 'steganography':
        tone(440, 0.06, 'sine', 0.07);
        setTimeout(() => tone(554, 0.06, 'sine', 0.07), 80);
        setTimeout(() => tone(880, 0.15, 'square', 0.08), 180);
        break;
      case 'db_forensics':
        arpeggio([392, 494, 587, 698], 0.08, 'square', 0.07);
        break;
      case 'siem':
        sweep(660, 330, 0.2, 0.06);
        setTimeout(() => arpeggio([523, 659, 784], 0.1, 'triangle', 0.08), 200);
        break;
      case 'insider':
        tone(220, 0.1, 'sawtooth', 0.06);
        setTimeout(() => tone(330, 0.12, 'sawtooth', 0.07), 120);
        break;
      case 'backup':
        arpeggio([392, 523, 659], 0.1, 'sine', 0.08);
        setTimeout(() => tone(784, 0.2, 'sine', 0.09), 350);
        break;
      case 'ransomware':
        // Mainframe core restored — big finish
        sweep(80, 520, 0.4, 0.07);
        setTimeout(() => arpeggio([392, 523, 659, 784, 988, 1175], 0.12, 'sine', 0.1), 350);
        setTimeout(() => tone(1568, 0.35, 'sine', 0.11), 900);
        break;
      default:
        levelComplete();
    }
  }

  return {
    resume,
    initUI,
    toggle,
    toggleMusic,
    setEnabled,
    setVolume,
    isEnabled,
    getVolume,
    startMusic,
    stopMusic,
    roomComplete,

    click: sfxClick,
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
    levelComplete,
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AudioFX.initUI());
} else {
  AudioFX.initUI();
}
