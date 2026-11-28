import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SRC } from '../guides/sources';
import { PAGES_ABOUT, TOOLS } from '../study/tools';

interface Ref {
  by: string;
  title: string;
  url: string;
}

const REPO = 'https://github.com/sawyerpham/pokerdictionary/blob/main';
const engine: Ref = { by: SRC.engine.by, title: 'This site’s hand evaluator (source code)', url: SRC.engine.url };
const solver: Ref = { by: 'b-inary', title: 'postflop-solver (open source, Discounted CFR)', url: 'https://github.com/b-inary/postflop-solver' };
const defense: Ref = { by: 'BeyondGTO', title: 'Defending against an open: published solver output', url: 'https://beyondgto.com/defense' };
const threeBet: Ref = { by: 'BeyondGTO', title: '3-bet poker strategy', url: 'https://beyondgto.com/blog/3-bet-poker-strategy' };
const model: Ref = { by: SRC.engine.by, title: 'The preflop model (source code)', url: `${REPO}/scripts/preflop.ts` };
const pushfold: Ref = { by: SRC.engine.by, title: 'The push/fold equilibrium (source code)', url: `${REPO}/scripts/pushfold.ts` };

const LIBRARY =
  'Flops come from a library solved ahead of time with postflop-solver, within 1% of the pot of perfect play, using the site’s opening and facing-a-raise ranges.';

/** What's behind each page: how its numbers are made and where they come from. Keys are tool slugs and page ids. */
const DETAILS: Record<string, { text: string[]; sources?: Ref[] }> = {
  preflop: { text: ['Opening ranges are Upswing Poker’s six-max charts.'], sources: [SRC.upswingRfi] },
  facing: {
    text: [
      'Six-max, 5% rake, everyone else folds. Opening ranges are the site’s opening charts. The rest is this site’s preflop model: each decision solved, with play after the flop estimated from equity and position, then tuned so its overall frequencies match published solver output (BeyondGTO) within about 3 points.',
      'Hand by hand it’s close, not exact: solvers sometimes just call with the strongest hands to trap and pick other bluffs, where this model raises its best hands every time. Away from 100 bb the opening ranges are still the 100 bb charts and the model is less tested.',
    ],
    sources: [SRC.upswingRfi, defense, threeBet, model],
  },
  quiz: {
    text: [
      'Tap or drag to paint; start on a painted hand to erase. The score counts combos: a missed hand and an extra hand cost the same, and pairs, suited and offsuit hands count 6, 4 and 12. Hands a facing-a-raise chart mixes count as in when they take that action more than half the time.',
    ],
    sources: [SRC.upswingRfi, defense, model],
  },
  pushfold: {
    text: [
      'Heads-up (or folded to the small blind), no antes, at the equilibrium: neither player can do better by changing. In the chart, green plays at your stack and the number is the deepest stack (bb) at which the hand still shoves or calls. Computed with this site’s engine.',
    ],
    sources: [pushfold, engine],
  },
  daily: { text: [LIBRARY, 'A new flop comes at midnight UTC. The streak counts days in a row with an answer.'], sources: [solver] },
  trainer: {
    text: [LIBRARY, 'To fit in memory those solves have raises on the flop only. Once the flop is done, the turn and river are solved live in your browser, raises included.'],
    sources: [solver],
  },
  sizing: {
    text: [
      'From flops solved with two bet sizes on every street and raises throughout (postflop-solver, within 1% of the pot). Small bets suit boards where your whole range is ahead; big bets suit boards where your strong hands and draws pull apart from the rest.',
    ],
    sources: [solver, SRC.upswingSizing],
  },
  equity: { text: ['Your equity is worked out by the site’s hand evaluator against the opponent’s range.'], sources: [engine, SRC.probability] },
  potodds: {
    text: [
      'An all-in has no later bets, so the price and your chance to win settle it. Outs are the next cards that put you ahead. The rule of 2 and 4: each out is worth about 2% per card still to come.',
    ],
    sources: [SRC.potOdds],
  },
  solver: { text: ['The solver runs in your browser: postflop-solver compiled to WebAssembly.'], sources: [solver] },
  reports: { text: ['Suits are shown one way; each flop stands for every suit pattern like it. Averages weigh each flop by how often it comes.'], sources: [solver] },
  ranges: {
    text: ['Tap or drag to paint with the brush weight; start on a hand that already has it to erase. Suited hands are above the diagonal, offsuit below.'],
  },
  history: {
    text: ['Hand histories are read in your browser. The stat ranges are rough rules of thumb for six-max cash games, and a stat needs enough chances before it means much.'],
    sources: [SRC.vpip, SRC.hud, SRC.upswingRfi],
  },
  progress: { text: ['Built from your drill answers and trainer decisions.'] },
  coach: {
    text: ['Screenshots and messages go to DeepSeek to write the reply; nothing is stored.'],
    sources: [{ by: 'DeepSeek', title: 'The company whose model writes the replies', url: 'https://www.deepseek.com' }],
  },
  table: { text: ['The game, its odds and the opponents all run in your browser.'], sources: [engine, SRC.holdem] },
  evaluator: { text: ['Win odds come from the site’s hand evaluator, run in your browser.'], sources: [engine, SRC.probability] },
  chips: { text: ['Chip counts are worked out from your buy-in, colors and values.'] },
};

const ENTRIES = [...TOOLS.map((t) => ({ id: t.slug, title: t.title, about: t.about, to: `/study/${t.slug}` })), ...PAGES_ABOUT];

export function AboutPage() {
  const { hash, key } = useLocation();
  // Arriving from a "?" note lands on that section.
  useEffect(() => {
    const el = hash && document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [hash, key]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-title-2 mb-1">About</h1>
      <p className="mb-5 text-[15px] text-[var(--text-muted)]">What each page does, how its numbers are made, and the sources.</p>
      <nav aria-label="Sections" className="mb-8 flex flex-wrap gap-1.5">
        {ENTRIES.map((e) => (
          <Link key={e.id} to={`#${e.id}`} replace className="flex min-h-9 items-center rounded-[8px] px-2.5 text-[13px] ring-1 ring-[var(--line)] ring-inset hover:bg-white/[0.06]">
            {e.title}
          </Link>
        ))}
      </nav>
      {ENTRIES.map((e) => {
        const d = DETAILS[e.id];
        return (
          <section key={e.id} id={e.id} className={`mb-4 scroll-mt-20 rounded-[12px] bg-[var(--bg-second)] p-4 sm:p-5 ${hash === `#${e.id}` ? 'ring-1 ring-[var(--accent)]' : ''}`}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{e.title}</h2>
              <Link to={e.to} className="shrink-0 text-[13px] text-[var(--accent-soft)] hover:underline">
                Open
              </Link>
            </div>
            <p className="text-[15px] leading-relaxed">{e.about}</p>
            {d.text.map((p) => (
              <p key={p} className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">
                {p}
              </p>
            ))}
            {d.sources && (
              <>
                <h3 className="mt-3 text-[12px] font-medium text-[var(--text-muted)]">Sources</h3>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-[13px] text-[var(--text-muted)]">
                  {d.sources.map((s) => (
                    <li key={s.url}>
                      {s.by}.{' '}
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-[var(--accent-soft)] hover:underline">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        );
      })}
    </main>
  );
}
