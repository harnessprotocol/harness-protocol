import Link from 'next/link';

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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="size-7">
              <rect width="32" height="32" rx="6" fill="#0d0d12" />
              <text x="16" y="22" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="#8b7aff">hp</text>
            </svg>
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
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/4">
          <div className="h-[500px] w-[700px] rounded-full bg-purple-500/15 blur-[120px]" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-28 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fd-border/50 bg-fd-card/80 px-4 py-1.5 text-sm text-fd-muted-foreground backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-violet-400" />
            v1 Schema layer — draft
          </div>
          <h1 className="font-display mb-5 text-5xl font-bold tracking-tight text-fd-foreground sm:text-6xl lg:text-7xl">
            Portable AI{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
              harnesses
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-fd-muted-foreground">
            A vendor-neutral <code className="rounded bg-fd-card px-1.5 py-0.5 text-sm font-mono text-fd-foreground">harness.yaml</code> format
            for the complete operational context of an AI coding agent —
            plugins, MCP servers, environment requirements, instructions, and permissions.
          </p>

          <div className="relative mx-auto mb-8 inline-block">
            <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-violet-500/30 via-purple-500/20 to-indigo-500/30 blur-[1px]" />
            <div className="relative rounded-xl border border-white/5 bg-fd-card px-6 py-3.5 font-mono text-sm text-fd-foreground">
              <span className="text-fd-muted-foreground">$schema:</span>{' '}
              https://harnessprotocol.ai/schema/v1/harness.schema.json
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/docs/getting-started"
              className="rounded-lg bg-violet-500 px-6 py-2.5 text-sm font-medium text-white no-underline shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-600 hover:shadow-violet-500/30"
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
              className="group relative overflow-hidden rounded-xl border border-fd-border/50 bg-fd-card/80 p-6 no-underline backdrop-blur-sm transition-all duration-300 hover:border-fd-primary/30 hover:shadow-lg hover:shadow-violet-500/10"
            >
              <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'linear-gradient(164deg, rgba(139,122,255,0.08), transparent 60%)' }} />
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="size-6">
                <rect width="32" height="32" rx="6" fill="#0d0d12" />
                <text x="16" y="22" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="#8b7aff">hp</text>
              </svg>
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
