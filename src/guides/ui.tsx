import type { ReactNode } from 'react';

/** Shared typography for guide articles so every guide reads the same (matches Blackjack Dictionary). */

export function GuideH2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-10 mb-3 scroll-mt-20 border-b border-white/10 pb-2 text-2xl font-semibold text-[var(--text-primary)] first:mt-0">
      {children}
    </h2>
  );
}

export function GuideH3({ children }: { children: ReactNode }) {
  return <h3 className="text-headline mt-6 mb-2 text-[var(--text-primary)]">{children}</h3>;
}

export function GuideP({ children }: { children: ReactNode }) {
  return <p className="mb-4 leading-relaxed text-[var(--text-primary)]">{children}</p>;
}

export function GuideUl({ children }: { children: ReactNode }) {
  return <ul className="mb-4 list-disc space-y-2 pl-6 leading-relaxed text-[var(--text-primary)]">{children}</ul>;
}

export function GuideOl({ children }: { children: ReactNode }) {
  return <ol className="mb-4 list-decimal space-y-2 pl-6 leading-relaxed text-[var(--text-primary)]">{children}</ol>;
}

export function GuideNote({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 rounded-lg border-l-4 border-[var(--accent)] bg-[var(--bg-third)] p-4 text-sm leading-relaxed text-[var(--text-primary)]">
      {children}
    </p>
  );
}

export function GuideFormula({ children }: { children: ReactNode }) {
  return <p className="mb-4 rounded-lg bg-[var(--bg-third)] p-4 text-center font-mono text-sm text-[var(--text-primary)]">{children}</p>;
}

/** A simple data table; the first row is the header. Scrolls sideways inside itself on narrow screens. */
export function GuideTable({ rows }: { rows: ReactNode[][] }) {
  const [head, ...body] = rows;
  return (
    <div className="no-scrollbar mb-4 overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className="rounded bg-[var(--bg-third)] p-2 text-left font-semibold text-[var(--text-primary)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="rounded bg-[var(--bg-main)]/40 p-2 align-top text-[var(--text-primary)] tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface Source {
  /** Author(s) or publisher, as cited. */
  by: string;
  title: string;
  /** Book publisher/year, or site name. */
  where?: string;
  url?: string;
}

/** Inline citation: [1] or [1, 3], linking to the numbered list at the end of the article. */
export function Cite({ n }: { n: number | number[] }) {
  const ns = Array.isArray(n) ? n : [n];
  return (
    <sup className="ml-0.5 text-[0.7em] whitespace-nowrap">
      [
      {ns.map((k, i) => (
        <span key={k}>
          {i > 0 && ', '}
          <a href={`#source-${k}`} className="text-[var(--accent-soft)] hover:underline">
            {k}
          </a>
        </span>
      ))}
      ]
    </sup>
  );
}

/** Numbered source list; ids match <Cite n={k} />. Pair with a `{ id: 'sources', title: 'Sources' }` section. */
export function Sources({ list }: { list: Source[] }) {
  return (
    <>
      <GuideH2 id="sources">Sources</GuideH2>
      <ol className="list-decimal space-y-2 pl-6 text-sm leading-relaxed text-[var(--text-muted)]">
        {list.map((s, i) => (
          <li key={i} id={`source-${i + 1}`} className="scroll-mt-20">
            {s.by}. {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className="text-[var(--accent-soft)] hover:underline">
                {s.title}
              </a>
            ) : (
              <em>{s.title}</em>
            )}
            {s.where ? `. ${s.where}.` : '.'}
          </li>
        ))}
      </ol>
    </>
  );
}

/** Nearest simple fraction (denominator up to 12) for a percentage, e.g. 33 -> "1/3". */
export function asFraction(percent: number): string {
  const p = percent / 100;
  let best = { n: 1, d: 2, err: Math.abs(p - 0.5) };
  for (let d = 2; d <= 12; d++) {
    const n = Math.max(1, Math.min(d - 1, Math.round(p * d)));
    const err = Math.abs(p - n / d);
    if (err < best.err - 1e-9) best = { n, d, err };
    if (best.err < 0.012) break;
  }
  return `${best.n}/${best.d}`;
}
/** "36% (3/8)" */
export const withFraction = (percent: number) => `${percent}% (${asFraction(percent)})`;
