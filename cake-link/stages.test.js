const assert = require("node:assert/strict");
const Stages = require("./stages.js");

{
  const stage = Stages.getStage(1);
  assert.deepEqual(stage.goals, { berry: 3 });
  assert.equal(stage.difficulty, "쉬움");
  assert.equal(Stages.isComplete(stage, { berry: 2 }), false);
  assert.equal(Stages.isComplete(stage, { berry: 3 }), true);
}

{
  const stage = Stages.getStage(2);
  assert.deepEqual(stage.goals, { berry: 3, lemon: 3 });
  assert.equal(stage.difficulty, "보통");
  assert.equal(Stages.isComplete(stage, { berry: 3, lemon: 2 }), false);
  assert.equal(Stages.isComplete(stage, { berry: 3, lemon: 3 }), true);
  assert.equal(Stages.totalGoalCount(stage), 6);
}

for (const stage of Object.values(Stages.STAGES)) {
  const supplied = {};
  for (const plate of stage.deck) {
    const count = Object.values(plate).reduce((sum, value) => sum + value, 0);
    assert.ok(count > 0 && count <= 6, `${stage.title} 공급 판은 1~6조각이어야 한다`);
    for (const [type, pieceCount] of Object.entries(plate)) {
      supplied[type] = (supplied[type] || 0) + pieceCount;
    }
  }
  for (const [type, cakeCount] of Stages.goalEntries(stage)) {
    assert.ok(
      (supplied[type] || 0) >= cakeCount * 6,
      `${stage.title}에는 목표 ${type} 케이크를 만들 조각이 충분해야 한다`
    );
  }
}

console.log("Cake Link stage tests passed");
