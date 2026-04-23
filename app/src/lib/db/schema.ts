import type { Recipe } from "@/lib/recipes";

export type TryRow = {
  id: string;
  repoSlug: string;
  sha: string | null;
  ownerLogin: string | null;
  locusCheckoutId: string | null;
  status:
    | "pending-payment"
    | "paid"
    | "fingerprinting"
    | "building"
    | "deploying"
    | "ready"
    | "expired"
    | "failed";
  bootedAt: string | null;
  expiresAt: string | null;
  containerUrl: string | null;
  costUsdc: number;
  paidUsdc: number;
  cached: boolean;
  locusServiceId: string | null;
  locusDeploymentId: string | null;
  ipHash: string | null;
  walletAddress: string | null;
  errorMessage: string | null;
};

export type RepoRow = {
  slug: string;
  defaultBranch: string;
  totalTries: number;
  totalEarnedUsdc: number;
  lastTriedAt: string | null;
};

export type OwnerRow = {
  githubLogin: string;
  locusWalletAddress: string;
  verifiedAt: string;
  payoutSharePct: number;
};

export type PayoutRow = {
  id: string;
  ownerGithubLogin: string;
  tryId: string;
  amountUsdc: number;
  txHash: string | null;
  status: "queued" | "confirmed" | "failed";
  settledAt: string | null;
};

export type RepoOwnership = {
  repoSlug: string;
  ownerGithubLogin: string;
};

export type RecipeRow = { sha: string; repoSlug: string; recipe: Recipe; cachedAt: string };

export type DbState = {
  tries: Record<string, TryRow>;
  repos: Record<string, RepoRow>;
  owners: Record<string, OwnerRow>;
  payouts: Record<string, PayoutRow>;
  ownership: RepoOwnership[];
  recipes: Record<string, RecipeRow>;
};
