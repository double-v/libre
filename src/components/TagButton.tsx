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
          : 'border-hairline-strong bg-surface text-muted hover:border-hairline-strong'
      }`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}