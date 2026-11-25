import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Guide } from './registry';
import { SRC } from './sources';
import { PREFLOP_EQUITY } from './preflopEquity';
import { Cite, GuideH2, GuideNote, GuideP, GuideTable, GuideUl, Sources } from './ui';

const SOURCES = [SRC.startingHands, SRC.holdem, SRC.upswingRfi, SRC.engine];
const STARTING = 1, HOLDEM = 2, RFI = 3, ENGINE = 4;

const RANKS = 'AKQJT98765432';
const NAMES: Record<string, string> = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: 'Ten', '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six', '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two' };
const PLURAL: Record<string, string> = { A: 'Aces', K: 'Kings', Q: 'Queens', J: 'Jacks', T: 'Tens', '9': 'Nines', '8': 'Eights', '7': 'Sevens', '6': 'Sixes', '5': 'Fives', '4': 'Fours', '3': 'Threes', '2': 'Twos' };
const label = (h: string) =>
  h.length === 2 ? `Pair of ${PLURAL[h[0]]}` : `${NAMES[h[0]]}-${NAMES[h[1]].toLowerCase()} ${h[2] === 's' ? 'suited' : 'offsuit'}`;
const show = (h: string) => h.replace(/T/g, '10');

const ranked = Object.entries(PREFLOP_EQUITY).sort((a, b) => b[1] - a[1]);

// Red (loses to a random hand more often than not) through gray at 50% to green (wins more often).
// Steps run from the 50% midpoint outward, light to deep.
const REDS = ['#e8a19b', '#df7f77', '#d25f56', '#bd4238', '#a1221b'];
const GREENS = ['#8cc79a', '#5fae71', '#3a9450', '#1f7d37', '#0b6b23'];
const MID = '#5a5a58';
const LO = 32, HI = 86;
const step = (t: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(t * n)));
const shade = (eq: number) =>
  Math.abs(eq - 50) < 1 ? MID : eq < 50 ? REDS[step((50 - eq) / (50 - LO), REDS.length)] : GREENS[step((eq - 50) / (HI - 50), GREENS.length)];
// Dark ink on the two lightest steps each side, white elsewhere.
const inkOn = (eq: number) => ([REDS[0], REDS[1], GREENS[0], GREENS[1]].includes(shade(eq)) ? '#1c1c1e' : '#ffffff');

/** All 169 starting hands, shaded by how often they beat one random hand. */
function EquityGrid() {
  const [hover, setHover] = useState<string>();
  const cell = (i: number, j: number) => (i === j ? RANKS[i] + RANKS[j] : i < j ? RANKS[i] + RANKS[j] + 's' : RANKS[j] + RANKS[i] + 'o');
  return (
    <figure className="mb-6 rounded-[12px] bg-[var(--bg-main)]/50 p-4 ring-1 ring-white/5">
      <div className="mx-auto grid max-w-[440px] gap-px" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }} onMouseLeave={() => setHover(undefined)}>
        {RANKS.split('').flatMap((_, i) =>
          RANKS.split('').map((__, j) => {
            const h = cell(i, j);
            const eq = PREFLOP_EQUITY[h];
            return (
              <span
                key={h}
                onMouseEnter={() => setHover(h)}
                title={`${show(h)}: wins ${eq}% against a random hand`}
                className="flex aspect-square flex-col items-center justify-center rounded-[2px] leading-none"
                style={{ background: shade(eq), color: inkOn(eq) }}
              >
                <span className="text-[8px] font-semibold sm:text-[10px]">{h.replace(/[so]$/, '')}</span>
                <span className="hidden text-[8px] opacity-80 sm:block">{Math.round(eq)}</span>
              </span>
            );
          }),
        )}
      </div>
      <p className="text-footnote mt-2 h-5 text-center text-[var(--text-primary)] tabular-nums">
        {hover ? `${label(hover)}: wins ${PREFLOP_EQUITY[hover]}% against a random hand` : 'Hover a hand.'}
      </p>
      <div className="mx-auto mt-1 flex max-w-[300px] items-center gap-2 text-[12px] text-[var(--text-muted)] tabular-nums">
        <span>{LO}%</span>
        <span
          className="h-2.5 flex-1 rounded-full"
          style={{ background: `linear-gradient(to right, ${[...REDS].reverse().join(',')}, ${MID}, ${GREENS.join(',')})` }}
        />
        <span>85%</span>
      </div>
      <figcaption className="text-footnote mt-3 text-[var(--text-muted)]">
        Suited hands above the diagonal, offsuit below, pairs on it. Green hands beat a random hand more than half the time,
        red ones less; the small number is the exact percentage.
      </figcaption>
    </figure>
  );
}

function Content() {
  return (
    <>
      <GuideP>
        Your two hole cards are the only private information you get, and the first decision of every hand is whether they're
        worth playing.
      </GuideP>

      <GuideH2 id="the-numbers">The numbers</GuideH2>
      <GuideUl>
        <li>
          There are 1,326 possible two-card hands, but only 169 different kinds once suits are ignored: 13 pairs, 78 suited hands
          and 78 offsuit hands.<Cite n={[STARTING, HOLDEM]} />
        </li>
        <li>
          You're dealt a pair 1 time in 17, and two cards of the same suit about 23.5% of the time.<Cite n={STARTING} />
        </li>
        <li>
          A specific pair, like aces, is 6 of the 1,326 hands: 1 time in 221.
        </li>
      </GuideUl>

      <GuideH2 id="best-hands">The best starting hands</GuideH2>
      <GuideP>
        The top 20, ranked by how often they win heads-up against one random hand once all five board cards are out. Computed on
        this site.<Cite n={ENGINE} />
      </GuideP>
      <GuideTable
        rows={[
          ['#', 'Hand', 'Name', 'Wins vs random'],
          ...ranked.slice(0, 20).map(([h, eq], i) => [String(i + 1), show(h), label(h), `${eq}%`]),
        ]}
      />

      <GuideH2 id="all-hands">Every starting hand</GuideH2>
      <EquityGrid />

      <GuideH2 id="what-makes-strong">What makes a hand strong</GuideH2>
      <GuideUl>
        <li>
          <strong>Pairs.</strong> Even 2-2 wins {PREFLOP_EQUITY['22']}% of the time against a random hand, and aces win{' '}
          {PREFLOP_EQUITY.AA}%.<Cite n={ENGINE} />
        </li>
        <li>
          <strong>High cards.</strong> An ace or king often wins as the highest pair or the best kicker, which is why the top of
          the grid is lighter.
        </li>
        <li>
          <strong>Suited.</strong> Being suited adds about 2–3 points: A-K suited wins {PREFLOP_EQUITY.AKs}% against{' '}
          {PREFLOP_EQUITY.AKo}% offsuit, and 7-6 suited {PREFLOP_EQUITY['76s']}% against {PREFLOP_EQUITY['76o']}%.
          <Cite n={ENGINE} />
        </li>
        <li>
          <strong>Connected.</strong> Cards close in rank, like 8-7, can make straights. Gaps cost straight chances, which is
          what the Chen formula's gap penalty measures.<Cite n={STARTING} />
        </li>
      </GuideUl>
      <GuideNote>
        Against one opponent the weakest hand is 3-2 offsuit ({PREFLOP_EQUITY['32o']}%), not the famous 7-2 offsuit (
        {PREFLOP_EQUITY['72o']}%). Against eight opponents it flips: 7-2 offsuit wins 5.4% and 3-2 offsuit 6.0%, because 3-2
        can still make a straight and 7-2 can't.<Cite n={ENGINE} />
      </GuideNote>

      <GuideH2 id="which-to-play">Which ones to play</GuideH2>
      <GuideP>
        Winning against a random hand isn't the whole story. The players who call or raise you don't hold random hands, and
        more opponents means each hand wins less often. So play fewer hands from early seats, more from late ones, and raise
        rather than call when you're first in.<Cite n={RFI} /> The{' '}
        <Link to="/guides/positions" className="text-[var(--accent)] hover:underline">
          positions guide
        </Link>{' '}
        has opening ranges for every seat.
      </GuideP>
      <GuideP>
        The NPCs on this site rank hands with the Chen formula, a quick point system by Bill Chen. Big cards score points;
        pairs, suits and connectedness add more; gaps take points away.<Cite n={STARTING} />
      </GuideP>

      <Sources list={SOURCES} />
    </>
  );
}

export const preflopGuide: Guide = {
  slug: 'preflop',
  title: 'Preflop Hands',
  description: 'How often you get each starting hand, which ones are best, and how pairs, suits and connected cards change them.',
  sections: [
    { id: 'the-numbers', title: 'The numbers' },
    { id: 'best-hands', title: 'The best starting hands' },
    { id: 'all-hands', title: 'Every starting hand' },
    { id: 'what-makes-strong', title: 'What makes a hand strong' },
    { id: 'which-to-play', title: 'Which ones to play' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
