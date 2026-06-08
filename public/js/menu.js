/**
 * PROJECT CHIMERA — main title menu
 */
(function () {
  'use strict';

  const FLAVOR_LINES = [
    'They came before you.',
    'Most of them never left.',
    '581 was here.',
    'Do not answer it.',
    'He is listening.',
  ];

  let selectedIndex = 0;
  let items = [];
  let modalOpen = false;

  function hasSave() {
    if (typeof ProfileSave === 'undefined') return false;
    const p = ProfileSave.getPhaserProgress();
    if (!p.savedAt) return false;
    return !!(
      p.avatarConfigured
      || p.inboxComplete
      || p.attachmentComplete
      || p.fakeLoginComplete
      || p.ch1BossComplete
      || p.ch2BossComplete
      || (p.facilitySector && p.facilitySector !== 1)
      || p.coreComplete
    );
  }

  function sectorLabel() {
    if (typeof ProfileSave === 'undefined') return 'SECTOR 1';
    const p = ProfileSave.getPhaserProgress();
    const s = p.facilitySector || 1;
    if (s === 'core') return 'CORE';
    return `SECTOR ${s}`;
  }

  function traineeName() {
    if (typeof ProfileSave === 'undefined') return 'TRAINEE 1998';
    const p = ProfileSave.getPhaserProgress();
    return (p.agentName || 'TRAINEE 1998').toUpperCase();
  }

  function clickSfx() {
    if (typeof AudioFX !== 'undefined') {
      AudioFX.resume();
      AudioFX.click();
    }
  }

  function typeGreeting() {
    const el = document.getElementById('chimeraGreeting');
    if (!el) return;
    const msg = `Welcome back, ${traineeName()}.`;
    let i = 0;
    const tick = () => {
      if (i <= msg.length) {
        el.textContent = msg.slice(0, i);
        i += 1;
        if (typeof AudioFX !== 'undefined' && AudioFX.type && i % 3 === 0) AudioFX.type();
        setTimeout(tick, 38);
      }
    };
    setTimeout(tick, 600);
  }

  function refreshContinue() {
    const btn = document.getElementById('menuContinue');
    const sub = document.getElementById('continueSub');
    if (!btn) return;
    if (hasSave()) {
      btn.classList.remove('menu-item--disabled');
      btn.disabled = false;
      if (sub) sub.textContent = `RESUME — ${sectorLabel()}`;
    } else {
      btn.classList.add('menu-item--disabled');
      btn.disabled = true;
      if (sub) sub.textContent = 'NO SAVE DATA';
    }
  }

  function collectItems() {
    items = Array.from(document.querySelectorAll('.menu-item:not(.menu-item--disabled)'));
    if (!items.length) {
      items = Array.from(document.querySelectorAll('.menu-item'));
    }
  }

  function setSelected(idx) {
    collectItems();
    const enabled = Array.from(document.querySelectorAll('.menu-item'));
    if (!enabled.length) return;

    let next = idx;
    const target = enabled[next];
    if (target && target.classList.contains('menu-item--disabled')) {
      next = idx > selectedIndex ? next + 1 : next - 1;
    }
    next = Math.max(0, Math.min(enabled.length - 1, next));
    selectedIndex = next;

    enabled.forEach((el, i) => {
      el.classList.toggle('menu-item--active', i === selectedIndex);
    });

    if (typeof AudioFX !== 'undefined' && AudioFX.hover) AudioFX.hover();
    else if (typeof AudioFX !== 'undefined' && AudioFX.type) AudioFX.type();
  }

  function activateItem(el) {
    if (!el || el.classList.contains('menu-item--disabled')) return;
    const action = el.dataset.action;
    clickSfx();

    switch (action) {
      case 'new':
        if (hasSave() && !window.confirm('Start a new run? Current progress will be reset.')) return;
        if (typeof ProfileSave !== 'undefined' && ProfileSave.resetPhaserRun) {
          ProfileSave.resetPhaserRun();
        }
        if (typeof AudioFX !== 'undefined') AudioFX.stopMenuMusic();
        window.location.href = 'game.html';
        break;
      case 'continue':
        if (typeof AudioFX !== 'undefined') AudioFX.stopMenuMusic();
        window.location.href = 'game.html?resume=1';
        break;
      case 'settings':
        openSettings();
        break;
      case 'logs':
        openLogs();
        break;
      case 'credits':
        openCredits();
        break;
      case 'exit':
        openExit();
        break;
      default:
        break;
    }
  }

  function openModal(title, html) {
    const modal = document.getElementById('menuModal');
    const titleEl = document.getElementById('menuModalTitle');
    const body = document.getElementById('menuModalBody');
    if (!modal || !titleEl || !body) return;
    titleEl.textContent = title;
    body.innerHTML = html;
    modal.classList.remove('hidden');
    modalOpen = true;
  }

  function closeModal() {
    const modal = document.getElementById('menuModal');
    if (modal) modal.classList.add('hidden');
    modalOpen = false;
  }

  function openSettings() {
    const vol = typeof AudioFX !== 'undefined' ? AudioFX.getVolume() : 32;
    const soundOn = typeof AudioFX !== 'undefined' ? AudioFX.isEnabled() : true;
    const musicOn = typeof AudioFX !== 'undefined' ? AudioFX.isMusicOn() : true;
    openModal('SETTINGS', `
      <p>System preferences — stored locally.</p>
      <label><input type="checkbox" id="setSound" ${soundOn ? 'checked' : ''}> Sound effects</label>
      <label><input type="checkbox" id="setMusic" ${musicOn ? 'checked' : ''}> Menu music</label>
      <label>Volume <input type="range" id="setVolume" min="0" max="100" value="${vol}"> <span id="setVolLabel">${vol}%</span></label>
      <label><input type="checkbox" id="setReduced"> Reduced visual effects</label>
      <p style="font-size:15px;color:#556677;margin-top:12px">Teacher tools: <a href="teacher.html" style="color:#00ff88">Dashboard</a></p>
    `);

    const setSound = document.getElementById('setSound');
    const setMusic = document.getElementById('setMusic');
    const setVol = document.getElementById('setVolume');
    const setVolLabel = document.getElementById('setVolLabel');
    const setReduced = document.getElementById('setReduced');

    if (typeof ProfileSave !== 'undefined') {
      const s = ProfileSave.getSettings();
      if (setReduced) setReduced.checked = !!s.reducedEffects;
    }

    if (setSound) {
      setSound.addEventListener('change', () => {
        if (typeof AudioFX !== 'undefined') AudioFX.setEnabled(setSound.checked);
      });
    }
    if (setMusic) {
      setMusic.addEventListener('change', () => {
        if (typeof AudioFX === 'undefined') return;
        if (setMusic.checked !== AudioFX.isMusicOn()) AudioFX.toggleMusic();
      });
    }
    if (setVol && setVolLabel) {
      setVol.addEventListener('input', () => {
        const v = Number(setVol.value);
        setVolLabel.textContent = `${v}%`;
        if (typeof AudioFX !== 'undefined') AudioFX.setVolume(v);
      });
    }
    if (setReduced && typeof ProfileSave !== 'undefined') {
      setReduced.addEventListener('change', () => {
        ProfileSave.saveSettings({ reducedEffects: setReduced.checked });
      });
    }
  }

  function openLogs() {
    const p = typeof ProfileSave !== 'undefined' ? ProfileSave.getPhaserProgress() : {};
    const unlocked = (flag) => !!p[flag];
    const entries = [
      { id: '0144', title: 'TRAINEE 0144 — TERMINATED', text: 'Turned the cameras off. Logs did not match.', req: unlocked('s4SqlComplete') || unlocked('ch4BossComplete') },
      { id: '1777', title: 'TRAINEE 1777 — FAILED', text: 'Heard 581 on the intercom. Then silence.', req: unlocked('ch2BossComplete') || unlocked('s2PasswordComplete') },
      { id: '412', title: 'TRAINEE 412', text: 'Found beside the wall in Sector 3. No struggle.', req: unlocked('ch3BossComplete') || unlocked('s3CipherComplete') },
      { id: '581', title: 'TRAINEE 581 — SIGNAL LOST', text: '"If you\'re reading this, don\'t answer CHIMERA."', req: unlocked('inboxComplete') || unlocked('ch1BossComplete') },
      { id: '998', title: 'TRAINEE 998 — FAILED', text: 'Terminal still glowing: DON\'T LET IT TALK TO YOU.', req: unlocked('ch6BossComplete') || unlocked('s6SocialComplete') },
    ];

    let html = '<p>Recovered facility archives.</p>';
    entries.forEach((e) => {
      if (e.req) {
        html += `<div class="log-entry"><strong>${e.title}</strong><p>${e.text}</p></div>`;
      } else {
        html += `<div class="log-entry log-entry--locked"><strong>${e.title}</strong><p>[ LOCKED — EXPLORE FURTHER ]</p></div>`;
      }
    });

    openModal('TRAINING LOGS', html);
  }

  function openCredits() {
    openModal('CREDITS', `
      <p><strong>PROJECT CHIMERA</strong></p>
      <p>TRAINEE 1998 — Facility Lockdown</p>
      <p>Psychological cyber horror / security training experience.</p>
      <p>EU Cyber Defense Academy — abandoned simulation wing.</p>
      <p style="margin-top:16px;color:#667788">CHIMERA is always watching.</p>
    `);
  }

  function openExit() {
    openModal('SHUTDOWN', `
      <p style="color:#ff6688">ACCESS DENIED.</p>
      <p>CHIMERA: You cannot leave yet.</p>
      <p>There are still sectors to explore.</p>
    `);
  }

  function bindNav() {
    const nav = document.getElementById('menuNav');
    if (!nav) return;

    nav.querySelectorAll('.menu-item').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        selectedIndex = i;
        setSelected(i);
        activateItem(btn);
      });
      btn.addEventListener('mouseenter', () => {
        selectedIndex = i;
        setSelected(i);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (modalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeModal();
          clickSfx();
        }
        return;
      }

      const enabled = Array.from(document.querySelectorAll('.menu-item'));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(Math.min(selectedIndex + 1, enabled.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(Math.max(selectedIndex - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        activateItem(enabled[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        openExit();
      }
    });

    const closeBtn = document.getElementById('menuModalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeModal();
        clickSfx();
      });
    }
  }

  function cycleFlavor() {
    const el = document.getElementById('menuFlavor');
    if (!el) return;
    let i = 0;
    setInterval(() => {
      i = (i + 1) % FLAVOR_LINES.length;
      el.textContent = FLAVOR_LINES[i];
    }, 8000);
  }

  function bindMenuMusic() {
    let started = false;
    const tryStart = () => {
      if (started) return;
      started = true;
      if (typeof AudioFX !== 'undefined') {
        AudioFX.resume();
        AudioFX.startMenuMusic();
      }
    };
    document.addEventListener('pointerdown', tryStart, { once: true });
    document.addEventListener('keydown', tryStart, { once: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    refreshContinue();
    collectItems();
    setSelected(0);
    bindNav();
    bindMenuMusic();
    typeGreeting();
    cycleFlavor();
  });
})();
