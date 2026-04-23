import Link from "next/link";
import { WordmarkNav } from "@/components/landing/WordmarkNav";
import { PasteCard } from "@/components/landing/PasteCard";
import { LiveFeed } from "@/components/landing/LiveFeed";
import { Bento } from "@/components/landing/Bento";
import { TopBanner } from "@/components/landing/TopBanner";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <WordmarkNav />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-6 sm:pt-8">
        <TopBanner />

        {/* ── Split hero ───────────────────────────── */}
        <section
          aria-label="Landing"
          className="grid grid-cols-1 items-center gap-8 py-10 lg:grid-cols-[1.2fr_1fr] lg:py-14"
        >
          <div>
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px]"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--fg-dim)",
              }}
            >
              <span
                aria-hidden="true"
                className="h-[5px] w-[5px] rounded-full"
                style={{ background: "var(--accent)" }}
              />
              An agent that figures out how to run any repo
            </div>

            <h1
              className="m-0 mb-5 text-[44px] font-medium leading-[1.05] sm:text-[52px]"
              style={{
                letterSpacing: "-0.035em",
                background:
                  "linear-gradient(180deg, var(--fg) 30%, rgba(244,244,245,0.65))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Paste a repo.<br />
              The agent{" "}
              <span
                style={{
                  color: "var(--accent)",
                  WebkitTextFillColor: "var(--accent)",
                  fontStyle: "italic",
                  fontWeight: 500,
                }}
              >
                figures it out
              </span>
              .
            </h1>

            <p
              className="m-0 mb-8 max-w-[480px] text-[19px] leading-[1.5]"
              style={{ color: "var(--fg-dim)" }}
            >
              A Llama 3.3 agent reads the repo, writes a Dockerfile, and ships it to BuildWithLocus. You pay $0.05 USDC per try — the author takes 40% of every boot of their code.
            </p>

            <PasteCard initial="vercel/ai-chatbot" />

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip">agent-detected recipes</span>
              <span className="chip">Next.js · FastAPI · Vite · static</span>
              <span className="chip" style={{ color: "var(--fg-mute)" }}>
                Llama 3.3 70B via Groq
              </span>
            </div>
          </div>

          <LiveFeed />
        </section>

        <Bento />
      </main>

      <footer
        className="mx-auto mt-16 max-w-6xl border-t px-6 pb-16 pt-5"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11.5px]"
          style={{ color: "var(--fg-mute)", letterSpacing: "0.02em" }}
        >
          <span>tryit · beta · built on BuildWithLocus + PayWithLocus</span>
          <span>
            made for the paygentic hackathon · <Link
              href="/security"
              className="no-underline hover:text-[var(--fg)] transition-colors"
              style={{ color: "var(--fg-dim)" }}
            >
              security
            </Link>
          </span>
        </div>
      </footer>
    </>
  );
}
