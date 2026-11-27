import { Link } from 'react-router-dom';
import { TOOLS } from '../study/tools';

/** A small card per study tool. Also the nav's Study menu. */
export function ToolCards({ onPick }: { onPick?: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {TOOLS.map((t) => (
        <Link key={t.slug} to={`/study/${t.slug}`} onClick={onPick} className="flex min-w-0 flex-col rounded-[10px] bg-[var(--bg-second)] px-2.5 py-1.5 transition-colors hover:bg-[var(--bg-third)]">
          <span className="flex items-center gap-1.5 text-[14px] leading-snug font-semibold">
            {t.title}
            {t.premium && <span className="rounded-full bg-amber-400/15 px-1.5 text-[10px] font-semibold text-amber-300">Premium</span>}
          </span>
          <span className="truncate text-[12px] leading-snug text-[var(--text-muted)]">{t.desc}</span>
        </Link>
      ))}
    </div>
  );
}
