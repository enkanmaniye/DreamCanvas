import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'DreamCanvas: your dreams, on your screen',
  description: 'Turn your photos or a few words into a designed vision board wallpaper you can edit, save and download.',
};

export const viewport: Viewport = { themeColor: '#FF72B5', width: 'device-width', initialScale: 1 };

const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Caveat:wght@500;600&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;700&display=swap';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The canvas draws text by family name, so these need stable names. next/font would rename them. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
