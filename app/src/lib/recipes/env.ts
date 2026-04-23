export function parseEnvExample(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) continue;
    out[key] = safeValue(key, value);
  }
  return out;
}

function safeValue(key: string, value: string): string {
  const k = key.toLowerCase();
  if (!value) return defaultFor(k);
  if (looksSecret(k)) return defaultFor(k);
  return value;
}

function looksSecret(k: string): boolean {
  return (
    /secret|password|token|api[_-]?key|private[_-]?key|credential|bearer/.test(
      k,
    ) && !/public|pub/.test(k)
  );
}

function defaultFor(k: string): string {
  if (k.includes("database_url")) return "postgres://tryit:tryit@db:5432/tryit";
  if (k.includes("redis_url")) return "redis://redis:6379";
  if (k.includes("port")) return "3000";
  return "tryit-placeholder";
}

export function detectNeedsPostgres(
  tree: { path: string }[],
  envDefaults: Record<string, string>,
): boolean {
  const pathHit = tree.some((e) => {
    const p = e.path.toLowerCase();
    return (
      p === "prisma/schema.prisma" ||
      p === "alembic.ini" ||
      p.startsWith("migrations/") ||
      p.startsWith("db/migrations/") ||
      p.startsWith("prisma/migrations/")
    );
  });
  if (pathHit) return true;
  return Object.keys(envDefaults).some((k) => k.toUpperCase().includes("DATABASE_URL"));
}
