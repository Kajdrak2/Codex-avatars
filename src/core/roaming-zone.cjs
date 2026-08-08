'use strict';

function normalizeRect(value, fallback = { x: 0, y: 0, width: 1280, height: 720 }) {
  if (!value || typeof value !== 'object') return { ...fallback };
  const x = Number(value.x);
  const y = Number(value.y);
  const width = Number(value.width);
  const height = Number(value.height);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return { ...fallback };
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

function unionRects(rectangles) {
  if (!Array.isArray(rectangles) || rectangles.length === 0) return normalizeRect(null);
  const normalized = rectangles.map((rectangle) => normalizeRect(rectangle));
  const left = Math.min(...normalized.map((rectangle) => rectangle.x));
  const top = Math.min(...normalized.map((rectangle) => rectangle.y));
  const right = Math.max(...normalized.map((rectangle) => rectangle.x + rectangle.width));
  const bottom = Math.max(...normalized.map((rectangle) => rectangle.y + rectangle.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function clampRect(rectangle, container) {
  const rect = normalizeRect(rectangle, container);
  const bounds = normalizeRect(container);
  const x = Math.min(Math.max(rect.x, bounds.x), bounds.x + bounds.width - 1);
  const y = Math.min(Math.max(rect.y, bounds.y), bounds.y + bounds.height - 1);
  const right = Math.min(Math.max(rect.x + rect.width, x + 1), bounds.x + bounds.width);
  const bottom = Math.min(Math.max(rect.y + rect.height, y + 1), bounds.y + bounds.height);
  return { x, y, width: right - x, height: bottom - y };
}

function serializeDisplay(display, index = 0) {
  const workArea = normalizeRect(display?.workArea || display?.bounds);
  const bounds = normalizeRect(display?.bounds || workArea);
  return {
    id: String(display?.id ?? index),
    label: display?.label || `Screen ${index + 1}`,
    primary: Boolean(display?.primary),
    scaleFactor: Number(display?.scaleFactor) || 1,
    bounds,
    workArea,
  };
}

function resolveRoamingZone(zone, rawDisplays) {
  const displays = (rawDisplays || []).map(serializeDisplay);
  if (displays.length === 0) displays.push(serializeDisplay({ id: 'fallback' }));

  const requested = zone && typeof zone === 'object' ? zone : { mode: 'all' };
  const virtualBounds = unionRects(displays.map((display) => display.workArea));

  if (requested.mode === 'custom' && requested.custom) {
    const windowBounds = clampRect(requested.custom, virtualBounds);
    return {
      mode: 'custom',
      displayIds: displays
        .filter((display) => rectanglesIntersect(display.workArea, windowBounds))
        .map((display) => display.id),
      windowBounds,
      zones: [{ x: 0, y: 0, width: windowBounds.width, height: windowBounds.height }],
      virtualBounds,
    };
  }

  let selected = displays;
  if (requested.mode === 'displays') {
    const wanted = new Set((requested.displayIds || []).map(String));
    selected = displays.filter((display) => wanted.has(display.id));
    if (selected.length === 0) selected = [displays.find((display) => display.primary) || displays[0]];
  }

  const windowBounds = unionRects(selected.map((display) => display.workArea));
  return {
    mode: requested.mode === 'displays' ? 'displays' : 'all',
    displayIds: selected.map((display) => display.id),
    windowBounds,
    zones: selected.map((display) => ({
      x: display.workArea.x - windowBounds.x,
      y: display.workArea.y - windowBounds.y,
      width: display.workArea.width,
      height: display.workArea.height,
    })),
    virtualBounds,
  };
}

function rectanglesIntersect(left, right) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

module.exports = {
  clampRect,
  normalizeRect,
  rectanglesIntersect,
  resolveRoamingZone,
  serializeDisplay,
  unionRects,
};
