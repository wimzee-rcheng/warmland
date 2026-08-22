/* Warmland — the recipe book overlay.
 *
 * One card per recipe: what goes in, what comes out. Opened from the kitchen
 * poster or with X at the stove, so nobody has to guess at combinations.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;
  var S = { opaque: true, t: 0, bg: null, card: null };

  S.enter = function () {
    S.t = 0;
    if (!S.bg) S.bg = C.paper(960, 600, 'recipebg', '#3D3226');
    if (!S.card) {
      var cv = C.offscreen(960, 600);
      var g = cv.getContext('2d');
      C.text(g, 'BOBBY\u2019S RECIPE BOOK', 480, 76, {
        size: 38, align: 'center', color: PAL.sun, outline: 5, outlineColor: PAL.outline, seed: 'rt'
      });
      W.RECIPES.forEach(function (r, i) {
        var y = 128 + i * 84;
        C.roundRect(g, 90, y, 780, 70, 14, {
          seed: 'rc' + i, fill: PAL.white, stroke: PAL.outline, lw: 3,
          hatch: 5, wash: 0.9, fillAlpha: 0.2
        });
        W.drawItem(g, W.recipeDish(r), 140, y + 35, 20);
        C.text(g, r.name, 180, y + 43, { size: 22, color: PAL.outline, seed: 'rn' + i });
        C.text(g, '=', 420, y + 43, { size: 24, color: PAL.woodDk, seed: 'req' + i });
        r.needs.forEach(function (n, k) {
          W.drawItem(g, n, 480 + k * 74, y + 35, 17);
        });
      });
      C.text(g, 'X  close the book', 480, 578, {
        size: 18, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'rcl'
      });
      S.card = cv;
    }
  };

  S.update = function (dt) {
    S.t += dt;
    if (W.input.hit('back') || W.input.hit('act')) W.game.popOverlay();
  };

  S.draw = function (ctx) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(S.bg, 0, 0);
    ctx.restore();
    ctx.drawImage(S.card, 0, 0);
  };

  W.sceneRecipes = S;
})(window.W);
