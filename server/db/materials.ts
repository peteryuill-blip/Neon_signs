import { getDb, materials, InsertMaterial, Material, eq, desc, and, sql } from "./common";

export async function createMaterial(material: InsertMaterial): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(materials).values(material);
  return result[0].insertId;
}

export async function getMaterialById(id: number): Promise<Material | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
  return result[0];
}

export async function getMaterialByMaterialId(materialId: string): Promise<Material | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(materials).where(eq(materials.materialId, materialId)).limit(1);
  return result[0];
}

export async function getAllMaterials(userId: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(materials)
    .where(eq(materials.userId, userId))
    .orderBy(materials.materialType, materials.displayName);
}

export async function getMaterialsByType(userId: number, materialType: 'Surface' | 'Medium' | 'Tool'): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(materials)
    .where(and(eq(materials.userId, userId), eq(materials.materialType, materialType)))
    .orderBy(materials.displayName);
}

export async function getNextMaterialCode(userId: number, materialType: 'Surface' | 'Medium' | 'Tool'): Promise<string> {
  const db = await getDb();
  if (!db) return materialType === 'Surface' ? 'S_001' : materialType === 'Medium' ? 'M_001' : 'T_001';
  const prefix = materialType === 'Surface' ? 'S' : materialType === 'Medium' ? 'M' : 'T';
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(materials)
    .where(and(eq(materials.userId, userId), eq(materials.materialType, materialType)));
  const count = (result[0]?.count ?? 0) + 1;
  return `${prefix}_${String(count).padStart(3, '0')}`;
}

export async function updateMaterial(id: number, updates: Partial<InsertMaterial>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getMaterialById(id);
  if (existing && existing.usedInWorksCount > 0) {
    throw new Error("Cannot edit material that has been used in works");
  }
  await db.update(materials).set(updates).where(eq(materials.id, id));
}

export async function incrementMaterialUsage(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(materials)
    .set({
      usedInWorksCount: sql`${materials.usedInWorksCount} + 1`,
      firstUsedDate: sql`COALESCE(${materials.firstUsedDate}, NOW())`
    })
    .where(eq(materials.id, id));
}
