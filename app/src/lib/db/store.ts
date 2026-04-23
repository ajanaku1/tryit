import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Recipe } from "@/lib/recipes";
import type {
  DbState,
  OwnerRow,
  PayoutRow,
  RecipeRow,
  RepoOwnership,
  RepoRow,
  TryRow,
} from "./schema";

const DB_PATH = process.env.TRYIT_DB_PATH ?? "/tmp/tryit-db.json";

declare global {
  var __tryit_db__: { state: DbState; writing: Promise<void> } | undefined;
}

function emptyState(): DbState {
  return {
    tries: {},
    repos: {},
    owners: {},
    payouts: {},
    ownership: [],
    recipes: {},
  };
}

async function loadFromDisk(): Promise<DbState> {
  try {
    const raw = await readFile(DB_PATH, "utf8");
    return { ...emptyState(), ...(JSON.parse(raw) as Partial<DbState>) };
  } catch {
    return emptyState();
  }
}

async function ensureLoaded(): Promise<DbState> {
  if (!globalThis.__tryit_db__) {
    const state = await loadFromDisk();
    globalThis.__tryit_db__ = { state, writing: Promise.resolve() };
  }
  return globalThis.__tryit_db__.state;
}

async function persist(): Promise<void> {
  const holder = globalThis.__tryit_db__;
  if (!holder) return;
  const snapshot = JSON.stringify(holder.state);
  holder.writing = holder.writing.then(async () => {
    await mkdir(dirname(DB_PATH), { recursive: true });
    await writeFile(DB_PATH, snapshot, "utf8");
  });
  return holder.writing;
}

export async function getTry(id: string): Promise<TryRow | null> {
  const s = await ensureLoaded();
  return s.tries[id] ?? null;
}

export async function upsertTry(row: TryRow): Promise<TryRow> {
  const s = await ensureLoaded();
  s.tries[row.id] = row;
  await persist();
  return row;
}

export async function patchTry(
  id: string,
  patch: Partial<TryRow>,
): Promise<TryRow | null> {
  const s = await ensureLoaded();
  const cur = s.tries[id];
  if (!cur) return null;
  const next: TryRow = { ...cur, ...patch };
  s.tries[id] = next;
  await persist();
  return next;
}

export async function listRecentTries(limit = 20): Promise<TryRow[]> {
  const s = await ensureLoaded();
  return Object.values(s.tries)
    .sort((a, b) => (b.bootedAt ?? "").localeCompare(a.bootedAt ?? ""))
    .slice(0, limit);
}

export async function getRepo(slug: string): Promise<RepoRow | null> {
  const s = await ensureLoaded();
  return s.repos[slug] ?? null;
}

export async function upsertRepo(row: RepoRow): Promise<RepoRow> {
  const s = await ensureLoaded();
  s.repos[row.slug] = row;
  await persist();
  return row;
}

export async function bumpRepoStats(
  slug: string,
  defaultBranch: string,
  earnedDelta: number,
): Promise<RepoRow> {
  const s = await ensureLoaded();
  const cur = s.repos[slug] ?? {
    slug,
    defaultBranch,
    totalTries: 0,
    totalEarnedUsdc: 0,
    lastTriedAt: null,
  };
  const next: RepoRow = {
    ...cur,
    defaultBranch: cur.defaultBranch || defaultBranch,
    totalTries: cur.totalTries + 1,
    totalEarnedUsdc: cur.totalEarnedUsdc + earnedDelta,
    lastTriedAt: new Date().toISOString(),
  };
  s.repos[slug] = next;
  await persist();
  return next;
}

export async function getOwner(login: string): Promise<OwnerRow | null> {
  const s = await ensureLoaded();
  return s.owners[login] ?? null;
}

export async function upsertOwner(row: OwnerRow): Promise<OwnerRow> {
  const s = await ensureLoaded();
  s.owners[row.githubLogin] = row;
  await persist();
  return row;
}

export async function listOwnership(login: string): Promise<RepoOwnership[]> {
  const s = await ensureLoaded();
  return s.ownership.filter((o) => o.ownerGithubLogin === login);
}

export async function addOwnership(row: RepoOwnership): Promise<void> {
  const s = await ensureLoaded();
  if (s.ownership.some((o) => o.repoSlug === row.repoSlug)) return;
  s.ownership.push(row);
  await persist();
}

export async function ownerForRepo(slug: string): Promise<string | null> {
  const s = await ensureLoaded();
  return s.ownership.find((o) => o.repoSlug === slug)?.ownerGithubLogin ?? null;
}

export async function listPayouts(login: string): Promise<PayoutRow[]> {
  const s = await ensureLoaded();
  return Object.values(s.payouts)
    .filter((p) => p.ownerGithubLogin === login)
    .sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? ""));
}

export async function upsertPayout(row: PayoutRow): Promise<PayoutRow> {
  const s = await ensureLoaded();
  s.payouts[row.id] = row;
  await persist();
  return row;
}

export async function getCachedRecipe(
  sha: string,
): Promise<RecipeRow | null> {
  const s = await ensureLoaded();
  return s.recipes[sha] ?? null;
}

export async function saveRecipe(recipe: Recipe): Promise<RecipeRow> {
  const s = await ensureLoaded();
  const row: RecipeRow = {
    sha: recipe.sha,
    repoSlug: `${recipe.ownerSlug}/${recipe.repoSlug}`,
    recipe,
    cachedAt: new Date().toISOString(),
  };
  s.recipes[recipe.sha] = row;
  await persist();
  return row;
}
