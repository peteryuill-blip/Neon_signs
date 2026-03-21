/**
 * dataApi.ts — Manus Forge Data API stub
 *
 * The Manus Forge Data API is not available outside the Manus platform.
 * This stub throws a clear error so callers know to replace with a
 * direct API integration (e.g., YouTube Data API, SerpAPI, etc.).
 *
 * NEON SIGNS does not currently use this helper in any active feature.
 */

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  apiId: string,
  _options: DataApiCallOptions = {}
): Promise<unknown> {
  throw new Error(
    `callDataApi("${apiId}") is not available outside the Manus platform. ` +
    "Replace with a direct API integration."
  );
}
