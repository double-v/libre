interface PrivacyTipProps {
  tip: string;
}

export default function PrivacyTip({ tip }: PrivacyTipProps) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
      <span className="mt-0.5 shrink-0" aria-hidden="true">&#9432;</span>
      <span>{tip}</span>
    </p>
  );
}