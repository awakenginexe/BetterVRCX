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
        version = rawVersion.split(' ')[0] || 'v3.2.2';
    }
} catch (err) {
    console.error('Error reading Version file:', err);
    process.exit(1);
}
function renameBuild(arch, platform) {
    if (platform === 'win32') {
        for (const fileName of ['BetterVRCX_Version.exe', 'VRCX_Version.exe']) {
            const source = path.join(buildDir, fileName);
            if (fs.existsSync(source)) {
                fs.renameSync(
                    source,
                    path.join(
                        buildDir,
                        `BetterVRCX_${version}_Setup_${arch}.exe`
                    )
                );
                return;
            }
        }
        throw new Error(`Windows installer not found in ${buildDir}`);
    } else if (platform === 'linux') {
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
        for (const fileName of candidateNames) {
            const oldAppImage = path.join(buildDir, fileName);
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
        for (const fileName of candidateNames) {
            const oldDmg = path.join(buildDir, fileName);
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
