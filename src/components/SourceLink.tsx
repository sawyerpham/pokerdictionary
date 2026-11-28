/** A citation as an inline link, for pages without a numbered source list. */
export const SourceLink = ({ by, url }: { by: string; url: string }) => (
  <>
    {' ('}
    <a href={url} target="_blank" rel="noreferrer" className="text-[var(--accent-soft)] hover:underline">
      {by}
    </a>
    {')'}
  </>
);
