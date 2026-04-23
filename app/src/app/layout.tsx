import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TryIt — an agent that figures out how to run any GitHub repo",
  description:
    "Paste a GitHub repo. A Llama 3.3 agent reads it, writes a Dockerfile, and ships it to BuildWithLocus. Live URL in ~30 seconds. 40% of every $0.05 try goes to the author.",
  metadataBase: new URL("https://tryit.buildwithlocus.com"),
  openGraph: {
    title: "TryIt — an agent that figures out how to run any GitHub repo",
    description:
      "Paste a repo. The agent writes the Dockerfile. BuildWithLocus ships it. Author keeps $0.02 per try.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
