'use strict';

const api = window.codexAvatars;

const translations = {
  en: {
    headerSubtitle: 'Independent companions for every Codex agent', language: 'Language', tour: 'Setup guide',
    active: (count, dormant = 0) => count
      ? `${count} active agent${count > 1 ? 's' : ''}${dormant ? ` · ${dormant} sleeping` : ''}`
      : (dormant ? `${dormant} sleeping agent${dormant > 1 ? 's' : ''}` : 'Waiting for Codex'),
    controlEyebrow: 'Always available', controlTitle: 'Overlay', passiveTitle: 'Passive mode',
    passiveCopy: 'Clicks pass through avatars. Turn it off here, from the tray icon, or with Ctrl + Alt + A.',
    startupTitle: 'Start with Windows', startupCopy: 'Keeps the invisible companion ready. Codex hooks can also start it on the first event.',
    avatarsEyebrow: 'Local library', avatarsTitle: 'Active avatars',
    avatarsCopy: 'Native Codex Pet v2 packages, independently assigned to main agents and subagents.',
    refresh: 'Refresh', emptyTitle: 'No compatible Pet detected', emptyCopy: 'Create or import a Pet, then refresh this library.',
    mainAvatarSize: 'Main agent size', subagentAvatarSize: 'Subagent size', labels: 'Show names', agentDetails: 'Show model + effort', dormantAgents: 'Show dormant agents', autoEnable: 'Automatically enable new Pets',
    dormantAgentsHelp: 'Keep recently idle or completed agents visible in a sleeping state for up to 30 minutes.',
    autoEnableHelp: 'A newly created or imported Pet joins the active rotation. Existing choices are never changed.',
    reduceMotion: 'Reduce movement', codexPet: 'Local Pet', bundled: 'Bundled', enabled: 'Enabled', disabled: 'Disabled', share: 'Share',
    creatorEyebrow: 'Character studio', creatorTitle: 'Create a custom avatar',
    creatorCopy: 'Describe the character here. Codex opens a new task with a complete hatch-pet brief already filled in.',
    briefName: 'Name (optional)', briefStyle: 'Visual style', briefAppearance: 'What should the avatar look like?',
    briefAppearanceHelp: 'Include species or shape, clothes, face, silhouette, and any unmistakable details.',
    briefPersonality: 'Personality', briefPalette: 'Color palette', briefProps: 'Props or accessories', briefAvoid: 'Things to avoid',
    appearancePlaceholder: 'Example: a tiny round night librarian, deep-blue fur, oversized copper glasses, star-shaped satchel…',
    personalityPlaceholder: 'Curious, calm, slightly mischievous…', palettePlaceholder: 'Midnight blue, copper, warm cream…',
    propsPlaceholder: 'Satchel, floating book, tiny lantern…', avoidPlaceholder: 'No text, no weapons, not too realistic…',
    createInCodex: 'Create in Codex', copyPrompt: 'Copy prompt', createNote: 'The final Pet remains local on this computer.',
    styles: ['Automatic — recommended', 'Polished pixel art', 'Soft plush mascot', 'Handmade clay figure', 'Clean sticker illustration', 'Stylized 3D toy', 'Painterly storybook'],
    galleryEyebrow: 'Portable sharing', galleryTitle: 'Pet Gallery',
    galleryCopy: 'There is no official public Pet marketplace yet. This local gallery adds a safe, portable package format for GitHub, Discord, or your own catalog.',
    importPet: 'Import a Pet package', openFolder: 'Open library folder',
    galleryHelp: 'Use Share on any Pet card to export a .codexpet file. Imports are validated and never overwrite an existing Pet.',
    zoneEyebrow: 'Multi-monitor', zoneTitle: 'Roaming area', zoneCopy: 'Choose all screens, specific screens, or draw an exact area directly on the desktop.',
    allScreens: 'All screens', selectedScreens: 'Selected screens', customArea: 'Draw custom area', screen: 'Screen', primary: 'primary',
    customUnset: 'No custom area selected', customSummary: (r) => `${r.width} × ${r.height} at ${r.x}, ${r.y}`,
    customHelp: 'A full-screen selector will let you drag the desired rectangle.', pickZone: 'Select on screen',
    integrationEyebrow: 'Integration', integrationTitle: 'Codex plugin + lifecycle hooks',
    integrationCopy: 'The overlay works locally. Enabling the plugin adds the creation skill and lets Codex activity animate each companion.',
    stepPlugin: 'Install or enable the Codex Avatars plugin.', stepTrust: 'Review and trust its lifecycle hooks; they send only event ids and non-sensitive metadata.',
    stepCreate: 'Create a Pet with the form above, then it appears in the local library automatically.',
    openPlugin: 'Open plugin in Codex', enableHooks: 'Enable standalone hooks', disableHooks: 'Disable standalone hooks', docs: 'Pets documentation',
    runDemo: 'Run demo', stopDemo: 'Stop demo', pluginOpened: 'Codex is open. Enable the plugin, then review its hooks.',
    pluginUnavailable: 'The plugin bundle is missing from this installation.', hooksOn: 'Standalone hooks enabled.', hooksOff: 'Standalone hooks disabled.',
    promptOpened: 'A new Codex task opened with your avatar brief ready.', promptFallback: 'Codex could not be opened. The prompt was copied as a fallback.',
    promptCopied: 'Avatar prompt copied.', appearanceRequired: 'Describe what the avatar should look like first.',
    imported: (name) => `${name} was imported and added to your local gallery.`, exported: 'Portable Pet package created.',
    importError: 'This Pet package could not be imported.', exportError: 'This Pet could not be shared.', saveError: 'Could not save this setting.', zoneCancelled: 'Area selection cancelled.',
    onboardingWelcomeTitle: 'Welcome to Codex Avatars', onboardingWelcomeCopy: 'Each Codex agent gets an independent animated companion on your desktop.',
    onboardingWelcomeFeature: 'The overlay itself is invisible and click-through by default. The tray icon and Ctrl + Alt + A always give you control.',
    onboardingPluginTitle: 'Enable the plugin', onboardingPluginCopy: 'The companion can run alone, but the plugin makes the experience complete.',
    onboardingPluginFeature: 'Its creation skill invokes hatch-pet, validates the full Pet v2 atlas, and installs it locally. Its hooks connect agent lifecycle events to avatar states.',
    onboardingAvatarTitle: 'Create or import a Pet', onboardingAvatarCopy: 'Describe appearance, style, personality, colors, and props in the character studio.',
    onboardingAvatarFeature: 'Create in Codex opens a new task with the prompt ready. Portable .codexpet files make sharing simple.',
    onboardingZoneTitle: 'Choose where they roam', onboardingZoneCopy: 'Use every display, selected displays, or draw a rectangle like a screenshot selection.',
    onboardingZoneFeature: 'You can change this later. Passive mode remains reversible from settings, the tray, and the keyboard shortcut.',
    back: 'Back', next: 'Next', finish: 'Finish setup', stepLabel: (step) => `Step ${step} of 4`,
  },
  fr: {
    headerSubtitle: 'Des compagnons indépendants pour chaque agent Codex', language: 'Langue', tour: 'Guide de démarrage',
    active: (count, dormant = 0) => count
      ? `${count} agent${count > 1 ? 's' : ''} actif${count > 1 ? 's' : ''}${dormant ? ` · ${dormant} endormi${dormant > 1 ? 's' : ''}` : ''}`
      : (dormant ? `${dormant} agent${dormant > 1 ? 's' : ''} endormi${dormant > 1 ? 's' : ''}` : 'En attente de Codex'),
    controlEyebrow: 'Toujours accessible', controlTitle: 'Overlay', passiveTitle: 'Mode passif',
    passiveCopy: 'Les clics traversent les avatars. Désactivez-le ici, depuis l’icône de zone de notification ou avec Ctrl + Alt + A.',
    startupTitle: 'Démarrer avec Windows', startupCopy: 'Garde le compagnon invisible prêt. Les hooks Codex peuvent aussi le lancer au premier événement.',
    avatarsEyebrow: 'Bibliothèque locale', avatarsTitle: 'Avatars actifs',
    avatarsCopy: 'Packages Codex Pet v2 natifs, attribués indépendamment aux agents principaux et sous-agents.',
    refresh: 'Actualiser', emptyTitle: 'Aucun Pet compatible détecté', emptyCopy: 'Créez ou importez un Pet, puis actualisez la bibliothèque.',
    mainAvatarSize: 'Taille des agents principaux', subagentAvatarSize: 'Taille des sous-agents', labels: 'Afficher les noms', agentDetails: 'Afficher modèle + effort', dormantAgents: 'Afficher les agents dormants', autoEnable: 'Activer automatiquement les nouveaux Pets',
    dormantAgentsHelp: 'Conserve les agents récemment au repos ou terminés dans un état endormi pendant 30 minutes maximum.',
    autoEnableHelp: 'Un Pet nouvellement créé ou importé rejoint la rotation active. Les choix existants ne sont jamais modifiés.',
    reduceMotion: 'Réduire les mouvements', codexPet: 'Pet local', bundled: 'Inclus', enabled: 'Activé', disabled: 'Désactivé', share: 'Partager',
    creatorEyebrow: 'Studio de personnage', creatorTitle: 'Créer un avatar personnalisé',
    creatorCopy: 'Décrivez le personnage ici. Codex ouvre une nouvelle tâche avec un brief hatch-pet complet déjà rempli.',
    briefName: 'Nom (facultatif)', briefStyle: 'Style visuel', briefAppearance: 'À quoi doit ressembler l’avatar ?',
    briefAppearanceHelp: 'Précisez l’espèce ou la forme, les vêtements, le visage, la silhouette et les détails distinctifs.',
    briefPersonality: 'Personnalité', briefPalette: 'Palette de couleurs', briefProps: 'Objets ou accessoires', briefAvoid: 'Éléments à éviter',
    appearancePlaceholder: 'Exemple : un minuscule bibliothécaire nocturne tout rond, fourrure bleu profond, grandes lunettes cuivre…',
    personalityPlaceholder: 'Curieux, calme, légèrement espiègle…', palettePlaceholder: 'Bleu nuit, cuivre, crème chaude…',
    propsPlaceholder: 'Sacoche, livre flottant, petite lanterne…', avoidPlaceholder: 'Pas de texte, pas d’armes, pas trop réaliste…',
    createInCodex: 'Créer dans Codex', copyPrompt: 'Copier le prompt', createNote: 'Le Pet final reste local sur cet ordinateur.',
    styles: ['Automatique — recommandé', 'Pixel art soigné', 'Mascotte peluche douce', 'Figurine en argile', 'Illustration sticker épurée', 'Jouet 3D stylisé', 'Personnage pictural de conte'],
    galleryEyebrow: 'Partage portable', galleryTitle: 'Galerie de Pets',
    galleryCopy: 'Il n’existe pas encore de marketplace publique officielle des Pets. Cette galerie locale ajoute un format portable sûr pour GitHub, Discord ou votre propre catalogue.',
    importPet: 'Importer un package Pet', openFolder: 'Ouvrir le dossier',
    galleryHelp: 'Utilisez Partager sur une carte pour exporter un fichier .codexpet. Les imports sont validés et n’écrasent jamais un Pet existant.',
    zoneEyebrow: 'Multi-écrans', zoneTitle: 'Zone de déplacement', zoneCopy: 'Choisissez tous les écrans, certains écrans ou tracez une zone exacte directement sur le bureau.',
    allScreens: 'Tous les écrans', selectedScreens: 'Écrans sélectionnés', customArea: 'Tracer une zone', screen: 'Écran', primary: 'principal',
    customUnset: 'Aucune zone personnalisée', customSummary: (r) => `${r.width} × ${r.height} à ${r.x}, ${r.y}`,
    customHelp: 'Un sélecteur plein écran vous permettra de tracer le rectangle souhaité.', pickZone: 'Sélectionner à l’écran',
    integrationEyebrow: 'Intégration', integrationTitle: 'Plugin Codex + hooks de cycle de vie',
    integrationCopy: 'L’overlay fonctionne localement. Activer le plugin ajoute la compétence de création et permet à l’activité Codex d’animer chaque compagnon.',
    stepPlugin: 'Installez ou activez le plugin Codex Avatars.', stepTrust: 'Examinez et approuvez ses hooks ; ils ne transmettent que les identifiants d’événements et des métadonnées non sensibles.',
    stepCreate: 'Créez un Pet avec le formulaire ci-dessus : il apparaît ensuite automatiquement dans la bibliothèque locale.',
    openPlugin: 'Ouvrir le plugin dans Codex', enableHooks: 'Activer les hooks autonomes', disableHooks: 'Désactiver les hooks autonomes', docs: 'Documentation Pets',
    runDemo: 'Lancer la démo', stopDemo: 'Arrêter la démo', pluginOpened: 'Codex est ouvert. Activez le plugin, puis examinez ses hooks.',
    pluginUnavailable: 'Le package du plugin manque dans cette installation.', hooksOn: 'Hooks autonomes activés.', hooksOff: 'Hooks autonomes désactivés.',
    promptOpened: 'Une nouvelle tâche Codex s’est ouverte avec le brief de votre avatar.', promptFallback: 'Codex n’a pas pu être ouvert. Le prompt a été copié comme solution de secours.',
    promptCopied: 'Prompt de l’avatar copié.', appearanceRequired: 'Décrivez d’abord l’apparence de l’avatar.',
    imported: (name) => `${name} a été importé et ajouté à votre galerie locale.`, exported: 'Package Pet portable créé.',
    importError: 'Impossible d’importer ce package Pet.', exportError: 'Impossible de partager ce Pet.', saveError: 'Impossible d’enregistrer ce réglage.', zoneCancelled: 'Sélection de zone annulée.',
    onboardingWelcomeTitle: 'Bienvenue dans Codex Avatars', onboardingWelcomeCopy: 'Chaque agent Codex obtient un compagnon animé indépendant sur votre bureau.',
    onboardingWelcomeFeature: 'L’overlay lui-même est invisible et laisse passer les clics par défaut. L’icône de zone de notification et Ctrl + Alt + A vous rendent toujours la main.',
    onboardingPluginTitle: 'Activer le plugin', onboardingPluginCopy: 'Le compagnon peut fonctionner seul, mais le plugin complète l’expérience.',
    onboardingPluginFeature: 'Sa compétence de création appelle hatch-pet, valide l’atlas Pet v2 complet et l’installe localement. Ses hooks relient le cycle de vie des agents aux états des avatars.',
    onboardingAvatarTitle: 'Créer ou importer un Pet', onboardingAvatarCopy: 'Décrivez son apparence, son style, sa personnalité, ses couleurs et ses accessoires dans le studio.',
    onboardingAvatarFeature: 'Créer dans Codex ouvre une nouvelle tâche avec le prompt prêt. Les fichiers .codexpet simplifient le partage.',
    onboardingZoneTitle: 'Choisir où ils se déplacent', onboardingZoneCopy: 'Utilisez tous les écrans, certains écrans ou tracez un rectangle comme lors d’une capture.',
    onboardingZoneFeature: 'Vous pourrez le modifier plus tard. Le mode passif reste réversible depuis les réglages, la zone de notification et le raccourci.',
    back: 'Retour', next: 'Suivant', finish: 'Terminer', stepLabel: (step) => `Étape ${step} sur 4`,
  },
};

const elements = {
  activeCount: document.querySelector('#active-count'), language: document.querySelector('#language-select'), tour: document.querySelector('#tour-button'),
  passive: document.querySelector('#passive-toggle'), startup: document.querySelector('#startup-toggle'), avatarGrid: document.querySelector('#avatar-grid'),
  avatarEmpty: document.querySelector('#avatar-empty'), mainAvatarSize: document.querySelector('#main-avatar-size'), mainAvatarSizeValue: document.querySelector('#main-avatar-size-value'),
  subagentAvatarSize: document.querySelector('#subagent-avatar-size'), subagentAvatarSizeValue: document.querySelector('#subagent-avatar-size-value'),
  labels: document.querySelector('#labels-toggle'), agentDetails: document.querySelector('#agent-details-toggle'), dormantAgents: document.querySelector('#dormant-agents-toggle'), autoEnable: document.querySelector('#new-avatars-toggle'),
  reduceMotion: document.querySelector('#motion-toggle'), displayList: document.querySelector('#display-list'), customActions: document.querySelector('#custom-zone-actions'),
  customSummary: document.querySelector('#custom-zone-summary'), hooksButton: document.querySelector('#legacy-hooks-button'), openPluginButton: document.querySelector('#open-plugin-button'),
  demoButton: document.querySelector('#demo-button'), briefForm: document.querySelector('#avatar-brief-form'), toast: document.querySelector('#toast'),
  onboarding: document.querySelector('#onboarding-dialog'), onboardingBack: document.querySelector('#onboarding-back'), onboardingNext: document.querySelector('#onboarding-next'),
};

let settings = null;
let avatars = [];
let displays = [];
let hooksInstalled = false;
let pluginAvailable = false;
let demoRunning = false;
let onboardingStep = 0;
let toastTimer = null;
let currentAgentState = { sessions: [] };

function c() { return translations[settings?.language === 'fr' ? 'fr' : 'en']; }
function setText(selector, value) { const element = document.querySelector(selector); if (element) element.textContent = value; }

function localize() {
  const copy = c();
  document.documentElement.lang = settings?.language === 'fr' ? 'fr' : 'en';
  const mapping = {
    '#header-subtitle': copy.headerSubtitle, '#language-label': copy.language, '#tour-button': copy.tour,
    '#control-eyebrow': copy.controlEyebrow, '#control-title': copy.controlTitle, '#passive-title': copy.passiveTitle, '#passive-copy': copy.passiveCopy,
    '#startup-title': copy.startupTitle, '#startup-copy': copy.startupCopy, '#avatars-eyebrow': copy.avatarsEyebrow, '#avatars-title': copy.avatarsTitle,
    '#avatars-copy': copy.avatarsCopy, '#refresh-avatars': copy.refresh, '#avatar-empty-title': copy.emptyTitle, '#avatar-empty-copy': copy.emptyCopy,
    '#main-avatar-size-title': copy.mainAvatarSize, '#subagent-avatar-size-title': copy.subagentAvatarSize, '#labels-title': copy.labels, '#agent-details-title': copy.agentDetails,
    '#dormant-agents-title': copy.dormantAgents, '#dormant-agents-help': copy.dormantAgentsHelp, '#new-avatars-title': copy.autoEnable,
    '#new-avatars-help': copy.autoEnableHelp, '#motion-title': copy.reduceMotion, '#creator-eyebrow': copy.creatorEyebrow, '#creator-title': copy.creatorTitle,
    '#creator-copy': copy.creatorCopy, '#brief-name-label': copy.briefName, '#brief-style-label': copy.briefStyle, '#brief-appearance-label': copy.briefAppearance,
    '#brief-appearance-help': copy.briefAppearanceHelp, '#brief-personality-label': copy.briefPersonality, '#brief-palette-label': copy.briefPalette,
    '#brief-props-label': copy.briefProps, '#brief-avoid-label': copy.briefAvoid, '#create-avatar': copy.createInCodex, '#copy-prompt': copy.copyPrompt,
    '#create-note': copy.createNote, '#gallery-eyebrow': copy.galleryEyebrow, '#gallery-title': copy.galleryTitle, '#gallery-copy': copy.galleryCopy,
    '#import-pet': copy.importPet, '#open-pet-folder': copy.openFolder, '#gallery-help': copy.galleryHelp, '#zone-eyebrow': copy.zoneEyebrow,
    '#zone-title': copy.zoneTitle, '#zone-copy': copy.zoneCopy, '#zone-all': copy.allScreens, '#zone-displays': copy.selectedScreens,
    '#zone-custom': copy.customArea, '#custom-zone-help': copy.customHelp, '#pick-zone': copy.pickZone, '#integration-eyebrow': copy.integrationEyebrow,
    '#integration-title': copy.integrationTitle, '#integration-copy': copy.integrationCopy, '#integration-step-plugin': copy.stepPlugin,
    '#integration-step-trust': copy.stepTrust, '#integration-step-create': copy.stepCreate, '#open-plugin-button': copy.openPlugin,
    '#pets-docs-button': copy.docs, '#onboarding-welcome-title': copy.onboardingWelcomeTitle, '#onboarding-welcome-copy': copy.onboardingWelcomeCopy,
    '#onboarding-welcome-feature': copy.onboardingWelcomeFeature, '#onboarding-plugin-title': copy.onboardingPluginTitle, '#onboarding-plugin-copy': copy.onboardingPluginCopy,
    '#onboarding-plugin-feature': copy.onboardingPluginFeature, '#onboarding-plugin-button': copy.openPlugin, '#onboarding-avatar-title': copy.onboardingAvatarTitle,
    '#onboarding-avatar-copy': copy.onboardingAvatarCopy, '#onboarding-avatar-feature': copy.onboardingAvatarFeature, '#onboarding-zone-title': copy.onboardingZoneTitle,
    '#onboarding-zone-copy': copy.onboardingZoneCopy, '#onboarding-zone-feature': copy.onboardingZoneFeature,
  };
  for (const [selector, value] of Object.entries(mapping)) setText(selector, value);
  elements.briefForm.elements.appearance.placeholder = copy.appearancePlaceholder;
  elements.briefForm.elements.personality.placeholder = copy.personalityPlaceholder;
  elements.briefForm.elements.palette.placeholder = copy.palettePlaceholder;
  elements.briefForm.elements.props.placeholder = copy.propsPlaceholder;
  elements.briefForm.elements.avoid.placeholder = copy.avoidPlaceholder;
  [...elements.briefForm.elements.style.options].forEach((option, index) => {
    option.textContent = copy.styles[index];
    option.value = copy.styles[index];
  });
  elements.hooksButton.textContent = hooksInstalled ? copy.disableHooks : copy.enableHooks;
  elements.demoButton.textContent = demoRunning ? copy.stopDemo : copy.runDemo;
  renderOnboarding();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 3_600);
}

async function save(patch) {
  try {
    settings = await api.updateSettings(patch);
    localize();
    renderSettings();
    return settings;
  } catch {
    showToast(c().saveError);
    return null;
  }
}

function renderAvatarGrid() {
  elements.avatarGrid.replaceChildren();
  elements.avatarEmpty.hidden = avatars.length > 0;
  elements.avatarGrid.hidden = avatars.length === 0;
  const enabled = new Set(settings?.enabledAvatarIds || []);

  for (const avatar of avatars) {
    const card = document.createElement('article');
    card.className = `avatar-option${enabled.has(avatar.id) ? ' is-enabled' : ''}`;
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
    source.textContent = avatar.source === 'codex-pet' ? c().codexPet : c().bundled;
    copyBlock.append(name, source);
    const actions = document.createElement('span');
    actions.className = 'avatar-card-actions';
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'mini-button';
    share.textContent = c().share;
    share.addEventListener('click', async () => {
      try {
        const result = await api.exportPet(avatar.id);
        if (!result.cancelled) showToast(c().exported);
      } catch { showToast(c().exportError); }
    });
    const toggle = document.createElement('input');
    toggle.className = 'switch';
    toggle.type = 'checkbox';
    toggle.checked = enabled.has(avatar.id);
    toggle.setAttribute('aria-label', `${avatar.displayName}: ${toggle.checked ? c().enabled : c().disabled}`);
    toggle.addEventListener('change', () => {
      const next = new Set(settings.enabledAvatarIds);
      if (toggle.checked) next.add(avatar.id); else next.delete(avatar.id);
      void save({ enabledAvatarIds: [...next], avatarSelectionInitialized: true });
    });
    actions.append(share, toggle);
    card.append(preview, copyBlock, actions);
    elements.avatarGrid.append(card);
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
    input.checked = selected.has(display.id);
    const diagram = document.createElement('span');
    diagram.className = 'display-diagram';
    diagram.textContent = String(index + 1);
    const content = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = display.label || `${c().screen} ${index + 1}`;
    const dimensions = document.createElement('small');
    dimensions.textContent = `${display.workArea.width} × ${display.workArea.height}${display.primary ? ` · ${c().primary}` : ''}`;
    content.append(title, dimensions);
    input.addEventListener('change', () => {
      const next = new Set(settings.zone.displayIds);
      if (input.checked) next.add(display.id); else next.delete(display.id);
      if (next.size === 0) { input.checked = true; next.add(display.id); }
      void save({ zone: { mode: 'displays', displayIds: [...next] } });
    });
    label.append(input, diagram, content);
    elements.displayList.append(label);
  }
}

function renderCustomZone() {
  const active = settings?.zone.mode === 'custom';
  elements.customActions.hidden = !active;
  if (!active) return;
  elements.customSummary.textContent = settings.zone.custom ? c().customSummary(settings.zone.custom) : c().customUnset;
}

function renderSettings() {
  if (!settings) return;
  elements.language.value = settings.language;
  elements.passive.checked = settings.passive;
  elements.mainAvatarSize.value = settings.mainAvatarSize;
  elements.mainAvatarSizeValue.textContent = `${settings.mainAvatarSize}px`;
  elements.subagentAvatarSize.value = settings.subagentAvatarSize;
  elements.subagentAvatarSizeValue.textContent = `${settings.subagentAvatarSize}px`;
  elements.labels.checked = settings.showLabels;
  elements.agentDetails.checked = settings.showAgentDetails;
  elements.dormantAgents.checked = settings.showDormantAgents;
  elements.autoEnable.checked = settings.autoEnableNewAvatars;
  elements.reduceMotion.checked = settings.reducedMotion;
  const radio = document.querySelector(`input[name="zone-mode"][value="${settings.zone.mode}"]`);
  if (radio) radio.checked = true;
  elements.hooksButton.textContent = hooksInstalled ? c().disableHooks : c().enableHooks;
  elements.demoButton.textContent = demoRunning ? c().stopDemo : c().runDemo;
  renderAvatarGrid();
  renderDisplays();
  renderCustomZone();
  updateActiveCount(currentAgentState);
}

function updateActiveCount(state) {
  currentAgentState = state || { sessions: [] };
  const agents = currentAgentState.sessions.flatMap((session) => session.agents || []);
  const count = agents.filter((agent) => ['working', 'attention'].includes(agent.status)).length;
  const dormant = settings?.showDormantAgents
    ? agents.filter((agent) => ['idle', 'dormant'].includes(agent.status)).length
    : 0;
  elements.activeCount.textContent = c().active(count, dormant);
  elements.activeCount.classList.toggle('is-active', count > 0);
}

function avatarBrief() {
  const data = new FormData(elements.briefForm);
  return Object.fromEntries(['name', 'appearance', 'style', 'personality', 'palette', 'props', 'avoid'].map((key) => [key, String(data.get(key) || '').trim()]));
}

function renderOnboarding() {
  const copy = c();
  const pages = [...document.querySelectorAll('.onboarding-page')];
  pages.forEach((page, index) => { page.hidden = index !== onboardingStep; });
  [...document.querySelectorAll('.onboarding-progress span')].forEach((bar, index) => {
    bar.classList.toggle('is-active', index <= onboardingStep);
  });
  elements.onboardingBack.textContent = copy.back;
  elements.onboardingBack.disabled = onboardingStep === 0;
  elements.onboardingNext.textContent = onboardingStep === 3 ? copy.finish : copy.next;
  setText('#onboarding-step-label', copy.stepLabel(onboardingStep + 1));
}

function openOnboarding() {
  onboardingStep = 0;
  localize();
  if (!elements.onboarding.open) elements.onboarding.showModal();
}

elements.language.addEventListener('change', () => void save({ language: elements.language.value }));
elements.tour.addEventListener('click', openOnboarding);
elements.passive.addEventListener('change', () => void save({ passive: elements.passive.checked }));
elements.startup.addEventListener('change', async () => { elements.startup.checked = await api.setLaunchAtLogin(elements.startup.checked); });
elements.mainAvatarSize.addEventListener('input', () => { elements.mainAvatarSizeValue.textContent = `${elements.mainAvatarSize.value}px`; });
elements.mainAvatarSize.addEventListener('change', () => void save({ mainAvatarSize: Number(elements.mainAvatarSize.value) }));
elements.subagentAvatarSize.addEventListener('input', () => { elements.subagentAvatarSizeValue.textContent = `${elements.subagentAvatarSize.value}px`; });
elements.subagentAvatarSize.addEventListener('change', () => void save({ subagentAvatarSize: Number(elements.subagentAvatarSize.value) }));
elements.labels.addEventListener('change', () => void save({ showLabels: elements.labels.checked }));
elements.agentDetails.addEventListener('change', () => void save({ showAgentDetails: elements.agentDetails.checked }));
elements.dormantAgents.addEventListener('change', () => void save({ showDormantAgents: elements.dormantAgents.checked }));
elements.autoEnable.addEventListener('change', () => void save({ autoEnableNewAvatars: elements.autoEnable.checked }));
elements.reduceMotion.addEventListener('change', () => void save({ reducedMotion: elements.reduceMotion.checked }));

for (const radio of document.querySelectorAll('input[name="zone-mode"]')) {
  radio.addEventListener('change', async () => {
    if (!radio.checked) return;
    if (radio.value === 'custom') {
      const result = await api.pickCustomZone();
      if (result.cancelled) { renderSettings(); showToast(c().zoneCancelled); }
      return;
    }
    const patch = { mode: radio.value };
    if (radio.value === 'displays' && settings.zone.displayIds.length === 0) patch.displayIds = displays.map((display) => display.id);
    await save({ zone: patch });
  });
}

document.querySelector('#pick-zone').addEventListener('click', async () => {
  const result = await api.pickCustomZone();
  if (result.cancelled) showToast(c().zoneCancelled);
});
document.querySelector('#refresh-avatars').addEventListener('click', async () => {
  const result = await api.refreshLibrary(); avatars = result.avatars; renderAvatarGrid();
});
elements.briefForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const brief = avatarBrief();
  if (!brief.appearance) { showToast(c().appearanceRequired); return; }
  try {
    const result = await api.createAvatar(brief);
    showToast(result.opened ? c().promptOpened : c().promptFallback);
  } catch { showToast(c().promptFallback); }
});
document.querySelector('#copy-prompt').addEventListener('click', async () => {
  const brief = avatarBrief();
  if (!brief.appearance) { showToast(c().appearanceRequired); return; }
  await api.copyCreatePrompt(brief); showToast(c().promptCopied);
});
document.querySelector('#import-pet').addEventListener('click', async () => {
  try {
    const result = await api.importPet();
    if (!result.cancelled) showToast(c().imported(result.imported.displayName || result.imported.id));
  } catch { showToast(c().importError); }
});
document.querySelector('#open-pet-folder').addEventListener('click', () => void api.openPetDirectory());
document.querySelector('#pets-docs-button').addEventListener('click', () => void api.openPetsDocs());
elements.demoButton.addEventListener('click', async () => {
  const result = await api.runDemo(); demoRunning = result.running; localize(); renderSettings();
});
elements.openPluginButton.addEventListener('click', async () => {
  const result = await api.openPlugin(); showToast(result.opened ? c().pluginOpened : c().pluginUnavailable);
});
document.querySelector('#onboarding-plugin-button').addEventListener('click', async () => {
  const result = await api.openPlugin(); showToast(result.opened ? c().pluginOpened : c().pluginUnavailable);
});
elements.hooksButton.addEventListener('click', async () => {
  const result = hooksInstalled ? await api.uninstallHooks() : await api.installHooks();
  hooksInstalled = result.installed; localize(); renderSettings(); showToast(hooksInstalled ? c().hooksOn : c().hooksOff);
});
elements.onboardingBack.addEventListener('click', () => { onboardingStep = Math.max(0, onboardingStep - 1); renderOnboarding(); });
elements.onboardingNext.addEventListener('click', async () => {
  if (onboardingStep < 3) { onboardingStep += 1; renderOnboarding(); return; }
  await save({ onboardingCompleted: true, pluginOnboardingShown: true });
  elements.onboarding.close();
});
document.querySelector('#onboarding-close').addEventListener('click', () => elements.onboarding.close());

api.onState(updateActiveCount);
api.onSettings((value) => { settings = value.settings; displays = value.displays; localize(); renderSettings(); });
api.onLibrary((value) => { avatars = value.avatars || []; renderAvatarGrid(); });
api.onDemo((value) => { demoRunning = Boolean(value.running); localize(); renderSettings(); });

async function initialize() {
  const bootstrap = await api.getBootstrap();
  settings = bootstrap.settings;
  avatars = bootstrap.avatars;
  displays = bootstrap.displays;
  hooksInstalled = bootstrap.hooks.installed;
  pluginAvailable = bootstrap.plugin.available;
  demoRunning = Boolean(bootstrap.demo?.running);
  elements.openPluginButton.disabled = !pluginAvailable;
  document.querySelector('#onboarding-plugin-button').disabled = !pluginAvailable;
  elements.startup.checked = bootstrap.launchAtLogin;
  setText('#version', `v${bootstrap.version}`);
  localize();
  updateActiveCount(bootstrap.state);
  renderSettings();
  if (!settings.onboardingCompleted && !bootstrap.settingsCapture) openOnboarding();
}

void initialize().catch((error) => console.error(error));
