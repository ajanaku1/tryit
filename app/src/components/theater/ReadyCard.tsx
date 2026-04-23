"use client";

import { useCallback, useEffect, useState } from "react";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function fmtRemaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${pad(m)}:${pad(r)}`;
}

export function ReadyCard({
  tryId,
  owner,
  repo,
  url,
  expiresAt,
  ttlMs: ttlMsProp,
}: {
  tryId?: string;
  owner: string;
  repo: string;
  url?: string;
  expiresAt?: string;
  ttlMs?: number;
}) {
  const liveUrl =
    url ?? `https://svc-${shortId(`${owner}/${repo}`)}.buildwithlocus.com`;
  const ttlMs =
    ttlMsProp ??
    (expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : 20 * 60 * 1000);
  const [remaining, setRemaining] = useState(ttlMs);
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const deadline = expiresAt ? new Date(expiresAt).getTime() : Date.now() + ttlMs;
    const id = setInterval(() => {
      const left = deadline - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [ttlMs, expiresAt]);

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(liveUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }, [liveUrl]);

  const report = useCallback(async () => {
    if (!tryId) return;
    const reason = window.prompt(
      "Why is this session abusive? (Spam, crypto-miner, illegal content, etc.)",
    );
    if (!reason) return;
    setReporting(true);
    try {
      await fetch(`/api/report/${tryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      setReported(true);
    } finally {
      setReporting(false);
    }
  }, [tryId]);

  const pct = (remaining / ttlMs) * 100;
  const expiring = remaining < 2 * 60 * 1000;

  return (
    <section
      aria-label="Running session"
      className="glass-card overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <div className="flex items-center gap-3">
          <span className="chip-live">
            <span className="dot" aria-hidden="true" />
            LIVE
          </span>
          <span className="text-[14px]" style={{ color: "var(--fg-dim)" }}>
            <span style={{ color: "var(--fg-mute)" }}>{owner} /</span>{" "}
            <span style={{ color: "var(--fg)" }}>{repo}</span>
          </span>
        </div>
        <div
          className="font-mono text-[12px]"
          style={{ color: expiring ? "var(--warn)" : "var(--fg-dim)" }}
          aria-live="polite"
        >
          TTL · <b style={{ fontWeight: 500 }}>{fmtRemaining(remaining)}</b> remaining
        </div>
      </div>

      <div
        aria-hidden="true"
        className="h-[2px] w-full"
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`,
          transition: "background 1s linear",
        }}
      />

      <div className="p-5">
        <label
          className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          Session URL
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <code
            className="flex-1 truncate rounded-[var(--radius-sm)] border px-3 py-2 font-mono text-[13px]"
            style={{
              background: "var(--bg-2)",
              borderColor: "var(--border)",
              color: "var(--fg)",
            }}
          >
            {liveUrl}
          </code>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-sm"
          >
            Open ↗
          </a>
        </div>

        <div
          className="mt-4 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <Stat label="You paid" value="$0.05 USDC" />
          <Stat label="Author earns" value={<span style={{ color: "var(--accent)" }}>$0.02</span>} />
          <Stat label="Extend 10 min" value={<button className="font-medium" style={{ color: "var(--fg)" }}>+$0.02 →</button>} />
        </div>

        {tryId && (
          <div
            className="mt-4 flex items-center justify-between gap-3 border-t pt-3 font-mono text-[11.5px]"
            style={{ borderColor: "var(--border-soft)", color: "var(--fg-mute)" }}
          >
            <span>
              see something abusive? containers are killed within 60s of a
              verified report.
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={report}
              disabled={reporting || reported}
              style={{ color: reported ? "var(--ok)" : "var(--err)" }}
            >
              {reported ? "reported ✓" : reporting ? "killing…" : "report + kill"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div
        className="font-mono text-[10.5px] uppercase tracking-[0.1em]"
        style={{ color: "var(--fg-mute)" }}
      >
        {label}
      </div>
      <div className="mt-1 text-[14px]" style={{ color: "var(--fg)" }}>
        {value}
      </div>
    </div>
  );
}

function shortId(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 6);
}
