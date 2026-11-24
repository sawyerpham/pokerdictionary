// Casino chips: an amount drawn as a short stack in standard denominations.
const DENOMS = [
  { v: 1000, color: '#e6b422', edge: '#7a5c00' },
  { v: 500, color: '#7d3fc6', edge: '#3d1c66' },
  { v: 100, color: '#1c1c1e', edge: '#8e8e93' },
  { v: 25, color: '#1f9d55', edge: '#0b4d27' },
  { v: 5, color: '#d93636', edge: '#6e1010' },
  { v: 1, color: '#f2f2f7', edge: '#8e8e93' },
];

/** Greedy denomination breakdown, largest chips at the bottom, capped so tall stacks stay tidy. */
function breakdown(amount: number, cap = 7) {
  const out: (typeof DENOMS)[number][] = [];
  let left = Math.round(amount);
  for (const d of DENOMS) {
    while (left >= d.v && out.length < cap) {
      out.push(d);
      left -= d.v;
    }
  }
  return out;
}

export const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function ChipStack({ amount, label = true, className = '' }: { amount: number; label?: boolean; className?: string }) {
  const chips = breakdown(amount);
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="relative h-[22px] w-4" style={{ height: 14 + chips.length * 3 }}>
        {chips.map((c, i) => (
          <span
            key={i}
            className="absolute left-0 h-[10px] w-4 rounded-[50%] border-[1.5px] border-dashed shadow-[0_1px_1px_rgb(0_0_0/0.5)]"
            style={{ bottom: i * 3, background: c.color, borderColor: c.edge }}
          />
        ))}
      </div>
      {label && <span className="rounded-full bg-black/45 px-1.5 text-[11px] font-semibold text-white tabular-nums">{money(amount)}</span>}
    </div>
  );
}
