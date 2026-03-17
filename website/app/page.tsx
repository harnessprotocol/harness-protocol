import { WaitlistForm } from './components/waitlist-form';

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

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col animate-fade-in">
      <header className="px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="mx-auto max-w-4xl">
          <a href="/" className="inline-flex items-center gap-2.5 text-fd-foreground no-underline">
            <LogoIcon className="size-8" />
            <span className="font-display text-sm font-medium">Harness Protocol</span>
          </a>
        </div>
      </header>

      <section className="mx-auto w-full max-w-4xl flex-1 px-6 pt-20 sm:px-8 sm:pt-28">
        <p className="font-display mb-8 text-sm text-fd-muted-foreground">
          <span className="text-fd-primary">//</span> coming soon
        </p>
        <h1 className="font-display mb-12 text-4xl font-bold leading-[1.15] text-fd-foreground sm:text-5xl lg:text-6xl">
          The open standard for AI coding harnesses.
        </h1>
        <div>
          <p className="mb-4 text-sm text-fd-muted-foreground">
            Get notified when v1 launches.
          </p>
          <WaitlistForm />
        </div>
      </section>

      <footer className="px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between text-xs text-fd-muted-foreground">
          <span>Harness Protocol</span>
          <span>Apache-2.0</span>
        </div>
      </footer>
    </main>
  );
}
