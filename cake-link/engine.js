(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CakeLinkEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BOARD_SIZE = 4;
  const PLATE_CAPACITY = 6;
  const CAKE_ORDER = ["berry", "blueberry", "lemon", "matcha", "choco"];

  function totalPieces(plate) {
    if (!plate) return 0;
    return Object.values(plate.pieces).reduce((sum, count) => sum + count, 0);
  }

  function cloneBoard(board) {
    return board.map((plate) => plate ? { ...plate, pieces: { ...plate.pieces } } : null);
  }

  function cleanPieces(plate) {
    for (const [type, count] of Object.entries(plate.pieces)) {
      if (count <= 0) delete plate.pieces[type];
    }
  }

  function getNeighbors(index) {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const result = [];
    if (row > 0) result.push(index - BOARD_SIZE);
    if (col < BOARD_SIZE - 1) result.push(index + 1);
    if (row < BOARD_SIZE - 1) result.push(index + BOARD_SIZE);
    if (col > 0) result.push(index - 1);
    return result;
  }

  function isComplete(plate) {
    if (!plate || totalPieces(plate) !== PLATE_CAPACITY) return false;
    const types = Object.keys(plate.pieces).filter((type) => plate.pieces[type] > 0);
    return types.length === 1 && plate.pieces[types[0]] === PLATE_CAPACITY;
  }

  function choosePullType(board, index, locked) {
    const plate = board[index];
    if (!plate) return null;
    const candidates = Object.keys(plate.pieces).map((type) => {
      const incoming = getNeighbors(index).reduce((sum, neighborIndex) => {
        if (locked.has(neighborIndex) || !board[neighborIndex]) return sum;
        return sum + (board[neighborIndex].pieces[type] || 0);
      }, 0);
      return { type, incoming, own: plate.pieces[type] || 0 };
    }).filter((candidate) => candidate.incoming > 0 && candidate.own < PLATE_CAPACITY);

    candidates.sort((a, b) =>
      b.incoming - a.incoming ||
      b.own - a.own ||
      CAKE_ORDER.indexOf(a.type) - CAKE_ORDER.indexOf(b.type)
    );
    return candidates[0]?.type || null;
  }

  function removeOtherPieces(plate, keepType, amount) {
    let remaining = amount;
    const removed = {};
    const types = Object.keys(plate.pieces)
      .filter((type) => type !== keepType && plate.pieces[type] > 0)
      .sort((a, b) => plate.pieces[a] - plate.pieces[b] || CAKE_ORDER.indexOf(a) - CAKE_ORDER.indexOf(b));

    for (const type of types) {
      if (remaining <= 0) break;
      const count = Math.min(plate.pieces[type], remaining);
      plate.pieces[type] -= count;
      removed[type] = (removed[type] || 0) + count;
      remaining -= count;
    }
    cleanPieces(plate);
    return removed;
  }

  function addToPlate(plate, type, count) {
    const accepted = Math.min(count, PLATE_CAPACITY - totalPieces(plate));
    if (accepted > 0) plate.pieces[type] = (plate.pieces[type] || 0) + accepted;
    return accepted;
  }

  function spreadPieces(board, centerIndex, displaced, origins, locked) {
    const moves = [];
    const recipients = [];
    const neighborOrder = getNeighbors(centerIndex);

    for (const type of CAKE_ORDER) {
      let remaining = displaced[type] || 0;
      if (!remaining) continue;

      const matching = neighborOrder
        .filter((index) => !locked.has(index) && board[index]?.pieces[type] > 0 && totalPieces(board[index]) < PLATE_CAPACITY)
        .sort((a, b) => board[b].pieces[type] - board[a].pieces[type] || neighborOrder.indexOf(a) - neighborOrder.indexOf(b));
      const fallback = origins.map((origin) => origin.index)
        .filter((index, position, list) => list.indexOf(index) === position && !locked.has(index) && board[index] && !matching.includes(index));
      const lastResort = neighborOrder.filter((index) => !locked.has(index) && board[index] && !matching.includes(index) && !fallback.includes(index));

      for (const destination of [...matching, ...fallback, ...lastResort]) {
        if (remaining <= 0) break;
        const accepted = addToPlate(board[destination], type, remaining);
        if (!accepted) continue;
        remaining -= accepted;
        moves.push({ type, count: accepted, to: destination });
        recipients.push({ index: destination, preferredType: type });
      }

      if (remaining > 0) {
        throw new Error(`조각 ${type} ${remaining}개를 이동할 공간이 없습니다.`);
      }
    }
    return { moves, recipients };
  }

  function pullType(board, index, type, locked) {
    const target = board[index];
    if (!target || locked.has(index) || !target.pieces[type]) return null;

    const sourceIndexes = getNeighbors(index).filter((neighborIndex) =>
      !locked.has(neighborIndex) && board[neighborIndex]?.pieces[type] > 0
    );
    const supply = sourceIndexes.reduce((sum, sourceIndex) => sum + board[sourceIndex].pieces[type], 0);
    const wanted = Math.min(supply, PLATE_CAPACITY - target.pieces[type]);
    if (wanted <= 0) return null;

    const free = PLATE_CAPACITY - totalPieces(target);
    const displaced = removeOtherPieces(target, type, Math.max(0, wanted - free));
    let remaining = wanted;
    const origins = [];

    for (const sourceIndex of sourceIndexes) {
      if (remaining <= 0) break;
      const source = board[sourceIndex];
      const count = Math.min(source.pieces[type], remaining);
      source.pieces[type] -= count;
      cleanPieces(source);
      target.pieces[type] = (target.pieces[type] || 0) + count;
      origins.push({ index: sourceIndex, count });
      remaining -= count;
    }

    const spread = spreadPieces(board, index, displaced, origins, locked);
    return {
      event: { kind: "pull", target: index, type, count: wanted, origins, displaced, spread: spread.moves },
      recipients: spread.recipients,
      touched: [index, ...origins.map((origin) => origin.index), ...spread.moves.map((move) => move.to)],
    };
  }

  function resolvePlacement(inputBoard, placedIndex) {
    const board = cloneBoard(inputBoard);
    const locked = new Set();
    const events = [];
    const queue = [{ index: placedIndex, preferredType: null }];
    const attempts = new Map();
    let safety = 0;

    while (queue.length && safety < 48) {
      safety += 1;
      const item = queue.shift();
      if (!board[item.index] || locked.has(item.index)) continue;
      const key = `${item.index}:${item.preferredType || "auto"}`;
      const tried = attempts.get(key) || 0;
      if (tried >= 2) continue;
      attempts.set(key, tried + 1);

      const type = item.preferredType && board[item.index].pieces[item.preferredType]
        ? item.preferredType
        : choosePullType(board, item.index, locked);
      if (!type) continue;

      const result = pullType(board, item.index, type, locked);
      if (!result) continue;
      events.push(result.event);

      const uniqueTouched = [...new Set(result.touched)];
      for (const touchedIndex of uniqueTouched) {
        if (isComplete(board[touchedIndex])) locked.add(touchedIndex);
      }
      for (const recipient of result.recipients) {
        if (!locked.has(recipient.index)) queue.push(recipient);
      }
    }

    const completed = [...locked].sort((a, b) => a - b);
    const emptied = [];
    for (let index = 0; index < board.length; index += 1) {
      if (board[index] && totalPieces(board[index]) === 0) emptied.push(index);
    }
    const settledBoard = cloneBoard(board);
    for (const index of [...completed, ...emptied]) board[index] = null;

    return { board, settledBoard, events, completed, emptied, safetyLimitReached: safety >= 48 };
  }

  return {
    BOARD_SIZE,
    PLATE_CAPACITY,
    CAKE_ORDER,
    totalPieces,
    cloneBoard,
    getNeighbors,
    isComplete,
    choosePullType,
    resolvePlacement,
  };
});
