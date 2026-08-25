/* Warmland — the magic closet's wardrobe.
 *
 * A suit is pure data: which extra layers to bolt onto the base character,
 * what colours they are, and — the part that matters for the game — which
 * abilities wearing it unlocks. Stations check abilities, not suit names, so
 * a second suit can grant 'cook' later without touching the kitchen.
 */
(function (W) {
  'use strict';

  var PAL = W.PAL;

  W.SUITS = {
    none: {
      name: 'Just Me', names: { bobby: 'Just Bobby', butterball: 'Just Butterball' },
      blurb: 'Soft, round, and full of boba.',
      blurbs: { bobby: 'Soft, round, and full of boba.',
                butterball: 'Fuzzy, flappy, and full of beans.' },
      unlocks: 'Being extremely cuddly',
      abilities: [],
      arms: null, legs: null, hat: null
    },

    chef: {
      name: 'Chef Outfit', short: 'Chef',
      blurb: 'Now he can hold a whisk!',
      unlocks: 'Cooking, and working the shop',
      abilities: ['cook', 'serve'],
      arms: 'stubby', legs: 'stubby', hat: 'toque',
      sleeve: PAL.white, trouser: PAL.steel, shoe: PAL.outline,
      apron: true, accessory: 'whisk'
    },

    racer: {
      name: 'Racer Outfit', short: 'Racer',
      blurb: 'Vroom vroom! Zero to boba in 3 seconds.',
      unlocks: 'Driving the car',
      abilities: ['drive'],
      arms: 'stubby', legs: 'stubby', hat: 'helmet',
      sleeve: '#D94F4F', trouser: '#3B2A20', shoe: '#E8E8E8',
      racingStripe: true, accessory: 'wheel'
    },

    builder: {
      name: 'Builder Outfit', short: 'Builder',
      blurb: 'Hard hat on. Let\'s build something!',
      unlocks: 'Building the treehouse',
      abilities: ['build'],
      arms: 'stubby', legs: 'stubby', hat: 'hardhat',
      sleeve: '#F2A03D', trouser: '#5A78B5', shoe: '#6B4A2A',
      toolbelt: true, accessory: 'hammer'
    },

    mech: {
      name: 'Bot Suit',
      names: { bobby: 'Boba Bear Bot', butterball: 'Butter Bot' },
      shorts: { bobby: 'Boba Bot', butterball: 'Butter Bot' },
      blurb: 'Transforms into a robot — or a stand on wheels.',
      blurbs: { bobby: 'Transforms into a robot — or a boba cart.',
                butterball: 'Transforms into a robot — or a lemonade wagon.' },
      unlocks: 'Transforming, and the boba gun',
      unlockSet: { bobby: 'Transforming, and the boba gun',
                   butterball: 'Transforming, and the lemonade blaster' },
      abilities: ['transform', 'battle'],
      overrideBody: 'mech',          // drawn as the robot, not as a cup
      forms: ['robot', 'cart']
    }
  };

  W.SUIT_ORDER = ['none', 'chef', 'racer', 'builder', 'mech'];

  /* What this outfit is called for whoever is playing: the same closet, but
   * Bobby's bot is the Boba Bear Bot and Butterball's is the Butter Bot. */
  W.suitName = function (key) {
    var s = W.SUITS[key] || W.SUITS.none;
    var hero = W.heroChar ? W.heroChar() : 'bobby';
    return (s.names && s.names[hero]) || s.name;
  };
  W.suitBlurb = function (key) {
    var s = W.SUITS[key] || W.SUITS.none;
    var hero = W.heroChar ? W.heroChar() : 'bobby';
    return (s.blurbs && s.blurbs[hero]) || s.blurb;
  };

  /* The stand this hero's bot folds out into. */
  W.suitUnlocks = function (key) {
    var s = W.SUITS[key] || W.SUITS.none;
    var hero = W.heroChar ? W.heroChar() : 'bobby';
    return (s.unlockSet && s.unlockSet[hero]) || s.unlocks;
  };

  W.suitShort = function (key) {
    var s = W.SUITS[key] || W.SUITS.none;
    var hero = W.heroChar ? W.heroChar() : 'bobby';
    if (key === 'none') return hero === 'butterball' ? 'Butterball' : 'Bobby';
    return (s.shorts && s.shorts[hero]) || s.short || W.suitName(key);
  };

  W.standName = function () {
    return (W.heroChar && W.heroChar() === 'butterball') ? 'lemonade wagon' : 'boba cart';
  };

  /* Does Bobby's current outfit grant this ability? Stations call this
   * rather than comparing suit names. */
  W.can = function (ability) {
    var s = W.SUITS[W.game.state.suit];
    return !!(s && s.abilities.indexOf(ability) >= 0);
  };

  /* Which suit would grant it — used for the "you need the chef hat" hint. */
  W.suitFor = function (ability) {
    for (var i = 0; i < W.SUIT_ORDER.length; i++) {
      var k = W.SUIT_ORDER[i];
      if (W.SUITS[k].abilities.indexOf(ability) >= 0) return W.SUITS[k];
    }
    return null;
  };
})(window.W);
