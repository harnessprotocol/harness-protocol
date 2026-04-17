const LogoIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className={className}>
    <circle cx="100" cy="100" r="62" fill="none" stroke="#60a5fa" strokeWidth="5.5" />
    <line x1="100" y1="58" x2="63.63" y2="121" stroke="#78706a" strokeWidth="2.5" opacity="0.55" />
    <line x1="63.63" y1="121" x2="136.37" y2="121" stroke="#78706a" strokeWidth="2.5" opacity="0.55" />
    <line x1="136.37" y1="121" x2="100" y2="58" stroke="#78706a" strokeWidth="2.5" opacity="0.55" />
    <circle cx="100" cy="58" r="9.5" fill="#e8e0d6" />
    <circle cx="63.63" cy="121" r="9.5" fill="#e8e0d6" />
    <circle cx="136.37" cy="121" r="9.5" fill="#e8e0d6" />
  </svg>
);

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
  </svg>
);

const HARNESS_YAML = `$schema: https://harnessprotocol.io/schema/v1/harness.schema.json
version: "1"
metadata:
  name: data-engineer
  description: Harness for data engineering work.
  author:
    name: acme-org

plugins:
  - name: sql-explorer
    source: acme-org/sql-explorer
    version: "^1.2.0"

mcp-servers:
  filesystem:
    transport: stdio
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]

env:
  - name: DATABASE_URL
    description: Primary database connection string
    required: true
    sensitive: true

permissions:
  tools:
    allow: [Read, Glob, Grep, Write, Edit]
    deny: ["mcp__*__drop_*"]`;

const LAYERS = [
  {
    name: 'Schema',
    version: 'v1',
    status: 'current',
    description:
      'The harness.yaml format, JSON Schema validation, security model, and plugin manifest.',
  },
  {
    name: 'Exchange',
    version: 'v2',
    status: 'planned',
    description:
      'Harness-to-harness sharing — publish, fetch, and compose harnesses across tools and teams.',
  },
  {
    name: 'Registry',
    version: 'v2–3',
    status: 'planned',
    description:
      'Hosted discovery at harnessprotocol.io — search, publish, version resolution, integrity.',
  },
];

const AUDIENCES = [
  {
    title: 'Harness authors',
    description: 'Writing harness.yaml files for your projects or team.',
    href: '/docs/specification/profile-schema',
    cta: 'Read the field reference',
  },
  {
    title: 'Tool implementers',
    description: 'Building a conformant harness implementation or IDE integration.',
    href: '/docs/reference/architecture',
    cta: 'Start with the architecture',
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-fd-background text-fd-foreground animate-fade-in">

      {/* ── Header ── */}
      <header className="px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2.5 text-fd-foreground no-underline">
            <LogoIcon className="size-8" />
            <span className="font-display text-sm font-medium">Harness Protocol</span>
          </a>
          <nav className="flex items-center gap-6">
            <a
              href="/docs/getting-started"
              className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              Docs
            </a>
            <a
              href="https://github.com/harnessprotocol/harness-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              aria-label="GitHub"
            >
              <GitHubIcon className="size-5" />
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto w-full max-w-5xl px-6 pt-16 pb-8 sm:px-8 sm:pt-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">

          {/* Left: copy */}
          <div className="max-w-xl">
            <p className="font-display mb-6 text-sm text-fd-muted-foreground">
              <span className="text-fd-primary">//</span> v1 specification
            </p>
            <h1 className="font-display mb-6 text-4xl font-bold leading-[1.12] tracking-tight text-fd-foreground sm:text-5xl">
              The open standard for AI coding harnesses.
            </h1>
            <p className="mb-8 text-base leading-relaxed text-fd-muted-foreground sm:text-lg">
              A vendor-neutral{' '}
              <code className="font-display rounded px-1.5 py-0.5 text-sm bg-fd-muted text-fd-foreground">
                harness.yaml
              </code>{' '}
              format for the complete operational context of an AI coding agent — plugins, MCP
              servers, environment, instructions, and permissions. Portable across tools, shareable
              across teams.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/docs/getting-started"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90 no-underline"
              >
                Read the spec
                <ArrowRightIcon className="size-4" />
              </a>
              <a
                href="https://github.com/harnessprotocol/harness-kit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-fd-border px-5 py-2.5 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-muted no-underline"
              >
                Get harness-kit
                <GitHubIcon className="size-4" />
              </a>
            </div>
            <p className="mt-4 text-xs text-fd-muted-foreground">
              Apache-2.0 · Schema layer v1 · reference implementation in beta
            </p>
          </div>

          {/* Right: code preview */}
          <div className="rounded-xl border border-fd-border overflow-hidden" style={{ background: 'hsl(30, 6%, 6%)' }}>
            <div className="flex items-center gap-1.5 border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="size-3 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="size-3 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="size-3 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <span className="font-display ml-3 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                harness.yaml
              </span>
            </div>
            <pre
              className="overflow-x-auto p-4 text-xs leading-relaxed border-none rounded-none m-0"
              style={{ background: 'transparent', color: 'hsl(35, 8%, 78%)' }}
            >
              <code>{HARNESS_YAML}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── What is a harness ── */}
      <section className="border-t border-fd-border/50 px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display mb-4 text-xl font-semibold text-fd-foreground">
                What is a harness?
              </h2>
              <p className="text-sm leading-relaxed text-fd-muted-foreground">
                A <strong className="font-medium text-fd-foreground">harness</strong> is the
                complete operational context for an AI coding agent: which plugins and MCP servers
                it connects to, what environment variables it needs, what behavioral instructions
                govern it, and what permissions it holds.
              </p>
            </div>
            <div>
              <h2 className="font-display mb-4 text-xl font-semibold text-fd-foreground">
                Why a protocol?
              </h2>
              <p className="text-sm leading-relaxed text-fd-muted-foreground">
                Claude Code, Cursor, and GitHub Copilot each use proprietary formats. A well-tuned
                harness for one tool can&apos;t be shared with a teammate on another, or carried
                when you switch. Harness Protocol defines a common format — the same way MCP made
                tool communication portable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three-layer model ── */}
      <section className="border-t border-fd-border/50 px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="font-display mb-2 text-sm text-fd-muted-foreground">
            <span className="text-fd-primary">//</span> protocol layers
          </p>
          <h2 className="font-display mb-8 text-2xl font-bold text-fd-foreground">
            Built in layers.
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {LAYERS.map((layer) => (
              <div key={layer.name} className="rounded-xl border border-fd-border p-5 bg-fd-card">
                <div className="mb-3 flex items-center gap-2">
                  <span className="font-display text-sm font-semibold text-fd-foreground">
                    {layer.name}
                  </span>
                  <span className="font-display text-xs text-fd-muted-foreground">
                    {layer.version}
                  </span>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 font-display text-xs font-medium ${
                      layer.status === 'current'
                        ? 'bg-fd-accent text-fd-accent-foreground'
                        : 'bg-fd-muted text-fd-muted-foreground'
                    }`}
                  >
                    {layer.status}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-fd-muted-foreground">
                  {layer.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="border-t border-fd-border/50 px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="font-display mb-2 text-sm text-fd-muted-foreground">
            <span className="text-fd-primary">//</span> where to start
          </p>
          <h2 className="font-display mb-8 text-2xl font-bold text-fd-foreground">
            Two reading paths.
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {AUDIENCES.map((audience) => (
              <a
                key={audience.title}
                href={audience.href}
                className="group cursor-pointer rounded-xl border border-fd-border p-6 bg-fd-card transition-colors hover:border-fd-primary/30 hover:bg-fd-accent/20 no-underline"
              >
                <h3 className="font-display mb-2 text-base font-semibold text-fd-foreground">
                  {audience.title}
                </h3>
                <p className="mb-4 text-sm text-fd-muted-foreground">{audience.description}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-fd-primary transition-all group-hover:gap-2.5">
                  {audience.cta}
                  <ArrowRightIcon className="size-4" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-fd-border/50 px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 text-xs text-fd-muted-foreground">
          <div className="flex items-center gap-3">
            <LogoIcon className="size-5" />
            <span>Harness Protocol</span>
            <span className="font-display text-fd-primary">v1</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Apache-2.0</span>
            <a href="/docs/getting-started" className="transition-colors hover:text-fd-foreground">
              Docs
            </a>
            <a
              href="https://github.com/harnessprotocol/harness-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-fd-foreground"
              aria-label="GitHub"
            >
              <GitHubIcon className="size-4" />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
