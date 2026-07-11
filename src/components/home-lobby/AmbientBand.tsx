'use client';

import { useSyncExternalStore, type CSSProperties } from 'react';

/**
 * Bandeau ambiant « lobby » (#248, épic #243) : petits personnages qui marchent
 * (bulles), skyline parallax ville/campagne, ciel jour/coucher/nuit (auto selon
 * l'heure). Purement décoratif → `aria-hidden`.
 *
 * Reduced-motion (STRICT, cf. garde-fou épic) : le flag `reducedMotion` (détecté
 * en amont, HomeLobby) fait basculer sur un rendu **statique settle** — aucun
 * walk/scroll/twinkle/drift : personnages immobiles répartis, skyline figée,
 * étoiles fixes, pas de bulles. Le bloc global `prefers-reduced-motion` de
 * `globals.css` sert de filet supplémentaire.
 *
 * Couleurs des personnages = tokens de thème (`--lobby-*`). Les teintes du ciel
 * (étoiles/nuages/oiseaux/skyline) sont atmosphériques (dépendent du moment) et
 * restent des rgba littéraux, comme dans le prototype validé.
 */

type SkyMode = 'auto' | 'day' | 'sunset' | 'night';
type Sky = 'day' | 'sunset' | 'night';

interface AmbientBandProps {
  reducedMotion?: boolean;
  skyMode?: SkyMode;
}

type SeedType = 'b' | 't' | 'p' | 'h';
interface Seed {
  t: SeedType;
  w: number;
  h: number;
  g: number;
  j: number;
}

const FAR_SEEDS: Seed[] = [
  { t: 'b', w: 56, h: 98, g: 16, j: 0 }, { t: 'b', w: 74, h: 64, g: 16, j: 0 }, { t: 'b', w: 42, h: 116, g: 170, j: 0 },
  { t: 'b', w: 60, h: 82, g: 18, j: 0 }, { t: 't', w: 24, h: 46, g: 200, j: 3 },
  { t: 'h', w: 50, h: 44, g: 22, j: 0 }, { t: 'p', w: 28, h: 62, g: 14, j: 4 }, { t: 't', w: 30, h: 58, g: 190, j: 3 },
  { t: 'h', w: 40, h: 36, g: 20, j: 0 }, { t: 'p', w: 24, h: 52, g: 190, j: 4 },
];

const NEAR_SEEDS: Seed[] = [
  { t: 'b', w: 34, h: 44, g: 20, j: 0 }, { t: 't', w: 20, h: 36, g: 220, j: 4 },
  { t: 'h', w: 32, h: 30, g: 18, j: 0 }, { t: 'p', w: 20, h: 48, g: 16, j: 5 }, { t: 't', w: 22, h: 44, g: 230, j: 4 },
  { t: 'h', w: 26, h: 26, g: 22, j: 0 }, { t: 't', w: 20, h: 36, g: 240, j: 4 },
];

const STAR_SEEDS = [
  { left: 8, top: 12, size: 2.5, dur: 2.6 }, { left: 21, top: 30, size: 2, dur: 3.1 },
  { left: 38, top: 8, size: 3, dur: 2.2 }, { left: 52, top: 26, size: 2, dur: 3.4 },
  { left: 66, top: 6, size: 2.5, dur: 2.8 }, { left: 79, top: 22, size: 2, dur: 3.0 },
  { left: 92, top: 14, size: 2.5, dur: 2.4 },
];

const BIRD_SEEDS = [
  { left: 14, top: 10, dur: 13, delay: -2, dist: 200 },
  { left: 47, top: 4, dur: 16, delay: -8, dist: -170 },
  { left: 74, top: 16, dur: 14, delay: -5, dist: 190 },
];

const CLOUD_SEEDS = [
  { left: 10, top: 8, w: 44, h: 14 },
  { left: 60, top: 20, w: 34, h: 12 },
];

const CRITTERS = [
  { lx0: '-8%', lx1: '55%', staticLeft: '9%', duration: 19, delay: -3, bubbleDelay: 0.6, color: 'var(--lobby-accent)' },
  { lx0: '30%', lx1: '108%', staticLeft: '35%', duration: 24, delay: -14, bubbleDelay: 3.4, color: 'var(--lobby-gold)' },
  { lx0: '-5%', lx1: '70%', staticLeft: '61%', duration: 17, delay: -6.5, bubbleDelay: 5.8, color: 'var(--lobby-accent-strong)' },
  { lx0: '46%', lx1: '105%', staticLeft: '85%', duration: 22, delay: -17, bubbleDelay: 1.9, color: 'var(--lobby-text)' },
];

function computeSky(mode: SkyMode): Sky {
  if (mode !== 'auto') return mode;
  const h = new Date().getHours();
  if (h >= 7 && h < 18) return 'day';
  if ((h >= 18 && h < 20) || (h >= 5 && h < 7)) return 'sunset';
  return 'night';
}

interface SkylineItem {
  key: number;
  wrap: CSSProperties;
  shape: CSSProperties;
  trunk?: CSSProperties;
}

function buildSkyline(seeds: Seed[], rowMax: number, tint: string): SkylineItem[] {
  // seeds dupliqués → boucle sans couture (le track scrolle de -50%)
  return seeds.concat(seeds).map((s, i) => {
    const wrap: CSSProperties = {
      position: 'relative',
      width: `${s.w}px`,
      height: `${rowMax}px`,
      marginRight: `${s.g}px`,
      marginBottom: `${-(s.j || 0)}px`,
      flexShrink: 0,
    };
    if (s.t === 'b') {
      return {
        key: i,
        wrap,
        shape: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${s.h}px`, background: tint, borderRadius: '2px 2px 0 0' },
      };
    }
    if (s.t === 't') {
      return {
        key: i,
        wrap,
        shape: { position: 'absolute', bottom: `${s.h * 0.32}px`, left: '50%', width: `${s.w}px`, height: `${s.w}px`, borderRadius: '50%', transform: 'translateX(-50%)', background: tint },
        trunk: { position: 'absolute', bottom: 0, left: '50%', width: `${s.w * 0.22}px`, height: `${s.h * 0.34}px`, transform: 'translateX(-50%)', background: tint },
      };
    }
    if (s.t === 'p') {
      const coneH = s.h * 0.72;
      return {
        key: i,
        wrap,
        shape: { position: 'absolute', bottom: `${s.h * 0.28}px`, left: '50%', width: 0, height: 0, transform: 'translateX(-50%)', borderLeft: `${s.w / 2}px solid transparent`, borderRight: `${s.w / 2}px solid transparent`, borderBottom: `${coneH}px solid ${tint}` },
        trunk: { position: 'absolute', bottom: 0, left: '50%', width: `${s.w * 0.18}px`, height: `${s.h * 0.26}px`, transform: 'translateX(-50%)', background: tint },
      };
    }
    // house
    const bodyH = s.h * 0.6;
    const roofH = s.h * 0.4;
    return {
      key: i,
      wrap,
      shape: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${bodyH}px`, background: tint },
      trunk: { position: 'absolute', bottom: `${bodyH}px`, left: 0, width: 0, height: 0, borderLeft: `${s.w / 2}px solid transparent`, borderRight: `${s.w / 2}px solid transparent`, borderBottom: `${roofH}px solid ${tint}` },
    };
  });
}

// Abonnement no-op : le ciel n'évolue pas en live (pas de re-render horaire),
// on veut seulement un snapshot client ≠ serveur, proprement.
const subscribeSky = () => () => {};

export default function AmbientBand({ reducedMotion = false, skyMode = 'auto' }: AmbientBandProps) {
  // SSR neutre (day) → évite un mismatch d'hydratation lié au fuseau/à l'heure.
  // useSyncExternalStore : snapshot serveur figé, snapshot client = heure réelle.
  // Après hydratation, React bascule sur le vrai ciel sans setState-in-effect.
  const sky = useSyncExternalStore<Sky>(
    subscribeSky,
    () => computeSky(skyMode),
    () => (skyMode === 'auto' ? 'day' : skyMode),
  );

  const anim = !reducedMotion;

  const tintFar = sky === 'sunset' ? 'rgba(255,190,150,.11)' : sky === 'night' ? 'rgba(180,190,225,.09)' : 'rgba(255,255,255,.10)';
  const tintNear = sky === 'sunset' ? 'rgba(255,190,150,.14)' : sky === 'night' ? 'rgba(180,190,225,.11)' : 'rgba(255,255,255,.13)';
  const skylineFar = buildSkyline(FAR_SEEDS, 150, tintFar);
  const skylineNear = buildSkyline(NEAR_SEEDS, 80, tintNear);

  const starColor = sky === 'night' ? '#fff' : 'rgba(255,255,255,.55)';
  const stars = sky === 'night' ? STAR_SEEDS : sky === 'sunset' ? STAR_SEEDS.slice(0, 3) : [];
  const cloudTint = sky === 'sunset' ? 'rgba(255,214,190,.45)' : 'rgba(255,255,255,.42)';
  const clouds = sky !== 'night' ? CLOUD_SEEDS : [];
  const birdColor = sky === 'sunset' ? 'rgba(255,214,190,.6)' : sky === 'night' ? 'rgba(230,230,240,.4)' : 'rgba(255,255,255,.55)';
  const birds = sky !== 'night' ? BIRD_SEEDS : [];

  return (
    <div className="lobby-band" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={`star-${i}`}
          style={{
            position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px`,
            borderRadius: '50%', background: starColor, opacity: anim ? undefined : 0.6,
            animation: anim ? `lobbyStarTwinkle ${s.dur}s ease-in-out infinite` : undefined,
          }}
        />
      ))}

      {clouds.map((c, i) => (
        <div
          key={`cloud-${i}`}
          style={{
            position: 'absolute', left: `${c.left}%`, top: `${c.top}px`, width: `${c.w}px`, height: `${c.h}px`,
            borderRadius: '999px', background: cloudTint, filter: 'blur(1.5px)',
          }}
        />
      ))}

      {birds.map((b, i) => (
        <div
          key={`bird-${i}`}
          style={{
            position: 'absolute', left: `${b.left}%`, top: `${b.top}px`, width: '16px', height: '8px',
            animation: anim ? `lobbyBirdDrift ${b.dur}s ease-in-out infinite` : undefined,
            animationDelay: anim ? `${b.delay}s` : undefined,
            ['--bx' as string]: `${b.dist}px`,
          }}
        >
          <span style={{ position: 'absolute', left: 0, bottom: 0, width: '9px', height: '1.6px', borderRadius: '2px', background: birdColor, transformOrigin: 'left bottom', transform: 'rotate(-22deg)', animation: anim ? 'lobbyWingFlapL .5s ease-in-out infinite' : undefined }} />
          <span style={{ position: 'absolute', right: 0, bottom: 0, width: '9px', height: '1.6px', borderRadius: '2px', background: birdColor, transformOrigin: 'right bottom', transform: 'rotate(22deg)', animation: anim ? 'lobbyWingFlapR .5s ease-in-out infinite' : undefined }} />
        </div>
      ))}

      {/* Skyline lointaine (parallax lent) */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '10px', height: '150px', overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', width: 'max-content', animation: anim ? 'lobbySkylineScroll 230s linear infinite' : undefined }}>
          {skylineFar.map((item) => (
            <div key={item.key} style={item.wrap}>
              <div style={item.shape} />
              {item.trunk ? <div style={item.trunk} /> : null}
            </div>
          ))}
        </div>
      </div>

      {/* Skyline proche (parallax plus rapide) */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '10px', height: '80px', overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', width: 'max-content', animation: anim ? 'lobbySkylineScroll 190s linear infinite' : undefined }}>
          {skylineNear.map((item) => (
            <div key={item.key} style={item.wrap}>
              <div style={item.shape} />
              {item.trunk ? <div style={item.trunk} /> : null}
            </div>
          ))}
        </div>
      </div>

      {/* Ligne de sol pointillée */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '10px', height: '1px', background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.14) 0 6px, transparent 6px 14px)' }} />

      {/* Personnages */}
      {CRITTERS.map((c, i) => (
        <div
          key={`critter-${i}`}
          style={{
            position: 'absolute', bottom: '16px',
            left: anim ? c.lx0 : c.staticLeft,
            ['--lx0' as string]: c.lx0,
            ['--lx1' as string]: c.lx1,
            animation: anim ? `lobbyCritterWalk ${c.duration}s ease-in-out infinite` : undefined,
            animationDelay: anim ? `${c.delay}s` : undefined,
          }}
        >
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: anim ? 'lobbyCritterBounce .55s ease-in-out infinite' : undefined }}>
            {anim ? (
              <div
                style={{
                  position: 'absolute', bottom: '54px', left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', alignItems: 'center', gap: '2px', padding: '5px 7px', borderRadius: '10px',
                  background: 'var(--lobby-bg-elev)', border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 4px 10px rgba(0,0,0,.25)',
                  opacity: 0, animation: `lobbyCritterBubble ${c.duration}s ease-in-out infinite`, animationDelay: `${c.delay + c.bubbleDelay}s`,
                }}
              >
                {[0, 0.15, 0.3].map((d) => (
                  <span key={d} style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--lobby-text-dim)', animation: 'lobbyDotBlink 1s ease-in-out infinite', animationDelay: `${d}s` }} />
                ))}
                <span style={{ position: 'absolute', bottom: '-4px', left: '50%', width: '8px', height: '8px', background: 'var(--lobby-bg-elev)', transform: 'translateX(-50%) rotate(45deg)', borderRight: '1px solid rgba(255,255,255,.14)', borderBottom: '1px solid rgba(255,255,255,.14)' }} />
              </div>
            ) : null}
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginBottom: '-3px', position: 'relative', zIndex: 1, opacity: 0.95 }}>
              <span style={{ width: '2.5px', height: '2.5px', borderRadius: '50%', background: 'var(--lobby-bg)' }} />
              <span style={{ width: '2.5px', height: '2.5px', borderRadius: '50%', background: 'var(--lobby-bg)' }} />
            </div>
            <div className="lobby-critter__body" style={{ width: '22px', height: '24px', background: c.color, opacity: 0.92 }} />
            <div style={{ width: '5px', height: '7px', borderRadius: '2px', background: c.color, position: 'absolute', bottom: '-5px', left: '8px', opacity: 0.92 }} />
            <div style={{ width: '5px', height: '7px', borderRadius: '2px', background: c.color, position: 'absolute', bottom: '-5px', left: '19px', opacity: 0.92 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
