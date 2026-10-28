export const STORAGE_KEY = "brinkpot.v1";
export const SCHEMA_VERSION = 1;
/** Most recent events kept for the activity feed. */
export const FEED_LIMIT = 40;
/** Past rounds kept. Each stores its replay inputs, so it stays verifiable. */
export const HISTORY_LIMIT = 25;
/** The stable id of the human player across the whole app. */
export const HUMAN_PLAYER_ID = "you";
/** The human's display name. It is part of a round's replay input. */
export const HUMAN_NAME = "You";
