/**
 * Image extraction script for NEON SIGNS migration
 * Downloads all photos from Manus S3 referenced in works_core and materials tables
 * Usage: node scripts/export-images.mjs
 */

import { createConnection } from 'mysql2/promise';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const url = process.env.DATABASE_URL || '';
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!match) { console.error('Cannot parse DATABASE_URL'); process.exit(1); }
const [, user, password, host, port, database] = match;

const WORKS_DIR = resolve(ROOT, 'image_export/works');
const MATERIALS_DIR = resolve(ROOT, 'image_export/materials');
mkdirSync(WORKS_DIR, { recursive: true });
mkdirSync(MATERIALS_DIR, { recursive: true });

console.log('\n=== NEON SIGNS Image Extraction ===\n');

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (existsSync(destPath)) {
      resolve({ skipped: true });
      return;
    }
    const proto = url.startsWith('https') ? https : http;
    const file = require('fs').createWriteStream(destPath);
    proto.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        require('fs').unlinkSync(destPath);
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        try { require('fs').unlinkSync(destPath); } catch {}
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve({ skipped: false }); });
      file.on('error', (err) => { file.close(); try { require('fs').unlinkSync(destPath); } catch {} reject(err); });
    }).on('error', (err) => {
      file.close();
      try { require('fs').unlinkSync(destPath); } catch {}
      reject(err);
    });
  });
}

// Use fetch instead (Node 18+)
async function downloadFileFetch(photoUrl, destPath) {
  if (existsSync(destPath)) {
    return { skipped: true };
  }
  const res = await fetch(photoUrl, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buf);
  return { skipped: false };
}

const conn = await createConnection({
  host, port: parseInt(port), user, password, database,
  ssl: { rejectUnauthorized: false },
});

const manifest = { exportDate: new Date().toISOString(), works: [], materials: [] };
let totalDownloaded = 0;
let totalSkipped = 0;
let totalFailed = 0;

// ─── WORKS ────────────────────────────────────────────────────────────────────
console.log('Downloading work photos...');
const [works] = await conn.query(
  'SELECT id, code, photoUrl, photoKey FROM works_core WHERE photoUrl IS NOT NULL AND photoUrl != ""'
);
console.log(`  Found ${works.length} works with photos\n`);

for (const work of works) {
  const ext = work.photoUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)?.[1] || 'jpg';
  // Use photoKey as filename if available, otherwise use code
  const filename = work.photoKey
    ? work.photoKey.replace(/\//g, '_')
    : `${work.code}.${ext}`;
  const destPath = resolve(WORKS_DIR, filename);

  try {
    const result = await downloadFileFetch(work.photoUrl, destPath);
    if (result.skipped) {
      process.stdout.write(`  ↷ ${work.code} (already exists)\n`);
      totalSkipped++;
    } else {
      process.stdout.write(`  ✓ ${work.code} → ${filename}\n`);
      totalDownloaded++;
    }
    manifest.works.push({
      id: work.id,
      code: work.code,
      photoUrl: work.photoUrl,
      photoKey: work.photoKey,
      localPath: `image_export/works/${filename}`,
    });
  } catch (err) {
    process.stdout.write(`  ✗ ${work.code}: ${err.message}\n`);
    totalFailed++;
    manifest.works.push({
      id: work.id,
      code: work.code,
      photoUrl: work.photoUrl,
      photoKey: work.photoKey,
      localPath: null,
      error: err.message,
    });
  }
}

// ─── MATERIALS ────────────────────────────────────────────────────────────────
console.log('\nDownloading material photos...');
const [materials] = await conn.query(
  'SELECT id, code, materialId, photoUrl, photoKey FROM materials WHERE photoUrl IS NOT NULL AND photoUrl != ""'
);
console.log(`  Found ${materials.length} materials with photos\n`);

for (const mat of materials) {
  const ext = mat.photoUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)?.[1] || 'jpg';
  const filename = mat.photoKey
    ? mat.photoKey.replace(/\//g, '_')
    : `${mat.code || mat.materialId}.${ext}`;
  const destPath = resolve(MATERIALS_DIR, filename);

  try {
    const result = await downloadFileFetch(mat.photoUrl, destPath);
    if (result.skipped) {
      process.stdout.write(`  ↷ ${mat.code || mat.materialId} (already exists)\n`);
      totalSkipped++;
    } else {
      process.stdout.write(`  ✓ ${mat.code || mat.materialId} → ${filename}\n`);
      totalDownloaded++;
    }
    manifest.materials.push({
      id: mat.id,
      code: mat.code,
      materialId: mat.materialId,
      photoUrl: mat.photoUrl,
      photoKey: mat.photoKey,
      localPath: `image_export/materials/${filename}`,
    });
  } catch (err) {
    process.stdout.write(`  ✗ ${mat.code || mat.materialId}: ${err.message}\n`);
    totalFailed++;
    manifest.materials.push({
      id: mat.id,
      code: mat.code,
      materialId: mat.materialId,
      photoUrl: mat.photoUrl,
      photoKey: mat.photoKey,
      localPath: null,
      error: err.message,
    });
  }
}

await conn.end();

// Save manifest
writeFileSync(resolve(ROOT, 'image_export/manifest.json'), JSON.stringify(manifest, null, 2));

console.log('\n=== Summary ===');
console.log(`  Downloaded: ${totalDownloaded}`);
console.log(`  Skipped (already existed): ${totalSkipped}`);
console.log(`  Failed: ${totalFailed}`);
console.log(`  Works with photos: ${works.length}`);
console.log(`  Materials with photos: ${materials.length}`);
console.log('\n✓ Manifest saved: image_export/manifest.json');
console.log('=== Image extraction complete ===\n');
