import { STAGE_LABELS, STAGE_ORDER, type Stage } from "@/lib/boot/stages";

export function ProgressRail({ current }: { current: Stage }) {
  const currentIdx = STAGE_ORDER.indexOf(current);

  return (
    <ol
      aria-label="Boot progress"
      className="progress-rail flex-wrap gap-y-2 sm:flex-nowrap"
    >
      {STAGE_ORDER.map((stage, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "active" : "";
        return (
          <li key={stage} className="contents">
            <div
              className={`progress-step ${state}`}
              aria-current={state === "active" ? "step" : undefined}
            >
              <span className="step-num" aria-hidden="true">
                {state === "done" ? "✓" : i + 1}
              </span>
              <span>{STAGE_LABELS[stage]}</span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <span className="progress-connector hidden sm:block" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
