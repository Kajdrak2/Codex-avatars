param(
    [string]$Marker = "CODEX_AVATARS_HOOK_V1",
    [string]$PipeName = "codex-avatars-v1",
    [string]$CompanionPath = "",
    [string]$DevRoot = "",
    [string]$PluginData = ""
)

$ErrorActionPreference = "Stop"

function Send-CodexAvatarEvent {
    param([string]$Json)

    try {
        $pipe = [System.IO.Pipes.NamedPipeClientStream]::new(
            ".",
            $PipeName,
            [System.IO.Pipes.PipeDirection]::Out,
            [System.IO.Pipes.PipeOptions]::Asynchronous
        )
        $pipe.Connect(180)
        $encoding = [System.Text.UTF8Encoding]::new($false)
        $writer = [System.IO.StreamWriter]::new($pipe, $encoding)
        $writer.WriteLine($Json)
        $writer.Flush()
        $writer.Dispose()
        $pipe.Dispose()
        return $true
    } catch {
        return $false
    }
}

function Start-CodexAvatarCompanion {
    $candidates = [System.Collections.Generic.List[string]]::new()
    if (-not [string]::IsNullOrWhiteSpace($CompanionPath)) {
        $candidates.Add($CompanionPath)
    }
    if (-not [string]::IsNullOrWhiteSpace($env:CODEX_AVATARS_APP)) {
        $candidates.Add($env:CODEX_AVATARS_APP)
    }

    $bundledCandidate = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\Codex Avatars.exe"))
    $candidates.Add($bundledCandidate)
    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        $candidates.Add((Join-Path $env:LOCALAPPDATA "Programs\Codex Avatars\Codex Avatars.exe"))
    }

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $arguments = @("--background")
            if (-not [string]::IsNullOrWhiteSpace($PluginData)) {
                $arguments += "--plugin-data=$PluginData"
            }
            Start-Process -FilePath $candidate -ArgumentList $arguments -WindowStyle Hidden
            return $true
        }
    }

    $developmentRoot = $DevRoot
    if ([string]::IsNullOrWhiteSpace($developmentRoot)) {
        $scriptParent = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
        if (Test-Path -LiteralPath (Join-Path $scriptParent "package.json") -PathType Leaf) {
            $developmentRoot = $scriptParent
        }
    }
    if ([string]::IsNullOrWhiteSpace($developmentRoot) -or -not (Test-Path -LiteralPath (Join-Path $developmentRoot "package.json") -PathType Leaf)) {
        $developmentRoot = $env:CODEX_AVATARS_DEV_ROOT
    }

    if (-not [string]::IsNullOrWhiteSpace($developmentRoot)) {
        $resolvedRoot = [System.IO.Path]::GetFullPath($developmentRoot)
        $electron = Join-Path $resolvedRoot "node_modules\electron\dist\electron.exe"
        $package = Join-Path $resolvedRoot "package.json"
        if ((Test-Path -LiteralPath $electron -PathType Leaf) -and (Test-Path -LiteralPath $package -PathType Leaf)) {
            $arguments = @($resolvedRoot, "--background")
            if (-not [string]::IsNullOrWhiteSpace($PluginData)) {
                $arguments += "--plugin-data=$PluginData"
            }
            Start-Process -FilePath $electron -ArgumentList $arguments -WindowStyle Hidden
            return $true
        }
    }

    return $false
}

try {
    $rawPayload = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($rawPayload)) {
        exit 0
    }

    $source = $rawPayload | ConvertFrom-Json
    $safePayload = [ordered]@{}
    foreach ($property in @(
        "hook_event_name",
        "session_id",
        "turn_id",
        "agent_id",
        "agent_type",
        "agent_name",
        "task_name",
        "model",
        "reasoning_effort"
    )) {
        if ($null -ne $source.$property) {
            $safePayload[$property] = $source.$property
        }
    }

    if ($null -ne $source.cwd -and -not [string]::IsNullOrWhiteSpace([string]$source.cwd)) {
        $normalizedCwd = ([string]$source.cwd) -replace '[\\/]+$', ''
        $projectName = Split-Path -Path $normalizedCwd -Leaf
        if (-not [string]::IsNullOrWhiteSpace($projectName)) {
            $safePayload["project"] = $projectName
        }
    }

    $json = $safePayload | ConvertTo-Json -Compress -Depth 4
    if (Send-CodexAvatarEvent -Json $json) {
        exit 0
    }

    if (Start-CodexAvatarCompanion) {
        for ($attempt = 0; $attempt -lt 32; $attempt += 1) {
            Start-Sleep -Milliseconds 75
            if (Send-CodexAvatarEvent -Json $json) {
                exit 0
            }
        }
    }
} catch {
    # The companion is optional. It must never block or fail a Codex task.
}

exit 0
