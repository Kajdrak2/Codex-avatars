'use strict';

const api = window.codexAvatars;
const isFrench = navigator.language.toLowerCase().startsWith('fr');
const copy = isFrench ? {
  headerSubtitle: 'Des compagnons indépendants pour chaque agent Codex',
  active: (count) => count ? `${count} agent${count > 1 ? 's' : ''} actif${count > 1 ? 's' : ''}` : 'En attente de Codex',
  controlEyebrow: 'Contrôle permanent',
  controlTitle: 'Overlay',
  passiveTitle: 'Mode passif',
  passiveCopy: 'Les clics traversent les avatars. Désactive-le ici, depuis l’icône Windows ou avec le raccourci.',
  startupTitle: 'Démarrer avec Windows (secours)',
  startupCopy: 'Le plugin démarre déjà le renderer au premier événement Codex. Cette option le garde prêt dès la connexion.',
  avatarsEyebrow: 'Bibliothèque locale',
  avatarsTitle: 'Avatars actifs',
  avatarsCopy: 'Formats Pets Codex v2 natifs, assignés indépendamment aux agents.',
  refresh: 'Actualiser',
  emptyTitle: 'Aucun Pet compatible détecté',
  emptyCopy: 'Crée un Pet dans Codex, puis actualise cette bibliothèque.',
  avatarSize: 'Taille',
  labels: 'Afficher les noms',
  autoEnable: 'Activer les nouveaux avatars',
  reduceMotion: 'Réduire les mouvements',
  createTitle: 'Créer depuis Work ou Codex',
  createCopy: 'Le plugin lance le workflow hatch-pet officiel. Le nouvel avatar apparaît ici automatiquement.',
  copyPrompt: 'Copier la commande',
  openFolder: 'Ouvrir le dossier',
  copied: 'Commande copiée. Colle-la dans une nouvelle tâche Work ou Codex.',
  zoneEyebrow: 'Multi-écrans',
  zoneTitle: 'Zone de déplacement',
  zoneCopy: 'Choisis tous les écrans, une sélection ou un rectangle précis.',
  allScreens: 'Tous les écrans',
  selectedScreens: 'Écrans choisis',
  customArea: 'Zone personnalisée',
  width: 'Largeur',
  height: 'Hauteur',
  apply: 'Appliquer',
  integrationEyebrow: 'Intégration',
  integrationTitle: 'Codex + compagnon système',
  integrationCopy: 'L’installateur active le compagnon local. Finalise le plugin dans Codex pour la création d’avatars et les hooks intégrés.',
  openPlugin: 'Terminer dans Codex',
  pluginOpened: 'Codex est ouvert. Installe le plugin puis vérifie ses hooks.',
  pluginUnavailable: 'Le paquet plugin est introuvable dans cette installation.',
  enableHooks: 'Activer les hooks autonomes',
  disableHooks: 'Désactiver les hooks autonomes',
  docs: 'Documentation Pets',
  demo: 'Lancer une démo',
  codexPet: 'Pet Codex',
  bundled: 'Inclus',
  enabled: 'Activé',
  disabled: 'Désactivé',
  hooksOn: 'Hooks autonomes activés.',
  hooksOff: 'Hooks autonomes désactivés.',
  saveError: 'Impossible d’enregistrer ce réglage.',
} : {
  headerSubtitle: 'Independent companions for every Codex agent',
  active: (count) => count ? `${count} active agent${count > 1 ? 's' : ''}` : 'Waiting for Codex',
  controlEyebrow: 'Always available',
  controlTitle: 'Overlay',
  passiveTitle: 'Passive mode',
  passiveCopy: 'Clicks pass through avatars. Turn it off here, from the Windows tray icon, or with the shortcut.',
  startupTitle: 'Start with Windows (fallback)',
  startupCopy: 'The plugin already starts the renderer on the first Codex event. This keeps it ready after sign-in.',
  avatarsEyebrow: 'Local library',
  avatarsTitle: 'Active avatars',
  avatarsCopy: 'Native Codex Pet v2 packages, independently assigned to agents.',
  refresh: 'Refresh',
  emptyTitle: 'No compatible Pet detected',
  emptyCopy: 'Create a Pet in Codex, then refresh this library.',
  avatarSize: 'Size',
  labels: 'Show names',
  autoEnable: 'Enable new avatars',
  reduceMotion: 'Reduce movement',
  createTitle: 'Create from Work or Codex',
  createCopy: 'The plugin starts the official hatch-pet workflow. New avatars appear here automatically.',
  copyPrompt: 'Copy command',
  openFolder: 'Open folder',
  copied: 'Command copied. Paste it into a new Work or Codex task.',
  zoneEyebrow: 'Multi-monitor',
  zoneTitle: 'Roaming area',
  zoneCopy: 'Choose every screen, selected screens, or an exact rectangle.',
  allScreens: 'All screens',
  selectedScreens: 'Selected screens',
  customArea: 'Custom area',
  width: 'Width',
  height: 'Height',
  apply: 'Apply',
  integrationEyebrow: 'Integration',
  integrationTitle: 'Codex + system companion',
  integrationCopy: 'The installer enables the local companion. Finish the plugin setup in Codex for avatar creation and integrated hooks.',
  openPlugin: 'Finish in Codex',
  pluginOpened: 'Codex is open. Install the plugin, then review its hooks.',
  pluginUnavailable: 'The plugin bundle is missing from this installation.',
  enableHooks: 'Enable standalone hooks',
  disableHooks: 'Disable standalone hooks',
  docs: 'Pets documentation',
  demo: 'Run demo',
  codexPet: 'Codex Pet',
  bundled: 'Bundled',
  enabled: 'Enabled',
  disabled: 'Disabled',
  hooksOn: 'Standalone hooks enabled.',
  hooksOff: 'Standalone hooks disabled.',
  saveError: 'Could not save this setting.',
};

const elements = {
  activeCount: document.querySelector('#active-count'),
  passive: document.querySelector('#passive-toggle'),
  startup: document.querySelector('#startup-toggle'),
  avatarGrid: document.querySelector('#avatar-grid'),
  avatarEmpty: document.querySelector('#avatar-empty'),
  avatarSize: document.querySelector('#avatar-size'),
  avatarSizeValue: document.querySelector('#avatar-size-value'),
  labels: document.querySelector('#labels-toggle'),
  autoEnable: document.querySelector('#new-avatars-toggle'),
  reduceMotion: document.querySelector('#motion-toggle'),
  displayList: document.querySelector('#display-list'),
  customForm: document.querySelector('#custom-zone-form'),
  hooksButton: document.querySelector('#legacy-hooks-button'),
  openPluginButton: document.querySelector('#open-plugin-button'),
  toast: document.querySelector('#toast'),
};

let settings = null;
let avatars = [];
let displays = [];
let hooksInstalled = false;
let toastTimer = null;

function text(selector, value) {
  document.querySelector(selector).textContent = value;
}

function localize() {
  const mapping = {
    '#header-subtitle': copy.headerSubtitle,
    '#control-eyebrow': copy.controlEyebrow,
    '#control-title': copy.controlTitle,
    '#passive-title': copy.passiveTitle,
    '#passive-copy': copy.passiveCopy,
    '#startup-title': copy.startupTitle,
    '#startup-copy': copy.startupCopy,
    '#avatars-eyebrow': copy.avatarsEyebrow,
    '#avatars-title': copy.avatarsTitle,
    '#avatars-copy': copy.avatarsCopy,
    '#refresh-avatars': copy.refresh,
    '#avatar-empty-title': copy.emptyTitle,
    '#avatar-empty-copy': copy.emptyCopy,
    '#avatar-size-title': copy.avatarSize,
    '#labels-title': copy.labels,
    '#new-avatars-title': copy.autoEnable,
    '#motion-title': copy.reduceMotion,
    '#create-title': copy.createTitle,
    '#create-copy': copy.createCopy,
    '#create-avatar': copy.copyPrompt,
    '#open-pet-folder': copy.openFolder,
    '#zone-eyebrow': copy.zoneEyebrow,
    '#zone-title': copy.zoneTitle,
    '#zone-copy': copy.zoneCopy,
    '#zone-all': copy.allScreens,
    '#zone-displays': copy.selectedScreens,
    '#zone-custom': copy.customArea,
    '#width-label': copy.width,
    '#height-label': copy.height,
    '#apply-custom-zone': copy.apply,
    '#integration-eyebrow': copy.integrationEyebrow,
    '#integration-title': copy.integrationTitle,
    '#integration-copy': copy.integrationCopy,
    '#open-plugin-button': copy.openPlugin,
    '#pets-docs-button': copy.docs,
    '#demo-button': copy.demo,
  };
  for (const [selector, value] of Object.entries(mapping)) text(selector, value);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 3_200);
}

async function save(patch) {
  try {
    settings = await api.updateSettings(patch);
    renderSettings();
  } catch {
    showToast(copy.saveError);
  }
}

function renderAvatarGrid() {
  elements.avatarGrid.replaceChildren();
  elements.avatarEmpty.hidden = avatars.length > 0;
  elements.avatarGrid.hidden = avatars.length === 0;
  const enabled = new Set(settings?.enabledAvatarIds || []);

  for (const avatar of avatars) {
    const label = document.createElement('label');
    label.className = `avatar-option${enabled.has(avatar.id) ? ' is-enabled' : ''}`;

    const preview = document.createElement('span');
    preview.className = 'pet-preview';
    preview.style.backgroundImage = `url("${avatar.assetUrl}")`;
    preview.style.backgroundSize = `800% ${avatar.rows * 100}%`;
    preview.style.backgroundPosition = '0 0';

    const copyBlock = document.createElement('span');
    copyBlock.className = 'avatar-option-copy';
    const name = document.createElement('strong');
    name.textContent = avatar.displayName;
    const source = document.createElement('small');
    source.textContent = avatar.source === 'codex-pet' ? copy.codexPet : copy.bundled;
    copyBlock.append(name, source);

    const toggle = document.createElement('input');
    toggle.className = 'switch';
    toggle.type = 'checkbox';
    toggle.checked = enabled.has(avatar.id);
    toggle.setAttribute('aria-label', `${avatar.displayName}: ${toggle.checked ? copy.enabled : copy.disabled}`);
    toggle.addEventListener('change', () => {
      const next = new Set(settings.enabledAvatarIds);
      if (toggle.checked) next.add(avatar.id);
      else next.delete(avatar.id);
      void save({ enabledAvatarIds: [...next], avatarSelectionInitialized: true });
    });

    label.append(preview, copyBlock, toggle);
    elements.avatarGrid.append(label);
  }
}

function renderDisplays() {
  elements.displayList.replaceChildren();
  elements.displayList.hidden = settings?.zone.mode !== 'displays';
  const selected = new Set(settings?.zone.displayIds || []);

  for (const [index, display] of displays.entries()) {
    const label = document.createElement('label');
    label.className = 'display-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selected.has(display.id) || (selected.size === 0 && display.primary);
    const diagram = document.createElement('span');
    diagram.className = 'display-diagram';
    diagram.textContent = String(index + 1);
    const content = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = display.label || `${isFrench ? 'Écran' : 'Screen'} ${index + 1}`;
    const dimensions = document.createElement('small');
    dimensions.textContent = `${display.workArea.width} × ${display.workArea.height}${display.primary ? ' · principal' : ''}`;
    content.append(title, dimensions);
    input.addEventListener('change', () => {
      const next = new Set(settings.zone.displayIds);
      if (input.checked) next.add(display.id);
      else next.delete(display.id);
      if (next.size === 0) {
        input.checked = true;
        next.add(display.id);
      }
      void save({ zone: { mode: 'displays', displayIds: [...next] } });
    });
    label.append(input, diagram, content);
    elements.displayList.append(label);
  }
}

function renderCustomForm() {
  elements.customForm.hidden = settings?.zone.mode !== 'custom';
  if (elements.customForm.hidden) return;
  const primary = displays.find((display) => display.primary) || displays[0];
  const rectangle = settings.zone.custom || primary?.workArea || { x: 0, y: 0, width: 960, height: 540 };
  for (const key of ['x', 'y', 'width', 'height']) elements.customForm.elements[key].value = rectangle[key];
}

function renderSettings() {
  if (!settings) return;
  elements.passive.checked = settings.passive;
  elements.avatarSize.value = settings.avatarSize;
  elements.avatarSizeValue.textContent = `${settings.avatarSize}px`;
  elements.labels.checked = settings.showLabels;
  elements.autoEnable.checked = settings.autoEnableNewAvatars;
  elements.reduceMotion.checked = settings.reducedMotion;
  document.querySelector(`input[name="zone-mode"][value="${settings.zone.mode}"]`).checked = true;
  elements.hooksButton.textContent = hooksInstalled ? copy.disableHooks : copy.enableHooks;
  renderAvatarGrid();
  renderDisplays();
  renderCustomForm();
}

function updateActiveCount(state) {
  const count = (state?.sessions || []).reduce((sum, session) => sum + session.agents.length, 0);
  elements.activeCount.textContent = copy.active(count);
  elements.activeCount.classList.toggle('is-active', count > 0);
}

elements.passive.addEventListener('change', () => void save({ passive: elements.passive.checked }));
elements.startup.addEventListener('change', async () => {
  elements.startup.checked = await api.setLaunchAtLogin(elements.startup.checked);
});
elements.avatarSize.addEventListener('input', () => {
  elements.avatarSizeValue.textContent = `${elements.avatarSize.value}px`;
});
elements.avatarSize.addEventListener('change', () => void save({ avatarSize: Number(elements.avatarSize.value) }));
elements.labels.addEventListener('change', () => void save({ showLabels: elements.labels.checked }));
elements.autoEnable.addEventListener('change', () => void save({ autoEnableNewAvatars: elements.autoEnable.checked }));
elements.reduceMotion.addEventListener('change', () => void save({ reducedMotion: elements.reduceMotion.checked }));

for (const radio of document.querySelectorAll('input[name="zone-mode"]')) {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    const patch = { mode: radio.value };
    if (radio.value === 'displays' && settings.zone.displayIds.length === 0) {
      patch.displayIds = [(displays.find((display) => display.primary) || displays[0]).id];
    }
    if (radio.value === 'custom' && !settings.zone.custom) {
      patch.custom = (displays.find((display) => display.primary) || displays[0]).workArea;
    }
    void save({ zone: patch });
  });
}

elements.customForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(elements.customForm);
  void save({ zone: { mode: 'custom', custom: {
    x: Number(data.get('x')),
    y: Number(data.get('y')),
    width: Number(data.get('width')),
    height: Number(data.get('height')),
  } } });
});

document.querySelector('#refresh-avatars').addEventListener('click', async () => {
  const result = await api.refreshLibrary();
  avatars = result.avatars;
  renderAvatarGrid();
});
document.querySelector('#create-avatar').addEventListener('click', async () => {
  await api.copyCreatePrompt();
  showToast(copy.copied);
});
document.querySelector('#open-pet-folder').addEventListener('click', () => void api.openPetDirectory());
document.querySelector('#pets-docs-button').addEventListener('click', () => void api.openPetsDocs());
document.querySelector('#demo-button').addEventListener('click', () => void api.runDemo());
elements.openPluginButton.addEventListener('click', async () => {
  const result = await api.openPlugin();
  showToast(result.opened ? copy.pluginOpened : copy.pluginUnavailable);
});
elements.hooksButton.addEventListener('click', async () => {
  const result = hooksInstalled ? await api.uninstallHooks() : await api.installHooks();
  hooksInstalled = result.installed;
  renderSettings();
  showToast(hooksInstalled ? copy.hooksOn : copy.hooksOff);
});

api.onState(updateActiveCount);
api.onSettings((value) => {
  settings = value.settings;
  displays = value.displays;
  renderSettings();
});
api.onLibrary((value) => {
  avatars = value.avatars || [];
  renderAvatarGrid();
});

async function initialize() {
  localize();
  const bootstrap = await api.getBootstrap();
  settings = bootstrap.settings;
  avatars = bootstrap.avatars;
  displays = bootstrap.displays;
  hooksInstalled = bootstrap.hooks.installed;
  elements.openPluginButton.disabled = !bootstrap.plugin.available;
  elements.startup.checked = bootstrap.launchAtLogin;
  text('#version', `v${bootstrap.version}`);
  updateActiveCount(bootstrap.state);
  renderSettings();
}

void initialize().catch((error) => console.error(error));
