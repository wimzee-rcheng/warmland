/* Warmland — room data. No logic here on purpose: a new room should be an
 * edit to this file and nothing else.
 *
 *   floor     'wood' | 'tile' | 'grass' | 'snow'
 *   wallH     back-wall height in px (0 outdoors)
 *   bounds    the walkable rectangle
 *   props     {kind, x, y}  — footprint doubles as collision
 *   doors     walk into one to change room
 *   stations  stand in one and press Z (see stations.js)
 *   residents friends/NPCs who live here
 */
(function (W) {
  'use strict';

  W.ROOMS = {

    // ------------------------------------------------------------- house

    living: {
      name: 'Living Room', floor: 'wood', wallH: 150, wallColor: '#EFD9B4',
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      decorSpots: [[770, 420], [420, 300], [560, 470]],
      spawn: [480, 400],
      props: [
        { kind: 'rugRound',    x: 262, y: 330 },
        { kind: 'bookshelf',   x: 240, y: 158 },
        { kind: 'closet',      x: 430, y: 158 },
        { kind: 'tv',          x: 760, y: 158 },
        { kind: 'sofa',        x: 110, y: 384 },
        { kind: 'coffeeTable', x: 300, y: 398 },
        { kind: 'lamp',        x: 630, y: 372 },
        { kind: 'plant',       x: 848, y: 420 }
      ],
      doors: [
        { x: 110, y: 118, w: 84, h: 40, to: 'bedroom', spawn: [430, 470], art: 'wall', label: 'Bedroom' },
        { x: 600, y: 118, w: 84, h: 40, to: 'kitchen', spawn: [210, 330], art: 'wall', label: 'Kitchen' },
        { x: 438, y: 540, w: 92, h: 30, to: 'outside', spawn: [466, 268], art: 'mat',  label: 'Outside' }
      ],
      stations: [
        { kind: 'closet',    x: 430, y: 190, w: 86,  h: 44 },
        { kind: 'bookshelf', x: 240, y: 186, w: 96,  h: 40 },
        { kind: 'tv',        x: 760, y: 186, w: 84,  h: 40 },
        { kind: 'sofa',      x: 110, y: 434, w: 130, h: 40, seat: [175, 433] },
        { kind: 'lamp',      x: 618, y: 396, w: 46,  h: 40 }
      ]
    },

    kitchen: {
      name: 'Kitchen', floor: 'tile', wallH: 150, wallColor: '#D9E9DC',
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      spawn: [210, 330],
      props: [
        { kind: 'bobaMachine', x: 170, y: 160 },
        { kind: 'counter',     x: 250, y: 158 },
        { kind: 'stove',       x: 460, y: 158 },
        { kind: 'recipePoster', x: 560, y: 150 },
        { kind: 'cabinet',     x: 636, y: 158 },
        { kind: 'fridge',      x: 780, y: 158 },
        { kind: 'dresser',     x: 70,  y: 400 },
        { kind: 'trashCan',    x: 74,  y: 300 },
        { kind: 'table',       x: 400, y: 396 },
        { kind: 'chair',       x: 344, y: 408 },
        { kind: 'chair',       x: 522, y: 408 },
        { kind: 'plant',       x: 860, y: 452 }
      ],
      doors: [
        { x: 60,  y: 118, w: 84, h: 40, to: 'living', spawn: [642, 232], art: 'wall', label: 'Living Room' }
      ],
      stations: [
        { kind: 'fridge',      x: 780, y: 202, w: 74, h: 42 },
        { kind: 'cabinet',     x: 636, y: 202, w: 116, h: 42 },
        { kind: 'recipePoster', x: 560, y: 170, w: 74, h: 34 },
        { kind: 'stove',       x: 460, y: 204, w: 76, h: 42 },
        { kind: 'sink',        x: 250, y: 206, w: 82, h: 42, label: 'Sink' },
        { kind: 'counter',     x: 340, y: 206, w: 78, h: 42 },
        { kind: 'bobaMachine', x: 170, y: 202, w: 52, h: 42 },
        { kind: 'cupboard',    x: 70,  y: 432, w: 84, h: 40 },
        { kind: 'trash',       x: 74,  y: 322, w: 40, h: 36 },
        { kind: 'table',       x: 400, y: 440, w: 96, h: 60 },
        { kind: 'chair',       x: 344, y: 408, w: 34, h: 32 },
        { kind: 'chair',       x: 522, y: 408, w: 34, h: 32 }
      ]
    },

    bedroom: {
      name: 'Bedroom', floor: 'wood', wallH: 150, wallColor: '#D8CCEA',
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      decorSpots: [[700, 330], [140, 470], [560, 330]],
      spawn: [430, 470],
      props: [
        { kind: 'bed',          x: 110, y: 250 },
        { kind: 'dresser',      x: 300, y: 158 },
        { kind: 'window',       x: 520, y: 150 },
        { kind: 'crystalShelf', x: 780, y: 158 },
        { kind: 'ideasBoard',   x: 640, y: 150 },
        { kind: 'nightlight',   x: 246, y: 262 },
        { kind: 'petBed',       x: 560, y: 440 },
        { kind: 'toybox',       x: 700, y: 430 },
        { kind: 'lamp',         x: 430, y: 330 },
        { kind: 'sleepingBag',  x: 240, y: 300, tint: '#7FA8D8' },
        { kind: 'sleepingBag',  x: 240, y: 370, tint: '#E8A0B4' },
        { kind: 'plant',        x: 860, y: 452 }
      ],
      doors: [
        { x: 428, y: 540, w: 92, h: 30, to: 'living', spawn: [152, 232], art: 'mat', label: 'Living Room' }
      ],
      stations: [
        { kind: 'bed',          x: 110, y: 404, w: 110, h: 44, lie: [165, 386], wake: [165, 438] },
        { kind: 'window',       x: 520, y: 176, w: 96,  h: 44 },
        { kind: 'crystalShelf', x: 780, y: 186, w: 96,  h: 40 },
        { kind: 'ideasBoard',   x: 640, y: 176, w: 90,  h: 40 },
        { kind: 'toybox',       x: 700, y: 472, w: 64,  h: 40 },
        { kind: 'lamp',         x: 418, y: 354, w: 46,  h: 40 }
      ]
    },

    // ----------------------------------------------------------- outdoors

    outside: {
      name: 'Outside', floor: 'grass', wallH: 0, outdoor: true,
      bounds: { x: 30, y: 224, w: 900, h: 342 },
      spawn: [466, 268],
      props: [
        { kind: 'path',    x: 366, y: 212 },
        { kind: 'house',   x: 340, y: 150 },
        { kind: 'tree',    x: 140, y: 250, buildable: true },
        { kind: 'tree',    x: 862, y: 260 },
        { kind: 'mailbox', x: 300, y: 292, tint: '#4F8FD6' },
        { kind: 'mailbox', x: 300, y: 352, tint: '#F2C14E' },
        { kind: 'trashCan', x: 560, y: 300 },
        { kind: 'gardenPlot', x: 620, y: 300 },
        { kind: 'gardenPlot', x: 700, y: 320 },
        { kind: 'gardenPlot', x: 620, y: 360 },
        { kind: 'flower',  x: 700, y: 300, tint: '#E8A0B4' },
        { kind: 'flower',  x: 742, y: 330, tint: '#F2C14E' },
        { kind: 'flower',  x: 320, y: 520, tint: '#E8A0B4' },
        { kind: 'ufo',     x: 600, y: 424 },
        { kind: 'car',     x: 120, y: 452 },
        { kind: 'balloon', x: 745, y: 178 }
      ],
      doors: [
        { x: 434, y: 218, w: 66, h: 34, to: 'living', spawn: [484, 512], art: 'mat', label: 'Go Inside' },
        { x: 894, y: 300, w: 40, h: 200, to: 'park',  spawn: [150, 430],  art: 'sign', label: 'Park' },
        { x: 26,  y: 300, w: 40, h: 200, to: 'shop',  spawn: [480, 520], art: 'sign', label: 'Shop' }
      ],
      stations: [
        { kind: 'mailbox', x: 300, y: 314, w: 34, h: 40 },
        { kind: 'mailbox', x: 300, y: 374, w: 34, h: 40 },
        { kind: 'trash',   x: 560, y: 322, w: 40, h: 36 },
        { kind: 'garden', id: 'plotA', x: 620, y: 300, w: 70, h: 48 },
        { kind: 'garden', id: 'plotB', x: 700, y: 320, w: 70, h: 48 },
        { kind: 'garden', id: 'plotC', x: 620, y: 360, w: 70, h: 48 },
        { kind: 'vehicle', vehicle: 'ufo',     x: 600, y: 500, w: 170, h: 44 },
        { kind: 'vehicle', vehicle: 'car',     x: 120, y: 520, w: 150, h: 44 },
        { kind: 'vehicle', vehicle: 'balloon', x: 745, y: 178, w: 130, h: 60 },
        { kind: 'tree',    x: 136, y: 294, w: 72, h: 44 }
      ]
    },

    park: {
      name: 'The Park', floor: 'grass', wallH: 0, outdoor: true,
      bounds: { x: 30, y: 140, w: 900, h: 426 },
      spawn: [150, 430],
      props: [
        { kind: 'pond',     x: 96,  y: 150 },
        { kind: 'bench',    x: 380, y: 200 },
        { kind: 'bench',    x: 620, y: 200 },
        { kind: 'lamppost', x: 330, y: 168 },
        { kind: 'swingSet', x: 690, y: 430 },
        { kind: 'petBox',   x: 800, y: 200 },
        { kind: 'tree',     x: 856, y: 160 },
        { kind: 'tree',     x: 200, y: 470 },
        { kind: 'pitchMark', x: 420, y: 398, tint: 'BOBA CART SPOT' },
        { kind: 'trashCan',  x: 880, y: 470 },
        { kind: 'flower',   x: 520, y: 330, tint: '#E8A0B4' },
        { kind: 'flower',   x: 566, y: 356, tint: '#F2C14E' },
        { kind: 'flower',   x: 300, y: 520, tint: '#B48FD6' }
      ],
      doors: [
        { x: 30, y: 300, w: 46, h: 200, to: 'outside', spawn: [860, 520], art: 'sign', label: 'Home' }
      ],
      stations: [
        { kind: 'cartPitch', x: 420, y: 400, w: 130, h: 46 },
        { kind: 'fishing',   x: 110, y: 288, w: 140, h: 40 },
        { kind: 'petBox',    x: 800, y: 240, w: 60, h: 44 },
        { kind: 'trash',     x: 880, y: 492, w: 40, h: 36 }
      ],
      residents: ['panda', 'yuna', 'butterball', 'critterA', 'critterB', 'critterC'],
      crowd: 5
    },

    shop: {
      name: 'BOBBYBEAR Shop', floor: 'tile', wallH: 150, wallColor: '#F5DFC4',
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      spawn: [480, 520],
      props: [
        { kind: 'pantryShelf', x: 120, y: 158 },
        { kind: 'iceCase',     x: 300, y: 158 },
        { kind: 'shopCounter', x: 480, y: 158 },
        { kind: 'bobaMachine', x: 700, y: 160 },
        { kind: 'shopTable',   x: 160, y: 380 },
        { kind: 'chair',       x: 244, y: 396 },
        { kind: 'shopTable',   x: 330, y: 440 },
        { kind: 'chair',       x: 274, y: 456 },
        { kind: 'shopTable',   x: 680, y: 390 },
        { kind: 'chair',       x: 630, y: 406 },
        { kind: 'plant',       x: 860, y: 452 }
      ],
      crowd: 4,
      doors: [
        { x: 434, y: 540, w: 92, h: 30, to: 'outside', spawn: [80, 400], art: 'mat', label: 'Outside' }
      ],
      stations: [
        { kind: 'shopCounter', x: 480, y: 206, w: 170, h: 44 },
        { kind: 'seedStand', x: 130, y: 204, w: 70, h: 42 },
        { kind: 'treatStand', x: 210, y: 204, w: 66, h: 42 },
        { kind: 'decorShop', x: 480, y: 260, w: 120, h: 40 },
        { kind: 'flavorTub', flavor: 'vanilla',    x: 300, y: 204, w: 44, h: 42 },
        { kind: 'flavorTub', flavor: 'chocolate',  x: 348, y: 204, w: 44, h: 42 },
        { kind: 'flavorTub', flavor: 'strawberry', x: 396, y: 204, w: 44, h: 42 },
        { kind: 'bobaMachine', x: 700, y: 204, w: 52,  h: 42 }
      ]
    },

    mountain: {
      name: 'Crystal Mountain', floor: 'snow', wallH: 0, outdoor: true,
      bounds: { x: 40, y: 190, w: 880, h: 376 },
      spawn: [480, 430],
      props: [
        { kind: 'crystalSpike', x: 90,  y: 200 },
        { kind: 'crystalSpike', x: 300, y: 176 },
        { kind: 'crystalSpike', x: 620, y: 180 },
        { kind: 'crystalSpike', x: 830, y: 206 },
        { kind: 'snowRock',     x: 210, y: 300 },
        { kind: 'snowRock',     x: 700, y: 330 },
        { kind: 'crackRock',    x: 160, y: 380 },
        { kind: 'crackRock',    x: 380, y: 300 },
        { kind: 'crackRock',    x: 640, y: 430 },
        { kind: 'crackRock',    x: 840, y: 350 },
        { kind: 'crackRock',    x: 250, y: 480 },
        { kind: 'crackRock',    x: 720, y: 260 },
        { kind: 'balloon',      x: 430, y: 470 },
        { kind: 'signpost',     x: 330, y: 520, tint: 'FLY HOME' }
      ],
      doors: [],
      stations: [
        { kind: 'breakRock', id: 'rock1', x: 160, y: 380, w: 58, h: 36 },
        { kind: 'breakRock', id: 'rock2', x: 380, y: 300, w: 58, h: 36 },
        { kind: 'breakRock', id: 'rock3', x: 640, y: 430, w: 58, h: 36 },
        { kind: 'breakRock', id: 'rock4', x: 840, y: 350, w: 58, h: 36 },
        { kind: 'breakRock', id: 'rock5', x: 250, y: 480, w: 58, h: 36 },
        { kind: 'breakRock', id: 'rock6', x: 720, y: 260, w: 58, h: 36 },
        { kind: 'vehicle', vehicle: 'balloon', map: 'crystalMountain', x: 400, y: 510, w: 190, h: 56 }
      ]
    },

    treehouse: {
      name: 'The Treehouse', floor: 'wood', wallH: 150, wallColor: '#CDE0B8',
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      decorSpots: [[560, 380], [700, 470], [420, 300]],
      spawn: [470, 480],
      props: [
        { kind: 'telescope',  x: 700, y: 158 },
        { kind: 'snackStash', x: 470, y: 158 },
        { kind: 'window',     x: 160, y: 150 },
        { kind: 'beanbag',    x: 180, y: 380, tint: '#B48FD6' },
        { kind: 'tent',       x: 620, y: 300, tint: '#E8834E' },
        { kind: 'tent',       x: 740, y: 360, tint: '#6FA84B' },
        { kind: 'sleepingBag', x: 300, y: 470, tint: '#F2C14E' },
        { kind: 'ropeSwing',  x: 830, y: 400 },
        { kind: 'plant',      x: 860, y: 470 }
      ],
      doors: [
        { x: 424, y: 540, w: 92, h: 30, to: 'outside', spawn: [178, 348], art: 'mat', label: 'Climb Down' }
      ],
      stations: [
        { kind: 'telescope',  x: 700, y: 196, w: 40, h: 42, label: 'Look Out' },
        { kind: 'snackStash', x: 470, y: 196, w: 54, h: 42, label: 'Snacks' },
        { kind: 'window',     x: 160, y: 176, w: 96, h: 44 },
        { kind: 'beanbag',    x: 180, y: 424, w: 56, h: 40, label: 'Flop Down' },
        { kind: 'bed',        x: 300, y: 470, w: 84, h: 40, lie: [342, 506], wake: [342, 534] }
      ]
    }
  };

  /* Flavour lines, keyed by station kind, for stations whose act does not
   * speak for itself. A list means one is picked at random. */
  W.LINES = {
    telescope:  ['I can see the whole neighborhood!', 'Is that a UFO? Oh — that is mine.'],
    snackStash: ['Secret treehouse snacks.', 'Do not tell anyone about these.'],
    beanbag:    ['Flooomp.', 'I could stay here all day.']
  };

  /* Friends who can be met and recruited. */
  W.FRIENDS = {
    panda:      { char: 'panda',      name: 'Panda',      mood: '#3E8F72', personality: 'loud',  likes: 'cake' },
    yuna:       { char: 'yuna',       name: 'Yuna',       mood: '#E8578F', personality: 'kind',  likes: 'bread' },
    butterball: { char: 'butterball', name: 'Butterball', mood: '#2E7FD4', personality: 'silly', likes: 'boba' },
    critterA:   { char: 'critter',    name: 'Pip',        mood: '#C94FD6', personality: 'shy', tint: '#C94FD6', likes: 'surprise' },
    critterB:   { char: 'critter',    name: 'Pop',        mood: '#F2A03D', personality: 'shy', tint: '#F2C14E', likes: 'friedEgg' },
    critterC:   { char: 'critter',    name: 'Puff',       mood: '#3B7FD4', personality: 'shy', tint: '#5FA8E8', likes: 'fish' }
  };
})(window.W);
