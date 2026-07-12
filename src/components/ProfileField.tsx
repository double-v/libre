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
      <dt className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="text-sm text-content">
        {showEmpty ? (
          <span className="italic text-muted">Non renseigné</span>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}