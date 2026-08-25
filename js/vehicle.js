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
      name: 'Car', map: 'neighborhood',   // anyone can drive; racing needs the suit
      accel: 820, drag: 4.0, max: 380, tilt: 0.10, ground: true, flips: true,
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

    /* Butterball's own balloon — same handling, his colours. */
    balloon2: {
      name: 'Star Balloon', map: 'warmland2',
      accel: 300, drag: 1.4, max: 130, tilt: 0.06, drifts: true,
      draw: function (ctx, x, y, sc, t) { W.drawBalloon2(ctx, x, y, sc, t); },
      rider: { x: 0, y: 34, scale: 0.34, clip: [-22, -30, 44, 42] },
      hint: 'Arrows to steer  ·  drift to a pad'
    },

    /* The popcorn car: Warmland 2's runabout. */
    popcar: {
      name: 'Popcorn Car', map: 'warmland2',
      accel: 820, drag: 4.0, max: 380, tilt: 0.10, ground: true, flips: true,
      draw: function (ctx, x, y, sc, t, flip) { W.drawPopcar(ctx, x, y, sc, t, flip); },
      rider: { x: 4, y: -18, scale: 0.3, clip: [-24, -46, 48, 34] },
      hint: 'Arrows to drive  ·  stop on a pad'
    },
    submarine: {
      name: 'Submarine', map: 'underwater',
      accel: 480, drag: 3.0, max: 180, tilt: 0.12, flips: true,
      draw: function (ctx, x, y, sc, t) { W.drawSub(ctx, x, y, sc, t); },
      rider: { x: 0, y: 10, scale: 0.3, clip: [-20, -26, 40, 38] },
      hint: 'Arrows to dive  ·  surface at the pad'
    }
  };

  /* Where a map's pad for something sits, so a minigame can put you back
   * over the place you just left instead of wherever you last walked. */
  W.mapPadAt = function (mapId, key) {
    var m = W.MAPS[mapId];
    if (!m) return null;
    for (var i = 0; i < m.pois.length; i++) {
      var p = m.pois[i];
      if (p.kind === key) return [p.x, p.y];
      if (!p.to) continue;
      if (p.to[key] || p.to.room === key || p.to.map === key ||
          p.to.mission === key) return [p.x, p.y];
    }
    return null;
  };

  /* Walking out of a place you flew to puts you back in the vehicle you
   * arrived in — or that map's own runabout if this session has no history. */
  W.vehicleForMap = function (mapId) {
    var cur = W.sceneVehicle && W.sceneVehicle.vehicle;
    if (cur && W.VEHICLES[cur] && W.VEHICLES[cur].map === mapId) return cur;
    var keys = Object.keys(W.VEHICLES);
    for (var i = 0; i < keys.length; i++) {
      var v = W.VEHICLES[keys[i]];
      if (v.map === mapId && v.drifts) return keys[i];      // prefer a balloon
    }
    for (var j = 0; j < keys.length; j++) {
      if (W.VEHICLES[keys[j]].map === mapId) return keys[j];
    }
    return 'balloon';
  };

  /* Points of interest sit on a map; reaching one and pressing Z either drops
   * you into a walkable room or moves you to another map. */
  W.MAPS = {
    neighborhood: {
      w: 1920, h: 1200, ground: '#8FBF63', outdoor: true,
      roads: [{ y: 690 }, { x: 980 }],
      pois: [
        { x: 980,  y: 585,  r: 76, label: 'HOME',     to: { room: 'outside' } },
        { x: 1500, y: 440,  r: 74, label: 'PARK',     to: { room: 'park' } },
        { x: 300,  y: 372,  r: 74, label: 'ICE CREAM', to: { room: 'shop' } },
        { x: 620,  y: 690,  r: 74, label: 'GROCERY',  to: { room: 'grocery' } },
        { x: 460,  y: 940,  r: 92, label: 'LAKE',     kind: 'lake' },
        { x: 1660, y: 950,  r: 84, label: 'MOUNTAIN', to: { map: 'crystalMountain' }, only: ['balloon', 'balloon2'] },
        { x: 1180, y: 120,  r: 70, label: 'SPACE',    to: { map: 'space' }, only: 'ufo' },
        { x: 1820, y: 690,  r: 80, label: 'WARMLAND 2', to: { map: 'warmland2' }, only: ['balloon', 'balloon2'], portal: true },
        { x: 980,  y: 1010, r: 92, label: 'RACE TRACK', to: { race: true }, only: 'car', needs: 'drive', track: true },
        { x: 640,  y: 200,  r: 78, label: 'BUILD SITE', to: { room: 'site' }, house: true }
      ]
    },
    crystalMountain: {
      w: 1400, h: 900, ground: '#DDE9F2', snow: true,
      pois: [
        { x: 700, y: 430, r: 84, label: 'LAND',  to: { room: 'mountain' } },
        { x: 120, y: 800, r: 70, label: 'HOME',  to: { map: 'neighborhood' } },
        { x: 1140, y: 190, r: 86, label: 'SNOW RUN', to: { snow: true } }
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
    /* WARMLAND 2 — the older brother's world. Balloon-only from home. */
    warmland2: {
      w: 1600, h: 1000, ground: '#7FA85A', outdoor: true,
      roads: [{ y: 500 }, { x: 700 }],
      pois: [
        { x: 280,  y: 404, r: 82, label: 'TREEHOUSE', to: { room: 'outside2' }, home2: true },
        { x: 760,  y: 250, r: 74, label: 'PARK', to: { room: 'park2' } },
        { x: 1280, y: 320, r: 86, label: 'CASTLE',    to: { castle: true }, castle: true },
        { x: 1300, y: 760, r: 84, label: 'HAUNTED HOUSE', to: { room: 'graveyard' }, haunted: true },
        { x: 700,  y: 700, r: 78, label: 'BUILD SITE', to: { room: 'site2' }, tower: true },
        { x: 300,  y: 592, r: 84, label: 'THEME PARK', to: { room: 'themepark' }, fair: true },
        { x: 170,  y: 170, r: 76, label: 'WARMLAND 1', to: { map: 'neighborhood' }, only: ['balloon', 'balloon2'], portal: true }
      ]
    },

    space: {
      w: 1600, h: 1000, ground: '#0E1030', space: true,
      pois: [
        { x: 800,  y: 880, r: 84, label: 'HOME',     to: { map: 'neighborhood' } },
        { x: 1200, y: 260, r: 84, label: 'INVASION', to: { mission: 'space' }, alarm: true },
        { x: 420,  y: 420, r: 88, label: 'MARS',     to: { mars: true }, planet: '#C4643F' }
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
    else if (id === 'warmland2') paintWarmland2(g, m);
    else if (id === 'crystalMountain') paintMountain(g, m);
    else if (id === 'underwater') paintUnderwater(g, m);
    else if (id === 'space') paintSpace(g, m);

    // landing pads — a few of them are a picture rather than a disc
    m.pois.forEach(function (p, i) {
      if (p.track) { paintTrackPad(g, p, i); return; }
      if (p.portal) { paintPortalPad(g, p, i); return; }
      if (p.castle) { paintCastlePad(g, p, i); return; }
      if (p.haunted) { paintHauntedPad(g, p, i); return; }
      if (p.fair) { paintFairPad(g, p, i); return; }
      if (p.home2) { paintTreePad(g, p, i); return; }
      if (p.tower && W.game.state.builds && W.game.state.builds.skyscraper >= 4) {
        paintTowerPad(g, p, i); return;
      }
      if (p.planet) { paintPlanetPad(g, p, i); return; }
      var label = W.poiLabel(p);
      if (p.house && W.game.state.builds && W.game.state.builds.friendHouse >= 4) {
        paintHousePad(g, p, i, label);
        return;
      }
      C.ellipse(g, p.x, p.y, p.r, p.r * 0.62, {
        seed: 'pad' + i, fill: m.space ? '#4A4A6E' : PAL.steel, stroke: PAL.outline,
        lw: 4, hatch: 5, wash: 0.6
      });
      C.ellipse(g, p.x, p.y, p.r - 15, (p.r - 15) * 0.62, {
        seed: 'pad2' + i, stroke: PAL.sun, lw: 3.4, wob: 1.6
      });
      C.text(g, label, p.x, p.y + 8, {
        size: 22, align: 'center', color: m.space ? PAL.white : PAL.outline, seed: 'padt' + i
      });
    });

    built[id] = cv;
    return cv;
  };

  /* Warmland 2: rolling hills, a big river loop and a road for the
   * popcorn car. Deliberately a touch wilder than Warmland 1. */
  function paintWarmland2(g, m) {
    var rnd = W.mulberry32(W.hash('warmland2-map'));
    for (var i = 0; i < 12; i++) {
      C.ellipse(g, rnd() * m.w, rnd() * m.h, 170 + rnd() * 230, 90 + rnd() * 140, {
        seed: 'w2h' + i, fill: i % 2 ? PAL.grass : PAL.grassDk, stroke: null,
        hatch: 7, wash: 0.32, fillAlpha: 0.32
      });
    }
    // a lazy river across the middle
    var pts = [];
    for (var r = 0; r <= 12; r++) {
      pts.push([r * (m.w / 12), 520 + Math.sin(r * 0.7) * 170 + rnd() * 30]);
    }
    C.poly(g, pts, { seed: 'w2riv', stroke: '#5FA8D6', lw: 32, wob: 3, closed: false, passes: 1 });
    C.poly(g, pts, { seed: 'w2riv2', stroke: '#8FD0EE', lw: 19, wob: 3, closed: false, passes: 1 });

    // the road for the popcorn car
    C.line(g, 120, 500, 1480, 500, { seed: 'w2rd', stroke: '#B9AE9A', lw: 44, wob: 2.5, passes: 1 });
    C.line(g, 700, 120, 700, 940, { seed: 'w2rd2', stroke: '#B9AE9A', lw: 44, wob: 2.5, passes: 1 });
    for (var d = 0; d < 26; d++) {
      C.line(g, 140 + d * 52, 500, 172 + d * 52, 500, {
        seed: 'w2dash' + d, stroke: PAL.white, lw: 3.4, wob: 0.6, passes: 1
      });
    }

    for (var t = 0; t < 700; t++) {
      var gx = rnd() * m.w, gy = rnd() * m.h;
      C.line(g, gx, gy, gx + (rnd() - 0.5) * 9, gy - 7 - rnd() * 8, {
        seed: 'w2tf' + t, stroke: PAL.grassDk, lw: 1.6, wob: 0.6, passes: 1, strokeAlpha: 0.45
      });
    }

    // trees, keeping clear of pads and roads
    var placed = [];
    for (var k = 0; k < 90 && placed.length < 22; k++) {
      var tx = rnd() * (m.w - 140) + 50, ty = 150 + rnd() * (m.h - 260);
      var clear = true;
      for (var p2 = 0; p2 < m.pois.length; p2++) {
        if (Math.hypot(tx - m.pois[p2].x, ty - m.pois[p2].y) < m.pois[p2].r + 120) clear = false;
      }
      if (Math.abs(ty - 500) < 110 || Math.abs(tx - 700) < 110) clear = false;
      if (Math.abs(ty - (520 + Math.sin((tx / m.w) * 12 * 0.7) * 170)) < 90) clear = false;
      if (!clear) continue;
      if (placed.some(function (q) { return Math.hypot(q[0] - tx, q[1] - ty) < 170; })) continue;
      placed.push([tx, ty]);
    }
    placed.sort(function (a, b) { return a[1] - b[1]; });
    placed.forEach(function (q, i2) { W.PROPS.tree.draw(g, q[0], q[1], 'w2tree' + i2); });
  }

  /* A swirling cloud-portal: the way between the two worlds. */
  function paintPortalPad(g, p, i) {
    for (var r = 0; r < 5; r++) {
      C.arc(g, p.x, p.y, p.r - r * 13, Math.PI * (0.1 + r * 0.3), Math.PI * (1.5 + r * 0.3), {
        seed: 'ptl' + i + r, stroke: r % 2 ? '#B48FD6' : '#8FD0EE',
        lw: 8 - r, wob: 2.4, passes: 1, strokeAlpha: 0.85
      });
    }
    for (var s2 = 0; s2 < 7; s2++) {
      var a2 = (s2 / 7) * Math.PI * 2;
      C.star(g, p.x + Math.cos(a2) * (p.r * 0.55), p.y + Math.sin(a2) * (p.r * 0.55),
             7, PAL.sun, 'ptls' + i + s2);
    }
    C.text(g, W.poiLabel(p), p.x, p.y + p.r + 30, {
      size: 22, align: 'center', color: PAL.white,
      outline: 4, outlineColor: PAL.outline, seed: 'ptlt' + i
    });
  }

  /* A castle keep with flags. */
  function paintCastlePad(g, p, i) {
    C.ellipse(g, p.x, p.y + 18, p.r + 12, (p.r + 12) * 0.45, {
      seed: 'csg' + i, fill: PAL.grassDk, stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.5
    });
    C.rect(g, p.x - 62, p.y - 54, 124, 76, {
      seed: 'csw' + i, fill: '#9AA4AA', stroke: PAL.outline, lw: 3.6, hatch: 4.4, wash: 0.75
    });
    for (var t2 = 0; t2 < 2; t2++) {
      var tx2 = p.x - 84 + t2 * 124;
      C.rect(g, tx2, p.y - 84, 44, 106, {
        seed: 'cst' + i + t2, fill: '#B9C3C9', stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.78
      });
      for (var cr = 0; cr < 3; cr++) {
        C.rect(g, tx2 + cr * 16, p.y - 94, 11, 12, {
          seed: 'csc' + i + t2 + cr, fill: '#B9C3C9', stroke: PAL.outline, lw: 2.4, hatch: 2.6, wash: 0.8
        });
      }
      C.line(g, tx2 + 22, p.y - 94, tx2 + 22, p.y - 126, {
        seed: 'csfp' + i + t2, stroke: PAL.outline, lw: 2.4, wob: 0.7
      });
      C.poly(g, [[tx2 + 22, p.y - 126], [tx2 + 52, p.y - 118], [tx2 + 22, p.y - 108]], {
        seed: 'csfl' + i + t2, fill: '#D9402F', stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.85
      });
    }
    C.arc(g, p.x, p.y + 22, 22, Math.PI, Math.PI * 2, {
      seed: 'csd' + i, fill: '#5A3A20', stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.8
    });
    C.text(g, W.poiLabel(p), p.x, p.y + 52, {
      size: 20, align: 'center', color: PAL.white,
      outline: 4, outlineColor: PAL.outline, seed: 'cslb' + i
    });
  }

  /* A crooked house on a hill, with a crooked little fence. */
  function paintHauntedPad(g, p, i) {
    C.ellipse(g, p.x, p.y + 16, p.r + 10, (p.r + 10) * 0.45, {
      seed: 'hhg' + i, fill: '#6B7A5A', stroke: null, hatch: 5, wash: 0.55, fillAlpha: 0.6
    });
    C.poly(g, [[p.x - 52, p.y + 18], [p.x - 44, p.y - 40], [p.x + 50, p.y - 34], [p.x + 44, p.y + 18]], {
      seed: 'hhw' + i, fill: '#8A7F94', stroke: PAL.outline, lw: 3.6, hatch: 4.4, wash: 0.72
    });
    C.poly(g, [[p.x - 60, p.y - 38], [p.x + 6, p.y - 86], [p.x + 58, p.y - 32]], {
      seed: 'hhr' + i, fill: '#5A4A6E', stroke: PAL.outline, lw: 3.6, hatch: 4, wash: 0.76
    });
    C.rect(g, p.x - 24, p.y - 20, 20, 20, {
      seed: 'hhwin' + i, fill: '#F2E14E', stroke: PAL.outline, lw: 2.6, hatch: 2.8, wash: 0.85
    });
    C.rect(g, p.x + 12, p.y - 16, 18, 18, {
      seed: 'hhwin2' + i, fill: '#F2E14E', stroke: PAL.outline, lw: 2.6, hatch: 2.8, wash: 0.85
    });
    C.text(g, W.poiLabel(p), p.x, p.y + 46, {
      size: 19, align: 'center', color: PAL.white,
      outline: 4, outlineColor: PAL.outline, seed: 'hhl' + i
    });
  }

  /* A big wheel and a striped tent. */
  function paintFairPad(g, p, i) {
    C.ellipse(g, p.x, p.y + 16, p.r + 10, (p.r + 10) * 0.45, {
      seed: 'fpg' + i, fill: PAL.grassDk, stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.5
    });
    C.arc(g, p.x - 20, p.y - 30, 46, 0, Math.PI * 2, {
      seed: 'fpw' + i, stroke: '#E8834E', lw: 5, wob: 1.6
    });
    for (var sp = 0; sp < 8; sp++) {
      var a3 = (sp / 8) * Math.PI * 2;
      C.line(g, p.x - 20, p.y - 30, p.x - 20 + Math.cos(a3) * 46, p.y - 30 + Math.sin(a3) * 46, {
        seed: 'fps' + i + sp, stroke: '#E8834E', lw: 2.6, wob: 0.8, passes: 1
      });
      C.dot(g, p.x - 20 + Math.cos(a3) * 46, p.y - 30 + Math.sin(a3) * 46, 6,
            ['#F2C14E', '#E8A0B4', '#8FD0EE'][sp % 3], 'fpc' + i + sp);
    }
    C.poly(g, [[p.x + 34, p.y + 18], [p.x + 62, p.y - 26], [p.x + 90, p.y + 18]], {
      seed: 'fpt' + i, fill: '#D9402F', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
    });
    C.text(g, W.poiLabel(p), p.x, p.y + 48, {
      size: 19, align: 'center', color: PAL.white,
      outline: 4, outlineColor: PAL.outline, seed: 'fpl' + i
    });
  }

  /* Butterball's tree, seen from the sky. */
  function paintTreePad(g, p, i) {
    C.ellipse(g, p.x, p.y + 14, p.r + 10, (p.r + 10) * 0.45, {
      seed: 'tpg' + i, fill: PAL.grassDk, stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.5
    });
    C.rect(g, p.x - 16, p.y - 24, 32, 46, {
      seed: 'tpt' + i, fill: '#C9A882', stroke: '#8A5F38', lw: 3.4, hatch: 4, wash: 0.75
    });
    var blobs = [[-38, -52, 40, 30], [0, -70, 46, 34], [38, -50, 38, 28]];
    for (var b = 0; b < blobs.length; b++) {
      C.ellipse(g, p.x + blobs[b][0], p.y + blobs[b][1], blobs[b][2], blobs[b][3], {
        seed: 'tpl' + i + b, fill: b % 2 ? PAL.grass : '#4E8F3A',
        stroke: PAL.outline, lw: 3.2, hatch: 4.4, wash: 0.65
      });
    }
    C.dot(g, p.x, p.y - 62, 12, '#F2E14E', 'tpw' + i);
    C.text(g, W.poiLabel(p), p.x, p.y + 48, {
      size: 19, align: 'center', color: PAL.white,
      outline: 4, outlineColor: PAL.outline, seed: 'tpll' + i
    });
  }

  /* Once the site is finished, the pad IS the tower. */
  function paintTowerPad(g, p, i) {
    C.ellipse(g, p.x, p.y + 16, p.r, p.r * 0.4, {
      seed: 'twg' + i, fill: PAL.grassDk, stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.5
    });
    C.rect(g, p.x - 34, p.y - 150, 68, 168, {
      seed: 'tww' + i, fill: '#B9C3C9', stroke: PAL.outline, lw: 3.6, hatch: 4.4, wash: 0.75
    });
    for (var fl = 0; fl < 7; fl++) {
      for (var cc = 0; cc < 3; cc++) {
        C.rect(g, p.x - 26 + cc * 19, p.y - 140 + fl * 22, 12, 13, {
          seed: 'twwin' + i + fl + cc, fill: '#8FD0EE', stroke: null, hatch: 2.4, wash: 0.85, fillAlpha: 0.9
        });
      }
    }
    C.line(g, p.x, p.y - 150, p.x, p.y - 196, { seed: 'twsp' + i, stroke: PAL.steel, lw: 5, wob: 0.8 });
    C.dot(g, p.x, p.y - 200, 5, '#E0455F', 'twt' + i);
    C.text(g, 'THE BIG TOWER', p.x, p.y + 44, {
      size: 18, align: 'center', color: PAL.white,
      outline: 4, outlineColor: PAL.outline, seed: 'twl' + i
    });
  }

  /* Pads whose label changes as the world does. */
  W.poiLabel = function (p) {
    if (p.house && W.game.state.builds && W.game.state.builds.friendHouse >= 4) {
      return "PANDA & YUNA'S";
    }
    if (p.tower && W.game.state.builds && W.game.state.builds.skyscraper >= 4) {
      return 'THE BIG TOWER';
    }
    return p.label;
  };

  /* Throw away a baked map so it repaints — the building site becomes a
   * house, and the map has to notice. */
  W.rebuildMap = function (mapId) { delete built[mapId]; };

  /* A little oval circuit painted right on the road, so RACE TRACK looks
   * like a race track instead of another grey disc. */
  function paintTrackPad(g, p, i) {
    var rx = p.r * 1.5, ry = p.r * 0.9;
    C.ellipse(g, p.x, p.y, rx + 22, ry + 22, {
      seed: 'trkg' + i, fill: '#7FB04E', stroke: null, hatch: 5, wash: 0.55, fillAlpha: 0.6
    });
    g.save();
    g.beginPath();
    g.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    g.ellipse(p.x, p.y, rx * 0.52, ry * 0.42, 0, 0, Math.PI * 2, true);
    g.clip();
    C.rect(g, p.x - rx - 4, p.y - ry - 4, rx * 2 + 8, ry * 2 + 8, {
      seed: 'trkt' + i, fill: '#7A7A82', stroke: null, hatch: 5, wash: 0.9, fillAlpha: 0.95
    });
    g.restore();
    // the infield is grass, not more tarmac
    C.ellipse(g, p.x, p.y, rx * 0.52, ry * 0.42, {
      seed: 'trkin' + i, fill: '#8FBF63', stroke: null, hatch: 5, wash: 0.7, fillAlpha: 0.9
    });
    for (var k = 0; k < 26; k++) {
      var a = (k / 26) * Math.PI * 2;
      var col = k % 2 ? '#D9402F' : PAL.white;
      C.dot(g, p.x + Math.cos(a) * (rx - 3), p.y + Math.sin(a) * (ry - 3), 6, col, 'tko' + i + k);
      C.dot(g, p.x + Math.cos(a) * (rx * 0.52 + 3), p.y + Math.sin(a) * (ry * 0.42 + 3), 6, col, 'tki' + i + k);
    }
    // start/finish chequers on the near straight
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) {
        if ((r + c) % 2) continue;
        C.rect(g, p.x + rx * 0.58 + c * 14, p.y - 22 + r * 15, 14, 15, {
          seed: 'tkc' + i + r + c, fill: PAL.white, stroke: null, hatch: 4, wash: 0.9, fillAlpha: 0.9
        });
      }
    }
    C.text(g, W.poiLabel(p), p.x, p.y + 8, {
      size: 24, align: 'center', color: PAL.white,
      outline: 4, outlineColor: PAL.outline, seed: 'tkl' + i
    });
  }

  /* A whole planet, for the pads that are worlds. */
  function paintPlanetPad(g, p, i) {
    var col = p.planet;
    C.ellipse(g, p.x, p.y, p.r, p.r, {
      seed: 'pl' + i, fill: col, stroke: PAL.outline, lw: 4.4, hatch: 5, wash: 0.8
    });
    var rnd = W.mulberry32(W.hash('planet' + p.label));
    for (var c = 0; c < 7; c++) {
      var a = rnd() * Math.PI * 2, d = rnd() * p.r * 0.72;
      C.ellipse(g, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d,
        6 + rnd() * 14, 5 + rnd() * 9, {
          seed: 'plc' + i + c, fill: '#8A3E28', stroke: '#6E2E1E', lw: 2.4, hatch: 3.4, wash: 0.6
        });
    }
    C.arc(g, p.x, p.y, p.r - 6, Math.PI * 1.1, Math.PI * 1.6, {
      seed: 'plh' + i, stroke: PAL.white, lw: 5, wob: 2, passes: 1, strokeAlpha: 0.35
    });
    C.text(g, W.poiLabel(p), p.x, p.y + p.r + 34, {
      size: 24, align: 'center', color: PAL.white,
      outline: 4, outlineColor: PAL.outline, seed: 'pll' + i
    });
  }

  /* Once it is built, the site IS the house. */
  function paintHousePad(g, p, i, label) {
    C.ellipse(g, p.x, p.y + 14, p.r + 10, (p.r + 10) * 0.5, {
      seed: 'hpg' + i, fill: '#8FBF63', stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.5
    });
    C.rect(g, p.x - 54, p.y - 40, 108, 56, {
      seed: 'hpw' + i, fill: PAL.wood, stroke: PAL.outline, lw: 3.6, hatch: 4, wash: 0.75
    });
    C.poly(g, [[p.x - 66, p.y - 38], [p.x, p.y - 84], [p.x + 66, p.y - 38]], {
      seed: 'hpr' + i, fill: PAL.roof, stroke: PAL.outline, lw: 3.6, hatch: 4, wash: 0.78
    });
    C.rect(g, p.x - 13, p.y - 18, 26, 34, {
      seed: 'hpd' + i, fill: PAL.woodDk, stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.8
    });
    C.text(g, label, p.x, p.y + 46, {
      size: 20, align: 'center', color: PAL.outline, seed: 'hpl' + i + label
    });
  }

})(window.W);
