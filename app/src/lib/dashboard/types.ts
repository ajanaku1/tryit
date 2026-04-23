export type Payout = {
  id: string;
  repo: string;
  trier: string;
  amount: string;
  tx: string;
  at: string;
};

export type DashboardData = {
  owner: string;
  repos: { slug: string; tries: number; earned: string }[];
  metrics: {
    triesToday: number;
    triesWeek: number;
    earnedWeek: string;
    earnedTotal: string;
    avgTtl: string;
    cacheHit: string;
  };
  payouts: Payout[];
};
