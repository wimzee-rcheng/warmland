/* Warmland — serving customers.
 *
 * The boba cart at the park and the ice cream shop are the same loop:
 * customers arrive, queue up, ask for something, you hand it over, they pay.
 * One system, two configs.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  W.JOBS = {
    bobaCart: {
      name: 'Boba Cart',
      style: 'line',                // customers queue, Z serves the front
      items: ['boba'],
      pay: 3,
      target: 5,
      onTarget: 'megatron',
      window: [485, 430],           // where the customer stands to be served
      queueFrom: [560, 430], queueStep: [46, 0]
    },
    iceCream: {
      name: 'Ice Cream Counter',
      style: 'fetch',               // fetch the asked flavor, deliver it
      items: ['vanilla', 'chocolate', 'strawberry', 'boba'],
      pay: 4,
      target: 5,
      workZone: { x: 60, y: 158, w: 840, h: 88 },   // behind the counter
      workStart: [255, 226],                        // standable, near the tubs
      window: [565, 300],
      queueFrom: [640, 300], queueStep: [48, 0]
    }
  };

  var J = {
    id: null, cfg: null, room: '', served: 0, armed: false,
    earned: 0, holding: null,
    customers: [], spawnIn: 0, active: false
  };
  W.job = J;

  W.service = {
    start: function (id) {
      var cfg = W.JOBS[id];
      if (!cfg) return;
      J.id = id; J.cfg = cfg;
      J.room = W.game.state.room;
      J.served = 0; J.armed = false;
      J.earned = 0; J.holding = null;
      J.customers = [];
      J.spawnIn = 0.6;
      J.active = true;
      W.game.state.job = id;
      if (cfg.style === 'fetch') {
        // hop behind the counter — at a spot that is actually STANDABLE
        // (the zone centre is inside the counter's own collision box)
        var start = cfg.workStart || [cfg.workZone.x + 40, cfg.workZone.y + 60];
        W.sceneHouse.player.x = start[0];
        W.sceneHouse.player.y = start[1];
        W.say('Shift started! Bring everyone their order.', PAL.sun);
      } else {
        W.say('Open for business! Serve what they ask for.', PAL.sun);
      }
      W.game.first('shift', 'First day on the job!');
      if (W.audio) W.audio.play('ding');
    },

    stop: function (quiet) {
      if (!J.active) return;
      J.active = false;
      W.game.state.job = null;
      J.armed = false;
      J.holding = null;
      J.customers.forEach(function (c) {
        c.actor.mode = 'wander';
        c.actor.data.inQueue = false;
      });
      J.customers = [];
      if (!quiet) {
        W.game.showBanner(J.id === 'iceCream' ? 'SHOP CLOSED' : 'CART PACKED UP',
          J.earned > 0 ? 'Earned ' + J.earned + ' coins today!' : 'See you tomorrow!');
        if (W.audio) W.audio.play('ding');
      }
    },

    room: function () { return J.room; },
    style: function () { return J.cfg ? J.cfg.style : null; },
    holding: function () { return J.holding; },

    /* The behind-the-counter strip during a fetch shift, else null. */
    workZone: function () {
      return (J.active && J.cfg.style === 'fetch') ? J.cfg.workZone : null;
    },

    /* Scoop something up during a fetch shift. */
    pick: function (item) {
      if (!J.active || J.cfg.style !== 'fetch') return;
      if (J.holding === item) { W.say('Already holding it — deliver it!'); return; }
      J.holding = item;
      W.say('Got the ' + W.ITEMS[item].name.toLowerCase() + '. Deliver it!');
      if (W.audio) W.audio.play('pickup');
    },

    /* What the serve prompt should read for the front customer. */
    servePrompt: function (c) {
      if (J.cfg.style !== 'fetch') {
        return { text: 'Serve the ' + W.ITEMS[c.wants].name, locked: false };
      }
      if (!J.holding) return { text: 'They want ' + W.ITEMS[c.wants].name + '!', locked: true };
      if (J.holding !== c.wants) return { text: 'That is not ' + W.ITEMS[c.wants].name + '...', locked: false };
      return { text: 'Serve the ' + W.ITEMS[c.wants].name + '!', locked: false };
    },

    active: function () { return J.active; },

    /* Called every frame by whichever scene is hosting the job. */
    update: function (dt, room, solids, pool) {
      if (!J.active) return;
      var cfg = J.cfg;

      // trickle new customers out of the crowd already in the room
      J.spawnIn -= dt;
      if (J.spawnIn <= 0 && J.customers.length < 4) {
        J.spawnIn = 2.2 + Math.random() * 2.2;
        var free = pool.filter(function (a) {
          return a.isCrowd && !a.data.inQueue;
        });
        if (free.length) {
          var a = free[Math.floor(Math.random() * free.length)];
          a.data.inQueue = true;
          J.customers.push({
            actor: a,
            wants: cfg.items[Math.floor(Math.random() * cfg.items.length)],
            state: 'walking',
            patience: 30
          });
        }
      }

      // walk everyone to their place in line
      for (var i = 0; i < J.customers.length; i++) {
        var c = J.customers[i];
        // a customer wedged behind furniture gives up rather than stalling
        // the whole shift forever
        c.patience -= dt;
        if (c.patience <= 0) {
          c.actor.says('Maybe later!', 2);
          c.actor.data.inQueue = false;
          c.actor.mode = 'wander';
          J.customers.splice(i, 1);
          i--;
          continue;
        }
        var tx = i === 0 ? cfg.window[0] : cfg.queueFrom[0] + (i - 1) * cfg.queueStep[0];
        var ty = i === 0 ? cfg.window[1] : cfg.queueFrom[1] + (i - 1) * cfg.queueStep[1];
        c.actor.mode = 'goto';
        c.actor.data.tx = tx;
        c.actor.data.ty = ty;
        c.actor.data.tol = 7;
        c.actor.data.faceDir = i === 0 ? 'up' : 'left';
        if (i === 0 && Math.hypot(c.actor.x - tx, c.actor.y - ty) < 14) c.state = 'waiting';
      }
    },

    /* Is somebody at the window right now? */
    front: function () {
      return (J.active && J.customers.length && J.customers[0].state === 'waiting')
        ? J.customers[0] : null;
    },

    /* Hand over what the front customer asked for. */
    serve: function () {
      var c = W.service.front();
      if (!c) return false;
      var cfg = J.cfg;

      if (cfg.style === 'fetch') {
        if (!J.holding) { W.say('They asked for ' + W.ITEMS[c.wants].name + ' — go get it!'); return false; }
        if (J.holding !== c.wants) {
          c.actor.says('Ooh, I asked for ' + W.ITEMS[c.wants].name + '!', 2.6);
          if (W.audio) W.audio.play('blip');
          return false;                        // the scoop stays — try the case again
        }
        J.holding = null;
      }

      J.served++;
      J.earned += cfg.pay;
      W.game.addMoney(cfg.pay);
      c.actor.says('Keena Meena!', 2);
      c.actor.data.inQueue = false;
      c.actor.mode = 'wander';
      J.customers.shift();
      W.fx.hearts(c.actor.x, c.actor.y - 100, 4);
      W.fx.sparkle(c.actor.x, c.actor.y - 60, 8, 40);
      if (W.audio) W.audio.play('coin');
      W.game.idea('shift');

      if (cfg.onTarget && !J.armed && J.served >= cfg.target) {
        J.armed = true;
        W.say('Something is coming... press E!', PAL.roof);
        if (W.audio) W.audio.play('ding');
      } else if (!cfg.onTarget && J.served >= cfg.target) {
        // shift complete — bonus, banner, and freedom
        J.earned += 10;
        W.game.addMoney(10);
        W.game.showBanner('SHIFT COMPLETE!', 'Earned ' + J.earned + ' coins — great work!');
        if (W.audio) W.audio.play('win');
        W.service.stop(true);
      } else {
        W.say('Served ' + J.served + ' of ' + cfg.target + '!');
      }
      return true;
    },

    armed: function () { return J.armed; },
    served: function () { return J.served; },
    target: function () { return J.cfg ? J.cfg.target : 0; },

    /* The HUD strip: how many served, and what the front customer wants.
     * Frames are baked; only positions and the pulse are live. */
    draw: function (ctx) {
      if (!J.active) return;
      var cfg = J.cfg;

      if (!J.tiles) {
        var jb = C.offscreen(316, 62);
        C.roundRect(jb.getContext('2d'), 8, 8, 300, 46, 12, {
          seed: 'jb', fill: PAL.white, stroke: PAL.outline, lw: 2.6, hatch: 5, wash: 0.88, fillAlpha: 0.2
        });
        var wb = C.offscreen(68, 60);
        C.roundRect(wb.getContext('2d'), 8, 8, 52, 44, 12, {
          seed: 'wb', fill: PAL.white, stroke: PAL.outline, lw: 2.4, hatch: 5, wash: 0.92, fillAlpha: 0.2
        });
        var ev = C.offscreen(296, 62);
        var eg = ev.getContext('2d');
        C.roundRect(eg, 8, 8, 280, 46, 12, {
          seed: 'ev', fill: PAL.roof, stroke: PAL.outline, lw: 3, hatch: 4, wash: 0.8, fillAlpha: 0.3
        });
        C.text(eg, '!  SPECIAL EVENT  —  E', 148, 38, {
          size: 18, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'evt'
        });
        J.tiles = { jb: jb, wb: wb, ev: ev };
      }

      ctx.drawImage(J.tiles.jb, 322, 4);
      C.textCached(ctx, cfg.name, 346, 32, { size: 15, color: PAL.furDark, seed: 'jn' });
      C.textCached(ctx, 'Served ' + J.served + (cfg.target ? ' / ' + cfg.target : ''), 346, 50, {
        size: 17, color: PAL.outline, seed: 'js'
      });

      var c = W.service.front();
      if (c) {
        W.drawItem(ctx, c.wants, 596, 34, 15);
        ctx.drawImage(J.tiles.wb, c.actor.x - 34, c.actor.y - 160);
        W.drawItem(ctx, c.wants, c.actor.x, c.actor.y - 130, 14);
      }
      if (J.holding) {
        C.textCached(ctx, 'holding:', 336, 74, {
          size: 13, color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'hl'
        });
        W.drawItem(ctx, J.holding, 412, 70, 13);
      }

      if (J.armed) {
        var pulse = 0.5 + 0.5 * Math.sin(W.game.t * 7);
        ctx.save();
        ctx.globalAlpha = 0.55 + pulse * 0.45;
        ctx.drawImage(J.tiles.ev, 652, 4);
        ctx.restore();
      }
    }
  };
})(window.W);
