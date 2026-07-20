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
  assert.ok(motion.control.y > 50, "rightward flight bends along its perpendicular, not always upward");
}

{
  const motion = Motion.createFlightMotion({ fromRect: rect(0, 0), toRect: rect(0, 200) });
  closeTo(motion.start.y, 77, "vertical start uses a 27% edge inset");
  closeTo(motion.end.y, 223, "vertical end uses a 27% edge inset");
  closeTo(motion.travelAngle, 90, "vertical travel angle is retained");
  assert.ok(motion.control.x < 50, "downward flight bends sideways along its perpendicular");
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
  assert.ok(Math.abs(first.laneOffset) <= 7 && Math.abs(last.laneOffset) <= 7, "fan stays within 7px");
  closeTo(first.start.y + last.start.y, middle.start.y * 2, "lane endpoints fan symmetrically");
  assert.equal(first.delay, 0);
  assert.equal(middle.delay, 6);
  assert.equal(last.delay, 12);
}

{
  for (const distance of [0, 1, 50, 200, 1000]) {
    const options = { fromRect: rect(0, 0), toRect: rect(distance, 0), laneIndex: 3, laneCount: 6 };
    const motion = Motion.createFlightMotion(options);
    assert.ok(motion.duration >= 165 && motion.duration <= 225, "duration stays within the snappy motion range");
    assert.ok(motion.delay >= 0 && motion.delay <= 12, "group staggering never exceeds 12ms");
    assert.deepEqual(Motion.createFlightMotion(options), motion, "motion is deterministic");
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
  assert.ok(turn.duration >= 200 && turn.duration <= 228, "rotation stays visible without becoming sluggish");
  assert.equal(turn.points[0].angle, 0);
  assert.ok(turn.points[1].angle < 0, "clockwise rotation begins with a small counter movement");
  assert.ok(turn.points[2].angle > 120, "clockwise rotation gently overshoots its target");
  assert.equal(turn.points.at(-1).angle, 120, "rotation settles exactly on its target");
}

{
  const turn = Motion.createRotationMotion({ current: 90, target: -30 });
  assert.ok(turn.points[1].angle > 90, "counter-clockwise rotation winds up in the opposite direction");
  assert.ok(turn.points[2].angle < -30, "counter-clockwise overshoot follows travel direction");
  assert.equal(turn.points.at(-1).angle, -30);
}

{
  const still = Motion.createRotationMotion({ current: 45, target: 45 });
  const reduced = Motion.createRotationMotion({ current: 0, target: 180, reducedMotion: true });
  assert.equal(still.duration, 150, "an aligned plate still gives a short readiness cue");
  assert.ok(still.points.some((point) => point.angle < 45));
  assert.ok(still.points.some((point) => point.angle > 45));
  assert.equal(still.points.at(-1).angle, 45);
  assert.ok(reduced.duration <= 16, "reduced motion rotation completes immediately");
  assert.equal(reduced.points.at(-1).angle, 180);
}

console.log("Cake Link motion tests passed");
