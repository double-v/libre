import Image from 'next/image';
import { photoUrl } from '@/lib/photos';

interface ProfilePhotoHeroProps {
  photos: string[];
  onAddClick?: () => void;
}

export default function ProfilePhotoHero({ photos, onAddClick }: ProfilePhotoHeroProps) {
  if (photos.length === 0) {
    return (
      <div
        data-testid="photo-hero"
        className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-hairline-strong bg-fill-subtle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-10 w-10 text-muted"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.329 47.329 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-3.246 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
        <p className="text-sm text-muted">Aucune photo pour l’instant</p>
        {onAddClick && (
          <button
            type="button"
            onClick={onAddClick}
            className="rounded-full bg-coral px-4 py-1.5 text-xs font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral"
          >
            Ajouter une photo
          </button>
        )}
      </div>
    );
  }

  const [hero, ...thumbs] = photos;

  return (
    <div data-testid="photo-hero" className="w-full">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-fill-subtle">
        <Image
          src={photoUrl(hero)}
          alt="Photo principale"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 32rem"
          priority
          unoptimized
        />
      </div>
      {thumbs.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto" aria-label="Photos supplémentaires">
          {thumbs.map((key, i) => (
            <Image
              key={key}
              src={photoUrl(key)}
              alt={`Photo ${i + 2}`}
              width={80}
              height={80}
              className="shrink-0 rounded-lg object-cover"
              unoptimized
            />
          ))}
        </div>
      )}
    </div>
  );
}
