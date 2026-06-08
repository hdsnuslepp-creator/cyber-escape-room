/**
 * CHIMERA dialogue box — DOM overlay with typewriter effect.
 * Sits on top of the Phaser canvas. Click anywhere or press E / Space / Enter
 * to skip the typing, then again to continue (fires the onDone callback).
 *
 * Public API (window.ChimeraBox):
 *   speak(message, { speed, onDone })   — show one line
 *   speakQueue([lines], { speed, onDone }) — show lines back-to-back
 *   advance()                            — skip typing / continue
 *   hide()                               — force-close
 *   isOpen()                             — is the box visible?
 */
(function () {
  'use strict';

  let box = null;
  let textEl = null;
  let hintEl = null;
  let typingTimer = null;
  let full = '';
  let typing = false;
  let onDone = null;

  function ensure() {
    if (!box) box = document.getElementById('chimeraBox');
    if (!textEl) textEl = document.getElementById('chimeraText');
    if (!hintEl) hintEl = document.getElementById('chimeraHint');
    return !!box;
  }

  function clearTyping() {
    if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
  }

  function finishTyping() {
    clearTyping();
    if (textEl) textEl.textContent = full;
    typing = false;
    if (hintEl) hintEl.textContent = '[ E ] to continue';
  }

  function show() {
    if (box) box.classList.remove('hidden');
    document.body.classList.add('chimera-open', 'chimera-speaking');
  }

  function hide() {
    clearTyping();
    typing = false;
    onDone = null;
    if (box) box.classList.add('hidden');
    document.body.classList.remove('chimera-open', 'chimera-speaking');
  }

  function startTyping(message, speed) {
    full = String(message == null ? '' : message);
    typing = true;
    if (textEl) textEl.textContent = '';
    if (hintEl) hintEl.textContent = '[ E ] skip';
    let i = 0;
    typingTimer = setInterval(() => {
      if (!textEl) { clearTyping(); return; }
      textEl.textContent += full.charAt(i);
      i += 1;
      if (typeof AudioFX !== 'undefined' && AudioFX.type && i % 2 === 0) AudioFX.type();
      if (i >= full.length) finishTyping();
    }, speed);
  }

  function speak(message, opts) {
    opts = opts || {};
    if (!ensure()) return;
    clearTyping();
    onDone = typeof opts.onDone === 'function' ? opts.onDone : null;
    show();
    if (typeof AudioFX !== 'undefined' && AudioFX.triggerStaticBurst) {
      AudioFX.triggerStaticBurst();
    }
    try {
      window.dispatchEvent(new CustomEvent('chimera:speak', { detail: { text: String(message) } }));
    } catch (e) { /* noop */ }
    startTyping(message, opts.speed || 38);
  }

  function speakQueue(messages, opts) {
    opts = opts || {};
    const list = (messages || []).slice();
    const step = () => {
      if (!list.length) { if (typeof opts.onDone === 'function') opts.onDone(); return; }
      speak(list.shift(), { speed: opts.speed, onDone: step });
    };
    step();
  }

  function advance() {
    if (!isOpen()) return;
    if (typing) { finishTyping(); return; }
    const cb = onDone;
    onDone = null;
    hide();
    if (cb) cb();
  }

  function isOpen() {
    return ensure() && !box.classList.contains('hidden');
  }

  // Capture-phase listeners so the same click/key doesn't also reach the
  // Phaser canvas (which would move the player or trigger an interaction).
  window.addEventListener('pointerdown', (e) => {
    if (!isOpen()) return;
    e.stopPropagation();
    e.preventDefault();
    advance();
  }, true);

  window.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') {
      e.stopPropagation();
      e.preventDefault();
      advance();
    }
  }, true);

  document.addEventListener('DOMContentLoaded', ensure);

  window.ChimeraBox = { speak, speakQueue, advance, hide, isOpen };
})();
