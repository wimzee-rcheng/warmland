/* Warmland — walking around a room.
 *
 * The static ground (paper, wall, floor, flat props like the rug) is painted
 * once into a cached canvas per room. Standing props are each baked into their
 * own sprite, then blitted every frame in y-sorted order together with Bobby,
 * which is what lets him walk behind the sofa and in front of the closet.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  // ------------------------------------------------------------ background

  function paintFloor(g, room) {
    var y0 = room.wallH, h = 600 - y0;
    if (room.floor === 'wood') {
      C.rect(g, -6, y0, 972, h, { seed: 'fl', fill: PAL.wood, stroke: null, hatch: 5.5, wash: 0.42, fillAlpha: 0.32 });
      for (var i = 0; i < 9; i++) {
        var yy = y0 + 8 + i * (h / 9);
        C.line(g, -6, yy, 966, yy, { seed: 'pl' + i, stroke: PAL.woodDk, lw: 1.8, wob: 1.6, passes: 1, strokeAlpha: 0.45 });
      }
    } else if (room.floor === 'dirt') {
      C.rect(g, -6, y0, 972, h, { seed: 'fl', fill: '#C9A882', stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.45 });
      var drnd = W.mulberry32(W.hash('dirt'));
      for (var dp = 0; dp < 70; dp++) {
        var dx2 = drnd() * 960, dy2 = y0 + drnd() * h;
        C.dot(g, dx2, dy2, 2 + drnd() * 4, drnd() < 0.5 ? '#B08F63' : '#8A5F38', 'dg' + dp);
      }
      // a few short tyre tracks, not stripes across the whole lot
      for (var tk = 0; tk < 6; tk++) {
        var tx2 = 60 + drnd() * 760, ty2 = y0 + 40 + drnd() * (h - 80);
        C.line(g, tx2, ty2, tx2 + 90 + drnd() * 70, ty2 + (drnd() - 0.5) * 26, {
          seed: 'trk' + tk, stroke: '#8A5F38', lw: 6, wob: 2.4, passes: 1, strokeAlpha: 0.28
        });
      }
    } else if (room.floor === 'planks') {
      // treehouse boards: wider, gappier and knottier than house flooring
      C.rect(g, -6, y0, 972, h, { seed: 'fl', fill: '#C9A882', stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.4 });
      var prnd = W.mulberry32(W.hash('planks'));
      for (var pk = 0; pk < 7; pk++) {
        var py0 = y0 + 6 + pk * (h / 7);
        C.line(g, -6, py0, 966, py0, { seed: 'pg' + pk, stroke: '#6B4A2A', lw: 3.4, wob: 1.8, passes: 1, strokeAlpha: 0.6 });
        C.line(g, -6, py0 + 3, 966, py0 + 3, { seed: 'pg2' + pk, stroke: '#E4CDA8', lw: 1.6, wob: 1.6, passes: 1, strokeAlpha: 0.4 });
        // a couple of knots and end-seams per board
        for (var kn = 0; kn < 3; kn++) {
          var kx = 60 + prnd() * 840;
          C.ellipse(g, kx, py0 + 22 + prnd() * 14, 6, 4, {
            seed: 'kn' + pk + kn, stroke: '#8A5F38', lw: 1.8, wob: 1, passes: 1, strokeAlpha: 0.55
          });
          C.line(g, kx + 120, py0, kx + 120, py0 + h / 7, {
            seed: 'sm' + pk + kn, stroke: '#8A5F38', lw: 1.6, wob: 1.2, passes: 1, strokeAlpha: 0.3
          });
        }
      }
    } else if (room.floor === 'tile') {
      C.rect(g, -6, y0, 972, h, { seed: 'fl', fill: '#CFE4D6', stroke: null, hatch: 6, wash: 0.34, fillAlpha: 0.28 });
      for (var c = 0; c < 13; c++) {
        C.line(g, c * 76, y0, c * 76, 600, { seed: 'tv' + c, stroke: '#9FC2AB', lw: 1.6, wob: 1.2, passes: 1, strokeAlpha: 0.6 });
      }
      for (var r = 0; r < 7; r++) {
        var ty = y0 + r * 66;
        C.line(g, -6, ty, 966, ty, { seed: 'th' + r, stroke: '#9FC2AB', lw: 1.6, wob: 1.2, passes: 1, strokeAlpha: 0.6 });
      }
    } else if (room.floor === 'snow') {
      C.rect(g, -6, y0, 972, h, { seed: 'fl', fill: '#E4EEF5', stroke: null, hatch: 6, wash: 0.5, fillAlpha: 0.4 });
      var srnd = W.mulberry32(W.hash('snow'));
      if (!snowTile) {
        snowTile = C.offscreen(8, 8);
        C.dot(snowTile.getContext('2d'), 4, 4, 2.4, '#FFFFFF', 'sn');
      }
      for (var sd = 0; sd < 120; sd++) {
        var ss = 0.7 + srnd() * 0.8;
        g.drawImage(snowTile, srnd() * 960 - 4, y0 + srnd() * h - 4, 8 * ss, 8 * ss);
      }
      for (var dr = 0; dr < 9; dr++) {
        C.arc(g, srnd() * 960, y0 + srnd() * h, 40 + srnd() * 60, Math.PI * 1.1, Math.PI * 1.9, {
          seed: 'drift' + dr, stroke: '#C4D6E4', lw: 2.4, wob: 2, passes: 1, strokeAlpha: 0.5
        });
      }
    } else { // grass
      C.rect(g, -6, y0, 972, h, { seed: 'fl', fill: PAL.grass, stroke: null, hatch: 5, wash: 0.4, fillAlpha: 0.34 });
      var rnd = W.mulberry32(W.hash('tufts'));
      for (var t = 0; t < 150; t++) {
        var gx = rnd() * 960, gy = y0 + rnd() * h;
        C.line(g, gx, gy, gx + (rnd() - 0.5) * 8, gy - 6 - rnd() * 7, {
          seed: 'tf' + t, stroke: PAL.grassDk, lw: 1.6, wob: 0.6, passes: 1, strokeAlpha: 0.5
        });
      }
    }
  }

  function paintWall(g, room) {
    if (!room.wallH) return;
    C.rect(g, -6, -6, 972, room.wallH + 6, {
      seed: 'wl', fill: room.wallColor || '#EFD9B4', stroke: null, hatch: 6, wash: 0.5, fillAlpha: 0.3
    });
    // wallpaper dots — positions are kept (in a module cache, not on the
    // shared room data) so the lights-out bake can turn each one into a
    // glow-in-the-dark star in exactly the same place
    // 48 dots as one baked tile blitted 48× (was 736 strokes per room bake)
    if (!wallDotTile) {
      wallDotTile = C.offscreen(14, 14);
      C.dot(wallDotTile.getContext('2d'), 7, 7, 4, PAL.white, 'wd');
    }
    // A plank wall with polka dots looks like wallpaper, so the treehouse
    // gets knot-coloured ones — they still light up as stars after dark.
    if (!knotDotTile) {
      knotDotTile = C.offscreen(14, 14);
      C.dot(knotDotTile.getContext('2d'), 7, 7, 3.4, '#8A5F38', 'kd');
    }
    var dotTile = room.floor === 'planks' ? knotDotTile : wallDotTile;
    var dots = dotsCache[room.name] = [];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 16; c++) {
        var dx = 24 + c * 62 + (r % 2) * 31, dy = 26 + r * 46;
        g.drawImage(dotTile, dx - 7, dy - 7);
        dots.push([dx, dy]);
      }
    }
    C.line(g, -6, room.wallH, 966, room.wallH, { seed: 'base', stroke: PAL.outline, lw: 3.4, wob: 1.6 });
    C.rect(g, -6, room.wallH - 12, 972, 12, {
      seed: 'skirt', fill: PAL.white, stroke: null, hatch: 4, wash: 0.6, fillAlpha: 0.3
    });
  }

  /* A room narrower than the screen needs its edges explained. The
   * treehouse deck ends in open air, so the leftover strips become
   * treetop — that is what makes the little room feel little. */
  function paintCanopy(g, room) {
    var b = room.bounds;
    var edges = [[-6, b.x + 6], [b.x + b.w - 6, 966]];
    var rnd = W.mulberry32(W.hash('canopy' + room.name));
    for (var e = 0; e < edges.length; e++) {
      var x0 = edges[e][0], x1 = edges[e][1];
      if (x1 - x0 < 8) continue;
      C.rect(g, x0, -6, x1 - x0, 612, {
        seed: 'cnp' + e, fill: PAL.grassDk, stroke: null, hatch: 5, wash: 0.62, fillAlpha: 0.55
      });
      for (var i = 0; i < 26; i++) {
        var lx = x0 + rnd() * (x1 - x0), ly = rnd() * 600;
        C.ellipse(g, lx, ly, 22 + rnd() * 16, 15 + rnd() * 10, {
          seed: 'lf' + e + i, fill: rnd() < 0.5 ? PAL.grass : '#6FA84B',
          stroke: '#4E7A3A', lw: 2.2, hatch: 4, wash: 0.72
        });
      }
      // the sawn edge of the deck
      var ex = e === 0 ? b.x + 6 : b.x + b.w - 6;
      C.line(g, ex, room.wallH || 0, ex, 600, {
        seed: 'edge' + e, stroke: '#6B4A2A', lw: 6, wob: 1.6
      });
    }
    // and the deck ends at the bottom too
    var by = b.y + b.h + 18;
    g.save();
    g.globalCompositeOperation = 'source-over';
    C.rect(g, b.x - 2, by, b.w + 4, 606 - by, {
      seed: 'deckbelow', fill: PAL.grassDk, stroke: null, hatch: 4, wash: 0.95, fillAlpha: 0.92
    });
    g.restore();
    for (var j = 0; j < 9; j++) {
      C.ellipse(g, b.x + 20 + rnd() * (b.w - 40), by + 12 + rnd() * (600 - by - 12),
        22 + rnd() * 14, 14 + rnd() * 9, {
          seed: 'blf' + j, fill: rnd() < 0.5 ? PAL.grass : '#6FA84B',
          stroke: '#4E7A3A', lw: 2.2, hatch: 4, wash: 0.72
        });
    }
    C.line(g, b.x, by, b.x + b.w, by, { seed: 'deckend', stroke: '#6B4A2A', lw: 6, wob: 1.8 });
  }

  function paintDoors(g, room) {
    room.doors.forEach(function (d, i) {
      if (d.art === 'wall') {
        var dh = 116, dy = room.wallH - dh;
        C.rect(g, d.x, dy, d.w, dh, {
          seed: 'dr' + i, fill: PAL.woodDk, stroke: PAL.outline, lw: 3.2, hatch: 4.4, wash: 0.6
        });
        C.rect(g, d.x + 9, dy + 12, d.w - 18, dh - 30, {
          seed: 'dp' + i, fill: PAL.wood, stroke: PAL.outline, lw: 2.2, hatch: 4, wash: 0.5
        });
        C.dot(g, d.x + d.w - 15, dy + dh / 2, 5, PAL.sun, 'dk' + i);
        C.text(g, d.label, d.x + d.w / 2, dy + dh - 10, {
          size: 15, align: 'center', color: PAL.white,
          outline: 3, outlineColor: PAL.outline, seed: 'dl' + i
        });
      } else if (d.art === 'sign') {
        // the board grows with the label — 'Ice Cream' used to run off the end
        var lw2 = C.textWidth(g, d.label, 17);
        var half = Math.max(46, lw2 / 2 + 30);
        var sx = W.clamp(d.x + d.w / 2, half + 12, 948 - half), sy = d.y + d.h / 2;
        C.line(g, sx, sy + 40, sx, sy - 30, { seed: 'sp' + i, stroke: PAL.woodDk, lw: 7, wob: 1 });
        C.roundRect(g, sx - half, sy - 62, half * 2, 34, 6, {
          seed: 'sb' + i, fill: PAL.wood, stroke: PAL.outline, lw: 2.8, hatch: 3.4, wash: 0.7
        });
        C.text(g, d.label, sx, sy - 40, {
          size: 17, align: 'center', color: PAL.outline, seed: 'st' + i
        });
        // an arrow pointing off the edge
        var dirx = d.x < 480 ? -1 : 1;
        C.poly(g, [[sx + dirx * (half - 16), sy - 52], [sx + dirx * (half - 16), sy - 38],
                   [sx + dirx * (half - 4), sy - 45]], {
          seed: 'sa' + i, fill: PAL.roof, stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.85
        });
      } else if (d.art === 'mat') {
        C.roundRect(g, d.x, d.y, d.w, d.h, 8, {
          seed: 'mat' + i, fill: PAL.roof, stroke: PAL.outline, lw: 2.6, hatch: 4, wash: 0.5, fillAlpha: 0.4
        });
        C.text(g, d.label, d.x + d.w / 2, d.y + d.h - 9, {
          size: 14, align: 'center', color: PAL.white, outline: 2.4, seed: 'ml' + i
        });
      }
    });
  }

  function buildBackground(name) {
    var room = W.ROOMS[name];
    var cv = C.offscreen(960, 600);
    var g = cv.getContext('2d');
    g.drawImage(C.paper(960, 600, 'paper' + name), 0, 0);
    paintWall(g, room);
    paintFloor(g, room);
    if (room.frame === 'leaves') paintCanopy(g, room);
    paintDoors(g, room);
    // flat props (rugs, flowers) belong on the ground, never in the sort
    effectiveProps(name).forEach(function (p) {
      if (W.PROPS[p.kind].h === 0) {
        var def = W.PROPS[p.kind];
        def.draw(g, p.x, p.y, 'prop' + p.kind + p.x + '_' + p.y, p.tint);
      }
    });
    return cv;
  }

  /* Some props swap out as the world changes — the buildable tree becomes
   * the treehouse once Bobby has built it. */
  /* Machines belong to a site under construction; the wrecking ball only
   * turns up once there is something worth knocking down. */
  function siteGear(p) {
    var proj = p.untilBuilt || p.needsBuilt;
    if (!proj) return true;
    var done = ((W.game.state.builds || {})[proj] || 0) >= W.lastBuildStage(proj);
    return p.needsBuilt ? done : !done;
  }
  W.siteGear = siteGear;

  function effectiveProps(name) {
    var base = W.ROOMS[name].props.filter(siteGear).map(function (p) {
      // a plot nobody has broken yet is still lawn
      if (p.plot) {
        var bucket = W.game.state.stations[name + ':' + p.plot];
        if (!bucket || bucket.stage === undefined || bucket.stage < 0) {
          var sd = {};
          for (var k2 in p) sd[k2] = p[k2];
          sd.kind = 'sodPatch';
          return sd;
        }
      }
      // the tower grows a stage at a time, just like the house
      if (p.tower) {
        var tw = {};
        for (var k6 in p) tw[k6] = p[k6];
        tw.kind = 'towerS' + Math.max(0, Math.min(4, (W.game.state.builds || {}).skyscraper || 0));
        return tw;
      }
      // the glass creeps up the tower as each window panel is fitted
      if (p.glaze) {
        var tb2 = W.game.state.stations['site2:toolbox:' +
                    (W.ROOMS.site2.stations.map(function (q) { return q.kind; }).indexOf('toolbox'))];
        var bands = (tb2 && tb2.nails) || 0;
        if (!bands) return null;
        var gl = {};
        for (var k7 in p) gl[k7] = p[k7];
        gl.kind = 'towerGlass' + Math.min(3, bands);
        return gl;
      }
      // the friends' house grows a stage at a time
      if (p.stage) {
        var hs = {};
        for (var k4 in p) hs[k4] = p[k4];
        // stage N of WORK shows the art for stage N-1 completed: clearing the
        // lot still shows pegs, pouring shows the slab arrive, the crane
        // makes the walls appear, and the roof only exists once it is nailed
        hs.kind = 'houseS' + Math.max(0, Math.min(3, ((W.game.state.builds || {}).friendHouse || 0) - 1));
        return hs;
      }
      // things Bobby has yet to build show a chalk outline instead
      if (p.buildSite && !(W.game.state.builds || {})[p.buildSite]) {
        if (!p.marker) return null;
        var mk = {};
        for (var k5 in p) mk[k5] = p[k5];
        mk.kind = 'buildSpot';
        mk.tint = p.marker;
        return mk;
      }
      if (p.kind === 'swingSet' && !(W.game.state.builds || {}).swing) {
        var bk = {};
        for (var k3 in p) bk[k3] = p[k3];
        bk.kind = 'swingBroken';
        return bk;
      }
      if (p.buildable && W.game.state.builtTreehouse) {
        var q = {};
        for (var k in p) q[k] = p[k];
        q.kind = 'treehouse';
        q.x = p.x - 60;
        return q;
      }
      return p;
    }).filter(Boolean);
    // purchased decor lands on the room's decor spots
    var decor = W.game.state.decor[name] || [];
    var spots = W.ROOMS[name].decorSpots || [];
    decor.forEach(function (d, i) {
      if (!spots[i] || !W.PROPS[d.kind]) return;
      base.push({ kind: d.kind, x: spots[i][0], y: spots[i][1], tint: d.tint });
    });
    return base;
  }
  W.effectiveProps = effectiveProps;

  function buildSprites(name) {
    return effectiveProps(name)
      .filter(function (p) { return W.PROPS[p.kind].h !== 0; })
      .map(function (p) {
        var sp = W.makePropSprite(p);
        sp.kind = p.kind;          // so a machine can drive away from its spot
        return sp;
      });
  }


  /* The lights-out version of a room: the same background, dimmed to deep
   * purple, with the wallpaper dots repainted as glow-in-the-dark stars. */
  function buildNightBackground(name, dayBg) {
    var room = W.ROOMS[name];
    var cv = C.offscreen(960, 600);
    var g = cv.getContext('2d');
    g.drawImage(dayBg, 0, 0);

    g.save();
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#3B2C63';
    g.fillRect(0, 0, 960, 600);
    g.restore();
    g.save();
    g.globalAlpha = 0.28;
    g.fillStyle = '#241640';
    g.fillRect(0, 0, 960, 600);
    g.restore();

    // exits must survive the dark: a soft glow ring over every door zone,
    // then the mats/labels repainted at full brightness
    room.doors.forEach(function (d, i) {
      var cx = d.x + d.w / 2, cy = d.art === 'wall' ? room.wallH - 58 : d.y + d.h / 2;
      if (d.art === 'sign') cx = W.clamp(cx, 58, 902);   // the board, not the edge
      var gr = g.createRadialGradient(cx, cy, 8, cx, cy, 95);
      gr.addColorStop(0, 'rgba(242,193,78,0.42)');
      gr.addColorStop(1, 'rgba(242,193,78,0)');
      g.fillStyle = gr;
      g.fillRect(cx - 95, cy - 95, 190, 190);
      // blot out the dimmed baked label first, or the bright repaint ghosts
      // the same baseline the daylight bake used, or the bright repaint
      // lands beside the dim one and every label reads twice
      var ly = d.art === 'wall' ? room.wallH - 10 :
               d.art === 'sign' ? d.y + d.h / 2 - 40 : cy + 6;
      var lw2 = C.textWidth(g, d.label, 15) + 14;
      g.save();
      g.globalAlpha = 0.85;
      g.fillStyle = '#241640';
      g.fillRect(cx - lw2 / 2, ly - 16, lw2, 22);
      g.restore();
      C.text(g, d.label, cx, ly, {
        size: 15, align: 'center', color: PAL.sun,
        outline: 3, outlineColor: PAL.outline, seed: 'ndl' + i
      });
    });

    // Outdoors there is no wallpaper to turn into stars, so the sky gets
    // a real one — this is the whole point of sleeping on the mountain.
    if (!room.wallH) {
      var srnd = W.mulberry32(W.hash('stars' + name));
      for (var s2 = 0; s2 < 90; s2++) {
        var sx2 = srnd() * 960, sy2 = srnd() * 420;
        var sr2 = 2 + srnd() * 4;
        var sg = g.createRadialGradient(sx2, sy2, 1, sx2, sy2, sr2 * 3);
        sg.addColorStop(0, 'rgba(255,252,214,0.5)');
        sg.addColorStop(1, 'rgba(255,252,214,0)');
        g.fillStyle = sg;
        g.fillRect(sx2 - sr2 * 3, sy2 - sr2 * 3, sr2 * 6, sr2 * 6);
        C.star(g, sx2, sy2, sr2, '#FFFCE0', 'os' + s2);
      }
      // one constellation, joined up — a little bear, naturally
      var CONST = [[120, 90], [180, 70], [240, 96], [300, 78], [330, 130], [280, 160], [210, 150]];
      for (var c2 = 0; c2 < CONST.length; c2++) {
        C.star(g, CONST[c2][0], CONST[c2][1], 7, '#CFFFE0', 'cs' + c2);
        if (c2) {
          C.line(g, CONST[c2 - 1][0], CONST[c2 - 1][1], CONST[c2][0], CONST[c2][1], {
            seed: 'cl' + c2, stroke: '#CFFFE0', lw: 1.6, wob: 1.2, passes: 1, strokeAlpha: 0.4
          });
        }
      }
      C.text(g, 'the Little Bear', 225, 190, {
        size: 14, align: 'center', color: '#CFFFE0', seed: 'consn'
      });
    }

    // the dots become stars
    var dots = dotsCache[room.name] || [];
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var gr = g.createRadialGradient(d[0], d[1], 1, d[0], d[1], 16);
      gr.addColorStop(0, 'rgba(198,255,214,0.55)');
      gr.addColorStop(1, 'rgba(198,255,214,0)');
      g.fillStyle = gr;
      g.fillRect(d[0] - 16, d[1] - 16, 32, 32);
      C.star(g, d[0], d[1], 5.5, '#CFFFE0', 'gs' + i);
    }
    return cv;
  }

  // ------------------------------------------------------------- the scene

  var S = {
    room: null, name: '', solids: [], sprites: [], bg: null,
    player: null, npcs: [], stations: [],
    prompt: null, promptStation: null, talkTo: null, lock: 0,
    pickupTarget: null,       // nearest dropped item in reach
    seated: null,             // the chair Bobby is sitting on
    sleeping: null,           // { phase, t, sleepover } bedtime sequence
    idleT: 0, wiggleT: 0      // the alive-when-still wiggle
  };

  function lightsOn(name) {
    var v = W.game.state.lights[name];
    return v === undefined ? true : v;
  }

  /* The dark version costs about as much as the room itself to bake, and most
   * rooms never have their lights turned off, so it waits until it's needed. */
  function nightBg(name) {
    if (!nightCache[name]) nightCache[name] = buildNightBackground(name, bgCache[name]);
    return nightCache[name];
  }

  /* Every ghost's true colour, waiting to be zapped back into it. */
  var GHOST_COLORS = {
    g1: '#E8A0B4', g2: '#8FD0EE', g3: '#F2C14E',
    g4: '#9CCB6B', g5: '#B48FD6', g6: '#E8834E'
  };
  var GHOST_NAMES = {
    g1: 'Rosie', g2: 'Blue', g3: 'Sunny', g4: 'Sprout', g5: 'Plum', g6: 'Tangi'
  };
  W.GHOST_COLORS = GHOST_COLORS;

  /* Where a room's friends and crowd start out. */
  function spawnResidents(name) {
    var room = W.ROOMS[name];
    var st = W.game.state;
    var out = [];
    var b = room.bounds;

    // friends who live here, unless they're already following Bobby
    var solids = W.solidsFor(name);
    var placed = [];

    /* Find somewhere clear, and not on top of someone already standing. */
    function spot(seed) {
      var rnd = W.mulberry32(W.hash(name + seed));
      for (var tries = 0; tries < 60; tries++) {
        var x = b.x + 40 + rnd() * (b.w - 80);
        var y = b.y + 30 + rnd() * (b.h - 60);
        if (!W.canStand(room, solids, x, y)) continue;
        var clash = placed.some(function (q) { return Math.hypot(q[0] - x, q[1] - y) < 86; });
        if (clash) continue;
        placed.push([x, y]);
        return [x, y];
      }
      return [b.x + b.w / 2, b.y + b.h / 2];
    }

    // Friends live wherever you last left them. The rooms' resident lists
    // seed the map once; after that, saying Dee somewhere moves them there.
    // Seed any resident this save has never heard of. Doing it per-friend
    // rather than only for a brand new game matters: a save made before a
    // character existed would otherwise leave their room empty forever.
    // Anyone with an entry stays where they were left, and anyone in the
    // party is travelling (talkTo deletes their entry), so neither is moved.
    if (!st.friendRooms) st.friendRooms = {};
    Object.keys(W.ROOMS).forEach(function (rn) {
      (W.ROOMS[rn].residents || []).forEach(function (k) {
        if (st.friendRooms[k] === undefined && st.party.indexOf(k) < 0) {
          st.friendRooms[k] = rn;
        }
      });
    });
    var boxSlot = 0;
    Object.keys(st.friendRooms).forEach(function (key) {
      if (st.friendRooms[key] !== name) return;
      if (st.party.indexOf(key) >= 0) return;
      // you cannot bump into yourself: the friend you are PLAYING stays
      // out of the room (Butterball only stands in the park when Bobby
      // is the one being played)
      if (key === st.hero) return;
      // a room can pin a resident where they belong — Webs stays behind
      // his bar rather than wandering off mid-round
      var fixed = (room.residentSpots || {})[key];
      var pt = fixed || spot('res' + key);
      var a = W.makeFriend(key, pt[0], pt[1]);
      a.mode = fixed ? 'hold' : 'wander';
      if (fixed) a.dir = 'down';
      // a quiet critter that has moved into its box STAYS in its box —
      // snoozing by its own little door until somebody asks it along
      if (name === 'living' && st.builds && st.builds.critterBox &&
          key.indexOf('critter') === 0) {
        var bx = null;
        (W.ROOMS.living.props || []).forEach(function (p2) {
          if (p2.kind === 'critterBox') bx = p2;
        });
        if (bx) {
          // parked right below its own little doorway (close enough for A);
          // the actor is hidden — the box's drawOn draws it asleep IN the door
          a.x = bx.x + 22 + boxSlot * 26;
          a.y = bx.y + 40;
          a.mode = 'hold';
          a.hidden = true;
          a.data.atBox = true;
          a.data.boxSlot = boxSlot;
          boxSlot++;
        }
      }
      out.push(a);
    });

    /* The haunted house's residents: grey until somebody zaps their
     * colours back, and cheerful forever after. */
    (room.ghosts || []).forEach(function (gk, gi) {
      var gp = spot('ghost' + gk);
      var lit = !!(st.ghosts && st.ghosts[gk]);
      var gh = new W.Actor({
        char: 'ghost', tint: lit ? GHOST_COLORS[gk] : null,
        x: gp[0], y: gp[1], speed: 62, mood: lit ? GHOST_COLORS[gk] : '#C9C4D4'
      });
      gh.ghostKey = gk;
      gh.isGhost = true;
      gh.name = GHOST_NAMES[gk] || 'Ghost';
      gh.scale = 0.95;
      gh.mode = 'wander';
      gh.data.chatIn = 5 + Math.random() * 9;
      gh.data.lit = lit;
      out.push(gh);
    });

    for (var c = 0; c < (room.crowd || 0); c++) {
      var cp = spot('crowd' + c);
      out.push(W.makeCrowd(c, cp[0], cp[1]));
    }

    // whoever is following Bobby comes along — behind him if there's room,
    // otherwise anywhere walkable (a blind offset used to strand them out of
    // bounds at edge-of-room spawns, frozen forever)
    // every adopted pet comes along — unless it's been told to stay put
    W.pets.all().forEach(function (pkey, pi) {
      var rec = W.pets.get(pkey);
      if (rec.home && rec.home !== name) return;
      var pang = Math.PI * (0.6 + pi * 0.22);
      var petx = S.spawnX + Math.cos(pang) * (46 + pi * 16);
      var pety = S.spawnY + Math.sin(pang) * (40 + pi * 12);
      if (!W.canStand(room, solids, petx, pety)) {
        var pp = spot('pet' + pkey); petx = pp[0]; pety = pp[1];
      }
      var pet = new W.Actor({
        char: W.PET_CHARS[pkey] || 'pet', x: petx, y: pety,
        speed: pkey === 'cracker' ? 165 : 175, mood: PAL.accent
      });
      pet.isPet = true;
      pet.petKey = pkey;
      pet.name = rec.name;
      pet.scale = pkey === 'cracker' ? 0.8 : 0.9;
      pet.mode = rec.home ? 'wander' : 'follow';
      pet.data.slot = st.party.length + pi;   // trots at the back of the line
      pet.data.chatIn = 6 + Math.random() * 8;
      out.push(pet);
    });

    // an old save could hold a key that is not a friend at all; drop it
    // rather than trying to spawn it
    st.party = st.party.filter(function (k) { return !!W.FRIENDS[k]; });

    st.party.forEach(function (key, i) {
      // fan out on an arc behind Bobby — a straight 26px line stacked the
      // whole party into one unreadable pile on top of him
      var ang = Math.PI * 0.75 + i * 0.5;
      var fx = S.spawnX + Math.cos(ang) * 62;
      var fy = S.spawnY + Math.sin(ang) * 44;
      if (!W.canStand(room, solids, fx, fy)) {
        var pt2 = spot('party' + key);
        fx = pt2[0]; fy = pt2[1];
      }
      var a = W.makeFriend(key, fx, fy);
      a.mode = 'follow';
      a.data.slot = i;
      out.push(a);
    });

    return out;
  }

  var bgCache = {}, nightCache = {}, spriteCache = {}, dotsCache = {};
  var knotDotTile = null;
  var wallDotTile = null, snowTile = null;

  /* Throw away a room's baked art so it rebuilds — used when the treehouse
   * appears and the outdoor scenery changes. */
  /* Queue every pose a room will need, so a fade can bake them in advance. */
  W.warmRoom = function (name) {
    var room = W.ROOMS[name];
    if (!room) return;
    W.warmChar('bobby', null, W.game.state.suit, 4);
    var seen = {};
    var fr = W.game.state.friendRooms || {};
    Object.keys(fr).forEach(function (k) {
      if (fr[k] !== name) return;
      var f = W.FRIENDS[k];
      if (!f) return;
      var id = f.char + '|' + (f.tint || '');
      if (seen[id]) return;
      seen[id] = 1;
      W.warmChar(f.char, f.tint || null, 'none', 4);
    });
    W.game.state.party.forEach(function (k) {
      var f = W.FRIENDS[k];
      if (f) W.warmChar(f.char, f.tint || null, 'none', 4);
    });
    for (var c = 0; c < (room.crowd || 0); c++) {
      var a = W.makeCrowd(c, 0, 0);
      W.warmChar(a.char, a.tint, 'none', 1);
    }
  };

  W.rebuildRoom = function (name) {
    delete bgCache[name];
    delete nightCache[name];
    delete spriteCache[name];
    if (S.name === name) S.enter({ room: name, spawn: [S.player.x, S.player.y] });
  };

  /* Stations must not re-enter the scene from inside the update loop — that
   * swaps S.stations while it is being iterated. Queue it for next frame. */
  var pendingRebuild = null;
  W.requestRebuild = function (name) { pendingRebuild = name; };

  /* Re-bake just ONE prop's sprite (e.g. the trophy case after adding
   * crystals) — tearing down the whole room cost 250-400ms. */
  W.rebuildProp = function (roomName, kind) {
    var sprites = spriteCache[roomName];
    if (!sprites) return;
    var props = W.effectiveProps(roomName).filter(function (p) { return W.PROPS[p.kind].h !== 0; });
    for (var i = 0; i < props.length; i++) {
      if (props[i].kind === kind) sprites[i] = W.makePropSprite(props[i]);
    }
    if (S.name === roomName) S.sprites = sprites;
  };

  S.enter = function (param) {
    var G = W.game;
    var name = (param && param.room) || G.state.room || 'living';
    S.name = name;
    S.room = W.ROOMS[name];
    if (!S.room) throw new Error('no such room: ' + name);
    G.state.room = name;

    if (!bgCache[name]) bgCache[name] = buildBackground(name);
    S.bg = bgCache[name];

    if (!spriteCache[name]) spriteCache[name] = buildSprites(name);
    S.sprites = spriteCache[name];
    S.solids = W.solidsFor(name);
    // the teacup ride's canopy hangs over everything, riders included
    S.canopies = W.effectiveProps(name).filter(function (pr) {
      return pr.kind === 'carousel';
    }).map(function (pr) { return [pr.x + 110, pr.y + 40]; });
    S.cupT = 0;
    S.coasterDecks = W.effectiveProps(name).filter(function (pr) {
      return pr.kind === 'coasterDeck';
    }).map(function (pr) { return [pr.x + 95, pr.y - 26]; });
    S.stations = W.buildStations(name);

    // A job belongs to its room; walking out clocks you off.
    if (W.service.active() && W.service.room() !== name) {
      W.service.stop(true);
      W.say('Job closed for now.');
    }

    var sp = (param && param.spawn) || S.room.spawn;
    S.spawnX = sp[0]; S.spawnY = sp[1];

    S.player = new W.Actor({
      char: W.heroChar(), x: sp[0], y: sp[1], isPlayer: true,
      speed: W.heroChar() === 'butterball' ? 196 : W.WALK_SPEED
    });
    S.player.dir = (param && param.dir) || 'down';
    S.seated = null;
    S.sleeping = null;
    S.riding = null;
    S.machineCtl = null;
    S.mealSeq = null;
    S.mealCalled = false;
    S.idleT = 0; S.wiggleT = 0;
    S.npcs = spawnResidents(name);
    S.lock = 0.25;

    // keep everyone's poses baked ahead of time
    W.warmChar('bobby', null, G.state.suit, 4);
    S.npcs.forEach(function (a) { W.warmChar(a.char, a.tint, 'none', a.isCrowd ? 1 : 4); });

    // First visits used to pop a head bubble that covered the very prop the
    // room is about; the permanent name plate bottom-left is plenty.
    if (!G.state.visited[name]) G.state.visited[name] = true;
    G.ensureIdeas();
    if (W.save) W.save.auto();

    // Chew through the pose queue once, hard, so even a teleport entry (dev
    // shortcuts, mission returns) starts with most of the cast baked. Fade
    // entries arrive with the queue already drained, so this costs nothing.
    var eb = performance.now() + 25;
    while (performance.now() < eb && W.warmStep()) { /* next */ }
  };

  function inZone(x, y, z) {
    return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
  }

  /* Distance from a point to a rect — 0 inside. Stations trigger on
   * PROXIMITY, so every prop works from every side, not just the front. */
  function rectDist(px, py, z) {
    var dx = Math.max(z.x - px, 0, px - (z.x + z.w));
    var dy = Math.max(z.y - py, 0, py - (z.y + z.h));
    return Math.hypot(dx, dy);
  }
  var REACH = 38;

  function pickLine(id) {
    var l = W.LINES[id];
    return l ? l[Math.floor(Math.random() * l.length)] : null;
  }

  /* Nearest standable point to (x,y), searching outward in rings. The room
   * spawn is the last resort: a child wedged inside the scenery with no way
   * out is the worst bug this game can have. */
  function spotNear(x, y) {
    for (var r = 12; r <= 220; r += 12) {
      for (var a = 0; a < 12; a++) {
        var nx = x + Math.cos(a * Math.PI / 6) * r;
        var ny = y + Math.sin(a * Math.PI / 6) * r;
        if (W.canStand(S.room, S.solids, nx, ny)) return [nx, ny];
      }
    }
    var sp = S.room.spawn;
    return W.canStand(S.room, S.solids, sp[0], sp[1]) ? [sp[0], sp[1]] : null;
  }
  S.spotNear = spotNear;

  /* ---- rides -------------------------------------------------------
   * The swing and the see-saw both park Bobby on a moving thing and let
   * a friend join in. Arrows (or X) get off again.
   */

  /* The first friend trailing along, or null. */
  S.follower = function () {
    for (var i = 0; i < S.npcs.length; i++) {
      var n = S.npcs[i];
      if (n.friendKey && n.mode === 'follow') return n;
    }
    return null;
  };

  S.mount = function (kind, st) {
    if (kind === 'carousel') {
      var mate = S.follower();
      S.riding = { kind: 'carousel', st: st, t: 0, partner: mate };
      if (mate) { mate.mode = 'hold'; mate.hidden = true; mate.says('spinnnnning!', 3); }
      W.say('Hold on tight — the cups spin!', PAL.accent);
      if (W.audio) { W.audio.play('chime'); W.audio.play('cheer'); }
      return;
    }
    if (kind === 'flop') {
      S.riding = { kind: 'flop', st: st, t: 0, partner: null };
      W.fx.dust(st.x + st.w / 2, st.y + st.h, 5);
      W.say('Flooooomp.', PAL.accent);
      if (W.audio) W.audio.play('land');
      return;
    }
    var partner = S.follower();
    S.riding = { kind: kind, st: st, t: 0, partner: partner };
    if (partner) {
      partner.mode = 'hold';
      partner.hidden = true;
      partner.says(kind === 'swing' ? 'Wheee!' : 'Up we go!', 2.4);
    }
    W.say(kind === 'swing' ? 'Wheeeee!' : 'Up... and down... and up!', PAL.accent);
    if (W.audio) W.audio.play('cheer');
  };

  S.dismount = function () {
    if (!S.riding) return;
    var r = S.riding;
    if (r.partner) {
      r.partner.hidden = false;
      r.partner.mode = 'follow';
    }
    S.player.x = r.st.x + r.st.w / 2;
    S.player.y = r.st.y + r.st.h + 18;
    S.riding = null;
  };

  /* Where a rider sits right now: the swing swings, the plank tips. */
  S.ridePos = function (which) {
    var r = S.riding, st = r.st;
    if (r.kind === 'carousel') {
      // riders sit in cups 0 and 2, on opposite sides of the mast
      return cupSlot(st.x + st.w / 2, st.y + 6, which ? 2 : 0, S.cupT || 0);
    }
    if (r.kind === 'flop') {
      // a big squash on landing that wobbles out into a slouch
      var settle = Math.max(0, 0.5 - r.t) * 2;              // 1 -> 0
      return {
        x: st.x + st.w / 2,
        y: st.y + st.h / 2 + 14 + settle * 6,
        spin: Math.sin(r.t * 1.6) * 0.05,
        scale: 0.82 - settle * 0.06,
        squash: 1 + settle * 0.12
      };
    }
    if (r.kind === 'swing') {
      var pivot = [st.x + 60, st.y - 66];
      var ang = Math.sin(r.t * 2.1) * 0.62 * (which ? -1 : 1);
      var L = 58;
      return {
        x: pivot[0] + (which ? 22 : -22) + Math.sin(ang) * L,
        y: pivot[1] + Math.cos(ang) * L,
        spin: -ang * 0.55
      };
    }
    var tip = Math.sin(r.t * 1.7) * 26;
    return {
      x: st.x + (which ? st.w - 22 : 22),
      y: st.y + 4 + (which ? -tip : tip),
      spin: 0
    };
  };

  /* ---- the building site -------------------------------------------
   * Bobby drives the machines HIMSELF. Z at a machine climbs into the cab;
   * arrows steer it around the site; each machine has its own little job:
   *   bulldozer — shove the junk piles off the lot
   *   mixer     — hold Z over the lot to pour the floor
   *   crane     — Z hooks a wall panel, carry it over the lot, Z lowers it
   *   wrecking  — Z near the house swings the ball; three hits = KABOOM
   * X hops out anytime (the machine trundles back to its parking spot).
   */
  var LOT = { x: 370, y: 290, w: 220, h: 86 };     // the pegged-out plot

  S.mountMachine = function (st, kind, proj) {
    if (S.machineCtl) return;
    var sp = null;
    for (var i = 0; i < S.sprites.length; i++) {
      if (S.sprites[i].kind === kind) { sp = S.sprites[i]; break; }
    }
    var home = [st.x + st.w / 2, st.y + st.h / 2];
    var ctl = {
      st: st, kind: kind, sprite: sp, proj: proj || 'friendHouse',
      x: home[0], y: home[1], home: home, face: 1,
      exiting: 0, done: false
    };
    // where the business end of the machine sits, relative to where Bobby
    // steers it — the crane's hook and the wrecker's arm tip live way off
    // the vehicle base, and the jobs have to judge by THEM, not the treads
    var propPos = null;
    W.effectiveProps(S.name).forEach(function (pp) {
      if (pp.kind === kind) propPos = pp;
    });
    if (propPos) {
      var TIP = { crane: [138, -118], wreckingBall: [108, -172] };
      var toff = TIP[kind];
      if (toff) {
        ctl.tip = [propPos.x + toff[0] - home[0], propPos.y + toff[1] - home[1]];
      }
      ctl.groundOff = propPos.y + (W.PROPS[kind].d || 40) - 44 - home[1];
    }
    // the per-machine job
    if (kind === 'bulldozer') {
      // junk starts ON the lot; push each pile clear of it
      var rnd = W.mulberry32(W.hash('junk' + W.game.state.day));
      ctl.junk = [];
      for (var j = 0; j < 5; j++) {
        ctl.junk.push({
          x: LOT.x + 24 + rnd() * (LOT.w - 48),
          y: LOT.y + 16 + rnd() * (LOT.h - 24),
          cleared: false
        });
      }
    } else if (kind === 'mixer') {
      ctl.pour = 0;
    } else if (kind === 'crane') {
      ctl.placed = 0;
      ctl.carrying = false;
      ctl.stack = [700, 260];          // where the wall panels wait
    } else if (kind === 'wreckingBall') {
      ctl.hits = 0;
      ctl.swing = 0;
    }
    S.machineCtl = ctl;
    if (W.audio) W.audio.play('thud');
    return true;
  };

  function exitMachine() {
    var ctl = S.machineCtl;
    S.machineCtl = null;
    // the machine trundles home off-screen; Bobby hops down where it stood
    var px = ctl.x, py = ctl.y + 44;
    if (!W.canStand(S.room, S.solids, px, py)) {
      var out = spotNear(px, py);
      if (out) { px = out[0]; py = out[1]; }
    }
    S.player.x = px;
    S.player.y = py;
  }

  function updateMachine(dt) {
    var ctl = S.machineCtl, G = W.game;
    var a = W.input.axis();
    var sp = ctl.kind === 'bulldozer' ? 150 : 170;
    var mx = a[0] * sp * dt, my = a[1] * sp * dt;
    var b = S.room.bounds;
    ctl.x = W.clamp(ctl.x + mx, b.x + 40, b.x + b.w - 40);
    ctl.y = W.clamp(ctl.y + my, b.y + 30, b.y + b.h - 10);
    if (a[0]) ctl.face = a[0] > 0 ? 1 : -1;
    ctl.moving = !!(a[0] || a[1]);
    if (ctl.moving && Math.random() < dt * 8) W.fx.dust(ctl.x - ctl.face * 40, ctl.y + 16, 1);

    var overLot = ctl.x > LOT.x - 10 && ctl.x < LOT.x + LOT.w + 10 &&
                  ctl.y > LOT.y - 10 && ctl.y < LOT.y + LOT.h + 30;

    // ---- the jobs
    if (ctl.kind === 'bulldozer') {
      var left = 0;
      for (var j = 0; j < ctl.junk.length; j++) {
        var jk = ctl.junk[j];
        if (jk.cleared) continue;
        left++;
        // the blade shoves any pile it touches along the drive direction
        if (Math.hypot(jk.x - ctl.x, jk.y - ctl.y) < 56 && ctl.moving) {
          jk.x += mx * 1.6;
          jk.y += my * 1.6;
          if (Math.random() < dt * 10) W.fx.dust(jk.x, jk.y + 8, 1);
          var onLot = jk.x > LOT.x - 14 && jk.x < LOT.x + LOT.w + 14 &&
                      jk.y > LOT.y - 14 && jk.y < LOT.y + LOT.h + 14;
          if (!onLot) {
            jk.cleared = true;
            left--;
            W.fx.sparkle(jk.x, jk.y, 8, 50);
            if (W.audio) W.audio.play('blip');
          }
        }
      }
      ctl.progress = 'Cleared ' + (5 - left) + '/5';
      if (left === 0 && !ctl.done) { ctl.done = true; finishJob(); }
    } else if (ctl.kind === 'mixer') {
      if (W.input.down('act') && overLot) {
        ctl.pour = Math.min(1, ctl.pour + dt / 4);
        if (Math.random() < dt * 12) {
          W.fx.dust(ctl.x + ctl.face * 40, ctl.y + 10, 1);
        }
        if (W.audio && Math.random() < dt * 2) W.audio.play('pour');
      }
      ctl.progress = 'Poured ' + Math.round(ctl.pour * 100) + '%';
      if (ctl.pour >= 1 && !ctl.done) { ctl.done = true; finishJob(); }
    } else if (ctl.kind === 'crane') {
      // everything is judged at the HOOK — it hangs well right of the cab
      var hookX = ctl.x + (ctl.tip ? ctl.tip[0] : 40);
      var hookY = ctl.y + (ctl.tip ? ctl.tip[1] : -120);
      ctl.hookX = hookX; ctl.hookY = hookY;
      ctl.hookOverLot = hookX > LOT.x + 10 && hookX < LOT.x + LOT.w - 10 &&
                        ctl.y > LOT.y - 40 && ctl.y < LOT.y + LOT.h + 60;
      ctl.nearStack = Math.hypot(ctl.stack[0] - hookX, ctl.stack[1] - hookY) < 110 ||
                      Math.hypot(ctl.stack[0] - ctl.x, ctl.stack[1] - ctl.y) < 110;
      if (ctl.lower) {
        // the panel rides the cable down, kisses the ground, dust settles
        ctl.lower.t += dt;
        if (ctl.lower.t >= 0.8) {
          ctl.lower = null;
          ctl.placed++;
          W.fx.dust(hookX, ctl.y + 10, 6);
          W.fx.sparkle(hookX, hookY, 8, 50);
          if (W.audio) W.audio.play('thud');
        }
      } else if (W.input.hit('act')) {
        if (!ctl.carrying && ctl.nearStack && ctl.placed < 3) {
          ctl.carrying = true;
          if (W.audio) W.audio.play('clack');
        } else if (ctl.carrying && ctl.hookOverLot) {
          ctl.carrying = false;
          ctl.lower = { t: 0 };
          if (W.audio) W.audio.play('pour');
        } else if (ctl.carrying) {
          W.say('Swing the hook over the lot first!');
        } else if (ctl.placed < 3) {
          W.say(ctl.proj === 'skyscraper'
            ? 'The girders are stacked by the fence!'
            : 'The wall panels are stacked by the fence!');
        }
      }
      ctl.progress = (ctl.proj === 'skyscraper'
        ? ['Uprights', 'Cross-beams', 'Bracing'][Math.min(ctl.placed, 2)] + ' ' + ctl.placed + '/3'
        : 'Walls ' + ctl.placed + '/3');
      if (ctl.placed >= 3 && !ctl.done && !ctl.lower) { ctl.done = true; finishJob(); }
    } else if (ctl.kind === 'wreckingBall') {
      var pivX = ctl.x + (ctl.tip ? ctl.tip[0] : 46);
      var pivY = ctl.y + (ctl.tip ? ctl.tip[1] : -150);
      if (ctl.swing > 0) {
        ctl.swing -= dt;
        if (!ctl.boomed && ctl.swing < 0.4) {
          ctl.boomed = true;
          ctl.hits++;
          W.fx.dust(pivX + 40, ctl.y + 10, 8);
          S.shakeT = 0.3;
          if (W.audio) W.audio.play('boom');
          if (ctl.hits >= 3 && !ctl.done) {
            ctl.done = true;
            W.demolishHouse(ctl.proj);
            exitMachine();
            return;
          }
        }
      } else if (W.input.hit('act')) {
        var nearHouse = Math.hypot((LOT.x + LOT.w / 2) - pivX, (LOT.y + LOT.h / 2) - ctl.y) < 240;
        if (nearHouse) {
          ctl.swing = 0.8;
          ctl.boomed = false;
        } else {
          W.say('Drive closer to the house first!');
        }
      }
      ctl.progress = 'Smashes ' + ctl.hits + '/3';
    }

    if (W.input.hit('back') && !ctl.done) {
      W.say('Hopping down — the job can wait.');
      exitMachine();
    }
  }

  /* The job is done: bank the stage, then Bobby climbs down. */
  function finishJob() {
    var ctl = S.machineCtl;
    W.advanceHouse(ctl.proj);
    // a beat to enjoy the sparkles before hopping out
    ctl.doneT = 0.9;
  }

  /* Overlays the machine mode needs: junk, wet concrete, the hanging panel. */
  var junkTile = null, panelTile = null, girderImg = null;

  /* What the crane is carrying: a timber wall panel, or a steel girder. */
  function panelImg() {
    if (!panelTile) {
      panelTile = C.offscreen(90, 60);
      var g2 = panelTile.getContext('2d');
      C.rect(g2, 8, 8, 74, 44, { seed: 'wp', fill: PAL.wood, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.75 });
      C.line(g2, 8, 30, 82, 30, { seed: 'wpl', stroke: PAL.woodDk, lw: 2, wob: 1, passes: 1, strokeAlpha: 0.6 });
    }
    return panelTile;
  }
  function girderTile() {
    if (!girderImg) {
      girderImg = C.offscreen(104, 40);
      var g3 = girderImg.getContext('2d');
      C.rect(g3, 6, 6, 92, 9, { seed: 'gtop', fill: '#9AA6AE', stroke: PAL.outline, lw: 2.4, hatch: 2.6, wash: 0.72 });
      C.rect(g3, 6, 25, 92, 9, { seed: 'gbot', fill: '#9AA6AE', stroke: PAL.outline, lw: 2.4, hatch: 2.6, wash: 0.72 });
      C.rect(g3, 46, 13, 12, 14, { seed: 'gweb', fill: '#8A96A0', stroke: PAL.outline, lw: 2.2, hatch: 2.4, wash: 0.72 });
      for (var b3 = 0; b3 < 4; b3++) {
        C.dot(g3, 16 + b3 * 24, 10, 2.4, '#6E7A82', 'gb' + b3);
        C.dot(g3, 16 + b3 * 24, 30, 2.4, '#6E7A82', 'gc' + b3);
      }
    }
    return girderImg;
  }
  function siteJobArt(ctx) {
    var ctl = S.machineCtl, G = W.game;
    if (!ctl) return;
    if (ctl.kind === 'bulldozer') {
      if (!junkTile) {
        junkTile = C.offscreen(56, 40);
        var g = junkTile.getContext('2d');
        C.rect(g, 6, 16, 22, 12, { seed: 'jk1', fill: '#C4BCAE', stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.8 });
        C.rect(g, 24, 8, 20, 12, { seed: 'jk2', fill: PAL.wood, stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.8 });
        C.line(g, 10, 12, 26, 4, { seed: 'jk3', stroke: PAL.woodDk, lw: 4, wob: 1 });
      }
      for (var j = 0; j < ctl.junk.length; j++) {
        if (!ctl.junk[j].cleared) ctx.drawImage(junkTile, ctl.junk[j].x - 28, ctl.junk[j].y - 24);
      }
    } else if (ctl.kind === 'mixer' && ctl.pour > 0) {
      // the slab fills with wet concrete as you pour
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#C4BCAE';
      ctx.fillRect(LOT.x + 4, LOT.y + 4, (LOT.w - 8) * ctl.pour, LOT.h - 4);
      ctx.restore();
    } else if (ctl.kind === 'crane') {
      var tower = ctl.proj === 'skyscraper';
      var load = tower ? girderTile() : panelImg();
      // the steel already up: one pass per girder dropped, so the frame
      // grows in front of you — uprights, beams, then the bracing
      if (tower && ctl.placed > 0) {
        W.drawGirders(ctx, LOT.x, LOT.y + LOT.h - 10,
                      LOT.y + LOT.h - 10 - 6 * 34, ctl.placed, 'jobg');
      }
      // the waiting stack
      var inFlight = (ctl.carrying || ctl.lower) ? 1 : 0;
      for (var p2 = ctl.placed + inFlight; p2 < 3; p2++) {
        ctx.drawImage(load, ctl.stack[0] - load.width / 2,
                            ctl.stack[1] - 26 - (2 - p2) * 12);
      }
      var hx2 = ctl.hookX || ctl.x, hy2 = ctl.hookY || ctl.y - 120;
      // a soft landing marker under the hook while carrying: green = good
      if (ctl.carrying) {
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.15 * Math.sin(W.game.t * 5);
        ctx.strokeStyle = ctl.hookOverLot ? '#6FA84B' : W.PAL.white;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(hx2, ctl.y + 6, 48, 16, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // the panel: swaying on the hook, or riding the cable down
      if (ctl.carrying) {
        var sway = Math.sin(W.game.t * 3) * 5;
        drawCable(ctx, hx2, hy2, hx2 + sway, hy2 + 16);
        ctx.drawImage(load, hx2 + sway - load.width / 2, hy2 + 12);
      } else if (ctl.lower) {
        var k2 = Math.min(1, ctl.lower.t / 0.8);
        var ease = k2 * k2 * (3 - 2 * k2);
        var py3 = hy2 + 12 + (ctl.y - 8 - (hy2 + 12)) * ease;
        drawCable(ctx, hx2, hy2, hx2, py3);
        ctx.drawImage(load, hx2 - load.width / 2, py3);
      }
    } else if (ctl.kind === 'wreckingBall') {
      // the ball ALWAYS hangs from the arm tip — sway at rest, whip mid-swing
      var pvx = ctl.x + (ctl.tip ? ctl.tip[0] : 46);
      var pvy = ctl.y + (ctl.tip ? ctl.tip[1] : -150);
      var ang2;
      if (ctl.swing > 0) {
        var kk = 1 - ctl.swing / 0.8;              // 0 -> 1 through the swing
        ang2 = -1.0 + Math.sin(kk * Math.PI) * 1.9; // back, WHIP through, return
      } else {
        ang2 = Math.sin(W.game.t * 1.3) * 0.12;     // gentle idle sway
      }
      drawBallChain(ctx, pvx, pvy, ang2);
    }
  }

  /* A straight cable with a little hook kink. */
  function drawCable(ctx, x0, y0, x1, y1) {
    ctx.save();
    ctx.strokeStyle = W.PAL.outline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  /* The wrecking ball on its chain, hanging at `ang` from the pivot. */
  function drawBallChain(ctx, px, py, ang) {
    var L = 84;
    var bx = px + Math.sin(ang) * L;
    var by = py + Math.cos(ang) * L;
    ctx.save();
    ctx.strokeStyle = W.PAL.outline;
    ctx.lineWidth = 3;
    // chain: three short segments read as links better than one line
    ctx.beginPath();
    var midx = px + Math.sin(ang) * L * 0.5, midy = py + Math.cos(ang) * L * 0.5;
    ctx.moveTo(px, py);
    ctx.lineTo(midx, midy);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = '#5A4A3E';
    ctx.beginPath();
    ctx.arc(bx, by, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = W.PAL.outline;
    ctx.lineWidth = 3;
    ctx.stroke();
    // a glint so it reads as heavy iron
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(bx - 6, by - 7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  W.drawBallChain = drawBallChain;

    /* ---- dinner ------------------------------------------------------
   * Placing a dish seats Bobby. Eating is a deliberate act with a real
   * animation, because a meal that finishes instantly feels like nothing
   * happened at all.
   */

  /* A: everyone in the room drops what they're doing and takes a chair. */
  S.callToDinner = function (table) {
    var seats = S.stations.filter(function (c) {
      return c.kind === 'chair' && c !== S.seated && !c.s.taker;
    });
    var i = 0, called = 0;
    S.npcs.forEach(function (n) {
      if (!n.friendKey && !n.isPet) return;
      if (n.data.prevMode === undefined) n.data.prevMode = n.mode;
      if (n.isPet) {
        // the pup waits hopefully under the table
        n.mode = 'goto';
        n.data.tx = table.x + table.w / 2;
        n.data.ty = table.y + table.h + 26;
        n.data.tol = 12;
        n.data.diner = true;
        n.says('!!', 2);
        called++;
        return;
      }
      var seat = seats[i++];
      n.mode = 'goto';
      n.data.faceDir = 'down';
      if (seat) {
        seat.s.taker = n.friendKey;
        n.data.tx = seat.x + seat.w / 2;
        n.data.ty = seat.y + seat.h / 2 + 4;
        n.data.seat = seat;
      } else {
        // no chair left — stand at the table edge, still part of dinner
        n.data.tx = table.x + 12 + (i * 34) % table.w;
        n.data.ty = table.y + table.h + 22;
      }
      n.data.tol = 10;
      n.data.diner = true;
      n.says(['yum!!', 'dinner!', 'ooooh!'][i % 3], 2.4);
      called++;
    });
    S.mealCalled = true;
    if (called) {
      W.say('Everyone to the table!', PAL.accent);
      if (W.audio) W.audio.play('ding');
    } else {
      W.say('Nobody else is here right now.');
    }
  };

  /* Z: the meal itself — bite by bite, together. */
  S.startMeal = function (table) {
    if (S.mealSeq) return;
    var diners = [S.player];
    S.npcs.forEach(function (n) {
      if (!n.data.diner) return;
      // Anyone still shuffling round the furniture takes their seat now —
      // a straight-line walk can snag on the table, and nobody should miss
      // dinner because a chair was on the far side of it.
      if (n.data.tx != null) { n.x = n.data.tx; n.y = n.data.ty; }
      n.mode = 'hold';
      diners.push(n);
    });
    S.mealSeq = {
      t: 0, table: table, diners: diners,
      total: diners.length > 1 ? 5 : 3.5,
      bites: 0, said: 0
    };
    table.s.biteStage = 0;
    if (W.audio) W.audio.play('chomp');
  };

  function updateMeal(dt) {
    var m = S.mealSeq, G = W.game;
    m.t += dt;

    // chew on a shared rhythm, each diner slightly offset
    var wantBites = Math.min(3, Math.floor((m.t / m.total) * 4));
    if (wantBites > m.bites) {
      m.bites = wantBites;
      m.table.s.biteStage = wantBites;
      if (W.audio) W.audio.play('chomp');
      for (var d = 0; d < m.diners.length; d++) {
        var who = m.diners[d];
        W.fx.dust(who.x + (Math.random() - 0.5) * 20, who.y - 40, 2);
      }
    }
    // mid-meal delight
    if (m.t > m.total * 0.4 && m.said === 0) {
      m.said = 1;
      var pick = m.diners[Math.floor(Math.random() * m.diners.length)];
      if (pick !== S.player && pick.says) pick.says('Mmm!', 2);
      else W.say('Mmm! So good.', PAL.accent);
    }
    if (m.t > m.total * 0.72 && m.said === 1) {
      m.said = 2;
      var pick2 = m.diners[Math.floor(Math.random() * m.diners.length)];
      if (pick2 !== S.player && pick2.says) pick2.says('Keena Meena!', 2.2);
    }

    if (m.t >= m.total) finishMeal();
  }

  function finishMeal() {
    var m = S.mealSeq, G = W.game;
    if (!m) return;
    var n = m.diners.length;
    m.table.s.set.shift();
    m.table.s.biteStage = 0;
    G.state.plates.dirty += n;
    G.state.meals = (G.state.meals || 0) + 1;
    W.fx.sparkle(m.table.x + m.table.w / 2, m.table.y - 20, 18, 90);
    for (var d = 0; d < m.diners.length; d++) {
      W.fx.hearts(m.diners[d].x, m.diners[d].y - 80, 3);
    }
    W.say(n > 1 ? 'What a feast — together!' : 'Mmm! All gone.', PAL.accent);
    if (W.audio) { W.audio.play('aaah'); W.audio.play('love'); }
    G.idea('cook');
    if (n > 1) G.first('feast', 'First dinner with friends!');
    // a beat of contentment, then everyone gets on with their day
    S.npcs.forEach(function (x) {
      if (!x.data.diner) return;
      x.data.diner = false;
      if (x.data.seat) { x.data.seat.s.taker = null; x.data.seat = null; }
      x.data.faceDir = null;
      // A chair is SOLID, and dinner seats them inside it — push everyone
      // back onto open floor or they are wedged there forever.
      if (!W.canStand(S.room, S.solids, x.x, x.y)) {
        var out = spotNear(x.x, x.y);
        if (out) { x.x = out[0]; x.y = out[1]; }
      }
      x.data.tx = null; x.data.ty = null; x.data.pause = 0.4 + Math.random();
      // followers go back to following; everyone else just wanders — a
      // stale 'goto' would aim them at a target that no longer exists
      x.mode = x.data.prevMode === 'follow' ? 'follow' : 'wander';
      x.data.prevMode = undefined;
    });
    S.mealCalled = false;
    S.mealSeq = null;
  }
  S.finishMeal = finishMeal;

  /* Bedtime, called by the bed stations. */
  S.startSleep = function (wakeAt) {
    var over = S.npcs.some(function (n) { return !!n.friendKey || n.isPet; }) ||
               W.game.state.party.length > 0;
    S.sleeping = { phase: 'lie', t: 0, sleepover: over, wakeAt: wakeAt };
    // the dark bake happens NOW, behind the lie-down, not as a freeze later
    nightBg(S.name);          // indoors or out, night has its own bake

    // everyone else heads for a sleeping bag or tent
    var spots = [];
    W.effectiveProps(S.name).forEach(function (pr) {
      if (pr.kind === 'sleepingBag' || pr.kind === 'tent' || pr.kind === 'petBed') {
        var def = W.PROPS[pr.kind];
        spots.push([pr.x + def.w / 2, pr.y + def.d - 4]);
      }
    });
    var si2 = 0;
    S.npcs.forEach(function (n) {
      if (!n.friendKey && !n.isPet) return;
      var sp2 = spots[si2 % Math.max(1, spots.length)];
      si2++;
      if (sp2) {
        n.mode = 'goto';
        n.data.tx = sp2[0];
        n.data.ty = sp2[1];
        n.data.tol = 10;
        n.data.bedSpot = sp2;
      }
      n.says('zzz...', 4);
    });

    if (W.audio) W.audio.play('lullaby');
  };

  /* Nearby friends react to what Bobby does. */
  S.friendsReact = function (type) {
    for (var i = 0; i < S.npcs.length; i++) {
      var n = S.npcs[i];
      if (!n.friendKey) continue;
      if (Math.hypot(n.x - S.player.x, n.y - S.player.y) > 170) continue;
      if (type === 'cook') n.says('Smells good!', 2.4);
      else if (type === 'love') { n.says('Keena Meena!', 2.4); W.fx.hearts(n.x, n.y - 100, 3); }
      else if (type === 'boba') n.says('Hee hee!', 2);
      return;                        // one reaction is plenty
    }
  };

  function drinkBoba() {
    var G = W.game;
    W.hands.drop();
    var kinds = ['giant', 'tiny', 'disco', 'toots'];
    var kind = kinds[Math.floor(Math.random() * kinds.length)];
    G.bobaFx = { kind: kind, until: G.t + 15 };
    if (W.audio) {
      W.audio.play('slurp');
      setTimeout(function () {
        W.audio.play(kind === 'giant' ? 'boing' : kind === 'tiny' ? 'squeak' : 'pop');
      }, 450);
    }
    W.fx.sparkle(S.player.x, S.player.y - 60, 16, 90);
    var lines = { giant: 'WHOA. Big Bobby!', tiny: 'squeak! tiny bobby!',
                  disco: 'Ooooh, disco!', toots: 'Excuse me! *sparkle*' };
    W.say(lines[kind], PAL.accent);
    G.idea('boba');
    G.first('boba', 'First wacky boba!');
    S.friendsReact('boba');
  }

  /* Webs' laboratory brew: eight legs, twenty seconds, no side effects
   * beyond an awful lot of scuttling. */
  function drinkPotion() {
    var G = W.game;
    W.hands.drop();
    G.bobaFx = { kind: 'eightlegs', until: G.t + 20 };
    W.say('EIGHT LEGS! Look at me scuttle!', '#8F6BA8');
    W.fx.sparkle(S.player.x, S.player.y - 50, 20, 110);
    G.first('potion', 'First spider potion!');
    S.friendsReact('boba');
    if (W.audio) {
      W.audio.play('slurp');
      setTimeout(function () { W.audio.play('boing'); }, 420);
    }
  }

  S.drinkPotion = function () { drinkPotion(); };

  /* Webs' one and only recipe. He can pour it wherever he is — behind his
   * bar, or standing in your kitchen because you asked him along. `from`
   * is the spider himself when he is here to do the honours. */
  var POTION_LINES = ['*slides a flask over* one Eight-Legger, on the house!',
                      'Careful — it is fizzy. And leggy.',
                      'My own recipe. Eight out of eight spiders agree.',
                      'Fresh batch! I carry a shaker everywhere.'];
  var potionLine = 0;

  S.websHere = function () {
    for (var i = 0; i < S.npcs.length; i++) {
      if (S.npcs[i].friendKey === 'webs') return S.npcs[i];
    }
    return null;
  };

  S.pourPotion = function (from) {
    var G = W.game;
    if (W.hands.has('potion')) { drinkPotion(); return; }
    if (!W.hands.empty()) {
      W.say('One thing at a time! Put that down first.');
      S.promptShake = 0.32;
      if (W.audio) W.audio.play('uhuh');
      return;
    }
    W.hands.hold('potion');
    potionLine = (potionLine + 1) % POTION_LINES.length;
    if (from) from.says(POTION_LINES[potionLine], 3.4);
    else W.say('A jug of it, still fizzing. Help yourself!', '#8F6BA8');
    W.fx.sparkle(S.player.x, S.player.y - 40, 12, 70);
    if (W.audio) { W.audio.play('pour'); W.audio.play('ding'); }
    G.first('potionbar', 'Met Webs the barman!');
  };

  var ICE_CREAMS = ['vanilla', 'chocolate', 'strawberry'];

  /* Ice cream eaten too fast does what ice cream eaten too fast does. */
  function eatIceCream(id) {
    var G = W.game;
    W.hands.drop();
    G.bobaFx = { kind: 'brainfreeze', until: G.t + 8 };
    W.say('Mmm ' + W.ITEMS[id].name.toLowerCase() + '... wait... BRRRRR! BRAIN FREEZE!!', '#8FD0EE');
    W.fx.sparkle(S.player.x, S.player.y - 90, 10, 60);
    G.first('brainfreeze', 'First brain freeze!');
    S.friendsReact('boba');
    if (W.audio) { W.audio.play('chomp'); W.audio.play('squeak'); }
  }

  /* The carousel horses, baked once each. */
  /* The teacups everyone rides in, baked once each and then just spun. */
  var CUP_COLORS = ['#8FD0EE', '#E8A0B4', '#F2C14E', '#9CCB6B'];
  var cupTiles = {};
  function cupSeatTile(which, hand) {
    var k = which + '|' + hand;
    if (!cupTiles[k]) {
      var cv = C.offscreen(84, 70);
      W.drawTeacup(cv.getContext('2d'), 42, 62, 'ccup' + k,
        CUP_COLORS[which % CUP_COLORS.length], hand);
      cupTiles[k] = cv;
    }
    return cupTiles[k];
  }

  /* The canopy, baked once and blitted after everything else in the room. */
  var canopyTile = null;
  function canopyImg() {
    if (!canopyTile) {
      var T = W.CAROUSEL_TOP;
      canopyTile = C.offscreen(T.w, T.h);
      W.drawCarouselTop(canopyTile.getContext('2d'), T.ax, T.ay, 'canopy');
    }
    return canopyTile;
  }

  /* Where each cup on the turntable is right now. The floor turns one way,
   * each cup spins the other, and riders sit in cups 0 and 2 — so the cups
   * you watch going round ARE the ones you climb into. */
  var CUP_SLOTS = 4;
  function cupSlot(cx, cy, which, turn) {
    var ang = turn + which * (Math.PI * 2 / CUP_SLOTS);
    return {
      x: cx + Math.cos(ang) * 84,
      y: cy + Math.sin(ang) * 26 - 22,
      cupSpin: -turn * 2.1 + which * 1.7,
      spin: Math.sin(-turn * 2.1 + which * 1.7) * 0.4,
      scale: 0.78
    };
  }

  /* One teacup, its handle whirling round the rim as the ride turns. The cup
   * itself stays upright — a tipped-over teacup just looks broken. */
  function drawCupSeat(ctx, which, x, y, spin) {
    var turn = ((spin / (Math.PI * 2)) % 1 + 1) % 1;
    var img = cupSeatTile(which, Math.floor(turn * 4) % 4);
    var sc = 1.35;
    ctx.save();
    ctx.translate(x, y + 10);
    ctx.scale(sc, sc);
    ctx.drawImage(img, -42, -62);
    ctx.restore();
  }

  /* The colour-zapper: a rainbow beam that gives a ghost its colours
   * back. Nobody is caught, nobody is hurt — they just cheer up. */
  function zapGhost(gh) {
    var G = W.game;
    if (gh.data.lit) return;
    gh.data.lit = true;
    gh.tint = W.GHOST_COLORS[gh.ghostKey];
    gh.mood = gh.tint;
    if (!G.state.ghosts) G.state.ghosts = {};
    G.state.ghosts[gh.ghostKey] = true;
    S.zapBeam = { x0: S.player.x, y0: S.player.y - 50, x1: gh.x, y1: gh.y - 46, t: 0 };
    W.fx.sparkle(gh.x, gh.y - 46, 24, 140);
    W.fx.hearts(gh.x, gh.y - 70, 4);
    gh.says(['thank you!!', 'I have COLOURS!', 'wheeeee!'][Math.floor(Math.random() * 3)], 3);
    W.say(gh.name + ' is bright again!', gh.tint);
    G.first('ghost', 'First ghost cheered up!');
    if (W.audio) { W.audio.play('chime'); W.audio.play('cheer'); }

    var lit = 0;
    Object.keys(W.GHOST_COLORS).forEach(function (k) { if (G.state.ghosts[k]) lit++; });
    if (lit >= 6) {
      G.state.money += 12;
      G.showBanner('EVERY GHOST GLOWS!', 'The whole house is happy again!');
      G.first('ghosts', 'All six ghosts!');
      if (W.audio) W.audio.play('win');
    }
  }

  /* The save record behind a pet actor. */
  function petRec(actor) {
    if (!actor || !actor.isPet) return null;
    return W.pets.get(actor.petKey || 'mochi');
  }

  function playerScale() {
    var fx = W.game.bobaFx;
    if (!fx) return 1;
    if (fx.kind === 'giant') return 1.5;
    if (fx.kind === 'tiny') return 0.5;
    return 1;
  }

  /* How far the eight extra legs have sprouted, 0 (none) to 1 (full set).
   * They pop out over half a second and tuck away again at the end. */
  W.spiderLegs = function () {
    var fx = W.game.bobaFx;
    if (!fx || fx.kind !== 'eightlegs') return 0;
    if (fx.span === undefined) fx.span = Math.max(1, fx.until - W.game.t);
    var left = fx.until - W.game.t;
    var grow = Math.min(1, (fx.span - left) / 0.5);
    var tuck = Math.min(1, left / 0.5);
    return Math.max(0, Math.min(grow, tuck));
  };

  /* How far Bobby's neck is currently stretched, in pixels. */
  W.neckStretch = function () {
    var fx = W.game.bobaFx;
    if (!fx || fx.kind !== 'longneck') return 0;
    // measure against the effect's OWN length — assuming 15s made a longer
    // helping of ice cream compute a negative (inside-out) neck
    if (fx.span === undefined) fx.span = Math.max(1, fx.until - W.game.t);
    var left = fx.until - W.game.t;
    var grow = Math.min(1, (fx.span - left) / 1.2);   // boings up over a second
    var shrink = Math.min(1, left / 1.2);
    return 56 * Math.max(0, Math.min(grow, shrink));
  };

  S.update = function (dt) {
    var G = W.game;
    // A rebuild tears the room down and re-enters it, so it has to wait for
    // any sequence that owns the screen (a machine mid-drive, a meal, a ride).
    if (pendingRebuild && !S.machineCtl && !S.mealSeq && !S.riding && !S.sleeping) {
      var rb = pendingRebuild;
      pendingRebuild = null;
      W.rebuildRoom(rb);
    }
    S.lock = Math.max(0, S.lock - dt);

    /* Safety net: if Bobby is ever inside something solid (a rebuild dropped
     * a prop on him, a sequence put him somewhere odd), walk him out. */
    if (!S.sleeping && !S.seated && !S.riding && !S.mealSeq && !S.machineCtl &&
        !(S.player.jumpT > 0) &&
        !W.canStand(S.room, S.solids, S.player.x, S.player.y)) {
      S.stuckT = (S.stuckT || 0) + dt;
      if (S.stuckT > 0.35) {
        var esc = spotNear(S.player.x, S.player.y);
        if (esc) { S.player.x = esc[0]; S.player.y = esc[1]; }
        S.stuckT = 0;
      }
    } else {
      S.stuckT = 0;
    }

    // Drain queued poses in gameplay ONLY while they're cheap — an expensive
    // pose mid-walk is a felt hitch and a music skip, and it will bake itself
    // on demand the first time it's actually drawn anyway. The fades carry
    // the heavy lifting with a much bigger budget.
    if (W.warmAvg() < 9) {
      var wb = performance.now() + 3;
      if (W.warmStep()) while (performance.now() + W.warmAvg() < wb + 6 && W.warmStep()) { /* one more */ }
    }

    W.dialogue.update(dt);
    W.fx.update(dt);
    S.player.update(dt);

    // ------- Bobby is at the wheel of a site machine
    if (S.machineCtl) {
      updateMachine(dt);
      if (S.machineCtl) {                       // (a finished job may exit)
        var mc = S.machineCtl;
        if (mc.doneT !== undefined) {
          mc.doneT -= dt;
          if (mc.doneT <= 0) { exitMachine(); }
        }
        if (S.machineCtl) {
          S.prompt = {
            text: (mc.progress || 'Drive!') + '  ·  arrows drive',
            locked: true
          };
        }
      }
      W.updateNPCs(S.npcs, S.room, S.solids, dt, S.player);
      W.dialogue.update(dt);
      W.fx.update(dt);
      return;
    }

    // the teacup floor turns whether or not anyone is aboard — and it has
    // to be advanced before any sequence can return early
    if (S.canopies && S.canopies.length) {
      S.cupT = (S.cupT || 0) +
               dt * (S.riding && S.riding.kind === 'carousel' ? 1.25 : 0.34);
    }

    // ------- a ride owns the controls until Bobby hops off
    if (S.riding) {
      S.riding.t += dt;
      var rr = S.riding;
      if (Math.random() < dt * 2) {
        var p0 = S.ridePos(0);
        W.fx.sparkle(p0.x, p0.y - 30, 1, 30);
      }
      W.updateNPCs(S.npcs, S.room, S.solids, dt, S.player);
      var ax0 = W.input.axis();
      if (W.input.hit('back') || ax0[0] || ax0[1]) S.dismount();
      S.prompt = {
        text: rr.kind === 'flop' ? 'Cosy! (arrows to get up)' : 'Wheee! (arrows to hop off)',
        locked: true
      };
      if (rr.kind === 'flop' && Math.random() < dt * 1.2) {
        W.fx.zzz(S.player.x + 16, S.player.y - 50);
      }
      W.dialogue.update(dt);
      return;
    }

    // ------- the meal runs to its own rhythm; X hurries it along
    if (S.mealSeq) {
      updateMeal(dt);
      W.updateNPCs(S.npcs, S.room, S.solids, dt, S.player);
      if (W.input.hit('back')) finishMeal();
      S.prompt = { text: 'Munch munch munch...', locked: true };
      W.dialogue.update(dt);
      return;
    }

    // ------- bedtime sequence: nothing else runs while asleep
    if (S.sleeping) {
      var sl = S.sleeping;
      sl.t += dt;
      // friends keep walking to their bags while Bobby settles
      W.updateNPCs(S.npcs, S.room, S.solids, dt, S.player);
      if (sl.phase === 'lie' && sl.t > 1.4) {
        sl.phase = 'dark'; sl.t = 0;
        // whoever hasn't arrived snuggles in anyway (the lights are out)
        S.npcs.forEach(function (n) {
          if (n.data.bedSpot) {
            n.x = n.data.bedSpot[0];
            n.y = n.data.bedSpot[1];
            n.mode = 'hold';
            n.moving = false;
          }
        });
      }
      else if (sl.phase === 'dark' && sl.t > 1.0) { sl.phase = 'hold'; sl.t = 0; }
      else if (sl.phase === 'hold') {
        if (Math.random() < dt * 2) W.fx.zzz(S.player.x + 20, S.player.y - 60);
        for (var zi = 0; zi < S.npcs.length; zi++) {
          if (S.npcs[zi].data.bedSpot && Math.random() < dt * 0.8) {
            W.fx.zzz(S.npcs[zi].x + 12, S.npcs[zi].y - 50);
          }
        }
        if (sl.t > 3.0) { sl.phase = 'wake'; sl.t = 0; }
      } else if (sl.phase === 'wake' && sl.t > 1.0) {
        S.sleeping = null;
        // morning really arrives: a camp left in night mode wakes to daylight
        if (S.room.canNight) G.state.lights[S.name] = true;
        // step out of bed onto verified floor — never wake inside a solid
        var wa = sl.wakeAt || [S.player.x, S.player.y + 40];
        if (!W.canStand(S.room, S.solids, wa[0], wa[1])) {
          var free = spotNear(wa[0], wa[1]);
          wa = free || wa;
        }
        S.player.x = wa[0];
        S.player.y = wa[1];
        // sleepers climb out of their bags onto open floor
        S.npcs.forEach(function (n) {
          if (!n.data.bedSpot) return;
          if (!W.canStand(S.room, S.solids, n.x, n.y)) {
            var free3 = spotNear(n.x, n.y);
            if (free3) { n.x = free3[0]; n.y = free3[1]; }
          }
          n.mode = 'wander';
          n.data.bedSpot = null;
        });
        G.wakeUp(sl.sleepover);
        if (sl.sleepover) {
          S.npcs.forEach(function (n) { if (n.friendKey || n.isPet) n.says('zzz... trix...', 3); });
        }
      }
      return;
    }

    // ------- ambient birdsong + weather particles outdoors
    if (S.room.outdoor) {
      S.birdIn = (S.birdIn || 4) - dt;
      if (S.birdIn <= 0) {
        S.birdIn = 7 + Math.random() * 9;
        if (W.audio && G.state.weather !== 'rainy') W.audio.play('bird');
      }
      var wthr = G.state.weather;
      if (wthr === 'rainy' && Math.random() < dt * 30) {
        W.fx.rain(Math.random() * 960);
      } else if (wthr === 'snowy' && Math.random() < dt * 14) {
        W.fx.snow(Math.random() * 960);
      }
    }

    if (W.input.hit('love')) {
      W.say('Keena Meena!', PAL.accent);
      W.fx.hearts(S.player.x, S.player.y - 130, 8);
      if (W.audio) W.audio.play('love');
      G.idea('love');
      S.friendsReact('love');
    }

    // ------- movement (or standing up from a chair)
    var ax = 0, ay = 0, run = false;
    if (!S.lock) {
      var a2 = W.input.axis();
      ax = a2[0]; ay = a2[1];
      // Auto-run: Shift is a two-handed chord a five-year-old fumbles, so
      // just KEEP WALKING and Bobby breaks into a run on his own.
      if (ax || ay) S.walkHeldT = (S.walkHeldT || 0) + dt;
      else S.walkHeldT = 0;
      run = W.input.down('run') || S.walkHeldT > 1.1;
      if (!S.seated && W.input.hit('jump')) S.player.jump();
    }

    if (S.seated) {
      if (ax !== 0 || ay !== 0) {
        // stand up in front of the chair, on ground he can actually stand on
        var upx = S.seated.x + S.seated.w / 2, upy = S.seated.y + S.seated.h + 16;
        if (!W.canStand(S.room, S.solids, upx, upy)) {
          var clear = spotNear(upx, upy);
          if (clear) { upx = clear[0]; upy = clear[1]; }
        }
        S.player.x = upx;
        S.player.y = upy;
        S.seated = null;
        S.mealCalled = false;
      }
    } else {
      S.player.move(S.room, S.solids, ax, ay, dt, run);
    }

    // idle wiggle: look around after a while so he never feels frozen
    if (ax === 0 && ay === 0 && !S.seated) {
      S.idleT += dt;
      if (S.idleT > 8 && S.wiggleT <= 0) { S.wiggleT = 1.2; S.idleT = 3; }
    } else {
      S.idleT = 0; S.wiggleT = 0;
    }
    if (S.wiggleT > 0) {
      S.wiggleT -= dt;
      S.player.dir = S.wiggleT > 0.8 ? 'left' : S.wiggleT > 0.4 ? 'right' : 'down';
    }

    // sparkle toots trail behind a moving sugar-rushed Bobby
    if (G.bobaFx && G.bobaFx.kind === 'brainfreeze') {
      if (Math.random() < dt * 3) W.fx.bubble(S.player.x + (Math.random() - 0.5) * 40, S.player.y - 80);
      if (Math.random() < dt * 0.7) {
        W.say(['Brrr-r-r-r!', 'C-c-c-cold!', 'My b-b-brain!'][Math.floor(Math.random() * 3)], '#8FD0EE');
      }
    }
    if (G.bobaFx && G.bobaFx.kind === 'toots' && S.player.moving && Math.random() < dt * 9) {
      W.fx.sparkle(S.player.x - (S.player.dir === 'right' ? 26 : S.player.dir === 'left' ? -26 : 0),
                   S.player.y - 14, 2, 22);
    }

    if (W.input.hit('transform')) {
      if (W.can('transform')) {
        G.state.mechForm = G.state.mechForm === 'cart' ? 'robot' : 'cart';
        W.fx.sparkle(S.player.x, S.player.y - 50, 20, 110);
        W.say(G.state.mechForm === 'cart' ? W.standName() + ' mode!' : 'Robot mode!', PAL.sun);
        if (W.audio) W.audio.play('clack');
      } else {
        W.say('Only the ' + W.suitName('mech') + ' can transform.');
      }
    }

    if (W.service.active()) {
      W.service.update(dt, S.room, S.solids, S.npcs);
      if (W.input.hit('special') && W.service.armed()) {
        G.fadeTo('mission', { mission: 'megatron', from: S.name });
        return;
      }
      // the shop shift keeps Bobby behind the counter — and SAYS so
      var wz = W.service.workZone();
      if (wz) {
        var cxp = W.clamp(S.player.x, wz.x, wz.x + wz.w);
        var cyp = W.clamp(S.player.y, wz.y, wz.y + wz.h);
        if ((cxp !== S.player.x || cyp !== S.player.y) && !S.clampSaid) {
          S.clampSaid = true;
          W.say("I'm working! Press X to stop.", PAL.sun);
        }
        S.player.x = cxp;
        S.player.y = cyp;
      }
    }

    for (var si = 0; si < S.stations.length; si++) {
      var stn = S.stations[si];
      if (stn.def.update) stn.def.update(stn, dt);
    }

    W.updateNPCs(S.npcs, S.room, S.solids, dt, S.player);

    // ------- critters coming and going from their box
    for (var cz = S.npcs.length - 1; cz >= 0; cz--) {
      var czn = S.npcs[cz];
      if (czn.data.settleAtBox && czn.mode === 'goto' &&
          Math.hypot(czn.data.tx - czn.x, czn.data.ty - czn.y) < 14) {
        czn.mode = 'hold';
        czn.data.settleAtBox = false;
        czn.data.atBox = true;
        // take the first free doorway and disappear into it
        var used = {};
        S.npcs.forEach(function (q2) {
          if (q2 !== czn && q2.data.atBox) used[q2.data.boxSlot] = true;
        });
        var slot2 = 0;
        while (used[slot2]) slot2++;
        czn.data.boxSlot = Math.min(slot2, 2);
        czn.hidden = true;
        czn.says('zzz...', 3);
      }
      if (czn.data.leaving &&
          (czn.x < S.room.bounds.x - 30 || (czn.data.leftT = (czn.data.leftT || 0) + dt) > 4)) {
        S.npcs.splice(cz, 1);          // gone home; the living room has them now
        continue;
      }
      if (czn.data.atBox && czn.mode !== 'hold') {
        czn.data.atBox = false;            // woken up — pop out of the box
        czn.hidden = false;
      }
      if (czn.data.atBox && Math.random() < dt * 0.5) {
        W.fx.zzz(czn.x + 8, czn.y - 66);   // drifting up from the doorway
      }
    }

    // ------- doors
    if (!S.lock && S.player.jumpT === 0 && !S.seated) {
      for (var d = 0; d < S.room.doors.length; d++) {
        var dr = S.room.doors[d];
        if (inZone(S.player.x, S.player.y, dr)) {
          if (W.audio) W.audio.play('doorpop');
          if (dr.map) {
            // an outdoor spot you flew to: walking out gets back in the
            // vehicle you arrived in and puts you over this place's own pad
            G.fadeTo('vehicle', {
              vehicle: W.vehicleForMap(dr.map), map: dr.map, from: S.name
            });
          } else {
            G.fadeTo('house', { room: dr.to, spawn: dr.spawn });
          }
          return;
        }
      }
    }

    // ------- what can Bobby do right now?
    //   Z = the world (stations, pickups, the held item)
    //   A = people (Trix, chat, gifts, petting, calling to dinner)
    //   X = stopping (Dee, clock off, stand up)
    S.prompt = null; S.promptStation = null; S.talkTo = null;
    S.pickupTarget = null; S.serveTo = null; S.giftTo = null; S.potionFrom = null;
    S.eatMode = false; S.callMode = false;
    var px = S.player.x, py = S.player.y;
    var held = G.state.held;

    // a sad ghost in reach is the most interesting thing in the room
    S.zapTarget = null;
    for (var zg = 0; zg < S.npcs.length; zg++) {
      var gz = S.npcs[zg];
      if (!gz.isGhost || gz.data.lit) continue;
      if (Math.hypot(gz.x - px, gz.y - py) < 96) { S.zapTarget = gz; break; }
    }

    // the nearest soul is ALWAYS tracked, whatever the visible prompt is
    var best = null, bestD = 70;
    for (var n = 0; n < S.npcs.length; n++) {
      var np = S.npcs[n];
      var dd = Math.hypot(np.x - px, np.y - py);
      if (dd < bestD) { bestD = dd; best = np; }
    }
    S.talkTo = best;
    if (best && !best.isPet) {
      var fdef0 = W.FRIENDS[best.friendKey];
      if (fdef0 && fdef0.likes && held === fdef0.likes) S.giftTo = best;
    }
    // the barman carries his shaker — ask him anywhere, not just at the bar
    S.potionFrom = (best && best.friendKey === 'webs' && !held) ? best : null;

    /* The social half of the pill: what A would do right now. */
    function socialLabel() {
      if (!best) return null;
      if (best.isPet) return W.hands.has('treat') ? 'treat' : 'pet';
      if (S.giftTo === best) return 'give it';
      return G.state.party.indexOf(best.friendKey) >= 0 ? 'chat' : 'say Trix';
    }

    if (S.seated) {
      var atTable = null;
      for (var t2 = 0; t2 < S.stations.length; t2++) {
        var ts = S.stations[t2];
        if (ts.kind === 'table' && rectDist(px, py, ts) < 120) { atTable = ts; break; }
      }
      // he can lay a second course without getting up
      if (atTable && W.hands.kind() === 'dish' && atTable.s.set.length < 3) {
        S.promptStation = atTable;
        S.prompt = { text: 'Dinner time!', locked: false };
      } else if (atTable && atTable.s.set.length) {
        S.promptStation = atTable;
        S.eatMode = true;
        // is anyone left to invite?
        var free = S.stations.filter(function (c2) {
          return c2.kind === 'chair' && c2 !== S.seated && !c2.s.taker;
        }).length;
        var guests = S.npcs.filter(function (a3) { return a3.friendKey || a3.isPet; }).length;
        S.callMode = guests > 0 && free > 0 && !S.mealCalled;
        S.prompt = {
          text: 'Eat!', locked: false,
          key2: S.callMode ? 'A' : null,
          label2: S.callMode ? 'call everyone' : null
        };
      } else if (S.seated.kind === 'sofa') {
        var tvOn2 = S.stations.some(function (x) { return x.kind === 'tv' && x.s.on; });
        S.prompt = { text: tvOn2 ? 'Cosy! Enjoying the show' : 'Comfy! (arrows to get up)', locked: true };
      } else {
        S.prompt = { text: 'Bring dinner to the table!', locked: true };
      }
    } else {
      if (W.service.active()) {
        var cust = W.service.front();
        if (cust && Math.hypot(cust.actor.x - px, cust.actor.y - py) < 150) {
          S.serveTo = cust;
          S.prompt = W.service.servePrompt(cust);
        }
      }

      if (!S.prompt) {
        var bestS = null, bsd = REACH;
        for (var i = 0; i < S.stations.length; i++) {
          var sd = rectDist(px, py, S.stations[i]);
          if (sd < bsd) { bsd = sd; bestS = S.stations[i]; }
        }
        // an item lying at your feet beats a station you are merely near —
        // otherwise anything dropped beside a counter could never be retrieved
        var pk = W.dropped.nearest(S.name, px, py, 44);
        var pkd = pk ? Math.hypot(pk.x - px, pk.y - py) : 1e9;
        if (pk && pkd <= bsd) {
          S.pickupTarget = pk;
          S.prompt = { text: 'Pick up the ' + W.ITEMS[pk.id].name, locked: false, icon: pk.id };
        } else if (bestS) {
          S.promptStation = bestS;
          S.prompt = W.stationPrompt(bestS);
        } else if (pk) {
          S.pickupTarget = pk;
          S.prompt = { text: 'Pick up the ' + W.ITEMS[pk.id].name, locked: false, icon: pk.id };
        }
      }

      // Webs standing next to you is always worth a potion
      if (!S.prompt && S.potionFrom) {
        S.prompt = {
          text: 'Ask ' + S.potionFrom.name + ' for a potion', locked: false,
          icon: 'potion', key2: 'A', label2: 'chat'
        };
      }

      // a grey ghost is always worth offering
      if (!S.prompt && S.zapTarget) {
        S.prompt = { text: 'Bring back their colours!', locked: false, icon: 'star' };
      }

      // whatever is in his paws is the fallback Z action
      if (!S.prompt && held) {
        S.prompt = held === 'boba'
          ? { text: 'Drink the Boba!', locked: false, icon: 'boba' }
          : held === 'potion'
            ? { text: 'Drink the potion!', locked: false, icon: 'potion' }
          : ICE_CREAMS.indexOf(held) >= 0
            ? { text: 'Eat the ' + W.ITEMS[held].name + ' scoop!', locked: false, icon: held }
            : { text: 'Put down the ' + W.ITEMS[held].name, locked: false, icon: held };
      }

      // nothing else to do? then the social action gets the whole pill
      if (!S.prompt && best) {
        var sl = socialLabel();
        S.prompt = {
          text: best.isPet
            ? (W.hands.has('treat') ? 'Give ' + best.name + ' a treat' : 'Pet ' + best.name)
            : S.giftTo === best
              ? 'Give ' + best.name + ' the ' + W.ITEMS[held].name + '!'
              : G.state.party.indexOf(best.friendKey) >= 0
                ? 'Chat with ' + best.name
                : 'Say Trix to ' + best.name,
          locked: false,
          icon: 'heart',
          keyChar: 'A',
          key2: 'X',
          label2: best.isPet
            ? (petRec(best) && petRec(best).home ? 'come along' : 'stay here')
            : (G.state.party.indexOf(best.friendKey) >= 0 ? 'say Dee' : null)
        };
      } else if (S.prompt && best) {
        // a world action holds the pill — the social one rides along on A
        S.prompt.key2 = 'A';
        S.prompt.label2 = socialLabel();
      }
    }

    // ------- Z: act on the world
    if (W.input.hit('act')) {
      if (W.dialogue.skip()) {
        // consumed finishing the typewriter
      } else if (S.eatMode && S.promptStation) {
        S.startMeal(S.promptStation);
      } else if (S.seated && S.promptStation) {
        W.stationAct(S.promptStation, S.player);
      } else if (S.serveTo) {
        W.service.serve();
      } else if (S.promptStation && !S.seated) {
        var line = pickLine(S.promptStation.kind);
        W.stationAct(S.promptStation, S.player);
        if (line && !W.dialogue.active) W.say(line);
      } else if (S.potionFrom) {
        S.pourPotion(S.potionFrom);
      } else if (S.zapTarget) {
        zapGhost(S.zapTarget);
      } else if (S.pickupTarget) {
        if (W.dropped.take(S.name, S.pickupTarget)) {
          W.say('Got the ' + W.ITEMS[S.pickupTarget.id].name + ' back.');
          if (W.audio) W.audio.play('pickup');
        } else {
          W.say('The tray is full!');
        }
      } else if (held && !S.seated) {
        if (held === 'boba') drinkBoba();
        else if (held === 'potion') drinkPotion();
        else if (ICE_CREAMS.indexOf(held) >= 0) eatIceCream(held);
        else if (S.player.jumpT > 0) {
          // dropping mid-jump could maroon an item on a door mat
        } else {
          var did = W.dropped.drop(S.name, S.player.x, S.player.y);
          if (did) W.say('There. Safe on the floor.');
        }
      } else if (S.talkTo && !S.seated) {
        // Forgiveness: a kid's thumb lives on Z. When the only thing on
        // offer is social (the pill says A), Z does the A thing instead of
        // a silent nothing.
        doTalk();
      }
    }

    // ------- A: talk to whoever is nearby
    /* The social action, shared by A (its home key) and the Z-forgiveness
     * path (a kid pressing the big key when only a friend is nearby). */
    function doTalk() {
      if (S.callMode && S.promptStation) {
        S.callToDinner(S.promptStation);
        return;
      }
      if (!S.talkTo) return;
      var who = S.talkTo;
      if (who.isPet) {
        if (W.hands.has('treat')) {
          W.hands.drop();
          var fed = petRec(who); if (fed) fed.fedDay = G.state.day;
          who.says('*chomp chomp* squee!', 2.4);
          W.fx.hearts(who.x, who.y - 60, 6);
          if (W.audio) W.audio.play('chomp');
        } else {
          who.says(['squee!', '*happy wiggle*', '*purrs fuzzily*'][Math.floor(Math.random() * 3)], 2.2);
          W.fx.hearts(who.x, who.y - 60, 2);
          if (W.audio) W.audio.play('blip');
        }
      } else if (S.giftTo === who && W.giveGift(who)) {
        S.giftTo = null;
      } else if (W.talkTo(who)) {
        W.renumberParty(S.npcs);
      }
    }

    if (W.input.hit('talk')) doTalk();

    // ------- X: stop the thing (dismiss a follower, clock off a job)
    if (W.input.hit('back')) {
      // a station can claim X for a second action of its own (the campfire
      // uses it to settle everyone down for the night)
      if (S.promptStation && S.promptStation.def.onBack &&
          S.promptStation.def.onBack(S.promptStation)) {
        // handled
      } else if (S.talkTo && S.talkTo.isPet) {
        // the pup can wait at home instead of tagging along
        var prec = petRec(S.talkTo);
        if (prec && prec.home) {
          prec.home = null;
          S.talkTo.mode = 'follow';
          S.talkTo.data.slot = G.state.party.length;
          S.talkTo.says('*zoomies!*', 2.2);
          W.say(S.talkTo.name + ' is coming along!');
        } else if (prec) {
          prec.home = S.name;
          S.talkTo.mode = 'wander';
          S.talkTo.says('*curls up*', 2.4);
          W.say(S.talkTo.name + ' will wait here for you.');
        }
        if (W.audio) W.audio.play('blip');
      } else if (S.talkTo && S.talkTo.friendKey &&
          G.state.party.indexOf(S.talkTo.friendKey) >= 0) {
        var wasCritter = S.talkTo.friendKey.indexOf('critter') === 0;
        var boxHome = wasCritter && G.state.builds.critterBox;
        // a quiet critter with a box always goes home to THE BOX on Dee,
        // no matter where you happen to be standing
        W.dismiss(S.talkTo, boxHome ? 'living' : S.name);
        W.renumberParty(S.npcs);
        if (boxHome) {
          var firstHome = G.first('critterhome', 'A quiet critter moved in!');
          S.talkTo.says(firstHome ? '*happiest wiggle*' : '*scampers home!*', 2.6);
          W.fx.hearts(S.talkTo.x, S.talkTo.y - 60, firstHome ? 6 : 3);
          if (S.name === 'living') {
            // trot over to the box and settle in
            var bx2 = null;
            (W.ROOMS.living.props || []).forEach(function (p3) {
              if (p3.kind === 'critterBox') bx2 = p3;
            });
            if (bx2) {
              S.talkTo.mode = 'goto';
              S.talkTo.data.tx = bx2.x + 48;
              S.talkTo.data.ty = bx2.y + 58;
              S.talkTo.data.tol = 10;
              S.talkTo.data.settleAtBox = true;
            }
            W.say(S.talkTo.name + ' curls up in the critter box!', PAL.accent);
          } else {
            // scamper out of sight, heading home
            S.talkTo.mode = 'goto';
            S.talkTo.data.tx = S.room.bounds.x - 60;
            S.talkTo.data.ty = S.talkTo.y;
            S.talkTo.data.tol = 12;
            S.talkTo.data.leaving = true;
            W.say(S.talkTo.name + ' scampers home to the critter box!', PAL.accent);
          }
          if (W.audio) W.audio.play(firstHome ? 'cheer' : 'blip');
        }
      } else if (W.service.active()) {
        // clocking off works ANYWHERE — being stuck mid-shift because a
        // customer was blocking the counter station was miserable
        W.service.stop();
        G.state.mechForm = 'robot';
        S.clampSaid = false;
      }
    }
  };

  S.draw = function (ctx) {
    var G = W.game;
    if (S.shakeT > 0) {
      S.shakeT -= 1 / 60;
      ctx.save();
      ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);
      drawScene(ctx, G);
      ctx.restore();
      return;
    }
    drawScene(ctx, G);
  };

  function drawScene(ctx, G) {
    // Indoors the light switch decides. Outdoors, only the campfire can
    // bring the night in — that is what "sleep under the stars" needs.
    var dark = (S.room.wallH || S.room.canNight) && !lightsOn(S.name);
    if (S.room.spooky) dark = true;          // the haunted house is never bright
    var sleepDark = 0;
    if (S.sleeping) {
      var sl = S.sleeping;
      sleepDark = sl.phase === 'dark' ? sl.t / 1.0 :
                  sl.phase === 'hold' ? 1 :
                  sl.phase === 'wake' ? 1 - sl.t / 1.0 : 0;
    }
    ctx.drawImage(dark ? nightBg(S.name) : S.bg, 0, 0);

    // the coaster the kid built, standing behind its boarding deck
    if (S.coasterDecks && S.coasterDecks.length && W.coasterMini) {
      var mini = W.coasterMini(G.state.coaster || [], 300, 150);
      if (mini) {
        for (var dk = 0; dk < S.coasterDecks.length; dk++) {
          ctx.drawImage(mini, S.coasterDecks[dk][0] - mini.width / 2,
                              S.coasterDecks[dk][1] - mini.height);
        }
      }
    }

    var list = S.sprites.slice();
    if (S.machineCtl && S.machineCtl.sprite) {
      // the machine sorts by where it IS, not where it is parked
      var mi2 = list.indexOf(S.machineCtl.sprite);
      if (mi2 >= 0) {
        var mv = list[mi2];
        var mdy = S.machineCtl.y - S.machineCtl.home[1];
        list[mi2] = { img: mv.img, ox: mv.ox, oy: mv.oy, kind: mv.kind,
                      baseY: mv.baseY + mdy, moving: mv };
      }
    }
    list.push({ actor: S.player, baseY: S.player.y });
    for (var n = 0; n < S.npcs.length; n++) {
      list.push({ actor: S.npcs[n], baseY: S.npcs[n].y });
    }
    list.sort(function (a, b) { return a.baseY - b.baseY; });

    var cartMode = G.state.mechForm === 'cart' && W.can('transform');
    var psc = playerScale();
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.actor === S.player) {
        if (S.machineCtl) {
          // he is up in the cab, drawn with the machine
        } else if (S.riding) {
          // drawn on the swing further down, not standing on the grass
        } else if (S.sleeping) {
          // drawn last, after this loop — he lies ON the bed, over the blanket
        } else if (S.seated) {
          W.drawChar(ctx, S.player.x, S.player.y, {
            char: W.heroChar(), suit: G.state.suit, dir: 'down', t: G.t, scale: 0.9 * psc,
            held: G.state.held
          });
        } else if (cartMode) {
          W.drawStand(ctx, S.player.x, S.player.y - 26, 1, G.t);
        } else {
          S.player.scale = psc;
          it.actor.draw(ctx, G.t);
          S.player.scale = 1;
        }
      } else if (it.actor) {
        if (!it.actor.hidden) it.actor.draw(ctx, G.t);
      } else if (S.machineCtl && (it === S.machineCtl.sprite || it.moving === S.machineCtl.sprite)) {
        // the machine is out on the job, wherever Bobby has driven it
        var mdx = S.machineCtl.x - S.machineCtl.home[0];
        var mdy2 = S.machineCtl.y - S.machineCtl.home[1];
        ctx.drawImage(it.img, it.ox + mdx, it.oy + mdy2);
        W.drawChar(ctx, S.machineCtl.x, S.machineCtl.y - 34, {
          char: W.heroChar(), suit: G.state.suit, dir: 'down', t: G.t,
          scale: 0.44, noShadow: true
        });
      } else {
        ctx.drawImage(it.img, it.ox, it.oy);
      }
    }

    // riders paint over the ride they are sitting on — except the teacups,
    // where the cup is painted over the rider, because they sit INSIDE it
    if (S.riding) {
      var rp = S.ridePos(0);
      if (S.riding.kind === 'carousel') {
        // the teacup pass paints these riders, sitting inside their cups
        if (Math.random() < 0.06) W.fx.sparkle(rp.x, rp.y - 40, 1, 30);
      } else {
        W.drawChar(ctx, rp.x, rp.y, {
          char: W.heroChar(), suit: G.state.suit, dir: 'down', t: G.t,
          scale: rp.scale || 0.82, spin: rp.spin, noShadow: true, held: G.state.held,
          neck: W.neckStretch ? W.neckStretch() : 0,
          legs8: W.spiderLegs ? W.spiderLegs() : 0
        });
        if (S.riding.partner) {
          var pp0 = S.ridePos(1);
          var pf = W.FRIENDS[S.riding.partner.friendKey];
          W.drawChar(ctx, pp0.x, pp0.y, {
            char: pf ? pf.char : 'npc', dir: 'down', t: G.t,
            scale: 0.82, spin: -rp.spin, noShadow: true
          });
        }
      }
    }

    // the sleeper paints over everything: tucked in, head on the pillow
    if (S.sleeping) {
      W.drawChar(ctx, S.player.x, S.player.y, {
        char: W.heroChar(), suit: G.state.suit, dir: 'down', t: 3.3,   // eyes mid-blink
        scale: 0.88, noShadow: true
      });
    }

    // the teacups, and then the canopy above the lot of them
    if (S.canopies && S.canopies.length) {
      var CT = W.CAROUSEL_TOP, cimg = canopyImg();
      var rideSt = S.riding && S.riding.kind === 'carousel' ? S.riding.st : null;
      for (var cq = 0; cq < S.canopies.length; cq++) {
        var ccx = S.canopies[cq][0], ccy = S.canopies[cq][1] - 4;
        var slots = [];
        for (var sl = 0; sl < CUP_SLOTS; sl++) {
          var pos = cupSlot(ccx, ccy, sl, S.cupT || 0);
          pos.slot = sl;
          slots.push(pos);
        }
        slots.sort(function (a, b) { return a.y - b.y; });   // back cups first
        for (var q2 = 0; q2 < slots.length; q2++) {
          var sp2 = slots[q2];
          // is somebody sitting in this one?
          if (rideSt && sp2.slot === 0) {
            W.drawChar(ctx, sp2.x, sp2.y - 26, {
              char: W.heroChar(), suit: G.state.suit, dir: 'down', t: G.t,
              scale: sp2.scale, spin: sp2.spin, noShadow: true, held: G.state.held,
              neck: W.neckStretch ? W.neckStretch() : 0,
              legs8: W.spiderLegs ? W.spiderLegs() : 0
            });
          } else if (rideSt && sp2.slot === 2 && S.riding.partner) {
            var mf = W.FRIENDS[S.riding.partner.friendKey];
            W.drawChar(ctx, sp2.x, sp2.y - 26, {
              char: mf ? mf.char : 'npc', dir: 'down', t: G.t,
              scale: sp2.scale, spin: -sp2.spin, noShadow: true
            });
          }
          drawCupSeat(ctx, sp2.slot, sp2.x, sp2.y, sp2.cupSpin);
        }
        ctx.drawImage(cimg, ccx - CT.ax, S.canopies[cq][1] - CT.ay);
      }
    }

    // the colour beam, for a beat after a zap
    if (S.zapBeam) {
      S.zapBeam.t += 1 / 60;
      if (S.zapBeam.t > 0.45) S.zapBeam = null;
      else {
        var zb = S.zapBeam;
        var RAIN = ['#E0455F', '#F2C14E', '#9CCB6B', '#8FD0EE', '#B48FD6'];
        ctx.save();
        ctx.globalAlpha = 1 - zb.t / 0.45;
        ctx.lineCap = 'round';
        for (var rb2 = 0; rb2 < RAIN.length; rb2++) {
          ctx.strokeStyle = RAIN[rb2];
          ctx.lineWidth = 9 - rb2 * 1.4;
          ctx.beginPath();
          ctx.moveTo(zb.x0, zb.y0 + rb2 * 3 - 6);
          ctx.lineTo(zb.x1, zb.y1 + Math.sin(zb.t * 20 + rb2) * 5);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    siteJobArt(ctx);
    W.dropped.draw(ctx, S.name, G.t);

    for (var s2 = 0; s2 < S.stations.length; s2++) {
      var stn = S.stations[s2];
      if (stn.def.drawOn) stn.def.drawOn(ctx, stn);
    }

    W.fx.draw(ctx);

    if (S.room.outdoor && G.SCENE_TINTS) {
      var tint = G.PHASE_TINT[G.phase4()];
      if (tint.alpha > 0) {
        ctx.save();
        ctx.globalCompositeOperation = tint.mode;
        ctx.globalAlpha = tint.alpha;
        ctx.fillStyle = tint.color;
        ctx.fillRect(0, 0, 960, 600);
        ctx.restore();
      }
    }
    /* Camp night: the sky bake alone leaves the rocks and the balloon
     * looking like broad daylight, so a gentle veil goes over everything —
     * with a warm hole punched around the fire. Indoor rooms keep their
     * existing look; this is only for rooms that can turn to night. */
    if (dark && !S.room.wallH && !S.sleeping) {
      ctx.save();
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = '#241640';
      ctx.fillRect(0, 0, 960, 600);
      ctx.restore();
      for (var fs = 0; fs < S.stations.length; fs++) {
        var fst = S.stations[fs];
        if (fst.kind !== 'firepit' || !fst.s.lit) continue;
        var fx0 = fst.x + fst.w / 2, fy0 = fst.y + 10;
        var rr = 150 + Math.sin(G.t * 5) * 8;
        var gr2 = ctx.createRadialGradient(fx0, fy0, 10, fx0, fy0, rr);
        gr2.addColorStop(0, 'rgba(255,206,120,0.45)');
        gr2.addColorStop(0.6, 'rgba(255,170,90,0.16)');
        gr2.addColorStop(1, 'rgba(255,170,90,0)');
        ctx.save();
        ctx.fillStyle = gr2;
        ctx.fillRect(fx0 - rr, fy0 - rr, rr * 2, rr * 2);
        ctx.restore();
      }
    }

    // weather is decoration only — particles and the rainbow, never a
    // colour wash (tinting made everything read as gloom)
    if (S.room.outdoor) {
      if (G.state.weather === 'rainbow') {
        if (!S.rainbowTile) {
          S.rainbowTile = C.offscreen(400, 180);
          var rg = S.rainbowTile.getContext('2d');
          var rcols = ['#D9402F', '#E8834E', '#F2C14E', '#6FA84B', '#5FA8D6', '#B48FD6'];
          for (var rb = 0; rb < 6; rb++) {
            C.arc(rg, 200, 190, 160 - rb * 9, Math.PI, Math.PI * 2, {
              seed: 'rb' + rb, stroke: rcols[rb], lw: 8, wob: 1.6, passes: 1, strokeAlpha: 0.7
            });
          }
        }
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.drawImage(S.rainbowTile, 545, 6);
        ctx.restore();
      }
    }

    // disco boba: a gentle hue party. A plain source-over wash — the old
    // 'overlay' composite fell off the renderer's fast path at ~84ms/frame.
    if (G.bobaFx && G.bobaFx.kind === 'disco') {
      // bright pastel hues only — the party must never DARKEN the room
      var hue = (G.t * 60) % 360;
      ctx.save();
      ctx.globalAlpha = 0.10 + 0.03 * Math.sin(G.t * 6);
      ctx.fillStyle = 'hsl(' + hue + ', 90%, 78%)';
      ctx.fillRect(0, 0, 960, 600);
      ctx.restore();
    }

    // bedtime darkness rides over everything else
    if (sleepDark > 0) {
      ctx.save();
      ctx.globalAlpha = sleepDark * 0.86;
      ctx.drawImage(nightBg(S.name), 0, 0);
      ctx.globalAlpha = sleepDark * 0.4;
      ctx.fillStyle = '#241640';
      ctx.fillRect(0, 0, 960, 600);
      ctx.restore();
    }

    for (var b = 0; b < S.npcs.length; b++) S.npcs[b].drawBubble(ctx);

    if (S.prompt && !S.sleeping) {
      var kc = S.prompt.keyChar || 'Z';
      if (S.promptStation && S.promptStation.def.stopWith === 'back' && W.service.active()) kc = 'X';
      // while driving a site machine, the pill rides under the machine
      var ppx = S.machineCtl ? S.machineCtl.x : S.player.x;
      var ppy = S.machineCtl ? S.machineCtl.y + 30 : S.player.y + 24;
      // a locked press wobbles the pill — the no-reading "that doesn't work"
      if (S.promptShake > 0) {
        S.promptShake -= 1 / 60;
        ppx += Math.sin(S.promptShake * 55) * 5;
      }
      W.drawPrompt(ctx, ppx, ppy, S.prompt.text, G.t, S.prompt.locked, kc,
        S.prompt.key2, S.prompt.label2, S.prompt.icon);
    }
    W.dialogue.draw(ctx, S.player.x, S.player.y - 132);

    W.drawHUD(ctx);
    if (W.service.active()) W.service.draw(ctx);
    W.drawBasketBar(ctx);

    if (!G.overlay) {
      C.textCached(ctx, S.room.name, 22, 582, {
        size: 20, color: PAL.white, outline: 3.4, outlineColor: PAL.outline, seed: 'rn' + S.name
      });
      // two hint lines take turns so X/P/M get taught too
      var alt = Math.floor(G.t / 7) % 2 === 1;
      var hint = alt ? 'X stop · A talk · K love · P pause · M sound'
                     : 'arrows move · shift run · space jump · Z do';
      if (W.can('transform') && !alt) hint = 'T transform · ' + hint;
      C.textCached(ctx, hint, 946, 582, {
        size: 13, align: 'right', color: PAL.white,
        outline: 3, outlineColor: PAL.outline,
        seed: 'hint' + (alt ? 'b' : 'a') + (W.can('transform') ? 'T' : '')
      });
    }
  }

  S.bobbyPos = function () { return [S.player.x, S.player.y]; };

  W.sceneHouse = S;
})(window.W);
