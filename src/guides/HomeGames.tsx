import { Link } from 'react-router-dom';
import { ChipSide, money } from '../components/Chips';
import type { Guide } from './registry';
import { SRC } from './sources';
import { Cite, GuideH2, GuideH3, GuideNote, GuideOl, GuideP, GuideTable, GuideUl, Sources } from './ui';

const SOURCES = [SRC.robertsRules, SRC.cashGame, SRC.tournament, SRC.dealersChoice, SRC.holdem];
const RULES = 1, CASH = 2, TOURNEY = 3, DC = 4, HOLDEM = 5;

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
      <GuideP>
        Running a game for friends: what to check first, how to set up chips and blinds, and the house rules worth agreeing on
        before the first hand.
      </GuideP>

      <GuideH2 id="legal">First, check the law</GuideH2>
      <GuideP>
        Laws on private poker vary, and in the US they're mostly made at the state level. Some states ban playing for money
        entirely; others allow social gambling. No state lets a private host run poker as a business, so taking a rake from pots or
        charging an hourly fee is for licensed cardrooms only.<Cite n={RULES} /> Check your local rules before playing for money.
        Playing for chips with no cash value, or for small prizes, avoids most of the question.
      </GuideP>

      <GuideH2 id="cash-or-tournament">Cash game or tournament?</GuideH2>
      <GuideUl>
        <li>
          <strong>Cash game:</strong> chips are money, people can buy in, top up and leave between hands, and the blinds never
          change.<Cite n={CASH} /> Easiest to run when guests arrive and leave at different times.
        </li>
        <li>
          <strong>Tournament:</strong> everyone pays the same buy-in for the same chips, blinds rise on a schedule, and it ends when
          one player has everything.<Cite n={TOURNEY} /> Better when everyone starts together, and nobody can lose more than the
          buy-in.
        </li>
      </GuideUl>

      <GuideH2 id="setup">Setting up</GuideH2>
      <GuideH3>Cash game chips</GuideH3>
      <GuideP>
        Pick blinds, then give everyone the same starting stack. A buy-in of 100 big blinds is standard. The{' '}
        <Link to="/chips" className="text-[var(--accent)] hover:underline">
          chip calculator
        </Link>{' '}
        works out the stacks from your own chip set.
      </GuideP>
      <StartingStack />
      <GuideP>
        Pick one person as the banker. They sell chips, write down every buy-in and rebuy, and cash everyone out at the end. The
        totals should match to the dollar.
      </GuideP>
      <GuideH3>Tournament structure</GuideH3>
      <GuideP>
        Blinds go up by time or by number of hands.<Cite n={TOURNEY} /> One simple home structure: 10,000 chips each, 20-minute
        levels.
      </GuideP>
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
        Fixed payouts are simplest. For example, ten players at $20 each could pay $100 for first, $60 for second and $40 for
        third.<Cite n={TOURNEY} /> Players can also agree to stop and split the prizes, often in proportion to their chips.
        <Cite n={TOURNEY} />
      </GuideP>

      <GuideH2 id="house-rules">House rules to agree on</GuideH2>
      <GuideP>
        Arguments at home games usually come from rules nobody agreed on beforehand. These are the standard ones from{' '}
        <em>Robert's Rules of Poker</em>, whose private-game edition is free to read online.<Cite n={RULES} />
      </GuideP>
      <GuideOl>
        <li>
          <strong>Table stakes.</strong> Only the chips in front of you when the hand starts can be bet. Nobody reaches for their
          wallet mid-hand.<Cite n={RULES} />
        </li>
        <li>
          <strong>Say it or do it in one motion.</strong> In no-limit, announce your raise or put the chips in all at once. Adding
          chips in trips is a "string bet" and doesn't count as a raise.<Cite n={RULES} />
        </li>
        <li>
          <strong>Act in turn.</strong> Acting out of turn on purpose isn't allowed.<Cite n={RULES} />
        </li>
        <li>
          <strong>Cards speak.</strong> At showdown the cards decide, not what someone says they have, but you must show all your
          cards to win.<Cite n={RULES} />
        </li>
        <li>
          <strong>Misdeals.</strong> If the first hole card dealt is exposed, it's a misdeal: reshuffle and deal again.
          <Cite n={RULES} />
        </li>
        <li>
          <strong>No splashing the pot</strong>, no checking it down together when a third player is all in, and no telling
          someone what they have before they show it.<Cite n={RULES} />
        </li>
      </GuideOl>

      <GuideH2 id="dealing">Dealing at home</GuideH2>
      <GuideUl>
        <li>
          The dealer button moves one seat clockwise after every hand.<Cite n={HOLDEM} /> Without a house dealer, the simplest
          habit is that whoever has the button deals. Use a real button or any marker so nobody loses track.
        </li>
        <li>Casinos burn one card face down before the flop, turn and river; do the same at home.<Cite n={HOLDEM} /></li>
        <li>
          <strong>Dealer's choice</strong> is a home-game favourite: each dealer picks the variant for their hand or for a full
          orbit, from a list everyone agreed on beforehand.<Cite n={DC} />
        </li>
      </GuideUl>
      <GuideNote>
        Practise first: the <Link to="/table" className="text-[var(--accent)] hover:underline">table</Link> can match your home
        game. Set the blinds and buy-in, add your friends' playing styles from the player list, and play a few hundred hands
        before the real one.
      </GuideNote>

      <Sources list={SOURCES} />
    </>
  );
}

export const homeGamesGuide: Guide = {
  slug: 'home-games',
  title: 'Home Games',
  description: 'Hosting poker with friends: the law, cash or tournament, chips and blinds, payouts, and house rules.',
  sections: [
    { id: 'legal', title: 'Check the law' },
    { id: 'cash-or-tournament', title: 'Cash or tournament' },
    { id: 'setup', title: 'Setting up' },
    { id: 'house-rules', title: 'House rules' },
    { id: 'dealing', title: 'Dealing at home' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
