const SQRT3 = Math.sqrt(3);
const HEX_SIZE = 39;
const BOARD_PADDING = 90;
const TURN_DELAY = 540;
const WAVE_INTRO_DELAY = 1300;
const CAMERA_FOCUS_DELAY = 360;

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
  boardPanel: document.querySelector(".board-panel"),
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
  card("advance-shot", "전진 사격", "기본", "기본", 44, [
    { type: "move", amount: 2 },
    { type: "attack", mult: 1, range: 2 },
  ], 3),
  card("retreat-shot", "후퇴 사격", "기본", "기본", 42, [
    { type: "attack", mult: 1, range: 2 },
    { type: "flee", amount: 2 },
  ], 2),
  card("aimed-shot", "정조준", "기본", "기본", 34, [{ type: "attack", mult: 2, range: 2 }], 1),
  card("keep-distance", "거리 벌리기", "기본", "기본", 66, [{ type: "flee", amount: 3 }], 1),
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

const enemyCards = [
  card("enemy-advance-claw", "접근 공격", "적", "기본", 58, [
    { type: "move", amount: 2, desiredRange: 1 },
    { type: "attack", mult: 1, range: 1, melee: true },
  ], 3),
  card("enemy-claw-step", "공격 후 접근", "적", "기본", 54, [
    { type: "attack", mult: 1, range: 1, melee: true },
    { type: "move", amount: 1, desiredRange: 1 },
  ], 2),
  card("enemy-move", "이동", "적", "기본", 66, [{ type: "move", amount: 2, desiredRange: 1 }], 1),
  card("enemy-claw", "근접 공격", "적", "기본", 50, [
    { type: "attack", mult: 2, range: 1, melee: true },
  ], 1),
  card(
    "enemy-move-claw",
    "강한 접근 공격",
    "적",
    "기본",
    56,
    [
      { type: "move", amount: 2, desiredRange: 1 },
      { type: "attack", mult: 2, range: 1, melee: true },
    ],
    1,
  ),
];

const waves = buildWaves();

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
    enemySustainedCards: [],
    currentTimeline: [],
    activeTimelineIndex: -1,
    completedTimelineCount: 0,
    cameraMode: "overview",
    cameraTransitionScheduled: false,
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
  state.tiles = makeMap(wave.radius ?? 3);
  state.walls = wave.walls.map((item) => ({ ...item }));
  state.obstacles = [];
  state.cameraMode = "overview";
  state.cameraTransitionScheduled = false;
  const start = wave.playerStart ?? { q: 0, r: Math.min(2, (wave.radius ?? 3) - 1) };
  state.entities = [
    {
      id: "archer",
      name: "궁수",
      side: "player",
      q: start.q,
      r: start.r,
      hp: state.entities.find((entity) => entity.id === "archer")?.hp ?? 70,
      maxHp: 70,
      baseAtk: 10,
      baseRange: 2,
      baseMove: 2,
      charge: 0,
      permanent: {},
      temporary: {},
      sustainedCards: [],
    },
  ];

  wave.enemies.forEach((enemy) => {
    const indexNumber = state.nextEnemyIndex++;
    state.entities.push({
      id: `enemy-${indexNumber}`,
      name: enemy.name ?? (enemy.boss ? `보스 ${indexNumber}` : `적 ${indexNumber}`),
      side: "enemy",
      q: enemy.q,
      r: enemy.r,
      hp: enemy.hp,
      maxHp: enemy.hp,
      baseAtk: enemy.baseAtk ?? (enemy.boss ? 5 : 3),
      baseRange: 1,
      baseMove: 2,
      monsterIndex: indexNumber,
      boss: Boolean(enemy.boss),
      charge: 0,
      permanent: {},
      temporary: {},
      sustainedCards: [],
    });
  });

  state.deck = shuffle([...state.playerCards]);
  state.discard = [];
  state.enemyDeck = shuffle(expandCards(enemyCards));
  state.enemyDiscard = [];
  state.enemySustainedCards = [];
  state.waitingReward = false;
  state.busy = false;
  state.currentTimeline = [];
  state.activeTimelineIndex = -1;
  state.completedTimelineCount = 0;
}

function expandCards(cards) {
  return cards.flatMap((entry) => {
    return Array.from({ length: entry.copies ?? 1 }, (_, copyIndex) => ({
      ...entry,
      instanceId: `${entry.id}-${Date.now()}-${Math.random()}-${copyIndex}`,
    }));
  });
}

function buildWaves() {
  return [
    wave(3, [], [
      enemy(-2, -1, 20),
      enemy(2, -2, 20),
    ]),
    wave(3, [{ q: 0, r: 0 }], [
      enemy(-3, 0, 24),
      enemy(3, -2, 24),
      enemy(1, -3, 24),
    ]),
    wave(4, [{ q: 0, r: 0 }, { q: -1, r: 1 }], [
      enemy(-3, 1, 28),
      enemy(3, -2, 28),
      enemy(0, -4, 32),
      enemy(2, 1, 28),
    ]),
    wave(4, [{ q: 0, r: -1 }, { q: 1, r: -1 }], [
      enemy(-4, 1, 30),
      enemy(-2, -2, 30),
      enemy(3, -3, 30),
      enemy(3, 0, 30),
    ]),
    wave(4, [{ q: -1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: 1 }], [
      enemy(0, -4, 80, { boss: true, name: "보스 1", baseAtk: 5 }),
      enemy(-3, 0, 28),
      enemy(3, -2, 28),
    ]),
    wave(4, [{ q: 0, r: 0 }, { q: -2, r: 2 }], [
      enemy(-4, 2, 34),
      enemy(-2, -2, 34),
      enemy(2, -4, 34),
      enemy(4, -2, 34),
    ]),
    wave(5, [{ q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -2 }], [
      enemy(-5, 2, 36),
      enemy(-3, -1, 36),
      enemy(0, -5, 42),
      enemy(4, -4, 36),
      enemy(4, 0, 36),
    ]),
    wave(5, [{ q: -2, r: 1 }, { q: 0, r: 0 }, { q: 2, r: -2 }], [
      enemy(-5, 3, 38),
      enemy(-4, 0, 38),
      enemy(0, -5, 38),
      enemy(3, -5, 38),
      enemy(5, -2, 38),
    ]),
    wave(5, [{ q: -1, r: 1 }, { q: 1, r: -1 }, { q: 2, r: -3 }], [
      enemy(-5, 1, 40),
      enemy(-3, -2, 40),
      enemy(0, -5, 46),
      enemy(3, -4, 40),
      enemy(5, -3, 40),
      enemy(4, 0, 40),
    ]),
    wave(5, [{ q: -2, r: 2 }, { q: 0, r: 0 }, { q: 2, r: -2 }, { q: 1, r: 1 }], [
      enemy(0, -5, 130, { boss: true, name: "보스 2", baseAtk: 6 }),
      enemy(-4, 1, 42),
      enemy(4, -3, 42),
      enemy(5, -1, 42),
    ]),
    wave(5, [{ q: -1, r: 0 }, { q: 0, r: 1 }, { q: 1, r: -2 }], [
      enemy(-5, 3, 44),
      enemy(-4, -1, 44),
      enemy(-1, -4, 44),
      enemy(2, -5, 44),
      enemy(5, -3, 44),
      enemy(5, 0, 44),
    ]),
    wave(6, [{ q: -2, r: 1 }, { q: -1, r: 2 }, { q: 1, r: -1 }, { q: 2, r: -3 }], [
      enemy(-6, 3, 48),
      enemy(-5, 0, 48),
      enemy(-2, -4, 48),
      enemy(1, -6, 48),
      enemy(5, -5, 48),
      enemy(6, -2, 48),
    ]),
    wave(6, [{ q: -2, r: 2 }, { q: 0, r: 0 }, { q: 2, r: -2 }, { q: 3, r: -4 }], [
      enemy(-6, 2, 52),
      enemy(-5, -1, 52),
      enemy(-2, -4, 52),
      enemy(2, -6, 52),
      enemy(5, -5, 52),
      enemy(6, -3, 52),
      enemy(4, 1, 52),
    ]),
    wave(6, [{ q: -3, r: 2 }, { q: -1, r: 1 }, { q: 1, r: -1 }, { q: 3, r: -3 }], [
      enemy(-6, 4, 56),
      enemy(-6, 1, 56),
      enemy(-3, -3, 56),
      enemy(0, -6, 62),
      enemy(4, -6, 56),
      enemy(6, -4, 56),
      enemy(6, -1, 56),
    ]),
    wave(6, [{ q: -2, r: 2 }, { q: 0, r: 0 }, { q: 2, r: -2 }, { q: 1, r: 1 }, { q: -1, r: -1 }], [
      enemy(0, -6, 200, { boss: true, name: "최종 보스", baseAtk: 7 }),
      enemy(-6, 2, 60),
      enemy(-4, -1, 60),
      enemy(4, -5, 60),
      enemy(6, -3, 60),
    ]),
  ];
}

function wave(radius, walls, enemies) {
  return { radius, playerStart: { q: 0, r: Math.min(2, radius - 1) }, walls, enemies, boss: enemies.some((item) => item.boss) };
}

function enemy(q, r, hp, options = {}) {
  return { q, r, hp, ...options };
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
  if (state.cameraMode === "overview") {
    if (state.cameraTransitionScheduled) return;
    state.cameraTransitionScheduled = true;
    window.setTimeout(() => {
      state.cameraTransitionScheduled = false;
      if (state.paused || state.busy || state.waitingReward || state.finished) return;
      state.cameraMode = "focus";
      renderBoard();
      window.setTimeout(() => scheduleTurn(), CAMERA_FOCUS_DELAY);
    }, WAVE_INTRO_DELAY);
    return;
  }
  window.setTimeout(() => runTurn(), TURN_DELAY);
}

async function runTurn() {
  if (state.paused || state.busy || state.waitingReward || state.finished) return;
  state.busy = true;
  state.turn += 1;
  state.currentTimeline = [];
  state.activeTimelineIndex = -1;
  state.completedTimelineCount = 0;
  state.comboHits = {};

  const player = getPlayer();
  if (!player) {
    finishRun(false);
    return;
  }

  const playerCard = drawPlayerCard();
  const enemyGroupCard = aliveEnemies().length ? drawEnemyCard() : null;
  const drawnEntries = [{ actorType: "player", actorId: player.id, card: playerCard }];

  if (enemyGroupCard) {
    drawnEntries.push({ actorType: "enemyGroup", actorId: "basic-enemies", card: enemyGroupCard });
  }

  const entries = [...drawnEntries].sort(compareTimeline);
  state.currentTimeline = entries;
  state.activeTimelineIndex = -1;
  state.completedTimelineCount = 0;
  log(`턴 ${state.turn}: ${entries.map((entry) => entry.card.name).join(", ")}`);
  render();
  await playCardReveal(drawnEntries, entries);

  for (let index = 0; index < entries.length; index += 1) {
    if (state.finished || state.waitingReward) break;
    state.activeTimelineIndex = index;
    renderDrawnCards();
    renderTimeline(index);
    await executeTimelineEntry(entries[index]);
    expireTurnEndEffects(entries[index]);
    state.completedTimelineCount = Math.max(state.completedTimelineCount, index + 1);
    state.activeTimelineIndex = -1;
    renderDrawnCards();
    renderTimeline();
    await sleep(TURN_DELAY);
    if (checkEndConditions()) break;
  }

  if (!state.waitingReward && !state.finished) {
    discardResolvedCard(playerCard, player);
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
  if (!enemies.length) {
    checkEndConditions();
    return;
  }

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
    const rendered = await executeAction(actor, action, cardData);
    if (!rendered) render();
    await sleep(TURN_DELAY * 0.7);
    if (checkEndConditions()) return;
  }
}

async function executeAction(actor, action, cardData) {
  if (action.type === "move") {
    await moveActor(actor, action, cardData);
    return true;
  }
  if (action.type === "flee") {
    await moveActor(actor, { ...action, flee: true }, cardData);
    return true;
  }
  if (action.type === "attack") {
    attack(actor, action);
    return true;
  }
  if (action.type === "patternAttack") {
    patternAttack(actor, action);
    return true;
  }
  if (action.type === "charge") {
    actor.charge = (actor.charge ?? 0) + action.amount;
    actor.temporary.cannotMove = true;
    log(`${actor.name} 차지 ${actor.charge}`);
    return false;
  }
  if (action.type === "permanent") {
    actor.permanent[action.effect] = (actor.permanent[action.effect] ?? 0) + action.amount;
    log(`${actor.name} 영구 효과: ${action.effect}`);
    return false;
  }
  if (action.type === "placeObstacle") {
    placeObstacle(actor, action);
  }
  return false;
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

function discardResolvedCard(cardData, actor) {
  if (!cardData) return;
  if (cardData.actions.some((action) => action.type === "permanent")) return;
  if (isSustainCard(cardData) && actor) {
    actor.sustainedCards = actor.sustainedCards ?? [];
    actor.sustainedCards.push({ card: cardData, discardAfterTurn: state.turn + 1 });
    return;
  }
  state.discard.push(cardData);
}

function discardEnemyCard(cardData) {
  if (!cardData) return;
  if (cardData.actions.some((action) => action.type === "permanent")) return;
  if (isSustainCard(cardData)) {
    state.enemySustainedCards = state.enemySustainedCards ?? [];
    state.enemySustainedCards.push({ card: cardData, discardAfterTurn: state.turn + 1 });
    return;
  }
  state.enemyDiscard.push(cardData);
}

function isSustainCard(cardData) {
  return cardData?.type === "지속";
}

function expireTurnEndEffects(entry) {
  if (entry.actorType === "player") {
    const actor = state.entities.find((entity) => entity.id === entry.actorId);
    if (actor) expireActorTurnEndEffects(actor, state.discard);
    return;
  }

  if (entry.actorType === "enemyGroup") {
    state.entities.filter((entity) => entity.side === "enemy").forEach((enemy) => {
      expireTemporaryEffectsAtTurnEnd(enemy);
    });
    releaseExpiredSustainedCards(state.enemySustainedCards, state.enemyDiscard);
  }
}

function expireActorTurnEndEffects(actor, discardPile) {
  expireTemporaryEffectsAtTurnEnd(actor);
  releaseExpiredSustainedCards(actor.sustainedCards, discardPile);
}

function expireTemporaryEffectsAtTurnEnd(actor) {
  if (!actor.temporary) return;
  Object.entries(actor.temporary).forEach(([key, effect]) => {
    if (effect?.expiresAfterOwnTurnEnds && effect.expiresAfterOwnTurnEnds <= state.turn) {
      delete actor.temporary[key];
    }
  });
}

function releaseExpiredSustainedCards(sustainedCards = [], discardPile) {
  if (!discardPile) return;
  for (let index = sustainedCards.length - 1; index >= 0; index -= 1) {
    if (sustainedCards[index].discardAfterTurn <= state.turn) {
      discardPile.push(sustainedCards[index].card);
      sustainedCards.splice(index, 1);
    }
  }
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
    const hitPosition = { q: target.q, r: target.r };
    applyDamage(target, damage);
    renderBoard();
    renderHud();
    showHitEffect(target, hitPosition, damage);
    log(`${actor.name} -> ${target.name} ${damage} 피해`);
    if (action.push && isAlive(target)) pushTarget(actor, target, action.push);
  }
}

function patternAttack(actor, action) {
  const placement = bestPatternPlacement(action.pattern, actor, action.range, actor.side);
  if (!placement.tiles.length) {
    log(`${actor.name} 공격 실패`);
    return;
  }

  placement.targets.forEach((target) => {
    const distance = axialDistance(actor, target);
    const adjacentPenalty = !action.melee && distance <= 1 ? 0.7 : 1;
    const damage = Math.max(1, Math.round(actor.baseAtk * action.mult * adjacentPenalty));
    const hitPosition = { q: target.q, r: target.r };
    applyDamage(target, damage);
    renderBoard();
    renderHud();
    showHitEffect(target, hitPosition, damage);
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

async function moveActor(actor, action, cardData) {
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

  const path = findMovePath(actor, destination, action.jump);
  await animateActorPath(actor, path.length ? path : [destination]);
  log(`${actor.name} 이동 (${actor.q}, ${actor.r})`);
  triggerTrap(actor);
}

function findMovePath(actor, destination, jump = false) {
  const start = { q: actor.q, r: actor.r };
  const startKey = hexKey(start);
  const destinationKey = hexKey(destination);
  const queue = [start];
  const parentByKey = new Map([[startKey, null]]);

  while (queue.length) {
    const current = queue.shift();
    if (hexKey(current) === destinationKey) break;

    for (const dir of directions) {
      const next = { q: current.q + dir.q, r: current.r + dir.r };
      const key = hexKey(next);
      if (!isTile(next) || parentByKey.has(key)) continue;
      if (!jump && blocksPath(next, actor)) continue;
      parentByKey.set(key, current);
      queue.push(next);
    }
  }

  if (!parentByKey.has(destinationKey)) return [];

  const path = [];
  let current = destination;
  while (current && hexKey(current) !== startKey) {
    path.unshift({ q: current.q, r: current.r });
    current = parentByKey.get(hexKey(current));
  }
  return path;
}

async function animateActorPath(actor, path) {
  for (const step of path) {
    if (!isAlive(actor)) return;
    const from = { q: actor.q, r: actor.r };
    await slideActorTo(actor, from, step);
    actor.q = step.q;
    actor.r = step.r;
    renderBoard();
    await sleep(35);
  }
}

async function slideActorTo(actor, from, to) {
  renderBoard();
  const bounds = boardBounds();
  const entityElement = elements.board.querySelector(`[data-entity-id="${actor.id}"]`);
  if (!entityElement) {
    actor.q = to.q;
    actor.r = to.r;
    renderBoard();
    return;
  }

  const fromPoint = hexToPixel(from, bounds);
  const toPoint = hexToPixel(to, bounds);
  entityElement.classList.remove("moving");
  entityElement.style.transition = "none";
  entityElement.style.left = `${fromPoint.x}px`;
  entityElement.style.top = `${fromPoint.y}px`;
  entityElement.getBoundingClientRect();

  await nextFrame();
  entityElement.style.transition = "";
  entityElement.classList.add("moving");
  entityElement.getBoundingClientRect();
  await nextFrame();
  entityElement.style.left = `${toPoint.x}px`;
  entityElement.style.top = `${toPoint.y}px`;
  await sleep(240);
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
  const candidateTiles = isMeleeAttackAction(attackAction) ? [actor, ...reachable] : reachable;

  const scored = candidateTiles.map((tile) => {
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

function isMeleeAttackAction(action) {
  return action?.type === "attack" && (action.melee || action.range <= 1);
}

function scoreTargetsFromTile(actor, tile, attackAction) {
  if (!attackAction || (attackAction.type !== "attack" && attackAction.type !== "patternAttack")) {
    return { hitCount: 0, lowestHp: Infinity, lowestIndex: 9999 };
  }
  if (attackAction.type === "patternAttack") {
    const placement = bestPatternPlacement(attackAction.pattern, tile, attackAction.range, actor.side);
    return {
      hitCount: placement.targets.length,
      lowestHp: placement.lowestHp,
      lowestIndex: placement.lowestIndex,
    };
  }
  const targets = aliveOpponents(actor).filter((target) =>
    canTargetFromTile(tile, actor.side, target, attackAction.range),
  );
  return {
    hitCount: Math.min(targets.length, attackAction.targets ?? 1),
    lowestHp: Math.min(...targets.map((target) => target.hp), Infinity),
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
        const hitPosition = { q: target.q, r: target.r };
        applyDamage(target, actor.baseAtk * 2);
        renderBoard();
        renderHud();
        showHitEffect(target, hitPosition, actor.baseAtk * 2);
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

function bestPatternPlacement(pattern, origin, range, side = origin.side) {
  if (pattern === "adjacent-pair") return bestAdjacentPairPlacement(origin, range, side);
  return { tiles: [], targets: [], lowestHp: Infinity, lowestIndex: 9999 };
}

function bestAdjacentPair(actorOrTile, range, side = actorOrTile.side) {
  return bestAdjacentPairPlacement(actorOrTile, range, side).tiles;
}

function bestAdjacentPairPlacement(actorOrTile, range, side = actorOrTile.side) {
  const origin = actorOrTile;
  const candidates = [];
  for (const tile of state.tiles) {
    for (const dir of directions) {
      const other = { q: tile.q + dir.q, r: tile.r + dir.r };
      if (!isTile(other)) continue;
      const pair = [tile, other];
      const anchorDistances = pair
        .map((hex) => wallAwareDistance(origin, hex))
        .filter((distance, index) => distance <= range && hasLineOfSight(origin, pair[index]));
      if (!anchorDistances.length) continue;
      const targets = state.entities.filter((entity) => {
        return isAlive(entity) && entity.side !== side && pair.some((hex) => sameHex(hex, entity));
      });
      if (targets.length) {
        candidates.push({
          tiles: pair,
          targets,
          hitCount: targets.length,
          distance: Math.min(...anchorDistances),
          lowestHp: Math.min(...targets.map((target) => target.hp)),
          lowestIndex: Math.min(...targets.map((target) => target.monsterIndex ?? 0)),
        });
      }
    }
  }
  candidates.sort((a, b) => {
    if (a.hitCount !== b.hitCount) return b.hitCount - a.hitCount;
    if (a.lowestHp !== b.lowestHp) return a.lowestHp - b.lowestHp;
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.lowestIndex - b.lowestIndex;
  });
  return candidates[0] ?? { tiles: [], targets: [], lowestHp: Infinity, lowestIndex: 9999 };
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
  elements.rewardOverlay.classList.add("hidden");
  elements.cardRevealOverlay.className = "card-reveal-overlay hidden";
  document.body.classList.remove("revealing-cards");
  log(win ? "스테이지 클리어" : "패배");
  render();
}

function showRewards() {
  const rewards = drawRewards();
  elements.rewardCards.innerHTML = "";
  rewards.forEach((reward) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `reward-card ${rarityClass(reward.rarity)}`;
    button.innerHTML = `
      <span class="card-priority">${reward.priority}</span>
      <strong class="card-title">${reward.name}</strong>
      <span class="card-action-area">${renderActionList(reward)}</span>
      <span class="pick">선택</span>
    `;
    button.addEventListener("click", () => pickReward(reward));
    elements.rewardCards.append(button);
  });
  elements.rewardOverlay.classList.remove("hidden");
}

function drawRewards() {
  return shuffle(rewardPool).slice(0, 4).map((entry) => ({
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
  [...elements.board.children].forEach((child) => {
    if (!child.classList.contains("damage-pop")) child.remove();
  });
  elements.boardPanel.querySelectorAll(".offscreen-indicator").forEach((indicator) => indicator.remove());
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
    div.className = `entity ${entity.side} ${entity.boss ? "boss" : ""}`;
    div.dataset.entityId = entity.id;
    div.innerHTML = `
      <span class="entity-label">${entity.side === "player" ? "궁" : entity.boss ? "보" : entity.monsterIndex}</span>
      <span class="hp-readout">${entity.hp}/${entity.maxHp}</span>
      <span class="hp-bar" aria-hidden="true"><i style="width: ${hpPercent(entity)}%"></i></span>
    `;
    div.title = `${entity.name} ${entity.hp}/${entity.maxHp}`;
    div.style.left = `${point.x}px`;
    div.style.top = `${point.y}px`;
    elements.board.append(div);
  }

  renderOffscreenEnemyIndicators(bounds);
}

function renderOffscreenEnemyIndicators(bounds) {
  if (state.cameraMode !== "focus") return;
  const player = getPlayer();
  if (!player) return;

  const panelWidth = elements.boardPanel.clientWidth;
  const panelHeight = elements.boardPanel.clientHeight;
  const scale = Number.parseFloat(elements.board.style.getPropertyValue("--board-scale")) || 1;
  const offsetX = Number.parseFloat(elements.board.style.left) || 0;
  const offsetY = Number.parseFloat(elements.board.style.top) || 0;
  const playerPoint = screenPointForHex(player, bounds, scale, offsetX, offsetY);
  const visible = {
    left: 60,
    right: panelWidth - 60,
    top: Math.min(panelHeight - 72, Math.max(132, panelHeight * 0.16)),
    bottom: panelHeight - 50,
  };
  const occupied = [];

  aliveEnemies().forEach((enemy) => {
    const enemyPoint = screenPointForHex(enemy, bounds, scale, offsetX, offsetY);
    if (isEnemyElementVisible(enemy)) return;

    const dx = enemyPoint.x - playerPoint.x;
    const dy = enemyPoint.y - playerPoint.y;
    const position = placeOffscreenIndicator(enemyPoint, visible, occupied);
    const indicator = document.createElement("div");
    indicator.className = `offscreen-indicator ${enemy.boss ? "boss" : ""}`;
    indicator.style.left = `${position.x}px`;
    indicator.style.top = `${position.y}px`;
    indicator.innerHTML = `
      <span class="offscreen-arrow">${directionArrow(dx, dy)}</span>
      <span class="offscreen-enemy">${enemy.boss ? "보" : enemy.monsterIndex}</span>
      <span class="offscreen-distance">${axialDistance(player, enemy)}</span>
      <span class="offscreen-unit">칸</span>
    `;
    elements.boardPanel.append(indicator);
  });
}

function isEnemyElementVisible(enemy) {
  const entityElement = elements.board.querySelector(`[data-entity-id="${enemy.id}"]`);
  if (!entityElement) return false;

  const entityRect = entityElement.getBoundingClientRect();
  const panelRect = elements.boardPanel.getBoundingClientRect();
  const visibleWidth = Math.min(entityRect.right, panelRect.right) - Math.max(entityRect.left, panelRect.left);
  const visibleHeight = Math.min(entityRect.bottom, panelRect.bottom) - Math.max(entityRect.top, panelRect.top);
  return visibleWidth > 0 && visibleHeight > 0;
}

function screenPointForHex(hex, bounds, scale, offsetX, offsetY) {
  const point = hexToPixel(hex, bounds);
  return {
    x: offsetX + point.x * scale,
    y: offsetY + point.y * scale,
  };
}

function placeOffscreenIndicator(point, visible, occupied) {
  const position = {
    x: Math.max(visible.left, Math.min(visible.right, point.x)),
    y: Math.max(visible.top, Math.min(visible.bottom, point.y)),
  };
  for (let tries = 0; tries < 8; tries += 1) {
    const overlaps = occupied.some((item) => Math.abs(item.x - position.x) < 58 && Math.abs(item.y - position.y) < 36);
    if (!overlaps) break;
    position.y = Math.min(visible.bottom, position.y + 34);
    if (position.y >= visible.bottom) position.y = Math.max(visible.top, position.y - 68);
  }
  occupied.push({ ...position });
  return position;
}

function directionArrow(dx, dy) {
  const angle = Math.atan2(dy, dx);
  const arrows = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
  const index = Math.round(angle / (Math.PI / 4));
  return arrows[(index + 8) % 8];
}

function renderHud() {
  const player = getPlayer();
  elements.runSummary.textContent = state.finished
    ? "런 종료"
    : `웨이브 ${state.waveIndex + 1}/${waves.length}${waves[state.waveIndex]?.boss ? " 보스" : ""} / 턴 ${state.turn}`;
  elements.playerHp.textContent = player ? `${player.hp} / ${player.maxHp}` : "0 / 70";
  elements.deckCount.textContent = state.deck.length;
  elements.discardCount.textContent = state.discard.length;
  elements.pauseButton.textContent = state.paused ? "재개" : "일시정지";
}

function renderDrawnCards() {
  elements.drawnCards.innerHTML = "";
  state.currentTimeline.forEach((entry, index) => {
    const div = document.createElement("div");
    const statusClass = [
      index < state.completedTimelineCount ? "done" : "",
      index === state.activeTimelineIndex ? "active" : "",
    ]
      .filter(Boolean)
      .join(" ");
    div.className = `order-chip ${entry.actorType === "player" ? "player" : "enemy"} ${statusClass}`;
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

  settleRevealCards();
  slideSortRevealCards(sortedEntries);
  await sleep(2000);

  elements.cardRevealOverlay.classList.add("dock");
  await sleep(520);
  elements.cardRevealOverlay.className = "card-reveal-overlay hidden";
  document.body.classList.remove("revealing-cards");
}

function renderRevealCards(entries) {
  elements.cardRevealList.innerHTML = "";
  elements.cardRevealList.className = "card-reveal-list";
  const sideCounts = entries.reduce(
    (counts, entry) => {
      const side = entry.actorType === "player" ? "player" : "enemy";
      counts[side] += 1;
      return counts;
    },
    { player: 0, enemy: 0 },
  );
  entries.forEach((entry) => {
    const side = entry.actorType === "player" ? "player" : "enemy";
    const div = document.createElement("article");
    div.className = `reveal-card ${side} ${rarityClass(entry.card.rarity)} ${sideCounts[side] === 1 ? "solo-side" : ""}`;
    div.dataset.entryKey = entryKey(entry);
    div.innerHTML = `
      <span class="card-priority">${entry.card.priority}</span>
      <strong class="card-title">${entry.card.name}</strong>
      <span class="card-owner">${entryLabel(entry)}</span>
      <span class="card-action-area">${renderActionList(entry.card)}</span>
    `;
    elements.cardRevealList.append(div);
  });
}

function rarityClass(rarity) {
  const classes = {
    노말: "rarity-normal",
    레어: "rarity-rare",
    에픽: "rarity-epic",
    전설: "rarity-legendary",
  };
  return classes[rarity] ?? "";
}

function slideSortRevealCards(sortedEntries) {
  const currentCards = [...elements.cardRevealList.children];
  const firstRects = new Map(
    currentCards.map((cardElement) => [cardElement.dataset.entryKey, cardElement.getBoundingClientRect()]),
  );
  const cardsByKey = new Map(currentCards.map((cardElement) => [cardElement.dataset.entryKey, cardElement]));

  elements.cardRevealList.classList.add("sorted");
  sortedEntries.forEach((entry) => {
    const cardElement = cardsByKey.get(entryKey(entry));
    if (cardElement) elements.cardRevealList.append(cardElement);
  });

  [...elements.cardRevealList.children].forEach((cardElement) => {
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

function settleRevealCards() {
  [...elements.cardRevealList.children].forEach((cardElement) => {
    cardElement.getAnimations().forEach((animation) => animation.cancel());
    cardElement.classList.add("settled");
    cardElement.style.opacity = "1";
    cardElement.style.transform = "translateY(0) scale(1)";
  });
}

function entryKey(entry) {
  return `${entry.actorType}-${entry.actorId}-${entry.card.instanceId ?? entry.card.id}`;
}

function describeCard(cardData) {
  return cardData.actions.map(describeAction).join("\n");
}

function renderActionList(cardData) {
  return `<span class="action-list">${cardData.actions
    .map(renderActionLine)
    .join("")}</span>`;
}

function renderActionLine(action) {
  if (action.type === "move") {
    return `<span class="action-line">${actionGroup("move", [actionStat("move", "이동", action.amount)])}</span>`;
  }
  if (action.type === "flee") {
    return `<span class="action-line">${actionGroup("move", [actionStat("move-flee", "후퇴", action.amount), actionNote("후퇴")])}</span>`;
  }
  if (action.type === "attack") {
    const attackKind = action.melee || action.range <= 1 ? "melee" : "ranged";
    const parts = [
      actionStat(attackKind, attackKind === "melee" ? "근거리 공격" : "원거리 공격", action.mult),
    ];
    if (attackKind !== "melee") parts.push(actionStat("range", "사거리", action.range));
    if (action.targets) parts.push(actionStat("target", "타겟 수", action.targets));
    if (action.push) parts.push(actionNote(`밀기 ${action.push}`));
    return `<span class="action-line">${actionGroup("attack", parts)}</span>`;
  }
  if (action.type === "patternAttack") {
    return `<span class="action-line">${actionGroup("attack", [
      patternIcon(action.pattern),
      actionStat("ranged", "원거리 공격", action.mult),
      actionStat("range", "사거리", action.range),
    ])}</span>`;
  }
  if (action.type === "charge") {
    return `<span class="action-line">${actionGroup("special", [actionStat("charge", "차지", action.amount), actionNote("차지")])}</span>`;
  }
  if (action.type === "permanent") {
    return `<span class="action-line">${actionGroup("special", [actionNote("영구 효과")])}</span>`;
  }
  if (action.type === "placeObstacle") {
    return `<span class="action-line">${actionGroup("special", [actionStat("range", "사거리", action.range), actionNote("장애물 설치")])}</span>`;
  }
  return `<span class="action-line">${actionGroup("special", [actionNote(action.type)])}</span>`;
}

function actionGroup(kind, parts) {
  return `<span class="action-group ${kind}">${parts.join("")}</span>`;
}

function actionStat(kind, label, value) {
  const icon = actionIcon(kind);
  return `<span class="action-stat" title="${label}"><span class="action-icon ${kind.replaceAll(" ", "-")}">${icon}</span><b>${value}</b></span>`;
}

function actionIcon(kind) {
  const icons = {
    melee: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 17.5 3.5 6.5V3.5h3l11 11"/><path d="M13 19 19 13"/><path d="M16 16 20 20"/><path d="M19 21 21 19"/></svg>`,
    ranged: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5C12.7 7 12.7 17 6 19.5"/><path d="M7.8 6.2C12.2 8.8 12.2 15.2 7.8 17.8"/><path d="M4 12H19"/><path d="M15.5 8.5 19.5 12 15.5 15.5"/></svg>`,
    move: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 4.2h5.2l1.1 5.2 5.8 3.5c1.1.7 1.8 1.8 1.8 3.1v1.3H5.2v-3.1l2.6-3.8-.6-6.2Z"/><path d="M7 13.2h13.5"/><path d="M5.2 17.3h15.9"/><path d="M10 7.2h3.2"/></svg>`,
    "move-flee": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 4.2h5.2l1.1 5.2 5.8 3.5c1.1.7 1.8 1.8 1.8 3.1v1.3H5.2v-3.1l2.6-3.8-.6-6.2Z"/><path d="M7 13.2h13.5"/><path d="M5.2 17.3h15.9"/><path d="M10 7.2h3.2"/></svg>`,
    range: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17.5C7.5 10.1 12.9 6.4 19 6.8"/><path d="M16.4 4.4 19 6.8 16.3 9"/><circle cx="5" cy="17.5" r="1.5"/><circle cx="19" cy="6.8" r="2.8"/></svg>`,
    charge: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V19"/><path d="M5 12H19"/></svg>`,
    target: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.2"/></svg>`,
  };
  return icons[kind] ?? "?";
}

function actionNote(text) {
  return `<span class="action-note">${text}</span>`;
}

function patternIcon(pattern) {
  if (pattern === "adjacent-pair") {
    return `<span class="pattern-icon adjacent-pair" title="붙은 두 칸"><i></i><i></i></span>`;
  }
  return "";
}

function describeAction(action) {
  if (action.type === "move") return `MOV ${action.amount}`;
  if (action.type === "flee") return `후퇴 ${action.amount}`;
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

function hpPercent(entity) {
  if (!entity.maxHp) return 0;
  return Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100));
}

function showHitEffect(target, position, damage) {
  showDamage(position, damage);
  const entityElement = elements.board.querySelector(`[data-entity-id="${target.id}"]`);
  if (!entityElement) return;

  entityElement.classList.remove("hit");
  entityElement.getBoundingClientRect();
  entityElement.classList.add("hit");
  window.setTimeout(() => entityElement.classList.remove("hit"), 280);
}

function showDamage(position, damage) {
  const bounds = boardBounds();
  fitBoardToPanel(bounds);
  const point = hexToPixel(position, bounds);
  const key = `${position.q},${position.r}:${damage}`;
  const now = performance.now();
  state.recentDamagePops = state.recentDamagePops ?? new Map();
  const lastShownAt = state.recentDamagePops.get(key) ?? 0;
  if (now - lastShownAt < 120) return;
  state.recentDamagePops.set(key, now);

  const div = document.createElement("div");
  div.className = "damage-pop";
  div.dataset.damageKey = key;
  div.textContent = `-${damage}`;
  div.style.left = `${point.x}px`;
  div.style.top = `${point.y}px`;
  elements.board.append(div);
  window.setTimeout(() => {
    div.remove();
    if (state.recentDamagePops?.get(key) === now) state.recentDamagePops.delete(key);
  }, 720);
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
  const fitScale = Math.min(panelWidth / logicalWidth, panelHeight / logicalHeight);
  let scale = fitScale;
  let offsetX = Math.max(0, (panelWidth - logicalWidth * scale) / 2);
  let offsetY = Math.max(0, (panelHeight - logicalHeight * scale) / 2);

  const player = getPlayer();
  if (state.cameraMode === "focus" && player) {
    scale = Math.max(fitScale, Math.min(1.02, fitScale * 2.25));
    const focusPoint = hexToPixel(player, bounds);
    offsetX = panelWidth / 2 - focusPoint.x * scale;
    offsetY = panelHeight * 0.56 - focusPoint.y * scale;
  }

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

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
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
