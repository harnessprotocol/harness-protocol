import Link from 'next/link';

const LogoIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className={className}>
    <circle cx="100" cy="100" r="62" fill="none" stroke="#60a5fa" strokeWidth="5.5" />
    <line x1="100" y1="58" x2="63.63" y2="121" stroke="#a78bfa" strokeWidth="2.5" opacity="0.55" />
    <line x1="63.63" y1="121" x2="136.37" y2="121" stroke="#a78bfa" strokeWidth="2.5" opacity="0.55" />
    <line x1="136.37" y1="121" x2="100" y2="58" stroke="#a78bfa" strokeWidth="2.5" opacity="0.55" />
    <circle cx="100" cy="58" r="9.5" fill="#e2e8f0" />
    <circle cx="63.63" cy="121" r="9.5" fill="#e2e8f0" />
    <circle cx="136.37" cy="121" r="9.5" fill="#e2e8f0" />
  </svg>
);

const heroCards = [
  {
    title: 'Overview',
    description: 'What the Harness Protocol is and how the three layers fit together.',
    href: '/docs/getting-started',
  },
  {
    title: 'Specification',
    description: 'The complete harness.yaml field reference — the normative core of v1.',
    href: '/docs/specification/profile-schema',
  },
  {
    title: 'Security',
    description: 'Threat model, trust boundaries, secrets handling, and permission model.',
    href: '/docs/security/threat-model',
  },
  {
    title: 'Extensions',
    description: 'x- prefix convention, reserved fields, HEP process, and stability guarantees.',
    href: '/docs/extensions/extension-points',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen animate-fade-in">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-fd-border/30 bg-fd-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-fd-foreground no-underline">
            <LogoIcon className="size-9" />
            <span className="font-display">Harness Protocol</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/docs" className="text-fd-muted-foreground transition-colors hover:text-fd-foreground no-underline">
              Docs
            </Link>
            <a
              href="https://github.com/harnessprotocol/harness-protocol"
              className="text-fd-muted-foreground transition-colors hover:text-fd-foreground no-underline"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3">
          <div className="h-[400px] w-[600px] rounded-full bg-blue-500/10 blur-[100px]" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/4 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-28 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fd-border/50 bg-fd-card/80 px-4 py-1.5 text-sm text-fd-muted-foreground backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-blue-400" />
            v1 Schema layer — draft
          </div>
          <h1 className="font-display mb-5 text-5xl font-bold tracking-tight text-fd-foreground sm:text-6xl lg:text-7xl">
            AI coding context,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              standardized.
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-fd-muted-foreground">
            A vendor-neutral <code className="rounded bg-fd-card px-1.5 py-0.5 text-sm font-mono text-fd-foreground">harness.yaml</code> format
            for the complete operational context of an AI coding agent —
            plugins, MCP servers, environment requirements, instructions, and permissions.
          </p>

          <div className="relative mx-auto mb-8 inline-block">
            <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-blue-500/25 via-blue-500/15 to-blue-500/25 blur-[1px]" />
            <div className="relative rounded-xl border border-white/5 bg-fd-card px-6 py-3.5 font-mono text-sm text-fd-foreground">
              <span className="text-fd-muted-foreground">$schema:</span>{' '}
              https://harnessprotocol.ai/schema/v1/harness.schema.json
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/docs/getting-started"
              className="rounded-lg bg-fd-primary px-6 py-2.5 text-sm font-medium text-fd-primary-foreground no-underline shadow-lg shadow-blue-500/20 transition-all hover:opacity-90"
            >
              Read the Spec
            </Link>
            <a
              href="https://github.com/harnessprotocol/harness-protocol"
              className="glass rounded-lg border border-white/10 px-6 py-2.5 text-sm font-medium text-fd-foreground no-underline transition-all hover:border-fd-primary/40 hover:bg-fd-accent/50"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Hero Cards */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {heroCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group relative overflow-hidden rounded-xl border border-fd-border/50 bg-fd-card/80 p-6 no-underline backdrop-blur-sm transition-all duration-300 hover:border-fd-primary/30 hover:shadow-lg hover:shadow-blue-500/8"
            >
              <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'linear-gradient(164deg, rgba(96,165,250,0.06), transparent 60%)' }} />
              <div className="relative">
                <h3 className="font-display mb-2 text-lg font-semibold text-fd-foreground">{card.title}</h3>
                <p className="text-sm leading-relaxed text-fd-muted-foreground">{card.description}</p>
              </div>
              <div className="relative mt-4 text-sm font-medium text-fd-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                Explore →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-fd-border/30">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fd-primary/20 to-transparent" />
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-12 text-sm sm:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2 font-bold text-fd-foreground">
              <LogoIcon className="size-8" />
              <span className="font-display">Harness Protocol</span>
            </div>
            <p className="text-fd-muted-foreground">An open specification for portable AI coding harnesses.</p>
          </div>
          <div>
            <h5 className="mb-3 font-semibold text-fd-foreground">Resources</h5>
            <ul className="space-y-2 text-fd-muted-foreground">
              <li><Link href="/docs" className="transition-colors hover:text-fd-foreground no-underline">Documentation</Link></li>
              <li><a href="https://github.com/harnessprotocol/harness-protocol" className="transition-colors hover:text-fd-foreground no-underline" target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href="https://github.com/harnessprotocol/harness-kit" className="transition-colors hover:text-fd-foreground no-underline" target="_blank" rel="noreferrer">harness-kit</a></li>
            </ul>
          </div>
          <div>
            <h5 className="mb-3 font-semibold text-fd-foreground">Legal</h5>
            <ul className="space-y-2 text-fd-muted-foreground">
              <li>Apache-2.0 License</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-fd-border/20 px-6 py-4 text-center text-xs text-fd-muted-foreground">
          © {new Date().getFullYear()} Harness Protocol Contributors
        </div>
      </footer>
    </main>
  );
}
