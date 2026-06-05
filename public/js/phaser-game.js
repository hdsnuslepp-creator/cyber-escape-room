/**
 * Cyber Escape: Lockdown Protocol
 * Phaser 3 prototype — corridor hub + phishing room + door unlock
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
    key: { c: 15, r: 7 },
  };

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
    scene: [BootScene, TitleScene, HubScene, PhishingScene, ChapterCompleteScene],
  };

  let game;

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
    this.registry.set('agentName', '');
    this.registry.set('inboxComplete', false);
    this.registry.set('score', 1000);
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

    this.add.rectangle(cx, GAME_H / 2, GAME_W - 40, GAME_H - 40, COLORS.dialogue, 0.92)
      .setStrokeStyle(3, COLORS.dialogueBorder);

    this.add.text(cx, 72, 'CYBER ESCAPE', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '18px',
      color: '#00ffcc',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, 102, 'LOCKDOWN PROTOCOL', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '11px',
      color: '#ffb000',
      align: 'center',
    }).setOrigin(0.5);

    const story = [
      'EU cyber training facility — simulation active.',
      'AI security hijacked by attacker: CHIMERA.',
      'LOCKDOWN ENGAGED. Clear security rooms.',
      'Recover keys. Stop the ransomware. Escape.',
    ];
    story.forEach((line, i) => {
      this.add.text(cx, 148 + i * 22, line, {
        fontFamily: 'VT323, monospace',
        fontSize: '18px',
        color: '#aabbcc',
        align: 'center',
      }).setOrigin(0.5);
    });

    this.add.text(cx, 248, '> ENTER AGENT CODENAME', {
      fontFamily: 'VT323, monospace',
      fontSize: '20px',
      color: '#00ff66',
    }).setOrigin(0.5);

    const nameBg = this.add.rectangle(cx, 278, 280, 28, 0x000000, 0.8)
      .setStrokeStyle(2, 0x00ffcc);
    const nameText = this.add.text(cx, 278, 'agent_01', {
      fontFamily: 'VT323, monospace',
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    let codename = 'agent_01';
    this.input.keyboard.on('keydown', (ev) => {
      if (ev.key === 'Enter') {
        this.registry.set('agentName', codename.trim() || 'agent_01');
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(420, () => this.scene.start('HubScene'));
        return;
      }
      if (ev.key === 'Backspace') {
        codename = codename.slice(0, -1);
      } else if (ev.key.length === 1 && codename.length < 16 && /[a-zA-Z0-9_-]/.test(ev.key)) {
        codename += ev.key;
      }
      nameText.setText(codename || '_');
    });

    const startBtn = makeButton(this, cx, 330, '[ INITIALIZE BREACH ]', () => {
      this.registry.set('agentName', codename.trim() || 'agent_01');
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(420, () => this.scene.start('HubScene'));
    });

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
    const inboxDone = this.registry.get('inboxComplete');
    this.interactHint = null;
    this.nearDoor = false;
    this.doorOpen = inboxDone;

    buildCorridorMap(this);
    const walkTop = HUB.roomY + 1;
    const walkRows = HUB.roomRows - 2;
    this.physics.world.setBounds(TILE, walkTop * TILE, (MAP_W - 2) * TILE, walkRows * TILE);

    const spawn = tilePx(HUB.player.c, HUB.player.r);
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'pixel');
    this.player.setDisplaySize(20, 28);
    this.player.setTint(COLORS.player);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(16, 20).setOffset(2, 6);

    this.playerGfx = this.add.graphics();
    this.playerGfx.setDepth(5);
    drawPlayerSprite(this.playerGfx, this.player.x, this.player.y);

    const doorPos = tilePx(HUB.door.c, HUB.door.r);
    this.doorZone = this.add.zone(doorPos.x, doorPos.y, TILE * 2, TILE * 2);
    this.physics.add.existing(this.doorZone, true);

    this.doorGfx = this.add.graphics().setDepth(2);
    this.doorLabel = this.add.text(doorPos.x, doorPos.y - TILE * 0.55, 'DOOR', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '7px',
      color: inboxDone ? '#00ff66' : '#ff3366',
      align: 'center',
    }).setOrigin(0.5).setDepth(3);

    this.doorLockIcon = this.add.text(doorPos.x, doorPos.y + 4, inboxDone ? 'OPEN' : 'LOCKED', {
      fontFamily: 'VT323, monospace',
      fontSize: '14px',
      color: inboxDone ? '#00ff66' : '#ff3366',
    }).setOrigin(0.5).setDepth(3);

    this.doorSubLabel = this.add.text(doorPos.x, doorPos.y + 18, 'INBOX', {
      fontFamily: 'VT323, monospace',
      fontSize: '12px',
      color: '#8899aa',
    }).setOrigin(0.5).setDepth(3);

    this.drawDoor(inboxDone);

    this.doorBlocker = null;
    if (!inboxDone) {
      this.doorBlocker = this.add.rectangle(doorPos.x, doorPos.y, TILE * 2.2, TILE * 1.4, 0x000000, 0);
      this.physics.add.existing(this.doorBlocker, true);
      this.physics.add.collider(this.player, this.doorBlocker);
    }

    const pcXY = tileXY(HUB.pc.c - 1, HUB.pc.r);
    drawTerminal(this, pcXY.x, pcXY.y - 8, 'PC', COLORS.terminal);

    const srvXY = tileXY(HUB.server.c - 1, HUB.server.r);
    drawTerminal(this, srvXY.x, srvXY.y - 8, 'SERVER', COLORS.server);

    const keyXY = tileXY(HUB.key.c, HUB.key.r);
    drawKeycardProp(this, keyXY.x, keyXY.y - 10);

    // HUD
    const agent = this.registry.get('agentName') || 'agent';
    this.add.text(8, 8, `AGENT: ${agent}`, {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#00ffcc',
    }).setScrollFactor(0).setDepth(20);

    this.statusText = this.add.text(8, 28, 'LOCKDOWN — CHIMERA ACTIVE', {
      fontFamily: 'VT323, monospace',
      fontSize: '16px',
      color: '#ff3366',
    }).setScrollFactor(0).setDepth(20);

    this.promptText = this.add.text(GAME_W / 2, (HUB.roomY + HUB.roomRows) * TILE + 28, 'WASD / Arrows to move', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#8899aa',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);

    // Dialogue box (hidden)
    this.dialogueBox = createDialogueBox(this);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.input.keyboard.on('keydown-E', () => this.tryInteract());
    this.input.keyboard.on('keydown-SPACE', () => this.tryInteract());

    // Unlock animation if just completed
    if (this.registry.get('justUnlockedInbox')) {
      this.registry.set('justUnlockedInbox', false);
      this.playDoorUnlockAnimation();
    }

    this.cameras.main.fadeIn(500, 0, 0, 0);
  };

  HubScene.prototype.drawDoor = function (open) {
    this.doorGfx.clear();
    const c = HUB.door.c;
    const r = HUB.door.r;
    const x = (c - 1) * TILE;
    const y = (r - 1) * TILE + 4;
    const w = TILE * 2.2;
    const h = TILE * 1.6;
    this.doorGfx.fillStyle(open ? COLORS.doorOpen : COLORS.doorLocked, open ? 0.35 : 0.55);
    this.doorGfx.fillRect(x, y, w, h);
    this.doorGfx.lineStyle(2, open ? COLORS.doorOpen : COLORS.doorLocked, 1);
    this.doorGfx.strokeRect(x, y, w, h);
    if (!open) {
      this.doorGfx.fillStyle(COLORS.doorLocked, 0.9);
      this.doorGfx.fillRect(x + w / 2 - 4, y + h / 2 - 8, 8, 14);
    } else {
      this.doorGfx.fillStyle(COLORS.doorOpen, 0.25);
      this.doorGfx.fillRect(x + 4, y + 4, w / 2 - 6, h - 8);
    }
  };

  HubScene.prototype.playDoorUnlockAnimation = function () {
    this.doorOpen = true;
    this.input.enabled = false;

    // Alarm flash
    this.cameras.main.flash(200, 255, 51, 102);
    this.statusText.setText('INBOX ROOM — ACCESS GRANTED');

    this.tweens.add({
      targets: this.doorLockIcon,
      scale: { from: 1, to: 1.4 },
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.doorLockIcon.setText('OPEN').setColor('#00ff66');
        this.doorLabel.setColor('#00ff66');
      },
    });

    let step = 0;
    const pulse = this.time.addEvent({
      delay: 120,
      repeat: 8,
      callback: () => {
        step += 1;
        const open = step % 2 === 0;
        this.drawDoor(open);
      },
    });

    this.time.delayedCall(1200, () => {
      pulse.destroy();
      this.drawDoor(true);
      if (this.doorBlocker && this.doorBlocker.active) {
        this.doorBlocker.destroy();
        this.doorBlocker = null;
      }
      this.input.enabled = true;
      this.showDialogue('Door unlocked! Inbox Room secured.', () => {
        this.time.delayedCall(800, () => {
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.time.delayedCall(520, () => this.scene.start('ChapterCompleteScene'));
        });
      });
    });
  };

  HubScene.prototype.showDialogue = function (text, onClose) {
    this.dialogueBox.show(text, onClose);
  };

  HubScene.prototype.tryInteract = function () {
    if (this.dialogueBox.visible) {
      this.dialogueBox.dismiss();
      return;
    }
    if (this.nearDoor && !this.doorOpen) {
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.time.delayedCall(380, () => this.scene.start('PhishingScene'));
    } else if (this.nearDoor && this.doorOpen) {
      this.showDialogue('Inbox Room already cleared. More doors coming soon.');
    }
  };

  HubScene.prototype.update = function () {
    const speed = 120;
    this.player.setVelocity(0);
    let moving = false;

    if (this.cursors.left.isDown || this.keys.a.isDown) {
      this.player.setVelocityX(-speed);
      moving = true;
    } else if (this.cursors.right.isDown || this.keys.d.isDown) {
      this.player.setVelocityX(speed);
      moving = true;
    }
    if (this.cursors.up.isDown || this.keys.w.isDown) {
      this.player.setVelocityY(-speed);
      moving = true;
    } else if (this.cursors.down.isDown || this.keys.s.isDown) {
      this.player.setVelocityY(speed);
      moving = true;
    }

    drawPlayerSprite(this.playerGfx, this.player.x, this.player.y);

    const doorPos = tilePx(HUB.door.c, HUB.door.r);
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, doorPos.x, doorPos.y);
    this.nearDoor = dist < 44;

    if (this.nearDoor && !this.doorOpen) {
      this.promptText.setText('[ E ] Enter Inbox Room — Phishing challenge');
      this.promptText.setColor('#ffb000');
    } else if (this.nearDoor && this.doorOpen) {
      this.promptText.setText('Inbox Room — CLEARED ✓');
      this.promptText.setColor('#00ff66');
    } else {
      this.promptText.setText('WASD / Arrows to move  •  Walk to doors to interact');
      this.promptText.setColor('#8899aa');
    }
  };

  // ─── Phishing puzzle ────────────────────────────────────────────────────
  function PhishingScene() {
    Phaser.Scene.call(this, { key: 'PhishingScene' });
  }
  PhishingScene.prototype = Object.create(Phaser.Scene.prototype);
  PhishingScene.prototype.constructor = PhishingScene;

  PhishingScene.prototype.create = function () {
    this.foundFlags = new Set();
    this.requiredFlags = new Set(['sender', 'link', 'urgency']);

    drawScanlines(this);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W - 24, GAME_H - 24, 0xc0c0c0, 1)
      .setStrokeStyle(3, 0x000080);

    // Win98-style title bar
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

    this.flagCounter = this.add.text(GAME_W / 2, 280, 'Red flags: 0 / 3', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '9px',
      color: '#ff3366',
    }).setOrigin(0.5);

    this.completeBtn = makeButton(this, GAME_W / 2, 320, '[ COMPLETE MISSION ]', () => this.submitPhishing(), {
      fontSize: '9px',
      disabled: true,
    });
    this.completeBtn.setAlpha(0.45);

    this.add.text(GAME_W / 2, 358, 'Click suspicious parts of the email', {
      fontFamily: 'VT323, monospace',
      fontSize: '18px',
      color: '#333',
    }).setOrigin(0.5);

    makeButton(this, 70, GAME_H - 36, '[ EXIT ]', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(320, () => this.scene.start('HubScene'));
    }, { fontSize: '8px', color: '#8899aa' });

    this.cameras.main.fadeIn(400, 0, 0, 0);
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
      if (this.foundFlags.has(flagKey)) return;
      if (this.requiredFlags.has(flagKey)) {
        this.foundFlags.add(flagKey);
        bg.setFillStyle(0x00ff66, 0.35).setStrokeStyle(2, 0x00aa44);
        txt.setColor('#004422');
        this.flagCounter.setText(`Red flags: ${this.foundFlags.size} / 3`);
        if (this.foundFlags.size >= 3) {
          this.completeBtn.setAlpha(1);
          this.completeBtn.disabled = false;
        }
      }
    });
  };

  PhishingScene.prototype.submitPhishing = function () {
    if (this.foundFlags.size < 3 || this.completeBtn.disabled) return;
    this.registry.set('inboxComplete', true);
    this.registry.set('justUnlockedInbox', true);
    this.cameras.main.flash(150, 0, 255, 102);
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.time.delayedCall(480, () => this.scene.start('HubScene'));
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

    this.add.rectangle(cx, GAME_H / 2, GAME_W - 32, GAME_H - 32, COLORS.dialogue, 0.95)
      .setStrokeStyle(4, COLORS.doorOpen);

    this.add.text(cx, 80, 'CHAPTER 1 COMPLETE', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '14px',
      color: '#00ff66',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, 120, 'THE EMAIL', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '10px',
      color: '#ffb000',
    }).setOrigin(0.5);

    const lines = [
      '"Something got through."',
      '',
      '✓ Phishing Inbox — cleared',
      '🔒 Attachment Sandbox — coming soon',
      '🔒 Fake Login Portal — coming soon',
      '',
      'You recovered the first access key.',
      'The corridor awaits more doors...',
    ];
    lines.forEach((line, i) => {
      this.add.text(cx, 155 + i * 24, line, {
        fontFamily: 'VT323, monospace',
        fontSize: line.startsWith('✓') || line.startsWith('🔒') ? '20px' : '18px',
        color: line.startsWith('✓') ? '#00ff66' : line.startsWith('🔒') ? '#556677' : '#aabbcc',
        align: 'center',
      }).setOrigin(0.5);
    });

    makeButton(this, cx, GAME_H - 72, '[ RETURN TO CORRIDOR ]', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(420, () => this.scene.start('HubScene'));
    });

    makeButton(this, cx, GAME_H - 36, '[ FULL TRAINING MODE ]', () => {
      window.location.href = 'index.html';
    }, { fontSize: '8px', color: '#00ffcc' });

    // Confetti pixels
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

    // ASCII-style corner blocks (█) on wall tiles
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
    scene.add.text(x + 12, y + 24, 'KEY', {
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
