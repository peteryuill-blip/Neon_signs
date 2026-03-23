/**
 * Update all image URLs in the Railway database to point to Cloudflare R2.
 * Reads the r2-url-mapping.json to map old filenames to new R2 public URLs.
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const RAILWAY_DB = 'mysql://root:XlAeUXwhIpLjourkvAYRngXYDcAcLqyW@caboose.proxy.rlwy.net:24114/railway';
const R2_PUBLIC_BASE = 'https://pub-2f4dc0f4c4ee4540ac2a932047dc756c.r2.dev';

const conn = await createConnection({
  uri: RAILWAY_DB,
  ssl: { rejectUnauthorized: false },
});

console.log('Connected to Railway DB.\n');

// Load the filename → R2 URL mapping
const mapping = JSON.parse(readFileSync(join(ROOT, 'image_export/r2-url-mapping.json'), 'utf8'));

// Convert the mapping to use the public R2 URL instead of the private storage URL
// Old: https://ee59ee5cb7da30e22c2451223113cff8.r2.cloudflarestorage.com/neonsigns/works/FILENAME
// New: https://pub-2f4dc0f4c4ee4540ac2a932047dc756c.r2.dev/works/FILENAME
const publicMapping = {};
for (const [filename, privateUrl] of Object.entries(mapping)) {
  // Extract the path after /neonsigns/ 
  const match = privateUrl.match(/\/neonsigns\/(.+)$/);
  if (match) {
    publicMapping[filename] = `${R2_PUBLIC_BASE}/${match[1]}`;
  }
}

console.log(`Loaded ${Object.keys(publicMapping).length} URL mappings.\n`);

// --- Update works_core photo_url ---
console.log('Updating works_core.photo_url...');
const [works] = await conn.query('SELECT id, photo_url FROM works_core WHERE photo_url IS NOT NULL AND photo_url != ""');
let worksUpdated = 0;
for (const work of works) {
  const filename = basename(work.photo_url);
  const newUrl = publicMapping[filename];
  if (newUrl && newUrl !== work.photo_url) {
    await conn.query('UPDATE works_core SET photo_url = ? WHERE id = ?', [newUrl, work.id]);
    worksUpdated++;
  }
}
console.log(`  Updated ${worksUpdated}/${works.length} works_core rows.\n`);

// --- Update materials photo_url ---
console.log('Updating materials.photo_url...');
const [materials] = await conn.query('SELECT id, photo_url FROM materials WHERE photo_url IS NOT NULL AND photo_url != ""');
let materialsUpdated = 0;
for (const mat of materials) {
  const filename = basename(mat.photo_url);
  const newUrl = publicMapping[filename];
  if (newUrl && newUrl !== mat.photo_url) {
    await conn.query('UPDATE materials SET photo_url = ? WHERE id = ?', [newUrl, mat.id]);
    materialsUpdated++;
  }
}
console.log(`  Updated ${materialsUpdated}/${materials.length} materials rows.\n`);

// --- Verify a sample ---
const [sample] = await conn.query('SELECT id, photo_url FROM works_core WHERE photo_url LIKE "%r2.dev%" LIMIT 3');
console.log('Sample updated URLs:');
for (const row of sample) {
  console.log(`  [${row.id}] ${row.photo_url}`);
}

await conn.end();
console.log('\n=== URL update complete ===');
