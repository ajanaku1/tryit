import Link from "next/link";
import { DeepLinkAutoBoot } from "@/components/landing/DeepLinkAutoBoot";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  return {
    title: `${owner}/${repo} — boot with Tryit`,
    description: `Boot ${owner}/${repo} in seconds. Five cents. ${owner} earns two.`,
  };
}

export default async function DeepLinkPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: "rgba(10, 10, 11, 0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderColor: "var(--border-soft)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 no-underline"
            aria-label="Tryit home"
          >
            <span
              aria-hidden="true"
              className="grid h-6 w-6 place-items-center rounded-md font-mono text-[13px] font-bold text-[#1a0906]"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent) 0%, #b03d30 100%)",
                boxShadow: "0 0 20px var(--accent-ring)",
              }}
            >
              t
            </span>
            <span
              className="text-[16px] font-semibold tracking-[-0.015em]"
              style={{ color: "var(--fg)" }}
            >
              tryit<span style={{ color: "var(--fg-mute)", fontWeight: 400 }}>/beta</span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-6 text-[13.5px] sm:flex"
            aria-label="Primary"
            style={{ color: "var(--fg-dim)" }}
          >
            <Link
              href={`/claim/${owner}/${repo}`}
              className="no-underline transition-colors hover:text-[var(--fg)]"
            >
              Claim {owner}/{repo}
            </Link>
            <Link
              href="/dashboard"
              className="no-underline transition-colors hover:text-[var(--fg)]"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-64px)] place-items-center px-6 py-10">
        <DeepLinkAutoBoot owner={owner} repo={repo} />
      </main>
    </>
  );
}
