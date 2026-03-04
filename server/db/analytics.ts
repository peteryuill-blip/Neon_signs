import { getDb, weeklyRoundups, worksCore, WorkCore, materials, workSurfaces, workMediums, workTools, eq, desc, and, sql } from "./common";
import { getWorkSurfaces, getWorkMediums, getWorkTools } from "./works";
import { getAllWeeklyRoundups } from "./roundups";

// ============ STATS/TRENDS QUERIES ============

export async function getTotalStudioHours(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: sql<number>`COALESCE(SUM(studioHours), 0)` })
    .from(weeklyRoundups).where(eq(weeklyRoundups.userId, userId));
  return result[0]?.total ?? 0;
}

export async function getAverageJesterActivity(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ avg: sql<number>`COALESCE(AVG(jesterActivity), 0)` })
    .from(weeklyRoundups).where(eq(weeklyRoundups.userId, userId));
  return Math.round((result[0]?.avg ?? 0) * 10) / 10;
}

export async function getEnergyLevelDistribution(userId: number): Promise<{ hot: number; sustainable: number; depleted: number }> {
  const db = await getDb();
  if (!db) return { hot: 0, sustainable: 0, depleted: 0 };
  const result = await db.select({
    energyLevel: weeklyRoundups.energyLevel,
    count: sql<number>`count(*)`
  }).from(weeklyRoundups).where(eq(weeklyRoundups.userId, userId)).groupBy(weeklyRoundups.energyLevel);
  const distribution = { hot: 0, sustainable: 0, depleted: 0 };
  for (const row of result) {
    if (row.energyLevel in distribution) {
      distribution[row.energyLevel as keyof typeof distribution] = row.count;
    }
  }
  return distribution;
}

export async function getJesterTrend(userId: number, limit = 12): Promise<{ weekNumber: number; year: number; jesterActivity: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    weekNumber: weeklyRoundups.weekNumber, year: weeklyRoundups.year, jesterActivity: weeklyRoundups.jesterActivity
  }).from(weeklyRoundups).where(eq(weeklyRoundups.userId, userId)).orderBy(desc(weeklyRoundups.createdAt)).limit(limit);
  return result.reverse();
}

export async function getStudioHoursTrend(userId: number, limit = 12): Promise<{ weekNumber: number; year: number; studioHours: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    weekNumber: weeklyRoundups.weekNumber, year: weeklyRoundups.year, studioHours: weeklyRoundups.studioHours
  }).from(weeklyRoundups).where(eq(weeklyRoundups.userId, userId)).orderBy(desc(weeklyRoundups.createdAt)).limit(limit);
  return result.reverse();
}

// ============ CRUCIBLE ANALYTICS QUERIES ============

export async function getRatingDistributionBySurface(userId: number): Promise<Array<{ surfaceId: number; displayName: string; rating: number; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT w.surfaceId, m.displayName, w.rating, COUNT(*) as count
    FROM works_core w JOIN materials m ON w.surfaceId = m.id
    WHERE w.userId = ${userId} GROUP BY w.surfaceId, m.displayName, w.rating ORDER BY m.displayName, w.rating
  `);
  return result[0] as unknown as Array<{ surfaceId: number; displayName: string; rating: number; count: number }>;
}

export async function getRatingDistributionByMedium(userId: number): Promise<Array<{ mediumId: number; displayName: string; rating: number; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT w.mediumId, m.displayName, w.rating, COUNT(*) as count
    FROM works_core w JOIN materials m ON w.mediumId = m.id
    WHERE w.userId = ${userId} GROUP BY w.mediumId, m.displayName, w.rating ORDER BY m.displayName, w.rating
  `);
  return result[0] as unknown as Array<{ mediumId: number; displayName: string; rating: number; count: number }>;
}

export async function getSurfaceMediumPairOutcomes(userId: number): Promise<Array<{ surfaceName: string; mediumName: string; avgRating: number; count: number; trashRate: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT s.displayName as surfaceName, m.displayName as mediumName,
      AVG(w.rating) as avgRating, COUNT(*) as count,
      SUM(CASE WHEN w.disposition = 'Trash' THEN 1 ELSE 0 END) / COUNT(*) * 100 as trashRate
    FROM works_core w JOIN materials s ON w.surfaceId = s.id JOIN materials m ON w.mediumId = m.id
    WHERE w.userId = ${userId} GROUP BY s.displayName, m.displayName HAVING COUNT(*) >= 2 ORDER BY avgRating DESC
  `);
  return result[0] as unknown as Array<{ surfaceName: string; mediumName: string; avgRating: number; count: number; trashRate: number }>;
}

export async function getTrashRateAsVelocitySignal(userId: number): Promise<{ totalWorks: number; trashCount: number; trashRate: number; weeklyAvg: number }> {
  const db = await getDb();
  if (!db) return { totalWorks: 0, trashCount: 0, trashRate: 0, weeklyAvg: 0 };
  const result = await db.execute(sql`
    SELECT COUNT(*) as totalWorks,
      COALESCE(SUM(CASE WHEN disposition IN ('Trash', 'Probably_Trash') THEN 1 ELSE 0 END), 0) as trashCount,
      COALESCE(SUM(CASE WHEN disposition IN ('Trash', 'Probably_Trash') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 0) as trashRate,
      COUNT(*) / GREATEST(DATEDIFF(NOW(), MIN(date)) / 7, 1) as weeklyAvg
    FROM works_core WHERE userId = ${userId}
  `);
  const rows = result[0] as unknown as any[];
  const row = rows?.[0];
  return {
    totalWorks: Number(row?.totalWorks ?? 0), trashCount: Number(row?.trashCount ?? 0),
    trashRate: Number(row?.trashRate ?? 0), weeklyAvg: Number(row?.weeklyAvg ?? 0)
  };
}

export async function getDiscoveryDensity(userId: number): Promise<{ withDiscovery: number; total: number; density: number }> {
  const db = await getDb();
  if (!db) return { withDiscovery: 0, total: 0, density: 0 };
  const result = await db.execute(sql`
    SELECT SUM(CASE WHEN discovery IS NOT NULL AND discovery != '' THEN 1 ELSE 0 END) as withDiscovery, COUNT(*) as total
    FROM works_core WHERE userId = ${userId}
  `);
  const rows = result[0] as unknown as any[];
  const row = rows?.[0];
  const withDiscovery = row?.withDiscovery ?? 0;
  const total = row?.total ?? 0;
  return { withDiscovery, total, density: total > 0 ? (withDiscovery / total) * 100 : 0 };
}

export async function getLowRatingHighDiscoveryPatterns(userId: number): Promise<WorkCore[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(worksCore)
    .where(and(eq(worksCore.userId, userId), sql`${worksCore.rating} <= 2`, sql`${worksCore.discovery} IS NOT NULL AND LENGTH(${worksCore.discovery}) > 20`))
    .orderBy(desc(worksCore.date)).limit(20);
}

// ===== CRUCIBLE ANALYTICS DETAILED QUERIES =====

export async function getMaterialUsageStats() {
  const db = await getDb();
  if (!db) return { surfaceUsage: [], mediumUsage: [], toolUsage: [] };
  const surfaceUsage = await db.select({
    materialId: materials.id, code: materials.code, name: materials.displayName,
    usageCount: sql<number>`COUNT(${workSurfaces.workId})`.as('usage_count'),
  }).from(materials).leftJoin(workSurfaces, eq(materials.id, workSurfaces.surfaceId))
    .where(eq(materials.materialType, 'Surface')).groupBy(materials.id).orderBy(desc(sql`usage_count`));
  const mediumUsage = await db.select({
    materialId: materials.id, code: materials.code, name: materials.displayName,
    usageCount: sql<number>`COUNT(${workMediums.workId})`.as('usage_count'),
  }).from(materials).leftJoin(workMediums, eq(materials.id, workMediums.mediumId))
    .where(eq(materials.materialType, 'Medium')).groupBy(materials.id).orderBy(desc(sql`usage_count`));
  const toolUsage = await db.select({
    materialId: materials.id, code: materials.code, name: materials.displayName,
    usageCount: sql<number>`COUNT(${workTools.workId})`.as('usage_count'),
  }).from(materials).leftJoin(workTools, eq(materials.id, workTools.toolId))
    .where(eq(materials.materialType, 'Tool')).groupBy(materials.id).orderBy(desc(sql`usage_count`));
  return { surfaceUsage, mediumUsage, toolUsage };
}

export async function getRatingDistribution() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ rating: worksCore.rating, count: sql<number>`COUNT(*)`.as('count') })
    .from(worksCore).groupBy(worksCore.rating).orderBy(worksCore.rating);
}

export async function getDispositionBreakdown() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ disposition: worksCore.disposition, count: sql<number>`COUNT(*)`.as('count') })
    .from(worksCore).groupBy(worksCore.disposition).orderBy(desc(sql`count`));
}

export async function getDimensionalStats() {
  const db = await getDb();
  if (!db) return null;
  const stats = await db.select({
    avgHeight: sql<number>`AVG(${worksCore.heightCm})`.as('avg_height'),
    minHeight: sql<number>`MIN(${worksCore.heightCm})`.as('min_height'),
    maxHeight: sql<number>`MAX(${worksCore.heightCm})`.as('max_height'),
    avgWidth: sql<number>`AVG(${worksCore.widthCm})`.as('avg_width'),
    minWidth: sql<number>`MIN(${worksCore.widthCm})`.as('min_width'),
    maxWidth: sql<number>`MAX(${worksCore.widthCm})`.as('max_width'),
    totalArea: sql<number>`SUM(${worksCore.heightCm} * ${worksCore.widthCm})`.as('total_area'),
  }).from(worksCore);
  return stats[0] || null;
}

export async function getTimeInvestmentStats() {
  const db = await getDb();
  if (!db) return null;
  const stats = await db.select({
    totalHours: sql<number>`SUM(${worksCore.hours})`.as('total_hours'),
    avgHours: sql<number>`AVG(${worksCore.hours})`.as('avg_hours'),
    minHours: sql<number>`MIN(${worksCore.hours})`.as('min_hours'),
    maxHours: sql<number>`MAX(${worksCore.hours})`.as('max_hours'),
    worksWithHours: sql<number>`COUNT(CASE WHEN ${worksCore.hours} IS NOT NULL THEN 1 END)`.as('works_with_hours'),
  }).from(worksCore);
  return stats[0] || null;
}

export async function getTemporalTrends() {
  const db = await getDb();
  if (!db) return { worksPerWeek: [], ratingOverTime: [], trashRateOverTime: [] };
  const worksPerWeekRaw = await db.select({
    yearWeek: sql<number>`YEARWEEK(${worksCore.date}, 1)`.as('year_week'),
    count: sql<number>`COUNT(*)`.as('count'),
    minDate: sql<string>`MIN(${worksCore.date})`.as('min_date'),
  }).from(worksCore).groupBy(sql`year_week`).orderBy(sql`year_week`);
  const worksPerWeek = worksPerWeekRaw.map((row, index) => ({ week: `W${index + 1}`, count: row.count }));
  const ratingOverTimeRaw = await db.select({
    yearWeek: sql<number>`YEARWEEK(${worksCore.date}, 1)`.as('year_week'),
    avgRating: sql<number>`AVG(${worksCore.rating})`.as('avg_rating'),
  }).from(worksCore).groupBy(sql`year_week`).orderBy(sql`year_week`);
  const ratingOverTime = ratingOverTimeRaw.map((row, index) => ({ month: `W${index + 1}`, avgRating: row.avgRating }));
  const trashRateOverTimeRaw = await db.select({
    yearWeek: sql<number>`YEARWEEK(${worksCore.date}, 1)`.as('year_week'),
    trashRate: sql<number>`(SUM(CASE WHEN ${worksCore.disposition} IN ('Trash', 'Probably_Trash') THEN 1 ELSE 0 END) * 100.0 / COUNT(*))`.as('trash_rate'),
  }).from(worksCore).groupBy(sql`year_week`).orderBy(sql`year_week`);
  const trashRateOverTime = trashRateOverTimeRaw.map((row, index) => ({ month: `W${index + 1}`, trashRate: row.trashRate }));
  return { worksPerWeek, ratingOverTime, trashRateOverTime };
}

// ===== UNIFIED EXPORT =====

export async function getUnifiedExportData(userId: number): Promise<{
  roundups: Array<{
    week: number; year: number; date: string; weatherReport: string; studioHours: number;
    worksMade: string; jesterActivity: number; energyLevel: string; walkingEngineUsed: boolean;
    walkingInsights: string | null; partnershipTemperature: string; thingWorked: string;
    thingResisted: string; somaticState: string; doorIntention: string | null; phaseDna: string | null;
    weeklySteps: number | null; avgDailySteps: number | null;
  }>;
  trials: Array<{
    code: string; date: string; week: number; rating: number | null; disposition: string;
    surfaces: string; mediums: string; tools: string; technicalIntent: string | null;
    discovery: string | null; heightCm: number | null; widthCm: number | null; hours: number | null;
  }>;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const roundups = await getAllWeeklyRoundups(userId, 1000, 0);
  const works = await db.select().from(worksCore).where(eq(worksCore.userId, userId)).orderBy(desc(worksCore.date));
  const trials = [];
  for (const work of works) {
    const surfaces = await getWorkSurfaces(work.id);
    const mediums = await getWorkMediums(work.id);
    const tools = await getWorkTools(work.id);
    const workDate = new Date(work.date);
    const matchingRoundup = roundups.find(r => {
      const rDate = new Date(r.createdAt);
      const diffDays = Math.abs((workDate.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 7 && r.weekNumber >= 0;
    });
    trials.push({
      code: work.code, date: workDate.toISOString().split('T')[0],
      week: matchingRoundup?.weekNumber ?? -1, rating: work.rating, disposition: work.disposition,
      surfaces: surfaces.map(s => s.code || s.displayName).join('; '),
      mediums: mediums.map(m => m.code || m.displayName).join('; '),
      tools: tools.map(t => t.code || t.displayName).join('; '),
      technicalIntent: work.technicalIntent, discovery: work.discovery,
      heightCm: work.heightCm, widthCm: work.widthCm, hours: work.hours,
    });
  }
  return {
    roundups: roundups.map(r => ({
      week: r.weekNumber, year: r.year, date: r.createdAt.toISOString().split('T')[0],
      weatherReport: r.weatherReport, studioHours: r.studioHours, worksMade: r.worksMade,
      jesterActivity: r.jesterActivity, energyLevel: r.energyLevel, walkingEngineUsed: r.walkingEngineUsed,
      walkingInsights: r.walkingInsights, partnershipTemperature: r.partnershipTemperature,
      thingWorked: r.thingWorked, thingResisted: r.thingResisted, somaticState: r.somaticState,
      doorIntention: r.doorIntention, phaseDna: r.phaseDnaAssigned,
      weeklySteps: r.weeklyStepTotal, avgDailySteps: r.dailyStepAverage,
    })),
    trials,
  };
}
