const SQRT3 = Math.sqrt(3);
const HEX_SIZE = 39;
const BOARD_PADDING = 90;
const TURN_DELAY = 540;

const directions = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const elements = {
  board: document.querySelector("#board"),
  runSummary: document.querySelector("#runSummary"),
  playerHp: document.querySelector("#playerHp"),
  deckCount: document.querySelector("#deckCount"),
  discardCount: document.querySelector("#discardCount"),
  drawnCards: document.querySelector("#drawnCards"),
  timeline: document.querySelector("#timeline"),
  battleLog: document.querySelector("#battleLog"),
  rewardOverlay: document.querySelector("#rewardOverlay"),
  rewardCards: document.querySelector("#rewardCards"),
  cardRevealOverlay: document.querySelector("#cardRevealOverlay"),
  cardRevealTitle: document.querySelector("#cardRevealTitle"),
  cardRevealList: document.querySelector("#cardRevealList"),
  iconHelpOverlay: document.querySelector("#iconHelpOverlay"),
  iconHelpButton: document.querySelector("#iconHelpButton"),
  closeHelpButton: document.querySelector("#closeHelpButton"),
  newRunButton: document.querySelector("#newRunButton"),
  pauseButton: document.querySelector("#pauseButton"),
};

const baseArcherCards = [
  card("move-1", "이동", "기본", "기본", 68, [{ type: "move", amount: 2 }], 4),
  card("shot-1", "사격", "기본", "기본", 36, [{ type: "attack", mult: 2, range: 2 }], 4),
  card(
    "shot-move-1",
    "사격 후 이동",
    "기본",
    "기본",
    42,
    [
      { type: "attack", mult: 2, range: 2 },
      { type: "move", amount: 2 },
    ],
    1,
  ),
  card(
    "paired-hex-shot",
    "붙은 두 칸 공격",
    "기본",
    "기본",
    38,
    [{ type: "patternAttack", mult: 2, range: 2, pattern: "adjacent-pair" }],
    1,
  ),
];

const rewardPool = [
  card("long-shot", "긴 사격", "공용", "노말", 34, [{ type: "attack", mult: 2, range: 3 }]),
  card("retreat-step", "후퇴 발걸음", "공용", "노말", 62, [{ type: "flee", amount: 3 }]),
  card("split-shot", "분산 사격", "공용", "노말", 35, [
    { type: "attack", mult: 1, range: 2, targets: 2 },
  ]),
  card("range-secure", "사거리 확보", "공용", "레어", 44, [
    { type: "move", amount: 3 },
    { type: "attack", mult: 2, range: 3 },
  ]),
  card("triple-cover", "세 갈래 견제", "공용", "레어", 46, [
    { type: "move", amount: 3 },
    { type: "attack", mult: 1, range: 2, targets: 3 },
  ]),
  card("double-shot", "연속 사격", "다단중첩", "노말", 35, [
    { type: "attack", mult: 1, range: 2 },
    { type: "attack", mult: 1, range: 2 },
  ]),
  card("triple-shot", "삼연사", "다단중첩", "레어", 35, [
    { type: "attack", mult: 1, range: 2 },
    { type: "attack", mult: 1, range: 2 },
    { type: "attack", mult: 1, range: 2 },
  ]),
  card("combo-sense", "연타 감각", "다단중첩", "레어", 32, [
    { type: "permanent", effect: "comboDamage", amount: 0.1 },
  ]),
  card("spike-obstacle", "가시 장애물 설치", "장애물", "노말", 58, [
    { type: "placeObstacle", range: 2, obstacle: "spike" },
  ]),
  card("push-shot", "밀기 사격", "장애물", "레어", 39, [
    { type: "attack", mult: 1, range: 2, push: 1 },
  ]),
  card("charge", "차지", "차지", "노말", 30, [{ type: "charge", amount: 1 }]),
  card("charge-2", "차지 2", "차지", "레어", 28, [{ type: "charge", amount: 2 }]),
  card("charged-shot", "차지 샷", "차지", "레어", 34, [
    { type: "attack", mult: 2, range: 3, consumeCharge: true },
  ]),
];

const enemyCard = card(
  "basic-claw",
  "이동 후 근접 공격",
  "적",
  "기본",
  52,
  [
    { type: "move", amount: 2, desiredRange: 1 },
    { type: "attack", mult: 2, range: 1, melee: true },
  ],
  4,
);

const waves = [
  {
    walls: [],
    enemies: [
      { q: -2, r: -1, hp: 20 },
      { q: 2, r: -2, hp: 20 },
    ],
  },
  {
    walls: [{ q: 0, r: 0 }],
    enemies: [
      { q: -3, r: 0, hp: 24 },
      { q: 3, r: -2, hp: 24 },
      { q: 1, r: -3, hp: 24 },
    ],
  },
  {
    walls: [
      { q: 0, r: 0 },
      { q: -1, r: 1 },
    ],
    enemies: [
      { q: -3, r: 1, hp: 28 },
      { q: 3, r: -2, hp: 28 },
      { q: 0, r: -3, hp: 36 },
      { q: 2, r: 1, hp: 28 },
    ],
  },
];

let state;

function card(id, name, route, rarity, priority, actions, copies = 1) {
  return { id, name, route, rarity, type: "기본", priority, actions, copies };
}

function newRun() {
  state = {
    paused: false,
    busy: false,
    finished: false,
    waitingReward: false,
    waveIndex: 0,
    turn: 0,
    nextEnemyIndex: 0,
    tiles: makeMap(3),
    walls: [],
    obstacles: [],
    entities: [],
    playerCards: expandCards(baseArcherCards),
    deck: [],
    discard: [],
    enemyDeck: [],
    enemyDiscard: [],
    currentTimeline: [],
    log: [],
  };

  startWave(0);
  log("새 런을 시작했다.");
  render();
  scheduleTurn();
}

function startWave(index) {
  const wave = waves[index];
  state.turn = 0;
  state.walls = wave.walls.map((item) => ({ ...item }));
  state.obstacles = [];
  state.entities = [
    {
      id: "archer",
      name: "궁수",
      side: "player",
      q: 0,
      r: 2,
      hp: state.entities.find((entity) => entity.id === "archer")?.hp ?? 70,
      maxHp: 70,
      baseAtk: 10,
      baseRange: 2,
      baseMove: 2,
      charge: 0,
      permanent: {},
      temporary: {},
    },
  ];

  wave.enemies.forEach((enemy) => {
    const indexNumber = state.nextEnemyIndex++;
    state.entities.push({
      id: `enemy-${indexNumber}`,
      name: `적 ${indexNumber}`,
      side: "enemy",
      q: enemy.q,
      r: enemy.r,
      hp: enemy.hp,
      maxHp: enemy.hp,
      baseAtk: 3,
      baseRange: 1,
      baseMove: 2,
      monsterIndex: indexNumber,
      charge: 0,
      permanent: {},
      temporary: {},
    });
  });

  state.deck = shuffle([...state.playerCards]);
  state.discard = [];
  state.enemyDeck = shuffle(expandCards([enemyCard]));
  state.enemyDiscard = [];
  state.waitingReward = false;
  state.busy = false;
  state.currentTimeline = [];
}

function expandCards(cards) {
  return cards.flatMap((entry) => {
    return Array.from({ length: entry.copies ?? 1 }, (_, copyIndex) => ({
      ...entry,
      instanceId: `${entry.id}-${Date.now()}-${Math.random()}-${copyIndex}`,
    }));
  });
}

function makeMap(radius) {
  const tiles = [];
  for (let q = -radius; q <= radius; q += 1) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r += 1) {
      tiles.push({ q, r });
    }
  }
  return tiles;
}

function scheduleTurn() {
  if (state.paused || state.busy || state.waitingReward || state.finished) return;
  window.setTimeout(() => runTurn(), TURN_DELAY);
}

async function runTurn() {
  if (state.paused || state.busy || state.waitingReward || state.finished) return;
  state.busy = true;
  state.turn += 1;
  state.currentTimeline = [];
  state.comboHits = {};

  const player = getPlayer();
  if (!player) {
    finishRun(false);
    return;
  }

  clearTemporaryAtTurnStart(player);
  const playerCard = drawPlayerCard();
  const enemyGroupCard = aliveEnemies().length ? drawEnemyCard() : null;
  const drawnEntries = [{ actorType: "player", actorId: player.id, card: playerCard }];

  if (enemyGroupCard) {
    drawnEntries.push({ actorType: "enemyGroup", actorId: "basic-enemies", card: enemyGroupCard });
  }

  const entries = [...drawnEntries].sort(compareTimeline);
  state.currentTimeline = entries;
  log(`턴 ${state.turn}: ${entries.map((entry) => entry.card.name).join(", ")}`);
  render();
  await playCardReveal(drawnEntries, entries);

  for (let index = 0; index < entries.length; index += 1) {
    if (state.finished || state.waitingReward) break;
    renderTimeline(index);
    await executeTimelineEntry(entries[index]);
    await sleep(TURN_DELAY);
    if (checkEndConditions()) break;
  }

  if (!state.waitingReward && !state.finished) {
    discardResolvedCard(playerCard);
    if (enemyGroupCard) discardEnemyCard(enemyGroupCard);
  }
  state.busy = false;
  render();
  scheduleTurn();
}

function compareTimeline(a, b) {
  if (a.card.priority !== b.card.priority) return a.card.priority - b.card.priority;
  if (a.actorType === "player" && b.actorType !== "player") return -1;
  if (b.actorType === "player" && a.actorType !== "player") return 1;
  return 0;
}

async function executeTimelineEntry(entry) {
  if (entry.actorType === "player") {
    const player = getPlayer();
    if (!player) return;
    await executeCard(player, entry.card);
    return;
  }

  const enemies = aliveEnemies().sort((a, b) => a.monsterIndex - b.monsterIndex);
  for (const enemy of enemies) {
    if (state.finished || state.waitingReward) break;
    if (!isAlive(enemy)) continue;
    await executeCard(enemy, entry.card);
    await sleep(TURN_DELAY * 0.55);
    if (checkEndConditions()) break;
  }
}

async function executeCard(actor, cardData) {
  log(`${actor.name} - ${cardData.name}`);

  for (const action of cardData.actions) {
    if (!isAlive(actor)) return;
    await executeAction(actor, action, cardData);
    render();
    await sleep(TURN_DELAY * 0.7);
    if (checkEndConditions()) return;
  }
}

async function executeAction(actor, action, cardData) {
  if (action.type === "move") {
    moveActor(actor, action, cardData);
    return;
  }
  if (action.type === "flee") {
    moveActor(actor, { ...action, flee: true }, cardData);
    return;
  }
  if (action.type === "attack") {
    attack(actor, action);
    return;
  }
  if (action.type === "patternAttack") {
    patternAttack(actor, action);
    return;
  }
  if (action.type === "charge") {
    actor.charge = (actor.charge ?? 0) + action.amount;
    actor.temporary.cannotMove = true;
    log(`${actor.name} 차지 ${actor.charge}`);
    return;
  }
  if (action.type === "permanent") {
    actor.permanent[action.effect] = (actor.permanent[action.effect] ?? 0) + action.amount;
    log(`${actor.name} 영구 효과: ${action.effect}`);
    return;
  }
  if (action.type === "placeObstacle") {
    placeObstacle(actor, action);
  }
}

function drawPlayerCard() {
  if (!state.deck.length) {
    state.deck = shuffle(state.discard);
    state.discard = [];
  }
  return state.deck.shift();
}

function drawEnemyCard() {
  if (!state.enemyDeck.length) {
    state.enemyDeck = shuffle(state.enemyDiscard);
    state.enemyDiscard = [];
  }
  return state.enemyDeck.shift();
}

function discardResolvedCard(cardData) {
  if (!cardData) return;
  if (cardData.actions.some((action) => action.type === "permanent")) return;
  state.discard.push(cardData);
}

function discardEnemyCard(cardData) {
  if (!cardData) return;
  if (cardData.actions.some((action) => action.type === "permanent")) return;
  state.enemyDiscard.push(cardData);
}

function clearTemporaryAtTurnStart(actor) {
  actor.temporary = {};
}

function attack(actor, action) {
  const targets = selectTargets(actor, action);
  if (!targets.length) {
    log(`${actor.name} 공격 실패`);
    return;
  }

  for (const target of targets) {
    if (!isAlive(actor)) return;
    if (!isAlive(target)) continue;
    let multiplier = action.mult;
    if (action.consumeCharge && actor.charge) {
      multiplier += actor.charge;
      log(`${actor.name} 차지 ${actor.charge} 소비`);
      actor.charge = 0;
      actor.temporary.cannotMove = false;
    }
    if (actor.permanent?.comboDamage) {
      const key = `${actor.id}-${target.id}`;
      state.comboHits = state.comboHits ?? {};
      multiplier *= 1 + (state.comboHits[key] ?? 0) * actor.permanent.comboDamage;
      state.comboHits[key] = (state.comboHits[key] ?? 0) + 1;
    }
    const distance = axialDistance(actor, target);
    const adjacentPenalty = !action.melee && distance <= 1 ? 0.7 : 1;
    const damage = Math.max(1, Math.round(actor.baseAtk * multiplier * adjacentPenalty));
    applyDamage(target, damage);
    showDamage(target, damage);
    log(`${actor.name} -> ${target.name} ${damage} 피해`);
    if (action.push && isAlive(target)) pushTarget(actor, target, action.push);
  }
}

function patternAttack(actor, action) {
  const pattern = bestAdjacentPair(actor, action.range);
  if (!pattern.length) {
    log(`${actor.name} 공격 실패`);
    return;
  }

  const targets = aliveOpponents(actor).filter((target) =>
    pattern.some((hex) => sameHex(hex, target)),
  );
  targets.forEach((target) => {
    const damage = Math.max(1, Math.round(actor.baseAtk * action.mult));
    applyDamage(target, damage);
    showDamage(target, damage);
    log(`${actor.name} -> ${target.name} ${damage} 피해`);
  });
}

function selectTargets(actor, action) {
  const candidates = aliveOpponents(actor)
    .filter((target) => canTarget(actor, target, action.range))
    .sort((a, b) => {
      if (a.hp !== b.hp) return a.hp - b.hp;
      const distanceA = axialDistance(actor, a);
      const distanceB = axialDistance(actor, b);
      if (distanceA !== distanceB) return distanceA - distanceB;
      return (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0);
    });

  return candidates.slice(0, action.targets ?? 1);
}

function moveActor(actor, action, cardData) {
  if (actor.temporary?.cannotMove) {
    log(`${actor.name} 이동 불가`);
    return;
  }

  const amount = action.amount ?? actor.baseMove;
  const reachable = reachableTiles(actor, amount, action.jump);
  if (!reachable.length) {
    log(`${actor.name} 이동 실패`);
    return;
  }

  const nextAttack = nextAttackAction(cardData, action);
  let destination;
  if (action.flee) {
    destination = bestFleeTile(actor, reachable);
  } else {
    destination = bestCombatMoveTile(actor, reachable, nextAttack ?? action);
  }

  if (!destination || sameHex(destination, actor)) {
    log(`${actor.name} 제자리`);
    return;
  }

  actor.q = destination.q;
  actor.r = destination.r;
  log(`${actor.name} 이동 (${actor.q}, ${actor.r})`);
  triggerTrap(actor);
}

function nextAttackAction(cardData, currentAction) {
  const index = cardData.actions.indexOf(currentAction);
  return cardData.actions.slice(index + 1).find((action) => {
    return action.type === "attack" || action.type === "patternAttack";
  });
}

function bestCombatMoveTile(actor, reachable, attackAction) {
  const opponents = aliveOpponents(actor);
  if (!opponents.length) return actor;
  const desiredRange = attackAction?.range ?? attackAction?.desiredRange ?? actor.baseRange;

  const scored = reachable.map((tile) => {
    const targetInfo = scoreTargetsFromTile(actor, tile, attackAction);
    const nearest = Math.min(...opponents.map((enemy) => axialDistance(tile, enemy)));
    const closestToDesired = -Math.abs(nearest - desiredRange);
    const farthestClosest = nearest;
    const moveCost = axialDistance(actor, tile);
    return {
      tile,
      hitCount: targetInfo.hitCount,
      lowestIndex: targetInfo.lowestIndex,
      closestToDesired,
      farthestClosest,
      moveCost,
    };
  });

  scored.sort((a, b) => {
    if (a.hitCount !== b.hitCount) return b.hitCount - a.hitCount;
    if (a.hitCount > 1 && a.farthestClosest !== b.farthestClosest) {
      return b.farthestClosest - a.farthestClosest;
    }
    if (a.closestToDesired !== b.closestToDesired) return b.closestToDesired - a.closestToDesired;
    if (a.moveCost !== b.moveCost) return a.moveCost - b.moveCost;
    return a.lowestIndex - b.lowestIndex;
  });

  return scored[0]?.tile ?? actor;
}

function scoreTargetsFromTile(actor, tile, attackAction) {
  if (!attackAction || (attackAction.type !== "attack" && attackAction.type !== "patternAttack")) {
    return { hitCount: 0, lowestIndex: 9999 };
  }
  if (attackAction.type === "patternAttack") {
    const pair = bestAdjacentPair(tile, attackAction.range, actor.side);
    const targets = aliveOpponents(actor).filter((target) => pair.some((hex) => sameHex(hex, target)));
    return {
      hitCount: targets.length,
      lowestIndex: Math.min(...targets.map((target) => target.monsterIndex ?? 0), 9999),
    };
  }
  const targets = aliveOpponents(actor).filter((target) =>
    canTargetFromTile(tile, actor.side, target, attackAction.range),
  );
  return {
    hitCount: Math.min(targets.length, attackAction.targets ?? 1),
    lowestIndex: Math.min(...targets.map((target) => target.monsterIndex ?? 0), 9999),
  };
}

function bestFleeTile(actor, reachable) {
  const opponents = aliveOpponents(actor);
  if (!opponents.length) return actor;
  return [...reachable].sort((a, b) => {
    const aMin = Math.min(...opponents.map((enemy) => axialDistance(a, enemy)));
    const bMin = Math.min(...opponents.map((enemy) => axialDistance(b, enemy)));
    if (aMin !== bMin) return bMin - aMin;
    return axialDistance(actor, a) - axialDistance(actor, b);
  })[0];
}

function reachableTiles(actor, maxDistance, jump = false) {
  const startKey = hexKey(actor);
  const queue = [{ q: actor.q, r: actor.r, distance: 0 }];
  const visited = new Map([[startKey, 0]]);
  const result = [];

  while (queue.length) {
    const current = queue.shift();
    if (current.distance > 0 && canEndMoveAt(current, actor)) result.push(current);
    if (current.distance >= maxDistance) continue;

    for (const dir of directions) {
      const next = { q: current.q + dir.q, r: current.r + dir.r };
      const key = hexKey(next);
      if (!isTile(next) || visited.has(key)) continue;
      if (!jump && blocksPath(next, actor)) continue;
      visited.set(key, current.distance + 1);
      queue.push({ ...next, distance: current.distance + 1 });
    }
  }

  return result;
}

function canEndMoveAt(tile, actor) {
  if (isWall(tile) || isObstacle(tile)) return false;
  return !state.entities.some((entity) => isAlive(entity) && entity.id !== actor.id && sameHex(entity, tile));
}

function blocksPath(tile, actor) {
  if (isWall(tile) || isObstacle(tile)) return true;
  return state.entities.some((entity) => {
    if (!isAlive(entity) || entity.id === actor.id) return false;
    return sameHex(entity, tile) && entity.side !== actor.side;
  });
}

function pushTarget(actor, target, amount) {
  let current = { q: target.q, r: target.r };
  const direction = directionAway(actor, target);
  for (let step = 0; step < amount; step += 1) {
    const next = { q: current.q + direction.q, r: current.r + direction.r };
    if (!isTile(next) || !canEndMoveAt(next, target)) {
      const obstacle = state.obstacles.find((item) => sameHex(item, next));
      if (obstacle?.kind === "spike") {
        applyDamage(target, actor.baseAtk * 2);
        showDamage(target, actor.baseAtk * 2);
        log(`${target.name} 가시 장애물 충돌`);
      }
      break;
    }
    current = next;
  }
  target.q = current.q;
  target.r = current.r;
}

function directionAway(actor, target) {
  return directions
    .map((dir) => {
      const next = { q: target.q + dir.q, r: target.r + dir.r };
      return { dir, distance: axialDistance(actor, next) };
    })
    .sort((a, b) => b.distance - a.distance)[0].dir;
}

function placeObstacle(actor, action) {
  const reachable = state.tiles
    .filter((tile) => axialDistance(actor, tile) <= action.range)
    .filter((tile) => !sameHex(tile, actor))
    .filter((tile) => canEndMoveAt(tile, actor))
    .sort((a, b) => {
      const aNearEnemy = Math.min(...aliveOpponents(actor).map((enemy) => axialDistance(a, enemy)));
      const bNearEnemy = Math.min(...aliveOpponents(actor).map((enemy) => axialDistance(b, enemy)));
      if (aNearEnemy !== bNearEnemy) return aNearEnemy - bNearEnemy;
      return axialDistance(actor, a) - axialDistance(actor, b);
    });

  const tile = reachable[0];
  if (!tile) {
    log(`${actor.name} 장애물 설치 실패`);
    return;
  }
  state.obstacles.push({ q: tile.q, r: tile.r, kind: action.obstacle });
  log(`${actor.name} 장애물 설치 (${tile.q}, ${tile.r})`);
}

function bestAdjacentPair(actorOrTile, range, side = actorOrTile.side) {
  const origin = actorOrTile;
  const candidates = [];
  for (const tile of state.tiles) {
    if (wallAwareDistance(origin, tile) > range || !hasLineOfSight(origin, tile)) continue;
    for (const dir of directions) {
      const other = { q: tile.q + dir.q, r: tile.r + dir.r };
      if (!isTile(other)) continue;
      if (wallAwareDistance(origin, other) > range || !hasLineOfSight(origin, other)) continue;
      const pair = [tile, other];
      const targets = state.entities.filter((entity) => {
        return isAlive(entity) && entity.side !== side && pair.some((hex) => sameHex(hex, entity));
      });
      if (targets.length) {
        candidates.push({
          pair,
          count: targets.length,
          distance: Math.min(...pair.map((hex) => axialDistance(origin, hex))),
          index: Math.min(...targets.map((target) => target.monsterIndex ?? 0)),
        });
      }
    }
  }
  candidates.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.index - b.index;
  });
  return candidates[0]?.pair ?? [];
}

function canTarget(actor, target, range) {
  return canTargetFromTile(actor, actor.side, target, range);
}

function canTargetFromTile(origin, side, target, range) {
  if (!isAlive(target) || target.side === side) return false;
  return wallAwareDistance(origin, target) <= range && hasLineOfSight(origin, target);
}

function wallAwareDistance(from, to) {
  if (!state.walls.length) return axialDistance(from, to);
  const queue = [{ q: from.q, r: from.r, distance: 0 }];
  const visited = new Set([hexKey(from)]);
  while (queue.length) {
    const current = queue.shift();
    if (sameHex(current, to)) return current.distance;
    for (const dir of directions) {
      const next = { q: current.q + dir.q, r: current.r + dir.r };
      const key = hexKey(next);
      if (!isTile(next) || visited.has(key) || isWall(next)) continue;
      visited.add(key);
      queue.push({ ...next, distance: current.distance + 1 });
    }
  }
  return 999;
}

function hasLineOfSight(from, to) {
  const fromVertices = hexVertices(from);
  const toVertices = hexVertices(to);
  const wallPolygons = state.walls.map(hexVertices);
  for (const a of fromVertices) {
    for (const b of toVertices) {
      const blocked = wallPolygons.some((polygon) => segmentTouchesPolygon(a, b, polygon));
      if (!blocked) return true;
    }
  }
  return false;
}

function segmentTouchesPolygon(a, b, polygon) {
  for (let i = 0; i < polygon.length; i += 1) {
    const c = polygon[i];
    const d = polygon[(i + 1) % polygon.length];
    if (segmentsIntersect(a, b, c, d)) return true;
  }
  return pointInPolygon(a, polygon) || pointInPolygon(b, polygon);
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return false;
}

function orientation(a, b, c) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < 0.0001) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a, b, c) {
  return (
    b.x <= Math.max(a.x, c.x) + 0.0001 &&
    b.x >= Math.min(a.x, c.x) - 0.0001 &&
    b.y <= Math.max(a.y, c.y) + 0.0001 &&
    b.y >= Math.min(a.y, c.y) - 0.0001
  );
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function applyDamage(target, damage) {
  target.hp = Math.max(0, target.hp - damage);
  if (target.hp <= 0) log(`${target.name} 사망`);
}

function checkEndConditions() {
  if (state.waitingReward || state.finished) return true;
  if (!getPlayer()) {
    finishRun(false);
    return true;
  }
  if (!aliveEnemies().length) {
    clearWave();
    return true;
  }
  return false;
}

function clearWave() {
  if (state.waitingReward || state.finished) return;
  log(`웨이브 ${state.waveIndex + 1} 클리어`);
  if (state.waveIndex >= waves.length - 1) {
    finishRun(true);
    return;
  }
  state.waitingReward = true;
  state.discard = [];
  state.deck = shuffle([...state.playerCards]);
  showRewards();
}

function finishRun(win) {
  state.finished = true;
  state.busy = false;
  state.waitingReward = false;
  log(win ? "스테이지 클리어" : "패배");
  render();
}

function showRewards() {
  const rewards = drawRewards();
  elements.rewardCards.innerHTML = "";
  rewards.forEach((reward) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reward-card";
    button.innerHTML = `
      <strong>${reward.name}</strong>
      <span class="rarity">${reward.rarity}</span>
      <span class="route">${reward.route}</span>
      <span>${describeCard(reward)}</span>
      <span class="spacer"></span>
      <span class="pick">선택</span>
    `;
    button.addEventListener("click", () => pickReward(reward));
    elements.rewardCards.append(button);
  });
  elements.rewardOverlay.classList.remove("hidden");
}

function drawRewards() {
  return shuffle(rewardPool).slice(0, 3).map((entry) => ({
    ...entry,
    instanceId: `${entry.id}-${Date.now()}-${Math.random()}`,
  }));
}

function pickReward(reward) {
  state.playerCards.push(reward);
  elements.rewardOverlay.classList.add("hidden");
  log(`보상 선택: ${reward.name}`);
  state.waveIndex += 1;
  startWave(state.waveIndex);
  render();
  scheduleTurn();
}

function render() {
  renderBoard();
  renderHud();
  renderDrawnCards();
  renderTimeline();
  renderLog();
}

function renderBoard() {
  elements.board.innerHTML = "";
  const bounds = boardBounds();
  fitBoardToPanel(bounds);

  for (const tile of state.tiles) {
    const point = hexToPixel(tile, bounds);
    const div = document.createElement("div");
    div.className = "hex";
    if (isWall(tile)) div.classList.add("wall");
    if (isObstacle(tile)) div.classList.add("obstacle");
    div.style.left = `${point.x}px`;
    div.style.top = `${point.y}px`;
    elements.board.append(div);
  }

  for (const entity of state.entities.filter(isAlive)) {
    const point = hexToPixel(entity, bounds);
    const div = document.createElement("div");
    div.className = `entity ${entity.side}`;
    div.textContent = entity.side === "player" ? "궁" : entity.monsterIndex;
    div.title = `${entity.name} ${entity.hp}/${entity.maxHp}`;
    div.style.left = `${point.x}px`;
    div.style.top = `${point.y}px`;
    elements.board.append(div);
  }
}

function renderHud() {
  const player = getPlayer();
  elements.runSummary.textContent = state.finished
    ? "런 종료"
    : `웨이브 ${state.waveIndex + 1} / 턴 ${state.turn}`;
  elements.playerHp.textContent = player ? `${player.hp} / ${player.maxHp}` : "0 / 70";
  elements.deckCount.textContent = state.deck.length;
  elements.discardCount.textContent = state.discard.length;
  elements.pauseButton.textContent = state.paused ? "재개" : "일시정지";
}

function renderDrawnCards() {
  elements.drawnCards.innerHTML = "";
  state.currentTimeline.forEach((entry, index) => {
    const div = document.createElement("div");
    div.className = `order-chip ${entry.actorType === "player" ? "player" : "enemy"}`;
    div.title = `${entryLabel(entry)} · ${entry.card.name} · PRI ${entry.card.priority}`;
    div.innerHTML = `<span>${index + 1}</span><strong>${entry.actorType === "player" ? "궁" : "적"}</strong>`;
    elements.drawnCards.append(div);
  });
}

function renderTimeline(activeIndex = -1) {
  elements.timeline.innerHTML = "";
  state.currentTimeline.forEach((entry, index) => {
    const li = document.createElement("li");
    if (index === activeIndex) li.classList.add("active");
    li.innerHTML = `<span>${entry.card.priority}</span><strong>${entryLabel(entry)}</strong><span>${entry.card.name}</span>`;
    elements.timeline.append(li);
  });
}

function renderLog() {
  elements.battleLog.innerHTML = "";
  state.log.slice(-40).forEach((item) => {
    const p = document.createElement("p");
    p.textContent = item;
    elements.battleLog.append(p);
  });
  elements.battleLog.scrollTop = elements.battleLog.scrollHeight;
}

async function playCardReveal(drawnEntries, sortedEntries) {
  document.body.classList.add("revealing-cards");
  elements.cardRevealOverlay.className = "card-reveal-overlay";
  elements.cardRevealTitle.textContent = "우선권";
  renderRevealCards(drawnEntries);
  await sleep(1000);

  elements.cardRevealOverlay.classList.add("sorting");
  slideSortRevealCards(sortedEntries);
  await sleep(820);

  elements.cardRevealOverlay.classList.add("dock");
  await sleep(520);
  elements.cardRevealOverlay.className = "card-reveal-overlay hidden";
  document.body.classList.remove("revealing-cards");
}

function renderRevealCards(entries) {
  elements.cardRevealList.innerHTML = "";
  entries.forEach((entry, index) => {
    const div = document.createElement("article");
    div.className = `reveal-card ${entry.actorType === "player" ? "player" : "enemy"}`;
    div.dataset.entryKey = entryKey(entry);
    div.innerHTML = `
      <b class="order-number">${index + 1}</b>
      <strong>${entry.card.name}</strong>
      <span>${entryLabel(entry)}</span>
      <span class="priority">PRI ${entry.card.priority}</span>
      <span>${describeCard(entry.card)}</span>
    `;
    elements.cardRevealList.append(div);
  });
}

function slideSortRevealCards(sortedEntries) {
  const currentCards = [...elements.cardRevealList.children];
  const firstRects = new Map(
    currentCards.map((cardElement) => [cardElement.dataset.entryKey, cardElement.getBoundingClientRect()]),
  );
  const cardsByKey = new Map(currentCards.map((cardElement) => [cardElement.dataset.entryKey, cardElement]));

  sortedEntries.forEach((entry) => {
    const cardElement = cardsByKey.get(entryKey(entry));
    if (cardElement) elements.cardRevealList.append(cardElement);
  });

  [...elements.cardRevealList.children].forEach((cardElement, index) => {
    cardElement.querySelector(".order-number").textContent = index + 1;
    const firstRect = firstRects.get(cardElement.dataset.entryKey);
    const lastRect = cardElement.getBoundingClientRect();
    if (!firstRect) return;

    const x = firstRect.left - lastRect.left;
    const y = firstRect.top - lastRect.top;
    cardElement.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
      ],
      { duration: 560, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  });
}

function entryKey(entry) {
  return `${entry.actorType}-${entry.actorId}-${entry.card.instanceId ?? entry.card.id}`;
}

function describeCard(cardData) {
  return cardData.actions.map(describeAction).join(" -> ");
}

function describeAction(action) {
  if (action.type === "move") return `MOV ${action.amount}`;
  if (action.type === "flee") return `도망 ${action.amount}`;
  if (action.type === "attack") {
    const targetText = action.targets ? `, TGT ${action.targets}` : "";
    const pushText = action.push ? `, 밀기 ${action.push}` : "";
    return `ATK ${action.mult}, RNG ${action.range}${targetText}${pushText}`;
  }
  if (action.type === "patternAttack") return `붙은 두 칸 ATK ${action.mult}, RNG ${action.range}`;
  if (action.type === "charge") return `차지 ${action.amount}`;
  if (action.type === "permanent") return `영구 효과`;
  if (action.type === "placeObstacle") return `장애물 설치 RNG ${action.range}`;
  return action.type;
}

function entryLabel(entry) {
  return entry.actorType === "player" ? "궁수" : "기본 적";
}

function showDamage(target, damage) {
  const bounds = boardBounds();
  fitBoardToPanel(bounds);
  const point = hexToPixel(target, bounds);
  const div = document.createElement("div");
  div.className = "damage-pop";
  div.textContent = `-${damage}`;
  div.style.left = `${point.x}px`;
  div.style.top = `${point.y}px`;
  elements.board.append(div);
  window.setTimeout(() => div.remove(), 720);
}

function boardBounds() {
  const points = state.tiles.map((tile) => rawHexToPixel(tile));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function fitBoardToPanel(bounds = boardBounds()) {
  const logicalWidth = Math.max(620, bounds.width + BOARD_PADDING * 2);
  const logicalHeight = Math.max(620, bounds.height + BOARD_PADDING * 2);
  const panel = elements.board.parentElement;
  const panelWidth = Math.max(1, panel.clientWidth);
  const panelHeight = Math.max(1, panel.clientHeight);
  const scale = Math.min(panelWidth / logicalWidth, panelHeight / logicalHeight);
  const offsetX = Math.max(0, (panelWidth - logicalWidth * scale) / 2);
  const offsetY = Math.max(0, (panelHeight - logicalHeight * scale) / 2);

  elements.board.style.setProperty("--board-width", `${logicalWidth}px`);
  elements.board.style.setProperty("--board-height", `${logicalHeight}px`);
  elements.board.style.setProperty("--board-scale", `${scale}`);
  elements.board.style.left = `${offsetX}px`;
  elements.board.style.top = `${offsetY}px`;
}

function hexToPixel(hex, bounds) {
  const point = rawHexToPixel(hex);
  return {
    x: point.x - bounds.minX + BOARD_PADDING,
    y: point.y - bounds.minY + BOARD_PADDING,
  };
}

function rawHexToPixel(hex) {
  return {
    x: HEX_SIZE * SQRT3 * (hex.q + hex.r / 2),
    y: HEX_SIZE * 1.5 * hex.r,
  };
}

function hexVertices(hex) {
  const center = rawHexToPixel(hex);
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return {
      x: center.x + HEX_SIZE * Math.cos(angle),
      y: center.y + HEX_SIZE * Math.sin(angle),
    };
  });
}

function getPlayer() {
  return state.entities.find((entity) => entity.side === "player" && isAlive(entity));
}

function aliveEnemies() {
  return state.entities.filter((entity) => entity.side === "enemy" && isAlive(entity));
}

function aliveOpponents(actor) {
  return state.entities.filter((entity) => entity.side !== actor.side && isAlive(entity));
}

function isAlive(entity) {
  return entity && entity.hp > 0;
}

function isTile(hex) {
  return state.tiles.some((tile) => sameHex(tile, hex));
}

function isWall(hex) {
  return state.walls.some((wall) => sameHex(wall, hex));
}

function isObstacle(hex) {
  return state.obstacles.some((obstacle) => sameHex(obstacle, hex));
}

function triggerTrap() {}

function axialDistance(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

function sameHex(a, b) {
  return a.q === b.q && a.r === b.r;
}

function hexKey(hex) {
  return `${hex.q},${hex.r}`;
}

function shuffle(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function log(message) {
  state.log.push(message);
}

elements.newRunButton.addEventListener("click", newRun);
elements.pauseButton.addEventListener("click", () => {
  state.paused = !state.paused;
  render();
  scheduleTurn();
});
elements.iconHelpButton.addEventListener("click", () => {
  elements.iconHelpOverlay.classList.remove("hidden");
});
elements.closeHelpButton.addEventListener("click", () => {
  elements.iconHelpOverlay.classList.add("hidden");
});
window.addEventListener("resize", () => {
  renderBoard();
});

newRun();
