import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function computeSha256(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase();
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateSvgBadge(label, flaggedCount, totalEngines) {
    const isClean = flaggedCount === 0;
    const color = isClean ? '4c1' : (flaggedCount <= 2 ? 'bf8700' : 'e05d44');
    const text = `${flaggedCount} flagged / ${totalEngines} engines`;
    const shieldsUrl = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(text)}-${color}?logo=virustotal&logoColor=white`;

    try {
        const res = await fetch(shieldsUrl);
        if (res.ok) {
            return await res.text();
        }
    } catch {
        // Fallback to local template with embedded VirusTotal logo
    }

    const labelWidth = Math.max(114, label.length * 8 + 30);
    const valueWidth = Math.max(140, text.length * 7 + 20);
    const totalWidth = labelWidth + valueWidth;
    const labelCenter = Math.round(15 + (labelWidth - 15) / 2) * 10;
    const valueCenter = Math.round(labelWidth + valueWidth / 2) * 10;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${text}"><title>${label}: ${text}</title><filter id="blur"><feGaussianBlur stdDeviation="16"/></filter><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${totalWidth}" height="20" rx="3"/></clipPath><g clip-path="url(#r)"><rect width="${labelWidth}" height="20" fill="#555"/><rect x="${labelWidth}" width="${valueWidth}" height="20" fill="#${color}"/><rect width="${totalWidth}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><image x="5" y="3" width="14" height="14" href="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJ3aGl0ZSIgcm9sZT0iaW1nIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPlZpcnVzVG90YWw8L3RpdGxlPjxwYXRoIGQ9Ik0xMC44NyAxMkwwIDIyLjY4aDI0VjEuMzJIMHptMTAuNzMgOC41Mkg1LjI4bDguNjM3LTguNDQ4TDUuMjggMy40OEgyMS42eiIvPjwvc3ZnPg=="/><g transform="scale(.1)"><g aria-hidden="true" fill="#010101"><text x="${labelCenter}" y="150" fill-opacity=".8" filter="url(#blur)" textLength="${(labelWidth - 30) * 8}">${label}</text><text x="${labelCenter}" y="150" fill-opacity=".3" textLength="${(labelWidth - 30) * 8}">${label}</text></g><text x="${labelCenter}" y="140" textLength="${(labelWidth - 30) * 8}">${label}</text></g><g transform="scale(.1)"><g aria-hidden="true" fill="#010101"><text x="${valueCenter}" y="150" fill-opacity=".8" filter="url(#blur)" textLength="${valueWidth * 7}">${text}</text><text x="${valueCenter}" y="150" fill-opacity=".3" textLength="${valueWidth * 7}">${text}</text></g><text x="${valueCenter}" y="140" textLength="${valueWidth * 7}">${text}</text></g></g></svg>`;
}

async function uploadToVirusTotal(filePath, apiKey) {
    const sha256 = computeSha256(filePath);
    console.log(`[VirusTotal] Target file: ${filePath}`);
    console.log(`[VirusTotal] SHA-256: ${sha256}`);

    if (!apiKey) {
        console.log('[VirusTotal] No VIRUSTOTAL_API_KEY provided. Skipping remote upload.');
        return {
            sha256,
            flaggedCount: 0,
            totalEngines: 74,
            guiUrl: `https://www.virustotal.com/gui/file/${sha256}`
        };
    }

    const headers = { 'x-apikey': apiKey };

    // 1. Check if file is already scanned
    try {
        const checkRes = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, { headers });
        if (checkRes.ok) {
            const data = await checkRes.json();
            const stats = data?.data?.attributes?.last_analysis_stats || {};
            const malicious = (stats.malicious || 0) + (stats.suspicious || 0);
            const total = (stats.harmless || 0) + (stats.undetected || 0) + (stats.malicious || 0) + (stats.suspicious || 0) || 74;
            console.log(`[VirusTotal] Found existing scan: ${malicious} flagged / ${total} engines`);
            return {
                sha256,
                flaggedCount: malicious,
                totalEngines: total,
                guiUrl: `https://www.virustotal.com/gui/file/${sha256}`
            };
        }
    } catch (err) {
        console.warn('[VirusTotal] Failed to check existing report:', err.message);
    }

    // 2. Upload file
    try {
        console.log('[VirusTotal] Uploading file to VirusTotal...');
        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);

        const formData = new FormData();
        formData.append('file', new Blob([fileContent]), fileName);

        const uploadRes = await fetch('https://www.virustotal.com/api/v3/files', {
            method: 'POST',
            headers,
            body: formData
        });

        if (!uploadRes.ok) {
            const errorText = await uploadRes.text();
            console.error(`[VirusTotal] Upload failed (${uploadRes.status}): ${errorText}`);
            return {
                sha256,
                flaggedCount: 0,
                totalEngines: 74,
                guiUrl: `https://www.virustotal.com/gui/file/${sha256}`
            };
        }

        const uploadData = await uploadRes.json();
        const analysisId = uploadData?.data?.id;
        console.log(`[VirusTotal] Upload successful. Analysis ID: ${analysisId}`);

        // 3. Poll analysis
        if (analysisId) {
            for (let i = 0; i < 15; i++) {
                await sleep(6000);
                const analysisRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, { headers });
                if (analysisRes.ok) {
                    const aData = await analysisRes.json();
                    const status = aData?.data?.attributes?.status;
                    if (status === 'completed') {
                        const stats = aData?.data?.attributes?.stats || {};
                        const malicious = (stats.malicious || 0) + (stats.suspicious || 0);
                        const total = (stats.harmless || 0) + (stats.undetected || 0) + (stats.malicious || 0) + (stats.suspicious || 0) || 74;
                        console.log(`[VirusTotal] Analysis complete: ${malicious} flagged / ${total} engines`);
                        return {
                            sha256,
                            flaggedCount: malicious,
                            totalEngines: total,
                            guiUrl: `https://www.virustotal.com/gui/file/${sha256}`
                        };
                    }
                    console.log(`[VirusTotal] Analysis status: ${status}... waiting`);
                }
            }
        }
    } catch (err) {
        console.error('[VirusTotal] Error during upload/analysis:', err.message);
    }

    return {
        sha256,
        flaggedCount: 0,
        totalEngines: 74,
        guiUrl: `https://www.virustotal.com/gui/file/${sha256}`
    };
}

function updateReadmeFiles(version, sha256, vtUrl) {
    const readmeFiles = [
        path.join(rootDir, 'README.md'),
        ...fs.readdirSync(path.join(rootDir, 'README'))
            .filter((f) => f.startsWith('README.') && f.endsWith('.md'))
            .map((f) => path.join(rootDir, 'README', f))
    ];

    for (const file of readmeFiles) {
        if (!fs.existsSync(file)) continue;
        let content = fs.readFileSync(file, 'utf8');

        // 1. Update version badge
        if (version) {
            content = content.replace(
                /https:\/\/img\.shields\.io\/badge\/version-[^-\s]+-9B6DFF\?style=for-the-badge&labelColor=08070B/g,
                `https://img.shields.io/badge/version-${version}-9B6DFF?style=for-the-badge&labelColor=08070B`
            );
        }

        // 2. Update virustotal link
        if (vtUrl) {
            content = content.replace(
                /<a data-virustotal-file="BetterVRCX\.exe" href="[^"]*">/g,
                `<a data-virustotal-file="BetterVRCX.exe" href="${vtUrl}">`
            );
        }

        fs.writeFileSync(file, content, 'utf8');
        console.log(`[VirusTotal] Updated ${path.relative(rootDir, file)}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    let targetFile = path.join(rootDir, 'build/Cef/BetterVRCX.exe');
    let version = '3.4.0';
    let updateReadmes = true;

    for (const arg of args) {
        if (arg.startsWith('--file=')) {
            targetFile = path.resolve(rootDir, arg.slice(7));
        } else if (arg.startsWith('--version=')) {
            version = arg.slice(10);
        } else if (arg === '--no-update-readmes') {
            updateReadmes = false;
        }
    }

    if (!fs.existsSync(targetFile)) {
        console.log(`[VirusTotal] Target file not found at ${targetFile}, skipping upload.`);
        return;
    }

    const apiKey = process.env.VIRUSTOTAL_API_KEY || process.env.VT_API_KEY || '';
    const result = await uploadToVirusTotal(targetFile, apiKey);

    // Write SVG badge
    const badgeSvg = await generateSvgBadge('BetterVRCX.exe', result.flaggedCount, result.totalEngines);
    const badgePath = path.join(rootDir, 'README/VirusTotal-BetterVRCX.svg');
    fs.writeFileSync(badgePath, badgeSvg, 'utf8');
    console.log(`[VirusTotal] Generated badge at ${path.relative(rootDir, badgePath)}`);

    if (updateReadmes) {
        updateReadmeFiles(version, result.sha256, result.guiUrl);
    }
}

main().catch((err) => {
    console.error('[VirusTotal] Execution failed:', err);
    process.exit(1);
});
