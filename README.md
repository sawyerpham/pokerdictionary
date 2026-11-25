# Poker Dictionary

No-limit hold'em against customizable NPCs, or spectate them playing each other.

**Live:** https://poker.sawyerpham.dev

## Features

- **Table**: 2–9 player NLHE cash game with side pots, animations, and an equity hint
- **Players**: famous-style presets and archetypes, every knob editable, plus your own NPCs
- **Spectate**: watch an all-NPC table at up to 4× speed

## Run locally

```sh
npm install && npm run dev        # frontend (the engine runs in the browser)
node src/engine/selfcheck.ts      # engine self-check
```

Deploy: `docker compose up -d --build` (see `compose.yml`).

Built with React, TypeScript, Vite, Tailwind, and FastAPI serving the build.
