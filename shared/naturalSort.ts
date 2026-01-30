/**
 * Natural sort for material codes (S1, S2, S10 instead of S1, S10, S2)
 * Handles codes like: S1, MB2, T10, etc.
 */
export function naturalSortByCode<T extends { code?: string | null }>(items: T[]): T[] {
  return items.sort((a, b) => {
    const codeA = a.code || '';
    const codeB = b.code || '';
    
    // Extract letter prefix and number
    const matchA = codeA.match(/^([A-Z]+)(\d+)$/i);
    const matchB = codeB.match(/^([A-Z]+)(\d+)$/i);
    
    if (!matchA && !matchB) {
      // Neither has a valid code format, fallback to string comparison
      return codeA.localeCompare(codeB);
    }
    
    if (!matchA) return 1; // B has valid code, A doesn't - B comes first
    if (!matchB) return -1; // A has valid code, B doesn't - A comes first
    
    const [, prefixA, numA] = matchA;
    const [, prefixB, numB] = matchB;
    
    // First compare prefixes (S vs MB)
    const prefixCompare = prefixA.localeCompare(prefixB);
    if (prefixCompare !== 0) return prefixCompare;
    
    // Same prefix, compare numbers numerically
    return parseInt(numA, 10) - parseInt(numB, 10);
  });
}
