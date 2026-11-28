import { Link } from 'react-router-dom';
import { ChipSide, money } from '../components/Chips';
import type { Guide } from './registry';
import { SRC } from './sources';
import { Cite, GuideH2, GuideH3, GuideP, GuideTable, GuideUl, Sources } from './ui';

const SOURCES = [SRC.robertsRules, SRC.cashGame, SRC.tournament, SRC.dealersChoice];
const RULES = 1, CASH = 2, TOURNEY = 3, DC = 4;

// One 100-big-blind starting stack at $1/$2: 10 × $1, 8 × $5, 6 × $25 = $200.
const STACK = [
  { denom: 1, count: 10 },
  { denom: 5, count: 8 },
  { denom: 25, count: 6 },
];

/** The suggested starting stack drawn as chip columns, in the chip colors from Settings. */
function StartingStack() {
  return (
    <figure className="mb-6 rounded-[12px] bg-[var(--bg-main)]/50 p-4 ring-1 ring-white/5">
      <h3 className="card-title">Starting stack</h3>
      <div className="flex flex-wrap items-end justify-center gap-8">
        {STACK.map(({ denom, count }) => (
          <div key={denom} className="flex flex-col items-center gap-2">
            <div className="relative w-8" style={{ height: 12 + (count - 1) * 4 }}>
              {Array.from({ length: count }, (_, k) => (
                <span key={k} className="absolute left-0" style={{ bottom: k * 4 }}>
                  <ChipSide denom={denom} />
                </span>
              ))}
            </div>
            <span className="text-[13px] font-semibold tabular-nums">
              {count} × {money(denom)}
            </span>
            <span className="text-caption text-[var(--text-muted)] tabular-nums">{money(denom * count)}</span>
          </div>
        ))}
      </div>
      <figcaption className="text-footnote mt-3 text-center text-[var(--text-muted)]">
        24 chips worth $200: 100 big blinds at $1/$2. The colors follow your chip settings (Vegas by default).
      </figcaption>
    </figure>
  );
}

function Content() {
  return (
    <>
      <GuideH2 id="legal">Check the law</GuideH2>
      <GuideP>
        In the US, private poker is mostly governed by state law: some states ban playing for money, others allow social games.
        A private host may never rake pots or charge by the hour.<Cite n={RULES} />
      </GuideP>

      <GuideH2 id="setup">Setting up</GuideH2>
      <GuideUl>
        <li><strong>Cash game:</strong> blinds never change; players can buy in and leave between hands.<Cite n={CASH} /></li>
        <li><strong>Tournament:</strong> one buy-in each, rising blinds, played until one player has every chip.<Cite n={TOURNEY} /></li>
        <li>Have one banker record every buy-in, rebuy and cash-out.</li>
      </GuideUl>
      <GuideH3>Cash game stack</GuideH3>
      <StartingStack />
      <GuideP>
        Use the{' '}
        <Link to="/chips" className="text-[var(--accent-soft)] hover:underline">
          chip calculator
        </Link>{' '}
        for your own set.
      </GuideP>
      <GuideH3>Tournament blinds</GuideH3>
      <GuideP>10,000 chips each, 20-minute levels:</GuideP>
      <GuideTable
        rows={[
          ['Level', 'Blinds', 'Level', 'Blinds'],
          ['1', '25 / 50', '6', '200 / 400'],
          ['2', '50 / 100', '7', '300 / 600'],
          ['3', '75 / 150', '8', '400 / 800'],
          ['4', '100 / 200', '9', '600 / 1,200'],
          ['5', '150 / 300', '10', '1,000 / 2,000'],
        ]}
      />
      <GuideP>
        Example payouts, ten players at $20: $100 / $60 / $40. Remaining players may agree to stop and split in proportion to
        chips.<Cite n={TOURNEY} />
      </GuideP>

      <GuideH2 id="house-rules">Rules for edge cases</GuideH2>
      <GuideUl>
        <li><strong>Table stakes:</strong> only chips in front of you when the hand starts can be bet.<Cite n={RULES} /></li>
        <li><strong>String bet:</strong> announce a raise or put the chips in with one motion, or the extra chips don't count.<Cite n={RULES} /></li>
        <li><strong>Out of turn:</strong> acting out of turn on purpose isn't allowed.<Cite n={RULES} /></li>
        <li><strong>Showdown:</strong> cards speak, whatever was said; show all your cards to win.<Cite n={RULES} /></li>
        <li><strong>Misdeal:</strong> if the first hole card dealt is exposed, reshuffle and redeal. Any other exposed hole card: finish the deal and replace it with the top card.<Cite n={RULES} /></li>
        <li><strong>Collusion and angles:</strong> no checking it down by agreement when a third player is all in, and no reading someone's hand for them before it's face up.<Cite n={RULES} /></li>
        <li><strong>Dealer's choice:</strong> agree the list of variants beforehand.<Cite n={DC} /></li>
      </GuideUl>

      <Sources list={SOURCES} />
    </>
  );
}

export const homeGamesGuide: Guide = {
  slug: 'home-games',
  title: 'Home Games',
  description: 'Law, chips, blinds, payouts and the rules for edge cases.',
  sections: [
    { id: 'legal', title: 'Check the law' },
    { id: 'setup', title: 'Setting up' },
    { id: 'house-rules', title: 'Edge cases' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
