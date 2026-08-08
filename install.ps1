[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$SkipDependencies,
    [switch]$SkipPlugin,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"
$repoRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$packagePath = Join-Path $repoRoot "package.json"
$marketplacePath = Join-Path $repoRoot ".agents\plugins\marketplace.json"
$electronPath = Join-Path $repoRoot "node_modules\electron\dist\electron.exe"

if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) {
    throw "package.json was not found at $packagePath"
}
if (-not (Test-Path -LiteralPath $marketplacePath -PathType Leaf)) {
    throw "The Codex Avatars marketplace was not found at $marketplacePath"
}

Write-Host "Codex Avatars setup" -ForegroundColor Cyan
Write-Host "Repository: $repoRoot"

if (-not $SkipDependencies) {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $npm) {
        throw "Node.js 22 or newer is required. Install Node.js, then run this script again."
    }
    if ($PSCmdlet.ShouldProcess($repoRoot, "Install locked Node.js dependencies with npm ci")) {
        & $npm.Source ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE" }
    }
}

if ($PSCmdlet.ShouldProcess("User environment", "Register CODEX_AVATARS_DEV_ROOT")) {
    [Environment]::SetEnvironmentVariable("CODEX_AVATARS_DEV_ROOT", $repoRoot, "User")
    $env:CODEX_AVATARS_DEV_ROOT = $repoRoot
}

if (-not $SkipPlugin) {
    $codex = Get-Command codex -ErrorAction SilentlyContinue
    if ($null -eq $codex) {
        Write-Warning "Codex CLI was not found. Open Plugins in the ChatGPT desktop app after restarting it; the repo marketplace is already present."
    } elseif ($PSCmdlet.ShouldProcess("Codex", "Add the local marketplace and install codex-avatars")) {
        try {
            & $codex.Source plugin marketplace add $repoRoot
            if ($LASTEXITCODE -ne 0) { throw "marketplace add exited with $LASTEXITCODE" }
            & $codex.Source plugin add "codex-avatars@codex-avatars-local"
            if ($LASTEXITCODE -ne 0) { throw "plugin add exited with $LASTEXITCODE" }
        } catch {
            Write-Warning "Automatic plugin installation did not complete: $($_.Exception.Message)"
            Write-Warning "Restart ChatGPT, open Plugins, choose 'Codex Avatars Local', and install Codex Avatars."
        }
    }
}

if (-not $NoStart) {
    if (-not (Test-Path -LiteralPath $electronPath -PathType Leaf) -and -not $WhatIfPreference) {
        throw "Electron was not installed at $electronPath"
    }
    if ($PSCmdlet.ShouldProcess("Codex Avatars", "Start the background companion")) {
        Start-Process -FilePath $electronPath -ArgumentList @($repoRoot, "--background") -WindowStyle Hidden
    }
}

Write-Host ""
Write-Host "Setup prepared." -ForegroundColor Green
Write-Host "Restart ChatGPT, enable Codex Avatars in Plugins, and trust its lifecycle hooks when prompted."
Write-Host "The tray icon remains available even while passive mode is enabled."
