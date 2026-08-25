/* Warmland 2 — build your own roller coaster.
 *
 * Two halves of one idea. In the BUILDER you pick pieces — climbs, drops,
 * hills, dips, loops and twists — and watch the track grow. Then you RIDE
 * the thing you made, with any friends who followed you strung out in
 * karts behind.
 *
 * The track is compiled to a polyline once per layout and baked, so the
 * ride itself is blits and arithmetic.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var MAX_PIECES = 10;

  /* Each piece is a little run of track described as offsets. The compiler
   * walks them left to right, so any order is buildable. */
  var PIECES = {
    straight: { name: 'STRAIGHT', dx: 150, dy: 0,    icon: 'straight' },
    climb:    { name: 'CLIMB',    dx: 150, dy: -110, icon: 'climb' },
    drop:     { name: 'DROP',     dx: 150, dy: 120,  icon: 'drop' },
    hill:     { name: 'HILL',     dx: 190, dy: 0,    icon: 'hill' },
    dip:      { name: 'DIP',      dx: 190, dy: 0,    icon: 'dip' },
    loop:     { name: 'LOOP',     dx: 150, dy: 0,    icon: 'loop' },
    twist:    { name: 'TWIST',    dx: 170, dy: 0,    icon: 'twist' }
  };
  var PIECE_ORDER = ['straight', 'climb', 'drop', 'hill', 'dip', 'loop', 'twist'];

  var S = { t: 0 };
  var trackCache = {};
  var skyBg = null;      // C.paper makes a fresh canvas EVERY call — bake once
  function sky() {
    if (!skyBg) skyBg = C.paper(960, 600, 'coastersky', '#BFE0F2');
    return skyBg;
  }

  // --------------------------------------------------------- compiling

  /* Turn a list of piece names into a path of points (plus the loops and
   * twists that need drawing specially). */
  function compile(list) {
    var pts = [[90, 430]];
    var marks = [];
    var x = 90, y = 430;
    list.forEach(function (key) {
      var p = PIECES[key];
      if (!p) return;
      if (key === 'hill' || key === 'dip') {
        var up = key === 'hill' ? -1 : 1;
        for (var h = 1; h <= 8; h++) {
          var f = h / 8;
          pts.push([x + p.dx * f, y + Math.sin(f * Math.PI) * 96 * up]);
        }
        x += p.dx;
      } else if (key === 'loop') {
        // the track rises into a circle and comes out the far side
        marks.push({ kind: 'loop', x: x + 75, y: y - 86 });
        for (var l = 1; l <= 12; l++) {
          var a = -Math.PI / 2 + (l / 12) * Math.PI * 2;
          pts.push([x + 75 + Math.cos(a) * 62, y - 86 + Math.sin(a) * 62]);
        }
        pts.push([x + p.dx, y]);
        x += p.dx;
      } else if (key === 'twist') {
        marks.push({ kind: 'twist', x: x + 85, y: y - 30 });
        for (var t2 = 1; t2 <= 10; t2++) {
          var f2 = t2 / 10;
          pts.push([x + p.dx * f2, y - Math.sin(f2 * Math.PI * 2) * 44]);
        }
        x += p.dx;
      } else {
        y = W.clamp(y + p.dy, 150, 470);
        pts.push([x + p.dx, y]);
        x += p.dx;
      }
    });
    // always come back down to the platform at the end
    pts.push([x + 130, 430]);

    // walk the finished polyline once and remember how far along each point
    // is — the ride then moves in pixels per second, not points per second,
    // so a long straight and a tight loop feel the same speed
    var len = [0];
    for (var i = 1; i < pts.length; i++) {
      len[i] = len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0],
                                       pts[i][1] - pts[i - 1][1]);
    }
    return { pts: pts, marks: marks, w: x + 240, len: len,
             total: len[len.length - 1] };
  }

  /* Where the rail is `s` pixels along, and which way it is pointing. Both
   * come out smooth between control points, which is what makes the ride
   * look like rolling rather than stepping. */
  function railAt(built, s) {
    var pts = built.pts, len = built.len;
    var total = built.total;
    s = W.clamp(s, 0, total);
    // find the segment by walking from a guess — the tracks are short
    var lo = 0, hi = len.length - 1;
    while (lo < hi - 1) {
      var mid = (lo + hi) >> 1;
      if (len[mid] <= s) lo = mid; else hi = mid;
    }
    var a = pts[lo], b = pts[Math.min(lo + 1, pts.length - 1)];
    var segLen = Math.max(0.001, len[Math.min(lo + 1, len.length - 1)] - len[lo]);
    var f = W.clamp((s - len[lo]) / segLen, 0, 1);
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var d = Math.hypot(dx, dy) || 1;
    return {
      x: a[0] + dx * f, y: a[1] + dy * f,
      ang: Math.atan2(dy, dx),
      slope: dy / d                      // +1 straight down, -1 straight up
    };
  }

  /* Bake the whole track once per layout. */
  function trackArt(list) {
    var key = list.join('-') || 'empty';
    if (trackCache[key]) return trackCache[key];
    var built = compile(list);
    var cv = C.offscreen(Math.max(960, built.w), 600);
    var g = cv.getContext('2d');

    // supports first, so the rails sit on top
    for (var i = 0; i < built.pts.length; i += 2) {
      var p = built.pts[i];
      if (p[1] > 452) continue;
      C.line(g, p[0], p[1] + 10, p[0], 486, {
        seed: 'sup' + i, stroke: '#8A5F38', lw: 4, wob: 1, passes: 1, strokeAlpha: 0.75
      });
    }
    // the ground
    C.rect(g, -6, 486, cv.width + 12, 120, {
      seed: 'cgnd', fill: PAL.grassDk, stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.6
    });
    // rails
    C.poly(g, built.pts, { seed: 'rail1', stroke: '#D9402F', lw: 7, wob: 1.2, closed: false, passes: 1 });
    C.poly(g, built.pts.map(function (p2) { return [p2[0], p2[1] + 11]; }), {
      seed: 'rail2', stroke: '#B9372A', lw: 5, wob: 1.2, closed: false, passes: 1
    });
    // sleepers
    for (var s2 = 0; s2 < built.pts.length; s2 += 1) {
      var q = built.pts[s2];
      C.line(g, q[0], q[1] - 2, q[0], q[1] + 12, {
        seed: 'sl' + s2, stroke: '#8A5F38', lw: 3, wob: 0.6, passes: 1, strokeAlpha: 0.8
      });
    }
    // a flag on every loop, bunting on every twist
    built.marks.forEach(function (m, mi) {
      if (m.kind === 'loop') {
        C.star(g, m.x, m.y, 14, PAL.sun, 'lpstar' + mi);
      } else {
        for (var b = 0; b < 4; b++) {
          C.dot(g, m.x - 30 + b * 20, m.y - 60, 6,
                ['#F2C14E', '#8FD0EE', '#E8A0B4', '#9CCB6B'][b], 'twb' + mi + b);
        }
      }
    });
    // the boarding platform
    C.rect(g, 40, 440, 110, 46, {
      seed: 'cdeck', fill: '#8A5F38', stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.78
    });
    trackCache[key] = { img: cv, built: built };
    // keep the cache honest — a kid can rebuild all afternoon
    var keys = Object.keys(trackCache);
    if (keys.length > 12) delete trackCache[keys[0]];
    return trackCache[key];
  }

  /* A little preview icon for each piece in the builder. */
  var pieceTiles = {};
  function pieceTile(key) {
    if (!pieceTiles[key]) {
      var cv = C.offscreen(80, 64);
      var g = cv.getContext('2d');
      var pts;
      if (key === 'climb') pts = [[8, 52], [72, 14]];
      else if (key === 'drop') pts = [[8, 14], [72, 52]];
      else if (key === 'hill') pts = [[8, 48], [24, 22], [40, 14], [56, 22], [72, 48]];
      else if (key === 'dip') pts = [[8, 18], [24, 44], [40, 52], [56, 44], [72, 18]];
      else if (key === 'twist') pts = [[8, 34], [24, 14], [40, 50], [56, 14], [72, 34]];
      else pts = [[8, 34], [72, 34]];
      if (key === 'loop') {
        C.line(g, 6, 46, 22, 46, { seed: 'pil1', stroke: '#D9402F', lw: 5, wob: 0.6 });
        C.arc(g, 40, 30, 18, 0, Math.PI * 2, { seed: 'pilo', stroke: '#D9402F', lw: 5, wob: 0.8 });
        C.line(g, 58, 46, 74, 46, { seed: 'pil2', stroke: '#D9402F', lw: 5, wob: 0.6 });
      } else {
        C.poly(g, pts, { seed: 'pi' + key, stroke: '#D9402F', lw: 5, wob: 0.8, closed: false, passes: 1 });
      }
      pieceTiles[key] = cv;
    }
    return pieceTiles[key];
  }

  /* The palette card, baked in both states. */
  var cardTiles = {};
  function cardTile(on) {
    var k = on ? 1 : 0;
    if (!cardTiles[k]) {
      var cv = C.offscreen(112, 94);
      C.roundRect(cv.getContext('2d'), 4, 4, 104, 86, 12, {
        seed: 'cp' + k, fill: on ? PAL.white : '#8A9EAE',
        stroke: on ? PAL.sun : PAL.outline, lw: on ? 5 : 3, hatch: 4, wash: 0.9,
        fillAlpha: on ? 0.35 : 0.5
      });
      cardTiles[k] = cv;
    }
    return cardTiles[k];
  }

  /* The kart the riders sit in. */
  var kartTile = null;
  function kart() {
    if (!kartTile) {
      kartTile = C.offscreen(80, 60);
      var g = kartTile.getContext('2d');
      C.roundRect(g, 10, 18, 60, 28, 9, {
        seed: 'ckart', fill: '#F2C14E', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
      });
      C.poly(g, [[66, 22], [78, 30], [66, 40]], {
        seed: 'cknose', fill: '#E8834E', stroke: PAL.outline, lw: 2.4, hatch: 2.6, wash: 0.8
      });
      for (var w = 0; w < 2; w++) {
        C.dot(g, 24 + w * 30, 48, 8, '#3B2A20', 'ckw' + w);
      }
    }
    return kartTile;
  }

  // ------------------------------------------------------------- scene

  S.enter = function (p) {
    S.t = 0;
    S.mode = (p && p.mode) || 'build';
    S.sel = 0;
    S.list = (W.game.state.coaster || []).slice();
    if (S.mode === 'ride') startRide();
    else W.say('Build your coaster! Arrows pick, Z adds.', PAL.sun);
  };

  function startRide() {
    S.mode = 'ride';
    var art = trackArt(S.list.length ? S.list : ['straight']);
    S.art = art;
    S.s = 0;                        // pixels travelled along the rail
    S.speed = 240;                  // a good shove off the platform
    S.done = false;
    S.doneT = 0;
    S.riders = [W.heroChar()];
    (W.game.state.party || []).slice(0, 3).forEach(function (k) {
      var f = W.FRIENDS[k];
      if (f) S.riders.push(f.char);
    });
    W.say('Hold on tight!!', PAL.accent);
    if (W.audio) W.audio.play('cheer');
  }

  S.update = function (dt) {
    var G = W.game;
    S.t += dt;
    W.dialogue.update(dt);
    W.fx.update(dt);

    if (S.mode === 'build') {
      if (W.input.hit('left'))  S.sel = (S.sel + PIECE_ORDER.length - 1) % PIECE_ORDER.length;
      if (W.input.hit('right')) S.sel = (S.sel + 1) % PIECE_ORDER.length;
      if (W.input.hit('talk') && S.list.length) {
        S.list.pop();                       // A takes the last piece back off
        if (W.audio) W.audio.play('clack');
      }
      if (W.input.hit('act')) {
        if (S.list.length >= MAX_PIECES) {
          W.say('That is a BIG coaster already — press X to ride it!');
        } else {
          S.list.push(PIECE_ORDER[S.sel]);
          G.state.coaster = S.list.slice();
          if (W.audio) W.audio.play('clack');
        }
      }
      if (W.input.hit('back')) {
        G.state.coaster = S.list.slice();
        if (S.list.length) startRide();
        else G.fadeTo('house', { room: 'themepark' });
      }
      return;
    }

    // ---- riding
    if (S.done) {
      S.doneT += dt;
      if (W.input.hit('act') && S.doneT > 0.5) {
        G.fadeTo('house', { room: 'themepark' });
      }
      if (W.input.hit('back')) G.fadeTo('house', { room: 'themepark' });
      return;
    }
    if (W.input.hit('back')) { G.fadeTo('house', { room: 'themepark' }); return; }

    var built = S.art.built;
    // real-ish physics: gravity along the rail, a little drag, and a gentle
    // push so a flat track still trundles home
    var GRAV = 1500, DRAG = 0.5, PUSH = 150, VMAX = 1100, VMIN = 150;
    var at = railAt(built, S.s);
    S.speed += (GRAV * at.slope - DRAG * S.speed + PUSH) * dt;
    S.speed = W.clamp(S.speed, VMIN, VMAX);
    S.s += S.speed * dt;
    S.tilt = at.ang;

    // a whoop of sparkles when you are really shifting
    if (S.speed > 560 && Math.random() < dt * 14) {
      W.fx.sparkle(at.x, at.y - 20, 1, 30);
    }
    if (S.s >= built.total) {
      S.done = true;
      S.doneT = 0;
      W.fx.hearts(480, 300, 10);
      W.fx.sparkle(480, 280, 26, 180);
      G.first('coaster', 'Rode your own coaster!');
      G.state.money += 4;
      W.say('AGAIN! AGAIN!', PAL.accent);
      if (W.audio) W.audio.play('win');
    }
  };

  S.draw = function (ctx) {
    var G = W.game;

    if (S.mode === 'build') {
      var art = trackArt(S.list);
      ctx.drawImage(sky(), 0, 0);
      // the track so far, scaled to fit the screen
      // shrink the whole track to fit, and sit its ground line just above
      // the palette so the two never overlap
      var sc = Math.min(1, 900 / Math.max(600, art.built.w));
      ctx.save();
      ctx.translate(30, 430 - 486 * sc);
      ctx.scale(sc, sc);
      ctx.drawImage(art.img, 0, 0);
      ctx.restore();

      // the palette
      C.textCached(ctx, 'BUILD YOUR COASTER', 480, 52, {
        size: 30, align: 'center', color: PAL.roof,
        outline: 4, outlineColor: PAL.white, seed: 'cbt'
      });
      for (var i = 0; i < PIECE_ORDER.length; i++) {
        var on = i === S.sel, cx = 110 + i * 123;
        ctx.drawImage(cardTile(on), cx - 56, 472);
        ctx.drawImage(pieceTile(PIECE_ORDER[i]), cx - 40, 484);
        C.textCached(ctx, PIECES[PIECE_ORDER[i]].name, cx, 556, {
          size: 12, align: 'center', color: PAL.outline, seed: 'cpn' + i
        });
      }
      C.textCached(ctx, 'pieces: ' + S.list.length + ' / ' + MAX_PIECES, 480, 92, {
        size: 18, align: 'center', color: PAL.outline, seed: 'cpc' + S.list.length
      });
      W.drawPrompt(ctx, 300, 446, 'add this piece', S.t, false, 'Z', 'A', 'take one off');
      W.drawPrompt(ctx, 700, 446, 'RIDE IT!', S.t, false, 'X');
      W.dialogue.draw(ctx, 480, 300);
      return;
    }

    // ---- the ride
    var built = S.art.built;
    var lead = railAt(built, S.s);
    var camX = W.clamp(lead.x - 380, 0, Math.max(0, S.art.img.width - 960));
    ctx.drawImage(sky(), 0, 0);
    ctx.drawImage(S.art.img, -camX, 0);

    // the train: the hero in front, friends coupled 54px of rail behind
    for (var r = 0; r < S.riders.length; r++) {
      var at2 = railAt(built, S.s - r * 54);
      ctx.save();
      ctx.translate(at2.x - camX, at2.y - 6);
      ctx.rotate(at2.ang);
      ctx.drawImage(kart(), -40, -30);
      ctx.restore();
      // riders lean back going up and forward coming down, and jiggle faster
      // the faster the kart is going
      // ride IN the kart: same rotated frame, seat height applied after the
      // turn, so a rider never floats off the side on a slope
      var jig = Math.sin(S.t * 16 + r * 1.3) * 0.05 * (S.speed / 560);
      ctx.save();
      ctx.translate(at2.x - camX, at2.y - 6);
      ctx.rotate(at2.ang + jig);
      W.drawChar(ctx, 0, -18, {
        char: S.riders[r],
        suit: r === 0 ? G.state.suit : 'none',
        dir: 'down', t: G.t, scale: 0.42, noShadow: true
      });
      ctx.restore();
    }

    // how fast are we going? a little speed streak sells it
    if (S.speed > 520 && !S.done) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.45, (S.speed - 520) / 700);
      ctx.strokeStyle = PAL.white;
      ctx.lineWidth = 3;
      for (var sk = 0; sk < 5; sk++) {
        var sy2 = 120 + sk * 84 + (S.t * 900 % 84);
        ctx.beginPath();
        ctx.moveTo(40, sy2);
        ctx.lineTo(150, sy2);
        ctx.stroke();
      }
      ctx.restore();
    }

    W.fx.draw(ctx);

    C.textCached(ctx, 'WHEEEEE!', 480, 60, {
      size: 30, align: 'center', color: PAL.sun,
      outline: 4, outlineColor: PAL.outline, seed: 'cwhee'
    });

    if (S.done) {
      C.roundRect(ctx, 270, 170, 420, 220, 18, {
        seed: 'cfin', fill: PAL.white, stroke: PAL.outline, lw: 5, hatch: 5, wash: 0.9, fillAlpha: 0.3
      });
      C.textCached(ctx, 'WHAT A RIDE!', 480, 232, {
        size: 32, align: 'center', color: PAL.sun,
        outline: 5, outlineColor: PAL.outline, seed: 'cfint'
      });
      C.textCached(ctx, S.list.length + ' pieces  ·  ' + S.riders.length + ' riders', 480, 282, {
        size: 19, align: 'center', color: PAL.outline, seed: 'cfins' + S.list.length + S.riders.length
      });
      W.drawPrompt(ctx, 480, 346, 'back to the park', S.t, false, 'Z');
    } else {
      W.drawPrompt(ctx, 480, 566, 'hop off', S.t, false, 'X');
    }
    W.dialogue.draw(ctx, 480, 460);
  };

  /* A little picture of whatever the kid built, for the theme park to show
   * standing behind the boarding deck. Baked per layout, tiny. */
  var miniCache = {};
  W.coasterMini = function (list, maxW, maxH) {
    if (!list || !list.length) return null;
    var key = list.join('-') + '|' + maxW + 'x' + maxH;
    if (miniCache[key]) return miniCache[key];
    var built = compile(list);
    var minY = 600, maxY = 0, maxX = 0;
    built.pts.forEach(function (p) {
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
      if (p[0] > maxX) maxX = p[0];
    });
    var w = maxX + 40, h = (maxY - minY) + 60;
    var sc = Math.min(maxW / w, maxH / h);
    var cv = C.offscreen(Math.ceil(w * sc), Math.ceil(h * sc));
    var g = cv.getContext('2d');
    g.scale(sc, sc);
    g.translate(0, -minY + 30);
    // legs, then the rail — the same shapes as the real thing, just small
    for (var i = 0; i < built.pts.length; i += 3) {
      var pt = built.pts[i];
      C.line(g, pt[0], pt[1], pt[0], maxY + 24, {
        seed: 'mleg' + i, stroke: '#8A5F38', lw: 5 / sc, wob: 0.6, passes: 1, strokeAlpha: 0.7
      });
    }
    C.poly(g, built.pts, {
      seed: 'mrail', stroke: '#D9402F', lw: 9 / sc, wob: 1, closed: false, passes: 1
    });
    built.marks.forEach(function (m, mi) {
      if (m.kind === 'loop') C.star(g, m.x, m.y, 18 / sc, PAL.sun, 'mst' + mi);
    });
    miniCache[key] = cv;
    var ks = Object.keys(miniCache);
    if (ks.length > 8) delete miniCache[ks[0]];
    return cv;
  };

  S.startRide = startRide;        // the harness starts a ride directly

  W.sceneCoaster = S;

})(window.W);
