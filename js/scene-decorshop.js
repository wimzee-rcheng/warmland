/* Warmland — the decor catalog.
 *
 * Pick a piece, pick a room, and it appears at that room's next free decor
 * spot. Rooms merge state.decor into their props, so a purchase is data.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var CATALOG = [
    { kind: 'plant',    name: 'Leafy Plant', cost: 5 },
    { kind: 'rugRound', name: 'Round Rug',   cost: 8 },
    { kind: 'lamp',     name: 'Tall Lamp',   cost: 10 },
    { kind: 'beanbag',  name: 'Beanbag',     cost: 8, tint: '#6FC46F' },
    { kind: 'flower',   name: 'Flower Pot',  cost: 3, tint: '#E8A0B4' },
    { kind: 'nightlight', name: 'Nightlight', cost: 4 }
  ];
  var ROOM_CHOICES = ['living', 'bedroom', 'treehouse'];

  var S = { opaque: true, t: 0, sel: 0, roomSel: 0, stagePick: 'item', bg: null };

  S.enter = function () {
    S.t = 0; S.sel = 0; S.roomSel = 0; S.stagePick = 'item';
    if (!S.bg) S.bg = C.paper(960, 600, 'dsbg', '#3A2E28');
  };

  function spotsLeft(room) {
    var spots = (W.ROOMS[room].decorSpots || []).length;
    var used = (W.game.state.decor[room] || []).length;
    return spots - used;
  }

  S.update = function (dt) {
    S.t += dt;
    W.dialogue.update(dt);
    if (W.input.hit('back')) {
      if (S.stagePick === 'room') { S.stagePick = 'item'; return; }
      W.game.popOverlay();
      return;
    }
    var n = S.stagePick === 'item' ? CATALOG.length : ROOM_CHOICES.length;
    if (W.input.hit('left'))  { if (S.stagePick === 'item') S.sel = (S.sel + n - 1) % n; else S.roomSel = (S.roomSel + n - 1) % n; }
    if (W.input.hit('right')) { if (S.stagePick === 'item') S.sel = (S.sel + 1) % n; else S.roomSel = (S.roomSel + 1) % n; }

    if (W.input.hit('act')) {
      if (W.dialogue.skip()) return;
      if (S.stagePick === 'item') {
        var it = CATALOG[S.sel];
        if (W.game.state.money < it.cost) { W.say('That needs ' + it.cost + ' coins!'); return; }
        S.stagePick = 'room';
      } else {
        var room = ROOM_CHOICES[S.roomSel];
        if (spotsLeft(room) <= 0) { W.say('That room is full of nice things already!'); return; }
        var buy = CATALOG[S.sel];
        W.game.state.money -= buy.cost;
        if (!W.game.state.decor[room]) W.game.state.decor[room] = [];
        W.game.state.decor[room].push({ kind: buy.kind, tint: buy.tint || null });
        W.requestRebuild(room);
        W.game.showBanner('NEW DECOR!', buy.name + ' for the ' + W.ROOMS[room].name + '!');
        if (W.audio) W.audio.play('coin');
        S.stagePick = 'item';
      }
    }
  };

  S.draw = function (ctx) {
    ctx.drawImage(S.bg, 0, 0);
    C.textCached(ctx, 'DECOR CATALOG', 480, 76, {
      size: 36, align: 'center', color: PAL.sun, outline: 5, outlineColor: PAL.outline, seed: 'dst'
    });

    for (var i = 0; i < CATALOG.length; i++) {
      var it = CATALOG[i];
      var x = 100 + (i % 3) * 260, y = 120 + Math.floor(i / 3) * 180;
      var on = S.stagePick === 'item' && i === S.sel;
      C.roundRect(ctx, x, y, 220, 150, 14, {
        seed: 'dsc' + i + (on ? 'a' : 'b'), fill: on ? PAL.white : '#5A4A3E',
        stroke: on ? PAL.sun : PAL.outline, lw: on ? 5 : 3,
        hatch: 5, wash: on ? 0.85 : 0.6, fillAlpha: on ? 0.25 : 0.4
      });
      C.textCached(ctx, it.name, x + 110, y + 110, {
        size: 17, align: 'center', color: on ? PAL.outline : '#D8CCC0', seed: 'dsn' + i
      });
      C.textCached(ctx, it.cost + ' coins', x + 110, y + 134, {
        size: 14, align: 'center', color: on ? PAL.woodDk : '#B9A896', seed: 'dsp' + i
      });
      // a tiny preview of the actual prop
      ctx.save();
      ctx.translate(x + 110, y + 66);
      ctx.scale(0.55, 0.55);
      W.PROPS[it.kind].draw(ctx, -W.PROPS[it.kind].w / 2, -10, 'prev' + i, it.tint);
      ctx.restore();
    }

    if (S.stagePick === 'room') {
      C.roundRect(ctx, 230, 200, 500, 200, 18, {
        seed: 'dsr', fill: PAL.white, stroke: PAL.sun, lw: 5, hatch: 5, wash: 0.94, fillAlpha: 0.2
      });
      C.textCached(ctx, 'Put it where?', 480, 246, {
        size: 24, align: 'center', color: PAL.outline, seed: 'dsq'
      });
      for (var r = 0; r < ROOM_CHOICES.length; r++) {
        var rn = W.ROOMS[ROOM_CHOICES[r]].name;
        var free = spotsLeft(ROOM_CHOICES[r]);
        var ron = r === S.roomSel;
        C.textCached(ctx, (ron ? '\u25b6 ' : '') + rn + '  (' + free + ' spots)', 480, 290 + r * 32, {
          size: 19, align: 'center', color: ron ? PAL.roof : PAL.woodDk,
          seed: 'dsr' + r + (ron ? 'a' : 'b') + free
        });
      }
    }

    C.textCached(ctx, '\u2190 \u2192 choose  ·  Z buy  ·  X back', 480, 578, {
      size: 16, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'dsx'
    });
    W.dialogue.draw(ctx, 480, 480);
  };

  W.sceneDecorShop = S;
})(window.W);
