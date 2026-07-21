const assert = require("node:assert/strict");
const Stages = require("./stages.js");

const stages = Object.values(Stages.STAGES);
const EXPECTED_GOALS = {
  1: { berry: 3 },
  2: { berry: 3, lemon: 3 },
  3: { matcha: 3, lemon: 3 },
  4: { berry: 2, matcha: 2, choco: 2 },
  5: { berry: 3, lemon: 3, blueberry: 2 },
  6: { matcha: 3, choco: 3, blueberry: 3 },
  7: { berry: 3, matcha: 3, lemon: 3, choco: 2, blueberry: 2 },
};
const EXPECTED_GIMMICKS = {
  8: "colored",
  9: "ice",
  10: "frog",
  11: "mystery",
  12: "capacity8",
  13: "locks",
  14: "ordered",
  15: "rainbow",
  16: "service",
  17: "layered",
};

function sum(values) {
  return Object.values(values || {}).reduce((total, value) => total + Number(value || 0), 0);
}

function modifierCount(modifier = {}) {
  // Mystery slices are additional hidden pieces. Rainbow modifiers replace
  // existing normal slices, so they do not increase the rack plate total.
  return modifier.hiddenColors?.length || 0;
}

function assertPieceMap(stage, pieces, label, capacity = Stages.stageCapacity(stage), extra = 0) {
  const count = sum(pieces) + extra;
  assert.ok(count >= 1 && count <= capacity, `${stage.title} ${label}은 1~${capacity}조각이어야 한다`);
  for (const [color, amount] of Object.entries(pieces || {})) {
    assert.ok(stage.colors.includes(color), `${stage.title} ${label}에 미등장 색 ${color}가 있다`);
    assert.ok(Number.isInteger(amount) && amount > 0, `${stage.title} ${label} 조각 수가 올바르지 않다`);
  }
}

assert.equal(stages.length, 17, "1~17 스테이지가 모두 있어야 한다");

for (const [position, stage] of stages.entries()) {
  const expectedId = position + 1;
  const capacity = Stages.stageCapacity(stage);
  assert.equal(stage.id, expectedId, "스테이지 인덱스는 1부터 연속이어야 한다");
  assert.equal(stage.nextStageId, expectedId < 17 ? expectedId + 1 : null);
  assert.ok(["쉬움", "보통", "어려움", "매우 어려움"].includes(stage.difficulty));
  assert.ok(Number.isInteger(stage.moveLimit) && stage.moveLimit > 0);
  assert.ok(Number.isInteger(stage.seed) && stage.seed > 0);
  assert.ok([6, 8].includes(capacity));
  assert.ok(Object.isFrozen(stage) && Object.isFrozen(stage.mechanics) && Object.isFrozen(stage.rules));

  if (expectedId <= 7) {
    assert.deepEqual(stage.goals, EXPECTED_GOALS[stage.id], `${stage.title} 목표는 원안에서 바뀌면 안 된다`);
    assert.deepEqual(stage.boardMask, ["1111", "1111", "1111", "1111"], `${stage.title}는 기본 4×4 보드를 사용해야 한다`);
    assert.equal(stage.gimmick, null);
  } else {
    assert.equal(stage.gimmick?.id, EXPECTED_GIMMICKS[stage.id]);
    assert.equal(typeof stage.gimmick.label, "string");
  }

  assert.equal(stage.boardMask.length, 4, `${stage.title} 보드는 4행이어야 한다`);
  stage.boardMask.forEach((row) => assert.match(row, /^[01]{4}$/, `${stage.title} 보드 행은 0/1 네 칸이어야 한다`));
  assert.ok(stage.colors.length >= 2 && stage.colors.length <= Stages.COLOR_IDS.length);
  assert.equal(new Set(stage.colors).size, stage.colors.length, `${stage.title} 등장 색은 중복되면 안 된다`);
  stage.colors.forEach((color) => assert.ok(Stages.COLOR_IDS.includes(color), `${color}는 알 수 없는 색이다`));
  Object.keys(stage.goals).forEach((color) => assert.ok(stage.colors.includes(color)));

  assert.equal(sum(stage.colorWeights), 100, `${stage.title} 색상 웨이트 합은 100이어야 한다`);
  assert.equal(sum(stage.platePatternWeights), 100, `${stage.title} 판 패턴 웨이트 합은 100이어야 한다`);
  assert.deepEqual(Object.keys(stage.colorWeights).sort(), [...stage.colors].sort());
  for (const pattern of Object.keys(stage.platePatternWeights)) {
    assert.match(pattern, /^(?:[a-z][1-8])+$/, `${stage.title}의 ${pattern} 패턴 문법이 잘못됐다`);
    const parsed = Stages.parsePlatePattern(pattern);
    assert.equal(Object.keys(parsed).length, (pattern.match(/[a-z]/g) || []).length, `${pattern}에 중복 문자가 있다`);
    assert.ok(sum(parsed) >= 1 && sum(parsed) <= capacity, `${pattern}은 1~${capacity}조각이어야 한다`);
    assert.ok(Object.keys(parsed).length <= stage.colors.length, `${pattern}에 배정할 색이 부족하다`);
  }

  const initialIndexes = new Set();
  for (const initial of stage.initialPlates) {
    assert.ok(Number.isInteger(initial.index) && initial.index >= 0 && initial.index < 16);
    assert.equal(initialIndexes.has(initial.index), false, `${stage.title} 시작 판 위치가 중복됐다`);
    initialIndexes.add(initial.index);
    const row = Math.floor(initial.index / 4);
    const column = initial.index % 4;
    assert.equal(stage.boardMask[row][column], "1", `${stage.title} 시작 판이 막힌 칸에 있다`);
    assertPieceMap(stage, initial.pieces, `시작 판 ${initial.index}`, initial.capacity || capacity);
    for (const layer of initial.layers || []) {
      assertPieceMap(stage, layer.pieces, `시작 판 ${initial.index} 아래층`, layer.capacity || capacity);
    }
  }

  assert.equal(stage.openingRack.length, 3, `${stage.title} 첫 하단 판은 3개여야 한다`);
  assert.equal(stage.openingModifiers.length, stage.openingRack.length, `${stage.title} 첫 판 메타데이터 수가 다르다`);
  stage.openingRack.forEach((pieces, index) => {
    const modifier = stage.openingModifiers[index];
    assertPieceMap(stage, pieces, `첫 하단 판 ${index}`, capacity, modifierCount(modifier));
    for (const color of modifier.hiddenColors || []) assert.ok(stage.colors.includes(color));
    const generated = Stages.createOpeningPlateData(stage, index, () => 0);
    if (stage.mechanics?.mystery?.excludeOpeningRack) {
      assert.equal(generated.pieces.mystery || 0, 0, `${stage.title} 첫 3판에는 미스테리가 나오면 안 된다`);
      assert.deepEqual(generated.hiddenColors || [], []);
    }
  });

  let rngState = stage.seed;
  const random = () => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 4294967296;
  };
  for (let sample = 0; sample < 200; sample += 1) {
    const generated = Stages.createWeightedPlateData(stage, random);
    const special = (generated.pieces.mystery || 0) + (generated.pieces.rainbow || 0);
    const normal = Object.fromEntries(Object.entries(generated.pieces).filter(([type]) => Stages.COLOR_IDS.includes(type)));
    assertPieceMap(stage, normal, `랜덤 판 ${sample}`, capacity, special);
    assert.equal(generated.capacity, capacity);
    assert.equal(generated.pieces.mystery || 0, generated.hiddenColors?.length || 0);
  }
}

assert.equal(Stages.getStage(17).nextStageId, null);
assert.equal(Stages.totalGoalCount(Stages.getStage(8)), 10);
assert.equal(Stages.totalGoalCount(Stages.getStage(10)), 3);
assert.equal(Stages.totalGoalCount(Stages.getStage(14)), 7);
assert.equal(Stages.totalGoalCount(Stages.getStage(16)), 3);
assert.equal(Stages.isComplete(Stages.getStage(10), { frogReached: true }), false);
assert.equal(Stages.isComplete(Stages.getStage(10), { frogReached: true, berry: 2 }), true);
assert.equal(Stages.isComplete(Stages.getStage(14), { orderIndex: 6 }), false);
assert.equal(Stages.isComplete(Stages.getStage(14), { orderIndex: 7 }), true);
assert.equal(Stages.isComplete(Stages.getStage(16), { servedCount: 2 }), false);
assert.equal(Stages.isComplete(Stages.getStage(16), { servedCount: 3 }), true);
assert.equal(Stages.isComplete(Stages.getStage(16), { servedCells: { 5: true, 6: true, 9: true } }), true);
assert.equal(Stages.isComplete(Stages.getStage(8), {
  berry: 3,
  lemon: 3,
  matcha: 2,
  collectedColoredPlates: { berry: 1 },
}), false);
assert.equal(Stages.isComplete(Stages.getStage(8), {
  berry: 3,
  lemon: 3,
  matcha: 2,
  collectedColoredPlates: { berry: 1, lemon: 1 },
}), true);

const colored = Stages.getStage(8).initialPlates.filter((plate) => plate.kind === "colored");
assert.equal(colored.length, 2);
assert.deepEqual(Stages.getStage(8).objective, {
  type: "coloredPlates",
  targets: { berry: 1, lemon: 1 },
});
colored.forEach((plate) => {
  assert.equal(plate.collectorOnly, true);
  assert.equal(plate.receiveOnly, true);
  assert.deepEqual(Object.keys(plate.pieces), [plate.allowedColor]);
});
assert.deepEqual(Stages.getStage(9).mechanics.iceCells.map((cell) => cell.index), [5, 10]);
for (const iceIndex of [5, 10]) {
  const frozenPlate = Stages.getStage(9).initialPlates.find((plate) => plate.index === iceIndex);
  assert.ok(frozenPlate, `얼음 ${iceIndex}번 칸 안에는 시작 판이 보여야 한다`);
  assert.ok(sum(frozenPlate.pieces) > 0, `얼음 ${iceIndex}번 칸 안에는 시작 조각이 있어야 한다`);
}
assert.deepEqual(Stages.getStage(10).mechanics.frog, {
  id: "main",
  startIndex: 0,
  goalIndex: 15,
  tieOrder: "URDL",
  vanishOnGoal: true,
});
assert.equal(Stages.getStage(12).rules.capacity, 8);
assert.equal(Stages.getStage(13).mechanics.locks.length, 4);
assert.deepEqual(
  Stages.getStage(13).mechanics.locks.map(({ keyId, color, count }) => ({ keyId, color, count })),
  [
    { keyId: "berry-key-1", color: "berry", count: 1 },
    { keyId: "berry-key-2", color: "berry", count: 2 },
    { keyId: "lemon-key-1", color: "lemon", count: 1 },
    { keyId: "lemon-key-2", color: "lemon", count: 2 },
  ],
);
assert.deepEqual(Stages.getStage(14).mechanics.orderedGoal.sequence, ["berry", "lemon", "matcha", "berry", "lemon", "matcha", "berry"]);
assert.deepEqual(Stages.getStage(16).goals, {});
assert.deepEqual(Stages.getStage(16).objective, { type: "service", target: 3 });
assert.equal(Stages.getStage(16).gimmick.label, "주문대");
assert.deepEqual(Stages.getStage(16).mechanics.serviceCells.map((cell) => cell.index), [5, 6, 9]);
assert.equal(Stages.getStage(17).initialPlates.filter((plate) => plate.kind === "layered").length, 2);

const explicitMystery = Stages.createPlateData({ berry: 2 }, { hiddenColors: ["lemon"] });
assert.deepEqual(explicitMystery.pieces, { berry: 2, mystery: 1 });
assert.deepEqual(explicitMystery.hiddenColors, ["lemon"]);
const explicitRainbow = Stages.createPlateData({ berry: 4 }, { rainbow: 2 });
assert.deepEqual(explicitRainbow.pieces, { berry: 2, rainbow: 2 });
assert.throws(
  () => Stages.createPlateData({ berry: 1 }, { rainbow: 2 }),
  /무지개 교체 수 2개가 일반 조각 1개보다 많습니다/,
);
const embeddedRainbow = Stages.createPlateData({ pieces: { berry: 4, rainbow: 2 } });
assert.deepEqual(embeddedRainbow.pieces, { berry: 4, rainbow: 2 });
const sourceLevelRainbow = Stages.createPlateData({ pieces: { berry: 4 }, rainbow: 2 });
assert.deepEqual(sourceLevelRainbow.pieces, { berry: 2, rainbow: 2 });
const deterministicRainbow = Stages.createPlateData(
  { berry: 2, lemon: 2 },
  { rainbow: 2 },
  () => 0,
);
assert.deepEqual(deterministicRainbow.pieces, { lemon: 2, rainbow: 2 });
const stageCapacityPlate = Stages.createPlateData(Stages.getStage(12), { berry: 4 });
assert.equal(stageCapacityPlate.capacity, 8);
const mysteryStage = Stages.getStage(11);
assert.equal(mysteryStage.mechanics.mystery.excludeOpeningRack, true);
assert.deepEqual(mysteryStage.openingRack, [{ berry: 3 }, { lemon: 3 }, { matcha: 3 }]);
assert.deepEqual(mysteryStage.openingModifiers, [{}, {}, {}]);
for (let index = 0; index < 3; index += 1) {
  const openingPlate = Stages.createOpeningPlateData(mysteryStage, index, () => 0);
  assert.equal(openingPlate.pieces.mystery || 0, 0);
  assert.equal(openingPlate.hiddenColors, undefined);
}
const firstWeightedMystery = Stages.createOpeningPlateData(mysteryStage, 3, () => 0);
assert.ok((firstWeightedMystery.pieces.mystery || 0) > 0, "4번째 생성부터는 확률에 따라 미스테리가 나올 수 있어야 한다");
assert.equal(firstWeightedMystery.pieces.mystery, firstWeightedMystery.hiddenColors.length);
const staleMysteryStage = JSON.parse(JSON.stringify(mysteryStage));
staleMysteryStage.openingRack[0] = {
  pieces: { berry: 2, mystery: 1 },
  hiddenColors: ["lemon"],
  mystery: 1,
};
staleMysteryStage.openingModifiers[0] = { hiddenColors: ["matcha"], mystery: 1 };
const sanitizedOpening = Stages.createOpeningPlateData(staleMysteryStage, 0, () => 0);
assert.deepEqual(sanitizedOpening.pieces, { berry: 2 });
assert.equal(sanitizedOpening.hiddenColors, undefined);
const openingRainbow = Stages.getStage(15).openingRack.map((pieces, index) =>
  Stages.createPlateData(
    Stages.getStage(15),
    pieces,
    Stages.getStage(15).openingModifiers[index],
    () => 0,
  ).pieces
);
assert.deepEqual(openingRainbow, [
  { berry: 4, rainbow: 2 },
  { lemon: 5, rainbow: 1 },
  { matcha: 4, rainbow: 1 },
]);

console.log("Cake Link stage tests passed");
