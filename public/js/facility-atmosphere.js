/**
 * Facility atmosphere — Sector 1 room composition, zone lighting, wall structure.
 */
(function () {
  'use strict';

  const TILE = 32;

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
    note: 0xffdd88,
  };

  // Sector 1 — connected rooms: A spawn → B login → C archive → D blast door
  const ROOM_OFFSET_C = 5;
  const CORRIDOR_C = 4;
  const HUB_LAYOUT = [
    'WWWWWWWWWW',
    'W..AAAA..W',
    'W..AAAA..W',
    'W...A....W',
    'WLLLA....W',
    'WLLLA....W',
    'W...A....W',
    'W.AAAA...W',
    'W.AAAA...W',
    'W..DDDD..W',
    'WWWWWWWWWW',
  ];

  const HUB_POSITIONS = {
    roomY: 1,
    roomRows: 11,
    pc: { c: 2, r: 5 },
    archive: { c: 3, r: 9 },
    door: { c: 3, r: 10 },
    player: { c: 3, r: 3 },
    server: { c: 3, r: 9 },
    key: { c: 3, r: 10 },
  };

  function mapC(c) { return c + ROOM_OFFSET_C; }

  function floorZone(c, r) {
    if (r >= 2 && r <= 3 && c >= 2 && c <= 5) return 'spawn';
    if (r >= 4 && r <= 5 && c >= 1 && c <= 3) return 'blue';
    if (r >= 8 && r <= 9 && c >= 2 && c <= 5) return 'purple';
    if (r === 10 && c >= 2 && c <= 5) return 'red';
    return null;
  }

  function zoneFloorColor(base, zone) {
    if (zone === 'spawn') return 0x0c141c;
    if (zone === 'blue') return 0x0a1828;
    if (zone === 'purple') return 0x120a1c;
    if (zone === 'red') return 0x180810;
    return base;
  }

  function tilePx(c, r) {
    return { x: mapC(c) * TILE + TILE / 2, y: r * TILE + TILE / 2 };
  }

  function parseLayout() {
    const walls = new Set();
    for (let ri = 0; ri < HUB_LAYOUT.length; ri++) {
      const row = HUB_LAYOUT[ri];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === 'W') walls.add(`${mapC(c)},${HUB_POSITIONS.roomY + ri}`);
      }
    }
    return walls;
  }

  const WALLS = parseLayout();

  const GRAFFITI_WALLS = {
    door: { text: 'HE IS LISTENING', col: 2, rowOff: 9, face: 'south', color: '#994466', fontSize: '10px' },
  };

  function wallGraffitiAnchor(col, row, face) {
    const x0 = col * TILE;
    const y0 = row * TILE;
    switch (face) {
      case 'north':
        return { x: x0 + TILE / 2, y: y0 + 5, angle: 0, ox: 0.5, oy: 0 };
      case 'east':
        return { x: x0 + TILE - 6, y: y0 + TILE / 2, angle: -90, ox: 0.5, oy: 0.5 };
      case 'west':
        return { x: x0 + 6, y: y0 + TILE / 2, angle: 90, ox: 0.5, oy: 0.5 };
      case 'south':
      default:
        return { x: x0 + TILE / 2, y: y0 + TILE - 4, angle: 0, ox: 0.5, oy: 1 };
    }
  }

  function addWallGraffiti(scene, text, opts) {
    opts = opts || {};
    const anchor = wallGraffitiAnchor(opts.col, opts.row, opts.face || 'south');
    const smudge = scene.add.graphics().setDepth(1);
    const smLen = Math.min(TILE - 2, Math.max(28, text.length * 5.5));
    smudge.fillStyle(0x141c28, 0.25);
    if (anchor.angle === 0) {
      smudge.fillRect(anchor.x - smLen / 2, anchor.y - 11, smLen, 11);
    } else {
      smudge.fillRect(anchor.x - 5, anchor.y - smLen / 2, 10, smLen);
    }
    const label = scene.add.text(anchor.x, anchor.y, text, {
      fontFamily: 'VT323, monospace',
      fontSize: opts.fontSize || '11px',
      color: opts.color || '#556677',
    }).setOrigin(anchor.ox, anchor.oy).setAngle(anchor.angle).setDepth(1).setAlpha(opts.alpha != null ? opts.alpha : 0.85);
    label._wallX = anchor.x;
    label._wallY = anchor.y;
    label._smudge = smudge;
    return label;
  }

  function isWallTile(c, r) {
    return WALLS.has(`${c},${r}`);
  }

  function resolveWallCollision(sprite, prevX, prevY) {
    const pts = [
      [sprite.x, sprite.y],
      [sprite.x - 10, sprite.y],
      [sprite.x + 10, sprite.y],
      [sprite.x, sprite.y - 12],
      [sprite.x, sprite.y + 12],
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

  function clampToCorridor(sprite) {
    const half = 14;
    const minX = mapC(0) * TILE + TILE + half;
    const maxX = mapC(HUB_LAYOUT[0].length - 1) * TILE - TILE - half;
    const minY = (HUB_POSITIONS.roomY + 1) * TILE + half;
    const maxY = (HUB_POSITIONS.roomY + HUB_LAYOUT.length - 1) * TILE - TILE - half;
    sprite.x = Phaser.Math.Clamp(sprite.x, minX, maxX);
    sprite.y = Phaser.Math.Clamp(sprite.y, minY, maxY);
  }

  /** Bare wall trim — no scattered dressing. */
  function drawWallStructure(g) {
    const ry = HUB_POSITIONS.roomY;
    const roomTop = ry * TILE;
    const roomBot = (ry + HUB_LAYOUT.length - 1) * TILE;
    const roomLeft = mapC(0) * TILE;
    const roomRight = mapC(HUB_LAYOUT[0].length - 1) * TILE;

    g.fillStyle(0x060a10, 0.85);
    g.fillRect(roomLeft, roomTop + TILE, 4, roomBot - roomTop - TILE * 2);
    g.fillRect(roomRight - 4, roomTop + TILE, 4, roomBot - roomTop - TILE * 2);
  }

  /** Single coffee cup — spawn room only. */
  function addFloorCoffeeCup(scene) {
    const px = tilePx(2, HUB_POSITIONS.player.r);
    const g = scene.add.graphics().setDepth(1);
    g.fillStyle(0x5a4030, 0.9);
    g.fillCircle(px.x, px.y + 3, 5);
    g.fillStyle(0x887766, 0.75);
    g.fillCircle(px.x - 1, px.y + 1, 3);
  }

  function buildMap(scene) {
    const g = scene.add.graphics().setDepth(0);
    const pal = CH1;
    const gw = scene.game.config.width;
    const gh = scene.game.config.height;

    g.fillStyle(pal.void, 1);
    g.fillRect(0, 0, gw, gh);

    for (let ri = 0; ri < HUB_LAYOUT.length; ri++) {
      const row = HUB_LAYOUT[ri];
      for (let c = 0; c < row.length; c++) {
        const r = HUB_POSITIONS.roomY + ri;
        const x = mapC(c) * TILE;
        const y = r * TILE;
        const isWall = row[c] === 'W';

        if (isWall) {
          g.fillStyle(pal.wall, 1);
          g.fillRect(x, y, TILE, TILE);
          g.fillStyle(0x141c24, 0.35);
          g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        } else {
          const zone = floorZone(c, r);
          g.fillStyle(zone ? zoneFloorColor(pal.floor, zone) : pal.floor, 1);
          g.fillRect(x, y, TILE, TILE);
        }
      }
    }

    drawWallStructure(g);

    g.lineStyle(1, pal.wallEdge, 0.12);
    const ry0 = HUB_POSITIONS.roomY * TILE;
    const rh = HUB_LAYOUT.length * TILE;
    const rw = HUB_LAYOUT[0].length * TILE;
    g.strokeRect(mapC(0) * TILE + 2, ry0 + TILE + 2, rw - TILE * 2 - 4, rh - TILE * 2 - 4);

    addEnvironmentalDetails(scene);
    return g;
  }

  function addDeliberateGraffiti(scene) {
    const ry = HUB_POSITIONS.roomY;
    const door = addWallGraffiti(scene, GRAFFITI_WALLS.door.text, {
      col: mapC(GRAFFITI_WALLS.door.col),
      row: ry + GRAFFITI_WALLS.door.rowOff,
      face: GRAFFITI_WALLS.door.face,
      fontSize: GRAFFITI_WALLS.door.fontSize,
      color: GRAFFITI_WALLS.door.color,
      alpha: 0.04,
    });
    return { door };
  }

  function updateDeliberateGraffiti(labels, registry, time, player) {
    if (!labels || !labels.door) return;
    const inboxDone = !!registry.get('inboxComplete');
    const d = player
      ? Phaser.Math.Distance.Between(player.x, player.y, labels.door._wallX, labels.door._wallY)
      : 999;
    labels.door.setText('HE IS LISTENING');
    labels.door.setColor(inboxDone ? '#994466' : '#775566');
    labels.door.setAlpha(0.05 + Phaser.Math.Clamp(1 - d / 95, 0, 1) * 0.55);
  }

  function addEnvironmentalDetails(scene) {
    scene._hubGraffiti = addDeliberateGraffiti(scene);
    addFloorCoffeeCup(scene);
    addHubSpiderWebs(scene);
  }

  /** Small paper sticky — local coords on a parent container (CRT bezel / desk). */
  function addStickyNote(parent, localX, localY, lines, opts) {
    opts = opts || {};
    const scene = parent.scene;
    const lineH = opts.lineH || 7;
    const padY = opts.padY || 2;
    const padX = opts.padX || 3;
    const fontSize = opts.fontSize || '7px';
    const maxLen = Math.max(...lines.map((l) => l.length), 1);
    const w = opts.w || Math.max(18, maxLen * 4 + padX * 2);
    const h = opts.h || padY * 2 + lines.length * lineH;
    const angle = opts.angle || 0;
    const paper = opts.paper != null ? opts.paper : 0xfff0c8;
    const ink = opts.ink || '#1a1008';

    const note = scene.add.container(localX, localY).setAngle(angle);
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.22);
    bg.fillRect(-w / 2 + 1, -h / 2 + 1, w, h);
    bg.fillStyle(paper, 1);
    bg.fillRect(-w / 2, -h / 2, w, h);
    bg.lineStyle(1, 0xc4a870, 0.65);
    bg.strokeRect(-w / 2, -h / 2, w, h);
    if (opts.highlight) {
      bg.lineStyle(1, 0xffeeaa, 0.45);
      bg.strokeRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
    }
    bg.fillStyle(0xffffff, 0.14);
    bg.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, 2);
    if (opts.tape) {
      bg.fillStyle(0xd8d0c0, 0.85);
      bg.fillRect(-5, -h / 2 - 2, 10, 3);
    }
    if (opts.deskShadow) {
      bg.fillStyle(0x000000, 0.28);
      bg.fillRect(-w / 2 + 1, h / 2 - 1, w - 1, 2);
    }

    const labels = lines.map((line, i) => scene.add.text(0, -h / 2 + padY + i * lineH, line, {
      fontFamily: 'VT323, monospace',
      fontSize,
      color: ink,
      align: 'center',
      resolution: 1,
      stroke: opts.highlight ? '#000000' : undefined,
      strokeThickness: opts.highlight ? 1 : 0,
    }).setOrigin(0.5, 0));

    note.add([bg, ...labels]);
    note.setDepth(opts.depth != null ? opts.depth : 4);
    note.setAlpha(opts.alpha != null ? opts.alpha : 1);
    parent.add(note);
    return note;
  }

  /** Corner spider web — muted grey strands, no gore. */
  function createSpiderWeb(scene, x, y, opts) {
    opts = opts || {};
    const size = opts.size || 26;
    const alpha = opts.alpha != null ? opts.alpha : 0.38;
    const corner = opts.corner || 'tl';
    let ax = 1;
    let ay = 1;
    if (corner === 'tr') ax = -1;
    if (corner === 'bl') ay = -1;
    if (corner === 'br') { ax = -1; ay = -1; }

    const g = scene.add.graphics();
    const strand = 0xb8c4d0;
    g.lineStyle(1, strand, alpha);
    const spokes = 6;
    for (let i = 0; i < spokes; i++) {
      const t = i / (spokes - 1);
      const ex = ax * size * (0.25 + t * 0.75);
      const ey = ay * size * (0.25 + (1 - t) * 0.75);
      g.lineBetween(0, 0, ex, ey);
    }
    for (let ring = 1; ring <= 4; ring++) {
      const rt = ring / 4;
      g.beginPath();
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ex = ax * size * rt * (0.35 + t * 0.65);
        const ey = ay * size * rt * (0.35 + (1 - t) * 0.65);
        if (i === 0) g.moveTo(ex * 0.2, ey * 0.2);
        else g.lineTo(ex, ey);
      }
      g.strokePath();
    }
    if (opts.spider) {
      const sx = ax * size * 0.42;
      const sy = ay * size * 0.42;
      g.fillStyle(0x1a1a1a, Math.min(1, alpha + 0.25));
      g.fillCircle(sx, sy, 1.6);
      g.lineStyle(1, 0x1a1a1a, alpha + 0.15);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        g.lineBetween(sx, sy, sx + Math.cos(a) * 3.5, sy + Math.sin(a) * 3.5);
      }
    }

    const root = scene.add.container(x, y).setDepth(opts.depth != null ? opts.depth : 1);
    root.add(g);
    return root;
  }

  function addHubSpiderWebs(scene) {
    const ry = HUB_POSITIONS.roomY;
    const spots = [
      { x: mapC(6) * TILE + 4, y: ry * TILE + 6, corner: 'tl', size: 28, alpha: 0.42 },
      { x: mapC(2) * TILE + TILE - 4, y: (ry + 4) * TILE + 6, corner: 'tr', size: 24, alpha: 0.36 },
      { x: mapC(6) * TILE + 4, y: (ry + 9) * TILE + TILE - 6, corner: 'bl', size: 26, alpha: 0.38 },
      { x: mapC(3) * TILE + TILE / 2, y: (ry + 10) * TILE + 4, corner: 'tl', size: 32, alpha: 0.44, spider: true },
      { x: mapC(1) * TILE + TILE - 4, y: (ry + 6) * TILE + TILE - 5, corner: 'br', size: 22, alpha: 0.3 },
      { x: mapC(5) * TILE + TILE - 3, y: (ry + 2) * TILE + 5, corner: 'tr', size: 20, alpha: 0.34 },
    ];
    scene._hubWebs = spots.map((s) => createSpiderWeb(scene, s.x, s.y, s));
    return scene._hubWebs;
  }

  /** Login terminal — Room B, compact CRT desk. */
  function createLoginTerminal(scene, c, r) {
    const center = tilePx(c, r);
    const wx = center.x - 30;
    const wy = center.y - 32;
    const root = scene.add.container(wx, wy).setDepth(2);
    const body = scene.add.graphics();
    const screen = scene.add.graphics();
    const scan = scene.add.graphics();

    function drawBody() {
      body.clear();
      body.fillStyle(0x121820, 1);
      body.fillRect(0, 32, 68, 10);
      body.lineStyle(1, 0x2a3544, 0.65);
      body.strokeRect(0, 32, 68, 10);
      body.fillStyle(0x1a2230, 1);
      body.fillRect(6, 4, 44, 30);
      body.fillStyle(0x2a3344, 1);
      body.fillRect(9, 8, 38, 22);
      body.lineStyle(2, CH1.login, 0.75);
      body.strokeRect(6, 4, 44, 30);
      body.fillStyle(0x111820, 1);
      body.fillRect(24, 32, 10, 4);
      body.fillStyle(0x2a2830, 1);
      body.fillRect(26, 44, 16, 10);
      body.fillStyle(0x3a3440, 1);
      body.fillRect(28, 38, 12, 8);
    }

    function drawScreen() {
      screen.clear();
      if (screenOn < 0.08) return;
      const flick = 0.82 + Math.sin(flickerT / 140) * 0.1;
      screen.fillStyle(CH1.login, (0.1 + screenOn * 0.18) * flick);
      screen.fillRect(13, 14, 38, 20);
      screen.fillStyle(CH1.loginGlow, (0.22 + screenOn * 0.42) * flick);
      screen.fillRect(15, 16, 34, 16);
      screen.fillStyle(0x001122, 0.75);
      for (let i = 0; i < 3; i++) screen.fillRect(17, 18 + i * 4, 14 + i * 3, 2);
    }

    let nearActive = false;
    let frozen = false;
    let screenOn = 0.35;
    let scanY = 0;
    let flickerT = 0;
    let nextFlicker = 0;

    drawBody();

    // Sticky notes — bright paper, readable at 2× explore camera
    const sticky581 = addStickyNote(root, 49, 7, ['581'], {
      w: 14, h: 11, fontSize: '7px', lineH: 7, padY: 2, angle: -10, tape: true,
      paper: 0xfff4c0, ink: '#1a0a00', depth: 5, highlight: true,
    });
    const stickyWarn = addStickyNote(root, 6, 40, ["DON'T", 'ANSWER IT'], {
      w: 22, h: 15, fontSize: '6px', lineH: 6, padY: 2, angle: -4, deskShadow: true,
      paper: 0xffeed8, ink: '#aa1122', depth: 5, highlight: true,
    }).setVisible(false);
    const pcWeb = createSpiderWeb(scene, 7, 5, { corner: 'tl', size: 13, alpha: 0.48, depth: 4 });

    drawScreen();
    root.add([body, screen, scan]);
    root.add(pcWeb);
    root.bringToTop(sticky581);
    root.bringToTop(stickyWarn);

    return {
      root, screen, sticky581, stickyWarn,
      update(time) {
        if (frozen) return;
        flickerT = time;
        if (time > nextFlicker) {
          nextFlicker = time + 800 + Math.random() * 2200;
          if (Math.random() < 0.35) {
            screen.setAlpha(0.15);
            scene.time.delayedCall(40 + Math.random() * 60, () => screen.setAlpha(1));
          }
        }
        if (nearActive) screenOn = Math.min(1, screenOn + 0.08);
        else screenOn = Math.max(0.22, screenOn - 0.015);
        drawScreen();
        if (screenOn > 0.1) {
          scanY = (scanY + 0.55) % 16;
          scan.clear();
          scan.fillStyle(0x44ccff, nearActive ? 0.18 : 0.07);
          scan.fillRect(15, 16 + scanY, 34, 1);
        } else scan.clear();
      },
      setNearActive(on) { nearActive = !!on; },
      setFrozen(on) { frozen = !!on; if (frozen) scan.clear(); },
      setScreenOff() { screenOn = 0; nearActive = false; scan.clear(); },
      revealStickyWarning() {
        stickyWarn.setVisible(true);
        scene.tweens.add({ targets: stickyWarn, alpha: { from: 0, to: 1 }, duration: 600 });
      },
      pulse() {
        scene.tweens.add({ targets: screen, alpha: 0.2, duration: 60, yoyo: true, repeat: 3 });
      },
    };
  }

  /** Records cabinet — Room C, west alcove. */
  function createArchive(scene, c, r) {
    const center = tilePx(c, r);
    const wx = center.x - 18;
    const wy = center.y - 26;
    const root = scene.add.container(wx, wy).setDepth(2);
    const g = scene.add.graphics();

    g.fillStyle(0x1a1820, 1);
    g.fillRect(0, 8, 34, 44);
    g.lineStyle(1, 0x3a3544, 0.7);
    g.strokeRect(0, 8, 34, 44);
    g.fillStyle(0xccc5aa, 0.85);
    g.fillRect(4, 0, 26, 10);
    g.fillStyle(0xddd8c8, 0.7);
    g.fillRect(6, -2, 10, 8);
    const folderColors = [0xd4a855, 0x88aa66, 0x6688aa];
    folderColors.forEach((col, i) => {
      g.fillStyle(col, 0.9);
      g.fillRect(5 + i * 9, 12, 7, 14);
      g.fillStyle(0x000000, 0.15);
      g.fillRect(5 + i * 9, 12, 7, 2);
    });
    g.fillStyle(0x0e1018, 1);
    g.fillRect(2, 38, 30, 8);
    g.fillStyle(0x161820, 1);
    g.fillRect(2, 42, 30, 10);
    g.lineStyle(1, CH1.archive, 0.5);
    g.strokeRect(2, 42, 30, 10);
    g.fillStyle(0xccc5aa, 0.6);
    g.fillRect(6, 44, 8, 5);

    root.add(g);

    let nearActive = false;

    return {
      root, gfx: g,
      update() {
        root.setAlpha(nearActive ? 1 : 0.92);
      },
      setNearActive(on) { nearActive = !!on; },
      pulse() {
        scene.tweens.add({ targets: g, alpha: 0.35, duration: 50, yoyo: true, repeat: 4 });
      },
    };
  }

  /** Server corner — SW alcove: rack, power box, loose cables. */
  function createServerRack(scene, c, r) {
    const wx = mapC(0) * TILE + 6;
    const wy = r * TILE - 50;
    const root = scene.add.container(wx, wy).setDepth(2);
    const g = scene.add.graphics();
    const leds = scene.add.graphics();
    const cables = scene.add.graphics();

    g.fillStyle(0x120a20, 1);
    g.fillRect(0, 4, 46, 48);
    g.lineStyle(2, CH1.server, 0.6);
    g.strokeRect(0, 4, 46, 48);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x0a0614, 1);
      g.fillRect(4, 10 + i * 10, 38, 8);
    }
    g.fillStyle(0x181410, 1);
    g.fillRect(48, 14, 20, 36);
    g.lineStyle(2, 0xffaa44, 0.4);
    g.strokeRect(48, 14, 20, 36);
    g.fillStyle(0xff6600, 0.75);
    g.fillRect(54, 18, 8, 4);

    cables.lineStyle(2, 0x222830, 0.9);
    cables.lineBetween(8, 50, 8, 58);
    cables.lineBetween(8, 58, 72, 58);
    cables.lineBetween(72, 58, 72, 52);
    cables.lineStyle(1, 0x6644aa, 0.45);
    cables.lineBetween(10, 56, 70, 56);
    cables.lineBetween(24, 58, 22, 62);
    cables.lineBetween(48, 58, 50, 63);

    root.add([g, leds, cables]);

    const ledStates = [1, 0, 1, 1, 0, 1, 0, 0];
    let ledsFrozen = false;
    let freezeUntil = 0;
    let humPulse = 0;

    return {
      root, leds,
      update(time) {
        humPulse = 0.5 + Math.sin(time / 380) * 0.5;
        if (ledsFrozen && time < freezeUntil) {
          leds.clear();
          return;
        }
        ledsFrozen = false;
        leds.clear();
        const blink = Math.floor(time / 280) % 2;
        for (let i = 0; i < 8; i++) {
          const on = (ledStates[i] + blink) % 2 === 0;
          leds.fillStyle(on ? 0xaa66ff : 0x220033, on ? 0.85 + humPulse * 0.1 : 0.3);
          leds.fillRect(8 + (i % 4) * 9, 16 + Math.floor(i / 4) * 18, 3, 3);
        }
      },
      freezeLeds(ms) {
        ledsFrozen = true;
        freezeUntil = scene.time.now + (ms || 900);
      },
      pulse() {
        scene.tweens.add({ targets: leds, alpha: 0.2, duration: 40, yoyo: true, repeat: 5 });
      },
    };
  }

  /** Blast door — east wall variant (Sectors 2+). */
  function createBlastDoorEast(scene, doorPos, opts) {
    opts = opts || {};
    const pal = opts.palette || CH1;
    const gfx = scene.add.graphics().setDepth(3);
    const beacon = scene.add.graphics().setDepth(5);
    const panelGfx = scene.add.graphics().setDepth(4);
    const doorLabel = scene.add.text(0, 0, 'LOCKED', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '11px', color: '#ff2244', align: 'center',
    }).setOrigin(0.5).setDepth(6);
    const banner = scene.add.text(doorPos.x, doorPos.y - 20, 'LOCKED', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '8px', color: '#ff3366', align: 'center',
    }).setOrigin(0.5).setDepth(6).setAlpha(0.85);

    const ry = HUB_POSITIONS.roomY;
    const eastWallX = mapC(HUB_LAYOUT[0].length - 1) * TILE;
    const topY = (ry + 1) * TILE;
    const botY = (ry + HUB_LAYOUT.length - 2) * TILE + TILE;
    const doorH = botY - topY - 8;
    const doorW = TILE * 2.45;
    const doorX = eastWallX - doorW + 4;
    const doorY = topY + 4;
    const labelX = doorX + doorW / 2;
    const labelY = doorY + doorH / 2;
    const lockdownBanner = scene.add.text(labelX, doorY - 22, '\u26A0 LOCKDOWN \u26A0', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '6px', color: '#ff3344', align: 'center',
    }).setOrigin(0.5).setDepth(6).setAlpha(0.9);

    let warningFlash = 0;
    let locked = true;
    let beaconEnabled = true;

    function drawSecurityPanel(time) {
      panelGfx.clear();
      const px = doorX - 34;
      const py = doorY + doorH * 0.38;
      panelGfx.fillStyle(0x0a1018, 1);
      panelGfx.fillRect(px, py, 26, 34);
      panelGfx.lineStyle(2, 0xff4455, 0.65);
      panelGfx.strokeRect(px, py, 26, 34);
      const keyBlink = Math.sin((time || 0) / 160) > 0.2;
      panelGfx.fillStyle(keyBlink ? 0xff2233 : 0x441122, keyBlink ? 0.85 : 0.35);
      panelGfx.fillRect(px + 5, py + 5, 16, 3);
      panelGfx.fillStyle(0x223344, 0.9);
      panelGfx.fillRect(px + 4, py + 12, 18, 14);
      for (let i = 0; i < 3; i++) {
        const on = keyBlink && i === Math.floor((time || 0) / 320) % 3;
        panelGfx.fillStyle(on ? 0xff3344 : 0x334455, on ? 0.95 : 0.5);
        panelGfx.fillCircle(px + 7 + i * 6, py + 30, 2);
      }
    }

    return {
      gfx, banner, beacon, panelGfx, lockdownBanner, doorLight: null,
      setBeaconEnabled(on) { beaconEnabled = !!on; },
      update(time) {
        drawSecurityPanel(time);
        beacon.clear();
        if (!beaconEnabled || (!locked && warningFlash <= time)) return;
        const flash = warningFlash > time && Math.sin(time / 40) > 0;
        const pulse = 0.5 + Math.sin(time / 320) * 0.35;
        const a = flash ? 0.85 : 0.35 + pulse * 0.25;
        beacon.fillStyle(0xff2233, a);
        beacon.fillCircle(labelX, doorY + 10, 3);
      },
      flashWarning(ms) { warningFlash = scene.time.now + (ms || 1200); },
      draw(state) {
        const { open, inboxDone, allMissionsDone, hasKey, pulsing } = state;
        gfx.clear();
        const isBoss = allMissionsDone && !state.bossDone;
        const panelsOpen = pulsing ? !!open : (isBoss && !!hasKey);
        locked = !panelsOpen && !isBoss;
        const col = isBoss ? pal.doorBoss : (panelsOpen ? pal.doorOpen : pal.doorLocked);
        gfx.fillStyle(0x030508, 1);
        gfx.fillRect(eastWallX - 5, topY, 6, botY - topY);
        gfx.fillStyle(0x040608, 1);
        gfx.fillRect(doorX - 10, doorY - 8, doorW + 14, doorH + 16);
        const gap = panelsOpen ? Math.min(22, doorW * 0.18) : 0;
        const halfW = doorW / 2 - gap / 2;
        gfx.fillStyle(col, panelsOpen ? 0.22 : 0.62);
        gfx.fillRect(doorX, doorY, halfW, doorH);
        gfx.fillRect(doorX + doorW / 2 + gap / 2, doorY, halfW, doorH);
        doorLabel.setPosition(labelX, labelY).setFontSize('7px').setLineSpacing(4);
        doorLabel.setText(panelsOpen ? 'OPEN' : 'SEALED').setColor(panelsOpen ? '#00ff66' : '#ff2244');
        lockdownBanner.setPosition(labelX, doorY - 22);
        banner.setPosition(labelX, doorY - 14);
      },
      pulseGrant() {
        this.flashWarning(800);
        scene.tweens.add({ targets: banner, alpha: { from: 1, to: 0.3 }, duration: 100, yoyo: true, repeat: 6 });
      },
    };
  }

  /** Blast door — north wall variant (Sectors 2+ corridor layout). */
  function createBlastDoorNorth(scene, doorPos, opts) {
    opts = opts || {};
    const pal = opts.palette || CH1;
    const doorCell = opts.doorCell || { c: 0, r: 0 };
    const gfx = scene.add.graphics().setDepth(3);
    const beacon = scene.add.graphics().setDepth(5);
    const panelGfx = scene.add.graphics().setDepth(4);
    const doorLabel = scene.add.text(0, 0, 'LOCKED', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '11px', color: '#ff2244', align: 'center',
    }).setOrigin(0.5).setDepth(6);
    const northRowY = doorCell.r * TILE;
    const doorW = TILE * 2.6;
    const doorH = TILE * 1.65;
    const doorX = doorPos.x - doorW / 2;
    const doorY = northRowY + 4;
    const labelX = doorPos.x;
    const labelY = doorY + doorH / 2;
    const banner = scene.add.text(labelX, doorY - 14, 'LOCKED', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '8px', color: '#ff3366', align: 'center',
    }).setOrigin(0.5).setDepth(6).setAlpha(0.85);
    const lockdownBanner = scene.add.text(labelX, doorY - 12, '\u26A0 LOCKDOWN \u26A0', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '6px', color: '#ff3344', align: 'center',
    }).setOrigin(0.5).setDepth(6).setAlpha(0.9);

    let warningFlash = 0;
    let locked = true;
    let beaconEnabled = true;

    function drawSecurityPanel(time) {
      panelGfx.clear();
      const px = doorX + doorW + 8;
      const py = doorY + doorH * 0.25;
      panelGfx.fillStyle(0x0a1018, 1);
      panelGfx.fillRect(px, py, 24, 32);
      panelGfx.lineStyle(2, 0xff4455, 0.65);
      panelGfx.strokeRect(px, py, 24, 32);
      const keyBlink = Math.sin((time || 0) / 160) > 0.2;
      panelGfx.fillStyle(keyBlink ? 0xff2233 : 0x441122, keyBlink ? 0.85 : 0.35);
      panelGfx.fillRect(px + 4, py + 4, 16, 3);
      panelGfx.fillStyle(0x223344, 0.9);
      panelGfx.fillRect(px + 3, py + 11, 18, 13);
      for (let i = 0; i < 3; i++) {
        const on = keyBlink && i === Math.floor((time || 0) / 320) % 3;
        panelGfx.fillStyle(on ? 0xff3344 : 0x334455, on ? 0.95 : 0.5);
        panelGfx.fillCircle(px + 6 + i * 6, py + 28, 2);
      }
    }

    return {
      gfx, banner, beacon, panelGfx, lockdownBanner, doorLight: null,
      setBeaconEnabled(on) { beaconEnabled = !!on; },
      update(time) {
        drawSecurityPanel(time);
        beacon.clear();
        if (!beaconEnabled) return;
        if (!locked && warningFlash <= time) return;
        const flash = warningFlash > time && Math.sin(time / 40) > 0;
        const pulse = 0.5 + Math.sin(time / 320) * 0.35;
        const a = flash ? 0.85 : 0.35 + pulse * 0.25;
        beacon.fillStyle(0xff2233, a);
        beacon.fillCircle(labelX, doorY + doorH - 8, 3);
      },
      flashWarning(ms) { warningFlash = scene.time.now + (ms || 1200); },
      draw(state) {
        const { open, inboxDone, allMissionsDone, hasKey, pulsing } = state;
        gfx.clear();
        const isBoss = allMissionsDone && !state.bossDone;
        const panelsOpen = pulsing ? !!open : (isBoss && !!hasKey);
        locked = !panelsOpen && !isBoss;
        const col = isBoss ? pal.doorBoss : (panelsOpen ? pal.doorOpen : pal.doorLocked);

        gfx.fillStyle(0x030508, 1);
        gfx.fillRect(doorX - 8, northRowY - 2, doorW + 16, 6);
        gfx.fillStyle(0x040608, 1);
        gfx.fillRect(doorX - 8, doorY - 4, doorW + 16, doorH + 10);
        gfx.lineStyle(3, 0x1a2430, 0.9);
        gfx.strokeRect(doorX - 8, doorY - 4, doorW + 16, doorH + 10);

        const gap = panelsOpen ? Math.min(18, doorW * 0.14) : 0;
        const halfW = doorW / 2 - gap / 2;
        gfx.fillStyle(col, panelsOpen ? 0.22 : 0.62);
        gfx.fillRect(doorX, doorY, halfW, doorH);
        gfx.fillRect(doorX + doorW / 2 + gap / 2, doorY, halfW, doorH);
        gfx.lineStyle(3, col, 0.95);
        gfx.strokeRect(doorX, doorY, halfW, doorH);
        gfx.strokeRect(doorX + doorW / 2 + gap / 2, doorY, halfW, doorH);

        doorLabel.setPosition(labelX, labelY).setFontSize('7px').setLineSpacing(4);
        if (isBoss && hasKey) doorLabel.setText('BLAST\nDOOR\nBREACH').setColor('#ffb000');
        else if (panelsOpen) doorLabel.setText('BLAST\nDOOR\nOPEN').setColor('#00ff66');
        else if (isBoss) doorLabel.setText('BLAST\nDOOR\nREADY').setColor('#ffb000');
        else doorLabel.setText('BLAST\nDOOR\nSEALED').setColor('#ff2244');

        let txt = 'LOCKED';
        let bCol = '#ff3366';
        if (state.bossDone) { txt = 'CONTAINED'; bCol = '#00ff66'; }
        else if (isBoss && hasKey) { txt = 'FINAL BREACH'; bCol = '#ffb000'; }
        else if (isBoss) { txt = 'DOOR READY'; bCol = '#ffb000'; }
        else if (pulsing && open) { txt = 'ACCESS GRANTED'; bCol = '#00ff66'; }
        lockdownBanner.setPosition(labelX, doorY - 12);
        lockdownBanner.setAlpha(locked || (!panelsOpen && !isBoss) ? 0.85 : 0.35);
        banner.setText(txt).setColor(bCol).setPosition(labelX, doorY - 22);
      },
      pulseGrant() {
        this.flashWarning(800);
        scene.tweens.add({ targets: banner, alpha: { from: 1, to: 0.3 }, duration: 100, yoyo: true, repeat: 6 });
      },
    };
  }

  /** Blast door — recessed into south wall at corridor end. */
  function createBlastDoorSouth(scene, doorPos, opts) {
    opts = opts || {};
    const pal = opts.palette || CH1;
    const gfx = scene.add.graphics().setDepth(3);
    const beacon = scene.add.graphics().setDepth(5);
    const panelGfx = scene.add.graphics().setDepth(4);
    const doorLabel = scene.add.text(0, 0, 'LOCKED', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '11px',
      color: '#ff2244',
      align: 'center',
    }).setOrigin(0.5).setDepth(6);
    const banner = scene.add.text(doorPos.x, doorPos.y - 20, 'LOCKED', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '8px',
      color: '#ff3366',
      align: 'center',
    }).setOrigin(0.5).setDepth(6).setAlpha(0.85);

    const ry = HUB_POSITIONS.roomY;
    const southWallY = (ry + HUB_LAYOUT.length - 1) * TILE;
    const doorW = TILE * 3.2;
    const doorH = TILE * 1.75;
    const doorX = doorPos.x - doorW / 2;
    const doorY = southWallY - doorH - 2;
    const labelX = doorPos.x;
    const labelY = doorY + doorH / 2;

    const lockdownBanner = scene.add.text(labelX, doorY - 12, '\u26A0 LOCKDOWN \u26A0', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '6px',
      color: '#ff3344',
      align: 'center',
    }).setOrigin(0.5).setDepth(6).setAlpha(0.9);

    let warningFlash = 0;
    let locked = true;
    let beaconEnabled = true;

    function drawSecurityPanel(time) {
      panelGfx.clear();
      const px = doorX + doorW + 10;
      const py = doorY + doorH * 0.22;
      panelGfx.fillStyle(0x0a1018, 1);
      panelGfx.fillRect(px, py, 24, 32);
      panelGfx.lineStyle(2, 0xff4455, 0.65);
      panelGfx.strokeRect(px, py, 24, 32);
      const keyBlink = Math.sin((time || 0) / 160) > 0.2;
      panelGfx.fillStyle(keyBlink ? 0xff2233 : 0x441122, keyBlink ? 0.85 : 0.35);
      panelGfx.fillRect(px + 4, py + 4, 16, 3);
      panelGfx.fillStyle(0x223344, 0.9);
      panelGfx.fillRect(px + 3, py + 11, 18, 13);
      for (let i = 0; i < 3; i++) {
        const on = keyBlink && i === Math.floor((time || 0) / 320) % 3;
        panelGfx.fillStyle(on ? 0xff3344 : 0x334455, on ? 0.95 : 0.5);
        panelGfx.fillCircle(px + 6 + i * 6, py + 28, 2);
      }
    }

    return {
      gfx, banner, beacon, panelGfx, lockdownBanner, doorLight: null,
      setBeaconEnabled(on) { beaconEnabled = !!on; },
      update(time) {
        drawSecurityPanel(time);
        beacon.clear();
        if (!beaconEnabled) return;
        if (!locked && warningFlash <= time) return;
        const flash = warningFlash > time && Math.sin(time / 40) > 0;
        const pulse = 0.5 + Math.sin(time / 320) * 0.35;
        const a = flash ? 0.85 : 0.35 + pulse * 0.25;
        const bx = labelX + Math.sin(time / 900) * 2;
        const by = doorY + 6 + Math.cos(time / 700) * 1.5;
        beacon.fillStyle(0xff2233, a * 0.5);
        beacon.fillCircle(bx, by, 3);
        beacon.fillStyle(0xff2233, a);
        beacon.fillCircle(bx, by, 1.5);
      },
      flashWarning(ms) {
        warningFlash = scene.time.now + (ms || 1200);
      },
      draw(state) {
        const { open, inboxDone, allMissionsDone, hasKey, pulsing } = state;
        gfx.clear();

        const isBoss = allMissionsDone && !state.bossDone;
        const panelsOpen = pulsing ? !!open : (isBoss && !!hasKey);
        locked = !panelsOpen && !isBoss;
        const col = isBoss ? pal.doorBoss : (panelsOpen ? pal.doorOpen : pal.doorLocked);

        gfx.fillStyle(0x030508, 1);
        gfx.fillRect(doorX - 8, southWallY - 4, doorW + 16, 6);
        gfx.fillStyle(0x040608, 1);
        gfx.fillRect(doorX - 8, doorY - 6, doorW + 16, doorH + 12);
        gfx.lineStyle(3, 0x1a2430, 0.9);
        gfx.strokeRect(doorX - 8, doorY - 6, doorW + 16, doorH + 12);

        const gap = panelsOpen ? Math.min(18, doorW * 0.14) : 0;
        const halfW = doorW / 2 - gap / 2;
        gfx.fillStyle(col, panelsOpen ? 0.22 : 0.62);
        gfx.fillRect(doorX, doorY, halfW, doorH);
        gfx.fillRect(doorX + doorW / 2 + gap / 2, doorY, halfW, doorH);
        gfx.lineStyle(3, col, 0.95);
        gfx.strokeRect(doorX, doorY, halfW, doorH);
        gfx.strokeRect(doorX + doorW / 2 + gap / 2, doorY, halfW, doorH);
        for (let i = 0; i < 5; i++) {
          gfx.fillStyle(0x334455, 0.85);
          gfx.fillCircle(labelX, doorY + 10 + i * ((doorH - 20) / 4), 2.5);
        }

        if (!panelsOpen && !isBoss) {
          gfx.fillStyle(0xff4400, 0.45);
          for (let i = 0; i < 5; i++) {
            gfx.fillRect(doorX + 8 + i * 14, doorY + 12 + (i % 2) * 10, 10, 5);
          }
        }

        doorLabel.setPosition(labelX, labelY);
        doorLabel.setFontSize('7px');
        doorLabel.setLineSpacing(4);
        if (isBoss && hasKey) doorLabel.setText('BLAST\nDOOR\nBREACH').setColor('#ffb000');
        else if (panelsOpen) doorLabel.setText('BLAST\nDOOR\nOPEN').setColor('#00ff66');
        else if (isBoss) doorLabel.setText('BLAST\nDOOR\nREADY').setColor('#ffb000');
        else if (inboxDone && !allMissionsDone) doorLabel.setText('BLAST\nDOOR\nSEALED').setColor('#8899aa');
        else doorLabel.setText('BLAST\nDOOR\nSEALED').setColor('#ff2244');

        let txt = 'LOCKED';
        let bCol = '#ff3366';
        if (state.bossDone) { txt = 'CONTAINED'; bCol = '#00ff66'; }
        else if (isBoss && hasKey) { txt = 'FINAL BREACH'; bCol = '#ffb000'; }
        else if (isBoss) { txt = 'DOOR READY'; bCol = '#ffb000'; }
        else if (pulsing && open) { txt = 'ACCESS GRANTED'; bCol = '#00ff66'; }
        else if (inboxDone && !allMissionsDone) { txt = 'SEAL ACTIVE'; bCol = '#8899aa'; }
        lockdownBanner.setPosition(labelX, doorY - 12);
        lockdownBanner.setAlpha(locked || (!panelsOpen && !isBoss) ? 0.85 : 0.35);
        banner.setText(txt).setColor(bCol).setPosition(labelX, doorY - 22);
      },
      pulseGrant() {
        this.flashWarning(800);
        scene.tweens.add({ targets: banner, alpha: { from: 1, to: 0.3 }, duration: 100, yoyo: true, repeat: 6 });
      },
    };
  }

  function createBlastDoor(scene, doorPos, opts) {
    opts = opts || {};
    const wall = opts.wall || 'south';
    if (wall === 'east') return createBlastDoorEast(scene, doorPos, opts);
    if (wall === 'north') return createBlastDoorNorth(scene, doorPos, opts);
    return createBlastDoorSouth(scene, doorPos, opts);
  }

  function createKeycardProp(scene, c, r) {
    const x = c * TILE - 8;
    const y = r * TILE - 4;
    const g = scene.add.graphics().setDepth(2);
    g.fillStyle(0xffb000, 1);
    g.fillRect(x, y + 6, 24, 14);
    g.lineStyle(1, 0xffdd88, 0.8);
    g.strokeRect(x, y + 6, 24, 14);
    return { gfx: g, pos: tilePx(c, r) };
  }

  /** Barely-visible emissive points — CRT / server / door / flashlight. */
  function createLighting(scene) {
    const gw = scene.game.config.width;
    const gh = scene.game.config.height;
    const cx = gw / 2;
    const cy = gh / 2;

    const ambient = scene.add.rectangle(cx, cy, gw, gh, 0x020408, 0.58).setDepth(48);
    const glow = scene.add.graphics().setDepth(49).setBlendMode(Phaser.BlendModes.ADD);
    const vignette = scene.add.graphics().setDepth(52);

    let dimLevel = 0.58;
    let chimeraDim = 0;
    let flickerOffset = 0;
    let blackout = false;
    let zoneEnabled = { crt: true, archive: true, door: true };

    const loginPx = tilePx(HUB_POSITIONS.pc.c, HUB_POSITIONS.pc.r);
    const archivePx = tilePx(HUB_POSITIONS.archive.c, HUB_POSITIONS.archive.r);
    const doorPx = tilePx(HUB_POSITIONS.door.c, HUB_POSITIONS.door.r);

    function emitPoint(x, y, color, coreR, haloR, haloA) {
      glow.fillStyle(color, haloA);
      glow.fillCircle(x, y, haloR);
      glow.fillStyle(color, Math.min(1, haloA * 2.8));
      glow.fillCircle(x, y, coreR);
    }

    function drawVignette() {
      vignette.clear();
      const pad = 72;
      vignette.fillStyle(0x000000, 0.42);
      vignette.fillRect(0, 0, gw, pad);
      vignette.fillRect(0, gh - pad, gw, pad);
      vignette.fillRect(0, 0, pad, gh);
      vignette.fillRect(gw - pad, 0, pad, gh);
    }
    drawVignette();

    function drawGlow(player) {
      glow.clear();
      if (blackout) return;
      if (zoneEnabled.crt) {
        emitPoint(loginPx.x, loginPx.y - 14, 0x2288ff, 2, 11, 0.028);
      }
      if (zoneEnabled.archive) {
        emitPoint(archivePx.x, archivePx.y - 10, 0x8866ff, 2, 10, 0.03);
      }
      if (zoneEnabled.door) {
        emitPoint(doorPx.x, doorPx.y + 8, 0xff2233, 2, 11, 0.032);
      }
      if (player) {
        emitPoint(player.x, player.y - 4, 0xddeeff, 2, 10, 0.025);
      }
    }

    return {
      ambient,
      glow,
      vignette,
      setDim(v) { dimLevel = v; if (!blackout) ambient.setAlpha(v); },
      setZoneEnabled(which, on) {
        if (which === 'crt') zoneEnabled.crt = !!on;
        else if (which === 'archive' || which === 'server') zoneEnabled.archive = !!on;
        else if (which === 'door') zoneEnabled.door = !!on;
        else if (which === 'all') {
          zoneEnabled.crt = !!on;
          zoneEnabled.archive = !!on;
          zoneEnabled.door = !!on;
        }
      },
      setBlackout(on) {
        blackout = !!on;
        if (blackout) {
          ambient.setAlpha(0.99);
          glow.clear();
        } else {
          ambient.setAlpha(dimLevel);
        }
      },
      isBlackout() { return blackout; },
      chimeraPulse() {
        chimeraDim = 0.14;
        flickerOffset = 0.1;
        ambient.setAlpha(Math.min(0.72, dimLevel + chimeraDim));
        scene.time.delayedCall(900, () => {
          chimeraDim = 0;
          flickerOffset = 0;
          ambient.setAlpha(dimLevel);
        });
      },
      update(player, _lightPoints, time) {
        if (blackout) {
          ambient.setAlpha(0.99);
          glow.clear();
          return;
        }
        const dim = dimLevel + Math.sin(time / 2800) * 0.01 + flickerOffset + chimeraDim;
        ambient.setAlpha(Phaser.Math.Clamp(dim, 0.48, 0.72));
        drawGlow(player);
      },
    };
  }

  function createProps(scene, opts = {}) {
    const decorate = opts.decorative || {};
    const pos = HUB_POSITIONS;
    const login = createLoginTerminal(scene, pos.pc.c, pos.pc.r);
    const archive = createArchive(scene, pos.archive.c, pos.archive.r);
    const server = opts.skipServer ? null : createServerRack(scene, pos.server.c, pos.server.r);
    const props = server ? [login, archive, server] : [login, archive];
    const graffiti = scene._hubGraffiti || null;
    let roomFrozen = false;

    if (scene.registry && scene.registry.get('inboxComplete') && login.revealStickyWarning) {
      login.revealStickyWarning();
    }

    return {
      props, login, archive, server, graffiti,
      update(time, player, registry) {
        if (!roomFrozen) props.forEach((p) => p.update(time));
        if (graffiti && registry) updateDeliberateGraffiti(graffiti, registry, time, player);
      },
      freezeRoom() {
        roomFrozen = true;
        if (login && login.setFrozen) login.setFrozen(true);
        if (server && server.freezeLeds) server.freezeLeds(999999);
      },
      unfreezeRoom() {
        roomFrozen = false;
        if (login && login.setFrozen) login.setFrozen(false);
      },
      setTerminalNear(terminal, on) {
        if (decorate[terminal]) return;
        const p = { pc: login, archive, server }[terminal];
        if (p && p.setNearActive) p.setNearActive(on);
      },
      chimeraFreeze() {
        if (server && server.freezeLeds) server.freezeLeds(900);
        if (login && login.setScreenOff) login.setScreenOff();
        props.forEach((p) => {
          if (p !== login && p.root) scene.tweens.add({ targets: p.root, alpha: 0.35, duration: 80 });
        });
        scene.time.delayedCall(900, () => {
          props.forEach((p) => { if (p.root) p.root.setAlpha(1); });
        });
      },
      pulseAll() { props.forEach((p) => p.pulse()); },
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
    if (props) {
      if (props.chimeraFreeze) props.chimeraFreeze();
      else props.pulseAll();
    }
    if (scene.blastDoor && scene.blastDoor.flashWarning) scene.blastDoor.flashWarning(1200);
    const scan = scene.add.rectangle(
      scene.game.config.width / 2, scene.game.config.height / 2,
      scene.game.config.width, 4, 0xff0033, 0.35,
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
    addDeliberateGraffiti,
    updateDeliberateGraffiti,
    floorZone,
    triggerChimeraEnvironment,
    addWallGraffiti,
    wallGraffitiAnchor,
    tilePx,
    TILE,
  };
})();
