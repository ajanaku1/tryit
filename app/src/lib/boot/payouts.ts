import { pay as locusPay } from "@/lib/locus";
import { getOwner } from "@/lib/db/store";
import type { PayoutRow } from "@/lib/db/schema";

const USE_MOCK = process.env.LOCUS_MOCK === "1";

export async function payOwnerCut(opts: {
  ownerLogin: string;
  tryId: string;
  amount: number;
}): Promise<PayoutRow> {
  const owner = await getOwner(opts.ownerLogin);
  if (!owner) throw new Error(`owner ${opts.ownerLogin} has no linked wallet`);

  const id = `pay_${Math.random().toString(36).slice(2, 10)}`;
  if (USE_MOCK) {
    return {
      id,
      ownerGithubLogin: opts.ownerLogin,
      tryId: opts.tryId,
      amountUsdc: opts.amount,
      txHash: `0x${"m".repeat(40)}`,
      status: "confirmed",
      settledAt: new Date().toISOString(),
    };
  }

  const r = await locusPay.sendUsdc({
    to: owner.locusWalletAddress,
    amount: opts.amount,
    memo: `tryit:${opts.tryId}`,
  });
  return {
    id,
    ownerGithubLogin: opts.ownerLogin,
    tryId: opts.tryId,
    amountUsdc: opts.amount,
    txHash: r.txHash ?? null,
    status: r.status.toLowerCase().includes("confirm") ? "confirmed" : "queued",
    settledAt: new Date().toISOString(),
  };
}
