# Poker Dictionary

[![CI](https://github.com/sawyerpham/pokerdictionary/actions/workflows/ci.yml/badge.svg)](https://github.com/sawyerpham/pokerdictionary/actions/workflows/ci.yml)

No-limit hold'em against customizable NPCs, or spectate them playing each other.

**Live:** https://poker.sawyerpham.dev

## Features

- **Table**: 2–9 player NLHE cash game with side pots, animations, and an equity hint
- **Players**: famous-style presets and archetypes, every knob editable, plus your own NPCs
- **Spectate**: watch an all-NPC table at up to 4× speed
- **Study**: a range builder, preflop and equity drills, a heads-up turn and river solver, and a trainer that grades each decision by EV loss

## Architecture

The game engine (hand evaluation, Monte Carlo equity, side pots, bot decisions) is TypeScript in [`src/engine/`](src/engine/) and runs entirely in the browser. Equity hints run thousands of simulations per decision, and doing that client-side keeps them instant with no network round trip, while the server stays light no matter how many tables are open. The FastAPI backend ([`backend/app.py`](backend/app.py)) only serves the built site.

The solver is [b-inary/postflop-solver](https://github.com/b-inary/postflop-solver) (Discounted CFR, Rust) compiled to WebAssembly and run in a Web Worker ([`src/solver/`](src/solver/)). Heads-up, a river spot with two bet sizes and raises solves in tens of milliseconds; a turn spot (the river cards included) takes about a second with one bet size and five or six with two. The wrapper crate is in [`solver/`](solver/) and its build output, `src/solver/pkg`, is committed, so building the site doesn't need Rust. After changing the crate, run `sh solver/build.sh` (needs only Docker). The solver and the wrapper are AGPL-3.0-or-later; the rest of this repo is MIT.

## Run locally

```sh
npm install && npm run dev        # frontend (the engine runs in the browser)
npm test                          # engine and solver self-checks
```

`npm test` checks hand rankings against known cases, equity against published odds (AA vs KK ≈ 82%), side-pot splits, and the chip calculator. It also plays 1,600 bot hands at 2–10 players with uneven stacks and asserts that chips are conserved and every hand finishes. `solver/check.mjs` solves a toy river and checks the textbook result: with a pot-size bet, the polar player bluffs half as often as it value-bets and the bluff-catcher calls half the time. It also solves a turn spot and walks through the river card. CI runs lint, tests, and the build on every push.

Deploy: `docker compose up -d --build` (see `compose.yml`).

Built with React, TypeScript, Vite, Tailwind, and FastAPI serving the build.
