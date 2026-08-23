/* Warmland — sound, synthesised in code.
 *
 * No audio files: the game has to stay a folder you can double-click, so
 * every noise here is oscillators and envelopes. Browsers won't let audio
 * start before a gesture, so the context is created on the first key press.
 */
(function (W) {
  'use strict';

  var ctx = null, master = null, musicGain = null;
  var muted = false, started = false;

  function ensure() {
    if (ctx || typeof AudioContext === 'undefined') return ctx;
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.22;
      musicGain.connect(master);
    } catch (e) { ctx = null; }
    return ctx;
  }

  /* One shaped note. */
  function tone(freq, dur, type, vol, sweepTo, dest) {
    if (!ctx || muted) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    var now = ctx.currentTime;
    o.frequency.setValueAtTime(freq, now);
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, now + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g);
    g.connect(dest || master);
    o.start(now);
    o.stop(now + dur + 0.02);
  }

  /* Filtered noise, for water and splashes. Buffers are cached per duration
   * — filling 40k random samples per splash was pure GC pressure. */
  var noiseBufs = {};
  function noise(dur, vol, freq) {
    if (!ctx || muted) return;
    var bk = Math.round(dur * 10);
    var buf = noiseBufs[bk];
    if (!buf) {
      var n = Math.floor(ctx.sampleRate * dur);
      buf = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      noiseBufs[bk] = buf;
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 1200;
    var g = ctx.createGain();
    g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  var SOUNDS = {
    jump:   function () { tone(420, 0.16, 'sine', 0.26, 760); },
    land:   function () { tone(190, 0.09, 'sine', 0.2, 120); },
    pickup: function () { tone(660, 0.09, 'triangle', 0.38); tone(880, 0.1, 'triangle', 0.3); },
    click:  function () { tone(520, 0.05, 'square', 0.2); },
    clack:  function () { tone(300, 0.07, 'square', 0.14, 200); },
    blip:   function () { tone(740, 0.08, 'triangle', 0.34); },
    ding:   function () { tone(1046, 0.28, 'sine', 0.24); tone(1568, 0.22, 'sine', 0.12); },
    chime:  function () { [1046, 1318, 1568, 2093].forEach(function (f, i) {
              setTimeout(function () { tone(f, 0.4, 'sine', 0.16); }, i * 70); }); },
    love:   function () { [523, 659, 784].forEach(function (f, i) {
              setTimeout(function () { tone(f, 0.22, 'triangle', 0.2); }, i * 80); }); },
    pour:   function () { noise(0.5, 0.14, 700); },
    water:  function () { noise(0.9, 0.12, 1600); },
    thud:   function () { tone(90, 0.12, 'sine', 0.24, 55); noise(0.14, 0.1, 300); },
    rattle: function () { noise(0.09, 0.06, 220); },
    engine: function (frac, pedal) {
      // a low buzzing note that climbs with speed; louder while accelerating
      var f = 55 + W.clamp(frac, 0, 1) * 150;
      tone(f, 0.16, 'sawtooth', pedal ? 0.10 : 0.05, f * 1.12);
      tone(f * 2, 0.12, 'square', pedal ? 0.035 : 0.02);
    },
    horn:   function () { tone(330, 0.3, 'square', 0.16); tone(392, 0.3, 'square', 0.12); },
    cook:   function () { tone(300, 0.3, 'sine', 0.14, 420); },
    eat:    function () { tone(360, 0.1, 'triangle', 0.2); 
                          setTimeout(function () { tone(300, 0.1, 'triangle', 0.18); }, 110); },
    breeze: function () { noise(1.1, 0.09, 900); },
    hammer: function () { [0, 160, 320].forEach(function (d) {
              setTimeout(function () { tone(190, 0.07, 'square', 0.2, 110); }, d); }); },
    shoot:  function () { tone(880, 0.12, 'square', 0.16, 260); },
    hit:    function () { noise(0.16, 0.22, 400); tone(150, 0.14, 'square', 0.18, 80); },
    boom:   function () { noise(0.5, 0.3, 220); tone(90, 0.4, 'sine', 0.24, 40); },
    win:    function () { [523, 659, 784, 1046].forEach(function (f, i) {
              setTimeout(function () { tone(f, 0.3, 'triangle', 0.22); }, i * 120); }); },
    coin:   function () { tone(988, 0.07, 'square', 0.18); 
                          setTimeout(function () { tone(1318, 0.14, 'square', 0.16); }, 70); },
    slurp:  function () { noise(0.45, 0.2, 900); tone(220, 0.4, 'sine', 0.2, 520); },
    boing:  function () { tone(160, 0.3, 'sine', 0.3, 420); },
    squeak: function () { tone(900, 0.2, 'sine', 0.24, 1400); },
    pop:    function () { tone(500, 0.07, 'square', 0.26, 900); },
    chomp:  function () { noise(0.12, 0.24, 500); 
                          setTimeout(function () { noise(0.12, 0.2, 400); }, 140); },
    bite:   function () { noise(0.2, 0.3, 300); tone(120, 0.2, 'square', 0.2, 70); },
    letter: function () { tone(784, 0.12, 'triangle', 0.24); 
                          setTimeout(function () { tone(988, 0.16, 'triangle', 0.2); }, 100); },
    cheer:  function () { [660, 784, 880, 1046].forEach(function (f, i) {
              setTimeout(function () { tone(f, 0.16, 'triangle', 0.2); }, i * 60); }); },
    pat:    function () { tone(170 + Math.random() * 60, 0.05, 'sine', 0.1, 120); },
    doorpop:function () { tone(300, 0.08, 'triangle', 0.2, 480); },
    bird:   function () { var b = 1500 + Math.random() * 600;
              tone(b, 0.09, 'sine', 0.12, b + 500);
              setTimeout(function () { tone(b + 200, 0.12, 'sine', 0.1, b - 200); }, 120); },
    lullaby:function () { [523, 494, 392].forEach(function (f, i) {
              setTimeout(function () { tone(f, 0.7, 'sine', 0.16); }, i * 500); }); },
    murmur: function () { noise(0.4, 0.05, 600); },
    aaah:   function () { [523, 466, 392].forEach(function (f, i) {
              setTimeout(function () { tone(f, 0.45, 'sine', 0.14); }, i * 130); }); }
  };

  // ------------------------------------------------------------- the theme

  // A slow, warm loop. Deliberately sparse so it doesn't wear out.
  var MELODY = [523, 587, 659, 784, 659, 587, 523, 440];
  var BASS   = [131, 131, 165, 165, 196, 196, 165, 147];
  var step = 0, timer = null;

  function tick() {
    if (!ctx || muted) return;
    if (W.game && (W.game.userPaused || W.game.paused)) return;   // silence means silence
    tone(MELODY[step % MELODY.length], 0.5, 'triangle', 0.1, null, musicGain);
    if (step % 2 === 0) tone(BASS[step % BASS.length], 0.9, 'sine', 0.12, null, musicGain);
    step++;
  }

  W.audio = {
    unlock: function () {
      if (started) return;
      if (!ensure()) return;
      started = true;
      if (ctx.state === 'suspended') ctx.resume();
      timer = setInterval(tick, 520);
    },
    play: function (name) {
      if (!started || muted || !ctx) return;
      var f = SOUNDS[name];
      if (f) f();
    },

    /* The race engine takes arguments, so it gets its own door. */
    engine: function (frac, pedal) {
      if (!started || muted || !ctx) return;
      SOUNDS.engine(frac, pedal);
    },
    /* The pause screen silences everything without touching the mute state. */
    setPaused: function (p) {
      if (master) master.gain.value = p ? 0 : (muted ? 0 : 0.55);
    },
    toggleMute: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.55;
      W.say(muted ? 'Sound off' : 'Sound on');
      return muted;
    },
    isMuted: function () { return muted; },
    available: function () { return !!ctx; }
  };
})(window.W);
