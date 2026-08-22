/* Warmland — the shooty bits.
 *
 * Both fights (Megatron at the park, and the space mission) need the same
 * things: things that fly, things with health, and a way to tell when it's
 * over. The weapon is always the boba gun.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  function Fight() {
    this.shots = [];        // Bobby's boba
    this.enemyShots = [];
    this.enemies = [];
    // hitDy/hitR: where the body actually is relative to the anchor point —
    // the mech stands tall above its feet, the UFO is centred on itself
    this.hero = { x: 480, y: 470, hp: 5, maxHp: 5, hurt: 0, cool: 0, hitDy: -70, hitR: 40 };
    this.over = null;       // 'win' | 'lose'
    this.overT = 0;
    this.shake = 0;
    /* Boss fights are won when the field is clear. Wave missions spawn over
     * time, so an empty field at the start is not a victory — they set this
     * false and call their own ending. */
    this.autoWin = true;
  }

  Fight.prototype.fire = function (x, y, vx, vy, big) {
    if (this.hero.cool > 0) return;
    this.hero.cool = big ? 0.34 : 0.22;
    this.shots.push({ x: x, y: y, vx: vx, vy: vy, r: big ? 11 : 8, life: 2.4 });
    if (W.audio) W.audio.play('shoot');
  };

  Fight.prototype.enemyFire = function (x, y, vx, vy, r) {
    this.enemyShots.push({ x: x, y: y, vx: vx, vy: vy, r: r || 10, life: 4 });
  };

  Fight.prototype.hurtHero = function (n) {
    if (this.hero.hurt > 0 || this.over) return;
    this.hero.hp -= (n || 1);
    this.hero.hurt = 1.8;      // generous mercy time — the player is a child
    this.shake = 0.35;
    if (W.audio) W.audio.play('hit');
    if (this.hero.hp <= 0) {
      this.hero.hp = 0;
      this.over = 'lose';
      this.overT = 0;
    }
  };

  Fight.prototype.update = function (dt) {
    var i, s;
    if (this.hero.cool > 0) this.hero.cool -= dt;
    if (this.hero.hurt > 0) this.hero.hurt -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.over) { this.overT += dt; return; }

    for (i = this.shots.length - 1; i >= 0; i--) {
      s = this.shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0 || s.x < -40 || s.x > 1000 || s.y < -40 || s.y > 640) this.shots.splice(i, 1);
    }
    for (i = this.enemyShots.length - 1; i >= 0; i--) {
      s = this.enemyShots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0 || s.x < -40 || s.x > 1000 || s.y < -40 || s.y > 640) this.enemyShots.splice(i, 1);
      // The hit point is the body centre, not the feet: hero.x/y is the
      // sprite baseline, and the mech stands ~150px tall above it.
      else if (Math.hypot(s.x - this.hero.x, s.y - (this.hero.y + this.hero.hitDy)) < s.r + this.hero.hitR) {
        this.enemyShots.splice(i, 1);
        this.hurtHero(1);
      }
    }

    // Bobby's boba versus everything hostile
    for (var e = this.enemies.length - 1; e >= 0; e--) {
      var en = this.enemies[e];
      if (en.hurt > 0) en.hurt -= dt;
      for (i = this.shots.length - 1; i >= 0; i--) {
        s = this.shots[i];
        if (Math.hypot(s.x - en.x, s.y - en.y) < s.r + en.r) {
          this.shots.splice(i, 1);
          en.hp -= 1;
          en.hurt = 0.22;
          W.fx.sparkle(s.x, s.y, 6, 40);
          if (W.audio) W.audio.play('hit');
          if (en.hp <= 0) {
            W.fx.sparkle(en.x, en.y, 26, 150);
            if (W.audio) W.audio.play('boom');
            this.enemies.splice(e, 1);
            this.shake = 0.4;
            break;
          }
        }
      }
    }

    if (this.autoWin && !this.enemies.length && !this.over) { this.over = 'win'; this.overT = 0; }
  };

  /* Shot sprites baked per (radius, palette) — there are only a handful of
   * combinations, and live crayon dots cost a clip each. */
  var shotTiles = {};
  function shotTile(r, outer, inner) {
    var key = r + '|' + outer;
    if (!shotTiles[key]) {
      var m = Math.ceil(r * 1.6);
      var cv = C.offscreen(m * 2, m * 2);
      var g = cv.getContext('2d');
      C.dot(g, m, m, r, outer, 'sh' + key);
      C.dot(g, m, m, r * 0.5, inner, 'shc' + key);
      shotTiles[key] = { img: cv, m: m };
    }
    return shotTiles[key];
  }

  Fight.prototype.drawShots = function (ctx) {
    var i, t;
    for (i = 0; i < this.shots.length; i++) {
      var s = this.shots[i];
      t = shotTile(s.r, PAL.tea, PAL.pearl);
      ctx.drawImage(t.img, s.x - t.m, s.y - t.m);
    }
    for (i = 0; i < this.enemyShots.length; i++) {
      var q = this.enemyShots[i];
      t = shotTile(q.r, '#9A5FD6', '#E0C4FF');
      ctx.drawImage(t.img, q.x - t.m, q.y - t.m);
    }
  };

  /* A crayon health bar. The frame, the full fill and the label are baked
   * per (w,color,label); only the reveal clip changes per frame. */
  var barTiles = {};
  W.drawHealthBar = function (ctx, x, y, w, frac, color, label) {
    var key = w + '|' + color + '|' + label;
    var tile = barTiles[key];
    if (!tile) {
      var cv = C.offscreen(w + 16, 38);
      var g = cv.getContext('2d');
      C.roundRect(g, 8, 8, w, 22, 9, {
        seed: 'hb' + label, fill: PAL.white, stroke: PAL.outline, lw: 2.8, hatch: 5, wash: 0.9, fillAlpha: 0.2
      });
      var fv = C.offscreen(w + 16, 38);
      var fg = fv.getContext('2d');
      C.roundRect(fg, 8, 8, w, 22, 9, { seed: 'hf' + label, fill: color, stroke: null, hatch: 3.4, wash: 0.92 });
      C.text(fv.getContext('2d'), '', 0, 0, {});    // no-op, keeps shape simple
      var lv = C.offscreen(w + 16, 38);
      C.text(lv.getContext('2d'), label, 16, 25, { size: 14, color: PAL.outline, seed: 'hl' + label });
      tile = barTiles[key] = { frame: cv, fill: fv, label: lv };
      var bk = Object.keys(barTiles);
      if (bk.length > 20) delete barTiles[bk[0]];
    }
    ctx.drawImage(tile.frame, x - 8, y - 8);
    if (frac > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w * W.clamp(frac, 0, 1), 22);
      ctx.clip();
      ctx.drawImage(tile.fill, x - 8, y - 8);
      ctx.restore();
    }
    ctx.drawImage(tile.label, x - 8, y - 8);
  };

  /* Megatron: stylised grey robot, purple accents, giant arm cannon.
   * Baked once — the hurt flash is just alpha at blit time. */
  var megaTile = null, alienTile = null;

  W.drawMegatron = function (ctx, x, y, sc, t, hurt) {
    if (!megaTile) {
      megaTile = C.offscreen(340, 260);
      var mg = megaTile.getContext('2d');
      mg.translate(170, 140);
      paintMegatron(mg);
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 50);
    ctx.drawImage(megaTile, -170, -140);
    ctx.restore();
  };

  function paintMegatron(ctx) {
    ctx.save();
    var grey = '#8A9098', dark = '#5C626A', purple = '#7A4FB5', lilac = '#A87FD6';

    ctx.globalAlpha *= 1;
    ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = PAL.outline;
    ctx.beginPath(); ctx.ellipse(0, 96, 74, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    // legs
    for (var s = -1; s <= 1; s += 2) {
      C.roundRect(ctx, s * 30 - 18, 20, 36, 44, 7, { seed: 'mth' + s, fill: grey, stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.7 });
      C.roundRect(ctx, s * 30 - 16, 60, 32, 34, 6, { seed: 'mts' + s, fill: dark, stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.7 });
      C.ellipse(ctx, s * 30, 96, 24, 9, { seed: 'mtf' + s, fill: dark, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.75 });
    }
    // torso
    C.poly(ctx, [[-44, -60], [44, -60], [36, 24], [-36, 24]], {
      seed: 'mtor', fill: grey, stroke: PAL.outline, lw: 4, hatch: 4.4, wash: 0.7
    });
    C.poly(ctx, [[-26, -52], [26, -52], [20, -6], [-20, -6]], {
      seed: 'mchest', fill: purple, stroke: PAL.outline, lw: 3.4, hatch: 3.8, wash: 0.72
    });
    C.ellipse(ctx, 0, -28, 13, 13, { seed: 'mcore', fill: lilac, stroke: PAL.outline, lw: 3, hatch: 2.8, wash: 0.85 });

    // shoulders
    for (var sh = -1; sh <= 1; sh += 2) {
      C.poly(ctx, [[sh * 44, -66], [sh * 78, -52], [sh * 70, -18], [sh * 40, -28]], {
        seed: 'msh' + sh, fill: purple, stroke: PAL.outline, lw: 3.4, hatch: 3.8, wash: 0.7
      });
    }
    // left arm
    C.roundRect(ctx, -80, -24, 22, 56, 8, { seed: 'marm', fill: dark, stroke: PAL.outline, lw: 3.4, hatch: 3.6, wash: 0.7 });
    C.ellipse(ctx, -69, 38, 14, 12, { seed: 'mhand', fill: grey, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.75 });

    // the giant arm cannon
    C.roundRect(ctx, 56, -34, 74, 40, 10, { seed: 'mcan', fill: dark, stroke: PAL.outline, lw: 4, hatch: 4, wash: 0.72 });
    C.ellipse(ctx, 132, -14, 15, 22, { seed: 'mmuz', fill: purple, stroke: PAL.outline, lw: 3.4, hatch: 3, wash: 0.8 });
    C.ellipse(ctx, 134, -14, 8, 13, { seed: 'mglow', fill: lilac, stroke: null, hatch: 2.4, wash: 0.9 });
    for (var r = 0; r < 3; r++) {
      C.line(ctx, 70 + r * 18, -34, 70 + r * 18, 6, { seed: 'mrb' + r, stroke: purple, lw: 3, wob: 0.6, passes: 1 });
    }

    // head
    C.poly(ctx, [[-24, -96], [24, -96], [28, -66], [-28, -66]], {
      seed: 'mhead', fill: grey, stroke: PAL.outline, lw: 3.6, hatch: 3.6, wash: 0.72
    });
    C.rect(ctx, -20, -88, 40, 12, { seed: 'mvis', fill: '#E0455F', stroke: PAL.outline, lw: 2.8, hatch: 2.4, wash: 0.85 });
    for (var f = -1; f <= 1; f += 2) {
      C.poly(ctx, [[f * 24, -96], [f * 40, -116], [f * 30, -90]], {
        seed: 'mfin' + f, fill: purple, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.75
      });
    }
    ctx.restore();
  }

  /* The MOTHERSHIP — a vast saucer with a glowing core, baked once. */
  var motherTile = null;
  W.drawMothership = function (ctx, x, y, sc, t, hurt) {
    if (!motherTile) {
      motherTile = C.offscreen(360, 180);
      var mg = motherTile.getContext('2d');
      mg.translate(180, 90);
      paintMothership(mg);
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 50);
    ctx.drawImage(motherTile, -180, -90);
    // the core pulses live — one cheap dot blit's worth of glow
    var pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.globalAlpha = (hurt > 0 ? 0.6 : 1) * (0.35 + pulse * 0.4);
    ctx.fillStyle = '#E0C4FF';
    ctx.beginPath();
    ctx.arc(0, 14, 17 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  function paintMothership(ctx) {
    ctx.save();
    // vast hull
    C.ellipse(ctx, 0, 0, 168, 44, {
      seed: 'mshull', fill: '#5A4A78', stroke: PAL.outline, lw: 4.4, hatch: 4.6, wash: 0.72
    });
    C.ellipse(ctx, 0, -10, 168, 36, {
      seed: 'msrim', stroke: PAL.outline, lw: 2.6, wob: 1.4, passes: 1, strokeAlpha: 0.6
    });
    // command dome
    C.arc(ctx, 0, -18, 62, Math.PI, Math.PI * 2, {
      seed: 'msdome', fill: '#9FE8B4', stroke: PAL.outline, lw: 3.6, hatch: 4, wash: 0.5, fillAlpha: 0.4
    });
    C.dot(ctx, -18, -38, 5, PAL.outline, 'mseye1');
    C.dot(ctx, 18, -38, 5, PAL.outline, 'mseye2');
    C.arc(ctx, 0, -30, 12, Math.PI * 0.15, Math.PI * 0.85, {
      seed: 'msgrin', stroke: PAL.outline, lw: 2.6, wob: 0.7, passes: 1
    });
    // underlights
    var lcols = ['#E0455F', '#F2C14E', '#9A5FD6', '#F2C14E', '#E0455F'];
    for (var i = 0; i < 5; i++) {
      C.dot(ctx, -120 + i * 60, 22, 9, lcols[i], 'msl' + i);
    }
    // antennae
    for (var a = -1; a <= 1; a += 2) {
      C.line(ctx, a * 70, -52, a * 92, -78, { seed: 'msant' + a, stroke: PAL.outline, lw: 3, wob: 1 });
      C.dot(ctx, a * 94, -80, 5, '#E0455F', 'msab' + a);
    }
    // the core housing
    C.ellipse(ctx, 0, 14, 22, 16, {
      seed: 'mscore', fill: '#3A2E58', stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.8
    });
    ctx.restore();
  }

  /* An alien saucer for the space mission — baked the same way. */
  W.drawAlien = function (ctx, x, y, sc, t, hurt) {
    if (!alienTile) {
      alienTile = C.offscreen(120, 80);
      var ag = alienTile.getContext('2d');
      ag.translate(60, 44);
      paintAlien(ag);
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    if (hurt > 0) ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 50);
    ctx.drawImage(alienTile, -60, -44);
    ctx.restore();
  };

  function paintAlien(ctx) {
    ctx.save();
    C.arc(ctx, 0, -4, 24, Math.PI, Math.PI * 2, {
      seed: 'aldome', fill: '#9FE8B4', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.6
    });
    C.ellipse(ctx, 0, 0, 46, 14, {
      seed: 'albody', fill: '#7A4FB5', stroke: PAL.outline, lw: 3.2, hatch: 3.6, wash: 0.72
    });
    for (var i = 0; i < 3; i++) C.dot(ctx, -22 + i * 22, 6, 5, PAL.sun, 'all' + i);
    C.dot(ctx, -7, -10, 4, PAL.outline, 'ale1');
    C.dot(ctx, 7, -10, 4, PAL.outline, 'ale2');
    ctx.restore();
  }

  W.Fight = Fight;
})(window.W);
