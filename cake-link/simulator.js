(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./engine.js"), require("./stages.js"));
  } else {
    root.CakeLinkSimulator = factory(root.CakeLinkEngine, root.CakeLinkStages);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Engine, Stages) {
  "use strict";

  const PLAYER_STYLES = Object.freeze({
    planner: Object.freeze({
      id: "planner",
      label: "꼼꼼 계산",
      description: "모든 판과 빈칸의 정렬 결과를 비교해 목표와 보드 상태를 함께 봅니다.",
    }),
    goal: Object.freeze({
      id: "goal",
      label: "완성 우선",
      description: "당장 목표 케이크를 완성하거나 목표색을 크게 모으는 수를 우선합니다.",
    }),
    space: Object.freeze({
      id: "space",
      label: "공간 관리",
      description: "빈칸을 확보하고 혼합 판을 줄여 보드가 막히지 않는 수를 우선합니다.",
    }),
    instinct: Object.freeze({
      id: "instinct",
      label: "빠른 직감",
      description: "하단 판 하나를 먼저 고른 뒤 주변의 같은 색이 눈에 띄는 칸에 놓습니다.",
    }),
  });
  const PLAYER_STYLE_IDS = Object.freeze(Object.keys(PLAYER_STYLES));
  const SKILL_LEVELS = Object.freeze({
    novice: Object.freeze({
      id: "novice",
      label: "초보",
      description: "좋아 보이는 후보 여러 개 사이에서 자주 망설이거나 실수합니다.",
    }),
    standard: Object.freeze({
      id: "standard",
      label: "일반",
      description: "대부분 가장 좋은 수를 고르지만 가끔 두세 번째 후보를 선택합니다.",
    }),
    expert: Object.freeze({
      id: "expert",
      label: "숙련",
      description: "선택한 플레이 방식의 평가 기준에서 항상 가장 높은 수를 고릅니다.",
    }),
  });

  function normalizeStyle(style) {
    return Object.hasOwn(PLAYER_STYLES, style) ? style : "planner";
  }

  function normalizeSkill(skill) {
    return Object.hasOwn(SKILL_LEVELS, skill) ? skill : "standard";
  }

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

  function boardMetrics(stage, board, completed) {
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
    return {
      concentration,
      mixedPenalty,
      occupied,
      adjacency,
      free,
      congestionPenalty,
      quality: concentration * 4 + adjacency * 7 + free * 12 - mixedPenalty * 9 - congestionPenalty,
    };
  }

  function visiblePlacementMetrics(stage, board, rackPlate, cellIndex, completed) {
    const occupiedNeighbors = Engine.getNeighbors(cellIndex).filter((index) => board[index]);
    let matchingPieces = 0;
    let matchingColors = 0;
    let completionPotential = 0;
    let goalCompletionPotential = 0;
    let goalPieces = 0;

    for (const [type, count] of Object.entries(rackPlate.pieces)) {
      const surrounding = occupiedNeighbors.reduce(
        (sum, index) => sum + (board[index]?.pieces[type] || 0),
        0,
      );
      if (surrounding > 0) {
        matchingColors += 1;
        matchingPieces += Math.min(Engine.PLATE_CAPACITY - count, surrounding);
      }
      const needed = Math.max(0, (stage.goals[type] || 0) - (completed[type] || 0));
      if (needed > 0) goalPieces += count;
      if (count + surrounding >= Engine.PLATE_CAPACITY) {
        completionPotential += 1;
        if (needed > 0) goalCompletionPotential += 1;
      }
    }

    return {
      matchingPieces,
      matchingColors,
      completionPotential,
      goalCompletionPotential,
      goalPieces,
      occupiedNeighbors: occupiedNeighbors.length,
    };
  }

  function evaluateCandidate(stage, beforeCompleted, result) {
    const afterCompleted = { ...beforeCompleted };
    const completionTypes = completedTypes(result);
    for (const type of completionTypes) {
      afterCompleted[type] = (afterCompleted[type] || 0) + 1;
    }
    const beforeProgress = goalProgress(stage, beforeCompleted);
    const afterProgress = goalProgress(stage, afterCompleted);
    const progressGain = afterProgress - beforeProgress;
    const clearsStage = Stages.isComplete(stage, afterCompleted);
    const clearBonus = clearsStage ? 1000000 : 0;
    const metrics = boardMetrics(stage, result.board, afterCompleted);
    const goalCompletions = completionTypes.filter((type) =>
      (beforeCompleted[type] || 0) < (stage.goals[type] || 0)
    ).length;
    return {
      completed: afterCompleted,
      completionTypes,
      goalCompletions,
      progressGain,
      clearsStage,
      boardMetrics: metrics,
      plannerScore: clearBonus + progressGain * 100000 + metrics.quality,
    };
  }

  function resolveCandidate(stage, board, rackPlate, cellIndex, completed) {
    const visible = visiblePlacementMetrics(stage, board, rackPlate, cellIndex, completed);
    const placedBoard = Engine.cloneBoard(board);
    placedBoard[cellIndex] = { id: rackPlate.id, pieces: { ...rackPlate.pieces } };
    let result;
    try {
      result = Engine.resolvePlacement(placedBoard, cellIndex);
    } catch (_) {
      return null;
    }
    return { result, visible, ...evaluateCandidate(stage, completed, result) };
  }

  function scoreCandidate(candidate, style) {
    const clearBonus = candidate.clearsStage ? 1000000 : 0;
    if (style === "goal") {
      return clearBonus +
        candidate.progressGain * 165000 +
        candidate.goalCompletions * 18000 +
        candidate.visible.goalCompletionPotential * 6500 +
        candidate.visible.goalPieces * 420 +
        candidate.visible.matchingPieces * 110 +
        candidate.boardMetrics.quality * .2;
    }
    if (style === "space") {
      return clearBonus +
        candidate.progressGain * 42000 +
        candidate.boardMetrics.quality * 5 +
        candidate.boardMetrics.free * 900 +
        candidate.result.emptied.length * 2600 -
        candidate.boardMetrics.mixedPenalty * 650;
    }
    if (style === "instinct") {
      return clearBonus +
        candidate.visible.goalCompletionPotential * 6000 +
        candidate.visible.completionPotential * 2600 +
        candidate.visible.matchingPieces * 950 +
        candidate.visible.matchingColors * 480 +
        candidate.visible.goalPieces * 170 +
        candidate.visible.occupiedNeighbors * 45 +
        (2 - candidate.rackIndex) * 18;
    }
    return candidate.plannerScore;
  }

  function weightedRank(weights, length, random) {
    const usable = weights.slice(0, Math.max(1, length));
    const total = usable.reduce((sum, weight) => sum + weight, 0);
    let cursor = random() * total;
    for (let index = 0; index < usable.length; index += 1) {
      cursor -= usable[index];
      if (cursor < 0) return index;
    }
    return usable.length - 1;
  }

  function instinctRackPool(candidates, skill, random) {
    const rackIndexes = [...new Set(candidates.map((candidate) => candidate.rackIndex))];
    if (rackIndexes.length <= 1) return candidates;
    const rankedRacks = rackIndexes.map((rackIndex) => ({
      rackIndex,
      score: Math.max(...candidates
        .filter((candidate) => candidate.rackIndex === rackIndex)
        .map((candidate) => scoreCandidate(candidate, "instinct"))),
    })).sort((a, b) => b.score - a.score || a.rackIndex - b.rackIndex);
    let selectedRack = rankedRacks[0].rackIndex;
    if (skill === "novice" || (skill === "standard" && random() < .32)) {
      selectedRack = rackIndexes[Math.floor(random() * rackIndexes.length)];
    }
    return candidates.filter((candidate) => candidate.rackIndex === selectedRack);
  }

  function chooseCandidate(candidates, options, random) {
    const style = normalizeStyle(options?.style);
    const skill = normalizeSkill(options?.skill);
    const considered = style === "instinct"
      ? instinctRackPool(candidates, skill, random)
      : candidates;
    const ranked = considered.map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, style),
    })).sort((a, b) =>
      b.score - a.score ||
      a.candidate.rackIndex - b.candidate.rackIndex ||
      a.candidate.cellIndex - b.candidate.cellIndex ||
      a.candidate.order - b.candidate.order
    );

    if (skill === "expert" || ranked.length === 1) return ranked[0].candidate;
    if (skill === "standard") {
      const rank = weightedRank([82, 15, 3], ranked.length, random);
      return ranked[Math.min(rank, ranked.length - 1)].candidate;
    }
    const rank = weightedRank([34, 24, 16, 11, 7, 5, 3], ranked.length, random);
    return ranked[Math.min(rank, ranked.length - 1)].candidate;
  }

  function simulateRun(stage, options = {}) {
    const style = normalizeStyle(options.style);
    const skill = normalizeSkill(options.skill);
    const seed = options.seed ?? stage.seed;
    const supplyRandom = createRandom(seed);
    const decisionRandom = createRandom((seed ^ 0x9E3779B9) >>> 0);
    const playable = playableIndexes(stage);
    let nextId = 1;
    let generated = 0;
    let board = createInitialBoard(stage);
    let rack = [];
    let completed = {};
    let moves = 0;
    const supplyTrace = options.traceSupply ? [] : null;

    function finish(result) {
      return {
        ...result,
        style,
        skill,
        ...(supplyTrace ? { supplyTrace } : {}),
      };
    }

    function generatedPlate() {
      const pieces = generated < stage.openingRack.length
        ? stage.openingRack[generated]
        : Stages.createWeightedPlate(stage, supplyRandom);
      generated += 1;
      const plate = { id: nextId++, pieces: { ...pieces } };
      if (supplyTrace) supplyTrace.push({ ...plate.pieces });
      return plate;
    }

    function refillRack() {
      rack = [0, 1, 2].map(() => generatedPlate());
    }

    refillRack();

    while (moves < stage.moveLimit) {
      if (Stages.isComplete(stage, completed)) {
        return finish({ outcome: "clear", movesUsed: moves, completed, progress: 1 });
      }

      const emptyCells = playable.filter((index) => !board[index]);
      if (!emptyCells.length) {
        return finish({ outcome: "locked", movesUsed: moves, completed, progress: goalProgress(stage, completed) });
      }

      const candidates = [];
      let order = 0;
      for (let rackIndex = 0; rackIndex < rack.length; rackIndex += 1) {
        if (!rack[rackIndex]) continue;
        for (const cellIndex of emptyCells) {
          const candidate = resolveCandidate(stage, board, rack[rackIndex], cellIndex, completed);
          if (candidate) candidates.push({ ...candidate, rackIndex, cellIndex, order: order++ });
        }
      }

      if (!candidates.length) {
        return finish({ outcome: "locked", movesUsed: moves, completed, progress: goalProgress(stage, completed) });
      }

      const chosen = chooseCandidate(candidates, { style, skill }, decisionRandom);
      board = chosen.result.board;
      completed = chosen.completed;
      rack[chosen.rackIndex] = null;
      moves += 1;
      if (rack.every((plate) => !plate)) refillRack();
    }

    const cleared = Stages.isComplete(stage, completed);
    return finish({
      outcome: cleared ? "clear" : "limit",
      movesUsed: moves,
      completed,
      progress: cleared ? 1 : goalProgress(stage, completed),
    });
  }

  function difficultyLabel(clearRate) {
    if (clearRate >= .90) return "쉬움";
    if (clearRate >= .70) return "보통";
    if (clearRate >= .40) return "어려움";
    return "매우 어려움";
  }

  function simulateStage(stage, options = {}) {
    const runs = Math.max(1, Math.min(20000, Math.floor(options.runs || 300)));
    const style = normalizeStyle(options.style);
    const skill = normalizeSkill(options.skill);
    const baseSeed = options.seed ?? stage.seed;
    const outcomes = { clear: 0, limit: 0, locked: 0 };
    const clearMoves = [];
    let totalProgress = 0;

    for (let run = 0; run < runs; run += 1) {
      const result = simulateRun(stage, {
        style,
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
      style,
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

  function simulateStyles(stage, options = {}) {
    const styleCount = PLAYER_STYLE_IDS.length;
    const runs = Math.max(styleCount, Math.min(20000, Math.floor(options.runs || 300)));
    const skill = normalizeSkill(options.skill);
    const baseSeed = options.seed ?? stage.seed;
    const runsPerStyle = Math.floor(runs / styleCount);
    const remainder = runs % styleCount;
    const results = {};

    PLAYER_STYLE_IDS.forEach((style, index) => {
      results[style] = simulateStage(stage, {
        runs: runsPerStyle + (index < remainder ? 1 : 0),
        style,
        skill,
        seed: baseSeed,
      });
    });

    return {
      runs,
      skill,
      styleOrder: [...PLAYER_STYLE_IDS],
      results,
    };
  }

  return {
    PLAYER_STYLES,
    PLAYER_STYLE_IDS,
    SKILL_LEVELS,
    createRandom,
    playableIndexes,
    createInitialBoard,
    goalProgress,
    simulateRun,
    simulateStage,
    simulateStyles,
    difficultyLabel,
  };
});
