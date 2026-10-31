import type { Metadata } from "next";

// The sound test page is for checking audio by ear; keep it out of search results
export const metadata: Metadata = {
  title: "Sound test — Bloomline",
  robots: { index: false, follow: false },
};

export default function SoundTestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
