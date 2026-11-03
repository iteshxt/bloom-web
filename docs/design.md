# Design — Bloom

> A cozy, pastel, two-player garden game about keeping a LeetCode streak alive together.
> This document defines how Bloom looks, moves, sounds and speaks. `prd.md` defines *what* it does; `techspec.md` defines *how* it's built.

| | |
|---|---|
| Status | v1.0 |
| Date | 2 Nov 2026 |
| Name | **Bloom** |
| Domain | `bloom.<domain>` (TBD) |
| Platform | Mobile-first installable PWA (designed at 390 × 844, works from 360 px up and on desktop) |

---

## 1. The idea in one paragraph

Every day you solve your problems, your flower grows. Two players, two little companion creatures, two flowers, one shared sky. Miss a day and your flower frosts over until your partner decides whether to thaw it. Keep going and your sprout becomes a bud, a bloom, a bouquet, a blossoming bush and finally a whole garden, with a gift waiting at each stage. The app should feel like opening a cozy game on a lazy Sunday: soft, warm, quietly alive, and a little bit romantic.

### Design principles
1. **Calm until it matters.** Most of the screen is airy, white and still. Motion and colour are saved for moments that mean something: finishing a day, getting a restore, opening a gift.
2. **Everything has a soul.** Progress is a living thing (a flower, a creature) rather than a bar or a number. Numbers are still there, but they're never alone.
3. **Soft, round, touchable.** No sharp corners, no hard lines, no harsh black. Things squish when pressed and settle with a spring.
4. **Colour has a job.** Each colour means one thing (section 3). Nothing is coloured just to decorate.
5. **Two of us.** Every screen remembers there are two players. You always see your partner from the corner of your eye.
6. **Kind, even when you fail.** A broken streak is a new seed, not a failure screen.

---

## 2. Brand

### 2.1 Wordmark
- `bloom`, lowercase, **Baloo 2 ExtraBold (800)**, set tight (letter-spacing −0.02em).
- **The two o's are the brand device:** two overlapping circles, the first filled **Blush** and the second **Sky**, slightly overlapping like two people leaning on each other. Where they overlap, they blend to a soft lilac (`#C9B4E8`).
- The other letters are **Plum ink**.
- Minimum size: 20 px tall. On illustrated skies, the wordmark sits on a frosted pill.

### 2.2 App icon
- A five-petal flower on a **Cloud** background. Petals alternate **Blush** and **Sky** (3 + 2, rotated so it doesn't feel symmetrical), with a **Butter** centre with a tiny highlight.
- Petals are fat, round, gummy shapes with the same shading as the puffy icons (section 8).
- Maskable version: the flower fits within the central 80% safe zone.
- Sizes: 192, 512, maskable 512, apple-touch 180, notification badge 72 (monochrome flower silhouette).

### 2.3 Splash and theme
- Manifest `background_color` and `theme_color`: `#F6F4FC` (Cloud).
- iOS status bar: `black-translucent`, so the sky runs under the notch.

---

## 3. Colour

### 3.1 Core palette (light / day)
| Token | Hex | Role |
|---|---|---|
| `cloud` | `#F6F4FC` | App background: a lavender-tinted white, never cream |
| `surface` | `#FFFFFF` | Solid cards and sheets |
| `glass` | `rgba(255,255,255,0.72)` | Frosted cards over skies |
| `ink` (Plum ink) | `#2E2547` | Primary text, icons, strokes (never pure black) |
| `ink-2` | `#6E6589` | Secondary text |
| `ink-3` | `#A39BB8` | Hints, placeholders, disabled |
| `line` | `rgba(46,37,71,0.08)` | Hairlines (rarely used; depth comes from overlap and shadow) |
| `blush` | `#F7A8C8` | Player colour (default: player A) |
| `sky` | `#8ED3EA` | Player colour (default: player B) |
| `lilac` | `#CDB8F5` | Optional third player colour |
| `peach` | `#FFB991` | Streak (the streak counter, urgency warmth, "time running out") |
| `butter` | `#FFE18F` | XP, levels, restore tokens (heart-coins), flower centres |
| `mint` | `#AEE8C6` | Done (completed day, approved, success) |
| `frost` | `#C9D7FF` | On ice (at-risk streak, restore requests, grace hour) |

### 3.2 Deep shades (text and icons on top of the pastels)
Every pastel has a deep partner for text, icons and fine details placed on it. Use these instead of `ink` when sitting on a pastel fill; they keep the warmth and pass WCAG AA for text 14 px and up.

| Pastel | Deep | Soft (10% tint backgrounds) |
|---|---|---|
| blush | `#A8346C` | `#FDEEF4` |
| sky | `#1C6E8F` | `#EAF7FB` |
| lilac | `#5E44B0` | `#F3EEFD` |
| peach | `#A24A1F` | `#FFF1E8` |
| butter | `#7A5800` | `#FFF8E1` |
| mint | `#1F6E46` | `#EDF9F2` |
| frost | `#3A4F9E` | `#EEF2FF` |

### 3.3 Night palette (used by the night skies and "night" theme)
| Token | Hex | Notes |
|---|---|---|
| `cloud` | `#1D1836` | Deep plum-indigo, never black |
| `surface` | `#2A2350` | Cards |
| `glass` | `rgba(42,35,80,0.70)` | Frosted cards at night |
| `ink` | `#F4F0FF` | Primary text |
| `ink-2` | `#BDB4DA` | |
| `ink-3` | `#837AA3` | |
| pastels | same hex | Pastels glow beautifully on plum. Text on pastels still uses the deep shades. |

### 3.4 Player colours
- Each player owns **one colour**, chosen in onboarding from `blush`, `sky` or `lilac` and stored in `profiles.color`. The picker defaults to blush; if the joining player's pick clashes with the partner's, the join step asks them to pick another. The two players can't pick the same colour.
- Everything that belongs to a player uses their colour: their flower's petals, their heatmap tiles, their player card's tint and shadow, their creature's scarf, their side of the journey road, and their chat-bubble messages in restores.
- When only one player is shown (for example a profile), the whole screen takes a gentle 4% wash of that player's colour.

### 3.5 Gradients (illustration only)
Gradients appear **only in skies and illustrations**, never on buttons or cards. Allowed sky gradients are listed in section 6.

### 3.6 Shadows (tinted, never grey)
| Token | Value | Use |
|---|---|---|
| `shadow-soft` | `0 12px 32px -16px rgba(46,37,71,0.18)` | Neutral cards, sheets |
| `shadow-player` | `0 14px 30px -14px rgb(var(--player-rgb) / 0.55)` | Player cards, player-owned buttons |
| `shadow-float` | `0 20px 40px -18px rgba(46,37,71,0.25)` | Floating nav, glass cards over skies |
| `glow-mint` | `0 0 0 6px rgba(174,232,198,0.45)` | Momentary "done" glow |
| `glow-frost` | `0 0 0 6px rgba(201,215,255,0.55)` | At-risk pulse |

At night, shadows become `rgba(0,0,0,0.35)` with the same geometry, and player glows double in opacity.

---

## 4. Typography

| Role | Font | Weight | Size / line-height | Notes |
|---|---|---|---|---|
| Hero number | **Baloo 2** | 800 | 64 / 0.95 | Streak count on the dashboard and celebrations |
| Display | Baloo 2 | 800 | 40 / 1.05 | Celebration titles |
| H1 | Baloo 2 | 800 | 28 / 1.15 | Screen titles |
| H2 | Baloo 2 | 700 | 22 / 1.2 | Section titles |
| H3 | Baloo 2 | 600 | 18 / 1.25 | Card titles |
| Body | **Figtree** | 400 | 16 / 1.5 | Everything you read |
| Body strong | Figtree | 600 | 16 / 1.5 | |
| Small | Figtree | 400 / 600 | 14 / 1.45 | Supporting text |
| Caption | Figtree | 600 | 12 / 1.35 | Chip labels, tiny stat labels |

Rules:
- **Sentence case everywhere.** No all-caps labels and no tracked-out eyebrows.
- Countdowns and any changing numbers use Figtree with `font-variant-numeric: tabular-nums` so digits don't jitter. Baloo 2 is used for big static or rolling numbers.
- Line length stays under about 60 characters on mobile, which is natural at 16 px.
- Both fonts load from Google Fonts with `display: swap`, subset to Latin. Only the weights listed above are loaded.

---

## 5. Shape, space and layout

### 5.1 Radius scale
| Token | px | Use |
|---|---|---|
| `r-tile` | 8 | Heatmap tiles (squircle) |
| `r-sm` | 14 | Inputs, small chips containing icons |
| `r-md` | 20 | Small cards, list rows grouped in a card |
| `r-lg` | 28 | Main cards (today quest, player cards) |
| `r-xl` | 36 | Bottom sheets, hero panels, celebration cards |
| `r-pill` | 999 | Buttons, chips, nav, countdown |

Hierarchy matters: bigger, more important containers get bigger radii, so cards never all look the same.

### 5.2 Spacing
A 4-point scale: 4, 8, 12, 16, 20, 24, 32, 40, 56. Screen side gutter: **16 px** (20 px from 400 px wide). Vertical rhythm between sections: 24–32 px.

### 5.3 Layout skeleton
Every main screen uses the same structure as the reference: **sky on top, calm panel below.**
```
┌──────────────────────────────┐
│ status bar (sky runs under)  │
│  SKY SCENE  (≈ 38–45% height)│  ← illustrated, alive
│   creatures, flowers, chips  │
│ ╭──────────────────────────╮ │  ← glass card overlapping
│ │ floating glass card      │ │     the sky edge by ~48px
│ ╰──────────────────────────╯ │
│~~~~~~~~ wave edge ~~~~~~~~~~~│  ← panel top is a soft wave,
│  CALM PANEL (cloud bg)       │     never a straight line
│  content…                    │
│                              │
│   (  floating pill nav  )    │  ← 16px above safe area
└──────────────────────────────┘
```
- **Wave edge:** an SVG path with 2 gentle crests, 18 px amplitude, sitting where the sky meets the panel. The crests shift by 8 px over 12 s (ambient; off with reduced motion).
- Content is **left-aligned**. Only celebration overlays and empty states are centred.
- Desktop (≥ 768 px): the app renders as a centred 430 px column, with the sky extending as a full-bleed background behind it, so it feels like a phone-shaped window into the garden.

### 5.4 Glass
- Background `glass`, `backdrop-filter: blur(18px) saturate(140%)`, border `1px solid rgba(255,255,255,0.6)` (night: `rgba(255,255,255,0.08)`), `shadow-float`.
- **At most 3 glass elements on screen at once**, because blur is expensive on budget Android phones.
- Fallback (`@supports not (backdrop-filter: blur(1px))`): solid `rgba(255,255,255,0.94)`.

---

## 6. The sky system

The top of every main screen is a living illustration whose time of day follows **IST**. It sets the mood, and it quietly tells you how much of your day is left.

### 6.1 Sky bands
| Band | IST | Gradient (top → bottom) | Celestial | Mood details |
|---|---|---|---|---|
| Dawn | 05:00–10:00 | `#FFD9C2 → #FFF1D6` | Low sun, peach halo | Dew sparkles on leaves |
| Day | 10:00–17:00 | `#A9E0F2 → #EAF7FB` | Small sun | Big puffy clouds, a bird or two |
| Dusk | 17:00–21:00 | `#CDB8F5 → #FFC9DD` | Sun setting, first star | Warm rim light on creatures |
| Night | 21:00–24:00 | `#2B2257 → #4A3B7D` | Moon, stars | Fireflies (butter dots) |
| Grace | 00:00–01:00 | `#1D1836 → #3A2E6E` with a slow aurora ribbon (frost → blush) | Moon | "Magic hour". The countdown pill glows frost. |
| Deep night | 01:00–05:00 | `#1D1836 → #2B2257` | Moon, dense stars | Creatures asleep if their day was done |

- When a band changes while the app is open, the scene **crossfades over 2 s**.
- **Theme setting** (Settings → Appearance): *Follow the sky* (default: the UI switches to the night palette from 21:00 to 05:00), *Always day*, *Always night*.

### 6.2 Scene layers (back to front)
1. Gradient.
2. Celestial: sun or moon, plus stars at night, which twinkle at random every 2–5 s.
3. Far hills: two rounded lavender-tinted hill silhouettes.
4. Clouds: three sizes, drifting horizontally at 80 s, 110 s and 140 s per loop, with a slight vertical bob.
5. **Islands:** one small floating grassy island per player, left (you) and right (partner). Each island holds that player's **flower** (section 7) and their **companion** (section 9).
6. Foreground: a few blades of grass and tiny wildflowers on the wave edge.
7. Overlay chips (glass): countdown and status, top-right.

The scene is **inline SVG** animated with CSS transforms, so it stays light. All ambient loops pause when the app is hidden (`visibilitychange`) and with reduced motion.

### 6.3 Weather moods (state overlays on a player's island)
- **On ice:** that island gets a frost-crystal overlay and a single tiny snow cloud above it that drops slow flakes. The rest of the sky stays normal, so only the struggling player is "cold".
- **Milestone day:** petals drift across the whole sky for the rest of the day.
- **Both done today:** a faint rainbow arcs between the two islands. It's the shared reward of the day.

---

## 7. The bloom: growth stages

Each player's flower grows with their **current streak**. It's the main visual of progress.

| Streak | Stage | Visual |
|---|---|---|
| 0 | **Seed** | A small seed in a mound of soil, with a single dot of light |
| 1–6 | **Sprout** | Two round leaves. Each day adds a tiny leaf notch |
| 7–14 | **Bud** | A stem with a closed bud in the player's colour |
| 15–29 | **Bloom** | One open flower (5 petals, butter centre), the first gift stage |
| 30–49 | **Bouquet** | Three flowers of slightly different sizes |
| 50–99 | **Blossom bush** | A round bush covered in small flowers |
| 100+ | **Garden** | A cluster of flowers in mixed sizes, with two butterflies orbiting |

- **Petals** use the player's colour, the **centre** is butter, and the **leaves** are a soft green `#9ED9A9` with deep `#3E8A55`.
- **Within a stage**, each new day adds a visible micro-change (one more leaf, a slightly bigger bud, an extra small bloom on the bush), so every single day changes something you can see.
- **Frozen:** the flower is desaturated by 40%, wrapped in a translucent frost shell with crystal highlights, and the leaves droop 6°.
- **Restored:** the frost melts away and the flower gets a small stitched heart on one leaf that day.
- **Broken streak:** petals fall and float off (2 s), the flower shrinks back into the soil, and a new seed sprouts with a sparkle. The copy says: "A new seed is planted. Day 1 starts now."
- The flower appears on your island in the sky, as a 40 px icon on your player card, and on the journey road.

---

## 8. Puffy icons

A custom icon set in a soft "gummy 3D" style, made to feel like the clay icons in the reference but drawn as SVG.

### 8.1 Construction rules
- **48 × 48 grid**, with shapes inside a 40 px live area.
- **Base shape:** chunky, rounded, with no corner sharper than a 4 px radius.
- **Fill:** the pastel base colour.
- **Highlight:** an ellipse at the top-left, white at 45% opacity, blurred with an SVG `feGaussianBlur` of 1.5.
- **Shade:** a crescent along the bottom-right in the deep shade at 18% opacity.
- **Detail lines** (ribbons, eyes, ticks): the deep shade, 2.5 px, round caps.
- **No outlines** on the main shape.
- **Contact shadow:** an ellipse under the icon, plum ink at 10%, only at sizes of 40 px and up.
- **Tile:** in grids (like the quick-action row), the icon sits in a 64 px circle of its colour's *soft* shade.

### 8.2 Set (v1)
| Icon | Colour | Used for |
|---|---|---|
| Bloom (5 petals) | player colour | Streak, app identity |
| Ice cube with a tiny flower inside | frost | On ice, restores |
| Heart-coin | butter (deep heart embossed) | Restore token |
| Gift box (closed) | blush, butter ribbon | Gifts |
| Gift box (open, with sparkles) | blush | Revealed gift |
| Trophy | butter | Badges |
| Crown | butter | Level |
| Star | butter | XP |
| Map with a dotted path | sky | Journey |
| Calendar | sky | Heatmap and calendar |
| Waving hand | peach | Nudge |
| Hourglass | peach | Countdown, urgency |
| Sprout | mint | Day complete, new run |
| Check badge | mint | Done |
| Scroll | lilac | History |
| Speech bubble with a heart | blush | Activity feed |
| Gear | lilac | Settings |
| Code brackets `</>` | sky | LeetCode sync (generic; never the LeetCode logo) |
| Moon / sun | butter | Theme |
| Bell | peach | Notifications |

### 8.3 Line icons (small sizes)
At 24 px and below (nav, inline in text), use a **line version**: 2 px stroke, round caps and joins, plum ink. The **active** nav item swaps to the puffy version.

---

## 9. Companions

Each player picks a small original creature in onboarding. It lives on their island and shows their day's mood. Companions are **original characters drawn for Bloom**: simple, round, and built from basic shapes.

### 9.1 Cast (v1)
| Name | Creature | Signature detail |
|---|---|---|
| **Mochi** | Round bunny | One floppy ear, one straight |
| **Tofu** | Loaf-shaped cat | Tail curled around its body, a tiny tuft on top |
| **Pip** | Little frog | Wears a leaf as a hat |
| **Bun** | Bear cub | Round ears, a heart-shaped nose |
| **Puff** | Cloud sprite | Floats instead of sitting, with a fluffy edge that wobbles |
| **Sprig** | Hedgehog | Tiny flowers growing among its spines (they bloom with the streak) |

### 9.2 Construction
- Built from 6–14 shapes: body ellipse, head, ears or features, eyes, cheeks.
- The **body colour** comes from a creature-specific neutral pastel (Mochi `#FFF6F0`, Tofu `#F4E3D3`, Pip `#BFE7B5`, Bun `#E9CDB4`, Puff `#FFFFFF`, Sprig `#D9C3A8`) with the same gummy shading as the icons.
- **Player accent:** every creature wears a small **scarf in the player's colour**. That's how you tell whose is whose at a glance.
- **Eyes:** plum-ink ovals with a white sparkle dot. **Cheeks:** blush ellipses at 60% opacity.
- **Sizes:** 140 px (sky island and celebrations), 64 px (player card), 36 px (avatars, feed).
- Implemented as React components: `<Companion kind="mochi" mood="happy" size={140} color="blush" />`. All creatures share the same set of mood animations; each just provides its own body parts.

### 9.3 Moods
| Mood | When | Animation |
|---|---|---|
| `idle` | Default | Breathes (scale 1 → 1.02, 3.2 s loop) and blinks at random every 3–6 s |
| `waiting` | Today pending, before 21:00 | Idle plus occasionally looking toward the partner's island |
| `urgent` | Today pending after 21:00, or in the grace hour | A small sweat drop appears; it taps its foot (2 Hz bob) |
| `happy` | Today complete | Hops once on completion, then stays at idle with a content smile (closed "^ ^" eyes) |
| `sleeping` | 01:00–05:00 and today done | Eyes closed, little "z"s float up every 4 s |
| `frozen` | Streak on ice | Inside a translucent ice cube with only its eyes moving; shivers every 5 s |
| `celebrate` | Milestone and level up | Big jump with squash and stretch, holding up a flower, sparkles |
| `sad` | Run ended (lasts until the next completed day) | Drooping ears or posture, one small tear when shown big. Never crying for long. |
| `wave` | Received a nudge, or greeting on first open of the day | Waves an arm or paw three times |

**Partner presence:** when your partner opens the app, their creature on *your* screen does a small wave. It's a tiny "I'm here" (shown at most once per hour).

---

## 10. Components

### 10.1 Buttons
| Variant | Look | Use |
|---|---|---|
| **Primary** | Pill, 52 px tall, fill = player colour, label in the player's deep shade, Figtree 600 16 px, `shadow-player` | The one main action per screen ("Request restore", "Open gift") |
| **Secondary** | Pill, 52 px, white fill, plum-ink label, `shadow-soft` | Alternatives |
| **Soft** | Pill, 44 px, fill = the soft shade of a semantic colour, deep-shade label | In-card actions ("Approve" uses mint soft) |
| **Ghost** | Text only, ink-2, 44 px hit area | Tertiary ("Not this time", "Skip") |
| **Icon** | 44 px circle, glass or white | Bell, settings, close |

- **Press:** scale to 0.96 and move down 1 px (snappy spring), then release with the bouncy spring. Play the `tap` sound if enabled.
- Disabled buttons are avoided. If an action isn't available, the button stays and a short explanation appears beneath it when tapped.

### 10.2 Chips
- Pill, 32 px tall, Figtree 600 13 px. A semantic soft fill with a deep-shade label, plus an optional 16 px puffy icon on the left.
- **Stat chip** (as in the reference's "10 min / ETA"): a 40 px puffy icon circle on the left, a bold value with a tiny label underneath, on glass.

### 10.3 Countdown pill
- Glass pill at the top-right of the sky with an hourglass icon and `3h 12m left` (tabular numbers).
- **Under 3 hours:** the hourglass turns peach. **Under 1 hour:** the pill gets a peach soft fill and a gentle 2 s pulse.
- **Grace hour:** a frost fill with an aurora shimmer across it, reading `Grace hour · 42m`.
- **Today done:** a mint fill reading `Done for today`. **Before the start date:** butter, reading `Starts in 2 days`.

### 10.4 Today quest card (glass, overlapping the sky edge)
```
╭────────────────────────────────────────╮
│ Today                     ( 3h 12m left)│
│  ◉ ◉ ○        2 of 3                     │  ← progress seeds
│  + 1 make-up  (frost chip, if any)       │
│  ───────────────────────────────────    │
│  Two Sum · Easy · 9:41 pm         +10xp │  ← latest solves (max 2)
│  Valid Parentheses · Easy · 8:02 pm      │
│                    ( Sync now  ⟳ )      │
╰────────────────────────────────────────╯
```
- **Progress seeds:** one circle per required problem. Empty seeds are outlined in the player's colour; filled ones sprout a tiny leaf with a pop. Make-up seeds are frost-coloured.
- With more than 6 required problems, the seeds switch to a segmented pill bar.

### 10.5 Player card (side by side, half width each)
```
╭──────────────────╮
│ (🐰64)   🌸 Bloom │  ← companion + flower stage icon
│ 23               │  ← Baloo 2 48px, streak
│ day streak       │
│ ●●○  tokens      │  ← heart-coins
│ 🎁 in 7 days     │  ← next milestone chip
│ ▓▓▓▓▓░░ Lv 6     │  ← XP bar (butter)
╰──────────────────╯
```
- Background: white with a 6% wash of the player's colour, `r-lg`, `shadow-player`.
- **On ice:** the card gets a frost overlay, frost crystals in two corners, `glow-frost` pulsing every 4 s, and "On ice" replaces "day streak".
- Tapping the card opens that player's profile with a shared-element expand (section 12.2).

### 10.6 Heart-coin token pouch
Three 20 px heart-coins in a row: filled ones are butter puffy coins, used ones are dashed outlines in `ink-3`. On the partner's card, an "Approve restore" banner can appear right above it.

### 10.7 Floating nav
- A glass pill, 64 px tall, inset 16 px from the sides and bottom (plus the safe area).
- Four items: **Home**, **Journey**, **Gifts**, **Me**.
- The active item expands into a **player-colour pill with a puffy icon and label**, like the reference's pink "Home" pill. Inactive items are line icons only.
- A badge dot (peach) appears on Home when there's a pending restore request for you, and on Gifts when a gift is unlocked and unopened.
- Switching tabs: the active pill slides between items using a shared layout animation (soft spring).

### 10.8 Banners (top of the calm panel)
A glass or soft-fill rounded card (`r-md`) with a 40 px puffy icon, one line of text and one action. Kinds:
- "Your flower is frosted. Ask {Partner} for a restore." (frost)
- "{Partner} is asking you for a restore." (frost, with a primary action)
- "You owe {Partner} a gift for 30 days." (blush)
- "Can't reach LeetCode. Manual check-in is on." (peach). Until manual check-in ships (P1), it reads "Can't reach LeetCode right now. We'll keep trying."

Only **one** banner shows at a time, in priority order: request to you > your frost > gift owed > sync.

### 10.9 Sheets and dialogs
- Bottom sheets with `r-xl` top corners, a white surface, a 36 × 5 px grab handle in `ink-3`, and a cloud backdrop with 20% plum dim and 6 px blur.
- They open with the floaty spring and can be dismissed by dragging down (velocity over 500 px/s or 30% of the height).
- Confirmation dialogs are small centred cards (`r-xl`), used only for irreversible actions (rejecting a restore, changing the start date).

### 10.10 Inputs
- 52 px tall, `r-sm`, white fill, 1.5 px border in `line` that becomes the player colour with a 4 px soft ring on focus. Labels sit above in Figtree 600 14 px.
- **Code input (pair join):** six round "seed" slots (48 px circles). Each sprouts a small leaf when a character is typed. Pasting fills them in sequence at 40 ms intervals.
- **LeetCode username:** while typing, a small "checking…" sprout spins. When valid, a mini profile card appears below (LeetCode avatar, solved count) with a mint check.

### 10.11 Heatmap tiles
| State | Style |
|---|---|
| Future / before start | No tile (empty space) |
| Pending today | Outlined in the player's colour, breathing ring (2.4 s) |
| Complete, solved = target | Player colour at 55% |
| Complete, solved ≥ 1.5 × target | Player colour at 80% |
| Complete, solved ≥ 2 × target | Full player colour with a tiny white sparkle |
| Restored | Player colour at 55% with a stitched heart (frost deep stitch) |
| Missed | Dashed 1.5 px outline in `ink-3`, no fill |
| Pre-season solves | Butter soft dot, small |

Tiles are 14 px with a 4 px gap and `r-tile` corners (squircle via `border-radius` + a slight scale). The month view uses 40 px tiles with the date number inside.

### 10.12 Progress and level bars
- 10 px tall pill track in the colour's soft shade, with the fill in the colour.
- The fill animates with the soft spring and ends with a tiny "liquid" overshoot (scaleY 1.15 → 1, 300 ms).
- The XP bar fill is butter, with a 4 px white highlight line inside the top edge.

### 10.13 Toasts
Top-centre glass pill, up to 2 lines, with a puffy icon on the left. It drops in with the bouncy spring, stays 2.8 s, and can be swiped up to dismiss. Examples: "Day 24 done", "Restore sent to Riya", "Synced · 2 new solves".

### 10.14 Loading and empty states
- **Skeletons:** cloud-tone blocks with a slow (1.6 s) left-to-right shimmer in white at 50%.
- **Spinner:** five petals rotating and pulsing in sequence, in the player's colour.
- **Pull to refresh (= Sync now):** pulling down stretches the flower on your island. Releasing makes the petals spin once while syncing; a mint check appears when done.
- **Empty states** use a companion illustration and an invitation, never an apology. For example: Gifts with nothing set shows "Pick a gift for Riya's first bloom" with the button "Choose a gift".

---

## 11. Screens

Each screen follows the sky-on-top, calm-panel-below structure unless noted. `{Partner}` and `{You}` are display names.

### 11.1 Sign in (`/login`)
```
┌──────────────────────────────┐
│     (dusk sky, full screen)  │
│      two islands, two        │
│      creatures waving        │
│                              │
│   bloom  ← wordmark, 48px    │
│   Grow a little every day,   │
│   together.                  │
│                              │
│                              │
│ ( G  Continue with Google )  │  ← primary (blush by default)
└──────────────────────────────┘
```
- One button and no other fields. The Google "G" mark sits on the left of the label, following Google's sign-in branding rules; it is the only third-party logo in the UI.
- While the redirect is in flight, the button shows the petal spinner and reads "Opening Google…".
- If sign-in doesn't finish, the user comes back here with a frost banner: "Sign-in didn't finish. Try again."
- Entry choreography (the one page-load moment): the sky fades in (400 ms), the islands float up (staggered 120 ms, floaty spring), the creatures pop in and wave, then the wordmark's two o's roll in from the sides and overlap.

### 11.2 Onboarding (`/onboarding`)
A step-by-step flow on a single calm panel. Progress is shown as **five little sprouts** at the top that grow as you advance.
1. **Name:** "What should {Partner} call you?"
2. **Companion and colour:** a horizontal carousel of the six creatures (big, 140 px, idle animations) plus three colour dots. The chosen colour instantly dresses the creature's scarf.
3. **LeetCode:** the username field with live verification (section 10.10).
4. **Pair up:**
   - *Create:* shows a big 6-character code in Baloo 2, with "Copy code" and "Share" (Web Share API) buttons, and a start-date picker (default today) with "Today" and "Tomorrow" shortcut chips.
   - *Join:* six character slots (the code input, 10.10).
   - When the partner joins, their island and creature float into the sky with a little chime.
5. **Install and notifications:**
   - Android: a primary "Install Bloom" button.
   - iOS (not installed): an illustrated three-step card (Share icon → "Add to Home Screen" → Open Bloom).
   - When installed: "Turn on reminders" with a preview of a notification.

### 11.3 Home: duel dashboard (`/`)
```
┌──────────────────────────────┐
│ (🐰36) Hi Aarav       (🔔)    │  ← greeting row over sky
│                 ( 3h 12m left)│
│   🏝 🌸 🐰           🏝 🌷 🐱  │  ← your island left, partner right
│ ╭──────────────────────────╮ │
│ │  TODAY QUEST CARD        │ │  ← 10.4, glass, overlaps sky
│ ╰──────────────────────────╯ │
│~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~│
│ [ banner, if any ]           │
│  (🎁)  (❄️)  (🏆)  (📅)  (👋) │  ← quick actions, puffy tiles
│  Gifts Restores Badges Days Nudge
│ ╭─ You ─────╮ ╭─ Riya ────╮  │
│ │ PLAYER    │ │ PLAYER    │  │  ← 10.5
│ ╰───────────╯ ╰───────────╯  │
│  Recent                      │
│  • Riya solved Two Sum  +10  │  ← last 3 activity items
│   ( Home ) Journey Gifts  Me │
└──────────────────────────────┘
```
The bell opens the activity feed (§11.12); a peach dot on it means there's activity you haven't seen.

**States**
| State | What changes |
|---|---|
| Before start | Countdown pill shows "Starts in N days". Seeds on both islands. The quest card says "Your first day is {date}. Warm up with any problem; it'll show as pre-season." |
| Pending | Default. Creature mood `waiting` or `urgent` by time. |
| Done today | Quest card gets a mint check corner badge and the line "Done. {Partner}: 0 of 1." Creature `happy`. |
| Both done | Rainbow between the islands; the quest card says "You both bloomed today." |
| Grace hour, yesterday incomplete | The quest card shows **yesterday** first, with the title "Still yesterday · 42 min of grace". |
| On ice (you) | Frost banner, frozen island and creature, and the quest card shows today including make-up if approved. |
| Restore requested from you | Top banner with {Partner}'s creature holding a little sign; the action opens the restore sheet. |

### 11.4 Player profile (`/player/[id]`)
- **Sky:** zoomed in on that player's island (their creature large, the flower at its current stage). The level crown sits beside the name.
- **Calm panel:**
  1. Stat chips row: streak, best streak, total solved, completion %.
  2. Heatmap with a month/year toggle (segmented pill), swipeable months, and a legend under the grid.
  3. Difficulty split: three puffy jars (Easy mint, Medium butter, Hard blush) that fill to their proportion.
  4. Top topics: chips with counts.
  5. Badges preview (6), with "See all".
  6. **Daily target** (shown only on your partner's profile): a stepper card "Riya's daily target: 2", with − and + round buttons, the note "Changes start tomorrow, 4 Nov", and a primary "Save target" button.
- Tapping a heatmap day opens a sheet with the date, status chip, target, a list of solves (title, difficulty chip, time, XP) and restore info if any.

### 11.5 Journey (`/milestones`)
The reference's navigation screen, reimagined as a garden road.
```
┌──────────────────────────────┐
│ (🔥 23 days)(🎁 7 to go)(👑 6)│  ← stat chips on glass
│                              │
│      🎁100  ⋱                 │
│          ⋰   garden path     │  ← vertical winding road,
│     🎁50  ⋱                   │     scrollable, drawn as a
│         ⋰                    │     soft blush-and-sky dashed
│   🎁30 ⋱   🐱 (Riya, day 31)  │     double lane
│       ⋰  🐰 (you, day 23)     │
│  ✓15 ⋱                        │
│ start                        │
│~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~│
│ ( ➜ ) 7 days to your next gift│  ← "Straight · 850 m" style pill
│ 23 traveled ━━━━━━●──── 7 left│  ← slider like the reference
└──────────────────────────────┘
```
- The road is a long vertical scene that changes by stage: meadow for 0–15, flower fields for 15–30, a pond with lily pads for 30–50, a blossom grove for 50–100, and a hilltop garden at 100.
- **Gift stops:** a gift box on a little pedestal at each milestone. Locked ones show a hint tag; ones achieved by you get a mint flag with your colour, and Riya's get a flag in Riya's colour.
- Both creatures stand on the road at their current streak and walk (a 4-frame bob) when the screen opens, auto-scrolling to centre on you.
- At-risk players stand in a little frozen puddle on the road.
- **Bottom panel:** a wave-edged white card with a "direction" pill ("7 days to your next gift") and the progress slider "23 traveled · 7 left", in your colour, with your flower as the slider thumb.

### 11.6 Restores (`/restores`)
**For the player who missed** (a frost-themed screen):
```
╭─────────────── frost glass ───────────────╮
│  (🧊 frozen creature 96)                   │
│  Your flower is frosted                   │
│  You missed Sunday, 1 Nov.                │
│  ●●○  2 restores left                     │
│  ╭───────────────────────────────────╮   │
│  │ Say something to Riya (optional)  │   │
│  ╰───────────────────────────────────╯   │
│  ( Ask Riya to restore )   ← primary      │
│  Closes in 18h 40m                         │
╰───────────────────────────────────────────╯
```
- After sending, the card shows "Waiting for Riya…" with her creature thinking (a "…" bubble), plus a "Cancel request" ghost button.
- If make-up applies after approval: "Today: 1 + 1 make-up. Finish both to keep your bloom."

**For the partner deciding:**
- A chat-like layout: their creature (frozen) with their message in a speech bubble in their colour.
- Context chips: "23-day streak", "2 restores left".
- An optional reply field.
- Buttons: **Approve** (soft mint, then primary emphasis) and **Not this time** (ghost). Rejecting asks for confirmation: "Their 23-day streak will end. Are you sure?"

**History list:** rows grouped by month, each showing a date, who asked, a status chip (Approved mint, Not this time peach, Expired ink-3), and the message excerpt.

### 11.7 Gifts (`/gifts`)
- A segmented pill toggle: **For me** / **For {Partner}**.
- **For me:** a wooden-shelf illustration (soft peach wood) with four gift boxes at 15, 30, 50 and 100.
  - *Locked:* the box with a ribbon and a hint tag swinging gently, plus a small lock badge and "8 days to go".
  - *Unlocked:* the box wiggles every 3 s, has a sparkle aura, and shows an "Open" chip.
  - *Waiting (giver hasn't filled it in):* the box is a dashed outline with Riya's creature wrapping it, and the text "Riya is wrapping it…".
  - *Revealed:* the box is opened, with a keepsake card leaning against it.
  - *Received:* a mint check ribbon.
- **For {Partner}:** a list of milestone cards. Each shows a status chip and either "Choose a gift" or the gift title with an "Edit" button (until revealed).
  - The editor sheet has fields for **Gift**, **Hint they can see before** (optional; "Something cozy for rainy days"), **Details** (optional), and **Link** (optional), with a primary "Wrap it" button.

### 11.8 Gift unboxing (full-screen overlay)
An interactive moment (section 12.4):
- a dim sky background with the box at the centre (180 px);
- the copy "Tap to open" with three dots that fill as you tap;
- after the reveal, a keepsake card with the gift title (Baloo 2 32 px), details, link button, a "From Riya, for 30 days" signature line, and buttons "Mark as received" and "Done".

### 11.9 Celebration overlays (full screen, tap to skip after 1.2 s)
- **Day complete:** a light overlay rather than full screen (section 12.4).
- **Milestone:** full screen with "30 days!", "Your bouquet bloomed", "Riya's gift is unlocked", and the buttons "Open gift" (primary) and "Later".
- **Level up:** a centred card with a crown animation, "Level 7", and "+ new title: Petal Pro" (level titles below).
- **Restore result:** a centred card showing thaw or shatter (section 12.4).

**Level titles (fun flavour):**
1 Seedling, 2 Sprout, 3 Leafling, 4 Budding, 5 Petal Pro, 6 Blossom, 7 Bloomer, 8 Garden Keeper, 9 Grove Guardian, 10+ Evergreen.

### 11.10 Badges (`/badges`)
- A 3-column grid of round badge medallions (puffy, 80 px).
- **Earned:** full colour, with the earned date under the name.
- **Locked:** a frosted-glass silhouette with the condition in ink-3 ("Solve 10 Hards").
- Tapping opens a sheet with a big medallion that slowly rotates in 3D (rotateY wobble ±12°), plus the description.

### 11.11 Me (`/player/me` with extras)
Your own profile (11.4) with a header menu leading to **History**, **Activity**, **Badges** and **Settings**.

### 11.12 Activity (`/feed`)
A vertical timeline grouped by day ("Today", "Yesterday", "Sun, 1 Nov"):
- each item has a 36 px companion avatar in its owner's colour, one line of text and a time;
- XP gains show as small butter chips;
- big moments (milestones, restores, gifts) are larger cards in the list.

### 11.13 History (`/history`)
A card per run, showing the dates, length in Baloo 2, the flower stage reached, restores used and how it ended ("Ended: missed Sunday" and so on). The current run is pinned at the top with a live flower.

### 11.14 Settings (`/settings`)
Grouped white cards (`r-md` rows, no hairline between rows; 12 px spacing):
- **Profile:** name, companion and colour (opens the onboarding carousel as a sheet), LeetCode username.
- **Reminders:** a toggle for each notification category, plus "Send a test notification".
- **Appearance:** theme (Follow the sky / Always day / Always night), sounds on/off, haptics on/off, reduced motion (follows the system by default). These are per-device preferences kept in `localStorage`, not synced between devices.
- **Challenge:** milestones (add only), make-up on/off, start date (before the start only).
- **About:** version, diagnostics (hidden behind 5 taps on the version), sign out.

### 11.15 Offline and errors
- **Offline:** a top toast "You're offline. Showing what we had." The sky dims slightly and a tiny rain cloud appears.
- **Sync failing:** the peach banner from 10.8.
- **Full-page error:** a calm panel with a creature holding a broken flower pot, the copy "Something went sideways. Pull to try again.", and a "Try again" button.

---

## 12. Motion

### 12.1 Principles
- **Physics, not timelines.** UI motion uses springs, so interruptions feel natural.
- **Answer the touch.** Every tap gets an immediate response within 1 frame (a squish).
- **One star per moment.** In each celebration, exactly one thing leads (the creature, the flower or the box); everything else supports it.
- **Ambient motion is slow and small:** drift, breathe, twinkle. Nothing on screen loops faster than once per 2 s, except during celebrations.

### 12.2 Tokens (`lib/motion.ts`)
```ts
export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 34 },          // presses, toggles, chips
  soft:   { type: 'spring', stiffness: 180, damping: 24 },          // default UI movement
  bouncy: { type: 'spring', stiffness: 340, damping: 15, mass: 0.9 },// pops, celebratory entrances
  floaty: { type: 'spring', stiffness: 70,  damping: 16 },          // sheets, islands, large scenes
} as const;

export const dur = { micro: 0.12, fast: 0.2, base: 0.32, slow: 0.6, scene: 1.2, sky: 2.0 }; // seconds
export const ease = {
  out:   [0.22, 1, 0.36, 1],   // entrances, fades
  inOut: [0.65, 0, 0.35, 1],   // crossfades, sky changes
};
export const press = { scale: 0.96, y: 1, transition: spring.snappy };
```

### 12.3 Standard transitions
| Interaction | Motion |
|---|---|
| Tap any pressable | Scale 0.96 + y 1 (snappy), release (bouncy) |
| Tab switch | Content crossfades + 12 px horizontal slide in the direction of travel (soft); the nav pill glides (shared layout) |
| Card → detail (player card → profile, gift card → editor) | **Shared element:** the card expands into the new screen using `layoutId`; other content fades (soft) |
| Sheet open | Rises from the bottom (floaty), the backdrop fades and blurs in 200 ms |
| Toast | Drops 24 px from above (bouncy), leaves upward (soft) |
| Number change | Digits roll vertically like a slot machine, each digit staggered 40 ms (soft) |
| List entry | Only new items animate in (scale 0.96 → 1, opacity 0 → 1, soft). Never stagger whole pages on load. |
| Realtime update from partner | Their card does a tiny "nudge" (x ±3 px, bouncy) and their creature glances up |

### 12.4 Signature moments (choreography)
Timings are offsets from the trigger.

**Day complete** (about 1.6 s; overlay-light, no full screen)
| t (ms) | What happens |
|---|---|
| 0 | The last progress seed fills and sprouts (bouncy); `pop` sound; light haptic |
| 120 | The quest card flashes `glow-mint` (fades over 600 ms) |
| 250 | Your creature hops: squash (scaleY 0.85) → stretch and rise 28 px → land with a squash → settle (bouncy) |
| 420 | The flower grows its daily micro-step with a burst of 8 small petals (player colour + butter) from the flower |
| 700 | The streak number rolls +1 |
| 900 | Toast: "Day 24 done" |
| 1600 | Everything settles; the creature switches to `happy` |

On the partner's phone, their side's creature hops once (smaller, with no burst) and a check bubble pops above it.

**Streak on ice** (shown the first time you open the app after the miss, 1.4 s)
| t | What happens |
|---|---|
| 0 | The sky over your island cools: a small snow cloud slides in (floaty) |
| 200 | Frost crystals grow from the corners of your player card toward the centre (an SVG mask animation, 1.2 s, `ease.out`) |
| 400 | An ice cube forms around your creature from the bottom up (a mask animation, 800 ms); the creature does one shiver |
| 1200 | The frost banner slides down |

After this, a subtle shimmer passes over the frost every 6 s.

**Restore approved: thaw** (1.6 s)
| t | What happens |
|---|---|
| 0 | Cracks spread across the ice (stroke-dashoffset animation, 300 ms); `crack` sound |
| 300 | The ice melts downward: it fades with a downward mask wipe while small droplets fall (600 ms) |
| 700 | The droplets turn into 5 small hearts floating up (bouncy, staggered 60 ms) |
| 900 | The creature shakes off like a wet dog (x ±6, 3 cycles), then does a happy hop |
| 1200 | The flower regains colour (saturation 0.6 → 1); a stitched heart appears on a leaf; a heart-coin flips out of the pouch and fades |
| 1600 | Toast: "Riya restored your Sunday" |

**Restore rejected: soft shatter** (1.2 s)
| t | What happens |
|---|---|
| 0 | The ice cracks |
| 250 | It breaks into 6 pieces that drift outward and fade, slowly, never violent (floaty) |
| 500 | Petals fall from the flower and it sinks into the soil (the broken-streak sequence, section 7) |
| 1000 | A new seed sprouts with a sparkle; text: "A new seed is planted. Day 1 starts now." |

**Milestone** (about 4.5 s, full screen, skippable after 1.2 s)
| t | What happens |
|---|---|
| 0 | The screen fades to a special sky (the dusk gradient with drifting petals) |
| 300 | Your creature walks in from the left along a short road toward a gift box on a pedestal (floaty) |
| 1300 | Your creature reaches the box and does the `celebrate` jump; `chime` sound; success haptic |
| 1500 | The flower grows into its new stage at the centre (scale 0.6 → 1.08 → 1, bouncy) with petals unfurling one by one, staggered 80 ms |
| 2200 | A confetti mix of petals and stars bursts (canvas-confetti, custom petal shapes, player colour + butter + mint) |
| 2600 | The title "30 days!" rolls in letter by letter (Baloo 2 64 px) |
| 3200 | Three heart-coins drop into the pouch with clinks (token refill) |
| 3800 | Buttons fade up: "Open gift" / "Later" |

**Gift unboxing** (interactive)
1. The box appears (bouncy) and idles with a slow wiggle.
2. **Tap 1:** the box squishes and wobbles (±6°); a dot fills; a small sparkle appears.
3. **Tap 2:** a bigger wobble (±10°) with light rays peeking from the lid edge.
4. **Tap 3:** the ribbon unties (two ribbon paths animate apart, 300 ms), the lid pops up and spins away (bouncy), light bursts out, and the keepsake card rises from the box (floaty) and flips to face you (rotateY 90° → 0°, 500 ms). Confetti follows.
5. Long-pressing the box skips straight to the reveal (an accessibility shortcut).

**Token refill:** three coins drop from the top of the card, bounce twice (bouncy) and land with staggered `clink` sounds, 120 ms apart.

**Level up:** a crown drops onto the creature's head (bouncy), the level number rolls, the new title fades in, and a ring of butter sparkles appears.

**Both done today:** when the second player completes, a rainbow draws itself from island to island (stroke animation, 1.2 s, `ease.inOut`) on both phones.

### 12.5 Reduced motion
When `prefers-reduced-motion: reduce` is on, or the in-app toggle is set:
- all springs become 160 ms opacity fades;
- ambient loops are disabled (clouds static, no breathing, no twinkle);
- confetti and particles are off; celebrations show the final state with a single fade;
- creatures switch between static mood poses without animation;
- sky band changes become instant swaps;
- the unboxing becomes a single tap with a crossfade to the card.

### 12.6 Performance rules
- Animate only `transform` and `opacity` (plus SVG masks for frost and ice, which run only during the moment itself).
- Show at most 3 glass blur elements at once, and pause sky animations under 30 fps.
- Ambient animations pause when `document.hidden`.
- Confetti uses a single shared canvas that's removed after use.
- Target 60 fps on a mid-range Android phone (for example, a 2023 Redmi or Galaxy A-series).

---

## 13. Sound and haptics

### 13.1 Sounds
Soft, short, warm, made from gentle marimba and glass tones. Each file is under 20 KB (`.mp3` + `.ogg`) and played through the Web Audio API with a short shared buffer cache.

| Sound | When | Feel |
|---|---|---|
| `pop` | Progress seed sprouts, day complete | Soft wooden "bloop" |
| `chime` | Milestone, both done | Three rising glass notes |
| `clink` | Heart-coin lands | Small coin on wood |
| `crack` | Ice cracks | Light, crisp, never harsh |
| `melt` | Thaw | Soft rising shimmer |
| `whoosh` | Sheet open, nudge sent | Airy swish |
| `tap` | Button presses | Barely there tick (off by default) |
| `rustle` | Gift ribbon unties | Paper rustle |

- **Default:** celebration sounds on, `tap` off. Everything is muted if the device is silent where detectable, and no sound plays on app launch.
- Master toggle in Settings → Appearance.

### 13.2 Haptics
Uses `navigator.vibrate` on Android. iOS web apps don't support vibration, so this is skipped silently there.

| Pattern | Use |
|---|---|
| `[8]` | Press confirmation on primary buttons |
| `[12, 60, 18]` | Day complete, restore approved |
| `[20, 40, 20, 40, 60]` | Milestone |
| `[30]` | Error or rejection |

---

## 14. Voice and copy

### 14.1 Tone
Warm, playful, gently teasing, never guilt-trippy. Bloom talks like a cozy friend who's rooting for both of you.
- Short sentences, plain words, sentence case.
- Use the partner's **display name**, never "she" or "he" (the app is symmetric).
- **At most one emoji per message, at the end**, and only in notifications and celebrations. The in-app UI uses puffy icons instead of emoji.
- Exclamation marks only for real celebrations ("30 days!").
- Failure copy is kind and forward-looking: "A new seed is planted", never "You failed".

### 14.2 Notifications (final copy)
| Kind | Title | Body |
|---|---|---|
| reminder_evening | Your flower's thirsty | 3 hours left today. 0 of 1 done 🌱 |
| reminder_late | One hour to midnight | Then there's a grace hour, but why wait? |
| reminder_grace | Grace hour | 45 minutes to save yesterday's bloom ⏳ |
| partner_done | Riya bloomed today | Your move 👀 |
| streak_on_ice | Your flower is frosted | Ask Riya for a restore before 1 am tomorrow ❄️ |
| streak_broken | A new seed is planted | Your 23-day streak ended. Day 1 starts now 🌱 |
| restore_requested | Riya needs a little sunshine | "I had a fever" · Tap to decide |
| restore_ask | Your flower is still frosted | Ask Riya for a restore before 1 am ❄️ |
| restore_closing | Riya's request closes soon | 2 hours left to decide |
| restore_answered (yes) | Riya thawed your flower 💖 | Finish today plus 1 make-up to keep it |
| restore_answered (no) | Riya said not this time | A new seed is planted. You've got this 🌱 |
| target_changed | New daily goal | Riya set your target to 3, starting tomorrow |
| milestone_reached (self) | 30 days! | Your bouquet bloomed. Riya's gift is unlocked 🎁 |
| milestone_reached (partner) | Riya hit 30 days! | Your gift for Riya is unlocked. Is it ready? 👀 |
| gift_owed | You owe a gift | Riya reached 30 days. Wrap something special 🎁 |
| gift_revealed | Riya opened your gift | Your 30-day surprise is out 💝 |
| gift_received | Gift delivered | Riya marked your gift as received 💝 |
| level_up | Level 7: Bloomer | Keep growing 🌸 |
| badge_earned | New badge: Night Owl | Saved a day in the grace hour 🦉 |
| nudge | Riya nudged you | "Go do your LeetCode 😤" |
| sync_failing | Can't reach LeetCode | Manual check-in is on until it's back |

(Copy always uses display names, never pronouns. There is no pronoun setting.)

### 14.3 Preset nudges
- "Go do your LeetCode 😤"
- "Your flower misses you 🌱"
- "I already did mine 👀"
- "One problem. Just one. 🥺"
- "Race you 🏁"
- "The grace hour is not a plan 😌"
- "Two Sum won’t solve itself 🧮"
- "Your companion is staring at you 👀"
- "Don’t make me restore you 🧊"
- "Proud of you. Now go solve 💖"
- "Tick tock, the moon is up 🌙"
- "Bet you can’t do a Medium today 😏"

Nudges open from the Nudge quick action on home or the partner's profile: tap a preset to send it, or write your own (up to 140 characters). A counter shows how many of the day's 3 are left. On the receiving phone the partner's creature waves on home while a toast shows the message.

### 14.4 In-app microcopy examples
| Place | Copy |
|---|---|
| Quest card, nothing yet | "Today's quest: 1 problem. Any one counts." |
| Quest card, done | "Done for today. Your flower's happy." |
| Grace hour title | "Still yesterday · 42 min of grace" |
| Make-up line | "+1 make-up for Sunday" |
| Heatmap legend | "Bloomed · Extra bloom · Restored · Missed" |
| Restore input placeholder | "I had a fever 🥺" |
| Gift hint placeholder | "Something cozy for rainy days" |
| Empty feed | "Your story starts with the first solve." |
| Sync button states | "Sync now" → "Syncing…" → "Synced · 2 new" |

---

## 15. Accessibility

- **Contrast:** body text in `ink` on `cloud` or white is 12:1 or better. Text on pastels always uses the deep shade (AA or better). Pastel-on-white is never used for text.
- **Colour is never the only signal.** Heatmap states also differ by pattern (dashed outline for missed, stitch for restored, sparkle for extra). Status chips always include a word.
- **Touch targets:** 44 × 44 px minimum; primary buttons are 52 px.
- **Screen readers:** every creature and flower has a text alternative describing state ("Aarav's flower, bud stage, 9-day streak, done today"). Celebrations announce through an `aria-live="polite"` region.
- **Focus:** a visible 3 px focus ring in the player colour at 60%, offset 2 px.
- **Text scaling:** layouts hold up to 130% system text size; the hero number scales down before anything overflows.
- **Motion:** see 12.5. **Sound:** never the only feedback.

---

## 16. Implementation guide

### 16.1 CSS variables (`app/globals.css`)
```css
:root {
  --cloud:#F6F4FC; --surface:#FFFFFF; --glass:rgba(255,255,255,.72);
  --ink:#2E2547; --ink-2:#6E6589; --ink-3:#A39BB8; --line:rgba(46,37,71,.08);
  --blush:#F7A8C8; --blush-deep:#A8346C; --blush-soft:#FDEEF4;
  --sky:#8ED3EA;   --sky-deep:#1C6E8F;   --sky-soft:#EAF7FB;
  --lilac:#CDB8F5; --lilac-deep:#5E44B0; --lilac-soft:#F3EEFD;
  --peach:#FFB991; --peach-deep:#A24A1F; --peach-soft:#FFF1E8;
  --butter:#FFE18F;--butter-deep:#7A5800;--butter-soft:#FFF8E1;
  --mint:#AEE8C6;  --mint-deep:#1F6E46;  --mint-soft:#EDF9F2;
  --frost:#C9D7FF; --frost-deep:#3A4F9E; --frost-soft:#EEF2FF;
  --leaf:#9ED9A9;  --leaf-deep:#3E8A55;
  --r-tile:8px; --r-sm:14px; --r-md:20px; --r-lg:28px; --r-xl:36px;
  --shadow-soft:0 12px 32px -16px rgba(46,37,71,.18);
  --shadow-float:0 20px 40px -18px rgba(46,37,71,.25);
}
:root[data-theme="night"] {
  --cloud:#1D1836; --surface:#2A2350; --glass:rgba(42,35,80,.70);
  --ink:#F4F0FF; --ink-2:#BDB4DA; --ink-3:#837AA3; --line:rgba(255,255,255,.08);
  --shadow-soft:0 12px 32px -16px rgba(0,0,0,.35);
  --shadow-float:0 20px 40px -18px rgba(0,0,0,.45);
}
/* Player scope: set on any element that belongs to a player */
[data-player-color="blush"] { --p:var(--blush); --p-deep:var(--blush-deep); --p-soft:var(--blush-soft); --p-rgb:247 168 200; }
[data-player-color="sky"]   { --p:var(--sky);   --p-deep:var(--sky-deep);   --p-soft:var(--sky-soft);   --p-rgb:142 211 234; }
[data-player-color="lilac"] { --p:var(--lilac); --p-deep:var(--lilac-deep); --p-soft:var(--lilac-soft); --p-rgb:205 184 245; }
.shadow-player { box-shadow: 0 14px 30px -14px rgb(var(--p-rgb) / .55); }
```
The `data-theme` attribute is set by a small client hook from the theme setting and the current IST sky band.

### 16.2 Tailwind
Extend the theme to read the variables: colours (`cloud`, `ink`, `ink-2`, `p`, `p-deep`, `blush`…), border radius (`tile`, `sm`, `md`, `lg`, `xl`), box shadows (`soft`, `float`, `player`) and font families (`display: Baloo 2`, `sans: Figtree`). Components use these utilities; there are no raw hex values in components.

### 16.3 Component and asset structure
```
/components
  /sky        SkyScene.tsx  bands.ts  Island.tsx  Clouds.tsx  Aurora.tsx  Rainbow.tsx
  /bloom      Bloom.tsx (stage + micro-step + frozen/restored props)
  /companions Companion.tsx (mood engine)  /kinds/{Mochi,Tofu,Pip,Bun,Puff,Sprig}.tsx
  /icons      /puffy/*.tsx  /line/*.tsx
  /ui         Button  Chip  StatChip  Countdown  Sheet  Toast  Banner  Seeds  ProgressBar  CodeSeeds
  /game       TodayQuestCard  PlayerCard  TokenPouch  Heatmap  JourneyRoad  GiftBox  GiftShelf
  /moments    DayComplete  OnIce  Thaw  Shatter  Milestone  Unboxing  LevelUp  TokenRefill
/lib/motion.ts  /lib/sound.ts  /lib/haptics.ts  /lib/useSkyBand.ts
/public/sounds/{pop,chime,clink,crack,melt,whoosh,tap,rustle}.{mp3,ogg}
```
- **Creatures, flowers, icons and skies are hand-built SVG React components**, so they can take colour and mood props and be animated with Motion. There's no raster art except the app icons and notification badge.
- **Confetti:** `canvas-confetti` with custom petal and star shapes (`confetti.shapeFromPath`).
- **No Lottie dependency** in v1. All animation is Motion + SVG, which keeps the bundle small and the style consistent.

### 16.4 Build order for visuals
1. Tokens, fonts, buttons, chips, cards, sheet, nav.
2. Sky scene (static) and the day/night theme hook.
3. The Bloom component with all stages (static, then micro-steps).
4. One companion (Mochi) with all moods, then the other five.
5. Puffy icon set.
6. Screens with static states.
7. Standard transitions.
8. Signature moments, one at a time: day complete → on ice → thaw/shatter → milestone → unboxing → token refill → level up → rainbow.
9. Sounds and haptics.
10. Reduced-motion pass, performance pass on a real Android phone.

---

## 17. Asset checklist

- [x] App icons: 192, 512, maskable 512, apple-touch 180, badge 72 (monochrome)
- [x] Wordmark SVG (light and night)
- [x] Six sky bands plus aurora, rainbow, snow-cloud and petal-drift overlays
- [x] Island (grass top, soft underside)
- [x] Bloom: 7 stages × micro-steps, frozen shell, stitched heart
- [x] Six companions × 9 moods, each with a scarf slot for the player colour
- [x] Puffy icons (20, plus home, face, heart and lock for the nav and states) and line icons (nav + inline)
- [x] Journey road scenes (5 stage sections), gift pedestals, flags
- [x] Gift box (closed, wiggle, open, lid, ribbon), keepsake card
- [x] Badge medallions (16), with the badges screen
- [x] Wooden gift shelf
- [ ] Empty-state illustrations: broken pot, rain cloud, gift wrapping (the rain cloud is done; the others use companions for now)
- [x] Eight sounds (synthesized by `scripts/generate-sounds.sh`)
- [ ] iOS install guide illustration (3 steps); the steps are text for now, as both players use Android
