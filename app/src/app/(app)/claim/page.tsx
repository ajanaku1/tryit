"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

const GITHUB_SLUG_RE = /^([a-zA-Z0-9-]+)\/([a-zA-Z0-9._-]+)$/;

function parseRepo(input: string): { owner: string; repo: string } | null {
  const trimmed = input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  const m = GITHUB_SLUG_RE.exec(trimmed);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

export default function ClaimIndexPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(() => {
    const parsed = parseRepo(value);
    if (!parsed) {
      setErr("That doesn't look like a GitHub repo. Try `owner/name`.");
      return;
    }
    router.push(`/claim/${parsed.owner}/${parsed.repo}`);
  }, [value, router]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-6">
        <div
          className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          Claim a repo
        </div>
        <h1
          className="m-0 text-[26px] font-medium tracking-[-0.02em]"
          style={{ color: "var(--fg)" }}
        >
          Which repo do you own?
        </h1>
        <p className="m-0 mt-1 text-[13.5px]" style={{ color: "var(--fg-dim)" }}>
          Every try of a claimed repo pays 40% to your Locus wallet. We verify with a file drop at root.
        </p>
      </header>

      <div className="glass-card max-w-[520px] p-5">
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
            placeholder="owner/name"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </label>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[12px]" style={{ color: "var(--fg-mute)" }}>
            SIWX + file-drop · ~2 min
          </span>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Claim it →
          </button>
        </div>

        {err && (
          <p className="mt-3 font-mono text-[12.5px]" role="alert" style={{ color: "var(--err)" }}>
            {err}
          </p>
        )}
      </div>
    </main>
  );
}
