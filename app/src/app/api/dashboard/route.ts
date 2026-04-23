import type { NextRequest } from "next/server";
import {
  getRepo,
  listOwnership,
  listPayouts,
  getOwner,
} from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const login = new URL(req.url).searchParams.get("owner");
  if (!login) {
    return Response.json({ error: "owner query param required" }, { status: 400 });
  }

  const [owner, ownership, payouts] = await Promise.all([
    getOwner(login),
    listOwnership(login),
    listPayouts(login),
  ]);

  const repos = await Promise.all(
    ownership.map(async (o) => {
      const r = await getRepo(o.repoSlug);
      return {
        slug: o.repoSlug,
        tries: r?.totalTries ?? 0,
        earned: (r?.totalEarnedUsdc ?? 0).toFixed(2),
      };
    }),
  );

  const earnedAll = payouts.reduce((s, p) => s + p.amountUsdc, 0);
  const confirmed = payouts.filter((p) => p.status === "confirmed");

  return Response.json({
    owner: owner
      ? {
          login: owner.githubLogin,
          walletAddress: owner.locusWalletAddress,
          payoutSharePct: owner.payoutSharePct,
          verifiedAt: owner.verifiedAt,
        }
      : null,
    repos,
    payouts: payouts.slice(0, 50),
    metrics: {
      earnedAll: `$${earnedAll.toFixed(2)}`,
      tries: repos.reduce((s, r) => s + r.tries, 0),
      paidCount: confirmed.length,
    },
  });
}
