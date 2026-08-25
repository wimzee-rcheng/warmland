/* Warmland — title card. */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;
  var S = { t: 0, bg: null };

  /* Two heroes, two kids, two saves. The title always asks WHO first —
   * the answer picks the save slot before anything is loaded. */
  var HEROES = [
    { key: 'bobby',      name: 'Bobby Bear', sub: 'Warmland',   room: 'living' },
    { key: 'butterball', name: 'Butterball', sub: 'Warmland 2', room: 'home2' }
  ];

  S.enter = function () {
    S.t = 0;
    S.confirming = false;
    S.stage = 'hero';               // hero -> play
    S.heroSel = 0;
    S.hasSave = false;
    if (!S.bg) {
      var cv = C.offscreen(960, 600);
      var g = cv.getContext('2d');
      g.drawImage(C.paper(960, 600, 'title'), 0, 0);

      // rolling hills along the bottom
      C.ellipse(g, 200, 620, 340, 150, { seed: 'h1', fill: PAL.grass, stroke: null, hatch: 6, wash: 0.42, fillAlpha: 0.35 });
      C.ellipse(g, 700, 640, 400, 170, { seed: 'h2', fill: PAL.grassDk, stroke: null, hatch: 6, wash: 0.4, fillAlpha: 0.3 });
      C.ellipse(g, 470, 660, 320, 140, { seed: 'h3', fill: PAL.grass, stroke: null, hatch: 6, wash: 0.45, fillAlpha: 0.35 });

      W.PROPS.tree.draw(g, 62, 520, 'ttree1');
      W.PROPS.tree.draw(g, 830, 540, 'ttree2');
      W.PROPS.flower.draw(g, 300, 566, 'tf1', PAL.accent);
      W.PROPS.flower.draw(g, 660, 578, 'tf2', PAL.sun);

      for (var i = 0; i < 14; i++) {
        var rnd = W.mulberry32(W.hash('tstar' + i));
        C.star(g, 40 + rnd() * 880, 40 + rnd() * 300, 6 + rnd() * 8, PAL.sun, 'ts' + i);
      }
      // the big lettering never changes — bake it into the backdrop
      C.text(g, 'WARMLAND', 480, 236, {
        size: 92, align: 'center', color: PAL.roof,
        outline: 8, outlineColor: PAL.outline, seed: 'title', shadow: true, wob: 1.6
      });
      C.text(g, 'starring Bobby Bear and Butterball', 480, 278, {
        size: 24, align: 'center', color: PAL.furDark, seed: 'sub2'
      });
      S.bg = cv;
    }
    S.warmed = false;
  };

  S.update = function (dt) {
    S.t += dt;
    // Bake Bobby's poses behind the title card, one per frame, so walking
    // never hitches and the title itself never stalls.
    if (!S.warmed) {
      S.warmed = true;
      // Only what the opening minutes actually need: the current suit and the
      // park cast. Other suits warm on demand when picked in the closet.
      W.warmChar('bobby', null, 'none', 4);
      W.warmChar('butterball', null, 'none', 4);
      ['panda', 'yuna', 'butterball'].forEach(function (c) { W.warmChar(c, null, 'none', 4); });
      ['critterA', 'critterB', 'critterC'].forEach(function (k) {
        var f = W.FRIENDS[k];
        if (f) W.warmChar(f.char, f.tint || null, 'none', 4);
      });
    }
    // small budget: the title must stay smooth while it bakes
    var wb = performance.now() + 5;
    if (W.warmStep()) while (performance.now() + W.warmAvg() < wb + 8 && W.warmStep()) { /* next */ }

    // ---- who are we playing?
    if (S.stage === 'hero') {
      if (W.input.hit('left'))  S.heroSel = (S.heroSel + HEROES.length - 1) % HEROES.length;
      if (W.input.hit('right')) S.heroSel = (S.heroSel + 1) % HEROES.length;
      if (S.t > 0.3 && (W.input.hit('act') || W.input.hit('up') || W.input.hit('down'))) {
        var pick = HEROES[S.heroSel];
        if (W.save && W.save.setHero) W.save.setHero(pick.key);
        W.game.state = W.game.freshState(pick.key);
        S.hero = pick;
        S.hasSave = !!(W.save && W.save.has());
        S.stage = 'play';
        if (W.audio) W.audio.play('ding');
        W.warmChar(pick.key, null, 'none', 4);
      }
      return;
    }

    if (W.input.hit('back') && !S.hasSave) {
      // no save for this hero: X goes back to the hero cards
      S.stage = 'hero';
      return;
    }
    if (S.hasSave && W.input.hit('back')) {
      W.save.load();
      W.game.saveOk = true;
      W.game.fadeTo('house', { room: W.game.state.room });
      return;
    }

    // Starting over while a save exists asks first — an arrow-mashing kid
    // must not be able to wipe their game from the title screen.
    if (S.confirming) {
      if (W.input.hit('act')) {
        W.game.state = W.game.freshState(S.hero.key);
        W.game.saveOk = true;
        W.game.fadeTo('house', { room: S.hero.room });
      } else if (W.input.hit('back') || W.input.hit('left') || W.input.hit('right') ||
                 W.input.hit('up') || W.input.hit('down')) {
        S.confirming = false;
      }
      return;
    }
    W.fx.update(dt);
    if (W.input.hit('love')) { W.fx.hearts(480, 400, 10); }
    if (S.t > 0.4 && (W.input.hit('up') || W.input.hit('down') ||
        W.input.hit('left') || W.input.hit('right') || W.input.hit('act'))) {
      if (S.hasSave) { S.confirming = true; return; }
      W.game.saveOk = true;
      W.game.fadeTo('house', { room: S.hero.room });
    }
  };

  S.draw = function (ctx) {
    ctx.drawImage(S.bg, 0, 0);

    // a UFO drifting across the sky
    var ux = 120 + ((S.t * 42) % 1180) - 110;
    if (ux > 1070) ux -= 1180;
    ctx.save();
    ctx.globalAlpha = 0.9;
    W.drawUFO(ctx, ux, 120 + Math.sin(S.t) * 14, 0.55, 'titleufo', S.t);
    ctx.restore();

    if (S.stage === 'hero') {
      C.textCached(ctx, 'who is playing?', 480, 330, {
        size: 28, align: 'center', color: PAL.outline,
        outline: 3.5, outlineColor: PAL.white, seed: 'whoq'
      });
      for (var h = 0; h < HEROES.length; h++) {
        var cx = 300 + h * 360, on = h === S.heroSel;
        var pop = on ? 1 + 0.05 * Math.sin(S.t * 4) : 1;
        C.roundRect(ctx, cx - 120, 352, 240, 200, 18, {
          seed: 'hc' + h + (on ? 'a' : 'b'),
          fill: on ? PAL.white : '#C9C0B0', stroke: on ? PAL.sun : PAL.outline,
          lw: on ? 6 : 3, hatch: 5, wash: 0.9, fillAlpha: on ? 0.35 : 0.5
        });
        W.drawChar(ctx, cx, 534, {
          char: HEROES[h].key, dir: 'down', t: S.t,
          moving: on, hopT: (S.t / 0.7) % 1, scale: 0.92 * pop
        });
        C.textCached(ctx, HEROES[h].name, cx, 378, {
          size: 22, align: 'center', color: PAL.outline, seed: 'hn' + h
        });
        C.textCached(ctx, HEROES[h].sub, cx, 400, {
          size: 15, align: 'center', color: PAL.woodDk, seed: 'hs' + h
        });
        if (on && W.keyChip) ctx.drawImage(W.keyChip('Z'), cx + 82, 360, 30, 26);
      }
      C.textCached(ctx, 'arrows choose  ·  Z start', 480, 578, {
        size: 18, align: 'center', color: PAL.outline,
        outline: 3, outlineColor: PAL.white, seed: 'hpick'
      });
      W.fx.draw(ctx);
      return;
    }

    W.drawChar(ctx, 480, 500, {
      char: S.hero ? S.hero.key : 'bobby',
      dir: 'down', t: S.t, moving: true, hopT: (S.t / 0.7) % 1, scale: 1.5
    });

    var pulse = 0.6 + 0.4 * Math.sin(S.t * 3);
    ctx.save();
    ctx.globalAlpha = pulse;
    var line = S.confirming ? 'start over?   Z = yes   ·   X = keep my game'
             : S.hasSave     ? 'X = continue my game   ·   arrow key = start over'
                             : 'press an arrow key to play   ·   X = pick someone else';
    C.textCached(ctx, line, 480, 546, {
      size: 22, align: 'center', color: S.confirming ? PAL.roof : PAL.outline,
      outline: 3.5, outlineColor: PAL.white, seed: 'press' + (S.confirming ? 'c' : S.hasSave ? 's' : '')
    });
    ctx.restore();

    if (!S.heartT) {
      S.heartT = C.offscreen(56, 56);
      C.heart(S.heartT.getContext('2d'), 28, 28, 22, PAL.accent, 'tkm');
    }
    ctx.drawImage(S.heartT, 18, 544);
    C.textCached(ctx, 'Keena Meena  =  I love you', 72, 580, {
      size: 17, color: PAL.accent, outline: 3, outlineColor: PAL.white, seed: 'km'
    });

    W.fx.draw(ctx);
  };

  W.sceneTitle = S;
})(window.W);
