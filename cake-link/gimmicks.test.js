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
  const turn = Mechanics.resolveTurn(stage, runtime, boardWith([
    [5, { berry: 3 }],
    [4, { berry: 3 }],
  ]), 5);
  assert.equal(turn.runtime.iceCells[0], undefined, "an adjacent emptied plate also breaks ice");
  assert.equal(turn.specialEvents.some((event) => event.kind === "iceBreak" && event.index === 0), true);
  assert.equal(Mechanics.isCellAvailable(stage, turn.runtime, 0, turn.board), true);
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
    mechanics: { fragileCells: [{ index: 5 }, { index: 4 }] },
  });
  const turn = Mechanics.resolveTurn(stage, Mechanics.createRuntime(stage), boardWith([
    [5, { berry: 3 }],
    [4, { berry: 3 }],
  ]), 5);
  assert.equal(turn.runtime.brokenCells[5], true, "a completion breaks its fragile cell");
  assert.equal(turn.runtime.brokenCells[4], undefined, "merely emptying a donor does not break its cell");
}

{
  const stage = stageWith({
    objective: { type: "frog" },
    mechanics: { frog: { startIndex: 5, goalIndex: 7 } },
  });
  let runtime = Mechanics.createRuntime(stage);
  let board = boardWith([[0, { berry: 1 }]]);
  assert.equal(Mechanics.isCellAvailable(stage, runtime, 5, board), false);
  assert.equal(Mechanics.isCellAvailable(stage, runtime, 7, board), false, "the frog goal is reserved");
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
  assert.equal(turn.runtime.frogIndex, 7);
  assert.equal(turn.runtime.frogReached, true);
  assert.equal(Mechanics.isStageComplete(stage, {}, turn.runtime), true);

  const combinedStage = stageWith({
    goals: { berry: 1 },
    objective: { type: "frog" },
    mechanics: { frog: { startIndex: 5, goalIndex: 7 } },
  });
  const combinedRuntime = { ...Mechanics.createRuntime(combinedStage), frogIndex: 7, frogReached: true };
  assert.equal(Mechanics.goalProgress(combinedStage, {}, combinedRuntime), .5);
  assert.equal(Mechanics.goalProgress(combinedStage, { berry: 1 }, combinedRuntime), 1);
  assert.equal(Mechanics.isStageComplete(combinedStage, {}, combinedRuntime), false);
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
