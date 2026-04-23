"use client";

import { useState } from "react";

export function BadgeCard({ owner, repo }: { owner: string; repo: string }) {
  const badgeUrl = `https://tryit.buildwithlocus.com/badge/${owner}/${repo}.svg`;
  const linkUrl = `https://tryit.buildwithlocus.com/${owner}/${repo}`;
  const snippet = `[![try it](${badgeUrl})](${linkUrl})`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <section className="glass-card p-5" aria-label="README badge">
      <header className="mb-4 flex items-center justify-between">
        <h2
          className="m-0 text-[14px] font-medium tracking-[-0.005em]"
          style={{ color: "var(--fg)" }}
        >
          Drop this into your README
        </h2>
        <span
          className="font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          Flywheel
        </span>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-[var(--radius-sm)] border px-5 py-4"
        style={{ background: "var(--bg-2)", borderColor: "var(--border)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeUrl}
          alt={`try it · ${owner}/${repo}`}
          width={112}
          height={20}
          style={{ imageRendering: "crisp-edges" }}
        />
        <span className="font-mono text-[11.5px]" style={{ color: "var(--fg-mute)" }}>
          ← preview
        </span>
      </div>

      <label
        className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em]"
        style={{ color: "var(--fg-mute)" }}
      >
        Markdown
      </label>
      <div className="flex gap-2">
        <code
          className="flex-1 overflow-x-auto whitespace-nowrap rounded-[var(--radius-sm)] border px-3 py-2 font-mono text-[12.5px]"
          style={{ background: "var(--bg-2)", borderColor: "var(--border)", color: "var(--fg)" }}
        >
          {snippet}
        </code>
        <button className="btn btn-ghost btn-sm" onClick={copy} type="button">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>

      <p className="m-0 mt-4 text-[12.5px]" style={{ color: "var(--fg-dim)" }}>
        Each click earns you <b style={{ color: "var(--accent)", fontWeight: 500 }}>$0.02 USDC</b>.
        Settles on-chain within 15 seconds.
      </p>
    </section>
  );
}
