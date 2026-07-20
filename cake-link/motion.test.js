const assert = require("node:assert/strict");
const Motion = require("./motion.js");

const closeTo = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} !== ${expected}`);
};
const rect = (left, top, width = 100, height = width) => ({ left, top, width, height });

{
  const motion = Motion.createFlightMotion({
    fromRect: rect(0, 0),
    toRect: rect(200, 0),
    laneIndex: 0,
    laneCount: 1,
  });
  closeTo(motion.start.x, 77, "horizontal start uses a 27% edge inset");
  closeTo(motion.end.x, 223, "horizontal end uses a 27% edge inset");
  closeTo(motion.start.y, 50, "horizontal start stays on the center line");
  closeTo(motion.end.y, 50, "horizontal end stays on the center line");
  assert.equal(motion.travelAngle, 0);
  assert.equal(motion.points.length, 5);
  assert.deepEqual(motion.points.map((point) => point.offset), [0, 0.22, 0.5, 0.78, 1]);
  closeTo(motion.points[0].x, motion.start.x, "first point begins at start");
  closeTo(motion.points[4].x, motion.end.x, "last point ends at end");
  closeTo(motion.control.y, 50, "reference-style flight stays on the direct plate-to-plate line");
}

{
  const motion = Motion.createFlightMotion({
    fromRect: rect(10, 20, 80),
    toRect: rect(150, 220, 80),
    edgeInsetRatio: 0,
  });
  assert.deepEqual(motion.start, { x: 50, y: 60 }, "rigid slice group begins at the source wheel center");
  assert.deepEqual(motion.end, { x: 190, y: 260 }, "rigid slice group ends at the target wheel center");
  assert.equal(motion.laneOffset, 0);
  assert.equal(motion.delay, 0);
}

{
  const motion = Motion.createFlightMotion({ fromRect: rect(0, 0), toRect: rect(0, 200) });
  closeTo(motion.start.y, 77, "vertical start uses a 27% edge inset");
  closeTo(motion.end.y, 223, "vertical end uses a 27% edge inset");
  closeTo(motion.travelAngle, 90, "vertical travel angle is retained");
  closeTo(motion.control.x, 50, "vertical flight stays on the direct plate-to-plate line");
  closeTo(motion.control.y, (motion.start.y + motion.end.y) / 2, "curve displacement is perpendicular");
  const midpoint = {
    x: (motion.start.x + motion.end.x) / 2,
    y: (motion.start.y + motion.end.y) / 2,
  };
  const curveX = motion.control.x - midpoint.x;
  const curveY = motion.control.y - midpoint.y;
  closeTo(curveX * 0 + curveY * 1, 0, "curve displacement has zero dot product with travel");
}

{
  const first = Motion.createFlightMotion({
    fromRect: rect(10, 20, 80),
    toRect: rect(150, 20, 80),
    laneIndex: 0,
    laneCount: 5,
  });
  const middle = Motion.createFlightMotion({
    fromRect: rect(10, 20, 80),
    toRect: rect(150, 20, 80),
    laneIndex: 2,
    laneCount: 5,
  });
  const last = Motion.createFlightMotion({
    fromRect: rect(10, 20, 80),
    toRect: rect(150, 20, 80),
    laneIndex: 4,
    laneCount: 5,
  });
  closeTo(first.laneOffset, -last.laneOffset, "outer lanes are symmetric");
  closeTo(middle.laneOffset, 0, "middle lane is centered");
  assert.ok(Math.abs(first.laneOffset) <= 4 && Math.abs(last.laneOffset) <= 4, "fan stays within 4px");
  closeTo(first.start.y + last.start.y, middle.start.y * 2, "lane endpoints fan symmetrically");
  assert.equal(first.delay, 0);
  assert.equal(middle.delay, 5);
  assert.equal(last.delay, 10);
}

{
  for (const distance of [0, 1, 50, 200, 1000]) {
    const options = { fromRect: rect(0, 0), toRect: rect(distance, 0), laneIndex: 3, laneCount: 6 };
    const motion = Motion.createFlightMotion(options);
    assert.ok(motion.duration >= 165 && motion.duration <= 220, "duration stays within the reference motion range");
    assert.ok(motion.delay >= 0 && motion.delay <= 10, "same-color pieces stay visually together");
    assert.deepEqual(Motion.createFlightMotion(options), motion, "motion is deterministic");
    assert.ok(motion.points.every((point) => point.rotation === motion.travelAngle), "slice orientation stays fixed in flight");
    assert.ok(motion.points.every((point) => point.scale === 1), "slice size stays fixed in flight");
  }
}

{
  const motion = Motion.createFlightMotion({
    fromRect: rect(0, 0),
    toRect: rect(200, 0),
    laneIndex: 4,
    laneCount: 5,
    reducedMotion: true,
  });
  assert.ok(motion.duration <= 16, "reduced motion completes near instantly");
  assert.equal(motion.delay, 0);
  assert.equal(motion.curveOffset, 0);
  assert.ok(motion.points.every((point) => point.scale === 1), "reduced motion removes bounce scaling");
}

{
  const motion = Motion.createFlightMotion({ fromRect: rect(40, 60), toRect: rect(40, 60) });
  assert.equal(motion.distance, 0);
  assert.deepEqual(motion.start, motion.end, "zero-distance transfer does not invent a direction");
  assert.equal(motion.curveOffset, 0);
  for (const point of motion.points) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.rotation));
    closeTo(point.x, motion.start.x, "zero-distance x remains stable");
    closeTo(point.y, motion.start.y, "zero-distance y remains stable");
  }
}

{
  const turn = Motion.createRotationMotion({ current: 0, target: 120 });
  assert.ok(turn.duration >= 210 && turn.duration <= 320, "rotation stays readable like the reference");
  assert.equal(turn.points[0].angle, 0);
  assert.equal(turn.points.length, 2, "rotation travels directly without wind-up or overshoot");
  assert.equal(turn.points.at(-1).angle, 120, "rotation settles exactly on its target");
}

{
  const turn = Motion.createRotationMotion({ current: 90, target: -30 });
  assert.equal(turn.points.length, 2);
  assert.equal(turn.points.at(-1).angle, -30);
}

{
  const still = Motion.createRotationMotion({ current: 45, target: 45 });
  const reduced = Motion.createRotationMotion({ current: 0, target: 180, reducedMotion: true });
  assert.equal(still.duration, 0, "an aligned plate does not fake a rotation");
  assert.equal(still.points.at(-1).angle, 45);
  assert.ok(reduced.duration <= 16, "reduced motion rotation completes immediately");
  assert.equal(reduced.points.at(-1).angle, 180);
}

{
  const plateTurn = Motion.createRotationMotion({ current: -30, target: 90 });
  const attachedTurn = Motion.offsetRotationMotion(plateTurn, 240);
  assert.equal(attachedTurn.duration, plateTurn.duration);
  assert.deepEqual(
    attachedTurn.points.map((point) => point.angle),
    plateTurn.points.map((point) => point.angle + 240),
    "a landed slice keeps its plate-relative angle during the next turn",
  );
  assert.equal(
    attachedTurn.points.at(-1).angle - attachedTurn.points[0].angle,
    plateTurn.points.at(-1).angle - plateTurn.points[0].angle,
  );
}

{
  for (let count = 1; count <= 6; count += 1) {
    const group = Motion.createSliceGroupGeometry({ lastSlot: 5, count });
    assert.equal(group.count, count);
    assert.equal(group.firstSlot, 6 - count);
    assert.equal(group.lastSlot, 5);
    assert.equal(group.maskStart, -30 + (6 - count) * 60);
    assert.equal(group.maskSpan, count * 60);
  }
  assert.deepEqual(
    Motion.createSliceGroupGeometry({ lastSlot: 3, count: 2 }),
    { count: 2, firstSlot: 2, lastSlot: 3, maskStart: 90, maskSpan: 120 },
    "a same-color pair keeps its two original neighboring sectors",
  );
}

{
  const normalizeAngle = (angle) => (angle % 360 + 360) % 360;
  for (const direction of [0, 90, 180, 270]) {
    for (let count = 1; count <= 6; count += 1) {
      for (let sourceLastSlot = count - 1; sourceLastSlot < 6; sourceLastSlot += 1) {
        for (let targetLastSlot = count - 1; targetLastSlot < 6; targetLastSlot += 1) {
          const sourceGroup = Motion.createSliceGroupGeometry({ lastSlot: sourceLastSlot, count });
          const targetGroup = Motion.createSliceGroupGeometry({ lastSlot: targetLastSlot, count });
          const alignment = Motion.createMatchedGroupRotations({
            direction,
            count,
            sourceLastSlot,
            targetLastSlot,
          });
          closeTo(
            normalizeAngle(sourceGroup.maskStart + alignment.sourceRotation),
            normalizeAngle(targetGroup.maskStart + alignment.targetRotation),
            "donor and receiver group starts share the same physical angle",
          );
          closeTo(
            normalizeAngle(alignment.physicalMaskStart),
            normalizeAngle(direction - 30 - (count - 1) * 60),
            "matched group keeps the donor's absolute angle",
          );
          assert.equal(alignment.maskSpan, count * 60);
        }
      }
    }
  }
}

{
  const occupied = new Set([4, 5, 6, 9]);
  const route = Motion.findGridRoute({
    fromIndex: 4,
    toIndex: 9,
    columns: 4,
    cellCount: 16,
    isPlayable: () => true,
    isOccupied: (index) => occupied.has(index),
  });
  assert.deepEqual(
    route,
    [4, 8, 9],
    "a diagonal arm-to-arm transfer uses the empty neighboring cell instead of jumping across the center plate",
  );
}

{
  const occupied = new Set([4, 5, 6, 9]);
  const route = Motion.findGridRoute({
    fromIndex: 6,
    toIndex: 4,
    columns: 4,
    cellCount: 16,
    isPlayable: () => true,
    isOccupied: (index) => occupied.has(index),
  });
  assert.ok(route.length > 3, "opposite arms do not jump two cells through the occupied center");
  assert.ok(!route.slice(1, -1).some((index) => occupied.has(index)));
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const rowDistance = Math.abs(Math.floor(previous / 4) - Math.floor(current / 4));
    const columnDistance = Math.abs(previous % 4 - current % 4);
    assert.equal(rowDistance + columnDistance, 1, "the opposite-arm detour advances exactly one cell at a time");
  }
}

{
  const occupied = new Set([4, 5]);
  assert.deepEqual(
    Motion.findGridRoute({
      fromIndex: 4,
      toIndex: 5,
      columns: 4,
      cellCount: 16,
      isPlayable: () => true,
      isOccupied: (index) => occupied.has(index),
    }),
    [4, 5],
    "adjacent plates still exchange directly even when both endpoints are occupied",
  );
}

{
  assert.deepEqual(
    Motion.createTransferRoutePlan({
      emptyRoute: [4, 8, 9],
      fromIndex: 4,
      viaIndex: 5,
      toIndex: 9,
      maxCells: 5,
    }),
    { route: [4, 8, 9], portalRelay: false },
    "a short empty route is preferred over the occupied center",
  );
  assert.deepEqual(
    Motion.createTransferRoutePlan({
      emptyRoute: null,
      fromIndex: 4,
      viaIndex: 5,
      toIndex: 9,
      maxCells: 5,
    }),
    { route: [4, 5, 9], portalRelay: true },
    "a crowded board uses a marked center hand-off",
  );
  assert.deepEqual(
    Motion.createTransferRoutePlan({
      emptyRoute: [6, 2, 1, 0, 4, 8],
      fromIndex: 6,
      viaIndex: 5,
      toIndex: 4,
      maxCells: 5,
    }),
    { route: [6, 5, 4], portalRelay: true },
    "an overly long detour is replaced by a two-hop center hand-off",
  );
}

{
  const route = Motion.findGridRoute({
    fromIndex: 3,
    toIndex: 4,
    columns: 4,
    cellCount: 16,
    isPlayable: () => true,
    isOccupied: () => false,
  });
  assert.ok(route.length > 2, "neighbor lookup does not wrap between the right and left edges of adjacent rows");
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const rowDistance = Math.abs(Math.floor(previous / 4) - Math.floor(current / 4));
    const columnDistance = Math.abs(previous % 4 - current % 4);
    assert.equal(rowDistance + columnDistance, 1, "every routed hop stays orthogonally adjacent");
  }
}

{
  const route = Motion.findGridRoute({
    fromIndex: 4,
    toIndex: 9,
    columns: 4,
    cellCount: 16,
    isPlayable: (index) => [4, 5, 9].includes(index),
    isOccupied: (index) => index === 5,
  });
  assert.equal(
    route,
    null,
    "routing never crosses an occupied plate or a blocked board cell when no empty visual path exists",
  );
}

{
  const motion = Motion.createRoutedFlightMotion({
    rects: [rect(0, 0, 80), rect(0, 100, 80), rect(100, 100, 80)],
  });
  assert.deepEqual(motion.start, { x: 40, y: 40 });
  assert.deepEqual(motion.end, { x: 140, y: 140 });
  assert.ok(motion.points.length > 3, "a routed flight rounds its intermediate corner");
  assert.equal(motion.points[0].offset, 0);
  assert.equal(motion.points.at(-1).offset, 1);
  assert.ok(
    motion.points.every((point, index) => index === 0 || point.offset > motion.points[index - 1].offset),
    "routed keyframe offsets advance monotonically",
  );
  assert.ok(motion.duration >= 190 && motion.duration <= 280, "a detour stays quick enough for repeated transfers");
}

{
  const motion = Motion.createHopFlightMotion({
    rects: [rect(0, 0, 80), rect(100, 0, 80), rect(100, 100, 80)],
  });
  assert.equal(motion.segments.length, 2, "an empty-cell relay is rendered as two separate hops");
  assert.deepEqual(motion.segments[0].start, { x: 40, y: 40 });
  assert.deepEqual(motion.segments[0].end, { x: 140, y: 40 });
  assert.deepEqual(motion.segments[1].start, motion.segments[0].end, "the second hop starts at the relay cell");
  assert.deepEqual(motion.segments[1].end, { x: 140, y: 140 });
  assert.ok(motion.holdDuration >= 32 && motion.holdDuration <= 44, "the relay has a short readable pause");
  assert.equal(
    motion.duration,
    motion.segments[0].duration + motion.holdDuration + motion.segments[1].duration,
    "total hop timing includes exactly one center hand-off pause",
  );
  assert.ok(motion.duration >= 190 && motion.duration <= 280, "two hops reuse the existing total flight-time budget");
  assert.ok(
    motion.segments.every((segment) => segment.duration >= 60 && segment.duration <= 130),
    "each one-cell hop stays quick",
  );
}

{
  const motion = Motion.createHopFlightMotion({
    rects: [rect(0, 0, 80), rect(100, 0, 80), rect(100, 100, 80)],
    reducedMotion: true,
  });
  assert.equal(motion.holdDuration, 0);
  assert.equal(motion.duration, 1, "reduced motion collapses the whole route into one frame");
  assert.equal(motion.segments.length, 1);
  assert.equal(motion.segments[0].duration, 1);
}

{
  const motion = Motion.createHopFlightMotion({
    rects: Array.from({ length: 16 }, (_, index) => rect(index * 100, 0, 80)),
  });
  assert.equal(motion.segments.length, 15);
  assert.ok(motion.segments.every((segment) => segment.duration >= 1));
  assert.ok(motion.duration <= 280, "even a long empty-cell route stays inside the total timing budget");
  assert.equal(
    motion.duration,
    motion.segments.reduce((sum, segment) => sum + segment.duration, 0) + motion.holdDuration * 14,
  );
}

{
  const transition = Motion.createSlotTransition({
    beforeSlots: ["berry", "berry", "blueberry", null, null, null],
    afterSlots: ["berry", "berry", "berry", "berry", "blueberry", null],
  });
  assert.deepEqual(
    transition.retained,
    [
      { type: "berry", count: 2, fromFirst: 0, fromLast: 1, toFirst: 0, toLast: 1 },
      { type: "blueberry", count: 1, fromFirst: 2, fromLast: 2, toFirst: 4, toLast: 4 },
    ],
    "existing groups reserve their final sorted sectors before the incoming group lands",
  );
  assert.deepEqual(
    transition.added,
    [{ type: "berry", count: 2, first: 2, last: 3 }],
    "incoming A2 receives two genuinely empty final sectors",
  );
  const retainedSlots = new Set(transition.retained.flatMap((group) =>
    Array.from({ length: group.count }, (_, index) => group.toFirst + index)
  ));
  const incomingSlots = transition.added.flatMap((group) =>
    Array.from({ length: group.count }, (_, index) => group.first + index)
  );
  assert.ok(
    incomingSlots.every((slot) => !retainedSlots.has(slot)),
    "a flying group cannot cover a retained slice at landing",
  );
}

{
  const transition = Motion.createSlotTransition({
    beforeSlots: ["berry", "blueberry", "blueberry", "blueberry", null, null],
    afterSlots: ["berry", "berry", "berry", "blueberry", null, null],
  });
  assert.deepEqual(transition.added, [{ type: "berry", count: 2, first: 1, last: 2 }]);
  assert.deepEqual(transition.removed, [{ type: "blueberry", count: 2, first: 2, last: 3 }]);
  assert.deepEqual(
    transition.retained.find((group) => group.type === "blueberry"),
    { type: "blueberry", count: 1, fromFirst: 1, fromLast: 1, toFirst: 3, toLast: 3 },
    "a displaced color reflows to its surviving final sector while both flying groups are off the plates",
  );
}

{
  assert.equal(
    Motion.createSlotReflowRotation({ baseRotation: 30, fromFirst: 1, toFirst: 5 }),
    270,
    "a retained group moving four slots forward keeps the full +240 degree path",
  );
  assert.equal(
    Motion.createSlotReflowRotation({ baseRotation: 30, fromFirst: 5, toFirst: 1 }),
    -210,
    "a retained group moving four slots backward keeps the full -240 degree path",
  );
}

console.log("Cake Link motion tests passed");
