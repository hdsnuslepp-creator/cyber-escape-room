/**
 * TRAINEE 1998 — psychological horror layer.
 * Environmental storytelling, dead trainees, subtle ambience. No gore.
 */
(function () {
  'use strict';

  const TILE = 32;
  const DISCOVER_RADIUS = 42;
  const INTERACT_RADIUS = 36;

  function tileCenter(col, row) {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
  }

  /** Pixel skeleton — muted bone tones, no blood. */
  function createSkeleton(scene, x, y, opts) {
    opts = opts || {};
    const root = scene.add.container(x, y).setDepth(3);
    const g = scene.add.graphics();
    const bone = 0xb8b0a0;
    const shadow = 0x3a3530;
    const scale = opts.scale || 1;

    g.fillStyle(shadow, 0.35);
    g.fillCircle(2, 6, 7 * scale);
    g.fillStyle(bone, 1);
    g.fillCircle(0, -10 * scale, 5 * scale);
    g.fillRect(-1, -6 * scale, 2, 14 * scale);
    g.fillRect(-8 * scale, -2 * scale, 16 * scale, 2);
    g.fillRect(-9 * scale, 0, 3, 10 * scale);
    g.fillRect(6 * scale, 0, 3, 10 * scale);
    g.fillRect(-4 * scale, 12 * scale, 3, 12 * scale);
    g.fillRect(1 * scale, 12 * scale, 3, 12 * scale);
    g.lineStyle(1, shadow, 0.5);
    g.strokeCircle(0, -10 * scale, 5 * scale);

    root.add(g);
    if (opts.flashlight) {
      const fl = scene.add.graphics();
      fl.fillStyle(0x332211, 1);
      fl.fillRect(7 * scale, 2 * scale, 10 * scale, 4 * scale);
      fl.fillStyle(0x554433, 1);
      fl.fillRect(16 * scale, 2 * scale, 4 * scale, 4 * scale);
      fl.fillStyle(0x222222, 1);
      fl.fillRect(18 * scale, 3 * scale, 2 * scale, 2 * scale);
      root.add(fl);
    }
    if (opts.handOnTerminal) {
      g.fillRect(6 * scale, -4 * scale, 8 * scale, 3);
    }
    return root;
  }

  function createIdBadge(scene, x, y, traineeId) {
    const label = String(traineeId).replace(/^#/, '');
    const root = scene.add.container(x, y).setDepth(4);
    const g = scene.add.graphics();
    g.fillStyle(0x1a2030, 1);
    g.fillRect(-10, -6, 20, 12);
    g.lineStyle(1, 0x668899, 0.8);
    g.strokeRect(-10, -6, 20, 12);
    root.add(g);
    root.add(scene.add.text(0, -1, label, {
      fontFamily: 'Press Start 2P, monospace', fontSize: '4px', color: '#8899aa',
    }).setOrigin(0.5));
    root.add(scene.add.text(0, 4, 'TRAINEE', {
      fontFamily: 'VT323, monospace', fontSize: '8px', color: '#556677',
    }).setOrigin(0.5));
    return root;
  }

  function createAbandonedSuit(scene, x, y, traineeId) {
    const root = scene.add.container(x, y).setDepth(3);
    const g = scene.add.graphics();
    g.fillStyle(0x0a1820, 0.5);
    g.fillCircle(0, 8, 14);
    g.fillStyle(0x228866, 0.85);
    g.fillRect(-12, -4, 24, 18);
    g.fillStyle(0x1a6655, 1);
    g.fillRect(-10, -2, 20, 6);
    g.fillStyle(0xccb088, 1);
    g.fillCircle(0, -8, 5);
    g.fillStyle(0x334455, 1);
    g.fillRect(-8, 14, 16, 4);
    root.add(g);
    const badge = createIdBadge(scene, 14, -6, traineeId);
    root.add(badge);
    return root;
  }

  function createNotebook(scene, x, y, lines) {
    const root = scene.add.container(x, y).setDepth(3);
    const g = scene.add.graphics();
    g.fillStyle(0x2a2018, 0.4);
    g.fillRect(-1, 1, 18, 14);
    g.fillStyle(0xd4c4a8, 1);
    g.fillRect(-8, -6, 16, 12);
    g.lineStyle(1, 0x998877, 0.6);
    g.strokeRect(-8, -6, 16, 12);
    root.add(g);
    const preview = (lines && lines[0]) ? lines[0].slice(0, 12) + '…' : '…';
    root.add(scene.add.text(0, 10, preview, {
      fontFamily: 'VT323, monospace', fontSize: '9px', color: '#776655',
    }).setOrigin(0.5));
    return { root, lines: lines || [] };
  }

  function createEchoTerminal(scene, x, y, message, opts) {
    opts = opts || {};
    const root = scene.add.container(x, y).setDepth(3);
    const g = scene.add.graphics();
    const color = opts.color || 0xaa4488;
    g.fillStyle(0x080810, 1);
    g.fillRect(-20, -16, 40, 32);
    g.lineStyle(1, color, 0.55);
    g.strokeRect(-20, -16, 40, 32);
    g.fillStyle(color, 0.15);
    g.fillRect(-16, -12, 32, 18);
    root.add(g);
    const screen = scene.add.text(0, -4, message, {
      fontFamily: 'VT323, monospace', fontSize: '9px', color: '#cc8899',
      align: 'center', wordWrap: { width: 30 },
    }).setOrigin(0.5);
    root.add(screen);
    let on = true;
    return {
      root,
      pulse(time) {
        if (opts.static) return;
        if (time % 1400 < 30) {
          on = !on;
          screen.setAlpha(on ? 1 : 0.35);
        }
      },
      forceOn() { screen.setAlpha(1); },
    };
  }

  function placeRemain(scene, cfg, sectorId) {
    const pos = tileCenter(cfg.col, cfg.row);
    const key = `horrorDiscovered_${sectorId}_${cfg.traineeId || cfg.type}`;
    const entry = {
      key,
      traineeId: cfg.traineeId,
      type: cfg.type,
      x: pos.x + (cfg.offsetX || 0),
      y: pos.y + (cfg.offsetY || 0),
      discovered: false,
      chimeraLine: cfg.chimeraLine || null,
      inspectTitle: cfg.inspectTitle || null,
      inspectBody: cfg.inspectBody || null,
    };

    switch (cfg.type) {
      case 'skeleton': {
        entry.root = createSkeleton(scene, entry.x, entry.y, {
          scale: cfg.scale || 1,
          flashlight: !!cfg.flashlight,
          handOnTerminal: !!cfg.terminalHand,
        });
        if (cfg.badge !== false && cfg.traineeId) {
          entry.badge = createIdBadge(scene, entry.x + 12, entry.y - 14, cfg.traineeId);
        }
        if (cfg.terminalHand && cfg.terminalMessage) {
          entry.terminal = createEchoTerminal(scene, entry.x + 22, entry.y - 8, cfg.terminalMessage, {
            color: cfg.terminalColor || 0xff2288,
            static: cfg.terminalStatic,
          });
        } else if (cfg.echoTerminal) {
          entry.terminal = createEchoTerminal(scene, entry.x + 18, entry.y - 10, cfg.echoTerminal, {
            color: 0xaa6688,
          });
        }
        break;
      }
      case 'abandoned_suit':
        entry.root = createAbandonedSuit(scene, entry.x, entry.y, cfg.traineeId);
        break;
      case 'notebook':
        entry.notebook = createNotebook(scene, entry.x, entry.y, cfg.lines);
        entry.root = entry.notebook.root;
        entry.inspectBody = (cfg.lines || []).join('\n');
        entry.inspectTitle = cfg.inspectTitle || `NOTEBOOK — TRAINEE ${cfg.traineeId || '???'}`;
        break;
      default:
        return null;
    }

    if (!entry.inspectTitle && cfg.traineeId) {
      entry.inspectTitle = `REMAINS — TRAINEE ${cfg.traineeId}`;
    }
    if (!entry.inspectBody && cfg.type === 'skeleton') {
      entry.inspectBody = cfg.flashlight
        ? 'The flashlight still works.\nBarely.\n\nSomeone sat here a long time.'
        : 'Empty suit. Hollow bones.\nNo struggle. No blood.\n\nJust gone.';
    }
    if (!entry.inspectBody && cfg.type === 'abandoned_suit') {
      entry.inspectBody = cfg.notebook || 'The suit is still warm.\n\nNo. That is not possible.';
    }

    entry.root.setAlpha(0.92);
    return entry;
  }

  function placeWallMessages(scene, messages, registry) {
    const labels = [];
    if (!messages || !messages.length || typeof FacilityAtmosphere === 'undefined') return labels;
    messages.forEach((msg, i) => {
      const spot = {
        col: msg.col,
        row: msg.row,
        face: msg.face || 'west',
        fontSize: msg.fontSize || '9px',
        color: msg.color || '#445566',
        alpha: msg.alpha != null ? msg.alpha : 0.42,
      };
      const label = FacilityAtmosphere.addWallGraffiti(scene, msg.text, spot);
      if (label) {
        label._horrorMsg = msg;
        label._horrorIdx = i;
        if (msg.mutable && msg.altText) {
          label._horrorAlt = msg.altText;
          label._horrorSwapAt = 0;
        }
        if (msg.phaseMin != null) {
          label.setAlpha(0.02);
          label._horrorPhaseMin = msg.phaseMin;
        }
        labels.push(label);
      }
    });
    return labels;
  }

  function installFixtureFlicker(scene) {
    const fixtures = scene._lightFixtures || [];
    if (!fixtures.length) return null;
    const layer = scene.add.graphics().setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    let nextFlicker = 8000 + Math.random() * 12000;
    let flickerUntil = 0;

    return {
      layer,
      forceFlicker() {
        const t = scene.time ? scene.time.now : 0;
        nextFlicker = t;
        flickerUntil = t + 200 + Math.random() * 350;
      },
      update(time) {
        layer.clear();
        fixtures.forEach((f, i) => {
          const flickering = time > flickerUntil - 200 && time < flickerUntil;
          const baseA = flickering ? 0.08 + Math.random() * 0.12 : 0.22;
          layer.fillStyle(0xddeeff, baseA);
          layer.fillRect(f.x, f.y, f.w, f.h);
        });
        if (time > nextFlicker) {
          nextFlicker = time + 14000 + Math.random() * 22000;
          flickerUntil = time + 120 + Math.random() * 280;
          if (scene.facilityLighting && scene.facilityLighting.chimeraPulse) {
            /* brief dim — never explained */
          }
        }
      },
    };
  }

  function installSector(scene, opts) {
    opts = opts || {};
    const sectorId = opts.sector;
    const config = opts.sectorConfig || {};
    const horror = config.horror || {};
    const remains = [];
    const registry = scene.registry;

    (horror.remains || []).forEach((r) => {
      const entry = placeRemain(scene, r, sectorId);
      if (entry) remains.push(entry);
    });

    if (opts.isSector1 && typeof FacilityAtmosphere !== 'undefined') {
      const spawn = FacilityAtmosphere.HUB_POSITIONS;
      if (spawn) {
        const nb = placeRemain(scene, {
          type: 'notebook',
          col: 7,
          row: spawn.roomY + 3,
          traineeId: '???',
          offsetX: 8,
          lines: ['They said I was number 1998.', 'How many came before?', ''],
          inspectTitle: 'DROPPED NOTEBOOK',
          inspectBody: 'They said I was number 1998.\nHow many came before?\n\nThe last line is smeared.',
        }, 's1');
        if (nb) remains.push(nb);
      }
      if (FacilityAtmosphere.addWallGraffiti) {
        const ry = spawn.roomY;
        scene._horrorWallLabels = scene._horrorWallLabels || [];
        scene._horrorWallLabels.push(FacilityAtmosphere.addWallGraffiti(scene, '581 WAS HERE', {
          col: 7, row: ry + 2, face: 'north', fontSize: '8px', color: '#556644', alpha: 0.28,
        }));
      }
    }

    const wallLabels = placeWallMessages(scene, horror.wallMessages, registry);
    const fixtureFlicker = installFixtureFlicker(scene);

    let nextAmbient = 18000 + Math.random() * 25000;
    let driftTarget = null;

    return {
      remains,
      wallLabels,
      fixtureFlicker,
      forceFlicker() { if (fixtureFlicker) fixtureFlicker.forceFlicker(); },
      update(time, player, reg) {
        if (fixtureFlicker) fixtureFlicker.update(time);

        wallLabels.forEach((label) => {
          if (label._horrorPhaseMin != null) {
            const phase = reg ? (reg.get('graffiti581Phase') || 0) : 0;
            if (phase >= label._horrorPhaseMin) {
              label.setAlpha(label._horrorMsg.alpha || 0.4);
            }
          }
          if (label._horrorAlt && time > (label._horrorSwapAt || 0)) {
            const swap = label.text === label._horrorMsg.text;
            label.setText(swap ? label._horrorAlt : label._horrorMsg.text);
            label._horrorSwapAt = time + 45000 + Math.random() * 90000;
          }
        });

        remains.forEach((r) => {
          if (r.terminal && r.terminal.pulse) r.terminal.pulse(time);
        });

        if (player && time > nextAmbient && !scene.overrideActive && !scene.isPaused) {
          nextAmbient = time + 22000 + Math.random() * 35000;
          const roll = Math.random();
          if (roll < 0.25 && scene.facilityProps && scene.facilityProps.pulseAll) {
            scene.facilityProps.pulseAll();
          } else if (roll < 0.45 && driftTarget && driftTarget.root) {
            scene.tweens.add({
              targets: driftTarget.root,
              x: driftTarget.root.x + (Math.random() > 0.5 ? 1 : -1),
              duration: 120,
              yoyo: true,
            });
          } else if (roll < 0.6 && scene.facilityLighting) {
            scene.facilityLighting.chimeraPulse();
          }
          driftTarget = remains.length ? remains[Math.floor(Math.random() * remains.length)] : null;
        }
      },

      getNearRemain(player) {
        if (!player) return null;
        let best = null;
        let bestD = INTERACT_RADIUS;
        remains.forEach((r) => {
          const d = Phaser.Math.Distance.Between(player.x, player.y, r.x, r.y);
          if (d < bestD) { bestD = d; best = r; }
        });
        return best;
      },

      checkProximity(player, reg, onDiscover) {
        if (!player || !onDiscover) return;
        remains.forEach((r) => {
          if (r.discovered) return;
          const d = Phaser.Math.Distance.Between(player.x, player.y, r.x, r.y);
          if (d < DISCOVER_RADIUS) {
            r.discovered = true;
            if (reg) reg.set(r.key, true);
            onDiscover(r);
          }
        });
      },
    };
  }

  const CHIMERA_HORROR_LINES = [
    'Interesting.',
    'You found him.',
    'He lasted longer than most.',
    'I was wondering when you would notice.',
    'They always look at the walls eventually.',
    'Do not be afraid.\nI am not here to hurt you.',
    'Another trainee.\nAnother story.',
    'You are still early.\nThat is good.',
  ];

  window.FacilityHorror = {
    installSector,
    placeRemain,
    placeWallMessages,
    createSkeleton,
    CHIMERA_HORROR_LINES,
  };
})();
