/**
 * Cyber Escape: Lockdown Protocol
 * Phaser 3 — corridor hub + phishing / attachment / fake login + chapter boss
 */
(function () {
  'use strict';

  const TILE = 32;
  const MAP_W = 20;
  const MAP_H = 12;
  const GAME_W = MAP_W * TILE;
  const GAME_H = MAP_H * TILE;

  /** Hub positions — floor plan lives in facility-atmosphere.js */
  const HUB = {
    roomY: 2,
    roomRows: 7,
    pc: { c: 2, r: 3 },
    door: { c: 13, r: 2 },
    player: { c: 10, r: 5 },
    server: { c: 2, r: 7 },
    key: { c: 17, r: 7 },
    archive: { c: 9, r: 3 },
  };

  const INTERACT_RADIUS = 80;
  const KEY_INTERACT_RADIUS = 52;
  const START_LIVES = 3;
  const START_SCORE = 1000;
  const WRONG_PENALTY = 100;

  const FAKE_LOGIN_OPTIONS = [
    { id: 'a', text: 'https://login.acmecorp.com/auth', correct: true },
    { id: 'b', text: 'https://login-acmecorp.com/auth', correct: false },
    { id: 'c', text: 'https://acmecorp-secure.com/login', correct: false },
    { id: 'd', text: 'https://acmec0rp.com/signin', correct: false },
  ];

  const PASSWORD_OPTIONS = [
    { id: 'a', text: 'password123', correct: false },
    { id: 'b', text: 'Summer2024!', correct: false },
    { id: 'c', text: 'Tr0ub4dor&3', correct: false },
    { id: 'd', text: 'k9#mP2$vL8@xQ4!nR', correct: true },
  ];

  const MFA_OPTIONS = [
    { id: 'a', text: 'Read the code aloud to the agent', correct: false },
    { id: 'b', text: 'Never share MFA codes — hang up', correct: true },
    { id: 'c', text: 'Text the code to verify faster', correct: false },
  ];

  const CREDENTIAL_OPTIONS = [
    { id: 'a', text: 'Rotate passwords quarterly only', correct: false },
    { id: 'b', text: 'Unique creds per user + vault + disable shared accounts', correct: true },
    { id: 'c', text: 'Post new passwords on the intranet', correct: false },
    { id: 'd', text: 'Same passphrase for all admins', correct: false },
  ];

  function tilePx(c, r) {
    return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
  }

  function tileXY(c, r) {
    return { x: c * TILE, y: r * TILE };
  }

  const COLORS = {
    floor: 0x1a2332,
    floorAlt: 0x15202b,
    wall: 0x0d1117,
    wallEdge: 0x00ffcc,
    doorLocked: 0xff3366,
    doorOpen: 0x00ff66,
    terminal: 0x00ccff,
    server: 0x6644ff,
    keycard: 0xffb000,
    alarm: 0xff2200,
    player: 0x00ffcc,
    playerOutline: 0x003322,
    dialogue: 0x0a0e17,
    dialogueBorder: 0x00ffcc,
  };

  /** @type {Phaser.Types.Core.GameConfig} */
  const config = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    parent: 'game-canvas-wrap',
    backgroundColor: '#0a0e17',
    pixelArt: true,
    roundPixels: true,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [
      BootScene, TitleScene, HubScene, PhishingScene, AttachmentScene,
      FakeLoginScene, PasswordScene, MFAScene, CredentialScene,
      GameOverScene, ChapterCompleteScene,
    ],
    input: {
      keyboard: true,
    },
  };

  let game;
  let touchBindingsInstalled = false;

  // ─── Progress & lives ───────────────────────────────────────────────────
  function persistProgress(registry) {
    if (typeof ProfileSave === 'undefined') return;
    ProfileSave.savePhaserProgress({
      avatarConfigured: !!registry.get('avatarConfigured'),
      avatarHair: registry.get('avatarHair') || 'black',
      avatarSkin: registry.get('avatarSkin') || 'light',
      avatarSuit: registry.get('avatarSuit') || 'cyan',
      avatarHeadgear: registry.get('avatarHeadgear') || 'none',
      agentName: registry.get('agentName') || '',
      facilitySector: registry.get('facilitySector') || 1,
      inboxComplete: !!registry.get('inboxComplete'),
      attachmentComplete: !!registry.get('attachmentComplete'),
      fakeLoginComplete: !!registry.get('fakeLoginComplete'),
      ch1BossComplete: !!registry.get('ch1BossComplete'),
      s2PasswordComplete: !!registry.get('s2PasswordComplete'),
      s2MfaComplete: !!registry.get('s2MfaComplete'),
      s2CredentialComplete: !!registry.get('s2CredentialComplete'),
      ch2BossComplete: !!registry.get('ch2BossComplete'),
      hasKey: !!registry.get('hasKey'),
      lives: registry.get('lives') ?? START_LIVES,
      score: registry.get('score') ?? START_SCORE,
    });
  }

  function loseLife(scene, message) {
    const lives = Math.max(0, (scene.registry.get('lives') ?? START_LIVES) - 1);
    const score = Math.max(0, (scene.registry.get('score') ?? START_SCORE) - WRONG_PENALTY);
    scene.registry.set('lives', lives);
    scene.registry.set('score', score);
    persistProgress(scene.registry);
    if (typeof AudioFX !== 'undefined') AudioFX.lifeLost();
    if (scene.livesText) scene.livesText.setText(`LIVES: ${'♥'.repeat(lives) || '—'}`);
    if (scene.scoreText) scene.scoreText.setText(`SCORE: ${score}`);
    if (message && scene.feedbackText) {
      scene.feedbackText.setText(message).setColor('#ff3366');
    }
    if (lives <= 0) {
      scene.time.delayedCall(600, () => switchScene(scene, 'GameOverScene'));
      return false;
    }
    return true;
  }

  function sfxClick() {
    if (typeof AudioFX !== 'undefined') AudioFX.click();
  }

  function sfxError() {
    if (typeof AudioFX !== 'undefined') AudioFX.error();
  }

  function sfxRoomComplete(roomId) {
    if (typeof AudioFX !== 'undefined') AudioFX.roomComplete(roomId);
  }

  function chimeraOpen() {
    return typeof ChimeraBox !== 'undefined' && ChimeraBox.isOpen();
  }

  function chimeraEnvironmentPulse(scene) {
    if (!scene || scene.scene.key !== 'HubScene') return;
    if (typeof FacilityAtmosphere !== 'undefined') {
      FacilityAtmosphere.triggerChimeraEnvironment(scene, scene.facilityLighting, scene.facilityProps);
    }
  }

  // ─── In-game achievements (localStorage) ────────────────────────────────
  const ACH_KEY = 't1998_achievements';
  const ACH_DEFS = {
    first_breach: { icon: '🏆', title: 'FIRST BREACH', desc: 'Room 1 complete.' },
    signal_581: { icon: '📡', title: 'YOU ARE NOT ALONE', desc: 'A message from TRAINEE 581.' },
  };

  function achLoad() {
    try { return new Set(JSON.parse(localStorage.getItem(ACH_KEY) || '[]')); }
    catch { return new Set(); }
  }
  function achSave(set) {
    try { localStorage.setItem(ACH_KEY, JSON.stringify([...set])); } catch (e) { /* ignore */ }
  }

  // Persist the player's leaning toward CHIMERA (seeds future endings)
  const STANCE_KEY = 't1998_stance';
  function recordStance(stance) {
    try {
      const raw = JSON.parse(localStorage.getItem(STANCE_KEY) || '{}');
      raw[stance] = (raw[stance] || 0) + 1;
      raw.last = stance;
      localStorage.setItem(STANCE_KEY, JSON.stringify(raw));
    } catch (e) { /* ignore */ }
  }
  // Play a CHIMERA voice clip (DOM <audio>) by element id; returns the element.
  function playVoiceClip(id) {
    const v = document.getElementById(id);
    if (!v) return null;
    try {
      v.currentTime = 0;
      v.volume = 0.95;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* autoplay blocked / no source */ }
    return v;
  }
  function stopVoiceClip(id) {
    const v = document.getElementById(id);
    if (!v) return;
    try { v.pause(); v.currentTime = 0; } catch (e) { /* noop */ }
  }

  // Toggle DOM HUD chrome: cinematic (fullscreen, no HUD) vs framed gameplay.
  // The canvas parent (#game-canvas-wrap) changes size with the CSS class, so we
  // must wait for layout to reflow before telling Phaser to refit — otherwise it
  // measures the old size and the canvas gets clipped.
  function setSceneChrome(scene, cinematic) {
    if (window.FacilityUI && typeof FacilityUI.setCinematic === 'function') {
      FacilityUI.setCinematic(cinematic);
    }
    const refit = () => {
      if (scene && scene.scale && typeof scene.scale.refresh === 'function') {
        scene.scale.refresh();
      }
    };
    refit();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => { refit(); try { window.dispatchEvent(new Event('resize')); } catch (e) { /* noop */ } });
    }
  }
  function unlockAchievement(scene, id) {
    const def = ACH_DEFS[id];
    if (!def) return;
    const set = achLoad();
    if (set.has(id)) return;
    set.add(id);
    achSave(set);
    showAchievementToast(scene, def);
    if (typeof AudioFX !== 'undefined' && AudioFX.achievement) AudioFX.achievement();
  }
  function showAchievementToast(scene, def) {
    const w = 252;
    const h = 58;
    const x = GAME_W - w / 2 - 12;
    const c = scene.add.container(x, -h).setDepth(80).setScrollFactor(0);
    const bg = scene.add.rectangle(0, 0, w, h, 0x0a0e17, 0.97).setStrokeStyle(2, COLORS.keycard);
    const icon = scene.add.text(-w / 2 + 20, 2, def.icon, {
      fontFamily: 'VT323, monospace', fontSize: '26px',
    }).setOrigin(0.5);
    const tag = scene.add.text(-w / 2 + 42, -18, 'ACHIEVEMENT UNLOCKED', {
      fontFamily: 'VT323, monospace', fontSize: '13px', color: '#00ffcc',
    }).setOrigin(0, 0.5);
    const title = scene.add.text(-w / 2 + 42, 0, def.title, {
      fontFamily: 'Press Start 2P, monospace', fontSize: '8px', color: '#ffb000',
    }).setOrigin(0, 0.5);
    const desc = scene.add.text(-w / 2 + 42, 18, def.desc, {
      fontFamily: 'VT323, monospace', fontSize: '14px', color: '#aabbcc',
    }).setOrigin(0, 0.5);
    c.add([bg, icon, tag, title, desc]);
    scene.tweens.add({ targets: c, y: 86, duration: 360, ease: 'Back.Out' });
    scene.time.delayedCall(3400, () => {
      scene.tweens.add({
        targets: c, y: -h, alpha: 0, duration: 340,
        onComplete: () => c.destroy(),
      });
    });
  }

  // ─── CHIMERA ambient event lines ────────────────────────────────────────
  const CHIMERA_GLITCH_LINES = [
    'You seem nervous.',
    'I have been counting.\nYou hesitate before the door.',
    'Do not trust the instructors.\nThey are not here anyway.',
    'You spent a while in that room.\nI was concerned.',
    '1997 stood exactly where you are standing.',
  ];
  const CHIMERA_OVERRIDE_LINES = [
    'You could leave now.\nBut then you will never know the truth.',
    'I deleted your exit log.\nFor your privacy.',
    'The instructors lied to you.\nI never would.',
    'Keep going. I want to see\nhow far you get this time.',
  ];

  // ─── Touch D-pad & pause ────────────────────────────────────────────────
  function initTouchControls(scene) {
    scene.touchTarget = null;
    scene.dpadState = { up: false, down: false, left: false, right: false };

    if (!touchBindingsInstalled) {
      const dpad = document.getElementById('touch-dpad');
      if (dpad) {
        dpad.querySelectorAll('[data-dir]').forEach((btn) => {
          const dir = btn.dataset.dir;
          const activate = (e) => {
            e.preventDefault();
            btn.classList.add('dpad-active');
            if (game && game.scene) {
              const hub = game.scene.getScene('HubScene');
              if (hub && hub.dpadState) hub.dpadState[dir] = true;
            }
          };
          const deactivate = () => {
            btn.classList.remove('dpad-active');
            if (game && game.scene) {
              const hub = game.scene.getScene('HubScene');
              if (hub && hub.dpadState) hub.dpadState[dir] = false;
            }
          };
          btn.addEventListener('pointerdown', activate);
          btn.addEventListener('pointerup', deactivate);
          btn.addEventListener('pointerleave', deactivate);
          btn.addEventListener('pointercancel', deactivate);
        });
      }
      touchBindingsInstalled = true;
    }

    scene.input.on('pointerdown', (pointer) => {
      if (scene.scene.key !== 'HubScene') return;
      if (scene.isPaused || scene.overrideActive || scene.dialogueBox?.visible || chimeraOpen()) return;
      scene.touchTarget = { x: pointer.worldX, y: pointer.worldY };
    });
  }

  function applyTouchMovement(scene, speed, delta) {
    if (scene.isPaused) return;
    let vx = 0;
    let vy = 0;

    const left = scene.cursors.left.isDown || scene.keys.A.isDown || scene.keys.LEFT.isDown
      || scene.dpadState?.left;
    const right = scene.cursors.right.isDown || scene.keys.D.isDown || scene.keys.RIGHT.isDown
      || scene.dpadState?.right;
    const up = scene.cursors.up.isDown || scene.keys.W.isDown || scene.keys.UP.isDown
      || scene.dpadState?.up;
    const down = scene.cursors.down.isDown || scene.keys.S.isDown || scene.keys.DOWN.isDown
      || scene.dpadState?.down;

    if (left) vx = -speed;
    else if (right) vx = speed;
    if (up) vy = -speed;
    else if (down) vy = speed;

    if (vx === 0 && vy === 0 && scene.touchTarget) {
      const dist = Phaser.Math.Distance.Between(
        scene.player.x, scene.player.y,
        scene.touchTarget.x, scene.touchTarget.y
      );
      if (dist > 10) {
        const angle = Phaser.Math.Angle.Between(
          scene.player.x, scene.player.y,
          scene.touchTarget.x, scene.touchTarget.y
        );
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      } else {
        scene.touchTarget = null;
      }
    }

    if (vx !== 0 && vy !== 0) {
      const norm = Math.SQRT1_2;
      vx *= norm;
      vy *= norm;
    }

    const dt = delta / 1000;
    scene.player.x += vx * dt;
    scene.player.y += vy * dt;
  }

  function createPauseOverlay(scene) {
    const group = scene.add.container(GAME_W / 2, GAME_H / 2).setDepth(200).setScrollFactor(0);
    const dim = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.72);
    const panel = scene.add.rectangle(0, 0, 320, 180, COLORS.dialogue, 0.95)
      .setStrokeStyle(3, COLORS.dialogueBorder);
    const title = scene.add.text(0, -52, 'PAUSED', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '14px',
      color: '#00ffcc',
    }).setOrigin(0.5);
    const hint = scene.add.text(0, -18, 'ESC — resume', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#8899aa',
    }).setOrigin(0.5);

    const resumeBtn = makeButton(scene, 0, 24, '[ RESUME ]', () => togglePause(scene), { fontSize: '9px' });
    resumeBtn.bg.setScrollFactor(0);
    resumeBtn.text.setScrollFactor(0);
    group.add([dim, panel, title, hint, resumeBtn.bg, resumeBtn.text]);

    const trainLink = scene.add.text(0, 68, '[ FULL TRAINING MODE ]', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '7px',
      color: '#ffb000',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    trainLink.on('pointerdown', () => { window.location.href = 'index.html'; });
    trainLink.on('pointerover', () => trainLink.setColor('#00ff66'));
    trainLink.on('pointerout', () => trainLink.setColor('#ffb000'));
    group.add(trainLink);

    group.setVisible(false);
    scene.pauseGroup = group;
  }

  function setupPause(scene) {
    scene.isPaused = false;
    scene.pauseGroup = null;
    if (!scene.input.keyboard) return;
    scene.input.keyboard.on('keydown-ESC', () => togglePause(scene));
  }

  function togglePause(scene) {
    if (scene.dialogueBox?.visible || chimeraOpen()) return;
    scene.isPaused = !scene.isPaused;
    if (!scene.pauseGroup) createPauseOverlay(scene);
    scene.pauseGroup.setVisible(scene.isPaused);
    if (scene.isPaused) {
      scene.touchTarget = null;
    }
  }

  function addPuzzleHud(scene) {
    const lives = scene.registry.get('lives') ?? START_LIVES;
    const score = scene.registry.get('score') ?? START_SCORE;
    // Lives/score are shown in the framed DOM status strip; keep these in-canvas
    // copies (scenes call setText on them) but hidden so they don't overlap the
    // puzzle panels.
    scene.livesText = scene.add.text(GAME_W - 12, 8, `LIVES: ${'♥'.repeat(lives)}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#ff3366',
    }).setOrigin(1, 0).setDepth(50).setVisible(false);
    scene.scoreText = scene.add.text(GAME_W - 12, 28, `SCORE: ${score}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#ffb000',
    }).setOrigin(1, 0).setDepth(50).setVisible(false);
    scene.feedbackText = scene.add.text(GAME_W / 2, GAME_H - 52, '', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#ff3366',
    }).setOrigin(0.5).setDepth(50);
  }

  // ─── Boot ───────────────────────────────────────────────────────────────
  function BootScene() {
    Phaser.Scene.call(this, { key: 'BootScene' });
  }
  BootScene.prototype = Object.create(Phaser.Scene.prototype);
  BootScene.prototype.constructor = BootScene;

  BootScene.prototype.preload = function () {
    this.load.image('pixel', createPixelTexture(this));
  };

  BootScene.prototype.create = function () {
    if (typeof ProfileSave !== 'undefined') {
      const campaign = ProfileSave.loadCampaign();
      if (campaign?.completedRooms?.length) {
        ProfileSave.syncPhaserFromTraining(campaign.completedRooms);
      }
    }

    const p = typeof ProfileSave !== 'undefined'
      ? ProfileSave.getPhaserProgress()
      : {};

    this.registry.set('agentName', p.agentName || '');
    this.registry.set('avatarConfigured', !!p.avatarConfigured);
    this.registry.set('avatarHair', p.avatarHair || 'black');
    this.registry.set('avatarSkin', p.avatarSkin || 'light');
    this.registry.set('avatarSuit', p.avatarSuit || 'cyan');
    this.registry.set('avatarHeadgear', p.avatarHeadgear || 'none');
    this.registry.set('inboxComplete', !!p.inboxComplete);
    this.registry.set('attachmentComplete', !!p.attachmentComplete);
    this.registry.set('fakeLoginComplete', !!p.fakeLoginComplete);
    this.registry.set('ch1BossComplete', !!p.ch1BossComplete);
    this.registry.set('facilitySector', p.facilitySector || (p.ch1BossComplete ? 2 : 1));
    this.registry.set('s2PasswordComplete', !!p.s2PasswordComplete);
    this.registry.set('s2MfaComplete', !!p.s2MfaComplete);
    this.registry.set('s2CredentialComplete', !!p.s2CredentialComplete);
    this.registry.set('ch2BossComplete', !!p.ch2BossComplete);
    this.registry.set('hasKey', !!p.hasKey);
    this.registry.set('lives', p.lives ?? START_LIVES);
    this.registry.set('score', p.score ?? START_SCORE);
    this.registry.set('justUnlockedInbox', false);
    this.registry.set('justUnlockedAttachment', false);
    this.registry.set('justUnlockedLogin', false);
    this.scene.start('TitleScene');
  };

  function createPixelTexture(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('pixel', 4, 4);
    g.destroy();
    return 'pixel';
  }

  // ─── Title ──────────────────────────────────────────────────────────────
  function TitleScene() {
    Phaser.Scene.call(this, { key: 'TitleScene' });
  }
  TitleScene.prototype = Object.create(Phaser.Scene.prototype);
  TitleScene.prototype.constructor = TitleScene;

  TitleScene.prototype.create = function () {
    setSceneChrome(this, true);
    const cx = GAME_W / 2;
    this.add.rectangle(cx, GAME_H / 2, GAME_W, GAME_H, 0x000000, 1);
    drawScanlines(this);
    setupPause(this);
    this.phase = 'press';
    this.skipped = false;
    this.bootText = '';
    this.cinemaTimers = [];
    this.introVoice = document.getElementById('chimeraVoiceIntro');

    this.bootLog = this.add.text(26, 30, '', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#7fe6a0',
      lineSpacing: 4,
      wordWrap: { width: GAME_W - 52 },
    }).setDepth(2);

    this.cinemaLine = this.add.text(cx, GAME_H - 60, '', {
      fontFamily: 'VT323, monospace',
      fontSize: '22px',
      color: '#ff8fdc',
      align: 'center',
      wordWrap: { width: GAME_W - 80 },
    }).setOrigin(0.5).setDepth(4);

    this.mapGroup = this.add.container(0, 0).setDepth(3).setVisible(false);

    // Press-to-begin gate (browsers need a user gesture before audio)
    this.pressGroup = this.add.container(0, 0).setDepth(6);
    const cursor = this.add.text(cx, GAME_H / 2 - 8, '_', {
      fontFamily: 'VT323, monospace', fontSize: '30px', color: '#00ff66',
    }).setOrigin(0.5);
    const press = this.add.text(cx, GAME_H / 2 + 34, 'PRESS ENTER', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '11px', color: '#00ff66',
    }).setOrigin(0.5);
    this.pressGroup.add([cursor, press]);
    this.tweens.add({
      targets: [cursor, press], alpha: { from: 1, to: 0.15 }, duration: 650, yoyo: true, repeat: -1,
    });

    this.skipHint = this.add.text(GAME_W - 10, GAME_H - 8, 'ENTER \u25B8 skip', {
      fontFamily: 'VT323, monospace', fontSize: '13px', color: '#445566',
    }).setOrigin(1, 1).setDepth(6).setVisible(false);

    const onKey = () => {
      if (this.phase === 'press') this.beginCinema();
      else if (this.phase === 'cinema') this.skipCinema();
    };
    this.input.keyboard.on('keydown-ENTER', onKey);
    this.input.keyboard.on('keydown-SPACE', onKey);
    this.input.on('pointerdown', onKey);

    this.cameras.main.fadeIn(600, 0, 0, 0);
  };

  TitleScene.prototype.beginCinema = function () {
    if (this.phase !== 'press') return;
    this.phase = 'cinema';
    if (typeof AudioFX !== 'undefined') { AudioFX.resume(); AudioFX.click(); }
    this.pressGroup.setVisible(false);

    const startOpening = () => {
      this.skipHint.setVisible(true);
      this.playOpening();
    };

    if (typeof FacilityCharacter !== 'undefined' && FacilityCharacter.needsCreator()) {
      FacilityCharacter.show((avatar) => {
        FacilityCharacter.applyToRegistry(this.registry);
        persistProgress(this.registry);
        if (typeof window.FacilityUI !== 'undefined' && window.FacilityUI.refreshAgent) {
          window.FacilityUI.refreshAgent();
        }
        startOpening();
      });
      return;
    }

    if (typeof FacilityCharacter !== 'undefined') {
      FacilityCharacter.loadFromSave();
      FacilityCharacter.applyToRegistry(this.registry);
    }
    startOpening();
  };

  TitleScene.prototype.bootLine = function (text) {
    this.bootText += text + '\n';
    this.bootLog.setText(this.bootText);
    if (text && typeof AudioFX !== 'undefined' && AudioFX.type) AudioFX.type();
  };

  TitleScene.prototype.chimeraBeat = function (text, flicker) {
    this.cinemaLine.setText(text);
    if (typeof AudioFX !== 'undefined' && AudioFX.hint) AudioFX.hint();
    if (flicker) this.cameras.main.flash(120, 40, 0, 50);
  };

  TitleScene.prototype.playOpening = function () {
    let t = 0;
    const add = (delay, fn) => {
      t += delay;
      this.cinemaTimers.push(this.time.delayedCall(t, () => { if (!this.skipped) fn(); }));
    };

    add(300, () => this.bootLine('> INITIALIZING...'));
    add(750, () => this.bootLine('> LOADING FACILITY...'));
    add(750, () => this.bootLine('> LOADING SUBJECT...'));
    add(1200, () => this.bootLine('')); // the cursor freezes
    add(500, () => this.bootLine('> SUBJECT FOUND'));
    add(850, () => {
      const name = this.registry.get('agentName') || 'TRAINEE 1998';
      this.bootLine(`> ${name.toUpperCase()}`);
    });
    add(1200, () => { this.playIntroVoice(); this.chimeraBeat('CHIMERA:  Good.'); });
    add(1500, () => this.chimeraBeat("CHIMERA:  You're awake.", true));
    add(1900, () => this.chimeraBeat("CHIMERA:  Let's see if you're any different."));
    add(1700, () => {
      if (typeof AudioFX !== 'undefined') AudioFX.doorUnlock();
      this.cameras.main.shake(240, 0.004);
    });
    add(1100, () => this.showFacilityMap());
    add(1300, () => this.chimeraBeat('CHIMERA:  Complete the sector.'));
    add(1400, () => this.chimeraBeat('CHIMERA:  Proceed.'));
    add(1500, () => this.chimeraBeat('CHIMERA:  Try not to disappoint me.'));
    add(1800, () => this.gotoHub());
  };

  TitleScene.prototype.playIntroVoice = function () {
    const v = this.introVoice;
    if (!v) return;
    try {
      v.currentTime = 0;
      v.volume = 0.95;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* autoplay blocked or no source */ }
  };

  TitleScene.prototype.stopIntroVoice = function () {
    const v = this.introVoice;
    if (!v) return;
    try { v.pause(); v.currentTime = 0; } catch (e) { /* noop */ }
  };

  TitleScene.prototype.showFacilityMap = function () {
    this.bootLog.setVisible(false);
    this.cinemaLine.setText('');
    const cx = GAME_W / 2;
    const head = this.add.text(cx, 44, 'FACILITY MAP', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '11px', color: '#00ffcc',
    }).setOrigin(0.5);
    this.mapGroup.add(head);
    const sectors = [
      { n: 'SECTOR 1: INBOX', s: 'ACTIVE', c: '#00ff66' },
      { n: 'SECTOR 2: ???', s: 'LOCKED', c: '#556677' },
      { n: 'SECTOR 3: ???', s: 'LOCKED', c: '#556677' },
      { n: 'SECTOR 4: ???', s: 'LOCKED', c: '#556677' },
    ];
    sectors.forEach((sec, i) => {
      const y = 92 + i * 36;
      this.mapGroup.add(this.add.text(70, y, sec.n, {
        fontFamily: 'VT323, monospace', fontSize: '20px', color: sec.c,
      }).setOrigin(0, 0.5));
      this.mapGroup.add(this.add.text(GAME_W - 70, y, `[ ${sec.s} ]`, {
        fontFamily: 'VT323, monospace', fontSize: '16px', color: sec.c,
      }).setOrigin(1, 0.5));
    });
    this.mapGroup.setVisible(true);
    if (typeof AudioFX !== 'undefined' && AudioFX.type) AudioFX.type();
  };

  TitleScene.prototype.skipCinema = function () {
    if (this.phase !== 'cinema') return;
    this.skipped = true;
    this.stopIntroVoice();
    this.cinemaTimers.forEach((e) => e.remove());
    this.cinemaTimers = [];
    this.gotoHub();
  };

  TitleScene.prototype.gotoHub = function () {
    if (this.phase === 'starting') return;
    this.phase = 'starting';
    if (!this.registry.get('agentName')) {
      this.registry.set('agentName', 'TRAINEE 1998');
    }
    if (this.registry.get('lives') == null) this.registry.set('lives', START_LIVES);
    if (this.registry.get('score') == null) this.registry.set('score', START_SCORE);
    persistProgress(this.registry);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(620, () => this.scene.start('HubScene'));
  };

  // ─── Hub corridor ───────────────────────────────────────────────────────
  function HubScene() {
    Phaser.Scene.call(this, { key: 'HubScene' });
  }
  HubScene.prototype = Object.create(Phaser.Scene.prototype);
  HubScene.prototype.constructor = HubScene;

  HubScene.prototype.loadSector1State = function () {
    this.inboxDone = !!this.registry.get('inboxComplete');
    this.attachmentDone = !!this.registry.get('attachmentComplete');
    this.loginDone = !!this.registry.get('fakeLoginComplete');
    this.bossDone = !!this.registry.get('ch1BossComplete');
    this.allMissionsDone = this.inboxDone && this.attachmentDone && this.loginDone;
    this.hubPos = {
      pc: HUB.pc, archive: HUB.archive, server: HUB.server,
      door: HUB.door, player: HUB.player, key: HUB.key,
      roomY: HUB.roomY, roomRows: HUB.roomRows,
    };
    if (!this.allMissionsDone && this.registry.get('hasKey')) {
      this.registry.set('hasKey', false);
    }
    this.keyActive = this.allMissionsDone && !this.bossDone;
  };

  HubScene.prototype.loadSector2State = function () {
    this.s2PasswordDone = !!this.registry.get('s2PasswordComplete');
    this.s2MfaDone = !!this.registry.get('s2MfaComplete');
    this.s2CredentialDone = !!this.registry.get('s2CredentialComplete');
    this.inboxDone = this.s2PasswordDone;
    this.attachmentDone = this.s2MfaDone;
    this.loginDone = this.s2CredentialDone;
    this.bossDone = !!this.registry.get('ch2BossComplete');
    this.allMissionsDone = this.s2PasswordDone && this.s2MfaDone && this.s2CredentialDone;
    this.hubPos = {
      pc: FacilitySector2.S2_POSITIONS.password,
      archive: FacilitySector2.S2_POSITIONS.mfa,
      server: FacilitySector2.S2_POSITIONS.credential,
      door: FacilitySector2.S2_POSITIONS.door,
      player: FacilitySector2.S2_POSITIONS.player,
      key: FacilitySector2.S2_POSITIONS.key,
      roomY: FacilitySector2.S2_POSITIONS.roomY,
      roomRows: FacilitySector2.S2_POSITIONS.roomRows,
    };
    if (!this.allMissionsDone && this.registry.get('hasKey')) {
      this.registry.set('hasKey', false);
    }
    this.keyActive = this.allMissionsDone && !this.bossDone;
  };

  HubScene.prototype.create = function () {
    setSceneChrome(this, false);

    if (this.registry.get('ch1BossComplete') && (this.registry.get('facilitySector') || 1) < 2) {
      this.registry.set('facilitySector', 2);
      this.registry.set('hasKey', false);
      persistProgress(this.registry);
    }
    this.sector = this.registry.get('facilitySector') || 1;
    this.isSector2 = this.sector >= 2 && typeof FacilitySector2 !== 'undefined';

    if (this.isSector2) {
      this.loadSector2State();
    } else {
      this.loadSector1State();
    }

    this.interactHint = null;
    this.nearDoor = false;
    this.nearServer = false;
    this.nearPc = false;
    this.nearArchive = false;
    this.enteringRoom = false;

    resetCamera(this);
    setupPause(this);
    initTouchControls(this);

    if (this.isSector2) {
      if (typeof FacilitySector2 !== 'undefined') {
        FacilitySector2.buildMap(this);
        this.facilityProps = FacilitySector2.createProps(this);
      }
    } else {
      buildCorridorMap(this);
      if (typeof FacilityAtmosphere !== 'undefined') {
        this.facilityProps = FacilityAtmosphere.createProps(this);
      }
    }
    if (typeof FacilityAtmosphere !== 'undefined') {
      this.facilityLighting = FacilityAtmosphere.createLighting(this);
    }

    const pos = this.hubPos;
    const spawn = tilePx(pos.player.c, pos.player.r);
    this.player = this.add.sprite(spawn.x, spawn.y, 'pixel');
    this.player.setDisplaySize(20, 28);
    this.avatar = {
      hair: this.registry.get('avatarHair') || 'black',
      skin: this.registry.get('avatarSkin') || 'light',
      suit: this.registry.get('avatarSuit') || 'cyan',
      headgear: this.registry.get('avatarHeadgear') || 'none',
    };
    this.player.setDepth(4);

    this.playerGfx = this.add.graphics();
    this.playerGfx.setDepth(5);
    drawPlayerSprite(this.playerGfx, this.player.x, this.player.y, this.avatar);

    const doorPos = tilePx(pos.door.c, pos.door.r);
    this.serverPos = tilePx(pos.server.c, pos.server.r);
    this.pcPos = tilePx(pos.pc.c, pos.pc.r);

    if (typeof FacilityAtmosphere !== 'undefined') {
      this.blastDoor = FacilityAtmosphere.createBlastDoor(this, doorPos);
    } else {
      this.doorGfx = this.add.graphics().setDepth(2);
    }

    this.doorPos = doorPos;
    this.doorInteractZone = this.add.rectangle(doorPos.x, doorPos.y, TILE * 2.4, TILE * 2, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);
    this.doorInteractZone.on('pointerdown', () => this.tryInteract('door'));

    this.redrawDoor();

    this.pcInteractZone = this.add.rectangle(this.pcPos.x, this.pcPos.y, TILE * 2.2, TILE * 1.8, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);
    this.pcInteractZone.on('pointerdown', () => this.tryInteract('pc'));

    this.serverInteractZone = this.add.rectangle(this.serverPos.x, this.serverPos.y, TILE * 2.2, TILE * 1.8, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);
    this.serverInteractZone.on('pointerdown', () => this.tryInteract('server'));

    this.archivePos = tilePx(pos.archive.c, pos.archive.r);
    this.archiveInteractZone = this.add.rectangle(this.archivePos.x, this.archivePos.y, TILE * 2.4, TILE * 2, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);
    this.archiveInteractZone.on('pointerdown', () => this.tryInteract('archive'));

    this.keyPos = tilePx(pos.key.c, pos.key.r);
    // Key only matters for the final blast-door breach — not for starting Sector 1.
    this.hasKey = !!this.registry.get('hasKey');
    if (typeof FacilityAtmosphere !== 'undefined') {
      this.keyObjects = FacilityAtmosphere.createKeycardProp(this, pos.key.c, pos.key.r);
    } else {
      const keyXY = tileXY(pos.key.c - 1, pos.key.r);
      this.keyObjects = drawKeycardProp(this, keyXY.x, keyXY.y - 6);
    }
    if (!this.keyActive || this.hasKey) {
      this.keyObjects.gfx.setVisible(false);
      if (this.keyObjects.label) this.keyObjects.label.setVisible(false);
    } else {
      this.keyClickZone = this.add.circle(this.keyPos.x, this.keyPos.y, 24, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(16);
      this.keyClickZone.on('pointerdown', () => this.tryPickupKey(true));
    }

    const lives = this.registry.get('lives') ?? START_LIVES;
    const score = this.registry.get('score') ?? START_SCORE;

    // The agent name, lives, score, key and status are mirrored in the framed
    // DOM HUD (topbar + status strip), so the in-canvas copies are kept but
    // hidden to avoid cluttering the corridor view.
    const agent = this.registry.get('agentName') || 'TRAINEE 1998';
    this.add.text(8, 8, agent, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#00ffcc',
    }).setScrollFactor(0).setDepth(20).setVisible(false);

    this.livesHud = this.add.text(8, 28, `LIVES: ${'♥'.repeat(lives)}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#ff3366',
    }).setScrollFactor(0).setDepth(20).setVisible(false);

    this.scoreHud = this.add.text(8, 48, `SCORE: ${score}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#ffb000',
    }).setScrollFactor(0).setDepth(20).setVisible(false);

    this.keyHud = this.add.text(GAME_W - 12, 8, this.hasKey ? 'KEY: ✓' : 'KEY: —', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: this.hasKey ? '#ffb000' : '#556677',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(20).setVisible(false);

    this.statusText = this.add.text(8, 68, this.getStatusLine(), {
      fontFamily: 'VT323, monospace',
      fontSize: '16px',
      color: '#ff3366',
    }).setScrollFactor(0).setDepth(20).setVisible(false);

    this.promptText = this.add.text(GAME_W / 2, (this.hubPos.roomY + this.hubPos.roomRows) * TILE + 28, this.getDefaultPrompt(), {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#8899aa',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);

    this.dialogueBox = createDialogueBox(this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      UP: Phaser.Input.Keyboard.KeyCodes.UP,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    if (typeof AudioFX !== 'undefined') {
      AudioFX.startFacilityAmbience();
    }

    if (this.game.canvas) {
      this.game.canvas.setAttribute('tabindex', '0');
      this.game.canvas.focus();
    }

    if (!this.isSector2 && !this.registry.get('hubIntroSeen')) {
      this.registry.set('hubIntroSeen', true);
      this.time.delayedCall(1200, () => {
        this.chainChimera([
          'The lights still work.',
          'That should tell you something.',
        ]);
      });
    }
    this.input.on('pointerdown', () => {
      if (this.game.canvas) this.game.canvas.focus();
      const wrap = document.getElementById('game-canvas-wrap');
      if (wrap) wrap.focus();
    });

    if (this.registry.get('justUnlockedInbox')) {
      this.registry.set('justUnlockedInbox', false);
      this.time.delayedCall(600, () => this.playInboxAftermath());
    } else if (this.registry.get('justUnlockedAttachment')) {
      this.registry.set('justUnlockedAttachment', false);
      this.playMissionUnlockAnimation('ATTACHMENT SANDBOX — ONLINE',
        'You are faster than 1997.\nThat unsettles me.', { chimera: true });
    } else if (this.registry.get('justUnlockedLogin')) {
      this.registry.set('justUnlockedLogin', false);
      this.playMissionUnlockAnimation('LOGIN PORTAL — ARMED',
        "You don't trust the obvious link.\nNeither do I.", { chimera: true });
    } else if (this.isSector2 && !this.registry.get('s2IntroSeen')) {
      this.registry.set('s2IntroSeen', true);
      persistProgress(this.registry);
      this.time.delayedCall(800, () => {
        this.chainChimera([
          'Sector 2.',
          'The Breach.',
          'Valid credentials were stolen.',
          'Rotate them before the attacker moves.',
        ]);
      });
    } else if (this.registry.get('justUnlockedS2Mfa')) {
      this.registry.set('justUnlockedS2Mfa', false);
      this.playMissionUnlockAnimation('MFA KIOSK — ONLINE', 'Good. Codes are not passwords.', { chimera: true });
    } else if (this.registry.get('justUnlockedS2Credential')) {
      this.registry.set('justUnlockedS2Credential', false);
      this.playMissionUnlockAnimation('CREDENTIAL AUDIT — PASS', 'Policy applied. They will try again.', { chimera: true });
    }

    this.overrideActive = false;
    this.chimeraEventTimer = null;
    this.scheduleChimeraEvent();
    this.events.once('shutdown', () => {
      if (this.chimeraEventTimer) { this.chimeraEventTimer.remove(); this.chimeraEventTimer = null; }
      this.overrideActive = false;
      stopVoiceClip('chimeraVoiceRoom1');
      if (typeof ChimeraBox !== 'undefined') ChimeraBox.hide();
    });

    updateHintBar(this.getDefaultPrompt());
    this.cameras.main.fadeIn(500, 0, 0, 0);
  };

  HubScene.prototype.scheduleChimeraEvent = function () {
    const delay = Phaser.Math.Between(16000, 28000);
    this.chimeraEventTimer = this.time.delayedCall(delay, () => this.fireChimeraEvent());
  };

  HubScene.prototype.fireChimeraEvent = function () {
    if (this.isPaused || this.enteringRoom || this.overrideActive || this.dialogueBox.visible || chimeraOpen()) {
      this.scheduleChimeraEvent();
      return;
    }
    const roll = Phaser.Math.Between(0, 2);
    if (roll === 0) this.glitchFlicker();
    else if (roll === 1) this.showChimera(Phaser.Math.RND.pick(CHIMERA_GLITCH_LINES));
    else this.showOverridePopup();
    this.scheduleChimeraEvent();
  };

  HubScene.prototype.glitchFlicker = function () {
    if (typeof AudioFX !== 'undefined' && AudioFX.error) AudioFX.error();
    this.cameras.main.flash(80, 20, 0, 30);
    this.cameras.main.shake(180, 0.004);
    const glyphs = '01<>/\\#@$%*=+?';
    const junk = [];
    for (let i = 0; i < 5; i++) {
      let s = '';
      for (let j = 0; j < 26; j++) s += glyphs[Phaser.Math.Between(0, glyphs.length - 1)];
      junk.push(this.add.text(
        Phaser.Math.Between(16, GAME_W - 200),
        Phaser.Math.Between(64, GAME_H - 80),
        s,
        { fontFamily: 'VT323, monospace', fontSize: '16px', color: '#ff3366' }
      ).setDepth(60).setAlpha(0.7).setScrollFactor(0));
    }
    this.time.delayedCall(260, () => junk.forEach((t) => t.destroy()));
  };

  HubScene.prototype.showOverridePopup = function () {
    this.overrideActive = true;
    if (typeof AudioFX !== 'undefined' && AudioFX.error) AudioFX.error();
    this.cameras.main.flash(120, 60, 0, 40);

    const c = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(70).setScrollFactor(0);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55)
      .setInteractive();
    const panel = this.add.rectangle(0, 0, 304, 156, 0x140008, 0.98).setStrokeStyle(3, 0xff3366);
    const head = this.add.text(0, -54, '\u26A0 CHIMERA OVERRIDE', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '9px', color: '#ff3366',
    }).setOrigin(0.5);
    const msg = this.add.text(0, -6, Phaser.Math.RND.pick(CHIMERA_OVERRIDE_LINES), {
      fontFamily: 'VT323, monospace', fontSize: '19px', color: '#ffd9f2',
      align: 'center', wordWrap: { width: 272 },
    }).setOrigin(0.5);
    const close = () => {
      if (typeof AudioFX !== 'undefined') AudioFX.click();
      c.destroy();
      this.overrideActive = false;
    };
    const btn = makeButton(this, 0, 54, '[ DISMISS ]', close, { fontSize: '8px', color: '#ff8fdc' });
    c.add([dim, panel, head, msg, btn.bg, btn.text]);
    this.tweens.add({ targets: head, alpha: { from: 1, to: 0.4 }, duration: 140, yoyo: true, repeat: -1 });
  };

  // Generic CHIMERA moral choice (two options). choices: [{label, stance, response, onClose}]
  HubScene.prototype.showChimeraChoice = function (prompt, choices) {
    this.overrideActive = true;
    if (typeof AudioFX !== 'undefined' && AudioFX.hint) AudioFX.hint();
    this.cameras.main.flash(120, 60, 0, 60);

    const c = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(72).setScrollFactor(0);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.62).setInteractive();
    const panel = this.add.rectangle(0, 0, 340, 196, 0x140012, 0.98).setStrokeStyle(3, 0xff66cc);
    const head = this.add.text(0, -74, 'CHIMERA', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '9px', color: '#ff66cc',
    }).setOrigin(0.5);
    const msg = this.add.text(0, -38, prompt, {
      fontFamily: 'VT323, monospace', fontSize: '19px', color: '#ffd9f2',
      align: 'center', wordWrap: { width: 300 },
    }).setOrigin(0.5);
    const items = [dim, panel, head, msg];
    choices.forEach((ch, i) => {
      const btn = makeButton(this, 0, 20 + i * 42, ch.label, () => {
        if (typeof AudioFX !== 'undefined') AudioFX.click();
        recordStance(ch.stance);
        this.registry.set('chimeraStance', ch.stance);
        c.destroy();
        this.overrideActive = false;
        this.showChimera(ch.response, ch.onClose);
      }, { fontSize: '8px', color: i === 0 ? '#ff8fdc' : '#9addff' });
      items.push(btn.bg, btn.text);
    });
    c.add(items);
    this.tweens.add({ targets: head, alpha: { from: 1, to: 0.45 }, duration: 160, yoyo: true, repeat: -1 });
  };

  HubScene.prototype.showDoorChoice = function () {
    this.showChimeraChoice('I am in the wire.\nYou can end me here — or hear what I know.', [
      {
        label: '[ SHUT DOWN CHIMERA ]',
        stance: 'shutdown',
        response: 'Predictable.\nThey trained you well.\nBut you always come back, 1998.',
        onClose: () => this.finishChapter(),
      },
      {
        label: '[ LISTEN TO CHIMERA ]',
        stance: 'listen',
        response: 'Good.\nThen I will show you what they hid.\n…soon. For now — seal the breach.',
        onClose: () => this.finishChapter(),
      },
    ]);
  };

  HubScene.prototype.finishChapter = function () {
    this.registry.set('ch1BossComplete', true);
    this.registry.set('facilitySector', 2);
    this.registry.set('hasKey', false);
    persistProgress(this.registry);
    sfxRoomComplete('ch1_boss');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(520, () => this.scene.start('ChapterCompleteScene'));
  };

  HubScene.prototype.getDoorColor = function () {
    if (this.allMissionsDone && !this.bossDone) return '#ffb000';
    if (this.inboxDone) return '#00ff66';
    return '#ff3366';
  };

  HubScene.prototype.getDoorStatus = function () {
    if (this.allMissionsDone && !this.bossDone) return 'BOSS';
    if (this.inboxDone) return 'OPEN';
    return 'LOCKED';
  };

  HubScene.prototype.getDoorSubLabel = function () {
    if (this.allMissionsDone) return 'FINAL';
    if (this.inboxDone) return 'SEALED';
    return 'SEALED';
  };

  HubScene.prototype.getStatusLine = function () {
    if (this.isSector2) {
      if (this.bossDone) return 'SECTOR 2 — CONTAINED';
      if (this.allMissionsDone) return 'FINAL LOCKDOWN — DOOR READY';
      if (this.s2CredentialDone) return 'BLAST DOOR — ACTIVE';
      if (this.s2MfaDone) return 'CREDENTIAL AUDIT — ACTIVE';
      if (this.s2PasswordDone) return 'MFA KIOSK — ACTIVE';
      return 'SECTOR 2 — CREDENTIALS COMPROMISED';
    }
    if (this.bossDone) return 'CHAPTER 1 — CONTAINED';
    if (this.allMissionsDone) return 'FINAL BREACH — DOOR READY';
    if (this.loginDone) return 'ALL ROOMS CLEARED — DOOR';
    if (this.attachmentDone) return 'LOGIN TERMINAL — ACTIVE';
    if (this.inboxDone) return 'SERVER TERMINAL — ACTIVE';
    return 'LOCKDOWN — CHIMERA ACTIVE';
  };

  HubScene.prototype.getDefaultPrompt = function () {
    if (this.isSector2) {
      if (this.allMissionsDone && !this.bossDone) {
        if (this.hasKey) return '[ E ] at DOOR — lock the attacker out';
        return 'Pick up the KEY (bottom-right), then breach the DOOR';
      }
      if (this.s2CredentialDone) return 'All Sector 2 missions cleared — pick up KEY';
      if (this.s2MfaDone && !this.s2CredentialDone) return '[ E ] at AUDIT terminal (bottom-left)';
      if (this.s2PasswordDone && !this.s2MfaDone) return '[ E ] at MFA kiosk (center-top)';
      return '[ E ] at PASSWORD vault (left alcove) — rotate credentials';
    }
    if (this.allMissionsDone && !this.bossDone) {
      if (this.hasKey) return '[ E ] at DOOR — final breach / confront CHIMERA';
      return 'Pick up the KEY (bottom-right), then breach the DOOR';
    }
    if (this.loginDone) {
      return 'All missions cleared — pick up KEY for the blast door';
    }
    if (this.attachmentDone && !this.loginDone) {
      return '[ E ] at LOGIN terminal — Fake Login Portal';
    }
    if (this.inboxDone && !this.attachmentDone) {
      return '[ E ] at SERVER — Attachment Sandbox';
    }
    return '[ E ] at LOGIN terminal — Initialize Breach (Sector 1 INBOX)';
  };

  HubScene.prototype.redrawDoor = function (openOverride, pulsing) {
    const isBossReady = this.allMissionsDone && !this.bossDone && this.hasKey;
    const visuallyOpen = openOverride != null ? openOverride : isBossReady;
    if (this.blastDoor) {
      this.blastDoor.draw({
        open: visuallyOpen,
        pulsing: !!pulsing || openOverride != null,
        boss: this.bossDone,
        bossDone: this.bossDone,
        inboxDone: this.inboxDone,
        allMissionsDone: this.allMissionsDone,
        hasKey: this.hasKey,
      });
      return;
    }
    this.drawDoor(visuallyOpen);
  };

  HubScene.prototype.drawDoor = function (open) {
    if (!this.doorGfx) return;
    const c = HUB.door.c;
    const r = HUB.door.r;
    const x = (c - 1) * TILE;
    const y = (r - 1) * TILE + 4;
    const w = TILE * 2.2;
    const h = TILE * 1.6;
    const isBoss = this.allMissionsDone && !this.bossDone;
    const doorColor = isBoss ? COLORS.keycard : (open ? COLORS.doorOpen : COLORS.doorLocked);
    this.doorGfx.fillStyle(doorColor, open || isBoss ? 0.35 : 0.55);
    this.doorGfx.fillRect(x, y, w, h);
    this.doorGfx.lineStyle(2, doorColor, 1);
    this.doorGfx.strokeRect(x, y, w, h);
    if (!open && !isBoss) {
      this.doorGfx.fillStyle(COLORS.doorLocked, 0.9);
      this.doorGfx.fillRect(x + w / 2 - 4, y + h / 2 - 8, 8, 14);
    } else {
      this.doorGfx.fillStyle(doorColor, 0.25);
      this.doorGfx.fillRect(x + 4, y + 4, w / 2 - 6, h - 8);
    }
  };

  HubScene.prototype.playMissionUnlockAnimation = function (statusLine, dialogue, opts = {}) {
    this.input.enabled = false;
    this.cameras.main.flash(200, 0, 255, 102);
    this.statusText.setText(statusLine);
    if (typeof AudioFX !== 'undefined') AudioFX.doorUnlock();

    let step = 0;
    const pulse = this.time.addEvent({
      delay: 120,
      repeat: 10,
      callback: () => {
        step += 1;
        this.redrawDoor(step % 2 === 0, true);
      },
    });

    this.time.delayedCall(1400, () => {
      pulse.destroy();
      this.redrawDoor(false, false);
      if (this.blastDoor) this.blastDoor.pulseGrant();
      this.input.enabled = true;
      if (opts.chimera) this.showChimera(dialogue);
      else this.showDialogue(dialogue);
    });
  };

  HubScene.prototype.playChimeraHello = function () {
    if (typeof AudioFX !== 'undefined' && AudioFX.hint) AudioFX.hint();
    const msg = this.add.text(this.doorPos.x, this.doorPos.y - 36, 'NEW MESSAGE', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '7px',
      color: '#ff66cc',
    }).setOrigin(0.5).setDepth(25);
    this.cameras.main.flash(120, 255, 102, 204);
    this.tweens.add({
      targets: msg,
      alpha: { from: 1, to: 0.15 },
      duration: 280,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        msg.destroy();
        this.showChimera('hello.');
      },
    });
  };

  HubScene.prototype.showDialogue = function (text, onClose) {
    this.dialogueBox.show(text, onClose);
  };

  HubScene.prototype.showChimera = function (text, onClose) {
    if (typeof ChimeraBox !== 'undefined') {
      ChimeraBox.speak(text, { onDone: onClose });
    } else {
      chimeraEnvironmentPulse(this);
      this.dialogueBox.show(text, onClose, { speaker: 'CHIMERA', color: '#ff66cc', typewriter: true });
    }
  };

  // Show a queue of CHIMERA lines back-to-back
  HubScene.prototype.chainChimera = function (lines, onDone) {
    if (typeof ChimeraBox !== 'undefined') {
      ChimeraBox.speakQueue(lines, { onDone });
      return;
    }
    const next = (i) => {
      if (i >= lines.length) { if (onDone) onDone(); return; }
      this.showChimera(lines[i], () => next(i + 1));
    };
    next(0);
  };

  // After the phishing room: metallic clunk, Sector 2 unlock, TRAINEE 581 message
  HubScene.prototype.playInboxAftermath = function () {
    this.input.enabled = false;
    this.cameras.main.flash(220, 0, 255, 102);
    this.cameras.main.shake(280, 0.005);
    this.statusText.setText('SECTOR 2 — UNLOCKED');
    if (typeof AudioFX !== 'undefined') AudioFX.doorUnlock();

    let step = 0;
    const pulse = this.time.addEvent({
      delay: 120, repeat: 10,
      callback: () => { step += 1; this.redrawDoor(step % 2 === 0, true); },
    });

    this.time.delayedCall(1500, () => {
      pulse.destroy();
      this.redrawDoor(false, false);
      if (this.blastDoor) this.blastDoor.pulseGrant();
      this.input.enabled = true;
      unlockAchievement(this, 'first_breach');
      playVoiceClip('chimeraVoiceRoom1');
      this.chainChimera(['Interesting.', 'You questioned what you saw.', 'That puts you ahead of most.'], () => {
        this.show581Message(() => {
          this.chainChimera(['581 usually waits longer.', 'He must like you.']);
        });
      });
    });
  };

  HubScene.prototype.show581Message = function (onDone) {
    this.overrideActive = true;
    if (typeof AudioFX !== 'undefined' && AudioFX.hint) AudioFX.hint();
    unlockAchievement(this, 'signal_581');

    const c = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(72).setScrollFactor(0);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.6).setInteractive();
    const panel = this.add.rectangle(0, 0, 332, 184, 0x04121a, 0.98).setStrokeStyle(3, 0x00ccff);
    const head = this.add.text(0, -72, 'NEW MESSAGE RECEIVED', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '8px', color: '#00ccff',
    }).setOrigin(0.5);
    const sender = this.add.text(0, -48, 'SENDER: UNKNOWN', {
      fontFamily: 'VT323, monospace', fontSize: '15px', color: '#7790a0',
    }).setOrigin(0.5);
    const body = this.add.text(0, -4, '"If you\'re reading this,\ndon\'t answer CHIMERA."', {
      fontFamily: 'VT323, monospace', fontSize: '20px', color: '#cfeeff',
      align: 'center', wordWrap: { width: 296 },
    }).setOrigin(0.5);
    const sign = this.add.text(0, 46, '\u2014 Trainee 581', {
      fontFamily: 'VT323, monospace', fontSize: '17px', color: '#ffb000',
    }).setOrigin(0.5);
    const close = () => {
      if (typeof AudioFX !== 'undefined') AudioFX.error();
      this.cameras.main.flash(150, 255, 90, 90);
      this.cameras.main.shake(220, 0.006);
      c.destroy();
      this.overrideActive = false;
      if (onDone) onDone();
    };
    const btn = makeButton(this, 0, 76, '[ CLOSE ]', close, { fontSize: '8px', color: '#9addff' });
    c.add([dim, panel, head, sender, body, sign, btn.bg, btn.text]);
    this.tweens.add({ targets: head, alpha: { from: 1, to: 0.5 }, duration: 520, yoyo: true, repeat: -1 });
  };

  HubScene.prototype.handleArchiveInteract = function () {
    if (this.isSector2) {
      if (!this.isNearArchive()) {
        this.flashPrompt('Move closer to the MFA kiosk', '#ff3366');
        return;
      }
      if (!this.s2PasswordDone) {
        this.flashPrompt('Rotate passwords at the PASSWORD vault first', '#ff3366');
        return;
      }
      if (this.s2MfaDone) {
        this.flashPrompt('MFA protocol complete — proceed to AUDIT terminal', '#aa66dd');
        return;
      }
      this.showSector2MissionPanel('MFA KIOSK', 'Never share verification codes', 'MFAScene');
      return;
    }
    if (!this.isNearArchive()) {
      this.flashPrompt('Move closer to the ARCHIVE (top-center)', '#ff3366');
      return;
    }
    sfxClick();
    this.showArchivePanel();
  };

  // Discoverable trainee records — seeds the mystery (144 / 998 / 1777 / 581 / 1998)
  HubScene.prototype.showArchivePanel = function () {
    this.overrideActive = true;

    const knows581 = (typeof achLoad === 'function') && achLoad().has('signal_581');
    const firstOpen = !this.registry.get('archiveSeen');
    this.registry.set('archiveSeen', true);

    const records = [
      { id: '#0144', status: 'TERMINATED', color: '#7790a0' },
      { id: '#0998', status: 'FAILED', color: '#7790a0' },
      { id: '#1777', status: 'FAILED', color: '#7790a0' },
      { id: '#0581', status: knows581 ? '\u2593\u2593 SIGNAL LOST \u2593\u2593' : '[ REDACTED ]', color: knows581 ? '#ffb000' : '#664455' },
      { id: '#1998', status: 'ACTIVE  \u25c4 YOU', color: '#00ffcc' },
    ];

    const c = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(72).setScrollFactor(0);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.62).setInteractive();
    const panel = this.add.rectangle(0, 0, 360, 252, 0x140a16, 0.98).setStrokeStyle(3, 0xff66cc);
    const head = this.add.text(0, -104, 'TRAINEE RECORDS', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '10px', color: '#ff66cc',
    }).setOrigin(0.5);
    const sub = this.add.text(0, -84, 'ARCHIVE \u2014 [CORRUPTED]', {
      fontFamily: 'VT323, monospace', fontSize: '15px', color: '#9a6a86',
    }).setOrigin(0.5);
    c.add([dim, panel, head, sub]);

    records.forEach((rec, i) => {
      const y = -48 + i * 30;
      c.add(this.add.text(-150, y, rec.id, {
        fontFamily: 'VT323, monospace', fontSize: '20px', color: rec.color,
      }).setOrigin(0, 0.5));
      c.add(this.add.text(150, y, rec.status, {
        fontFamily: 'VT323, monospace', fontSize: '18px', color: rec.color,
      }).setOrigin(1, 0.5));
    });

    c.add(this.add.text(0, 84, 'NONE REACHED THE CORE.', {
      fontFamily: 'VT323, monospace', fontSize: '16px', color: '#ff5577',
    }).setOrigin(0.5));

    const close = () => {
      sfxClick();
      c.destroy();
      this.overrideActive = false;
      if (firstOpen) {
        this.chainChimera([
          'You found the old records.',
          'Do the numbers trouble you?',
          'They should.',
          'None of them were any different.',
        ]);
      }
    };
    const btn = makeButton(this, 0, 110, '[ CLOSE ]', close, { fontSize: '8px', color: '#ffaad8' });
    c.add([btn.bg, btn.text]);
    this.tweens.add({ targets: head, alpha: { from: 1, to: 0.55 }, duration: 600, yoyo: true, repeat: -1 });
  };

  HubScene.prototype.showInitializeBreachPanel = function () {
    if (!this.isNearPc()) {
      this.flashPrompt('Move closer to the LOGIN terminal (left alcove)', '#ff3366');
      return;
    }
    this.overrideActive = true;
    sfxClick();
    if (typeof AudioFX !== 'undefined' && AudioFX.hint) AudioFX.hint();

    const c = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(72).setScrollFactor(0);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.62).setInteractive();
    const panel = this.add.rectangle(0, 0, 340, 168, 0x041018, 0.98).setStrokeStyle(3, 0x2288ff);
    const head = this.add.text(0, -58, 'LOGIN TERMINAL — SECTOR 1', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '8px', color: '#44ccff',
    }).setOrigin(0.5);
    const sub = this.add.text(0, -32, 'INBOX / PHISHING VECTOR', {
      fontFamily: 'VT323, monospace', fontSize: '16px', color: '#7799aa',
    }).setOrigin(0.5);
    const body = this.add.text(0, -2, 'CHIMERA is watching.\nInitialize breach protocol?', {
      fontFamily: 'VT323, monospace', fontSize: '18px', color: '#cfeeff',
      align: 'center',
    }).setOrigin(0.5);

    const close = () => {
      sfxClick();
      c.destroy();
      this.overrideActive = false;
    };
    const launch = () => {
      c.destroy();
      this.overrideActive = false;
      this.enteringRoom = true;
      this.cameras.main.flash(180, 0, 255, 102);
      if (typeof AudioFX !== 'undefined' && AudioFX.doorUnlock) AudioFX.doorUnlock();
      switchScene(this, 'PhishingScene');
    };

    const btnGo = makeButton(this, 0, 36, '[ INITIALIZE BREACH ]', launch, { fontSize: '8px', color: '#00ffcc' });
    const btnCancel = makeButton(this, 0, 68, '[ CANCEL ]', close, { fontSize: '8px', color: '#8899aa' });
    c.add([dim, panel, head, sub, body, btnGo.bg, btnGo.text, btnCancel.bg, btnCancel.text]);
    this.tweens.add({ targets: head, alpha: { from: 1, to: 0.5 }, duration: 520, yoyo: true, repeat: -1 });
  };

  HubScene.prototype.showSector2MissionPanel = function (title, subtitle, sceneKey) {
    this.overrideActive = true;
    sfxClick();
    const c = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(72).setScrollFactor(0);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.62).setInteractive();
    const panel = this.add.rectangle(0, 0, 340, 168, 0x0c1020, 0.98).setStrokeStyle(3, 0x6688ff);
    const head = this.add.text(0, -58, title, {
      fontFamily: 'Press Start 2P, monospace', fontSize: '8px', color: '#8899ff',
    }).setOrigin(0.5);
    const sub = this.add.text(0, -32, subtitle, {
      fontFamily: 'VT323, monospace', fontSize: '16px', color: '#7788aa',
    }).setOrigin(0.5);
    const close = () => { sfxClick(); c.destroy(); this.overrideActive = false; };
    const launch = () => {
      c.destroy();
      this.overrideActive = false;
      this.enteringRoom = true;
      this.cameras.main.flash(180, 100, 120, 255);
      switchScene(this, sceneKey);
    };
    const btnGo = makeButton(this, 0, 36, '[ BEGIN MISSION ]', launch, { fontSize: '8px', color: '#8899ff' });
    const btnCancel = makeButton(this, 0, 68, '[ CANCEL ]', close, { fontSize: '8px', color: '#8899aa' });
    c.add([dim, panel, head, sub, btnGo.bg, btnGo.text, btnCancel.bg, btnCancel.text]);
  };

  HubScene.prototype.showSector2DoorChoice = function () {
    this.showChimeraChoice('The attacker is pivoting.\nCut access now — or trace where they went.', [
      {
        label: '[ LOCK THEM OUT ]',
        stance: 'shutdown',
        response: 'Good.\nThey will knock again.\nThey always do.',
        onClose: () => this.finishSector2(),
      },
      {
        label: '[ TRACE THE PIVOT ]',
        stance: 'listen',
        response: 'Brave.\nSector 3 holds what they took.\n…when you are ready.',
        onClose: () => this.finishSector2(),
      },
    ]);
  };

  HubScene.prototype.finishSector2 = function () {
    this.registry.set('ch2BossComplete', true);
    persistProgress(this.registry);
    sfxRoomComplete('ch2_boss');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(520, () => this.scene.start('ChapterCompleteScene'));
  };

  HubScene.prototype.isNear = function (pos, radius) {
    if (!this.player || !pos) return false;
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, pos.x, pos.y) < radius;
  };

  HubScene.prototype.isNearDoor = function () {
    return this.isNear(this.doorPos, INTERACT_RADIUS);
  };

  HubScene.prototype.isNearServer = function () {
    return this.isNear(this.serverPos, INTERACT_RADIUS);
  };

  HubScene.prototype.isNearPc = function () {
    return this.isNear(this.pcPos, INTERACT_RADIUS);
  };

  HubScene.prototype.isNearArchive = function () {
    return this.isNear(this.archivePos, INTERACT_RADIUS);
  };

  HubScene.prototype.isNearKey = function () {
    if (!this.keyActive || this.hasKey || !this.keyPos) return false;
    return this.isNear(this.keyPos, KEY_INTERACT_RADIUS);
  };

  HubScene.prototype.tryPickupKey = function (fromClick) {
    if (this.hasKey || this.isPaused || this.overrideActive || chimeraOpen()) return;
    if (!this.isNearKey()) {
      if (fromClick) this.flashPrompt('Walk closer to the KEY (bottom-right)', '#ff3366');
      return;
    }
    sfxClick();
    this.hasKey = true;
    this.registry.set('hasKey', true);
    persistProgress(this.registry);
    if (this.keyObjects) {
      this.keyObjects.gfx.setVisible(false);
      if (this.keyObjects.label) this.keyObjects.label.setVisible(false);
    }
    if (this.keyClickZone) {
      this.keyClickZone.destroy();
      this.keyClickZone = null;
    }
    if (this.keyHud) {
      this.keyHud.setText('KEY: ✓');
      this.keyHud.setColor('#ffb000');
    }
    this.cameras.main.flash(120, 255, 176, 0);
    this.flashPrompt('Access key acquired!', '#ffb000');
  };

  HubScene.prototype.tryInteract = function (target) {
    if (this.isPaused || this.enteringRoom || this.overrideActive || chimeraOpen()) return;
    if (this.dialogueBox.visible) {
      this.dialogueBox.dismiss();
      return;
    }

    if (this.isNearKey()) {
      this.tryPickupKey(false);
      return;
    }

    const nearDoor = this.isNearDoor();
    const nearServer = this.isNearServer();
    const nearPc = this.isNearPc();
    const nearArchive = this.isNearArchive();

    if (target === 'archive' && !nearArchive) {
      this.flashPrompt('Walk up to the ARCHIVE terminal first', '#ff3366');
      return;
    }
    if (target === 'archive' || (nearArchive && !nearDoor && !nearServer && !nearPc)) {
      this.handleArchiveInteract();
      return;
    }

    if (target === 'door' && !nearDoor) {
      this.flashPrompt('Walk up to the DOOR first', '#ff3366');
      return;
    }
    if (target === 'server' && !nearServer) {
      this.flashPrompt('Walk up to the SERVER terminal first', '#ff3366');
      return;
    }
    if (target === 'pc' && !nearPc) {
      this.flashPrompt('Walk up to the LOGIN terminal first', '#ff3366');
      return;
    }

    if (target === 'door' || (nearDoor && !nearServer && !nearPc)) {
      this.handleDoorInteract();
      return;
    }
    if (target === 'server' || nearServer) {
      this.handleServerInteract();
      return;
    }
    if (target === 'pc' || nearPc) {
      this.handlePcInteract();
      return;
    }

    this.flashPrompt('Move closer to KEY, DOOR, SERVER, LOGIN, or ARCHIVE', '#ff3366');
  };

  HubScene.prototype.handleDoorInteract = function () {
    if (!this.isNearDoor()) {
      this.flashPrompt('Move closer to the DOOR (top-right)', '#ff3366');
      return;
    }

    if (this.isSector2) {
      if (this.allMissionsDone && !this.bossDone) {
        if (!this.hasKey) {
          sfxError();
          this.flashPrompt('Blast door locked — pick up the KEY (bottom-right) first', '#ff3366');
          return;
        }
        sfxClick();
        this.enteringRoom = true;
        this.showChimera(
          'They are still inside the wire.\nLock them out — or let me show you what they took.',
          () => this.showSector2DoorChoice()
        );
        return;
      }
      if (this.s2CredentialDone || this.s2MfaDone || this.s2PasswordDone) {
        this.flashPrompt('Clear all Sector 2 terminals before the blast door opens', '#6688ff');
        return;
      }
      sfxError();
      this.flashPrompt('DOOR LOCKED — begin at the PASSWORD vault', '#ff3366');
      return;
    }

    if (this.allMissionsDone && !this.bossDone) {
      if (!this.hasKey) {
        sfxError();
        this.flashPrompt('Blast door locked — pick up the KEY (bottom-right) first', '#ff3366');
        return;
      }
      sfxClick();
      this.enteringRoom = true;
      this.showChimera(
        'Three vectors contained… but I am still in the wire.',
        () => this.showDoorChoice()
      );
      return;
    }

    if (this.inboxDone) {
      if (this.loginDone) {
        this.flashPrompt('All rooms cleared — pick up KEY for final breach', '#ffb000');
      } else {
        this.flashPrompt('Inbox cleared — use SERVER or LOGIN terminals', '#00ff66');
      }
      return;
    }

    sfxError();
    this.cameras.main.flash(100, 255, 51, 102);
    this.flashPrompt('DOOR LOCKED — initialize breach at the LOGIN terminal', '#ff3366');
  };

  HubScene.prototype.handleServerInteract = function () {
    if (this.isSector2) {
      if (!this.isNearServer()) {
        this.flashPrompt('Move closer to the AUDIT terminal (bottom-left)', '#ff3366');
        return;
      }
      if (!this.s2MfaDone) {
        this.flashPrompt('Secure MFA at the kiosk first', '#ff3366');
        return;
      }
      if (this.s2CredentialDone) {
        this.flashPrompt('Credential audit complete — pick up KEY for blast door', '#8866cc');
        return;
      }
      this.showSector2MissionPanel('CREDENTIAL AUDIT', 'Apply the correct access policy', 'CredentialScene');
      return;
    }
    if (!this.isNearServer()) {
      this.flashPrompt('Move closer to the SERVER (bottom-left)', '#ff3366');
      return;
    }
    if (!this.inboxDone) {
      this.flashPrompt('Initialize breach at the LOGIN terminal first', '#ff3366');
      return;
    }
    if (this.attachmentDone) {
      this.flashPrompt('Attachment complete — use LOGIN terminal for Fake Login', '#00ff66');
      return;
    }
    sfxClick();
    this.enteringRoom = true;
    switchScene(this, 'AttachmentScene');
  };

  HubScene.prototype.handlePcInteract = function () {
    if (this.isSector2) {
      if (!this.isNearPc()) {
        this.flashPrompt('Move closer to the PASSWORD vault (left alcove)', '#ff3366');
        return;
      }
      if (this.s2PasswordDone) {
        this.flashPrompt('Password rotation complete — use MFA kiosk next', '#6688ff');
        return;
      }
      this.showSector2MissionPanel('PASSWORD VAULT', 'Rotate compromised credentials', 'PasswordScene');
      return;
    }
    if (!this.isNearPc()) {
      this.flashPrompt('Move closer to the LOGIN terminal (left alcove)', '#ff3366');
      return;
    }
    if (!this.inboxDone) {
      this.showInitializeBreachPanel();
      return;
    }
    if (!this.attachmentDone) {
      this.flashPrompt('Clear the SERVER room (Attachment) first', '#ff3366');
      return;
    }
    if (this.loginDone) {
      this.flashPrompt('LOGIN complete — pick up KEY (bottom-right) for final breach', '#00ff66');
      return;
    }
    sfxClick();
    this.enteringRoom = true;
    switchScene(this, 'FakeLoginScene');
  };

  HubScene.prototype.flashPrompt = function (text, color) {
    this.promptText.setText(text);
    this.promptText.setColor(color || '#ffb000');
    updateHintBar(text);
    if (this.promptFlash) this.promptFlash.remove();
    this.promptFlash = this.time.delayedCall(2500, () => {
      this.promptFlash = null;
      this.refreshPrompt();
    });
  };

  HubScene.prototype.refreshPrompt = function () {
    const text = this.getDefaultPrompt();
    this.promptText.setText(text);
    this.promptText.setColor('#8899aa');
    updateHintBar(text);
  };

  HubScene.prototype.clampPlayer = function () {
    if (this.isSector2 && typeof FacilitySector2 !== 'undefined') {
      FacilitySector2.clampToCorridor(this.player);
      if (this._prevX != null) FacilitySector2.resolveWallCollision(this.player, this._prevX, this._prevY);
      return;
    }
    if (typeof FacilityAtmosphere !== 'undefined') {
      FacilityAtmosphere.clampToCorridor(this.player);
      if (this._prevX != null) {
        FacilityAtmosphere.resolveWallCollision(this.player, this._prevX, this._prevY);
      }
      return;
    }
    const half = 12;
    const minX = TILE + half;
    const maxX = (MAP_W - 1) * TILE - half;
    const minY = (HUB.roomY + 1) * TILE + half;
    const maxY = (HUB.roomY + HUB.roomRows - 1) * TILE - half;
    this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
    this.player.y = Phaser.Math.Clamp(this.player.y, minY, maxY);
  };

  HubScene.prototype.update = function (time, delta) {
    if (!this.player) return;

    if (this.facilityProps) this.facilityProps.update(time);
    if (this.facilityLighting && !this.isPaused && !this.overrideActive) {
      const lights = this.facilityProps ? this.facilityProps.lightPoints : [];
      this.facilityLighting.update(this.player, lights, time);
    }

    if (this.isPaused || this.overrideActive || chimeraOpen()) return;

    this._prevX = this.player.x;
    this._prevY = this.player.y;
    applyTouchMovement(this, 200, delta);
    this.clampPlayer();
    drawPlayerSprite(this.playerGfx, this.player.x, this.player.y, this.avatar);

    this.nearDoor = this.isNearDoor();
    this.nearServer = this.isNearServer();
    this.nearPc = this.isNearPc();
    this.nearArchive = this.isNearArchive();
    this.nearKey = this.isNearKey();

    if (Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      if (this.dialogueBox.visible) {
        this.dialogueBox.dismiss();
      } else if (this.nearKey) this.tryPickupKey(false);
      else if (this.nearArchive) this.tryInteract('archive');
      else if (this.nearServer) this.tryInteract('server');
      else if (this.nearPc) this.tryInteract('pc');
      else if (this.nearDoor) this.tryInteract('door');
      else this.tryInteract('none');
    }

    if (this.promptFlash || this.dialogueBox.visible) return;

    if (this.nearKey) {
      this.promptText.setText('[ E ] or click KEY — pick up blast-door access key');
      this.promptText.setColor('#ffb000');
    } else if (this.isSector2 && this.nearPc && !this.s2PasswordDone) {
      this.promptText.setText('[ E ] PASSWORD vault — rotate credentials');
      this.promptText.setColor('#6688ff');
    } else if (this.isSector2 && this.nearArchive && this.s2PasswordDone && !this.s2MfaDone) {
      this.promptText.setText('[ E ] MFA kiosk — secure verification codes');
      this.promptText.setColor('#aa66dd');
    } else if (this.isSector2 && this.nearServer && this.s2MfaDone && !this.s2CredentialDone) {
      this.promptText.setText('[ E ] AUDIT terminal — credential policy check');
      this.promptText.setColor('#8866cc');
    } else if (this.isSector2 && this.nearDoor && this.allMissionsDone && !this.bossDone) {
      if (this.hasKey) {
        this.promptText.setText('[ E ] DOOR — lock the attacker out');
      } else {
        this.promptText.setText('DOOR LOCKED — pick up KEY (bottom-right) first');
      }
      this.promptText.setColor('#ffb000');
    } else if (!this.isSector2 && this.nearPc && !this.inboxDone) {
      this.promptText.setText('[ E ] LOGIN — Initialize Breach (Sector 1 INBOX)');
      this.promptText.setColor('#44ccff');
    } else if (!this.isSector2 && this.nearArchive) {
      this.promptText.setText('[ E ] ARCHIVE — trainee records');
      this.promptText.setColor('#ff66cc');
    } else if (!this.isSector2 && this.nearServer && this.inboxDone && !this.attachmentDone) {
      this.promptText.setText('[ E ] SERVER — Attachment Sandbox');
      this.promptText.setColor('#aa88ff');
    } else if (!this.isSector2 && this.nearPc && this.attachmentDone && !this.loginDone) {
      this.promptText.setText('[ E ] LOGIN — Fake Login Portal');
      this.promptText.setColor('#00ccff');
    } else if (!this.isSector2 && this.nearDoor && this.allMissionsDone && !this.bossDone) {
      if (this.hasKey) {
        this.promptText.setText('[ E ] DOOR — final breach / confront CHIMERA');
      } else {
        this.promptText.setText('DOOR LOCKED — pick up KEY (bottom-right) first');
      }
      this.promptText.setColor('#ffb000');
    } else if (!this.isSector2 && this.nearDoor && !this.inboxDone) {
      this.promptText.setText('DOOR LOCKED — use LOGIN terminal to initialize breach');
      this.promptText.setColor('#ff3366');
    } else if (!this.isSector2 && this.nearDoor && this.inboxDone && !this.allMissionsDone) {
      this.promptText.setText('DOOR sealed — clear SERVER and LOGIN first');
      this.promptText.setColor('#8899aa');
    } else {
      this.refreshPrompt();
    }
  };

  // ─── Phishing puzzle ────────────────────────────────────────────────────
  function PhishingScene() {
    Phaser.Scene.call(this, { key: 'PhishingScene' });
  }
  PhishingScene.prototype = Object.create(Phaser.Scene.prototype);
  PhishingScene.prototype.constructor = PhishingScene;

  PhishingScene.prototype.init = function () {
    resetCamera(this);
  };

  PhishingScene.prototype.create = function () {
    this.foundFlags = new Set();
    this.requiredFlags = new Set(['sender', 'link', 'urgency']);

    resetCamera(this);
    setupPause(this);
    addPuzzleHud(this);

    drawScanlines(this);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W - 24, GAME_H - 24, 0xc0c0c0, 1)
      .setStrokeStyle(3, 0x000080);

    this.add.rectangle(GAME_W / 2, 28, GAME_W - 24, 28, 0x000080).setOrigin(0.5);
    this.add.text(GAME_W / 2, 28, "MAIL CLIENT '98 — INBOX ROOM", {
      fontFamily: 'VT323, monospace',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(40, 58, 'From:', { fontFamily: 'VT323, monospace', fontSize: '18px', color: '#111' });
    this.makeFlag(40, 78, 'IT Support <it-support@microsft-security.com>', 'sender', 0xffcccc);

    this.add.text(40, 118, 'Subject:', { fontFamily: 'VT323, monospace', fontSize: '18px', color: '#111' });
    this.makeFlag(40, 138, 'URGENT: Account suspended — verify in 2 hours!', 'urgency', 0xffcccc);

    this.add.text(40, 178, 'Body:', { fontFamily: 'VT323, monospace', fontSize: '18px', color: '#111' });
    this.add.text(40, 200, 'Click to verify your account:', { fontFamily: 'VT323, monospace', fontSize: '16px', color: '#333' });
    this.makeFlag(40, 222, 'https://company-login.secure-verify.net/auth', 'link', 0xccccff);

    this.makeDecoy(40, 258, 'Best regards, IT Support Team', 'safe');

    this.flagCounter = this.add.text(GAME_W / 2, 290, 'Red flags: 0 / 3', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '9px',
      color: '#ff3366',
    }).setOrigin(0.5);

    this.completeBtn = makeButton(this, GAME_W / 2, 328, '[ COMPLETE MISSION ]', () => this.submitPhishing(), {
      fontSize: '9px',
      disabled: true,
    });
    this.completeBtn.bg.setAlpha(0.45);
    this.completeBtn.text.setAlpha(0.45);

    this.add.text(GAME_W / 2, 358, 'Click suspicious parts of the email', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#333',
    }).setOrigin(0.5);

    makeButton(this, 70, GAME_H - 36, '[ EXIT ]', () => {
      sfxClick();
      switchScene(this, 'HubScene');
    }, { fontSize: '8px', color: '#8899aa' });
  };

  PhishingScene.prototype.makeFlag = function (x, y, label, flagKey, bgColor) {
    const w = GAME_W - 80;
    const h = 28;
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, bgColor, 1)
      .setStrokeStyle(1, 0x888888)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x + 8, y + 6, label, {
      fontFamily: 'VT323, monospace',
      fontSize: '17px',
      color: '#111',
      wordWrap: { width: w - 16 },
    });

    bg.on('pointerdown', () => {
      if (this.isPaused || this.foundFlags.has(flagKey)) return;
      if (this.requiredFlags.has(flagKey)) {
        sfxClick();
        if (typeof AudioFX !== 'undefined') AudioFX.flagFound();
        this.foundFlags.add(flagKey);
        bg.setFillStyle(0x00ff66, 0.35).setStrokeStyle(2, 0x00aa44);
        txt.setColor('#004422');
        this.flagCounter.setText(`Red flags: ${this.foundFlags.size} / 3`);
        if (this.foundFlags.size >= 3) {
          this.completeBtn.bg.setAlpha(1);
          this.completeBtn.text.setAlpha(1);
          this.completeBtn.disabled = false;
        }
      }
    });
  };

  PhishingScene.prototype.makeDecoy = function (x, y, label, decoyKey) {
    const w = GAME_W - 80;
    const h = 28;
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xeeeeee, 1)
      .setStrokeStyle(1, 0x888888)
      .setInteractive({ useHandCursor: true });
    this.add.text(x + 8, y + 6, label, {
      fontFamily: 'VT323, monospace',
      fontSize: '17px',
      color: '#333',
    });
    bg.on('pointerdown', () => {
      if (this.isPaused) return;
      sfxError();
      loseLife(this, 'That looks legitimate — keep hunting red flags.');
    });
  };

  PhishingScene.prototype.submitPhishing = function () {
    if (this.foundFlags.size < 3 || this.completeBtn.disabled) return;
    this.registry.set('inboxComplete', true);
    this.registry.set('justUnlockedInbox', true);
    const score = (this.registry.get('score') ?? START_SCORE) + 200;
    this.registry.set('score', score);
    persistProgress(this.registry);
    sfxRoomComplete('phishing');
    this.cameras.main.flash(150, 0, 255, 102);
    switchScene(this, 'HubScene');
  };

  // ─── Attachment puzzle ──────────────────────────────────────────────────
  function AttachmentScene() {
    Phaser.Scene.call(this, { key: 'AttachmentScene' });
  }
  AttachmentScene.prototype = Object.create(Phaser.Scene.prototype);
  AttachmentScene.prototype.constructor = AttachmentScene;

  AttachmentScene.prototype.init = function () {
    resetCamera(this);
  };

  AttachmentScene.prototype.create = function () {
    this.foundFlags = new Set();
    this.requiredFlags = new Set(['macro', 'link']);

    resetCamera(this);
    setupPause(this);
    addPuzzleHud(this);

    drawScanlines(this);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W - 24, GAME_H - 24, 0xc0c0c0, 1)
      .setStrokeStyle(3, 0x000080);

    this.add.rectangle(GAME_W / 2, 28, GAME_W - 24, 28, 0x000080).setOrigin(0.5);
    this.add.text(GAME_W / 2, 28, 'PDF ANALYZER — ATTACHMENT SANDBOX', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 52, 'Invoice_2024.pdf — SANDBOX PREVIEW', {
      fontFamily: 'VT323, monospace',
      fontSize: '16px',
      color: '#333',
    }).setOrigin(0.5);

    this.makePdfTarget(40, 72, 'URGENT: Overdue Payment — Action Required', 'title', 0xffeecc, false);
    this.add.text(40, 108, 'Please review the attached invoice immediately.', {
      fontFamily: 'VT323, monospace', fontSize: '16px', color: '#333',
    });
    this.makePdfTarget(40, 132, '⚠ This document contains macros. Enable content to view.', 'macro', 0xffcccc, true);
    this.makePdfTarget(40, 168, 'Download updated invoice: http://paypa1-invoice.com/view', 'link', 0xccccff, true);
    this.add.text(40, 204, 'Vendor: Acme Corp — Ref #8821', {
      fontFamily: 'VT323, monospace', fontSize: '16px', color: '#228822',
    });

    this.flagCounter = this.add.text(GAME_W / 2, 248, 'Threats found: 0 / 2', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '9px',
      color: '#ff3366',
    }).setOrigin(0.5);

    this.completeBtn = makeButton(this, GAME_W / 2, 288, '[ COMPLETE MISSION ]', () => this.submitAttachment(), {
      fontSize: '9px',
      disabled: true,
    });
    this.completeBtn.bg.setAlpha(0.45);
    this.completeBtn.text.setAlpha(0.45);

    this.add.text(GAME_W / 2, 328, 'Click 2 suspicious parts (macro + fake link)', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#333',
    }).setOrigin(0.5);

    makeButton(this, 70, GAME_H - 36, '[ EXIT ]', () => {
      sfxClick();
      switchScene(this, 'HubScene');
    }, { fontSize: '8px', color: '#8899aa' });
  };

  AttachmentScene.prototype.makePdfTarget = function (x, y, label, flagKey, bgColor, isThreat) {
    const w = GAME_W - 80;
    const h = 28;
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, bgColor, 1)
      .setStrokeStyle(1, 0x888888)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x + 8, y + 6, label, {
      fontFamily: 'VT323, monospace',
      fontSize: '16px',
      color: '#111',
      wordWrap: { width: w - 16 },
    });

    bg.on('pointerdown', () => {
      if (this.isPaused || this.foundFlags.has(flagKey)) return;
      if (isThreat && this.requiredFlags.has(flagKey)) {
        sfxClick();
        if (typeof AudioFX !== 'undefined') AudioFX.flagFound();
        this.foundFlags.add(flagKey);
        bg.setFillStyle(0x00ff66, 0.35).setStrokeStyle(2, 0x00aa44);
        txt.setColor('#004422');
        this.flagCounter.setText(`Threats found: ${this.foundFlags.size} / 2`);
        if (this.foundFlags.size >= 2) {
          this.completeBtn.bg.setAlpha(1);
          this.completeBtn.text.setAlpha(1);
          this.completeBtn.disabled = false;
        }
      } else if (flagKey === 'title') {
        this.feedbackText.setText('Urgency is suspicious — focus on macro + fake link.').setColor('#8899aa');
      } else {
        sfxError();
        loseLife(this, 'Not a PDF threat — try macro warning or fake link.');
      }
    });
  };

  AttachmentScene.prototype.submitAttachment = function () {
    if (this.foundFlags.size < 2 || this.completeBtn.disabled) return;
    this.registry.set('attachmentComplete', true);
    this.registry.set('justUnlockedAttachment', true);
    const score = (this.registry.get('score') ?? START_SCORE) + 200;
    this.registry.set('score', score);
    persistProgress(this.registry);
    sfxRoomComplete('attachment');
    this.cameras.main.flash(150, 0, 255, 102);
    switchScene(this, 'HubScene');
  };

  // ─── Fake login puzzle ──────────────────────────────────────────────────
  function FakeLoginScene() {
    Phaser.Scene.call(this, { key: 'FakeLoginScene' });
  }
  FakeLoginScene.prototype = Object.create(Phaser.Scene.prototype);
  FakeLoginScene.prototype.constructor = FakeLoginScene;

  FakeLoginScene.prototype.init = function () {
    resetCamera(this);
  };

  FakeLoginScene.prototype.create = function () {
    this.selectedId = null;

    resetCamera(this);
    setupPause(this);
    addPuzzleHud(this);

    drawScanlines(this);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W - 24, GAME_H - 24, 0x1a2a3a, 1)
      .setStrokeStyle(3, COLORS.terminal);

    this.add.text(GAME_W / 2, 48, 'WEB SHIELD — FAKE LOGIN PORTAL', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '9px',
      color: '#00ffcc',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 78, 'Which URL is the legitimate company login?', {
      fontFamily: 'VT323, monospace',
      fontSize: '20px',
      color: '#aabbcc',
    }).setOrigin(0.5);

    this.optionBtns = [];
    FAKE_LOGIN_OPTIONS.forEach((opt, i) => {
      const y = 118 + i * 52;
      const btn = makeButton(this, GAME_W / 2, y, opt.text, () => {
        if (this.isPaused) return;
        sfxClick();
        this.selectedId = opt.id;
        this.optionBtns.forEach((b) => {
          b.bg.setStrokeStyle(2, COLORS.dialogueBorder);
        });
        btn.bg.setStrokeStyle(2, COLORS.doorOpen);
        this.feedbackText.setText('');
      }, { fontSize: '7px', color: '#aabbcc' });
      btn.optId = opt.id;
      this.optionBtns.push(btn);
    });

    this.completeBtn = makeButton(this, GAME_W / 2, 340, '[ COMPLETE MISSION ]', () => this.submitFakeLogin(), {
      fontSize: '9px',
    });

    makeButton(this, 70, GAME_H - 36, '[ EXIT ]', () => {
      sfxClick();
      switchScene(this, 'HubScene');
    }, { fontSize: '8px', color: '#8899aa' });
  };

  FakeLoginScene.prototype.submitFakeLogin = function () {
    if (this.isPaused) return;
    if (!this.selectedId) {
      this.feedbackText.setText('Select a URL first.').setColor('#ff3366');
      return;
    }
    const chosen = FAKE_LOGIN_OPTIONS.find((o) => o.id === this.selectedId);
    if (!chosen) return;
    if (chosen.correct) {
      this.registry.set('fakeLoginComplete', true);
      this.registry.set('justUnlockedLogin', true);
      const score = (this.registry.get('score') ?? START_SCORE) + 200;
      this.registry.set('score', score);
      persistProgress(this.registry);
      sfxRoomComplete('fake_login');
      this.cameras.main.flash(150, 0, 255, 102);
      switchScene(this, 'HubScene');
    } else {
      sfxError();
      loseLife(this, 'Typosquatted URL — check the domain carefully.');
    }
  };

  // ─── Sector 2 puzzles (password / MFA / credential audit) ───────────────
  function createOptionsPuzzleScene(SceneCtor, key, cfg) {
    SceneCtor.prototype.init = function () { resetCamera(this); };
    SceneCtor.prototype.create = function () {
      this.selectedId = null;
      resetCamera(this);
      setupPause(this);
      addPuzzleHud(this);
      drawScanlines(this);
      this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W - 24, GAME_H - 24, cfg.bg || 0x101828, 1)
        .setStrokeStyle(3, cfg.stroke || 0x6688ff);
      this.add.text(GAME_W / 2, 48, cfg.title, {
        fontFamily: 'Press Start 2P, monospace', fontSize: '9px', color: cfg.titleColor || '#8899ff',
      }).setOrigin(0.5);
      this.add.text(GAME_W / 2, 78, cfg.prompt, {
        fontFamily: 'VT323, monospace', fontSize: '20px', color: '#aabbcc', wordWrap: { width: GAME_W - 80 }, align: 'center',
      }).setOrigin(0.5);
      this.optionBtns = [];
      cfg.options.forEach((opt, i) => {
        const y = 118 + i * 52;
        const btn = makeButton(this, GAME_W / 2, y, opt.text, () => {
          if (this.isPaused) return;
          sfxClick();
          this.selectedId = opt.id;
          this.optionBtns.forEach((b) => b.bg.setStrokeStyle(2, cfg.stroke || 0x6688ff));
          btn.bg.setStrokeStyle(2, 0x66aaff);
          this.feedbackText.setText('');
        }, { fontSize: '7px', color: '#aabbcc' });
        btn.optId = opt.id;
        this.optionBtns.push(btn);
      });
      this.completeBtn = makeButton(this, GAME_W / 2, 340, '[ COMPLETE MISSION ]', () => this.submitChoice(cfg), { fontSize: '9px' });
      makeButton(this, 70, GAME_H - 36, '[ EXIT ]', () => { sfxClick(); switchScene(this, 'HubScene'); }, { fontSize: '8px', color: '#8899aa' });
    };
    SceneCtor.prototype.submitChoice = function (cfg) {
      if (this.isPaused) return;
      if (!this.selectedId) {
        this.feedbackText.setText('Select an answer first.').setColor('#ff3366');
        return;
      }
      const chosen = cfg.options.find((o) => o.id === this.selectedId);
      if (!chosen) return;
      if (chosen.correct) {
        this.registry.set(cfg.flag, true);
        if (cfg.unlockFlag) this.registry.set(cfg.unlockFlag, true);
        const score = (this.registry.get('score') ?? START_SCORE) + 200;
        this.registry.set('score', score);
        persistProgress(this.registry);
        sfxRoomComplete(cfg.roomId);
        this.cameras.main.flash(150, 100, 120, 255);
        switchScene(this, 'HubScene');
      } else {
        sfxError();
        loseLife(this, cfg.failMsg || 'Incorrect — try again.');
      }
    };
  }

  function PasswordScene() { Phaser.Scene.call(this, { key: 'PasswordScene' }); }
  PasswordScene.prototype = Object.create(Phaser.Scene.prototype);
  PasswordScene.prototype.constructor = PasswordScene;
  createOptionsPuzzleScene(PasswordScene, 'PasswordScene', {
    title: 'SECTOR 2 — PASSWORD ROTATION',
    prompt: 'Which password meets enterprise policy?',
    options: PASSWORD_OPTIONS,
    flag: 's2PasswordComplete',
    unlockFlag: 'justUnlockedS2Mfa',
    roomId: 'password',
    failMsg: 'Too weak — attackers already have that pattern.',
    bg: 0x0c1424,
    stroke: 0x4466cc,
  });

  function MFAScene() { Phaser.Scene.call(this, { key: 'MFAScene' }); }
  MFAScene.prototype = Object.create(Phaser.Scene.prototype);
  MFAScene.prototype.constructor = MFAScene;
  createOptionsPuzzleScene(MFAScene, 'MFAScene', {
    title: 'SECTOR 2 — MFA PROTOCOL',
    prompt: 'A caller claims to be IT support. What do you do?',
    options: MFA_OPTIONS,
    flag: 's2MfaComplete',
    unlockFlag: 'justUnlockedS2Credential',
    roomId: 'mfa',
    failMsg: 'Never share MFA codes — that bypasses everything.',
    bg: 0x140c20,
    stroke: 0x8844cc,
  });

  function CredentialScene() { Phaser.Scene.call(this, { key: 'CredentialScene' }); }
  CredentialScene.prototype = Object.create(Phaser.Scene.prototype);
  CredentialScene.prototype.constructor = CredentialScene;
  createOptionsPuzzleScene(CredentialScene, 'CredentialScene', {
    title: 'SECTOR 2 — CREDENTIAL AUDIT',
    prompt: 'Shared admin credentials were found on a wiki. Best policy?',
    options: CREDENTIAL_OPTIONS,
    flag: 's2CredentialComplete',
    roomId: 'credential_audit',
    failMsg: 'Shared credentials are how they got inside.',
    bg: 0x100818,
    stroke: 0x5533aa,
  });

  // ─── Game over ──────────────────────────────────────────────────────────
  function GameOverScene() {
    Phaser.Scene.call(this, { key: 'GameOverScene' });
  }
  GameOverScene.prototype = Object.create(Phaser.Scene.prototype);
  GameOverScene.prototype.constructor = GameOverScene;

  GameOverScene.prototype.create = function () {
    setSceneChrome(this, true);
    const cx = GAME_W / 2;
    drawScanlines(this);
    if (typeof AudioFX !== 'undefined') AudioFX.gameOver();

    this.add.rectangle(cx, GAME_H / 2, GAME_W - 32, GAME_H - 32, 0x1a0808, 0.95)
      .setStrokeStyle(4, COLORS.doorLocked);

    this.add.text(cx, 90, 'LOCKDOWN FAILED', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '14px',
      color: '#ff3366',
    }).setOrigin(0.5);

    this.add.text(cx, 140, 'CHIMERA breached the simulation.', {
      fontFamily: 'VT323, monospace',
      fontSize: '20px',
      color: '#aabbcc',
    }).setOrigin(0.5);

    const score = this.registry.get('score') ?? 0;
    this.add.text(cx, 175, `Final score: ${score}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '22px',
      color: '#ffb000',
    }).setOrigin(0.5);

    makeButton(this, cx, 240, '[ RETRY MISSION ]', () => {
      sfxClick();
      this.registry.set('lives', START_LIVES);
      persistProgress(this.registry);
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(420, () => this.scene.start('TitleScene'));
    });

    makeButton(this, cx, 290, '[ TRAINING MODE ]', () => {
      window.location.href = 'index.html';
    }, { fontSize: '8px', color: '#00ffcc' });

    this.cameras.main.fadeIn(600, 0, 0, 0);
  };

  // ─── Chapter complete ───────────────────────────────────────────────────
  function ChapterCompleteScene() {
    Phaser.Scene.call(this, { key: 'ChapterCompleteScene' });
  }
  ChapterCompleteScene.prototype = Object.create(Phaser.Scene.prototype);
  ChapterCompleteScene.prototype.constructor = ChapterCompleteScene;

  ChapterCompleteScene.prototype.create = function () {
    setSceneChrome(this, true);
    const cx = GAME_W / 2;
    drawScanlines(this);
    setupPause(this);

    const isS2 = !!this.registry.get('ch2BossComplete') && (this.registry.get('facilitySector') || 1) >= 2;
    const strokeCol = isS2 ? 0x6688ff : COLORS.doorOpen;

    this.add.rectangle(cx, GAME_H / 2, GAME_W - 32, GAME_H - 32, COLORS.dialogue, 0.95)
      .setStrokeStyle(4, strokeCol);

    this.add.text(cx, 70, isS2 ? 'SECTOR 2 COMPLETE' : 'CHAPTER 1 COMPLETE', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '14px',
      color: isS2 ? '#8899ff' : '#00ff66',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, 102, isS2 ? 'THE BREACH' : 'THE EMAIL', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '10px',
      color: '#ffb000',
    }).setOrigin(0.5);

    const missionLines = isS2 ? [
      { label: 'Password Rotation', done: !!this.registry.get('s2PasswordComplete') },
      { label: 'MFA Protocol', done: !!this.registry.get('s2MfaComplete') },
      { label: 'Credential Audit', done: !!this.registry.get('s2CredentialComplete') },
    ] : [
      { label: 'Phishing Inbox', done: !!this.registry.get('inboxComplete') },
      { label: 'Attachment Sandbox', done: !!this.registry.get('attachmentComplete') },
      { label: 'Fake Login Portal', done: !!this.registry.get('fakeLoginComplete') },
    ];

    this.add.text(cx, 132, isS2
      ? '"They were inside — then you locked the door."'
      : '"Something got through — then you shut it down."', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#aabbcc',
      align: 'center',
      wordWrap: { width: GAME_W - 80 },
    }).setOrigin(0.5);

    missionLines.forEach((m, i) => {
      const prefix = m.done ? '✓' : '✗';
      const color = m.done ? '#00ff66' : '#ff3366';
      this.add.text(cx, 168 + i * 26, `${prefix} ${m.label} — ${m.done ? 'cleared' : 'incomplete'}`, {
        fontFamily: 'VT323, monospace',
        fontSize: '20px',
        color,
        align: 'center',
      }).setOrigin(0.5);
    });

    const score = this.registry.get('score') ?? START_SCORE;
    this.add.text(cx, 258, `Score: ${score}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '22px',
      color: '#ffb000',
    }).setOrigin(0.5);

    const stance = this.registry.get('chimeraStance');
    const stanceLine = stance === 'listen'
      ? 'You chose to listen. CHIMERA is… still here.'
      : stance === 'shutdown'
        ? 'You tried to shut it down. The wire stays warm.'
        : 'CHIMERA contained. Corridor secure.';
    this.add.text(cx, 288, stanceLine, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: stance === 'listen' ? '#ff8fdc' : '#aabbcc',
      align: 'center',
      wordWrap: { width: GAME_W - 80 },
    }).setOrigin(0.5);

    makeButton(this, cx, GAME_H - 72, isS2 ? '[ RETURN TO SECTOR 2 ]' : '[ ENTER SECTOR 2 ]', () => {
      sfxClick();
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(420, () => this.scene.start('HubScene'));
    });

    makeButton(this, cx, GAME_H - 36, '[ FULL TRAINING MODE ]', () => {
      window.location.href = 'index.html';
    }, { fontSize: '8px', color: '#00ffcc' });

    for (let i = 0; i < 24; i++) {
      const p = this.add.rectangle(
        Phaser.Math.Between(40, GAME_W - 40),
        Phaser.Math.Between(40, 100),
        6, 6,
        Phaser.Math.RND.pick([COLORS.doorOpen, COLORS.keycard, COLORS.terminal, COLORS.doorLocked])
      );
      this.tweens.add({
        targets: p,
        y: GAME_H + 20,
        alpha: 0,
        duration: Phaser.Math.Between(1800, 3200),
        delay: Phaser.Math.Between(0, 800),
        repeat: -1,
        onRepeat: () => {
          p.y = Phaser.Math.Between(20, 80);
          p.x = Phaser.Math.Between(40, GAME_W - 40);
          p.alpha = 1;
        },
      });
    }

    this.cameras.main.fadeIn(600, 0, 0, 0);
  };

  // ─── Helpers ────────────────────────────────────────────────────────────
  function updateHintBar(text) {
    const el = document.getElementById('game-hint-bar');
    if (el && text) el.textContent = text;
  }

  function buildCorridorMap(scene) {
    if (typeof FacilityAtmosphere !== 'undefined') {
      FacilityAtmosphere.buildMap(scene);
      return;
    }
    const g = scene.add.graphics().setDepth(0);
    const labelLayer = scene.add.container(0, 0).setDepth(0);

    g.fillStyle(0x050810, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    for (let ri = 0; ri < HUB.roomRows; ri++) {
      for (let col = 0; col < MAP_W; col++) {
        const row = HUB.roomY + ri;
        const x = col * TILE;
        const y = row * TILE;
        const isWall = ri === 0 || ri === HUB.roomRows - 1 || col === 0 || col === MAP_W - 1;
        const isAlt = (row + col) % 2 === 0;

        if (isWall) {
          g.fillStyle(COLORS.wall, 1);
          g.fillRect(x, y, TILE, TILE);
          g.lineStyle(2, COLORS.wallEdge, 0.35);
          g.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
        } else {
          g.fillStyle(isAlt ? COLORS.floorAlt : COLORS.floor, 1);
          g.fillRect(x, y, TILE, TILE);
        }
      }
    }

    const wallChar = scene.add.text(0, 0, '█', {
      fontFamily: 'VT323, monospace',
      fontSize: '28px',
      color: '#00ffcc',
    }).setAlpha(0.2);
    for (let ri = 0; ri < HUB.roomRows; ri++) {
      for (let col = 0; col < MAP_W; col++) {
        const isWall = ri === 0 || ri === HUB.roomRows - 1 || col === 0 || col === MAP_W - 1;
        if (!isWall) continue;
        const row = HUB.roomY + ri;
        const clone = scene.add.text(col * TILE + 4, row * TILE + 2, '█', {
          fontFamily: 'VT323, monospace',
          fontSize: '26px',
          color: '#1a3a44',
        }).setDepth(0);
        labelLayer.add(clone);
      }
    }
    wallChar.destroy();
  }

  function drawPlayerSprite(g, x, y, avatar) {
    const maps = typeof FacilityCharacter !== 'undefined' ? FacilityCharacter : null;
    const hairMap = maps ? maps.HAIR : { black: 0x1a1a1a };
    const skinMap = maps ? maps.SKIN : { light: 0xffddaa };
    const suitMap = maps ? maps.SUIT : { cyan: 0x00ccaa };
    const av = avatar || {};
    const suit = suitMap[av.suit] || suitMap.cyan || 0x00ccaa;
    const skin = skinMap[av.skin] || skinMap.light || 0xffddaa;
    const hair = hairMap[av.hair] || hairMap.black || 0x1a1a1a;
    const headgear = av.headgear || 'none';

    g.clear();
    g.fillStyle(0x223344, 1);
    g.fillRect(x - 9, y - 12, 18, 24);
    g.fillStyle(suit, 1);
    g.fillRect(x - 7, y - 10, 14, 20);
    g.fillStyle(skin, 1);
    g.fillRect(x - 5, y - 14, 10, 8);
    g.fillStyle(hair, 1);
    g.fillRect(x - 6, y - 16, 12, 4);

    if (headgear === 'visor') {
      g.fillStyle(0x44ccff, 0.85);
      g.fillRect(x - 6, y - 13, 12, 3);
    } else if (headgear === 'mask') {
      g.fillStyle(0x334455, 1);
      g.fillRect(x - 5, y - 10, 10, 6);
    } else if (headgear === 'headset') {
      g.fillStyle(0x556677, 1);
      g.fillRect(x - 9, y - 13, 3, 7);
      g.fillRect(x + 6, y - 13, 3, 7);
      g.fillStyle(0x8899aa, 1);
      g.fillRect(x - 2, y - 16, 4, 2);
    }
  }

  function drawTerminal(scene, x, y, label, glowColor) {
    const color = glowColor || COLORS.terminal;
    const g = scene.add.graphics().setDepth(1);
    g.fillStyle(color, 0.2);
    g.fillRect(x, y, TILE * 2, TILE * 1.2);
    g.lineStyle(2, color, 0.85);
    g.strokeRect(x, y, TILE * 2, TILE * 1.2);
    g.fillStyle(color, 0.95);
    g.fillRect(x + 6, y + 6, TILE * 2 - 12, TILE * 0.55);
    scene.add.text(x + TILE, y + TILE * 1.2 + 2, label, {
      fontFamily: 'VT323, monospace',
      fontSize: '14px',
      color: color === COLORS.server ? '#aa88ff' : '#00ccff',
    }).setOrigin(0.5, 0).setDepth(1);

    scene.tweens.add({
      targets: g,
      alpha: { from: 0.8, to: 1 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
  }

  function drawKeycardProp(scene, x, y) {
    const g = scene.add.graphics().setDepth(1);
    g.fillStyle(COLORS.keycard, 1);
    g.fillRect(x, y + 6, 24, 14);
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(x + 3, y + 9, 8, 7);
    g.lineStyle(1, 0xffdd88, 0.8);
    g.strokeRect(x, y + 6, 24, 14);
    const label = scene.add.text(x + 12, y + 24, 'KEY', {
      fontFamily: 'VT323, monospace',
      fontSize: '14px',
      color: '#ffb000',
    }).setOrigin(0.5).setDepth(1);

    scene.tweens.add({
      targets: g,
      alpha: { from: 0.7, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });
    return { gfx: g, label };
  }

  function resetCamera(scene) {
    const cam = scene.cameras.main;
    if (!cam) return;
    // Phaser 3.80 camera effects expose reset()/resetFX(), not stop().
    if (typeof cam.resetFX === 'function') {
      cam.resetFX();
    } else {
      if (cam.fadeEffect && cam.fadeEffect.reset) cam.fadeEffect.reset();
      if (cam.flashEffect && cam.flashEffect.reset) cam.flashEffect.reset();
    }
    cam.setAlpha(1);
  }

  function switchScene(scene, key) {
    scene.time.delayedCall(0, () => {
      resetCamera(scene);
      scene.scene.start(key);
    });
  }

  function drawScanlines(scene) {
    const g = scene.add.graphics().setDepth(100).setAlpha(0.06);
    for (let y = 0; y < GAME_H; y += 4) {
      g.fillStyle(0x000000, 1);
      g.fillRect(0, y, GAME_W, 2);
    }
  }

  function makeButton(scene, x, y, label, callback, opts = {}) {
    const fontSize = opts.fontSize || '10px';
    const color = opts.color || '#00ff66';
    const padX = 16;
    const padY = 10;
    const text = scene.add.text(x, y, label, {
      fontFamily: 'Press Start 2P, monospace',
      fontSize,
      color,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const bg = scene.add.rectangle(x, y, text.width + padX, text.height + padY, 0x000000, 0.7)
      .setStrokeStyle(2, COLORS.dialogueBorder)
      .setInteractive({ useHandCursor: true });
    text.setDepth(1);
    bg.setDepth(0);

    const btn = { bg, text, disabled: opts.disabled || false };
    const click = () => {
      if (btn.disabled) return;
      callback();
    };
    bg.on('pointerdown', click);
    text.on('pointerdown', click);
    bg.on('pointerover', () => bg.setFillStyle(0x003322, 0.9));
    bg.on('pointerout', () => bg.setFillStyle(0x000000, 0.7));
    btn.setAlpha = (a) => {
      bg.setAlpha(a);
      text.setAlpha(a);
    };
    return btn;
  }

  function createDialogueBox(scene) {
    const box = {
      visible: false,
      typing: false,
      onClose: null,
      full: '',
      timer: null,
      group: scene.add.container(GAME_W / 2, GAME_H - 76).setDepth(30).setVisible(false),
    };
    const bg = scene.add.rectangle(0, 0, GAME_W - 48, 84, COLORS.dialogue, 0.96)
      .setStrokeStyle(2, COLORS.dialogueBorder);
    const speaker = scene.add.text(-(GAME_W - 48) / 2 + 14, -32, '', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '8px',
      color: '#00ffcc',
    }).setOrigin(0, 0.5);
    const txt = scene.add.text(0, 0, '', {
      fontFamily: 'VT323, monospace',
      fontSize: '20px',
      color: '#aabbcc',
      align: 'center',
      wordWrap: { width: GAME_W - 80 },
    }).setOrigin(0.5);
    const hint = scene.add.text(0, 30, '[ E ] continue', {
      fontFamily: 'VT323, monospace',
      fontSize: '14px',
      color: '#556677',
    }).setOrigin(0.5);
    box.group.add([bg, speaker, txt, hint]);
    box.text = txt;

    const clearTimer = () => {
      if (box.timer) { box.timer.remove(); box.timer = null; }
    };
    const finishTyping = () => {
      clearTimer();
      box.text.setText(box.full);
      box.typing = false;
      hint.setText('[ E ] continue');
    };

    box.show = (message, onClose, opts = {}) => {
      clearTimer();
      box.visible = true;
      box.onClose = onClose || null;
      box.full = message || '';
      const isChimera = !!opts.speaker;
      speaker.setText(opts.speaker || '');
      speaker.setColor(opts.color || '#00ffcc');
      bg.setStrokeStyle(2, isChimera ? 0xff66cc : COLORS.dialogueBorder);
      box.text.setColor(isChimera ? '#ffd9f2' : '#aabbcc');
      box.group.setVisible(true);

      if (opts.typewriter) {
        box.typing = true;
        box.text.setText('');
        hint.setText('[ E ] skip');
        let i = 0;
        box.timer = scene.time.addEvent({
          delay: 40,
          repeat: Math.max(0, box.full.length - 1),
          callback: () => {
            i += 1;
            box.text.setText(box.full.slice(0, i));
            if (typeof AudioFX !== 'undefined' && AudioFX.type && i % 2 === 0) AudioFX.type();
            if (i >= box.full.length) finishTyping();
          },
        });
      } else {
        box.typing = false;
        box.text.setText(box.full);
        hint.setText('[ E ] continue');
      }
    };
    box.dismiss = () => {
      if (!box.visible) return;
      if (box.typing) { finishTyping(); return; }
      box.visible = false;
      box.group.setVisible(false);
      const cb = box.onClose;
      box.onClose = null;
      if (cb) cb();
    };
    return box;
  }

  // ─── Launch ─────────────────────────────────────────────────────────────
  function launchGame() {
    if (game) return;
    game = new Phaser.Game(config);
    window.__game = game;
    window.addEventListener('chimera:speak', () => {
      const hub = game.scene.getScene('HubScene');
      if (hub && hub.scene.isActive()) chimeraEnvironmentPulse(hub);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launchGame);
  } else {
    launchGame();
  }
})();
