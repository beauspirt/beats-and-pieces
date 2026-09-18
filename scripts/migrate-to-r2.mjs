#!/usr/bin/env node

/**
 * migrate-to-r2.mjs
 * 
 * Uploads all local audio and cover image files to Cloudflare R2
 * via the Worker API, then prints updated URLs for database records.
 * 
 * Usage:
 *   node scripts/migrate-to-r2.mjs [--worker-url <url>] [--dry-run]
 * 
 * Prerequisites:
 *   1. Create R2 bucket: npx wrangler r2 bucket create beats-and-pieces
 *   2. Deploy the worker: npx wrangler deploy
 *   3. Set PUBLIC_URL env var in wrangler.jsonc or Cloudflare dashboard
 */

import fs from 'fs/promises';
import path from 'path';

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
let workerUrl = '';
const urlIdx = args.indexOf('--worker-url');
if (urlIdx !== -1 && args[urlIdx + 1]) {
  workerUrl = args[urlIdx + 1];
}

if (!workerUrl && !dryRun) {
  console.error('❌ Missing --worker-url <url>. Example:');
  console.error('   node scripts/migrate-to-r2.mjs --worker-url https://beats-and-pieces.yourdomain.workers.dev');
  console.error('   node scripts/migrate-to-r2.mjs --dry-run  (preview without uploading)');
  process.exit(1);
}

const AUDIO_EXTENSIONS = new Set(['.mp3', '.opus', '.wav', '.flac', '.ogg']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

async function getFilesRecursive(dir, baseDir = dir) {
  let results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subResults = await getFilesRecursive(fullPath, baseDir);
      results = results.concat(subResults);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (AUDIO_EXTENSIONS.has(ext) || IMAGE_EXTENSIONS.has(ext)) {
        results.push({
          fullPath,
          relativePath: path.relative(baseDir, fullPath).replace(/\\/g, '/'),
          ext,
          isAudio: AUDIO_EXTENSIONS.has(ext),
        });
      }
    }
  }
  return results;
}

async function uploadFile(filePath, folder, filename) {
  if (dryRun) {
    const stats = await fs.stat(filePath);
    return { url: `<R2_URL>/${folder}/${filename}`, key: `${folder}/${filename}`, size: stats.size };
  }

  const fileBuffer = await fs.readFile(filePath);
  const blob = new Blob([fileBuffer]);

  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('folder', folder);
  formData.append('filename', filename);

  const res = await fetch(`${workerUrl}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed (${res.status}): ${err}`);
  }

  return await res.json();
}

async function main() {
  console.log('🚀 Beats & Pieces → Cloudflare R2 Migration');
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no uploads)' : 'LIVE UPLOAD'}`);
  console.log(`   Worker: ${workerUrl || 'N/A'}`);
  console.log('');

  // 1. Scan audio files
  const audioDir = path.join(publicDir, 'audio');
  let audioFiles = [];
  try {
    audioFiles = await getFilesRecursive(audioDir);
  } catch (err) {
    console.warn('⚠️  No audio directory found, skipping audio migration.');
  }

  // 2. Scan cover images
  const coversDir = path.join(publicDir, 'covers');
  let coverFiles = [];
  try {
    coverFiles = await getFilesRecursive(coversDir);
  } catch (err) {
    console.warn('⚠️  No covers directory found, skipping covers migration.');
  }

  // 3. Scan avatar images
  const avatarsDir = path.join(publicDir, 'avatars');
  let avatarFiles = [];
  try {
    avatarFiles = await getFilesRecursive(avatarsDir);
  } catch (err) {
    console.warn('⚠️  No avatars directory found, skipping avatars migration.');
  }

  const allFiles = [
    ...audioFiles.map(f => ({ ...f, folder: `audio/${path.dirname(f.relativePath)}`.replace(/\/$/, '').replace(/\/\.$/, '') })),
    ...coverFiles.map(f => ({ ...f, folder: `covers/${path.dirname(f.relativePath)}`.replace(/\/$/, '').replace(/\/\.$/, '') })),
    ...avatarFiles.map(f => ({ ...f, folder: 'avatars' })),
  ];

  console.log(`📂 Found ${audioFiles.length} audio files, ${coverFiles.length} cover images, ${avatarFiles.length} avatars`);
  console.log(`📦 Total: ${allFiles.length} files to migrate\n`);

  let uploaded = 0;
  let failed = 0;
  let totalBytes = 0;
  const urlMap = {}; // old path -> new R2 URL

  for (const file of allFiles) {
    const filename = path.basename(file.fullPath);
    try {
      const result = await uploadFile(file.fullPath, file.folder, filename);
      uploaded++;
      totalBytes += result.size || 0;

      // Map old public path to new R2 URL
      const oldPublicPath = '/' + path.relative(publicDir, file.fullPath).replace(/\\/g, '/');
      urlMap[oldPublicPath] = result.url;

      console.log(`  ✅ ${file.folder}/${filename} (${((result.size || 0) / 1024).toFixed(1)} KB)`);
    } catch (err) {
      failed++;
      console.log(`  ❌ ${file.folder}/${filename}: ${err.message}`);
    }
  }

  console.log(`\n--- Migration Summary ---`);
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Total:    ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  // 4. Write URL mapping for reference
  const mapFile = path.join(projectRoot, 'scripts', 'r2-url-map.json');
  await fs.writeFile(mapFile, JSON.stringify(urlMap, null, 2), 'utf-8');
  console.log(`\n📝 URL mapping saved to scripts/r2-url-map.json`);

  if (dryRun) {
    console.log('\n💡 This was a dry run. To actually upload, run:');
    console.log('   node scripts/migrate-to-r2.mjs --worker-url <your-worker-url>');
  }

  console.log('\n📋 Next steps after migration:');
  console.log('   1. Update data JSON files to use R2 URLs (see r2-url-map.json)');
  console.log('   2. Clean up Supabase Storage buckets via dashboard');
  console.log('   3. Optionally remove audio/covers from public/ to reduce deploy size');
}

main().catch(console.error);
