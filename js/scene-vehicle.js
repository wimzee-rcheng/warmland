/* Warmland — riding anything.
 *
 * One scene for the UFO, the car, the balloon and the submarine. What differs
 * between them is data in vehicle.js: how they accelerate, which map they
 * travel, and how they're drawn. Passengers ride along behind.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var S = {
    vehicle: 'ufo', v: null, mapId: '', map: null, img: null,
    x: 0, y: 0, vx: 0, vy: 0, t: 0, tilt: 0, lock: 0,
    poi: null, poiLocked: false, face: 1,
    prevVehicle: null            // what you were flying before diving in the lake
  };

  S.enter = function (p) {
    p = p || {};
    S.vehicle = p.vehicle || S.vehicle || 'ufo';
    S.v = W.VEHICLES[S.vehicle];
    S.mapId = p.map || S.v.map;
    S.map = W.MAPS[S.mapId];
    S.img = W.getMap(S.mapId);

    // start on whichever pad makes sense
    var start = null;
    if (p.at) start = p.at;
    else {
      var home = S.map.pois.filter(function (q) {
        return q.to && q.to.room === W.game.state.room;
      })[0] || S.map.pois[0];
      start = [home.x, home.y - 130];
      if (S.map.water) start = [home.x, home.y];
    }
    // Flying vehicles hover above their pad; the submarine dives in below it.
    if (!p.at && S.map.water) start[1] = start[1] + 300;
    S.x = W.clamp(start[0], 90, S.map.w - 90);
    S.y = W.clamp(start[1], 90, S.map.h - 90);
    S.vx = 0; S.vy = 0; S.t = 0; S.tilt = 0;
    S.lock = 0.3;
    S.face = 1;
    W.say('Off we go! ' + S.v.hint.split('·')[0].trim() + '.', PAL.sky);
    W.game.idea('fly');
    W.game.first('fly-' + S.vehicle, 'First ' + S.v.name + ' ride!');
    W.warmChar('bobby', null, W.game.state.suit, 4);
    if (S.v.draw.warm) S.v.draw.warm();     // all 8 phase tiles, behind the fade
  };

  /* Wrong-vehicle pads are still detected — they show a locked prompt so the
   * player learns WHY nothing happens, instead of getting silence. */
  function nearestPOI() {
    S.poiLocked = false;
    for (var i = 0; i < S.map.pois.length; i++) {
      var p = S.map.pois[i];
      if (Math.hypot(S.x - p.x, S.y - p.y) < p.r + 14) {
        S.poiLocked = !!(p.only && p.only !== S.vehicle);
        return p;
      }
    }
    return null;
  }

  function arrive(p) {
    var G = W.game;
    if (S.poiLocked) {
      var need = W.VEHICLES[p.only];
      W.say('Only the ' + need.name + ' can go to ' + p.label + '.');
      return;
    }
    if (p.kind === 'lake') {
      // Landing in the lake means climbing into the submarine. Remember what
      // you dived in so surfacing gives it back.
      S.face = 1;
      S.prevVehicle = S.vehicle;
      G.fadeTo('vehicle', { vehicle: 'submarine', map: 'underwater' });
      W.say('Down we go!');
      return;
    }
    if (p.kind === 'dive') {
      G.fadeTo('dive', { site: p.label });
      return;
    }
    if (p.to.room) { G.fadeTo('house', { room: p.to.room }); return; }
    if (p.to.mission) { G.fadeTo('mission', { mission: p.to.mission }); return; }
    if (p.to.map) {
      // Surfacing from the lake climbs back into whatever you dived in —
      // or the UFO if this session never dived (dev-hash submarines must
      // not end up flying over the neighborhood).
      var next = S.vehicle;
      if (S.mapId === 'underwater') {
        next = S.prevVehicle || 'ufo';
        S.prevVehicle = null;
      }
      G.fadeTo('vehicle', { vehicle: next, map: p.to.map });
      return;
    }
  }

  S.update = function (dt) {
    var G = W.game;
    S.t += dt;
    S.lock = Math.max(0, S.lock - dt);
    W.dialogue.update(dt);
    W.fx.update(dt);

    var ax = 0, ay = 0;
    if (!S.lock) { var a = W.input.axis(); ax = a[0]; ay = a[1]; }

    var v = S.v;
    // the car belongs on the roads — grass is slow going
    var grip = 1;
    if (v.ground && S.mapId === 'neighborhood') {
      var onRoad = Math.abs(S.y - 690) < 42 || Math.abs(S.x - 980) < 42;
      if (!onRoad) grip = 0.45;
    }
    S.vx += ax * v.accel * grip * dt;
    S.vy += ay * v.accel * grip * dt;
    if (v.drifts) S.vx += 14 * dt;                 // the balloon is pushed along
    S.vx -= S.vx * v.drag * dt;
    S.vy -= S.vy * v.drag * dt;
    var sp = Math.hypot(S.vx, S.vy);
    var cap = v.max * grip;
    if (sp > cap) { S.vx = S.vx / sp * cap; S.vy = S.vy / sp * cap; }

    S.x = W.clamp(S.x + S.vx * dt, 80, S.map.w - 80);
    S.y = W.clamp(S.y + S.vy * dt, 80, S.map.h - 80);
    S.tilt = W.lerp(S.tilt, W.clamp(S.vx / v.max, -1, 1) * v.tilt, dt * 5);
    if (v.flips && Math.abs(S.vx) > 24) S.face = S.vx > 0 ? 1 : -1;

    // underwater ambience
    if (S.map.water) {
      S.blubIn = (S.blubIn || 2) - dt;
      if (S.blubIn <= 0) {
        S.blubIn = 3 + Math.random() * 5;
        if (W.audio) W.audio.play('murmur');
      }
    }

    S.poi = nearestPOI();

    if (W.input.hit('love')) {
      W.say('Keena Meena!', PAL.accent);
      W.fx.hearts(480, 240, 8);
    }

    if (W.input.hit('act')) {
      if (W.dialogue.skip()) { /* consumed */ }
      else if (S.poi) arrive(S.poi);
    }
    // X is always the way home — a kid drifted into a map corner needs out
    if (W.input.hit('back')) {
      if (S.poi && S.poi.to && S.poi.to.room) arrive(S.poi);
      else {
        var home = null;
        for (var hp = 0; hp < S.map.pois.length; hp++) {
          if (S.map.pois[hp].label === 'HOME' || (S.map.pois[hp].to && S.map.pois[hp].to.room)) {
            home = S.map.pois[hp]; break;
          }
        }
        if (home) {
          S.poiLocked = false;
          arrive(home);
          W.say('Flying home!');
        }
      }
    }
  };

  S.draw = function (ctx) {
    var G = W.game;
    var camX = W.clamp(S.x - 480, 0, S.map.w - 960);
    var camY = W.clamp(S.y - 300, 0, S.map.h - 600);
    ctx.drawImage(S.img, -camX, -camY);

    var sx = S.x - camX, sy = S.y - camY;
    var bob = Math.sin(S.t * 2.2) * (S.v.ground ? 1 : 5);

    var flip = S.v.flips && S.face < 0;
    ctx.save();
    ctx.translate(sx, sy + bob);
    ctx.rotate(flip ? -S.tilt : S.tilt);
    if (flip) ctx.scale(-1, 1);
    S.v.draw(ctx, 0, 0, 1, S.t);

    // the rider, tucked inside
    var r = S.v.rider;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.clip[0], r.clip[1], r.clip[2], r.clip[3]);
    ctx.clip();
    W.drawChar(ctx, r.x, r.y, {
      char: 'bobby', suit: G.state.suit, dir: 'down', t: G.t, scale: r.scale, noShadow: true
    });
    ctx.restore();
    if (S.v.glass) S.v.glass(ctx, 0, 0, 1);

    // the pet rides shotgun
    if (G.state.pet) {
      W.drawChar(ctx, 30, r.y + 12, {
        char: 'pet', dir: 'down', t: G.t,
        scale: r.scale * 0.7, noShadow: true
      });
    }
    // passengers peeking out
    G.state.party.forEach(function (key, i) {
      var f = W.FRIENDS[key];
      if (!f) return;
      W.drawChar(ctx, -34 + i * 24, r.y + 10, {
        char: f.char, tint: f.tint, dir: 'down', t: G.t + i,
        scale: r.scale * 0.62, noShadow: true
      });
    });
    ctx.restore();

    W.fx.draw(ctx);

    // the time of day washes over outdoor maps (parked behind the master switch)
    if (S.map.outdoor && G.SCENE_TINTS) {
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

    if (S.poi) {
      var label = S.poiLocked ? 'Needs the ' + W.VEHICLES[S.poi.only].name :
                  S.poi.kind === 'lake' ? 'Dive in' :
                  S.poi.kind === 'dive' ? 'Explore the ' + S.poi.label.toLowerCase() :
                  'Stop at ' + S.poi.label;
      W.drawPrompt(ctx, sx, sy + 74, label, S.t, S.poiLocked);
    }

    C.textCached(ctx, S.v.hint, 34, 47, {
      size: 16, color: PAL.outline, outline: 3.4, outlineColor: PAL.white, seed: 'vh' + S.vehicle
    });

    // edge arrows point at every off-screen pad, so the map has wayfinding
    for (var ai = 0; ai < S.map.pois.length; ai++) {
      var ap = S.map.pois[ai];
      var apx = ap.x - camX, apy = ap.y - camY;
      if (apx > -40 && apx < 1000 && apy > -40 && apy < 640) continue;
      var ex2 = W.clamp(apx, 34, 926), ey2 = W.clamp(apy, 60, 540);
      var ang2 = Math.atan2(apy - ey2, apx - ex2);
      ctx.save();
      ctx.translate(ex2, ey2);
      ctx.rotate(ang2);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = ap.alarm ? '#E0455F' : '#FFFDF6';
      ctx.strokeStyle = '#3B2A20';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
      C.textCached(ctx, ap.label, ex2, ey2 + 26, {
        size: 12, align: 'center', color: PAL.white,
        outline: 2.6, outlineColor: PAL.outline, seed: 'ea' + ap.label
      });
    }

    W.drawHUD(ctx);
    W.drawBasketBar(ctx);
    W.dialogue.draw(ctx, sx, sy - 80);
  };

  W.sceneVehicle = S;
})(window.W);
