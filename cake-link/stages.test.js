const assert = require("node:assert/strict");
const Stages = require("./stages.js");

const stages = Object.values(Stages.STAGES);

assert.equal(stages.length, 7, "1~7 스테이지가 모두 있어야 한다");

function sum(values) {
  return Object.values(values).reduce((total, value) => total + value, 0);
}

function assertPlate(stage, pieces, label) {
  const count = sum(pieces);
  assert.ok(count >= 1 && count <= 6, `${stage.title} ${label}은 1~6조각이어야 한다`);
  for (const [color, amount] of Object.entries(pieces)) {
    assert.ok(stage.colors.includes(color), `${stage.title} ${label}에 미등장 색 ${color}가 있다`);
    assert.ok(Number.isInteger(amount) && amount > 0, `${stage.title} ${label} 조각 수가 올바르지 않다`);
  }
}

for (const [position, stage] of stages.entries()) {
  const expectedId = position + 1;
  assert.equal(stage.id, expectedId, "스테이지 인덱스는 1부터 연속이어야 한다");
  assert.equal(stage.nextStageId, expectedId < 7 ? expectedId + 1 : null);
  assert.ok(["쉬움", "보통", "어려움"].includes(stage.difficulty));
  assert.ok(Number.isInteger(stage.moveLimit) && stage.moveLimit > 0);
  assert.ok(Number.isInteger(stage.seed) && stage.seed > 0);

  assert.equal(stage.boardMask.length, 4, `${stage.title} 보드는 4행이어야 한다`);
  stage.boardMask.forEach((row) => assert.match(row, /^[01]{4}$/, `${stage.title} 보드 행은 0/1 네 칸이어야 한다`));

  assert.ok(stage.colors.length >= 2 && stage.colors.length <= Stages.COLOR_IDS.length);
  assert.equal(new Set(stage.colors).size, stage.colors.length, `${stage.title} 등장 색은 중복되면 안 된다`);
  stage.colors.forEach((color) => assert.ok(Stages.COLOR_IDS.includes(color), `${color}는 알 수 없는 색이다`));

  for (const color of Object.keys(stage.goals)) {
    assert.ok(stage.colors.includes(color), `${stage.title} 목표색 ${color}가 등장 색에 없다`);
  }

  assert.equal(sum(stage.colorWeights), 100, `${stage.title} 색상 웨이트 합은 100이어야 한다`);
  assert.equal(sum(stage.platePatternWeights), 100, `${stage.title} 판 패턴 웨이트 합은 100이어야 한다`);
  assert.deepEqual(
    Object.keys(stage.colorWeights).sort(),
    [...stage.colors].sort(),
    `${stage.title} 색상 웨이트는 등장 색과 정확히 일치해야 한다`
  );

  for (const pattern of Object.keys(stage.platePatternWeights)) {
    assert.match(pattern, /^(?:[a-z][1-6])+$/, `${stage.title}의 ${pattern} 패턴 문법이 잘못됐다`);
    const parsed = Stages.parsePlatePattern(pattern);
    assert.equal(Object.keys(parsed).length, (pattern.match(/[a-z]/g) || []).length, `${pattern}에 중복 문자가 있다`);
    assert.ok(sum(parsed) >= 1 && sum(parsed) <= 6, `${pattern}은 1~6조각이어야 한다`);
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
    assertPlate(stage, initial.pieces, `시작 판 ${initial.index}`);
  }

  assert.equal(stage.openingRack.length, 3, `${stage.title} 첫 하단 판은 3개여야 한다`);
  stage.openingRack.forEach((pieces, index) => assertPlate(stage, pieces, `첫 하단 판 ${index}`));

  let rngState = stage.seed;
  const random = () => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 4294967296;
  };
  for (let sample = 0; sample < 500; sample += 1) {
    assertPlate(stage, Stages.createWeightedPlate(stage, random), `랜덤 판 ${sample}`);
  }
}

assert.deepEqual(Stages.getStage(1).goals, { berry: 3 });
assert.deepEqual(Stages.getStage(2).goals, { berry: 3, lemon: 3 });
assert.equal(Stages.isComplete(Stages.getStage(2), { berry: 3, lemon: 2 }), false);
assert.equal(Stages.isComplete(Stages.getStage(2), { berry: 3, lemon: 3 }), true);
assert.equal(Stages.totalGoalCount(Stages.getStage(7)), 13);

console.log("Cake Link stage tests passed");
