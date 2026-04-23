import type { NextRequest } from "next/server";
import { buildRecipe, UnsupportedRepoError } from "@/lib/recipes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_SLUG = /^[A-Za-z0-9._-]{1,100}$/;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const owner = url.searchParams.get("owner");
  const repo = url.searchParams.get("repo");
  const ref = url.searchParams.get("ref") ?? undefined;

  if (!owner || !repo || !SAFE_SLUG.test(owner) || !SAFE_SLUG.test(repo)) {
    return Response.json(
      { error: "owner and repo query params required (alphanumeric, ._-)" },
      { status: 400 },
    );
  }

  try {
    const recipe = await buildRecipe({ ownerSlug: owner, repoSlug: repo, ref });
    return Response.json(recipe, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof UnsupportedRepoError) {
      return Response.json(
        { error: "unsupported-stack", message: err.message, slug: err.slug },
        { status: 422 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "recipe-failed", message }, { status: 500 });
  }
}
