# PRD — Bloom

> A two-player, gamified LeetCode streak tracker for a couple who challenge each other to practice every day.
> Each player's streak restores are controlled by the *other* player, and milestones unlock gifts from the partner.

| | |
|---|---|
| Status | Draft v1.0 |
| Date | 2 Nov 2026 |
| Platform | Installable Progressive Web App (PWA), hosted on Vercel |
| Players | Exactly 2 (one "pair") |
| Companion docs | `techspec.md` (how it's built), `design.md` (look & feel, to be written) |

---

## 1. Vision

Two people, one challenge: solve LeetCode problems every single day. The app automatically verifies each player's LeetCode activity, keeps their streaks, shows both players side-by-side like a two-player game, and turns milestones into real-world gifts from the partner. When someone slips, the only way back is to ask the other person for one of their limited restore tokens.

The app should feel like a cozy video game rather than a productivity tool: progress you can see, celebrations that feel earned, and a bit of friendly drama.

## 2. Goals and non-goals

### Goals
1. **Zero honesty disputes.** Daily progress is verified automatically from LeetCode wherever possible.
2. **Both players always know where they stand.** Today's progress, current streak, tokens left and next milestone are visible at a glance for both players.
3. **Make the stakes social.** Restores require the partner's approval, and milestones unlock partner-chosen gifts.
4. **Feel like a game.** XP, levels, badges, heatmaps, celebrations and notifications.
5. **Cost nothing to run.** Only free tiers are used (Vercel Hobby, Supabase Free, Web Push).
6. **Install on any phone.** Android and iPhone both work, through the PWA install flow, with push notifications.

### Non-goals (v1)
- More than 2 players, public leaderboards, or social features beyond the pair.
- Native iOS/Android apps or home-screen widgets.
- Code editing or problem solving inside the app; all solving happens on leetcode.com.
- In-app purchases or real payments for gifts. Gifts are fulfilled in real life.
- Support for LeetCode China (leetcode.cn).

## 3. Glossary

| Term | Meaning |
|---|---|
| **Player** | One of the two people in the pair. |
| **Partner** | The other player, from a given player's point of view. |
| **Challenge day** | A calendar day in IST (Asia/Kolkata) that a player's progress counts toward. |
| **Grace hour** | 00:00–01:00 IST, during which solves can still count toward the *previous* challenge day. |
| **Daily target** | Number of distinct accepted problems required for a challenge day to be complete. Default 1. Set by the partner. |
| **Make-up** | Extra problems owed on the day after a restored day. |
| **Run** | One unbroken streak. A run ends when a miss isn't restored, and a new run starts. |
| **Streak** | The length of the current run in counted days (complete or restored days). |
| **Restore token** | Lets a missed day be forgiven. Each player has up to 3, and only the partner can approve their use. |
| **Milestone** | Streak lengths that trigger a celebration and a gift: 15, 30, 50 and 100 days by default. |
| **Gift** | A real-world reward one player promises the other for a milestone. |
| **XP / Level** | Points earned for solving, which raise a player's level. |

---

## 4. Game rules (canonical)

These rules are the source of truth. `techspec.md` implements them exactly, and every rule has a test case.

### 4.1 Time
- All game time is **Indian Standard Time (IST, UTC+05:30)**, regardless of where the phone is or what timezone it's set to. India has no daylight saving time.
- A challenge day `D` runs from **00:00 IST on D** to **01:00 IST on D+1**, which includes the grace hour.
- The challenge starts on the pair's **start date**, chosen when the pair is created: any day from today up to 90 days out (IST), defaulting to tomorrow. Days before the start date are not tracked.

### 4.2 What counts as a solve
- A solve is an **Accepted** submission on leetcode.com by the player's linked LeetCode account.
- A problem counts **once per challenge day**. Re-submitting the same problem on the same day doesn't add to the count.
- Solving a problem you already solved on an *earlier* day **does** count toward the daily target, but earns only half XP (see 4.9).
- Any problem counts: the Daily Challenge, any difficulty, any topic.

### 4.3 Daily target (configurable)
- Each player has a **daily target** from 1 to 10 distinct problems. The default is **1**.
- A player's target is **set by their partner**, mirroring how restores work. The player can see their target and its history, but can't change it themselves.
- A target change takes effect at the **start of the next challenge day** (the next IST calendar date). It never changes the current day.
- Each day records the target that applied that day, so history stays accurate after changes.
- Both players are notified when a target changes.

### 4.4 Grace hour assignment
For a solve at IST time `t` on calendar date `C`:
- If `t` is between **01:00 and 23:59**, it counts toward day `C`.
- If `t` is between **00:00 and 00:59** (the grace hour):
  - it counts toward **yesterday (`C-1`)** if yesterday still needs problems to reach its requirement (target plus any make-up);
  - otherwise it counts toward **today (`C`)**.
- Solves are processed in timestamp order, so a burst in the grace hour first fills yesterday, then overflows into today.

Example: target 2. A player solved 1 problem yesterday and solves 3 problems at 00:20, 00:35 and 00:50. Yesterday gets the 00:20 solve and becomes complete. The 00:35 and 00:50 solves count toward today.

### 4.5 Day completion
- A day is **complete** as soon as its distinct solve count reaches **target + make-up**. This is checked live, so celebrations happen right away rather than at night.
- Completion can't be undone, because solves are only ever added.
- Exception: if the player's run is currently **at risk** (see 4.6), the window day's completion is *held* until the restore is resolved.

### 4.6 Misses and restores
When a day `D` ends (01:00 IST on D+1) incomplete, it is **missed**:

1. **No tokens left, or the current streak is 0:** the run ends immediately (there's nothing to save). A new run starts on day D+1.
2. **Tokens left:** the run becomes **at risk** (shown as a frozen or "on ice" streak). The **restore window** opens and lasts until the end of challenge day D+1 (01:00 IST on D+2).
3. During the window, the player who missed may send **one restore request** for day D, with an optional message of up to 280 characters ("I had a fever 🥺").
4. The partner can **Approve** or **Reject**, with an optional reply, at any time before the window closes.
   - **Approve:** one token is used. Day D is marked **restored** and counts toward the streak. If make-up is enabled (the default), day D+1 now requires **D+1's target + D's target**.
   - **Reject:** the run ends at D-1. A new run starts on day D+1, with no make-up required. No token is used.
   - **No request, or no response, by the end of the window:** the request **expires**. The run ends at D-1 and a new run starts on day D+1. No token is used.
5. **Make-up failure:** if a restore was approved but day D+1 ends without reaching target + make-up, day D goes back to **missed**, the run ends at D-1, and the token **stays spent**. A new run starts on D+2.
6. **Only one day can be restored at a time.** Since D+1 must be completed for the restore to stick, two missed days in a row always end the run. This holds whether or not make-up is enabled: with make-up off, D+1 must still reach its own target, otherwise day D reverts exactly as in rule 5 (no second restore is offered).
7. Restore requests can't be withdrawn once the partner has responded. A pending request can be cancelled by the person who sent it.

### 4.7 Restore tokens
- Every new run starts with **3 tokens**.
- When a run reaches any milestone length (15, 30, 50, 100…), tokens **refill to 3**. Tokens never go above 3.
- Each player can always see their own token count and their partner's.
- The partner is the only person who can approve spending a player's tokens.

### 4.8 Milestones and gifts
- Default milestones: **15, 30, 50 and 100** days. Either player can add higher milestones later (for example 150, 200, 365). Milestones that have already been achieved can't be removed.
- When a run's streak reaches a milestone:
  - there is a full-screen celebration for the player, and a notification for the partner;
  - tokens refill to 3;
  - if this player has **never achieved this milestone before**, it becomes an **achievement** and **unlocks the partner's gift** for it.
- Milestones are earned **once per player for life**. Reaching 15 again after a broken streak still gets a celebration and a token refill, but no new gift. The next new gift is the next milestone above the player's best.
- A milestone reached on a restored day is kept (achievement, gift, XP and badge) even if that restore is later undone by a failed make-up.
- **Gifts:**
  - Each player can pre-set a gift for each of their partner's milestones: a title, a teaser hint visible before unlock, optional details, and an optional link.
  - Before unlock, the receiver sees only a locked mystery box with the hint, if one was given.
  - On unlock, the receiver can open the box with an unboxing animation that reveals the gift.
  - If the giver hasn't set a gift when it unlocks, the receiver sees "your partner is wrapping it 🎁" and the giver gets a "You owe a gift!" prompt. The box can be opened as soon as the giver fills it in.
  - The receiver marks a gift **Received** once it has been handed over in real life.
  - A gift can be edited until it's revealed.

### 4.9 XP and levels
| Event | XP |
|---|---|
| Easy solve (first time solved, as recorded by the app — LeetCode doesn't publicly expose older solve history) | 10 |
| Medium solve | 25 |
| Hard solve | 50 |
| Re-solve of a problem already solved on an earlier day | half of the above, rounded down (Medium → 12) |
| Duplicate solve on the same day | 0 |
| Daily target completed | +20 |
| Make-up day completed | +30 |
| Milestone reached (first time) | +10 × milestone days (15 → 150 XP) |

- Extra solves beyond the daily target still earn XP.
- Total XP needed to reach level `L` is `50 × L × (L − 1)`: level 2 = 100, level 3 = 300, level 5 = 1,000, level 10 = 4,500.
- XP and levels are never lost, even when a streak breaks.

### 4.10 Badges (v1 set)
| Key | Name (working) | Condition |
|---|---|---|
| first_blood | First Blood | First counted solve |
| hat_trick | Hat Trick | 3+ distinct solves in one day |
| hard_hitter | Hard Hitter | First Hard solve |
| hard_mode | Hard Mode | 10 distinct Hard problems solved (re-solving one doesn't count again) |
| night_owl | Night Owl | A solve during the grace hour that saved the previous day |
| early_bird | Early Bird | A solve before 08:00 IST |
| perfect_week | Perfect Week | 7-day streak |
| iron_will | Iron Will | 30-day streak in a run with no restores used |
| comeback | Comeback Kid | Complete a make-up day |
| big_heart | Big Heart | Approve 3 of your partner's restores |
| explorer | Explorer | Solves across 10 distinct topic tags |
| century | Century | 100 total distinct problems |
| ms_15 / ms_30 / ms_50 / ms_100 | Milestone badges | Achieve each milestone |

---

## 5. Features and user stories

Priority: **P0** = required for v1 launch, **P1** = v1 if time allows, **P2** = later.

### 5.1 Onboarding and pairing (P0)
- As a new user, I sign in with my **Google account** in one tap. Only the two allowed Google accounts can get in; anyone else is signed straight back out.
- I set a display name, pick a companion creature from a built-in set, and pick my player colour (blush, sky or lilac). The two players can't share a colour.
- I enter my **LeetCode username**. The app checks it exists and shows my LeetCode avatar and solved count to confirm.
- The first player creates a pair and gets a **6-character invite code** to share. The second player enters the code to join. A pair is locked at 2 players.
- The pair creator picks the **start date**, from today up to 90 days out, which defaults to tomorrow.
- After setup, I'm prompted to **install the app** with platform-specific instructions (Android install prompt; iOS "Share → Add to Home Screen"), then to **enable notifications**.

**Acceptance:** two accounts can pair, set a start date, link valid LeetCode usernames, and both land on the dashboard. An invalid LeetCode username is rejected with a clear message. A third account can't join the pair.

### 5.2 Duel dashboard: home (P0)
Shows **both players side by side** (me on one side, partner on the other):
- current streak, with an "on ice" state when at risk;
- today's progress, for example `2 / 3` (including make-up, shown separately);
- restore tokens left (●●○);
- next milestone and days remaining, for example "🎁 in 4 days";
- level and XP progress bar;
- last synced time, with a "Sync now" button;
- a countdown to the end of today's day, highlighted during the grace hour;
- a status banner when relevant ("Your streak is on ice — ask for a restore", "{Partner} is asking you for a restore!", "You owe a gift!").

**Acceptance:** dashboard numbers match the engine's state. Changes made by the partner (solve, approval, gift reveal) appear within a few seconds without refreshing.

### 5.3 Automatic LeetCode sync (P0)
- The server polls each player's recent accepted submissions about every 10 minutes, and also when the app is opened or "Sync now" is tapped (at most once per 60 seconds per player).
- New solves are assigned to challenge days using rules 4.2–4.5, then XP, completion, milestones and badges are processed.
- If sync has failed for more than 3 hours, both players see a warning and the affected player gets a **manual check-in** option (5.13).

**Acceptance:** solving a problem on LeetCode shows up in the app within about 10 minutes, or immediately after "Sync now". Duplicates are never double-counted.

### 5.4 Heatmap and stats (P0)
- A GitHub-style **yearly heatmap** per player. Cell intensity reflects solves relative to the day's target. Restored days, missed days and today each have their own distinct style.
- Tapping a day shows its date, target, solves (titles, difficulty, time) and status.
- Stats: total distinct problems, Easy/Medium/Hard split, current streak, best streak, completion rate, top topics, XP and level.
- Partner's heatmap and stats are visible in full. There is nothing private between the two players.

### 5.5 Restore flow (P0)
- When my run is at risk, I see a prominent card with the missed date, time left in the window and a **Request restore** button with a message box.
- My partner gets a push notification and a card with my message, my tokens left and **Approve / Reject** buttons, plus an optional reply.
- Both of us see the outcome with a small ceremony: approved restores "thaw" the streak; rejected ones shatter it.
- If approved with make-up, my today card shows "Today: 1 + 1 make-up".
- There is a restore history list showing who asked, when, the messages, and the outcome.

**Acceptance:** all branches of rule 4.6 work, including expiry, make-up failure, zero tokens, and cancelling a pending request.

### 5.6 Daily target control (P0)
- In my partner's profile, I can set **their** daily target from 1 to 10. The screen shows "Takes effect tomorrow (date)".
- My partner is notified, and the target history is visible on their stats.

### 5.7 Milestones and celebrations (P0)
- Reaching a milestone triggers a full-screen celebration (confetti and animation; details in design.md), a token refill animation, and a gift unlock if it's a first-time achievement.
- The partner is notified ("{Partner} hit 30 days! Your gift for them is unlocked — make sure it's ready 👀").
- A milestone path/map shows 15 → 30 → 50 → 100 with my progress and lifetime achievements.

### 5.8 Gift vault (P0)
- **Gifts I'm giving:** for each of my partner's milestones, I can create or edit a gift (title, hint, details, link) and see its status: locked / unlocked / revealed / received.
- **Gifts I'm receiving:** mystery boxes per milestone, showing the hint while locked, an **Open** button once unlocked, and a **Mark received** button after the reveal.
- Notifications cover unlock (to both players), reveal (to the giver) and received (to the giver).

### 5.9 Push notifications (P0)
Delivered via Web Push to every device a player has installed and enabled. Players can turn each category on or off. Full catalogue in section 7.

### 5.10 PWA install and offline shell (P0)
- Installable on Android (Chrome) and iOS 16.4+ (Safari → Add to Home Screen), opening full-screen with the app icon and splash.
- If the device is offline, the app shell still opens and shows the last loaded data with an "offline" indicator.

### 5.11 XP, levels and badges (P0 for XP/levels, P1 for badges)
- Every solve shows its XP gain in the activity feed.
- Leveling up triggers a small celebration.
- A badge cabinet shows earned and locked badges with their conditions.

### 5.12 Nudges (P1)
- A **Nudge** button on the partner's side sends a playful push ("Go do your LeetCode 😤"), choosing from preset messages or custom text.
- Limited to 3 nudges per sender per day.

### 5.13 Manual check-in fallback (P1)
- Available only when automatic sync has failed for more than 3 hours, or the LeetCode API is unreachable.
- The player pastes a LeetCode problem URL, and the app records it as a solve at the current time.
- Manual solves show an "unverified" mark to the partner. They count normally toward rules and XP.

### 5.14 Activity feed (P1)
A shared timeline of solves, day completions, restores, target changes, milestones, gifts, badges and nudges.

### 5.15 Run history (P1)
A list of past runs with start and end dates, length, how each ended, and restores used.

### 5.16 Weekly recap (P2)
A Sunday-evening summary card and push notification: problems solved per player, XP, days completed, topics covered, and who "won" the week.

### 5.17 Settings (P0)
- Profile: name, avatar, LeetCode username (changing it requires re-verification).
- Notification categories on/off, plus a "Send test notification" button.
- Pair settings (shared): milestones list (add only), make-up on/off, and start date (editable only before the challenge starts).
- Sign out.

---

## 6. Screens (functional inventory)

Visual design, layout and animation are defined in `design.md`. This list only fixes what each screen must contain.

| Route | Screen | Contents |
|---|---|---|
| `/login` | Sign in | "Continue with Google" button |
| `/onboarding` | Setup wizard | Name and avatar → LeetCode username → create or join pair → start date → install guide → enable notifications |
| `/` | Duel dashboard | Section 5.2 |
| `/player/[id]` | Player profile | Heatmap, stats, badges, target (editable when it's the partner) |
| `/restores` | Restores | Active request card(s) and history |
| `/gifts` | Gift vault | Giving and receiving tabs |
| `/milestones` | Milestone path | Progress map and lifetime achievements |
| `/badges` | Badge cabinet | Earned and locked badges |
| `/feed` | Activity feed | P1 |
| `/history` | Runs | P1 |
| `/settings` | Settings | Section 5.17 |
| overlay | Celebrations | Day complete, level up, milestone, restore outcome, gift unboxing |

---

## 7. Notification catalogue

All times are IST. Each notification is sent at most once per key (deduplicated). Copy always refers to the partner by display name (`{Partner}`), never by pronoun; final copy lives in design.md §14.2.

| Kind | Recipient | Trigger | Example copy |
|---|---|---|---|
| reminder_evening | player | 21:00, today incomplete | "3 hours left — 0/1 today 🔥" |
| reminder_late | player | 23:00, today incomplete | "1 hour to midnight! Grace hour after that." |
| reminder_grace | player | 00:15, previous day incomplete | "45 min of grace left to save your streak 😱" |
| partner_done | player | partner completes today | "{Partner} is done for today. Your move 👀" |
| streak_on_ice | player | day missed, tokens > 0 | "Your streak is on ice ❄️ Ask for a restore before 1 AM tomorrow." |
| streak_broken | both | run ends (not after a rejected restore: restore_answered already says it) | "Streak over at 23 days 💔 New run starts today." |
| restore_requested | partner | request sent | "{Partner} is asking for a restore: 'I had a fever 🥺'" |
| restore_ask | player | 20:00 on the window day, at risk, no request sent yet | "Your flower is still frosted. Ask {Partner} before 1 am ❄️" |
| restore_closing | partner | 2 h before window end, still pending | "Restore request expires in 2 hours." |
| restore_answered | requester | approve/reject | "Restore approved 💖 Make-up: 1 extra problem today." |
| target_changed | player | partner changes target | "Your daily target is now 3, from tomorrow." |
| milestone_reached | both | milestone hit | "30 DAYS! 🎉 Gift unlocked." |
| gift_owed | giver | gift unlocked, not set | "You owe a gift for 30 days!" |
| gift_revealed | giver | receiver opened it | "{Partner} opened your 30-day gift 🎁" |
| gift_received | giver | marked received | "Gift marked received 💝" |
| level_up | player | new level | "Level 7 reached!" |
| badge_earned | player | new badge | "Badge unlocked: Night Owl 🦉" |
| nudge | partner | nudge sent | custom or preset |
| sync_failing | player | sync failing > 3 h | "Can't reach LeetCode — manual check-in is enabled." |

---

## 8. Edge cases (must be handled)

1. A solve at exactly 00:00:00 IST belongs to the grace window, and one at exactly 01:00:00 belongs to the new day only.
2. A grace-hour solve arrives at the server after 01:00, because of sync delay. It still counts toward yesterday based on its timestamp. A day is only finalized after a sync that ran after 01:00.
3. More than 20 solves between syncs: LeetCode's recent-AC list holds the last 20, so at least the first 20 count. This is practically impossible at a 10-minute interval, but should be documented.
4. A player changes their LeetCode username mid-challenge. New solves come from the new account; past data is kept.
5. The partner changes the target during the grace hour. It applies from the next IST calendar date, as always.
6. Both players miss the same day. Each can request from the other independently.
7. A restore is approved during day D+1 after D+1's original target is already met. D+1 becomes incomplete again until the make-up is done (the UI must explain this).
8. The start date is in the future. The dashboard shows a countdown, and solves before the start date are ignored for streaks (they still appear in stats as "pre-season").
9. A partner's device has notifications off. In-app banners still show pending actions.
10. The server or cron is down for hours. When it recovers, it catches up by finalizing every overdue day in order, using solve timestamps.
11. The LeetCode profile is private or the username is renamed. Sync fails, the sync_failing alert fires, and manual check-in becomes available.
12. Milestone reached on a restored day: it counts. Restored days count toward streak length.
13. A new milestone is added that's lower than the current streak. It isn't retroactively achieved; it'll be achieved the next time a run reaches it.

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| Cost | ₹0/month. Vercel Hobby, Supabase Free, Web Push only. No credit card. |
| Availability | The scheduler must keep the database active, so Supabase never pauses it. Recovering from downtime must be automatic and correct (edge case 10). |
| Latency | Dashboard interactive in under 2 s on 4G. Partner actions appear in under 5 s through realtime updates. |
| Correctness | The rules engine is pure, deterministic and covered by unit tests for every rule and edge case above. |
| Security | Only the two pair members can read pair data. All game-state writes go through server code. No secrets in the client. |
| Privacy | Stores only email, display name, LeetCode username and public LeetCode submission metadata. |
| Devices | Android Chrome (latest 2 versions) and iOS Safari 16.4+ installed PWA. Desktop browsers work too. |
| Accessibility | Respect reduced-motion settings (celebrations degrade gracefully), sufficient contrast, tappable targets ≥ 44 px. |

## 10. Release plan

| Phase | Scope |
|---|---|
| **v1.0 (launch)** | 5.1–5.11 (badges optional), 5.17, all P0 notifications, PWA install |
| **v1.1** | Badges (if not in 1.0), nudges, manual check-in, activity feed, run history |
| **v1.2** | Weekly recap, sound effects, extra milestones UI, themes |

## 11. Decisions deferred to `design.md`
- ~~Final app name~~ Decided: **Bloom**. Domain to be confirmed.
- Visual style: video-game aesthetic, custom illustrated icons, avatars, color palette, typography.
- Animation language for celebrations, streak flame, "on ice" state, token refill, gift unboxing.
- Sound design (if any) and haptics.
- Copywriting tone for notifications and empty states.
