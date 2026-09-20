import type { SVGProps } from 'react';

/**
 * Pictogrammes des sections du profil (#413) — même trait que les icônes de
 * la tab bar (`AppSections`) : 24 px, `stroke="currentColor"`, 1.5,
 * `aria-hidden` (le titre porte le sens). Un picto par section, pour lire
 * la page d'un coup d'œil.
 */
type P = SVGProps<SVGSVGElement>;
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export function CameraIcon(p: P) { return <svg {...base} {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>; }
export function HeartIcon(p: P) { return <svg {...base} {...p}><path d="M12 21s-7.5-4.6-9.5-9.1C1 8 3.4 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.6 0 6 3.5 4.5 7.4C19.5 16.4 12 21 12 21z" /></svg>; }
export function PinIcon(p: P) { return <svg {...base} {...p}><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.6" /></svg>; }
export function LinesIcon(p: P) { return <svg {...base} {...p}><path d="M4 5h16M4 10h10M4 15h16M4 20h7" /></svg>; }
export function IdCardIcon(p: P) { return <svg {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="12" r="2.5" /><path d="M14 10h4M14 14h4" /></svg>; }
export function SparkIcon(p: P) { return <svg {...base} {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></svg>; }
export function LoupeIcon(p: P) { return <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></svg>; }
export function EyeIcon(p: P) { return <svg {...base} {...p}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>; }
export function EyeOffIcon(p: P) { return <svg {...base} {...p}><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 2.8 2.8M6.5 6.6C3.8 8.3 2 12 2 12s3.5 6 10 6c1.6 0 3-.3 4.2-.9M9.9 5.1C10.6 5 11.3 5 12 5c6.5 0 10 7 10 7s-.9 1.6-2.6 3.2" /></svg>; }
export function LinkIcon(p: P) { return <svg {...base} {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>; }
export function ShieldIcon(p: P) { return <svg {...base} {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>; }
export function WarnIcon(p: P) { return <svg {...base} {...p}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></svg>; }
