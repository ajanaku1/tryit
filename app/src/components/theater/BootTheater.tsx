"use client";

import { useEffect, useRef, useState } from "react";
import {
  STAGE_ORDER,
  type LogLine,
  type Stage,
} from "@/lib/boot/stages";
import { ProgressRail } from "./ProgressRail";
import { LogPanel } from "./LogPanel";
import { ReadyCard } from "./ReadyCard";

type BootTheaterProps = {
  id: string;
  owner: string;
  repo: string;
  cached?: boolean;
  initialStatus?: string;
  initialUrl?: string | null;
  initialExpiresAt?: string | null;
  initialError?: string | null;
};

type BootEvent =
  | { type: "log"; line: string; stage: ServerStage; at: number }
  | { type: "stage"; stage: ServerStage; at: number }
  | { type: "ready"; url: string; expiresAt: string; at: number }
  | { type: "error"; message: string; at: number }
  | { type: "end"; at: number };

type ServerStage =
  | "queued"
  | "fetch"
  | "fingerprint"
  | "cache"
  | "build"
  | "deploy"
  | "ready"
  | "failed";

const SERVER_TO_UI: Record<ServerStage, Stage> = {
  queued: "fetch",
  fetch: "fetch",
  fingerprint: "detect",
  cache: "detect",
  build: "build",
  deploy: "boot",
  ready: "ready",
  failed: "ready",
};

export function BootTheater(props: BootTheaterProps) {
  return (
    <BootTheaterInner
      key={`${props.id}|${props.owner}|${props.repo}|${props.cached ? 1 : 0}`}
      {...props}
    />
  );
}

function BootTheaterInner({
  id,
  owner,
  repo,
  cached = false,
  initialStatus,
  initialUrl,
  initialExpiresAt,
  initialError,
}: BootTheaterProps) {
  const isTerminal = initialStatus === "ready" || initialStatus === "failed" || initialStatus === "expired";
  const [streamed, setStreamed] = useState<LogLine[]>([]);
  const [stage, setStage] = useState<Stage>(
    initialStatus === "ready" ? "ready" : "fetch",
  );
  const [ready, setReady] = useState<{ url: string; expiresAt: string } | null>(
    initialStatus === "ready" && initialUrl
      ? { url: initialUrl, expiresAt: initialExpiresAt ?? new Date(Date.now() + 20 * 60 * 1000).toISOString() }
      : null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(
    initialStatus === "failed" ? initialError ?? "Boot failed." : null,
  );
  const t0 = useRef(Date.now());

  useEffect(() => {
    if (isTerminal) return;

    let source: EventSource | null = null;
    let cancelled = false;

    const pushLog = (text: string, kind?: LogLine["kind"]) => {
      const t = Date.now() - t0.current;
      setStreamed((prev) => [...prev, { t, text, kind }]);
    };

    const tryLive = () => {
      source = new EventSource(`/api/boot/${id}`);
      source.onmessage = (ev) => {
        const data = JSON.parse(ev.data) as BootEvent;
        handle(data);
      };
      source.onerror = () => {
        if (cancelled) return;
        source?.close();
      };
    };

    const handle = (e: BootEvent) => {
      if (cancelled) return;
      if (e.type === "stage") {
        setStage(SERVER_TO_UI[e.stage]);
      } else if (e.type === "log") {
        setStage(SERVER_TO_UI[e.stage]);
        pushLog(e.line, kindForStage(e.stage));
      } else if (e.type === "ready") {
        setReady({ url: e.url, expiresAt: e.expiresAt });
        setStage("ready");
        pushLog(`✓ ready`, "ok");
      } else if (e.type === "error") {
        setErrorMsg(e.message);
        pushLog(`error: ${e.message}`, "err");
      } else if (e.type === "end") {
        source?.close();
      }
    };

    tryLive();

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [id, isTerminal]);

  const stageIdx = STAGE_ORDER.indexOf(stage);
  const pct = Math.round(((stageIdx + (ready ? 1 : 0.4)) / STAGE_ORDER.length) * 100);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div
            className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
            style={{ color: "var(--fg-mute)" }}
          >
            Session · {id} · {errorMsg ? "failed" : ready ? "ready" : "live stream"}
          </div>
          <h1
            className="m-0 text-[26px] font-medium tracking-[-0.02em]"
            style={{ color: "var(--fg)" }}
          >
            Booting{" "}
            <span style={{ color: "var(--fg-mute)" }}>{owner} /</span>{" "}
            <span>{repo}</span>
            {cached && (
              <span
                className="chip ml-3 align-middle"
                style={{ color: "var(--accent)" }}
              >
                cached · ~8s
              </span>
            )}
          </h1>
          <p
            className="m-0 mt-1 text-[13.5px]"
            style={{ color: "var(--fg-dim)" }}
          >
            {ready
              ? "Container is live. Twenty minutes on the clock."
              : errorMsg
                ? `Boot failed — ${errorMsg}`
                : "Reading the repo, synthesizing an image, booting on BuildWithLocus."}
          </p>
        </div>

        <div
          className="rounded-[var(--radius-sm)] border px-3 py-1.5 font-mono text-[11.5px]"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--fg-dim)",
          }}
        >
          {pct}% · stage {stageIdx + 1}/{STAGE_ORDER.length}
        </div>
      </header>

      <ProgressRail current={stage} />

      <LogPanel lines={streamed} />

      {ready ? (
        <ReadyCard
          tryId={id}
          owner={owner}
          repo={repo}
          url={ready.url}
          expiresAt={ready.expiresAt}
        />
      ) : (
        <p
          className="m-0 font-mono text-[12px]"
          style={{ color: "var(--fg-mute)" }}
        >
          {errorMsg ?? "Live URL will appear below when the container is healthy."}
        </p>
      )}
    </div>
  );
}

function kindForStage(s: ServerStage): LogLine["kind"] {
  if (s === "ready") return "ok";
  if (s === "failed") return "err";
  if (s === "build" || s === "deploy") return "dim";
  return "accent";
}
