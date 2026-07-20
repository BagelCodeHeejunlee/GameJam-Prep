(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./engine.js"), require("./stages.js"));
  } else {
    root.CakeLinkSimulator = factory(root.CakeLinkEngine, root.CakeLinkStages);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Engine, Stages) {
  "use strict";

  function createRandom(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6D2B79F5;
      let result = value;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function playableIndexes(stage) {
    return stage.boardMask.join("").split("")
      .map((value, index) => value === "1" ? index : -1)
      .filter((index) => index >= 0);
  }

  function createInitialBoard(stage) {
    const board = Array(Engine.BOARD_SIZE ** 2).fill(null);
    stage.initialPlates.forEach((initial, position) => {
      board[initial.index] = { id: -(position + 1), pieces: { ...initial.pieces } };
    });
    return board;
  }

  function completedTypes(result) {
    const types = [];
    for (const index of result.completed) {
      const plate = result.settledBoard[index];
      const type = Object.keys(plate?.pieces || {})
        .find((candidate) => plate.pieces[candidate] === Engine.PLATE_CAPACITY);
      if (type) types.push(type);
    }
    return types;
  }

  function goalProgress(stage, completed) {
    const target = Stages.totalGoalCount(stage);
    const achieved = Stages.goalEntries(stage)
      .reduce((sum, [type, count]) => sum + Math.min(completed[type] || 0, count), 0);
    return target ? achieved / target : 1;
  }

  function boardQuality(stage, board, completed) {
    let concentration = 0;
    let mixedPenalty = 0;
    let occupied = 0;
    let adjacency = 0;

    for (const index of playableIndexes(stage)) {
      const plate = board[index];
      if (!plate) continue;
      occupied += 1;
      const entries = Object.entries(plate.pieces).filter(([, count]) => count > 0);
      mixedPenalty += Math.max(0, entries.length - 1);
      for (const [type, count] of entries) {
        const needed = Math.max(0, (stage.goals[type] || 0) - (completed[type] || 0));
        concentration += count * count * (needed ? 1.45 : .35);
      }
      for (const neighbor of Engine.getNeighbors(index)) {
        if (neighbor <= index || !board[neighbor]) continue;
        for (const [type, count] of entries) {
          adjacency += Math.min(count, board[neighbor].pieces[type] || 0);
        }
      }
    }

    const free = playableIndexes(stage).length - occupied;
    const congestionPenalty = free <= 1 ? 180 : free === 2 ? 60 : 0;
    return concentration * 4 + adjacency * 7 + free * 12 - mixedPenalty * 9 - congestionPenalty;
  }

  function evaluateCandidate(stage, beforeCompleted, result) {
    const afterCompleted = { ...beforeCompleted };
    for (const type of completedTypes(result)) {
      afterCompleted[type] = (afterCompleted[type] || 0) + 1;
    }
    const beforeProgress = goalProgress(stage, beforeCompleted);
    const afterProgress = goalProgress(stage, afterCompleted);
    const progressGain = afterProgress - beforeProgress;
    const clearBonus = Stages.isComplete(stage, afterCompleted) ? 1000000 : 0;
    return {
      completed: afterCompleted,
      score: clearBonus + progressGain * 100000 + boardQuality(stage, result.board, afterCompleted),
    };
  }

  function resolveCandidate(stage, board, rackPlate, cellIndex, completed) {
    const placedBoard = Engine.cloneBoard(board);
    placedBoard[cellIndex] = { id: rackPlate.id, pieces: { ...rackPlate.pieces } };
    let result;
    try {
      result = Engine.resolvePlacement(placedBoard, cellIndex);
    } catch (_) {
      result = {
        board: placedBoard,
        settledBoard: placedBoard,
        completed: [],
        emptied: [],
        events: [],
      };
    }
    return { result, ...evaluateCandidate(stage, completed, result) };
  }

  function chooseCandidate(candidates, skill, random) {
    candidates.sort((a, b) => b.score - a.score);
    if (skill === "expert") return candidates[0];
    if (skill === "novice") {
      const pool = candidates.slice(0, Math.min(6, candidates.length));
      const index = Math.floor(Math.pow(random(), .65) * pool.length);
      return pool[index];
    }
    if (candidates.length > 1 && random() < .18) return candidates[1];
    return candidates[0];
  }

  function simulateRun(stage, options = {}) {
    const skill = options.skill || "standard";
    const seed = options.seed ?? stage.seed;
    const random = createRandom(seed);
    const playable = playableIndexes(stage);
    let nextId = 1;
    let generated = 0;
    let board = createInitialBoard(stage);
    let rack = [];
    let completed = {};
    let moves = 0;

    function refillRack() {
      rack = [0, 1, 2].map(() => {
        const pieces = generated < stage.openingRack.length
          ? stage.openingRack[generated]
          : Stages.createWeightedPlate(stage, random);
        generated += 1;
        return { id: nextId++, pieces: { ...pieces } };
      });
    }

    refillRack();

    while (moves < stage.moveLimit) {
      if (Stages.isComplete(stage, completed)) {
        return { outcome: "clear", movesUsed: moves, completed, progress: 1 };
      }

      const emptyCells = playable.filter((index) => !board[index]);
      if (!emptyCells.length) {
        return { outcome: "locked", movesUsed: moves, completed, progress: goalProgress(stage, completed) };
      }

      const candidates = [];
      for (let rackIndex = 0; rackIndex < rack.length; rackIndex += 1) {
        if (!rack[rackIndex]) continue;
        for (const cellIndex of emptyCells) {
          const candidate = resolveCandidate(stage, board, rack[rackIndex], cellIndex, completed);
          candidates.push({ ...candidate, rackIndex, cellIndex });
        }
      }

      if (!candidates.length) {
        return { outcome: "locked", movesUsed: moves, completed, progress: goalProgress(stage, completed) };
      }

      const chosen = chooseCandidate(candidates, skill, random);
      board = chosen.result.board;
      completed = chosen.completed;
      rack[chosen.rackIndex] = null;
      moves += 1;
      if (rack.every((plate) => !plate)) refillRack();
    }

    const cleared = Stages.isComplete(stage, completed);
    return {
      outcome: cleared ? "clear" : "limit",
      movesUsed: moves,
      completed,
      progress: cleared ? 1 : goalProgress(stage, completed),
    };
  }

  function difficultyLabel(clearRate) {
    if (clearRate >= .80) return "쉬움";
    if (clearRate >= .45) return "보통";
    if (clearRate >= .18) return "어려움";
    return "매우 어려움";
  }

  function simulateStage(stage, options = {}) {
    const runs = Math.max(1, Math.min(5000, Math.floor(options.runs || 300)));
    const skill = options.skill || "standard";
    const baseSeed = options.seed ?? stage.seed;
    const outcomes = { clear: 0, limit: 0, locked: 0 };
    const clearMoves = [];
    let totalProgress = 0;

    for (let run = 0; run < runs; run += 1) {
      const result = simulateRun(stage, {
        skill,
        seed: (baseSeed + Math.imul(run + 1, 2654435761)) >>> 0,
      });
      outcomes[result.outcome] += 1;
      totalProgress += result.progress;
      if (result.outcome === "clear") clearMoves.push(result.movesUsed);
    }

    clearMoves.sort((a, b) => a - b);
    const clearRate = outcomes.clear / runs;
    return {
      runs,
      skill,
      outcomes,
      clearRate,
      lockedRate: outcomes.locked / runs,
      limitRate: outcomes.limit / runs,
      averageProgress: totalProgress / runs,
      averageClearMoves: clearMoves.length
        ? clearMoves.reduce((sum, value) => sum + value, 0) / clearMoves.length
        : null,
      medianClearMoves: clearMoves.length ? clearMoves[Math.floor(clearMoves.length / 2)] : null,
      difficulty: difficultyLabel(clearRate),
    };
  }

  return {
    createRandom,
    playableIndexes,
    createInitialBoard,
    goalProgress,
    simulateRun,
    simulateStage,
    difficultyLabel,
  };
});
