(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CakeLinkStages = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const COLOR_IDS = Object.freeze(["berry", "blueberry", "lemon", "matcha", "choco"]);

  function freezeStage(stage) {
    Object.freeze(stage.goals);
    Object.freeze(stage.colors);
    Object.freeze(stage.boardMask);
    stage.initialPlates.forEach((plate) => Object.freeze(plate.pieces));
    stage.initialPlates.forEach(Object.freeze);
    Object.freeze(stage.initialPlates);
    stage.openingRack.forEach(Object.freeze);
    Object.freeze(stage.openingRack);
    Object.freeze(stage.colorWeights);
    Object.freeze(stage.platePatternWeights);
    return Object.freeze(stage);
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
      moveLimit: 18,
      swaps: 3,
      goals: { berry: 3 },
      colors: ["berry", "lemon"],
      boardMask: ["1111", "1111", "1111", "1111"],
      initialPlates: [
        { index: 5, pieces: { berry: 2 } },
        { index: 10, pieces: { berry: 1 } },
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
      moveLimit: 26,
      swaps: 3,
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
      difficulty: "보통",
      seed: 3197,
      moveLimit: 24,
      swaps: 3,
      goals: { matcha: 3, lemon: 3 },
      colors: ["matcha", "lemon", "berry", "choco"],
      boardMask: ["0111", "1111", "1111", "1110"],
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
      moveLimit: 26,
      swaps: 3,
      goals: { berry: 2, matcha: 2, choco: 2 },
      colors: ["berry", "matcha", "choco", "lemon", "blueberry"],
      boardMask: ["0110", "1111", "1111", "1110"],
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
      difficulty: "어려움",
      seed: 9538,
      moveLimit: 32,
      swaps: 3,
      goals: { berry: 3, lemon: 3, blueberry: 2 },
      colors: ["berry", "lemon", "blueberry", "matcha", "choco"],
      boardMask: ["0110", "1111", "1111", "0110"],
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
      difficulty: "어려움",
      seed: 2673,
      moveLimit: 36,
      swaps: 3,
      goals: { matcha: 3, choco: 3, blueberry: 3 },
      colors: ["matcha", "choco", "blueberry", "berry", "lemon"],
      boardMask: ["1111", "0110", "0110", "1111"],
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
      difficulty: "어려움",
      seed: 8249,
      moveLimit: 44,
      swaps: 3,
      goals: { berry: 3, matcha: 3, lemon: 3, choco: 2, blueberry: 2 },
      colors: ["berry", "matcha", "lemon", "choco", "blueberry"],
      boardMask: ["0110", "1111", "1110", "0110"],
      initialPlates: [
        { index: 5, pieces: { berry: 2, matcha: 1 } },
        { index: 6, pieces: { lemon: 2, blueberry: 1 } },
        { index: 9, pieces: { choco: 2, berry: 1 } },
        { index: 10, pieces: { matcha: 2, lemon: 1 } },
      ],
      openingRack: [
        { berry: 3 }, { matcha: 3 }, { lemon: 2, choco: 1 },
      ],
      colorWeights: { berry: 23, matcha: 23, lemon: 23, choco: 16, blueberry: 15 },
      platePatternWeights: { a3: 6, a2b1: 18, a2b2: 24, a1b1c1: 20, a2b1c1: 18, a2b2c1: 14 },
      nextStageId: null,
    }),
  });

  function getStage(stageId) {
    return STAGES[stageId] || STAGES[1];
  }

  function goalEntries(stage) {
    return Object.entries(stage.goals);
  }

  function isComplete(stage, completedByType) {
    return goalEntries(stage).every(([type, target]) => (completedByType[type] || 0) >= target);
  }

  function totalGoalCount(stage) {
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

  return {
    COLOR_IDS,
    STAGES,
    getStage,
    goalEntries,
    isComplete,
    totalGoalCount,
    weightedPick,
    parsePlatePattern,
    createWeightedPlate,
  };
});
