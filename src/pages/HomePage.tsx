import { Link } from 'react-router-dom';
import { CardSwarm } from '../components/CardSwarm';
import { PRESETS } from '../engine/profiles';

const FEATURES = [
  {
    tag: 'Play',
    title: 'Play against anyone',
    blurb: `No-limit hold'em for 2 to 9 players against ${PRESETS.filter((p) => p.group !== 'Archetypes').length} pro and celebrity styles or your own, with an equity hint and session tracking. Or send a friend a link and play them heads-up.`,
    to: '/table',
  },
  { tag: 'Practice', title: 'Drills and a trainer', blurb: 'Preflop charts, pot odds and equity drills, a daily flop, and flop-to-river hands graded by a solver.', to: '/study/preflop' },
  { tag: 'Solver', title: 'Solve your own spots', blurb: 'Set ranges, a board and bet sizes and solve in your browser, or read how often each kind of flop gets bet.', to: '/study/solver' },
  { tag: 'Review', title: 'Find your leaks', blurb: 'Import hand histories, see where your drills cost you most, and ask the AI coach (Premium) about a hand.', to: '/study/history' },
  { tag: 'Calculators', title: 'Odds and chips', blurb: 'Win odds for every hand at a table, and chip counts for your home game.', to: '/evaluator' },
  { tag: 'Guides', title: 'Learn the game', blurb: 'From hand rankings to bluffing and bet sizing, with sources.', to: '/guides' },
];

export function HomePage() {
  return (
    <main className="flex-1 pb-16 sm:pb-24">
      <h1 className="px-4 pt-14 text-center font-serif text-[44px] leading-[1.05] tracking-[-0.02em] sm:pt-24 sm:text-[76px]">
        {/* Each word comes into focus in turn, then the art flows in (see index.css). */}
        <span className="word-in">Player,</span> <span className="word-in [animation-delay:0.18s]">meet</span>
        <br />
        <span className="word-in [animation-delay:0.36s]">potential.</span>
      </h1>
      <CardSwarm />

      <section className="mx-auto w-full max-w-6xl px-4 pt-4">
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
