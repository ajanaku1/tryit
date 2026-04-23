import type { NextRequest } from "next/server";
import { pay as locusPay } from "@/lib/locus";
import { runBoot } from "@/lib/boot/orchestrator";
import { upsertTry } from "@/lib/db/store";
import { isSafeSlug, newTryId, parseRepoInput, ipHash } from "@/lib/util/slug";
import { take } from "@/lib/util/rate";
import { buildRecipe, UnsupportedRepoError } from "@/lib/recipes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRY_COST_USDC = 0.05;
const USE_MOCK = process.env.LOCUS_MOCK === "1";

type Body = {
  repo?: string;
  owner?: string;
  repoSlug?: string;
  walletAddress?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;

  const parsed = body.repo
    ? parseRepoInput(body.repo)
    : body.owner && body.repoSlug && isSafeSlug(body.owner) && isSafeSlug(body.repoSlug)
      ? { owner: body.owner, repo: body.repoSlug }
      : null;

  if (!parsed) {
    return Response.json(
      { error: "bad-input", message: "Provide { repo: 'owner/name' } or a GitHub URL." },
      { status: 400 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const anonKey = `anon:${ipHash(ip)}`;
  const anonCap = process.env.NODE_ENV === "production" ? 10 : 60;
  const verdictAnon = take(anonKey, anonCap, 60 * 60 * 1000);
  if (!verdictAnon.allowed) {
    return Response.json(
      {
        error: "rate-limited",
        message: `Rate-limited: ${anonCap} tries/hour per IP. Try again in ${Math.ceil(verdictAnon.resetMs / 60000)} min.`,
        retryAfterMs: verdictAnon.resetMs,
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil(verdictAnon.resetMs / 1000)) } },
    );
  }

  const tryId = newTryId();
  const slug = `${parsed.owner}/${parsed.repo}`;

  try {
    await buildRecipe({ ownerSlug: parsed.owner, repoSlug: parsed.repo });
  } catch (err) {
    if (err instanceof UnsupportedRepoError) {
      return Response.json(
        {
          error: "unsupported-repo",
          message: `${slug} isn't a stack TryIt can boot yet. Supported: Next.js, FastAPI, static sites. No charge made.`,
        },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "recipe-preflight-failed", message: `Couldn't inspect ${slug}: ${message}` },
      { status: 502 },
    );
  }

  let checkout: Awaited<ReturnType<typeof locusPay.createCheckoutSession>> | null = null;
  if (USE_MOCK) {
    checkout = null;
  } else {
    try {
      checkout = await locusPay.createCheckoutSession({
        amount: TRY_COST_USDC,
        memo: `tryit · boot ${slug}`,
        metadata: { tryId, repoSlug: slug },
        successUrl: `${new URL(req.url).origin}/try/${tryId}?paid=1`,
        cancelUrl: `${new URL(req.url).origin}/?cancel=${tryId}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[tryit] checkout create failed:", message);
      return Response.json(
        {
          error: "checkout-unavailable",
          message: "Couldn't reach Locus to open a checkout session. No charge made. Please try again in a moment.",
        },
        { status: 502 },
      );
    }
  }

  await upsertTry({
    id: tryId,
    repoSlug: slug,
    sha: null,
    ownerLogin: null,
    locusCheckoutId: checkout?.id ?? null,
    status: checkout ? "pending-payment" : "paid",
    bootedAt: null,
    expiresAt: null,
    containerUrl: null,
    costUsdc: TRY_COST_USDC,
    paidUsdc: checkout ? 0 : TRY_COST_USDC,
    cached: false,
    locusServiceId: null,
    locusDeploymentId: null,
    ipHash: ipHash(ip),
    walletAddress: body.walletAddress ?? null,
    errorMessage: null,
  });

  if (USE_MOCK) {
    runBoot({ tryId, ownerSlug: parsed.owner, repoSlug: parsed.repo });
  }

  return Response.json({
    tryId,
    repoSlug: slug,
    checkoutUrl: checkout?.checkoutUrl ?? null,
    checkoutId: checkout?.id ?? null,
    status: checkout ? "pending-payment" : "paid",
  });
}
