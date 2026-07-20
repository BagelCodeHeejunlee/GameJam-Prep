const assert = require("node:assert/strict");
const Stages = require("./stages.js");
const Simulator = require("./simulator.js");

for (const stage of Object.values(Stages.STAGES)) {
  assert.equal(Simulator.playableIndexes(stage).length, stage.boardMask.join("").split("1").length - 1);
  const initialBoard = Simulator.createInitialBoard(stage);
  assert.equal(initialBoard.filter(Boolean).length, stage.initialPlates.length);

  for (const skill of ["novice", "standard", "expert"]) {
    const result = Simulator.simulateStage(stage, { runs: 12, skill });
    assert.equal(result.runs, 12);
    assert.equal(result.outcomes.clear + result.outcomes.limit + result.outcomes.locked, 12);
    assert.ok(result.clearRate >= 0 && result.clearRate <= 1);
    assert.ok(result.averageProgress >= 0 && result.averageProgress <= 1);
  }
}

const impossible = JSON.parse(JSON.stringify(Stages.getStage(1)));
impossible.moveLimit = 1;
const impossibleResult = Simulator.simulateStage(impossible, { runs: 20, skill: "expert" });
assert.equal(impossibleResult.clearRate, 0);
assert.equal(impossibleResult.outcomes.limit, 20);

console.log("Cake Link simulator tests passed");
