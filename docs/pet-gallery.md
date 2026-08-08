# Pet Gallery and `.codexpet` packages

Codex does not currently publish an official public marketplace for custom Pets. Codex Avatars therefore uses a deliberately small portable package as the first sharing layer: export a Pet from its card, attach the resulting `.codexpet` file to a GitHub release or another community catalog, and import it from the settings window.

## Package format v1

A `.codexpet` file is a ZIP archive containing only:

- `share.json`, identifying `codex-pet-package` format version 1;
- `pet.json`, with a safe non-path Pet id and `spriteVersionNumber: 2`;
- `spritesheet.webp`, the native `1536x2288` Pet v2 atlas;
- optional `README.md`, `LICENSE.md`, or `LICENSE` files.

Imports reject absolute or nested paths, traversal, duplicate/unknown entries, oversized archives, malformed manifests, non-v2 packages, and invalid atlas dimensions. Files are staged inside the local Pets directory and moved into place only after validation. Existing Pets are never overwritten; a collision receives a numeric suffix and an updated manifest id.

## Publishing a community catalog

Until a moderated hosted service exists, a Git repository can act as a decentralized catalog:

1. keep source art and build notes in the Pet’s own folder;
2. attach the exported `.codexpet` file and checksum to a tagged release;
3. include screenshots, author, license, supported Codex Avatars version, and atlas-validation evidence in the release notes;
4. let users download the package and import it from **Pet Gallery**.

A future network catalog can index those releases without changing the package format. Publication, moderation, signing, takedowns, and license review remain separate product work and should not be represented as an official OpenAI marketplace.
