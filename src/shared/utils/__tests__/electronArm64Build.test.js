import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const load = (name, mocks) => {
    const module = { exports: {} };
    vm.runInNewContext(readFileSync(`src-electron/${name}`, 'utf8'), {
        module,
        require: (id) => mocks[id] ?? require(id),
        __dirname: 'C:/test/src-electron',
        console,
        process: {
            argv: [],
            platform: 'win32',
            arch: 'arm64',
            exit: () => {
                throw Error('exit');
            }
        }
    });
    return module.exports;
};
test('Windows ARM64 runtime uses zip extraction and retains flat dotnet.exe layout', async () => {
    const calls = [];
    let url;
    const file = {
        on: (name, fn) => {
            if (name === 'finish') fn();
        },
        close: (done) => done()
    };
    const fs = {
        existsSync: () => true,
        mkdirSync: () => {},
        createWriteStream: () => file,
        unlinkSync: () => {},
        readdirSync: () => ['dotnet.exe'],
        lstatSync: () => ({ isDirectory: () => false }),
        renameSync: (...args) => calls.push(args),
        rmSync: () => {},
        chmodSync: () => {
            throw Error('chmod on Windows');
        }
    };
    const mod = load('download-dotnet-runtime.js', {
        fs: fs,
        https: {
            get: (value, callback) => {
                url = value;
                callback({ statusCode: 200, pipe: () => {} });
                return { on: () => {} };
            }
        },
        child_process: {
            spawnSync: (...args) => {
                calls.push(args);
                return { status: 0 };
            }
        },
        './utils': {
            getArchAndPlatform: () => ({ arch: 'arm64', platform: 'win32' })
        }
    });
    await mod.downloadDotnetRuntime('arm64', 'win32');
    expect(url).toMatch(/dotnet-runtime-[\d.]+-win-arm64\.zip$/);
    expect(calls[0][0]).toBe('tar');
    expect(calls[0][1][0]).toBe('-xf');
    expect(calls[0][1]).not.toContain('--strip-components=1');
    expect(calls[1][0]).toMatch(/dotnet\.exe$/);
});
test('Windows ARM64 installer is named explicitly for its architecture', () => {
    let renamed;
    load('rename-builds.js', {
        fs: {
            readFileSync: () => 'v4.4.0 B 2026.10.31',
            existsSync: (path) => path.endsWith('BetterVRCX_Version.exe'),
            renameSync: (...args) => {
                renamed = args;
            }
        },
        './utils': {
            getArchAndPlatform: () => ({ arch: 'arm64', platform: 'win32' })
        }
    });
    expect(renamed?.[1]).toMatch(/BetterVRCX_v4\.4\.0_Setup_arm64\.exe$/);
});
