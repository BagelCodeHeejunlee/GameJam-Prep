(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./engine.js"),
      require("./stages.js"),
      require("./mechanics.js"),
    );
  } else {
    root.CakeLinkSimulator = factory(root.CakeLinkEngine, root.CakeLinkStages, root.CakeLinkMechanics);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Engine, Stages, Mechanics) {
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
      description: "빈칸과 해제될 칸을 확보하고 혼합 판을 줄이는 수를 우선합니다.",
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
      const { index, ...plateData } = initial;
      board[index] = {
        ...Stages.createPlateData(stage, plateData),
        id: -(position + 1),
      };
    });
    return board;
  }

  function plateCapacity(stage, plate) {
    return Number(plate?.capacity || Stages.stageCapacity(stage));
  }

  function normalPieceEntries(plate) {
    return Object.entries(plate?.pieces || {}).filter(([type, count]) =>
      Stages.COLOR_IDS.includes(type) && count > 0
    );
  }

  function plateTotal(plate) {
    return Object.values(plate?.pieces || {}).reduce((sum, count) => sum + Number(count || 0), 0);
  }

  function completionTypes(result) {
    if (Array.isArray(result?.completionEvents)) {
      return result.completionEvents.map((event) => event.type).filter(Boolean);
    }
    const types = [];
    for (const index of result?.completed || []) {
      const plate = result.settledBoard?.[index];
      const capacity = plateCapacity({ rules: { capacity: Engine.PLATE_CAPACITY } }, plate);
      const type = normalPieceEntries(plate).find(([, count]) => count === capacity)?.[0];
      if (type) types.push(type);
    }
    return types;
  }

  function addCompletions(completed, result) {
    const next = { ...completed };
    for (const type of completionTypes(result)) next[type] = (next[type] || 0) + 1;
    return next;
  }

  function goalProgress(stage, completed, runtime = null) {
    const activeRuntime = runtime || Mechanics.createRuntime(stage);
    return Mechanics.goalProgress(stage, completed || {}, activeRuntime);
  }

  function orderedNeed(stage, runtime, color) {
    const sequence = stage.mechanics?.orderedGoal?.sequence || [];
    if (!sequence.length) return null;
    const index = Number(runtime?.orderIndex || 0);
    if (sequence[index] === color) return 2;
    if (sequence.slice(index + 1, index + 3).includes(color)) return .55;
    return 0;
  }

  function goalNeed(stage, completed, runtime, color) {
    if (["service", "fragile"].includes(stage?.objective?.type)) return 0;
    const ordered = orderedNeed(stage, runtime, color);
    if (ordered !== null) return ordered;
    return Math.max(0, (stage.goals[color] || 0) - (completed[color] || 0));
  }

  function safeLegalIndexes(stage, runtime, board) {
    return Mechanics.legalPlacementIndexes(stage, runtime, board) || [];
  }

  function blockedFeatureCount(runtime = {}) {
    const ice = Object.values(runtime.iceCells || {}).filter((layers) => Number(layers) > 0).length;
    const locked = Array.isArray(runtime.lockedCells)
      ? runtime.lockedCells.length
      : Object.values(runtime.lockedCells || {}).filter(Boolean).length;
    return ice + locked;
  }

  function boardMetrics(stage, board, completed, runtime) {
    let concentration = 0;
    let mixedPenalty = 0;
    let occupied = 0;
    let adjacency = 0;
    let lowerLayerValue = 0;

    for (const index of playableIndexes(stage)) {
      const plate = board[index];
      if (!plate) continue;
      occupied += 1;
      const entries = normalPieceEntries(plate);
      mixedPenalty += Math.max(0, entries.length - 1);
      for (const [type, count] of entries) {
        const needed = goalNeed(stage, completed, runtime, type);
        concentration += count * count * (needed ? 1.45 + Math.min(needed, 2) * .12 : .35);
      }
      for (const layer of plate.layers || []) {
        lowerLayerValue += normalPieceEntries(layer)
          .reduce((sum, [type, count]) => sum + count * (goalNeed(stage, completed, runtime, type) ? 1 : .2), 0);
      }
      for (const neighbor of Engine.getNeighbors(index)) {
        if (neighbor <= index || !board[neighbor]) continue;
        for (const [type, count] of entries) {
          adjacency += Math.min(count, board[neighbor].pieces[type] || 0);
        }
      }
    }

    const free = safeLegalIndexes(stage, runtime, board).length;
    const congestionPenalty = free <= 1 ? 180 : free === 2 ? 60 : 0;
    return {
      concentration,
      mixedPenalty,
      occupied,
      adjacency,
      free,
      blocked: blockedFeatureCount(runtime),
      lowerLayerValue,
      congestionPenalty,
      quality: concentration * 4 + adjacency * 7 + free * 12 + lowerLayerValue * 1.5 - mixedPenalty * 9 - congestionPenalty,
    };
  }

  function visiblePlacementMetrics(stage, board, rackPlate, cellIndex, completed, runtime) {
    const occupiedNeighbors = Engine.getNeighbors(cellIndex).filter((index) => board[index]);
    const capacity = plateCapacity(stage, rackPlate);
    const rainbow = Number(rackPlate.pieces?.rainbow || 0);
    const mystery = Number(rackPlate.pieces?.mystery || 0);
    let matchingPieces = 0;
    let matchingColors = 0;
    let completionPotential = 0;
    let goalCompletionPotential = 0;
    let goalPieces = 0;
    let coloredPlateFit = 0;
    let servicePlateFit = 0;
    let fragilePlateFit = 0;

    const serviceIndexes = new Set((stage.mechanics?.serviceCells || []).map((entry) =>
      Number(Number.isInteger(entry) ? entry : entry?.index)
    ));
    const fragileIndexes = new Set((stage.mechanics?.fragileCells || []).map((entry) =>
      Number(Number.isInteger(entry) ? entry : entry?.index)
    ));

    for (const [type, count] of normalPieceEntries(rackPlate)) {
      const surrounding = occupiedNeighbors.reduce(
        (sum, index) => sum + (board[index]?.pieces[type] || 0),
        0,
      );
      if (surrounding > 0) {
        matchingColors += 1;
        matchingPieces += Math.min(capacity - count, surrounding);
      }
      const needed = goalNeed(stage, completed, runtime, type);
      if (needed > 0) goalPieces += count * Math.min(needed, 2);
      if (count + surrounding + rainbow >= capacity) {
        completionPotential += 1;
        if (needed > 0) goalCompletionPotential += 1;
      }
      if (serviceIndexes.has(cellIndex) && !runtime?.servedCells?.[cellIndex]) {
        servicePlateFit += Math.min(capacity, count + surrounding + rainbow);
      }
      for (const neighbor of occupiedNeighbors) {
        if (board[neighbor]?.allowedColor === type) coloredPlateFit += count;
        if (serviceIndexes.has(neighbor) && !runtime?.servedCells?.[neighbor]) {
          servicePlateFit += Math.min(count, Math.max(0, capacity - Number(board[neighbor]?.pieces?.[type] || 0)));
        }
        if (fragileIndexes.has(neighbor) && !runtime?.brokenCells?.[neighbor]) {
          fragilePlateFit += Math.min(count, Math.max(0, capacity - Number(board[neighbor]?.pieces?.[type] || 0)));
        }
      }
    }

    return {
      matchingPieces,
      matchingColors,
      completionPotential,
      goalCompletionPotential,
      goalPieces,
      occupiedNeighbors: occupiedNeighbors.length,
      coloredPlateFit,
      servicePlateFit,
      fragilePlateFit,
      rainbow,
      mystery,
    };
  }

  function finiteDistance(value) {
    return Number.isFinite(value) ? value : 100;
  }

  function specialEventValue(result) {
    let value = 0;
    for (const event of result?.specialEvents || []) {
      const type = `${event.kind || ""} ${event.type || ""}`.toLowerCase();
      if (type.includes("unlock") || type.includes("ice")) value += 1;
      if (type.includes("layer")) value += 1.2;
      if (type.includes("coloredplatecollected")) value += 4;
      if (type.includes("orderserved") || type.includes("service")) value += 4;
      if (type.includes("fragile") || type.includes("break")) value += 4;
      if (type.includes("frog") && (event.reached || type.includes("goal"))) value += 4;
    }
    return value;
  }

  function coloredPlateCollectionCount(stage, runtime) {
    const collected = runtime?.collectedColoredPlates || {};
    return Object.entries(stage?.objective?.targets || {}).reduce((total, [type, target]) =>
      total + Math.min(Math.max(0, Number(target) || 0), Math.max(0, Number(collected[type]) || 0)), 0
    );
  }

  function evaluateCandidate(stage, beforeCompleted, beforeRuntime, beforeBoard, result) {
    const afterCompleted = addCompletions(beforeCompleted, result);
    const beforeProgress = goalProgress(stage, beforeCompleted, beforeRuntime);
    const afterProgress = goalProgress(stage, afterCompleted, result.runtime);
    const progressGain = afterProgress - beforeProgress;
    const clearsStage = Mechanics.isStageComplete(stage, afterCompleted, result.runtime);
    const clearBonus = clearsStage ? 1000000 : 0;
    const metrics = boardMetrics(stage, result.board, afterCompleted, result.runtime);
    const types = completionTypes(result);
    const goalCompletions = types.filter((type) => goalNeed(stage, beforeCompleted, beforeRuntime, type) > 0).length;
    const beforeFrog = finiteDistance(Mechanics.frogDistance(stage, beforeRuntime, beforeBoard));
    const afterFrog = finiteDistance(Mechanics.frogDistance(stage, result.runtime, result.board));
    const frogGain = beforeFrog - afterFrog;
    const openedCells = Math.max(0, blockedFeatureCount(beforeRuntime) - blockedFeatureCount(result.runtime));
    const serviceGain = Math.max(
      0,
      (Number(result.runtime?.servedCount) || 0) - (Number(beforeRuntime?.servedCount) || 0),
    );
    const fragileBreakGain = Math.max(
      0,
      (Number(result.runtime?.fragileBrokenCount) || 0) - (Number(beforeRuntime?.fragileBrokenCount) || 0),
    );
    const coloredPlateCollectionGain = Math.max(
      0,
      coloredPlateCollectionCount(stage, result.runtime) - coloredPlateCollectionCount(stage, beforeRuntime),
    );
    const specialValue = specialEventValue(result);
    return {
      completed: afterCompleted,
      completionTypes: types,
      goalCompletions,
      progressGain,
      clearsStage,
      boardMetrics: metrics,
      frogGain,
      openedCells,
      serviceGain,
      fragileBreakGain,
      coloredPlateCollectionGain,
      specialValue,
      plannerScore: clearBonus + progressGain * 100000 + frogGain * 5200 + openedCells * 4600 + serviceGain * 12000 + coloredPlateCollectionGain * 12000 + specialValue * 1100 + metrics.quality,
    };
  }

  function hasMystery(plate) {
    return Number(plate?.pieces?.mystery || 0) > 0;
  }

  function visibleUnknownCandidate(stage, runtime, board, rackPlate, cellIndex, completed, visible) {
    const projectedBoard = Engine.cloneBoard(board);
    projectedBoard[cellIndex] = {
      ...rackPlate,
      pieces: { ...rackPlate.pieces },
      hiddenColors: undefined,
    };
    const metrics = boardMetrics(stage, projectedBoard, completed, runtime);
    const heuristic =
      visible.goalCompletionPotential * 6400 +
      visible.goalPieces * 390 +
      visible.matchingPieces * 150 +
      visible.coloredPlateFit * 300 +
      visible.servicePlateFit * 520 +
      visible.fragilePlateFit * 520 +
      visible.mystery * 90 +
      metrics.quality;
    return {
      result: null,
      uncertain: true,
      completed: { ...completed },
      completionTypes: [],
      goalCompletions: 0,
      progressGain: 0,
      clearsStage: false,
      boardMetrics: metrics,
      frogGain: 0,
      openedCells: 0,
      serviceGain: 0,
      fragileBreakGain: 0,
      coloredPlateCollectionGain: 0,
      specialValue: 0,
      plannerScore: heuristic,
    };
  }

  function resolveCandidate(stage, runtime, board, rackPlate, cellIndex, completed) {
    const visible = visiblePlacementMetrics(stage, board, rackPlate, cellIndex, completed, runtime);
    if (hasMystery(rackPlate)) {
      return { visible, ...visibleUnknownCandidate(stage, runtime, board, rackPlate, cellIndex, completed, visible) };
    }
    const placedBoard = Engine.cloneBoard(board);
    placedBoard[cellIndex] = Stages.createPlateData(stage, rackPlate);
    let result;
    try {
      result = Mechanics.resolveTurn(stage, Mechanics.cloneRuntime(runtime), placedBoard, cellIndex);
    } catch (_) {
      return null;
    }
    return {
      result,
      visible,
      uncertain: false,
      ...evaluateCandidate(stage, completed, runtime, board, result),
    };
  }

  function scoreCandidate(candidate, style) {
    const clearBonus = candidate.clearsStage ? 1000000 : 0;
    const mechanicScore = candidate.frogGain * 5600 + candidate.openedCells * 4200 + candidate.serviceGain * 12000 + candidate.fragileBreakGain * 12000 + candidate.coloredPlateCollectionGain * 12000 + candidate.specialValue * 900;
    if (style === "goal") {
      return clearBonus +
        candidate.progressGain * 165000 +
        candidate.goalCompletions * 18000 +
        candidate.visible.goalCompletionPotential * 6500 +
        candidate.visible.goalPieces * 420 +
        candidate.visible.matchingPieces * 110 +
        candidate.visible.coloredPlateFit * 450 +
        candidate.visible.servicePlateFit * 650 +
        candidate.visible.fragilePlateFit * 650 +
        mechanicScore +
        candidate.boardMetrics.quality * .2;
    }
    if (style === "space") {
      return clearBonus +
        candidate.progressGain * 42000 +
        candidate.boardMetrics.quality * 5 +
        candidate.boardMetrics.free * 900 +
        (candidate.result?.emptied?.length || 0) * 2600 +
        candidate.openedCells * 7200 +
        candidate.serviceGain * 8500 +
        candidate.fragileBreakGain * 8500 +
        candidate.coloredPlateCollectionGain * 8500 +
        candidate.frogGain * 2600 -
        candidate.boardMetrics.mixedPenalty * 650;
    }
    if (style === "instinct") {
      return clearBonus +
        candidate.visible.goalCompletionPotential * 6000 +
        candidate.visible.completionPotential * 2600 +
        candidate.visible.matchingPieces * 950 +
        candidate.visible.matchingColors * 480 +
        candidate.visible.goalPieces * 170 +
        candidate.visible.coloredPlateFit * 600 +
        candidate.visible.servicePlateFit * 700 +
        candidate.visible.fragilePlateFit * 700 +
        candidate.visible.occupiedNeighbors * 45 +
        candidate.frogGain * 1200 +
        candidate.openedCells * 1400 +
        candidate.coloredPlateCollectionGain * 6500 +
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
    const considered = style === "instinct" ? instinctRackPool(candidates, skill, random) : candidates;
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

  function visibleSupply(plate) {
    return { ...plate.pieces };
  }

  function simulateRun(stage, options = {}) {
    const style = normalizeStyle(options.style);
    const skill = normalizeSkill(options.skill);
    const seed = options.seed ?? stage.seed;
    const supplyRandom = createRandom(seed);
    const decisionRandom = createRandom((seed ^ 0x9E3779B9) >>> 0);
    let nextId = 1;
    let generated = 0;
    let board = createInitialBoard(stage);
    let runtime = Mechanics.createRuntime(stage);
    let rack = [];
    let completed = {};
    let moves = 0;
    const supplyTrace = options.traceSupply ? [] : null;
    const decisionTrace = options.traceDecisions ? [] : null;

    function finish(result) {
      return {
        ...result,
        style,
        skill,
        ...(supplyTrace ? { supplyTrace } : {}),
        ...(decisionTrace ? { decisionTrace } : {}),
      };
    }

    function generatedPlate() {
      const plate = Stages.createOpeningPlateData(stage, generated, supplyRandom);
      generated += 1;
      plate.id = nextId++;
      if (supplyTrace) supplyTrace.push(visibleSupply(plate));
      return plate;
    }

    function refillRack() {
      rack = [0, 1, 2].map(() => generatedPlate());
    }

    refillRack();

    while (moves < stage.moveLimit) {
      if (Mechanics.isStageComplete(stage, completed, runtime)) {
        return finish({ outcome: "clear", movesUsed: moves, completed, progress: 1 });
      }

      const emptyCells = safeLegalIndexes(stage, runtime, board);
      if (!emptyCells.length) {
        return finish({ outcome: "locked", movesUsed: moves, completed, progress: goalProgress(stage, completed, runtime) });
      }

      const candidates = [];
      let order = 0;
      for (let rackIndex = 0; rackIndex < rack.length; rackIndex += 1) {
        if (!rack[rackIndex]) continue;
        for (const cellIndex of emptyCells) {
          const candidate = resolveCandidate(stage, runtime, board, rack[rackIndex], cellIndex, completed);
          if (candidate) candidates.push({ ...candidate, rackIndex, cellIndex, order: order++ });
        }
      }

      if (!candidates.length) {
        return finish({ outcome: "locked", movesUsed: moves, completed, progress: goalProgress(stage, completed, runtime) });
      }

      const chosen = chooseCandidate(candidates, { style, skill }, decisionRandom);
      if (decisionTrace) {
        decisionTrace.push({
          rackIndex: chosen.rackIndex,
          cellIndex: chosen.cellIndex,
          mystery: hasMystery(rack[chosen.rackIndex]),
        });
      }

      let result = chosen.result;
      if (chosen.uncertain) {
        const revealed = Mechanics.revealPlate(rack[chosen.rackIndex]);
        const placedBoard = Engine.cloneBoard(board);
        placedBoard[chosen.cellIndex] = revealed.plate;
        try {
          result = Mechanics.resolveTurn(stage, Mechanics.cloneRuntime(runtime), placedBoard, chosen.cellIndex);
        } catch (_) {
          return finish({ outcome: "locked", movesUsed: moves, completed, progress: goalProgress(stage, completed, runtime) });
        }
      }

      board = result.board;
      runtime = result.runtime;
      completed = addCompletions(completed, result);
      rack[chosen.rackIndex] = null;
      moves += 1;
      if (rack.every((plate) => !plate) && !Mechanics.isStageComplete(stage, completed, runtime)) refillRack();
    }

    const cleared = Mechanics.isStageComplete(stage, completed, runtime);
    return finish({
      outcome: cleared ? "clear" : "limit",
      movesUsed: moves,
      completed,
      progress: cleared ? 1 : goalProgress(stage, completed, runtime),
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

    return { runs, skill, styleOrder: [...PLAYER_STYLE_IDS], results };
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
