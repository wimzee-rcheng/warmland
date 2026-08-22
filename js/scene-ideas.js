/* Warmland — the ideas board.
 *
 * Today's three gentle goals with big tick-boxes, a sticker for every day
 * they were all finished, and the meals-cooked count. The wake banner only
 * flashes the ideas; this is where they actually live.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;
  var S = { opaque: true, t: 0, bg: null };

  S.enter = function () {
    S.t = 0;
    if (!S.bg) S.bg = C.paper(960, 600, 'ibbg', '#4A3A28');
    S.card = C.offscreen(960, 600);
    var g = S.card.getContext('2d');
    var st = W.game.state;

    C.roundRect(g, 160, 60, 640, 470, 18, {
      seed: 'ibc', fill: '#C79A5E', stroke: '#8A5F38', lw: 6, hatch: 4, wash: 0.85
    });
    C.text(g, "TODAY'S IDEAS", 480, 116, {
      size: 34, align: 'center', color: '#5A3A10', seed: 'ibt'
    });
    C.text(g, 'Day ' + st.day + '  ·  ' + st.weather, 480, 146, {
      size: 16, align: 'center', color: '#7A5A2A', seed: 'ibd' + st.day + st.weather
    });

    var I = st.ideas;
    (I && I.list ? I.list : []).forEach(function (idea, i) {
      var y = 186 + i * 62;
      var done = I.done[idea.id];
      C.roundRect(g, 210, y, 34, 34, 8, {
        seed: 'ibb' + i, fill: PAL.white, stroke: PAL.outline, lw: 3, hatch: 3, wash: 0.9, fillAlpha: 0.2
      });
      if (done) {
        C.line(g, 217, y + 17, 226, y + 27, { seed: 'ibk' + i, stroke: PAL.grassDk, lw: 4, wob: 0.6 });
        C.line(g, 226, y + 27, 240, y + 7, { seed: 'ibk2' + i, stroke: PAL.grassDk, lw: 4, wob: 0.6 });
      }
      C.text(g, idea.text, 262, y + 25, {
        size: 21, color: done ? '#7A5A2A' : '#3B2A20', seed: 'ibi' + i + (done ? 'd' : '')
      });
    });

    // the sticker wall
    C.text(g, 'STICKERS', 300, 412, { size: 16, color: '#5A3A10', seed: 'ibs' });
    var n = Math.min(st.ideaStickers, 12);
    for (var s2 = 0; s2 < n; s2++) {
      C.star(g, 240 + (s2 % 6) * 42, 442 + Math.floor(s2 / 6) * 40, 13, s2 % 2 ? PAL.sun : PAL.accent, 'ibst' + s2);
    }
    if (!n) C.text(g, 'finish all 3 ideas in one day!', 380, 448, {
      size: 13, color: '#8A6A3A', seed: 'ibhint'
    });
    C.text(g, 'meals cooked: ' + (st.meals || 0), 620, 412, {
      size: 15, color: '#5A3A10', seed: 'ibm' + (st.meals || 0)
    });

    C.text(g, 'X  back to bed-jumping', 480, 578, {
      size: 16, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'ibx'
    });
  };

  S.update = function (dt) {
    S.t += dt;
    if (W.input.hit('back') || W.input.hit('act')) W.game.popOverlay();
  };

  S.draw = function (ctx) {
    ctx.drawImage(S.bg, 0, 0);
    ctx.drawImage(S.card, 0, 0);
  };

  W.sceneIdeas = S;
})(window.W);
