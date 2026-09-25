interface TagButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Choix visible mais non modifiable (filtre d'intention voilé, spec 008). */
  disabled?: boolean;
}

export default function TagButton({ label, selected, onClick, disabled = false }: TagButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-1 ${
        selected
          ? 'border-coral bg-coral text-white'
          : 'border-hairline-strong bg-surface text-muted hover:border-hairline-strong'
      } disabled:cursor-not-allowed disabled:opacity-45`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}