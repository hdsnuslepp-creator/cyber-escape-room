/**
 * Sector 2 — The Breach (blue / purple). Layout + props for the credential wing.
 */
(function () {
  'use strict';

  const TILE = 32;

  const CH2 = {
    void: 0x04060c,
    wall: 0x0c1020,
    wallEdge: 0x6688ff,
    wallEdgeDim: 0x223366,
    floor: 0x101828,
    floorAlt: 0x0c1420,
    password: 0x4466cc,
    mfa: 0x8844cc,
    credential: 0x5533aa,
    doorLocked: 0xff4466,
    doorOpen: 0x66aaff,
    doorBoss: 0xff8800,
    accent: 0x6688ff,
  };

  const S2_LAYOUT = [
    'WWWWWWWWWWWWWWWDDWWW',
    'WPPW........MM.....W',
    'W..................W',
    'W..................W',
    'W.........@........W',
    'WCCW.............KKW',
    'WWWWWWWWWWWWWWWWWWWW',
  ];

  const S2_POSITIONS = {
    roomY: 2,
    roomRows: 7,
    password: { c: 2, r: 3 },
    mfa: { c: 12, r: 3 },
    credential: { c: 2, r: 7 },
    door: { c: 16, r: 2 },
    player: { c: 10, r: 6 },
    key: { c: 17, r: 7 },
    relay: { c: 6, r: 4 },
  };

  const S2_WALLS = (() => {
    const walls = new Set();
    for (let ri = 0; ri < S2_LAYOUT.length; ri++) {
      for (let c = 0; c < S2_LAYOUT[ri].length; c++) {
        if (S2_LAYOUT[ri][c] === 'W') walls.add(`${c},${S2_POSITIONS.roomY + ri}`);
      }
    }
    return walls;
  })();

  function tilePx(c, r) {
    return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
  }

  function buildMap(scene) {
    const g = scene.add.graphics().setDepth(0);
    const pal = CH2;
    const gw = scene.game.config.width;
    const gh = scene.game.config.height;
    g.fillStyle(pal.void, 1);
    g.fillRect(0, 0, gw, gh);

    for (let ri = 0; ri < S2_LAYOUT.length; ri++) {
      for (let c = 0; c < S2_LAYOUT[ri].length; c++) {
        const r = S2_POSITIONS.roomY + ri;
        const x = c * TILE;
        const y = r * TILE;
        const isWall = S2_LAYOUT[ri][c] === 'W';
        if (isWall) {
          g.fillStyle(pal.wall, 1);
          g.fillRect(x, y, TILE, TILE);
        } else {
          g.fillStyle(pal.floor, 1);
          g.fillRect(x, y, TILE, TILE);
        }
      }
    }

    const ry = S2_POSITIONS.roomY;
    if (typeof FacilityAtmosphere !== 'undefined' && FacilityAtmosphere.addWallGraffiti) {
      FacilityAtmosphere.addWallGraffiti(scene, '581 TRIED TO WARN YOU', {
        col: 19, row: ry + 3, face: 'west', fontSize: '9px', color: '#554466', alpha: 0.48,
      });
    }

    scene._lightFixtures = [
      { x: 5 * TILE, y: (ry + 1) * TILE + 4, w: 28, h: 6 },
      { x: 10 * TILE, y: (ry + 1) * TILE + 4, w: 28, h: 6 },
      { x: 15 * TILE, y: (ry + 1) * TILE + 4, w: 28, h: 6 },
    ];

    return g;
  }

  function createPasswordVault(scene, c, r) {
    const x = c * TILE - 6;
    const y = r * TILE - 12;
    const root = scene.add.container(x, y).setDepth(2);
    const g = scene.add.graphics();
    g.fillStyle(0x101830, 1);
    g.fillRect(0, 10, 58, 48);
    g.lineStyle(2, CH2.password, 0.7);
    g.strokeRect(0, 10, 58, 48);
    g.fillStyle(CH2.password, 0.35);
    g.fillRect(6, 18, 46, 28);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x080c18, 1);
      g.fillRect(10, 22 + i * 6, 38, 3);
    }
    g.fillStyle(CH2.password, 0.8);
    g.fillRect(20, 50, 18, 6);
    root.add(g);
    scene.add.text(x + 29, y + 62, 'PASSWORD', {
      fontFamily: 'VT323, monospace', fontSize: '11px', color: '#6688dd',
    }).setOrigin(0.5).setDepth(2);
    return { root, light: { ...tilePx(c, r), radius: 52, color: CH2.password } };
  }

  function createMfaKiosk(scene, c, r) {
    const x = c * TILE - 10;
    const y = r * TILE - 14;
    const root = scene.add.container(x, y).setDepth(2);
    const g = scene.add.graphics();
    g.fillStyle(0x180c24, 1);
    g.fillRect(0, 0, 48, 56);
    g.lineStyle(2, CH2.mfa, 0.65);
    g.strokeRect(0, 0, 48, 56);
    g.fillStyle(CH2.mfa, 0.25);
    g.fillRect(6, 8, 36, 22);
    g.fillStyle(0x220033, 1);
    g.fillRect(10, 36, 28, 14);
    root.add(g);
    const leds = scene.add.graphics();
    root.add(leds);
    scene.add.text(x + 24, y + 62, 'MFA', {
      fontFamily: 'VT323, monospace', fontSize: '11px', color: '#aa66dd',
    }).setOrigin(0.5).setDepth(2);
    return {
      root,
      light: { ...tilePx(c, r), radius: 48, color: CH2.mfa },
      update(time) {
        leds.clear();
        const on = Math.floor(time / 400) % 2 === 0;
        leds.fillStyle(on ? 0x00ff88 : 0x330022, on ? 0.9 : 0.4);
        leds.fillRect(14, 40, 6, 6);
        leds.fillRect(28, 40, 6, 6);
      },
    };
  }

  function createCredentialScanner(scene, c, r) {
    const x = c * TILE - 8;
    const y = r * TILE - 16;
    const root = scene.add.container(x, y).setDepth(2);
    const g = scene.add.graphics();
    g.fillStyle(0x120820, 1);
    g.fillRect(0, 0, 54, 60);
    g.lineStyle(2, CH2.credential, 0.6);
    g.strokeRect(0, 0, 54, 60);
    for (let i = 0; i < 3; i++) {
      g.fillStyle(0x0a0614, 1);
      g.fillRect(6, 8 + i * 14, 42, 10);
      g.lineStyle(1, CH2.credential, 0.35);
      g.strokeRect(6, 8 + i * 14, 42, 10);
    }
    root.add(g);
    scene.add.text(x + 27, y + 66, 'AUDIT', {
      fontFamily: 'VT323, monospace', fontSize: '11px', color: '#8866cc',
    }).setOrigin(0.5).setDepth(2);
    return { root, light: { ...tilePx(c, r), radius: 50, color: CH2.credential } };
  }

  function createRelayTerminal(scene, c, r) {
    const x = c * TILE - 4;
    const y = r * TILE - 8;
    const g = scene.add.graphics().setDepth(1);
    g.fillStyle(0x1a1028, 1);
    g.fillRect(x, y, 36, 28);
    g.lineStyle(1, CH2.mfa, 0.4);
    g.strokeRect(x, y, 36, 28);
    g.fillStyle(CH2.mfa, 0.2);
    g.fillRect(x + 4, y + 4, 28, 16);
    scene.add.text(x + 18, y + 32, 'RELAY', {
      fontFamily: 'VT323, monospace', fontSize: '9px', color: '#665588',
    }).setOrigin(0.5).setDepth(1);
  }

  function createProps(scene) {
    const p = S2_POSITIONS;
    const password = createPasswordVault(scene, p.password.c, p.password.r);
    const mfa = createMfaKiosk(scene, p.mfa.c, p.mfa.r);
    const credential = createCredentialScanner(scene, p.credential.c, p.credential.r);
    createRelayTerminal(scene, p.relay.c, p.relay.r);
    const props = [password, mfa, credential];
    return {
      props,
      lightPoints: props.map((x) => x.light),
      update(time) { props.forEach((pr) => { if (pr.update) pr.update(time); }); },
      pulseAll() { props.forEach((pr) => { if (pr.root) scene.tweens.add({ targets: pr.root, alpha: 0.4, duration: 50, yoyo: true, repeat: 3 }); }); },
    };
  }

  function isWallTile(c, r) {
    return S2_WALLS.has(`${c},${r}`);
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
    sprite.x = Phaser.Math.Clamp(sprite.x, TILE + half, (S2_LAYOUT[0].length - 1) * TILE - half);
    sprite.y = Phaser.Math.Clamp(sprite.y, (S2_POSITIONS.roomY + 1) * TILE + half, (S2_POSITIONS.roomY + S2_POSITIONS.roomRows - 1) * TILE - half);
  }

  window.FacilitySector2 = {
    CH2,
    S2_POSITIONS,
    tilePx,
    buildMap,
    createProps,
    isWallTile,
    resolveWallCollision,
    clampToCorridor,
  };
})();
