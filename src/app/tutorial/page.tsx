import { redirect } from "next/navigation";

// The old standalone guide (Sanctuary words and looks) is retired: How to play
// lives in the game's menu now, so this address just opens the game
export default function TutorialPage() {
  redirect("/");
}
