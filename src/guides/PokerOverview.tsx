import { Link } from 'react-router-dom';
import type { Guide } from './registry';
import { SRC } from './sources';
import { HandFlow, SidePotDiagram, TableAnatomy, TableDiagram } from './diagrams';
import { Cite, GuideH2, GuideH3, GuideNote, GuideOl, GuideP, GuideUl, Sources } from './ui';

const SOURCES = [SRC.holdem, SRC.robertsRules, SRC.betting, SRC.probability, SRC.vpip, SRC.hud, SRC.potOdds, SRC.position, SRC.bluff, SRC.tilt, SRC.strategy];
// Citation numbers, in SOURCES order.
const HOLDEM = 1, RULES = 2, BETTING = 3, PROB = 4, VPIP = 5, HUD = 6, POTODDS = 7, POSITION = 8, BLUFF = 9, TILT = 10, STRATEGY = 11;


function Content() {
  return (
    <>
      <GuideP>
        How no-limit Texas hold'em works, from the blinds to the showdown, and what every term on this site means. This is the
        game the <Link to="/table" className="text-[var(--accent)] hover:underline">table</Link> plays.
      </GuideP>

      <GuideH2 id="the-game">The game</GuideH2>
      <GuideP>
        Each player gets two private cards (hole cards), and five shared cards (the board) are dealt face up in the middle. Your
        hand is the best five-card combination of your two cards and the board's five.<Cite n={HOLDEM} /> You win a pot in one of
        two ways: everyone else folds, or you hold the best hand at the showdown.
      </GuideP>
      <GuideP>
        A white disc called the <strong>dealer button</strong> marks who deals, in turn. It moves one seat clockwise every hand, so
        everyone takes turns acting last.<Cite n={HOLDEM} />
      </GuideP>

      <GuideH2 id="a-hand">How a hand plays</GuideH2>
      <TableAnatomy />
      <HandFlow />
      <GuideOl>
        <li>
          <strong>Blinds.</strong> The player left of the button posts the small blind and the next player posts the big blind,
          forced bets that give everyone something to win.<Cite n={HOLDEM} />
        </li>
        <li>
          <strong>Hole cards.</strong> Two cards each, one at a time, starting with the small blind and ending with the button.
          <Cite n={HOLDEM} />
        </li>
        <li>
          <strong>Preflop betting.</strong> The player left of the big blind (under the gun) acts first. The big blind acts last
          and may raise even if everyone just called.
        </li>
        <li>
          <strong>The flop.</strong> One card is burned and three are dealt face up. Betting starts with the first active player
          left of the button.<Cite n={HOLDEM} />
        </li>
        <li>
          <strong>The turn.</strong> Burn one, deal one, another round of betting.
        </li>
        <li>
          <strong>The river.</strong> Burn one, deal the fifth card, a final round of betting.
        </li>
        <li>
          <strong>Showdown.</strong> If two or more players remain, they show their cards and the best five-card hand wins.
        </li>
      </GuideOl>
      <GuideNote>
        Heads-up (two players) the button posts the small blind and acts first before the flop, then last on every later street.
        <Cite n={HOLDEM} />
      </GuideNote>

      <GuideH2 id="actions">Your options</GuideH2>
      <GuideUl>
        <li>
          <strong>Fold:</strong> give up the hand and anything you've put in.
        </li>
        <li>
          <strong>Check:</strong> pass without betting, only when nobody has bet this round.
        </li>
        <li>
          <strong>Call:</strong> match the current bet.
        </li>
        <li>
          <strong>Bet:</strong> the first chips put in on a street.
        </li>
        <li>
          <strong>Raise:</strong> increase someone else's bet. A raise after you checked is a <em>check-raise</em>.
          <Cite n={BETTING} />
        </li>
        <li>
          <strong>All in:</strong> put in every chip you have. In no-limit you may bet your whole stack at any time.
          <Cite n={BETTING} />
        </li>
      </GuideUl>

      <GuideH2 id="betting-rules">No-limit betting rules</GuideH2>
      <GuideUl>
        <li>
          The smallest bet is one big blind. A raise must be at least the size of the previous bet or raise on that street: facing
          a $5 bet you can raise to $10 or more, and if someone raises $5 to $12, the next raise must go to at least $19.
          <Cite n={[BETTING, RULES]} />
        </li>
        <li>
          An all-in for less than a full raise doesn't reopen the betting. Players who already acted may call or fold, not raise
          again.<Cite n={RULES} />
        </li>
        <li>
          You can't be forced out of a hand for lack of chips. If you're all in, you can win only what you matched from each
          player. Extra chips from the others form a <strong>side pot</strong> that only they can win.<Cite n={BETTING} />
        </li>
        <li>
          The part of a bet nobody matches goes back to the bettor.<Cite n={BETTING} /> Tied hands split the pot, and an odd
          chip goes to the first winner clockwise from the button.<Cite n={[HOLDEM, RULES]} />
        </li>
      </GuideUl>

      <SidePotDiagram />

      <GuideH2 id="hand-rankings">Hand rankings</GuideH2>
      <GuideP>
        From strongest to weakest: royal flush, straight flush, four of a kind, full house, flush, straight, three of a kind,
        two pair, one pair, high card.<Cite n={PROB} /> The{' '}
        <Link to="/guides/hand-rankings" className="text-[var(--accent)] hover:underline">
          hand rankings guide
        </Link>{' '}
        has examples of each, how often they come up, and how ties are broken.
      </GuideP>

      <GuideH2 id="terms">Terms on this site</GuideH2>
      <GuideH3>The table</GuideH3>
      <GuideUl>
        <li>
          <strong>Blinds ($1/$2):</strong> the small and big blind. Everything else on this site is often measured in{' '}
          <strong>big blinds (bb)</strong>, so a $200 stack at $1/$2 is 100 bb.
        </li>
        <li>
          <strong>Buy-in:</strong> the chips you sit down with. Your <strong>stack</strong> is what you have now.
        </li>
        <li>
          <strong>Pot:</strong> all the chips bet so far in the hand.
        </li>
        <li>
          <strong>Muck:</strong> folded cards, thrown face down into the middle.
        </li>
        <li>
          <strong>Shove:</strong> going all in.
        </li>
      </GuideUl>
      <GuideH3>Positions</GuideH3>
      <GuideP>
        Seats are named by where they act relative to the button.<Cite n={POSITION} /> From first to act preflop:{' '}
        <strong>UTG</strong> (under the gun), <strong>UTG+1</strong>, <strong>UTG+2</strong>, <strong>LJ</strong> (lojack),{' '}
        <strong>HJ</strong> (hijack), <strong>CO</strong> (cutoff), <strong>BTN</strong> (button), then the <strong>SB</strong> and{' '}
        <strong>BB</strong> (blinds). Shorter tables drop names from the front. Six-handed is UTG, HJ, CO, BTN, SB, BB. The{' '}
        <Link to="/guides/positions" className="text-[var(--accent)] hover:underline">
          positions guide
        </Link>{' '}
        covers what each seat wants.
      </GuideP>
      <TableDiagram />
      <GuideH3>Player stats (the NPC sliders)</GuideH3>
      <GuideUl>
        <li>
          <strong>VPIP</strong> (voluntarily put money in pot): how often a player calls, limps or raises before the flop. Posting
          a blind doesn't count.<Cite n={VPIP} />
        </li>
        <li>
          <strong>PFR</strong> (preflop raise): how often they raise before the flop. VPIP minus PFR is how often they just call.
          <Cite n={HUD} />
        </li>
        <li>
          <strong>3-bet:</strong> re-raising an earlier raise. The blinds count as the first bet and the open-raise as the
          second, so the re-raise is the third.
        </li>
        <li>
          <strong>Aggression:</strong> betting and raising rather than checking and calling.<Cite n={STRATEGY} />
        </li>
        <li>
          <strong>Bluff:</strong> betting a hand you don't think is best, to make better hands fold. A{' '}
          <strong>semi-bluff</strong> is a bluff with a draw that can still improve.<Cite n={BLUFF} />
        </li>
        <li>
          <strong>Calling down:</strong> calling bets street after street with a medium hand.
        </li>
        <li>
          <strong>Slow-playing:</strong> checking or calling with a very strong hand to keep opponents in.
        </li>
        <li>
          <strong>Overbet:</strong> a bet bigger than the pot.
        </li>
        <li>
          <strong>Tilt:</strong> playing worse because of frustration, usually after losing.<Cite n={TILT} />
        </li>
      </GuideUl>
      <GuideH3>The table tools</GuideH3>
      <GuideUl>
        <li>
          <strong>Equity:</strong> your chance of winning the pot if all the cards were dealt out now.<Cite n={POTODDS} /> The
          table estimates it by dealing the rest of the hand out 1,500 times against random cards for each opponent still in.
        </li>
        <li>
          <strong>Pot odds:</strong> the call divided by the pot after you call. Calling a $10 bet into a $30 pot makes a $40 pot,
          so the pot odds are 25%. Calling pays when your equity beats your pot odds.<Cite n={POTODDS} />
        </li>
        <li>
          <strong>Spectate:</strong> every seat goes to an NPC and you watch.
        </li>
      </GuideUl>

      <Sources list={SOURCES} />
    </>
  );
}

export const overviewGuide: Guide = {
  slug: 'poker-overview',
  title: 'Poker Overview',
  description: "How a hand of no-limit hold'em plays, the rules of betting, and what the terms on this site mean.",
  sections: [
    { id: 'the-game', title: 'The game' },
    { id: 'a-hand', title: 'How a hand plays' },
    { id: 'actions', title: 'Your options' },
    { id: 'betting-rules', title: 'No-limit betting rules' },
    { id: 'hand-rankings', title: 'Hand rankings' },
    { id: 'terms', title: 'Terms on this site' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
