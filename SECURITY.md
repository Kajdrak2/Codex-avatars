# Security policy

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that could expose local data or modify Codex configuration unexpectedly. Contact the repository maintainers privately through the security-reporting channel configured on the Git hosting service.

## Security boundaries

- The renderer has no Node.js access and runs with context isolation and sandboxing.
- The local event bridge uses a Windows named pipe instead of a network port.
- The hook allowlists lifecycle metadata and discards prompts, transcripts, source code, tool arguments, tool output, and assistant messages.
- Hook installation merges with the existing configuration and creates a timestamped backup before writing.
- Hook failures are silent and return success so the optional overlay cannot block Codex.
- Plugin hooks remain non-managed hooks and must pass Codex's hash-based trust review before execution.
- Avatar asset paths are confined to each Pet package and exposed to the renderer through a private protocol.

Public Windows installers should be code-signed. Users should verify release checksums and review Codex hook trust prompts before enabling them.
