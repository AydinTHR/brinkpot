/**
 * SHA-256 helpers built on the Web Crypto SubtleCrypto API, plus the seed
 * derivation used to fold a hex digest into a 32-bit PRNG seed.
 *
 * SubtleCrypto requires a secure context (https or localhost). `isCryptoAvailable`
 * lets the UI surface a clear message instead of silently breaking fairness.
 */

export function isCryptoAvailable(): boolean {
  return (
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof crypto.subtle.digest === "function"
  );
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

/** Cryptographically random hex string of `bytes` bytes (default 32). */
export function randomHex(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

/**
 * Fold an arbitrary string (typically a 64-char hex digest) into an unsigned
 * 32-bit integer suitable for seeding mulberry32. Uses FNV-1a, which is fast,
 * deterministic, and trivial to reimplement for independent verification.
 */
export function hexToSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
