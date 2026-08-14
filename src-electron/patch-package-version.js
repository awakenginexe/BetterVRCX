const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const versionFilePath = path.join(rootDir, 'Version');
const packageJsonPath = path.join(rootDir, 'package.json');

let version = '';
try {
    const rawVersion = fs.readFileSync(versionFilePath, 'utf8').trim();
    const semverMatch = rawVersion.match(/(\d+\.\d+\.\d+)/);
    if (semverMatch) {
        version = semverMatch[1];
    } else {
        const parts = rawVersion.split(' ');
        version = parts[0].replace(/^v/, '');
    }

    const index = version.indexOf('T');
    if (index > 0) {
        // Remove time part from version
        version = version.substring(0, index).replaceAll('-', '.');
    }
    if (!version || version === 'Nightly Build') {
        version = new Date().toISOString().split('T')[0].replaceAll('-', '.');
    }
} catch (err) {
    console.error('Error reading Version file:', err);
    process.exit(1);
}

let packageJson = {};
try {
    const packageData = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageData);
} catch (err) {
    console.error('Error reading package.json:', err);
    process.exit(1);
}

packageJson.version = version;

try {
    fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 4),
        'utf8'
    );
    console.log(`Updated version in package.json to: ${version}`);
} catch (err) {
    console.error('Error writing to package.json:', err);
    process.exit(1);
}
