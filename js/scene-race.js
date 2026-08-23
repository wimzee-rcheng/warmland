/* Warmland — the race track.
 *
 * The racer costume needed somewhere to actually RACE. This is a top-down
 * oval: three laps, three rivals, and a rubber band so a five-year-old is
 * never hopelessly behind or bored out in front.
 *
 * Everything is baked — the track is one big offscreen canvas, each kart is
 * six phases per tint. The per-frame cost is blits, nothing else.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var WORLD = { w: 1600, h: 1000 };
  var CX = 800, CY = 500;
  var RX = 500, RY = 290;                 // the racing line
  var HALF = 96;                          // half the track width
  var LAPS = 3;
  var N_WP = 48;

  /* The racing line, as points. Rivals steer along it; the player is only
   * measured against it (are they on the tarmac, and how far round?). */
  var WP = [];
  for (var i = 0; i < N_WP; i++) {
    var a = (i / N_WP) * Math.PI * 2;
    WP.push([CX + Math.cos(a) * RX, CY + Math.sin(a) * RY]);
  }

  var S = { t: 0 };
  var track = null;
  var kartTiles = {};

  // ------------------------------------------------------------- kart art

  /* A darker version of a kart colour, for the nose cone and seat. */
  function darker(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = W.clamp(((n >> 16) & 255) - amt, 0, 255);
    var g2 = W.clamp(((n >> 8) & 255) - amt, 0, 255);
    var b = W.clamp((n & 255) - amt, 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g2 << 8) + b).toString(16).slice(1);
  }

  function paintKart(g, t, tint) {
    var dark = darker(tint, 50);
    g.save();
    g.globalAlpha = 0.14;
    g.fillStyle = PAL.outline;
    g.beginPath(); g.ellipse(0, 20, 42, 12, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;

    // seen from above and a little behind: body, nose, seat, four tyres
    for (var w = -1; w <= 1; w += 2) {
      for (var f = -1; f <= 1; f += 2) {
        var spin = Math.sin(t * 8 + (f > 0 ? 1 : 0)) * 3;
        C.roundRect(g, f * 22 - 9, w * 20 - 7 + spin, 18, 14, 4, {
          seed: 'kt' + w + f, fill: '#3B2A20', stroke: PAL.outline,
          lw: 2.4, hatch: 2.6, wash: 0.8
        });
      }
    }
    C.roundRect(g, -30, -16, 62, 32, 9, {
      seed: 'kb' + tint, fill: tint, stroke: PAL.outline, lw: 3, hatch: 3.6, wash: 0.7
    });
    C.poly(g, [[31, -11], [46, -5], [46, 5], [31, 11]], {
      seed: 'kn' + tint, fill: dark, stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.72
    });
    C.roundRect(g, -26, -11, 22, 22, 6, {
      seed: 'ks' + tint, fill: dark, stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.7
    });
    C.dot(g, 44, 0, 4, PAL.sun, 'khl' + tint);
    g.restore();
  }

  /* Six wheel phases per colour, baked once each. */
  function kartTile(tint, ph) {
    var key = tint + '|' + ph;
    if (!kartTiles[key]) {
      var cv = C.offscreen(120, 90);
      var g = cv.getContext('2d');
      g.translate(60, 45);
      paintKart(g, (ph / 6) * Math.PI, tint);
      kartTiles[key] = cv;
    }
    return kartTiles[key];
  }

  function drawKart(ctx, x, y, ang, tint, t) {
    var ph = Math.floor((t || 0) * 12) % 6;
    if (!(ph >= 0)) ph = 0;                    // a standing start has no speed
    var img = kartTile(tint, ph);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.drawImage(img, -60, -45);
    ctx.restore();
  }

  // ------------------------------------------------------------- the track

  function buildTrack() {
    var cv = C.paper(WORLD.w, WORLD.h, 'racepaper', '#8FBF63');
    var g = cv.getContext('2d');

    // grass infield and surround are the paper; the tarmac is a fat ring
    g.save();
    g.beginPath();
    g.ellipse(CX, CY, RX + HALF, RY + HALF, 0, 0, Math.PI * 2);
    g.ellipse(CX, CY, RX - HALF, RY - HALF, 0, 0, Math.PI * 2, true);
    g.clip();
    C.rect(g, 0, 0, WORLD.w, WORLD.h, {
      seed: 'tar', fill: '#7A7A82', stroke: null, hatch: 5, wash: 0.9, fillAlpha: 0.95
    });
    g.restore();

    // kerbs, red and white, all the way round
    for (var k = 0; k < N_WP * 2; k++) {
      var an = (k / (N_WP * 2)) * Math.PI * 2;
      var col = k % 2 ? '#D9402F' : PAL.white;
      C.dot(g, CX + Math.cos(an) * (RX + HALF - 8), CY + Math.sin(an) * (RY + HALF - 8), 9, col, 'ko' + k);
      C.dot(g, CX + Math.cos(an) * (RX - HALF + 8), CY + Math.sin(an) * (RY - HALF + 8), 9, col, 'ki' + k);
    }

    // start/finish chequers on the right-hand straight
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 3; c++) {
        if ((r + c) % 2) continue;
        C.rect(g, CX + RX - 30 + c * 20, CY - HALF + 6 + r * 22, 20, 22, {
          seed: 'chq' + r + c, fill: PAL.white, stroke: null, hatch: 4, wash: 0.9, fillAlpha: 0.85
        });
      }
    }
    C.text(g, 'START', CX + RX + 6, CY - HALF - 16, {
      size: 26, align: 'center', color: PAL.white, outline: 4, outlineColor: PAL.outline, seed: 'stt'
    });

    // infield decoration: a pond, trees and a big banner
    C.ellipse(g, CX - 120, CY + 40, 110, 60, {
      seed: 'rpond', fill: PAL.dome, stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.6
    });
    for (var tr = 0; tr < 5; tr++) {
      var ta = tr / 5 * Math.PI * 2;
      W.PROPS.tree.draw(g, CX + Math.cos(ta) * 220 - 40, CY + Math.sin(ta) * 110 + 40, 'rtree' + tr);
    }
    C.roundRect(g, CX - 190, CY - 190, 380, 62, 12, {
      seed: 'bnr', fill: PAL.sun, stroke: PAL.outline, lw: 4, hatch: 4.4, wash: 0.75
    });
    C.text(g, 'WARMLAND GRAND PRIX', CX, CY - 150, {
      size: 24, align: 'center', color: PAL.outline, seed: 'bnrt'
    });

    // cones dotted along the inside edge
    for (var cn = 0; cn < 14; cn++) {
      var ca = (cn / 14) * Math.PI * 2 + 0.2;
      var cxp = CX + Math.cos(ca) * (RX - HALF - 26), cyp = CY + Math.sin(ca) * (RY - HALF - 26);
      C.poly(g, [[cxp - 9, cyp + 10], [cxp + 9, cyp + 10], [cxp, cyp - 14]], {
        seed: 'cone' + cn, fill: '#E8834E', stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.8
      });
    }
    return cv;
  }

  // ------------------------------------------------------------- geometry

  /* How far around the lap a point is, 0..1, plus how far off the line. */
  function trackAt(x, y) {
    var dx = (x - CX) / RX, dy = (y - CY) / RY;
    var ang = Math.atan2(dy, dx);
    var u = (ang / (Math.PI * 2) + 1) % 1;
    // distance from the racing line, measured in the ellipse's own units
    var m = Math.hypot(dx, dy);
    var off = Math.abs(m - 1) * Math.min(RX, RY);
    return { u: u, off: off };
  }

  function wpAt(u) { return WP[Math.floor(u * N_WP) % N_WP]; }

  // ------------------------------------------------------------- racers

  var RIVAL_TINTS = ['#7FBFA8', '#B48FD6', '#E8B45C', '#8FB5D6'];

  function makeRacers() {
    var G = W.game;
    var list = [{
      player: true, name: 'Bobby', tint: '#D9604B',
      x: 0, y: 0, vx: 0, vy: 0, ang: -Math.PI / 2, speed: 0,
      lap: 0, gate: 0, u: 0, prevU: 0, place: 1, done: false, char: 'bobby'
    }];

    // friends who tagged along get a kart of their own
    var party = (G.state.party || []).slice(0, 3);
    for (var p = 0; p < party.length; p++) {
      var f = W.FRIENDS[party[p]];
      if (!f) continue;
      list.push(rival(f.name, f.mood, f.char));
    }
    // and the field is topped up with townsfolk
    var n = 0;
    while (list.length < 4) {
      list.push(rival('Racer ' + (list.length), RIVAL_TINTS[n % RIVAL_TINTS.length], 'npc',
                      RIVAL_TINTS[n % RIVAL_TINTS.length]));
      n++;
    }

    // line them up two by two behind the start line
    for (var i = 0; i < list.length; i++) {
      var row = Math.floor(i / 2), col = i % 2;
      var u0 = 1 - (0.012 + row * 0.026);
      var wp = WP[Math.floor(u0 * N_WP) % N_WP];
      var lane = (col ? 1 : -1) * 44;
      var nx = (wp[0] - CX) / RX, ny = (wp[1] - CY) / RY;
      var nl = Math.hypot(nx, ny) || 1;
      list[i].x = wp[0] + (nx / nl) * lane;
      list[i].y = wp[1] + (ny / nl) * lane;
      list[i].ang = -Math.PI / 2;
      list[i].u = trackAt(list[i].x, list[i].y).u;
      list[i].prevU = list[i].u;
      list[i].startLane = lane;
    }
    return list;
  }

  function rival(name, tint, charKey, charTint) {
    return {
      player: false, name: name, tint: tint, char: charKey, charTint: charTint || null,
      x: 0, y: 0, vx: 0, vy: 0, ang: -Math.PI / 2, speed: 0,
      lap: 0, gate: 0, u: 0, prevU: 0, place: 1, done: false,
      // rivals are deliberately a bit slower than Bobby, and they make
      // mistakes — a five-year-old has to be able to win this
      skill: 0.74 + Math.random() * 0.14, lane: (Math.random() - 0.5) * 70,
      spin: 0, spinIn: 6 + Math.random() * 10
    };
  }

  // ------------------------------------------------------------- the scene

  S.enter = function () {
    S.t = 0;
    S.countdown = 3.6;
    S.finished = false;
    S.finishT = 0;
    S.order = [];
    S.racers = makeRacers();
    S.me = S.racers[0];
    if (!track) track = buildTrack();
    kartTile('#D9604B', 0);
    W.dialogue.clear && W.dialogue.clear();
    W.say('Three laps! Ready?', PAL.sun);
  };

  S.exit = function () { W.fx.clear && W.fx.clear(); };

  /* Gates are checked in order so nobody can reverse over the line and
   * collect a lap they did not drive. */
  function progress(r) {
    var prev = r.prevU, now = r.u;
    var gates = [0.25, 0.5, 0.75];
    for (var g = 0; g < gates.length; g++) {
      if (r.gate === g && crossed(prev, now, gates[g])) r.gate = g + 1;
    }
    if (r.gate === 3 && crossed(prev, now, 0)) {
      r.gate = 0;
      r.lap++;
      if (r.player) {
        if (r.lap >= LAPS) finish(r);
        else {
          W.game.showBanner('LAP ' + (r.lap + 1) + ' OF ' + LAPS, '');
          if (W.audio) W.audio.play('ding');
        }
      } else if (r.lap >= LAPS) finish(r);
    }
    r.prevU = now;
  }

  function crossed(prev, now, gate) {
    // Measure the distance travelled FORWARD around the lap. A big forward
    // number means the kart actually went backwards — reversing over the
    // finish line must never bank a lap.
    var d = (now - prev + 1) % 1;
    if (d > 0.5) return false;
    var g = (gate - prev + 1) % 1;
    return g > 0 && g <= d;
  }

  function finish(r) {
    if (r.done) return;
    r.done = true;
    S.order.push(r);
    r.place = S.order.length;
    if (r.player) {
      S.finished = true;
      S.finishT = 0;
      var coins = [10, 6, 3][r.place - 1] || 2;
      W.game.state.money += coins;
      W.game.first('race', 'First race!');
      W.game.idea('drive');
      if (W.audio) { W.audio.play('win'); W.audio.play('coin'); }
    }
  }

  function standings() {
    // finished racers keep their place; the rest are sorted by distance
    var live = S.racers.filter(function (r) { return !r.done; });
    live.sort(function (a, b) { return (b.lap + b.u) - (a.lap + a.u); });
    var all = S.order.concat(live);
    for (var i = 0; i < all.length; i++) all[i].place = i + 1;
    return all;
  }

  S.update = function (dt) {
    var G = W.game;
    S.t += dt;
    W.dialogue.update(dt);
    W.fx.update(dt);

    if (S.countdown > 0) {
      var was = Math.ceil(S.countdown - 0.6);
      S.countdown -= dt;
      var now = Math.ceil(S.countdown - 0.6);
      if (now !== was && W.audio) W.audio.play(now <= 0 ? 'horn' : 'blip');
    }
    var go = S.countdown <= 0;

    // ---- the player
    var me = S.me;
    var ax = 0, ay = 0;
    if (go && !me.done) { var a = W.input.axis(); ax = a[0]; ay = a[1]; }
    var at = trackAt(me.x, me.y);
    var onTrack = at.off < HALF;
    var grip = onTrack ? 1 : 0.45;
    me.vx += ax * 900 * grip * dt;
    me.vy += ay * 900 * grip * dt;
    me.vx -= me.vx * 3.4 * dt;
    me.vy -= me.vy * 3.4 * dt;
    var sp = Math.hypot(me.vx, me.vy);
    var cap = (onTrack ? 380 : 170);
    if (sp > cap) { me.vx = me.vx / sp * cap; me.vy = me.vy / sp * cap; }
    me.x = W.clamp(me.x + me.vx * dt, 40, WORLD.w - 40);
    me.y = W.clamp(me.y + me.vy * dt, 40, WORLD.h - 40);
    me.speed = sp;
    if (sp > 20) me.ang = Math.atan2(me.vy, me.vx);

    // an engine you can hear: a short note whose pitch rides the speed
    S.engineIn = (S.engineIn || 0) - dt;
    if (go && !me.done && S.engineIn <= 0) {
      S.engineIn = sp > 40 ? 0.1 : 0.26;
      if (W.audio && W.audio.engine) W.audio.engine(sp / 380, Math.abs(ax) + Math.abs(ay) > 0);
    }
    me.u = trackAt(me.x, me.y).u;
    if (go) progress(me);
    if (!onTrack && sp > 60 && Math.random() < dt * 8) W.fx.dust(me.x, me.y + 12, 1);

    // ---- the rivals
    for (var i = 1; i < S.racers.length; i++) {
      var r = S.racers[i];
      if (!go) continue;

      // every so often a rival gets it wrong and slides off into the grass
      if (r.spin > 0) {
        r.spin -= dt;
        r.ang += dt * 9;
        r.x = W.clamp(r.x + r.vx * dt, 60, WORLD.w - 60);
        r.y = W.clamp(r.y + r.vy * dt, 60, WORLD.h - 60);
        r.vx -= r.vx * 2.6 * dt;
        r.vy -= r.vy * 2.6 * dt;
        r.speed = Math.hypot(r.vx, r.vy);
        r.u = trackAt(r.x, r.y).u;
        if (Math.random() < dt * 12) W.fx.dust(r.x, r.y + 14, 1);
        if (r.spin <= 0) r.spinIn = 7 + Math.random() * 12;
        continue;
      }
      r.spinIn -= dt;
      if (r.spinIn <= 0 && !r.done) {
        r.spin = 1.1 + Math.random() * 0.7;
        // fling them off the racing line, toward the grass
        var out = trackAt(r.x, r.y);
        var ox = (r.x - CX) / RX, oy = (r.y - CY) / RY;
        var ol = Math.hypot(ox, oy) || 1;
        var push = out.off < HALF * 0.5 ? 1 : -1;
        r.vx = (ox / ol) * 190 * push + r.vx * 0.3;
        r.vy = (oy / ol) * 190 * push + r.vy * 0.3;
        if (W.audio) W.audio.play('rattle');
        continue;
      }
      // aim a little way up the road, on their own preferred line
      var target = wpAt((r.u + 0.035) % 1);
      var nx = (target[0] - CX) / RX, ny = (target[1] - CY) / RY;
      var nl = Math.hypot(nx, ny) || 1;
      var tx = target[0] + (nx / nl) * r.lane;
      var ty = target[1] + (ny / nl) * r.lane;
      var dx = tx - r.x, dy = ty - r.y;
      var dl = Math.hypot(dx, dy) || 1;

      // rubber band: leaders ease off, stragglers get a push
      var gap = (me.lap + me.u) - (r.lap + r.u);
      var band = 1 + W.clamp(gap, -0.6, 0.6) * 0.14;
      var want = 250 * r.skill * band;
      if (r.done) want *= 0.55;
      r.vx = W.lerp(r.vx, (dx / dl) * want, dt * 3.2);
      r.vy = W.lerp(r.vy, (dy / dl) * want, dt * 3.2);
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.speed = Math.hypot(r.vx, r.vy);
      if (r.speed > 20) r.ang = Math.atan2(r.vy, r.vx);
      r.u = trackAt(r.x, r.y).u;
      progress(r);
    }

    standings();

    if (S.finished) {
      S.finishT += dt;
      if (S.finishT > 1 && S.finishT < 1.1) W.fx.sparkle(480, 220, 24, 200);
    }

    if (W.input.hit('back')) {
      G.fadeTo('vehicle', { vehicle: 'car', map: 'neighborhood' });
      return;
    }
    if (W.input.hit('act') && S.finished && S.finishT > 0.6) {
      G.fadeTo('vehicle', { vehicle: 'car', map: 'neighborhood' });
    }
  };

  S.draw = function (ctx) {
    var G = W.game;
    var camX = W.clamp(S.me.x - 480, 0, WORLD.w - 960);
    var camY = W.clamp(S.me.y - 300, 0, WORLD.h - 600);
    ctx.drawImage(track, -camX, -camY);

    // karts, far ones first so overlaps look right
    var draw = S.racers.slice().sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < draw.length; i++) {
      var r = draw[i];
      var sx = r.x - camX, sy = r.y - camY;
      if (sx < -120 || sx > 1080 || sy < -120 || sy > 720) continue;
      drawKart(ctx, sx, sy, r.ang, r.tint, S.t * Math.min(1, r.speed / 200));
      // the driver's head pokes out of the seat
      W.drawChar(ctx, sx - Math.cos(r.ang) * 12, sy - Math.sin(r.ang) * 12 - 6, {
        char: r.player ? 'bobby' : (r.char || 'npc'),
        tint: r.player ? null : r.charTint,
        suit: r.player ? G.state.suit : 'none',
        dir: 'down', t: G.t, scale: 0.42, noShadow: true
      });
    }

    W.fx.draw(ctx);

    // ---- HUD
    var order = standings();
    C.textCached(ctx, 'LAP ' + Math.min(S.me.lap + 1, LAPS) + '/' + LAPS, 24, 44, {
      size: 26, color: PAL.white, outline: 4, outlineColor: PAL.outline, seed: 'rlap'
    });
    C.textCached(ctx, 'P' + S.me.place + ' of ' + S.racers.length, 24, 78, {
      size: 22, color: PAL.sun, outline: 4, outlineColor: PAL.outline, seed: 'rpos'
    });

    if (S.countdown > 0) {
      var n = Math.ceil(S.countdown - 0.6);
      C.textCached(ctx, n > 0 ? String(n) : 'GO!', 480, 300, {
        size: 96, align: 'center', color: n > 0 ? PAL.white : PAL.sun,
        outline: 8, outlineColor: PAL.outline, seed: 'cd' + n
      });
    }

    if (S.finished) {
      C.roundRect(ctx, 250, 130, 460, 300, 18, {
        seed: 'rfin', fill: PAL.white, stroke: PAL.outline, lw: 5, hatch: 5, wash: 0.9, fillAlpha: 0.3
      });
      C.textCached(ctx, S.me.place === 1 ? 'YOU WON!' : 'FINISHED!', 480, 186, {
        size: 38, align: 'center', color: PAL.sun, outline: 5, outlineColor: PAL.outline, seed: 'rfh'
      });
      for (var p = 0; p < order.length; p++) {
        C.textCached(ctx, (p + 1) + '.  ' + order[p].name, 480, 236 + p * 38, {
          size: 24, align: 'center',
          color: order[p].player ? PAL.roof : PAL.outline, seed: 'rp' + p + order[p].name
        });
      }
      C.textCached(ctx, '[Z] back to the road', 480, 400, {
        size: 18, align: 'center', color: PAL.outline, seed: 'rback'
      });
    }

    W.dialogue.draw(ctx, 480, 520);
  };

  W.sceneRace = S;

})(window.W);
