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
    check('the park has friends', friends.length >= 6, friends.length + ' friends');
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
    G.state = G.freshState();
    G.state.day = 5;
    W.save.write();
    G.saveOk = false;
    G.go('title'); steps(2); secs(0.5);
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

    // the rack hands out one tool at a time
    var rack = station('toolRack');
    standAt(rack); W.dialogue.active = false; press('act');
    check('the rack gives a tool', W.hands.kind() === 'tool', W.hands.item());
    if (!W.hands.has('hoe')) { W.dialogue.active = false; press('act'); steps(2);
                              W.dialogue.active = false; press('act'); }
    check('...and the hoe can be picked', W.hands.has('hoe'), W.hands.item());
    check('the bumped seeds land on the ground',
      W.dropped.list('backyard').length === 1, W.dropped.list('backyard').length);

    standAt(plot); W.dialogue.active = false; press('act');
    check('plowing starts', plot.s.plow > 0);
    secs(1.4);
    check('the plot is turned over', plot.s.stage === 0);

    // pick the seeds back up and plant
    var sd = W.dropped.list('backyard')[0];
    H.player.x = sd.x; H.player.y = sd.y; steps(3);
    W.dialogue.active = false; press('act');
    check('the seeds come back', W.hands.has('seeds'));
    standAt(plot); W.dialogue.active = false; press('act');
    check('planting takes the seeds', plot.s.stage === 1 && !W.hands.has('seeds'));

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
    G.state.pet = null;
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    useStation('petBox');
    check('a fluff is adopted', !!G.state.pet && !!G.state.pet.name, G.state.pet && G.state.pet.name);
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
    check('X makes the pup stay', G.state.petHome === 'kitchen');
    G.go('house', { room: 'living' }); steps(2);
    check('the pup waits where told', !H.npcs.some(function (a) { return a.isPet; }));
    G.go('house', { room: 'kitchen' }); steps(2);
    var pp2 = H.npcs.filter(function (a) { return a.isPet; })[0];
    check('...in its room', !!pp2);
    H.player.x = pp2.x; H.player.y = pp2.y + 30; steps(2);
    W.dialogue.active = false; press('back');
    check('X again resumes following', G.state.petHome === null);

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
    for (var pn = 0; pn < 3; pn++) {
      H.machineCtl.x = H.machineCtl.stack[0]; H.machineCtl.y = H.machineCtl.stack[1];
      steps(2); W.dialogue.active = false; press('act');
      check('panel ' + (pn + 1) + ' hooks on', H.machineCtl.carrying === true);
      H.machineCtl.x = 480; H.machineCtl.y = 330; steps(2);
      W.dialogue.active = false; press('act');
      check('...and lowers onto the lot', H.machineCtl.placed === pn + 1);
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
    check('a power-up is handed out', !!F.hero.power, F.hero.power);
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
    var pw1 = F.hero.powers[0];
    clearWave();
    check('wave two also grants a shield', F.hero.shieldHits === 1);
    check('...and a speed boost', F.hero.speed === 310);
    check('and a different power-up', F.hero.power !== pw1, F.hero.power);
    check('the first power-up is KEPT, not swapped out',
      F.hero.powers.length === 2 && F.hero.powers.indexOf(pw1) >= 0,
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
    F.hero.powers = ['dual', 'bombs'];
    F.hero.cool = 0; F.shotCount = 3; F.shots.length = 0;
    F.fire(480, 400, 0, -500);
    check('stacked power-ups all apply at once',
      F.shots.length === 2 && F.shots[0].bomb === true);

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
    G.state.builds = { swing: true, seesaw: true, critterBox: true, camp: true, friendHouse: 4 };
    ['backyard', 'grocery', 'site', 'friendhouse', 'treehouse', 'park', 'mountain',
     'kitchen', 'living', 'outside'].forEach(function (rn) {
      G.go('house', { room: rn }); steps(2); secs(0.4);
      check(rn + ': Bobby can walk from his spawn', canWalk(20),
        H.player.x.toFixed(0) + ',' + H.player.y.toFixed(0));
      check(rn + ': and he is inside the room', H.player.x > W.ROOMS[rn].bounds.x - 40 &&
        H.player.x < W.ROOMS[rn].bounds.x + W.ROOMS[rn].bounds.w + 40);
    });

    // every door leads to a room that exists and spawns somewhere standable
    Object.keys(W.ROOMS).forEach(function (rn) {
      (W.ROOMS[rn].doors || []).forEach(function (d) {
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
        var ok = poi.kind ? true : (poi.to.room ? !!W.ROOMS[poi.to.room] :
          poi.to.mission ? true : poi.to.race ? !!W.sceneRace :
          poi.to.mars ? !!W.sceneMars : poi.to.snow ? !!W.sceneSnow :
          !!W.MAPS[poi.to.map]);
        check('map ' + id + ': ' + poi.label + ' leads somewhere real', ok);
        check('map ' + id + ': ' + poi.label + ' is inside the map',
          poi.x > 0 && poi.x < W.MAPS[id].w && poi.y > 0 && poi.y < W.MAPS[id].h);
      });
    });

    Object.keys(W.VEHICLES).forEach(function (v) {
      check('vehicle ' + v + ' has a real map', !!W.MAPS[W.VEHICLES[v].map]);
    });
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
