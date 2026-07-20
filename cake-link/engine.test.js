const assert = require("node:assert/strict");
const Engine = require("./engine.js");

function plate(pieces, id = Math.random()) { return { id, pieces: { ...pieces } }; }
function boardWith(entries) {
  const board = Array(16).fill(null);
  for (const [index, value] of entries) board[index] = plate(value, index + 1);
  return board;
}
function applyAnimationSteps(inputBoard, steps) {
  const board = Engine.cloneBoard(inputBoard);
  const move = ({ from, to, type }) => {
    board[from].pieces[type] -= 1;
    if (board[from].pieces[type] === 0) delete board[from].pieces[type];
    board[to].pieces[type] = (board[to].pieces[type] || 0) + 1;
  };
  for (const step of steps) {
    move(step);
    if (step.displaced) move(step.displaced);
  }
  return board;
}

{
  const result = Engine.resolvePlacement(boardWith([[5, { berry: 2 }], [1, { berry: 3 }]]), 5);
  assert.deepEqual(result.board[5].pieces, { berry: 5 });
  assert.equal(result.board[1], null, "조각이 모두 빠진 판은 정리되어야 한다");
}

{
  const initial = boardWith([
    [5, { berry: 2, blueberry: 1 }],
    [6, { berry: 3 }],
  ]);
  const result = Engine.resolvePlacement(initial, 6);
  assert.deepEqual(result.board[5].pieces, { blueberry: 1 }, "일치하지 않는 B1은 원래 판에 남아야 한다");
  assert.deepEqual(result.board[6].pieces, { berry: 5 }, "새 A3 판에는 일치한 A2만 이동해야 한다");
  assert.deepEqual(result.completed, []);
  assert.deepEqual(result.emptied, []);
  const steps = Engine.buildAnimationSteps(result.events);
  assert.equal(steps.length, 2, "A 조각은 한 조각씩 두 번 이동해야 한다");
  assert.deepEqual(applyAnimationSteps(initial, steps), result.settledBoard, "애니메이션 중간 이동의 최종 상태가 게임 결과와 같아야 한다");
}

{
  const result = Engine.resolvePlacement(boardWith([
    [5, { berry: 2, blueberry: 1, lemon: 1 }],
    [1, { berry: 4 }],
    [6, { blueberry: 2 }],
  ]), 5);
  assert.equal(result.completed.length, 1);
  assert.equal(result.board[5], null, "딸기 6개 완성 판은 사라져야 한다");
  assert.equal(result.board[6].pieces.blueberry, 3, "밀려난 블루베리는 블루베리 판으로 우선 이동해야 한다");
  assert.equal(result.board[1].pieces.lemon, 1, "같은 종류 판이 없는 레몬은 딸기가 출발한 판으로 가야 한다");
}

{
  const initial = boardWith([
    [5, { berry: 2, blueberry: 2 }],
    [1, { berry: 4 }],
    [6, { blueberry: 5 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.equal(result.completed.length, 2, "밀려난 조각으로 연쇄 완성이 가능해야 한다");
  assert.equal(result.board[5], null);
  assert.deepEqual(result.board[6].pieces, { blueberry: 1 }, "완성 판으로 이동하고 남은 조각은 원래 판에 남아야 한다");
  assert.deepEqual(applyAnimationSteps(initial, Engine.buildAnimationSteps(result.events)), result.settledBoard);
}

{
  // Reproduction: place B3C3 above, A5 to the right, then place A1B1 in the center.
  // The primary pull completes A6 and leaves B split as B3 + B1 unless the local
  // group performs a second consolidation pass.
  const initial = boardWith([
    [1, { blueberry: 3, lemon: 3 }],
    [6, { berry: 5 }],
    [5, { berry: 1, blueberry: 1 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.deepEqual(result.settledBoard[5].pieces, { berry: 6 }, "A6은 중앙에서 먼저 완성되어야 한다");
  assert.deepEqual(result.board[6].pieces, { blueberry: 4 }, "분리된 B3과 B1은 빈자리가 있는 한 판에 B4로 합쳐져야 한다");
  assert.deepEqual(result.board[1].pieces, { lemon: 3 }, "B가 빠진 혼합 판에는 C3만 남아야 한다");
  assert.deepEqual(result.completed, [5]);
  assert.deepEqual(applyAnimationSteps(initial, Engine.buildAnimationSteps(result.events)), result.settledBoard);
}

{
  const initial = boardWith([
    [4, { berry: 3, blueberry: 1 }],
    [5, { berry: 3, matcha: 2 }],
    [6, { berry: 1, blueberry: 4 }],
    [9, { berry: 2 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.equal(result.safetyLimitReached, false, "후속 정렬이 같은 B 조각을 두 판 사이에서 반복 이동하면 안 된다");
  assert.equal(result.events.length, 2, "B 조각은 정해진 수집 판으로 한 번만 이동해야 한다");
  assert.deepEqual(applyAnimationSteps(initial, Engine.buildAnimationSteps(result.events)), result.settledBoard);
}

{
  const initial = boardWith([
    [4, { berry: 2 }],
    [5, { berry: 2, blueberry: 2 }],
    [6, { blueberry: 1 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.equal(result.board[4], null, "A2를 모두 준 기존 판은 정리되어야 한다");
  assert.deepEqual(result.board[5].pieces, { berry: 4 }, "새 판은 전체 합계가 많은 A4로 정렬되어야 한다");
  assert.deepEqual(result.board[6].pieces, { blueberry: 3 }, "새 판의 B2는 주변 B1 판으로 이동해야 한다");
  assert.equal(result.events.filter((event) => event.kind === "spread").length, 1);
  assert.deepEqual(applyAnimationSteps(initial, Engine.buildAnimationSteps(result.events)), result.settledBoard);
}

{
  const initial = boardWith([
    [4, { berry: 4 }],
    [5, { berry: 1, blueberry: 3 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.deepEqual(result.board[4].pieces, { blueberry: 3 }, "A4 판은 밀려난 B3을 받아야 한다");
  assert.deepEqual(result.board[5].pieces, { berry: 5 }, "새 판은 빈자리보다 많은 A도 모두 받아 A5가 되어야 한다");
  assert.deepEqual(applyAnimationSteps(initial, Engine.buildAnimationSteps(result.events)), result.settledBoard);
}

{
  const initial = boardWith([
    [4, { berry: 2 }],
    [5, { berry: 2, blueberry: 2 }],
    [6, { blueberry: 1 }],
    [7, { blueberry: 3 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.equal(result.board[4], null);
  assert.deepEqual(result.board[5].pieces, { berry: 4 });
  assert.deepEqual(result.board[6].pieces, { blueberry: 3 }, "인접 판은 새 판의 B2까지만 받아야 한다");
  assert.deepEqual(result.board[7].pieces, { blueberry: 3 }, "인접 판의 이웃인 두 번째 칸은 연계되면 안 된다");
  assert.ok(result.events.every((event) =>
    event.source !== 7 &&
    event.target !== 7 &&
    !event.origins?.some((origin) => origin.index === 7) &&
    !event.moves?.some((move) => move.to === 7) &&
    !event.spread?.some((move) => move.to === 7)
  ));
  assert.deepEqual(applyAnimationSteps(initial, Engine.buildAnimationSteps(result.events)), result.settledBoard);
}

{
  const initial = boardWith([
    [5, { berry: 2, blueberry: 2, lemon: 2 }],
    [4, { berry: 1, blueberry: 3, lemon: 2 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.deepEqual(result.events, [], "6칸이 꽉 찼고 어떤 색도 완성할 수 없으면 서로 교환하지 않아야 한다");
  assert.deepEqual(result.settledBoard, initial);
}

{
  const initial = boardWith([
    [5, { berry: 3, blueberry: 3 }],
    [4, { berry: 3, lemon: 3 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.equal(result.completed.length, 1, "꽉 찬 판이라도 이동 결과 같은 색 6개가 되면 교환할 수 있어야 한다");
  assert.ok(result.events.length <= 2, "완성 가능한 교환이 반복되면 안 된다");
  assert.deepEqual(applyAnimationSteps(initial, Engine.buildAnimationSteps(result.events)), result.settledBoard);
}

{
  const neighbors = Engine.getNeighbors(5);
  assert.deepEqual(neighbors, [1, 6, 9, 4], "우선순위는 상, 우, 하, 좌여야 한다");
}

console.log("Cake Link engine tests passed");
