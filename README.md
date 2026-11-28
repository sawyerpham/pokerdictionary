# Poker Dictionary

[![CI](https://github.com/sawyerpham/pokerdictionary/actions/workflows/ci.yml/badge.svg)](https://github.com/sawyerpham/pokerdictionary/actions/workflows/ci.yml)

No-limit hold'em against customizable NPCs, or spectate them playing each other.

**Live:** https://poker.sawyerpham.dev

## Features

- **Table**: 2–9 player NLHE cash game with side pots, animations, and an equity hint
- **Players**: famous-style presets and archetypes, every knob editable, plus your own NPCs
- **Spectate**: watch an all-NPC table at up to 4× speed
- **Accounts**: sign in with Google or an emailed link, and your ranges, drill progress, settings and players follow you to every device
- **Push/fold**: the heads-up shove-or-fold equilibrium for 1–25 bb, as a chart and a drill (computed with this site's engine by [`scripts/pushfold.ts`](scripts/pushfold.ts))
- **Progress**: every drill answer and trainer decision, with your accuracy over time and your costliest habits
- **AI coach** (Premium): send a screenshot of a hand and DeepSeek coaches you through each decision, with follow-up questions
- **Study**: a range builder, preflop and equity drills, a heads-up turn and river solver, and a trainer that plays flop, turn and river spots and grades each decision by EV loss
- **Facing a raise**: six-max, 100 bb charts and a drill for facing an open, a 3-bet, a 4-bet and an all-in. A preflop model ([`scripts/preflop.ts`](scripts/preflop.ts)): CFR+ over the 169 hands with postflop play estimated from equity, position and playability, fitted so every spot's overall fold/call/raise frequencies land within about 3 points of [BeyondGTO's](https://beyondgto.com/defense) published solver output
- **Pot odds**: count your outs against a hand you can see and call or fold an all-in, or just work out the price
- **Hand history**: paste or open PokerStars or GGPoker hand histories; it reads them in the browser and shows results by position, HUD stats against rough targets, preflop choices checked against the charts, and heads-up flop decisions graded against the flop libraries
- **Range quiz**: paint an opening or facing-a-raise chart from memory and get scored by combos
- **Board reports**: how often each player bets each kind of flop, and how much of their equity they realize, from the flop libraries
- **Daily flop**: one library flop decision a day, the same for everyone, with a streak
- **Bet sizing**: check, bet small or bet big, from flops solved with two sizes a street
- **Solver**: flops too, on every core when the page is cross-origin isolated (the server sends COOP/COEP), and node locking to see how to exploit a player who over-bets or over-folds
- **Facing a raise at 20–200 bb**: the same model at other stack depths, where short stacks turn 3-bets and 4-bets into all-ins

## Architecture

The game engine (hand evaluation, Monte Carlo equity, side pots, bot decisions) is TypeScript in [`src/engine/`](src/engine/) and runs entirely in the browser. Equity hints run thousands of simulations per decision, and doing that client-side keeps them instant with no network round trip, while the server stays light no matter how many tables are open. The FastAPI backend ([`backend/app.py`](backend/app.py)) serves the built site and keeps accounts in SQLite (a Docker volume): Google sign-in, one-time emailed links sent through Resend, cookie sessions, and a synced copy of each saved browser store, where the newest copy wins. Account types: owner (the emails in `OWNER_EMAILS`, set only on the server), admin (granted and removed only by an owner; sets default and premium and sees the stats on the Admin page), premium, and default; each includes everything below it. Type changes are kept in an audit log shown on the Admin page. The AI coach is premium and up: the server sends the screenshot and conversation to DeepSeek (`deepseek-flash`, which reads images), so the key never reaches the browser, and premium accounts get `COACH_DAILY` replies a day (30 by default). Server settings go in `~/poker.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAILS`, `DEEPSEEK_API_KEY`, `COACH_DAILY`. A feature without its key is simply hidden.

The solver is [b-inary/postflop-solver](https://github.com/b-inary/postflop-solver) (Discounted CFR, Rust) compiled to WebAssembly and run in a Web Worker ([`src/solver/`](src/solver/)). Heads-up, a river spot with two bet sizes and raises solves in tens of milliseconds; a turn spot (the river cards included) takes about a second with one bet size and five or six with two. The wrapper crate is in [`solver/`](solver/) and its build output, `src/solver/pkg`, is committed, so building the site doesn't need Rust. After changing the crate, run `sh solver/build.sh` (needs only Docker). It builds two packages: `src/solver/pkg` (one core) and `src/solver/pkg-threads` (every core, through [wasm-bindgen-rayon](https://github.com/RReverser/wasm-bindgen-rayon) and shared memory; nightly Rust). The worker picks the threaded one when the page is cross-origin isolated: a flop that takes about a minute on one core solves in under 15 seconds on 16.

Flops take minutes to solve, so the trainer's flops come from libraries computed ahead of time on a desktop: [`scripts/compute.ts`](scripts/compute.ts) runs the native build of the same solver ([`solver/native/`](solver/native/), built with `sh solver/native/build.sh`) over the pots in [`scripts/spots.ts`](scripts/spots.ts), with the site's ranges, to within 1% of the pot, and keeps every flop decision in `public/flops` (about 40 KB a flop). The libraries and `public/reports` are too big for git: `sh deploy/upload-data.sh` copies them to the server, where `compose.yml` mounts them. It also writes the board reports, the facing-a-raise charts at other stack depths, and the realization numbers the preflop model can use. It runs one job after another with a progress bar, uses half the CPU and memory at low priority by default, and picks up where it left off if stopped (`node scripts/compute.ts --list`). The standard libraries have raises on the flop only, to fit in memory; the trainer then solves the turn live from the ranges that reached it, raises included. The solver and the wrapper are AGPL-3.0-or-later; the rest of this repo is MIT.

## Tests and deploys

`npm test` checks hand rankings against known cases, equity against published odds (AA vs KK ≈ 82%), side-pot splits, and the chip calculator. It also plays 1,600 bot hands at 2–10 players with uneven stacks and asserts that chips are conserved and every hand finishes. `solver/check.mjs` solves a toy river and checks the textbook result: with a pot-size bet, the polar player bluffs half as often as it value-bets and the bluff-catcher calls half the time. It also solves a turn spot and walks through the river card, and a flop spot with a different bet size per street. The engine check also covers pot-odds math, the facing-a-raise charts (aces always re-raise, the big blind defends wider against the button than against UTG), and reading two sample hand histories. CI runs lint, tests, and the build on every push.

Deploy: every push to `main` that passes CI redeploys the site. The `deploy` job SSHes in with a key (the `DEPLOY_SSH_KEY` Actions secret) whose only allowed command is [`deploy/cd.sh`](deploy/cd.sh) (pull, rebuild, wait until healthy). By hand: `sh deploy/cd.sh` on the server.

Built with React, TypeScript, Vite, Tailwind, and FastAPI serving the build.
