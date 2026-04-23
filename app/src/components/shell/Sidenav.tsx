"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; glyph: string; match: (p: string) => boolean };

const NAV: { title: string; items: Item[] }[] = [
  {
    title: "You",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        glyph: "▦",
        match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
      },
      {
        href: "/claim",
        label: "Claim a repo",
        glyph: "+",
        match: (p) => p === "/claim" || p.startsWith("/claim/"),
      },
    ],
  },
  {
    title: "Sessions",
    items: [
      {
        href: "/dashboard",
        label: "Active boots",
        glyph: "▶",
        match: (p) => p.startsWith("/try/"),
      },
    ],
  },
  {
    title: "Discover",
    items: [
      { href: "/", label: "Landing", glyph: "↩", match: (p) => p === "/" },
      { href: "/leaderboard", label: "Leaderboard", glyph: "★", match: (p) => p === "/leaderboard" },
    ],
  },
];

export function Sidenav({ onOpenCmdK }: { onOpenCmdK: () => void }) {
  const pathname = usePathname() || "/";

  return (
    <aside
      className="sidenav hidden lg:flex"
      aria-label="Primary navigation"
    >
      <Link
        href="/"
        aria-label="Tryit home"
        className="mb-3 flex items-center gap-2.5 px-2 py-1 no-underline"
      >
        <span
          aria-hidden="true"
          className="grid h-6 w-6 place-items-center rounded-md font-mono text-[13px] font-bold text-[#1a0906]"
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, #b03d30 100%)",
            boxShadow: "0 0 20px var(--accent-ring)",
          }}
        >
          t
        </span>
        <span
          className="text-[15px] font-semibold tracking-[-0.015em]"
          style={{ color: "var(--fg)" }}
        >
          tryit<span style={{ color: "var(--fg-mute)", fontWeight: 400 }}>/beta</span>
        </span>
      </Link>

      <button
        type="button"
        onClick={onOpenCmdK}
        aria-label="Open command palette"
        className="mb-2 flex items-center justify-between rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-left transition-colors"
        style={{
          background: "var(--bg-2)",
          borderColor: "var(--border)",
          color: "var(--fg-mute)",
        }}
      >
        <span className="font-mono text-[12px]">Search…</span>
        <span className="flex gap-1">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </button>

      {NAV.map((section) => (
        <div key={section.title} className="flex flex-col gap-0.5">
          <div className="sidenav-section">{section.title}</div>
          {section.items.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidenav-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="sidenav-icon" aria-hidden="true">
                  {item.glyph}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div
        className="mt-auto border-t pt-3 font-mono text-[10.5px]"
        style={{ borderColor: "var(--border-soft)", color: "var(--fg-mute)" }}
      >
        <div>wallet · 0x7fda…3a40</div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="chip-live" style={{ fontSize: 9, padding: "1px 6px" }}>
            <span className="dot" aria-hidden="true" />
            beta
          </span>
          <span>us-east-1</span>
        </div>
      </div>
    </aside>
  );
}
