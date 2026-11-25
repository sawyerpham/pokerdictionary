import type { Guide } from './registry';
import { SRC } from './sources';
import { MiniCards } from './diagrams';
import { Cite, GuideH2, GuideNote, GuideP, GuideUl, Sources } from './ui';

const SOURCES = [SRC.handsList, SRC.probability, SRC.robertsRules, SRC.holdem];
const HANDS_LIST = 1, PROB = 2, RULES = 3, HOLDEM = 4;

// Strongest first. Odds: how often each is the best five-card hand from seven cards.
const RANKS: { name: string; cards: string; what: string; odds: number }[] = [
  { name: 'Royal flush', cards: 'As Ks Qs Js Ts', what: 'A-K-Q-J-10, all one suit. The best possible hand.', odds: 0.0032 },
  { name: 'Straight flush', cards: '9h 8h 7h 6h 5h', what: 'Five in a row, all one suit.', odds: 0.0279 },
  { name: 'Four of a kind', cards: 'Qs Qh Qd Qc 4s', what: 'All four cards of one rank.', odds: 0.168 },
  { name: 'Full house', cards: 'Ks Kh Kd 7c 7s', what: 'Three of one rank and two of another.', odds: 2.6 },
  { name: 'Flush', cards: 'Ad Jd 8d 5d 2d', what: 'Any five of one suit.', odds: 3.03 },
  { name: 'Straight', cards: '9c 8d 7h 6s 5c', what: 'Five in a row, mixed suits.', odds: 4.62 },
  { name: 'Three of a kind', cards: '8s 8h 8c Kd 3s', what: 'Three of one rank.', odds: 4.83 },
  { name: 'Two pair', cards: 'Js Jd 6h 6c Ad', what: 'Two different pairs.', odds: 23.5 },
  { name: 'One pair', cards: 'Ts Th Ad 9c 4h', what: 'Two of one rank.', odds: 43.8 },
  { name: 'High card', cards: 'Ac Qd 9s 6h 3c', what: 'Nothing above. The highest card plays.', odds: 17.4 },
];

/** The ranked chart: every hand, strongest first, with an example and how often it comes up. */
function RankChart() {
  return (
    <figure className="mb-6 rounded-[12px] bg-[var(--bg-main)]/50 p-3 ring-1 ring-white/5 sm:p-4">
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
            <span className="col-start-2 flex items-center gap-2 sm:col-start-auto" title={`${h.name}: ${h.odds}% of seven-card hands`}>
              <span className="h-2 flex-1 rounded-full bg-white/[0.06]">
                <span className="block h-2 rounded-full bg-[#3987e5]" style={{ width: `${Math.max(0.8, (h.odds / 43.8) * 100)}%` }} />
              </span>
              <span className="w-14 text-right text-[12px] text-[var(--text-muted)] tabular-nums">{h.odds}%</span>
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="text-footnote mt-3 text-[var(--text-muted)]">
        Strongest at the top. The bar is how often each one is the best hand you can make from your two cards plus the five on the
        board.
      </figcaption>
    </figure>
  );
}

function Content() {
  return (
    <>
      <GuideP>
        Every poker hand is five cards. In hold'em you make the best five you can from your two hole cards and the five board
        cards, and the best hand at showdown wins.<Cite n={HOLDEM} /> Here's the order, strongest first.
      </GuideP>

      <GuideH2 id="the-ranking">The ranking</GuideH2>
      <GuideP>
        A hand in a higher category always beats any hand in a lower one.<Cite n={HANDS_LIST} /> The bars show how often each
        comes up.<Cite n={PROB} />
      </GuideP>
      <RankChart />

      <GuideH2 id="ties">Breaking ties</GuideH2>
      <GuideP>When two players have the same kind of hand, compare the ranks inside it:</GuideP>
      <GuideUl>
        <li>
          <strong>Pairs, trips and quads:</strong> the higher pair or set wins. If they're equal, the highest other card, the{' '}
          <strong>kicker</strong>, decides, then the next one.<Cite n={HANDS_LIST} />
        </li>
        <li>
          <strong>Two pair:</strong> compare the higher pair, then the lower pair, then the kicker.<Cite n={HANDS_LIST} />
        </li>
        <li>
          <strong>Straights and flushes:</strong> the highest card wins. For flushes, compare card by card down the line.
          <Cite n={HANDS_LIST} />
        </li>
        <li>
          <strong>Full house:</strong> the three of a kind decides first, then the pair.<Cite n={HANDS_LIST} />
        </li>
        <li>
          <strong>Suits never break a tie.</strong> If both best five-card hands are identical, the pot is split.
          <Cite n={[RULES, HOLDEM]} />
        </li>
      </GuideUl>

      <GuideH2 id="gotchas">Things that trip up new players</GuideH2>
      <GuideUl>
        <li>
          <strong>Only five cards count.</strong> On a board of A-A-K-7-2, a player with K-Q and a player with K-J both have
          two pair, aces and kings. The fifth card decides it: the queen beats the jack.<Cite n={HANDS_LIST} />
        </li>
        <li>
          <strong>Ace can be low.</strong> A-2-3-4-5 is a straight, the lowest one (a five-high straight).<Cite n={HANDS_LIST} />
        </li>
        <li>
          <strong>A flush beats a straight</strong>, and a full house beats both.<Cite n={HANDS_LIST} />
        </li>
        <li>
          <strong>Your hole cards don't have to play.</strong> If the best five include none of them, every player still in has
          that same hand, and the pot is split unless someone's hole cards beat it.<Cite n={HOLDEM} />
        </li>
      </GuideUl>
      <GuideNote>On the table, the name of each player's hand shows under their seat at showdown.</GuideNote>

      <Sources list={SOURCES} />
    </>
  );
}

export const handRankingsGuide: Guide = {
  slug: 'hand-rankings',
  title: 'Hand Rankings',
  description: 'Which hands beat which, strongest to weakest, how ties are broken, and the rules that catch beginners.',
  sections: [
    { id: 'the-ranking', title: 'The ranking' },
    { id: 'ties', title: 'Breaking ties' },
    { id: 'gotchas', title: 'Common mistakes' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
