import Link from "next/link";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { PayoutsTable } from "@/components/dashboard/PayoutsTable";
import { BadgeCard } from "@/components/dashboard/BadgeCard";
import {
  getOwner,
  getRepo,
  listOwnership,
  listPayouts,
} from "@/lib/db/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const { owner: ownerQuery } = await searchParams;
  const login = ownerQuery ?? "";

  const data = await loadDashboard(login);

  if (!data) return <DashboardEmptyState login={login} />;

  const primaryRepo = data.repos[0];
  const [owner, repo] = (primaryRepo?.slug ?? "").split("/");

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div
            className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
            style={{ color: "var(--fg-mute)" }}
          >
            Owner · authed as {data.ownerLogin}
          </div>
          <h1
            className="m-0 text-[28px] font-medium tracking-[-0.02em]"
            style={{ color: "var(--fg)" }}
          >
            Tail of stars,{" "}
            <span style={{ color: "var(--accent)" }}>{data.metrics.earnedWeek}</span>{" "}
            this week.
          </h1>
          <p className="m-0 mt-1 text-[14px]" style={{ color: "var(--fg-dim)" }}>
            {data.repos.length} claimed repos · {data.metrics.triesWeek} tries this week · wallet{" "}
            <span className="font-mono">
              {data.walletShort}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          <Link href={`/${owner}/${repo}`} className="btn btn-ghost btn-sm">
            View live feed
          </Link>
          <button type="button" className="btn btn-primary btn-sm">
            Withdraw to wallet
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <MetricCards metrics={data.metrics} />

        <section aria-label="Claimed repos">
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="m-0 text-[14px] font-medium tracking-[-0.005em]"
              style={{ color: "var(--fg)" }}
            >
              Claimed repos
            </h2>
            <Link
              href={login ? `/claim/${login}/new` : "/"}
              className="font-mono text-[12px] no-underline transition-colors hover:text-[var(--fg)]"
              style={{ color: "var(--fg-dim)" }}
            >
              + claim another
            </Link>
          </div>
          <div className="glass-card overflow-hidden">
            <table className="t-table">
              <thead>
                <tr>
                  <th>Repo</th>
                  <th className="text-right">Tries</th>
                  <th className="text-right">Earned</th>
                  <th className="text-right">Badge</th>
                </tr>
              </thead>
              <tbody>
                {data.repos.map((r) => {
                  const [o, n] = r.slug.split("/");
                  return (
                    <tr key={r.slug}>
                      <td style={{ color: "var(--fg)" }}>
                        <Link
                          href={`/${o}/${n}`}
                          className="no-underline"
                          style={{ color: "inherit" }}
                        >
                          <span style={{ color: "var(--fg-mute)" }}>{o} /</span>{" "}
                          <span>{n}</span>
                        </Link>
                      </td>
                      <td
                        className="text-right font-mono tabular-nums"
                        style={{ color: "var(--fg-dim)" }}
                      >
                        {r.tries.toLocaleString()}
                      </td>
                      <td
                        className="text-right font-mono tabular-nums"
                        style={{ color: "var(--ok)" }}
                      >
                        {r.earned}
                      </td>
                      <td className="text-right">
                        <code
                          className="font-mono text-[11.5px]"
                          style={{ color: "var(--fg-mute)" }}
                        >
                          /badge/{r.slug}.svg
                        </code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <PayoutsTable payouts={data.payouts} />
          <BadgeCard owner={owner} repo={repo} />
        </div>
      </div>
    </main>
  );
}

async function loadDashboard(login: string) {
  if (!login) return null;
  const [ownerRow, ownership, payouts] = await Promise.all([
    getOwner(login),
    listOwnership(login),
    listPayouts(login),
  ]);
  if (!ownerRow || ownership.length === 0) return null;

  const repos = await Promise.all(
    ownership.map(async (o) => {
      const r = await getRepo(o.repoSlug);
      return {
        slug: o.repoSlug,
        tries: r?.totalTries ?? 0,
        earned: `$${(r?.totalEarnedUsdc ?? 0).toFixed(2)}`,
      };
    }),
  );

  const earnedWeek = payouts
    .filter((p) => p.status === "confirmed")
    .reduce((s, p) => s + p.amountUsdc, 0);

  return {
    ownerLogin: login,
    walletShort: `${ownerRow.locusWalletAddress.slice(0, 6)}…${ownerRow.locusWalletAddress.slice(-4)}`,
    repos,
    payouts: payouts.map((p) => ({
      id: p.id,
      repo: "—",
      trier: "—",
      amount: `+$${p.amountUsdc.toFixed(2)}`,
      tx: p.txHash ? `${p.txHash.slice(0, 8)}…${p.txHash.slice(-4)}` : "—",
      at: p.settledAt ? new Date(p.settledAt).toLocaleTimeString() : "—",
    })),
    metrics: {
      triesToday: repos.reduce((s, r) => s + r.tries, 0),
      triesWeek: repos.reduce((s, r) => s + r.tries, 0),
      earnedWeek: `$${earnedWeek.toFixed(2)}`,
      earnedTotal: `$${payouts.reduce((s, p) => s + p.amountUsdc, 0).toFixed(2)}`,
      avgTtl: "20m 00s",
      cacheHit: "—",
    },
  };
}

function DashboardEmptyState({ login }: { login: string }) {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8">
        <div
          className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          Owner dashboard
        </div>
        <h1
          className="m-0 text-[28px] font-medium tracking-[-0.02em]"
          style={{ color: "var(--fg)" }}
        >
          {login ? `No claimed repos for ${login} yet.` : "No owner selected."}
        </h1>
        <p className="m-0 mt-2 text-[14px]" style={{ color: "var(--fg-dim)" }}>
          {login
            ? "Claim a repo to start earning $0.02 USDC for every try."
            : "Add ?owner=<github-login> to the URL, or claim a repo to populate the dashboard."}
        </p>
      </header>
      <div className="flex gap-2">
        <Link href="/claim" className="btn btn-primary btn-sm">
          Claim a repo
        </Link>
        <Link href="/" className="btn btn-ghost btn-sm">
          Back to landing
        </Link>
      </div>
    </main>
  );
}
