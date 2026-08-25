/* Warmland — speech bubbles and little effects (hearts, sparkles). */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  /* The bubble frame was the single most expensive thing on screen — two
   * crayon shapes redrawn every frame. Baked per size and blitted instead. */
  var bubbleTiles = {};
  W.bubbleTile = function (w, h, tail) {
    var key = w + 'x' + h + (tail ? 't' : '');
    if (bubbleTiles[key]) return bubbleTiles[key];
    var pad = 26;
    var cv = C.offscreen(w + pad * 2, h + pad * 2);
    var g = cv.getContext('2d');
    if (tail) {
      var tx = pad + w / 2;
      C.poly(g, [[tx - 11, pad + h - 4], [tx + 11, pad + h - 4], [tx + 2, pad + h + 17]], {
        seed: 'tail', fill: PAL.white, stroke: PAL.outline, lw: 2.6, wash: 0.95, fillAlpha: 0.2, hatch: 5
      });
    }
    C.roundRect(g, pad, pad, w, h, 14, {
      seed: 'bub' + key, fill: PAL.white, stroke: PAL.outline, lw: 3,
      wash: 0.94, fillAlpha: 0.18, hatch: 5, wob: 1.2
    });
    bubbleTiles[key] = { img: cv, pad: pad };
    var bk = Object.keys(bubbleTiles);
    if (bk.length > 60) delete bubbleTiles[bk[0]];
    return bubbleTiles[key];
  };

  // ------------------------------------------------------------- dialogue

  var D = {
    text: '', shown: 0, life: 0, active: false, hold: 0, lines: [], color: PAL.outline
  };

  function wrap(ctx, text, size, maxW) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + C.FONT;
    var words = text.split(' ');
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
  }

  /* Pop a speech bubble. It types itself out, then hangs for a beat. */
  W.say = function (text, color) {
    D.text = text;
    D.shown = 0;
    D.active = true;
    D.hold = 0;
    D.lines = null;             // measured lazily, first draw
    D.color = color || PAL.outline;
  };

  W.dialogue = D;

  D.update = function (dt) {
    if (!D.active) return;
    if (D.shown < D.text.length) {
      D.shown += dt * 42;
      if (D.shown > D.text.length) D.shown = D.text.length;
    } else {
      D.hold += dt;
      if (D.hold > 2.4) D.active = false;
    }
  };

  D.skip = function () {
    if (!D.active) return false;
    if (D.shown < D.text.length) { D.shown = D.text.length; return true; }
    // Fully-typed bubbles no longer eat the press — a kid should not need to
    // hit Z twice at every station. The bubble just closes alongside.
    D.active = false;
    return false;
  };

  /* Draw the bubble pointing down at (ax, ay) — usually just above Bobby. */
  D.draw = function (ctx, ax, ay) {
    if (!D.active) return;
    var size = 19, maxW = 300, pad = 15;
    if (!D.lines) {
      D.lines = wrap(ctx, D.text, size, maxW);
      var mw = 0;
      for (var i = 0; i < D.lines.length; i++) {
        mw = Math.max(mw, C.textWidth(ctx, D.lines[i], size));
      }
      D.linesW = mw;
    }
    var wpx = D.linesW;
    var bw = wpx + pad * 2;
    var bh = D.lines.length * (size + 7) + pad * 2 - 6;
    var bx = W.clamp(ax - bw / 2, 12, 960 - bw - 12);
    var by = ay - bh - 22;

    // Round the size so a handful of baked frames covers every bubble.
    var qw = Math.ceil(bw / 12) * 12, qh = Math.ceil(bh / 8) * 8;
    var tile = W.bubbleTile(qw, qh, true);
    ctx.drawImage(tile.img, Math.round(ax - qw / 2 - tile.pad), Math.round(by - tile.pad));
    bx = ax - qw / 2 + (qw - bw) / 2;

    // Typewriter: each line is baked ONCE in full, and the reveal is a cheap
    // rect clip over the blit. Baking a tile per typed prefix used to churn
    // the whole text cache (~a tile per character at 42 chars/sec).
    var budget = Math.floor(D.shown);
    for (var l = 0; l < D.lines.length; l++) {
      var line = D.lines[l];
      var take = W.clamp(budget, 0, line.length);
      budget -= line.length + 1;
      if (take <= 0) break;
      var ly = by + pad + size + l * (size + 7) - 3;
      if (take >= line.length) {
        C.textCached(ctx, line, bx + pad, ly, { size: size, color: D.color, seed: 'ln' + l + line });
      } else {
        var revealW = C.textWidth(ctx, line.slice(0, take), size);
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx + pad - 2, ly - size - 6, revealW + 4, size + 14);
        ctx.clip();
        C.textCached(ctx, line, bx + pad, ly, { size: size, color: D.color, seed: 'ln' + l + line });
        ctx.restore();
      }
    }
  };

  // --------------------------------------------------------------- effects

  var parts = [];

  /* Hearts and stars were being crayon-drawn from scratch every frame, which
   * cost ~3ms each. They're baked to small sprites and blitted instead;
   * sizes are rounded so a handful of tiles covers every particle. */
  var fxTiles = {};
  function fxTile(kind, size, color) {
    var q = Math.max(4, Math.round(size / 3) * 3);
    var key = kind + '|' + q + '|' + color;
    if (!fxTiles[key]) {
      var r = q * 1.6;
      var cv = C.offscreen(Math.ceil(r * 2), Math.ceil(r * 2));
      var g = cv.getContext('2d');
      if (kind === 'heart') C.heart(g, r, r, q, color, 'fxh' + q);
      else C.star(g, r, r, q, color, 'fxs' + q);
      fxTiles[key] = { img: cv, r: r };
    }
    return fxTiles[key];
  }

  W.fx = {
    hearts: function (x, y, n) {
      n = n || 7;
      for (var i = 0; i < n; i++) {
        parts.push({
          kind: 'heart', x: x + (Math.random() - 0.5) * 34, y: y,
          vx: (Math.random() - 0.5) * 46, vy: -52 - Math.random() * 46,
          life: 0, max: 1.5 + Math.random() * 0.6,
          size: 12 + Math.random() * 12, seed: 'h' + i + Math.random()
        });
      }
    },
    dust: function (x, y, n) {
      n = n || 3;
      for (var i = 0; i < n; i++) {
        parts.push({
          kind: 'dust', x: x + (Math.random() - 0.5) * 20, y: y,
          vx: (Math.random() - 0.5) * 40, vy: -8 - Math.random() * 18,
          life: 0, max: 0.4 + Math.random() * 0.25,
          size: 4 + Math.random() * 5, seed: 'd' + i + Math.random()
        });
      }
    },
    steam: function (x, y) {
      parts.push({ kind:'steam', x: x + (Math.random()-0.5)*14, y: y,
        vx:(Math.random()-0.5)*10, vy:-26-Math.random()*14,
        life:0, max:1.1+Math.random()*0.5, size:5+Math.random()*5, seed:'st'+Math.random() });
    },
    bubble: function (x, y) {
      parts.push({ kind:'bubble', x: x + (Math.random()-0.5)*26, y: y,
        vx:(Math.random()-0.5)*22, vy:-30-Math.random()*22,
        life:0, max:0.9+Math.random()*0.5, size:3+Math.random()*5, seed:'bb'+Math.random() });
    },
    breeze: function (x, y) {
      parts.push({ kind:'breeze', x: x, y: y + (Math.random()-0.5)*30,
        vx:-40-Math.random()*50, vy:6+Math.random()*10,
        life:0, max:1.4+Math.random()*0.6, size:8+Math.random()*8, seed:'bz'+Math.random() });
    },
    rain: function (x) {
      if (parts.length > 160) return;
      parts.push({ kind: 'rain', x: x, y: -8, vx: -18, vy: 330,
        life: 0, max: 2, size: 8, seed: 'r' });
    },
    snow: function (x) {
      if (parts.length > 160) return;
      parts.push({ kind: 'snow', x: x, y: -6, vx: (Math.random() - 0.5) * 24, vy: 55,
        life: 0, max: 12, size: 2.4 + Math.random() * 2.2, seed: 's' });
    },
    zzz: function (x, y) {
      parts.push({ kind: 'zzz', x: x + (Math.random() - 0.5) * 16, y: y,
        vx: 8 + Math.random() * 8, vy: -22 - Math.random() * 10,
        life: 0, max: 1.8, size: 10 + Math.random() * 6, seed: 'z' + Math.random() });
    },
    sparkle: function (x, y, n, spread) {
      n = n || 14; spread = spread || 60;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2;
        var sp = 40 + Math.random() * spread;
        parts.push({
          kind: 'star', x: x, y: y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
          life: 0, max: 0.8 + Math.random() * 0.6,
          size: 6 + Math.random() * 9, seed: 's' + i + Math.random()
        });
      }
    },
    update: function (dt) {
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // rain/snow retire HERE — despawning inside draw leaked a ctx.save()
        // per dead drop and progressively dimmed the whole screen
        if ((p.kind === 'rain' || p.kind === 'snow') && p.y > 590) {
          parts.splice(i, 1);
          continue;
        }
        if (p.kind !== 'steam' && p.kind !== 'bubble' && p.kind !== 'breeze' &&
            p.kind !== 'zzz' && p.kind !== 'rain' && p.kind !== 'snow') p.vy += 42 * dt;
        if (p.life >= p.max) parts.splice(i, 1);
      }
    },
    draw: function (ctx) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var k = p.life / p.max;
        ctx.save();
        ctx.globalAlpha = 1 - k * k;
        if (p.kind === 'rain') {
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#8FB5D6';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 2, p.y + p.size);
          ctx.stroke();
        } else if (p.kind === 'snow') {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(p.life * 2) * 8, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'zzz') {
          C.textCached(ctx, 'z', p.x, p.y, {
            size: Math.round(p.size), color: '#8FA8D8',
            outline: 2.4, outlineColor: PAL.white, seed: 'zz' + Math.round(p.size)
          });
        } else if (p.kind === 'steam') {
          ctx.globalAlpha *= 0.45;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * (1 + k * 0.8), p.size * (1 + k * 0.8), 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'bubble') {
          ctx.globalAlpha *= 0.7;
          ctx.strokeStyle = '#8FD0EE';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === 'breeze') {
          ctx.globalAlpha *= 0.4;
          ctx.strokeStyle = '#CFE9F5';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, -0.9, 0.9);
          ctx.stroke();
        } else if (p.kind === 'dust') {
          ctx.globalAlpha *= 0.4;
          ctx.fillStyle = '#B9A88C';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * (1 + k), p.size * 0.6 * (1 + k), 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          var tile = fxTile(p.kind, p.size, p.kind === 'heart' ? PAL.accent : PAL.sun);
          ctx.drawImage(tile.img, p.x - tile.r, p.y - tile.r);
        }
        ctx.restore();
      }
    },
    clear: function () { parts.length = 0; }
  };

  // ------------------------------------------------------------- ui bits

  /* Day, coins and carried crystals — the frame art never changes, so it is
   * baked once per layout variant; the numbers are textCached on top. The
   * old full rebake cost 16-21ms every time a coin changed hands. */
  var hudFrames = {};
  function hudFrame(hasCrystal) {
    var k = hasCrystal ? 1 : 0;
    if (hudFrames[k]) return hudFrames[k];
    var w = 222 + (k ? 74 : 0);
    var cv = C.offscreen(330, 56);
    var g = cv.getContext('2d');
    var x0 = 326 - w;
    C.roundRect(g, x0, 8, w - 6, 40, 12, {
      seed: 'hud' + k, fill: PAL.white, stroke: PAL.outline, lw: 2.4, hatch: 5, wash: 0.88, fillAlpha: 0.2
    });
    C.dot(g, x0 + 24, 28, 10, PAL.sun, 'sun');
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      C.line(g, x0 + 24 + Math.cos(a) * 12, 28 + Math.sin(a) * 12,
                x0 + 24 + Math.cos(a) * 15, 28 + Math.sin(a) * 15,
        { seed: 'ray' + i, stroke: PAL.sun, lw: 2, wob: 0.4, passes: 1 });
    }
    var cx = x0 + 118;
    C.dot(g, cx, 28, 10, '#E8B23D', 'coin');
    C.ellipse(g, cx, 28, 10, 10, { seed: 'coino', stroke: PAL.outline, lw: 2.2, wob: 0.6 });
    if (k) {
      var gx = x0 + 210;
      C.poly(g, [[gx, 16], [gx + 8, 25], [gx + 4, 38], [gx - 4, 38], [gx - 8, 25]], {
        seed: 'hcr', fill: '#7FA8E8', stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.7
      });
    }
    hudFrames[k] = { img: cv, x0: x0 };
    return hudFrames[k];
  }

  W.drawHUD = function (ctx) {
    var G = W.game, st = G.state;
    var f = hudFrame(st.crystalsCarried > 0);
    ctx.drawImage(f.img, 620, 508);
    var bx = 620 + f.x0;
    C.textCached(ctx, 'Day ' + st.day, bx + 42, 543, { size: 17, color: PAL.outline, seed: 'dy' });
    C.textCached(ctx, '' + st.money, bx + 134, 543, { size: 17, color: PAL.outline, seed: 'mv' });
    if (st.crystalsCarried > 0) {
      C.textCached(ctx, '' + st.crystalsCarried, bx + 224, 543, { size: 17, color: PAL.outline, seed: 'cv' });
    }

    if (G.savedFlash > 0) {
      ctx.save();
      ctx.globalAlpha = W.clamp(G.savedFlash, 0, 1);
      C.textCached(ctx, 'Saved \u2713', 560, 542, {
        size: 15, color: PAL.grassDk, outline: 3, outlineColor: PAL.white, seed: 'sv'
      });
      ctx.restore();
    }
  };

  /* A big banner across the middle — baked per (title, sub); only the pop
   * scale and alpha are live. Drawing it live cost 14-20ms per frame. */
  var bannerTiles = {};
  W.drawBanner = function (ctx, title, sub, t, icons) {
    var key = title + '|' + (sub || '') + '|' + ((icons || []).join(','));
    var tile = bannerTiles[key];
    if (!tile) {
      var cv = C.offscreen(560, 156);
      var g = cv.getContext('2d');
      var tall = icons && icons.length;
      C.roundRect(g, 8, 8, 544, tall ? 138 : 108, 18, {
        seed: 'bn', fill: PAL.white, stroke: PAL.outline, lw: 4, hatch: 5, wash: 0.78, fillAlpha: 0.18
      });
      if (tall) {
        // the day's ideas as PICTURES, side by side, for the pre-readers
        var iw = icons.length * 44;
        icons.forEach(function (ic, i2) {
          var img = W.promptIcon(ic);
          if (img) g.drawImage(img, 280 - iw / 2 + i2 * 44 + 9, 108, 30, 30);
        });
      }
      C.text(g, title, 280, 62, {
        size: 44, align: 'center', color: PAL.roof, outline: 5, outlineColor: PAL.outline, seed: 'bt' + title
      });
      if (sub) {
        // long subs (three ideas joined) wrap to two lines inside the card
        var words = sub.split(' ');
        var lines = [], cur = '';
        words.forEach(function (wd) {
          var test = cur ? cur + ' ' + wd : wd;
          if (C.textWidth(g, test, 16) > 540 && cur) { lines.push(cur); cur = wd; }
          else cur = test;
        });
        if (cur) lines.push(cur);
        lines.slice(0, 2).forEach(function (ln, i) {
          C.text(g, ln, 280, 88 + i * 19, {
            size: 16, align: 'center', color: PAL.furDark, seed: 'bs' + i + ln
          });
        });
      }
      tile = bannerTiles[key] = cv;
      var bk = Object.keys(bannerTiles);
      if (bk.length > 20) delete bannerTiles[bk[0]];
    }
    var pop = W.clamp(t * 3, 0, 1);
    ctx.save();
    ctx.translate(480, 250);
    ctx.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
    ctx.globalAlpha = pop * 0.92;      // a touch see-through, less of a wall
    ctx.drawImage(tile, -280, -63);
    ctx.restore();
  };

  /* The little [Z] prompt that appears when Bobby is standing on something. */
  /* The pill is baked per (width-bucket, key, locked) — ~30 tiles total —
   * and the label rides on top via textCached. The old per-label tiles hit
   * ~155 distinct dynamic strings against a 60-cap FIFO and churned at
   * ~10ms a miss. */
  var pillTiles = {};
  var chipTiles = {};
  /* Every key wears its own colour, always — a pre-reader can't tell Z
   * from A by the letter, but "the yellow button" vs "the green button"
   * works at any age. */
  var CHIP_COLORS = {
    Z: PAL.sun, A: '#9CCB6B', X: '#E8A0B4', E: '#C49BE8', T: '#8FB5D6', H: PAL.white
  };
  W.chipColor = function (ch) { return CHIP_COLORS[ch] || PAL.white; };

  function keyChip(ch) {
    if (!chipTiles[ch]) {
      var cv = C.offscreen(28, 24);
      var g = cv.getContext('2d');
      // a WHITE keycap (so it reads as "press this") wearing a bold ring of
      // its own colour — the colour code without losing the button look
      C.roundRect(g, 3, 3, 22, 18, 5, {
        seed: 'chip' + ch, fill: PAL.white,
        stroke: PAL.outline, lw: 2, wash: 0.95, fillAlpha: 0.85, hatch: 3
      });
      C.roundRect(g, 3, 3, 22, 18, 5, {
        seed: 'chipr' + ch, stroke: CHIP_COLORS[ch] || PAL.white,
        lw: 3.2, wob: 0.7, passes: 1
      });
      C.text(g, ch, 14, 17, { size: 14, align: 'center', color: PAL.outline, seed: 'chipt' + ch });
      chipTiles[ch] = cv;
    }
    return chipTiles[ch];
  }
  W.keyChip = keyChip;

  /* Little pictures for prompts: item icons where an item fits, hand-drawn
   * glyphs for ideas that aren't items (sleep, fire, a suit's hat...). */
  var glyphTiles = {};
  function promptIcon(key) {
    if (!key) return null;
    if (W.ITEMS && W.ITEMS[key]) return W.itemIcon(key, 10);
    if (glyphTiles[key] !== undefined) return glyphTiles[key];
    var cv = C.offscreen(26, 26);
    var g = cv.getContext('2d');
    var known = true;
    switch (key) {
      case 'moon':
        C.arc(g, 13, 13, 9, 0, Math.PI * 2, { seed: 'gmo', fill: '#F2E14E', stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.85 });
        C.arc(g, 17, 10, 7, 0, Math.PI * 2, { seed: 'gmo2', fill: '#C4BCAE', stroke: null, hatch: 2.4, wash: 0.9, fillAlpha: 0.9 });
        break;
      case 'star':
        C.star(g, 13, 13, 10, '#F2C14E', 'gst');
        break;
      case 'bubbles':
        C.arc(g, 9, 15, 5, 0, Math.PI * 2, { seed: 'gb1', stroke: '#8FD0EE', lw: 2.2, wob: 0.6 });
        C.arc(g, 17, 9, 4, 0, Math.PI * 2, { seed: 'gb2', stroke: '#8FD0EE', lw: 2, wob: 0.6 });
        C.arc(g, 17, 18, 3, 0, Math.PI * 2, { seed: 'gb3', stroke: '#8FD0EE', lw: 1.8, wob: 0.5 });
        break;
      case 'flame':
        C.poly(g, [[6, 21], [13, 4], [20, 21]], { seed: 'gf1', fill: '#E8834E', stroke: null, hatch: 2.6, wash: 0.9 });
        C.poly(g, [[9, 21], [13, 10], [17, 21]], { seed: 'gf2', fill: '#F2C14E', stroke: null, hatch: 2.4, wash: 0.9 });
        break;
      case 'hammer':
        C.line(g, 8, 20, 17, 7, { seed: 'gh1', stroke: PAL.woodDk, lw: 3.4, wob: 0.6 });
        C.rect(g, 12, 3, 11, 7, { seed: 'gh2', fill: '#B9C3C9', stroke: PAL.outline, lw: 1.8, hatch: 2, wash: 0.85 });
        break;
      case 'tent':
        C.poly(g, [[3, 21], [13, 5], [23, 21]], { seed: 'gt1', fill: '#E8834E', stroke: PAL.outline, lw: 2, hatch: 2.6, wash: 0.85 });
        C.poly(g, [[10, 21], [13, 13], [16, 21]], { seed: 'gt2', fill: '#5A3A20', stroke: null, hatch: 2, wash: 0.9 });
        break;
      case 'heart':
        C.heart(g, 13, 14, 10, PAL.accent, 'ghe');
        break;
      case 'suit:chef':
        C.arc(g, 13, 12, 8, Math.PI, Math.PI * 2, { seed: 'gsc', fill: PAL.white, stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.9, fillAlpha: 0.4 });
        C.rect(g, 6, 12, 14, 6, { seed: 'gsc2', fill: PAL.white, stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.9, fillAlpha: 0.4 });
        break;
      case 'suit:builder':
        C.arc(g, 13, 14, 9, Math.PI, Math.PI * 2, { seed: 'gsb', fill: '#F2C14E', stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.85 });
        C.rect(g, 3, 14, 20, 4, { seed: 'gsb2', fill: '#F2C14E', stroke: PAL.outline, lw: 1.8, hatch: 2.4, wash: 0.85 });
        break;
      case 'suit:racer':
        C.arc(g, 13, 15, 9, Math.PI * 0.9, Math.PI * 2.1, { seed: 'gsr', fill: '#D9604B', stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.85 });
        C.rect(g, 8, 12, 10, 5, { seed: 'gsr2', fill: PAL.dome, stroke: PAL.outline, lw: 1.6, hatch: 2, wash: 0.7 });
        break;
      case 'suit:mech':
        C.rect(g, 6, 6, 14, 14, { seed: 'gsm', fill: '#9AA4AA', stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.85 });
        C.line(g, 13, 6, 13, 1, { seed: 'gsm2', stroke: PAL.outline, lw: 2, wob: 0.5 });
        C.dot(g, 13, 1, 2.4, '#E0455F', 'gsm3');
        break;
      default:
        known = false;
    }
    glyphTiles[key] = known ? cv : null;
    return glyphTiles[key];
  }
  W.promptIcon = promptIcon;

  /* label2/key2: a second action in the same pill ("chat · [X] say Dee"). */
  W.drawPrompt = function (ctx, x, y, label, t, locked, keyChar, key2, label2, icon) {
    keyChar = keyChar || 'Z';
    var iconImg = promptIcon(icon);
    var iconW = iconImg ? 26 : 0;
    var w = C.textWidth(ctx, label, 16) + 46 + iconW;
    if (label2) w += C.textWidth(ctx, label2, 16) + 44;
    var bw = Math.ceil(w / 30) * 30;
    var pk = bw + '|' + keyChar + '|' + (locked ? 1 : 0) + '|' + (icon || '');
    var tile = pillTiles[pk];
    if (!tile) {
      var cv = C.offscreen(bw + 10, 40);
      var g = cv.getContext('2d');
      C.roundRect(g, 5, 6, bw, 28, 10, {
        seed: 'pr' + pk, fill: locked ? '#C4BCAE' : (W.chipColor(keyChar) || PAL.sun),
        stroke: PAL.outline, lw: 2.6, wash: 0.85, fillAlpha: 0.3, hatch: 4
      });
      C.roundRect(g, 12, 12, 20, 16, 4, {
        seed: 'prz' + keyChar, fill: PAL.white,
        stroke: PAL.outline, lw: 2, wash: 0.95, fillAlpha: 0.8, hatch: 3
      });
      C.roundRect(g, 12, 12, 20, 16, 4, {
        seed: 'przr' + keyChar, stroke: W.chipColor(keyChar),
        lw: 2.8, wob: 0.6, passes: 1
      });
      C.text(g, keyChar, 22, 25, { size: 14, align: 'center', color: PAL.outline, seed: 'zz' + keyChar });
      if (iconImg) g.drawImage(iconImg, 36, 8);
      tile = pillTiles[pk] = cv;
    }
    var bob = Math.sin(t * 4) * 3;
    var left = Math.round(x - bw / 2);
    ctx.drawImage(tile, left - 5, Math.round(y - 36 + bob));
    if (label2) {
      // two actions share the pill, each behind its own key chip
      var lw1 = C.textWidth(ctx, label, 16);
      var tx = left + 36 + iconW;
      C.textCached(ctx, label, tx + lw1 / 2, Math.round(y - 11 + bob), {
        size: 16, align: 'center', color: PAL.outline, seed: 'lb' + label
      });
      tx += lw1 + 12;
      ctx.drawImage(keyChip(key2 || 'X'), tx, Math.round(y - 27 + bob));
      C.textCached(ctx, label2, tx + 32 + C.textWidth(ctx, label2, 16) / 2, Math.round(y - 11 + bob), {
        size: 16, align: 'center', color: PAL.outline, seed: 'lb2' + label2
      });
    } else {
      C.textCached(ctx, label, left + 30 + iconW + (bw - 46 - iconW) / 2, Math.round(y - 11 + bob), {
        size: 16, align: 'center', color: PAL.outline, seed: 'lb' + label
      });
    }
  };

  /* The frozen-game card. */
  var pauseTile = null;
  W.drawPauseCard = function (ctx) {
    if (!pauseTile) {
      pauseTile = C.offscreen(400, 130);
      var g = pauseTile.getContext('2d');
      C.roundRect(g, 10, 10, 380, 110, 18, {
        seed: 'pz', fill: PAL.white, stroke: PAL.outline, lw: 4, hatch: 5, wash: 0.94, fillAlpha: 0.2
      });
      C.text(g, 'PAUSED', 200, 66, {
        size: 42, align: 'center', color: PAL.roof, outline: 5, outlineColor: PAL.outline, seed: 'pzt'
      });
      C.text(g, 'press P to keep playing', 200, 100, {
        size: 16, align: 'center', color: PAL.furDark, seed: 'pzs'
      });
    }
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#3B2A20';
    ctx.fillRect(0, 0, 960, 600);
    ctx.restore();
    ctx.drawImage(pauseTile, 280, 220);
  };
})(window.W);
