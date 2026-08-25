/* Warmland 2 — the arcade tent.
 *
 * Four cabinets, four games their dad grew up on, all rebuilt kind:
 *   BOBA LOB    — angle and power, lob boba at a block castle (Gorillas)
 *   BOBA BOUNCE — paddle and ball against a wall of pearls (Breakout)
 *   ROAD HOP    — hop the pup across popcorn traffic and a log river
 *   PEARL CHAIN — a growing chain of pearls chasing snacks (Snake)
 *
 * House rules: X always leaves, a dropped ball costs a life rather than the
 * game, bumping your own chain only trims it — and every cabinet remembers
 * a best score in state.arcade.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;
  var S = { t: 0 };
  var tiles = {};

  function tile(key, w, h, painter) {
    if (!tiles[key]) {
      var cv = C.offscreen(w, h);
      painter(cv.getContext('2d'));
      tiles[key] = cv;
      // the hop board is keyed by the in-game day, so a long session of
      // sleeps would pile up full-screen canvases without this cap
      var tk = Object.keys(tiles);
      if (tk.length > 40) delete tiles[tk[0]];
    }
    return tiles[key];
  }

  var GAMES = {
    lob:    { name: 'BOBA LOB',    color: '#5A4A9E' },
    bounce: { name: 'BOBA BOUNCE', color: '#4A6FC4' },
    hop:    { name: 'ROAD HOP',    color: '#6FA84B' },
    chain:  { name: 'PEARL CHAIN', color: '#D9402F' }
  };

  // ------------------------------------------------------------- shared

  function backdrop(key, color) {
    return tile('bg' + key, 960, 600, function (g) {
      g.drawImage(C.paper(960, 600, 'arc' + key, color), 0, 0);
      // a tidy cabinet frame around the play area
      C.roundRect(g, 14, 60, 932, 500, 16, {
        seed: 'arcf' + key, stroke: PAL.outline, lw: 5, wob: 1.6, passes: 1
      });
    });
  }

  function finish(score) {
    var G = W.game;
    var best = (G.state.arcade || {})[S.game] || 0;
    S.best = Math.max(best, score);
    if (!G.state.arcade) G.state.arcade = {};
    if (score > best) {
      G.state.arcade[S.game] = score;
      S.newBest = true;
      G.state.money += 3;
      if (W.audio) W.audio.play('win');
    } else {
      G.state.money += 1;
      if (W.audio) W.audio.play('chime');
    }
    G.first('arcade', 'First arcade game!');
    S.over = true;
    S.overT = 0;
  }

  // ------------------------------------------------------- 1. BOBA LOB

  function lobEnter() {
    S.angle = 45;
    S.power = 0;
    S.charging = false;
    S.shot = null;
    S.shotsLeft = 5;
    S.score = 0;
    S.blocks = [];
    var rnd = W.mulberry32(W.hash('lob' + W.game.state.day));
    // three little towers of blocks with a star on top of each
    for (var t = 0; t < 3; t++) {
      var bx = 560 + t * 120;
      var h = 3 + Math.floor(rnd() * 3);
      for (var b = 0; b < h; b++) {
        S.blocks.push({ x: bx, y: 470 - b * 34, w: 62, h: 32, down: false });
      }
      S.stars = S.stars || [];
      S.stars.push({ x: bx + 31, y: 470 - h * 34 + 6, got: false });
    }
  }

  function lobUpdate(dt) {
    if (S.shot) {
      var sh = S.shot;
      sh.vy += 460 * dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.trail.push([sh.x, sh.y]);
      if (sh.trail.length > 40) sh.trail.shift();
      // knock a block over
      for (var i = 0; i < S.blocks.length; i++) {
        var bl = S.blocks[i];
        if (bl.down) continue;
        if (sh.x > bl.x && sh.x < bl.x + bl.w && sh.y > bl.y && sh.y < bl.y + bl.h) {
          bl.down = true;
          S.score += 10;
          W.fx.dust(sh.x, sh.y, 6);
          if (W.audio) W.audio.play('thud');
          sh.vy *= 0.4; sh.vx *= 0.6;
        }
      }
      for (var st2 = 0; st2 < S.stars.length; st2++) {
        var sr = S.stars[st2];
        if (sr.got) continue;
        if (Math.hypot(sh.x - sr.x, sh.y - sr.y) < 30) {
          sr.got = true;
          S.score += 25;
          W.fx.sparkle(sr.x, sr.y, 14, 90);
          if (W.audio) W.audio.play('chime');
        }
      }
      if (sh.y > 500 || sh.x > 960 || sh.x < 0) {
        S.shot = null;
        if (S.shotsLeft <= 0) finish(S.score);
      }
      return;
    }
    var a = W.input.axis();
    if (a[1]) S.angle = W.clamp(S.angle - a[1] * 46 * dt, 5, 85);
    if (W.input.down('act')) {
      S.charging = true;
      S.power = Math.min(1, S.power + dt * 0.85);
    } else if (S.charging) {
      S.charging = false;
      S.shotsLeft--;
      var rad = S.angle * Math.PI / 180;
      S.shot = { x: 120, y: 430, vx: Math.cos(rad) * (240 + S.power * 460),
                 vy: -Math.sin(rad) * (240 + S.power * 460), trail: [] };
      S.power = 0;
      if (W.audio) W.audio.play('shoot');
    }
  }

  function blockTile(kind) {
    return tile('lblk' + kind, 64, 34, function (g) {
      C.rect(g, 1, 1, 62, 32, {
        seed: 'lb' + kind, fill: kind ? '#C9A882' : '#B9C3C9',
        stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.8
      });
    });
  }
  function starTile() {
    return tile('lstar', 40, 40, function (g) { C.star(g, 20, 20, 15, PAL.sun, 'lst'); });
  }
  function cannonTile() {
    return tile('lcan', 92, 64, function (g) {
      C.ellipse(g, 46, 32, 40, 26, {
        seed: 'lcb', fill: '#5A4A9E', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
      });
    });
  }
  function barrelTile() {
    return tile('lbar', 70, 16, function (g) {
      C.line(g, 2, 8, 66, 8, { seed: 'lcbar', stroke: '#3B3446', lw: 13, wob: 0.6 });
    });
  }
  function powerTile() {
    return tile('lpm', 186, 28, function (g) {
      C.rect(g, 2, 2, 180, 22, { seed: 'lpm', stroke: PAL.outline, lw: 3, wob: 1, passes: 1 });
    });
  }
  function aimTile() {
    return tile('laim', 12, 12, function (g) { C.dot(g, 6, 6, 4, PAL.white, 'laim'); });
  }
  function bobaTile() {
    return tile('lboba', 28, 28, function (g) { C.dot(g, 14, 14, 11, '#5A3A20', 'lshot'); });
  }
  function trailTile() {
    return tile('ltr', 10, 10, function (g) { C.dot(g, 5, 5, 3, '#8A5F38', 'ltr'); });
  }

  function lobBoard() {
    return tile('lboard', 960, 600, function (g) {
      g.drawImage(backdrop('lob', '#BFE0F2'), 0, 0);
      C.rect(g, -6, 500, 972, 106, {
        seed: 'lobg', fill: PAL.grassDk, stroke: null, hatch: 5, wash: 0.5, fillAlpha: 0.6
      });
    });
  }

  function lobDraw(ctx) {
    ctx.drawImage(lobBoard(), 0, 0);
    // the blocks and their stars — baked once, blitted forever
    S.blocks.forEach(function (bl, i) {
      ctx.save();
      if (bl.down) { ctx.globalAlpha = 0.5; ctx.translate(0, 26); ctx.rotate(0.2); }
      ctx.drawImage(blockTile(i % 2), bl.x, bl.y);
      ctx.restore();
    });
    S.stars.forEach(function (sr) {
      if (!sr.got) ctx.drawImage(starTile(), sr.x - 20, sr.y - 20);
    });
    // the cannon
    var rad = S.angle * Math.PI / 180;
    ctx.drawImage(cannonTile(), 110 - 46, 470 - 32);
    ctx.save();
    ctx.translate(110, 458);
    ctx.rotate(-rad);
    ctx.drawImage(barrelTile(), 0, -8);
    ctx.restore();
    // the aiming arc
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (var d = 1; d <= 5; d++) {
      ctx.drawImage(aimTile(), 110 + Math.cos(rad) * (70 + d * 22) - 6,
                               458 - Math.sin(rad) * (70 + d * 22) - 6);
    }
    ctx.restore();
    // the shot and its trail
    if (S.shot) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      S.shot.trail.forEach(function (p, i) {
        if (i % 3) return;
        ctx.drawImage(trailTile(), p[0] - 5, p[1] - 5);
      });
      ctx.restore();
      ctx.drawImage(bobaTile(), S.shot.x - 14, S.shot.y - 14);
    }
    // power meter
    ctx.drawImage(powerTile(), 38, 94);
    ctx.save();
    ctx.fillStyle = '#D9402F';
    ctx.fillRect(43, 99, 174 * S.power, 16);
    ctx.restore();
    C.textCached(ctx, 'hold Z for power  ·  up/down to aim', 480, 110, {
      size: 17, align: 'center', color: PAL.outline, seed: 'lhint'
    });
    C.textCached(ctx, 'boba left: ' + S.shotsLeft, 800, 110, {
      size: 18, color: PAL.outline, seed: 'lleft' + S.shotsLeft
    });
  }

  // ---------------------------------------------------- 2. BOBA BOUNCE

  function bounceEnter() {
    S.padX = 480;
    S.ball = { x: 480, y: 420, vx: 150, vy: -230 };
    S.balls = 3;
    S.score = 0;
    S.bricks = [];
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 10; c++) {
        S.bricks.push({ x: 90 + c * 78, y: 150 + r * 34, w: 68, h: 26, row: r, gone: false });
      }
    }
  }

  function bounceUpdate(dt) {
    var a = W.input.axis();
    S.padX = W.clamp(S.padX + a[0] * 460 * dt, 90, 870);
    var b = S.ball;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 30) { b.x = 30; b.vx = Math.abs(b.vx); }
    if (b.x > 930) { b.x = 930; b.vx = -Math.abs(b.vx); }
    if (b.y < 90) { b.y = 90; b.vy = Math.abs(b.vy); }
    // the paddle
    if (b.vy > 0 && b.y > 486 && b.y < 512 && Math.abs(b.x - S.padX) < 66) {
      b.vy = -Math.abs(b.vy);
      b.vx += (b.x - S.padX) * 2.6;
      b.vx = W.clamp(b.vx, -320, 320);
      if (W.audio) W.audio.play('blip');
    }
    // bricks
    for (var i = 0; i < S.bricks.length; i++) {
      var br = S.bricks[i];
      if (br.gone) continue;
      if (b.x > br.x - 6 && b.x < br.x + br.w + 6 && b.y > br.y - 6 && b.y < br.y + br.h + 6) {
        br.gone = true;
        S.score += 10 - br.row * 2 + 2;
        b.vy = -b.vy;
        W.fx.sparkle(b.x, b.y, 6, 40);
        if (W.audio) W.audio.play('pop');
        break;
      }
    }
    if (S.bricks.every(function (br2) { return br2.gone; })) { finish(S.score); return; }
    if (b.y > 560) {
      S.balls--;
      if (S.balls <= 0) { finish(S.score); return; }
      S.ball = { x: S.padX, y: 420, vx: 150, vy: -230 };
      W.say('One left over here!');
    }
  }

  function brickTile(row) {
    return tile('bbr' + row, 70, 28, function (g) {
      C.roundRect(g, 1, 1, 68, 26, 8, {
        seed: 'bb' + row, fill: ['#E8A0B4', '#F2C14E', '#9CCB6B', '#8FD0EE'][row],
        stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.85
      });
    });
  }
  function paddleTile() {
    return tile('bpad', 136, 24, function (g) {
      C.roundRect(g, 2, 2, 132, 20, 9, {
        seed: 'bpad', fill: '#C9A882', stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.85
      });
    });
  }
  function ballTile() {
    return tile('bball', 32, 32, function (g) {
      C.dot(g, 16, 16, 12, '#5A3A20', 'bball');
      C.dot(g, 13, 12, 4, PAL.white, 'bballg');
    });
  }

  function bounceDraw(ctx) {
    ctx.drawImage(backdrop('bounce', '#2E3B5A'), 0, 0);
    S.bricks.forEach(function (br) {
      if (br.gone) return;
      ctx.drawImage(brickTile(br.row), br.x, br.y);
    });
    ctx.drawImage(paddleTile(), S.padX - 68, 488);
    ctx.drawImage(ballTile(), S.ball.x - 16, S.ball.y - 16);
    C.textCached(ctx, 'balls: ' + S.balls, 60, 110, {
      size: 18, color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'bbl' + S.balls
    });
  }

  // -------------------------------------------------------- 3. ROAD HOP

  function hopEnter() {
    S.hx = 480; S.hy = 520;
    S.score = 0;
    S.lives = 3;
    S.lanes = [];
    var rnd = W.mulberry32(W.hash('hop' + W.game.state.day));
    // three car lanes, then a river of logs
    for (var l = 0; l < 6; l++) {
      var river = l >= 3;
      S.lanes.push({
        y: 458 - l * 62, river: river,        // exactly one hop apart
        dir: l % 2 ? 1 : -1,
        speed: 70 + rnd() * 70 + l * 8,
        items: [0, 1, 2].map(function (k) { return 40 + k * 330 + rnd() * 90; })
      });
    }
  }

  function hopUpdate(dt) {
    var a = W.input.axis();
    if (W.input.hit('left'))  S.hx = W.clamp(S.hx - 62, 40, 920);
    if (W.input.hit('right')) S.hx = W.clamp(S.hx + 62, 40, 920);
    if (W.input.hit('up'))    S.hy = Math.max(86, S.hy - 62);
    if (W.input.hit('down'))  S.hy = Math.min(520, S.hy + 62);

    var onLog = false, hit = false, lane = null;
    S.lanes.forEach(function (ln) {
      ln.items = ln.items.map(function (ix) {
        var nx = ix + ln.dir * ln.speed * dt;
        if (nx > 1040) nx = -120;
        if (nx < -120) nx = 1040;
        return nx;
      });
      if (Math.abs(ln.y - S.hy) > 26) return;
      lane = ln;
      ln.items.forEach(function (ix) {
        if (ln.river) {
          // a generous log: easy to land on, easy to stay on
          if (S.hx > ix - 8 && S.hx < ix + 108) onLog = true;
        } else {
          // a mean little car box, well inside the drawn car
          if (S.hx > ix + 18 && S.hx < ix + 78) hit = true;
        }
      });
    });

    // in the river and not on a log is a splash
    if (lane && lane.river) {
      if (onLog) S.hx += lane.dir * lane.speed * dt;         // ride the log
      else hit = true;
    }
    if (hit) {
      S.lives--;
      W.fx.dust(S.hx, S.hy, 8);
      S.hx = 480; S.hy = 520;
      W.say(['Oops! Splash!', 'Whoa — beep beep!', 'Try again!'][Math.floor(Math.random() * 3)]);
      if (W.audio) W.audio.play('thud');
      if (S.lives <= 0) { finish(S.score); return; }
    }
    if (S.hy <= 100) {
      S.score += 50;
      W.fx.sparkle(S.hx, S.hy, 18, 110);
      S.hx = 480; S.hy = 520;
      W.say('Made it across!', PAL.sun);
      if (W.audio) W.audio.play('cheer');
    }
    S.hx = W.clamp(S.hx, 30, 930);
  }

  function hopBoard() {
    // the lanes never move, so the whole board is one bake (keyed by the
    // day, since the layout is seeded)
    return tile('hboard' + W.game.state.day, 960, 600, function (g) {
      g.drawImage(backdrop('hop', '#8FBF63'), 0, 0);
      S.lanes.forEach(function (ln, li) {
        C.rect(g, -6, ln.y - 26, 972, 52, {
          seed: 'hl' + li, fill: ln.river ? '#5FA8D6' : '#8A8F98',
          stroke: null, hatch: 5, wash: 0.6, fillAlpha: 0.8
        });
      });
      C.rect(g, -6, 84, 972, 46, {
        seed: 'hbank', fill: '#9CCB6B', stroke: null, hatch: 5, wash: 0.6, fillAlpha: 0.85
      });
    });
  }
  function logTile() {
    return tile('hlog', 100, 36, function (g) {
      C.roundRect(g, 2, 2, 96, 32, 12, {
        seed: 'hlog', fill: '#8A5F38', stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.82
      });
    });
  }
  function carTile(kind) {
    return tile('hcar' + kind, 96, 62, function (g) {
      C.roundRect(g, 2, 2, 92, 40, 8, {
        seed: 'hcar' + kind, fill: kind ? '#D9402F' : PAL.white,
        stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.85
      });
      C.dot(g, 22, 42, 8, '#3B2A20', 'hw1' + kind);
      C.dot(g, 74, 42, 8, '#3B2A20', 'hw2' + kind);
    });
  }

  function hopDraw(ctx) {
    ctx.drawImage(hopBoard(), 0, 0);
    S.lanes.forEach(function (ln) {
      ln.items.forEach(function (ix, ii) {
        if (ln.river) ctx.drawImage(logTile(), ix, ln.y - 18);
        else ctx.drawImage(carTile(ii % 2), ix, ln.y - 22);
      });
    });
    W.drawChar(ctx, S.hx, S.hy, {
      char: 'pet', dir: 'up', t: S.t, scale: 0.8, moving: true, hopT: (S.t * 3) % 1
    });
    C.textCached(ctx, 'lives: ' + S.lives, 60, 110, {
      size: 18, color: PAL.outline, seed: 'hlv' + S.lives
    });
  }

  // ------------------------------------------------------ 4. PEARL CHAIN

  var GW = 24, GH = 13, CELL = 32, GX = 96, GY = 128;

  function chainEnter() {
    S.snake = [[12, 6], [11, 6], [10, 6]];
    S.dir = [1, 0];
    S.nextDir = [1, 0];
    S.tick = 0;
    S.step = 0.16;
    S.score = 0;
    S.snack = placeSnack();
    S.moves = 0;
  }

  function placeSnack() {
    for (var tries = 0; tries < 200; tries++) {
      var p = [Math.floor(Math.random() * GW), Math.floor(Math.random() * GH)];
      if (!S.snake.some(function (s2) { return s2[0] === p[0] && s2[1] === p[1]; })) return p;
    }
    return [1, 1];
  }

  function chainUpdate(dt) {
    var a = W.input.axis();
    if (a[0] && !S.dir[0]) S.nextDir = [a[0] > 0 ? 1 : -1, 0];
    else if (a[1] && !S.dir[1]) S.nextDir = [0, a[1] > 0 ? 1 : -1];

    S.tick += dt;
    if (S.tick < S.step) return;
    S.tick = 0;
    S.dir = S.nextDir;
    var head = S.snake[0];
    var nx = head[0] + S.dir[0];
    var ny = head[1] + S.dir[1];
    // the white border is a wall — touch it and the run is over
    if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) {
      W.fx.dust(GX + head[0] * CELL + CELL / 2, GY + head[1] * CELL + CELL / 2, 10);
      if (W.audio) W.audio.play('thud');
      W.say('Bonk! Watch the walls.');
      finish(S.score);
      return;
    }

    // bumping yourself just trims the chain; it never ends the game
    var hitAt = -1;
    for (var i = 0; i < S.snake.length; i++) {
      if (S.snake[i][0] === nx && S.snake[i][1] === ny) { hitAt = i; break; }
    }
    if (hitAt > 0) {
      S.snake = S.snake.slice(0, Math.max(3, hitAt));
      W.fx.dust(GX + nx * CELL, GY + ny * CELL, 5);
      if (W.audio) W.audio.play('thud');
    }

    S.snake.unshift([nx, ny]);
    S.moves++;
    if (nx === S.snack[0] && ny === S.snack[1]) {
      S.score += 10;
      S.snack = placeSnack();
      S.step = Math.max(0.075, S.step - 0.004);   // creeps up very gently
      W.fx.sparkle(GX + nx * CELL + CELL / 2, GY + ny * CELL + CELL / 2, 8, 50);
      if (W.audio) W.audio.play('pickup');
    } else {
      S.snake.pop();
    }
    if (S.moves > 700) finish(S.score);
  }

  function gridTile() {
    return tile('cgrid', GW * CELL + 28, GH * CELL + 28, function (g) {
      C.rect(g, 4, 4, GW * CELL + 20, GH * CELL + 20, {
        seed: 'cgrid', stroke: PAL.white, lw: 3, wob: 1.4, passes: 1, strokeAlpha: 0.5
      });
    });
  }
  function pearlTile(body) {
    return tile('cpearl' + body, 40, 40, function (g) {
      C.dot(g, 20, 20, body ? 13 : 16, body ? '#8A5A2B' : '#5A3A20', 'csn' + body);
    });
  }

  function chainDraw(ctx) {
    ctx.drawImage(backdrop('chain', '#3E3654'), 0, 0);
    ctx.drawImage(gridTile(), GX - 14, GY - 14);
    S.snake.forEach(function (seg, i) {
      var img = pearlTile(i ? 1 : 0);
      ctx.drawImage(img, GX + seg[0] * CELL + CELL / 2 - img.width / 2,
                         GY + seg[1] * CELL + CELL / 2 - img.height / 2);
    });
    W.drawItem(ctx, ['tomato', 'egg', 'cake', 'boba'][S.score / 10 % 4 | 0],
      GX + S.snack[0] * CELL + CELL / 2, GY + S.snack[1] * CELL + CELL / 2, 14);
    C.textCached(ctx, 'mind the walls!', 480, 110, {
      size: 17, align: 'center', color: PAL.white,
      outline: 3, outlineColor: PAL.outline, seed: 'chint2'
    });
  }

  // ------------------------------------------------------------- shell

  var IMPL = {
    lob:    { enter: lobEnter,    update: lobUpdate,    draw: lobDraw },
    bounce: { enter: bounceEnter, update: bounceUpdate, draw: bounceDraw },
    hop:    { enter: hopEnter,    update: hopUpdate,    draw: hopDraw },
    chain:  { enter: chainEnter,  update: chainUpdate,  draw: chainDraw }
  };

  S.enter = function (p) {
    S.t = 0;
    S.game = (p && p.game) || 'lob';
    S.over = false;
    S.overT = 0;
    S.newBest = false;
    S.score = 0;
    S.best = (W.game.state.arcade || {})[S.game] || 0;
    IMPL[S.game].enter();
    W.say(GAMES[S.game].name + '!', GAMES[S.game].color);
  };

  S.update = function (dt) {
    var G = W.game;
    S.t += dt;
    W.dialogue.update(dt);
    W.fx.update(dt);
    if (W.input.hit('back')) { G.fadeTo('house', { room: 'arcade' }); return; }
    if (S.over) {
      S.overT += dt;
      if (W.input.hit('act') && S.overT > 0.5) G.fadeTo('house', { room: 'arcade' });
      return;
    }
    IMPL[S.game].update(dt);
  };

  S.draw = function (ctx) {
    IMPL[S.game].draw(ctx);
    W.fx.draw(ctx);

    C.textCached(ctx, GAMES[S.game].name, 480, 46, {
      size: 26, align: 'center', color: GAMES[S.game].color,
      outline: 4, outlineColor: PAL.white, seed: 'agn' + S.game
    });
    C.textCached(ctx, 'score ' + S.score, 700, 110, {
      size: 20, color: PAL.outline, outline: 3, outlineColor: PAL.white, seed: 'asc' + S.score
    });
    C.textCached(ctx, 'best ' + S.best, 700, 136, {
      size: 15, color: PAL.woodDk, outline: 3, outlineColor: PAL.white, seed: 'abs' + S.best
    });

    if (S.over) {
      C.roundRect(ctx, 280, 190, 400, 210, 18, {
        seed: 'aover', fill: PAL.white, stroke: PAL.outline, lw: 5, hatch: 5, wash: 0.9, fillAlpha: 0.3
      });
      C.textCached(ctx, S.newBest ? 'NEW BEST!' : 'GOOD GAME!', 480, 250, {
        size: 32, align: 'center', color: PAL.sun,
        outline: 5, outlineColor: PAL.outline, seed: 'aovt' + (S.newBest ? 'b' : 'g')
      });
      C.textCached(ctx, 'score: ' + S.score, 480, 300, {
        size: 22, align: 'center', color: PAL.outline, seed: 'aovs' + S.score
      });
      W.drawPrompt(ctx, 480, 362, 'back to the arcade', S.t, false, 'Z');
    } else {
      W.drawPrompt(ctx, 92, 572, 'leave', S.t, false, 'X');
    }
    W.dialogue.draw(ctx, 250, 540);
  };

  /* Where Pearl Chain's board sits, for the layout test. */
  S.grid = function () {
    return { left: GX - 10, right: GX - 10 + GW * CELL + 20,
             top: GY - 10, bottom: GY - 10 + GH * CELL + 20 };
  };

  W.sceneArcade = S;

})(window.W);
