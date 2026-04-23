import { listRecentTries } from "@/lib/db/store";

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return `${Math.max(1, Math.floor(diffMs / 1000))}s`;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h`;
  return `${Math.floor(diffMs / 86_400_000)}d`;
}

export async function LiveFeed() {
  const rows = (await listRecentTries(8)).filter(
    (t) => t.status === "ready" || t.status === "expired",
  );

  return (
    <aside
      className="glass-card relative overflow-hidden p-5"
      aria-label="Recently booted"
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 h-[260px] w-[260px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--accent-ring) 0%, transparent 70%)",
        }}
      />

      <h3
        className="mb-4 flex items-center gap-2 text-[13px] font-medium tracking-[-0.005em]"
        style={{ color: "var(--fg)" }}
      >
        <span className="chip-live text-[10.5px]">
          <span className="dot" aria-hidden="true" />
          {rows.length > 0 ? "LIVE" : "QUIET"}
        </span>
        {rows.length > 0 ? "Just booted" : "No boots yet"}
      </h3>

      {rows.length === 0 ? (
        <p className="m-0 text-[13px]" style={{ color: "var(--fg-dim)" }}>
          Be the first. Paste a repo on the left and you&apos;ll appear here in ~30 seconds.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {rows.map((t) => {
            const [owner, repo] = t.repoSlug.split("/");
            return (
              <li key={t.id}>
                <a
                  href={`/${owner}/${repo}`}
                  className="feed-row grid grid-cols-[1fr_auto] items-center rounded-[var(--radius-sm)] px-2.5 py-[9px] text-[13.5px] no-underline transition-colors"
                  style={{ color: "var(--fg)" }}
                >
                  <span>
                    <span style={{ color: "var(--fg-mute)" }}>{owner} /</span>{" "}
                    <span className="font-medium">{repo}</span>
                  </span>
                  <span className="flex items-center gap-2.5 font-mono text-[12px]">
                    <span style={{ color: "var(--ok)" }}>+$0.02</span>
                    <span style={{ color: "var(--fg-mute)" }}>
                      {relativeTime(t.bootedAt)}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
