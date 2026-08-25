/* Warmland — Mars.
 *
 * Landing on the red planet gives Bobby a rover and a game of hide-and-seek:
 * three aliens tuck themselves behind craters, and driving close enough makes
 * them peek. Find all three and they lead you home for martian ice cream.
 *
 * The crater field is one baked canvas; the rover is six baked phases; the
 * aliens are two baked poses. Per-frame cost is blits.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var WORLD = { w: 1400, h: 900 };
  var N_CRATERS = 8;

  var S = { t: 0 };
  var field = null;
  var roverTiles = null, alienTiles = null, domeTile = null;

  /* Crater positions are fixed; which ones hide an alien changes daily. */
  var CRATERS = [];
  (function () {
    var rnd = W.mulberry32(W.hash('marscraters'));
    for (var i = 0; i < N_CRATERS; i++) {
      CRATERS.push({
        x: 160 + (i % 4) * 340 + (rnd() - 0.5) * 80,
        y: 200 + Math.floor(i / 4) * 340 + (rnd() - 0.5) * 90,
        r: 78 + rnd() * 34
      });
    }
  })();

  // ------------------------------------------------------------- the art

  function paintRover(g, t) {
    g.save();
    g.globalAlpha = 0.16;
    g.fillStyle = PAL.outline;
    g.beginPath(); g.ellipse(0, 26, 56, 14, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;

    // six wheels, three a side, each on its own little rocker
    for (var w = -1; w <= 1; w++) {
      var wx = w * 34;
      var bump = Math.sin(t * 6 + w) * 3;
      C.ellipse(g, wx, 16 + bump, 15, 15, {
        seed: 'rw' + w, fill: '#3B2A20', stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.8
      });
      C.line(g, wx - 9, 16 + bump, wx + 9, 16 + bump, {
        seed: 'rwt' + w, stroke: PAL.steel, lw: 2.4, wob: 0.5, passes: 1
      });
    }
    C.roundRect(g, -46, -22, 92, 34, 8, {
      seed: 'rb', fill: '#D9C6A8', stroke: PAL.outline, lw: 3.2, hatch: 3.6, wash: 0.75
    });
    // solar panel roof
    C.roundRect(g, -52, -40, 104, 16, 4, {
      seed: 'rp', fill: '#4A6FC4', stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.7
    });
    for (var p = 0; p < 4; p++) {
      C.line(g, -40 + p * 26, -40, -40 + p * 26, -24, {
        seed: 'rpl' + p, stroke: '#2E4A8A', lw: 2, wob: 0.5, passes: 1
      });
    }
    // antenna with a blinking tip
    C.line(g, 34, -40, 46, -66, { seed: 'ra', stroke: PAL.steel, lw: 3, wob: 0.8 });
    C.dot(g, 46, -68, 5, Math.sin(t * 5) > 0 ? '#E0455F' : '#F2C14E', 'rat');
    // a seat well for the driver
    C.roundRect(g, -22, -34, 40, 18, 5, {
      seed: 'rs', fill: '#B8A98A', stroke: PAL.outline, lw: 2.4, hatch: 2.8, wash: 0.7
    });
    g.restore();
  }

  function roverTile(ph) {
    if (!roverTiles) {
      roverTiles = [];
      for (var p = 0; p < 6; p++) {
        var cv = C.offscreen(150, 130);
        var g = cv.getContext('2d');
        g.translate(75, 80);
        paintRover(g, (p / 6) * Math.PI * 2);
        roverTiles[p] = cv;
      }
    }
    return roverTiles[ph];
  }

  /* Two poses: peeking over the crater rim, and out cheering. */
  function alienTile(pose) {
    if (!alienTiles) {
      alienTiles = [];
      for (var p = 0; p < 2; p++) {
        var cv = C.offscreen(110, 120);
        var g = cv.getContext('2d');
        g.translate(55, 100);
        var lift = p ? 0 : 26;                 // peeking = mostly hidden
        C.ellipse(g, 0, -34 + lift, 26, 30, {
          seed: 'ah' + p, fill: '#7FD6A8', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.78
        });
        // stalky ears go up when they are found
        for (var e = -1; e <= 1; e += 2) {
          C.line(g, e * 12, -58 + lift, e * 20, -84 + lift - (p ? 10 : 0), {
            seed: 'ae' + e + p, stroke: '#7FD6A8', lw: 5, wob: 1
          });
          C.dot(g, e * 20, -86 + lift - (p ? 10 : 0), 6, '#F2C14E', 'aet' + e + p);
        }
        C.dot(g, -9, -38 + lift, 6, PAL.white, 'ael' + p);
        C.dot(g, 9, -38 + lift, 6, PAL.white, 'aer' + p);
        C.dot(g, -8, -37 + lift, 3, PAL.outline, 'apl' + p);
        C.dot(g, 10, -37 + lift, 3, PAL.outline, 'apr' + p);
        C.arc(g, 0, -28 + lift, 8, Math.PI * 0.15, Math.PI * 0.85, {
          seed: 'am' + p, stroke: PAL.outline, lw: 2.2, wob: 0.7
        });
        if (p) {
          // little waving arms once they are out in the open
          C.line(g, -22, -22, -36, -44, { seed: 'aa1', stroke: '#7FD6A8', lw: 4, wob: 1 });
          C.line(g, 22, -22, 36, -44, { seed: 'aa2', stroke: '#7FD6A8', lw: 4, wob: 1 });
          C.roundRect(g, -16, -14, 32, 20, 7, {
            seed: 'ab', fill: '#5FBF8F', stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.75
          });
        }
        alienTiles[p] = cv;
      }
    }
    return alienTiles[pose];
  }

  function domeArt() {
    if (!domeTile) {
      domeTile = C.offscreen(300, 240);
      var g = domeTile.getContext('2d');
      g.translate(150, 200);
      C.arc(g, 0, 0, 110, Math.PI, Math.PI * 2, {
        seed: 'dm', fill: '#8FD0EE', stroke: PAL.outline, lw: 4, hatch: 4.4, wash: 0.55
      });
      C.rect(g, -110, -4, 220, 14, {
        seed: 'dbase', fill: '#C4BCAE', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
      });
      C.arc(g, 0, 10, 30, Math.PI, Math.PI * 2, {
        seed: 'ddoor', fill: '#4A6FC4', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.75
      });
      C.text(g, 'MARTIAN ICE CREAM', 0, -60, {
        size: 17, align: 'center', color: PAL.outline, seed: 'dmt'
      });
      for (var i = 0; i < 5; i++) {
        C.star(g, -90 + i * 45, -120 - (i % 2) * 20, 7, '#FFF6E0', 'dms' + i);
      }
    }
    return domeTile;
  }

  /* Inside the dome: a little round room with a serving counter, portholes
   * onto the red desert, and three very pleased hosts. */
  var domeRoom = null;
  function buildDomeRoom() {
    if (domeRoom) return domeRoom;
    var cv = C.paper(960, 600, 'marsdome', '#3E4A6E');
    var g = cv.getContext('2d');

    // the dome shell
    C.arc(g, 480, 560, 470, Math.PI, Math.PI * 2, {
      seed: 'dr', fill: '#5A6A96', stroke: PAL.outline, lw: 5, hatch: 5, wash: 0.6
    });
    for (var r = 0; r < 5; r++) {
      C.arc(g, 480, 560, 470 - r * 84, Math.PI, Math.PI * 2, {
        seed: 'drr' + r, stroke: '#7E8EBE', lw: 3, wob: 2, passes: 1, strokeAlpha: 0.5
      });
    }
    for (var rb = 0; rb < 5; rb++) {
      var a = Math.PI + (rb + 1) * (Math.PI / 6);
      C.line(g, 480, 560, 480 + Math.cos(a) * 470, 560 + Math.sin(a) * 470, {
        seed: 'drb' + rb, stroke: '#7E8EBE', lw: 3, wob: 2, passes: 1, strokeAlpha: 0.45
      });
    }

    // portholes onto Mars
    [[150, 250], [810, 250]].forEach(function (p, i) {
      C.ellipse(g, p[0], p[1], 66, 66, {
        seed: 'dph' + i, fill: '#C4643F', stroke: PAL.outline, lw: 4.4, hatch: 4.4, wash: 0.7
      });
      C.ellipse(g, p[0] - 14, p[1] + 16, 22, 12, {
        seed: 'dphc' + i, fill: '#8A3E28', stroke: null, hatch: 3, wash: 0.6, fillAlpha: 0.6
      });
      C.arc(g, p[0], p[1], 72, 0, Math.PI * 2, {
        seed: 'dphr' + i, stroke: '#B9C3C9', lw: 5, wob: 1.6, passes: 1
      });
    });

    // the floor
    C.rect(g, -6, 430, 972, 176, {
      seed: 'dfl', fill: '#7E8EBE', stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.5
    });
    C.line(g, -6, 430, 966, 430, { seed: 'dflL', stroke: PAL.outline, lw: 3.4, wob: 2 });

    // the ice cream counter
    C.roundRect(g, 300, 300, 360, 120, 14, {
      seed: 'dctr', fill: '#8FD0EE', stroke: PAL.outline, lw: 4, hatch: 4.4, wash: 0.7
    });
    C.text(g, 'MARTIAN ICE CREAM', 480, 340, {
      size: 22, align: 'center', color: PAL.outline, seed: 'dctt'
    });
    for (var s2 = 0; s2 < 3; s2++) {
      C.ellipse(g, 360 + s2 * 120, 386, 30, 18, {
        seed: 'dtub' + s2, fill: ['#7FD6A8', '#F2C14E', '#E8A0B4'][s2],
        stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
      });
    }
    // fairy lights round the rim
    for (var l = 0; l < 14; l++) {
      var la = Math.PI + (l + 0.5) * (Math.PI / 14);
      C.dot(g, 480 + Math.cos(la) * 440, 560 + Math.sin(la) * 440, 8,
            ['#F2C14E', '#E8A0B4', '#7FD6A8'][l % 3], 'dl' + l);
    }
    domeRoom = cv;
    return cv;
  }

  function buildField() {
    var cv = C.paper(WORLD.w, WORLD.h, 'marspaper', '#C4643F');
    var g = cv.getContext('2d');

    // dust drifts and scattered pebbles
    var rnd = W.mulberry32(W.hash('marsdust'));
    for (var d = 0; d < 26; d++) {
      C.ellipse(g, rnd() * WORLD.w, rnd() * WORLD.h, 60 + rnd() * 90, 26 + rnd() * 30, {
        seed: 'md' + d, fill: '#B45636', stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.35
      });
    }
    for (var p = 0; p < 120; p++) {
      C.dot(g, rnd() * WORLD.w, rnd() * WORLD.h, 2 + rnd() * 5,
            rnd() < 0.5 ? '#9E4A2E' : '#D98A64', 'mp' + p);
    }

    // the craters themselves: a rim, a shadow, a darker floor
    CRATERS.forEach(function (cr, i) {
      C.ellipse(g, cr.x, cr.y + 6, cr.r, cr.r * 0.6, {
        seed: 'mcs' + i, fill: '#8A3E28', stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.5
      });
      C.ellipse(g, cr.x, cr.y, cr.r, cr.r * 0.6, {
        seed: 'mcr' + i, fill: '#A84E33', stroke: '#6E2E1E', lw: 4, hatch: 4.4, wash: 0.6
      });
      C.arc(g, cr.x, cr.y, cr.r + 8, Math.PI * 1.05, Math.PI * 1.95, {
        seed: 'mcl' + i, stroke: '#E0A07A', lw: 4, wob: 2, passes: 1, strokeAlpha: 0.6
      });
    });

    // the landing pad home, bottom-left
    C.ellipse(g, 140, 800, 80, 46, {
      seed: 'mpad', fill: PAL.steel, stroke: PAL.outline, lw: 4, hatch: 5, wash: 0.6
    });
    C.text(g, 'SHIP', 140, 806, {
      size: 20, align: 'center', color: PAL.outline, seed: 'mpadt'
    });
    return cv;
  }

  // ------------------------------------------------------------- the scene

  /* Back over Mars itself. */
  function backToMap() {
    W.game.fadeTo('vehicle', {
      vehicle: 'ufo', map: 'space', at: W.mapPadAt('space', 'mars')
    });
  }

  S.enter = function () {
    S.t = 0;
    S.x = 300; S.y = 780;
    S.vx = 0; S.vy = 0;
    S.face = 1;
    S.found = 0;
    S.done = false;
    S.inside = null;
    S.iceCream = false;
    if (!field) field = buildField();
    roverTile(0);

    // three of the eight craters hide an alien, and they move daily
    var rnd = W.mulberry32(W.hash('marshide' + W.game.state.day));
    var idx = [];
    for (var i = 0; i < N_CRATERS; i++) idx.push(i);
    for (var s2 = idx.length - 1; s2 > 0; s2--) {
      var j = Math.floor(rnd() * (s2 + 1));
      var tmp = idx[s2]; idx[s2] = idx[j]; idx[j] = tmp;
    }
    S.hiders = idx.slice(0, 3).map(function (ci) {
      return { crater: CRATERS[ci], found: false, t: 0 };
    });
    S.checked = {};
    S.dome = { x: 1180, y: 760 };
    W.say('Hide-and-seek on Mars! Drive close to the craters.', '#F2C14E');
  };

  /* ---- inside the dome ---------------------------------------------- */

  S.enterDome = function () {
    buildDomeRoom();
    S.inside = { px: 480, py: 520, t: 0, served: false, dir: 'up' };
    W.say('Come in, come in! say the aliens.', '#7FD6A8');
    if (W.audio) W.audio.play('doorpop');
  };

  function updateInside(dt) {
    var G = W.game, ins = S.inside;
    ins.t += dt;
    var a = W.input.axis();
    var sp = 190 * dt;
    ins.px = W.clamp(ins.px + a[0] * sp, 150, 810);
    ins.py = W.clamp(ins.py + a[1] * sp, 450, 560);
    ins.moving = !!(a[0] || a[1]);
    if (a[0]) ins.dir = a[0] > 0 ? 'right' : 'left';
    else if (a[1]) ins.dir = a[1] > 0 ? 'down' : 'up';
    ins.atCounter = ins.px > 290 && ins.px < 670 && ins.py < 500;

    if (W.input.hit('talk')) {
      W.say(['Blorp! You found ALL of us!', 'Ice cream is the best prize.',
             'Come back tomorrow — we will hide better!'][Math.floor(Math.random() * 3)],
            '#7FD6A8');
      W.fx.hearts(480, 330, 4);
    }

    if (W.input.hit('act')) {
      if (W.dialogue.skip()) return;
      if (ins.atCounter) {
        ins.served = true;
        S.iceCream = true;
        G.bobaFx = { kind: 'longneck', until: G.t + 15 };
        G.showBanner('MARTIAN ICE CREAM!', 'It makes your neck go LOOOONG');
        W.fx.sparkle(480, 340, 24, 160);
        W.fx.hearts(480, 300, 8);
        G.first('martianice', 'Martian ice cream!');
        if (W.audio) { W.audio.play('boing'); W.audio.play('chime'); }
      }
    }
    if (W.input.hit('back')) {
      S.inside = null;
      W.say('Bye bye, martians!');
    }
  }

  function drawInside(ctx) {
    var G = W.game, ins = S.inside;
    ctx.drawImage(domeRoom, 0, 0);

    // the three hosts, bobbing behind the counter
    for (var i = 0; i < 3; i++) {
      var bob = Math.sin(S.t * 3 + i * 1.4) * 5;
      ctx.drawImage(alienTile(1), 360 + i * 120 - 55, 220 + bob);
    }

    W.drawChar(ctx, ins.px, ins.py, {
      char: W.heroChar(), suit: G.state.suit, dir: ins.dir, t: G.t,
      moving: ins.moving, hopT: S.t * 3, scale: 1,
      neck: W.neckStretch ? W.neckStretch() : 0,
      legs8: W.spiderLegs ? W.spiderLegs() : 0
    });

    W.fx.draw(ctx);

    C.textCached(ctx, "THE MARTIANS' DOME", 480, 52, {
      size: 26, align: 'center', color: PAL.white,
      outline: 4, outlineColor: PAL.outline, seed: 'dht'
    });
    if (ins.atCounter) {
      W.drawPrompt(ctx, ins.px, ins.py + 30,
        ins.served ? 'Another one?!' : 'Martian ice cream, please!', S.t,
        false, 'Z', 'A', 'chat');
    }
    C.textCached(ctx, 'arrows walk  ·  Z ice cream  ·  A chat  ·  X outside', 480, 578, {
      size: 15, align: 'center', color: PAL.white,
      outline: 3, outlineColor: PAL.outline, seed: 'dhh'
    });
    W.dialogue.draw(ctx, W.clamp(ins.px, 220, 740), 420);
  }

  S.update = function (dt) {
    var G = W.game;
    S.t += dt;
    if (S.inside) {
      W.dialogue.update(dt);
      W.fx.update(dt);
      updateInside(dt);
      return;
    }
    W.dialogue.update(dt);
    W.fx.update(dt);

    var a = W.input.axis();
    S.vx += a[0] * 620 * dt;
    S.vy += a[1] * 620 * dt;
    S.vx -= S.vx * 3.2 * dt;
    S.vy -= S.vy * 3.2 * dt;
    var sp = Math.hypot(S.vx, S.vy);
    if (sp > 260) { S.vx = S.vx / sp * 260; S.vy = S.vy / sp * 260; }
    S.x = W.clamp(S.x + S.vx * dt, 60, WORLD.w - 60);
    S.y = W.clamp(S.y + S.vy * dt, 60, WORLD.h - 60);
    S.speed = sp;
    if (Math.abs(S.vx) > 20) S.face = S.vx > 0 ? 1 : -1;
    if (sp > 60 && Math.random() < dt * 8) W.fx.dust(S.x - S.vx * 0.1, S.y + 20, 1);

    // peeking: getting close to a crater checks it
    for (var i = 0; i < CRATERS.length; i++) {
      var cr = CRATERS[i];
      if (Math.hypot(S.x - cr.x, S.y - cr.y) > cr.r + 40) continue;
      var hider = null;
      for (var h = 0; h < S.hiders.length; h++) {
        if (S.hiders[h].crater === cr) { hider = S.hiders[h]; break; }
      }
      if (hider && !hider.found) {
        hider.found = true;
        hider.t = 0;
        S.found++;
        W.fx.sparkle(cr.x, cr.y - 40, 20, 120);
        W.say(['Found you!', 'Peekaboo!', 'There you are!'][S.found % 3], '#7FD6A8');
        if (W.audio) W.audio.play('cheer');
        if (S.found >= 3) {
          G.showBanner('ALL THREE FOUND!', 'They are pointing at something...');
          G.first('mars', 'First trip to Mars!');
        }
      } else if (!hider && !S.checked[i]) {
        S.checked[i] = true;
        W.fx.dust(cr.x, cr.y, 4);
      }
    }
    for (var h2 = 0; h2 < S.hiders.length; h2++) {
      if (S.hiders[h2].found) S.hiders[h2].t += dt;
    }

    // the dome opens once everyone is found
    S.atDome = S.found >= 3 && Math.hypot(S.x - S.dome.x, S.y - S.dome.y) < 130;
    S.atShip = Math.hypot(S.x - 140, S.y - 800) < 90;

    if (W.input.hit('act')) {
      if (W.dialogue.skip()) { /* consumed */ }
      else if (S.atDome) {
        S.enterDome();
      } else if (S.atShip) {
        backToMap();
      }
    }
    if (W.input.hit('back')) backToMap();
  };

  S.draw = function (ctx) {
    var G = W.game;
    if (S.inside) { drawInside(ctx); return; }
    var camX = W.clamp(S.x - 480, 0, WORLD.w - 960);
    var camY = W.clamp(S.y - 300, 0, WORLD.h - 600);
    ctx.drawImage(field, -camX, -camY);

    // the dome, once it matters
    if (S.found >= 3) {
      var dm = domeArt();
      ctx.drawImage(dm, S.dome.x - camX - 150, S.dome.y - camY - 200);
    }

    // aliens: peeking, or out and cheering
    for (var i = 0; i < S.hiders.length; i++) {
      var hd = S.hiders[i];
      if (!hd.found) continue;
      var bob = Math.sin(S.t * 4 + i) * 4;
      var img = alienTile(1);
      ctx.drawImage(img, hd.crater.x - camX - 55, hd.crater.y - camY - 100 + bob);
    }

    // the rover, with Bobby aboard
    var ph = Math.floor(Math.min(1, S.speed / 200) * S.t * 10) % 6;
    if (!(ph >= 0)) ph = 0;
    var sx = S.x - camX, sy = S.y - camY;
    ctx.save();
    ctx.translate(sx, sy);
    if (S.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(roverTile(ph), -75, -80);
    ctx.restore();
    W.drawChar(ctx, sx, sy - 26, {
      char: W.heroChar(), suit: G.state.suit, dir: 'down', t: G.t, scale: 0.4, noShadow: true
    });
    W.fx.draw(ctx);

    C.textCached(ctx, 'Found ' + S.found + '/3', 24, 44, {
      size: 26, color: PAL.white, outline: 4, outlineColor: PAL.outline, seed: 'mf' + S.found
    });

    // an arrow toward the dome once the game is won
    if (S.found >= 3 && !S.atDome) {
      var ang = Math.atan2(S.dome.y - S.y, S.dome.x - S.x);
      var ax2 = 480 + Math.cos(ang) * 150, ay2 = 300 + Math.sin(ang) * 130;
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(S.t * 5);
      ctx.translate(ax2, ay2);
      ctx.rotate(ang);
      C.poly(ctx, [[-16, -12], [16, 0], [-16, 12]], {
        seed: 'marrow', fill: PAL.sun, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.85
      });
      ctx.restore();
    }

    if (S.atDome) {
      W.drawPrompt(ctx, sx, sy + 60, 'Go inside!', S.t);
    } else if (S.atShip) {
      W.drawPrompt(ctx, sx, sy + 60, 'Fly back to space', S.t);
    }

    C.textCached(ctx, 'arrows drive  ·  Z do  ·  X fly home', 480, 578, {
      size: 15, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'mh'
    });

    W.dialogue.draw(ctx, W.clamp(sx, 200, 760), Math.max(120, sy - 120));
  };

  W.sceneMars = S;

})(window.W);
