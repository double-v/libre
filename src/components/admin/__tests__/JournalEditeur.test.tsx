/**
 * JournalEditeur (spec 007, US2 + US3 ; maquette T014, écran 4).
 *
 * L'écran aide à relire : règles toujours visibles, alertes du serveur, levée
 * une par une, case « J'ai relu les règles ». Il ne décide rien — le serveur
 * recontrôle à la publication — mais il ne doit jamais laisser croire qu'on
 * peut publier ce que le serveur refusera.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import JournalEditeur from '../JournalEditeur';

const EMAIL = { regle: 'r5', motif: 'courriel', description: 'Adresse e-mail — jamais publiable', extrait: 'a@b.fr', bloquante: true, empreinte: 'e1' };
const AT = { regle: 'r5', motif: 'identifiant', description: 'Identifiant de type @pseudo', extrait: '@lola', bloquante: false, empreinte: 'e2' };
const AUTO = { regle: 'r6', motif: 'cote-detection', description: 'Formulation côté détection', extrait: 'automatiquement', bloquante: false, empreinte: 'e3' };

type Appel = { url: string; body: Record<string, unknown> | null; method: string };
function serveur(alertes: unknown[], reponses: Record<string, { status: number; body: unknown }> = {}) {
  const appels: Appel[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    appels.push({ url, body, method: init?.method ?? 'GET' });
    if (url === '/api/admin/journal/controle') return { ok: true, status: 200, json: async () => ({ alertes }) } as Response;
    const r = reponses[url] ?? { status: 200, body: { post: { id: 'p1', titre: 'T', corps: 'C', statut: 'publiee', publieeAt: '2026-09-25T10:00:00Z', slug: 't' } } };
    return { ok: r.status < 300, status: r.status, json: async () => r.body } as Response;
  }));
  return appels;
}

const BROUILLON = { id: 'p1', titre: 'Titre', corps: 'Texte.', statut: 'brouillon', publieeAt: null, slug: null };
const publier = () => screen.getByRole('button', { name: 'Publier' });
const relues = () => screen.getByRole('checkbox', { name: /J’ai relu les règles/ });

afterEach(() => vi.unstubAllGlobals());

describe('<JournalEditeur />', () => {
  it('les sept règles restent visibles, avec la règle d’or', () => {
    serveur([]);
    render(<JournalEditeur initial={BROUILLON} />);
    const regles = screen.getByRole('complementary', { name: 'Règles éditoriales' });
    expect(regles.querySelectorAll('ol > li')).toHaveLength(7);
    expect(regles).toHaveTextContent('On dit ce que le membre y gagne, jamais comment ça marche.');
  });

  it('texte propre : Publier ne s’active qu’avec « J’ai relu les règles »', async () => {
    serveur([]);
    render(<JournalEditeur initial={BROUILLON} />);
    await waitFor(() => expect(screen.getByText(/Aucune alerte/)).toBeInTheDocument());
    expect(publier()).toBeDisabled();
    fireEvent.click(relues());
    expect(publier()).toBeEnabled();
  });

  it('alerte bloquante : aucune case pour la lever, Publier reste inactif', async () => {
    serveur([EMAIL, AT]);
    render(<JournalEditeur initial={BROUILLON} />);
    await screen.findByText('Adresse e-mail — jamais publiable');
    expect(screen.getAllByRole('checkbox', { name: /Je maintiens cet extrait/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('checkbox', { name: /Je maintiens cet extrait/ }));
    fireEvent.click(relues());
    expect(publier()).toBeDisabled();
  });

  it('alertes levables : chacune se lève, puis Publier envoie les empreintes et la case', async () => {
    const appels = serveur([AT, AUTO]);
    const onPublie = vi.fn();
    render(<JournalEditeur initial={BROUILLON} onEnregistre={onPublie} />);
    await screen.findByText('Identifiant de type @pseudo');
    const cases = screen.getAllByRole('checkbox', { name: /Je maintiens cet extrait/ });
    fireEvent.click(relues());
    fireEvent.click(cases[0]);
    expect(publier()).toBeDisabled();
    fireEvent.click(cases[1]);
    expect(publier()).toBeEnabled();
    fireEvent.click(publier());
    await waitFor(() => expect(onPublie).toHaveBeenCalled());
    const envoi = appels.find((a) => a.url === '/api/admin/journal/p1/publier')!;
    expect(envoi.body).toEqual({ titre: 'Titre', corps: 'Texte.', levees: ['e2', 'e3'], reglesRelues: true });
  });

  it('modifier le texte invalide la vérification tant que le contrôle n’a pas répondu', async () => {
    serveur([]);
    render(<JournalEditeur initial={BROUILLON} />);
    await screen.findByText(/Aucune alerte/);
    fireEvent.click(relues());
    fireEvent.change(screen.getByLabelText('Texte'), { target: { value: 'Autre texte.' } });
    expect(publier()).toBeDisabled();
    await waitFor(() => expect(publier()).toBeEnabled());
  });

  it('un refus du serveur (422) s’affiche et met à jour les alertes', async () => {
    serveur([], { '/api/admin/journal/p1/publier': { status: 422, body: { error: 'Des alertes restent à lever ou à corriger.', alertes: [AT] } } });
    render(<JournalEditeur initial={BROUILLON} />);
    await screen.findByText(/Aucune alerte/);
    fireEvent.click(relues());
    fireEvent.click(publier());
    expect(await screen.findByText('Des alertes restent à lever ou à corriger.')).toBeInTheDocument();
    expect(screen.getByText('Identifiant de type @pseudo')).toBeInTheDocument();
  });

  it('aperçu : rendu identique à la page publique', async () => {
    serveur([]);
    render(<JournalEditeur initial={{ ...BROUILLON, corps: 'Un **mot**.\n\n- a\n- b' }} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Aperçu' }));
    const apercu = screen.getByRole('tabpanel');
    expect(apercu.querySelector('strong')).toHaveTextContent('mot');
    expect(apercu.querySelectorAll('li')).toHaveLength(2);
  });

  it('nouveau brouillon : l’enregistrement le crée', async () => {
    const appels = serveur([], { '/api/admin/journal': { status: 201, body: { post: { ...BROUILLON, id: 'neuf' } } } });
    const onCree = vi.fn();
    render(<JournalEditeur onCree={onCree} />);
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Neuf' } });
    fireEvent.change(screen.getByLabelText('Texte'), { target: { value: 'Contenu.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await waitFor(() => expect(onCree).toHaveBeenCalledWith('neuf'));
    expect(appels.find((a) => a.url === '/api/admin/journal' && a.method === 'POST')?.body).toEqual({ titre: 'Neuf', corps: 'Contenu.' });
  });

  it('publication en ligne : pas d’enregistrement en place, « Publier les modifications » et « Dépublier »', async () => {
    serveur([]);
    render(<JournalEditeur initial={{ ...BROUILLON, statut: 'publiee', publieeAt: '2026-09-25T10:00:00Z', slug: 'titre' }} />);
    expect(screen.queryByRole('button', { name: 'Enregistrer le brouillon' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Publier les modifications' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dépublier' })).toBeInTheDocument();
  });
});
