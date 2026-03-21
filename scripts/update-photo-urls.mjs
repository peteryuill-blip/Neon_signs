/**
 * Update photo URLs in the database after migrating images to R2.
 *
 * Usage:
 *   node scripts/update-photo-urls.mjs \
 *     --old-prefix "https://old-manus-url.com" \
 *     --new-prefix "https://pub-xxxx.r2.dev/neon-signs"
 *
 * Or with dry-run to preview changes:
 *   node scripts/update-photo-urls.mjs --old-prefix "..." --new-prefix "..." --dry-run
 */

import { createConnection } from 'mysql2/promise';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : null;
};

const oldPrefix = getArg('--old-prefix');
const newPrefix = getArg('--new-prefix');
const dryRun = args.includes('--dry-run');

if (!oldPrefix || !newPrefix) {
  console.error('Usage: node scripts/update-photo-urls.mjs --old-prefix "OLD_URL" --new-prefix "NEW_URL" [--dry-run]');
  process.exit(1);
}

const url = process.env.DATABASE_URL || '';
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!match) { console.error('Cannot parse DATABASE_URL'); process.exit(1); }
const [, user, password, host, port, database] = match;

const conn = await createConnection({
  host, port: parseInt(port), user, password, database,
  ssl: { rejectUnauthorized: false },
});

console.log(`\n=== Photo URL Migration ===`);
console.log(`Old prefix: ${oldPrefix}`);
console.log(`New prefix: ${newPrefix}`);
console.log(`Dry run: ${dryRun}\n`);

// Preview affected rows
const [worksRows] = await conn.query(
  'SELECT id, code, photoUrl FROM works_core WHERE photoUrl LIKE ? LIMIT 5',
  [`${oldPrefix}%`]
);
const [worksCount] = await conn.query(
  'SELECT COUNT(*) as count FROM works_core WHERE photoUrl LIKE ?',
  [`${oldPrefix}%`]
);
const [matsCount] = await conn.query(
  'SELECT COUNT(*) as count FROM materials WHERE photoUrl LIKE ?',
  [`${oldPrefix}%`]
);

console.log(`Works to update: ${worksCount[0].count}`);
console.log(`Materials to update: ${matsCount[0].count}`);

if (worksRows.length > 0) {
  console.log('\nSample works_core rows:');
  for (const row of worksRows) {
    const newUrl = row.photoUrl.replace(oldPrefix, newPrefix);
    console.log(`  ${row.code}: ${row.photoUrl.slice(0, 60)}...`);
    console.log(`       → ${newUrl.slice(0, 60)}...`);
  }
}

if (dryRun) {
  console.log('\n[DRY RUN] No changes made. Remove --dry-run to apply.');
  await conn.end();
  process.exit(0);
}

// Apply updates
const [worksResult] = await conn.query(
  `UPDATE works_core SET photoUrl = REPLACE(photoUrl, ?, ?) WHERE photoUrl LIKE ?`,
  [oldPrefix, newPrefix, `${oldPrefix}%`]
);
console.log(`\n✓ Updated ${worksResult.affectedRows} works_core rows`);

const [matsResult] = await conn.query(
  `UPDATE materials SET photoUrl = REPLACE(photoUrl, ?, ?) WHERE photoUrl LIKE ?`,
  [oldPrefix, newPrefix, `${oldPrefix}%`]
);
console.log(`✓ Updated ${matsResult.affectedRows} materials rows`);

await conn.end();
console.log('\n=== Photo URL migration complete ===\n');
