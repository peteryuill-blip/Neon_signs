import { getDb, worksCore, InsertWorkCore, WorkCore, workSurfaces, workMediums, workTools, materials, Material, eq, desc, and, sql } from "./common";
import { incrementMaterialUsage } from "./materials";

export async function createWork(
  work: Omit<InsertWorkCore, 'surfaceId' | 'mediumId' | 'toolId'>,
  surfaceIds: number[],
  mediumIds: number[],
  toolIds?: number[]
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(worksCore).values(work as any);
  const workId = result[0].insertId;
  for (const surfaceId of surfaceIds) {
    await db.insert(workSurfaces).values({ workId, surfaceId });
    await incrementMaterialUsage(surfaceId);
  }
  for (const mediumId of mediumIds) {
    await db.insert(workMediums).values({ workId, mediumId });
    await incrementMaterialUsage(mediumId);
  }
  if (toolIds && toolIds.length > 0) {
    for (const toolId of toolIds) {
      await db.insert(workTools).values({ workId, toolId });
      await incrementMaterialUsage(toolId);
    }
  }
  return workId;
}

export async function getWorkById(id: number): Promise<WorkCore | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(worksCore).where(eq(worksCore.id, id)).limit(1);
  return result[0];
}

export async function getWorkByCode(code: string): Promise<WorkCore | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(worksCore).where(eq(worksCore.code, code)).limit(1);
  return result[0];
}

export async function getAllWorks(userId: number, limit = 100, offset = 0): Promise<WorkCore[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(worksCore)
    .where(eq(worksCore.userId, userId))
    .orderBy(desc(worksCore.date))
    .limit(limit).offset(offset);
}

export async function getWorksCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(worksCore).where(eq(worksCore.userId, userId));
  return result[0]?.count ?? 0;
}

export async function getNextWorkCode(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return 'T_001';
  const result = await db.select({ count: sql<number>`count(*)` }).from(worksCore).where(eq(worksCore.userId, userId));
  const count = (result[0]?.count ?? 0) + 1;
  return `T_${String(count).padStart(3, '0')}`;
}

export async function updateWork(id: number, updates: Partial<InsertWorkCore>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(worksCore).set(updates).where(eq(worksCore.id, id));
}

export async function getWorkSurfaces(workId: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT m.* FROM materials m INNER JOIN work_surfaces ws ON m.id = ws.surfaceId WHERE ws.workId = ${workId}
  `);
  return result[0] as unknown as Material[];
}

export async function getWorkMediums(workId: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT m.* FROM materials m INNER JOIN work_mediums wm ON m.id = wm.mediumId WHERE wm.workId = ${workId}
  `);
  return result[0] as unknown as Material[];
}

export async function getWorkTools(workId: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT m.* FROM materials m INNER JOIN work_tools wt ON m.id = wt.toolId WHERE wt.workId = ${workId}
  `);
  return result[0] as unknown as Material[];
}

export async function updateWorkMaterials(
  workId: number,
  surfaceIds: number[],
  mediumIds: number[],
  toolIds?: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workSurfaces).where(eq(workSurfaces.workId, workId));
  await db.delete(workMediums).where(eq(workMediums.workId, workId));
  await db.delete(workTools).where(eq(workTools.workId, workId));
  for (const surfaceId of surfaceIds) {
    await db.insert(workSurfaces).values({ workId, surfaceId });
  }
  for (const mediumId of mediumIds) {
    await db.insert(workMediums).values({ workId, mediumId });
  }
  if (toolIds && toolIds.length > 0) {
    for (const toolId of toolIds) {
      await db.insert(workTools).values({ workId, toolId });
    }
  }
}

export async function getAllWorksForExport(): Promise<Array<{
  code: string; date: Date; rating: number | null; disposition: string;
  surfaces: string; mediums: string; tools: string;
  technicalIntent: string | null; discovery: string | null;
  heightCm: number | null; widthCm: number | null; hours: number | null;
}>> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const works = await db.select().from(worksCore).orderBy(desc(worksCore.date));
  const result = [];
  for (const work of works) {
    const surfaces = await getWorkSurfaces(work.id);
    const mediums = await getWorkMediums(work.id);
    const tools = await getWorkTools(work.id);
    result.push({
      code: work.code, date: work.date, rating: work.rating, disposition: work.disposition,
      surfaces: surfaces.map(s => s.code).join('; '),
      mediums: mediums.map(m => m.code).join('; '),
      tools: tools.map(t => t.code).join('; '),
      technicalIntent: work.technicalIntent, discovery: work.discovery,
      heightCm: work.heightCm, widthCm: work.widthCm, hours: work.hours,
    });
  }
  return result;
}

export async function getWorksForDateRange(
  userId: number, startDate: Date, endDate: Date
): Promise<Array<WorkCore & { surfaces: string; mediums: string; tools: string }>> {
  const db = await getDb();
  if (!db) return [];
  const works = await db.select().from(worksCore)
    .where(and(eq(worksCore.userId, userId), sql`${worksCore.date} >= ${startDate}`, sql`${worksCore.date} < ${endDate}`))
    .orderBy(desc(worksCore.date));
  const result = [];
  for (const work of works) {
    const surfaces = await getWorkSurfaces(work.id);
    const mediums = await getWorkMediums(work.id);
    const tools = await getWorkTools(work.id);
    result.push({
      ...work,
      surfaces: surfaces.map(s => s.code || s.displayName).join(', '),
      mediums: mediums.map(m => m.code || m.displayName).join(', '),
      tools: tools.map(t => t.code || t.displayName).join(', '),
    });
  }
  return result;
}

export async function getLastTrialDefaults(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [lastWork] = await db.select().from(worksCore)
    .where(eq(worksCore.userId, userId))
    .orderBy(desc(worksCore.date), desc(worksCore.id))
    .limit(1);
  if (!lastWork) return null;
  const surfaces = await getWorkSurfaces(lastWork.id);
  const mediums = await getWorkMediums(lastWork.id);
  const tools = await getWorkTools(lastWork.id);
  return {
    surfaceIds: surfaces.map(s => s.id),
    mediumIds: mediums.map(m => m.id),
    toolIds: tools.map(t => t.id),
    surfaceNames: surfaces.map(s => `${s.displayName} (${s.code})`).join(', '),
    mediumNames: mediums.map(m => `${m.displayName} (${m.code})`).join(', '),
    toolNames: tools.map(t => `${t.displayName} (${t.code})`).join(', '),
    heightCm: lastWork.heightCm,
    widthCm: lastWork.widthCm,
  };
}

export async function getCommonDimensions(userId: number): Promise<Array<{ height: number; width: number; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT heightCm as height, widthCm as width, COUNT(*) as count
    FROM works_core
    WHERE userId = ${userId} AND heightCm IS NOT NULL AND widthCm IS NOT NULL
    GROUP BY heightCm, widthCm ORDER BY count DESC LIMIT 5
  `);
  return (result[0] as unknown as Array<{ height: number; width: number; count: number }>).filter(d => d.height && d.width);
}
