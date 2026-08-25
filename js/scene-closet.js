/* Warmland — the magic closet.
 *
 * Runs as an overlay on top of whatever room Bobby is standing in. A suit is
 * just data (see W.SUITS in bobby.js), so wearing one is a single assignment;
 * the locked slots are where the racer and the mech will drop in.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var SLOTS = null;   // built on first enter — avoids a parse-time dependency
  function buildSlots() {
    return W.SUIT_ORDER.map(function (k) {
      return { key: k, label: W.suitShort(k), unlocks: W.suitUnlocks(k) };
    });
  }

  /* The four cards were being crayon-filled every frame (~17ms). Bake the
   * selected and unselected states once; the hover bounce is just a translate. */
  var cardTiles = {};
  function card(on) {
    if (cardTiles[on]) return cardTiles[on];
    var cv = C.offscreen(172, 270);
    var g = cv.getContext('2d');
    C.roundRect(g, 8, 10, 156, 250, 16, {
      seed: 'card' + on, fill: on ? PAL.white : '#6B5480',
      stroke: on ? PAL.sun : PAL.outline, lw: on ? 5 : 3,
      hatch: 5, wash: on ? 0.72 : 0.55, fillAlpha: on ? 0.28 : 0.4
    });
    cardTiles[on] = cv;
    return cv;
  }

  var S = { opaque: true, sel: 0, t: 0, spin: 0, closing: 0, bg: null };

  S.enter = function () {
    SLOTS = buildSlots();          // names follow whoever is playing
    S.t = 0; S.spin = 0; S.closing = 0;
    // start on whatever Bobby is currently wearing
    for (var i = 0; i < SLOTS.length; i++) {
      if (SLOTS[i].key === W.game.state.suit) S.sel = i;
    }
    if (!S.bg) S.bg = C.paper(960, 600, 'closetbg', '#3C2A46');
  };

  S.update = function (dt) {
    S.t += dt;
    W.dialogue.update(dt);
    W.fx.update(dt);

    if (S.spin > 0) {
      S.spin -= dt;
      if (S.spin <= 0) { S.spin = 0; W.game.popOverlay(); }
      return;
    }

    if (W.input.hit('left'))  S.sel = (S.sel + SLOTS.length - 1) % SLOTS.length;
    if (W.input.hit('right')) S.sel = (S.sel + 1) % SLOTS.length;
    if (W.input.hit('back'))  { W.game.popOverlay(); return; }

    if (W.input.hit('act')) {
      var slot = SLOTS[S.sel];
      W.game.state.suit = slot.key;
      if (slot.key !== 'mech') W.game.state.mechForm = 'robot';
      W.warmChar('bobby', null, slot.key, 4);
      W.fx.sparkle(480, 330, 26, 130);
      W.fx.hearts(480, 300, 6);
      W.say('Keena Meena!', PAL.accent);
      S.spin = 0.9;
    }
  };

  S.draw = function (ctx) {
    // dim the room behind
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(S.bg, 0, 0);
    ctx.restore();

    C.textCached(ctx, 'THE MAGIC CLOSET', 480, 74, {
      size: 40, align: 'center', color: PAL.sun, outline: 5, outlineColor: PAL.outline, seed: 'ct'
    });

    // hanging rail + hooks, baked once
    if (!S.railTile) {
      S.railTile = C.offscreen(960, 60);
      var rg = S.railTile.getContext('2d');
      C.line(rg, 60, 30, 900, 30, { seed: 'rail', stroke: PAL.steel, lw: 6, wob: 1.4 });
      for (var hk = 0; hk < 5; hk++) {
        C.line(rg, 118 + hk * 182, 30, 118 + hk * 182, 58, { seed: 'hk' + hk, stroke: PAL.steel, lw: 3.4, wob: 0.9 });
      }
    }
    ctx.drawImage(S.railTile, 0, 102);

    for (var i = 0; i < SLOTS.length; i++) {
      var slot = SLOTS[i];
      var cx = 118 + i * 182;
      var on = i === S.sel;
      var lift = on ? Math.sin(S.t * 3) * 4 : 0;

      ctx.drawImage(card(on), cx - 86, 158 + lift);

      W.drawChar(ctx, cx, 344 + lift, { char: W.heroChar(), dir: 'down', suit: slot.key, t: S.t, scale: 0.74 });

      C.textCached(ctx, slot.label, cx, 378 + lift, {
        size: 18, align: 'center', color: PAL.outline, seed: 'sl' + i
      });
      // the unlock captions can be long — wrap them inside the card
      if (!slot.unlockLines) {
        var words = slot.unlocks.split(' ');
        var lines = [], cur = '';
        words.forEach(function (wd) {
          var test = cur ? cur + ' ' + wd : wd;
          if (C.textWidth(ctx, test, 13) > 138 && cur) { lines.push(cur); cur = wd; }
          else cur = test;
        });
        if (cur) lines.push(cur);
        slot.unlockLines = lines.slice(0, 2);
      }
      for (var ul = 0; ul < slot.unlockLines.length; ul++) {
        C.textCached(ctx, slot.unlockLines[ul], cx, 396 + lift + ul * 15, {
          size: 13, align: 'center', color: on ? PAL.outline : '#D8CCEA',
          seed: 'un' + i + ul + (on ? 'a' : 'b')
        });
      }

      if (on) {
        if (!S.starT) {
          S.starT = C.offscreen(22, 22);
          C.star(S.starT.getContext('2d'), 11, 11, 8, PAL.sun, 'sk');
        }
        for (var k = 0; k < 3; k++) {
          ctx.drawImage(S.starT, cx - 91 + k * 80, 145 + lift);
        }
      }
    }

    // the suit Bobby is actually wearing right now
    C.textCached(ctx, 'Wearing: ' + W.suitName(W.game.state.suit), 480, 462, {
      size: 20, align: 'center', color: PAL.white, seed: 'wr'
    });
    C.textCached(ctx, W.suitBlurb(W.game.state.suit), 480, 490, {
      size: 16, align: 'center', color: '#C7B4D6', seed: 'bl'
    });

    if (!S.helpTile) {
      S.helpTile = C.offscreen(480, 66);
      var hg = S.helpTile.getContext('2d');
      C.roundRect(hg, 10, 8, 460, 48, 14, {
        seed: 'help', fill: '#2A1B33', stroke: PAL.sun, lw: 2.6, hatch: 5, wash: 0.6, fillAlpha: 0.3
      });
      C.text(hg, '← →  choose      Z  wear it      X  close', 240, 40, {
        size: 18, align: 'center', color: PAL.white, seed: 'hlp'
      });
    }
    ctx.drawImage(S.helpTile, 240, 512);

    W.fx.draw(ctx);
    W.dialogue.draw(ctx, 480, 250);
  };

  W.sceneCloset = S;
})(window.W);
