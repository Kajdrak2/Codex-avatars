'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  protocol,
  screen,
  shell,
  Tray,
} = require('electron');
const { AgentStore } = require('./core/agent-store.cjs');
const { reconcileAgentActivityRecords } = require('./core/agent-activity-reconciler.cjs');
const {
  AgentMetadataResolver,
  ThreadTitleMonitor,
  readRecentAgentActivityRecords,
} = require('./core/agent-metadata.cjs');
const { discoverAvatars, readWebpDimensions } = require('./core/avatar-library.cjs');
const { reconcileAvatarSelection } = require('./core/avatar-selection.cjs');
const { buildAvatarPrompt, codexNewThreadUrl } = require('./core/codex-launch.cjs');
const { normalizeHookEvent } = require('./core/event-normalizer.cjs');
const { buildFeedbackUrl, buildPetReportUrl } = require('./core/feedback-links.cjs');
const { createEventServer } = require('./core/pipe-server.cjs');
const {
  marketplacePath: resolvePluginMarketplacePath,
  pluginDeepLink,
} = require('./core/plugin-integration.cjs');
const {
  bootstrapWindowBounds,
  localRectToVirtual,
  resolveRoamingZone,
  serializeDisplay,
} = require('./core/roaming-zone.cjs');
const { exportPetPackage, importPetPackage, installPetBuffers } = require('./core/pet-packages.cjs');
const {
  CATALOG_GUIDE_URL,
  CATALOG_SITE_URL,
  MarketplaceClient,
  safeCatalogSlug,
  sha256,
} = require('./core/marketplace-client.cjs');
const {
  GITHUB_DEVICE_AUTHORIZATION_URL,
  GitHubCli,
  normalizeGitHubDeviceCode,
} = require('./core/github-cli.cjs');
const {
  CANONICAL_CATEGORY_PREFIXES: MARKETPLACE_CANONICAL_CATEGORY_PREFIXES,
  CATEGORIES: MARKETPLACE_CATEGORIES,
  GitHubMarketplacePublisher,
  SOURCE_TYPES: MARKETPLACE_SOURCE_TYPES,
  SOURCE_TYPES_REQUIRING_NOTES: MARKETPLACE_SOURCE_TYPES_REQUIRING_NOTES,
  analyzeCatalogDuplicates,
  prepareLocalSubmission,
} = require('./core/marketplace-submission.cjs');
const { mergeSettings, SettingsStore } = require('./core/settings-store.cjs');
const { checkForUpdate } = require('./core/update-check.cjs');
const {
  hooksStatus,
  installHooks,
  uninstallHooks,
} = require('./core/hook-config-service.cjs');

protocol.registerSchemesAsPrivileged([{
  scheme: 'codex-avatar',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
  },
}]);

const store = new AgentStore();
const captureArgument = findArgument('--capture=');
const settingsCaptureArgument = findArgument('--capture-settings=');
const settingsScrollArgument = findArgument('--settings-scroll=');
const onboardingCapture = process.argv.includes('--capture-onboarding');
const zonePickerCaptureArgument = findArgument('--capture-zone-picker=');
const profileArgument = findArgument('--profile=');
const capturePath = captureArgument ? path.resolve(process.cwd(), captureArgument) : null;
const settingsCapturePath = settingsCaptureArgument
  ? path.resolve(process.cwd(), settingsCaptureArgument)
  : null;
const zonePickerCapturePath = zonePickerCaptureArgument
  ? path.resolve(process.cwd(), zonePickerCaptureArgument)
  : null;
if (profileArgument) app.setPath('userData', path.resolve(process.cwd(), profileArgument));
const eventServer = createEventServer(handlePayload, profileArgument
  ? { pipeName: `codex-avatars-preview-${process.pid}` }
  : undefined);
const backgroundLaunch = process.argv.includes('--background');
const commandLineAction = process.argv.includes('--install-hooks')
  ? 'install'
  : process.argv.includes('--uninstall-hooks')
    ? 'uninstall'
    : null;

let settingsStore = null;
let settings = null;
let overlayWindow = null;
let settingsWindow = null;
let zonePickerWindow = null;
let zonePickerResolve = null;
let zonePickerBounds = null;
let tray = null;
let cleanupTimer = null;
let avatarRefreshTimer = null;
let agentActivityTimer = null;
let avatarRecords = [];
let avatarErrors = [];
let assetPaths = new Map();
let overlayHitTest = false;
let isQuitting = false;
let metadataResolver = null;
let threadTitleMonitor = null;
const pendingMetadata = new Set();
const recentAgentActivityCache = new Map();
let agentActivityRefreshPromise = null;
let demoSessionId = null;
const demoTimers = new Set();
let updateCheckStarted = false;
let marketplaceClient = null;
const pendingMarketplaceInstalls = new Map();
let githubCli = null;
let githubPublisher = null;
let pendingGithubConnection = null;
let pendingGithubConnectionAbortController = null;
let pendingMarketplaceSubmission = null;

function findArgument(prefix) {
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

async function promptForUpdate() {
  if (!app.isPackaged || updateCheckStarted) return;
  updateCheckStarted = true;
  let update = null;
  try {
    update = await checkForUpdate({
      currentVersion: app.getVersion(),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return;
  }
  if (!update) return;
  const french = settings?.language === 'fr';
  const result = await dialog.showMessageBox(settingsWindow, {
    type: 'info',
    title: 'Codex Avatars',
    message: french
      ? `Une mise à jour de Codex Avatars (${update.version}) est disponible.`
      : `A Codex Avatars update (${update.version}) is available.`,
    detail: french
      ? 'Téléchargez l’installateur, puis exécutez-le pour mettre à jour sans perdre vos réglages ni vos Pets.'
      : 'Download and run the installer to update without losing your settings or Pets.',
    buttons: french ? ['Télécharger la mise à jour', 'Plus tard'] : ['Download update', 'Later'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (result.response === 0) await shell.openExternal(update.downloadUrl);
}

function hookScriptPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'hooks', 'codex-hook.ps1')
    : path.join(__dirname, '..', 'scripts', 'codex-hook.ps1');
}

function codexHomePath() {
  return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

function pluginMarketplacePath() {
  return resolvePluginMarketplacePath({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    appPath: path.join(__dirname, '..'),
  });
}

async function openPluginInCodex() {
  const marketplace = pluginMarketplacePath();
  try {
    await fs.access(marketplace);
    const url = pluginDeepLink(marketplace);
    await shell.openExternal(url);
    return { opened: true, url };
  } catch (error) {
    return { opened: false, message: error.message };
  }
}

async function openFeedback() {
  const french = settings?.language === 'fr';
  const result = await dialog.showMessageBox(settingsWindow, {
    type: 'question',
    title: 'Codex Avatars',
    message: french ? 'Que souhaitez-vous partager ?' : 'What would you like to share?',
    detail: french
      ? 'GitHub s’ouvrira avec un brouillon guidé et la version de Codex Avatars déjà renseignée.'
      : 'GitHub will open with a guided draft and your Codex Avatars version already filled in.',
    buttons: french
      ? ['Signaler un bug', 'Proposer une amélioration', 'Annuler']
      : ['Report a bug', 'Suggest an improvement', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  });
  if (result.response === 2) return { opened: false, cancelled: true };
  const kind = result.response === 0 ? 'bug' : 'suggestion';
  const url = buildFeedbackUrl({ kind, version: app.getVersion(), language: settings?.language });
  await shell.openExternal(url);
  return { opened: true, cancelled: false, kind };
}

async function openMarketplacePetReport(rawSlug, payload) {
  if (!marketplaceClient) throw new Error('The marketplace is not ready yet.');
  const slug = safeCatalogSlug(rawSlug);
  const record = await marketplaceClient.record(slug, { signal: AbortSignal.timeout(12_000) });
  const url = buildPetReportUrl({
    pet: record,
    reason: payload?.reason,
    details: payload?.details,
    version: app.getVersion(),
    language: settings?.language,
  });
  await shell.openExternal(url);
  return { opened: true, slug };
}

function publicAvatar(record) {
  return {
    id: record.id,
    displayName: record.displayName,
    description: record.description,
    spriteVersionNumber: record.spriteVersionNumber,
    columns: record.columns,
    rows: record.rows,
    source: record.source,
    // `codex-avatar:` works in development but packaged Windows renderers can
    // reject a local WebP response from that custom protocol. Every record has
    // already passed the local Pet path and dimension checks, so a file URL is
    // the reliable renderer-only delivery path for this validated asset.
    assetUrl: pathToFileURL(record.spritesheetPath).toString(),
  };
}

function publicAvatars() {
  return avatarRecords.map(publicAvatar);
}

function publicMarketplaceCatalog(catalog) {
  const installedIds = new Set(avatarRecords.map((avatar) => avatar.id));
  return {
    provider: catalog.provider,
    repositoryUrl: catalog.repositoryUrl,
    siteUrl: catalog.siteUrl,
    guideUrl: catalog.guideUrl,
    fetchedAt: catalog.fetchedAt,
    source: catalog.source,
    stale: Boolean(catalog.stale),
    duplicateCount: catalog.duplicateCount,
    sources: catalog.sources,
    pets: catalog.pets.map((pet) => ({
      slug: pet.slug,
      name: pet.name,
      localizedNames: pet.localizedNames,
      author: pet.author,
      authorHandle: pet.authorHandle,
      authorUrl: pet.authorUrl,
      primaryCategory: pet.primaryCategory,
      collections: pet.collections,
      license: pet.license,
      description: pet.description,
      spriteVersionNumber: 2,
      spritesheetBytes: pet.spritesheetBytes,
      catalogSource: pet.catalogSource,
      repository: pet.repository,
      detailsUrl: pet.detailsUrl,
      installed: installedIds.has(pet.slug),
    })),
  };
}

async function loadMarketplace(force = false) {
  if (!marketplaceClient) throw new Error('The marketplace is not ready yet.');
  const catalog = await marketplaceClient.load({
    force,
    signal: AbortSignal.timeout(12_000),
  });
  return publicMarketplaceCatalog(catalog);
}

async function installMarketplacePet(rawSlug) {
  const slug = safeCatalogSlug(rawSlug);
  if (pendingMarketplaceInstalls.has(slug)) return pendingMarketplaceInstalls.get(slug);
  const operation = (async () => {
    const record = await marketplaceClient.record(slug, { signal: AbortSignal.timeout(12_000) });
    const existing = avatarRecords.find((avatar) => avatar.id === slug);
    if (existing) {
      const existingHash = sha256(await fs.readFile(existing.spritesheetPath));
      if (existingHash === record.spritesheetSha256) {
        return {
          alreadyInstalled: true,
          imported: { id: existing.id, displayName: existing.displayName, directory: existing.directory },
        };
      }
      throw new Error(`A different local Pet already uses the marketplace id ${slug}.`);
    }

    const downloaded = await marketplaceClient.fetchPetFiles(slug, { signal: AbortSignal.timeout(60_000) });
    const imported = await installPetBuffers(
      downloaded.petJson,
      downloaded.spritesheet,
      path.join(codexHomePath(), 'pets'),
      { requestedId: slug, collision: 'reject' },
    );
    await refreshAvatarLibrary();
    return { alreadyInstalled: false, imported };
  })();
  pendingMarketplaceInstalls.set(slug, operation);
  try {
    return await operation;
  } finally {
    pendingMarketplaceInstalls.delete(slug);
  }
}

function sendMarketplaceSubmissionProgress(stage, extra = {}) {
  if (!settingsWindow || settingsWindow.isDestroyed() || settingsWindow.webContents.isDestroyed()) return;
  settingsWindow.webContents.send('avatars:marketplace-submission-progress', { stage, ...extra });
}

async function marketplaceSubmissionStatus() {
  if (!githubCli) throw new Error('GitHub submission is not ready yet.');
  const github = await githubCli.status();
  return {
    github,
    canonicalCategoryPrefixes: MARKETPLACE_CANONICAL_CATEGORY_PREFIXES,
    categories: MARKETPLACE_CATEGORIES,
    sourceTypes: MARKETPLACE_SOURCE_TYPES,
    sourceTypesRequiringNotes: MARKETPLACE_SOURCE_TYPES_REQUIRING_NOTES,
  };
}

async function connectMarketplaceGithub() {
  if (!githubCli) throw new Error('GitHub submission is not ready yet.');
  if (pendingGithubConnection) return pendingGithubConnection;
  const abortController = new AbortController();
  pendingGithubConnectionAbortController = abortController;
  pendingGithubConnection = githubCli.connect({
    signal: abortController.signal,
    onProgress: (stage) => sendMarketplaceSubmissionProgress(stage),
    onDeviceCode: (code) => {
      clipboard.writeText(code);
      sendMarketplaceSubmissionProgress('github-device-code-copied', { code });
      void shell.openExternal(GITHUB_DEVICE_AUTHORIZATION_URL).catch(() => {
        sendMarketplaceSubmissionProgress('github-browser-open-failed', { code });
      });
    },
  }).then((github) => {
    sendMarketplaceSubmissionProgress('github-connected', { login: github.login });
    return {
      github,
      canonicalCategoryPrefixes: MARKETPLACE_CANONICAL_CATEGORY_PREFIXES,
      categories: MARKETPLACE_CATEGORIES,
      sourceTypes: MARKETPLACE_SOURCE_TYPES,
      sourceTypesRequiringNotes: MARKETPLACE_SOURCE_TYPES_REQUIRING_NOTES,
    };
  }).finally(() => {
    pendingGithubConnection = null;
    if (pendingGithubConnectionAbortController === abortController) {
      pendingGithubConnectionAbortController = null;
    }
  });
  return pendingGithubConnection;
}

function cancelMarketplaceGithubConnection() {
  const pending = Boolean(pendingGithubConnectionAbortController);
  pendingGithubConnectionAbortController?.abort();
  return { cancelled: pending };
}

async function submitMarketplacePetDirectly(payload) {
  if (pendingMarketplaceSubmission) throw new Error('A marketplace submission is already in progress.');
  const operation = (async () => {
    const avatarId = typeof payload?.avatarId === 'string' ? payload.avatarId : '';
    const record = avatarRecords.find((avatar) => avatar.id === avatarId);
    if (!record) throw new Error('The selected local Pet is no longer available.');
    const github = await githubCli.status();
    if (!github.connected) {
      const error = new Error('Connect a GitHub account before submitting this Pet.');
      error.code = 'GITHUB_NOT_CONNECTED';
      throw error;
    }

    sendMarketplaceSubmissionProgress('validating-local-pet');
    const prepared = await prepareLocalSubmission(record, payload?.form, { githubLogin: github.login });
    sendMarketplaceSubmissionProgress('checking-marketplace-duplicates');
    const duplicateCatalog = await marketplaceClient.duplicateIndex({
      force: true,
      requireFresh: true,
      signal: AbortSignal.timeout(20_000),
    });
    const duplicateReview = analyzeCatalogDuplicates(prepared, duplicateCatalog);
    const french = settings?.language === 'fr';
    const warningLines = duplicateReview.warnings.length > 0
      ? `\n\n${french ? 'Points à examiner' : 'Review notes'}:\n${duplicateReview.warnings.map((warning) => `• ${warning}`).join('\n')}`
      : '';
    const confirmation = await dialog.showMessageBox(settingsWindow, {
      type: 'warning',
      title: french ? 'Publier ce Pet sur GitHub ?' : 'Publish this Pet on GitHub?',
      message: french
        ? `Créer une pull request publique pour ${prepared.name} ?`
        : `Create a public pull request for ${prepared.name}?`,
      detail: french
        ? `Compte GitHub : @${github.login}\nDépôt : Kajdrak2/awesome-codex-pet\nFichiers publics : submission.json, pet.json et spritesheet.webp\n\nAucun crédit Codex ne sera utilisé. Cette action crée ou met à jour la branche et la pull request publiques de ce Pet.${warningLines}`
        : `GitHub account: @${github.login}\nRepository: Kajdrak2/awesome-codex-pet\nPublic files: submission.json, pet.json, and spritesheet.webp\n\nNo Codex credits will be used. This action creates or updates this Pet's public branch and pull request.${warningLines}`,
      buttons: french ? ['Publier la soumission', 'Annuler'] : ['Publish submission', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (confirmation.response !== 0) {
      sendMarketplaceSubmissionProgress('submission-cancelled');
      return { cancelled: true };
    }

    const published = await githubPublisher.publish(prepared, {
      login: github.login,
      warnings: duplicateReview.warnings,
      onProgress: (stage) => sendMarketplaceSubmissionProgress(stage),
    });
    sendMarketplaceSubmissionProgress('submission-complete', { url: published.url });
    let opened = true;
    try {
      await shell.openExternal(published.url);
    } catch {
      opened = false;
    }
    return { cancelled: false, opened, ...published };
  })();
  pendingMarketplaceSubmission = operation;
  try {
    return await operation;
  } finally {
    pendingMarketplaceSubmission = null;
  }
}

function currentDisplays() {
  const primaryId = String(screen.getPrimaryDisplay().id);
  return screen.getAllDisplays().map((display, index) => serializeDisplay({
    ...display,
    primary: String(display.id) === primaryId,
  }, index));
}

function currentZone() {
  return resolveRoamingZone(settings?.zone, currentDisplays());
}

async function refreshAvatarLibrary() {
  const result = await discoverAvatars([
    { path: path.join(codexHomePath(), 'pets'), source: 'codex-pet' },
    { path: path.join(app.getAppPath(), 'assets', 'avatars'), source: 'bundled' },
  ]);

  const valid = [];
  const validationErrors = [];
  for (const record of result.avatars) {
    const size = await readWebpDimensions(record.spritesheetPath);
    const expectedHeight = record.spriteVersionNumber === 2 ? 2288 : 1872;
    if (!size || size.width !== 1536 || size.height !== expectedHeight) {
      validationErrors.push({
        path: record.manifestPath,
        message: `Expected a 1536x${expectedHeight} atlas, received ${size ? `${size.width}x${size.height}` : 'an unreadable WebP'}.`,
      });
      continue;
    }
    valid.push(record);
  }

  avatarRecords = valid;
  avatarErrors = [...result.errors, ...validationErrors];
  assetPaths = new Map(valid.map((record) => [record.id, record.spritesheetPath]));
  if (capturePath || settingsCapturePath) {
    process.stderr.write(`[avatars] discovered=${result.avatars.length} valid=${valid.length} errors=${JSON.stringify(avatarErrors)}\n`);
  }

  if (settingsStore && settings) {
    const allIds = valid.map((avatar) => avatar.id);
    const patch = reconcileAvatarSelection(settings, allIds);
    if (Object.keys(patch).length > 0) settings = await settingsStore.update(patch);
  }

  broadcast('avatars:library', { avatars: publicAvatars(), errors: avatarErrors });
  broadcastSettings();
  return { avatars: publicAvatars(), errors: avatarErrors };
}

function broadcast(channel, payload) {
  for (const window of [overlayWindow, settingsWindow]) {
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  }
}

function broadcastState() {
  broadcast('avatars:state', store.snapshot());
}

function broadcastSettings() {
  if (!settings) return;
  broadcast('avatars:settings', settingsPayload(settings));
}

function settingsPayload(value) {
  const displays = currentDisplays();
  return {
    settings: value,
    zone: resolveRoamingZone(value?.zone, displays),
    displays,
  };
}

function previewAvatarSizes(patch) {
  if (!settings || !overlayWindow || overlayWindow.isDestroyed() || overlayWindow.webContents.isDestroyed()) return;
  const source = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
  const sizes = {};
  if (Object.hasOwn(source, 'mainAvatarSize')) sizes.mainAvatarSize = source.mainAvatarSize;
  if (Object.hasOwn(source, 'subagentAvatarSize')) sizes.subagentAvatarSize = source.subagentAvatarSize;
  if (Object.keys(sizes).length === 0) return;
  const preview = mergeSettings(settings, sizes);
  overlayWindow.webContents.send('avatars:settings', settingsPayload(preview));
}

function metadataTarget(event) {
  if (event.kind === 'agent.started' || event.kind === 'agent.stopped') {
    return { id: event.agentId, isRoot: false };
  }
  if (event.kind.startsWith('session.')) return { id: event.sessionId, isRoot: true };
  return null;
}

function enrichMetadata(event) {
  if (!metadataResolver || event.sessionId.startsWith('demo-')) return;
  const target = metadataTarget(event);
  if (!target || !target.id) return;
  const key = `${event.sessionId}:${target.id}`;
  if (pendingMetadata.has(key)) return;
  pendingMetadata.add(key);
  void metadataResolver.resolve(target.id, { isRoot: target.isRoot, refresh: true }).then((metadata) => {
    if (!metadata) return;
    const applied = store.apply({
      kind: 'agent.metadata',
      sessionId: event.sessionId,
      agentId: target.id,
      isRoot: target.isRoot,
      // Root labels are owned exclusively by ThreadTitleMonitor so a slower
      // enrichment read can never overwrite a newer task rename.
      agentLabel: target.isRoot ? null : metadata.label,
      agentNickname: metadata.nickname,
      // A lifecycle event is the freshest source when Codex provides these
      // fields. The local rollout fills only values absent from that event.
      model: event.model ? null : metadata.model,
      effort: event.effort ? null : metadata.effort,
      timestamp: Date.now(),
    });
    if (applied) {
      broadcastState();
    }
  }).finally(() => pendingMetadata.delete(key));
}

async function hydrateRecentAgents() {
  if (!metadataResolver) return;
  if (agentActivityRefreshPromise) return agentActivityRefreshPromise;
  agentActivityRefreshPromise = (async () => {
    let records = [];
    try {
      records = await readRecentAgentActivityRecords(metadataResolver.sessionsRoot, {
        cache: recentAgentActivityCache,
        changedOnly: true,
      });
    } catch {
      return;
    }

    const { changed, discoveredRoot } = reconcileAgentActivityRecords(store, records);
    if (changed) broadcastState();
    if (discoveredRoot) void threadTitleMonitor?.refresh();
  })().finally(() => {
    agentActivityRefreshPromise = null;
  });
  return agentActivityRefreshPromise;
}

function activeThreadIds() {
  return store.snapshot().sessions.map((session) => session.id);
}

function applyThreadTitles(titles) {
  if (!(titles instanceof Map) || titles.size === 0) return;
  const sessions = new Map(store.snapshot().sessions.map((session) => [session.id, session]));
  let changed = false;
  for (const [sessionId, label] of titles) {
    const session = sessions.get(sessionId);
    const root = session?.agents.find((agent) => agent.isRoot);
    if (!root || !label || root.label === label) continue;
    changed = store.apply({
      kind: 'agent.metadata',
      sessionId,
      agentId: sessionId,
      isRoot: true,
      agentLabel: label,
      timestamp: Date.now(),
    }) || changed;
  }
  if (changed) broadcastState();
}

function handlePayload(payload) {
  const event = normalizeHookEvent(payload);
  if ((capturePath || settingsCapturePath) && event) process.stderr.write(`[avatars] event=${event.kind}\n`);
  const rootKnown = event
    ? store.hasAgent(event.sessionId, event.sessionId, true)
    : true;
  if (event && store.apply(event)) {
    broadcastState();
    enrichMetadata(event);
    if (!rootKnown) void threadTitleMonitor?.refresh();
  }
}

function attachWindowDiagnostics(window, label) {
  if (!capturePath && !settingsCapturePath && !process.argv.includes('--dev')) return;
  window.webContents.on('console-message', (...args) => {
    const detail = args.find((argument) => argument && typeof argument === 'object' && 'message' in argument);
    const message = detail?.message || args.find((argument) => typeof argument === 'string');
    if (message) process.stderr.write(`[${label}] ${message}\n`);
  });
  window.webContents.on('did-fail-load', (_event, code, description) => {
    process.stderr.write(`[${label}] load failed ${code}: ${description}\n`);
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    process.stderr.write(`[${label}] renderer gone: ${details.reason}\n`);
  });
}

function updateOverlayInputMode() {
  if (!overlayWindow || overlayWindow.isDestroyed() || !settings) return;
  const ignore = !settings.overlayEnabled || settings.passive || !overlayHitTest;
  overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
}

function sameBounds(left, right) {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}

function lockWindowToBounds(window, bounds, label) {
  if (!window || window.isDestroyed()) return false;
  window.setBounds(bounds, false);
  window.setResizable(false);
  window.setMovable(false);
  const actual = window.getBounds();
  if (!sameBounds(actual, bounds)) {
    process.stderr.write(`[${label}] requested bounds ${JSON.stringify(bounds)}, received ${JSON.stringify(actual)}\n`);
    return false;
  }
  return true;
}

function syncOverlayVisibility() {
  if (!overlayWindow || overlayWindow.isDestroyed() || !settings) return;
  if (!settings.overlayEnabled) {
    overlayWindow.hide();
    updateOverlayInputMode();
    return;
  }
  overlayWindow.showInactive();
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.moveTop();
  updateOverlayInputMode();
}

async function applySettingsPatch(patch, options = {}) {
  const previousZone = JSON.stringify(settings?.zone);
  settings = await settingsStore.update(patch);
  overlayHitTest = false;
  updateOverlayInputMode();
  rebuildTrayMenu();
  broadcastSettings();

  if (options.rebuildOverlay || previousZone !== JSON.stringify(settings.zone)) {
    await rebuildOverlayWindow();
  } else {
    syncOverlayVisibility();
  }
  return settings;
}

function createOverlayWindow() {
  const displays = currentDisplays();
  const resolved = resolveRoamingZone(settings?.zone, displays);
  const targetBounds = capturePath
    ? { x: resolved.windowBounds.x, y: resolved.windowBounds.y, width: 1200, height: 700 }
    : resolved.windowBounds;
  const initialBounds = bootstrapWindowBounds(targetBounds, displays);

  overlayWindow = new BrowserWindow({
    ...initialBounds,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    roundedCorners: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload-overlay.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setWindowButtonVisibility?.(false);
  overlayWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  overlayWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  attachWindowDiagnostics(overlayWindow, 'overlay');
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  overlayWindow.once('ready-to-show', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    lockWindowToBounds(overlayWindow, targetBounds, 'overlay');
    syncOverlayVisibility();
    broadcastState();
    broadcastSettings();

    if (capturePath) {
      runDemo();
      setTimeout(() => void captureAndQuit(overlayWindow, capturePath), 2_400);
    }
  });
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

async function rebuildOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
    overlayWindow = null;
  }
  createOverlayWindow();
}

function settleZonePicker(rectangle) {
  if (!zonePickerResolve) return;
  const resolve = zonePickerResolve;
  const bounds = zonePickerBounds;
  zonePickerResolve = null;
  zonePickerBounds = null;
  if (zonePickerWindow && !zonePickerWindow.isDestroyed()) zonePickerWindow.destroy();
  zonePickerWindow = null;
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
  }
  if (!rectangle || !bounds) {
    resolve(null);
    return;
  }
  resolve(localRectToVirtual(rectangle, bounds));
}

function selectCustomZone() {
  if (zonePickerWindow && !zonePickerWindow.isDestroyed()) {
    zonePickerWindow.focus();
    return Promise.resolve(null);
  }
  const displays = currentDisplays();
  const allDisplays = resolveRoamingZone({ mode: 'all' }, displays);
  zonePickerBounds = allDisplays.windowBounds;
  const initialBounds = bootstrapWindowBounds(zonePickerBounds, displays);
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.hide();

  zonePickerWindow = new BrowserWindow({
    ...initialBounds,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    roundedCorners: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-zone-picker.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  zonePickerWindow.setAlwaysOnTop(true, 'screen-saver');
  zonePickerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  zonePickerWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  zonePickerWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  attachWindowDiagnostics(zonePickerWindow, 'zone-picker');
  zonePickerWindow.loadFile(path.join(__dirname, 'renderer', 'zone-picker.html'), {
    query: { language: settings.language },
  });
  zonePickerWindow.once('ready-to-show', () => {
    if (!zonePickerWindow || zonePickerWindow.isDestroyed()) return;
    lockWindowToBounds(zonePickerWindow, zonePickerBounds, 'zone-picker');
    zonePickerWindow.show();
    zonePickerWindow.focus();
  });
  zonePickerWindow.on('closed', () => {
    zonePickerWindow = null;
    if (zonePickerResolve) settleZonePicker(null);
  });
  return new Promise((resolve) => {
    zonePickerResolve = resolve;
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) return settingsWindow;
  settingsWindow = new BrowserWindow({
    width: 860,
    height: 780,
    minWidth: 720,
    minHeight: 620,
    title: 'Codex Avatars',
    autoHideMenuBar: true,
    backgroundColor: '#0b0b10',
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  settingsWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  attachWindowDiagnostics(settingsWindow, 'settings');
  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  settingsWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    cancelMarketplaceGithubConnection();
    settingsWindow.hide();
  });
  settingsWindow.on('closed', () => {
    cancelMarketplaceGithubConnection();
    settingsWindow = null;
  });
  settingsWindow.once('ready-to-show', () => {
    if (!backgroundLaunch && !capturePath && !zonePickerCapturePath) settingsWindow.show();
    if (settingsCapturePath) {
      settingsWindow.show();
      setTimeout(async () => {
        if (settingsScrollArgument === 'submission' || settingsScrollArgument === 'submission-device-code') {
          await settingsWindow.webContents.executeJavaScript(`(() => {
            const select = document.querySelector('#submission-pet');
            const option = [...select.options].find((candidate) => candidate.value);
            if (!option) return false;
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            document.querySelector('#submit-marketplace-pet').click();
            return true;
          })()`);
          if (settingsScrollArgument === 'submission-device-code') {
            await new Promise((resolve) => setTimeout(resolve, 700));
            await settingsWindow.webContents.executeJavaScript(`(() => {
              marketplaceSubmissionOperation = 'connecting';
              setMarketplaceGithubDeviceCode('ABCD-EFGH');
              setMarketplaceSubmissionProgress(c().submissionStage('github-device-code-copied'));
              renderMarketplaceSubmissionStatus();
            })()`);
          }
          setTimeout(() => void captureAndQuit(settingsWindow, settingsCapturePath), 1_000);
          return;
        }
        const scroll = Math.max(0, Math.min(10_000, Number(settingsScrollArgument) || 0));
        if (scroll > 0) await settingsWindow.webContents.executeJavaScript(`window.scrollTo(0, ${scroll})`);
        setTimeout(() => void captureAndQuit(settingsWindow, settingsCapturePath), 120);
      }, 780);
    }
  });
  return settingsWindow;
}

function showSettingsWindow() {
  const window = createSettingsWindow();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

async function captureAndQuit(window, outputPath) {
  try {
    const image = await window.webContents.capturePage();
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, image.toPNG());
  } finally {
    isQuitting = true;
    app.quit();
  }
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon.png'))
    .resize({ width: 20, height: 20 });
  tray = new Tray(icon);
  tray.setToolTip('Codex Avatars');
  tray.on('click', showSettingsWindow);
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  if (!tray || !settings) return;
  const french = settings.language === 'fr';
  tray.setToolTip(settings.overlayEnabled
    ? 'Codex Avatars'
    : (french ? 'Codex Avatars — désactivés' : 'Codex Avatars — disabled'));
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: french ? 'Ouvrir les réglages' : 'Open settings',
      click: showSettingsWindow,
    },
    {
      label: settings.overlayEnabled
        ? (french ? 'Désactiver les avatars' : 'Disable avatars')
        : (french ? 'Activer les avatars' : 'Enable avatars'),
      click: () => void applySettingsPatch({ overlayEnabled: !settings.overlayEnabled }),
    },
    {
      label: french ? 'Mode passif (clics traversants)' : 'Passive mode (click-through)',
      type: 'checkbox',
      checked: settings.passive,
      click: (item) => void applySettingsPatch({ passive: item.checked }),
    },
    { type: 'separator' },
    {
      label: demoSessionId
        ? (french ? 'Arrêter la démo' : 'Stop demo')
        : (french ? 'Lancer la démo' : 'Run demo'),
      click: toggleDemo,
    },
    {
      label: french ? 'Actualiser les avatars' : 'Refresh avatars',
      click: () => void refreshAvatarLibrary(),
    },
    { type: 'separator' },
    {
      label: french ? 'Quitter' : 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
}

function runDemo() {
  if (demoSessionId) return { running: true, sessionId: demoSessionId };
  const sessionId = `demo-${Date.now()}`;
  demoSessionId = sessionId;
  const base = { session_id: sessionId, cwd: 'C:\\Projects\\tiny-space-station' };
  const emit = (delay, event) => {
    const timer = setTimeout(() => {
      demoTimers.delete(timer);
      if (demoSessionId === sessionId) handlePayload({ ...base, ...event });
    }, delay);
    demoTimers.add(timer);
  };

  emit(0, { hook_event_name: 'SessionStart', agent_name: 'Tiny Space Station', model: 'gpt-5.6-sol', reasoning_effort: 'high' });
  emit(80, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-1`, agent_type: 'default', agent_name: 'Explorer', model: 'gpt-5.6-terra', reasoning_effort: 'medium' });
  emit(240, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-2`, agent_type: 'default', agent_name: 'UI builder', model: 'gpt-5.6-terra', reasoning_effort: 'high' });
  emit(400, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-3`, agent_type: 'default', agent_name: 'Test runner', model: 'gpt-5.6-terra', reasoning_effort: 'medium' });
  const dormantTimer = setTimeout(() => {
    demoTimers.delete(dormantTimer);
    if (demoSessionId !== sessionId) return;
    const timestamp = Date.now();
    const dormantId = `${sessionId}-sleeping`;
    store.apply({
      kind: 'agent.started', sessionId, agentId: dormantId, agentType: 'default',
      agentLabel: 'Dormant architect', model: 'gpt-5.6-terra', effort: 'low', timestamp: timestamp - 8_000,
    });
    store.apply({
      kind: 'agent.stopped', sessionId, agentId: dormantId, agentType: 'default',
      agentLabel: 'Dormant architect', model: 'gpt-5.6-terra', effort: 'low', timestamp: timestamp - 7_500,
    });
    if (store.cleanup(timestamp)) broadcastState();
  }, 620);
  demoTimers.add(dormantTimer);
  emit(5_500, { hook_event_name: 'PermissionRequest' });
  emit(7_000, { hook_event_name: 'UserPromptSubmit' });
  emit(10_000, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-1`, agent_type: 'explorer' });
  emit(10_400, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-2`, agent_type: 'ui_builder' });
  emit(10_800, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-3`, agent_type: 'test_runner' });
  emit(11_200, { hook_event_name: 'Stop' });
  const endTimer = setTimeout(() => {
    demoTimers.delete(endTimer);
    if (demoSessionId === sessionId) stopDemo();
  }, 13_000);
  demoTimers.add(endTimer);
  broadcast('avatars:demo', { running: true, sessionId });
  rebuildTrayMenu();
  return { running: true, sessionId };
}

function stopDemo() {
  for (const timer of demoTimers) clearTimeout(timer);
  demoTimers.clear();
  const sessionId = demoSessionId;
  demoSessionId = null;
  if (sessionId) store.removeSession(sessionId);
  broadcastState();
  broadcast('avatars:demo', { running: false, sessionId: null });
  rebuildTrayMenu();
  return { running: false, sessionId: null };
}

function toggleDemo() {
  return demoSessionId ? stopDemo() : runDemo();
}

async function settingsBootstrapPayload() {
  let pluginAvailable = true;
  try {
    await fs.access(pluginMarketplacePath());
  } catch {
    pluginAvailable = false;
  }
  return {
    state: store.snapshot(),
    settings,
    avatars: publicAvatars(),
    displays: currentDisplays(),
    zone: currentZone(),
    launchAtLogin: app.getLoginItemSettings().openAtLogin,
    hooks: await hooksStatus(),
    version: app.getVersion(),
    settingsCapture: Boolean(settingsCapturePath) && !onboardingCapture,
    demo: { running: Boolean(demoSessionId), sessionId: demoSessionId },
    plugin: {
      available: pluginAvailable,
      onboardingCompleted: settings.onboardingCompleted,
    },
  };
}

function overlayBootstrapPayload() {
  return {
    state: store.snapshot(),
    settings,
    avatars: publicAvatars(),
    zone: currentZone(),
  };
}

function isWindowSender(event, window) {
  return Boolean(
    window
    && !window.isDestroyed()
    && !window.webContents.isDestroyed()
    && event.sender === window.webContents,
  );
}

function requireWindowSender(event, window, role) {
  if (!isWindowSender(event, window)) throw new Error(`IPC access denied for ${role}.`);
}

function registerIpc() {
  ipcMain.handle('avatars:get-settings-bootstrap', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return settingsBootstrapPayload();
  });
  ipcMain.handle('avatars:get-overlay-bootstrap', (event) => {
    requireWindowSender(event, overlayWindow, 'overlay');
    return overlayBootstrapPayload();
  });
  ipcMain.handle('avatars:update-settings', (event, patch) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return applySettingsPatch(patch);
  });
  ipcMain.on('avatars:preview-avatar-sizes', (event, patch) => {
    if (!isWindowSender(event, settingsWindow)) return;
    previewAvatarSizes(patch);
  });
  ipcMain.handle('avatars:set-launch-at-login', (event, value) => {
    requireWindowSender(event, settingsWindow, 'settings');
    app.setLoginItemSettings({
      openAtLogin: Boolean(value),
      path: process.execPath,
      args: ['--background'],
    });
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle('avatars:install-hooks', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return installHooks(hookScriptPath());
  });
  ipcMain.handle('avatars:uninstall-hooks', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return uninstallHooks();
  });
  ipcMain.handle('avatars:hooks-status', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return hooksStatus();
  });
  ipcMain.handle('avatars:refresh-library', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return refreshAvatarLibrary();
  });
  ipcMain.handle('avatars:open-feedback', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return openFeedback();
  });
  ipcMain.handle('avatars:get-marketplace', (event, options) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return loadMarketplace(Boolean(options?.force));
  });
  ipcMain.handle('avatars:get-marketplace-thumbnail', (event, slug) => {
    requireWindowSender(event, settingsWindow, 'settings');
    if (!marketplaceClient) throw new Error('The marketplace is not ready yet.');
    return marketplaceClient.thumbnail(slug, { signal: AbortSignal.timeout(12_000) });
  });
  ipcMain.handle('avatars:install-marketplace-pet', (event, slug) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return installMarketplacePet(slug);
  });
  ipcMain.handle('avatars:open-marketplace', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return shell.openExternal(CATALOG_SITE_URL);
  });
  ipcMain.handle('avatars:open-marketplace-pet', async (event, slug) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const safeSlug = safeCatalogSlug(slug);
    const record = await marketplaceClient.record(safeSlug, { signal: AbortSignal.timeout(12_000) });
    return shell.openExternal(record.detailsUrl);
  });
  ipcMain.handle('avatars:report-marketplace-pet', (event, slug, payload) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return openMarketplacePetReport(slug, payload);
  });
  ipcMain.handle('avatars:open-submission-guide', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return shell.openExternal(CATALOG_GUIDE_URL);
  });
  ipcMain.handle('avatars:get-marketplace-submission-status', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return marketplaceSubmissionStatus();
  });
  ipcMain.handle('avatars:connect-marketplace-github', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return connectMarketplaceGithub();
  });
  ipcMain.handle('avatars:open-marketplace-github-authorization', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return shell.openExternal(GITHUB_DEVICE_AUTHORIZATION_URL);
  });
  ipcMain.handle('avatars:copy-marketplace-github-device-code', (event, value) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const code = normalizeGitHubDeviceCode(value);
    if (!code) throw new Error('GitHub returned an invalid one-time code.');
    clipboard.writeText(code);
    return { copied: true };
  });
  ipcMain.handle('avatars:cancel-marketplace-github', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return cancelMarketplaceGithubConnection();
  });
  ipcMain.handle('avatars:submit-marketplace-pet', (event, payload) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return submitMarketplacePetDirectly(payload);
  });
  ipcMain.handle('avatars:overlay-hit-test', (event, value) => {
    requireWindowSender(event, overlayWindow, 'overlay');
    overlayHitTest = Boolean(value);
    updateOverlayInputMode();
    return settings.overlayEnabled && !settings.passive && overlayHitTest;
  });
  ipcMain.handle('avatars:create-avatar', async (event, brief) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const prompt = buildAvatarPrompt(brief, settings.language);
    const url = codexNewThreadUrl(prompt);
    try {
      await shell.openExternal(url);
      return { opened: true, copied: false, url };
    } catch (error) {
      clipboard.writeText(prompt);
      return { opened: false, copied: true, message: error.message };
    }
  });
  ipcMain.handle('avatars:copy-create-prompt', (event, brief) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const prompt = buildAvatarPrompt(brief, settings.language);
    clipboard.writeText(prompt);
    return prompt;
  });
  ipcMain.handle('avatars:pick-zone', async (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const rectangle = await selectCustomZone();
    if (!rectangle) return { cancelled: true };
    const next = await applySettingsPatch({ zone: { mode: 'custom', custom: rectangle } }, { rebuildOverlay: true });
    return { cancelled: false, rectangle, settings: next };
  });
  ipcMain.handle('avatars:zone-picker-complete', (event, rectangle) => {
    requireWindowSender(event, zonePickerWindow, 'zone picker');
    settleZonePicker(rectangle);
    return true;
  });
  ipcMain.handle('avatars:zone-picker-cancel', (event) => {
    requireWindowSender(event, zonePickerWindow, 'zone picker');
    settleZonePicker(null);
    return true;
  });
  ipcMain.handle('avatars:import-pet', async (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const options = {
      title: settings.language === 'fr' ? 'Importer un Pet' : 'Import a Pet',
      properties: ['openFile'],
      filters: [
        { name: 'Codex Pet package', extensions: ['codexpet', 'zip'] },
        { name: 'All files', extensions: ['*'] },
      ],
    };
    const result = settingsWindow && !settingsWindow.isDestroyed()
      ? await dialog.showOpenDialog(settingsWindow, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return { cancelled: true };
    const imported = await importPetPackage(result.filePaths[0], path.join(codexHomePath(), 'pets'));
    await refreshAvatarLibrary();
    return { cancelled: false, imported };
  });
  ipcMain.handle('avatars:export-pet', async (event, avatarId) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const record = avatarRecords.find((avatar) => avatar.id === avatarId);
    if (!record) throw new Error('The selected Pet is no longer available.');
    const options = {
      title: settings.language === 'fr' ? 'Partager ce Pet' : 'Share this Pet',
      defaultPath: `${record.id}.codexpet`,
      filters: [{ name: 'Codex Pet package', extensions: ['codexpet'] }],
    };
    const result = settingsWindow && !settingsWindow.isDestroyed()
      ? await dialog.showSaveDialog(settingsWindow, options)
      : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return { cancelled: true };
    await exportPetPackage(record, result.filePath);
    return { cancelled: false, filePath: result.filePath };
  });
  ipcMain.handle('avatars:open-pets-doc', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return shell.openExternal('https://learn.chatgpt.com/docs/pets');
  });
  ipcMain.handle('avatars:open-plugin', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return openPluginInCodex();
  });
  ipcMain.handle('avatars:open-pet-directory', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return shell.openPath(path.join(codexHomePath(), 'pets'));
  });
  ipcMain.handle('avatars:demo', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return toggleDemo();
  });
}

async function startApplication() {
  app.setAppUserModelId('dev.codexavatars.desktop');
  settingsStore = new SettingsStore(path.join(app.getPath('userData'), 'settings.json'));
  settings = await settingsStore.load();
  marketplaceClient = new MarketplaceClient({
    cacheDirectory: path.join(app.getPath('userData'), 'marketplace-cache'),
    renderThumbnail: (spritesheet) => {
      const atlas = nativeImage.createFromBuffer(spritesheet);
      const size = atlas.getSize();
      if (atlas.isEmpty() || size.width !== 1536 || size.height !== 2288) {
        throw new Error('The marketplace thumbnail source is not a native V2 atlas.');
      }
      return atlas
        .crop({ x: 0, y: 0, width: 192, height: 208 })
        .resize({ width: 384, height: 416, quality: 'best' })
        .toPNG();
    },
  });
  githubCli = new GitHubCli({
    toolDirectory: path.join(app.getPath('userData'), 'tools', 'github-cli'),
    configDirectory: path.join(app.getPath('userData'), 'github-cli-config'),
  });
  githubPublisher = new GitHubMarketplacePublisher({ github: githubCli });
  metadataResolver = new AgentMetadataResolver(path.join(codexHomePath(), 'sessions'));
  threadTitleMonitor = new ThreadTitleMonitor(metadataResolver.threadIndexPath, {
    getThreadIds: activeThreadIds,
    readTitles: (threadIds) => metadataResolver.refreshThreadNames(threadIds),
    onTitles: applyThreadTitles,
  });
  threadTitleMonitor.start();

  protocol.handle('codex-avatar', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'asset') return new Response('Not found', { status: 404 });
      const id = decodeURIComponent(url.pathname.replace(/^\//, ''));
      const assetPath = assetPaths.get(id);
      if (!assetPath) return new Response('Not found', { status: 404 });
      const data = await fs.readFile(assetPath);
      return new Response(data, { headers: { 'content-type': 'image/webp', 'cache-control': 'no-store' } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  registerIpc();
  await refreshAvatarLibrary();
  await eventServer.listen();
  await hydrateRecentAgents();
  createTray();
  createOverlayWindow();
  createSettingsWindow();
  void promptForUpdate();

  if (zonePickerCapturePath) {
    void selectCustomZone();
    setTimeout(() => {
      if (zonePickerWindow && !zonePickerWindow.isDestroyed()) {
        void captureAndQuit(zonePickerWindow, zonePickerCapturePath);
      }
    }, 850);
  }

  globalShortcut.register('CommandOrControl+Alt+A', () => {
    void applySettingsPatch({ passive: !settings.passive });
  });

  const handleDisplayChange = () => {
    broadcastSettings();
    void rebuildOverlayWindow();
  };
  screen.on('display-added', handleDisplayChange);
  screen.on('display-removed', handleDisplayChange);
  screen.on('display-metrics-changed', handleDisplayChange);

  cleanupTimer = setInterval(() => {
    if (store.cleanup()) broadcastState();
  }, 1_000);
  agentActivityTimer = setInterval(() => void hydrateRecentAgents(), 1_500);
  avatarRefreshTimer = setInterval(() => void refreshAvatarLibrary(), 5_000);
}

if (commandLineAction) {
  app.whenReady().then(async () => {
    try {
      if (commandLineAction === 'install') await installHooks(hookScriptPath());
      else await uninstallHooks();
      app.exit(0);
    } catch {
      app.exit(1);
    }
  });
} else {
  const hasLock = app.requestSingleInstanceLock();
  if (!hasLock) app.quit();

  if (hasLock) {
    app.on('second-instance', showSettingsWindow);
    app.on('activate', showSettingsWindow);
    app.whenReady().then(startApplication);
  }
}

app.on('window-all-closed', () => {
  // The tray owns the process lifetime. Closing settings never removes the avatars.
});
app.on('before-quit', () => {
  isQuitting = true;
});
app.on('will-quit', () => {
  if (cleanupTimer) clearInterval(cleanupTimer);
  if (agentActivityTimer) clearInterval(agentActivityTimer);
  if (avatarRefreshTimer) clearInterval(avatarRefreshTimer);
  if (threadTitleMonitor) threadTitleMonitor.close();
  for (const timer of demoTimers) clearTimeout(timer);
  demoTimers.clear();
  globalShortcut.unregisterAll();
  void eventServer.close();
});
