import { getBuildBase, getBuildToken } from "./auth";

type FromRepoInput = {
  repo: string;
  branch?: string;
  projectName?: string;
  environmentName?: string;
};

export type DeploymentStatus =
  | "queued"
  | "building"
  | "deploying"
  | "healthy"
  | "failed"
  | "cancelled"
  | "rolled_back";

export type FromRepoResult = {
  projectId: string;
  environmentId: string;
  serviceId: string;
  serviceUrl: string;
  deploymentId: string;
};

export type Deployment = {
  id: string;
  serviceId: string;
  status: DeploymentStatus;
  durationMs: number | null;
  lastLogs?: string[];
};

async function call<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const send = async (forceRefresh: boolean) => {
    const token = await getBuildToken(forceRefresh);
    return fetch(`${getBuildBase()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  };
  let res = await send(false);
  if (res.status === 401) res = await send(true);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`locus-build ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export async function fromRepo(input: FromRepoInput): Promise<FromRepoResult> {
  type Response = {
    project?: { id: string };
    environment?: { id: string };
    services?: Array<{ id: string; url?: string }>;
    deployments?: Array<{ id: string }>;
    deploymentId?: string;
  };
  const r = await call<Response>("POST", "/projects/from-repo", {
    name: input.projectName ?? `tryit-${Date.now().toString(36)}`,
    repo: input.repo,
    branch: input.branch ?? "main",
  });
  const svc = r.services?.[0];
  const dep = r.deployments?.[0]?.id ?? r.deploymentId;
  if (!r.project?.id || !r.environment?.id || !svc?.id || !dep) {
    throw new Error("locus-build: from-repo response missing ids");
  }
  return {
    projectId: r.project.id,
    environmentId: r.environment.id,
    serviceId: svc.id,
    serviceUrl: svc.url ?? `https://${svc.id.replace(/_/g, "-")}.buildwithlocus.com`,
    deploymentId: dep,
  };
}

export function getDeployment(id: string): Promise<Deployment> {
  return call<Deployment>("GET", `/deployments/${id}`);
}

export async function deleteService(id: string): Promise<void> {
  await call<void>("DELETE", `/services/${id}`);
}
