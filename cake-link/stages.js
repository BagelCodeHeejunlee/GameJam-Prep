(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CakeLinkStages = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STAGES = Object.freeze({
    1: Object.freeze({
      id: 1,
      title: "스테이지 1",
      difficulty: "쉬움",
      seed: 4416,
      swaps: 3,
      goals: Object.freeze({ berry: 3 }),
      deck: Object.freeze([
        { berry: 3 }, { berry: 2, blueberry: 1 }, { berry: 1, lemon: 2 },
        { berry: 3 }, { berry: 2, matcha: 1 }, { berry: 1, choco: 2 },
        { berry: 3 }, { berry: 2, blueberry: 1 }, { berry: 1, lemon: 2 },
        { berry: 2, matcha: 1 }, { berry: 2, choco: 1 }, { berry: 3 },
      ]),
      nextStageId: 2,
    }),
    2: Object.freeze({
      id: 2,
      title: "스테이지 2",
      difficulty: "보통",
      seed: 7821,
      swaps: 3,
      goals: Object.freeze({ berry: 3, lemon: 3 }),
      deck: Object.freeze([
        { berry: 3 }, { lemon: 3 }, { berry: 2, lemon: 1 },
        { berry: 1, lemon: 2 }, { berry: 3 }, { lemon: 3 },
        { berry: 3 }, { lemon: 3 }, { berry: 2, lemon: 1 },
        { berry: 1, lemon: 2 }, { berry: 3 }, { lemon: 3 },
        { berry: 2, blueberry: 1 }, { lemon: 2, matcha: 1 }, { berry: 1, lemon: 1, choco: 1 },
      ]),
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

  return { STAGES, getStage, goalEntries, isComplete, totalGoalCount };
});
