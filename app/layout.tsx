import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Performance · Marlon Mattedi',
  description: 'Dashboard de tráfego do CONTROLE 2.0 (somente leitura)',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#0F1F2B', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-fundo text-texto">{children}</body>
    </html>
  );
}
