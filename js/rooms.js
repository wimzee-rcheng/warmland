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
        { kind: 'critterBox',  x: 700, y: 250, buildSite: 'critterBox', marker: 'CRITTER BOX' },
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
        { kind: 'lamp',      x: 618, y: 396, w: 46,  h: 40 },
        { kind: 'critterBox', x: 700, y: 272, w: 96, h: 42 }
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
        { kind: 'chair',       x: 432, y: 516 },
        { kind: 'plant',       x: 866, y: 300 }
      ],
      doors: [
        { x: 60,  y: 118, w: 84, h: 40, to: 'living', spawn: [642, 232], art: 'wall', label: 'Living Room' },
        { x: 168, y: 540, w: 92, h: 30, to: 'backyard', spawn: [480, 500], art: 'mat', label: 'Backyard' }
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
        { kind: 'chair',       x: 522, y: 408, w: 34, h: 32 },
        { kind: 'chair',       x: 432, y: 516, w: 34, h: 32 }
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
        { kind: 'tree',    x: 140, y: 250 },
        { kind: 'tree',    x: 862, y: 260 },
        { kind: 'mailbox', x: 300, y: 292, tint: '#4F8FD6' },
        { kind: 'mailbox', x: 300, y: 352, tint: '#F2C14E' },
        { kind: 'trashCan', x: 560, y: 300 },
        { kind: 'flower',  x: 700, y: 300, tint: '#E8A0B4' },
        { kind: 'flower',  x: 742, y: 330, tint: '#F2C14E' },
        { kind: 'flower',  x: 640, y: 356, tint: '#B48FD6' },
        { kind: 'flower',  x: 320, y: 520, tint: '#E8A0B4' },
        { kind: 'ufo',     x: 600, y: 424 },
        { kind: 'car',     x: 120, y: 452 },
        { kind: 'balloon', x: 745, y: 178 }
      ],
      doors: [
        { x: 434, y: 218, w: 66, h: 34, to: 'living', spawn: [484, 512], art: 'mat', label: 'Go Inside' },
        { x: 894, y: 300, w: 40, h: 200, to: 'park',  spawn: [150, 430],  art: 'sign', label: 'Park' },
        { x: 26,  y: 250, w: 40, h: 130, to: 'shop',    spawn: [480, 520], art: 'sign', label: 'Ice Cream' },
        { x: 26,  y: 410, w: 40, h: 130, to: 'grocery', spawn: [480, 520], art: 'sign', label: 'Grocery' }
      ],
      stations: [
        { kind: 'mailbox', x: 300, y: 314, w: 34, h: 40 },
        { kind: 'mailbox', x: 300, y: 374, w: 34, h: 40 },
        { kind: 'trash',   x: 560, y: 322, w: 40, h: 36 },
        { kind: 'vehicle', vehicle: 'ufo',     x: 600, y: 424, w: 170, h: 76 },
        { kind: 'vehicle', vehicle: 'car',     x: 120, y: 452, w: 150, h: 66 },
        { kind: 'vehicle', vehicle: 'balloon', x: 745, y: 178, w: 130, h: 60 }
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
        { kind: 'seesaw',   x: 240, y: 300, buildSite: 'seesaw', marker: 'SEE-SAW SPOT' },
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
        { kind: 'swingRide', x: 690, y: 452, w: 120, h: 40 },
        { kind: 'seesawRide', x: 240, y: 314, w: 140, h: 44 },
        { kind: 'cartPitch', x: 420, y: 400, w: 130, h: 46 },
        { kind: 'fishing',   x: 110, y: 288, w: 140, h: 40 },
        { kind: 'petBox',    x: 800, y: 240, w: 60, h: 44 },
        { kind: 'trash',     x: 880, y: 492, w: 40, h: 36 }
      ],
      residents: ['panda', 'yuna', 'critterA', 'critterB', 'critterC'],
      crowd: 5
    },

    shop: {
      name: 'BOBBYBEAR Ice Cream', floor: 'tile', wallH: 150, wallColor: '#F5DFC4',
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      spawn: [480, 520],
      props: [
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
        { kind: 'flavorTub', flavor: 'vanilla',    x: 300, y: 204, w: 44, h: 42 },
        { kind: 'flavorTub', flavor: 'chocolate',  x: 348, y: 204, w: 44, h: 42 },
        { kind: 'flavorTub', flavor: 'strawberry', x: 396, y: 204, w: 44, h: 42 },
        { kind: 'bobaMachine', x: 700, y: 204, w: 52,  h: 42 }
      ]
    },

    /* The yard out back: everything that grows lives here now, so the front
     * lawn can just be a lawn. */
    backyard: {
      name: 'The Backyard', floor: 'grass', wallH: 0, outdoor: true,
      bounds: { x: 40, y: 214, w: 880, h: 352 },
      spawn: [480, 500],
      decorSpots: [[300, 470], [820, 300], [180, 300]],
      props: [
        { kind: 'fence', x: 44,  y: 214 },
        { kind: 'fence', x: 140, y: 214 },
        { kind: 'fence', x: 236, y: 214 },
        { kind: 'fence', x: 332, y: 214 },
        { kind: 'fence', x: 428, y: 214 },
        { kind: 'fence', x: 524, y: 214 },
        { kind: 'fence', x: 620, y: 214 },
        { kind: 'fence', x: 716, y: 214 },
        { kind: 'fence', x: 812, y: 214 },
        { kind: 'tree',     x: 130, y: 300, buildable: true },
        { kind: 'spigot',   x: 420, y: 262 },
        { kind: 'toolRack', x: 300, y: 268 },
        { kind: 'gardenPlot', x: 600, y: 300, plot: 'plotA' },
        { kind: 'gardenPlot', x: 700, y: 360, plot: 'plotB' },
        { kind: 'gardenPlot', x: 600, y: 420, plot: 'plotC' },
        { kind: 'flower',   x: 840, y: 470, tint: '#F2C14E' },
        { kind: 'flower',   x: 200, y: 500, tint: '#E8A0B4' },
        { kind: 'trashCan', x: 860, y: 250 }
      ],
      doors: [
        { x: 434, y: 540, w: 92, h: 30, to: 'kitchen', spawn: [214, 508], art: 'mat', label: 'Kitchen' }
      ],
      stations: [
        { kind: 'toolRack', x: 300, y: 300, w: 74, h: 40 },
        { kind: 'spigot',   x: 420, y: 288, w: 46, h: 40 },
        { kind: 'garden', id: 'plotA', x: 600, y: 300, w: 70, h: 48 },
        { kind: 'garden', id: 'plotB', x: 700, y: 360, w: 70, h: 48 },
        { kind: 'garden', id: 'plotC', x: 600, y: 420, w: 70, h: 48 },
        { kind: 'trash',  x: 860, y: 272, w: 40, h: 36 },
        { kind: 'tree',   x: 126, y: 344, w: 72, h: 44 }
      ]
    },

    // ================================================= WARMLAND 2
    /* Butterball's front yard: the trunk-house, his popcorn car and his
     * own hot-air balloon. */
    outside2: {
      name: "Butterball's Tree", floor: 'grass', wallH: 0, outdoor: true,
      bounds: { x: 30, y: 300, w: 900, h: 266 },
      spawn: [480, 470],
      decorSpots: [[180, 470], [800, 400], [700, 520]],
      props: [
        { kind: 'treehome',  x: 350, y: 366 },
        { kind: 'path',      x: 446, y: 366 },
        { kind: 'blueSign',  x: 130, y: 420, tint: 'HOME' },
        { kind: 'tree',      x: 60,  y: 330 },
        { kind: 'tree',      x: 880, y: 340 },
        { kind: 'mailbox',   x: 250, y: 430, tint: '#5A3FA8' },
        { kind: 'trashCan',  x: 840, y: 470 },
        { kind: 'flower',    x: 300, y: 520, tint: '#F2C14E' },
        { kind: 'flower',    x: 640, y: 480, tint: '#5A3FA8' },
        { kind: 'popcar',    x: 120, y: 470 },
        { kind: 'balloon2',  x: 740, y: 360 }
      ],
      doors: [
        { x: 442, y: 400, w: 76, h: 34, to: 'home2', spawn: [480, 480], art: 'mat', label: 'Go Inside' }
      ],
      stations: [
        { kind: 'mailbox', x: 250, y: 452, w: 34, h: 40 },
        { kind: 'trash',   x: 840, y: 492, w: 40, h: 36 },
        { kind: 'vehicle', vehicle: 'popcar',  x: 120, y: 470, w: 150, h: 66 },
        { kind: 'vehicle', vehicle: 'balloon2', map: 'warmland2', x: 740, y: 360, w: 130, h: 60 }
      ]
    },

    /* Inside the trunk — the same cosy plank feel as Bobby's treehouse,
     * with the magic closet so every outfit works here too. */
    home2: {
      name: 'Inside the Tree', floor: 'planks', wallH: 140, wallColor: '#9E7A50',
      frame: 'leaves',
      bounds: { x: 150, y: 190, w: 660, h: 336 },
      spawn: [480, 480],
      decorSpots: [[560, 400], [300, 300], [660, 470]],
      props: [
        { kind: 'bunting',    x: 320, y: 214 },
        { kind: 'roundWindow', x: 660, y: 250 },
        { kind: 'lantern',    x: 470, y: 250 },
        { kind: 'closet',     x: 250, y: 210 },
        { kind: 'bed',        x: 570, y: 300 },
        { kind: 'bookshelf',  x: 380, y: 210 },
        { kind: 'rugRound',   x: 380, y: 400 },
        { kind: 'beanbag',    x: 240, y: 420, tint: '#5A3FA8' },
        { kind: 'plant',      x: 760, y: 470 },
        { kind: 'ropeRail',   x: 200, y: 520 },
        { kind: 'ropeRail',   x: 620, y: 520 }
      ],
      doors: [
        { x: 434, y: 492, w: 92, h: 30, to: 'outside2', spawn: [480, 490], art: 'mat', label: 'Climb Down' },
        { x: 700, y: 156, w: 84, h: 40, to: 'kitchen2', spawn: [826, 272], art: 'wall', label: 'Kitchen' }
      ],
      stations: [
        { kind: 'closet',      x: 250, y: 242, w: 86, h: 44 },
        { kind: 'roundWindow', x: 660, y: 218, w: 84, h: 44 },
        { kind: 'lamp',        x: 470, y: 200, w: 40, h: 40, label: 'Lantern' },
        { kind: 'bookshelf',   x: 380, y: 238, w: 96, h: 40 },
        { kind: 'beanbag',     x: 240, y: 464, w: 56, h: 40, label: 'Flop Down' },
        { kind: 'bed',         x: 570, y: 454, w: 110, h: 44, lie: [625, 436], wake: [625, 490] }
      ],
      // when Bobby is the one playing, Butterball is at home in his own tree
      residents: ['butterball']
    },

    /* The tree kitchen: the whole cooking loop, laid out fresh. */
    kitchen2: {
      name: 'Tree Kitchen', floor: 'planks', wallH: 150, wallColor: '#A88A5E',
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      spawn: [826, 272],
      props: [
        { kind: 'fridge',      x: 80,  y: 158 },
        { kind: 'cabinet',     x: 190, y: 158 },
        { kind: 'counter',     x: 340, y: 158 },
        { kind: 'stove',       x: 520, y: 158 },
        { kind: 'recipePoster', x: 620, y: 150 },
        { kind: 'bobaMachine', x: 720, y: 160 },
        { kind: 'dresser',     x: 840, y: 400 },
        { kind: 'trashCan',    x: 844, y: 300 },
        { kind: 'table',       x: 400, y: 396 },
        { kind: 'chair',       x: 344, y: 408 },
        { kind: 'chair',       x: 522, y: 408 },
        { kind: 'chair',       x: 432, y: 516 },
        { kind: 'plant',       x: 60,  y: 470 }
      ],
      doors: [
        { x: 820, y: 118, w: 84, h: 40, to: 'home2', spawn: [700, 240], art: 'wall', label: 'Inside the Tree' }
      ],
      stations: [
        { kind: 'fridge',      x: 80,  y: 202, w: 74, h: 42 },
        { kind: 'cabinet',     x: 190, y: 202, w: 116, h: 42 },
        { kind: 'sink',        x: 340, y: 206, w: 82, h: 42, label: 'Sink' },
        { kind: 'counter',     x: 430, y: 206, w: 78, h: 42 },
        { kind: 'stove',       x: 520, y: 204, w: 76, h: 42 },
        { kind: 'recipePoster', x: 620, y: 170, w: 74, h: 34 },
        { kind: 'bobaMachine', x: 720, y: 202, w: 52, h: 42 },
        { kind: 'cupboard',    x: 840, y: 432, w: 84, h: 40 },
        { kind: 'trash',       x: 844, y: 322, w: 40, h: 36 },
        { kind: 'table',       x: 400, y: 440, w: 96, h: 60 },
        { kind: 'chair',       x: 344, y: 408, w: 34, h: 32 },
        { kind: 'chair',       x: 522, y: 408, w: 34, h: 32 },
        { kind: 'chair',       x: 432, y: 516, w: 34, h: 32 }
      ]
    },

    /* Warmland 2's park: Galaxy, the scaly critters, and a free dino. */
    park2: {
      name: 'The Park', floor: 'grass', wallH: 0, outdoor: true,
      bounds: { x: 30, y: 150, w: 900, h: 416 },
      spawn: [160, 430],
      props: [
        { kind: 'tree',      x: 120, y: 180 },
        { kind: 'tree',      x: 830, y: 200 },
        { kind: 'tree',      x: 300, y: 500 },
        { kind: 'bench',     x: 420, y: 210 },
        { kind: 'lamppost',  x: 640, y: 180 },
        { kind: 'dinoBox',   x: 760, y: 380 },
        { kind: 'pitchMark', x: 420, y: 400, tint: 'WAGON SPOT' },
        { kind: 'trashCan',  x: 880, y: 470 },
        { kind: 'flower',    x: 220, y: 330, tint: '#5A3FA8' },
        { kind: 'flower',    x: 560, y: 340, tint: '#F2C14E' },
        { kind: 'flower',    x: 700, y: 520, tint: '#E8A0B4' }
      ],
      doors: [
        { x: 30, y: 300, w: 46, h: 200, map: 'warmland2', art: 'sign', label: 'Exit' }
      ],
      stations: [
        { kind: 'dinoBox',   x: 760, y: 424, w: 84, h: 44 },
        { kind: 'cartPitch', x: 420, y: 402, w: 130, h: 46 },
        { kind: 'trash',     x: 880, y: 492, w: 40, h: 36 }
      ],
      residents: ['scalyA', 'scalyB', 'scalyC'],
      crowd: 4
    },

    /* Warmland 2's building site: the same machines, a much taller job. */
    site2: {
      name: 'The Tower Site', floor: 'dirt', wallH: 0, outdoor: true,
      bounds: { x: 40, y: 200, w: 880, h: 366 },
      spawn: [480, 520],
      props: [
        { kind: 'towerS0',   x: 370, y: 300, tower: true },
        { kind: 'towerGlass1', x: 370, y: 300, glaze: true },
        { kind: 'bulldozer', x: 60,  y: 300, untilBuilt: 'skyscraper' },
        { kind: 'mixer',     x: 240, y: 452, untilBuilt: 'skyscraper' },
        { kind: 'crane',     x: 760, y: 320, untilBuilt: 'skyscraper' },
        { kind: 'toolbox',   x: 800, y: 492, untilBuilt: 'skyscraper' },
        { kind: 'wreckingBall', x: 620, y: 520, needsBuilt: 'skyscraper' },
        { kind: 'signpost',  x: 130, y: 250, tint: 'BUILD IT UP!' },
        { kind: 'pitchMark', x: 110, y: 520, tint: 'DRIVE HOME' },
        { kind: 'popcar',    x: 120, y: 470 },
        { kind: 'fence',     x: 44,  y: 200 },
        { kind: 'fence',     x: 140, y: 200 },
        { kind: 'fence',     x: 236, y: 200 },
        { kind: 'fence',     x: 620, y: 200 },
        { kind: 'fence',     x: 716, y: 200 },
        { kind: 'fence',     x: 812, y: 200 }
      ],
      doors: [],
      stations: [
        { kind: 'vehicle', vehicle: 'popcar', x: 120, y: 470, w: 150, h: 66 },
        { kind: 'machine', machine: 'bulldozer', project: 'skyscraper', untilBuilt: 'skyscraper', x: 60,  y: 322, w: 130, h: 44 },
        { kind: 'machine', machine: 'mixer',     project: 'skyscraper', untilBuilt: 'skyscraper', x: 240, y: 474, w: 132, h: 44 },
        { kind: 'machine', machine: 'crane',     project: 'skyscraper', untilBuilt: 'skyscraper', x: 760, y: 342, w: 150, h: 44 },
        { kind: 'toolbox',   project: 'skyscraper', untilBuilt: 'skyscraper', x: 800, y: 512, w: 84,  h: 40 },
        { kind: 'wreckingBall', project: 'skyscraper', needsBuilt: 'skyscraper', x: 620, y: 542, w: 120, h: 44 },
        { kind: 'houseDoor',    project: 'skyscraper', x: 452, y: 340, w: 60,  h: 40 }
      ]
    },

    /* The theme park: a merry-go-round, a coaster you build yourself, and
     * a tent full of arcade cabinets. */
    themepark: {
      name: 'The Theme Park', floor: 'grass', wallH: 0, outdoor: true,
      bounds: { x: 40, y: 200, w: 880, h: 366 },
      spawn: [480, 520],
      decorSpots: [[130, 300], [860, 300]],
      props: [
        { kind: 'carousel',    x: 120, y: 300 },
        { kind: 'coasterDeck', x: 400, y: 300 },
        { kind: 'fairTent',    x: 700, y: 300, tint: 'ARCADE' },
        { kind: 'flower',      x: 240, y: 480, tint: '#E8A0B4' },
        { kind: 'flower',      x: 620, y: 470, tint: '#F2C14E' },
        { kind: 'trashCan',    x: 880, y: 470 },
        { kind: 'blueSign',    x: 60,  y: 470, tint: 'FUN!' }
      ],
      doors: [
        { x: 434, y: 534, w: 92, h: 32, map: 'warmland2', art: 'mat', label: 'Exit' }
      ],
      stations: [
        { kind: 'carousel',  x: 120, y: 330, w: 220, h: 46 },
        { kind: 'coaster',   x: 400, y: 332, w: 190, h: 46 },
        { kind: 'arcadeDoor', x: 730, y: 322, w: 140, h: 46 },
        { kind: 'trash',     x: 880, y: 492, w: 40, h: 36 }
      ]
    },

    /* Inside the tent: four cabinets, four old favourites. */
    arcade: {
      name: 'The Arcade', floor: 'tile', wallH: 150, wallColor: '#3E3654',
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      spawn: [480, 500],
      props: [
        { kind: 'arcadeCab', x: 140, y: 300, tint: '#5A4A9E' },
        { kind: 'arcadeCab', x: 340, y: 300, tint: '#4A6FC4' },
        { kind: 'arcadeCab', x: 540, y: 300, tint: '#6FA84B' },
        { kind: 'arcadeCab', x: 740, y: 300, tint: '#D9402F' },
        { kind: 'plant',   x: 860, y: 470 },
        { kind: 'rugRound', x: 400, y: 420 }
      ],
      doors: [
        { x: 434, y: 540, w: 92, h: 30, to: 'themepark', spawn: [700, 430], art: 'mat', label: 'Outside' }
      ],
      stations: [
        { kind: 'arcadeCab', game: 'lob',    x: 140, y: 330, w: 70, h: 42 },
        { kind: 'arcadeCab', game: 'bounce', x: 340, y: 330, w: 70, h: 42 },
        { kind: 'arcadeCab', game: 'hop',    x: 540, y: 330, w: 70, h: 42 },
        { kind: 'arcadeCab', game: 'chain',  x: 740, y: 330, w: 70, h: 42 }
      ]
    },

    /* Outside the haunted house: always dusk, always a bit spooky, never
     * actually scary. */
    graveyard: {
      name: 'The Graveyard', floor: 'grass', wallH: 0, outdoor: true, canNight: true,
      spooky: true,
      bounds: { x: 40, y: 220, w: 880, h: 346 },
      spawn: [160, 470],
      props: [
        { kind: 'hauntHouse',  x: 340, y: 236 },
        { kind: 'deadTree',    x: 90,  y: 320 },
        { kind: 'deadTree',    x: 800, y: 300 },
        { kind: 'gravestone',  x: 220, y: 360, tint: 'BOO' },
        { kind: 'gravestone',  x: 330, y: 430, tint: 'EEK' },
        { kind: 'gravestone',  x: 180, y: 500, tint: 'RIP' },
        { kind: 'gravestone',  x: 640, y: 420, tint: 'OOO' },
        { kind: 'ironFence',   x: 40,  y: 240 },
        { kind: 'ironFence',   x: 140, y: 240 },
        { kind: 'ironFence',   x: 240, y: 240 },
        { kind: 'ironFence',   x: 620, y: 240 },
        { kind: 'ironFence',   x: 720, y: 240 },
        { kind: 'ironFence',   x: 820, y: 240 }
      ],
      doors: [
        { x: 434, y: 312, w: 92, h: 34, to: 'haunt1', spawn: [480, 500], art: 'mat', label: 'The Hallway' },
        { x: 26,  y: 320, w: 40, h: 200, map: 'warmland2', art: 'sign', label: 'Exit' }
      ],
      stations: []
    },

    /* The maze: three rooms of wall segments, six sad ghosts. */
    haunt1: {
      name: 'The Hallway', floor: 'wood', wallH: 150, wallColor: '#5A5468', spooky: true,
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      spawn: [480, 500],
      props: [
        { kind: 'hauntWall', x: 200, y: 400, tint: 'web' },
        { kind: 'hauntWall', x: 320, y: 400 },
        { kind: 'hauntWall', x: 560, y: 400, tint: 'candle' },
        { kind: 'hauntWall', x: 680, y: 400 },
        { kind: 'hauntWall', x: 120, y: 300 },
        { kind: 'hauntWall', x: 760, y: 300, tint: 'web' },
        { kind: 'bookshelf', x: 430, y: 158 }
      ],
      doors: [
        { x: 434, y: 540, w: 92, h: 30, to: 'graveyard', spawn: [480, 390], art: 'mat', label: 'The Graveyard' },
        { x: 60,  y: 118, w: 84, h: 40, to: 'haunt2', spawn: [862, 210], art: 'wall', label: 'The Old Kitchen' },
        { x: 820, y: 118, w: 84, h: 40, to: 'haunt3', spawn: [102, 210], art: 'wall', label: 'The Attic' }
      ],
      stations: [
        { kind: 'bookshelf', x: 430, y: 186, w: 96, h: 40 }
      ],
      ghosts: ['g1', 'g2']
    },

    haunt2: {
      name: 'The Old Kitchen', floor: 'tile', wallH: 150, wallColor: '#4E5A5A', spooky: true,
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      spawn: [862, 210],
      props: [
        { kind: 'hauntWall', x: 300, y: 380, tint: 'candle' },
        { kind: 'hauntWall', x: 420, y: 380 },
        { kind: 'hauntWall', x: 160, y: 480, tint: 'web' },
        { kind: 'hauntWall', x: 620, y: 300 },
        { kind: 'counter',   x: 250, y: 158 },
        { kind: 'stove',     x: 500, y: 158 },
        { kind: 'shopTable', x: 700, y: 460 }
      ],
      doors: [
        { x: 820, y: 118, w: 84, h: 40, to: 'haunt1', spawn: [102, 210], art: 'wall', label: 'The Hallway' },
        { x: 434, y: 540, w: 92, h: 30, to: 'haunt4', spawn: [480, 500], art: 'mat', label: 'The Laboratory' }
      ],
      stations: [],
      ghosts: ['g3', 'g4']
    },

    haunt3: {
      name: 'The Attic', floor: 'wood', wallH: 150, wallColor: '#5E5060', spooky: true,
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      spawn: [102, 210],
      props: [
        { kind: 'hauntWall', x: 240, y: 340, tint: 'web' },
        { kind: 'hauntWall', x: 520, y: 460 },
        { kind: 'hauntWall', x: 640, y: 460, tint: 'candle' },
        { kind: 'toybox',    x: 700, y: 300 },
        { kind: 'dresser',   x: 300, y: 158 },
        { kind: 'window',    x: 520, y: 150 }
      ],
      doors: [
        { x: 60,  y: 118, w: 84, h: 40, to: 'haunt1', spawn: [862, 210], art: 'wall', label: 'The Hallway' }
      ],
      stations: [
        { kind: 'toybox', x: 700, y: 342, w: 64, h: 40 },
        { kind: 'window', x: 520, y: 176, w: 96, h: 44 }
      ],
      ghosts: ['g5', 'g6']
    },

    /* Down the cellar steps: Webs' laboratory, which is also a bar. */
    haunt4: {
      name: 'The Laboratory', floor: 'tile', wallH: 150, wallColor: '#3E4A46',
      spooky: true,
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      spawn: [480, 500],
      props: [
        { kind: 'labBar',     x: 370, y: 300 },
        { kind: 'flaskShelf', x: 180, y: 190 },
        { kind: 'flaskShelf', x: 660, y: 190 },
        { kind: 'hauntWall',  x: 120, y: 420, tint: 'web' },
        { kind: 'hauntWall',  x: 760, y: 420, tint: 'candle' },
        { kind: 'bookshelf',  x: 420, y: 158 },
        { kind: 'trashCan',   x: 860, y: 500 }
      ],
      doors: [
        { x: 434, y: 540, w: 92, h: 30, to: 'haunt2', spawn: [480, 500], art: 'mat', label: 'The Old Kitchen' }
      ],
      stations: [
        { kind: 'potionBar', x: 400, y: 356, w: 160, h: 44 },
        { kind: 'bookshelf', x: 420, y: 186, w: 96, h: 40 },
        { kind: 'trash',     x: 860, y: 522, w: 40, h: 36 }
      ],
      residents: ['webs'],
      residentSpots: { webs: [480, 206] }
    },

    /* The building site: four machines, one house, and a wrecking ball for
     * when everyone fancies doing it all again. */
    site: {
      name: 'The Building Site', floor: 'dirt', wallH: 0, outdoor: true,
      bounds: { x: 40, y: 200, w: 880, h: 366 },
      spawn: [480, 520],
      props: [
        { kind: 'houseS0',   x: 370, y: 300, stage: true },
        { kind: 'bulldozer', x: 60,  y: 300, untilBuilt: 'friendHouse' },
        { kind: 'mixer',     x: 240, y: 430, untilBuilt: 'friendHouse' },
        { kind: 'crane',     x: 760, y: 320, untilBuilt: 'friendHouse' },
        { kind: 'toolbox',   x: 800, y: 470, untilBuilt: 'friendHouse' },
        { kind: 'wreckingBall', x: 620, y: 520, needsBuilt: 'friendHouse' },
        { kind: 'pitchMark', x: 110, y: 520, tint: 'DRIVE HOME' },
        { kind: 'car',       x: 120, y: 470 },
        { kind: 'signpost',  x: 160, y: 268, tint: 'BUILD IT!' },
        { kind: 'fence',     x: 44,  y: 200 },
        { kind: 'fence',     x: 140, y: 200 },
        { kind: 'fence',     x: 236, y: 200 },
        { kind: 'fence',     x: 332, y: 200 },
        { kind: 'fence',     x: 428, y: 200 },
        { kind: 'fence',     x: 524, y: 200 },
        { kind: 'fence',     x: 620, y: 200 },
        { kind: 'fence',     x: 716, y: 200 },
        { kind: 'fence',     x: 812, y: 200 }
      ],
      doors: [],
      stations: [
        { kind: 'vehicle', vehicle: 'car', x: 120, y: 470, w: 150, h: 66 },
        { kind: 'machine', machine: 'bulldozer', untilBuilt: 'friendHouse', x: 60,  y: 322, w: 130, h: 44 },
        { kind: 'machine', machine: 'mixer',     untilBuilt: 'friendHouse', x: 240, y: 452, w: 132, h: 44 },
        { kind: 'machine', machine: 'crane',     untilBuilt: 'friendHouse', x: 760, y: 342, w: 150, h: 44 },
        { kind: 'toolbox',   untilBuilt: 'friendHouse', x: 800, y: 492, w: 84,  h: 40 },
        { kind: 'wreckingBall', needsBuilt: 'friendHouse', x: 620, y: 542, w: 120, h: 44 },
        { kind: 'houseDoor',    x: 452, y: 340, w: 60,  h: 40 }
      ]
    },

    /* Where Panda and Yuna live once their house is finished. */
    friendhouse: {
      name: "Panda & Yuna's House", floor: 'wood', wallH: 150, wallColor: '#EFE0C4',
      bounds: { x: 120, y: 160, w: 720, h: 400 },
      spawn: [470, 490],
      decorSpots: [[700, 400], [230, 300]],
      props: [
        { kind: 'bed',         x: 180, y: 250, tint: '#7FBFA8' },
        { kind: 'bed',         x: 620, y: 250, tint: '#E8A0B4' },
        { kind: 'rugRound',    x: 380, y: 380 },
        { kind: 'coffeeTable', x: 396, y: 300 },
        { kind: 'chair',       x: 340, y: 314 },
        { kind: 'chair',       x: 508, y: 314 },
        { kind: 'bookshelf',   x: 660, y: 152 },
        { kind: 'window',      x: 400, y: 152 },
        { kind: 'plant',       x: 790, y: 470 },
        { kind: 'lamp',        x: 250, y: 440 }
      ],
      doors: [
        { x: 434, y: 536, w: 92, h: 28, to: 'site', spawn: [480, 430], art: 'mat', label: 'Outside' }
      ],
      stations: [
        { kind: 'window', x: 400, y: 178, w: 96, h: 44 },
        { kind: 'lamp',   x: 238, y: 464, w: 46, h: 40 },
        { kind: 'chair',  x: 340, y: 314, w: 34, h: 32 },
        { kind: 'chair',  x: 508, y: 314, w: 34, h: 32 },
        { kind: 'bookshelf', x: 660, y: 180, w: 96, h: 40 }
      ]
      // no `residents` here on purpose: Panda and Yuna only move in once
      // the house is actually finished (the site station rehomes them).
    },

    /* Everything that isn't ice cream: seeds, pet food and furniture. */
    grocery: {
      name: 'Warmland Grocery', floor: 'tile', wallH: 150, wallColor: '#F0E4C8',
      bounds: { x: 46, y: 152, w: 868, h: 412 },
      spawn: [480, 520],
      props: [
        { kind: 'aisleSign',   x: 90,  y: 150, tint: 'SEEDS' },
        { kind: 'aisleSign',   x: 380, y: 150, tint: 'PET FOOD' },
        { kind: 'aisleSign',   x: 700, y: 150, tint: 'FURNITURE' },
        { kind: 'pantryShelf', x: 80,  y: 258 },
        { kind: 'pantryShelf', x: 380, y: 258 },
        { kind: 'dresser',     x: 660, y: 258 },
        { kind: 'bookshelf',   x: 780, y: 258 },
        { kind: 'plant',       x: 866, y: 470 },
        { kind: 'rugRound',    x: 300, y: 430 }
      ],
      crowd: 3,
      doors: [
        { x: 434, y: 540, w: 92, h: 30, to: 'outside', spawn: [80, 480], art: 'mat', label: 'Outside' }
      ],
      stations: [
        { kind: 'seedStand',  x: 90,  y: 304, w: 70, h: 42 },
        { kind: 'treatStand', x: 390, y: 304, w: 66, h: 42 },
        { kind: 'decorShop',  x: 670, y: 304, w: 120, h: 42 }
      ]
    },

    mountain: {
      name: 'Crystal Mountain', floor: 'snow', wallH: 0, outdoor: true, canNight: true,
      bounds: { x: 40, y: 190, w: 880, h: 376 },
      spawn: [480, 430],
      props: [
        { kind: 'crystalSpike', x: 90,  y: 200 },
        { kind: 'crystalSpike', x: 300, y: 176 },
        { kind: 'crystalSpike', x: 620, y: 180 },
        { kind: 'crystalSpike', x: 830, y: 206 },
        { kind: 'snowRock',     x: 210, y: 300 },
        { kind: 'snowRock',     x: 96,  y: 500 },
        // the rock field lives on the left; the campsite has the right
        { kind: 'crackRock',    x: 70,  y: 300 },
        { kind: 'crackRock',    x: 170, y: 380 },
        { kind: 'crackRock',    x: 96,  y: 220 },
        { kind: 'crackRock',    x: 250, y: 470 },
        { kind: 'crackRock',    x: 330, y: 250 },
        { kind: 'crackRock',    x: 180, y: 530 },
        { kind: 'balloon',      x: 430, y: 470 },
        { kind: 'signpost',     x: 380, y: 546, tint: 'FLY HOME' },
        { kind: 'firepit',      x: 690, y: 372 },
        { kind: 'stickPile',    x: 596, y: 330 },
        { kind: 'campLog',      x: 552, y: 396 },
        { kind: 'campLog',      x: 800, y: 300 },
        { kind: 'pitchMark',    x: 736, y: 452, tint: 'TENT SPOT' },
        { kind: 'tent',         x: 756, y: 444, tint: '#E8834E', buildSite: 'camp' },
        { kind: 'sleepingBag',  x: 556, y: 486, tint: '#7FA8D8', buildSite: 'camp' }
      ],
      doors: [],
      stations: [
        { kind: 'breakRock', id: 'rock1', x: 70,  y: 300, w: 58, h: 36 },
        { kind: 'breakRock', id: 'rock2', x: 170, y: 380, w: 58, h: 36 },
        { kind: 'breakRock', id: 'rock3', x: 96,  y: 220, w: 58, h: 36 },
        { kind: 'breakRock', id: 'rock4', x: 250, y: 470, w: 58, h: 36 },
        { kind: 'breakRock', id: 'rock5', x: 330, y: 250, w: 58, h: 36 },
        { kind: 'breakRock', id: 'rock6', x: 180, y: 530, w: 58, h: 36 },
        { kind: 'vehicle', vehicle: 'balloon', map: 'crystalMountain', x: 400, y: 510, w: 190, h: 56 },
        { kind: 'firepit',   x: 690, y: 392, w: 90, h: 50 },
        { kind: 'stickPile', x: 596, y: 352, w: 60, h: 34 },
        { kind: 'campSetup', x: 736, y: 470, w: 130, h: 46 },
        { kind: 'bed',       x: 556, y: 512, w: 84, h: 40, lie: [598, 542], wake: [520, 470],
          label: 'Sleep under the stars' }
      ]
    },

    treehouse: {
      name: 'The Treehouse', floor: 'planks', wallH: 132, wallColor: '#9E7A50',
      frame: 'leaves',
      bounds: { x: 150, y: 186, w: 660, h: 330 },
      decorSpots: [[520, 400], [640, 460], [330, 300]],
      spawn: [470, 470],
      props: [
        { kind: 'bunting',    x: 320, y: 214 },
        { kind: 'roundWindow', x: 190, y: 250 },
        { kind: 'lantern',    x: 452, y: 250 },
        { kind: 'telescope',  x: 690, y: 200 },
        { kind: 'snackStash', x: 570, y: 202 },
        { kind: 'branch',     x: 640, y: 320 },
        { kind: 'beanbag',    x: 220, y: 366, tint: '#B48FD6' },
        { kind: 'tent',       x: 520, y: 300, tint: '#E8834E' },
        { kind: 'sleepingBag', x: 250, y: 440, tint: '#F2C14E' },
        { kind: 'ropeRail',   x: 176, y: 516 },
        { kind: 'ropeRail',   x: 640, y: 516 }
      ],
      doors: [
        { x: 424, y: 486, w: 92, h: 28, to: 'backyard', spawn: [168, 398], art: 'mat', label: 'Climb Down' }
      ],
      stations: [
        { kind: 'telescope',  x: 690, y: 238, w: 40, h: 42, label: 'Look Out' },
        { kind: 'snackStash', x: 570, y: 240, w: 54, h: 42, label: 'Snacks' },
        { kind: 'roundWindow', x: 190, y: 218, w: 84, h: 44 },
        { kind: 'lamp',       x: 452, y: 200, w: 40, h: 40, label: 'Lantern' },
        { kind: 'beanbag',    x: 220, y: 410, w: 56, h: 40, label: 'Flop Down' },
        { kind: 'bed',        x: 250, y: 440, w: 84, h: 40, lie: [292, 476], wake: [292, 504] }
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
    critterC:   { char: 'critter',    name: 'Puff',       mood: '#3B7FD4', personality: 'shy', tint: '#5FA8E8', likes: 'fish' },

    /* Warmland 2 */
    galaxy:     { char: 'galaxy',     name: 'Galaxy',     mood: '#5A3FA8', personality: 'silly', likes: 'cake' },
    scalyA:     { char: 'scaly',      name: 'Snip',       mood: '#7FB05A', personality: 'shy', tint: '#7FB05A', likes: 'surprise' },
    scalyB:     { char: 'scaly',      name: 'Scoot',      mood: '#5E9E7A', personality: 'shy', tint: '#5E9E7A', likes: 'friedEgg' },
    scalyC:     { char: 'scaly',      name: 'Sunny',      mood: '#C7B44E', personality: 'shy', tint: '#C7B44E', likes: 'bread' },
    webs:       { char: 'spider',     name: 'Webs',       mood: '#8F6BA8', personality: 'kind', likes: 'cake' }
  };

  /* Which character art each adopted pet uses. */
  W.PET_CHARS = { mochi: 'pet', cracker: 'dino' };
})(window.W);
