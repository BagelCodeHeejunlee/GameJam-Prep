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
  const neighbors = Engine.getNeighbors(5);
  assert.deepEqual(neighbors, [1, 6, 9, 4], "우선순위는 상, 우, 하, 좌여야 한다");
}

console.log("Cake Link engine tests passed");
