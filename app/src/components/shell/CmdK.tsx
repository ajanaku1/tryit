"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  glyph: string;
  run: (router: ReturnType<typeof useRouter>) => void;
  keywords?: string;
};

const COMMANDS: Cmd[] = [
  {
    id: "nav-dashboard",
    label: "Open dashboard",
    hint: "owner view",
    glyph: "▦",
    run: (r) => r.push("/dashboard"),
    keywords: "metrics payouts",
  },
  {
    id: "nav-claim",
    label: "Claim a repo",
    hint: "SIWX + file drop",
    glyph: "+",
    run: (r) => r.push("/claim"),
    keywords: "owner",
  },
  {
    id: "nav-landing",
    label: "Go to landing",
    glyph: "↩",
    run: (r) => r.push("/"),
  },
  {
    id: "boot-ai-chatbot",
    label: "Boot vercel/ai-chatbot",
    hint: "Next.js · example",
    glyph: "▶",
    run: (r) => r.push("/vercel/ai-chatbot"),
    keywords: "nextjs ai vercel chatbot example",
  },
  {
    id: "boot-next",
    label: "Boot vercel/next.js",
    hint: "cached · ~8s",
    glyph: "▶",
    run: (r) => r.push("/vercel/next.js"),
    keywords: "next react ssr",
  },
  {
    id: "docs-security",
    label: "Open SECURITY.md",
    hint: "abuse controls",
    glyph: "§",
    run: () => {
      window.location.href = "/SECURITY";
    },
    keywords: "abuse rate limit egress",
  },
];

export function CmdK({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) =>
      `${c.label} ${c.keywords ?? ""} ${c.hint ?? ""}`.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const run = (cmd: Cmd) => {
    onClose();
    cmd.run(router);
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(filtered.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[selected];
      if (cmd) run(cmd);
    }
  };

  return (
    <div
      className="cmdk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cmdk-panel">
        <div className="cmdk-input-row">
          <span className="font-mono text-[12px]" style={{ color: "var(--fg-mute)" }}>
            ⌘K
          </span>
          <input
            ref={inputRef}
            className="cmdk-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Search commands, boot a repo, open dashboard…"
            aria-label="Command"
          />
          <span className="kbd">esc</span>
        </div>

        {filtered.length === 0 ? (
          <div className="cmdk-empty">No matches.</div>
        ) : (
          <ul className="cmdk-list" role="listbox">
            {filtered.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === selected}
                className="cmdk-item"
                data-selected={i === selected}
                onMouseEnter={() => setSelected(i)}
                onClick={() => run(c)}
              >
                <span className="cmdk-glyph" aria-hidden="true">
                  {c.glyph}
                </span>
                <span className="flex-1">{c.label}</span>
                {c.hint && (
                  <span className="font-mono text-[11px]" style={{ color: "var(--fg-mute)" }}>
                    {c.hint}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
