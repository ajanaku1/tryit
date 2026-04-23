import Link from "next/link";
import { notFound } from "next/navigation";
import { BootTheater } from "@/components/theater/BootTheater";
import { confirmTry } from "@/lib/checkout/confirm";
import { getTry } from "@/lib/db/store";

export default async function TryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ owner?: string; repo?: string; cached?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;

  await confirmTry(id);
  const row = await getTry(id);
  if (!row) notFound();

  const [dbOwner, dbRepo] = row.repoSlug.split("/");
  const owner = q.owner || dbOwner;
  const repo = q.repo || dbRepo;
  const cached = q.cached === "1" || row.cached;

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 pt-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[12px] no-underline transition-colors hover:text-[var(--fg)]"
          style={{ color: "var(--fg-mute)" }}
        >
          ← back
        </Link>
      </div>
      <BootTheater
        id={id}
        owner={owner}
        repo={repo}
        cached={cached}
        initialStatus={row.status}
        initialUrl={row.containerUrl}
        initialExpiresAt={row.expiresAt}
        initialError={row.errorMessage}
      />
    </>
  );
}
