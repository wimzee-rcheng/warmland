/* Warmland — the snow run.
 *
 * Land the balloon on the SNOW RUN and Bobby straps on a board: a downhill
 * dash, steering between the trees, hoovering up snowflakes. Crashing is
 * never a fail state — you tumble, you giggle, you carry on.
 *
 * The slope is one baked tile scrolled twice, obstacles are baked prop
 * sprites, and the board is six baked phases. Nothing is crayoned live.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var RUN = 5200;                 // how far it is to the bottom
  var S = { t: 0 };
  var slope = null, boardTiles = null, flakeTile = null;
  var obsTiles = {};

  // ------------------------------------------------------------- the art

  /* One screen-tall strip of piste, blitted twice for a seamless scroll. */
  function buildSlope() {
    var cv = C.paper(960, 600, 'snowrun', '#E4EEF5');
    var g = cv.getContext('2d');
    var rnd = W.mulberry32(W.hash('snowrun'));
    for (var d = 0; d < 16; d++) {
      C.ellipse(g, rnd() * 960, rnd() * 600, 70 + rnd() * 110, 22 + rnd() * 26, {
        seed: 'sd' + d, fill: '#CFE0EE', stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.5
      });
    }
    for (var s2 = 0; s2 < 120; s2++) {
      C.dot(g, rnd() * 960, rnd() * 600, 1.6 + rnd() * 2.6, PAL.white, 'sf' + s2);
    }
    // the piste edges: a line of poles down both sides
    for (var p = 0; p < 10; p++) {
      var py = p * 62;
      C.line(g, 34, py, 34, py + 30, { seed: 'plL' + p, stroke: '#D9402F', lw: 5, wob: 1 });
      C.line(g, 926, py, 926, py + 30, { seed: 'plR' + p, stroke: '#D9402F', lw: 5, wob: 1 });
    }
    return cv;
  }

  function paintBoard(g, lean) {
    g.save();
    g.globalAlpha = 0.16;
    g.fillStyle = PAL.outline;
    g.beginPath(); g.ellipse(0, 6, 40, 10, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    g.rotate(lean * 0.22);
    C.roundRect(g, -44, -8, 88, 16, 8, {
      seed: 'brd', fill: '#E8834E', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
    });
    C.line(g, -30, 0, 30, 0, { seed: 'brds', stroke: '#F2C14E', lw: 3, wob: 0.8, passes: 1 });
    g.restore();
  }

  function boardTile(i) {
    if (!boardTiles) {
      boardTiles = [];
      for (var k = 0; k < 3; k++) {
        var cv = C.offscreen(140, 60);
        var g = cv.getContext('2d');
        g.translate(70, 26);
        paintBoard(g, k - 1);
        boardTiles[k] = cv;
      }
    }
    return boardTiles[i];
  }

  function obsTile(kind) {
    if (!obsTiles[kind]) {
      obsTiles[kind] = W.makePropSprite({ kind: kind, x: 100, y: 100 });
    }
    return obsTiles[kind];
  }

  function flake() {
    if (!flakeTile) {
      flakeTile = C.offscreen(34, 34);
      var g = flakeTile.getContext('2d');
      for (var a = 0; a < 3; a++) {
        var an = a * Math.PI / 3;
        C.line(g, 17 - Math.cos(an) * 13, 17 - Math.sin(an) * 13,
                  17 + Math.cos(an) * 13, 17 + Math.sin(an) * 13,
          { seed: 'fk' + a, stroke: '#8FD0EE', lw: 3.4, wob: 0.7 });
      }
      C.dot(g, 17, 17, 4, PAL.white, 'fkc');
    }
    return flakeTile;
  }

  // ------------------------------------------------------------- the run

  var OBSTACLES = ['tree', 'snowRock', 'crystalSpike'];

  function buildCourse(day) {
    var rnd = W.mulberry32(W.hash('course' + day));
    var out = [];
    // gates of obstacles, thinning at the top so the start is gentle
    for (var y = 700; y < RUN; y += 170) {
      var n = y < 1500 ? 1 : (y < 3200 ? 2 : 3);
      var used = [];
      for (var i = 0; i < n; i++) {
        var x;
        var tries = 0;
        do {
          x = 110 + rnd() * 740;
          tries++;
        } while (tries < 20 && used.some(function (u) { return Math.abs(u - x) < 190; }));
        used.push(x);
        out.push({
          x: x, y: y + rnd() * 60,
          kind: OBSTACLES[Math.floor(rnd() * OBSTACLES.length)], hit: false
        });
      }
      if (rnd() < 0.75) {
        out.push({ x: 90 + rnd() * 780, y: y + 60 + rnd() * 60, flake: true, got: false });
      }
    }
    return out;
  }

  S.enter = function () {
    S.t = 0;
    S.x = 480;
    S.dist = 0;
    S.speed = 210;
    S.lean = 0;
    S.tumble = 0;
    S.flakes = 0;
    S.done = false;
    S.doneT = 0;
    S.best = W.game.state.snowBest || 0;
    if (!slope) slope = buildSlope();
    boardTile(0);
    S.course = buildCourse(W.game.state.day);
    OBSTACLES.forEach(obsTile);
    W.say('Down we go! Arrows to steer.', '#8FD0EE');
  };

  S.update = function (dt) {
    var G = W.game;
    S.t += dt;
    W.dialogue.update(dt);
    W.fx.update(dt);

    if (W.input.hit('back')) {
      G.fadeTo('vehicle', { vehicle: 'balloon', map: 'crystalMountain' });
      return;
    }

    if (S.done) {
      S.doneT += dt;
      if (W.input.hit('act') && S.doneT > 0.5) {
        G.fadeTo('vehicle', { vehicle: 'balloon', map: 'crystalMountain' });
      }
      return;
    }

    var a = W.input.axis();
    if (S.tumble > 0) {
      // a tumble is a wobble and a slow-down, never a game over
      S.tumble -= dt;
      S.speed = W.lerp(S.speed, 90, dt * 4);
      S.lean = Math.sin(S.t * 24) * 1.4;
      if (Math.random() < dt * 20) W.fx.dust(S.x, 430, 1);
    } else {
      S.x = W.clamp(S.x + a[0] * 330 * dt, 70, 890);
      S.lean = W.lerp(S.lean, a[0], dt * 8);
      // gravity: you creep faster the longer you stay up
      S.speed = Math.min(430, S.speed + 16 * dt);
      if (Math.random() < dt * 10) W.fx.dust(S.x - S.lean * 14, 440, 1);
    }

    S.dist += S.speed * dt;
    if (S.dist >= RUN) {
      S.done = true;
      S.doneT = 0;
      var coins = 4 + Math.floor(S.flakes / 3);
      G.state.money += coins;
      G.state.snowBest = Math.max(S.best, S.flakes);
      G.first('snowboard', 'First snow run!');
      G.idea('mountain');
      W.fx.sparkle(480, 240, 26, 200);
      if (W.audio) W.audio.play('win');
      return;
    }

    // collisions: the board's own little box, a bit forgiving
    var by = S.dist + 300;
    for (var i = 0; i < S.course.length; i++) {
      var o = S.course[i];
      var dy = o.y - by;
      if (dy > 40 || dy < -60) continue;
      var dx = Math.abs(o.x - S.x);
      if (o.flake) {
        if (!o.got && dx < 46) {
          o.got = true;
          S.flakes++;
          W.fx.sparkle(S.x, 430, 8, 50);
          if (W.audio) W.audio.play('pickup');
        }
        continue;
      }
      if (!o.hit && dx < 44 && S.tumble <= 0) {
        o.hit = true;
        S.tumble = 1.1;
        W.fx.dust(S.x, 440, 8);
        if (W.audio) W.audio.play('thud');
        W.say(['Oof!', 'Wheee — oof!', 'Snow everywhere!'][Math.floor(Math.random() * 3)]);
      }
    }
  };

  S.draw = function (ctx) {
    var G = W.game;
    var off = S.dist % 600;
    ctx.drawImage(slope, 0, -off);
    ctx.drawImage(slope, 0, 600 - off);

    var by = S.dist + 300;

    // obstacles and flakes, drawn in world order
    for (var i = 0; i < S.course.length; i++) {
      var o = S.course[i];
      var sy = o.y - S.dist;
      if (sy < -140 || sy > 700) continue;
      if (o.flake) {
        if (o.got) continue;
        var fimg = flake();
        ctx.drawImage(fimg, o.x - 17, sy - 17);
      } else {
        var sp = obsTile(o.kind);
        ctx.drawImage(sp.img, o.x - 100 + sp.ox, sy - 100 + sp.oy);
      }
    }

    // Bobby on his board
    var bx = S.x, byy = 430;
    ctx.drawImage(boardTile(S.lean < -0.3 ? 0 : S.lean > 0.3 ? 2 : 1), bx - 70, byy - 20);
    W.drawChar(ctx, bx, byy - 8, {
      char: 'bobby', suit: G.state.suit, dir: 'down', t: G.t, scale: 0.86,
      spin: S.tumble > 0 ? S.t * 9 : S.lean * 0.18, noShadow: true
    });

    W.fx.draw(ctx);

    // HUD
    var frac = Math.min(1, S.dist / RUN);
    W.drawHealthBar(ctx, 20, 20, 240, 1 - frac, '#8FD0EE', 'To the bottom');
    C.textCached(ctx, 'Snowflakes: ' + S.flakes, 20, 74, {
      size: 20, color: PAL.white, outline: 3.4, outlineColor: PAL.outline,
      seed: 'snf' + S.flakes
    });

    if (S.done) {
      C.roundRect(ctx, 260, 160, 440, 250, 18, {
        seed: 'snfin', fill: PAL.white, stroke: PAL.outline, lw: 5, hatch: 5,
        wash: 0.9, fillAlpha: 0.3
      });
      C.textCached(ctx, 'DOWN THE WHOLE RUN!', 480, 220, {
        size: 30, align: 'center', color: PAL.sun,
        outline: 5, outlineColor: PAL.outline, seed: 'snfh'
      });
      C.textCached(ctx, S.flakes + ' snowflakes', 480, 276, {
        size: 24, align: 'center', color: PAL.outline, seed: 'snff' + S.flakes
      });
      C.textCached(ctx, 'best: ' + Math.max(S.best, S.flakes), 480, 314, {
        size: 18, align: 'center', color: PAL.woodDk,
        seed: 'snfb' + Math.max(S.best, S.flakes)
      });
      C.textCached(ctx, '[Z] back to the balloon', 480, 372, {
        size: 18, align: 'center', color: PAL.outline, seed: 'snfz'
      });
    } else {
      C.textCached(ctx, 'arrows steer  ·  X give up', 480, 578, {
        size: 15, align: 'center', color: PAL.white,
        outline: 3, outlineColor: PAL.outline, seed: 'snh'
      });
    }

    W.dialogue.draw(ctx, W.clamp(S.x, 200, 760), 300);
  };

  W.sceneSnow = S;

})(window.W);
