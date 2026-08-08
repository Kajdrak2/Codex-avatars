'use strict';

(function exposeTopology(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CodexAvatarTopology = api;
}(typeof globalThis === 'object' ? globalThis : this, () => {
  function normalizedZone(value) {
    const source = value && typeof value === 'object' ? value : {};
    const x = Number(source.x);
    const y = Number(source.y);
    const width = Number(source.width);
    const height = Number(source.height);
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
    return { x, y, width, height };
  }

  function overlapStart(first, second) {
    return Math.max(first, second);
  }

  function overlapEnd(first, second) {
    return Math.min(first, second);
  }

  function sharedEdge(leftValue, rightValue) {
    const left = normalizedZone(leftValue);
    const right = normalizedZone(rightValue);
    if (!left || !right) return null;
    const horizontalStart = overlapStart(left.y, right.y);
    const horizontalEnd = overlapEnd(left.y + left.height, right.y + right.height);
    if (horizontalEnd > horizontalStart) {
      if (left.x + left.width === right.x) {
        return { axis: 'x', direction: 'right', boundary: right.x, start: horizontalStart, end: horizontalEnd };
      }
      if (right.x + right.width === left.x) {
        return { axis: 'x', direction: 'left', boundary: left.x, start: horizontalStart, end: horizontalEnd };
      }
    }

    const verticalStart = overlapStart(left.x, right.x);
    const verticalEnd = overlapEnd(left.x + left.width, right.x + right.width);
    if (verticalEnd > verticalStart) {
      if (left.y + left.height === right.y) {
        return { axis: 'y', direction: 'down', boundary: right.y, start: verticalStart, end: verticalEnd };
      }
      if (right.y + right.height === left.y) {
        return { axis: 'y', direction: 'up', boundary: left.y, start: verticalStart, end: verticalEnd };
      }
    }
    return null;
  }

  function zoneIndexAtPoint(zones, x, y) {
    return (zones || []).findIndex((zone) => x >= zone.x
      && x < zone.x + zone.width
      && y >= zone.y
      && y < zone.y + zone.height);
  }

  function findZonePath(zones, start, target) {
    if (!Number.isInteger(start) || !Number.isInteger(target)
      || start < 0 || target < 0 || start >= zones.length || target >= zones.length) return null;
    if (start === target) return [start];
    const queue = [[start]];
    const visited = new Set([start]);
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      for (let index = 0; index < zones.length; index += 1) {
        if (visited.has(index) || !sharedEdge(zones[current], zones[index])) continue;
        const next = [...path, index];
        if (index === target) return next;
        visited.add(index);
        queue.push(next);
      }
    }
    return null;
  }

  return {
    findZonePath,
    sharedEdge,
    zoneIndexAtPoint,
  };
}));
