import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProfileField from '@/components/ProfileField';

describe('ProfileField', () => {
  it('renders label and value', () => {
    render(<ProfileField label="Prénom">Jean</ProfileField>);

    expect(screen.getByText('Prénom')).toBeInTheDocument();
    expect(screen.getByText('Jean')).toBeInTheDocument();
  });

  it('shows "Non renseigné" when empty=true and no children', () => {
    render(<ProfileField label="Prénom" empty />);

    expect(screen.getByText('Non renseigné')).toBeInTheDocument();
  });

  it('renders children value even when empty=true', () => {
    render(
      <ProfileField label="Prénom" empty>
        Jean
      </ProfileField>,
    );

    expect(screen.getByText('Jean')).toBeInTheDocument();
    expect(screen.queryByText('Non renseigné')).not.toBeInTheDocument();
  });

  it('shows "Non renseigné" when children is undefined', () => {
    render(<ProfileField label="Prénom" empty>{undefined}</ProfileField>);

    expect(screen.getByText('Non renseigné')).toBeInTheDocument();
  });
});