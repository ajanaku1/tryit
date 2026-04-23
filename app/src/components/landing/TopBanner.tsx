export function TopBanner() {
  return (
    <div
      className="mb-6 flex items-center justify-between rounded-[var(--radius-sm)] border px-4 py-3 text-[13px]"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        color: "var(--fg-dim)",
      }}
    >
      <span>
        <b style={{ color: "var(--fg)", fontWeight: 500 }}>Heads up:</b> BuildWithLocus beta is returning 500s on <code style={{ fontFamily: "var(--font-mono)" }}>/v1/deployments</code> right now — paid boots may fail. <b>Preview recipe</b> still works (uses Groq + GitHub API only).
      </span>
      <span className="chip-live">
        <span className="dot" aria-hidden="true" />
        Paygentic · Week 2
      </span>
    </div>
  );
}
