# Security policy

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that could expose local data or modify Codex configuration unexpectedly. Contact the repository maintainers privately through the security-reporting channel configured on the Git hosting service.

## Security boundaries

- The renderer has no Node.js access and runs with context isolation and sandboxing.
- The local event bridge uses a Windows named pipe instead of a network port.
- The hook allowlists lifecycle metadata, reduces the working directory to its final project-folder name before transport, and discards prompts, transcripts, source code, tool arguments, tool output, and assistant messages.
- Hook installation merges with the existing configuration and creates a timestamped backup before writing.
- The installer records only its exact executable path and removes that value only if it still owns it during uninstall.
- Hook failures are silent and return success so the optional overlay cannot block Codex.
- Plugin hooks remain non-managed hooks and must pass Codex's hash-based trust review before execution.
- Avatar asset paths are confined to each Pet package and exposed to the renderer through a private protocol.
- Portable Pet imports accept only an allowlisted set of root files, reject traversal and oversize input, validate the v2 manifest and WebP dimensions, stage atomically, and never overwrite an existing directory.
- Agent-name/model enrichment reads only `thread_name` from the local session index plus `session_meta` and `turn_context` fields from the matching rollout; no prompt, response, tool payload, or transcript content is copied into application state.

Public Windows installers should be code-signed. Users should verify release checksums and review Codex hook trust prompts before enabling them; the installer never bypasses that review.
