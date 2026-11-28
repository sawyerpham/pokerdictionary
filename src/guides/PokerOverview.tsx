import { Link } from 'react-router-dom';
import type { Guide } from './registry';
import { RankChart } from './HandRankings';
import { SRC } from './sources';
import { HandFlow, SidePotDiagram, TableAnatomy, TableDiagram } from './diagrams';
import { Cite, GuideH2, GuideH3, GuideP, GuideUl, Sources } from './ui';

const SOURCES = [SRC.holdem, SRC.robertsRules, SRC.betting, SRC.probability, SRC.vpip, SRC.hud, SRC.potOdds, SRC.position, SRC.bluff, SRC.tilt, SRC.strategy];
// Citation numbers, in SOURCES order.
const HOLDEM = 1, RULES = 2, BETTING = 3, PROB = 4, VPIP = 5, HUD = 6, POTODDS = 7, POSITION = 8, BLUFF = 9, TILT = 10, STRATEGY = 11;


function Content() {
  return (
    <>
      <GuideH2 id="a-hand">How a hand plays</GuideH2>
      <GuideP>
        Your hand is the best five cards from your two hole cards and the five board cards.<Cite n={HOLDEM} />
      </GuideP>
      <TableAnatomy />
      <HandFlow />

      <GuideH2 id="actions">Your options</GuideH2>
      <GuideUl>
        <li><strong>Fold:</strong> give up the hand.</li>
        <li><strong>Check:</strong> pass, only when there's no bet to match.</li>
        <li><strong>Call:</strong> match the bet.</li>
        <li><strong>Bet / raise:</strong> put in the first chips, or increase a bet. Raising after checking is a check-raise.<Cite n={BETTING} /></li>
        <li><strong>All in:</strong> bet your whole stack, at any time in no-limit.<Cite n={BETTING} /></li>
      </GuideUl>

      <GuideH2 id="betting-rules">Rules for edge cases</GuideH2>
      <GuideUl>
        <li>The button moves one seat clockwise each hand.<Cite n={HOLDEM} /></li>
        <li>Heads-up, the button posts the small blind, acts first before the flop and last after it.<Cite n={HOLDEM} /></li>
        <li>Before the flop the big blind may raise even if everyone only called.</li>
        <li>The smallest bet is one big blind. A raise must be at least the previous bet or raise: after $5 is raised to $12, the next raise is to $19 or more.<Cite n={[BETTING, RULES]} /></li>
        <li>An all-in smaller than a full raise doesn't reopen the betting: players who already acted may only call or fold.<Cite n={RULES} /></li>
        <li>An all-in player can win only what they matched. Further bets form a side pot.<Cite n={BETTING} /></li>
        <li>An unmatched bet goes back to the bettor.<Cite n={BETTING} /></li>
        <li>Tied hands split the pot; an odd chip goes to the first winner clockwise from the button.<Cite n={[HOLDEM, RULES]} /></li>
      </GuideUl>
      <SidePotDiagram />

      <GuideH2 id="hand-rankings">Hand rankings</GuideH2>
      <RankChart cite={<Cite n={PROB} />} />

      <GuideH2 id="terms">Terms on this site</GuideH2>
      <GuideUl>
        <li><strong>bb:</strong> big blinds. A $200 stack at $1/$2 is 100 bb.</li>
        <li><strong>Buy-in / stack:</strong> chips you sit down with / have now.</li>
        <li><strong>Muck:</strong> the folded cards. <strong>Shove:</strong> go all in.</li>
        <li><strong>VPIP:</strong> how often a player puts chips in preflop; blinds don't count.<Cite n={VPIP} /></li>
        <li><strong>PFR:</strong> how often they raise preflop.<Cite n={HUD} /></li>
        <li><strong>3-bet:</strong> re-raising a preflop raise.</li>
        <li><strong>Aggression:</strong> betting and raising instead of checking and calling.<Cite n={STRATEGY} /></li>
        <li><strong>Bluff / semi-bluff:</strong> betting a weak hand / a drawing hand to make better hands fold.<Cite n={BLUFF} /></li>
        <li><strong>Calling down:</strong> calling every street with a medium hand.</li>
        <li><strong>Slow-playing:</strong> checking or calling with a very strong hand.</li>
        <li><strong>Overbet:</strong> a bet bigger than the pot.</li>
        <li><strong>Tilt:</strong> playing worse out of frustration.<Cite n={TILT} /></li>
        <li><strong>Equity:</strong> your chance to win if the remaining cards were dealt now, here estimated against random hands.<Cite n={POTODDS} /></li>
        <li><strong>Pot odds:</strong> your call divided by the pot after calling.<Cite n={POTODDS} /></li>
      </GuideUl>

      <GuideH3>Positions</GuideH3>
      <GuideP>
        Named by distance from the button.<Cite n={POSITION} /> Details in the{' '}
        <Link to="/guides/positions" className="text-[var(--accent-soft)] hover:underline">
          positions guide
        </Link>
        .
      </GuideP>
      <TableDiagram />

      <Sources list={SOURCES} />
    </>
  );
}

export const overviewGuide: Guide = {
  slug: 'poker-overview',
  title: 'Poker Overview',
  description: 'How a hand plays, the rules for edge cases, and the terms on this site.',
  sections: [
    { id: 'a-hand', title: 'How a hand plays' },
    { id: 'actions', title: 'Your options' },
    { id: 'betting-rules', title: 'Edge cases' },
    { id: 'hand-rankings', title: 'Hand rankings' },
    { id: 'terms', title: 'Terms' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
