/* Warmland — the friends and the crowd.
 *
 * An NPC is just an Actor with a brain: a small function that returns the
 * direction it wants to move this frame. Personality lives in the chatter and
 * in how they move — Panda hops big and loud, the critters creep about.
 */
(function (W) {
  'use strict';

  var WEATHER_CHAT = {
    rainy: ['Puddle weather!', 'Drip drop drip...', 'My fur is soggy!'],
    snowy: ['SNOW DAY!', 'Brrr! Cosy though.', 'Catch a snowflake!'],
    rainbow: ['A RAINBOW!', 'Lucky day today!', 'Make a wish!']
  };

  var CHATTER = {
    loud:  ['TRIX!! Let us GO!', 'WOOOO!', 'I can do a BIG hop!', 'Race you to the pond!'],
    kind:  ['Trix, friend.', 'You look lovely today.', 'Keena Meena!', 'I saved you a flower.'],
    silly: ['Wheee!', 'Look — no feet!', 'I flew upside down once.', 'Boop!'],
    shy:   ['...trix.', '...', 'eep!', '*hides behind you*']
  };

  var STYLE = {
    loud:  { speed: 190, chat: 7 },
    kind:  { speed: 145, chat: 9 },
    silly: { speed: 165, chat: 8 },
    shy:   { speed: 120, chat: 13 }
  };

  /* Build an NPC actor for a friend key from W.FRIENDS. */
  W.makeFriend = function (key, x, y) {
    var f = W.FRIENDS[key];
    if (!f) f = { char: 'critter', name: 'Mystery', mood: PAL.accent, personality: 'shy' };
    var style = STYLE[f.personality] || STYLE.kind;
    var a = new W.Actor({
      char: f.char, tint: f.tint || null, x: x, y: y,
      speed: style.speed, mood: f.mood
    });
    a.friendKey = key;
    a.name = f.name;
    a.personality = f.personality;
    a.scale = f.char === 'critter' ? 0.75 : 1;   // pom-poms are tiny
    a.data.chatIn = 3 + Math.random() * style.chat;
    a.data.slot = 0;
    return a;
  };

  /* An anonymous park-goer: the same cup silhouette, tinted. */
  var CROWD_TINTS = ['#D9847A', '#7FBFA8', '#B49AD6', '#E8B45C', '#8FB5D6', '#D6A8C4'];
  W.makeCrowd = function (i, x, y) {
    var a = new W.Actor({
      char: 'npc', tint: CROWD_TINTS[i % CROWD_TINTS.length],
      x: x, y: y, speed: 110 + (i % 3) * 18
    });
    a.isCrowd = true;
    a.name = 'Someone';
    a.personality = 'kind';
    a.data.chatIn = 6 + Math.random() * 12;
    return a;
  };

  // ------------------------------------------------------------- the brains

  /* Amble to a random reachable spot, pause, repeat. */
  function wander(a, room, solids, dt) {
    var d = a.data;
    if (d.pause > 0) { d.pause -= dt; return [0, 0]; }
    if (!d.tx || Math.hypot(d.tx - a.x, d.ty - a.y) < 10) {
      var b = room.bounds;
      for (var tries = 0; tries < 12; tries++) {
        var nx = b.x + 24 + Math.random() * (b.w - 48);
        var ny = b.y + 12 + Math.random() * (b.h - 24);
        if (W.canStand(room, solids, nx, ny)) { d.tx = nx; d.ty = ny; break; }
      }
      d.pause = 0.6 + Math.random() * 2.4;
      return [0, 0];
    }
    var dx = d.tx - a.x, dy = d.ty - a.y;
    var len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  }

  /* Walk the player's breadcrumb trail, one slot behind the last follower,
   * so a whole party ends up in single file. */
  // (goTo lives below; the queue brain uses mode 'goto' via updateNPCs)
  function follow(a, player) {
    var t = player.trail;
    var back = (a.data.slot + 1) * 7;
    var idx = t.length - 1 - back;
    if (idx < 0) {
      // no trail yet — just close the gap directly
      var ddx = player.x - a.x, ddy = player.y - a.y;
      var dd = Math.hypot(ddx, ddy);
      if (dd < 48) return [0, 0];
      return [ddx / dd, ddy / dd];
    }
    var tgt = t[idx];
    var dx = tgt[0] - a.x, dy = tgt[1] - a.y;
    var d = Math.hypot(dx, dy);
    if (d < 7) return [0, 0];
    return [dx / d, dy / d];
  }

  function flee(a, fx, fy) {
    var dx = a.x - fx, dy = a.y - fy;
    var d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  }

  /* Walk to an assigned spot and hold it — the boba queue. */
  function goTo(a, tx, ty, tol) {
    var dx = tx - a.x, dy = ty - a.y;
    var d = Math.hypot(dx, dy);
    if (d < (tol || 8)) return [0, 0];
    return [dx / d, dy / d];
  }

  /* Advance every NPC in a room. */
  W.updateNPCs = function (npcs, room, solids, dt, player) {
    for (var i = 0; i < npcs.length; i++) {
      var a = npcs[i];
      a.update(dt);

      var v = [0, 0], run = false;

      if (a.mode === 'follow') {
        v = follow(a, player);
        // hurry if they've fallen a long way behind
        run = Math.hypot(player.x - a.x, player.y - a.y) > 150;
      } else if (a.mode === 'flee') {
        v = flee(a, a.data.fx, a.data.fy);
        run = true;
      } else if (a.mode === 'goto') {
        v = goTo(a, a.data.tx, a.data.ty, a.data.tol);
        if (v[0] === 0 && v[1] === 0 && a.data.faceDir) a.dir = a.data.faceDir;
      } else if (a.mode !== 'hold') {
        v = wander(a, room, solids, dt);
      }

      if (a.busy > 0) v = [0, 0];
      a.move(room, solids, v[0], v[1], dt, run);

      // idle chatter
      a.data.chatIn -= dt;
      if (a.isPet) {
        if (a.data.chatIn <= 0) {
          a.data.chatIn = 8 + Math.random() * 10;
          a.says(['squee', '*sniff sniff*', '!'][Math.floor(Math.random() * 3)], 1.8);
        }
        continue;
      }
      if (a.data.chatIn <= 0) {
        var style = STYLE[a.personality] || STYLE.kind;
        a.data.chatIn = style.chat + Math.random() * style.chat;
        if (!a.isCrowd && Math.random() < 0.75) {
          var wl = W.ROOMS[W.game.state.room] && W.ROOMS[W.game.state.room].outdoor &&
                   WEATHER_CHAT[W.game.state.weather];
          var lines = (wl && Math.random() < 0.4) ? wl : (CHATTER[a.personality] || CHATTER.kind);
          a.says(lines[Math.floor(Math.random() * lines.length)], 2.4);
        }
      }
    }
  };

  var CHAT_BACK = {
    loud:  ['Best day EVER!', 'You hop so fast!', 'Let us find snacks!'],
    kind:  ['I like being with you.', 'Keena Meena, friend.', 'What a nice day.'],
    silly: ['I saw a cloud shaped like you!', 'Wanna see me loop?', 'Boop boop!'],
    shy:   ['...this is nice.', '*happy wiggle*', '...trix trix.']
  };

  /* Unlocked at three friendship hearts — best-friend talk. */
  var CHAT_BEST = {
    loud:  ['You are my FAVORITE!', 'Best friends FOREVER!'],
    kind:  ['You are my best friend, you know.', 'Keena Meena, always.'],
    silly: ['Best friend loop-de-loop!', 'I only do my BEST tricks for you!'],
    shy:   ['...best friend.', '*attaches to your leg*']
  };

  /* Hand a friend their favorite thing. */
  W.giveGift = function (a) {
    var st = W.game.state;
    var f = W.FRIENDS[a.friendKey];
    if (!f || !f.likes || !W.hands.has(f.likes)) return false;
    W.hands.drop();
    var h = Math.min(3, (st.friendship[a.friendKey] || 0) + 1);
    st.friendship[a.friendKey] = h;
    a.says(h >= 3 ? 'KEENA MEENA!! Best friends!!' : 'KEENA MEENA!! My favorite!', 3);
    W.fx.hearts(a.x, a.y - 100, 4 + h * 3);
    W.say(a.name + ' loves it! ' + '\u2764'.repeat(h), a.mood);
    if (h >= 3) W.game.first('bff-' + a.friendKey, 'Best friends with ' + a.name + '!');
    if (W.audio) W.audio.play('love');
    return true;
  };

  /* Z: greet (recruit) or, if already following, just chat — dismissing is a
   * different button (X → W.dismiss) so it can't happen by accident. */
  W.talkTo = function (a) {
    var st = W.game.state;
    if (a.isCrowd) {
      a.says('Trix!', 2);
      return false;
    }
    if (st.party.indexOf(a.friendKey) >= 0) {
      var pool = (st.friendship[a.friendKey] >= 3 && Math.random() < 0.5)
        ? (CHAT_BEST[a.personality] || CHAT_BEST.kind)
        : (CHAT_BACK[a.personality] || CHAT_BACK.kind);
      a.says(pool[Math.floor(Math.random() * pool.length)], 2.6);
      W.fx.hearts(a.x, a.y - 100, 2);
      return false;
    }
    if (st.party.length >= 4) {
      a.says('...too many friends!', 2.4);
      W.say('That is a big enough crowd for now.');
      return false;
    }
    st.party.push(a.friendKey);
    delete st.friendRooms[a.friendKey];        // travelling now, lives nowhere
    a.mode = 'follow';
    a.data.slot = st.party.length - 1;
    a.says('Trix!', 2.4);
    W.game.idea('trix');
    W.game.first('friend', 'First friend: ' + a.name + '!');
    if (!st.metFriends[a.friendKey]) {
      st.metFriends[a.friendKey] = true;
      W.say('You met ' + a.name + '! Trix means hello.', a.mood);
    } else {
      W.say(a.name + ' is following you.');
    }
    W.fx.hearts(a.x, a.y - 110, 4);
    if (W.audio) W.audio.play('blip');
    return true;
  };

  /* X near a follower: say Dee. They stop following and LIVE here now. */
  W.dismiss = function (a, roomName) {
    var st = W.game.state;
    var i = st.party.indexOf(a.friendKey);
    if (i < 0) return false;
    st.party.splice(i, 1);
    st.friendRooms[a.friendKey] = roomName;
    a.mode = 'wander';
    a.says('Dee!', 2.4);
    if (!st.metDee) {
      st.metDee = true;
      W.say('Dee means goodbye! ' + a.name + ' will stay here.', a.mood);
    } else {
      W.say(a.name + ' will hang out here now.');
    }
    if (W.audio) W.audio.play('blip');
    return true;
  };

  /* Re-number the follow slots so the file stays tidy after someone leaves. */
  W.renumberParty = function (npcs) {
    var st = W.game.state;
    for (var i = 0; i < npcs.length; i++) {
      var k = npcs[i].friendKey;
      if (!k) continue;
      var idx = st.party.indexOf(k);
      if (idx >= 0) { npcs[i].mode = 'follow'; npcs[i].data.slot = idx; }
    }
  };
})(window.W);
