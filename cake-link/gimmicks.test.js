const assert = require("node:assert/strict");
const Engine = require("./engine.js");
const Mechanics = require("./mechanics.js");

function plate(spec, id = Math.random()) {
  return spec?.pieces
    ? { id, ...Engine.deepClone(spec) }
    : { id, pieces: { ...spec } };
}

function boardWith(entries) {
  const board = Array(Engine.BOARD_SIZE ** 2).fill(null);
  for (const [index, spec] of entries) board[index] = plate(spec, index + 1);
  return board;
}

function stageWith(overrides = {}) {
  return {
    id: 99,
    boardMask: ["1111", "1111", "1111", "1111"],
    goals: {},
    rules: { capacity: 6 },
    mechanics: {},
    ...overrides,
  };
}

function completedTypes(result) {
  return result.completionEvents.map((event) => event.type);
}

{
  const original = boardWith([[5, {
    pieces: { berry: 2, mystery: 1 },
    capacity: 8,
    hiddenColors: ["lemon"],
    layers: [{ pieces: { blueberry: 3 }, capacity: 8, receiveOnly: true }],
  }]]);
  const clone = Engine.cloneBoard(original);
  clone[5].pieces.berry = 7;
  clone[5].hiddenColors[0] = "matcha";
  clone[5].layers[0].pieces.blueberry = 1;
  assert.deepEqual(original[5].pieces, { berry: 2, mystery: 1 });
  assert.deepEqual(original[5].hiddenColors, ["lemon"]);
  assert.deepEqual(original[5].layers[0].pieces, { blueberry: 3 });
  assert.equal(Engine.capacityOf(original[5]), 8);
}

{
  const colored = plate({
    pieces: { berry: 2 },
    allowedColor: "berry",
    receiveOnly: true,
  });
  assert.equal(Engine.canReceive(colored, "berry"), true);
  assert.equal(Engine.canReceive(colored, "lemon"), false);
  assert.equal(Engine.canGive(colored, "berry"), false);

  const matching = Engine.resolvePlacement(boardWith([
    [5, colored],
    [4, { berry: 4 }],
  ]), 4);
  assert.deepEqual(completedTypes(matching), ["berry"]);

  const mismatching = Engine.resolvePlacement(boardWith([
    [5, colored],
    [4, { lemon: 4 }],
  ]), 4);
  assert.deepEqual(mismatching.events, []);
  assert.deepEqual(mismatching.board[5].pieces, { berry: 2 });
}

{
  const collector = plate({
    kind: "colored",
    collectorOnly: true,
    receiveOnly: true,
    allowedColor: "berry",
    pieces: { berry: 5 },
  });
  assert.equal(Engine.canReceive(collector, "berry"), false, "collectors never receive through ordinary sorting");
  assert.equal(Engine.canGive(collector, "berry"), false, "collectors never donate through ordinary sorting");

  const stage = stageWith({ goals: { berry: 1, lemon: 1 } });
  const turn = Mechanics.resolveTurn(stage, Mechanics.createRuntime(stage), boardWith([
    [1, collector],
    [4, { lemon: 4 }],
    [5, { berry: 1, lemon: 2 }],
  ]), 5);
  assert.equal(turn.phases.length, 2, "collector intake resolves before ordinary local sorting");
  assert.deepEqual(turn.phases[0].events, [{
    kind: "collector",
    target: 1,
    type: "berry",
    count: 1,
    origins: [{ index: 5, count: 1 }],
    displaced: {},
    spread: [],
  }]);
  assert.deepEqual(completedTypes(turn), ["berry", "lemon"]);
  assert.equal(turn.board[1], null);
  assert.equal(turn.board[5], null);
}

{
  const collector = (count) => ({
    kind: "colored",
    collectorOnly: true,
    receiveOnly: true,
    allowedColor: "berry",
    pieces: { berry: count },
  });
  const closestFirst = Engine.resolveColoredCollectors(boardWith([
    [1, collector(5)], // up: one short
    [6, collector(4)], // right: two short
    [5, { berry: 3 }],
  ]), 5);
  assert.deepEqual(closestFirst.events.map((event) => [event.target, event.count]), [[1, 1], [6, 2]]);
  assert.deepEqual(closestFirst.completed, [1, 6]);
  assert.deepEqual(closestFirst.emptied, [5]);
  assert.equal(closestFirst.board.filter(Boolean).length, 0);

  const directionTie = Engine.resolveColoredCollectors(boardWith([
    [1, collector(4)],
    [6, collector(4)],
    [5, { berry: 2 }],
  ]), 5);
  assert.deepEqual(directionTie.events.map((event) => event.target), [1], "U wins a U/R/D/L deficit tie");
  assert.equal(directionTie.board[1], null);
  assert.deepEqual(directionTie.board[6].pieces, { berry: 4 });
  assert.equal(directionTie.board[5], null, "an emptied newly placed plate is removed");

  const protectedLayer = Engine.resolveColoredCollectors(boardWith([
    [1, collector(5)],
    [5, {
      pieces: { berry: 1 },
      receiveOnly: true,
      layers: [{ pieces: { lemon: 3 }, receiveOnly: true }],
    }],
  ]), 5);
  assert.deepEqual(protectedLayer.events, [], "a receive-only upper layer cannot be drained by a collector");
  assert.deepEqual(protectedLayer.board[5].pieces, { berry: 1 });
}

{
  const inertCollector = plate({
    kind: "colored",
    collectorOnly: true,
    receiveOnly: true,
    allowedColor: "berry",
    pieces: { berry: 2 },
  });
  const ordinary = Engine.resolvePlacement(boardWith([
    [5, inertCollector],
    [4, { berry: 4 }],
  ]), 4);
  assert.deepEqual(ordinary.events, [], "ordinary sorting cannot interact with a colored collector");
  assert.deepEqual(ordinary.board[5].pieces, { berry: 2 });
  assert.deepEqual(ordinary.board[4].pieces, { berry: 4 });
}

{
  const stage = stageWith({
    goals: { berry: 1, lemon: 1 },
    objective: { type: "coloredPlates", targets: { berry: 1, lemon: 1 } },
  });
  let turn = Mechanics.resolveTurn(stage, Mechanics.createRuntime(stage), boardWith([
    [1, {
      kind: "colored",
      collectorOnly: true,
      receiveOnly: true,
      allowedColor: "berry",
      pieces: { berry: 5 },
    }],
    [5, { berry: 1 }],
  ]), 5);
  assert.deepEqual(turn.runtime.collectedColoredPlates, { berry: 1 });
  assert.deepEqual(turn.specialEvents.find((event) => event.kind === "coloredPlateCollected"), {
    kind: "coloredPlateCollected",
    index: 1,
    type: "berry",
    progress: 1,
    target: 1,
  });
  assert.equal(Mechanics.goalProgress(stage, { berry: 1 }, turn.runtime), .5);
  assert.equal(Mechanics.isStageComplete(stage, { berry: 1, lemon: 1 }, turn.runtime), false);

  turn = Mechanics.resolveTurn(stage, turn.runtime, boardWith([
    [6, {
      kind: "colored",
      collectorOnly: true,
      receiveOnly: true,
      allowedColor: "lemon",
      pieces: { lemon: 5 },
    }],
    [5, { lemon: 1 }],
  ]), 5);
  assert.deepEqual(turn.runtime.collectedColoredPlates, { berry: 1, lemon: 1 });
  assert.equal(Mechanics.goalProgress(stage, { berry: 1, lemon: 1 }, turn.runtime), 1);
  assert.equal(Mechanics.isStageComplete(stage, { berry: 1, lemon: 1 }, turn.runtime), true);
}

{
  const mystery = plate({ pieces: { mystery: 2 }, hiddenColors: ["berry", "lemon"] });
  const reveal = Mechanics.revealPlate(mystery);
  assert.deepEqual(reveal.revealedColors, ["berry", "lemon"]);
  assert.deepEqual(reveal.plate.pieces, { berry: 1, lemon: 1 });
  assert.deepEqual(mystery.pieces, { mystery: 2 }, "revealing must not mutate the rack plate");

  const automatic = Engine.resolvePlacement(boardWith([[5, mystery]]), 5);
  assert.deepEqual(automatic.mysteryRevealed, [5]);
  assert.deepEqual(automatic.board[5].pieces, { berry: 1, lemon: 1 });
}

{
  const eight = Engine.resolvePlacement(boardWith([
    [5, { pieces: { berry: 4 }, capacity: 8 }],
    [4, { pieces: { berry: 4 }, capacity: 8 }],
  ]), 5);
  assert.deepEqual(eight.completionEvents, [{
    index: 5,
    type: "berry",
    capacity: 8,
    layered: false,
    removed: true,
  }]);
  assert.deepEqual(eight.settledBoard[5].pieces, { berry: 8 });
}

{
  const exact = Engine.resolvePlacement(boardWith([[5, { berry: 4, rainbow: 2 }]]), 5);
  assert.deepEqual(completedTypes(exact), ["berry"]);
  assert.deepEqual(exact.settledBoard[5].pieces, { berry: 6 });
  assert.deepEqual(Engine.buildAnimationBatches(exact.events), [[{
    from: 5,
    to: 5,
    type: "rainbow",
    targetType: "berry",
    count: 2,
  }]]);

  const sevenPlusOne = Engine.resolvePlacement(boardWith([
    [5, { rainbow: 1 }],
    [4, { berry: 4 }],
    [1, { berry: 3 }],
  ]), 5);
  assert.deepEqual(completedTypes(sevenPlusOne), ["berry"]);
  assert.deepEqual(sevenPlusOne.board.filter(Boolean).map((item) => item.pieces), [
    { berry: 1 },
    { rainbow: 1 },
  ]);

  const twoColors = Engine.resolvePlacement(boardWith([
    [5, { rainbow: 2 }],
    [4, { berry: 5 }],
    [1, { blueberry: 5 }],
  ]), 5);
  assert.deepEqual(completedTypes(twoColors), ["berry", "blueberry"]);
  assert.equal(twoColors.events.filter((event) => event.kind === "wildcard").length, 2);

  const rainbowOnly = Engine.resolvePlacement(boardWith([[5, { rainbow: 6 }]]), 5);
  assert.deepEqual(rainbowOnly.completionEvents, []);
  assert.deepEqual(rainbowOnly.board[5].pieces, { rainbow: 6 });
}

{
  const stage = stageWith({
    goals: { berry: 1, lemon: 1 },
  });
  const turn = Mechanics.resolveTurn(stage, Mechanics.createRuntime(stage), boardWith([
    [5, {
      pieces: { berry: 3 },
      receiveOnly: true,
      layers: [{ pieces: { lemon: 3 }, receiveOnly: true }],
    }],
    [4, { berry: 3 }],
    [6, { lemon: 3 }],
  ]), 4);
  assert.equal(turn.phases.length, 2, "a revealed lower layer gets one extra local resolution");
  assert.deepEqual(completedTypes(turn), ["berry", "lemon"]);
  assert.deepEqual(turn.phases[0].revealed, [5]);
  assert.equal(turn.board[5], null);
}

{
  const stage = stageWith({
    goals: { berry: 1, matcha: 1, lemon: 1, choco: 1 },
  });
  const turn = Mechanics.resolveTurn(stage, Mechanics.createRuntime(stage), boardWith([
    [5, { pieces: { berry: 3 }, receiveOnly: true, layers: [{ pieces: { lemon: 3 }, receiveOnly: true }] }],
    [10, { pieces: { matcha: 3 }, receiveOnly: true, layers: [{ pieces: { choco: 3 }, receiveOnly: true }] }],
    [6, { berry: 3, matcha: 3 }],
    [4, { lemon: 3 }],
    [11, { choco: 3 }],
  ]), 6);
  assert.equal(turn.phases.length, 3, "two exposed lower layers each resolve once");
  assert.deepEqual(new Set(completedTypes(turn)), new Set(["berry", "matcha", "lemon", "choco"]));
  assert.equal(turn.board[5], null);
  assert.equal(turn.board[10], null);
}

{
  const stage = stageWith({ mechanics: { iceCells: [{ index: 0, layers: 1 }] } });
  const runtime = Mechanics.createRuntime(stage);
  assert.equal(Mechanics.isCellAvailable(stage, runtime, 0, Array(16).fill(null)), false);
  const donorEmptied = Mechanics.resolveTurn(stage, runtime, boardWith([
    [0, { berry: 2 }],
    [5, { berry: 3 }],
    [4, { berry: 3 }],
  ]), 5);
  assert.deepEqual(donorEmptied.board[0].pieces, { berry: 2 }, "a plate embedded in ice cannot send or receive this turn");
  assert.equal(donorEmptied.runtime.iceCells[0], 1, "emptying an adjacent donor without making a cake does not break ice");
  assert.equal(donorEmptied.specialEvents.some((event) => event.kind === "iceBreak"), false);
  assert.equal(Engine.isFrozen(donorEmptied.board[0]), true);

  const diagonalCompletion = Mechanics.resolveTurn(stage, runtime, boardWith([
    [0, { berry: 2 }],
    [5, { lemon: 3 }],
    [6, { lemon: 3 }],
  ]), 5);
  assert.equal(diagonalCompletion.runtime.iceCells[0], 1, "a diagonal cake completion does not break ice");

  const adjacentCompletion = Mechanics.resolveTurn(stage, runtime, boardWith([
    [0, { berry: 2 }],
    [4, { matcha: 3 }],
    [5, { matcha: 3 }],
  ]), 4);
  assert.equal(adjacentCompletion.runtime.iceCells[0], undefined, "an orthogonally adjacent cake completion breaks ice");
  assert.equal(adjacentCompletion.specialEvents.some((event) => event.kind === "iceBreak" && event.index === 0), true);
  assert.equal(Engine.isFrozen(adjacentCompletion.board[0]), false, "broken ice activates its embedded plate for the next turn");
  assert.equal(Mechanics.isCellAvailable(stage, adjacentCompletion.runtime, 0, adjacentCompletion.board), false, "the embedded plate still occupies its cell");

  const stillFrozenStage = stageWith({ mechanics: { iceCells: [{ index: 5, layers: 2 }] } });
  const frozenTurn = Mechanics.resolveTurn(
    stillFrozenStage,
    Mechanics.createRuntime(stillFrozenStage),
    boardWith([[5, { berry: 2 }], [4, { berry: 3 }]]),
    4,
  );
  assert.deepEqual(frozenTurn.board[5].pieces, { berry: 2 });
  assert.deepEqual(frozenTurn.board[4].pieces, { berry: 3 });
  assert.equal(Engine.isFrozen(frozenTurn.board[5]), true);
}

{
  const stage = stageWith({
    mechanics: {
      locks: [{ index: 6, keyId: "berry-key", color: "berry", count: 1 }],
    },
  });
  const runtime = Mechanics.createRuntime(stage);
  assert.equal(runtime.lockedCells[6], true);
  const turn = Mechanics.resolveTurn(stage, runtime, boardWith([
    [5, { berry: 3 }],
    [4, { berry: 3 }],
  ]), 5);
  assert.equal(turn.runtime.lockedCells[6], undefined);
  assert.deepEqual(turn.specialEvents.find((event) => event.kind === "unlock")?.indexes, [6]);
}

{
  const stage = stageWith({
    mechanics: {
      locks: [
        { index: 5, keyId: "berry-key-1", color: "berry", count: 1 },
        { index: 9, keyId: "berry-key-2", color: "berry", count: 2 },
      ],
    },
  });
  let runtime = Mechanics.createRuntime(stage);
  let turn = Mechanics.resolveTurn(stage, runtime, boardWith([
    [1, { berry: 3 }],
    [2, { berry: 3 }],
  ]), 1);
  assert.equal(turn.runtime.lockedCells[5], undefined, "the first berry completion opens tier one");
  assert.equal(turn.runtime.lockedCells[9], true, "tier two stays locked after one completion");

  runtime = turn.runtime;
  turn = Mechanics.resolveTurn(stage, runtime, boardWith([
    [1, { berry: 3 }],
    [2, { berry: 3 }],
  ]), 1);
  assert.equal(turn.runtime.lockedCells[9], undefined, "the second berry completion opens tier two");
}

{
  const stage = stageWith({
    goals: {},
    objective: { type: "service", target: 2 },
    mechanics: { serviceCells: [{ index: 5 }, { index: 10 }] },
  });
  let turn = Mechanics.resolveTurn(stage, Mechanics.createRuntime(stage), boardWith([
    [5, { berry: 3 }],
    [4, { berry: 3 }],
  ]), 5);
  assert.deepEqual(turn.runtime.servedCells, { 5: true });
  assert.equal(turn.runtime.servedCount, 1);
  assert.deepEqual(turn.specialEvents.find((event) => event.kind === "orderServed"), {
    kind: "orderServed",
    index: 5,
    type: "berry",
    progress: 1,
    target: 2,
  });
  assert.equal(turn.runtime.brokenCells[5], undefined, "serving an order does not break the cell");
  assert.equal(Mechanics.isCellAvailable(stage, turn.runtime, 5, turn.board), true, "a served station stays reusable");
  assert.equal(Mechanics.goalProgress(stage, {}, turn.runtime), .5);

  turn = Mechanics.resolveTurn(stage, turn.runtime, boardWith([
    [5, { lemon: 3 }],
    [4, { lemon: 3 }],
  ]), 5);
  assert.equal(turn.runtime.servedCount, 1, "the same service cell only counts once");
  assert.equal(turn.specialEvents.some((event) => event.kind === "orderServed"), false);

  turn = Mechanics.resolveTurn(stage, turn.runtime, boardWith([
    [10, { matcha: 3 }],
    [9, { matcha: 3 }],
  ]), 10);
  assert.deepEqual(turn.runtime.servedCells, { 5: true, 10: true });
  assert.equal(turn.runtime.servedCount, 2);
  assert.equal(Mechanics.goalProgress(stage, {}, turn.runtime), 1);
  assert.equal(Mechanics.isStageComplete(stage, {}, turn.runtime), true);
}

{
  const stage = stageWith({
    mechanics: { fragileCells: [{ index: 5 }, { index: 4 }] },
  });
  const turn = Mechanics.resolveTurn(stage, Mechanics.createRuntime(stage), boardWith([
    [5, { berry: 3 }],
    [4, { berry: 3 }],
  ]), 5);
  assert.equal(turn.runtime.brokenCells[5], true, "a completion breaks its fragile cell");
  assert.equal(turn.runtime.fragileBrokenCount, 1);
  assert.deepEqual(turn.specialEvents.find((event) => event.kind === "fragileBreak"), {
    kind: "fragileBreak",
    index: 5,
    progress: 1,
    target: 2,
  });
  assert.equal(turn.runtime.brokenCells[4], undefined, "merely emptying a donor does not break its cell");
  assert.equal(
    Mechanics.isCellAvailable(stage, turn.runtime, 5, turn.board),
    true,
    "the plate breaks, but its board cell remains reusable",
  );
}

{
  const stage = stageWith({
    goals: {},
    objective: { type: "fragile", target: 2 },
    mechanics: { fragileCells: [{ index: 5 }, { index: 10 }] },
  });
  const first = Mechanics.resolveTurn(stage, Mechanics.createRuntime(stage), boardWith([
    [5, { berry: 3 }],
    [4, { berry: 3 }],
  ]), 5);
  assert.equal(Mechanics.goalProgress(stage, {}, first.runtime), .5);
  assert.equal(Mechanics.isStageComplete(stage, {}, first.runtime), false);
  const second = Mechanics.resolveTurn(stage, first.runtime, boardWith([
    [10, { lemon: 3 }],
    [9, { lemon: 3 }],
  ]), 10);
  assert.equal(second.runtime.fragileBrokenCount, 2);
  assert.equal(Mechanics.goalProgress(stage, {}, second.runtime), 1);
  assert.equal(Mechanics.isStageComplete(stage, {}, second.runtime), true);
}

{
  const stage = stageWith({
    objective: { type: "frog" },
    mechanics: { frog: { startIndex: 5, goalIndex: 7 } },
  });
  let runtime = Mechanics.createRuntime(stage);
  let board = boardWith([[0, { berry: 1 }]]);
  assert.equal(Mechanics.isCellAvailable(stage, runtime, 5, board), false);
  assert.equal(Mechanics.isCellAvailable(stage, runtime, 7, board), true, "an empty frog goal stays playable");
  assert.equal(Mechanics.frogDistance(stage, runtime, board), 2);

  let turn = Mechanics.resolveTurn(stage, runtime, board, 0);
  assert.equal(turn.runtime.frogIndex, 6);
  assert.deepEqual(turn.specialEvents.find((event) => event.kind === "frogMove"), {
    kind: "frogMove", from: 5, to: 6, reached: false,
  });
  runtime = turn.runtime;
  board = turn.board;
  board[15] = plate({ berry: 1 });
  turn = Mechanics.resolveTurn(stage, runtime, board, 15);
  assert.equal(turn.runtime.frogIndex, null, "the frog disappears after reaching its goal");
  assert.equal(turn.runtime.frogReached, true);
  assert.equal(Mechanics.frogDistance(stage, turn.runtime, turn.board), 0);
  assert.equal(Mechanics.isCellAvailable(stage, turn.runtime, 7, turn.board), true);
  assert.equal(Mechanics.isStageComplete(stage, {}, turn.runtime), true);

  const combinedStage = stageWith({
    goals: { berry: 1 },
    objective: { type: "frog" },
    mechanics: { frog: { startIndex: 5, goalIndex: 7 } },
  });
  const combinedRuntime = { ...Mechanics.createRuntime(combinedStage), frogIndex: null, frogReached: true };
  assert.equal(Mechanics.goalProgress(combinedStage, {}, combinedRuntime), .5);
  assert.equal(Mechanics.goalProgress(combinedStage, { berry: 1 }, combinedRuntime), 1);
  assert.equal(Mechanics.isStageComplete(combinedStage, {}, combinedRuntime), false);
}

{
  const stage = stageWith({
    objective: { type: "frog" },
    mechanics: { frog: { startIndex: 0, goalIndex: 3 } },
  });
  let runtime = Mechanics.createRuntime(stage);
  let board = boardWith([
    [3, { berry: 1 }],
    [15, { choco: 1 }],
  ]);

  let turn = Mechanics.resolveTurn(stage, runtime, board, 15);
  assert.equal(turn.runtime.frogIndex, 1, "the frog approaches an occupied goal");
  turn = Mechanics.resolveTurn(stage, turn.runtime, turn.board, 15);
  assert.equal(turn.runtime.frogIndex, 2);
  const waiting = Mechanics.resolveTurn(stage, turn.runtime, turn.board, 15);
  assert.equal(waiting.runtime.frogIndex, 2, "the frog waits beside an occupied goal");
  assert.equal(waiting.specialEvents.some((event) => event.kind === "frogMove"), false);

  board = Engine.cloneBoard(waiting.board);
  board[3] = null;
  turn = Mechanics.resolveTurn(stage, waiting.runtime, board, 15);
  assert.equal(turn.runtime.frogIndex, null);
  assert.equal(turn.runtime.frogReached, true, "the frog enters and vanishes once the goal is empty");
}

{
  const stage = stageWith({
    goals: { berry: 1, lemon: 1 },
    objective: { type: "ordered" },
    mechanics: { orderedGoal: { sequence: ["berry", "lemon"] } },
  });
  let runtime = Mechanics.createRuntime(stage);
  let completed = {};

  let turn = Mechanics.resolveTurn(stage, runtime, boardWith([
    [5, { blueberry: 3 }], [4, { blueberry: 3 }],
  ]), 5);
  assert.equal(turn.runtime.orderIndex, 0, "a wrong completion is ignored");

  turn = Mechanics.resolveTurn(stage, turn.runtime, boardWith([
    [5, { berry: 3 }], [4, { berry: 3 }],
  ]), 5);
  completed.berry = 1;
  assert.equal(turn.runtime.orderIndex, 1);

  turn = Mechanics.resolveTurn(stage, turn.runtime, boardWith([
    [5, { lemon: 3 }], [4, { lemon: 3 }],
  ]), 5);
  completed.lemon = 1;
  assert.equal(turn.runtime.orderIndex, 2);
  assert.equal(Mechanics.goalProgress(stage, completed, turn.runtime), 1);
  assert.equal(Mechanics.isStageComplete(stage, completed, turn.runtime), true);
}

console.log("Cake Link gimmick tests passed");
