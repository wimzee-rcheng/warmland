# Warmland

A browser game for kids starring **Bobby Bear** — a brown bear whose body is a
boba milk-tea cup, with a straw poking out of his head. His signature saying is
**Keena Meena**, which means *I love you*. **Trix** means hello and **Dee**
means goodbye.

Built from a child's drawings in `reference_images/`.

## Run it

Double-click `index.html`. No install, no build step, no server.

```
open index.html
```

## Controls

| Key | Does |
| --- | --- |
| Arrow keys | Hop around |
| **Shift** (hold) | Run |
| **Space** | Jump |
| `Z` / Enter | Do things: interact, talk, serve, shoot, drink, drop |
| `X` / Esc | Stop things: say Dee to a follower, clock off a job, flee a mission, leave a dive, close a book |
| `T` | Transform (Mech only: robot ↔ boba cart) |
| `E` | Special event, when one is flashing |
| `K` | Keena Meena! |
| `P` | Pause |
| `M` | Mute |

## What you can do

**Around the house** — living room, kitchen, bedroom. Turn the lights off and
the wallpaper dots become glow-in-the-dark stars. Sleep in the bed to skip to
the next morning. Open the window, dig through the toy box, watch TV, read a
book, flop on the sofa.

**Cooking** — you need the **Chef** outfit. Take ingredients from the fridge
(tomato, pepperoni, mushroom, onion, meatball, egg) and dry goods from the
cabinets next to it (pasta, flour, yeast, sugar). Your basket holds four
things, drawn as a real wicker basket at the bottom of the screen.

**Cooking never fails.** Known combos make the real dishes below; any other
mix makes a wobbly **Bobby's Surprise** — still dinner, still delicious.

| Dish | Needs |
| --- | --- |
| Fried Egg | egg |
| Bread | flour, yeast |
| Cake | flour, sugar, egg |
| Pizza | flour, tomato, pepperoni, mushroom |
| Spaghetti | pasta, tomato, meatball, onion |

Meals work like real meals: cook at the stove → **set the table** (uses a
clean plate) → **sit on a chair** → **eat** → wash the dishes at the sink →
put the drying rack away in the cupboard. Plates are counters, never cargo.
The **recipe poster** on the wall opens Bobby's recipe book. A **trash can**
dumps the whole basket; anything else can be **put down on the floor**
anywhere and picked back up later — floor items are saved too.

**Boba is for drinking.** With a boba in hand and nothing else to do, Z drinks
it — and something wacky happens for a while: giant Bobby, tiny Bobby, disco
room, or sparkle toots. Random every time.

**Friends** — Panda, Yuna the unicorn, Butterball the butterfly, and three
quiet critters start at the park. `Z` says **Trix** and they follow you —
single file, room to room, into vehicles. `Z` again just chats; **`X`** says
**Dee**, and they'll *live wherever you left them* until you fetch them again.
Every friend has a **favorite food** — hand it over for friendship hearts, and
at three hearts you're best friends with new things to say. Sleep with friends
in the room (bedroom bags or treehouse tents) for a **SLEEPOVER**.

**Your fluff** — adopt a pet at the park's FREE FLUFFS box. It follows you
everywhere (even into vehicles), loves treats from the shop, and has its own
little bed in the bedroom.

**Every day** — three gentle **Today's Ideas** (tracked on the bedroom ideas
board, with stickers for perfect days), a rolled **weather** (sunny, rainy,
snowy, or a lucky RAINBOW day that doubles crystal odds), letters in the
mailbox, and one-time **NEW!** celebrations for every first.

**Around the yard** — a three-plot **garden**: buy seeds at the shop, plant,
water once a day, harvest vegetables straight into the cooking loop. At the
park pond, **go fishing** — watch the bobber, strike on the "!", and reel in
fish for fish dinner (or an old boot, or... a tiny UFO).

**Decorating** — the shop's decor catalog sells rugs, lamps, plants and more;
pick a room and they appear in it, forever.

**Outfits** — the magic closet. Each one unlocks something:

| Outfit | Unlocks |
| --- | --- |
| Bobby | being extremely cuddly |
| Chef | cooking, and working the shop |
| Racer | driving the car |
| Builder | building the treehouse |
| Boba Bear Bot | transforming, and the boba gun |

**Getting around** — the UFO, the car, the hot-air balloon and the submarine all
fly or drive over the neighbourhood map. Land on a pad to arrive somewhere.

- **HOME** → back to the yard
- **PARK** → the park
- **SHOP** → the BOBBYBEAR shop and Bobby's job: hop behind the counter,
  fetch the exact flavor each customer asks for, serve 5 to finish the shift
- **LAKE** → dive in and it becomes the submarine. The **CAVE** and the
  **WRECK** are shark dives: sneak to the crystal and get out before the
  sharks chew through your hull (bumps hurt, they never end you)
- **MOUNTAIN** (balloon only) → Crystal Mountain. **Smash the rocks** — three
  whacks each, some hide a crystal, and they mend overnight. Crystals come in
  **six named varieties** (Sunstone, Moondrop, Heartgem...), ride as a counter,
  fill the bedroom **trophy case**, and are collected in **Bobby's treasure
  book** (open the case empty-handed)
- **SPACE** (UFO only) → free flight over planets and stars; the pulsing
  **INVASION** pad starts the alien battle, fought from inside the UFO

**The mech mission** — wear the Boba Bear Bot to the park, press `T` to become a
boba cart, and set up at the pitch. Customers queue; serve five and a **SPECIAL
EVENT** starts flashing. Press `E` and Megatron turns up, scatters everyone, and
you fight him with the boba gun.

**The treehouse** — wear the Builder outfit, stand at the big tree outside, and
build it. Then climb up whenever you like.

## Testing

Open `tests.html`. It drives the game with scripted input and checks **540**
things across movement, cooking, lights, sleep, friends, suits, vehicles, jobs,
missions, crystals, saving, the consistency of every room and map, plus
regression suites from a full audit and a gameplay-feel pass (save-guard,
job lifecycle, shark dives, rock mining, the meal loop, sleepovers, dropping,
boba effects, pause, and more). The spec
lives in `tests-spec.js`.

Jump straight to anything while poking about:

```
index.html#room=kitchen&suit=chef
index.html#room=living&dark=1
index.html#scene=vehicle&vehicle=balloon
index.html#scene=recipes
index.html#scene=mission&mission=megatron
index.html#room=park&party=panda,yuna
index.html#room=outside&treehouse=1
```

## How it's put together

Plain JavaScript and Canvas 2D. Files load as classic `<script>` tags — **not**
ES modules, because modules are blocked on `file://` and the game has to run
from a double-click. Everything hangs off one global, `W`.

The trick to keeping fifteen features manageable was to build **six systems**
and make the features data for them.

| System | File | Covers |
| --- | --- | --- |
| Characters | `character.js` | Bobby, Panda, Yuna, Butterball, critters, the crowd — all one table |
| Actors | `actor.js` | one movement entity for the player *and* every NPC |
| Stations | `stations.js` | every piece of interactive furniture, with ability gates |
| Vehicles | `vehicle.js`, `scene-vehicle.js` | all four vehicles, all four maps |
| Jobs | `service.js` | the boba cart and the ice cream counter |
| Combat | `combat.js` | Megatron and the space mission |

Supporting files: `crayon.js` (the renderer), `items.js`, `recipes.js`,
`npc.js`, `suits.js`, `dialogue.js`, `props.js`, `rooms.js`, `save.js`,
`audio.js`, `game.js`, and one scene file per screen.

### Two rules that keep it fast

Crayon strokes are expensive — a speech bubble drawn live cost 6 ms a frame, and
the HUD alone once cost 23 ms. So:

1. **Jitter is seeded, never `Math.random()`.** Same shape, same wobble, every
   frame — otherwise the whole picture vibrates.
2. **Anything that isn't changing is baked once and blitted.** Room backgrounds,
   every prop, every character pose, the UFO, Megatron, the HUD, speech bubbles,
   prompts, item icons and even text tiles are all pre-rendered.

Room backgrounds, world maps and the lights-out version of a room are built
lazily, and character poses bake during scene fades, so arriving somewhere new
doesn't stutter.

### Sound and saving

**No asset files.** Every sound is synthesised with the Web Audio API —
oscillators and envelopes — so the game stays a folder you can double-click.
Audio starts on the first key press, because browsers require a gesture.

Saving uses `localStorage`, which does work from `file://`, but every access is
wrapped in `try/catch` and there is a copy-paste **save code**
(`W.save.exportCode()` / `importCode()`) as a fallback. The game autosaves on
room changes, sleeping and station use (a small "Saved ✓" shows in the HUD),
and the title screen asks before letting a new game overwrite an old save.

## Adding things

**A room** — an entry in `W.ROOMS` (`rooms.js`): a floor, a wall height, walkable
`bounds`, `props`, `doors`, `stations`, and optionally `residents` and `crowd`.
Nothing else changes.

**Furniture** — a `kind` in `W.PROPS` (`props.js`) with `w`, `d`, `h` and a
`draw`. The footprint is its collision box. `solid: false` for rugs; `h: 0`
paints it flat into the floor; `jumpable: true` lets Bobby hop over it.

**Something to interact with** — a kind in `W.STATIONS` (`stations.js`) with
`act`, and optionally `prompt`, `update`, `drawOn` and a `requires` ability.

**A character** — a row in `W.CHARS` (`character.js`). Body types are `cup`,
`butterfly`, `pom` and `mech`.

**An outfit** — a row in `W.SUITS` (`suits.js`) naming the extra layers, their
colours, and which abilities it grants.

**A recipe** — a row in `W.RECIPES` (`recipes.js`).

**A vehicle or a map** — rows in `W.VEHICLES` / `W.MAPS` (`vehicle.js`).

## Not built yet

Touch controls for tablets, multiplayer, and the balloon race.
