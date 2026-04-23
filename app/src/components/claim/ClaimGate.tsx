"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "wallet" | "verify" | "done";

const STEPS: { key: Step; label: string; blurb: string }[] = [
  {
    key: "wallet",
    label: "Link payout wallet",
    blurb: "The Base address that gets 40% of every try.",
  },
  {
    key: "verify",
    label: "Prove repo ownership",
    blurb: "Drop a per-repo verification token at the root of main.",
  },
];

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export function ClaimGate({ owner, repo }: { owner: string; repo: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("wallet");
  const [wallet, setWallet] = useState("0x7fda686db7f49f2f057d5d617122a03349b83a40");
  const [walletErr, setWalletErr] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [issuingToken, setIssuingToken] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  const advanceToVerify = useCallback(async () => {
    if (!WALLET_RE.test(wallet)) {
      setWalletErr("That doesn't look like a Base wallet address (0x… 40 hex chars).");
      return;
    }
    setWalletErr(null);
    setStep("verify");
    setIssuingToken(true);
    try {
      const res = await fetch(`/api/claim/${owner}/${repo}/challenge`, { method: "POST" });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setVerifyErr(data.error ?? "Could not issue challenge");
        return;
      }
      setToken(data.token);
    } catch (e) {
      setVerifyErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setIssuingToken(false);
    }
  }, [wallet, owner, repo]);

  const checkRepo = useCallback(async () => {
    setChecking(true);
    setVerifyErr(null);
    try {
      const res = await fetch(`/api/claim/${owner}/${repo}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) {
        setVerifyErr(data.message ?? data.error ?? "Verification failed");
        return;
      }
      setStep("done");
    } catch (e) {
      setVerifyErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setChecking(false);
    }
  }, [owner, repo, wallet]);

  useEffect(() => {
    if (step !== "done") return;
    const t = window.setTimeout(() => router.push(`/dashboard?owner=${owner}`), 1500);
    return () => window.clearTimeout(t);
  }, [step, router, owner]);

  return (
    <section className="glass-card overflow-hidden">
      <header
        className="flex items-center justify-between border-b px-5 py-4"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <div>
          <div
            className="font-mono text-[11px] uppercase tracking-[0.1em]"
            style={{ color: "var(--fg-mute)" }}
          >
            Claim · file-in-repo verification
          </div>
          <div className="mt-0.5 text-[15px]" style={{ color: "var(--fg)" }}>
            <span style={{ color: "var(--fg-mute)" }}>{owner} /</span>{" "}
            <span>{repo}</span>
          </div>
        </div>
        <Link
          href={`/${owner}/${repo}`}
          className="font-mono text-[12px] no-underline transition-colors hover:text-[var(--fg)]"
          style={{ color: "var(--fg-mute)" }}
        >
          boot it instead →
        </Link>
      </header>

      <ol className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
        {STEPS.map((s, i) => {
          const done = (step === "verify" && i < 1) || step === "done";
          const active = step === s.key && step !== "done";

          return (
            <li
              key={s.key}
              className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-start"
              style={{
                borderBottom: "1px solid var(--border-soft)",
                background: active ? "rgba(255,255,255,0.015)" : "transparent",
              }}
            >
              <div className="flex w-full items-start gap-3 sm:w-[260px] sm:shrink-0">
                <span
                  className="mt-0.5 inline-grid h-6 w-6 place-items-center rounded-full border font-mono text-[11px]"
                  aria-hidden="true"
                  style={{
                    background: done
                      ? "var(--ok)"
                      : active
                        ? "var(--accent)"
                        : "var(--bg-2)",
                    borderColor: done
                      ? "var(--ok)"
                      : active
                        ? "var(--accent)"
                        : "var(--border)",
                    color: done
                      ? "#051b0c"
                      : active
                        ? "#140805"
                        : "var(--fg-mute)",
                  }}
                >
                  {done ? "✓" : i + 1}
                </span>
                <div>
                  <div
                    className="text-[14px] font-medium tracking-[-0.005em]"
                    style={{ color: active || done ? "var(--fg)" : "var(--fg-dim)" }}
                  >
                    {s.label}
                  </div>
                  <div className="mt-0.5 text-[12.5px]" style={{ color: "var(--fg-mute)" }}>
                    {s.blurb}
                  </div>
                </div>
              </div>

              <div className="flex-1">
                {s.key === "wallet" && (
                  <StepWallet
                    active={active}
                    done={done}
                    value={wallet}
                    err={walletErr}
                    onChange={setWallet}
                    onSubmit={advanceToVerify}
                  />
                )}
                {s.key === "verify" && (
                  <StepVerify
                    active={active}
                    done={done}
                    owner={owner}
                    repo={repo}
                    token={token}
                    issuingToken={issuingToken}
                    checking={checking}
                    err={verifyErr}
                    onCheck={checkRepo}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {step === "done" && (
        <div
          className="flex items-center justify-between gap-3 px-5 py-4 font-mono text-[12.5px]"
          style={{
            background: "rgba(74, 222, 128, 0.06)",
            color: "var(--ok)",
            borderTop: "1px solid rgba(74, 222, 128, 0.2)",
          }}
          role="status"
        >
          <span>✓ claim complete · forwarding to dashboard</span>
          <Link
            href={`/dashboard?owner=${owner}`}
            className="no-underline"
            style={{ color: "inherit" }}
          >
            go now →
          </Link>
        </div>
      )}
    </section>
  );
}

function StepWallet({
  active,
  done,
  value,
  err,
  onChange,
  onSubmit,
}: {
  active: boolean;
  done: boolean;
  value: string;
  err: string | null;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  if (done)
    return (
      <code className="font-mono text-[12.5px]" style={{ color: "var(--fg-dim)" }}>
        {value.slice(0, 6)}…{value.slice(-4)}
      </code>
    );
  if (!active)
    return (
      <span className="font-mono text-[12.5px]" style={{ color: "var(--fg-mute)" }}>
        waiting…
      </span>
    );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        className="t-input font-mono text-[12.5px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        placeholder="0x…"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={onSubmit}>
          Continue →
        </button>
        <span className="font-mono text-[12px]" style={{ color: "var(--fg-mute)" }}>
          40% of every try · Base USDC
        </span>
      </div>
      {err && (
        <p className="m-0 font-mono text-[12.5px]" role="alert" style={{ color: "var(--err)" }}>
          {err}
        </p>
      )}
    </div>
  );
}

function StepVerify({
  active,
  done,
  owner,
  repo,
  token,
  issuingToken,
  checking,
  err,
  onCheck,
}: {
  active: boolean;
  done: boolean;
  owner: string;
  repo: string;
  token: string | null;
  issuingToken: boolean;
  checking: boolean;
  err: string | null;
  onCheck: () => void;
}) {
  if (done)
    return (
      <code className="font-mono text-[12.5px]" style={{ color: "var(--fg-dim)" }}>
        verified · file found at root
      </code>
    );
  if (!active)
    return (
      <span className="font-mono text-[12.5px]" style={{ color: "var(--fg-mute)" }}>
        waiting…
      </span>
    );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div
          className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          Commit this file to your repo root (default branch)
        </div>
        <pre
          className="m-0 overflow-x-auto rounded-[var(--radius-sm)] border px-3 py-2 font-mono text-[12px]"
          style={{ background: "var(--bg-2)", borderColor: "var(--border)", color: "var(--fg)" }}
        >{`# tryit-verify.txt
${issuingToken ? "issuing challenge…" : token ?? "—"}`}</pre>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onCheck}
          disabled={checking || !token}
          aria-busy={checking}
        >
          {checking
            ? `Checking github.com/${owner}/${repo}…`
            : "I've committed it · check now"}
        </button>
        <a
          href={`https://github.com/${owner}/${repo}/new/main?filename=tryit-verify.txt&value=${encodeURIComponent(token ?? "")}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[12px] no-underline transition-colors hover:text-[var(--fg)]"
          style={{ color: "var(--fg-dim)" }}
        >
          open commit-composer on github ↗
        </a>
      </div>
      {err && (
        <p className="m-0 font-mono text-[12.5px]" role="alert" style={{ color: "var(--err)" }}>
          {err}
        </p>
      )}
    </div>
  );
}
