/* Warmland — furniture and scenery.
 *
 * Every prop is a small 3/4-view box: a top face (the footprint lifted by the
 * prop's height) and a front face below it. The footprint doubles as the
 * collision box, so rooms.js never has to list collision separately.
 *
 * Each prop is baked once into its own sprite canvas and then blitted in
 * y-sorted order alongside Bobby, which is what lets him walk behind the sofa.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  // ---------------------------------------------------------------- helpers

  // A box standing on footprint (x,y,w,d) rising h pixels up the screen.
  function box(ctx, x, y, w, d, h, top, side, seed, o) {
    o = o || {};
    var r = o.round || 0;
    // front face first, top face over it
    C.rect(ctx, x, y + d - h, w, h, {
      seed: seed + 'f', fill: side, stroke: PAL.outline, lw: 2.8,
      hatch: o.hatch || 4.2, wash: 0.62, wob: 1.2
    });
    if (r) {
      C.roundRect(ctx, x, y - h, w, d, r, {
        seed: seed + 't', fill: top, stroke: PAL.outline, lw: 2.8,
        hatch: o.hatch || 4.2, wash: 0.62, wob: 1.2
      });
    } else {
      C.rect(ctx, x, y - h, w, d, {
        seed: seed + 't', fill: top, stroke: PAL.outline, lw: 2.8,
        hatch: o.hatch || 4.2, wash: 0.62, wob: 1.2
      });
    }
  }

  function shadow(ctx, x, y, w, d) {
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = PAL.outline;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + d - 2, w * 0.55, d * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------------ props

  var P = {};

  P.sofa = { w: 130, d: 48, h: 30, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 130, 48);
    box(ctx, x, y, 130, 48, 30, PAL.roof, '#A5341F', s, { round: 8 });
    // back rest and two arms
    C.roundRect(ctx, x + 2, y - 52, 126, 26, 9, {
      seed: s + 'bk', fill: PAL.roof, stroke: PAL.outline, lw: 2.8, hatch: 4, wash: 0.6
    });
    for (var i = 0; i < 2; i++) {
      C.roundRect(ctx, x + 8 + i * 60, y - 26, 52, 20, 7, {
        seed: s + 'c' + i, fill: '#D9604B', stroke: PAL.outline, lw: 2.2, hatch: 3.6, wash: 0.55
      });
    }
  }};

  P.coffeeTable = { w: 76, d: 42, h: 22, jumpable: true, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 76, 42);
    box(ctx, x, y, 76, 42, 22, PAL.wood, PAL.woodDk, s, { round: 6 });
    // a boba cup left on the table
    C.roundRect(ctx, x + 30, y - 26, 15, 20, 4, {
      seed: s + 'cup', fill: PAL.tea, stroke: PAL.outline, lw: 2, hatch: 3, wash: 0.7
    });
    C.line(ctx, x + 40, y - 28, x + 44, y - 40, { seed: s + 'st', stroke: PAL.sun, lw: 3.5, wob: 0.6 });
  }};

  P.tv = { w: 84, d: 26, h: 56, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 84, 26);
    box(ctx, x + 28, y, 28, 26, 12, PAL.outline, '#2A1C14', s + 'st');
    C.roundRect(ctx, x, y - 56, 84, 46, 5, {
      seed: s + 'scr', fill: PAL.night, stroke: PAL.outline, lw: 3, hatch: 4, wash: 0.7
    });
    C.roundRect(ctx, x + 8, y - 50, 68, 34, 3, {
      seed: s + 'gl', fill: PAL.dome, stroke: null, hatch: 3.4, wash: 0.55
    });
    C.star(ctx, x + 42, y - 33, 11, PAL.sun, s + 'tvs');
  }};

  P.lamp = { w: 22, d: 22, h: 80, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 22, 22);
    C.ellipse(ctx, x + 11, y + 11, 13, 7, {
      seed: s + 'b', fill: PAL.woodDk, stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.7
    });
    C.line(ctx, x + 11, y + 8, x + 11, y - 58, { seed: s + 'p', stroke: PAL.outline, lw: 4, wob: 0.9 });
    C.poly(ctx, [[x - 8, y - 56], [x + 30, y - 56], [x + 24, y - 84], [x - 2, y - 84]], {
      seed: s + 'sh', fill: PAL.sun, stroke: PAL.outline, lw: 2.8, hatch: 4, wash: 0.6
    });
  }};

  P.plant = { w: 38, d: 38, h: 70, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 38, 38);
    for (var i = 0; i < 7; i++) {
      var a = -Math.PI / 2 + (i - 3) * 0.42;
      var lx = x + 19 + Math.cos(a) * 22, ly = y - 6 + Math.sin(a) * 26;
      C.line(ctx, x + 19, y - 4, lx, ly, {
        seed: s + 'sm' + i, stroke: PAL.grassDk, lw: 2.2, wob: 0.7, passes: 1
      });
      C.ellipse(ctx, lx, ly, 14, 8.5, {
        seed: s + 'l' + i, fill: i % 2 ? PAL.grass : PAL.grassDk, stroke: PAL.outline,
        lw: 2.2, hatch: 3.2, wash: 0.6, rot: a
      });
    }
    box(ctx, x + 4, y + 6, 30, 26, 26, '#C98A5A', '#A56A3E', s + 'pot', { round: 5 });
  }};

  P.bookshelf = { w: 96, d: 26, h: 92, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 96, 26);
    box(ctx, x, y, 96, 26, 92, PAL.woodDk, PAL.wood, s);
    for (var r = 0; r < 3; r++) {
      var sy = y + 26 - 92 + 10 + r * 28;
      C.line(ctx, x + 4, sy + 20, x + 92, sy + 20, { seed: s + 'sh' + r, stroke: PAL.outline, lw: 2.4, wob: 0.8 });
      for (var b = 0; b < 6; b++) {
        // Books are 10px wide — hatch texture is invisible at that size, and
        // 18 clipped fills made this the slowest prop in the game (~180ms).
        var cols = [PAL.roof, PAL.grass, PAL.sky, PAL.sun, PAL.accent, PAL.night];
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = cols[(r * 6 + b) % 6];
        ctx.fillRect(x + 8 + b * 14, sy + 2, 10, 18);
        ctx.restore();
        C.rect(ctx, x + 8 + b * 14, sy + 2, 10, 18, {
          seed: s + 'b' + r + b, stroke: PAL.outline, lw: 1.8, wob: 0.7
        });
      }
    }
  }};

  P.closet = { w: 86, d: 30, h: 108, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 86, 30);
    // magic glow
    var gr = ctx.createRadialGradient(x + 43, y - 30, 8, x + 43, y - 30, 96);
    gr.addColorStop(0, 'rgba(242,193,78,0.34)');
    gr.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.save(); ctx.fillStyle = gr;
    ctx.fillRect(x - 60, y - 130, 206, 210); ctx.restore();

    var fy = y + 30 - 108;
    box(ctx, x, y, 86, 30, 108, '#8E5FA8', '#7A4C93', s);
    C.rect(ctx, x + 5, y + 26, 13, 12, { seed: s + 'ft1', fill: '#5E3A73', stroke: PAL.outline, lw: 2.2, hatch: 3, wash: 0.85 });
    C.rect(ctx, x + 68, y + 26, 13, 12, { seed: s + 'ft2', fill: '#5E3A73', stroke: PAL.outline, lw: 2.2, hatch: 3, wash: 0.85 });
    // cornice
    C.rect(ctx, x - 7, fy - 4, 100, 16, {
      seed: s + 'cor', fill: '#7A4C93', stroke: PAL.outline, lw: 2.8, hatch: 3.6, wash: 0.68
    });
    // two doors with star-shaped knobs — this is the magic closet
    C.rect(ctx, x + 6, fy + 8, 34, 88, { seed: s + 'd1', fill: '#A175BC', stroke: PAL.outline, lw: 2.4, hatch: 4, wash: 0.5 });
    C.rect(ctx, x + 46, fy + 8, 34, 88, { seed: s + 'd2', fill: '#A175BC', stroke: PAL.outline, lw: 2.4, hatch: 4, wash: 0.5 });
    C.star(ctx, x + 36, fy + 52, 8, PAL.sun, s + 'k1');
    C.star(ctx, x + 50, fy + 52, 8, PAL.sun, s + 'k2');
    // one baked sparkle, blitted five times
    var spark = C.offscreen(22, 22);
    C.star(spark.getContext('2d'), 11, 11, 5, PAL.white, s + 'sp');
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2;
      ctx.drawImage(spark, x + 43 + Math.cos(a) * 30 - 11, fy + 46 + Math.sin(a) * 34 - 11);
    }
  }};

  P.fridge = { w: 74, d: 40, h: 112, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 74, 40);
    box(ctx, x, y, 74, 40, 112, PAL.steel, '#D7DEE2', s);
    var fy = y + 40 - 112;
    C.line(ctx, x + 4, fy + 40, x + 70, fy + 40, { seed: s + 'sp', stroke: PAL.outline, lw: 2.4, wob: 0.8 });
    C.roundRect(ctx, x + 58, fy + 14, 7, 20, 3, { seed: s + 'h1', fill: PAL.outline, stroke: null, wash: 0.9, hatch: 2.4 });
    C.roundRect(ctx, x + 58, fy + 48, 7, 26, 3, { seed: s + 'h2', fill: PAL.outline, stroke: null, wash: 0.9, hatch: 2.4 });
    C.heart(ctx, x + 24, fy + 24, 16, PAL.accent, s + 'mag');
    C.star(ctx, x + 24, fy + 62, 9, PAL.sun, s + 'mag2');
  }};

  P.stove = { w: 76, d: 42, h: 44, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 76, 42);
    box(ctx, x, y, 76, 42, 44, '#E4E9EC', PAL.steel, s);
    for (var i = 0; i < 4; i++) {
      C.ellipse(ctx, x + 20 + (i % 2) * 36, y - 44 + 12 + Math.floor(i / 2) * 20, 11, 7, {
        seed: s + 'r' + i, fill: PAL.outline, stroke: PAL.outline, lw: 1.8, hatch: 2.6, wash: 0.75
      });
    }
    // a pot with steam curling off it
    C.roundRect(ctx, x + 22, y - 56, 34, 24, 5, {
      seed: s + 'pot', fill: PAL.roof, stroke: PAL.outline, lw: 2.6, hatch: 3.4, wash: 0.65
    });
    for (var k = 0; k < 3; k++) {
      C.arc(ctx, x + 32 + k * 8, y - 66 - k * 5, 7, Math.PI * 0.2, Math.PI * 1.3, {
        seed: s + 'stm' + k, stroke: '#BBB0A0', lw: 2, wob: 0.7, passes: 1
      });
    }
  }};

  P.counter = { w: 170, d: 44, h: 42, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 170, 44);
    box(ctx, x, y, 170, 44, 42, PAL.wood, PAL.woodDk, s, { round: 4 });
    C.rect(ctx, x + 16, y - 40, 54, 32, { seed: s + 'sink', fill: PAL.steel, stroke: PAL.outline, lw: 2.4, hatch: 3.4, wash: 0.6 });
    C.arc(ctx, x + 43, y - 42, 10, Math.PI, Math.PI * 2, { seed: s + 'tap', stroke: PAL.steel, lw: 3.4, wob: 0.6 });
    for (var i = 0; i < 3; i++) {
      C.dot(ctx, x + 108 + i * 20, y - 24, 8, [PAL.accent, PAL.sun, PAL.grass][i], s + 'fr' + i);
    }
  }};

  P.bobaMachine = { w: 52, d: 38, h: 74, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 52, 38);
    box(ctx, x, y, 52, 38, 74, '#C7A0D8', '#AE84C2', s, { round: 5 });
    var fy = y + 38 - 74;
    C.roundRect(ctx, x + 10, fy + 12, 32, 34, 5, {
      seed: s + 'tank', fill: PAL.tea, stroke: PAL.outline, lw: 2.4, hatch: 3.2, wash: 0.7
    });
    for (var i = 0; i < 6; i++) {
      C.dot(ctx, x + 16 + (i % 3) * 10, fy + 24 + Math.floor(i / 3) * 12, 3.6, PAL.pearl, s + 'p' + i);
    }
    C.text(ctx, 'BOBA', x + 26, fy + 62, { size: 12, align: 'center', color: PAL.white, outline: 2, seed: s + 'lb' });
  }};

  P.table = { w: 96, d: 62, h: 34, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 96, 62);
    box(ctx, x, y, 96, 62, 34, PAL.wood, PAL.woodDk, s, { round: 10 });
    C.ellipse(ctx, x + 34, y - 18, 14, 9, { seed: s + 'pl', fill: PAL.white, stroke: PAL.outline, lw: 2, hatch: 3, wash: 0.7 });
    C.ellipse(ctx, x + 66, y - 20, 12, 8, { seed: s + 'pl2', fill: PAL.white, stroke: PAL.outline, lw: 2, hatch: 3, wash: 0.7 });
  }};

  P.chair = { w: 34, d: 32, h: 30, jumpable: true, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 34, 32);
    box(ctx, x, y, 34, 32, 30, PAL.woodDk, PAL.wood, s, { round: 5 });
    C.rect(ctx, x + 4, y - 62, 26, 36, {
      seed: s + 'bk', fill: PAL.wood, stroke: PAL.outline, lw: 2.4, hatch: 3.4, wash: 0.6
    });
    C.line(ctx, x + 17, y - 58, x + 17, y - 30, {
      seed: s + 'sl', stroke: PAL.woodDk, lw: 2, wob: 0.7, passes: 1
    });
  }};

  P.rugRound = { w: 150, d: 96, h: 0, solid: false, draw: function (ctx, x, y, s) {
    C.ellipse(ctx, x + 75, y + 48, 75, 48, {
      seed: s, fill: PAL.accent, stroke: PAL.outline, lw: 2.6, hatch: 5, wash: 0.4, fillAlpha: 0.4
    });
    C.ellipse(ctx, x + 75, y + 48, 52, 33, { seed: s + '2', stroke: PAL.roof, lw: 2.2, wob: 1.4 });
    C.ellipse(ctx, x + 75, y + 48, 28, 18, { seed: s + '3', stroke: PAL.sun, lw: 2.2, wob: 1.2 });
  }};

  // ------------------------------------------------------- outdoor scenery

  P.house = { w: 250, d: 60, h: 210, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 250, 60);
    var fy = y + 60 - 210;                         // top of the walls
    C.rect(ctx, x, fy + 70, 250, 140, {
      seed: s + 'w', fill: '#E08A4B', stroke: PAL.outline, lw: 3.2, hatch: 5, wash: 0.55
    });
    // the red roof from the drawing
    C.poly(ctx, [[x - 18, fy + 74], [x + 125, fy - 6], [x + 268, fy + 74]], {
      seed: s + 'r', fill: PAL.roof, stroke: PAL.outline, lw: 3.4, hatch: 4.6, wash: 0.6
    });
    for (var i = 0; i < 6; i++) {
      C.line(ctx, x - 10 + i * 24, fy + 70, x + 60 + i * 24, fy + 8, {
        seed: s + 'rl' + i, stroke: '#8E2B1E', lw: 1.8, wob: 1, passes: 1, strokeAlpha: 0.7
      });
    }
    // arched door
    C.roundRect(ctx, x + 98, fy + 130, 56, 80, 26, {
      seed: s + 'd', fill: '#D96FA8', stroke: PAL.outline, lw: 3, hatch: 4, wash: 0.6
    });
    C.dot(ctx, x + 144, fy + 172, 4.5, PAL.outline, s + 'knob');
    // windows
    [[24, 96], [172, 96]].forEach(function (p, i) {
      C.rect(ctx, x + p[0], fy + p[1], 54, 44, {
        seed: s + 'win' + i, fill: PAL.dome, stroke: PAL.outline, lw: 2.8, hatch: 3.6, wash: 0.6
      });
      C.line(ctx, x + p[0] + 27, fy + p[1], x + p[0] + 27, fy + p[1] + 44, { seed: s + 'wa' + i, stroke: PAL.outline, lw: 2.2, wob: 0.7 });
      C.line(ctx, x + p[0], fy + p[1] + 22, x + p[0] + 54, fy + p[1] + 22, { seed: s + 'wb' + i, stroke: PAL.outline, lw: 2.2, wob: 0.7 });
    });
    C.text(ctx, 'BOBBYBEAR', x + 125, fy + 62, {
      size: 20, align: 'center', color: PAL.white, outline: 3.5, outlineColor: PAL.outline, seed: s + 'sign'
    });
  }};

  P.tree = { w: 64, d: 40, h: 130, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 64, 40);
    C.rect(ctx, x + 24, y - 70, 16, 92, {
      seed: s + 't', fill: PAL.woodDk, stroke: PAL.outline, lw: 2.8, hatch: 3.4, wash: 0.65
    });
    var rnd = W.mulberry32(W.hash(s));
    C.ellipse(ctx, x + 32, y - 78, 34, 26, {
      seed: s + 'base', fill: PAL.grassDk, stroke: PAL.outline, lw: 2.8, hatch: 4.2, wash: 0.6
    });
    for (var i = 0; i < 5; i++) {
      var bx = x + 32 + (rnd() - 0.5) * 46;
      var by = y - 88 - rnd() * 30;
      C.ellipse(ctx, bx, by, 26 + rnd() * 10, 21 + rnd() * 8, {
        seed: s + 'b' + i, fill: i % 2 ? PAL.grass : PAL.grassDk, stroke: PAL.outline,
        lw: 2.8, hatch: 4.2, wash: 0.6
      });
    }
  }};

  P.mailbox = { w: 22, d: 22, h: 58, draw: function (ctx, x, y, s, tint) {
    shadow(ctx, x, y, 22, 22);
    C.line(ctx, x + 11, y + 10, x + 11, y - 34, { seed: s + 'p', stroke: PAL.woodDk, lw: 6, wob: 0.8 });
    // the box, rounded like a real US mailbox, with a slot and a plate
    C.roundRect(ctx, x - 8, y - 58, 38, 26, 11, {
      seed: s + 'b', fill: tint || PAL.sky, stroke: PAL.outline, lw: 2.6, hatch: 3.4, wash: 0.7
    });
    C.line(ctx, x - 4, y - 52, x + 26, y - 52, { seed: s + 'slot', stroke: PAL.outline, lw: 2.2, wob: 0.6 });
    C.text(ctx, 'MAIL', x + 11, y - 38, {
      size: 10, align: 'center', color: PAL.white, outline: 2, outlineColor: PAL.outline, seed: s + 'lbl'
    });
    // the little red flag
    C.line(ctx, x + 30, y - 56, x + 30, y - 44, { seed: s + 'fp', stroke: PAL.outline, lw: 2.4, wob: 0.4 });
    C.poly(ctx, [[x + 30, y - 56], [x + 40, y - 52], [x + 30, y - 48]], {
      seed: s + 'fl', fill: PAL.roof, stroke: PAL.outline, lw: 1.8, hatch: 2, wash: 0.9
    });
  }};

  P.flower = { w: 20, d: 16, h: 26, solid: false, draw: function (ctx, x, y, s, tint) {
    C.line(ctx, x + 10, y + 8, x + 10, y - 16, { seed: s + 'st', stroke: PAL.grassDk, lw: 2.4, wob: 0.8 });
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2;
      C.dot(ctx, x + 10 + Math.cos(a) * 6, y - 18 + Math.sin(a) * 6, 4.4, tint || PAL.accent, s + 'p' + i);
    }
    C.dot(ctx, x + 10, y - 18, 3.4, PAL.sun, s + 'c');
  }};

  // The UFO from the drawing: saucer body, glass dome, coloured lights.
  P.ufo = { w: 170, d: 74, h: 96, draw: function (ctx, x, y, s) {
    W.drawUFO(ctx, x + 85, y + 37, 1, s, 0);
  }};

  /* Bake a painter into N phase tiles and blit by time. Every vehicle has
   * exactly one time-varying scalar (wheel spin, sway, bubbles, lights), so
   * eight tiles read as continuous motion at a fraction of the cost. */
  function phaseBake(painter, w, h, ax, ay, phases, period) {
    var tiles = [];
    var fn = function (ctx, cx, cy, sc, t, flip) {
      var ph = ((Math.floor(((t % period) / period) * phases) % phases) + phases) % phases;
      if (!tiles[ph]) {
        var cv = C.offscreen(w, h);
        var g = cv.getContext('2d');
        g.translate(ax, ay);
        painter(g, (ph / phases) * period);
        tiles[ph] = cv;
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(flip ? -sc : sc, sc);      // side-view vehicles face their travel
      ctx.drawImage(tiles[ph], -ax, -ay);
      ctx.restore();
    };
    /* Bake every phase now (scene enters call this during the fade, so the
     * first second of motion doesn't stutter through 8 lazy 15-20ms bakes). */
    fn.warm = function () {
      var scratch = C.offscreen(4, 4).getContext('2d');
      for (var ph = 0; ph < phases; ph++) {
        fn(scratch, -999, -999, 0.01, (ph / phases) * period + 0.0001, false);
      }
    };
    return fn;
  }

  /* Shared so the flight scene, the title and the outdoor prop all draw the
   * same craft. Crayon-drawing it live cost ~30ms a frame, so it's baked once
   * per light-pulse phase and blitted. */
  var UFO_PHASES = 8, ufoTiles = [], UFO_W = 210, UFO_H = 150, UFO_AX = 105, UFO_AY = 62;

  function ufoTile(phase) {
    if (ufoTiles[phase]) return ufoTiles[phase];
    var cv = C.offscreen(UFO_W, UFO_H);
    var g = cv.getContext('2d');
    g.translate(UFO_AX, UFO_AY);
    paintUFO(g, 'ufo', (phase / UFO_PHASES) * Math.PI * 2);
    ufoTiles[phase] = cv;
    return cv;
  }

  /* Just the canopy glass — outline and highlight, no fill. Drawn over the
   * rider so he reads as sitting behind glass rather than under a filter. */
  var glassTile = null;
  W.drawUFOGlass = function (ctx, cx, cy, sc) {
    if (!glassTile) {
      var cv = C.offscreen(120, 80);
      var g = cv.getContext('2d');
      g.translate(60, 62);
      C.arc(g, 0, -6, 46, Math.PI, Math.PI * 2, {
        seed: 'glassline', stroke: PAL.outline, lw: 3.2, wob: 1.1
      });
      C.arc(g, -14, -14, 30, Math.PI * 1.15, Math.PI * 1.62, {
        seed: 'glassshine', stroke: PAL.white, lw: 3.4, wob: 0.8, passes: 1, strokeAlpha: 0.85
      });
      glassTile = cv;
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.drawImage(glassTile, -60, -62);
    ctx.restore();
  };

  W.drawUFO = function (ctx, cx, cy, sc, s, t) {
    var phase = ((Math.floor((t * 4 / (Math.PI * 2)) * UFO_PHASES) % UFO_PHASES) + UFO_PHASES) % UFO_PHASES;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.drawImage(ufoTile(phase), -UFO_AX, -UFO_AY);
    ctx.restore();
  };

  function paintUFO(ctx, s, t) {
    ctx.save();

    ctx.globalAlpha = 0.14;
    ctx.fillStyle = PAL.outline;
    ctx.beginPath();
    ctx.ellipse(0, 30, 76, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // glass dome
    C.arc(ctx, 0, -6, 46, Math.PI, Math.PI * 2, {
      seed: s + 'dome', fill: PAL.dome, stroke: PAL.outline, lw: 3.2, hatch: 4, wash: 0.72, fillAlpha: 0.5
    });
    C.arc(ctx, -14, -14, 30, Math.PI * 1.15, Math.PI * 1.62, {
      seed: s + 'shine', stroke: PAL.white, lw: 3, wob: 0.8, passes: 1, strokeAlpha: 0.8
    });

    // saucer body
    C.ellipse(ctx, 0, 0, 85, 24, {
      seed: s + 'body', fill: PAL.steel, stroke: PAL.outline, lw: 3.4, hatch: 4.2, wash: 0.6
    });
    C.ellipse(ctx, 0, -5, 85, 20, { seed: s + 'rim', stroke: PAL.outline, lw: 2.2, wob: 1, passes: 1, strokeAlpha: 0.55 });

    var cols = [PAL.roof, PAL.sun, PAL.grass, PAL.accent, PAL.sky];
    for (var i = 0; i < 5; i++) {
      var lx = -60 + i * 30;
      var pulse = 0.55 + 0.45 * Math.sin(t + i);
      ctx.globalAlpha = pulse;
      C.dot(ctx, lx, 9, 7, cols[i], s + 'lt' + i);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  P.path = { w: 200, d: 300, h: 0, solid: false, draw: function (ctx, x, y, s) {
    C.poly(ctx, [[x + 68, y], [x + 132, y], [x + 200, y + 300], [x, y + 300]], {
      seed: s, fill: '#B5713F', stroke: '#8A5029', lw: 2.6,
      hatch: 6, wash: 0.5, fillAlpha: 0.35, wob: 2.4
    });
    for (var i = 1; i < 6; i++) {
      var t = i / 6, yy = y + 300 * t;
      var half = W.lerp(32, 100, t);
      C.line(ctx, x + 100 - half, yy, x + 100 + half, yy, {
        seed: s + 'r' + i, stroke: '#8A5029', lw: 2, wob: 1.6, passes: 1, strokeAlpha: 0.45
      });
    }
  }};


  // ------------------------------------------------------------- bedroom

  P.bed = { w: 110, d: 150, h: 30, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 110, 150);
    box(ctx, x, y, 110, 150, 26, '#C98A5A', '#A56A3E', s, { round: 8 });
    // mattress, blanket and pillow, seen from above
    C.roundRect(ctx, x + 6, y - 20, 98, 138, 10, {
      seed: s + 'mat', fill: PAL.white, stroke: PAL.outline, lw: 2.6, hatch: 4.4, wash: 0.8, fillAlpha: 0.22
    });
    C.roundRect(ctx, x + 6, y + 34, 98, 84, 10, {
      seed: s + 'bl', fill: '#7FA8D8', stroke: PAL.outline, lw: 2.6, hatch: 4.2, wash: 0.6
    });
    for (var i = 0; i < 3; i++) {
      C.line(ctx, x + 10, y + 50 + i * 22, x + 100, y + 50 + i * 22, {
        seed: s + 'fold' + i, stroke: '#5F86B5', lw: 2, wob: 1.4, passes: 1, strokeAlpha: 0.6
      });
    }
    C.roundRect(ctx, x + 18, y - 12, 74, 40, 12, {
      seed: s + 'pil', fill: PAL.lid, stroke: PAL.outline, lw: 2.4, hatch: 3.4, wash: 0.85, fillAlpha: 0.2
    });
    C.text(ctx, 'zzz', x + 55, y + 90, { size: 20, align: 'center', color: '#5F86B5', seed: s + 'z' });
  }};

  P.dresser = { w: 84, d: 30, h: 66, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 84, 30);
    box(ctx, x, y, 84, 30, 66, PAL.woodDk, PAL.wood, s);
    var fy = y + 30 - 66;
    for (var r = 0; r < 3; r++) {
      C.rect(ctx, x + 7, fy + 6 + r * 19, 70, 15, {
        seed: s + 'dr' + r, fill: PAL.wood, stroke: PAL.outline, lw: 2, hatch: 3, wash: 0.55
      });
      C.dot(ctx, x + 42, fy + 13 + r * 19, 3.4, PAL.sun, s + 'kn' + r);
    }
  }};

  P.toybox = { w: 64, d: 40, h: 36, jumpable: true, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 64, 40);
    box(ctx, x, y, 64, 40, 36, '#E8834E', '#C2633A', s, { round: 5 });
    var fy = y + 40 - 36;
    C.text(ctx, 'TOYS', x + 32, fy + 24, {
      size: 14, align: 'center', color: PAL.white, outline: 2.4, seed: s + 't'
    });
    C.star(ctx, x + 12, fy + 10, 6, PAL.sun, s + 's1');
    C.star(ctx, x + 52, fy + 12, 5, PAL.sun, s + 's2');
  }};

  P.nightlight = { w: 20, d: 20, h: 26, solid: false, draw: function (ctx, x, y, s) {
    C.roundRect(ctx, x + 3, y - 14, 14, 22, 5, {
      seed: s, fill: PAL.sun, stroke: PAL.outline, lw: 2, hatch: 2.6, wash: 0.75
    });
    C.star(ctx, x + 10, y - 4, 5, PAL.white, s + 'st');
  }};

  /* The trophy case: dark wood, glass front, gold trim, velvet lining, and
   * the crystals drawn BIG and faceted — it has to read as a prize cabinet. */
  P.crystalShelf = { w: 110, d: 26, h: 96, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 110, 26);
    box(ctx, x, y, 110, 26, 96, '#4A3358', '#3A2846', s);
    var fy = y + 26 - 96;
    // velvet back
    C.rect(ctx, x + 8, fy + 8, 94, 70, {
      seed: s + 'vel', fill: '#8E2B3E', stroke: null, hatch: 3.4, wash: 0.8
    });
    // dotted silhouettes so the empty case reads as "collect me"
    var have = W.game ? Math.min(6, W.game.state.crystals || 0) : 0;
    for (var sil = have; sil < 6; sil++) {
      var sx2 = x + 24 + (sil % 3) * 32, sy2 = fy + 34 + Math.floor(sil / 3) * 32;
      C.poly(ctx, [[sx2, sy2 - 12], [sx2 + 8, sy2 - 2], [sx2 + 5, sy2 + 9], [sx2 - 5, sy2 + 9], [sx2 - 8, sy2 - 2]], {
        seed: s + 'sil' + sil, stroke: '#B86A78', lw: 1.6, wob: 1.2, passes: 1, strokeAlpha: 0.7
      });
    }
    // two shelves of faceted crystals, coloured by the varieties found
    var n = W.game ? Math.min(6, W.game.state.crystals || 0) : 0;
    var found = W.game ? Object.keys(W.game.state.crystalsFound || {}) : [];
    for (var i = 0; i < n; i++) {
      var kindC = (W.CRYSTALS && found.length)
        ? W.CRYSTALS[found[i % found.length]]
        : { color: '#5F7FD6', hi: '#8FB5F0' };
      var cx = x + 24 + (i % 3) * 32, cy = fy + 34 + Math.floor(i / 3) * 32;
      C.poly(ctx, [[cx, cy - 15], [cx + 10, cy - 3], [cx + 6, cy + 11], [cx - 6, cy + 11], [cx - 10, cy - 3]], {
        seed: s + 'cr' + i, fill: kindC.color, stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.85
      });
      C.poly(ctx, [[cx, cy - 15], [cx + 10, cy - 3], [cx, cy]], {
        seed: s + 'cf' + i, fill: kindC.hi, stroke: null, hatch: 2, wash: 0.9
      });
      C.line(ctx, cx - 5, cy - 6, cx - 1, cy - 12, {
        seed: s + 'cg' + i, stroke: PAL.white, lw: 1.8, wob: 0.3, passes: 1
      });
    }
    for (var r2 = 0; r2 < 2; r2++) {
      C.line(ctx, x + 8, fy + 46 + r2 * 32 - 32, x + 102, fy + 46 + r2 * 32 - 32, {
        seed: s + 'sh' + r2, stroke: '#E8B23D', lw: 2.6, wob: 0.8
      });
    }
    // glass front + gold trim + plaque
    C.rect(ctx, x + 8, fy + 8, 94, 70, {
      seed: s + 'glass', fill: PAL.dome, stroke: null, hatch: 6, wash: 0.16, fillAlpha: 0.2
    });
    C.line(ctx, x + 14, fy + 14, x + 44, fy + 34, {
      seed: s + 'shine', stroke: PAL.white, lw: 2.4, wob: 0.6, passes: 1, strokeAlpha: 0.6
    });
    C.rect(ctx, x + 6, fy + 6, 98, 74, {
      seed: s + 'trim', stroke: '#E8B23D', lw: 3, wob: 0.9
    });
    C.roundRect(ctx, x + 14, fy + 80, 82, 14, 4, {
      seed: s + 'plq', fill: '#E8B23D', stroke: PAL.outline, lw: 1.8, hatch: 2.4, wash: 0.85
    });
    C.text(ctx, 'MY TREASURES', x + 55, fy + 91, {
      size: 9, align: 'center', color: '#5A3A10', seed: s + 'plqt'
    });
  }};

  /* Wall cabinets for the dry goods — flour, sugar, yeast, pasta. */
  P.cabinet = { w: 116, d: 28, h: 116, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 116, 28);
    box(ctx, x, y, 116, 28, 116, PAL.woodDk, PAL.wood, s);
    var fy = y + 28 - 116;
    for (var d = 0; d < 4; d++) {
      var dx = x + 5 + (d % 2) * 55, dy = fy + 8 + Math.floor(d / 2) * 52;
      C.rect(ctx, dx, dy, 50, 46, {
        seed: s + 'dr' + d, fill: PAL.wood, stroke: PAL.outline, lw: 2.2, hatch: 3.4, wash: 0.55
      });
      C.dot(ctx, dx + 42, dy + 23, 3.6, PAL.sun, s + 'kn' + d);
    }
    C.text(ctx, 'DRY GOODS', x + 58, fy + 112, {
      size: 12, align: 'center', color: PAL.white, outline: 2.2, outlineColor: PAL.outline, seed: s + 'lb'
    });
  }};

  // -------------------------------------------------------------- pantry

  P.pantryShelf = { w: 150, d: 26, h: 120, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 150, 26);
    box(ctx, x, y, 150, 26, 120, PAL.woodDk, PAL.wood, s);
    var fy = y + 26 - 120;
    var goods = ['#EFCB6A', '#F2EADA', '#C79A5E', '#FFFFFF', '#D9A863', '#C2413F'];
    for (var r = 0; r < 3; r++) {
      C.line(ctx, x + 4, fy + 36 + r * 30, x + 146, fy + 36 + r * 30, {
        seed: s + 'sh' + r, stroke: PAL.outline, lw: 2.6, wob: 0.9
      });
      for (var b = 0; b < 5; b++) {
        C.roundRect(ctx, x + 12 + b * 27, fy + 14 + r * 30, 19, 22, 3, {
          seed: s + 'j' + r + b, fill: goods[(r * 5 + b) % 6], stroke: PAL.outline,
          lw: 1.8, hatch: 2.6, wash: 0.7, wob: 0.7
        });
      }
    }
  }};

  // ---------------------------------------------------------------- park

  P.bench = { w: 96, d: 32, h: 26, jumpable: true, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 96, 32);
    box(ctx, x, y, 96, 32, 26, PAL.wood, PAL.woodDk, s, { round: 4 });
    C.rect(ctx, x + 2, y - 52, 92, 24, {
      seed: s + 'bk', fill: PAL.wood, stroke: PAL.outline, lw: 2.6, hatch: 3.4, wash: 0.6
    });
    for (var i = 0; i < 3; i++) {
      C.line(ctx, x + 6 + i * 30, y - 50, x + 6 + i * 30, y - 30, {
        seed: s + 'sl' + i, stroke: PAL.woodDk, lw: 2, wob: 0.7, passes: 1
      });
    }
  }};

  // pond is deliberately solid (water!) even though it paints flat (h: 0)
  P.pond = { w: 200, d: 130, h: 0, draw: function (ctx, x, y, s) {
    C.ellipse(ctx, x + 100, y + 65, 100, 65, {
      seed: s, fill: '#5FA8D6', stroke: PAL.outline, lw: 3.4, hatch: 5, wash: 0.6
    });
    C.ellipse(ctx, x + 100, y + 65, 74, 46, {
      seed: s + '2', stroke: '#8FD0EE', lw: 2.4, wob: 1.8, passes: 1
    });
    for (var i = 0; i < 3; i++) {
      C.ellipse(ctx, x + 50 + i * 46, y + 44 + (i % 2) * 30, 15, 10, {
        seed: s + 'lp' + i, fill: PAL.grass, stroke: PAL.outline, lw: 2, hatch: 2.6, wash: 0.7
      });
    }
  }};

  P.lamppost = { w: 18, d: 18, h: 100, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 18, 18);
    C.line(ctx, x + 9, y + 8, x + 9, y - 84, { seed: s + 'p', stroke: '#4A4A52', lw: 6, wob: 0.9 });
    C.ellipse(ctx, x + 9, y - 92, 13, 12, {
      seed: s + 'l', fill: PAL.sun, stroke: PAL.outline, lw: 2.6, hatch: 2.8, wash: 0.8
    });
  }};

  P.swingSet = { w: 120, d: 40, h: 110, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 120, 40);
    C.line(ctx, x + 8, y + 20, x + 30, y - 86, { seed: s + 'a', stroke: '#C2633A', lw: 6, wob: 1 });
    C.line(ctx, x + 112, y + 20, x + 90, y - 86, { seed: s + 'b', stroke: '#C2633A', lw: 6, wob: 1 });
    C.line(ctx, x + 26, y - 88, x + 94, y - 88, { seed: s + 'top', stroke: '#C2633A', lw: 6, wob: 1 });
    for (var i = 0; i < 2; i++) {
      var sx = x + 44 + i * 32;
      C.line(ctx, sx, y - 86, sx, y - 30, { seed: s + 'r' + i, stroke: PAL.outline, lw: 2, wob: 0.6 });
      C.rect(ctx, sx - 12, y - 32, 24, 7, {
        seed: s + 'st' + i, fill: PAL.roof, stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.8
      });
    }
  }};

  // ---------------------------------------------------------------- shop

  P.iceCase = { w: 150, d: 44, h: 56, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 150, 44);
    box(ctx, x, y, 150, 44, 56, '#E4EEF2', PAL.steel, s, { round: 5 });
    var fy = y + 44 - 56;
    C.rect(ctx, x + 8, fy + 8, 134, 26, {
      seed: s + 'gl', fill: PAL.dome, stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.45, fillAlpha: 0.4
    });
    var flav = ['#F3E6C8', '#8A5A3B', '#E88FA8'];
    var names = ['VAN', 'CHOC', 'BERRY'];
    for (var i = 0; i < 3; i++) {
      C.ellipse(ctx, x + 32 + i * 44, fy + 22, 17, 11, {
        seed: s + 'f' + i, fill: flav[i], stroke: PAL.outline, lw: 2, hatch: 2.6, wash: 0.8
      });
      C.text(ctx, names[i], x + 32 + i * 44, fy + 48, {
        size: 9, align: 'center', color: PAL.outline, seed: s + 'fn' + i
      });
    }
  }};

  P.shopCounter = { w: 170, d: 46, h: 50, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 170, 46);
    box(ctx, x, y, 170, 46, 50, '#D9A863', '#B5813F', s, { round: 5 });
    var fy = y + 46 - 50;
    C.rect(ctx, x + 6, fy + 10, 158, 12, {
      seed: s + 'tr', fill: PAL.roof, stroke: PAL.outline, lw: 2, hatch: 2.6, wash: 0.7
    });
    C.text(ctx, 'BOBBYBEAR', x + 85, fy + 40, {
      size: 17, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: s + 'sg'
    });
  }};

  P.shopAwning = { w: 260, d: 20, h: 70, solid: false, draw: function (ctx, x, y, s) {
    for (var i = 0; i < 6; i++) {
      C.poly(ctx, [[x + i * 44, y - 70], [x + (i + 1) * 44, y - 70],
                   [x + (i + 1) * 44 - 6, y], [x + i * 44 + 6, y]], {
        seed: s + 'a' + i, fill: i % 2 ? PAL.roof : PAL.white, stroke: PAL.outline,
        lw: 2.6, hatch: 4, wash: 0.7
      });
    }
  }};

  P.shopTable = { w: 64, d: 64, h: 34, jumpable: true, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 64, 64);
    C.line(ctx, x + 32, y + 32, x + 32, y - 2, { seed: s + 'st', stroke: PAL.outline, lw: 6, wob: 0.8 });
    C.ellipse(ctx, x + 32, y - 4, 34, 22, {
      seed: s, fill: PAL.accent, stroke: PAL.outline, lw: 3, hatch: 3.6, wash: 0.72
    });
    C.ellipse(ctx, x + 32, y - 4, 24, 14, {
      seed: s + 'rim', stroke: PAL.white, lw: 2.2, wob: 1.2, passes: 1, strokeAlpha: 0.8
    });
    // a little sundae glass on top
    C.poly(ctx, [[x + 26, y - 10], [x + 38, y - 10], [x + 34, y - 2], [x + 30, y - 2]], {
      seed: s + 'cup', fill: PAL.white, stroke: PAL.outline, lw: 1.8, hatch: 2.4, wash: 0.85
    });
    C.dot(ctx, x + 32, y - 13, 5, '#E88FA8', s + 'scoop');
  }};

  // ------------------------------------------------------- crystal mountain

  P.crystalSpike = { w: 60, d: 34, h: 120, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 60, 34);
    var cols = ['#5F7FD6', '#8A6FD6', '#5FB5D6'];
    var rnd = W.mulberry32(W.hash(s));
    for (var i = 0; i < 3; i++) {
      var bx = x + 12 + i * 18, h = 60 + rnd() * 62, wdt = 9 + rnd() * 7;
      C.poly(ctx, [[bx - wdt, y + 16], [bx + wdt, y + 16], [bx, y + 16 - h]], {
        seed: s + 'sp' + i, fill: cols[i % 3], stroke: PAL.outline, lw: 2.8, hatch: 3.4, wash: 0.6
      });
      C.line(ctx, bx, y + 16, bx, y + 16 - h, {
        seed: s + 'fc' + i, stroke: PAL.white, lw: 1.8, wob: 0.6, passes: 1, strokeAlpha: 0.7
      });
    }
  }};

  /* A minable boulder — the cracks and rubble are drawn live by its station. */
  P.crackRock = { w: 58, d: 36, h: 42, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 58, 36);
    C.poly(ctx, [[x + 6, y + 18], [x + 2, y - 6], [x + 18, y - 24], [x + 44, y - 20],
                 [x + 56, y + 2], [x + 50, y + 18]], {
      seed: s, fill: '#8E9AA4', stroke: PAL.outline, lw: 3, hatch: 3.6, wash: 0.7
    });
    C.arc(ctx, x + 29, y - 10, 20, Math.PI, Math.PI * 2, {
      seed: s + 'sn', fill: PAL.white, stroke: null, hatch: 3, wash: 0.7
    });
    C.dot(ctx, x + 20, y + 2, 3, '#6E7A82', s + 'sp1');
    C.dot(ctx, x + 38, y - 4, 2.4, '#6E7A82', s + 'sp2');
  }};

  P.snowRock = { w: 70, d: 40, h: 40, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 70, 40);
    C.ellipse(ctx, x + 35, y + 4, 36, 26, {
      seed: s, fill: '#9AA6AE', stroke: PAL.outline, lw: 2.8, hatch: 4, wash: 0.6
    });
    C.arc(ctx, x + 35, y - 2, 32, Math.PI, Math.PI * 2, {
      seed: s + 'sn', fill: PAL.white, stroke: null, hatch: 3.4, wash: 0.85
    });
  }};

  // ------------------------------------------------------------ treehouse

  P.treehouse = { w: 190, d: 70, h: 240, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 190, 70);
    // trunk
    C.rect(ctx, x + 78, y - 90, 34, 160, {
      seed: s + 'tr', fill: PAL.woodDk, stroke: PAL.outline, lw: 3, hatch: 3.6, wash: 0.65
    });
    // leafy crown behind the house
    var rnd = W.mulberry32(W.hash(s));
    for (var i = 0; i < 5; i++) {
      C.ellipse(ctx, x + 95 + (rnd() - 0.5) * 130, y - 150 - rnd() * 40, 42 + rnd() * 16, 32 + rnd() * 12, {
        seed: s + 'lf' + i, fill: i % 2 ? PAL.grass : PAL.grassDk, stroke: PAL.outline,
        lw: 2.8, hatch: 4.2, wash: 0.6
      });
    }
    // the house itself
    C.rect(ctx, x + 22, y - 158, 146, 74, {
      seed: s + 'w', fill: '#D9A863', stroke: PAL.outline, lw: 3.2, hatch: 4.4, wash: 0.6
    });
    C.poly(ctx, [[x + 10, y - 156], [x + 95, y - 210], [x + 180, y - 156]], {
      seed: s + 'rf', fill: PAL.roof, stroke: PAL.outline, lw: 3.2, hatch: 4.2, wash: 0.65
    });
    C.rect(ctx, x + 76, y - 128, 38, 44, {
      seed: s + 'dr', fill: '#8A5F38', stroke: PAL.outline, lw: 2.6, hatch: 3.4, wash: 0.7
    });
    C.rect(ctx, x + 36, y - 142, 30, 26, {
      seed: s + 'wn', fill: PAL.dome, stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.6
    });
    // ladder
    for (var r = 0; r < 6; r++) {
      C.line(ctx, x + 82, y - 78 + r * 14, x + 108, y - 78 + r * 14, {
        seed: s + 'rung' + r, stroke: '#8A5F38', lw: 3, wob: 0.8
      });
    }
    C.text(ctx, 'CLUB', x + 95, y - 168, {
      size: 15, align: 'center', color: PAL.white, outline: 2.6, outlineColor: PAL.outline, seed: s + 'sg'
    });
  }};

  P.telescope = { w: 40, d: 34, h: 66, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 40, 34);
    C.line(ctx, x + 20, y + 12, x + 20, y - 26, { seed: s + 'st', stroke: '#4A4A52', lw: 5, wob: 0.8 });
    C.roundRect(ctx, x - 2, y - 46, 46, 16, 7, {
      seed: s, fill: '#4A6FA8', stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.72, rot: -0.3
    });
    C.dot(ctx, x + 44, y - 44, 6, PAL.dome, s + 'ln');
  }};

  P.beanbag = { w: 56, d: 46, h: 24, jumpable: true, draw: function (ctx, x, y, s, tint) {
    shadow(ctx, x, y, 56, 46);
    C.ellipse(ctx, x + 28, y + 12, 30, 22, {
      seed: s, fill: tint || '#B48FD6', stroke: PAL.outline, lw: 3, hatch: 3.6, wash: 0.68
    });
    C.arc(ctx, x + 28, y + 6, 24, Math.PI, Math.PI * 2, {
      seed: s + 'tp', fill: tint || '#B48FD6', stroke: PAL.outline, lw: 2.6, hatch: 3.4, wash: 0.6
    });
  }};

  P.ropeSwing = { w: 40, d: 30, h: 120, solid: false, draw: function (ctx, x, y, s) {
    C.line(ctx, x + 20, y - 116, x + 20, y - 18, { seed: s + 'rp', stroke: '#B5813F', lw: 3.4, wob: 1.2 });
    C.ellipse(ctx, x + 20, y - 10, 20, 8, {
      seed: s, fill: PAL.wood, stroke: PAL.outline, lw: 2.4, hatch: 2.8, wash: 0.75
    });
  }};

  P.snackStash = { w: 54, d: 34, h: 34, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 54, 34);
    box(ctx, x, y, 54, 34, 34, '#C2633A', '#9E4E2C', s, { round: 4 });
    C.dot(ctx, x + 16, y - 12, 6, PAL.sun, s + 'a');
    C.dot(ctx, x + 36, y - 16, 6, PAL.accent, s + 'b');
  }};

  P.window = { w: 96, d: 18, h: 92, solid: false, draw: function (ctx, x, y, s, tint) {
    var fy = y - 74;
    C.rect(ctx, x, fy, 96, 74, {
      seed: s + 'fr', fill: '#8A5F38', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.7
    });
    C.rect(ctx, x + 7, fy + 7, 82, 60, {
      seed: s + 'sky', fill: PAL.sky, stroke: PAL.outline, lw: 2.4, hatch: 3.4, wash: 0.6
    });
    C.line(ctx, x + 48, fy + 7, x + 48, fy + 67, { seed: s + 'mv', stroke: '#8A5F38', lw: 3, wob: 0.7 });
    C.line(ctx, x + 7, fy + 37, x + 89, fy + 37, { seed: s + 'mh', stroke: '#8A5F38', lw: 3, wob: 0.7 });
    C.ellipse(ctx, x + 26, fy + 22, 12, 7, { seed: s + 'cl', fill: PAL.white, stroke: null, hatch: 2.6, wash: 0.8 });
    // curtains
    for (var c = -1; c <= 1; c += 2) {
      C.poly(ctx, [[x + (c < 0 ? -6 : 90), fy - 4], [x + (c < 0 ? 22 : 118) - 16, fy - 4],
                   [x + (c < 0 ? 26 : 114) - 16, fy + 70], [x + (c < 0 ? -2 : 94) - 4, fy + 70]], {
        seed: s + 'cu' + c, fill: PAL.accent, stroke: PAL.outline, lw: 2.4, hatch: 3.4, wash: 0.65
      });
    }
  }};

  // ------------------------------------------------------------- vehicles

  /* The little car (racer suit). Drawn side-on like the UFO. */
  function paintCar(ctx, t) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = PAL.outline;
    ctx.beginPath(); ctx.ellipse(0, 26, 62, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    C.roundRect(ctx, -62, -18, 124, 34, 12, {
      seed: 'carb', fill: PAL.roof, stroke: PAL.outline, lw: 3.2, hatch: 4, wash: 0.68
    });
    C.roundRect(ctx, -34, -44, 62, 30, 10, {
      seed: 'carc', fill: '#D9604B', stroke: PAL.outline, lw: 3, hatch: 3.6, wash: 0.62
    });
    C.roundRect(ctx, -27, -39, 48, 20, 6, {
      seed: 'carw', fill: PAL.dome, stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.5, fillAlpha: 0.4
    });
    C.line(ctx, -62, -2, 62, -2, { seed: 'carst', stroke: PAL.white, lw: 4, wob: 1, passes: 1 });
    for (var w = -1; w <= 1; w += 2) {
      var wx = w * 38, spin = t * 6;   // both wheels roll the same way
      C.ellipse(ctx, wx, 18, 15, 15, {
        seed: 'cwh' + w, fill: '#3B2A20', stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.8
      });
      C.line(ctx, wx - Math.cos(spin) * 9, 18 - Math.sin(spin) * 9,
                  wx + Math.cos(spin) * 9, 18 + Math.sin(spin) * 9,
        { seed: 'csp' + w, stroke: PAL.steel, lw: 2.4, wob: 0.4, passes: 1 });
    }
    C.dot(ctx, 60, -6, 5, PAL.sun, 'chl');
    ctx.restore();
  }
  W.drawCar = phaseBake(paintCar, 160, 110, 80, 60, 8, Math.PI / 3);

  /* The hot-air balloon (IMG_9599): striped envelope over a wicker basket. */
  function paintBalloon(ctx, t) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = PAL.outline;
    ctx.beginPath(); ctx.ellipse(0, 44, 44, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    var sway = Math.sin(t * 1.6) * 3;
    var cols = [PAL.roof, PAL.sun, '#E8578F', PAL.sun, PAL.roof];
    for (var i = 0; i < 5; i++) {
      var x0 = -60 + i * 24;
      C.poly(ctx, [[x0 + sway * 0.4, -46], [x0 + 24 + sway * 0.4, -46],
                   [x0 + 20, -104], [x0 + 4, -104]], {
        seed: 'bal' + i, fill: cols[i], stroke: null, hatch: 4, wash: 0.72
      });
    }
    C.arc(ctx, sway * 0.4, -46, 60, Math.PI, Math.PI * 2, {
      seed: 'balo', stroke: PAL.outline, lw: 3.4, wob: 1.4
    });
    C.ellipse(ctx, sway * 0.4, -46, 60, 12, { seed: 'balb', stroke: PAL.outline, lw: 3, wob: 1.2, passes: 1 });
    for (var r = -1; r <= 1; r += 2) {
      C.line(ctx, r * 26 + sway * 0.4, -40, r * 20, 6, { seed: 'rope' + r, stroke: '#8A5F38', lw: 2.4, wob: 0.8 });
    }
    C.roundRect(ctx, -22, 4, 44, 34, 5, {
      seed: 'bask', fill: '#C79A5E', stroke: PAL.outline, lw: 3, hatch: 3.2, wash: 0.7
    });
    for (var wv = 0; wv < 3; wv++) {
      C.line(ctx, -22, 12 + wv * 9, 22, 12 + wv * 9, { seed: 'wv' + wv, stroke: '#8A5F38', lw: 1.8, wob: 0.7, passes: 1 });
    }
    ctx.restore();
  }
  W.drawBalloon = phaseBake(paintBalloon, 180, 215, 90, 145, 8, (Math.PI * 2) / 1.6);

  /* The submarine, for the lake. */
  function paintSub(ctx, t) {
    ctx.save();
    C.ellipse(ctx, 0, 0, 68, 30, {
      seed: 'subb', fill: '#E8C34E', stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.7
    });
    C.roundRect(ctx, -14, -46, 30, 22, 7, {
      seed: 'subt', fill: '#D9A83D', stroke: PAL.outline, lw: 3, hatch: 3.2, wash: 0.7
    });
    C.ellipse(ctx, 26, -4, 15, 15, {
      seed: 'subw', fill: PAL.dome, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.5, fillAlpha: 0.45
    });
    C.poly(ctx, [[-62, -6], [-84, -26], [-84, 22], [-62, 8]], {
      seed: 'subf', fill: '#D9A83D', stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.7
    });
    var pr = t * 8;
    for (var b = 0; b < 3; b++) {
      C.ellipse(ctx, -88 - b * 4, -2 + Math.sin(pr + b) * 5, 4, 4, {
        seed: 'bub' + b, stroke: '#CFE9F5', lw: 1.6, wob: 0.4, passes: 1
      });
    }
    ctx.restore();
  }
  W.drawSub = phaseBake(paintSub, 210, 130, 105, 60, 8, (Math.PI * 2) / 8);

  /* The boba cart the mech turns into (IMG_8459). Fully static — one tile. */
  function paintCart(ctx, t) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = PAL.outline;
    ctx.beginPath(); ctx.ellipse(0, 34, 60, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    C.roundRect(ctx, -56, -20, 112, 46, 6, {
      seed: 'cartb', fill: PAL.steel, stroke: PAL.outline, lw: 3.2, hatch: 3.8, wash: 0.68
    });
    // dispensers on top
    for (var i = 0; i < 2; i++) {
      C.roundRect(ctx, -42 + i * 44, -74, 36, 54, 6, {
        seed: 'disp' + i, fill: '#E4EEF2', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.6
      });
      C.roundRect(ctx, -37 + i * 44, -68, 26, 32, 4, {
        seed: 'dtea' + i, fill: i ? PAL.tea : '#C79A5E', stroke: null, hatch: 3, wash: 0.78
      });
      for (var p = 0; p < 4; p++) {
        C.dot(ctx, -32 + i * 44 + (p % 2) * 12, -46 + Math.floor(p / 2) * 9, 3, PAL.pearl, 'cp' + i + p);
      }
    }
    // cup stack
    for (var c = 0; c < 4; c++) {
      C.roundRect(ctx, 40, -40 - c * 8, 18, 12, 3, {
        seed: 'cup' + c, fill: PAL.white, stroke: PAL.outline, lw: 1.8, hatch: 2.4, wash: 0.85
      });
    }
    C.roundRect(ctx, -54, -6, 60, 24, 4, {
      seed: 'sign', fill: PAL.sun, stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.8
    });
    C.text(ctx, 'FRESH BOBA', -24, 10, {
      size: 12, align: 'center', color: PAL.outline, seed: 'fbt'
    });
    for (var w = -1; w <= 1; w += 2) {
      C.ellipse(ctx, w * 36, 28, 14, 14, {
        seed: 'cwh' + w, fill: '#3B2A20', stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.8
      });
      C.dot(ctx, w * 36, 28, 4, PAL.steel, 'chb' + w);
    }
    ctx.restore();
  }
  W.drawCart = phaseBake(paintCart, 176, 165, 88, 105, 1, 1);

  P.car     = { w: 150, d: 66, h: 70, draw: function (ctx, x, y, s) { W.drawCar(ctx, x + 75, y + 33, 1, 0); } };
  P.balloon = { w: 130, d: 60, h: 130, draw: function (ctx, x, y, s) { W.drawBalloon(ctx, x + 65, y + 30, 1, 0); } };

  /* A cosy pup tent for treehouse sleepovers. */
  P.tent = { w: 92, d: 54, h: 66, draw: function (ctx, x, y, s, tint) {
    shadow(ctx, x, y, 92, 54);
    var col = tint || '#E8834E';
    C.poly(ctx, [[x + 4, y + 40], [x + 46, y - 46], [x + 88, y + 40]], {
      seed: s, fill: col, stroke: PAL.outline, lw: 3, hatch: 4, wash: 0.7
    });
    C.poly(ctx, [[x + 30, y + 40], [x + 46, y - 6], [x + 62, y + 40]], {
      seed: s + 'door', fill: '#3B2A20', stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.7
    });
    C.line(ctx, x + 46, y - 46, x + 46, y - 58, { seed: s + 'pole', stroke: PAL.woodDk, lw: 3, wob: 0.7 });
    C.dot(ctx, x + 46, y - 60, 4, PAL.sun, s + 'flag');
  }};

  /* A rolled stripy sleeping bag. */
  P.sleepingBag = { w: 84, d: 40, h: 12, jumpable: true, draw: function (ctx, x, y, s, tint) {
    shadow(ctx, x, y, 84, 40);
    C.roundRect(ctx, x + 2, y - 6, 80, 40, 14, {
      seed: s, fill: tint || '#7FA8D8', stroke: PAL.outline, lw: 2.8, hatch: 3.6, wash: 0.72
    });
    for (var i = 0; i < 3; i++) {
      C.line(ctx, x + 20 + i * 20, y - 4, x + 20 + i * 20, y + 32, {
        seed: s + 'st' + i, stroke: PAL.white, lw: 3, wob: 1, passes: 1, strokeAlpha: 0.7
      });
    }
    C.ellipse(ctx, x + 16, y + 4, 12, 8, {
      seed: s + 'pil', fill: PAL.lid, stroke: PAL.outline, lw: 2, hatch: 2.6, wash: 0.85, fillAlpha: 0.2
    });
  }};

  /* The trash can — one honest Z press and the basket is empty. */
  P.trashCan = { w: 40, d: 30, h: 46, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 40, 30);
    C.poly(ctx, [[x + 4, y - 34], [x + 36, y - 34], [x + 32, y + 18], [x + 8, y + 18]], {
      seed: s, fill: '#7A8A94', stroke: PAL.outline, lw: 2.8, hatch: 3.4, wash: 0.72
    });
    for (var i = 0; i < 3; i++) {
      C.line(ctx, x + 12 + i * 8, y - 30, x + 13 + i * 8, y + 12, {
        seed: s + 'rib' + i, stroke: '#5C6A74', lw: 2, wob: 0.7, passes: 1
      });
    }
    C.roundRect(ctx, x, y - 42, 40, 10, 4, {
      seed: s + 'lid', fill: '#8E9AA4', stroke: PAL.outline, lw: 2.4, hatch: 2.8, wash: 0.8
    });
    C.dot(ctx, x + 20, y - 44, 3.4, '#5C6A74', s + 'kn');
  }};

  /* The adoption box at the park. */
  P.petBox = { w: 60, d: 40, h: 34, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 60, 40);
    box(ctx, x, y, 60, 40, 30, '#C79A5E', '#A5793E', s, { round: 4 });
    C.text(ctx, 'FREE', x + 30, y - 16, {
      size: 12, align: 'center', color: PAL.white, outline: 2.4, outlineColor: PAL.outline, seed: s + 't'
    });
    C.text(ctx, 'FLUFFS', x + 30, y - 4, {
      size: 10, align: 'center', color: PAL.white, outline: 2, outlineColor: PAL.outline, seed: s + 't2'
    });
    // a pup peeking out (until adopted)
    if (W.game && !W.game.state.pet) {
      C.ellipse(ctx, x + 30, y - 34, 11, 9, {
        seed: s + 'pup', fill: '#F2D5A0', stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.8
      });
      C.ellipse(ctx, x + 21, y - 39, 4, 6, {
        seed: s + 'pe1', fill: '#E8A05C', stroke: PAL.outline, lw: 1.6, hatch: 2, wash: 0.8, rot: -0.5
      });
      C.ellipse(ctx, x + 39, y - 39, 4, 6, {
        seed: s + 'pe2', fill: '#E8A05C', stroke: PAL.outline, lw: 1.6, hatch: 2, wash: 0.8, rot: 0.5
      });
      C.dot(ctx, x + 26, y - 35, 1.8, PAL.outline, s + 'fe1');
      C.dot(ctx, x + 34, y - 35, 1.8, PAL.outline, s + 'fe2');
      C.dot(ctx, x + 30, y - 31, 2.2, '#8A5A2B', s + 'fn');
    }
  }};

  /* The pet's basket bed. */
  P.petBed = { w: 56, d: 40, h: 14, jumpable: true, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 56, 40);
    C.ellipse(ctx, x + 28, y + 16, 28, 17, {
      seed: s, fill: '#C79A5E', stroke: '#8A5F38', lw: 3, hatch: 3.2, wash: 0.8
    });
    C.ellipse(ctx, x + 28, y + 16, 19, 11, {
      seed: s + 'cush', fill: PAL.accent, stroke: null, hatch: 2.8, wash: 0.7
    });
  }};

  /* A garden plot — the growth stages are drawn live by its station. */
  P.gardenPlot = { w: 70, d: 48, h: 0, draw: function (ctx, x, y, s) {
    C.roundRect(ctx, x, y, 70, 48, 8, {
      seed: s, fill: '#8A5A2B', stroke: '#5A3A18', lw: 3, hatch: 3.6, wash: 0.8
    });
    for (var i = 0; i < 3; i++) {
      C.line(ctx, x + 8, y + 12 + i * 12, x + 62, y + 12 + i * 12, {
        seed: s + 'row' + i, stroke: '#5A3A18', lw: 2, wob: 1.2, passes: 1, strokeAlpha: 0.6
      });
    }
  }};

  /* The corkboard where today's ideas live. */
  P.ideasBoard = { w: 90, d: 12, h: 88, solid: false, draw: function (ctx, x, y, s) {
    var fy = y - 88;
    C.roundRect(ctx, x, fy, 90, 88, 6, {
      seed: s, fill: '#C79A5E', stroke: '#8A5F38', lw: 4, hatch: 3.6, wash: 0.8
    });
    C.text(ctx, 'IDEAS', x + 45, fy + 18, {
      size: 13, align: 'center', color: '#5A3A10', seed: s + 't'
    });
    for (var i = 0; i < 3; i++) {
      C.line(ctx, x + 12, fy + 34 + i * 16, x + 78, fy + 34 + i * 16, {
        seed: s + 'l' + i, stroke: '#8A5F38', lw: 2, wob: 1, passes: 1, strokeAlpha: 0.6
      });
    }
    C.dot(ctx, x + 14, fy + 10, 3, PAL.roof, s + 'pin1');
    C.dot(ctx, x + 76, fy + 10, 3, PAL.sky, s + 'pin2');
  }};

  /* The recipe poster on the kitchen wall. */
  P.recipePoster = { w: 74, d: 12, h: 84, solid: false, draw: function (ctx, x, y, s) {
    var fy = y - 84;
    C.roundRect(ctx, x, fy, 74, 84, 6, {
      seed: s, fill: PAL.white, stroke: PAL.outline, lw: 2.8, hatch: 4, wash: 0.9, fillAlpha: 0.2
    });
    C.text(ctx, 'RECIPES', x + 37, fy + 18, {
      size: 13, align: 'center', color: PAL.roof, seed: s + 't'
    });
    if (W.drawItem) {
      W.drawItem(ctx, 'pizza', x + 20, fy + 38, 9);
      W.drawItem(ctx, 'bread', x + 52, fy + 38, 9);
      W.drawItem(ctx, 'cake', x + 20, fy + 64, 9);
      W.drawItem(ctx, 'spaghetti', x + 52, fy + 64, 9);
    }
  }};

  /* A chalk circle + sign marking a spot where something can be set up. */
  P.pitchMark = { w: 130, d: 50, h: 0, solid: false, draw: function (ctx, x, y, s, tint) {
    C.ellipse(ctx, x + 65, y + 25, 66, 27, {
      seed: s, stroke: PAL.white, lw: 4, wob: 2.2, passes: 1, strokeAlpha: 0.85
    });
    C.ellipse(ctx, x + 65, y + 25, 52, 19, {
      seed: s + '2', stroke: PAL.white, lw: 2.6, wob: 2, passes: 1, strokeAlpha: 0.6
    });
    C.text(ctx, tint || 'CART SPOT', x + 65, y + 30, {
      size: 15, align: 'center', color: PAL.white,
      outline: 3, outlineColor: PAL.grassDk, seed: s + 't'
    });
  }};

  /* A standing signpost with a label — exits that aren't doors need one. */
  /* The board is the whole footprint — it used to hang off the side of its
   * own sprite canvas, which sliced the border off. */
  P.signpost = { w: 110, d: 20, h: 78, solid: false, draw: function (ctx, x, y, s, tint) {
    C.line(ctx, x + 55, y + 12, x - 0 + 55, y - 40, { seed: s + 'p', stroke: PAL.woodDk, lw: 6, wob: 1 });
    C.roundRect(ctx, x + 2, y - 74, 106, 34, 6, {
      seed: s + 'b', fill: PAL.wood, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.75
    });
    C.text(ctx, tint || 'THIS WAY', x + 55, y - 51, {
      size: 14, align: 'center', color: PAL.outline, seed: s + 't'
    });
  }};

  /* A chalk outline marking somewhere a Builder could build something. */
  P.buildSpot = { w: 120, d: 56, h: 0, solid: false, draw: function (ctx, x, y, s, tint) {
    C.roundRect(ctx, x, y, 120, 56, 10, {
      seed: s + 'sp', stroke: PAL.white, lw: 3.4, wob: 2.4, passes: 1, strokeAlpha: 0.8
    });
    for (var i = 0; i < 4; i++) {
      C.dot(ctx, x + 10 + (i % 2) * 100, y + 8 + Math.floor(i / 2) * 40, 4, PAL.white, s + 'c' + i);
    }
    C.text(ctx, tint || 'BUILD HERE', x + 60, y + 34, {
      size: 13, align: 'center', color: PAL.white,
      outline: 3, outlineColor: PAL.outline, seed: s + 't'
    });
  }};

  // ------------------------------------------------------- the campsite

  /* A ring of stones with logs laid in it. The flames are drawn by the
   * station, so the fire can be out or lit without a rebake. */
  P.firepit = { w: 90, d: 60, h: 0, draw: function (ctx, x, y, s) {
    C.ellipse(ctx, x + 45, y + 30, 46, 30, {
      seed: s + 'ash', fill: '#6B6157', stroke: null, hatch: 4, wash: 0.6, fillAlpha: 0.5
    });
    for (var i = 0; i < 9; i++) {
      var a = (i / 9) * Math.PI * 2;
      C.ellipse(ctx, x + 45 + Math.cos(a) * 44, y + 30 + Math.sin(a) * 28, 11, 9, {
        seed: s + 'st' + i, fill: i % 2 ? '#B9C3C9' : '#9AA4AA', stroke: PAL.outline,
        lw: 2.4, hatch: 2.8, wash: 0.8
      });
    }
    C.line(ctx, x + 20, y + 38, x + 68, y + 22, { seed: s + 'lg1', stroke: PAL.woodDk, lw: 9, wob: 1 });
    C.line(ctx, x + 22, y + 22, x + 70, y + 38, { seed: s + 'lg2', stroke: '#8A5F38', lw: 9, wob: 1 });
  }};

  /* A heap of marshmallow sticks by the fire. */
  P.stickPile = { w: 60, d: 34, h: 40, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 60, 34);
    for (var i = 0; i < 5; i++) {
      C.line(ctx, x + 6 + i * 4, y + 16, x + 34 + i * 5, y - 34 + i * 6, {
        seed: s + 'sk' + i, stroke: i % 2 ? '#8A5F38' : PAL.woodDk, lw: 4, wob: 1.2
      });
    }
    C.roundRect(ctx, x + 2, y + 6, 40, 16, 5, {
      seed: s + 'bk', fill: PAL.wood, stroke: PAL.woodDk, lw: 2.6, hatch: 3, wash: 0.8
    });
  }};

  /* A log to sit on while the marshmallows toast. */
  P.campLog = { w: 110, d: 40, h: 30, jumpable: true, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 110, 40);
    C.roundRect(ctx, x, y - 30, 110, 40, 16, {
      seed: s + 'lg', fill: '#A9784E', stroke: PAL.woodDk, lw: 3.2, hatch: 3.6, wash: 0.8
    });
    C.ellipse(ctx, x + 6, y - 10, 9, 18, {
      seed: s + 'end', fill: '#C9A882', stroke: PAL.woodDk, lw: 2.6, hatch: 3, wash: 0.8
    });
    for (var r = 0; r < 3; r++) {
      C.arc(ctx, x + 6, y - 10, 4 + r * 4, 0, Math.PI * 2, {
        seed: s + 'rg' + r, stroke: '#8A5F38', lw: 1.6, wob: 0.8, passes: 1, strokeAlpha: 0.6
      });
    }
  }};

  // ------------------------------------------------------- the building site

  /* Four machines, each one a stage of the build. Chunky crayon vehicles —
   * a five-year-old should know what each one does on sight. */
  function tracks(ctx, x, y, w, s) {
    C.roundRect(ctx, x, y - 22, w, 24, 11, {
      seed: s + 'tk', fill: '#3B2A20', stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.8
    });
    for (var i = 0; i < 4; i++) {
      C.dot(ctx, x + 14 + i * ((w - 28) / 3), y - 10, 6, PAL.steel, s + 'rl' + i);
    }
  }

  P.bulldozer = { w: 130, d: 46, h: 92, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 130, 46);
    tracks(ctx, x + 14, y, 104, s);
    C.roundRect(ctx, x + 30, y - 62, 74, 42, 8, {
      seed: s + 'bd', fill: '#F2C14E', stroke: PAL.outline, lw: 3.2, hatch: 3.6, wash: 0.75
    });
    C.roundRect(ctx, x + 46, y - 90, 44, 30, 6, {
      seed: s + 'cb', fill: '#E8B23D', stroke: PAL.outline, lw: 3, hatch: 3.2, wash: 0.7
    });
    C.roundRect(ctx, x + 52, y - 85, 32, 18, 4, {
      seed: s + 'gl', fill: PAL.dome, stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.5, fillAlpha: 0.4
    });
    // the blade
    C.poly(ctx, [[x, y - 44], [x + 26, y - 40], [x + 26, y + 2], [x, y + 6]], {
      seed: s + 'bl', fill: PAL.steel, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.78
    });
  }};

  P.mixer = { w: 132, d: 46, h: 96, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 132, 46);
    C.roundRect(ctx, x + 10, y - 34, 112, 24, 8, {
      seed: s + 'ch', fill: '#5FA8D6', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.75
    });
    for (var w = 0; w < 3; w++) {
      C.ellipse(ctx, x + 24 + w * 42, y - 6, 14, 14, {
        seed: s + 'wh' + w, fill: '#3B2A20', stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.8
      });
    }
    C.roundRect(ctx, x + 8, y - 64, 40, 32, 6, {
      seed: s + 'cab', fill: '#4A8FC4', stroke: PAL.outline, lw: 3, hatch: 3.2, wash: 0.7
    });
    // the drum, on its slant
    C.ellipse(ctx, x + 88, y - 62, 34, 28, {
      seed: s + 'dr', fill: PAL.steel, stroke: PAL.outline, lw: 3.2, hatch: 3.6, wash: 0.78
    });
    for (var b = 0; b < 3; b++) {
      C.arc(ctx, x + 88, y - 62, 22 - b * 6, Math.PI * 0.9, Math.PI * 1.7, {
        seed: s + 'st' + b, stroke: '#8FA0A8', lw: 2.6, wob: 1, passes: 1
      });
    }
  }};

  P.crane = { w: 150, d: 50, h: 210, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 150, 50);
    tracks(ctx, x + 20, y, 100, s);
    C.roundRect(ctx, x + 34, y - 62, 72, 42, 8, {
      seed: s + 'cb', fill: '#E8834E', stroke: PAL.outline, lw: 3.2, hatch: 3.6, wash: 0.75
    });
    // lattice mast
    C.line(ctx, x + 60, y - 60, x + 60, y - 196, { seed: s + 'm1', stroke: '#C2633A', lw: 6, wob: 1 });
    C.line(ctx, x + 88, y - 60, x + 88, y - 196, { seed: s + 'm2', stroke: '#C2633A', lw: 6, wob: 1 });
    for (var r = 0; r < 6; r++) {
      C.line(ctx, x + 60, y - 70 - r * 22, x + 88, y - 92 - r * 22, {
        seed: s + 'x' + r, stroke: '#C2633A', lw: 3, wob: 0.8, passes: 1
      });
    }
    // jib and hook
    C.line(ctx, x + 74, y - 196, x + 146, y - 176, { seed: s + 'jb', stroke: '#C2633A', lw: 6, wob: 1 });
    C.line(ctx, x + 138, y - 178, x + 138, y - 126, { seed: s + 'cl', stroke: PAL.outline, lw: 2.4, wob: 0.8 });
    C.arc(ctx, x + 138, y - 118, 9, Math.PI * 0.1, Math.PI * 1.2, {
      seed: s + 'hk', stroke: PAL.steel, lw: 4, wob: 0.8
    });
  }};

  P.toolbox = { w: 84, d: 40, h: 62, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 84, 40);
    var top = y - 62;
    C.roundRect(ctx, x, top + 18, 84, 44, 7, {
      seed: s + 'bx', fill: '#D9402F', stroke: PAL.outline, lw: 3.2, hatch: 3.6, wash: 0.75
    });
    C.line(ctx, x + 4, top + 34, x + 80, top + 34, { seed: s + 'ln', stroke: PAL.outline, lw: 2.4, wob: 0.9 });
    C.arc(ctx, x + 42, top + 18, 22, Math.PI, Math.PI * 2, {
      seed: s + 'hd', stroke: PAL.outline, lw: 4, wob: 1
    });
    // a saw and a hammer poking out
    C.line(ctx, x + 16, top + 18, x + 10, top - 2, { seed: s + 'hm', stroke: PAL.woodDk, lw: 5, wob: 0.8 });
    C.rect(ctx, x + 2, top - 10, 20, 10, {
      seed: s + 'hh', fill: PAL.steel, stroke: PAL.outline, lw: 2.2, hatch: 2.4, wash: 0.85
    });
    C.poly(ctx, [[x + 58, top + 16], [x + 80, top - 8], [x + 84, top + 2], [x + 66, top + 18]], {
      seed: s + 'sw', fill: '#B9C3C9', stroke: PAL.outline, lw: 2.4, hatch: 2.6, wash: 0.85
    });
  }};

  /* The wrecking ball, parked and waiting for a finished house. */
  P.wreckingBall = { w: 120, d: 46, h: 190, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 120, 46);
    tracks(ctx, x + 10, y, 90, s);
    C.roundRect(ctx, x + 20, y - 58, 64, 38, 8, {
      seed: s + 'cb', fill: '#B48FD6', stroke: PAL.outline, lw: 3.2, hatch: 3.6, wash: 0.75
    });
    C.line(ctx, x + 52, y - 56, x + 108, y - 172, { seed: s + 'arm', stroke: '#8A6FB0', lw: 8, wob: 1 });
    C.line(ctx, x + 106, y - 168, x + 106, y - 108, { seed: s + 'ch', stroke: PAL.outline, lw: 2.6, wob: 1 });
    C.ellipse(ctx, x + 106, y - 88, 22, 22, {
      seed: s + 'bl', fill: '#5A4A3E', stroke: PAL.outline, lw: 3.4, hatch: 3.4, wash: 0.82
    });
  }};

  /* The friends' house, one stage at a time. */
  function siteHouse(stage) {
    return { w: 220, d: 80, h: stage >= 3 ? 210 : (stage >= 2 ? 150 : (stage >= 1 ? 120 : 16)),
      solid: stage >= 2,
      draw: function (ctx, x, y, s) {
        shadow(ctx, x, y, 220, 80);
        if (stage === 0) {                     // a cleared, pegged-out lot
          C.roundRect(ctx, x, y - 10, 220, 76, 6, {
            seed: s + 'lot', fill: '#C9A882', stroke: '#8A5F38', lw: 2.6, hatch: 4, wash: 0.5, fillAlpha: 0.5
          });
          for (var p = 0; p < 4; p++) {
            var px = x + 10 + (p % 2) * 196, py = y - 4 + Math.floor(p / 2) * 62;
            C.line(ctx, px, py + 10, px, py - 14, { seed: s + 'pg' + p, stroke: PAL.woodDk, lw: 4, wob: 0.8 });
          }
          return;
        }
        if (stage === 1) {                     // slab poured
          C.rect(ctx, x, y - 30, 220, 96, {
            seed: s + 'slab', fill: '#C4BCAE', stroke: PAL.outline, lw: 3, hatch: 4, wash: 0.7
          });
          C.line(ctx, x + 110, y - 30, x + 110, y + 66, {
            seed: s + 'jt', stroke: '#9C948A', lw: 2.4, wob: 1, passes: 1
          });
          return;
        }
        // a thin foundation once there are walls on it, not a grey slab
        C.rect(ctx, x + 4, y - 30, 212, 52, {
          seed: s + 'slab', fill: '#C4BCAE', stroke: PAL.outline, lw: 3, hatch: 4, wash: 0.7
        });
        if (stage === 2) {                     // walls up, no roof
          C.rect(ctx, x + 8, y - 150, 204, 122, {
            seed: s + 'wl', fill: PAL.wood, stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.72
          });
          for (var b = 0; b < 5; b++) {
            C.line(ctx, x + 8, y - 140 + b * 24, x + 212, y - 140 + b * 24, {
              seed: s + 'br' + b, stroke: PAL.woodDk, lw: 2, wob: 1.2, passes: 1, strokeAlpha: 0.55
            });
          }
          return;
        }
        // finished: walls, roof, door, windows, a little chimney
        C.rect(ctx, x + 8, y - 150, 204, 122, {
          seed: s + 'wl', fill: PAL.wood, stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.72
        });
        C.poly(ctx, [[x - 6, y - 148], [x + 110, y - 210], [x + 226, y - 148]], {
          seed: s + 'rf', fill: PAL.roof, stroke: PAL.outline, lw: 3.6, hatch: 4, wash: 0.75
        });
        C.rect(ctx, x + 92, y - 96, 44, 68, {
          seed: s + 'dr', fill: PAL.woodDk, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
        });
        C.dot(ctx, x + 128, y - 62, 4, PAL.sun, s + 'kn');
        for (var w2 = 0; w2 < 2; w2++) {
          C.rect(ctx, x + 26 + w2 * 130, y - 124, 46, 40, {
            seed: s + 'wn' + w2, fill: PAL.dome, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.6
          });
        }
        C.rect(ctx, x + 170, y - 214, 24, 40, {
          seed: s + 'cm', fill: PAL.roof, stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.8
        });
        C.text(ctx, 'PANDA & YUNA', x + 110, y - 44, {
          size: 12, align: 'center', color: PAL.white, outline: 2.4, seed: s + 'nm'
        });
      }
    };
  }
  P.houseS0 = siteHouse(0);
  P.houseS1 = siteHouse(1);
  P.houseS2 = siteHouse(2);
  P.houseS3 = siteHouse(3);

  /* What is left after the wrecking ball has had its fun. */
  P.rubble = { w: 200, d: 70, h: 0, draw: function (ctx, x, y, s) {
    for (var i = 0; i < 14; i++) {
      var rx = x + 10 + (i * 37) % 180, ry = y + 6 + (i * 23) % 56;
      C.rect(ctx, rx, ry, 16 + (i % 3) * 6, 10, {
        seed: s + 'rb' + i, fill: i % 2 ? '#C4BCAE' : PAL.wood, stroke: PAL.outline,
        lw: 2, hatch: 2.6, wash: 0.75
      });
    }
  }};

  // ------------------------------------------------------- the park build

  /* The swing set as Bobby finds it: one A-frame down, seats in the dirt. */
  P.swingBroken = { w: 120, d: 40, h: 110, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 120, 40);
    C.line(ctx, x + 8, y + 20, x + 30, y - 86, { seed: s + 'a', stroke: '#C2633A', lw: 6, wob: 1 });
    // the far leg has given way, so the top bar hangs down
    C.line(ctx, x + 112, y + 22, x + 104, y - 20, { seed: s + 'b', stroke: '#C2633A', lw: 6, wob: 1.6 });
    C.line(ctx, x + 28, y - 86, x + 100, y - 24, { seed: s + 'top', stroke: '#C2633A', lw: 6, wob: 1.4 });
    // seats on the ground
    C.rect(ctx, x + 34, y + 4, 24, 7, {
      seed: s + 'st0', fill: PAL.roof, stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.8
    });
    C.rect(ctx, x + 70, y + 14, 24, 7, {
      seed: s + 'st1', fill: PAL.roof, stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.8
    });
    // hazard tape
    for (var t = 0; t < 3; t++) {
      C.line(ctx, x - 4, y - 46 + t * 6, x + 124, y - 26 + t * 6, {
        seed: s + 'tp' + t, stroke: t % 2 ? PAL.outline : '#F2C14E', lw: 5, wob: 2, passes: 1
      });
    }
  }};

  /* A see-saw: one plank, one fulcrum, two friends. */
  P.seesaw = { w: 140, d: 44, h: 56, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 140, 44);
    C.poly(ctx, [[x + 56, y - 4], [x + 84, y - 4], [x + 70, y - 40]], {
      seed: s + 'ful', fill: '#C2633A', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.78
    });
    C.roundRect(ctx, x + 2, y - 50, 136, 14, 6, {
      seed: s + 'pl', fill: PAL.wood, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
    });
    for (var e = 0; e < 2; e++) {
      var hx = x + 16 + e * 106;
      C.arc(ctx, hx, y - 50, 10, Math.PI, Math.PI * 2, {
        seed: s + 'hd' + e, stroke: PAL.outline, lw: 3.4, wob: 0.8
      });
    }
  }};

  /* A snug den for the pom-poms, with three little doorways. */
  P.critterBox = { w: 96, d: 44, h: 74, draw: function (ctx, x, y, s) {
    shadow(ctx, x, y, 96, 44);
    var top = y - 74;
    C.roundRect(ctx, x, top, 96, 74, 8, {
      seed: s + 'bx', fill: PAL.wood, stroke: PAL.woodDk, lw: 3.2, hatch: 3.6, wash: 0.8
    });
    C.roundRect(ctx, x - 6, top - 12, 108, 16, 5, {
      seed: s + 'lid', fill: PAL.woodDk, stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.8
    });
    for (var d = 0; d < 3; d++) {
      C.arc(ctx, x + 22 + d * 26, top + 60, 12, Math.PI, Math.PI * 2, {
        seed: s + 'dr' + d, fill: '#3B2A20', stroke: PAL.outline, lw: 2.4, hatch: 2.6, wash: 0.7
      });
    }
    // a blanket spilling over the front
    C.roundRect(ctx, x + 8, top + 16, 80, 26, 8, {
      seed: s + 'bl', fill: '#E8A0B4', stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.7
    });
    C.text(ctx, 'CRITTERS', x + 48, top + 8, {
      size: 11, align: 'center', color: PAL.white, outline: 2, seed: s + 't'
    });
  }};

  // ------------------------------------------------------- the backyard

  /* A run of white pickets. Solid, so the yard has a real edge. */
  P.fence = { w: 96, d: 14, h: 54, draw: function (ctx, x, y, s) {
    var top = y - 54;
    for (var i = 0; i < 4; i++) {
      var px = x + 4 + i * 23;
      C.poly(ctx, [[px, top + 10], [px + 11, top], [px + 22, top + 10],
                   [px + 22, top + 54], [px, top + 54]], {
        seed: s + 'pk' + i, fill: PAL.white, stroke: PAL.outline,
        lw: 2.4, hatch: 4, wash: 0.85, fillAlpha: 0.35
      });
    }
    for (var r = 0; r < 2; r++) {
      C.line(ctx, x, top + 20 + r * 20, x + 96, top + 20 + r * 20, {
        seed: s + 'rl' + r, stroke: PAL.outline, lw: 3, wob: 1, passes: 1, strokeAlpha: 0.7
      });
    }
  }};

  /* The garden tap on the back wall: fill the watering can here. */
  P.spigot = { w: 46, d: 26, h: 56, draw: function (ctx, x, y, s) {
    var top = y - 56;
    C.rect(ctx, x + 6, top + 14, 34, 40, {
      seed: s + 'bk', fill: '#C4BCAE', stroke: PAL.outline, lw: 2.6, hatch: 3.4, wash: 0.8
    });
    C.line(ctx, x + 23, top + 26, x + 23, top + 6, { seed: s + 'p', stroke: '#8FA0A8', lw: 6, wob: 0.7 });
    C.line(ctx, x + 23, top + 10, x + 40, top + 10, { seed: s + 'sp', stroke: '#8FA0A8', lw: 6, wob: 0.7 });
    C.dot(ctx, x + 23, top + 3, 6, '#D9402F', s + 'hd');
    C.dot(ctx, x + 41, top + 20, 3.4, '#8FD0EE', s + 'dr');
    C.ellipse(ctx, x + 23, y + 8, 22, 9, {
      seed: s + 'pd', fill: '#8FD0EE', stroke: null, hatch: 3, wash: 0.5, fillAlpha: 0.5
    });
  }};

  /* Where the garden tools live when Bobby isn't using them. */
  P.toolRack = { w: 74, d: 20, h: 78, draw: function (ctx, x, y, s) {
    var top = y - 78;
    C.rect(ctx, x, top + 46, 74, 30, {
      seed: s + 'bx', fill: PAL.wood, stroke: PAL.woodDk, lw: 3, hatch: 3.6, wash: 0.8
    });
    C.line(ctx, x + 4, top + 46, x + 4, top, { seed: s + 'p1', stroke: PAL.woodDk, lw: 4, wob: 0.8 });
    C.line(ctx, x + 70, top + 46, x + 70, top, { seed: s + 'p2', stroke: PAL.woodDk, lw: 4, wob: 0.8 });
    C.line(ctx, x + 4, top + 8, x + 70, top + 8, { seed: s + 'bar', stroke: PAL.woodDk, lw: 4, wob: 0.8 });
    // a hoe and a can hanging up, so the rack reads at a glance
    C.line(ctx, x + 22, top + 8, x + 18, top + 42, { seed: s + 'hs', stroke: '#8A5F38', lw: 4, wob: 0.7 });
    C.rect(ctx, x + 10, top + 40, 18, 7, {
      seed: s + 'hb', fill: '#B9C3C9', stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.85
    });
    C.roundRect(ctx, x + 42, top + 18, 24, 20, 4, {
      seed: s + 'cn', fill: '#5FBFD6', stroke: PAL.outline, lw: 2.2, hatch: 2.8, wash: 0.8
    });
    C.line(ctx, x + 64, top + 24, x + 72, top + 16, { seed: s + 'cs', stroke: '#5FBFD6', lw: 3, wob: 0.6 });
  }};

  /* Rough, unturned sod — a garden plot before the hoe gets to it. */
  P.sodPatch = { w: 70, d: 48, h: 0, draw: function (ctx, x, y, s) {
    C.roundRect(ctx, x, y, 70, 48, 10, {
      seed: s, fill: PAL.grassDk, stroke: '#4E7A3A', lw: 2.6, hatch: 3.4, wash: 0.55, fillAlpha: 0.5
    });
    for (var i = 0; i < 7; i++) {
      var gx = x + 8 + (i * 13) % 58, gy = y + 10 + (i * 17) % 30;
      C.line(ctx, gx, gy, gx + 2, gy - 7, {
        seed: s + 'tuft' + i, stroke: PAL.grassDk, lw: 2, wob: 1, passes: 1
      });
    }
  }};

  /* A hanging aisle board. The tint carries the words. */
  P.aisleSign = { w: 120, d: 10, h: 96, solid: false, draw: function (ctx, x, y, s, tint) {
    var top = y - 96;
    C.line(ctx, x + 24, top, x + 24, top + 22, { seed: s + 'w1', stroke: PAL.outline, lw: 2.2, wob: 0.8 });
    C.line(ctx, x + 96, top, x + 96, top + 22, { seed: s + 'w2', stroke: PAL.outline, lw: 2.2, wob: 0.8 });
    C.roundRect(ctx, x, top + 20, 120, 40, 6, {
      seed: s + 'bd', fill: PAL.white, stroke: PAL.outline, lw: 3, hatch: 4, wash: 0.9, fillAlpha: 0.25
    });
    C.text(ctx, tint || 'AISLE', x + 60, top + 46, {
      size: 15, align: 'center', color: PAL.roof, seed: s + 't'
    });
  }};

  // ------------------------------------------------------- treehouse bits

  /* A real branch, poking up through the treehouse floor. */
  P.branch = { w: 120, d: 34, h: 96, draw: function (ctx, x, y, s) {
    C.line(ctx, x + 8, y + 20, x + 108, y - 76, {
      seed: s + 'b', stroke: PAL.woodDk, lw: 15, wob: 1.4
    });
    C.line(ctx, x + 62, y - 32, x + 104, y - 20, {
      seed: s + 'b2', stroke: PAL.woodDk, lw: 9, wob: 1.2
    });
    for (var i = 0; i < 6; i++) {
      var lx = x + 40 + i * 13, ly = y - 18 - i * 10;
      C.ellipse(ctx, lx, ly, 13, 9, {
        seed: s + 'lf' + i, fill: i % 2 ? PAL.grass : PAL.grassDk, stroke: PAL.outline,
        lw: 2, hatch: 3, wash: 0.8
      });
    }
  }};

  /* A knot-hole window: round, ringed with bark. */
  P.roundWindow = { w: 84, d: 10, h: 84, solid: false, draw: function (ctx, x, y, s) {
    var cx = x + 42, cy = y - 46;
    C.ellipse(ctx, cx, cy, 40, 40, {
      seed: s + 'rim', fill: PAL.woodDk, stroke: PAL.outline, lw: 3.4, hatch: 3.6, wash: 0.8
    });
    C.ellipse(ctx, cx, cy, 30, 30, {
      seed: s + 'sky', fill: PAL.sky, stroke: PAL.outline, lw: 2.4, hatch: 3.4, wash: 0.7
    });
    C.ellipse(ctx, cx - 8, cy + 6, 12, 7, {
      seed: s + 'cl', fill: PAL.white, stroke: null, hatch: 2.6, wash: 0.9, fillAlpha: 0.5
    });
    C.arc(ctx, cx, cy, 34, Math.PI * 1.1, Math.PI * 1.5, {
      seed: s + 'bk', stroke: '#6B4A2A', lw: 3, wob: 1.4, passes: 1
    });
  }};

  /* A rope rail along the open side of the treehouse deck. */
  P.ropeRail = { w: 150, d: 12, h: 46, solid: false, draw: function (ctx, x, y, s) {
    var top = y - 46;
    for (var i = 0; i < 3; i++) {
      var px = x + 6 + i * 68;
      C.line(ctx, px, y, px, top, { seed: s + 'po' + i, stroke: PAL.woodDk, lw: 7, wob: 0.9 });
      C.dot(ctx, px, top - 2, 5, PAL.wood, s + 'kn' + i);
    }
    for (var r = 0; r < 2; r++) {
      var ry = top + 6 + r * 18;
      C.arc(ctx, x + 40, ry, 36, Math.PI * 1.15, Math.PI * 1.85, {
        seed: s + 'r' + r, stroke: '#C9A882', lw: 4, wob: 1.6, passes: 1
      });
      C.arc(ctx, x + 108, ry, 36, Math.PI * 1.15, Math.PI * 1.85, {
        seed: s + 'r2' + r, stroke: '#C9A882', lw: 4, wob: 1.6, passes: 1
      });
    }
  }};

  /* A hanging lantern — the treehouse's own little light. */
  P.lantern = { w: 40, d: 16, h: 96, solid: false, draw: function (ctx, x, y, s) {
    var top = y - 96;
    C.line(ctx, x + 20, top, x + 20, top + 26, { seed: s + 'ch', stroke: PAL.outline, lw: 2.2, wob: 0.8 });
    C.roundRect(ctx, x + 4, top + 26, 32, 40, 6, {
      seed: s + 'bd', fill: '#F2C14E', stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.75
    });
    C.dot(ctx, x + 20, top + 46, 8, '#FBE29A', s + 'gl');
    C.line(ctx, x + 4, top + 30, x + 36, top + 30, { seed: s + 'tp', stroke: PAL.outline, lw: 2.4, wob: 0.7 });
    C.line(ctx, x + 4, top + 62, x + 36, top + 62, { seed: s + 'bt', stroke: PAL.outline, lw: 2.4, wob: 0.7 });
  }};

  /* Little triangle flags strung across the treehouse. */
  P.bunting = { w: 220, d: 8, h: 46, solid: false, draw: function (ctx, x, y, s) {
    var top = y - 46;
    var cols = ['#E8A0B4', '#F2C14E', '#7FBFA8', '#B48FD6', '#5FA8D6'];
    C.arc(ctx, x + 110, top - 22, 118, Math.PI * 0.18, Math.PI * 0.82, {
      seed: s + 'str', stroke: PAL.outline, lw: 2.4, wob: 1.4, passes: 1
    });
    for (var i = 0; i < 6; i++) {
      var fx = x + 16 + i * 38;
      var dip = Math.sin((i / 5) * Math.PI) * 12;
      C.poly(ctx, [[fx, top + dip], [fx + 24, top + dip], [fx + 12, top + dip + 26]], {
        seed: s + 'fl' + i, fill: cols[i % cols.length], stroke: PAL.outline,
        lw: 2.2, hatch: 3, wash: 0.8
      });
    }
  }};

  // ------------------------------------------------------- sprite baking

  var PAD = 18;

  W.PROPS = P;

  // Bake one prop into its own canvas. Returns the sprite plus the baseline
  // y used for depth sorting against Bobby.
  W.makePropSprite = function (p) {
    var def = P[p.kind];
    if (!def) throw new Error('unknown prop kind: ' + p.kind);
    var w = def.w, d = def.d, h = def.h;
    var ox = p.x - PAD;
    var oy = p.y - h - PAD - 34;              // headroom for tall bits
    var cw = w + PAD * 2;
    var ch = h + d + PAD * 2 + 34;
    var cv = C.offscreen(Math.ceil(cw), Math.ceil(ch));
    var ctx = cv.getContext('2d');
    ctx.translate(-ox, -oy);
    def.draw(ctx, p.x, p.y, 'prop' + p.kind + p.x + '_' + p.y, p.tint);
    return { img: cv, ox: ox, oy: oy, baseY: p.y + d };
  };

  W.propFootprint = function (p) {
    var def = P[p.kind];
    if (def.solid === false) return null;
    return { x: p.x, y: p.y, w: def.w, h: def.d, jumpable: !!def.jumpable };
  };
})(window.W);
