import { getLocusApiKey, getPayBase } from "./auth";

export type CheckoutSession = {
  id: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  checkoutUrl: string;
  amount: string;
};

export type SendResult = {
  transactionId: string;
  status: string;
  txHash?: string;
};

async function call<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getLocusApiKey();
  const res = await fetch(`${getPayBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`locus-pay ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as T;
}

export async function getBalance(): Promise<{ balance: string; token: string }> {
  const r = await call<{ success: boolean; data: { balance: string; token: string } }>(
    "GET",
    "/pay/balance",
  );
  return r.data;
}

export async function sendUsdc(opts: {
  to: string;
  amount: number;
  memo: string;
}): Promise<SendResult> {
  const r = await call<{
    success: boolean;
    data: { transaction_id: string; status: string; tx_hash?: string };
  }>("POST", "/pay/send", {
    to_address: opts.to,
    amount: opts.amount,
    memo: opts.memo,
  });
  return {
    transactionId: r.data.transaction_id,
    status: r.data.status,
    txHash: r.data.tx_hash,
  };
}

export async function createCheckoutSession(opts: {
  amount: number;
  memo: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<CheckoutSession> {
  const r = await call<{
    success?: boolean;
    data?: { id: string; status: CheckoutSession["status"]; checkoutUrl: string; amount: string };
    id?: string;
    status?: CheckoutSession["status"];
    checkoutUrl?: string;
    amount?: string;
  }>("POST", "/checkout/sessions", {
    amount: String(opts.amount),
    memo: opts.memo,
    metadata: opts.metadata,
    successUrl: opts.successUrl,
    cancelUrl: opts.cancelUrl,
  });
  const d = r.data ?? {
    id: r.id!,
    status: r.status!,
    checkoutUrl: r.checkoutUrl!,
    amount: r.amount!,
  };
  return d;
}

export async function getCheckoutSession(id: string): Promise<CheckoutSession> {
  const r = await call<{
    success?: boolean;
    data?: { id: string; status: CheckoutSession["status"]; checkoutUrl: string; amount: string };
    id?: string;
    status?: CheckoutSession["status"];
    checkoutUrl?: string;
    amount?: string;
  }>("GET", `/checkout/sessions/${id}`);
  return (
    r.data ?? {
      id: r.id!,
      status: r.status!,
      checkoutUrl: r.checkoutUrl!,
      amount: r.amount!,
    }
  );
}
