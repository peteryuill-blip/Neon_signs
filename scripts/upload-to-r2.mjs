/**
 * Upload all local images to Cloudflare R2
 * Works: image_export/works/*.jpg → r2://neonsigns/works/
 * Materials: image_export/materials/*.jpg → r2://neonsigns/materials/
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const ACCOUNT_ID = 'ee59ee5cb7da30e22c2451223113cff8';
const ACCESS_KEY_ID = '1ea85ef76a12e6ba85c63332ae55cb8d';
const SECRET_ACCESS_KEY = 'ae41dff3c3e427dea0d5f37f6d225f2ca96391395e93156d08e4b105cbb29b48';
const BUCKET = 'neonsigns';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const PUBLIC_URL = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}`;

function getMimeType(filename) {
  const ext = extname(filename).toLowerCase();
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  return map[ext] || 'application/octet-stream';
}

async function uploadFile(localPath, r2Key) {
  const data = readFileSync(localPath);
  const mime = getMimeType(localPath);
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    Body: data,
    ContentType: mime,
  }));
  return `${PUBLIC_URL}/${r2Key}`;
}

async function uploadDir(localDir, r2Prefix) {
  const files = readdirSync(localDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
  const results = [];
  let done = 0;
  for (const file of files) {
    const localPath = join(localDir, file);
    const r2Key = `${r2Prefix}/${file}`;
    try {
      const url = await uploadFile(localPath, r2Key);
      results.push({ file, r2Key, url, ok: true });
      done++;
      if (done % 10 === 0 || done === files.length) {
        process.stdout.write(`  ${done}/${files.length} uploaded\r`);
      }
    } catch (err) {
      results.push({ file, r2Key, url: null, ok: false, error: err.message });
      console.error(`  FAILED: ${file} — ${err.message}`);
    }
  }
  console.log(`  ${done}/${files.length} uploaded to ${r2Prefix}/`);
  return results;
}

console.log('=== Uploading images to Cloudflare R2 ===\n');

console.log('Uploading works images...');
const worksResults = await uploadDir(join(ROOT, 'image_export/works'), 'works');

console.log('\nUploading materials images...');
const materialsResults = await uploadDir(join(ROOT, 'image_export/materials'), 'materials');

const allResults = [...worksResults, ...materialsResults];
const ok = allResults.filter(r => r.ok).length;
const failed = allResults.filter(r => !r.ok).length;

console.log(`\n=== Upload complete: ${ok} succeeded, ${failed} failed ===`);
console.log(`\nPublic URL base: ${PUBLIC_URL}`);
console.log(`Example works URL: ${PUBLIC_URL}/works/${worksResults[0]?.file}`);
console.log(`Example materials URL: ${PUBLIC_URL}/materials/${materialsResults[0]?.file}`);

// Save mapping for DB update
import { writeFileSync } from 'fs';
const mapping = {};
for (const r of allResults) {
  if (r.ok) mapping[r.file] = r.url;
}
writeFileSync(join(ROOT, 'image_export/r2-url-mapping.json'), JSON.stringify(mapping, null, 2));
console.log(`\nURL mapping saved to image_export/r2-url-mapping.json`);
