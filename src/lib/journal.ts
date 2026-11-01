// Garden Journal: a collection of everything a player can find in Bloomline,
// kept on this device. Relics, sets and the garden are read from what the game
// already remembers; Bosses, garden supplies and companions are recorded here.
// Cosmetic only: it never changes scoring.
import type { BossRuleId, HeroClassId, RelicId } from "@/types/game";

const JOURNAL_KEY = "ost_journal_v1";
/** Written by the game when a Run ends (relics ever found on this device) */
const RELICS_FOUND_KEY = "ost_relics_found_v1";

export interface JournalData {
  /** Bosses beaten: how often, and the best bed score against each */
  bosses: Partial<Record<BossRuleId, { beaten: number; best: number }>>;
  /** Garden supplies met: FERT_<tile>, TOOL_<id>, ED_<edition>, UPG_<id>, TAG_<tag> */
  supplies: string[];
  /** Relics owned at some point (also merged with the end-of-Run list) */
  relics: RelicId[];
  /** Best Run score and deepest bed per companion */
  companions: Partial<Record<HeroClassId, { best: number; deepest: number }>>;
}

const EMPTY: JournalData = { bosses: {}, supplies: [], relics: [], companions: {} };

export function loadJournal(): JournalData {
  try {
    const raw = JSON.parse(window.localStorage.getItem(JOURNAL_KEY) ?? "null");
    const found: RelicId[] = JSON.parse(window.localStorage.getItem(RELICS_FOUND_KEY) ?? "[]");
    const data: JournalData = { ...EMPTY, ...(raw ?? {}) };
    return { ...data, relics: Array.from(new Set([...(data.relics ?? []), ...found])) };
  } catch {
    return { ...EMPTY };
  }
}

function update(fn: (j: JournalData) => JournalData): void {
  try {
    const raw = JSON.parse(window.localStorage.getItem(JOURNAL_KEY) ?? "null");
    const current: JournalData = { ...EMPTY, ...(raw ?? {}) };
    window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(fn(current)));
  } catch {
    // Ignore storage errors
  }
}

/** A Boss bed bloomed */
export function recordBossBeaten(id: BossRuleId, score: number): void {
  update((j) => {
    const prev = j.bosses[id] ?? { beaten: 0, best: 0 };
    return { ...j, bosses: { ...j.bosses, [id]: { beaten: prev.beaten + 1, best: Math.max(prev.best, score) } } };
  });
}

/** A garden supply met for the first time (bought, used or taken) */
export function recordSupply(...ids: string[]): void {
  update((j) => ({ ...j, supplies: Array.from(new Set([...j.supplies, ...ids])) }));
}

/** Relics owned (bought or won) */
export function recordRelics(ids: RelicId[]): void {
  update((j) => ({ ...j, relics: Array.from(new Set([...j.relics, ...ids])) }));
}

/** A Run ended with this companion */
export function recordCompanionRun(id: HeroClassId, score: number, deepestBed: number): void {
  update((j) => {
    const prev = j.companions[id] ?? { best: 0, deepest: 0 };
    return {
      ...j,
      companions: { ...j.companions, [id]: { best: Math.max(prev.best, score), deepest: Math.max(prev.deepest, deepestBed) } },
    };
  });
}
