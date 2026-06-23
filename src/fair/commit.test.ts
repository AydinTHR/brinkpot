import { describe, it, expect } from "vitest";
import { sha256Hex, hexToSeed, randomHex } from "./hash";
import { createCommitment, deriveRoundSeed, revealMatches } from "./commit";

describe("sha256Hex", () => {
  it("matches the canonical SHA-256 test vector for 'abc'", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashes the empty string to the known digest", async () => {
    expect(await sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

describe("hexToSeed", () => {
  it("is deterministic and returns an unsigned 32-bit integer", () => {
    const s = hexToSeed("deadbeef");
    expect(s).toBe(hexToSeed("deadbeef"));
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("commit-reveal", () => {
  it("createCommitment publishes a hash that matches the secret seed", async () => {
    const { serverSeed, serverSeedHash } = await createCommitment();
    expect(serverSeed).toHaveLength(64);
    expect(serverSeedHash).toBe(await sha256Hex(serverSeed));
  });

  it("revealMatches confirms a correct seed and rejects a tampered one", async () => {
    const { serverSeed, serverSeedHash } = await createCommitment();
    expect(await revealMatches(serverSeed, serverSeedHash)).toBe(true);
    expect(await revealMatches(randomHex(32), serverSeedHash)).toBe(false);
  });

  it("deriveRoundSeed is stable for the same inputs and varies with nonce/clientSeed", async () => {
    const seed = "a".repeat(64);
    const base = await deriveRoundSeed(seed, "player", 0);
    expect(await deriveRoundSeed(seed, "player", 0)).toBe(base);
    expect(await deriveRoundSeed(seed, "player", 1)).not.toBe(base);
    expect(await deriveRoundSeed(seed, "other", 0)).not.toBe(base);
  });
});
