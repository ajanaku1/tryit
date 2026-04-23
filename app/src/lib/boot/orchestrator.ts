import { build as locusBuild } from "@/lib/locus";
import type { Deployment } from "@/lib/locus/build";
import { buildRecipe, UnsupportedRepoError } from "@/lib/recipes";
import {
  bumpRepoStats,
  getCachedRecipe,
  ownerForRepo,
  patchTry,
  saveRecipe,
  upsertPayout,
} from "@/lib/db/store";
import type { BootStage } from "./bus";
import { emitBoot } from "./bus";
import { isAbusiveStartCmd } from "@/lib/recipes/blocklist";
import { payOwnerCut } from "./payouts";

const TTL_MINUTES = 20;
const USE_MOCK = process.env.LOCUS_MOCK === "1";

type StartInput = {
  tryId: string;
  ownerSlug: string;
  repoSlug: string;
};

export function runBoot(input: StartInput): void {
  void execute(input).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] ${input.tryId} failed:`, err);
    emitBoot(input.tryId, { type: "error", message, at: Date.now() });
    emitBoot(input.tryId, { type: "end", at: Date.now() });
    void patchTry(input.tryId, { status: "failed", errorMessage: message });
  });
}

async function execute({ tryId, ownerSlug, repoSlug }: StartInput): Promise<void> {
  const slug = `${ownerSlug}/${repoSlug}`;
  const start = Date.now();

  emitStage(tryId, "fetch");
  emitLog(tryId, "fetch", `resolving ${slug}@HEAD via github api`);

  emitStage(tryId, "fingerprint");
  const recipe = await buildRecipe({ ownerSlug, repoSlug });
  if (isAbusiveStartCmd(recipe.startCmd)) {
    throw new Error("recipe rejected: blocklist match");
  }
  emitLog(
    tryId,
    "fingerprint",
    `detected ${recipe.source} · runtime=${recipe.runtime} · port=${recipe.port} · confidence=${recipe.confidence}`,
  );
  if (recipe.needsPostgres) {
    emitLog(tryId, "fingerprint", "repo declares a Postgres dependency — skipping addon provisioning; service will start with envDefaults only");
  }

  const cached = await getCachedRecipe(recipe.sha);
  const fromCache = Boolean(cached);
  emitStage(tryId, "cache");
  emitLog(
    tryId,
    "cache",
    fromCache
      ? `recipe cache hit · sha ${recipe.sha.slice(0, 7)} · skipping build`
      : `recipe cache miss · sha ${recipe.sha.slice(0, 7)} · building fresh`,
  );
  if (!fromCache) await saveRecipe(recipe);

  await patchTry(tryId, {
    sha: recipe.sha,
    status: "building",
    cached: fromCache,
  });

  emitStage(tryId, "build");
  emitLog(tryId, "build", `synthesizing Dockerfile (${recipe.dockerfileInline.split("\n").length} lines)`);
  emitLog(tryId, "build", "handing off to BuildWithLocus");

  let service: Awaited<ReturnType<typeof locusBuild.fromRepo>>;
  try {
    if (USE_MOCK) {
      service = mockFromRepo(slug);
    } else {
      service = await locusBuild.fromRepo({
        repo: slug,
        branch: recipe.sha,
        projectName: `tryit-${tryId.slice(0, 6)}`,
        port: recipe.port,
        startCommand: recipe.startCmd,
        env: recipe.envDefaults,
      });
    }
  } catch (err) {
    if (err instanceof UnsupportedRepoError) throw err;
    throw new Error(
      `BuildWithLocus provisioning failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  emitLog(tryId, "build", `service created → ${service.serviceId}`);
  await patchTry(tryId, {
    status: "deploying",
    locusServiceId: service.serviceId,
    locusDeploymentId: service.deploymentId,
    containerUrl: service.serviceUrl,
  });

  emitStage(tryId, "deploy");
  emitLog(tryId, "deploy", `deployment ${service.deploymentId.slice(0, 12)} · polling status`);

  const deployment = await pollDeployment(service.deploymentId, tryId, fromCache);
  if (deployment.status !== "healthy") {
    throw new Error(`deployment ${deployment.status}: ${deployment.lastLogs?.slice(-3).join(" | ")}`);
  }

  const bootedAt = new Date();
  const expiresAt = new Date(bootedAt.getTime() + TTL_MINUTES * 60 * 1000);
  emitStage(tryId, "ready");
  emitLog(
    tryId,
    "ready",
    `✓ ready in ${((Date.now() - start) / 1000).toFixed(1)}s · live for ${TTL_MINUTES} min`,
  );
  emitBoot(tryId, {
    type: "ready",
    url: service.serviceUrl,
    expiresAt: expiresAt.toISOString(),
    at: Date.now(),
  });

  await patchTry(tryId, {
    status: "ready",
    bootedAt: bootedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    containerUrl: service.serviceUrl,
  });

  await bumpRepoStats(slug, recipe.sha, 0.02);
  await firePayoutIfClaimed({ tryId, repoSlug: slug });

  scheduleTeardown(tryId, service.serviceId, expiresAt);
  emitBoot(tryId, { type: "end", at: Date.now() });
}

function emitStage(tryId: string, stage: BootStage): void {
  emitBoot(tryId, { type: "stage", stage, at: Date.now() });
}

function emitLog(tryId: string, stage: BootStage, line: string): void {
  emitBoot(tryId, { type: "log", line, stage, at: Date.now() });
}

async function pollDeployment(
  id: string,
  tryId: string,
  fromCache: boolean,
): Promise<Deployment> {
  if (USE_MOCK) return mockPoll(id, tryId, fromCache);
  const deadline = Date.now() + 7 * 60 * 1000;
  let lastStatus = "";
  while (Date.now() < deadline) {
    const dep = await locusBuild.getDeployment(id);
    if (dep.status !== lastStatus) {
      emitLog(tryId, dep.status === "building" ? "build" : "deploy", `status=${dep.status}`);
      lastStatus = dep.status;
    }
    if (["healthy", "failed", "cancelled", "rolled_back"].includes(dep.status)) return dep;
    await sleep(fromCache ? 3000 : 8000);
  }
  throw new Error("deployment poll timeout after 7 minutes");
}

function scheduleTeardown(tryId: string, serviceId: string, expiresAt: Date): void {
  const wait = Math.max(0, expiresAt.getTime() - Date.now());
  setTimeout(() => {
    void teardown(tryId, serviceId);
  }, wait).unref?.();
}

async function teardown(tryId: string, serviceId: string): Promise<void> {
  try {
    if (!USE_MOCK) await locusBuild.deleteService(serviceId);
    await patchTry(tryId, { status: "expired" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await patchTry(tryId, { status: "expired", errorMessage: `teardown: ${message}` });
  }
}

async function firePayoutIfClaimed(opts: { tryId: string; repoSlug: string }): Promise<void> {
  const login = await ownerForRepo(opts.repoSlug);
  if (!login) return;
  try {
    const payout = await payOwnerCut({
      ownerLogin: login,
      tryId: opts.tryId,
      amount: 0.02,
    });
    await upsertPayout(payout);
    emitLog(
      opts.tryId,
      "ready",
      `payout queued: ${payout.amountUsdc} USDC → ${login}${payout.txHash ? ` (tx ${payout.txHash.slice(0, 10)}…)` : ""}`,
    );
  } catch (err) {
    emitLog(
      opts.tryId,
      "ready",
      `payout deferred: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function mockFromRepo(slug: string): Awaited<ReturnType<typeof locusBuild.fromRepo>> {
  const id = `svc_mock_${Math.random().toString(36).slice(2, 10)}`;
  return {
    projectId: `proj_mock_${Math.random().toString(36).slice(2, 8)}`,
    environmentId: `env_mock_${Math.random().toString(36).slice(2, 8)}`,
    serviceId: id,
    serviceUrl: `https://${id.replace(/_/g, "-")}.buildwithlocus.com`,
    deploymentId: `deploy_mock_${Math.random().toString(36).slice(2, 8)}`,
  };
}

async function mockPoll(
  _id: string,
  tryId: string,
  fromCache: boolean,
): Promise<Deployment> {
  const steps: Array<[BootStage, string, number]> = fromCache
    ? [
        ["deploy", "pulling cached image layers", 800],
        ["deploy", "container started · warming", 1500],
      ]
    : [
        ["build", "pulling base image · node:24-alpine", 1500],
        ["build", "installing dependencies · 481 packages", 4000],
        ["build", "running build script", 5000],
        ["deploy", "pushing image to registry", 1500],
        ["deploy", "container started · health-check", 3000],
      ];
  for (const [stage, line, delay] of steps) {
    await sleep(delay);
    emitLog(tryId, stage, line);
  }
  return { id: _id, serviceId: "svc_mock", status: "healthy", durationMs: 10000 };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
