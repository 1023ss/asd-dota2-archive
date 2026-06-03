import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALLSTARTS Dota2 社区档案馆",
  description: "ALLSTARTS Dota2 社区玩家档案、战力排行与赛事记录",
  icons: {
    icon: "/logo-allstarts.png",
    apple: "/logo-allstarts.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased font-sans">
        <div className="site-bg" aria-hidden="true" />
        <Header />
        <main className="relative">{children}</main>
        <footer className="relative mt-16 border-t border-[var(--border)] py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Logo variant="footer" />
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50" />
              <p className="text-sm text-[var(--muted)]">
                记录赛事与玩家成长历程
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
