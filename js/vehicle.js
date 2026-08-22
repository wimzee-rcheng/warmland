/* Warmland — vehicles and the maps they travel over.
 *
 * The UFO, the car, the balloon and the submarine all do the same thing:
 * steer over a big baked map and land at points of interest. So there is one
 * scene (scene-vehicle.js) driven by this data, not four copies.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  W.VEHICLES = {
    ufo: {
      name: 'UFO', map: 'neighborhood',
      accel: 620, drag: 2.6, max: 260, tilt: 0.17,
      draw: function (ctx, x, y, sc, t) { W.drawUFO(ctx, x, y, sc, 'v', t); },
      glass: function (ctx, x, y, sc) { W.drawUFOGlass(ctx, x, y, sc); },
      rider: { x: 0, y: 14, scale: 0.48, clip: [-46, -58, 92, 62] },
      hint: 'Arrows to fly  ·  land on a pad'
    },
    car: {
      name: 'Car', map: 'neighborhood', requires: 'drive',
      accel: 720, drag: 4.0, max: 300, tilt: 0.10, ground: true, flips: true,
      draw: function (ctx, x, y, sc, t) { W.drawCar(ctx, x, y, sc, t); },
      rider: { x: 0, y: -18, scale: 0.4, clip: [-30, -66, 60, 46] },
      hint: 'Arrows to drive  ·  stop on a pad'
    },
    balloon: {
      name: 'Hot-Air Balloon', map: 'neighborhood',
      accel: 300, drag: 1.4, max: 130, tilt: 0.06, drifts: true,
      draw: function (ctx, x, y, sc, t) { W.drawBalloon(ctx, x, y, sc, t); },
      rider: { x: 0, y: 34, scale: 0.34, clip: [-22, -30, 44, 42] },
      hint: 'Arrows to steer  ·  drift to a pad'
    },
    submarine: {
      name: 'Submarine', map: 'underwater',
      accel: 480, drag: 3.0, max: 180, tilt: 0.12, flips: true,
      draw: function (ctx, x, y, sc, t) { W.drawSub(ctx, x, y, sc, t); },
      rider: { x: 0, y: 10, scale: 0.3, clip: [-20, -26, 40, 38] },
      hint: 'Arrows to dive  ·  surface at the pad'
    }
  };

  /* Points of interest sit on a map; reaching one and pressing Z either drops
   * you into a walkable room or moves you to another map. */
  W.MAPS = {
    neighborhood: {
      w: 1920, h: 1200, ground: '#8FBF63', outdoor: true,
      pois: [
        { x: 980,  y: 690,  r: 76, label: 'HOME',     to: { room: 'outside' } },
        { x: 1500, y: 440,  r: 74, label: 'PARK',     to: { room: 'park' } },
        { x: 300,  y: 440,  r: 74, label: 'SHOP',     to: { room: 'shop' } },
        { x: 460,  y: 940,  r: 92, label: 'LAKE',     kind: 'lake' },
        { x: 1660, y: 950,  r: 84, label: 'MOUNTAIN', to: { map: 'crystalMountain' }, only: 'balloon' },
        { x: 1180, y: 120,  r: 70, label: 'SPACE',    to: { map: 'space' }, only: 'ufo' }
      ]
    },
    crystalMountain: {
      w: 1400, h: 900, ground: '#DDE9F2', snow: true,
      pois: [
        { x: 700, y: 430, r: 84, label: 'LAND',  to: { room: 'mountain' } },
        { x: 120, y: 800, r: 70, label: 'HOME',  to: { map: 'neighborhood' } }
      ]
    },
    underwater: {
      w: 1600, h: 1000, ground: '#1E5C8A', water: true,
      pois: [
        { x: 800, y: 120, r: 84, label: 'SURFACE', to: { map: 'neighborhood' } },
        { x: 300, y: 760, r: 66, label: 'CAVE',    kind: 'dive' },
        { x: 1300, y: 620, r: 66, label: 'WRECK',  kind: 'dive' }
      ]
    },
    space: {
      w: 1600, h: 1000, ground: '#0E1030', space: true,
      pois: [
        { x: 800,  y: 880, r: 84, label: 'HOME',     to: { map: 'neighborhood' } },
        { x: 1200, y: 260, r: 84, label: 'INVASION', to: { mission: 'space' }, alarm: true }
      ]
    }
  };

  // ------------------------------------------------------------ map baking

  var built = {};

  function paintNeighborhood(g, m) {
    var rnd = W.mulberry32(W.hash('warmland-map'));
    for (var i = 0; i < 11; i++) {
      C.ellipse(g, rnd() * m.w, rnd() * m.h, 160 + rnd() * 220, 90 + rnd() * 130, {
        seed: 'hill' + i, fill: i % 2 ? PAL.grass : PAL.grassDk, stroke: null,
        hatch: 7, wash: 0.3, fillAlpha: 0.3
      });
    }

    // the river, and the lake it feeds
    var pts = [];
    for (var r = 0; r <= 12; r++) pts.push([r * (m.w / 12), 300 + Math.sin(r * 0.8) * 150 + rnd() * 40]);
    C.poly(g, pts, { seed: 'river', stroke: '#5FA8D6', lw: 34, wob: 3, closed: false, passes: 1 });
    C.poly(g, pts, { seed: 'river2', stroke: '#8FD0EE', lw: 20, wob: 3, closed: false, passes: 1 });
    C.ellipse(g, 460, 940, 150, 105, {
      seed: 'lake', fill: '#4A8FC4', stroke: PAL.outline, lw: 4, hatch: 5, wash: 0.7
    });
    C.ellipse(g, 460, 940, 118, 78, { seed: 'lake2', stroke: '#8FD0EE', lw: 3, wob: 2, passes: 1 });

    // roads for the car
    C.line(g, 100, 690, 1820, 690, { seed: 'rd1', stroke: '#B9AE9A', lw: 46, wob: 2.5, passes: 1 });
    C.line(g, 980, 120, 980, 1120, { seed: 'rd2', stroke: '#B9AE9A', lw: 46, wob: 2.5, passes: 1 });
    for (var d = 0; d < 34; d++) {
      C.line(g, 120 + d * 52, 690, 152 + d * 52, 690, { seed: 'dash' + d, stroke: PAL.white, lw: 3.4, wob: 0.6, passes: 1 });
    }

    for (var t = 0; t < 900; t++) {
      var gx = rnd() * m.w, gy = rnd() * m.h;
      C.line(g, gx, gy, gx + (rnd() - 0.5) * 9, gy - 7 - rnd() * 8, {
        seed: 'tf' + t, stroke: PAL.grassDk, lw: 1.6, wob: 0.6, passes: 1, strokeAlpha: 0.45
      });
    }

    /* Everything scenery has to stay off: buildings, pads, roads, water.
     * Flowers used to skip this check and ended up on the roof of the house. */
    var NO_GO = [
      { x: 800,  y: 170, w: 340, h: 340, label: 'house' },
      { x: 150,  y: 140, w: 330, h: 200, label: 'shop' },
      { x: 1470, y: 100, w: 190, h: 200, label: 'swings' },
      { x: 1590, y: 290, w: 160, h: 110, label: 'bench' },
      { x: 290,  y: 800, w: 340, h: 280, label: 'lake' }
    ];

    function clearSpot(x, y, pad) {
      pad = pad || 0;
      for (var i = 0; i < NO_GO.length; i++) {
        var b = NO_GO[i];
        if (x > b.x - pad && x < b.x + b.w + pad &&
            y > b.y - pad && y < b.y + b.h + pad) return false;
      }
      for (var p = 0; p < m.pois.length; p++) {
        if (Math.hypot(x - m.pois[p].x, y - m.pois[p].y) < m.pois[p].r + 60 + pad) return false;
      }
      if (Math.abs(y - 690) < 60 + pad || Math.abs(x - 980) < 60 + pad) return false;   // roads
      if (Math.abs(y - (300 + Math.sin((x / m.w) * 12 * 0.8) * 150)) < 60 + pad) return false; // river
      return true;
    }

    // ground clutter first, so anything that does slip through sits behind
    for (var f = 0; f < 90; f++) {
      var fx = rnd() * m.w, fy = 160 + rnd() * (m.h - 200);
      if (!clearSpot(fx, fy, 10)) continue;
      W.PROPS.flower.draw(g, fx, fy, 'mapfl' + f, [PAL.accent, PAL.sun, '#B48FD6'][f % 3]);
    }

    var placed = [];
    for (var k = 0; k < 90 && placed.length < 26; k++) {
      var tx = rnd() * (m.w - 140) + 50, ty = 170 + rnd() * (m.h - 280);
      if (!clearSpot(tx, ty, 70)) continue;
      if (placed.some(function (q) { return Math.hypot(q[0] - tx, q[1] - ty) < 165; })) continue;
      placed.push([tx, ty]);
    }
    placed.sort(function (a, b) { return a[1] - b[1]; });
    placed.forEach(function (q, i) { W.PROPS.tree.draw(g, q[0], q[1], 'maptree' + i); });

    // a hint of the mountain, so its pad reads as somewhere you go
    var mtn = m.pois.filter(function (q) { return q.label === 'MOUNTAIN'; })[0];
    if (mtn) {
      C.poly(g, [[mtn.x - 260, mtn.y - 60], [mtn.x - 90, mtn.y - 300], [mtn.x + 80, mtn.y - 60]], {
        seed: 'mtnbg', fill: '#6FC46F', stroke: PAL.outline, lw: 4, hatch: 7, wash: 0.5
      });
      C.poly(g, [[mtn.x - 145, mtn.y - 172], [mtn.x - 90, mtn.y - 300], [mtn.x - 35, mtn.y - 172]], {
        seed: 'mtncap', fill: PAL.white, stroke: PAL.outline, lw: 3.4, hatch: 5, wash: 0.85
      });
      for (var cs = 0; cs < 4; cs++) {
        var sx2 = mtn.x - 200 + cs * 70, sy2 = mtn.y - 70 - (cs % 2) * 30;
        C.poly(g, [[sx2 - 15, sy2], [sx2 + 15, sy2], [sx2, sy2 - 74]], {
          seed: 'mtnsp' + cs, fill: ['#5F7FD6', '#8A6FD6'][cs % 2],
          stroke: PAL.outline, lw: 3, hatch: 4, wash: 0.6
        });
      }
    }

    // and a little launch site under the space portal
    var spc = m.pois.filter(function (q) { return q.label === 'SPACE'; })[0];
    if (spc) {
      for (var st2 = 0; st2 < 16; st2++) {
        var a2 = (st2 / 16) * Math.PI * 2;
        C.star(g, spc.x + Math.cos(a2) * (110 + (st2 % 3) * 26),
                  spc.y + Math.sin(a2) * (80 + (st2 % 3) * 20),
               7 + (st2 % 3) * 3, PAL.sun, 'spst' + st2);
      }
    }

    // buildings last, so nothing can ever be painted on top of them
    W.PROPS.house.draw(g, 840, 420, 'maphouse');
    W.PROPS.shopAwning.draw(g, 180, 250, 'mapawn');
    W.PROPS.shopCounter.draw(g, 236, 250, 'mapshop');
    W.PROPS.swingSet.draw(g, 1500, 230, 'mapswing');
    W.PROPS.bench.draw(g, 1620, 340, 'mapbench');
  }

  function paintMountain(g, m) {
    var rnd = W.mulberry32(W.hash('mountain'));
    // the green peak from the drawing, with snow above it
    C.poly(g, [[100, 900], [700, 120], [1300, 900]], {
      seed: 'peak', fill: '#6FC46F', stroke: PAL.outline, lw: 5, hatch: 7, wash: 0.55
    });
    C.poly(g, [[520, 350], [700, 120], [880, 350]], {
      seed: 'snowcap', fill: PAL.white, stroke: PAL.outline, lw: 4, hatch: 5, wash: 0.85
    });
    for (var i = 0; i < 14; i++) {
      var cx = 240 + rnd() * 920, cy = 300 + rnd() * 520;
      var hgt = 90 + rnd() * 150, wdt = 22 + rnd() * 24;
      C.poly(g, [[cx - wdt, cy], [cx + wdt, cy], [cx, cy - hgt]], {
        seed: 'spike' + i, fill: ['#5F7FD6', '#8A6FD6', '#5FB5D6'][i % 3],
        stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.6
      });
      C.line(g, cx, cy, cx, cy - hgt, { seed: 'fc' + i, stroke: PAL.white, lw: 2.2, wob: 0.8, passes: 1, strokeAlpha: 0.7 });
    }
    // birds, the way the drawing has them
    for (var b = 0; b < 8; b++) {
      var bx = 150 + rnd() * 1100, by = 80 + rnd() * 180;
      C.arc(g, bx - 8, by, 9, Math.PI * 1.15, Math.PI * 1.85, { seed: 'bd' + b, stroke: PAL.outline, lw: 2.4, wob: 0.6, passes: 1 });
      C.arc(g, bx + 8, by, 9, Math.PI * 1.15, Math.PI * 1.85, { seed: 'bd2' + b, stroke: PAL.outline, lw: 2.4, wob: 0.6, passes: 1 });
    }
  }

  function paintUnderwater(g, m) {
    var rnd = W.mulberry32(W.hash('sea'));
    for (var i = 0; i < 10; i++) {
      C.ellipse(g, rnd() * m.w, rnd() * m.h, 200 + rnd() * 200, 100 + rnd() * 120, {
        seed: 'cur' + i, fill: '#2C6E9E', stroke: null, hatch: 8, wash: 0.3, fillAlpha: 0.3
      });
    }
    // seabed
    C.poly(g, [[0, m.h], [0, m.h - 120], [400, m.h - 190], [900, m.h - 110],
               [1300, m.h - 200], [m.w, m.h - 140], [m.w, m.h]], {
      seed: 'bed', fill: '#C9A86A', stroke: PAL.outline, lw: 4, hatch: 6, wash: 0.6
    });
    for (var w2 = 0; w2 < 40; w2++) {
      var wx = rnd() * m.w, wy = m.h - 130 - rnd() * 60;
      C.arc(g, wx, wy, 26 + rnd() * 26, Math.PI * 1.2, Math.PI * 1.8, {
        seed: 'weed' + w2, stroke: '#3E9E72', lw: 5, wob: 2.4, passes: 1
      });
    }
    for (var f = 0; f < 44; f++) {
      var fx = rnd() * m.w, fy = 120 + rnd() * (m.h - 300);
      var col = ['#F2C14E', '#E8834E', '#E8578F', '#8FD0EE'][f % 4];
      C.ellipse(g, fx, fy, 16, 10, { seed: 'fish' + f, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.75 });
      C.poly(g, [[fx - 16, fy], [fx - 28, fy - 8], [fx - 28, fy + 8]], {
        seed: 'tail' + f, fill: col, stroke: PAL.outline, lw: 2, hatch: 2.2, wash: 0.75
      });
      C.dot(g, fx + 7, fy - 2, 2, PAL.outline, 'fe' + f);
    }
    for (var bb = 0; bb < 60; bb++) {
      C.ellipse(g, rnd() * m.w, rnd() * m.h, 4 + rnd() * 6, 4 + rnd() * 6, {
        seed: 'bub' + bb, stroke: '#CFE9F5', lw: 1.6, wob: 0.4, passes: 1, strokeAlpha: 0.6
      });
    }
  }


  function paintSpace(g, m) {
    var rnd = W.mulberry32(W.hash('space'));
    for (var i = 0; i < 260; i++) {
      C.dot(g, rnd() * m.w, rnd() * m.h, 1 + rnd() * 2.6, '#FFFFFF', 'star' + i);
    }
    for (var s2 = 0; s2 < 16; s2++) {
      C.star(g, rnd() * m.w, rnd() * m.h, 6 + rnd() * 9, PAL.sun, 'bigstar' + s2);
    }
    for (var p = 0; p < 5; p++) {
      var px = 150 + rnd() * (m.w - 300), py = 150 + rnd() * (m.h - 300);
      var col = ['#E8834E', '#7FA8E8', '#B48FD6', '#6FC46F', '#E8578F'][p];
      C.ellipse(g, px, py, 50 + rnd() * 40, 50 + rnd() * 40, {
        seed: 'pl' + p, fill: col, stroke: PAL.outline, lw: 3.4, hatch: 5, wash: 0.6
      });
      if (p % 2) C.ellipse(g, px, py, 82, 20, { seed: 'ring' + p, stroke: PAL.sun, lw: 3, wob: 1.4, passes: 1 });
    }
    // an ominous ring around the invasion pad
    C.ellipse(g, 1200, 260, 120, 78, { seed: 'inv1', stroke: '#E0455F', lw: 5, wob: 2.4 });
    C.ellipse(g, 1200, 260, 150, 98, { seed: 'inv2', stroke: '#E0455F', lw: 3, wob: 2.8, strokeAlpha: 0.5, passes: 1 });
  }

  /* Bake a map once, on demand. They're big, so only what you visit is built. */
  W.getMap = function (id) {
    if (built[id]) return built[id];
    var m = W.MAPS[id];
    if (!m) throw new Error('no such map: ' + id);
    var cv = C.paper(m.w, m.h, 'map' + id, m.ground);   // paint INTO this canvas
    var g = cv.getContext('2d');

    if (id === 'neighborhood') paintNeighborhood(g, m);
    else if (id === 'crystalMountain') paintMountain(g, m);
    else if (id === 'underwater') paintUnderwater(g, m);
    else if (id === 'space') paintSpace(g, m);

    // landing pads
    m.pois.forEach(function (p, i) {
      C.ellipse(g, p.x, p.y, p.r, p.r * 0.62, {
        seed: 'pad' + i, fill: m.space ? '#4A4A6E' : PAL.steel, stroke: PAL.outline,
        lw: 4, hatch: 5, wash: 0.6
      });
      C.ellipse(g, p.x, p.y, p.r - 15, (p.r - 15) * 0.62, {
        seed: 'pad2' + i, stroke: PAL.sun, lw: 3.4, wob: 1.6
      });
      C.text(g, p.label, p.x, p.y + 8, {
        size: 22, align: 'center', color: m.space ? PAL.white : PAL.outline, seed: 'padt' + i
      });
    });

    built[id] = cv;
    return cv;
  };

})(window.W);
