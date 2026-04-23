import type { NextRequest } from "next/server";
import { confirmTry } from "@/lib/checkout/confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await confirmTry(id);
  if (result.kind === "not-found") {
    return Response.json({ error: "not-found" }, { status: 404 });
  }
  if (result.kind === "error") {
    return Response.json({ error: "checkout-poll-failed", message: result.message }, { status: 502 });
  }
  return Response.json({ status: result.status, tryId: id });
}
