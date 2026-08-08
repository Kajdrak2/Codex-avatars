'use strict';

const api = window.codexAvatars;
const world = document.querySelector('#world');
const actors = new Map();
const animations = {
  idle: { row: 0, durations: [280, 110, 110, 140, 140, 320] },
  right: { row: 1, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  left: { row: 2, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  wave: { row: 3, durations: [140, 140, 140, 280] },
  waiting: { row: 6, durations: [150, 150, 150, 150, 150, 260] },
  working: { row: 7, durations: [120, 120, 120, 120, 120, 220] },
  review: { row: 8, durations: [150, 150, 150, 150, 150, 280] },
};

let snapshot = { sessions: [] };
let settings = null;
let avatars = [];
let zone = null;
let zoneSignature = null;
let previousFrame = performance.now();
let lastHitTest = null;
let draggedActor = null;
let dragOffset = { x: 0, y: 0 };

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function nextRandom(actor) {
  actor.randomState = (Math.imul(actor.randomState, 1664525) + 1013904223) >>> 0;
  return actor.randomState / 0x100000000;
}

function viewportZones() {
  const source = zone?.zones?.length
    ? zone.zones
    : [{ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }];
  const visible = source.map((rectangle) => {
    const x = Math.max(0, rectangle.x);
    const y = Math.max(0, rectangle.y);
    const right = Math.min(window.innerWidth, rectangle.x + rectangle.width);
    const bottom = Math.min(window.innerHeight, rectangle.y + rectangle.height);
    return { x, y, width: right - x, height: bottom - y };
  }).filter((rectangle) => rectangle.width >= 72 && rectangle.height >= 72);
  return visible.length > 0
    ? visible
    : [{ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }];
}

function avatarSizeFor(agent) {
  return agent?.isRoot
    ? (settings?.mainAvatarSize || 118)
    : (settings?.subagentAvatarSize || 118);
}

function randomPoint(actor, selected) {
  const size = avatarSizeFor(actor.agent);
  const labelSpace = settings?.showLabels ? (settings?.showAgentDetails ? 52 : 36) : 8;
  const usableWidth = Math.max(1, selected.width - size);
  const usableHeight = Math.max(1, selected.height - (size * 1.08334) - labelSpace);
  return {
    x: selected.x + nextRandom(actor) * usableWidth,
    y: selected.y + nextRandom(actor) * usableHeight,
  };
}

function chooseTarget(actor, options = {}) {
  const zones = viewportZones();
  const previousZone = actor.zoneIndex;
  if (!Number.isInteger(actor.zoneIndex)) actor.zoneIndex = (options.initialIndex || 0) % zones.length;
  if (options.cycleZone && zones.length > 1) actor.zoneIndex = (actor.zoneIndex + 1) % zones.length;
  actor.zoneIndex %= zones.length;
  const selected = zones[actor.zoneIndex] || zones[0];
  const target = randomPoint(actor, selected);
  actor.targetX = target.x;
  actor.targetY = target.y;
  actor.targetAt = performance.now() + 3_000 + nextRandom(actor) * 6_000;
  if (options.immediate || (Number.isInteger(previousZone) && previousZone !== actor.zoneIndex)) {
    const placement = randomPoint(actor, selected);
    actor.x = placement.x;
    actor.y = placement.y;
  }
}

function activeAvatarRecords() {
  if (!settings) return [];
  const enabled = new Set(settings.enabledAvatarIds || []);
  return avatars.filter((avatar) => enabled.has(avatar.id));
}

function flattenAgents() {
  return (snapshot.sessions || []).flatMap((session) => session.agents.map((agent) => ({
    ...agent,
    project: session.project,
    sessionStatus: session.status,
  })));
}

function createActor(agent, avatar, index) {
  const element = document.createElement('article');
  element.className = 'avatar';
  element.dataset.agentId = agent.id;
  element.setAttribute('aria-label', `${agent.label}, ${agent.status}`);

  const sprite = document.createElement('div');
  sprite.className = 'sprite';
  const label = document.createElement('span');
  label.className = 'agent-label';
  const labelName = document.createElement('span');
  labelName.className = 'agent-name';
  const labelDetail = document.createElement('small');
  labelDetail.className = 'agent-detail';
  label.append(labelName, labelDetail);
  element.append(sprite, label);
  world.append(element);

  const actor = {
    id: agent.id,
    agent,
    avatar,
    element,
    sprite,
    label,
    labelName,
    labelDetail,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    targetAt: 0,
    velocityX: 0,
    velocityY: 0,
    speed: 22 + (hash(agent.id) % 24),
    randomState: (hash(`${agent.id}:${index}`) || 1) >>> 0,
    zoneIndex: index % Math.max(1, viewportZones().length),
    dragging: false,
  };
  chooseTarget(actor, { immediate: true, initialIndex: index });
  return actor;
}

function updateActorElement(actor) {
  const { agent, avatar, element, sprite, label, labelName, labelDetail } = actor;
  element.className = `avatar status-${agent.status}${agent.isRoot ? ' is-root' : ''}${actor.dragging ? ' is-dragging' : ''}`;
  element.style.setProperty('--avatar-size', `${avatarSizeFor(agent)}px`);
  element.style.setProperty('--label-height', settings?.showLabels && settings?.showAgentDetails ? '50px' : '34px');
  label.hidden = !settings?.showLabels;
  labelName.textContent = agent.label;
  const detail = [agent.model, agent.effort].filter(Boolean).join(' · ');
  labelDetail.textContent = detail;
  labelDetail.hidden = !settings?.showAgentDetails || !detail;
  element.setAttribute('aria-label', [labelName.textContent, detail, agent.status].filter(Boolean).join(', '));
  sprite.style.backgroundImage = `url("${avatar.assetUrl}")`;
  sprite.style.backgroundSize = `800% ${avatar.rows * 100}%`;
}

function reconcileActors() {
  const selectedAvatars = activeAvatarRecords();
  const agents = selectedAvatars.length > 0 ? flattenAgents() : [];
  const activeIds = new Set(agents.map((agent) => agent.id));

  for (const [id, actor] of actors) {
    if (!activeIds.has(id)) {
      actor.element.remove();
      actors.delete(id);
    }
  }

  agents.forEach((agent, index) => {
    const avatar = selectedAvatars[(hash(agent.id) + index) % selectedAvatars.length];
    let actor = actors.get(agent.id);
    if (!actor) {
      actor = createActor(agent, avatar, index);
      actors.set(agent.id, actor);
    }
    actor.agent = agent;
    actor.avatar = avatar;
    updateActorElement(actor);
  });
}

function frameIndex(animation, time) {
  const total = animation.durations.reduce((sum, duration) => sum + duration, 0);
  let cursor = time % total;
  for (let index = 0; index < animation.durations.length; index += 1) {
    cursor -= animation.durations[index];
    if (cursor < 0) return index;
  }
  return 0;
}

function animationFor(actor, moving) {
  if (actor.agent.status === 'attention') return animations.waiting;
  if (actor.agent.status === 'done') return animations.wave;
  if (actor.agent.status === 'idle') return animations.idle;
  if (moving && actor.velocityX > 4) return animations.right;
  if (moving && actor.velocityX < -4) return animations.left;
  return animations.working;
}

function applySpriteFrame(actor, time, moving) {
  const animation = animationFor(actor, moving);
  const reduced = settings?.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const column = reduced ? 0 : frameIndex(animation, time + (hash(actor.id) % 700));
  const columnPercent = column * (100 / 7);
  const rowPercent = animation.row * (100 / Math.max(1, actor.avatar.rows - 1));
  actor.sprite.style.backgroundPosition = `${columnPercent}% ${rowPercent}%`;
}

function moveActor(actor, deltaSeconds, time) {
  if (actor.dragging) return false;
  const reduced = settings?.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return false;

  let dx = actor.targetX - actor.x;
  let dy = actor.targetY - actor.y;
  let distance = Math.hypot(dx, dy);
  if (distance < 10 || time > actor.targetAt) {
    chooseTarget(actor, { cycleZone: true });
    dx = actor.targetX - actor.x;
    dy = actor.targetY - actor.y;
    distance = Math.hypot(dx, dy);
  }

  if (distance < 1) return false;
  const statusFactor = actor.agent.status === 'working' ? 1 : 0.55;
  const speed = actor.speed * statusFactor;
  actor.velocityX = (dx / distance) * speed;
  actor.velocityY = (dy / distance) * speed;
  actor.x += actor.velocityX * deltaSeconds;
  actor.y += actor.velocityY * deltaSeconds;
  return true;
}

function applySeparation() {
  const list = [...actors.values()].filter((actor) => !actor.dragging);
  for (let leftIndex = 0; leftIndex < list.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < list.length; rightIndex += 1) {
      const left = list[leftIndex];
      const right = list[rightIndex];
      const minimum = (avatarSizeFor(left.agent) + avatarSizeFor(right.agent)) * 0.475;
      const dx = right.x - left.x;
      const dy = right.y - left.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      if (distance >= minimum) continue;
      const force = (minimum - distance) * 0.055;
      left.x -= (dx / distance) * force;
      left.y -= (dy / distance) * force;
      right.x += (dx / distance) * force;
      right.y += (dy / distance) * force;
    }
  }
}

function constrainActor(actor) {
  const zones = viewportZones();
  const size = avatarSizeFor(actor.agent);
  const height = size * 1.08334 + (settings?.showLabels ? (settings?.showAgentDetails ? 50 : 34) : 0);
  const centerX = actor.x + size / 2;
  const centerY = actor.y + height / 2;
  actor.zoneIndex = Number.isInteger(actor.zoneIndex) ? actor.zoneIndex % zones.length : 0;
  const selected = zones[actor.zoneIndex] || zones[0];
  const sidePadding = settings?.showLabels ? 18 : 2;
  actor.x = Math.max(selected.x + sidePadding,
    Math.min(actor.x, selected.x + selected.width - size - sidePadding));
  actor.y = Math.max(selected.y,
    Math.min(actor.y, selected.y + selected.height - height));
}

function animate(time) {
  const deltaSeconds = Math.min(0.05, Math.max(0, (time - previousFrame) / 1000));
  previousFrame = time;
  for (const actor of actors.values()) {
    const moving = moveActor(actor, deltaSeconds, time);
    applySpriteFrame(actor, time, moving);
  }
  applySeparation();
  for (const actor of actors.values()) {
    constrainActor(actor);
    actor.element.style.transform = `translate3d(${actor.x.toFixed(2)}px, ${actor.y.toFixed(2)}px, 0)`;
  }
  requestAnimationFrame(animate);
}

function updateInteractiveClass() {
  document.body.classList.toggle('is-interactive', settings && !settings.passive);
}

document.addEventListener('mousemove', (event) => {
  if (draggedActor) {
    draggedActor.x = event.clientX - dragOffset.x;
    draggedActor.y = event.clientY - dragOffset.y;
    return;
  }
  const hit = Boolean(document.elementFromPoint(event.clientX, event.clientY)?.closest('.avatar'));
  if (hit !== lastHitTest) {
    lastHitTest = hit;
    void api.setOverlayHitTest(hit);
  }
});

world.addEventListener('pointerdown', (event) => {
  if (settings?.passive) return;
  const element = event.target.closest('.avatar');
  if (!element) return;
  const actor = actors.get(element.dataset.agentId);
  if (!actor) return;
  draggedActor = actor;
  actor.dragging = true;
  dragOffset = { x: event.clientX - actor.x, y: event.clientY - actor.y };
  element.setPointerCapture(event.pointerId);
  updateActorElement(actor);
});

world.addEventListener('pointerup', (event) => {
  if (!draggedActor) return;
  draggedActor.dragging = false;
  chooseTarget(draggedActor);
  updateActorElement(draggedActor);
  event.target.releasePointerCapture?.(event.pointerId);
  draggedActor = null;
});

document.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('resize', () => {
  let index = 0;
  for (const actor of actors.values()) {
    actor.zoneIndex = index % Math.max(1, viewportZones().length);
    chooseTarget(actor, { immediate: true, initialIndex: index });
    index += 1;
  }
});

api.onState((value) => {
  snapshot = value || { sessions: [] };
  reconcileActors();
});
api.onSettings((value) => {
  const nextZoneSignature = JSON.stringify(value.zone || null);
  const zoneChanged = nextZoneSignature !== zoneSignature;
  settings = value.settings;
  zone = value.zone;
  zoneSignature = nextZoneSignature;
  updateInteractiveClass();
  if (zoneChanged) {
    let index = 0;
    for (const actor of actors.values()) {
      actor.zoneIndex = index % Math.max(1, viewportZones().length);
      chooseTarget(actor, { immediate: true, initialIndex: index });
      index += 1;
    }
  }
  reconcileActors();
});
api.onLibrary((value) => {
  avatars = value.avatars || [];
  reconcileActors();
});

async function initialize() {
  const bootstrap = await api.getBootstrap();
  snapshot = bootstrap.state;
  settings = bootstrap.settings;
  avatars = bootstrap.avatars;
  zone = bootstrap.zone;
  zoneSignature = JSON.stringify(zone || null);
  updateInteractiveClass();
  reconcileActors();
  requestAnimationFrame(animate);
}

void initialize().catch((error) => console.error(error));
