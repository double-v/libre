'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * File d'annonces du shell connecté (#507, proposition A validée le
 * 2026-10-06). Sur mobile, la bêta, l'avenant et l'invitation à la
 * vérification s'empilaient : environ 370 px sur 844 avant le contenu, et
 * trois appels à l'action concurrents. Une seule annonce est montrée à la
 * fois, par ordre de priorité ; les autres attendent leur tour.
 *
 * Chaque bandeau garde sa logique (ce qu'il charge, quand il se ferme) et
 * déclare seulement s'il est actif. L'avenant passe en premier : c'est une
 * obligation légale (#425). Le retrait et l'invitation (spec 006, 010)
 * viennent ensuite, la bêta en dernier — réduite à une ligne quand une autre
 * annonce est là, plutôt que masquée.
 */
export const PRIORITE = { avenant: 3, verification: 2, beta: 1 } as const;
export type IdAnnonce = keyof typeof PRIORITE;

interface File {
  actives: ReadonlySet<IdAnnonce>;
  declarer: (id: IdAnnonce, actif: boolean) => void;
}

const Contexte = createContext<File | null>(null);

export function AnnonceProvider({ children }: { children: ReactNode }) {
  const [actives, setActives] = useState<ReadonlySet<IdAnnonce>>(new Set());
  const declarer = useCallback((id: IdAnnonce, actif: boolean) => {
    setActives((avant) => {
      if (avant.has(id) === actif) return avant;
      const apres = new Set(avant);
      if (actif) apres.add(id);
      else apres.delete(id);
      return apres;
    });
  }, []);
  const valeur = useMemo(() => ({ actives, declarer }), [actives, declarer]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/**
 * @returns `visible` : c'est le tour de cette annonce ; `autreEnCours` : une
 * autre annonce active existe (la bêta s'en sert pour se réduire).
 * Hors fournisseur, l'annonce est toujours visible.
 */
export function useAnnonce(id: IdAnnonce, actif: boolean): { visible: boolean; autreEnCours: boolean } {
  const file = useContext(Contexte);
  const declarer = file?.declarer;
  useEffect(() => {
    if (!declarer) return;
    declarer(id, actif);
    return () => declarer(id, false);
  }, [declarer, id, actif]);

  if (!file) return { visible: true, autreEnCours: false };
  const autres = [...file.actives].filter((a) => a !== id);
  const plusPrioritaire = autres.some((a) => PRIORITE[a] > PRIORITE[id]);
  return { visible: actif && !plusPrioritaire, autreEnCours: autres.length > 0 };
}
