import { cn } from "@/lib/utils";

interface KuroPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function KuroPanel({ children, className }: KuroPanelProps) {
  return (
    <div className={cn("kuro-panel rounded-sm", className)}>{children}</div>
  );
}
