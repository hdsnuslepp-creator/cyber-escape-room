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

  /** ASCII hub layout — matches 20×7 room centered in the map
   *  █  PC       DOOR   █
   *  █        🧍        █
   *  █  SERVER     KEY  █
   */
  const HUB = {
    roomY: 2,
    roomRows: 7,
    pc: { c: 3, r: 3 },
    door: { c: 14, r: 3 },
    player: { c: 10, r: 5 },
    server: { c: 3, r: 7 },
    key: { c: 14, r: 7 },
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
      FakeLoginScene, GameOverScene, ChapterCompleteScene,
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
      agentName: registry.get('agentName') || '',
      inboxComplete: !!registry.get('inboxComplete'),
      attachmentComplete: !!registry.get('attachmentComplete'),
      fakeLoginComplete: !!registry.get('fakeLoginComplete'),
      ch1BossComplete: !!registry.get('ch1BossComplete'),
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
      if (scene.isPaused || scene.dialogueBox?.visible) return;
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
    if (scene.dialogueBox?.visible) return;
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
    scene.livesText = scene.add.text(GAME_W - 12, 8, `LIVES: ${'♥'.repeat(lives)}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#ff3366',
    }).setOrigin(1, 0).setDepth(50);
    scene.scoreText = scene.add.text(GAME_W - 12, 28, `SCORE: ${score}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#ffb000',
    }).setOrigin(1, 0).setDepth(50);
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
    this.registry.set('inboxComplete', !!p.inboxComplete);
    this.registry.set('attachmentComplete', !!p.attachmentComplete);
    this.registry.set('fakeLoginComplete', !!p.fakeLoginComplete);
    this.registry.set('ch1BossComplete', !!p.ch1BossComplete);
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
    const cx = GAME_W / 2;
    drawScanlines(this);
    setupPause(this);

    this.add.rectangle(cx, GAME_H / 2, GAME_W - 40, GAME_H - 40, COLORS.dialogue, 0.92)
      .setStrokeStyle(3, COLORS.dialogueBorder);

    this.add.text(cx, 72, 'TRAINEE 1998', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '18px',
      color: '#00ffcc',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, 102, 'EU CYBER DEFENSE ACADEMY', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '11px',
      color: '#ffb000',
      align: 'center',
    }).setOrigin(0.5);

    const story = [
      { t: 'You wake as TRAINEE #1998.' },
      { t: 'Facility in lockdown. No staff. No way out.' },
      { t: 'An AI called CHIMERA is awake in the network.', c: '#ff66cc' },
      { t: 'CHIMERA: hello.', c: '#ff8fdc' },
    ];
    story.forEach((line, i) => {
      this.add.text(cx, 148 + i * 22, line.t, {
        fontFamily: 'VT323, monospace',
        fontSize: '18px',
        color: line.c || '#aabbcc',
        align: 'center',
      }).setOrigin(0.5);
    });

    this.add.text(cx, 248, '> ENTER TRAINEE CODENAME', {
      fontFamily: 'VT323, monospace',
      fontSize: '20px',
      color: '#00ff66',
    }).setOrigin(0.5);

    const savedName = this.registry.get('agentName') || 'agent_01';
    const nameText = this.add.text(cx, 278, savedName, {
      fontFamily: 'VT323, monospace',
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    let codename = savedName;
    const startGame = () => {
      if (typeof AudioFX !== 'undefined') {
        AudioFX.resume();
        AudioFX.click();
      }
      this.registry.set('agentName', codename.trim() || 'agent_01');
      if (this.registry.get('lives') == null) this.registry.set('lives', START_LIVES);
      if (this.registry.get('score') == null) this.registry.set('score', START_SCORE);
      persistProgress(this.registry);
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(420, () => this.scene.start('HubScene'));
    };

    this.input.keyboard.on('keydown', (ev) => {
      if (this.isPaused) return;
      if (ev.key === 'Enter') {
        startGame();
        return;
      }
      if (ev.key === 'Backspace') {
        codename = codename.slice(0, -1);
      } else if (ev.key.length === 1 && codename.length < 16 && /[a-zA-Z0-9_-]/.test(ev.key)) {
        codename += ev.key;
      }
      nameText.setText(codename || '_');
    });

    const startBtn = makeButton(this, cx, 330, '[ BEGIN SIMULATION ]', startGame);

    this.add.text(cx, GAME_H - 44, 'Press ENTER or click to start', {
      fontFamily: 'VT323, monospace',
      fontSize: '16px',
      color: '#556677',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startBtn.bg,
      alpha: { from: 1, to: 0.65 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.cameras.main.fadeIn(600, 0, 0, 0);
  };

  // ─── Hub corridor ───────────────────────────────────────────────────────
  function HubScene() {
    Phaser.Scene.call(this, { key: 'HubScene' });
  }
  HubScene.prototype = Object.create(Phaser.Scene.prototype);
  HubScene.prototype.constructor = HubScene;

  HubScene.prototype.create = function () {
    this.inboxDone = !!this.registry.get('inboxComplete');
    this.attachmentDone = !!this.registry.get('attachmentComplete');
    this.loginDone = !!this.registry.get('fakeLoginComplete');
    this.bossDone = !!this.registry.get('ch1BossComplete');
    this.allMissionsDone = this.inboxDone && this.attachmentDone && this.loginDone;

    this.interactHint = null;
    this.nearDoor = false;
    this.nearServer = false;
    this.nearPc = false;
    this.enteringRoom = false;

    resetCamera(this);
    setupPause(this);
    initTouchControls(this);

    buildCorridorMap(this);

    const spawn = tilePx(HUB.player.c, HUB.player.r);
    this.player = this.add.sprite(spawn.x, spawn.y, 'pixel');
    this.player.setDisplaySize(20, 28);
    this.player.setTint(COLORS.player);
    this.player.setDepth(4);

    this.playerGfx = this.add.graphics();
    this.playerGfx.setDepth(5);
    drawPlayerSprite(this.playerGfx, this.player.x, this.player.y);

    const doorPos = tilePx(HUB.door.c, HUB.door.r);
    this.serverPos = tilePx(HUB.server.c, HUB.server.r);
    this.pcPos = tilePx(HUB.pc.c, HUB.pc.r);

    this.doorGfx = this.add.graphics().setDepth(2);
    this.doorLabel = this.add.text(doorPos.x, doorPos.y - TILE * 0.55, 'DOOR', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '7px',
      color: this.getDoorColor(),
      align: 'center',
    }).setOrigin(0.5).setDepth(3);

    this.doorLockIcon = this.add.text(doorPos.x, doorPos.y + 4, this.getDoorStatus(), {
      fontFamily: 'VT323, monospace',
      fontSize: '14px',
      color: this.getDoorColor(),
    }).setOrigin(0.5).setDepth(3);

    this.doorSubLabel = this.add.text(doorPos.x, doorPos.y + 18, this.getDoorSubLabel(), {
      fontFamily: 'VT323, monospace',
      fontSize: '12px',
      color: '#8899aa',
    }).setOrigin(0.5).setDepth(3);

    this.doorPos = doorPos;
    this.doorInteractZone = this.add.rectangle(doorPos.x, doorPos.y, TILE * 2, TILE * 1.6, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);
    this.doorInteractZone.on('pointerdown', () => this.tryInteract('door'));

    this.drawDoor(this.inboxDone);

    const pcXY = tileXY(HUB.pc.c - 1, HUB.pc.r);
    drawTerminal(this, pcXY.x, pcXY.y - 8, 'LOGIN', COLORS.terminal);
    this.pcInteractZone = this.add.rectangle(this.pcPos.x, this.pcPos.y, TILE * 2.2, TILE * 1.8, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);
    this.pcInteractZone.on('pointerdown', () => this.tryInteract('pc'));

    const srvXY = tileXY(HUB.server.c - 1, HUB.server.r);
    drawTerminal(this, srvXY.x, srvXY.y - 8, 'SERVER', COLORS.server);
    this.serverInteractZone = this.add.rectangle(this.serverPos.x, this.serverPos.y, TILE * 2.2, TILE * 1.8, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);
    this.serverInteractZone.on('pointerdown', () => this.tryInteract('server'));

    this.keyPos = tilePx(HUB.key.c, HUB.key.r);
    this.hasKey = !!this.registry.get('hasKey');
    const keyXY = tileXY(HUB.key.c - 1, HUB.key.r);
    this.keyObjects = drawKeycardProp(this, keyXY.x, keyXY.y - 6);
    if (this.hasKey) {
      this.keyObjects.gfx.setVisible(false);
      this.keyObjects.label.setVisible(false);
    } else {
      this.keyClickZone = this.add.circle(this.keyPos.x, this.keyPos.y, 24, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(16);
      this.keyClickZone.on('pointerdown', () => this.tryPickupKey(true));
    }

    const lives = this.registry.get('lives') ?? START_LIVES;
    const score = this.registry.get('score') ?? START_SCORE;

    const agent = this.registry.get('agentName') || 'agent';
    this.add.text(8, 8, `AGENT: ${agent}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#00ffcc',
    }).setScrollFactor(0).setDepth(20);

    this.livesHud = this.add.text(8, 28, `LIVES: ${'♥'.repeat(lives)}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#ff3366',
    }).setScrollFactor(0).setDepth(20);

    this.scoreHud = this.add.text(8, 48, `SCORE: ${score}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#ffb000',
    }).setScrollFactor(0).setDepth(20);

    this.keyHud = this.add.text(GAME_W - 12, 8, this.hasKey ? 'KEY: ✓' : 'KEY: —', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: this.hasKey ? '#ffb000' : '#556677',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);

    this.statusText = this.add.text(8, 68, this.getStatusLine(), {
      fontFamily: 'VT323, monospace',
      fontSize: '16px',
      color: '#ff3366',
    }).setScrollFactor(0).setDepth(20);

    this.promptText = this.add.text(GAME_W / 2, (HUB.roomY + HUB.roomRows) * TILE + 28, this.getDefaultPrompt(), {
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

    if (this.game.canvas) {
      this.game.canvas.setAttribute('tabindex', '0');
      this.game.canvas.focus();
    }
    this.input.on('pointerdown', () => {
      if (this.game.canvas) this.game.canvas.focus();
      const wrap = document.getElementById('game-canvas-wrap');
      if (wrap) wrap.focus();
    });

    if (this.registry.get('justUnlockedInbox')) {
      this.registry.set('justUnlockedInbox', false);
      this.playMissionUnlockAnimation('INBOX ROOM — ACCESS GRANTED', 'Door unlocked! Inbox Room secured.');
    } else if (this.registry.get('justUnlockedAttachment')) {
      this.registry.set('justUnlockedAttachment', false);
      this.playMissionUnlockAnimation('ATTACHMENT SANDBOX — ONLINE', 'Server terminal ready. Analyze the PDF.');
    } else if (this.registry.get('justUnlockedLogin')) {
      this.registry.set('justUnlockedLogin', false);
      this.playMissionUnlockAnimation('LOGIN PORTAL — ARMED', 'PC terminal ready. Verify the login URL.');
    }

    updateHintBar(this.getDefaultPrompt());
    this.cameras.main.fadeIn(500, 0, 0, 0);
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
    if (this.allMissionsDone) return 'EXIT';
    if (this.inboxDone) return 'CLEARED';
    return 'INBOX';
  };

  HubScene.prototype.getStatusLine = function () {
    if (this.bossDone) return 'CHAPTER 1 — CONTAINED';
    if (this.allMissionsDone) return 'FINAL BREACH — DOOR READY';
    if (this.loginDone) return 'ALL ROOMS CLEARED — DOOR';
    if (this.attachmentDone) return 'LOGIN TERMINAL — ACTIVE';
    if (this.inboxDone) return 'SERVER TERMINAL — ACTIVE';
    return 'LOCKDOWN — CHIMERA ACTIVE';
  };

  HubScene.prototype.getDefaultPrompt = function () {
    if (this.allMissionsDone && !this.bossDone) {
      return '[ E ] at DOOR — confront CHIMERA and escape';
    }
    if (this.loginDone) {
      return 'All missions cleared — head to the DOOR (top-right)';
    }
    if (this.attachmentDone && !this.loginDone) {
      return '[ E ] at LOGIN terminal (top-left) — Fake Login Portal';
    }
    if (this.inboxDone && !this.attachmentDone) {
      return '[ E ] at SERVER (bottom-left) — Attachment Sandbox';
    }
    if (this.hasKey) {
      return '[ E ] at DOOR — enter Inbox Room (Phishing)';
    }
    return 'Find the KEY (bottom-right), then unlock the DOOR';
  };

  HubScene.prototype.drawDoor = function (open) {
    this.doorGfx.clear();
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

  HubScene.prototype.playMissionUnlockAnimation = function (statusLine, dialogue) {
    this.input.enabled = false;
    this.cameras.main.flash(200, 255, 51, 102);
    this.statusText.setText(statusLine);
    if (typeof AudioFX !== 'undefined') AudioFX.doorUnlock();

    let step = 0;
    const pulse = this.time.addEvent({
      delay: 120,
      repeat: 8,
      callback: () => {
        step += 1;
        this.drawDoor(step % 2 === 0);
      },
    });

    this.time.delayedCall(1200, () => {
      pulse.destroy();
      this.drawDoor(this.inboxDone);
      this.input.enabled = true;
      this.showDialogue(dialogue);
    });
  };

  HubScene.prototype.showDialogue = function (text, onClose) {
    this.dialogueBox.show(text, onClose);
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

  HubScene.prototype.isNearKey = function () {
    if (this.hasKey || !this.keyPos) return false;
    return this.isNear(this.keyPos, KEY_INTERACT_RADIUS);
  };

  HubScene.prototype.tryPickupKey = function (fromClick) {
    if (this.hasKey || this.isPaused) return;
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
      this.keyObjects.label.setVisible(false);
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
    if (this.isPaused || this.enteringRoom) return;
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

    this.flashPrompt('Move closer to KEY, DOOR, SERVER, or LOGIN', '#ff3366');
  };

  HubScene.prototype.handleDoorInteract = function () {
    if (!this.isNearDoor()) {
      this.flashPrompt('Move closer to the DOOR (top-right)', '#ff3366');
      return;
    }

    if (this.allMissionsDone && !this.bossDone) {
      sfxClick();
      this.enteringRoom = true;
      this.showDialogue(
        'CHIMERA: Three vectors contained… but I am still in the wire.\nAgent — seal the breach. NOW.',
        () => {
          this.registry.set('ch1BossComplete', true);
          persistProgress(this.registry);
          sfxRoomComplete('ch1_boss');
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.time.delayedCall(520, () => this.scene.start('ChapterCompleteScene'));
        }
      );
      return;
    }

    if (this.inboxDone) {
      if (this.loginDone) {
        this.flashPrompt('All rooms cleared — use DOOR for final breach', '#ffb000');
      } else {
        this.flashPrompt('Inbox cleared — use SERVER or LOGIN terminals', '#00ff66');
      }
      return;
    }

    if (!this.hasKey) {
      sfxError();
      this.cameras.main.flash(100, 255, 51, 102);
      this.flashPrompt('DOOR LOCKED — pick up the KEY (bottom-right) first', '#ff3366');
      return;
    }

    sfxClick();
    this.enteringRoom = true;
    switchScene(this, 'PhishingScene');
  };

  HubScene.prototype.handleServerInteract = function () {
    if (!this.isNearServer()) {
      this.flashPrompt('Move closer to the SERVER (bottom-left)', '#ff3366');
      return;
    }
    if (!this.inboxDone) {
      this.flashPrompt('Clear the INBOX room at the DOOR first', '#ff3366');
      return;
    }
    if (this.attachmentDone) {
      this.flashPrompt('Attachment Sandbox already cleared', '#00ff66');
      return;
    }
    sfxClick();
    this.enteringRoom = true;
    switchScene(this, 'AttachmentScene');
  };

  HubScene.prototype.handlePcInteract = function () {
    if (!this.isNearPc()) {
      this.flashPrompt('Move closer to the LOGIN terminal (top-left)', '#ff3366');
      return;
    }
    if (!this.attachmentDone) {
      this.flashPrompt('Clear the SERVER room (Attachment) first', '#ff3366');
      return;
    }
    if (this.loginDone) {
      this.flashPrompt('Fake Login Portal already cleared', '#00ff66');
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
    const m = 14;
    this.player.x = Phaser.Math.Clamp(this.player.x, m, GAME_W - m);
    this.player.y = Phaser.Math.Clamp(this.player.y, m, GAME_H - m);
  };

  HubScene.prototype.update = function (time, delta) {
    if (!this.player || this.isPaused) return;

    applyTouchMovement(this, 200, delta);
    this.clampPlayer();
    drawPlayerSprite(this.playerGfx, this.player.x, this.player.y);

    this.nearDoor = this.isNearDoor();
    this.nearServer = this.isNearServer();
    this.nearPc = this.isNearPc();
    this.nearKey = this.isNearKey();

    if (Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      if (this.nearKey) this.tryPickupKey(false);
      else if (this.nearServer) this.tryInteract('server');
      else if (this.nearPc) this.tryInteract('pc');
      else if (this.nearDoor) this.tryInteract('door');
      else this.tryInteract('none');
    }

    if (this.promptFlash || this.dialogueBox.visible) return;

    if (this.nearKey) {
      this.promptText.setText('[ E ] or click KEY — pick up access key');
      this.promptText.setColor('#ffb000');
    } else if (this.nearServer && this.inboxDone && !this.attachmentDone) {
      this.promptText.setText('[ E ] SERVER — Attachment Sandbox');
      this.promptText.setColor('#aa88ff');
    } else if (this.nearPc && this.attachmentDone && !this.loginDone) {
      this.promptText.setText('[ E ] LOGIN — Fake Login Portal');
      this.promptText.setColor('#00ccff');
    } else if (this.nearDoor && this.allMissionsDone && !this.bossDone) {
      this.promptText.setText('[ E ] DOOR — final breach / chapter boss');
      this.promptText.setColor('#ffb000');
    } else if (this.nearDoor && !this.inboxDone) {
      if (this.hasKey) {
        this.promptText.setText('[ E ] Use KEY on DOOR — enter Inbox Room');
        this.promptText.setColor('#ffb000');
      } else {
        this.promptText.setText('DOOR LOCKED — get the KEY (bottom-right) first');
        this.promptText.setColor('#ff3366');
      }
    } else if (this.nearDoor && this.inboxDone) {
      this.promptText.setText('DOOR — Inbox cleared ✓');
      this.promptText.setColor('#00ff66');
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

  // ─── Game over ──────────────────────────────────────────────────────────
  function GameOverScene() {
    Phaser.Scene.call(this, { key: 'GameOverScene' });
  }
  GameOverScene.prototype = Object.create(Phaser.Scene.prototype);
  GameOverScene.prototype.constructor = GameOverScene;

  GameOverScene.prototype.create = function () {
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
    const cx = GAME_W / 2;
    drawScanlines(this);
    setupPause(this);

    const inbox = !!this.registry.get('inboxComplete');
    const attach = !!this.registry.get('attachmentComplete');
    const login = !!this.registry.get('fakeLoginComplete');

    this.add.rectangle(cx, GAME_H / 2, GAME_W - 32, GAME_H - 32, COLORS.dialogue, 0.95)
      .setStrokeStyle(4, COLORS.doorOpen);

    this.add.text(cx, 70, 'CHAPTER 1 COMPLETE', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '14px',
      color: '#00ff66',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, 102, 'THE EMAIL', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '10px',
      color: '#ffb000',
    }).setOrigin(0.5);

    const missionLines = [
      { label: 'Phishing Inbox', done: inbox },
      { label: 'Attachment Sandbox', done: attach },
      { label: 'Fake Login Portal', done: login },
    ];

    this.add.text(cx, 132, '"Something got through — then you shut it down."', {
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

    this.add.text(cx, 288, 'CHIMERA contained. Corridor secure.', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#aabbcc',
    }).setOrigin(0.5);

    makeButton(this, cx, GAME_H - 72, '[ RETURN TO CORRIDOR ]', () => {
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

  function drawPlayerSprite(g, x, y) {
    g.clear();
    g.fillStyle(COLORS.playerOutline, 1);
    g.fillRect(x - 9, y - 12, 18, 24);
    g.fillStyle(COLORS.player, 1);
    g.fillRect(x - 7, y - 10, 14, 20);
    g.fillStyle(0xffddaa, 1);
    g.fillRect(x - 5, y - 14, 10, 8);
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
    if (cam.fadeEffect) {
      cam.fadeEffect.stop(true);
      cam.fadeEffect.reset();
    }
    if (cam.flashEffect) {
      cam.flashEffect.stop(true);
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
      onClose: null,
      group: scene.add.container(GAME_W / 2, GAME_H - 80).setDepth(30).setVisible(false),
    };
    const bg = scene.add.rectangle(0, 0, GAME_W - 48, 72, COLORS.dialogue, 0.95)
      .setStrokeStyle(2, COLORS.dialogueBorder);
    const txt = scene.add.text(0, -8, '', {
      fontFamily: 'VT323, monospace',
      fontSize: '20px',
      color: '#aabbcc',
      align: 'center',
      wordWrap: { width: GAME_W - 80 },
    }).setOrigin(0.5);
    const hint = scene.add.text(0, 24, '[ E ] dismiss', {
      fontFamily: 'VT323, monospace',
      fontSize: '14px',
      color: '#556677',
    }).setOrigin(0.5);
    box.group.add([bg, txt, hint]);
    box.text = txt;

    box.show = (message, onClose) => {
      box.visible = true;
      box.onClose = onClose || null;
      box.text.setText(message);
      box.group.setVisible(true);
    };
    box.dismiss = () => {
      if (!box.visible) return;
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launchGame);
  } else {
    launchGame();
  }
})();
