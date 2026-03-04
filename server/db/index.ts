// Barrel file — re-exports all domain modules for backward compatibility
// Import from "server/db" continues to work exactly as before

export { getDb } from "./common";
export * from "./users";
export * from "./roundups";
export * from "./archive";
export * from "./settings";
export * from "./materials";
export * from "./works";
export * from "./analytics";
