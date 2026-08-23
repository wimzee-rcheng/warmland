/* Warmland — Bobby's treasure book.
 *
 * One card per crystal variety: found ones in full colour with a count,
 * unfound ones as mysterious ??? silhouettes. Opened at the trophy case.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;
  var S = { opaque: true, t: 0, bg: null, page: 0 };

  /* The second page: seashells from the lake floor. */
  W.SHELL_KINDS = {
    scallop:    { name: 'Scallop',   color: '#F2C9D8' },
    conch:      { name: 'Conch',     color: '#F5D9A8' },
    starshell:  { name: 'Starshell', color: '#B8CAE8' },
    pearlshell: { name: 'Pearl Shell', color: '#E8EFE4' }
  };
  var SHELL_ORDER = ['scallop', 'conch', 'starshell', 'pearlshell'];

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
    C.text(ctx, 'X  close  ·  arrows turn the page', 480, 578, {
      size: 16, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'cbx2'
    });
  }

  function shellPage(ctx) {
    var st = W.game.state;
    C.text(ctx, 'SEASHELL COLLECTION', 480, 76, {
      size: 34, align: 'center', color: '#F2C9D8', outline: 5, outlineColor: PAL.outline, seed: 'sbt'
    });
    SHELL_ORDER.forEach(function (key, i) {
      var sp = W.SHELL_KINDS[key];
      var have = (st.shellsFound || {})[key] || 0;
      var x = 130 + (i % 2) * 400, y = 160 + Math.floor(i / 2) * 190;
      C.roundRect(ctx, x, y, 300, 160, 16, {
        seed: 'sbc' + i, fill: have ? PAL.white : '#4A4258', stroke: have ? sp.color : PAL.outline,
        lw: have ? 5 : 3, hatch: 5, wash: have ? 0.85 : 0.6, fillAlpha: have ? 0.25 : 0.4
      });
      var cx = x + 150, cy = y + 66;
      if (have) {
        C.arc(ctx, cx, cy + 14, 30, Math.PI, Math.PI * 2, {
          seed: 'sbs' + i, fill: sp.color, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.85
        });
        for (var r = -2; r <= 2; r++) {
          C.line(ctx, cx, cy + 14, cx + r * 11, cy - 12, {
            seed: 'sbr' + i + r, stroke: PAL.outline, lw: 1.8, wob: 0.6, passes: 1
          });
        }
        C.text(ctx, sp.name, cx, y + 122, { size: 20, align: 'center', color: PAL.outline, seed: 'sbn' + i });
        C.text(ctx, 'found ' + have, cx, y + 145, { size: 13, align: 'center', color: PAL.woodDk, seed: 'sbf' + i + have });
      } else {
        C.arc(ctx, cx, cy + 14, 30, Math.PI, Math.PI * 2, {
          seed: 'sbq' + i, stroke: '#8A7A9A', lw: 2.4, wob: 1.6, passes: 1
        });
        C.text(ctx, '?', cx, cy + 6, { size: 30, align: 'center', color: '#8A7A9A', seed: 'sbqm' + i });
        C.text(ctx, '???', cx, y + 122, { size: 20, align: 'center', color: '#8A7A9A', seed: 'sbn' + i });
      }
    });
    C.text(ctx, 'X  close  ·  arrows turn the page', 480, 578, {
      size: 16, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'sbx'
    });
  }

  function bake() {
    // the card content depends on live counts — rebake per open and per turn
    S.card = C.offscreen(960, 600);
    (S.page ? shellPage : card)(S.card.getContext('2d'));
  }

  S.enter = function () {
    S.t = 0;
    S.page = 0;
    if (!S.bg) S.bg = C.paper(960, 600, 'cbbg', '#3A3048');
    bake();
  };

  S.update = function (dt) {
    S.t += dt;
    if (W.input.hit('left') || W.input.hit('right') ||
        W.input.hit('up') || W.input.hit('down')) {
      S.page = S.page ? 0 : 1;
      bake();
      if (W.audio) W.audio.play('click');
      return;
    }
    if (W.input.hit('back') || W.input.hit('act')) W.game.popOverlay();
  };

  S.draw = function (ctx) {
    ctx.drawImage(S.bg, 0, 0);
    ctx.drawImage(S.card, 0, 0);
  };

  W.sceneCrystalBook = S;
})(window.W);
