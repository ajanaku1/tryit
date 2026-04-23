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
      <span>beta · deploying on BuildWithLocus · us-east-1</span>
      <span className="chip-live">
        <span className="dot" aria-hidden="true" />
        Paygentic hackathon · Week 2
      </span>
    </div>
  );
}
