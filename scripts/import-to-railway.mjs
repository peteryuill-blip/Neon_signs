/**
 * Import the SQL dump into Railway MySQL database.
 * Reads database_backup_2026-03-21.sql and executes it against the Railway DB.
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const RAILWAY_DB = process.env.RAILWAY_DB_URL || 'mysql://root:XlAeUXwhIpLjourkvAYRngXYDcAcLqyW@caboose.proxy.rlwy.net:24114/railway';

console.log('Connecting to Railway MySQL...');
const conn = await createConnection({
  uri: RAILWAY_DB,
  multipleStatements: true,
  ssl: { rejectUnauthorized: false },
});
console.log('Connected.\n');

const sqlFile = join(ROOT, 'database_backup_2026-03-21.sql');
const sql = readFileSync(sqlFile, 'utf8');

// Split on statement boundaries, handling multi-line INSERT blocks
// We'll execute the whole file at once using multipleStatements
console.log('Executing SQL dump...');
try {
  await conn.query(sql);
  console.log('✓ SQL dump imported successfully.\n');
} catch (err) {
  console.error('Error during import:', err.message);
  // Try statement-by-statement for better error reporting
  console.log('\nRetrying statement by statement...');
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let ok = 0, failed = 0;
  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      ok++;
    } catch (e) {
      // Skip known harmless errors
      if (e.code === 'ER_DUP_ENTRY' || e.code === 'ER_TABLE_EXISTS_ERROR') {
        ok++;
        continue;
      }
      console.error(`  FAILED: ${stmt.slice(0, 80)}...`);
      console.error(`  Error: ${e.message}\n`);
      failed++;
    }
  }
  console.log(`\nResult: ${ok} OK, ${failed} failed`);
}

// Verify row counts
console.log('\n=== Row counts in Railway DB ===');
const tables = [
  'works_core', 'archive_entries', 'materials', 'roundups',
  'work_mediums', 'work_surfaces', 'work_tools', 'contacts',
  'contact_log', 'roundup_works', 'users'
];
for (const table of tables) {
  try {
    const [rows] = await conn.query(`SELECT COUNT(*) as count FROM \`${table}\``);
    console.log(`  ${table}: ${rows[0].count} rows`);
  } catch (e) {
    console.log(`  ${table}: ERROR - ${e.message}`);
  }
}

await conn.end();
console.log('\n=== Import complete ===');
