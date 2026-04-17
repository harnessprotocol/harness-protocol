import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata = {
  title: {
    template: '%s | Harness Protocol',
    default: 'Harness Protocol',
  },
  description: 'An open specification for portable AI coding harnesses.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <RootProvider
          theme={{
            defaultTheme: 'dark',
            attribute: 'class',
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
