interface ProfileSectionProps {
  title: string;
  onEdit?: () => void;
  editing?: boolean;
  surface?: 'white' | 'blush' | 'sand';
  children: React.ReactNode;
}

const surfaceClasses: Record<string, string> = {
  white: 'bg-white dark:bg-gray-800',
  blush: 'bg-blush dark:bg-coral/10',
  sand: 'bg-sand dark:bg-coral-dark/20',
};

export default function ProfileSection({
  title,
  onEdit,
  editing,
  surface = 'white',
  children,
}: ProfileSectionProps) {
  const showPencil = !!onEdit && !editing;

  return (
    <section
      className={`${surfaceClasses[surface]} rounded-xl border border-gray-200 p-4 sm:p-5 dark:border-gray-700`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        {showPencil && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Modifier ${title}`}
            className="h-11 w-11 flex items-center justify-center rounded-full transition-colors hover:bg-blush dark:hover:bg-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5 text-gray-400 hover:text-coral"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </section>
  );
}