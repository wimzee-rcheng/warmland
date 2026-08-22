/* Warmland — seeded randomness.
 *
 * Every wobble in this game must be *deterministic*. If jitter is re-rolled
 * each frame the whole scene vibrates and reads as broken rather than
 * hand-drawn. So each shape gets a seed, and the same seed always produces
 * the same wobble.
 */
var W = window.W || (window.W = {});

// mulberry32 — small, fast, good enough for jitter.
W.mulberry32 = function (a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Turn any string or number into a stable 32-bit seed.
W.hash = function (v) {
  var s = String(v);
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

W.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
W.lerp = function (a, b, t) { return a + (b - a) * t; };
