$ErrorActionPreference = 'Stop'
$releaseRoot = Split-Path $PSScriptRoot -Parent
$displayVersion = (Get-Content -LiteralPath (Join-Path $releaseRoot 'Version') -Raw).Trim()
if ($displayVersion -notmatch '^v(?<Semver>\d+\.\d+\.\d+) B (?<Date>\d{4}\.\d{2}\.\d{2})$') {
    throw 'Version must have the form vX.Y.Z B YYYY.MM.DD.'
}
$semver = $Matches.Semver
[void][DateTime]::ParseExact($Matches.Date, 'yyyy.MM.dd', [Globalization.CultureInfo]::InvariantCulture)
@(
    "!define PRODUCT_VERSION_FROM_FILE `"$semver.0`""
    "!define DISPLAY_VERSION_FROM_FILE `"$displayVersion`""
) | Set-Content -LiteralPath (Join-Path $releaseRoot 'Installer/version_define.nsh') -Encoding utf8NoBOM
[pscustomobject]@{
    Version = $semver
    DisplayVersion = $displayVersion
    SetupName = "BetterVRCX_Setup_v$semver.exe"
    ZipName = "BetterVRCX_v$semver.zip"
}
