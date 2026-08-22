/* Warmland — the two missions.
 *
 * Both run on combat.js. Megatron is a stand-and-fight boss on the park lawn;
 * the space mission is a scrolling shoot-out over the star field. They share
 * the boba gun, the health bars and the win screen.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var S = { mission: 'megatron', f: null, t: 0, boss: null, wave: 0, spawnIn: 0, papers: {}, lock: 0,
            armedNext: false };

  function spawnAlien() {
    var side = Math.random() < 0.5 ? -50 : 1010;
    S.f.enemies.push({
      x: side, y: 90 + Math.random() * 220, r: 40, hp: 2, hurt: 0,
      vx: (side < 0 ? 1 : -1) * (60 + Math.random() * 70),
      vy: (Math.random() - 0.5) * 40, fireIn: 1 + Math.random() * 2, alien: true
    });
  }

  function makeBoss() {
    return { x: 700, y: 220, r: 74, hp: 20, maxHp: 20, hurt: 0, t: 0, phase: 0, fireIn: 1.6, vx: -70 };
  }

  S.enter = function (p) {
    p = p || {};
    S.mission = p.mission || 'megatron';
    S.f = new W.Fight();
    S.t = 0;
    S.lock = 2;                 // a moment to read and breathe before shots fly
    S.wave = 0;
    S.spawnIn = 0.5;

    S.armedNext = false;
    if (S.mission === 'mothership') {
      // the big one: fought in the UFO, straight after the invasion
      S.boss = { x: 480, y: 170, r: 120, hp: 26, maxHp: 26, hurt: 0, t: 0,
                 fireIn: 2, vx: 60, mother: true, spawnIn: 5 };
      S.f.enemies = [S.boss];
      S.f.hero.x = 480; S.f.hero.y = 480;
      S.f.hero.hp = S.f.hero.maxHp = 6;
      S.f.hero.hitDy = -8;
      S.f.hero.hitR = 45;
      W.say('THE MOTHERSHIP! Aim for the core!', '#E0455F');
    } else if (S.mission === 'megatron') {
      S.boss = makeBoss();
      S.f.enemies = [S.boss];
      S.f.hero.x = 300; S.f.hero.y = 470;
      S.f.hero.hp = S.f.hero.maxHp = 6;
      W.say('MEGATRON! Boba gun, go! (X runs away)', PAL.roof);
    } else {
      S.boss = null;
      S.f.autoWin = false;               // waves arrive over time
      S.f.hero.x = 480; S.f.hero.y = 480;
      S.f.hero.hp = S.f.hero.maxHp = 6;
      S.f.hero.hitDy = -8;               // the saucer body IS the hitbox
      S.f.hero.hitR = 45;
      spawnAlien(); spawnAlien();
      S.wave = 2;
      W.say('Alien saucers! Z to shoot. X flies home.', PAL.sky);
    }
    // One fully-drawn backdrop per mission, baked once. The scenery used to
    // be crayoned live every frame (~6-12ms); now it's a single blit.
    if (!S.papers[S.mission]) {
      var cv = C.offscreen(960, 600);
      var g = cv.getContext('2d');
      g.drawImage(C.paper(960, 600, 'mission' + S.mission,
        S.mission === 'megatron' ? '#8FBF63' : '#0E1030'), 0, 0);
      if (S.mission !== 'megatron') {
        var rnd = W.mulberry32(W.hash('mstars'));
        for (var st = 0; st < 90; st++) {
          C.dot(g, rnd() * 960, rnd() * 600, 1 + rnd() * 2, '#FFFFFF', 'ms' + st);
        }
        for (var bs = 0; bs < 8; bs++) {
          C.star(g, 60 + (bs * 127) % 840, 40 + (bs * 83) % 500, 6 + (bs % 3) * 3, PAL.sun, 'mbs' + bs);
        }
      } else {
        C.ellipse(g, 480, 620, 520, 170, {
          seed: 'mhill', fill: PAL.grassDk, stroke: null, hatch: 7, wash: 0.32, fillAlpha: 0.3
        });
        W.PROPS.tree.draw(g, 60, 300, 'mtree1');
        W.PROPS.tree.draw(g, 850, 320, 'mtree2');
      }
      S.papers[S.mission] = cv;
    }
    S.paper = S.papers[S.mission];
    if (W.audio) W.audio.play('ding');
  };

  S.update = function (dt) {
    var G = W.game;
    S.t += dt;
    S.lock = Math.max(0, S.lock - dt);
    W.dialogue.update(dt);
    W.fx.update(dt);

    var f = S.f;
    var hero = f.hero;

    if (!f.over) {
      // move Bobby
      var a = W.input.axis();
      var sp = 250 * dt;
      hero.x = W.clamp(hero.x + a[0] * sp, 60, 900);
      hero.y = W.clamp(hero.y + a[1] * sp, S.mission === 'space' ? 200 : 330, 545);

      // fleeing is always allowed — a kid must never be trapped in a fight
      if (W.input.hit('back')) {
        W.say('Heading home!');
        if (S.mission === 'megatron') {
          if (W.service) W.service.stop(true);
          G.fadeTo('house', { room: 'park' });
        } else {
          G.fadeTo('vehicle', { vehicle: 'ufo', map: 'space' });
        }
        return;
      }

      // shoot
      if (W.input.down('act')) {
        if (S.mission === 'space' || S.mission === 'mothership') {
          // lean the boba stream toward the nearest saucer so straight-up
          // shots can actually connect with strafing targets
          var near = null, nd = 1e9;
          for (var ai = 0; ai < f.enemies.length; ai++) {
            var dd2 = Math.abs(f.enemies[ai].x - hero.x);
            if (dd2 < nd) { nd = dd2; near = f.enemies[ai]; }
          }
          var lean = near ? W.clamp((near.x - hero.x) / 200, -1, 1) * 170 : 0;
          f.fire(hero.x, hero.y - 24, lean, -520);
        } else {
          var tx = S.boss ? S.boss.x - hero.x : 1, ty = S.boss ? S.boss.y - hero.y : 0;
          var d = Math.hypot(tx, ty) || 1;
          f.fire(hero.x + 30, hero.y - 50, (tx / d) * 480, (ty / d) * 480, true);
        }
      }

      // enemies act
      for (var i = 0; i < f.enemies.length; i++) {
        var en = f.enemies[i];
        if (en.mother) {
          en.t += dt;
          en.x += en.vx * dt;
          if (en.x < 220 || en.x > 740) en.vx *= -1;
          en.y = 170 + Math.sin(en.t * 0.8) * 26;
          if (S.lock <= 0) en.fireIn -= dt;
          if (en.fireIn <= 0) {
            en.fireIn = en.hp / en.maxHp > 0.5 ? 1.7 : 1.25;
            // a fan of three from the underlights
            for (var fs = -1; fs <= 1; fs++) {
              var fdx = (hero.x - en.x) / 300 + fs * 0.45;
              f.enemyFire(en.x + fs * 80, en.y + 30, fdx * 150, 210, 11);
            }
          }
          // it calls little saucers to help
          if (S.lock <= 0) en.spawnIn -= dt;
          if (en.spawnIn <= 0 && f.enemies.length < 3) {
            en.spawnIn = 7;
            spawnAlien();
            W.say('It is calling for backup!');
          }
          continue;
        }
        if (en.alien) {
          en.x += en.vx * dt;
          en.y += en.vy * dt;
          if (en.y < 70 || en.y > 340) en.vy *= -1;
          if (en.x < -80 || en.x > 1040) en.vx *= -1;
          if (S.lock <= 0) en.fireIn -= dt;
          if (en.fireIn <= 0) {
            en.fireIn = 1.6 + Math.random() * 2;
            var dx = hero.x - en.x, dy = hero.y - en.y;
            var dd = Math.hypot(dx, dy) || 1;
            f.enemyFire(en.x, en.y + 14, (dx / dd) * 190, (dy / dd) * 190, 9);
          }
        } else {
          // Megatron paces and fires his cannon
          en.t += dt;
          en.x += en.vx * dt;
          if (en.x < 220 || en.x > 760) en.vx *= -1;
          en.y = 220 + Math.sin(en.t * 1.2) * 22;
          if (S.lock <= 0) en.fireIn -= dt;
          if (en.fireIn <= 0) {
            var hpFrac = en.hp / en.maxHp;
            en.fireIn = hpFrac > 0.5 ? 1.6 : 1.2;       // a bit angrier when hurt
            var bx = hero.x - (en.x + 60), by = (hero.y - 70) - en.y;
            var bd = Math.hypot(bx, by) || 1;
            var bs = hpFrac > 0.5 ? 190 : 220;          // always dodgeable
            f.enemyFire(en.x + 60, en.y - 14, (bx / bd) * bs, (by / bd) * bs, 13);
          }
        }
      }

      if (S.mission === 'space') {
        S.spawnIn -= dt;
        if (S.spawnIn <= 0 && S.wave < 10 && f.enemies.length < 3) {
          S.spawnIn = 1.5;
          S.wave++;
          spawnAlien();
        }
        // the mission ends only once the last wave has been cleared
        if (S.wave >= 10 && !f.enemies.length && !f.over) { f.over = 'win'; f.overT = 0; }
      }
    }

    f.update(dt);

    // beating the invasion offers the REAL fight: press E for the mothership
    if (f.over === 'win' && S.mission === 'space' && !S.armedNext) {
      S.armedNext = true;
      W.game.state.missions.space = true;
      W.game.showBanner('INVASION STOPPED!', 'Something HUGE approaches... press E!');
      if (W.audio) W.audio.play('ding');
    }
    if (S.armedNext && W.input.hit('special')) {
      S.enter({ mission: 'mothership' });
      return;
    }

    if (f.over && f.overT > 2.2 && !(S.mission === 'space' && f.over === 'win' && f.overT < 12)) {
      var G2 = W.game;
      if (f.over === 'win') {
        G2.state.missions[S.mission] = true;
        G2.addMoney(S.mission === 'megatron' ? 25 : S.mission === 'mothership' ? 30 : 15);
        if (S.mission === 'megatron') {
          if (W.service) W.service.stop(true);
          G2.fadeTo('house', { room: 'park' });
        } else {
          // victory returns you to free flight over space
          G2.fadeTo('vehicle', { vehicle: 'ufo', map: 'space' });
        }
      } else {
        if (S.mission === 'megatron') {
          if (W.service) W.service.stop(true);
          G2.fadeTo('house', { room: 'park' });
        } else {
          G2.fadeTo('vehicle', { vehicle: 'ufo', map: 'space' });
        }
      }
    }

    if (f.over && f.overT > 0.1 && !S.announced) {
      S.announced = true;
      if (f.over === 'win') {
        W.game.showBanner('MISSION COMPLETE', S.mission === 'megatron'
          ? 'Megatron is sweetened. The park is safe!'
          : S.mission === 'mothership'
            ? 'The MOTHERSHIP retreats! Space is saved!'
            : 'The skies are clear!');
        if (W.audio) W.audio.play('win');
      } else {
        W.game.showBanner('OW!', 'Let us try that again.');
      }
    }
    if (!f.over) S.announced = false;
  };

  S.draw = function (ctx) {
    var G = W.game, f = S.f;
    ctx.save();
    if (f.shake > 0) ctx.translate((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);

    if (S.mission === 'space' || S.mission === 'mothership') {
      // scroll the baked star sheet for drift; two blits cover the wrap
      var off = Math.floor(S.t * 18) % 960;
      ctx.drawImage(S.paper, -off, 0);
      ctx.drawImage(S.paper, 960 - off, 0);
    } else {
      ctx.drawImage(S.paper, 0, 0);
    }

    // enemies
    for (var e = 0; e < f.enemies.length; e++) {
      var en = f.enemies[e];
      if (en.mother) W.drawMothership(ctx, en.x, en.y, 1, S.t, en.hurt);
      else if (en.alien) W.drawAlien(ctx, en.x, en.y, 1, S.t, en.hurt);
      else W.drawMegatron(ctx, en.x, en.y, 1, S.t, en.hurt);
    }

    f.drawShots(ctx);

    // the player: the UFO up in space, the mech on the ground
    var flash = f.hero.hurt > 0 && Math.sin(S.t * 40) > 0;
    if (!flash) {
      if (S.mission === 'space' || S.mission === 'mothership') {
        var hb = Math.sin(S.t * 2.4) * 4;
        ctx.save();
        ctx.translate(f.hero.x, f.hero.y + hb);
        W.drawUFO(ctx, 0, 0, 1, 'mufo', S.t);
        ctx.save();
        ctx.beginPath();
        ctx.rect(-46, -58, 92, 62);
        ctx.clip();
        W.drawChar(ctx, 0, 14, {
          char: 'bobby', suit: G.state.suit, dir: 'down', t: G.t, scale: 0.48, noShadow: true
        });
        ctx.restore();
        W.drawUFOGlass(ctx, 0, 0, 1);
        // party peeking out
        G.state.party.forEach(function (key, i) {
          var fr = W.FRIENDS[key];
          if (fr) W.drawChar(ctx, -34 + i * 24, 24, {
            char: fr.char, tint: fr.tint, dir: 'down', t: G.t + i, scale: 0.3, noShadow: true
          });
        });
        ctx.restore();
      } else {
        W.drawChar(ctx, f.hero.x, f.hero.y, {
          char: 'bobby', suit: G.state.suit, dir: 'right', t: G.t, scale: 0.9
        });
      }
    }

    W.fx.draw(ctx);

    // health
    W.drawHealthBar(ctx, 20, 20, 240, f.hero.hp / f.hero.maxHp, PAL.sun, 'Bobby');
    if (S.mission === 'megatron' && S.boss && f.enemies.indexOf(S.boss) >= 0) {
      W.drawHealthBar(ctx, 700, 20, 240, S.boss.hp / S.boss.maxHp, '#9A5FD6', 'MEGATRON');
    } else if (S.mission === 'mothership') {
      var mb = S.f.enemies.filter(function (e2) { return e2.mother; })[0];
      W.drawHealthBar(ctx, 660, 20, 280, mb ? mb.hp / mb.maxHp : 0, '#E0455F', 'MOTHERSHIP');
    } else if (S.mission === 'space') {
      W.drawHealthBar(ctx, 700, 20, 240, S.wave / 10, '#9A5FD6', 'Waves ' + S.wave + '/10');
    }

    if (S.armedNext) {
      var pulse2 = 0.55 + 0.45 * Math.sin(S.t * 7);
      ctx.save();
      ctx.globalAlpha = pulse2;
      C.textCached(ctx, '!  THE MOTHERSHIP COMES  —  press E  !', 480, 120, {
        size: 24, align: 'center', color: '#E0455F',
        outline: 4, outlineColor: PAL.white, seed: 'msarm'
      });
      ctx.restore();
    }

    C.textCached(ctx, 'arrows move  ·  Z shoot  ·  X go home', 480, 578, {
      size: 16, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'mh'
    });

    ctx.restore();
    W.dialogue.draw(ctx, 480, 200);
  };

  W.sceneMission = S;
})(window.W);
