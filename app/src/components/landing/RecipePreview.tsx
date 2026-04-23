"use client";

type Recipe = {
  ownerSlug: string;
  repoSlug: string;
  sha: string;
  runtime: string;
  buildCmd?: string;
  startCmd: string;
  port: number;
  needsPostgres: boolean;
  envDefaults: Record<string, string>;
  dockerfileInline: string;
  confidence: "high" | "medium" | "low";
  source: string;
};

function redactSecretish(key: string, value: string): string {
  if (/secret|password|token|api[_-]?key|private[_-]?key|credential|bearer/i.test(key)) {
    return value ? `${value.slice(0, 3)}…(redacted)` : "(empty)";
  }
  return value || "(empty)";
}

export function RecipePreview({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const entries = Object.entries(recipe.envDefaults).filter(
    ([k]) => !["PORT", "HOST"].includes(k),
  );

  return (
    <section
      aria-label="Agent recipe preview"
      className="glass-card mt-4 max-w-[720px] p-5"
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div
            className="mb-1 font-mono text-[11px] uppercase tracking-[0.1em]"
            style={{ color: "var(--fg-mute)" }}
          >
            Agent preview · no charge
          </div>
          <h3 className="m-0 text-[16px] font-medium tracking-[-0.01em]" style={{ color: "var(--fg)" }}>
            <span style={{ color: "var(--fg-mute)" }}>{recipe.ownerSlug} /</span>{" "}
            <span>{recipe.repoSlug}</span>
            <span
              className="ml-2 font-mono text-[11px]"
              style={{ color: "var(--fg-dim)" }}
            >
              @ {recipe.sha.slice(0, 7)}
            </span>
          </h3>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          aria-label="Close preview"
        >
          close
        </button>
      </header>

      <div className="mb-4 flex flex-wrap gap-2 text-[12px]">
        <span className="chip">
          runtime: <b className="ml-1">{recipe.runtime}</b>
        </span>
        <span className="chip">
          port: <b className="ml-1">{recipe.port}</b>
        </span>
        <span className="chip">
          confidence: <b className="ml-1">{recipe.confidence}</b>
        </span>
        <span className="chip" style={{ color: "var(--fg-mute)" }}>
          source: {recipe.source}
        </span>
        {recipe.needsPostgres && (
          <span className="chip" style={{ color: "var(--accent)" }}>
            needs postgres
          </span>
        )}
      </div>

      <div className="mb-4">
        <div
          className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          start command
        </div>
        <code
          className="block overflow-x-auto rounded-[var(--radius-sm)] border px-3 py-2 font-mono text-[12.5px]"
          style={{
            background: "var(--bg-2)",
            borderColor: "var(--border)",
            color: "var(--fg)",
          }}
        >
          {recipe.startCmd}
        </code>
      </div>

      {recipe.buildCmd && (
        <div className="mb-4">
          <div
            className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
            style={{ color: "var(--fg-mute)" }}
          >
            build command
          </div>
          <code
            className="block overflow-x-auto rounded-[var(--radius-sm)] border px-3 py-2 font-mono text-[12.5px]"
            style={{
              background: "var(--bg-2)",
              borderColor: "var(--border)",
              color: "var(--fg)",
            }}
          >
            {recipe.buildCmd}
          </code>
        </div>
      )}

      <div className="mb-4">
        <div
          className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          <span>Dockerfile ({recipe.dockerfileInline.split("\n").length} lines)</span>
          <button
            type="button"
            className="text-[10.5px] no-underline hover:text-[var(--fg)]"
            onClick={() => void navigator.clipboard?.writeText(recipe.dockerfileInline)}
            style={{ color: "var(--fg-dim)" }}
          >
            copy
          </button>
        </div>
        <pre
          className="m-0 max-h-[340px] overflow-auto rounded-[var(--radius-sm)] border p-3 font-mono text-[12px] leading-[1.55]"
          style={{
            background: "var(--bg-2)",
            borderColor: "var(--border)",
            color: "var(--fg)",
          }}
        >
          {recipe.dockerfileInline}
        </pre>
      </div>

      {entries.length > 0 && (
        <div className="mb-2">
          <div
            className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
            style={{ color: "var(--fg-mute)" }}
          >
            env defaults ({entries.length})
          </div>
          <ul className="flex flex-col gap-1 font-mono text-[12px]">
            {entries.map(([k, v]) => (
              <li key={k}>
                <span style={{ color: "var(--fg-mute)" }}>{k}</span>
                <span className="mx-1.5" style={{ color: "var(--fg-dim)" }}>
                  =
                </span>
                <span style={{ color: "var(--fg)" }}>{redactSecretish(k, v)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="m-0 mt-4 text-[12.5px]" style={{ color: "var(--fg-dim)" }}>
        This is what the agent hands to BuildWithLocus. Click <b>Boot it</b> to pay $0.05 and
        actually deploy. Preview is free — no USDC charged.
      </p>
    </section>
  );
}
