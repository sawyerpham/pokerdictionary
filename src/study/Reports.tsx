import { useEffect, useState } from 'react';
import { Segmented } from '../components/RuleControls';
import { solverCard } from '../engine/ranges';
import { loadPacks, type Pack } from '../solver/library';
import { BUTTON, CardText, Field, PANEL } from './ui';

interface Row {
  board: number[]; // solver card ids
  n: number; // how many of the 22,100 flops this one stands for
  tags: { high: string; paired: boolean; suits: string; connected: boolean };
  oop?: { actions: string[]; freq: number[] }; // the first player's options, when they can bet
  ip?: { actions: string[]; freq: number[] }; // the second player's, after a check
  players?: { equity: number; realization: number }[];
}
interface Report {
  key: string;
  title: string;
  seats: [string, string];
  flops: Row[];
}

const GROUPS = {
  high: { label: 'High card', of: (r: Row) => (['A', 'K', 'Q', 'J'].includes(r.tags.high) ? r.tags.high : 'T or lower'), order: ['A', 'K', 'Q', 'J', 'T or lower'] },
  paired: { label: 'Paired', of: (r: Row) => (r.tags.paired ? 'Paired' : 'Unpaired'), order: ['Unpaired', 'Paired'] },
  suits: { label: 'Suits', of: (r: Row) => r.tags.suits, order: ['rainbow', 'two-tone', 'monotone'] },
  connected: { label: 'Connected', of: (r: Row) => (r.tags.connected ? 'Connected' : 'Not connected'), order: ['Not connected', 'Connected'] },
};
type GroupKey = keyof typeof GROUPS;

/** Share of the range that bets (any size) at a node. */
const betting = (x?: { actions: string[]; freq: number[] }) => (x ? x.freq.reduce((a, f, k) => a + (/^(Bet|AllIn)/.test(x.actions[k]) ? f : 0), 0) : NaN);
const weighted = (rows: Row[], f: (r: Row) => number) => {
  const ok = rows.filter((r) => !Number.isNaN(f(r)));
  const n = ok.reduce((a, r) => a + r.n, 0);
  return n ? ok.reduce((a, r) => a + r.n * f(r), 0) / n : NaN;
};

function Bar({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="grid grid-cols-[minmax(6rem,9rem)_1fr_3.5rem] items-center gap-3 py-1 text-[15px]" title={note}>
      <span className="truncate capitalize">{label}</span>
      <span className="h-2 rounded-r-[4px] bg-[var(--bg-third)]">
        <span className="block h-2 rounded-r-[4px] bg-[var(--accent)]" style={{ width: `${Math.max(1, Math.min(100, value))}%` }} />
      </span>
      <span className="text-right tabular-nums">{Number.isNaN(value) ? '–' : `${value.toFixed(0)}%`}</span>
    </div>
  );
}

const Board = ({ board }: { board: number[] }) => (
  <span className="whitespace-nowrap">
    {board.map((c) => (
      <CardText key={c} card={solverCard(c)} />
    ))}
  </span>
);

/** How often the solver bets each kind of flop, from the flop libraries. */
export function Reports() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [key, setKey] = useState('srp-BTN-BB');
  const [report, setReport] = useState<Report>();
  const [group, setGroup] = useState<GroupKey>('high');
  const [error, setError] = useState<string>();
  const [all, setAll] = useState(false);

  useEffect(() => {
    loadPacks().then(setPacks, (e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    fetch(`/reports/${key}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No report for this pot yet.'))))
      .then((r: Report) => {
        setReport(r);
        setError(undefined);
      }, (e: Error) => setError(e.message));
  }, [key]);

  // Whoever bets first: the out-of-position player if they can lead, else the in-position player after a check.
  const leads = report?.flops.some((r) => r.oop) ?? false;
  const who = report ? (leads ? report.seats[0] : report.seats[1]) : '';
  const bet = (r: Row) => betting(leads ? r.oop : r.ip);
  const rows = report?.flops ?? [];
  const g = GROUPS[group];
  const sorted = [...rows].sort((a, b) => bet(b) - bet(a));

  return (
    <>
      <section className={PANEL}>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <Field label="Pot">
            <select value={key} onChange={(e) => setKey(e.target.value)} className="min-h-11 rounded-[10px] bg-[var(--bg-third)] px-3 text-[15px] text-[var(--text-primary)]">
              {packs.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
          <Segmented label="Group by" value={group} options={Object.entries(GROUPS).map(([value, x]) => ({ value: value as GroupKey, label: x.label }))} onChange={setGroup} />
        </div>
        {error && <p className="text-[15px] text-rose-400">{error}</p>}
        {report && (
          <>
            <p className="mb-2 text-[15px]">
              How often the <strong>{who}</strong> bets the flop{leads ? '' : ` when the ${report.seats[0]} checks`}, across {rows.length} solved flops:{' '}
              <strong className="tabular-nums">{weighted(rows, bet).toFixed(0)}%</strong> on average.
            </p>
            {g.order
              .map((label) => ({ label, rs: rows.filter((r) => g.of(r) === label) }))
              .filter((x) => x.rs.length)
              .map(({ label, rs }) => (
                <Bar key={label} label={label} value={weighted(rs, bet)} note={`${label}: ${rs.length} flops`} />
              ))}
            {rows[0]?.players && (
              <p className="mt-3 text-[13px] text-[var(--text-muted)] tabular-nums">
                Equity: {report.seats[0]} {weighted(rows, (r) => r.players![0].equity).toFixed(1)}%, {report.seats[1]} {weighted(rows, (r) => r.players![1].equity).toFixed(1)}%.
                Share of it turned into chips: {report.seats[0]} {(weighted(rows, (r) => r.players![0].realization) * 100).toFixed(0)}%, {report.seats[1]}{' '}
                {(weighted(rows, (r) => r.players![1].realization) * 100).toFixed(0)}% (position and initiative at work).
              </p>
            )}
          </>
        )}
      </section>

      {report && (
        <section className={`${PANEL} mt-4`}>
          <h2 className="text-headline mb-2">Flop by flop</h2>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-[15px] tabular-nums">
            <span className="text-[13px] text-[var(--text-muted)]">Flop</span>
            <span className="text-right text-[13px] text-[var(--text-muted)]">Bets</span>
            <span className="text-right text-[13px] text-[var(--text-muted)]">{report.seats[1]} equity</span>
            {(all || sorted.length <= 16 ? sorted : [...sorted.slice(0, 8), ...sorted.slice(-8)]).map((r, k) => (
              <div key={r.board.join()} className={`contents ${!all && sorted.length > 16 && k === 8 ? '[&>*]:border-t [&>*]:border-[var(--line)] [&>*]:pt-1' : ''}`}>
                <Board board={r.board} />
                <span className="text-right">{bet(r).toFixed(0)}%</span>
                <span className="text-right">{r.players ? `${r.players[1].equity.toFixed(0)}%` : '–'}</span>
              </div>
            ))}
          </div>
          {sorted.length > 16 && (
            <button type="button" onClick={() => setAll((x) => !x)} className={`${BUTTON} mt-3 bg-[var(--bg-third)]`}>
              {all ? 'Show the extremes' : `Show all ${sorted.length}`}
            </button>
          )}
        </section>
      )}
    </>
  );
}
