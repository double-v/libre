import type { Metadata, Viewport } from 'next';
import Providers from '@/components/Providers';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import CookieBanner from '@/components/CookieBanner';
import { getCurrentSiteTheme } from '@/lib/site-theme-server';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#E8634A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Laisse le contenu s'étendre sous l'encoche et la barre d'accueil : condition
  // nécessaire pour que env(safe-area-inset-*) soit non nul (cf. .pt-safe/.pb-safe).
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'Libre — Rencontre libre et gratuite',
    template: '%s | Libre',
  },
  description: 'Application de rencontre gratuite, sans abonnement ni revente de données. Parce que rencontrer ne devrait rien coûter.',
  keywords: ['rencontre gratuite', 'app rencontre sans abonnement', 'rencontre libre', 'application rencontre gratuite', 'dating app gratuite', 'rencontre sans payer', 'croisement', 'rencontre proximité', 'chat gratuit', 'rencontre alternative', 'rencontre non commerciale'],
  authors: [{ name: 'Libre' }],
  creator: 'Libre',
  publisher: 'Libre',
  metadataBase: new URL('https://www.getlibre.fr'),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://www.getlibre.fr',
    siteName: 'Libre',
    title: 'Libre — Rencontre libre et gratuite',
    description: 'Application de rencontre gratuite, sans abonnement ni revente de données. Parce que rencontrer ne devrait rien coûter.',
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
    canonical: '/',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Libre',
  url: 'https://www.getlibre.fr',
  logo: 'https://www.getlibre.fr/favicon.svg',
  description: 'Application de rencontre gratuite, sans abonnement ni revente de données.',
};

const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Libre',
  url: 'https://www.getlibre.fr',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getCurrentSiteTheme();
  return (
    <html lang="fr" data-theme={theme.id} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('libre-theme');if(t==='dark'||((t==='auto'||!t)&&matchMedia('(prefers-color-scheme:dark)').matches))d.classList.add('dark');var s=localStorage.getItem('libre-skin');if(s)d.setAttribute('data-theme',s)}catch{}})()` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
      </head>
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow-md"
        >
          Aller au contenu principal
        </a>
        <Providers>{children}</Providers>
        <CookieBanner />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}