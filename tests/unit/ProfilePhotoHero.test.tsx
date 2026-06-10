import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfilePhotoHero from '@/components/ProfilePhotoHero';

const photos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];

describe('ProfilePhotoHero', () => {
  it('renders a hero image for the first photo with aspect-[4/5]', () => {
    const { container } = render(<ProfilePhotoHero photos={photos} />);
    const hero = container.querySelector('[data-testid="photo-hero"]');
    expect(hero).toBeInTheDocument();
    // 4:5 aspect ratio lives on the inner aspect-ratio container
    const aspect = container.querySelector('.aspect-\\[4\\/5\\]');
    expect(aspect).toBeInTheDocument();
  });

  it('uses the photoUrl proxy for the hero image', () => {
    render(<ProfilePhotoHero photos={photos} />);
    const img = screen.getByAltText(/Photo principale/i);
    expect(img.getAttribute('src')).toBe('/api/photos/photo1.jpg');
  });

  it('renders thumbnails for photos 2..N below the hero', () => {
    render(<ProfilePhotoHero photos={photos} />);
    // Photos 2 and 3 should appear as thumbs (alt = "Photo N")
    expect(screen.getByAltText('Photo 2')).toBeInTheDocument();
    expect(screen.getByAltText('Photo 3')).toBeInTheDocument();
    // But the hero image is photo 1
    expect(screen.getByAltText(/principale/i)).toBeInTheDocument();
  });

  it('shows an inviting empty state when no photos are provided', () => {
    render(<ProfilePhotoHero photos={[]} onAddClick={vi.fn()} />);
    expect(screen.getByText(/aucune photo/i)).toBeInTheDocument();
  });

  it('exposes the add-photo action via a button when no photos are provided', () => {
    const onAdd = vi.fn();
    render(<ProfilePhotoHero photos={[]} onAddClick={onAdd} />);
    const btn = screen.getByRole('button', { name: /ajouter.*photo/i });
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('does not crash with a single photo (no thumbnails to render)', () => {
    render(<ProfilePhotoHero photos={['only.jpg']} />);
    expect(screen.getByAltText(/principale/i)).toBeInTheDocument();
    // No thumbnail for photo 1 since it's the hero
    expect(screen.queryByAltText('Photo 2')).not.toBeInTheDocument();
  });
});
