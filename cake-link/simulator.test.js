const assert = require("node:assert/strict");
const Stages = require("./stages.js");
const Simulator = require("./simulator.js");
const Mechanics = require("./mechanics.js");

const STYLE_IDS = ["planner", "goal", "space", "instinct"];
const SKILL_IDS = ["novice", "standard", "expert"];

function assertAggregate(result, expectedRuns) {
  assert.equal(result.runs, expectedRuns);
  assert.equal(result.outcomes.clear + result.outcomes.limit + result.outcomes.locked, expectedRuns);
  assert.ok(result.clearRate >= 0 && result.clearRate <= 1);
  assert.ok(result.lockedRate >= 0 && result.lockedRate <= 1);
  assert.ok(result.limitRate >= 0 && result.limitRate <= 1);
  assert.ok(result.averageProgress >= 0 && result.averageProgress <= 1);
  assert.equal(Object.hasOwn(result, "averageSwapsUsed"), false);
  if (result.averageClearMoves !== null) assert.ok(Number.isFinite(result.averageClearMoves));
  if (result.medianClearMoves !== null) assert.ok(Number.isFinite(result.medianClearMoves));
}

function assertRun(result, stage) {
  assert.ok(["clear", "limit", "locked"].includes(result.outcome));
  assert.ok(Number.isInteger(result.movesUsed));
  assert.ok(result.movesUsed >= 0 && result.movesUsed <= stage.moveLimit);
  assert.ok(result.progress >= 0 && result.progress <= 1);
  assert.equal(Object.hasOwn(result, "swapsUsed"), false);
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

// Legacy swap-ticket fields are ignored because the game no longer uses exchanges.
const noSwapStage = JSON.parse(JSON.stringify(Stages.getStage(5)));
const manySwapStage = JSON.parse(JSON.stringify(noSwapStage));
noSwapStage.swaps = 0;
manySwapStage.swaps = 999;
const swapIndependentOptions = {
  runs: 12,
  seed: 0x51A9,
  style: "goal",
  skill: "standard",
};
assert.deepEqual(
  Simulator.simulateStage(noSwapStage, swapIndependentOptions),
  Simulator.simulateStage(manySwapStage, swapIndependentOptions),
);

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

// Initial boards retain mechanic metadata and inherit each stage's capacity.
const coloredBoard = Simulator.createInitialBoard(Stages.getStage(8));
assert.equal(coloredBoard[5].allowedColor, "berry");
assert.equal(coloredBoard[5].collectorOnly, true);
assert.equal(coloredBoard[5].receiveOnly, true);
const iceStage = Stages.getStage(9);
const iceBoard = Simulator.createInitialBoard(iceStage);
const iceRuntime = Mechanics.createRuntime(iceStage);
assert.deepEqual(iceBoard[5].pieces, { berry: 1 });
assert.deepEqual(iceBoard[10].pieces, { lemon: 1 });
assert.equal(Mechanics.isCellAvailable(iceStage, iceRuntime, 5, iceBoard), false);
const isolatedFrozenBoard = Array(16).fill(null);
isolatedFrozenBoard[5] = { id: 1, pieces: { berry: 1 }, capacity: 6 };
isolatedFrozenBoard[6] = { id: 2, pieces: { berry: 2 }, capacity: 6 };
const frozenTurn = Mechanics.resolveTurn(iceStage, iceRuntime, isolatedFrozenBoard, 6);
assert.deepEqual(frozenTurn.board[5].pieces, { berry: 1 }, "얼음 속 판은 깨지기 전까지 조각을 주고받지 않는다");
assert.deepEqual(frozenTurn.board[6].pieces, { berry: 2 });
const capacityBoard = Simulator.createInitialBoard(Stages.getStage(12));
assert.equal(capacityBoard[5].capacity, 8);
const layeredBoard = Simulator.createInitialBoard(Stages.getStage(17));
assert.equal(layeredBoard[5].receiveOnly, true);
assert.deepEqual(layeredBoard[5].layers[0].pieces, { lemon: 3 });

const fragileStage = Stages.getStage(16);
const fragileRuntime = { ...Mechanics.createRuntime(fragileStage), fragileBrokenCount: 2 };
assert.equal(Simulator.goalProgress(fragileStage, {}, fragileRuntime), 2 / 3);
assert.equal(Mechanics.isCellAvailable(fragileStage, fragileRuntime, 5, Array(16).fill(null)), true);

// The destination is an ordinary usable cell whenever the frog itself is not
// standing there. Reaching it removes the frog, so the same cell immediately
// becomes available for a plate again.
const frogStage = Stages.getStage(10);
const emptyFrogBoard = Array(16).fill(null);
const travellingFrog = Mechanics.createRuntime(frogStage);
assert.equal(Mechanics.isCellAvailable(frogStage, travellingFrog, 15, emptyFrogBoard), true);
const arrivingFrog = { ...travellingFrog, frogIndex: 14 };
const arrivalBoard = [...emptyFrogBoard];
arrivalBoard[1] = { id: 1, pieces: { choco: 1 }, capacity: 6 };
const arrivalTurn = Mechanics.resolveTurn(frogStage, arrivingFrog, arrivalBoard, 1);
assert.equal(arrivalTurn.runtime.frogReached, true);
assert.equal(arrivalTurn.runtime.frogIndex, null, "목표에 도착한 개구리는 보드에서 사라진다");
assert.equal(Mechanics.isCellAvailable(frogStage, arrivalTurn.runtime, 15, arrivalTurn.board), true);

// Every single-gimmick stage must be runnable through the shared mechanic turn
// reducer. Exact balance is calibrated separately with canonical 100-run jobs.
for (let id = 8; id <= 17; id += 1) {
  const stage = Stages.getStage(id);
  const result = Simulator.simulateRun(stage, {
    seed: 0x600DCAFE + id,
    style: "planner",
    skill: "expert",
  });
  assertRun(result, stage);
}

// Canonical expert balance contract for the ten one-gimmick test stages.
// These deterministic 100-run samples are the values shown in STAGE_DATA.md.
for (let id = 8; id <= 17; id += 1) {
  const stage = Stages.getStage(id);
  const result = Simulator.simulateStage(stage, {
    runs: 100,
    seed: stage.seed,
    style: "planner",
    skill: "expert",
  });
  assert.ok(
    result.clearRate >= .70 && result.clearRate <= .90,
    `${stage.title} 숙련자 100회 클리어율 ${(result.clearRate * 100).toFixed(0)}%가 70~90% 범위를 벗어났다`,
  );
}

// Mystery decisions may use the visible '?' count, but never the hidden
// colors. Changing only those colors must leave the first choice unchanged.
const mysteryA = JSON.parse(JSON.stringify(Stages.getStage(11)));
const mysteryB = JSON.parse(JSON.stringify(Stages.getStage(11)));
mysteryA.openingModifiers = [
  { hiddenColors: ["berry"] },
  { hiddenColors: ["lemon"] },
  { hiddenColors: ["matcha"] },
];
mysteryB.openingModifiers = [
  { hiddenColors: ["choco"] },
  { hiddenColors: ["choco"] },
  { hiddenColors: ["choco"] },
];
const mysteryOptions = {
  seed: 0x51DECAFE,
  style: "planner",
  skill: "expert",
  traceSupply: true,
  traceDecisions: true,
};
const mysteryResultA = Simulator.simulateRun(mysteryA, mysteryOptions);
const mysteryResultB = Simulator.simulateRun(mysteryB, mysteryOptions);
assert.deepEqual(mysteryResultA.supplyTrace[0], mysteryResultB.supplyTrace[0]);
assert.deepEqual(mysteryResultA.decisionTrace[0], mysteryResultB.decisionTrace[0]);
assert.equal(mysteryResultA.decisionTrace[0].mystery, true);

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
