const assert = require("node:assert/strict");
const Engine = require("./engine.js");
const Stages = require("./stages.js");

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
function applyAnimationBatches(inputBoard, batches) {
  const board = Engine.cloneBoard(inputBoard);
  for (const batch of batches) {
    for (const transfer of batch) {
      assert.ok(board[transfer.from], `출발 판 ${transfer.from}이 있어야 한다`);
      assert.ok(board[transfer.to], `도착 판 ${transfer.to}이 있어야 한다`);
      assert.ok(
        (board[transfer.from].pieces[transfer.type] || 0) >= transfer.count,
        `${transfer.from}번 판에 이동할 ${transfer.type} 조각이 충분해야 한다`,
      );
      board[transfer.from].pieces[transfer.type] -= transfer.count;
      if (board[transfer.from].pieces[transfer.type] === 0) delete board[transfer.from].pieces[transfer.type];
    }
    for (const transfer of batch) {
      board[transfer.to].pieces[transfer.type] = (board[transfer.to].pieces[transfer.type] || 0) + transfer.count;
    }
    for (const plateData of board) {
      assert.ok(!plateData || Engine.totalPieces(plateData) <= Engine.PLATE_CAPACITY, "애니메이션 중간 판도 6조각을 넘으면 안 된다");
    }
  }
  return board;
}
function colorTotals(board) {
  return Object.fromEntries(Engine.CAKE_ORDER.map((type) => [
    type,
    board.reduce((sum, plateData) => sum + (plateData?.pieces[type] || 0), 0),
  ]));
}
function assertChainInvariants(initial, result, label) {
  const batches = Engine.buildAnimationBatches(result.events);
  const replay = Engine.cloneBoard(initial);
  const completed = new Set();
  const received = new Set();

  assert.equal(result.safetyLimitReached, false, `${label}: 연쇄 안전 제한에 닿으면 안 된다`);
  assert.deepEqual(colorTotals(result.settledBoard), colorTotals(initial), `${label}: 색깔별 조각 수가 보존되어야 한다`);

  for (const batch of batches) {
    for (const transfer of batch) {
      const direct = Engine.getNeighbors(transfer.from).includes(transfer.to);
      const relayed = transfer.via !== undefined &&
        Engine.getNeighbors(transfer.from).includes(transfer.via) &&
        Engine.getNeighbors(transfer.via).includes(transfer.to);
      assert.ok(direct || relayed, `${label}: 모든 이동은 한 칸 또는 현재 중심판을 경유해야 한다`);
      assert.equal(completed.has(transfer.from), false, `${label}: 완성 판은 다시 조각을 주면 안 된다`);
      assert.equal(completed.has(transfer.to), false, `${label}: 완성 판은 다시 조각을 받으면 안 된다`);
      assert.equal(
        received.has(`${transfer.from}:${transfer.type}`),
        false,
        `${label}: 한 번 도착한 색이 다시 출발하면 안 된다`,
      );
      assert.ok(replay[transfer.from] && replay[transfer.to], `${label}: 이동 양쪽에 판이 있어야 한다`);
      assert.ok(
        (replay[transfer.from].pieces[transfer.type] || 0) >= transfer.count,
        `${label}: 출발 판의 조각 수가 충분해야 한다`,
      );
      replay[transfer.from].pieces[transfer.type] -= transfer.count;
      if (!replay[transfer.from].pieces[transfer.type]) delete replay[transfer.from].pieces[transfer.type];
    }
    for (const transfer of batch) {
      replay[transfer.to].pieces[transfer.type] = (replay[transfer.to].pieces[transfer.type] || 0) + transfer.count;
      received.add(`${transfer.to}:${transfer.type}`);
    }
    for (let index = 0; index < replay.length; index += 1) {
      assert.ok(!replay[index] || Engine.totalPieces(replay[index]) <= Engine.PLATE_CAPACITY, `${label}: 판은 6조각을 넘으면 안 된다`);
      if (Engine.isComplete(replay[index])) completed.add(index);
    }
  }

  assert.deepEqual(replay, result.settledBoard, `${label}: 애니메이션 재생 결과가 엔진 결과와 같아야 한다`);
}

{
  // Stage 1 reproduction: place the middle opening plate (A2B1) in cell 6,
  // between the two initial A2 plates at cells 5 and 10.
  const stage = Stages.getStage(1);
  const initial = boardWith(stage.initialPlates.map((item) => [item.index, item.pieces]));
  initial[6] = plate(stage.openingRack[1], 100);
  const result = Engine.resolvePlacement(initial, 6);
  const batches = Engine.buildAnimationBatches(result.events);

  assert.deepEqual(batches, [[
    { from: 10, to: 6, type: "berry", count: 2 },
    { from: 5, to: 6, type: "berry", count: 2 },
    { from: 6, to: 10, type: "lemon", count: 1 },
  ]], "노랑 조각은 새 판에서 바로 아래 기본 판으로 한 칸만 이동해야 한다");
  assert.deepEqual(result.settledBoard[6].pieces, { berry: 6 });
  assert.deepEqual(result.settledBoard[10].pieces, { lemon: 1 });
  assert.equal(result.completed.includes(6), true);
  assert.equal(result.emptied.includes(5), true);
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
  const initial = boardWith([
    [6, { matcha: 3 }],
    [9, { blueberry: 1 }],
    [10, { lemon: 4, matcha: 2 }],
    [11, { blueberry: 1, lemon: 1 }],
  ]);
  const result = Engine.resolvePlacement(initial, 10);
  const batches = Engine.buildAnimationBatches(result.events);
  const animated = Engine.cloneBoard(initial);
  for (const batch of batches.slice(0, -1)) {
    for (const transfer of batch) {
      animated[transfer.from].pieces[transfer.type] -= transfer.count;
      if (animated[transfer.from].pieces[transfer.type] === 0) delete animated[transfer.from].pieces[transfer.type];
    }
    for (const transfer of batch) {
      animated[transfer.to].pieces[transfer.type] = (animated[transfer.to].pieces[transfer.type] || 0) + transfer.count;
    }
  }
  assert.equal(Engine.totalPieces(animated[10]), 0, "중앙판이 먼저 완전히 비는 희귀 순서를 재현해야 한다");
  assert.deepEqual(
    batches.at(-1),
    [{ from: 11, to: 9, type: "blueberry", count: 1, via: 10 }],
    "마지막 조각은 빈칸이 아닌 새로 놓은 중앙판 관계로 전달되어야 한다",
  );
  assert.deepEqual(applyAnimationBatches(initial, batches), result.settledBoard);
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
  assert.equal(
    Engine.buildAnimationBatches(result.events)[1][0].via,
    5,
    "빈칸 경로가 막혀도 중앙판 전달을 표시할 수 있어야 한다",
  );
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
    [4, { berry: 3 }],
    [5, { berry: 3 }],
    [6, { berry: 3 }],
    [9, { berry: 3 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.deepEqual(result.completed, [5, 9], "십자 배치의 A3 네 판은 A6 두 판으로 정렬되어야 한다");
  assert.deepEqual(result.settledBoard[5].pieces, { berry: 6 });
  assert.deepEqual(result.settledBoard[9].pieces, { berry: 6 });
  assert.deepEqual(result.emptied, [4, 6]);
  assert.equal(
    Engine.buildAnimationBatches(result.events).flat()
      .find((transfer) => transfer.from === 4 && transfer.to === 9).via,
    5,
  );
  assert.deepEqual(
    applyAnimationSteps(initial, Engine.buildAnimationSteps(result.events)),
    result.settledBoard,
    "중앙판 전달 연출을 사용해도 논리 결과는 기존의 A6 두 판과 같아야 한다",
  );
}

{
  const initial = boardWith([
    [1, { berry: 1 }],
    [5, { berry: 1, blueberry: 4 }],
    [6, { berry: 4, blueberry: 2 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  const batches = Engine.buildAnimationBatches(result.events);
  assert.equal(batches.length, result.events.length, "한 정렬 이벤트는 하나의 원자적 애니메이션 묶음이어야 한다");
  assert.deepEqual(
    applyAnimationBatches(initial, batches),
    result.settledBoard,
    "들어오고 밀려나는 조각을 함께 이동해도 엔진 결과와 같아야 한다",
  );
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
  assert.deepEqual(Engine.buildAnimationBatches(result.events), [
    [{ from: 4, to: 5, type: "berry", count: 2 }],
    [{ from: 5, to: 6, type: "blueberry", count: 2 }],
    [{ from: 7, to: 6, type: "blueberry", count: 3 }],
  ], "B2를 받은 6번 판이 새 중심이 되어 7번 판의 B3까지 연쇄로 받아야 한다");
  assert.deepEqual(result.settledBoard[5].pieces, { berry: 4 });
  assert.deepEqual(result.settledBoard[6].pieces, { blueberry: 6 });
  assert.deepEqual(result.completed, [6]);
  assert.deepEqual(result.emptied, [4, 7]);
  assertChainInvariants(initial, result, "한 칸 바깥 수신판 연쇄");
}

{
  const initial = boardWith([
    [4, { berry: 2 }],
    [5, { berry: 2, blueberry: 2 }],
    [6, { blueberry: 1 }],
    [7, { blueberry: 3, lemon: 1 }],
    [11, { lemon: 5 }],
    [12, { matcha: 2 }],
    [13, { matcha: 3 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.deepEqual(Engine.buildAnimationBatches(result.events).slice(0, 4), [
    [{ from: 4, to: 5, type: "berry", count: 2 }],
    [{ from: 5, to: 6, type: "blueberry", count: 2 }],
    [{ from: 7, to: 6, type: "blueberry", count: 3 }],
    [{ from: 11, to: 7, type: "lemon", count: 5 }],
  ], "조각을 준 7번 판도 새 중심이 되어 다음 레몬 완성을 이어가야 한다");
  assert.deepEqual(result.completed, [6, 7]);
  assert.deepEqual(result.emptied, [4, 11]);
  assert.deepEqual(result.settledBoard[12].pieces, { matcha: 2 }, "연쇄와 떨어진 판은 정렬되면 안 된다");
  assert.deepEqual(result.settledBoard[13].pieces, { matcha: 3 }, "연쇄와 떨어진 판은 정렬되면 안 된다");
  assertChainInvariants(initial, result, "주는 판까지 이어지는 다단 연쇄");
}

{
  const initial = boardWith([
    [2, { lemon: 2 }],
    [4, { berry: 2 }],
    [5, { berry: 2, blueberry: 2 }],
    [6, { blueberry: 1 }],
    [10, { lemon: 2 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.deepEqual(
    Engine.buildAnimationBatches(result.events).at(-1),
    [{ from: 10, to: 2, type: "lemon", count: 2, via: 6 }],
    "두 팔 사이 이동은 최초 배치 칸이 아니라 실제 연쇄 중심인 6번 판을 경유해야 한다",
  );
  assertChainInvariants(initial, result, "연쇄 중심 경유 경로");
}

{
  const initial = boardWith([
    [2, { lemon: 4 }],
    [4, { berry: 2 }],
    [5, { berry: 2, blueberry: 2 }],
    [6, { blueberry: 1, lemon: 1 }],
  ]);
  const result = Engine.resolvePlacement(initial, 5);
  assert.deepEqual(Engine.buildAnimationBatches(result.events).slice(0, 3), [
    [{ from: 4, to: 5, type: "berry", count: 2 }],
    [{ from: 5, to: 6, type: "blueberry", count: 2 }],
    [{ from: 2, to: 6, type: "lemon", count: 2 }],
  ], "연쇄 중심도 방금 받은 색이 아니라 주변 합계가 더 많은 색을 먼저 정렬해야 한다");
  assertChainInvariants(initial, result, "연쇄 중심의 전체 합계 우선순위");
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

{
  let seed = 0xC0FFEE;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const types = Engine.CAKE_ORDER.slice(0, 4);

  for (let caseIndex = 0; caseIndex < 2000; caseIndex += 1) {
    const initial = Array(16).fill(null);
    const occupied = [];
    for (let index = 0; index < initial.length; index += 1) {
      if (random() >= 0.62) continue;
      const count = 1 + Math.floor(random() * Engine.PLATE_CAPACITY);
      const pieces = {};
      for (let pieceIndex = 0; pieceIndex < count; pieceIndex += 1) {
        const type = types[Math.floor(random() * types.length)];
        pieces[type] = (pieces[type] || 0) + 1;
      }
      if (count === Engine.PLATE_CAPACITY && Object.keys(pieces).length === 1) {
        const onlyType = Object.keys(pieces)[0];
        pieces[onlyType] -= 1;
        pieces[types[(types.indexOf(onlyType) + 1) % types.length]] = 1;
      }
      initial[index] = plate(pieces, index + 1);
      occupied.push(index);
    }
    if (!occupied.length) {
      caseIndex -= 1;
      continue;
    }
    const placedIndex = occupied[Math.floor(random() * occupied.length)];
    const result = Engine.resolvePlacement(initial, placedIndex);
    assertChainInvariants(initial, result, `결정론적 연쇄 퍼즈 ${caseIndex}`);
  }
}

console.log("Cake Link engine tests passed");
