/* Warmland — keyboard input. */
(function (W) {
  'use strict';

  var held = {};
  var pressed = {};   // edge-triggered: true for exactly one frame
  var anyKeyFlag = false;

  var MAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    KeyZ: 'act', Enter: 'act',
    Space: 'jump',
    ShiftLeft: 'run', ShiftRight: 'run',
    KeyX: 'back', Escape: 'back',
    KeyT: 'transform',
    KeyE: 'special',
    KeyK: 'love',
    KeyM: 'mute',
    KeyP: 'pause'
  };

  window.addEventListener('keydown', function (e) {
    var k = MAP[e.code];
    anyKeyFlag = true;
    if (W.audio && W.audio.unlock) W.audio.unlock();   // autoplay policy
    if (!k) return;
    if (!held[k]) pressed[k] = true;
    held[k] = true;
    if (e.code.indexOf('Arrow') === 0 || e.code === 'Space') e.preventDefault();
  });

  window.addEventListener('keyup', function (e) {
    var k = MAP[e.code];
    if (k) held[k] = false;
  });

  window.addEventListener('blur', function () { held = {}; pressed = {}; });

  W.input = {
    down: function (k) { return !!held[k]; },
    hit: function (k) { return !!pressed[k]; },
    anyKey: function () { return anyKeyFlag; },
    endFrame: function () { pressed = {}; anyKeyFlag = false; },
    axis: function () {
      return [(held.right ? 1 : 0) - (held.left ? 1 : 0),
              (held.down ? 1 : 0) - (held.up ? 1 : 0)];
    }
  };
})(window.W);
