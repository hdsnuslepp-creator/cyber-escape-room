/**
 * Generic facility sector hub — layout + props for sectors 3–7 and CORE.
 */
(function () {
  'use strict';

  const TILE = 32;

  const LAYOUT = [
    'WWWWWWWWWWWWWWWDDWWW',
    'WAAW........BB.....W',
    'W..................W',
    'W..................W',
    'W.........@........W',
    'WCCW.............KKW',
    'WWWWWWWWWWWWWWWWWWWW',
  ];

  const POSITIONS = {
    roomY: 2,
    roomRows: 7,
    pc: { c: 2, r: 3 },
    archive: { c: 12, r: 3 },
    server: { c: 2, r: 7 },
    door: { c: 16, r: 2 },
    player: { c: 10, r: 6 },
    key: { c: 17, r: 7 },
  };

  function wallsForLayout() {
    const walls = new Set();
    for (let ri = 0; ri < LAYOUT.length; ri++) {
      for (let c = 0; c < LAYOUT[ri].length; c++) {
        if (LAYOUT[ri][c] === 'W') walls.add(`${c},${POSITIONS.roomY + ri}`);
      }
    }
    return walls;
  }

  const WALLS = wallsForLayout();

  function tilePx(c, r) {
    return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
  }

  function palFromSector(sec) {
    const p = sec.palette || {};
    return {
      void: p.void || 0x040608,
      wall: p.wall || 0x101418,
      wallEdge: p.edge || 0x44ff88,
      wallEdgeDim: p.c || 0x223344,
      floor: p.floor || 0x0c1810,
      floorAlt: p.floorAlt || 0x081410,
      a: p.a || 0x448866,
      b: p.b || 0x66aa88,
      c: p.c || 0x336644,
      doorLocked: 0xff3366,
      doorOpen: 0x00ff66,
      doorBoss: 0xffb000,
    };
  }

  function buildMap(scene, sec) {
    const pal = palFromSector(sec);
    const g = scene.add.graphics().setDepth(0);
    const gw = scene.game.config.width;
    const gh = scene.game.config.height;
    g.fillStyle(pal.void, 1);
    g.fillRect(0, 0, gw, gh);

    for (let ri = 0; ri < LAYOUT.length; ri++) {
      for (let c = 0; c < LAYOUT[ri].length; c++) {
        const r = POSITIONS.roomY + ri;
        const x = c * TILE;
        const y = r * TILE;
        const isWall = LAYOUT[ri][c] === 'W';
        if (isWall) {
          g.fillStyle(pal.wall, 1);
          g.fillRect(x, y, TILE, TILE);
        } else {
          g.fillStyle(pal.floor, 1);
          g.fillRect(x, y, TILE, TILE);
        }
      }
    }

    const ry = POSITIONS.roomY;
    if (!sec.horror && typeof FacilityAtmosphere !== 'undefined' && FacilityAtmosphere.addWallGraffiti) {
      const graffiti = sec.graffiti || ['581 WAS HERE'];
      const gr = graffiti[0];
      if (gr) {
        FacilityAtmosphere.addWallGraffiti(scene, gr, {
          col: 19, row: ry + 3, face: 'west', fontSize: '10px', color: '#445566', alpha: 0.5,
        });
      }
    }

    if (sec.isCore) {
      scene.add.text(gw / 2, (ry + 1) * TILE, 'PROJECT CHIMERA', {
        fontFamily: 'Press Start 2P, monospace', fontSize: '6px', color: '#ff2288',
      }).setOrigin(0.5).setDepth(1).setAlpha(0.45);
    }

    const fixtures = [
      { x: 5 * TILE, y: (ry + 1) * TILE + 4, w: 28, h: 6 },
      { x: 10 * TILE, y: (ry + 1) * TILE + 4, w: 28, h: 6 },
      { x: 15 * TILE, y: (ry + 1) * TILE + 4, w: 28, h: 6 },
    ];
    scene._lightFixtures = fixtures;
    return g;
  }

  function createTerminal(scene, c, r, label, color, style) {
    const x = c * TILE - 8;
    const y = r * TILE - 14;
    const root = scene.add.container(x, y).setDepth(2);
    const g = scene.add.graphics();
    const screen = scene.add.graphics();
    g.fillStyle(0x101018, 1);
    g.fillRect(0, 8, 54, 50);
    g.lineStyle(2, color, 0.65);
    g.strokeRect(0, 8, 54, 50);
    screen.fillStyle(color, 0.2);
    screen.fillRect(6, 14, 42, 24);
    if (style === 'rack') {
      for (let i = 0; i < 3; i++) {
        g.fillStyle(0x080810, 1);
        g.fillRect(6, 16 + i * 10, 42, 8);
        g.lineStyle(1, color, 0.35);
        g.strokeRect(6, 16 + i * 10, 42, 8);
      }
    } else if (style === 'cabinet') {
      g.fillRect(8, 14, 18, 36);
      g.fillRect(28, 12, 18, 38);
    } else {
      g.fillRect(10, 48, 34, 8);
      for (let i = 0; i < 4; i++) screen.fillRect(10, 18 + i * 5, 24 + i * 2, 2);
    }
    root.add([g, screen]);
    scene.add.text(x + 27, y + 62, label, {
      fontFamily: 'VT323, monospace', fontSize: '11px', color: '#aabbcc',
    }).setOrigin(0.5).setDepth(2);
    return {
      root,
      light: { ...tilePx(c, r), radius: 52, color },
      update(time) {
        if (time % 200 < 20) screen.setAlpha(0.7 + Math.random() * 0.3);
        else screen.setAlpha(1);
      },
      pulse() {
        scene.tweens.add({ targets: screen, alpha: 0.2, duration: 50, yoyo: true, repeat: 3 });
      },
    };
  }

  function createProps(scene, sec) {
    const terms = sec.terminals || { pc: 'TERM-A', archive: 'TERM-B', server: 'TERM-C' };
    const pal = palFromSector(sec);
    const pc = createTerminal(scene, POSITIONS.pc.c, POSITIONS.pc.r, terms.pc, pal.a, 'crt');
    const archive = createTerminal(scene, POSITIONS.archive.c, POSITIONS.archive.r, terms.archive, pal.b, 'cabinet');
    const server = createTerminal(scene, POSITIONS.server.c, POSITIONS.server.r, terms.server, pal.c, 'rack');
    const props = [pc, archive, server];
    return {
      props,
      lightPoints: props.map((p) => p.light),
      update(time) { props.forEach((p) => p.update(time)); },
      pulseAll() { props.forEach((p) => p.pulse()); },
    };
  }

  function hubPos() {
    return {
      pc: POSITIONS.pc,
      archive: POSITIONS.archive,
      server: POSITIONS.server,
      door: POSITIONS.door,
      player: POSITIONS.player,
      key: POSITIONS.key,
      roomY: POSITIONS.roomY,
      roomRows: POSITIONS.roomRows,
    };
  }

  function isWallTile(c, r) {
    return WALLS.has(`${c},${r}`);
  }

  function resolveWallCollision(sprite, prevX, prevY) {
    const pts = [[sprite.x, sprite.y], [sprite.x - 8, sprite.y], [sprite.x + 8, sprite.y], [sprite.x, sprite.y - 10], [sprite.x, sprite.y + 10]];
    for (const [px, py] of pts) {
      const c = Math.floor(px / TILE);
      const r = Math.floor(py / TILE);
      if (isWallTile(c, r)) { sprite.x = prevX; sprite.y = prevY; return; }
    }
  }

  function clampToCorridor(sprite) {
    const half = 12;
    sprite.x = Phaser.Math.Clamp(sprite.x, TILE + half, (LAYOUT[0].length - 1) * TILE - half);
    sprite.y = Phaser.Math.Clamp(sprite.y, (POSITIONS.roomY + 1) * TILE + half, (POSITIONS.roomY + POSITIONS.roomRows - 1) * TILE - half);
  }

  const GAME_W = 20 * TILE;

  window.FacilitySectorGeneric = {
    POSITIONS,
    hubPos,
    buildMap,
    createProps,
    isWallTile,
    resolveWallCollision,
    clampToCorridor,
    tilePx,
  };
})();
