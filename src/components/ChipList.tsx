interface ChipListProps {
  items: string[];
  variant?: 'default' | 'practices';
}

export default function ChipList({ items, variant = 'default' }: ChipListProps) {
  if (items.length === 0) {
    return <span className="text-xs italic text-gray-600 dark:text-gray-400">Non renseigné</span>;
  }

  const chipBase = 'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium';
  const chipColor =
    variant === 'practices'
      ? 'bg-sand/60 text-coral-dark dark:bg-coral/20 dark:text-coral-light'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className={`${chipBase} ${chipColor}`}>
          {item}
        </span>
      ))}
    </div>
  );
}