/* Warmland — things left on the floor.
 *
 * Dropping is the gentle inventory valve: put an item down anywhere, it stays
 * in that room (and in the save), pick it back up whenever. The trash can is
 * the destructive option; this one is reversible.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;
  var MAX_PER_ROOM = 10;

  function list(room) {
    var d = W.game.state.dropped;
    if (!d[room]) d[room] = [];
    return d[room];
  }

  W.dropped = {
    list: list,

    /* Put the LAST basket item down at (x, y). */
    drop: function (room, x, y) {
      var b = W.game.state.basket;
      if (!b.length) return null;
      var id = b.pop();
      var l = list(room);
      l.push({ id: id, x: Math.round(x + (W.mulberry32(W.hash(room + l.length))() - 0.5) * 18),
               y: Math.round(y + 6) });
      if (l.length > MAX_PER_ROOM) {
        var gone = l.shift();               // oldest fades away
        W.fx.sparkle(gone.x, gone.y - 10, 6, 30);
      }
      if (W.audio) W.audio.play('clack');
      return id;
    },

    /* Pick a specific entry back up. */
    take: function (room, entry) {
      if (W.basket.full()) return false;
      var l = list(room);
      var i = l.indexOf(entry);
      if (i < 0) return false;
      l.splice(i, 1);
      W.basket.add(entry.id);
      return true;
    },

    /* Nearest floor item within reach of (x, y), or null. */
    nearest: function (room, x, y, radius) {
      var l = list(room);
      var best = null, bd = radius || 42;
      for (var i = 0; i < l.length; i++) {
        var d = Math.hypot(l[i].x - x, l[i].y - y);
        if (d < bd) { bd = d; best = l[i]; }
      }
      return best;
    },

    /* Floor items join the room's depth sort as little glowing icons. */
    draw: function (ctx, room, t) {
      var l = list(room);
      for (var i = 0; i < l.length; i++) {
        var e = l[i];
        var bob = Math.sin(t * 2.4 + i) * 2;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = PAL.sun;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + 6, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        W.drawItem(ctx, e.id, e.x, e.y - 8 + bob, 13);
      }
    }
  };
})(window.W);
