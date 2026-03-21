/**
 * oauth.ts — Legacy Manus OAuth handler (DISABLED)
 *
 * Manus OAuth has been replaced by local password-based auth in localAuth.ts.
 * This file is kept as a reference but is no longer registered in index.ts.
 */

export function registerOAuthRoutes(_app: unknown) {
  // No-op: OAuth routes have been replaced by registerLocalAuthRoutes() in localAuth.ts
  console.log("[OAuth] Manus OAuth routes disabled — using local auth instead");
}
