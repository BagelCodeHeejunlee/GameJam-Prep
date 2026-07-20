(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CakeLinkMotion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const OFFSETS = [0, 0.22, 0.5, 0.78, 1];
  const SCALES = [1, 1, 1, 1, 1];

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeRect(rect) {
    const width = Math.max(0, finite(rect?.width));
    const height = Math.max(0, finite(rect?.height));
    const left = finite(rect?.left, finite(rect?.x));
    const top = finite(rect?.top, finite(rect?.y));
    return { left, top, width, height };
  }

  function quadraticPoint(start, control, end, t) {
    const inverse = 1 - t;
    return {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    };
  }

  function createFlightMotion(options = {}) {
    const from = normalizeRect(options.fromRect);
    const to = normalizeRect(options.toRect);
    const fromCenter = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
    const toCenter = { x: to.left + to.width / 2, y: to.top + to.height / 2 };
    const deltaX = toCenter.x - fromCenter.x;
    const deltaY = toCenter.y - fromCenter.y;
    const centerDistance = Math.hypot(deltaX, deltaY);
    const hasTravel = centerDistance >= 0.001;
    const unitX = hasTravel ? deltaX / centerDistance : 1;
    const unitY = hasTravel ? deltaY / centerDistance : 0;
    const perpendicularX = -unitY;
    const perpendicularY = unitX;
    const travelAngle = hasTravel ? Math.atan2(deltaY, deltaX) * 180 / Math.PI : 0;

    const laneCount = clamp(Math.floor(finite(options.laneCount, 1)), 1, 64);
    const laneIndex = clamp(Math.floor(finite(options.laneIndex)), 0, laneCount - 1);
    const smallestCell = Math.min(
      from.width || Infinity,
      from.height || Infinity,
      to.width || Infinity,
      to.height || Infinity
    );
    const usableCellSize = Number.isFinite(smallestCell) ? smallestCell : 0;
    const fan = Math.min(4, usableCellSize * 0.045);
    const lanePosition = laneCount === 1 ? 0 : (laneIndex / (laneCount - 1)) * 2 - 1;
    const laneOffset = lanePosition * fan;

    const edgeInsetRatio = clamp(finite(options.edgeInsetRatio, 0.27), 0, 0.5);
    const fromInset = Math.min(from.width, from.height) * edgeInsetRatio;
    const toInset = Math.min(to.width, to.height) * edgeInsetRatio;
    const start = hasTravel ? {
      x: fromCenter.x + unitX * fromInset + perpendicularX * laneOffset,
      y: fromCenter.y + unitY * fromInset + perpendicularY * laneOffset,
    } : {
      x: fromCenter.x + perpendicularX * laneOffset,
      y: fromCenter.y + perpendicularY * laneOffset,
    };
    const end = hasTravel ? {
      x: toCenter.x - unitX * toInset + perpendicularX * laneOffset,
      y: toCenter.y - unitY * toInset + perpendicularY * laneOffset,
    } : { ...start };

    const reducedMotion = Boolean(options.reducedMotion);
    const curveOffset = 0;
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const control = {
      x: midpoint.x + perpendicularX * curveOffset,
      y: midpoint.y + perpendicularY * curveOffset,
    };
    const duration = reducedMotion ? 1 : clamp(Math.round(150 + centerDistance * 0.35), 165, 220);
    const delay = reducedMotion || laneCount === 1
      ? 0
      : Math.round(10 * laneIndex / (laneCount - 1));

    const points = OFFSETS.map((offset, index) => {
      const point = quadraticPoint(start, control, end, offset);
      return {
        x: point.x,
        y: point.y,
        offset,
        scale: reducedMotion ? 1 : SCALES[index],
        rotation: travelAngle,
      };
    });

    return {
      start,
      end,
      control,
      points,
      travelAngle,
      duration,
      delay,
      easing: reducedMotion ? "linear" : "cubic-bezier(.33,0,.2,1)",
      laneOffset,
      curveOffset,
      distance: centerDistance,
    };
  }

  function rectCenter(rect) {
    const normalized = normalizeRect(rect);
    return {
      x: normalized.left + normalized.width / 2,
      y: normalized.top + normalized.height / 2,
    };
  }

  function gridNeighbors(index, columns, cellCount) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const neighbors = [];
    if (row > 0) neighbors.push(index - columns);
    if (column < columns - 1 && index + 1 < cellCount) neighbors.push(index + 1);
    if (index + columns < cellCount) neighbors.push(index + columns);
    if (column > 0) neighbors.push(index - 1);
    return neighbors;
  }

  function findGridRoute(options = {}) {
    const columns = Math.max(1, Math.floor(finite(options.columns, 1)));
    const cellCount = Math.max(0, Math.floor(finite(options.cellCount)));
    const fromIndex = Math.floor(finite(options.fromIndex, -1));
    const toIndex = Math.floor(finite(options.toIndex, -1));
    const isPlayable = typeof options.isPlayable === "function" ? options.isPlayable : () => true;
    const isOccupied = typeof options.isOccupied === "function" ? options.isOccupied : () => false;

    if (
      fromIndex < 0 || fromIndex >= cellCount ||
      toIndex < 0 || toIndex >= cellCount ||
      !isPlayable(fromIndex) || !isPlayable(toIndex)
    ) return null;
    if (fromIndex === toIndex) return [fromIndex];

    const targetRow = Math.floor(toIndex / columns);
    const targetColumn = toIndex % columns;
    const distanceToTarget = (index) =>
      Math.abs(Math.floor(index / columns) - targetRow) + Math.abs(index % columns - targetColumn);
    const queue = [fromIndex];
    const previous = new Map([[fromIndex, null]]);

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      const candidates = gridNeighbors(current, columns, cellCount).sort((a, b) =>
        distanceToTarget(a) - distanceToTarget(b) || a - b
      );
      for (const next of candidates) {
        if (previous.has(next)) continue;
        if (next !== toIndex && (!isPlayable(next) || isOccupied(next))) continue;
        previous.set(next, current);
        if (next === toIndex) {
          const route = [next];
          let step = current;
          while (step !== null) {
            route.push(step);
            step = previous.get(step);
          }
          return route.reverse();
        }
        queue.push(next);
      }
    }
    return null;
  }

  function createRoutedFlightMotion(options = {}) {
    const rects = Array.isArray(options.rects) ? options.rects : [];
    if (rects.length < 2) return createFlightMotion(options);
    if (rects.length === 2) {
      return createFlightMotion({
        ...options,
        fromRect: rects[0],
        toRect: rects[1],
        edgeInsetRatio: 0,
      });
    }

    const centers = rects.map(rectCenter);
    const sampled = [centers[0]];
    for (let index = 1; index < centers.length - 1; index += 1) {
      const previous = centers[index - 1];
      const corner = centers[index];
      const next = centers[index + 1];
      const incomingLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
      const outgoingLength = Math.hypot(next.x - corner.x, next.y - corner.y);
      const radius = Math.min(16, incomingLength * 0.2, outgoingLength * 0.2);
      const incomingUnit = incomingLength > 0
        ? { x: (corner.x - previous.x) / incomingLength, y: (corner.y - previous.y) / incomingLength }
        : { x: 0, y: 0 };
      const outgoingUnit = outgoingLength > 0
        ? { x: (next.x - corner.x) / outgoingLength, y: (next.y - corner.y) / outgoingLength }
        : { x: 0, y: 0 };
      const entry = {
        x: corner.x - incomingUnit.x * radius,
        y: corner.y - incomingUnit.y * radius,
      };
      const exit = {
        x: corner.x + outgoingUnit.x * radius,
        y: corner.y + outgoingUnit.y * radius,
      };
      sampled.push(entry);
      sampled.push(quadraticPoint(entry, corner, exit, 0.34));
      sampled.push(quadraticPoint(entry, corner, exit, 0.67));
      sampled.push(exit);
    }
    sampled.push(centers.at(-1));

    const distances = [0];
    for (let index = 1; index < sampled.length; index += 1) {
      distances.push(distances[index - 1] + Math.hypot(
        sampled[index].x - sampled[index - 1].x,
        sampled[index].y - sampled[index - 1].y,
      ));
    }
    const totalDistance = distances.at(-1);
    const reducedMotion = Boolean(options.reducedMotion);
    const points = sampled.map((point, index) => ({
      ...point,
      offset: totalDistance > 0 ? distances[index] / totalDistance : index / (sampled.length - 1),
      scale: 1,
      rotation: 0,
    }));

    return {
      start: centers[0],
      end: centers.at(-1),
      points,
      duration: reducedMotion ? 1 : clamp(Math.round(150 + totalDistance * 0.35), 190, 280),
      delay: 0,
      easing: reducedMotion ? "linear" : "cubic-bezier(.33,0,.2,1)",
      distance: totalDistance,
      routeLength: rects.length,
    };
  }

  function createSlotTransition(options = {}) {
    const beforeSlots = Array.isArray(options.beforeSlots) ? options.beforeSlots : [];
    const afterSlots = Array.isArray(options.afterSlots) ? options.afterSlots : [];
    const types = [...new Set([...beforeSlots, ...afterSlots].filter(Boolean))];
    const retained = [];
    const added = [];
    const removed = [];

    for (const type of types) {
      const beforeIndexes = beforeSlots.flatMap((slot, index) => slot === type ? [index] : []);
      const afterIndexes = afterSlots.flatMap((slot, index) => slot === type ? [index] : []);
      const retainedCount = Math.min(beforeIndexes.length, afterIndexes.length);
      if (retainedCount > 0) {
        retained.push({
          type,
          count: retainedCount,
          fromFirst: beforeIndexes[0],
          fromLast: beforeIndexes[retainedCount - 1],
          toFirst: afterIndexes[0],
          toLast: afterIndexes[retainedCount - 1],
        });
      }
      if (afterIndexes.length > beforeIndexes.length) {
        const count = afterIndexes.length - beforeIndexes.length;
        added.push({
          type,
          count,
          first: afterIndexes[afterIndexes.length - count],
          last: afterIndexes.at(-1),
        });
      }
      if (beforeIndexes.length > afterIndexes.length) {
        const count = beforeIndexes.length - afterIndexes.length;
        removed.push({
          type,
          count,
          first: beforeIndexes[beforeIndexes.length - count],
          last: beforeIndexes.at(-1),
        });
      }
    }

    return { retained, added, removed };
  }

  function createSlotReflowRotation(options = {}) {
    const baseRotation = finite(options.baseRotation);
    const fromFirst = Math.floor(finite(options.fromFirst));
    const toFirst = Math.floor(finite(options.toFirst));
    return baseRotation + (toFirst - fromFirst) * 60;
  }

  function createSliceGroupGeometry(options = {}) {
    const count = clamp(Math.floor(finite(options.count, 1)), 1, 6);
    const lastSlot = clamp(Math.floor(finite(options.lastSlot, count - 1)), count - 1, 5);
    const firstSlot = lastSlot - count + 1;
    return {
      count,
      firstSlot,
      lastSlot,
      maskStart: -30 + firstSlot * 60,
      maskSpan: count * 60,
    };
  }

  function createMatchedGroupRotations(options = {}) {
    const direction = finite(options.direction);
    const source = createSliceGroupGeometry({
      lastSlot: options.sourceLastSlot,
      count: options.count,
    });
    const target = createSliceGroupGeometry({
      lastSlot: options.targetLastSlot,
      count: source.count,
    });
    return {
      sourceRotation: direction - source.lastSlot * 60,
      targetRotation: direction - target.lastSlot * 60,
      physicalMaskStart: direction - 30 - (source.count - 1) * 60,
      maskSpan: source.maskSpan,
    };
  }

  function offsetRotationMotion(motion, angleOffset = 0) {
    const offset = finite(angleOffset);
    return {
      duration: finite(motion?.duration),
      points: (motion?.points || []).map((point) => ({
        ...point,
        angle: finite(point.angle) + offset,
      })),
    };
  }

  function createRotationMotion(options = {}) {
    const current = finite(options.current);
    const target = finite(options.target, current);
    const delta = target - current;
    const distance = Math.abs(delta);
    const reducedMotion = Boolean(options.reducedMotion);

    if (reducedMotion) {
      return {
        duration: 1,
        points: [
          { angle: current, offset: 0, easing: "linear" },
          { angle: target, offset: 1, easing: "linear" },
        ],
      };
    }

    if (distance < 0.001) {
      return {
        duration: 0,
        points: [
          { angle: current, offset: 0, easing: "linear" },
          { angle: current, offset: 1, easing: "linear" },
        ],
      };
    }

    return {
      duration: clamp(Math.round(190 + distance * 0.72), 210, 320),
      points: [
        { angle: current, offset: 0, easing: "cubic-bezier(.33,0,.2,1)" },
        { angle: target, offset: 1, easing: "linear" },
      ],
    };
  }

  return {
    createFlightMotion,
    createRoutedFlightMotion,
    createRotationMotion,
    createSliceGroupGeometry,
    createMatchedGroupRotations,
    createSlotReflowRotation,
    createSlotTransition,
    findGridRoute,
    offsetRotationMotion,
    quadraticPoint,
  };
});
