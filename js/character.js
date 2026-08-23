/* Warmland — everybody who walks around.
 *
 * Bobby, Panda and Yuna are the SAME boba-cup silhouette with different heads
 * and palettes, so characters are a data table rather than three copies of the
 * drawing code. Butterball and the quiet critters are different body types in
 * the same system.
 *
 * Draw order (cup body): legs -> cup -> arms -> head -> straw -> face -> hat
 *
 * Crayon strokes are far too expensive to redraw at 60fps, so a finished pose
 * is baked into an offscreen tile and blitted. Cache key is
 * char|tint|suit|dir|frame — squash is applied at blit time, not baked.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  // ------------------------------------------------------------- the cast

  W.CHARS = {
    bobby: {
      name: 'Bobby Bear', body: 'cup', head: 'bear',
      fur: '#A97B4F', ear: '#A97B4F', earInner: PAL.accent,
      muzzle: '#E9D6AE', nose: '#8A5A2B',
      straw: '#F2C14E', cupTop: '#E9D6AE', cupBot: '#D9A863', pearl: '#8A5A2B'
    },
    panda: {
      name: 'Panda', body: 'cup', head: 'panda',
      fur: '#FFFDF6', ear: '#2A2A2A', earInner: null, patches: true,
      muzzle: '#FFFDF6', nose: '#2A2A2A',
      straw: '#5FBFA0', cupTop: '#DCEBC0', cupBot: '#7FCBB0', pearl: '#3E8F72'
    },
    yuna: {
      name: 'Yuna', body: 'cup', head: 'unicorn',
      fur: '#F3A9C4', ear: '#F3A9C4', earInner: '#C79BE8',
      muzzle: '#FFF4F8', nose: '#E8578F',
      horn: true, mane: true, lashes: true, eye: '#3B7FD4',
      straw: null, cupTop: '#F7C9DA', cupBot: '#E8578F', pearl: '#C13B72'
    },
    butterball: {
      name: 'Butterball', body: 'butterfly', flies: true,
      fur: '#A8B2B8', glasses: '#2E7FD4', eye: '#7A4A2A',
      wing: '#4FA3E8', wingInner: '#F2E14E', antenna: '#8A5F38', foot: '#2E7FD4'
    },
    critter: {
      name: 'Quiet Critter', body: 'pom', googly: true, fur: '#C94FD6', small: true
    },
    pet: {
      name: 'Fluff', body: 'pup',
      fur: '#F2D5A0', ear: '#E8A05C', nose: '#8A5A2B'
    },
    /* Everyone else in Warmland. Bobby and his friends are boba cups
     * BECAUSE they are special — the townsfolk are plain scribble people,
     * which makes the cast read at a glance. Shirt colour comes from the
     * instance tint; skin and hair are derived from it, so one tint is
     * always the same person. */
    npc: {
      name: 'Someone', body: 'person',
      shirt: '#D9847A', skin: '#F0C39A', hair: '#5A3A24'
    }
  };

  // Each body type gets its own tile so a wide butterfly doesn't make every
  // bake more expensive.
  var TILES = {
    cup:       { w: 120, h: 170, ax: 60, ay: 148 },
    mech:      { w: 160, h: 210, ax: 80, ay: 190 },
    butterfly: { w: 164, h: 140, ax: 82, ay: 116 },
    pom:       { w: 80,  h: 84,  ax: 40, ay: 70 },
    pup:       { w: 96,  h: 84,  ax: 48, ay: 72 },
    person:    { w: 110, h: 168, ax: 55, ay: 146 }
  };

  // ------------------------------------------------------------- colouring

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = W.clamp(((n >> 16) & 255) + amt, 0, 255);
    var g = W.clamp(((n >> 8) & 255) + amt, 0, 255);
    var b = W.clamp((n & 255) + amt, 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* Park NPCs are one spec re-tinted, so a crowd costs no extra art. */
  function tinted(spec, tint) {
    if (!tint) return spec;
    var out = {};
    for (var k in spec) out[k] = spec[k];
    if (spec.body === 'person') {
      // one tint, one consistent townsperson
      var r = W.mulberry32(W.hash('person' + tint));
      out.shirt = tint;
      out.trouser = shade(tint, -60);
      out.skin = SKINS[Math.floor(r() * SKINS.length)];
      out.hair = HAIRS[Math.floor(r() * HAIRS.length)];
      out.hairDo = Math.floor(r() * 3);
      out.shoe = shade(tint, -90);
    } else if (spec.body === 'pom') {
      out.fur = tint;
    } else {
      out.fur = tint;
      out.ear = tint;
      out.cupTop = shade(tint, 46);
      out.cupBot = tint;
      out.pearl = shade(tint, -54);
      out.muzzle = shade(tint, 60);
    }
    return out;
  }

  // Four crayon skin tones and five hair colours: enough that a park full
  // of people never reads as clones.
  var SKINS = ['#F6D3B0', '#E8B98C', '#C88A5C', '#8E5A38'];
  var HAIRS = ['#3A2A1E', '#6B4327', '#B9822F', '#D9CBA0', '#8A3E3E'];

  // ------------------------------------------------------------- scribble people

  /* A plain person: circle head, stick limbs, one block of a shirt.
   * Deliberately simpler than the cup cast — they are the background. */
  function drawPerson(ctx, spec, dir, seed, t, swing) {
    var skin = spec.skin || '#F0C39A';
    var shirt = spec.shirt || spec.fur || '#D9847A';
    var trouser = spec.trouser || shade(shirt, -60);
    var hair = spec.hair || '#5A3A24';
    var headY = -96, hr = 17;

    // legs
    for (var s2 = -1; s2 <= 1; s2 += 2) {
      var lx = s2 * 8, len = -6 + swing * s2 * 3;
      C.line(ctx, lx, -38, lx + s2 * 2, len, {
        seed: seed + 'pl' + s2, stroke: PAL.outline, lw: 8, wob: 0.9
      });
      C.line(ctx, lx, -38, lx + s2 * 2, len, {
        seed: seed + 'pl' + s2, stroke: trouser, lw: 5, wob: 0.9, passes: 1
      });
      C.ellipse(ctx, lx + s2 * 4, len + 1, 7, 4.4, {
        seed: seed + 'ps' + s2, fill: spec.shoe || PAL.outline, stroke: PAL.outline,
        lw: 2, hatch: 2.6, wash: 0.9, wob: 0.7
      });
    }

    // shirt
    C.roundRect(ctx, -18, -78, 36, 42, 9, {
      seed: seed + 'shirt', fill: shirt, stroke: PAL.outline,
      lw: 2.6, hatch: 3.4, wash: 0.74, wob: 1
    });

    // arms — they swing opposite the legs, like a person walking
    for (var a2 = -1; a2 <= 1; a2 += 2) {
      var sx = a2 * 17, hx = a2 * 23, hy = -48 - swing * a2 * 4;
      C.line(ctx, sx, -72, hx, hy, {
        seed: seed + 'pa' + a2, stroke: PAL.outline, lw: 7, wob: 0.9
      });
      C.line(ctx, sx, -72, hx, hy, {
        seed: seed + 'pa' + a2, stroke: shirt, lw: 4, wob: 0.9, passes: 1
      });
      C.dot(ctx, hx, hy + 3, 4.4, skin, seed + 'ph' + a2);
    }

    // head
    C.ellipse(ctx, 0, headY, hr, hr + 1, {
      seed: seed + 'phead', fill: skin, stroke: PAL.outline,
      lw: 2.8, hatch: 3, wash: 0.78, wob: 1
    });

    // hair: curls, a bob, or spikes
    var doo = spec.hairDo || 0;
    if (doo === 0) {
      for (var c2 = 0; c2 < 5; c2++) {
        var ca = Math.PI * (1.06 + c2 * 0.22);
        C.dot(ctx, Math.cos(ca) * (hr - 1), headY + Math.sin(ca) * (hr - 1),
              6, hair, seed + 'hc' + c2);
      }
    } else if (doo === 1) {
      C.arc(ctx, 0, headY, hr + 2, Math.PI * 0.98, Math.PI * 2.02, {
        seed: seed + 'hb', stroke: hair, lw: 9, wob: 1
      });
      C.line(ctx, -hr - 1, headY - 2, -hr - 1, headY + 11,
             { seed: seed + 'hbl', stroke: hair, lw: 7, wob: 1 });
      C.line(ctx, hr + 1, headY - 2, hr + 1, headY + 11,
             { seed: seed + 'hbr', stroke: hair, lw: 7, wob: 1 });
    } else {
      for (var k2 = -2; k2 <= 2; k2++) {
        C.line(ctx, k2 * 6, headY - hr + 2, k2 * 7.5, headY - hr - 8, {
          seed: seed + 'hs' + k2, stroke: hair, lw: 5, wob: 1.1
        });
      }
      C.arc(ctx, 0, headY, hr, Math.PI * 1.05, Math.PI * 1.95,
            { seed: seed + 'hsc', stroke: hair, lw: 7, wob: 1 });
    }

    if (dir === 'up') return;      // facing away: no face

    var fx = dir === 'left' ? -4 : dir === 'right' ? 4 : 0;
    C.dot(ctx, fx - 6, headY - 1, 2.5, PAL.outline, seed + 'pe1');
    C.dot(ctx, fx + 6, headY - 1, 2.5, PAL.outline, seed + 'pe2');
    C.arc(ctx, fx, headY + 4, 6, Math.PI * 0.14, Math.PI * 0.86, {
      seed: seed + 'pm', stroke: PAL.outline, lw: 2.2, wob: 0.7
    });
  }

  // ------------------------------------------------------------- cup body

  function drawCup(ctx, spec, suit, seed) {
    var bw = 22, tw = 27, top = -52;
    var pts = [[-tw, top], [tw, top], [bw, 0], [-bw, 0]];

    ctx.save();
    C.poly(ctx, pts, { seed: seed + 'cupfill', fill: spec.cupTop, stroke: null, hatch: 4, wash: 0.72 });
    ctx.save();
    ctx.beginPath();
    ctx.rect(-tw - 4, -25, tw * 2 + 8, 30);
    ctx.clip();
    C.poly(ctx, pts, { seed: seed + 'tea', fill: spec.cupBot, stroke: null, hatch: 3.8, wash: 0.62 });
    ctx.restore();

    var pearls = [[-11, -8], [5, -6], [15, -13], [-3, -17], [-16, -18]];
    for (var i = 0; i < pearls.length; i++) {
      C.dot(ctx, pearls[i][0], pearls[i][1], 4.1, spec.pearl, seed + 'p' + i);
    }

    if (suit && suit.apron) {
      C.poly(ctx, [[-11, -43], [11, -43], [13, -16], [-13, -16]], {
        seed: seed + 'apron', fill: PAL.white, stroke: PAL.outline,
        lw: 2.2, hatch: 4.2, wash: 0.8, fillAlpha: 0.28
      });
      C.line(ctx, -10, -43, -19, -50, { seed: seed + 'tie1', stroke: PAL.outline, lw: 2, wob: 1 });
      C.line(ctx, 10, -43, 19, -50, { seed: seed + 'tie2', stroke: PAL.outline, lw: 2, wob: 1 });
    }
    if (suit && suit.racingStripe) {
      C.line(ctx, -6, -50, -6, -4, { seed: seed + 'rs1', stroke: PAL.white, lw: 5, wob: 0.9 });
      C.line(ctx, 6, -50, 6, -4, { seed: seed + 'rs2', stroke: PAL.white, lw: 5, wob: 0.9 });
      C.dot(ctx, 0, -34, 8, PAL.white, seed + 'num');
      C.text(ctx, '1', 0, -30, { size: 15, align: 'center', color: '#D94F4F', seed: seed + 'n1' });
    }
    if (suit && suit.toolbelt) {
      C.rect(ctx, -24, -30, 48, 11, {
        seed: seed + 'belt', fill: '#6B4A2A', stroke: PAL.outline, lw: 2.2, hatch: 3, wash: 0.8
      });
      C.rect(ctx, -6, -32, 12, 15, {
        seed: seed + 'buck', fill: PAL.sun, stroke: PAL.outline, lw: 2, hatch: 2.6, wash: 0.85
      });
    }

    C.poly(ctx, pts, { seed: seed + 'cup', stroke: PAL.outline, lw: 3.2, wob: 1.5 });
    ctx.restore();

    C.roundRect(ctx, -tw - 3, top - 10, (tw + 3) * 2, 12, 4, {
      seed: seed + 'lid', fill: PAL.lid, stroke: PAL.outline,
      lw: 2.8, hatch: 3.4, wash: 0.8, fillAlpha: 0.25, wob: 1.1
    });
  }

  function drawArms(ctx, spec, suit, seed, swing) {
    if (!suit || !suit.arms) return;
    var col = suit.sleeve || PAL.white;
    for (var s = -1; s <= 1; s += 2) {
      var bx = s * 25, by = -36;
      var ex = s * 39, ey = -24 + swing * s * 3;
      C.line(ctx, bx, by, ex, ey, { seed: seed + 'arm' + s, stroke: PAL.outline, lw: 7, wob: 1 });
      C.line(ctx, bx, by, ex, ey, { seed: seed + 'arm' + s, stroke: col, lw: 4.4, wob: 1, passes: 1 });
      C.dot(ctx, ex, ey, 5.2, spec.fur, seed + 'paw' + s);
      C.ellipse(ctx, ex, ey, 5.2, 5.2, { seed: seed + 'pawo' + s, stroke: PAL.outline, lw: 2, wob: 0.7 });
    }
    var wx = 39, wy = -24 + swing * 3;
    if (suit.accessory === 'whisk') {
      C.line(ctx, wx, wy, wx + 4, wy - 15, { seed: seed + 'wh', stroke: PAL.steel, lw: 3, wob: 0.6 });
      for (var k = -1; k <= 1; k++) {
        C.arc(ctx, wx + 5 + k, wy - 20, 6, Math.PI * 0.15, Math.PI * 0.85, {
          seed: seed + 'whb' + k, stroke: PAL.steel, lw: 1.6, wob: 0.5, passes: 1
        });
      }
    } else if (suit.accessory === 'hammer') {
      C.line(ctx, wx, wy + 4, wx + 2, wy - 14, { seed: seed + 'hh', stroke: '#8A5F38', lw: 3.4, wob: 0.6 });
      C.rect(ctx, wx - 6, wy - 22, 17, 9, {
        seed: seed + 'hd', fill: PAL.steel, stroke: PAL.outline, lw: 2, hatch: 2.6, wash: 0.85
      });
    } else if (suit.accessory === 'wheel') {
      C.ellipse(ctx, wx + 4, wy - 6, 10, 10, {
        seed: seed + 'sw', stroke: PAL.outline, lw: 3, wob: 0.8
      });
      C.line(ctx, wx - 6, wy - 6, wx + 14, wy - 6, { seed: seed + 'sw2', stroke: PAL.outline, lw: 2, wob: 0.6 });
    }
  }

  function drawLegs(ctx, suit, seed, swing) {
    if (!suit || !suit.legs) return;
    var col = suit.trouser || PAL.white;
    for (var s = -1; s <= 1; s += 2) {
      var x = s * 11;
      var len = 14 + swing * s * 2;
      C.line(ctx, x, -3, x, len, { seed: seed + 'leg' + s, stroke: PAL.outline, lw: 8, wob: 0.9 });
      C.line(ctx, x, -3, x, len, { seed: seed + 'leg' + s, stroke: col, lw: 5, wob: 0.9, passes: 1 });
      C.ellipse(ctx, x + s * 2, len + 2, 7, 4.5, {
        seed: seed + 'shoe' + s, fill: suit.shoe || PAL.outline, stroke: PAL.outline,
        lw: 2, hatch: 2.6, wash: 0.9, wob: 0.7
      });
    }
  }

  // One head routine for bear, panda and unicorn — they differ by flags.
  function drawHead(ctx, spec, dir, seed, t) {
    var hy = -86;

    // ears behind the skull
    for (var s = -1; s <= 1; s += 2) {
      C.ellipse(ctx, s * 24, hy - 16, 12, 11.5, {
        seed: seed + 'ear' + s, fill: spec.ear || spec.fur, stroke: PAL.outline,
        lw: 2.8, hatch: 3.4, wash: 0.62, wob: 1
      });
      if (spec.earInner && dir !== 'up') {
        C.ellipse(ctx, s * 24, hy - 15, 6, 5.6, {
          seed: seed + 'eari' + s, fill: spec.earInner, stroke: null,
          hatch: 2.4, wash: 0.55, wob: 0.7
        });
      }
    }

    if (spec.straw) {
      C.line(ctx, -8, hy - 22, -14, hy - 48, { seed: seed + 'strawo', stroke: PAL.outline, lw: 9, wob: 0.9 });
      C.line(ctx, -8, hy - 22, -14, hy - 48, { seed: seed + 'straw', stroke: spec.straw, lw: 6, wob: 0.9, passes: 1 });
    }

    C.ellipse(ctx, 0, hy, 31, 27, {
      seed: seed + 'head', fill: spec.fur, stroke: PAL.outline,
      lw: 3.2, hatch: 3.8, wash: 0.6, wob: 1.3
    });

    // Yuna's rainbow mane and horn ride on top of the skull, not behind it.
    if (spec.mane) {
      var mc = ['#E8578F', '#F2C14E', '#6FC46F', '#5FA8E8', '#B48FD6'];
      for (var m = 0; m < 6; m++) {
        C.ellipse(ctx, -22 + m * 9, hy - 26 - (m % 2) * 6, 11, 10, {
          seed: seed + 'mane' + m, fill: mc[m % 5], stroke: PAL.outline,
          lw: 1.8, hatch: 2.6, wash: 0.78, wob: 1.2
        });
      }
    }
    if (spec.horn) {
      var hc = ['#E8578F', '#F2C14E', '#6FC46F', '#5FA8E8', '#B48FD6'];
      for (var h = 0; h < 5; h++) {
        var y0 = hy - 24 - h * 10, w0 = 10 - h * 1.9, w1 = 10 - (h + 1) * 1.9;
        C.poly(ctx, [[-w0, y0], [w0, y0], [w1, y0 - 10], [-w1, y0 - 10]], {
          seed: seed + 'horn' + h, fill: hc[h], stroke: null, hatch: 2.4, wash: 0.9, wob: 0.6
        });
      }
      C.poly(ctx, [[-10, hy - 24], [10, hy - 24], [0, hy - 76]], {
        seed: seed + 'hornO', stroke: PAL.outline, lw: 2.6, wob: 0.9
      });
    }

    if (dir === 'up') return;                       // back of the head

    var fx = dir === 'left' ? -7 : dir === 'right' ? 7 : 0;

    if (spec.patches) {                             // panda's eye patches
      for (var p = -1; p <= 1; p += 2) {
        C.ellipse(ctx, fx + p * 13, hy - 3, 10.5, 12, {
          seed: seed + 'pat' + p, fill: '#2A2A2A', stroke: null,
          hatch: 3, wash: 0.9, rot: p * 0.36, wob: 0.9
        });
      }
    }

    C.ellipse(ctx, fx, hy + 9, 16, 11, {
      seed: seed + 'muz', fill: spec.muzzle, stroke: null, hatch: 2.8, wash: 0.75, wob: 0.9
    });

    var blink = (t % 3.4) > 3.24;
    for (var e = -1; e <= 1; e += 2) {
      var ex = fx + e * 12.5;
      if (blink) {
        C.arc(ctx, ex, hy - 2, 4, Math.PI * 0.15, Math.PI * 0.85, {
          seed: seed + 'bl' + e, stroke: spec.patches ? PAL.white : PAL.outline,
          lw: 2.2, wob: 0.5, passes: 1
        });
      } else {
        C.dot(ctx, ex, hy - 2, 3.6, spec.eye || (spec.patches ? PAL.white : PAL.outline), seed + 'eye' + e);
        if (spec.eye) C.ellipse(ctx, ex, hy - 2, 3.9, 3.9, { seed: seed + 'eyo' + e, stroke: PAL.outline, lw: 1.4, wob: 0.4, passes: 1 });
        ctx.globalAlpha = 0.9;
        C.dot(ctx, ex + 1.2, hy - 3.4, 1.2, PAL.white, seed + 'gl' + e);
        ctx.globalAlpha = 1;
        if (spec.lashes) {
          C.line(ctx, ex + e * 4, hy - 6, ex + e * 8, hy - 9, {
            seed: seed + 'lash' + e, stroke: PAL.outline, lw: 1.6, wob: 0.4, passes: 1
          });
        }
      }
    }

    C.ellipse(ctx, fx, hy + 5, 4.4, 3.3, {
      seed: seed + 'nose', fill: spec.nose, stroke: PAL.outline, lw: 1.6, wash: 0.9, hatch: 2.2, wob: 0.5
    });
    C.arc(ctx, fx - 4.6, hy + 9, 5, Math.PI * 0.05, Math.PI * 0.95, {
      seed: seed + 'sm1', stroke: PAL.outline, lw: 2.2, wob: 0.5, passes: 1
    });
    C.arc(ctx, fx + 4.6, hy + 9, 5, Math.PI * 0.05, Math.PI * 0.95, {
      seed: seed + 'sm2', stroke: PAL.outline, lw: 2.2, wob: 0.5, passes: 1
    });
  }

  function drawHat(ctx, suit, seed) {
    if (!suit || !suit.hat) return;
    var hy = -86;
    if (suit.hat === 'toque') {
      C.ellipse(ctx, 3, hy - 36, 22, 15, {
        seed: seed + 'toqueP', fill: PAL.white, stroke: PAL.outline,
        lw: 2.8, hatch: 3.2, wash: 0.8, fillAlpha: 0.25, wob: 1.3
      });
      C.roundRect(ctx, -17, hy - 32, 39, 14, 5, {
        seed: seed + 'toqueB', fill: PAL.white, stroke: PAL.outline,
        lw: 2.6, hatch: 3.2, wash: 0.85, fillAlpha: 0.22, wob: 1
      });
    } else if (suit.hat === 'helmet') {
      C.arc(ctx, 0, hy - 6, 30, Math.PI, Math.PI * 2, {
        seed: seed + 'hel', fill: '#D94F4F', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.75
      });
      C.rect(ctx, -26, hy - 12, 52, 9, {
        seed: seed + 'visor', fill: '#3B2A20', stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.85
      });
      C.line(ctx, -30, hy - 4, 30, hy - 4, { seed: seed + 'helr', stroke: PAL.white, lw: 3, wob: 0.9, passes: 1 });
    } else if (suit.hat === 'hardhat') {
      C.arc(ctx, 0, hy - 8, 29, Math.PI, Math.PI * 2, {
        seed: seed + 'hh', fill: '#F2C14E', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
      });
      C.rect(ctx, -34, hy - 12, 68, 8, {
        seed: seed + 'brim', fill: '#F2C14E', stroke: PAL.outline, lw: 2.4, hatch: 2.8, wash: 0.8
      });
      C.line(ctx, 0, hy - 36, 0, hy - 10, { seed: seed + 'ridge', stroke: '#C79A2E', lw: 3, wob: 0.8, passes: 1 });
    }
  }

  // ------------------------------------------------------------ butterfly

  function drawButterfly(ctx, spec, dir, seed, t, flap) {
    var by = -46;                                   // body centre

    // wings — flap scales them horizontally
    var fw = 0.72 + 0.28 * flap;
    for (var s = -1; s <= 1; s += 2) {
      ctx.save();
      ctx.translate(s * 30, by - 6);
      ctx.scale(fw * s, 1);
      C.ellipse(ctx, 22, -20, 29, 24, {
        seed: seed + 'wu' + s, fill: spec.wing, stroke: PAL.outline,
        lw: 3, hatch: 4.2, wash: 0.62, wob: 1.2
      });
      C.ellipse(ctx, 16, 16, 21, 17, {
        seed: seed + 'wl' + s, fill: spec.wing, stroke: PAL.outline,
        lw: 2.8, hatch: 4, wash: 0.62, wob: 1.1
      });
      C.ellipse(ctx, 2, -6, 11, 13, {
        seed: seed + 'wi' + s, fill: spec.wingInner, stroke: PAL.outline,
        lw: 2, hatch: 2.8, wash: 0.8, wob: 0.9
      });
      ctx.restore();
    }

    // antennae
    for (var a = -1; a <= 1; a += 2) {
      C.arc(ctx, a * 14, by - 34, 13, a > 0 ? -Math.PI * 0.9 : -Math.PI * 0.1,
        a > 0 ? -Math.PI * 0.1 : -Math.PI * 0.9, {
          seed: seed + 'ant' + a, stroke: spec.antenna, lw: 3.4, wob: 0.8, passes: 1
        });
      C.dot(ctx, a * 25, by - 40, 3.4, spec.antenna, seed + 'antb' + a);
    }

    // feet peeking out below
    for (var f = -1; f <= 1; f += 2) {
      C.ellipse(ctx, f * 13, by + 34, 8, 6, {
        seed: seed + 'ft' + f, fill: spec.foot, stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.8, rot: f * 0.4
      });
    }

    // body
    C.ellipse(ctx, 0, by, 34, 33, {
      seed: seed + 'body', fill: spec.fur, stroke: PAL.outline,
      lw: 3.2, hatch: 3.8, wash: 0.66, wob: 1.2
    });

    if (dir === 'up') return;

    // round blue glasses with brown eyes behind them
    var blink = (t % 3.8) > 3.66;
    for (var e = -1; e <= 1; e += 2) {
      var ex = e * 11;
      if (blink) {
        C.arc(ctx, ex, by - 6, 4, Math.PI * 0.15, Math.PI * 0.85, {
          seed: seed + 'bl' + e, stroke: PAL.outline, lw: 2, wob: 0.4, passes: 1
        });
      } else {
        C.dot(ctx, ex, by - 6, 5, spec.eye, seed + 'eye' + e);
        C.dot(ctx, ex, by - 6, 2.6, PAL.outline, seed + 'pup' + e);
        ctx.globalAlpha = 0.9;
        C.dot(ctx, ex + 1.6, by - 8, 1.3, PAL.white, seed + 'gl' + e);
        ctx.globalAlpha = 1;
      }
      C.ellipse(ctx, ex, by - 6, 9.5, 9.5, {
        seed: seed + 'gls' + e, stroke: spec.glasses, lw: 2.8, wob: 0.6
      });
    }
    C.line(ctx, -2, by - 6, 2, by - 6, { seed: seed + 'bridge', stroke: spec.glasses, lw: 2.4, wob: 0.4 });

    C.arc(ctx, 0, by + 4, 5, Math.PI * 0.1, Math.PI * 0.9, {
      seed: seed + 'sm', stroke: '#7A4A2A', lw: 2.2, wob: 0.5, passes: 1
    });
    // the two little cheek marks from the plush
    for (var ch = -1; ch <= 1; ch += 2) {
      C.arc(ctx, ch * 15, by + 15, 6, Math.PI, Math.PI * 2, {
        seed: seed + 'ck' + ch, stroke: '#7A4A2A', lw: 2, wob: 0.5, passes: 1
      });
    }
    // name patch
    C.roundRect(ctx, -15, by + 18, 30, 13, 5, {
      seed: seed + 'patch', fill: PAL.white, stroke: '#7A4A2A', lw: 2, hatch: 3, wash: 0.9, fillAlpha: 0.2
    });
    C.line(ctx, -10, by + 23, 10, by + 23, { seed: seed + 'pt1', stroke: '#7A4A2A', lw: 1.4, wob: 0.5, passes: 1 });
    C.line(ctx, -7, by + 27, 7, by + 27, { seed: seed + 'pt2', stroke: '#7A4A2A', lw: 1.4, wob: 0.5, passes: 1 });
  }

  // ----------------------------------------------------------- pom critter

  function drawPom(ctx, spec, dir, seed, t) {
    var cy = -20, r = 19;
    var rnd = W.mulberry32(W.hash(seed + 'fuzz'));

    // fuzz: short strokes radiating past the edge
    ctx.save();
    ctx.strokeStyle = spec.fur;
    ctx.lineCap = 'round';
    for (var i = 0; i < 40; i++) {
      var a = (i / 40) * Math.PI * 2 + rnd() * 0.2;
      var r0 = r - 2, r1 = r + 3 + rnd() * 5;
      ctx.globalAlpha = 0.65 + rnd() * 0.35;
      ctx.lineWidth = 1.4 + rnd() * 1.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();

    C.ellipse(ctx, 0, cy, r, r, {
      seed: seed + 'ball', fill: spec.fur, stroke: PAL.outline,
      lw: 2.6, hatch: 3, wash: 0.72, wob: 1.1
    });

    if (dir === 'up') return;

    // googly eyes — the pupils sit low and off-centre
    var fx = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
    var wob = Math.sin(t * 5) * 1.2;
    for (var e = -1; e <= 1; e += 2) {
      var ex = fx + e * 7;
      C.ellipse(ctx, ex, cy - 2, 6, 6, {
        seed: seed + 'gw' + e, fill: PAL.white, stroke: PAL.outline,
        lw: 2, hatch: 2.4, wash: 0.95, fillAlpha: 0.2, wob: 0.5
      });
      C.dot(ctx, ex + wob * 0.4, cy + 1, 2.6, PAL.outline, seed + 'gp' + e);
    }
  }

  // ------------------------------------------------------------- the pup

  /* The pet: a floppy-eared bean of a puppy — clearly NOT a pom-pom. */
  function drawPup(ctx, spec, dir, seed, t, frame) {
    var by = -22;

    // waggy tail (two baked positions via the frame)
    var wag = frame % 2 ? 0.5 : -0.25;
    C.arc(ctx, -26, by - 6, 12, Math.PI * (0.9 + wag * 0.2), Math.PI * (1.5 + wag * 0.2), {
      seed: seed + 'tail' + (frame % 2), stroke: spec.ear, lw: 5, wob: 0.8
    });

    // stubby legs
    for (var l = 0; l < 2; l++) {
      C.line(ctx, -12 + l * 22, by + 14, -12 + l * 22, by + 22, {
        seed: seed + 'leg' + l, stroke: spec.ear, lw: 5, wob: 0.5, passes: 1
      });
    }

    // bean body
    C.ellipse(ctx, -4, by, 24, 17, {
      seed: seed + 'body', fill: spec.fur, stroke: PAL.outline,
      lw: 2.8, hatch: 3, wash: 0.75, wob: 1
    });
    // rump patch
    C.ellipse(ctx, -16, by - 4, 8, 6, {
      seed: seed + 'patch', fill: spec.ear, stroke: null, hatch: 2.2, wash: 0.7
    });

    // head, forward of the body
    var hx = 16;
    C.ellipse(ctx, hx, by - 10, 15, 13, {
      seed: seed + 'head', fill: spec.fur, stroke: PAL.outline,
      lw: 2.8, hatch: 2.8, wash: 0.78, wob: 0.9
    });
    // floppy ears
    for (var e = -1; e <= 1; e += 2) {
      C.ellipse(ctx, hx + e * 11, by - 16, 5.5, 9, {
        seed: seed + 'ear' + e, fill: spec.ear, stroke: PAL.outline,
        lw: 2.2, hatch: 2.4, wash: 0.8, rot: e * 0.5
      });
    }

    if (dir === 'up') return;
    var fx = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
    C.dot(ctx, hx + fx - 4, by - 12, 2.2, PAL.outline, seed + 'eye1');
    C.dot(ctx, hx + fx + 5, by - 12, 2.2, PAL.outline, seed + 'eye2');
    C.ellipse(ctx, hx + fx + 1, by - 6, 3.4, 2.6, {
      seed: seed + 'nose', fill: spec.nose, stroke: PAL.outline, lw: 1.4, wash: 0.9, hatch: 2, wob: 0.4
    });
    // a happy tongue
    C.line(ctx, hx + fx + 1, by - 3, hx + fx + 3, by + 2, {
      seed: seed + 'tongue', stroke: '#E8578F', lw: 3, wob: 0.5, passes: 1
    });
  }

  // ------------------------------------------------------------- the mech

  /* Boba Bear Bot (IMG_8455): bear head, straw antenna, boba tank backpack
   * with a tap, pearl-studded armour, boba gun on the right arm. */
  function drawMech(ctx, spec, dir, seed, t, swing) {
    var steel = '#9AA6AE', dark = '#6E7A82', trim = '#C7D0D6';

    // legs
    for (var s = -1; s <= 1; s += 2) {
      var lx = s * 20;
      C.roundRect(ctx, lx - 12, -46, 24, 30, 6, {
        seed: seed + 'thigh' + s, fill: steel, stroke: PAL.outline, lw: 3, hatch: 3.6, wash: 0.7
      });
      C.roundRect(ctx, lx - 11, -18 + swing * s * 2, 22, 24, 5, {
        seed: seed + 'shin' + s, fill: dark, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.7
      });
      C.ellipse(ctx, lx, -20, 10, 8, {
        seed: seed + 'knee' + s, fill: trim, stroke: PAL.outline, lw: 2.4, hatch: 2.8, wash: 0.75
      });
      C.ellipse(ctx, lx + s * 2, 8, 17, 7, {
        seed: seed + 'foot' + s, fill: dark, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.75
      });
      C.dot(ctx, lx, -32, 3.4, spec.pearl || '#8A5A2B', seed + 'lp' + s);
    }

    // boba tank backpack, over the right shoulder
    C.roundRect(ctx, 34, -128, 30, 46, 8, {
      seed: seed + 'tank', fill: trim, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.65
    });
    C.roundRect(ctx, 38, -122, 22, 34, 5, {
      seed: seed + 'tea', fill: spec.cupBot || '#D9A863', stroke: null, hatch: 3, wash: 0.75
    });
    for (var b = 0; b < 6; b++) {
      C.dot(ctx, 43 + (b % 3) * 7, -104 + Math.floor(b / 3) * 9, 3, spec.pearl || '#8A5A2B', seed + 'tp' + b);
    }
    C.line(ctx, 64, -96, 74, -96, { seed: seed + 'tap', stroke: dark, lw: 5, wob: 0.7 });
    C.line(ctx, 34, -92, 24, -78, { seed: seed + 'hose', stroke: dark, lw: 4, wob: 1.2 });

    // torso
    C.poly(ctx, [[-30, -104], [30, -104], [26, -46], [-26, -46]], {
      seed: seed + 'torso', fill: steel, stroke: PAL.outline, lw: 3.4, hatch: 3.8, wash: 0.68
    });
    C.ellipse(ctx, 0, -78, 13, 13, {
      seed: seed + 'core', fill: spec.cupBot || '#D9A863', stroke: PAL.outline, lw: 3, hatch: 2.8, wash: 0.8
    });
    for (var g = 0; g < 8; g++) {
      var ga = (g / 8) * Math.PI * 2;
      C.line(ctx, Math.cos(ga) * 13, -78 + Math.sin(ga) * 13,
                  Math.cos(ga) * 18, -78 + Math.sin(ga) * 18,
        { seed: seed + 'gear' + g, stroke: PAL.outline, lw: 2.4, wob: 0.5, passes: 1 });
    }

    // arms — left is a hand, right is the boba gun
    C.roundRect(ctx, -50, -100 + swing * 2, 20, 44, 7, {
      seed: seed + 'armL', fill: dark, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.7
    });
    C.ellipse(ctx, -40, -50 + swing * 2, 10, 9, {
      seed: seed + 'handL', fill: steel, stroke: PAL.outline, lw: 2.6, hatch: 2.8, wash: 0.75
    });
    C.roundRect(ctx, 30, -100 - swing * 2, 20, 40, 7, {
      seed: seed + 'armR', fill: dark, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.7
    });
    C.roundRect(ctx, 30, -64 - swing * 2, 32, 17, 6, {
      seed: seed + 'gun', fill: trim, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.72
    });
    C.ellipse(ctx, 63, -56 - swing * 2, 7, 9, {
      seed: seed + 'muzzle', fill: spec.cupBot || '#D9A863', stroke: PAL.outline, lw: 2.6, hatch: 2.4, wash: 0.85
    });

    // shoulder pads
    for (var sp = -1; sp <= 1; sp += 2) {
      C.arc(ctx, sp * 34, -100, 17, Math.PI, Math.PI * 2, {
        seed: seed + 'pad' + sp, fill: trim, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.72
      });
    }

    // the bear head, in metal
    var headSpec = {
      fur: steel, ear: steel, earInner: null, muzzle: trim,
      nose: PAL.outline, straw: spec.straw || '#F2C14E'
    };
    ctx.save();
    ctx.translate(0, -46);
    drawHead(ctx, headSpec, dir, seed + 'mh', t);
    ctx.restore();
  }

  // ------------------------------------------------------------- the bake

  function bake(charKey, tint, suitKey, dir, frame) {
    var base = W.CHARS[charKey] || W.CHARS.bobby;
    var spec = tinted(base, tint);
    var suit = W.SUITS[suitKey] || W.SUITS.none;
    var body = (suit.overrideBody && charKey === 'bobby') ? suit.overrideBody : spec.body;
    var tile = TILES[body] || TILES.cup;

    var cv = C.offscreen(tile.w, tile.h);
    var ctx = cv.getContext('2d');
    var seed = 'ch' + charKey + (tint || '') + suitKey + dir + frame;
    var swing = Math.sin(frame / 4 * Math.PI * 2);
    var t = frame * 0.4;

    ctx.save();
    ctx.translate(tile.ax, tile.ay);
    if (body === 'butterfly') {
      drawButterfly(ctx, spec, dir, seed, t, (frame % 4) / 3);
    } else if (body === 'pup') {
      drawPup(ctx, spec, dir, seed, t, frame);
    } else if (body === 'person') {
      drawPerson(ctx, spec, dir, seed, t, swing);
    } else if (body === 'pom') {
      drawPom(ctx, spec, dir, seed, t);
    } else if (body === 'mech') {
      drawMech(ctx, spec, dir, seed, t, swing);
    } else {
      drawLegs(ctx, suit, seed, swing);
      drawCup(ctx, spec, suit, seed);
      drawArms(ctx, spec, suit, seed, swing);
      drawHead(ctx, spec, dir, seed, t);
      drawHat(ctx, suit, seed);
    }
    ctx.restore();
    return { img: cv, tile: tile };
  }

  var cache = {};
  var warmQueue = [];

  function key(charKey, tint, suitKey, dir, frame) {
    return charKey + '|' + (tint || '') + '|' + suitKey + '|' + dir + '|' + frame;
  }

  function tile(charKey, tint, suitKey, dir, frame) {
    var k = key(charKey, tint, suitKey, dir, frame);
    if (!cache[k]) cache[k] = bake(charKey, tint, suitKey, dir, frame);
    return cache[k];
  }

  /* Queue a character's poses so the first hop never hitches. */
  W.warmChar = function (charKey, tint, suitKey, frames) {
    var dirs = ['down', 'up', 'left', 'right'];
    var n = frames || 4;
    for (var d = 0; d < dirs.length; d++) {
      for (var f = 0; f < n; f++) warmQueue.push([charKey, tint, suitKey || 'none', dirs[d], f]);
    }
  };

  /* Bake one pending pose. Call once a frame from any idle screen or fade.
   * Tracks a rolling average bake time so callers can budget honestly —
   * a real pose costs ~10-40ms, not the wishful 10 the old budgets assumed. */
  var avgBake = 14;
  W.warmAvg = function () { return avgBake; };
  W.warmStep = function () {
    while (warmQueue.length) {
      var j = warmQueue.shift();
      var k = key(j[0], j[1], j[2], j[3], j[4]);
      if (cache[k]) continue;
      var t0 = performance.now();
      cache[k] = bake(j[0], j[1], j[2], j[3], j[4]);
      avgBake = avgBake * 0.7 + (performance.now() - t0) * 0.3;
      return true;
    }
    return false;
  };

  /* Draw a character with their feet at (x, y).
   * opts: { char, tint, suit, dir, hopT, moving, flying, t, scale, alpha, spin } */
  W.drawChar = function (ctx, x, y, opts) {
    opts = opts || {};
    var charKey = opts.char || 'bobby';
    var spec = W.CHARS[charKey] || W.CHARS.bobby;
    var suitKey = (charKey === 'bobby' && opts.suit) ? opts.suit : 'none';
    var dir = opts.dir || 'down';
    var t = opts.t || 0;
    var hopT = opts.hopT || 0;
    var flying = opts.flying || spec.flies;

    var s = opts.moving ? Math.sin(hopT * Math.PI) : 0;
    var lift, squash, frame;

    if (flying) {
      // butterball hovers instead of hopping, and his wings never stop
      lift = 16 + Math.sin(t * 3) * 5;
      squash = 1;
      frame = Math.floor(t * 9) % 4;
    } else {
      lift = s * 11;
      squash = opts.moving ? 0.94 + s * 0.10 : 1 + Math.sin(t * 2.2) * 0.016;
      frame = opts.moving ? (Math.floor(hopT * 4) % (opts.frames || 4)) : 0;
    }

    var got = tile(charKey, opts.tint, suitKey, dir, frame);
    var sc = opts.scale || 1;

    ctx.save();
    var alpha = opts.alpha == null ? 1 : opts.alpha;

    if (!opts.noShadow) {
      var sh = flying ? 0.72 : 1 - s * 0.35;
      ctx.globalAlpha = alpha * 0.2 * sh;
      ctx.fillStyle = PAL.outline;
      ctx.beginPath();
      ctx.ellipse(x, y + 2 * sc, 22 * sc * sh, 7 * sc * sh, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;

    ctx.translate(x, y - lift * sc);
    if (opts.spin) ctx.rotate(opts.spin);
    ctx.scale(sc / squash, sc * squash);
    var suitDef = W.SUITS[suitKey] || W.SUITS.none;
    if (opts.neck && !suitDef.overrideBody) {
      /* Long-Neck Bobby: the martian ice cream stretches him. The tile is
       * drawn twice — body low, head high — with a stretched slice of the
       * body colour joining them, so no new pose has to be baked. */
      var n = opts.neck;
      var headCut = got.tile.ay - 70;          // the cut sits just under the chin
      ctx.save();
      ctx.beginPath();
      ctx.rect(-got.tile.ax, -got.tile.ay + headCut, got.tile.w, got.tile.h);
      ctx.clip();
      ctx.drawImage(got.img, -got.tile.ax, -got.tile.ay);   // body
      ctx.restore();
      ctx.save();
      // cover the stump the head left behind, then run the neck up to it
      var baseY = -got.tile.ay + headCut;
      ctx.fillStyle = spec.muzzle || '#E9D6AE';
      ctx.beginPath();
      ctx.ellipse(0, baseY + 2, 20, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-9, baseY - n, 18, n + 6);
      ctx.strokeStyle = W.PAL.outline;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-9, baseY + 6);
      ctx.lineTo(-9, baseY - n);
      ctx.moveTo(9, baseY + 6);
      ctx.lineTo(9, baseY - n);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(-got.tile.ax, -got.tile.ay - n, got.tile.w, headCut);
      ctx.clip();
      ctx.drawImage(got.img, -got.tile.ax, -got.tile.ay - n);   // head, lifted
      ctx.restore();
    } else {
      ctx.drawImage(got.img, -got.tile.ax, -got.tile.ay);
    }
    ctx.restore();

    /* Whatever is in his paws rides overhead so you never lose track of it.
     * Pure blit of a cached icon — safe to run every frame. */
    if (opts.held && W.itemIcon) {
      var ic = W.itemIcon(opts.held, 13);
      // just above the head, not the top of the (roomy) tile
      var hy = y - lift * sc - (got.tile.ay * 0.78 + 4) * sc + Math.sin(t * 3.4) * 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(ic, Math.round(x - ic.width / 2), Math.round(hy - ic.height));
      ctx.restore();
    }
  };

  // Kept so anything written against the demo still works.
  W.drawBobby = function (ctx, x, y, opts) {
    opts = opts || {};
    opts.char = 'bobby';
    W.drawChar(ctx, x, y, opts);
  };

})(window.W);
