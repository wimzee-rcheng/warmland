/* Warmland — diving the cave and the wreck.
 *
 * Small single-screen chambers off the underwater map. The crystal glitters
 * at the far end; two or three sharks slowly home in on the submarine. A
 * shark that catches you bumps the hull — never an instant fail — and the
 * treasure only counts once you make it OUT with it.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var SITES = {
    CAVE: {
      name: 'The Crystal Cave', sharks: 2,
      crystal: [820, 140], entry: [110, 500],
      walls: [
        { x: 300, y: 0, w: 90, h: 260 },
        { x: 560, y: 320, w: 110, h: 280 },
        { x: 700, y: 0, w: 60, h: 140 }
      ]
    },
    WRECK: {
      name: 'The Old Wreck', sharks: 3,
      crystal: [850, 470], entry: [110, 120],
      walls: [
        { x: 260, y: 200, w: 320, h: 70 },
        { x: 420, y: 420, w: 80, h: 180 },
        { x: 640, y: 100, w: 70, h: 220 }
      ]
    }
  };

  /* Four kinds of shell to find and fill the treasure book with. */
  var SHELLS = ['scallop', 'conch', 'starshell', 'pearlshell'];
  var shellTiles = {};

  function shellTile(kind) {
    if (!shellTiles[kind]) {
      var cv = C.offscreen(44, 44);
      var g = cv.getContext('2d');
      g.translate(22, 22);
      var col = { scallop: '#F2C9D8', conch: '#F5D9A8', starshell: '#B8CAE8', pearlshell: '#E8EFE4' }[kind];
      if (kind === 'starshell') {
        C.star(g, 0, 0, 15, col, 'sh' + kind);
        C.arc(g, 0, 0, 15, 0, Math.PI * 2, { seed: 'shr' + kind, stroke: PAL.outline, lw: 2, wob: 1.4, passes: 1, strokeAlpha: 0.5 });
      } else if (kind === 'conch') {
        C.poly(g, [[-13, 10], [0, -14], [13, 10]], {
          seed: 'sh' + kind, fill: col, stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.8
        });
        C.arc(g, 0, 2, 8, Math.PI, Math.PI * 2, { seed: 'sh2' + kind, stroke: PAL.outline, lw: 2, wob: 0.7 });
      } else {
        C.arc(g, 0, 8, 15, Math.PI, Math.PI * 2, {
          seed: 'sh' + kind, fill: col, stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.8
        });
        for (var r = -2; r <= 2; r++) {
          C.line(g, 0, 8, r * 6, -6, { seed: 'sr' + kind + r, stroke: PAL.outline, lw: 1.6, wob: 0.5, passes: 1 });
        }
      }
      shellTiles[kind] = cv;
    }
    return shellTiles[kind];
  }

  var octoTiles = null;
  function octoTile(ph) {
    if (!octoTiles) {
      octoTiles = [];
      for (var p = 0; p < 2; p++) {
        var cv = C.offscreen(150, 130);
        var g = cv.getContext('2d');
        g.translate(75, 70);
        for (var a = 0; a < 6; a++) {
          var wob = (p ? 1 : -1) * (a % 2 ? 10 : -10);
          C.arc(g, -46 + a * 18, 26, 22, Math.PI * 0.05, Math.PI * 0.95, {
            seed: 'oa' + a + p, stroke: '#C97FB0', lw: 8, wob: 1.4 + wob * 0.02
          });
        }
        C.ellipse(g, 0, -4, 40, 36, {
          seed: 'ob' + p, fill: '#D98FC4', stroke: PAL.outline, lw: 3.2, hatch: 3.6, wash: 0.78
        });
        C.dot(g, -13, -8, 6, PAL.white, 'oe1' + p);
        C.dot(g, 13, -8, 6, PAL.white, 'oe2' + p);
        C.dot(g, -12, -7, 3, PAL.outline, 'op1' + p);
        C.dot(g, 14, -7, 3, PAL.outline, 'op2' + p);
        C.arc(g, 0, 6, 9, Math.PI * 0.15, Math.PI * 0.85, {
          seed: 'om' + p, stroke: PAL.outline, lw: 2.2, wob: 0.7
        });
        octoTiles[p] = cv;
      }
    }
    return octoTiles[ph];
  }

  var bgs = {}, sharkTile = null;

  function buildBg(key) {
    var site = SITES[key];
    var cv = C.offscreen(960, 600);
    var g = cv.getContext('2d');
    g.drawImage(C.paper(960, 600, 'dive' + key, '#173F63'), 0, 0);
    var rnd = W.mulberry32(W.hash('dive' + key));

    // gloom + drifting motes
    for (var i = 0; i < 7; i++) {
      C.ellipse(g, rnd() * 960, rnd() * 600, 160 + rnd() * 160, 90 + rnd() * 90, {
        seed: 'gl' + i, fill: '#0F2E4C', stroke: null, hatch: 8, wash: 0.3, fillAlpha: 0.3
      });
    }
    for (var mo = 0; mo < 40; mo++) {
      C.dot(g, rnd() * 960, rnd() * 600, 1.4 + rnd() * 2, '#8FD0EE', 'mote' + mo);
    }

    // the rock walls / ship ribs
    site.walls.forEach(function (wl, wi) {
      C.rect(g, wl.x, wl.y, wl.w, wl.h, {
        seed: 'wall' + wi, fill: key === 'WRECK' ? '#6B4A2A' : '#4A5C6E',
        stroke: PAL.outline, lw: 3.4, hatch: 4.4, wash: 0.72
      });
      if (key === 'WRECK') {
        for (var p2 = 0; p2 < 3; p2++) {
          C.line(g, wl.x + 6, wl.y + 14 + p2 * (wl.h / 3.4), wl.x + wl.w - 6, wl.y + 20 + p2 * (wl.h / 3.4), {
            seed: 'plank' + wi + p2, stroke: '#4A3118', lw: 2.4, wob: 1.4, passes: 1
          });
        }
      }
    });

    if (key === 'WRECK') {
      // a porthole and an anchor, for flavour
      C.ellipse(g, 300, 236, 16, 16, { seed: 'ph', stroke: '#C7A34E', lw: 4, wob: 1 });
      C.arc(g, 700, 520, 26, Math.PI * 0.2, Math.PI * 0.8, { seed: 'anc', stroke: '#6E7A82', lw: 6, wob: 1.4 });
    } else {
      for (var cs = 0; cs < 5; cs++) {
        var cx2 = 120 + rnd() * 700, cy2 = 560;
        C.poly(g, [[cx2 - 10, cy2], [cx2 + 10, cy2], [cx2, cy2 - 30 - rnd() * 26]], {
          seed: 'spk' + cs, fill: '#5F7FD6', stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.55
        });
      }
    }

    // the way out, glowing
    var e = site.entry;
    var gr = g.createRadialGradient(e[0], e[1], 10, e[0], e[1], 90);
    gr.addColorStop(0, 'rgba(143,208,238,0.5)');
    gr.addColorStop(1, 'rgba(143,208,238,0)');
    g.fillStyle = gr;
    g.fillRect(e[0] - 90, e[1] - 90, 180, 180);
    C.text(g, 'OUT', e[0], e[1] + 6, {
      size: 18, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'out'
    });
    return cv;
  }

  function shark() {
    if (sharkTile) return sharkTile;
    sharkTile = C.offscreen(150, 80);
    var g = sharkTile.getContext('2d');
    g.translate(75, 40);
    C.poly(g, [[-60, 0], [-30, -16], [30, -18], [58, -2], [30, 16], [-30, 14]], {
      seed: 'shk', fill: '#7A8A94', stroke: PAL.outline, lw: 3, hatch: 3.6, wash: 0.72
    });
    C.poly(g, [[-2, -16], [14, -34], [18, -14]], {
      seed: 'fin', fill: '#5C6A74', stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.75
    });
    C.poly(g, [[-60, 0], [-78, -14], [-78, 14]], {
      seed: 'tail', fill: '#5C6A74', stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.75
    });
    C.dot(g, 38, -6, 3.4, PAL.outline, 'eye');
    C.arc(g, 40, 6, 10, Math.PI * 0.1, Math.PI * 0.7, { seed: 'grin', stroke: PAL.outline, lw: 2.2, wob: 0.6, passes: 1 });
    for (var t2 = 0; t2 < 3; t2++) {
      C.poly(g, [[30 + t2 * 6, 8], [34 + t2 * 6, 8], [32 + t2 * 6, 13]], {
        seed: 'tooth' + t2, fill: PAL.white, stroke: null, wash: 0.95, hatch: 2
      });
    }
    return sharkTile;
  }

  var S = {
    site: null, key: '', bg: null,
    x: 0, y: 0, vx: 0, vy: 0, face: 1, t: 0, lock: 0,
    hull: 4, invuln: 0, hasCrystal: false, sharks: [], shake: 0
  };

  function hitsWall(x, y) {
    if (x < 50 || x > 910 || y < 50 || y > 560) return true;
    for (var i = 0; i < S.site.walls.length; i++) {
      var wl = S.site.walls[i];
      if (x > wl.x - 24 && x < wl.x + wl.w + 24 && y > wl.y - 16 && y < wl.y + wl.h + 16) return true;
    }
    return false;
  }

  S.enter = function (p) {
    S.key = (p && p.site) || 'CAVE';
    S.site = SITES[S.key];
    if (!bgs[S.key]) bgs[S.key] = buildBg(S.key);
    S.bg = bgs[S.key];
    S.x = S.site.entry[0]; S.y = S.site.entry[1];
    S.vx = 0; S.vy = 0; S.face = 1; S.t = 0; S.lock = 0.3;
    S.hull = 4; S.invuln = 0; S.shake = 0;
    S.hasCrystal = false;
    S.left = false;
    S.movedAway = false;
    // one crystal per site per DAY — permanent depletion made revisits sad
    S.taken = !!W.game.state.treasures['dive:' + S.key + ':' + W.game.state.day];

    // the hunting party spawns far from the door
    S.sharks = [];
    var rnd = W.mulberry32(W.hash('sharks' + S.key));
    for (var i = 0; i < S.site.sharks; i++) {
      S.sharks.push({
        x: 500 + rnd() * 380, y: 100 + rnd() * 400,
        vx: 0, vy: 0, face: 1, back: 0,
        // one real chaser; the others cruise, so a small pilot can think
        speed: [70, 42, 46][i % 3]
      });
    }
    // three shells per site per day, in the same spots all day long
    var srnd = W.mulberry32(W.hash('shells' + S.key + W.game.state.day));
    // a bitmask of taken shells, so the RIGHT ones stay gone on a revisit
    var got = W.game.state.treasures['shells:' + S.key + ':' + W.game.state.day] || 0;
    if (got === true) got = 7;               // a pre-bitmask save: call it all three
    S.shells = [];
    for (var sc = 0; sc < 3; sc++) {
      var sx0, sy0, tries = 0;
      do {
        sx0 = 120 + srnd() * 740;
        sy0 = 100 + srnd() * 420;
        tries++;
      } while (hitsWall(sx0, sy0) && tries < 30);
      S.shells.push({ x: sx0, y: sy0, idx: sc,
                      kind: SHELLS[Math.floor(srnd() * SHELLS.length)],
                      taken: !!(got & (1 << sc)) });
    }
    S.octopus = S.key === 'WRECK' ? { x: 160, y: 460, t: 0 } : null;
    S.tradedToday = W.game.state.treasures['octo:' + W.game.state.day] === true;

    if (W.drawSub.warm) W.drawSub.warm();
    W.say(S.taken ? 'Just fish in here now... and sharks!'
                  : 'The crystal is deep inside. Watch for sharks!', '#8FD0EE');
  };

  S.update = function (dt) {
    var G = W.game;
    S.t += dt;
    S.lock = Math.max(0, S.lock - dt);
    if (S.invuln > 0) S.invuln -= dt;
    if (S.shake > 0) S.shake -= dt;
    W.dialogue.update(dt);
    W.fx.update(dt);

    // ---- drive the sub
    var ax = 0, ay = 0;
    if (!S.lock) { var a = W.input.axis(); ax = a[0]; ay = a[1]; }
    S.vx += ax * 480 * dt;
    S.vy += ay * 480 * dt;
    S.vx -= S.vx * 3 * dt;
    S.vy -= S.vy * 3 * dt;
    var sp = Math.hypot(S.vx, S.vy);
    if (sp > 210) { S.vx = S.vx / sp * 210; S.vy = S.vy / sp * 210; }
    var nx = S.x + S.vx * dt, ny = S.y + S.vy * dt;
    if (!hitsWall(nx, S.y)) S.x = nx; else S.vx *= -0.4;
    if (!hitsWall(S.x, ny)) S.y = ny; else S.vy *= -0.4;
    if (Math.abs(S.vx) > 24) S.face = S.vx > 0 ? 1 : -1;

    if (Math.random() < dt * 2) W.fx.bubble(S.x - S.face * 40, S.y);

    // ---- sharks slowly close in
    for (var i = 0; i < S.sharks.length; i++) {
      var sh = S.sharks[i];
      if (sh.back > 0) {
        sh.back -= dt;                       // retreating after a bite
        sh.x += sh.vx * dt; sh.y += sh.vy * dt;
      } else {
        var dx = S.x - sh.x, dy = S.y - sh.y;
        var d = Math.hypot(dx, dy) || 1;
        var wig = Math.sin(S.t * 2.2 + i * 2) * 26;
        sh.vx = (dx / d) * sh.speed;
        sh.vy = (dy / d) * sh.speed + wig * dt * 12;
        sh.x += sh.vx * dt; sh.y += sh.vy * dt;
        if (Math.abs(sh.vx) > 6) sh.face = sh.vx > 0 ? 1 : -1;

        if (d < 52 && S.invuln <= 0) {
          // chomp! never fatal on its own — just hull and drama
          S.hull--;
          S.invuln = 1.6;
          S.shake = 0.4;
          sh.back = 1.4;
          sh.vx = -(dx / d) * 150;
          sh.vy = -(dy / d) * 150;
          if (W.audio) W.audio.play('bite');
          if (S.hull <= 0) {
            G.showBanner('The sub needs repairs!', 'Back to open water...');
            G.fadeTo('vehicle', { vehicle: 'submarine', map: 'underwater' });
            return;
          }
          W.say(['Yikes! A shark bump!', 'Ouch — the hull!', 'Too close!!'][Math.floor(Math.random() * 3)]);
        }
      }
      sh.x = W.clamp(sh.x, 60, 900);
      sh.y = W.clamp(sh.y, 60, 550);
    }

    // ---- the crystal and the way out
    var cr = S.site.crystal;
    S.atCrystal = !S.taken && !S.hasCrystal && Math.hypot(S.x - cr[0], S.y - cr[1]) < 52;
    var entryDist = Math.hypot(S.x - S.site.entry[0], S.y - S.site.entry[1]);
    if (entryDist > 95) S.movedAway = true;      // spawn == exit; don't offer
    S.atExit = S.movedAway && entryDist < 62;    // "Leave" before they even move

    // ---- shells and the octopus
    S.atShell = null;
    for (var sq = 0; sq < S.shells.length; sq++) {
      var shl = S.shells[sq];
      if (shl.taken) continue;
      if (Math.hypot(S.x - shl.x, S.y - shl.y) < 48) { S.atShell = shl; break; }
    }
    S.atOcto = !!(S.octopus && Math.hypot(S.x - S.octopus.x, S.y - S.octopus.y) < 90);
    if (S.octopus) S.octopus.t += dt;

    if (W.input.hit('talk') && S.atOcto) {
      W.say(['Blub! Hello, little sub.', 'Bloop bloop! *waves four arms*',
             'Trix trix, says the octopus.'][Math.floor(Math.random() * 3)], '#D98FC4');
      W.fx.hearts(S.octopus.x, S.octopus.y - 60, 3);
    }

    if (W.input.hit('act')) {
      if (W.dialogue.skip()) { /* consumed */ }
      else if (S.atShell) {
        S.atShell.taken = true;
        var key = 'shells:' + S.key + ':' + G.state.day;
        var mask = G.state.treasures[key];
        if (mask === true) mask = 7;
        G.state.treasures[key] = (mask || 0) | (1 << S.atShell.idx);
        G.state.shells = (G.state.shells || 0) + 1;
        G.state.shellsFound[S.atShell.kind] = (G.state.shellsFound[S.atShell.kind] || 0) + 1;
        W.fx.sparkle(S.atShell.x, S.atShell.y, 10, 50);
        W.say('A ' + S.atShell.kind + '! For the treasure book.', '#F2C9D8');
        G.first('shell', 'First seashell!');
        if (W.audio) W.audio.play('chime');
      } else if (S.atOcto && !S.tradedToday) {
        if ((G.state.shells || 0) < 1) {
          W.say('The octopus points at your empty net. Find a shell first!');
        } else {
          G.state.shells--;
          S.tradedToday = true;
          G.state.treasures['octo:' + G.state.day] = true;
          var traded = W.findCrystal('octo' + G.state.day);
          W.fx.sparkle(S.octopus.x, S.octopus.y - 40, 18, 90);
          W.say('A shell for a ' + traded.name + '! What a deal.', traded.color);
          G.first('cry-' + traded.name, 'Found a ' + traded.name + '!');
          if (W.audio) W.audio.play('chime');
        }
      } else if (S.atCrystal) {
        S.hasCrystal = true;
        W.fx.sparkle(cr[0], cr[1], 18, 90);
        W.say('Got it! Now get OUT!', '#8FD0EE');
        if (W.audio) W.audio.play('chime');
      } else if (S.atExit) {
        leave();
      }
    }
    if (W.input.hit('back')) leave();

    function leave() {
      if (S.left) return;              // Z+X on one frame banked the crystal twice
      S.left = true;
      if (S.hasCrystal) {
        var cry = W.findCrystal('dive' + S.key + G.state.day);
        G.state.treasures['dive:' + S.key + ':' + G.state.day] = true;
        G.idea('crystal');
        G.first('crystal', 'First crystal!');
        G.first('cry-' + cry.name, 'Found a ' + cry.name + '!');
        W.say('Made it out with a ' + cry.name + '!', cry.color);
      }
      G.fadeTo('vehicle', { vehicle: 'submarine', map: 'underwater' });
    }
  };

  S.draw = function (ctx) {
    var G = W.game;
    ctx.save();
    if (S.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    ctx.drawImage(S.bg, 0, 0);

    // the prize
    if (!S.taken && !S.hasCrystal) {
      var cr = S.site.crystal;
      var pulse = 0.7 + 0.3 * Math.sin(S.t * 3);
      ctx.save();
      ctx.globalAlpha = pulse;
      W.drawItem(ctx, 'crystal', cr[0], cr[1], 22);
      ctx.restore();
      if (!S.starTile) {
        S.starTile = C.offscreen(18, 18);
        C.star(S.starTile.getContext('2d'), 9, 9, 6, PAL.white, 'crtw');
      }
      ctx.drawImage(S.starTile, cr[0] + 9, cr[1] - 25);
    }

    // shells waiting to be found
    for (var sq2 = 0; sq2 < S.shells.length; sq2++) {
      var shl2 = S.shells[sq2];
      if (shl2.taken) continue;
      var sway = Math.sin(S.t * 1.6 + sq2) * 3;
      ctx.drawImage(shellTile(shl2.kind), shl2.x - 22, shl2.y - 22 + sway);
    }

    // the octopus, waving
    if (S.octopus) {
      ctx.drawImage(octoTile(Math.floor(S.t * 1.6) % 2), S.octopus.x - 75, S.octopus.y - 70);
    }

    // sharks
    var st2 = shark();
    for (var i = 0; i < S.sharks.length; i++) {
      var sh = S.sharks[i];
      var bob = Math.sin(S.t * 2 + i * 2) * 4;
      ctx.save();
      ctx.translate(sh.x, sh.y + bob);
      ctx.scale(sh.face, 1);
      ctx.drawImage(st2, -75, -40);
      ctx.restore();
    }

    // the sub (flashing while invulnerable)
    if (!(S.invuln > 0 && Math.sin(S.t * 40) > 0)) {
      W.drawSub(ctx, S.x, S.y, 0.8, S.t, S.face < 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(S.x - 16, S.y - 26, 32, 28);
      ctx.clip();
      W.drawChar(ctx, S.x, S.y + 8, {
        char: W.heroChar(), suit: G.state.suit, dir: 'down', t: G.t, scale: 0.24, noShadow: true
      });
      ctx.restore();
    }
    if (S.hasCrystal) W.drawItem(ctx, 'crystal', S.x, S.y - 42, 11);

    W.fx.draw(ctx);

    W.drawHealthBar(ctx, 20, 20, 200, S.hull / 4,
      S.invuln > 0.8 ? '#E0455F' : '#8FD0EE', 'Hull');   // flashes red on a bite
    C.textCached(ctx, S.site.name, 480, 40, {
      size: 22, align: 'center', color: PAL.white, outline: 3.4, outlineColor: PAL.outline, seed: 'dn' + S.key
    });

    if (S.atShell) W.drawPrompt(ctx, S.x, S.y + 56, 'Collect the shell!', S.t);
    else if (S.atOcto) {
      W.drawPrompt(ctx, S.x, S.y + 56,
        S.tradedToday ? 'The octopus waves back' : 'Trade a shell for a crystal',
        S.t, S.tradedToday, 'Z', 'A', 'say hello');
    }
    else if (S.atCrystal) W.drawPrompt(ctx, S.x, S.y + 56, 'Grab the crystal!', S.t);
    else if (S.atExit) W.drawPrompt(ctx, S.x, S.y + 56, S.hasCrystal ? 'Escape!' : 'Leave', S.t);

    if (G.state.shells) {
      C.textCached(ctx, 'Shells: ' + G.state.shells, 20, 70, {
        size: 18, color: '#F2C9D8', outline: 3, outlineColor: PAL.outline, seed: 'shc' + G.state.shells
      });
    }

    C.textCached(ctx, 'arrows swim  ·  Z grab  ·  X leave', 480, 578, {
      size: 15, align: 'center', color: PAL.white, outline: 3, outlineColor: PAL.outline, seed: 'dh'
    });
    ctx.restore();
    W.dialogue.draw(ctx, W.clamp(S.x, 200, 760), Math.max(S.y - 70, 190));
  };

  W.sceneDive = S;
})(window.W);
