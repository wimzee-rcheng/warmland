/* Warmland — cooking.
 *
 * Recipes are data and matching is a plain multiset compare, so adding a dish
 * later is one line. There is deliberately no burning and no failure state:
 * a progress bar, some steam, and then food.
 */
(function (W) {
  'use strict';

  W.RECIPES = [
    { id: 'pizza',     name: 'Pizza',      needs: ['flour', 'tomato', 'pepperoni', 'mushroom'], time: 4 },
    { id: 'spaghetti', name: 'Spaghetti',  needs: ['pasta', 'tomato', 'meatball', 'onion'],     time: 4 },
    { id: 'bread',     name: 'Bread',      needs: ['flour', 'yeast'],                            time: 5 },
    { id: 'cake',      name: 'Cake',       needs: ['flour', 'sugar', 'egg'],                     time: 6 },
    { id: 'eggs',      name: 'Fried Egg',  needs: ['egg'],                        time: 2, makes: 'friedEgg' }
  ];

  function tally(list) {
    var m = {};
    for (var i = 0; i < list.length; i++) m[list[i]] = (m[list[i]] || 0) + 1;
    return m;
  }

  function same(a, b) {
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) if (a[ka[i]] !== b[ka[i]]) return false;
    return true;
  }

  /* Which recipe do these exact contents make? null if nothing yet. */
  W.matchRecipe = function (contents) {
    var have = tally(contents);
    for (var i = 0; i < W.RECIPES.length; i++) {
      if (same(have, tally(W.RECIPES[i].needs))) return W.RECIPES[i];
    }
    return null;
  };

  /* Recipes still reachable by adding to what's already in the pot — drives
   * the "you could still make..." hint on the stove. */
  W.possibleRecipes = function (contents) {
    var have = tally(contents);
    return W.RECIPES.filter(function (r) {
      var need = tally(r.needs);
      for (var k in have) if (!need[k] || have[k] > need[k]) return false;
      return true;
    });
  };

  W.recipeDish = function (r) { return r.makes || r.id; };
})(window.W);
