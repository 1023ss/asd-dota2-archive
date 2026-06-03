interface PlayerTagProps {
  tag: string;
  size?: "default" | "compact";
}

/** 玩家身份标签 — 昵称旁高亮展示 */
export function PlayerTag({ tag, size = "default" }: PlayerTagProps) {
  const compact = size === "compact";

  return (
    <span className="player-tag group relative inline-flex shrink-0 items-center">
      <span
        className="pointer-events-none absolute -inset-px rounded-sm bg-gradient-to-r from-[var(--accent)] via-[#ff6b4a] to-[var(--accent-bright)] opacity-80 blur-[2px] transition group-hover:opacity-100"
        aria-hidden
      />
      <span
        className={`relative inline-flex items-center border border-[var(--accent)]/60 bg-gradient-to-r from-[rgba(214,40,40,0.28)] via-[rgba(214,40,40,0.18)] to-[rgba(255,107,74,0.12)] shadow-[0_0_20px_rgba(214,40,40,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] ${
          compact
            ? "gap-1 px-2 py-0.5"
            : "gap-1.5 px-3 py-1"
        }`}
      >
        <span
          className={`shrink-0 rotate-45 bg-[var(--accent-bright)] shadow-[0_0_6px_var(--accent-bright)] ${
            compact ? "h-1 w-1" : "h-1.5 w-1.5"
          }`}
          aria-hidden
        />
        <span
          className={`font-bold tracking-[0.22em] text-white uppercase ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          {tag}
        </span>
      </span>
    </span>
  );
}
