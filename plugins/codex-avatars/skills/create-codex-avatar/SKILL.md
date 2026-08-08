---
name: create-codex-avatar
description: Create, repair, or update a polished animated avatar for Codex Avatars using the native Codex Pet v2 format. Use when the user asks to create an avatar, mascot, companion, character, sprite, or Pet that should appear automatically in the Codex Avatars desktop overlay, including requests made from ChatGPT Work or Codex.
---

# Create Codex Avatar

Create the avatar through the installed `hatch-pet` workflow and stage the result as a local Codex Pet. Codex Avatars watches that same library, so do not create a second proprietary avatar format.

## Workflow

1. Read the available `hatch-pet` skill completely and follow it without weakening its image-generation, direction, transparency, validation, or visual-QA gates.
2. Use the character description and references from the user. Ask only for a missing choice that would materially change the character; otherwise make mascot-safe visual decisions and proceed.
3. Produce a v2 package containing `pet.json` and `spritesheet.webp` together under `${CODEX_HOME}/pets/<pet-id>` or `~/.codex/pets/<pet-id>` when `CODEX_HOME` is unset.
4. Require `spriteVersionNumber: 2` and a validated `1536x2288` atlas with `192x208` cells. Use the bundled workspace Python and the validator supplied by `hatch-pet`.
5. Leave the package in the local Pets directory. Do not copy personal avatars into the Codex Avatars Git repository.
6. Report the pet id, package path, validation result, and whether the user needs to enable it in Codex Avatars settings. New avatars are enabled automatically when that preference is active; the renderer refreshes the library within a few seconds.

If `hatch-pet` is unavailable, ask the user to open **Settings > Pets > Create your own pet** once so the desktop app installs it, then continue. Do not substitute a static icon, CSS blob, incomplete sheet, or locally improvised animation pipeline.
