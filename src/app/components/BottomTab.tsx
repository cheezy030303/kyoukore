"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomTab() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isWardrobe = pathname?.startsWith("/wardrobe");

  const base =
    "flex-1 py-3 text-sm font-semibold rounded-2xl transition text-center";
  const active = "bg-slate-900 text-white";
  const idle = "bg-white text-slate-700 border border-slate-200";

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(420px,calc(100vw-32px))] z-50">
      <div className="bg-white/70 backdrop-blur border border-slate-200 shadow-lg rounded-3xl p-2 flex gap-2">
        <Link href="/" className={`${base} ${isHome ? active : idle}`}>
          ホーム
        </Link>
        <Link
          href="/wardrobe"
          className={`${base} ${isWardrobe ? active : idle}`}
        >
          ワードローブ
        </Link>
      </div>
    </nav>
  );
}