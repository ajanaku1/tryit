import { listRecentTries } from "@/lib/db/store";

export async function Bento() {
  const tries = await listRecentTries(1000);
  const completed = tries.filter((t) => t.status === "ready" || t.status === "expired");
  const paidToAuthors = completed.length * 0.02;
  const uniqueRepos = new Set(completed.map((t) => t.repoSlug)).size;

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 md:[grid-template-columns:1.4fr_1fr_1fr]">
      <article className="glass-card flex flex-col justify-between gap-3 p-5 min-h-[140px]">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          How it works
        </span>
        <div>
          <h4 className="mb-1.5 text-[17px] font-medium tracking-[-0.015em]">
            Paste. Pay. Run.
          </h4>
          <p className="m-0 text-[13.5px] leading-[1.5]" style={{ color: "var(--fg-dim)" }}>
            A Llama 3.3 agent reads the repo, writes a Dockerfile, and ships it to BuildWithLocus. You get a live URL for 20 minutes.
          </p>
        </div>
      </article>

      <article className="glass-card flex flex-col justify-between gap-3 p-5 min-h-[140px]">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          Owner split
        </span>
        <div>
          <h4 className="mb-1.5 text-[17px] font-medium tracking-[-0.015em]">
            Owners get <span style={{ color: "var(--accent)" }}>40%</span>
          </h4>
          <p className="m-0 text-[13.5px] leading-[1.5]" style={{ color: "var(--fg-dim)" }}>
            Claim your repo, drop a badge into the README, and every try becomes a micro-payout.
          </p>
        </div>
      </article>

      <article className="glass-card flex flex-col justify-between gap-3 p-5 min-h-[140px]">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          Paid to authors
        </span>
        <div>
          <div
            className="text-[28px] font-medium tabular-nums"
            style={{ letterSpacing: "-0.02em" }}
          >
            ${paidToAuthors.toFixed(2)}
            <span
              className="ml-1.5 text-[14px] font-normal"
              style={{ color: "var(--fg-mute)" }}
            >
              total
            </span>
          </div>
          <p className="m-0 mt-2 text-[13.5px] leading-[1.5]" style={{ color: "var(--fg-dim)" }}>
            {completed.length === 0
              ? "No tries yet — be the first."
              : `across ${uniqueRepos} repo${uniqueRepos === 1 ? "" : "s"} · ${completed.length} completed tries`}
          </p>
        </div>
      </article>
    </div>
  );
}
