'use strict';

const api = window.codexAvatars;
const isFrench = navigator.language.toLowerCase().startsWith('fr');

const copy = isFrench ? {
  connected: 'Prêt',
  demo: 'Démo',
  emptyTitle: 'L’équipe attend sa prochaine mission',
  emptyCopy: 'Active l’intégration, puis lance une tâche Codex avec des sous-agents.',
  install: 'Activer Codex',
  settings: 'Réglages',
  integration: 'Intégration Codex',
  integrationOn: 'Les événements locaux sont activés.',
  integrationOff: 'Ajoute les hooks sans remplacer tes réglages existants.',
  enable: 'Activer',
  disable: 'Désactiver',
  passive: 'Mode passif',
  passiveCopy: 'Les clics traversent l’overlay. Raccourci : Ctrl+Alt+A.',
  startup: 'Lancer avec Windows',
  startupCopy: 'Affiche automatiquement l’équipe après la connexion.',
  installed: 'Intégration activée. Codex pourra demander de valider les nouveaux hooks.',
  uninstalled: 'Intégration désactivée. Une sauvegarde du fichier précédent a été conservée.',
  failed: 'Impossible de modifier la configuration :',
  mainAgent: 'Agent principal',
  statuses: { working: 'travaille', idle: 'en attente', attention: 'intervention', done: 'terminé' },
} : {
  connected: 'Ready',
  demo: 'Demo',
  emptyTitle: 'The team is waiting for its next mission',
  emptyCopy: 'Enable the integration, then run a Codex task with subagents.',
  install: 'Enable Codex',
  settings: 'Settings',
  integration: 'Codex integration',
  integrationOn: 'Local lifecycle events are enabled.',
  integrationOff: 'Adds hooks without replacing your existing settings.',
  enable: 'Enable',
  disable: 'Disable',
  passive: 'Passive mode',
  passiveCopy: 'Clicks pass through the overlay. Shortcut: Ctrl+Alt+A.',
  startup: 'Launch with Windows',
  startupCopy: 'Show the team automatically after sign-in.',
  installed: 'Integration enabled. Codex may ask you to trust the new hooks.',
  uninstalled: 'Integration disabled. A backup of the previous file was kept.',
  failed: 'Could not update the configuration:',
  mainAgent: 'Main agent',
  statuses: { working: 'working', idle: 'waiting', attention: 'needs you', done: 'done' },
};

const elements = {
  world: document.querySelector('#world'),
  empty: document.querySelector('#empty-state'),
  connection: document.querySelector('#connection-pill'),
  settings: document.querySelector('#settings-panel'),
  settingsButton: document.querySelector('#settings-button'),
  integrationButton: document.querySelector('#integration-button'),
  integrationCopy: document.querySelector('#integration-copy'),
  passiveToggle: document.querySelector('#passive-toggle'),
  startupToggle: document.querySelector('#startup-toggle'),
  message: document.querySelector('#settings-message'),
};

let integrationInstalled = false;

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function hashHue(value) {
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

function statusLabel(status) {
  return copy.statuses[status] || status;
}

function createAvatar(agent, index) {
  const item = document.createElement('article');
  item.className = `avatar-card status-${agent.status}${agent.isRoot ? ' is-root' : ''}`;
  item.style.setProperty('--hue', String(agent.isRoot ? 266 : hashHue(agent.id)));
  item.style.setProperty('--delay', `${(index % 7) * -0.17}s`);
  item.setAttribute('aria-label', `${agent.isRoot ? copy.mainAgent : agent.label}: ${statusLabel(agent.status)}`);

  const character = document.createElement('div');
  character.className = 'character';
  character.innerHTML = `
    <span class="status-bubble" aria-hidden="true">${agent.status === 'attention' ? '!' : agent.status === 'done' ? '✓' : '···'}</span>
    <span class="crown" aria-hidden="true">♛</span>
    <span class="body" aria-hidden="true"><i class="eye eye-left"></i><i class="eye eye-right"></i><i class="mouth"></i></span>
    <span class="shadow" aria-hidden="true"></span>
  `;

  const label = document.createElement('div');
  label.className = 'avatar-label';
  const name = document.createElement('strong');
  name.textContent = agent.isRoot ? copy.mainAgent : agent.label;
  const state = document.createElement('small');
  state.textContent = statusLabel(agent.status);
  label.append(name, state);
  item.append(character, label);
  return item;
}

function render(snapshot) {
  elements.world.replaceChildren();
  const sessions = snapshot?.sessions || [];
  elements.empty.hidden = sessions.length > 0;
  elements.world.hidden = sessions.length === 0;

  for (const session of sessions) {
    const group = document.createElement('section');
    group.className = 'project-group';
    const heading = document.createElement('div');
    heading.className = 'project-heading';
    const dot = document.createElement('i');
    dot.className = `project-dot status-${session.status}`;
    const title = document.createElement('strong');
    title.textContent = session.project;
    heading.append(dot, title);

    const agents = document.createElement('div');
    agents.className = 'agents';
    session.agents.forEach((agent, index) => agents.append(createAvatar(agent, index)));
    group.append(heading, agents);
    elements.world.append(group);
  }
}

function updateIntegration(installed) {
  integrationInstalled = Boolean(installed);
  elements.integrationButton.textContent = installed ? copy.disable : copy.enable;
  elements.integrationCopy.textContent = installed ? copy.integrationOn : copy.integrationOff;
  elements.connection.classList.toggle('pill-offline', !installed);
  elements.connection.classList.toggle('pill-online', installed);
  elements.connection.textContent = installed ? copy.connected : copy.install;
}

function showSettings(value = true) {
  elements.settings.hidden = !value;
  elements.settingsButton.setAttribute('aria-expanded', String(value));
}

async function toggleIntegration() {
  elements.integrationButton.disabled = true;
  elements.message.textContent = '';
  try {
    const result = integrationInstalled ? await api.uninstallHooks() : await api.installHooks();
    updateIntegration(result.installed);
    elements.message.textContent = result.installed ? copy.installed : copy.uninstalled;
  } catch (error) {
    elements.message.textContent = `${copy.failed} ${error.message}`;
  } finally {
    elements.integrationButton.disabled = false;
  }
}

function localize() {
  elements.connection.textContent = copy.install;
  setText('#demo-button', copy.demo);
  setText('#empty-title', copy.emptyTitle);
  setText('#empty-copy', copy.emptyCopy);
  setText('#empty-install', copy.install);
  setText('#settings-title', copy.settings);
  setText('#integration-title', copy.integration);
  setText('#passive-title', copy.passive);
  setText('#passive-copy', copy.passiveCopy);
  setText('#startup-title', copy.startup);
  setText('#startup-copy', copy.startupCopy);
}

document.querySelector('#demo-button').addEventListener('click', () => api.runDemo());
document.querySelector('#quit-button').addEventListener('click', () => api.quit());
document.querySelector('#settings-button').addEventListener('click', () => showSettings(elements.settings.hidden));
document.querySelector('#settings-close').addEventListener('click', () => showSettings(false));
document.querySelector('#empty-install').addEventListener('click', async () => {
  showSettings(true);
  if (!integrationInstalled) await toggleIntegration();
});
elements.integrationButton.addEventListener('click', toggleIntegration);
elements.passiveToggle.addEventListener('change', async (event) => {
  elements.passiveToggle.checked = await api.setPassive(event.target.checked);
});
elements.startupToggle.addEventListener('change', async (event) => {
  elements.startupToggle.checked = await api.setLaunchAtLogin(event.target.checked);
});

api.onState(render);
api.onPassive((value) => {
  elements.passiveToggle.checked = value;
});

async function initialize() {
  localize();
  const [snapshot, settings] = await Promise.all([api.getState(), api.getSettings()]);
  render(snapshot);
  updateIntegration(settings.hooks.installed);
  elements.passiveToggle.checked = settings.passive;
  elements.startupToggle.checked = settings.launchAtLogin;
  document.querySelector('#version').textContent = `v${settings.version}`;
}

void initialize();
