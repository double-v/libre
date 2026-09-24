/**
 * Tests composant — Input, révélation du mot de passe.
 *
 * L'œil n'est pas un ornement : sur mobile, la saisie à l'aveugle est la
 * première cause d'échec de connexion. On fige donc le contrat a11y (bouton
 * réel, `aria-pressed`, libellé qui annonce l'action à venir) et le fait que
 * seuls les champs `type="password"` l'exposent.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '../Input';

describe('<Input /> — œil mot de passe', () => {
  it('masque la saisie par défaut et propose de la voir', () => {
    render(<Input label="Mot de passe" type="password" defaultValue="secret" />);

    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Voir le mot de passe' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('révèle puis remasque la saisie au clic', () => {
    render(<Input label="Mot de passe" type="password" defaultValue="secret" />);
    const field = screen.getByLabelText('Mot de passe');

    fireEvent.click(screen.getByRole('button', { name: 'Voir le mot de passe' }));
    expect(field).toHaveAttribute('type', 'text');
    expect(field).toHaveValue('secret');

    const hide = screen.getByRole('button', { name: 'Masquer le mot de passe' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(hide);
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password');
  });

  it('pilote bien le champ qu\'il accompagne', () => {
    render(<Input id="pwd" label="Mot de passe" type="password" />);

    expect(screen.getByRole('button', { name: 'Voir le mot de passe' })).toHaveAttribute(
      'aria-controls',
      'pwd',
    );
  });

  it("n'expose pas l'œil sur les autres types de champ", () => {
    render(<Input label="Email" type="email" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('se désactive avec le champ', () => {
    render(<Input label="Mot de passe" type="password" disabled />);

    expect(screen.getByRole('button', { name: 'Voir le mot de passe' })).toBeDisabled();
  });

  it('peut être retiré via revealable={false}', () => {
    render(<Input label="Mot de passe" type="password" revealable={false} />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('<Input multiline /> (spec 007)', () => {
  it('la hauteur suit `rows` : aucune hauteur fixe de champ une ligne sur la zone de texte', () => {
    render(<Input label="Texte" multiline rows={12} />);
    const zone = screen.getByLabelText('Texte');
    expect(zone.tagName).toBe('TEXTAREA');
    expect(zone).toHaveAttribute('rows', '12');
    expect(zone.className).not.toMatch(/(^|\s)h-(9|11)(\s|$)/);
    expect(zone.className).toMatch(/min-h-11/);
  });
});
