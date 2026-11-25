# Poker Dictionary

[![CI](https://github.com/sawyerpham/pokerdictionary/actions/workflows/ci.yml/badge.svg)](https://github.com/sawyerpham/pokerdictionary/actions/workflows/ci.yml)

No-limit hold'em against customizable NPCs, or spectate them playing each other.

**Live:** https://poker.sawyerpham.dev

## Features

- **Table**: 2–9 player NLHE cash game with side pots, animations, and an equity hint
- **Players**: famous-style presets and archetypes, every knob editable, plus your own NPCs
- **Spectate**: watch an all-NPC table at up to 4× speed

## Architecture

The game engine (hand evaluation, Monte Carlo equity, side pots, bot decisions) is TypeScript in [`src/engine/`](src/engine/) and runs entirely in the browser. Equity hints run thousands of simulations per decision, and doing that client-side keeps them instant with no network round trip, while the server stays light no matter how many tables are open. The FastAPI backend ([`backend/app.py`](backend/app.py)) only serves the built site.

## Run locally

```sh
npm install && npm run dev        # frontend (the engine runs in the browser)
npm test                          # engine self-check
```

`npm test` checks hand rankings against known cases, equity against published odds (AA vs KK ≈ 82%), side-pot splits, and the chip calculator. It also plays 1,600 bot hands at 2–10 players with uneven stacks and asserts that chips are conserved and every hand finishes. CI runs lint, tests, and the build on every push.

Deploy: `docker compose up -d --build` (see `compose.yml`).

Built with React, TypeScript, Vite, Tailwind, and FastAPI serving the build.
