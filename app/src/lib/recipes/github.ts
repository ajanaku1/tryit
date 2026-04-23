const GH = "https://api.github.com";

type GitHubFetchInit = RequestInit & { acceptRaw?: boolean };

function authHeaders(acceptRaw: boolean): HeadersInit {
  const h: Record<string, string> = {
    "User-Agent": "tryit-recipe-engine",
    Accept: acceptRaw ? "application/vnd.github.raw" : "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh(path: string, init: GitHubFetchInit = {}): Promise<Response> {
  const { acceptRaw = false, ...rest } = init;
  return fetch(`${GH}${path}`, {
    ...rest,
    headers: { ...authHeaders(acceptRaw), ...(rest.headers ?? {}) },
    cache: "no-store",
  });
}

export type RepoMeta = { defaultBranch: string; headSha: string };

export async function resolveRef(
  owner: string,
  repo: string,
  ref?: string,
): Promise<RepoMeta> {
  if (ref && /^[0-9a-f]{7,40}$/i.test(ref)) {
    return { defaultBranch: ref, headSha: ref };
  }
  const meta = await gh(`/repos/${owner}/${repo}`);
  if (!meta.ok) throw new Error(`repo-fetch ${meta.status}: ${owner}/${repo}`);
  const { default_branch } = (await meta.json()) as { default_branch: string };
  const branch = ref ?? default_branch;
  const head = await gh(`/repos/${owner}/${repo}/commits/${branch}`);
  if (!head.ok) throw new Error(`head-fetch ${head.status}: ${owner}/${repo}@${branch}`);
  const { sha } = (await head.json()) as { sha: string };
  return { defaultBranch: branch, headSha: sha };
}

export type TreeEntry = { path: string; type: "blob" | "tree"; size?: number };

export async function fetchTree(
  owner: string,
  repo: string,
  sha: string,
): Promise<TreeEntry[]> {
  const r = await gh(`/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`);
  if (!r.ok) throw new Error(`tree-fetch ${r.status}`);
  const json = (await r.json()) as { tree: TreeEntry[]; truncated?: boolean };
  return json.tree;
}

export async function fetchFile(
  owner: string,
  repo: string,
  sha: string,
  path: string,
): Promise<string | null> {
  const r = await gh(`/repos/${owner}/${repo}/contents/${path}?ref=${sha}`, {
    acceptRaw: true,
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`file-fetch ${r.status}: ${path}`);
  return r.text();
}

export function hasPath(tree: TreeEntry[], p: string): boolean {
  const needle = p.toLowerCase();
  return tree.some((e) => e.path.toLowerCase() === needle);
}

export function findFirst(tree: TreeEntry[], names: string[]): string | null {
  const set = new Set(names.map((n) => n.toLowerCase()));
  for (const e of tree) {
    if (e.type !== "blob") continue;
    const base = e.path.split("/").pop()!.toLowerCase();
    if (set.has(base)) return e.path;
  }
  return null;
}
