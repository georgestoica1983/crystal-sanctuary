import { DungeonTheme, ModifierId, RelicDefinition, RelicId } from "@/types/game";

/**
 * Cozy "Crystal Sanctuary" vocabulary. The engine and the Tactician theme keep
 * their dungeon terms; these helpers swap in Sanctuary wording for display.
 *
 * Glossary:
 *   Hero → Companion · HP → Life · Shield → Shield · Weapon → Power tile
 *   Gold → Gems · Enemy → Thorn · Trap → Spike · Potion → Berries
 *   Exit → Exit · Floor → Garden · Dungeon → Sanctuary · Relic → Blessing
 *   Run → Visit
 */

// Shop and Legendary relics already use Sanctuary names, so they're absent here
const SANCTUARY_RELIC_COPY: Partial<Record<
  RelicId,
  Pick<RelicDefinition, "name" | "icon" | "shortTag" | "description">
>> = {
  GILDED_AEGIS: {
    name: "Acorn Glow",
    icon: "🧤",
    shortTag: "Each 🌰 also gives +1 🧤",
    description: "Every Acorn you collect also gives +1 🧤 Gloves.",
  },
  VORPAL_EDGE: {
    name: "Lingering Shears",
    icon: "✂️",
    shortTag: "Every 2nd ✂️ cut is free",
    description:
      "Every second Thorn you cut with ✂️ Shears is free — you keep that cut.",
  },
  ALCHEMIST_FLASK: {
    name: "Honey Jar",
    icon: "🍯",
    shortTag: "🍓 can heal 4 over max",
    description: "Berries can fill your Life up to +4 above its usual maximum.",
  },
  SPIKED_BOOTS: {
    name: "Garden Boots",
    icon: "🥾",
    shortTag: "Straight Spikes give ✂️",
    description:
      "Stepping straight onto a Spike doesn't hurt — it gives you +1 ✂️ Shears instead.",
  },
  LONG_STRIDE: {
    name: "Long Meander",
    icon: "🍃",
    shortTag: "12+ tiles: Thorns are 1 weaker",
    description:
      "If your line is 12+ tiles long, every Thorn in this garden is 1 gentler.",
  },
  GREED_CROWN: {
    name: "Flower Crown",
    icon: "🌼",
    shortTag: "🌰 count double · +1 ❤️ each",
    description: "Acorns are worth double and each one restores +1 Life.",
  },
};

/** Relic display copy for the active theme (id, colour and rules unchanged). */
export function getRelicDisplay(
  relic: RelicDefinition,
  isSanctuary: boolean
): RelicDefinition {
  return isSanctuary ? { ...relic, ...SANCTUARY_RELIC_COPY[relic.id] } : relic;
}

const SANCTUARY_GARDEN_COPY: Record<ModifierId, { title: string; lore: string }> =
  {
    GLASS_ARMOR: {
      title: "The Frosted Greenhouse",
      lore: "Morning frost makes every dewdrop sparkle twice as bright — but it melts away every third step.",
    },
    MIRROR_VERTICAL: {
      title: "The Mirror Pond",
      lore: "Thorns reflected in the still water feel sharper from above and below, softer from the side.",
    },
    BLOOD_GOLD: {
      title: "The Honeyed Orchard",
      lore: "Seeds hum with warm magic today, but some of the berries have turned sour.",
    },
    MOMENTUM: {
      title: "The Sunlit Lanes",
      lore: "Long straight paths soak up the sunshine — walk three tiles in a row to gather it.",
    },
    SHEARS: {
      title: "The Quiet Garden",
      lore: "A calm, open garden. Wander in any of the eight directions.",
    },
    ORTHOGONAL_ONLY: {
      title: "The Hedgerow Maze",
      lore: "Tall hedges block every diagonal shortcut. Today you walk the garden in straight lines.",
    },
    NONE: {
      title: "The Quiet Garden",
      lore: "A calm, open garden. Wander in any of the eight directions.",
    },
  };

/**
 * Garden title/lore for built-in boards. AI-crafted boards keep the title the
 * player asked for.
 */
export function getDungeonDisplay(
  dungeon: DungeonTheme,
  isSanctuary: boolean
): { title: string; lore: string } {
  if (!isSanctuary || dungeon.source !== "deterministic-fallback") {
    return { title: dungeon.title, lore: dungeon.lore };
  }
  if (dungeon.floors.length > 3) {
    return {
      title: "The Ten-Garden Trail",
      lore: "Ten gardens in a row, with a new Blessing after each one.",
    };
  }
  return SANCTUARY_GARDEN_COPY[dungeon.modifierId] ?? SANCTUARY_GARDEN_COPY.NONE;
}

/** Share-card emoji for each visited tile type. */
export const SHARE_TILE_EMOJI = {
  tactician: {
    ENEMY: "🔺",
    SHIELD: "🧤",
    WEAPON: "⚔️",
    POTION: "💚",
    GOLD: "🪙",
    TRAP: "⚡",
    EXIT: "🚪",
    DEATH: "💀",
  },
  sanctuary: {
    ENEMY: "🌺",
    SHIELD: "🧤",
    WEAPON: "✂️",
    POTION: "🍓",
    GOLD: "🌰",
    TRAP: "⚙️",
    EXIT: "🌈",
    DEATH: "🍃",
  },
} as const;
