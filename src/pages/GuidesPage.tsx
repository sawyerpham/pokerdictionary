import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { GUIDES, SHELVES } from '../guides/registry';

/** Tracks which section heading was most recently scrolled past. */
function useActiveSection(sectionIds: string[]) {
  const [active, setActive] = useState<string | undefined>(sectionIds[0]);

  useEffect(() => {
    const onScroll = () => {
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 96) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sectionIds]);

  return active;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function GuidesPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const guide = GUIDES.find((g) => g.slug === slug) ?? GUIDES[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [guide.slug]);

  const activeSection = useActiveSection(guide.sections.map((s) => s.id));

  const sidebarLink = (isActive: boolean) =>
    `flex min-h-8 items-center rounded px-3 py-1 text-sm transition-colors pointer-coarse:min-h-11 ${
      isActive
        ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] font-medium text-[var(--accent-soft)]'
        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <div className="container mx-auto flex-1 px-4 py-12">
      <div className="mx-auto flex max-w-6xl items-start gap-8">
        {/* Left sidebar: guide list */}
        <aside className="no-scrollbar sticky top-16 hidden max-h-[calc(100vh-5rem)] w-52 shrink-0 overflow-y-auto lg:block">
          {SHELVES.map((shelf) => (
            <div key={shelf.title} className="mb-6">
              <p className="mb-3 px-3 text-footnote font-semibold text-[var(--text-muted)]">{shelf.title}</p>
              <nav className="space-y-1">
                {shelf.items.map((g) => (
                  <NavLink key={g.slug} to={`/guides/${g.slug}`} className={sidebarLink(g.slug === guide.slug)}>
                    {g.title}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </aside>

        {/* Article */}
        <div className="min-w-0 flex-1">
          {/* Guide picker for small screens where the sidebar is hidden */}
          <select
            aria-label="Guide"
            value={guide.slug}
            onChange={(e) => navigate(`/guides/${e.target.value}`)}
            className="mb-4 min-h-11 w-full rounded-[10px] bg-[var(--bg-second)] px-3 text-[17px] lg:hidden"
          >
            {SHELVES.map((shelf) => (
              <optgroup key={shelf.title} label={shelf.title}>
                {shelf.items.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <article className="rounded-lg bg-[var(--bg-second)] p-5 sm:p-8">
            <h1 className="text-large-title mb-2">{guide.title}</h1>
            <p className="mb-8 text-[var(--text-muted)]">{guide.description}</p>
            <guide.Content />
          </article>
        </div>

        {/* Right sidebar: on-this-page outline */}
        <aside className="no-scrollbar sticky top-16 hidden max-h-[calc(100vh-5rem)] w-52 shrink-0 overflow-y-auto xl:block">
          <p className="mb-3 text-footnote font-semibold text-[var(--text-muted)]">
            On this page
          </p>
          <nav className="space-y-1 border-l border-white/10">
            {guide.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(section.id);
                }}
                className={`-ml-px block border-l py-1 pl-4 text-sm transition-colors ${
                  activeSection === section.id
                    ? 'border-[var(--accent)] font-medium text-[var(--accent-soft)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
