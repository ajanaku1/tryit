import Groq from "groq-sdk";
import { assertSafeStartCmd } from "./blocklist";
import { detectNeedsPostgres, parseEnvExample } from "./env";
import { fetchFile, fetchTree, resolveRef, type TreeEntry } from "./github";
import { UnsupportedRepoError, type Recipe, type RecipeInput, type Runtime } from "./types";

const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const MAX_TREE_ENTRIES = 400;
const MAX_FILE_BYTES = 4_000;
const REQUEST_TIMEOUT_MS = 60_000;

const SIGNAL_FILES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "Gemfile",
  "go.mod",
  "Cargo.toml",
  "composer.json",
  "pom.xml",
  "build.gradle",
  "Dockerfile",
  "dockerfile",
  "docker-compose.yml",
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
  "vite.config.js",
  "vite.config.ts",
  "vite.config.mjs",
  "nuxt.config.ts",
  "astro.config.mjs",
  "index.html",
  "app.py",
  "main.py",
  "server.py",
  "manage.py",
  "Procfile",
  "README.md",
  ".env.example",
  ".env.sample",
];

const IGNORE_TREE_PREFIXES = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  "out/",
  "vendor/",
  "target/",
  "__pycache__/",
  ".venv/",
  "venv/",
  ".turbo/",
  "coverage/",
  ".cache/",
];

const SYSTEM_PROMPT = `You are a deploy recipe agent for TryIt. Given a GitHub repo's file tree and key config files, you emit a JSON recipe describing how to build and run it as a single web service in a Linux x86_64 Docker container.

Execution environment:
- The container will be built on BuildWithLocus and fronted at https://svc-{id}.buildwithlocus.com with TLS.
- The service must listen on 0.0.0.0 on the port you declare, and should honor $PORT if the runtime supports it.
- The container has network egress to install dependencies at build time. No persistent disk. No GPU.
- Build + first boot should complete in under 5 minutes.

Rules:
- Never emit commands that do rm -rf /, curl | bash, sudo, or touch host paths outside /app.
- Use standard public base images (node:*-alpine, python:*-slim, nginx:alpine, golang:*-alpine, ruby:*-slim).
- The Dockerfile must WORKDIR /app, COPY source, install deps deterministically, then declare CMD or ENTRYPOINT that starts the web server on the declared port.
- Prefer lockfile-respecting installs (npm ci, pip install -r requirements.txt, bundle install --deployment).
- If the repo has no web service (CLI tool, library, training script, smart contract only, dataset), return {"supported": false, "reason": "<1 short sentence>"} and nothing else.
- If secrets are required (private API keys, DB passwords with no fallback), still return supported=true with envDefaults containing placeholder values, and note the requirement in reason. The service may not function but should at least start.
- needsPostgres is true iff the code clearly requires a Postgres connection (env like DATABASE_URL pointing at postgres, psycopg/prisma-postgres usage). Don't guess.

Output a single JSON object with this exact shape (omit optional fields only when supported=false):
{
  "supported": boolean,
  "reason": string (optional explanation),
  "runtime": "node" | "python" | "static" | "docker" | "go" | "ruby" | "rust" | "java" | "php" | "other",
  "port": integer,
  "needsPostgres": boolean,
  "buildCmd": string (optional, shell command),
  "startCmd": string (shell command that starts the web server in the container),
  "envDefaults": object mapping env var names to string default values,
  "dockerfile": string (complete Dockerfile contents, newline-separated)
}

Respond with the JSON object only. No prose, no code fences, no commentary.`;

type AgentResponse = {
  supported: boolean;
  reason?: string;
  runtime?: Runtime;
  port?: number;
  needsPostgres?: boolean;
  buildCmd?: string;
  startCmd?: string;
  envDefaults?: Record<string, string>;
  dockerfile?: string;
};

export function agentAvailable(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function buildRecipeWithAgent(input: RecipeInput): Promise<Recipe> {
  const { ownerSlug, repoSlug } = input;
  const { headSha } = await resolveRef(ownerSlug, repoSlug, input.ref);
  const tree = await fetchTree(ownerSlug, repoSlug, headSha);

  const context = await gatherContext(ownerSlug, repoSlug, headSha, tree);
  const envDefaults = context.envRaw ? parseEnvExample(context.envRaw) : {};

  const userMessage = renderContext(ownerSlug, repoSlug, headSha, tree, context);

  const client = new Groq({ timeout: REQUEST_TIMEOUT_MS });

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4_000,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("recipe-agent: empty response");

  let parsed: AgentResponse;
  try {
    parsed = JSON.parse(text) as AgentResponse;
  } catch {
    throw new Error(`recipe-agent: malformed JSON — ${text.slice(0, 160)}`);
  }

  if (!parsed.supported) {
    throw new UnsupportedRepoError(
      `${ownerSlug}/${repoSlug}`,
      `TryIt can't boot ${ownerSlug}/${repoSlug}: ${parsed.reason ?? "no runnable web service detected."}`,
    );
  }

  if (!parsed.runtime || !parsed.port || !parsed.startCmd || !parsed.dockerfile) {
    throw new Error("recipe-agent: response missing required fields for supported recipe");
  }

  assertSafeStartCmd(parsed.startCmd);
  if (parsed.buildCmd) assertSafeStartCmd(parsed.buildCmd);

  const mergedEnv: Record<string, string> = {
    ...envDefaults,
    ...(parsed.envDefaults ?? {}),
    PORT: String(parsed.port),
    HOST: "0.0.0.0",
  };

  return {
    ownerSlug,
    repoSlug,
    sha: headSha,
    runtime: parsed.runtime,
    buildCmd: parsed.buildCmd,
    startCmd: parsed.startCmd,
    port: parsed.port,
    needsPostgres: parsed.needsPostgres ?? detectNeedsPostgres(tree, envDefaults),
    envDefaults: mergedEnv,
    dockerfileInline: parsed.dockerfile,
    confidence: "high",
    source: "agent",
  };
}

type GatheredContext = {
  filteredTree: TreeEntry[];
  fileSnippets: Array<{ path: string; content: string; truncated: boolean }>;
  envRaw: string | null;
};

async function gatherContext(
  owner: string,
  repo: string,
  sha: string,
  tree: TreeEntry[],
): Promise<GatheredContext> {
  const filteredTree = tree
    .filter((e) => !IGNORE_TREE_PREFIXES.some((p) => e.path.startsWith(p)))
    .slice(0, MAX_TREE_ENTRIES);

  const pathsToFetch = new Set<string>();
  const treePaths = new Set(filteredTree.map((e) => e.path));
  for (const signal of SIGNAL_FILES) {
    for (const p of treePaths) {
      if (p === signal || p.toLowerCase().endsWith(`/${signal.toLowerCase()}`)) {
        pathsToFetch.add(p);
        break;
      }
    }
  }

  const fetched = await Promise.all(
    [...pathsToFetch].map(async (path) => {
      try {
        const body = await fetchFile(owner, repo, sha, path);
        if (body == null) return null;
        const truncated = body.length > MAX_FILE_BYTES;
        return { path, content: truncated ? body.slice(0, MAX_FILE_BYTES) : body, truncated };
      } catch {
        return null;
      }
    }),
  );
  const fileSnippets = fetched.filter((f): f is NonNullable<typeof f> => f !== null);

  const envSnippet = fileSnippets.find((f) => /\.env\.(example|sample)$/i.test(f.path));
  const envRaw = envSnippet?.content ?? null;

  return { filteredTree, fileSnippets, envRaw };
}

function renderContext(
  owner: string,
  repo: string,
  sha: string,
  tree: TreeEntry[],
  ctx: GatheredContext,
): string {
  const treeBlock = ctx.filteredTree
    .map((e) => `${e.type === "tree" ? "d" : "f"} ${e.path}`)
    .join("\n");

  const filesBlock = ctx.fileSnippets
    .map((f) => {
      const header = f.truncated ? `--- ${f.path} (truncated to ${MAX_FILE_BYTES} bytes) ---` : `--- ${f.path} ---`;
      return `${header}\n${f.content}`;
    })
    .join("\n\n");

  const truncationNote =
    tree.length > ctx.filteredTree.length
      ? `\n[tree truncated: showing ${ctx.filteredTree.length} of ${tree.length} entries, build/vendor dirs removed]`
      : "";

  return `Repo: ${owner}/${repo}
Commit: ${sha}

File tree:
${treeBlock}${truncationNote}

${filesBlock || "(no signal config files detected)"}

Return the JSON recipe now.`;
}
