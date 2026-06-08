/**
 * Facility character creator — codename + simple sprite options before the run.
 * Shown once (or when avatar not configured). No facial detail — sprite is tiny.
 */
(function () {
  'use strict';

  const HAIR = {
    black: 0x1a1a1a, brown: 0x5c3a21, blonde: 0xd4b896, ginger: 0xc45c26, white: 0xe8e8e8,
  };
  const SKIN = { light: 0xffddaa, medium: 0xc68642, dark: 0x6b4423 };
  const SUIT = {
    cyan: 0x00ccaa, green: 0x00aa66, purple: 0x8866cc, orange: 0xcc7722, red: 0xcc3344,
  };

  let overlay = null;
  let previewCanvas = null;
  let onComplete = null;

  const state = {
    name: 'TRAINEE 1998',
    hair: 'black',
    skin: 'light',
    suit: 'cyan',
    headgear: 'none',
  };

  function ensure() {
    if (overlay) return true;
    overlay = document.getElementById('characterCreator');
    previewCanvas = document.getElementById('charPreview');
    if (!overlay) return false;

    overlay.querySelectorAll('[data-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.group;
        const val = btn.dataset.opt;
        if (group === 'hair') state.hair = val;
        else if (group === 'skin') state.skin = val;
        else if (group === 'suit') state.suit = val;
        else if (group === 'headgear') state.headgear = val;
        overlay.querySelectorAll(`[data-group="${group}"]`).forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        drawPreview();
        if (typeof AudioFX !== 'undefined' && AudioFX.click) AudioFX.click();
      });
    });

    const nameInput = document.getElementById('charName');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        state.name = nameInput.value.trim() || 'TRAINEE 1998';
        drawPreview();
      });
    }

    const confirm = document.getElementById('charConfirm');
    if (confirm) {
      confirm.addEventListener('click', () => {
        const name = (document.getElementById('charName')?.value || '').trim() || 'TRAINEE 1998';
        state.name = name.slice(0, 24);
        saveAvatar();
        hide();
        if (onComplete) onComplete(getAvatar());
        onComplete = null;
      });
    }

    return true;
  }

  function getAvatar() {
    return { ...state };
  }

  function loadFromSave() {
    if (typeof ProfileSave === 'undefined') return;
    const p = ProfileSave.getPhaserProgress();
    if (p.agentName) state.name = p.agentName;
    if (p.avatarHair) state.hair = p.avatarHair;
    if (p.avatarSkin) state.skin = p.avatarSkin;
    if (p.avatarSuit) state.suit = p.avatarSuit;
    if (p.avatarHeadgear) state.headgear = p.avatarHeadgear;
  }

  function saveAvatar() {
    if (typeof ProfileSave === 'undefined') return;
    ProfileSave.savePhaserProgress({
      agentName: state.name,
      avatarHair: state.hair,
      avatarSkin: state.skin,
      avatarSuit: state.suit,
      avatarHeadgear: state.headgear,
      avatarConfigured: true,
    });
  }

  function hex(c) {
    return '#' + c.toString(16).padStart(6, '0');
  }

  function drawPreview() {
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    const w = previewCanvas.width;
    const h = previewCanvas.height;
    ctx.fillStyle = '#040810';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + 8;
    const suit = SUIT[state.suit] || SUIT.cyan;
    const skin = SKIN[state.skin] || SKIN.light;
    const hair = HAIR[state.hair] || HAIR.black;

    ctx.fillStyle = hex(0x223344);
    ctx.fillRect(cx - 11, cy - 14, 22, 26);
    ctx.fillStyle = hex(suit);
    ctx.fillRect(cx - 9, cy - 12, 18, 22);
    ctx.fillStyle = hex(skin);
    ctx.fillRect(cx - 7, cy - 16, 14, 10);
    ctx.fillStyle = hex(hair);
    ctx.fillRect(cx - 8, cy - 18, 16, 5);

    if (state.headgear === 'visor') {
      ctx.fillStyle = '#44ccff';
      ctx.fillRect(cx - 8, cy - 15, 16, 3);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(cx - 7, cy - 14, 14, 2);
      ctx.globalAlpha = 1;
    } else if (state.headgear === 'mask') {
      ctx.fillStyle = '#334455';
      ctx.fillRect(cx - 6, cy - 10, 12, 8);
    } else if (state.headgear === 'headset') {
      ctx.fillStyle = '#556677';
      ctx.fillRect(cx - 10, cy - 14, 4, 8);
      ctx.fillRect(cx + 6, cy - 14, 4, 8);
      ctx.fillStyle = '#8899aa';
      ctx.fillRect(cx - 2, cy - 17, 4, 2);
    }

    ctx.font = '10px VT323, monospace';
    ctx.fillStyle = '#556677';
    ctx.textAlign = 'center';
    ctx.fillText(state.name.toUpperCase(), cx, h - 8);
  }

  function applyToRegistry(registry) {
    const a = getAvatar();
    registry.set('agentName', a.name);
    registry.set('avatarHair', a.hair);
    registry.set('avatarSkin', a.skin);
    registry.set('avatarSuit', a.suit);
    registry.set('avatarHeadgear', a.headgear);
    registry.set('avatarConfigured', true);
  }

  function needsCreator() {
    if (typeof ProfileSave === 'undefined') return true;
    return !ProfileSave.getPhaserProgress().avatarConfigured;
  }

  function show(cb) {
    if (!ensure()) { if (cb) cb(getAvatar()); return; }
    loadFromSave();
    onComplete = cb;
    const nameInput = document.getElementById('charName');
    if (nameInput) nameInput.value = state.name;

    overlay.querySelectorAll('[data-opt]').forEach((btn) => {
      const group = btn.dataset.group;
      let val = state[group === 'hair' ? 'hair' : group === 'skin' ? 'skin' : group === 'suit' ? 'suit' : 'headgear'];
      btn.classList.toggle('selected', btn.dataset.opt === val);
    });

    drawPreview();
    overlay.classList.remove('hidden');
    document.body.classList.add('creator-open');
    if (nameInput) nameInput.focus();
  }

  function hide() {
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('creator-open');
  }

  function isOpen() {
    return overlay && !overlay.classList.contains('hidden');
  }

  window.FacilityCharacter = {
    HAIR, SKIN, SUIT,
    getAvatar,
    loadFromSave,
    saveAvatar,
    applyToRegistry,
    needsCreator,
    show,
    hide,
    isOpen,
    drawPreview,
  };
})();
