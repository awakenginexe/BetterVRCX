#!/usr/bin/env pwsh
using namespace System.Runtime.InteropServices
[CmdletBinding()]
param ([Switch]$NoCI, [Switch]$BuildArm64)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$releaseRoot = (Get-Location).Path
if ([RuntimeInformation]::ProcessArchitecture -eq [Architecture]::Arm64) { $BuildArm64 = $true }

function Invoke-BuildStep([scriptblock]$Step) {
    & $Step
    if ($LASTEXITCODE -ne 0) { throw "Build command failed with exit code $LASTEXITCODE" }
}

if ($NoCI) { Invoke-BuildStep { npm install --no-save --no-audit --no-fund } }
else { Invoke-BuildStep { npm ci --loglevel=error } }

if ($IsWindows -and !$BuildArm64) {
    Invoke-BuildStep { dotnet build Dotnet/VRCX-Cef.csproj -p:Configuration=Release -p:WarningLevel=0 -p:Platform=x64 -p:PlatformTarget=x64 -p:RestorePackagesConfig=true '-t:Restore;Clean;Build' -m -a x64 --self-contained }
    Invoke-BuildStep { npm run prod }
    $release = & "$PSScriptRoot/write-version.ps1"
    $packageRoot = Join-Path $releaseRoot 'build/Cef'
    foreach ($required in @('BetterVRCX.exe', 'html/index.html', 'html/licenses/third-party-licenses.json', 'html/licenses/THIRD_PARTY_NOTICES.txt')) {
        if (!(Test-Path -LiteralPath (Join-Path $packageRoot $required))) { throw "Missing package input: $required" }
    }
    if ($env:BETTERVRCX_GOOGLE_CLIENT_ID -and $env:BETTERVRCX_GOOGLE_CLIENT_SECRET) {
        [IO.File]::WriteAllText((Join-Path $packageRoot 'google-drive-client-id.txt'), $env:BETTERVRCX_GOOGLE_CLIENT_ID)
        [IO.File]::WriteAllText((Join-Path $packageRoot 'google-drive-client-secret.txt'), $env:BETTERVRCX_GOOGLE_CLIENT_SECRET)
    }
    foreach ($name in @('google-drive-client-id.txt', 'google-drive-client-secret.txt')) {
        $oauthFile = Join-Path $packageRoot $name
        if (!(Test-Path -LiteralPath $oauthFile) -or (Get-Item -LiteralPath $oauthFile).Length -eq 0) { throw "Missing Google Drive OAuth package configuration: $name" }
    }
    $nsis = 'C:/Program Files (x86)/NSIS/makensis.exe'
    if (!(Test-Path -LiteralPath $nsis)) { throw 'Install NSIS before packaging.' }
    Invoke-BuildStep { & $nsis -V4 -INPUTCHARSET UTF8 Installer/installer.nsi }
    Move-Item -LiteralPath (Join-Path $releaseRoot 'Installer/BetterVRCX_Setup.exe') -Destination (Join-Path $releaseRoot $release.SetupName) -Force
    $zipPath = Join-Path $releaseRoot $release.ZipName
    if (Test-Path -LiteralPath $zipPath) { throw "Archive already exists; preserve or explicitly remove $zipPath before rebuilding." }
    # 7-Zip follows the html junction by default; -snl would package a link instead.
    Push-Location $packageRoot
    try { Invoke-BuildStep { 7z a -tzip $zipPath '*' -mx=7 '-xr0!*.log' '-xr0!*.pdb' } }
    finally { Pop-Location }
    @($release.SetupName, $release.ZipName) | ForEach-Object {
        $hash = Get-FileHash -LiteralPath (Join-Path $releaseRoot $_) -Algorithm SHA256
        "$($hash.Hash.ToLowerInvariant())  $_"
    } | Set-Content -LiteralPath (Join-Path $releaseRoot 'SHA256SUMS.txt') -Encoding ascii
} elseif ($IsWindows) {
    Invoke-BuildStep { npm run build-electron-windows-arm64 }
} else {
    if ($BuildArm64) {
        Invoke-BuildStep { dotnet build Dotnet/VRCX-Electron-arm64.csproj -c Release -p:Platform=arm64 -p:PlatformTarget=arm64 --arch arm64 }
        Invoke-BuildStep { npm run prod-linux }
        Invoke-BuildStep { npm run build-electron-arm64 }
    } else {
        Invoke-BuildStep { dotnet build Dotnet/VRCX-Electron.csproj -c Release -p:Platform=x64 -p:PlatformTarget=x64 --arch x64 }
        Invoke-BuildStep { npm run prod-linux }
        Invoke-BuildStep { npm run build-electron }
    }
}
