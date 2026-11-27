# Poker Dictionary

[![CI](https://github.com/sawyerpham/pokerdictionary/actions/workflows/ci.yml/badge.svg)](https://github.com/sawyerpham/pokerdictionary/actions/workflows/ci.yml)

No-limit hold'em against customizable NPCs, or spectate them playing each other.

**Live:** https://poker.sawyerpham.dev

## Features

- **Table**: 2–9 player NLHE cash game with side pots, animations, and an equity hint
- **Players**: famous-style presets and archetypes, every knob editable, plus your own NPCs
- **Spectate**: watch an all-NPC table at up to 4× speed
- **Accounts**: sign in with Google or an emailed link, and your ranges, drill progress, settings and players follow you to every device
- **AI coach** (Premium): send a screenshot of a hand and DeepSeek coaches you through each decision, with follow-up questions
- **Study**: a range builder, preflop and equity drills, a heads-up turn and river solver, and a trainer that grades each decision by EV loss

## Architecture

The game engine (hand evaluation, Monte Carlo equity, side pots, bot decisions) is TypeScript in [`src/engine/`](src/engine/) and runs entirely in the browser. Equity hints run thousands of simulations per decision, and doing that client-side keeps them instant with no network round trip, while the server stays light no matter how many tables are open. The FastAPI backend ([`backend/app.py`](backend/app.py)) serves the built site and keeps accounts in SQLite (a Docker volume): Google sign-in, one-time emailed links sent through Resend, cookie sessions, and a synced copy of each saved browser store, where the newest copy wins. Account types: owner (the emails in `OWNER_EMAILS`, set only on the server), admin and premium (set on the Admin page), and default; each includes everything below it. The AI coach is premium and up: the server sends the screenshot and conversation to DeepSeek (`deepseek-flash`, which reads images), so the key never reaches the browser, and premium accounts get `COACH_DAILY` replies a day (30 by default). Server settings go in `~/poker.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAILS`, `DEEPSEEK_API_KEY`, `COACH_DAILY`. A feature without its key is simply hidden.

The solver is [b-inary/postflop-solver](https://github.com/b-inary/postflop-solver) (Discounted CFR, Rust) compiled to WebAssembly and run in a Web Worker ([`src/solver/`](src/solver/)). Heads-up, a river spot with two bet sizes and raises solves in tens of milliseconds; a turn spot (the river cards included) takes about a second with one bet size and five or six with two. The wrapper crate is in [`solver/`](solver/) and its build output, `src/solver/pkg`, is committed, so building the site doesn't need Rust. After changing the crate, run `sh solver/build.sh` (needs only Docker). The solver and the wrapper are AGPL-3.0-or-later; the rest of this repo is MIT.

## Run locally

```sh
npm install && npm run dev        # frontend (the engine runs in the browser)
npm test                          # engine and solver self-checks
python backend/check.py           # accounts: sign-in, sessions, sync, rate limits, account types, coach
```

`npm test` checks hand rankings against known cases, equity against published odds (AA vs KK ≈ 82%), side-pot splits, and the chip calculator. It also plays 1,600 bot hands at 2–10 players with uneven stacks and asserts that chips are conserved and every hand finishes. `solver/check.mjs` solves a toy river and checks the textbook result: with a pot-size bet, the polar player bluffs half as often as it value-bets and the bluff-catcher calls half the time. It also solves a turn spot and walks through the river card. CI runs lint, tests, and the build on every push.

Deploy: every push to `main` that passes CI redeploys the site. The `deploy` job SSHes in with a key whose only allowed command is [`deploy/cd.sh`](deploy/cd.sh) (pull, rebuild, wait until healthy). By hand: `sh deploy/cd.sh` on the server.

Built with React, TypeScript, Vite, Tailwind, and FastAPI serving the build.
