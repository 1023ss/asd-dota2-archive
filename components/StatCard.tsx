import { KuroPanel } from "@/components/ui/KuroPanel";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  index?: number;
}

export function StatCard({ label, value, hint, index = 0 }: StatCardProps) {
  return (
    <KuroPanel className="group p-6 transition hover:border-[var(--border-accent)]">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-[var(--muted)] uppercase">
          {label}
        </p>
        <span className="font-mono text-[10px] text-[var(--accent-dim)]">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <p className="stat-value mt-3">{value}</p>
      {hint && (
        <p className="mt-2 text-xs text-[var(--muted)] group-hover:text-[var(--foreground)]/60 transition-colors">
          {hint}
        </p>
      )}
      <div className="mt-4 h-px w-full bg-gradient-to-r from-[var(--accent)]/40 via-[var(--border)] to-transparent" />
    </KuroPanel>
  );
}
