'use strict';

const path = require('node:path');

const PLUGIN_NAME = 'codex-avatars';

function integrationRoot(options) {
  if (options.isPackaged) return path.join(options.resourcesPath, 'integration');
  return path.resolve(options.appPath);
}

function marketplacePath(options) {
  return path.join(integrationRoot(options), '.agents', 'plugins', 'marketplace.json');
}

function pluginDeepLink(absoluteMarketplacePath, mode = null) {
  const url = new URL(`codex://plugins/${PLUGIN_NAME}`);
  url.searchParams.set('marketplacePath', path.resolve(absoluteMarketplacePath));
  if (mode === 'share') url.searchParams.set('mode', 'share');
  return url.toString();
}

module.exports = {
  PLUGIN_NAME,
  integrationRoot,
  marketplacePath,
  pluginDeepLink,
};
