const assert = require("node:assert/strict");
const Stages = require("./stages.js");
const Simulator = require("./simulator.js");

const STYLE_IDS = ["planner", "goal", "space", "instinct"];
const SKILL_IDS = ["novice", "standard", "expert"];

function assertAggregate(result, expectedRuns) {
  assert.equal(result.runs, expectedRuns);
  assert.equal(result.outcomes.clear + result.outcomes.limit + result.outcomes.locked, expectedRuns);
  assert.ok(result.clearRate >= 0 && result.clearRate <= 1);
  assert.ok(result.lockedRate >= 0 && result.lockedRate <= 1);
  assert.ok(result.limitRate >= 0 && result.limitRate <= 1);
  assert.ok(result.averageProgress >= 0 && result.averageProgress <= 1);
  assert.ok(Number.isFinite(result.averageSwapsUsed));
  assert.ok(result.averageSwapsUsed >= 0);
  assert.ok(result.averageSwapsUsed <= 3);
  if (result.averageClearMoves !== null) assert.ok(Number.isFinite(result.averageClearMoves));
  if (result.medianClearMoves !== null) assert.ok(Number.isFinite(result.medianClearMoves));
}

function assertRun(result, stage) {
  assert.ok(["clear", "limit", "locked"].includes(result.outcome));
  assert.ok(Number.isInteger(result.movesUsed));
  assert.ok(result.movesUsed >= 0 && result.movesUsed <= stage.moveLimit);
  assert.ok(result.progress >= 0 && result.progress <= 1);
  assert.ok(Number.isInteger(result.swapsUsed));
  assert.ok(result.swapsUsed >= 0 && result.swapsUsed <= stage.swaps);
}

assert.deepEqual(Simulator.PLAYER_STYLE_IDS, STYLE_IDS);
assert.deepEqual(Object.keys(Simulator.PLAYER_STYLES), STYLE_IDS);
assert.deepEqual(Object.keys(Simulator.SKILL_LEVELS), SKILL_IDS);

for (const stage of Object.values(Stages.STAGES)) {
  assert.equal(Simulator.playableIndexes(stage).length, stage.boardMask.join("").split("1").length - 1);
  const initialBoard = Simulator.createInitialBoard(stage);
  assert.equal(initialBoard.filter(Boolean).length, stage.initialPlates.length);

  const result = Simulator.simulateStage(stage, {
    runs: 2,
    style: "planner",
    skill: "standard",
    seed: 0xA11CE + stage.id,
  });
  assert.equal(result.style, "planner");
  assert.equal(result.skill, "standard");
  assertAggregate(result, 2);
}

// Every play-style and skill-level combination must produce a bounded result.
const profileStage = Stages.getStage(4);
for (const style of STYLE_IDS) {
  for (const skill of SKILL_IDS) {
    const result = Simulator.simulateStage(profileStage, {
      runs: 3,
      style,
      skill,
      seed: 0xBADC0DE,
    });
    assert.equal(result.style, style);
    assert.equal(result.skill, skill);
    assertAggregate(result, 3);
  }
}

// A profile is deterministic when stage, seed, style, and skill are unchanged.
const deterministicOptions = {
  seed: 0x1234ABCD,
  style: "goal",
  skill: "novice",
  traceSupply: true,
};
const deterministicStage = Stages.getStage(5);
const deterministicA = Simulator.simulateRun(deterministicStage, deterministicOptions);
const deterministicB = Simulator.simulateRun(deterministicStage, deterministicOptions);
assert.deepEqual(deterministicA, deterministicB);
assertRun(deterministicA, deterministicStage);

// Decision randomness must not alter the generated supply stream. Profiles can
// consume different amounts, so compare only their common trace prefix.
const supplyStage = Stages.getStage(6);
const supplySeed = 0xFEEDBEEF;
const baseline = Simulator.simulateRun(supplyStage, {
  seed: supplySeed,
  style: "planner",
  skill: "expert",
  traceSupply: true,
});
for (const style of STYLE_IDS) {
  for (const skill of SKILL_IDS) {
    const result = Simulator.simulateRun(supplyStage, {
      seed: supplySeed,
      style,
      skill,
      traceSupply: true,
    });
    assertRun(result, supplyStage);
    const commonLength = Math.min(baseline.supplyTrace.length, result.supplyTrace.length);
    assert.ok(commonLength >= supplyStage.openingRack.length);
    assert.deepEqual(
      result.supplyTrace.slice(0, commonLength),
      baseline.supplyTrace.slice(0, commonLength),
      `${style}/${skill} changed the supply prefix`,
    );
  }
}

// Simulations must not mutate editor-owned stage data or any of its arrays.
const mutableStage = JSON.parse(JSON.stringify(Stages.getStage(3)));
const stageSnapshot = JSON.stringify(mutableStage);
Simulator.simulateRun(mutableStage, {
  seed: 73,
  style: "space",
  skill: "standard",
  traceSupply: true,
});
Simulator.simulateStage(mutableStage, {
  runs: 3,
  seed: 73,
  style: "instinct",
  skill: "novice",
});
assert.equal(JSON.stringify(mutableStage), stageSnapshot);

// The comparison run count is a total budget shared as evenly as possible.
const comparisonOptions = {
  runs: 17,
  seed: 0xC0FFEE,
  skill: "expert",
};
const comparison = Simulator.simulateStyles(Stages.getStage(2), comparisonOptions);
assert.equal(comparison.runs, 17);
assert.equal(comparison.skill, "expert");
assert.deepEqual(comparison.styleOrder, STYLE_IDS);
assert.deepEqual(Object.keys(comparison.results), STYLE_IDS);
const allocatedRuns = comparison.styleOrder.map((style) => comparison.results[style].runs);
assert.equal(allocatedRuns.reduce((sum, value) => sum + value, 0), comparison.runs);
assert.ok(Math.max(...allocatedRuns) - Math.min(...allocatedRuns) <= 1);
for (const style of comparison.styleOrder) {
  const result = comparison.results[style];
  assert.equal(result.style, style);
  assert.equal(result.skill, "expert");
  assertAggregate(result, result.runs);
}
assert.deepEqual(
  Simulator.simulateStyles(Stages.getStage(2), comparisonOptions),
  comparison,
);

assert.equal(Simulator.difficultyLabel(1), "쉬움");
assert.equal(Simulator.difficultyLabel(.9), "쉬움");
assert.equal(Simulator.difficultyLabel(.899999), "보통");
assert.equal(Simulator.difficultyLabel(.7), "보통");
assert.equal(Simulator.difficultyLabel(.699999), "어려움");
assert.equal(Simulator.difficultyLabel(.4), "어려움");
assert.equal(Simulator.difficultyLabel(.399999), "매우 어려움");

const impossible = JSON.parse(JSON.stringify(Stages.getStage(1)));
impossible.moveLimit = 1;
const impossibleResult = Simulator.simulateStage(impossible, {
  runs: 8,
  style: "planner",
  skill: "expert",
});
assert.equal(impossibleResult.clearRate, 0);
assert.equal(impossibleResult.outcomes.limit, 8);

console.log("Cake Link simulator tests passed");
