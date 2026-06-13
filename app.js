const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  startOverlay: document.querySelector("#startOverlay"),
  rewardOverlay: document.querySelector("#rewardOverlay"),
  endOverlay: document.querySelector("#endOverlay"),
  startButton: document.querySelector("#startButton"),
  againButton: document.querySelector("#againButton"),
  restartButton: document.querySelector("#restartButton"),
  rerollButton: document.querySelector("#rerollButton"),
  choiceGrid: document.querySelector("#choiceGrid"),
  hpBar: document.querySelector("#hpBar"),
  shieldBar: document.querySelector("#shieldBar"),
  hpText: document.querySelector("#hpText"),
  shieldText: document.querySelector("#shieldText"),
  roomText: document.querySelector("#roomText"),
  pickText: document.querySelector("#pickText"),
  roomTypeText: document.querySelector("#roomTypeText"),
  enemyText: document.querySelector("#enemyText"),
  timeText: document.querySelector("#timeText"),
  roomBanner: document.querySelector("#roomBanner"),
  augmentList: document.querySelector("#augmentList"),
  buildSummary: document.querySelector("#buildSummary"),
  rewardLabel: document.querySelector("#rewardLabel"),
  rewardTitle: document.querySelector("#rewardTitle"),
  rewardText: document.querySelector("#rewardText"),
  endLabel: document.querySelector("#endLabel"),
  endTitle: document.querySelector("#endTitle"),
  endText: document.querySelector("#endText")
};

const rarityLabel = {
  normal: "노말",
  rare: "레어",
  epic: "에픽",
  legendary: "전설"
};

const rarityClass = {
  normal: "rarity-normal",
  rare: "rarity-rare",
  epic: "rarity-epic",
  legendary: "rarity-legendary"
};

const rarityWeights = {
  normal: { normal: 58, rare: 31, epic: 10, legendary: 1 },
  elite: { normal: 38, rare: 36, epic: 21, legendary: 5 },
  midboss: { normal: 18, rare: 36, epic: 34, legendary: 12 },
  rare: { normal: 18, rare: 34, epic: 35, legendary: 13 }
};

const augments = [
  {
    id: "highPressure",
    icon: "탄",
    name: "고압 탄환",
    rarity: "normal",
    tags: ["탄환", "피해"],
    text: "기본 투사체 피해가 증가한다.",
    max: 4,
    repeatable: true,
    synergy: ["doubleShot", "pierce", "barrage"],
    apply: (s) => {
      s.stats.damage += 5;
    }
  },
  {
    id: "rapidFire",
    icon: "속",
    name: "속사 모듈",
    rarity: "normal",
    tags: ["탄환", "속도"],
    text: "공격 간격이 짧아진다.",
    max: 4,
    repeatable: true,
    synergy: ["chillBullet", "shockBullet", "markBullet", "markHunt"],
    apply: (s) => {
      s.stats.fireDelay = Math.max(0.14, s.stats.fireDelay * 0.86);
    }
  },
  {
    id: "pierce",
    icon: "관",
    name: "관통 탄환",
    rarity: "normal",
    tags: ["탄환", "처치"],
    text: "투사체가 적을 추가로 관통한다.",
    max: 3,
    repeatable: true,
    synergy: ["gravity", "frostAura", "executeField"],
    apply: (s) => {
      s.stats.pierce += 1;
    }
  },
  {
    id: "chillBullet",
    icon: "냉",
    name: "냉기 탄환",
    rarity: "normal",
    tags: ["탄환", "상태"],
    text: "공격 적중 시 둔화를 부여한다.",
    max: 3,
    repeatable: true,
    synergy: ["frostAura", "frostBurst", "stormConductor"],
    apply: (s) => {
      s.stats.chillChance = Math.min(0.8, s.stats.chillChance + 0.22);
    }
  },
  {
    id: "boots",
    icon: "신",
    name: "기동 부츠",
    rarity: "normal",
    tags: ["이동"],
    text: "자동 이동 속도와 회피 거리가 증가한다.",
    max: 3,
    repeatable: true,
    synergy: ["autoDash", "trail", "infiniteCircuit"],
    apply: (s) => {
      s.player.speed += 22;
      s.stats.preferredRange += 8;
    }
  },
  {
    id: "autoDash",
    icon: "돌",
    name: "자동 대시",
    rarity: "normal",
    tags: ["이동", "트리거"],
    text: "일정 주기마다 안전한 방향으로 짧게 대시한다.",
    max: 1,
    repeatable: false,
    synergy: ["dashMine", "dashShield", "trail", "infiniteCircuit"],
    apply: (s) => {
      s.stats.autoDash += 1;
      s.stats.dashInterval = Math.max(1.25, s.stats.dashInterval - 0.35);
      s.stats.dashDamage += 12;
    }
  },
  {
    id: "trail",
    icon: "잔",
    name: "플라즈마 잔상",
    rarity: "normal",
    tags: ["이동", "장판"],
    text: "이동 경로에 짧게 남는 피해 장판을 만든다.",
    max: 1,
    repeatable: false,
    synergy: ["fieldSize", "executeField", "gravity", "singularity"],
    apply: (s) => {
      s.stats.trail += 1;
      s.stats.trailDamage += 6;
    }
  },
  {
    id: "emergencyHeal",
    icon: "회",
    name: "긴급 회복",
    rarity: "normal",
    tags: ["방어", "회복"],
    text: "방마다 1회, 체력이 낮아지면 자동 회복한다.",
    max: 1,
    repeatable: false,
    synergy: ["overShield", "dashShield"],
    apply: (s) => {
      s.stats.emergencyHeal += 1;
      s.player.maxHp += 18;
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + 28);
    }
  },
  {
    id: "shockwave",
    icon: "파",
    name: "충격 파동",
    rarity: "normal",
    tags: ["이동", "방어"],
    text: "가까운 적이 많을 때 자동으로 밀쳐내기 파동을 낸다.",
    max: 1,
    repeatable: false,
    synergy: ["boots", "frostAura", "overShield"],
    apply: (s) => {
      s.stats.shockwave += 1;
      s.stats.shockwaveCooldown = Math.max(1.55, s.stats.shockwaveCooldown - 0.35);
    }
  },
  {
    id: "dataMagnet",
    icon: "자",
    name: "데이터 자석",
    rarity: "normal",
    tags: ["경제"],
    text: "보상 품질이 조금 좋아지고 전술 데이터 계열 효과가 강해진다.",
    max: 3,
    repeatable: true,
    synergy: ["dataBurn", "scanner", "tacticalDominance"],
    apply: (s) => {
      s.stats.rarityBonus += 0.06;
      s.stats.dataPower += 1;
    }
  },
  {
    id: "doubleShot",
    icon: "쌍",
    name: "쌍열 발사",
    rarity: "rare",
    tags: ["탄환"],
    text: "기본 공격이 보조 투사체를 추가 발사한다.",
    max: 3,
    repeatable: true,
    synergy: ["highPressure", "chillBullet", "barrage"],
    apply: (s) => {
      s.stats.projectiles += 1;
    }
  },
  {
    id: "markBullet",
    icon: "표",
    name: "표식 탄환",
    rarity: "rare",
    tags: ["탄환", "표식"],
    text: "같은 적을 여러 번 맞히면 표식을 누적한다.",
    max: 1,
    repeatable: false,
    synergy: ["rapidFire", "markHunt", "barrage"],
    apply: (s) => {
      s.stats.markEnabled = true;
      s.stats.markBonus += 0.12;
    }
  },
  {
    id: "dashMine",
    icon: "뢰",
    name: "대시 지뢰",
    rarity: "rare",
    tags: ["이동", "장판"],
    text: "대시 지점에 지연 폭발 지뢰를 남긴다.",
    max: 1,
    repeatable: false,
    requires: [{ anyIds: ["autoDash"] }],
    synergy: ["autoDash", "fieldSize", "gravity"],
    apply: (s) => {
      s.stats.dashMine += 1;
    }
  },
  {
    id: "dashShield",
    icon: "막",
    name: "대시 보호막",
    rarity: "rare",
    tags: ["이동", "방어"],
    text: "대시 후 짧은 보호막을 얻는다.",
    max: 3,
    repeatable: true,
    requires: [{ anyIds: ["autoDash"] }],
    synergy: ["autoDash", "emergencyHeal", "overShield"],
    apply: (s) => {
      s.stats.dashShield += 18;
    }
  },
  {
    id: "fieldSize",
    icon: "확",
    name: "장판 확장",
    rarity: "rare",
    tags: ["장판"],
    text: "모든 장판과 폭발 범위가 넓어진다.",
    max: 3,
    repeatable: true,
    requires: [{ anyTags: ["장판"] }],
    synergy: ["trail", "frostAura", "executeField"],
    apply: (s) => {
      s.stats.fieldScale += 0.18;
    }
  },
  {
    id: "frostAura",
    icon: "빙",
    name: "냉기장",
    rarity: "rare",
    tags: ["상태", "장판"],
    text: "캐릭터 주변에 둔화와 지속 피해 영역을 만든다.",
    max: 1,
    repeatable: false,
    synergy: ["chillBullet", "pierce", "frostBurst"],
    apply: (s) => {
      s.stats.frostAura += 1;
      s.stats.frostRadius += 18;
    }
  },
  {
    id: "shockBullet",
    icon: "전",
    name: "감전 탄환",
    rarity: "rare",
    tags: ["탄환", "상태"],
    text: "공격 적중 시 감전을 부여한다.",
    max: 3,
    repeatable: true,
    synergy: ["rapidFire", "shockSpread", "stormConductor"],
    apply: (s) => {
      s.stats.shockChance = Math.min(0.75, s.stats.shockChance + 0.22);
    }
  },
  {
    id: "markHunt",
    icon: "사",
    name: "표식 사냥",
    rarity: "rare",
    tags: ["표식", "처치"],
    text: "표식 적에게 주는 피해가 증가하고 처치 시 공격 속도가 오른다.",
    max: 2,
    repeatable: true,
    synergy: ["markBullet", "rapidFire", "barrage"],
    apply: (s) => {
      s.stats.markDamage += 0.22;
      s.stats.markHaste += 0.18;
    }
  },
  {
    id: "rerollKit",
    icon: "굴",
    name: "리롤 장치",
    rarity: "rare",
    tags: ["경제", "드래프트"],
    text: "보상 리롤 품질이 좋아진다.",
    max: 2,
    repeatable: true,
    synergy: ["scanner", "tacticalDominance"],
    apply: (s) => {
      s.stats.rerollQuality += 1;
      s.stats.rarityBonus += 0.04;
    }
  },
  {
    id: "scanner",
    icon: "탐",
    name: "전술 스캐너",
    rarity: "rare",
    tags: ["경제", "드래프트"],
    text: "현재 보유 태그와 직접 연결되는 후보가 더 잘 등장한다.",
    max: 2,
    repeatable: true,
    synergy: ["dataMagnet", "rerollKit", "tacticalDominance"],
    apply: (s) => {
      s.stats.synergyBias += 1;
    }
  },
  {
    id: "tripleShot",
    icon: "삼",
    name: "삼연 발사",
    rarity: "epic",
    tags: ["탄환"],
    text: "일정 공격마다 3방향 투사체를 발사한다.",
    max: 1,
    repeatable: false,
    synergy: ["doubleShot", "highPressure", "barrage"],
    apply: (s) => {
      s.stats.tripleShot += 1;
    }
  },
  {
    id: "frostBurst",
    icon: "파",
    name: "냉기 파열",
    rarity: "epic",
    tags: ["상태", "처치"],
    text: "둔화된 적을 처치하면 냉기 폭발이 발생한다.",
    max: 1,
    repeatable: false,
    requires: [
      { anyIds: ["chillBullet", "frostAura", "stormConductor"] }
    ],
    synergy: ["chillBullet", "frostAura", "fieldSize"],
    apply: (s) => {
      s.stats.frostBurst += 1;
    }
  },
  {
    id: "shockSpread",
    icon: "전",
    name: "감전 전이",
    rarity: "epic",
    tags: ["상태", "처치"],
    text: "감전 피해가 주변 적에게 전파된다.",
    max: 1,
    repeatable: false,
    requires: [{ anyIds: ["shockBullet", "stormConductor"] }],
    synergy: ["shockBullet", "rapidFire", "stormConductor"],
    apply: (s) => {
      s.stats.shockSpread += 1;
    }
  },
  {
    id: "gravity",
    icon: "중",
    name: "중력장",
    rarity: "epic",
    tags: ["장판", "제어"],
    text: "적을 가장 강한 장판 중심으로 끌어당긴다.",
    max: 1,
    repeatable: false,
    requires: [{ anyTags: ["장판"] }],
    synergy: ["trail", "dashMine", "executeField", "singularity"],
    apply: (s) => {
      s.stats.gravity += 1;
    }
  },
  {
    id: "executeField",
    icon: "처",
    name: "장판 처형",
    rarity: "epic",
    tags: ["장판", "처치"],
    text: "장판 위의 낮은 체력 적을 처형하고 폭발시킨다.",
    max: 1,
    repeatable: false,
    requires: [{ anyTags: ["장판"] }],
    synergy: ["trail", "fieldSize", "gravity"],
    apply: (s) => {
      s.stats.executeField += 1;
    }
  },
  {
    id: "lightningBurst",
    icon: "폭",
    name: "번개 폭발",
    rarity: "epic",
    tags: ["상태", "폭발"],
    text: "감전된 적 처치 시 주변에 번개 폭발이 발생한다.",
    max: 1,
    repeatable: false,
    requires: [{ anyIds: ["shockBullet", "stormConductor"] }],
    synergy: ["shockBullet", "shockSpread", "stormConductor"],
    apply: (s) => {
      s.stats.lightningBurst += 1;
    }
  },
  {
    id: "dataBurn",
    icon: "연",
    name: "데이터 연소",
    rarity: "epic",
    tags: ["경제", "폭발"],
    text: "다음 방 시작 시 전술 데이터 폭발을 일으킨다.",
    max: 1,
    repeatable: false,
    synergy: ["dataMagnet", "scanner", "tacticalDominance"],
    apply: (s) => {
      s.stats.dataBurn += 1;
      s.stats.dataBurnDamage += 36;
    }
  },
  {
    id: "overShield",
    icon: "과",
    name: "과충전 보호막",
    rarity: "epic",
    tags: ["방어", "피해"],
    text: "회복과 보호막 획득 일부가 주변 피해로 변환된다.",
    max: 1,
    repeatable: false,
    synergy: ["emergencyHeal", "dashShield", "shockwave"],
    apply: (s) => {
      s.stats.overShield += 1;
    }
  },
  {
    id: "barrage",
    icon: "탄",
    name: "탄막 과부하",
    rarity: "legendary",
    tags: ["탄환", "전설"],
    text: "일정 공격마다 보유한 탄환 효과를 복제 발동한다.",
    max: 1,
    repeatable: false,
    synergy: ["highPressure", "doubleShot", "tripleShot"],
    apply: (s) => {
      s.stats.barrage = true;
    }
  },
  {
    id: "stormConductor",
    icon: "폭",
    name: "폭풍 전도체",
    rarity: "legendary",
    tags: ["상태", "전설"],
    text: "냉기와 감전이 서로 다른 상태를 추가로 유발한다.",
    max: 1,
    repeatable: false,
    requires: [
      {
        anyIds: ["chillBullet", "frostAura", "shockBullet", "frostBurst", "shockSpread", "lightningBurst"]
      }
    ],
    synergy: ["shockSpread", "frostBurst", "shockBullet", "chillBullet"],
    apply: (s) => {
      s.stats.stormConductor = true;
    }
  },
  {
    id: "infiniteCircuit",
    icon: "궤",
    name: "무한 궤도",
    rarity: "legendary",
    tags: ["이동", "장판", "전설"],
    text: "자동 이동이 궤도화되고 대시/잔상 효과가 더 자주 발동한다.",
    max: 1,
    repeatable: false,
    requires: [{ anyIds: ["autoDash"], anyTags: ["장판"] }],
    synergy: ["autoDash", "trail", "dashMine"],
    apply: (s) => {
      s.stats.infiniteCircuit = true;
      s.stats.dashInterval = Math.max(0.95, s.stats.dashInterval - 0.55);
      s.stats.trail += 1;
    }
  },
  {
    id: "singularity",
    icon: "붕",
    name: "특이점 붕괴",
    rarity: "legendary",
    tags: ["장판", "제어", "전설"],
    text: "끌어당김과 장판 피해가 누적되면 큰 폭발이 발생한다.",
    max: 1,
    repeatable: false,
    requires: [{ anyTags: ["장판"] }, { anyIds: ["gravity"] }],
    synergy: ["gravity", "executeField", "dataBurn"],
    apply: (s) => {
      s.stats.singularity = true;
    }
  },
  {
    id: "tacticalDominance",
    icon: "지",
    name: "전술 지배",
    rarity: "legendary",
    tags: ["경제", "드래프트", "전설"],
    text: "다음 보상에서 현재 핵심 태그가 더 강하게 보장된다.",
    max: 1,
    repeatable: false,
    synergy: ["dataMagnet", "scanner", "rerollKit"],
    apply: (s) => {
      s.stats.tacticalDominance += 3;
      s.stats.rarityBonus += 0.12;
    }
  }
];

const augmentById = Object.fromEntries(augments.map((augment) => [augment.id, augment]));

let state;
let lastFrame = 0;

function createState() {
  return {
    phase: "start",
    time: 0,
    room: 0,
    picks: 0,
    kills: 0,
    rewardQueue: [],
    currentChoices: [],
    rerolled: false,
    targetId: null,
    width: 900,
    height: 620,
    player: {
      x: 450,
      y: 360,
      r: 15,
      hp: 220,
      maxHp: 220,
      shield: 0,
      speed: 185,
      vx: 0,
      vy: 0,
      aimAngle: -Math.PI / 2,
      invuln: 0,
      roomHealUsed: false
    },
    stats: {
      damage: 22,
      fireDelay: 0.32,
      projectiles: 1,
      pierce: 0,
      chillChance: 0,
      shockChance: 0,
      markEnabled: true,
      markBonus: 0.12,
      markDamage: 0.1,
      markHaste: 0,
      preferredRange: 185,
      autoDash: 0,
      dashInterval: 2.8,
      dashCooldown: 1.8,
      dashDamage: 32,
      dashShield: 0,
      dashMine: 0,
      trail: 0,
      trailDamage: 12,
      trailTimer: 0,
      fieldScale: 1,
      emergencyHeal: 0,
      shockwave: 0,
      shockwaveCooldown: 3.8,
      shockwaveTimer: 2.2,
      frostAura: 0,
      frostRadius: 92,
      tripleShot: 0,
      frostBurst: 0,
      shockSpread: 0,
      gravity: 0,
      gravityTimer: 0,
      executeField: 0,
      lightningBurst: 0,
      dataBurn: 0,
      dataBurnDamage: 0,
      dataPower: 0,
      overShield: 0,
      barrage: false,
      stormConductor: false,
      infiniteCircuit: false,
      singularity: false,
      tacticalDominance: 0,
      synergyBias: 0,
      rerollQuality: 0,
      rarityBonus: 0
    },
    owned: {},
    ownedOrder: [],
    enemies: [],
    pendingSpawns: [],
    spawnTimer: 0,
    bullets: [],
    hazards: [],
    particles: [],
    texts: [],
    roomInfo: null,
    fireTimer: 0,
    shotCount: 0,
    hasteTimer: 0,
    messageTimer: 0
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(360, Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state) {
    const oldW = state.width || width;
    const oldH = state.height || height;
    state.width = width;
    state.height = height;
    state.player.x = clamp(state.player.x * (width / oldW), 30, width - 30);
    state.player.y = clamp(state.player.y * (height / oldH), 30, height - 30);
  }
}

function startRun() {
  state = createState();
  resizeCanvas();
  ui.startOverlay.classList.add("hidden");
  ui.endOverlay.classList.add("hidden");
  ui.rewardOverlay.classList.add("hidden");
  state.phase = "combat";
  startRoom(1);
  updateUi(true);
}

function startRoom(roomNumber) {
  state.room = roomNumber;
  state.phase = "combat";
  state.enemies = [];
  state.pendingSpawns = [];
  state.targetId = null;
  state.spawnTimer = 0;
  state.bullets = [];
  state.hazards = [];
  state.texts = [];
  state.player.roomHealUsed = false;
  state.player.x = state.width * 0.5;
  state.player.y = state.height * 0.58;
  state.fireTimer = 0.12;
  state.roomInfo = getRoomInfo(roomNumber);
  spawnRoom(state.roomInfo);
  showBanner(`${state.roomInfo.title}`);
  if (state.stats.dataBurn > 0) {
    setTimeout(() => {
      if (state && state.phase === "combat") {
        explode(state.width * 0.5, state.height * 0.52, 120, state.stats.dataBurnDamage + state.stats.dataPower * 16, "data");
      }
    }, 350);
  }
}

function getRoomInfo(room) {
  if (room === 15) {
    return { room, type: "final", title: "ROOM 15 · 최종 보스", rewardType: "final" };
  }
  if (room === 5 || room === 10) {
    return { room, type: "midboss", title: `ROOM ${room} · 중간보스`, rewardType: "midboss" };
  }
  if ([4, 8, 12, 14].includes(room)) {
    return { room, type: "elite", title: `ROOM ${room} · 엘리트`, rewardType: "elite" };
  }
  return { room, type: "normal", title: `ROOM ${room}`, rewardType: "normal" };
}

function spawnRoom(info) {
  const room = info.room;
  if (info.type === "final") {
    spawnEnemy("finalBoss", state.width * 0.5, 90, room);
    queueSpawns(26, (i) => (i % 5 === 0 ? "brute" : i % 2 === 0 ? "runner" : "normal"));
    releaseSpawns(7);
    return;
  }
  if (info.type === "midboss") {
    spawnEnemy("midboss", state.width * 0.5, 85, room);
    queueSpawns(12 + Math.floor(room * 0.8), (i) => (i % 4 === 0 ? "brute" : i % 2 ? "runner" : "normal"));
    releaseSpawns(5);
    return;
  }
  const count = Math.floor(11 + room * 2.2 + (info.type === "elite" ? 6 : 0));
  queueSpawns(count, (i) => {
    const roll = Math.random();
    if (info.type === "elite" && i < 3) return "brute";
    if (roll > 0.8) return "brute";
    if (roll > 0.52) return "runner";
    return "normal";
  });
  releaseSpawns(info.type === "elite" ? 7 : 6);
}

function queueSpawns(count, getType) {
  for (let i = 0; i < count; i += 1) {
    state.pendingSpawns.push(getType(i));
  }
}

function releaseSpawns(count) {
  for (let i = 0; i < count && state.pendingSpawns.length > 0; i += 1) {
    spawnAtEdge(state.pendingSpawns.shift(), state.room);
  }
}

function spawnAtEdge(type, room) {
  const pad = 36;
  const side = Math.floor(Math.random() * 4);
  let x = pad + Math.random() * (state.width - pad * 2);
  let y = pad + Math.random() * (state.height - pad * 2);
  if (side === 0) y = pad;
  if (side === 1) x = state.width - pad;
  if (side === 2) y = state.height - pad;
  if (side === 3) x = pad;
  spawnEnemy(type, x, y, room);
}

function spawnEnemy(type, x, y, room) {
  const scale = 1 + room * 0.09;
  const base = {
    normal: { hp: 44, speed: 70, r: 13, damage: 8, color: "#ff6b68" },
    runner: { hp: 32, speed: 114, r: 10, damage: 6, color: "#ff9f45" },
    brute: { hp: 90, speed: 50, r: 18, damage: 12, color: "#b998ff" },
    midboss: { hp: 500 + room * 38, speed: 46, r: 30, damage: 16, color: "#ffd166", boss: true },
    finalBoss: { hp: 1140, speed: 40, r: 38, damage: 22, color: "#fff7e6", boss: true, final: true }
  }[type];
  state.enemies.push({
    id: cryptoRandom(),
    type,
    x,
    y,
    r: base.r,
    hp: base.hp * scale,
    maxHp: base.hp * scale,
    speed: base.speed,
    damage: base.damage,
    color: base.color,
    boss: !!base.boss,
    final: !!base.final,
    slow: 0,
    shock: 0,
    mark: 0,
    hitFlash: 0,
    contactTimer: 0,
    specialTimer: base.boss ? 2.8 : 0
  });
}

function gameLoop(now) {
  const dt = Math.min(0.033, (now - lastFrame) / 1000 || 0);
  lastFrame = now;
  if (state && state.phase === "combat") updateCombat(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function updateCombat(dt) {
  state.time += dt;
  updateSpawns(dt);
  state.player.invuln = Math.max(0, state.player.invuln - dt);
  state.hasteTimer = Math.max(0, state.hasteTimer - dt);
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateHazards(dt);
  updateParticles(dt);
  updateTexts(dt);
  if (state.enemies.length === 0 && state.pendingSpawns.length === 0) completeRoom();
  updateUi();
}

function updateSpawns(dt) {
  if (state.pendingSpawns.length === 0) return;
  state.spawnTimer -= dt;
  const pressureLimit = state.roomInfo?.type === "final" ? 16 : state.roomInfo?.type === "midboss" ? 12 : 10;
  if (state.spawnTimer <= 0 && state.enemies.length < pressureLimit) {
    state.spawnTimer = state.roomInfo?.type === "elite" ? 0.72 : 0.62;
    releaseSpawns(state.roomInfo?.type === "normal" ? 2 : 1);
  }
}

function updatePlayer(dt) {
  const player = state.player;
  const target = pickTarget();
  let moveX = 0;
  let moveY = 0;
  if (target) {
    const dx = player.x - target.x;
    const dy = player.y - target.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const keep = state.stats.preferredRange;
    const rangeBand = 34;
    let away = 0;
    if (dist < keep - rangeBand) away = clamp((keep - rangeBand - dist) / 100, 0, 1);
    if (dist > keep + rangeBand) away = -clamp((dist - keep - rangeBand) / 150, 0, 0.72);
    const orbit = state.stats.infiniteCircuit ? 0.72 : 0;
    moveX += (dx / dist) * away + (-dy / dist) * orbit;
    moveY += (dy / dist) * away + (dx / dist) * orbit;
  } else {
    moveX = state.width * 0.5 - player.x;
    moveY = state.height * 0.55 - player.y;
  }
  const edge = 58;
  if (player.x < edge) moveX += 1.8;
  if (player.x > state.width - edge) moveX -= 1.8;
  if (player.y < edge) moveY += 1.8;
  if (player.y > state.height - edge) moveY -= 1.8;
  const wallPush = getWallPush(player.x, player.y, 92);
  moveX += wallPush.x * (2.2 + wallPush.strength);
  moveY += wallPush.y * (2.2 + wallPush.strength);
  for (const enemy of state.enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distToEnemy = Math.max(1, Math.hypot(dx, dy));
    const avoidRange = enemy.boss ? 150 : 118;
    if (distToEnemy < avoidRange) {
      const push = ((avoidRange - distToEnemy) / avoidRange) * (enemy.boss ? 1.4 : 1);
      moveX += (dx / distToEnemy) * push;
      moveY += (dy / distToEnemy) * push;
    }
  }
  const moveIntent = Math.hypot(moveX, moveY);
  const rawDirection = normalizeVector(moveX, moveY);
  const direction = moveIntent > 0.18
    ? wallPush.strength > 0.45
      ? choosePlayerMoveDirection(moveX, moveY, target)
      : rawDirection
    : { x: 0, y: 0 };
  const bounds = getPlayerBounds();
  if (moveIntent <= 0.18) {
    player.vx = 0;
    player.vy = 0;
  } else {
    const steering = 1 - Math.exp(-dt * 8);
    player.vx += (direction.x - player.vx) * steering;
    player.vy += (direction.y - player.vy) * steering;
  }
  player.x = clamp(player.x + player.vx * player.speed * dt, bounds.minX, bounds.maxX);
  player.y = clamp(player.y + player.vy * player.speed * dt, bounds.minY, bounds.maxY);
  updateAimAngle(target);

  if (state.stats.trail > 0 || state.stats.infiniteCircuit) {
    state.stats.trailTimer -= dt;
    const interval = state.stats.infiniteCircuit ? 0.075 : 0.12;
    if (state.stats.trailTimer <= 0) {
      state.stats.trailTimer = interval;
      addHazard("trail", player.x, player.y, 34 * state.stats.fieldScale, 1.15, state.stats.trailDamage + state.stats.trail * 4);
    }
  }

  if (state.stats.autoDash > 0) {
    state.stats.dashCooldown -= dt;
    if (state.stats.dashCooldown <= 0) {
      state.stats.dashCooldown = state.stats.dashInterval;
      dashPlayer();
    }
  }

  if (state.stats.shockwave > 0) {
    state.stats.shockwaveTimer -= dt;
    const nearby = state.enemies.filter((enemy) => dist(enemy, player) < 104).length;
    if (state.stats.shockwaveTimer <= 0 && nearby >= 2) {
      state.stats.shockwaveTimer = state.stats.shockwaveCooldown;
      explode(player.x, player.y, 92 + state.stats.shockwave * 16, 28 + state.stats.shockwave * 12, "shockwave", true);
      addText(player.x, player.y - 30, "충격 파동", "#58d7ff");
    }
  }

  if (state.stats.frostAura > 0) {
    const radius = (state.stats.frostRadius + state.stats.frostAura * 12) * state.stats.fieldScale;
    for (const enemy of state.enemies) {
      if (dist(enemy, player) < radius) {
        enemy.slow = Math.max(enemy.slow, 0.42);
        damageEnemy(enemy, (6 + state.stats.frostAura * 3) * dt, { type: "frost", status: "chill" });
        if (state.stats.executeField > 0 && enemy.hp < enemy.maxHp * (0.12 + state.stats.executeField * 0.05)) {
          damageEnemy(enemy, enemy.hp + 1, { type: "execute" });
        }
      }
    }
  }

  if (state.stats.emergencyHeal > 0 && !player.roomHealUsed && player.hp < player.maxHp * 0.34) {
    player.roomHealUsed = true;
    healPlayer(44 + state.stats.emergencyHeal * 18);
    addText(player.x, player.y - 34, "긴급 회복", "#7ee08a");
  }

  fireAuto(dt);
}

function dashPlayer() {
  const player = state.player;
  const sx = player.x;
  const sy = player.y;
  const distance = 112 + state.stats.autoDash * 14;
  const direction = choosePlayerMoveDirection(player.vx, player.vy, currentTarget() || pickTarget(), distance);
  player.vx = direction.x;
  player.vy = direction.y;
  player.x = clamp(player.x + player.vx * distance, 28, state.width - 28);
  player.y = clamp(player.y + player.vy * distance, 34, state.height - 28);
  updateAimAngle(currentTarget());
  damageLine(sx, sy, player.x, player.y, 38, state.stats.dashDamage + state.stats.autoDash * 6);
  addParticle((sx + player.x) / 2, (sy + player.y) / 2, "dash", "#ffd166", 0.45, distance);
  if (state.stats.dashShield > 0) addShield(state.stats.dashShield);
  if (state.stats.dashMine > 0) {
    addHazard("mine", sx, sy, 44 * state.stats.fieldScale, 2.2, 44 + state.stats.dashMine * 18);
  }
}

function fireAuto(dt) {
  state.fireTimer -= dt;
  if (state.fireTimer > 0) return;
  const haste = state.hasteTimer > 0 ? 1 - Math.min(0.45, state.stats.markHaste) : 1;
  state.fireTimer = state.stats.fireDelay * haste;
  const target = pickTarget();
  if (!target) return;

  state.shotCount += 1;
  const baseAngle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
  let count = state.stats.projectiles;
  if (state.stats.tripleShot > 0 && state.shotCount % Math.max(2, 5 - state.stats.tripleShot) === 0) count += 2;
  if (state.stats.barrage && state.shotCount % 5 === 0) count += 2;
  const spread = count === 1 ? 0 : Math.min(0.55, 0.14 * (count - 1));
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    spawnBullet(baseAngle + t * spread);
  }
}

function spawnBullet(angle) {
  const speed = 620;
  state.bullets.push({
    x: state.player.x + Math.cos(angle) * 18,
    y: state.player.y + Math.sin(angle) * 18,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 4,
    life: 1.45,
    damage: state.stats.damage,
    pierce: state.stats.pierce,
    chill: Math.random() < state.stats.chillChance,
    shock: Math.random() < state.stats.shockChance,
    mark: state.stats.markEnabled
  });
}

function updateEnemies(dt) {
  const player = state.player;
  for (const enemy of [...state.enemies]) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 5);
    enemy.slow = Math.max(0, enemy.slow - dt);
    enemy.shock = Math.max(0, enemy.shock - dt);
    enemy.contactTimer = Math.max(0, enemy.contactTimer - dt);
    enemy.specialTimer = Math.max(0, enemy.specialTimer - dt);
    if (enemy.boss && enemy.specialTimer <= 0) {
      enemy.specialTimer = enemy.final ? 2.45 : 3.15;
      bossPulse(enemy);
    }
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    let speed = enemy.speed * (enemy.slow > 0 ? 0.52 : 1);
    if (enemy.shock > 0) speed *= 0.82;
    enemy.x += (dx / d) * speed * dt;
    enemy.y += (dy / d) * speed * dt;
    if (d < enemy.r + player.r + 2 && enemy.contactTimer <= 0) {
      enemy.contactTimer = 0.78;
      hurtPlayer(enemy.damage);
    }
  }
  if (state.stats.gravity > 0) updateGravity(dt);
}

function bossPulse(enemy) {
  const radius = enemy.final ? 128 : 96;
  explode(enemy.x, enemy.y, radius, enemy.final ? 42 : 30, "boss", true);
  addText(enemy.x, enemy.y - enemy.r - 18, enemy.final ? "최종 보스 패턴" : "중간보스 패턴", "#ffd166");
  if (enemy.final) {
    for (let i = 0; i < 3; i += 1) spawnAtEdge(i % 2 ? "runner" : "normal", state.room);
  }
}

function updateGravity(dt) {
  state.stats.gravityTimer -= dt;
  if (state.stats.gravityTimer > 0) return;
  state.stats.gravityTimer = state.stats.singularity ? 1.45 : 1.9;
  const anchor = strongestHazard() || state.player;
  for (const enemy of state.enemies) {
    const dx = anchor.x - enemy.x;
    const dy = anchor.y - enemy.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    if (d < 260) {
      enemy.x += (dx / d) * 30 * state.stats.gravity;
      enemy.y += (dy / d) * 30 * state.stats.gravity;
    }
  }
  addParticle(anchor.x, anchor.y, "ring", "#b998ff", 0.55, 140);
  if (state.stats.singularity) {
    explode(anchor.x, anchor.y, 92 * state.stats.fieldScale, 46, "singularity");
  }
}

function strongestHazard() {
  let best = null;
  for (const hazard of state.hazards) {
    if (!best || hazard.r > best.r) best = hazard;
  }
  return best;
}

function updateBullets(dt) {
  for (const bullet of [...state.bullets]) {
    bullet.life -= dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    for (const enemy of [...state.enemies]) {
      if (dist(bullet, enemy) <= bullet.r + enemy.r) {
        const extra = enemy.mark > 0 ? 1 + enemy.mark * state.stats.markBonus + state.stats.markDamage : 1;
        damageEnemy(enemy, bullet.damage * extra, {
          type: "bullet",
          chill: bullet.chill,
          shock: bullet.shock,
          mark: bullet.mark
        });
        bullet.pierce -= 1;
        if (bullet.pierce < 0) {
          bullet.life = 0;
          break;
        }
      }
    }
    if (bullet.life <= 0 || bullet.x < -20 || bullet.x > state.width + 20 || bullet.y < -20 || bullet.y > state.height + 20) {
      removeItem(state.bullets, bullet);
    }
  }
}

function updateHazards(dt) {
  for (const hazard of [...state.hazards]) {
    hazard.life -= dt;
    if (hazard.type === "mine") {
      const trigger = state.enemies.find((enemy) => dist(enemy, hazard) < enemy.r + hazard.r * 0.65);
      if (trigger) {
        explode(hazard.x, hazard.y, hazard.r * 1.35, hazard.damage, "mine");
        hazard.life = 0;
      }
    } else {
      for (const enemy of [...state.enemies]) {
        if (dist(enemy, hazard) < enemy.r + hazard.r) {
          damageEnemy(enemy, hazard.damage * dt, { type: "hazard" });
          if (state.stats.executeField > 0 && enemy.hp < enemy.maxHp * (0.12 + state.stats.executeField * 0.05)) {
            damageEnemy(enemy, enemy.hp + 1, { type: "execute" });
          }
        }
      }
    }
    if (hazard.life <= 0) removeItem(state.hazards, hazard);
  }
}

function updateParticles(dt) {
  for (const particle of [...state.particles]) {
    particle.life -= dt;
    particle.x += (particle.vx || 0) * dt;
    particle.y += (particle.vy || 0) * dt;
    if (particle.life <= 0) removeItem(state.particles, particle);
  }
}

function updateTexts(dt) {
  for (const text of [...state.texts]) {
    text.life -= dt;
    text.y -= 22 * dt;
    if (text.life <= 0) removeItem(state.texts, text);
  }
}

function damageEnemy(enemy, amount, meta = {}) {
  if (!state.enemies.includes(enemy)) return;
  if (meta.chill || meta.status === "chill") {
    enemy.slow = Math.max(enemy.slow, 1.3);
    if (state.stats.stormConductor) enemy.shock = Math.max(enemy.shock, 1.0);
  }
  if (meta.shock || meta.status === "shock") {
    enemy.shock = Math.max(enemy.shock, 1.4);
    if (state.stats.stormConductor) enemy.slow = Math.max(enemy.slow, 1.0);
    if (state.stats.shockSpread > 0) shockSpread(enemy, amount * 0.24);
  }
  if (meta.mark) enemy.mark = Math.min(6, enemy.mark + 1);
  enemy.hp -= amount;
  enemy.hitFlash = 1;
  if (enemy.hp <= 0) killEnemy(enemy, meta);
}

function killEnemy(enemy, meta = {}) {
  if (!state.enemies.includes(enemy)) return;
  removeItem(state.enemies, enemy);
  state.kills += 1;
  addParticle(enemy.x, enemy.y, "burst", enemy.color, 0.55, enemy.r * 2.4);
  if (enemy.mark > 0 && state.stats.markHaste > 0) state.hasteTimer = 2.5;
  if (enemy.slow > 0 && state.stats.frostBurst > 0) {
    explode(enemy.x, enemy.y, 72 * state.stats.fieldScale, 28 + state.stats.frostBurst * 12, "frost");
  }
  if (enemy.shock > 0 && state.stats.lightningBurst > 0) {
    explode(enemy.x, enemy.y, 82 * state.stats.fieldScale, 34 + state.stats.lightningBurst * 14, "lightning");
  }
  if (meta.type === "execute") {
    explode(enemy.x, enemy.y, 58 * state.stats.fieldScale, 22 + state.stats.executeField * 10, "execute");
  }
}

function shockSpread(source, amount) {
  for (const enemy of state.enemies) {
    if (enemy !== source && dist(source, enemy) < 92) {
      enemy.shock = Math.max(enemy.shock, 0.8);
      enemy.hp -= amount;
      enemy.hitFlash = 1;
      if (enemy.hp <= 0) killEnemy(enemy, { type: "shock" });
    }
  }
}

function damageLine(x1, y1, x2, y2, radius, damage) {
  for (const enemy of [...state.enemies]) {
    if (distanceToSegment(enemy.x, enemy.y, x1, y1, x2, y2) < radius + enemy.r) {
      damageEnemy(enemy, damage, { type: "dash" });
      const dx = enemy.x - x1;
      const dy = enemy.y - y1;
      const len = Math.hypot(dx, dy) || 1;
      enemy.x += (dx / len) * 18;
      enemy.y += (dy / len) * 18;
    }
  }
}

function explode(x, y, radius, damage, type = "blast", knockback = false) {
  const scaledRadius = radius * state.stats.fieldScale;
  addParticle(x, y, "ring", colorForType(type), 0.48, scaledRadius);
  for (const enemy of [...state.enemies]) {
    const d = dist(enemy, { x, y });
    if (d < scaledRadius + enemy.r) {
      damageEnemy(enemy, damage * (1 - Math.min(0.65, d / (scaledRadius * 1.6))), { type, shock: type === "lightning" });
      if (knockback) {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const len = Math.hypot(dx, dy) || 1;
        enemy.x += (dx / len) * 24;
        enemy.y += (dy / len) * 24;
      }
    }
  }
  if (type === "boss" && dist(state.player, { x, y }) < scaledRadius + state.player.r) {
    hurtPlayer(damage * 0.38);
  }
}

function addHazard(type, x, y, r, life, damage) {
  state.hazards.push({ type, x, y, r, life, maxLife: life, damage });
}

function healPlayer(amount) {
  const before = state.player.hp;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
  const healed = state.player.hp - before;
  if (healed > 0 && state.stats.overShield > 0) {
    explode(state.player.x, state.player.y, 78, healed * (0.55 + state.stats.overShield * 0.25), "heal");
  }
}

function addShield(amount) {
  state.player.shield = Math.min(150, state.player.shield + amount);
  if (state.stats.overShield > 0) {
    explode(state.player.x, state.player.y, 72, amount * (0.5 + state.stats.overShield * 0.2), "shield");
  }
}

function hurtPlayer(amount) {
  if (state.player.invuln > 0) return;
  state.player.invuln = 0.18;
  let remaining = amount;
  const shieldHit = Math.min(state.player.shield, remaining);
  state.player.shield -= shieldHit;
  remaining -= shieldHit;
  state.player.hp -= remaining;
  addParticle(state.player.x, state.player.y, "hit", "#ff6b68", 0.28, 42);
  if (state.player.hp <= 0) endRun(false);
}

function completeRoom() {
  if (state.phase !== "combat") return;
  if (state.room >= 15) {
    endRun(true);
    return;
  }
  healPlayer(18 + state.room * 2);
  addShield(8);
  state.phase = "reward";
  const queue = state.room === 5 || state.room === 10 ? ["midboss", "rare"] : [state.roomInfo.rewardType];
  state.rewardQueue = queue;
  showReward();
}

function showReward() {
  const rewardType = state.rewardQueue[0] || "normal";
  state.rerolled = false;
  state.currentChoices = generateChoices(rewardType);
  ui.rewardOverlay.classList.remove("hidden");
  ui.rewardLabel.textContent = rewardType === "midboss" ? "MID BOSS CLEAR" : rewardType === "elite" ? "ELITE CLEAR" : "ROOM CLEAR";
  ui.rewardTitle.textContent = rewardType === "midboss" ? "중간보스 보상" : "증강 선택";
  ui.rewardText.textContent = rewardType === "midboss" ? "3지선다를 선택한다. 중간보스는 추가 선택권을 준다." : "3개 후보 중 1개를 선택한다.";
  ui.rerollButton.disabled = false;
  ui.rerollButton.textContent = `리롤 ${state.stats.rerollQuality > 0 ? "강화" : "1회"}`;
  renderChoices();
}

function renderChoices() {
  ui.choiceGrid.innerHTML = "";
  for (const choice of state.currentChoices) {
    const button = document.createElement("button");
    button.className = `choice-card ${rarityClass[choice.rarity]}`;
    button.type = "button";
    button.innerHTML = `
      <div class="choice-top">
        <span class="choice-icon">${choice.icon}</span>
        <span class="rarity">${rarityLabel[choice.rarity]}</span>
      </div>
      <h3>${choice.name}</h3>
      <p>${choice.text}</p>
      <div class="tag-row">${choice.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
      <div class="stack-rule">${choiceStackText(choice)}</div>
      <div class="synergy">${choice.reason}</div>
    `;
    button.addEventListener("click", () => chooseAugment(choice.id));
    ui.choiceGrid.appendChild(button);
  }
}

function chooseAugment(id) {
  const augment = augmentById[id];
  if (!augment) return;
  state.owned[id] = (state.owned[id] || 0) + 1;
  if (!state.ownedOrder.includes(id)) state.ownedOrder.unshift(id);
  augment.apply(state);
  state.picks += 1;
  state.rewardQueue.shift();
  if (state.stats.tacticalDominance > 0) state.stats.tacticalDominance -= 1;
  addText(state.player.x, state.player.y - 34, augment.name, "#ffd166");
  updateUi(true);
  if (state.rewardQueue.length > 0) {
    showReward();
    return;
  }
  ui.rewardOverlay.classList.add("hidden");
  startRoom(state.room + 1);
}

function generateChoices(rewardType) {
  const picked = [];
  const pool = augments.filter((augment) => canOffer(augment));
  const currentTags = topTags();
  const slots = ["direct", "pivot", "utility"];
  for (const slot of slots) {
    const candidate = pickWeighted(pool, picked, currentTags, rewardType, slot);
    if (candidate) picked.push(candidate);
  }
  while (picked.length < 3) {
    const candidate = pickWeighted(pool, picked, currentTags, rewardType, "wild");
    if (!candidate) break;
    picked.push(candidate);
  }
  return picked.map((augment) => ({
    ...augment,
    reason: synergyReason(augment, currentTags)
  }));
}

function canOffer(augment) {
  const owned = state.owned[augment.id] || 0;
  if (owned > 0 && !augment.repeatable) return false;
  if (owned >= maxStacks(augment)) return false;
  return meetsRequirements(augment.requires || []);
}

function maxStacks(augment) {
  return augment.repeatable ? augment.max : 1;
}

function choiceStackText(augment) {
  if (!augment.repeatable) return "일회성 선택지";
  const owned = state.owned[augment.id] || 0;
  return `반복 가능 ${owned}/${maxStacks(augment)}`;
}

function meetsRequirements(requirements) {
  return requirements.every((requirement) => meetsRequirement(requirement));
}

function meetsRequirement(requirement) {
  const ids = requirement.anyIds || [];
  const tags = requirement.anyTags || [];
  return ids.some((id) => ownsAugment(id)) || tags.some((tag) => ownsTag(tag));
}

function ownsAugment(id) {
  return (state.owned[id] || 0) > 0;
}

function ownsTag(tag) {
  return Object.keys(state.owned).some((id) => {
    if (!ownsAugment(id)) return false;
    return augmentById[id]?.tags.includes(tag);
  });
}

function pickWeighted(pool, picked, currentTags, rewardType, slot) {
  const pickedIds = new Set(picked.map((item) => item.id));
  const candidates = pool.filter((augment) => !pickedIds.has(augment.id));
  if (candidates.length === 0) return null;
  const weights = candidates.map((augment) => {
    let weight = rarityWeight(augment.rarity, rewardType);
    const tagHit = augment.tags.some((tag) => currentTags.includes(tag));
    const synergyHit = augment.synergy.some((id) => state.owned[id]);
    if (slot === "direct" && (tagHit || synergyHit)) weight *= 3.4 + state.stats.synergyBias;
    if (slot === "pivot" && !tagHit) weight *= 1.8;
    if (slot === "utility" && (augment.tags.includes("경제") || augment.tags.includes("방어"))) weight *= 2.2;
    if (state.stats.tacticalDominance > 0 && tagHit) weight *= 2.8;
    if (augment.rarity === "legendary" && rewardType === "normal") weight *= 0.55;
    return Math.max(0.1, weight);
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function rarityWeight(rarity, rewardType) {
  const table = rarityWeights[rewardType] || rarityWeights.normal;
  const bonus = state.stats.rarityBonus + (state.stats.rerollQuality * 0.03);
  if (rarity === "epic") return table[rarity] * (1 + bonus * 2.5);
  if (rarity === "legendary") return table[rarity] * (1 + bonus * 4.5);
  return table[rarity];
}

function topTags() {
  const counts = {};
  for (const id of Object.keys(state.owned)) {
    const augment = augmentById[id];
    if (!augment) continue;
    for (const tag of augment.tags) {
      if (tag === "전설") continue;
      counts[tag] = (counts[tag] || 0) + state.owned[id];
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);
}

function synergyReason(augment, currentTags) {
  const ownedNames = augment.synergy
    .filter((id) => state.owned[id])
    .map((id) => augmentById[id]?.name)
    .filter(Boolean);
  const tagHits = augment.tags.filter((tag) => currentTags.includes(tag));
  if (ownedNames.length > 0) return `시너지: ${ownedNames.slice(0, 2).join(", ")} 보유`;
  if (tagHits.length > 0) return `시너지: 현재 ${tagHits[0]} 빌드와 연결`;
  if (augment.tags.includes("경제")) return "시너지: 이후 보상 품질을 조정";
  if (augment.tags.includes("방어")) return "시너지: 자동 전투 안정성 증가";
  return "시너지: 새 빌드 축을 열 수 있음";
}

function rerollChoices() {
  if (state.rerolled) return;
  state.rerolled = true;
  const rewardType = state.rewardQueue[0] || "normal";
  state.currentChoices = generateChoices(state.stats.rerollQuality > 0 ? "rare" : rewardType);
  ui.rerollButton.disabled = true;
  ui.rerollButton.textContent = "리롤 사용됨";
  renderChoices();
}

function endRun(win) {
  state.phase = "ended";
  ui.endOverlay.classList.remove("hidden");
  ui.endLabel.textContent = win ? "STAGE CLEAR" : "RUN ENDED";
  ui.endTitle.textContent = win ? "최종 보스 격파" : "사망";
  ui.endText.textContent = `${formatTime(state.time)} · ${state.kills} KOs · 증강 ${state.picks}회 선택`;
}

function pickTarget() {
  if (state.enemies.length === 0) {
    state.targetId = null;
    return null;
  }
  const current = currentTarget();
  if (current) return current;
  const best = [...state.enemies].sort((a, b) => targetScore(a) - targetScore(b))[0];
  state.targetId = best.id;
  return best;
}

function currentTarget() {
  return state.enemies.find((enemy) => enemy.id === state.targetId) || null;
}

function targetScore(enemy) {
  return (enemy.mark || 0) * -120 + (enemy.boss ? -80 : 0) + dist(enemy, state.player);
}

function updateAimAngle(target) {
  if (!target) return;
  state.player.aimAngle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
}

function playerFacingAngle() {
  return state.player.aimAngle;
}

function updateUi(force = false) {
  if (!state) return;
  ui.hpText.textContent = `${Math.max(0, Math.ceil(state.player.hp))}/${state.player.maxHp}`;
  ui.hpBar.style.width = `${clamp((state.player.hp / state.player.maxHp) * 100, 0, 100)}%`;
  ui.shieldText.textContent = `${Math.ceil(state.player.shield)}`;
  ui.shieldBar.style.width = `${clamp((state.player.shield / 150) * 100, 0, 100)}%`;
  ui.roomText.textContent = `${Math.max(1, state.room)}/15`;
  ui.pickText.textContent = `${state.picks}`;
  ui.roomTypeText.textContent = state.roomInfo ? state.roomInfo.type.toUpperCase() : "READY";
  ui.enemyText.textContent = `${state.enemies.length + state.pendingSpawns.length} LEFT`;
  ui.timeText.textContent = formatTime(state.time);
  if (force) renderAugments();
}

function renderAugments() {
  const top = topTags();
  ui.buildSummary.textContent = top.length ? top.join(" / ") : "탄환 / 표식";
  ui.augmentList.innerHTML = "";
  if (state.ownedOrder.length === 0) {
    ui.augmentList.innerHTML = `<div class="augment-pill"><strong>선택지 없음</strong><span>방을 클리어하면 3지선다 증강이 열린다.</span></div>`;
    return;
  }
  for (const id of state.ownedOrder) {
    const augment = augmentById[id];
    const item = document.createElement("div");
    item.className = "augment-pill";
    item.innerHTML = `<strong>${augment.name} ${state.owned[id] > 1 ? `x${state.owned[id]}` : ""}</strong><span>${augment.tags.join(" / ")}</span>`;
    ui.augmentList.appendChild(item);
  }
}

function showBanner(text) {
  ui.roomBanner.textContent = text;
  ui.roomBanner.classList.add("show");
  clearTimeout(showBanner.timer);
  showBanner.timer = setTimeout(() => ui.roomBanner.classList.remove("show"), 1150);
}

function render() {
  if (!state) return;
  ctx.clearRect(0, 0, state.width, state.height);
  drawFloor();
  drawHazards();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawTexts();
}

function drawFloor() {
  ctx.save();
  ctx.fillStyle = "#111821";
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  const gap = 44;
  for (let x = (state.time * 10) % gap; x < state.width; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - state.height * 0.28, state.height);
    ctx.stroke();
  }
  for (let y = 0; y < state.height; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y + state.width * 0.18);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,209,102,0.16)";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 22, state.width - 36, state.height - 44);
  ctx.restore();
}

function drawHazards() {
  for (const hazard of state.hazards) {
    const alpha = clamp(hazard.life / hazard.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.18 + alpha * 0.3;
    ctx.fillStyle = hazard.type === "mine" ? "#ffd166" : "#58d7ff";
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = hazard.type === "mine" ? "#ff9f45" : "#58d7ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r * (0.82 + Math.sin(state.time * 8) * 0.05), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBullets() {
  ctx.save();
  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.shock ? "#ffd166" : bullet.chill ? "#aeefff" : "#58d7ff";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const hp = clamp(enemy.hp / enemy.maxHp, 0, 1);
    ctx.globalAlpha = enemy.hitFlash > 0 ? 0.95 : 0.86;
    ctx.fillStyle = enemy.hitFlash > 0 ? "#fff7e6" : enemy.color;
    if (enemy.boss) {
      ctx.rotate(state.time * 0.6);
      polygon(0, 0, enemy.r, enemy.final ? 8 : 6);
      ctx.fill();
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (enemy.type === "runner") {
      ctx.rotate(Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x) + Math.PI / 2);
      polygon(0, 0, enemy.r, 3);
      ctx.fill();
    } else {
      polygon(0, 0, enemy.r, enemy.type === "brute" ? 6 : 4);
      ctx.fill();
    }
    if (enemy.mark > 0) {
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.r + 5 + enemy.mark, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (enemy.slow > 0) {
      ctx.strokeStyle = "#58d7ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (enemy.shock > 0) {
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-enemy.r, -enemy.r);
      ctx.lineTo(enemy.r, enemy.r);
      ctx.moveTo(enemy.r, -enemy.r);
      ctx.lineTo(-enemy.r, enemy.r);
      ctx.stroke();
    }
    ctx.restore();
    drawEnemyHp(enemy, hp);
  }
}

function drawEnemyHp(enemy, hp) {
  if (hp >= 0.98 && !enemy.boss) return;
  const w = enemy.boss ? 72 : 34;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.r - 13, w, 5);
  ctx.fillStyle = enemy.boss ? "#ffd166" : "#ff6b68";
  ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.r - 13, w * hp, 5);
  ctx.restore();
}

function drawPlayer() {
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.shield > 0) {
    ctx.strokeStyle = "rgba(88,215,255,0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 9 + Math.sin(state.time * 8) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff7e6";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.rotate(playerFacingAngle());
  ctx.fillStyle = "#fff7e6";
  ctx.beginPath();
  ctx.moveTo(p.r + 14, 0);
  ctx.lineTo(2, -7);
  ctx.lineTo(2, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#101116";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  if (state.stats.frostAura > 0) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#58d7ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, (state.stats.frostRadius + state.stats.frostAura * 12) * state.stats.fieldScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    const t = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = t;
    ctx.strokeStyle = particle.color;
    ctx.fillStyle = particle.color;
    if (particle.kind === "ring") {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (1 - t * 0.2), 0, Math.PI * 2);
      ctx.stroke();
    } else if (particle.kind === "dash") {
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (1 - t), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawTexts() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "800 13px system-ui";
  for (const text of state.texts) {
    ctx.globalAlpha = clamp(text.life / text.maxLife, 0, 1);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.restore();
}

function addParticle(x, y, kind, color, life, size) {
  state.particles.push({
    x,
    y,
    kind,
    color,
    life,
    maxLife: life,
    size,
    vx: (Math.random() - 0.5) * 20,
    vy: (Math.random() - 0.5) * 20
  });
}

function addText(x, y, text, color) {
  state.texts.push({ x, y, text, color, life: 1.0, maxLife: 1.0 });
}

function polygon(x, y, r, sides) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const a = -Math.PI / 2 + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function colorForType(type) {
  if (type === "frost") return "#58d7ff";
  if (type === "lightning") return "#ffd166";
  if (type === "heal" || type === "shield") return "#7ee08a";
  if (type === "boss") return "#ff6b68";
  if (type === "singularity") return "#b998ff";
  return "#ff9f45";
}

function choosePlayerMoveDirection(moveX, moveY, target, probeDistance = 82) {
  const player = state.player;
  const center = normalizeVector(state.width * 0.5 - player.x, state.height * 0.55 - player.y);
  const base = normalizeVector(moveX, moveY) || center || { x: 1, y: 0 };
  const wallPush = getWallPush(player.x, player.y, 104);
  const candidates = [
    base,
    normalizeVector(base.x + wallPush.x * 1.8, base.y + wallPush.y * 1.8),
    normalizeVector(wallPush.x, wallPush.y),
    center
  ].filter(Boolean);
  if (state.stats.infiniteCircuit || wallPush.strength > 0.65) {
    candidates.push(
      rotateVector(base, 0.58),
      rotateVector(base, -0.58),
      rotateVector(base, 1.12),
      rotateVector(base, -1.12)
    );
  }
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = scoreMoveCandidate(candidate, base, target, probeDistance);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function scoreMoveCandidate(direction, base, target, probeDistance) {
  const player = state.player;
  const bounds = getPlayerBounds();
  const x = clamp(player.x + direction.x * probeDistance, bounds.minX, bounds.maxX);
  const y = clamp(player.y + direction.y * probeDistance, bounds.minY, bounds.maxY);
  const moved = Math.hypot(x - player.x, y - player.y);
  let score = direction.x * base.x + direction.y * base.y;
  score += (direction.x * player.vx + direction.y * player.vy) * 0.9;
  score += moved * 0.018;
  score += (wallDanger(player.x, player.y, 104) - wallDanger(x, y, 104)) * 5.4;
  score -= wallDanger(x, y, 84) * 4.2;
  score -= Math.hypot(x - state.width * 0.5, y - state.height * 0.55) * 0.002;
  if (moved < probeDistance * 0.32) score -= 2.4;
  if (target) {
    const targetDist = Math.hypot(x - target.x, y - target.y);
    const keep = state.stats.preferredRange;
    score -= Math.abs(targetDist - keep) * 0.014;
    if (targetDist < 112) score -= (112 - targetDist) * 0.07;
  }
  for (const enemy of state.enemies) {
    const enemyDist = Math.hypot(x - enemy.x, y - enemy.y);
    if (enemyDist < 172) score -= (172 - enemyDist) * (enemy.boss ? 0.028 : 0.019);
    if (enemyDist < enemy.r + player.r + 18) score -= 4.5;
  }
  return score;
}

function getPlayerBounds() {
  return {
    minX: 24,
    maxX: state.width - 24,
    minY: 34,
    maxY: state.height - 24
  };
}

function getWallPush(x, y, margin) {
  const bounds = getPlayerBounds();
  let pushX = 0;
  let pushY = 0;
  if (x < bounds.minX + margin) pushX += (bounds.minX + margin - x) / margin;
  if (x > bounds.maxX - margin) pushX -= (x - (bounds.maxX - margin)) / margin;
  if (y < bounds.minY + margin) pushY += (bounds.minY + margin - y) / margin;
  if (y > bounds.maxY - margin) pushY -= (y - (bounds.maxY - margin)) / margin;
  return {
    x: pushX,
    y: pushY,
    strength: Math.min(2, Math.hypot(pushX, pushY))
  };
}

function wallDanger(x, y, margin) {
  const bounds = getPlayerBounds();
  const left = clamp((bounds.minX + margin - x) / margin, 0, 1);
  const right = clamp((x - (bounds.maxX - margin)) / margin, 0, 1);
  const top = clamp((bounds.minY + margin - y) / margin, 0, 1);
  const bottom = clamp((y - (bounds.maxY - margin)) / margin, 0, 1);
  return left * left + right * right + top * top + bottom * bottom;
}

function normalizeVector(x, y) {
  const length = Math.hypot(x, y);
  if (length < 0.001) return null;
  return { x: x / length, y: y / length };
}

function rotateVector(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos
  };
}

function formatTime(value) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return Math.hypot(px - x, py - y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function removeItem(list, item) {
  const index = list.indexOf(item);
  if (index >= 0) list.splice(index, 1);
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

ui.startButton.addEventListener("click", startRun);
ui.againButton.addEventListener("click", startRun);
ui.restartButton.addEventListener("click", startRun);
ui.rerollButton.addEventListener("click", rerollChoices);
window.addEventListener("resize", resizeCanvas);
window.coreRushDebug = {
  start: startRun,
  forcePlayer: (x, y) => {
    if (!state) return;
    const bounds = getPlayerBounds();
    state.player.x = clamp(x, bounds.minX, bounds.maxX);
    state.player.y = clamp(y, bounds.minY, bounds.maxY);
  },
  snapshot: () => ({
    phase: state?.phase,
    room: state?.room,
    picks: state?.picks,
    enemies: state?.enemies.length,
    hp: Math.round(state?.player.hp || 0),
    shield: Math.round(state?.player.shield || 0),
    target: state && currentTarget()
      ? {
          id: state.targetId,
          x: Math.round(currentTarget().x),
          y: Math.round(currentTarget().y)
        }
      : null,
    player: state
      ? {
          x: Math.round(state.player.x),
          y: Math.round(state.player.y),
          vx: Number(state.player.vx.toFixed(2)),
          vy: Number(state.player.vy.toFixed(2)),
          aim: Number(playerFacingAngle().toFixed(3))
        }
      : null,
    choices: state?.currentChoices.map((choice) => choice.name) || [],
    time: Math.round(state?.time || 0)
  })
};

state = createState();
resizeCanvas();
updateUi(true);
requestAnimationFrame((time) => {
  lastFrame = time;
  requestAnimationFrame(gameLoop);
});
