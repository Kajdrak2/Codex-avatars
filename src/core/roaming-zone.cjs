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

function intersectRects(left, right) {
  const first = normalizeRect(left);
  const second = normalizeRect(right);
  const x = Math.max(first.x, second.x);
  const y = Math.max(first.y, second.y);
  const edgeX = Math.min(first.x + first.width, second.x + second.width);
  const edgeY = Math.min(first.y + first.height, second.y + second.height);
  if (edgeX <= x || edgeY <= y) return null;
  return { x, y, width: edgeX - x, height: edgeY - y };
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

// Windows clamps an oversized BrowserWindow to one monitor when it is created.
// Start on the monitor containing the target origin, then expand to the final
// virtual-desktop bounds only after the renderer is ready.
function bootstrapWindowBounds(windowBounds, rawDisplays) {
  const target = normalizeRect(windowBounds);
  const displays = (rawDisplays || []).map(serializeDisplay);
  if (displays.length === 0) return target;
  const containsOrigin = (display) => target.x >= display.workArea.x
    && target.x < display.workArea.x + display.workArea.width
    && target.y >= display.workArea.y
    && target.y < display.workArea.y + display.workArea.height;
  const anchor = displays.find(containsOrigin)
    || displays.find((display) => rectanglesIntersect(display.workArea, target))
    || displays.find((display) => display.primary)
    || displays[0];
  return intersectRects(target, anchor.workArea) || anchor.workArea;
}

function localRectToVirtual(rectangle, windowBounds) {
  const bounds = normalizeRect(windowBounds);
  const source = rectangle && typeof rectangle === 'object' ? rectangle : {};
  return {
    x: bounds.x + Math.round(Number(source.x) || 0),
    y: bounds.y + Math.round(Number(source.y) || 0),
    width: Math.max(160, Math.round(Number(source.width) || 0)),
    height: Math.max(120, Math.round(Number(source.height) || 0)),
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
  bootstrapWindowBounds,
  clampRect,
  intersectRects,
  localRectToVirtual,
  normalizeRect,
  rectanglesIntersect,
  resolveRoamingZone,
  serializeDisplay,
  unionRects,
};
