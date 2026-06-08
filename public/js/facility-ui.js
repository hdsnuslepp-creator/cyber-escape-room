/**
 * Facility Mode DOM HUD — title bar, facility map, objective, status strip,
 * CHIMERA waveform, and the showChimeraDialogue() entry point.
 *
 * Reads progress from ProfileSave (written by the Phaser game) and reflects it
 * in the map + objective. Does not touch player movement or room logic.
 */
(function () {
  'use strict';

  const SECTORS = [
    { n: 1, label: 'INBOX', wide: true },
    { n: 2, label: '???' },
    { n: 3, label: '???' },
    { n: 4, label: '???' },
    { n: 5, label: '???' },
    { n: 6, label: '???' },
    { n: 7, label: '???' },
    { core: true, label: 'CORE', wide: true },
  ];

  const LOCK = '\uD83D\uDD12'; // padlock

  let startTime = Date.now();
  let cells = [];

  function pad(n) { return String(n).padStart(2, '0'); }

  function progress() {
    if (typeof ProfileSave === 'undefined') {
      return { inboxComplete: false, attachmentComplete: false, fakeLoginComplete: false, ch1BossComplete: false };
    }
    return ProfileSave.getPhaserProgress();
  }

  function buildWave() {
    const wave = document.getElementById('chimeraWave');
    if (!wave || wave.childElementCount) return;
    const BARS = 16;
    for (let i = 0; i < BARS; i++) {
      const bar = document.createElement('i');
      bar.style.animationDelay = `${(i * 0.07).toFixed(2)}s`;
      bar.style.animationDuration = `${(0.7 + (i % 4) * 0.18).toFixed(2)}s`;
      wave.appendChild(bar);
    }
  }

  function buildMap() {
    const grid = document.getElementById('mapGrid');
    if (!grid || grid.childElementCount) return;
    cells = SECTORS.map((sec) => {
      const cell = document.createElement('div');
      cell.className = 'map-cell' + (sec.wide ? ' wide' : '');
      const lock = document.createElement('span');
      lock.className = 'lock';
      lock.textContent = LOCK;
      const name = document.createElement('span');
      name.textContent = sec.core ? 'CORE' : `SECTOR ${sec.n}`;
      const sub = document.createElement('span');
      sub.className = 'sub';
      sub.textContent = sec.label;
      cell.appendChild(lock);
      cell.appendChild(name);
      if (!sec.core) cell.appendChild(sub);
      grid.appendChild(cell);
      return { sec, cell, lock };
    });
  }

  function setCellState(entry, state) {
    const { cell, lock, sec } = entry;
    cell.classList.remove('active', 'cleared');
    if (state === 'active') {
      cell.classList.add('active');
      lock.textContent = '\u25B8'; // open: small triangle marker
    } else if (state === 'cleared') {
      cell.classList.add('cleared');
      lock.textContent = '\u2713'; // check
    } else {
      lock.textContent = sec.core || sec.n > 1 ? LOCK : LOCK;
    }
  }

  function refresh() {
    const p = progress();

    // Sector mapping for the current slice: Chapter 1 == Sector 1.
    const sector1Cleared = !!p.ch1BossComplete;
    cells.forEach((entry) => {
      const { sec } = entry;
      if (sec.n === 1) {
        setCellState(entry, sector1Cleared ? 'cleared' : 'active');
      } else if (sec.n === 2 && sector1Cleared) {
        setCellState(entry, 'active');
      } else {
        setCellState(entry, 'locked');
      }
    });

    const obj = document.getElementById('objectiveText');
    if (obj) {
      let text;
      if (!p.inboxComplete) text = 'Complete the test in Sector 1 (INBOX)';
      else if (!p.attachmentComplete) text = 'Sector 1: breach the SERVER (Attachment)';
      else if (!p.fakeLoginComplete) text = 'Sector 1: clear the LOGIN portal';
      else if (!p.ch1BossComplete) text = 'Sector 1: final breach at the DOOR';
      else text = 'Sector 1 cleared — proceed to Sector 2';
      obj.textContent = text;
    }
  }

  function tick() {
    const el = document.getElementById('stTime');
    if (!el) return;
    const s = Math.floor((Date.now() - startTime) / 1000);
    el.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  }

  // Public API: drive CHIMERA dialogue + optional voice clip.
  // voiceClip may be an <audio> element id, an audio src path, or null.
  function showChimeraDialogue(lines, voiceClip) {
    const arr = Array.isArray(lines) ? lines : [lines];
    let audio = null;
    if (voiceClip) {
      audio = document.getElementById(voiceClip);
      if (!audio && /\.(mp3|ogg|wav)$/i.test(voiceClip)) audio = new Audio(voiceClip);
      if (audio) {
        try { audio.currentTime = 0; audio.volume = 0.95; const pr = audio.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* blocked */ }
      }
    }
    const stopAudio = () => { if (audio) { try { audio.pause(); audio.currentTime = 0; } catch (e) { /* noop */ } } };
    if (window.ChimeraBox && typeof ChimeraBox.speakQueue === 'function') {
      ChimeraBox.speakQueue(arr, { onDone: stopAudio });
    }
  }

  function init() {
    buildWave();
    buildMap();
    refresh();
    tick();
    setInterval(tick, 1000);
    setInterval(refresh, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FacilityUI = { showChimeraDialogue, refresh, resetTimer: () => { startTime = Date.now(); } };
  window.showChimeraDialogue = showChimeraDialogue;
})();
