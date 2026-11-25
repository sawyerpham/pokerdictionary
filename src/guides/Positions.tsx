import type { Guide } from './registry';
import { SRC } from './sources';
import { RangeGrid, TableDiagram } from './diagrams';
import { Cite, GuideH2, GuideP, GuideTable, GuideUl, Sources, withFraction } from './ui';

const SOURCES = [SRC.position, SRC.strategy, SRC.upswingRfi, SRC.upswingSizing, SRC.holdem];
const POSITION = 1, STRATEGY = 2, RFI = 3, SIZING = 4, HOLDEM = 5;

function Content() {
  return (
    <>
      <GuideH2 id="why-position">Seats</GuideH2>
      <TableDiagram initial={6} />
      <GuideP>
        Acting later means more information.<Cite n={POSITION} /> The earlier you act, the stronger your hand needs to be.
        <Cite n={STRATEGY} />
      </GuideP>

      <GuideH2 id="ranges">Opening ranges</GuideH2>
      <GuideP>
        Six-handed, first raise, 100 bb stacks.<Cite n={RFI} /> "s" suited, "o" offsuit, "+" that hand and better.
      </GuideP>
      <GuideTable
        rows={[
          ['Seat', 'Opens', 'Hands'],
          ['UTG, under the gun', withFraction(16), '55+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, AJo+, KQo'],
          ['HJ, hijack', withFraction(20.4), '44+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, ATo+, KJo+, QJo'],
          ['CO, cutoff', withFraction(24.9), '22+, A2s+, K8s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, ATo+, KTo+, QTo+, JTo'],
          ['BTN, button', withFraction(40.9), '22+, A2s+, K3s+, Q5s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, 43s, A2o+, K9o+, Q9o+, J9o+, T9o'],
          ['SB, small blind', withFraction(47.8), '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 95s+, 84s+, 74s+, 63s+, 53s+, 43s, 32s, A2o+, K8o+, Q8o+, J8o+, T8o+, 98o'],
        ]}
      />
      <RangeGrid />

      <GuideH2 id="by-seat">By seat</GuideH2>
      <GuideUl>
        <li><strong>Early (UTG, UTG+1, UTG+2):</strong> tightest range; fold even more nine-handed. Take their raises seriously.<Cite n={RFI} /></li>
        <li><strong>Lojack, hijack:</strong> add small pairs and suited connectors. Open fewer if players behind keep 3-betting.<Cite n={RFI} /></li>
        <li><strong>Cutoff, button:</strong> steal the blinds; call raises more freely, since you'll have position.<Cite n={STRATEGY} /> 3-bet about three times the raise.<Cite n={SIZING} /></li>
        <li><strong>Small blind:</strong> raise wide when folded to you; otherwise mostly 3-bet (about four times) or fold.<Cite n={[RFI, SIZING]} /></li>
        <li><strong>Big blind:</strong> defend wider against late raises than early ones; you act first after the flop.</li>
        <li><strong>Heads-up:</strong> the button is the small blind, acts first preflop and last after.<Cite n={HOLDEM} /></li>
      </GuideUl>

      <Sources list={SOURCES} />
    </>
  );
}

export const positionsGuide: Guide = {
  slug: 'positions',
  title: 'Positions',
  description: 'Seats, opening ranges, and how each seat plays.',
  sections: [
    { id: 'why-position', title: 'Seats' },
    { id: 'ranges', title: 'Opening ranges' },
    { id: 'by-seat', title: 'By seat' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
