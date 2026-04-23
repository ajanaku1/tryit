export type Runtime = "node" | "python" | "static" | "docker" | "go" | "ruby" | "rust" | "java" | "php" | "other";

export type RecipeSource =
  | "dockerfile"
  | "heuristic-next"
  | "heuristic-fastapi"
  | "heuristic-static"
  | "agent";

export type RecipeConfidence = "high" | "medium" | "low";

export type RecipeInput = {
  ownerSlug: string;
  repoSlug: string;
  ref?: string;
};

export type Recipe = {
  ownerSlug: string;
  repoSlug: string;
  sha: string;
  runtime: Runtime;
  buildCmd?: string;
  startCmd: string;
  port: number;
  needsPostgres: boolean;
  envDefaults: Record<string, string>;
  dockerfileInline: string;
  confidence: RecipeConfidence;
  source: RecipeSource;
};

export class UnsupportedRepoError extends Error {
  constructor(
    public readonly slug: string,
    message = `Tryit doesn't know how to boot ${slug} yet. Supported stacks: Next.js, FastAPI, static.`,
  ) {
    super(message);
    this.name = "UnsupportedRepoError";
  }
}
