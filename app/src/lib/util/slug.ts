const SAFE_SLUG = /^[A-Za-z0-9._-]{1,100}$/;

export function isSafeSlug(s: string): boolean {
  return SAFE_SLUG.test(s);
}

export function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  const stripped = trimmed.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\.git$/, "");
  const parts = stripped.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo] = parts;
  if (!isSafeSlug(owner) || !isSafeSlug(repo)) return null;
  return { owner, repo };
}

export function newTryId(): string {
  return (
    "try_" +
    Math.random().toString(36).slice(2, 8) +
    Date.now().toString(36).slice(-4)
  );
}

export function ipHash(ip: string): string {
  let h = 2166136261;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
