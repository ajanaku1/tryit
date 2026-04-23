import { pay as locusPay } from "@/lib/locus";
import { runBoot } from "@/lib/boot/orchestrator";
import { getTry, patchTry } from "@/lib/db/store";
import type { TryRow } from "@/lib/db/schema";

export type ConfirmResult =
  | { kind: "not-found" }
  | { kind: "no-op"; status: TryRow["status"] }
  | { kind: "advanced"; status: TryRow["status"] }
  | { kind: "error"; message: string };

export async function confirmTry(id: string): Promise<ConfirmResult> {
  const row = await getTry(id);
  if (!row) return { kind: "not-found" };
  if (row.status !== "pending-payment") return { kind: "no-op", status: row.status };
  if (!row.locusCheckoutId) return { kind: "no-op", status: row.status };

  try {
    const session = await locusPay.getCheckoutSession(row.locusCheckoutId);
    if (session.status !== "PAID") return { kind: "no-op", status: row.status };
    await patchTry(id, { status: "paid", paidUsdc: row.costUsdc });
    const [owner, repo] = row.repoSlug.split("/");
    runBoot({ tryId: id, ownerSlug: owner, repoSlug: repo });
    return { kind: "advanced", status: "paid" };
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
}
