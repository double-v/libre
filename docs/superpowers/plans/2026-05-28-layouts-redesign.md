# Libre Layouts Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public homepage and authenticated app shell with consistent visual language — coral palette, no gray borders, soft shadows, logo prominence.

**Architecture:** Two-file rewrite: `src/app/page.tsx` (homepage, server component) and `src/app/(main)/layout.tsx` (authenticated shell, client component). Homepage gets a split-screen hero with blurred stock photo background, floating badges around the logo, and restructured centered sections. Authenticated shell gets distinct SVG tab icons, no gray borders, soft shadows.

**Tech Stack:** Next.js App Router, Tailwind CSS, existing Logo component, Unsplash stock photo via `next/image`

---

### Task 1: Homepage — Nav bar + Hero section

**Files:**
- Modify: `src/app/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite page.tsx with nav + hero section**

Replace the entire file. The component remains a server component (no `'use client'`). Keep the existing `metadata` export and `jsonLd` object.

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Libre — Rencontre gratuite, sans abonnement ni revente de données',
  description:
    "Application de rencontre 100% gratuite. Pas d'abonnement, pas de microtransactions, pas de revente de données. Parce que rencontrer ne devrait rien coûter.",
  alternates: { canonical: '/' },
};

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Libre',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    description:
      'Application de rencontre gratuite, sans abonnement ni revente de données.',
    featureList: [
      'Rencontre par géolocalisation',
      'Messages chiffrés de bout en bout',
      'Gratuit sans abonnement',
      'Badge vérifié',
      'Modération communautaire',
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Accueil Libre" className="flex items-center gap-2">
          <svg viewBox="76 36 360 360" className="h-8 w-8" fill="currentColor" aria-hidden="true">
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-60 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-30 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(30 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(60 256 188)" />
            <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z" />
          </svg>
          <span className="text-2xl font-bold tracking-tight text-coral">Libre</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            Se connecter
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta"
          >
            Créer un compte
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1529333166437-975d7beeg948?w=1200&q=80"
            alt=""
            fill
            className="object-cover blur-[6px] brightness-110 scale-110"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blush/90 via-blush/90 to-sand/85" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-10 px-6 py-16 sm:flex-row sm:py-24">
          <div className="flex-1 text-center sm:text-left">
            <h1 className="mb-3 text-5xl font-extrabold tracking-tight sm:text-6xl">
              <span className="text-coral">Libre</span>
            </h1>
            <p className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200 sm:text-2xl">
              Parce que rencontrer ne devrait rien coûter.
            </p>
            <p className="mb-8 text-base text-gray-600 dark:text-gray-400">
              Rencontre gratuite. Sans abonnement. Sans microtransaction. Sans revente de données.
              <br />
              Parce que quand c&apos;est gratuit, tout le monde est là.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-full bg-terracotta px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2 dark:focus:ring-offset-gray-950"
              >
                Créer un compte gratuitement
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-white/70 px-8 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:bg-gray-800/90 dark:focus:ring-offset-gray-950"
              >
                Se connecter
              </Link>
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center">
            <svg viewBox="76 36 360 360" className="h-44 w-44 opacity-15" fill="currentColor" aria-hidden="true">
              <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-60 256 188)" />
              <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-30 256 188)" />
              <rect x="236" y="42" width="40" height="120" rx="20" />
              <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(30 256 188)" />
              <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(60 256 188)" />
              <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z" />
            </svg>
            <span className="absolute -top-2 -right-3 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-coral shadow-sm dark:bg-gray-800">🔒 Chiffré E2E</span>
            <span className="absolute -bottom-1 -left-4 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-coral shadow-sm dark:bg-gray-800">✅ Badge vérifié</span>
            <span className="absolute right-[-1.25rem] top-1/2 -translate-y-1/2 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-coral shadow-sm dark:bg-gray-800">👥 Modération</span>
          </div>
        </div>
      </section>

      {/* Chiffres */}
      <section className="bg-blush px-6 py-12 dark:bg-coral/10">
        <div className="mx-auto grid max-w-lg gap-8 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">~240 €</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Coût annuel moyen d&apos;un abonnement dating</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">47 %</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Des abonnés regrettent leur achat</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">UFC-Que Choisir, 2025</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold tracking-tight text-coral sm:text-4xl">0 €</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Chez Libre. Pour toujours.</p>
          </div>
        </div>
      </section>

      {/* Constat */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-md">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            Les apps de rencontre font payer l&apos;espoir
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { title: 'Likes limités sans abonnement', detail: 'Swipes bridés, fonctionnalités verrouillées — la version gratuite pousse à payer.' },
              { title: 'Microtransactions à chaque action', detail: "Super Like à 5 €, Boost à l'unité... Le coût réel dépasse vite l'abonnement." },
              { title: 'Prix variables selon votre profil', detail: 'Deux personnes voient des prix différents pour le même abonnement.' },
              { title: 'Renouvellement automatique piège', detail: "On s'abonne un mois, on oublie d'annuler, et les prélèvements continuent." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-blush p-4 shadow-sm dark:bg-coral/10">
                <p className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Argument Libre */}
      <section className="bg-sand px-6 py-12 dark:bg-coral/5">
        <div className="mx-auto max-w-md text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Gratuit = plus de célibataires = plus de chances
          </h2>
          <p className="mb-8 text-sm text-gray-600 dark:text-gray-400">
            Pas de barrière financière, pas de fonctionnalité verrouillée, pas de boost à acheter. Tout le monde a accès à tout.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { title: 'Croisements en chemin', detail: 'Découvrez les célibataires que vous croisez au quotidien' },
              { title: 'Chat chiffré E2E', detail: 'Le serveur ne lit jamais vos messages' },
              { title: 'Modération communautaire', detail: 'Signalement, blocage, badge vérifié' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
                <p className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            Le chat n&apos;est pas le produit. C&apos;est le pont vers de vraies rencontres. Une fois le contact établi, à vous de choisir comment aller plus loin.
          </p>
        </div>
      </section>

      {/* Vie privée */}
      <section className="bg-blush px-6 py-12 dark:bg-coral/10">
        <div className="mx-auto max-w-sm text-center">
          <h2 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Votre vie privée n&apos;est pas un produit
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🔒', title: 'Chiffrement E2E', detail: 'Le serveur ne lit jamais vos messages' },
              { icon: '🛡️', title: 'Zéro revente', detail: 'Vos données ne sont jamais vendues' },
              { icon: '✅', title: 'Badge vérifié', detail: 'Photos vérifiées par selfie' },
              { icon: '👥', title: 'Modération', detail: 'Signalement et blocage communautaire' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
                <div className="mb-1 text-lg">{item.icon}</div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gradient-to-br from-coral to-terracotta px-6 py-12 text-center">
        <p className="mb-2 text-2xl font-extrabold text-white">0 €. Pas d&apos;abonnement. Pas de pièges.</p>
        <p className="mb-6 text-sm text-white/70">Rejoignez ceux qui refusent de payer pour espérer.</p>
        <Link
          href="/register"
          className="inline-block rounded-full bg-white px-8 py-3 text-sm font-bold text-terracotta transition-colors hover:bg-gray-100"
        >
          Créer un compte
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-1.5">
          <svg viewBox="76 36 360 360" className="h-4 w-4 opacity-50" fill="currentColor" aria-hidden="true">
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-60 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-30 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(30 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(60 256 188)" />
            <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z" />
          </svg>
          <span className="text-sm font-bold text-coral opacity-50">Libre</span>
        </div>
        <Link href="/cgu" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          Conditions générales d&apos;utilisation
        </Link>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redesign homepage — split hero, blurred stock photo, centered sections, floating badges"
```

---

### Task 2: Authenticated shell — Header improvements

**Files:**
- Modify: `src/app/(main)/layout.tsx`

- [ ] **Step 1: Remove gray borders from header, add shadow, add settings link**

In `src/app/(main)/layout.tsx`, update the `<header>` element:

Change:
```tsx
<header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
  <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2">
    <Link href="/discover" aria-label="Accueil Libre" className="flex items-center gap-2">
```

To:
```tsx
<header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm dark:bg-gray-950/80">
  <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2">
    <Link href="/discover" aria-label="Accueil Libre" className="flex items-center gap-2">
```

Then add a settings link after the closing `</Link>` of the logo, inside the header `<div>`:

```tsx
          </Link>
          <Link href="/settings" aria-label="Paramètres" className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </Link>
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/layout.tsx
git commit -m "feat: header — remove gray border, add shadow, add settings link"
```

---

### Task 3: Authenticated shell — Bottom nav with distinct icons

**Files:**
- Modify: `src/app/(main)/layout.tsx`

- [ ] **Step 1: Replace navItems with icon components and update bottom nav**

Update the `navItems` array to include icon components. Replace the entire `navItems` constant and the bottom `<nav>` rendering.

Replace `navItems`:
```tsx
const navItems = [
  { href: '/discover', label: 'Découvrir', icon: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#E8634A' : 'none'} stroke={active ? '#E8634A' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
  )},
  { href: '/crossings', label: 'Croisements', icon: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#E8634A' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"><path d="M4 17 L12 7 M12 17 L20 7"/></svg>
  )},
  { href: '/nearby', label: 'À proximité', icon: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#E8634A' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
  )},
  { href: '/matches', label: 'Matches', icon: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#E8634A' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
  )},
  { href: '/profile', label: 'Profil', icon: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#E8634A' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  )},
];
```

Replace the bottom `<nav>` element — remove the `border-t border-gray-200`, add shadow, and use the icon function:

Change:
```tsx
<nav role="navigation" aria-label="Navigation principale" className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
  <div className="mx-auto flex max-w-lg items-center justify-around">
    {navItems.map((item) => {
      const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
      return (
        <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors ${isActive ? 'text-coral dark:text-coral-light' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}>
          <span className={`h-5 w-5 rounded-full border-2 transition-colors ${isActive ? 'border-coral bg-coral dark:border-coral-light dark:bg-coral-light' : 'border-gray-400 dark:border-gray-600'}`} />
          {item.label}
        </Link>
      );
    })}
  </div>
</nav>
```

To:
```tsx
<nav role="navigation" aria-label="Navigation principale" className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-1px_6px_rgba(0,0,0,0.04)] dark:bg-gray-950">
  <div className="mx-auto flex max-w-lg items-center justify-around">
    {navItems.map((item) => {
      const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
      return (
        <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${isActive ? 'font-semibold text-coral dark:text-coral-light' : 'font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}>
          {item.icon(isActive)}
          {item.label}
        </Link>
      );
    })}
  </div>
</nav>
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/layout.tsx
git commit -m "feat: bottom nav — distinct SVG icons per tab, remove gray border, add shadow"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run full build**

Run: `npx next build`
Expected: Build succeeds with no warnings or errors

- [ ] **Step 2: Verify homepage renders**

Start dev server, visit `/`, confirm:
- Nav bar with logo + "Se connecter" / "Créer un compte" visible
- Hero: blurred stock photo background with blush overlay, title "Libre" in coral, illustration with 3 floating badges
- Chiffres, Constat, Argument, Vie privée, CTA, Footer all present
- No gray borders anywhere
- All sections centered and not sparse

- [ ] **Step 3: Verify authenticated shell renders**

Login, confirm:
- Header: logo + settings gear icon, no border, soft shadow
- Bottom nav: 5 distinct icons (heart, crossing, pin, chat, user), active tab = coral
- No gray borders anywhere

- [ ] **Step 4: Final commit if any fixes needed**