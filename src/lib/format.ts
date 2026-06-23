/** Render integer cents as play-money dollars, e.g. 12480 -> "$124.80". */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Whole seconds remaining, rounded up so the clock never shows 0 while live. */
export function formatSeconds(ms: number): string {
  return (Math.ceil(ms / 100) / 10).toFixed(1);
}

/** Abbreviate a long hex string as head + tail for compact display. */
export function shortHash(hex: string, head = 10, tail = 8): string {
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}...${hex.slice(-tail)}`;
}
