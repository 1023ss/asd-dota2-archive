"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/leaderboard", label: "社区玩家" },
  { href: "/events", label: "历史比赛" },
  { href: "/me", label: "个人中心" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(6,6,8,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <Logo variant="header" priority className="transition group-hover:opacity-90" />
          <span className="hidden border-l border-[var(--border)] pl-3 text-[10px] leading-tight tracking-[0.18em] text-[var(--muted)] uppercase sm:block">
            社区
            <br />
            档案馆
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "nav-link--active" : ""}`}
              >
                <span className="nav-link__text text-worn-white">
                  {item.label}
                  {active && <span className="nav-link__indicator" aria-hidden />}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
