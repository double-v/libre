/**
 * CountChip — compteur de file de travail, surfaces admin uniquement (DESIGN.md).
 *
 * Ici le chiffre est légitime : une charge à traiter, pas une mécanique de
 * rétention. Sur une surface membre c'est `NotificationDot` qui tient ce rôle,
 * sans nombre. Zéro ne rend rien ; au-delà de 99 on plafonne.
 */
export interface CountChipProps {
  count: number;
  className?: string;
}

export default function CountChip({ count, className = '' }: CountChipProps) {
  if (count <= 0) return null;
  const shown = count > 99 ? '99+' : String(count);
  return (
    <span
      aria-label={`${count} en attente`}
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-xs font-medium text-white ${className}`.trim()}
    >
      {shown}
    </span>
  );
}
