const assert = require("node:assert/strict");
const Motion = require("./motion.js");

const closeTo = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} !== ${expected}`);
};
const rect = (left, top, width = 100, height = width) => ({ left, top, width, height });

{
  assert.deepEqual(
    Motion.createPieceTransferSequence({ count: 3, sourceFirst: 1, targetFirst: 3 }),
    [
      { sourceSlot: 1, targetSlot: 3 },
      { sourceSlot: 2, targetSlot: 4 },
      { sourceSlot: 3, targetSlot: 5 },
    ],
    "a grouped transfer is expanded into one visual flight per cake slice",
  );
  assert.equal(
    Motion.createPieceTransferSequence({ count: 20, sourceFirst: 0, targetFirst: 0 }).length,
    6,
    "a visual sequence never exceeds one full cake",
  );
  assert.deepEqual(
    Motion.createPieceTransferSequence({
      count: 8,
      sourceFirst: 0,
      targetFirst: 0,
      sourceCapacity: 8,
      targetCapacity: 8,
    }),
    Array.from({ length: 8 }, (_, slot) => ({ sourceSlot: slot, targetSlot: slot })),
    "an eight-slot cake can animate all eight slices",
  );
  assert.equal(
    Motion.createPieceTransferSequence({
      count: 8,
      sourceFirst: 0,
      targetFirst: 0,
      capacity: 8,
      targetCapacity: 6,
    }).length,
    6,
    "a transfer respects the smaller endpoint capacity",
  );
}

{
  const stageOnePull = [
    { from: 10, to: 6, type: "berry", count: 2 },
    { from: 5, to: 6, type: "berry", count: 2 },
    { from: 6, to: 10, type: "lemon", count: 1 },
  ];
  assert.deepEqual(
    Motion.orderDisplacedTransfersFirst(stageOnePull),
    [stageOnePull[2], stageOnePull[0], stageOnePull[1]],
    "the slice displaced from the receiving plate leaves before incoming slices can cover it",
  );
  assert.deepEqual(
    Motion.orderDisplacedTransfersFirst([{ from: 4, to: 5, type: "berry", count: 2 }]),
    [{ from: 4, to: 5, type: "berry", count: 2 }],
    "a one-way transfer keeps its original visual order",
  );
  assert.deepEqual(stageOnePull.map((plan) => plan.from), [10, 5, 6], "visual ordering is non-mutating");
}

{
  assert.deepEqual(
    Motion.createPieceFlightSchedule(),
    { gap: 0, totalDuration: 0, pieces: [] },
    "an empty transfer batch has no visual delay",
  );

  const sixPieces = Motion.createPieceFlightSchedule({ distances: Array(6).fill(0) });
  assert.equal(sixPieces.gap, 72);
  assert.deepEqual(
    sixPieces.pieces.map((piece) => piece.delay),
    [0, 72, 144, 216, 288, 360],
    "six slices launch one at a time with a readable global gap",
  );
  assert.ok(
    sixPieces.pieces.every((piece) => piece.duration === 330),
    "even a short flight remains slow enough to read",
  );

  assert.equal(Motion.createPieceFlightSchedule({ distances: Array(7).fill(0) }).gap, 68);
  assert.equal(Motion.createPieceFlightSchedule({ distances: Array(10).fill(0) }).gap, 56);
  const twelvePieces = Motion.createPieceFlightSchedule({ distances: Array(12).fill(1000) });
  assert.equal(twelvePieces.gap, 52);
  assert.equal(twelvePieces.pieces.at(-1).duration, 430);
  assert.equal(twelvePieces.totalDuration, 1002, "even twelve staggered slices finish near one second");

  const invalidDistances = Motion.createPieceFlightSchedule({ distances: [NaN, -25, "bad"] });
  assert.deepEqual(invalidDistances.pieces.map((piece) => piece.distance), [0, 0, 0]);
  assert.ok(invalidDistances.pieces.every((piece) => piece.duration === 330));

  const reduced = Motion.createPieceFlightSchedule({ distances: [0, 1000, 40], reducedMotion: true });
  assert.equal(reduced.gap, 0);
  assert.equal(reduced.totalDuration, 1);
  assert.ok(reduced.pieces.every((piece) => piece.delay === 0 && piece.duration === 1));
}

{
  const base = Motion.createPieceFlightSchedule({ distances: Array(6).fill(0) });
  const transfers = [
    { from: 4, to: 5, sourceSlot: 0, targetSlot: 1 },
    { from: 4, to: 5, sourceSlot: 1, targetSlot: 2 },
    { from: 4, to: 5, sourceSlot: 2, targetSlot: 3 },
    { from: 4, to: 5, sourceSlot: 3, targetSlot: 4 },
    { from: 4, to: 5, sourceSlot: 4, targetSlot: 5 },
    { from: 5, to: 4, sourceSlot: 1, targetSlot: 0 },
  ];
  const safe = Motion.ensurePieceFlightClearance({ schedule: base, transfers });
  assert.equal(base.pieces[0].duration, 330, "clearance scheduling does not mutate the base timetable");
  assert.equal(safe.pieces[0].duration, 424);
  assert.equal(
    safe.pieces[0].endTime,
    safe.pieces[5].delay + 64,
    "an incoming slice cannot land until the old slice in that target sector has visibly departed",
  );

  const reciprocal = Motion.ensurePieceFlightClearance({
    schedule: Motion.createPieceFlightSchedule({ distances: [0, 0] }),
    transfers: [
      { from: 4, to: 5, sourceSlot: 0, targetSlot: 0 },
      { from: 5, to: 4, sourceSlot: 0, targetSlot: 0 },
    ],
  });
  assert.ok(reciprocal.pieces[0].endTime >= reciprocal.pieces[1].delay + 64);
  assert.ok(reciprocal.pieces[1].endTime >= reciprocal.pieces[0].delay + 64);

  const reduced = Motion.ensurePieceFlightClearance({
    schedule: Motion.createPieceFlightSchedule({ distances: [0, 0], reducedMotion: true }),
    transfers: [
      { from: 4, to: 5, sourceSlot: 0, targetSlot: 0 },
      { from: 5, to: 4, sourceSlot: 0, targetSlot: 0 },
    ],
    reducedMotion: true,
  });
  assert.ok(reduced.pieces.every((piece) => piece.delay === 0 && piece.duration === 1));
}

{
  closeTo(Motion.reciprocalLaneOffset(80), 3.6, "reciprocal transfers use the same subtle fan as regular flights");
  closeTo(Motion.reciprocalLaneOffset(200), 4, "reciprocal separation never exceeds four pixels");
  closeTo(Motion.reciprocalLaneOffset(-20), 0, "invalid negative sizes cannot reverse the lane");

  const lane = Motion.reciprocalLaneOffset(80);
  const downward = Motion.createRoutedFlightMotion({
    rects: [rect(0, 0, 80), rect(-lane, 100, 80), rect(0, 200, 80)],
  });
  assert.ok(
    downward.points.every((point) => Math.abs(point.x - 40) <= 4),
    "a downward reciprocal transfer stays inside the source-to-target corridor",
  );
}

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
  assert.deepEqual(
    Motion.createSliceGroupGeometry({ lastSlot: 7, count: 3, capacity: 8 }),
    { count: 3, firstSlot: 5, lastSlot: 7, maskStart: 202.5, maskSpan: 135 },
    "an eight-slot group uses 45-degree sectors",
  );
}

{
  const normalizeAngle = (angle) => (angle % 360 + 360) % 360;
  for (const targetRotation of [0, 60, -120]) {
    for (let sourceSlot = 0; sourceSlot < 6; sourceSlot += 1) {
      for (let targetSlot = 0; targetSlot < 6; targetSlot += 1) {
        const sourceSlice = Motion.createSliceGroupGeometry({ lastSlot: sourceSlot, count: 1 });
        const landingRotation = Motion.createPieceLandingRotation({
          sourceSlot,
          targetSlot,
          targetRotation,
        });
        closeTo(
          normalizeAngle(sourceSlice.maskStart + landingRotation),
          normalizeAngle(-30 + targetSlot * 60 + targetRotation),
          "a flying slice turns from its source sector into the exact receiving sector",
        );
      }
    }
  }
  assert.equal(
    Motion.createPieceLandingRotation({
      sourceSlot: 1,
      targetSlot: 6,
      targetRotation: 15,
      sourceCapacity: 8,
      targetCapacity: 8,
    }),
    240,
    "an eight-slot slice lands using the capacity-derived 45-degree step",
  );
  assert.equal(
    Motion.createPieceLandingRotation({
      sourceSlot: 3,
      targetSlot: 5,
      targetRotation: 10,
      sourceAngleStep: 60,
      targetAngleStep: 45,
    }),
    55,
    "source and target sector sizes can differ during a landing",
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
  assert.deepEqual(
    Motion.createMatchedGroupRotations({
      direction: 90,
      count: 3,
      sourceLastSlot: 7,
      targetLastSlot: 4,
      capacity: 8,
    }),
    {
      sourceRotation: -225,
      targetRotation: -90,
      physicalMaskStart: -22.5,
      maskSpan: 135,
    },
    "matched eight-slot groups align on their shared physical 45-degree sectors",
  );
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
    { route: [4, 5, 9], portalRelay: true },
    "the placed center is preferred over unrelated empty cells",
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
  assert.deepEqual(
    Motion.createTransferRoutePlan({
      emptyRoute: [4, 5],
      fromIndex: 4,
      toIndex: 5,
      maxCells: 5,
    }),
    { route: [4, 5], portalRelay: false },
    "a direct transfer without center metadata stays direct",
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
  const original = Motion.createRoutedFlightMotion({
    rects: [rect(0, 0, 80), rect(100, 0, 80)],
  });
  const snapshot = structuredClone(original);
  const retimed = Motion.retimeFlightMotion(original, 370);
  assert.equal(retimed.duration, 370, "a direct slice flight uses the slower scheduled duration");
  assert.equal(retimed.delay, 0, "global staggering is the only launch delay");
  assert.deepEqual(original, snapshot, "retiming does not mutate a shared base motion");
}

{
  const original = Motion.createHopFlightMotion({
    rects: [rect(0, 0, 80), rect(100, 0, 80), rect(100, 100, 80)],
  });
  const snapshot = structuredClone(original);
  const retimed = Motion.retimeFlightMotion(original, 430);
  assert.equal(retimed.duration, 430, "a relayed flight keeps the exact scheduled total duration");
  assert.equal(
    retimed.duration,
    retimed.segments.reduce((sum, segment) => sum + segment.duration, 0) + retimed.holdDuration,
    "retimed relay segments and their hand-off pause share one exact budget",
  );
  assert.ok(retimed.segments.every((segment) => segment.duration >= 1));
  assert.deepEqual(original, snapshot, "retiming a relay does not mutate the original route");
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
  assert.equal(
    Motion.createSlotReflowRotation({ baseRotation: 30, fromFirst: 1, toFirst: 7, capacity: 8 }),
    300,
    "an eight-slot retained group reflows in 45-degree increments",
  );
  assert.equal(
    Motion.createSlotReflowRotation({ baseRotation: 30, fromFirst: 1, toFirst: 3, angleStep: 30 }),
    90,
    "an explicit angle step overrides the capacity-derived sector size",
  );
}

console.log("Cake Link motion tests passed");
