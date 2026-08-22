/* Warmland — the crayon renderer.
 *
 * This is the load-bearing file: the whole game is drawn with these few
 * primitives, so the art style lives or dies here. Two rules:
 *
 *   1. Jitter is seeded, never Math.random(). Same shape -> same wobble.
 *   2. These strokes are expensive. Static scenery gets pre-rendered once
 *      to an offscreen canvas; only Bobby and effects are drawn live.
 */
(function (W) {
  'use strict';

  var PAL = {
    paper:    '#F6EEDC',
    paperDim: '#EADFC6',
    outline:  '#3B2A20',
    fur:      '#A97B4F',
    furDark:  '#8A5F38',
    lid:      '#FFFDF6',
    milk:     '#E9D6AE',
    tea:      '#D9A863',
    pearl:    '#8A5A2B',
    roof:     '#C2402F',
    grass:    '#6FA84B',
    grassDk:  '#4E7F33',
    sky:      '#7EC8E3',
    night:    '#22315E',
    dome:     '#8FD8E8',
    accent:   '#E8A0B4',
    wood:     '#C99A62',
    woodDk:   '#A8763F',
    white:    '#FFFDF6',
    steel:    '#B9C3C9',
    sun:      '#F2C14E'
  };
  W.PAL = PAL;

  // ---------------------------------------------------------------- geometry

  // Densify a polyline so the jitter has enough points to bite on.
  function subdivide(pts, step, closed) {
    var out = [];
    var n = pts.length;
    var last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len = Math.hypot(dx, dy);
      var segs = Math.max(1, Math.round(len / step));
      for (var s = 0; s < segs; s++) {
        var t = s / segs;
        out.push([a[0] + dx * t, a[1] + dy * t]);
      }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }

  // Push every point off its true position a little. This is the wobble.
  function rough(pts, rnd, wob) {
    var out = new Array(pts.length);
    for (var i = 0; i < pts.length; i++) {
      out[i] = [
        pts[i][0] + (rnd() - 0.5) * wob * 2,
        pts[i][1] + (rnd() - 0.5) * wob * 2
      ];
    }
    return out;
  }

  function trace(ctx, pts, closed) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
  }

  function bbox(pts) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (p[0] < x0) x0 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[0] > x1) x1 = p[0];
      if (p[1] > y1) y1 = p[1];
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }

  // ------------------------------------------------------------------- fills

  // Crayon fill: a thin wash of colour, then hatch strokes raked across it at
  // an angle so the paper still shows through between the strokes.
  function hatchInto(ctx, pts, color, seed, o) {
    var rnd = W.mulberry32(seed ^ 0x9e37);
    var box = bbox(pts);
    if (box.w <= 0 || box.h <= 0) return;

    var gap = o.hatch || 4.2;
    var ang = o.hatchAngle == null ? -0.62 : o.hatchAngle;
    var wash = o.wash == null ? 0.42 : o.wash;
    var alpha = o.fillAlpha == null ? 0.5 : o.fillAlpha;

    ctx.save();
    trace(ctx, pts, true);
    ctx.clip();

    if (wash > 0) {
      ctx.globalAlpha = wash;
      ctx.fillStyle = color;
      ctx.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
    }

    ctx.translate(box.cx, box.cy);
    ctx.rotate(ang);
    // Hatch only the shape's true extent in the rotated frame. Sweeping the
    // full half-diagonal in both axes (the old code) wasted 25-45% of every
    // hatch fill in the game on strokes that were entirely clipped away.
    var ca = Math.abs(Math.cos(ang)), sa = Math.abs(Math.sin(ang));
    var Rx = (box.w * ca + box.h * sa) / 2 + 6;
    var Ry = (box.w * sa + box.h * ca) / 2 + 6;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    for (var y = -Ry; y <= Ry; y += gap) {
      ctx.globalAlpha = alpha * (0.55 + rnd() * 0.65);
      ctx.lineWidth = 1.1 + rnd() * 1.5;
      ctx.beginPath();
      var steps = 7;
      for (var i = 0; i <= steps; i++) {
        var x = -Rx + (2 * Rx * i) / steps;
        var yy = y + (rnd() - 0.5) * 1.7;
        if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ----------------------------------------------------------------- strokes

  function strokeRough(ctx, pts, seed, o, closed) {
    var color = o.stroke || PAL.outline;
    var lw = o.lw == null ? 3 : o.lw;
    var passes = o.passes == null ? 2 : o.passes;
    var wob = o.wob == null ? 1.6 : o.wob;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var p = 0; p < passes; p++) {
      var rnd = W.mulberry32((seed ^ 0x51ed) + p * 7919);
      var jp = rough(pts, rnd, wob * (p === 0 ? 1 : 0.75));
      ctx.globalAlpha = (o.strokeAlpha == null ? 1 : o.strokeAlpha) * (p === 0 ? 1 : 0.55);
      ctx.lineWidth = lw * (p === 0 ? 1 : 0.72);
      trace(ctx, jp, closed);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the API

  // Every primitive funnels through here: densify -> jitter -> fill -> stroke.
  function shape(ctx, pts, o, closed) {
    o = o || {};
    var seed = W.hash(o.seed == null ? 'x' : o.seed);
    var step = o.step || 9;
    var dense = subdivide(pts, step, closed);
    var rnd = W.mulberry32(seed);
    var jittered = rough(dense, rnd, o.wob == null ? 1.6 : o.wob);

    if (o.fill) hatchInto(ctx, jittered, o.fill, seed, o);
    if (o.stroke !== null) strokeRough(ctx, dense, seed, o, closed);
    return jittered;
  }

  var C = {};
  C.PAL = PAL;
  C.shape = shape;
  C.bbox = bbox;

  C.line = function (ctx, x1, y1, x2, y2, o) {
    return shape(ctx, [[x1, y1], [x2, y2]], o, false);
  };

  C.poly = function (ctx, pts, o) {
    return shape(ctx, pts, o, o && o.closed === false ? false : true);
  };

  C.rect = function (ctx, x, y, w, h, o) {
    return shape(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o, true);
  };

  C.roundRect = function (ctx, x, y, w, h, r, o) {
    r = Math.min(r, w / 2, h / 2);
    var pts = [];
    var corners = [
      [x + r,     y + r,     Math.PI,     Math.PI * 1.5],
      [x + w - r, y + r,     Math.PI * 1.5, Math.PI * 2],
      [x + w - r, y + h - r, 0,           Math.PI * 0.5],
      [x + r,     y + h - r, Math.PI * 0.5, Math.PI]
    ];
    for (var c = 0; c < 4; c++) {
      var cc = corners[c];
      for (var i = 0; i <= 5; i++) {
        var a = cc[2] + (cc[3] - cc[2]) * (i / 5);
        pts.push([cc[0] + Math.cos(a) * r, cc[1] + Math.sin(a) * r]);
      }
    }
    return shape(ctx, pts, o, true);
  };

  C.ellipse = function (ctx, cx, cy, rx, ry, o) {
    o = o || {};
    var n = Math.max(14, Math.round((rx + ry) * 0.6));
    var rot = o.rot || 0;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var px = Math.cos(a) * rx, py = Math.sin(a) * ry;
      pts.push([
        cx + px * Math.cos(rot) - py * Math.sin(rot),
        cy + px * Math.sin(rot) + py * Math.cos(rot)
      ]);
    }
    return shape(ctx, pts, o, true);
  };

  // An open arc — used for smiles, ear insides, wire, steam.
  C.arc = function (ctx, cx, cy, r, a0, a1, o) {
    var n = Math.max(6, Math.round(Math.abs(a1 - a0) * r * 0.35));
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var a = a0 + (a1 - a0) * (i / n);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return shape(ctx, pts, o, false);
  };

  // A solid dot with a crayon edge — pearls, eyes, berries.
  C.dot = function (ctx, cx, cy, r, color, seed) {
    C.ellipse(ctx, cx, cy, r, r, {
      seed: seed, fill: color, stroke: null, wash: 0.95, fillAlpha: 0.75,
      hatch: 2.6, wob: 0.7, step: 5
    });
  };

  C.heart = function (ctx, cx, cy, s, color, seed) {
    var pts = [];
    for (var i = 0; i <= 26; i++) {
      var t = (i / 26) * Math.PI * 2;
      var x = 16 * Math.pow(Math.sin(t), 3);
      var y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push([cx + (x / 16) * s, cy + (y / 16) * s]);
    }
    shape(ctx, pts, {
      seed: seed, fill: color, stroke: color, lw: 1.6, wob: 0.6,
      step: 4, wash: 0.85, fillAlpha: 0.6, hatch: 3
    }, true);
  };

  C.star = function (ctx, cx, cy, r, color, seed) {
    var rnd = W.mulberry32(W.hash(seed));
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      var rr = i % 2 ? r * 0.42 : r;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    shape(ctx, pts, {
      seed: seed, fill: color, stroke: null, wash: 0.9, fillAlpha: 0.5,
      hatch: 2.4, wob: 0.5, step: 4
    }, true);
    return rnd;
  };

  // -------------------------------------------------------------- lettering

  C.FONT = '"Chalkboard SE", "Marker Felt", "Comic Sans MS", cursive';

  // Draws text a character at a time with a little tilt on each one, so it
  // looks written rather than typeset.
  C.text = function (ctx, str, x, y, o) {
    o = o || {};
    var size = o.size || 22;
    var color = o.color || PAL.outline;
    var seed = W.hash(o.seed == null ? str : o.seed);
    var rnd = W.mulberry32(seed);
    var wob = o.wob == null ? 1.1 : o.wob;

    ctx.save();
    ctx.font = (o.weight || 'bold') + ' ' + size + 'px ' + C.FONT;
    ctx.textBaseline = 'alphabetic';

    var total = ctx.measureText(str).width;
    var sx = x;
    if (o.align === 'center') sx = x - total / 2;
    else if (o.align === 'right') sx = x - total;

    if (o.shadow) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = PAL.outline;
      ctx.fillText(str, sx + 2, y + 2.5);
      ctx.globalAlpha = 1;
    }

    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      var cw = ctx.measureText(ch).width;
      ctx.save();
      ctx.translate(sx + cw / 2 + (rnd() - 0.5) * wob, y + (rnd() - 0.5) * wob * 1.4);
      ctx.rotate((rnd() - 0.5) * 0.055);
      if (o.outline) {
        ctx.lineWidth = o.outline;
        ctx.strokeStyle = o.outlineColor || PAL.outline;
        ctx.lineJoin = 'round';
        ctx.strokeText(ch, -cw / 2, 0);
      }
      ctx.fillStyle = color;
      ctx.fillText(ch, -cw / 2, 0);
      ctx.restore();
      sx += cw;
    }
    ctx.restore();
    return total;
  };

  /* Same look as C.text, but baked to a tile and blitted. HUD strings barely
   * change, and drawing them live was costing more than the whole scene. */
  var textTiles = {};
  C.textCached = function (ctx, str, x, y, o) {
    o = o || {};
    var size = o.size || 22;
    var key = str + '|' + size + '|' + (o.color || PAL.outline) + '|' +
              (o.outline || 0) + '|' + (o.outlineColor || '') + '|' +
              (o.weight || 'bold') + '|' + (o.shadow ? 1 : 0);
    var tile = textTiles[key];
    if (!tile) {
      var w = Math.ceil(C.textWidth(ctx, str, size, o.weight)) + 18;
      var h = Math.ceil(size * 2.1);
      var cv = C.offscreen(Math.max(1, w), h);
      var g = cv.getContext('2d');
      var base = Math.round(size * 1.35);
      C.text(g, str, 9, base, {
        size: size, color: o.color, outline: o.outline, outlineColor: o.outlineColor,
        weight: o.weight, shadow: o.shadow, seed: o.seed || str, wob: o.wob
      });
      tile = textTiles[key] = { img: cv, w: w, base: base };
      var tk = Object.keys(textTiles);
      if (tk.length > 200) delete textTiles[tk[0]];
    }
    var dx = x - 9;
    if (o.align === 'center') dx = x - tile.w / 2;
    else if (o.align === 'right') dx = x - tile.w + 9;
    ctx.drawImage(tile.img, Math.round(dx), Math.round(y - tile.base));
    return tile.w - 18;
  };

  C.textWidth = function (ctx, str, size, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + (size || 22) + 'px ' + C.FONT;
    var w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  };

  // ------------------------------------------------------------------ paper

  // A single small grain tile, generated once and then tiled over every
  // paper. Per-pixel noise across a full-size canvas was by far the most
  // expensive thing in the game (~1.4s per room); this is the same look for
  // a fraction of the pixels.
  var grainTile = null;
  function grain() {
    if (grainTile) return grainTile;
    var n = 128;
    grainTile = document.createElement('canvas');
    grainTile.width = n; grainTile.height = n;
    var g = grainTile.getContext('2d');
    var img = g.createImageData(n, n);
    var d = img.data;
    var rnd = W.mulberry32(W.hash('grain'));
    for (var i = 0; i < d.length; i += 4) {
      var v = 110 + rnd() * 90;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 20;
    }
    g.putImageData(img, 0, 0);
    return grainTile;
  }

  // The warm cream ground everything sits on. Built once, then blitted.
  C.paper = function (w, h, seed, tint) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d');
    g.fillStyle = tint || PAL.paper;
    g.fillRect(0, 0, w, h);

    var pat = g.createPattern(grain(), 'repeat');
    g.fillStyle = pat;
    g.fillRect(0, 0, w, h);

    var rnd = W.mulberry32(W.hash(seed || 'paper'));

    // A few faint paper fibres so the grain isn't perfectly uniform.
    g.globalAlpha = 0.05;
    g.strokeStyle = '#9A8B72';
    for (var f = 0; f < 90; f++) {
      var x = rnd() * w, y = rnd() * h;
      g.lineWidth = 0.6 + rnd();
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 26);
      g.stroke();
    }
    g.globalAlpha = 1;
    return cv;
  };

  C.offscreen = function (w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return cv;
  };

  W.crayon = C;
})(window.W);
