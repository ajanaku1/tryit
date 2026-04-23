import type { NextRequest } from "next/server";
import { getTry, patchTry } from "@/lib/db/store";
import { build as locusBuild } from "@/lib/locus";
import { emitBoot } from "@/lib/boot/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USE_MOCK = process.env.LOCUS_MOCK === "1";

type Body = { reason?: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tryId: string }> },
) {
  const { tryId } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;
  const row = await getTry(tryId);
  if (!row) return Response.json({ error: "not-found" }, { status: 404 });

  if (row.locusServiceId && !USE_MOCK) {
    try {
      await locusBuild.deleteService(row.locusServiceId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[tryit] report-kill delete failed for ${row.locusServiceId}:`, message);
    }
  }

  const reason = body.reason?.slice(0, 200) ?? "no-reason";
  await patchTry(tryId, {
    status: "expired",
    errorMessage: `killed by /report: ${reason}`,
  });

  emitBoot(tryId, {
    type: "error",
    message: `session killed by abuse report: ${reason}`,
    at: Date.now(),
  });
  emitBoot(tryId, { type: "end", at: Date.now() });

  return Response.json({ ok: true, tryId, action: "killed" });
}
