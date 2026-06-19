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
  drawnCards: document.querySelector("#drawnCards"),
  timeline: document.querySelector("#timeline"),
  battleLog: document.querySelector("#battleLog"),
  rewardOverlay: document.querySelector("#rewardOverlay"),
  rewardInstr: document.querySelector("#rewardInstr"),
  rewardCards: document.querySelector("#rewardCards"),
  iconHelpOverlay: document.querySelector("#iconHelpOverlay"),
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
      modifiers: [{ stat: "damageDealt", amount: 0.1, when: { attackKind: "ranged", nonAdjacent: true } }],
    },
  ]),
  card("storm-shot", "폭풍 사격", "공용", "전설", 28, [{ type: "attack", mult: 2, range: 3, targets: 4 }]),
  card("hunt-rhythm", "사냥의 리듬", "공용", "전설", 32, [
    { type: "passive", effect: "afterAttackMove", amount: 1 },
  ]),
  card("absolute-distance", "절대 거리", "공용", "전설", 26, [
    {
      type: "passive",
      effect: "ignoreAdjacentPenalty",
      amount: 1,
      modifiers: [{ stat: "range", amount: 1, when: { attackKind: "ranged" } }],
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
    { type: "passive", effect: "comboDamage", amount: 0.1 },
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
    { type: "passive", effect: "thirdHitDamage", amount: 0.3 },
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
    { type: "passive", effect: "comboDamage", amount: 0.2 },
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
    { type: "passive", effect: "trapNextAttackDamage", amount: 0.2 },
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
    { type: "passive", effect: "trapChainDamage", amount: 2 },
  ]),
  card("trap-burst", "함정 폭파", "함정", "에픽", 33, [
    { type: "detonateTrap", mult: 2, radius: 1 },
  ]),
  card("cross-block", "교차 봉쇄", "함정", "에픽", 24, [
    { type: "placeTrap", range: 2, trap: "block", count: 3 },
    { type: "attack", mult: 1, range: 3 },
  ]),
  card("trap-hunt", "함정 사냥", "함정", "전설", 23, [
    { type: "passive", effect: "trapRangedVulnerability", amount: 0.2 },
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
    { type: "passive", effect: "chargeRangePerStack", amount: 1 },
  ]),
  card("waited-shot", "기다린 한 발", "차지", "에픽", 34, [
    { type: "charge", amount: 2 },
    { type: "attack", mult: 2, range: 3, killChargeRefund: 1 },
  ]),
  card("breath-hold", "호흡 유지", "차지", "에픽", 29, [
    { type: "passive", effect: "chargeOnNoAttack", amount: 1 },
  ]),
  card("heart-piercer", "심장 꿰뚫기", "차지", "전설", 33, [
    { type: "attack", mult: 5, range: 4, overkillSplashRange: 3 },
  ]),
  card("charge-overkill", "잔여 관통", "차지", "전설", 33, [
    { type: "passive", effect: "overkillSplashRange", amount: 3 },
  ]),
  card("charge-doubler", "과충전", "차지", "전설", 30, [
    { type: "passive", effect: "chargeStackMultiplier", amount: 2 },
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
  ]),
  passiveCard("archer-passive-repeat-rhythm", "반복 리듬", "다단중첩", "노말", [
    cardPassive("comboDamage", "한 카드 안에서 같은 적을 다시 공격할 때마다 피해 10% 증가", 0.1),
  ]),
  passiveCard("archer-passive-trap-polish", "함정 손질", "함정", "노말", [
    cardPassive("trapNextAttackDamage", "함정 발동 후 다음 공격 피해 10% 증가", 0.1),
  ]),
  passiveCard("archer-passive-steady-charge", "안정 차지", "차지", "노말", [
    cardPassive("chargeRangePerStack", "차지 1당 사거리 1 증가", 1),
  ]),
  passiveCard("archer-passive-quick-hands", "빠른 손놀림", "공용", "레어", [
    cardPassive("firstTurnExtraCardPlays", "첫 턴에 카드 1장 추가 사용", 1),
  ]),
  passiveCard("archer-passive-weakness-read", "약점 판독", "다단중첩", "레어", [
    cardPassive("thirdHitDamage", "세 번째 명중 피해 30% 증가", 0.3),
  ]),
  passiveCard("archer-passive-trap-mark", "덫 표식", "함정", "레어", [
    cardPassive("trapRangedVulnerability", "함정 발동 대상이 받는 원거리 피해 20% 증가", 0.2),
  ]),
  passiveCard("archer-passive-ambush-shot", "매복 사격", "함정", "레어", [
    cardPassive("trapTriggerShot", "함정 발동 시 사거리 5 원거리 공격", 1, { range: 5 }),
  ]),
  passiveCard("archer-passive-overdraw", "과집중", "차지", "레어", [
    cardPassive("chargeStackMultiplier", "차지 스택 효과 2배", 2),
  ]),
  passiveCard("archer-passive-hunt-flow", "사냥 흐름", "공용", "에픽", [
    cardPassive("afterAttackMove", "공격 카드 사용 후 이동 1", 1),
  ]),
  passiveCard("archer-passive-endless-string", "끝없는 현", "다단중첩", "에픽", [
    cardPassive("comboDamage", "한 카드 안에서 같은 적을 다시 공격할 때마다 피해 20% 증가", 0.2),
  ]),
  passiveCard("archer-passive-chain-trap", "연쇄 덫", "함정", "에픽", [
    cardPassive("trapChainDamage", "함정 발동 시 주변 피해 2배", 2),
  ]),
  passiveCard("archer-passive-piercing-charge", "관통 차지", "차지", "에픽", [
    cardPassive("overkillSplashRange", "처치 잔여 피해 3칸 전이", 3),
  ]),
  passiveCard("archer-passive-double-draw", "쌍궁 운용", "공용", "전설", [
    cardPassive("extraCardPlays", "매턴 카드 1장 추가 사용", 1),
  ]),
  passiveCard("archer-passive-finale-sense", "결말 감각", "다단중첩", "전설", [
    cardPassive("thirdHitDamage", "세 번째 명중 피해 60% 증가", 0.6),
  ]),
  passiveCard("archer-passive-perfect-overkill", "완전 관통", "차지", "전설", [
    cardPassive("overkillSplashRange", "처치 잔여 피해 5칸 전이", 5),
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

const characterDefinitions = {
  archer: {
    id: "archer",
    name: "궁수",
    shortLabel: "궁",
    image: "assets/characters/archer.png",
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

function entityImage(entity) {
  if (entity.side === "player") {
    return (characterDefinitions[entity.characterId] ?? getSelectedCharacter()).image;
  }
  return monsterDefinitions[entity.kind]?.image;
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
    cameraFocusReady: false,
    cameraFollowToken: 0,
    cameraPanelWidth: 0,
    cameraPanelHeight: 0,
    cameraX: 0,
    cameraY: 0,
    cameraScale: 0,
    cameraDrag: null,
    cameraDeadZoneSuppressed: false,
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
    rewardPickCount: 0,
    rewardTags: new Set(),
    rewardRouteCounts: {},
    pickedRewardIds: new Set(),
    log: [],
    speedMultiplier,
    suppressPlayerCard: false,
  };

  startWave(0);
  log(`${character.name} 새 런을 시작했다.`);
  state.waitingReward = true;
  state.preStartReward = true;
  state.rewardPhase = "passive";
  render();
  showRewards();
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
      maxHp: previousPlayer?.maxHp ?? character.maxHp,
      baseAtk: previousPlayer?.baseAtk ?? character.baseAtk,
      baseRange: character.baseRange,
      baseMove: character.baseMove,
      charge: 0,
      permanent: { ...(previousPlayer?.permanent ?? {}) },
      temporary: {},
      effects: (previousPlayer?.effects ?? []).filter((effect) => effect.duration === "stage"),
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
      label: enemy.boss ? "보" : enemy.elite ? "정" : monster.label,
      q: enemy.q,
      r: enemy.r,
      hp: enemy.hp,
      maxHp: enemy.hp,
      baseAtk: enemy.baseAtk ?? (enemy.boss ? 5 : monster.baseAtk),
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

  await playTurnStart();

  const playerCards = drawPlayerCards(cardsPerPlayerTurn(player));
  const drawnEntries = playerCards.map((cardData, index) => ({
    actorType: "player",
    actorId: player.id,
    card: cardData,
    playIndex: index,
  }));
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
    const entry = entries[index];
    state.activeTimelineIndex = index;
    document.body.classList.toggle("player-acting", entry.actorType === "player");
    releaseManualCameraPanForPlayerTurn(entry);
    renderPriorityStrip();
    renderEnemyActionHud();
    renderBoard();
    renderDrawnCards();
    renderTimeline(index);
    await playTurnCue(entry);
    await executeTimelineEntry(entry);
    expireTurnEndEffects(entry);
    state.completedTimelineIndexes.add(index);
    state.completedTimelineCount = Math.max(state.completedTimelineCount, index + 1);
    state.activeTimelineIndex = -1;
    document.body.classList.remove("player-acting");
    renderPriorityStrip();
    renderEnemyActionHud();
    renderBoard();
    renderDrawnCards();
    renderTimeline();
    await sleep(turnDelay());
    if (checkEndConditions()) break;
  }

  if (!state.waitingReward && !state.finished) {
    playerCards.forEach((cardData) => discardResolvedCard(cardData, player));
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
    actor.temporary.cannotMove = true;
    log(`${actor.name} 차지 ${actor.charge}`);
    return Boolean(actor.permanent?.chargeRetreat);
  }
  if (action.type === "applyEffect") {
    applyEffect(actor, action);
    return false;
  }
  if (isPassiveAction(action)) {
    applyPassiveAction(actor, action);
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

function drawPlayerCard() {
  if (!state.deck.length) {
    state.deck = shuffle(state.discard);
    state.discard = [];
  }
  return state.deck.shift();
}

function drawPlayerCards(count = 1) {
  const cards = [];
  for (let index = 0; index < count; index += 1) {
    const cardData = drawPlayerCard();
    if (cardData) cards.push(cardData);
  }
  return cards;
}

function cardsPerPlayerTurn(player) {
  const everyTurnBonus = Math.floor(player?.permanent?.extraCardPlays ?? 0);
  const firstTurnBonus = state.turn === 1 ? Math.floor(player?.permanent?.firstTurnExtraCardPlays ?? 0) : 0;
  return Math.max(1, 1 + everyTurnBonus + firstTurnBonus);
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
  state.discard.push(cardData);
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
    if (actor) expireActorTurnEndEffects(actor, state.discard);
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

function applyPassiveAction(actor, action) {
  actor.permanent = actor.permanent ?? {};
  if (action.effect) actor.permanent[action.effect] = (actor.permanent[action.effect] ?? 0) + (action.amount ?? 1);
  if (action.effect === "baseAtkPercent") {
    const definition = characterDefinitions[actor.characterId] ?? getSelectedCharacter();
    const increase = Math.max(1, Math.round((definition.baseAtk ?? actor.baseAtk ?? 1) * (action.amount ?? 0)));
    actor.baseAtk = (actor.baseAtk ?? 0) + increase;
  }
  if (action.effect === "maxHpPercent") {
    const definition = characterDefinitions[actor.characterId] ?? getSelectedCharacter();
    const increase = Math.max(1, Math.round((definition.maxHp ?? actor.maxHp ?? 1) * (action.amount ?? 0)));
    actor.maxHp = (actor.maxHp ?? 0) + increase;
    actor.hp = Math.min(actor.maxHp, (actor.hp ?? 0) + increase);
  }
  if (action.modifiers?.length) {
    applyEffect(actor, {
      type: "applyEffect",
      label: passiveEffectLabel(action),
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
  log(`${actor.name} 패시브: ${passiveEffectLabel(action)}`);
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

  const chargeBonus = consumeChargeForAttack(actor);
  if (state.activeCardContext?.actorId === actor.id) state.activeCardContext.didAttack = true;
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
  consumeEffects(actor, "attack");
  return true;
}

function patternAttack(actor, action) {
  const placement = bestPatternPlacement(action.pattern, actor, effectiveActionRange(actor, action), actor.side);
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
  const candidates = aliveOpponents(actor)
    .filter((target) => canTarget(actor, target, range))
    .sort((a, b) => {
      if (action.preferPreviousTarget && previousTargetIds) {
        const aPrevious = previousTargetIds.has(a.id);
        const bPrevious = previousTargetIds.has(b.id);
        if (aPrevious !== bPrevious) return aPrevious ? -1 : 1;
      }
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

function targetPriorityDistance(actor, target, action) {
  if (isMeleeAttackAction(action)) return approachDistanceToTarget(actor, actor, target);
  return axialDistance(actor, target);
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
  applyDamage(target, damage);
  noteTargetHit(actor, target);
  resolveAfterHitEffects(actor, target);
  consumeEffects(target, "hit");
  renderBoard();
  renderHud();
  showHitEffect(target, hitPosition, damage);
  log(`${actor.name} -> ${target.name} ${damage} 피해`);
  return damage;
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
  if (!context || context.actorId !== actor.id) return;
  context.targetHits.set(target.id, (context.targetHits.get(target.id) ?? 0) + 1);
}

function outgoingDamageMultiplier(context) {
  const { actor, target, action, repeatHits } = context;
  let bonus = actorDamageMultiplier(actor) - 1;
  if (actor.permanent?.comboDamage && repeatHits > 0) bonus += repeatHits * actor.permanent.comboDamage;
  if (actor.permanent?.thirdHitDamage && repeatHits >= 2) bonus += actor.permanent.thirdHitDamage;
  if (actor.permanent?.multiTargetDamage && context.targetCount >= 2) bonus += actor.permanent.multiTargetDamage;
  if (actor.permanent?.runeDamage && ownedRunes(actor).length) bonus += actor.permanent.runeDamage;
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
  const context = damageContext(actor, target, action, { targetCount });
  return Math.max(0, (action.push ?? 0) + effectModifierTotal(actor, "push", context));
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
        nonPenaltyHitCount: targetInfo.nonPenaltyHitCount,
        lowestHp: targetInfo.lowestHp,
        lowestNonPenaltyHp: targetInfo.lowestNonPenaltyHp,
        lowestIndex: targetInfo.lowestIndex,
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

function compareAttackMoveTargetScores(a, b, attackAction) {
  if (a.hitCount !== b.hitCount) return b.hitCount - a.hitCount;

  const targetLimit = attackAction?.targets ?? 1;
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
    return { hitCount: 0, nonPenaltyHitCount: 0, lowestHp: Infinity, lowestNonPenaltyHp: Infinity, lowestIndex: 9999 };
  }
  if (attackAction.type === "patternAttack") {
    const placement = bestPatternPlacement(attackAction.pattern, tile, effectiveActionRange(actor, attackAction), actor.side);
    const nonPenaltyTargets = placement.targets.filter((target) =>
      isPenaltyFreeTargetFromTile(actor, tile, target, attackAction, placement.targets.length),
    );
    return {
      hitCount: placement.targets.length,
      nonPenaltyHitCount: nonPenaltyTargets.length,
      lowestHp: placement.lowestHp,
      lowestNonPenaltyHp: Math.min(...nonPenaltyTargets.map((target) => target.hp), Infinity),
      lowestIndex: placement.lowestIndex,
    };
  }
  const targets = aliveOpponents(actor).filter((target) =>
    canTargetFromTile(tile, actor.side, target, effectiveActionRange(actor, attackAction)),
  );
  const targetLimit = attackAction.targets ?? 1;
  const nonPenaltyTargets = targets.filter((target) =>
    isPenaltyFreeTargetFromTile(actor, tile, target, attackAction, Math.min(targets.length, targetLimit)),
  );
  return {
    hitCount: Math.min(targets.length, targetLimit),
    nonPenaltyHitCount: Math.min(nonPenaltyTargets.length, targetLimit),
    lowestHp: Math.min(...targets.map((target) => target.hp), Infinity),
    lowestNonPenaltyHp: Math.min(...nonPenaltyTargets.map((target) => target.hp), Infinity),
    lowestIndex: Math.min(...targets.map((target) => target.monsterIndex ?? 0), 9999),
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
  actor.charge = 0;
  actor.temporary.cannotMove = false;
  renderHud();
  return bonus;
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
  state.rewardPhase = "passive";
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
        ${cardMount(reward, "reward-mount")}
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
    applyPassiveReward(reward);
  } else {
    state.playerCards.push(reward);
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
    document.querySelector('.player-hud .pile-row span[title="덱"]') ||
    document.querySelector(".player-hud");
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
    if (preStartReward) state.deck = shuffle([...state.deck, reward]);
    else state.deck.push(reward);
  }
  renderPlayerHud();
  const deckPile = document.querySelector('.player-hud .pile-row span[title="덱"]');
  if (!passiveReward && deckPile) {
    deckPile.classList.remove("pile-pop");
    void deckPile.offsetWidth;
    deckPile.classList.add("pile-pop");
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

function applyPassiveReward(cardData) {
  const player = getPlayer();
  if (!player) return;
  state.passiveCards = state.passiveCards ?? [];
  state.passiveCards.push(cardData);
  cardData.actions.filter(isPassiveAction).forEach((action) => applyPassiveAction(player, action));
}

function render() {
  renderBoard();
  renderHud();
  renderEnemySummary();
  renderPriorityStrip();
  renderEnemyActionHud();
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
  return `<span class="intent-badge tone-${tone} ${side} ${done ? "done" : ""} ${active ? "active" : ""}" aria-hidden="true"><span class="intent-pri">${card.priority}</span>${chips}</span>`;
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
      ((activeEntry.actorType === "player" && entity.side === "player") ||
        (activeEntry.actorType !== "player" &&
          entity.side !== "player" &&
          entity.kind === activeEntry.actorId));
    const image = entityImage(entity);
    const label = entityLabel(entity);
    let div = elements.board.querySelector(entityDomSelector(entity.id));
    if (!div) {
      div = document.createElement("div");
      div.dataset.entityId = entity.id;
      elements.board.append(div);
    }
    const className = `entity ${entity.side} ${entity.boss ? "boss" : ""} ${acting ? "acting" : ""} ${image ? "has-art" : ""}`;
    if (div.className !== className) div.className = className;
    div.dataset.entityId = entity.id;
    if (div.dataset.image !== (image ?? "") || div.dataset.label !== label) {
      div.dataset.image = image ?? "";
      div.dataset.label = label;
      div.innerHTML = `
        ${image ? spriteImg(image, "entity-art") : `<span class="entity-label">${label}</span>`}
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
        <div class="combatant-portrait enemy-portrait">${portraitContent(definition.image, definition.label ?? sample?.label ?? "적", "portrait-art")}</div>
        <div class="combatant-heading">
          <strong>${sample?.boss || sample?.elite ? sample.name : definition.name}</strong>
          <span>x${group.enemies.length}</span>
        </div>
      </div>
      ${renderBaseStats(sample ?? definition)}
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
    return;
  }

  const groupEnemies = aliveEnemies()
    .filter((enemy) => enemy.kind === entry.actorId)
    .sort((a, b) => a.monsterIndex - b.monsterIndex);
  if (!groupEnemies.length) {
    elements.enemyActionHud.className = "enemy-action-hud";
    elements.enemyActionHud.innerHTML = "";
    elements.enemyActionHud.dataset.signature = "";
    return;
  }

  const sample = groupEnemies[0];
  const definition = monsterDefinitions[entry.actorId] ?? monsterDefinitions.brute;
  const boss = groupEnemies.some((enemy) => enemy.boss);
  const name = boss && sample ? sample.name : definition.name;
  const count = groupEnemies.length;
  const signature = `${entry.actorId}:${entry.card.instanceId ?? entry.card.id}:${count}:${boss}`;

  elements.enemyActionHud.className = `enemy-action-hud show ${boss ? "boss" : ""}`;
  if (elements.enemyActionHud.dataset.signature === signature) return;
  elements.enemyActionHud.dataset.signature = signature;
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
    ${cardMount(entry.card, "enemy-action-mount")}
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

  const timelineKeys = state.currentTimeline.map(priorityEntryKey);
  const signature = timelineKeys.join("|");
  const activeKeys = new Set(timelineKeys);
  state.priorityStripItems.forEach((item, key) => {
    if (!activeKeys.has(key)) state.priorityStripItems.delete(key);
  });

  state.currentTimeline.forEach((entry, index) => {
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
  item.innerHTML = `
    <span class="pc-portrait"></span>
    <span class="pc-badge"></span>
  `;
  return item;
}

function updatePriorityItem(item, entry, index) {
  const isPlayer = entry.actorType === "player";
  const groupEnemies = isPlayer ? [] : aliveEnemies().filter((e) => e.kind === entry.actorId);
  const boss = groupEnemies.some((e) => e.boss);
  const count = groupEnemies.length;
  const emblem = isPlayer ? getSelectedCharacter().shortLabel : monsterLabel(entry.actorId);
  const portraitImage = isPlayer ? getSelectedCharacter().image : monsterDefinitions[entry.actorId]?.image;
  const className = [
    "priority-item",
    isPlayer ? "player" : "enemy",
    boss ? "boss" : "",
    state.completedTimelineIndexes?.has(index) ? "done" : "",
    index === state.activeTimelineIndex ? "active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const contentSignature = `${portraitImage ?? ""}:${emblem}:${entry.card.priority}:${count}`;

  if (item.dataset.contentSignature !== contentSignature) {
    item.querySelector(".pc-portrait").innerHTML = portraitContent(portraitImage, emblem, "pc-art");
    item.querySelector(".pc-badge").textContent = entry.card.priority;
    let countElement = item.querySelector(".pc-count");
    if (count > 1) {
      if (!countElement) {
        countElement = document.createElement("span");
        countElement.className = "pc-count";
        item.append(countElement);
      }
      countElement.textContent = `×${count}`;
    } else {
      countElement?.remove();
    }
    item.dataset.contentSignature = contentSignature;
  }

  item.className = className;
  item.title = `${entryLabel(entry)} · ${entry.card.name} · PRI ${entry.card.priority}`;
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
    const playerEntries = state.currentTimeline.filter((item, index) => {
      return item.actorType === "player" && item.actorId === player.id && !state.completedTimelineIndexes?.has(index);
    });
    const activeEntry = state.activeTimelineIndex >= 0
      ? state.currentTimeline[state.activeTimelineIndex]
      : null;
    const entry = activeEntry?.actorType === "player" && activeEntry.actorId === player.id
      ? activeEntry
      : playerEntries[0] ?? state.currentTimeline.find((item) => item.actorType === "player" && item.actorId === player.id);
    const cardData = state.suppressPlayerCard ? null : entry?.card;
    const article = document.createElement("article");
    article.className = `player-block ${cardData ? "" : "waiting-card"}`;
    article.innerHTML = `
      <div class="player-info">
        <div class="combatant-heading player-heading">
          <strong>${character.name}</strong>
        </div>
        <div class="combatant-portrait player-portrait">${portraitContent(character.image, character.shortLabel, "portrait-art")}</div>
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

  const playerEntry = state.currentTimeline.find((item, index) => {
    return item.actorType === "player" && !state.completedTimelineIndexes?.has(index);
  }) ?? state.currentTimeline.find((item) => item.actorType === "player");
  const drawnCardId = playerEntry?.card?.instanceId ?? playerEntry?.card?.id;
  if (drawnCardId && elements.playerHud.dataset.cardId !== drawnCardId) {
    const freshCard = elements.playerHud.querySelector(".player-block:not(.waiting-card) .hud-card");
    if (freshCard) freshCard.classList.add("card-just-drawn");
  }
  elements.playerHud.dataset.cardId = drawnCardId ?? "";
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

function cardPrefab(card) {
  if (!card) return "";
  const typeLabel = isPassiveCard(card) ? "패시브" : isTurnSustainCard(card) ? "턴 지속" : "";
  const footerLabel = typeLabel ? `<div class="cp-type-label">${typeLabel}</div>` : "";
  return `
    <div class="card-prefab ${rarityClass(card.rarity)}">
      <div class="cp-bg"></div>
      <div class="cp-banner"></div>
      <div class="cp-priority">${card.priority}</div>
      <div class="cp-name">${card.name}</div>
      <div class="cp-actions">${renderActionList(card)}</div>
      ${footerLabel}
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
  showDrawnCardReveal(playerEntry?.card, "이번 턴 내 카드", "player");
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

async function playTurnCue(entry) {
  // 적 차례는 따로 알리지 않고 지나간다 — 내 차례만 명확히 인지시킨다.
  if (entry.actorType !== "player") return;
  const host = document.querySelector("#turnCue");
  if (!host) return;
  const character = getSelectedCharacter();
  host.className = "turn-cue player";
  host.innerHTML = `
    <div class="turn-cue-panel">
      <span class="turn-cue-avatar">${portraitContent(character.image, character.shortLabel, "turn-cue-art")}</span>
      <div class="turn-cue-body">
        <span class="turn-cue-kicker">MY TURN</span>
        <strong class="turn-cue-name">내 차례</strong>
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
  PRI: { name: "우선권 (PRI)", desc: "숫자가 낮을수록 먼저 발동" },
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
  const kinds = ["PRI"]; // 우선권 배지는 모든 카드에 항상 존재
  tmp.querySelectorAll(".action-icon").forEach((el) => {
    const kind = [...el.classList].find((c) => c !== "action-icon");
    if (kind && ICON_HELP[kind] && !kinds.includes(kind)) kinds.push(kind);
  });
  if (tmp.querySelector(".pattern-icon") && !kinds.includes("pattern")) kinds.push("pattern");
  return kinds;
}

function helpGlyph(kind) {
  if (kind === "PRI") return `<span class="help-pri">PRI</span>`;
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

function passiveEffectLabel(action) {
  const labels = {
    baseAtkPercent: `공격력 ${percentChangeLabel(action.amount)}`,
    maxHpPercent: `최대 체력 ${percentChangeLabel(action.amount)}`,
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
  const topRects = [document.querySelector(".top-bar"), document.querySelector(".character-select")]
    .map((element) => element?.getBoundingClientRect())
    .filter(Boolean);
  const playerHudRect = elements.playerHud?.getBoundingClientRect();
  const top = topRects.length ? Math.max(...topRects.map((rect) => rect.bottom)) + CAMERA_UI_GAP : panelHeight * 0.14;
  const bottom = playerHudRect?.height ? playerHudRect.top - CAMERA_UI_GAP : panelHeight * 0.84;
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
elements.boardPanel.addEventListener("pointerdown", beginBoardCameraDrag);
elements.boardPanel.addEventListener("pointermove", moveBoardCameraDrag);
elements.boardPanel.addEventListener("pointerup", endBoardCameraDrag);
elements.boardPanel.addEventListener("pointercancel", endBoardCameraDrag);
elements.closeHelpButton.addEventListener("click", () => {
  elements.iconHelpOverlay.classList.add("hidden");
});
elements.iconHelpOverlay.addEventListener("click", (event) => {
  if (event.target === elements.iconHelpOverlay) {
    elements.iconHelpOverlay.classList.add("hidden");
  }
});
window.addEventListener("resize", () => {
  renderBoard();
});

newRun();
