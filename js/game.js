/* Warmland — boot, main loop, scene stack, world clock. */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;
  var LW = 960, LH = 600;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d', { alpha: false });   // opaque = cheaper composites

  function resize() {
    var s = Math.min(window.innerWidth / LW, window.innerHeight / LH);
    canvas.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', resize);

  /* Which character the player is right now. Everything that draws the
   * player asks this instead of hardcoding 'bobby'. */
  W.heroChar = function () {
    return (W.game && W.game.state && W.game.state.hero) || 'bobby';
  };

  /* The pet roster: two heroes, two pets, both can tag along. */
  W.pets = {
    all: function () {
      var ps = (W.game.state.pets) || {};
      return Object.keys(ps).filter(function (k) { return !!ps[k]; });
    },
    get: function (key) { return (W.game.state.pets || {})[key] || null; },
    any: function () { return W.pets.all().length > 0; },
    adopt: function (key, name) {
      if (!W.game.state.pets) W.game.state.pets = {};
      W.game.state.pets[key] = { name: name, home: null, fedDay: 0 };
    }
  };

  function freshState(hero) {
    hero = hero || 'bobby';
    return {
      hero: hero,
      suit: 'none',
      room: hero === 'butterball' ? 'home2' : 'living',
      visited: {},
      tray: [],
      canWater: 0,
      builds: {},
      shells: 0,
      snowBest: 0,
      shellsFound: {},              // raw ingredients only (max 4)
      held: null,            // the one thing in Bobby's paws
      stations: {},          // room:kind:index -> persistent bits
      lights: {},            // room -> bool (undefined means on)
      party: [],             // friends currently following
      metFriends: {},
      money: 0,
      day: 1,
      clock: 8,              // hours, 0..24
      crystals: 0,
      meals: 0,
      platesAway: 0,
      builtTreehouse: false,
      missions: {},          // megatron, space
      treasures: {},         // cave/wreck collected flags
      mechForm: 'robot',     // robot | cart (only matters in the mech suit)
      plates: { stored: 3, dirty: 0, rack: 0 },
      dropped: {},           // room -> [{id,x,y}] items on the floor
      friendRooms: null,     // friend -> room they live in (built on first use)
      crystalsCarried: 0,    // crystals in hand — never in the basket
      ideas: null,           // today's gentle goals {day, list, done}
      ideaStickers: 0,       // days where all three ideas got done
      firsts: {},            // one-time celebrations already fired
      mail: {},              // 'day:boxIndex' -> read
      crystalsFound: {},     // crystal type -> count ever found
      weather: 'sunny',      // rolled per day
      pets: {},              // key -> { name, home, fedDay }; two are possible
      ghosts: {},            // haunted-house ghosts brought back to colour
      coaster: [],           // the roller-coaster the kid assembled
      arcade: {},            // best scores per cabinet
      friendship: {},        // friend -> hearts (0..3)
      decor: {},             // room -> [prop kinds placed]
      saveSalt: Math.floor(Math.random() * 1e9),   // varies weather etc. per game
      job: null              // live only — jobs end on room change, never saved
    };
  }

  var G = {
    ctx: ctx, W: LW, H: LH, t: 0,
    DAYNIGHT: false,        // the day/night cycle is parked for now
    WEATHER_ON: true,       // weather is decorative only: particles, no tinting
    SCENE_TINTS: false,     // master switch: NOTHING may darken the scene
    paused: false,          // harness/test parking brake for the rAF loop
    userPaused: false,      // the player's P key
    bobaFx: null,           // { kind, until } — live only, it's a sugar rush
    state: freshState(),
    scenes: {},
    scene: null, sceneName: '',
    overlay: null, overlayName: '',
    fade: 0, phase: 'idle', pending: null,
    banner: null, bannerT: 0,
    saveOk: false          // set once the title gate is passed (or dev boot)
  };
  W.game = G;
  G.freshState = freshState;

  // ------------------------------------------------------------ the clock

  var HOURS_PER_SEC = 1 / 60;          // a full day is about 24 minutes

  /* Which of the four phases is it? Parked at 'day' while the cycle is off. */
  G.phase4 = function () {
    if (!G.DAYNIGHT) return 'day';
    var h = G.state.clock;
    if (h < 10) return 'morning';
    if (h < 17) return 'day';
    if (h < 20) return 'evening';
    return 'night';
  };

  /* How dark the outdoors should be, 0 = bright noon. */
  G.PHASE_TINT = {
    morning: { color: '#FFD9A0', alpha: 0.16, mode: 'multiply' },
    day:     { color: '#FFFFFF', alpha: 0,    mode: 'multiply' },
    evening: { color: '#FF9A5C', alpha: 0.26, mode: 'multiply' },
    night:   { color: '#2A3A78', alpha: 0.62, mode: 'multiply' }
  };

  var IDEA_POOL = [
    { id: 'cook',     text: 'Cook something yummy' },
    { id: 'trix',     text: 'Say Trix to a friend' },
    { id: 'crystal',  text: 'Find a crystal' },
    { id: 'fly',      text: 'Fly somewhere' },
    { id: 'shift',    text: 'Do a job shift' },
    { id: 'sleepover',text: 'Have a sleepover' },
    { id: 'boba',     text: 'Drink a boba' },
    { id: 'love',     text: 'Say Keena Meena' }
  ];

  var WEATHERS = ['sunny', 'sunny', 'sunny', 'rainy', 'rainy', 'snowy', 'rainbow'];
  function rollWeather() {
    if (G.state.weatherDay === G.state.day) return;   // already rolled (or pinned)
    G.state.weatherDay = G.state.day;
    if (!G.WEATHER_ON || G.state.day <= 1) { G.state.weather = 'sunny'; return; }
    // salted per save — an unsalted seed made day 1 rain in EVERY new game
    var rnd = W.mulberry32(W.hash('weather' + G.state.day + (G.state.saveSalt || 0)))();
    G.state.weather = WEATHERS[Math.floor(rnd * WEATHERS.length)];
  }

  function rollIdeas() {
    var rnd = W.mulberry32(W.hash('ideas' + G.state.day));
    var pool = IDEA_POOL.slice();
    var list = [];
    while (list.length < 3 && pool.length) {
      list.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    G.state.ideas = { day: G.state.day, list: list, done: {} };
  }

  /* Tick off a gentle goal the moment it happens, with a tiny cheer. */
  G.idea = function (id) {
    var I = G.state.ideas;
    if (!I || I.done[id]) return;
    for (var i = 0; i < I.list.length; i++) {
      if (I.list[i].id === id) {
        I.done[id] = true;
        W.fx.sparkle(480, 90, 10, 50);
        if (W.audio) W.audio.play('ding');
        W.say('Idea done: ' + I.list[i].text + '!', '#6FA84B');
        return;
      }
    }
  };

  /* One-time celebrations. Returns true the first time only.
   * Half-length banner: a cheer, not a lecture. */
  G.first = function (id, label) {
    if (G.state.firsts[id]) return false;
    G.state.firsts[id] = true;
    G.showBanner('NEW!', label, 2.5);
    if (W.audio) W.audio.play('win');
    return true;
  };

  /* A fresh game gets its first ideas immediately, not on day 2. */
  G.ensureIdeas = function () {
    if (!G.state.ideas || G.state.ideas.day !== G.state.day) {
      rollIdeas();
      rollWeather();
    }
  };

  /* Called by the sleep sequence in scene-house once the lights are out. */
  G.wakeUp = function (sleepover) {
    // yesterday fully ticked? earn a sticker for the board
    var I0 = G.state.ideas;
    if (I0 && I0.list && I0.list.every(function (x) { return I0.done[x.id]; })) {
      G.state.ideaStickers++;
    }
    G.state.clock = 12;
    G.state.day += 1;
    rollIdeas();
    rollWeather();
    var WSAY = { sunny: '', rainy: 'a rainy day  ·  ', snowy: 'a SNOWY day  ·  ', rainbow: 'a RAINBOW day!!  ·  ' };
    var ideas = (G.WEATHER_ON ? WSAY[G.state.weather] : '') +
                G.state.ideas.list.map(function (i) { return i.text; }).join('  ·  ');
    if (sleepover) {
      var firstOver = !G.state.firsts.sleepover;
      G.state.firsts.sleepover = true;          // counted, but OUR banner shows
      G.banner = { title: 'SLEEPOVER!', sub: (firstOver ? 'Your FIRST sleepover! ' : '') +
                   'Day ' + G.state.day + ' — everyone stayed over!' };
      if (firstOver && W.audio) W.audio.play('win');
      G.idea('sleepover');
    } else {
      var IDEA_ICONS = { cook: 'friedEgg', trix: 'heart', crystal: 'crystal',
                         fly: 'tinyUfo', shift: 'vanilla', sleepover: 'moon',
                         boba: 'boba', love: 'heart' };
      G.banner = { title: 'Day ' + G.state.day, sub: ideas,
                   icons: G.state.ideas.list.map(function (i2) { return IDEA_ICONS[i2.id]; }) };
    }
    G.bannerT = 0;
    if (W.save) W.save.auto();
    if (W.audio) W.audio.play('chime');
  };

  // kept for tests and anything that wants an instant skip
  G.sleep = function () { G.wakeUp(false); };

  G.addMoney = function (n) { G.state.money += n; };

  G.startJob = function (id) {
    if (W.service) W.service.start(id);
  };

  // --------------------------------------------------------------- scenes

  G.register = function (name, s) { if (s) G.scenes[name] = s; };

  G.go = function (name, param) {
    if (!G.scenes[name]) throw new Error('no such scene: ' + name);
    W.fx.clear();                  // particles must not follow you between scenes
    G.scene = G.scenes[name];
    G.sceneName = name;
    G.overlay = null;
    G.overlayName = '';
    if (G.scene.enter) G.scene.enter(param);
  };

  G.fadeTo = function (name, param) {
    if (G.phase !== 'idle') return;
    G.pending = { name: name, param: param };
    G.phase = 'out';
    // Get the destination's poses queued now so the fade can bake them.
    if (name === 'house' && param && param.room && W.warmRoom) W.warmRoom(param.room);
  };

  G.pushOverlay = function (name, param) {
    W.dialogue.active = false;
    G.overlay = G.scenes[name];
    G.overlayName = name;
    if (G.overlay.enter) G.overlay.enter(param);
  };

  G.popOverlay = function () {
    W.dialogue.active = false;
    G.overlay = null;
    G.overlayName = '';
  };

  G.showBanner = function (title, sub, life) {
    G.banner = { title: title, sub: sub, life: life || 5 };
    G.bannerT = 0;
  };

  // ------------------------------------------------------------- main loop

  var last = 0;

  G.step = function (dt) {
    G.t += dt;

    if (G.phase === 'out' || G.phase === 'in') {
      // Bake queued poses behind the curtain, as many as fit in a slice, so
      // the first walk through a crowded room doesn't stutter. The screen is
      // covered — a fade frame is allowed to be slow, a gameplay frame isn't,
      // so this budget is deliberately generous (music can ride a 25ms frame;
      // it audibly skips on repeated 40ms ones during play).
      var budget = performance.now() + 26;
      if (W.warmStep()) while (performance.now() + W.warmAvg() < budget && W.warmStep()) { /* keep going */ }
    }

    if (G.phase === 'out') {
      G.fade += dt * 3.2;
      if (G.fade >= 1) {
        G.fade = 1;
        G.go(G.pending.name, G.pending.param);
        G.pending = null;
        G.phase = 'in';
      }
    } else if (G.phase === 'in') {
      G.fade -= dt * 3.2;
      if (G.fade <= 0) { G.fade = 0; G.phase = 'idle'; }
    }

    // The world clock only runs while you're actually playing.
    if (G.DAYNIGHT && G.phase === 'idle' && !G.overlay &&
        G.sceneName !== 'title' && G.sceneName !== 'mission') {
      var before = G.state.clock;
      G.state.clock = (G.state.clock + dt * HOURS_PER_SEC) % 24;
      if (before < 19.5 && G.state.clock >= 19.5 && G.state.nudgedDay !== G.state.day) {
        G.state.nudgedDay = G.state.day;
        W.say('It is getting dark... time for bed soon?', '#B0C4E8');
      }
    }

    // the boba sugar rush wears off
    if (G.bobaFx && G.t > G.bobaFx.until) {
      G.bobaFx = null;
      W.fx.sparkle(480, 300, 10, 60);
      if (W.audio) W.audio.play('pop');
    }

    if (G.savedFlash > 0) G.savedFlash -= dt;

    if (G.banner) {
      G.bannerT += dt;
      if (G.bannerT > (G.banner.life || 5)) G.banner = null;
    }

    if (W.input.hit('mute') && W.audio) W.audio.toggleMute();
    if (W.input.hit('pause')) {
      G.userPaused = !G.userPaused;
      if (W.audio) W.audio.setPaused(G.userPaused);
    }

    var active = G.overlay || G.scene;
    if (G.phase === 'idle' && active && active.update) active.update(dt);
    else if (active && active === G.scene && G.phase !== 'idle') {
      W.fx.update(dt);
      W.dialogue.update(dt);
    }

    ctx.clearRect(0, 0, LW, LH);
    // opaque overlays fully cover the room — skip drawing it underneath
    if (G.scene && G.scene.draw && !(G.overlay && G.overlay.opaque)) G.scene.draw(ctx);
    if (G.overlay && G.overlay.draw) G.overlay.draw(ctx);
    if (G.banner) W.drawBanner(ctx, G.banner.title, G.banner.sub, G.bannerT, G.banner.icons);

    if (G.fade > 0) {
      ctx.save();
      ctx.globalAlpha = G.fade;
      ctx.fillStyle = '#3B2A20';
      ctx.fillRect(0, 0, LW, LH);
      ctx.restore();
    }

    W.input.endFrame();
  };

  /* One thrown error must NEVER end the game: requestAnimationFrame only
   * re-arms after step() returns, so an uncaught throw used to freeze the
   * whole game solid — which a child reads as "it crashed". Catch, remember
   * the error (so a grown-up can report it from the console), and keep
   * going; if the same frame keeps dying, retreat to the living room. */
  var errStreak = 0;
  function frame(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    if (G.userPaused) {
      // frozen frame + the PAUSED card; only P is listened for
      if (W.input.hit('pause')) {
        G.userPaused = false;
        if (W.audio) W.audio.setPaused(false);
      } else {
        W.drawPauseCard(ctx);
      }
      W.input.endFrame();
    } else if (!G.paused) {
      try {
        G.step(dt);
        errStreak = 0;
      } catch (err) {
        errStreak++;
        G.lastError = String(err && err.stack || err);
        if (console && console.error) console.error('Warmland frame error:', err);
        try { window.localStorage.setItem('warmland.lastError', G.lastError); } catch (e2) {}
        W.input.endFrame();               // a half-run frame must not leave keys wedged
        if (errStreak === 1 && ctx.restore) {
          // a throw between save/restore leaves the canvas transformed —
          // unwind hard so the next frame draws sanely
          for (var u = 0; u < 24; u++) ctx.restore();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
        if (errStreak > 90) {
          // the same frame has died for 1.5s straight — go somewhere safe
          errStreak = 0;
          try { G.go('house', { room: 'living' }); } catch (e3) {}
        }
      }
    }
    requestAnimationFrame(frame);
  }

  // ----------------------------------------------------------------- boot

  function registerAll() {
    G.register('title',   W.sceneTitle);
    G.register('house',   W.sceneHouse);
    G.register('closet',  W.sceneCloset);
    G.register('picker',  W.scenePicker);
    G.register('recipes', W.sceneRecipes);
    G.register('crystalbook', W.sceneCrystalBook);
    G.register('ideas',   W.sceneIdeas);
    G.register('decorshop', W.sceneDecorShop);
    G.register('vehicle', W.sceneVehicle);
    G.register('mission', W.sceneMission);
    G.register('dive',    W.sceneDive);
    G.register('race',    W.sceneRace);
    G.register('mars',    W.sceneMars);
    G.register('snow',    W.sceneSnow);
    G.register('castle',  W.sceneCastle);
    G.register('coaster', W.sceneCoaster);
    G.register('arcade',  W.sceneArcade);
  }

  function boot() {
    resize();
    registerAll();

    var start = function () {
      // Dev shortcuts: #room=kitchen  #scene=vehicle&vehicle=ufo  #suit=chef
      var h = {};
      location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
        var p = kv.split('=');
        if (p[0]) h[p[0]] = decodeURIComponent(p[1] || '1');
      });
      if (h.suit && W.SUITS[h.suit]) G.state.suit = h.suit;
      if (h.money) G.state.money = +h.money;
      if (h.day) G.state.day = +h.day;
      if (h.clock) G.state.clock = +h.clock;
      if (h.treehouse) G.state.builtTreehouse = true;
      if (h.weather) { G.state.weather = h.weather; G.state.weatherDay = G.state.day; }
      if (h.pet) G.state.pets = { mochi: { name: 'Mochi', home: null, fedDay: 0 } };
      if (h.hero) { G.state.hero = h.hero; if (!h.room) G.state.room = h.hero === 'butterball' ? 'home2' : 'living'; }
      if (h.crystals) { G.state.crystals = +h.crystals; G.state.crystalsFound = { sunstone: 2, heartgem: 2 }; }
      if (h.dark) G.state.lights[h.room || 'living'] = false;
      if (h.party) G.state.party = h.party.split(',');
      if (h.builds) {
        // #builds=all, or a comma list: &builds=swing,camp
        var want = h.builds === 'all'
          ? ['swing', 'seesaw', 'critterBox', 'camp'] : h.builds.split(',');
        want.forEach(function (b) { G.state.builds[b] = true; });
        if (h.builds === 'all') G.state.builds.friendHouse = 4;
        if (h.house) G.state.builds.friendHouse = +h.house;
      }
      if (h.shells) { G.state.shells = +h.shells; G.state.shellsFound = { scallop: 2, conch: 1 }; }
      if (h.tray) G.state.tray = h.tray.split(',').filter(W.isRaw);
      if (h.held) G.state.held = h.held;

      // dev shortcuts do NOT autosave over a real game unless asked
      if (h.save) G.saveOk = true;

      if (h.scene === 'arcade') {
        G.go('arcade', { game: h.game || 'lob' });
      } else if (h.scene === 'coaster') {
        G.go('coaster', { mode: h.mode || 'build' });
      } else if (h.scene === 'castle') {
        G.go('castle');
      } else if (h.map) {
        G.go('vehicle', { vehicle: h.vehicle || 'balloon', map: h.map });
      } else if (h.scene === 'snow') {
        G.go('snow');
      } else if (h.scene === 'mars') {
        G.go('mars');
      } else if (h.scene === 'race') {
        G.state.suit = 'racer';
        G.go('race');
      } else if (h.scene === 'vehicle') {
        G.go('vehicle', { vehicle: h.vehicle || 'ufo' });
      } else if (h.scene === 'mission') {
        G.go('mission', { mission: h.mission || 'megatron', from: h.from });
      } else if (h.scene === 'dive') {
        G.go('dive', { site: h.site || 'CAVE' });
      } else if (h.scene === 'recipes') {
        G.go('house', { room: 'kitchen' });
        G.pushOverlay('recipes');
      } else if (h.scene === 'closet') {
        G.go('house', { room: h.room || 'living' });
        G.pushOverlay('closet');
      } else if (h.room) {
        G.go('house', { room: h.room });
      } else {
        G.go('title');
      }
      requestAnimationFrame(frame);
    };

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    else start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.W);
