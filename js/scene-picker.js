/* Warmland — a generic "choose a thing" overlay.
 *
 * Used by the fridge, the kitchen cabinets and the ice cream case. Give it
 * a title and a list of item ids; picking one drops it in the basket.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var S = { opaque: true, sel: 0, t: 0, title: '', items: [], bg: null };

  /* The card frames were crayon-filled every frame on top of a full room
   * draw; bake selected/unselected per cell size once. */
  var cardTiles = {};
  function card(cell, on) {
    var key = cell + '|' + (on ? 1 : 0);
    if (!cardTiles[key]) {
      var cv = C.offscreen(cell + 20, cell + 20);
      C.roundRect(cv.getContext('2d'), 10, 10, cell, cell, 16, {
        seed: 'pc' + key, fill: on ? PAL.white : '#4B5C4B',
        stroke: on ? PAL.sun : PAL.outline, lw: on ? 5 : 3,
        hatch: 5, wash: on ? 0.8 : 0.6, fillAlpha: on ? 0.25 : 0.4
      });
      cardTiles[key] = cv;
    }
    return cardTiles[key];
  }

  var helpTile = null;

  S.enter = function (p) {
    p = p || {};
    S.sel = 0;
    S.t = 0;
    S.title = p.title || 'Choose';
    S.items = p.items || [];
    if (!S.bg) S.bg = C.paper(960, 600, 'pickbg', '#2E3B2E');
    if (!helpTile) {
      helpTile = C.offscreen(480, 62);
      var hg = helpTile.getContext('2d');
      C.roundRect(hg, 10, 8, 460, 44, 14, {
        seed: 'ph', fill: '#1E2A1E', stroke: PAL.sun, lw: 2.6, hatch: 5, wash: 0.6, fillAlpha: 0.3
      });
      C.text(hg, '← →  choose      Z  take      X  close', 240, 37, {
        size: 18, align: 'center', color: PAL.white, seed: 'phh'
      });
    }
  };

  S.update = function (dt) {
    S.t += dt;
    W.dialogue.update(dt);
    W.fx.update(dt);

    if (W.input.hit('left'))  S.sel = (S.sel + S.items.length - 1) % S.items.length;
    if (W.input.hit('right')) S.sel = (S.sel + 1) % S.items.length;
    if (W.input.hit('back'))  { W.game.popOverlay(); return; }

    if (W.input.hit('act')) {
      var id = S.items[S.sel];
      if (W.basket.full()) {
        W.say('The basket is full! Four things at a time.');
        return;
      }
      W.basket.add(id);
      W.say('Got the ' + W.ITEMS[id].name.toLowerCase() + '.');
      if (W.basket.full()) W.game.popOverlay();
    }
  };

  S.draw = function (ctx) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(S.bg, 0, 0);
    ctx.restore();

    C.textCached(ctx, S.title, 480, 88, {
      size: 40, align: 'center', color: PAL.sun, outline: 5, outlineColor: PAL.outline, seed: 'pt' + S.title
    });

    var n = S.items.length;
    // cell shrinks if a container ever holds more than six things
    var gap = 16;
    var cell = Math.min(132, Math.floor((920 - (n - 1) * gap) / Math.max(1, n)));
    var total = n * cell + (n - 1) * gap;
    var x0 = 480 - total / 2;

    for (var i = 0; i < n; i++) {
      var id = S.items[i];
      var x = x0 + i * (cell + gap);
      var on = i === S.sel;
      var lift = on ? Math.sin(S.t * 3) * 5 : 0;

      ctx.drawImage(card(cell, on), x - 10, 160 + lift);
      W.drawItem(ctx, id, x + cell / 2, 170 + lift + cell / 2 - 6, 30);
      C.textCached(ctx, W.ITEMS[id].name, x + cell / 2, 170 + lift + cell - 14, {
        size: 15, align: 'center', color: on ? PAL.outline : '#CFE0CF', seed: 'pn' + id
      });
    }

    // what's already in the basket
    C.textCached(ctx, 'Basket ' + W.basket.count() + ' / ' + W.BASKET_MAX, 480, 372, {
      size: 20, align: 'center', color: W.basket.full() ? PAL.roof : PAL.white, seed: 'bc'
    });
    W.drawBasketBar(ctx);

    ctx.drawImage(helpTile, 240, 452);

    W.dialogue.draw(ctx, 480, 440);
    W.fx.draw(ctx);
  };

  W.scenePicker = S;
})(window.W);
