"use client";

import { useEffect, useRef } from "react";
import type { LogLine } from "@/lib/boot/stages";

export function LogPanel({ lines }: { lines: LogLine[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div
      ref={ref}
      className="log-panel"
      role="log"
      aria-live="polite"
      aria-atomic="false"
    >
      {lines.map((line, i) => (
        <div key={i} className={line.kind ? `log-${line.kind}` : undefined}>
          {line.text}
        </div>
      ))}
      {lines.length === 0 && <div className="log-dim">waiting for stream…</div>}
    </div>
  );
}
