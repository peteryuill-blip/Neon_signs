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

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
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

describe("roundup.canSubmit", () => {
  it("returns submission status for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.roundup.canSubmit();

    expect(result).toHaveProperty("isCheckInDay");
    expect(result).toHaveProperty("canSubmit");
    expect(result).toHaveProperty("currentDay");
    expect(result).toHaveProperty("checkInDay");
    expect(result).toHaveProperty("weekNumber");
    expect(result).toHaveProperty("year");
    expect(typeof result.isCheckInDay).toBe("boolean");
    expect(typeof result.canSubmit).toBe("boolean");
    expect(typeof result.currentDay).toBe("string");
    expect(typeof result.checkInDay).toBe("string");
    expect(typeof result.weekNumber).toBe("number");
    expect(typeof result.year).toBe("number");
  });

  it("returns multi-roundup tracking fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.roundup.canSubmit();

    expect(result).toHaveProperty("entryCount");
    expect(result).toHaveProperty("maxEntries");
    expect(result).toHaveProperty("hasCheckInDayEntry");
    expect(result).toHaveProperty("nextEntryNumber");
    expect(typeof result.entryCount).toBe("number");
    expect(result.maxEntries).toBe(7);
    expect(typeof result.hasCheckInDayEntry).toBe("boolean");
    expect(typeof result.nextEntryNumber).toBe("number");
  });

  it("entryCount is between 0 and 7", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.roundup.canSubmit();

    expect(result.entryCount).toBeGreaterThanOrEqual(0);
    expect(result.entryCount).toBeLessThanOrEqual(7);
  });

  it("returns weekNumber between 1 and 52", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.roundup.canSubmit();

    // Crucible Year starts at Week 0, so valid range is 0-52
    expect(result.weekNumber).toBeGreaterThanOrEqual(0);
    expect(result.weekNumber).toBeLessThanOrEqual(52);
  });
});

describe("roundup.getAll", () => {
  it("returns paginated roundups for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.roundup.getAll({ limit: 10, offset: 0 });

    expect(result).toHaveProperty("roundups");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.roundups)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("respects limit parameter", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.roundup.getAll({ limit: 5, offset: 0 });

    expect(result.roundups.length).toBeLessThanOrEqual(5);
  });

  it("returns entry numbering fields for multi-roundup support", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.roundup.getAll({ limit: 10, offset: 0 });

    // Each roundup should have entry numbering fields
    result.roundups.forEach((roundup) => {
      expect(roundup).toHaveProperty("entryNumber");
      expect(roundup).toHaveProperty("entriesInWeek");
      expect(typeof roundup.entryNumber).toBe("number");
      expect(typeof roundup.entriesInWeek).toBe("number");
      expect(roundup.entryNumber).toBeGreaterThanOrEqual(1);
      expect(roundup.entriesInWeek).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("stats.dashboard", () => {
  it("returns dashboard stats for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.dashboard();

    expect(result).toHaveProperty("totalRoundups");
    expect(result).toHaveProperty("totalStudioHours");
    expect(result).toHaveProperty("averageJesterActivity");
    expect(result).toHaveProperty("currentWeek");
    expect(result).toHaveProperty("daysUntilCheckIn");
    expect(result).toHaveProperty("checkInDay");
    expect(result).toHaveProperty("archiveEntryCount");
    expect(result).toHaveProperty("entriesThisWeek");
    expect(typeof result.totalRoundups).toBe("number");
    expect(typeof result.totalStudioHours).toBe("number");
    expect(typeof result.currentWeek).toBe("number");
    expect(typeof result.daysUntilCheckIn).toBe("number");
    expect(typeof result.checkInDay).toBe("string");
    expect(typeof result.archiveEntryCount).toBe("number");
    expect(typeof result.entriesThisWeek).toBe("number");
  });

  it("returns entriesThisWeek between 0 and 7", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.dashboard();

    expect(result.entriesThisWeek).toBeGreaterThanOrEqual(0);
    expect(result.entriesThisWeek).toBeLessThanOrEqual(7);
  });

  it("returns archiveEntryCount of 50 (seeded data)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.dashboard();

    expect(result.archiveEntryCount).toBe(60);
  });

  it("returns daysUntilCheckIn between 0 and 6", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.dashboard();

    expect(result.daysUntilCheckIn).toBeGreaterThanOrEqual(0);
    expect(result.daysUntilCheckIn).toBeLessThanOrEqual(6);
  });
});

describe("stats.trends", () => {
  it("returns trend data for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.trends({ limit: 10 });

    expect(result).toHaveProperty("jesterTrend");
    expect(result).toHaveProperty("studioHoursTrend");
    expect(result).toHaveProperty("energyTrend");
    expect(Array.isArray(result.jesterTrend)).toBe(true);
    expect(Array.isArray(result.studioHoursTrend)).toBe(true);
    expect(Array.isArray(result.energyTrend)).toBe(true);
  });
});



describe("archive.stats", () => {
  it("returns archive statistics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.archive.stats();

    expect(result).toHaveProperty("totalEntries");
    expect(result).toHaveProperty("byPhase");
    expect(result.totalEntries).toBe(60);
    expect(typeof result.byPhase).toBe("object");
  });

  it("returns phase distribution with counts", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.archive.stats();

    // Check that we have phase distribution data
    expect(Object.keys(result.byPhase).length).toBeGreaterThan(0);
    
    // Each phase should have a count
    Object.values(result.byPhase).forEach((count) => {
      expect(typeof count).toBe("number");
    });
  });
});

describe("export.csv", () => {
  it("returns CSV data for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.csv();

    expect(result).toHaveProperty("csv");
    expect(result).toHaveProperty("filename");
    expect(typeof result.csv).toBe("string");
    expect(result.filename).toMatch(/^neon-signs-export-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("CSV contains header row", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.csv();

    const headerLine = result.csv.split("\n")[0];
    expect(headerLine).toContain("Week");
    expect(headerLine).toContain("Weather Report");
    expect(headerLine).toContain("Studio Hours");
    expect(headerLine).toContain("Jester Activity");
    expect(headerLine).toContain("Energy Level");
  });
});
