/**
 * sdk.ts — Legacy compatibility shim
 *
 * The Manus OAuth SDK has been replaced by localAuth.ts.
 * This file is kept to avoid breaking any remaining import references
 * during the migration period. It re-exports the local auth functions
 * under the same interface that context.ts previously used.
 *
 * Once all references to `sdk` are removed, this file can be deleted.
 */

export { authenticateRequest, createSessionToken, verifySessionCookie } from "./localAuth";
