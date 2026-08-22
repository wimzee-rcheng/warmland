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
      name: 'Just Bobby',
      blurb: 'Soft, round, and full of boba.',
      unlocks: 'Being extremely cuddly',
      abilities: [],
      arms: null, legs: null, hat: null
    },

    chef: {
      name: 'Chef Bobby',
      blurb: 'Now he can hold a whisk!',
      unlocks: 'Cooking, and working the shop',
      abilities: ['cook', 'serve'],
      arms: 'stubby', legs: 'stubby', hat: 'toque',
      sleeve: PAL.white, trouser: PAL.steel, shoe: PAL.outline,
      apron: true, accessory: 'whisk'
    },

    racer: {
      name: 'Racer Bobby',
      blurb: 'Vroom vroom! Zero to boba in 3 seconds.',
      unlocks: 'Driving the car',
      abilities: ['drive'],
      arms: 'stubby', legs: 'stubby', hat: 'helmet',
      sleeve: '#D94F4F', trouser: '#3B2A20', shoe: '#E8E8E8',
      racingStripe: true, accessory: 'wheel'
    },

    builder: {
      name: 'Builder Bobby',
      blurb: 'Hard hat on. Let\'s build something!',
      unlocks: 'Building the treehouse',
      abilities: ['build'],
      arms: 'stubby', legs: 'stubby', hat: 'hardhat',
      sleeve: '#F2A03D', trouser: '#5A78B5', shoe: '#6B4A2A',
      toolbelt: true, accessory: 'hammer'
    },

    mech: {
      name: 'Boba Bear Bot',
      blurb: 'Transforms into a robot — or a boba cart.',
      unlocks: 'Transforming, and the boba gun',
      abilities: ['transform', 'battle'],
      overrideBody: 'mech',          // drawn as the robot, not as a cup
      forms: ['robot', 'cart']
    }
  };

  W.SUIT_ORDER = ['none', 'chef', 'racer', 'builder', 'mech'];

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
