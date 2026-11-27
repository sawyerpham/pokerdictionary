import { Link } from 'react-router-dom';
import { TOOLS } from '../study/tools';

/** A card per study tool. Also the nav's Study menu. */
export function ToolCards({ onPick }: { onPick?: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {TOOLS.map((t) => (
        <Link key={t.slug} to={`/study/${t.slug}`} onClick={onPick} className="flex flex-col rounded-[14px] bg-[var(--bg-second)] p-4 transition-colors hover:bg-[var(--bg-third)]">
          <span className="text-headline mb-1 flex items-center gap-2">
            {t.title}
            {t.premium && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">Premium</span>}
          </span>
          <span className="text-[15px] leading-snug text-[var(--text-muted)]">{t.desc}</span>
        </Link>
      ))}
    </div>
  );
}
