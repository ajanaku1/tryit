"use client";

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

const GITHUB_SLUG_RE = /^([a-zA-Z0-9-]+)\/([a-zA-Z0-9._-]+)$/;

function parseRepo(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/^github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
  const m = GITHUB_SLUG_RE.exec(trimmed);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

type Phase = "idle" | "preflight" | "awaiting-payment" | "confirming" | "redirecting";

export function PasteCard({ initial = "vercel/ai-chatbot" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopPolling();
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
  }, [stopPolling]);

  const pollPayment = useCallback(
    (tryId: string, parsed: { owner: string; repo: string }) => {
      stopPolling();
      pollRef.current = window.setInterval(async () => {
        if (popupRef.current?.closed) {
          stopPolling();
          setPhase("idle");
          setErr("Checkout window closed before payment completed. Click Boot it again to retry.");
          return;
        }
        try {
          const res = await fetch(`/api/checkout/${tryId}`, { cache: "no-store" });
          const data = (await res.json()) as { status?: string };
          if (data.status && data.status !== "pending-payment") {
            stopPolling();
            setPhase("redirecting");
            if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
            router.push(`/try/${tryId}?owner=${parsed.owner}&repo=${parsed.repo}&paid=1`);
          }
        } catch {
          /* transient — keep polling */
        }
      }, 2000);
    },
    [router, stopPolling],
  );

  const submit = useCallback(async () => {
    const parsed = parseRepo(value);
    if (!parsed) {
      setErr("That doesn't look like a GitHub repo. Try `owner/name`.");
      return;
    }
    setErr(null);
    setPhase("preflight");

    const popup = window.open(
      "about:blank",
      "locus-checkout",
      "width=540,height=760,noopener=no",
    );
    popupRef.current = popup;
    if (popup) {
      popup.document.title = "TryIt · checking repo…";
      popup.document.body.style.cssText =
        "background:#0a0a0a;color:#e5e5e5;font:14px/1.5 ui-monospace,monospace;padding:32px;";
      popup.document.body.textContent =
        "Asking the agent to read your repo… this usually takes 10–20 seconds. If you close this window, the request is cancelled — no charge.";
    }

    try {
      const res = await fetch("/api/try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: `${parsed.owner}/${parsed.repo}` }),
      });

      if (popupRef.current?.closed) {
        setPhase("idle");
        setErr("You closed the checkout window before preflight finished. No charge made.");
        return;
      }

      const data = (await res.json()) as {
        tryId?: string;
        checkoutUrl?: string | null;
        error?: string;
        message?: string;
        status?: string;
      };
      if (!res.ok || !data.tryId) {
        if (popup && !popup.closed) popup.close();
        setPhase("idle");
        setErr(data.message ?? data.error ?? "Something went wrong.");
        return;
      }
      if (!data.checkoutUrl) {
        if (popup && !popup.closed) popup.close();
        router.push(`/try/${data.tryId}?owner=${parsed.owner}&repo=${parsed.repo}`);
        return;
      }
      if (popupRef.current?.closed) {
        setPhase("idle");
        setErr("You closed the checkout window before preflight finished. No charge made.");
        return;
      }
      popupRef.current!.location.href = data.checkoutUrl;
      setPhase("awaiting-payment");
      pollPayment(data.tryId, parsed);
    } catch (e) {
      if (popup && !popup.closed) popup.close();
      setPhase("idle");
      setErr(e instanceof Error ? e.message : "Network error");
    }
  }, [value, router, pollPayment]);

  const pending = phase !== "idle";

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || ((e.metaKey || e.ctrlKey) && e.key === "Enter")) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="glass-card max-w-[540px] p-5">
      <div className="mb-3 flex items-center justify-between">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          Repository
        </span>
        <span
          className="font-mono text-[12px]"
          style={{ color: "var(--fg-dim)" }}
        >
          <b style={{ color: "var(--fg)", fontWeight: 500 }}>$0.05 USDC</b> · 20-min TTL
        </span>
      </div>

      <label className="paste-input-row" aria-label="GitHub repository slug">
        <span className="prefix">github.com/</span>
        <input
          type="url"
          className="t-input font-mono text-[15px]"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (err) setErr(null);
          }}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          placeholder="owner/name"
          disabled={pending}
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: "var(--fg-mute)" }}
        >
          <span className="kbd">⌘</span>
          <span className="kbd">↵</span>
          <span>to boot</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={pending}
          aria-busy={pending}
        >
          {phase === "idle"
            ? "Boot it →"
            : phase === "preflight"
              ? "Checking repo…"
              : phase === "awaiting-payment"
                ? "Paying in popup…"
                : phase === "confirming"
                  ? "Confirming…"
                  : "Opening boot…"}
        </button>
      </div>

      {phase === "awaiting-payment" && (
        <p className="mt-3 font-mono text-[12.5px]" style={{ color: "var(--fg-mute)" }}>
          Complete the $0.05 USDC payment in the popup. This page auto-resumes when Locus confirms — no redirect needed.
        </p>
      )}

      {err && (
        <p
          className="mt-3 font-mono text-[12.5px]"
          role="alert"
          style={{ color: "var(--err)" }}
        >
          {err}
        </p>
      )}
    </div>
  );
}
