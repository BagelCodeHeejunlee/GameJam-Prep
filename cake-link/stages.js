(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CakeLinkStages = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const COLOR_IDS = Object.freeze(["berry", "blueberry", "lemon", "matcha", "choco"]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function cloneData(value) {
    if (Array.isArray(value)) return value.map(cloneData);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneData(item)]));
    }
    return value;
  }

  function freezeStage(source) {
    const stage = {
      ...source,
      gimmick: source.gimmick || null,
      rules: { capacity: 6, ...(source.rules || {}) },
      mechanics: cloneData(source.mechanics || {}),
      openingModifiers: cloneData(
        source.openingModifiers || source.openingRack.map(() => ({})),
      ),
    };
    return deepFreeze(stage);
  }

  // Board masks are four rows. 1 = playable cell, 0 = blocked cell.
  // Pattern letters mean different colors on the same plate. For example,
  // a2b1 contains two pieces of one color and one piece of another color.
  const STAGES = Object.freeze({
    1: freezeStage({
      id: 1,
      title: "스테이지 1",
      difficulty: "쉬움",
      seed: 4416,
      moveLimit: 16,
      goals: { berry: 3 },
      colors: ["berry", "lemon"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 2 } },
        { index: 10, pieces: { berry: 2 } },
      ],
      openingRack: [
        { berry: 3 }, { berry: 2, lemon: 1 }, { berry: 3 },
      ],
      colorWeights: { berry: 68, lemon: 32 },
      platePatternWeights: { a3: 35, a2b1: 30, a2: 20, a1b1: 15 },
      nextStageId: 2,
    }),
    2: freezeStage({
      id: 2,
      title: "스테이지 2",
      difficulty: "쉬움",
      seed: 7821,
      moveLimit: 21,
      goals: { berry: 3, lemon: 3 },
      colors: ["berry", "lemon", "matcha"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 2 } },
        { index: 10, pieces: { lemon: 2 } },
      ],
      openingRack: [
        { berry: 3 }, { lemon: 3 }, { berry: 2, lemon: 1 },
      ],
      colorWeights: { berry: 42, lemon: 40, matcha: 18 },
      platePatternWeights: { a3: 28, a2b1: 32, a2b2: 15, a1b1c1: 10, a2: 15 },
      nextStageId: 3,
    }),
    3: freezeStage({
      id: 3,
      title: "스테이지 3",
      difficulty: "쉬움",
      seed: 3197,
      moveLimit: 25,
      goals: { matcha: 3, lemon: 3 },
      colors: ["matcha", "lemon", "berry", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { matcha: 2, berry: 1 } },
        { index: 10, pieces: { lemon: 2, choco: 1 } },
      ],
      openingRack: [
        { matcha: 3 }, { lemon: 3 }, { matcha: 2, lemon: 1 },
      ],
      colorWeights: { matcha: 36, lemon: 34, berry: 18, choco: 12 },
      platePatternWeights: { a3: 22, a2b1: 30, a2b2: 18, a1b1c1: 20, a2: 10 },
      nextStageId: 4,
    }),
    4: freezeStage({
      id: 4,
      title: "스테이지 4",
      difficulty: "보통",
      seed: 6154,
      moveLimit: 25,
      goals: { berry: 2, matcha: 2, choco: 2 },
      colors: ["berry", "matcha", "choco", "lemon", "blueberry"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 1, matcha: 1, choco: 1 } },
        { index: 10, pieces: { lemon: 2, blueberry: 1 } },
      ],
      openingRack: [
        { berry: 3 }, { matcha: 3 }, { choco: 3 },
      ],
      colorWeights: { berry: 26, matcha: 25, choco: 24, lemon: 15, blueberry: 10 },
      platePatternWeights: { a3: 16, a2b1: 26, a2b2: 20, a1b1c1: 23, a2b1c1: 15 },
      nextStageId: 5,
    }),
    5: freezeStage({
      id: 5,
      title: "스테이지 5",
      difficulty: "보통",
      seed: 9538,
      moveLimit: 28,
      goals: { berry: 3, lemon: 3, blueberry: 2 },
      colors: ["berry", "lemon", "blueberry", "matcha", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 2, blueberry: 1 } },
        { index: 6, pieces: { lemon: 2, matcha: 1 } },
        { index: 9, pieces: { blueberry: 2, choco: 1 } },
      ],
      openingRack: [
        { berry: 3 }, { lemon: 3 }, { blueberry: 2, berry: 1 },
      ],
      colorWeights: { berry: 30, lemon: 28, blueberry: 22, matcha: 12, choco: 8 },
      platePatternWeights: { a3: 12, a2b1: 24, a2b2: 22, a1b1c1: 22, a2b1c1: 20 },
      nextStageId: 6,
    }),
    6: freezeStage({
      id: 6,
      title: "스테이지 6",
      difficulty: "보통",
      seed: 2673,
      moveLimit: 28,
      goals: { matcha: 3, choco: 3, blueberry: 3 },
      colors: ["matcha", "choco", "blueberry", "berry", "lemon"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 0, pieces: { lemon: 2, choco: 1 } },
        { index: 5, pieces: { matcha: 2, choco: 1 } },
        { index: 10, pieces: { blueberry: 2, berry: 1 } },
      ],
      openingRack: [
        { matcha: 3 }, { choco: 3 }, { blueberry: 3 },
      ],
      colorWeights: { matcha: 29, choco: 27, blueberry: 25, berry: 11, lemon: 8 },
      platePatternWeights: { a3: 8, a2b1: 22, a2b2: 24, a1b1c1: 20, a2b1c1: 16, a2b2c1: 10 },
      nextStageId: 7,
    }),
    7: freezeStage({
      id: 7,
      title: "스테이지 7",
      difficulty: "보통",
      seed: 8249,
      moveLimit: 36,
      goals: { berry: 3, matcha: 3, lemon: 3, choco: 2, blueberry: 2 },
      colors: ["berry", "matcha", "lemon", "choco", "blueberry"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 2, matcha: 1 } },
        { index: 6, pieces: { lemon: 2, blueberry: 1 } },
        { index: 9, pieces: { choco: 3, berry: 1 } },
        { index: 10, pieces: { matcha: 2, lemon: 1 } },
      ],
      openingRack: [
        { berry: 3 }, { matcha: 3 }, { lemon: 2, choco: 1 },
      ],
      colorWeights: { berry: 23, matcha: 23, lemon: 23, choco: 16, blueberry: 15 },
      platePatternWeights: { a3: 6, a2b1: 18, a2b2: 24, a1b1c1: 20, a2b1c1: 18, a2b2c1: 14 },
      nextStageId: 8,
    }),
    8: freezeStage({
      id: 8,
      title: "스테이지 8",
      difficulty: "보통",
      seed: 8137,
      moveLimit: 23,
      goals: { berry: 3, lemon: 3, matcha: 2 },
      colors: ["berry", "lemon", "matcha", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        {
          index: 5,
          pieces: { berry: 2 },
          kind: "colored",
          allowedColor: "berry",
        },
        {
          index: 10,
          pieces: { lemon: 2 },
          kind: "colored",
          allowedColor: "lemon",
        },
        { index: 6, pieces: { matcha: 2 } },
      ],
      openingRack: [{ berry: 3 }, { lemon: 3 }, { matcha: 3 }],
      colorWeights: { berry: 34, lemon: 31, matcha: 25, choco: 10 },
      platePatternWeights: { a3: 22, a2b1: 34, a2b2: 20, a1b1c1: 14, a2: 10 },
      gimmick: { id: "colored", label: "색깔 접시", icon: "●" },
      nextStageId: 9,
    }),
    9: freezeStage({
      id: 9,
      title: "스테이지 9",
      difficulty: "보통",
      seed: 9241,
      moveLimit: 22,
      goals: { berry: 3, lemon: 3, matcha: 2 },
      colors: ["berry", "lemon", "matcha", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 1, pieces: { berry: 3 } },
        { index: 4, pieces: { berry: 2 } },
        { index: 11, pieces: { lemon: 3 } },
        { index: 14, pieces: { lemon: 2 } },
      ],
      openingRack: [{ berry: 3 }, { lemon: 3 }, { matcha: 3 }],
      colorWeights: { berry: 35, lemon: 32, matcha: 23, choco: 10 },
      platePatternWeights: { a3: 22, a2b1: 33, a2b2: 20, a1b1c1: 15, a2: 10 },
      gimmick: { id: "ice", label: "얼음 판", icon: "❄️" },
      mechanics: {
        iceCells: [{ index: 5, layers: 1 }, { index: 10, layers: 1 }],
      },
      nextStageId: 10,
    }),
    10: freezeStage({
      id: 10,
      title: "스테이지 10",
      difficulty: "보통",
      seed: 10429,
      moveLimit: 14,
      goals: { berry: 2 },
      colors: ["berry", "lemon", "matcha", "choco"],
      boardMask: ["1111", "0111", "0111", "0111"],
      initialPlates: [
        { index: 1, pieces: { berry: 3 } },
        { index: 2, pieces: { lemon: 3 } },
        { index: 7, pieces: { choco: 3 } },
      ],
      openingRack: [{ berry: 3 }, { lemon: 3 }, { matcha: 3 }],
      colorWeights: { berry: 29, lemon: 28, matcha: 18, choco: 25 },
      platePatternWeights: { a3: 28, a2b1: 32, a2b2: 18, a1b1c1: 12, a2: 10 },
      gimmick: { id: "frog", label: "개구리", icon: "🐸" },
      objective: { type: "frog", frogId: "main" },
      mechanics: {
        frog: { id: "main", startIndex: 0, goalIndex: 15, tieOrder: "URDL" },
      },
      nextStageId: 11,
    }),
    11: freezeStage({
      id: 11,
      title: "스테이지 11",
      difficulty: "보통",
      seed: 11587,
      moveLimit: 25,
      goals: { berry: 3, lemon: 3, matcha: 2 },
      colors: ["berry", "lemon", "matcha", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 2 } },
        { index: 10, pieces: { lemon: 2 } },
        { index: 6, pieces: { matcha: 2 } },
      ],
      openingRack: [{ berry: 2 }, { lemon: 2 }, { matcha: 2 }],
      openingModifiers: [
        { hiddenColors: ["berry"] },
        { hiddenColors: ["lemon"] },
        { hiddenColors: ["matcha"] },
      ],
      colorWeights: { berry: 34, lemon: 31, matcha: 25, choco: 10 },
      platePatternWeights: { a3: 18, a2b1: 32, a2b2: 22, a1b1c1: 18, a2: 10 },
      gimmick: { id: "mystery", label: "미스테리 조각", icon: "❔" },
      mechanics: {
        mystery: { plateChance: 30, countWeights: { 1: 80, 2: 20 }, reveal: "onPlace" },
      },
      nextStageId: 12,
    }),
    12: freezeStage({
      id: 12,
      title: "스테이지 12",
      difficulty: "보통",
      seed: 12763,
      moveLimit: 23,
      goals: { berry: 3, lemon: 3, matcha: 2 },
      colors: ["berry", "lemon", "matcha", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 4 } },
        { index: 10, pieces: { lemon: 4 } },
        { index: 6, pieces: { matcha: 3 } },
      ],
      openingRack: [{ berry: 4 }, { lemon: 4 }, { matcha: 4 }],
      colorWeights: { berry: 34, lemon: 31, matcha: 25, choco: 10 },
      platePatternWeights: { a4: 24, a3b1: 28, a2b2: 22, a3: 12, a2b1c1: 14 },
      gimmick: { id: "capacity8", label: "8조각 케이크", icon: "8" },
      rules: { capacity: 8 },
      nextStageId: 13,
    }),
    13: freezeStage({
      id: 13,
      title: "스테이지 13",
      difficulty: "보통",
      seed: 13903,
      moveLimit: 29,
      goals: { berry: 3, lemon: 3, matcha: 3 },
      colors: ["berry", "lemon", "matcha", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 1, pieces: { berry: 3 } },
        { index: 4, pieces: { berry: 2 } },
        { index: 11, pieces: { lemon: 3 } },
        { index: 14, pieces: { lemon: 2 } },
      ],
      openingRack: [{ berry: 3 }, { lemon: 3 }, { matcha: 3 }],
      colorWeights: { berry: 33, lemon: 31, matcha: 26, choco: 10 },
      platePatternWeights: { a3: 20, a2b1: 32, a2b2: 22, a1b1c1: 16, a2: 10 },
      gimmick: { id: "locks", label: "열쇠와 잠긴 칸", icon: "🔐" },
      mechanics: {
        locks: [
          { index: 5, keyId: "berry-key", color: "berry", count: 1 },
          { index: 9, keyId: "berry-key", color: "berry", count: 1 },
          { index: 6, keyId: "lemon-key", color: "lemon", count: 1 },
          { index: 10, keyId: "lemon-key", color: "lemon", count: 1 },
        ],
      },
      nextStageId: 14,
    }),
    14: freezeStage({
      id: 14,
      title: "스테이지 14",
      difficulty: "보통",
      seed: 14293,
      moveLimit: 22,
      goals: { berry: 3, lemon: 2, matcha: 2 },
      colors: ["berry", "lemon", "matcha", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 2 } },
        { index: 6, pieces: { lemon: 2 } },
        { index: 10, pieces: { matcha: 2 } },
      ],
      openingRack: [{ berry: 3 }, { lemon: 3 }, { matcha: 3 }],
      colorWeights: { berry: 34, lemon: 29, matcha: 27, choco: 10 },
      platePatternWeights: { a3: 20, a2b1: 32, a2b2: 22, a1b1c1: 16, a2: 10 },
      gimmick: { id: "ordered", label: "순서 목표", icon: "1→2" },
      objective: { type: "ordered" },
      mechanics: {
        orderedGoal: {
          sequence: ["berry", "lemon", "matcha", "berry", "lemon", "matcha", "berry"],
          wrongCompletion: "ignore",
        },
      },
      nextStageId: 15,
    }),
    15: freezeStage({
      id: 15,
      title: "스테이지 15",
      difficulty: "보통",
      seed: 15817,
      moveLimit: 27,
      goals: { berry: 4, lemon: 3, matcha: 3 },
      colors: ["berry", "lemon", "matcha", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 2 } },
        { index: 6, pieces: { lemon: 2 } },
        { index: 10, pieces: { matcha: 2 } },
      ],
      openingRack: [{ berry: 4 }, { lemon: 5 }, { matcha: 4 }],
      openingModifiers: [{ rainbow: 2 }, { rainbow: 1 }, { rainbow: 1 }],
      colorWeights: { berry: 36, lemon: 28, matcha: 26, choco: 10 },
      platePatternWeights: { a3: 18, a2b1: 30, a2b2: 24, a1b1c1: 18, a2: 10 },
      gimmick: { id: "rainbow", label: "무지개 조각", icon: "🌈" },
      mechanics: {
        rainbow: { plateChance: 24, countWeights: { 1: 85, 2: 15 }, allocation: "minimumDeficit" },
      },
      nextStageId: 16,
    }),
    16: freezeStage({
      id: 16,
      title: "스테이지 16",
      difficulty: "보통",
      seed: 16381,
      moveLimit: 30,
      goals: { berry: 3, lemon: 3, matcha: 3 },
      colors: ["berry", "lemon", "matcha", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 2 } },
        { index: 6, pieces: { lemon: 2 } },
        { index: 9, pieces: { matcha: 2 } },
      ],
      openingRack: [{ berry: 3 }, { lemon: 3 }, { matcha: 3 }],
      colorWeights: { berry: 33, lemon: 31, matcha: 26, choco: 10 },
      platePatternWeights: { a3: 18, a2b1: 30, a2b2: 24, a1b1c1: 18, a2: 10 },
      gimmick: { id: "fragile", label: "깨지는 받침대", icon: "◇" },
      mechanics: {
        fragileCells: [
          { index: 5, uses: 1 },
          { index: 6, uses: 1 },
          { index: 9, uses: 1 },
          { index: 10, uses: 1 },
        ],
      },
      nextStageId: 17,
    }),
    17: freezeStage({
      id: 17,
      title: "스테이지 17",
      difficulty: "보통",
      seed: 17749,
      moveLimit: 28,
      goals: { berry: 3, lemon: 3, matcha: 3, choco: 2 },
      colors: ["berry", "lemon", "matcha", "choco"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        {
          index: 5,
          kind: "layered",
          pieces: { berry: 3 },
          receiveOnly: true,
          layers: [{ pieces: { lemon: 3 } }],
        },
        {
          index: 10,
          kind: "layered",
          pieces: { matcha: 3 },
          receiveOnly: true,
          layers: [{ pieces: { choco: 3 } }],
        },
        { index: 6, pieces: { lemon: 2 } },
      ],
      openingRack: [{ berry: 3 }, { matcha: 3 }, { lemon: 3 }],
      colorWeights: { berry: 29, lemon: 27, matcha: 27, choco: 17 },
      platePatternWeights: { a3: 16, a2b1: 30, a2b2: 24, a1b1c1: 18, a2: 12 },
      gimmick: { id: "layered", label: "이층 케이크", icon: "Ⅱ" },
      nextStageId: null,
    }),
  });

  function getStage(stageId) {
    return STAGES[stageId] || STAGES[1];
  }

  function goalEntries(stage) {
    return Object.entries(stage.goals);
  }

  function isComplete(stage, completedByType = {}) {
    if (stage.objective?.type === "frog") {
      return Boolean(completedByType.frogReached || completedByType._frogReached) &&
        goalEntries(stage).every(([type, target]) => (completedByType[type] || 0) >= target);
    }
    const sequence = stage.mechanics?.orderedGoal?.sequence;
    if (stage.objective?.type === "ordered" && sequence?.length) {
      return Number(completedByType.orderIndex ?? completedByType._orderIndex ?? 0) >= sequence.length;
    }
    return goalEntries(stage).every(([type, target]) => (completedByType[type] || 0) >= target);
  }

  function totalGoalCount(stage) {
    if (stage.objective?.type === "frog") {
      return 1 + goalEntries(stage).reduce((sum, [, target]) => sum + target, 0);
    }
    if (stage.objective?.type === "ordered") {
      return stage.mechanics?.orderedGoal?.sequence?.length || 0;
    }
    return goalEntries(stage).reduce((sum, [, target]) => sum + target, 0);
  }

  function weightedPick(weights, random = Math.random) {
    const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let cursor = random() * total;
    for (const [value, weight] of entries) {
      cursor -= weight;
      if (cursor < 0) return value;
    }
    return entries.at(-1)?.[0] || null;
  }

  function parsePlatePattern(pattern) {
    const pieces = {};
    for (const match of pattern.matchAll(/([a-z])(\d+)/g)) {
      pieces[match[1]] = Number(match[2]);
    }
    return pieces;
  }

  function createWeightedPlate(stage, random = Math.random) {
    const pattern = weightedPick(stage.platePatternWeights, random);
    const letterCounts = parsePlatePattern(pattern);
    const availableWeights = { ...stage.colorWeights };
    const letterColors = {};

    for (const letter of Object.keys(letterCounts)) {
      const color = weightedPick(availableWeights, random);
      if (!color) throw new Error(`${stage.title}: ${pattern} 패턴에 배정할 색깔이 부족합니다.`);
      letterColors[letter] = color;
      delete availableWeights[color];
    }

    const plate = {};
    for (const [letter, count] of Object.entries(letterCounts)) {
      plate[letterColors[letter]] = count;
    }
    return plate;
  }

  function stageCapacity(stage) {
    const capacity = Number(stage?.rules?.capacity);
    return Number.isInteger(capacity) && capacity > 0 ? capacity : 6;
  }

  function createPlateData(stageOrPieces, piecesOrModifiers = {}, modifiersOrRandom = {}, maybeRandom = Math.random) {
    const hasStage = Boolean(stageOrPieces?.boardMask && stageOrPieces?.colorWeights);
    const stage = hasStage ? stageOrPieces : null;
    const pieces = hasStage ? piecesOrModifiers : stageOrPieces;
    const modifiers = hasStage ? (modifiersOrRandom || {}) : (piecesOrModifiers || {});
    const random = hasStage && typeof maybeRandom === "function" ? maybeRandom : Math.random;
    const source = pieces?.pieces ? pieces : { pieces: pieces || {} };
    const plate = {
      ...cloneData(source),
      ...cloneData(modifiers),
      pieces: { ...(source.pieces || {}) },
      capacity: Number(modifiers.capacity || source.capacity || (stage ? stageCapacity(stage) : 6)),
    };
    let hiddenColors = cloneData(modifiers.hiddenColors ?? source.hiddenColors ?? []);
    const mysteryCount = Math.max(0, Math.floor(Number(modifiers.mystery || 0)));
    if (!hiddenColors.length && mysteryCount && stage) {
      hiddenColors = Array.from({ length: mysteryCount }, () => weightedPick(stage.colorWeights, random));
    }
    if (hiddenColors.length) {
      plate.hiddenColors = hiddenColors;
      plate.pieces.mystery = hiddenColors.length;
    } else {
      delete plate.hiddenColors;
      delete plate.pieces.mystery;
    }
    const rainbow = Number(modifiers.rainbow ?? source.rainbow ?? source.pieces?.rainbow ?? 0);
    if (rainbow > 0) plate.pieces.rainbow = Math.floor(rainbow);
    else delete plate.pieces.rainbow;
    delete plate.rainbow;
    return plate;
  }

  function takeRandomSlices(pieces, requested, random) {
    const selected = [];
    for (let count = 0; count < requested; count += 1) {
      const entries = Object.entries(pieces).filter(([type, amount]) =>
        COLOR_IDS.includes(type) && amount > 0
      );
      const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
      if (!total) break;
      let cursor = random() * total;
      let selectedType = entries.at(-1)[0];
      for (const [type, amount] of entries) {
        cursor -= amount;
        if (cursor < 0) {
          selectedType = type;
          break;
        }
      }
      pieces[selectedType] -= 1;
      if (!pieces[selectedType]) delete pieces[selectedType];
      selected.push(selectedType);
    }
    return selected;
  }

  function createWeightedPlateData(stage, random = Math.random) {
    const pieces = createWeightedPlate(stage, random);
    const capacity = stageCapacity(stage);
    const mystery = stage.mechanics?.mystery;
    const rainbow = stage.mechanics?.rainbow;
    const special = mystery || rainbow;
    const plate = createPlateData(stage, pieces, { capacity }, random);
    if (!special || random() * 100 >= Number(special.plateChance || 0)) return plate;

    const requested = Math.max(1, Number(weightedPick(special.countWeights || { 1: 100 }, random)) || 1);
    const selected = takeRandomSlices(plate.pieces, requested, random);
    if (!selected.length) return plate;
    if (mystery) {
      plate.hiddenColors = selected;
      plate.pieces.mystery = selected.length;
    } else {
      plate.pieces.rainbow = selected.length;
    }
    return plate;
  }

  return {
    COLOR_IDS,
    STAGES,
    deepFreeze,
    getStage,
    goalEntries,
    isComplete,
    totalGoalCount,
    stageCapacity,
    weightedPick,
    parsePlatePattern,
    createPlateData,
    createWeightedPlate,
    createWeightedPlateData,
  };
});
