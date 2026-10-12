/**
 * Tests — étape « ce que tu cherches » (spec 005, FR-008) : une saisie, deux
 * cibles — ce que je déclare et ce que je cherche.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StepSeeking from '../StepSeeking';
import { RELATIONSHIP_TYPE_OPTIONS, ORIENTATION_OPTIONS, GENDER_OPTIONS } from '@/lib/taxonomy';

describe('<StepSeeking />', () => {
  it('propose les trois taxonomies du profil, sans « je ne souhaite pas le préciser »', () => {
    render(<StepSeeking onContinue={vi.fn()} onLater={vi.fn()} />);
    // « Autre » existe dans les trois listes : on compte, on ne cherche pas l'unique.
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    for (const opt of RELATIONSHIP_TYPE_OPTIONS) {
      expect(screen.getAllByRole('button', { name: cap(opt) }).length).toBeGreaterThan(0);
    }
    for (const opt of ORIENTATION_OPTIONS) {
      expect(screen.getAllByRole('button', { name: cap(opt) }).length).toBeGreaterThan(0);
    }
    const genders = GENDER_OPTIONS.filter((g) => g.value !== '');
    for (const g of genders) expect(screen.getAllByRole('button', { name: g.label }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Autre' })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Je ne souhaite pas le préciser' })).toBeNull();
  });

  it('« Continuer » envoie le type de relation vers le profil ET les filtres', async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    render(<StepSeeking onContinue={onContinue} onLater={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Libre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Poly' }));
    fireEvent.click(screen.getByRole('button', { name: 'Femme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bi' }));
    // « Autre » de l'orientation (3e liste), pas celui du type de relation.
    fireEvent.click(screen.getAllByRole('button', { name: 'Autre' })[2]);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledWith({
      relationshipType: ['libre', 'poly'],
      searchRelationshipTypes: ['libre', 'poly'],
      searchGenders: ['femme'],
      searchOrientations: ['bi', 'autre'],
      sensitiveConsent: true,
    }));
  });

  it('demande la case art. 9 dès qu’un genre ou une orientation est choisi, et l’envoie (#425)', async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    render(<StepSeeking onContinue={onContinue} onLater={vi.fn()} />);
    // Sans choix sensible : pas de case, on peut continuer.
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Femme' }));
    const consent = screen.getByRole('checkbox');
    expect(consent).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();
    fireEvent.click(consent);
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({
      searchGenders: ['femme'],
      sensitiveConsent: true,
    })));
  });

  it('sans choix sensible, « Continuer » n’envoie pas de consentement', async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    render(<StepSeeking onContinue={onContinue} onLater={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Libre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    await waitFor(() => expect(onContinue).toHaveBeenCalled());
    expect(onContinue.mock.calls[0][0]).not.toHaveProperty('sensitiveConsent');
  });

  it('« Plus tard » n’envoie rien', () => {
    const onContinue = vi.fn();
    const onLater = vi.fn();
    render(<StepSeeking onContinue={onContinue} onLater={onLater} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(onContinue).not.toHaveBeenCalled();
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});

/**
 * Réciprocité (#519) : choisir un critère genre/orientation sans contrepartie
 * pose la question — deux portes au tunnel, et la déclaration voyage dans le
 * même PUT que l'étape. Jamais d'écriture forcée : « Sans filtre » retire.
 */
describe('<StepSeeking /> — réciprocité (#519)', () => {
  it('pose la question au clic du critère sans genre déclaré, et bloque Continuer', () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    render(<StepSeeking onContinue={onContinue} onLater={vi.fn()} genreDeclared={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Femme' }));
    expect(screen.getByText('Pour chercher par genre, dis aussi le tien.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('la porte « Déclarer mon genre » ouvre le champ, la déclaration voyage dans le PUT de l\'étape (#518)', async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    render(
      <StepSeeking
        onContinue={onContinue}
        onLater={vi.fn()}
        genreDeclared={false}
        sensitiveConsent={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Femme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Déclarer mon genre' }));
    expect(screen.getByLabelText('Ton genre')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ton genre'), { target: { value: 'femme' } });
    // La question se referme : la contrepartie est prise.
    expect(screen.queryByText('Pour chercher par genre, dis aussi le tien.')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({
      searchGenders: ['femme'],
      genderIdentity: 'femme',
      sensitiveConsent: true,
    })));
  });

  it('la porte « Sans filtre » retire le critère et rouvre Continuer', async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    render(<StepSeeking onContinue={onContinue} onLater={vi.fn()} genreDeclared={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Femme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sans filtre' }));
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeEnabled();
    // Rien n'a été forcé : le PUT de l'étape part sans critère ni consentement.
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({
      searchGenders: [],
    })));
    expect(onContinue.mock.calls[0][0]).not.toHaveProperty('sensitiveConsent');
    expect(onContinue.mock.calls[0][0]).not.toHaveProperty('genderIdentity');
  });

  it('un critère par côté : déclarer le genre n\'ouvre pas le filtre orientation', async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    render(
      <StepSeeking
        onContinue={onContinue}
        onLater={vi.fn()}
        genreDeclared={false}
        orientationDeclared={true}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hétéro' }));
    expect(screen.queryByText('Pour chercher par orientation, dis aussi la tienne.')).toBeNull();
    // Le côté genre, lui, pose sa question — déclarer l'un n'ouvre pas l'autre.
    fireEvent.click(screen.getByRole('button', { name: 'Femme' }));
    expect(screen.getByText('Pour chercher par genre, dis aussi le tien.')).toBeInTheDocument();
  });

  it('porte l\'échange sur le critère, la personne sur la déclaration (#518)', () => {
    render(<StepSeeking onContinue={vi.fn()} onLater={vi.fn()} />);
    expect(screen.getByText('L\'orientation des gens qui te plaisent')).toBeInTheDocument();
    expect(screen.queryByText('Orientation')).not.toBeInTheDocument();
  });

  it('l\'erreur de consentement se montre dès le choix sensible sans case (#518)', () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    render(<StepSeeking onContinue={onContinue} onLater={vi.fn()} />);
    // Sans choix sensible : pas de case, pas d'erreur.
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Bi' }));
    expect(screen.getByText('Coche la case pour enregistrer ces informations.')).toBeInTheDocument();
  });
});
