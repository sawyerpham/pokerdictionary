import { Link } from 'react-router-dom';
import { GROUPS, TOOLS } from '../study/tools';

/** The study tools in labelled columns. Also the nav's Study menu. */
export function ToolCards({ onPick }: { onPick?: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-x-2 gap-y-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
      {GROUPS.map((g) => (
        <section key={g} aria-label={g}>
          <h2 className="px-2.5 pb-1.5 text-[12px] font-medium text-[var(--text-muted)]">{g}</h2>
          <ul>
            {TOOLS.filter((t) => t.group === g).map((t) => (
              <li key={t.slug}>
                <Link to={`/study/${t.slug}`} onClick={onPick} className="flex flex-col rounded-[8px] px-2.5 py-1.5 transition-colors hover:bg-white/[0.06]">
                  <span className="flex items-center gap-1.5 text-[14px] leading-snug font-medium">
                    {t.title}
                    {t.premium && <span className="rounded-full bg-amber-400/15 px-1.5 text-[10px] font-semibold text-amber-300">Premium</span>}
                  </span>
                  <span className="text-[12px] leading-snug text-[var(--text-muted)]">{t.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
