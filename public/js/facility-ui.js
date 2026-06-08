/**
 * Facility map HUD — reflects all 7 sectors + CORE progress.
 */
(function () {
  'use strict';

  const MAP_ENTRIES = [
    { n: 1, label: 'INBOX', wide: true },
    { n: 2, label: 'BREACH' },
    { n: 3, label: 'SIGNALS' },
    { n: 4, label: 'DATABASE' },
    { n: 5, label: 'HUNTER' },
    { n: 6, label: 'HUMAN' },
    { n: 7, label: 'ALERT' },
    { core: true, label: 'CHIMERA', wide: true },
  ];

  const LOCK = '\uD83D\uDD12';
  let startTime = Date.now();
  let cells = [];

  function pad(n) { return String(n).padStart(2, '0'); }

  function progress() {
    if (typeof ProfileSave === 'undefined') return {};
    return ProfileSave.getPhaserProgress();
  }

  function sectorCleared(p, id) {
    if (typeof FacilitySectors !== 'undefined') return FacilitySectors.isBossComplete(p, id);
    if (id === 1) return !!p.ch1BossComplete;
    if (id === 2) return !!p.ch2BossComplete;
    return false;
  }

  function sectorUnlocked(p, id) {
    if (typeof FacilitySectors !== 'undefined') return FacilitySectors.isSectorUnlocked(p, id);
    if (id === 1) return true;
    if (id === 2) return !!p.ch1BossComplete;
    return false;
  }

  function activeSector(p) {
    if (typeof FacilitySectors !== 'undefined') return FacilitySectors.resolveFacilitySector(p);
    if (!p.ch1BossComplete) return 1;
    if (!p.ch2BossComplete) return 2;
    return 3;
  }

  function buildMap() {
    const grid = document.getElementById('mapGrid');
    if (!grid || grid.childElementCount) return;
    cells = MAP_ENTRIES.map((sec) => {
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
      return { sec, cell, lock, sub };
    });
  }

  function setCellState(entry, state) {
    const { cell, lock, sec } = entry;
    cell.classList.remove('active', 'cleared');
    if (state === 'active') {
      cell.classList.add('active');
      lock.textContent = '\u25B8';
    } else if (state === 'cleared') {
      cell.classList.add('cleared');
      lock.textContent = '\u2713';
    } else {
      lock.textContent = LOCK;
    }
  }

  function refreshAgent() {
    const p = progress();
    const name = (p.agentName || 'TRAINEE 1998').toUpperCase();
    const title = document.querySelector('.ftb-title');
    const cur = activeSector(p);
    const sec = typeof FacilitySectors !== 'undefined' ? FacilitySectors.get(cur) : null;
    if (title) {
      if (sec && !sectorCleared(p, cur)) {
        title.textContent = `${name} — SECTOR ${sec.isCore ? 'CORE' : sec.id}: ${sec.title}`;
      } else if (p.coreComplete) {
        title.textContent = `${name} — FACILITY CONTAINED`;
      } else {
        title.textContent = `${name} — FACILITY LOCKDOWN`;
      }
    }
  }

  function objectiveText(p) {
    const cur = activeSector(p);
    if (p.coreComplete) return 'All sectors cleared — CHIMERA contained';
    const sec = typeof FacilitySectors !== 'undefined' ? FacilitySectors.get(cur) : null;
    if (!sec || sec.legacy) {
      if (!p.inboxComplete) return 'Sector 1: breach at LOGIN';
      if (!p.attachmentComplete) return 'Sector 1: quarantine at ARCHIVE';
      if (!p.fakeLoginComplete) return 'Sector 1: clear LOGIN portal';
      if (!p.ch1BossComplete) return 'Sector 1: breach BLAST DOOR';
      return 'Sector 1 cleared — proceed to Sector 2';
    }
    if (sectorCleared(p, cur)) {
      const next = sec.nextId;
      if (next) return `${sec.title} cleared — proceed to ${next === 'core' ? 'CORE' : 'Sector ' + next}`;
      return `${sec.title} — complete`;
    }
    const mission = FacilitySectors.getActiveMission(p, cur);
    if (!mission) {
      if (FacilitySectors.allMissionsComplete(p, cur)) return `${sec.label}: pick up KEY — breach the DOOR`;
      return `Explore Sector ${cur === 'core' ? 'CORE' : cur}`;
    }
    const terms = sec.terminals || {};
    const termName = terms[mission.terminal] || mission.terminal.toUpperCase();
    return `Sector ${cur === 'core' ? 'CORE' : cur}: ${termName} terminal`;
  }

  function refresh() {
    refreshAgent();
    const p = progress();
    const cur = activeSector(p);

    cells.forEach((entry) => {
      const { sec } = entry;
      const id = sec.core ? 'core' : sec.n;
      if (!sectorUnlocked(p, id)) {
        setCellState(entry, 'locked');
        if (entry.sub) entry.sub.textContent = '???';
        return;
      }
      if (sectorCleared(p, id)) setCellState(entry, 'cleared');
      else if (id === cur) setCellState(entry, 'active');
      else setCellState(entry, 'locked');

      if (entry.sub && sectorUnlocked(p, id)) {
        entry.sub.textContent = sec.label;
      }
    });

    const obj = document.getElementById('objectiveText');
    if (obj) obj.textContent = objectiveText(p);
  }

  function tick() {
    const el = document.getElementById('stTime');
    if (el) {
      const s = Math.floor((Date.now() - startTime) / 1000);
      el.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    }
    syncStats();
  }

  function syncStats() {
    const game = window.__game;
    if (!game || !game.registry) return;
    const lives = game.registry.get('lives');
    const score = game.registry.get('score');
    const hasKey = game.registry.get('hasKey');
    const lv = document.getElementById('stLives');
    if (lv && typeof lives === 'number') lv.textContent = lives > 0 ? '\u2665'.repeat(lives) : '\u2014';
    const sc = document.getElementById('stScore');
    if (sc && typeof score === 'number') sc.textContent = String(score);
    const ky = document.getElementById('stKey');
    if (ky) {
      ky.textContent = hasKey ? '\u2713' : '\u2014';
      ky.classList.toggle('has-key', !!hasKey);
    }
    syncStatus(game, lives);
  }

  function syncStatus(game, lives) {
    const st = document.getElementById('stStatus');
    if (!st) return;
    const p = progress();
    if (p.coreComplete) {
      st.textContent = 'CONTAINED';
      st.style.color = '#00ff66';
      return;
    }
    if (typeof ChimeraBox !== 'undefined' && ChimeraBox.isOpen()) {
      st.textContent = 'CHIMERA LINK';
      st.style.color = '#ff6688';
      return;
    }
    if (game?.scene?.getScene('HubScene')?.isPaused) {
      st.textContent = 'PAUSED';
      st.style.color = '#8899aa';
      return;
    }
    if (typeof lives === 'number' && lives <= 1) {
      st.textContent = 'CRITICAL';
      st.style.color = '#ff3366';
      return;
    }
    if (!p.ch1BossComplete) {
      st.textContent = 'LOCKDOWN';
      st.style.color = '#ff6688';
      return;
    }
    st.textContent = 'ACTIVE';
    st.style.color = '#00ff66';
  }

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
    buildMap();
    refresh();
    tick();
    setInterval(tick, 1000);
    setInterval(refresh, 1000);
    setInterval(syncStats, 250);
    window.addEventListener('chimera:speak', () => syncStats());

    const newRun = document.getElementById('btnNewRun');
    if (newRun) {
      newRun.addEventListener('click', (e) => {
        e.preventDefault();
        if (!window.confirm('Reset progress and start a new run?')) return;
        if (typeof ProfileSave !== 'undefined' && typeof ProfileSave.resetPhaserRun === 'function') {
          ProfileSave.resetPhaserRun();
        }
        window.location.href = 'game.html';
      });
    }
  }

  function setCinematic(on) {
    document.body.classList.toggle('cinematic', !!on);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FacilityUI = { showChimeraDialogue, refresh, refreshAgent, setCinematic, resetTimer: () => { startTime = Date.now(); } };
  window.showChimeraDialogue = showChimeraDialogue;
})();
