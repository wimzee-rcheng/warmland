/* Warmland — everything Bobby can pick up.
 *
 * Each item has one small crayon icon, baked once and reused by the inventory
 * bar, the station overlays and the basket on Bobby's head. The basket holds
 * four things; gathering is meant to take a couple of trips.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  /* The crystal varieties — mining and diving roll one of these, and the
   * collection book tracks which you've ever found. */
  W.CRYSTALS = {
    sunstone: { name: 'Sunstone',  color: '#F2C14E', hi: '#FBE29A', lo: '#C79A2E' },
    moondrop: { name: 'Moondrop',  color: '#B8CAE8', hi: '#E4EDFA', lo: '#8A9EC4' },
    leafshard:{ name: 'Leafshard', color: '#6FC46F', hi: '#A8E8A8', lo: '#4E8F4E' },
    emberbit: { name: 'Emberbit',  color: '#E8834E', hi: '#F5B48A', lo: '#B85A2E' },
    skydrop:  { name: 'Skydrop',   color: '#7FA8E8', hi: '#B4D0F5', lo: '#5A7FC4' },
    heartgem: { name: 'Heartgem',  color: '#E8578F', hi: '#F5A0C4', lo: '#B83A6A' }
  };
  W.CRYSTAL_ORDER = ['sunstone', 'moondrop', 'leafshard', 'emberbit', 'skydrop', 'heartgem'];

  /* Roll a variety (seeded) and record the find. */
  W.findCrystal = function (seed) {
    var order = W.CRYSTAL_ORDER;
    var type = order[Math.floor(W.mulberry32(W.hash('cry' + seed))() * order.length)];
    var st = W.game.state;
    st.crystalsCarried++;
    st.crystalsFound[type] = (st.crystalsFound[type] || 0) + 1;
    return W.CRYSTALS[type];
  };

  // kind: ingredient | pantry | dish | drink | plate | treasure
  W.ITEMS = {
    // --- fridge
    tomato:    { name: 'Tomato',    kind: 'ingredient', color: '#D9402F', icon: 'round',  leaf: true },
    pepperoni: { name: 'Pepperoni', kind: 'ingredient', color: '#C2413F', icon: 'slices' },
    mushroom:  { name: 'Mushroom',  kind: 'ingredient', color: '#C9A882', icon: 'mushroom' },
    onion:     { name: 'Onion',     kind: 'ingredient', color: '#C9A0D8', icon: 'onion' },
    meatball:  { name: 'Meatball',  kind: 'ingredient', color: '#8A5A3B', icon: 'balls' },
    egg:       { name: 'Egg',       kind: 'ingredient', color: '#FFF6E0', icon: 'egg' },

    // --- pantry
    pasta:     { name: 'Pasta',     kind: 'pantry', color: '#EFCB6A', icon: 'pasta' },
    flour:     { name: 'Flour',     kind: 'pantry', color: '#F2EADA', icon: 'sack' },
    yeast:     { name: 'Yeast',     kind: 'pantry', color: '#C79A5E', icon: 'jar' },
    sugar:     { name: 'Sugar',     kind: 'pantry', color: '#FFFFFF', icon: 'sack' },

    // --- made
    pizza:      { name: 'Pizza',      kind: 'dish', color: '#E8A83D', icon: 'pizza' },
    spaghetti:  { name: 'Spaghetti',  kind: 'dish', color: '#EFCB6A', icon: 'plate' },
    bread:      { name: 'Bread',      kind: 'dish', color: '#C98F4E', icon: 'bread' },
    cake:       { name: 'Cake',       kind: 'dish', color: '#F5D0DE', icon: 'cake' },
    friedEgg:   { name: 'Fried Egg',  kind: 'dish', color: '#FFF6E0', icon: 'egg' },

    surprise:   { name: "Bobby's Surprise", kind: 'dish', color: '#C9A0D8', icon: 'surprise' },
    fishDinner: { name: 'Fish Dinner', kind: 'dish', color: '#5FA8D6', icon: 'fish' },

    boba:       { name: 'Boba',       kind: 'drink', color: '#D9A863', icon: 'cup' },
    vanilla:    { name: 'Vanilla',    kind: 'drink', color: '#F3E6C8', icon: 'cone', topping: '#F2C14E' },
    chocolate:  { name: 'Chocolate',  kind: 'drink', color: '#8A5A3B', icon: 'cone', topping: '#5A3A20' },
    strawberry: { name: 'Strawberry', kind: 'drink', color: '#E88FA8', icon: 'cone', topping: '#D9402F' },

    // plates are tracked as counters (state.plates), not carried items;
    // these stay defined so an old save's basket can still render
    cleanPlate: { name: 'Clean Plate', kind: 'plate', color: '#FFFDF6', icon: 'plate' },
    dirtyPlate: { name: 'Dirty Plate', kind: 'plate', color: '#CFC4AE', icon: 'plate', dirty: true },

    crystal:    { name: 'Crystal',    kind: 'treasure', color: '#7FA8E8', icon: 'crystal' },
    seeds:      { name: 'Seeds',      kind: 'pantry',   color: '#C79A5E', icon: 'sack' },
    treat:      { name: 'Pet Treat',  kind: 'treasure', color: '#E8B23D', icon: 'balls' },
    fish:       { name: 'Fish',       kind: 'ingredient', color: '#5FA8D6', icon: 'fish' },
    boot:       { name: 'Old Boot',   kind: 'treasure', color: '#6B4A2A', icon: 'boot' },
    tinyUfo:    { name: 'Tiny UFO',   kind: 'treasure', color: '#B9C3C9', icon: 'tinyufo' }
  };

  // ------------------------------------------------------------- icon art

  var ICONS = {};

  function drawIcon(g, id, cx, cy, r) {
    var it = W.ITEMS[id];
    var col = it.color, s = 'ic' + id;

    switch (it.icon) {
      case 'round':
        C.ellipse(g, cx, cy + 1, r * 0.82, r * 0.78, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 3, wash: 0.78 });
        if (it.leaf) C.ellipse(g, cx, cy - r * 0.7, r * 0.3, r * 0.18, { seed: s + 'lf', fill: PAL.grass, stroke: PAL.outline, lw: 1.6, hatch: 2, wash: 0.85 });
        break;
      case 'slices':
        for (var i = 0; i < 3; i++)
          C.ellipse(g, cx + (i - 1) * r * 0.45, cy + (i % 2) * 3, r * 0.36, r * 0.34,
            { seed: s + i, fill: col, stroke: PAL.outline, lw: 1.8, hatch: 2.4, wash: 0.8 });
        break;
      case 'mushroom':
        C.rect(g, cx - r * 0.22, cy, r * 0.44, r * 0.7, { seed: s + 'st', fill: '#EFE2C8', stroke: PAL.outline, lw: 1.8, hatch: 2.4, wash: 0.8 });
        C.arc(g, cx, cy + 2, r * 0.78, Math.PI, Math.PI * 2, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.8 });
        break;
      case 'onion':
        C.ellipse(g, cx, cy + 2, r * 0.7, r * 0.78, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.8, wash: 0.75 });
        C.line(g, cx, cy - r * 0.7, cx - r * 0.2, cy - r, { seed: s + 'sp', stroke: PAL.grassDk, lw: 1.8, wob: 0.5 });
        break;
      case 'balls':
        C.dot(g, cx - r * 0.3, cy + r * 0.2, r * 0.4, col, s + 'a');
        C.dot(g, cx + r * 0.34, cy - r * 0.1, r * 0.42, col, s + 'b');
        break;
      case 'egg':
        C.ellipse(g, cx, cy + 1, r * 0.62, r * 0.8, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.85 });
        if (id === 'friedEgg') C.dot(g, cx, cy + 1, r * 0.3, PAL.sun, s + 'yk');
        break;
      case 'pasta':
        for (var p = -1; p <= 1; p++)
          C.line(g, cx + p * r * 0.32, cy - r * 0.7, cx + p * r * 0.32, cy + r * 0.7,
            { seed: s + p, stroke: col, lw: 3.4, wob: 0.7 });
        C.rect(g, cx - r * 0.6, cy - r * 0.2, r * 1.2, r * 0.4, { seed: s + 'bd', fill: PAL.roof, stroke: PAL.outline, lw: 1.6, hatch: 2, wash: 0.85 });
        break;
      case 'sack':
        C.poly(g, [[cx - r * 0.62, cy + r * 0.75], [cx + r * 0.62, cy + r * 0.75],
                   [cx + r * 0.44, cy - r * 0.5], [cx - r * 0.44, cy - r * 0.5]],
          { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 3, wash: 0.8 });
        C.line(g, cx - r * 0.44, cy - r * 0.5, cx + r * 0.44, cy - r * 0.5, { seed: s + 'tie', stroke: PAL.outline, lw: 2.4, wob: 0.6 });
        // flour and sugar are both pale sacks — mark them apart
        if (id === 'flour') {
          C.line(g, cx - r * 0.3, cy + r * 0.3, cx, cy - r * 0.2, { seed: s + 'w1', stroke: '#C79A5E', lw: 2, wob: 0.5, passes: 1 });
          C.line(g, cx, cy + r * 0.3, cx, cy - r * 0.25, { seed: s + 'w2', stroke: '#C79A5E', lw: 2, wob: 0.5, passes: 1 });
          C.line(g, cx + r * 0.3, cy + r * 0.3, cx, cy - r * 0.2, { seed: s + 'w3', stroke: '#C79A5E', lw: 2, wob: 0.5, passes: 1 });
        } else if (id === 'sugar') {
          C.dot(g, cx - r * 0.2, cy + r * 0.1, r * 0.09, '#8FD0EE', s + 'g1');
          C.dot(g, cx + r * 0.22, cy + r * 0.3, r * 0.09, '#8FD0EE', s + 'g2');
          C.dot(g, cx + r * 0.05, cy - r * 0.1, r * 0.09, '#8FD0EE', s + 'g3');
        }
        break;
      case 'jar':
        C.roundRect(g, cx - r * 0.5, cy - r * 0.5, r, r * 1.3, 4, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.78 });
        C.rect(g, cx - r * 0.56, cy - r * 0.72, r * 1.12, r * 0.28, { seed: s + 'lid', fill: PAL.steel, stroke: PAL.outline, lw: 1.8, hatch: 2, wash: 0.85 });
        break;
      case 'pizza':
        C.arc(g, cx, cy + r * 0.6, r * 0.9, Math.PI, Math.PI * 2, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.8, wash: 0.8 });
        C.dot(g, cx - r * 0.3, cy + r * 0.1, r * 0.16, PAL.roof, s + 'p1');
        C.dot(g, cx + r * 0.28, cy + r * 0.22, r * 0.16, PAL.roof, s + 'p2');
        break;
      case 'bread':
        C.roundRect(g, cx - r * 0.75, cy - r * 0.4, r * 1.5, r * 0.9, 7, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 3, wash: 0.8 });
        for (var b = -1; b <= 1; b++) C.line(g, cx + b * r * 0.35, cy - r * 0.34, cx + b * r * 0.35 + 4, cy - r * 0.06, { seed: s + 'sc' + b, stroke: '#A5702F', lw: 1.6, wob: 0.4, passes: 1 });
        break;
      case 'cake':
        C.rect(g, cx - r * 0.62, cy - r * 0.1, r * 1.24, r * 0.8, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.8, wash: 0.8 });
        C.rect(g, cx - r * 0.62, cy - r * 0.4, r * 1.24, r * 0.34, { seed: s + 'ic', fill: PAL.accent, stroke: PAL.outline, lw: 1.8, hatch: 2.2, wash: 0.85 });
        C.line(g, cx, cy - r * 0.42, cx, cy - r * 0.78, { seed: s + 'cn', stroke: PAL.roof, lw: 2.4, wob: 0.4 });
        C.dot(g, cx, cy - r * 0.86, r * 0.14, PAL.sun, s + 'fl');
        break;
      case 'plate':
        C.ellipse(g, cx, cy + r * 0.2, r * 0.85, r * 0.42, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.85 });
        if (it.dirty) {
          C.dot(g, cx - r * 0.2, cy + r * 0.15, r * 0.14, '#8A7A5A', s + 'd1');
          C.dot(g, cx + r * 0.25, cy + r * 0.26, r * 0.11, '#8A7A5A', s + 'd2');
        } else if (id === 'spaghetti') {
          for (var q = -1; q <= 1; q++)
            C.arc(g, cx + q * r * 0.2, cy + r * 0.1, r * 0.3, Math.PI, Math.PI * 2, { seed: s + 'n' + q, stroke: '#EFCB6A', lw: 2.2, wob: 0.5, passes: 1 });
          C.dot(g, cx, cy + r * 0.06, r * 0.2, '#C2413F', s + 'mb');
        }
        break;
      case 'cup':
        C.poly(g, [[cx - r * 0.5, cy - r * 0.6], [cx + r * 0.5, cy - r * 0.6],
                   [cx + r * 0.38, cy + r * 0.75], [cx - r * 0.38, cy + r * 0.75]],
          { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.8, wash: 0.75 });
        C.dot(g, cx - r * 0.15, cy + r * 0.45, r * 0.14, PAL.pearl, s + 'b1');
        C.dot(g, cx + r * 0.18, cy + r * 0.5, r * 0.14, PAL.pearl, s + 'b2');
        C.line(g, cx + r * 0.15, cy - r * 0.6, cx + r * 0.35, cy - r * 1.05, { seed: s + 'st', stroke: PAL.sun, lw: 2.6, wob: 0.5 });
        break;
      case 'cone':
        C.poly(g, [[cx - r * 0.4, cy], [cx + r * 0.4, cy], [cx, cy + r * 0.85]],
          { seed: s + 'cn', fill: '#D9A863', stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.8 });
        C.ellipse(g, cx, cy - r * 0.3, r * 0.5, r * 0.45, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.4, wash: 0.82 });
        // each flavor gets its own topping so the three read apart at a glance
        if (it.topping) {
          C.dot(g, cx - r * 0.15, cy - r * 0.45, r * 0.12, it.topping, s + 'tp1');
          C.dot(g, cx + r * 0.2, cy - r * 0.3, r * 0.1, it.topping, s + 'tp2');
        }
        break;
      case 'fish':
        C.ellipse(g, cx + r * 0.1, cy, r * 0.55, r * 0.35, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.8 });
        C.poly(g, [[cx - r * 0.45, cy], [cx - r * 0.85, cy - r * 0.3], [cx - r * 0.85, cy + r * 0.3]],
          { seed: s + 'tl', fill: col, stroke: PAL.outline, lw: 2, hatch: 2.2, wash: 0.8 });
        C.dot(g, cx + r * 0.4, cy - r * 0.08, r * 0.07, PAL.outline, s + 'ey');
        break;
      case 'boot':
        C.poly(g, [[cx - r * 0.3, cy - r * 0.7], [cx + r * 0.15, cy - r * 0.7], [cx + r * 0.15, cy + r * 0.25],
                   [cx + r * 0.65, cy + r * 0.45], [cx + r * 0.6, cy + r * 0.75], [cx - r * 0.3, cy + r * 0.75]],
          { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.8 });
        C.line(g, cx - r * 0.25, cy - r * 0.4, cx + r * 0.1, cy - r * 0.4, { seed: s + 'lc', stroke: PAL.outline, lw: 1.6, wob: 0.4, passes: 1 });
        break;
      case 'tinyufo':
        C.ellipse(g, cx, cy + r * 0.1, r * 0.7, r * 0.25, { seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.4, wash: 0.8 });
        C.arc(g, cx, cy, r * 0.32, Math.PI, Math.PI * 2, { seed: s + 'dm', fill: PAL.dome, stroke: PAL.outline, lw: 1.8, hatch: 2, wash: 0.6 });
        break;
      case 'crystal':
        // three facet tones so it reads as a gem, not a blue blob
        C.poly(g, [[cx, cy - r * 0.9], [cx + r * 0.5, cy - r * 0.1], [cx + r * 0.28, cy + r * 0.8],
                   [cx - r * 0.28, cy + r * 0.8], [cx - r * 0.5, cy - r * 0.1]],
          { seed: s, fill: '#5F7FD6', stroke: PAL.outline, lw: 2.2, hatch: 2.6, wash: 0.8 });
        C.poly(g, [[cx, cy - r * 0.9], [cx + r * 0.5, cy - r * 0.1], [cx, cy + r * 0.1]],
          { seed: s + 'f2', fill: '#8FB5F0', stroke: null, hatch: 2.2, wash: 0.85 });
        C.poly(g, [[cx, cy - r * 0.9], [cx - r * 0.5, cy - r * 0.1], [cx, cy + r * 0.1]],
          { seed: s + 'f3', fill: '#B49AE8', stroke: null, hatch: 2.2, wash: 0.7 });
        C.line(g, cx - r * 0.3, cy - r * 0.4, cx - r * 0.05, cy - r * 0.7,
          { seed: s + 'gl', stroke: PAL.white, lw: 2, wob: 0.3, passes: 1 });
        break;
      case 'surprise':
        // a wobbly pot-luck bowl with googly-eyed steam
        C.arc(g, cx, cy + r * 0.1, r * 0.75, 0, Math.PI, {
          seed: s, fill: col, stroke: PAL.outline, lw: 2.2, hatch: 2.8, wash: 0.75
        });
        C.line(g, cx - r * 0.75, cy + r * 0.1, cx + r * 0.75, cy + r * 0.1,
          { seed: s + 'rim', stroke: PAL.outline, lw: 2.2, wob: 0.6 });
        C.arc(g, cx - r * 0.2, cy - r * 0.3, r * 0.28, Math.PI * 0.2, Math.PI * 1.4,
          { seed: s + 'st1', stroke: '#BBB0A0', lw: 2, wob: 0.8, passes: 1 });
        C.dot(g, cx + r * 0.25, cy - r * 0.45, r * 0.16, PAL.white, s + 'ge');
        C.dot(g, cx + r * 0.28, cy - r * 0.42, r * 0.07, PAL.outline, s + 'gp');
        break;
    }
  }

  /* A baked icon canvas for an item, sized to r. */
  W.itemIcon = function (id, r) {
    r = r || 14;
    var k = id + '|' + r;
    if (!ICONS[k]) {
      var cv = C.offscreen(Math.ceil(r * 2.6), Math.ceil(r * 2.6));
      var g = cv.getContext('2d');
      drawIcon(g, id, r * 1.3, r * 1.3, r);
      ICONS[k] = cv;
    }
    return ICONS[k];
  };

  W.drawItem = function (ctx, id, cx, cy, r) {
    var img = W.itemIcon(id, r || 14);
    ctx.drawImage(img, cx - img.width / 2, cy - img.height / 2);
  };

  // ------------------------------------------------------------- basket

  var MAX = 4;
  W.BASKET_MAX = MAX;

  W.basket = {
    list: function () { return W.game.state.basket; },
    count: function () { return W.game.state.basket.length; },
    full: function () { return W.game.state.basket.length >= MAX; },
    has: function (id) { return W.game.state.basket.indexOf(id) >= 0; },

    add: function (id) {
      var b = W.game.state.basket;
      if (b.length >= MAX) return false;
      b.push(id);
      if (W.audio) W.audio.play('pickup');
      return true;
    },

    remove: function (id) {
      var b = W.game.state.basket;
      var i = b.indexOf(id);
      if (i < 0) return false;
      b.splice(i, 1);
      return true;
    },

    /* Everything of a given kind, e.g. all the ingredients for the stove. */
    ofKind: function (kind) {
      return W.game.state.basket.filter(function (id) { return W.ITEMS[id].kind === kind; });
    }
  };

  /* An actual wicker basket, bottom-left, with the items nestled inside it.
   * The basket art is baked once; item icons blit into its four berths. */
  var basketTile = null;
  function basket() {
    if (basketTile) return basketTile;
    var w = 236, h = 84;
    basketTile = C.offscreen(w, h);
    var g = basketTile.getContext('2d');
    // body
    C.poly(g, [[10, 30], [w - 10, 30], [w - 26, h - 8], [26, h - 8]], {
      seed: 'bk', fill: '#C79A5E', stroke: PAL.outline, lw: 3, hatch: 3.6, wash: 0.8
    });
    // weave
    for (var r = 0; r < 3; r++) {
      C.line(g, 16 + r * 4, 42 + r * 13, w - 16 - r * 4, 42 + r * 13, {
        seed: 'wv' + r, stroke: '#8A5F38', lw: 2, wob: 1, passes: 1, strokeAlpha: 0.7
      });
    }
    for (var v = 0; v < 7; v++) {
      C.line(g, 28 + v * 30, 32, 32 + v * 28, h - 10, {
        seed: 'wvv' + v, stroke: '#8A5F38', lw: 1.8, wob: 0.8, passes: 1, strokeAlpha: 0.5
      });
    }
    // rim + handle
    C.roundRect(g, 6, 22, w - 12, 14, 6, {
      seed: 'rim', fill: '#B5813F', stroke: PAL.outline, lw: 2.8, hatch: 3, wash: 0.85
    });
    C.arc(g, w / 2, 26, 44, Math.PI, Math.PI * 2, {
      seed: 'hdl', stroke: '#8A5F38', lw: 5, wob: 1.4
    });
    return basketTile;
  }

  /* The plate stack beside the basket: stored count, plus a stained stack
   * when there are dirty ones waiting. */
  var plateTiles = {};
  function plateStack(kind) {
    if (plateTiles[kind]) return plateTiles[kind];
    var cv = C.offscreen(56, 46);
    var g = cv.getContext('2d');
    for (var i = 0; i < 3; i++) {
      C.ellipse(g, 28, 34 - i * 7, 21, 8, {
        seed: 'pl' + kind + i, fill: kind === 'dirty' ? '#CFC4AE' : PAL.white,
        stroke: PAL.outline, lw: 2.2, hatch: 2.8, wash: 0.9, fillAlpha: 0.2
      });
    }
    if (kind === 'dirty') {
      C.dot(g, 22, 18, 3.4, '#8A7A5A', 'd1');
      C.dot(g, 34, 21, 2.8, '#8A7A5A', 'd2');
    }
    plateTiles[kind] = cv;
    return cv;
  }

  W.drawBasketBar = function (ctx) {
    var st = W.game.state;
    var b = st.basket;

    if (b.length) {
      var bx = 10, by = 462;
      ctx.drawImage(basket(), bx, by);
      for (var i = 0; i < b.length; i++) {
        W.drawItem(ctx, b[i], bx + 40 + i * 52, by + 42, 16);
      }
      // a wiggling boba badge while a sugar rush is on
      var fx = W.game.bobaFx;
      if (fx) {
        var wig = Math.sin(W.game.t * 9) * 0.2;
        ctx.save();
        ctx.translate(bx + 224, by + 12);
        ctx.rotate(wig);
        W.drawItem(ctx, 'boba', 0, 0, 12);
        ctx.restore();
      }
    }

    // plates live next to the basket area, always visible in the kitchen zone
    var P2 = st.plates;
    if (P2 && (P2.stored + P2.dirty + P2.rack) > 0 && W.game.state.room === 'kitchen') {
      ctx.drawImage(plateStack('clean'), 254, 494);
      C.textCached(ctx, '' + P2.stored, 310, 528, {
        size: 16, color: PAL.outline, outline: 3, outlineColor: PAL.white, seed: 'pst'
      });
      if (P2.dirty > 0) {
        ctx.drawImage(plateStack('dirty'), 334, 494);
        C.textCached(ctx, '' + P2.dirty, 390, 528, {
          size: 16, color: '#8A5A2B', outline: 3, outlineColor: PAL.white, seed: 'pdt'
        });
      }
    }
  };
})(window.W);
