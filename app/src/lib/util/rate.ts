declare global {
  var __tryit_rate__: Map<string, number[]> | undefined;
}

function bucket(): Map<string, number[]> {
  if (!globalThis.__tryit_rate__) globalThis.__tryit_rate__ = new Map();
  return globalThis.__tryit_rate__;
}

export type RateVerdict = { allowed: boolean; remaining: number; resetMs: number };

export function take(
  key: string,
  limit: number,
  windowMs: number,
): RateVerdict {
  const now = Date.now();
  const map = bucket();
  const hits = (map.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const oldest = hits[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, windowMs - (now - oldest)),
    };
  }
  hits.push(now);
  map.set(key, hits);
  return { allowed: true, remaining: limit - hits.length, resetMs: windowMs };
}
