import type { Guide } from './registry';
import { SRC } from './sources';
import { RangeGrid, TableDiagram } from './diagrams';
import { Cite, GuideH2, GuideH3, GuideNote, GuideP, GuideTable, GuideUl, Sources } from './ui';

const SOURCES = [SRC.position, SRC.strategy, SRC.upswingRfi, SRC.upswingSizing, SRC.holdem];
const POSITION = 1, STRATEGY = 2, RFI = 3, SIZING = 4, HOLDEM = 5;

function Content() {
  return (
    <>
      <GuideP>
        What every seat at the table is trying to do, from first to act to last. The seat names match the tags on the table
        (turn them on or off in Settings).
      </GuideP>

      <GuideH2 id="why-position">Why position matters</GuideH2>
      <TableDiagram initial={6} />
      <GuideP>
        Players who act later see what everyone before them did, so they make better decisions with the same cards.
        <Cite n={POSITION} /> Before the flop, the more players left to act behind you, the more likely one of them has a better
        hand. In a ten-handed game, someone behind an under-the-gun KJ holds a better hand about 40% of the time, against about
        16% when the same KJ is in the cutoff with three players left.<Cite n={POSITION} />
      </GuideP>
      <GuideP>
        So the earlier you act, the stronger your hand needs to be to bet, raise or call.<Cite n={STRATEGY} /> After the flop the
        button always acts last, which is why it's the best seat. The blinds put money in before seeing their cards and act first
        after the flop. On average the big blind is the biggest long-term losing seat.<Cite n={POSITION} />
      </GuideP>

      <GuideH2 id="ranges">Opening ranges by seat</GuideH2>
      <GuideP>
        Upswing Poker's six-handed ranges for the first raise into an unopened pot, with 100 big blind stacks.<Cite n={RFI} /> Their
        "MP" is the seat this site calls the hijack (HJ) in a six-handed game.
      </GuideP>
      <GuideTable
        rows={[
          ['Seat', 'Opens', 'Hands'],
          ['UTG, under the gun', '16%', '55+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, AJo+, KQo'],
          ['HJ, hijack (MP)', '20.4%', '44+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, ATo+, KJo+, QJo'],
          ['CO, cutoff', '24.9%', '22+, A2s+, K8s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, ATo+, KTo+, QTo+, JTo'],
          ['BTN, button', '40.9%', '22+, A2s+, K3s+, Q5s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, 43s, A2o+, K9o+, Q9o+, J9o+, T9o'],
          ['SB, small blind', '47.8%', '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 95s+, 84s+, 74s+, 63s+, 53s+, 43s, 32s, A2o+, K8o+, Q8o+, J8o+, T8o+, 98o'],
        ]}
      />
      <RangeGrid />
      <GuideNote>
        Reading the shorthand: "s" is suited, "o" is offsuit, and "+" means that hand and better. "K9s+" is K9, KT, KJ and KQ
        suited. The worst hands in each range are only slightly profitable, so drop them when loose or aggressive players are
        behind you. Add hands when the blinds fold too often.<Cite n={RFI} />
      </GuideNote>

      <GuideH2 id="early">Early position: UTG, UTG+1, UTG+2</GuideH2>
      <GuideP>
        <strong>Wants:</strong> to enter only with hands that can stand a raise from anyone behind, and to win with them out of
        position.
      </GuideP>
      <GuideUl>
        <li>Open the tightest range at the table, about 16% six-handed.<Cite n={RFI} /> Fold more than that nine-handed.</li>
        <li>Raise, don't limp. With this many players behind, limping invites a raise you can't call.<Cite n={RFI} /></li>
        <li>
          When an early seat raises, believe it. Their range is the strongest at the table, so call or 3-bet them with better
          hands than you would against a later raise.
        </li>
      </GuideUl>

      <GuideH2 id="middle">Middle position: lojack (LJ), hijack (HJ)</GuideH2>
      <GuideP>
        <strong>Wants:</strong> to widen a little and start using position on the players still to act, the blinds in
        particular.
      </GuideP>
      <GuideUl>
        <li>Open around 20%: more small pairs, suited connectors and good offsuit broadways than UTG.<Cite n={RFI} /></li>
        <li>
          If the players behind you, the big blind in particular, keep 3-betting your opens, open fewer hands. If the big
          blind folds too often, open more.<Cite n={RFI} />
        </li>
      </GuideUl>

      <GuideH2 id="late">Late position: cutoff (CO), button (BTN)</GuideH2>
      <GuideP>
        <strong>Wants:</strong> to steal the blinds and play pots in position.
      </GuideP>
      <GuideUl>
        <li>
          <strong>Cutoff:</strong> about a quarter of hands.<Cite n={RFI} /> Only the button and the blinds are behind you, so
          many opens win the blinds outright.
        </li>
        <li>
          <strong>Button:</strong> about 40% of hands, the widest open from a seat that isn't a blind.<Cite n={RFI} /> You act
          last on every street after the flop, which lets you bet more hands and bluff more cheaply.<Cite n={POSITION} />
        </li>
        <li>
          Facing an open from earlier, these seats are where calling rather than 3-betting works best, because you'll have
          position.<Cite n={STRATEGY} /> Use a 3-bet of about three times the open.<Cite n={SIZING} />
        </li>
      </GuideUl>

      <GuideH2 id="blinds">The blinds: SB, BB</GuideH2>
      <GuideH3>Small blind</GuideH3>
      <GuideP>
        <strong>Wants:</strong> to win the pot before the flop. Half your bet is already in, but you'll be out of position against
        everyone except the big blind.
      </GuideP>
      <GuideUl>
        <li>When everyone folds to you, raise a wide range, about 48%, to attack the big blind alone.<Cite n={RFI} /></li>
        <li>Facing an open, mostly 3-bet or fold. Make the 3-bet about four times the open, since you're out of position.<Cite n={SIZING} /></li>
      </GuideUl>
      <GuideH3>Big blind</GuideH3>
      <GuideP>
        <strong>Wants:</strong> to defend the money already posted without paying off strong hands.
      </GuideP>
      <GuideUl>
        <li>
          You're closing the action, so the price of a call is good. Defend widely against late-position steals and tighter
          against early raises.
        </li>
        <li>
          After the flop you act first, so play straightforwardly. Check-raise strong hands and good draws, and give up weak
          hands that miss.
        </li>
      </GuideUl>

      <GuideH2 id="heads-up">Heads-up</GuideH2>
      <GuideP>
        With two players, the button is the small blind. It acts first before the flop and last on every later street.
        <Cite n={HOLDEM} /> That positional edge after the flop is why players heads-up raise the button with a very wide range.
        <Cite n={POSITION} /> A new game here starts heads-up against a random player, so this is the first spot you'll meet.
      </GuideP>

      <Sources list={SOURCES} />
    </>
  );
}

export const positionsGuide: Guide = {
  slug: 'positions',
  title: 'Positions',
  description: 'What every seat wants, from under the gun to the big blind, with opening ranges for each.',
  sections: [
    { id: 'why-position', title: 'Why position matters' },
    { id: 'ranges', title: 'Opening ranges by seat' },
    { id: 'early', title: 'Early position' },
    { id: 'middle', title: 'Middle position' },
    { id: 'late', title: 'Late position' },
    { id: 'blinds', title: 'The blinds' },
    { id: 'heads-up', title: 'Heads-up' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
