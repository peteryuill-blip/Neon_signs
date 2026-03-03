import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("Unified Integration: worksForWeek", () => {
  it("returns an array of works for a narrow date range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Use a narrow 1-week range to avoid timeout on large datasets
    const result = await caller.crucibleAnalytics.worksForWeek({
      startDate: "2026-02-22T00:00:00Z",
      endDate: "2026-03-01T00:00:00Z",
    });

    expect(Array.isArray(result)).toBe(true);
    // Each item should have the expected shape
    if (result.length > 0) {
      const work = result[0];
      expect(work).toHaveProperty("id");
      expect(work).toHaveProperty("code");
      expect(work).toHaveProperty("rating");
      expect(work).toHaveProperty("disposition");
      expect(work).toHaveProperty("surfaces");
      expect(work).toHaveProperty("mediums");
    }
  }, 30000);

  it("returns empty array for a date range with no works", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.crucibleAnalytics.worksForWeek({
      startDate: "2020-01-01T00:00:00Z",
      endDate: "2020-01-07T00:00:00Z",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  }, 15000);
});

describe("Unified Integration: unifiedCsv export", () => {
  it("returns unified CSV with both roundup and trial sections", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.unifiedCsv();

    expect(result).toHaveProperty("csv");
    expect(result).toHaveProperty("filename");
    expect(typeof result.csv).toBe("string");
    expect(result.filename).toMatch(/^neon-signs-unified-\d{4}-\d{2}-\d{2}\.csv$/);

    // Verify both sections exist
    expect(result.csv).toContain("=== WEEKLY ROUNDUPS ===");
    expect(result.csv).toContain("=== CRUCIBLE TRIALS ===");
  }, 60000);

  it("unified CSV contains expected roundup and trial headers", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.unifiedCsv();
    const lines = result.csv.split("\n");

    // Second line should be the roundup headers
    const roundupHeaderLine = lines[1];
    expect(roundupHeaderLine).toContain("Week");
    expect(roundupHeaderLine).toContain("Studio Hours");
    expect(roundupHeaderLine).toContain("Jester Activity");

    // Find the trial section
    const trialSectionIndex = result.csv.indexOf("=== CRUCIBLE TRIALS ===");
    expect(trialSectionIndex).toBeGreaterThan(0);

    const trialSection = result.csv.substring(trialSectionIndex);
    const trialLines = trialSection.split("\n");

    // Second line of trial section should be headers
    const trialHeaderLine = trialLines[1];
    expect(trialHeaderLine).toContain("Trial Code");
    expect(trialHeaderLine).toContain("Rating");
    expect(trialHeaderLine).toContain("Disposition");

    // Should have more than just headers
    expect(lines.length).toBeGreaterThan(4);
  }, 60000);
});

describe("Unified Integration: crucible analytics summary", () => {
  it("returns summary with trial counts and rates", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.crucibleAnalytics.summary();

    // The summary endpoint returns: totalWorks, totalSurfaces, totalMediums, trashRate, weeklyAvg, discoveryDensity
    expect(result).toHaveProperty("totalWorks");
    expect(result).toHaveProperty("totalSurfaces");
    expect(result).toHaveProperty("totalMediums");
    expect(result).toHaveProperty("trashRate");
    expect(result).toHaveProperty("weeklyAvg");
    expect(result).toHaveProperty("discoveryDensity");
    expect(typeof result.totalWorks).toBe("number");
    expect(typeof result.weeklyAvg).toBe("number");
  }, 30000);

  it("returns velocity signal with trash rate including Probably Trash", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.crucibleAnalytics.velocitySignal();

    expect(result).toHaveProperty("trashCount");
    expect(result).toHaveProperty("totalWorks");
    expect(result).toHaveProperty("trashRate");
    expect(typeof result.trashRate).toBe("number");
    expect(result.trashRate).toBeGreaterThanOrEqual(0);
    expect(result.trashRate).toBeLessThanOrEqual(100);
  }, 15000);
});

describe("Unified Integration: unifiedSummary", () => {
  it("returns combined roundup and crucible data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.crucibleAnalytics.unifiedSummary();

    // Roundup data
    expect(result).toHaveProperty("totalRoundups");
    expect(result).toHaveProperty("totalStudioHours");
    expect(result).toHaveProperty("avgJester");
    expect(result).toHaveProperty("energyDistribution");
    expect(result).toHaveProperty("jesterTrend");
    expect(result).toHaveProperty("studioHoursTrend");

    // Crucible data
    expect(result).toHaveProperty("totalWorks");
    expect(result).toHaveProperty("trashRate");
    expect(result).toHaveProperty("discoveryDensity");
    expect(result).toHaveProperty("totalSurfaces");
    expect(result).toHaveProperty("totalMediums");
    expect(result).toHaveProperty("weeklyTrialAvg");
    expect(result).toHaveProperty("trashCount");

    // Steps
    expect(result).toHaveProperty("totalSteps");
    expect(result).toHaveProperty("avgWeeklySteps");
    expect(result).toHaveProperty("stepTrend");

    // Verify types
    expect(typeof result.totalRoundups).toBe("number");
    expect(typeof result.totalStudioHours).toBe("number");
    expect(typeof result.totalWorks).toBe("number");
    expect(typeof result.trashRate).toBe("number");
    expect(typeof result.totalSteps).toBe("number");
  }, 30000);
});
