const fs = require('fs');
const path = require('path');
const { getArchAndPlatform } = require('./utils');

const rootDir = path.join(__dirname, '..');
const versionFilePath = path.join(rootDir, 'Version');
const buildDir = path.join(rootDir, 'build');

let version = '';
try {
    const rawVersion = fs.readFileSync(versionFilePath, 'utf8').trim();
    const tagMatch = rawVersion.match(/v\d+\.\d+\.\d+/);
    if (tagMatch) {
        version = tagMatch[0];
    } else {
        version = rawVersion.split(' ')[0] || 'v3.0.4';
    }
} catch (err) {
    console.error('Error reading Version file:', err);
    process.exit(1);
}

function renameBuild(arch, platform) {
    if (platform === 'linux') {
        const candidateNames = [
            'BetterVRCX_Version.AppImage',
            'VRCX_Version.AppImage',
            'BetterVRCX.AppImage'
        ];
        const newAppImage = path.join(
            buildDir,
            `BetterVRCX_${version}_${arch}.AppImage`
        );
        let found = false;
        for (const name of candidateNames) {
            const oldAppImage = path.join(buildDir, name);
            if (fs.existsSync(oldAppImage)) {
                try {
                    fs.renameSync(oldAppImage, newAppImage);
                    console.log(`Renamed: ${oldAppImage} -> ${newAppImage}`);
                    found = true;
                    break;
                } catch (err) {
                    console.error('Error renaming files:', err);
                    process.exit(1);
                }
            }
        }
        if (!found) {
            console.log(
                `File not found for linux AppImage rename in ${buildDir}`
            );
        }
    } else if (platform === 'darwin') {
        const candidateNames = [
            'BetterVRCX_Version.dmg',
            'VRCX_Version.dmg',
            'BetterVRCX.dmg'
        ];
        const newDmg = path.join(buildDir, `BetterVRCX_${version}_${arch}.dmg`);
        let found = false;
        for (const name of candidateNames) {
            const oldDmg = path.join(buildDir, name);
            if (fs.existsSync(oldDmg)) {
                try {
                    fs.renameSync(oldDmg, newDmg);
                    console.log(`Renamed: ${oldDmg} -> ${newDmg}`);
                    found = true;
                    break;
                } catch (err) {
                    console.error('Error renaming files:', err);
                    process.exit(1);
                }
            }
        }
        if (!found) {
            console.log(`File not found for macos DMG rename in ${buildDir}`);
        }
    } else {
        console.log('No renaming needed for this platform.');
    }
}

const { arch, platform } = getArchAndPlatform();
renameBuild(arch, platform);
