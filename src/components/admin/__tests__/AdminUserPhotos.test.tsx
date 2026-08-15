/**
 * Tests — AdminUserPhotos (#323).
 *
 * La fiche admin n'affichait qu'un compteur (`photos.length`) : aucune
 * vignette, aucun retrait possible. Ces tests verrouillent ce qui rend la
 * modération photo utilisable et défendable : l'avatar identifié comme la
 * photo publique, les conséquences dites avant l'acte, le motif obligatoire.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUserPhotos from '../AdminUserPhotos';

function mockFetch(status: number, body: unknown = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

function setup(photos: string[]) {
  const onPhotosChange = vi.fn();
  render(
    <AdminUserPhotos
      userId="u-1"
      displayName="Camille"
      photos={photos}
      onPhotosChange={onPhotosChange}
    />,
  );
  return { onPhotosChange, user: userEvent.setup() };
}

describe('<AdminUserPhotos />', () => {
  it('affiche une vignette par photo, pas un compteur', () => {
    setup(['u-1/a.jpg', 'u-1/b.jpg', 'u-1/c.jpg']);
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('distingue l\'avatar comme la photo publique', () => {
    setup(['u-1/a.jpg', 'u-1/b.jpg']);
    expect(screen.getByText('Avatar (public)')).toBeInTheDocument();
    expect(screen.getByText('Photo 2')).toBeInTheDocument();
  });

  it('passe par le proxy signé plutôt que par une URL R2 en dur', () => {
    setup(['u-1/a.jpg']);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/photos/u-1%2Fa.jpg');
  });

  it('gère un profil sans photo', () => {
    setup([]);
    expect(screen.getByText('Aucune photo.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('refuse le retrait sans motif et n\'appelle pas l\'API', async () => {
    const fetchMock = mockFetch(200);
    const { user } = setup(['u-1/a.jpg', 'u-1/b.jpg']);

    await user.click(screen.getAllByRole('button', { name: 'Retirer' })[0]);
    await user.click(screen.getByRole('button', { name: /Confirmer le retrait/ }));

    expect(await screen.findByText(/indéfendable/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('prévient que retirer l\'avatar promeut la photo suivante', async () => {
    mockFetch(200);
    const { user } = setup(['u-1/a.jpg', 'u-1/b.jpg']);

    await user.click(screen.getAllByRole('button', { name: 'Retirer' })[0]);

    expect(screen.getByText(/la photo suivante prendra sa place/i)).toBeInTheDocument();
  });

  it('prévient qu\'un profil à une seule photo se retrouvera sans avatar', async () => {
    mockFetch(200);
    const { user } = setup(['u-1/a.jpg']);

    await user.click(screen.getByRole('button', { name: 'Retirer' }));

    expect(screen.getByText(/se retrouvera sans avatar/i)).toBeInTheDocument();
  });

  it('envoie la clé et le motif, puis remonte la nouvelle liste', async () => {
    const fetchMock = mockFetch(200, { photos: ['u-1/a.jpg'] });
    const { onPhotosChange, user } = setup(['u-1/a.jpg', 'u-1/b.jpg']);

    await user.click(screen.getAllByRole('button', { name: 'Retirer' })[1]);
    await user.type(screen.getByPlaceholderText(/Motif/), 'hors charte');
    await user.click(screen.getByRole('button', { name: /Confirmer le retrait/ }));

    await waitFor(() => expect(onPhotosChange).toHaveBeenCalledWith(['u-1/a.jpg']));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/admin/users/u-1/photos');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body)).toEqual({ photoKey: 'u-1/b.jpg', reason: 'hors charte' });
  });
});
