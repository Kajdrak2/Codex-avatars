(function labelLayoutModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CodexAvatarLabelLayout = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function labelLayout(settings, hasDetails) {
    const showName = Boolean(settings?.showLabels);
    const showDetails = Boolean(settings?.showAgentDetails) && Boolean(hasDetails);
    const visible = showName || showDetails;
    const twoLines = showName && showDetails;
    return {
      showName,
      showDetails,
      visible,
      height: visible ? (twoLines ? 50 : 34) : 0,
      space: visible ? (twoLines ? 52 : 36) : 8,
      sidePadding: visible ? 18 : 2,
    };
  }

  return { labelLayout };
}));
