# TryIt: an agent that figures out how to run any GitHub repo

Paste a repo, pay $0.05 USDC, get a live URL in ~30 seconds. The repo author keeps 40% of every try.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Built for [Locus' Paygentic Hackathon #2](https://paygentic-week2.devfolio.co/), BuildWithLocus track.

## What it does

Paste a GitHub URL, complete checkout in a Locus popup, and about 30 seconds later you have a live, publicly routable URL at `https://svc-{id}.buildwithlocus.com` with a 20-minute TTL. The interesting part is what happens between the paste and the URL.

## The agent

Instead of hardcoded templates for a short list of stacks, TryIt uses a recipe agent (Llama 3.3 70B via Groq):

1. Fetches the repo's file tree plus the contents of every signal config file (`package.json`, `requirements.txt`, `vite.config.ts`, `Dockerfile`, `go.mod`, `Gemfile`, up to ~20 paths).
2. Emits a structured JSON recipe: `{runtime, port, startCmd, buildCmd, envDefaults, dockerfile}`.
3. Returns `{supported: false}` with a one-line reason if the repo has no bootable web service. This runs *before* the checkout session is created, so nobody pays for something that cannot run.

The agent writes the full Dockerfile inline. No template library to outgrow, no whitelist of supported stacks. Vite, Astro, Nuxt, Remix, Rails, Koa all go through the same path.

A `blocklist.ts` filter rejects agent-generated start commands that try to `rm -rf /`, `curl | bash`, mine crypto, and similar. The system prompt constrains the agent to standard public base images, `WORKDIR /app`, and a `$PORT` respecting listener.

## The payout

Repo owners can claim a repo via file-drop verification: commit `tryit-verify.txt` with a challenge token to the default branch. Every try of a claimed repo fires `POST /api/pay/send` for 40% of gross ($0.02 USDC) straight to the owner's Locus wallet. No monthly minimums, no threshold.

This is the "economic tail on GitHub stars" the hackathon is about.

## The Locus stack

- **BuildWithLocus**. `POST /v1/projects/from-repo` per try. Auth via `/v1/auth/exchange` (exchanged JWT, cached, auto-refreshed on 401). Deployments polled via `GET /v1/deployments/:id`. Services deleted via `DELETE /v1/services/:id` on TTL expiry.
- **PayWithLocus Checkout**. `$0.05 USDC` purchase via `POST /api/checkout/sessions` (amount sent as string per Locus's validation). Verified server-side via `GET /api/checkout/sessions/:id`.
- **PayWithLocus wallet transfer**. Owner payout via `POST /api/pay/send` (amount as number, opposite convention from checkout).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (Turbopack), TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Agent | Groq, Llama 3.3 70B, JSON output mode |
| Infra | BuildWithLocus (containers, service discovery, TLS) |
| Pay | PayWithLocus Checkout + wallet transfer (USDC on Base) |
| GitHub | Authed REST calls via user PAT |
| State | File-backed JSON store at `/tmp/tryit-db.json` |
| Streaming | SSE for the boot theater |

## How it works

```
User -> PasteCard (Next.js) -> POST /api/try
                                  |
                                  v
                         recipe agent (Groq + Llama 3.3)
                                  |
                                  +-- {supported: false} -> 400, no checkout
                                  |
                                  v
                         Locus Checkout session (popup)
                                  |
                                  v
                         client polls /api/checkout/:id
                                  |
                                  v
                         session PAID -> runBoot()
                                  |
                                  v
                         BuildWithLocus /v1/projects/from-repo
                                  |
                                  v
                         poll deployment -> healthy
                                  |
                                  v
                         SSE stream -> boot theater -> live URL
                                  |
                                  v
                         owner payout ($0.02 USDC -> Locus wallet)
                                  |
                                  v
                         20-min teardown timer -> DELETE /v1/services/:id
```

## Running locally

You need a Groq API key (free tier works), a GitHub personal access token (so authed GitHub calls don't hit the 60 request per hour anonymous ceiling), and a Locus `claw_` beta API key in the standard SDK location (`~/.config/locus/credentials.json`).

```bash
cp app/.env.local.example app/.env.local
# fill in:
#   GROQ_API_KEY=gsk_...      # https://console.groq.com/keys
#   GITHUB_TOKEN=ghp_...      # (gh auth token) works if gh CLI is installed

cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Setting `LOCUS_MOCK=1` runs the full flow with canned checkout and canned BuildWithLocus responses. Useful for UI work without burning USDC.

## Project structure

```
TryIt/
|-- README.md                 (this file)
|-- LICENSE                   MIT
|-- .env.local.example        required env vars
`-- app/                      Next.js app root
    |-- src/
    |   |-- app/              App Router pages + /api routes
    |   |   |-- api/try       POST: preflight + create checkout
    |   |   |-- api/checkout  GET: verify payment + trigger runBoot
    |   |   |-- api/boot      SSE stream for the boot theater
    |   |   `-- ...
    |   |-- components/       landing, theater, dashboard, claim
    |   `-- lib/
    |       |-- recipes/      agent.ts, engine.ts, blocklist.ts, github.ts
    |       |-- boot/         orchestrator.ts, bus.ts, payouts.ts, stages.ts
    |       |-- locus/        auth.ts, build.ts, pay.ts
    |       |-- checkout/     confirm.ts
    |       `-- db/           store.ts, schema.ts
    `-- package.json
```

## Security

Six abuse controls:

1. **Egress quota**: enforced by the BuildWithLocus runtime (per-session limits on data and ports).
2. **20-minute hard TTL**: `scheduleTeardown` fires `DELETE /v1/services/:id` on expiry.
3. **Rate limits**: 60 tries per hour per IP in dev, 10 per hour per IP in production.
4. **No wallet or keys in the container**: only `.env.example` values (secret-scrubbed via `safeValue`) reach the deploy.
5. **Start-command blocklist**: miners, reverse shells, `curl | sh` patterns rejected before any Locus call. Applies to agent output too.
6. **One-click kill**: `POST /api/report/:tryId` hard-deletes the service and flips the try to `expired`.

## Not shipped (gaps)

- **SIWX (Sign-In-with-Locus)**: the public Locus SDK exposes LASO (payment-card product) and MPP, not a general SIWX primitive usable here. File-drop is the only ownership proof in this build.
- **AgentMail notifications**: stretch, not wired.
- **Shared-runner v2**: each try currently provisions a disposable BuildWithLocus service. The per-service monthly fee is non-trivial at scale. Next iteration uses one long-lived runner service per project, hot-swapped via redeploy per try. Backend-only change, UX is identical.
- **Self-heal**: if the agent-generated Dockerfile fails to build, we do not retry with error context yet.

## License

MIT. See [LICENSE](LICENSE).
