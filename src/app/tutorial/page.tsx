"use client";

import React from "react";
import { useRouter } from "next/navigation";
import TutorialView from "@/components/TutorialView";

export default function StandaloneTutorialPage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh w-full bg-[#0A0C0B] text-white px-3 py-4 md:py-6 overflow-x-hidden">
      <TutorialView
        onStartPlaying={() => router.push("/")}
        onLaunchGuidedPractice={() => router.push("/")}
      />
    </main>
  );
}
