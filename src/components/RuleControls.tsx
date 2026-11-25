import type { ReactNode } from 'react';

/** iOS switch: 51 x 31 track, 27 pt knob. */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`hit relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
        checked ? 'bg-[var(--accent)]' : 'bg-[rgb(120_120_128/0.32)]'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_3px_1px_rgb(0_0_0/0.06)] transition-transform duration-200 ease-[cubic-bezier(0.3,1.4,0.5,1)] ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

/** iOS segmented control: gray track, raised thumb on the selected segment. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex flex-wrap rounded-[9px] bg-[var(--fill)] p-[2px] ${disabled ? 'opacity-40' : ''}`}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`min-h-8 min-w-8 rounded-[7px] px-2 text-[13px] font-medium transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11 ${
            value === o.value
              ? 'bg-[#636366] text-white shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)]'
              : 'text-[var(--text-primary)] hover:bg-white/[0.06]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Small header above a grouped list (iOS inset grouped style). */
export function SectionHeader({ children }: { children: ReactNode }) {
  return <h2 className="text-footnote mb-1.5 px-4 text-[var(--text-muted)] uppercase">{children}</h2>;
}

/** One row of a grouped list: 44 pt minimum, separator inset from the left like iOS. */
export function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="pl-4 [&+&>div]:border-t [&+&>div]:border-[var(--line)]">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2.5 pr-4">
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-[17px] leading-snug text-[var(--text-primary)]">{title}</p>
          {hint && <p className="text-footnote mt-0.5 text-[var(--text-muted)]">{hint}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <SectionHeader>{title}</SectionHeader>
      <div className="overflow-hidden rounded-[10px] bg-[var(--bg-second)]">{children}</div>
    </section>
  );
}

/** iOS selection list: one row per choice, a checkmark on the selected one. */
export function ChoiceList({
  items,
}: {
  items: { key: string; label: string; description?: string; active: boolean; onSelect: () => void }[];
}) {
  return (
    <div className="overflow-hidden rounded-[10px] bg-[var(--bg-second)]">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={it.onSelect}
          aria-pressed={it.active}
          className="block w-full pl-4 text-left transition-colors active:bg-white/[0.08] [&+&>span]:border-t [&+&>span]:border-[var(--line)]"
        >
          <span className="flex min-h-11 items-center gap-3 py-2.5 pr-4">
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] leading-snug">{it.label}</span>
              {it.description && (
                <span className="text-footnote block text-[var(--text-muted)]">{it.description}</span>
              )}
            </span>
            <svg
              viewBox="0 0 16 16"
              className={`h-4 w-4 shrink-0 text-[var(--accent)] ${it.active ? '' : 'invisible'}`}
              aria-hidden
            >
              <path
                d="M2.5 8.5l3.5 3.5 7.5-8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Full-width text button styled as a grouped-list row (e.g. "Reset Rules"). */
export function ActionRow({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 w-full rounded-[10px] bg-[var(--bg-second)] px-4 text-[17px] text-[var(--accent)] transition-colors active:bg-white/[0.08]"
    >
      {children}
    </button>
  );
}
