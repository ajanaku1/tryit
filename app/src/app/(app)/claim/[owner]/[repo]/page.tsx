import { ClaimGate } from "@/components/claim/ClaimGate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  return { title: `Claim ${owner}/${repo} — Tryit` };
}

export default async function ClaimRepoPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-6">
        <div
          className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-mute)" }}
        >
          Claim a repo
        </div>
        <h1
          className="m-0 text-[26px] font-medium tracking-[-0.02em]"
          style={{ color: "var(--fg)" }}
        >
          Earn on every try of{" "}
          <span style={{ color: "var(--accent)" }}>
            {owner}/{repo}
          </span>
        </h1>
        <p className="m-0 mt-1 text-[13.5px]" style={{ color: "var(--fg-dim)" }}>
          Three steps, about two minutes. You&apos;ll never see a seed phrase.
        </p>
      </header>

      <div className="max-w-3xl">
        <ClaimGate owner={owner} repo={repo} />
      </div>
    </main>
  );
}
