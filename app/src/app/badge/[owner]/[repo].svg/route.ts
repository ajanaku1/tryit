import type { NextRequest } from "next/server";
import { getRepo } from "@/lib/db/store";

export const runtime = "nodejs";
export const revalidate = 60;

const SAFE_SLUG = /^[A-Za-z0-9._-]{1,100}$/;

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function renderBadge({ label, value }: { label: string; value: string }) {
  const fontFamily =
    "Geist Mono, -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace";
  const px = 6.5;
  const labelW = Math.max(46, Math.ceil(label.length * px) + 14);
  const valueW = Math.max(40, Math.ceil(value.length * px) + 14);
  const total = labelW + valueW;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" viewBox="0 0 ${total} 20" role="img" aria-label="${escape(label)}: ${escape(value)}">
  <title>${escape(label)}: ${escape(value)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".08"/>
    <stop offset="1" stop-opacity=".15"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#1c1c20"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="#ff6b5b"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#f4f4f5" font-family="${fontFamily}" font-size="11" font-weight="500" text-rendering="geometricPrecision">
    <text x="${labelW / 2}" y="14" text-anchor="middle" fill="#a1a1aa">${escape(label)}</text>
    <text x="${labelW + valueW / 2}" y="14" text-anchor="middle" fill="#1a0906">${escape(value)}</text>
  </g>
</svg>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;

  if (!SAFE_SLUG.test(owner) || !SAFE_SLUG.test(repo)) {
    return new Response("invalid slug", { status: 400 });
  }

  const slug = `${owner}/${repo}`;
  const row = await getRepo(slug);
  const tries = row?.totalTries ?? 0;
  const value = tries > 0 ? `${formatCount(tries)} tries` : "new";
  const svg = renderBadge({ label: "try it", value });

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
