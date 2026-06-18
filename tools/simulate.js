#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {
    runs: 100,
    waves: 5,
    stage: null,
    strategy: "random",
    tree: "",
    seed: 1,
    maxTurns: 160,
    verbose: false,
    exactLos: false,
    exactMovement: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--runs" || arg === "-n") {
      args.runs = Number(next);
      i += 1;
    } else if (arg === "--waves" || arg === "-w") {
      args.waves = Number(next);
      i += 1;
    } else if (arg === "--stage") {
      args.stage = String(next ?? "").trim().toLowerCase();
      i += 1;
    } else if (arg === "--strategy" || arg === "-s") {
      args.strategy = next;
      i += 1;
    } else if (arg === "--tree" || arg === "-t") {
      args.tree = normalizeRoute(next);
      i += 1;
    } else if (arg === "--seed") {
      args.seed = Number(next);
      i += 1;
    } else if (arg === "--max-turns") {
      args.maxTurns = Number(next);
      i += 1;
    } else if (arg === "--exact-los") {
      args.exactLos = true;
    } else if (arg === "--exact-movement") {
      args.exactMovement = true;
    } else if (arg === "--verbose" || arg === "-v") {
      args.verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!["random", "tree", "auto"].includes(args.strategy)) {
    throw new Error(`Unknown strategy: ${args.strategy}`);
  }
  if (args.strategy === "tree" && !args.tree) {
    throw new Error("--strategy tree requires --tree <route>");
  }
  if (!Number.isFinite(args.runs) || args.runs <= 0) throw new Error("--runs must be positive");
  if (!Number.isFinite(args.waves) || args.waves <= 0) throw new Error("--waves must be positive");
  if (args.stage && args.stage !== "all" && (!Number.isFinite(Number(args.stage)) || Number(args.stage) <= 0)) {
    throw new Error("--stage must be a positive number or all");
  }
  if (!Number.isFinite(args.maxTurns) || args.maxTurns <= 0) throw new Error("--max-turns must be positive");

  args.runs = Math.floor(args.runs);
  args.waves = Math.floor(args.waves);
  if (args.stage && args.stage !== "all") args.stage = Math.floor(Number(args.stage));
  args.maxTurns = Math.floor(args.maxTurns);
  return args;
}

function normalizeRoute(route) {
  const value = String(route ?? "").trim().toLowerCase();
  const aliases = {
    multi: "다단중첩",
    combo: "다단중첩",
    "다단": "다단중첩",
    "다단중첩": "다단중첩",
    trap: "함정",
    traps: "함정",
    "함정": "함정",
    charge: "차지",
    "차지": "차지",
  };
  return aliases[value] ?? route;
}

function printHelp() {
  console.log(`
Usage:
  node tools/simulate.js --strategy random --runs 200 --waves 5
  node tools/simulate.js --strategy random --runs 200 --stage 1
  node tools/simulate.js --strategy random --runs 200 --stage all
  node tools/simulate.js --strategy tree --tree 함정 --runs 200 --waves 5
  node tools/simulate.js --strategy auto --runs 200 --waves 5

Options:
  -s, --strategy       random | tree | auto
  -t, --tree           Route for tree strategy: 다단중첩 | 함정 | 차지
  -n, --runs           Number of runs. Default: 100
  -w, --waves          Number of waves to simulate. Default: 5
      --stage          Run from wave 1 through this stage. Use all for every wave. Overrides --waves.
      --seed           Deterministic seed. Default: 1
      --max-turns      Turn cap per wave. Default: 160
      --exact-los      Use the game's wall-aware line-of-sight checks. Slower.
      --exact-movement Use the game's full pathfinding movement. Much slower.
  -v, --verbose        Print one line per run
`);
}

function configureSimulationScope(options, game) {
  const totalWaves = game.waves.length;
  const wavesPerStage = 15;
  if (options.stage === "all") {
    options.waves = totalWaves;
    options.scopeLabel = "stage=all";
    return;
  }
  if (options.stage) {
    options.waves = Math.min(totalWaves, options.stage * wavesPerStage);
    options.scopeLabel = `stage=${options.stage}`;
    return;
  }
  options.waves = Math.min(totalWaves, options.waves);
  options.scopeLabel = `waves=${options.waves}`;
}

function createRng(seed) {
  let value = seed >>> 0;
  return function random() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function makeDomElement() {
  const element = {
    style: {},
    dataset: {},
    children: [],
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
    addEventListener() {},
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); return child; },
    remove() {},
    setAttribute() {},
    removeAttribute() {},
    querySelector() { return makeDomElement(); },
    querySelectorAll() { return []; },
    cloneNode() { return makeDomElement(); },
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    },
    innerHTML: "",
    textContent: "",
    scrollTop: 0,
    scrollHeight: 0,
    tabIndex: 0,
  };
  return element;
}

function loadGame(seed, options) {
  const random = createRng(seed);
  const math = Object.create(Math);
  math.random = random;

  const context = {
    console,
    Math: math,
    URLSearchParams,
    performance: { now: () => 0 },
    localStorage: {
      getItem() { return null; },
      setItem() {},
    },
    window: {
      location: { search: "?character=archer" },
      innerWidth: 390,
      innerHeight: 844,
      setTimeout(fn) {
        if (typeof fn === "function") fn();
        return 0;
      },
      requestAnimationFrame(fn) {
        if (typeof fn === "function") fn(0);
        return 0;
      },
      addEventListener() {},
    },
    document: {
      body: makeDomElement(),
      querySelector() { return makeDomElement(); },
      querySelectorAll(selector) {
        if (selector === "[data-character]") return [];
        return [];
      },
      createElement() { return makeDomElement(); },
      createDocumentFragment() { return makeDomElement(); },
    },
  };
  context.globalThis = context;

  let source = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  source = source.replace(/\nelements\.newRunButton\.addEventListener[\s\S]*?\nnewRun\(\);\s*$/m, "\n");
  source += `
render = function() {};
renderBoard = function() {};
renderHud = function() {};
renderEnemySummary = function() {};
renderPriorityStrip = function() {};
renderPlayerHud = function() {};
renderDrawnCards = function() {};
renderTimeline = function() {};
renderLog = function() {};
showHitEffect = function() {};
showDamage = function() {};
showDrawnCardReveal = function() {};
hideDrawnCardReveal = function() {};
flyRevealToHud = function() {};
playPriorityReveal = async function() {};
playTurnCue = async function() {};
nextFrame = async function() {};
sleep = async function() {};
scheduleTurn = function() {};
slideActorTo = async function(actor, from, to) {
  actor.q = to.q;
  actor.r = to.r;
};
animateActorPath = async function(actor, path) {
  for (const step of path) {
    if (!isAlive(actor)) return;
    actor.q = step.q;
    actor.r = step.r;
    const triggeredTrap = triggerTrap(actor);
    if (triggeredTrap === "block" || !isAlive(actor)) break;
  }
};
${""}
if (!${"__SIM_EXACT_LOS__"}) {
  hasLineOfSight = function() { return true; };
  wallAwareDistance = function(from, to) { return axialDistance(from, to); };
}
if (!${"__SIM_EXACT_MOVEMENT__"}) {
  reachableTiles = function(actor, maxDistance, jump = false, avoidTraps = false) {
    return state.tiles
      .filter((tile) => !sameHex(tile, actor))
      .filter((tile) => axialDistance(actor, tile) <= maxDistance)
      .filter((tile) => canEndMoveAt(tile, actor, { avoidTraps }))
      .map((tile) => ({ ...tile, distance: axialDistance(actor, tile) }));
  };
  findMovePath = function(actor, destination) {
    return sameHex(actor, destination) ? [] : [{ q: destination.q, r: destination.r }];
  };
  movementDistanceBetween = function(actor, start, destination) {
    if (sameHex(start, destination)) return 0;
    return canEndMoveAt(destination, actor) ? axialDistance(start, destination) : Infinity;
  };
  movementTrapRisk = function(actor, destination) {
    if (sameHex(actor, destination)) return 0;
    return movementTrapAt(destination) ? 1 : 0;
  };
  createMovementContext = function(actor, amount, jump = false) {
    const makeField = function(maxDistance, avoidTraps) {
      const reachable = state.tiles
        .filter((tile) => !sameHex(tile, actor))
        .filter((tile) => axialDistance(actor, tile) <= maxDistance)
        .filter((tile) => canEndMoveAt(tile, actor, { avoidTraps }))
        .map((tile) => ({
          ...tile,
          distance: axialDistance(actor, tile),
          trapRisk: avoidTraps ? 0 : movementTrapRisk(actor, tile),
        }));
      return {
        reachableTiles: reachable,
        has(tile) {
          return sameHex(tile, actor) || state.tiles.some((candidate) => sameHex(candidate, tile));
        },
        distanceTo(tile) {
          return sameHex(tile, actor) ? 0 : axialDistance(actor, tile);
        },
        trapRiskTo(tile) {
          return avoidTraps ? 0 : movementTrapRisk(actor, tile);
        },
        pathTo(destination) {
          return sameHex(actor, destination) ? [] : [{ q: destination.q, r: destination.r }];
        },
        stepToward(destination) {
          return sameHex(actor, destination) ? actor : { q: destination.q, r: destination.r };
        },
      };
    };
    const safeField = makeField(amount, true);
    const fallbackField = makeField(amount, false);
    const fallbackReachable = fallbackField.reachableTiles.map((tile) => ({
      ...tile,
      trapRisk: safeField.distanceTo(tile) <= amount ? 0 : tile.trapRisk,
    }));
    return {
      amount,
      jump,
      safeField,
      fallbackField,
      safeReachable: safeField.reachableTiles,
      fallbackReachable,
      fullField(avoidTraps) {
        return makeField(Infinity, avoidTraps);
      },
      pathTo(destination) {
        return sameHex(actor, destination) ? [] : [{ q: destination.q, r: destination.r }];
      },
    };
  };
  buildMeleeApproachFields = function() {
    return null;
  };
  approachDistanceToTarget = function(actor, fromTile, target) {
    if (axialDistance(fromTile, target) <= 1) return 0;
    const adjacentTiles = directions
      .map((dir) => ({ q: target.q + dir.q, r: target.r + dir.r }))
      .filter((tile) => isTile(tile) && canEndMoveAt(tile, actor));
    return Math.min(...adjacentTiles.map((tile) => axialDistance(fromTile, tile)), Infinity);
  };
  bestPathStepTowardAttackTile = function(actor, attackAction, moveOptions, avoidTraps) {
    const amount = moveOptions.amount ?? actor.baseMove ?? 0;
    if (amount <= 0) return actor;
    const goals = state.tiles
      .filter((tile) => canEndMoveAt(tile, actor, { avoidTraps }))
      .map((tile) => ({ tile, distance: axialDistance(actor, tile), targetInfo: scoreTargetsFromTile(actor, tile, attackAction) }))
      .filter((item) => item.targetInfo.hitCount > 0)
      .sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        if (a.targetInfo.hitCount !== b.targetInfo.hitCount) return b.targetInfo.hitCount - a.targetInfo.hitCount;
        return a.targetInfo.lowestIndex - b.targetInfo.lowestIndex;
      });
    const goal = goals[0]?.tile;
    if (!goal) return null;
    return state.tiles
      .filter((tile) => canEndMoveAt(tile, actor, { avoidTraps }))
      .filter((tile) => axialDistance(actor, tile) <= amount)
      .sort((a, b) => {
        const da = axialDistance(a, goal);
        const db = axialDistance(b, goal);
        if (da !== db) return da - db;
        return axialDistance(actor, a) - axialDistance(actor, b);
      })[0] ?? null;
  };
}
checkEndConditions = function() {
  if (state.waitingReward || state.finished) return true;
  if (!getPlayer()) {
    state.finished = true;
    return true;
  }
  if (!aliveEnemies().length) {
    state.waitingReward = true;
    return true;
  }
  return false;
};
finishRun = function(win) {
  state.finished = true;
  state.win = Boolean(win);
};
clearWave = function() {
  state.waitingReward = true;
};
globalThis.__simExports = {
  getState: function() { return state; },
  setState: function(nextState) { state = nextState; },
  setSelectedCharacter: function(id) { selectedCharacterId = id; },
  getSelectedCharacter,
  characterDefinitions,
  monsterDecks,
  waves,
  expandCards,
  shuffle,
  startWave,
  healWaveClear,
  drawRewards,
  recordRewardPick,
  isPassiveCard,
  applyPassiveReward,
  getPlayer,
  aliveEnemies,
  aliveEnemyKinds,
  drawPlayerCard,
  drawEnemyCard,
  compareTimeline,
  executeCard,
  expireTurnEndEffects,
  discardResolvedCard,
  discardEnemyCard,
  processMeteors,
  checkEndConditions,
  isAlive,
};
`;

  vm.createContext(context);
  source = source
    .replace("__SIM_EXACT_LOS__", options.exactLos ? "true" : "false")
    .replace("__SIM_EXACT_MOVEMENT__", options.exactMovement ? "true" : "false");
  vm.runInContext(source, context, { filename: "app.js" });
  context.__random = random;
  return context;
}

function createInitialState(game) {
  game.setSelectedCharacter("archer");
  const character = game.getSelectedCharacter();
  game.setState({
    paused: false,
    busy: false,
    finished: false,
    waitingReward: false,
    waveIndex: 0,
    turn: 0,
    nextEnemyIndex: 0,
    tiles: [],
    walls: [],
    obstacles: [],
    meteors: [],
    entities: [],
    characterId: character.id,
    character,
    playerCards: game.expandCards(character.baseCards),
    deck: [],
    discard: [],
    enemyDecks: {},
    enemyDiscards: {},
    enemySustainedCards: {},
    currentTimeline: [],
    activeTimelineIndex: -1,
    completedTimelineCount: 0,
    completedTimelineIndexes: new Set(),
    priorityRevealMode: "",
    cameraMode: "overview",
    cameraTransitionScheduled: false,
    cameraFocusReady: false,
    cameraFollowToken: 0,
    cameraPanelWidth: 0,
    cameraPanelHeight: 0,
    cameraX: 0,
    cameraY: 0,
    cameraScale: 0,
    boardTileSignature: "",
    boardTileElements: new Map(),
    rewardLocked: false,
    preStartReward: false,
    passiveCards: [],
    rewardPickCount: 0,
    rewardTags: new Set(),
    rewardRouteCounts: {},
    pickedRewardIds: new Set(),
    log: [],
    speedMultiplier: 1,
    suppressPlayerCard: false,
  });
  game.startWave(0);
}

function chooseReward(game, rewards, strategy, tree, rng) {
  if (strategy === "tree") {
    const routeRewards = rewards.filter((reward) => reward.route === tree);
    if (routeRewards.length) return sample(routeRewards, rng);
    return sample(rewards, rng);
  }

  if (strategy === "auto") {
    const state = game.getState();
    const routeCounts = state.rewardRouteCounts ?? {};
    const ownedRoutes = Object.entries(routeCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    if (ownedRoutes.length) {
      const bestCount = ownedRoutes[0][1];
      const bestRoutes = new Set(ownedRoutes.filter(([, count]) => count === bestCount).map(([route]) => route));
      const routeRewards = rewards.filter((reward) => bestRoutes.has(reward.route));
      if (routeRewards.length) return sample(routeRewards, rng);
    }
    return sample(rewards, rng);
  }

  return sample(rewards, rng);
}

function sample(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function addReward(game, reward, preStart = false) {
  const state = game.getState();
  game.recordRewardPick(reward);
  if (game.isPassiveCard(reward)) {
    game.applyPassiveReward(reward);
    return;
  }
  state.playerCards.push(reward);
  if (preStart) state.deck.unshift(reward);
}

async function simulateTurn(game) {
  const state = game.getState();
  const player = game.getPlayer();
  if (!player || !game.isAlive(player)) {
    state.finished = true;
    return;
  }

  state.turn += 1;
  game.processMeteors();
  if (game.checkEndConditions()) return;

  const playerCard = game.drawPlayerCard();
  const enemyEntries = game.aliveEnemyKinds().map((kind) => ({
    actorType: "enemyGroup",
    actorId: kind,
    card: game.drawEnemyCard(kind),
  }));
  const entries = [
    { actorType: "player", actorId: player.id, card: playerCard },
    ...enemyEntries,
  ].sort(game.compareTimeline);

  for (const entry of entries) {
    if (state.finished || state.waitingReward) break;
    if (entry.actorType === "player") {
      const actor = game.getPlayer();
      if (actor && game.isAlive(actor)) await game.executeCard(actor, entry.card);
    } else {
      const enemies = game.getState().entities
        .filter((entity) => entity.side === "enemy" && entity.kind === entry.actorId && game.isAlive(entity))
        .sort((a, b) => a.monsterIndex - b.monsterIndex);
      for (const enemy of enemies) {
        if (state.finished || state.waitingReward) break;
        await game.executeCard(enemy, entry.card);
      }
    }
    game.expireTurnEndEffects(entry);
    if (game.checkEndConditions()) break;
  }

  if (!state.waitingReward && !state.finished) {
    game.discardResolvedCard(playerCard, game.getPlayer());
    enemyEntries.forEach((entry) => game.discardEnemyCard(entry.card, entry.actorId));
  }
}

async function simulateRun(options, runIndex, sharedContext = null) {
  const seed = options.seed + runIndex * 9973;
  const context = sharedContext ?? loadGame(seed, options);
  const game = context.__simExports;
  const rng = context.__random;
  createInitialState(game);

  const preReward = chooseReward(game, game.drawRewards(), options.strategy, options.tree, rng);
  addReward(game, preReward, true);

  const picked = [preReward.name];
  const waveResults = [];

  for (let waveIndex = 0; waveIndex < options.waves; waveIndex += 1) {
    const state = game.getState();
    state.waveIndex = waveIndex;
    state.waitingReward = false;

    let turns = 0;
    while (!state.finished && !state.waitingReward && turns < options.maxTurns) {
      await simulateTurn(game);
      turns += 1;
    }

    const player = game.getPlayer();
    const cleared = Boolean(state.waitingReward && player && game.isAlive(player));
    waveResults.push({
      wave: waveIndex + 1,
      cleared,
      turns,
      hp: player?.hp ?? 0,
      enemiesLeft: game.aliveEnemies().length,
    });

    if (!cleared) break;
    if (waveIndex >= options.waves - 1) break;

    game.healWaveClear();
    const reward = chooseReward(game, game.drawRewards(), options.strategy, options.tree, rng);
    picked.push(reward.name);
    addReward(game, reward, false);

    state.waveIndex = waveIndex + 1;
    game.startWave(waveIndex + 1);
  }

  return {
    clearedWaves: waveResults.filter((result) => result.cleared).length,
    waveResults,
    picked,
    finalHp: waveResults.at(-1)?.hp ?? 0,
  };
}

function summarize(results, options) {
  const total = results.length;
  const clears = Array.from({ length: options.waves }, (_, index) =>
    results.filter((result) => result.clearedWaves >= index + 1).length,
  );
  const avgTurns = Array.from({ length: options.waves }, (_, index) => {
    const waveResults = results.map((result) => result.waveResults[index]).filter(Boolean);
    if (!waveResults.length) return 0;
    return waveResults.reduce((sum, result) => sum + result.turns, 0) / waveResults.length;
  });
  const avgHpAfterClear = Array.from({ length: options.waves }, (_, index) => {
    const cleared = results
      .map((result) => result.waveResults[index])
      .filter((result) => result?.cleared);
    if (!cleared.length) return 0;
    return cleared.reduce((sum, result) => sum + result.hp, 0) / cleared.length;
  });
  const picks = new Map();
  results.flatMap((result) => result.picked).forEach((name) => {
    picks.set(name, (picks.get(name) ?? 0) + 1);
  });
  const topPicks = [...picks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  console.log(`strategy=${options.strategy}${options.tree ? ` tree=${options.tree}` : ""} runs=${total} ${options.scopeLabel ?? `waves=${options.waves}`} waves=${options.waves} seed=${options.seed}`);
  console.log("");
  console.log("Wave clear rates:");
  clears.forEach((count, index) => {
    const turnText = avgTurns[index] ? avgTurns[index].toFixed(1) : "-";
    const hpText = avgHpAfterClear[index] ? avgHpAfterClear[index].toFixed(1) : "-";
    console.log(`  W${index + 1}: ${count}/${total} (${((count / total) * 100).toFixed(1)}%) avgTurns=${turnText} avgHpAfterClear=${hpText}`);
  });
  if (options.stage || options.waves > 5) {
    console.log("");
    console.log("Stage clear rates:");
    for (let waveIndex = 14; waveIndex < options.waves; waveIndex += 15) {
      const stage = Math.floor(waveIndex / 15) + 1;
      const count = clears[waveIndex];
      console.log(`  S${stage}: ${count}/${total} (${((count / total) * 100).toFixed(1)}%)`);
    }
  }
  console.log("");
  console.log("Top picked cards:");
  topPicks.forEach(([name, count]) => {
    console.log(`  ${name}: ${count}`);
  });
}

async function main() {
  const options = parseArgs(process.argv);
  const results = [];
  const sharedContext = loadGame(options.seed, options);
  configureSimulationScope(options, sharedContext.__simExports);
  for (let i = 0; i < options.runs; i += 1) {
    const result = await simulateRun(options, i, sharedContext);
    results.push(result);
    if (options.verbose) {
      console.log(`#${i + 1} cleared=${result.clearedWaves}/${options.waves} hp=${result.finalHp} picks=${result.picked.join(", ")}`);
    }
  }
  summarize(results, options);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
