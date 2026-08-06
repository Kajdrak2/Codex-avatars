param(
    [string]$Marker = "CODEX_AVATARS_HOOK_V1",
    [string]$PipeName = "codex-avatars-v1"
)

$ErrorActionPreference = "Stop"

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
        "cwd",
        "agent_id",
        "agent_type",
        "tool_name"
    )) {
        if ($null -ne $source.$property) {
            $safePayload[$property] = $source.$property
        }
    }

    $json = $safePayload | ConvertTo-Json -Compress -Depth 4
    $pipe = [System.IO.Pipes.NamedPipeClientStream]::new(
        ".",
        $PipeName,
        [System.IO.Pipes.PipeDirection]::Out,
        [System.IO.Pipes.PipeOptions]::Asynchronous
    )
    $pipe.Connect(200)

    $encoding = [System.Text.UTF8Encoding]::new($false)
    $writer = [System.IO.StreamWriter]::new($pipe, $encoding)
    $writer.WriteLine($json)
    $writer.Flush()
    $writer.Dispose()
    $pipe.Dispose()
} catch {
    # The overlay is optional. A stopped app must never slow down or block Codex.
}

exit 0
