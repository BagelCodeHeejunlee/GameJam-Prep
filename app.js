const SQRT3 = Math.sqrt(3);
const HEX_SIZE = 39;
const BOARD_PADDING = 90;
const TURN_DELAY = 540;
const WAVE_INTRO_DELAY = 1300;
const CAMERA_FOCUS_DELAY = 360;
const MAP_ROOM_SCALE = 2;
const CAMERA_FOCUS_SCALE_MULTIPLIER = 1.35;
const CAMERA_FOCUS_MAX_SCALE = 0.96;

const directions = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const elements = {
  gameTitle: document.querySelector("#gameTitle"),
  board: document.querySelector("#board"),
  boardPanel: document.querySelector(".board-panel"),
  characterButtons: [...document.querySelectorAll("[data-character]")],
  runSummary: document.querySelector("#runSummary"),
  playerNameLabel: document.querySelector("#playerNameLabel"),
  playerHp: document.querySelector("#playerHp"),
  deckCount: document.querySelector("#deckCount"),
  discardCount: document.querySelector("#discardCount"),
  chargeCount: document.querySelector("#chargeCount"),
  chargeHud: document.querySelector("#chargeHud"),
  enemySummary: document.querySelector("#enemySummary"),
  priorityStrip: document.querySelector("#priorityStrip"),
  playerHud: document.querySelector("#playerHud"),
  drawnCards: document.querySelector("#drawnCards"),
  timeline: document.querySelector("#timeline"),
  battleLog: document.querySelector("#battleLog"),
  rewardOverlay: document.querySelector("#rewardOverlay"),
  rewardCards: document.querySelector("#rewardCards"),
  iconHelpOverlay: document.querySelector("#iconHelpOverlay"),
  iconHelpButton: document.querySelector("#iconHelpButton"),
  closeHelpButton: document.querySelector("#closeHelpButton"),
  newRunButton: document.querySelector("#newRunButton"),
  pauseButton: document.querySelector("#pauseButton"),
  speedButton: document.querySelector("#speedButton"),
};

let selectedCharacterId = "archer";
let speedMultiplier = 1;

const baseArcherCards = [
  card("advance-shot", "전진 사격", "기본", "기본", 54, [
    { type: "move", amount: 2 },
    { type: "attack", mult: 1, range: 2 },
  ], 3),
  card("retreat-shot", "후퇴 사격", "기본", "기본", 56, [
    { type: "attack", mult: 1, range: 2 },
    { type: "flee", amount: 2 },
  ], 2),
  card("aimed-shot", "정조준", "기본", "기본", 58, [{ type: "attack", mult: 2, range: 2 }], 1),
  card("keep-distance", "거리 벌리기", "기본", "기본", 28, [{ type: "flee", amount: 3 }], 1),
  card(
    "paired-hex-shot",
    "붙은 두 칸 공격",
    "기본",
    "기본",
    52,
    [{ type: "patternAttack", mult: 2, range: 2, pattern: "adjacent-pair" }],
    1,
  ),
];

const archerRewardPool = [
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
  card("attack-trap", "공격 함정 설치", "함정", "노말", 24, [
    { type: "placeTrap", range: 2, trap: "attack", count: 2 },
  ]),
  card("block-trap", "봉쇄 함정 설치", "함정", "노말", 25, [
    { type: "placeTrap", range: 2, trap: "block", count: 2 },
  ]),
  card("push-shot", "밀기 사격", "함정", "레어", 39, [
    { type: "attack", mult: 1, range: 2, push: 1 },
  ]),
  card("charge", "차지", "차지", "노말", 30, [{ type: "charge", amount: 1 }]),
  card("charge-2", "차지 2", "차지", "레어", 28, [{ type: "charge", amount: 2 }]),
  card("charged-shot", "차지 샷", "차지", "레어", 34, [
    { type: "attack", mult: 2, range: 3 },
  ]),
  card("charge-retreat", "후퇴 집중", "차지", "레어", 30, [
    { type: "permanent", effect: "chargeRetreat", amount: 1 },
  ]),
  card("charge-range", "긴 조준", "차지", "에픽", 31, [
    { type: "permanent", effect: "chargeRangePerStack", amount: 1 },
  ]),
  card("charge-overkill", "잔여 관통", "차지", "전설", 33, [
    { type: "permanent", effect: "overkillSplashRange", amount: 3 },
  ]),
  card("charge-doubler", "과충전", "차지", "전설", 30, [
    { type: "permanent", effect: "chargeStackMultiplier", amount: 2 },
  ]),
];

const baseWarriorCards = [
  card("warrior-advance-slash", "전진 베기", "기본", "기본", 48, [
    { type: "move", amount: 2, desiredRange: 1 },
    { type: "attack", mult: 1, range: 1, melee: true },
  ], 3),
  card("warrior-guard-hit", "막고 치기", "기본", "기본", 38, [
    { type: "attack", mult: 1, range: 1, melee: true },
  ], 2),
  card("warrior-heavy-hit", "묵직한 일격", "기본", "기본", 52, [
    { type: "attack", mult: 2, range: 1, melee: true },
  ], 1),
  card("warrior-charge", "돌입", "기본", "기본", 62, [
    { type: "move", amount: 3, desiredRange: 1 },
  ], 1),
  card("warrior-cleave", "휩쓸기", "기본", "기본", 50, [
    { type: "patternAttack", mult: 1, range: 1, pattern: "adjacent-pair", melee: true },
  ], 1),
];

const warriorRewardPool = [
  card("warrior-quick-slash", "빠른 베기", "공용", "노말", 42, [{ type: "attack", mult: 1, range: 1, melee: true }]),
  card("warrior-long-step", "긴 돌입", "돌진", "노말", 55, [{ type: "move", amount: 4, desiredRange: 1 }]),
  card("warrior-berserk-cut", "피의 대가", "광전", "노말", 46, [
    { type: "selfDamagePercent", percent: 0.1 },
    { type: "attack", mult: 3, range: 1, melee: true },
  ]),
  card("warrior-push", "밀어붙이기", "범위 공격", "노말", 46, [{ type: "attack", mult: 1, range: 1, melee: true, push: 1 }]),
  card("warrior-rush-5", "달려들기", "돌진", "노말", 60, [{ type: "move", amount: 5, desiredRange: 1 }]),
  card("warrior-advance-cleave", "파고들기", "범위 공격", "노말", 50, [
    { type: "move", amount: 2, desiredRange: 1 },
    { type: "patternAttack", mult: 1, range: 1, pattern: "adjacent-pair", melee: true },
  ]),
  card("warrior-berserk-heal-small", "숨 고르기", "광전", "노말", 64, [{ type: "healPercent", percent: 0.1 }]),
  card("warrior-cleave-reward", "넓은 휩쓸기", "범위 공격", "레어", 48, [
    { type: "patternAttack", mult: 2, range: 1, pattern: "adjacent-pair", melee: true },
  ]),
  card("warrior-jump-entry", "점프 진입", "돌진", "레어", 58, [{ type: "move", amount: 4, desiredRange: 1, jump: true }]),
  card("warrior-breakthrough", "돌파 베기", "돌진", "레어", 56, [
    { type: "move", amount: 4, desiredRange: 1 },
    { type: "attack", mult: 2, range: 1, melee: true, push: 1 },
  ]),
  card("warrior-blood-chain", "피의 연격", "광전", "레어", 44, [
    { type: "attack", mult: 1, range: 1, melee: true },
    { type: "attack", mult: 1, range: 1, melee: true },
    { type: "attack", mult: 1, range: 1, melee: true },
  ]),
  card("warrior-triangle-cleave", "삼각 휩쓸기", "범위 공격", "에픽", 47, [
    { type: "patternAttack", mult: 2, range: 1, pattern: "adjacent-triple", melee: true, perTargetBonus: 1 },
  ]),
  card("warrior-overrun", "남은 힘 베기", "돌진", "에픽", 60, [
    { type: "momentumAttack", amount: 5, mult: 1, range: 1 },
  ]),
  card("warrior-berserk-stance", "광전 태세", "광전", "레어", 44, [
    { type: "permanent", effect: "berserkLostHpDamage", amount: 0.5 },
  ]),
  card("warrior-blood-recovery", "피의 회복", "광전", "레어", 40, [
    { type: "attack", mult: 1, range: 1, melee: true },
    { type: "healPercent", percent: 0.12 },
  ]),
  card("warrior-blood-combo", "무자비한 연속", "광전", "에픽", 43, [
    { type: "selfDamagePercent", percent: 0.1 },
    { type: "attack", mult: 3, range: 1, melee: true },
    { type: "attack", mult: 2, range: 1, melee: true },
  ]),
  card("warrior-surround-hit", "주변 견제", "범위 공격", "에픽", 49, [
    { type: "attack", mult: 1, range: 1, melee: true, targets: 3 },
  ]),
  card("warrior-whirlwind", "피의 폭풍", "범위 공격", "전설", 45, [
    { type: "patternAttack", mult: 3, range: 1, pattern: "adjacent-triple", melee: true, perTargetBonus: 1 },
  ]),
  card("warrior-endless-charge", "멈추지 않는 돌입", "돌진", "전설", 62, [{ type: "move", amount: 6, desiredRange: 1, jump: true }]),
  card("warrior-death-edge", "죽음의 칼끝", "광전", "전설", 38, [
    { type: "permanent", effect: "lowHpDamage", amount: 0.5, threshold: 0.25 },
  ]),
  card("warrior-final-blow", "최후의 일격", "광전", "전설", 36, [
    { type: "selfDamagePercent", percent: 0.2 },
    { type: "attack", mult: 6, range: 1, melee: true },
  ]),
];

const baseMageCards = [
  card("mage-bolt", "마력탄", "기본", "기본", 32, [{ type: "attack", mult: 1, range: 3 }], 3),
  card("mage-shift-bolt", "전이 사격", "기본", "기본", 46, [
    { type: "move", amount: 2 },
    { type: "attack", mult: 1, range: 3 },
  ], 2),
  card("mage-arc", "비전 분산", "기본", "기본", 40, [{ type: "attack", mult: 1, range: 3, targets: 2 }], 1),
  card("mage-retreat", "마력 후퇴", "기본", "기본", 64, [{ type: "flee", amount: 2 }], 1),
  card("mage-lance", "마력창", "기본", "기본", 36, [{ type: "attack", mult: 2, range: 3 }], 1),
];

const mageRewardPool = [
  card("mage-long-bolt", "장거리 마력탄", "공용", "노말", 34, [{ type: "attack", mult: 1, range: 4 }]),
  card("mage-fork", "갈래 마력", "연쇄", "노말", 38, [{ type: "attack", mult: 1, range: 3, targets: 3 }]),
  card("mage-chain-bolt", "연쇄 마력탄", "연쇄", "노말", 36, [
    { type: "attack", mult: 1, range: 3 },
    { type: "attack", mult: 1, range: 3 },
  ]),
  card("mage-triple-bolt", "세 갈래 번개", "연쇄", "레어", 37, [{ type: "attack", mult: 1, range: 3, targets: 3 }]),
  card("mage-rune-seed", "룬 흩뿌리기", "룬", "노말", 58, [
    { type: "placeRune", range: 2, count: 2, power: 1 },
    { type: "fleeToRune", amount: 2 },
  ]),
  card("mage-rune-back", "룬 뒤로", "룬", "노말", 60, [
    { type: "flee", amount: 2 },
    { type: "placeRune", range: 2, count: 1, power: 1 },
  ]),
  card("mage-rune-spark", "룬 점화", "룬", "레어", 40, [
    { type: "runeAttack", mult: 2, radius: 1 },
  ]),
  card("mage-double-rune", "이중 룬", "룬", "레어", 56, [
    { type: "placeRune", range: 3, count: 2, power: 2 },
  ]),
  card("mage-rune-burst", "룬 폭파", "룬", "에픽", 42, [
    { type: "detonateRune", mult: 3, radius: 1 },
  ]),
  card("mage-rune-field", "마력 지뢰밭", "룬", "전설", 50, [
    { type: "placeRune", range: 4, count: 4, power: 2 },
    { type: "fleeToRune", amount: 3 },
  ]),
  card("mage-small-meteor", "작은 운석", "운석", "노말", 33, [
    { type: "placeMeteor", range: 3, mult: 2, radius: 1, delay: 1 },
  ]),
  card("mage-meteor-mark", "운석 예고", "운석", "레어", 30, [
    { type: "placeMeteor", range: 4, mult: 4, radius: 1, delay: 1 },
  ]),
  card("mage-two-stars", "두 번째 별", "운석", "레어", 32, [
    { type: "placeMeteor", range: 4, mult: 2, radius: 1, delay: 1 },
    { type: "placeMeteor", range: 4, mult: 2, radius: 1, delay: 1 },
  ]),
  card("mage-starfall", "별 추락", "운석", "전설", 26, [
    { type: "placeMeteor", range: 5, mult: 7, radius: 1, delay: 1 },
  ]),
  card("mage-doom-meteor", "종말 예고", "운석", "전설", 24, [
    { type: "placeMeteor", range: 5, mult: 10, radius: 2, delay: 2 },
  ]),
  card("mage-overflow", "마력 과잉", "연쇄", "레어", 34, [
    { type: "permanent", effect: "comboDamage", amount: 0.1 },
  ]),
  card("mage-thunder-ring", "천둥의 고리", "연쇄", "전설", 28, [{ type: "attack", mult: 1, range: 4, targets: 5 }]),
];

const characterDefinitions = {
  archer: {
    id: "archer",
    name: "궁수",
    shortLabel: "궁",
    title: "궁수 오토배틀 프로토타입",
    maxHp: 70,
    baseAtk: 10,
    baseRange: 2,
    baseMove: 2,
    baseCards: baseArcherCards,
    rewardPool: archerRewardPool,
  },
  warrior: {
    id: "warrior",
    name: "전사",
    shortLabel: "전",
    title: "전사 오토배틀 프로토타입",
    maxHp: 100,
    baseAtk: 8,
    baseRange: 1,
    baseMove: 2,
    baseCards: baseWarriorCards,
    rewardPool: warriorRewardPool,
  },
  mage: {
    id: "mage",
    name: "마법사",
    shortLabel: "마",
    title: "마법사 오토배틀 프로토타입",
    maxHp: 55,
    baseAtk: 12,
    baseRange: 3,
    baseMove: 2,
    baseCards: baseMageCards,
    rewardPool: mageRewardPool,
  },
};

const monsterDefinitions = {
  brute: { name: "브루트", label: "브", baseAtk: 3, baseRange: 1, baseMove: 2 },
  skirmisher: { name: "척후병", label: "척", baseAtk: 3, baseRange: 1, baseMove: 3 },
  shooter: { name: "사수", label: "사", baseAtk: 4, baseRange: 3, baseMove: 2 },
};

const monsterDecks = {
  brute: [
    card("brute-advance-claw", "접근 공격", "브루트", "기본", 58, [
      { type: "move", amount: 2, desiredRange: 1 },
      { type: "attack", mult: 1, range: 1, melee: true },
    ], 3),
    card("brute-claw-step", "공격 후 접근", "브루트", "기본", 54, [
      { type: "attack", mult: 1, range: 1, melee: true },
      { type: "move", amount: 1, desiredRange: 1 },
    ], 2),
    card("brute-heavy", "강타", "브루트", "기본", 50, [{ type: "attack", mult: 2, range: 1, melee: true }], 2),
    card("brute-move", "접근", "브루트", "기본", 66, [{ type: "move", amount: 2, desiredRange: 1 }], 1),
  ],
  skirmisher: [
    card("skirmisher-dash", "파고들기", "척후병", "기본", 44, [
      { type: "move", amount: 3, desiredRange: 1 },
      { type: "attack", mult: 1, range: 1, melee: true },
    ], 3),
    card("skirmisher-hit-run", "연속 찌르기", "척후병", "기본", 40, [
      { type: "attack", mult: 1, range: 1, melee: true },
      { type: "attack", mult: 1, range: 1, melee: true },
    ], 2),
    card("skirmisher-feint", "교란", "척후병", "기본", 48, [{ type: "move", amount: 2, desiredRange: 1 }], 2),
    card("skirmisher-stab", "찌르기", "척후병", "기본", 36, [{ type: "attack", mult: 1, range: 1, melee: true }], 1),
  ],
  shooter: [
    card("shooter-shot", "견제 사격", "사수", "기본", 46, [{ type: "attack", mult: 1, range: 3 }], 3),
    card("shooter-retreat", "연속 사격", "사수", "기본", 62, [
      { type: "attack", mult: 1, range: 3 },
      { type: "attack", mult: 1, range: 3 },
    ], 2),
    card("shooter-aim", "조준 사격", "사수", "기본", 42, [{ type: "attack", mult: 2, range: 3 }], 1),
    card("shooter-reposition", "사격 위치", "사수", "기본", 58, [
      { type: "move", amount: 2, desiredRange: 3 },
      { type: "attack", mult: 1, range: 3 },
    ], 2),
  ],
};

const waves = buildWaves();

let state;

function getSelectedCharacter() {
  return characterDefinitions[selectedCharacterId] ?? characterDefinitions.archer;
}

function card(id, name, route, rarity, priority, actions, copies = 1) {
  return { id, name, route, rarity, type: "기본", priority, actions, copies };
}

function newRun() {
  const character = getSelectedCharacter();
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
    meteors: [],
    entities: [],
    characterId: character.id,
    character,
    playerCards: expandCards(character.baseCards),
    deck: [],
    discard: [],
    enemyDeck: [],
    enemyDiscard: [],
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
    boardTileSignature: "",
    boardTileElements: new Map(),
    log: [],
    speedMultiplier,
    suppressPlayerCard: false,
  };

  startWave(0);
  log(`${character.name} 새 런을 시작했다.`);
  render();
  scheduleTurn();
}

function startWave(index) {
  const wave = waves[index];
  const character = getSelectedCharacter();
  const previousPlayer = state.entities.find((entity) => entity.side === "player");
  state.turn = 0;
  state.tiles = makeMap(wave.radius ?? 3);
  state.walls = wave.walls.map((item) => ({ ...item }));
  state.obstacles = [];
  state.meteors = [];
  state.boardTileSignature = "";
  state.boardTileElements = new Map();
  state.cameraMode = "overview";
  state.cameraTransitionScheduled = false;
  const start = wave.playerStart ?? { q: 0, r: Math.min(2, (wave.radius ?? 3) - 1) };
  state.entities = [
    {
      id: character.id,
      characterId: character.id,
      name: character.name,
      label: character.shortLabel,
      side: "player",
      q: start.q,
      r: start.r,
      hp: previousPlayer?.hp ?? character.maxHp,
      maxHp: character.maxHp,
      baseAtk: character.baseAtk,
      baseRange: character.baseRange,
      baseMove: character.baseMove,
      charge: 0,
      permanent: {},
      temporary: {},
      sustainedCards: [],
    },
  ];

  wave.enemies.forEach((enemy) => {
    const indexNumber = state.nextEnemyIndex++;
    const kind = enemy.kind ?? "brute";
    const monster = monsterDefinitions[kind] ?? monsterDefinitions.brute;
    state.entities.push({
      id: `enemy-${indexNumber}`,
      name: enemy.name ?? (enemy.boss ? `보스 ${indexNumber}` : `${monster.name} ${indexNumber}`),
      side: "enemy",
      kind,
      label: enemy.boss ? "보" : monster.label,
      q: enemy.q,
      r: enemy.r,
      hp: enemy.hp,
      maxHp: enemy.hp,
      baseAtk: enemy.baseAtk ?? (enemy.boss ? 5 : monster.baseAtk),
      baseRange: enemy.baseRange ?? monster.baseRange,
      baseMove: enemy.baseMove ?? monster.baseMove,
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
  state.enemyDecks = {};
  state.enemyDiscards = {};
  state.enemySustainedCards = {};
  Object.entries(monsterDecks).forEach(([kind, deck]) => {
    state.enemyDecks[kind] = shuffle(expandCards(deck));
    state.enemyDiscards[kind] = [];
    state.enemySustainedCards[kind] = [];
  });
  state.waitingReward = false;
  state.busy = false;
  state.currentTimeline = [];
  state.activeTimelineIndex = -1;
  state.completedTimelineCount = 0;
  state.completedTimelineIndexes = new Set();
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
      enemy(2, -2, 18, { kind: "skirmisher" }),
    ]),
    wave(3, [{ q: 0, r: 0 }], [
      enemy(-3, 0, 24),
      enemy(3, -2, 20, { kind: "skirmisher" }),
      enemy(1, -3, 18, { kind: "shooter" }),
    ]),
    wave(4, [{ q: 0, r: 0 }, { q: -1, r: 1 }], [
      enemy(-3, 1, 28),
      enemy(3, -2, 24, { kind: "skirmisher" }),
      enemy(0, -4, 24, { kind: "shooter" }),
      enemy(2, 1, 28),
    ]),
    wave(4, [{ q: 0, r: -1 }, { q: 1, r: -1 }], [
      enemy(-4, 1, 30),
      enemy(-2, -2, 24, { kind: "shooter" }),
      enemy(3, -3, 26, { kind: "skirmisher" }),
      enemy(3, 0, 30),
    ]),
    wave(4, [{ q: -1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: 1 }], [
      enemy(0, -4, 80, { boss: true, name: "보스 1", baseAtk: 5 }),
      enemy(-3, 0, 24, { kind: "skirmisher" }),
      enemy(3, -2, 24, { kind: "shooter" }),
    ]),
    wave(4, [{ q: 0, r: 0 }, { q: -2, r: 2 }], [
      enemy(-4, 2, 34),
      enemy(-2, -2, 28, { kind: "shooter" }),
      enemy(2, -4, 30, { kind: "skirmisher" }),
      enemy(4, -2, 34),
    ]),
    wave(5, [{ q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -2 }], [
      enemy(-5, 2, 36),
      enemy(-3, -1, 30, { kind: "skirmisher" }),
      enemy(0, -5, 30, { kind: "shooter" }),
      enemy(4, -4, 36),
      enemy(4, 0, 36),
    ]),
    wave(5, [{ q: -2, r: 1 }, { q: 0, r: 0 }, { q: 2, r: -2 }], [
      enemy(-5, 3, 38),
      enemy(-4, 0, 32, { kind: "skirmisher" }),
      enemy(0, -5, 32, { kind: "shooter" }),
      enemy(3, -5, 32, { kind: "shooter" }),
      enemy(5, -2, 38),
    ]),
    wave(5, [{ q: -1, r: 1 }, { q: 1, r: -1 }, { q: 2, r: -3 }], [
      enemy(-5, 1, 40),
      enemy(-3, -2, 34, { kind: "skirmisher" }),
      enemy(0, -5, 34, { kind: "shooter" }),
      enemy(3, -4, 34, { kind: "shooter" }),
      enemy(5, -3, 34, { kind: "skirmisher" }),
      enemy(4, 0, 40),
    ]),
    wave(5, [{ q: -2, r: 2 }, { q: 0, r: 0 }, { q: 2, r: -2 }, { q: 1, r: 1 }], [
      enemy(0, -5, 130, { boss: true, name: "보스 2", baseAtk: 6 }),
      enemy(-4, 1, 36, { kind: "skirmisher" }),
      enemy(4, -3, 36, { kind: "shooter" }),
      enemy(5, -1, 42),
    ]),
    wave(5, [{ q: -1, r: 0 }, { q: 0, r: 1 }, { q: 1, r: -2 }], [
      enemy(-5, 3, 44),
      enemy(-4, -1, 38, { kind: "skirmisher" }),
      enemy(-1, -4, 38, { kind: "shooter" }),
      enemy(2, -5, 38, { kind: "shooter" }),
      enemy(5, -3, 38, { kind: "skirmisher" }),
      enemy(5, 0, 44),
    ]),
    wave(6, [{ q: -2, r: 1 }, { q: -1, r: 2 }, { q: 1, r: -1 }, { q: 2, r: -3 }], [
      enemy(-6, 3, 48),
      enemy(-5, 0, 40, { kind: "skirmisher" }),
      enemy(-2, -4, 40, { kind: "shooter" }),
      enemy(1, -6, 40, { kind: "shooter" }),
      enemy(5, -5, 40, { kind: "skirmisher" }),
      enemy(6, -2, 48),
    ]),
    wave(6, [{ q: -2, r: 2 }, { q: 0, r: 0 }, { q: 2, r: -2 }, { q: 3, r: -4 }], [
      enemy(-6, 2, 52),
      enemy(-5, -1, 44, { kind: "skirmisher" }),
      enemy(-2, -4, 44, { kind: "shooter" }),
      enemy(2, -6, 44, { kind: "shooter" }),
      enemy(5, -5, 44, { kind: "skirmisher" }),
      enemy(6, -3, 52),
      enemy(4, 1, 52),
    ]),
    wave(6, [{ q: -3, r: 2 }, { q: -1, r: 1 }, { q: 1, r: -1 }, { q: 3, r: -3 }], [
      enemy(-6, 4, 56),
      enemy(-6, 1, 48, { kind: "skirmisher" }),
      enemy(-3, -3, 48, { kind: "shooter" }),
      enemy(0, -6, 48, { kind: "shooter" }),
      enemy(4, -6, 48, { kind: "skirmisher" }),
      enemy(6, -4, 56),
      enemy(6, -1, 56),
    ]),
    wave(6, [{ q: -2, r: 2 }, { q: 0, r: 0 }, { q: 2, r: -2 }, { q: 1, r: 1 }, { q: -1, r: -1 }], [
      enemy(0, -6, 200, { boss: true, name: "최종 보스", baseAtk: 7 }),
      enemy(-6, 2, 52, { kind: "skirmisher" }),
      enemy(-4, -1, 52, { kind: "shooter" }),
      enemy(4, -5, 52, { kind: "skirmisher" }),
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
  const expandedRadius = Math.max(radius + 2, radius * MAP_ROOM_SCALE);
  const tiles = new Map();
  mapRooms(radius, expandedRadius).forEach((room) => addHexRoom(tiles, room.center, room.radius));
  return [...tiles.values()].sort((a, b) => a.r - b.r || a.q - b.q);
}

function mapRooms(radius, expandedRadius) {
  const sideRoomRadius = Math.max(2, Math.round(radius * 0.55));
  const smallRoomRadius = Math.max(1, Math.round(radius * 0.4));
  return [
    { center: { q: 0, r: 0 }, radius },
    { center: { q: expandedRadius - sideRoomRadius, r: -Math.round(radius * 0.75) }, radius: sideRoomRadius },
    { center: { q: -expandedRadius + sideRoomRadius, r: Math.round(radius * 0.55) }, radius: sideRoomRadius },
    { center: { q: Math.round(radius * 0.45), r: -expandedRadius + sideRoomRadius }, radius: smallRoomRadius + 1 },
    { center: { q: -Math.round(radius * 0.35), r: expandedRadius - sideRoomRadius }, radius: smallRoomRadius },
  ];
}

function addHexRoom(tiles, center, radius) {
  for (let dq = -radius; dq <= radius; dq += 1) {
    const dr1 = Math.max(-radius, -dq - radius);
    const dr2 = Math.min(radius, -dq + radius);
    for (let dr = dr1; dr <= dr2; dr += 1) {
      const tile = { q: center.q + dq, r: center.r + dr };
      tiles.set(hexKey(tile), tile);
    }
  }
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
      updateBoardCamera(boardBounds(), true);
      window.setTimeout(() => scheduleTurn(), CAMERA_FOCUS_DELAY);
    }, WAVE_INTRO_DELAY);
    return;
  }
  window.setTimeout(() => runTurn(), turnDelay());
}

async function runTurn() {
  if (state.paused || state.busy || state.waitingReward || state.finished) return;
  state.busy = true;
  state.turn += 1;
  state.currentTimeline = [];
  state.activeTimelineIndex = -1;
  state.completedTimelineCount = 0;
  state.completedTimelineIndexes = new Set();
  state.comboHits = {};
  processMeteors();
  if (checkEndConditions()) {
    state.busy = false;
    return;
  }

  const player = getPlayer();
  if (!player) {
    finishRun(false);
    return;
  }

  const playerCard = drawPlayerCard();
  const drawnEntries = [{ actorType: "player", actorId: player.id, card: playerCard }];
  const enemyEntries = aliveEnemyKinds().map((kind) => ({
    actorType: "enemyGroup",
    actorId: kind,
    card: drawEnemyCard(kind),
  }));
  drawnEntries.push(...enemyEntries);

  const entries = [...drawnEntries].sort(compareTimeline);
  state.currentTimeline = drawnEntries;
  state.priorityRevealMode = "drawn";
  state.activeTimelineIndex = -1;
  state.completedTimelineCount = 0;
  state.completedTimelineIndexes = new Set();
  state.suppressPlayerCard = true;
  log(`턴 ${state.turn}: ${entries.map((entry) => entry.card.name).join(", ")}`);
  render();
  await playPriorityReveal(drawnEntries, entries);
  state.currentTimeline = entries;
  state.priorityRevealMode = "";
  renderPriorityStrip();

  for (let index = 0; index < entries.length; index += 1) {
    if (state.finished || state.waitingReward) break;
    state.activeTimelineIndex = index;
    renderPriorityStrip();
    renderDrawnCards();
    renderTimeline(index);
    showDrawnCardReveal(
      entries[index].card,
      entryOwnerLabel(entries[index]),
      entries[index].actorType === "player" ? "player" : "enemy"
    );
    await sleep(360);
    await sleep(turnDelay(1.85));
    hideDrawnCardReveal();
    await sleep(380);
    await executeTimelineEntry(entries[index]);
    expireTurnEndEffects(entries[index]);
    state.completedTimelineIndexes.add(index);
    state.completedTimelineCount = Math.max(state.completedTimelineCount, index + 1);
    state.activeTimelineIndex = -1;
    renderPriorityStrip();
    renderDrawnCards();
    renderTimeline();
    await sleep(turnDelay());
    if (checkEndConditions()) break;
  }

  if (!state.waitingReward && !state.finished) {
    discardResolvedCard(playerCard, player);
    enemyEntries.forEach((entry) => discardEnemyCard(entry.card, entry.actorId));
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

  const enemies = aliveEnemies()
    .filter((enemy) => enemy.kind === entry.actorId)
    .sort((a, b) => a.monsterIndex - b.monsterIndex);
  if (!enemies.length) {
    checkEndConditions();
    return;
  }

  for (const enemy of enemies) {
    if (state.finished || state.waitingReward) break;
    if (!isAlive(enemy)) continue;
    await executeCard(enemy, entry.card);
    await sleep(turnDelay(0.55));
    if (checkEndConditions()) break;
  }
}

async function executeCard(actor, cardData) {
  log(`${actor.name} - ${cardData.name}`);

  for (const action of cardData.actions) {
    if (!isAlive(actor)) return;
    const rendered = await executeAction(actor, action, cardData);
    if (!rendered) render();
    await sleep(turnDelay(0.7));
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
  if (action.type === "fleeToRune") {
    await moveActor(actor, { ...action, fleeToRune: true }, cardData);
    return true;
  }
  if (action.type === "attack") {
    attack(actor, action);
    return true;
  }
  if (action.type === "momentumAttack") {
    await momentumAttack(actor, action);
    return true;
  }
  if (action.type === "patternAttack") {
    patternAttack(actor, action);
    return true;
  }
  if (action.type === "charge") {
    actor.charge = (actor.charge ?? 0) + action.amount;
    if (actor.permanent?.chargeRetreat) {
      await moveActor(actor, { type: "flee", amount: actor.permanent.chargeRetreat, flee: true, ignoreCannotMove: true }, cardData);
    }
    actor.temporary.cannotMove = true;
    log(`${actor.name} 차지 ${actor.charge}`);
    return Boolean(actor.permanent?.chargeRetreat);
  }
  if (action.type === "permanent") {
    actor.permanent[action.effect] = (actor.permanent[action.effect] ?? 0) + action.amount;
    if (action.effect === "lowHpDamage") {
      actor.permanent.lowHpDamageThreshold = Math.min(actor.permanent.lowHpDamageThreshold ?? 1, action.threshold ?? 0.25);
    }
    log(`${actor.name} 영구 효과: ${action.effect}`);
    return false;
  }
  if (action.type === "placeTrap" || action.type === "placeObstacle") {
    placeTrap(actor, action);
    return false;
  }
  if (action.type === "placeRune") {
    placeRune(actor, action);
    return false;
  }
  if (action.type === "runeAttack") {
    runeAttack(actor, action);
    return true;
  }
  if (action.type === "detonateRune") {
    detonateRune(actor, action);
    return true;
  }
  if (action.type === "placeMeteor") {
    placeMeteor(actor, action);
    return false;
  }
  if (action.type === "selfDamagePercent") {
    selfDamagePercent(actor, action.percent);
    return false;
  }
  if (action.type === "healPercent") {
    healPercent(actor, action.percent);
    return false;
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

function drawEnemyCard(kind) {
  state.enemyDecks[kind] = state.enemyDecks[kind] ?? shuffle(expandCards(monsterDecks[kind] ?? monsterDecks.brute));
  state.enemyDiscards[kind] = state.enemyDiscards[kind] ?? [];
  if (!state.enemyDecks[kind].length) {
    state.enemyDecks[kind] = shuffle(state.enemyDiscards[kind]);
    state.enemyDiscards[kind] = [];
  }
  return state.enemyDecks[kind].shift();
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

function discardEnemyCard(cardData, kind) {
  if (!cardData) return;
  if (cardData.actions.some((action) => action.type === "permanent")) return;
  state.enemyDiscards[kind] = state.enemyDiscards[kind] ?? [];
  if (isSustainCard(cardData)) {
    state.enemySustainedCards[kind] = state.enemySustainedCards[kind] ?? [];
    state.enemySustainedCards[kind].push({ card: cardData, discardAfterTurn: state.turn + 1 });
    return;
  }
  state.enemyDiscards[kind].push(cardData);
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
    state.entities.filter((entity) => entity.side === "enemy" && entity.kind === entry.actorId).forEach((enemy) => {
      expireTemporaryEffectsAtTurnEnd(enemy);
    });
    releaseExpiredSustainedCards(state.enemySustainedCards[entry.actorId], state.enemyDiscards[entry.actorId]);
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
      effect.onExpire?.(actor, effect);
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

  const chargeBonus = consumeChargeForAttack(actor);
  for (const target of targets) {
    if (!isAlive(actor)) return;
    if (!isAlive(target)) continue;
    let multiplier = action.mult + chargeBonus;
    if (actor.permanent?.comboDamage) {
      const key = `${actor.id}-${target.id}`;
      state.comboHits = state.comboHits ?? {};
      multiplier *= 1 + (state.comboHits[key] ?? 0) * actor.permanent.comboDamage;
      state.comboHits[key] = (state.comboHits[key] ?? 0) + 1;
    }
    const distance = axialDistance(actor, target);
    const adjacentPenalty = !action.melee && distance <= 1 ? 0.7 : 1;
    const damage = Math.max(1, Math.round(actor.baseAtk * multiplier * adjacentPenalty * actorDamageMultiplier(actor)));
    const hitPosition = { q: target.q, r: target.r };
    const beforeHp = target.hp;
    applyDamage(target, damage);
    renderBoard();
    renderHud();
    showHitEffect(target, hitPosition, damage);
    log(`${actor.name} -> ${target.name} ${damage} 피해`);
    applyOverkillSplash(actor, target, damage - beforeHp);
    if (action.push && isAlive(target)) pushTarget(actor, target, action.push);
    if (action.pull && isAlive(target)) pullTarget(actor, target, action.pull);
  }
}

function patternAttack(actor, action) {
  const placement = bestPatternPlacement(action.pattern, actor, effectiveActionRange(actor, action), actor.side);
  if (!placement.tiles.length) {
    log(`${actor.name} 공격 실패`);
    return;
  }

  const chargeBonus = consumeChargeForAttack(actor);
  const targetBonus = (placement.targets.length - 1) * (action.perTargetBonus ?? 0);
  placement.targets.forEach((target) => {
    if (!isAlive(actor) || !isAlive(target)) return;
    const distance = axialDistance(actor, target);
    const adjacentPenalty = !action.melee && distance <= 1 ? 0.7 : 1;
    const damage = Math.max(
      1,
      Math.round(actor.baseAtk * (action.mult + chargeBonus + targetBonus) * adjacentPenalty * actorDamageMultiplier(actor)),
    );
    const hitPosition = { q: target.q, r: target.r };
    const beforeHp = target.hp;
    applyDamage(target, damage);
    renderBoard();
    renderHud();
    showHitEffect(target, hitPosition, damage);
    log(`${actor.name} -> ${target.name} ${damage} 피해`);
    applyOverkillSplash(actor, target, damage - beforeHp);
  });
}

function selectTargets(actor, action) {
  const range = effectiveActionRange(actor, action);
  const candidates = aliveOpponents(actor)
    .filter((target) => canTarget(actor, target, range))
    .sort((a, b) => {
      if (a.hp !== b.hp) return a.hp - b.hp;
      const distanceA = targetPriorityDistance(actor, a, action);
      const distanceB = targetPriorityDistance(actor, b, action);
      if (distanceA !== distanceB) return distanceA - distanceB;
      return (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0);
    });

  return candidates.slice(0, action.targets ?? 1);
}

function targetPriorityDistance(actor, target, action) {
  if (isMeleeAttackAction(action)) return approachDistanceToTarget(actor, actor, target);
  return axialDistance(actor, target);
}

async function moveActor(actor, action, cardData) {
  const amount = action.amount ?? actor.baseMove;
  if (actor.temporary?.cannotMove && !action.ignoreCannotMove) {
    log(`${actor.name} 이동 불가`);
    return { moved: 0, unused: amount };
  }

  const reachable = reachableTiles(actor, amount, action.jump, false)
    .map((tile) => ({ ...tile, trapRisk: movementTrapRisk(actor, tile, action.jump) }));
  if (!reachable.length) {
    log(`${actor.name} 이동 실패`);
    return { moved: 0, unused: amount };
  }

  const nextAttack = nextAttackAction(cardData, action);
  let destination;
  if (action.flee) {
    destination = bestFleeTile(actor, reachable);
  } else if (action.fleeToRune) {
    destination = bestRuneRetreatTile(actor, reachable);
  } else {
    destination = bestCombatMoveTile(actor, reachable, nextAttack ?? action);
  }

  if (!destination || sameHex(destination, actor)) {
    log(`${actor.name} 제자리`);
    return { moved: 0, unused: amount };
  }

  const path = findMovePath(actor, destination, action.jump);
  const moved = path.length || axialDistance(actor, destination);
  await animateActorPath(actor, path.length ? path : [destination]);
  log(`${actor.name} 이동 (${actor.q}, ${actor.r})`);
  triggerTrap(actor);
  return { moved, unused: Math.max(0, amount - moved) };
}

async function momentumAttack(actor, action) {
  const followUpAttack = { type: "attack", mult: action.mult, range: action.range ?? 1, melee: true };
  const moveAction = {
    type: "move",
    amount: action.amount,
    desiredRange: action.range ?? 1,
    jump: action.jump,
  };
  const result = await moveActor(actor, moveAction, { actions: [moveAction, followUpAttack] });
  if (!isAlive(actor)) return;
  const unusedMove = result?.unused ?? 0;
  const bonusPerMove = action.perUnusedMoveBonus ?? 1;
  attack(actor, {
    ...action,
    type: "attack",
    mult: action.mult + unusedMove * bonusPerMove,
    range: action.range ?? 1,
    melee: true,
  });
}

function actorDamageMultiplier(actor) {
  if (!actor) return 1;
  let bonus = 0;
  if (actor.permanent?.berserkLostHpDamage && actor.maxHp) {
    const lostHpRatio = Math.max(0, (actor.maxHp - actor.hp) / actor.maxHp);
    bonus += lostHpRatio * actor.permanent.berserkLostHpDamage;
  }
  if (actor.permanent?.lowHpDamage && actor.maxHp) {
    const hpRatio = actor.hp / actor.maxHp;
    const threshold = actor.permanent.lowHpDamageThreshold ?? 0.25;
    if (hpRatio < threshold) bonus += actor.permanent.lowHpDamage;
  }
  return 1 + bonus;
}

function selfDamagePercent(actor, percent) {
  if (!isAlive(actor)) return;
  const damage = Math.max(1, Math.round(actor.maxHp * percent));
  const hitPosition = { q: actor.q, r: actor.r };
  actor.hp = Math.max(1, actor.hp - damage);
  renderBoard();
  renderHud();
  showHitEffect(actor, hitPosition, damage);
  log(`${actor.name} 체력 ${damage} 감소`);
}

function healPercent(actor, percent) {
  if (!isAlive(actor)) return;
  const amount = Math.max(1, Math.round(actor.maxHp * percent));
  const beforeHp = actor.hp;
  actor.hp = Math.min(actor.maxHp, actor.hp + amount);
  renderBoard();
  renderHud();
  log(`${actor.name} 체력 ${actor.hp - beforeHp} 회복`);
}

function findMovePath(actor, destination, jump = false) {
  const safePath = findPathForActor(actor, actor, destination, jump, true);
  if (safePath.length || sameHex(actor, destination)) return safePath;
  return findPathForActor(actor, actor, destination, jump, false);
}

function findPathForActor(actor, start, destination, jump = false, avoidTraps = false) {
  if (avoidTraps && !sameHex(start, destination) && movementTrapAt(destination)) return [];
  const startKey = hexKey(start);
  const destinationKey = hexKey(destination);
  const queue = [{ q: start.q, r: start.r }];
  const parentByKey = new Map([[startKey, null]]);

  while (queue.length) {
    const current = queue.shift();
    if (hexKey(current) === destinationKey) break;

    for (const dir of directions) {
      const next = { q: current.q + dir.q, r: current.r + dir.r };
      const key = hexKey(next);
      if (!isTile(next) || parentByKey.has(key)) continue;
      if (!jump && blocksPath(next, actor, { avoidTraps })) continue;
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

function movementDistanceBetween(actor, start, destination, jump = false, avoidTraps = true) {
  if (sameHex(start, destination)) return 0;
  const path = findPathForActor(actor, start, destination, jump, avoidTraps);
  return path.length ? path.length : Infinity;
}

function movementTrapRisk(actor, destination, jump = false) {
  if (sameHex(actor, destination)) return 0;
  const safePath = findPathForActor(actor, actor, destination, jump, true);
  if (safePath.length) return 0;
  const fallbackPath = findPathForActor(actor, actor, destination, jump, false);
  if (!fallbackPath.length) return 9999;
  return fallbackPath.filter((step) => movementTrapAt(step)).length;
}

async function animateActorPath(actor, path) {
  for (const step of path) {
    if (!isAlive(actor)) return;
    const from = { q: actor.q, r: actor.r };
    await slideActorTo(actor, from, step);
    actor.q = step.q;
    actor.r = step.r;
    renderBoard();
    const triggeredTrap = triggerTrap(actor);
    if (triggeredTrap === "block" || !isAlive(actor)) break;
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
  const desiredRange = attackAction?.type === "attack" || attackAction?.type === "patternAttack"
    ? effectiveActionRange(actor, attackAction)
    : (attackAction?.desiredRange ?? actor.baseRange);
  const candidateTiles = isMeleeAttackAction(attackAction) ? [actor, ...reachable] : reachable;

  const scored = candidateTiles.map((tile) => {
    const targetInfo = scoreTargetsFromTile(actor, tile, attackAction);
    const nearest = nearestOpponentMoveDistance(actor, tile, opponents, attackAction);
    const closestToDesired = -Math.abs(nearest - desiredRange);
    const farthestClosest = nearest;
    const moveCost = tile.distance ?? axialDistance(actor, tile);
    const trapRisk = tile.trapRisk ?? 0;
    return {
      tile,
      hitCount: targetInfo.hitCount,
      lowestIndex: targetInfo.lowestIndex,
      closestToDesired,
      farthestClosest,
      moveCost,
      trapRisk,
    };
  });

  scored.sort((a, b) => {
    if (a.hitCount !== b.hitCount) return b.hitCount - a.hitCount;
    if (a.trapRisk !== b.trapRisk) return a.trapRisk - b.trapRisk;
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

function nearestOpponentMoveDistance(actor, tile, opponents, attackAction) {
  if (!isMeleeAttackAction(attackAction)) {
    return Math.min(...opponents.map((enemy) => axialDistance(tile, enemy)));
  }
  return Math.min(...opponents.map((enemy) => approachDistanceToTarget(actor, tile, enemy)));
}

function approachDistanceToTarget(actor, fromTile, target) {
  if (axialDistance(fromTile, target) <= 1) return 0;
  const adjacentTiles = directions
    .map((dir) => ({ q: target.q + dir.q, r: target.r + dir.r }))
    .filter((tile) => isTile(tile) && canEndMoveAt(tile, actor, { avoidTraps: true }));
  const safeDistance = Math.min(
    ...adjacentTiles.map((tile) => movementDistanceBetween(actor, fromTile, tile, false, true)),
    Infinity,
  );
  if (Number.isFinite(safeDistance)) return safeDistance;

  const fallbackTiles = directions
    .map((dir) => ({ q: target.q + dir.q, r: target.r + dir.r }))
    .filter((tile) => isTile(tile) && canEndMoveAt(tile, actor, { avoidTraps: false }));
  return Math.min(
    ...fallbackTiles.map((tile) => movementDistanceBetween(actor, fromTile, tile, false, false)),
    Infinity,
  );
}

function scoreTargetsFromTile(actor, tile, attackAction) {
  if (!attackAction || (attackAction.type !== "attack" && attackAction.type !== "patternAttack")) {
    return { hitCount: 0, lowestHp: Infinity, lowestIndex: 9999 };
  }
  if (attackAction.type === "patternAttack") {
    const placement = bestPatternPlacement(attackAction.pattern, tile, effectiveActionRange(actor, attackAction), actor.side);
    return {
      hitCount: placement.targets.length,
      lowestHp: placement.lowestHp,
      lowestIndex: placement.lowestIndex,
    };
  }
  const targets = aliveOpponents(actor).filter((target) =>
    canTargetFromTile(tile, actor.side, target, effectiveActionRange(actor, attackAction)),
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
    const aTrapRisk = a.trapRisk ?? 0;
    const bTrapRisk = b.trapRisk ?? 0;
    if (aTrapRisk !== bTrapRisk) return aTrapRisk - bTrapRisk;
    const aMin = Math.min(...opponents.map((enemy) => axialDistance(a, enemy)));
    const bMin = Math.min(...opponents.map((enemy) => axialDistance(b, enemy)));
    if (aMin !== bMin) return bMin - aMin;
    return (a.distance ?? axialDistance(actor, a)) - (b.distance ?? axialDistance(actor, b));
  })[0];
}

function bestRuneRetreatTile(actor, reachable) {
  const runes = ownedRunes(actor);
  if (!runes.length) return bestFleeTile(actor, reachable);
  return [...reachable].sort((a, b) => {
    const aTrapRisk = a.trapRisk ?? 0;
    const bTrapRisk = b.trapRisk ?? 0;
    if (aTrapRisk !== bTrapRisk) return aTrapRisk - bTrapRisk;
    const aRuneDistance = Math.min(...runes.map((rune) => axialDistance(a, rune)));
    const bRuneDistance = Math.min(...runes.map((rune) => axialDistance(b, rune)));
    if (aRuneDistance !== bRuneDistance) return aRuneDistance - bRuneDistance;
    const aEnemyDistance = Math.min(...aliveOpponents(actor).map((enemy) => axialDistance(a, enemy)), Infinity);
    const bEnemyDistance = Math.min(...aliveOpponents(actor).map((enemy) => axialDistance(b, enemy)), Infinity);
    if (aEnemyDistance !== bEnemyDistance) return bEnemyDistance - aEnemyDistance;
    return (a.distance ?? axialDistance(actor, a)) - (b.distance ?? axialDistance(actor, b));
  })[0];
}

function reachableTiles(actor, maxDistance, jump = false, avoidTraps = false) {
  const startKey = hexKey(actor);
  const queue = [{ q: actor.q, r: actor.r, distance: 0 }];
  const visited = new Map([[startKey, 0]]);
  const result = [];

  while (queue.length) {
    const current = queue.shift();
    if (current.distance > 0 && canEndMoveAt(current, actor, { avoidTraps })) result.push(current);
    if (current.distance >= maxDistance) continue;

    for (const dir of directions) {
      const next = { q: current.q + dir.q, r: current.r + dir.r };
      const key = hexKey(next);
      if (!isTile(next) || visited.has(key)) continue;
      if (!jump && blocksPath(next, actor, { avoidTraps })) continue;
      visited.set(key, current.distance + 1);
      queue.push({ ...next, distance: current.distance + 1 });
    }
  }

  return result;
}

function canEndMoveAt(tile, actor, options = {}) {
  if (isWall(tile)) return false;
  if (options.avoidTraps && movementTrapAt(tile)) return false;
  return !state.entities.some((entity) => isAlive(entity) && entity.id !== actor.id && sameHex(entity, tile));
}

function blocksPath(tile, actor, options = {}) {
  if (isWall(tile)) return true;
  if (options.avoidTraps && movementTrapAt(tile)) return true;
  return state.entities.some((entity) => {
    if (!isAlive(entity) || entity.id === actor.id) return false;
    return sameHex(entity, tile) && entity.side !== actor.side;
  });
}

function pushTarget(actor, target, amount) {
  forceMoveTarget(actor, target, amount, "push");
}

function pullTarget(actor, target, amount) {
  forceMoveTarget(actor, target, amount, "pull");
}

function forceMoveTarget(actor, target, amount, mode) {
  let current = { q: target.q, r: target.r };
  for (let step = 0; step < amount; step += 1) {
    const next = nextForcedMoveTile(actor, target, current, mode);
    if (!next) break;
    current = next;
    target.q = current.q;
    target.r = current.r;
    const triggeredTrap = triggerTrap(target);
    if (triggeredTrap === "block" || !isAlive(target)) break;
  }
}

function nextForcedMoveTile(actor, target, current, mode) {
  const currentDistance = axialDistance(actor, current);
  const candidates = directions
    .map((dir) => ({ q: current.q + dir.q, r: current.r + dir.r }))
    .filter((tile) => isTile(tile) && canEndMoveAt(tile, target))
    .map((tile) => ({ tile, distance: axialDistance(actor, tile), trap: trapAt(tile) }))
    .filter((item) => (mode === "push" ? item.distance > currentDistance : item.distance < currentDistance));

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (Boolean(a.trap) !== Boolean(b.trap)) return a.trap ? -1 : 1;
    if (a.distance !== b.distance) return mode === "push" ? b.distance - a.distance : a.distance - b.distance;
    if (a.tile.q !== b.tile.q) return a.tile.q - b.tile.q;
    return a.tile.r - b.tile.r;
  });

  return candidates[0].tile;
}

function placeTrap(actor, action) {
  const opponents = aliveOpponents(actor);
  const reachable = state.tiles
    .filter((tile) => axialDistance(actor, tile) <= action.range)
    .filter((tile) => !sameHex(tile, actor))
    .filter((tile) => canEndMoveAt(tile, actor))
    .filter((tile) => !trapAt(tile))
    .sort((a, b) => {
      if (!opponents.length) return Math.random() - 0.5;
      const aBetween = isBetweenActorAndEnemy(actor, a, opponents);
      const bBetween = isBetweenActorAndEnemy(actor, b, opponents);
      if (aBetween !== bBetween) return aBetween ? -1 : 1;
      const aNearEnemy = Math.min(...opponents.map((enemy) => axialDistance(a, enemy)));
      const bNearEnemy = Math.min(...opponents.map((enemy) => axialDistance(b, enemy)));
      if (aNearEnemy !== bNearEnemy) return aNearEnemy - bNearEnemy;
      return axialDistance(actor, a) - axialDistance(actor, b);
    });

  const count = action.count ?? 1;
  const tiles = reachable.slice(0, count);
  if (!tiles.length) {
    log(`${actor.name} 함정 설치 실패`);
    return;
  }
  tiles.forEach((tile) => {
    state.obstacles.push({
      q: tile.q,
      r: tile.r,
      kind: action.trap ?? action.obstacle ?? "attack",
      ownerId: actor.id,
      ownerSide: actor.side,
      power: action.power ?? 2,
      baseAtk: actor.baseAtk,
    });
  });
  log(`${actor.name} 함정 ${tiles.length}개 설치`);
}

function placeRune(actor, action) {
  const opponents = aliveOpponents(actor);
  const reachable = state.tiles
    .filter((tile) => axialDistance(actor, tile) <= action.range)
    .filter((tile) => !sameHex(tile, actor))
    .filter((tile) => canEndMoveAt(tile, actor))
    .filter((tile) => !trapAt(tile))
    .sort((a, b) => {
      const aEnemyDistance = Math.min(...opponents.map((enemy) => axialDistance(a, enemy)), Infinity);
      const bEnemyDistance = Math.min(...opponents.map((enemy) => axialDistance(b, enemy)), Infinity);
      if (aEnemyDistance !== bEnemyDistance) return aEnemyDistance - bEnemyDistance;
      return axialDistance(actor, a) - axialDistance(actor, b);
    });

  const tiles = reachable.slice(0, action.count ?? 1);
  if (!tiles.length) {
    log(`${actor.name} 룬 설치 실패`);
    return;
  }
  tiles.forEach((tile) => {
    state.obstacles.push({
      q: tile.q,
      r: tile.r,
      kind: "rune",
      ownerId: actor.id,
      ownerSide: actor.side,
      power: action.power ?? 1,
      baseAtk: actor.baseAtk,
    });
  });
  log(`${actor.name} 룬 ${tiles.length}개 설치`);
}

function ownedRunes(actor) {
  return state.obstacles.filter((obstacle) => obstacle.kind === "rune" && obstacle.ownerId === actor.id);
}

function runeAttack(actor, action) {
  const runes = ownedRunes(actor);
  const targets = targetsNearRunes(actor, runes, action.radius ?? 1);
  if (!targets.length) {
    log(`${actor.name} 룬 공격 실패`);
    return;
  }
  targets.forEach((target) => dealActionDamage(actor, target, action.mult, true));
}

function detonateRune(actor, action) {
  const runes = ownedRunes(actor);
  if (!runes.length) {
    log(`${actor.name} 룬 폭파 실패`);
    return;
  }
  const radius = action.radius ?? 1;
  const scored = runes.map((rune) => {
    const targets = targetsNearRunes(actor, [rune], radius);
    return {
      rune,
      targets,
      lowestHp: Math.min(...targets.map((target) => target.hp), Infinity),
      nearestEnemy: Math.min(...aliveOpponents(actor).map((enemy) => axialDistance(rune, enemy)), Infinity),
    };
  }).sort((a, b) => {
    if (a.targets.length !== b.targets.length) return b.targets.length - a.targets.length;
    if (a.lowestHp !== b.lowestHp) return a.lowestHp - b.lowestHp;
    return a.nearestEnemy - b.nearestEnemy;
  });
  const best = scored[0];
  if (!best?.targets.length) {
    log(`${actor.name} 룬 폭파 실패`);
    return;
  }
  state.obstacles = state.obstacles.filter((obstacle) => obstacle !== best.rune);
  best.targets.forEach((target) => dealActionDamage(actor, target, action.mult, true));
  log(`${actor.name} 룬 폭파`);
}

function placeMeteor(actor, action) {
  const landing = bestMeteorLanding(actor, action);
  if (!landing) {
    log(`${actor.name} 운석 예고 실패`);
    return;
  }
  state.meteors.push({
    q: landing.q,
    r: landing.r,
    ownerId: actor.id,
    ownerSide: actor.side,
    baseAtk: actor.baseAtk,
    mult: action.mult,
    radius: action.radius ?? 1,
    triggerTurn: state.turn + (action.delay ?? 1),
  });
  log(`${actor.name} 운석 예고 (${landing.q}, ${landing.r})`);
}

function bestMeteorLanding(actor, action) {
  const range = action.range ?? actor.baseRange;
  const radius = action.radius ?? 1;
  const candidates = state.tiles
    .filter((tile) => wallAwareDistance(actor, tile) <= range && hasLineOfSight(actor, tile))
    .map((tile) => {
      const targets = aliveOpponents(actor).filter((enemy) => axialDistance(tile, enemy) <= radius);
      return {
        tile,
        targets,
        nearestEnemy: Math.min(...aliveOpponents(actor).map((enemy) => axialDistance(tile, enemy)), Infinity),
        distance: axialDistance(actor, tile),
        lowestHp: Math.min(...targets.map((target) => target.hp), Infinity),
      };
    });
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    if (a.targets.length !== b.targets.length) return b.targets.length - a.targets.length;
    if (a.lowestHp !== b.lowestHp) return a.lowestHp - b.lowestHp;
    if (a.nearestEnemy !== b.nearestEnemy) return a.nearestEnemy - b.nearestEnemy;
    return a.distance - b.distance;
  });
  return candidates[0].tile;
}

function processMeteors() {
  const due = state.meteors.filter((meteor) => meteor.triggerTurn <= state.turn);
  if (!due.length) return;
  state.meteors = state.meteors.filter((meteor) => meteor.triggerTurn > state.turn);
  due.forEach((meteor) => {
    const targets = state.entities.filter((entity) => {
      return isAlive(entity) && entity.side !== meteor.ownerSide && axialDistance(meteor, entity) <= meteor.radius;
    });
    if (!targets.length) {
      log(`운석 빗나감 (${meteor.q}, ${meteor.r})`);
      return;
    }
    targets.forEach((target) => {
      const damage = Math.max(1, Math.round((meteor.baseAtk ?? 10) * meteor.mult));
      const hitPosition = { q: target.q, r: target.r };
      applyDamage(target, damage);
      renderBoard();
      renderHud();
      showHitEffect(target, hitPosition, damage);
      log(`운석 -> ${target.name} ${damage} 피해`);
    });
  });
}

function targetsNearRunes(actor, runes, radius) {
  const seen = new Set();
  return aliveOpponents(actor)
    .filter((target) => runes.some((rune) => axialDistance(rune, target) <= radius))
    .filter((target) => {
      if (seen.has(target.id)) return false;
      seen.add(target.id);
      return true;
    })
    .sort((a, b) => {
      if (a.hp !== b.hp) return a.hp - b.hp;
      return (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0);
    });
}

function dealActionDamage(actor, target, multiplier, melee = false) {
  if (!isAlive(actor) || !isAlive(target)) return;
  const distance = axialDistance(actor, target);
  const adjacentPenalty = !melee && distance <= 1 ? 0.7 : 1;
  const damage = Math.max(1, Math.round(actor.baseAtk * multiplier * adjacentPenalty * actorDamageMultiplier(actor)));
  const hitPosition = { q: target.q, r: target.r };
  const beforeHp = target.hp;
  applyDamage(target, damage);
  renderBoard();
  renderHud();
  showHitEffect(target, hitPosition, damage);
  log(`${actor.name} -> ${target.name} ${damage} 피해`);
  applyOverkillSplash(actor, target, damage - beforeHp);
}

function isBetweenActorAndEnemy(actor, tile, opponents) {
  return opponents.some((enemy) => {
    const actorToEnemy = axialDistance(actor, enemy);
    return axialDistance(actor, tile) + axialDistance(tile, enemy) === actorToEnemy;
  });
}

function effectiveActionRange(actor, action) {
  const range = action?.range;
  if (!range) return range;
  return range + (actor.charge ?? 0) * (actor.permanent?.chargeRangePerStack ?? 0);
}

function consumeChargeForAttack(actor) {
  const charge = actor.charge ?? 0;
  if (!charge) return 0;
  const multiplier = actor.permanent?.chargeStackMultiplier ?? 1;
  const bonus = charge * multiplier;
  log(`${actor.name} 차지 ${charge} 소비`);
  actor.charge = 0;
  actor.temporary.cannotMove = false;
  renderHud();
  return bonus;
}

function applyOverkillSplash(actor, defeatedTarget, overkillDamage) {
  if (overkillDamage <= 0 || !actor.permanent?.overkillSplashRange) return;
  const range = actor.permanent.overkillSplashRange;
  const target = aliveOpponents(actor)
    .filter((enemy) => enemy.id !== defeatedTarget.id)
    .filter((enemy) => wallAwareDistance(defeatedTarget, enemy) <= range && hasLineOfSight(defeatedTarget, enemy))
    .sort((a, b) => {
      if (a.hp !== b.hp) return a.hp - b.hp;
      const distanceA = axialDistance(defeatedTarget, a);
      const distanceB = axialDistance(defeatedTarget, b);
      if (distanceA !== distanceB) return distanceA - distanceB;
      return (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0);
    })[0];
  if (!target) return;
  const hitPosition = { q: target.q, r: target.r };
  applyDamage(target, overkillDamage);
  renderBoard();
  renderHud();
  showHitEffect(target, hitPosition, overkillDamage);
  log(`${actor.name} 잔여 관통 -> ${target.name} ${overkillDamage} 피해`);
}

function bestPatternPlacement(pattern, origin, range, side = origin.side) {
  if (pattern === "adjacent-pair") return bestAdjacentGroupPlacement(origin, range, side, 2);
  if (pattern === "adjacent-triple") return bestAdjacentGroupPlacement(origin, range, side, 3);
  return { tiles: [], targets: [], lowestHp: Infinity, lowestIndex: 9999 };
}

function bestAdjacentPair(actorOrTile, range, side = actorOrTile.side) {
  return bestAdjacentGroupPlacement(actorOrTile, range, side, 2).tiles;
}

function bestAdjacentGroupPlacement(actorOrTile, range, side = actorOrTile.side, size = 2) {
  const origin = actorOrTile;
  const candidates = [];
  const seen = new Set();
  for (const tile of state.tiles) {
    for (let directionIndex = 0; directionIndex < directions.length; directionIndex += 1) {
      const dir = directions[directionIndex];
      const nextDir = directions[(directionIndex + 1) % directions.length];
      const group = size === 2
        ? [tile, { q: tile.q + dir.q, r: tile.r + dir.r }]
        : [tile, { q: tile.q + dir.q, r: tile.r + dir.r }, { q: tile.q + nextDir.q, r: tile.r + nextDir.r }];
      if (group.some((hex) => !isTile(hex))) continue;
      const key = group.map(hexKey).sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const anchorDistances = group
        .map((hex) => wallAwareDistance(origin, hex))
        .filter((distance, index) => distance <= range && hasLineOfSight(origin, group[index]));
      if (!anchorDistances.length) continue;
      const targets = state.entities.filter((entity) => {
        return isAlive(entity) && entity.side !== side && group.some((hex) => sameHex(hex, entity));
      });
      if (targets.length) {
        candidates.push({
          tiles: group,
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
  document.body.classList.remove("revealing-priority");
  log(win ? "스테이지 클리어" : "패배");
  render();
}

function showRewards() {
  const rewards = drawRewards();
  elements.rewardCards.innerHTML = "";
  rewards.forEach((reward) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `reward-pick ${rarityClass(reward.rarity)}`;
    button.innerHTML = `
      ${cardMount(reward, "reward-mount")}
      <span class="pick">선택</span>
    `;
    button.addEventListener("click", () => pickReward(reward));
    elements.rewardCards.append(button);
  });
  elements.rewardOverlay.classList.remove("hidden");
}

function drawRewards() {
  return shuffle(getSelectedCharacter().rewardPool).slice(0, 4).map((entry) => ({
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
  renderEnemySummary();
  renderPriorityStrip();
  renderPlayerHud();
  renderDrawnCards();
  renderTimeline();
  renderLog();
}

function intentParts(card) {
  const parts = [];
  (card.actions || []).forEach((a) => {
    switch (a.type) {
      case "move":
        parts.push({ kind: "move", val: a.amount, tone: "move" });
        break;
      case "flee":
      case "fleeToRune":
        parts.push({ kind: "move-flee", val: a.amount, tone: "move" });
        break;
      case "attack": {
        const k = a.melee || a.range <= 1 ? "melee" : "ranged";
        parts.push({ kind: k, val: "x" + a.mult, tone: "attack" });
        break;
      }
      case "momentumAttack":
        parts.push({ kind: "move", val: a.amount, tone: "move" });
        parts.push({ kind: "melee", val: "x" + a.mult, tone: "attack" });
        break;
      case "patternAttack":
        parts.push({ kind: a.melee ? "melee" : "ranged", val: "x" + a.mult, tone: "attack" });
        break;
      case "charge":
        parts.push({ kind: "charge", val: a.amount, tone: "special" });
        break;
      case "placeTrap":
      case "placeObstacle":
        parts.push({ kind: trapIconKind(a), val: a.count ?? 1, tone: "special" });
        break;
      case "placeRune":
        parts.push({ kind: "rune", val: a.count ?? 1, tone: "special" });
        break;
      case "runeAttack":
        parts.push({ kind: "rune", val: "x" + a.mult, tone: "attack" });
        break;
      case "detonateRune":
        parts.push({ kind: "rune-burst", val: "x" + a.mult, tone: "attack" });
        break;
      case "placeMeteor":
        parts.push({ kind: "meteor", val: a.delay ?? 1, tone: "attack" });
        break;
      case "healPercent":
        parts.push({ kind: "heal", val: "+" + Math.round(a.percent * 100) + "%", tone: "special" });
        break;
      case "permanent":
        parts.push({ kind: "permanent", val: "", tone: "special" });
        break;
      default:
        break;
    }
  });
  return parts.slice(0, 2);
}

function entityIntentMarkup(entity) {
  if (entity.side === "player") return "";
  const timeline = state.currentTimeline;
  if (!timeline || !timeline.length) return "";
  const idx = timeline.findIndex(
    (e) => e.actorType !== "player" && e.actorId === entity.kind
  );
  if (idx < 0) return "";
  const entry = timeline[idx];
  const card = entry.card;
  if (!card) return "";
  const parts = intentParts(card);
  if (!parts.length) return "";
  const done = state.completedTimelineIndexes?.has(idx);
  const active = idx === state.activeTimelineIndex;
  const tone = parts.some((p) => p.tone === "attack")
    ? "attack"
    : parts.some((p) => p.tone === "move")
      ? "move"
      : "special";
  const side = entry.actorType === "player" ? "player" : "enemy";
  const chips = parts
    .map(
      (p) =>
        `<span class="intent-chip"><span class="action-icon ${p.kind}">${actionIcon(p.kind)}</span>${p.val !== "" ? `<b>${p.val}</b>` : ""}</span>`
    )
    .join("");
  return `<span class="intent-badge tone-${tone} ${side} ${done ? "done" : ""} ${active ? "active" : ""}" aria-hidden="true"><span class="intent-pri">${card.priority}</span>${chips}</span>`;
}

function renderBoard() {
  [...elements.board.children].forEach((child) => {
    if (!child.classList.contains("hex") && !child.classList.contains("damage-pop")) child.remove();
  });
  elements.boardPanel.querySelectorAll(".offscreen-indicator").forEach((indicator) => indicator.remove());
  const bounds = boardBounds();
  fitBoardToPanel(bounds);
  renderBoardTiles(bounds);

  for (const meteor of state.meteors) {
    const point = hexToPixel(meteor, bounds);
    const div = document.createElement("div");
    div.className = "meteor-marker";
    div.textContent = meteor.triggerTurn - state.turn;
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
      <span class="entity-label">${entity.label ?? (entity.side === "player" ? getSelectedCharacter().shortLabel : entity.monsterIndex)}</span>
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

function renderBoardTiles(bounds) {
  const signature = state.tiles.map(hexKey).join("|");
  if (state.boardTileSignature !== signature || !state.boardTileElements) {
    elements.board.querySelectorAll(".hex").forEach((tile) => tile.remove());
    const tileElements = new Map();
    const fragment = document.createDocumentFragment();
    for (const tile of state.tiles) {
      const point = hexToPixel(tile, bounds);
      const div = document.createElement("div");
      const key = hexKey(tile);
      div.className = "hex";
      div.dataset.hex = key;
      div.style.left = `${point.x}px`;
      div.style.top = `${point.y}px`;
      tileElements.set(key, div);
      fragment.append(div);
    }
    elements.board.append(fragment);
    state.boardTileSignature = signature;
    state.boardTileElements = tileElements;
  }

  for (const tile of state.tiles) {
    const div = state.boardTileElements.get(hexKey(tile));
    if (!div) continue;
    div.className = "hex";
    if (isWall(tile)) div.classList.add("wall");
    const trap = trapAt(tile);
    if (trap) div.classList.add("trap", `trap-${trap.kind === "spike" ? "attack" : trap.kind}`);
  }
}

function renderOffscreenEnemyIndicators(bounds) {
  if (state.cameraMode !== "focus") return;
  const player = getPlayer();
  if (!player) return;

  const panelWidth = elements.boardPanel.clientWidth;
  const panelHeight = elements.boardPanel.clientHeight;
  const scale = Number.parseFloat(elements.board.style.getPropertyValue("--board-scale")) || 1;
  const offsetX = Number.parseFloat(elements.board.style.getPropertyValue("--board-x")) || 0;
  const offsetY = Number.parseFloat(elements.board.style.getPropertyValue("--board-y")) || 0;
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
      <span class="offscreen-enemy">${enemy.label ?? enemy.monsterIndex}</span>
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

function updateBoardCamera(bounds = boardBounds(), refreshAfterTransition = false) {
  fitBoardToPanel(bounds);
  elements.boardPanel.querySelectorAll(".offscreen-indicator").forEach((indicator) => indicator.remove());
  renderOffscreenEnemyIndicators(bounds);
  if (refreshAfterTransition) {
    window.setTimeout(() => {
      if (!state || state.cameraMode !== "focus") return;
      const currentBounds = boardBounds();
      elements.boardPanel.querySelectorAll(".offscreen-indicator").forEach((indicator) => indicator.remove());
      renderOffscreenEnemyIndicators(currentBounds);
    }, 380);
  }
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
  const character = getSelectedCharacter();
  elements.gameTitle.textContent = state.finished
    ? "런 종료"
    : `웨이브 ${state.waveIndex + 1}/${waves.length}`;
  elements.playerNameLabel.textContent = character.name;
  elements.runSummary.textContent = state.finished
    ? "런 종료"
    : `턴 ${state.turn}${waves[state.waveIndex]?.boss ? " / 보스" : ""}`;
  elements.playerHp.textContent = player ? `${player.hp} / ${player.maxHp}` : `0 / ${character.maxHp}`;
  elements.deckCount.textContent = state.deck.length;
  elements.discardCount.textContent = state.discard.length;
  elements.chargeCount.textContent = player ? player.charge ?? 0 : 0;
  elements.chargeHud.textContent = player ? player.charge ?? 0 : 0;
  elements.pauseButton.textContent = state.paused ? "재개" : "일시정지";
  elements.speedButton.textContent = `x${speedMultiplier}`;
  elements.speedButton.classList.toggle("active", speedMultiplier > 1);
  elements.characterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.character === selectedCharacterId);
  });
}

function renderEnemySummary() {
  if (!elements.enemySummary) return;
  elements.enemySummary.innerHTML = "";
  const groups = enemyGroups();
  if (!groups.length) {
    elements.enemySummary.innerHTML = `<div class="enemy-group empty">적 없음</div>`;
    return;
  }

  groups.forEach((group) => {
    const definition = monsterDefinitions[group.kind] ?? monsterDefinitions.brute;
    const sample = group.enemies[0];
    const div = document.createElement("article");
    div.className = `enemy-group ${sample?.boss ? "boss" : ""}`;
    div.innerHTML = `
      <div class="enemy-card-head">
        <div class="combatant-portrait enemy-portrait">${definition.label ?? sample?.label ?? "적"}</div>
        <div class="combatant-heading">
          <strong>${sample?.boss ? sample.name : definition.name}</strong>
          <span>x${group.enemies.length}</span>
        </div>
      </div>
      ${renderBaseStats(sample ?? definition)}
    `;
    elements.enemySummary.append(div);
  });
}

function renderPriorityStrip() {
  elements.priorityStrip.innerHTML = "";
  elements.priorityStrip.className = `priority-strip ${state.priorityRevealMode ? `reveal-${state.priorityRevealMode}` : ""}`;
  if (!state.currentTimeline.length) {
    elements.priorityStrip.innerHTML = `<span class="priority-empty">카드 대기</span>`;
    return;
  }

  state.currentTimeline.forEach((entry, index) => {
    const isPlayer = entry.actorType === "player";
    const groupEnemies = isPlayer ? [] : aliveEnemies().filter((e) => e.kind === entry.actorId);
    const boss = groupEnemies.some((e) => e.boss);
    const count = groupEnemies.length;
    const emblem = isPlayer ? getSelectedCharacter().shortLabel : monsterLabel(entry.actorId);
    const statusClass = [
      state.completedTimelineIndexes?.has(index) ? "done" : "",
      index === state.activeTimelineIndex ? "active" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const card = document.createElement("div");
    card.className = `priority-item ${isPlayer ? "player" : "enemy"} ${boss ? "boss" : ""} ${statusClass}`;
    card.title = `${entryLabel(entry)} · ${entry.card.name} · PRI ${entry.card.priority}`;
    card.innerHTML = `
      <span class="pc-portrait"><span class="pc-emblem">${emblem}</span></span>
      <span class="pc-badge">${entry.card.priority}</span>
      ${count > 1 ? `<span class="pc-count">×${count}</span>` : ""}
    `;
    elements.priorityStrip.append(card);
  });
}

function renderPlayerHud() {
  const players = state.entities.filter((entity) => entity.side === "player");
  const alivePlayers = players.filter(isAlive);
  const visiblePlayers = alivePlayers.length ? alivePlayers : players;
  elements.playerHud.innerHTML = "";
  elements.playerHud.classList.toggle("solo", visiblePlayers.length <= 1);
  elements.playerHud.classList.toggle("duo", visiblePlayers.length >= 2);

  visiblePlayers.slice(0, 2).forEach((player) => {
    const character = characterDefinitions[player.characterId] ?? getSelectedCharacter();
    const entry = state.currentTimeline.find((item) => item.actorType === "player" && item.actorId === player.id);
    const cardData = state.suppressPlayerCard ? null : entry?.card;
    const article = document.createElement("article");
    article.className = `player-block ${cardData ? "" : "waiting-card"}`;
    article.innerHTML = `
      <div class="player-info">
        <div class="combatant-heading player-heading">
          <strong>${character.name}</strong>
        </div>
        <div class="combatant-portrait player-portrait">${character.shortLabel}</div>
        ${renderBaseStats(player)}
        <div class="pile-row">
          <span title="덱">${pileIcon()}<b>${state.deck.length}</b><em>덱</em></span>
          <span title="버림">${pileIcon()}<b>${state.discard.length}</b><em>버림</em></span>
          <span title="차지">${actionIcon("charge")}<b>${player.charge ?? 0}</b><em>차지</em></span>
        </div>
      </div>
      ${renderHudCard(cardData)}
    `;
    elements.playerHud.append(article);
  });

  const playerEntry = state.currentTimeline.find((item) => item.actorType === "player");
  const drawnCardId = playerEntry?.card?.id;
  if (drawnCardId && elements.playerHud.dataset.cardId !== drawnCardId) {
    const freshCard = elements.playerHud.querySelector(".player-block:not(.waiting-card) .hud-card");
    if (freshCard) freshCard.classList.add("card-just-drawn");
  }
  elements.playerHud.dataset.cardId = drawnCardId ?? "";
}

function enemyGroups() {
  const groups = new Map();
  aliveEnemies().forEach((enemy) => {
    const key = enemy.boss ? enemy.id : enemy.kind;
    if (!groups.has(key)) groups.set(key, { kind: enemy.kind, enemies: [] });
    groups.get(key).enemies.push(enemy);
  });
  return [...groups.values()].sort((a, b) => {
    const left = monsterDefinitions[a.kind]?.name ?? a.kind;
    const right = monsterDefinitions[b.kind]?.name ?? b.kind;
    return left.localeCompare(right, "ko");
  });
}

function renderBaseStats(unit) {
  const attackKind = (unit.baseRange ?? 1) > 1 ? "ranged" : "melee";
  return `
    <div class="base-stat-row" aria-label="기본 전투 정보">
      ${baseStat("move", "이동", unit.baseMove ?? 0)}
      ${baseStat(attackKind, "공격", unit.baseAtk ?? 0)}
      ${baseStat("range", "사거리", unit.baseRange ?? 0)}
    </div>
  `;
}

function baseStat(kind, label, value) {
  return `<span class="base-stat" title="${label}"><span class="action-icon ${kind}">${actionIcon(kind)}</span><b>${value}</b></span>`;
}

function cardPrefab(card) {
  if (!card) return "";
  return `
    <div class="card-prefab ${rarityClass(card.rarity)}">
      <div class="cp-bg"></div>
      <div class="cp-banner"></div>
      <div class="cp-priority">${card.priority}</div>
      <div class="cp-name">${card.name}</div>
      <div class="cp-actions">${renderActionList(card)}</div>
    </div>
  `;
}

function cardMount(card, cls = "") {
  return `<div class="card-mount ${cls}">${cardPrefab(card)}</div>`;
}

function renderHudCard(cardData) {
  if (!cardData) {
    return `<div class="card-mount hud-mount is-empty"><span>카드 대기</span></div>`;
  }
  return cardMount(cardData, "hud-mount");
}

function pileIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5 16.6 3l2.8 12.4-9.6 2.5L7 5.5Z"/><path d="M4.6 8.5 7 19.2l8.2-2.1"/></svg>`;
}

function renderDrawnCards() {
  elements.drawnCards.innerHTML = "";
  state.currentTimeline.forEach((entry, index) => {
    const div = document.createElement("div");
    const statusClass = [
      state.completedTimelineIndexes?.has(index) ? "done" : "",
      index === state.activeTimelineIndex ? "active" : "",
    ]
      .filter(Boolean)
      .join(" ");
    div.className = `order-chip ${entry.actorType === "player" ? "player" : "enemy"} ${statusClass}`;
    div.title = `${entryLabel(entry)} · ${entry.card.name} · PRI ${entry.card.priority}`;
    div.innerHTML = `<span>${index + 1}</span><strong>${entry.actorType === "player" ? getSelectedCharacter().shortLabel : monsterLabel(entry.actorId)}</strong>`;
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

async function playPriorityReveal(drawnEntries, sortedEntries) {
  document.body.classList.add("revealing-priority");
  const playerEntry = drawnEntries.find((e) => e.actorType === "player");
  const enemyEntries = drawnEntries.filter((e) => e.actorType !== "player");
  state.activeTimelineIndex = -1;
  state.completedTimelineCount = 0;
  state.completedTimelineIndexes = new Set();

  // 1) 적들의 우선권이 먼저 보드에 등장
  state.currentTimeline = enemyEntries;
  state.priorityRevealMode = "drawn";
  renderPriorityStrip();
  renderDrawnCards();
  renderBoard();

  // 2) 0.5초 대기
  await sleep(turnDelay(0.9));

  // 3) 내 카드 드로우 — 진짜 카드가 중앙에 완전히 등장
  showDrawnCardReveal(playerEntry?.card, "내 카드", "player");
  await sleep(360);

  // 4) 1초 대기 (카드 읽기)
  await sleep(turnDelay(1.85));

  // 5) 우선권 재정렬 + 카드가 하단 궁수 카드 자리로 날아가 안착
  state.currentTimeline = sortedEntries;
  state.priorityRevealMode = "sorted";
  renderPriorityStrip();
  renderDrawnCards();
  renderBoard();
  flyRevealToHud();
  await sleep(540);
  state.suppressPlayerCard = false;
  renderPlayerHud();
  hideDrawnCardReveal();

  document.body.classList.remove("revealing-priority");
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

function entryKey(entry) {
  return `${entry.actorType}-${entry.actorId}-${entry.card.instanceId ?? entry.card.id}`;
}

function friendlyAction(action) {
  switch (action.type) {
    case "move":
      return `${action.amount}칸 이동`;
    case "flee":
      return `${action.amount}칸 후퇴`;
    case "fleeToRune":
      return `룬 쪽으로 ${action.amount}칸 후퇴`;
    case "attack": {
      const kind = action.melee || action.range <= 1 ? "근접" : "원거리";
      const rng = action.range > 1 ? ` · 사거리 ${action.range}` : "";
      const tgt = action.targets ? ` · 최대 ${action.targets}명` : "";
      return `${kind} 공격 x${action.mult}${rng}${tgt}`;
    }
    case "momentumAttack":
      return `${action.amount}칸 이동 후 근접 공격 x${action.mult}`;
    case "patternAttack": {
      const pat = action.pattern === "adjacent-triple" ? "앞 3칸" : "앞 2칸";
      return `${pat} ${action.melee ? "근접" : "원거리"} 공격 x${action.mult}`;
    }
    case "charge":
      return `차지 +${action.amount}`;
    case "placeTrap":
    case "placeObstacle":
      return `${trapLabel(action)} ${action.count ?? 1}개 설치 · 사거리 ${action.range}`;
    case "placeRune":
      return `룬 ${action.count ?? 1}개 설치 · 사거리 ${action.range}`;
    case "runeAttack":
      return `룬 주변 공격 x${action.mult}`;
    case "detonateRune":
      return `룬 폭파 x${action.mult}`;
    case "placeMeteor":
      return `운석 예고 ${action.delay ?? 1}턴 · 범위 ${action.radius ?? 1} · x${action.mult}`;
    case "healPercent":
      return `체력 ${Math.round(action.percent * 100)}% 회복`;
    case "selfDamagePercent":
      return `체력 ${Math.round(action.percent * 100)}% 소모`;
    case "permanent":
      return permanentEffectLabel(action);
    default:
      return action.type;
  }
}

function showDrawnCardReveal(card, ownerLabel = "내 카드", side = "player") {
  const host = document.querySelector("#drawnCardReveal");
  if (!host || !card) return;
  host.removeAttribute("style");
  host.className = `drawn-reveal ${side}`;
  host.innerHTML = `
    <div class="drawn-reveal-tag">${ownerLabel}</div>
    ${cardMount(card, "reveal-mount")}
  `;
  void host.offsetWidth;
  host.classList.add("show");
}

function hideDrawnCardReveal() {
  const host = document.querySelector("#drawnCardReveal");
  if (host) host.classList.remove("show");
}

function flyRevealToHud() {
  const host = document.querySelector("#drawnCardReveal");
  if (!host) return;
  const target =
    document.querySelector("#playerHud .player-block:not(.waiting-card) .card-mount") ||
    document.querySelector("#playerHud .card-mount") ||
    document.querySelector("#priorityStrip .priority-item.player") ||
    document.querySelector("#priorityStrip");
  if (!target) {
    hideDrawnCardReveal();
    return;
  }
  const hr = host.getBoundingClientRect();
  const tr = target.getBoundingClientRect();
  const dx = tr.left + tr.width / 2 - (hr.left + hr.width / 2);
  const dy = tr.top + tr.height / 2 - (hr.top + hr.height / 2);
  host.style.transition = "transform 520ms cubic-bezier(0.55, 0, 0.4, 1), opacity 520ms ease";
  host.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.34)`;
  host.style.opacity = "0";
}

function entryOwnerLabel(entry) {
  if (entry.actorType === "player") return getSelectedCharacter().name;
  return monsterDefinitions[entry.actorId]?.name ?? entry.actorId;
}

function describeCard(cardData) {
  return cardData.actions.map(describeAction).join("\n");
}

function renderActionList(cardData) {
  return `<span class="action-list">${cardData.actions
    .map(renderActionLine)
    .join("")}</span>`;
}

function renderCompactActionList(cardData) {
  return cardData.actions
    .slice(0, 4)
    .map((action) => compactActionStat(action))
    .join("");
}

function compactActionStat(action) {
  if (action.type === "move") return actionStat("move", "이동", action.amount);
  if (action.type === "flee") return actionStat("move-flee", "후퇴", action.amount);
  if (action.type === "fleeToRune") return actionStat("move-flee", "룬 쪽 후퇴", action.amount);
  if (action.type === "attack") {
    const attackKind = action.melee || action.range <= 1 ? "melee" : "ranged";
    return actionStat(attackKind, attackKind === "melee" ? "근거리 공격" : "원거리 공격", action.mult);
  }
  if (action.type === "patternAttack") return patternIcon(action.pattern);
  if (action.type === "momentumAttack") return actionStat("move", "남은 이동 공격", action.amount);
  if (action.type === "charge") return actionStat("charge", "차지", action.amount);
  if (action.type === "placeTrap" || action.type === "placeObstacle") return actionStat(trapIconKind(action), trapLabel(action), action.count ?? 1);
  if (action.type === "placeRune") return actionStat("rune", "룬", action.count ?? 1);
  if (action.type === "runeAttack") return actionStat("rune", "룬 주변 공격", action.mult);
  if (action.type === "detonateRune") return actionStat("rune-burst", "룬 폭파", action.mult);
  if (action.type === "placeMeteor") return actionStat("meteor", "운석 예고", action.delay ?? 1);
  if (action.type === "selfDamagePercent") return actionNote(`-${Math.round(action.percent * 100)}%`);
  if (action.type === "healPercent") return actionNote(`+${Math.round(action.percent * 100)}%`);
  if (action.type === "permanent") return actionNote("영구");
  return actionNote(action.type);
}

function renderActionLine(action) {
  if (action.type === "move") {
    return `<span class="action-line">${actionGroup("move", [actionStat("move", "이동", action.amount)])}</span>`;
  }
  if (action.type === "flee") {
    return `<span class="action-line">${actionGroup("move", [actionStat("move-flee", "후퇴", action.amount)])}</span>`;
  }
  if (action.type === "fleeToRune") {
    return `<span class="action-line">${actionGroup("move", [
      actionStat("move-flee", "룬 쪽 후퇴", action.amount),
      actionStat("rune", "룬", 1),
    ])}</span>`;
  }
  if (action.type === "attack") {
    const attackKind = action.melee || action.range <= 1 ? "melee" : "ranged";
    const parts = [
      actionStat(attackKind, attackKind === "melee" ? "근거리 공격" : "원거리 공격", action.mult),
    ];
    if (attackKind !== "melee") parts.push(actionStat("range", "사거리", action.range));
    if (action.targets) parts.push(actionStat("target", "타겟 수", action.targets));
    if (action.push) parts.push(actionNote(`밀기 ${action.push}`));
    if (action.pull) parts.push(actionNote(`당기기 ${action.pull}`));
    return `<span class="action-line">${actionGroup("attack", parts)}</span>`;
  }
  if (action.type === "momentumAttack") {
    return `<span class="action-line">${actionGroup("attack", [
      actionStat("move", "이동", action.amount),
      actionStat("melee", "근거리 공격", action.mult),
      actionNote(`남은 이동 공격 x${action.perUnusedMoveBonus ?? 1}`),
    ])}</span>`;
  }
  if (action.type === "patternAttack") {
    const attackKind = action.melee ? "melee" : "ranged";
    return `<span class="action-line">${actionGroup("attack", [
      patternIcon(action.pattern),
      actionStat(attackKind, attackKind === "melee" ? "근거리 공격" : "원거리 공격", action.mult),
      ...(attackKind === "melee" ? [] : [actionStat("range", "사거리", action.range)]),
    ])}</span>`;
  }
  if (action.type === "charge") {
    return `<span class="action-line">${actionGroup("special", [actionStat("charge", "차지", action.amount)])}</span>`;
  }
  if (action.type === "permanent") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat("permanent", "영구", 1),
      actionNote(permanentEffectLabel(action), permanentEffectLabel(action)),
    ])}</span>`;
  }
  if (action.type === "placeTrap" || action.type === "placeObstacle") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat(trapIconKind(action), trapLabel(action), action.count ?? 1),
      actionStat("range", "사거리", action.range),
    ])}</span>`;
  }
  if (action.type === "placeRune") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat("rune", "룬", action.count ?? 1),
      actionStat("range", "사거리", action.range),
    ])}</span>`;
  }
  if (action.type === "runeAttack") {
    return `<span class="action-line">${actionGroup("attack", [
      actionStat("rune", "룬 주변", action.radius ?? 1),
      actionStat("ranged", "원거리 공격", action.mult),
    ])}</span>`;
  }
  if (action.type === "detonateRune") {
    return `<span class="action-line">${actionGroup("attack", [
      actionStat("rune-burst", "룬 폭파", action.radius ?? 1),
      actionStat("ranged", "원거리 공격", action.mult),
    ])}</span>`;
  }
  if (action.type === "placeMeteor") {
    return `<span class="action-line">${actionGroup("attack", [
      actionStat("meteor", "운석 예고", action.delay ?? 1),
      actionStat("range", "사거리", action.range),
      actionStat("area", "범위", action.radius ?? 1),
      actionStat("ranged", "원거리 공격", action.mult),
    ])}</span>`;
  }
  if (action.type === "selfDamagePercent") {
    return `<span class="action-line">${actionGroup("special", [actionStat("self-damage", "체력 감소", `${Math.round(action.percent * 100)}%`)])}</span>`;
  }
  if (action.type === "healPercent") {
    return `<span class="action-line">${actionGroup("special", [actionStat("heal", "회복", `${Math.round(action.percent * 100)}%`)])}</span>`;
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
    melee: `<svg viewBox="0 0 32 32" aria-hidden="true"><path class="fill" d="M22.8 3.2h6L14 19l-4-4L22.8 3.2Z"/><path d="m11.2 18.5-5.8 5.8"/><path d="m6.5 17.1 8.4 8.4"/><path d="m4.5 27.5 3.4-3.4"/></svg>`,
    ranged: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 4.5c8 3.2 8 19.8 0 23"/><path d="M11.2 7c4.9 4.2 4.9 13.8 0 18"/><path d="M4.5 16h22"/><path d="m21.6 10.8 5 5.2-5 5.2"/></svg>`,
    move: `<svg viewBox="0 0 32 32" aria-hidden="true"><path class="fill" d="M9.2 4.8h7.1l1.3 7.1 7.1 4.1c1.6.9 2.6 2.6 2.6 4.5v2.4H6.5v-5.2l3.6-5.3-.9-7.6Z"/><path d="M7.2 22.9h19.9"/><path d="M11.2 10h6"/></svg>`,
    "move-flee": `<svg viewBox="0 0 32 32" aria-hidden="true"><path class="fill" d="M9.2 4.8h7.1l1.3 7.1 7.1 4.1c1.6.9 2.6 2.6 2.6 4.5v2.4H6.5v-5.2l3.6-5.3-.9-7.6Z"/><path d="M7.2 22.9h19.9"/><path d="M11.2 10h6"/><path d="M24.5 7.5h-7"/><path d="m20 4 4.5 3.5L20 11"/></svg>`,
    range: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 23.5C9.1 14 16.5 8.9 26 8.5"/><path d="m22.4 4.8 3.9 3.7-4.1 3.8"/><circle cx="6" cy="23.5" r="2.2"/><circle cx="26" cy="8.5" r="4.2"/></svg>`,
    charge: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 6v20"/><path d="M6 16h20"/></svg>`,
    target: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="4.4"/></svg>`,
    "trap-attack": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 20c2-8.5 18-8.5 20 0"/><path d="M8.5 20h15"/><path d="m8.8 13.2 2.2 4.2"/><path d="m14 11.8.8 4.8"/><path d="m18 11.8-.8 4.8"/><path d="m23.2 13.2-2.2 4.2"/><circle cx="16" cy="21" r="3.3"/></svg>`,
    "trap-block": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 20c2-8.5 18-8.5 20 0"/><path d="M8.5 20h15"/><path d="M11 12v7"/><path d="M16 11v8"/><path d="M21 12v7"/><path d="M9 24h14"/></svg>`,
    rune: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 4 9 12-9 12L7 16 16 4Z"/><path d="M16 9v14"/><path d="M11 16h10"/></svg>`,
    "rune-burst": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 4 2.3 8.3L26 8l-4.3 7.7L30 18l-8.3 2.3L26 28l-7.7-4.3L16 32l-2.3-8.3L6 28l4.3-7.7L2 18l8.3-2.3L6 8l7.7 4.3L16 4Z"/></svg>`,
    meteor: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 5c5 2.3 8.8 5.5 11.3 9.8"/><path d="M4 12c4.4 1.5 7.8 4.2 10.2 8.1"/><circle cx="21.5" cy="22" r="5.8"/></svg>`,
    area: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="4"/><circle cx="16" cy="16" r="10"/><path d="M16 2v4"/><path d="M16 26v4"/><path d="M2 16h4"/><path d="M26 16h4"/></svg>`,
    "self-damage": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27S6 21 6 12.7c0-4 2.6-6.7 6.1-6.7 2 0 3.3 1 3.9 2.1.6-1.1 1.9-2.1 3.9-2.1 3.5 0 6.1 2.7 6.1 6.7C26 21 16 27 16 27Z"/><path d="M10 16h12"/></svg>`,
    heal: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27S6 21 6 12.7c0-4 2.6-6.7 6.1-6.7 2 0 3.3 1 3.9 2.1.6-1.1 1.9-2.1 3.9-2.1 3.5 0 6.1 2.7 6.1 6.7C26 21 16 27 16 27Z"/><path d="M16 11v10"/><path d="M11 16h10"/></svg>`,
    permanent: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 20 12l8 1.2-5.9 5.7 1.4 8.1L16 23l-7.5 4 1.4-8.1L4 13.2 12 12 16 4Z"/></svg>`,
  };
  return icons[kind] ?? "?";
}

function actionNote(text, title = text) {
  return `<span class="action-note" title="${title}">${text}</span>`;
}

function trapIconKind(action) {
  return (action.trap ?? action.obstacle) === "block" ? "trap-block" : "trap-attack";
}

function trapLabel(action) {
  return (action.trap ?? action.obstacle) === "block" ? "봉쇄 함정" : "공격 함정";
}

function permanentEffectLabel(action) {
  const labels = {
    comboDamage: `연타 피해 +${Math.round(action.amount * 100)}%`,
    chargeRetreat: `차지 시 후퇴 ${action.amount}`,
    chargeRangePerStack: `차지당 사거리 +${action.amount}`,
    overkillSplashRange: `처치 잔여 피해 ${action.amount}칸 전이`,
    chargeStackMultiplier: `차지 스택 x${action.amount}`,
    berserkLostHpDamage: `잃은 체력 비율 / 2 피해 증가`,
    lowHpDamage: `체력 ${Math.round((action.threshold ?? 0.25) * 100)}% 미만 피해 +${Math.round(action.amount * 100)}%`,
  };
  return labels[action.effect] ?? "영구 효과";
}

function patternIcon(pattern) {
  if (pattern === "adjacent-pair") {
    return `<span class="pattern-icon adjacent-pair" title="붙은 두 칸"><i></i><i></i></span>`;
  }
  if (pattern === "adjacent-triple") {
    return `<span class="pattern-icon adjacent-triple" title="붙은 세 칸"><i></i><i></i><i></i></span>`;
  }
  return "";
}

function describeAction(action) {
  if (action.type === "move") return `MOV ${action.amount}`;
  if (action.type === "flee") return `후퇴 ${action.amount}`;
  if (action.type === "attack") {
    const targetText = action.targets ? `, TGT ${action.targets}` : "";
    const pushText = action.push ? `, 밀기 ${action.push}` : "";
    const pullText = action.pull ? `, 당기기 ${action.pull}` : "";
    return `ATK ${action.mult}, RNG ${action.range}${targetText}${pushText}${pullText}`;
  }
  if (action.type === "momentumAttack") return `이동 ${action.amount}, ATK ${action.mult}, 남은 이동 공격 x${action.perUnusedMoveBonus ?? 1}`;
  if (action.type === "patternAttack") {
    const patternText = action.pattern === "adjacent-triple" ? "붙은 세 칸" : "붙은 두 칸";
    return `${patternText} ATK ${action.mult}, RNG ${action.range}`;
  }
  if (action.type === "charge") return `차지 ${action.amount}`;
  if (action.type === "permanent") return permanentEffectLabel(action);
  if (action.type === "placeTrap" || action.type === "placeObstacle") return `함정 설치 RNG ${action.range}`;
  if (action.type === "placeRune") return `룬 설치 RNG ${action.range}`;
  if (action.type === "fleeToRune") return `룬 쪽 후퇴 ${action.amount}`;
  if (action.type === "runeAttack") return `룬 주변 ATK ${action.mult}`;
  if (action.type === "detonateRune") return `룬 폭파 ATK ${action.mult}`;
  if (action.type === "placeMeteor") return `운석 예고 ${action.delay ?? 1}턴, 범위 ${action.radius ?? 1}, ATK ${action.mult}`;
  if (action.type === "selfDamagePercent") return `체력 -${Math.round(action.percent * 100)}%`;
  if (action.type === "healPercent") return `회복 ${Math.round(action.percent * 100)}%`;
  return action.type;
}

function entryLabel(entry) {
  return entry.actorType === "player" ? getSelectedCharacter().name : (monsterDefinitions[entry.actorId]?.name ?? "적");
}

function monsterLabel(kind) {
  return monsterDefinitions[kind]?.label ?? "적";
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
    scale = Math.max(fitScale, Math.min(CAMERA_FOCUS_MAX_SCALE, fitScale * CAMERA_FOCUS_SCALE_MULTIPLIER));
    const focusPoint = hexToPixel(player, bounds);
    const topHudRect = document.querySelector(".battle-top-hud")?.getBoundingClientRect();
    const playerHudRect = elements.playerHud?.getBoundingClientRect();
    const playTop = topHudRect?.height ? Math.min(panelHeight * 0.46, topHudRect.bottom + 14) : panelHeight * 0.24;
    const playBottom = playerHudRect?.height ? Math.max(playTop + 140, playerHudRect.top - 16) : panelHeight * 0.84;
    const focusY = playTop + (playBottom - playTop) * 0.55;
    offsetX = panelWidth / 2 - focusPoint.x * scale;
    offsetY = focusY - focusPoint.y * scale;
  }

  elements.board.style.setProperty("--board-width", `${logicalWidth}px`);
  elements.board.style.setProperty("--board-height", `${logicalHeight}px`);
  elements.board.style.setProperty("--board-scale", `${scale}`);
  elements.board.style.setProperty("--board-x", `${offsetX}px`);
  elements.board.style.setProperty("--board-y", `${offsetY}px`);
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

function aliveEnemyKinds() {
  return [...new Set(aliveEnemies().map((enemy) => enemy.kind ?? "brute"))];
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

function trapAt(hex) {
  return state.obstacles.find((obstacle) => sameHex(obstacle, hex));
}

function movementTrapAt(hex) {
  return state.obstacles.find((obstacle) => isMovementTrap(obstacle) && sameHex(obstacle, hex));
}

function isMovementTrap(obstacle) {
  return obstacle && (obstacle.kind === "attack" || obstacle.kind === "spike" || obstacle.kind === "block");
}

function triggerTrap(actor) {
  if (!isAlive(actor)) return null;
  const trap = trapAt(actor);
  if (!trap) return null;
  if (trap.kind === "rune" && trap.ownerSide === actor.side) return null;

  state.obstacles = state.obstacles.filter((item) => item !== trap);
  if (trap.kind === "attack" || trap.kind === "spike" || trap.kind === "rune") {
    const damage = Math.max(1, Math.round((trap.baseAtk ?? 10) * (trap.power ?? 2)));
    const hitPosition = { q: actor.q, r: actor.r };
    applyDamage(actor, damage);
    renderBoard();
    renderHud();
    showHitEffect(actor, hitPosition, damage);
    log(`${actor.name} ${trap.kind === "rune" ? "룬" : "공격 함정"} ${damage} 피해`);
    return trap.kind === "rune" ? "rune" : "attack";
  }

  if (trap.kind === "block") {
    actor.temporary = actor.temporary ?? {};
    actor.temporary.cannotMove = {
      source: "trap",
      expiresAfterOwnTurnEnds: state.turn + 1,
      onExpire: (target) => log(`${target.name} 이동 불가 해제`),
    };
    log(`${actor.name} 봉쇄 함정: 이동 불가`);
    return "block";
  }
  return trap.kind;
}

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

function turnDelay(multiplier = 1) {
  return (TURN_DELAY * multiplier) / speedMultiplier;
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function log(message) {
  state.log.push(message);
}

elements.newRunButton.addEventListener("click", newRun);
elements.characterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCharacterId = button.dataset.character;
    newRun();
  });
});
elements.pauseButton.addEventListener("click", () => {
  state.paused = !state.paused;
  render();
  scheduleTurn();
});
elements.speedButton.addEventListener("click", () => {
  speedMultiplier = speedMultiplier === 1 ? 2 : 1;
  if (state) state.speedMultiplier = speedMultiplier;
  renderHud();
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
