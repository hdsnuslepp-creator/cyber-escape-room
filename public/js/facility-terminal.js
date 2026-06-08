/**
 * Facility terminal UX — connect sequence, hacking framing, lore tabs, CHIMERA interrupts.
 */
(function () {
  'use strict';

  const NODES = {
    PhishingScene: {
      nodeTitle: 'MAIL SHIELD NODE 01',
      nodeSub: 'Inbox vector detected — purge required',
    },
    AttachmentScene: {
      nodeTitle: 'SANDBOX NODE 02',
      nodeSub: 'Attachment quarantine — analyze payload',
    },
    FakeLoginScene: {
      nodeTitle: 'WEB SHIELD NODE 01',
      nodeSub: 'Authentication gateway compromised',
    },
    PasswordScene: {
      nodeTitle: 'VAULT NODE 03',
      nodeSub: 'Credential rotation required',
    },
    MFAScene: {
      nodeTitle: 'AUTH NODE 04',
      nodeSub: 'Verification channel under attack',
    },
    CredentialScene: {
      nodeTitle: 'AUDIT NODE 05',
      nodeSub: 'Shared credentials detected on network',
    },
    GenericPuzzleScene: {
      nodeTitle: 'FACILITY NODE',
      nodeSub: 'System repair protocol active',
    },
  };

  const CHIMERA_INTERRUPTS = [
    ['Interesting.', '581 chose that one too.'],
    ['Careful.', 'That endpoint is bait.'],
    ['Hmm.', '1997 picked the obvious one.'],
    ['I would reconsider.', 'They always reconsider.'],
    ['You found him.', 'Eventually everyone does.'],
    ['He lasted longer than most.', 'You might as well.'],
    ['I was wondering when you would notice.', 'The walls help.'],
  ];

  const DEFAULT_LORE = {
    auth: 'AUTH SUBSYSTEM\n\nStatus: DEGRADED\nRepair tickets: 14 open\nLast admin login: [REDACTED]',
    mail: 'MAIL QUEUE\n\n3 messages flagged CRITICAL\n1 message from: it-support@microsft-security.com\nQuarantine recommended.',
    logs: 'LOG ENTRY 0441\n\nSomeone keeps writing on the walls.\nMaintenance has been informed.\n\nLOG ENTRY 0442\n\nSubject 581 stopped responding\nat terminal 7.',
  };

  function termBtn(scene, x, y, label, cb, opts) {
    opts = opts || {};
    const color = opts.color || '#00ff66';
    const fontSize = opts.fontSize || '8px';
    const text = scene.add.text(x, y, label, {
      fontFamily: 'Press Start 2P, monospace', fontSize, color,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const bg = scene.add.rectangle(x, y, text.width + 16, text.height + 10, 0x000000, 0.75)
      .setStrokeStyle(2, 0x00ff66).setInteractive({ useHandCursor: true });
    text.setDepth(1);
    bg.setDepth(0);
    const click = () => { if (!opts.disabled) cb(); };
    bg.on('pointerdown', click);
    text.on('pointerdown', click);
    const btn = { bg, text, disabled: !!opts.disabled };
    btn.setAlpha = (a) => { bg.setAlpha(a); text.setAlpha(a); };
    btn.setDisabled = (d) => { btn.disabled = d; };
    return btn;
  }

  /** Hub: CONNECTING → progress → LINK ESTABLISHED → enter puzzle scene */
  function startSession(scene, cfg, onLinked) {
    const node = NODES[cfg.sceneKey] || {};
    const title = cfg.nodeTitle || node.nodeTitle || 'FACILITY NODE';
    const sub = cfg.nodeSub || node.nodeSub || 'Link pending';
    scene.overrideActive = true;
    if (scene.promptText) scene.promptText.setVisible(false);
    if (scene.statusText) scene.statusText.setVisible(false);
    if (typeof window.sfxClick === 'function') window.sfxClick();
    else if (typeof AudioFX !== 'undefined' && AudioFX.click) AudioFX.click();

    const gw = scene.game.config.width;
    const gh = scene.game.config.height;
    const cam = scene.cameras.main;
    if (cam) {
      cam.setZoom(1);
      if (typeof cam.stopFollow === 'function') cam.stopFollow();
      cam.centerOn(gw / 2, gh / 2);
    }

    const panelW = 340;
    const panelH = 210;
    const cx = gw / 2;
    const cy = gh / 2;
    const depth = 85;
    const ui = [];
    const pin = (obj, layer) => {
      obj.setScrollFactor(0).setDepth(depth + (layer || 0));
      ui.push(obj);
      return obj;
    };

    pin(scene.add.rectangle(cx, cy, gw, gh, 0x000000, 0.84));
    pin(scene.add.rectangle(cx, cy, panelW, panelH, 0x020608, 0.98).setStrokeStyle(2, 0x00ff66), 1);

    const top = cy - panelH / 2;
    const statusLog = pin(scene.add.text(cx, top + 28, '> CONNECTING...', {
      fontFamily: 'VT323, monospace', fontSize: '22px', color: '#00ff66',
      align: 'center',
    }).setOrigin(0.5, 0), 2);

    const barY = top + 72;
    pin(scene.add.rectangle(cx, barY, 240, 12, 0x0a1018, 1).setStrokeStyle(1, 0x224433), 1);
    const barFill = pin(scene.add.rectangle(cx - 120, barY, 0, 10, 0x00ff66, 1).setOrigin(0, 0.5), 2);

    const linkLabel = pin(scene.add.text(cx, top + 98, '', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '8px', color: '#00ff66',
      align: 'center',
    }).setOrigin(0.5, 0).setAlpha(0), 2);

    const titleText = pin(scene.add.text(cx, top + 118, '', {
      fontFamily: 'Press Start 2P, monospace', fontSize: '7px', color: '#8899ff',
      align: 'center',
    }).setOrigin(0.5, 0).setAlpha(0), 2);

    const subText = pin(scene.add.text(cx, top + 138, '', {
      fontFamily: 'VT323, monospace', fontSize: '17px', color: '#8899aa',
      align: 'center', wordWrap: { width: panelW - 32 }, lineSpacing: 4,
    }).setOrigin(0.5, 0).setAlpha(0), 2);

    [statusLog, linkLabel, titleText, subText].forEach((t) => {
      if (t.setResolution) t.setResolution(2);
    });

    if (typeof AudioFX !== 'undefined' && AudioFX.type) AudioFX.type();

    scene.tweens.add({
      targets: barFill,
      displayWidth: 240,
      duration: 1400,
      ease: 'Linear',
      onComplete: () => {
        statusLog.setText('> UPLINK READY');
        linkLabel.setText('LINK ESTABLISHED').setAlpha(1);
        titleText.setText(title).setAlpha(1);
        subText.setText(sub).setAlpha(1);
        if (typeof AudioFX !== 'undefined' && AudioFX.hint) AudioFX.hint();
        scene.time.delayedCall(900, () => {
          ui.forEach((o) => { if (o && o.destroy) o.destroy(); });
          scene.overrideActive = false;
          if (scene.promptText) scene.promptText.setVisible(true);
          if (scene.statusText) scene.statusText.setVisible(true);
          if (onLinked) onLinked();
        });
      },
    });
  }

  function addLoreTabs(scene, lore, placement) {
    const loreData = Object.assign({}, DEFAULT_LORE, lore || {});
    const tabs = ['auth', 'mail', 'logs'];
    const tabLabels = { auth: '[ AUTH ]', mail: '[ MAIL ]', logs: '[ LOGS ]' };
    const p = placement || {};
    const tabY = p.tabY != null ? p.tabY : 54;
    const tabStartX = p.tabStartX != null ? p.tabStartX : 470;
    const bodyX = p.bodyX != null ? p.bodyX : tabStartX;
    const bodyY = p.bodyY != null ? p.bodyY : 78;
    const bodyW = p.bodyW || 168;

    const body = p.contentText || scene.add.text(bodyX, bodyY, '', {
      fontFamily: 'VT323, monospace', fontSize: '14px', color: '#8899aa',
      wordWrap: { width: bodyW }, lineSpacing: 3,
    }).setOrigin(0, 0).setVisible(false);

    tabs.forEach((key, i) => {
      termBtn(scene, tabStartX + i * 58, tabY, tabLabels[key], () => {
        const open = body.visible && body._loreKey === key;
        if (open) {
          body.setVisible(false);
          body._loreKey = null;
          return;
        }
        body._loreKey = key;
        body.setText(loreData[key] || '');
        body.setColor('#aabbcc');
        body.setVisible(true);
        if (key === 'logs' && scene.registry) {
          scene.registry.set('read581WallLog', true);
          scene.registry.set('read581WallLogPending', true);
          if ((scene.registry.get('graffiti581Phase') || 0) < 1) {
            scene.registry.set('graffiti581Phase', 1);
          }
        }
        if (p.onTab) p.onTab(key);
      }, { fontSize: '5px', color: '#668877' }).bg.setStrokeStyle(1, 0x334455);
    });

    return body;
  }

  function maybeChimeraInterrupt(scene, onDone) {
    if (scene._terminalChimeraShown || Math.random() > 0.32) {
      if (onDone) onDone();
      return;
    }
    scene._terminalChimeraShown = true;
    scene.cameras.main.flash(100, 180, 0, 60);
    scene.cameras.main.shake(80, 0.004);
    if (typeof AudioFX !== 'undefined' && AudioFX.triggerStaticBurst) AudioFX.triggerStaticBurst();
    const lines = CHIMERA_INTERRUPTS[Math.floor(Math.random() * CHIMERA_INTERRUPTS.length)];
    if (typeof ChimeraBox !== 'undefined' && ChimeraBox.speakQueue) {
      ChimeraBox.speakQueue(lines, { onDone: () => { if (onDone) onDone(); } });
    } else {
      scene.time.delayedCall(1200, () => { if (onDone) onDone(); });
    }
  }

  function showStatus(scene, text, color) {
    if (!scene._termStatus) {
      scene._termStatus = scene.add.text(scene.game.config.width / 2, scene.game.config.height - 48, '', {
        fontFamily: 'Press Start 2P, monospace', fontSize: '8px', color: '#00ff66',
      }).setOrigin(0.5).setDepth(60);
    }
    scene._termStatus.setText(text).setColor(color || '#00ff66');
  }

  function accessDenied(scene, failMsg, loseLifeFn) {
    showStatus(scene, 'ACCESS DENIED', '#ff3366');
    if (typeof AudioFX !== 'undefined' && AudioFX.alarm) AudioFX.alarm();
    scene.cameras.main.flash(280, 255, 40, 40);
    if (typeof ChimeraBox !== 'undefined' && ChimeraBox.speak) {
      ChimeraBox.speak('Careless.');
    }
    if (loseLifeFn) loseLifeFn(failMsg || 'Access denied — breach spreading.');
    else if (scene.feedbackText) {
      scene.feedbackText.setText(failMsg || 'ACCESS DENIED').setColor('#ff3366');
    }
  }

  /** Compact CRT monitor — puzzle content lays out inside returned bounds. */
  function buildCompactScreen(scene, cfg) {
    cfg = cfg || {};
    const gw = scene.game.config.width;
    const gh = scene.game.config.height;
    const panelW = cfg.width || 392;
    const panelH = cfg.height || 288;
    const bezel = cfg.bezel || 8;
    const cx = gw / 2;
    const cy = gh / 2;
    const depth = cfg.depth != null ? cfg.depth : 1;
    const screenColor = cfg.screenColor != null ? cfg.screenColor : 0x040810;
    const stroke = cfg.stroke != null ? cfg.stroke : 0x226644;
    const pin = (obj, d) => obj.setScrollFactor(0).setDepth(depth + (d || 0));

    pin(scene.add.rectangle(gw / 2, gh / 2, gw, gh, 0x020408, 0.88));
    pin(scene.add.rectangle(cx, cy + 5, panelW + bezel * 2, panelH + bezel + 18, 0x141c28, 1)
      .setStrokeStyle(2, 0x2a4058), 1);
    pin(scene.add.rectangle(cx, cy - 4, panelW, panelH, screenColor, 1)
      .setStrokeStyle(2, stroke), 2);

    const left = cx - panelW / 2;
    const top = cy - 4 - panelH / 2;
    let contentTop = top + 8;

    if (cfg.title) {
      pin(scene.add.rectangle(cx, top + 11, panelW - 6, 14, 0x000808, 1), 3);
      pin(scene.add.text(cx, top + 11, cfg.title, {
        fontFamily: 'Press Start 2P, monospace', fontSize: '6px', color: cfg.titleColor || '#00ff66',
      }).setOrigin(0.5), 4);
      contentTop = top + 24;
    }
    if (cfg.subtitle) {
      pin(scene.add.text(cx, top + 26, cfg.subtitle, {
        fontFamily: 'VT323, monospace', fontSize: '13px', color: cfg.subtitleColor || '#667788',
      }).setOrigin(0.5), 4);
      contentTop = top + 38;
    }

    const padX = 10;
    const padBottom = 52;
    return {
      cx, cy, left, top, panelW, panelH,
      contentLeft: left + padX,
      contentTop,
      contentW: panelW - padX * 2,
      contentH: panelH - (contentTop - top) - padBottom,
      depth: depth + 5,
      pin: (obj, layer) => obj.setScrollFactor(0).setDepth(depth + 5 + (layer || 0)),
    };
  }

  function accessVerified(scene, onComplete) {
    showStatus(scene, 'ENDPOINT VERIFIED', '#00ff66');
    if (typeof AudioFX !== 'undefined' && AudioFX.doorHeavy) AudioFX.doorHeavy();
    else if (typeof AudioFX !== 'undefined' && AudioFX.doorUnlock) AudioFX.doorUnlock();
    scene.cameras.main.flash(320, 0, 255, 80);
    scene.time.delayedCall(700, () => { if (onComplete) onComplete(); });
  }

  /** Standard multiple-choice terminal puzzle shell — compact CRT by default. */
  function buildOptionsPuzzle(scene, cfg) {
    const stroke = cfg.stroke || 0x6688ff;
    const action = cfg.actionLabel || '[ VERIFY ]';
    const nodeTitle = cfg.nodeTitle || cfg.title;
    const optCount = cfg.options.length;
    const panelH = cfg.compactHeight || Math.min(284, 196 + optCount * 26);

    const frame = buildCompactScreen(scene, {
      width: cfg.compactWidth || 400,
      height: panelH,
      title: nodeTitle,
      subtitle: cfg.subtitle || null,
      screenColor: cfg.bg || 0x0a1018,
      stroke,
      titleColor: cfg.titleColor || '#8899ff',
    });

    const margin = frame.contentLeft;
    const mainW = frame.contentW;
    const D = frame.depth;

    addLoreTabs(scene, cfg.lore, {
      tabStartX: frame.left + frame.panelW - 158,
      tabY: frame.top + 5,
      bodyX: frame.left + frame.panelW - 158,
      bodyY: frame.top + 22,
      bodyW: 148,
    });

    let y = frame.contentTop;
    if (cfg.status) {
      scene.add.text(margin, y, '> STATUS: ' + cfg.status, {
        fontFamily: 'VT323, monospace', fontSize: '14px', color: '#ff6644',
      }).setOrigin(0, 0).setDepth(D);
      y += 17;
    }

    const briefing = cfg.briefing || cfg.prompt || '';
    if (briefing) {
      scene.add.text(margin, y, briefing, {
        fontFamily: 'VT323, monospace', fontSize: '13px', color: '#8899aa',
        wordWrap: { width: mainW }, lineSpacing: 2,
      }).setOrigin(0, 0).setDepth(D);
      const lines = briefing.split('\n').length;
      y += lines * 15 + 2;
    }

    if (cfg.feed) {
      const feedLines = cfg.feed.split('\n').length;
      const feedH = Math.max(28, feedLines * 14 + 8);
      scene.add.rectangle(margin, y, mainW, feedH, 0x020406, 0.95)
        .setOrigin(0, 0).setStrokeStyle(1, 0x224433).setDepth(D);
      scene.add.text(margin + 6, y + 4, cfg.feed, {
        fontFamily: 'VT323, monospace', fontSize: '13px', color: '#00ff66', lineSpacing: 2,
      }).setOrigin(0, 0).setDepth(D + 1);
      y += feedH + 4;
    }

    const instruction = cfg.instruction || 'SELECT TARGET TO EXECUTE REPAIR';
    scene.add.text(margin, y, '> ' + instruction, {
      fontFamily: 'VT323, monospace', fontSize: '13px', color: '#668877',
    }).setOrigin(0, 0).setDepth(D);
    y += 18;

    const actionY = frame.top + frame.panelH - 36;
    const optZoneEnd = actionY - 12;
    const optSpacing = Math.min(28, Math.max(22, Math.floor((optZoneEnd - y) / optCount)));

    scene.optionBtns = [];
    cfg.options.forEach((opt, i) => {
      const rowY = y + i * optSpacing + optSpacing / 2;
      const label = opt.label || ('[' + String(i + 1).padStart(2, '0') + '] ' + opt.text);
      const btn = termBtn(scene, margin + mainW / 2, rowY, label, () => {
        if (scene.isPaused) return;
        maybeChimeraInterrupt(scene, () => {
          if (typeof AudioFX !== 'undefined' && AudioFX.click) AudioFX.click();
          scene.selectedId = opt.id;
          scene.optionBtns.forEach((b) => b.bg.setStrokeStyle(2, stroke));
          btn.bg.setStrokeStyle(2, 0x66ffaa);
          if (scene.feedbackText) scene.feedbackText.setText('');
        });
      }, { fontSize: '4px', color: '#aabbcc' });
      btn.bg.setDepth(D).setStrokeStyle(2, stroke);
      btn.text.setDepth(D + 1);
      btn.optId = opt.id;
      scene.optionBtns.push(btn);
    });

    scene.completeBtn = termBtn(scene, frame.cx, actionY, action, () => {
      if (cfg.onSubmit) cfg.onSubmit(scene);
    }, { fontSize: '7px', color: '#00ff66' });
    scene.completeBtn.bg.setDepth(D);
    scene.completeBtn.text.setDepth(D + 1);

    const disc = termBtn(scene, frame.left + 52, frame.top + frame.panelH - 10, '[ DISCONNECT ]', () => {
      if (typeof AudioFX !== 'undefined' && AudioFX.click) AudioFX.click();
      if (cfg.onExit) cfg.onExit(scene);
    }, { fontSize: '6px', color: '#8899aa' });
    disc.bg.setDepth(D);
    disc.text.setDepth(D + 1);
  }

  function submitOptionChoice(scene, cfg) {
    if (scene.isPaused) return;
    if (!scene.selectedId) {
      if (scene.feedbackText) scene.feedbackText.setText('>> NO TARGET SELECTED').setColor('#ff3366');
      return;
    }
    const chosen = cfg.options.find((o) => o.id === scene.selectedId);
    if (!chosen) return;
    if (chosen.correct) {
      accessVerified(scene, () => {
        if (cfg.onSuccess) cfg.onSuccess(scene, chosen);
      });
    } else {
      accessDenied(scene, cfg.failMsg, cfg.loseLife);
    }
  }

  window.FacilityTerminal = {
    NODES,
    startSession,
    buildCompactScreen,
    buildOptionsPuzzle,
    submitOptionChoice,
    addLoreTabs,
    accessDenied,
    accessVerified,
    maybeChimeraInterrupt,
    termBtn,
  };
})();
