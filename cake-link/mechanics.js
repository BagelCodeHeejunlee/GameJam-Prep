(function (root, factory) {
  const Engine = typeof module === "object" && module.exports
    ? require("./engine.js")
    : root.CakeLinkEngine;
  const api = factory(Engine);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CakeLinkMechanics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Engine) {
  "use strict";

  function mechanicsOf(stage) {
    return stage?.mechanics || {};
  }

  function indexOfEntry(entry) {
    return Number.isInteger(entry) ? entry : Number(entry?.index);
  }

  function createRuntime(stage) {
    const mechanics = mechanicsOf(stage);
    const iceCells = {};
    for (const entry of mechanics.iceCells || []) {
      const index = indexOfEntry(entry);
      if (!Number.isInteger(index)) continue;
      iceCells[index] = Math.max(1, Math.floor(Number(entry?.layers) || 1));
    }

    const lockedCells = {};
    for (const entry of mechanics.locks || mechanics.lockedCells || []) {
      const index = indexOfEntry(entry);
      if (Number.isInteger(index)) lockedCells[index] = true;
    }

    const frog = mechanics.frog;
    const startIndex = Number.isInteger(frog?.startIndex) ? frog.startIndex : null;
    const frogReached = startIndex !== null && startIndex === frog?.goalIndex;
    const frogIndex = frogReached ? null : startIndex;
    return {
      iceCells,
      lockedCells,
      brokenCells: {},
      keyProgress: {},
      frogIndex,
      frogReached,
      orderIndex: 0,
      fragileBrokenCount: 0,
    };
  }

  function cloneRuntime(runtime) {
    const cloned = Engine.deepClone(runtime || {});
    return {
      iceCells: {},
      lockedCells: {},
      brokenCells: {},
      keyProgress: {},
      frogIndex: null,
      frogReached: false,
      orderIndex: 0,
      fragileBrokenCount: 0,
      ...cloned,
      iceCells: { ...(cloned.iceCells || {}) },
      lockedCells: { ...(cloned.lockedCells || {}) },
      brokenCells: { ...(cloned.brokenCells || {}) },
      keyProgress: { ...(cloned.keyProgress || {}) },
    };
  }

  function baseCellAvailable(stage, runtime, index) {
    if (!Number.isInteger(index) || index < 0 || index >= Engine.BOARD_SIZE ** 2) return false;
    const row = Math.floor(index / Engine.BOARD_SIZE);
    const column = index % Engine.BOARD_SIZE;
    if (stage?.boardMask?.[row]?.[column] !== "1") return false;
    if ((runtime?.iceCells?.[index] || 0) > 0) return false;
    if (runtime?.lockedCells?.[index]) return false;
    return true;
  }

  function isCellAvailable(stage, runtime, index, board) {
    if (!baseCellAvailable(stage, runtime, index)) return false;
    if (runtime?.frogIndex === index) return false;
    return !board || !board[index];
  }

  function legalPlacementIndexes(stage, runtime, board) {
    return Array.from({ length: Engine.BOARD_SIZE ** 2 }, (_, index) => index)
      .filter((index) => isCellAvailable(stage, runtime, index, board));
  }

  function revealPlate(plate) {
    return Engine.revealPlate(plate);
  }

  function applyStageCapacity(stage, board) {
    const configured = Number(stage?.rules?.capacity);
    if (!Number.isInteger(configured) || configured <= 0) return board;
    for (const plate of board) {
      if (!plate) continue;
      if (!Number.isInteger(Number(plate.capacity)) || Number(plate.capacity) <= 0) {
        plate.capacity = configured;
      }
      for (const layer of plate.layers || []) {
        if (!Number.isInteger(Number(layer.capacity)) || Number(layer.capacity) <= 0) {
          layer.capacity = configured;
        }
      }
    }
    return board;
  }

  function applyFrozenMetadata(runtime, board) {
    for (let index = 0; index < board.length; index += 1) {
      const plate = board[index];
      if (!plate) continue;
      if ((runtime?.iceCells?.[index] || 0) > 0) plate.frozen = true;
      else if (plate.frozen) delete plate.frozen;
    }
    return board;
  }

  function unique(values) {
    return [...new Set(values)];
  }

  function aggregatePhases(phases) {
    return {
      events: phases.flatMap((phase) => phase.events || []),
      completionEvents: phases.flatMap((phase) => phase.completionEvents || []),
      completed: unique(phases.flatMap((phase) => phase.completed || [])).sort((a, b) => a - b),
      emptied: unique(phases.flatMap((phase) => phase.emptied || [])).sort((a, b) => a - b),
      removed: unique(phases.flatMap((phase) => phase.removed || [])).sort((a, b) => a - b),
      revealed: unique(phases.flatMap((phase) => phase.revealed || [])).sort((a, b) => a - b),
      safetyLimitReached: phases.some((phase) => phase.safetyLimitReached),
    };
  }

  function unlockFromCompletions(stage, runtime, completionEvents, specialEvents) {
    const locks = mechanicsOf(stage).locks || mechanicsOf(stage).lockedCells || [];
    const groups = new Map();
    for (const entry of locks) {
      const index = indexOfEntry(entry);
      if (!Number.isInteger(index)) continue;
      const keyId = entry.keyId || `${entry.color || "any"}:${entry.count || 1}`;
      if (!groups.has(keyId)) {
        groups.set(keyId, {
          keyId,
          color: entry.color || null,
          count: Math.max(1, Math.floor(Number(entry.count) || 1)),
          indexes: [],
        });
      }
      groups.get(keyId).indexes.push(index);
    }

    for (const group of groups.values()) {
      const matching = completionEvents.filter((event) => !group.color || event.type === group.color).length;
      if (matching > 0) {
        runtime.keyProgress[group.keyId] = (runtime.keyProgress[group.keyId] || 0) + matching;
      }
      if ((runtime.keyProgress[group.keyId] || 0) < group.count) continue;
      const unlocked = group.indexes.filter((index) => runtime.lockedCells[index]);
      for (const index of unlocked) delete runtime.lockedCells[index];
      if (unlocked.length) specialEvents.push({ kind: "unlock", keyId: group.keyId, indexes: unlocked });
    }
  }

  function breakIce(stage, runtime, removed, specialEvents) {
    for (const [rawIndex, rawLayers] of Object.entries(runtime.iceCells || {})) {
      const index = Number(rawIndex);
      const adjacentRemovals = removed.filter((removedIndex) =>
        Engine.getNeighbors(index).includes(removedIndex)
      ).length;
      if (!adjacentRemovals) continue;
      const before = Number(rawLayers) || 0;
      const after = Math.max(0, before - adjacentRemovals);
      if (after > 0) runtime.iceCells[index] = after;
      else delete runtime.iceCells[index];
      specialEvents.push({ kind: "iceBreak", index, amount: before - after, remaining: after });
    }
  }

  function breakFragileCells(stage, runtime, completionEvents, specialEvents) {
    const fragileIndexes = new Set((mechanicsOf(stage).fragileCells || [])
      .map(indexOfEntry)
      .filter(Number.isInteger));
    for (const event of completionEvents) {
      if (!event.removed || !fragileIndexes.has(event.index) || runtime.brokenCells[event.index]) continue;
      runtime.brokenCells[event.index] = true;
      runtime.fragileBrokenCount = Math.max(0, Number(runtime.fragileBrokenCount) || 0) + 1;
      specialEvents.push({
        kind: "fragileBreak",
        index: event.index,
        progress: runtime.fragileBrokenCount,
        target: fragileTarget(stage),
      });
    }
  }

  function fragileTarget(stage) {
    const configured = Math.floor(Number(stage?.objective?.target));
    if (Number.isInteger(configured) && configured > 0) return configured;
    return (mechanicsOf(stage).fragileCells || [])
      .map(indexOfEntry)
      .filter(Number.isInteger).length;
  }

  function advanceOrderedGoal(stage, runtime, completionEvents, specialEvents) {
    const sequence = mechanicsOf(stage).orderedGoal?.sequence || [];
    for (const event of completionEvents) {
      if (runtime.orderIndex >= sequence.length) break;
      const expected = sequence[runtime.orderIndex];
      if (event.type !== expected) continue;
      runtime.orderIndex += 1;
      specialEvents.push({
        kind: "orderProgress",
        type: event.type,
        orderIndex: runtime.orderIndex,
        total: sequence.length,
      });
    }
  }

  function frogDistance(stage, runtime, board) {
    if (runtime?.frogReached) return 0;
    const frog = mechanicsOf(stage).frog;
    const start = runtime?.frogIndex;
    const goal = frog?.goalIndex;
    if (!Number.isInteger(start) || !Number.isInteger(goal)) return null;
    if (start === goal) return 0;
    const queue = [{ index: start, distance: 0 }];
    const visited = new Set([start]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      for (const next of Engine.getNeighbors(current.index)) {
        if (visited.has(next) || !baseCellAvailable(stage, runtime, next)) continue;
        // An occupied goal is still the pathfinding destination. The frog may
        // approach it, but moveFrog will not let the frog enter until the plate
        // on the goal has disappeared.
        if (next === goal) return current.distance + 1;
        if (board?.[next]) continue;
        visited.add(next);
        queue.push({ index: next, distance: current.distance + 1 });
      }
    }
    return Infinity;
  }

  function moveFrog(stage, runtime, board, specialEvents) {
    const frog = mechanicsOf(stage).frog;
    if (!frog || runtime.frogReached || !Number.isInteger(runtime.frogIndex)) return;
    const from = runtime.frogIndex;
    const currentDistance = frogDistance(stage, runtime, board);
    let best = null;
    for (const index of Engine.getNeighbors(from)) {
      if (!baseCellAvailable(stage, runtime, index) || board[index]) continue;
      const candidateRuntime = cloneRuntime(runtime);
      candidateRuntime.frogIndex = index;
      const distance = frogDistance(stage, candidateRuntime, board);
      if (!Number.isFinite(distance)) continue;
      if (!best || distance < best.distance) best = { index, distance };
    }
    // When a plate occupies the goal, approach until the nearest reachable
    // empty cell, then wait there instead of oscillating away from the goal.
    if (!best || !(best.distance < currentDistance)) return;
    const reached = best.index === frog.goalIndex;
    runtime.frogReached = reached;
    runtime.frogIndex = reached ? null : best.index;
    specialEvents.push({
      kind: "frogMove",
      from,
      to: best.index,
      reached,
    });
  }

  function resolveTurn(stage, inputRuntime, inputBoard, placedIndex) {
    const runtime = cloneRuntime(inputRuntime || createRuntime(stage));
    let board = applyFrozenMetadata(runtime, applyStageCapacity(stage, Engine.cloneBoard(inputBoard)));
    const phases = [];
    const specialEvents = [];

    function addPhase(phase) {
      phases.push(phase);
      board = phase.board;
      for (const index of phase.mysteryRevealed || []) {
        specialEvents.push({ kind: "mysteryReveal", index });
      }
    }

    // Fixed colored plates collect directly from the newly placed plate before
    // the usual local sorting begins. The ordinary engine treats them as inert.
    const collectorPhase = Engine.resolveColoredCollectors(board, placedIndex);
    if (collectorPhase.didResolve) addPhase(collectorPhase);

    let first = null;
    if (board[placedIndex] || !collectorPhase.didResolve) {
      first = Engine.resolvePlacement(board, placedIndex);
      addPhase(first);
    }

    // Every lower layer exposed by this turn gets one immediate local
    // resolution. A per-cell cap prevents a tall cake from opening all of its
    // remaining layers in the same placement while still handling two plates
    // that open together.
    const pendingLayers = [...(first?.layerRevealed || [])];
    const resolvedLayers = new Set();
    while (pendingLayers.length) {
      const layerIndex = pendingLayers.shift();
      if (!Number.isInteger(layerIndex) || resolvedLayers.has(layerIndex)) continue;
      resolvedLayers.add(layerIndex);
      specialEvents.push({ kind: "layerOpen", index: layerIndex });
      if (!board[layerIndex]) continue;
      const extra = Engine.resolvePlacement(board, layerIndex);
      addPhase(extra);
      for (const index of extra.layerRevealed || []) {
        if (!resolvedLayers.has(index)) pendingLayers.push(index);
      }
    }

    const aggregate = aggregatePhases(phases);
    breakIce(stage, runtime, aggregate.removed, specialEvents);
    unlockFromCompletions(stage, runtime, aggregate.completionEvents, specialEvents);
    breakFragileCells(stage, runtime, aggregate.completionEvents, specialEvents);
    advanceOrderedGoal(stage, runtime, aggregate.completionEvents, specialEvents);
    moveFrog(stage, runtime, board, specialEvents);
    // Ice broken by this turn becomes usable in the returned state, while its
    // embedded plate was still frozen throughout all sorting phases above.
    applyFrozenMetadata(runtime, board);

    return {
      board,
      runtime,
      phases,
      specialEvents,
      ...aggregate,
      settledBoard: phases.at(-1)?.settledBoard || Engine.cloneBoard(board),
    };
  }

  function cakeGoalProgress(stage, completedByType) {
    const entries = Object.entries(stage?.goals || {});
    const target = entries.reduce((sum, [, count]) => sum + Math.max(0, Number(count) || 0), 0);
    const achieved = entries.reduce((sum, [type, count]) =>
      sum + Math.min(completedByType?.[type] || 0, Math.max(0, Number(count) || 0)), 0
    );
    return target ? achieved / target : 1;
  }

  function isStageComplete(stage, completedByType = {}, runtime = createRuntime(stage)) {
    const cakeComplete = cakeGoalProgress(stage, completedByType) >= 1;
    const objective = stage?.objective?.type;
    if (objective === "frog") return cakeComplete && Boolean(runtime.frogReached);
    if (objective === "ordered") {
      const length = mechanicsOf(stage).orderedGoal?.sequence?.length || 0;
      return runtime.orderIndex >= length;
    }
    if (objective === "fragile") {
      const target = fragileTarget(stage);
      return target > 0 && (Number(runtime.fragileBrokenCount) || 0) >= target;
    }
    return cakeComplete;
  }

  function goalProgress(stage, completedByType = {}, runtime = createRuntime(stage)) {
    const objective = stage?.objective?.type;
    if (objective === "ordered") {
      const length = mechanicsOf(stage).orderedGoal?.sequence?.length || 0;
      return length ? Math.min(1, runtime.orderIndex / length) : 1;
    }
    if (objective === "fragile") {
      const target = fragileTarget(stage);
      return target
        ? Math.min(1, Math.max(0, Number(runtime.fragileBrokenCount) || 0) / target)
        : 1;
    }
    if (objective === "frog") {
      const frog = mechanicsOf(stage).frog;
      const cakeTarget = Object.values(stage?.goals || {})
        .reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
      const cakeProgress = cakeGoalProgress(stage, completedByType);
      if (!frog) return cakeTarget ? cakeProgress : 0;
      const startDistance = Math.abs(Math.floor(frog.startIndex / Engine.BOARD_SIZE) - Math.floor(frog.goalIndex / Engine.BOARD_SIZE)) +
        Math.abs((frog.startIndex % Engine.BOARD_SIZE) - (frog.goalIndex % Engine.BOARD_SIZE));
      const frogProgress = runtime.frogReached
        ? 1
        : Number.isInteger(runtime.frogIndex)
          ? (() => {
            const currentDistance = Math.abs(Math.floor(runtime.frogIndex / Engine.BOARD_SIZE) - Math.floor(frog.goalIndex / Engine.BOARD_SIZE)) +
              Math.abs((runtime.frogIndex % Engine.BOARD_SIZE) - (frog.goalIndex % Engine.BOARD_SIZE));
            return startDistance ? Math.max(0, Math.min(1, 1 - currentDistance / startDistance)) : 0;
          })()
          : 0;
      return (cakeProgress * cakeTarget + frogProgress) / Math.max(1, cakeTarget + 1);
    }
    return cakeGoalProgress(stage, completedByType);
  }

  return {
    createRuntime,
    cloneRuntime,
    isCellAvailable,
    legalPlacementIndexes,
    revealPlate,
    applyFrozenMetadata,
    resolveTurn,
    isStageComplete,
    goalProgress,
    frogDistance,
  };
});
