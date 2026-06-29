const SQRT3 = Math.sqrt(3);
const HEX_SIZE = 39;
const BOARD_PADDING = 90;
const TURN_DELAY = 540;
const WAVE_INTRO_DELAY = 1300;
const CAMERA_FOCUS_DELAY = 360;
const MAP_ROOM_SCALE = 2;
const CAMERA_FOCUS_TARGET_SCALE = 0.9;
const CAMERA_FOCUS_MAX_SCALE = 1.02;
const CAMERA_DEAD_ZONE_WIDTH_RATIO = 0.34;
const CAMERA_DEAD_ZONE_HEIGHT_RATIO = 0.28;
const CAMERA_UI_GAP = 16;
const CAMERA_PLAYER_EDGE_MARGIN = 72;
const CAMERA_FOLLOW_DURATION = 220;
const CAMERA_DRAG_THRESHOLD = 5;
const CAMERA_MANUAL_PAN_SLACK = 140;
const SELECTED_CHARACTER_STORAGE_KEY = "gamejam-prep-selected-character-v1";
const META_PROGRESS_STORAGE_KEY = "gamejam-prep-meta-growth-v1";
const AUTO_UPGRADE_RULES_STORAGE_KEY = "gamejam-prep-auto-upgrade-rules-v1";
const META_LEVEL_MIN = 1;
const META_LEVEL_MAX = 8;
const AUTO_ROUTINE_MODE = true;
const ENABLE_PARTY_SYNERGY_UPGRADES = false;
const AUTO_REWARD_CHOICES = 3;
const AUTO_TRAINING_FALLBACK_BONUS = 0.1;
const AUTO_ENEMY_BALANCE_TIERS = [
  { maxWave: 2, hpMultiplier: 3.2, minHp: 18, attackMultiplier: 1, attackBonus: 0 },
  { maxWave: 5, hpMultiplier: 2.4, minHp: 24, eliteHpMultiplier: 1.15, bossHpMultiplier: 1.35, attackMultiplier: 1.1, attackBonus: 0 },
  { maxWave: 8, hpMultiplier: 1.05, minHp: 28, eliteHpMultiplier: 1, bossHpMultiplier: 1, attackMultiplier: 1, attackBonus: 0 },
  { maxWave: 12, hpMultiplier: 1, minHp: 30, eliteHpMultiplier: 1, bossHpMultiplier: 1, attackMultiplier: 1, attackBonus: 0 },
  { maxWave: Infinity, hpMultiplier: 1, minHp: 34, eliteHpMultiplier: 1, bossHpMultiplier: 1, attackMultiplier: 1, attackBonus: 0 },
];
const STAT_PERCENT_PASSIVE_CAP_BY_RARITY = {
  "기본": 0.1,
  "노말": 0.1,
  "레어": 0.15,
  "에픽": 0.2,
  "전설": 0.3,
};
const NORMAL_REWARD_RARITY_WEIGHT_TIERS = [
  {
    maxWave: 5,
    weights: [
      { rarity: "노말", weight: 80 },
      { rarity: "레어", weight: 19.9 },
      { rarity: "에픽", weight: 0.1 },
    ],
  },
  {
    maxWave: 10,
    weights: [
      { rarity: "노말", weight: 60 },
      { rarity: "레어", weight: 30 },
      { rarity: "에픽", weight: 9.9 },
      { rarity: "전설", weight: 0.1 },
    ],
  },
  {
    maxWave: 15,
    weights: [
      { rarity: "노말", weight: 40 },
      { rarity: "레어", weight: 40 },
      { rarity: "에픽", weight: 19.5 },
      { rarity: "전설", weight: 0.5 },
    ],
  },
];
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
  enemyActionHud: document.querySelector("#enemyActionHud"),
  priorityStrip: document.querySelector("#priorityStrip"),
  playerHud: document.querySelector("#playerHud"),
  turnPlanner: document.querySelector("#turnPlanner"),
  drawnCards: document.querySelector("#drawnCards"),
  timeline: document.querySelector("#timeline"),
  battleLog: document.querySelector("#battleLog"),
  rewardOverlay: document.querySelector("#rewardOverlay"),
  rewardInstr: document.querySelector("#rewardInstr"),
  rewardCards: document.querySelector("#rewardCards"),
  iconHelpOverlay: document.querySelector("#iconHelpOverlay"),
  closeHelpButton: document.querySelector("#closeHelpButton"),
  cardPreviewOverlay: document.querySelector("#cardPreviewOverlay"),
  cardPreviewMount: document.querySelector("#cardPreviewMount"),
  closeCardPreviewButton: document.querySelector("#closeCardPreviewButton"),
  metaGrowthButton: document.querySelector("#metaGrowthButton"),
  metaGrowthOverlay: document.querySelector("#metaGrowthOverlay"),
  metaGrowthContent: document.querySelector("#metaGrowthContent"),
  closeMetaGrowthButton: document.querySelector("#closeMetaGrowthButton"),
  newRunButton: document.querySelector("#newRunButton"),
  pauseButton: document.querySelector("#pauseButton"),
  speedButton: document.querySelector("#speedButton"),
};

let selectedCharacterId = "archer";
let speedMultiplier = 1;
let plannerDrag = null;
let metaProgress = loadMetaProgress();
let autoUpgradeRules = loadAutoUpgradeRules();

const baseArcherCards = [
  card("advance-shot", "전진 사격", "기본", "기본", 54, [
    { type: "move", amount: 2 },
    { type: "attack", mult: 1, range: 2 },
  ], 3),
  card("retreat-shot", "후퇴 사격", "기본", "기본", 32, [
    { type: "attack", mult: 1, range: 2 },
    { type: "flee", amount: 2 },
  ], 2),
  card("aimed-shot", "정조준", "기본", "기본", 58, [{ type: "attack", mult: 2, range: 2 }], 1),
  card("keep-distance", "거리 벌리기", "기본", "기본", 20, [{ type: "flee", amount: 3 }], 1),
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
  card("retreat-step", "후퇴 발걸음", "공용", "노말", 22, [{ type: "flee", amount: 3 }]),
  card("split-shot", "분산 사격", "공용", "노말", 35, [
    { type: "attack", mult: 1, range: 2, targets: 2 },
  ]),
  card("reward-advance-shot", "전진 사격", "공용", "노말", 54, [
    { type: "move", amount: 2 },
    { type: "attack", mult: 1, range: 2 },
  ]),
  card("quick-retreat", "빠른 후퇴", "공용", "노말", 18, [{ type: "flee", amount: 3 }]),
  card("steady-shot", "안정 사격", "공용", "노말", 58, [{ type: "attack", mult: 3, range: 2 }]),
  card("position-tune", "위치 조정", "공용", "노말", 34, [
    { type: "move", amount: 1 },
    { type: "attack", mult: 2, range: 2 },
    { type: "flee", amount: 1 },
  ]),
  card("cover-shot", "견제 사격", "공용", "노말", 33, [
    { type: "attack", mult: 1, range: 3 },
    { type: "flee", amount: 1 },
  ]),
  card("range-secure", "사거리 확보", "공용", "레어", 44, [
    { type: "move", amount: 3 },
    { type: "attack", mult: 2, range: 3 },
  ]),
  card("triple-cover", "세 갈래 견제", "공용", "레어", 46, [
    { type: "move", amount: 3 },
    { type: "attack", mult: 1, range: 2, targets: 3 },
  ]),
  card("focused-shot", "집중 사격", "공용", "레어", 42, [{ type: "attack", mult: 3, range: 2 }]),
  card("evasive-shot", "회피 사격", "공용", "레어", 31, [
    { type: "attack", mult: 2, range: 2 },
    { type: "flee", amount: 2 },
  ]),
  card("piercing-prep", "관통 준비", "공용", "레어", 30, [
    {
      type: "applyEffect",
      label: "관통 준비",
      duration: "turn",
      modifiers: [
        { stat: "range", amount: 1, when: { attackKind: "ranged" } },
        { stat: "ignoreAdjacentPenalty", amount: 1, when: { attackKind: "ranged" } },
      ],
    },
  ]),
  card("double-power-shot", "이중 사격", "공용", "에픽", 36, [
    { type: "attack", mult: 2, range: 3 },
    { type: "attack", mult: 2, range: 3, preferPreviousTarget: true },
  ]),
  card("high-ground", "고지 선점", "공용", "에픽", 40, [
    { type: "move", amount: 3, jump: true },
    { type: "attack", mult: 3, range: 3 },
  ]),
  card("reposition-shot", "재정렬 사격", "공용", "에픽", 30, [
    { type: "move", amount: 2 },
    { type: "attack", mult: 1, range: 3, targets: 2 },
    { type: "flee", amount: 2 },
  ]),
  card("emergency-evasion", "긴급 회피", "공용", "에픽", 24, [
    {
      type: "applyEffect",
      label: "긴급 회피",
      duration: "turn",
      modifiers: [{ stat: "damageTaken", amount: -0.3 }],
      afterHitFlee: 1,
    },
  ]),
  card("perfect-distance", "완벽한 거리", "공용", "에픽", 33, [
    {
      type: "passive",
      modifiers: [{ stat: "damageDealt", amount: 0.35, when: { attackKind: "ranged", nonAdjacent: true } }],
    },
  ]),
  card("storm-shot", "폭풍 사격", "공용", "전설", 28, [{ type: "attack", mult: 2, range: 3, targets: 4 }]),
  card("hunt-rhythm", "사냥의 리듬", "공용", "전설", 32, [
    { type: "passive", effect: "afterAttackMove", amount: 3 },
  ]),
  card("absolute-distance", "절대 거리", "공용", "전설", 26, [
    {
      type: "passive",
      effect: "ignoreAdjacentPenalty",
      amount: 1,
      modifiers: [{ stat: "range", amount: 3, when: { attackKind: "ranged" } }],
    },
  ]),
  card("double-shot", "연속 사격", "다단중첩", "노말", 35, [
    { type: "attack", mult: 1, range: 2 },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
  ]),
  card("rapid-chain-shot", "재빠른 연사", "다단중첩", "노말", 32, [
    { type: "attack", mult: 1, range: 2 },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
    { type: "flee", amount: 1 },
  ]),
  card("two-point-aim", "두 점 조준", "다단중첩", "노말", 42, [
    { type: "move", amount: 1 },
    { type: "attack", mult: 1, range: 3 },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true },
  ]),
  card("scratch-weakness", "약점 긁기", "다단중첩", "노말", 36, [
    { type: "attack", mult: 1, range: 2 },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true, sameTargetBonus: 0.1 },
  ]),
  card("low-shot", "낮은 사격", "다단중첩", "노말", 34, [
    { type: "attack", mult: 1, range: 2 },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
  ]),
  card("splitting-barrage", "갈라지는 연사", "다단중첩", "노말", 39, [
    { type: "attack", mult: 1, range: 2, targets: 2 },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
  ]),
  card("short-combo-bow", "짧은 연속궁", "다단중첩", "노말", 31, [
    { type: "attack", mult: 1, range: 1 },
    { type: "attack", mult: 1, range: 1, preferPreviousTarget: true },
  ]),
  card("tracking-arrow", "추적 화살", "다단중첩", "노말", 37, [
    { type: "attack", mult: 1, range: 3 },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true, sameTargetBonus: 0.1 },
  ]),
  card("triple-shot", "삼연사", "다단중첩", "레어", 35, [
    { type: "attack", mult: 1, range: 2 },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
  ]),
  card("combo-sense", "연타 감각", "다단중첩", "레어", 32, [
    { type: "passive", effect: "comboDamage", amount: 0.3 },
  ]),
  card("fixed-aim", "고정 조준", "다단중첩", "레어", 31, [
    {
      type: "applyEffect",
      label: "고정 조준",
      duration: "turn",
      modifiers: [{ stat: "damageDealt", amount: 0.2, when: { repeatHit: true } }],
    },
  ]),
  card("weakness-stack", "약점 누적", "다단중첩", "레어", 34, [
    { type: "passive", effect: "thirdHitDamage", amount: 0.8 },
  ]),
  card("prey-mark", "사냥감 표시", "다단중첩", "레어", 33, [
    { type: "attack", mult: 1, range: 3 },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true, sameTargetBonus: 0.15 },
  ]),
  card("chasing-barrage", "추격 연사", "다단중첩", "에픽", 43, [
    { type: "attack", mult: 1, range: 2 },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
    { type: "move", amount: 3 },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
  ]),
  card("quad-strike", "네 갈래 연타", "다단중첩", "에픽", 33, [
    { type: "attack", mult: 1, range: 2 },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
    { type: "attack", mult: 1, range: 2, preferPreviousTarget: true },
  ]),
  card("mark-burst", "표식 폭발", "다단중첩", "에픽", 37, [
    { type: "attack", mult: 1, range: 3 },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true },
    { type: "attack", mult: 2, range: 3, preferPreviousTarget: true, sameTargetBonus: 0.5 },
  ]),
  card("persistent-hunt", "집요한 사냥", "다단중첩", "에픽", 32, [
    { type: "passive", effect: "afterAttackMove", amount: 1 },
  ]),
  card("weakness-pierce", "약점 관통", "다단중첩", "에픽", 34, [
    { type: "attack", mult: 1, range: 3 },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true, thirdHitBonus: 0.2 },
  ]),
  card("endless-barrage", "끝없는 연사", "다단중첩", "전설", 29, [
    { type: "passive", effect: "comboDamage", amount: 0.6 },
  ]),
  card("hunt-finale", "사냥의 결말", "다단중첩", "전설", 31, [
    { type: "attack", mult: 1, range: 3 },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true },
  ]),
  card("weakness-dismantle", "약점 해체", "다단중첩", "전설", 30, [
    { type: "attack", mult: 1, range: 3 },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true },
    { type: "attack", mult: 1, range: 3, preferPreviousTarget: true },
    { type: "attack", mult: 3, range: 3, preferPreviousTarget: true, sameTargetBonus: 0.5 },
  ]),
  card("attack-trap", "공격 함정 설치", "함정", "노말", 24, [
    { type: "placeTrap", range: 2, trap: "attack", count: 2 },
    { type: "pushTowardTrap", amount: 1, range: 3 },
    { type: "attack", mult: 1, range: 2 },
  ]),
  card("block-trap", "봉쇄 함정 설치", "함정", "노말", 25, [
    { type: "placeTrap", range: 2, trap: "block", count: 2 },
    {
      type: "applyEffect",
      label: "봉쇄 압박",
      duration: "nextAttack",
      modifiers: [{ stat: "push", amount: 1 }],
    },
    { type: "attack", mult: 1, range: 2 },
  ]),
  card("push-shot", "밀기 사격", "함정", "레어", 39, [
    { type: "attack", mult: 1, range: 2, push: 2 },
  ]),
  card("push-away-shot", "밀어내기 사격", "함정", "노말", 39, [
    { type: "attack", mult: 1, range: 2, push: 1 },
  ]),
  card("short-push", "짧은 밀치기", "함정", "노말", 37, [
    { type: "attack", mult: 1, range: 1, melee: true, push: 1 },
  ]),
  card("behind-trap", "함정 뒤로", "함정", "노말", 23, [
    { type: "flee", amount: 2 },
    { type: "placeTrap", range: 2, trap: "attack", count: 1 },
    { type: "attack", mult: 1, range: 2 },
  ]),
  card("interference-trap", "방해 함정", "함정", "노말", 23, [
    { type: "placeTrap", range: 1, trap: "block", count: 2 },
    { type: "attack", mult: 1, range: 2 },
  ]),
  card("guided-shot", "유도 사격", "함정", "노말", 38, [
    { type: "attack", mult: 1, range: 2, push: 1, trapHitBonus: 0.5 },
  ]),
  card("spike-path", "가시 길목", "함정", "노말", 22, [
    { type: "placeTrap", range: 2, trap: "attack", count: 3 },
    { type: "attack", mult: 1, range: 2 },
  ]),
  card("close-smash", "근접 강타", "함정", "레어", 36, [
    { type: "attack", mult: 1, range: 1, melee: true, push: 2 },
  ]),
  card("trap-shot", "함정 사격", "함정", "레어", 34, [
    { type: "placeTrapBehindTarget", range: 2, trap: "attack", count: 1 },
    { type: "attack", mult: 1, range: 2, push: 1 },
  ]),
  card("trap-link", "함정 연계", "함정", "레어", 27, [
    { type: "passive", effect: "trapNextAttackDamage", amount: 0.5 },
  ]),
  card("route-block", "진로 차단", "함정", "레어", 24, [
    { type: "flee", amount: 2 },
    { type: "placeTrap", range: 2, trap: "block", count: 2 },
    { type: "attack", mult: 1, range: 2 },
  ]),
  card("spike-zone", "가시 지대", "함정", "에픽", 21, [
    { type: "placeTrap", range: 2, trap: "attack", count: 2 },
    { type: "attack", mult: 1, range: 3 },
  ]),
  card("pressure-shot", "압박 사격", "함정", "에픽", 35, [
    { type: "attack", mult: 2, range: 3, push: 2 },
  ]),
  card("chain-trigger", "연쇄 발동", "함정", "에픽", 25, [
    { type: "passive", effect: "trapChainDamage", amount: 5 },
  ]),
  card("trap-burst", "함정 폭파", "함정", "에픽", 33, [
    { type: "detonateTrap", mult: 2, radius: 1 },
  ]),
  card("cross-block", "교차 봉쇄", "함정", "에픽", 24, [
    { type: "placeTrap", range: 2, trap: "block", count: 3 },
    { type: "attack", mult: 1, range: 3 },
  ]),
  card("trap-hunt", "함정 사냥", "함정", "전설", 23, [
    { type: "passive", effect: "trapRangedVulnerability", amount: 1 },
    { type: "passive", effect: "trapTriggerShot", amount: 4, range: 6 },
  ]),
  card("spike-storm", "쐐기 폭풍", "함정", "전설", 20, [
    { type: "placeTrap", range: 3, trap: "attack", count: 5 },
    { type: "attack", mult: 2, range: 3 },
  ]),
  card("force-trigger", "강제 발동", "함정", "전설", 30, [
    { type: "placeTrapBehindTarget", range: 3, trap: "attack", count: 1 },
    { type: "attack", mult: 2, range: 3, push: 3 },
  ]),
  card("charge", "차지", "차지", "노말", 30, [
    { type: "charge", amount: 1 },
    {
      type: "applyEffect",
      label: "조준 보정",
      duration: "nextAttack",
      modifiers: [{ stat: "range", amount: 1, when: { attackKind: "ranged" } }],
    },
  ]),
  card("short-focus", "짧은 집중", "차지", "노말", 21, [
    { type: "flee", amount: 1 },
    {
      type: "applyEffect",
      label: "짧은 집중",
      duration: "turn",
      modifiers: [{ stat: "damageTaken", amount: -0.1 }],
    },
    { type: "charge", amount: 1 },
  ]),
  card("aim-breath", "조준 호흡", "차지", "노말", 29, [
    { type: "charge", amount: 1 },
    {
      type: "applyEffect",
      label: "다음 공격 사거리 1 증가",
      duration: "nextAttack",
      modifiers: [{ stat: "range", amount: 1, when: { attackKind: "ranged" } }],
    },
  ]),
  card("brace", "버티기", "차지", "노말", 27, [
    {
      type: "applyEffect",
      label: "버티기",
      duration: "turn",
      modifiers: [{ stat: "damageTaken", amount: -0.2 }],
    },
    { type: "charge", amount: 1 },
  ]),
  card("load-shot", "장전", "차지", "노말", 29, [
    { type: "charge", amount: 1 },
    {
      type: "applyEffect",
      label: "인접 패널티 무시",
      duration: "nextAttack",
      modifiers: [{ stat: "ignoreAdjacentPenalty", amount: 1, when: { attackKind: "ranged" } }],
    },
  ]),
  card("low-stance", "낮은 자세", "차지", "노말", 27, [
    { type: "charge", amount: 1 },
    {
      type: "applyEffect",
      label: "다음 피격 피해 10% 감소",
      duration: "nextHit",
      modifiers: [{ stat: "damageTaken", amount: -0.1 }],
    },
  ]),
  card("prep-shot", "준비 사격", "차지", "노말", 36, [
    { type: "attack", mult: 1, range: 2 },
    { type: "charge", amount: 1 },
  ]),
  card("quiet-aim", "조용한 조준", "차지", "노말", 26, [
    { type: "charge", amount: 1 },
    {
      type: "applyEffect",
      label: "단일 대상 공격 피해 10% 증가",
      duration: "nextAttack",
      modifiers: [{ stat: "damageDealt", amount: 0.1, when: { singleTarget: true } }],
    },
  ]),
  card("charge-2", "차지 2", "차지", "레어", 28, [
    { type: "charge", amount: 2 },
    {
      type: "applyEffect",
      label: "집중 압축",
      duration: "nextAttack",
      modifiers: [{ stat: "damageDealt", amount: 0.2, when: { singleTarget: true } }],
    },
  ]),
  card("charged-shot", "차지 샷", "차지", "레어", 34, [
    { type: "attack", mult: 2, range: 3 },
  ]),
  card("steady-breath", "안정된 호흡", "차지", "레어", 30, [
    {
      type: "passive",
      modifiers: [{ stat: "damageTaken", amount: -0.2, when: { charged: true } }],
    },
  ]),
  card("compressed-load", "압축 장전", "차지", "레어", 27, [
    { type: "charge", amount: 1 },
    { type: "charge", amount: 1 },
    {
      type: "applyEffect",
      label: "압축 장전",
      duration: "nextAttack",
      modifiers: [
        { stat: "damageDealt", amount: 0.2 },
        { stat: "ignoreAdjacentPenalty", amount: 1, when: { attackKind: "ranged" } },
      ],
    },
  ]),
  card("charge-retreat", "후퇴 집중", "차지", "레어", 30, [
    { type: "passive", effect: "chargeRetreat", amount: 1 },
  ]),
  card("piercing-charged-shot", "관통 차지샷", "차지", "에픽", 32, [
    { type: "attack", mult: 3, range: 4, targets: 2 },
  ]),
  card("full-anchor", "완전 고정", "차지", "에픽", 25, [
    { type: "charge", amount: 1 },
    {
      type: "applyEffect",
      label: "다음 공격 피해 50% 증가",
      duration: "nextAttack",
      modifiers: [{ stat: "damageDealt", amount: 0.5 }],
    },
  ]),
  card("charge-range", "긴 조준", "차지", "에픽", 31, [
    { type: "passive", effect: "chargeRangePerStack", amount: 3 },
  ]),
  card("waited-shot", "기다린 한 발", "차지", "에픽", 34, [
    { type: "charge", amount: 2 },
    { type: "attack", mult: 2, range: 3, killChargeRefund: 1 },
  ]),
  card("breath-hold", "호흡 유지", "차지", "에픽", 29, [
    { type: "passive", effect: "chargeOnNoAttack", amount: 3 },
  ]),
  card("heart-piercer", "심장 꿰뚫기", "차지", "전설", 33, [
    { type: "attack", mult: 8, range: 4, overkillSplashRange: 10 },
  ]),
  card("charge-overkill", "잔여 관통", "차지", "전설", 33, [
    { type: "passive", effect: "overkillSplashRange", amount: 10 },
  ]),
  card("charge-doubler", "과충전", "차지", "전설", 30, [
    { type: "passive", effect: "chargeStackMultiplier", amount: 4 },
  ]),
];

const archerFirstRewardIds = new Set([
  "long-shot",
  "split-shot",
  "reward-advance-shot",
  "steady-shot",
  "position-tune",
  "cover-shot",
  "range-secure",
  "triple-cover",
  "focused-shot",
  "evasive-shot",
  "double-shot",
  "rapid-chain-shot",
  "two-point-aim",
  "scratch-weakness",
  "low-shot",
  "splitting-barrage",
  "short-combo-bow",
  "tracking-arrow",
  "triple-shot",
  "attack-trap",
  "block-trap",
  "push-shot",
  "push-away-shot",
  "short-push",
  "behind-trap",
  "interference-trap",
  "guided-shot",
  "spike-path",
  "prep-shot",
  "charged-shot",
]);

const archerRewardUnlockRules = {
  "retreat-step": { minPicks: 5 },
  "quick-retreat": { minPicks: 5 },
  "piercing-prep": { minPicks: 5, anyOf: [{ tags: ["range"] }, { pickedIds: ["load-shot"] }] },
  "double-power-shot": { minPicks: 2, anyOf: [{ tags: ["multi"] }, { tags: ["range"] }] },
  "high-ground": { minPicks: 2, tags: ["range"] },
  "reposition-shot": { minPicks: 2, tags: ["range"] },
  "emergency-evasion": { minPicks: 5 },
  "perfect-distance": { minPicks: 5, tags: ["range"] },
  "storm-shot": { minPicks: 3, tags: ["range"] },
  "hunt-rhythm": { minPicks: 5 },
  "absolute-distance": {
    minPicks: 5,
    anyOf: [{ tags: ["range"] }, { pickedIds: ["perfect-distance"] }, { pickedIds: ["piercing-prep"] }],
  },
  "combo-sense": { routeCounts: { "다단중첩": 1 } },
  "fixed-aim": { routeCounts: { "다단중첩": 1 } },
  "weakness-stack": { routeCounts: { "다단중첩": 1 } },
  "prey-mark": { routeCounts: { "다단중첩": 1 } },
  "chasing-barrage": { routeCounts: { "다단중첩": 2 } },
  "quad-strike": { routeCounts: { "다단중첩": 2 } },
  "mark-burst": { routeCounts: { "다단중첩": 2 } },
  "persistent-hunt": { routeCounts: { "다단중첩": 2 } },
  "weakness-pierce": { routeCounts: { "다단중첩": 2 } },
  "endless-barrage": { routeCounts: { "다단중첩": 3 } },
  "hunt-finale": { routeCounts: { "다단중첩": 3 } },
  "weakness-dismantle": { routeCounts: { "다단중첩": 3 } },
  "close-smash": { routeCounts: { "함정": 1 } },
  "trap-shot": { tags: ["trap"] },
  "trap-link": { tags: ["trap"] },
  "route-block": { tags: ["trap"] },
  "spike-zone": { tags: ["trap"] },
  "pressure-shot": { minPicks: 2, anyOf: [{ routeCounts: { "함정": 2 } }, { tags: ["push"] }] },
  "chain-trigger": { routeCounts: { "함정": 2 } },
  "trap-burst": { tags: ["trap"] },
  "cross-block": { tags: ["trap"] },
  "trap-hunt": { minPicks: 5, routeCounts: { "함정": 3 } },
  "spike-storm": { routeCounts: { "함정": 2 } },
  "force-trigger": { tags: ["trap", "push"] },
  "charge": { minPicks: 5 },
  "short-focus": { minPicks: 5 },
  "aim-breath": { minPicks: 5 },
  "brace": { minPicks: 5 },
  "load-shot": { minPicks: 5 },
  "low-stance": { minPicks: 5 },
  "quiet-aim": { minPicks: 5 },
  "charge-2": { minPicks: 5 },
  "steady-breath": { minPicks: 5, tags: ["charge"] },
  "compressed-load": { minPicks: 5, tags: ["charge"] },
  "charge-retreat": { minPicks: 5, tags: ["charge"] },
  "piercing-charged-shot": { routeCounts: { "차지": 2 } },
  "full-anchor": { minPicks: 5, tags: ["charge"] },
  "charge-range": { minPicks: 5, routeCounts: { "차지": 2 } },
  "waited-shot": { routeCounts: { "차지": 2 } },
  "breath-hold": { minPicks: 5, routeCounts: { "차지": 2 } },
  "heart-piercer": { routeCounts: { "차지": 3 } },
  "charge-overkill": { minPicks: 5, routeCounts: { "차지": 3 } },
  "charge-doubler": { minPicks: 5, routeCounts: { "차지": 3 } },
};

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

function meleeAttack(mult, extra = {}) {
  return { type: "attack", mult, range: 1, melee: true, ...extra };
}

function rangedAttack(mult, range = 3, extra = {}) {
  return { type: "attack", mult, range, ...extra };
}

function cardMove(amount, extra = {}) {
  return { type: "move", amount, ...extra };
}

function cardFlee(amount, extra = {}) {
  return { type: "flee", amount, ...extra };
}

function cardPattern(mult, pattern = "adjacent-pair", extra = {}) {
  return { type: "patternAttack", mult, range: 1, pattern, melee: true, ...extra };
}

function cardEffect(label, duration = "turn", modifiers = [], extra = {}) {
  return { type: "applyEffect", label, duration, modifiers, ...extra };
}

function cardPassive(effect, label, amount = 1, extra = {}) {
  return { type: "passive", effect, label, amount, ...extra };
}

function passiveCard(id, name, route, rarity, actions) {
  return { id, name, route, rarity, type: "패시브", priority: 0, actions, copies: 1 };
}

function cardMeteor(range, mult, radius = 1, delay = 1, extra = {}) {
  return { type: "placeMeteor", range, mult, radius, delay, ...extra };
}

function cardRune(range, count = 1, power = 1, extra = {}) {
  return { type: "placeRune", range, count, power, ...extra };
}

const warriorRewardPool = [
  card("warrior-quick-slash", "빠른 베기", "공용", "노말", 42, [meleeAttack(1)]),
  card("warrior-reward-advance-slash", "전진 베기", "공용", "노말", 48, [cardMove(2, { desiredRange: 1 }), meleeAttack(1)]),
  card("warrior-short-entry", "짧은 돌입", "공용", "노말", 58, [cardMove(3, { desiredRange: 1 })]),
  card("warrior-strong-slash", "강한 베기", "공용", "노말", 44, [meleeAttack(2)]),
  card("warrior-side-slash", "옆 베기", "공용", "노말", 50, [cardPattern(1)]),
  card("warrior-common-push", "밀어붙이기", "공용", "노말", 46, [meleeAttack(1, { push: 1 })]),
  card("warrior-frontline-hold", "전열 유지", "공용", "노말", 52, [cardMove(1, { desiredRange: 1 }), meleeAttack(1), cardMove(1, { desiredRange: 1, ignoreCannotMove: true })]),
  card("warrior-bracing-stance", "버티는 자세", "공용", "노말", 30, [cardEffect("버티는 자세", "turn", [{ stat: "damageTaken", amount: -0.2 }])]),
  card("warrior-breakthrough-common", "돌파", "공용", "레어", 54, [cardMove(3, { desiredRange: 1 }), meleeAttack(2)]),
  card("warrior-counter-stance", "반격 태세", "공용", "레어", 34, [cardEffect("반격 태세", "turn", [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "melee" } }])]),
  card("warrior-wide-cleave-common", "넓은 휩쓸기", "공용", "레어", 48, [cardPattern(2)]),
  card("warrior-iron-wall", "철벽", "공용", "레어", 28, [cardEffect("철벽", "turn", [{ stat: "damageTaken", amount: -0.4 }])]),
  card("warrior-shatter", "파쇄", "공용", "레어", 40, [meleeAttack(3)]),
  card("warrior-battle-center", "전장의 중심", "공용", "에픽", 32, [cardPassive("adjacentEnemyDamageReduction", "인접한 적 1명당 받는 피해 5% 감소", 0.05, { modifiers: [{ stat: "damageTaken", amount: -0.05 }] })]),
  card("warrior-chain-slash", "연속 베기", "공용", "에픽", 43, [meleeAttack(1), meleeAttack(1), meleeAttack(1)]),
  card("warrior-push-realign", "밀어붙인 뒤 재정렬", "공용", "에픽", 44, [meleeAttack(1, { push: 2 }), cardMove(1, { desiredRange: 1, ignoreCannotMove: true })]),
  card("warrior-brace-counter", "버티고 반격", "공용", "에픽", 30, [cardEffect("버티고 반격", "turn", [{ stat: "damageTaken", amount: -0.3 }, { stat: "damageDealt", amount: 0.2, when: { attackKind: "melee" } }])]),
  card("warrior-heavy-breakthrough", "묵직한 돌파", "공용", "에픽", 50, [cardMove(2, { desiredRange: 1 }), meleeAttack(3, { push: 1 })]),
  card("warrior-indomitable", "불굴", "공용", "전설", 24, [cardPassive("firstHitDamageReduction", "턴마다 처음 받는 피해 30% 감소", 0.3, { modifiers: [{ stat: "damageTaken", amount: -0.1 }] })]),
  card("warrior-battle-roar", "전장의 포효", "공용", "전설", 22, [cardEffect("전장의 포효", "turn", [{ stat: "damageTaken", amount: -0.2 }])]),
  card("warrior-earth-split", "대지 가르기", "공용", "전설", 38, [cardPattern(3, "adjacent-triple", { push: 1 })]),

  card("warrior-rough-slash", "거친 베기", "광전", "노말", 44, [meleeAttack(2), cardEffect("다음 피격 피해 증가", "nextHit", [{ stat: "damageTaken", amount: 0.1 }])]),
  card("warrior-blood-rhythm", "피의 박자", "광전", "노말", 36, [cardPassive("berserkLostHpDamage", "광전 태세", 0.5)]),
  card("warrior-rushdown", "몰아치기", "광전", "노말", 42, [meleeAttack(1), meleeAttack(1)]),
  card("warrior-rage-move", "분노 이동", "광전", "노말", 50, [cardMove(2, { desiredRange: 1 }), meleeAttack(1)]),
  card("warrior-wound-use", "상처 활용", "광전", "노말", 40, [{ type: "selfDamagePercent", percent: 0.1 }, meleeAttack(3)]),
  card("warrior-reckless-charge", "무모한 돌진", "광전", "노말", 54, [cardMove(3, { desiredRange: 1 }), meleeAttack(2), cardEffect("다음 피격 피해 증가", "nextHit", [{ stat: "damageTaken", amount: 0.1 }])]),
  card("warrior-bloody-blade", "피 묻은 칼날", "광전", "노말", 34, [cardEffect("피 묻은 칼날", "turn", [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "melee" } }, { stat: "damageTaken", amount: 0.1 }])]),
  card("warrior-assault", "맹공", "광전", "노말", 45, [meleeAttack(1, { targets: 2 })]),
  card("warrior-berserk-stance", "광전 태세", "광전", "레어", 34, [cardPassive("berserkLostHpDamage", "잃은 체력 비율 / 2만큼 공격 피해 증가", 0.5)]),
  card("warrior-blood-chain", "피의 연격", "광전", "레어", 41, [meleeAttack(1), meleeAttack(1), meleeAttack(1)]),
  card("warrior-rage-burst", "분노 폭발", "광전", "레어", 43, [cardPattern(2)]),
  card("warrior-fierce-chase", "사나운 추격", "광전", "레어", 46, [meleeAttack(1), cardMove(2, { desiredRange: 1, ignoreCannotMove: true }), meleeAttack(1)]),
  card("warrior-blood-recovery", "피의 회복", "광전", "레어", 38, [meleeAttack(1), { type: "healPercent", percent: 0.12 }]),
  card("warrior-blood-resolve", "피의 결의", "광전", "에픽", 32, [cardPassive("lowHpDamage", "체력이 25% 미만이면 공격 피해 50% 증가", 0.5, { threshold: 0.25 })]),
  card("warrior-finisher-slash", "끝장 베기", "광전", "에픽", 30, [meleeAttack(4)]),
  card("warrior-frenzy", "광란", "광전", "에픽", 28, [cardEffect("광란", "turn", [], { afterHitFlee: 1 })]),
  card("warrior-merciless-chain", "무자비한 연속", "광전", "에픽", 36, [{ type: "selfDamagePercent", percent: 0.1 }, meleeAttack(3), meleeAttack(2)]),
  card("warrior-battle-thirst", "전투 갈증", "광전", "에픽", 33, [cardPassive("killDamageBonus", "적 처치 시 다음 공격 피해 20% 증가", 0.2, { modifiers: [{ stat: "damageDealt", amount: 0.05, when: { attackKind: "melee" } }] })]),
  card("warrior-blood-storm-berserk", "피의 폭풍", "광전", "전설", 29, [meleeAttack(1), meleeAttack(1), meleeAttack(1), meleeAttack(1), meleeAttack(1)]),
  card("warrior-death-edge", "죽음의 칼끝", "광전", "전설", 27, [cardPassive("lowHpDamage", "체력이 25% 미만이면 공격 피해 50% 증가", 0.5, { threshold: 0.25 })]),
  card("warrior-final-blow", "최후의 일격", "광전", "전설", 26, [{ type: "selfDamagePercent", percent: 0.2 }, meleeAttack(6)]),

  card("warrior-long-entry", "긴 돌입", "돌진", "노말", 58, [cardMove(4, { desiredRange: 1 })]),
  card("warrior-shoulder-push", "어깨 밀기", "돌진", "노말", 52, [cardMove(2, { desiredRange: 1 }), meleeAttack(1, { push: 1 })]),
  card("warrior-leap-in", "달려들기", "돌진", "노말", 60, [cardMove(5, { desiredRange: 1 })]),
  card("warrior-low-entry", "낮은 자세 돌입", "돌진", "노말", 54, [cardMove(3, { desiredRange: 1 })]),
  card("warrior-gap-entry", "빈틈 파고들기", "돌진", "노말", 50, [cardMove(2, { desiredRange: 1 }), meleeAttack(1)]),
  card("warrior-chase-slash", "추격 베기", "돌진", "노말", 48, [meleeAttack(1), cardMove(2, { desiredRange: 1, ignoreCannotMove: true })]),
  card("warrior-close-move", "밀착 이동", "돌진", "노말", 52, [cardMove(2, { desiredRange: 1 }), meleeAttack(2)]),
  card("warrior-shake", "뒤흔들기", "돌진", "노말", 54, [cardMove(3, { desiredRange: 1 }), meleeAttack(1, { push: 1 })]),
  card("warrior-jump-entry", "점프 진입", "돌진", "레어", 56, [cardMove(4, { desiredRange: 1, jump: true })]),
  card("warrior-inertia-slash", "관성 베기", "돌진", "레어", 34, [cardPassive("moveAttackDamage", "2칸 이상 이동 후 공격 피해 10% 증가", 0.1, { modifiers: [{ stat: "damageDealt", amount: 0.05, when: { attackKind: "melee" } }] })]),
  card("warrior-breakthrough-slash", "돌파 베기", "돌진", "레어", 52, [cardMove(4, { desiredRange: 1 }), meleeAttack(2, { push: 1 })]),
  card("warrior-trample", "짓밟기", "돌진", "레어", 50, [cardMove(3, { desiredRange: 1 }), meleeAttack(2), cardFlee(1)]),
  card("warrior-flank-entry", "측면 진입", "돌진", "레어", 51, [cardMove(3, { desiredRange: 1, jump: true }), meleeAttack(1)]),
  card("warrior-leftover-force", "남은 힘 베기", "돌진", "에픽", 48, [{ type: "momentumAttack", amount: 5, mult: 1, range: 1 }]),
  card("warrior-sprint-mastery", "질주 숙련", "돌진", "에픽", 31, [cardPassive("moveCardBonus", "이동 카드 이동력 1 증가", 1)]),
  card("warrior-piercing-entry", "관통 진입", "돌진", "에픽", 49, [cardMove(4, { desiredRange: 1, jump: true }), cardPattern(2)]),
  card("warrior-shockwave", "충격파", "돌진", "에픽", 47, [cardMove(4, { desiredRange: 1 }), meleeAttack(2), meleeAttack(1, { targets: 3 })]),
  card("warrior-reentry", "재돌입", "돌진", "에픽", 33, [cardPassive("killMoveBonus", "적 처치 후 다음 이동 카드 이동력 1 증가", 1)]),
  card("warrior-unstoppable-entry", "멈추지 않는 돌입", "돌진", "전설", 55, [cardMove(6, { desiredRange: 1, jump: true })]),
  card("warrior-battle-comet", "전장의 혜성", "돌진", "전설", 45, [cardMove(5, { desiredRange: 1, jump: true }), meleeAttack(3, { push: 2 })]),
  card("warrior-infinite-inertia", "무한 관성", "돌진", "전설", 30, [cardPassive("stackingMoveBonus", "적 처치 시 이번 웨이브 동안 이동 카드 이동력 1 증가", 1)]),

  card("warrior-arc-slash", "호형 베기", "범위 공격", "노말", 48, [cardPattern(1)]),
  card("warrior-area-push", "밀어붙이기", "범위 공격", "노말", 46, [meleeAttack(1, { push: 1 })]),
  card("warrior-dive-cleave", "파고들기", "범위 공격", "노말", 50, [cardMove(2, { desiredRange: 1 }), cardPattern(1)]),
  card("warrior-entry-block", "진입 방해", "범위 공격", "노말", 47, [cardPattern(1, "adjacent-pair", { push: 1 })]),
  card("warrior-nearby-check", "주변 견제", "범위 공격", "노말", 45, [meleeAttack(1, { targets: 2 })]),
  card("warrior-low-sweep", "낮은 휩쓸기", "범위 공격", "노말", 44, [cardPattern(1), cardEffect("맞은 적 다음 이동 1 감소", "turn")]),
  card("warrior-front-pressure", "전방 압박", "범위 공격", "노말", 46, [cardPattern(1)]),
  card("warrior-flank-open", "옆구리 열기", "범위 공격", "노말", 49, [cardMove(1, { desiredRange: 1 }), cardPattern(1)]),
  card("warrior-wide-cleave-area", "넓은 휩쓸기", "범위 공격", "레어", 42, [cardPattern(2)]),
  card("warrior-surround-lure", "포위 유도", "범위 공격", "레어", 46, [cardMove(2, { desiredRange: 1 }), cardPattern(2)]),
  card("warrior-line-collapse", "전열 붕괴", "범위 공격", "레어", 40, [cardPattern(1, "adjacent-pair", { push: 2 })]),
  card("warrior-cornering", "몰아넣기", "범위 공격", "레어", 45, [cardMove(2, { desiredRange: 1 }), meleeAttack(1, { push: 1 }), cardPattern(1)]),
  card("warrior-multi-hit", "다중 타격", "범위 공격", "레어", 32, [cardPassive("areaPerTargetBonus", "범위 공격으로 맞힌 적 1명당 해당 공격 피해 배수 1 증가", 1)]),
  card("warrior-triangle-cleave", "삼각 휩쓸기", "범위 공격", "에픽", 39, [cardPattern(2, "adjacent-triple", { perTargetBonus: 1 })]),
  card("warrior-battle-control", "전장 장악", "범위 공격", "에픽", 31, [cardPassive("pushBonus", "밀기 효과 1 증가", 1, { modifiers: [{ stat: "push", amount: 1 }] })]),
  card("warrior-make-crack", "균열 만들기", "범위 공격", "에픽", 40, [cardPattern(2, "adjacent-pair", { push: 1 }), meleeAttack(1, { targets: 3 })]),
  card("warrior-spin-slash", "회전 베기", "범위 공격", "에픽", 38, [cardPattern(2, "adjacent-triple")]),
  card("warrior-overpower", "압도", "범위 공격", "에픽", 41, [cardMove(2, { desiredRange: 1 }), cardPattern(2, "adjacent-triple", { push: 1 })]),
  card("warrior-blood-storm-area", "피의 폭풍", "범위 공격", "전설", 34, [cardPattern(3, "adjacent-triple", { perTargetBonus: 1 })]),
  card("warrior-battle-domination", "전장 지배", "범위 공격", "전설", 29, [cardPassive("pushAreaDamage", "적을 밀 때마다 다음 범위 공격 피해 10% 증가", 0.1)]),
  card("warrior-earth-crush", "대지 분쇄", "범위 공격", "전설", 35, [meleeAttack(3, { targets: 6, push: 2 })]),
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
  card("mage-long-bolt", "장거리 마력탄", "공용", "노말", 34, [rangedAttack(1, 4)]),
  card("mage-reward-retreat", "마력 후퇴", "공용", "노말", 60, [cardFlee(3)]),
  card("mage-small-burst", "작은 폭발", "공용", "노말", 38, [{ type: "patternAttack", mult: 1, range: 3, pattern: "adjacent-pair" }]),
  card("mage-reward-shift-shot", "전이 사격", "공용", "노말", 46, [cardMove(2), rangedAttack(1, 3)]),
  card("mage-stable-magic", "안정된 마력", "공용", "노말", 36, [rangedAttack(2, 3)]),
  card("mage-split-magic", "갈래 마력", "공용", "노말", 39, [rangedAttack(1, 3, { targets: 2 })]),
  card("mage-magic-tune", "마력 조정", "공용", "노말", 44, [cardMove(1), rangedAttack(1, 4), cardFlee(1)]),
  card("mage-long-breath", "긴 호흡", "공용", "노말", 50, [{ type: "charge", amount: 1 }]),
  card("mage-lance-rare", "마력창", "공용", "레어", 32, [rangedAttack(3, 3)]),
  card("mage-three-way-magic", "세 갈래 마력", "공용", "레어", 35, [rangedAttack(1, 3, { targets: 3 })]),
  card("mage-magic-leap", "마력 도약", "공용", "레어", 52, [cardMove(3, { jump: true })]),
  card("mage-shield", "보호막", "공용", "레어", 28, [cardEffect("보호막", "turn", [{ stat: "damageTaken", amount: -0.3 }])]),
  card("mage-overflow", "마력 과잉", "공용", "레어", 30, [cardPassive("comboDamage", "한 카드 안에서 같은 적을 여러 번 맞히면 피해 10% 증가", 0.1)]),
  card("mage-explosion-rune-common", "폭발 룬", "공용", "에픽", 34, [{ type: "patternAttack", mult: 2, range: 3, pattern: "adjacent-pair" }]),
  card("mage-long-bombard", "장거리 폭격", "공용", "에픽", 33, [rangedAttack(2, 4, { targets: 2 })]),
  card("mage-leap-shot", "마력 도약", "공용", "에픽", 40, [cardMove(3, { jump: true }), rangedAttack(2, 3)]),
  card("mage-arcane-veil", "비전 장막", "공용", "에픽", 26, [cardEffect("비전 장막", "turn", [{ stat: "damageDealt", amount: 0.2, when: { attackKind: "ranged" } }, { stat: "damageTaken", amount: -0.2 }])]),
  card("mage-magic-cycle", "마력 순환", "공용", "에픽", 29, [cardPassive("chargeRangePerStack", "차지 후 다음 공격 사거리 1 증가", 1)]),
  card("mage-starlight-bombard", "별빛 폭격", "공용", "전설", 27, [rangedAttack(2, 4, { targets: 4 })]),
  card("mage-infinite-circuit", "무한 회로", "공용", "전설", 25, [cardPassive("multiTargetDamage", "원거리 공격 타겟 수가 2 이상이면 피해 20% 증가", 0.2, { modifiers: [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "ranged" } }] })]),
  card("mage-meteor-preview-common", "운석 예고", "공용", "전설", 24, [cardMeteor(4, 4, 1, 1)]),

  card("mage-chain-bolt", "연쇄 마력탄", "연쇄", "노말", 36, [rangedAttack(1, 3), rangedAttack(1, 3)]),
  card("mage-spreading-lightning", "퍼지는 번개", "연쇄", "노말", 38, [rangedAttack(1, 3, { targets: 2 })]),
  card("mage-shaking-current", "흔들리는 전류", "연쇄", "노말", 37, [rangedAttack(1, 3), cardEffect("주변 적 다음 피해 증가", "turn", [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "ranged" } }])]),
  card("mage-current-align", "전류 정렬", "연쇄", "노말", 41, [cardMove(1), rangedAttack(1, 3, { targets: 2 })]),
  card("mage-weak-chain", "약한 연쇄", "연쇄", "노말", 35, [rangedAttack(1, 4), rangedAttack(1, 2)]),
  card("mage-repeat-ignite", "반복 점화", "연쇄", "노말", 36, [rangedAttack(1, 3), rangedAttack(1, 3, { preferPreviousTarget: true, sameTargetBonus: 0.1 })]),
  card("mage-bouncing-spark", "튀는 불꽃", "연쇄", "노말", 39, [rangedAttack(1, 3, { targets: 2 }), cardFlee(1)]),
  card("mage-magic-echo", "마력 잔향", "연쇄", "노말", 28, [cardEffect("두 번째 공격 피해 10% 증가", "turn", [{ stat: "damageDealt", amount: 0.1, when: { repeatHit: true } }])]),
  card("mage-triple-lightning", "세 갈래 번개", "연쇄", "레어", 34, [rangedAttack(1, 3, { targets: 3 })]),
  card("mage-chain-amplify", "연쇄 증폭", "연쇄", "레어", 29, [cardPassive("multiTargetDamage", "원거리 공격 타겟 수가 2 이상이면 피해 10% 증가", 0.1, { modifiers: [{ stat: "damageDealt", amount: 0.05, when: { attackKind: "ranged" } }] })]),
  card("mage-lightning-repeat", "번개 반복", "연쇄", "레어", 35, [rangedAttack(1, 3), rangedAttack(1, 3), rangedAttack(1, 3)]),
  card("mage-resonance-mark", "공명 표식", "연쇄", "레어", 33, [rangedAttack(1, 4), rangedAttack(1, 4, { preferPreviousTarget: true, sameTargetBonus: 0.2 })]),
  card("mage-residual-current", "잔류 전류", "연쇄", "레어", 27, [cardEffect("잔류 전류", "turn", [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "ranged" } }])]),
  card("mage-storm-circuit", "폭풍 회로", "연쇄", "에픽", 32, [rangedAttack(1, 3, { targets: 3 }), rangedAttack(1, 3)]),
  card("mage-current-burst", "전류 폭발", "연쇄", "에픽", 31, [rangedAttack(2, 3), rangedAttack(1, 3, { preferPreviousTarget: true, sameTargetBonus: 0.2 })]),
  card("mage-pack-hunt", "무리 사냥", "연쇄", "에픽", 25, [cardPassive("multiPriority", "원거리 공격 타겟 수가 2 이상이면 우선권 숫자 5 감소", 5)]),
  card("mage-amplify-circuit", "증폭 회로", "연쇄", "에픽", 26, [cardEffect("원거리 공격 타겟 수 1 증가", "turn", [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "ranged" } }])]),
  card("mage-bright-afterimage", "빛나는 잔상", "연쇄", "에픽", 33, [rangedAttack(1, 4), cardMove(2, { jump: true }), rangedAttack(1, 4)]),
  card("mage-thunder-ring", "천둥의 고리", "연쇄", "전설", 24, [rangedAttack(1, 4, { targets: 5 })]),
  card("mage-infinite-chain", "무한 연쇄", "연쇄", "전설", 23, [cardPassive("killChainDamage", "적을 처치하면 같은 카드의 다음 공격 피해 30% 증가", 0.3, { modifiers: [{ stat: "damageDealt", amount: 0.05, when: { repeatHit: true } }] })]),
  card("mage-eye-of-storm", "폭풍의 눈", "연쇄", "전설", 22, [cardEffect("폭풍의 눈", "turn", [{ stat: "damageDealt", amount: 0.2, when: { attackKind: "ranged" } }])]),

  card("mage-small-rune", "작은 룬", "룬", "노말", 48, [cardRune(3, 1, 1)]),
  card("mage-rune-back", "룬 뒤로", "룬", "노말", 54, [cardFlee(2), cardRune(2, 1, 1)]),
  card("mage-rune-scatter", "룬 흩뿌리기", "룬", "노말", 52, [cardRune(2, 2, 1), { type: "fleeToRune", amount: 2 }]),
  card("mage-rune-ignite", "룬 점화", "룬", "노말", 36, [{ type: "runeAttack", mult: 1, radius: 1 }]),
  card("mage-burst-shard", "폭발 조각", "룬", "노말", 38, [{ type: "patternAttack", mult: 1, range: 3, pattern: "adjacent-pair" }]),
  card("mage-slippery-circuit", "미끄러운 회로", "룬", "노말", 56, [cardFlee(3), cardRune(2, 1, 1)]),
  card("mage-rune-carve", "룬 새기기", "룬", "노말", 50, [cardMove(1), cardRune(2, 1, 1)]),
  card("mage-magic-mark", "마력 표식", "룬", "노말", 39, [rangedAttack(1, 3), cardRune(2, 1, 1)]),
  card("mage-explosion-rune", "폭발 룬", "룬", "레어", 42, [cardRune(3, 1, 2)]),
  card("mage-rune-blast", "룬 폭파", "룬", "레어", 37, [{ type: "detonateRune", mult: 2, radius: 1 }]),
  card("mage-rune-shield", "룬 보호막", "룬", "레어", 28, [cardEffect("룬 보호막", "turn", [{ stat: "damageTaken", amount: -0.2 }])]),
  card("mage-double-rune", "이중 룬", "룬", "레어", 44, [cardRune(3, 2, 1)]),
  card("mage-rune-missile", "룬 유도탄", "룬", "레어", 35, [{ type: "runeAttack", mult: 2, radius: 1 }]),
  card("mage-rune-zone", "룬 지대", "룬", "에픽", 40, [cardRune(2, 2, 1), cardFlee(2)]),
  card("mage-chain-explosion", "연쇄 폭발", "룬", "에픽", 27, [cardPassive("runeChainDamage", "룬이 발동하면 인접 룬도 공격 1로 발동", 1)]),
  card("mage-large-rune", "대형 룬", "룬", "에픽", 36, [cardRune(3, 1, 3)]),
  card("mage-rune-shift", "룬 전이", "룬", "에픽", 39, [{ type: "fleeToRune", amount: 3 }, { type: "runeAttack", mult: 2, radius: 1 }]),
  card("mage-stable-circuit", "안정된 회로", "룬", "에픽", 30, [cardPassive("runeDamage", "룬이 남아 있으면 원거리 공격 피해 10% 증가", 0.1, { modifiers: [{ stat: "damageDealt", amount: 0.05, when: { attackKind: "ranged" } }] })]),
  card("mage-minefield", "마력 지뢰밭", "룬", "전설", 34, [cardRune(4, 4, 1), { type: "fleeToRune", amount: 3 }]),
  card("mage-great-rune-blast", "룬 대폭발", "룬", "전설", 30, [{ type: "detonateRune", mult: 3, radius: 1 }]),
  card("mage-permanent-circuit", "영구 회로", "룬", "전설", 25, [cardPassive("persistentRune", "웨이브 중 처음 설치한 룬 1개는 발동 후에도 사라지지 않음", 1)]),

  card("mage-small-meteor", "작은 운석", "운석", "노말", 33, [cardMeteor(3, 2, 1, 1)]),
  card("mage-sky-mark", "하늘 표식", "운석", "노말", 31, [cardMeteor(4, 3, 0, 1)]),
  card("mage-guided-retreat", "유도 후퇴", "운석", "노말", 44, [cardFlee(2), cardMeteor(3, 2, 1, 1)]),
  card("mage-shaking-star", "흔들리는 별", "운석", "노말", 32, [cardMeteor(4, 2, 1, 1)]),
  card("mage-shard-preview", "파편 예고", "운석", "노말", 34, [cardMeteor(3, 1, 1, 1)]),
  card("mage-starlight-check", "별빛 견제", "운석", "노말", 36, [rangedAttack(1, 3), cardMeteor(3, 2, 1, 1)]),
  card("mage-missed-shard", "빗나간 파편", "운석", "노말", 26, [cardEffect("운석 빗나감 대비", "turn", [{ stat: "damageTaken", amount: -0.2 }])]),
  card("mage-unstable-orbit", "불안정한 궤도", "운석", "노말", 35, [cardMeteor(4, 3, 1, 1)]),
  card("mage-meteor-preview", "운석 예고", "운석", "레어", 30, [cardMeteor(4, 4, 1, 1)]),
  card("mage-star-tracking", "별 추적", "운석", "레어", 25, [cardPassive("meteorTargeting", "운석 낙하지점 선택 시 적이 많은 위치를 더 강하게 우선", 1)]),
  card("mage-second-star", "두 번째 별", "운석", "레어", 32, [cardMeteor(4, 2, 1, 1), cardMeteor(4, 2, 1, 1)]),
  card("mage-starlight-lock", "별빛 고정", "운석", "레어", 27, [cardEffect("운석 명중 대상 이동 1 감소", "turn")]),
  card("mage-shard-recovery", "파편 회수", "운석", "레어", 45, [{ type: "charge", amount: 1 }, cardFlee(2)]),
  card("mage-star-cluster", "별무리", "운석", "에픽", 28, [cardMeteor(5, 3, 1, 1), cardMeteor(5, 3, 1, 1)]),
  card("mage-collision-predict", "충돌 예측", "운석", "에픽", 24, [cardPassive("meteorMultiDamage", "운석이 2명 이상 맞히면 다음 운석 피해 20% 증가", 0.2)]),
  card("mage-red-orbit", "붉은 궤도", "운석", "에픽", 26, [cardMeteor(5, 5, 1, 1)]),
  card("mage-fall-guide", "낙하 유도", "운석", "에픽", 34, [rangedAttack(1, 4, { push: 1 }), cardMeteor(4, 3, 1, 1)]),
  card("mage-star-afterheat", "별의 잔열", "운석", "에픽", 23, [cardEffect("별의 잔열", "turn", [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "ranged" } }])]),
  card("mage-starfall", "별 추락", "운석", "전설", 21, [cardMeteor(5, 7, 1, 1)]),
  card("mage-doom-preview", "종말 예고", "운석", "전설", 20, [cardMeteor(5, 10, 2, 2)]),
  card("mage-sky-collapse", "하늘 붕괴", "운석", "전설", 22, [cardPassive("meteorKillSplash", "운석이 적을 처치하면 같은 위치 주변 1칸에 공격 3 추가 발생", 3)]),
];

const archerPassivePool = [
  passiveCard("archer-passive-sharp-bow", "예리한 활", "공용", "노말", [
    cardPassive("baseAtkPercent", "공격력 10% 증가", 0.1),
  ]),
  passiveCard("archer-passive-light-armor", "가벼운 방호", "공용", "노말", [
    cardPassive("maxHpPercent", "최대 체력 10% 증가", 0.1),
    { type: "passive", label: "받는 피해 15% 감소", modifiers: [{ stat: "damageTaken", amount: -0.15 }] },
  ]),
  passiveCard("archer-passive-repeat-rhythm", "반복 리듬", "다단중첩", "노말", [
    cardPassive("comboDamage", "한 카드 안에서 같은 적을 다시 공격할 때마다 피해 35% 증가", 0.35),
  ]),
  passiveCard("archer-passive-trap-polish", "함정 손질", "함정", "노말", [
    cardPassive("trapNextAttackDamage", "함정 발동 후 다음 공격 피해 50% 증가", 0.5),
  ]),
  passiveCard("archer-passive-steady-charge", "안정 차지", "차지", "노말", [
    cardPassive("chargeRangePerStack", "차지 1당 사거리 3 증가", 3),
    cardPassive("chargeStackMultiplier", "차지 스택 효과 1.5배", 1.5),
    cardPassive("chargeOnNoAttack", "공격하지 않으면 차지 1", 1),
  ]),
  passiveCard("archer-passive-weakness-read", "약점 판독", "다단중첩", "레어", [
    cardPassive("thirdHitDamage", "세 번째 명중 피해 100% 증가", 1),
  ]),
  passiveCard("archer-passive-trap-mark", "덫 표식", "함정", "레어", [
    cardPassive("trapRangedVulnerability", "함정 발동 대상이 받는 원거리 피해 60% 증가", 0.6),
    cardPassive("trapNextAttackDamage", "함정 발동 후 다음 공격 피해 50% 증가", 0.5),
  ]),
  passiveCard("archer-passive-ambush-shot", "매복 사격", "함정", "레어", [
    cardPassive("trapTriggerShot", "함정 발동 시 사거리 5 원거리 공격 4회", 4, { range: 5 }),
  ]),
  passiveCard("archer-passive-overdraw", "과집중", "차지", "레어", [
    cardPassive("chargeStackMultiplier", "차지 스택 효과 2.5배", 2.5),
  ]),
  passiveCard("archer-passive-hunt-flow", "사냥 흐름", "공용", "에픽", [
    cardPassive("afterAttackMove", "공격 카드 사용 후 이동 2", 2),
  ]),
  passiveCard("archer-passive-endless-string", "끝없는 현", "다단중첩", "에픽", [
    cardPassive("comboDamage", "한 카드 안에서 같은 적을 다시 공격할 때마다 피해 60% 증가", 0.6),
  ]),
  passiveCard("archer-passive-chain-trap", "연쇄 덫", "함정", "에픽", [
    cardPassive("trapChainDamage", "함정 발동 시 주변 피해 5배", 5),
  ]),
  passiveCard("archer-passive-piercing-charge", "관통 차지", "차지", "에픽", [
    cardPassive("overkillSplashRange", "처치 잔여 피해 6칸 전이", 6),
    cardPassive("chargeStackMultiplier", "차지 스택 효과 2배", 2),
  ]),
  passiveCard("archer-passive-finale-sense", "결말 감각", "다단중첩", "전설", [
    cardPassive("thirdHitDamage", "세 번째 명중 피해 200% 증가", 2),
  ]),
  passiveCard("archer-passive-predator-snare", "포식 덫", "함정", "전설", [
    cardPassive("trapRangedVulnerability", "함정 발동 대상이 받는 원거리 피해 100% 증가", 1),
    cardPassive("trapTriggerShot", "함정 발동 시 사거리 6 원거리 공격 4회", 4, { range: 6 }),
  ]),
  passiveCard("archer-passive-perfect-overkill", "완전 관통", "차지", "전설", [
    cardPassive("overkillSplashRange", "처치 잔여 피해 10칸 전이", 10),
    cardPassive("chargeStackMultiplier", "차지 스택 효과 4배", 4),
  ]),
];

const warriorPassivePool = [
  passiveCard("warrior-passive-honed-blade", "단련된 칼날", "공용", "노말", [
    cardPassive("baseAtkPercent", "공격력 10% 증가", 0.1),
  ]),
  passiveCard("warrior-passive-hard-body", "단단한 몸", "공용", "노말", [
    cardPassive("maxHpPercent", "최대 체력 10% 증가", 0.1),
  ]),
  passiveCard("warrior-passive-blood-heat", "피의 열기", "광전", "노말", [
    cardPassive("berserkLostHpDamage", "잃은 체력 비율 / 2만큼 공격 피해 증가", 0.5),
  ]),
  passiveCard("warrior-passive-charge-step", "돌입 보폭", "돌진", "노말", [
    cardPassive("moveCardBonus", "이동 카드 이동력 1 증가", 1),
  ]),
  passiveCard("warrior-passive-wide-pressure", "넓은 압박", "범위 공격", "노말", [
    cardPassive("pushBonus", "밀기 효과 1 증가", 1, { modifiers: [{ stat: "push", amount: 1 }] }),
  ]),
  passiveCard("warrior-passive-second-breath", "두 번째 호흡", "공용", "레어", [
    cardPassive("extraCardPlays", "매턴 카드 1장 추가 사용", 1),
  ]),
  passiveCard("warrior-passive-blood-resolve", "피의 결의", "광전", "레어", [
    cardPassive("lowHpDamage", "체력이 25% 미만이면 공격 피해 50% 증가", 0.5, { threshold: 0.25 }),
  ]),
  passiveCard("warrior-passive-inertia", "관성 유지", "돌진", "레어", [
    cardPassive("moveAttackDamage", "근접 공격 피해 10% 증가", 0.1, {
      modifiers: [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "melee" } }],
    }),
  ]),
  passiveCard("warrior-passive-area-read", "휩쓸기 감각", "범위 공격", "레어", [
    cardPassive("areaPerTargetBonus", "범위 공격으로 맞힌 적 1명당 해당 공격 피해 배수 1 증가", 1),
  ]),
  passiveCard("warrior-passive-iron-heart", "철심장", "공용", "에픽", [
    cardPassive("maxHpPercent", "최대 체력 20% 증가", 0.2),
  ]),
  passiveCard("warrior-passive-battle-thirst", "전투 갈증", "광전", "에픽", [
    cardPassive("killDamageBonus", "적 처치 시 다음 공격 피해 20% 증가", 0.2, {
      modifiers: [{ stat: "damageDealt", amount: 0.05, when: { attackKind: "melee" } }],
    }),
  ]),
  passiveCard("warrior-passive-reentry", "재돌입", "돌진", "에픽", [
    cardPassive("killMoveBonus", "적 처치 후 다음 이동 카드 이동력 1 증가", 1),
  ]),
  passiveCard("warrior-passive-domination", "전장 지배", "범위 공격", "에픽", [
    cardPassive("pushAreaDamage", "적을 밀 때마다 다음 범위 공격 피해 10% 증가", 0.1),
  ]),
  passiveCard("warrior-passive-war-god", "전신", "공용", "전설", [
    cardPassive("extraCardPlays", "매턴 카드 1장 추가 사용", 1),
  ]),
  passiveCard("warrior-passive-death-edge", "죽음의 칼끝", "광전", "전설", [
    cardPassive("lowHpDamage", "체력이 35% 미만이면 공격 피해 60% 증가", 0.6, { threshold: 0.35 }),
  ]),
  passiveCard("warrior-passive-infinite-inertia", "무한 관성", "돌진", "전설", [
    cardPassive("stackingMoveBonus", "적 처치 시 이번 웨이브 동안 이동 카드 이동력 1 증가", 1),
  ]),
];

const magePassivePool = [
  passiveCard("mage-passive-arcane-focus", "비전 집중", "공용", "노말", [
    cardPassive("baseAtkPercent", "공격력 10% 증가", 0.1),
  ]),
  passiveCard("mage-passive-mana-shell", "마나 껍질", "공용", "노말", [
    cardPassive("maxHpPercent", "최대 체력 10% 증가", 0.1),
  ]),
  passiveCard("mage-passive-magic-overflow", "마력 과잉", "연쇄", "노말", [
    cardPassive("comboDamage", "한 카드 안에서 같은 적을 다시 공격할 때마다 피해 10% 증가", 0.1),
  ]),
  passiveCard("mage-passive-rune-tune", "룬 조율", "룬", "노말", [
    cardPassive("runeDamage", "룬이 남아 있으면 원거리 공격 피해 10% 증가", 0.1, {
      modifiers: [{ stat: "damageDealt", amount: 0.05, when: { attackKind: "ranged" } }],
    }),
  ]),
  passiveCard("mage-passive-star-sight", "별빛 시야", "운석", "노말", [
    cardPassive("meteorTargeting", "운석 낙하지점 선택 시 적이 많은 위치를 더 강하게 우선", 1),
  ]),
  passiveCard("mage-passive-quick-cast", "빠른 영창", "공용", "레어", [
    cardPassive("extraCardPlays", "매턴 카드 1장 추가 사용", 1),
  ]),
  passiveCard("mage-passive-chain-amplify", "연쇄 증폭", "연쇄", "레어", [
    cardPassive("multiTargetDamage", "원거리 공격 타겟 수가 2 이상이면 피해 10% 증가", 0.1, {
      modifiers: [{ stat: "damageDealt", amount: 0.05, when: { attackKind: "ranged" } }],
    }),
  ]),
  passiveCard("mage-passive-rune-chain", "룬 연동", "룬", "레어", [
    cardPassive("runeChainDamage", "룬이 발동하면 인접 룬도 공격 1로 발동", 1),
  ]),
  passiveCard("mage-passive-shard-recovery", "파편 회수", "운석", "레어", [
    cardPassive("chargeOnNoAttack", "공격하지 않으면 차지 1", 1),
  ]),
  passiveCard("mage-passive-arcane-cycle", "마력 순환", "공용", "에픽", [
    cardPassive("chargeRangePerStack", "차지 1당 사거리 1 증가", 1),
  ]),
  passiveCard("mage-passive-infinite-chain", "무한 연쇄", "연쇄", "에픽", [
    cardPassive("killChainDamage", "적을 처치하면 같은 카드의 다음 공격 피해 30% 증가", 0.3, {
      modifiers: [{ stat: "damageDealt", amount: 0.05, when: { repeatHit: true } }],
    }),
  ]),
  passiveCard("mage-passive-stable-circuit", "안정된 회로", "룬", "에픽", [
    cardPassive("runeDamage", "룬이 남아 있으면 원거리 공격 피해 20% 증가", 0.2, {
      modifiers: [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "ranged" } }],
    }),
  ]),
  passiveCard("mage-passive-collision-predict", "충돌 예측", "운석", "에픽", [
    cardPassive("meteorMultiDamage", "운석이 2명 이상 맞히면 다음 운석 피해 20% 증가", 0.2),
  ]),
  passiveCard("mage-passive-double-cast", "이중 영창", "공용", "전설", [
    cardPassive("extraCardPlays", "매턴 카드 1장 추가 사용", 1),
  ]),
  passiveCard("mage-passive-infinite-circuit", "무한 회로", "연쇄", "전설", [
    cardPassive("multiTargetDamage", "원거리 공격 타겟 수가 2 이상이면 피해 20% 증가", 0.2, {
      modifiers: [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "ranged" } }],
    }),
  ]),
  passiveCard("mage-passive-permanent-circuit", "영구 회로", "룬", "전설", [
    cardPassive("persistentRune", "웨이브 중 처음 설치한 룬 1개는 발동 후에도 사라지지 않음", 1),
  ]),
  passiveCard("mage-passive-sky-collapse", "하늘 붕괴", "운석", "전설", [
    cardPassive("meteorKillSplash", "운석이 적을 처치하면 같은 위치 주변 1칸에 공격 3 추가 발생", 3),
  ]),
];

const archerTokenImages = {
  front: "assets/characters/archer-token/archer-token-v2-front.png",
  frontRight: "assets/characters/archer-token/archer-token-v2-front-right.png",
  right: "assets/characters/archer-token/archer-token-v2-right.png",
  back: "assets/characters/archer-token/archer-token-v2-back.png",
  backLeft: "assets/characters/archer-token/archer-token-v2-back-left.png",
  left: "assets/characters/archer-token/archer-token-v2-left.png",
};

const characterDefinitions = {
  archer: {
    id: "archer",
    name: "궁수",
    shortLabel: "궁",
    image: "assets/casting/archer/archer-01-2d-illustration-cutout.png",
    tokenImages: archerTokenImages,
    title: "궁수 오토배틀 프로토타입",
    maxHp: 80,
    baseAtk: 10,
    baseRange: 2,
    baseMove: 2,
    baseCards: baseArcherCards,
    rewardPool: archerRewardPool,
    passivePool: archerPassivePool,
  },
  warrior: {
    id: "warrior",
    name: "전사",
    shortLabel: "전",
    image: "assets/characters/warrior.png",
    title: "전사 오토배틀 프로토타입",
    maxHp: 100,
    baseAtk: 8,
    baseRange: 1,
    baseMove: 2,
    baseCards: baseWarriorCards,
    rewardPool: warriorRewardPool,
    passivePool: warriorPassivePool,
  },
  mage: {
    id: "mage",
    name: "마법사",
    shortLabel: "마",
    image: "assets/characters/mage.png",
    title: "마법사 오토배틀 프로토타입",
    maxHp: 55,
    baseAtk: 12,
    baseRange: 3,
    baseMove: 2,
    baseCards: baseMageCards,
    rewardPool: mageRewardPool,
    passivePool: magePassivePool,
  },
};

selectedCharacterId = initialSelectedCharacterId();

const coreVisualAssetUrls = [
  "assets/casual/bg-meadow.png?v=20260623-bg-image",
  "assets/casual/hex-grass.png?v=20260623-boulder-wall",
  "assets/casual/hex-stone.png?v=20260623-boulder-wall",
  "assets/casual/hex-earth.png",
  "assets/casual/hud-panel.png",
  "assets/casual/button-pill.png",
  "assets/casual/hud-token.png",
];

const rewardCardAssetUrls = [
  "assets/card-normal-v2.png",
  "assets/card-rare-v2.png",
  "assets/card-epic-v2.png",
  "assets/card-legendary-v2.png",
  "assets/card-normal-overlay.png",
  "assets/card-rare-overlay.png",
  "assets/card-epic-overlay.png",
  "assets/card-legendary-overlay.png",
];
const preloadedImageUrls = new Set();
let rewardRenderToken = 0;

function preloadImage(url) {
  if (!url || preloadedImageUrls.has(url)) return Promise.resolve();
  preloadedImageUrls.add(url);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (image.decode) {
        image.decode().catch(() => {}).finally(resolve);
      } else {
        resolve();
      }
    };
    image.onerror = resolve;
    image.src = url;
  });
}

function preloadRewardAssets(character = getSelectedCharacter()) {
  return Promise.all([
    ...coreVisualAssetUrls,
    ...rewardCardAssetUrls,
    ...characterImageUrls(character),
  ].map((url) => preloadImage(url)));
}

function characterImageUrls(character) {
  return [
    character?.image,
    ...Object.values(character?.tokenImages ?? {}),
  ].filter(Boolean);
}

function initialSelectedCharacterId() {
  const queryCharacter = new URLSearchParams(window.location.search).get("character");
  if (queryCharacter && characterDefinitions[queryCharacter]) {
    persistSelectedCharacterId(queryCharacter);
    return queryCharacter;
  }

  try {
    const savedCharacter = localStorage.getItem(SELECTED_CHARACTER_STORAGE_KEY);
    if (savedCharacter && characterDefinitions[savedCharacter]) return savedCharacter;
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }

  return "archer";
}

function persistSelectedCharacterId(id) {
  try {
    localStorage.setItem(SELECTED_CHARACTER_STORAGE_KEY, id);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function defaultMetaProgress() {
  return { levels: { archer: 1, warrior: 1, mage: 1 } };
}

function loadMetaProgress() {
  const fallback = defaultMetaProgress();
  try {
    const saved = JSON.parse(localStorage.getItem(META_PROGRESS_STORAGE_KEY) ?? "null");
    const levels = { ...fallback.levels, ...(saved?.levels ?? {}) };
    Object.keys(levels).forEach((id) => {
      levels[id] = clampMetaLevel(levels[id]);
    });
    return { levels };
  } catch {
    return fallback;
  }
}

function defaultAutoUpgradeRules() {
  return { levelRequirements: {} };
}

function loadAutoUpgradeRules() {
  const fallback = defaultAutoUpgradeRules();
  try {
    const saved = JSON.parse(localStorage.getItem(AUTO_UPGRADE_RULES_STORAGE_KEY) ?? "null");
    const levelRequirements = Object.entries(saved?.levelRequirements ?? {}).reduce((result, [id, value]) => {
      const level = sanitizeMetaRequirement(value);
      if (level) result[id] = level;
      return result;
    }, {});
    return { ...fallback, levelRequirements };
  } catch {
    return fallback;
  }
}

function saveMetaProgress() {
  try {
    localStorage.setItem(META_PROGRESS_STORAGE_KEY, JSON.stringify(metaProgress));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function clampMetaLevel(value) {
  const level = Number.isFinite(Number(value)) ? Number(value) : META_LEVEL_MIN;
  return Math.max(META_LEVEL_MIN, Math.min(META_LEVEL_MAX, Math.round(level)));
}

function sanitizeMetaRequirement(value) {
  if (String(value ?? "").trim() === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return clampMetaLevel(numeric);
}

function characterMetaLevel(id) {
  return clampMetaLevel(metaProgress?.levels?.[id] ?? META_LEVEL_MIN);
}

function setCharacterMetaLevel(id, level) {
  metaProgress.levels[id] = clampMetaLevel(level);
  saveMetaProgress();
  renderMetaGrowth();
  render();
}

const monsterDefinitions = {
  brute: { name: "브루트", label: "브", image: "assets/characters/brute.png", baseAtk: 3, baseRange: 1, baseMove: 2 },
  skirmisher: { name: "척후병", label: "척", image: "assets/characters/skirmisher.png", baseAtk: 3, baseRange: 1, baseMove: 3 },
  shooter: { name: "사수", label: "사", image: "assets/characters/shooter.png", baseAtk: 3, baseRange: 3, baseMove: 2 },
};

function spriteImg(src, className, alt = "") {
  return src ? `<img class="${className}" src="${src}" alt="${alt}" loading="lazy" decoding="async" />` : "";
}

function portraitContent(src, label, imageClass) {
  return src ? spriteImg(src, imageClass) : `<span>${label}</span>`;
}

function entityLabel(entity) {
  return entity.label ?? (entity.side === "player" ? getSelectedCharacter().shortLabel : entity.monsterIndex);
}

function entityImage(entity, bounds = null) {
  if (entity.side === "player") {
    const character = characterDefinitions[entity.characterId] ?? getSelectedCharacter();
    if (character.tokenImages) return characterTokenImage(entity, character, bounds);
    return character.image;
  }
  return monsterDefinitions[entity.kind]?.image;
}

function characterTokenImage(entity, character, bounds = null) {
  const tokenImages = character.tokenImages ?? {};
  const viewKey = characterTokenViewKey(entity, bounds);
  return tokenImages[viewKey] ?? tokenImages.front ?? character.image;
}

function characterTokenViewKey(entity, bounds = null) {
  const target = state?.entityFacingTargets?.get(entity.id) ?? nearestOpponent(entity);
  return characterTokenViewKeyToward(entity, target, bounds);
}

function characterTokenImageToward(entity, character, target, bounds = null) {
  const tokenImages = character.tokenImages ?? {};
  const viewKey = characterTokenViewKeyToward(entity, target, bounds);
  return tokenImages[viewKey] ?? tokenImages.front ?? character.image;
}

function characterTokenViewKeyToward(entity, target, bounds = null) {
  if (!target) return "front";

  const vector = bounds
    ? screenVectorBetween(entity, target, bounds)
    : { x: target.q - entity.q, y: target.r - entity.r };
  const absX = Math.abs(vector.x);
  const absY = Math.abs(vector.y);

  if (absX > absY * 1.35) return vector.x >= 0 ? "right" : "left";
  if (absY > absX * 1.35) return vector.y >= 0 ? "front" : "back";
  if (vector.y >= 0 && vector.x >= 0) return "frontRight";
  if (vector.y >= 0 && vector.x < 0) return "left";
  if (vector.y < 0 && vector.x < 0) return "backLeft";
  return "right";
}

function screenVectorBetween(from, to, bounds) {
  const fromPoint = hexToPixel(from, bounds);
  const toPoint = hexToPixel(to, bounds);
  return {
    x: toPoint.x - fromPoint.x,
    y: toPoint.y - fromPoint.y,
  };
}

function nearestOpponent(entity) {
  return aliveOpponents(entity)
    .sort((a, b) => {
      const distance = axialDistance(entity, a) - axialDistance(entity, b);
      if (distance) return distance;
      return (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0);
    })[0] ?? null;
}

function entityDomSelector(id) {
  return `.entity[data-entity-id="${String(id).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"]`;
}

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
    card("skirmisher-dash", "파고들기", "척후병", "기본", 50, [
      { type: "move", amount: 3, desiredRange: 1 },
      { type: "attack", mult: 1, range: 1, melee: true },
    ], 3),
    card("skirmisher-hit-run", "연속 찌르기", "척후병", "기본", 56, [
      { type: "attack", mult: 1, range: 1, melee: true },
      { type: "attack", mult: 1, range: 1, melee: true },
    ], 1),
    card("skirmisher-feint", "교란", "척후병", "기본", 58, [{ type: "move", amount: 2, desiredRange: 1 }], 3),
    card("skirmisher-stab", "찌르기", "척후병", "기본", 48, [{ type: "attack", mult: 1, range: 1, melee: true }], 1),
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
const testPlayerPartyIds = ["archer", "warrior", "mage"];
const autoUpgradeCatalog = [
  autoUpgrade("auto-archer-damage", "archer", "공용", "안정 사격", "궁수 기본 공격력이 25% 증가한다.", () => {
    increaseAutoHeroBaseAtkPercent("archer", 0.25);
  }),
  autoUpgrade("auto-archer-range", "archer", "공용", "사거리 확보", "궁수 자동 사격 사거리가 1 증가한다.", () => {
    autoPermanent("archer").autoRangeBonus = (autoPermanent("archer").autoRangeBonus ?? 0) + 1;
  }),
  autoUpgrade("auto-archer-push-arrow", "archer", "공용", "밀어내는 화살", "궁수 공격 시 20% 확률로 적을 1칸 밀친다.", () => {
    autoPermanent("archer").attackPushChance = Math.max(autoPermanent("archer").attackPushChance ?? 0, 0.2);
    autoPermanent("archer").attackPushAmount = Math.max(autoPermanent("archer").attackPushAmount ?? 0, 1);
  }, { metaLevel: 1 }),
  autoUpgrade("auto-archer-overkill-transfer", "archer", "공용", "잔여 관통", "궁수가 적을 처치하면 남은 피해가 처치 대상 기준 3칸 안의 적에게 전이된다.", () => {
    autoPermanent("archer").overkillSplashRange = Math.max(autoPermanent("archer").overkillSplashRange ?? 0, 3);
  }, { metaLevel: 1 }),
  autoUpgrade("auto-archer-third-pulse", "archer", "공용", "세 번째 파동", "궁수가 3회 공격할 때마다 대상 근처 적 3명에게 현재 체력의 10% 피해를 준다.", () => {
    autoPermanent("archer").thirdAttackPulseEvery = 3;
    autoPermanent("archer").thirdAttackPulseTargets = Math.max(autoPermanent("archer").thirdAttackPulseTargets ?? 0, 3);
    autoPermanent("archer").thirdAttackPulsePercent = Math.max(autoPermanent("archer").thirdAttackPulsePercent ?? 0, 0.1);
    autoPermanent("archer").thirdAttackPulseRange = Math.max(autoPermanent("archer").thirdAttackPulseRange ?? 0, 1);
  }, { metaLevel: 1 }),
  autoUpgrade("auto-archer-charge", "archer", "차지", "저격 태세", "궁수의 자동 공격이 차지로 바뀐다. 차지 4가 되면 사거리 제한 없는 공격 4를 한다.", () => {
    autoPermanent("archer").autoSnipeChargeMode = true;
    autoPermanent("archer").autoSnipeThreshold = Math.min(autoPermanent("archer").autoSnipeThreshold ?? 4, 4);
    autoPermanent("archer").autoSnipeDamage = Math.max(autoPermanent("archer").autoSnipeDamage ?? 4, 4);
  }, { metaLevel: 1 }),
  autoUpgrade("auto-archer-charge-compress", "archer", "차지", "압축 장전", "저격 발사에 필요한 차지가 3으로 감소한다.", () => {
    autoPermanent("archer").autoSnipeThreshold = Math.min(autoPermanent("archer").autoSnipeThreshold ?? 4, 3);
  }, { requires: ["auto-archer-charge"] }),
  autoUpgrade("auto-archer-repeat", "archer", "연타", "반복 리듬", "궁수가 같은 적을 연속으로 맞힐 때마다 피해가 25% 증가한다.", () => {
    autoPermanent("archer").comboDamage = (autoPermanent("archer").comboDamage ?? 0) + 0.25;
  }),
  autoUpgrade("auto-archer-double", "archer", "연타", "세 번째 화살", "궁수가 매 턴 3회 사격한다.", () => {
    autoPermanent("archer").autoShots = Math.max(autoPermanent("archer").autoShots ?? 2, 3);
  }, { requiresAny: ["auto-archer-repeat", "auto-archer-damage"] }),
  autoUpgrade("auto-archer-triple", "archer", "연타", "끝없는 연사", "궁수가 매 턴 4회 사격한다.", () => {
    autoPermanent("archer").autoShots = Math.max(autoPermanent("archer").autoShots ?? 2, 4);
  }, { requires: ["auto-archer-double"] }),
  autoUpgrade("auto-archer-trap", "archer", "함정", "공격 함정", "궁수가 3턴마다 적 진입 경로에 공격 함정을 설치한다.", () => {
    autoPermanent("archer").autoTrapEvery = 3;
    autoPermanent("archer").autoTrapCount = Math.max(autoPermanent("archer").autoTrapCount ?? 1, 1);
  }),
  autoUpgrade("auto-archer-trap-polish", "archer", "함정", "함정 손질", "함정 위력이 증가하고, 함정 발동 후 다음 사격 피해가 오른다.", () => {
    autoPermanent("archer").autoTrapPower = (autoPermanent("archer").autoTrapPower ?? 2) + 1;
    autoPermanent("archer").trapNextAttackDamage = (autoPermanent("archer").trapNextAttackDamage ?? 0) + 0.35;
  }, { requires: ["auto-archer-trap"] }),
  autoUpgrade("auto-archer-spike-path", "archer", "함정", "가시 길목", "함정 설치 수가 1 증가한다.", () => {
    autoPermanent("archer").autoTrapCount = (autoPermanent("archer").autoTrapCount ?? 1) + 1;
  }, { requires: ["auto-archer-trap"] }),
  autoUpgrade("auto-archer-chain-trap", "archer", "함정", "연쇄 함정", "함정이 발동하면 주변 적에게도 피해를 준다.", () => {
    autoPermanent("archer").trapChainDamage = Math.max(autoPermanent("archer").trapChainDamage ?? 0, 2);
  }, { requires: ["auto-archer-trap-polish"] }),

  autoUpgrade("auto-warrior-damage", "warrior", "공용", "강한 베기", "전사 기본 공격력이 25% 증가한다.", () => {
    increaseAutoHeroBaseAtkPercent("warrior", 0.25);
  }),
  autoUpgrade("auto-warrior-frontline", "warrior", "공용", "전열 유지", "전사가 매 턴 받는 피해 감소 효과를 얻고, 낮은 체력 아군 근처의 적을 더 우선한다.", () => {
    autoPermanent("warrior").autoProtect = true;
    applyEffect(autoHero("warrior"), {
      type: "applyEffect",
      label: "전열 유지",
      duration: "stage",
      modifiers: [{ stat: "damageTaken", amount: -0.15 }],
    });
  }),
  autoUpgrade("auto-warrior-push", "warrior", "돌진", "방패 밀치기", "전사 공격이 적을 1칸 밀친다.", () => {
    autoPermanent("warrior").autoPush = (autoPermanent("warrior").autoPush ?? 0) + 1;
  }),
  autoUpgrade("auto-warrior-breakthrough", "warrior", "돌진", "돌파", "전사의 자동 접근 이동력이 1 증가하고 근접 피해가 15% 증가한다.", () => {
    autoPermanent("warrior").autoMoveBonus = (autoPermanent("warrior").autoMoveBonus ?? 0) + 1;
    autoPermanent("warrior").moveAttackDamage = (autoPermanent("warrior").moveAttackDamage ?? 0) + 0.15;
  }),
  autoUpgrade("auto-warrior-comet", "warrior", "돌진", "전장의 혜성", "전사가 3칸 이상 이동 후 공격하면 밀침이 1 증가하고 추가 피해를 준다.", () => {
    autoPermanent("warrior").autoComet = true;
    autoPermanent("warrior").autoPush = (autoPermanent("warrior").autoPush ?? 0) + 1;
  }, { requiresAny: ["auto-warrior-push", "auto-warrior-breakthrough"] }),
  autoUpgrade("auto-warrior-cleave", "warrior", "범위 공격", "넓은 휩쓸기", "전사가 근접한 적을 최대 2명까지 공격한다.", () => {
    autoPermanent("warrior").autoCleaveTargets = Math.max(autoPermanent("warrior").autoCleaveTargets ?? 1, 2);
  }),
  autoUpgrade("auto-warrior-collapse", "warrior", "범위 공격", "전열 붕괴", "전사가 적을 밀칠 때 다음 공격 피해가 증가한다.", () => {
    autoPermanent("warrior").pushAreaDamage = (autoPermanent("warrior").pushAreaDamage ?? 0) + 0.25;
  }, { requires: ["auto-warrior-push"] }),
  autoUpgrade("auto-warrior-control", "warrior", "범위 공격", "전장 장악", "전사가 근접한 적을 최대 3명까지 공격한다.", () => {
    autoPermanent("warrior").autoCleaveTargets = Math.max(autoPermanent("warrior").autoCleaveTargets ?? 1, 3);
  }, { requires: ["auto-warrior-cleave"] }),
  autoUpgrade("auto-warrior-blood", "warrior", "광전", "피의 박자", "전사 체력이 낮을수록 피해가 증가한다.", () => {
    autoPermanent("warrior").berserkLostHpDamage = (autoPermanent("warrior").berserkLostHpDamage ?? 0) + 0.65;
  }),
  autoUpgrade("auto-warrior-berserk", "warrior", "광전", "광전 태세", "전사 체력이 절반 이하이면 자동 공격을 한 번 더 한다.", () => {
    autoPermanent("warrior").autoBerserkExtra = true;
  }, { requires: ["auto-warrior-blood"] }),
  autoUpgrade("auto-warrior-storm", "warrior", "광전", "피의 폭풍", "전사가 4턴마다 주변 다중 타격을 한다.", () => {
    autoPermanent("warrior").autoBloodStormEvery = 4;
  }, { requiresAny: ["auto-warrior-berserk", "auto-warrior-cleave"] }),

  autoUpgrade("auto-mage-damage", "mage", "공용", "안정된 마력", "마법사 기본 공격력이 25% 증가한다.", () => {
    increaseAutoHeroBaseAtkPercent("mage", 0.25);
  }),
  autoUpgrade("auto-mage-retreat", "mage", "공용", "마력 위치 조정", "마법사의 자동 이동 거리가 1 증가한다.", () => {
    autoPermanent("mage").autoMoveBonus = (autoPermanent("mage").autoMoveBonus ?? 0) + 1;
  }),
  autoUpgrade("auto-mage-chain", "mage", "연쇄", "연쇄 마력탄", "마법사가 최대 2명의 적을 공격한다.", () => {
    autoPermanent("mage").autoChainTargets = Math.max(autoPermanent("mage").autoChainTargets ?? 1, 2);
  }),
  autoUpgrade("auto-mage-three-chain", "mage", "연쇄", "세 갈래 번개", "마법사가 최대 3명의 적을 공격한다.", () => {
    autoPermanent("mage").autoChainTargets = Math.max(autoPermanent("mage").autoChainTargets ?? 1, 3);
  }, { requires: ["auto-mage-chain"] }),
  autoUpgrade("auto-mage-circuit", "mage", "연쇄", "무한 회로", "다중 대상 마법 피해가 증가한다.", () => {
    autoPermanent("mage").multiTargetDamage = (autoPermanent("mage").multiTargetDamage ?? 0) + 0.25;
  }, { requires: ["auto-mage-three-chain"] }),
  autoUpgrade("auto-mage-rune", "mage", "룬", "폭발 룬", "마법사가 3턴마다 룬을 설치한다.", () => {
    autoPermanent("mage").autoRuneEvery = 3;
    autoPermanent("mage").autoRuneCount = Math.max(autoPermanent("mage").autoRuneCount ?? 1, 1);
  }),
  autoUpgrade("auto-mage-rune-tune", "mage", "룬", "룬 조율", "룬 위력이 증가하고 룬 보유 중 원거리 피해가 증가한다.", () => {
    autoPermanent("mage").autoRunePower = (autoPermanent("mage").autoRunePower ?? 1) + 1;
    autoPermanent("mage").runeDamage = (autoPermanent("mage").runeDamage ?? 0) + 0.1;
  }, { requires: ["auto-mage-rune"] }),
  autoUpgrade("auto-mage-rune-link", "mage", "룬", "룬 연동", "룬이 발동하면 주변 적에게도 피해를 준다.", () => {
    autoPermanent("mage").runeChainDamage = Math.max(autoPermanent("mage").runeChainDamage ?? 0, 1);
  }, { requires: ["auto-mage-rune-tune"] }),
  autoUpgrade("auto-mage-meteor", "mage", "운석", "운석 예고", "마법사가 4턴마다 운석을 예고한다.", () => {
    autoPermanent("mage").autoMeteorEvery = 4;
  }),
  autoUpgrade("auto-mage-shard", "mage", "운석", "파편 회수", "운석이 2명 이상 맞히면 다음 운석 피해가 증가한다.", () => {
    autoPermanent("mage").meteorMultiDamage = (autoPermanent("mage").meteorMultiDamage ?? 0) + 0.25;
  }, { requires: ["auto-mage-meteor"] }),
  autoUpgrade("auto-mage-sky", "mage", "운석", "하늘 붕괴", "운석 피해와 범위가 증가한다.", () => {
    autoPermanent("mage").autoMeteorMultBonus = (autoPermanent("mage").autoMeteorMultBonus ?? 0) + 1;
    autoPermanent("mage").autoMeteorRadius = Math.max(autoPermanent("mage").autoMeteorRadius ?? 1, 2);
  }, { requires: ["auto-mage-shard"] }),

  autoUpgrade("auto-party-mark-break", "party", "궁수+전사", "표식 돌파", "전사가 표식 적을 공격하면 추가 피해와 밀침을 얻는다.", () => {
    state.autoSynergy.markBreak = true;
  }, { requires: ["auto-archer-mark", "auto-warrior-push"] }),
  autoUpgrade("auto-party-mark-conduct", "party", "궁수+마법사", "표식 전도", "마법사가 표식 적에게 주는 피해가 증가하고 표식이 오래 유지된다.", () => {
    state.autoSynergy.markConduct = true;
  }, { requires: ["auto-archer-mark", "auto-mage-chain"] }),
  autoUpgrade("auto-party-burning-trap", "party", "궁수+마법사", "불타는 함정", "함정과 룬이 더 강하게 발동한다.", () => {
    state.autoSynergy.burningTrap = true;
    autoPermanent("archer").autoTrapPower = (autoPermanent("archer").autoTrapPower ?? 2) + 1;
    autoPermanent("mage").autoRunePower = (autoPermanent("mage").autoRunePower ?? 1) + 1;
  }, { requiresAny: ["auto-archer-trap", "auto-mage-rune"] }),
  autoUpgrade("auto-party-collision", "party", "전사+마법사", "충돌 폭발", "전사가 적을 밀칠 때 다음 마법 피해가 증가한다.", () => {
    state.autoSynergy.collisionBurst = true;
    autoPermanent("warrior").pushAreaDamage = (autoPermanent("warrior").pushAreaDamage ?? 0) + 0.2;
  }, { requires: ["auto-warrior-push"] }),
  autoUpgrade("auto-party-rune-dash", "party", "전사+마법사", "룬 돌진", "전사가 밀친 적을 따라 룬 전투가 강해진다.", () => {
    state.autoSynergy.runeDash = true;
    autoPermanent("mage").runeDamage = (autoPermanent("mage").runeDamage ?? 0) + 0.15;
  }, { requires: ["auto-warrior-push", "auto-mage-rune"] }),
  autoUpgrade("auto-party-encircle", "party", "3인", "포위 완성", "표식, 밀침, 마법 피해가 모두 연결되면 파티 전체 피해가 증가한다.", () => {
    state.autoSynergy.encircle = true;
    playerPartyCharacters().forEach((character) => {
      autoPermanent(character.id).autoPartyDamage = (autoPermanent(character.id).autoPartyDamage ?? 0) + 0.15;
    });
  }, { requiresAny: ["auto-party-mark-break", "auto-party-mark-conduct", "auto-party-rune-dash"] }),
];

let state;

function getSelectedCharacter() {
  return characterDefinitions[selectedCharacterId] ?? characterDefinitions.archer;
}

function characterForActorId(actorId) {
  const entity = state?.entities?.find((item) => item.id === actorId);
  return characterDefinitions[entity?.characterId] ?? characterDefinitions[actorId] ?? getSelectedCharacter();
}

function autoUpgrade(id, owner, route, name, desc, apply, options = {}) {
  return { id, owner, route, name, desc, apply, ...options };
}

function autoHero(id) {
  return state.entities.find((entity) => entity.side === "player" && entity.characterId === id);
}

function autoPermanent(id) {
  const actor = autoHero(id);
  if (!actor) return {};
  actor.permanent = actor.permanent ?? {};
  return actor.permanent;
}

function increaseAutoHeroBaseAtkPercent(id, percent) {
  const actor = autoHero(id);
  if (!actor) return;
  actor.baseAtk += Math.max(1, Math.round(actor.baseAtk * percent));
}

function card(id, name, route, rarity, priority, actions, copies = 1) {
  return { id, name, route, rarity, type: "기본", priority, actions, copies };
}

async function newRun() {
  state?.planResolver?.();
  clearPlannerDrag();
  const renderToken = ++rewardRenderToken;
  const character = getSelectedCharacter();
  const partyCharacters = playerPartyCharacters();
  const playerCardPiles = createInitialPlayerCardPiles(partyCharacters);
  const primaryPile = playerCardPiles[character.id] ?? Object.values(playerCardPiles)[0];
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
    playerCards: primaryPile?.cards ?? expandCards(character.baseCards),
    playerCardPiles,
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
    cameraFocusReady: false,
    cameraFollowToken: 0,
    cameraPanelWidth: 0,
    cameraPanelHeight: 0,
    cameraX: 0,
    cameraY: 0,
    cameraScale: 0,
    cameraDrag: null,
    cameraDeadZoneSuppressed: false,
    entityFacingTargets: new Map(),
    offscreenIndicatorElements: new Map(),
    offscreenIndicatorFrame: 0,
    pendingOffscreenBounds: null,
    boardTileSignature: "",
    boardTileElements: new Map(),
    priorityStripSignature: "",
    priorityStripItems: new Map(),
    rewardLocked: false,
    preStartReward: false,
    rewardPhase: "passive",
    passiveCards: [],
    autoMode: AUTO_ROUTINE_MODE,
    autoUpgrades: [],
    autoPickedUpgradeIds: new Set(),
    autoSynergy: {},
    rewardPickCount: 0,
    rewardTags: new Set(),
    rewardRouteCounts: {},
    pickedRewardIds: new Set(),
    turnPlanning: false,
    planningChoices: [],
    plannedCardKeys: [],
    enemyPlanEntries: [],
    enemyTargetIds: {},
    focusTargetId: null,
    planResolver: null,
    log: [],
    speedMultiplier,
    suppressPlayerCard: false,
  };

  startWave(0);
  log(`${character.name} 새 런을 시작했다.`);
  if (AUTO_ROUTINE_MODE) {
    log("자동 루틴 전투: 전투 중 선택 없이 영웅들이 고정 행동을 수행합니다.");
    render();
    preloadRewardAssets(character);
    scheduleTurn();
    return;
  }
  state.waitingReward = true;
  state.preStartReward = true;
  state.rewardPhase = "passive";
  render();
  await preloadRewardAssets(character);
  if (renderToken !== rewardRenderToken) return;
  showRewards();
}

function startWave(index) {
  clearPlannerDrag();
  const wave = waves[index];
  const partyCharacters = playerPartyCharacters();
  const previousPlayers = new Map(
    state.entities
      .filter((entity) => entity.side === "player")
      .map((entity) => [entity.characterId ?? entity.id, entity]),
  );
  state.turn = 0;
  state.tiles = makeMap(wave.radius ?? 3);
  state.walls = wave.walls.map((item) => ({ ...item }));
  state.obstacles = [];
  state.meteors = [];
  state.boardTileSignature = "";
  state.boardTileElements = new Map();
  state.priorityStripSignature = "";
  state.priorityStripItems = new Map();
  state.cameraMode = "overview";
  state.cameraTransitionScheduled = false;
  state.cameraFocusReady = false;
  state.cameraFollowToken = (state.cameraFollowToken ?? 0) + 1;
  clearOffscreenEnemyIndicators();
  if (state.offscreenIndicatorFrame && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(state.offscreenIndicatorFrame);
  }
  state.cameraPanelWidth = 0;
  state.cameraPanelHeight = 0;
  state.cameraX = 0;
  state.cameraY = 0;
  state.cameraScale = 0;
  state.cameraDrag = null;
  state.cameraDeadZoneSuppressed = false;
  state.offscreenIndicatorElements = new Map();
  state.offscreenIndicatorFrame = 0;
  state.pendingOffscreenBounds = null;
  const start = wave.playerStart ?? { q: 0, r: Math.min(2, (wave.radius ?? 3) - 1) };
  const playerStarts = playerStartPositions(start, partyCharacters.length);
  state.entities = partyCharacters.map((partyCharacter, partyIndex) => (
    createPlayerEntity(
      partyCharacter,
      playerStarts[partyIndex] ?? start,
      previousPlayers.get(partyCharacter.id),
    )
  ));

  wave.enemies.forEach((enemy) => {
    const indexNumber = state.nextEnemyIndex++;
    const kind = enemy.kind ?? "brute";
    const monster = monsterDefinitions[kind] ?? monsterDefinitions.brute;
    const balancedStats = enemyBattleStats(enemy, monster, state.waveIndex);
    state.entities.push({
      id: `enemy-${indexNumber}`,
      name: enemy.name ?? (enemy.boss ? `보스 ${indexNumber}` : `${monster.name} ${indexNumber}`),
      side: "enemy",
      kind,
      label: enemy.boss ? "보" : enemy.elite ? "정" : monster.label,
      q: enemy.q,
      r: enemy.r,
      hp: balancedStats.hp,
      maxHp: balancedStats.hp,
      baseAtk: balancedStats.baseAtk,
      baseRange: enemy.baseRange ?? monster.baseRange,
      baseMove: enemy.baseMove ?? monster.baseMove,
      monsterIndex: indexNumber,
      boss: Boolean(enemy.boss),
      elite: Boolean(enemy.elite),
      charge: 0,
      permanent: {},
      temporary: {},
      effects: [],
      sustainedCards: [],
    });
  });

  ensurePlayerCardPiles(partyCharacters);
  resetPlayerDecksForWave(partyCharacters);
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
  state.turnPlanning = false;
  state.planningChoices = [];
  state.plannedCardKeys = [];
  state.enemyPlanEntries = [];
  state.enemyTargetIds = {};
  state.focusTargetId = firstAliveEnemyId();
  state.planResolver = null;
}

function playerPartyCharacters() {
  return testPlayerPartyIds
    .map((id) => characterDefinitions[id])
    .filter(Boolean);
}

function createInitialPlayerCardPiles(characters) {
  return Object.fromEntries(
    characters.map((character) => [character.id, createPlayerCardPile(character)]),
  );
}

function createPlayerCardPile(character) {
  return {
    cards: expandCards(character.baseCards),
    deck: [],
    discard: [],
  };
}

function ensurePlayerCardPiles(characters = playerPartyCharacters()) {
  if (!state) return;
  state.playerCardPiles = state.playerCardPiles ?? {};
  characters.forEach((character) => {
    state.playerCardPiles[character.id] = state.playerCardPiles[character.id] ?? createPlayerCardPile(character);
  });
  syncLegacyPlayerCardFields();
}

function resetPlayerDecksForWave(characters = playerPartyCharacters()) {
  ensurePlayerCardPiles(characters);
  characters.forEach((character) => {
    const pile = state.playerCardPiles?.[character.id];
    if (!pile) return;
    pile.deck = shuffle([...(pile.cards ?? [])]);
    pile.discard = [];
  });
  syncLegacyPlayerCardFields();
}

function resolvePlayerActorId(actorOrId = null) {
  if (typeof actorOrId === "string") return actorOrId;
  if (actorOrId?.id) return actorOrId.id;
  return getPlayer()?.id ?? playerPartyCharacters()[0]?.id ?? selectedCharacterId;
}

function playerCardPile(actorOrId = null) {
  const actorId = resolvePlayerActorId(actorOrId);
  if (!actorId) return null;
  ensurePlayerCardPiles();
  const character = characterDefinitions[actorId] ?? characterDefinitions[state?.entities?.find((entity) => entity.id === actorId)?.characterId];
  if (!state.playerCardPiles[actorId] && character) {
    state.playerCardPiles[actorId] = createPlayerCardPile(character);
    syncLegacyPlayerCardFields();
  }
  return state.playerCardPiles?.[actorId] ?? null;
}

function playerDiscardPile(actorOrId = null) {
  return playerCardPile(actorOrId)?.discard ?? state.discard;
}

function syncLegacyPlayerCardFields() {
  if (!state?.playerCardPiles) return;
  const piles = Object.values(state.playerCardPiles);
  state.deck = piles.flatMap((pile) => pile.deck ?? []);
  state.discard = piles.flatMap((pile) => pile.discard ?? []);
  const primaryPile = state.playerCardPiles[rewardOwnerId()] ?? piles[0];
  if (primaryPile) state.playerCards = primaryPile.cards ?? [];
}

function totalPlayerDeckCount() {
  return Object.values(state?.playerCardPiles ?? {})
    .reduce((sum, pile) => sum + (pile.deck?.length ?? 0), 0);
}

function totalPlayerDiscardCount() {
  return Object.values(state?.playerCardPiles ?? {})
    .reduce((sum, pile) => sum + (pile.discard?.length ?? 0), 0);
}

function rewardOwnerId() {
  const party = playerPartyCharacters();
  if (party.some((character) => character.id === selectedCharacterId)) return selectedCharacterId;
  return getPlayer()?.id ?? party[0]?.id ?? selectedCharacterId;
}

function addPlayerOwnedCard(cardData, actorOrId = rewardOwnerId()) {
  const pile = playerCardPile(actorOrId);
  if (!pile || !cardData) return;
  pile.cards = pile.cards ?? [];
  pile.cards.push(cardData);
  syncLegacyPlayerCardFields();
}

function addPlayerCardToDeck(cardData, actorOrId = rewardOwnerId(), options = {}) {
  const pile = playerCardPile(actorOrId);
  if (!pile || !cardData) return;
  pile.deck = pile.deck ?? [];
  if (options.top) pile.deck.unshift(cardData);
  else if (options.shuffle) pile.deck = shuffle([...pile.deck, cardData]);
  else pile.deck.push(cardData);
  syncLegacyPlayerCardFields();
}

function createPlayerEntity(character, position, previousPlayer = null) {
  return {
    id: character.id,
    characterId: character.id,
    name: character.name,
    label: character.shortLabel,
    side: "player",
    q: position.q,
    r: position.r,
    hp: previousPlayer?.hp ?? character.maxHp,
    maxHp: previousPlayer?.maxHp ?? character.maxHp,
    baseAtk: previousPlayer?.baseAtk ?? autoBaseAtkForCharacter(character),
    baseRange: character.baseRange,
    baseMove: AUTO_ROUTINE_MODE && character.id === "mage" ? 1 : character.baseMove,
    charge: 0,
    permanent: { ...(previousPlayer?.permanent ?? {}) },
    temporary: {},
    effects: (previousPlayer?.effects ?? []).filter((effect) => effect.duration === "stage"),
    sustainedCards: [],
  };
}

function autoBaseAtkForCharacter(character) {
  if (AUTO_ROUTINE_MODE && character.id === "archer") return 5;
  return character.baseAtk;
}

function playerStartPositions(start, count) {
  const candidates = [
    start,
    { q: start.q - 1, r: start.r },
    { q: start.q + 1, r: start.r - 1 },
    { q: start.q, r: start.r - 1 },
    { q: start.q - 1, r: start.r + 1 },
    { q: start.q + 1, r: start.r },
  ];
  const positions = [];
  const seen = new Set();
  candidates.forEach((candidate) => {
    const key = hexKey(candidate);
    if (positions.length >= count || seen.has(key)) return;
    if (!isTile(candidate) || isWall(candidate) || isObstacle(candidate)) return;
    seen.add(key);
    positions.push(candidate);
  });
  while (positions.length < count) positions.push(start);
  return positions;
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
    wave(3, [{ q: 0, r: 0 }], [
      enemy(-2, -1, 5, { baseAtk: 2 }),
      enemy(2, -2, 5, { kind: "skirmisher", baseAtk: 2 }),
    ]),
    wave(3, [{ q: 0, r: 0 }], [
      enemy(-3, 0, 6, { baseAtk: 2 }),
      enemy(3, -2, 6, { kind: "skirmisher", baseAtk: 2 }),
      enemy(1, -3, 6, { kind: "shooter", baseAtk: 2 }),
    ]),
    wave(4, [{ q: 0, r: 0 }, { q: -1, r: 1 }], [
      enemy(-3, 1, 9, { baseAtk: 2 }),
      enemy(3, -2, 9, { kind: "skirmisher", baseAtk: 2 }),
      enemy(0, -4, 8, { kind: "shooter", baseAtk: 2 }),
    ]),
    wave(4, [{ q: 0, r: -1 }, { q: 1, r: -1 }], [
      enemy(-4, 1, 9, { baseAtk: 2 }),
      enemy(-2, -2, 9, { kind: "shooter", baseAtk: 2 }),
      enemy(3, -3, 10, { kind: "skirmisher", baseAtk: 2 }),
    ]),
    wave(4, [{ q: -1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: 1 }], [
      enemy(0, -4, 18, { boss: true, name: "보스 1", baseAtk: 2 }),
      enemy(3, -2, 12, { kind: "shooter", baseAtk: 2 }),
    ]),
    wave(4, [{ q: 0, r: 0 }, { q: -2, r: 2 }], [
      enemy(-4, 2, 16, { baseAtk: 3 }),
      enemy(-2, -2, 16, { kind: "shooter", baseAtk: 2 }),
      enemy(2, -4, 16, { kind: "skirmisher", baseAtk: 2 }),
      enemy(4, -2, 16, { baseAtk: 3 }),
    ]),
    wave(5, [{ q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -2 }], [
      enemy(-4, 3, 78, { name: "정예 브루트", baseAtk: 1, elite: true }),
      enemy(-5, 2, 27, { baseAtk: 3 }),
      enemy(-3, -1, 26, { kind: "skirmisher", baseAtk: 2 }),
      enemy(0, -5, 27, { kind: "shooter", baseAtk: 2 }),
    ]),
    wave(5, [{ q: -2, r: 1 }, { q: 0, r: 0 }, { q: 2, r: -2 }], [
      enemy(-4, 2, 90, { kind: "skirmisher", name: "정예 척후병", baseAtk: 1, elite: true }),
      enemy(-5, 3, 40, { kind: "skirmisher", baseAtk: 2 }),
      enemy(0, -5, 42, { kind: "shooter", baseAtk: 2 }),
    ]),
    wave(5, [{ q: -1, r: 1 }, { q: 1, r: -1 }, { q: 2, r: -3 }], [
      enemy(-4, 2, 82, { kind: "shooter", name: "정예 사수", baseAtk: 2, elite: true }),
      enemy(-5, 1, 34),
      enemy(-3, -2, 28, { kind: "skirmisher" }),
      enemy(0, -5, 28, { kind: "shooter" }),
      enemy(2, -5, 28, { kind: "skirmisher" }),
      enemy(3, -4, 28, { kind: "shooter" }),
      enemy(5, -3, 28, { kind: "skirmisher" }),
      enemy(4, 0, 34),
    ]),
    wave(5, [{ q: -2, r: 2 }, { q: 0, r: 0 }, { q: 2, r: -2 }, { q: 1, r: 1 }], [
      enemy(0, -5, 110, { boss: true, name: "보스 2", baseAtk: 6 }),
      enemy(-4, 1, 30, { kind: "skirmisher" }),
      enemy(-2, -2, 28, { kind: "skirmisher" }),
      enemy(2, -4, 28, { kind: "shooter" }),
      enemy(4, -3, 30, { kind: "shooter" }),
      enemy(5, -1, 34),
    ]),
    wave(5, [{ q: -1, r: 0 }, { q: 0, r: 1 }, { q: 1, r: -2 }], [
      enemy(-4, 2, 88, { name: "정예 브루트", baseAtk: 2, elite: true }),
      enemy(-5, 3, 42),
      enemy(-4, -1, 36, { kind: "skirmisher" }),
      enemy(-1, -4, 36, { kind: "shooter" }),
      enemy(1, -5, 34, { kind: "skirmisher" }),
      enemy(2, -5, 36, { kind: "shooter" }),
      enemy(5, -3, 36, { kind: "skirmisher" }),
      enemy(5, 0, 42),
    ]),
    wave(6, [{ q: -2, r: 1 }, { q: -1, r: 2 }, { q: 1, r: -1 }, { q: 2, r: -3 }], [
      enemy(-5, 3, 96, { kind: "skirmisher", name: "정예 척후병", baseAtk: 2, elite: true }),
      enemy(-6, 3, 38),
      enemy(-5, 0, 32, { kind: "skirmisher" }),
      enemy(-2, -4, 32, { kind: "shooter" }),
      enemy(0, -6, 30, { kind: "skirmisher" }),
      enemy(1, -6, 32, { kind: "shooter" }),
      enemy(4, -6, 34),
      enemy(5, -5, 32, { kind: "skirmisher" }),
      enemy(6, -2, 38),
    ]),
    wave(6, [{ q: -2, r: 2 }, { q: 0, r: 0 }, { q: 2, r: -2 }, { q: 3, r: -4 }], [
      enemy(-5, 2, 104, { kind: "shooter", name: "정예 사수", baseAtk: 2, elite: true }),
      enemy(-6, 2, 40),
      enemy(-5, -1, 34, { kind: "skirmisher" }),
      enemy(-3, -3, 32, { kind: "shooter" }),
      enemy(-2, -4, 34, { kind: "shooter" }),
      enemy(1, -6, 32, { kind: "skirmisher" }),
      enemy(2, -6, 34, { kind: "shooter" }),
      enemy(5, -5, 34, { kind: "skirmisher" }),
      enemy(6, -3, 40),
      enemy(4, 1, 40),
    ]),
    wave(6, [{ q: -3, r: 2 }, { q: -1, r: 1 }, { q: 1, r: -1 }, { q: 3, r: -3 }], [
      enemy(-5, 4, 110, { name: "정예 브루트", baseAtk: 2, elite: true }),
      enemy(-6, 4, 42),
      enemy(-6, 1, 36, { kind: "skirmisher" }),
      enemy(-4, -1, 34, { kind: "shooter" }),
      enemy(-3, -3, 36, { kind: "shooter" }),
      enemy(0, -6, 36, { kind: "shooter" }),
      enemy(3, -6, 34, { kind: "skirmisher" }),
      enemy(4, -6, 36, { kind: "skirmisher" }),
      enemy(6, -4, 42),
      enemy(6, -1, 42),
    ]),
    wave(6, [{ q: -2, r: 2 }, { q: 0, r: 0 }, { q: 2, r: -2 }, { q: 1, r: 1 }, { q: -1, r: -1 }], [
      enemy(0, -6, 160, { boss: true, name: "최종 보스", baseAtk: 7 }),
      enemy(-6, 2, 38, { kind: "skirmisher" }),
      enemy(-4, -1, 38, { kind: "shooter" }),
      enemy(-2, -4, 34, { kind: "shooter" }),
      enemy(2, -6, 34, { kind: "skirmisher" }),
      enemy(4, -5, 38, { kind: "skirmisher" }),
      enemy(5, -4, 36),
      enemy(6, -3, 42),
    ]),
  ];
}

function wave(radius, walls, enemies) {
  return { radius, playerStart: { q: 0, r: Math.min(2, radius - 1) }, walls, enemies, boss: enemies.some((item) => item.boss) };
}

function enemy(q, r, hp, options = {}) {
  return { q, r, hp, ...options };
}

function enemyBattleStats(enemyData, monster, waveIndex) {
  const baseHp = enemyData.hp;
  const baseAtk = enemyData.baseAtk ?? (enemyData.boss ? 5 : monster.baseAtk);
  if (!AUTO_ROUTINE_MODE) return { hp: baseHp, baseAtk };

  const tier = autoEnemyBalanceTier(waveIndex + 1);
  const roleMultiplier = enemyData.boss
    ? tier.bossHpMultiplier ?? 1
    : enemyData.elite
      ? tier.eliteHpMultiplier ?? 1
      : 1;
  const hp = Math.max(
    tier.minHp ?? 1,
    Math.round(baseHp * tier.hpMultiplier * roleMultiplier),
  );
  const attack = Math.max(
    1,
    Math.round(baseAtk * (tier.attackMultiplier ?? 1) + (tier.attackBonus ?? 0)),
  );
  return { hp, baseAtk: attack };
}

function autoEnemyBalanceTier(waveNumber) {
  return AUTO_ENEMY_BALANCE_TIERS.find((tier) => waveNumber <= tier.maxWave)
    ?? AUTO_ENEMY_BALANCE_TIERS[AUTO_ENEMY_BALANCE_TIERS.length - 1];
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
  if (AUTO_ROUTINE_MODE) {
    await runAutoRoutineTurn();
    return;
  }
  if (state.paused || state.busy || state.waitingReward || state.finished) return;
  const turnState = state;
  state.busy = true;
  state.turn += 1;
  state.activeTimelineIndex = -1;
  state.comboHits = {};
  processMeteors();
  if (checkEndConditions()) {
    state.busy = false;
    return;
  }

  const players = alivePlayers();
  const player = players[0];
  if (!player) {
    finishRun(false);
    return;
  }

  await playTurnStart();

  const playerChoices = drawPlayerTurnEntries(players);
  const enemyEntries = drawEnemyPlanEntries();
  state.planningChoices = playerChoices;
  state.enemyPlanEntries = enemyEntries;
  state.plannedCardKeys = defaultPlannedCardKeys(playerChoices);
  state.focusTargetId = currentFocusTargetId();
  state.turnPlanning = true;
  state.currentTimeline = plannedPlayerEntriesFromState().concat(enemyEntries);
  assignPlanOrders(state.currentTimeline);
  state.priorityRevealMode = "";
  state.activeTimelineIndex = -1;
  state.completedTimelineCount = 0;
  state.completedTimelineIndexes = new Set();
  state.suppressPlayerCard = false;
  log(`턴 ${state.turn}: 계획 선택`);
  render();
  await waitForTurnPlan();
  if (state !== turnState) return;
  if (state.finished || state.waitingReward) {
    state.busy = false;
    return;
  }

  const plannedPlayerEntries = plannedPlayerEntriesFromState();
  const skippedPlayerEntries = playerChoices
    .filter((entry) => !state.plannedCardKeys.includes(cardRuntimeKey(entry.card)));
  state.turnPlanning = false;
  state.planningChoices = [];
  state.planResolver = null;
  const entries = plannedPlayerEntries.concat(enemyEntries);
  assignPlanOrders(entries);
  state.currentTimeline = entries;
  render();

  for (let index = 0; index < entries.length; index += 1) {
    if (state.finished || state.waitingReward) break;
    const entry = entries[index];
    state.activeTimelineIndex = index;
    document.body.classList.toggle("player-acting", entry.actorType === "player");
    releaseManualCameraPanForPlayerTurn(entry);
    renderPriorityStrip();
    renderEnemyActionHud();
    renderPlayerHud();
    renderBoard();
    renderDrawnCards();
    renderTimeline(index);
    await playTurnCue(entry, index);
    await executeTimelineEntry(entry);
    expireTurnEndEffects(entry);
    state.completedTimelineIndexes.add(index);
    state.completedTimelineCount = Math.max(state.completedTimelineCount, index + 1);
    state.activeTimelineIndex = -1;
    document.body.classList.remove("player-acting");
    renderPriorityStrip();
    renderEnemyActionHud();
    renderPlayerHud();
    renderBoard();
    renderDrawnCards();
    renderTimeline();
    await sleep(turnDelay());
    if (checkEndConditions()) break;
  }

  if (!state.waitingReward && !state.finished) {
    plannedPlayerEntries.forEach((entry) => {
      const actor = state.entities.find((entity) => entity.id === entry.actorId) ?? player;
      discardResolvedCard(entry.card, actor);
    });
    skippedPlayerEntries.forEach((entry) => discardSkippedPlayerCard(entry.card, entry.actorId));
    enemyEntries.forEach((entry) => discardEnemyCard(entry.card, entry.actorId));
  }
  state.focusTargetId = currentFocusTargetId();
  state.busy = false;
  render();
  scheduleTurn();
}

async function runAutoRoutineTurn() {
  if (state.paused || state.busy || state.waitingReward || state.finished) return;
  const turnState = state;
  state.busy = true;
  state.turn += 1;
  state.activeTimelineIndex = -1;
  state.comboHits = {};
  processMeteors();
  if (checkEndConditions()) {
    state.busy = false;
    return;
  }

  await playTurnStart();
  if (state !== turnState || state.finished || state.waitingReward) {
    state.busy = false;
    return;
  }

  const playerEntries = alivePlayers().map((actor, index) => ({
    actorType: "player",
    actorId: actor.id,
    card: autoRoutineCard(actor),
    playIndex: index,
  }));
  const enemyEntries = autoEnemyPlanEntries();
  state.planningChoices = [];
  state.plannedCardKeys = [];
  state.enemyPlanEntries = enemyEntries;
  state.turnPlanning = false;
  state.currentTimeline = playerEntries.concat(enemyEntries);
  assignPlanOrders(state.currentTimeline);
  state.priorityRevealMode = "";
  state.activeTimelineIndex = -1;
  state.completedTimelineCount = 0;
  state.completedTimelineIndexes = new Set();
  state.suppressPlayerCard = false;
  state.focusTargetId = currentFocusTargetId();
  log(`턴 ${state.turn}: 자동 루틴`);
  render();
  await sleep(turnDelay(0.45));

  for (let index = 0; index < state.currentTimeline.length; index += 1) {
    if (state.finished || state.waitingReward) break;
    const entry = state.currentTimeline[index];
    state.activeTimelineIndex = index;
    document.body.classList.toggle("player-acting", entry.actorType === "player");
    releaseManualCameraPanForPlayerTurn(entry);
    renderPriorityStrip();
    renderEnemyActionHud();
    renderPlayerHud();
    renderBoard();
    renderDrawnCards();
    renderTimeline(index);
    await playTurnCue(entry, index);
    await executeTimelineEntry(entry);
    expireTurnEndEffects(entry);
    state.completedTimelineIndexes.add(index);
    state.completedTimelineCount = Math.max(state.completedTimelineCount, index + 1);
    state.activeTimelineIndex = -1;
    document.body.classList.remove("player-acting");
    renderPriorityStrip();
    renderEnemyActionHud();
    renderPlayerHud();
    renderBoard();
    renderDrawnCards();
    renderTimeline();
    await sleep(turnDelay());
    if (checkEndConditions()) break;
  }

  state.focusTargetId = currentFocusTargetId();
  state.busy = false;
  render();
  scheduleTurn();
}

function autoRoutineCard(actor) {
  if (actor.characterId === "archer") return autoArcherRoutineCard(actor);
  if (actor.characterId === "warrior") return autoWarriorRoutineCard(actor);
  if (actor.characterId === "mage") return autoMageRoutineCard(actor);
  return {
    ...card(`auto-${actor.id}-${state.turn}`, "자동 행동", "자동", "기본", 50, [
      { type: "move", amount: actor.baseMove, desiredRange: actor.baseRange },
      { type: "attack", mult: 1, range: actor.baseRange, melee: actor.baseRange <= 1 },
    ]),
    instanceId: `auto-${actor.id}-${state.turn}`,
  };
}

function autoArcherRoutineCard(actor) {
  const permanent = actor.permanent ?? {};
  const range = actor.baseRange + (permanent.autoRangeBonus ?? 0);
  const actions = [
    { type: "move", amount: 2 + (permanent.autoMoveBonus ?? 0), desiredRange: Math.max(2, range) },
  ];
  if (permanent.autoTrapEvery && state.turn % permanent.autoTrapEvery === 1) {
    actions.push({
      type: "placeTrap",
      range,
      trap: "attack",
      count: permanent.autoTrapCount ?? 1,
      power: permanent.autoTrapPower ?? 2,
    });
  }
  if (permanent.autoSnipeChargeMode) {
    const threshold = permanent.autoSnipeThreshold ?? 4;
    const currentCharge = actor.charge ?? 0;
    const chargeGain = permanent.autoSnipeChargeGain ?? 1;
    const missingCharge = Math.max(0, threshold - currentCharge);
    if (missingCharge > 0) {
      actions.push({
        type: "charge",
        amount: Math.min(chargeGain, missingCharge),
        lockMove: false,
      });
    }
    if (currentCharge + chargeGain >= threshold) {
      actions.push({
        type: "attack",
        mult: permanent.autoSnipeDamage ?? 4,
        range: Infinity,
        ignoreChargeBonus: true,
        resetChargeAfterAttack: true,
      });
    }
    return {
      ...card(`auto-archer-${state.turn}`, currentCharge + chargeGain >= threshold ? "자동 저격" : "자동 차지", "자동 루틴", "기본", 40, actions),
      instanceId: `auto-archer-${state.turn}`,
    };
  }
  const shots = permanent.autoShots ?? 2;
  for (let index = 0; index < shots; index += 1) {
    actions.push({
      type: "attack",
      mult: 1,
      range,
      preferPreviousTarget: index > 0,
      push: permanent.autoPush ?? 0,
    });
  }
  return {
    ...card(`auto-archer-${state.turn}`, shots >= 4 ? "자동 폭풍 사격" : shots >= 3 ? "자동 삼연사" : "자동 연속 사격", "자동 루틴", "기본", 40, actions),
    instanceId: `auto-archer-${state.turn}`,
  };
}

function autoWarriorRoutineCard(actor) {
  const permanent = actor.permanent ?? {};
  const actions = [
    { type: "move", amount: 3 + (permanent.autoMoveBonus ?? 0), desiredRange: 1 },
  ];
  const attack = {
    type: "attack",
    mult: 1 + (permanent.autoComet ? 0.35 : 0),
    range: 1,
    melee: true,
    push: permanent.autoPush ?? 0,
    targets: permanent.autoCleaveTargets ?? 1,
  };
  actions.push(attack);
  if (permanent.autoBerserkExtra && actor.hp <= actor.maxHp / 2) {
    actions.push({ ...attack, preferPreviousTarget: true });
  }
  if (permanent.autoBloodStormEvery && state.turn % permanent.autoBloodStormEvery === 0) {
    actions.push({ type: "patternAttack", mult: 1, range: 1, pattern: "adjacent-triple", melee: true });
  }
  return {
    ...card(`auto-warrior-${state.turn}`, "자동 돌진 베기", "자동 루틴", "기본", 50, actions),
    instanceId: `auto-warrior-${state.turn}`,
  };
}

function autoMageRoutineCard(actor) {
  const permanent = actor.permanent ?? {};
  const range = actor.baseRange + (permanent.autoRangeBonus ?? 0);
  const actions = [
    { type: "move", amount: 1 + (permanent.autoMoveBonus ?? 0), desiredRange: range },
  ];
  if (permanent.autoRuneEvery && state.turn % permanent.autoRuneEvery === 2) {
    actions.push({
      type: "placeRune",
      range,
      count: permanent.autoRuneCount ?? 1,
      power: permanent.autoRunePower ?? 1,
    });
  }
  if (permanent.autoMeteorEvery && state.turn % permanent.autoMeteorEvery === 0) {
    actions.push({
      type: "placeMeteor",
      range: range + 1,
      mult: 2 + (permanent.autoMeteorMultBonus ?? 0),
      radius: permanent.autoMeteorRadius ?? 1,
      delay: 1,
    });
  }
  actions.push({
    type: "attack",
    mult: 1,
    range,
    targets: permanent.autoChainTargets ?? 1,
  });
  return {
    ...card(`auto-mage-${state.turn}`, "자동 마력탄", "자동 루틴", "기본", 60, actions),
    instanceId: `auto-mage-${state.turn}`,
  };
}

function autoEnemyPlanEntries() {
  const entries = aliveEnemyKinds().map((kind) => {
    const cardData = autoEnemyRoutineCard(kind);
    return {
      actorType: "enemyGroup",
      actorId: kind,
      card: cardData,
      targetId: chooseEnemyGroupTarget(kind, cardData)?.id ?? null,
    };
  });
  state.enemyTargetIds = Object.fromEntries(entries.map((entry) => [entry.actorId, entry.targetId]));
  return entries;
}

function autoEnemyRoutineCard(kind) {
  const sample = aliveEnemies().find((enemy) => enemy.kind === kind);
  const definition = monsterDefinitions[kind] ?? monsterDefinitions.brute;
  const move = sample?.baseMove ?? definition.baseMove ?? 1;
  const range = sample?.baseRange ?? definition.baseRange ?? 1;
  const melee = range <= 1;
  const actions = [
    { type: "move", amount: move, desiredRange: range },
    { type: "attack", mult: 1, range, melee },
  ];
  return {
    ...card(`auto-enemy-${kind}-${state.turn}`, `${definition.name} 자동 행동`, "자동 루틴", "기본", 70, actions),
    instanceId: `auto-enemy-${kind}-${state.turn}`,
  };
}

function playerTurnDrawCount() {
  return playerTurnCardCount();
}

function playerTurnPlayLimit() {
  return playerTurnCardCount();
}

function drawPlayerTurnEntries(players = alivePlayers()) {
  const livePlayers = players.filter(isAlive);
  if (!livePlayers.length) return [];
  const entries = [];
  if (livePlayers.length === 1) {
    for (let index = 0; index < playerTurnCardCount(); index += 1) {
      const cardData = drawPlayerCard(livePlayers[0]);
      if (cardData) {
        entries.push({
          actorType: "player",
          actorId: livePlayers[0].id,
          card: cardData,
          playIndex: index,
        });
      }
    }
    return entries;
  }

  livePlayers.slice(0, playerTurnCardCount()).forEach((actor, index) => {
    const cardData = drawPlayerCard(actor);
    if (!cardData) return;
    entries.push({
      actorType: "player",
      actorId: actor.id,
      card: cardData,
      playIndex: index,
    });
  });
  return entries;
}

function playerTurnCardCount() {
  return playerPartySize() >= 3 ? 3 : 2;
}

function playerPartySize() {
  const players = state?.entities?.filter((entity) => entity.side === "player") ?? [];
  const alivePlayers = players.filter(isAlive);
  return Math.max(1, alivePlayers.length || players.length);
}

function defaultPlannedCardKeys(choices) {
  return choices.map((entry) => cardRuntimeKey(entry.card));
}

function plannedPlayerEntriesFromState() {
  const choicesByKey = new Map((state.planningChoices ?? []).map((entry) => [cardRuntimeKey(entry.card), entry]));
  return (state.plannedCardKeys ?? [])
    .map((key) => choicesByKey.get(key))
    .filter(Boolean)
    .map((entry, index) => ({ ...entry, planOrder: index + 1 }));
}

function assignPlanOrders(entries) {
  entries.forEach((entry, index) => {
    entry.planOrder = index + 1;
  });
}

function waitForTurnPlan() {
  if (!state.turnPlanning) return Promise.resolve();
  return new Promise((resolve) => {
    state.planResolver = resolve;
  });
}

function confirmTurnPlan() {
  if (!state?.turnPlanning) return;
  const requiredCount = Math.min(playerTurnPlayLimit(), state.planningChoices.length);
  if ((state.plannedCardKeys ?? []).length < requiredCount) return;
  const resolve = state.planResolver;
  state.planResolver = null;
  resolve?.();
}

function reorderPlannedCardToIndex(draggedKey, targetIndex, options = {}) {
  if (!state?.turnPlanning || !draggedKey) return;
  const orderedKeys = [...(state.plannedCardKeys ?? [])];
  const fromIndex = orderedKeys.indexOf(draggedKey);
  if (fromIndex < 0) return;
  const [dragged] = orderedKeys.splice(fromIndex, 1);
  const boundedIndex = Math.max(0, Math.min(targetIndex, orderedKeys.length));
  orderedKeys.splice(boundedIndex, 0, dragged);
  if (orderedKeys.join("|") === (state.plannedCardKeys ?? []).join("|")) return;
  const previousRects = plannerCardRects();
  state.plannedCardKeys = orderedKeys;
  refreshPlannedTimeline();
  if (options.plannerOnly) {
    renderTurnPlanner();
    renderPriorityStrip();
  } else {
    render();
  }
  animatePlannerCardReorder(previousRects);
}

function refreshPlannedTimeline() {
  state.currentTimeline = plannedPlayerEntriesFromState().concat(state.enemyPlanEntries ?? []);
  assignPlanOrders(state.currentTimeline);
}

function clearPlannerDrag() {
  if (plannerDrag?.frameId) {
    const cancel = window.cancelAnimationFrame ?? window.clearTimeout;
    cancel(plannerDrag.frameId);
  }
  plannerDrag?.ghost?.remove();
  plannerDrag = null;
}

function discardSkippedPlayerCard(cardData, actorOrId = getPlayer()) {
  if (!cardData) return;
  const pile = playerCardPile(actorOrId);
  if (pile) pile.discard.push(cardData);
  else state.discard.push(cardData);
  syncLegacyPlayerCardFields();
}

function drawEnemyPlanEntries() {
  const entries = aliveEnemyKinds().map((kind) => {
    const cardData = drawEnemyCard(kind);
    return {
      actorType: "enemyGroup",
      actorId: kind,
      card: cardData,
      targetId: chooseEnemyGroupTarget(kind, cardData)?.id ?? null,
    };
  });
  state.enemyTargetIds = Object.fromEntries(entries.map((entry) => [entry.actorId, entry.targetId]));
  return entries;
}

function chooseEnemyGroupTarget(kind, cardData) {
  const players = state.entities.filter((entity) => entity.side === "player" && isAlive(entity));
  if (!players.length) return null;
  const enemies = aliveEnemies().filter((enemy) => enemy.kind === kind);
  const hasRangedAttack = cardData?.actions?.some((action) => action.type === "attack" && !action.melee && (action.range ?? 1) > 1);
  const hasMeleeAttack = cardData?.actions?.some((action) => action.type === "attack" && (action.melee || action.range <= 1));

  return [...players].sort((a, b) => {
    if (kind === "shooter" || hasRangedAttack) {
      if (a.hp !== b.hp) return a.hp - b.hp;
    }
    if (kind === "skirmisher") {
      const hpRatioA = a.hp / Math.max(1, a.maxHp);
      const hpRatioB = b.hp / Math.max(1, b.maxHp);
      if (hpRatioA !== hpRatioB) return hpRatioA - hpRatioB;
    }
    const distanceA = Math.min(...enemies.map((enemy) => wallAwareDistance(enemy, a)), Infinity);
    const distanceB = Math.min(...enemies.map((enemy) => wallAwareDistance(enemy, b)), Infinity);
    if (hasMeleeAttack && distanceA !== distanceB) return distanceA - distanceB;
    if (distanceA !== distanceB) return distanceA - distanceB;
    return a.id.localeCompare(b.id);
  })[0] ?? null;
}

function currentFocusTargetId() {
  const current = state.focusTargetId
    ? state.entities.find((entity) => entity.id === state.focusTargetId && isAlive(entity) && entity.side === "enemy")
    : null;
  return current?.id ?? firstAliveEnemyId();
}

function firstAliveEnemyId() {
  return aliveEnemies().sort((a, b) => {
    if (a.hp !== b.hp) return a.hp - b.hp;
    return (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0);
  })[0]?.id ?? null;
}

function setFocusTarget(targetId) {
  if (!state?.turnPlanning || !targetId) return;
  const enemy = state.entities.find((entity) => entity.id === targetId && entity.side === "enemy" && isAlive(entity));
  if (!enemy) return;
  state.focusTargetId = enemy.id;
  render();
}

function applySharedPlayerPriority(entries) {
  const playerEntries = entries.filter((entry) => entry.actorType === "player" && entry.card);
  if (playerEntries.length <= 1) return;
  const fastestPriority = Math.min(...playerEntries.map((entry) => entry.card.priority));
  playerEntries.forEach((entry) => {
    entry.effectivePriority = fastestPriority;
  });
}

function timelinePriority(entry) {
  return entry?.planOrder ?? entry?.effectivePriority ?? entry?.card?.priority ?? 99;
}

function displayTimelineEntries() {
  const result = [];
  const playerGroups = new Map();
  state.currentTimeline.forEach((entry, index) => {
    if (entry.actorType !== "player") {
      result.push({ ...entry, displayEntries: [entry], timelineIndexes: [index] });
      return;
    }

    const key = `player:${entry.actorId}:${timelinePriority(entry)}`;
    let group = playerGroups.get(key);
    if (!group) {
      group = {
        ...entry,
        displayType: "playerGroup",
        displayEntries: [],
        timelineIndexes: [],
      };
      playerGroups.set(key, group);
      result.push(group);
    }
    group.displayEntries.push(entry);
    group.timelineIndexes.push(index);
    if (index === state.activeTimelineIndex) group.card = entry.card;
  });
  return result;
}

function displayEntryActive(entry) {
  return entry.timelineIndexes?.includes(state.activeTimelineIndex) ?? false;
}

function displayEntryDone(entry) {
  const indexes = entry.timelineIndexes ?? [];
  return indexes.length > 0 && indexes.every((index) => state.completedTimelineIndexes?.has(index));
}

function isFirstPlayerEntryInPriorityGroup(entry, index) {
  if (entry.actorType !== "player") return false;
  const priority = timelinePriority(entry);
  return !state.currentTimeline.slice(0, index).some((candidate) => (
    candidate.actorType === "player" &&
    candidate.actorId === entry.actorId &&
    timelinePriority(candidate) === priority
  ));
}

function compareTimeline(a, b) {
  const leftPriority = timelinePriority(a);
  const rightPriority = timelinePriority(b);
  if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  if (a.actorType === "player" && b.actorType !== "player") return -1;
  if (b.actorType === "player" && a.actorType !== "player") return 1;
  return 0;
}

async function executeTimelineEntry(entry) {
  if (entry.actorType === "player") {
    const actor = state.entities.find((entity) => entity.id === entry.actorId && entity.side === "player");
    if (!actor || !isAlive(actor)) return;
    await executeCard(actor, entry.card);
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
  const previousCardContext = state.activeCardContext;
  state.activeCardContext = {
    actorId: actor.id,
    cardData,
    targetHits: new Map(),
    didAttack: false,
  };

  for (const action of cardData.actions) {
    if (!isAlive(actor)) {
      state.activeCardContext = previousCardContext;
      return;
    }
    if (shouldSkipFleeAfterFailedAttackMove(actor, action)) {
      log(`${actor.name} 후퇴 생략`);
      continue;
    }
    const rendered = await executeAction(actor, action, cardData);
    if (!rendered) render();
    await sleep(turnDelay(0.7));
    if (checkEndConditions()) {
      state.activeCardContext = previousCardContext;
      return;
    }
  }

  await resolveCardEndEffects(actor, cardData, state.activeCardContext);
  state.activeCardContext = previousCardContext;
}

function shouldSkipFleeAfterFailedAttackMove(actor, action) {
  const context = state.activeCardContext;
  if (action.type !== "flee") return false;
  if (!context || context.actorId !== actor.id || !context.skipFleeAfterFailedAttackMove) return false;
  context.skipFleeAfterFailedAttackMove = false;
  return true;
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
    const didAttack = await attack(actor, action);
    if (!didAttack) await moveAfterFailedAttack(actor, action);
    return true;
  }
  if (action.type === "momentumAttack") {
    await momentumAttack(actor, action);
    return true;
  }
  if (action.type === "patternAttack") {
    const didAttack = patternAttack(actor, action);
    if (!didAttack) await moveAfterFailedAttack(actor, action);
    return true;
  }
  if (action.type === "charge") {
    actor.charge = (actor.charge ?? 0) + action.amount;
    if (actor.permanent?.chargeRetreat) {
      await moveActor(actor, { type: "flee", amount: actor.permanent.chargeRetreat, flee: true, ignoreCannotMove: true }, cardData);
    }
    if (action.lockMove !== false) actor.temporary.cannotMove = true;
    log(`${actor.name} 차지 ${actor.charge}`);
    return Boolean(actor.permanent?.chargeRetreat);
  }
  if (action.type === "applyEffect") {
    applyEffect(actor, action);
    return false;
  }
  if (isPassiveAction(action)) {
    applyPassiveAction(actor, action, cardData);
    return false;
  }
  if (action.type === "placeTrapBehindTarget") {
    placeTrapBehindTarget(actor, action);
    return false;
  }
  if (action.type === "pushTowardTrap") {
    await pushTowardTrap(actor, action);
    return true;
  }
  if (action.type === "detonateTrap") {
    detonateTrap(actor, action);
    return true;
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

function drawPlayerCard(actorOrId = getPlayer()) {
  const pile = playerCardPile(actorOrId);
  if (!pile) return null;
  if (!pile.deck.length) {
    pile.deck = shuffle(pile.discard ?? []);
    pile.discard = [];
  }
  const cardData = pile.deck.shift();
  syncLegacyPlayerCardFields();
  return cardData;
}

function drawPlayerCards(count = 1, actorOrId = getPlayer()) {
  const cards = [];
  for (let index = 0; index < count; index += 1) {
    const cardData = drawPlayerCard(actorOrId);
    if (cardData) cards.push(cardData);
  }
  return cards;
}

function cardsPerPlayerTurn() {
  return playerTurnCardCount();
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
  if (cardData.actions.some(isPassiveAction)) return;
  if (isSustainCard(cardData) && actor) {
    actor.sustainedCards = actor.sustainedCards ?? [];
    actor.sustainedCards.push({ card: cardData, discardAfterTurn: state.turn + 1 });
    return;
  }
  const pile = playerCardPile(actor);
  if (pile) pile.discard.push(cardData);
  else state.discard.push(cardData);
  syncLegacyPlayerCardFields();
}

function discardEnemyCard(cardData, kind) {
  if (!cardData) return;
  if (cardData.actions.some(isPassiveAction)) return;
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

function isTurnSustainCard(cardData) {
  return cardData?.actions?.some((action) => action.type === "applyEffect" && action.duration === "turn");
}

function expireTurnEndEffects(entry) {
  if (entry.actorType === "player") {
    const actor = state.entities.find((entity) => entity.id === entry.actorId);
    if (actor) expireActorTurnEndEffects(actor, playerDiscardPile(actor));
    return;
  }

  if (entry.actorType === "enemyGroup") {
    state.entities.filter((entity) => entity.side === "enemy" && entity.kind === entry.actorId).forEach((enemy) => {
      expireTemporaryEffectsAtTurnEnd(enemy);
      expireTimedEffectsAtTurnEnd(enemy);
    });
    releaseExpiredSustainedCards(state.enemySustainedCards[entry.actorId], state.enemyDiscards[entry.actorId]);
  }
}

function expireActorTurnEndEffects(actor, discardPile) {
  expireTemporaryEffectsAtTurnEnd(actor);
  expireTimedEffectsAtTurnEnd(actor);
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

async function resolveCardEndEffects(actor, cardData, cardContext) {
  if (!isAlive(actor)) return;
  if (cardContext?.didAttack && actor.permanent?.afterAttackMove) {
    await moveActor(actor, {
      type: "move",
      amount: actor.permanent.afterAttackMove,
      ignoreCannotMove: true,
    }, cardData);
  }
  if (!cardContext?.didAttack && actor.permanent?.chargeOnNoAttack) {
    actor.charge = (actor.charge ?? 0) + actor.permanent.chargeOnNoAttack;
    actor.temporary.cannotMove = true;
    log(`${actor.name} 호흡 유지: 차지 ${actor.charge}`);
  }
}

function applyPassiveAction(actor, action, cardData = null) {
  actor.permanent = actor.permanent ?? {};
  const amount = passiveActionAmount(action, cardData);
  if (action.effect) actor.permanent[action.effect] = (actor.permanent[action.effect] ?? 0) + amount;
  if (action.effect === "baseAtkPercent") {
    const definition = characterDefinitions[actor.characterId] ?? getSelectedCharacter();
    const increase = Math.max(1, Math.round((definition.baseAtk ?? actor.baseAtk ?? 1) * amount));
    actor.baseAtk = (actor.baseAtk ?? 0) + increase;
  }
  if (action.effect === "maxHpPercent") {
    const definition = characterDefinitions[actor.characterId] ?? getSelectedCharacter();
    const increase = Math.max(1, Math.round((definition.maxHp ?? actor.maxHp ?? 1) * amount));
    actor.maxHp = (actor.maxHp ?? 0) + increase;
    actor.hp = Math.min(actor.maxHp, (actor.hp ?? 0) + increase);
  }
  if (action.modifiers?.length) {
    applyEffect(actor, {
      type: "applyEffect",
      label: passiveEffectLabel(action, cardData),
      duration: "stage",
      modifiers: action.modifiers,
    });
  }
  if (action.effect === "lowHpDamage") {
    actor.permanent.lowHpDamageThreshold = Math.min(actor.permanent.lowHpDamageThreshold ?? 1, action.threshold ?? 0.25);
  }
  if (action.effect && action.range) {
    const rangeKey = `${action.effect}Range`;
    actor.permanent[rangeKey] = Math.max(actor.permanent[rangeKey] ?? 0, action.range);
  }
  log(`${actor.name} 패시브: ${passiveEffectLabel(action, cardData)}`);
}

function passiveActionAmount(action, cardData = null) {
  const amount = action.amount ?? 1;
  if (action.effect === "baseAtkPercent" || action.effect === "maxHpPercent") {
    return Math.min(amount, statPercentPassiveCap(cardData));
  }
  return amount;
}

function statPercentPassiveCap(cardData) {
  return STAT_PERCENT_PASSIVE_CAP_BY_RARITY[cardData?.rarity] ?? STAT_PERCENT_PASSIVE_CAP_BY_RARITY["전설"];
}

function applyEffect(actor, action) {
  actor.effects = actor.effects ?? [];
  actor.effects.push({
    id: action.effect ?? action.label ?? `effect-${Date.now()}-${Math.random()}`,
    label: action.label ?? "효과",
    modifiers: action.modifiers ?? [],
    afterHitFlee: action.afterHitFlee,
    duration: action.duration ?? "wave",
    expiresAfterOwnTurnEnds: action.duration === "turn" ? state.turn + 1 : undefined,
    consumeOn: action.duration === "nextAttack"
      ? "attack"
      : action.duration === "nextHit"
        ? "hit"
        : null,
  });
  log(`${actor.name} 효과: ${action.label ?? "강화"}`);
}

function expireTimedEffectsAtTurnEnd(actor) {
  if (!actor.effects) return;
  actor.effects = actor.effects.filter((effect) => {
    if (effect.expiresAfterOwnTurnEnds && effect.expiresAfterOwnTurnEnds <= state.turn) {
      log(`${actor.name} 효과 종료: ${effect.label}`);
      return false;
    }
    return true;
  });
}

function consumeEffects(actor, consumeOn) {
  if (!actor?.effects?.length) return;
  actor.effects = actor.effects.filter((effect) => effect.consumeOn !== consumeOn);
}

async function attack(actor, action) {
  const targets = selectTargets(actor, action);
  if (!targets.length) {
    log(`${actor.name} 공격 실패`);
    return false;
  }

  const chargeBonus = action.ignoreChargeBonus ? 0 : consumeChargeForAttack(actor);
  if (state.activeCardContext?.actorId === actor.id) state.activeCardContext.didAttack = true;
  await animateActorAttack(actor, targets[0], action);
  for (const target of targets) {
    if (!isAlive(actor)) return true;
    if (!isAlive(target)) continue;
    const beforeHp = target.hp;
    const damage = dealAttackDamage(actor, target, action, action.mult + chargeBonus, { targetCount: targets.length });
    resolveKillPassives(actor, target);
    applyOverkillSplash(actor, target, damage - beforeHp, action);
    refundChargeOnKill(actor, target, action);
    const pushAmount = attackPushAmount(actor, target, action, targets.length);
    if (pushAmount && isAlive(target)) {
      const pushedIntoTrap = await pushTarget(actor, target, pushAmount);
      if (actor.permanent?.pushAreaDamage) {
        applyEffect(actor, {
          type: "applyEffect",
          label: "전장 지배",
          duration: "nextAttack",
          modifiers: [{ stat: "damageDealt", amount: actor.permanent.pushAreaDamage }],
        });
      }
      if (pushedIntoTrap && action.trapHitBonus && isAlive(target)) {
        const bonusBeforeHp = target.hp;
        const bonusDamage = dealAttackDamage(actor, target, {
          type: "attack",
          mult: action.trapHitBonus,
          range: action.range,
          melee: action.melee,
        }, action.trapHitBonus, { targetCount: targets.length });
        applyOverkillSplash(actor, target, bonusDamage - bonusBeforeHp, action);
      }
    }
    if (action.pull && isAlive(target)) await pullTarget(actor, target, action.pull);
  }
  if (action.resetChargeAfterAttack) resetAttackCharge(actor);
  consumeEffects(actor, "attack");
  return true;
}

async function animateActorAttack(actor, target, action) {
  if (!isAlive(actor) || !target) return;
  const character = actor.side === "player"
    ? characterDefinitions[actor.characterId] ?? getSelectedCharacter()
    : null;
  if (!character?.tokenImages) return;

  renderBoard();
  const bounds = boardBounds();
  const entityElement = elements.board.querySelector(entityDomSelector(actor.id));
  const art = entityElement?.querySelector(".entity-art");
  if (!entityElement || !art) return;
  if (!entityElement.style?.setProperty || !elements.board?.append) return;

  const facingImage = characterTokenImageToward(actor, character, target, bounds);
  if (facingImage) {
    art.src = facingImage;
    entityElement.dataset.image = facingImage;
  }

  const fromPoint = hexToPixel(actor, bounds);
  const toPoint = hexToPixel(target, bounds);
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / length;
  const uy = dy / length;
  const duration = Math.max(130, turnDelay(action.melee || action.range <= 1 ? 0.26 : 0.34));
  const lunge = action.melee || action.range <= 1 ? 12 : 7;
  const recoil = action.melee || action.range <= 1 ? 5 : 9;

  entityElement.style.setProperty("--attack-duration", `${duration}ms`);
  entityElement.style.setProperty("--attack-x", `${ux * lunge}px`);
  entityElement.style.setProperty("--attack-y", `${uy * lunge}px`);
  entityElement.style.setProperty("--attack-recoil-x", `${-ux * recoil}px`);
  entityElement.style.setProperty("--attack-recoil-y", `${-uy * recoil}px`);
  entityElement.classList.add("attacking");

  const projectile = !action.melee && (action.range ?? 1) > 1
    ? createAttackProjectile(fromPoint, toPoint, duration)
    : null;
  if (projectile) elements.board.append(projectile);

  await sleep(duration);
  entityElement.classList.remove("attacking");
  projectile?.remove();
}

function createAttackProjectile(fromPoint, toPoint, duration) {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / length;
  const uy = dy / length;
  const startOffset = 24;
  const endOffset = 20;
  const span = document.createElement("span");
  span.className = "attack-projectile";
  span.style.left = `${fromPoint.x + ux * startOffset}px`;
  span.style.top = `${fromPoint.y + uy * startOffset}px`;
  span.style.setProperty("--projectile-duration", `${duration}ms`);
  span.style.setProperty("--projectile-dx", `${dx - ux * (startOffset + endOffset)}px`);
  span.style.setProperty("--projectile-dy", `${dy - uy * (startOffset + endOffset)}px`);
  span.style.setProperty("--projectile-angle", `${Math.atan2(dy, dx)}rad`);
  return span;
}

function patternAttack(actor, action) {
  const placement = bestPatternPlacement(
    action.pattern,
    actor,
    effectiveActionRange(actor, action),
    actor.side,
    preferredTargetIdForActor(actor),
  );
  if (!placement.tiles.length) {
    log(`${actor.name} 공격 실패`);
    return false;
  }

  const chargeBonus = consumeChargeForAttack(actor);
  const targetBonus = (placement.targets.length - 1) * ((action.perTargetBonus ?? 0) + (actor.permanent?.areaPerTargetBonus ?? 0));
  if (state.activeCardContext?.actorId === actor.id) state.activeCardContext.didAttack = true;
  placement.targets.forEach((target) => {
    if (!isAlive(actor) || !isAlive(target)) return;
    const beforeHp = target.hp;
    const damage = dealAttackDamage(actor, target, action, action.mult + chargeBonus + targetBonus, {
      targetCount: placement.targets.length,
    });
    resolveKillPassives(actor, target);
    applyOverkillSplash(actor, target, damage - beforeHp, action);
    refundChargeOnKill(actor, target, action);
  });
  consumeEffects(actor, "attack");
  return true;
}

function selectTargets(actor, action) {
  const range = effectiveActionRange(actor, action);
  const previousTargetIds = state.activeCardContext?.actorId === actor.id
    ? state.activeCardContext.targetHits
    : null;
  const preferredTargetId = preferredTargetIdForActor(actor);
  const singleTarget = isSingleTargetAction(action);
  const candidates = aliveOpponents(actor)
    .filter((target) => canTarget(actor, target, range))
    .sort((a, b) => {
      if (singleTarget) {
        const distanceA = targetPriorityDistance(actor, a, action);
        const distanceB = targetPriorityDistance(actor, b, action);
        if (distanceA !== distanceB) return distanceA - distanceB;
        if (a.hp !== b.hp) return a.hp - b.hp;
      }
      if (preferredTargetId) {
        const aPreferred = a.id === preferredTargetId;
        const bPreferred = b.id === preferredTargetId;
        if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
      }
      if (action.preferPreviousTarget && previousTargetIds) {
        const aPrevious = previousTargetIds.has(a.id);
        const bPrevious = previousTargetIds.has(b.id);
        if (aPrevious !== bPrevious) return aPrevious ? -1 : 1;
      }
      if (singleTarget) return (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0);
      if (a.hp !== b.hp) return a.hp - b.hp;
      if (isRangedAttackAction(action)) {
        const targetCount = action.targets ?? 1;
        const aPenaltyFree = isPenaltyFreeTargetFromTile(actor, actor, a, action, targetCount);
        const bPenaltyFree = isPenaltyFreeTargetFromTile(actor, actor, b, action, targetCount);
        if (aPenaltyFree !== bPenaltyFree) return aPenaltyFree ? -1 : 1;
      }
      const distanceA = targetPriorityDistance(actor, a, action);
      const distanceB = targetPriorityDistance(actor, b, action);
      if (distanceA !== distanceB) return distanceA - distanceB;
      return (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0);
    });

  return candidates.slice(0, action.targets ?? 1);
}

function preferredTargetIdForActor(actor) {
  if (!actor) return null;
  if (AUTO_ROUTINE_MODE && actor.side === "player") {
    const autoTargetId = autoPreferredTargetId(actor);
    if (autoTargetId) return autoTargetId;
  }
  if (actor.side === "player") return state.focusTargetId ?? null;
  return state.enemyTargetIds?.[actor.kind] ?? null;
}

function autoPreferredTargetId(actor) {
  if (actor.characterId === "warrior" && actor.permanent?.autoProtect) {
    const weakHero = alivePlayers()
      .sort((a, b) => a.hp / Math.max(1, a.maxHp) - b.hp / Math.max(1, b.maxHp))[0];
    if (weakHero) {
      const pressureTarget = aliveEnemies()
        .filter((enemy) => axialDistance(enemy, weakHero) <= 1)
        .sort((a, b) => a.hp - b.hp || axialDistance(actor, a) - axialDistance(actor, b))[0];
      if (pressureTarget) return pressureTarget.id;
    }
  }

  if (actor.characterId === "archer") {
    const marked = aliveEnemies()
      .filter((enemy) => enemy.temporary?.autoMarked)
      .sort((a, b) => a.hp - b.hp || axialDistance(actor, a) - axialDistance(actor, b))[0];
    if (marked) return marked.id;
  }

  return null;
}

function targetPriorityDistance(actor, target, action) {
  return targetPriorityDistanceFromTile(actor, actor, target, action);
}

function targetPriorityDistanceFromTile(actor, fromTile, target, action) {
  if (isMeleeAttackAction(action)) return approachDistanceToTarget(actor, fromTile, target);
  return wallAwareDistance(fromTile, target);
}

async function moveActor(actor, action, cardData) {
  const amount = effectiveMoveAmount(actor, action);
  if (actor.temporary?.cannotMove && !action.ignoreCannotMove) {
    log(`${actor.name} 이동 불가`);
    return { moved: 0, unused: amount };
  }

  const movementContext = createMovementContext(actor, amount, action.jump);
  const safeReachable = movementContext.safeReachable;
  const fallbackReachable = movementContext.fallbackReachable;
  if (!safeReachable.length && !fallbackReachable.length) {
    log(`${actor.name} 이동 실패`);
    return { moved: 0, unused: amount };
  }

  const nextAttack = nextAttackAction(cardData, action);
  let destination;
  if (action.flee) {
    const reachable = safeReachable.length ? safeReachable : fallbackReachable;
    destination = bestFleeTile(actor, reachable);
  } else if (action.fleeToRune) {
    const reachable = safeReachable.length ? safeReachable : fallbackReachable;
    destination = bestRuneRetreatTile(actor, reachable);
  } else {
    destination = bestCombatMoveTile(actor, safeReachable, fallbackReachable, nextAttack ?? action, {
      amount,
      jump: action.jump,
      movementContext,
    });
  }

  if (!destination || sameHex(destination, actor)) {
    log(`${actor.name} 제자리`);
    return { moved: 0, unused: amount };
  }

  const path = movementContext.pathTo(destination);
  const moved = path.length || axialDistance(actor, destination);
  await animateActorPath(actor, path.length ? path : [destination]);
  log(`${actor.name} 이동 (${actor.q}, ${actor.r})`);
  triggerTrap(actor);
  return { moved, unused: Math.max(0, amount - moved) };
}

function effectiveMoveAmount(actor, action) {
  let amount = action.amount ?? actor.baseMove ?? 0;
  if (action.type === "move" || action.type === "flee" || action.type === "fleeToRune") {
    actor.temporary = actor.temporary ?? {};
    amount += actor.permanent?.moveCardBonus ?? 0;
    amount += actor.temporary.waveMoveCardBonus ?? 0;
    if (actor.temporary.nextMoveCardBonus) {
      amount += actor.temporary.nextMoveCardBonus;
      delete actor.temporary.nextMoveCardBonus;
    }
  }
  return Math.max(0, amount);
}

async function moveAfterFailedAttack(actor, attackAction) {
  if (!isAlive(actor)) return;
  const moveAction = { type: "move", amount: actor.baseMove };
  const result = await moveActor(actor, moveAction, { actions: [moveAction, attackAction] });
  if ((result?.moved ?? 0) > 0 && state.activeCardContext?.actorId === actor.id) {
    state.activeCardContext.skipFleeAfterFailedAttackMove = true;
  }
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
  await attack(actor, {
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

function dealAttackDamage(actor, target, action, multiplier, options = {}) {
  if (!isAlive(actor) || !isAlive(target)) return 0;
  const context = damageContext(actor, target, action, options);
  const finalMultiplier = multiplier * outgoingDamageMultiplier(context) * incomingDamageMultiplier(context);
  const adjacentPenalty = adjacentDamagePenalty(context);
  const damage = Math.max(1, Math.round(actor.baseAtk * finalMultiplier * adjacentPenalty));
  const hitPosition = { q: target.q, r: target.r };
  const hadAutoMark = Boolean(target.temporary?.autoMarked);
  applyDamage(target, damage);
  const attackHitCount = noteTargetHit(actor, target);
  applyAutoHitEffects(actor, target, hadAutoMark);
  const pulseHits = triggerThirdAttackPulse(actor, target, attackHitCount);
  resolveAfterHitEffects(actor, target);
  consumeEffects(target, "hit");
  renderBoard();
  renderHud();
  showHitEffect(target, hitPosition, damage);
  pulseHits.forEach((hit) => showHitEffect(hit.target, hit.position, hit.damage));
  log(`${actor.name} -> ${target.name} ${damage} 피해`);
  return damage;
}

function applyAutoHitEffects(actor, target, hadAutoMark) {
  if (!AUTO_ROUTINE_MODE || !actor || !target) return;
  if (actor.side === "player" && actor.characterId === "archer" && actor.permanent?.autoMarkOnHit && isAlive(target)) {
    target.temporary = target.temporary ?? {};
    if (!target.temporary.autoMarked) log(`${target.name} 표식`);
    target.temporary.autoMarked = {
      ownerId: actor.id,
      source: "archer",
    };
  }
  if (!isAlive(target) && hadAutoMark && autoHero("archer")?.permanent?.autoMarkTransfer) {
    transferAutoMark(target);
  }
}

function transferAutoMark(defeatedTarget) {
  const nextTarget = aliveEnemies()
    .filter((enemy) => enemy.id !== defeatedTarget.id)
    .sort((a, b) => a.hp - b.hp || (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0))[0];
  if (!nextTarget) return;
  nextTarget.temporary = nextTarget.temporary ?? {};
  nextTarget.temporary.autoMarked = { ownerId: "archer", source: "transfer" };
  log(`표식 전이: ${nextTarget.name}`);
}

function resolveAfterHitEffects(attacker, target) {
  if (!isAlive(attacker) || !isAlive(target)) return;
  const fleeAmount = Math.max(0, ...(target.effects ?? []).map((effect) => effect.afterHitFlee ?? 0));
  if (!fleeAmount) return;
  const movementContext = createMovementContext(target, fleeAmount, false);
  const reachable = movementContext.fallbackReachable;
  const destination = bestFleeTile(target, reachable);
  if (!destination || sameHex(destination, target)) return;
  target.q = destination.q;
  target.r = destination.r;
  log(`${target.name} 긴급 회피`);
  triggerTrap(target);
}

function damageContext(actor, target, action, options = {}) {
  const distance = axialDistance(actor, target);
  const repeatHits = state.activeCardContext?.targetHits?.get(target.id) ?? 0;
  return {
    actor,
    target,
    action,
    distance,
    repeatHits,
    targetCount: options.targetCount ?? action.targets ?? 1,
    isMelee: Boolean(action.melee || action.range <= 1),
    isRanged: !action.melee && (action.range ?? 1) > 1,
  };
}

function noteTargetHit(actor, target) {
  const context = state.activeCardContext;
  if (context && context.actorId === actor.id) {
    context.targetHits.set(target.id, (context.targetHits.get(target.id) ?? 0) + 1);
  }
  actor.permanent = actor.permanent ?? {};
  actor.permanent.attackHitCount = (actor.permanent.attackHitCount ?? 0) + 1;
  return actor.permanent.attackHitCount;
}

function triggerThirdAttackPulse(actor, target, attackHitCount) {
  const every = actor?.permanent?.thirdAttackPulseEvery ?? 0;
  const percent = actor?.permanent?.thirdAttackPulsePercent ?? 0;
  const maxTargets = actor?.permanent?.thirdAttackPulseTargets ?? 0;
  const range = actor?.permanent?.thirdAttackPulseRange ?? 1;
  if (!every || !percent || !maxTargets || !attackHitCount || attackHitCount % every !== 0) return [];

  const pulseTargets = aliveOpponents(actor)
    .filter((enemy) => enemy.id !== target.id)
    .filter((enemy) => wallAwareDistance(target, enemy) <= range && hasLineOfSight(target, enemy))
    .sort((a, b) => {
      const distanceA = axialDistance(target, a);
      const distanceB = axialDistance(target, b);
      if (distanceA !== distanceB) return distanceA - distanceB;
      if (a.hp !== b.hp) return b.hp - a.hp;
      return (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0);
    })
    .slice(0, maxTargets);

  return pulseTargets.map((enemy) => {
    const hitPosition = { q: enemy.q, r: enemy.r };
    const pulseDamage = Math.max(1, Math.round(enemy.hp * percent));
    applyDamage(enemy, pulseDamage);
    log(`${actor.name} 세 번째 파동 -> ${enemy.name} ${pulseDamage} 피해`);
    return {
      target: enemy,
      position: hitPosition,
      damage: pulseDamage,
    };
  });
}

function outgoingDamageMultiplier(context) {
  const { actor, target, action, repeatHits } = context;
  let bonus = actorDamageMultiplier(actor) - 1;
  bonus += actor.permanent?.autoPartyDamage ?? 0;
  if (context.isMelee) bonus += actor.permanent?.moveAttackDamage ?? 0;
  if (actor.permanent?.comboDamage && repeatHits > 0) bonus += repeatHits * actor.permanent.comboDamage;
  if (actor.permanent?.thirdHitDamage && repeatHits >= 2) bonus += actor.permanent.thirdHitDamage;
  if (actor.permanent?.multiTargetDamage && context.targetCount >= 2) bonus += actor.permanent.multiTargetDamage;
  if (actor.permanent?.runeDamage && ownedRunes(actor).length) bonus += actor.permanent.runeDamage;
  if (target?.temporary?.autoMarked) {
    if (actor.side === "player") bonus += 0.12;
    if (actor.characterId === "archer") bonus += actor.permanent?.autoMarkedDamage ?? 0;
    if (actor.characterId === "warrior" && state.autoSynergy?.markBreak) bonus += 0.25;
    if (actor.characterId === "mage" && state.autoSynergy?.markConduct) bonus += 0.25;
  }
  if (action.perRepeatTargetDamage && repeatHits > 0) bonus += repeatHits * action.perRepeatTargetDamage;
  if (action.sameTargetBonus && repeatHits > 0) bonus += action.sameTargetBonus;
  if (action.thirdHitBonus && repeatHits >= 2) bonus += action.thirdHitBonus;
  if (target.temporary?.rangedVulnerability && context.isRanged) bonus += target.temporary.rangedVulnerability.amount ?? 0;
  bonus += effectModifierTotal(actor, "damageDealt", context);
  return Math.max(0.05, 1 + bonus);
}

function incomingDamageMultiplier(context) {
  const bonus = effectModifierTotal(context.target, "damageTaken", context);
  return Math.max(0.05, 1 + bonus);
}

function adjacentDamagePenalty(context) {
  if (!context.isRanged || context.distance > 1) return 1;
  if (context.actor.permanent?.ignoreAdjacentPenalty) return 1;
  if (effectModifierTotal(context.actor, "ignoreAdjacentPenalty", context) > 0) return 1;
  return 0.7;
}

function attackPushAmount(actor, target, action, targetCount) {
  if (!isAlive(target)) return 0;
  const context = damageContext(actor, target, action, { targetCount });
  const markPush = AUTO_ROUTINE_MODE && actor.characterId === "warrior" && target?.temporary?.autoMarked && state.autoSynergy?.markBreak
    ? 1
    : 0;
  const chancePush = rollAttackPush(actor);
  return Math.max(0, (action.push ?? 0) + markPush + chancePush + effectModifierTotal(actor, "push", context));
}

function rollAttackPush(actor) {
  const chance = actor?.permanent?.attackPushChance ?? 0;
  const amount = actor?.permanent?.attackPushAmount ?? 0;
  if (!chance || !amount || Math.random() >= chance) return 0;
  log(`${actor.name} 밀어내는 화살`);
  return amount;
}

function refundChargeOnKill(actor, target, action) {
  if (!action.killChargeRefund || isAlive(target)) return;
  actor.charge = (actor.charge ?? 0) + action.killChargeRefund;
  actor.temporary.cannotMove = true;
  log(`${actor.name} 처치 집중: 차지 ${actor.charge}`);
  renderHud();
}

function resolveKillPassives(actor, target) {
  if (!actor || !target || isAlive(target)) return;
  actor.temporary = actor.temporary ?? {};
  if (actor.permanent?.killDamageBonus) {
    applyEffect(actor, {
      type: "applyEffect",
      label: "전투 갈증",
      duration: "nextAttack",
      modifiers: [{ stat: "damageDealt", amount: actor.permanent.killDamageBonus }],
    });
  }
  if (actor.permanent?.killChainDamage) {
    applyEffect(actor, {
      type: "applyEffect",
      label: "무한 연쇄",
      duration: "nextAttack",
      modifiers: [{ stat: "damageDealt", amount: actor.permanent.killChainDamage }],
    });
  }
  if (actor.permanent?.killMoveBonus) {
    actor.temporary.nextMoveCardBonus = (actor.temporary.nextMoveCardBonus ?? 0) + actor.permanent.killMoveBonus;
    log(`${actor.name} 재돌입 준비`);
  }
  if (actor.permanent?.stackingMoveBonus) {
    actor.temporary.waveMoveCardBonus = (actor.temporary.waveMoveCardBonus ?? 0) + actor.permanent.stackingMoveBonus;
    log(`${actor.name} 관성 증가`);
  }
}

function effectModifierTotal(owner, stat, context) {
  if (!owner?.effects?.length) return 0;
  return owner.effects.reduce((total, effect) => {
    const modifierTotal = (effect.modifiers ?? [])
      .filter((modifier) => modifier.stat === stat && modifierApplies(modifier, context, owner))
      .reduce((sum, modifier) => sum + (modifier.amount ?? 0), 0);
    return total + modifierTotal;
  }, 0);
}

function modifierApplies(modifier, context, owner) {
  const when = modifier.when ?? {};
  if (when.attackKind === "ranged" && !context.isRanged) return false;
  if (when.attackKind === "melee" && !context.isMelee) return false;
  if (when.nonAdjacent && context.distance <= 1) return false;
  if (when.repeatHit && context.repeatHits <= 0) return false;
  if (when.thirdHit && context.repeatHits < 2) return false;
  if (when.singleTarget && context.targetCount !== 1) return false;
  if (when.charged && !(owner.charge > 0)) return false;
  return true;
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

function findMovePath(actor, destination, jump = false, maxDistance = Infinity) {
  const safePath = findPathForActor(actor, actor, destination, jump, true);
  if ((safePath.length && safePath.length <= maxDistance) || sameHex(actor, destination)) return safePath;
  const fallbackPath = findPathForActor(actor, actor, destination, jump, false);
  return fallbackPath.length <= maxDistance ? fallbackPath : [];
}

function createMovementContext(actor, amount, jump = false) {
  const safeField = buildMoveField(actor, amount, { jump, avoidTraps: true, stopDistance: amount });
  const fallbackField = buildMoveField(actor, amount, { jump, avoidTraps: false, stopDistance: amount });
  const fallbackReachable = fallbackField.reachableTiles.map((tile) => ({
    ...tile,
    trapRisk: safeField.distanceTo(tile) <= amount ? 0 : tile.trapRisk,
  }));
  const fullFields = new Map();

  return {
    amount,
    jump,
    safeField,
    fallbackField,
    safeReachable: safeField.reachableTiles,
    fallbackReachable,
    fullField(avoidTraps) {
      const key = avoidTraps ? "safe" : "fallback";
      if (!fullFields.has(key)) {
        fullFields.set(key, buildMoveField(actor, Infinity, { jump, avoidTraps, stopDistance: amount }));
      }
      return fullFields.get(key);
    },
    pathTo(destination) {
      if (sameHex(actor, destination)) return [];
      const safePath = safeField.pathTo(destination);
      if (safePath) return safePath;
      return fallbackField.pathTo(destination) ?? [];
    },
  };
}

function buildMoveField(actor, maxDistance = Infinity, options = {}) {
  const jump = Boolean(options.jump);
  const avoidTraps = Boolean(options.avoidTraps);
  const stopDistance = options.stopDistance ?? maxDistance;
  const start = { q: actor.q, r: actor.r };
  const startKey = hexKey(start);
  const stopBlockedKeys = Number.isFinite(stopDistance)
    ? new Set(state.entities
      .filter((entity) => isAlive(entity) && entity.id !== actor.id && axialDistance(actor, entity) === stopDistance)
      .map(hexKey))
    : new Set();
  const queue = [{ ...start, distance: 0, trapRisk: 0 }];
  const nodeByKey = new Map([[startKey, { ...start, distance: 0, trapRisk: 0, parentKey: null }]]);
  const reachableTiles = [];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.distance > 0 && canEndMoveAt(current, actor, { avoidTraps })) {
      reachableTiles.push({
        q: current.q,
        r: current.r,
        distance: current.distance,
        trapRisk: avoidTraps ? 0 : current.trapRisk,
      });
    }
    if (current.distance >= maxDistance) continue;

    for (const dir of directions) {
      const next = { q: current.q + dir.q, r: current.r + dir.r };
      const key = hexKey(next);
      if (!isTile(next) || nodeByKey.has(key)) continue;
      if (stopBlockedKeys.has(key)) continue;
      const nextDistance = current.distance + 1;
      if (nextDistance === stopDistance && occupiedByOtherEntity(next, actor)) continue;
      if (!jump && blocksPath(next, actor, { avoidTraps })) continue;
      const trapRisk = current.trapRisk + (!avoidTraps && movementTrapAt(next) ? 1 : 0);
      const node = {
        q: next.q,
        r: next.r,
        distance: nextDistance,
        trapRisk,
        parentKey: hexKey(current),
      };
      nodeByKey.set(key, node);
      queue.push(node);
    }
  }

  return {
    reachableTiles,
    has(tile) {
      return nodeByKey.has(hexKey(tile));
    },
    node(tile) {
      return nodeByKey.get(hexKey(tile)) ?? null;
    },
    distanceTo(tile) {
      return nodeByKey.get(hexKey(tile))?.distance ?? Infinity;
    },
    trapRiskTo(tile) {
      return avoidTraps ? 0 : (nodeByKey.get(hexKey(tile))?.trapRisk ?? Infinity);
    },
    pathTo(destination) {
      const destinationKey = hexKey(destination);
      if (!nodeByKey.has(destinationKey)) return null;
      const path = [];
      let key = destinationKey;
      while (key && key !== startKey) {
        const node = nodeByKey.get(key);
        path.unshift({ q: node.q, r: node.r });
        key = node.parentKey;
      }
      return path;
    },
    stepToward(destination, amount) {
      const path = this.pathTo(destination);
      if (!path?.length) return sameHex(actor, destination) ? actor : null;
      return path[Math.min(amount, path.length) - 1] ?? null;
    },
  };
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

function movementTrapRisk(actor, destination, jump = false, maxDistance = Infinity) {
  if (sameHex(actor, destination)) return 0;
  const safePath = findPathForActor(actor, actor, destination, jump, true);
  if (safePath.length && safePath.length <= maxDistance) return 0;
  const fallbackPath = findPathForActor(actor, actor, destination, jump, false);
  if (!fallbackPath.length || fallbackPath.length > maxDistance) return 9999;
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
  state.entityFacingTargets?.set(actor.id, to);
  try {
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
    const deltaX = fromPoint.x - toPoint.x;
    const deltaY = fromPoint.y - toPoint.y;
    entityElement.classList.remove("moving");
    entityElement.style.transition = "none";
    entityElement.style.left = `${toPoint.x}px`;
    entityElement.style.top = `${toPoint.y}px`;
    entityElement.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    entityElement.getBoundingClientRect();

    await nextFrame();
    entityElement.style.transition = "";
    entityElement.classList.add("moving");
    const cameraFollow = animateCameraFollowForActor(actor, from, to);
    await nextFrame();
    entityElement.style.transform = "";
    await sleep(240);
    if (cameraFollow) await cameraFollow;
  } finally {
    state.entityFacingTargets?.delete(actor.id);
  }
}

function animateCameraFollowForActor(actor, from, to) {
  if (actor.side !== "player" || state.cameraMode !== "focus") return null;

  const bounds = boardBounds();
  const fromPoint = hexToPixel(from, bounds);
  const toPoint = hexToPixel(to, bounds);
  const metrics = cameraMetrics(bounds);
  const token = (state.cameraFollowToken ?? 0) + 1;
  const previousTransition = elements.board.style.transition;
  state.cameraFollowToken = token;
  elements.board.style.transition = "none";

  return new Promise((resolve) => {
    const startedAt = performance.now();
    let latestFrame = null;
    const finish = () => {
      if (state?.cameraFollowToken === token) {
        if (latestFrame) {
          applyBoardCameraFrame(latestFrame, false);
          commitCameraFrame(latestFrame);
        }
        elements.board.style.transition = previousTransition;
      }
      resolve();
    };
    const tick = (now) => {
      if (!state || state.cameraFollowToken !== token || state.cameraMode !== "focus") {
        elements.board.style.transform = "";
        elements.board.style.transition = previousTransition;
        resolve();
        return;
      }

      const progress = Math.min(1, (now - startedAt) / CAMERA_FOLLOW_DURATION);
      const eased = easeInOut(progress);
      const frame = calculateCameraFrame(bounds, {
        focusPoint: {
          x: fromPoint.x + (toPoint.x - fromPoint.x) * eased,
          y: fromPoint.y + (toPoint.y - fromPoint.y) * eased,
        },
        metrics,
      });
      latestFrame = frame;
      applyBoardCameraTransform(frame);

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        finish();
      }
    };
    window.requestAnimationFrame(tick);
  });
}

function nextAttackAction(cardData, currentAction) {
  const index = cardData.actions.indexOf(currentAction);
  return cardData.actions.slice(index + 1).find((action) => {
    return action.type === "attack" || action.type === "patternAttack";
  });
}

function bestCombatMoveTile(actor, safeReachable, fallbackReachable, attackAction, moveOptions = {}) {
  if (isAttackMovementAction(attackAction)) {
    const safeAttackTile = bestCombatMoveTileFromReachable(actor, safeReachable, attackAction, {
      requireAttackTile: true,
      includeCurrentTile: true,
    });
    if (safeAttackTile) return safeAttackTile;

    const safePathTile = bestPathStepTowardAttackTile(actor, attackAction, moveOptions, true);
    if (safePathTile && !sameHex(safePathTile, actor)) return safePathTile;
    if (safePathTile && sameHex(safePathTile, actor)) return actor;

    const safeApproachTile = bestCombatMoveTileFromReachable(actor, safeReachable, attackAction, {
      excludeCurrentTile: true,
    });
    if (safeApproachTile && !sameHex(safeApproachTile, actor)) return safeApproachTile;

    const fallbackAttackTile = bestCombatMoveTileFromReachable(actor, fallbackReachable, attackAction, {
      requireAttackTile: true,
      includeCurrentTile: true,
    });
    if (fallbackAttackTile) return fallbackAttackTile;

    const fallbackPathTile = bestPathStepTowardAttackTile(actor, attackAction, moveOptions, false);
    if (fallbackPathTile) return fallbackPathTile;
  }

  const reachable = safeReachable.length ? safeReachable : fallbackReachable;
  return bestCombatMoveTileFromReachable(actor, reachable, attackAction) ?? actor;
}

function bestPathStepTowardAttackTile(actor, attackAction, moveOptions, avoidTraps) {
  const amount = moveOptions.amount ?? actor.baseMove ?? 0;
  if (amount <= 0) return actor;
  const movementField = moveOptions.movementContext?.fullField(avoidTraps)
    ?? buildMoveField(actor, Infinity, { jump: moveOptions.jump, avoidTraps });
  const goals = [actor, ...state.tiles]
    .filter((tile) => sameHex(tile, actor) || canEndMoveAt(tile, actor, { avoidTraps }))
    .map((tile) => {
      if (!movementField.has(tile)) return null;
      const targetInfo = scoreTargetsFromTile(actor, tile, attackAction);
      if (targetInfo.hitCount <= 0) return null;
      const distance = movementField.distanceTo(tile);
      const trapRisk = movementField.trapRiskTo(tile);
      return { tile, distance, trapRisk, ...targetInfo };
    })
    .filter(Boolean);

  if (!goals.length) return null;

  goals.sort((a, b) => {
    const aReachableNow = a.distance <= amount;
    const bReachableNow = b.distance <= amount;
    if (aReachableNow !== bReachableNow) return aReachableNow ? -1 : 1;
    if (a.trapRisk !== b.trapRisk) return a.trapRisk - b.trapRisk;
    const targetScore = compareAttackMoveTargetScores(a, b, attackAction);
    if (targetScore) return targetScore;
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.lowestIndex - b.lowestIndex;
  });

  const best = goals[0];
  if (best.distance <= 0) return actor;
  const destination = movementField.stepToward(best.tile, amount);
  if (!destination) return null;
  return {
    ...destination,
    distance: movementField.distanceTo(destination),
    trapRisk: movementField.trapRiskTo(destination),
  };
}

function bestCombatMoveTileFromReachable(actor, reachable, attackAction, options = {}) {
  const opponents = aliveOpponents(actor);
  if (!opponents.length) return options.requireAttackTile ? null : actor;
  const desiredRange = attackAction?.type === "attack" || attackAction?.type === "patternAttack"
    ? effectiveActionRange(actor, attackAction)
    : (attackAction?.desiredRange ?? actor.baseRange);
  const candidateTiles = (options.includeCurrentTile || (isMeleeAttackAction(attackAction) && !options.excludeCurrentTile))
    ? [actor, ...reachable]
    : reachable;
  const approachFields = isMeleeAttackAction(attackAction)
    ? buildMeleeApproachFields(actor, opponents)
    : null;

  const scored = candidateTiles
    .map((tile) => {
      const targetInfo = scoreTargetsFromTile(actor, tile, attackAction);
      const nearest = nearestOpponentMoveDistance(actor, tile, opponents, attackAction, approachFields);
      const closestToDesired = -Math.abs(nearest - desiredRange);
      const farthestClosest = nearest;
      const moveCost = tile.distance ?? axialDistance(actor, tile);
      const trapRisk = tile.trapRisk ?? 0;
      return {
        tile,
        hitCount: targetInfo.hitCount,
        focusHitCount: targetInfo.focusHitCount,
        nonPenaltyHitCount: targetInfo.nonPenaltyHitCount,
        lowestHp: targetInfo.lowestHp,
        lowestNonPenaltyHp: targetInfo.lowestNonPenaltyHp,
        lowestIndex: targetInfo.lowestIndex,
        nearestTargetDistance: targetInfo.nearestTargetDistance,
        nearestTargetHp: targetInfo.nearestTargetHp,
        closestToDesired,
        farthestClosest,
        moveCost,
        trapRisk,
      };
    })
    .filter((item) => !options.requireAttackTile || item.hitCount > 0);

  scored.sort((a, b) => {
    if (a.trapRisk !== b.trapRisk) return a.trapRisk - b.trapRisk;
    const targetScore = compareAttackMoveTargetScores(a, b, attackAction);
    if (targetScore) return targetScore;
    if (a.hitCount > 1 && a.farthestClosest !== b.farthestClosest) {
      return b.farthestClosest - a.farthestClosest;
    }
    if (a.closestToDesired !== b.closestToDesired) return b.closestToDesired - a.closestToDesired;
    if (a.moveCost !== b.moveCost) return a.moveCost - b.moveCost;
    return a.lowestIndex - b.lowestIndex;
  });

  if (!scored.length) return options.requireAttackTile ? null : actor;
  return scored[0].tile;
}

function isAttackMovementAction(action) {
  return action?.type === "attack" || action?.type === "patternAttack";
}

function isMeleeAttackAction(action) {
  return action?.type === "attack" && (action.melee || action.range <= 1);
}

function isRangedAttackAction(action) {
  return isAttackMovementAction(action) && !action.melee && (action.range ?? 1) > 1;
}

function isSingleTargetAction(action) {
  return (action?.targets ?? 1) <= 1;
}

function compareAttackMoveTargetScores(a, b, attackAction) {
  const targetLimit = attackAction?.targets ?? 1;
  if (targetLimit <= 1) {
    if (a.hitCount !== b.hitCount) return b.hitCount - a.hitCount;
    if (a.nearestTargetDistance !== b.nearestTargetDistance) {
      return a.nearestTargetDistance - b.nearestTargetDistance;
    }
    if (a.nearestTargetHp !== b.nearestTargetHp) return a.nearestTargetHp - b.nearestTargetHp;
    return 0;
  }

  if ((a.focusHitCount ?? 0) !== (b.focusHitCount ?? 0)) {
    return (b.focusHitCount ?? 0) - (a.focusHitCount ?? 0);
  }
  if (a.hitCount !== b.hitCount) return b.hitCount - a.hitCount;

  const ranged = isRangedAttackAction(attackAction);
  if (ranged && targetLimit > 1 && a.nonPenaltyHitCount !== b.nonPenaltyHitCount) {
    return b.nonPenaltyHitCount - a.nonPenaltyHitCount;
  }

  if (ranged && targetLimit <= 1) {
    const aHasPenaltyFreeTarget = Number.isFinite(a.lowestNonPenaltyHp);
    const bHasPenaltyFreeTarget = Number.isFinite(b.lowestNonPenaltyHp);
    if (aHasPenaltyFreeTarget !== bHasPenaltyFreeTarget) return aHasPenaltyFreeTarget ? -1 : 1;
    if (aHasPenaltyFreeTarget && a.lowestNonPenaltyHp !== b.lowestNonPenaltyHp) {
      return a.lowestNonPenaltyHp - b.lowestNonPenaltyHp;
    }
  }

  if (a.lowestHp !== b.lowestHp) return a.lowestHp - b.lowestHp;
  return 0;
}

function nearestOpponentMoveDistance(actor, tile, opponents, attackAction, approachFields = null) {
  const preferredTargetId = isSingleTargetAction(attackAction) ? null : preferredTargetIdForActor(actor);
  const preferredTarget = preferredTargetId
    ? opponents.find((enemy) => enemy.id === preferredTargetId)
    : null;
  if (preferredTarget) {
    if (!isMeleeAttackAction(attackAction)) return axialDistance(tile, preferredTarget);
    return approachDistanceToTarget(actor, tile, preferredTarget, approachFields?.get(preferredTarget.id));
  }
  if (!isMeleeAttackAction(attackAction)) {
    return Math.min(...opponents.map((enemy) => axialDistance(tile, enemy)));
  }
  return Math.min(...opponents.map((enemy) =>
    approachDistanceToTarget(actor, tile, enemy, approachFields?.get(enemy.id)),
  ));
}

function buildMeleeApproachFields(actor, opponents) {
  return new Map(opponents.map((target) => [
    target.id,
    {
      safe: buildApproachField(actor, target, { avoidTraps: true }),
      fallback: buildApproachField(actor, target, { avoidTraps: false }),
    },
  ]));
}

function buildApproachField(actor, target, options = {}) {
  const avoidTraps = Boolean(options.avoidTraps);
  const goals = directions
    .map((dir) => ({ q: target.q + dir.q, r: target.r + dir.r }))
    .filter((tile) => isTile(tile) && canEndMoveAt(tile, actor, { avoidTraps }));
  const queue = [];
  const distanceByKey = new Map();

  goals.forEach((goal) => {
    const key = hexKey(goal);
    if (distanceByKey.has(key)) return;
    distanceByKey.set(key, 0);
    queue.push(goal);
  });

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentDistance = distanceByKey.get(hexKey(current));
    for (const dir of directions) {
      const next = { q: current.q + dir.q, r: current.r + dir.r };
      const key = hexKey(next);
      if (!isTile(next) || distanceByKey.has(key)) continue;
      if (blocksPath(next, actor, { avoidTraps })) continue;
      distanceByKey.set(key, currentDistance + 1);
      queue.push(next);
    }
  }

  return {
    distanceTo(tile) {
      return distanceByKey.get(hexKey(tile)) ?? Infinity;
    },
  };
}

function approachDistanceToTarget(actor, fromTile, target, approachFields = null) {
  if (axialDistance(fromTile, target) <= 1) return 0;
  if (approachFields) {
    const safeDistance = approachFields.safe.distanceTo(fromTile);
    if (Number.isFinite(safeDistance)) return safeDistance;
    return approachFields.fallback.distanceTo(fromTile);
  }
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
    return {
      hitCount: 0,
      focusHitCount: 0,
      nonPenaltyHitCount: 0,
      lowestHp: Infinity,
      lowestNonPenaltyHp: Infinity,
      lowestIndex: 9999,
      nearestTargetDistance: Infinity,
      nearestTargetHp: Infinity,
    };
  }
  const preferredTargetId = preferredTargetIdForActor(actor);
  if (attackAction.type === "patternAttack") {
    const placement = bestPatternPlacement(attackAction.pattern, tile, effectiveActionRange(actor, attackAction), actor.side, preferredTargetId);
    const nonPenaltyTargets = placement.targets.filter((target) =>
      isPenaltyFreeTargetFromTile(actor, tile, target, attackAction, placement.targets.length),
    );
    return {
      hitCount: placement.targets.length,
      focusHitCount: placement.focusHitCount ?? 0,
      nonPenaltyHitCount: nonPenaltyTargets.length,
      lowestHp: placement.lowestHp,
      lowestNonPenaltyHp: Math.min(...nonPenaltyTargets.map((target) => target.hp), Infinity),
      lowestIndex: placement.lowestIndex,
      nearestTargetDistance: placement.distance ?? Infinity,
      nearestTargetHp: placement.lowestHp,
    };
  }
  const targets = aliveOpponents(actor).filter((target) =>
    canTargetFromTile(tile, actor.side, target, effectiveActionRange(actor, attackAction)),
  );
  const targetLimit = attackAction.targets ?? 1;
  const nearestTarget = targets
    .map((target) => ({
      target,
      distance: targetPriorityDistance(actor, target, attackAction),
    }))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.target.hp !== b.target.hp) return a.target.hp - b.target.hp;
      return (a.target.monsterIndex ?? 0) - (b.target.monsterIndex ?? 0);
    })[0];
  const nonPenaltyTargets = targets.filter((target) =>
    isPenaltyFreeTargetFromTile(actor, tile, target, attackAction, Math.min(targets.length, targetLimit)),
  );
  const focusHitCount = preferredTargetId && targets.some((target) => target.id === preferredTargetId)
    ? 1
    : 0;
  return {
    hitCount: Math.min(targets.length, targetLimit),
    focusHitCount,
    nonPenaltyHitCount: Math.min(nonPenaltyTargets.length, targetLimit),
    lowestHp: Math.min(...targets.map((target) => target.hp), Infinity),
    lowestNonPenaltyHp: Math.min(...nonPenaltyTargets.map((target) => target.hp), Infinity),
    lowestIndex: Math.min(...targets.map((target) => target.monsterIndex ?? 0), 9999),
    nearestTargetDistance: nearestTarget?.distance ?? Infinity,
    nearestTargetHp: nearestTarget?.target.hp ?? Infinity,
  };
}

function isPenaltyFreeTargetFromTile(actor, tile, target, attackAction, targetCount = attackAction?.targets ?? 1) {
  if (!isRangedAttackAction(attackAction)) return true;
  const distance = axialDistance(tile, target);
  if (distance > 1) return true;
  if (actor.permanent?.ignoreAdjacentPenalty) return true;
  const context = {
    actor,
    target,
    action: attackAction,
    distance,
    repeatHits: 0,
    targetCount,
    isMelee: false,
    isRanged: true,
  };
  return effectModifierTotal(actor, "ignoreAdjacentPenalty", context) > 0;
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
  return !occupiedByOtherEntity(tile, actor);
}

function blocksPath(tile, actor, options = {}) {
  if (isWall(tile)) return true;
  if (options.avoidTraps && movementTrapAt(tile)) return true;
  return state.entities.some((entity) => {
    if (!isAlive(entity) || entity.id === actor.id) return false;
    return sameHex(entity, tile) && entity.side !== actor.side;
  });
}

function occupiedByOtherEntity(tile, actor) {
  return state.entities.some((entity) => isAlive(entity) && entity.id !== actor.id && sameHex(entity, tile));
}

async function pushTarget(actor, target, amount) {
  return forceMoveTarget(actor, target, amount, "push");
}

async function pullTarget(actor, target, amount) {
  return forceMoveTarget(actor, target, amount, "pull");
}

async function forceMoveTarget(actor, target, amount, mode) {
  let current = { q: target.q, r: target.r };
  let triggeredTrap = null;
  for (let step = 0; step < amount; step += 1) {
    const next = nextForcedMoveTile(actor, target, current, mode);
    if (!next) break;
    await slideActorTo(target, current, next);
    current = next;
    target.q = current.q;
    target.r = current.r;
    renderBoard();
    triggeredTrap = triggerTrap(target) ?? triggeredTrap;
    if (triggeredTrap === "block" || !isAlive(target)) break;
    await sleep(35);
  }
  return triggeredTrap;
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

async function pushTowardTrap(actor, action) {
  const traps = ownedMovementTraps(actor);
  if (!traps.length) {
    log(`${actor.name} 함정 유도 실패`);
    return;
  }

  const range = action.range ?? actor.baseRange;
  const target = aliveOpponents(actor)
    .filter((enemy) => canTarget(actor, enemy, range))
    .sort((a, b) => {
      const aTrapDistance = nearestTrapDistance(a, traps);
      const bTrapDistance = nearestTrapDistance(b, traps);
      if (aTrapDistance !== bTrapDistance) return aTrapDistance - bTrapDistance;
      if (a.hp !== b.hp) return a.hp - b.hp;
      return (a.monsterIndex ?? 0) - (b.monsterIndex ?? 0);
    })[0];

  if (!target) {
    log(`${actor.name} 함정 유도 실패`);
    return;
  }

  let current = { q: target.q, r: target.r };
  let moved = 0;
  for (let step = 0; step < (action.amount ?? 1); step += 1) {
    const next = nextTrapwardTile(target, current, ownedMovementTraps(actor));
    if (!next) break;
    await slideActorTo(target, current, next);
    target.q = next.q;
    target.r = next.r;
    current = next;
    moved += 1;
    renderBoard();
    const triggeredTrap = triggerTrap(target);
    if (triggeredTrap === "block" || !isAlive(target)) break;
    await sleep(35);
  }

  log(moved ? `${actor.name} ${target.name} 함정 유도` : `${actor.name} 함정 유도 실패`);
  renderBoard();
  renderHud();
}

function ownedMovementTraps(actor) {
  return state.obstacles.filter((obstacle) => obstacle.ownerId === actor.id && isMovementTrap(obstacle));
}

function nearestTrapDistance(tile, traps) {
  return Math.min(...traps.map((trap) => axialDistance(tile, trap)), Infinity);
}

function nextTrapwardTile(target, current, traps) {
  if (!traps.length) return null;
  const currentDistance = nearestTrapDistance(current, traps);
  const candidates = directions
    .map((dir) => ({ q: current.q + dir.q, r: current.r + dir.r }))
    .filter((tile) => isTile(tile) && canEndMoveAt(tile, target))
    .map((tile) => ({ tile, trap: trapAt(tile), trapDistance: nearestTrapDistance(tile, traps) }))
    .filter((item) => item.trapDistance < currentDistance);

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (Boolean(a.trap) !== Boolean(b.trap)) return a.trap ? -1 : 1;
    if (a.trapDistance !== b.trapDistance) return a.trapDistance - b.trapDistance;
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

function placeTrapBehindTarget(actor, action) {
  const target = selectTargets(actor, {
    type: "attack",
    mult: 1,
    range: action.range ?? actor.baseRange,
  })[0];
  if (!target) {
    placeTrap(actor, { ...action, type: "placeTrap", count: action.count ?? 1 });
    return;
  }
  const candidates = directions
    .map((dir) => ({ q: target.q + dir.q, r: target.r + dir.r }))
    .filter((tile) => isTile(tile) && canEndMoveAt(tile, actor) && !trapAt(tile))
    .map((tile) => ({
      tile,
      distanceFromActor: axialDistance(actor, tile),
      targetDistance: axialDistance(target, tile),
    }))
    .filter((item) => item.distanceFromActor > axialDistance(actor, target));
  candidates.sort((a, b) => {
    if (a.distanceFromActor !== b.distanceFromActor) return b.distanceFromActor - a.distanceFromActor;
    return a.targetDistance - b.targetDistance;
  });
  const tile = candidates[0]?.tile;
  if (!tile) {
    placeTrap(actor, { ...action, type: "placeTrap", count: action.count ?? 1 });
    return;
  }
  state.obstacles.push({
    q: tile.q,
    r: tile.r,
    kind: action.trap ?? "attack",
    ownerId: actor.id,
    ownerSide: actor.side,
    power: action.power ?? 2,
    baseAtk: actor.baseAtk,
  });
  log(`${actor.name} ${target.name} 뒤에 함정 설치`);
}

function detonateTrap(actor, action) {
  const traps = state.obstacles.filter((obstacle) => {
    return obstacle.ownerId === actor.id && (obstacle.kind === "attack" || obstacle.kind === "spike" || obstacle.kind === "block");
  });
  if (!traps.length) {
    log(`${actor.name} 함정 폭파 실패`);
    return;
  }
  const radius = action.radius ?? 1;
  const scored = traps.map((trap) => {
    const targets = aliveOpponents(actor).filter((target) => axialDistance(trap, target) <= radius);
    return {
      trap,
      targets,
      lowestHp: Math.min(...targets.map((target) => target.hp), Infinity),
    };
  }).sort((a, b) => {
    if (a.targets.length !== b.targets.length) return b.targets.length - a.targets.length;
    return a.lowestHp - b.lowestHp;
  });
  const best = scored[0];
  if (!best?.targets.length) {
    log(`${actor.name} 함정 폭파 실패`);
    return;
  }
  state.obstacles = state.obstacles.filter((obstacle) => obstacle !== best.trap);
  best.targets.forEach((target) => dealAttackDamage(actor, target, {
    type: "attack",
    mult: action.mult,
    range: actor.baseRange,
  }, action.mult, { targetCount: best.targets.length }));
  log(`${actor.name} 함정 폭파`);
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
    const owner = state.entities.find((entity) => entity.id === meteor.ownerId);
    const targets = state.entities.filter((entity) => {
      return isAlive(entity) && entity.side !== meteor.ownerSide && axialDistance(meteor, entity) <= meteor.radius;
    });
    if (!targets.length) {
      log(`운석 빗나감 (${meteor.q}, ${meteor.r})`);
      return;
    }
    const multiHitBonus = targets.length >= 2 ? owner?.permanent?.meteorMultiDamage ?? 0 : 0;
    targets.forEach((target) => {
      const damage = Math.max(1, Math.round((meteor.baseAtk ?? 10) * meteor.mult * (1 + multiHitBonus)));
      const hitPosition = { q: target.q, r: target.r };
      applyDamage(target, damage);
      if (owner) resolveKillPassives(owner, target);
      if (owner?.permanent?.meteorKillSplash && !isAlive(target)) {
        meteorKillSplash(owner, target, owner.permanent.meteorKillSplash);
      }
      renderBoard();
      renderHud();
      showHitEffect(target, hitPosition, damage);
      log(`운석 -> ${target.name} ${damage} 피해`);
    });
  });
}

function meteorKillSplash(owner, defeatedTarget, mult) {
  aliveOpponents(owner)
    .filter((enemy) => enemy.id !== defeatedTarget.id && axialDistance(enemy, defeatedTarget) <= 1)
    .forEach((enemy) => {
      const damage = Math.max(1, Math.round((owner.baseAtk ?? 10) * mult));
      const hitPosition = { q: enemy.q, r: enemy.r };
      applyDamage(enemy, damage);
      showHitEffect(enemy, hitPosition, damage);
      log(`${owner.name} 하늘 붕괴 -> ${enemy.name} ${damage} 피해`);
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
  const beforeHp = target.hp;
  const damage = dealAttackDamage(actor, target, {
    type: "attack",
    mult: multiplier,
    range: melee ? 1 : actor.baseRange,
    melee,
  }, multiplier);
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
  const actionKind = action.melee || range <= 1 ? "melee" : "ranged";
  const context = {
    actor,
    target: null,
    action,
    distance: 999,
    repeatHits: 0,
    targetCount: action.targets ?? 1,
    isMelee: actionKind === "melee",
    isRanged: actionKind === "ranged",
  };
  return range
    + (actor.charge ?? 0) * (actor.permanent?.chargeRangePerStack ?? 0)
    + effectModifierTotal(actor, "range", context);
}

function consumeChargeForAttack(actor) {
  const charge = actor.charge ?? 0;
  if (!charge) return 0;
  const multiplier = actor.permanent?.chargeStackMultiplier ?? 1;
  const bonus = charge * multiplier;
  log(`${actor.name} 차지 ${charge} 소비`);
  resetAttackCharge(actor);
  return bonus;
}

function resetAttackCharge(actor) {
  if (!actor) return;
  actor.charge = 0;
  actor.temporary = actor.temporary ?? {};
  actor.temporary.cannotMove = false;
  renderHud();
}

function applyOverkillSplash(actor, defeatedTarget, overkillDamage, action = {}) {
  const range = action.overkillSplashRange ?? actor.permanent?.overkillSplashRange;
  if (overkillDamage <= 0 || !range) return;
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

function bestPatternPlacement(pattern, origin, range, side = origin.side, preferredTargetId = null) {
  if (pattern === "adjacent-pair") return bestAdjacentGroupPlacement(origin, range, side, 2, preferredTargetId);
  if (pattern === "adjacent-triple") return bestAdjacentGroupPlacement(origin, range, side, 3, preferredTargetId);
  return { tiles: [], targets: [], focusHitCount: 0, lowestHp: Infinity, lowestIndex: 9999 };
}

function bestAdjacentPair(actorOrTile, range, side = actorOrTile.side) {
  return bestAdjacentGroupPlacement(actorOrTile, range, side, 2).tiles;
}

function bestAdjacentGroupPlacement(actorOrTile, range, side = actorOrTile.side, size = 2, preferredTargetId = null) {
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
          focusHitCount: preferredTargetId && targets.some((target) => target.id === preferredTargetId) ? 1 : 0,
          hitCount: targets.length,
          distance: Math.min(...anchorDistances),
          lowestHp: Math.min(...targets.map((target) => target.hp)),
          lowestIndex: Math.min(...targets.map((target) => target.monsterIndex ?? 0)),
        });
      }
    }
  }
  candidates.sort((a, b) => {
    if ((a.focusHitCount ?? 0) !== (b.focusHitCount ?? 0)) {
      return (b.focusHitCount ?? 0) - (a.focusHitCount ?? 0);
    }
    if (a.hitCount !== b.hitCount) return b.hitCount - a.hitCount;
    if (a.lowestHp !== b.lowestHp) return a.lowestHp - b.lowestHp;
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.lowestIndex - b.lowestIndex;
  });
  return candidates[0] ?? { tiles: [], targets: [], focusHitCount: 0, lowestHp: Infinity, lowestIndex: 9999 };
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

async function clearWave() {
  if (state.waitingReward || state.finished) return;
  const renderToken = ++rewardRenderToken;
  log(`웨이브 ${state.waveIndex + 1} 클리어`);
  if (state.waveIndex >= waves.length - 1) {
    finishRun(true);
    return;
  }
  state.waitingReward = true;
  if (AUTO_ROUTINE_MODE) {
    state.rewardPhase = "auto";
    render();
    showRewards();
    return;
  }
  state.rewardPhase = "passive";
  resetPlayerDecksForWave(playerPartyCharacters());
  await preloadRewardAssets(getSelectedCharacter());
  if (renderToken !== rewardRenderToken || !state.waitingReward || state.finished) return;
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
  if (AUTO_ROUTINE_MODE || state.rewardPhase === "auto") {
    showAutoUpgradeRewards();
    return;
  }
  const rewardPhase = state.rewardPhase ?? "passive";
  const rewards = rewardPhase === "passive" ? drawPassiveRewards() : drawCardRewards();
  state.rewardLocked = false;
  if (elements.rewardInstr) {
    elements.rewardInstr.innerHTML = rewardPhase === "passive"
      ? `획득할 패시브 <b>1개</b>를 선택하세요`
      : `추가할 카드 <b>1장</b>을 선택하세요`;
  }
  elements.rewardCards.innerHTML = "";
  elements.rewardCards.className = `reward-cards reward-phase-${rewardPhase}`;
  rewards.forEach((reward) => {
    const pick = document.createElement("div");
    pick.className = `reward-pick ${rarityClass(reward.rarity)}`;
    pick.setAttribute("role", "button");
    pick.tabIndex = 0;
    pick.innerHTML = `
      <div class="reward-pick-card">
        ${cardMount(reward, "reward-mount", null, getSelectedCharacter())}
        <button type="button" class="card-help-btn" aria-label="이 카드 아이콘 설명">?</button>
      </div>
    `;
    pick.addEventListener("click", () => pickReward(reward, pick));
    pick.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pickReward(reward, pick);
      }
    });
    pick.querySelector(".card-help-btn").addEventListener("click", (event) => {
      event.stopPropagation();
      openCardIconHelp(reward);
    });
    elements.rewardCards.append(pick);
  });
  elements.rewardOverlay.classList.remove("hidden");
}

function showAutoUpgradeRewards() {
  const rewards = drawAutoUpgradeRewards();
  state.rewardLocked = false;
  elements.rewardInstr.innerHTML = `자동 루틴 강화 <b>1개</b>를 선택하세요`;
  elements.rewardCards.innerHTML = "";
  elements.rewardCards.className = "reward-cards reward-phase-auto";
  if (!rewards.length) {
    elements.rewardInstr.innerHTML = `현재 캐릭터 레벨에서 선택 가능한 강화가 없습니다`;
    const skip = document.createElement("button");
    skip.className = "reward-pick auto-upgrade-pick auto-upgrade-skip";
    skip.type = "button";
    skip.innerHTML = `
      <span class="auto-upgrade-meta">
        <span class="auto-upgrade-owner">메타 성장 필요</span>
        <b class="auto-upgrade-rarity">PASS</b>
      </span>
      <strong>다음 웨이브</strong>
      <span>성장 화면에서 캐릭터 레벨을 올리면 더 많은 강화가 등장합니다.</span>
    `;
    skip.addEventListener("click", continueAfterAutoReward);
    elements.rewardCards.append(skip);
    elements.rewardOverlay.classList.remove("hidden");
    return;
  }
  rewards.forEach((reward) => {
    const rarity = autoUpgradeRarity(reward);
    const pick = document.createElement("button");
    pick.className = `reward-pick auto-upgrade-pick auto-owner-${reward.owner} ${rarityClass(rarity)}`;
    pick.type = "button";
    pick.innerHTML = `
      <span class="auto-upgrade-meta">
        <span class="auto-upgrade-owner">${autoRewardOwnerLabel(reward.owner)} · ${reward.route}</span>
        <b class="auto-upgrade-rarity">${rarity}</b>
      </span>
      <strong>${reward.name}</strong>
      <span>${reward.desc}</span>
    `;
    pick.addEventListener("click", () => pickAutoUpgrade(reward));
    elements.rewardCards.append(pick);
  });
  elements.rewardOverlay.classList.remove("hidden");
}

function drawAutoUpgradeRewards() {
  const choiceCount = AUTO_REWARD_CHOICES;
  const pool = autoUpgradeCatalog.filter((upgrade) => isAutoUpgradeAvailable(upgrade));
  const selected = shuffle(pool).slice(0, choiceCount);
  if (selected.length >= choiceCount) return selected;
  return [
    ...selected,
    ...drawAutoTrainingFallbackRewards(choiceCount - selected.length, selected),
  ].slice(0, choiceCount);
}

function drawAutoTrainingFallbackRewards(count, selected = []) {
  if (count <= 0) return [];
  const selectedOwnerCounts = selected.reduce((counts, reward) => {
    counts.set(reward.owner, (counts.get(reward.owner) ?? 0) + 1);
    return counts;
  }, new Map());
  return shuffle(playerPartyCharacters())
    .sort((a, b) => (selectedOwnerCounts.get(a.id) ?? 0) - (selectedOwnerCounts.get(b.id) ?? 0))
    .slice(0, count)
    .map(createAutoTrainingFallbackReward);
}

function createAutoTrainingFallbackReward(character) {
  const percent = Math.round(AUTO_TRAINING_FALLBACK_BONUS * 100);
  return {
    id: `auto-training-${character.id}`,
    owner: character.id,
    route: "훈련",
    name: `${character.name} 집중 훈련`,
    desc: `${character.name} 기본 공격력이 ${percent}% 증가한다.`,
    repeatable: true,
    apply: () => increaseAutoHeroBaseAtkPercent(character.id, AUTO_TRAINING_FALLBACK_BONUS),
  };
}

function isAutoUpgradeAvailable(upgrade) {
  const picked = state.autoPickedUpgradeIds ?? new Set();
  if (!ENABLE_PARTY_SYNERGY_UPGRADES && isPartySynergyUpgrade(upgrade)) return false;
  if (picked.has(upgrade.id)) return false;
  if (isAutoUpgradeRouteConflict(upgrade, picked)) return false;
  if (!isAutoUpgradeMetaUnlocked(upgrade)) return false;
  if (upgrade.requires?.some((id) => !picked.has(id))) return false;
  if (upgrade.requiresAny?.length && !upgrade.requiresAny.some((id) => picked.has(id))) return false;
  return true;
}

function isPartySynergyUpgrade(upgrade) {
  return upgrade?.owner === "party";
}

function isAutoUpgradeRouteConflict(upgrade, picked) {
  if (upgrade?.owner !== "archer") return false;
  const pickedRoutes = new Set(autoUpgradeCatalog
    .filter((item) => picked.has(item.id))
    .map((item) => item.route));
  if (upgrade.route === "차지" && pickedRoutes.has("연타")) return true;
  if (upgrade.route === "연타" && pickedRoutes.has("차지")) return true;
  return false;
}

function pickAutoUpgrade(reward) {
  if (state.rewardLocked) return;
  state.rewardLocked = true;
  elements.rewardOverlay.classList.add("hidden");
  state.autoPickedUpgradeIds = state.autoPickedUpgradeIds ?? new Set();
  state.autoUpgrades = state.autoUpgrades ?? [];
  if (!reward.repeatable) state.autoPickedUpgradeIds.add(reward.id);
  state.autoUpgrades.push(reward);
  reward.apply();
  log(`루틴 강화: ${reward.name}`);
  state.rewardLocked = false;
  state.waitingReward = false;
  state.rewardPhase = "auto";
  state.waveIndex += 1;
  startWave(state.waveIndex);
  render();
  scheduleTurn();
}

function continueAfterAutoReward() {
  if (state.rewardLocked) return;
  state.rewardLocked = true;
  elements.rewardOverlay.classList.add("hidden");
  log("선택 가능한 루틴 강화 없음");
  state.rewardLocked = false;
  state.waitingReward = false;
  state.rewardPhase = "auto";
  state.waveIndex += 1;
  startWave(state.waveIndex);
  render();
  scheduleTurn();
}

function autoRewardOwnerLabel(owner) {
  if (owner === "party") return "파티";
  return characterDefinitions[owner]?.name ?? owner;
}

function autoUpgradeRarity(upgrade) {
  const depth = autoUpgradeDepth(upgrade);
  if (depth >= 3) return "전설";
  if (depth >= 2) return "에픽";
  if (depth >= 1) return "레어";
  return "노말";
}

function autoUpgradeMetaRequirement(upgrade) {
  const customRequirement = autoUpgradeLevelRequirementOverride(upgrade);
  if (customRequirement) return customRequirement;
  if (upgrade.metaLevel) return clampMetaLevel(upgrade.metaLevel);
  const depth = autoUpgradeDepth(upgrade);
  if (upgrade.owner === "party") return Math.min(META_LEVEL_MAX, 4 + depth * 2);
  if (upgrade.route === "공용") return Math.min(META_LEVEL_MAX, 1 + depth);
  if (depth === 0) return 2;
  if (depth === 1) return 4;
  if (depth === 2) return 6;
  return META_LEVEL_MAX;
}

function autoUpgradeLevelRequirementOverride(upgrade) {
  if (!upgrade?.id) return null;
  return sanitizeMetaRequirement(autoUpgradeRules?.levelRequirements?.[upgrade.id]);
}

function autoUpgradeOwnerMetaLevel(upgrade) {
  if (upgrade.owner === "party") return partyMetaLevel();
  return characterMetaLevel(upgrade.owner);
}

function partyMetaLevel() {
  const levels = playerPartyCharacters().map((character) => characterMetaLevel(character.id));
  if (!levels.length) return META_LEVEL_MIN;
  return Math.floor(levels.reduce((sum, level) => sum + level, 0) / levels.length);
}

function isAutoUpgradeMetaUnlocked(upgrade) {
  if (!ENABLE_PARTY_SYNERGY_UPGRADES && isPartySynergyUpgrade(upgrade)) return false;
  return autoUpgradeOwnerMetaLevel(upgrade) >= autoUpgradeMetaRequirement(upgrade);
}

function autoUpgradeDepth(upgrade, seen = new Set()) {
  if (!upgrade || seen.has(upgrade.id)) return 0;
  const requirements = [...(upgrade.requires ?? []), ...(upgrade.requiresAny ?? [])];
  if (!requirements.length) return 0;
  seen.add(upgrade.id);
  const depths = requirements.map((id) => {
    const prerequisite = autoUpgradeCatalog.find((item) => item.id === id);
    return autoUpgradeDepth(prerequisite, new Set(seen));
  });
  return 1 + Math.max(0, ...depths);
}

function openMetaGrowth() {
  renderMetaGrowth();
  elements.metaGrowthOverlay?.classList.remove("hidden");
}

function closeMetaGrowth() {
  elements.metaGrowthOverlay?.classList.add("hidden");
}

function renderMetaGrowth() {
  if (!elements.metaGrowthContent) return;
  const characterCards = playerPartyCharacters()
    .map((character) => metaCharacterCardMarkup(character))
    .join("");
  const growthSummary = ENABLE_PARTY_SYNERGY_UPGRADES
    ? `
      <div class="meta-growth-party">
        <span>파티 평균 Lv.${partyMetaLevel()}</span>
        <strong>레벨이 오르면 런 중 선택지 풀과 플레이 가능한 트리가 넓어집니다.</strong>
      </div>
    `
    : `
      <div class="meta-growth-party">
        <span>캐릭터 성장</span>
        <strong>각 캐릭터 레벨이 오르면 런 중 선택지 풀과 플레이 가능한 트리가 넓어집니다.</strong>
      </div>
    `;
  elements.metaGrowthContent.innerHTML = `
    ${growthSummary}
    <div class="meta-character-grid">${characterCards}</div>
    ${metaPartySynergyMarkup()}
  `;
}

function metaCharacterCardMarkup(character) {
  const level = characterMetaLevel(character.id);
  const upgrades = autoUpgradeCatalog.filter((upgrade) => upgrade.owner === character.id);
  const routeMarkup = metaRouteGroupsMarkup(upgrades);
  return `
    <article class="meta-character-card auto-owner-${character.id}">
      <header class="meta-character-head">
        <span class="meta-character-portrait">${portraitContent(character.image, character.shortLabel ?? character.name, "meta-character-img")}</span>
        <div>
          <strong>${escapeMarkup(character.name)}</strong>
          <span>Lv.${level} / ${META_LEVEL_MAX}</span>
        </div>
        <div class="meta-level-controls">
          <button type="button" data-meta-level-step="-1" data-character-id="${character.id}" aria-label="${character.name} 레벨 내리기">-</button>
          <button type="button" data-meta-level-step="1" data-character-id="${character.id}" aria-label="${character.name} 레벨 올리기">+</button>
        </div>
      </header>
      <div class="meta-level-bar" aria-hidden="true"><i style="width: ${(level / META_LEVEL_MAX) * 100}%"></i></div>
      ${routeMarkup}
    </article>
  `;
}

function metaPartySynergyMarkup() {
  if (!ENABLE_PARTY_SYNERGY_UPGRADES) return "";
  const upgrades = autoUpgradeCatalog.filter((upgrade) => upgrade.owner === "party");
  if (!upgrades.length) return "";
  return `
    <article class="meta-party-card auto-owner-party">
      <header class="meta-party-head">
        <strong>파티 시너지</strong>
        <span>평균 Lv.${partyMetaLevel()} 기준</span>
      </header>
      ${metaRouteGroupsMarkup(upgrades)}
    </article>
  `;
}

function metaRouteGroupsMarkup(upgrades) {
  const routes = new Map();
  upgrades.forEach((upgrade) => {
    if (!routes.has(upgrade.route)) routes.set(upgrade.route, []);
    routes.get(upgrade.route).push(upgrade);
  });
  return [...routes.entries()].map(([route, routeUpgrades]) => `
    <section class="meta-route-group">
      <h3>${escapeMarkup(route)}</h3>
      <ul>
        ${routeUpgrades
          .sort((a, b) => autoUpgradeMetaRequirement(a) - autoUpgradeMetaRequirement(b) || autoUpgradeDepth(a) - autoUpgradeDepth(b))
          .map(metaUpgradeItemMarkup)
          .join("")}
      </ul>
    </section>
  `).join("");
}

function metaUpgradeItemMarkup(upgrade) {
  const rarity = autoUpgradeRarity(upgrade);
  const requiredLevel = autoUpgradeMetaRequirement(upgrade);
  const unlocked = isAutoUpgradeMetaUnlocked(upgrade);
  const picked = state?.autoPickedUpgradeIds?.has(upgrade.id);
  const status = picked ? "선택됨" : unlocked ? "해금" : `Lv.${requiredLevel}`;
  const desc = unlocked ? upgrade.desc : `${autoRewardOwnerLabel(upgrade.owner)} Lv.${requiredLevel} 필요`;
  return `
    <li class="meta-upgrade-item ${rarityClass(rarity)} ${unlocked ? "unlocked" : "locked"} ${picked ? "picked" : ""}">
      <div>
        <strong>${escapeMarkup(upgrade.name)}</strong>
        <span>${escapeMarkup(desc)}</span>
      </div>
      <b>${status}</b>
    </li>
  `;
}

function drawPassiveRewards() {
  const character = getSelectedCharacter();
  return drawRewardOptions(character.passivePool ?? [], 3);
}

function drawCardRewards() {
  const character = getSelectedCharacter();
  const basePool = character.rewardPool.filter((entry) => !isPassiveCard(entry));
  const pool = character.id === "archer"
    ? basePool.filter((entry) => isArcherRewardUnlocked(entry))
    : basePool;
  const safePool = pool.length >= 4 ? pool : basePool;
  return drawRewardOptions(safePool, 4);
}

function drawRewardOptions(pool, count) {
  if (isBossReward()) return drawBossRewardOptions(pool, count);
  const selected = [];
  const remaining = [...pool];
  const weights = currentNormalRewardRarityWeights();
  while (selected.length < count && remaining.length) {
    const rarity = rollRewardRarity(weights);
    let candidates = remaining.filter((entry) => entry.rarity === rarity);
    if (!candidates.length) candidates = remaining;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    selected.push(picked);
    remaining.splice(remaining.indexOf(picked), 1);
  }
  return selected.map((entry) => ({
    ...entry,
    instanceId: `${entry.id}-${Date.now()}-${Math.random()}`,
  }));
}

function drawBossRewardOptions(pool, count) {
  const legendaryPool = pool.filter((entry) => entry.rarity === "전설");
  const sourcePool = legendaryPool.length ? legendaryPool : pool;
  if (!sourcePool.length) return [];
  const selected = [];
  const allowDuplicates = sourcePool.length < count;
  const remaining = [...sourcePool];
  while (selected.length < count && (allowDuplicates || remaining.length)) {
    const candidates = allowDuplicates ? sourcePool : remaining;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    selected.push(picked);
    if (!allowDuplicates) remaining.splice(remaining.indexOf(picked), 1);
  }
  return selected.map((entry, index) => ({
    ...entry,
    instanceId: `${entry.id}-${Date.now()}-${Math.random()}-${index}`,
  }));
}

function isBossReward() {
  return Boolean(waves[state?.waveIndex]?.boss);
}

function currentNormalRewardRarityWeights() {
  const waveNumber = (state?.waveIndex ?? 0) + 1;
  return NORMAL_REWARD_RARITY_WEIGHT_TIERS.find((tier) => waveNumber <= tier.maxWave)?.weights
    ?? NORMAL_REWARD_RARITY_WEIGHT_TIERS.at(-1).weights;
}

function rollRewardRarity(weights) {
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) return entry.rarity;
  }
  return weights.at(-1)?.rarity ?? "노말";
}

function isArcherRewardUnlocked(cardData) {
  if (state?.rewardPickCount === 0) return archerFirstRewardIds.has(cardData.id);

  const rule = archerRewardUnlockRules[cardData.id];
  if (!rule) return true;
  return archerRewardRuleSatisfied(rule);
}

function archerRewardRuleSatisfied(rule) {
  if (!rule) return true;
  if (rule.minPicks && (state?.rewardPickCount ?? 0) < rule.minPicks) return false;
  if (rule.tags && !rule.tags.every((tag) => state?.rewardTags?.has(tag))) return false;
  if (rule.pickedIds && !rule.pickedIds.every((id) => state?.pickedRewardIds?.has(id))) return false;
  if (rule.routeCounts) {
    const routeCounts = state?.rewardRouteCounts ?? {};
    const hasRouteCounts = Object.entries(rule.routeCounts).every(
      ([route, count]) => (routeCounts[route] ?? 0) >= count,
    );
    if (!hasRouteCounts) return false;
  }
  if (rule.anyOf && !rule.anyOf.some((option) => archerRewardRuleSatisfied(option))) return false;
  return true;
}

function recordRewardPick(cardData, options = {}) {
  if (!state) return;
  if (options.countPick !== false) {
    state.rewardPickCount = (state.rewardPickCount ?? 0) + 1;
  }
  state.rewardTags = state.rewardTags ?? new Set();
  state.rewardRouteCounts = state.rewardRouteCounts ?? {};
  state.pickedRewardIds = state.pickedRewardIds ?? new Set();
  state.pickedRewardIds.add(cardData.id);
  if (cardData.route && cardData.route !== "공용" && cardData.route !== "기본") {
    state.rewardRouteCounts[cardData.route] = (state.rewardRouteCounts[cardData.route] ?? 0) + 1;
  }
  rewardTagsForCard(cardData).forEach((tag) => state.rewardTags.add(tag));
}

function rewardTagsForCard(cardData) {
  const tags = new Set();
  if (cardData.route === "다단중첩") tags.add("multi");
  if (cardData.route === "함정") tags.add("trap");
  if (cardData.route === "차지") tags.add("charge");

  const actions = cardData.actions ?? [];
  const attackActions = actions.filter((action) => action.type === "attack" || action.type === "patternAttack");
  if (attackActions.length >= 2 || attackActions.some((action) => action.preferPreviousTarget)) tags.add("multi");

  actions.forEach((action) => {
    if (action.type === "charge") tags.add("charge");
    if (action.type === "placeTrap" || action.type === "placeTrapBehindTarget" || action.type === "detonateTrap") {
      tags.add("trap");
    }
    if (action.push) tags.add("push");
    if ((action.type === "attack" || action.type === "patternAttack") && (action.range ?? 1) >= 3) tags.add("range");
    if (action.targets && action.targets >= 2) tags.add("multi");
    if (action.sameTargetBonus || action.thirdHitBonus) tags.add("multi");
    if (action.modifiers?.some((modifier) => modifier.stat === "range" || modifier.stat === "ignoreAdjacentPenalty")) {
      tags.add("range");
    }
    if (action.effect) {
      if (action.effect.includes("combo") || action.effect.includes("thirdHit")) tags.add("multi");
      if (action.effect.includes("trap")) tags.add("trap");
      if (action.effect.includes("charge")) tags.add("charge");
      if (action.effect.includes("Range") || action.effect.includes("range")) tags.add("range");
    }
  });

  return tags;
}

async function pickReward(reward, button) {
  if (state.rewardLocked) return;
  state.rewardLocked = true;
  const preStartReward = state.preStartReward;
  const passiveReward = (state.rewardPhase ?? "passive") === "passive";
  const rewardOwner = rewardOwnerId();

  const mount = button.querySelector(".reward-mount") || button;
  const startRect = mount.getBoundingClientRect();
  const cps = getComputedStyle(mount).getPropertyValue("--cps").trim();

  const flyer = document.createElement("div");
  flyer.className = "reward-flyer";
  flyer.style.left = `${startRect.left}px`;
  flyer.style.top = `${startRect.top}px`;
  flyer.style.width = `${startRect.width}px`;
  flyer.style.height = `${startRect.height}px`;
  const clone = mount.cloneNode(true);
  if (cps) clone.style.setProperty("--cps", cps);
  flyer.appendChild(clone);
  document.body.appendChild(flyer);

  elements.rewardOverlay.classList.add("hidden");
  elements.rewardCards.innerHTML = "";
  recordRewardPick(reward, { countPick: !passiveReward });

  if (passiveReward) {
    applyPassiveReward(reward, rewardOwner);
  } else {
    addPlayerOwnedCard(reward, rewardOwner);
  }

  const cardCx = startRect.left + startRect.width / 2;
  const cardCy = startRect.top + startRect.height / 2;
  const centerX = window.innerWidth / 2 - cardCx;
  const centerY = window.innerHeight * 0.4 - cardCy;
  await nextFrame();
  flyer.classList.add("to-center");
  flyer.style.transform = `translate(${centerX}px, ${centerY}px) scale(1.5)`;
  await sleep(840);

  const deckTarget =
    document.querySelector('.resource-item[data-resource="deck"]') ||
    document.querySelector(".resource-hud") ||
    document.querySelector(".battle-top-hud");
  flyer.classList.remove("to-center");
  if (passiveReward) {
    flyer.style.transform = `translate(${centerX}px, ${centerY}px) scale(1.35)`;
    flyer.style.opacity = "0";
  } else {
    flyer.classList.add("to-deck");
  }
  if (!passiveReward && deckTarget) {
    const endRect = deckTarget.getBoundingClientRect();
    const dx = endRect.left + endRect.width / 2 - cardCx;
    const dy = endRect.top + endRect.height / 2 - cardCy;
    flyer.style.transform = `translate(${dx}px, ${dy}px) scale(0.07) rotate(-12deg)`;
    flyer.style.opacity = "0";
  } else if (!passiveReward) {
    flyer.style.transform = "translateY(60vh) scale(0.08)";
    flyer.style.opacity = "0";
  }

  await sleep(360);
  if (!passiveReward) {
    addPlayerCardToDeck(reward, rewardOwner, { shuffle: preStartReward });
  }
  renderPlayerHud();
  if (!passiveReward && deckTarget) {
    deckTarget.classList.remove("resource-pop");
    void deckTarget.offsetWidth;
    deckTarget.classList.add("resource-pop");
  }
  await sleep(440);
  flyer.remove();

  state.rewardLocked = false;
  log(`보상 선택: ${reward.name}`);
  if (passiveReward) {
    state.rewardPhase = "card";
    render();
    showRewards();
    return;
  }

  state.rewardPhase = "passive";
  if (preStartReward) {
    state.preStartReward = false;
    state.waitingReward = false;
  } else {
    state.waveIndex += 1;
    startWave(state.waveIndex);
  }
  render();
  scheduleTurn();
}

function isPassiveAction(action) {
  return action?.type === "passive" || action?.type === "permanent";
}

function isPassiveCard(cardData) {
  return cardData?.actions?.some(isPassiveAction);
}

function applyPassiveReward(cardData, actorOrId = rewardOwnerId()) {
  const actorId = resolvePlayerActorId(actorOrId);
  const player = state.entities.find((entity) => entity.id === actorId && entity.side === "player") ?? getPlayer();
  if (!player) return;
  state.passiveCards = state.passiveCards ?? [];
  state.passiveCards.push(cardData);
  cardData.actions.filter(isPassiveAction).forEach((action) => applyPassiveAction(player, action, cardData));
}

function render() {
  renderBoard();
  renderHud();
  renderEnemySummary();
  renderPriorityStrip();
  renderEnemyActionHud();
  renderPlayerHud();
  renderTurnPlanner();
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
      case "placeTrapBehindTarget":
        parts.push({ kind: trapIconKind(a), val: a.count ?? 1, tone: "special" });
        break;
      case "pushTowardTrap":
        parts.push({ kind: "trap-burst", val: a.amount ?? 1, tone: "special" });
        break;
      case "detonateTrap":
        parts.push({ kind: "trap-burst", val: "x" + a.mult, tone: "attack" });
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
      case "passive":
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
  return `<span class="intent-badge tone-${tone} ${side} ${done ? "done" : ""} ${active ? "active" : ""}" aria-hidden="true"><span class="intent-pri">${timelinePriority(entry)}</span>${chips}</span>`;
}

function renderBoard() {
  const aliveEntityIds = new Set(state.entities.filter(isAlive).map((entity) => String(entity.id)));
  [...elements.board.children].forEach((child) => {
    if (child.classList.contains("hex") || child.classList.contains("damage-pop")) return;
    if (child.classList.contains("entity") && aliveEntityIds.has(child.dataset.entityId)) return;
    child.remove();
  });
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
    const activeEntry =
      state.activeTimelineIndex >= 0 ? state.currentTimeline[state.activeTimelineIndex] : null;
    const acting =
      activeEntry &&
      ((activeEntry.actorType === "player" && entity.id === activeEntry.actorId) ||
        (activeEntry.actorType !== "player" &&
          entity.side !== "player" &&
          entity.kind === activeEntry.actorId));
    const focused = entity.side === "enemy" && state.focusTargetId === entity.id;
    const enemyTargeted = Object.values(state.enemyTargetIds ?? {}).includes(entity.id);
    const marked = entity.side === "enemy" && Boolean(entity.temporary?.autoMarked);
    const planningSelectable = state.turnPlanning && entity.side === "enemy";
    const character = entity.side === "player"
      ? characterDefinitions[entity.characterId] ?? getSelectedCharacter()
      : null;
    const image = entityImage(entity, bounds);
    const hasToken = Boolean(character?.tokenImages);
    const label = entityLabel(entity);
    let div = elements.board.querySelector(entityDomSelector(entity.id));
    if (!div) {
      div = document.createElement("div");
      div.dataset.entityId = entity.id;
      elements.board.append(div);
    }
    const className = `entity ${entity.side} ${entity.boss ? "boss" : ""} ${acting ? "acting" : ""} ${focused ? "focused" : ""} ${enemyTargeted ? "enemy-targeted" : ""} ${marked ? "marked" : ""} ${planningSelectable ? "selectable" : ""} ${image ? "has-art" : ""} ${hasToken ? "has-token" : ""}`;
    if (div.className !== className) div.className = className;
    div.dataset.entityId = entity.id;
    if (div.dataset.image !== (image ?? "") || div.dataset.label !== label) {
      div.dataset.image = image ?? "";
      div.dataset.label = label;
      div.innerHTML = `
        ${image ? spriteImg(image, "entity-art") : `<span class="entity-label">${label}</span>`}
        <span class="mark-badge" aria-hidden="true">표</span>
        <span class="hp-readout"></span>
        <span class="hp-bar" aria-hidden="true"><i></i></span>
      `;
    }
    const hpText = `${entity.hp}/${entity.maxHp}`;
    const hpReadout = div.querySelector(".hp-readout");
    if (hpReadout && hpReadout.textContent !== hpText) hpReadout.textContent = hpText;
    const hpFill = div.querySelector(".hp-bar i");
    if (hpFill) hpFill.style.width = `${hpPercent(entity)}%`;
    div.title = `${entity.name} ${entity.hp}/${entity.maxHp}`;
    div.style.left = `${point.x}px`;
    div.style.top = `${point.y}px`;
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
  state.offscreenIndicatorElements = state.offscreenIndicatorElements ?? new Map();
  if (state.cameraMode !== "focus") {
    clearOffscreenEnemyIndicators();
    return;
  }
  const player = getPlayer();
  if (!player) {
    clearOffscreenEnemyIndicators();
    return;
  }

  const panelWidth = elements.boardPanel.clientWidth;
  const panelHeight = elements.boardPanel.clientHeight;
  const scale = state.cameraScale || Number.parseFloat(elements.board.style.getPropertyValue("--board-scale")) || 1;
  const offsetX = Number.isFinite(state.cameraX)
    ? state.cameraX
    : Number.parseFloat(elements.board.style.getPropertyValue("--board-x")) || 0;
  const offsetY = Number.isFinite(state.cameraY)
    ? state.cameraY
    : Number.parseFloat(elements.board.style.getPropertyValue("--board-y")) || 0;
  const playerPoint = screenPointForHex(player, bounds, scale, offsetX, offsetY);
  const visible = {
    left: 60,
    right: panelWidth - 60,
    top: Math.min(panelHeight - 72, Math.max(132, panelHeight * 0.16)),
    bottom: panelHeight - 50,
  };
  const occupied = [];
  const visibleBoard = {
    left: -48,
    right: panelWidth + 48,
    top: -48,
    bottom: panelHeight + 48,
  };
  const visibleIndicatorIds = new Set();

  aliveEnemies().forEach((enemy) => {
    const enemyPoint = screenPointForHex(enemy, bounds, scale, offsetX, offsetY);
    const indicatorId = String(enemy.id);
    if (isPointInsideRect(enemyPoint, visibleBoard)) {
      removeOffscreenEnemyIndicator(indicatorId);
      return;
    }

    const dx = enemyPoint.x - playerPoint.x;
    const dy = enemyPoint.y - playerPoint.y;
    const position = placeOffscreenIndicator(enemyPoint, visible, occupied);
    let indicator = state.offscreenIndicatorElements.get(indicatorId);
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = "offscreen-indicator";
      indicator.innerHTML = `
        <span class="offscreen-arrow"></span>
        <span class="offscreen-enemy"></span>
        <span class="offscreen-distance"></span>
        <span class="offscreen-unit">칸</span>
      `;
      indicator._offscreenParts = {
        arrow: indicator.querySelector(".offscreen-arrow"),
        enemy: indicator.querySelector(".offscreen-enemy"),
        distance: indicator.querySelector(".offscreen-distance"),
      };
      state.offscreenIndicatorElements.set(indicatorId, indicator);
      elements.boardPanel.append(indicator);
    }
    const parts = indicator._offscreenParts;
    indicator.classList.toggle("boss", Boolean(enemy.boss));
    indicator.style.left = `${position.x}px`;
    indicator.style.top = `${position.y}px`;
    if (parts?.arrow) parts.arrow.textContent = directionArrow(dx, dy);
    if (parts?.enemy) parts.enemy.textContent = enemy.label ?? enemy.monsterIndex;
    if (parts?.distance) parts.distance.textContent = axialDistance(player, enemy);
    visibleIndicatorIds.add(indicatorId);
  });

  for (const id of Array.from(state.offscreenIndicatorElements.keys())) {
    if (!visibleIndicatorIds.has(id)) removeOffscreenEnemyIndicator(id);
  }
}

function clearOffscreenEnemyIndicators() {
  if (!state?.offscreenIndicatorElements) return;
  state.offscreenIndicatorElements.forEach((indicator) => indicator.remove());
  state.offscreenIndicatorElements.clear();
}

function removeOffscreenEnemyIndicator(id) {
  const indicator = state.offscreenIndicatorElements?.get(id);
  if (!indicator) return;
  indicator.remove();
  state.offscreenIndicatorElements.delete(id);
}

function isPointInsideRect(point, rect) {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
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
  renderOffscreenEnemyIndicators(bounds);
  if (refreshAfterTransition) {
    window.setTimeout(() => {
      if (!state || state.cameraMode !== "focus") return;
      const currentBounds = boardBounds();
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
  elements.deckCount.textContent = totalPlayerDeckCount();
  elements.discardCount.textContent = totalPlayerDiscardCount();
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
    const timelineEntry = displayTimelineEntries().find((entry) => {
      return entry.actorType !== "player" && entry.actorId === group.kind && !displayEntryDone(entry);
    });
    const priority = timelineEntry ? timelinePriority(timelineEntry) : null;
    const div = document.createElement("article");
    div.className = `enemy-group ${sample?.boss ? "boss" : ""}`;
    div.innerHTML = `
      <div class="enemy-card-head">
        <div class="combatant-portrait enemy-portrait">${portraitContent(definition.image, definition.label ?? sample?.label ?? "적", "portrait-art")}</div>
        <div class="combatant-heading">
          <strong>${sample?.boss || sample?.elite ? sample.name : definition.name}</strong>
          <span>x${group.enemies.length}</span>
        </div>
      </div>
      <div class="enemy-summary-action">
        ${priority ? `<span class="enemy-summary-priority">${priority}</span>` : ""}
        <span class="enemy-summary-icons">${timelineEntry ? renderCompactActionList(timelineEntry.card) : baseStat("move", "이동", sample?.baseMove ?? definition.baseMove)}</span>
      </div>
    `;
    elements.enemySummary.append(div);
  });
}

function renderEnemyActionHud() {
  if (!elements.enemyActionHud) return;
  const entry = !state.priorityRevealMode && state.activeTimelineIndex >= 0
    ? state.currentTimeline[state.activeTimelineIndex]
    : null;

  if (!entry || entry.actorType === "player") {
    elements.enemyActionHud.className = "enemy-action-hud";
    elements.enemyActionHud.innerHTML = "";
    elements.enemyActionHud.dataset.signature = "";
    delete elements.enemyActionHud.dataset.cardKey;
    elements.enemyActionHud.removeAttribute("role");
    elements.enemyActionHud.removeAttribute("tabindex");
    elements.enemyActionHud.removeAttribute("aria-label");
    return;
  }

  const groupEnemies = aliveEnemies()
    .filter((enemy) => enemy.kind === entry.actorId)
    .sort((a, b) => a.monsterIndex - b.monsterIndex);
  if (!groupEnemies.length) {
    elements.enemyActionHud.className = "enemy-action-hud";
    elements.enemyActionHud.innerHTML = "";
    elements.enemyActionHud.dataset.signature = "";
    delete elements.enemyActionHud.dataset.cardKey;
    elements.enemyActionHud.removeAttribute("role");
    elements.enemyActionHud.removeAttribute("tabindex");
    elements.enemyActionHud.removeAttribute("aria-label");
    return;
  }

  const sample = groupEnemies[0];
  const definition = monsterDefinitions[entry.actorId] ?? monsterDefinitions.brute;
  const boss = groupEnemies.some((enemy) => enemy.boss);
  const name = boss && sample ? sample.name : definition.name;
  const count = groupEnemies.length;
  const cardKey = cardRuntimeKey(entry.card);
  const signature = `${entry.actorId}:${cardKey}:${count}:${boss}`;

  elements.enemyActionHud.className = `enemy-action-hud show ${boss ? "boss" : ""}`;
  if (elements.enemyActionHud.dataset.signature === signature) return;
  elements.enemyActionHud.dataset.signature = signature;
  elements.enemyActionHud.dataset.cardKey = cardKey;
  elements.enemyActionHud.setAttribute("role", "button");
  elements.enemyActionHud.tabIndex = 0;
  elements.enemyActionHud.setAttribute("aria-label", `${entry.card.name} 확대`);
  elements.enemyActionHud.innerHTML = `
    <div class="enemy-action-info">
      <span class="enemy-action-kicker">적 행동</span>
      <div class="enemy-action-head">
        <span class="combatant-portrait enemy-portrait">${portraitContent(definition.image, definition.label ?? "적", "portrait-art")}</span>
        <div class="combatant-heading">
          <strong>${name}</strong>
          ${count > 1 ? `<span>x${count}</span>` : ""}
        </div>
      </div>
      ${sample ? renderBaseStats(sample) : ""}
    </div>
    ${cardMount(entry.card, "enemy-action-mount monster-card-mount", null, definition)}
  `;
}

function renderPriorityStrip() {
  const executing = !state.priorityRevealMode && state.activeTimelineIndex >= 0;
  elements.priorityStrip.className = `priority-strip ${state.priorityRevealMode ? `reveal-${state.priorityRevealMode}` : ""} ${executing ? "executing" : ""}`.trim();
  if (!state.currentTimeline.length) {
    if (state.priorityStripSignature !== "empty") {
      elements.priorityStrip.replaceChildren(priorityEmptyElement());
      state.priorityStripSignature = "empty";
      state.priorityStripItems.clear();
    }
    return;
  }

  const timelineEntries = state.currentTimeline;
  const timelineKeys = timelineEntries.map(priorityEntryKey);
  const signature = timelineKeys.join("|");
  const activeKeys = new Set(timelineKeys);
  state.priorityStripItems.forEach((item, key) => {
    if (!activeKeys.has(key)) state.priorityStripItems.delete(key);
  });

  timelineEntries.forEach((entry, index) => {
    const key = timelineKeys[index];
    let item = state.priorityStripItems.get(key);
    if (!item) {
      item = createPriorityItem();
      state.priorityStripItems.set(key, item);
    }
    updatePriorityItem(item, entry, index);
  });

  if (state.priorityStripSignature !== signature) {
    const fragment = document.createDocumentFragment();
    timelineKeys.forEach((key) => fragment.append(state.priorityStripItems.get(key)));
    elements.priorityStrip.replaceChildren(fragment);
    state.priorityStripSignature = signature;
  }
}

function priorityEntryKey(entry) {
  return `${entry.actorType}:${entry.actorId}:${entry.card.instanceId ?? entry.card.id}`;
}

function priorityEmptyElement() {
  const empty = document.createElement("span");
  empty.className = "priority-empty";
  empty.textContent = "카드 대기";
  return empty;
}

function createPriorityItem() {
  const item = document.createElement("div");
  item.className = "priority-item";
  return item;
}

function updatePriorityItem(item, entry, timelineIndex = -1) {
  const isPlayer = entry.actorType === "player";
  const groupEnemies = isPlayer ? [] : aliveEnemies().filter((e) => e.kind === entry.actorId);
  const boss = groupEnemies.some((e) => e.boss);
  const count = isPlayer ? 1 : groupEnemies.length;
  const cardOwner = isPlayer ? characterForActorId(entry.actorId) : monsterDefinitions[entry.actorId] ?? monsterDefinitions.brute;
  const className = [
    "priority-item",
    isPlayer ? "player" : "enemy",
    boss ? "boss" : "",
    state.completedTimelineIndexes?.has(timelineIndex) ? "done" : "",
    timelineIndex === state.activeTimelineIndex ? "active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const priority = timelinePriority(entry);
  const cardKey = cardRuntimeKey(entry.card);
  const contentSignature = `${cardKey}:${priority}:${count}:${cardOwner.image ?? ""}`;

  if (item.dataset.contentSignature !== contentSignature) {
    const cardMountClass = `priority-card-mount ${isPlayer ? "" : "monster-card-mount"}`.trim();
    item.innerHTML = `
      ${cardMount(entry.card, cardMountClass, priority, cardOwner)}
    `;
    item.dataset.contentSignature = contentSignature;
  }

  item.className = className;
  item.dataset.cardKey = cardKey;
  item.setAttribute("role", "button");
  item.tabIndex = 0;
  item.setAttribute("aria-label", `${entry.card.name} 확대`);
  item.title = `${entryLabel(entry)} · ${entry.card.name} · 순서 ${priority}`;
}

function renderPlayerHud() {
  if (!elements.playerHud) return;
  if (AUTO_ROUTINE_MODE) {
    renderAutoRoutineHud();
    return;
  }
  elements.playerHud.innerHTML = "";
  elements.playerHud.setAttribute("aria-hidden", "true");
}

function renderAutoRoutineHud() {
  const players = state.entities.filter((entity) => entity.side === "player");
  if (!players.length) {
    elements.playerHud.innerHTML = "";
    delete elements.playerHud.dataset.autoSignature;
    elements.playerHud.setAttribute("aria-hidden", "true");
    return;
  }

  const activeEntry = state.activeTimelineIndex >= 0
    ? state.currentTimeline[state.activeTimelineIndex]
    : null;
  const activeActorId = activeEntry?.actorType === "player" ? activeEntry.actorId : null;

  elements.playerHud.setAttribute("aria-hidden", "false");
  elements.playerHud.className = [
    "player-hud",
    "auto-routine-hud",
    players.length === 1 ? "solo" : players.length === 2 ? "duo" : "trio",
  ].join(" ");
  elements.playerHud.style.setProperty("--auto-party-count", Math.min(players.length, 3));

  const signature = autoRoutineHudSignature(players);
  if (elements.playerHud.dataset.autoSignature !== signature) {
    elements.playerHud.innerHTML = `
      <div class="auto-party-board">
        ${players.map(autoRoutinePanelMarkup).join("")}
      </div>
    `;
    elements.playerHud.dataset.autoSignature = signature;
  }

  updateAutoRoutineHud(players, activeActorId);
}

function autoRoutinePanelMarkup(actor) {
  const character = characterDefinitions[actor.characterId] ?? getSelectedCharacter();
  const routine = autoRoutineCard(actor);
  const actionChips = routine.actions.map(autoRoutineActionChip).join("");
  const hp = `${Math.max(0, actor.hp)} / ${actor.maxHp}`;
  const portrait = portraitContent(character.image, character.shortLabel ?? character.name, "auto-party-portrait-img");
  return `
    <article class="auto-party-card" data-actor-id="${escapeMarkup(actor.id)}">
      <div class="auto-party-head">
        <span class="auto-party-portrait">${portrait}</span>
        <div class="auto-party-main">
          <strong>${escapeMarkup(character.name)}</strong>
          <span>${escapeMarkup(autoRoutineRoleLine(actor))}</span>
        </div>
      </div>
      <div class="auto-party-hp" aria-label="체력 ${hp}">
        <span><i style="width: ${hpPercent(actor)}%"></i></span>
        <b>${hp}</b>
      </div>
      <div class="auto-action-list" aria-label="자동 행동">
        ${actionChips}
      </div>
    </article>
  `;
}

function autoRoutineHudSignature(players) {
  return players.map((actor) => {
    const character = characterDefinitions[actor.characterId] ?? getSelectedCharacter();
    const routine = autoRoutineCard(actor);
    const actions = routine.actions.map((action) => {
      const summary = autoRoutineActionSummary(action);
      return `${summary.kind}:${summary.icon}:${summary.label}:${summary.title}`;
    }).join(",");
    return [
      actor.id,
      actor.characterId,
      character.name,
      character.image,
      actor.maxHp,
      autoRoutineRoleLine(actor),
      actions,
    ].join("|");
  }).join("||");
}

function updateAutoRoutineHud(players, activeActorId) {
  const playerById = new Map(players.map((actor) => [String(actor.id), actor]));
  elements.playerHud.querySelectorAll(".auto-party-card").forEach((card) => {
    const actor = playerById.get(card.dataset.actorId);
    if (!actor) return;

    card.classList.toggle("active", actor.id === activeActorId);
    card.classList.toggle("down", !isAlive(actor));

    const hp = `${Math.max(0, actor.hp)} / ${actor.maxHp}`;
    const hpWrap = card.querySelector(".auto-party-hp");
    const hpFill = card.querySelector(".auto-party-hp i");
    const hpText = card.querySelector(".auto-party-hp b");
    if (hpWrap) hpWrap.setAttribute("aria-label", `체력 ${hp}`);
    if (hpFill) hpFill.style.width = `${hpPercent(actor)}%`;
    if (hpText && hpText.textContent !== hp) hpText.textContent = hp;
  });
}

function autoRoutineRoleLine(actor) {
  if (actor.characterId === "archer") {
    if (actor.permanent?.autoSnipeChargeMode) {
      const threshold = actor.permanent.autoSnipeThreshold ?? 4;
      return `공격력 ${actor.baseAtk} · 저격 차지 ${actor.charge ?? 0}/${threshold}`;
    }
    const shots = actor.permanent?.autoShots ?? 2;
    return `공격력 ${actor.baseAtk} · ${shots}연타`;
  }
  if (actor.characterId === "warrior") {
    const targets = actor.permanent?.autoCleaveTargets ?? 1;
    return `공격력 ${actor.baseAtk} · ${targets > 1 ? `${targets}대상` : "근접"}`;
  }
  if (actor.characterId === "mage") {
    const targets = actor.permanent?.autoChainTargets ?? 1;
    return `공격력 ${actor.baseAtk} · ${targets > 1 ? `${targets}연쇄` : `사거리 ${actor.baseRange}`}`;
  }
  return `공격력 ${actor.baseAtk} · 이동 ${actor.baseMove}`;
}

function autoRoutineActionChip(action) {
  const summary = autoRoutineActionSummary(action);
  return `
    <span class="auto-action-chip ${summary.kind}" title="${escapeMarkup(summary.title)}">
      <span class="action-icon ${summary.icon}">${actionIcon(summary.icon)}</span>
      <b>${escapeMarkup(summary.label)}</b>
    </span>
  `;
}

function autoRoutineActionSummary(action) {
  if (action.type === "move") {
    return { kind: "move", icon: "move", label: `이동 ${action.amount ?? 0}`, title: `가장 가까운 적에게 ${action.amount ?? 0}칸 접근` };
  }
  if (action.type === "attack") {
    const targets = action.targets && action.targets > 1 ? ` x${action.targets}` : "";
    const ranged = !(action.melee || action.range <= 1);
    const label = action.melee || action.range <= 1 ? `근접 ${action.mult ?? 1}${targets}` : `${action.range === Infinity ? "저격" : "공격"} ${action.mult ?? 1}${targets}`;
    const rangeText = action.range === Infinity ? "사거리 무제한" : "가장 가까운 적";
    return { kind: "attack", icon: ranged ? "ranged" : "melee", label, title: `${rangeText} 공격${targets}` };
  }
  if (action.type === "charge") {
    return { kind: "special", icon: "charge", label: `차지 ${action.amount ?? 1}`, title: `저격 차지 ${action.amount ?? 1} 획득` };
  }
  if (action.type === "patternAttack") {
    return { kind: "attack", icon: "area", label: "범위", title: "주변 다중 타격" };
  }
  if (action.type === "placeTrap") {
    return { kind: "special", icon: trapIconKind(action), label: "함정", title: trapLabel(action) };
  }
  if (action.type === "placeRune") {
    return { kind: "special", icon: "rune", label: "룬", title: "룬 설치" };
  }
  if (action.type === "placeMeteor") {
    return { kind: "special", icon: "meteor", label: "운석", title: "운석 예고" };
  }
  return { kind: "special", icon: "effect", label: action.type, title: action.type };
}

function escapeMarkup(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTurnPlanner() {
  const host = elements.turnPlanner;
  if (!host) return;
  if (!state.turnPlanning) {
    clearPlannerDrag();
    host.classList.add("hidden");
    host.innerHTML = "";
    return;
  }

  host.style.setProperty("--planner-card-scale", plannerCardScaleForViewport());
  const requiredCount = Math.min(playerTurnPlayLimit(), state.planningChoices.length);
  const ready = (state.plannedCardKeys ?? []).length >= requiredCount;
  const plannerEntries = plannedPlayerEntriesFromState();

  host.classList.remove("hidden");
  host.innerHTML = `
    <button type="button" class="planner-confirm" aria-label="선택한 카드 실행" ${ready ? "" : "disabled"}>실행</button>
    <div class="planner-cards">
      ${plannerEntries.map((entry) => {
        const key = cardRuntimeKey(entry.card);
        const order = entry.planOrder;
        const dragging = plannerDrag?.active && plannerDrag.cardKey === key;
        const owner = characterForActorId(entry.actorId);
        return `
          <button type="button" class="planner-card ${dragging ? "dragging" : ""}" data-card-key="${key}" aria-label="${entry.card.name} 순서 ${order ?? ""}">
            ${cardMount(entry.card, "planner-mount", order ?? "", owner)}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function plannerCardScaleForViewport() {
  const viewportWidth = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 390);
  const compact = viewportWidth <= 520;
  const hostWidth = Math.min(760, viewportWidth - (compact ? 14 : 16));
  const hostPaddingX = compact ? 14 : 16;
  const cardsPaddingX = 8;
  const threeCardGaps = 12;
  const cardChromeX = 8 * 3;
  const usableCardWidth = hostWidth - hostPaddingX - cardsPaddingX - threeCardGaps - cardChromeX;
  const scale = usableCardWidth / (512 * 3);
  const boundedScale = Math.max(0.155, Math.min(scale, 0.22));
  return String(Math.round(boundedScale * 10000) / 10000);
}

function enemyGroups() {
  const groups = new Map();
  aliveEnemies().forEach((enemy) => {
    const key = enemy.boss || enemy.elite ? enemy.id : enemy.kind;
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

function cardPrefab(card, priorityOverride = null, character = null) {
  if (!card) return "";
  const priority = priorityOverride ?? card.priority;
  const typeLabel = isPassiveCard(card) ? "패시브" : isTurnSustainCard(card) ? "턴 지속" : "";
  const footerLabel = typeLabel ? `<div class="cp-type-label">${typeLabel}</div>` : "";
  const characterArt = character ? `
      <div class="cp-character-watermark" style="background-image: url('${character.image}')" aria-hidden="true"></div>
      <div class="cp-character-badge" aria-label="${character.name} 카드">
        <img src="${character.image}" alt="" />
      </div>
    ` : "";
  return `
    <div class="card-prefab ${rarityClass(card.rarity)}">
      <div class="cp-bg"></div>
      ${characterArt}
      <div class="cp-banner"></div>
      <div class="cp-priority">${priority}</div>
      <div class="cp-name">${card.name}</div>
      <div class="cp-actions">${renderActionList(card)}</div>
      ${footerLabel}
    </div>
  `;
}

function cardMount(card, cls = "", priorityOverride = null, character = null) {
  return `<div class="card-mount ${cls}">${cardPrefab(card, priorityOverride, character)}</div>`;
}

function renderHudCard(cardData, priorityOverride = null, character = null) {
  if (!cardData) {
    return `<div class="card-mount hud-mount is-empty"><span>카드 대기</span></div>`;
  }
  return cardMount(cardData, "hud-mount", priorityOverride, character);
}

function cardRuntimeKey(cardData) {
  return String(cardData?.instanceId ?? cardData?.id ?? "");
}

function findTimelineCard(cardKey, playerOnly = false) {
  if (!cardKey) return null;
  const entry = state.currentTimeline.find((item, index) => {
    if (playerOnly && item.actorType !== "player") return false;
    if (playerOnly && state.completedTimelineIndexes?.has(index)) return false;
    return cardRuntimeKey(item.card) === cardKey;
  });
  if (entry) return entry;
  const planningEntry = (state.planningChoices ?? []).find((item) => cardRuntimeKey(item.card) === cardKey);
  if (planningEntry && (!playerOnly || planningEntry.actorType === "player")) return planningEntry;
  const enemyPlanEntry = (state.enemyPlanEntries ?? []).find((item) => cardRuntimeKey(item.card) === cardKey);
  if (enemyPlanEntry && !playerOnly) return enemyPlanEntry;
  return null;
}

function openCardPreview(cardKey) {
  const entry = findTimelineCard(cardKey);
  if (!entry || !elements.cardPreviewOverlay || !elements.cardPreviewMount) return;
  const isPlayer = entry.actorType === "player";
  const owner = isPlayer ? characterForActorId(entry.actorId) : monsterDefinitions[entry.actorId] ?? monsterDefinitions.brute;
  const mountClass = `preview-mount ${isPlayer ? "" : "monster-card-mount"}`.trim();
  elements.cardPreviewMount.innerHTML = cardMount(entry.card, mountClass, timelinePriority(entry), owner);
  elements.cardPreviewOverlay.classList.remove("hidden");
}

function closeCardPreview() {
  if (!elements.cardPreviewOverlay || !elements.cardPreviewMount) return;
  elements.cardPreviewOverlay.classList.add("hidden");
  elements.cardPreviewMount.innerHTML = "";
}

function pileIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5 16.6 3l2.8 12.4-9.6 2.5L7 5.5Z"/><path d="M4.6 8.5 7 19.2l8.2-2.1"/></svg>`;
}

function renderDrawnCards() {
  elements.drawnCards.innerHTML = "";
  displayTimelineEntries().forEach((entry, index) => {
    const div = document.createElement("div");
    const statusClass = [
      displayEntryDone(entry) ? "done" : "",
      displayEntryActive(entry) ? "active" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const count = entry.displayEntries?.length ?? 1;
    div.className = `order-chip ${entry.actorType === "player" ? "player" : "enemy"} ${statusClass}`;
    div.title = `${entryLabel(entry)} · ${count > 1 ? `${count}장` : entry.card.name} · 순서 ${timelinePriority(entry)}`;
    div.innerHTML = `<span>${index + 1}</span><strong>${entry.actorType === "player" ? characterForActorId(entry.actorId).shortLabel : monsterLabel(entry.actorId)}${count > 1 ? `×${count}` : ""}</strong>`;
    elements.drawnCards.append(div);
  });
}

function renderTimeline() {
  elements.timeline.innerHTML = "";
  displayTimelineEntries().forEach((entry) => {
    const li = document.createElement("li");
    if (displayEntryActive(entry)) li.classList.add("active");
    if (displayEntryDone(entry)) li.classList.add("done");
    const count = entry.displayEntries?.length ?? 1;
    li.innerHTML = `<span>${timelinePriority(entry)}</span><strong>${entryLabel(entry)}</strong><span>${count > 1 ? `${count}장 플레이` : entry.card.name}</span>`;
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
  const playerEntries = drawnEntries.filter((e) => e.actorType === "player");
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
  showDrawnCardReveal(playerEntries, "이번 턴 카드", "player");
  await sleep(360);

  // 4) 1초 대기 (카드 읽기)
  await sleep(turnDelay(1.85));

  // 5) 우선권 재정렬 + 카드가 상단 우선권 보드로 날아가 안착
  state.currentTimeline = sortedEntries;
  state.priorityRevealMode = "sorted";
  renderPriorityStrip();
  renderDrawnCards();
  renderBoard();
  flyRevealToPriorityBoard();
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
      return `차지 ${action.amount}`;
    case "placeTrap":
    case "placeObstacle":
      return `${trapLabel(action)} ${action.count ?? 1}개 설치 · 사거리 ${action.range}`;
    case "placeTrapBehindTarget":
      return `${trapLabel(action)} ${action.count ?? 1}개 후방 설치 · 사거리 ${action.range}`;
    case "pushTowardTrap":
      return `가까운 적을 함정 쪽으로 ${action.amount ?? 1}칸 유도`;
    case "detonateTrap":
      return `함정 폭파 x${action.mult} · 범위 ${action.radius ?? 1}`;
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
    case "passive":
    case "permanent":
      return passiveEffectLabel(action);
    case "applyEffect":
      return effectActionLabel(action);
    default:
      return action.type;
  }
}

function showDrawnCardReveal(entriesOrCard, ownerLabel = "내 카드", side = "player", priorityOverride = null) {
  const host = document.querySelector("#drawnCardReveal");
  if (!host || !entriesOrCard) return;
  const entries = Array.isArray(entriesOrCard)
    ? entriesOrCard.filter((entry) => entry?.card)
    : [{ card: entriesOrCard, effectivePriority: priorityOverride }];
  if (!entries.length) return;
  const fastestBasePriority = Math.min(...entries.map((entry) => entry.card.priority));
  const sharedPriority = Math.min(...entries.map(timelinePriority));
  const countClass = `count-${Math.min(entries.length, 4)}`;
  const cardsMarkup = entries
    .map((entry) => {
      const isFastest = entry.card.priority === fastestBasePriority;
      const className = `reveal-mount ${isFastest ? "fastest" : ""}`.trim();
      const cardOwner = side === "player" ? characterForActorId(entry.actorId) : null;
      return `
        <div class="drawn-reveal-card-wrap">
          ${cardMount(entry.card, className, timelinePriority(entry), cardOwner)}
          ${entry.card.priority !== timelinePriority(entry) ? `<span class="base-priority">원래 ${entry.card.priority}</span>` : ""}
        </div>
      `;
    })
    .join("");
  host.removeAttribute("style");
  host.className = `drawn-reveal ${side} ${entries.length > 1 ? "multi" : ""} ${countClass}`;
  host.innerHTML = `
    <div class="drawn-reveal-tag">${ownerLabel} · PRI ${sharedPriority}</div>
    <div class="drawn-reveal-cards">${cardsMarkup}</div>
  `;
  void host.offsetWidth;
  host.classList.add("show");
}

function hideDrawnCardReveal() {
  const host = document.querySelector("#drawnCardReveal");
  if (host) host.classList.remove("show");
}

function flyRevealToPriorityBoard() {
  const host = document.querySelector("#drawnCardReveal");
  if (!host) return;
  const target =
    document.querySelector("#priorityStrip .priority-item.player.active .card-mount") ||
    document.querySelector("#priorityStrip .priority-item.player:not(.done) .card-mount") ||
    document.querySelector("#priorityStrip .priority-item.player .card-mount") ||
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

async function playTurnStart() {
  const host = document.querySelector("#turnStart");
  if (!host) return;
  host.innerHTML = `
    <div class="ts-band">
      <span class="ts-sweep"></span>
      <span class="ts-kicker">TURN</span>
      <span class="ts-num">${state.turn}</span>
    </div>
  `;
  void host.offsetWidth;
  host.classList.add("show");
  await sleep(1500); // 등장 후 1.5초 대기 (재생 속도와 무관하게 고정)
  host.classList.remove("show");
  await sleep(300); // 사라지는 트랜지션 동안 대기
}

async function playTurnCue(entry, index = 0) {
  // 적 차례는 따로 알리지 않고 지나간다 — 내 차례만 명확히 인지시킨다.
  if (entry.actorType !== "player") return;
  if (!isFirstPlayerEntryInPriorityGroup(entry, index)) return;
  const host = document.querySelector("#turnCue");
  if (!host) return;
  const character = characterForActorId(entry.actorId);
  host.className = "turn-cue player";
  host.innerHTML = `
    <div class="turn-cue-panel">
      <span class="turn-cue-avatar">${portraitContent(character.image, character.shortLabel, "turn-cue-art")}</span>
      <div class="turn-cue-body">
        <span class="turn-cue-kicker">MY TURN</span>
        <strong class="turn-cue-name">${character.name} 차례</strong>
      </div>
    </div>
  `;
  void host.offsetWidth;
  document.body.classList.add("turn-cue-active");
  host.classList.add("show");
  await sleep(turnDelay(1.7));
  host.classList.remove("show");
  document.body.classList.remove("turn-cue-active");
  await sleep(turnDelay(0.32));
}

function entryOwnerLabel(entry) {
  if (entry.actorType === "player") return characterForActorId(entry.actorId).name;
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
  if (action.type === "placeTrapBehindTarget") return actionStat(trapIconKind(action), `${trapLabel(action)} 후방 설치`, action.count ?? 1);
  if (action.type === "pushTowardTrap") return actionStat("trap-burst", "함정 유도", action.amount ?? 1);
  if (action.type === "detonateTrap") return actionStat("trap-burst", "함정 폭파", action.mult);
  if (action.type === "placeRune") return actionStat("rune", "룬", action.count ?? 1);
  if (action.type === "runeAttack") return actionStat("rune", "룬 주변 공격", action.mult);
  if (action.type === "detonateRune") return actionStat("rune-burst", "룬 폭파", action.mult);
  if (action.type === "placeMeteor") return actionStat("meteor", "운석 예고", action.delay ?? 1);
  if (action.type === "selfDamagePercent") return actionNote(`체력 ${Math.round(action.percent * 100)}% 감소`);
  if (action.type === "healPercent") return actionNote(`체력 ${Math.round(action.percent * 100)}% 회복`);
  if (isPassiveAction(action)) return actionNote(passiveEffectLabel(action), passiveEffectLabel(action));
  if (action.type === "applyEffect") return actionNote(effectActionLabel(action), effectActionLabel(action));
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
  if (isPassiveAction(action)) {
    return `<span class="action-line">${actionGroup("special", [
      actionNote(passiveEffectLabel(action), passiveEffectLabel(action)),
    ])}</span>`;
  }
  if (action.type === "placeTrap" || action.type === "placeObstacle") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat(trapIconKind(action), trapLabel(action), action.count ?? 1),
      actionStat("range", "사거리", action.range),
    ])}</span>`;
  }
  if (action.type === "placeTrapBehindTarget") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat(trapIconKind(action), `${trapLabel(action)} 후방 설치`, action.count ?? 1),
      actionStat("range", "사거리", action.range),
    ])}</span>`;
  }
  if (action.type === "pushTowardTrap") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat("trap-burst", "함정 유도", action.amount ?? 1),
      actionStat("range", "사거리", action.range),
    ])}</span>`;
  }
  if (action.type === "detonateTrap") {
    return `<span class="action-line">${actionGroup("attack", [
      actionStat("trap-burst", "함정 폭파", action.radius ?? 1),
      actionStat("ranged", "원거리 공격", action.mult),
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
  if (action.type === "applyEffect") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat("effect", "일시 효과", 1),
      actionNote(effectActionLabel(action), effectActionLabel(action)),
    ])}</span>`;
  }
  return `<span class="action-line">${actionGroup("special", [actionNote(action.type)])}</span>`;
}

function actionGroup(kind, parts) {
  return `<span class="action-group ${kind}">${parts.join("")}</span>`;
}

function actionStat(kind, label, value) {
  const icon = actionIcon(kind);
  return `<span class="action-stat" title="${label}"><span class="action-icon ${kind.replaceAll(" ", "-")}">${icon}</span><b>${formatActionValue(value)}</b></span>`;
}

function formatActionValue(value) {
  if (value === Infinity) return "∞";
  return value;
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
    "trap-burst": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 20c2-8.5 18-8.5 20 0"/><path d="M8.5 20h15"/><path d="m16 5 1.9 6.2L24 9l-3.1 5.7L27 17l-6.1 1.8L24 25l-6.1-3.1L16 28l-1.9-6.1L8 25l3.1-6.2L5 17l6.1-2.3L8 9l6.1 2.2L16 5Z"/></svg>`,
    rune: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 4 9 12-9 12L7 16 16 4Z"/><path d="M16 9v14"/><path d="M11 16h10"/></svg>`,
    "rune-burst": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 4 2.3 8.3L26 8l-4.3 7.7L30 18l-8.3 2.3L26 28l-7.7-4.3L16 32l-2.3-8.3L6 28l4.3-7.7L2 18l8.3-2.3L6 8l7.7 4.3L16 4Z"/></svg>`,
    meteor: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 5c5 2.3 8.8 5.5 11.3 9.8"/><path d="M4 12c4.4 1.5 7.8 4.2 10.2 8.1"/><circle cx="21.5" cy="22" r="5.8"/></svg>`,
    area: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="4"/><circle cx="16" cy="16" r="10"/><path d="M16 2v4"/><path d="M16 26v4"/><path d="M2 16h4"/><path d="M26 16h4"/></svg>`,
    "self-damage": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27S6 21 6 12.7c0-4 2.6-6.7 6.1-6.7 2 0 3.3 1 3.9 2.1.6-1.1 1.9-2.1 3.9-2.1 3.5 0 6.1 2.7 6.1 6.7C26 21 16 27 16 27Z"/><path d="M10 16h12"/></svg>`,
    heal: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27S6 21 6 12.7c0-4 2.6-6.7 6.1-6.7 2 0 3.3 1 3.9 2.1.6-1.1 1.9-2.1 3.9-2.1 3.5 0 6.1 2.7 6.1 6.7C26 21 16 27 16 27Z"/><path d="M16 11v10"/><path d="M11 16h10"/></svg>`,
    permanent: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 20 12l8 1.2-5.9 5.7 1.4 8.1L16 23l-7.5 4 1.4-8.1L4 13.2 12 12 16 4Z"/></svg>`,
    effect: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 20 12l8 1.2-5.9 5.7 1.4 8.1L16 23l-7.5 4 1.4-8.1L4 13.2 12 12 16 4Z"/><path d="M16 9v7"/><path d="M16 20v1"/></svg>`,
  };
  return icons[kind] ?? "?";
}

// kind → 카드에 등장하는 아이콘 설명 (카드별 ? 버튼이 이 표에서 해당 카드 아이콘만 뽑아 보여준다)
const ICON_HELP = {
  PRI: { name: "실행 순서", desc: "계획 화면에서는 내가 고른 순서가 표시됨" },
  melee: { name: "근거리 공격", desc: "근거리 공격 배수" },
  ranged: { name: "원거리 공격", desc: "원거리 공격 배수" },
  move: { name: "이동", desc: "이동하는 칸 수" },
  "move-flee": { name: "후퇴", desc: "뒤로 물러나는 칸 수" },
  range: { name: "사거리", desc: "공격·설치가 닿는 거리" },
  target: { name: "타겟 수", desc: "동시에 공격하는 대상 수" },
  charge: { name: "차지", desc: "충전 수치" },
  "trap-attack": { name: "공격 함정", desc: "설치하는 공격 함정 개수" },
  "trap-block": { name: "봉쇄 함정", desc: "설치하는 봉쇄 함정 개수" },
  "trap-burst": { name: "함정 폭파", desc: "설치된 함정을 터뜨려 공격" },
  rune: { name: "룬", desc: "룬 설치 / 룬 주변 공격" },
  "rune-burst": { name: "룬 폭파", desc: "설치된 룬을 터뜨려 공격" },
  meteor: { name: "운석", desc: "운석 예고 턴 수" },
  area: { name: "범위", desc: "폭발이 미치는 범위" },
  "self-damage": { name: "체력 소모", desc: "잃는 체력 비율" },
  heal: { name: "회복", desc: "회복하는 체력 비율" },
  permanent: { name: "패시브", desc: "선택 즉시 적용되어 스테이지 동안 유지되는 강화" },
  effect: { name: "일시 효과", desc: "이번 턴이나 다음 공격에 적용되는 강화" },
  pattern: { name: "공격 패턴", desc: "맞붙은 칸을 함께 공격하는 형태" },
};

// 카드에 실제로 그려지는 아이콘 종류만 (등장 순서대로, 중복 없이) 수집
function collectCardIconKinds(card) {
  const tmp = document.createElement("div");
  tmp.innerHTML = renderActionList(card);
  const kinds = ["PRI"]; // 좌상단 숫자 배지는 모든 카드에 항상 존재
  tmp.querySelectorAll(".action-icon").forEach((el) => {
    const kind = [...el.classList].find((c) => c !== "action-icon");
    if (kind && ICON_HELP[kind] && !kinds.includes(kind)) kinds.push(kind);
  });
  if (tmp.querySelector(".pattern-icon") && !kinds.includes("pattern")) kinds.push("pattern");
  return kinds;
}

function helpGlyph(kind) {
  if (kind === "PRI") return `<span class="help-pri">순</span>`;
  if (kind === "pattern") {
    return `<span class="pattern-icon adjacent-triple"><i></i><i></i><i></i></span>`;
  }
  return `<span class="action-icon ${kind}">${actionIcon(kind)}</span>`;
}

function openCardIconHelp(card) {
  const list = document.querySelector("#iconHelpList");
  const title = document.querySelector("#iconHelpTitle");
  if (!list) return;
  const kinds = collectCardIconKinds(card);
  if (title) title.textContent = `${card.name} · 아이콘 설명`;
  list.innerHTML = kinds
    .map((kind) => {
      const info = ICON_HELP[kind];
      return `
        <div class="icon-help-row">
          <span class="icon-help-glyph">${helpGlyph(kind)}</span>
          <div class="icon-help-text">
            <strong>${info.name}</strong>
            <span>${info.desc}</span>
          </div>
        </div>
      `;
    })
    .join("");
  elements.iconHelpOverlay.classList.remove("hidden");
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

function passiveEffectLabel(action, cardData = null) {
  const labels = {
    baseAtkPercent: `공격력 ${percentChangeLabel(passiveActionAmount(action, cardData))}`,
    maxHpPercent: `최대 체력 ${percentChangeLabel(passiveActionAmount(action, cardData))}`,
    extraCardPlays: `매턴 카드 ${action.amount}장 추가 사용`,
    firstTurnExtraCardPlays: `첫 턴 카드 ${action.amount}장 추가 사용`,
    comboDamage: `연타 피해 ${percentChangeLabel(action.amount)}`,
    thirdHitDamage: `세 번째 명중 피해 ${percentChangeLabel(action.amount)}`,
    afterAttackMove: `공격 후 이동 ${action.amount}`,
    ignoreAdjacentPenalty: `근접 원거리 패널티 무시`,
    trapNextAttackDamage: `함정 발동 후 다음 공격 피해 ${percentChangeLabel(action.amount)}`,
    trapChainDamage: `함정 발동 시 주변 피해 ${action.amount}배`,
    trapRangedVulnerability: `함정 발동 대상 원거리 피해 ${percentChangeLabel(action.amount)}`,
    trapTriggerShot: `함정 발동 시 사거리 ${action.range ?? 5} 원거리 공격`,
    chargeRetreat: `차지 시 후퇴 ${action.amount}`,
    chargeRangePerStack: `차지당 사거리 ${flatChangeLabel(action.amount)}`,
    chargeOnNoAttack: `공격하지 않으면 차지 ${action.amount}`,
    overkillSplashRange: `처치 잔여 피해 ${action.amount}칸 전이`,
    chargeStackMultiplier: `차지 스택 효과 ${action.amount}배`,
    berserkLostHpDamage: `잃은 체력 비율 / 2 피해 증가`,
    lowHpDamage: `체력 ${Math.round((action.threshold ?? 0.25) * 100)}% 미만 피해 ${percentChangeLabel(action.amount)}`,
    moveCardBonus: `이동 카드 이동력 ${flatChangeLabel(action.amount)}`,
    killMoveBonus: `처치 후 다음 이동 카드 이동력 ${flatChangeLabel(action.amount)}`,
    stackingMoveBonus: `처치 시 이번 웨이브 이동력 ${flatChangeLabel(action.amount)}`,
    moveAttackDamage: `이동 후 근접 피해 ${percentChangeLabel(action.amount)}`,
    areaPerTargetBonus: `범위 적중당 공격 배수 ${flatChangeLabel(action.amount)}`,
    pushBonus: `밀기 ${flatChangeLabel(action.amount)}`,
    pushAreaDamage: `밀기 후 다음 공격 피해 ${percentChangeLabel(action.amount)}`,
    killDamageBonus: `처치 후 다음 공격 피해 ${percentChangeLabel(action.amount)}`,
    multiTargetDamage: `다중 타겟 피해 ${percentChangeLabel(action.amount)}`,
    killChainDamage: `처치 후 다음 공격 피해 ${percentChangeLabel(action.amount)}`,
    runeDamage: `룬 보유 시 원거리 피해 ${percentChangeLabel(action.amount)}`,
    runeChainDamage: `룬 발동 시 주변 피해 ${action.amount}배`,
    persistentRune: `첫 룬 발동 후 룬 유지`,
    meteorTargeting: `운석 낙하지점 개선`,
    meteorMultiDamage: `운석 다중 명중 피해 ${percentChangeLabel(action.amount)}`,
    meteorKillSplash: `운석 처치 시 주변 피해 ${action.amount}배`,
  };
  return labels[action.effect] ?? action.label ?? modifierLabel(action.modifiers?.[0]) ?? "패시브";
}

function effectActionLabel(action) {
  const parts = [];
  if (action.label) parts.push(action.label);
  (action.modifiers ?? []).forEach((modifier) => parts.push(modifierLabel(modifier)));
  if (action.afterHitFlee) parts.push(`피격 후 후퇴 ${action.afterHitFlee}`);
  return parts.filter(Boolean).join(" · ") || "일시 효과";
}

function modifierLabel(modifier) {
  if (!modifier) return "";
  const amount = modifier.amount ?? 0;
  const condition = modifier.when ? conditionLabel(modifier.when) : "";
  if (modifier.stat === "damageDealt") return conditionPrefix(condition, `주는 피해 ${percentChangeLabel(amount)}`);
  if (modifier.stat === "damageTaken") return conditionPrefix(condition, `받는 피해 ${percentChangeLabel(amount)}`);
  if (modifier.stat === "range") return conditionPrefix(condition, `사거리 ${flatChangeLabel(amount)}`);
  if (modifier.stat === "push") return conditionPrefix(condition, `밀기 ${flatChangeLabel(amount)}`);
  if (modifier.stat === "ignoreAdjacentPenalty") return conditionPrefix(condition, "근접 원거리 패널티 무시");
  return conditionPrefix(condition, `${modifier.stat} ${flatChangeLabel(amount)}`);
}

function percentChangeLabel(amount) {
  return `${Math.round(Math.abs(amount) * 100)}% ${amount < 0 ? "감소" : "증가"}`;
}

function flatChangeLabel(amount) {
  return `${Math.abs(amount)} ${amount < 0 ? "감소" : "증가"}`;
}

function conditionPrefix(condition, label) {
  return condition ? `${condition} 시 ${label}` : label;
}

function conditionLabel(when = {}) {
  const labels = [];
  if (when.attackKind === "ranged") labels.push("원거리");
  if (when.attackKind === "melee") labels.push("근거리");
  if (when.nonAdjacent) labels.push("비인접");
  if (when.repeatHit) labels.push("반복 명중");
  if (when.thirdHit) labels.push("세 번째 명중");
  if (when.singleTarget) labels.push("단일 대상");
  if (when.charged) labels.push("차지 보유");
  return labels.join(", ");
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
  if (isPassiveAction(action)) return passiveEffectLabel(action);
  if (action.type === "applyEffect") return effectActionLabel(action);
  if (action.type === "placeTrap" || action.type === "placeObstacle") return `함정 설치 RNG ${action.range}`;
  if (action.type === "placeTrapBehindTarget") return `대상 뒤 함정 설치 RNG ${action.range}`;
  if (action.type === "pushTowardTrap") return `함정 쪽 유도 ${action.amount ?? 1}`;
  if (action.type === "detonateTrap") return `함정 폭파 ATK ${action.mult}, 범위 ${action.radius ?? 1}`;
  if (action.type === "placeRune") return `룬 설치 RNG ${action.range}`;
  if (action.type === "fleeToRune") return `룬 쪽 후퇴 ${action.amount}`;
  if (action.type === "runeAttack") return `룬 주변 ATK ${action.mult}`;
  if (action.type === "detonateRune") return `룬 폭파 ATK ${action.mult}`;
  if (action.type === "placeMeteor") return `운석 예고 ${action.delay ?? 1}턴, 범위 ${action.radius ?? 1}, ATK ${action.mult}`;
  if (action.type === "selfDamagePercent") return `체력 ${Math.round(action.percent * 100)}% 감소`;
  if (action.type === "healPercent") return `회복 ${Math.round(action.percent * 100)}%`;
  return action.type;
}

function entryLabel(entry) {
  return entry.actorType === "player" ? characterForActorId(entry.actorId).name : (monsterDefinitions[entry.actorId]?.name ?? "적");
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

function fitBoardToPanel(bounds = boardBounds(), options = {}) {
  const frame = calculateCameraFrame(bounds, options);
  applyBoardCameraFrame(frame);
  commitCameraFrame(frame);
}

function shouldSuppressCameraDeadZone(options = {}) {
  return Boolean(options.suppressDeadZone || state.cameraDrag || state.cameraDeadZoneSuppressed);
}

function calculateCameraFrame(bounds = boardBounds(), options = {}) {
  const metrics = options.metrics ?? cameraMetrics(bounds);
  const { logicalWidth, logicalHeight, panelWidth, panelHeight, fitScale } = metrics;
  let scale = fitScale;
  let offsetX = Math.max(0, (panelWidth - logicalWidth * scale) / 2);
  let offsetY = Math.max(0, (panelHeight - logicalHeight * scale) / 2);

  const player = getPlayer();
  if (state.cameraMode === "focus" && player) {
    scale = Math.max(fitScale, Math.min(CAMERA_FOCUS_MAX_SCALE, CAMERA_FOCUS_TARGET_SCALE));
    const focusPoint = options.focusPoint ?? hexToPixel(player, bounds);
    const playArea = metrics.playArea;
    const focusCenter = {
      x: panelWidth / 2,
      y: playArea.top + playArea.height * 0.55,
    };
    const currentScale = state.cameraScale || scale;
    const panelChanged = state.cameraPanelWidth !== panelWidth || state.cameraPanelHeight !== panelHeight;
    const shouldCenterCamera =
      !state.cameraFocusReady ||
      panelChanged ||
      Math.abs(currentScale - scale) > 0.001;

    if (shouldCenterCamera) {
      offsetX = focusCenter.x - focusPoint.x * scale;
      offsetY = focusCenter.y - focusPoint.y * scale;
    } else {
      offsetX = Number.isFinite(state.cameraX) ? state.cameraX : offsetX;
      offsetY = Number.isFinite(state.cameraY) ? state.cameraY : offsetY;
      if (!shouldSuppressCameraDeadZone(options)) {
        const playerScreen = {
          x: offsetX + focusPoint.x * scale,
          y: offsetY + focusPoint.y * scale,
        };
        const deadZone = {
          halfWidth: panelWidth * CAMERA_DEAD_ZONE_WIDTH_RATIO * 0.5,
          halfHeight: playArea.height * CAMERA_DEAD_ZONE_HEIGHT_RATIO * 0.5,
        };
        const deadZoneLeft = focusCenter.x - deadZone.halfWidth;
        const deadZoneRight = focusCenter.x + deadZone.halfWidth;
        const deadZoneTop = focusCenter.y - deadZone.halfHeight;
        const deadZoneBottom = Math.min(focusCenter.y + deadZone.halfHeight, playArea.bottom - CAMERA_PLAYER_EDGE_MARGIN);
        if (playerScreen.x < deadZoneLeft) {
          offsetX += deadZoneLeft - playerScreen.x;
        } else if (playerScreen.x > deadZoneRight) {
          offsetX -= playerScreen.x - deadZoneRight;
        }
        if (playerScreen.y < deadZoneTop) {
          offsetY += deadZoneTop - playerScreen.y;
        } else if (playerScreen.y > deadZoneBottom) {
          offsetY -= playerScreen.y - deadZoneBottom;
        }
      }
    }
    const manualPanSlack = shouldSuppressCameraDeadZone(options) ? CAMERA_MANUAL_PAN_SLACK : 0;
    offsetX = clampCameraOffset(offsetX, 0, panelWidth, logicalWidth * scale, manualPanSlack);
    offsetY = clampCameraOffset(offsetY, playArea.top, playArea.bottom, logicalHeight * scale, manualPanSlack);
  }

  return { logicalWidth, logicalHeight, panelWidth, panelHeight, scale, offsetX, offsetY };
}

function releaseManualCameraPanForPlayerTurn(entry) {
  if (entry?.actorType !== "player" || !state.cameraDeadZoneSuppressed) return;
  state.cameraDeadZoneSuppressed = false;
  state.cameraFollowToken = (state.cameraFollowToken ?? 0) + 1;
}

function beginBoardCameraDrag(event) {
  if (!canStartBoardCameraDrag(event)) return;
  const bounds = boardBounds();
  const metrics = cameraMetrics(bounds);
  const frame = calculateCameraFrame(bounds, { metrics, suppressDeadZone: true });
  state.cameraFollowToken = (state.cameraFollowToken ?? 0) + 1;
  state.cameraDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    bounds,
    metrics,
    frame,
    latestFrame: frame,
    moved: false,
  };
  if (elements.boardPanel.setPointerCapture) elements.boardPanel.setPointerCapture(event.pointerId);
}

function canStartBoardCameraDrag(event) {
  if (!state || state.finished || state.waitingReward || state.cameraMode !== "focus") return false;
  if (event.pointerType === "mouse" && event.button !== 0) return false;
  if (event.target.closest("button, a, input, select, textarea, [role='button'], .overlay")) return false;
  return elements.boardPanel.contains(event.target);
}

function moveBoardCameraDrag(event) {
  const drag = state?.cameraDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;

  const deltaX = event.clientX - drag.startX;
  const deltaY = event.clientY - drag.startY;
  if (!drag.moved && Math.hypot(deltaX, deltaY) < CAMERA_DRAG_THRESHOLD) return;

  drag.moved = true;
  state.cameraDeadZoneSuppressed = true;
  elements.boardPanel.classList.add("dragging");
  elements.board.style.transition = "none";
  event.preventDefault();

  const frame = clampCameraDragFrame({
    ...drag.frame,
    offsetX: drag.frame.offsetX + deltaX,
    offsetY: drag.frame.offsetY + deltaY,
  }, drag.metrics);
  drag.latestFrame = frame;
  applyBoardCameraTransform(frame);
  commitCameraFrame(frame);
  scheduleOffscreenEnemyIndicators(drag.bounds);
}

function endBoardCameraDrag(event) {
  const drag = state?.cameraDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  state.cameraDrag = null;
  if (!drag.moved) state.cameraDeadZoneSuppressed = false;
  elements.boardPanel.classList.remove("dragging");
  elements.board.style.transition = "";
  if (drag.latestFrame) applyBoardCameraFrame(drag.latestFrame, false);
  if (elements.boardPanel.hasPointerCapture?.(event.pointerId)) {
    elements.boardPanel.releasePointerCapture(event.pointerId);
  }
}

function beginPlannerDrag(event) {
  if (!state?.turnPlanning || event.target.closest(".planner-confirm")) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const cardElement = event.target.closest(".planner-card");
  if (!cardElement?.dataset.cardKey) return;
  plannerDrag = {
    pointerId: event.pointerId,
    cardKey: cardElement.dataset.cardKey,
    startX: event.clientX,
    startY: event.clientY,
    latestX: event.clientX,
    latestY: event.clientY,
    active: false,
    ghost: null,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    frameId: 0,
    slotState: null,
    currentTargetIndex: null,
  };
  elements.turnPlanner?.setPointerCapture?.(event.pointerId);
}

function movePlannerDrag(event) {
  if (!plannerDrag || plannerDrag.pointerId !== event.pointerId || !state?.turnPlanning) return;
  const movedDistance = Math.hypot(event.clientX - plannerDrag.startX, event.clientY - plannerDrag.startY);
  if (!plannerDrag.active && movedDistance < 8) return;
  event.preventDefault();
  if (!plannerDrag.active) {
    activatePlannerDrag(event);
    plannerDrag.active = true;
    render();
  }
  plannerDrag.latestX = event.clientX;
  plannerDrag.latestY = event.clientY;
  schedulePlannerDragFrame();
}

function endPlannerDrag(event) {
  if (!plannerDrag || plannerDrag.pointerId !== event.pointerId) return;
  const wasActive = plannerDrag.active;
  if (elements.turnPlanner?.hasPointerCapture?.(event.pointerId)) {
    elements.turnPlanner.releasePointerCapture(event.pointerId);
  }
  clearPlannerDrag();
  if (wasActive) {
    event.preventDefault();
    render();
  }
}

function activatePlannerDrag(event) {
  const source = findPlannerCardElement(plannerDrag.cardKey);
  if (!source) return;
  const rect = source.getBoundingClientRect();
  const sourceMount = source.querySelector(".planner-mount");
  const mountRect = sourceMount?.getBoundingClientRect();
  const measuredScale = mountRect?.width
    ? mountRect.width / 512
    : parseFloat(getComputedStyle(elements.turnPlanner).getPropertyValue("--planner-card-scale"));
  const cardScale = Number.isFinite(measuredScale) && measuredScale > 0
    ? String(Math.round(measuredScale * 10000) / 10000)
    : "0.13";
  const ghost = source.cloneNode(true);
  ghost.classList.remove("dragging");
  ghost.classList.add("planner-drag-ghost");
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.left = "0";
  ghost.style.top = "0";
  ghost.style.setProperty("--planner-card-scale", cardScale);
  const ghostMount = ghost.querySelector(".planner-mount");
  ghostMount?.style.setProperty("--cps", cardScale);
  if (mountRect && ghostMount) {
    ghostMount.style.width = `${mountRect.width}px`;
    ghostMount.style.height = `${mountRect.height}px`;
  }
  plannerDrag.ghost = ghost;
  plannerDrag.offsetX = event.clientX - rect.left;
  plannerDrag.offsetY = event.clientY - rect.top;
  plannerDrag.width = rect.width;
  plannerDrag.slotState = capturePlannerDragSlots(plannerDrag.cardKey);
  plannerDrag.currentTargetIndex = plannerDrag.slotState?.initialIndex ?? null;
  document.body.append(ghost);
  updatePlannerDragGhost(event);
}

function updatePlannerDragGhost(event) {
  if (!plannerDrag?.ghost) return;
  plannerDrag.ghost.style.transform = `translate3d(${event.clientX - plannerDrag.offsetX}px, ${event.clientY - plannerDrag.offsetY}px, 0)`;
}

function schedulePlannerDragFrame() {
  if (!plannerDrag?.active || plannerDrag.frameId) return;
  const schedule = window.requestAnimationFrame ?? ((callback) => window.setTimeout(callback, 16));
  plannerDrag.frameId = schedule(() => {
    if (!plannerDrag?.active) return;
    plannerDrag.frameId = 0;
    updatePlannerDragGhost({ clientX: plannerDrag.latestX, clientY: plannerDrag.latestY });
    reorderPlannedCardAtPoint(plannerDrag.cardKey, plannerDrag.latestX, plannerDrag.latestY);
  });
}

function reorderPlannedCardAtPoint(draggedKey, clientX, clientY) {
  const slotState = plannerDrag?.slotState;
  if (!slotState?.slots?.length) return;
  const verticalSlack = Math.max(60, (slotState.bottom - slotState.top) * 0.45);
  if (clientY < slotState.top - verticalSlack || clientY > slotState.bottom + verticalSlack) return;

  const orderedKeys = state.plannedCardKeys ?? [];
  const currentIndex = orderedKeys.indexOf(draggedKey);
  if (currentIndex < 0) return;
  const targetIndex = plannerTargetIndexForPoint(clientX);
  if (targetIndex == null) return;

  if (targetIndex === currentIndex) return;
  if (plannerDrag) plannerDrag.currentTargetIndex = targetIndex;
  reorderPlannedCardToIndex(draggedKey, targetIndex, { plannerOnly: true });
}

function capturePlannerDragSlots(draggedKey) {
  const slots = [...(elements.turnPlanner?.querySelectorAll(".planner-card") ?? [])]
    .filter((cardElement) => cardElement.dataset.cardKey)
    .map((cardElement) => {
      const rect = cardElement.getBoundingClientRect();
      return {
        key: cardElement.dataset.cardKey,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        centerX: rect.left + rect.width / 2,
      };
    })
    .sort((a, b) => a.left - b.left);
  if (!slots.length) return null;
  const averageWidth = slots.reduce((sum, slot) => sum + slot.width, 0) / slots.length;
  return {
    slots,
    initialIndex: Math.max(0, slots.findIndex((slot) => slot.key === draggedKey)),
    top: Math.min(...slots.map((slot) => slot.top)),
    bottom: Math.max(...slots.map((slot) => slot.bottom)),
    boundaries: slots.slice(0, -1).map((slot, index) => (slot.centerX + slots[index + 1].centerX) / 2),
    hysteresis: Math.max(18, Math.min(28, averageWidth * 0.2)),
  };
}

function plannerTargetIndexForPoint(clientX) {
  const slotState = plannerDrag?.slotState;
  if (!slotState?.slots?.length) return null;
  const dragCenterX = clientX - (plannerDrag.offsetX ?? 0) + (plannerDrag.width ?? 0) / 2;
  let targetIndex = plannerDrag.currentTargetIndex ?? slotState.initialIndex;

  while (
    targetIndex < slotState.boundaries.length
    && dragCenterX > slotState.boundaries[targetIndex] + slotState.hysteresis
  ) {
    targetIndex += 1;
  }

  while (
    targetIndex > 0
    && dragCenterX < slotState.boundaries[targetIndex - 1] - slotState.hysteresis
  ) {
    targetIndex -= 1;
  }

  return targetIndex;
}

function plannerCardRects() {
  return new Map([...(elements.turnPlanner?.querySelectorAll(".planner-card") ?? [])]
    .filter((cardElement) => cardElement.dataset.cardKey)
    .map((cardElement) => [cardElement.dataset.cardKey, cardElement.getBoundingClientRect()]));
}

function animatePlannerCardReorder(previousRects) {
  if (!previousRects?.size) return;
  const animate = window.requestAnimationFrame ?? ((callback) => window.setTimeout(callback, 0));
  [...elements.turnPlanner.querySelectorAll(".planner-card")].forEach((cardElement) => {
    const key = cardElement.dataset.cardKey;
    if (!key || key === plannerDrag?.cardKey) return;
    const previousRect = previousRects.get(key);
    if (!previousRect) return;
    const nextRect = cardElement.getBoundingClientRect();
    const deltaX = previousRect.left - nextRect.left;
    const deltaY = previousRect.top - nextRect.top;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
    cardElement.style.transition = "none";
    cardElement.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    animate(() => {
      cardElement.style.transition = "";
      cardElement.style.transform = "";
    });
  });
}

function findPlannerCardElement(cardKey) {
  return [...(elements.turnPlanner?.querySelectorAll(".planner-card") ?? [])]
    .find((cardElement) => cardElement.dataset.cardKey === cardKey) ?? null;
}

function clampCameraDragFrame(frame, metrics) {
  const focusClamp = state.cameraMode === "focus";
  const visibleTop = focusClamp ? metrics.playArea.top : 0;
  const visibleBottom = focusClamp ? metrics.playArea.bottom : metrics.panelHeight;
  return {
    ...frame,
    offsetX: clampCameraOffset(frame.offsetX, 0, metrics.panelWidth, frame.logicalWidth * frame.scale, CAMERA_MANUAL_PAN_SLACK),
    offsetY: clampCameraOffset(frame.offsetY, visibleTop, visibleBottom, frame.logicalHeight * frame.scale, CAMERA_MANUAL_PAN_SLACK),
  };
}

function scheduleOffscreenEnemyIndicators(bounds = boardBounds()) {
  state.pendingOffscreenBounds = bounds;
  if (state.offscreenIndicatorFrame) return;
  state.offscreenIndicatorFrame = window.requestAnimationFrame(() => {
    if (!state) return;
    const pendingBounds = state.pendingOffscreenBounds ?? boardBounds();
    state.offscreenIndicatorFrame = 0;
    state.pendingOffscreenBounds = null;
    renderOffscreenEnemyIndicators(pendingBounds);
  });
}

function cameraMetrics(bounds = boardBounds()) {
  const logicalWidth = Math.max(620, bounds.width + BOARD_PADDING * 2);
  const logicalHeight = Math.max(620, bounds.height + BOARD_PADDING * 2);
  const panel = elements.board.parentElement;
  const panelWidth = Math.max(1, panel.clientWidth);
  const panelHeight = Math.max(1, panel.clientHeight);
  const fitScale = Math.min(panelWidth / logicalWidth, panelHeight / logicalHeight);
  return {
    logicalWidth,
    logicalHeight,
    panelWidth,
    panelHeight,
    fitScale,
    playArea: cameraPlayArea(panelHeight),
  };
}

function applyBoardCameraFrame(frame, updateSize = true) {
  const { logicalWidth, logicalHeight, scale, offsetX, offsetY } = frame;
  if (updateSize) {
    setBoardStyleProperty("--board-width", `${logicalWidth}px`);
    setBoardStyleProperty("--board-height", `${logicalHeight}px`);
  }
  setBoardStyleProperty("--board-scale", `${scale}`);
  setBoardStyleProperty("--board-x", `${offsetX}px`);
  setBoardStyleProperty("--board-y", `${offsetY}px`);
  setBoardTransform("");
}

function applyBoardCameraTransform(frame) {
  const { scale, offsetX, offsetY } = frame;
  setBoardTransform(`translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`);
}

function setBoardStyleProperty(name, value) {
  const currentValue = elements.board.style.getPropertyValue
    ? elements.board.style.getPropertyValue(name)
    : elements.board.style[name];
  if (currentValue === value) return;
  if (elements.board.style.setProperty) {
    elements.board.style.setProperty(name, value);
  } else {
    elements.board.style[name] = value;
  }
}

function setBoardTransform(value) {
  if (elements.board.style.transform === value) return;
  elements.board.style.transform = value;
}

function commitCameraFrame(frame) {
  state.cameraFocusReady = state.cameraMode === "focus" && Boolean(getPlayer());
  state.cameraPanelWidth = frame.panelWidth;
  state.cameraPanelHeight = frame.panelHeight;
  state.cameraX = frame.offsetX;
  state.cameraY = frame.offsetY;
  state.cameraScale = frame.scale;
}

function cameraPlayArea(panelHeight) {
  const topRects = [document.querySelector(".top-bar")]
    .map((element) => element?.getBoundingClientRect())
    .filter(Boolean);
  const bottomRects = [elements.turnPlanner]
    .filter((element) => element && !element.classList.contains("hidden"))
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.height > 0 && rect.top < panelHeight);
  const top = topRects.length ? Math.max(...topRects.map((rect) => rect.bottom)) + CAMERA_UI_GAP : panelHeight * 0.14;
  const bottom = bottomRects.length ? Math.min(...bottomRects.map((rect) => rect.top)) - CAMERA_UI_GAP : panelHeight * 0.88;
  const safeBottom = Math.max(top + 140, bottom);
  return {
    top,
    bottom: safeBottom,
    height: safeBottom - top,
  };
}

function clampCameraOffset(offset, visibleStart, visibleEnd, contentSize, slack = 0) {
  const visibleSize = visibleEnd - visibleStart;
  if (contentSize <= visibleSize) {
    const centeredOffset = visibleStart + (visibleSize - contentSize) / 2;
    return Math.min(centeredOffset + slack, Math.max(centeredOffset - slack, offset));
  }
  return Math.min(visibleStart + slack, Math.max(visibleEnd - contentSize - slack, offset));
}

function easeInOut(progress) {
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
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

function alivePlayers() {
  return state.entities.filter((entity) => entity.side === "player" && isAlive(entity));
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

  const owner = state.entities.find((entity) => entity.id === trap.ownerId && isAlive(entity));
  const keepRune = trap.kind === "rune" && owner?.permanent?.persistentRune && !owner.temporary?.persistentRuneUsed;
  if (keepRune) {
    owner.temporary = owner.temporary ?? {};
    owner.temporary.persistentRuneUsed = true;
  } else {
    state.obstacles = state.obstacles.filter((item) => item !== trap);
  }
  if (trap.kind === "attack" || trap.kind === "spike" || trap.kind === "rune") {
    const damage = Math.max(1, Math.round((trap.baseAtk ?? 10) * (trap.power ?? 2)));
    const hitPosition = { q: actor.q, r: actor.r };
    applyDamage(actor, damage);
    renderBoard();
    renderHud();
    showHitEffect(actor, hitPosition, damage);
    log(`${actor.name} ${trap.kind === "rune" ? "룬" : "공격 함정"} ${damage} 피해`);
    resolveTrapTriggeredEffects(trap, actor);
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
    resolveTrapTriggeredEffects(trap, actor);
    return "block";
  }
  return trap.kind;
}

function resolveTrapTriggeredEffects(trap, target) {
  const owner = state.entities.find((entity) => entity.id === trap.ownerId && isAlive(entity));
  if (!owner) return;
  if (owner.permanent?.trapNextAttackDamage) {
    applyEffect(owner, {
      type: "applyEffect",
      label: "함정 연계",
      duration: "nextAttack",
      modifiers: [{ stat: "damageDealt", amount: owner.permanent.trapNextAttackDamage }],
    });
  }
  if (owner.permanent?.trapChainDamage) {
    aliveOpponents(owner)
      .filter((enemy) => enemy.id !== target.id && axialDistance(enemy, target) <= 1)
      .forEach((enemy) => dealAttackDamage(owner, enemy, {
        type: "attack",
        mult: owner.permanent.trapChainDamage,
        range: owner.baseRange,
      }, owner.permanent.trapChainDamage));
  }
  if (owner.permanent?.trapRangedVulnerability && isAlive(target)) {
    target.temporary = target.temporary ?? {};
    target.temporary.rangedVulnerability = {
      amount: owner.permanent.trapRangedVulnerability,
      expiresAfterOwnTurnEnds: state.turn + 99,
    };
    log(`${target.name} 함정 사냥 표식`);
  }
  if (trap.kind !== "rune" && owner.permanent?.trapTriggerShot && isAlive(target)) {
    const shotRange = owner.permanent.trapTriggerShotRange ?? 5;
    const shotCount = Math.max(1, Math.floor(owner.permanent.trapTriggerShot));
    for (let index = 0; index < shotCount; index += 1) {
      if (!isAlive(owner) || !isAlive(target) || !canTarget(owner, target, shotRange)) break;
      const action = { type: "attack", mult: 1, range: shotRange };
      const beforeHp = target.hp;
      const damage = dealAttackDamage(owner, target, action, 1);
      resolveKillPassives(owner, target);
      applyOverkillSplash(owner, target, damage - beforeHp, action);
      log(`${owner.name} 매복 사격`);
    }
  }
  if (trap.kind === "rune" && owner.permanent?.runeChainDamage) {
    aliveOpponents(owner)
      .filter((enemy) => enemy.id !== target.id && axialDistance(enemy, target) <= 1)
      .forEach((enemy) => dealAttackDamage(owner, enemy, {
        type: "attack",
        mult: owner.permanent.runeChainDamage,
        range: owner.baseRange,
      }, owner.permanent.runeChainDamage));
  }
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
    persistSelectedCharacterId(selectedCharacterId);
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
elements.metaGrowthButton?.addEventListener("click", openMetaGrowth);
elements.closeMetaGrowthButton?.addEventListener("click", closeMetaGrowth);
elements.metaGrowthOverlay?.addEventListener("click", (event) => {
  if (event.target === elements.metaGrowthOverlay) closeMetaGrowth();
});
elements.metaGrowthContent?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-meta-level-step]");
  if (!button) return;
  const characterId = button.dataset.characterId;
  const step = Number(button.dataset.metaLevelStep ?? 0);
  if (!characterId || !step) return;
  setCharacterMetaLevel(characterId, characterMetaLevel(characterId) + step);
});
elements.boardPanel.addEventListener("pointerdown", beginBoardCameraDrag);
elements.boardPanel.addEventListener("pointermove", moveBoardCameraDrag);
elements.boardPanel.addEventListener("pointerup", endBoardCameraDrag);
elements.boardPanel.addEventListener("pointercancel", endBoardCameraDrag);
elements.board.addEventListener("click", (event) => {
  const entityElement = event.target.closest(".entity.enemy");
  if (!entityElement?.dataset.entityId) return;
  setFocusTarget(entityElement.dataset.entityId);
});
elements.turnPlanner?.addEventListener("click", (event) => {
  const confirmButton = event.target.closest(".planner-confirm");
  if (confirmButton) {
    confirmTurnPlan();
  }
});
elements.turnPlanner?.addEventListener("pointerdown", beginPlannerDrag);
elements.turnPlanner?.addEventListener("pointermove", movePlannerDrag);
elements.turnPlanner?.addEventListener("pointerup", endPlannerDrag);
elements.turnPlanner?.addEventListener("pointercancel", endPlannerDrag);
elements.priorityStrip.addEventListener("click", (event) => {
  const cardSlot = event.target.closest(".priority-item");
  if (!cardSlot?.dataset.cardKey) return;
  event.preventDefault();
  event.stopPropagation();
  openCardPreview(cardSlot.dataset.cardKey);
});
elements.priorityStrip.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const cardSlot = event.target.closest(".priority-item");
  if (!cardSlot?.dataset.cardKey) return;
  event.preventDefault();
  openCardPreview(cardSlot.dataset.cardKey);
});
elements.enemyActionHud.addEventListener("click", (event) => {
  if (!elements.enemyActionHud.dataset.cardKey) return;
  event.preventDefault();
  event.stopPropagation();
  openCardPreview(elements.enemyActionHud.dataset.cardKey);
});
elements.enemyActionHud.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (!elements.enemyActionHud.dataset.cardKey) return;
  event.preventDefault();
  openCardPreview(elements.enemyActionHud.dataset.cardKey);
});
elements.closeHelpButton.addEventListener("click", () => {
  elements.iconHelpOverlay.classList.add("hidden");
});
elements.iconHelpOverlay.addEventListener("click", (event) => {
  if (event.target === elements.iconHelpOverlay) {
    elements.iconHelpOverlay.classList.add("hidden");
  }
});
elements.closeCardPreviewButton.addEventListener("click", closeCardPreview);
elements.cardPreviewOverlay.addEventListener("click", (event) => {
  if (event.target === elements.cardPreviewOverlay) {
    closeCardPreview();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCardPreview();
    closeMetaGrowth();
    elements.iconHelpOverlay.classList.add("hidden");
  }
});
window.addEventListener("resize", () => {
  renderBoard();
  renderTurnPlanner();
});

newRun();
