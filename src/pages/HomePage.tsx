import { Link } from 'react-router-dom';
import { PRESETS } from '../engine/profiles';

const FEATURES = [
  { tag: 'Table', title: "No-limit hold'em", blurb: 'A full cash game for 2 to 9 players: blinds, min-raises, side pots, and showdowns.', to: '/table' },
  { tag: 'Opponents', title: 'Pick who you play', blurb: 'Start heads-up against a random player, then fill the table with up to eight pros, entertainers and classic player types.', to: '/table' },
  { tag: 'Presets', title: 'Famous styles', blurb: `${PRESETS.filter((p) => p.group !== 'Archetypes').length} pro and celebrity caricatures. Customize any of their 13 style knobs, from VPIP to tilt.`, to: '/table' },
  { tag: 'Spectate', title: 'Watch them play', blurb: 'Hand the seat to an NPC and watch the table run at up to 4× speed, hole cards up.', to: '/table' },
  { tag: 'Motion', title: 'Table animations', blurb: 'Cards dealt around the table, chips thrown in, folds mucked, shoves pushed, and pots pushed to the winner.', to: '/table' },
  { tag: 'Study', title: 'Drills and a solver', blurb: 'Preflop charts and drills, pot odds, a flop-to-river trainer graded by a solver, and a leak finder for your hand histories.', to: '/study' },
  { tag: 'Tools', title: 'Equity and tracking', blurb: 'A hidden equity readout with pot odds, a hand log, session results, and a profit graph.', to: '/table' },
];

export function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-16 pb-16 sm:pt-32 sm:pb-24">
      <section className="mb-20 sm:mb-28">
        <p className="mb-5 text-[14px] text-[var(--text-muted)]">No-limit hold'em, in your browser</p>
        <h1 className="mb-6 max-w-3xl text-[44px] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-[68px]">Poker against anyone you want.</h1>
        <p className="mb-9 max-w-xl text-[17px] leading-relaxed text-[var(--text-muted)] sm:text-[18px]">
          A clean, ad-free no-limit hold'em table with NPCs you can tune knob by knob, or watch play each other.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link to="/table" className="flex min-h-11 items-center gap-2.5 rounded-full bg-[var(--text-primary)] px-5 text-[15px] font-medium text-[var(--bg-main)] transition hover:bg-white">
            <svg viewBox="0 0 10 12" className="h-3 w-2.5" aria-hidden>
              <path d="M0 0l10 6-10 6z" fill="currentColor" />
            </svg>
            Open table
          </Link>
          <Link to="/guides" className="flex min-h-11 items-center gap-1.5 text-[15px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
            Learn the game
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-[13px] text-[var(--text-muted)]">Features</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link key={f.tag} to={f.to} className="group flex flex-col rounded-[12px] bg-[var(--bg-second)] transition-colors hover:bg-[var(--bg-third)]">
              <div className="flex items-center gap-2 px-4 pt-3.5 pb-3 text-[13px]">
                <span aria-hidden className="text-[var(--text-muted)]">♣</span>
                <span className="font-medium">{f.tag}</span>
                <span className="ml-auto text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
                  →
                </span>
              </div>
              <div className="mx-2 mb-2 flex flex-1 flex-col rounded-[8px] bg-[var(--bg-main)] px-3.5 py-3 ring-1 ring-[var(--line)]">
                <h3 className="mb-1 text-[15px] font-medium">{f.title}</h3>
                <p className="flex-1 text-[14px] leading-relaxed text-[var(--text-muted)]">{f.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
