/* Warmland — interactive furniture.
 *
 * A station is a zone you stand in plus a little state machine. Room data says
 * where they are; this file says what they do. Ability gates live here too, so
 * the kitchen never has to know the word "chef" — it asks for 'cook'.
 *
 * Persistent state lives in game.state.stations keyed by room:kind:index, so a
 * pot left simmering is still simmering when you come back.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  function G() { return W.game; }
  function say(t, c) { W.say(t, c); }

  /* One baked plate ellipse, blitted wherever plates stack or tables set. */
  var plateTile = null;
  function plate(ctx, x, y) {
    if (!plateTile) {
      plateTile = W.crayon.offscreen(36, 18);
      C.ellipse(plateTile.getContext('2d'), 18, 9, 15, 7, {
        seed: 'pl8', fill: PAL.white, stroke: PAL.outline, lw: 2, hatch: 2.6, wash: 0.9, fillAlpha: 0.2
      });
    }
    ctx.drawImage(plateTile, x - 18, y - 9);
  }

  /* Shared helper: a labelled progress bar — the baked health-bar pattern
   * (frame + fill tiles, live rect-clip reveal) instead of live crayon. */
  function bar(ctx, x, y, w, frac, color, label) {
    W.drawHealthBar(ctx, x - w / 2, y - 6, w, frac, color || PAL.sun, label || '');
  }

  /* Icons of what's currently in a container, floating above it. */
  function contentsRow(ctx, x, y, list) {
    var n = list.length;
    if (!n) return;
    for (var i = 0; i < n; i++) {
      W.drawItem(ctx, list[i], x - (n - 1) * 15 + i * 30, y, 11);
    }
  }

  var S = {};
  W.STATIONS = S;

  // ------------------------------------------------------------ gathering

  S.fridge = {
    label: 'Open Fridge',
    act: function () {
      G().pushOverlay('picker', {
        title: 'The Fridge',
        items: ['tomato', 'pepperoni', 'mushroom', 'onion', 'meatball', 'egg']
      });
    }
  };

  S.cabinet = {
    label: 'Open the Cabinets',
    act: function () {
      G().pushOverlay('picker', {
        title: 'Dry Goods',
        items: ['pasta', 'flour', 'yeast', 'sugar']
      });
    }
  };

  S.bobaMachine = {
    label: 'Make Boba',
    prompt: function () {
      if (W.service.active() && W.service.style() === 'fetch') return 'Pour a boba';
      return 'Make Boba';
    },
    act: function (st) {
      if (W.service.active() && W.service.style() === 'fetch') {
        st.s.pour = 1.2;
        W.service.pick('boba');
        if (W.audio) W.audio.play('pour');
        return;
      }
      if (W.basket.full()) { say('The basket is full!'); return; }
      st.s.pour = 1.2;
      W.basket.add('boba');
      say('One boba, coming up!');
      if (W.audio) W.audio.play('pour');
    },
    update: function (st, dt) { if (st.s.pour > 0) st.s.pour -= dt; },
    drawOn: function (ctx, st) {
      if (st.s.pour > 0) {
        if (!pearlTile) {
          pearlTile = W.crayon.offscreen(12, 12);
          C.dot(pearlTile.getContext('2d'), 6, 6, 3, PAL.pearl, 'pour');
        }
        for (var i = 0; i < 3; i++) {
          ctx.drawImage(pearlTile, st.x + st.w / 2 + (i - 1) * 5 - 6,
            st.y - 32 + ((st.s.pour * 60 + i * 9) % 26));
        }
      }
    }
  };

  S.trash = {
    label: 'Trash Can',
    prompt: function (st) {
      if (!W.basket.count()) return 'Trash Can';
      return st.s.confirm > 0 ? 'Really? Z again to dump it all' : 'Throw everything away';
    },
    act: function (st) {
      var b = G().state.basket;
      if (!b.length) { say('Nothing to throw away.'); return; }
      // one accidental Z must never wipe a shopping trip
      if (!(st.s.confirm > 0)) {
        st.s.confirm = 3;
        say('Throw ALL of it away? Press Z again if you are sure.');
        return;
      }
      st.s.confirm = 0;
      b.length = 0;
      st.s.wob = 0.6;
      W.fx.dust(st.x + st.w / 2, st.y - 30, 6);
      say('All gone. Fresh start!');
      if (W.audio) { W.audio.play('clack'); W.audio.play('pop'); }
    },
    update: function (st, dt) {
      if (st.s.wob > 0) st.s.wob -= dt;
      if (st.s.confirm > 0) st.s.confirm -= dt;
    }
  };

  S.mailbox = {
    label: 'Check the Mail',
    act: function (st) {
      var key = G().state.day + ':' + st.idx;
      if (G().state.mail[key]) { say('Nothing new. Maybe tomorrow!'); return; }
      G().state.mail[key] = true;
      var letters = [
        { from: 'Yuna',  text: 'Keena Meena! Come to the park! — Yuna' },
        { from: 'Panda', text: 'TRIX!! The pond is SO sparkly today. — Panda' },
        { from: 'Butterball', text: 'I flew a loop! Did you see? — Butterball' },
        { from: 'Pip',   text: '...trix. (a tiny drawing of you) — Pip' }
      ];
      var rnd = W.mulberry32(W.hash('mail' + G().state.day + st.idx))();
      var L = letters[Math.floor(rnd * letters.length)];
      var coin = rnd < 0.3;
      say(L.text + (coin ? '  ...and a coin fell out!' : ''), PAL.accent);
      if (W.audio) W.audio.play('letter');
      if (coin) {
        G().addMoney(1);
        W.fx.sparkle(st.x + st.w / 2, st.y - 40, 8, 40);
        if (W.audio) W.audio.play('coin');
      }
    }
  };

  /* An ice-case tub. During a shop shift Z scoops it for the customer;
   * off-shift it sells you one for 2 coins. */
  S.flavorTub = {
    label: 'Ice Cream',
    drawOn: function (ctx, st) {
      // during a shift, the tub the customer wants glows so a pre-reader
      // can match by place, not just by word
      if (!W.service.active() || W.service.style() !== 'fetch') return;
      var c = W.service.front();
      if (!c || c.wants !== st.flavor) return;
      var pulse = 0.4 + 0.35 * Math.sin(W.game.t * 5);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#F2C14E';
      ctx.lineWidth = 4;
      ctx.strokeRect(st.x - 4, st.y - 52, st.w + 8, 54);
      ctx.restore();
    },
    prompt: function (st) {
      var name = W.ITEMS[st.flavor].name;
      if (W.service.active() && W.service.style() === 'fetch') return 'Scoop ' + name;
      return 'Buy a ' + name + ' scoop — 2 coins';
    },
    act: function (st) {
      var name = W.ITEMS[st.flavor].name;
      if (W.service.active() && W.service.style() === 'fetch') {
        W.service.pick(st.flavor);
        return;
      }
      if (G().state.money < 2) { say('I need 2 coins for a scoop.'); return; }
      G().state.money -= 2;
      W.fx.hearts(st.x + st.w / 2, st.y - 40, 4);
      say('Mmm, ' + name.toLowerCase() + '! Worth every coin.', PAL.accent);
      if (W.audio) { W.audio.play('coin'); W.audio.play('chomp'); }
    }
  };

  S.ideasBoard = {
    label: 'Ideas Board',
    act: function () { G().pushOverlay('ideas'); }
  };

  S.recipePoster = {
    label: 'Read the Recipes',
    act: function () { G().pushOverlay('recipes'); }
  };

  // -------------------------------------------------------------- cooking

  S.stove = {
    label: 'Cook',
    requires: 'cook',
    init: function (st) {
      if (!st.s.contents) st.s.contents = [];
      st.s.hinted = false;      // the could-be-Pizza hint returns each visit
    },

    prompt: function (st) {
      if (st.s.dish) return 'Take the ' + W.ITEMS[st.s.dish].name;
      if (st.s.cooking > 0) return 'Cooking...';
      if (W.basket.ofKind('ingredient').length || W.basket.ofKind('pantry').length) return 'Add and cook';
      if (st.s.contents.length) return 'Cook it!';
      return 'Cook';
    },

    act: function (st) {
      if (st.s.dish) {
        if (W.basket.full()) { say('The basket is full!'); return; }
        W.basket.add(st.s.dish);
        say('A fresh ' + W.ITEMS[st.s.dish].name + '!');
        st.s.dish = null;
        return;
      }
      if (st.s.cooking > 0) { say('It is still cooking!'); return; }

      // Everything edible goes in — cooking NEVER refuses. Known combos make
      // the real dish; anything else becomes Bobby's Surprise.
      var b = G().state.basket;
      var keep = [];
      for (var i = 0; i < b.length; i++) {
        var k = W.ITEMS[b[i]].kind;
        if (k === 'ingredient' || k === 'pantry') st.s.contents.push(b[i]);
        else keep.push(b[i]);
      }
      b.length = 0;
      for (var j = 0; j < keep.length; j++) b.push(keep[j]);

      if (!st.s.contents.length) {
        say('Get some ingredients from the fridge first.');
        return;
      }

      var r = W.matchRecipe(st.s.contents);
      var could = W.possibleRecipes(st.s.contents);
      if (!r && could.length && W.basket.count() === 0) {
        // a known recipe is one trip away — hint, but cook on the next press
        if (!st.s.hinted) {
          st.s.hinted = true;
          say('Could be ' + could.map(function (x) { return x.name; }).join(' or ') +
              '... or press Z to cook it now!');
          return;
        }
      }
      st.s.hinted = false;
      st.s.recipe = r || { id: 'surprise', name: "Bobby's Surprise", time: 3, makes: 'surprise' };
      st.s.cooking = st.s.recipe.time;
      st.s.total = st.s.recipe.time;
      say('Making ' + st.s.recipe.name + '!');
      if (W.audio) W.audio.play('cook');
    },

    update: function (st, dt) {
      if (st.s.cooking > 0) {
        st.s.cooking -= dt;
        if (Math.random() < dt * 6) W.fx.steam(st.x + st.w / 2, st.y - 40);
        if (st.s.cooking <= 0) {
          st.s.cooking = 0;
          st.s.dish = W.recipeDish(st.s.recipe);
          st.s.contents = [];
          W.fx.sparkle(st.x + st.w / 2, st.y - 40, 14, 70);
          say('The ' + W.ITEMS[st.s.dish].name + ' is ready!');
          if (W.audio) W.audio.play('ding');
          G().idea('cook');
          G().first('dish-' + st.s.dish, 'First ' + W.ITEMS[st.s.dish].name + '!');
          if (W.sceneHouse.friendsReact) W.sceneHouse.friendsReact('cook');
        }
      }
    },

    drawOn: function (ctx, st) {
      var cx = st.x + st.w / 2;
      if (st.s.cooking > 0) {
        bar(ctx, cx, st.y - 62, 92, 1 - st.s.cooking / st.s.total, PAL.roof, st.s.recipe.name);
      } else if (st.s.dish) {
        W.drawItem(ctx, st.s.dish, cx, st.y - 58, 16);
      } else if (st.s.contents.length) {
        contentsRow(ctx, cx, st.y - 56, st.s.contents);
      }
    }
  };

  S.counter = {
    label: 'Chop Chop',
    act: function (st) {
      st.s.chop = 1.2;
      say(['Chop chop chop!', 'Slice slice!', 'A little prep work.'][Math.floor(Math.random() * 3)]);
      if (W.audio) W.audio.play('clack');
    },
    update: function (st, dt) { if (st.s.chop > 0) st.s.chop -= dt; }
  };

  S.table = {
    label: 'Table',
    init: function (st) { if (!st.s.set) st.s.set = []; },
    prompt: function (st) {
      var dish = W.basket.ofKind('dish')[0];
      var P2 = G().state.plates;
      if (dish && st.s.set.length < 3) {
        if (P2.stored > 0) return 'Set the table';
        return P2.rack > 0 ? 'Put the plates away first!' : 'Wash a plate first!';
      }
      if (st.s.set.length) return 'Sit on a chair to eat!';
      return 'Table';
    },
    act: function (st) {
      var dish = W.basket.ofKind('dish')[0];
      var P2 = G().state.plates;
      if (!dish) {
        say(st.s.set.length ? 'Sit on a chair and press Z to eat!' : 'Cook something first!');
        return;
      }
      if (st.s.set.length >= 3) { say('The table is full!'); return; }
      if (P2.stored <= 0) {
        say(P2.rack > 0 ? 'The clean plates are still on the rack — put them away!'
                        : 'No clean plates! Wash up at the sink.');
        return;
      }
      P2.stored--;
      W.basket.remove(dish);
      st.s.set.push(dish);
      say('Dinner is served!');
      if (W.audio) W.audio.play('clack');
    },
    drawOn: function (ctx, st) {
      for (var i = 0; i < st.s.set.length; i++) {
        var px2 = st.x + 18 + i * 32, py2 = st.y - 18 - (i % 2) * 6;
        plate(ctx, px2, py2 + 4);
        W.drawItem(ctx, st.s.set[i], px2, py2 - 4, 11);
      }
    }
  };

  /* Chairs are for sitting — the eat action lives on the seated state. */
  S.chair = {
    label: 'Sit Down',
    act: function (st) {
      var H = W.sceneHouse;
      H.seated = st;
      H.player.x = st.x + st.w / 2;
      H.player.y = st.y + st.h / 2 + 4;
      say('Comfy!');
    }
  };

  /* Eating, called by the scene while seated next to a set table. */
  W.stationEat = function (tableSt, player) {
    var dish = tableSt.s.set.shift();
    if (!dish) return;
    G().state.plates.dirty++;
    G().state.meals = (G().state.meals || 0) + 1;
    W.fx.hearts(player.x, player.y - 90, 6);
    say('Mmm! ' + W.ITEMS[dish].name + '. Keena Meena to the chef!', PAL.accent);
    if (W.audio) W.audio.play('chomp');
  };

  S.sink = {
    label: 'Sink',
    prompt: function (st) {
      if (st.s.wash > 0) return 'Washing...';
      var P2 = G().state.plates;
      if (P2.dirty > 0) return 'Wash the dishes (' + P2.dirty + ')';
      return 'Splash about';
    },
    act: function (st) {
      if (st.s.wash > 0) return;
      var P2 = G().state.plates;
      if (P2.dirty <= 0) {
        st.s.water = st.s.water ? 0 : 2.4;
        say(st.s.water ? 'Splish splash!' : 'Water off.');
        if (st.s.water && W.audio) W.audio.play('water');
        return;
      }
      st.s.wash = 1.6 + P2.dirty * 0.5;
      st.s.washTotal = st.s.wash;
      st.s.water = st.s.wash;
      if (W.audio) W.audio.play('water');
    },
    update: function (st, dt) {
      if (st.s.water > 0) st.s.water -= dt;
      if (st.s.wash > 0) {
        st.s.wash -= dt;
        if (Math.random() < dt * 9) W.fx.bubble(st.x + st.w / 2, st.y - 34);
        if (st.s.wash <= 0) {
          var P2 = G().state.plates;
          P2.rack += P2.dirty;
          P2.dirty = 0;
          say('All clean — onto the drying rack!');
          W.fx.sparkle(st.x + st.w / 2, st.y - 34, 10, 50);
        }
      }
    },
    drawOn: function (ctx, st) {
      var cx = st.x + st.w / 2;
      if (st.s.water > 0) {
        for (var i = 0; i < 4; i++) {
          C.line(ctx, cx - 6 + i * 4, st.y - 44, cx - 7 + i * 4, st.y - 44 + 18 + (i % 2) * 5,
            { seed: 'wtr' + i, stroke: '#8FD0EE', lw: 2.4, wob: 0.8, passes: 1, strokeAlpha: 0.8 });
        }
      }
      if (st.s.wash > 0) bar(ctx, cx, st.y - 62, 80, 1 - st.s.wash / st.s.washTotal, '#8FD0EE', 'Washing');
      // the drying rack stack — baked plate, blitted
      var rack = G().state.plates.rack;
      for (var r2 = 0; r2 < Math.min(rack, 4); r2++) {
        plate(ctx, st.x + st.w + 16, st.y - 26 - r2 * 6);
      }
    }
  };

  S.cupboard = {
    label: 'Cupboard',
    prompt: function () {
      var P2 = G().state.plates;
      if (P2.rack > 0) return 'Put away the plates (' + P2.rack + ')';
      return 'Plates: ' + P2.stored + ' stored';
    },
    act: function () {
      var P2 = G().state.plates;
      if (P2.rack <= 0) { say(P2.stored + ' plates, all tidy.'); return; }
      G().state.platesAway = (G().state.platesAway || 0) + P2.rack;
      P2.stored += P2.rack;
      P2.rack = 0;
      say('All put away. Tidy kitchen!');
      if (W.audio) W.audio.play('clack');
    }
  };

  // ------------------------------------------------------ house comforts

  S.lamp = {
    label: 'Light Switch',
    act: function (st) {
      var L = G().state.lights;
      var r = st.room;
      L[r] = !(L[r] === undefined ? true : L[r]);
      say(L[r] ? 'Lights on!' : 'Look — glow stars!', L[r] ? null : '#9FE8C4');
      if (W.audio) W.audio.play('click');
    },
    prompt: function (st) {
      var L = G().state.lights[st.room];
      return (L === undefined ? true : L) ? 'Turn off the lights' : 'Turn on the lights';
    }
  };

  S.bed = {
    label: 'Go to Sleep',
    prompt: function () {
      var I = G().state.ideas;
      if (I && I.list) {
        var left = I.list.filter(function (x) { return !I.done[x.id]; }).length;
        if (left > 0) return 'Sleep (' + left + ' ideas left!)';
      }
      return 'Go to Sleep';
    },
    act: function (st) {
      var H = W.sceneHouse;
      // lie ON the bed (baseline just south of the bed prop's, so Bobby draws
      // on top of it, head at the pillow) — the wake spot is separate and
      // verified walkable, because waking INSIDE the bed's solid used to
      // freeze the game
      var lie = st.lie || [st.x + st.w / 2, st.y - 20];
      H.player.x = lie[0];
      H.player.y = lie[1];
      H.startSleep(st.wake || [st.x + st.w / 2, st.y + st.h + 18]);
    }
  };

  S.window = {
    label: 'Open the Window',
    prompt: function (st) { return st.s.open ? 'Close the window' : 'Open the window'; },
    act: function (st) {
      st.s.open = !st.s.open;
      say(st.s.open ? 'Fresh air! I can hear birds.' : 'Cosy again.');
      if (W.audio) W.audio.play(st.s.open ? 'breeze' : 'click');
    },
    update: function (st, dt) {
      if (st.s.open && Math.random() < dt * 3) W.fx.breeze(st.x + st.w / 2, st.y - 60);
    }
  };

  S.toybox = {
    label: 'Open the Toy Box',
    act: function (st) {
      st.s.open = 2.5;
      W.fx.sparkle(st.x + st.w / 2, st.y - 30, 18, 110);
      var lines = ['So many toys!', 'Found my old rocket!', 'A tiny Bobby doll. Keena Meena!'];
      st.s.line = ((st.s.line || 0) + 1) % 3;
      say(lines[st.s.line]);
      if (W.audio) W.audio.play('ding');
    },
    update: function (st, dt) { if (st.s.open > 0) st.s.open -= dt; }
  };

  S.sofa = {
    label: 'Sit on the Sofa',
    act: function (st) {
      var H = W.sceneHouse;
      H.seated = st;
      // perch on the cushions, baseline just south of the sofa's own so
      // Bobby draws in front of the backrest
      H.player.x = st.x + st.w / 2;
      H.player.y = st.seat ? st.seat[1] : st.y - 6;
      if (st.seat) H.player.x = st.seat[0];
      var tvOn = false;
      for (var i = 0; i < H.stations.length; i++) {
        if (H.stations[i].kind === 'tv' && H.stations[i].s.on) tvOn = true;
      }
      say(tvOn ? 'Cosy! Best seat for the show.' : 'So soft. Ten more minutes...');
    }
  };

  S.tv = {
    label: 'TV',
    prompt: function (st) { return st.s.on ? 'Turn off the TV' : 'Turn on the TV'; },
    act: function (st) {
      st.s.on = !st.s.on;
      say(st.s.on ? 'The bears on TV are dancing!' : 'That is enough telly.');
      if (W.audio) W.audio.play('click');
    },
    update: function (st, dt) {
      if (st.s.on && Math.random() < dt * 0.4 && W.audio) W.audio.play('murmur');
    },
    drawOn: function (ctx, st) {
      if (!st.s.on) return;
      // Three little shows, each two baked frames flipped at ~3fps: dancing
      // bears that actually trade hops, a boba ad with a dunking straw, and
      // a drifting night sky. All blits — the old live-crayon version cost
      // up to 4.4ms/frame.
      if (!tvTiles) {
        tvTiles = [];
        for (var sh = 0; sh < 3; sh++) {
          tvTiles[sh] = [];
          for (var fr = 0; fr < 2; fr++) {
            var cv = W.crayon.offscreen(68, 36);
            var g = cv.getContext('2d');
            g.translate(34, 20);
            if (sh === 0) {
              C.dot(g, -12, fr ? 2 : -6, 6, '#C79A5E', 'tvb1' + fr);
              C.dot(g, 12, fr ? -6 : 2, 6, '#FFFDF6', 'tvb2' + fr);
              C.arc(g, -12, fr ? -6 : -14, 3, Math.PI, Math.PI * 2, { seed: 'ear' + fr, stroke: PAL.outline, lw: 1.4, wob: 0.3, passes: 1 });
            } else if (sh === 1) {
              C.poly(g, [[-8, -8], [8, -8], [5, 12], [-5, 12]], {
                seed: 'tvad', fill: PAL.tea, stroke: PAL.outline, lw: 1.6, hatch: 2, wash: 0.85
              });
              C.line(g, 2, -8, 6, fr ? -14 : -18, { seed: 'straw' + fr, stroke: PAL.sun, lw: 2.4, wob: 0.4 });
              C.dot(g, 0, 8, 2.4, PAL.pearl, 'tvp');
              if (fr) C.text(g, '!', 14, -6, { size: 10, color: PAL.roof, seed: 'wow' });
            } else {
              C.star(g, fr ? -6 : -10, -2, 4, PAL.sun, 'tvs1' + fr);
              C.star(g, fr ? 12 : 8, 5, 3, PAL.white, 'tvs2' + fr);
              C.arc(g, 10, -8, 4, Math.PI * 0.35, Math.PI * 1.65, { seed: 'moon' + fr, stroke: PAL.sun, lw: 1.8, wob: 0.3, passes: 1 });
            }
            tvTiles[sh][fr] = cv;
          }
        }
      }
      var show = Math.floor(W.game.t / 4) % 3;
      var frame2 = Math.floor(W.game.t * 3) % 2;
      ctx.drawImage(tvTiles[show][frame2], st.x + 8, st.y - 53);
    }
  };

  S.bookshelf = {
    label: 'Read',
    act: function (st) {
      var lines = ['This one is about a bear in a cup.', 'I like the pictures best.',
                   'Once upon a time, in Warmland...'];
      st.s.read = 2.5;
      say(lines[Math.floor(Math.random() * lines.length)]);
    },
    update: function (st, dt) { if (st.s.read > 0) st.s.read -= dt; }
  };

  S.closet = {
    label: 'Magic Closet',
    act: function () { G().pushOverlay('closet'); }
  };

  S.crystalShelf = {
    label: 'Trophy Case',
    prompt: function () {
      var carried = G().state.crystalsCarried;
      return carried > 0 ? 'Display ' + carried + ' crystal' + (carried > 1 ? 's' : '')
                         : 'Open the treasure book';
    },
    prompt2: null,
    act: function () {
      var st2 = G().state;
      if (st2.crystalsCarried <= 0) {
        G().pushOverlay('crystalbook');
        return;
      }
      st2.crystals += st2.crystalsCarried;
      st2.crystalsCarried = 0;
      W.fx.sparkle(480, 300, 22, 130);
      G().showBanner('TREASURE DISPLAYED!', st2.crystals + ' crystals shine in the bedroom');
      if (W.audio) W.audio.play('chime');
      W.requestRebuild('bedroom');
    },
    drawOn: function (ctx, st) {
      // a slow glint so the case reads as treasure even in a still room
      if (G().state.crystals > 0 && Math.floor(W.game.t * 1.4) % 4 === 0) {
        if (!glintTile) {
          glintTile = W.crayon.offscreen(16, 16);
          C.star(glintTile.getContext('2d'), 8, 8, 5, PAL.white, 'twinkle');
        }
        var tw = (W.game.t * 1.4) % 1;
        ctx.drawImage(glintTile, st.x + 10 + tw * 60, st.y - 74);
      }
    }
  };

  /* Treehouse odds and ends — small, but they make the room feel lived in. */
  S.telescope = {
    label: 'Look Out',
    act: function (st) {
      st.s.peer = 2.4;
      W.fx.sparkle(st.x + st.w / 2, st.y - 60, 8, 40);
    },
    update: function (st, dt) { if (st.s.peer > 0) st.s.peer -= dt; },
    drawOn: function (ctx, st) {
      if (st.s.peer > 0) {
        if (!scopeTile) {
          scopeTile = W.crayon.offscreen(80, 80);
          var sg = scopeTile.getContext('2d');
          C.ellipse(sg, 40, 40, 34, 34, {
            seed: 'scope', fill: PAL.night, stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.75
          });
          C.star(sg, 32, 32, 5, PAL.sun, 'sv1');
          C.star(sg, 50, 46, 4, PAL.sun, 'sv2');
        }
        ctx.drawImage(scopeTile, st.x + st.w / 2 - 40, st.y - 136);
      }
    }
  };

  S.snackStash = {
    label: 'Snacks',
    act: function (st) {
      if (W.basket.full()) { say('The basket is full!'); return; }
      W.basket.add('boba');
      st.s.rustle = 1.2;
    },
    update: function (st, dt) { if (st.s.rustle > 0) st.s.rustle -= dt; }
  };

  S.beanbag = {
    label: 'Flop Down',
    act: function (st) { st.s.flop = 2.6; },
    update: function (st, dt) { if (st.s.flop > 0) st.s.flop -= dt; }
  };

  /* The garden: plant seeds, water once a day, harvest after two mornings.
   * Same daily-gate pattern as the rocks — chores that respect the clock. */
  var CROPS = ['tomato', 'onion', 'mushroom'];
  S.garden = {
    label: 'Garden',
    init: function (st) { if (st.s.stage === undefined) st.s.stage = 0; },
    prompt: function (st) {
      if (st.s.stage === 0) return W.basket.has('seeds') ? 'Plant the seeds' : 'Needs seeds (shop!)';
      if (st.s.stage >= 3) return 'Harvest!';
      if (st.s.water > 0) return 'Growing...';
      return 'Water the plants';
    },
    act: function (st) {
      if (st.s.stage === 0) {
        if (!W.basket.has('seeds')) { say('I need seeds — the shop sells them!'); return; }
        W.basket.remove('seeds');
        st.s.stage = 1;
        st.s.crop = CROPS[Math.floor(W.mulberry32(W.hash('crop' + G().state.day + st.idx))() * CROPS.length)];
        say('Planted! Water it and watch it grow.');
        if (W.audio) W.audio.play('clack');
        return;
      }
      if (st.s.stage >= 3) {
        if (W.basket.full()) { say('The basket is full!'); return; }
        W.basket.add(st.s.crop);
        if (!W.basket.full()) W.basket.add(st.s.crop);   // a generous harvest
        say('A ' + W.ITEMS[st.s.crop].name + ' harvest! Fresh for cooking.');
        W.fx.sparkle(st.x + st.w / 2, st.y + 10, 12, 60);
        st.s.stage = 0;
        st.s.crop = null;
        G().first('garden', 'First harvest!');
        G().idea('cook');
        if (W.audio) W.audio.play('ding');
        return;
      }
      if (st.s.water > 0) { say('Glug glug... look at it go!'); return; }
      // water as often as you like — growing is the fun, not the waiting
      st.s.water = 1.3;
      if (W.audio) W.audio.play('water');
    },
    update: function (st, dt) {
      if (st.s.water > 0) {
        st.s.water -= dt;
        if (st.s.water <= 0 && st.s.stage > 0 && st.s.stage < 3) {
          st.s.stage++;
          W.fx.sparkle(st.x + st.w / 2, st.y, 8, 40);
          say(st.s.stage >= 3 ? 'Look how big! Ready to pick!' : 'It grew!');
          if (W.audio) W.audio.play('blip');
        }
      }
    },
    drawOn: function (ctx, st) {
      if (!gardenTiles) {
        gardenTiles = [];
        for (var stg = 1; stg <= 3; stg++) {
          var cv = W.crayon.offscreen(70, 60);
          var g = cv.getContext('2d');
          g.translate(35, 46);
          if (stg === 1) {
            for (var m = 0; m < 3; m++) C.dot(g, -18 + m * 18, 0, 3, '#5A3A18', 'mound' + m);
          } else if (stg === 2) {
            for (var sp2 = 0; sp2 < 3; sp2++) {
              C.line(g, -18 + sp2 * 18, 2, -18 + sp2 * 18, -12, { seed: 'st' + sp2, stroke: PAL.grassDk, lw: 2.6, wob: 0.8 });
              C.ellipse(g, -18 + sp2 * 18, -15, 5, 4, { seed: 'lf' + sp2, fill: PAL.grass, stroke: null, hatch: 2, wash: 0.85 });
            }
          } else {
            for (var pl2 = 0; pl2 < 3; pl2++) {
              C.line(g, -18 + pl2 * 18, 2, -18 + pl2 * 18, -20, { seed: 'st2' + pl2, stroke: PAL.grassDk, lw: 3, wob: 0.8 });
              C.dot(g, -18 + pl2 * 18, -24, 6, '#D9402F', 'fr' + pl2);
            }
          }
          gardenTiles[stg] = cv;
        }
      }
      if (st.s.stage > 0) {
        ctx.drawImage(gardenTiles[Math.min(st.s.stage, 3)], st.x, st.y - 22);
      }
      if (st.s.water > 0) {
        for (var d2 = 0; d2 < 3; d2++) {
          if (Math.random() < 0.4) W.fx.bubble(st.x + 12 + d2 * 22, st.y + 6);
        }
      }
    }
  };
  var gardenTiles = null;

  /* Seeds for sale at the shop. */
  /* The decor catalog: buy a piece, it appears in the chosen room's next
   * free decor spot. Rooms and props are data, so this is nearly free. */
  S.decorShop = {
    label: 'Decor Catalog',
    act: function () { G().pushOverlay('decorshop'); }
  };

  S.treatStand = {
    label: 'Pet Treats — 2 coins',
    prompt: function () {
      return G().state.pet ? 'Pet Treats — 2 coins' : 'Treats (for future fluffs)';
    },
    act: function () {
      if (!G().state.pet) { say('First adopt a fluff at the park!'); return; }
      if (G().state.money < 2) { say('Treats cost 2 coins.'); return; }
      if (W.basket.full()) { say('The basket is full!'); return; }
      G().state.money -= 2;
      W.basket.add('treat');
      say('One wiggly treat!');
      if (W.audio) W.audio.play('coin');
    }
  };

  S.seedStand = {
    label: 'Seeds — 3 coins',
    act: function () {
      if (G().state.money < 3) { say('Seeds cost 3 coins. Do a shift!'); return; }
      if (W.basket.full()) { say('The basket is full!'); return; }
      G().state.money -= 3;
      W.basket.add('seeds');
      say('A little bag of maybe-anything seeds!');
      if (W.audio) W.audio.play('coin');
    }
  };

  // ------------------------------------------------------------- outdoors

  /* Crystal mining: whack a rock three times; some rocks hide a crystal.
   * Rocks mend themselves overnight, so the mountain is always worth a trip. */
  S.breakRock = {
    label: 'Break the Rock',
    init: function (st) {
      if (st.s.day !== G().state.day) {          // fresh rocks each day
        st.s.day = G().state.day;
        st.s.whacks = 0;
        st.s.broken = false;
      }
    },
    prompt: function (st) {
      if (st.s.broken) return 'New rocks tomorrow!';
      return st.s.whacks > 0 ? 'Whack it again!' : 'Break the Rock';
    },
    act: function (st) {
      if (st.s.broken) { say('All crumbs — new rocks tomorrow!'); return; }
      st.s.whacks++;
      st.s.shake = 0.3;
      W.fx.dust(st.x + st.w / 2 + (Math.random() - 0.5) * 30, st.y - 20, 4);
      if (W.audio) W.audio.play('hammer');
      if (st.s.whacks < 3) return;

      st.s.broken = true;
      W.fx.dust(st.x + st.w / 2, st.y - 16, 8);
      // 40% of rocks hide a crystal
      var odds = G().state.weather === 'rainbow' ? 0.8 : 0.4;   // rainbow days are lucky
      var lucky = W.mulberry32(W.hash('rock' + G().state.day + st.room + st.idx))() < odds;
      if (lucky) {
        var cry = W.findCrystal('rock' + G().state.day + st.room + st.idx);
        W.fx.sparkle(st.x + st.w / 2, st.y - 30, 18, 90);
        say('A ' + cry.name + '! It hums.', cry.color);
        if (W.audio) W.audio.play('chime');
        G().idea('crystal');
        G().first('crystal', 'First crystal!');
        G().first('cry-' + cry.name, 'Found a ' + cry.name + '!');
      } else {
        say(['Just pebbles.', 'Nothing but dust!', 'Empty... try another!'][Math.floor(Math.random() * 3)]);
      }
    },
    update: function (st, dt) { if (st.s.shake > 0) st.s.shake -= dt; },
    drawOn: function (ctx, st) {
      // A mined-out mountain used to cost ~42ms/frame in live rubble dots.
      // Everything is baked to four tiny state tiles and blitted.
      var cx = st.x + st.w / 2, cy = st.y - 4;
      var state = st.s.broken ? 'rubble' : 'crack' + st.s.whacks;
      if (state === 'crack0') return;
      if (!rockTiles[state]) {
        var cv = W.crayon.offscreen(64, 44);
        var g = cv.getContext('2d');
        g.translate(32, 30);
        if (st.s.broken) {
          for (var r2 = 0; r2 < 4; r2++) {
            C.dot(g, -16 + r2 * 11, 2 + (r2 % 2) * 5, 5 + (r2 % 2) * 2, '#9AA6AE', 'rub' + r2);
          }
        } else {
          for (var w2 = 0; w2 < st.s.whacks; w2++) {
            C.line(g, -8 + w2 * 9, -24, -2 + w2 * 9, -6, {
              seed: 'crack' + w2, stroke: PAL.outline, lw: 2.2, wob: 1.6, passes: 1
            });
          }
        }
        rockTiles[state] = cv;
      }
      ctx.save();
      if (st.s.shake > 0) ctx.translate((Math.random() - 0.5) * 5, 0);
      ctx.drawImage(rockTiles[state], cx - 32, cy - 30);
      ctx.restore();
    }
  };
  var rockTiles = {};
  var pearlTile = null;
  var scopeTile = null;
  var glintTile = null;
  var tvTiles = null;

  S.tree = {
    label: 'Build a Treehouse',
    requires: 'build',
    prompt: function () {
      return G().state.builtTreehouse ? 'Climb up' : 'Build a Treehouse';
    },
    act: function (st) {
      if (G().state.builtTreehouse) {
        G().fadeTo('house', { room: 'treehouse' });
        return;
      }
      st.s.building = 2.6;
      say('Hammer time!');
      if (W.audio) W.audio.play('hammer');
    },
    update: function (st, dt) {
      if (st.s.building > 0) {
        st.s.building -= dt;
        if (Math.random() < dt * 8) W.fx.dust(st.x + st.w / 2 + (Math.random() - 0.5) * 50, st.y - 40);
        if (st.s.building <= 0) {
          G().state.builtTreehouse = true;
          // The finished treehouse is much bigger than the tree — step the
          // builder clear BEFORE the room rebuilds, or the new footprint can
          // swallow the spot they were standing on and freeze them.
          var H = W.sceneHouse;
          var ex = st.x + st.w / 2, ey = st.y + st.h + 30;
          // note: the parked car sits just south of this tree — ring-search
          // for genuinely open ground rather than assuming
          if (!W.canStand(H.room, W.solidsFor(H.name), ex, ey)) {
            var free2 = H.spotNear(ex, ey);
            if (free2) { ex = free2[0]; ey = free2[1]; }
          }
          H.player.x = ex;
          H.player.y = ey;
          W.fx.sparkle(st.x + st.w / 2, st.y - 80, 26, 140);
          G().showBanner('TREEHOUSE BUILT!', 'Climb up and see!');
          W.requestRebuild('outside');
        }
      }
    },
    drawOn: function (ctx, st) {
      if (st.s.building > 0) bar(ctx, st.x + st.w / 2, st.y - 100, 110, 1 - st.s.building / 2.6, PAL.sun, 'Building');
    }
  };

  /* The adoption box — one fluffy friend for life. */
  var PET_NAMES = ['Mochi', 'Biscuit', 'Nugget', 'Waffles', 'Pudding'];
  S.petBox = {
    label: 'Free Fluffs',
    prompt: function () {
      return G().state.pet ? 'Everyone found homes!' : 'Adopt a fluff!';
    },
    act: function (st) {
      if (G().state.pet) { say(G().state.pet.name + ' is glad to have a home.'); return; }
      var name = PET_NAMES[Math.floor(W.mulberry32(W.hash('pet' + G().state.day))() * PET_NAMES.length)];
      G().state.pet = { name: name };
      W.fx.hearts(st.x + st.w / 2, st.y - 40, 8);
      G().showBanner('MEET ' + name.toUpperCase() + '!', 'Your very own fluff, forever.');
      G().first('pet', 'Adopted ' + name + '!');
      if (W.audio) W.audio.play('win');
      W.requestRebuild(G().state.room);      // the box's peeking fluff goes home
    }
  };

  /* Fishing at the pond: cast, wait for the wiggle, Z on the "!". */
  S.fishing = {
    label: 'Fish',
    prompt: function (st) {
      if (st.s.bite > 0) return '! ! ! NOW ! ! !';
      if (st.s.wait > 0) return 'Shhh... waiting...';
      return 'Cast the line';
    },
    act: function (st) {
      if (st.s.bite > 0) {
        st.s.bite = 0;
        st.s.wait = 0;
        st.s.casts = (st.s.casts || 0) + 1;
        var roll = W.mulberry32(W.hash('fish' + G().state.day + st.s.casts))();
        if (W.basket.full()) { say('Caught something — but the basket is full!'); return; }
        if (roll < 0.62) {
          W.basket.add('fish');
          say('A fish! Dinner sorted.', '#5FA8D6');
          G().first('fish', 'First catch!');
        } else if (roll < 0.82) {
          W.basket.add('boot');
          say('...an old boot. Classic.', PAL.woodDk);
          G().first('boot', 'Caught... a boot?');
        } else {
          W.basket.add('tinyUfo');
          say('A TINY UFO?! The pond is full of surprises.', PAL.dome);
          G().first('tinyufo', 'Caught a tiny UFO!');
        }
        W.fx.sparkle(st.x + st.w / 2, st.y - 10, 10, 50);
        if (W.audio) W.audio.play('pickup');
        return;
      }
      if (st.s.wait > 0) { say('Patience... watch the bobber!'); return; }
      st.s.casts = (st.s.casts || 0) + 1;
      st.s.wait = 1.5 + W.mulberry32(W.hash('wait' + G().state.day + st.s.casts))() * 2.5;
      say('Cast! Watch closely...');
      if (W.audio) W.audio.play('pour');
    },
    update: function (st, dt) {
      if (st.s.wait > 0) {
        st.s.wait -= dt;
        if (st.s.wait <= 0) {
          st.s.bite = 0.9;                        // the catch window
          if (W.audio) W.audio.play('blip');
        }
      } else if (st.s.bite > 0) {
        st.s.bite -= dt;
        if (st.s.bite <= 0) say('It got away...');
      }
    },
    drawOn: function (ctx, st) {
      if (!(st.s.wait > 0) && !(st.s.bite > 0)) return;
      var bx = st.x + st.w / 2, by = st.y - 6;
      var dip = st.s.bite > 0 ? 6 : Math.sin(W.game.t * 2) * 2;
      if (!bobTile) {
        bobTile = W.crayon.offscreen(16, 16);
        C.dot(bobTile.getContext('2d'), 8, 8, 5, PAL.roof, 'bob');
      }
      ctx.drawImage(bobTile, bx - 8, by - 8 + dip);
      if (st.s.bite > 0) {
        C.textCached(ctx, '!', bx + 14, by - 6, {
          size: 22, color: PAL.roof, outline: 3, outlineColor: PAL.white, seed: 'bite'
        });
      }
    }
  };
  var bobTile = null;

  // ------------------------------------------------------------- vehicles

  S.vehicle = {
    label: 'Board',
    prompt: function (st) {
      var v = W.VEHICLES[st.vehicle];
      if (v.requires && !W.can(v.requires)) return 'Need the ' + W.suitFor(v.requires).name;
      return 'Ride the ' + v.name;
    },
    act: function (st) {
      var v = W.VEHICLES[st.vehicle];
      if (v.requires && !W.can(v.requires)) {
        say('I need the ' + W.suitFor(v.requires).name + ' outfit for this.');
        return;
      }
      G().fadeTo('vehicle', { vehicle: st.vehicle, map: st.map });
    }
  };

  // ----------------------------------------------------------------- jobs

  S.shopCounter = {
    label: 'Start Work',
    requires: 'serve',
    stopWith: 'back',
    prompt: function () { return G().state.job ? 'X stop working' : 'Start Work'; },
    act: function () {
      if (G().state.job) {
        say('Doing great — ' + W.service.served() + ' served!');
        return;
      }
      G().startJob('iceCream');
    }
  };

  S.cartPitch = {
    label: 'Set Up the Cart',
    stopWith: 'back',
    prompt: function () {
      if (!W.can('transform')) return 'A boba cart could go here';
      return G().state.job ? 'X stop working' : 'Set Up the Cart';
    },
    act: function () {
      if (!W.can('transform')) { say('The Mech suit can turn into a boba cart!'); return; }
      if (G().state.job) {
        say('Doing great — ' + W.service.served() + ' served!');
        return;
      }
      G().state.mechForm = 'cart';
      G().startJob('bobaCart');
    }
  };

  // ------------------------------------------------------------- plumbing

  /* Build the live station list for a room, wiring each to its persistent
   * state bucket. */
  W.buildStations = function (roomName) {
    var room = W.ROOMS[roomName];
    if (!room.stations) return [];
    var all = W.game.state.stations;
    return room.stations.map(function (def, i) {
      // A station may carry a stable `id`; otherwise kind:index. Ids protect
      // persisted state (e.g. collected crystals) from room-array edits.
      var key = roomName + ':' + (def.id || def.kind + ':' + i);
      if (!all[key]) all[key] = {};
      var inst = {};
      for (var k in def) inst[k] = def[k];
      inst.room = roomName;
      inst.idx = i;
      inst.def = S[def.kind];
      inst.s = all[key];
      if (!inst.def) throw new Error('unknown station kind: ' + def.kind);
      if (inst.def.init) inst.def.init(inst);
      return inst;
    });
  };

  /* What the [Z] prompt should read, or null if this station is gated. */
  W.stationPrompt = function (st) {
    var d = st.def;
    if (d.requires && !W.can(d.requires)) {
      var suit = W.suitFor(d.requires);
      return { text: 'Need: ' + suit.name, locked: true };
    }
    var text = d.prompt ? d.prompt(st) : (st.label || d.label || 'Use');
    return { text: text, locked: false };
  };

  W.stationAct = function (st, player) {
    var d = st.def;
    if (d.requires && !W.can(d.requires)) {
      var suit = W.suitFor(d.requires);
      say('I need the ' + suit.name + ' outfit. Try the magic closet!');
      return;
    }
    d.act(st);
    if (W.save) W.save.auto();     // progress should never be more than one action old
  };
})(window.W);
