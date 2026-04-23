import { EventEmitter } from "node:events";

export type BootStage =
  | "queued"
  | "fetch"
  | "fingerprint"
  | "cache"
  | "build"
  | "deploy"
  | "ready"
  | "failed";

export type BootEvent =
  | { type: "log"; line: string; stage: BootStage; at: number }
  | { type: "stage"; stage: BootStage; at: number }
  | { type: "ready"; url: string; expiresAt: string; at: number }
  | { type: "error"; message: string; at: number }
  | { type: "end"; at: number };

type HistoryEntry = { events: BootEvent[]; emitter: EventEmitter; closed: boolean };

declare global {
  var __tryit_bus__: Map<string, HistoryEntry> | undefined;
}

function store(): Map<string, HistoryEntry> {
  if (!globalThis.__tryit_bus__) globalThis.__tryit_bus__ = new Map();
  return globalThis.__tryit_bus__;
}

export function ensureChannel(id: string): HistoryEntry {
  const s = store();
  let entry = s.get(id);
  if (!entry) {
    entry = { events: [], emitter: new EventEmitter(), closed: false };
    entry.emitter.setMaxListeners(25);
    s.set(id, entry);
  }
  return entry;
}

export function emitBoot(id: string, event: BootEvent): void {
  const entry = ensureChannel(id);
  entry.events.push(event);
  entry.emitter.emit("event", event);
  if (event.type === "end") {
    entry.closed = true;
    entry.emitter.emit("end");
  }
}

export function subscribe(
  id: string,
  onEvent: (e: BootEvent) => void,
): { history: BootEvent[]; unsubscribe: () => void } {
  const entry = ensureChannel(id);
  entry.emitter.on("event", onEvent);
  return {
    history: [...entry.events],
    unsubscribe: () => entry.emitter.off("event", onEvent),
  };
}

export function isClosed(id: string): boolean {
  return ensureChannel(id).closed;
}
