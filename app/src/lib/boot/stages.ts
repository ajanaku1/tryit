export type LogLine = {
  t: number;
  text: string;
  kind?: "ok" | "warn" | "err" | "dim" | "accent";
};

export type Stage = "fetch" | "detect" | "build" | "boot" | "ready";

export const STAGE_LABELS: Record<Stage, string> = {
  fetch: "Fetching tree",
  detect: "Detecting stack",
  build: "Building image",
  boot: "Booting container",
  ready: "Ready",
};

export const STAGE_ORDER: Stage[] = ["fetch", "detect", "build", "boot", "ready"];
