/* Warmland — saving.
 *
 * localStorage is not reliably available on file:// URLs, which is exactly how
 * this game is meant to be opened, so every access is wrapped and there is a
 * copy-paste save code as a fallback that always works.
 */
(function (W) {
  'use strict';

  /* One save slot per hero, so two kids on one computer never clobber
   * each other. Bobby keeps the original key so existing saves load. */
  var BASE = 'warmland.save.v1';
  var KEY = BASE;
  var available = null;

  function keyFor(hero) { return hero && hero !== 'bobby' ? BASE + '.' + hero : BASE; }

  /* Probe once — writing to storage can throw outright in some browsers. */
  function usable() {
    if (available !== null) return available;
    try {
      window.localStorage.setItem(KEY + '.probe', '1');
      window.localStorage.removeItem(KEY + '.probe');
      available = true;
    } catch (e) {
      available = false;
    }
    return available;
  }

  // Only the fields worth persisting; the rest is rebuilt on load.
  var FIELDS = ['hero', 'suit', 'room', 'visited', 'tray', 'held', 'stations', 'lights', 'party',
                'metFriends', 'money', 'day', 'clock', 'crystals', 'meals',
                'platesAway', 'builtTreehouse', 'missions', 'treasures', 'mechForm',
                'plates', 'dropped', 'friendRooms', 'crystalsCarried',
                'ideas', 'firsts', 'mail', 'ideaStickers', 'crystalsFound',
                'weather', 'weatherDay', 'canWater', 'builds', 'shells', 'shellsFound', 'snowBest', 'pets', 'friendship', 'decor', 'saveSalt',
                'ghosts', 'coaster', 'arcade'];

  function pack() {
    var st = W.game.state, out = {};
    FIELDS.forEach(function (k) { out[k] = st[k]; });
    return out;
  }

  function apply(data) {
    var st = W.game.state;
    FIELDS.forEach(function (k) {
      if (data[k] !== undefined) st[k] = data[k];
    });

    /* A save can be hand-edited, half-written, or mangled by another tab.
     * Anything whose SHAPE is wrong reverts to its fresh default — a wonky
     * value must never be able to crash room entry. */
    var fresh = W.game.freshState(st.hero);
    FIELDS.forEach(function (k) {
      var want = fresh[k], got = st[k];
      if (want === undefined || got === undefined) return;
      if (Array.isArray(want) !== Array.isArray(got) ||
          (typeof want !== typeof got && want !== null && got !== null)) {
        st[k] = want;
      }
    });
    if (typeof st.day !== 'number' || !isFinite(st.day) || st.day < 1) st.day = 1;
    if (typeof st.money !== 'number' || !isFinite(st.money) || st.money < 0) st.money = 0;
    if (!W.ROOMS[st.room]) st.room = fresh.room;
    if (!W.SUITS[st.suit]) st.suit = 'none';
    if (st.held && !W.ITEMS[st.held]) st.held = null;
    st.tray = (st.tray || []).filter(function (id) { return !!W.ITEMS[id]; });

    // Saves written before the tray/hands split carried one flat basket.
    if (data.basket && !data.tray) {
      st.tray = [];
      st.held = null;
      var spill = [];
      data.basket.forEach(function (id) {
        if (!W.ITEMS[id]) return;
        if (W.isRaw(id)) {
          if (st.tray.length < W.TRAY_MAX) st.tray.push(id); else spill.push(id);
        } else if (!st.held) {
          st.held = id;
        } else spill.push(id);
      });
      if (spill.length) {
        if (!st.dropped[st.room]) st.dropped[st.room] = [];
        spill.forEach(function (id, i) {
          st.dropped[st.room].push({ id: id, x: 460 + i * 26, y: 400 });
        });
      }
    }
    if (!st.tray) st.tray = [];
    if (st.held === undefined) st.held = null;

    // Saves from before Cracker carried a single pet.
    if (data.pet && !data.pets) {
      st.pets = { mochi: { name: data.pet.name || 'Mochi',
                           home: data.petHome || null,
                           fedDay: data.petFedDay || 0 } };
    }
    if (!st.pets) st.pets = {};
    // saves from before Galaxy was caged had her living in the park from the
    // start; keep her there rather than making them beat the dragon again
    if (st.firsts && st.firsts.castle && st.friendRooms &&
        !st.friendRooms.galaxy && (st.party || []).indexOf('galaxy') < 0) {
      st.friendRooms.galaxy = 'park2';
    }
    if (!st.ghosts) st.ghosts = {};
    if (!st.arcade) st.arcade = {};
    // Unknown friend keys (renames, bad hashes) must not brick room entry.
    if (st.party && W.FRIENDS) {
      st.party = st.party.filter(function (k) { return !!W.FRIENDS[k]; });
    }
    if (st.friendRooms && W.FRIENDS) {
      Object.keys(st.friendRooms).forEach(function (k) {
        if (!W.FRIENDS[k]) delete st.friendRooms[k];
      });
    }

    // Drop station buckets whose key no longer matches any live station, so
    // room edits between saves can't leave orphans accruing forever.
    if (st.stations && W.ROOMS) {
      var valid = {};
      Object.keys(W.ROOMS).forEach(function (rn) {
        (W.ROOMS[rn].stations || []).forEach(function (def, i) {
          valid[rn + ':' + (def.id || def.kind + ':' + i)] = true;
        });
      });
      Object.keys(st.stations).forEach(function (k) {
        if (!valid[k]) delete st.stations[k];
      });
    }
  }

  W.save = {
    supported: usable,

    /* Automatic saves (room change, sleep, station acts) go through here so
     * nothing can clobber an existing save before the player has chosen
     * "start over" or "continue" on the title screen. */
    auto: function () {
      if (!W.game.saveOk) return false;
      // stringify + setItem on every station press stalls the main thread —
      // coalesce to at most one write per second
      var now = Date.now();
      if (W.save._lastAuto && now - W.save._lastAuto < 1000) return true;
      W.save._lastAuto = now;
      var ok = W.save.write();
      if (ok) W.game.savedFlash = 1.4;      // the little "Saved" tick in the HUD
      return ok;
    },

    write: function () {
      if (!usable()) return false;
      try {
        window.localStorage.setItem(KEY, JSON.stringify(pack()));
        return true;
      } catch (e) { return false; }
    },

    read: function () {
      if (!usable()) return null;
      try {
        var raw = window.localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },

    has: function () { return !!W.save.read(); },

    /* Point every read/write at this hero's slot. Called by the title
     * screen the moment a hero is chosen, before any load. */
    setHero: function (hero) { KEY = keyFor(hero); },
    hasFor: function (hero) {
      if (!usable()) return false;
      try { return !!window.localStorage.getItem(keyFor(hero)); } catch (e) { return false; }
    },

    // exposed for the test harness (and any future import path)
    apply: apply,

    load: function () {
      var d = W.save.read();
      if (!d) return false;
      apply(d);
      return true;
    },

    clear: function () {
      if (!usable()) return;
      try { window.localStorage.removeItem(KEY); } catch (e) {}
    },

    /* The fallback: a string the player can keep somewhere safe. */
    exportCode: function () {
      try { return btoa(unescape(encodeURIComponent(JSON.stringify(pack())))); }
      catch (e) { return ''; }
    },

    importCode: function (code) {
      try {
        apply(JSON.parse(decodeURIComponent(escape(atob(code.trim())))));
        return true;
      } catch (e) { return false; }
    }
  };
})(window.W);
