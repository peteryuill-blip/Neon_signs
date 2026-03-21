/**
 * Database export script for NEON SIGNS migration
 * Exports: full SQL dump + per-table CSV files
 * Usage: node scripts/export-db.mjs
 */

import { execSync } from 'child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Parse DATABASE_URL
const url = process.env.DATABASE_URL || '';
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!match) {
  console.error('ERROR: Could not parse DATABASE_URL');
  process.exit(1);
}

const [, user, password, host, port, database] = match;
const today = new Date().toISOString().split('T')[0];

console.log(`\n=== NEON SIGNS Database Export ===`);
console.log(`Host: ${host}:${port}`);
console.log(`Database: ${database}`);
console.log(`Date: ${today}\n`);

// Create output directories
const dataExportDir = resolve(ROOT, 'data_export');
mkdirSync(dataExportDir, { recursive: true });

// ─── STEP 1: SQL DUMP ────────────────────────────────────────────────────────
console.log('Step 1: Generating SQL dump...');
const sqlFile = resolve(ROOT, `database_backup_${today}.sql`);

try {
  execSync(
    `mysqldump \
      --host="${host}" \
      --port="${port}" \
      --user="${user}" \
      --password="${password}" \
      --ssl-mode=REQUIRED \
      --single-transaction \
      --routines \
      --triggers \
      --complete-insert \
      --extended-insert \
      --add-drop-table \
      --add-drop-database \
      --databases "${database}" \
      > "${sqlFile}"`,
    { stdio: ['inherit', 'inherit', 'pipe'] }
  );
  console.log(`  ✓ SQL dump saved: database_backup_${today}.sql`);
} catch (err) {
  console.error('  ✗ SQL dump failed:', err.stderr?.toString() || err.message);
  // Try without --ssl-mode flag (older mysqldump)
  try {
    execSync(
      `mysqldump \
        --host="${host}" \
        --port="${port}" \
        --user="${user}" \
        --password="${password}" \
        --ssl \
        --single-transaction \
        --routines \
        --triggers \
        --complete-insert \
        --extended-insert \
        --add-drop-table \
        "${database}" \
        > "${sqlFile}"`,
      { stdio: ['inherit', 'inherit', 'pipe'] }
    );
    console.log(`  ✓ SQL dump saved (fallback): database_backup_${today}.sql`);
  } catch (err2) {
    console.error('  ✗ SQL dump failed (fallback):', err2.stderr?.toString() || err2.message);
  }
}

// ─── STEP 2: PER-TABLE CSV EXPORT ────────────────────────────────────────────
console.log('\nStep 2: Exporting per-table CSVs...');

const TABLES = [
  'users',
  'weekly_roundups',
  'archive_entries',
  'pattern_matches',
  'user_settings',
  'quick_notes',
  'materials',
  'works_core',
  'work_surfaces',
  'work_mediums',
  'work_tools',
  'intake_presets',
  'preset_surfaces',
  'preset_mediums',
  'preset_tools',
  'contacts',
];

const conn = await createConnection({
  host,
  port: parseInt(port),
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false },
  multipleStatements: false,
});

const rowCounts = {};

for (const table of TABLES) {
  try {
    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    rowCounts[table] = rows.length;

    if (rows.length === 0) {
      // Write header-only CSV
      const [cols] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
      const header = cols.map(c => `"${c.Field}"`).join(',');
      writeFileSync(resolve(dataExportDir, `${table}.csv`), header + '\n', 'utf8');
      console.log(`  ✓ ${table}.csv — 0 rows (header only)`);
      continue;
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [headers.map(h => `"${h}"`).join(',')];

    for (const row of rows) {
      const line = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object' && !(val instanceof Date)) {
          // JSON columns — stringify and escape quotes
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        }
        if (val instanceof Date) {
          return `"${val.toISOString()}"`;
        }
        const str = String(val);
        // Escape double quotes and wrap in quotes if contains comma, newline, or quote
        if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
      csvLines.push(line);
    }

    writeFileSync(resolve(dataExportDir, `${table}.csv`), csvLines.join('\n') + '\n', 'utf8');
    console.log(`  ✓ ${table}.csv — ${rows.length} rows`);
  } catch (err) {
    console.error(`  ✗ ${table}: ${err.message}`);
    rowCounts[table] = 'ERROR';
  }
}

await conn.end();

// ─── STEP 3: ROW COUNT SUMMARY ───────────────────────────────────────────────
console.log('\n=== Row Count Summary ===');
for (const [table, count] of Object.entries(rowCounts)) {
  console.log(`  ${table}: ${count}`);
}

// Save manifest
const manifest = { exportDate: today, rowCounts };
writeFileSync(resolve(dataExportDir, 'export_manifest.json'), JSON.stringify(manifest, null, 2));
console.log('\n✓ Manifest saved: data_export/export_manifest.json');
console.log('\n=== Export complete ===\n');
