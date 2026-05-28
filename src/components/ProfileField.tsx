interface ProfileFieldProps {
  label: string;
  children?: React.ReactNode;
  empty?: boolean;
}

function hasValue(children: React.ReactNode): boolean {
  return children !== undefined && children !== null && children !== '';
}

export default function ProfileField({ label, children, empty }: ProfileFieldProps) {
  const showEmpty = empty && !hasValue(children);

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
        {label}
      </dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100">
        {showEmpty ? (
          <span className="italic text-gray-600 dark:text-gray-400">Non renseigné</span>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}