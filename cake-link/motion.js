(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CakeLinkMotion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const OFFSETS = [0, 0.22, 0.5, 0.78, 1];
  const SCALES = [0.94, 1.03, 1.07, 1, 0.94];
  const BANK = [-3, -1, 2, 1, 0];

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

  function tangentAngle(start, control, end, t, fallback) {
    const x = (1 - t) * (control.x - start.x) + t * (end.x - control.x);
    const y = (1 - t) * (control.y - start.y) + t * (end.y - control.y);
    return Math.hypot(x, y) < 0.001 ? fallback : Math.atan2(y, x) * 180 / Math.PI;
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
    const fan = Math.min(7, usableCellSize * 0.075);
    const lanePosition = laneCount === 1 ? 0 : (laneIndex / (laneCount - 1)) * 2 - 1;
    const laneOffset = lanePosition * fan;

    const fromInset = Math.min(from.width, from.height) * 0.27;
    const toInset = Math.min(to.width, to.height) * 0.27;
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
    const curveOffset = hasTravel && !reducedMotion
      ? clamp(centerDistance * 0.14, 9, 20)
      : 0;
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const control = {
      x: midpoint.x + perpendicularX * curveOffset,
      y: midpoint.y + perpendicularY * curveOffset,
    };
    const duration = reducedMotion ? 1 : clamp(Math.round(165 + centerDistance * 0.22), 165, 225);
    const delay = reducedMotion || laneCount === 1
      ? 0
      : Math.round(12 * laneIndex / (laneCount - 1));

    const points = OFFSETS.map((offset, index) => {
      const point = quadraticPoint(start, control, end, offset);
      const angle = tangentAngle(start, control, end, offset, travelAngle);
      return {
        x: point.x,
        y: point.y,
        offset,
        scale: reducedMotion ? 1 : SCALES[index],
        rotation: reducedMotion ? travelAngle : angle + BANK[index],
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
      easing: reducedMotion ? "linear" : "cubic-bezier(.2,.82,.2,1)",
      laneOffset,
      curveOffset,
      distance: centerDistance,
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
        duration: 150,
        points: [
          { angle: current, offset: 0, easing: "cubic-bezier(.4,0,.6,1)" },
          { angle: current - 3, offset: 0.24, easing: "cubic-bezier(.2,.75,.2,1)" },
          { angle: current + 2, offset: 0.72, easing: "cubic-bezier(.2,.75,.2,1)" },
          { angle: current, offset: 1, easing: "linear" },
        ],
      };
    }

    const direction = Math.sign(delta);
    const windup = clamp(distance * 0.045, 2, 4.5) * direction;
    const overshoot = clamp(distance * 0.065, 3, 7) * direction;
    return {
      duration: clamp(Math.round(190 + distance * 0.2), 200, 228),
      points: [
        { angle: current, offset: 0, easing: "cubic-bezier(.42,0,.65,1)" },
        { angle: current - windup, offset: 0.12, easing: "cubic-bezier(.18,.72,.18,1)" },
        { angle: target + overshoot, offset: 0.82, easing: "cubic-bezier(.2,.72,.2,1)" },
        { angle: target, offset: 1, easing: "linear" },
      ],
    };
  }

  return { createFlightMotion, createRotationMotion, quadraticPoint };
});
