/**
 * Tests — page FAQ publique (#63, refondue en #476).
 *
 * La FAQ promettait une alerte de check-in jamais envoyée (notify.ts est un
 * stub), des contacts « au courant » qui ne sont jamais prévenus et une
 * position relevée « seulement au check-in ». Ces tests verrouillent les
 * réponses vraies, et surtout l'absence de la promesse d'alerte tant que le
 * check-in est coupé (#483 : la section Cercle est alors masquée).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// La page lit l'interrupteur `checkin` côté serveur (#483).
let checkin = false;
vi.mock('@/lib/features-server', () => ({
  getFeatures: async () => ({ checkin, crossings: true, square: true, journal_comments: false }),
}));

const { default: FaqPage } = await import('../page');
const vue = async () => render(await FaqPage());

beforeEach(() => {
  checkin = false;
});

function section(container: HTMLElement, id: string): string {
  const el = container.querySelector(`#${id}`);
  expect(el, id).not.toBeNull();
  return el!.textContent!;
}

describe('<FaqPage />', () => {
  it('range les questions en trois sections quand le check-in est activé', async () => {
    checkin = true;
    await vue();
    for (const titre of [/Découvrir des profils/, /Ta vie privée et ton compte/, /Le Cercle de Confiance/]) {
      expect(screen.getByRole('heading', { level: 2, name: titre })).toBeInTheDocument();
    }
  });

  it('donne une ancre à chaque question, pour y envoyer quelqu’un directement', async () => {
    checkin = true;
    const { container } = await vue();
    const ids = [...container.querySelectorAll('section[id]')].map((s) => s.id);
    expect(ids).toEqual([
      'aucun-profil',
      'intention-cachee',
      'reponses-cachees',
      'photos-floues',
      'position',
      'messages',
      'badge-verifie',
      'mon-compte',
      'cercle',
      'cercle-contacts',
    ]);
  });

  it('ne donne aucun chiffre sur la fréquentation', async () => {
    const { container } = await vue();
    // Seuls « §9.1 », « 30 jours » (selfie) et « cinq » (en lettres) sont attendus.
    const texte = container.textContent!.replace('§9.1', '').replace('30 jours', '');
    expect(texte).not.toMatch(/\d/);
  });

  describe('« Je ne vois aucun profil »', () => {
    it('nomme les causes réelles : filtres, position, profils déjà aimés, ouverture récente', async () => {
      const { container } = await vue();
      const texte = section(container, 'aucun-profil');
      expect(texte).toMatch(/Je ne vois aucun profil, pourquoi/);
      expect(texte).toMatch(/filtres/i);
      expect(texte).toMatch(/position/i);
      expect(texte).toMatch(/aimée/i);
      expect(texte).toMatch(/vient d.ouvrir/i);
    });

    it('envoie vers le profil pour saisir sa ville', async () => {
      const { container } = await vue();
      expect(container.querySelector('#aucun-profil a[href="/profile"]')).not.toBeNull();
    });
  });

  it('explique la réciprocité : intention et réponses se lisent quand on a donné les siennes', async () => {
    const { container } = await vue();
    expect(section(container, 'intention-cachee')).toMatch(/Je verrai en chemin/);
    expect(section(container, 'reponses-cachees')).toMatch(/répondu à\s+cette question/);
  });

  it('dit la vérité sur la position : la dernière, arrondie, sans suivi continu', async () => {
    const { container } = await vue();
    const texte = section(container, 'position');
    expect(texte).toMatch(/dernière/);
    expect(texte).toMatch(/arrondie/);
    expect(texte).not.toMatch(/check-in/i);
  });

  it('dit que l’équipe peut techniquement lire un message, et renvoie aux CGU §9.1', async () => {
    const { container } = await vue();
    expect(section(container, 'messages')).toMatch(/capacité technique/);
    expect(container.querySelector('#messages a[href="/cgu"]')).not.toBeNull();
  });

  // #483 : décision opérateur, la FAQ ne parle pas de la pause du check-in.
  describe('Cercle de Confiance, selon l’interrupteur checkin', () => {
    it('check-in coupé : la section disparaît, et rien ne parle de pause ni d’alerte', async () => {
      const { container } = await vue();
      expect(screen.queryByRole('heading', { level: 2, name: /Le Cercle de Confiance/ })).toBeNull();
      expect(container.querySelector('#cercle')).toBeNull();
      expect(container.querySelector('#cercle-contacts')).toBeNull();
      expect(container.textContent).not.toMatch(/en pause|check-in/i);
    });

    it('check-in activé : la section revient, sans « en pause » ni promesse d’alerte', async () => {
      checkin = true;
      const { container } = await vue();
      const texte = section(container, 'cercle') + section(container, 'cercle-contacts');
      expect(texte).not.toMatch(/en pause/);
      expect(texte).not.toMatch(/alerte silencieuse|reçoivent une alerte|est alerté/i);
    });

    it('ne prétend pas que les contacts sont prévenus', async () => {
      checkin = true;
      const { container } = await vue();
      expect(section(container, 'cercle-contacts')).toMatch(/Pas encore/);
    });

    it('pointe vers la page « Comment ça marche » du Cercle', async () => {
      checkin = true;
      await vue();
      const link = screen.getByRole('link', { name: /Comment (ça|ca) marche/i });
      expect(link).toHaveAttribute('href', '/trust/how-it-works');
    });
  });

  it('préserve l’accès à la FAQ « session expirée »', async () => {
    await vue();
    const link = screen.getByRole('link', { name: /session expirée/i });
    expect(link).toHaveAttribute('href', '/faq/session-expiree');
  });
});
