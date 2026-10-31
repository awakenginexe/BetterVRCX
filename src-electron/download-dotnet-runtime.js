const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');
const { getArchAndPlatform } = require('./utils');

const DOTNET_VERSION = '10.0.8';
const DOTNET_RUNTIME_DIR = path.join(
    __dirname,
    '..',
    'build',
    'Electron',
    'dotnet-runtime'
);

async function downloadFile(url, targetPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(targetPath);
        https
            .get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(
                        new Error(
                            `Failed to download, url: ${url} status code: ${response.statusCode}`
                        )
                    );
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            })
            .on('error', (err) => {
                fs.unlink(targetPath, () => reject(err));
            });
    });
}

async function extractArchive(archivePath, extractDir, isWindows) {
    return new Promise((resolve, reject) => {
        const tar = spawnSync(
            'tar',
            isWindows
                ? ['-xf', archivePath, '-C', extractDir]
                : [
                      '-xzf',
                      archivePath,
                      '-C',
                      extractDir,
                      '--strip-components=1'
                  ],
            {
                stdio: 'inherit'
            }
        );

        if (tar.status === 0) {
            resolve();
        } else {
            reject(
                new Error(`tar extraction failed with status ${tar.status}`)
            );
        }
    });
}

async function downloadDotnetRuntime(arch, platform) {
    if (!arch || !platform) {
        throw new Error('Architecture and platform must be specified');
    }

    let dotnetPlatform = '';
    if (platform === 'linux') {
        dotnetPlatform = 'linux';
    } else if (platform === 'darwin') {
        dotnetPlatform = 'osx';
    } else if (platform === 'win32') {
        dotnetPlatform = 'win';
    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!fs.existsSync(DOTNET_RUNTIME_DIR)) {
        fs.mkdirSync(DOTNET_RUNTIME_DIR, { recursive: true });
    }

    console.log(
        `Downloading .NET ${DOTNET_VERSION}-${dotnetPlatform}-${arch} runtime...`
    );
    const extension = platform === 'win32' ? 'zip' : 'tar.gz';
    const fileName = `dotnet-runtime-${DOTNET_VERSION}-${dotnetPlatform}-${arch}.${extension}`;
    const archivePath = path.join(DOTNET_RUNTIME_DIR, fileName);
    const dotnetRuntimeUrl = `https://builds.dotnet.microsoft.com/dotnet/Runtime/${DOTNET_VERSION}/${fileName}`;

    // Download .NET runtime
    await downloadFile(dotnetRuntimeUrl, archivePath);
    console.log('Download completed');

    // Extract .NET runtime to a temporary directory first
    const tempExtractDir = path.join(DOTNET_RUNTIME_DIR, 'temp');
    if (!fs.existsSync(tempExtractDir)) {
        fs.mkdirSync(tempExtractDir, { recursive: true });
    }

    console.log('Extracting .NET runtime...');
    await extractArchive(archivePath, tempExtractDir, platform === 'win32');
    console.log('Extraction completed');

    // Clean up tar.gz file
    fs.unlinkSync(archivePath);
    console.log('Cleanup completed');

    // Ensure the dotnet executable is executable
    const extractedDotnet = path.join(tempExtractDir, 'dotnet');
    if (platform !== 'win32') fs.chmodSync(extractedDotnet, 0o755);

    // Move all other files to the root of dotnet-runtime
    const files = fs.readdirSync(tempExtractDir);
    for (const file of files) {
        const sourcePath = path.join(tempExtractDir, file);
        const targetPath = path.join(DOTNET_RUNTIME_DIR, file);

        if (fs.existsSync(targetPath)) {
            if (fs.lstatSync(sourcePath).isDirectory()) {
                // Remove existing directory and move new one
                fs.rmSync(targetPath, { recursive: true, force: true });
            } else {
                // Remove existing file
                fs.unlinkSync(targetPath);
            }
        }

        fs.renameSync(sourcePath, targetPath);
    }

    // Clean up temp directory
    fs.rmSync(tempExtractDir, { recursive: true, force: true });

    console.log(
        `.NET runtime downloaded and extracted to: ${DOTNET_RUNTIME_DIR}`
    );
}

if (require.main === module) {
    const { arch, platform } = getArchAndPlatform();
    downloadDotnetRuntime(arch, platform).catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
module.exports = { downloadDotnetRuntime };
