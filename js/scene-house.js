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
    var dots = dotsCache[room.name] = [];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 16; c++) {
        var dx = 24 + c * 62 + (r % 2) * 31, dy = 26 + r * 46;
        g.drawImage(wallDotTile, dx - 7, dy - 7);
        dots.push([dx, dy]);
      }
    }
    C.line(g, -6, room.wallH, 966, room.wallH, { seed: 'base', stroke: PAL.outline, lw: 3.4, wob: 1.6 });
    C.rect(g, -6, room.wallH - 12, 972, 12, {
      seed: 'skirt', fill: PAL.white, stroke: null, hatch: 4, wash: 0.6, fillAlpha: 0.3
    });
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
        var sx = W.clamp(d.x + d.w / 2, 58, 902), sy = d.y + d.h / 2;
        C.line(g, sx, sy + 40, sx, sy - 30, { seed: 'sp' + i, stroke: PAL.woodDk, lw: 7, wob: 1 });
        C.roundRect(g, sx - 46, sy - 62, 92, 34, 6, {
          seed: 'sb' + i, fill: PAL.wood, stroke: PAL.outline, lw: 2.8, hatch: 3.4, wash: 0.7
        });
        C.text(g, d.label, sx, sy - 40, {
          size: 17, align: 'center', color: PAL.outline, seed: 'st' + i
        });
        // an arrow pointing off the edge
        var dirx = d.x < 480 ? -1 : 1;
        C.poly(g, [[sx + dirx * 30, sy - 52], [sx + dirx * 30, sy - 38], [sx + dirx * 42, sy - 45]], {
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
  function effectiveProps(name) {
    var base = W.ROOMS[name].props.map(function (p) {
      if (p.buildable && W.game.state.builtTreehouse) {
        var q = {};
        for (var k in p) q[k] = p[k];
        q.kind = 'treehouse';
        q.x = p.x - 60;
        return q;
      }
      return p;
    });
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
      .map(function (p) { return W.makePropSprite(p); });
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
      var gr = g.createRadialGradient(cx, cy, 8, cx, cy, 95);
      gr.addColorStop(0, 'rgba(242,193,78,0.42)');
      gr.addColorStop(1, 'rgba(242,193,78,0)');
      g.fillStyle = gr;
      g.fillRect(cx - 95, cy - 95, 190, 190);
      // blot out the dimmed baked label first, or the bright repaint ghosts
      var ly = d.art === 'wall' ? room.wallH - 22 : cy + 6;
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
    if (!st.friendRooms) {
      st.friendRooms = {};
      Object.keys(W.ROOMS).forEach(function (rn) {
        (W.ROOMS[rn].residents || []).forEach(function (k) { st.friendRooms[k] = rn; });
      });
    }
    Object.keys(st.friendRooms).forEach(function (key) {
      if (st.friendRooms[key] !== name) return;
      if (st.party.indexOf(key) >= 0) return;
      var pt = spot('res' + key);
      var a = W.makeFriend(key, pt[0], pt[1]);
      a.mode = 'wander';
      out.push(a);
    });

    for (var c = 0; c < (room.crowd || 0); c++) {
      var cp = spot('crowd' + c);
      out.push(W.makeCrowd(c, cp[0], cp[1]));
    }

    // whoever is following Bobby comes along — behind him if there's room,
    // otherwise anywhere walkable (a blind offset used to strand them out of
    // bounds at edge-of-room spawns, frozen forever)
    // the pet comes everywhere — unless it's been told to stay in a room
    if (st.pet && (!st.petHome || st.petHome === name)) {
      var pang = Math.PI * 0.6;
      var petx = S.spawnX + Math.cos(pang) * 46, pety = S.spawnY + Math.sin(pang) * 40;
      if (!W.canStand(room, solids, petx, pety)) {
        var pp = spot('pet'); petx = pp[0]; pety = pp[1];
      }
      var pet = new W.Actor({
        char: 'pet', x: petx, y: pety, speed: 175, mood: PAL.accent
      });
      pet.isPet = true;
      pet.name = st.pet.name;
      pet.scale = 0.9;
      pet.mode = st.petHome ? 'wander' : 'follow';
      pet.data.slot = st.party.length;       // trots at the back of the line
      pet.data.chatIn = 6 + Math.random() * 8;
      out.push(pet);
    }

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
    S.stations = W.buildStations(name);

    // A job belongs to its room; walking out clocks you off.
    if (W.service.active() && W.service.room() !== name) {
      W.service.stop(true);
      W.say('Job closed for now.');
    }

    var sp = (param && param.spawn) || S.room.spawn;
    S.spawnX = sp[0]; S.spawnY = sp[1];

    S.player = new W.Actor({ char: 'bobby', x: sp[0], y: sp[1], isPlayer: true });
    S.player.dir = (param && param.dir) || 'down';
    S.seated = null;
    S.sleeping = null;
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

  /* Nearest standable point to (x,y), searching outward in rings. */
  function spotNear(x, y) {
    for (var r = 12; r <= 120; r += 12) {
      for (var a = 0; a < 8; a++) {
        var nx = x + Math.cos(a * Math.PI / 4) * r;
        var ny = y + Math.sin(a * Math.PI / 4) * r;
        if (W.canStand(S.room, S.solids, nx, ny)) return [nx, ny];
      }
    }
    return null;
  }
  S.spotNear = spotNear;

  /* Bedtime, called by the bed stations. */
  S.startSleep = function (wakeAt) {
    var over = S.npcs.some(function (n) { return !!n.friendKey || n.isPet; }) ||
               W.game.state.party.length > 0;
    S.sleeping = { phase: 'lie', t: 0, sleepover: over, wakeAt: wakeAt };
    // the dark bake happens NOW, behind the lie-down, not as a freeze later
    if (S.room.wallH) nightBg(S.name);

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
    W.basket.remove('boba');
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

  function playerScale() {
    var fx = W.game.bobaFx;
    if (!fx) return 1;
    if (fx.kind === 'giant') return 1.5;
    if (fx.kind === 'tiny') return 0.5;
    return 1;
  }

  S.update = function (dt) {
    var G = W.game;
    if (pendingRebuild) {
      var rb = pendingRebuild;
      pendingRebuild = null;
      W.rebuildRoom(rb);
    }
    S.lock = Math.max(0, S.lock - dt);

    // always drain at least one pose per frame — a stalled queue means the
    // bake happens synchronously inside draw instead, which is worse
    var wb = performance.now() + 3;
    if (W.warmStep()) while (performance.now() + W.warmAvg() < wb + 6 && W.warmStep()) { /* one more */ }

    W.dialogue.update(dt);
    W.fx.update(dt);
    S.player.update(dt);

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
      run = W.input.down('run');
      if (!S.seated && W.input.hit('jump')) S.player.jump();
    }

    if (S.seated) {
      if (ax !== 0 || ay !== 0) {
        // stand up in front of the chair
        S.player.x = S.seated.x + S.seated.w / 2;
        S.player.y = S.seated.y + S.seated.h + 16;
        S.seated = null;
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
    if (G.bobaFx && G.bobaFx.kind === 'toots' && S.player.moving && Math.random() < dt * 9) {
      W.fx.sparkle(S.player.x - (S.player.dir === 'right' ? 26 : S.player.dir === 'left' ? -26 : 0),
                   S.player.y - 14, 2, 22);
    }

    if (W.input.hit('transform')) {
      if (W.can('transform')) {
        G.state.mechForm = G.state.mechForm === 'cart' ? 'robot' : 'cart';
        W.fx.sparkle(S.player.x, S.player.y - 50, 20, 110);
        W.say(G.state.mechForm === 'cart' ? 'Boba cart mode!' : 'Robot mode!', PAL.sun);
        if (W.audio) W.audio.play('clack');
      } else {
        W.say('Only the Boba Bear Bot can transform.');
      }
    }

    if (W.service.active()) {
      W.service.update(dt, S.room, S.solids, S.npcs);
      if (W.input.hit('special') && W.service.armed()) {
        G.fadeTo('mission', { mission: 'megatron' });
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

    // ------- doors
    if (!S.lock && S.player.jumpT === 0 && !S.seated) {
      for (var d = 0; d < S.room.doors.length; d++) {
        var dr = S.room.doors[d];
        if (inZone(S.player.x, S.player.y, dr)) {
          if (W.audio) W.audio.play('doorpop');
          G.fadeTo('house', { room: dr.to, spawn: dr.spawn });
          return;
        }
      }
    }

    // ------- what can Bobby do right now? (priority: serve, station,
    //         pick up, talk, then drink/drop as the fallback)
    S.prompt = null; S.promptStation = null; S.talkTo = null;
    S.pickupTarget = null; S.serveTo = null;
    var px = S.player.x, py = S.player.y;

    if (S.seated) {
      // seated: the only prompt is eating off an adjacent set table
      var eatAt = null;
      for (var t2 = 0; t2 < S.stations.length; t2++) {
        var ts = S.stations[t2];
        if (ts.kind === 'table' && ts.s.set && ts.s.set.length &&
            rectDist(px, py, ts) < 110) { eatAt = ts; break; }
      }
      if (eatAt) {
        S.promptStation = eatAt;
        S.eatMode = true;
        S.prompt = { text: 'Eat the ' + W.ITEMS[eatAt.s.set[0]].name + '!', locked: false };
      } else {
        S.eatMode = false;
        if (S.seated.kind === 'sofa') {
          var tvOn2 = S.stations.some(function (x) { return x.kind === 'tv' && x.s.on; });
          S.prompt = { text: tvOn2 ? 'Cosy! Enjoying the show' : 'Comfy! (arrows to get up)', locked: true };
        } else {
          S.prompt = { text: 'Put dinner on the table first!', locked: true };
        }
      }
    } else {
      S.eatMode = false;

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
        if (bestS) {
          S.promptStation = bestS;
          S.prompt = W.stationPrompt(bestS);
        }
      }

      if (!S.prompt) {
        var pk = W.dropped.nearest(S.name, px, py, 44);
        if (pk) {
          S.pickupTarget = pk;
          S.prompt = { text: 'Pick up the ' + W.ITEMS[pk.id].name, locked: false };
        }
      }

      // the nearest soul is tracked ALWAYS (X-stay/X-Dee work off it even
      // when the visible prompt is something else)
      var best = null, bestD = 70;
      for (var n = 0; n < S.npcs.length; n++) {
        var np = S.npcs[n];
        var dd = Math.hypot(np.x - S.player.x, np.y - S.player.y);
        if (dd < bestD) { bestD = dd; best = np; }
      }
      S.talkTo = best;

      // friends outrank the drink/drop fallback (meeting someone matters)...
      if (!S.prompt && best && !best.isPet) {
        var fdef = W.FRIENDS[best.friendKey];
        var giftable = fdef && fdef.likes && W.basket.has(fdef.likes);
        var following = best.friendKey && G.state.party.indexOf(best.friendKey) >= 0;
        S.giftTo = giftable ? best : null;
        S.prompt = giftable
          ? { text: 'Give ' + best.name + ' the ' + W.ITEMS[fdef.likes].name + '!', locked: false }
          : following
            ? { text: 'chat', locked: false, key2: 'X', label2: 'say Dee' }
            : { text: 'Say Trix to ' + best.name, locked: false };
      }

      if (!S.prompt && W.basket.count() > 0) {
        var last = G.state.basket[G.state.basket.length - 1];
        S.prompt = last === 'boba'
          ? { text: 'Drink the Boba!', locked: false }
          : { text: 'Put down the ' + W.ITEMS[last].name, locked: false };
        S.fallback = last;
        // the pup trots close by ALL the time — it must never mask the
        // basket actions, so its X option rides along on the same pill
        if (best && best.isPet) {
          S.prompt.key2 = 'X';
          S.prompt.label2 = G.state.petHome ? 'come along' : 'stay here';
        }
      } else {
        S.fallback = null;
      }

      // ...but the pup gets the prompt to itself when your hands are empty
      if (!S.prompt && best && best.isPet) {
        var hasTreat = W.basket.has('treat');
        S.prompt = {
          text: hasTreat ? 'Give ' + best.name + ' a treat' : 'Pet ' + best.name,
          locked: false,
          key2: 'X',
          label2: G.state.petHome ? 'come along' : 'stay here'
        };
        S.petPrompt = true;
      } else {
        S.petPrompt = !!(S.fallback && best && best.isPet) ? false : false;
      }
    }

    // ------- Z: do the thing
    if (W.input.hit('act')) {
      if (W.dialogue.skip()) {
        // consumed finishing the typewriter
      } else if (S.eatMode && S.promptStation) {
        W.stationEat(S.promptStation, S.player);
      } else if (S.serveTo) {
        W.service.serve();
      } else if (S.promptStation && !S.seated) {
        var line = pickLine(S.promptStation.kind);
        W.stationAct(S.promptStation, S.player);
        if (line && !W.dialogue.active) W.say(line);
      } else if (S.pickupTarget) {
        if (W.dropped.take(S.name, S.pickupTarget)) {
          W.say('Got the ' + W.ITEMS[S.pickupTarget.id].name + ' back.');
          if (W.audio) W.audio.play('pickup');
        } else {
          W.say('The basket is full!');
        }
      } else if (S.fallback && (!S.talkTo || S.talkTo.isPet)) {
        if (S.fallback === 'boba') drinkBoba();
        else if (S.player.jumpT > 0) {
          // dropping mid-jump could maroon an item on a door mat
        } else {
          var did2 = W.dropped.drop(S.name, S.player.x, S.player.y);
          if (did2) W.say('There. Safe on the floor.');
        }
      } else if (S.talkTo) {
        if (S.talkTo.isPet) {
          if (W.basket.has('treat')) {
            W.basket.remove('treat');
            G.state.petFedDay = G.state.day;
            S.talkTo.says('*chomp chomp* squee!', 2.4);
            W.fx.hearts(S.talkTo.x, S.talkTo.y - 60, 6);
            if (W.audio) W.audio.play('chomp');
          } else {
            S.talkTo.says(['squee!', '*happy wiggle*', '*purrs fuzzily*'][Math.floor(Math.random() * 3)], 2.2);
            W.fx.hearts(S.talkTo.x, S.talkTo.y - 60, 2);
            if (W.audio) W.audio.play('blip');
          }
        } else if (S.giftTo === S.talkTo && W.giveGift(S.talkTo)) {
          S.giftTo = null;
        } else if (W.talkTo(S.talkTo)) {
          W.renumberParty(S.npcs);
        }
      } else if (S.fallback) {
        if (S.fallback === 'boba') drinkBoba();
        else if (S.player.jumpT > 0) {
          // dropping mid-jump could maroon an item on a door mat
        } else {
          var did = W.dropped.drop(S.name, S.player.x, S.player.y);
          if (did) W.say('There. Safe on the floor.');
        }
      }
    }

    // ------- X: stop the thing (dismiss a follower, clock off a job)
    if (W.input.hit('back')) {
      if (S.talkTo && S.talkTo.isPet) {
        // the pup can wait at home instead of tagging along
        if (G.state.petHome) {
          G.state.petHome = null;
          S.talkTo.mode = 'follow';
          S.talkTo.data.slot = G.state.party.length;
          S.talkTo.says('*zoomies!*', 2.2);
          W.say(S.talkTo.name + ' is coming along!');
        } else {
          G.state.petHome = S.name;
          S.talkTo.mode = 'wander';
          S.talkTo.says('*curls up*', 2.4);
          W.say(S.talkTo.name + ' will wait here for you.');
        }
        if (W.audio) W.audio.play('blip');
      } else if (S.talkTo && S.talkTo.friendKey &&
          G.state.party.indexOf(S.talkTo.friendKey) >= 0) {
        W.dismiss(S.talkTo, S.name);
        W.renumberParty(S.npcs);
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
    var dark = S.room.wallH && !lightsOn(S.name);
    var sleepDark = 0;
    if (S.sleeping) {
      var sl = S.sleeping;
      sleepDark = sl.phase === 'dark' ? sl.t / 1.0 :
                  sl.phase === 'hold' ? 1 :
                  sl.phase === 'wake' ? 1 - sl.t / 1.0 : 0;
    }
    ctx.drawImage(dark ? nightBg(S.name) : S.bg, 0, 0);

    var list = S.sprites.slice();
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
        if (S.sleeping) {
          // drawn last, after this loop — he lies ON the bed, over the blanket
        } else if (S.seated) {
          W.drawChar(ctx, S.player.x, S.player.y, {
            char: 'bobby', suit: G.state.suit, dir: 'down', t: G.t, scale: 0.9 * psc
          });
        } else if (cartMode) {
          W.drawCart(ctx, S.player.x, S.player.y - 26, 1, G.t);
        } else {
          S.player.scale = psc;
          it.actor.draw(ctx, G.t);
          S.player.scale = 1;
        }
      } else if (it.actor) {
        it.actor.draw(ctx, G.t);
      } else {
        ctx.drawImage(it.img, it.ox, it.oy);
      }
    }

    // the sleeper paints over everything: tucked in, head on the pillow
    if (S.sleeping) {
      W.drawChar(ctx, S.player.x, S.player.y, {
        char: 'bobby', suit: G.state.suit, dir: 'down', t: 3.3,   // eyes mid-blink
        scale: 0.88, noShadow: true
      });
    }

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
      ctx.drawImage(S.room.wallH ? nightBg(S.name) : S.bg, 0, 0);
      ctx.globalAlpha = sleepDark * 0.4;
      ctx.fillStyle = '#241640';
      ctx.fillRect(0, 0, 960, 600);
      ctx.restore();
    }

    for (var b = 0; b < S.npcs.length; b++) S.npcs[b].drawBubble(ctx);

    if (S.prompt && !S.sleeping) {
      var kc = 'Z';
      if (S.promptStation && S.promptStation.def.stopWith === 'back' && W.service.active()) kc = 'X';
      W.drawPrompt(ctx, S.player.x, S.player.y + 24, S.prompt.text, G.t, S.prompt.locked, kc,
        S.prompt.key2, S.prompt.label2);
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
      var hint = alt ? 'X stop/say Dee · P pause · M sound · K love'
                     : 'arrows move · shift run · space jump · Z do';
      if (W.can('transform') && !alt) hint = 'T transform · ' + hint;
      C.textCached(ctx, hint, 938, 582, {
        size: 13, align: 'right', color: PAL.white,
        outline: 3, outlineColor: PAL.outline,
        seed: 'hint' + (alt ? 'b' : 'a') + (W.can('transform') ? 'T' : '')
      });
    }
  };

  S.bobbyPos = function () { return [S.player.x, S.player.y]; };

  W.sceneHouse = S;
})(window.W);
