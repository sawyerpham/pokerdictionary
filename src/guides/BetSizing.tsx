import type { Guide } from './registry';
import { SRC } from './sources';
import { BoardTextures } from './diagrams';
import { Cite, GuideFormula, GuideH2, GuideNote, GuideP, GuideTable, GuideUl, Sources } from './ui';

const SOURCES = [SRC.upswingSizing, SRC.upswingRfi, SRC.potOdds, SRC.betting, SRC.robertsRules];
const SIZING = 1, RFI = 2, POTODDS = 3, BETTING = 4, RULES = 5;

// What a bet of b (as a share of the pot) offers a caller: they call b to win 1 + b.
const OFFER = [0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.5, 2].map((b) => [
  `${Math.round(b * 100)}% pot`,
  `${Math.round((b / (1 + 2 * b)) * 100)}%`,
  `${+((1 + b) / b).toFixed(1)} : 1`,
]);

function Content() {
  return (
    <>
      <GuideP>
        In no-limit you choose the size of every bet, from one big blind up to your whole stack.<Cite n={[BETTING, RULES]} /> The
        size decides what your opponent's calls cost them and which of their hands can continue.
      </GuideP>

      <GuideH2 id="what-a-bet-does">What a bet does</GuideH2>
      <GuideUl>
        <li>
          <strong>Value:</strong> get called by worse hands.
        </li>
        <li>
          <strong>Denial:</strong> make hands with outs fold, so they can't catch up. That matters most on boards full of draws.
          <Cite n={SIZING} />
        </li>
        <li>
          <strong>Bluff:</strong> make better hands fold.
        </li>
      </GuideUl>
      <GuideP>
        Every size gives the caller a price.<Cite n={POTODDS} /> Bigger bets charge draws more but also fold out the worse hands you
        wanted calls from.
      </GuideP>
      <GuideFormula>caller needs = bet ÷ (pot + 2 × bet)</GuideFormula>
      <GuideTable rows={[['Bet', 'Caller needs', 'Pot odds offered'], ...OFFER]} />

      <GuideH2 id="preflop">Preflop sizes</GuideH2>
      <GuideUl>
        <li>
          <strong>Opening:</strong> about 2.25 big blinds from every seat except the small blind. Some strong players use 2 bb,
          with 2.5 bb from the button.<Cite n={RFI} />
        </li>
        <li>
          <strong>Bigger against weak players in the blinds.</strong> If they call 3.5 bb with the same hands as 2.5 bb, the bigger
          raise wins more.<Cite n={SIZING} />
        </li>
        <li>
          <strong>3-bets:</strong> about three times the open in position, about four times out of position.<Cite n={SIZING} />
        </li>
      </GuideUl>

      <GuideH2 id="board-texture">Small on dry boards, big on wet ones</GuideH2>
      <BoardTextures />
      <GuideP>
        On a dry, static board like K-7-2 with three suits, little can change by the river and your opponent's hands have little
        equity. Bet small, 25–35% of the pot. Their calling range barely shrinks against a bigger bet anyway.<Cite n={SIZING} />
      </GuideP>
      <GuideP>
        On a wet, dynamic board like 9-8-6 with two hearts, your value hands can be outdrawn. Bet 55–80% of the pot to charge the
        draws.<Cite n={SIZING} />
      </GuideP>

      <GuideH2 id="spr">Stack-to-pot ratio</GuideH2>
      <GuideFormula>SPR = effective stack ÷ pot (on the flop)</GuideFormula>
      <GuideP>
        Plan the sizes for every street before you bet the flop. Players who bet too big early often end up with a tiny bet
        left on the river, and a tiny river shove gets almost no folds.<Cite n={SIZING} /> That's why continuation bets in
        3-bet pots, where the pot is already big compared with the stacks, are usually small: 25–40% of the pot.
        <Cite n={SIZING} />
      </GuideP>

      <GuideH2 id="turn-and-river">Turns, rivers and overbets</GuideH2>
      <GuideUl>
        <li>
          <strong>Second barrels:</strong> when you bet the turn after betting the flop, bet at least about 66% of the pot. By
          the turn your betting range should be polarized, strong hands and bluffs, with medium hands checking.
          <Cite n={SIZING} />
        </li>
        <li>
          <strong>Overbets:</strong> bet more than the pot when the board favours your range and only you can hold the nuts.
          <Cite n={SIZING} />
        </li>
      </GuideUl>
      <GuideNote>
        The NPCs' <strong>Usual bet size</strong> and <strong>Overbets</strong> sliders set these habits. A player who always
        bets the same fraction is easier to read than one who changes size with the board.
      </GuideNote>

      <Sources list={SOURCES} />
    </>
  );
}

export const betSizingGuide: Guide = {
  slug: 'bet-sizing',
  title: 'Bet Sizing',
  description: 'What each bet size offers the caller, and how big to bet preflop, on dry and wet boards, and on later streets.',
  sections: [
    { id: 'what-a-bet-does', title: 'What a bet does' },
    { id: 'preflop', title: 'Preflop sizes' },
    { id: 'board-texture', title: 'Board texture' },
    { id: 'spr', title: 'Stack-to-pot ratio' },
    { id: 'turn-and-river', title: 'Turns, rivers, overbets' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
