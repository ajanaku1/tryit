import type { Payout } from "@/lib/dashboard/types";

export function PayoutsTable({ payouts }: { payouts: Payout[] }) {
  return (
    <section
      className="glass-card overflow-hidden"
      aria-label="Recent payouts"
    >
      <header
        className="flex items-center justify-between border-b px-5 py-3.5"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <div className="flex items-center gap-3">
          <h2
            className="m-0 text-[14px] font-medium tracking-[-0.005em]"
            style={{ color: "var(--fg)" }}
          >
            Recent payouts
          </h2>
          <span className="chip-live">
            <span className="dot" aria-hidden="true" />
            live
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-label="Export payouts as CSV"
        >
          Export CSV
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="t-table">
          <thead>
            <tr>
              <th>Repo</th>
              <th>Trier</th>
              <th>Amount</th>
              <th>Tx</th>
              <th className="text-right">When</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td style={{ color: "var(--fg)" }}>
                  <span style={{ color: "var(--fg-mute)" }}>
                    {p.repo.split("/")[0]} /
                  </span>{" "}
                  <span>{p.repo.split("/")[1]}</span>
                </td>
                <td className="font-mono text-[12.5px]" style={{ color: "var(--fg-dim)" }}>
                  {p.trier}
                </td>
                <td style={{ color: "var(--ok)" }}>{p.amount}</td>
                <td>
                  <a
                    href={`https://basescan.org/tx/${p.tx}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[12.5px] no-underline transition-colors"
                    style={{ color: "var(--fg-dim)" }}
                  >
                    {p.tx} ↗
                  </a>
                </td>
                <td
                  className="text-right font-mono text-[12px]"
                  style={{ color: "var(--fg-mute)" }}
                >
                  {p.at}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
