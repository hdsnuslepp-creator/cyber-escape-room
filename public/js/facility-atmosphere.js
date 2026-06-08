/**
 * Facility atmosphere — irregular layout, pixel props, darkness + flashlight,
 * terminal glow, CHIMERA environment pulses. Chapter 1 palette: cyan / green.
 */
(function () {
  'use strict';

  const TILE = 32;

  // Chapter 1 — cyan + green facility mood
  const CH1 = {
    void: 0x020408,
    wall: 0x0a1218,
    wallEdge: 0x00ffcc,
    wallEdgeDim: 0x004433,
    floor: 0x0c1820,
    floorAlt: 0x091420,
    login: 0x2288ff,
    loginGlow: 0x44ccff,
    archive: 0xaa44cc,
    archiveGlow: 0xcc66ff,
    server: 0x5533aa,
    serverGlow: 0x8866ff,
    doorLocked: 0xff3366,
    doorOpen: 0x00ff66,
    doorBoss: 0xffb000,
    accent: 0x00ffcc,
    green: 0x00ff66,
    graffiti: 0x334455,
    note: 0xffdd88,
  };

  // L-shaped corridor with alcoves — . = floor, W = wall
  const HUB_LAYOUT = [
    'WWWWWWWWWWWWDDWWWWWW',
    'WLLW....AA....DD...W',
    'W..WWWW.......WW...W',
    'W......@.........WW',
    'W..WWWWW...........W',
    'WSSW............KKKW',
    'WWWWWWWWWWWWWWWWWWWW',
  ];

  const HUB_POSITIONS = {
    roomY: 2,
    roomRows: 7,
    pc: { c: 2, r: 3 },
    door: { c: 13, r: 2 },
    player: { c: 10, r: 5 },
    server: { c: 2, r: 7 },
    key: { c: 17, r: 7 },
    archive: { c: 9, r: 3 },
  };

  function tilePx(c, r) {
    return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
  }

  function parseLayout() {
    const walls = new Set();
    for (let ri = 0; ri < HUB_LAYOUT.length; ri++) {
      const row = HUB_LAYOUT[ri];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === 'W') walls.add(`${c},${HUB_POSITIONS.roomY + ri}`);
      }
    }
    return walls;
  }

  const WALLS = parseLayout();

  function isWallTile(c, r) {
    return WALLS.has(`${c},${r}`);
  }

  /** Push the player out of wall tiles using a small footprint sample. */
  function resolveWallCollision(sprite, prevX, prevY) {
    const pts = [
      [sprite.x, sprite.y],
      [sprite.x - 8, sprite.y],
      [sprite.x + 8, sprite.y],
      [sprite.x, sprite.y - 10],
      [sprite.x, sprite.y + 10],
    ];
    for (const [px, py] of pts) {
      const c = Math.floor(px / TILE);
      const r = Math.floor(py / TILE);
      if (isWallTile(c, r)) {
        sprite.x = prevX;
        sprite.y = prevY;
        return;
      }
    }
  }

  /** Outer corridor bounds for clamping. */
  function clampToCorridor(sprite) {
    const half = 12;
    const minX = TILE + half;
    const maxX = (HUB_LAYOUT[0].length - 1) * TILE - half;
    const minY = (HUB_POSITIONS.roomY + 1) * TILE + half;
    const maxY = (HUB_POSITIONS.roomY + HUB_POSITIONS.roomRows - 1) * TILE - half;
    sprite.x = Phaser.Math.Clamp(sprite.x, minX, maxX);
    sprite.y = Phaser.Math.Clamp(sprite.y, minY, maxY);
  }

  function buildMap(scene) {
    const g = scene.add.graphics().setDepth(0);
    const pal = CH1;

    g.fillStyle(pal.void, 1);
    const gw = scene.game.config.width;
    const gh = scene.game.config.height;
    g.fillRect(0, 0, gw, gh);

    for (let ri = 0; ri < HUB_LAYOUT.length; ri++) {
      const row = HUB_LAYOUT[ri];
      for (let c = 0; c < row.length; c++) {
        const r = HUB_POSITIONS.roomY + ri;
        const x = c * TILE;
        const y = r * TILE;
        const ch = row[c];
        const isWall = ch === 'W';
        const isAlt = (c + r) % 2 === 0;

        if (isWall) {
          g.fillStyle(pal.wall, 1);
          g.fillRect(x, y, TILE, TILE);
          g.lineStyle(1, pal.wallEdgeDim, 0.45);
          g.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
          // Top-edge neon trim on inner walls
          if (ri > 0 && HUB_LAYOUT[ri - 1][c] === '.') {
            g.lineStyle(2, pal.wallEdge, 0.25);
            g.lineBetween(x + 2, y + 1, x + TILE - 2, y + 1);
          }
        } else {
          g.fillStyle(isAlt ? pal.floorAlt : pal.floor, 1);
          g.fillRect(x, y, TILE, TILE);
        }
      }
    }

    const fixtures = addEnvironmentalDetails(scene, pal);
    scene._lightFixtures = fixtures;
    return g;
  }

  function addEnvironmentalDetails(scene, pal) {
    const ry = HUB_POSITIONS.roomY;

    // Graffiti — previous trainees left warnings
    scene.add.text(18, (ry + 2) * TILE + 6, '581 WAS HERE', {
      fontFamily: 'VT323, monospace', fontSize: '11px', color: '#2a4455', angle: -4,
    }).setDepth(1).setAlpha(0.55);

    scene.add.text(8 * TILE + 4, (ry + 4) * TILE + 2, "DON'T TRUST HIM", {
      fontFamily: 'VT323, monospace', fontSize: '10px', color: '#442233', angle: 2,
    }).setDepth(1).setAlpha(0.5);

    scene.add.text(5 * TILE + 4, (ry + 2) * TILE + 8, 'TURN BACK', {
      fontFamily: 'VT323, monospace', fontSize: '10px', color: '#553322', angle: -6,
    }).setDepth(1).setAlpha(0.45);

    // Wall placard beside blast door (left jamb — not on the door itself)
    const doorC = HUB_POSITIONS.door.c;
    const doorR = HUB_POSITIONS.door.r;
    const placardG = scene.add.graphics().setDepth(1);
    const px = (doorC - 3) * TILE + 6;
    const py = doorR * TILE + 2;
    placardG.fillStyle(0x1a1208, 1);
    placardG.fillRect(px, py, 22, 28);
    placardG.lineStyle(1, 0xaa6622, 0.55);
    placardG.strokeRect(px, py, 22, 28);
    placardG.fillStyle(0xaa6622, 0.75);
    placardG.fillTriangle(px + 4, py + 10, px + 18, py + 10, px + 11, py + 18);
    scene.add.text(px + 11, py + 22, 'RESTRICTED', {
      fontFamily: 'VT323, monospace', fontSize: '7px', color: '#886644',
    }).setOrigin(0.5, 0).setDepth(1).setAlpha(0.65);
    const noteG = scene.add.graphics().setDepth(1);
    noteG.fillStyle(0xccc5aa, 0.85);
    noteG.fillRect(9 * TILE + 6, (ry + 5) * TILE + 10, 26, 20);
    noteG.lineStyle(1, 0x998866, 0.6);
    noteG.strokeRect(9 * TILE + 6, (ry + 5) * TILE + 10, 26, 20);
    scene.add.text(9 * TILE + 19, (ry + 5) * TILE + 20, '...581...', {
      fontFamily: 'VT323, monospace', fontSize: '8px', color: '#554433',
    }).setOrigin(0.5).setDepth(2).setAlpha(0.7).setAngle(-12);

    // Broken monitor on the floor
    const monX = 11 * TILE;
    const monY = (ry + 4) * TILE + 4;
    const monG = scene.add.graphics().setDepth(1);
    monG.fillStyle(0x1a1a22, 1);
    monG.fillRect(monX, monY, 28, 20);
    monG.fillStyle(0x220808, 0.9);
    monG.fillRect(monX + 3, monY + 3, 22, 12);
    monG.lineStyle(1, 0x442222, 1);
    monG.lineBetween(monX + 4, monY + 5, monX + 22, monY + 14);
    monG.lineBetween(monX + 20, monY + 4, monX + 8, monY + 15);
    // Monitor stand + loose cable
    monG.fillStyle(0x222228, 1);
    monG.fillRect(monX + 10, monY + 20, 8, 4);
    monG.lineStyle(2, 0x334455, 0.7);
    monG.lineBetween(monX + 14, monY + 24, monX + 28, monY + 30);
    monG.lineBetween(monX + 28, monY + 30, monX + 36, monY + 28);
    scene.add.text(monX + 14, monY + 22, "DON'T TRUST IT", {
      fontFamily: 'VT323, monospace', fontSize: '9px', color: '#663333',
    }).setOrigin(0.5, 0).setDepth(1).setAlpha(0.7);

    // Sticky note near archive
    scene.add.rectangle(7 * TILE + 8, (ry + 1) * TILE + 20, 22, 18, 0xffeeaa, 0.85)
      .setDepth(1).setAngle(6);
    scene.add.text(7 * TILE + 8, (ry + 1) * TILE + 20, '1998?', {
      fontFamily: 'VT323, monospace', fontSize: '10px', color: '#554422',
    }).setOrigin(0.5).setDepth(2).setAngle(6);

    // Security camera — entrance wall, not over the blast door
    const camG = scene.add.graphics().setDepth(2);
    camG.fillStyle(0x1a2030, 1);
    camG.fillRect(6 * TILE, (ry + 1) * TILE + 2, 14, 10);
    camG.fillStyle(0x223344, 1);
    camG.fillRect(6 * TILE + 3, (ry + 1) * TILE + 4, 8, 6);
    camG.fillStyle(0xff2233, 0.7);
    camG.fillCircle(6 * TILE + 7, (ry + 1) * TILE + 7, 2);

    // Floor vent grate
    const ventG = scene.add.graphics().setDepth(0);
    ventG.fillStyle(0x0a1018, 1);
    ventG.fillRect(13 * TILE + 4, (ry + 5) * TILE + 18, 24, 10);
    ventG.lineStyle(1, 0x223344, 0.6);
    for (let i = 0; i < 4; i++) {
      ventG.lineBetween(13 * TILE + 6, (ry + 5) * TILE + 20 + i * 2, 13 * TILE + 26, (ry + 5) * TILE + 20 + i * 2);
    }

    // Coffee cup + spilled stain
    const cupG = scene.add.graphics().setDepth(1);
    cupG.fillStyle(0x332211, 0.4);
    cupG.fillEllipse(6 * TILE + 10, (ry + 5) * TILE + 22, 14, 6);
    cupG.fillStyle(0x443322, 1);
    cupG.fillRect(6 * TILE + 6, (ry + 5) * TILE + 14, 10, 12);
    cupG.fillStyle(0x221100, 1);
    cupG.fillRect(6 * TILE + 7, (ry + 5) * TILE + 12, 8, 3);

    // Pipe / conduit along top inner wall + dangling cable
    const pipeG = scene.add.graphics().setDepth(0);
    pipeG.lineStyle(3, pal.wallEdgeDim, 0.3);
    pipeG.lineBetween(4 * TILE, (ry + 1) * TILE, 10 * TILE, (ry + 1) * TILE);
    pipeG.lineStyle(2, 0x334455, 0.5);
    pipeG.lineBetween(10 * TILE, (ry + 1) * TILE, 10 * TILE + 4, (ry + 2) * TILE + 8);
    pipeG.lineBetween(10 * TILE + 4, (ry + 2) * TILE + 8, 10 * TILE + 18, (ry + 2) * TILE + 12);

    // Overhead light fixtures (visual — flicker in createLighting)
    return [
      { x: 5 * TILE, y: (ry + 1) * TILE + 4, w: 28, h: 6 },
      { x: 10 * TILE, y: (ry + 1) * TILE + 4, w: 28, h: 6 },
      { x: 15 * TILE, y: (ry + 1) * TILE + 4, w: 28, h: 6 },
    ];
  }

  /** CRT login terminal — blue glow, flickering screen, scanline. */
  function createLoginTerminal(scene, c, r) {
    const x = c * TILE - 4;
    const y = r * TILE - 10;
    const root = scene.add.container(x, y).setDepth(2);
    const body = scene.add.graphics();
    const screen = scene.add.graphics();
    const scan = scene.add.graphics();

    function drawBody() {
      body.clear();
      // Desk
      body.fillStyle(0x141820, 1);
      body.fillRect(-4, 44, 60, 10);
      body.lineStyle(1, 0x223344, 0.5);
      body.strokeRect(-4, 44, 60, 10);
      // CRT monitor
      body.fillStyle(0x1a2230, 1);
      body.fillRect(0, 18, 52, 34);
      body.fillStyle(0x2a3344, 1);
      body.fillRect(4, 22, 44, 26);
      body.fillStyle(0x111820, 1);
      body.fillRect(18, 48, 16, 6);
      body.lineStyle(1, CH1.login, 0.6);
      body.strokeRect(0, 18, 52, 34);
      // Keyboard
      body.fillStyle(0x0c1018, 1);
      body.fillRect(8, 46, 36, 8);
      body.lineStyle(1, 0x334455, 0.4);
      for (let k = 0; k < 8; k++) body.strokeRect(10 + k * 4, 48, 3, 4);
    }

    let flicker = 1;
    let scanY = 0;

    function drawScreen() {
      screen.clear();
      screen.fillStyle(CH1.login, 0.15 + flicker * 0.12);
      screen.fillRect(6, 24, 40, 20);
      screen.fillStyle(CH1.loginGlow, 0.35 + flicker * 0.25);
      screen.fillRect(8, 26, 36, 16);
      // Fake terminal text lines
      screen.fillStyle(0x001122, 0.8);
      for (let i = 0; i < 3; i++) {
        screen.fillRect(10, 28 + i * 5, 20 + (i * 4), 2);
      }
    }

    drawBody();
    drawScreen();
    root.add([body, screen, scan]);

    const light = tilePx(c, r);
    light.radius = 56;
    light.color = CH1.loginGlow;

    return {
      root,
      light,
      update(time) {
        if (time % 180 < 16) flicker = Math.random() * 0.5;
        else if (time % 900 < 40) flicker = 0.15;
        else flicker = 0.85 + Math.sin(time / 320) * 0.1;
        drawScreen();

        scanY = (scanY + 0.6) % 18;
        scan.clear();
        scan.fillStyle(0x44ccff, 0.12);
        scan.fillRect(8, 26 + scanY, 36, 1);

        // glow removed — fillCircle lighting caused white/circle artifacts in-browser
      },
      pulse() {
        flicker = 1;
        scene.tweens.add({ targets: screen, alpha: 0.2, duration: 60, yoyo: true, repeat: 3 });
      },
    };
  }

  /** Archive — cabinet rows, purple glow, scattered papers. */
  function createArchive(scene, c, r) {
    const x = c * TILE - 8;
    const y = r * TILE - 12;
    const root = scene.add.container(x, y).setDepth(2);
    const g = scene.add.graphics();

    g.fillStyle(0x1a1020, 1);
    // Two cabinet columns
    g.fillRect(0, 8, 22, 44);
    g.fillRect(26, 4, 22, 48);
    g.lineStyle(1, CH1.archive, 0.55);
    g.strokeRect(0, 8, 22, 44);
    g.strokeRect(26, 4, 22, 48);
    // Drawer handles
    for (let i = 0; i < 3; i++) {
      g.fillStyle(CH1.archive, 0.5);
      g.fillRect(4, 14 + i * 12, 14, 2);
      g.fillRect(30, 12 + i * 12, 14, 2);
    }
    // Scattered papers
    const papers = [];
    for (let i = 0; i < 4; i++) {
      const p = scene.add.rectangle(8 + i * 10, 52 + (i % 2) * 3, 10, 7, 0xccc5aa, 0.75)
        .setAngle(-12 + i * 8).setDepth(2);
      papers.push(p);
      root.add(p);
    }
    root.add(g);

    const light = tilePx(c, r);
    light.radius = 48;
    light.color = CH1.archiveGlow;

    return {
      root,
      light,
      papers,
      update(time) {
        papers.forEach((p, i) => {
          p.y = 52 + (i % 2) * 3 + Math.sin(time / 800 + i) * 0.4;
        });
      },
      pulse() {
        scene.tweens.add({ targets: g, alpha: 0.3, duration: 50, yoyo: true, repeat: 4 });
      },
    };
  }

  /** Server rack — humming machine, blinking LEDs, rotating fan. */
  function createServerRack(scene, c, r) {
    const x = c * TILE - 6;
    const y = r * TILE - 14;
    const root = scene.add.container(x, y).setDepth(2);
    const g = scene.add.graphics();
    const leds = scene.add.graphics();
    const fan = scene.add.graphics();

    g.fillStyle(0x120a20, 1);
    g.fillRect(0, 0, 56, 58);
    g.lineStyle(2, CH1.server, 0.6);
    g.strokeRect(0, 0, 56, 58);
    // Rack units
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x0a0614, 1);
      g.fillRect(4, 6 + i * 12, 48, 10);
      g.lineStyle(1, CH1.server, 0.35);
      g.strokeRect(4, 6 + i * 12, 48, 10);
    }
    // Fan housing
    g.fillStyle(0x1a1428, 1);
    g.fillRect(38, 42, 14, 14);
    root.add([g, leds, fan]);

    let fanAngle = 0;
    const ledStates = [1, 0, 1, 1, 0, 1, 0, 0];

    const light = tilePx(c, r);
    light.radius = 52;
    light.color = CH1.serverGlow;

    return {
      root,
      light,
      update(time) {
        // Blinking LEDs
        leds.clear();
        const blink = Math.floor(time / 280) % 2;
        for (let i = 0; i < 8; i++) {
          const on = (ledStates[i] + blink + Math.floor(time / (400 + i * 60))) % 2 === 0;
          leds.fillStyle(on ? CH1.green : 0x220022, on ? 0.95 : 0.4);
          leds.fillRect(8 + (i % 4) * 10, 10 + Math.floor(i / 4) * 22, 4, 4);
        }

        // Rotating fan
        fanAngle += 0.12;
        fan.clear();
        fan.lineStyle(1, 0x556677, 0.7);
        for (let b = 0; b < 3; b++) {
          const a = fanAngle + (b * Math.PI * 2) / 3;
          fan.lineBetween(45, 49, 45 + Math.cos(a) * 5, 49 + Math.sin(a) * 5);
        }
      },
      pulse() {
        scene.tweens.add({ targets: leds, alpha: 0.2, duration: 40, yoyo: true, repeat: 5 });
      },
    };
  }

  /** Blast door with status banner — replaces flat DOOR label. */
  function createBlastDoor(scene, doorPos) {
    const gfx = scene.add.graphics().setDepth(3);
    const banner = scene.add.text(doorPos.x, doorPos.y - 46, '', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '6px',
      color: '#00ff66',
      align: 'center',
    }).setOrigin(0.5).setDepth(4).setAlpha(0);

    return {
      gfx,
      banner,
      draw(state) {
        const { open, inboxDone, allMissionsDone, hasKey, pulsing } = state;
        const c = HUB_POSITIONS.door.c;
        const r = HUB_POSITIONS.door.r;
        const x = (c - 1) * TILE - 4;
        const y = (r - 1) * TILE - 2;
        const w = TILE * 2.6;
        const h = TILE * 2.2;
        gfx.clear();

        const isBoss = allMissionsDone && !state.bossDone;
        const panelsOpen = pulsing ? !!open : (isBoss && !!hasKey);
        const col = isBoss ? CH1.doorBoss : (panelsOpen ? CH1.doorOpen : CH1.doorLocked);

        // Door frame
        gfx.fillStyle(0x0a1018, 1);
        gfx.fillRect(x - 4, y - 4, w + 8, h + 8);
        gfx.lineStyle(2, col, 0.7);
        gfx.strokeRect(x - 4, y - 4, w + 8, h + 8);

        // Two blast door panels
        const gap = panelsOpen ? 10 : 0;
        gfx.fillStyle(col, panelsOpen ? 0.25 : 0.45);
        gfx.fillRect(x, y, w / 2 - gap / 2, h);
        gfx.fillRect(x + w / 2 + gap / 2, y, w / 2 - gap / 2, h);
        gfx.lineStyle(2, col, 0.9);
        gfx.strokeRect(x, y, w / 2 - gap / 2, h);
        gfx.strokeRect(x + w / 2 + gap / 2, y, w / 2 - gap / 2, h);

        // Warning stripes on locked door (integrated — no separate prop)
        if (!panelsOpen && !isBoss) {
          gfx.fillStyle(0xff6600, 0.35);
          for (let i = 0; i < 5; i++) {
            gfx.fillRect(x + 4 + i * 12, y + 8 + (i % 2) * 10, 8, 4);
          }
          gfx.lineStyle(1, CH1.doorLocked, 0.6);
          gfx.strokeRect(x + 2, y + 2, w - 4, h - 4);
        }

        // Status banner
        const bossDone = state.bossDone;
        let txt = '';
        let bCol = '#ff3366';
        if (bossDone) { txt = 'CONTAINED'; bCol = '#00ff66'; }
        else if (isBoss && hasKey) { txt = 'FINAL BREACH'; bCol = '#ffb000'; }
        else if (isBoss) { txt = 'KEY REQUIRED'; bCol = '#ffb000'; }
        else if (pulsing && open) { txt = 'ACCESS GRANTED'; bCol = '#00ff66'; }
        else if (inboxDone && !allMissionsDone) { txt = 'SEALED'; bCol = '#8899aa'; }
        else { txt = 'LOCKED'; bCol = '#ff3366'; }

        banner.setText(txt);
        banner.setColor(bCol);
        banner.setAlpha(panelsOpen || isBoss ? 0.85 : 0.55);
      },
      pulseGrant() {
        banner.setAlpha(1);
        scene.tweens.add({
          targets: banner,
          alpha: { from: 1, to: 0.3 },
          duration: 100,
          yoyo: true,
          repeat: 6,
        });
      },
    };
  }

  function createKeycardProp(scene, c, r) {
    const x = c * TILE - 8;
    const y = r * TILE - 4;
    const g = scene.add.graphics().setDepth(2);
    g.fillStyle(0xffb000, 1);
    g.fillRect(x, y + 6, 24, 14);
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(x + 3, y + 9, 8, 7);
    g.lineStyle(1, 0xffdd88, 0.8);
    g.strokeRect(x, y + 6, 24, 14);
    const pos = tilePx(c, r);
    scene.tweens.add({ targets: g, alpha: { from: 0.65, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
    return { gfx: g, pos };
  }

  /** Dim overlay + flickering overhead fixtures + terminal proximity brighten. */
  function createLighting(scene) {
    const gw = scene.game.config.width;
    const gh = scene.game.config.height;

    const dark = scene.add.rectangle(gw / 2, gh / 2, gw, gh, 0x020408, 0.52)
      .setDepth(48);
    let dimLevel = 0.52;
    let chimeraDim = 0;
    let flickerOffset = 0;
    let nextFlicker = 0;

    const fixtureGfx = scene.add.graphics().setDepth(47);
    const specs = scene._lightFixtures || [];
    const fixtureState = specs.map(() => ({ alpha: 0.35, target: 0.35 }));

    function drawFixtures() {
      fixtureGfx.clear();
      specs.forEach((f, i) => {
        const a = fixtureState[i].alpha;
        fixtureGfx.fillStyle(0xcceeff, a);
        fixtureGfx.fillRect(f.x, f.y, f.w, f.h);
        fixtureGfx.fillStyle(0xffffff, a * 0.4);
        fixtureGfx.fillRect(f.x + 4, f.y + 1, f.w - 8, 2);
      });
    }
    drawFixtures();

    return {
      dark,
      setDim(v) { dimLevel = v; dark.setAlpha(v); },
      chimeraPulse() {
        chimeraDim = 0.22;
        flickerOffset = 0.18;
        fixtureState.forEach((fs) => { fs.target = 0.08; });
        dark.setAlpha(Math.min(0.82, dimLevel + chimeraDim));
        scene.time.delayedCall(400, () => {
          chimeraDim = 0;
          flickerOffset = 0;
          fixtureState.forEach((fs) => { fs.target = 0.35; });
          dark.setAlpha(dimLevel);
        });
      },
      update(player, lightPoints, time) {
        if (time > nextFlicker) {
          nextFlicker = time + 800 + Math.random() * 4000;
          if (Math.random() < 0.55) {
            flickerOffset = 0.08 + Math.random() * 0.14;
            const idx = Math.floor(Math.random() * fixtureState.length);
            if (fixtureState[idx]) fixtureState[idx].target = 0.05 + Math.random() * 0.1;
            scene.time.delayedCall(30 + Math.random() * 120, () => {
              flickerOffset = 0;
              if (fixtureState[idx]) fixtureState[idx].target = 0.35;
            });
          }
        }

        let dim = dimLevel + Math.sin(time / 2800) * 0.025 + flickerOffset + chimeraDim;

        if (player && lightPoints && lightPoints.length) {
          let nearest = Infinity;
          for (const lp of lightPoints) {
            const d = Phaser.Math.Distance.Between(player.x, player.y, lp.x, lp.y);
            nearest = Math.min(nearest, d);
          }
          if (nearest < 130) dim -= (1 - nearest / 130) * 0.14;
        }

        dark.setAlpha(Phaser.Math.Clamp(dim, 0.36, 0.78));

        fixtureState.forEach((fs, i) => {
          fs.alpha += (fs.target - fs.alpha) * 0.12;
          if (Math.random() < 0.004) fs.target = 0.1 + Math.random() * 0.3;
        });
        drawFixtures();
      },
    };
  }

  function createProps(scene) {
    const pos = HUB_POSITIONS;
    const login = createLoginTerminal(scene, pos.pc.c, pos.pc.r);
    const archive = createArchive(scene, pos.archive.c, pos.archive.r);
    const server = createServerRack(scene, pos.server.c, pos.server.r);
    const props = [login, archive, server];
    const lightPoints = props.map((p) => p.light);

    return {
      props,
      lightPoints,
      login,
      archive,
      server,
      update(time) {
        props.forEach((p) => p.update(time));
      },
      pulseAll() {
        props.forEach((p) => p.pulse());
      },
    };
  }

  function triggerChimeraEnvironment(scene, lighting, props) {
    if (!scene || !scene.cameras || !scene.cameras.main) return;
    document.body.classList.add('chimera-speaking');
    scene.time.delayedCall(900, () => document.body.classList.remove('chimera-speaking'));

    if (typeof AudioFX !== 'undefined' && AudioFX.error) AudioFX.error();
    if (typeof AudioFX !== 'undefined' && AudioFX.triggerStaticBurst) AudioFX.triggerStaticBurst();
    scene.cameras.main.flash(60, 80, 0, 40);
    scene.cameras.main.shake(120, 0.003);

    if (lighting) lighting.chimeraPulse();
    if (props) props.pulseAll();

    // Red scanline burst
    const scan = scene.add.rectangle(
      scene.game.config.width / 2,
      scene.game.config.height / 2,
      scene.game.config.width,
      4,
      0xff0033,
      0.35,
    ).setDepth(55).setScrollFactor(0);
    scene.tweens.add({
      targets: scan,
      y: { from: 0, to: scene.game.config.height },
      alpha: { from: 0.5, to: 0 },
      duration: 280,
      onComplete: () => scan.destroy(),
    });
  }

  window.FacilityAtmosphere = {
    CH1,
    HUB_POSITIONS,
    WALLS,
    isWallTile,
    resolveWallCollision,
    clampToCorridor,
    buildMap,
    createProps,
    createBlastDoor,
    createKeycardProp,
    createLighting,
    triggerChimeraEnvironment,
    tilePx,
  };
})();
