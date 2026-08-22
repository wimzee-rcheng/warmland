/* Warmland — saving.
 *
 * localStorage is not reliably available on file:// URLs, which is exactly how
 * this game is meant to be opened, so every access is wrapped and there is a
 * copy-paste save code as a fallback that always works.
 */
(function (W) {
  'use strict';

  var KEY = 'warmland.save.v1';
  var available = null;

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
  var FIELDS = ['suit', 'room', 'visited', 'basket', 'stations', 'lights', 'party',
                'metFriends', 'money', 'day', 'clock', 'crystals', 'meals',
                'platesAway', 'builtTreehouse', 'missions', 'treasures', 'mechForm',
                'plates', 'dropped', 'friendRooms', 'crystalsCarried',
                'ideas', 'firsts', 'mail', 'ideaStickers', 'crystalsFound',
                'weather', 'weatherDay', 'pet', 'petFedDay', 'friendship', 'decor'];

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
