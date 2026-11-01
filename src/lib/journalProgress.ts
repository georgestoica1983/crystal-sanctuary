// Which Garden Journal entries are found — one place, so the Journal screen,
// its NEW dots and the Journal rewards always agree.
import type { HeroClassId } from "@/types/game";
import { BOSS_RULE_REGISTRY, EDITIONS, FERT_TILES, HERO_CLASS_REGISTRY, RELIC_LIST, TOOL_IDS_WITH_ECHO } from "@/lib/engine";
import { GARDEN_UPGRADES, SKIP_TAGS } from "@/lib/runReplay";
import { RELIC_TAG_INFO, RelicTag } from "@/lib/relicTags";
import { BOSS_SPECIES, GARDEN_MILESTONES, loadMyGarden, SPECIES, VISITOR_KINDS, VISITOR_MILESTONES } from "@/lib/myGarden";
import { loadJournal } from "@/lib/journal";

export type JournalPageId = "RELICS" | "SETS" | "GARDEN" | "BOSSES" | "SUPPLIES" | "VISITORS" | "COMPANIONS";

/** Every entry id per page, in display order */
export function journalEntryIds(): Record<JournalPageId, string[]> {
  const plantNames = [...SPECIES.SMALL, ...SPECIES.BIG, ...SPECIES.SEASON, ...Object.values(BOSS_SPECIES), "Set Bloom"] as string[];
  return {
    RELICS: RELIC_LIST.map((r) => r.id),
    SETS: (Object.keys(RELIC_TAG_INFO) as RelicTag[]).filter((t) => t !== "ANY"),
    GARDEN: [...plantNames.map((n) => `plant-${n}`), ...GARDEN_MILESTONES.map((m) => `decor-${m.decor}`)],
    BOSSES: Object.keys(BOSS_RULE_REGISTRY),
    SUPPLIES: [
      ...FERT_TILES.map((t) => `FERT_${t}`),
      ...TOOL_IDS_WITH_ECHO.map((t) => `TOOL_${t}`),
      ...Object.keys(EDITIONS).map((e) => `ED_${e}`),
      ...Object.keys(GARDEN_UPGRADES).map((u) => `UPG_${u}`),
      ...Object.keys(SKIP_TAGS).map((t) => `TAG_${t}`),
    ],
    VISITORS: VISITOR_KINDS.map((k) => `VIS_${k}`),
    COMPANIONS: Object.keys(HERO_CLASS_REGISTRY),
  };
}

/** The ids found so far on this device */
export function journalFound(): Set<string> {
  const j = loadJournal();
  const garden = loadMyGarden();
  const found = new Set<string>();
  j.relics.forEach((id) => found.add(id));
  garden.setsDone.forEach((t) => found.add(t));
  garden.plants.forEach((p) => found.add(`plant-${p.kind === "SET" ? "Set Bloom" : p.species}`));
  GARDEN_MILESTONES.forEach((m) => {
    if (garden.plants.length >= m.at) found.add(`decor-${m.decor}`);
  });
  VISITOR_MILESTONES.forEach((m) => {
    if (garden.plants.length >= m.at) found.add(`VIS_${m.kind}`);
  });
  Object.keys(j.bosses).forEach((id) => found.add(id));
  j.supplies.forEach((id) => found.add(id));
  (Object.keys(j.companions) as HeroClassId[]).forEach((id) => found.add(id));
  return found;
}

/** How much of the Journal is filled, 0–100 */
export function journalPercent(): number {
  const ids = Object.values(journalEntryIds()).flat();
  const found = journalFound();
  const n = ids.filter((id) => found.has(id)).length;
  return ids.length ? Math.floor((n / ids.length) * 100) : 0;
}

/** Found entries the player hasn't looked at in the Journal yet */
export function journalNewCount(): number {
  const seen = new Set(loadJournal().seen ?? []);
  const ids = new Set(Object.values(journalEntryIds()).flat());
  return Array.from(journalFound()).filter((id) => ids.has(id) && !seen.has(id)).length;
}
