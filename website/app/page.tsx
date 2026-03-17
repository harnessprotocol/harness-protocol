import { WaitlistForm } from './components/waitlist-form';

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

export default function HomePage() {
  return (
    <main className="min-h-screen animate-fade-in">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-fd-border/30 bg-fd-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <a href="/" className="flex items-center gap-2.5 font-bold text-fd-foreground no-underline">
            <LogoIcon className="size-9" />
            <span className="font-display">Harness Protocol</span>
          </a>
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
          <p className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-fd-muted-foreground">
            Coming soon
          </p>
          <h1 className="font-display mb-12 text-5xl font-bold tracking-tight text-fd-foreground sm:text-6xl lg:text-7xl">
            The open standard for{' '}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              AI coding harnesses.
            </span>
          </h1>
        </div>
      </section>

      {/* Waitlist */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-xl border border-fd-border/50 bg-fd-card/80 p-8 text-center backdrop-blur-sm sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5" />
          <div className="relative">
            <h2 className="font-display mb-3 text-2xl font-bold text-fd-foreground sm:text-3xl">
              Get notified when v1 launches
            </h2>
            <p className="mb-6 text-sm text-fd-muted-foreground">
              Join the waitlist to be the first to know when the Harness Protocol specification is finalized.
            </p>
            <div className="flex justify-center">
              <WaitlistForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-fd-border/30">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fd-primary/20 to-transparent" />
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 text-sm">
          <div className="flex items-center gap-2 text-fd-muted-foreground">
            <LogoIcon className="size-6" />
            <span>Harness Protocol</span>
          </div>
          <div className="text-xs text-fd-muted-foreground">
            Apache-2.0
          </div>
        </div>
      </footer>
    </main>
  );
}
