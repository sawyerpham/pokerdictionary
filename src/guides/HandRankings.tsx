import type { ReactNode } from 'react';
import type { Guide } from './registry';
import { SRC } from './sources';
import { MiniCards } from './diagrams';
import { Cite, GuideH2, GuideP, Sources } from './ui';

const SOURCES = [SRC.handsList, SRC.probability];
const HANDS_LIST = 1, PROB = 2;

// Strongest first. count: seven-card hands (of 133,784,560) whose best five cards make this.
const RANKS: { name: string; cards: string; what: string; count: number }[] = [
  { name: 'Royal flush', cards: 'As Ks Qs Js Ts', what: 'A-K-Q-J-10, all one suit. The best possible hand.', count: 4_324 },
  { name: 'Straight flush', cards: '9h 8h 7h 6h 5h', what: 'Five in a row, all one suit.', count: 37_260 },
  { name: 'Four of a kind', cards: 'Qs Qh Qd Qc 4s', what: 'All four cards of one rank.', count: 224_848 },
  { name: 'Full house', cards: 'Ks Kh Kd 7c 7s', what: 'Three of one rank and two of another.', count: 3_473_184 },
  { name: 'Flush', cards: 'Ad Jd 8d 5d 2d', what: 'Any five of one suit.', count: 4_047_644 },
  { name: 'Straight', cards: '9c 8d 7h 6s 5c', what: 'Five in a row, mixed suits.', count: 6_180_020 },
  { name: 'Three of a kind', cards: '8s 8h 8c Kd 3s', what: 'Three of one rank.', count: 6_461_620 },
  { name: 'Two pair', cards: 'Js Jd 6h 6c Ad', what: 'Two different pairs.', count: 31_433_400 },
  { name: 'One pair', cards: 'Ts Th Ad 9c 4h', what: 'Two of one rank.', count: 58_627_800 },
  { name: 'High card', cards: 'Ac Qd 9s 6h 3c', what: 'Nothing above. The highest card plays.', count: 23_294_460 },
];

const TOTAL = 133_784_560;
const pct = (n: number) => `${Number(((n / TOTAL) * 100).toPrecision(3))}%`;
/** "1/39"; one decimal when the hand is common enough for it to matter. */
const fraction = (n: number) => {
  const x = TOTAL / n;
  return `1/${x < 10 ? x.toFixed(1) : Math.round(x).toLocaleString('en-US')}`;
};
const MOST = Math.max(...RANKS.map((h) => h.count));

/** The ranked chart (also used by Poker Overview): every hand, strongest first, with an example and how often it comes up. */
export function RankChart({ cite }: { cite?: ReactNode }) {
  return (
    <figure className="mb-6 rounded-[12px] bg-[var(--bg-main)]/50 p-3 ring-1 ring-white/5 sm:p-4">
      <h3 className="card-title">Ranked, strongest first</h3>
      <ol className="space-y-1.5">
        {RANKS.map((h, i) => (
          <li key={h.name} className="grid grid-cols-[1.75rem_1fr] items-center gap-x-3 gap-y-1 rounded-[10px] bg-[var(--bg-second)] p-2.5 sm:grid-cols-[1.75rem_11rem_8rem_1fr]">
            <span className="row-span-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-white tabular-nums sm:row-span-1">
              {i + 1}
            </span>
            <span>
              <span className="block text-[15px] font-semibold">{h.name}</span>
              <span className="text-caption block text-[var(--text-muted)]">{h.what}</span>
            </span>
            <span className="col-start-2 sm:col-start-auto">
              <MiniCards cards={h.cards} />
            </span>
            <span className="col-start-2 flex items-center gap-2 sm:col-start-auto" title={`${h.name}: ${pct(h.count)}, about ${fraction(h.count)} seven-card hands`}>
              <span className="h-2 flex-1 rounded-full bg-white/[0.06]">
                <span className="block h-2 rounded-full bg-[#3987e5]" style={{ width: `${Math.max(0.8, (h.count / MOST) * 100)}%` }} />
              </span>
              <span className="w-16 text-right text-[12px] leading-tight tabular-nums">
                <span className="block text-[var(--text-primary)]">{fraction(h.count)}</span>
                <span className="block text-[var(--text-muted)]">{pct(h.count)}</span>
              </span>
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="text-footnote mt-3 text-[var(--text-muted)]">
        Strongest at the top. The bar is how often each one is the best hand you can make from your two cards plus the five on the
        board.{cite}
      </figcaption>
    </figure>
  );
}

function Content() {
  return (
    <>
      <GuideH2 id="the-ranking">The ranking</GuideH2>
      <GuideP>
        A hand in a higher category always beats any hand in a lower one.<Cite n={HANDS_LIST} /> The numbers show how often each
        comes up.<Cite n={PROB} />
      </GuideP>
      <RankChart />

      <GuideH2 id="kicker">Kicker</GuideH2>
      <GuideP>
        A <strong>kicker</strong> is a card in your five that isn't part of the pair, trips or quads. When two players have the
        same kind of hand at the same rank, the higher kicker wins.<Cite n={HANDS_LIST} /> For example, A-K beats A-Q when both
        pair the ace.
      </GuideP>

      <Sources list={SOURCES} />
    </>
  );
}

export const handRankingsGuide: Guide = {
  slug: 'hand-rankings',
  title: 'Hand Rankings',
  description: 'Which hands beat which, strongest to weakest.',
  sections: [
    { id: 'the-ranking', title: 'The ranking' },
    { id: 'kicker', title: 'Kicker' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
