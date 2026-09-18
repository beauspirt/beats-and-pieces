import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);

const projectRoot = process.cwd();
const audioDir = path.join(projectRoot, 'public', 'audio');
const submissionsFile = path.join(projectRoot, 'src', 'data', 'submissions.json');
const discoveryFile = path.join(projectRoot, 'src', 'data', 'discovery-beats.json');

async function getMp3Files(dir) {
    let results = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const subResults = await getMp3Files(fullPath);
                results = results.concat(subResults);
            } else if (entry.isFile() && fullPath.endsWith('.mp3')) {
                results.push(fullPath);
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
    return results;
}

function convertMp3ToOpus(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-c:a libopus',
                '-b:a 192k',
                '-vbr on',
                '-compression_level 10',
                '-application audio'
            ])
            .save(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
    });
}

async function updateJsonFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        function traverseAndReplace(obj) {
            let changed = false;
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    if (traverseAndReplace(obj[i])) changed = true;
                }
            } else if (obj && typeof obj === 'object') {
                for (const key in obj) {
                    if (key === 'audioUrl' && typeof obj[key] === 'string' && obj[key].endsWith('.mp3')) {
                        obj[key] = obj[key].replace(/\.mp3$/, '.opus');
                        changed = true;
                    } else {
                        if (traverseAndReplace(obj[key])) changed = true;
                    }
                }
            }
            return changed;
        }

        const updated = traverseAndReplace(data);

        if (updated) {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`Updated ${path.relative(projectRoot, filePath)}`);
        } else {
            console.log(`No changes needed in ${path.relative(projectRoot, filePath)}`);
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`File not found, skipping: ${path.relative(projectRoot, filePath)}`);
        } else {
            console.error(`Error updating JSON file ${filePath}:`, err.message);
        }
    }
}

async function main() {
    console.log(`Scanning directory: ${audioDir}`);
    let mp3Files = [];
    try {
        mp3Files = await getMp3Files(audioDir);
    } catch (err) {
        console.error('Error scanning directory:', err.message);
        return;
    }

    console.log(`Found ${mp3Files.length} MP3 files.`);

    let convertedCount = 0;
    let totalSizeBefore = 0;
    let totalSizeAfter = 0;

    for (const inputPath of mp3Files) {
        const outputPath = inputPath.replace(/\.mp3$/, '.opus');
        
        try {
            await fs.access(outputPath);
            console.log(`Skipping ${path.basename(inputPath)}, opus already exists.`);
            continue;
        } catch {
            // file doesn't exist, proceed with conversion
        }

        console.log(`Converting ${path.basename(inputPath)}...`);
        try {
            const statsBefore = await fs.stat(inputPath);
            await convertMp3ToOpus(inputPath, outputPath);
            const statsAfter = await fs.stat(outputPath);
            
            const sizeBefore = statsBefore.size;
            const sizeAfter = statsAfter.size;
            totalSizeBefore += sizeBefore;
            totalSizeAfter += sizeAfter;
            convertedCount++;

            const ratio = ((1 - sizeAfter / sizeBefore) * 100).toFixed(2);
            console.log(`Done: ${path.basename(inputPath)} | Original: ${(sizeBefore / 1024 / 1024).toFixed(2)}MB | Opus: ${(sizeAfter / 1024 / 1024).toFixed(2)}MB | Saved: ${ratio}%`);
        } catch (err) {
            console.error(`Failed to convert ${path.basename(inputPath)}:`, err.message);
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Total files converted: ${convertedCount}`);
    if (convertedCount > 0) {
        console.log(`Total size before: ${(totalSizeBefore / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Total size after: ${(totalSizeAfter / 1024 / 1024).toFixed(2)} MB`);
        const overallRatio = ((1 - totalSizeAfter / totalSizeBefore) * 100).toFixed(2);
        console.log(`Overall compression ratio: ${overallRatio}%`);
    }

    console.log('\n--- Updating JSON files ---');
    await updateJsonFile(submissionsFile);
    await updateJsonFile(discoveryFile);
}

main().catch(console.error);
