/**
 * SQL dump generator for NEON SIGNS migration
 * Uses mysql2 directly (avoids mysqldump SAVEPOINT issue with TiDB)
 * Usage: node scripts/export-sql.mjs
 */

import { createConnection } from 'mysql2/promise';
import { writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const url = process.env.DATABASE_URL || '';
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!match) { console.error('Cannot parse DATABASE_URL'); process.exit(1); }
const [, user, password, host, port, database] = match;

const today = new Date().toISOString().split('T')[0];
const outFile = resolve(ROOT, `database_backup_${today}.sql`);

console.log(`\n=== NEON SIGNS SQL Dump Generator ===`);
console.log(`Output: database_backup_${today}.sql\n`);

const conn = await createConnection({
  host, port: parseInt(port), user, password, database,
  ssl: { rejectUnauthorized: false },
  multipleStatements: false,
});

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "\\'")}'`;
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

// Write header
const header = `-- NEON SIGNS Database Backup
-- Generated: ${new Date().toISOString()}
-- Database: ${database}
-- Host: ${host}:${port}
-- -----------------------------------------------

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;

`;
writeFileSync(outFile, header);

// Get all tables
const [tables] = await conn.query(`SHOW TABLES`);
const tableNames = tables.map(t => Object.values(t)[0]);
console.log(`Tables found: ${tableNames.join(', ')}\n`);

for (const table of tableNames) {
  console.log(`  Dumping ${table}...`);
  
  // Get CREATE TABLE statement
  const [[createRow]] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
  const createSql = createRow['Create Table'];
  
  appendFileSync(outFile, `\n-- -----------------------------------------------\n`);
  appendFileSync(outFile, `-- Table: ${table}\n`);
  appendFileSync(outFile, `-- -----------------------------------------------\n\n`);
  appendFileSync(outFile, `DROP TABLE IF EXISTS \`${table}\`;\n`);
  appendFileSync(outFile, `${createSql};\n\n`);
  
  // Get all rows
  const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
  
  if (rows.length === 0) {
    appendFileSync(outFile, `-- (no data)\n\n`);
    console.log(`    0 rows`);
    continue;
  }
  
  const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
  
  // Write in batches of 100
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch.map(row => 
      `(${Object.values(row).map(esc).join(', ')})`
    ).join(',\n  ');
    appendFileSync(outFile, `INSERT INTO \`${table}\` (${cols}) VALUES\n  ${values};\n\n`);
  }
  
  console.log(`    ${rows.length} rows`);
}

appendFileSync(outFile, `\nSET FOREIGN_KEY_CHECKS=1;\n`);
await conn.end();

console.log(`\n✓ SQL dump complete: database_backup_${today}.sql`);

// Check file size
import { statSync } from 'fs';
const size = statSync(outFile).size;
console.log(`  File size: ${(size / 1024 / 1024).toFixed(2)} MB\n`);
