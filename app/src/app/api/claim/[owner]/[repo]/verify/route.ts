import type { NextRequest } from "next/server";
import { consumeChallenge, getChallenge } from "@/lib/claim/challenges";
import { fetchFile, resolveRef } from "@/lib/recipes/github";
import { addOwnership, ownerForRepo, upsertOwner } from "@/lib/db/store";
import { isSafeSlug } from "@/lib/util/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

type Body = { walletAddress?: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;

  if (!isSafeSlug(owner) || !isSafeSlug(repo)) {
    return Response.json({ error: "bad-slug" }, { status: 400 });
  }
  if (!body.walletAddress || !WALLET_RE.test(body.walletAddress)) {
    return Response.json(
      { error: "bad-wallet", message: "walletAddress must be a 0x… Base address." },
      { status: 400 },
    );
  }

  const slug = `${owner}/${repo}`;
  const existing = await ownerForRepo(slug);
  if (existing) {
    return Response.json(
      { error: "already-claimed", owner: existing },
      { status: 409 },
    );
  }

  const token = getChallenge(slug);
  if (!token) {
    return Response.json(
      { error: "no-challenge", message: "Issue a challenge first via POST /challenge." },
      { status: 400 },
    );
  }

  try {
    const { headSha } = await resolveRef(owner, repo);
    const raw = await fetchFile(owner, repo, headSha, "tryit-verify.txt");
    if (!raw || raw.trim() !== token) {
      return Response.json(
        {
          error: "verification-failed",
          message: "tryit-verify.txt not found at repo root, or contents don't match challenge.",
        },
        { status: 422 },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "github-fetch-failed", message }, { status: 502 });
  }

  await upsertOwner({
    githubLogin: owner,
    locusWalletAddress: body.walletAddress,
    verifiedAt: new Date().toISOString(),
    payoutSharePct: 40,
  });
  await addOwnership({ repoSlug: slug, ownerGithubLogin: owner });
  consumeChallenge(slug);

  return Response.json({ ok: true, ownerLogin: owner, repoSlug: slug });
}
