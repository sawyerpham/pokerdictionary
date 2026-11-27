import { Link } from 'react-router-dom';
import { PRESETS } from '../engine/profiles';

const FEATURES = [
  { tag: 'Table', title: "No-limit hold'em", blurb: 'A full cash game for 2 to 9 players: blinds, min-raises, side pots, and showdowns.', to: '/table' },
  { tag: 'Opponents', title: 'Pick who you play', blurb: 'Start heads-up against a random player, then fill the table with up to eight pros, entertainers and classic player types.', to: '/table' },
  { tag: 'Presets', title: 'Famous styles', blurb: `${PRESETS.filter((p) => p.group !== 'Archetypes').length} pro and celebrity caricatures. Customize any of their 13 style knobs, from VPIP to tilt.`, to: '/table' },
  { tag: 'Spectate', title: 'Watch them play', blurb: 'Hand the seat to an NPC and watch the table run at up to 4× speed, hole cards up.', to: '/table' },
  { tag: 'Motion', title: 'Table animations', blurb: 'Cards dealt around the table, chips thrown in, folds mucked, shoves pushed, and pots pushed to the winner.', to: '/table' },
  { tag: 'Study', title: 'Drills and a river solver', blurb: 'Build ranges, drill preflop opens and equity, and play river spots against a CFR solver that grades every decision.', to: '/study' },
  { tag: 'Tools', title: 'Equity and tracking', blurb: 'A hidden equity readout with pot odds, a hand log, session results, and a profit graph.', to: '/table' },
];

export function HomePage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:py-20">
      <div className="space-y-16 sm:space-y-20">
        <section>
          <h1 className="mb-4 max-w-3xl text-[40px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[56px]">Poker against anyone you want.</h1>
          <p className="mb-8 max-w-2xl text-[19px] leading-snug text-[var(--text-muted)] sm:text-[21px]">
            A clean, ad-free no-limit hold'em table with NPCs you can tune knob by knob, or watch play each other.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link to="/table" className="flex min-h-11 items-center rounded-full bg-[var(--accent)] px-6 text-[17px] text-white transition hover:brightness-110">
              Open Table
            </Link>
            <Link to="/guides" className="flex min-h-11 items-center gap-1.5 text-[17px] text-[var(--accent)] hover:underline">
              Learn the game
              <svg viewBox="0 0 8 14" className="h-3.5 w-2 shrink-0" aria-hidden>
                <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-title-2 mb-5 sm:text-[28px]">Features</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link key={f.tag} to={f.to} className="flex flex-col rounded-[18px] bg-[var(--bg-second)] p-5 transition-colors hover:bg-[var(--bg-third)]">
                <p className="text-caption mb-1.5 text-[var(--text-muted)]">{f.tag}</p>
                <h3 className="text-headline mb-1.5">{f.title}</h3>
                <p className="flex-1 text-[15px] leading-relaxed text-[var(--text-muted)]">{f.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
