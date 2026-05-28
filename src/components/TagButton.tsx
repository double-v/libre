interface TagButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export default function TagButton({ label, selected, onClick }: TagButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-1 ${
        selected
          ? 'border-coral bg-coral text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-gray-500'
      }`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}