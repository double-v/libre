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
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 ${
        selected
          ? 'border-black bg-black text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
      }`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}