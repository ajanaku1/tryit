import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

type LocusCreds = { api_key: string; api_base?: string };

let cached: LocusCreds | null = null;

async function readCredsFile(): Promise<LocusCreds | null> {
  const path = join(homedir(), ".config", "locus", "credentials.json");
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as LocusCreds;
  } catch {
    return null;
  }
}

export async function getLocusApiKey(): Promise<string> {
  if (cached?.api_key) return cached.api_key;
  const fromEnv = process.env.LOCUS_API_KEY?.trim();
  if (fromEnv) {
    cached = { api_key: fromEnv, api_base: process.env.LOCUS_PAY_API_BASE };
    return fromEnv;
  }
  const fromFile = await readCredsFile();
  if (fromFile?.api_key) {
    cached = fromFile;
    return fromFile.api_key;
  }
  throw new Error(
    "Locus API key missing — set LOCUS_API_KEY or populate ~/.config/locus/credentials.json",
  );
}

export function getBuildBase(): string {
  if (process.env.LOCUS_BUILD_API_BASE) return process.env.LOCUS_BUILD_API_BASE;
  const pay = cached?.api_base ?? process.env.LOCUS_PAY_API_BASE ?? "";
  return pay.includes("beta-api") || pay === ""
    ? "https://beta-api.buildwithlocus.com/v1"
    : "https://api.buildwithlocus.com/v1";
}

export function getPayBase(): string {
  return (
    process.env.LOCUS_PAY_API_BASE ??
    cached?.api_base ??
    "https://beta-api.paywithlocus.com/api"
  );
}

let tokenCache: { token: string; exp: number } | null = null;

function decodeJwtExp(jwt: string): number {
  try {
    const [, payload] = jwt.split(".");
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as { exp?: number };
    return typeof json.exp === "number" ? json.exp * 1000 : Date.now() + 25 * 24 * 60 * 60 * 1000;
  } catch {
    return Date.now() + 25 * 24 * 60 * 60 * 1000;
  }
}

export async function getBuildToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && tokenCache && tokenCache.exp - Date.now() > 60_000) {
    return tokenCache.token;
  }
  const apiKey = await getLocusApiKey();
  const res = await fetch(`${getBuildBase()}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ apiKey }),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`locus-build auth/exchange → ${res.status}: ${text.slice(0, 300)}`);
  }
  const { token } = JSON.parse(text) as { token: string };
  tokenCache = { token, exp: decodeJwtExp(token) };
  return token;
}
