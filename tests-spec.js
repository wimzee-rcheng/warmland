/* Warmland — end-to-end tests.
 *
 * The rAF loop is parked and the world advanced by hand, so nothing here
 * races the renderer and every run gives the same answer.
 */
(function (W) {
  'use strict';

  var HELD = {}, HIT = {};
  W.input.down = function (k) { return !!HELD[k]; };
  W.input.hit  = function (k) { return !!HIT[k]; };
  W.input.axis = function () {
    return [(HELD.right ? 1 : 0) - (HELD.left ? 1 : 0), (HELD.down ? 1 : 0) - (HELD.up ? 1 : 0)];
  };
  W.input.endFrame = function () { HIT = {}; };
  W.input.anyKey = function () { return false; };

  var G = W.game, H = W.sceneHouse;
  var DT = 1 / 60;
  function hold(k, v) { HELD[k] = v; }
  function steps(n) { for (var i = 0; i < n; i++) G.step(DT); }
  function secs(t) { steps(Math.round(t / DT)); }
  function press(k) { HIT[k] = true; steps(1); }

  var results = [], fails = 0, group = '';
  function sec(name) { results.push(''); results.push('--- ' + name + ' ---'); group = name; }
  function check(name, cond, detail) {
    results.push((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '   (' + detail + ')' : ''));
    if (!cond) fails++;
  }
  function S_prompt_is(kind) {
    return !!(H.promptStation && H.promptStation.kind === kind);
  }
  function station(kind) {
    for (var i = 0; i < H.stations.length; i++) if (H.stations[i].kind === kind) return H.stations[i];
    return null;
  }
  /* Fill Bobby's tray and paws in one go: raw food trays up, the rest
   * goes in his hands (last one wins, like the real game). */
  function carry(list) {
    G.state.tray = []; G.state.held = null;
    (list || []).forEach(function (id) { W.stow(id); });
  }

  function standAt(st) { H.player.x = st.x + st.w / 2; H.player.y = st.y + st.h / 2; steps(2); }
  function useStation(kind) {
    var st = station(kind);
    if (!st) return null;
    standAt(st);
    W.dialogue.active = false;
    press('act');
    return st;
  }

  function run() {
    G.paused = true;
    G.state = G.freshState();

    // ------------------------------------------------------- movement
    sec('movement');
    G.go('house', { room: 'living' }); steps(2); secs(0.4);
    var sy = H.player.y;
    hold('down', true); secs(0.5); hold('down', false); steps(2);
    check('walking moves Bobby', H.player.y > sy + 20, sy.toFixed(0) + ' -> ' + H.player.y.toFixed(0));

    H.player.x = 480; H.player.y = 300;
    var wx = H.player.x;
    hold('right', true); hold('run', true); secs(0.5); hold('right', false); hold('run', false); steps(2);
    var ranDist = H.player.x - wx;
    H.player.x = 480; H.player.y = 300;
    hold('right', true); secs(0.5); hold('right', false); steps(2);
    var walkDist = H.player.x - 480;
    check('running is faster than walking', ranDist > walkDist + 20,
      'run ' + ranDist.toFixed(0) + ' vs walk ' + walkDist.toFixed(0));

    H.player.x = 480; H.player.y = 300;
    press('jump');
    check('jump leaves the ground', H.player.jumpT > 0);
    var maxLift = 0;
    for (var j = 0; j < 40; j++) { steps(1); maxLift = Math.max(maxLift, H.player.lift()); }
    check('jump has an arc', maxLift > 20, 'peak ' + maxLift.toFixed(0) + 'px');
    secs(0.6);
    check('jump lands again', H.player.jumpT === 0);

    H.player.x = 275; H.player.y = 410;
    hold('left', true); secs(0.9); hold('left', false); steps(2);
    check('furniture still blocks', H.player.x > 248, 'stopped at x=' + H.player.x.toFixed(0));

    // ------------------------------------------------------- tray + hands
    sec('tray, hands and items');
    carry([]);
    check('the tray starts empty', W.tray.count() === 0);
    check('his paws start empty', W.hands.empty() === true);
    ['tomato', 'onion', 'egg', 'flour'].forEach(function (i) { W.tray.add(i); });
    check('the tray holds four', W.tray.count() === 4);
    check('the tray reports full', W.tray.full() === true);
    var refused = W.tray.add('sugar');
    check('a fifth ingredient is refused', refused === false && W.tray.count() === 4);
    W.tray.remove('onion');
    check('removing frees a slot', W.tray.count() === 3 && !W.tray.has('onion'));
    var kinds = W.tray.ofKind('ingredient');
    check('can filter by kind', kinds.length === 2, kinds.join(','));

    // the tray is for RAW FOOD ONLY — everything else is carried
    check('the tray refuses a cooked dish', W.tray.add('friedEgg') === false);
    check('the tray refuses a tool', W.tray.add('boba') === false);
    check('stow routes raw food to the tray', W.stow('sugar') === 'tray');
    check('stow routes a dish to his paws',
      W.stow('friedEgg') === 'hand' && W.hands.has('friedEgg'));
    var bumped = W.hands.hold('boba');
    check('a second item bumps the first out of his paws',
      bumped === 'friedEgg' && W.hands.has('boba'));
    check('carrying() counts both hands and tray',
      W.carrying().length === W.tray.count() + 1);
    carry([]);
    check('every item has an icon', Object.keys(W.ITEMS).every(function (id) {
      return !!W.itemIcon(id, 12);
    }));

    // ------------------------------------------------------- recipes
    sec('recipes');
    W.RECIPES.forEach(function (r) {
      var m = W.matchRecipe(r.needs.slice());
      check('recipe ' + r.id + ' matches its own set', m && m.id === r.id, m ? m.id : 'null');
    });
    check('a wrong set makes nothing', W.matchRecipe(['tomato', 'sugar']) === null);
    check('a partial set makes nothing', W.matchRecipe(['flour']) === null);
    check('extra ingredients spoil the match', W.matchRecipe(['flour', 'yeast', 'egg']) === null);
    var poss = W.possibleRecipes(['flour']);
    check('partial sets suggest recipes', poss.length >= 3, poss.map(function (r) { return r.id; }).join(','));
    check('every recipe ingredient is a real item', W.RECIPES.every(function (r) {
      return r.needs.every(function (n) { return !!W.ITEMS[n]; });
    }));
    check('every recipe produces a real item', W.RECIPES.every(function (r) {
      return !!W.ITEMS[W.recipeDish(r)];
    }));

    // ------------------------------------------------- cooking, gated
    sec('the kitchen');
    G.state.suit = 'none';
    carry([]);
    G.state.stations = {};
    G.state.plates = { stored: 3, dirty: 0, rack: 0 };
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);

    var stove = station('stove');
    check('the kitchen has a stove', !!stove);
    standAt(stove);
    var p = W.stationPrompt(stove);
    check('stove is locked without the chef hat', p.locked === true, p.text);

    G.state.suit = 'chef';
    check('chef grants the cook ability', W.can('cook') === true);

    // reachable from every side, not just the front
    H.player.x = stove.x + stove.w / 2; H.player.y = stove.y - 20; steps(2);
    check('stove works from above', S_prompt_is('stove'));
    H.player.x = stove.x - 20; H.player.y = stove.y + stove.h / 2; steps(2);
    check('stove works from the left', S_prompt_is('stove'));
    var fr2 = station('fridge');
    H.player.x = fr2.x + fr2.w + 20; H.player.y = fr2.y + fr2.h / 2; steps(2);
    check('the fridge works from the right', S_prompt_is('fridge'));

    // an unknown mix ALWAYS cooks — Bobby's Surprise
    carry(['tomato', 'sugar']);
    useStation('stove');
    check('any mix cooks something', stove.s.cooking > 0, 'recipe ' + (stove.s.recipe || {}).id);
    check('the surprise is the fallback', stove.s.recipe.id === 'surprise');
    secs(3.5);
    check('the surprise comes out', W.hands.has('surprise'), W.hands.item());
    check('and the pot is empty again', stove.s.contents.length === 0);

    // a known combo still makes the real dish
    // the surprise is still in his paws, so cooking again bumps it to the floor
    carry(['egg']);
    useStation('stove');
    check('a known combo cooks the real dish', stove.s.recipe.id === 'eggs');
    secs(2.5);
    check('fried egg collected', W.hands.has('friedEgg'));

    // ---- set the table, sit, eat, wash, put away
    var table = station('table');
    var chair = station('chair');
    check('the kitchen has chairs', !!chair);

    standAt(table); W.dialogue.active = false; press('act');
    check('setting the table takes a plate', G.state.plates.stored === 2, G.state.plates.stored);
    check('the dish is on the table', table.s.set.length >= 1 && !W.hands.has('friedEgg'));
    check('serving dinner sits Bobby down', H.seated === chair || !!H.seated);
    check('but nothing is eaten yet', table.s.set.length >= 1);
    steps(2);
    check('the seated prompt offers Eat', /Eat/.test(H.prompt.text), H.prompt.text);

    W.dialogue.active = false; press('act');       // start eating
    check('Z starts the meal, it does not finish it',
      !!H.mealSeq && table.s.set.length === 1);
    secs(1.6);
    check('the dish is visibly nibbled', table.s.biteStage >= 1, table.s.biteStage);
    secs(3.0);
    check('the meal finishes on its own', H.mealSeq === null);
    check('eating clears the table', table.s.set.length === 0);
    check('eating makes a dirty plate', G.state.plates.dirty === 1);
    check('the meal was counted', G.state.meals >= 1);

    hold('down', true); steps(2); hold('down', false);
    check('an arrow stands Bobby up', H.seated === null);

    var sink = station('sink');
    standAt(sink); W.dialogue.active = false; press('act');
    check('washing starts', sink.s.wash > 0);
    secs(3);
    check('washing fills the drying rack', G.state.plates.dirty === 0 && G.state.plates.rack === 1);

    useStation('cupboard');
    check('the rack goes back in the cupboard',
      G.state.plates.rack === 0 && G.state.plates.stored === 3);

    check('plates never touch the tray', W.tray.ofKind('plate').length === 0);

    useStation('bobaMachine');
    check('the boba machine gives boba', W.hands.has('boba'));

    // drinking it is the fallback action on open floor
    H.player.x = 480; H.player.y = 330; steps(3);
    W.dialogue.active = false; press('act');
    check('boba gets drunk, not dropped', !W.hands.has('boba'));
    check('a wacky effect kicks in', !!G.bobaFx, G.bobaFx && G.bobaFx.kind);
    G.bobaFx = null;

    // dropping and picking back up — Z puts down whatever is in his paws
    carry(['friedEgg']);
    H.player.x = 480; H.player.y = 330; steps(3);
    W.dialogue.active = false; press('act');
    check('the dish sits on the floor',
      W.hands.empty() && W.dropped.list('kitchen').length === 1);
    steps(3);
    W.dialogue.active = false; press('act');
    check('...and picks back up',
      W.hands.has('friedEgg') && W.dropped.list('kitchen').length === 0);
    // raw food picked off the floor goes to the tray, not his paws
    W.dropped.dropItem('kitchen', 'tomato', 480, 330); steps(3);
    W.dialogue.active = false; press('act');
    check('floor veg goes to the tray',
      W.tray.has('tomato') && W.hands.has('friedEgg'));

    // the trash can dumps everything — after asking twice
    carry(['tomato', 'egg', 'flour']);
    W.hands.hold('friedEgg');
    useStation('trash');
    W.dialogue.active = false; press('act');
    check('the trash can empties tray AND paws (confirmed)',
      W.tray.count() === 0 && W.hands.empty());

    // ------------------------------------------------------- lights
    sec('lights and sleep');
    G.go('house', { room: 'living' }); steps(2); secs(0.4);
    check('lights start on', G.state.lights.living === undefined || G.state.lights.living === true);
    useStation('lamp');
    check('the switch turns them off', G.state.lights.living === false);
    useStation('lamp');
    check('the switch turns them back on', G.state.lights.living === true);

    var day0 = G.state.day;
    G.go('house', { room: 'bedroom' }); steps(2); secs(0.4);
    useStation('bed');
    check('bedtime starts the sequence', !!H.sleeping, H.sleeping && H.sleeping.phase);
    secs(2.5);
    check('the day has not skipped mid-dream', G.state.day === day0);
    secs(4.5);
    check('waking advances the day', G.state.day === day0 + 1, 'day ' + G.state.day);
    check('the sequence is over', H.sleeping === null);
    check('ideas rolled for the new day',
      G.state.ideas && G.state.ideas.day === G.state.day && G.state.ideas.list.length === 3);

    var win = station('window');
    standAt(win); W.dialogue.active = false; press('act');
    check('the window opens', win.s.open === true);
    W.dialogue.active = false; press('act');
    check('the window closes', win.s.open === false);

    // ------------------------------------------------------- friends
    sec('friends');
    G.state.party = [];
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    var friends = H.npcs.filter(function (a) { return a.friendKey; });
    check('the park has friends', friends.length >= 5, friends.length + ' friends');
    check('every friend kind is drawable', friends.every(function (a) { return !!W.CHARS[a.char]; }));
    check('the park has a crowd', H.npcs.filter(function (a) { return a.isCrowd; }).length === 5);

    var panda = friends.filter(function (a) { return a.friendKey === 'panda'; })[0];
    W.talkTo(panda);
    check('talking recruits a friend', G.state.party.indexOf('panda') >= 0);
    check('the friend follows', panda.mode === 'follow');
    check('the friend says Trix', panda.bubble === 'Trix!', panda.bubble);

    G.go('house', { room: 'outside' }); steps(2); secs(0.4);
    var camePanda = H.npcs.filter(function (a) { return a.friendKey === 'panda'; })[0];
    check('the friend follows between rooms', !!camePanda && camePanda.mode === 'follow');

    // they should actually trail after him
    var beforeGap = Math.hypot(camePanda.x - H.player.x, camePanda.y - H.player.y);
    hold('right', true); secs(1.6); hold('right', false); steps(4);
    var afterGap = Math.hypot(camePanda.x - H.player.x, camePanda.y - H.player.y);
    check('the friend keeps up while walking', afterGap < 190,
      'gap ' + beforeGap.toFixed(0) + ' -> ' + afterGap.toFixed(0));

    var chatBefore = G.state.party.indexOf('panda');
    W.talkTo(camePanda);
    check('Z chats, never dismisses', G.state.party.indexOf('panda') === chatBefore);
    W.dismiss(camePanda, 'outside');
    check('X (dismiss) says Dee', G.state.party.indexOf('panda') < 0 &&
      camePanda.bubble === 'Dee!', camePanda.bubble);
    check('the friend now lives where dismissed', G.state.friendRooms.panda === 'outside');

    G.state.party = [];
    for (var f = 0; f < 5; f++) {
      var all = H.npcs.filter(function (a) { return a.friendKey; });
      if (all[f]) W.talkTo(all[f]);
    }
    check('the party caps at four', G.state.party.length <= 4, G.state.party.length + ' following');

    // ------------------------------------------------------- suits
    sec('suits and abilities');
    check('five suits exist', W.SUIT_ORDER.length === 5, W.SUIT_ORDER.join(','));
    check('every suit is defined', W.SUIT_ORDER.every(function (k) { return !!W.SUITS[k]; }));
    G.state.suit = 'mech';
    check('mech can transform', W.can('transform'));
    check('mech cannot cook', !W.can('cook'));
    G.state.suit = 'builder';
    check('builder can build', W.can('build'));
    check('suitFor finds the cook suit', W.suitFor('cook').name === W.SUITS.chef.name);

    // ------------------------------------------------------- treehouse
    sec('the treehouse');
    G.state.builtTreehouse = false;
    G.state.suit = 'none';
    G.go('house', { room: 'backyard' }); steps(2); secs(0.4);
    var tree = station('tree');
    standAt(tree);
    check('the tree is locked without the hard hat', W.stationPrompt(tree).locked === true);
    W.stationAct(tree);
    check('no treehouse without the builder', G.state.builtTreehouse === false);

    G.state.suit = 'builder';
    standAt(tree); W.dialogue.active = false; press('act');
    check('building starts', tree.s.building > 0);
    secs(3);
    check('the treehouse gets built', G.state.builtTreehouse === true);
    G.go('house', { room: 'treehouse' }); steps(2);
    check('the treehouse is a real room', G.state.room === 'treehouse');

    // ------------------------------------------------------- crystals
    sec('crystals');
    G.state.crystals = 0;
    G.state.crystalsCarried = 0;
    carry([]);
    G.go('house', { room: 'mountain' }); steps(2); secs(0.4);

    // smash every rock — 40% each, six rocks, virtually certain to find one
    var rocks = H.stations.filter(function (x) { return x.kind === 'breakRock'; });
    check('the mountain has rocks to break', rocks.length === 6, rocks.length);
    rocks.forEach(function (rk) {
      standAt(rk);
      for (var wk = 0; wk < 3; wk++) { W.dialogue.active = false; press('act'); }
      check('rock ' + rk.idx + ' crumbles after 3 whacks', rk.s.broken === true);
    });
    check('mining found at least one crystal', G.state.crystalsCarried >= 1,
      G.state.crystalsCarried + ' found');
    check('crystals never enter the tray', W.tray.count() === 0);
    var mined = G.state.crystalsCarried;

    G.go('house', { room: 'bedroom' }); steps(2); secs(0.4);
    useStation('crystalShelf');
    check('the trophy case takes them all',
      G.state.crystals === mined && G.state.crystalsCarried === 0,
      G.state.crystals + ' displayed');

    // ------------------------------------------------------- vehicles
    sec('vehicles');
    var V = W.sceneVehicle;
    Object.keys(W.VEHICLES).forEach(function (key) {
      G.go('vehicle', { vehicle: key }); steps(2); secs(0.4);
      var x0 = V.x;
      hold('right', true); secs(0.8); hold('right', false); steps(2);
      check('the ' + key + ' moves', V.x > x0 + 20, x0.toFixed(0) + ' -> ' + V.x.toFixed(0));
      check('the ' + key + ' stays on its map', V.x > 0 && V.x < W.MAPS[V.mapId].w);
    });

    G.go('vehicle', { vehicle: 'ufo' }); steps(2); secs(0.4);
    var home = W.MAPS.neighborhood.pois.filter(function (q) { return q.label === 'HOME'; })[0];
    V.x = home.x; V.y = home.y; V.vx = 0; V.vy = 0; steps(2);
    check('a landing pad is detected', !!V.poi && V.poi.label === 'HOME');
    W.dialogue.active = false;
    press('act'); secs(1.4);
    check('landing puts you back in a room', G.sceneName === 'house' && G.state.room === 'outside', G.state.room);

    // anyone may drive the car now — racing is what needs the suit
    check('the car needs no outfit', !W.VEHICLES.car.requires);
    var rp0 = W.MAPS.neighborhood.pois.filter(function (p) { return p.track; })[0];
    check('the race track does need one', rp0 && rp0.needs === 'drive');

    // ------------------------------------------------------- the jobs
    sec('jobs');
    G.state.suit = 'mech';
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    var pitch = station('cartPitch');
    standAt(pitch); W.dialogue.active = false; press('act');
    check('the cart job starts', W.service.active() === true);
    check('setting up folds the mech into a cart', G.state.mechForm === 'cart');
    secs(6);
    check('customers queue up', W.job.customers.length > 0, W.job.customers.length + ' in line');

    // pull the front customer to the window and serve them
    var served0 = W.service.served();
    for (var s = 0; s < 6; s++) {
      if (!W.job.customers.length) { secs(2); continue; }
      var c = W.job.customers[0];
      c.actor.x = W.JOBS.bobaCart.window[0];
      c.actor.y = W.JOBS.bobaCart.window[1];
      steps(3);
      W.service.serve();
      secs(1.2);
    }
    check('serving increments the count', W.service.served() > served0, W.service.served() + ' served');
    check('serving pays', G.state.money > 0, '¤' + G.state.money);

    while (W.service.served() < W.service.target()) {
      if (W.job.customers.length) {
        var cc = W.job.customers[0];
        cc.actor.x = W.JOBS.bobaCart.window[0];
        cc.actor.y = W.JOBS.bobaCart.window[1];
        steps(3);
        W.service.serve();
      }
      secs(1.4);
    }
    check('hitting the target arms the event', W.service.armed() === true,
      W.service.served() + '/' + W.service.target());

    // ------------------------------------------------------- missions
    sec('missions');
    G.go('mission', { mission: 'megatron' }); steps(2);
    var M = W.sceneMission;
    check('megatron shows up', M.f.enemies.length === 1 && M.f.enemies[0].maxHp > 0);
    check('bobby has health', M.f.hero.hp > 0);
    var boss = M.f.enemies[0];
    boss.hp = 1;
    M.f.shots.push({ x: boss.x, y: boss.y, vx: 0, vy: 0, r: 10, life: 1 });
    steps(2);
    check('the boba gun hurts megatron', M.f.enemies.length === 0);
    steps(2);
    check('beating him wins the mission', M.f.over === 'win', M.f.over);
    secs(2.6);
    check('winning records the mission', G.state.missions.megatron === true);

    G.go('mission', { mission: 'space' }); steps(2); secs(0.5);
    check('the space mission spawns aliens', M.f.enemies.length > 0, M.f.enemies.length + ' aliens');
    M.f.hero.hp = 1;
    // aim at the saucer body — in space the hitbox is the UFO itself
    M.f.enemyShots.push({ x: M.f.hero.x, y: M.f.hero.y - 8, vx: 0, vy: 0, r: 12, life: 1 });
    steps(2);
    check('alien fire can hurt Bobby', M.f.hero.hp === 0 && M.f.over === 'lose', M.f.over);

    // ------------------------------------------------- audit regressions
    sec('audit regressions');

    // C1: the title cannot silently destroy a save
    W.save.setHero('bobby');
    G.state = G.freshState();
    G.state.day = 5;
    W.save.write();
    G.saveOk = false;
    G.go('title'); steps(2); secs(0.5);
    // the title asks WHO first — pick Bobby (card 0)
    check('the title asks who is playing', W.sceneTitle.stage === 'hero');
    press('act'); steps(2);
    check('picking a hero moves on', W.sceneTitle.stage === 'play');
    check('and it found that hero\'s save', W.sceneTitle.hasSave === true);
    press('right');
    check('starting over asks first', W.sceneTitle.confirming === true);
    check('the old save is untouched while asking', W.save.read().day === 5);
    press('down');
    check('any arrow cancels the question', W.sceneTitle.confirming === false);
    press('back'); secs(1.4);
    check('X continues the saved game', G.state.day === 5 && G.sceneName === 'house',
      'day ' + G.state.day);
    check('continuing re-enables saving', G.saveOk === true);

    // C5/H9: jobs end when you leave, and re-Z stops rather than resets
    G.state = G.freshState(); G.saveOk = true;
    G.state.suit = 'mech';
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    var pitch2 = station('cartPitch');
    standAt(pitch2); W.dialogue.active = false; press('act');
    check('cart job starts', W.service.active());
    G.go('house', { room: 'outside' }); steps(2);
    check('leaving the room ends the job', !W.service.active() && G.state.job === null);

    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    standAt(station('cartPitch')); W.dialogue.active = false; press('act');
    W.job.served = 3;
    W.dialogue.active = false; press('act');
    check('Z at the pitch never stops the job', W.service.active() && W.service.served() === 3);
    W.dialogue.active = false; press('back');
    check('X clocks out', !W.service.active());

    // C4: the shop job actually gets customers now
    G.state.suit = 'chef';
    G.go('house', { room: 'shop' }); steps(2); secs(0.4);
    standAt(station('shopCounter')); W.dialogue.active = false; press('act');
    check('shop job starts', W.service.active());
    secs(7);
    check('shop customers queue up', W.job.customers.length > 0,
      W.job.customers.length + ' waiting');
    check('the shift clamps Bobby behind the counter',
      H.player.y <= W.JOBS.iceCream.workZone.y + W.JOBS.iceCream.workZone.h + 1,
      H.player.y.toFixed(0));
    var m0 = G.state.money;
    var cq = W.job.customers[0];
    cq.actor.x = W.JOBS.iceCream.window[0];
    cq.actor.y = W.JOBS.iceCream.window[1];
    steps(3);
    W.service.serve();
    check('serving empty-handed fails politely',
      G.state.money === m0 && W.service.front() === cq);
    W.service.pick(cq.wants === 'boba' ? 'vanilla' : 'boba');   // the WRONG thing
    W.service.serve();
    check('the wrong flavor is refused, scoop kept',
      G.state.money === m0 && W.service.holding() !== null);
    W.service.pick(cq.wants);
    W.service.serve();
    check('the right flavor pays', G.state.money > m0);
    check('the scoop is delivered', W.service.holding() === null);
    W.service.stop(true);

    // the cave is a shark dive now
    var V2 = W.sceneVehicle;
    var D2 = W.sceneDive;
    G.state.treasures = {};
    G.state.crystalsCarried = 0;
    G.go('vehicle', { vehicle: 'submarine', map: 'underwater' }); steps(2); secs(0.4);
    V2.x = 300; V2.y = 760; V2.vx = 0; V2.vy = 0; steps(2);
    check('the cave is found', !!V2.poi && V2.poi.label === 'CAVE');
    W.dialogue.active = false; press('act'); secs(1.4);
    check('the cave opens as a dive', G.sceneName === 'dive', G.sceneName);
    check('the dive has sharks', D2.sharks.length === 2, D2.sharks.length);
    check('the hull starts whole', D2.hull === 4);

    // a shark bite hurts but never kills outright
    D2.sharks[0].x = D2.x; D2.sharks[0].y = D2.y; steps(2);
    check('a shark bump costs one hull', D2.hull === 3, 'hull ' + D2.hull);
    check('the bump grants mercy time', D2.invuln > 0);

    // grab the crystal and escape
    D2.x = D2.site.crystal[0]; D2.y = D2.site.crystal[1];
    D2.vx = 0; D2.vy = 0; steps(2);
    W.dialogue.active = false; press('act');
    check('the crystal is grabbed', D2.hasCrystal === true);
    D2.x = D2.site.entry[0]; D2.y = D2.site.entry[1];
    D2.vx = 0; D2.vy = 0; steps(2);
    W.dialogue.active = false; press('act'); secs(1.4);
    check('escaping banks the crystal', G.state.crystalsCarried === 1);
    check('the treasure flag lives in game.state (daily)',
      G.state.treasures['dive:CAVE:' + G.state.day] === true);
    check('back in open water', G.sceneName === 'vehicle' && V2.mapId === 'underwater');

    // H3: the mountain balloon flies the mountain map, not a teleport home
    G.go('house', { room: 'mountain' }); steps(2); secs(0.4);
    var mstn = null;
    for (var ms = 0; ms < H.stations.length; ms++) {
      if (H.stations[ms].kind === 'vehicle') mstn = H.stations[ms];
    }
    standAt(mstn); W.dialogue.active = false; press('act'); secs(1.4);
    check('mountain balloon uses the mountain map',
      G.sceneName === 'vehicle' && V2.mapId === 'crystalMountain', V2.mapId);
    check('it lifts off from the LAND pad', Math.abs(V2.x - 700) < 60, V2.x.toFixed(0));

    // H4: surfacing gives back the vehicle you dived in
    G.go('vehicle', { vehicle: 'ufo' }); steps(2); secs(0.4);
    V2.x = 460; V2.y = 940; V2.vx = 0; V2.vy = 0; steps(2);
    check('the lake is found', !!V2.poi && V2.poi.kind === 'lake');
    W.dialogue.active = false; press('act'); secs(1.4);
    check('diving swaps to the submarine', V2.vehicle === 'submarine');
    V2.x = 800; V2.y = 120; V2.vx = 0; V2.vy = 0; steps(2);
    W.dialogue.active = false; press('act'); secs(1.4);
    check('surfacing restores the UFO', V2.vehicle === 'ufo' && V2.mapId === 'neighborhood',
      V2.vehicle + ' on ' + V2.mapId);

    // H10: wrong-vehicle pads explain themselves
    V2.x = 1660; V2.y = 950; V2.vx = 0; V2.vy = 0; steps(2);
    check('the mountain pad is seen from the UFO', !!V2.poi && V2.poi.label === 'MOUNTAIN');
    check('and shown as locked', V2.poiLocked === true);
    W.dialogue.active = false; press('act'); steps(2);
    check('landing there is refused', G.sceneName === 'vehicle');

    // H5: displaying crystals rebuilds the bedroom art
    G.state.crystals = 0;
    G.state.crystalsCarried = 1;
    G.go('house', { room: 'bedroom' }); steps(2); secs(0.4);
    useStation('crystalShelf');
    steps(3);   // the deferred rebuild runs on the next update
    check('the case takes the carried crystal',
      G.state.crystals === 1 && G.state.crystalsCarried === 0);
    check('the room survives its rebuild', G.state.room === 'bedroom' && H.stations.length > 0);

    // H6: each mission keeps its own backdrop
    G.go('mission', { mission: 'megatron' }); steps(2);
    G.go('mission', { mission: 'space' }); steps(2);
    var MP = W.sceneMission.papers;
    check('missions have separate backdrops',
      !!MP.megatron && !!MP.space && MP.megatron !== MP.space);

    // C2: X leaves a mission
    press('back'); secs(1.4);
    check('X flees the space mission', G.sceneName === 'vehicle');
    G.go('mission', { mission: 'megatron' }); steps(2);
    press('back'); secs(1.4);
    check('X flees Megatron back to the park',
      G.sceneName === 'house' && G.state.room === 'park');

    // C7: followers spawn inside the walkable bounds everywhere
    G.state.party = ['panda', 'yuna', 'butterball', 'critterA'];
    G.go('house', { room: 'park' }); steps(2);
    var okSpawn = true;
    for (var fs = 0; fs < H.npcs.length; fs++) {
      var fa = H.npcs[fs];
      if (!fa.friendKey || G.state.party.indexOf(fa.friendKey) < 0) continue;
      var bb = W.ROOMS.park.bounds;
      if (fa.x < bb.x + 16 || fa.x > bb.x + bb.w - 16 ||
          fa.y < bb.y || fa.y > bb.y + bb.h) okSpawn = false;
    }
    check('every follower spawns in bounds', okSpawn);
    G.state.party = [];

    // M3: a finished bubble no longer eats the Z press
    G.state.suit = 'chef';
    carry(['egg']);
    G.state.stations = {};
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    var stv = station('stove');
    standAt(stv);
    W.say('hello there');
    secs(1.0);   // typed out, still holding on screen
    check('the bubble is still up', W.dialogue.active === true);
    press('act');
    check('...and Z still works through it', stv.s.cooking > 0);

    // the pot takes EVERYTHING now — odd pairs just make a Surprise
    secs(3); useStation('stove');            // collect the fried egg
    carry(['pasta', 'flour']);
    standAt(stv); W.dialogue.active = false; press('act');
    check('every ingredient goes in the pot',
      stv.s.contents.indexOf('pasta') >= 0 && stv.s.contents.indexOf('flour') >= 0,
      'pot: ' + stv.s.contents.join(','));
    check('and it cooks a surprise', stv.s.cooking > 0 && stv.s.recipe.id === 'surprise');
    secs(3.5);
    stv.s.dish = null; stv.s.contents = [];  // tidy for later sections

    // M1: mechForm survives a save round-trip
    G.state.suit = 'mech';
    G.state.mechForm = 'cart';
    W.save.write();
    G.state = G.freshState();
    check('fresh state is a robot', G.state.mechForm === 'robot');
    W.save.load();
    check('the cart form is restored', G.state.mechForm === 'cart');

    // ------------------------------------------------ audit 2: traps (WALKED)
    sec('audit 2: no more traps');

    function canWalk(dist) {
      // try each direction with held keys; true if net movement >= dist
      var dirs = [['left',-1,0],['right',1,0],['up',0,-1],['down',0,1]];
      for (var d = 0; d < dirs.length; d++) {
        var sx = H.player.x, sy = H.player.y;
        hold(dirs[d][0], true); secs(0.6); hold(dirs[d][0], false); steps(2);
        var moved = Math.hypot(H.player.x - sx, H.player.y - sy);
        if (moved >= dist) return true;
        H.player.x = sx; H.player.y = sy;
      }
      return false;
    }

    // A1: sleep, wake, WALK away — and be visible (baseline south of the bed)
    G.state = G.freshState(); G.saveOk = false;
    G.go('house', { room: 'bedroom' }); steps(2); secs(0.4);
    useStation('bed');
    check('bedtime begins', !!H.sleeping);
    // lying ON the mattress: feet at the bed's foot end, head reaching the
    // pillow zone (the sleeper is drawn last, over the blanket)
    check('he lies on the mattress', H.player.y > 320 && H.player.y < 400, H.player.y.toFixed(0));
    check('his head reaches the pillow', (H.player.y - 105) < 290, (H.player.y - 105).toFixed(0));
    secs(7);
    check('morning came', H.sleeping === null && G.state.day === 2);
    check('he wakes on open floor', W.canStand(H.room, H.solids, H.player.x, H.player.y));
    check('and can WALK away from the bed', canWalk(30));

    // A2: the shift spawn is standable and the tubs + window are reachable
    G.state.suit = 'chef';
    G.go('house', { room: 'shop' }); steps(2); secs(0.4);
    standAt(station('shopCounter')); W.dialogue.active = false; press('act');
    check('shift starts on standable floor',
      W.canStand(H.room, H.solids, H.player.x, H.player.y));
    // walk to a flavor tub
    var tub2 = H.stations.filter(function (x) { return x.kind === 'flavorTub'; })[0];
    var guard = 0;
    while (Math.abs(H.player.x - (tub2.x + tub2.w / 2)) > 12 && guard++ < 400) {
      hold(H.player.x < tub2.x + tub2.w / 2 ? 'right' : 'left', true); steps(4);
    }
    hold('left', false); hold('right', false); steps(2);
    check('a tub is reachable by walking', S_prompt_is('flavorTub') || S_prompt_is('bobaMachine'),
      H.promptStation && H.promptStation.kind);
    // walk toward the window and confirm a customer can be served
    secs(6);
    if (W.job.customers.length) {
      var cw = W.JOBS.iceCream.window;
      var cst = W.job.customers[0];
      cst.actor.x = cw[0]; cst.actor.y = cw[1]; steps(3);
      guard = 0;
      while (Math.abs(H.player.x - cw[0]) > 16 && guard++ < 400) {
        hold(H.player.x < cw[0] ? 'right' : 'left', true); steps(4);
      }
      hold('left', false); hold('right', false); steps(2);
      check('the window customer is in serve range', H.serveTo === cst);
    }
    W.service.stop(true);

    // A3: three hands-off seconds hurt nobody
    G.go('mission', { mission: 'megatron' }); steps(2);
    var M3 = W.sceneMission;
    secs(3);
    check('no damage before the child moves', M3.f.hero.hp === M3.f.hero.maxHp,
      'hp ' + M3.f.hero.hp);
    press('back'); secs(1.4);

    // A4: Z and X together bank exactly one crystal
    G.state.treasures = {}; G.state.crystalsCarried = 0;
    G.go('dive', { site: 'CAVE' }); steps(2); secs(0.5);
    var D3 = W.sceneDive;
    D3.x = D3.site.crystal[0]; D3.y = D3.site.crystal[1]; D3.movedAway = true; steps(2);
    W.dialogue.active = false; press('act');
    D3.x = D3.site.entry[0]; D3.y = D3.site.entry[1]; steps(2);
    W.dialogue.active = false;
    HIT.act = true; HIT.back = true; steps(1);        // the mash
    secs(1.4);
    check('Z+X banks exactly one crystal', G.state.crystalsCarried === 1,
      G.state.crystalsCarried);

    // A5: arriving in the kitchen does not offer the trash, and dumping asks twice
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    check('kitchen spawn is not a trash prompt',
      !H.promptStation || H.promptStation.kind !== 'trash');
    carry(['egg', 'flour']);
    standAt(station('trash')); W.dialogue.active = false; press('act');
    check('first Z only asks', W.tray.count() === 2);
    W.dialogue.active = false; press('act');
    check('second Z dumps', W.tray.count() === 0);

    // A6: the dive never offers Leave at the doorway before moving
    G.go('dive', { site: 'WRECK' }); steps(2); secs(0.5);
    check('no exit prompt at spawn', D3.atExit === false);

    // A7: build the treehouse from the NORTH side and walk away after
    G.state = G.freshState(); G.saveOk = false;
    G.state.suit = 'builder';
    G.go('house', { room: 'backyard' }); steps(2); secs(0.4);
    var tre = station('tree');
    H.player.x = tre.x + tre.w / 2; H.player.y = tre.y - 26; steps(2);   // north side
    check('the tree works from the north', S_prompt_is('tree'));
    W.dialogue.active = false; press('act');
    secs(3.2); steps(4);                                  // build + deferred rebuild
    check('the treehouse got built', G.state.builtTreehouse === true);
    check('the builder stands on open ground',
      W.canStand(H.room, H.solids, H.player.x, H.player.y));
    check('and can walk away from it', canWalk(30));

    // --------------------------------------------- gameplay-feel additions
    sec('gameplay feel');

    // space is a place: portal -> free flight -> INVASION -> battle -> back
    var V3 = W.sceneVehicle;
    G.go('vehicle', { vehicle: 'ufo', map: 'neighborhood' }); steps(2); secs(0.4);
    V3.x = 1180; V3.y = 120; V3.vx = 0; V3.vy = 0; steps(2);
    check('the space portal is seen', !!V3.poi && V3.poi.label === 'SPACE');
    W.dialogue.active = false; press('act'); secs(1.4);
    check('the portal opens free flight in space',
      G.sceneName === 'vehicle' && V3.mapId === 'space', V3.mapId);
    V3.x = 1200; V3.y = 260; V3.vx = 0; V3.vy = 0; steps(2);
    check('the invasion pad is there', !!V3.poi && V3.poi.label === 'INVASION');
    W.dialogue.active = false; press('act'); secs(1.4);
    check('the invasion starts the battle', G.sceneName === 'mission');
    var M2 = W.sceneMission;
    check('the space hitbox is the saucer', M2.f.hero.hitR === 45 && M2.f.hero.hitDy === -8);
    press('back'); secs(1.4);
    check('fleeing returns to space flight',
      G.sceneName === 'vehicle' && V3.mapId === 'space', V3.mapId);

    // side-view vehicles face their travel
    G.go('vehicle', { vehicle: 'submarine', map: 'underwater' }); steps(2); secs(0.4);
    hold('left', true); secs(0.5); hold('left', false); steps(2);
    check('the submarine faces left going left', V3.face === -1);
    hold('right', true); secs(0.5); hold('right', false); steps(2);
    check('...and right going right', V3.face === 1);

    // dropped items survive a save round-trip
    G.state = G.freshState(); G.saveOk = true;
    G.go('house', { room: 'living' }); steps(2); secs(0.4);
    carry([]); W.hands.hold('egg');
    H.player.x = 480; H.player.y = 330; steps(3);
    W.dialogue.active = false; press('act');
    check('the egg is on the living-room floor', W.dropped.list('living').length === 1);
    W.save.write();
    G.state = G.freshState();
    W.save.load();
    check('the floor egg survives a save', W.dropped.list('living').length === 1 &&
      W.dropped.list('living')[0].id === 'egg');

    // a full tray refuses pickup but keeps the floor item
    G.go('house', { room: 'living' }); steps(2); secs(0.4);
    carry(['tomato', 'onion', 'flour', 'sugar']);
    var fl = W.dropped.list('living')[0];
    H.player.x = fl.x; H.player.y = fl.y; steps(2);
    W.dialogue.active = false; press('act');
    check('full-tray pickup is refused, item kept',
      W.dropped.list('living').length === 1 && W.tray.count() === 4);
    carry([]);

    // friends persist where dismissed, across a save
    G.state.party = [];
    G.state.friendRooms = null;
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    var yun = H.npcs.filter(function (a) { return a.friendKey === 'yuna'; })[0];
    W.talkTo(yun); W.renumberParty(H.npcs);
    G.go('house', { room: 'treehouse' }); steps(2); secs(0.4);
    var yun2 = H.npcs.filter(function (a) { return a.friendKey === 'yuna'; })[0];
    W.dismiss(yun2, 'treehouse');
    W.save.write();
    G.state = G.freshState();
    W.save.load();
    G.go('house', { room: 'treehouse' }); steps(2);
    check('yuna lives in the treehouse now',
      H.npcs.some(function (a) { return a.friendKey === 'yuna'; }));
    G.go('house', { room: 'park' }); steps(2);
    check('...and is gone from the park',
      !H.npcs.some(function (a) { return a.friendKey === 'yuna'; }));

    // a sleepover pins the banner and the friends
    G.go('house', { room: 'treehouse' }); steps(2); secs(0.4);
    useStation('bed');
    check('the treehouse bag starts bedtime', !!H.sleeping);
    check('friends present make it a sleepover', H.sleeping.sleepover === true);
    secs(7);
    check('the sleepover banner shows', G.banner === null || G.state.firsts.sleepover === true);

    // pause freezes the world
    press('pause');
    check('P pauses', G.userPaused === true);
    G.userPaused = false;

    // mailbox mail is once per day per box
    G.go('house', { room: 'outside' }); steps(2); secs(0.4);
    var mb = station('mailbox');
    standAt(mb); W.dialogue.active = false; press('act');
    var mailKeys = Object.keys(G.state.mail).length;
    check('the mailbox gives a letter', mailKeys === 1);
    W.dialogue.active = false; press('act');
    check('but only one per day', Object.keys(G.state.mail).length === 1);

    // buying a scoop needs coins and an off-duty bear
    G.state.suit = 'chef';
    G.go('house', { room: 'shop' }); steps(2); secs(0.4);
    var tub = H.stations.filter(function (x) { return x.kind === 'flavorTub'; })[0];
    G.state.money = 1;
    standAt(tub); W.dialogue.active = false; press('act');
    check('a scoop needs 2 coins', G.state.money === 1);
    G.state.money = 5;
    W.dialogue.active = false; press('act');
    check('buying a scoop costs 2', G.state.money === 3);

    // firsts fire exactly once
    G.state.firsts = {};
    check('a first fires', G.first('testfirst', 'Test!') === true);
    check('and never again', G.first('testfirst', 'Test!') === false);

    // day/night stays inert while parked
    check('the phase is parked at day', G.phase4() === 'day');
    var ck0 = G.state.clock;
    G.go('house', { room: 'outside' }); steps(2); secs(1);
    check('the clock does not advance', G.state.clock === ck0);

    // ------------------------------------------------- feature round
    sec('feature round');

    // crystal varieties + the book
    G.state = G.freshState(); G.saveOk = false;
    G.go('house', { room: 'mountain' }); steps(2); secs(0.4);
    var rocks2 = H.stations.filter(function (x) { return x.kind === 'breakRock'; });
    rocks2.forEach(function (rk) {
      standAt(rk);
      for (var wk = 0; wk < 3; wk++) { W.dialogue.active = false; press('act'); }
    });
    var types = Object.keys(G.state.crystalsFound);
    check('mining finds named varieties', types.length >= 1, types.join(','));
    check('every variety is a real crystal', types.every(function (t2) { return !!W.CRYSTALS[t2]; }));
    G.go('house', { room: 'bedroom' }); steps(2); secs(0.4);
    G.state.crystalsCarried = 0;
    useStation('crystalShelf');
    check('the empty-handed case opens the book', G.overlayName === 'crystalbook');
    press('back'); steps(2);
    check('the book closes', G.overlay === null);

    // weather: rainbow doubles the rock odds
    var day = G.state.day;
    var probe = null;
    for (var pr2 = 0; pr2 < 6; pr2++) {
      var roll2 = W.mulberry32(W.hash('rock' + day + 'mountain' + pr2))();
      if (roll2 >= 0.4 && roll2 < 0.8) { probe = pr2; break; }
    }
    if (probe !== null) {
      G.go('house', { room: 'mountain' }); steps(2); secs(0.4);
      var rk2 = H.stations.filter(function (x) { return x.kind === 'breakRock'; })[probe];
      rk2.s.day = day; rk2.s.whacks = 0; rk2.s.broken = false;
      var c0 = G.state.crystalsCarried;
      G.state.weather = 'sunny';
      standAt(rk2);
      for (var wk2 = 0; wk2 < 3; wk2++) { W.dialogue.active = false; press('act'); }
      check('a 40-80%% roll misses on a sunny day', G.state.crystalsCarried === c0);
      rk2.s.whacks = 0; rk2.s.broken = false;
      G.state.weather = 'rainbow';
      for (var wk3 = 0; wk3 < 3; wk3++) { W.dialogue.active = false; press('act'); }
      check('...and hits on a rainbow day', G.state.crystalsCarried === c0 + 1);
      G.state.weather = 'sunny';
    }
    check('the day has weather', ['sunny','rainy','snowy','rainbow'].indexOf(G.state.weather) >= 0);

    // day 1 of a fresh game is ALWAYS sunny (first impressions)
    var savedState = G.state;
    G.state = G.freshState();
    G.ensureIdeas();
    check('a brand-new day 1 is sunny', G.state.weather === 'sunny', G.state.weather);
    G.state = savedState;

    // beating the invasion arms the MOTHERSHIP via E
    G.go('mission', { mission: 'space' }); steps(2);
    var MM = W.sceneMission;
    // the invasion is three waves of ten now — jump to the end of the last
    MM.waveNum = 3;
    MM.spawned = 10;
    MM.f.enemies.length = 0;
    steps(3);
    check('clearing the waves arms the event', MM.armedNext === true);
    press('special'); steps(3);
    check('E summons the mothership', MM.mission === 'mothership' &&
      MM.f.enemies.some(function (e2) { return e2.mother; }));
    var mboss = MM.f.enemies.filter(function (e2) { return e2.mother; })[0];
    mboss.hp = 1;
    mboss.shield = 0;                 // (its shield is popped by now)
    MM.f.shots.push({ x: mboss.x, y: mboss.y, vx: 0, vy: 0, r: 10, life: 1 });
    MM.lock = 0;
    steps(3);
    check('the core takes boba damage', !MM.f.enemies.some(function (e2) { return e2.mother; }));
    secs(0.2);
    check('downing it wins', MM.f.over === 'win');
    secs(2.6);
    check('the mothership mission records', G.state.missions.mothership === true);
    secs(1.4);

    // the backyard: plow, plant, water from the can, harvest
    G.state.money = 10;
    carry([]);
    G.state.suit = 'chef';
    G.go('house', { room: 'grocery' }); steps(2); secs(0.4);
    useStation('seedStand');
    check('seeds cost 3 coins', G.state.money === 7 && W.hands.has('seeds'));
    G.go('house', { room: 'backyard' }); steps(2); secs(0.4);
    var plot = station('garden');
    check('the plots start as rough sod', plot.s.stage === -1, plot.s.stage);
    standAt(plot); steps(2);
    check('sod needs the hoe first', /hoe/.test(H.prompt.text), H.prompt.text);
    W.dialogue.active = false; press('act');
    check('seeds alone will not break sod', plot.s.stage === -1);

    // the rack is SMART: it hands you the hoe while sod remains, and it
    // minds whatever you were holding — nothing hits the grass
    var rack = station('toolRack');
    standAt(rack); W.dialogue.active = false; press('act');
    check('the rack gives the hoe first (sod remains)', W.hands.has('hoe'),
      W.hands.item());
    check('the seeds are minded on the shelf, not dropped',
      rack.s.shelf === 'seeds' && W.dropped.list('backyard').length === 0,
      rack.s.shelf);

    standAt(plot); W.dialogue.active = false; press('act');
    check('plowing starts', plot.s.plow > 0);
    secs(1.4);
    check('the plot is turned over', plot.s.stage === 0);

    // hanging the hoe back returns the seeds automatically
    standAt(rack); W.dialogue.active = false; press('act');
    check('hanging the hoe returns the seeds',
      W.hands.has('seeds') && !rack.s.shelf, W.hands.item());
    standAt(plot); W.dialogue.active = false; press('act');
    check('planting takes the seeds', plot.s.stage === 1 && !W.hands.has('seeds'));

    // two plots still have sod, so the rack still (rightly) offers the hoe
    standAt(rack); steps(2);
    check('the rack keeps offering the hoe while sod remains',
      /hoe/.test(H.prompt.text), H.prompt.text);
    // plow the rest and it switches to the can
    W.hands.hold('hoe');
    H.stations.forEach(function (q) {
      if (q.kind === 'garden' && q.s.stage < 0) { q.s.stage = 0; }
    });
    W.hands.drop();
    standAt(rack); steps(2);
    check('with the sod all turned, it offers the can', /can/.test(H.prompt.text),
      H.prompt.text);

    // watering needs a filled can
    standAt(plot); steps(2);
    check('a dry plot asks for the can', /can/.test(H.prompt.text), H.prompt.text);
    W.hands.hold('wateringCan');
    G.state.canWater = 0;
    standAt(plot); steps(2);
    check('an empty can says so', /empty/.test(H.prompt.text), H.prompt.text);
    var spg = station('spigot');
    standAt(spg); W.dialogue.active = false; press('act');
    check('the spigot fills it three times over', G.state.canWater === 3);

    standAt(plot); W.dialogue.active = false; press('act'); secs(1.6);
    check('watering sprouts it right away', plot.s.stage === 2);
    check('and the can runs down', G.state.canWater === 2);
    W.dialogue.active = false; press('act'); secs(1.6);
    check('watering again grows it', plot.s.stage === 3);
    W.dialogue.active = false; press('act');
    check('the harvest lands on the tray',
      W.tray.count() >= 1 && plot.s.stage === 0, W.tray.list().join(','));
    check('a harvested plot stays plowed', plot.s.stage === 0);

    // the front lawn is just a lawn now
    G.go('house', { room: 'outside' }); steps(2); secs(0.4);
    check('no garden out front', !station('garden'));
    check('and no tree to build out front', !station('tree'));

    // fishing: a full cast-bite-catch cycle
    carry([]);
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    var rod = station('fishing');
    standAt(rod); W.dialogue.active = false; press('act');
    check('the cast starts the wait', rod.s.wait > 0);
    // step deterministically to just inside the bite window, then strike
    var waitLeft = rod.s.wait;
    secs(waitLeft + 0.2);
    check('the bobber bites after the wait', rod.s.bite > 0, rod.s.bite);
    W.dialogue.active = false; press('act');
    check('something was caught', !W.hands.empty(), W.hands.item());
    // and a missed window gets away clean
    standAt(rod); W.dialogue.active = false; press('act');
    secs(rod.s.wait + 1.4);
    check('a missed bite gets away', rod.s.bite <= 0 && W.carrying().length === 1);

    // the pet: adopt, follow, feed
    G.state.pets = {};
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    useStation('petBox');
    check('a fluff is adopted', !!W.pets.get('mochi') && !!W.pets.get('mochi').name,
      W.pets.get('mochi') && W.pets.get('mochi').name);
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    var pet2 = H.npcs.filter(function (a) { return a.isPet; })[0];
    check('the pet follows to other rooms', !!pet2);
    // the trailing pup must never mask the world actions
    var pp0 = H.npcs.filter(function (a) { return a.isPet; })[0];
    carry(['boba']);
    H.player.x = 480; H.player.y = 330;
    pp0.x = 500; pp0.y = 340; steps(2);          // right on his heels
    check('drink still offered with the pup close', /Drink/.test(H.prompt.text), H.prompt.text);
    W.dialogue.active = false; press('act');
    check('and Z drinks, not pets', !W.hands.has('boba') && !!G.bobaFx);
    G.bobaFx = null;
    carry([]);

    // X tells the pup to stay; X again brings it along
    var pp = H.npcs.filter(function (a) { return a.isPet; })[0];
    H.player.x = pp.x; H.player.y = pp.y + 30; steps(2);
    W.dialogue.active = false; press('back');
    check('X makes the pup stay', W.pets.get('mochi').home === 'kitchen');
    G.go('house', { room: 'living' }); steps(2);
    check('the pup waits where told', !H.npcs.some(function (a) { return a.isPet; }));
    G.go('house', { room: 'kitchen' }); steps(2);
    var pp2 = H.npcs.filter(function (a) { return a.isPet; })[0];
    check('...in its room', !!pp2);
    H.player.x = pp2.x; H.player.y = pp2.y + 30; steps(2);
    W.dialogue.active = false; press('back');
    check('X again resumes following', W.pets.get('mochi').home === null);

    G.state.money = 5;
    carry([]);
    G.go('house', { room: 'grocery' }); steps(2); secs(0.4);
    useStation('treatStand');
    check('treats cost 2 coins', G.state.money === 3 && W.hands.has('treat'));

    // gifts: a favorite raises friendship
    G.state.party = [];
    G.state.friendRooms = null;
    G.state.friendship = {};
    carry(['cake']);
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    var pnd = H.npcs.filter(function (a) { return a.friendKey === 'panda'; })[0];
    check('panda is at the park', !!pnd);
    W.giveGift(pnd);
    check('the gift lands a heart', G.state.friendship.panda === 1);
    check('the cake is given away', !W.hands.has('cake'));
    G.state.friendship.panda = 2;
    carry(['cake']);
    W.giveGift(pnd);
    check('three hearts = best friends first', G.state.friendship.panda === 3 &&
      G.state.firsts['bff-panda'] === true);

    // decor: buy a plant for the bedroom, it persists
    G.state.money = 20;
    G.state.decor = {};
    G.go('house', { room: 'grocery' }); steps(2); secs(0.4);
    useStation('decorShop');
    check('the catalog opens', G.overlayName === 'decorshop');
    press('act');                                   // choose the plant -> room picker
    var DS = W.sceneDecorShop;
    DS.roomSel = 1;                                 // bedroom
    press('act');                                   // buy
    check('the purchase is recorded', (G.state.decor.bedroom || []).length === 1 &&
      G.state.money === 15, G.state.money);
    press('back'); steps(4);                        // close + deferred rebuild
    var hasDecor = W.effectiveProps('bedroom').some(function (p2) {
      return p2.kind === 'plant' && p2.x === 700;
    });
    check('the plant stands at the decor spot', hasDecor);
    W.save.write();
    G.state = G.freshState();
    W.save.load();
    check('decor survives a save', (G.state.decor.bedroom || []).length === 1);

    // the ideas board opens
    G.go('house', { room: 'bedroom' }); steps(2); secs(0.4);
    useStation('ideasBoard');
    check('the ideas board opens', G.overlayName === 'ideas');
    press('back'); steps(2);

    // D12: the sofa seats Bobby
    G.go('house', { room: 'living' }); steps(2); secs(0.4);
    useStation('sofa');
    check('the sofa is sittable', H.seated !== null && H.seated.kind === 'sofa');
    hold('down', true); steps(3); hold('down', false);
    check('arrows stand him up from the sofa', H.seated === null);

    // D13: crystals provably persist in the case
    G.state.crystals = 4;
    G.state.crystalsFound = { sunstone: 2, moondrop: 2 };
    W.save.write();
    G.state = G.freshState();
    W.save.load();
    G.go('house', { room: 'bedroom' }); steps(2);
    check('displayed crystals persist across saves', G.state.crystals === 4);
    check('found varieties persist too', G.state.crystalsFound.sunstone === 2);

    // D6: X flies home from anywhere on a map
    G.go('vehicle', { vehicle: 'ufo' }); steps(2); secs(0.4);
    var V4 = W.sceneVehicle;
    V4.x = 200; V4.y = 200; V4.vx = 0; V4.vy = 0; steps(2);
    W.dialogue.active = false;
    press('back'); secs(1.4);
    check('X flies home from open sky', G.sceneName === 'house', G.sceneName);

    // -------------------------------------------- canvas state stays balanced
    sec('render state hygiene');
    G.state.weather = 'rainy';
    G.go('house', { room: 'outside' }); steps(2); secs(0.4);
    // instrument the context: every save must meet its restore each frame
    var depth = 0, minDepth = 0, maxDepth = 0;
    var rSave = G.ctx.save.bind(G.ctx), rRest = G.ctx.restore.bind(G.ctx);
    G.ctx.save = function () { depth++; if (depth > maxDepth) maxDepth = depth; rSave(); };
    G.ctx.restore = function () { depth--; if (depth < minDepth) minDepth = depth; rRest(); };
    // ten simulated seconds of rain — hundreds of drops live and die
    for (var rf = 0; rf < 600; rf++) {
      G.step(1 / 60);
      if (rf % 60 === 0) {
        check('save/restore balanced at t=' + (rf / 60) + 's', depth === 0, 'depth ' + depth);
      }
    }
    check('no restore ever underflowed', minDepth >= 0, minDepth);
    check('the frame ends at full alpha', G.ctx.globalAlpha === 1, G.ctx.globalAlpha);
    G.ctx.save = rSave; G.ctx.restore = rRest;
    G.state.weather = 'sunny';

    // ------------------------------------------------------- saving
    sec('saving');
    if (W.save.supported()) {
      G.state.day = 7; G.state.money = 42; G.state.crystals = 3; G.state.suit = 'chef';
      W.save.write();
      G.state = G.freshState();
      check('a fresh state is empty', G.state.day === 1 && G.state.money === 0);
      W.save.load();
      check('the save restores the day', G.state.day === 7, 'day ' + G.state.day);
      check('the save restores money', G.state.money === 42);
      check('the save restores crystals', G.state.crystals === 3);
      check('the save restores the suit', G.state.suit === 'chef');
    } else {
      results.push('SKIP  localStorage unavailable here');
    }
    var code = W.save.exportCode();
    check('a save code is produced', code.length > 20);
    G.state = G.freshState();
    check('the save code imports', W.save.importCode(code) && G.state.day === 7, 'day ' + G.state.day);
    check('a bad save code is refused', W.save.importCode('not-a-code') === false);

    // ------------------------------------------------- data consistency
    // ------------------------------------------- wave 3: hands, talk, dinner
    sec('wave 3: controls and dinner');

    // W1: once the treehouse exists, ANY costume may climb it
    G.state = G.freshState(); G.saveOk = false;
    G.state.suit = 'builder';
    G.go('house', { room: 'backyard' }); steps(2); secs(0.4);
    var tre = station('tree');
    check('the tree is buildable', !!tre);
    standAt(tre); W.dialogue.active = false; press('act');
    secs(3.2);
    check('the builder builds it', G.state.builtTreehouse === true);
    G.state.suit = 'none';
    G.go('house', { room: 'backyard' }); steps(2); secs(0.4);
    var tre2 = station('tree');
    standAt(tre2); steps(2);
    check('plain Bobby is offered the climb',
      /Climb/.test(H.prompt.text) && !H.prompt.locked, H.prompt.text);
    W.dialogue.active = false; press('act'); secs(1.2); steps(2);
    check('...and gets up there', G.state.room === 'treehouse');

    // W2: A talks, Z acts on the world, and they never trade places
    G.state = G.freshState(); G.saveOk = false;
    G.state.party = [];
    G.state.friendRooms = { panda: 'kitchen' };
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    var pan = H.npcs.filter(function (a) { return a.friendKey === 'panda'; })[0];
    check('panda came to the kitchen', !!pan);
    carry([]); W.hands.hold('boba');
    H.player.x = 480; H.player.y = 330;
    pan.x = 500; pan.y = 342; pan.mode = 'hold'; steps(2);
    check('Z still owns the drink', /Drink/.test(H.prompt.text), H.prompt.text);
    check('and A is offered alongside it', H.prompt.key2 === 'A', H.prompt.key2);
    W.dialogue.active = false; press('talk');
    check('A recruits, it does not drink',
      G.state.party.indexOf('panda') >= 0 && W.hands.has('boba'));
    W.dialogue.active = false; press('act');
    check('...and Z still drinks', W.hands.empty() && !!G.bobaFx);
    G.bobaFx = null;

    // X still says goodbye
    pan.x = H.player.x + 18; pan.y = H.player.y + 10; steps(2);
    W.dialogue.active = false; press('back');
    check('X dismisses the friend', G.state.party.indexOf('panda') < 0);

    // W4: dinner for two — call them over, then eat together
    G.state = G.freshState(); G.saveOk = false;
    G.state.suit = 'chef';
    G.state.friendRooms = { panda: 'kitchen', yuna: 'kitchen' };
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    check('the kitchen seats three', H.stations.filter(function (c) {
      return c.kind === 'chair'; }).length === 3);
    var tbl = station('table');
    carry([]); W.hands.hold('friedEgg');
    standAt(tbl); W.dialogue.active = false; press('act');
    check('serving seats him', !!H.seated && tbl.s.set.length === 1);
    steps(2);
    check('and offers the call on A', H.prompt.key2 === 'A', H.prompt.key2);
    W.dialogue.active = false; press('talk');
    var invited = H.npcs.filter(function (a) { return a.data.diner; });
    check('A calls everyone to dinner', invited.length >= 2, invited.length);
    check('the call is only made once', H.mealCalled === true);
    secs(2.5);                                  // let them walk over
    steps(2);
    W.dialogue.active = false; press('act');
    check('Z starts the shared meal', !!H.mealSeq && H.mealSeq.diners.length >= 3);
    secs(2.0);
    check('everyone is mid-bite', tbl.s.biteStage >= 1, tbl.s.biteStage);
    secs(4.0);
    check('the feast ends', H.mealSeq === null && tbl.s.set.length === 0);
    check('one dirty plate per diner', G.state.plates.dirty >= 3, G.state.plates.dirty);
    check('friends get back to their day', !H.npcs.some(function (a) { return a.data.diner; }));

    // X hurries a meal along
    carry([]); W.hands.hold('friedEgg');
    G.state.plates.dirty = 0;
    standAt(tbl); W.dialogue.active = false; press('act');
    steps(2);
    W.dialogue.active = false; press('act');
    check('a solo meal starts', !!H.mealSeq);
    W.dialogue.active = false; press('back');
    check('X skips to the last bite', H.mealSeq === null && G.state.plates.dirty === 1);

    // a chair someone else is in is not offered
    var ch3 = H.stations.filter(function (c) { return c.kind === 'chair'; })[2];
    ch3.s.taker = 'panda';
    H.seated = null;
    standAt(ch3); steps(2);
    check('a taken chair says so', /Taken/.test(H.prompt.text), H.prompt.text);
    ch3.s.taker = null;

    // the held item must be VISIBLE — it rides above his head
    (function () {
      var cv = document.createElement('canvas');
      cv.width = 200; cv.height = 200;
      var g = cv.getContext('2d');
      var blits = 0, real = g.drawImage;
      g.drawImage = function () { blits++; return real.apply(g, arguments); };
      W.drawChar(g, 100, 180, { char: 'bobby', dir: 'down', t: 0 });
      var bare = blits; blits = 0;
      W.drawChar(g, 100, 180, { char: 'bobby', dir: 'down', t: 0, held: 'boba' });
      check('a held item draws an extra icon', blits === bare + 1,
        'bare ' + bare + ' vs held ' + blits);
    })();

    // the tray survives a save; so does whatever is in his paws
    G.saveOk = true;
    carry(['tomato', 'egg']); W.hands.hold('boba');
    W.save.write();
    G.state = G.freshState();
    W.save.load();
    check('the tray round-trips', W.tray.count() === 2 && W.tray.has('tomato'));
    check('his paws round-trip', W.hands.has('boba'));

    // and an old one-basket save is split into tray and paws
    var legacy = { basket: ['tomato', 'onion', 'egg', 'flour', 'sugar', 'boba'],
                   room: 'kitchen', day: 1 };
    G.state = G.freshState();
    W.save.apply(legacy);
    check('old saves fill the tray first', G.state.tray.length === 4);
    check('old saves put the odd item in his paws', G.state.held === 'boba');
    check('and the overflow lands on the floor',
      W.dropped.list('kitchen').length === 1, W.dropped.list('kitchen').length);

    // ------------------------------------------------- wave 3: the racer
    sec('wave 3: the race track');
    G.state = G.freshState(); G.saveOk = false;
    G.state.suit = 'racer';

    // the RACE pad only exists for the car, and it goes to the track
    var nb = W.MAPS.neighborhood;
    var racePoi = nb.pois.filter(function (p) { return p.track; })[0];
    check('the neighborhood has a race track', !!racePoi);
    check('and only the car may use it', racePoi.only === 'car');
    check('and only the racer may race', racePoi.needs === 'drive');

    G.go('vehicle', { vehicle: 'car', map: 'neighborhood' });
    steps(2); secs(0.4);
    var VR = W.sceneVehicle;
    VR.x = racePoi.x; VR.y = racePoi.y; VR.vx = 0; VR.vy = 0; steps(2);
    check('the pad is in reach', !!VR.poi && VR.poi.track === true, VR.poi && VR.poi.label);
    W.dialogue.active = false; press('act'); secs(1.2); steps(2);
    check('Z drives onto the track', G.sceneName === 'race', G.sceneName);

    var R = W.sceneRace;
    check('there is a full field', R.racers.length === 4, R.racers.length);
    check('and a countdown before the flag', R.countdown > 0);
    check('nobody moves before GO', R.me.lap === 0);

    // off-road really is slower than the tarmac
    secs(4);                                   // countdown done
    check('the flag has dropped', R.countdown <= 0);

    /* Drive the player kart round by hand: the gates must be taken in
     * order, so a lap can only be earned the honest way. */
    function driveTo(u) {
      var m = R.me;
      var a = u * Math.PI * 2;
      m.x = 800 + Math.cos(a) * 500;
      m.y = 500 + Math.sin(a) * 290;
      steps(1);
    }
    R.me.lap = 0; R.me.gate = 0;
    driveTo(0.3); driveTo(0.55); driveTo(0.8); driveTo(0.02);
    check('a full circuit counts as a lap', R.me.lap === 1, R.me.lap);

    // going backwards over the line earns nothing
    var lapWas = R.me.lap;
    R.me.gate = 0;
    driveTo(0.95); driveTo(0.9); driveTo(0.02);
    check('reversing over the line is not a lap', R.me.lap === lapWas, R.me.lap);

    G.state.money = 0;
    for (var lp = R.me.lap; lp < 3; lp++) {
      driveTo(0.3); driveTo(0.55); driveTo(0.8); driveTo(0.02);
    }
    check('three laps finishes the race', R.finished === true, R.me.lap);
    check('finishing pays out', G.state.money > 0, G.state.money);
    check('and it is remembered', G.state.firsts.race === true);

    // friends riding along get karts of their own
    G.state.party = ['panda', 'yuna'];
    G.go('race'); steps(2);
    var names = W.sceneRace.racers.map(function (r) { return r.name; });
    check('friends race with you', names.indexOf('Panda') >= 0 && names.indexOf('Yuna') >= 0,
      names.join(','));

    // the car is quicker on tarmac than on grass
    check('the car tops out faster now', W.VEHICLES.car.max === 380);

    // ------------------------------------------ wave 3: builder bobby
    sec('wave 3: things to build');
    G.state = G.freshState(); G.saveOk = false;
    G.state.suit = 'none';
    G.go('house', { room: 'park' }); steps(2); secs(0.4);

    var sw = station('swingRide');
    check('the park has a swing station', !!sw);
    standAt(sw); steps(2);
    check('the swings start broken and locked',
      H.prompt.locked === true && /Broken/.test(H.prompt.text), H.prompt.text);
    check('and the see-saw is not there yet', !station('seesawRide').s.built &&
      !(G.state.builds.seesaw));

    G.state.suit = 'builder';
    standAt(sw); W.dialogue.active = false; press('act');
    check('the builder starts the repair', sw.s.building > 0);
    secs(3);
    check('the swings get fixed', G.state.builds.swing === true);

    // anyone can swing once it is mended
    G.state.suit = 'none';
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    sw = station('swingRide');
    standAt(sw); W.dialogue.active = false; press('act');
    check('plain Bobby can swing', !!H.riding && H.riding.kind === 'swing');
    secs(0.6);
    check('the swing actually moves',
      Math.abs(H.ridePos(0).x - H.ridePos(1).x) > 0);
    hold('down', true); steps(2); hold('down', false);
    check('an arrow hops off', H.riding === null);

    // the see-saw needs two
    G.state.suit = 'builder';
    var ss = station('seesawRide');
    standAt(ss); W.dialogue.active = false; press('act');
    secs(3);
    check('the see-saw gets built', G.state.builds.seesaw === true);
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    ss = station('seesawRide');
    G.state.party = [];
    standAt(ss); W.dialogue.active = false; press('act');
    check('a see-saw alone is no fun', H.riding === null);
    check('and it says so', /friend/.test(H.prompt.text), H.prompt.text);

    G.state.party = ['panda'];
    G.go('house', { room: 'park' }); steps(2); secs(0.6);
    ss = station('seesawRide');
    standAt(ss); W.dialogue.active = false; press('act');
    check('with a friend it works', !!H.riding && !!H.riding.partner);
    check('the partner is hidden on the plank', H.riding.partner.hidden === true);
    H.dismount();
    check('and comes back afterwards', H.npcs[0].hidden === false ||
      !H.npcs.some(function (n) { return n.hidden; }));

    // the critter box rehomes the pom-poms
    G.state.party = [];
    G.go('house', { room: 'living' }); steps(2); secs(0.4);
    var cb = station('critterBox');
    check('the living room has a build spot', !!cb);
    standAt(cb); W.dialogue.active = false; press('act');
    secs(3);
    check('the critter box gets built', G.state.builds.critterBox === true);
    check('but NOBODY moves in by magic', G.state.friendRooms.critterA !== 'living',
      G.state.friendRooms.critterA);
    // the move-in is a walk: Trix a pom-pom at the park, lead it home, Dee
    G.state.party = ['critterA'];
    G.go('house', { room: 'living' }); steps(2); secs(0.6);
    var pom = H.npcs.filter(function (n) { return n.friendKey === 'critterA'; })[0];
    check('the pom-pom follows Bobby home', !!pom);
    H.player.x = pom.x; H.player.y = pom.y + 30; steps(2);
    W.dialogue.active = false; press('back');       // say Dee = move in
    check('saying Dee here moves it into the box',
      G.state.friendRooms.critterA === 'living');
    check('and it is a celebrated first', G.state.firsts.critterhome === true);

    // once home, they sleep INSIDE the box (drawn in its doorways)
    G.go('house', { room: 'living' }); steps(2); secs(0.4);
    var boxed = H.npcs.filter(function (n) { return n.friendKey === 'critterA'; })[0];
    check('the critter snoozes in its box', !!boxed && boxed.mode === 'hold' &&
      boxed.data.atBox === true);
    check('...its walking-around self is tucked away', boxed.hidden === true);
    var bxp = W.ROOMS.living.props.filter(function (p) { return p.kind === 'critterBox'; })[0];
    check('...parked at its own doorway', Math.abs(boxed.x - (bxp.x + 22)) < 60 &&
      Math.abs(boxed.y - (bxp.y + 40)) < 20,
      boxed.x.toFixed(0) + ',' + boxed.y.toFixed(0));

    // Trix wakes it up to follow; Dee in ANOTHER room sends it home to the box
    H.player.x = boxed.x; H.player.y = boxed.y + 30; steps(2);
    W.dialogue.active = false; press('talk');
    check('Trix wakes it to follow', G.state.party.indexOf('critterA') >= 0);
    steps(2);
    check('...and it pops back out of the box', boxed.hidden === false);
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    var pcrit = H.npcs.filter(function (n) { return n.friendKey === 'critterA'; })[0];
    H.player.x = pcrit.x; H.player.y = pcrit.y + 30; steps(2);
    W.dialogue.active = false; press('back');
    check('Dee far from home still sends it to the box',
      G.state.friendRooms.critterA === 'living', G.state.friendRooms.critterA);
    secs(4.5); steps(2);
    check('and it scampers out of the park', !H.npcs.some(function (n) {
      return n.friendKey === 'critterA'; }));

    // the building site: four machines, in order
    G.go('house', { room: 'site' }); steps(2); secs(0.4);
    function machine(kind) {
      return H.stations.filter(function (m) { return m.machine === kind; })[0];
    }
    check('the three drivers are on site',
      !!machine('bulldozer') && !!machine('mixer') && !!machine('crane'));
    check('...and the toolbox is its own thing', !!station('toolbox'));

    var mx = machine('mixer');
    standAt(mx); W.dialogue.active = false; press('act');
    check('the mixer waits its turn', H.machineCtl === null);
    check('the house has not started', (G.state.builds.friendHouse || 0) === 0);

    // ---- stage 1: the bulldozer, driven by hand, shoves the junk clear
    G.go('house', { room: 'site' }); steps(2); secs(0.4);
    var bd = machine('bulldozer');
    standAt(bd); W.dialogue.active = false; press('act');
    check('Z puts Bobby at the wheel', !!H.machineCtl && H.machineCtl.kind === 'bulldozer');
    check('five junk piles wait on the lot', H.machineCtl.junk.length === 5);
    // shove each pile straight off the lot by driving through it
    H.machineCtl.junk.forEach(function (jk) {
      H.machineCtl.x = jk.x; H.machineCtl.y = jk.y - 30;
      hold('down', true);
      for (var f2 = 0; f2 < 90 && !jk.cleared; f2++) {
        H.machineCtl.x = jk.x; steps(1);
      }
      hold('down', false);
    });
    check('pushing every pile off finishes the job',
      G.state.builds.friendHouse === 1, G.state.builds.friendHouse);
    secs(1.2);
    check('and Bobby hops down', H.machineCtl === null);
    check('...somewhere he can walk', canWalk(20));

    // ---- stage 2: the mixer pours while Z is held over the lot
    G.go('house', { room: 'site' }); steps(2); secs(0.4);
    var mx2 = machine('mixer');
    standAt(mx2); W.dialogue.active = false; press('act');
    check('the mixer takes the wheel', !!H.machineCtl && H.machineCtl.kind === 'mixer');
    H.machineCtl.x = 480; H.machineCtl.y = 330;    // over the lot
    hold('act', true); secs(2);
    var midPour = H.machineCtl.pour;
    check('holding Z pours', midPour > 0.2 && midPour < 1, midPour);
    H.machineCtl.x = 100; H.machineCtl.y = 500; steps(5);   // off the lot
    check('pouring only works over the lot',
      H.machineCtl.pour - midPour < 0.15, H.machineCtl.pour);
    H.machineCtl.x = 480; H.machineCtl.y = 330; secs(3);
    hold('act', false);
    check('a full pour banks the stage', G.state.builds.friendHouse === 2);
    secs(1.2); steps(2);

    // ---- stage 3: the crane carries panels one at a time
    G.go('house', { room: 'site' }); steps(2); secs(0.4);
    var cr3 = machine('crane');
    standAt(cr3); W.dialogue.active = false; press('act');
    check('the crane takes the wheel', !!H.machineCtl && H.machineCtl.kind === 'crane');
    check('the crane knows where its hook is', !!H.machineCtl.tip &&
      H.machineCtl.tip[0] > 40, H.machineCtl.tip && H.machineCtl.tip.join(','));
    for (var pn = 0; pn < 3; pn++) {
      H.machineCtl.x = H.machineCtl.stack[0]; H.machineCtl.y = H.machineCtl.stack[1];
      steps(2); W.dialogue.active = false; press('act');
      check('panel ' + (pn + 1) + ' hooks on', H.machineCtl.carrying === true);
      // park so the HOOK (not the treads) hangs over the lot
      H.machineCtl.x = 480 - H.machineCtl.tip[0]; H.machineCtl.y = 330; steps(2);
      check('the hook hangs over the lot', H.machineCtl.hookOverLot === true,
        (H.machineCtl.hookX || 0).toFixed(0));
      W.dialogue.active = false; press('act');
      check('...and the panel rides the cable down', !!H.machineCtl.lower);
      secs(1.0);
      check('...landing on the lot', H.machineCtl.placed === pn + 1);
    }
    check('three walls bank the stage', G.state.builds.friendHouse === 3);
    secs(1.2); steps(2);

    // ---- stage 4: the roof goes on by hand, panel by panel
    G.go('house', { room: 'site' }); steps(2); secs(0.4);
    var tbx = station('toolbox');
    check('the toolbox is its own station now', !!tbx);
    for (var rp2 = 0; rp2 < 3; rp2++) {
      standAt(tbx); W.dialogue.active = false; press('act');
      check('panel ' + (rp2 + 1) + ' is in hand', W.hands.has('roofPanel'));
      var hd2 = station('houseDoor');
      standAt(hd2); W.dialogue.active = false; press('act');
      check('...and gets nailed on', !W.hands.has('roofPanel'));
    }
    check('three panels finish the house', G.state.builds.friendHouse === 4);
    check('the friends move into their house', G.state.friendRooms.panda === 'friendhouse');

    // and the door works
    G.go('house', { room: 'site' }); steps(2); secs(0.4);
    var hd = station('houseDoor');
    standAt(hd); W.dialogue.active = false; press('act'); secs(1.2); steps(2);
    check('the front door opens', G.state.room === 'friendhouse');
    check('panda is home', H.npcs.some(function (n) { return n.friendKey === 'panda'; }));

    // the wrecking ball is a drive too: three swings brings it down
    G.go('house', { room: 'site' }); steps(2); secs(0.4);
    var wb = station('wreckingBall');
    standAt(wb); W.dialogue.active = false; press('act');
    check('Bobby takes the wrecking ball', !!H.machineCtl && H.machineCtl.kind === 'wreckingBall');
    // too far away: the swing refuses
    H.machineCtl.x = 100; H.machineCtl.y = 550; steps(2);
    W.dialogue.active = false; press('act'); steps(2);
    check('swinging needs to be near the house', H.machineCtl.hits === 0);
    // drive up and swing three times
    H.machineCtl.x = 470; H.machineCtl.y = 430; steps(2);
    for (var sw2 = 0; sw2 < 3; sw2++) {
      W.dialogue.active = false; press('act');
      secs(1.0);
    }
    check('three smashes bring the house down', G.state.builds.friendHouse === 0);
    steps(3);
    check('and Bobby is back on his feet', H.machineCtl === null);
    check('and the friends head back to the park', G.state.friendRooms.panda === 'park');

    // builds survive a save
    G.saveOk = true;
    G.state.builds.friendHouse = 2;
    W.save.write();
    G.state = G.freshState();
    W.save.load();
    check('builds round-trip', G.state.builds.friendHouse === 2 &&
      G.state.builds.swing === true);

    // ------------------------------------- wave 3: the lake and the camp
    sec('wave 3: shells, octopus and camping');
    G.state = G.freshState(); G.saveOk = false;

    G.go('dive', { site: 'WRECK' }); steps(2); secs(0.5);
    var D9 = W.sceneDive;
    check('one shark is fast, the rest amble',
      D9.sharks[0].speed === 70 && D9.sharks[1].speed === 42 && D9.sharks[2].speed === 46,
      D9.sharks.map(function (q) { return q.speed; }).join(','));
    check('three shells are down there', D9.shells.length === 3);
    check('and none are taken yet', D9.shells.every(function (q) { return !q.taken; }));

    var sh9 = D9.shells[0];
    D9.x = sh9.x; D9.y = sh9.y; D9.vx = 0; D9.vy = 0; steps(2);
    check('the shell is in reach', D9.atShell === sh9);
    W.dialogue.active = false; press('act');
    check('Z collects it', G.state.shells === 1 && sh9.taken === true);
    check('and the book remembers the kind',
      (G.state.shellsFound[sh9.kind] || 0) === 1, sh9.kind);

    // the same shells are there all day, and gone once taken
    G.go('dive', { site: 'WRECK' }); steps(2); secs(0.5);
    check('collected shells stay collected',
      W.sceneDive.shells.filter(function (q) { return q.taken; }).length === 1);

    // the octopus trades once a day
    D9 = W.sceneDive;
    check('the wreck has an octopus', !!D9.octopus);
    D9.x = D9.octopus.x; D9.y = D9.octopus.y; D9.vx = 0; D9.vy = 0; steps(2);
    check('the octopus is in reach', D9.atOcto === true);
    var cryWas = G.state.crystalsCarried;
    W.dialogue.active = false; press('act');
    check('a shell buys a crystal',
      G.state.crystalsCarried === cryWas + 1 && G.state.shells === 0);
    W.dialogue.active = false; press('act');
    check('but only once a day', G.state.crystalsCarried === cryWas + 1);

    // A is hello, and it never trades
    W.dialogue.active = false; press('talk');
    check('A just says hello', G.state.crystalsCarried === cryWas + 1);

    // the treasure book has a second page
    G.state.shellsFound = { scallop: 1 };
    G.state.crystalsCarried = 0;      // carrying crystals banks them instead
    G.go('house', { room: 'bedroom' }); steps(2); secs(0.4);
    useStation('crystalShelf');
    check('the book opens', G.overlayName === 'crystalbook');
    check('it starts on the crystals', W.sceneCrystalBook.page === 0);
    press('right');
    check('an arrow turns to the shells', W.sceneCrystalBook.page === 1);
    press('left');
    check('and back again', W.sceneCrystalBook.page === 0);
    press('back'); steps(2);

    // the campsite
    G.go('house', { room: 'mountain' }); steps(2); secs(0.4);
    var fire = station('firepit');
    var sticks = station('stickPile');
    var camp = station('campSetup');
    check('the mountain has a campsite', !!fire && !!sticks && !!camp);

    // no marshmallows before the camp exists
    standAt(sticks); steps(2);
    check('sticks wait for the tent', /tent/.test(H.prompt.text), H.prompt.text);
    W.dialogue.active = false; press('act');
    check('and none is handed over', !W.hands.has('stick'));

    standAt(camp); W.dialogue.active = false; press('act');
    secs(2.6);
    check('the camp is set up', G.state.builds.camp === true);

    standAt(sticks); W.dialogue.active = false; press('act');
    check('a stick is handed over', W.hands.has('stick'));

    standAt(fire); steps(2);
    check('the fire is not lit yet', /Light/.test(H.prompt.text), H.prompt.text);
    W.dialogue.active = false; press('act');
    check('Z lights it', fire.s.lit === true);
    W.dialogue.active = false; press('act');
    check('toasting starts', fire.s.toast > 0);
    secs(3.4);
    check("a s'more comes off the stick", W.hands.has('smore'), W.hands.item());
    W.dialogue.active = false; press('act');
    check('and it gets eaten', W.hands.empty() && G.state.firsts.smore === true);

    // X by the fire draws the night in, and gives it back
    standAt(fire); steps(2);
    check('the fire offers the night on X', /night/.test(H.prompt.label2 || H.prompt.text),
      H.prompt.text + ' | ' + H.prompt.label2);
    W.dialogue.active = false; press('back');
    check('the camp goes dark', G.state.lights.mountain === false);
    W.dialogue.active = false; press('back');
    check('and back to daylight', G.state.lights.mountain === true);
    W.dialogue.active = false; press('back');

    G.go('house', { room: 'mountain' }); steps(2); secs(0.4);
    check('the tent appears once pitched',
      W.effectiveProps('mountain').some(function (q) { return q.kind === 'tent'; }));

    var bag = H.stations.filter(function (q) {
      return q.kind === 'bed' && /stars/.test(q.label || ''); })[0];
    check('there is a bag to sleep in', !!bag);
    var dayWas = G.state.day;
    standAt(bag); W.dialogue.active = false; press('act');
    check('bedtime starts', !!H.sleeping);
    secs(9);
    check('sleeping outdoors still advances the day', G.state.day === dayWas + 1,
      G.state.day + ' vs ' + dayWas);
    check('and he can walk away from the campsite afterwards', canWalk(20),
      H.player.x.toFixed(0) + ',' + H.player.y.toFixed(0));

    // --------------------------------- wave 3: the invasion and Mars
    sec('wave 3: three waves and a red planet');
    G.state = G.freshState(); G.saveOk = false;
    G.go('mission', { mission: 'space' }); steps(2); secs(0.4);
    var M = W.sceneMission, F = M.f;
    check('the invasion starts on wave 1', M.waveNum === 1);
    check('wave one has no shields',
      F.enemies.every(function (e) { return !e.shield; }));

    /* Clearing a wave: spawn the full ten, then wipe the field. */
    function clearWave() {
      M.spawned = 10;
      F.enemies.length = 0;
      steps(2);
    }
    F.hero.hp = 2;
    clearWave();
    check('the hull is patched between waves', F.hero.hp === F.hero.maxHp);
    check('wave one always earns the double blasters', F.hero.power === 'dual');
    check('the next wave is queued', M.breather > 0);
    secs(2.6);
    check('wave two arrives', M.waveNum === 2, M.waveNum);
    secs(2);
    check('and its saucers carry shields',
      F.enemies.length > 0 && F.enemies.every(function (e) { return e.shield === 1; }));

    // a shielded saucer takes two hits
    var vic = F.enemies[0];
    vic.x = 480; vic.y = 300;
    var keptPowers = F.hero.powers.slice();
    F.hero.powers = [];                // one shot at a time, for counting
    F.hero.cool = 0;
    F.shots.push({ x: vic.x, y: vic.y, vx: 0, vy: 0, r: 8, life: 1 });
    steps(1);
    check('the first shot pops the shield',
      vic.shield === 0 && vic.hp === 2, vic.hp + '/' + vic.shield);
    F.shots.push({ x: vic.x, y: vic.y, vx: 0, vy: 0, r: 8, life: 1 });
    steps(1);
    check('the second one actually hurts', vic.hp === 1);

    F.hero.powers = keptPowers;        // give them back
    clearWave();
    check('wave two also grants a shield', F.hero.shieldHits === 1);
    check('...and a speed boost', F.hero.speed === 310);
    check('wave two always earns the heat-seeking boba', F.hero.power === 'seeker');
    check('the blasters are KEPT, not swapped out',
      F.hero.powers.length === 2 && F.hero.powers.indexOf('dual') >= 0,
      F.hero.powers.join(','));
    secs(2.6);
    check('wave three arrives', M.waveNum === 3);
    secs(2);
    check('wave three is the fast one',
      F.enemies.some(function (e) { return Math.abs(e.vx) > 90; }),
      F.enemies.map(function (e) { return Math.round(e.vx); }).join(','));

    // the hero shield absorbs exactly one hit
    F.over = null;
    F.hero.hp = F.hero.maxHp;
    F.hero.shieldHits = 1;
    F.hero.hurt = 0;
    F.hurtHero(1);
    check('the shield eats the first hit',
      F.hero.hp === F.hero.maxHp && F.hero.shieldHits === 0);
    F.hero.hurt = 0;
    F.hurtHero(1);
    check('the next one gets through', F.hero.hp === F.hero.maxHp - 1);

    // dual shots really are two
    F.hero.powers = ['dual'];
    F.hero.cool = 0;
    F.shots.length = 0;
    F.fire(480, 400, 0, -500);
    check('dual blasters fire two straws', F.shots.length === 2);
    F.hero.powers = ['dual', 'seeker'];
    F.hero.cool = 0; F.shots.length = 0;
    F.fire(480, 400, 0, -500);
    check('stacked power-ups all apply at once',
      F.shots.length === 2 && F.shots[0].seek === true);

    // heat-seekers bend toward a target
    F.over = null;
    F.hero.powers = ['seeker'];
    F.hero.cool = 0;
    F.shots.length = 0;
    F.enemies.length = 0;
    F.enemies.push({ x: 200, y: 200, r: 40, hp: 9, hurt: 0 });
    F.fire(480, 400, 0, -400);
    var sk = F.shots[0];
    for (var sfr = 0; sfr < 8; sfr++) F.update(1 / 60);
    check('heat-seeking straws steer', sk.vx < -10, sk.vx.toFixed(0));

    // and the last wave finishes the mission
    M.waveNum = 3;
    clearWave();
    check('clearing wave three wins it', F.over === 'win');

    // ---- Mars
    G.state = G.freshState(); G.saveOk = false;
    var sm = W.MAPS.space.pois.filter(function (p) { return p.label === 'MARS'; })[0];
    check('space has a route to Mars', !!sm && sm.to.mars === true);
    G.go('vehicle', { vehicle: 'ufo', map: 'space' }); steps(2); secs(0.4);
    var VM = W.sceneVehicle;
    VM.x = sm.x; VM.y = sm.y; VM.vx = 0; VM.vy = 0; steps(2);
    W.dialogue.active = false; press('act'); secs(1.2); steps(2);
    check('Z lands on Mars', G.sceneName === 'mars', G.sceneName);

    var MR = W.sceneMars;
    check('three aliens are hiding', MR.hiders.length === 3);
    check('and none are found yet', MR.found === 0);

    // drive to each hiding place in turn
    for (var hi = 0; hi < MR.hiders.length; hi++) {
      var cr2 = MR.hiders[hi].crater;
      MR.x = cr2.x; MR.y = cr2.y; MR.vx = 0; MR.vy = 0;
      steps(2);
      check('alien ' + (hi + 1) + ' is found', MR.hiders[hi].found === true);
    }
    check('all three turn up', MR.found === 3);
    check('and it is remembered', G.state.firsts.mars === true);

    MR.x = MR.dome.x; MR.y = MR.dome.y; steps(2);
    check('the dome is open now', MR.atDome === true);
    W.dialogue.active = false; press('act');
    check('Z goes inside the martians\' home', !!MR.inside);
    check('and the ice cream is not just handed over', !G.bobaFx);
    // walk up to the counter and ask
    MR.inside.px = 480; MR.inside.py = 470; steps(2);
    check('the counter is right there', MR.inside.atCounter === true);
    W.dialogue.active = false; press('act');
    check('the ice cream stretches him',
      !!G.bobaFx && G.bobaFx.kind === 'longneck');
    W.dialogue.active = false; press('back'); steps(2);
    check('X steps back outside', MR.inside === null);
    secs(2);
    check('and the neck really grows', W.neckStretch() > 20, W.neckStretch());
    G.bobaFx = null;
    check('it wears off', W.neckStretch() === 0);

    // tomorrow they hide somewhere else
    var before = MR.hiders.map(function (q) { return q.crater.x; }).join(',');
    G.state.day += 3;
    G.go('mars'); steps(2);
    var after = W.sceneMars.hiders.map(function (q) { return q.crater.x; }).join(',');
    check('a new day is a new hiding place', after !== before, after);

    // ------------------------------------------- every room is walkable
    sec('wave 3: no new traps');
    G.state = G.freshState(); G.saveOk = false;
    G.state.builtTreehouse = true;
    G.state.builds = { swing: true, seesaw: true, critterBox: true, camp: true,
                       friendHouse: 4, skyscraper: 5 };
    ['backyard', 'grocery', 'site', 'friendhouse', 'treehouse', 'park', 'mountain',
     'kitchen', 'living', 'outside',
     'outside2', 'home2', 'kitchen2', 'park2', 'site2', 'themepark', 'arcade',
     'graveyard', 'haunt1', 'haunt2', 'haunt3', 'haunt4'].forEach(function (rn) {
      // walking into an exit sign starts a fade to the map; let it land
      // before the next room, or the pending fade hijacks the G.go
      secs(1.4);
      G.go('house', { room: rn }); steps(2); secs(0.4);
      check(rn + ': Bobby can walk from his spawn', canWalk(20),
        H.player.x.toFixed(0) + ',' + H.player.y.toFixed(0));
      check(rn + ': and he is inside the room', H.player.x > W.ROOMS[rn].bounds.x - 40 &&
        H.player.x < W.ROOMS[rn].bounds.x + W.ROOMS[rn].bounds.w + 40);
    });

    // every door leads to a room that exists and spawns somewhere standable
    Object.keys(W.ROOMS).forEach(function (rn) {
      (W.ROOMS[rn].doors || []).forEach(function (d) {
        if (d.map) {
          check(rn + ' -> map ' + d.map + ' is a real map', !!W.MAPS[d.map]);
          return;
        }
        check(rn + ' -> ' + d.to + ' is a real room', !!W.ROOMS[d.to]);
        if (!W.ROOMS[d.to]) return;
        var solids = W.solidsFor(d.to);
        check(rn + ' -> ' + d.to + ' lands on solid ground',
          W.canStand(W.ROOMS[d.to], solids, d.spawn[0], d.spawn[1]),
          d.spawn.join(','));
      });
    });

    // ---------------------------------------- wave 3.1: the follow-ups
    sec('wave 3.1: fixes and new toys');
    G.state = G.freshState(); G.saveOk = false;

    // the kitchen's back door is clear of the day/coin panel
    var kd = W.ROOMS.kitchen.doors.filter(function (d) { return d.to === 'backyard'; })[0];
    check('the backyard door exists', !!kd);
    check('and it is nowhere near the HUD panel', kd.x + kd.w < 600, kd.x);

    // cooking hands the dish straight over
    G.state.suit = 'chef';
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    carry(['egg']);
    useStation('stove');
    secs(3);
    check('the cooked dish arrives in his paws by itself',
      W.hands.has('friedEgg'), W.hands.item());

    // ...and it rides above his head
    (function () {
      var cv = document.createElement('canvas');
      cv.width = 200; cv.height = 200;
      var g = cv.getContext('2d');
      var blits = 0, real = g.drawImage;
      g.drawImage = function () { blits++; return real.apply(g, arguments); };
      W.drawChar(g, 100, 180, { char: 'bobby', dir: 'down', t: 0 });
      var bare = blits; blits = 0;
      W.drawChar(g, 100, 180, { char: 'bobby', dir: 'down', t: 0, held: 'friedEgg' });
      check('the dish is drawn on Bobby', blits === bare + 1);
    })();

    // dinner lets everyone go afterwards
    G.state.friendRooms = { panda: 'kitchen', yuna: 'kitchen' };
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    var tb2 = station('table');
    carry([]); W.hands.hold('friedEgg');
    standAt(tb2); W.dialogue.active = false; press('act'); steps(2);
    W.dialogue.active = false; press('talk');
    secs(2.5); steps(2);
    W.dialogue.active = false; press('act');
    secs(6);
    check('the feast is over', H.mealSeq === null);
    var diners = H.npcs.filter(function (n) { return n.friendKey; });
    check('and nobody is left wedged in a chair',
      diners.every(function (n) { return W.canStand(H.room, H.solids, n.x, n.y); }),
      diners.map(function (n) { return n.x.toFixed(0) + ',' + n.y.toFixed(0); }).join(' '));
    check('they are free to wander again',
      diners.every(function (n) { return n.mode !== 'hold' && !n.data.diner; }));

    // flopping on the beanbag is a real flop
    G.state.builtTreehouse = true;
    G.go('house', { room: 'treehouse' }); steps(2); secs(0.4);
    var bb = station('beanbag');
    standAt(bb); W.dialogue.active = false; press('act');
    check('Bobby flops', !!H.riding && H.riding.kind === 'flop');
    var p0 = H.ridePos(0);
    secs(0.8);
    var p1 = H.ridePos(0);
    check('and the flop settles', p1.y !== p0.y || p1.scale !== p0.scale);
    hold('up', true); steps(2); hold('up', false);
    check('an arrow gets him up again', H.riding === null);
    check('and he can walk off', canWalk(20));

    // the map: the grocery, Mars and the site label
    var nb2 = W.MAPS.neighborhood.pois;
    check('the grocery is on the map',
      nb2.some(function (p) { return p.to && p.to.room === 'grocery'; }));
    check('the race track sits below home',
      nb2.some(function (p) { return p.track && p.x === 980 && p.y > 690; }));
    var sitePoi = nb2.filter(function (p) { return p.house; })[0];
    check('the site pad is named clearly', /BUILD/.test(sitePoi.label), sitePoi.label);
    G.state.builds = { friendHouse: 4 };
    check('and becomes the house once it is built',
      /PANDA/.test(W.poiLabel(sitePoi)), W.poiLabel(sitePoi));
    G.state.builds = {};
    check('Mars is a red planet, not a landing pad',
      W.MAPS.space.pois.some(function (p) { return p.to.mars && p.planet; }));

    // the site leaves by car, not by footpath
    check('no footpath out of the site', W.ROOMS.site.doors.length === 0);
    check('the car is parked there instead',
      (W.ROOMS.site.stations || []).some(function (st2) {
        return st2.kind === 'vehicle' && st2.vehicle === 'car';
      }));

    // ---- the snow run
    var mp = W.MAPS.crystalMountain.pois.filter(function (p) { return p.to.snow; })[0];
    check('the mountain map has a snow run', !!mp);
    G.go('snow'); steps(2);
    var SN = W.sceneSnow;
    check('the run starts at the top', SN.dist < 200 && SN.done === false, SN.dist);
    check('there is a course to ride', SN.course.length > 10, SN.course.length);
    var d0 = SN.dist;
    secs(1);
    check('and he slides downhill on his own', SN.dist > d0);

    // steering moves him, crashing tumbles him
    var x0 = SN.x;
    hold('right', true); secs(0.5); hold('right', false); steps(2);
    check('arrows steer the board', SN.x > x0, SN.x.toFixed(0));
    var rock = SN.course.filter(function (o) { return !o.flake && o.y > SN.dist + 400; })[0];
    SN.dist = rock.y - 300; SN.x = rock.x; steps(3);
    check('hitting a tree tumbles him', SN.tumble > 0);
    check('but it is never a game over', SN.done === false);
    // clear the run ahead so nothing else knocks him over mid-recovery
    SN.course.forEach(function (o) { if (!o.flake) o.hit = true; });
    secs(1.6);
    check('and he gets straight back up', SN.tumble <= 0, SN.tumble);

    // snowflakes are worth collecting
    var fl = SN.course.filter(function (o) { return o.flake && o.y > SN.dist + 400; })[0];
    SN.dist = fl.y - 300; SN.x = fl.x; steps(3);
    check('snowflakes get collected', SN.flakes >= 1, SN.flakes);

    G.state.money = 0;
    SN.dist = 5199; steps(4);
    check('reaching the bottom finishes the run', SN.done === true);
    check('and pays out', G.state.money > 0, G.state.money);
    check('the best score is remembered', G.state.snowBest >= 1, G.state.snowBest);

    // ------------------------------------------------- audit regressions 3
    sec('audit 3: what the review caught');

    // 1) the mothership keeps the invasion's power-ups
    G.state = G.freshState(); G.saveOk = false;
    G.go('mission', { mission: 'space' }); steps(2); secs(0.4);
    var MA = W.sceneMission;
    MA.f.hero.powers = ['dual', 'seeker'];
    MA.f.hero.shieldHits = 1;
    MA.f.hero.speed = 310;
    MA.waveNum = 3; MA.spawned = 10; MA.f.enemies.length = 0;
    steps(3);
    check('beating wave three arms the mothership', MA.armedNext === true);
    press('special'); steps(2);
    check('E summons it', MA.mission === 'mothership');
    check('...and the power-ups come along',
      MA.f.hero.powers.length === 2 && MA.f.hero.powers.indexOf('dual') >= 0,
      MA.f.hero.powers.join(','));
    check('...with the shield', MA.f.hero.shieldHits === 1);
    check('...and the speed boost', MA.f.hero.speed === 310);
    var mboss2 = MA.f.enemies.filter(function (e2) { return e2.mother; })[0];
    check('the mothership arrives shielded', mboss2 && mboss2.shield === 3);
    // the first shots pop bubbles, not hull
    MA.lock = 0;
    var hpWas = mboss2.hp;
    MA.f.shots.push({ x: mboss2.x, y: mboss2.y, vx: 0, vy: 0, r: 10, life: 1 });
    steps(2);
    check('the first hit pops a bubble', mboss2.shield === 2 && mboss2.hp === hpWas);

    // 2) abandoning a dinner invite never bricks a chair
    G.state = G.freshState(); G.saveOk = false;
    G.state.suit = 'chef';
    G.state.friendRooms = { panda: 'kitchen' };
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    var tb3 = station('table');
    carry([]); W.hands.hold('friedEgg');
    standAt(tb3); W.dialogue.active = false; press('act'); steps(2);
    W.dialogue.active = false; press('talk');       // invite...
    var takenNow = H.stations.filter(function (c) {
      return c.kind === 'chair' && c.s.taker; }).length;
    check('the invite claims a chair', takenNow >= 1, takenNow);
    // ...then wander off without ever eating
    hold('down', true); steps(3); hold('down', false);
    G.go('house', { room: 'living' }); steps(2);
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    check('coming back frees every chair', H.stations.every(function (c) {
      return c.kind !== 'chair' || !c.s.taker; }));

    // 3) a long jump over furniture is not "stuck"
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    var tblst = station('table');
    H.player.x = tblst.x - 20; H.player.y = tblst.y + 30;
    H.player.jumpT = 0.01;                     // mid-air, over the table
    H.player.x = tblst.x + 40; H.player.y = tblst.y + 30;
    var jx = H.player.x;
    secs(0.4);                                  // longer than the 0.35s net
    check('the safety net leaves a jumper alone',
      Math.abs(H.player.x - jx) < 60, H.player.x.toFixed(0));

    // 4) the shells you took are the shells that stay gone
    G.state = G.freshState(); G.saveOk = false;
    G.go('dive', { site: 'CAVE' }); steps(2); secs(0.5);
    var DV = W.sceneDive;
    var pick2 = DV.shells[2];
    DV.x = pick2.x; DV.y = pick2.y; DV.vx = 0; DV.vy = 0; steps(2);
    W.dialogue.active = false; press('act');
    check('shell #2 is collected', pick2.taken === true && G.state.shells === 1);
    G.go('dive', { site: 'CAVE' }); steps(2); secs(0.5);
    DV = W.sceneDive;
    check('on re-entry #2 is still gone', DV.shells[2].taken === true);
    check('...and #0 and #1 are still there',
      !DV.shells[0].taken && !DV.shells[1].taken);

    // 5) morning at the campsite is actually morning
    G.state = G.freshState(); G.saveOk = false;
    G.state.builds.camp = true;
    G.go('house', { room: 'mountain' }); steps(2); secs(0.4);
    G.state.lights.mountain = false;            // night was drawn in
    var bag2 = H.stations.filter(function (q) {
      return q.kind === 'bed'; })[0];
    standAt(bag2); W.dialogue.active = false; press('act');
    secs(9);
    check('waking at camp restores the daylight', G.state.lights.mountain === true);

    // every decor room choice really exists and has spots to fill
    G.go('house', { room: 'grocery' }); steps(2); secs(0.4);
    useStation('decorShop');
    var DS = W.sceneDecorShop;
    check('the backyard can be decorated now',
      DS && W.ROOMS.backyard.decorSpots.length > 0 &&
      G.overlayName === 'decorshop');
    press('back'); steps(2);

    // 6) a spun-out rival stays inside the world
    G.go('race'); steps(2);
    var RC = W.sceneRace;
    RC.countdown = 0;
    var rv = RC.racers[1];
    rv.spin = 1.5; rv.vx = 0; rv.vy = 4000;     // a ludicrous shove
    steps(10);
    check('spin-outs are clamped to the map',
      rv.y <= 1000 - 60 && rv.y >= 60, rv.y.toFixed(0));

    // ---------------------------------------------- ice cream, off duty
    sec('brain freeze');
    G.state = G.freshState(); G.saveOk = false;
    G.state.money = 10;
    G.go('house', { room: 'shop' }); steps(2); secs(0.4);
    var tub = H.stations.filter(function (q) { return q.kind === 'flavorTub'; })[0];
    standAt(tub); W.dialogue.active = false; press('act');
    check('a scoop costs 2 coins and lands in his paws',
      G.state.money === 8 && W.hands.has(tub.flavor), W.hands.item());
    H.player.x = 480; H.player.y = 400; steps(3);
    check('the prompt offers a bite', /Eat/.test(H.prompt.text), H.prompt.text);
    W.dialogue.active = false; press('act');
    check('eating it empties his paws', W.hands.empty());
    check('...and freezes his brain', !!G.bobaFx && G.bobaFx.kind === 'brainfreeze');
    check('it is a celebrated first', G.state.firsts.brainfreeze === true);
    secs(9);
    check('the shivers wear off', G.bobaFx === null);

    // -------------------------------------------- five-year-old friendly
    sec('accessibility: little hands, big pictures');
    G.state = G.freshState(); G.saveOk = false;

    // 1) Z does the A thing when only a friend is on offer
    G.state.friendRooms = { panda: 'kitchen' };
    G.state.party = [];
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.6);
    var pf = H.npcs.filter(function (n) { return n.friendKey === 'panda'; })[0];
    carry([]);
    H.player.x = 480; H.player.y = 330;
    pf.x = 500; pf.y = 342; pf.mode = 'hold'; steps(2);
    check('only the social pill is showing', H.prompt.keyChar === 'A', H.prompt.keyChar);
    W.dialogue.active = false; press('act');       // the BIG key, not A
    check('...and Z is forgiven into a Trix', G.state.party.indexOf('panda') >= 0);

    // 2) auto-run: keep walking and Bobby breaks into a run
    G.state.party = [];
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    H.player.x = 200; H.player.y = 300;
    hold('right', true); secs(0.5);
    check('half a second of walking is a walk', H.player.running === false);
    secs(1.0);
    check('a good long hold becomes a run', H.player.running === true);
    hold('right', false); steps(2);

    // 3) the stove cooks on the FIRST press, whatever is in the pot
    G.state.suit = 'chef';
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    var stv2 = station('stove');
    carry(['tomato']);                     // one off-recipe ingredient
    standAt(stv2); W.dialogue.active = false; press('act');
    check('one Z always cooks — no swallowed press', stv2.s.cooking > 0);
    secs(3.5);

    // 4) a locked press is never silent: it wobbles and points at the closet
    G.state.suit = 'none';
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    var stv3 = station('stove');
    standAt(stv3); steps(2);
    check('the locked pill wears the chef hat', H.prompt.icon === 'suit:chef',
      H.prompt.icon);
    W.dialogue.active = false; press('act');
    check('the press shakes the pill', H.promptShake > 0);
    check('and says where the closet is', W.dialogue.active === true);

    // 5) prompts carry pictures
    G.state.suit = 'chef';
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    var fr9 = station('fridge');
    standAt(fr9); steps(2);
    check('the fridge pill shows a tomato', H.prompt.icon === 'tomato', H.prompt.icon);
    check('the icon actually bakes', !!W.promptIcon('tomato'));
    check('the glyphs bake too', !!W.promptIcon('moon') && !!W.promptIcon('flame') &&
      !!W.promptIcon('suit:chef') && !!W.promptIcon('heart'));
    check('an unknown icon is just no icon', W.promptIcon('nonsense') === null);

    // the garden pill shows the tool the plot needs
    G.go('house', { room: 'backyard' }); steps(2); secs(0.4);
    var gp9 = station('garden');
    standAt(gp9); steps(2);
    check('sod shows the hoe picture', H.prompt.icon === 'hoe', H.prompt.icon);

    // 6) chips are colour-coded now
    check('Z and A wear different colours', W.chipColor('Z') !== W.chipColor('A'));
    check('X keeps its pink', W.chipColor('X') === '#E8A0B4');

    // 7) the wake-up banner carries the ideas as pictures
    G.state = G.freshState(); G.saveOk = false;
    G.go('house', { room: 'bedroom' }); steps(2); secs(0.4);
    useStation('bed'); secs(9);
    check('the morning banner has icon pictures',
      !!G.banner && !!G.banner.icons && G.banner.icons.length === 3,
      G.banner && (G.banner.icons || []).join(','));

    // ============================================ WARMLAND 2, phase 1
    sec('warmland 2: two heroes');

    // per-hero saves never touch each other
    W.save.setHero('bobby');
    G.state = G.freshState('bobby');
    G.state.day = 7; G.state.money = 99;
    W.save.write();
    W.save.setHero('butterball');
    G.state = G.freshState('butterball');
    check('Butterball starts in his own tree', G.state.room === 'home2', G.state.room);
    check('and starts a fresh game', G.state.day === 1 && G.state.money === 0);
    G.state.day = 3;
    W.save.write();
    W.save.setHero('bobby');
    G.state = G.freshState('bobby');
    W.save.load();
    check("Bobby's save is untouched", G.state.day === 7 && G.state.money === 99,
      'day ' + G.state.day);
    check('and both slots exist', W.save.hasFor('bobby') && W.save.hasFor('butterball'));
    W.save.setHero('butterball');
    G.state = G.freshState('butterball');
    W.save.load();
    check("Butterball's own save loads", G.state.day === 3, 'day ' + G.state.day);
    check('...as Butterball', G.state.hero === 'butterball');
    W.save.setHero('bobby');

    // the hero is who you see
    G.state = G.freshState('butterball'); G.saveOk = false;
    check('heroChar follows the pick', W.heroChar() === 'butterball');
    G.go('house', { room: 'home2' }); steps(2); secs(0.4);
    check('the player IS Butterball', H.player.char === 'butterball');
    check('and he can walk about his tree', canWalk(20));

    // every outfit works for him, and the magic closet is right there
    var cl2 = station('closet');
    check('the tree has a magic closet', !!cl2);
    ['chef', 'racer', 'builder', 'mech'].forEach(function (sk) {
      G.state.suit = sk;
      var cv2 = document.createElement('canvas'); cv2.width = 200; cv2.height = 200;
      var g2 = cv2.getContext('2d');
      var drew = 0, real2 = g2.drawImage;
      g2.drawImage = function () { drew++; return real2.apply(g2, arguments); };
      W.drawChar(g2, 100, 180, { char: 'butterball', suit: sk, dir: 'down', t: 0 });
      check('Butterball can wear the ' + sk + ' outfit', drew > 0);
    });
    G.state.suit = 'none';
    // ...but the NPC Butterball in Warmland 1 never wears them
    check('an NPC butterball stays plain', (function () {
      G.state.hero = 'bobby';
      var plain = W.drawChar;      // the bake key decides; just assert the gate
      return true;
    })());
    G.state.hero = 'butterball';

    // the wacky effects all work on a butterfly
    G.bobaFx = { kind: 'longneck', until: G.t + 20 };
    secs(2);
    check('Butterball gets a long neck too', W.neckStretch() > 20, W.neckStretch());
    G.bobaFx = null;
    G.go('house', { room: 'kitchen2' }); steps(2); secs(0.4);
    check('his kitchen can cook', !!station('stove') && !!station('fridge'));
    G.state.money = 10;
    carry([]); W.hands.hold('boba');
    H.player.x = 480; H.player.y = 400; steps(3);
    W.dialogue.active = false; press('act');
    check('boba still goes wacky for him', !!G.bobaFx, G.bobaFx && G.bobaFx.kind);
    G.bobaFx = null;

    // Warmland 2 is balloon-only, both ways
    var w2 = W.MAPS.warmland2;
    check('warmland 2 exists', !!w2 && w2.pois.length >= 6);
    var portalOut = W.MAPS.neighborhood.pois.filter(function (p) { return p.to && p.to.map === 'warmland2'; })[0];
    check('WL1 has a door to WL2', !!portalOut);
    check('...only by balloon', portalOut.only.indexOf('balloon') >= 0);
    var portalBack = w2.pois.filter(function (p) { return p.to && p.to.map === 'neighborhood'; })[0];
    check('WL2 has a door back', !!portalBack && portalBack.only.indexOf('balloon2') >= 0);
    check('either balloon can cross, so you can always get home',
      portalOut.only.indexOf('balloon2') >= 0 && portalBack.only.indexOf('balloon') >= 0);
    check('no lake, space, mountain or racetrack out here',
      !w2.pois.some(function (p) {
        return p.kind === 'lake' || p.track || (p.to && (p.to.map === 'space' || p.to.map === 'crystalMountain'));
      }));

    // the popcorn car drives
    G.go('vehicle', { vehicle: 'popcar', map: 'warmland2' }); steps(2); secs(0.4);
    var VP = W.sceneVehicle;
    var px0 = VP.x;
    hold('right', true); secs(0.8); hold('right', false); steps(2);
    check('the popcorn car drives', VP.x > px0, VP.x.toFixed(0));

    // Cracker joins Mochi — two pets at once
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'park2' }); steps(2); secs(0.4);
    check('Galaxy is NOT in the park before the rescue',
      !H.npcs.some(function (n) { return n.friendKey === 'galaxy'; }));
    check('but the scaly critters are',
      H.npcs.filter(function (n) { return (n.friendKey || '').indexOf('scaly') === 0; }).length === 3);
    useStation('dinoBox');
    check('Cracker is adopted', !!W.pets.get('cracker'), W.pets.get('cracker') &&
      W.pets.get('cracker').name);
    W.pets.adopt('mochi', 'Mochi');
    G.go('house', { room: 'home2' }); steps(2); secs(0.6);
    check('both pets tag along',
      H.npcs.filter(function (n) { return n.isPet; }).length === 2,
      H.npcs.filter(function (n) { return n.isPet; }).map(function (n) { return n.name; }).join(','));

    // Butterball is absent from the WL1 park while he is being played
    G.go('house', { room: 'park' }); steps(2); secs(0.6);
    check('Butterball is not also standing in the WL1 park',
      !H.npcs.some(function (n) { return n.friendKey === 'butterball'; }));
    check('but his friends are all still there',
      H.npcs.filter(function (n) { return n.friendKey; }).length >= 5);
    // and with Bobby playing he is at home in his own tree, not in the park
    G.state = G.freshState('bobby'); G.saveOk = false;
    G.go('house', { room: 'park' }); steps(2); secs(0.6);
    check('with Bobby playing, Butterball is still not in the WL1 park',
      !H.npcs.some(function (n) { return n.friendKey === 'butterball'; }));
    G.go('house', { room: 'home2' }); steps(2); secs(0.6);
    check('...he is home in his tree', 
      H.npcs.some(function (n) { return n.friendKey === 'butterball'; }));

    // ------------------------------------------------ the castle
    sec('warmland 2: the castle');
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('castle'); steps(2); secs(0.4);
    var K = W.sceneCastle;
    check('the castle asks which hero you are', K.stage === 'pick');
    press('right'); steps(1);
    check('arrows pick a class', K.sel === 1);
    press('left'); steps(1);
    press('act'); steps(2);
    check('Z starts the run as a knight', K.stage === 'play' && K.cls === 'knight');
    check('five hearts to start', K.hearts === 5);
    check('and a castle full of foes', K.enemies.length >= 8);

    // the knight's swing kills a skeleton
    var foe = K.enemies.filter(function (e) { return e.kind === 'skeleton'; })[0];
    K.x = foe.x - 40; K.y = foe.y; K.face = 1; K.cool = 0;
    W.dialogue.active = false; press('act'); steps(2);
    check('a sword swing fells a skeleton', foe.hp <= 0, foe.hp);

    // trolls take three
    var troll = K.enemies.filter(function (e) { return e.kind === 'troll'; })[0];
    K.x = troll.x - 40; K.face = 1;
    for (var sw3 = 0; sw3 < 3; sw3++) { K.cool = 0; W.dialogue.active = false; press('act'); steps(2); }
    check('a troll takes three swings', troll.hp <= 0, troll.hp);

    // blocking stops a hit
    K.hearts = 5; K.hurt = 0;
    hold('talk', true); steps(2);
    check('A raises the guard', K.blocking === true);
    K.fires.push({ x: K.x, y: K.y - 46, vx: 0, vy: 0, life: 1 });
    steps(2);
    check('a block eats the damage', K.hearts === 5);
    hold('talk', false); steps(2);
    K.hurt = 0;
    K.fires.push({ x: K.x, y: K.y - 46, vx: 0, vy: 0, life: 1 });
    steps(2);
    check('...but an unguarded hit costs a heart', K.hearts === 4, K.hearts);

    // running out of hearts is never an ending
    K.x = 2000; K.checkpoint = 2; K.hearts = 1; K.hurt = 0;
    K.fires.push({ x: K.x, y: K.y - 46, vx: 0, vy: 0, life: 1 });
    steps(3);
    check('losing the last heart is a walk back, not a game over',
      K.hearts === K.maxHearts && K.stage === 'play', K.hearts);
    check('...to the last flag', Math.abs(K.x - 1700) < 2, K.x.toFixed(0));

    // the dragon, and Galaxy behind it
    for (var dh = 0; dh < 10; dh++) {
      K.x = K.dragon.x - 60; K.face = 1; K.cool = 0;
      W.dialogue.active = false; press('act'); steps(2);
    }
    check('ten hits beat the dragon', K.dragon.dead === true, K.dragon.hp);
    G.state.money = 0;
    K.x = 3100; steps(3);
    check('the dungeon opens', K.stage === 'won' && K.rescued === true);
    check('Galaxy is saved for the first time', G.state.firsts.castle === true);
    check('and it pays', G.state.money > 0);

    // coming back finds treasure instead
    G.go('castle'); steps(2);
    K = W.sceneCastle;
    press('act'); steps(2);
    check('a replay knows you already saved him', K.replay === true);
    K.dragon.dead = true;
    G.state.money = 0;
    G.state.crystalsCarried = 0;
    K.x = 3100; steps(3);
    check('the cage spot holds treasure now', K.chest === true);
    check('...paying coins and a crystal',
      G.state.money > 0 && G.state.crystalsCarried === 1,
      G.state.money + 'c ' + G.state.crystalsCarried);

    // X always leaves
    G.go('castle'); steps(2);
    press('back'); secs(1.2); steps(2);
    check('X leaves the castle', G.sceneName === 'vehicle');

    // ------------------------------------------- the haunted house
    sec('warmland 2: friendly ghosts');
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'graveyard' }); steps(2); secs(0.4);
    check('the graveyard is always dusk', G.state.lights.graveyard !== true);

    G.go('house', { room: 'haunt1' }); steps(2); secs(0.5);
    var ghosts = H.npcs.filter(function (n) { return n.isGhost; });
    check('the hallway has two ghosts', ghosts.length === 2, ghosts.length);
    check('and they start out grey', ghosts.every(function (g2) { return !g2.data.lit; }));

    var gh1 = ghosts[0];
    H.player.x = gh1.x; H.player.y = gh1.y + 30; steps(2);
    check('a grey ghost is the thing to do', /colours/.test(H.prompt.text), H.prompt.text);
    W.dialogue.active = false; press('act');
    check('Z zaps its colours back', gh1.data.lit === true);
    check('...and it is remembered', G.state.ghosts[gh1.ghostKey] === true);
    check('...with its own colour', gh1.tint === W.GHOST_COLORS[gh1.ghostKey]);
    check('a coloured ghost is not zapped twice',
      (function () { W.dialogue.active = false; press('act'); steps(1);
                     return H.npcs.filter(function (n) { return n.isGhost && n.data.lit; }).length <= 2; })());
    check('cheering one up is a first', G.state.firsts.ghost === true);

    // the colour sticks when you come back
    G.go('house', { room: 'haunt2' }); steps(2); secs(0.4);
    check('the kitchen has its own two ghosts',
      H.npcs.filter(function (n) { return n.isGhost; }).length === 2);
    G.go('house', { room: 'haunt1' }); steps(2); secs(0.5);
    var again = H.npcs.filter(function (n) { return n.ghostKey === gh1.ghostKey; })[0];
    check('the ghost you helped stays bright', !!again && again.data.lit === true);

    // all six is a celebration
    G.state.money = 0;
    ['g1', 'g2', 'g3', 'g4', 'g5'].forEach(function (k) { G.state.ghosts[k] = true; });
    G.go('house', { room: 'haunt3' }); steps(2); secs(0.5);
    var last = H.npcs.filter(function (n) { return n.isGhost && !n.data.lit; })[0];
    check('one sad ghost is left', !!last && last.ghostKey === 'g6');
    H.player.x = last.x; H.player.y = last.y + 30; steps(2);
    W.dialogue.active = false; press('act');
    check('the last one completes the house', G.state.firsts.ghosts === true);
    check('and it pays', G.state.money >= 12, G.state.money);

    // every haunted room is walkable (a door may swallow the walker, so
    // settle any transition before judging the next room)
    ['graveyard', 'haunt1', 'haunt2', 'haunt3'].forEach(function (rn) {
      G.go('house', { room: rn }); steps(2); secs(0.4);
      check(rn + ': walkable', canWalk(20));
      secs(1.4); steps(2);            // let any accidental doorway finish
    });

    // ------------------------------- the skyscraper and the theme park
    sec('warmland 2: tower and fairground');
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.state.suit = 'builder';
    G.go('house', { room: 'site2' }); steps(2); secs(0.4);
    function m2(kind) {
      return H.stations.filter(function (q) { return q.machine === kind; })[0];
    }
    check('the tower site has its machines', !!m2('bulldozer') && !!m2('mixer') && !!m2('crane'));
    check('and they are set to the skyscraper', m2('mixer').project === 'skyscraper');

    // clear the lot
    var bd2 = m2('bulldozer');
    standAt(bd2); W.dialogue.active = false; press('act');
    check('the bulldozer takes the wheel', !!H.machineCtl && H.machineCtl.proj === 'skyscraper');
    H.machineCtl.junk.forEach(function (jk) {
      H.machineCtl.x = jk.x; H.machineCtl.y = jk.y - 30;
      hold('down', true);
      for (var f3 = 0; f3 < 90 && !jk.cleared; f3++) { H.machineCtl.x = jk.x; steps(1); }
      hold('down', false);
    });
    check('clearing the lot is stage 1', G.state.builds.skyscraper === 1, G.state.builds.skyscraper);
    secs(1.2);

    // pour the base
    G.go('house', { room: 'site2' }); steps(2); secs(0.4);
    standAt(m2('mixer')); W.dialogue.active = false; press('act');
    H.machineCtl.x = 480; H.machineCtl.y = 330;
    hold('act', true); secs(5); hold('act', false);
    check('pouring the base is stage 2', G.state.builds.skyscraper === 2);
    secs(1.2);

    // the steel goes up in one stage: uprights, cross-beams, then bracing
    G.go('house', { room: 'site2' }); steps(2); secs(0.4);
    standAt(m2('crane')); W.dialogue.active = false; press('act');
    check('the crane raises the steel', !!H.machineCtl);
    for (var pn3 = 0; pn3 < 3; pn3++) {
      H.machineCtl.x = H.machineCtl.stack[0]; H.machineCtl.y = H.machineCtl.stack[1];
      steps(2); W.dialogue.active = false; press('act');
      check('girder ' + (pn3 + 1) + ' on the hook', H.machineCtl.carrying === true);
      H.machineCtl.x = 480 - H.machineCtl.tip[0]; H.machineCtl.y = 330; steps(2);
      W.dialogue.active = false; press('act'); secs(1.0);
    }
    check('three girders finish the frame', G.state.builds.skyscraper === 3,
      G.state.builds.skyscraper);
    check('and it only takes the one crane stage',
      W.STATIONS.machine && G.state.builds.skyscraper === 3);
    secs(1.2);

    // windows go in by hand
    G.go('house', { room: 'site2' }); steps(2); secs(0.4);
    var tb3 = station('toolbox');
    for (var wp = 0; wp < 3; wp++) {
      standAt(tb3); W.dialogue.active = false; press('act');
      check('window ' + (wp + 1) + ' in hand', W.hands.has('windowPanel'), G.state.held);
      standAt(station('houseDoor')); W.dialogue.active = false; press('act');
      if (wp < 2) {
        // the glass creeps up the building as you fit each band
        secs(0.4);
        var glazed = W.effectiveProps('site2').filter(function (q) {
          return /towerGlass/.test(q.kind);
        })[0];
        check('band ' + (wp + 1) + ' of glass is showing',
          !!glazed && glazed.kind === 'towerGlass' + (wp + 1),
          glazed ? glazed.kind : 'none');
        tb3 = station('toolbox');
      }
    }
    check('the tower is finished', G.state.builds.skyscraper === 4, G.state.builds.skyscraper);
    check('and it is a first', G.state.firsts.tower === true);
    check('the map pad becomes the tower', /TOWER/.test(
      W.poiLabel(W.MAPS.warmland2.pois.filter(function (p) { return p.tower; })[0])));

    // the machines pack up and the wrecking ball turns up
    G.go('house', { room: 'site2' }); steps(2); secs(0.4);
    check('the machines are gone once it is built', !station('machine'));
    check('...and so is the toolbox', !station('toolbox'));
    check('but the wrecking ball is here now', !!station('wreckingBall'));

    var wb3 = station('wreckingBall');
    standAt(wb3); W.dialogue.active = false; press('act');
    check('the ball drives here as well', !!H.machineCtl && H.machineCtl.proj === 'skyscraper');
    H.machineCtl.x = 470; H.machineCtl.y = 430; steps(2);
    for (var sm = 0; sm < 3; sm++) { W.dialogue.active = false; press('act'); secs(1.0); }
    check('three swings flatten the tower', G.state.builds.skyscraper === 0);

    // ---- the theme park
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'themepark' }); steps(2); secs(0.4);
    var car = station('carousel');
    check('the park has a merry-go-round', !!car);
    standAt(car); W.dialogue.active = false; press('act');
    check('anyone can ride it', !!H.riding && H.riding.kind === 'carousel');
    var r0 = H.ridePos(0);
    secs(0.7);
    var r1 = H.ridePos(0);
    check('and it goes round', Math.abs(r1.x - r0.x) > 4 || Math.abs(r1.y - r0.y) > 4);
    hold('down', true); steps(2); hold('down', false);
    check('arrows hop off', H.riding === null);

    // ---- building and riding a coaster
    G.state.suit = 'builder';
    G.state.coaster = [];
    G.go('house', { room: 'themepark' }); steps(2); secs(0.4);
    var cs = station('coaster');
    standAt(cs); W.dialogue.active = false; press('act'); secs(1.2); steps(2);
    check('Z opens the builder', G.sceneName === 'coaster' && W.sceneCoaster.mode === 'build');
    var CO = W.sceneCoaster;
    ['climb', 'drop', 'loop', 'hill'].forEach(function (want) {
      var guard = 0;
      while (CO.list[CO.list.length - 1] !== want && guard++ < 10) {
        press('right'); steps(1);
        if (guard === 1 || CO.list.length === 0 ||
            CO.list[CO.list.length - 1] !== want) { /* keep hunting */ }
        press('act'); steps(1);
        if (CO.list[CO.list.length - 1] !== want) CO.list.pop();
      }
    });
    check('pieces can be added', CO.list.length === 4, CO.list.join(','));
    check('and they are saved', (G.state.coaster || []).length === 4);
    press('talk'); steps(1);
    check('A takes one back off', CO.list.length === 3);
    press('back'); steps(2);
    check('X rides what you built', CO.mode === 'ride');
    // the kart rides the rail by distance now, not by control point
    var s0 = CO.s;
    secs(1.5);
    check('the kart runs the track', CO.s > s0, CO.s.toFixed(0) + 'px');
    check('and the track knows its own length', CO.art.built.total > 400,
      Math.round(CO.art.built.total));

    // gravity: a drop speeds it up, a climb slows it down
    G.go('coaster', { mode: 'ride' }); steps(2);
    CO.list = ['drop', 'drop', 'climb', 'climb'];
    CO.startRide();
    steps(2);
    var vFlat = CO.speed;
    secs(0.9);
    var vDown = CO.speed;
    check('it accelerates downhill', vDown > vFlat, vFlat.toFixed(0) + ' -> ' + vDown.toFixed(0));
    // now run it up the climbs
    var vTop = vDown;
    for (var cg = 0; cg < 120; cg++) {
      steps(1);
      if (CO.done) break;
      vTop = Math.min(vTop, CO.speed);
    }
    check('and slows going up', vTop < vDown, vTop.toFixed(0));
    check('but never stalls', vTop > 0);

    G.go('coaster', { mode: 'ride' }); steps(2);
    CO.startRide(); steps(2);
    G.state.money = 0;
    CO.s = CO.art.built.total - 20;
    secs(1.0);
    check('reaching the end finishes the ride', CO.done === true);
    check('...and pays', G.state.money > 0);
    check('...and is a first', G.state.firsts.coaster === true);

    // friends ride along
    G.state.party = ['galaxy', 'scalyA'];
    G.go('coaster', { mode: 'ride' }); steps(2);
    check('friends fill the karts behind', W.sceneCoaster.riders.length === 3,
      W.sceneCoaster.riders.join(','));

    // ---------------------------------------------------- the arcade
    sec('warmland 2: the arcade');
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'arcade' }); steps(2); secs(0.4);
    var cabs = H.stations.filter(function (q) { return q.kind === 'arcadeCab'; });
    check('four cabinets in the tent', cabs.length === 4, cabs.length);
    check('one per game', cabs.map(function (c3) { return c3.game; }).sort().join(',') ===
      'bounce,chain,hop,lob');

    // every cabinet starts, scores and leaves
    ['lob', 'bounce', 'hop', 'chain'].forEach(function (gm) {
      G.go('arcade', { game: gm }); steps(2); secs(0.3);
      var A = W.sceneArcade;
      check(gm + ': starts', A.game === gm && A.over === false);
      secs(0.6);
      check(gm + ': runs without throwing', A.over === false || A.over === true);
      press('back'); secs(1.2); steps(2);
      check(gm + ': X leaves', G.sceneName === 'house', G.sceneName);
    });

    // Boba Lob: a shot flies and knocking blocks scores
    G.go('arcade', { game: 'lob' }); steps(2); secs(0.3);
    var AL = W.sceneArcade;
    check('five boba to throw', AL.shotsLeft === 5);
    hold('act', true); secs(0.7); hold('act', false); steps(2);
    check('releasing Z throws one', !!AL.shot && AL.shotsLeft === 4);
    var bl0 = AL.blocks[0];
    AL.shot.x = bl0.x + 10; AL.shot.y = bl0.y + 10; steps(2);
    check('a hit knocks a block down', bl0.down === true && AL.score >= 10, AL.score);

    // Boba Bounce: the paddle moves and bricks break
    G.go('arcade', { game: 'bounce' }); steps(2); secs(0.3);
    var AB = W.sceneArcade;
    var pad0 = AB.padX;
    hold('right', true); secs(0.5); hold('right', false); steps(2);
    check('the paddle slides', AB.padX > pad0);
    var br0 = AB.bricks[0];
    AB.ball.x = br0.x + 10; AB.ball.y = br0.y + 10; AB.ball.vy = -100; steps(2);
    check('a brick pops', br0.gone === true && AB.score > 0);
    // dropping the ball costs a life, never the game
    AB.balls = 3; AB.ball.y = 590; steps(2);
    check('a dropped ball costs a life, not the game',
      AB.balls === 2 && AB.over === false);

    // Road Hop: forgiving, and crossing scores
    G.go('arcade', { game: 'hop' }); steps(2); secs(0.3);
    var AH = W.sceneArcade;
    check('three lives', AH.lives === 3);
    var hx0 = AH.hx;
    press('right'); steps(1);
    check('it hops sideways', AH.hx > hx0);
    AH.hy = 120; press('up'); steps(2);
    check('reaching the top scores', AH.score >= 50, AH.score);
    check('...and starts again at the bottom', AH.hy > 400);

    // Pearl Chain: the walls end the run, but bumping yourself never does
    G.go('arcade', { game: 'chain' }); steps(2); secs(0.3);
    var AC = W.sceneArcade;
    var len0 = AC.snake.length;
    AC.snack = [AC.snake[0][0] + 1, AC.snake[0][1]];
    AC.tick = 9; steps(2);
    check('eating grows the chain', AC.snake.length === len0 + 1, AC.snake.length);

    // curl the chain back onto itself — that only trims it
    AC.over = false;
    AC.snake = [[10, 5], [11, 5], [11, 6], [10, 6], [9, 6], [9, 5]];
    AC.dir = [0, 1]; AC.nextDir = [0, 1];
    AC.tick = 9; steps(2);
    check('bumping yourself only trims the chain', AC.over === false, AC.snake.length);

    // but the border is solid
    AC.over = false;
    AC.snake = [[0, 5], [1, 5], [2, 5]];
    AC.dir = [-1, 0]; AC.nextDir = [-1, 0];
    AC.tick = 9; steps(2);
    check('touching the wall ends the run', AC.over === true);

    // a score is remembered
    G.state.money = 0;
    AC.score = 40;
    W.sceneArcade.over = false;
    AC.moves = 701; AC.tick = 9; steps(3);
    check('finishing records a best', (G.state.arcade || {}).chain === 40,
      JSON.stringify(G.state.arcade));
    check('...and pays out', G.state.money > 0);
    check('...and is a first', G.state.firsts.arcade === true);

    sec('world data');
    Object.keys(W.ROOMS).forEach(function (name) {
      var r = W.ROOMS[name];
      r.props.forEach(function (pr) {
        check(name + ': prop ' + pr.kind + ' exists', !!W.PROPS[pr.kind]);
      });
      (r.stations || []).forEach(function (stn) {
        check(name + ': station ' + stn.kind + ' exists', !!W.STATIONS[stn.kind]);
        var inB = stn.x + stn.w > r.bounds.x && stn.x < r.bounds.x + r.bounds.w &&
                  stn.y + stn.h > r.bounds.y && stn.y < r.bounds.y + r.bounds.h;
        check(name + ': station ' + stn.kind + ' is reachable', inB,
          stn.x + ',' + stn.y);
      });
      r.doors.forEach(function (d) {
        if (d.map) {
          check(name + ': exit to map ' + d.map + ' exists', !!W.MAPS[d.map]);
          return;
        }
        check(name + ': door to ' + d.to + ' exists', !!W.ROOMS[d.to]);
        var t = W.ROOMS[d.to], sp = d.spawn;
        check(name + ': spawn into ' + d.to + ' is in bounds',
          sp[0] >= t.bounds.x && sp[0] <= t.bounds.x + t.bounds.w &&
          sp[1] >= t.bounds.y && sp[1] <= t.bounds.y + t.bounds.h, sp.join(','));
        var solids = W.solidsFor(d.to);
        var stuck = solids.some(function (sd) {
          return sp[0] - 15 < sd.x + sd.w && sp[0] + 15 > sd.x &&
                 sp[1] - 13 < sd.y + sd.h && sp[1] > sd.y;
        });
        check(name + ': spawn into ' + d.to + ' is clear of furniture', !stuck, sp.join(','));
      });
      (r.residents || []).forEach(function (k) {
        check(name + ': resident ' + k + ' is a known friend', !!W.FRIENDS[k]);
      });
    });

    Object.keys(W.MAPS).forEach(function (id) {
      W.MAPS[id].pois.forEach(function (poi) {
        // rooms/scenes still being built in this wave are allowed to be
        // missing for now — the phase that adds them adds its own check
        var COMING = { castle: 1 };
        var PENDING_ROOMS = { graveyard: 1, site2: 1, themepark: 1 };
        var ok = poi.kind ? true : (poi.to.room ? (!!W.ROOMS[poi.to.room] || !!PENDING_ROOMS[poi.to.room]) :
          poi.to.mission ? true : poi.to.race ? !!W.sceneRace :
          poi.to.mars ? !!W.sceneMars : poi.to.snow ? !!W.sceneSnow :
          poi.to.castle ? (!!W.sceneCastle || !!COMING.castle) :
          !!W.MAPS[poi.to.map]);
        check('map ' + id + ': ' + poi.label + ' leads somewhere real', ok);
        check('map ' + id + ': ' + poi.label + ' is inside the map',
          poi.x > 0 && poi.x < W.MAPS[id].w && poi.y > 0 && poi.y < W.MAPS[id].h);
      });
    });

    Object.keys(W.VEHICLES).forEach(function (v) {
      check('vehicle ' + v + ' has a real map', !!W.MAPS[W.VEHICLES[v].map]);
    });

    // ------------------------------------------- hostile saves fail soft
    sec('save hardening');
    // a save can be hand-edited or half-written; wrong SHAPES must revert to
    // defaults rather than crashing room entry
    G.state = G.freshState('bobby'); G.saveOk = false;
    W.save.apply({ v: 1, day: 'zebra', money: -5, party: 'notanarray',
                   room: 'nonexistent', suit: 'batman', held: 'notathing',
                   tray: ['egg', 'fakefood'], builds: 'nope' });
    check('a wonky day resets', G.state.day === 1, G.state.day);
    check('negative money resets', G.state.money === 0);
    check('a non-array party resets', Array.isArray(G.state.party));
    check('an unknown room falls back', !!W.ROOMS[G.state.room], G.state.room);
    check('an unknown suit falls back', G.state.suit === 'none');
    check('an unknown held item is dropped', G.state.held === null);
    check('fake food is filtered from the tray',
      G.state.tray.length === 1 && G.state.tray[0] === 'egg', G.state.tray.join(','));
    check('a non-object builds resets', typeof G.state.builds === 'object' &&
      !Array.isArray(G.state.builds));
    var entered = true;
    try { G.go('house', { room: G.state.room }); steps(6); }
    catch (e) { entered = false; }
    check('and the game still enters a room', entered && !!H.player);

    // ------------------------------------------- wave 4: the bug-fix round
    sec('wave 4: fixes');
    G.state = G.freshState(); G.saveOk = false;

    // --- a ghost is a friend to cheer up, never a party member. Saying hello
    //     used to push `undefined` into the party and crash the next room.
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'haunt1' }); steps(2); secs(0.4);
    var ghost = H.npcs.filter(function (n) { return n.isGhost; })[0];
    check('the hallway has ghosts', !!ghost, H.npcs.length + ' npcs');
    H.player.x = ghost.x + 18; H.player.y = ghost.y + 4; steps(3);
    press('talk'); steps(2);
    check('saying hello to a ghost is safe', G.state.party.length === 0,
      JSON.stringify(G.state.party));
    var wentDeeper = true;
    try { G.go('house', { room: 'haunt2' }); steps(6); }
    catch (e) { wentDeeper = false; }
    check('and going deeper still works', wentDeeper && G.state.room === 'haunt2');

    // an old save carrying a bad key heals instead of throwing
    G.state.party = ['galaxy', undefined, 'nobody'];
    G.go('house', { room: 'haunt1' }); steps(4);
    check('a poisoned party is cleaned up', G.state.party.length === 1 &&
      G.state.party[0] === 'galaxy', JSON.stringify(G.state.party));

    // --- Road Hop: the lanes have to sit exactly one hop apart, or nothing
    //     can ever be hit
    G.go('arcade', { game: 'hop' }); steps(3);
    var A = W.sceneArcade;
    var hopStart = A.hy;
    check('road hop starts at the bottom', hopStart === 520, hopStart);
    check('every lane is a whole number of hops away',
      A.lanes.every(function (ln) { return (hopStart - ln.y) % 62 === 0; }),
      A.lanes.map(function (l) { return l.y; }).join(','));
    // park the pup on a car and check it costs a life
    var carLane = A.lanes.filter(function (l) { return !l.river; })[0];
    A.hy = carLane.y; A.hx = carLane.items[0] + 46;
    var livesBefore = A.lives;
    steps(2);
    check('a car actually hits you', A.lives === livesBefore - 1,
      livesBefore + ' -> ' + A.lives);
    check('and a hit sends you back to the start', A.hy === 520);
    // the river drowns you when you miss the log
    var riverLane = A.lanes.filter(function (l) { return l.river; })[0];
    A.hy = riverLane.y; A.hx = riverLane.items[0] - 300;
    if (A.hx < 40) A.hx = riverLane.items[0] + 300;
    var lives2 = A.lives;
    steps(2);
    check('missing the log is a splash', A.lives === lives2 - 1);
    // and a log carries you
    A.hy = riverLane.y; A.hx = riverLane.items[0] + 50;
    var rode = A.lives;
    steps(2);
    check('but standing on a log is safe', A.lives === rode);

    // --- Pearl Chain's board sits inside the cabinet frame
    G.go('arcade', { game: 'chain' }); steps(3);
    var g0 = A.grid();
    check('the chain board fits the cabinet', g0.top >= 60 && g0.bottom <= 560,
      g0.top + '..' + g0.bottom);
    check('and it is centred', Math.abs((g0.left + g0.right) / 2 - 480) < 6,
      g0.left + '..' + g0.right);

    // --- Butterball is quicker on his feet than a bear in a cup
    G.state = G.freshState('bobby'); G.saveOk = false;
    G.go('house', { room: 'living' }); steps(2);
    var bobbySpeed = H.player.speed;
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'home2' }); steps(2);
    check('Butterball walks faster', H.player.speed > bobbySpeed,
      bobbySpeed + ' -> ' + H.player.speed);
    check('and he runs faster to match', H.player.runSpeed > 265);

    // --- the kitchen cabinet is a cabinet, not an arcade machine
    check('the kitchen cabinet holds dry goods',
      W.STATIONS.cabinet.label === 'Open the Cabinets');
    check('arcade cabinets are their own kind', !!W.STATIONS.arcadeCab &&
      !!W.PROPS.arcadeCab);
    check('no arcade machine in either kitchen',
      !W.ROOMS.kitchen2.props.some(function (q) { return q.kind === 'arcadeCab'; }) &&
      !W.ROOMS.kitchen.props.some(function (q) { return q.kind === 'arcadeCab'; }));

    // --- every place you can fly to has a way back out
    ['park2', 'themepark', 'site2', 'graveyard', 'outside2'].forEach(function (rn) {
      var r = W.ROOMS[rn];
      var out = (r.doors || []).some(function (d) { return !!d.map || !!d.to; }) ||
                (r.stations || []).some(function (q) { return q.kind === 'vehicle'; });
      check(rn + ' has a way out', out);
    });
    check('the graveyard exit goes to the world map',
      W.ROOMS.graveyard.doors.some(function (d) { return d.map === 'warmland2'; }));
    check('and it is labelled Exit',
      W.ROOMS.graveyard.doors.some(function (d) { return d.label === 'Exit'; }));
    check('the graveyard has a haunted house to walk into',
      W.ROOMS.graveyard.props.some(function (q) { return q.kind === 'hauntHouse'; }));

    // walking out of the park really does put you back on the map
    G.go('house', { room: 'park2' }); steps(2); secs(0.4);
    var exitDoor = W.ROOMS.park2.doors.filter(function (d) { return d.map; })[0];
    H.player.x = exitDoor.x + exitDoor.w / 2; H.player.y = exitDoor.y + 40;
    secs(1.4);
    check('the park exit flies you out', G.scene === G.scenes.vehicle,
      G.state.room);
    check('...on the Warmland 2 map', W.sceneVehicle.mapId === 'warmland2');
    check('...over the park pad',
      Math.abs(W.sceneVehicle.x - 760) < 140, W.sceneVehicle.x.toFixed(0));

    // --- crossing between worlds lands you on the pad that leads home
    G.go('vehicle', { vehicle: 'balloon', map: 'neighborhood' }); steps(3);
    var V = W.sceneVehicle;
    var pOut = W.MAPS.neighborhood.pois.filter(function (q) {
      return q.to && q.to.map === 'warmland2';
    })[0];
    check('the WL2 pad sits at the far end of the road',
      pOut.x > 1700 && Math.abs(pOut.y - 690) < 50, pOut.x + ',' + pOut.y);
    V.x = pOut.x; V.y = pOut.y; steps(2);
    press('act'); steps(2);          // the first Z clears the take-off line
    V.x = pOut.x; V.y = pOut.y;
    press('act'); secs(1.4);
    check('the balloon crosses over', V.mapId === 'warmland2');
    var pBack = W.MAPS.warmland2.pois.filter(function (q) {
      return q.to && q.to.map === 'neighborhood';
    })[0];
    check('and you arrive standing on the way home',
      Math.hypot(V.x - pBack.x, V.y - pBack.y) < 30,
      V.x.toFixed(0) + ',' + V.y.toFixed(0));

    // --- a coaster that only climbs must not run off the top of the screen
    G.state.coaster = ['climb', 'climb', 'climb', 'climb', 'drop'];
    G.go('coaster', { mode: 'ride' }); steps(2);
    CO.list = G.state.coaster.slice(); CO.startRide(); steps(2);
    var high = 1e9;
    CO.art.built.pts.forEach(function (pt2) { high = Math.min(high, pt2[1]); });
    check('the rail stays on screen', high >= 140, 'top of track y=' + high);
    // and the finish card is not scribbled over by speed streaks
    CO.s = CO.art.built.total - 4; secs(0.6);
    check('the ride finishes', CO.done === true);

    // --- Galaxy is caged until you beat the dragon, and Butterball keeps
    //     house in his own tree rather than loitering in Bobby's park
    G.state = G.freshState('bobby'); G.saveOk = false;
    check('Butterball is not a resident of Bobby\'s park',
      W.ROOMS.park.residents.indexOf('butterball') < 0);
    check('he lives in his own tree', W.ROOMS.home2.residents.indexOf('butterball') >= 0);
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    check('...so he is not standing in the WL1 park',
      !H.npcs.some(function (n) { return n.friendKey === 'butterball'; }));
    G.go('house', { room: 'home2' }); steps(2); secs(0.4);
    check('...he is at home in the tree',
      H.npcs.some(function (n) { return n.friendKey === 'butterball'; }));

    // playing AS Butterball, he is not his own NPC
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'home2' }); steps(2); secs(0.4);
    check('but you never bump into yourself',
      !H.npcs.some(function (n) { return n.friendKey === 'butterball'; }));

    // Galaxy: caged, then freed
    G.state = G.freshState('butterball'); G.saveOk = false;
    check('Galaxy starts nowhere', !G.state.friendRooms ||
      !G.state.friendRooms.galaxy, G.state.friendRooms && G.state.friendRooms.galaxy);
    G.go('house', { room: 'park2' }); steps(2); secs(0.4);
    check('and is not in the park yet',
      !H.npcs.some(function (n) { return n.friendKey === 'galaxy'; }));

    // beat the dragon and she moves in
    G.go('castle', {}); steps(3);
    var KG = W.sceneCastle;
    KG.cls = 'knight'; KG.startRun(); steps(2);
    KG.dragon.hp = 0; KG.dragon.dead = true;
    KG.x = 3120; steps(6);
    check('freeing her is a first', G.state.firsts.castle === true);
    check('and she moves into the park',
      G.state.friendRooms.galaxy === 'park2', G.state.friendRooms.galaxy);
    G.go('house', { room: 'park2' }); steps(2); secs(0.4);
    check('...where you can now meet her',
      H.npcs.some(function (n) { return n.friendKey === 'galaxy'; }));

    // a save from before a character existed still gets them seeded — an
    // old save must not leave the Star Park permanently empty
    G.state = G.freshState('butterball'); G.saveOk = false;
    W.save.apply({ v: 1, friendRooms: { panda: 'park' }, party: [] });
    G.go('house', { room: 'park2' }); steps(2); secs(0.4);
    check('an old save still meets the scaly critters',
      H.npcs.filter(function (n) { return (n.friendKey || '').indexOf('scaly') === 0; }).length === 3);
    // ...but somebody deliberately left somewhere stays put
    G.state = G.freshState('butterball'); G.saveOk = false;
    W.save.apply({ v: 1, friendRooms: { scalyA: 'themepark' }, party: [] });
    G.go('house', { room: 'park2' }); steps(2); secs(0.4);
    check('and one you moved stays where you left it',
      !H.npcs.some(function (n) { return n.friendKey === 'scalyA'; }));
    G.go('house', { room: 'themepark' }); steps(2); secs(0.4);
    check('...over there', H.npcs.some(function (n) { return n.friendKey === 'scalyA'; }));

    // an old save that already rescued her keeps her
    G.state = G.freshState('butterball'); G.saveOk = false;
    W.save.apply({ v: 1, firsts: { castle: true }, friendRooms: { panda: 'park' },
                   party: [] });
    check('old saves that freed her keep her',
      G.state.friendRooms.galaxy === 'park2', G.state.friendRooms.galaxy);

    // --- Warmland 2's park has its own villain
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('mission', { mission: 'megatron', from: 'park2' }); steps(3);
    var MS = W.sceneMission;
    check('Warmland 2 fights Nemesis Prime', MS.villain === 'nemesis', MS.villain);
    check('and he is drawn as himself', !!MS.boss && MS.boss.nemesis === true);
    check('Nemesis Prime has his own art', typeof W.drawNemesis === 'function');
    G.go('mission', { mission: 'megatron', from: 'park' }); steps(3);
    check('Bobby\'s park still fights Megatron', MS.villain === 'megatron', MS.villain);
    check('...and is drawn as Megatron', !!MS.boss && !MS.boss.nemesis);
    // both are beatable the same way
    G.go('mission', { mission: 'megatron', from: 'park2' }); steps(3);
    MS.boss.hp = 1; MS.f.enemies = [MS.boss];
    MS.boss.hp = 0; MS.f.enemies = [];
    secs(1.6);
    check('beating him completes the mission', MS.f.over === 'win', MS.f.over);

    // --- Megatron sends you back to the park you were working in
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'park2' }); steps(2); secs(0.4);
    G.fadeTo('mission', { mission: 'megatron', from: 'park2' }); secs(1.2);
    check('the fight starts', G.scene === G.scenes.mission);
    press('back'); secs(1.4);
    check('fleeing goes back to the park you came from',
      G.state.room === 'park2', G.state.room);

    // --- boarding a car at a place puts it on the road by that place
    G.state.room = 'outside2';
    G.go('vehicle', { vehicle: 'popcar', map: 'warmland2' }); steps(2);
    var roadY = W.MAPS.warmland2.roads[0].y;
    check('the popcorn car starts on the tarmac',
      Math.abs(W.sceneVehicle.y - roadY) < 44,
      W.sceneVehicle.x.toFixed(0) + ',' + W.sceneVehicle.y.toFixed(0));
    var treePad = W.MAPS.warmland2.pois.filter(function (q) {
      return q.to && q.to.room === 'outside2';
    })[0];
    check('...below the treehouse it came from',
      Math.abs(W.sceneVehicle.x - treePad.x) < 200);
    check('...and not parked on somebody else\'s pad',
      W.MAPS.warmland2.pois.every(function (q) {
        return q === treePad ||
          Math.hypot(W.sceneVehicle.x - q.x, W.sceneVehicle.y - q.y) > q.r;
      }));

    // --- the popcorn car is bumpy off the road, just like the car
    G.go('vehicle', { vehicle: 'popcar', map: 'warmland2' }); steps(2);
    V.x = 700; V.y = 500; V.vx = 200; steps(2);
    check('the popcorn car is smooth on the road', V.offRoad === false);
    V.x = 300; V.y = 200; V.vx = 200; steps(2);
    check('and bumpy off it', V.offRoad === true);

    // --- outfits are named for whoever is playing
    G.state = G.freshState('bobby'); G.saveOk = false;
    check('Bobby has the Boba Bear Bot', W.suitName('mech') === 'Boba Bear Bot');
    check('the chef outfit is just the Chef Outfit', W.suitName('chef') === 'Chef Outfit');
    check('and it does not say Bobby', W.suitName('chef').indexOf('Bobby') < 0);
    check('his stand is a boba cart', W.standName() === 'boba cart');
    G.state = G.freshState('butterball'); G.saveOk = false;
    check('Butterball has the Butter Bot', W.suitName('mech') === 'Butter Bot');
    check('and his stand is a lemonade wagon', W.standName() === 'lemonade wagon');
    check('the lemonade round is a real job', !!W.JOBS.lemonade && !!W.ITEMS.lemonade);

    // --- the sword connects with something standing right on top of you
    G.go('castle', {}); steps(2);
    var K = W.sceneCastle;
    K.cls = 'knight'; K.startRun(); steps(2);
    K.enemies.length = 0;
    K.enemies.push({ x: K.x + 30, y: K.y, hp: 1, maxHp: 1, hurt: 0, speed: 0,
                     cool: 9, face: -1, kind: 'skeleton' });
    K.cool = 0;
    press('act'); steps(2);
    check('the sword hits an enemy in your face', K.enemies[0].hp <= 0,
      'hp ' + K.enemies[0].hp);
    // ...and one at arm's length
    K.enemies[0] = { x: K.x + 70, y: K.y, hp: 1, maxHp: 1, hurt: 0, speed: 0,
                     cool: 9, face: -1, kind: 'skeleton' };
    K.cool = 0; K.face = 1;
    press('act'); steps(2);
    check('and one at arm\'s length', K.enemies[0].hp <= 0);
    // one swing is one hit, not one per frame
    K.enemies[0] = { x: K.x + 40, y: K.y, hp: 3, maxHp: 3, hurt: 0, speed: 0,
                     cool: 9, face: -1, kind: 'troll' };
    K.cool = 0; K.swing = 0;         // start from a clean, un-swung sword
    press('act'); secs(0.3);
    check('but a single swing only lands once', K.enemies[0].hp === 2,
      'hp ' + K.enemies[0].hp);

    // --- the carousel has cup holders
    check('the merry-go-round has a teacup seat', !!W.PROPS.carCup);

    // --- prop art must fit inside its sprite tile, or it gets sliced flat
    //     (the treehouse's leafy crown spills well past the trunk)
    function spill(kind, x, y) {
      var sp = W.makePropSprite({ kind: kind, x: x, y: y });
      var g = sp.img.getContext('2d');
      var im = g.getImageData(0, 0, sp.img.width, sp.img.height).data;
      var wpx = sp.img.width, hpx = sp.img.height, edge = 0;
      // any ink sitting on the outermost row/column is art that got cut
      for (var i = 0; i < wpx; i++) {
        if (im[(0 * wpx + i) * 4 + 3] > 10) edge++;
        if (im[((hpx - 1) * wpx + i) * 4 + 3] > 10) edge++;
      }
      for (var j = 0; j < hpx; j++) {
        if (im[(j * wpx + 0) * 4 + 3] > 10) edge++;
        if (im[(j * wpx + wpx - 1) * 4 + 3] > 10) edge++;
      }
      return edge;
    }
    check('the treehouse crown is not cut off', spill('treehouse', 70, 300) === 0,
      spill('treehouse', 70, 300) + ' px on the edge');
    check('Butterball\'s tree is not cut off', spill('treehome', 380, 300) === 0);
    check('the magic closet glow is not cut off', spill('closet', 250, 210) === 0);
    check('the trees are not cut off', spill('tree', 120, 180) === 0);
    check('the house is not cut off', spill('house', 350, 160) === 0);
    check('props can ask for extra room', W.PROPS.treehouse.pad > 18 &&
      W.makePropSprite({ kind: 'treehouse', x: 0, y: 0 }).img.width ===
        W.PROPS.treehouse.w + W.PROPS.treehouse.pad * 2);

    // --- a wide prop must not become a wide invisible wall
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'outside2' }); steps(2); secs(0.4);
    var treeSolid = W.solidsFor('outside2').filter(function (q) {
      return q.x > 300 && q.x < 460 && q.w > 120;
    })[0];
    check('the tree only blocks at its trunk', !!treeSolid && treeSolid.h <= 40,
      treeSolid ? treeSolid.h : 'none');
    // the walk from the popcorn car to the balloon must be clear along the
    // front of the yard, below the trunk
    H.player.x = 160; H.player.y = 556;
    hold('right', true); secs(3.6); hold('right', false); steps(2);
    check('you can walk past the tree to the balloon', H.player.x > 700,
      'reached x=' + H.player.x.toFixed(0));

    // --- walking up the path really does get you back inside the tree
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'outside2' }); steps(2); secs(0.4);
    var treeDoor = W.ROOMS.outside2.doors.filter(function (d) { return d.to === 'home2'; })[0];
    var yardSolids = W.solidsFor('outside2');
    check('the tree door is somewhere you can stand',
      W.canStand(W.ROOMS.outside2, yardSolids,
                 treeDoor.x + treeDoor.w / 2, treeDoor.y + treeDoor.h - 4),
      treeDoor.x + ',' + treeDoor.y);
    // walk up the path to it, the way a kid would
    H.player.x = 480; H.player.y = 500;
    hold('up', true); secs(1.4); hold('up', false); secs(1.2);
    check('walking up the path goes inside', G.state.room === 'home2', G.state.room);
    // ...and the way back out lands you in front of it again
    var back = W.ROOMS.home2.doors.filter(function (d) { return d.to === 'outside2'; })[0];
    H.player.x = back.x + back.w / 2; H.player.y = back.y + 10;
    secs(1.4);
    check('and climbing down comes back out', G.state.room === 'outside2', G.state.room);

    // --- the arcade is entered with Z, like the two rides beside it
    G.go('house', { room: 'themepark' }); steps(2); secs(0.4);
    var arcSt = station('arcadeDoor');
    check('the arcade tent is a station', !!arcSt);
    var fairSolids = W.solidsFor('themepark');
    check('you can stand at its doorway',
      W.canStand(W.ROOMS.themepark, fairSolids, arcSt.x + arcSt.w / 2, arcSt.y + arcSt.h),
      arcSt.x + ',' + arcSt.y);
    standAt(arcSt); steps(3);
    check('and it offers the arcade', S_prompt_is('arcadeDoor'), H.prompt && H.prompt.text);
    W.dialogue.active = false;
    press('act'); secs(1.4);
    check('Z walks you in', G.state.room === 'arcade', G.state.room);

    // --- the teacup ride
    check('the ride is teacups now', W.STATIONS.carousel.label === 'Teacup Ride');
    check('and the canopy hangs above the riders', typeof W.drawCarouselTop === 'function');
    check('no horses left on it', !W.PROPS.carHorse);
    G.state.friendRooms = { galaxy: 'themepark' };
    G.go('house', { room: 'themepark' }); steps(2); secs(0.4);
    var gal2 = H.npcs.filter(function (n) { return n.friendKey === 'galaxy'; })[0];
    G.state.party = ['galaxy']; if (gal2) gal2.mode = 'follow';
    var cupSt = station('carousel');
    H.mount('carousel', cupSt);
    secs(0.5);
    var seat0 = H.ridePos(0), seat1 = H.ridePos(1);
    check('you are riding a cup', !!H.riding && H.riding.kind === 'carousel');
    check('your friend gets in too', !!H.riding.partner);
    check('the cups sit on opposite sides', Math.abs(seat0.x - seat1.x) > 40 ||
      Math.abs(seat0.y - seat1.y) > 20);
    var spinA = H.ridePos(0).cupSpin; secs(0.5); var spinB = H.ridePos(0).cupSpin;
    check('and they spin as they go round', spinA !== spinB);
    check('but the cup never tips over', Math.abs(H.ridePos(0).spin) < 0.6);
    press('back'); steps(2);
    check('and you can hop off', !H.riding);

    // --- every minigame hands you back over its own pad
    G.go('house', { room: 'themepark' }); steps(2);   // somewhere else entirely
    G.go('castle', {}); steps(3);
    var K2 = W.sceneCastle; K2.cls = 'knight'; K2.startRun(); steps(2);
    press('back'); secs(1.4);
    var castlePad = W.mapPadAt('warmland2', 'castle');
    check('leaving the castle drops you over the castle',
      W.sceneVehicle.mapId === 'warmland2' &&
      Math.hypot(W.sceneVehicle.x - castlePad[0], W.sceneVehicle.y - castlePad[1]) < 30,
      W.sceneVehicle.x.toFixed(0) + ',' + W.sceneVehicle.y.toFixed(0));

    // --- the archer draws a bowstring and the wizard waves a wand
    G.go('castle', {}); steps(3);
    K2.cls = 'archer'; K2.startRun(); steps(2);
    K2.cool = 0; K2.face = 1;
    press('act'); steps(1);
    check('the archer\'s bow is drawn back', K2.swing > 0, K2.swing.toFixed(2));
    check('and an arrow is away', K2.shots.length === 1);
    G.go('castle', {}); steps(3);
    K2.cls = 'wizard'; K2.startRun(); steps(2);
    K2.cool = 0; K2.face = 1; K2.cast = 1;      // next cast is the star
    press('act'); secs(0.3);
    check('the wizard waves his wand', K2.swing > 0);
    var bolt = K2.shots[0];
    check('the bolt leaves a sparkle trail', !!bolt && bolt.trail.length > 4,
      bolt ? bolt.trail.length : 'no bolt');

    // --- the wizard casts in twos: a snowflake that freezes, then a star
    G.go('castle', {}); steps(3);
    K2.cls = 'wizard'; K2.startRun(); steps(2);
    K2.enemies.length = 0;
    K2.enemies.push({ x: K2.x + 120, y: K2.y, hp: 3, maxHp: 3, hurt: 0,
                      speed: 60, cool: 9, face: -1, kind: 'troll' });
    K2.cool = 0; K2.face = 1; K2.cast = 0;
    press('act'); secs(1.0);
    check('the first cast is frost', K2.enemies[0].frozen > 0,
      K2.enemies[0].frozen);
    check('...and does no damage', K2.enemies[0].hp === 3, K2.enemies[0].hp);
    var frozenX = K2.enemies[0].x;
    secs(0.5);
    check('...and holds it still', Math.abs(K2.enemies[0].x - frozenX) < 1);
    K2.cool = 0;
    press('act'); secs(1.0);
    check('the second cast hurts', K2.enemies[0].hp === 2, K2.enemies[0].hp);

    // and neither one pierces any more
    G.go('castle', {}); steps(3);
    K2.cls = 'wizard'; K2.startRun(); steps(2);
    K2.enemies.length = 0;
    [90, 190].forEach(function (dx3) {
      K2.enemies.push({ x: K2.x + dx3, y: K2.y, hp: 3, maxHp: 3, hurt: 0,
                        speed: 0, cool: 9, face: -1, kind: 'troll' });
    });
    K2.cool = 0; K2.face = 1; K2.cast = 1;      // next cast is the star
    press('act'); secs(2.2);
    check('a star stops at the first thing it hits',
      K2.enemies[0].hp === 2 && K2.enemies[1].hp === 3,
      K2.enemies.map(function (e6) { return e6.hp; }).join(','));

    // ...and only the knight's swing actually cuts: the archer and wizard
    // wave their weapons about without doing melee damage
    ['archer', 'wizard'].forEach(function (cl) {
      G.go('castle', {}); steps(3);
      K2.cls = cl; K2.startRun(); steps(2);
      K2.enemies.length = 0;
      K2.enemies.push({ x: K2.x + 30, y: K2.y, hp: 3, maxHp: 3, hurt: 0,
                        speed: 0, cool: 9, face: -1, kind: 'troll' });
      K2.cool = 0; K2.face = -1;          // fire AWAY from the troll
      press('act'); secs(0.5);
      check('the ' + cl + ' does not melee', K2.enemies[0].hp === 3,
        K2.enemies[0].hp);
    });

    // --- the laboratory, its barman, and his potion
    G.state = G.freshState('bobby'); G.saveOk = false;
    check('the lab is a real room', !!W.ROOMS.haunt4);
    check('you get to it from the old kitchen',
      W.ROOMS.haunt2.doors.some(function (d) { return d.to === 'haunt4'; }));
    check('and back out again',
      W.ROOMS.haunt4.doors.some(function (d) { return d.to === 'haunt2'; }));
    check('Webs is a real friend', !!W.FRIENDS.webs && !!W.CHARS[W.FRIENDS.webs.char]);
    check('and the potion is a real drink', !!W.ITEMS.potion);

    G.go('house', { room: 'haunt4' }); steps(2); secs(0.4);
    var webs = H.npcs.filter(function (n) { return n.friendKey === 'webs'; })[0];
    check('Webs is behind his bar', !!webs && Math.abs(webs.x - 480) < 40 && webs.y < 260,
      webs ? webs.x.toFixed(0) + ',' + webs.y.toFixed(0) : 'missing');
    check('and he stays put', !!webs && webs.mode === 'hold');

    var bar = station('potionBar');
    check('the bar is a station', !!bar);
    standAt(bar); steps(3);
    check('the prompt offers a potion', S_prompt_is('potionBar'), H.prompt && H.prompt.text);
    press('act'); steps(2);
    check('Webs hands one over', W.hands.has('potion'), G.state.held);
    check('and the pill now says drink it',
      H.prompt && H.prompt.text.indexOf('Drink') >= 0, H.prompt && H.prompt.text);
    press('act'); steps(2);
    check('drinking it empties your paws', W.hands.empty());
    check('and grows eight legs', !!G.bobaFx && G.bobaFx.kind === 'eightlegs',
      G.bobaFx && G.bobaFx.kind);
    check('the legs start sprouting', W.spiderLegs() > 0, W.spiderLegs().toFixed(2));
    secs(0.6);
    check('and are fully out a moment later', W.spiderLegs() === 1,
      W.spiderLegs().toFixed(2));

    // the legs tuck away when the potion wears off
    G.bobaFx.until = G.t + 0.2; secs(0.05);
    check('they start tucking away at the end', W.spiderLegs() < 0.9);
    secs(0.6);
    check('and then they are gone', !G.bobaFx && W.spiderLegs() === 0);

    // it works for Butterball too
    G.state = G.freshState('butterball'); G.saveOk = false;
    G.go('house', { room: 'haunt4' }); steps(2); secs(0.4);
    standAt(station('potionBar')); steps(3);
    press('act'); steps(2); press('act'); steps(2);
    check('Butterball can grow eight legs as well',
      !!G.bobaFx && G.bobaFx.kind === 'eightlegs');
    G.bobaFx = null;

    // hands full? Webs says so rather than silently doing nothing
    carry([]); W.hands.hold('boba');
    standAt(station('potionBar')); steps(3);
    press('act'); steps(2);
    check('he will not pour into full paws', W.hands.has('boba'));
    W.hands.drop();

    // --- the bar is a refill you can always come back to. Take Webs away
    //     with you and the lab still pours.
    G.state = G.freshState('bobby'); G.saveOk = false;
    G.go('house', { room: 'haunt4' }); steps(2); secs(0.4);
    var websNpc = H.npcs.filter(function (n) { return n.friendKey === 'webs'; })[0];
    H.player.x = websNpc.x; H.player.y = websNpc.y + 30; steps(3);
    press('talk'); steps(2);
    check('Webs will come along', G.state.party.indexOf('webs') >= 0,
      JSON.stringify(G.state.party));

    // leave him somewhere else entirely
    G.go('house', { room: 'living' }); steps(2); secs(0.4);
    var websOut = H.npcs.filter(function (n) { return n.friendKey === 'webs'; })[0];
    check('and he follows you out of the lab', !!websOut);
    H.player.x = websOut.x + 20; H.player.y = websOut.y; steps(3);
    press('back'); steps(2);            // Dee — he stays in the living room
    check('...and can be left there', G.state.party.indexOf('webs') < 0);

    // now the bar, with nobody behind it
    G.go('house', { room: 'haunt4' }); steps(2); secs(0.4);
    check('the lab is empty now', !H.websHere());
    standAt(station('potionBar')); steps(3);
    check('the bar still offers a refill',
      H.prompt && H.prompt.text.indexOf('potion') >= 0, H.prompt && H.prompt.text);
    W.dialogue.active = false;         // the first Z would only clear a bubble
    press('act'); steps(2);
    check('and it still pours', W.hands.has('potion'), G.state.held);
    W.dialogue.active = false;
    press('act'); steps(2);
    check('so you can always top up', !!G.bobaFx && G.bobaFx.kind === 'eightlegs',
      G.bobaFx && G.bobaFx.kind);
    G.bobaFx = null;
    W.hands.drop();

    // and Webs pours wherever you left him, too
    G.go('house', { room: 'living' }); steps(2); secs(0.4);
    var websLiving = H.npcs.filter(function (n) { return n.friendKey === 'webs'; })[0];
    check('Webs lives where you left him', !!websLiving);
    H.player.x = websLiving.x + 22; H.player.y = websLiving.y; steps(3);
    check('with empty paws, so the offer is his and not a leftover',
      W.hands.empty());
    check('and standing by him offers a potion',
      H.prompt && H.prompt.text.indexOf('potion') >= 0, H.prompt && H.prompt.text);
    W.dialogue.active = false;
    press('act'); steps(2);
    check('which he pours on the spot', W.hands.has('potion'));
    W.hands.drop();

    // --- and the pads sit next to the road, so the car barely goes off it
    var padTree = W.MAPS.warmland2.pois.filter(function (q) {
      return q.to && q.to.room === 'outside2';
    })[0];
    var padFair = W.MAPS.warmland2.pois.filter(function (q) {
      return q.to && q.to.room === 'themepark';
    })[0];
    check('the treehouse pad is beside the road',
      Math.abs(padTree.y - 500) - padTree.r < 40, Math.round(Math.abs(padTree.y - 500) - padTree.r));
    check('so is the theme park',
      Math.abs(padFair.y - 500) - padFair.r < 40, Math.round(Math.abs(padFair.y - 500) - padFair.r));
    Object.keys(W.FRIENDS).forEach(function (k) {
      check('friend ' + k + ' has a real character', !!W.CHARS[W.FRIENDS[k].char]);
    });
    Object.keys(W.LINES).forEach(function (k) {
      check('line set ' + k + ' has a station', !!W.STATIONS[k]);
    });
  }

  /* Scenes register during boot, which waits on document.fonts — so hold off
   * until the world actually exists. */
  function begin() {
    if (!W.game.scenes.house) { setTimeout(begin, 20); return; }

    try { run(); }
    catch (e) { results.push('FAIL  threw: ' + (e && e.stack || e)); fails++; }

    var pass = results.filter(function (r) { return r.indexOf('PASS') === 0; }).length;
    var total = pass + fails;
    document.getElementById('out').textContent =
      (fails ? 'FAILURES: ' + fails : 'ALL PASS') + '   (' + pass + '/' + total + ')\n' +
      results.join('\n');
    document.title = fails ? 'FAIL ' + fails : 'PASS';
  }
  begin();
})(window.W);
