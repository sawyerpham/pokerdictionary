import type { ReactNode } from 'react';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-headline mb-2">{title}</h2>
      <div className="space-y-3 text-[17px] leading-relaxed text-[var(--text-muted)]">{children}</div>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-large-title">Privacy</h1>
      <p className="mt-2 text-[15px] text-[var(--text-muted)]">Last updated November 27, 2026</p>

      <Section title="The short version">
        <p>
          Poker Dictionary is a free site for practicing poker. It has no ads and no analytics or tracking, and it never sells or shares your
          information. An account only exists to keep your saved work in sync between your devices.
        </p>
      </Section>

      <Section title="Without an account">
        <p>
          Everything you save (ranges, drill progress, settings, custom players) stays in your own browser. The poker engine and the solver run in
          your browser too, so your hands and spots aren’t sent anywhere.
        </p>
        <p>
          Like any website, the server sees your IP address when it sends you a page. It’s used to deliver the site and, for sign-in emails, to limit
          how many can be requested; those records are deleted within a day.
        </p>
      </Section>

      <Section title="With an account">
        <p>
          We store your email address, your name if you sign in with Google, and a copy of what you’ve saved (ranges, drill progress, settings and
          custom players) so it’s there on your other devices. A cookie keeps you signed in for up to 90 days or until you sign out.
        </p>
        <p>
          <strong className="text-[var(--text-primary)]">Sign in with Google:</strong> Google tells us your name and email address. We don’t see
          your password or anything else in your Google account.
        </p>
        <p>
          <strong className="text-[var(--text-primary)]">Sign in by email:</strong> the sign-in link is sent through Resend, an email delivery
          service, which handles your address only to deliver that email.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          The only cookies are the one that keeps you signed in and a short-lived one used during Google sign-in. There are no advertising or
          analytics cookies.
        </p>
      </Section>

      <Section title="Where it’s kept">
        <p>The site and its database run on a server in Oracle Cloud.</p>
      </Section>

      <Section title="Deleting your data">
        <p>
          Open the account menu (your initial at the top right) and choose <strong className="text-[var(--text-primary)]">Delete account</strong>.
          That removes your account and everything synced to it from the server right away. What’s saved in your browser stays until you clear it.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          Open an issue on the site’s{' '}
          <a href="https://github.com/sawyerpham/pokerdictionary/issues" className="text-[var(--accent)] hover:underline">
            GitHub page
          </a>
          .
        </p>
      </Section>
    </main>
  );
}
