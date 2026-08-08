---
name: create-codex-avatar
description: Create, repair, or update a polished animated avatar for Codex Avatars using the native Codex Pet v2 format. Use when the user asks to create an avatar, mascot, companion, character, sprite, or Pet that should appear automatically in the Codex Avatars desktop overlay, including requests made from ChatGPT Work or Codex.
---

# Create Codex Avatar

Create the avatar by explicitly invoking the installed `$hatch-pet` workflow and stage the result as a local Codex Pet. Codex Avatars watches that same library, so do not create a second proprietary avatar format.

## Workflow

1. Invoke `$hatch-pet`, read its skill completely, and follow it without weakening its image-generation, direction, transparency, validation, or visual-QA gates.
2. Before running any Python script, call `load_workspace_dependencies`. Use the exact bundled Python executable it returns, verify `from PIL import Image`, and never fall back to bare `python`, the Microsoft Store alias, or an unrelated system interpreter.
3. Use the character description and references from the user. Ask only for a missing choice that would materially change the character; otherwise make mascot-safe visual decisions and proceed.
4. Produce a v2 package containing `pet.json` and `spritesheet.webp` together under `${CODEX_HOME}/pets/<pet-id>` or `~/.codex/pets/<pet-id>` when `CODEX_HOME` is unset.
5. Require `spriteVersionNumber: 2` and a validated `1536x2288` atlas with `192x208` cells. Use the validator supplied by `$hatch-pet` through the bundled runtime from step 2.
6. Leave the package in the local Pets directory. Do not copy personal avatars into the Codex Avatars Git repository.
7. Report the pet id, package path, validation result, and whether the user needs to enable it in Codex Avatars settings. New avatars are enabled automatically when that preference is active; the renderer refreshes the library within a few seconds.

Do not end a creation task merely because the atlas has assembled or passed structural validation. The task is incomplete until Hatch Pet's independent visual QA, three blind direction reviews, and final installation have all completed. When those gates pass, copy the final `pet.json` and `spritesheet.webp` together into the local Pets directory in the same turn. Only stop early for a genuine runtime or generation failure; then report the exact resume point without claiming that an avatar was created.

If `$hatch-pet` is unavailable, ask the user to open **Settings > Pets > Create your own pet** once so the desktop app installs it, then continue. If the bundled runtime is temporarily unavailable, stop with a clear resume point and no incomplete avatar files. Do not substitute a system Python, static icon, CSS blob, incomplete sheet, or locally improvised animation pipeline.
