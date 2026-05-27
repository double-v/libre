import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#E8634A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Libre — Rencontre libre et gratuite',
    template: '%s | Libre',
  },
  description: 'Application de rencontre gratuite, sans abonnement ni revente de données. Croisez des célibataires près de chez vous. Notre but, c\'est que vous quittiez l\'appli.',
  keywords: ['rencontre gratuite', 'app rencontre sans abonnement', 'rencontre libre', 'application rencontre gratuite', 'dating app gratuite', 'rencontre sans payer', 'croisement', 'rencontre proximité', 'chat gratuit', 'rencontre alternative', 'rencontre non commerciale'],
  authors: [{ name: 'Libre' }],
  creator: 'Libre',
  publisher: 'Libre',
  metadataBase: new URL('https://libre.rencontres.app'),
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://libre.rencontres.app',
    siteName: 'Libre',
    title: 'Libre — Rencontre libre et gratuite',
    description: 'Application de rencontre gratuite, sans abonnement ni revente de données. Notre but, c\'est que vous quittiez l\'appli.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Libre — Rencontre libre et gratuite' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Libre — Rencontre libre et gratuite',
    description: 'Application de rencontre gratuite, sans abonnement ni revente de données.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://libre.rencontres.app',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow-md"
        >
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  );
}