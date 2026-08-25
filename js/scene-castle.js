/* Warmland 2 — the castle.
 *
 * A side-scrolling romp for the older brother: pick Knight, Archer or
 * Wizard, fight through skeletons and trolls, beat the dragon and free
 * Galaxy from the dungeon. Come back another day and there is treasure
 * where the cage was.
 *
 * Never a fail state: running out of hearts walks you back to the last
 * checkpoint flag with a full set, and X leaves at any moment.
 *
 * Everything is baked — the stone backdrop is one long canvas, enemies
 * and the dragon are phase tiles, the hero rides the normal drawChar
 * cache with a class prop blitted over the top.
 */
(function (W) {
  'use strict';

  var C = W.crayon, PAL = W.PAL;

  var WORLD_W = 3200, GROUND = 470;
  var GRAV = 1500, JUMP_V = -560;

  var CLASSES = {
    knight: { name: 'KNIGHT', sub: 'A big sword and a big shield', color: '#B9C3C9',
              reach: 74, cool: 0.34, dmg: 1 },
    archer: { name: 'ARCHER', sub: 'Shoot arrows from far away',   color: '#6FA84B',
              reach: 0,  cool: 0.42, dmg: 1 },
    wizard: { name: 'WIZARD', sub: 'Sparkly bolts that go through', color: '#B48FD6',
              reach: 0,  cool: 0.6,  dmg: 1 }
  };
  var CLASS_ORDER = ['knight', 'archer', 'wizard'];

  var S = { t: 0 };
  var backdrop = null, tiles = {};

  // ------------------------------------------------------------- the art

  /* One long baked castle interior: floor, pillars, arches, torches. */
  function buildBackdrop() {
    var cv = C.paper(WORLD_W, 600, 'castlepaper', '#4A4658');
    var g = cv.getContext('2d');
    var rnd = W.mulberry32(W.hash('castle'));

    // back wall of big blocks
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < WORLD_W / 110; c++) {
        var bx = c * 110 + (r % 2) * 55, by = 60 + r * 62;
        C.rect(g, bx, by, 106, 58, {
          seed: 'blk' + r + c, fill: r % 2 ? '#5A5668' : '#635E72', stroke: '#3A3646',
          lw: 2.4, hatch: 6, wash: 0.4, fillAlpha: 0.5
        });
      }
    }
    // arches and pillars
    for (var p = 0; p < WORLD_W / 420; p++) {
      var px = 160 + p * 420;
      C.rect(g, px, 120, 46, GROUND - 120, {
        seed: 'pil' + p, fill: '#7A7488', stroke: '#3A3646', lw: 3.4, hatch: 5, wash: 0.55
      });
      C.arc(g, px + 23, 130, 78, Math.PI, Math.PI * 2, {
        seed: 'arch' + p, stroke: '#7A7488', lw: 9, wob: 2, passes: 1, strokeAlpha: 0.7
      });
      // a torch on the pillar
      C.line(g, px + 60, 240, px + 74, 226, { seed: 'tst' + p, stroke: '#8A5F38', lw: 5, wob: 0.8 });
      C.poly(g, [[px + 66, 226], [px + 82, 226], [px + 74, 196]], {
        seed: 'tfl' + p, fill: '#E8834E', stroke: null, hatch: 3, wash: 0.9
      });
      C.poly(g, [[px + 70, 224], [px + 78, 224], [px + 74, 206]], {
        seed: 'tfl2' + p, fill: '#F2C14E', stroke: null, hatch: 2.6, wash: 0.9
      });
      var gr = g.createRadialGradient(px + 74, 214, 6, px + 74, 214, 120);
      gr.addColorStop(0, 'rgba(255,190,110,0.30)');
      gr.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = gr;
      g.fillRect(px - 46, 94, 240, 240);
    }
    // the floor
    C.rect(g, -6, GROUND, WORLD_W + 12, 600 - GROUND, {
      seed: 'flr', fill: '#6E6A7C', stroke: null, hatch: 5, wash: 0.55, fillAlpha: 0.75
    });
    C.line(g, -6, GROUND, WORLD_W + 12, GROUND, { seed: 'flrl', stroke: '#332F3E', lw: 5, wob: 2 });
    for (var f = 0; f < WORLD_W / 96; f++) {
      C.line(g, f * 96, GROUND, f * 96 - 16, 600, {
        seed: 'flrs' + f, stroke: '#332F3E', lw: 2, wob: 1.4, passes: 1, strokeAlpha: 0.4
      });
    }
    // scattered rubble
    for (var d = 0; d < 40; d++) {
      C.dot(g, rnd() * WORLD_W, GROUND + 10 + rnd() * 90, 3 + rnd() * 5, '#565266', 'rub' + d);
    }
    return cv;
  }

  function tile(key, w, h, painter) {
    if (!tiles[key]) {
      var cv = C.offscreen(w, h);
      painter(cv.getContext('2d'));
      tiles[key] = cv;
    }
    return tiles[key];
  }

  function heartTile(full) {
    return tile('heart' + (full ? 1 : 0), 34, 34, function (g) {
      C.heart(g, 17, 17, 14, full ? '#E0455F' : '#5A5668', 'hh' + full);
    });
  }
  function cardTile(on) {
    return tile('card' + (on ? 1 : 0), 248, 258, function (g) {
      C.roundRect(g, 4, 4, 240, 250, 18, {
        seed: 'cc' + (on ? 'a' : 'b'),
        fill: on ? PAL.white : '#4A4658', stroke: on ? PAL.sun : PAL.outline,
        lw: on ? 6 : 3, hatch: 5, wash: 0.85, fillAlpha: on ? 0.3 : 0.5
      });
    });
  }
  function veilTile() {
    return tile('veil', 8, 8, function (g) {
      g.fillStyle = '#241640';
      g.fillRect(0, 0, 8, 8);
    });
  }
  function platTile() {
    return tile('plat', 200, 24, function (g) {
      C.rect(g, 1, 1, 198, 20, {
        seed: 'plat', fill: '#8A7F94', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
      });
    });
  }
  function flagTile(lit) {
    return tile('flag' + (lit ? 1 : 0), 48, 84, function (g) {
      C.line(g, 4, 80, 4, 6, { seed: 'cpf', stroke: '#8A5F38', lw: 4, wob: 0.8 });
      C.poly(g, [[4, 6], [38, 16], [4, 26]], {
        seed: 'cpfl' + lit, fill: lit ? '#6FA84B' : '#9A9AA8',
        stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.85
      });
    });
  }
  function dungeonTile() {
    return tile('dung', 160, 180, function (g) {
      C.rect(g, 5, 5, 150, 170, {
        seed: 'dung', fill: '#3E3A4C', stroke: PAL.outline, lw: 4, hatch: 5, wash: 0.7
      });
    });
  }
  function cageTile() {
    return tile('cage', 116, 132, function (g) {
      for (var b = 0; b < 5; b++) {
        C.line(g, 8 + b * 23, 8, 8 + b * 23, 128, { seed: 'cage' + b, stroke: '#C9C3CF', lw: 4, wob: 0.8 });
      }
      C.line(g, 4, 8, 112, 8, { seed: 'cagetop', stroke: '#C9C3CF', lw: 5, wob: 0.8 });
    });
  }
  function chestTile() {
    return tile('chest', 90, 90, function (g) {
      C.roundRect(g, 11, 30, 68, 50, 8, {
        seed: 'chest', fill: '#8A5F38', stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.8
      });
      C.rect(g, 11, 52, 68, 10, {
        seed: 'chestb', fill: '#F2C14E', stroke: PAL.outline, lw: 2.4, hatch: 2.6, wash: 0.85
      });
      C.star(g, 45, 12, 12, PAL.sun, 'chsp');
    });
  }
  function fireTile() {
    return tile('fire', 32, 32, function (g) {
      C.dot(g, 16, 16, 13, '#E8834E', 'fb');
      C.dot(g, 16, 16, 7, '#F2C14E', 'fbi');
    });
  }
  function arrowTile() {
    return tile('arrow', 56, 16, function (g) {
      C.line(g, 2, 8, 30, 8, { seed: 'arw', stroke: '#8A5F38', lw: 3.4, wob: 0.4, passes: 1 });
      C.poly(g, [[30, 3], [40, 8], [30, 13]], {
        seed: 'arwh', fill: '#B9C3C9', stroke: null, hatch: 2, wash: 0.9
      });
    });
  }
  /* The bow, with its string drawn back a little further each pose. */
  function bowTile(pull) {
    return tile('bow' + pull, 60, 100, function (g) {
      var back = 23 - pull * 11;                   // string knuckle, pulled in
      C.arc(g, 12, 50, 38, Math.PI * 1.6, Math.PI * 0.4, {
        seed: 'bow', stroke: '#8A5F38', lw: 5, wob: 0.9
      });
      C.line(g, 23, 14, back, 50, { seed: 'bs1' + pull, stroke: PAL.white, lw: 2, wob: 0.4, passes: 1 });
      C.line(g, back, 50, 23, 86, { seed: 'bs2' + pull, stroke: PAL.white, lw: 2, wob: 0.4, passes: 1 });
      if (pull) {
        // the nocked arrow, riding the string
        C.line(g, back, 50, back + 34, 50, {
          seed: 'nock' + pull, stroke: '#8A5F38', lw: 3.4, wob: 0.4, passes: 1
        });
        C.poly(g, [[back + 34, 45], [back + 46, 50], [back + 34, 55]], {
          seed: 'nockh' + pull, fill: '#B9C3C9', stroke: null, hatch: 2, wash: 0.9
        });
      }
    });
  }

  /* The wand: a stick with a star that flares as it casts. */
  function wandTile(lit) {
    return tile('wand' + lit, 34, 66, function (g) {
      C.line(g, 17, 62, 17, 20, { seed: 'wnd', stroke: '#6B4A2A', lw: 5, wob: 0.7 });
      C.dot(g, 17, 52, 4, '#F2C14E', 'wgrip');
      C.star(g, 17, 15, lit ? 15 : 10, lit ? '#F2E14E' : '#D8BFF2', 'wstar' + lit);
      if (lit) C.star(g, 17, 15, 8, PAL.white, 'wstari');
    });
  }

  function boltTile() {
    return tile('bolt', 30, 30, function (g) { C.star(g, 15, 15, 11, '#D8BFF2', 'wbolt'); });
  }
  function frostTile() {
    return tile('frost', 34, 34, function (g) {
      for (var a = 0; a < 3; a++) {
        var an = a * Math.PI / 3;
        C.line(g, 17 - Math.cos(an) * 14, 17 - Math.sin(an) * 14,
                  17 + Math.cos(an) * 14, 17 + Math.sin(an) * 14, {
          seed: 'fk' + a, stroke: '#8FD0EE', lw: 4, wob: 0.6
        });
        C.line(g, 17 + Math.cos(an) * 9 - 4, 17 + Math.sin(an) * 9 - 4,
                  17 + Math.cos(an) * 14, 17 + Math.sin(an) * 14, {
          seed: 'fkb' + a, stroke: '#BFE8FF', lw: 2.4, wob: 0.5, passes: 1
        });
      }
      C.dot(g, 17, 17, 5, PAL.white, 'fkc');
    });
  }
  /* A block of ice over anything the frost caught. */
  function iceTile() {
    return tile('ice', 76, 100, function (g) {
      C.poly(g, [[10, 96], [4, 30], [22, 6], [54, 4], [72, 34], [66, 96]], {
        seed: 'ice', fill: '#BFE8FF', stroke: '#7FB8E0', lw: 3,
        hatch: 4, wash: 0.5, fillAlpha: 0.45
      });
      C.line(g, 26, 16, 20, 88, { seed: 'ic1', stroke: PAL.white, lw: 3, wob: 1, passes: 1, strokeAlpha: 0.7 });
      C.line(g, 52, 12, 58, 84, { seed: 'ic2', stroke: PAL.white, lw: 2.4, wob: 1, passes: 1, strokeAlpha: 0.6 });
    });
  }
  /* One soft mote, scaled down the wizard's trail. */
  function motTile() {
    return tile('mote', 24, 24, function (g) { C.star(g, 12, 12, 10, '#E8D8FF', 'mote'); });
  }

  function wardTile() {
    return tile('ward', 92, 92, function (g) {
      C.arc(g, 46, 46, 40, 0, Math.PI * 2, {
        seed: 'ward', stroke: '#B48FD6', lw: 5, wob: 2, passes: 1
      });
    });
  }

  function skeletonTile(frame) {
    return tile('sk' + frame, 60, 90, function (g) {
      g.translate(30, 84);
      var sw = frame ? 4 : -4;
      // legs
      for (var l = -1; l <= 1; l += 2) {
        C.line(g, l * 7, -30, l * 9 + sw * l, -2, { seed: 'skl' + l + frame, stroke: '#E4E0D4', lw: 5, wob: 0.7 });
      }
      // ribs
      C.rect(g, -13, -58, 26, 30, {
        seed: 'skr' + frame, fill: '#E4E0D4', stroke: PAL.outline, lw: 2.4, hatch: 3, wash: 0.85, fillAlpha: 0.5
      });
      for (var rb = 0; rb < 3; rb++) {
        C.line(g, -12, -52 + rb * 9, 12, -52 + rb * 9, {
          seed: 'skrb' + rb + frame, stroke: PAL.outline, lw: 1.6, wob: 0.5, passes: 1
        });
      }
      // arms
      C.line(g, -13, -52, -24 - sw, -34, { seed: 'ska1' + frame, stroke: '#E4E0D4', lw: 4, wob: 0.7 });
      C.line(g, 13, -52, 24 + sw, -34, { seed: 'ska2' + frame, stroke: '#E4E0D4', lw: 4, wob: 0.7 });
      // skull
      C.ellipse(g, 0, -72, 15, 14, {
        seed: 'sks' + frame, fill: '#F2EEE2', stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.85
      });
      C.dot(g, -5, -74, 3.4, PAL.outline, 'ske1' + frame);
      C.dot(g, 5, -74, 3.4, PAL.outline, 'ske2' + frame);
      C.line(g, -6, -64, 6, -64, { seed: 'skm' + frame, stroke: PAL.outline, lw: 1.6, wob: 0.5, passes: 1 });
    });
  }

  function trollTile(frame) {
    return tile('tr' + frame, 96, 120, function (g) {
      g.translate(48, 112);
      var sw = frame ? 5 : -5;
      for (var l = -1; l <= 1; l += 2) {
        C.line(g, l * 12, -34, l * 15 + sw * l, -2, { seed: 'trl' + l + frame, stroke: '#6E8F5A', lw: 11, wob: 0.8 });
      }
      C.ellipse(g, 0, -58, 30, 28, {
        seed: 'trb' + frame, fill: '#6E8F5A', stroke: PAL.outline, lw: 3.4, hatch: 4, wash: 0.75
      });
      C.ellipse(g, 4, -54, 17, 16, {
        seed: 'trbel' + frame, fill: '#87A86E', stroke: null, hatch: 3, wash: 0.7, fillAlpha: 0.8
      });
      // club arm
      C.line(g, 24, -66, 40 + sw, -44, { seed: 'tra' + frame, stroke: '#6E8F5A', lw: 9, wob: 0.8 });
      C.roundRect(g, 34 + sw, -64, 20, 26, 7, {
        seed: 'trc' + frame, fill: '#8A5F38', stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.8
      });
      // head with tusks
      C.ellipse(g, -4, -92, 22, 20, {
        seed: 'trh' + frame, fill: '#7FA268', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.78
      });
      C.dot(g, -12, -96, 4, PAL.white, 'tre1' + frame);
      C.dot(g, 3, -96, 4, PAL.white, 'tre2' + frame);
      C.dot(g, -11, -96, 2.2, PAL.outline, 'trp1' + frame);
      C.dot(g, 4, -96, 2.2, PAL.outline, 'trp2' + frame);
      for (var tk = -1; tk <= 1; tk += 2) {
        C.poly(g, [[tk * 9 - 4, -82], [tk * 9 + 4, -82], [tk * 9, -70]], {
          seed: 'trt' + tk + frame, fill: PAL.white, stroke: PAL.outline, lw: 1.8, hatch: 2, wash: 0.9
        });
      }
    });
  }

  function dragonTile(frame) {
    return tile('dr' + frame, 260, 200, function (g) {
      g.translate(130, 150);
      var flap = frame ? -16 : 10;
      // wings behind
      for (var wsd = -1; wsd <= 1; wsd += 2) {
        C.poly(g, [[wsd * 20, -60], [wsd * 96, -110 + flap], [wsd * 110, -30], [wsd * 34, -34]], {
          seed: 'dw' + wsd + frame, fill: '#7A4A9E', stroke: PAL.outline, lw: 3.4, hatch: 5, wash: 0.7
        });
      }
      // tail
      C.arc(g, -60, -6, 46, Math.PI * 1.1, Math.PI * 1.85, {
        seed: 'dt' + frame, stroke: '#5E8F4E', lw: 15, wob: 1.4
      });
      // body
      C.ellipse(g, 0, -30, 56, 44, {
        seed: 'db' + frame, fill: '#5E8F4E', stroke: PAL.outline, lw: 4, hatch: 5, wash: 0.75
      });
      C.ellipse(g, 10, -24, 30, 28, {
        seed: 'dbel' + frame, fill: '#C7D96B', stroke: null, hatch: 3.4, wash: 0.7, fillAlpha: 0.8
      });
      // legs
      for (var l2 = -1; l2 <= 1; l2 += 2) {
        C.line(g, l2 * 22, 6, l2 * 26, 30, { seed: 'dl' + l2 + frame, stroke: '#5E8F4E', lw: 12, wob: 0.8 });
      }
      // neck + head
      C.line(g, 34, -50, 74, -84, { seed: 'dn' + frame, stroke: '#5E8F4E', lw: 22, wob: 1 });
      C.ellipse(g, 88, -94, 32, 24, {
        seed: 'dh' + frame, fill: '#5E8F4E', stroke: PAL.outline, lw: 3.6, hatch: 4, wash: 0.78
      });
      C.dot(g, 92, -104, 5.5, '#F2C14E', 'de' + frame);
      C.dot(g, 93, -104, 2.8, PAL.outline, 'dp' + frame);
      // snout + a curl of smoke
      C.poly(g, [[112, -100], [132, -94], [112, -86]], {
        seed: 'ds' + frame, fill: '#5E8F4E', stroke: PAL.outline, lw: 2.6, hatch: 3, wash: 0.78
      });
      // spikes
      for (var sp = 0; sp < 5; sp++) {
        C.poly(g, [[-40 + sp * 20, -68], [-30 + sp * 20, -68], [-35 + sp * 20, -86]], {
          seed: 'dsp' + sp + frame, fill: '#C7D96B', stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.85
        });
      }
    });
  }

  /* The class props that ride over the hero sprite. */
  function classProp(cls, ctx, x, y, face, swing, blocking) {
    if (cls === 'knight') {
      // shield in front when blocking, sword swung otherwise
      if (blocking) {
        ctx.drawImage(tile('shield', 46, 56, function (g) {
          g.translate(23, 28);
          C.poly(g, [[-18, -24], [18, -24], [14, 12], [0, 26], [-14, 12]], {
            seed: 'shld', fill: '#B9C3C9', stroke: PAL.outline, lw: 3, hatch: 3.4, wash: 0.8
          });
          C.line(g, 0, -20, 0, 20, { seed: 'shl1', stroke: '#D9402F', lw: 4, wob: 0.6 });
          C.line(g, -12, -4, 12, -4, { seed: 'shl2', stroke: '#D9402F', lw: 4, wob: 0.6 });
        }), x + face * 22 - 23, y - 78);
      } else {
        ctx.save();
        ctx.translate(x + face * 26, y - 60);
        ctx.rotate(face * (swing > 0 ? -0.9 + (1 - swing / 0.34) * 1.8 : 0.2));
        ctx.drawImage(tile('sword', 24, 90, function (g) {
          C.poly(g, [[9, 68], [15, 68], [15, 14], [12, 2], [9, 14]], {
            seed: 'swb', fill: '#D8DCE0', stroke: PAL.outline, lw: 2, hatch: 2.4, wash: 0.9
          });
          C.rect(g, 2, 68, 20, 6, { seed: 'swg', fill: '#F2C14E', stroke: PAL.outline, lw: 1.8, hatch: 2, wash: 0.85 });
          C.rect(g, 9, 74, 6, 13, { seed: 'swh', fill: '#8A5F38', stroke: PAL.outline, lw: 1.8, hatch: 2, wash: 0.85 });
        }), -12, -76);
        ctx.restore();
      }
    } else if (cls === 'archer') {
      // three baked poses: string at rest, half drawn, fully drawn
      var pull = swing > 0 ? Math.min(2, Math.floor((swing / CLASSES.archer.cool) * 3)) : 0;
      ctx.save();
      ctx.translate(x + face * 42, y - 58);
      ctx.scale(face, 1);
      ctx.drawImage(bowTile(pull), -20, -50);
      ctx.restore();
    } else if (cls === 'wizard' && !blocking) {
      // the wand lifts and flicks forward as the bolt goes
      var t2 = swing > 0 ? swing / CLASSES.wizard.cool : 0;
      ctx.save();
      // the wand is held out front, then flicks forward as the bolt goes
      ctx.translate(x + face * 40, y - 46);
      ctx.rotate(face * (-0.55 + (1 - t2) * 1.2));
      ctx.drawImage(wandTile(swing > 0 && t2 > 0.55 ? 1 : 0), -17, -62);
      ctx.restore();
    } else if (blocking) {
      // the wizard's cloak-shimmer
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.2 * Math.sin(S.t * 9);
      ctx.drawImage(wardTile(), x - 46, y - 92);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------- the run

  var PLATFORMS = [
    { x: 520,  y: 380, w: 150 },
    { x: 900,  y: 330, w: 130 },
    { x: 1180, y: 390, w: 160 },
    { x: 1700, y: 350, w: 150 },
    { x: 2100, y: 385, w: 170 },
    { x: 2520, y: 340, w: 140 }
  ];
  var CHECKPOINTS = [180, 900, 1700, 2500];

  function makeEnemies() {
    var out = [];
    var rnd = W.mulberry32(W.hash('castlefoes'));
    var spots = [420, 700, 1050, 1320, 1560, 1900, 2200, 2380, 2650, 2820];
    spots.forEach(function (x, i) {
      var troll = i % 3 === 2;
      out.push({
        x: x, y: GROUND, kind: troll ? 'troll' : 'skeleton',
        hp: troll ? 3 : 1, maxHp: troll ? 3 : 1,
        speed: troll ? 34 : 56, face: -1, hurt: 0, windup: 0, cool: 1 + rnd(),
        home: x
      });
    });
    return out;
  }

  S.enter = function () {
    S.t = 0;
    S.stage = 'pick';                 // pick -> play -> won
    S.sel = 0;
    S.cls = 'knight';
    if (!backdrop) backdrop = buildBackdrop();
    W.say('Choose your hero!', PAL.sun);
  };

  function startRun() {
    S.stage = 'play';
    S.x = 120; S.y = GROUND;
    S.vx = 0; S.vy = 0; S.face = 1;
    S.onGround = true;
    S.hearts = 5; S.maxHearts = 5;
    S.hurt = 0; S.swing = 0; S.cool = 0; S.swingHits = []; S.swingDir = 1;
    S.blocking = false;
    S.checkpoint = 0;
    S.shots = [];
    S.enemies = makeEnemies();
    S.dragon = { x: 2880, y: GROUND - 26, hp: 10, maxHp: 10, hurt: 0, fireIn: 2.4, t: 0,
                 face: -1, dead: false };
    S.fires = [];
    S.rescued = false;
    S.chest = null;
    var G = W.game;
    S.replay = !!(G.state.firsts && G.state.firsts.castle);
    W.say(S.replay ? 'Back again! Treasure in the dungeon...' : 'Save Galaxy from the dungeon!',
      CLASSES[S.cls].color);
  }

  function hurtHero(fromX) {
    if (S.hurt > 0 || S.blocking) {
      if (S.blocking) {
        W.fx.sparkle(S.x + S.face * 24, S.y - 50, 6, 40);
        if (W.audio) W.audio.play('clack');
      }
      return;
    }
    S.hearts--;
    S.hurt = 1.2;
    S.vx = (S.x < fromX ? -1 : 1) * 190;
    S.vy = -220;
    if (W.audio) W.audio.play('hit');
    if (S.hearts <= 0) {
      // never an ending — walk back to the last flag with a full heart set
      S.hearts = S.maxHearts;
      S.x = CHECKPOINTS[S.checkpoint];
      S.y = GROUND; S.vx = 0; S.vy = 0;
      S.enemies.forEach(function (e) {
        if (e.x < S.x - 200) return;
        e.hp = e.maxHp; e.x = e.home;
      });
      W.game.showBanner('PHEW!', 'Back to the last flag — try again!');
      W.say('That was close! Have another go.', PAL.sun);
    }
  }

  /* Leaving the castle puts you in the air right over the castle. */
  function backToMap() {
    W.game.fadeTo('vehicle', {
      vehicle: W.vehicleForMap('warmland2'), map: 'warmland2',
      at: W.mapPadAt('warmland2', 'castle')
    });
  }

  function attack() {
    if (S.cool > 0) return;
    var cls = CLASSES[S.cls];
    S.cool = cls.cool;
    S.swing = cls.cool;
    S.swingDir = S.face;
    if (S.cls === 'knight') {
      S.swingHits = [];
      swingSweep();
      if (W.audio) W.audio.play('shoot');
    } else {
      // the wizard casts in twos: freeze them solid, then hit them
      var frost = false;
      if (S.cls === 'wizard') {
        S.cast = ((S.cast || 0) + 1) % 2;
        frost = S.cast === 1;
      }
      S.shots.push({
        x: S.x + S.face * 26, y: S.y - 52,
        vx: S.face * (S.cls === 'archer' ? 460 : 300),
        life: 2.2, kind: S.cls, frost: frost,
        hits: [], trail: [], sparkIn: 0
      });
      if (W.audio) W.audio.play('shoot');
    }
  }

  /* The sword's reach for as long as the swing lasts: a box from just
   * behind the hero out to the tip of the blade. */
  function swingSweep() {
    if (S.swing <= 0) return;
    var reach = CLASSES.knight.reach;
    var face = S.swingDir || S.face;
    var lo = face > 0 ? S.x - 24 : S.x - reach - 24;
    var hi = face > 0 ? S.x + reach + 24 : S.x + 24;
    for (var i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (e.hp <= 0) continue;
      if (S.swingHits.indexOf(e) >= 0) continue;
      if (e.x > lo && e.x < hi && Math.abs(e.y - S.y) < 84) {
        S.swingHits.push(e);
        hitEnemy(e);
      }
    }
    var d = S.dragon;
    if (!d.dead && S.swingHits.indexOf(d) < 0 &&
        d.x + 60 > lo - 60 && d.x - 60 < hi + 60 &&
        Math.abs((d.y - 40) - (S.y - 40)) < 130) {
      S.swingHits.push(d);
      hitDragon();
    }
  }

  /* Frost holds something still for a beat — no damage, just a pause you
   * can walk past or line the next star up on. */
  function freezeEnemy(e) {
    e.frozen = 2.2;
    W.fx.sparkle(e.x, e.y - 40, 12, 60);
    if (W.audio) W.audio.play('chime');
  }

  function hitEnemy(e) {
    e.hp--;
    e.hurt = 0.25;
    W.fx.sparkle(e.x, e.y - 40, 8, 50);
    if (e.hp <= 0) {
      W.fx.dust(e.x, e.y, 8);
      if (W.audio) W.audio.play('boom');
    } else if (W.audio) W.audio.play('hit');
  }

  function hitDragon() {
    var d = S.dragon;
    if (d.dead) return;
    d.hp--;
    d.hurt = 0.3;
    W.fx.sparkle(d.x + 60, d.y - 60, 10, 70);
    if (W.audio) W.audio.play('hit');
    if (d.hp <= 0) {
      d.dead = true;
      W.fx.sparkle(d.x, d.y - 40, 40, 220);
      W.game.showBanner('THE DRAGON IS BEATEN!', 'The dungeon is open...');
      if (W.audio) W.audio.play('win');
    }
  }

  S.update = function (dt) {
    var G = W.game;
    S.t += dt;
    W.dialogue.update(dt);
    W.fx.update(dt);

    // ---- picking a class
    if (S.stage === 'pick') {
      if (W.input.hit('left'))  S.sel = (S.sel + CLASS_ORDER.length - 1) % CLASS_ORDER.length;
      if (W.input.hit('right')) S.sel = (S.sel + 1) % CLASS_ORDER.length;
      if (W.input.hit('back')) { backToMap(); return; }
      if (W.input.hit('act')) { S.cls = CLASS_ORDER[S.sel]; startRun(); }
      return;
    }

    if (W.input.hit('back')) {
      backToMap();
      return;
    }

    if (S.stage === 'won') {
      S.wonT += dt;
      if (W.input.hit('act') && S.wonT > 0.6) {
        backToMap();
      }
      return;
    }

    // ---- the hero
    if (S.hurt > 0) S.hurt -= dt;
    if (S.cool > 0) S.cool -= dt;
    // the swing clock drives every class's weapon animation, but only the
    // knight's sword actually cuts anything
    if (S.swing > 0) { S.swing -= dt; if (S.cls === 'knight') swingSweep(); }
    S.blocking = W.input.down('talk');           // A blocks

    var a = W.input.axis();
    var speed = S.blocking ? 92 : 232;
    if (S.hurt > 0.9) {
      S.x += S.vx * dt;                          // knockback owns the first beat
      S.vx *= 0.9;
    } else {
      S.x = W.clamp(S.x + a[0] * speed * dt, 40, WORLD_W - 40);
      if (a[0]) S.face = a[0] > 0 ? 1 : -1;
    }
    if (W.input.hit('jump') && S.onGround) {
      S.vy = JUMP_V;
      S.onGround = false;
      if (W.audio) W.audio.play('jump');
    }
    if (W.input.hit('act')) attack();

    // gravity + platforms
    S.vy += GRAV * dt;
    var ny = S.y + S.vy * dt;
    S.onGround = false;
    if (ny >= GROUND) { ny = GROUND; S.vy = 0; S.onGround = true; }
    else {
      for (var p = 0; p < PLATFORMS.length; p++) {
        var pl = PLATFORMS[p];
        if (S.vy > 0 && S.x > pl.x - 26 && S.x < pl.x + pl.w + 26 &&
            S.y <= pl.y + 6 && ny >= pl.y) {
          ny = pl.y; S.vy = 0; S.onGround = true;
        }
      }
    }
    S.y = ny;

    // checkpoints
    for (var cp = 0; cp < CHECKPOINTS.length; cp++) {
      if (S.x > CHECKPOINTS[cp] && cp > S.checkpoint) {
        S.checkpoint = cp;
        W.fx.sparkle(CHECKPOINTS[cp], GROUND - 60, 10, 60);
        if (W.audio) W.audio.play('blip');
      }
    }

    // ---- shots
    for (var i = S.shots.length - 1; i >= 0; i--) {
      var sh = S.shots[i];
      sh.x += sh.vx * dt;
      sh.life -= dt;
      if (sh.kind === 'wizard' && !sh.frost) {
        // a glittering wake — baked dots, not crayon, so it stays cheap
        sh.trail = sh.trail || [];
        sh.trail.push([sh.x, sh.y + Math.sin(sh.life * 22) * 5]);
        if (sh.trail.length > 14) sh.trail.shift();
        sh.sparkIn = (sh.sparkIn || 0) - dt;
        if (sh.sparkIn <= 0) {
          sh.sparkIn = 0.07;
          W.fx.sparkle(sh.x, sh.y, 1, 26);
        }
      }
      var gone = sh.life <= 0;
      sh.hits = sh.hits || [];
      for (var e2 = 0; e2 < S.enemies.length; e2++) {
        var en2 = S.enemies[e2];
        if (en2.hp <= 0 || sh.hits.indexOf(en2) >= 0) continue;
        if (Math.abs(en2.x - sh.x) < 26 && Math.abs(en2.y - 40 - sh.y) < 46) {
          sh.hits.push(en2);
          if (sh.frost) freezeEnemy(en2); else hitEnemy(en2);
          gone = true;
          break;
        }
      }
      if (!S.dragon.dead && sh.hits.indexOf(S.dragon) < 0 &&
          Math.abs(S.dragon.x - sh.x) < 96 &&
          Math.abs((S.dragon.y - 30) - sh.y) < 76) {
        sh.hits.push(S.dragon);
        if (sh.frost) { S.dragon.frozen = 1.6; W.fx.sparkle(S.dragon.x, S.dragon.y - 80, 12, 70); }
        else hitDragon();
        gone = true;
      }
      if (gone) S.shots.splice(i, 1);
    }

    // ---- enemies
    S.enemies.forEach(function (e) {
      if (e.hp <= 0) return;
      if (e.hurt > 0) e.hurt -= dt;
      if (e.frozen > 0) { e.frozen -= dt; return; }     // iced solid
      var d = S.x - e.x;
      var near = Math.abs(d) < 320;
      if (near && Math.abs(d) > 34) {
        e.face = d > 0 ? 1 : -1;
        e.x += e.face * e.speed * dt;
      }
      if (Math.abs(d) < 44 && Math.abs(S.y - e.y) < 70) {
        e.cool -= dt;
        if (e.cool <= 0) {
          e.cool = e.kind === 'troll' ? 1.6 : 1.1;
          hurtHero(e.x);
        }
      }
    });

    // ---- the dragon
    var dr = S.dragon;
    if (!dr.dead) {
      dr.t += dt;
      if (dr.hurt > 0) dr.hurt -= dt;
      if (dr.frozen > 0) { dr.frozen -= dt; }
      dr.y = GROUND - 26 + Math.sin(dr.t * 1.2) * 12;   // heaving breath, feet down
      dr.face = S.x < dr.x ? -1 : 1;                   // always looking at you
      if (Math.abs(S.x - dr.x) < 520 && !(dr.frozen > 0)) {
        dr.fireIn -= dt;
        if (dr.fireIn <= 0) {
          dr.fireIn = 1.9;
          // breathe from the snout, whichever way the head is pointing
          var mouth = dr.x + (dr.face || -1) * 120;
          var ang = Math.atan2((S.y - 50) - (dr.y - 90), S.x - mouth);
          S.fires.push({ x: mouth, y: dr.y - 90,
                         vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230, life: 3 });
          if (W.audio) W.audio.play('cook');
        }
      }
    }
    for (var f = S.fires.length - 1; f >= 0; f--) {
      var fb = S.fires[f];
      fb.x += fb.vx * dt; fb.y += fb.vy * dt; fb.life -= dt;
      if (Math.abs(fb.x - S.x) < 30 && Math.abs(fb.y - (S.y - 46)) < 44) {
        hurtHero(fb.x);
        S.fires.splice(f, 1);
        continue;
      }
      if (fb.life <= 0 || fb.y > 560) S.fires.splice(f, 1);
    }

    // ---- the dungeon prize
    if (dr.dead && S.x > 3060) {
      if (!S.replay && !S.rescued) {
        S.rescued = true;
        S.stage = 'won'; S.wonT = 0;
        G.first('castle', 'Saved Galaxy!');
        // she was in a cage until now — this is the moment she moves into
        // the park, so she is not there to be met before you free her
        if (!G.state.friendRooms) G.state.friendRooms = {};
        if (G.state.party.indexOf('galaxy') < 0) G.state.friendRooms.galaxy = 'park2';
        G.state.money += 8;
        W.fx.hearts(3120, 340, 14);
        W.fx.sparkle(3120, 320, 30, 200);
        G.showBanner('GALAXY IS FREE!', 'Back to the star park together!');
        if (W.audio) W.audio.play('win');
      } else if (S.replay && !S.chest) {
        S.chest = true;
        S.stage = 'won'; S.wonT = 0;
        var key = 'castle:' + G.state.day;
        var first = !G.state.treasures[key];
        G.state.treasures[key] = true;
        G.state.money += first ? 12 : 3;
        if (first) {
          var cry = W.findCrystal('castle' + G.state.day);
          W.say('Treasure! A ' + cry.name + ' and a pile of coins!', cry.color);
          G.showBanner('TREASURE!', 'A ' + cry.name + ' for the trophy case!');
        } else {
          G.showBanner('THE CHEST IS EMPTY', 'Come back tomorrow!');
        }
        W.fx.sparkle(3120, 340, 26, 180);
        if (W.audio) W.audio.play('chime');
      }
    }
  };

  S.draw = function (ctx) {
    var G = W.game;

    if (S.stage === 'pick') {
      ctx.drawImage(backdrop, 0, 0);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#241640';
      ctx.fillRect(0, 0, 960, 600);
      ctx.restore();
      C.textCached(ctx, 'WHO WILL YOU BE?', 480, 110, {
        size: 38, align: 'center', color: PAL.sun,
        outline: 5, outlineColor: PAL.outline, seed: 'cwho'
      });
      for (var i = 0; i < CLASS_ORDER.length; i++) {
        var cd = CLASSES[CLASS_ORDER[i]], on = i === S.sel;
        var cx = 200 + i * 280;
        ctx.drawImage(cardTile(on), cx - 124, 166);
        W.drawChar(ctx, cx, 370, {
          char: W.heroChar(), dir: 'down', t: S.t, scale: 0.9, noShadow: true
        });
        classProp(CLASS_ORDER[i], ctx, cx, 370, 1, 0, CLASS_ORDER[i] !== 'archer');
        C.textCached(ctx, cd.name, cx, 214, {
          size: 26, align: 'center', color: on ? PAL.roof : PAL.white,
          outline: on ? 0 : 3, outlineColor: PAL.outline, seed: 'ccn' + i
        });
        C.textCached(ctx, cd.sub, cx, 244, {
          size: 13, align: 'center', color: on ? PAL.woodDk : '#C9C0D0', seed: 'ccs' + i
        });
      }
      C.textCached(ctx, 'arrows choose  ·  Z go  ·  X leave', 480, 500, {
        size: 20, align: 'center', color: PAL.white,
        outline: 3.4, outlineColor: PAL.outline, seed: 'cpick'
      });
      W.dialogue.draw(ctx, 480, 560);
      return;
    }

    var camX = W.clamp(S.x - 420, 0, WORLD_W - 960);
    ctx.drawImage(backdrop, -camX, 0);

    // platforms
    for (var p = 0; p < PLATFORMS.length; p++) {
      var pl = PLATFORMS[p];
      if (pl.x + pl.w < camX - 40 || pl.x > camX + 1000) continue;
      ctx.save();
      ctx.translate(pl.x - camX, pl.y);
      ctx.scale(pl.w / 198, 1);
      ctx.drawImage(platTile(), -1, -1);
      ctx.restore();
    }

    // checkpoint flags
    for (var c = 0; c < CHECKPOINTS.length; c++) {
      var fx2 = CHECKPOINTS[c] - camX;
      if (fx2 < -40 || fx2 > 1000) continue;
      ctx.drawImage(flagTile(c <= S.checkpoint), fx2 - 4, GROUND - 76);
    }

    // the dungeon at the end
    var dx = 3120 - camX;
    if (dx < 1060) {
      ctx.drawImage(dungeonTile(), dx - 75, GROUND - 175);
      if (S.dragon.dead && (S.rescued || S.chest)) {
        if (S.replay) {
          ctx.drawImage(chestTile(), dx - 45, GROUND - 90);
        } else {
          W.drawChar(ctx, dx, GROUND, { char: 'galaxy', dir: 'down', t: S.t, scale: 0.9 });
        }
      } else {
        // the cage, with Galaxy waiting inside
        W.drawChar(ctx, dx, GROUND, { char: 'galaxy', dir: 'down', t: S.t, scale: 0.9, alpha: 0.9 });
        ctx.drawImage(cageTile(), dx - 58, GROUND - 128);
      }
    }

    // enemies
    S.enemies.forEach(function (e, i2) {
      if (e.hp <= 0) return;
      var ex = e.x - camX;
      if (ex < -80 || ex > 1040) return;
      var frame = Math.floor(S.t * 5 + i2) % 2;
      var img = e.kind === 'troll' ? trollTile(frame) : skeletonTile(frame);
      ctx.save();
      if (e.hurt > 0 && Math.sin(S.t * 40) > 0) ctx.globalAlpha = 0.45;
      ctx.translate(ex, e.y);
      ctx.scale(e.face, 1);
      ctx.drawImage(img, -img.width / 2, -img.height);
      ctx.restore();
      // little health pips for trolls
      if (e.kind === 'troll' && e.hp < e.maxHp) {
        for (var h = 0; h < e.maxHp; h++) {
          C.dot(ctx, ex - 16 + h * 16, e.y - 126, 5,
                h < e.hp ? '#E0455F' : '#5A5668', 'trhp' + i2 + h);
        }
      }
    });

    // the dragon
    var dr = S.dragon;
    if (!dr.dead) {
      var drx = dr.x - camX;
      if (drx > -260 && drx < 1220) {
        ctx.save();
        if (dr.hurt > 0 && Math.sin(S.t * 40) > 0) ctx.globalAlpha = 0.5;
        // the art is drawn facing right; turn it to look at the hero, who
        // comes at it from the left
        ctx.translate(drx, dr.y);
        ctx.scale(dr.face || -1, 1);
        ctx.drawImage(dragonTile(Math.floor(S.t * 3) % 2), -130, -150);
        ctx.restore();
        W.drawHealthBar(ctx, 660, 20, 280, dr.hp / dr.maxHp, '#7A4A9E', 'DRAGON');
      }
    }

    // fireballs
    S.fires.forEach(function (fb) {
      ctx.drawImage(fireTile(), fb.x - camX - 16, fb.y - 16);
    });

    // the hero's shots
    S.shots.forEach(function (sh) {
      var sx2 = sh.x - camX;
      if (sh.kind === 'archer') {
        ctx.save();
        ctx.translate(sx2, sh.y);
        if (sh.vx < 0) ctx.scale(-1, 1);
        ctx.drawImage(arrowTile(), -20, -8);
        ctx.restore();
      } else if (sh.frost) {
        ctx.save();
        ctx.translate(sx2, sh.y);
        ctx.rotate(S.t * 4);
        ctx.drawImage(frostTile(), -17, -17);
        ctx.restore();
      } else {
        var tr = sh.trail || [];
        for (var q = 0; q < tr.length; q++) {
          var f = (q + 1) / tr.length;
          ctx.save();
          ctx.globalAlpha = f * 0.55;
          var r2 = 3 + f * 5;
          ctx.drawImage(motTile(), tr[q][0] - camX - r2, tr[q][1] - r2, r2 * 2, r2 * 2);
          ctx.restore();
        }
        ctx.drawImage(boltTile(), sx2 - 15, sh.y - 15);
      }
    });

    // anything the frost caught, iced over
    S.enemies.forEach(function (e5) {
      if (e5.hp <= 0 || !(e5.frozen > 0)) return;
      var ex = e5.x - camX;
      if (ex < -80 || ex > 1040) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, e5.frozen);
      ctx.drawImage(iceTile(), ex - 38, e5.y - 96);
      ctx.restore();
    });

    // the hero
    var hx2 = S.x - camX;
    if (!(S.hurt > 0 && Math.sin(S.t * 30) > 0)) {
      W.drawChar(ctx, hx2, S.y, {
        char: W.heroChar(), suit: G.state.suit, dir: S.face > 0 ? 'right' : 'left',
        t: G.t, moving: Math.abs(S.vx) > 10 || (W.input.axis()[0] !== 0),
        hopT: (S.t * 2.4) % 1, scale: 0.92
      });
      classProp(S.cls, ctx, hx2, S.y, S.face, S.swing, S.blocking);
    }

    W.fx.draw(ctx);

    // ---- HUD
    for (var h2 = 0; h2 < S.maxHearts; h2++) {
      ctx.drawImage(heartTile(h2 < S.hearts), 18 + h2 * 34, 16);
    }
    C.textCached(ctx, CLASSES[S.cls].name, 20, 82, {
      size: 18, color: CLASSES[S.cls].color,
      outline: 3, outlineColor: PAL.outline, seed: 'chud' + S.cls
    });

    if (S.stage === 'won') {
      C.roundRect(ctx, 250, 150, 460, 260, 18, {
        seed: 'cwon', fill: PAL.white, stroke: PAL.outline, lw: 5, hatch: 5, wash: 0.9, fillAlpha: 0.3
      });
      C.textCached(ctx, S.replay ? 'TREASURE!' : 'GALAXY IS FREE!', 480, 220, {
        size: 34, align: 'center', color: PAL.sun,
        outline: 5, outlineColor: PAL.outline, seed: 'cwt' + (S.replay ? 'r' : 'g')
      });
      C.textCached(ctx, S.replay ? 'Come back tomorrow for more!' : 'He flies home to the star park!',
        480, 272, { size: 18, align: 'center', color: PAL.outline, seed: 'cws' + (S.replay ? 'r' : 'g') });
      W.drawPrompt(ctx, 480, 346, 'back to the balloon', S.t, false, 'Z');
    } else {
      C.textCached(ctx, 'arrows move · space jump · Z attack · A block · X leave', 480, 578, {
        size: 15, align: 'center', color: PAL.white,
        outline: 3, outlineColor: PAL.outline, seed: 'chint'
      });
    }

    W.dialogue.draw(ctx, W.clamp(hx2, 200, 760), Math.max(120, S.y - 150));
  };

  S.startRun = startRun;          // the test harness starts a run directly

  W.sceneCastle = S;

})(window.W);
