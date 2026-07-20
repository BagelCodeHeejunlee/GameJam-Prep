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

console.log("Cake Link motion tests passed");
