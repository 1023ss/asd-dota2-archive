interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeader({
  label,
  title,
  description,
  action,
}: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {label && <p className="section-label mb-2">{label}</p>}
        <h2 className="section-title">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm text-[var(--muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
