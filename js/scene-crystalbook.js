/* Warmland — Bobby's treasure book.
 *
 * One card per crystal variety: found ones in full colour with a count,
 * unfound ones as mysterious ??? silhouettes. Opened at the trophy case.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;
  var S = { opaque: true, t: 0, bg: null };

  function card(ctx) {
    var st = W.game.state;
    C.text(ctx, "BOBBY'S TREASURE BOOK", 480, 76, {
      size: 36, align: 'center', color: PAL.sun, outline: 5, outlineColor: PAL.outline, seed: 'cbt'
    });
    W.CRYSTAL_ORDER.forEach(function (key, i) {
      var cry = W.CRYSTALS[key];
      var have = st.crystalsFound[key] || 0;
      var x = 140 + (i % 3) * 240, y = 160 + Math.floor(i / 3) * 190;
      C.roundRect(ctx, x, y, 200, 160, 16, {
        seed: 'cbc' + i, fill: have ? PAL.white : '#4A4258', stroke: have ? cry.color : PAL.outline,
        lw: have ? 5 : 3, hatch: 5, wash: have ? 0.85 : 0.6, fillAlpha: have ? 0.25 : 0.4
      });
      var cx = x + 100, cy = y + 70;
      if (have) {
        C.poly(ctx, [[cx, cy - 34], [cx + 22, cy - 7], [cx + 13, cy + 25], [cx - 13, cy + 25], [cx - 22, cy - 7]], {
          seed: 'cbg' + i, fill: cry.color, stroke: PAL.outline, lw: 3, hatch: 2.8, wash: 0.85
        });
        C.poly(ctx, [[cx, cy - 34], [cx + 22, cy - 7], [cx, cy + 2]], {
          seed: 'cbh' + i, fill: cry.hi, stroke: null, hatch: 2.4, wash: 0.9
        });
        C.text(ctx, cry.name, cx, y + 128, { size: 18, align: 'center', color: PAL.outline, seed: 'cbn' + i });
        C.text(ctx, 'found ' + have, cx, y + 148, { size: 13, align: 'center', color: PAL.woodDk, seed: 'cbf' + i + have });
      } else {
        C.poly(ctx, [[cx, cy - 34], [cx + 22, cy - 7], [cx + 13, cy + 25], [cx - 13, cy + 25], [cx - 22, cy - 7]], {
          seed: 'cbq' + i, stroke: '#8A7A9A', lw: 2.4, wob: 1.6, passes: 1
        });
        C.text(ctx, '?', cx, cy + 8, { size: 30, align: 'center', color: '#8A7A9A', seed: 'cbqm' + i });
        C.text(ctx, '???', cx, y + 128, { size: 18, align: 'center', color: '#8A7A9A', seed: 'cbn' + i });
      }
    });
    C.text(ctx, 'X  close the book', 480, 578, {
      size: 16, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'cbx'
    });
  }

  S.enter = function () {
    S.t = 0;
    if (!S.bg) S.bg = C.paper(960, 600, 'cbbg', '#3A3048');
    // the card content depends on live counts — rebake per open
    S.card = C.offscreen(960, 600);
    card(S.card.getContext('2d'));
  };

  S.update = function (dt) {
    S.t += dt;
    if (W.input.hit('back') || W.input.hit('act')) W.game.popOverlay();
  };

  S.draw = function (ctx) {
    ctx.drawImage(S.bg, 0, 0);
    ctx.drawImage(S.card, 0, 0);
  };

  W.sceneCrystalBook = S;
})(window.W);
