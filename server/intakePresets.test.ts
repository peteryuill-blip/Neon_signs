import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createIntakePreset,
  getIntakePresetsForUser,
  getIntakePresetById,
  updateIntakePreset,
  deleteIntakePreset,
  addPresetSurface,
  addPresetMedium,
  addPresetTool,
  getPresetSurfaces,
  getPresetMediums,
  getPresetTools,
  removePresetSurface,
  removePresetMedium,
  removePresetTool,
  savePresetFromCurrentSelection,
  createMaterial,
} from './db';

const TEST_USER_ID = 9999;
const TEST_PRESET_NAME = 'Test Preset';
const TEST_PRESET_DESCRIPTION = 'A test preset for unit testing';

describe('Intake Presets', () => {
  let presetId: number;
  let surfaceId: number;
  let mediumId: number;
  let toolId: number;

  beforeAll(async () => {
    // Create test materials
    surfaceId = await createMaterial({
      userId: TEST_USER_ID,
      materialType: 'Surface',
      materialId: `TEST_SURFACE_${Date.now()}`,
      displayName: 'Test Surface',
      code: 'TS_001',
      usedInWorksCount: 0,
    });

    mediumId = await createMaterial({
      userId: TEST_USER_ID,
      materialType: 'Medium',
      materialId: `TEST_MEDIUM_${Date.now()}`,
      displayName: 'Test Medium',
      code: 'TM_001',
      usedInWorksCount: 0,
    });

    toolId = await createMaterial({
      userId: TEST_USER_ID,
      materialType: 'Tool',
      materialId: `TEST_TOOL_${Date.now()}`,
      displayName: 'Test Tool',
      code: 'TT_001',
      usedInWorksCount: 0,
    });
  });

  it('should create a new intake preset', async () => {
    presetId = await createIntakePreset({
      userId: TEST_USER_ID,
      name: TEST_PRESET_NAME,
      description: TEST_PRESET_DESCRIPTION,
      sortOrder: 0,
    });

    expect(presetId).toBeGreaterThan(0);
  });

  it('should retrieve preset by ID', async () => {
    const preset = await getIntakePresetById(presetId, TEST_USER_ID);

    expect(preset).toBeDefined();
    expect(preset?.name).toBe(TEST_PRESET_NAME);
    expect(preset?.description).toBe(TEST_PRESET_DESCRIPTION);
    expect(preset?.userId).toBe(TEST_USER_ID);
  });

  it('should add surface to preset', async () => {
    await addPresetSurface(presetId, surfaceId);

    const surfaces = await getPresetSurfaces(presetId);
    expect(surfaces).toContain(surfaceId);
  });

  it('should add medium to preset', async () => {
    await addPresetMedium(presetId, mediumId);

    const mediums = await getPresetMediums(presetId);
    expect(mediums).toContain(mediumId);
  });

  it('should add tool to preset', async () => {
    await addPresetTool(presetId, toolId);

    const tools = await getPresetTools(presetId);
    expect(tools).toContain(toolId);
  });

  it('should get all presets for user with materials', async () => {
    const presets = await getIntakePresetsForUser(TEST_USER_ID);

    expect(presets.length).toBeGreaterThan(0);
    const testPreset = presets.find((p) => p.preset.id === presetId);
    expect(testPreset).toBeDefined();
    expect(testPreset?.surfaceIds).toContain(surfaceId);
    expect(testPreset?.mediumIds).toContain(mediumId);
    expect(testPreset?.toolIds).toContain(toolId);
  });

  it('should remove surface from preset', async () => {
    await removePresetSurface(presetId, surfaceId);

    const surfaces = await getPresetSurfaces(presetId);
    expect(surfaces).not.toContain(surfaceId);
  });

  it('should remove medium from preset', async () => {
    await removePresetMedium(presetId, mediumId);

    const mediums = await getPresetMediums(presetId);
    expect(mediums).not.toContain(mediumId);
  });

  it('should remove tool from preset', async () => {
    await removePresetTool(presetId, toolId);

    const tools = await getPresetTools(presetId);
    expect(tools).not.toContain(toolId);
  });

  it('should update preset name and description', async () => {
    const newName = 'Updated Preset Name';
    const newDescription = 'Updated description';

    await updateIntakePreset(presetId, TEST_USER_ID, {
      name: newName,
      description: newDescription,
    });

    const updated = await getIntakePresetById(presetId, TEST_USER_ID);
    expect(updated?.name).toBe(newName);
    expect(updated?.description).toBe(newDescription);
  });

  it('should save preset from current selection', async () => {
    const newPresetId = await savePresetFromCurrentSelection(
      TEST_USER_ID,
      'Quick Save Preset',
      'Saved from current selection',
      [surfaceId],
      [mediumId],
      [toolId]
    );

    expect(newPresetId).toBeGreaterThan(0);

    const surfaces = await getPresetSurfaces(newPresetId);
    const mediums = await getPresetMediums(newPresetId);
    const tools = await getPresetTools(newPresetId);

    expect(surfaces).toContain(surfaceId);
    expect(mediums).toContain(mediumId);
    expect(tools).toContain(toolId);
  });

  it('should delete preset and all associated materials', async () => {
    const presetToDelete = await createIntakePreset({
      userId: TEST_USER_ID,
      name: 'Preset to Delete',
      description: 'This will be deleted',
      sortOrder: 0,
    });

    await addPresetSurface(presetToDelete, surfaceId);
    await addPresetMedium(presetToDelete, mediumId);
    await addPresetTool(presetToDelete, toolId);

    // Verify materials were added
    let surfaces = await getPresetSurfaces(presetToDelete);
    expect(surfaces).toContain(surfaceId);

    // Delete preset
    await deleteIntakePreset(presetToDelete, TEST_USER_ID);

    // Verify preset is gone
    const deleted = await getIntakePresetById(presetToDelete, TEST_USER_ID);
    expect(deleted).toBeUndefined();

    // Verify materials are gone
    surfaces = await getPresetSurfaces(presetToDelete);
    expect(surfaces).toHaveLength(0);
  });

  it('should prevent access to other users presets', async () => {
    const otherUserId = TEST_USER_ID + 1;

    // Try to access preset from different user
    const preset = await getIntakePresetById(presetId, otherUserId);
    expect(preset).toBeUndefined();
  });

  it('should prevent updating other users presets', async () => {
    const otherUserId = TEST_USER_ID + 1;

    try {
      await updateIntakePreset(presetId, otherUserId, {
        name: 'Hacked Name',
      });
      expect.fail('Should have thrown error');
    } catch (error) {
      expect((error as Error).message).toContain('access denied');
    }
  });

  it('should prevent deleting other users presets', async () => {
    const otherUserId = TEST_USER_ID + 1;

    try {
      await deleteIntakePreset(presetId, otherUserId);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect((error as Error).message).toContain('access denied');
    }
  });
});
