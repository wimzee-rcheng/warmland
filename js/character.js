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
    /* Warmland 2's cast, drawn from the older brother's own pages. */
    galaxy: {
      name: 'Galaxy', body: 'butterfly', flies: true,
      fur: '#D8D8DE', glasses: null, eye: '#3B2A20', lashes: true,
      wing: '#5A3FA8', wingInner: '#F2C14E', starWings: true,
      antenna: '#5A3FA8', foot: '#5A3FA8'
    },
    scaly: {
      name: 'Scaly Critter', body: 'scaly', fur: '#7FB05A',
      crest: '#C7D96B', spot: '#5E8A3E', small: true
    },
    dino: {
      name: 'Cracker', body: 'dino',
      fur: '#7FC46F', belly: '#4E9A4A', spike: '#F2C14E'
    },
    /* The laboratory's barman: eight legs, four eyes, one bow tie. */
    spider: {
      name: 'Webs', body: 'spider', fur: '#6B4A7A', belly: '#8F6BA8',
      eye: '#F2E14E', tie: '#D9402F', small: true
    },

    /* Haunted-house ghosts: grey and sad until you zap their colour back. */
    ghost: {
      name: 'Ghost', body: 'ghost', flies: true, fur: '#C9C4D4'
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
    cup:       { w: 120, h: 184, ax: 60, ay: 162 },
    mech:      { w: 196, h: 210, ax: 98, ay: 190 },
    butterfly: { w: 164, h: 178, ax: 82, ay: 154 },
    pom:       { w: 80,  h: 84,  ax: 40, ay: 70 },
    pup:       { w: 96,  h: 84,  ax: 48, ay: 72 },
    scaly:     { w: 104, h: 70,  ax: 52, ay: 58 },
    dino:      { w: 96,  h: 106, ax: 48, ay: 92 },
    ghost:     { w: 92,  h: 110, ax: 46, ay: 96 },
    spider:    { w: 160, h: 100, ax: 80, ay: 80 },
    person:    { w: 110, h: 168, ax: 55, ay: 146 }
  };

  /* Outfits go on whoever the player is playing — Bobby OR Butterball —
   * but never on the NPC copy of that character standing in the park. */
  function isHero(charKey) {
    return charKey === (W.heroChar ? W.heroChar() : 'bobby');
  }

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
    if (spec.body === 'ghost') {
      out.fur = tint;                  // a zapped ghost keeps its own colour
    } else if (spec.body === 'scaly') {
      out.fur = tint;
      out.crest = shade(tint, 46);
      out.spot = shade(tint, -46);
    } else if (spec.body === 'dino') {
      out.fur = tint;
      out.spike = shade(tint, 60);
    } else if (spec.body === 'person') {
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

  /* headY says where the top of the head is; the cup body's is -86, but a
   * butterfly's round body-head sits somewhere else entirely. */
  function drawHat(ctx, suit, seed, headY) {
    if (!suit || !suit.hat) return;
    var hy = (headY === undefined || headY === null) ? -86 : headY;
    if (suit.hat === 'toque') {
      // a proper puffy chef's hat: tall crown, band around the brow
      C.ellipse(ctx, 2, hy - 44, 25, 19, {
        seed: seed + 'toqueP', fill: PAL.white, stroke: PAL.outline,
        lw: 2.8, hatch: 3.2, wash: 0.8, fillAlpha: 0.25, wob: 1.3
      });
      C.ellipse(ctx, -16, hy - 38, 13, 12, {
        seed: seed + 'toqueP2', fill: PAL.white, stroke: PAL.outline,
        lw: 2.4, hatch: 3, wash: 0.8, fillAlpha: 0.22, wob: 1.2
      });
      C.ellipse(ctx, 18, hy - 38, 13, 12, {
        seed: seed + 'toqueP3', fill: PAL.white, stroke: PAL.outline,
        lw: 2.4, hatch: 3, wash: 0.8, fillAlpha: 0.22, wob: 1.2
      });
      C.roundRect(ctx, -19, hy - 32, 41, 15, 5, {
        seed: seed + 'toqueB', fill: PAL.white, stroke: PAL.outline,
        lw: 2.6, hatch: 3.2, wash: 0.85, fillAlpha: 0.22, wob: 1
      });
    } else if (suit.hat === 'helmet') {
      C.arc(ctx, 0, hy - 20, 32, Math.PI, Math.PI * 2, {
        seed: seed + 'hel', fill: '#D94F4F', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.75
      });
      C.rect(ctx, -32, hy - 22, 64, 10, {
        seed: seed + 'visor', fill: '#3B2A20', stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.85
      });
      C.line(ctx, -30, hy - 34, 30, hy - 34, { seed: seed + 'helr', stroke: PAL.white, lw: 3, wob: 0.9, passes: 1 });
    } else if (suit.hat === 'hardhat') {
      C.arc(ctx, 0, hy - 22, 31, Math.PI, Math.PI * 2, {
        seed: seed + 'hh', fill: '#F2C14E', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
      });
      C.rect(ctx, -37, hy - 26, 74, 9, {
        seed: seed + 'brim', fill: '#F2C14E', stroke: PAL.outline, lw: 2.4, hatch: 2.8, wash: 0.8
      });
      C.line(ctx, 0, hy - 52, 0, hy - 24, { seed: seed + 'ridge', stroke: '#C79A2E', lw: 3, wob: 0.8, passes: 1 });
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
      if (spec.starWings) {
        // Galaxy's wings each carry a big yellow star
        C.star(ctx, 16, -6, 15, spec.wingInner, seed + 'star' + s);
        C.arc(ctx, 16, -6, 15, 0, Math.PI * 2, {
          seed: seed + 'starr' + s, stroke: PAL.outline, lw: 2, wob: 1.2,
          passes: 1, strokeAlpha: 0.5
        });
      } else {
        C.ellipse(ctx, 2, -6, 11, 13, {
          seed: seed + 'wi' + s, fill: spec.wingInner, stroke: PAL.outline,
          lw: 2, hatch: 2.8, wash: 0.8, wob: 0.9
        });
      }
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

    if (dir === 'up') { drawHat(ctx, spec.suit, seed + 'bhat', -46); return; }

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
      if (spec.glasses) {
        C.ellipse(ctx, ex, by - 6, 9.5, 9.5, {
          seed: seed + 'gls' + e, stroke: spec.glasses, lw: 2.8, wob: 0.6
        });
      } else if (spec.lashes) {
        // Galaxy has lashes rather than Butterball's specs
        for (var ls = -1; ls <= 1; ls++) {
          C.line(ctx, ex + ls * 3, by - 12, ex + ls * 5, by - 18, {
            seed: seed + 'lash' + e + ls, stroke: PAL.outline, lw: 1.8, wob: 0.4, passes: 1
          });
        }
      }
    }
    if (spec.glasses) {
      C.line(ctx, -2, by - 6, 2, by - 6, { seed: seed + 'bridge', stroke: spec.glasses, lw: 2.4, wob: 0.4 });
    }

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

    // the hat goes on last, sitting on top of the round body-head
    drawHat(ctx, spec.suit, seed + 'bhat', by - 28);
  }

  // ---------------------------------------------------------- the spider

  /* Webs, the friendly barman. Round, plush, and waving at least two of
   * his legs at all times. */
  function drawSpider(ctx, spec, dir, seed, t, frame) {
    var by = -26;
    var step = Math.sin(frame / 4 * Math.PI * 2);

    // eight legs, four a side, each with a knee
    for (var sd = -1; sd <= 1; sd += 2) {
      for (var l = 0; l < 4; l++) {
        var out = 22 + l * 11;
        var wob = Math.sin(t * 2.4 + l * 1.2 + (sd > 0 ? 0 : 1.6)) * 3 + step * 2;
        C.line(ctx, sd * 9, by - 4 + l * 3,
                    sd * out, by - 18 - l * 2 + wob, {
          seed: seed + 'lu' + sd + l, stroke: spec.fur, lw: 5.5, wob: 0.9
        });
        C.line(ctx, sd * out, by - 18 - l * 2 + wob,
                    sd * (out + 12), by + 16 + l * 2 - wob * 0.5, {
          seed: seed + 'ld' + sd + l, stroke: spec.fur, lw: 5, wob: 0.9
        });
      }
    }

    // fuzzy round body
    C.ellipse(ctx, 0, by, 26, 24, {
      seed: seed + 'body', fill: spec.fur, stroke: PAL.outline,
      lw: 3.2, hatch: 3.8, wash: 0.66, wob: 1.2
    });
    C.ellipse(ctx, 0, by + 6, 16, 13, {
      seed: seed + 'belly', fill: spec.belly, stroke: null,
      hatch: 3, wash: 0.7, fillAlpha: 0.7
    });

    // four friendly eyes
    if (dir !== 'up') {
      var EY = [[-11, -9, 5.5], [11, -9, 5.5], [-5, 0, 3.4], [5, 0, 3.4]];
      for (var e = 0; e < EY.length; e++) {
        C.dot(ctx, EY[e][0], by + EY[e][1], EY[e][2], PAL.white, seed + 'ew' + e);
        C.dot(ctx, EY[e][0] + 1, by + EY[e][1], EY[e][2] * 0.5, PAL.outline, seed + 'ep' + e);
      }
      C.arc(ctx, 0, by + 9, 7, Math.PI * 0.12, Math.PI * 0.88, {
        seed: seed + 'smile', stroke: PAL.outline, lw: 2.4, wob: 0.5, passes: 1
      });
    }

    // the barman's bow tie
    C.poly(ctx, [[-13, by + 22], [-3, by + 17], [-3, by + 27]], {
      seed: seed + 'tieL', fill: spec.tie, stroke: PAL.outline, lw: 2.2, hatch: 2.4, wash: 0.85
    });
    C.poly(ctx, [[13, by + 22], [3, by + 17], [3, by + 27]], {
      seed: seed + 'tieR', fill: spec.tie, stroke: PAL.outline, lw: 2.2, hatch: 2.4, wash: 0.85
    });
    C.dot(ctx, 0, by + 22, 3, spec.tie, seed + 'tieK');
  }

  // ----------------------------------------------------------- ghost

  /* A friendly sheet-ghost with a wavy hem. Grey while it is sad; the
   * colour-zapper repaints the very same shape in its true colour. */
  function drawGhost(ctx, spec, dir, seed, t) {
    var by = -46;
    var wob = Math.sin(t * 2) * 3;

    // body: a dome with a wavy bottom
    var pts = [];
    for (var a = 0; a <= 12; a++) {
      var ang = Math.PI + (a / 12) * Math.PI;
      pts.push([Math.cos(ang) * 30, by + Math.sin(ang) * 34]);
    }
    for (var h = 0; h < 5; h++) {
      pts.push([30 - h * 15, by + 30 + ((h % 2) ? 14 : 2) + wob]);
    }
    C.poly(ctx, pts, {
      seed: seed + 'body', fill: spec.fur, stroke: PAL.outline,
      lw: 3, hatch: 4, wash: 0.62, fillAlpha: 0.75, wob: 1.2
    });

    if (dir === 'up') return;

    // big friendly eyes and a little o of a mouth
    for (var e = -1; e <= 1; e += 2) {
      C.dot(ctx, e * 10, by - 6, 6.5, PAL.white, seed + 'ew' + e);
      C.dot(ctx, e * 10, by - 5, 3.4, PAL.outline, seed + 'ep' + e);
    }
    C.ellipse(ctx, 0, by + 12, 6, 8, {
      seed: seed + 'mo', fill: PAL.outline, stroke: null, hatch: 2, wash: 0.9, fillAlpha: 0.7
    });
    // rosy cheeks once it has its colour back
    if (spec.happy) {
      for (var ch = -1; ch <= 1; ch += 2) {
        C.dot(ctx, ch * 20, by + 6, 5, '#E8A0B4', seed + 'ck' + ch);
      }
    }
  }

  // ------------------------------------------------------- scaly critter

  /* Warmland 2's quiet critters: a little side-on lizard with a leaf-
   * striped crest down its back and a long curling tail. */
  function drawScaly(ctx, spec, dir, seed, t) {
    var flip = dir === 'left' ? -1 : 1;
    ctx.save();
    ctx.scale(flip, 1);
    var by = -22;

    // tail, sweeping back and up
    C.arc(ctx, -18, by + 4, 26, Math.PI * 1.05, Math.PI * 1.75, {
      seed: seed + 'tail', stroke: spec.fur, lw: 9, wob: 1.2
    });
    C.dot(ctx, -42, by - 6, 4.5, spec.fur, seed + 'tailtip');

    // legs (2 frames of wiggle)
    var wig = Math.sin(t * 6) * 3;
    for (var l = -1; l <= 1; l += 2) {
      C.line(ctx, l * 12, by + 12, l * 14 + wig * l, by + 26, {
        seed: seed + 'leg' + l, stroke: spec.fur, lw: 6, wob: 0.8
      });
      C.dot(ctx, l * 14 + wig * l, by + 27, 3.6, spec.fur, seed + 'foot' + l);
    }

    // body
    C.ellipse(ctx, 0, by, 27, 15, {
      seed: seed + 'body', fill: spec.fur, stroke: PAL.outline,
      lw: 2.8, hatch: 3.4, wash: 0.72, wob: 1
    });
    // the leaf-striped crest
    for (var c = -2; c <= 2; c++) {
      C.poly(ctx, [[c * 10 - 5, by - 10], [c * 10 + 5, by - 10], [c * 10, by - 22]], {
        seed: seed + 'crest' + c, fill: spec.crest, stroke: PAL.outline,
        lw: 2, hatch: 2.6, wash: 0.8
      });
    }
    // spots
    for (var sp = 0; sp < 4; sp++) {
      C.dot(ctx, -14 + sp * 9, by + 3 + (sp % 2) * 5, 2.6, spec.spot, seed + 'sp' + sp);
    }
    // head
    C.ellipse(ctx, 26, by - 4, 15, 11, {
      seed: seed + 'head', fill: spec.fur, stroke: PAL.outline,
      lw: 2.6, hatch: 3, wash: 0.75, wob: 0.9
    });
    C.dot(ctx, 30, by - 8, 3.4, PAL.white, seed + 'eyew');
    C.dot(ctx, 31, by - 8, 1.9, PAL.outline, seed + 'eye');
    C.line(ctx, 34, by, 40, by, { seed: seed + 'snout', stroke: PAL.outline, lw: 2, wob: 0.5, passes: 1 });
    ctx.restore();
  }

  // ----------------------------------------------------------- baby dino

  /* Cracker: a small upright T-rex with a wide dark mouth, a dark belly
   * and yellow spikes down his back. */
  function drawDino(ctx, spec, dir, seed, t, frame) {
    var flip = dir === 'left' ? -1 : 1;
    ctx.save();
    ctx.scale(flip, 1);
    var by = -34;
    var step = Math.sin(frame / 4 * Math.PI * 2) * 3;

    // tail
    C.arc(ctx, -20, by + 26, 22, Math.PI * 1.1, Math.PI * 1.8, {
      seed: seed + 'tail', stroke: spec.fur, lw: 11, wob: 1.2
    });

    // legs
    for (var l = -1; l <= 1; l += 2) {
      C.line(ctx, l * 7, by + 24, l * 8 + step * l, by + 40, {
        seed: seed + 'leg' + l, stroke: spec.fur, lw: 9, wob: 0.8
      });
      C.ellipse(ctx, l * 9 + step * l, by + 41, 8, 4.5, {
        seed: seed + 'foot' + l, fill: spec.fur, stroke: PAL.outline,
        lw: 2, hatch: 2.4, wash: 0.8
      });
    }

    // body + belly
    C.ellipse(ctx, 0, by + 10, 20, 24, {
      seed: seed + 'body', fill: spec.fur, stroke: PAL.outline,
      lw: 3, hatch: 3.6, wash: 0.72, wob: 1
    });
    C.ellipse(ctx, 6, by + 14, 11, 17, {
      seed: seed + 'belly', fill: spec.belly, stroke: null, hatch: 3, wash: 0.7, fillAlpha: 0.75
    });
    // little arms
    C.line(ctx, 12, by + 6, 20, by + 12, { seed: seed + 'arm', stroke: spec.fur, lw: 5, wob: 0.7 });

    // spikes down the back
    for (var s2 = 0; s2 < 5; s2++) {
      var sy = by + 26 - s2 * 11;
      C.poly(ctx, [[-16, sy], [-16, sy - 8], [-24, sy - 3]], {
        seed: seed + 'spk' + s2, fill: spec.spike, stroke: PAL.outline,
        lw: 1.8, hatch: 2.2, wash: 0.85
      });
    }

    // head — one clean green, snout included, with a drawn-on grin
    C.ellipse(ctx, 4, by - 16, 18, 15, {
      seed: seed + 'head', fill: spec.fur, stroke: PAL.outline,
      lw: 3, hatch: 3.4, wash: 0.75, wob: 1
    });
    C.ellipse(ctx, 15, by - 12, 10, 9, {
      seed: seed + 'snout', fill: spec.fur, stroke: PAL.outline,
      lw: 2.6, hatch: 3, wash: 0.72, wob: 0.9
    });
    // the grin rides just under the snout, where it can actually be seen
    C.arc(ctx, 13, by - 7, 9, Math.PI * 0.12, Math.PI * 0.88, {
      seed: seed + 'grin', stroke: PAL.outline, lw: 2.6, wob: 0.6, passes: 1
    });
    C.dot(ctx, 23, by - 15, 2.2, PAL.outline, seed + 'nose');
    C.dot(ctx, 6, by - 22, 4.4, PAL.white, seed + 'eyew');
    C.dot(ctx, 7, by - 22, 2.4, PAL.outline, seed + 'eye');
    ctx.restore();
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
    var fly = spec.body === 'butterfly';
    // Bobby's bot runs on boba; Butterball's runs on lemonade
    var juice = fly ? '#F2D64E' : (spec.cupBot || '#D9A863');

    // Butterball's bot FLIES: plated wings behind everything, star and all
    if (fly) {
      for (var bw = -1; bw <= 1; bw += 2) {
        C.ellipse(ctx, bw * 58, -116, 25, 32, {
          seed: seed + 'bwU' + bw, fill: spec.wing || '#4FA3E8', stroke: PAL.outline,
          lw: 3.2, hatch: 3.8, wash: 0.68
        });
        C.ellipse(ctx, bw * 52, -74, 19, 23, {
          seed: seed + 'bwL' + bw, fill: spec.wing || '#4FA3E8', stroke: PAL.outline,
          lw: 3, hatch: 3.4, wash: 0.7
        });
        C.star(ctx, bw * 58, -118, 11, spec.wingInner || '#F2E14E', seed + 'bws' + bw);
        C.line(ctx, bw * 30, -100, bw * 44, -110,
          { seed: seed + 'bwj' + bw, stroke: trim, lw: 4, wob: 0.6, passes: 1 });
      }
    }

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
      seed: seed + 'tea', fill: juice, stroke: null, hatch: 3, wash: 0.75
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
      seed: seed + 'core', fill: juice, stroke: PAL.outline, lw: 3, hatch: 2.8, wash: 0.8
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
      seed: seed + 'muzzle', fill: juice, stroke: PAL.outline, lw: 2.6, hatch: 2.4, wash: 0.85
    });

    // shoulder pads
    for (var sp = -1; sp <= 1; sp += 2) {
      C.arc(ctx, sp * 34, -100, 17, Math.PI, Math.PI * 2, {
        seed: seed + 'pad' + sp, fill: trim, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.72
      });
    }

    ctx.save();
    ctx.translate(0, -46);
    if (spec.body === 'butterfly') {
      // Butterball's bot keeps HIS face — antennae, specs and all — sitting
      // ON the shoulders, exactly where the bear's metal head goes
      var mhy = -86;
      for (var ma = -1; ma <= 1; ma += 2) {
        C.arc(ctx, ma * 14, mhy - 22, 13, ma > 0 ? -Math.PI * 0.9 : -Math.PI * 0.1,
          ma > 0 ? -Math.PI * 0.1 : -Math.PI * 0.9, {
            seed: seed + 'mant' + ma, stroke: trim, lw: 3.4, wob: 0.8, passes: 1
          });
        C.dot(ctx, ma * 25, mhy - 30, 4, trim, seed + 'mantb' + ma);
      }
      C.ellipse(ctx, 0, mhy, 30, 28, {
        seed: seed + 'mbh', fill: steel, stroke: PAL.outline, lw: 3.2, hatch: 3.6, wash: 0.7
      });
      // a bolted neck plate, so the head reads as part of the machine
      C.roundRect(ctx, -13, mhy + 22, 26, 14, 4, {
        seed: seed + 'mneck', fill: dark, stroke: PAL.outline, lw: 2.6, hatch: 2.8, wash: 0.75
      });
      if (dir !== 'up') {
        for (var me = -1; me <= 1; me += 2) {
          C.dot(ctx, me * 11, mhy - 2, 5, spec.eye || '#7A4A2A', seed + 'me' + me);
          C.dot(ctx, me * 11, mhy - 2, 2.6, PAL.outline, seed + 'mp' + me);
          C.ellipse(ctx, me * 11, mhy - 2, 9, 9, {
            seed: seed + 'mg' + me, stroke: spec.glasses || trim, lw: 2.6, wob: 0.6
          });
        }
        C.arc(ctx, 0, mhy + 11, 6, Math.PI * 0.1, Math.PI * 0.9, {
          seed: seed + 'msm', stroke: PAL.outline, lw: 2.2, wob: 0.5, passes: 1
        });
      }
    } else {
      // the bear head, in metal
      var headSpec = {
        fur: steel, ear: steel, earInner: null, muzzle: trim,
        nose: PAL.outline, straw: spec.straw || '#F2C14E'
      };
      drawHead(ctx, headSpec, dir, seed + 'mh', t);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- the bake

  function bake(charKey, tint, suitKey, dir, frame) {
    var base = W.CHARS[charKey] || W.CHARS.bobby;
    var spec = tinted(base, tint);
    var suit = W.SUITS[suitKey] || W.SUITS.none;
    var body = (suit.overrideBody && isHero(charKey)) ? suit.overrideBody : spec.body;
    var tile = TILES[body] || TILES.cup;

    var cv = C.offscreen(tile.w, tile.h);
    var ctx = cv.getContext('2d');
    var seed = 'ch' + charKey + (tint || '') + suitKey + dir + frame;
    var swing = Math.sin(frame / 4 * Math.PI * 2);
    var t = frame * 0.4;

    ctx.save();
    ctx.translate(tile.ax, tile.ay);
    if (body === 'butterfly') {
      spec.suit = suit;                    // Butterball can wear the outfits too
      drawButterfly(ctx, spec, dir, seed, t, (frame % 4) / 3);
    } else if (body === 'pup') {
      drawPup(ctx, spec, dir, seed, t, frame);
    } else if (body === 'person') {
      drawPerson(ctx, spec, dir, seed, t, swing);
    } else if (body === 'ghost') {
      drawGhost(ctx, spec, dir, seed, t);
    } else if (body === 'spider') {
      drawSpider(ctx, spec, dir, seed, t, frame);
    } else if (body === 'scaly') {
      drawScaly(ctx, spec, dir, seed, t + frame * 0.4);
    } else if (body === 'dino') {
      drawDino(ctx, spec, dir, seed, t, frame);
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
    var suitKey = (isHero(charKey) && opts.suit) ? opts.suit : 'none';
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
    var suitDef0 = W.SUITS[suitKey] || W.SUITS.none;
    var body = (suitDef0.overrideBody && isHero(charKey)) ? suitDef0.overrideBody : spec.body;

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

    /* The lab potion: eight extra legs sprout behind whoever drank it. They
     * are stroked live rather than baked, because they wiggle — the same
     * trick the long neck uses. */
    if (opts.legs8) {
      var g8 = opts.legs8;
      // a butterfly's wings would hide legs attached high up, so his sprout
      // from lower down the body
      var hipY = -got.tile.ay * (body === 'butterfly' ? 0.18 : 0.34);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (var pass = 0; pass < 2; pass++) {
        // spider-purple, so it reads as the potion rather than spare limbs
        ctx.strokeStyle = pass ? '#6B4A7A' : PAL.outline;
        ctx.lineWidth = pass ? 5.5 : 9;
        for (var sd8 = -1; sd8 <= 1; sd8 += 2) {
          for (var l8 = 0; l8 < 4; l8++) {
            var reach = (36 + l8 * 15) * g8;
            var wig = Math.sin(t * 5 + l8 * 1.15 + (sd8 > 0 ? 0 : 1.7)) * 6 * g8;
            var hx8 = sd8 * 7, hy8 = hipY + l8 * 6;
            // the knee rides high — that arch is what makes it a spider
            var kx8 = sd8 * (reach * 0.66), ky8 = hy8 - (30 + l8 * 4) * g8 + wig;
            var fx8 = sd8 * reach, fy8 = -2 - l8 * 1.5 + wig * 0.4;
            ctx.beginPath();
            ctx.moveTo(hx8, hy8);
            ctx.lineTo(kx8, ky8);
            ctx.lineTo(fx8, fy8);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    if (opts.neck && !suitDef.overrideBody && body !== 'cup') {
      /* Bodies without a neck (a round butterfly, say) can't be split at
       * the chin without looking like two of themselves — they just go
       * gloriously, wobblingly TALL instead. */
      var st3 = 1 + opts.neck / 115;      // tall and silly, still on screen
      ctx.save();
      ctx.translate(0, got.tile.ay);
      ctx.scale(1, st3);
      ctx.translate(0, -got.tile.ay);
      ctx.drawImage(got.img, -got.tile.ax, -got.tile.ay);
      ctx.restore();
    } else if (opts.neck && !suitDef.overrideBody) {
      /* Long-Neck Bobby: the martian ice cream stretches him. The tile is
       * drawn twice — body low, head high — with a stretched slice of the
       * body colour joining them, so no new pose has to be baked. */
      var n = opts.neck;
      // where the chin is depends on the body — a butterfly's head IS its
      // body, so its cut sits higher up the tile
      var CUT = { cup: 70, butterfly: 22, person: 62 };
      var headCut = got.tile.ay - (CUT[body] || 70);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-got.tile.ax, -got.tile.ay + headCut, got.tile.w, got.tile.h);
      ctx.clip();
      ctx.drawImage(got.img, -got.tile.ax, -got.tile.ay);   // body
      ctx.restore();
      ctx.save();
      // cover the stump the head left behind, then run the neck up to it
      var baseY = -got.tile.ay + headCut;
      ctx.fillStyle = spec.muzzle || spec.fur || '#E9D6AE';
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
