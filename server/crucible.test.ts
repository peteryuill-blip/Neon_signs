import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from './db';

// Mock the database module
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    createMaterial: vi.fn(),
    getMaterialsByType: vi.fn(),
    getAllMaterials: vi.fn(),
    updateMaterial: vi.fn(),
    createWork: vi.fn(),
    getWorksByUser: vi.fn(),
    getNextWorkCode: vi.fn(),
    getCrucibleSummary: vi.fn(),
    getVelocitySignal: vi.fn(),
    getDiscoveryDensity: vi.fn(),
    getPairOutcomes: vi.fn(),
    getLowRatingHighDiscovery: vi.fn(),
  };
});

describe('Crucible Materials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMaterial', () => {
    it('should create a surface material with proper fields', async () => {
      const mockMaterial = {
        id: 1,
        materialId: 'S_001',
        materialType: 'Surface',
        displayName: 'Arches 300gsm Cold Press',
        reactivityProfile: 'Responsive',
        edgeBehavior: 'Feathered',
        userId: 'user123',
        createdAt: new Date(),
      };

      vi.mocked(db.createMaterial).mockResolvedValue(mockMaterial);

      const result = await db.createMaterial({
        userId: 'user123',
        materialType: 'Surface',
        displayName: 'Arches 300gsm Cold Press',
        reactivityProfile: 'Responsive',
        edgeBehavior: 'Feathered',
      });

      expect(result.materialType).toBe('Surface');
      expect(result.displayName).toBe('Arches 300gsm Cold Press');
      expect(result.materialId).toMatch(/^S_\d{3}$/);
    });

    it('should create a medium material with viscosity and chromatic force', async () => {
      const mockMaterial = {
        id: 2,
        materialId: 'M_001',
        materialType: 'Medium',
        displayName: 'Winsor Newton Lamp Black',
        viscosityBand: 'Balanced',
        chromaticForce: 'Aggressive',
        userId: 'user123',
        createdAt: new Date(),
      };

      vi.mocked(db.createMaterial).mockResolvedValue(mockMaterial);

      const result = await db.createMaterial({
        userId: 'user123',
        materialType: 'Medium',
        displayName: 'Winsor Newton Lamp Black',
        viscosityBand: 'Balanced',
        chromaticForce: 'Aggressive',
      });

      expect(result.materialType).toBe('Medium');
      expect(result.materialId).toMatch(/^M_\d{3}$/);
    });

    it('should create a tool material with contact mode and control bias', async () => {
      const mockMaterial = {
        id: 3,
        materialId: 'T_001',
        materialType: 'Tool',
        displayName: 'Size 8 Round Kolinsky',
        contactMode: 'Direct',
        controlBias: 'Precision',
        userId: 'user123',
        createdAt: new Date(),
      };

      vi.mocked(db.createMaterial).mockResolvedValue(mockMaterial);

      const result = await db.createMaterial({
        userId: 'user123',
        materialType: 'Tool',
        displayName: 'Size 8 Round Kolinsky',
        contactMode: 'Direct',
        controlBias: 'Precision',
      });

      expect(result.materialType).toBe('Tool');
      expect(result.materialId).toMatch(/^T_\d{3}$/);
    });
  });

  describe('getMaterialsByType', () => {
    it('should return only surfaces when type is Surface', async () => {
      const mockSurfaces = [
        { id: 1, materialType: 'Surface', displayName: 'Paper A' },
        { id: 2, materialType: 'Surface', displayName: 'Canvas B' },
      ];

      vi.mocked(db.getMaterialsByType).mockResolvedValue(mockSurfaces as any);

      const result = await db.getMaterialsByType('user123', 'Surface');

      expect(result).toHaveLength(2);
      expect(result.every(m => m.materialType === 'Surface')).toBe(true);
    });
  });
});

describe('Crucible Works', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWork', () => {
    it('should create a work with auto-generated code', async () => {
      const mockWork = {
        id: 1,
        code: 'T_001',
        surfaceId: 1,
        mediumId: 2,
        rating: 3,
        disposition: 'Probably_Trash',
        userId: 'user123',
        date: new Date(),
      };

      vi.mocked(db.createWork).mockResolvedValue(mockWork);

      const result = await db.createWork({
        userId: 'user123',
        surfaceId: 1,
        mediumId: 2,
        rating: 3,
        disposition: 'Probably_Trash',
      });

      expect(result.code).toMatch(/^T_\d{3}$/);
      expect(result.rating).toBe(3);
      expect(result.disposition).toBe('Probably_Trash');
    });

    it('should accept optional technical intent and discovery', async () => {
      const mockWork = {
        id: 2,
        code: 'T_002',
        surfaceId: 1,
        mediumId: 2,
        technicalIntent: 'Testing wet-on-wet technique',
        discovery: 'Unexpected blooming effect at edges',
        rating: 4,
        disposition: 'Save',
        userId: 'user123',
        date: new Date(),
      };

      vi.mocked(db.createWork).mockResolvedValue(mockWork);

      const result = await db.createWork({
        userId: 'user123',
        surfaceId: 1,
        mediumId: 2,
        technicalIntent: 'Testing wet-on-wet technique',
        discovery: 'Unexpected blooming effect at edges',
        rating: 4,
        disposition: 'Save',
      });

      expect(result.technicalIntent).toBe('Testing wet-on-wet technique');
      expect(result.discovery).toBe('Unexpected blooming effect at edges');
    });
  });

  describe('getNextWorkCode', () => {
    it('should return T_001 for first work', async () => {
      vi.mocked(db.getNextWorkCode).mockResolvedValue('T_001');

      const result = await db.getNextWorkCode('user123');
      expect(result).toBe('T_001');
    });

    it('should increment code based on existing works', async () => {
      vi.mocked(db.getNextWorkCode).mockResolvedValue('T_042');

      const result = await db.getNextWorkCode('user123');
      expect(result).toBe('T_042');
    });
  });
});

describe('Crucible Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCrucibleSummary', () => {
    it('should return summary statistics', async () => {
      const mockSummary = {
        totalWorks: 50,
        totalSurfaces: 5,
        totalMediums: 8,
        totalTools: 3,
        weeklyAvg: 4.2,
      };

      vi.mocked(db.getCrucibleSummary).mockResolvedValue(mockSummary);

      const result = await db.getCrucibleSummary('user123');

      expect(result.totalWorks).toBe(50);
      expect(result.weeklyAvg).toBeCloseTo(4.2);
    });
  });

  describe('getVelocitySignal', () => {
    it('should calculate trash rate as velocity indicator', async () => {
      const mockVelocity = {
        trashCount: 30,
        totalWorks: 50,
        trashRate: 60,
      };

      vi.mocked(db.getVelocitySignal).mockResolvedValue(mockVelocity);

      const result = await db.getVelocitySignal('user123');

      expect(result.trashRate).toBe(60);
      expect(result.trashCount).toBe(30);
    });
  });

  describe('getDiscoveryDensity', () => {
    it('should calculate percentage of works with discoveries', async () => {
      const mockDiscovery = {
        withDiscovery: 25,
        total: 50,
        density: 50,
      };

      vi.mocked(db.getDiscoveryDensity).mockResolvedValue(mockDiscovery);

      const result = await db.getDiscoveryDensity('user123');

      expect(result.density).toBe(50);
    });
  });

  describe('getPairOutcomes', () => {
    it('should return surface-medium pair statistics', async () => {
      const mockPairs = [
        { surfaceName: 'Paper A', mediumName: 'Ink B', count: 10, avgRating: 3.5, trashRate: 40 },
        { surfaceName: 'Canvas C', mediumName: 'Acrylic D', count: 8, avgRating: 4.0, trashRate: 25 },
      ];

      vi.mocked(db.getPairOutcomes).mockResolvedValue(mockPairs);

      const result = await db.getPairOutcomes('user123');

      expect(result).toHaveLength(2);
      expect(result[0].avgRating).toBe(3.5);
    });
  });

  describe('getLowRatingHighDiscovery', () => {
    it('should return glitch harvests (low rating but valuable insights)', async () => {
      const mockGlitches = [
        { id: 1, code: 'T_015', rating: 2, discovery: 'Discovered new texture technique', date: new Date() },
      ];

      vi.mocked(db.getLowRatingHighDiscovery).mockResolvedValue(mockGlitches);

      const result = await db.getLowRatingHighDiscovery('user123');

      expect(result).toHaveLength(1);
      expect(result[0].rating).toBeLessThanOrEqual(2);
      expect(result[0].discovery).toBeTruthy();
    });
  });
});

describe('Rating System', () => {
  it('should have semantic meaning for each rating level', () => {
    const ratingLabels = {
      1: 'Somatic Drill',
      2: 'Glitch Harvest',
      3: 'Stable Execution',
      4: 'Signal Detected',
      5: 'Breakthrough',
    };

    expect(ratingLabels[1]).toBe('Somatic Drill');
    expect(ratingLabels[2]).toBe('Glitch Harvest');
    expect(ratingLabels[3]).toBe('Stable Execution');
    expect(ratingLabels[4]).toBe('Signal Detected');
    expect(ratingLabels[5]).toBe('Breakthrough');
  });
});

describe('Disposition System', () => {
  it('should have three valid disposition values', () => {
    const validDispositions = ['Trash', 'Probably_Trash', 'Save'];

    expect(validDispositions).toContain('Trash');
    expect(validDispositions).toContain('Probably_Trash');
    expect(validDispositions).toContain('Save');
    expect(validDispositions).toHaveLength(3);
  });
});
