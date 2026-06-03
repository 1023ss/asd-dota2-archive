import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo-allstarts.png";

/** 与 public/logo-allstarts.png 像素尺寸一致，避免 hydration 不一致 */
const INTRINSIC_WIDTH = 271;
const INTRINSIC_HEIGHT = 212;

type LogoVariant = "header" | "hero" | "footer";

const variantClass: Record<LogoVariant, string> = {
  header: "h-9 w-auto max-w-[200px] sm:h-10",
  hero: "h-20 w-auto max-w-[min(100%,320px)] sm:h-24 sm:max-w-[360px]",
  footer: "h-7 w-auto max-w-[140px] opacity-80",
};

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
  priority?: boolean;
}

/** ALLSTARTS 品牌 Logo（白字透明底 PNG，显示尺寸由 CSS 控制） */
export function Logo({
  variant = "header",
  className,
  priority = false,
}: LogoProps) {
  const glowClass =
    variant === "hero"
      ? "drop-shadow-[0_0_12px_rgba(255,255,255,0.45)] drop-shadow-[0_0_28px_rgba(214,40,40,0.35)]"
      : variant === "header"
        ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.35)] drop-shadow-[0_0_16px_rgba(214,40,40,0.2)]"
        : "drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]";

  return (
    <Image
      src={LOGO_SRC}
      alt="ALLSTARTS"
      width={INTRINSIC_WIDTH}
      height={INTRINSIC_HEIGHT}
      priority={priority}
      unoptimized
      className={cn(
        "object-contain object-left",
        glowClass,
        variantClass[variant],
        className
      )}
    />
  );
}
