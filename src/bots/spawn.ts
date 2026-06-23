import type { PlayerRef } from "../engine/types";
import type { Rng } from "../fair/prng";
import type { BotPersonality, PersonalityKey } from "./personalities";
import { NAME_POOL, PERSONALITIES } from "./personalities";

export interface Bot {
  ref: PlayerRef;
  personality: BotPersonality;
}

export interface BotSeat extends Bot {
  balanceCents: number;
}

/** One bot of each archetype makes for a lively, readable table. */
const ROSTER: readonly PersonalityKey[] = ["early-bird", "sniper", "calculated", "whale"];

/**
 * Build the rival roster deterministically from the round RNG. Names are the only
 * random element here; drawing them first fixes the RNG cursor so every later bot
 * decision lines up identically on replay.
 */
export function spawnBots(rng: Rng): BotSeat[] {
  const names = [...NAME_POOL];
  return ROSTER.map((key, i) => {
    const personality = PERSONALITIES[key];
    const idx = names.length > 0 ? rng.nextInt(0, names.length) : 0;
    const name = names.splice(idx, 1)[0] ?? `Rival ${i + 1}`;
    return {
      ref: { id: `bot-${i}`, name, isHuman: false },
      personality,
      balanceCents: personality.startBalanceCents,
    };
  });
}
