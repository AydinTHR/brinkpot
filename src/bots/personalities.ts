export type PersonalityKey = "early-bird" | "sniper" | "calculated" | "whale";

export interface BotPersonality {
  key: PersonalityKey;
  /** Human-facing archetype label. */
  label: string;
  /** Baseline propensity to buy in, before situational pulls. */
  baseAggression: number;
  /** Weight on the sharp ramp as the timer nears zero (the last-second steal). */
  snipeBias: number;
  /** Weight on acting while the timer is high and the pot is young. */
  earlyBias: number;
  /** How strongly a growing pot pulls this bot in. */
  potGreed: number;
  /** Pot size (cents) at which potGreed is roughly saturated. */
  potReferenceCents: number;
  /** Willingness to spend a large fraction of remaining balance. */
  riskTolerance: number;
  /** Minimum gap (ms) between this bot's own buy-ins. */
  reactionMs: number;
  /** Fresh play-money balance at the start of each round. */
  startBalanceCents: number;
}

export const PERSONALITIES: Record<PersonalityKey, BotPersonality> = {
  "early-bird": {
    key: "early-bird",
    label: "Early Bird",
    baseAggression: 0.15,
    snipeBias: 0.1,
    earlyBias: 0.9,
    potGreed: 0.3,
    potReferenceCents: 3_000,
    riskTolerance: 0.6,
    reactionMs: 900,
    startBalanceCents: 8_000,
  },
  sniper: {
    key: "sniper",
    label: "Sniper",
    baseAggression: 0.02,
    snipeBias: 3.5,
    earlyBias: 0.0,
    potGreed: 0.5,
    potReferenceCents: 4_000,
    riskTolerance: 0.8,
    reactionMs: 600,
    startBalanceCents: 9_000,
  },
  calculated: {
    key: "calculated",
    label: "Calculated",
    baseAggression: 0.08,
    snipeBias: 1.2,
    earlyBias: 0.2,
    potGreed: 0.9,
    potReferenceCents: 3_500,
    riskTolerance: 0.7,
    reactionMs: 1_000,
    startBalanceCents: 9_000,
  },
  whale: {
    key: "whale",
    label: "Whale",
    baseAggression: 0.25,
    snipeBias: 0.8,
    earlyBias: 0.4,
    potGreed: 0.6,
    potReferenceCents: 6_000,
    riskTolerance: 0.95,
    reactionMs: 700,
    startBalanceCents: 16_000,
  },
};

/** Distinct call signs drawn deterministically at spawn. */
export const NAME_POOL: readonly string[] = [
  "Vex",
  "Nova",
  "Rook",
  "Echo",
  "Zephyr",
  "Mako",
  "Quill",
  "Onyx",
  "Saffron",
  "Cobalt",
  "Wren",
  "Juno",
];
