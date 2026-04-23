"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Phase = "confirming" | "paying" | "redirecting";

export function DeepLinkAutoBoot({ owner, repo }: { owner: string; repo: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("confirming");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase("confirming");
    const confirmTimer = window.setTimeout(() => setPhase("paying"), 700);

    (async () => {
      try {
        const res = await fetch("/api/try", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo: `${owner}/${repo}` }),
        });
        const data = (await res.json()) as {
          tryId?: string;
          checkoutUrl?: string | null;
          error?: string;
          message?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setErr(data.message ?? data.error ?? "Something went wrong.");
          return;
        }
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
        setPhase("redirecting");
        router.push(`/try/${data.tryId}?owner=${owner}&repo=${repo}&cached=1`);
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(confirmTimer);
    };
  }, [owner, repo, router]);

  const steps: Array<{ key: Phase; label: string }> = [
    { key: "confirming", label: "Confirming repo" },
    { key: "paying", label: "Charging $0.05 · PayWithLocus" },
    { key: "redirecting", label: "Queueing cached boot" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === phase);

  return (
    <section
      aria-live="polite"
      className="glass-card mx-auto w-full max-w-[520px] p-6"
    >
      <div
        className="mb-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.1em]"
        style={{ color: "var(--fg-mute)" }}
      >
        <span>Badge click · deep-link</span>
        <span className="chip-live">
          <span className="dot" aria-hidden="true" />
          cached
        </span>
      </div>

      <h1
        className="m-0 mb-1 text-[22px] font-medium tracking-[-0.02em]"
        style={{ color: "var(--fg)" }}
      >
        <span style={{ color: "var(--fg-mute)" }}>{owner} /</span>{" "}
        <span>{repo}</span>
      </h1>
      <p className="m-0 mb-5 text-[13.5px]" style={{ color: "var(--fg-dim)" }}>
        Boot lands in about eight seconds. You&apos;ll land on the live URL automatically.
      </p>

      <ul className="flex flex-col gap-2">
        {steps.map((s, i) => {
          const state = i < currentIdx ? "done" : i === currentIdx ? "active" : "pending";
          return (
            <li
              key={s.key}
              className="flex items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2 font-mono text-[12.5px]"
              style={{
                background: state === "active" ? "var(--bg-3)" : "var(--bg-2)",
                borderColor: state === "active" ? "var(--accent)" : "var(--border)",
                color:
                  state === "done"
                    ? "var(--ok)"
                    : state === "active"
                      ? "var(--fg)"
                      : "var(--fg-mute)",
                boxShadow: state === "active" ? "0 0 0 1px var(--accent-ring)" : undefined,
              }}
            >
              <span
                className="inline-grid h-4 w-4 place-items-center rounded-full border text-[10px]"
                style={{
                  background:
                    state === "done"
                      ? "var(--ok)"
                      : state === "active"
                        ? "var(--accent)"
                        : "var(--bg)",
                  borderColor:
                    state === "done"
                      ? "var(--ok)"
                      : state === "active"
                        ? "var(--accent)"
                        : "var(--border)",
                  color: state === "pending" ? "var(--fg-mute)" : "#140805",
                }}
                aria-hidden="true"
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              {s.label}
              {state === "active" && (
                <span className="ml-auto" style={{ color: "var(--fg-mute)" }}>
                  …
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {err && (
        <p
          role="alert"
          className="mt-3 font-mono text-[12.5px]"
          style={{ color: "var(--err)" }}
        >
          {err}
        </p>
      )}

      <div
        className="mt-5 border-t pt-4 text-[12.5px]"
        style={{ borderColor: "var(--border-soft)", color: "var(--fg-dim)" }}
      >
        <Link href="/" className="no-underline" style={{ color: "var(--fg-mute)" }}>
          ← cancel
        </Link>
        <span className="mx-2" style={{ color: "var(--fg-mute)" }}>
          ·
        </span>
        author earns <span style={{ color: "var(--accent)" }}>$0.02</span>
      </div>
    </section>
  );
}
