import { assertSafeStartCmd } from "./blocklist";
import { detectNeedsPostgres, parseEnvExample } from "./env";
import {
  fetchFile,
  fetchTree,
  findFirst,
  hasPath,
  resolveRef,
  type TreeEntry,
} from "./github";
import {
  fastapiDockerfile,
  nextjsDockerfile,
  staticDockerfile,
} from "./templates";
import {
  UnsupportedRepoError,
  type Recipe,
  type RecipeConfidence,
  type RecipeInput,
} from "./types";
import { agentAvailable, buildRecipeWithAgent } from "./agent";

export async function buildRecipe(input: RecipeInput): Promise<Recipe> {
  if (agentAvailable()) {
    try {
      return await buildRecipeWithAgent(input);
    } catch (err) {
      if (err instanceof UnsupportedRepoError) throw err;
      console.warn(
        `[recipe-agent] fell back to heuristics for ${input.ownerSlug}/${input.repoSlug}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return buildRecipeFromHeuristics(input);
}

async function buildRecipeFromHeuristics(input: RecipeInput): Promise<Recipe> {
  const { ownerSlug, repoSlug } = input;
  const { headSha } = await resolveRef(ownerSlug, repoSlug, input.ref);
  const tree = await fetchTree(ownerSlug, repoSlug, headSha);

  const envPath = findFirst(tree, [".env.example", ".env.sample", ".env.template"]);
  const envRaw = envPath ? await fetchFile(ownerSlug, repoSlug, headSha, envPath) : null;
  const envDefaults = envRaw ? parseEnvExample(envRaw) : {};

  const next = await tryNext({ ownerSlug, repoSlug, sha: headSha, tree, envDefaults });
  if (next) return finish(next);

  const fastapi = await tryFastAPI({ ownerSlug, repoSlug, sha: headSha, tree, envDefaults });
  if (fastapi) return finish(fastapi);

  const staticSite = tryStatic({ ownerSlug, repoSlug, sha: headSha, tree, envDefaults });
  if (staticSite) return finish(staticSite);

  throw new UnsupportedRepoError(`${ownerSlug}/${repoSlug}`);
}

function finish(r: Recipe): Recipe {
  assertSafeStartCmd(r.startCmd);
  return r;
}

type StackCtx = {
  ownerSlug: string;
  repoSlug: string;
  sha: string;
  tree: TreeEntry[];
  envDefaults: Record<string, string>;
};

async function tryNext(ctx: StackCtx): Promise<Recipe | null> {
  const pkgPath = findFirst(ctx.tree, ["package.json"]);
  if (!pkgPath || pkgPath !== "package.json") return null;

  const raw = await fetchFile(ctx.ownerSlug, ctx.repoSlug, ctx.sha, pkgPath);
  if (!raw) return null;

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  if (!deps.next) return null;

  const scripts = pkg.scripts ?? {};
  const port = 8080;
  const buildCmd = scripts.build ? "npm run build" : "npx next build";
  const startCmd = scripts.start
    ? `npm run start -- -p ${port} -H 0.0.0.0`
    : `npx next start -p ${port} -H 0.0.0.0`;

  const hasLockfile = hasPath(ctx.tree, "package-lock.json");
  const needsPostgres = detectNeedsPostgres(ctx.tree, ctx.envDefaults);
  const confidence: RecipeConfidence = hasLockfile ? "high" : "medium";

  return {
    ownerSlug: ctx.ownerSlug,
    repoSlug: ctx.repoSlug,
    sha: ctx.sha,
    runtime: "node",
    buildCmd,
    startCmd,
    port,
    needsPostgres,
    envDefaults: { ...ctx.envDefaults, PORT: String(port), HOST: "0.0.0.0" },
    dockerfileInline: nextjsDockerfile({ buildCmd, startCmd, port, hasLockfile }),
    confidence,
    source: "heuristic-next",
  };
}

async function tryFastAPI(ctx: StackCtx): Promise<Recipe | null> {
  const reqPath = findFirst(ctx.tree, ["requirements.txt"]);
  const raw = reqPath ? await fetchFile(ctx.ownerSlug, ctx.repoSlug, ctx.sha, reqPath) : "";
  const reqLower = (raw ?? "").toLowerCase();
  const hasFastAPIInReqs = /(^|\n)\s*fastapi(\s|=|>|<|\[|$)/i.test(reqLower);

  let entry: { module: string; app: string } | null = null;
  if (hasFastAPIInReqs) {
    entry = await guessFastAPIEntry(ctx);
    if (!entry) entry = { module: "main", app: "app" };
  } else {
    entry = await guessFastAPIEntry(ctx);
    if (!entry) return null;
  }

  const port = 8080;
  const startCmd = `uvicorn ${entry.module}:${entry.app} --host 0.0.0.0 --port ${port}`;
  const hasRequirements = Boolean(reqPath);
  const needsPostgres = detectNeedsPostgres(ctx.tree, ctx.envDefaults);

  return {
    ownerSlug: ctx.ownerSlug,
    repoSlug: ctx.repoSlug,
    sha: ctx.sha,
    runtime: "python",
    startCmd,
    port,
    needsPostgres,
    envDefaults: { ...ctx.envDefaults, PORT: String(port), HOST: "0.0.0.0" },
    dockerfileInline: fastapiDockerfile({ startCmd, port, hasRequirements }),
    confidence: hasRequirements && hasFastAPIInReqs ? "high" : "medium",
    source: "heuristic-fastapi",
  };
}

const FASTAPI_CANDIDATES = ["main.py", "app.py", "app/main.py", "src/main.py", "api/main.py"];

async function guessFastAPIEntry(
  ctx: StackCtx,
): Promise<{ module: string; app: string } | null> {
  for (const candidate of FASTAPI_CANDIDATES) {
    if (!hasPath(ctx.tree, candidate)) continue;
    const body = await fetchFile(ctx.ownerSlug, ctx.repoSlug, ctx.sha, candidate);
    if (!body) continue;
    if (!/FastAPI\s*\(/.test(body)) continue;
    const m = body.match(/^([a-zA-Z_][\w]*)\s*=\s*FastAPI\s*\(/m);
    const app = m?.[1] ?? "app";
    const module = candidate.replace(/\.py$/, "").replace(/\//g, ".");
    return { module, app };
  }
  return null;
}

function tryStatic(ctx: StackCtx): Recipe | null {
  if (!hasPath(ctx.tree, "index.html")) return null;
  if (hasPath(ctx.tree, "package.json")) return null;

  const port = 8080;
  const startCmd = "nginx -g daemon off;";
  return {
    ownerSlug: ctx.ownerSlug,
    repoSlug: ctx.repoSlug,
    sha: ctx.sha,
    runtime: "static",
    startCmd,
    port,
    needsPostgres: false,
    envDefaults: ctx.envDefaults,
    dockerfileInline: staticDockerfile({ port }),
    confidence: "high",
    source: "heuristic-static",
  };
}

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};
