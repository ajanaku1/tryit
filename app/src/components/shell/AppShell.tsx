"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sidenav } from "./Sidenav";
import { CmdK } from "./CmdK";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const openCmdK = useCallback(() => setCmdkOpen(true), []);
  const closeCmdK = useCallback(() => setCmdkOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidenav onOpenCmdK={openCmdK} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center justify-between border-b px-5 py-3 lg:hidden"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span
              aria-hidden="true"
              className="grid h-6 w-6 place-items-center rounded-md font-mono text-[13px] font-bold text-[#1a0906]"
              style={{
                background: "linear-gradient(135deg, var(--accent) 0%, #b03d30 100%)",
              }}
            >
              t
            </span>
            <span className="text-[15px] font-semibold" style={{ color: "var(--fg)" }}>
              tryit
            </span>
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={openCmdK}
            aria-label="Open command palette"
          >
            ⌘K
          </button>
        </header>

        {children}
      </div>

      <CmdK open={cmdkOpen} onClose={closeCmdK} />
    </div>
  );
}
