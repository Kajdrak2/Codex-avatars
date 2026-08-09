# V2 marketplace and `.codexpet` packages

Codex Avatars merges its controlled [catalog fork](https://github.com/Kajdrak2/awesome-codex-pet) with the original third-party [Awesome Codex Pet](https://github.com/legeling/awesome-codex-pet) community catalog. It is not an official OpenAI marketplace. The controlled fork has priority; matching ids and exact spritesheet hashes are deduplicated, while different assets sharing a canonical character identity remain visible as variants. Each source is fetched and cached independently. The app filters both integrity manifests to native V2 Pets and installs a selected Pet only after its bytes, SHA-256 hashes, manifest, and `1536x2288` atlas have all been checked.

The portable `.codexpet` format remains available for direct sharing and local backups: export a Pet from its card, send the resulting file through a channel of your choice, and import it from settings.

## Package format v1

A `.codexpet` file is a ZIP archive containing only:

- `share.json`, identifying `codex-pet-package` format version 1;
- `pet.json`, with a safe non-path Pet id and `spriteVersionNumber: 2`;
- `spritesheet.webp`, the native `1536x2288` Pet v2 atlas;
- optional `README.md`, `LICENSE.md`, or `LICENSE` files.

Imports reject absolute or nested paths, traversal, duplicate/unknown entries, oversized archives, malformed manifests, non-v2 packages, and invalid atlas dimensions. Files are staged inside the local Pets directory and moved into place only after validation. Existing Pets are never overwritten; a collision receives a numeric suffix and an updated manifest id.

## Submitting to the community catalog

Choose a finished local V2 Pet in settings and select **Submit with GitHub**. A GitHub account is required, but Codex is never opened and no Codex credits are used. The in-app review displays the complete atlas and collects the repository metadata and human confirmations that cannot be inferred safely: authorship, final-pixel provenance, source type, canonical identity, any variant distinction, non-commercial terms, frame quality, directional quality, and transparent-edge review.

Before enabling publication, the app verifies a readable `1536x2288` V2 atlas, a spritesheet below the upstream 5,000,000-byte pull-request budget, bounded JSON fields, the required non-commercial statement, and a fresh catalog duplicate index covering every Pet version. Exact spritesheet matches and conflicting ids are blocked; an existing canonical key requires a material variant note.

GitHub authentication is delegated to the official GitHub CLI browser flow. A working existing CLI session is reused when available. If GitHub CLI is unavailable, a pinned Windows archive is downloaded from `cli/cli`, size-limited, checked against a hard-coded archive SHA-256, extracted by exact entry name, checked against a second hard-coded executable SHA-256, and stored under the application's user-data directory with its upstream license. On a first connection, GitHub opens in the browser, the one-time code is copied automatically, and the operation can be cancelled without blocking the dialog. Ambient `GH_TOKEN` and `GITHUB_TOKEN` values are removed from child-process environments. The application receives only the connected account name and GitHub API JSON; it never requests or reads the token.

Publication remains a distinct native user confirmation. Only after that confirmation does the app create three Git blobs, one tree, one commit, one submission branch, and one ready-for-review pull request against `Kajdrak2/awesome-codex-pet:main`. The catalog owner writes the branch directly; another contributor reuses or creates a fork within the same GitHub fork network. The public change contains exactly `submission.json`, `pet.json`, and `spritesheet.webp`; the local Pet is not renamed or modified. A protected default-branch workflow checks the changed-file scope, regular-file modes, bounded sizes, and successful `Pet previews` run for the exact pull-request commit before merging it automatically. Failed, draft, unrelated, or stale revisions remain unmerged.

Every marketplace card includes **Report**. The app accepts one fixed reason and a bounded explanation, then opens a prefilled public issue in the controlled catalog with verified Pet/source metadata and the `pet-report` label. Nothing is submitted in the background: the user reviews and sends the issue on GitHub. Reports must not contain private or secret information.

For advanced manual contribution, follow the controlled catalog's [contribution guide](https://github.com/Kajdrak2/awesome-codex-pet/blob/main/CONTRIBUTING.md). Do not submit Hatch Pet run folders, prompts, references, generated catalog indexes, or unrelated files.

Publication automation, moderation, signing, takedowns, and license review remain owned by the controlled catalog and contributor. Imported original-catalog entries retain their upstream authorship and license terms. Codex Avatars provides deterministic preflight, protected CI gates, a consent-gated GitHub bridge, and a public reporting path—not automated visual or legal judgment.
