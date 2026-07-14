"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminSession, getAdminAccessToken, getAdminEmail } from "@/lib/adminSession";

const NAV_ITEMS = [
  { href: "/admin/performers", label: "出場者管理" },
  { href: "/admin/matches", label: "対戦管理" },
  { href: "/admin/qr", label: "QR表示" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecked(true);
      return;
    }
    const token = getAdminAccessToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    setEmail(getAdminEmail());
    setChecked(true);
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!checked) {
    return (
      <div className="admin-shell">
        <div className="admin-main">読み込み中…</div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <div className="admin-header__title">観客ジャッジ投票 - 運営管理</div>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
          onClick={() => {
            clearAdminSession();
            router.replace("/admin/login");
          }}
        >
          {email ? `${email} / ログアウト` : "ログアウト"}
        </button>
      </div>
      <nav className="admin-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname?.startsWith(item.href) ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="admin-main">{children}</div>
    </div>
  );
}
