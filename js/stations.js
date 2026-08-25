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
    icon: 'tomato',
    act: function () {
      G().pushOverlay('picker', {
        title: 'The Fridge',
        items: ['tomato', 'pepperoni', 'mushroom', 'onion', 'meatball', 'egg']
      });
    }
  };

  S.cabinet = {
    label: 'Open the Cabinets',
    icon: 'pasta',
    act: function () {
      G().pushOverlay('picker', {
        title: 'Dry Goods',
        items: ['pasta', 'flour', 'yeast', 'sugar']
      });
    }
  };

  S.bobaMachine = {
    label: 'Make Boba',
    icon: 'boba',
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
      st.s.pour = 1.2;
      var bump0 = W.hands.hold('boba');
      if (bump0) W.dropped.dropItem(G().state.room, bump0, W.sceneHouse.player.x, W.sceneHouse.player.y);
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
      if (!W.tray.count() && !G().state.held) return 'Trash Can';
      return st.s.confirm > 0 ? 'Really? Z again to dump it all' : 'Throw everything away';
    },
    act: function (st) {
      var b = G().state.tray;
      if (!b.length && !G().state.held) { say('Nothing to throw away.'); return; }
      // one accidental Z must never wipe a shopping trip
      if (!(st.s.confirm > 0)) {
        st.s.confirm = 3;
        say('Throw ALL of it away? Press Z again if you are sure.');
        return;
      }
      st.s.confirm = 0;
      b.length = 0;
      G().state.held = null;
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
    icon: function (st) { return st.flavor; },
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
      var bumped = W.hands.hold(st.flavor);
      if (bumped) W.dropped.dropItem(W.sceneHouse.name, bumped, st.x + 10, st.y + 40);
      say('One ' + name.toLowerCase() + ' scoop! Careful — it is COLD.', PAL.accent);
      if (W.audio) W.audio.play('coin');
    }
  };

  S.ideasBoard = {
    icon: 'star',
    label: 'Ideas Board',
    act: function () { G().pushOverlay('ideas'); }
  };

  S.recipePoster = {
    icon: 'pizza',
    label: 'Read the Recipes',
    act: function () { G().pushOverlay('recipes'); }
  };

  // -------------------------------------------------------------- cooking

  S.stove = {
    label: 'Cook',
    icon: 'friedEgg',
    requires: 'cook',
    init: function (st) {
      if (!st.s.contents) st.s.contents = [];
    },

    prompt: function (st) {
      if (st.s.dish) return 'Take the ' + W.ITEMS[st.s.dish].name;
      if (st.s.cooking > 0) return 'Cooking...';
      if (W.tray.count()) return 'Add and cook';
      if (st.s.contents.length) return 'Cook it!';
      return 'Cook';
    },

    act: function (st) {
      if (st.s.dish) {
        var bumped = W.hands.hold(st.s.dish);
        if (bumped) W.dropped.dropItem(G().state.room, bumped, W.sceneHouse.player.x, W.sceneHouse.player.y);
        say('A fresh ' + W.ITEMS[st.s.dish].name + '! Take it to the table.');
        st.s.dish = null;
        return;
      }
      if (st.s.cooking > 0) { say('It is still cooking!'); return; }

      // Everything edible goes in — cooking NEVER refuses. Known combos make
      // the real dish; anything else becomes Bobby's Surprise.
      // the whole tray goes in the pot — that's all the tray ever holds
      var tipped = W.tray.takeAll();
      for (var i = 0; i < tipped.length; i++) st.s.contents.push(tipped[i]);

      if (!st.s.contents.length) {
        say('Get some ingredients from the fridge first.');
        return;
      }

      var r = W.matchRecipe(st.s.contents);
      // Z ALWAYS cooks — the old "could be Pizza" hint swallowed the first
      // press, which reads as "the button is broken" to a five-year-old.
      // The suggestion lives passively above the pot instead (drawOn).
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
          var made = W.recipeDish(st.s.recipe);
          st.s.contents = [];
          W.fx.sparkle(st.x + st.w / 2, st.y - 40, 14, 70);
          // straight into his paws — nobody wants to press Z at an oven
          var bumped0 = W.hands.hold(made);
          if (bumped0) {
            W.dropped.dropItem(G().state.room, bumped0,
              W.sceneHouse.player.x, W.sceneHouse.player.y);
          }
          st.s.dish = null;
          say('The ' + W.ITEMS[made].name + ' is ready! Take it to the table.');
          if (W.audio) W.audio.play('ding');
          G().idea('cook');
          G().first('dish-' + made, 'First ' + W.ITEMS[made].name + '!');
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
        // a gentle, free suggestion — never a blocked press
        var could2 = W.possibleRecipes(st.s.contents);
        if (could2.length && !W.matchRecipe(st.s.contents)) {
          C.textCached(ctx, 'could be ' + could2[0].name + '...', cx, st.y - 76, {
            size: 13, align: 'center', color: PAL.woodDk,
            outline: 3, outlineColor: PAL.white, seed: 'stcould' + could2[0].id
          });
        }
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
    icon: 'pizza',
    init: function (st) { if (!st.s.set) st.s.set = []; },
    prompt: function (st) {
      var dish = W.hands.kind() === 'dish' ? W.hands.item() : null;
      if (dish && st.s.set.length < 3) return 'Dinner time!';
      if (st.s.set.length) return 'Sit down to eat!';
      return 'Table';
    },
    act: function (st) {
      var dish = W.hands.kind() === 'dish' ? W.hands.item() : null;
      var H = W.sceneHouse;
      if (!dish) {
        if (st.s.set.length) {
          // already laid — just take a seat
          var c0 = nearestChair(st, H);
          if (c0) { H.seated = c0; H.player.x = c0.x + c0.w / 2; H.player.y = c0.y + c0.h / 2 + 4; }
          else say('Pull up a chair!');
        } else say('Cook something first!');
        return;
      }
      if (st.s.set.length >= 3) { say('The table is full!'); return; }
      if (G().state.plates.stored > 0) G().state.plates.stored--;
      W.hands.drop();
      st.s.set.push(dish);
      st.s.biteStage = 0;
      // placing dinner sits you straight down — but eating waits for you
      var ch = nearestChair(st, H);
      if (ch) {
        H.seated = ch;
        H.player.x = ch.x + ch.w / 2;
        H.player.y = ch.y + ch.h / 2 + 4;
        say('Dinner is served! Z to eat, A to call everyone.');
      } else {
        say('Dinner is served! Find a chair.');
      }
      if (W.audio) W.audio.play('clack');
    },
    drawOn: function (ctx, st) {
      for (var i = 0; i < st.s.set.length; i++) {
        var px2 = st.x + 18 + i * 32, py2 = st.y - 18 - (i % 2) * 6;
        plate(ctx, px2, py2 + 4);
        // the top dish visibly shrinks as it's eaten, crumbs and all
        var stage = (i === 0 && st.s.biteStage) ? st.s.biteStage : 0;
        if (stage < 3) {
          W.drawItem(ctx, st.s.set[i], px2, py2 - 4, 11 - stage * 3);
          for (var cb = 0; cb < stage; cb++) {
            C.dot(ctx, px2 - 8 + cb * 8, py2 + 4, 1.6, '#8A5F38', 'crumb' + i + cb);
          }
        } else {
          C.dot(ctx, px2 - 4, py2 + 2, 1.8, '#8A5F38', 'cr1' + i);
          C.dot(ctx, px2 + 5, py2 + 4, 1.6, '#8A5F38', 'cr2' + i);
        }
      }
    }
  };

  /* The chair nearest a table that nobody has claimed. */
  function nearestChair(table, H) {
    var best = null, bd = 1e9;
    for (var i = 0; i < H.stations.length; i++) {
      var c = H.stations[i];
      if (c.kind !== 'chair' || c.s.taker) continue;
      var d = Math.hypot((c.x + c.w / 2) - (table.x + table.w / 2),
                         (c.y + c.h / 2) - (table.y + table.h / 2));
      if (d < bd) { bd = d; best = c; }
    }
    return bd < 220 ? best : null;
  }

  /* Chairs are for sitting — the eat action lives on the seated state. */
  S.chair = {
    label: 'Sit Down',
    /* `taker` marks who is sitting there DURING a dinner. It lives in the
     * persistent bucket, so if the player wandered off mid-invite (or saved
     * and quit), a stale marker would leave the chair "Taken!" forever —
     * clear it whenever the room is rebuilt. */
    init: function (st) { st.s.taker = null; },
    prompt: function (st) { return st.s.taker ? 'Taken!' : 'Sit Down'; },
    act: function (st) {
      var H = W.sceneHouse;
      if (st.s.taker) { say('Somebody is already sitting there!'); return; }
      H.seated = st;
      H.player.x = st.x + st.w / 2;
      H.player.y = st.y + st.h / 2 + 4;
      say('Comfy!');
    }
  };


  S.sink = {
    label: 'Sink',
    icon: 'bubbles',
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
    icon: 'cleanPlate',
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
    icon: 'star',
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
    icon: 'moon',
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

  // the treehouse's knot-hole opens exactly like a window
  S.roundWindow = {
    label: 'Open the Knot-Hole',
    icon: 'bubbles',
    prompt: function (st) { return st.s.open ? 'Close the knot-hole' : 'Open the knot-hole'; },
    act: function (st) { S.window.act(st); },
    update: function (st, dt) { S.window.update(st, dt); }
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
    icon: 'star',
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
    icon: 'star',
    act: function () { G().pushOverlay('closet'); }
  };

  S.crystalShelf = {
    label: 'Trophy Case',
    icon: 'crystal',
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
    icon: 'cake',
    label: 'Snacks',
    act: function (st) {
      var bump4 = W.hands.hold('boba');
      if (bump4) W.dropped.dropItem(G().state.room, bump4, W.sceneHouse.player.x, W.sceneHouse.player.y);
      st.s.rustle = 1.2;
    },
    update: function (st, dt) { if (st.s.rustle > 0) st.s.rustle -= dt; }
  };

  S.beanbag = {
    label: 'Flop Down',
    icon: 'moon',
    prompt: function () { return 'Flop down'; },
    act: function (st) { W.sceneHouse.mount('flop', st); }
  };

  /* The garden: plant seeds, water once a day, harvest after two mornings.
   * Same daily-gate pattern as the rocks — chores that respect the clock. */
  var CROPS = ['tomato', 'onion', 'mushroom'];
  S.garden = {
    label: 'Garden',
    icon: function (st) {
      if (st.s.stage < 0) return 'hoe';
      if (st.s.stage === 0) return 'seeds';
      if (st.s.stage >= 3) return st.s.crop || 'tomato';
      return 'wateringCan';
    },
    // -1 is rough sod: every plot starts as lawn and has to be broken first.
    init: function (st) { if (st.s.stage === undefined) st.s.stage = -1; },
    prompt: function (st) {
      if (st.s.plow > 0) return 'Plowing...';
      if (st.s.stage < 0) return W.hands.has('hoe') ? 'Plow the soil' : 'Rough sod (need the hoe)';
      if (st.s.stage === 0) return W.hands.has('seeds') ? 'Plant the seeds' : 'Needs seeds (grocery!)';
      if (st.s.stage >= 3) return 'Harvest!';
      if (st.s.water > 0) return 'Growing...';
      if (!W.hands.has('wateringCan')) return 'Thirsty (need the can)';
      return G().state.canWater > 0 ? 'Water the plants' : 'The can is empty';
    },
    act: function (st) {
      var G2 = G();
      if (st.s.plow > 0) return;

      if (st.s.stage < 0) {
        if (!W.hands.has('hoe')) { say('This ground is hard! I need the hoe from the rack.'); return; }
        st.s.plow = 1.1;
        say('Chop chop chop!');
        if (W.audio) W.audio.play('thud');
        return;
      }
      if (st.s.stage === 0) {
        if (!W.hands.has('seeds')) { say('I need seeds — the grocery store sells them!'); return; }
        W.hands.drop();
        st.s.stage = 1;
        st.s.crop = CROPS[Math.floor(W.mulberry32(W.hash('crop' + G2.state.day + st.idx))() * CROPS.length)];
        say('Planted! Water it and watch it grow.');
        if (W.audio) W.audio.play('clack');
        return;
      }
      if (st.s.stage >= 3) {
        if (W.tray.full()) { say('The tray is full!'); return; }
        W.tray.add(st.s.crop);
        W.tray.add(st.s.crop);              // a generous harvest, if it fits
        say('A ' + W.ITEMS[st.s.crop].name + ' harvest! Fresh for cooking.');
        W.fx.sparkle(st.x + st.w / 2, st.y + 10, 12, 60);
        st.s.stage = 0;
        st.s.crop = null;
        G2.first('garden', 'First harvest!');
        G2.idea('cook');
        if (W.audio) W.audio.play('ding');
        return;
      }
      if (st.s.water > 0) { say('Glug glug... look at it go!'); return; }
      if (!W.hands.has('wateringCan')) { say('I need the watering can from the rack.'); return; }
      if (G2.state.canWater <= 0) { say('The can is empty — fill it at the spigot!'); return; }
      G2.state.canWater--;
      st.s.water = 1.3;
      if (W.audio) W.audio.play('water');
    },
    update: function (st, dt) {
      if (st.s.plow > 0) {
        st.s.plow -= dt;
        if (Math.random() < 0.5) W.fx.dust(st.x + 10 + Math.random() * 50, st.y + 30, 1);
        if (st.s.plow <= 0) {
          st.s.stage = 0;
          W.requestRebuild(W.sceneHouse.name);
          say('Lovely soil! Ready for seeds.');
          if (W.audio) W.audio.play('ding');
        }
      }
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

  /* The rack by the fence: hands out the tool the garden NEEDS right now,
   * and keeps whatever you were holding safe on its shelf — nothing is
   * ever silently dumped on the grass. */
  function gardenNeedsHoe() {
    var any = false;
    W.sceneHouse.stations.forEach(function (q) {
      if (q.kind === 'garden' && q.s.stage < 0) any = true;
    });
    return any;
  }

  S.toolRack = {
    label: 'Tool Rack',
    icon: function () {
      if (W.hands.kind() === 'tool') return W.hands.item();
      return gardenNeedsHoe() ? 'hoe' : 'wateringCan';
    },
    prompt: function (st) {
      var k = W.hands.kind();
      if (k === 'tool') {
        return 'Hang up the ' + W.ITEMS[W.hands.item()].name +
               (st.s.shelf ? ' (take back the ' + W.ITEMS[st.s.shelf].name + ')' : '');
      }
      return gardenNeedsHoe() ? 'Take the hoe' : 'Take the watering can';
    },
    act: function (st) {
      if (W.hands.kind() === 'tool') {
        say('Hung up the ' + W.ITEMS[W.hands.item()].name + '.');
        W.hands.drop();
        // whatever the rack was minding comes straight back
        if (st.s.shelf) {
          W.hands.hold(st.s.shelf);
          say('And here are your ' + W.ITEMS[st.s.shelf].name.toLowerCase() + ' back!');
          st.s.shelf = null;
        }
        if (W.audio) W.audio.play('clack');
        return;
      }
      var give = gardenNeedsHoe() ? 'hoe' : 'wateringCan';
      var held0 = W.hands.item();
      if (held0) {
        // the shelf minds ONE thing; anything already there goes back first
        if (st.s.shelf) W.dropped.dropItem(W.sceneHouse.name, st.s.shelf, st.x + 10, st.y + 50);
        st.s.shelf = held0;
        W.hands.drop();
        say('The rack will mind your ' + W.ITEMS[held0].name.toLowerCase() + '.');
      }
      W.hands.hold(give);
      say(give === 'hoe'
        ? 'The hoe! Good for breaking up sod.'
        : 'The watering can. Fill it at the spigot.');
    }
  };

  /* The garden tap. Three waterings per fill. */
  S.spigot = {
    label: 'Spigot',
    icon: 'wateringCan',
    prompt: function () {
      if (!W.hands.has('wateringCan')) return 'A garden tap (need the can)';
      return G().state.canWater >= 3 ? 'The can is full' : 'Fill the can';
    },
    act: function (st) {
      if (!W.hands.has('wateringCan')) { say('I need the watering can first!'); return; }
      if (G().state.canWater >= 3) { say('It is already full to the brim.'); return; }
      G().state.canWater = 3;
      say('Sloosh! Three good waterings in there.');
      for (var i = 0; i < 6; i++) W.fx.bubble(st.x + 8 + i * 6, st.y + 20);
      if (W.audio) W.audio.play('water');
    }
  };
  var gardenTiles = null;

  /* Seeds for sale at the shop. */
  /* The decor catalog: buy a piece, it appears in the chosen room's next
   * free decor spot. Rooms and props are data, so this is nearly free. */
  S.decorShop = {
    icon: 'star',
    label: 'Decor Catalog',
    act: function () { G().pushOverlay('decorshop'); }
  };

  S.treatStand = {
    label: 'Pet Treats — 2 coins',
    icon: 'treat',
    prompt: function () {
      return W.pets.any() ? 'Pet Treats — 2 coins' : 'Treats (for future pets)';
    },
    act: function () {
      if (!W.pets.any()) { say('First adopt a pet at the park!'); return; }
      if (G().state.money < 2) { say('Treats cost 2 coins.'); return; }
      G().state.money -= 2;
      var bump2 = W.hands.hold('treat');
      if (bump2) W.dropped.dropItem(G().state.room, bump2, W.sceneHouse.player.x, W.sceneHouse.player.y);
      say('One wiggly treat!');
      if (W.audio) W.audio.play('coin');
    }
  };

  S.seedStand = {
    label: 'Seeds — 3 coins',
    icon: 'seeds',
    act: function () {
      if (G().state.money < 3) { say('Seeds cost 3 coins. Do a shift!'); return; }
      G().state.money -= 3;
      var bump1 = W.hands.hold('seeds');
      if (bump1) W.dropped.dropItem(G().state.room, bump1, W.sceneHouse.player.x, W.sceneHouse.player.y);
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
    icon: 'hammer',
    locked: function () { return !G().state.builtTreehouse && !W.can('build'); },
    /* NOTE: no `requires` — that gated the finished treehouse's "Climb up"
     * too, locking every costume but the builder out of their own clubhouse.
     * Only the BUILD branch checks the ability. */
    prompt: function () {
      if (G().state.builtTreehouse) return 'Climb up';
      return W.can('build') ? 'Build a Treehouse' : 'Need: Builder Bobby';
    },
    act: function (st) {
      if (G().state.builtTreehouse) {
        G().fadeTo('house', { room: 'treehouse' });
        return;
      }
      if (!W.can('build')) {
        say('I need the Builder outfit to build this. Try the magic closet!');
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
          // the tree lives wherever its room says it does — a hardcoded
          // 'outside' left the backyard un-rebuilt and the treehouse unseen
          W.requestRebuild(st.room);
        }
      }
    },
    drawOn: function (ctx, st) {
      if (st.s.building > 0) bar(ctx, st.x + st.w / 2, st.y - 100, 110, 1 - st.s.building / 2.6, PAL.sun, 'Building');
    }
  };

  /* The adoption box — one fluffy friend for life. */
  var PET_NAMES = ['Mochi', 'Biscuit', 'Nugget', 'Waffles', 'Pudding'];
  /* Warmland 2's dino box: same shape, a very different pet. */
  var DINO_NAMES = ['Cracker', 'Chomper', 'Nibbles'];
  S.dinoBox = {
    label: 'Free Dinos',
    icon: 'heart',
    prompt: function () {
      return W.pets.get('cracker') ? 'He found his home!' : 'Adopt a baby dino!';
    },
    act: function (st) {
      if (W.pets.get('cracker')) { say(W.pets.get('cracker').name + ' is happy with you.'); return; }
      var dn = DINO_NAMES[Math.floor(W.mulberry32(W.hash('dino' + G().state.day))() * DINO_NAMES.length)];
      W.pets.adopt('cracker', dn);
      W.fx.hearts(st.x + st.w / 2, st.y - 40, 8);
      G().showBanner('MEET ' + dn.toUpperCase() + '!', 'A baby dino of your very own!');
      G().first('dino', 'Adopted ' + dn + '!');
      if (W.audio) W.audio.play('win');
      W.requestRebuild(G().state.room);
    }
  };

  S.petBox = {
    label: 'Free Fluffs',
    prompt: function () {
      return W.pets.get('mochi') ? 'Everyone found homes!' : 'Adopt a fluff!';
    },
    act: function (st) {
      if (W.pets.get('mochi')) { say(W.pets.get('mochi').name + ' is glad to have a home.'); return; }
      var name = PET_NAMES[Math.floor(W.mulberry32(W.hash('pet' + G().state.day))() * PET_NAMES.length)];
      W.pets.adopt('mochi', name);
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
    icon: 'fish',
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
        var caught = roll < 0.62 ? 'fish' : roll < 0.82 ? 'boot' : 'tinyUfo';
        var bump3 = W.hands.hold(caught);
        if (bump3) W.dropped.dropItem(G().state.room, bump3, W.sceneHouse.player.x, W.sceneHouse.player.y);
        if (roll < 0.62) {
          say('A fish! Dinner sorted.', '#5FA8D6');
          G().first('fish', 'First catch!');
        } else if (roll < 0.82) {
          say('...an old boot. Classic.', PAL.woodDk);
          G().first('boot', 'Caught... a boot?');
        } else {
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
      if (v.requires && !W.can(v.requires)) return 'Need the ' + suitTitle(v.requires);
      return 'Ride the ' + v.name;
    },
    act: function (st) {
      var v = W.VEHICLES[st.vehicle];
      if (v.requires && !W.can(v.requires)) {
        say('I need the ' + suitTitle(v.requires) + ' for this.');
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

  /* "Boba Cart" / "Lemonade Wagon", title-cased for a prompt. */
  function standTitle() {
    return W.standName().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  S.cartPitch = {
    label: 'Set Up the Cart',
    icon: 'boba',
    stopWith: 'back',
    prompt: function () {
      if (!W.can('transform')) return 'A ' + W.standName() + ' could go here';
      return G().state.job ? 'X stop working' : 'Set Up the ' + standTitle();
    },
    act: function () {
      if (!W.can('transform')) {
        say('The ' + W.suitName('mech') + ' can turn into a ' + W.standName() + '!');
        return;
      }
      if (G().state.job) {
        say('Doing great — ' + W.service.served() + ' served!');
        return;
      }
      G().state.mechForm = 'cart';
      G().startJob(W.heroChar() === 'butterball' ? 'lemonade' : 'bobaCart');
    }
  };

  // ------------------------------------------------------- the campsite

  var flameTiles = null;
  function flameTile(ph) {
    if (!flameTiles) {
      flameTiles = [];
      for (var p = 0; p < 3; p++) {
        var cv = W.crayon.offscreen(90, 110);
        var g = cv.getContext('2d');
        g.translate(45, 90);
        var lean = (p - 1) * 5;
        C.poly(g, [[-22, 4], [0 + lean, -62 - p * 4], [22, 4]], {
          seed: 'fl' + p, fill: '#E8834E', stroke: null, hatch: 3.4, wash: 0.85, fillAlpha: 0.8
        });
        C.poly(g, [[-13, 4], [2 + lean, -42 - p * 3], [13, 4]], {
          seed: 'fm' + p, fill: '#F2C14E', stroke: null, hatch: 3, wash: 0.9, fillAlpha: 0.85
        });
        C.poly(g, [[-6, 4], [1 + lean, -22], [6, 4]], {
          seed: 'fi' + p, fill: '#FFF6E0', stroke: null, hatch: 2.6, wash: 0.9, fillAlpha: 0.8
        });
        flameTiles[p] = cv;
      }
    }
    return flameTiles[ph];
  }

  S.firepit = {
    label: 'Campfire',
    icon: 'flame',
    init: function (st) { if (!st.s.toast) st.s.toast = 0; },
    prompt: function (st) {
      if (!(G().state.builds || {}).camp) return 'Pitch the tent first!';
      if (!st.s.lit) return 'Light the campfire';
      if (st.s.toast > 0) return 'Toasting...';
      if (W.hands.has('stick')) return 'Toast a marshmallow';
      if (W.hands.has('smore')) return 'Eat it by the fire!';
      var night = G().state.lights[st.room] === false;
      if (!night) { st.key2 = 'X'; st.label2 = 'settle down for the night'; }
      return night ? 'Cosy fire (grab a stick!)' : 'Cosy fire';
    },
    /* X by a lit fire draws the night in — and pulls it back at dawn. */
    onBack: function (st) {
      if (!st.s.lit) return false;
      var L = G().state.lights;
      var night = L[st.room] === false;
      L[st.room] = night ? true : false;
      if (night) {
        say('Morning already! Look at that sunshine.');
      } else {
        say('Everyone settle in... look at all those stars.', '#9FE8C4');
        W.sceneHouse.npcs.forEach(function (n) {
          if (n.friendKey) n.says('oooooh...', 3);
        });
      }
      if (W.audio) W.audio.play(night ? 'blip' : 'lullaby');
      return true;
    },
    act: function (st) {
      // the marshmallows are a campsite thing, not a random-fire thing
      if (!(G().state.builds || {}).camp) {
        say('Pitch the tent at the tent spot first — then we can have a fire.');
        return;
      }
      if (!st.s.lit) {
        st.s.lit = true;
        say('Whoosh! A proper campfire. Press X to settle down for the night.');
        W.fx.sparkle(st.x + st.w / 2, st.y, 12, 60);
        G().first('campfire', 'First campfire!');
        if (W.audio) W.audio.play('cook');
        return;
      }
      if (st.s.toast > 0) return;
      if (W.hands.has('smore')) { eatSmore(st); return; }
      if (!W.hands.has('stick')) { say('There are sticks by the fire — grab one!'); return; }
      st.s.toast = 3;
      say('Hold it steady... not too close...');
      // friends toast their own alongside
      W.sceneHouse.npcs.forEach(function (n) {
        if (!n.friendKey) return;
        if (Math.hypot(n.x - st.x, n.y - st.y) > 240) return;
        n.mode = 'goto';
        n.data.tx = st.x + st.w / 2 + (Math.random() - 0.5) * 120;
        n.data.ty = st.y + st.h + 30;
        n.data.tol = 12;
        n.says('Me too! Me too!', 2.6);
      });
    },
    update: function (st, dt) {
      if (!(st.s.toast > 0)) return;
      st.s.toast -= dt;
      if (Math.random() < dt * 6) W.fx.sparkle(st.x + st.w / 2, st.y + 6, 1, 30);
      if (st.s.toast > 0) return;
      st.s.toast = 0;
      W.hands.hold('smore');
      say("Golden brown! One S'more, ready to eat.");
      if (W.audio) W.audio.play('ding');
    },
    drawOn: function (ctx, st) {
      if (!st.s.lit) return;
      var ph = Math.floor(W.game.t * 9) % 3;
      ctx.drawImage(flameTile(ph), st.x + st.w / 2 - 45, st.y - 46);
      if (Math.random() < 0.08) W.fx.sparkle(st.x + st.w / 2 + (Math.random() - 0.5) * 20, st.y - 30, 1, 20);
    }
  };

  function eatSmore(st) {
    W.hands.drop();
    say("Mmmm! Sticky, melty, perfect.");
    W.fx.hearts(W.sceneHouse.player.x, W.sceneHouse.player.y - 80, 5);
    G().first('smore', "First s'more!");
    W.sceneHouse.npcs.forEach(function (n) {
      if (n.friendKey && Math.hypot(n.x - st.x, n.y - st.y) < 240) n.says('Yum!', 2.2);
    });
    if (W.audio) { W.audio.play('chomp'); W.audio.play('aaah'); }
  }

  S.stickPile = {
    label: 'Sticks',
    icon: 'stick',
    prompt: function () {
      if (!(G().state.builds || {}).camp) return 'Sticks (pitch the tent first)';
      if (W.hands.has('stick')) return 'Already got one!';
      return 'Take a marshmallow stick';
    },
    act: function (st) {
      if (!(G().state.builds || {}).camp) { say('Let us set up camp first!'); return; }
      if (W.hands.has('stick')) { say('One stick is plenty.'); return; }
      var bumped = W.hands.hold('stick');
      if (bumped) W.dropped.dropItem(W.sceneHouse.name, bumped, st.x + 8, st.y + 40);
      say('A stick with a marshmallow on the end. Now for the fire!');
    }
  };

  /* Pitching the tent is a one-off — after that it is simply there. */
  S.campSetup = {
    label: 'Pitch a Tent',
    icon: 'tent',
    prompt: function (st) {
      if ((G().state.builds || {}).camp) return 'A cosy camp';
      return st.s.pitch > 0 ? 'Pitching...' : 'Pitch the tent';
    },
    act: function (st) {
      if ((G().state.builds || {}).camp) { say('Home from home!'); return; }
      if (st.s.pitch > 0) return;
      st.s.pitch = 2.2;
      say('Poles in... canvas over... nearly...');
      if (W.audio) W.audio.play('clack');
    },
    update: function (st, dt) {
      if (!(st.s.pitch > 0)) return;
      st.s.pitch -= dt;
      if (st.s.pitch > 0) return;
      st.s.pitch = 0;
      G().state.builds.camp = true;
      W.requestRebuild('mountain');
      G().showBanner('CAMP SET UP!', 'Sleep under the stars!');
      if (W.audio) W.audio.play('win');
    }
  };

  // ------------------------------------------------------- builder jobs

  /* Shared: a hammering bar, then whatever the job produces. */
  function buildJob(st, secs, line) {
    st.s.building = secs;
    say(line);
    if (W.audio) W.audio.play('hammer');
  }

  S.swingRide = {
    label: 'Swings',
    icon: 'heart',
    locked: function () { return !(G().state.builds || {}).swing && !W.can('build'); },
    prompt: function (st) {
      if (st.s.building > 0) return 'Fixing it up...';
      if (!(G().state.builds || {}).swing) {
        return W.can('build') ? 'Fix the swing set!' : 'Broken (needs a Builder)';
      }
      return 'Swing!';
    },
    act: function (st) {
      var G2 = G();
      if (st.s.building > 0) return;
      if (!(G2.state.builds || {}).swing) {
        if (!W.can('build')) { say('This is a job for Builder Bobby.'); return; }
        buildJob(st, 2.6, 'Bang bang! Let us get this swinging again.');
        return;
      }
      W.sceneHouse.mount('swing', st);
    },
    update: function (st, dt) {
      if (st.s.building > 0) {
        st.s.building -= dt;
        if (Math.random() < 0.5) W.fx.dust(st.x + 20 + Math.random() * 80, st.y + 10, 1);
        if (st.s.building <= 0) {
          G().state.builds.swing = true;
          W.requestRebuild('park');
          G().showBanner('SWINGS FIXED!', 'Room for two!');
          G().first('fixswing', 'First repair!');
          if (W.audio) W.audio.play('win');
        }
      }
    }
  };

  S.seesawRide = {
    label: 'See-Saw',
    icon: 'heart',
    locked: function () { return !(G().state.builds || {}).seesaw && !W.can('build'); },
    prompt: function (st) {
      if (st.s.building > 0) return 'Building...';
      if (!(G().state.builds || {}).seesaw) {
        return W.can('build') ? 'Build a see-saw!' : 'An empty spot (needs a Builder)';
      }
      return W.sceneHouse.follower() ? 'See-saw together!' : 'Needs a friend on the other end';
    },
    act: function (st) {
      var G2 = G();
      if (st.s.building > 0) return;
      if (!(G2.state.builds || {}).seesaw) {
        if (!W.can('build')) { say('I would need the Builder outfit for this.'); return; }
        buildJob(st, 2.6, 'One plank, one log — see-saw!');
        return;
      }
      if (!W.sceneHouse.follower()) {
        say('A see-saw needs two! Say Trix to a friend and bring them along.');
        return;
      }
      W.sceneHouse.mount('seesaw', st);
    },
    update: function (st, dt) {
      if (st.s.building > 0) {
        st.s.building -= dt;
        if (Math.random() < 0.5) W.fx.dust(st.x + 30 + Math.random() * 80, st.y + 10, 1);
        if (st.s.building <= 0) {
          G().state.builds.seesaw = true;
          W.requestRebuild('park');
          G().showBanner('SEE-SAW BUILT!', 'Bring a friend!');
          if (W.audio) W.audio.play('win');
        }
      }
    }
  };

  /* The arcade tent's doorway — a Z like the rides beside it, rather than a
   * mat you have to notice you are standing on. */
  S.arcadeDoor = {
    label: 'The Arcade',
    icon: 'star',
    prompt: function () { return 'Go into the arcade'; },
    act: function () {
      if (W.audio) W.audio.play('doorpop');
      G().fadeTo('house', { room: 'arcade', spawn: [480, 500] });
    }
  };

  /* Webs' bar. He mixes one thing, and it is very good. */
  /* The bar keeps pouring whether or not Webs is behind it — the lab is
   * full of the stuff, and a kid who took him along should never come back
   * to a locked door. */
  S.potionBar = {
    label: 'Ask Webs for a Potion',
    icon: 'potion',
    prompt: function () {
      if (W.hands.has('potion')) return 'Drink the potion!';
      if (!W.hands.empty()) return 'Hands full — put something down first';
      return W.sceneHouse.websHere() ? 'Ask Webs for a potion' : 'Help yourself to a potion';
    },
    act: function () {
      // standing at the bar holding one? then Z drinks it, rather than
      // telling you to press Z somewhere else
      W.sceneHouse.pourPotion(W.sceneHouse.websHere());
    }
  };

  /* An arcade cabinet: four old favourites, one press each. */
  var CAB_NAMES = { lob: 'Boba Lob', bounce: 'Boba Bounce',
                    hop: 'Road Hop', chain: 'Pearl Chain' };
  S.arcadeCab = {
    label: 'Arcade Game',
    icon: 'star',
    prompt: function (st) {
      var best = (G().state.arcade || {})[st.game] || 0;
      return 'Play ' + (CAB_NAMES[st.game] || 'a game') + (best ? '  (best ' + best + ')' : '');
    },
    act: function (st) { G().fadeTo('arcade', { game: st.game }); }
  };

  /* The coaster: build it if you can build, ride it whoever you are. */
  S.coaster = {
    label: 'Roller Coaster',
    icon: 'hammer',
    prompt: function (st) {
      var have = (G().state.coaster || []).length;
      if (!have) {
        return W.can('build') ? 'Build a roller coaster!' : 'A coaster deck (needs a Builder)';
      }
      if (!W.can('build')) return 'Ride the coaster!';
      st.key2 = 'X';
      st.label2 = 'rebuild it';
      return 'Ride it!';
    },
    onBack: function () {
      if (!W.can('build')) return false;
      G().fadeTo('coaster', { mode: 'build' });
      return true;
    },
    act: function () {
      var have = (G().state.coaster || []).length;
      if (!have) {
        if (!W.can('build')) { say('A Builder could put a coaster together here!'); return; }
        G().fadeTo('coaster', { mode: 'build' });
        return;
      }
      G().fadeTo('coaster', { mode: 'ride' });
    }
  };

  /* The merry-go-round: anyone can ride, and a friend hops on too. */
  S.carousel = {
    label: 'Teacup Ride',
    icon: 'boba',
    prompt: function () { return 'Ride the spinning teacups!'; },
    act: function (st) { W.sceneHouse.mount('carousel', st); }
  };

  /* A den in the living room, so the quiet critters can move in. */
  S.critterBox = {
    label: 'Critter Box',
    icon: 'heart',
    /* The snoozers are drawn by the box itself, tucked into the three round
     * doorways — their (hidden) actors just stand nearby so A can reach. */
    drawOn: function (ctx, st) {
      if (!(G().state.builds || {}).critterBox) return;
      var prop = null;
      W.effectiveProps(st.room).forEach(function (p) {
        if (p.kind === 'critterBox') prop = p;
      });
      if (!prop) return;
      W.sceneHouse.npcs.forEach(function (n) {
        if (!n.data.atBox) return;
        var slot = n.data.boxSlot || 0;
        W.drawChar(ctx, prop.x + 22 + slot * 26, prop.y - 4, {
          char: n.char, tint: n.tint, dir: 'down', t: 0,
          scale: 0.5, noShadow: true
        });
      });
    },
    locked: function () { return !(G().state.builds || {}).critterBox && !W.can('build'); },
    prompt: function (st) {
      if (st.s.building > 0) return 'Building...';
      if (!(G().state.builds || {}).critterBox) {
        return W.can('build') ? 'Build a critter box' : 'A cosy corner (needs a Builder)';
      }
      return 'Peek inside';
    },
    act: function (st) {
      var G2 = G();
      if (st.s.building > 0) return;
      if (!(G2.state.builds || {}).critterBox) {
        if (!W.can('build')) { say('Builder Bobby could make something here.'); return; }
        buildJob(st, 2.4, 'A snug little house for the fluffiest friends.');
        return;
      }
      var home = critterCount();
      if (home === 0) {
        say('Empty! Say Trix to the quiet critters at the park and lead them here.');
      } else if (home < 3) {
        say(home + ' quiet critter' + (home > 1 ? 's' : '') + ' snoozing... room for ' +
            (3 - home) + ' more!');
        W.fx.hearts(st.x + st.w / 2, st.y - 40, home);
      } else {
        say('Three little snoozes. Sweet dreams, little ones.');
        W.fx.hearts(st.x + st.w / 2, st.y - 40, 4);
      }
    },
    update: function (st, dt) {
      if (st.s.building > 0) {
        st.s.building -= dt;
        if (st.s.building <= 0) {
          var G3 = G();
          G3.state.builds.critterBox = true;
          // The box is EMPTY on purpose: the quiet critters live at the park until
          // somebody walks there, says Trix, leads them home and says Dee.
          // Moving your friends in is the game, not a cutscene.
          W.requestRebuild('living');
          G3.showBanner('CRITTER BOX!', 'Now go fetch the quiet critters!');
          if (W.audio) W.audio.play('cheer');
        }
      }
    }
  };

  /* How many quiet critters have actually moved into the living room. */
  function critterCount() {
    var fr = G().state.friendRooms || {};
    return ['critterA', 'critterB', 'critterC'].filter(function (k) {
      return fr[k] === 'living';
    }).length;
  }

  /* The site: each machine owns one stage, and Bobby DRIVES it — clearing,
   * pouring, lifting and smashing are his hands on the wheel, not a cutscene.
   * scene-house runs the driving (S.machineCtl); this file owns the rules. */
  var STAGE_JOB = {
    bulldozer: { stage: 0, verb: 'Clear the lot',   line: 'Vrrrooom! Push all that junk off the lot!' },
    mixer:     { stage: 1, verb: 'Pour the floor',  line: 'Drive onto the lot and hold Z to pour!' },
    crane:     { stage: 2, verb: 'Lift the walls',  line: 'Z grabs a panel — carry it over the lot and Z again!' }
  };
  var STAGE_DONE = ['The lot is clear!', 'The floor is set!', 'Walls up!', 'HOUSE COMPLETE!'];

  /* Warmland 2 builds a SKYSCRAPER on the same machinery: more crane work,
   * more floors, and a spire at the top. */
  var TOWER_JOB = {
    bulldozer: { stage: 0, verb: 'Clear the lot',    line: 'Vrrrooom! Shove all that junk clear!' },
    mixer:     { stage: 1, verb: 'Pour the base',    line: 'A tower needs a BIG base — hold Z to pour!' },
    crane:     { stage: 2, verb: 'Raise the steel',  line: 'Three girders: uprights, beams, then the bracing!' }
  };
  var TOWER_DONE = ['The lot is clear!', 'The base is set!', 'The steel is up!',
                    'THE BIG TOWER IS DONE!'];

  /* Which project a site station belongs to. */
  function projOf(st) { return st.project === 'skyscraper' ? 'skyscraper' : 'friendHouse'; }
  function jobsOf(st) { return projOf(st) === 'skyscraper' ? TOWER_JOB : STAGE_JOB; }
  function lastStage(proj) { return proj === 'skyscraper' ? 4 : 4; }
  W.lastBuildStage = lastStage;

  /* Bank one finished stage of the friends' house. */
  function advanceHouse(proj) {
    var G2 = G();
    proj = proj || 'friendHouse';
    if (proj === 'skyscraper') return advanceTower();
    G2.state.builds.friendHouse = (G2.state.builds.friendHouse || 0) + 1;
    var stage = G2.state.builds.friendHouse;
    W.requestRebuild('site');
    W.fx.sparkle(480, 340, 14, 120);
    if (stage >= 4) {
      if (!G2.state.friendRooms) G2.state.friendRooms = {};
      ['panda', 'yuna'].forEach(function (k) {
        if (G2.state.party.indexOf(k) < 0) G2.state.friendRooms[k] = 'friendhouse';
      });
      if (W.rebuildMap) W.rebuildMap('neighborhood');
      G2.showBanner('HOUSE COMPLETE!', 'Panda and Yuna move in!');
      G2.first('house', 'First house built!');
      if (W.audio) W.audio.play('win');
    } else {
      G2.showBanner(STAGE_DONE[stage - 1], 'Stage ' + stage + ' of 4');
      if (W.audio) W.audio.play('ding');
    }
  }
  W.advanceHouse = advanceHouse;

  /* One more floor on Warmland 2's skyscraper. */
  function advanceTower() {
    var G2 = G();
    G2.state.builds.skyscraper = (G2.state.builds.skyscraper || 0) + 1;
    var stage = G2.state.builds.skyscraper;
    W.requestRebuild('site2');
    W.fx.sparkle(480, 300, 16, 140);
    if (stage >= 4) {
      if (W.rebuildMap) W.rebuildMap('warmland2');
      G2.showBanner('THE BIG TOWER IS DONE!', 'You can see it from everywhere!');
      G2.first('tower', 'Built a skyscraper!');
      G2.state.money += 15;
      if (W.audio) W.audio.play('win');
    } else {
      G2.showBanner(TOWER_DONE[stage - 1], 'Stage ' + stage + ' of 4');
      if (W.audio) W.audio.play('ding');
    }
  }
  W.advanceTower = advanceTower;

  /* The wrecking ball has knocked the whole thing down. */
  function demolishHouse(proj) {
    var G2 = G();
    if (proj === 'skyscraper') {
      G2.state.builds.skyscraper = 0;
      W.requestRebuild('site2');
      if (W.rebuildMap) W.rebuildMap('warmland2');
      G2.showBanner('TIMBERRR!', 'Build it even taller!');
      say('THE WHOLE TOWER! ...again! Again!');
      W.fx.dust(470, 340, 14);
      if (W.audio) W.audio.play('boom');
      return;
    }
    G2.state.builds.friendHouse = 0;
    if (!G2.state.friendRooms) G2.state.friendRooms = {};
    ['panda', 'yuna'].forEach(function (k) {
      if (G2.state.friendRooms[k] === 'friendhouse') G2.state.friendRooms[k] = 'park';
    });
    W.requestRebuild('site');
    if (W.rebuildMap) W.rebuildMap('neighborhood');
    G2.showBanner('KABOOM!', 'Build it again!');
    say('MY ROOF! ...again! Do it again!');
    W.fx.dust(470, 360, 12);
    if (W.audio) W.audio.play('boom');
  }
  W.demolishHouse = demolishHouse;

  S.machine = {
    label: 'Machine',
    icon: 'hammer',
    locked: function () { return !W.can('build'); },
    prompt: function (st) {
      var proj = projOf(st), job = jobsOf(st)[st.machine];
      var stage = (G().state.builds || {})[proj] || 0;
      if (!W.can('build')) return 'A big ' + st.machine + ' (needs a Builder)';
      if (stage >= lastStage(proj)) return 'All finished!';
      // the tower keeps the crane busy for three stages in a row
      var wants = job.stage;
      if (proj === 'skyscraper' && st.machine === 'crane' && stage >= 2 && stage <= 3) wants = stage;
      if (stage !== wants) return 'Not this one yet';
      return 'Drive: ' + job.verb.toLowerCase();
    },
    act: function (st) {
      var G2 = G();
      if (!W.can('build')) { say('Only a Builder may drive this.'); return; }
      var proj = projOf(st), job = jobsOf(st)[st.machine];
      var stage = G2.state.builds[proj] || 0;
      if (stage >= lastStage(proj)) { say('All done! Try the wrecking ball...'); return; }
      var wants = job.stage;
      if (proj === 'skyscraper' && st.machine === 'crane' && stage >= 2 && stage <= 3) wants = stage;
      if (stage !== wants) {
        var HINTS = proj === 'skyscraper'
          ? ['First clear the lot with the bulldozer!',
             'Now the mixer, for the big base.',
             'Time for the crane and the steel frame.',
             'More floors! The crane again.',
             'Windows now — grab them from the toolbox.']
          : ['First clear the lot with the bulldozer!',
             'Now the mixer, for the floor.',
             'Time for the crane and the walls.',
             'The toolbox! Grab a roof panel.'];
        say(HINTS[Math.min(stage, HINTS.length - 1)]);
        return;
      }
      say(job.line);
      W.sceneHouse.mountMachine(st, st.machine, proj);
    }
  };

  S.wreckingBall = {
    label: 'Wrecking Ball',
    icon: 'hammer',
    locked: function () { return !W.can('build'); },
    /* The ball is not baked into the sprite — it hangs live so it can sway
     * while parked and truly swing while driven. */
    drawOn: function (ctx, st) {
      var H = W.sceneHouse;
      if (H.machineCtl && H.machineCtl.kind === 'wreckingBall') return;  // out working
      var prop = null;
      W.effectiveProps(st.room).forEach(function (p) {
        if (p.kind === 'wreckingBall') prop = p;
      });
      if (!prop || !W.drawBallChain) return;
      W.drawBallChain(ctx, prop.x + 108, prop.y - 172, Math.sin(W.game.t * 1.1) * 0.09);
    },
    prompt: function (st) {
      var proj = projOf(st);
      if (((G().state.builds || {})[proj] || 0) < lastStage(proj)) return 'Nothing to knock down (yet!)';
      return W.can('build') ? 'Drive the wrecking ball!' : 'A wrecking ball (needs a Builder)';
    },
    act: function (st) {
      var G2 = G(), proj = projOf(st);
      if ((G2.state.builds[proj] || 0) < lastStage(proj)) { say('Build it first!'); return; }
      if (!W.can('build')) { say('Only a Builder may swing this.'); return; }
      say('Drive up close and press Z to SWING!');
      W.sceneHouse.mountMachine(st, 'wreckingBall', proj);
    }
  };

  /* The toolbox: the roof goes on by hand — grab a panel, carry it to the
   * house, nail it down. Three trips. */
  S.machineToolbox = null; // (roof is on foot; see S.toolbox + houseDoor)
  S.toolbox = {
    label: 'Toolbox',
    icon: function (st) {
      return projOf(st) === 'skyscraper' ? 'windowPanel' : 'roofPanel';
    },
    locked: function () { return !W.can('build'); },
    prompt: function (st) {
      var proj = projOf(st), tower = proj === 'skyscraper';
      var stage = (G().state.builds || {})[proj] || 0;
      var want = 3;
      var thing = tower ? 'window' : 'roof panel';
      var part = tower ? 'windowPanel' : 'roofPanel';
      if (!W.can('build')) return 'A toolbox (needs a Builder)';
      if (stage >= lastStage(proj)) return 'All finished!';
      if (stage !== want) return tower ? 'Not yet — steel first!' : 'Not yet — walls first!';
      if (W.hands.has(part)) return 'Got one! Take it over there';
      return 'Grab a ' + thing;
    },
    act: function (st) {
      var G2 = G(), proj = projOf(st), tower = proj === 'skyscraper';
      if (!W.can('build')) { say('A Builder needs to do this bit.'); return; }
      var stage = G2.state.builds[proj] || 0;
      var want = 3, part = tower ? 'windowPanel' : 'roofPanel';
      if (stage >= lastStage(proj)) { say('All done! Try the wrecking ball...'); return; }
      if (stage !== want) { say(tower ? 'The steel is not up yet.' : 'The walls are not up yet.'); return; }
      if (W.hands.has(part)) { say('One at a time! Off you go.'); return; }
      var bumped = W.hands.hold(part);
      if (bumped) W.dropped.dropItem(W.sceneHouse.name, bumped, st.x + 10, st.y + 46);
      if (!st.s.nails) st.s.nails = 0;
      say((tower ? 'Window ' : 'Roof panel ') + (st.s.nails + 1) +
          ' of 3 — carry it over!');
      if (W.audio) W.audio.play('pickup');
    }
  };

  /* The front door doubles as the nailing spot while the roof goes on. */
  S.houseDoor = {
    label: 'Front Door',
    prompt: function (st) {
      var proj = projOf(st), tower = proj === 'skyscraper';
      var stage = (G().state.builds || {})[proj] || 0;
      var want = 3, part = tower ? 'windowPanel' : 'roofPanel';
      if (stage === want && W.hands.has(part)) return 'Fit it on!';
      if (stage >= lastStage(proj)) return tower ? 'Ride the lift up!' : 'Knock on the door';
      return tower
        ? ['An empty lot', 'A cleared lot', 'A big concrete base',
           'Needs windows (see the toolbox)'][Math.min(stage, 3)]
        : ['An empty lot', 'A bare slab', 'Four walls, no roof',
           'Needs its roof (see the toolbox)'][stage];
    },
    act: function (st) {
      var G2 = G(), proj = projOf(st), tower = proj === 'skyscraper';
      var stage = G2.state.builds[proj] || 0;
      var wantStage = 3, part2 = tower ? 'windowPanel' : 'roofPanel';
      if (stage === wantStage && W.hands.has(part2)) {
        W.hands.drop();
        var tb = W.sceneHouse.stations.filter(function (q) { return q.kind === 'toolbox'; })[0];
        var bucket = tb ? tb.s : st.s;
        bucket.nails = (bucket.nails || 0) + 1;
        W.fx.dust(st.x + st.w / 2 + (Math.random() - 0.5) * 80, st.y - 60, 4);
        if (W.audio) W.audio.play('hammer');
        if (bucket.nails >= 3) {
          bucket.nails = 0;
          advanceHouse(proj);
        } else {
          // another band of glass goes in, so the tower visibly fills up
          if (tower) W.requestRebuild(W.sceneHouse.name);
          say('Bang bang! ' + bucket.nails + ' of 3 on. More to fetch!');
        }
        return;
      }
      if (stage < lastStage(proj)) { say('Not finished yet!'); return; }
      if (tower) {
        say('Wheee — all the way to the top! What a view!');
        W.fx.sparkle(st.x + st.w / 2, st.y - 200, 20, 160);
        G2.first('towertop', 'To the top of the tower!');
        return;
      }
      G2.fadeTo('house', { room: 'friendhouse' });
    }
  };

  // ------------------------------------------------------------- plumbing

  /* Build the live station list for a room, wiring each to its persistent
   * state bucket. */
  W.buildStations = function (roomName) {
    var room = W.ROOMS[roomName];
    if (!room.stations) return [];
    var all = W.game.state.stations;
    // the machines belong to a site under construction; the wrecking ball
    // only turns up once there is a building to knock down. Filter AFTER
    // the index is fixed, so a station's saved state never shifts under it.
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
    }).filter(W.siteGear);
  };

  /* What to call the outfit an ability needs — the same words for whoever
   * is playing ("the Chef Outfit", not "Chef Bobby"). */
  function suitTitle(ability) {
    return W.suitName(suitKeyFor(ability));
  }

  /* Which suit grants an ability — as a suit KEY, for the hat glyphs. */
  function suitKeyFor(ability) {
    var keys = Object.keys(W.SUITS || {});
    for (var i = 0; i < keys.length; i++) {
      var su = W.SUITS[keys[i]];
      if (su.abilities && su.abilities.indexOf(ability) >= 0) return keys[i];
    }
    return 'chef';
  }

  /* What the [Z] prompt should read, or null if this station is gated. */
  W.stationPrompt = function (st) {
    var d = st.def;
    if (d.requires && !W.can(d.requires)) {
      // the picture of the hat says what the words can't (yet)
      return { text: 'Need: ' + suitTitle(d.requires), locked: true,
               icon: 'suit:' + suitKeyFor(d.requires) };
    }
    st.key2 = null; st.label2 = null;      // a prompt() may set these
    var text = d.prompt ? d.prompt(st) : (st.label || d.label || 'Use');
    var icon = typeof d.icon === 'function' ? d.icon(st) : d.icon;
    // some stations are only PARTLY suit-gated (the tree: building needs the
    // hard hat, climbing the finished treehouse does not)
    var lk = d.locked ? !!d.locked(st) : false;
    if (lk && d.requires === undefined) {
      // partly-gated stations that are locked right now also show the hat
      icon = 'suit:builder';
    }
    // a station whose X does something of its own gets a second keycap,
    // rather than spelling "[X]" out inside the label
    return { text: text, locked: lk, icon: icon,
             key2: st.key2 || null, label2: st.label2 || null };
  };

  W.stationAct = function (st, player) {
    var d = st.def;
    var gated = (d.requires && !W.can(d.requires)) ||
                (d.locked && d.locked(st));
    if (gated) {
      // a locked press must never be a silent nothing: wobble the pill,
      // make the uh-uh noise, and point at the closet
      if (W.sceneHouse) W.sceneHouse.promptShake = 0.32;
      if (W.audio) W.audio.play('uhuh');
      if (d.requires && !W.can(d.requires)) {
        say('I need the ' + suitTitle(d.requires) + ' — it is in the magic closet!');
      } else if (d.act) {
        d.act(st);                 // partly-gated stations explain themselves
      }
      return;
    }
    d.act(st);
    if (W.save) W.save.auto();     // progress should never be more than one action old
  };
})(window.W);
