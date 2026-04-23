import { randomBytes } from "node:crypto";

type Entry = { token: string; issuedAt: number };

declare global {
  var __tryit_claims__: Map<string, Entry> | undefined;
}

function store(): Map<string, Entry> {
  if (!globalThis.__tryit_claims__) globalThis.__tryit_claims__ = new Map();
  return globalThis.__tryit_claims__;
}

const TTL_MS = 60 * 60 * 1000;

export function issueChallenge(slug: string): string {
  const token = `tryit-${randomBytes(16).toString("hex")}`;
  store().set(slug, { token, issuedAt: Date.now() });
  return token;
}

export function getChallenge(slug: string): string | null {
  const e = store().get(slug);
  if (!e) return null;
  if (Date.now() - e.issuedAt > TTL_MS) {
    store().delete(slug);
    return null;
  }
  return e.token;
}

export function consumeChallenge(slug: string): void {
  store().delete(slug);
}
