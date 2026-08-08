'use strict';

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function reconcileAvatarSelection(settings, avatarIds) {
  const allIds = [...new Set((avatarIds || []).filter((id) => typeof id === 'string' && id))];
  let enabledIds = (settings.enabledAvatarIds || []).filter((id) => allIds.includes(id));
  const patch = {};
  if (!sameArray(enabledIds, settings.enabledAvatarIds || [])) patch.enabledAvatarIds = enabledIds;

  if (!settings.avatarSelectionInitialized && allIds.length > 0) {
    enabledIds = allIds;
    patch.enabledAvatarIds = enabledIds;
    patch.avatarSelectionInitialized = true;
  }

  const knownIds = new Set(settings.knownAvatarIds || []);
  if (!settings.avatarKnowledgeInitialized) {
    patch.knownAvatarIds = [...new Set([...knownIds, ...allIds])];
    patch.avatarKnowledgeInitialized = true;
  } else {
    const added = allIds.filter((id) => !knownIds.has(id));
    if (settings.autoEnableNewAvatars && added.length > 0) {
      patch.enabledAvatarIds = [...new Set([...enabledIds, ...added])];
    }
    if (added.length > 0) patch.knownAvatarIds = [...new Set([...knownIds, ...allIds])];
  }
  return patch;
}

module.exports = { reconcileAvatarSelection };
