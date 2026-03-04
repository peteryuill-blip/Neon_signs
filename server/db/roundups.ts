import { getDb, weeklyRoundups, InsertWeeklyRoundup, WeeklyRoundup, eq, desc, and, sql, or } from "./common";

export async function createWeeklyRoundup(roundup: InsertWeeklyRoundup): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(weeklyRoundups).values(roundup);
  return result[0].insertId;
}

export async function getWeeklyRoundupById(id: number): Promise<WeeklyRoundup | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(weeklyRoundups).where(eq(weeklyRoundups.id, id)).limit(1);
  return result[0];
}

export async function getWeeklyRoundupByWeekAndYear(userId: number, weekNumber: number, year: number): Promise<WeeklyRoundup | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(weeklyRoundups)
    .where(and(eq(weeklyRoundups.userId, userId), eq(weeklyRoundups.weekNumber, weekNumber), eq(weeklyRoundups.year, year)))
    .limit(1);
  return result[0];
}

export async function getAllEntriesForWeek(userId: number, weekNumber: number, year: number): Promise<WeeklyRoundup[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weeklyRoundups)
    .where(and(eq(weeklyRoundups.userId, userId), eq(weeklyRoundups.weekNumber, weekNumber), eq(weeklyRoundups.year, year)))
    .orderBy(weeklyRoundups.entryNumber);
}

export async function getEntryCountForWeek(userId: number, weekNumber: number, year: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(weeklyRoundups)
    .where(and(eq(weeklyRoundups.userId, userId), eq(weeklyRoundups.weekNumber, weekNumber), eq(weeklyRoundups.year, year)));
  return result[0]?.count ?? 0;
}

export async function hasSundayEntryForWeek(userId: number, weekNumber: number, year: number, checkInDay: string = 'Sunday'): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(weeklyRoundups)
    .where(and(eq(weeklyRoundups.userId, userId), eq(weeklyRoundups.weekNumber, weekNumber), eq(weeklyRoundups.year, year), eq(weeklyRoundups.createdDayOfWeek, checkInDay)));
  return (result[0]?.count ?? 0) > 0;
}

export async function getAllWeeklyRoundups(userId: number, limit = 52, offset = 0): Promise<WeeklyRoundup[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weeklyRoundups)
    .where(eq(weeklyRoundups.userId, userId))
    .orderBy(desc(weeklyRoundups.createdAt))
    .limit(limit).offset(offset);
}

export async function getWeeklyRoundupCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(weeklyRoundups).where(eq(weeklyRoundups.userId, userId));
  return result[0]?.count ?? 0;
}

export async function updateRoundupPhaseDna(id: number, phaseDna: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(weeklyRoundups).set({ phaseDnaAssigned: phaseDna }).where(eq(weeklyRoundups.id, id));
}

export async function updateWeeklyRoundup(
  id: number,
  userId: number,
  updates: Partial<Omit<InsertWeeklyRoundup, 'userId' | 'weekNumber' | 'year' | 'createdDayOfWeek'>>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getWeeklyRoundupById(id);
  if (!existing || existing.userId !== userId) {
    throw new Error("Roundup not found or access denied");
  }
  await db.update(weeklyRoundups).set(updates).where(eq(weeklyRoundups.id, id));
}

export async function getRoundupsForWeeks(
  userId: number,
  weeks: Array<{ weekNumber: number; year: number }>
): Promise<WeeklyRoundup[]> {
  const db = await getDb();
  if (!db || weeks.length === 0) return [];
  const conditions = weeks.map(w =>
    and(eq(weeklyRoundups.userId, userId), eq(weeklyRoundups.weekNumber, w.weekNumber), eq(weeklyRoundups.year, w.year))
  );
  const result = await db.select().from(weeklyRoundups)
    .where(or(...conditions))
    .orderBy(desc(weeklyRoundups.year), desc(weeklyRoundups.weekNumber), desc(weeklyRoundups.entryNumber));
  return result;
}

export async function getLastRoundup(userId: number): Promise<WeeklyRoundup | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(weeklyRoundups)
    .where(eq(weeklyRoundups.userId, userId))
    .orderBy(desc(weeklyRoundups.createdAt))
    .limit(1);
  return result[0];
}
