import { expect, test } from "@playwright/test";

// Exercises a whole round end to end against the production build: the commit is
// shown before play, a round is played and resolved, the seed is revealed, and the
// in-app verifier reproduces the outcome. Playwright's fake clock fast-forwards the
// real-time round (bots hold and snipe, so a natural round takes tens of seconds)
// so the test stays quick and deterministic.
test("plays a full round and verifies it provably fair", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?fast=1");

  // The commit hash is visible before any play.
  const commit = page.getByTestId("commit-hash");
  await expect(commit).toBeVisible();
  const firstCommit = (await commit.textContent())?.trim() ?? "";
  expect(firstCommit.length).toBeGreaterThan(0);

  // Fresh round: empty pot, full timer, a Start button.
  await expect(page.getByTestId("pot")).toHaveText("$0.00");
  await expect(page.getByTestId("start")).toBeVisible();

  // Start and grab the crown at least once.
  await page.getByTestId("start").click();
  await page
    .getByTestId("buyin")
    .click({ timeout: 2000 })
    .catch(() => {
      // The round still resolves whether or not this lands.
    });

  // Fast-forward game time until the round resolves.
  const modal = page.getByTestId("result-modal");
  for (let i = 0; i < 40 && (await modal.count()) === 0; i += 1) {
    await page.clock.runFor(3000);
  }
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(/You win|You lost|No contest/);

  // Dismiss the overlay to review the round, then verify it.
  await page.getByTestId("review").click();
  await expect(page.getByTestId("server-seed")).toBeVisible();

  await page.getByTestId("verify").click();
  await expect(page.getByTestId("verify-hash")).toContainText("✓");
  await expect(page.getByTestId("verify-hash")).toContainText("Hash matches");
  await expect(page.getByTestId("verify-outcome")).toContainText("✓");
  await expect(page.getByTestId("verify-outcome")).toContainText("Outcome reproduced");

  // Stats persisted to localStorage.
  const persisted = await page.evaluate(() => window.localStorage.getItem("brinkpot.v1"));
  expect(persisted).not.toBeNull();
  const parsed = JSON.parse(persisted ?? "{}");
  expect(parsed.stats.roundsPlayed).toBeGreaterThanOrEqual(1);

  // Playing again mints a fresh commitment (a new hash).
  await page.getByTestId("next-round").click();
  await expect(page.getByTestId("commit-hash")).not.toHaveText(firstCommit);
});
