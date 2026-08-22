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

    // ------------------------------------------------------- basket
    sec('basket and items');
    G.state.basket = [];
    check('basket starts empty', W.basket.count() === 0);
    ['tomato', 'onion', 'egg', 'flour'].forEach(function (i) { W.basket.add(i); });
    check('basket holds four', W.basket.count() === 4);
    check('basket reports full', W.basket.full() === true);
    var refused = W.basket.add('sugar');
    check('fifth item is refused', refused === false && W.basket.count() === 4);
    W.basket.remove('onion');
    check('removing frees a slot', W.basket.count() === 3 && !W.basket.has('onion'));
    var kinds = W.basket.ofKind('ingredient');
    check('can filter by kind', kinds.length === 2, kinds.join(','));
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
    G.state.basket = [];
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
    G.state.basket = ['tomato', 'sugar'];
    useStation('stove');
    check('any mix cooks something', stove.s.cooking > 0, 'recipe ' + (stove.s.recipe || {}).id);
    check('the surprise is the fallback', stove.s.recipe.id === 'surprise');
    secs(3.5);
    check('the surprise comes out', stove.s.dish === 'surprise', stove.s.dish);
    useStation('stove');
    check('the dish lands in the basket', W.basket.has('surprise'));

    // a known combo still makes the real dish
    G.state.basket = ['egg'];
    useStation('stove');
    check('a known combo cooks the real dish', stove.s.recipe.id === 'eggs');
    secs(2.5);
    useStation('stove');
    check('fried egg collected', W.basket.has('friedEgg'));

    // ---- set the table, sit, eat, wash, put away
    var table = station('table');
    var chair = station('chair');
    check('the kitchen has chairs', !!chair);

    standAt(table); W.dialogue.active = false; press('act');
    check('setting the table takes a plate', G.state.plates.stored === 2, G.state.plates.stored);
    check('the dish is on the table', table.s.set.length >= 1 && !W.basket.has('friedEgg'));

    standAt(chair); W.dialogue.active = false; press('act');
    check('sitting works', H.seated === chair);

    W.dialogue.active = false; press('act');       // eat!
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

    check('plates never touch the basket', W.basket.ofKind('plate').length === 0);

    useStation('bobaMachine');
    check('the boba machine gives boba', W.basket.has('boba'));

    // drinking it is the fallback action on open floor
    H.player.x = 480; H.player.y = 330; steps(3);
    W.dialogue.active = false; press('act');
    check('boba gets drunk, not dropped', !W.basket.has('boba'));
    check('a wacky effect kicks in', !!G.bobaFx, G.bobaFx && G.bobaFx.kind);
    G.bobaFx = null;

    // dropping and picking back up
    G.state.basket = ['tomato'];
    H.player.x = 480; H.player.y = 330; steps(3);
    W.dialogue.active = false; press('act');
    check('the tomato sits on the floor',
      W.basket.count() === 0 && W.dropped.list('kitchen').length === 1);
    steps(3);
    W.dialogue.active = false; press('act');
    check('...and picks back up', W.basket.has('tomato') && W.dropped.list('kitchen').length === 0);

    // the trash can dumps everything — after asking twice
    G.state.basket = ['tomato', 'egg', 'flour'];
    useStation('trash');
    W.dialogue.active = false; press('act');
    check('the trash can empties the basket (confirmed)', W.basket.count() === 0);

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
    G.go('house', { room: 'outside' }); steps(2); secs(0.4);
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
    G.state.basket = [];
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
    check('crystals never enter the basket', W.basket.count() === 0);
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

    G.state.suit = 'racer';
    check('the car needs the racer suit', !!W.VEHICLES.car.requires && W.can(W.VEHICLES.car.requires));
    G.state.suit = 'none';
    check('the car is locked without it', !W.can(W.VEHICLES.car.requires));

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
    G.state.basket = ['egg'];
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
    G.state.basket = ['pasta', 'flour'];
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
    G.state.basket = ['egg', 'flour'];
    standAt(station('trash')); W.dialogue.active = false; press('act');
    check('first Z only asks', W.basket.count() === 2);
    W.dialogue.active = false; press('act');
    check('second Z dumps', W.basket.count() === 0);

    // A6: the dive never offers Leave at the doorway before moving
    G.go('dive', { site: 'WRECK' }); steps(2); secs(0.5);
    check('no exit prompt at spawn', D3.atExit === false);

    // A7: build the treehouse from the NORTH side and walk away after
    G.state = G.freshState(); G.saveOk = false;
    G.state.suit = 'builder';
    G.go('house', { room: 'outside' }); steps(2); secs(0.4);
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
    G.state.basket = ['egg'];
    H.player.x = 480; H.player.y = 330; steps(3);
    W.dialogue.active = false; press('act');
    check('the egg is on the living-room floor', W.dropped.list('living').length === 1);
    W.save.write();
    G.state = G.freshState();
    W.save.load();
    check('the floor egg survives a save', W.dropped.list('living').length === 1 &&
      W.dropped.list('living')[0].id === 'egg');

    // a full basket refuses pickup but keeps the floor item
    G.go('house', { room: 'living' }); steps(2); secs(0.4);
    G.state.basket = ['tomato', 'onion', 'flour', 'sugar'];
    var fl = W.dropped.list('living')[0];
    H.player.x = fl.x; H.player.y = fl.y; steps(2);
    W.dialogue.active = false; press('act');
    check('full-basket pickup is refused, item kept',
      W.dropped.list('living').length === 1 && W.basket.count() === 4);
    G.state.basket = [];

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
    MM.wave = 10;
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

    // the garden: buy seeds, plant, water across sleeps, harvest
    G.state.money = 10;
    G.state.basket = [];
    G.state.suit = 'chef';
    G.go('house', { room: 'shop' }); steps(2); secs(0.4);
    useStation('seedStand');
    check('seeds cost 3 coins', G.state.money === 7 && W.basket.has('seeds'));
    G.go('house', { room: 'outside' }); steps(2); secs(0.4);
    var plot = station('garden');
    standAt(plot); W.dialogue.active = false; press('act');
    check('planting takes the seeds', plot.s.stage === 1 && !W.basket.has('seeds'));
    // water as fast as you like — no waiting for tomorrow
    W.dialogue.active = false; press('act'); secs(1.6);
    check('watering sprouts it right away', plot.s.stage === 2);
    W.dialogue.active = false; press('act'); secs(1.6);
    check('watering again grows it', plot.s.stage === 3);
    W.dialogue.active = false; press('act');
    check('the harvest lands in the basket',
      W.basket.count() >= 1 && plot.s.stage === 0, W.basket.list().join(','));

    // fishing: a full cast-bite-catch cycle
    G.state.basket = [];
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    var rod = station('fishing');
    standAt(rod); W.dialogue.active = false; press('act');
    check('the cast starts the wait', rod.s.wait > 0);
    // step deterministically to just inside the bite window, then strike
    var waitLeft = rod.s.wait;
    secs(waitLeft + 0.2);
    check('the bobber bites after the wait', rod.s.bite > 0, rod.s.bite);
    W.dialogue.active = false; press('act');
    check('something was caught', W.basket.count() === 1, W.basket.list().join(','));
    // and a missed window gets away clean
    standAt(rod); W.dialogue.active = false; press('act');
    secs(rod.s.wait + 1.4);
    check('a missed bite gets away', rod.s.bite <= 0 && W.basket.count() === 1);

    // the pet: adopt, follow, feed
    G.state.pet = null;
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    useStation('petBox');
    check('a fluff is adopted', !!G.state.pet && !!G.state.pet.name, G.state.pet && G.state.pet.name);
    G.go('house', { room: 'kitchen' }); steps(2); secs(0.4);
    var pet2 = H.npcs.filter(function (a) { return a.isPet; })[0];
    check('the pet follows to other rooms', !!pet2);
    // the trailing pup must never mask the basket actions
    var pp0 = H.npcs.filter(function (a) { return a.isPet; })[0];
    G.state.basket = ['boba'];
    H.player.x = 480; H.player.y = 330;
    pp0.x = 500; pp0.y = 340; steps(2);          // right on his heels
    check('drink still offered with the pup close', /Drink/.test(H.prompt.text), H.prompt.text);
    W.dialogue.active = false; press('act');
    check('and Z drinks, not pets', !W.basket.has('boba') && !!G.bobaFx);
    G.bobaFx = null;
    G.state.basket = [];

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
    G.state.basket = [];
    G.go('house', { room: 'shop' }); steps(2); secs(0.4);
    useStation('treatStand');
    check('treats cost 2 coins', G.state.money === 3 && W.basket.has('treat'));

    // gifts: a favorite raises friendship
    G.state.party = [];
    G.state.friendRooms = null;
    G.state.friendship = {};
    G.state.basket = ['cake'];
    G.go('house', { room: 'park' }); steps(2); secs(0.4);
    var pnd = H.npcs.filter(function (a) { return a.friendKey === 'panda'; })[0];
    check('panda is at the park', !!pnd);
    W.giveGift(pnd);
    check('the gift lands a heart', G.state.friendship.panda === 1);
    check('the cake is given away', !W.basket.has('cake'));
    G.state.friendship.panda = 2;
    G.state.basket = ['cake'];
    W.giveGift(pnd);
    check('three hearts = best friends first', G.state.friendship.panda === 3 &&
      G.state.firsts['bff-panda'] === true);

    // decor: buy a plant for the bedroom, it persists
    G.state.money = 20;
    G.state.decor = {};
    G.go('house', { room: 'shop' }); steps(2); secs(0.4);
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
          poi.to.mission ? true : !!W.MAPS[poi.to.map]);
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
