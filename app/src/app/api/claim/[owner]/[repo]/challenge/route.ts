import type { NextRequest } from "next/server";
import { issueChallenge } from "@/lib/claim/challenges";
import { isSafeSlug } from "@/lib/util/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  if (!isSafeSlug(owner) || !isSafeSlug(repo)) {
    return Response.json({ error: "bad-slug" }, { status: 400 });
  }
  const token = issueChallenge(`${owner}/${repo}`);
  return Response.json({
    token,
    fileName: "tryit-verify.txt",
    fileContent: token,
    instructions:
      "Commit a file named tryit-verify.txt at the root of the default branch containing the token above. Then call /verify.",
  });
}
