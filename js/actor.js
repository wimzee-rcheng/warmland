/* Warmland — anything that walks around a room.
 *
 * Movement, collision, facing, hopping, running and jumping used to live
 * inline in scene-house. Pulling them out means an NPC is exactly the same
 * object as the player, just steered by a brain instead of the keyboard.
 */
(function (W) {
  'use strict';

  function hit(ax, ay, aw, ah, b) {
    return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
  }

  /* Feet occupy a small box, not the character's whole drawn height. */
  W.canStand = function (room, solids, x, y, airborne) {
    var b = room.bounds;
    if (x < b.x + 16 || x > b.x + b.w - 16) return false;
    if (y < b.y || y > b.y + b.h) return false;
    var fx = x - 15, fy = y - 13, fw = 30, fh = 14;
    for (var i = 0; i < solids.length; i++) {
      if (airborne && solids[i].jumpable) continue;   // hop right over it
      if (hit(fx, fy, fw, fh, solids[i])) return false;
    }
    return true;
  };

  var WALK = 158, RUN = 265;
  var HOP_WALK = 0.34, HOP_RUN = 0.23;

  W.Actor = function (o) {
    o = o || {};
    this.char = o.char || 'bobby';
    this.tint = o.tint || null;
    this.name = o.name || (W.CHARS[this.char] || {}).name || 'Someone';
    this.isPlayer = !!o.isPlayer;
    this.x = o.x || 0;
    this.y = o.y || 0;
    this.dir = o.dir || 'down';
    this.speed = o.speed || WALK;
    this.scale = o.scale || 1;
    this.hopT = 0;
    this.moving = false;
    this.running = false;
    this.jumpT = 0;
    this.flying = !!(W.CHARS[this.char] || {}).flies;
    this.mood = o.mood || null;
    this.trail = [];                 // breadcrumbs, so followers walk in file
    this.bubble = '';
    this.bubbleT = 0;
    this.busy = 0;                   // >0 while playing a station animation
    this.data = {};                  // brain scratch space
  };

  var P = W.Actor.prototype;

  P.suitKey = function () {
    return this.isPlayer ? W.game.state.suit : 'none';
  };

  /* Steer by an axis in [-1..1]. Returns true if it actually moved. */
  P.move = function (room, solids, ax, ay, dt, run) {
    this.running = !!run && !this.flying;
    var airborne = this.jumpT > 0;

    if (ax === 0 && ay === 0) {
      this.moving = false;
      if (!airborne) this.hopT = 0;
      return false;
    }
    this.moving = true;

    if (ax !== 0 && Math.abs(ax) >= Math.abs(ay)) this.dir = ax > 0 ? 'right' : 'left';
    else if (ay !== 0) this.dir = ay > 0 ? 'down' : 'up';

    var len = Math.hypot(ax, ay) || 1;
    var sp = (this.running ? RUN : this.speed) * dt;
    var nx = this.x + (ax / len) * sp;
    var ny = this.y + (ay / len) * sp;

    var moved = false;
    if (W.canStand(room, solids, nx, this.y, airborne)) { this.x = nx; moved = true; }
    if (W.canStand(room, solids, this.x, ny, airborne)) { this.y = ny; moved = true; }

    if (!airborne) {
      var cycle = this.running ? HOP_RUN : HOP_WALK;
      var was = this.hopT;
      this.hopT = (this.hopT + dt / cycle) % 1;
      // a puff of dust each time a running foot lands
      if (this.running && was > this.hopT && W.fx) W.fx.dust(this.x, this.y);
    }

    this.dropCrumb();
    return moved;
  };

  P.dropCrumb = function () {
    var t = this.trail;
    var last = t[t.length - 1];
    if (!last || Math.hypot(last[0] - this.x, last[1] - this.y) > 7) {
      t.push([this.x, this.y, this.dir]);
      if (t.length > 90) t.shift();
    }
  };

  P.jump = function () {
    if (this.jumpT > 0 || this.flying) return false;
    this.jumpT = 0.0001;
    if (W.audio) W.audio.play('jump');
    return true;
  };

  P.update = function (dt) {
    if (this.jumpT > 0) {
      this.jumpT += dt / 0.55;
      if (this.jumpT >= 1) {
        this.jumpT = 0;
        if (W.fx) W.fx.dust(this.x, this.y, 6);
        if (W.audio) W.audio.play('land');
      }
    }
    if (this.bubbleT > 0) this.bubbleT -= dt;
    if (this.busy > 0) this.busy -= dt;
  };

  /* A short line over this actor's head — used by NPC chatter. */
  P.says = function (text, secs) {
    this.bubble = text;
    this.bubbleT = secs || 2.2;
  };

  P.lift = function () {
    return this.jumpT > 0 ? Math.sin(this.jumpT * Math.PI) * 30 : 0;
  };

  P.draw = function (ctx, t) {
    var jl = this.lift();
    W.drawChar(ctx, this.x, this.y - jl, {
      char: this.char, tint: this.tint, suit: this.suitKey(),
      frames: this.isCrowd ? 1 : 4,
      dir: this.dir, hopT: this.hopT,
      moving: this.moving || this.jumpT > 0,
      t: t, scale: this.scale,
      noShadow: jl > 0
    });
    if (jl > 0) {
      // a separate, shrinking shadow while airborne
      ctx.save();
      ctx.globalAlpha = 0.18 * (1 - jl / 34);
      ctx.fillStyle = W.PAL.outline;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 2, 20 * this.scale, 6.5 * this.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  /* Little bubble drawn above NPCs — separate from the player's dialogue. */
  P.drawBubble = function (ctx) {
    if (this.bubbleT <= 0 || !this.bubble) return;
    var C = W.crayon, PAL = W.PAL;
    var size = 18;
    var w = C.textWidth(ctx, this.bubble, size) + 22;
    var x = W.clamp(this.x - w / 2, 6, 960 - w - 6);
    var y = Math.max(58, this.y - 128 - this.lift());
    var qw = Math.ceil(w / 12) * 12;
    var tile = W.bubbleTile(qw, 28, false);
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.bubbleT * 2.5);
    ctx.drawImage(tile.img, Math.round(x - tile.pad), Math.round(y - tile.pad));
    C.textCached(ctx, this.bubble, x + (qw - w) / 2 + 11, y + 20, {
      size: size, color: this.mood || PAL.outline, seed: 'nt' + this.bubble
    });
    ctx.restore();
  };

  /* Collision boxes for a room, derived from its props. */
  W.solidsFor = function (name) {
    var props = W.effectiveProps ? W.effectiveProps(name) : W.ROOMS[name].props;
    return props.map(W.propFootprint).filter(Boolean);
  };
})(window.W);
