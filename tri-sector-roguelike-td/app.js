const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const frame = document.getElementById("battleFrame");

const ui = {
  wave: document.getElementById("waveLabel"),
  hp: document.getElementById("hpLabel"),
  hpFill: document.getElementById("hpFill"),
  xp: document.getElementById("xpLabel"),
  xpFill: document.getElementById("xpFill"),
  heroLevel: document.getElementById("heroLevelLabel"),
  damage: document.getElementById("damageLabel"),
  speed: document.getElementById("speedLabel"),
  range: document.getElementById("rangeLabel"),
  teamList: document.getElementById("teamList"),
  toast: document.getElementById("toast"),
  upgradeOverlay: document.getElementById("upgradeOverlay"),
  choiceEyebrow: document.getElementById("choiceEyebrow"),
  choiceTitle: document.getElementById("choiceTitle"),
  upgradeChoices: document.getElementById("upgradeChoices"),
  rewardReveal: document.getElementById("rewardReveal"),
  rewardContinue: document.getElementById("rewardContinueButton"),
  bossBanner: document.getElementById("bossBanner"),
  bossBannerKicker: document.getElementById("bossBannerKicker"),
  bossBannerTitle: document.getElementById("bossBannerTitle"),
  bossBannerText: document.getElementById("bossBannerText"),
  resultOverlay: document.getElementById("resultOverlay"),
  resultEyebrow: document.getElementById("resultEyebrow"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  resultButton: document.getElementById("resultButton"),
  restart: document.getElementById("restartButton"),
};

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const HERO_ANGLES = [-90, -30, 30, 90, 150, 210];
const ENEMY_SCALE = 0.48;
const HERO_SCALE = 0.64;
const ROTATION_SPEED = 240;
const ROTATION_ACCEL = 1600;
const ROTATION_DECEL = 2200;
const ROTATION_ATTACK_LOCK = 0.08;
const XP_BASE_REQUIREMENT = 24;
const XP_LINEAR_GROWTH = 7;
const XP_QUADRATIC_GROWTH = 0.6;
const UPGRADE_INPUT_LOCK_MS = 700;
const VERSION_LABEL = "TRI-KEEPERS";
const TIER_COLORS = {
  기본: "#aeb6c2",
  성장: "#aeb6c2",
  고급: "#4ea8ff",
  돌파: "#b984ff",
  궁극: "#ffd166",
};

const STARTING_HERO_IDS = ["sniper", "warrior", "mage"];

const HERO_BLUEPRINTS = [
  {
    id: "archer",
    name: "궁수",
    role: "장거리 관통",
    glyph: "궁",
    color: "#6fd6ff",
    glow: "rgba(111, 214, 255, 0.42)",
    damage: 26,
    range: 135,
    angle: 55,
    cooldown: 0.82,
    projectileSpeed: 560,
    pierce: 0,
    projectileCount: 1,
    splashRadius: 0,
    splashRatio: 0,
    ultimateEvery: 8,
    initialSlot: 0,
  },
  {
    id: "sniper",
    name: "저격수",
    role: "15도 정밀 관통",
    glyph: "저",
    color: "#f7e36a",
    glow: "rgba(247, 227, 106, 0.42)",
    damage: 68,
    range: 166,
    angle: 15,
    cooldown: 1.55,
    projectileSpeed: 760,
    projectileRadius: 5,
    pierce: 1,
    projectileCount: 1,
    splashRadius: 0,
    splashRatio: 0,
    ultimateEvery: 7,
    initialSlot: 0,
  },
  {
    id: "warrior",
    name: "전사",
    role: "근거리 강타",
    glyph: "전",
    color: "#ff8d62",
    glow: "rgba(255, 141, 98, 0.42)",
    damage: 34,
    range: 58,
    angle: 95,
    cooldown: 0.92,
    targets: 1,
    towerBonus: 0,
    push: 0,
    ultimateEvery: 6,
    initialSlot: 2,
  },
  {
    id: "mage",
    name: "마법사",
    role: "지연 광역",
    glyph: "마",
    color: "#c89bff",
    glow: "rgba(200, 155, 255, 0.42)",
    damage: 16,
    range: 118,
    angle: 80,
    cooldown: 1.15,
    blastRadius: 34,
    castDelay: 0.35,
    zoneDuration: 0,
    zoneDps: 7,
    chainCount: 0,
    echoCount: 0,
    ultimateEvery: 5,
    initialSlot: 4,
  },
];

const WAVES = [
  [
    spawn(0.35, "top", 0.5, "grunt"),
    spawn(0.9, "left", 0.38, "swarm"),
    spawn(1.05, "left", 0.48, "swarm"),
    spawn(1.2, "left", 0.58, "swarm"),
    spawn(1.6, "right", 0.42, "swarm"),
    spawn(1.75, "right", 0.52, "swarm"),
    spawn(1.9, "right", 0.62, "swarm"),
    spawn(2.6, "top", 0.24, "runner"),
    spawn(3.2, "bottom", 0.38, "grunt"),
    spawn(3.4, "bottom", 0.62, "grunt"),
    spawn(3.95, "right", 0.38, "swarm"),
    spawn(4.08, "right", 0.5, "swarm"),
    spawn(4.21, "right", 0.62, "swarm"),
    spawn(4.75, "left", 0.55, "grunt"),
  ],
  [
    spawn(0.2, "bottom", 0.25, "swarm"),
    spawn(0.34, "bottom", 0.35, "swarm"),
    spawn(0.48, "bottom", 0.45, "swarm"),
    spawn(0.62, "bottom", 0.55, "swarm"),
    spawn(0.76, "bottom", 0.65, "swarm"),
    spawn(0.9, "bottom", 0.75, "swarm"),
    spawn(1.35, "left", 0.26, "runner"),
    spawn(1.55, "left", 0.42, "runner"),
    spawn(1.85, "right", 0.74, "runner"),
    spawn(2.25, "left", 0.58, "swarm"),
    spawn(2.38, "left", 0.7, "swarm"),
    spawn(2.75, "top", 0.4, "grunt"),
    spawn(2.9, "top", 0.5, "grunt"),
    spawn(3.05, "top", 0.6, "grunt"),
    spawn(3.55, "right", 0.36, "swarm"),
    spawn(3.68, "right", 0.5, "swarm"),
    spawn(3.81, "right", 0.64, "swarm"),
    spawn(4.2, "bottom", 0.5, "grunt"),
  ],
  [
    spawn(0.25, "right", 0.22, "tank"),
    spawn(0.85, "right", 0.36, "grunt"),
    spawn(1.05, "right", 0.5, "grunt"),
    spawn(1.45, "left", 0.3, "swarm"),
    spawn(1.6, "left", 0.38, "swarm"),
    spawn(1.75, "left", 0.46, "swarm"),
    spawn(1.9, "left", 0.54, "swarm"),
    spawn(2.05, "left", 0.62, "swarm"),
    spawn(2.2, "left", 0.7, "swarm"),
    spawn(2.75, "bottom", 0.45, "grunt"),
    spawn(2.95, "bottom", 0.55, "runner"),
    spawn(3.2, "right", 0.34, "swarm"),
    spawn(3.33, "right", 0.46, "swarm"),
    spawn(3.46, "right", 0.58, "swarm"),
    spawn(3.75, "top", 0.25, "swarm"),
    spawn(3.88, "top", 0.5, "swarm"),
    spawn(4.18, "top", 0.75, "grunt"),
    spawn(4.8, "left", 0.5, "runner"),
  ],
  [
    spawn(0.15, "top", 0.16, "swarm"),
    spawn(0.28, "top", 0.28, "swarm"),
    spawn(0.41, "top", 0.4, "swarm"),
    spawn(0.54, "top", 0.52, "swarm"),
    spawn(0.67, "top", 0.64, "swarm"),
    spawn(0.8, "top", 0.76, "swarm"),
    spawn(1.25, "left", 0.2, "runner"),
    spawn(1.4, "left", 0.38, "runner"),
    spawn(1.55, "right", 0.62, "runner"),
    spawn(1.7, "right", 0.8, "runner"),
    spawn(2.25, "bottom", 0.25, "tank"),
    spawn(2.5, "bottom", 0.75, "tank"),
    spawn(2.9, "left", 0.34, "swarm"),
    spawn(3.03, "left", 0.46, "swarm"),
    spawn(3.16, "right", 0.54, "swarm"),
    spawn(3.29, "right", 0.66, "swarm"),
    spawn(3.65, "left", 0.42, "grunt"),
    spawn(3.8, "right", 0.58, "grunt"),
    spawn(4.35, "bottom", 0.32, "swarm"),
    spawn(4.48, "bottom", 0.44, "swarm"),
    spawn(4.61, "bottom", 0.56, "swarm"),
    spawn(4.74, "bottom", 0.68, "swarm"),
    spawn(5.25, "top", 0.5, "swarm"),
    spawn(5.38, "top", 0.62, "swarm"),
  ],
  [
    spawn(0.25, "top", 0.5, "tank"),
    spawn(0.6, "left", 0.22, "swarm"),
    spawn(0.73, "left", 0.34, "swarm"),
    spawn(0.86, "left", 0.46, "swarm"),
    spawn(0.99, "left", 0.58, "swarm"),
    spawn(1.12, "left", 0.7, "swarm"),
    spawn(1.35, "right", 0.3, "swarm"),
    spawn(1.48, "right", 0.42, "swarm"),
    spawn(1.61, "right", 0.54, "swarm"),
    spawn(1.74, "right", 0.66, "swarm"),
    spawn(1.87, "right", 0.78, "swarm"),
    spawn(2.35, "bottom", 0.33, "runner"),
    spawn(2.5, "bottom", 0.5, "runner"),
    spawn(2.65, "bottom", 0.67, "runner"),
    spawn(3.1, "top", 0.25, "grunt"),
    spawn(3.25, "top", 0.75, "grunt"),
    spawn(3.55, "left", 0.38, "swarm"),
    spawn(3.68, "left", 0.5, "swarm"),
    spawn(3.81, "left", 0.62, "swarm"),
    spawn(4.25, "left", 0.28, "tank"),
    spawn(4.45, "right", 0.72, "tank"),
    spawn(4.85, "right", 0.38, "swarm"),
    spawn(4.98, "right", 0.5, "swarm"),
    spawn(5.11, "right", 0.62, "swarm"),
    spawn(5.55, "bottom", 0.36, "swarm"),
    spawn(5.68, "bottom", 0.5, "swarm"),
    spawn(5.81, "bottom", 0.64, "swarm"),
    spawn(6.1, "top", 0.5, "brute"),
  ],
  [
    spawn(0.2, "left", 0.2, "runner"),
    spawn(0.35, "right", 0.8, "runner"),
    spawn(0.6, "top", 0.5, "tank"),
    spawn(0.95, "bottom", 0.5, "tank"),
    spawn(1.3, "top", 0.16, "swarm"),
    spawn(1.42, "top", 0.28, "swarm"),
    spawn(1.54, "top", 0.4, "swarm"),
    spawn(1.66, "top", 0.52, "swarm"),
    spawn(1.78, "top", 0.64, "swarm"),
    spawn(1.9, "top", 0.76, "swarm"),
    spawn(2.2, "left", 0.5, "brute"),
    spawn(2.8, "right", 0.5, "brute"),
    spawn(3.3, "bottom", 0.2, "runner"),
    spawn(3.45, "bottom", 0.4, "runner"),
    spawn(3.6, "bottom", 0.6, "runner"),
    spawn(3.75, "bottom", 0.8, "runner"),
    spawn(4.35, "left", 0.24, "swarm"),
    spawn(4.48, "left", 0.36, "swarm"),
    spawn(4.61, "left", 0.48, "swarm"),
    spawn(4.74, "left", 0.6, "swarm"),
    spawn(4.87, "left", 0.72, "swarm"),
    spawn(5.25, "right", 0.24, "swarm"),
    spawn(5.38, "right", 0.36, "swarm"),
    spawn(5.51, "right", 0.48, "swarm"),
    spawn(5.64, "right", 0.6, "swarm"),
    spawn(5.77, "right", 0.72, "swarm"),
    spawn(6.35, "top", 0.2, "grunt"),
    spawn(6.5, "top", 0.4, "grunt"),
    spawn(6.65, "top", 0.6, "grunt"),
    spawn(6.8, "top", 0.8, "grunt"),
  ],
  [
    spawn(0.25, "top", 0.5, "midboss"),
    spawn(0.85, "left", 0.26, "swarm"),
    spawn(0.98, "left", 0.38, "swarm"),
    spawn(1.11, "left", 0.5, "swarm"),
    spawn(1.24, "left", 0.62, "swarm"),
    spawn(1.37, "left", 0.74, "swarm"),
    spawn(1.85, "right", 0.32, "runner"),
    spawn(2.0, "right", 0.5, "runner"),
    spawn(2.15, "right", 0.68, "runner"),
    spawn(2.75, "bottom", 0.28, "tank"),
    spawn(2.95, "bottom", 0.72, "tank"),
    spawn(3.55, "top", 0.24, "swarm"),
    spawn(3.68, "top", 0.36, "swarm"),
    spawn(3.81, "top", 0.48, "swarm"),
    spawn(3.94, "top", 0.6, "swarm"),
    spawn(4.07, "top", 0.72, "swarm"),
    spawn(4.65, "left", 0.42, "grunt"),
    spawn(4.8, "right", 0.58, "grunt"),
    spawn(5.35, "bottom", 0.36, "swarm"),
    spawn(5.48, "bottom", 0.5, "swarm"),
    spawn(5.61, "bottom", 0.64, "swarm"),
  ],
  [
    spawn(0.25, "bottom", 0.5, "boss"),
    spawn(0.9, "top", 0.2, "swarm"),
    spawn(1.03, "top", 0.32, "swarm"),
    spawn(1.16, "top", 0.44, "swarm"),
    spawn(1.29, "top", 0.56, "swarm"),
    spawn(1.42, "top", 0.68, "swarm"),
    spawn(1.55, "top", 0.8, "swarm"),
    spawn(2.05, "left", 0.28, "runner"),
    spawn(2.22, "right", 0.72, "runner"),
    spawn(2.85, "left", 0.42, "tank"),
    spawn(3.05, "right", 0.58, "tank"),
    spawn(3.75, "bottom", 0.24, "swarm"),
    spawn(3.88, "bottom", 0.36, "swarm"),
    spawn(4.01, "bottom", 0.48, "swarm"),
    spawn(4.14, "bottom", 0.6, "swarm"),
    spawn(4.27, "bottom", 0.72, "swarm"),
    spawn(4.9, "left", 0.5, "brute"),
    spawn(5.25, "right", 0.5, "brute"),
    spawn(5.85, "top", 0.25, "swarm"),
    spawn(5.98, "top", 0.4, "swarm"),
    spawn(6.11, "top", 0.55, "swarm"),
    spawn(6.24, "top", 0.7, "swarm"),
    spawn(6.9, "left", 0.34, "runner"),
    spawn(7.08, "right", 0.66, "runner"),
  ],
];

const TYPES = {
  swarm: { hp: 18, hpGrowth: 2, speed: 18, radius: 7, damage: 3, attackInterval: 0.74, xp: 3, color: "#8ff0a4", core: "#ecffef" },
  grunt: { hp: 52, speed: 8, radius: 11, damage: 6, attackInterval: 1.05, xp: 6, color: "#dc765e", core: "#ffcf7d" },
  runner: { hp: 34, speed: 14, radius: 9, damage: 5, attackInterval: 0.82, xp: 7, color: "#72d8ff", core: "#e7fbff" },
  tank: { hp: 132, speed: 5.5, radius: 14, damage: 13, attackInterval: 1.38, xp: 15, color: "#a88cff", core: "#f0d9ff" },
  brute: { hp: 205, speed: 4.5, radius: 16, damage: 18, attackInterval: 1.52, xp: 24, color: "#ff5f85", core: "#ffd6e0" },
  midboss: {
    hp: 420,
    hpGrowth: 14,
    speed: 3.8,
    radius: 24,
    damage: 16,
    attackInterval: 1.18,
    xp: 60,
    color: "#ffb347",
    core: "#fff0b6",
    reward: "mid",
    bannerKicker: "MID BOSS",
    bannerTitle: "문지기 등장",
    bannerText: "큰 적을 묶어 두는 동안 무리몹이 난입합니다",
  },
  boss: {
    hp: 760,
    hpGrowth: 22,
    speed: 3.2,
    radius: 30,
    damage: 22,
    attackInterval: 1.05,
    xp: 100,
    color: "#ff5f85",
    core: "#ffe1ea",
    reward: "boss",
    bannerKicker: "BOSS",
    bannerTitle: "균열 군주",
    bannerText: "최종 압박입니다. 방향을 계속 다시 잡아야 합니다",
  },
};

const heroUpgrades = [
  {
    id: "archer_growth_volley",
    heroId: "archer",
    tier: "성장",
    title: "연발 시위",
    text: "궁수 기본 화살 수 +1",
    apply: (hero) => {
      hero.projectileCount += 1;
    },
  },
  {
    id: "archer_growth_pierce",
    heroId: "archer",
    tier: "성장",
    title: "관통 시위",
    text: "궁수 화살 관통 +1",
    apply: (hero) => {
      hero.pierce += 1;
    },
  },
  {
    id: "archer_growth_burst",
    heroId: "archer",
    tier: "성장",
    title: "폭렬 촉",
    text: "궁수 화살 적중 시 주변 적에게 작은 폭발 피해",
    apply: (hero) => {
      hero.splashRadius = Math.max(hero.splashRadius, 22);
      hero.splashRatio = Math.max(hero.splashRatio, 0.34);
    },
  },
  {
    id: "archer_basic_damage",
    heroId: "archer",
    tier: "기본",
    maxRank: 5,
    title: "정밀 조준",
    text: "궁수 공격력 +5",
    apply: (hero) => {
      hero.damage += 5;
    },
  },
  {
    id: "archer_basic_reload",
    heroId: "archer",
    tier: "기본",
    maxRank: 4,
    title: "빠른 장전",
    text: "궁수 공격 간격 -8%",
    apply: (hero) => {
      hero.cooldown = Math.max(0.42, hero.cooldown * 0.92);
    },
  },
  {
    id: "archer_basic_range",
    heroId: "archer",
    tier: "기본",
    maxRank: 4,
    title: "장궁 숙련",
    text: "궁수 사거리 +12",
    apply: (hero) => {
      hero.range += 12;
    },
  },
  {
    id: "archer_break",
    heroId: "archer",
    tier: "돌파",
    title: "천공 포화",
    text: "화살 수, 관통, 폭발이 한 단계 강화된 천공 화살로 전환",
    apply: (hero) => {
      hero.breakthrough = true;
      hero.projectileCount = Math.max(hero.projectileCount + 1, 3);
      hero.pierce += 1;
      hero.splashRadius = Math.max(hero.splashRadius + 8, 30);
      hero.splashRatio = Math.max(hero.splashRatio, 0.42);
      hero.damage += 4;
      state.shake = 0.5;
      addRing(tower().x, tower().y, hero.color, 14, 0.48);
    },
  },
  {
    id: "archer_advanced_barrage",
    heroId: "archer",
    tier: "고급",
    title: "천공 분열",
    text: "궁수 화살 수 +1, 화살 피해 소폭 증가",
    apply: (hero) => {
      hero.projectileCount += 1;
      hero.damage += 3;
    },
  },
  {
    id: "archer_advanced_pierce",
    heroId: "archer",
    tier: "고급",
    title: "유성 관통",
    text: "궁수 화살 관통 +1, 관통 화살 피해 증가",
    apply: (hero) => {
      hero.pierce += 1;
      hero.damage += 4;
    },
  },
  {
    id: "archer_advanced_burst",
    heroId: "archer",
    tier: "고급",
    title: "성운 폭렬",
    text: "폭발 화살 반경과 폭발 피해 증가",
    apply: (hero) => {
      hero.splashRadius += 10;
      hero.splashRatio += 0.14;
    },
  },
  {
    id: "archer_ultimate",
    heroId: "archer",
    tier: "궁극",
    title: "별비 사격",
    text: "일정 공격마다 현재 방향에 화살비를 예고 후 투하",
    apply: (hero) => {
      hero.ultimate = true;
      hero.ultimateCharge = hero.ultimateEvery - 2;
      state.shake = 0.7;
      addRing(tower().x, tower().y, hero.color, 18, 0.56);
    },
  },
  {
    id: "sniper_growth_pierce",
    heroId: "sniper",
    tier: "성장",
    title: "철갑탄",
    text: "저격수 탄환 관통 +1",
    apply: (hero) => {
      hero.pierce += 1;
    },
  },
  {
    id: "sniper_growth_caliber",
    heroId: "sniper",
    tier: "성장",
    title: "대구경탄",
    text: "저격수 탄환 판정 폭 증가",
    apply: (hero) => {
      hero.projectileRadius += 2;
    },
  },
  {
    id: "sniper_growth_overcharge",
    heroId: "sniper",
    tier: "성장",
    title: "과충전 사격",
    text: "저격수 공격력 크게 증가, 공격 간격 증가",
    apply: (hero) => {
      hero.damage += 18;
      hero.cooldown *= 1.12;
    },
  },
  {
    id: "sniper_basic_damage",
    heroId: "sniper",
    tier: "기본",
    maxRank: 5,
    title: "영점 조정",
    text: "저격수 공격력 +10",
    apply: (hero) => {
      hero.damage += 10;
    },
  },
  {
    id: "sniper_basic_breath",
    heroId: "sniper",
    tier: "기본",
    maxRank: 4,
    title: "호흡 정리",
    text: "저격수 공격 간격 -5%",
    apply: (hero) => {
      hero.cooldown = Math.max(1.05, hero.cooldown * 0.95);
    },
  },
  {
    id: "sniper_basic_range",
    heroId: "sniper",
    tier: "기본",
    maxRank: 4,
    title: "장총열",
    text: "저격수 사거리 +14",
    apply: (hero) => {
      hero.range += 14;
    },
  },
  {
    id: "sniper_break",
    heroId: "sniper",
    tier: "돌파",
    title: "사선 개방",
    text: "관통, 피해, 탄속이 강화된 정밀 저격으로 전환",
    apply: (hero) => {
      hero.breakthrough = true;
      hero.pierce += 2;
      hero.damage += 18;
      hero.projectileSpeed += 80;
      hero.projectileRadius += 1;
      state.shake = 0.5;
      addRing(tower().x, tower().y, hero.color, 14, 0.48);
    },
  },
  {
    id: "sniper_advanced_line",
    heroId: "sniper",
    tier: "고급",
    title: "관통선 확장",
    text: "저격수 탄환 관통 +1, 피해 증가",
    apply: (hero) => {
      hero.pierce += 1;
      hero.damage += 7;
    },
  },
  {
    id: "sniper_advanced_focus",
    heroId: "sniper",
    tier: "고급",
    title: "중심선 고정",
    text: "저격수 탄환 폭과 피해 증가",
    apply: (hero) => {
      hero.projectileRadius += 1;
      hero.damage += 9;
    },
  },
  {
    id: "sniper_advanced_longshot",
    heroId: "sniper",
    tier: "고급",
    title: "초장거리 탄",
    text: "저격수 사거리, 탄속, 피해 증가",
    apply: (hero) => {
      hero.range += 18;
      hero.projectileSpeed += 90;
      hero.damage += 4;
    },
  },
  {
    id: "sniper_ultimate",
    heroId: "sniper",
    tier: "궁극",
    title: "궤도 저격",
    text: "일정 공격마다 현재 조준 방향에 얇고 긴 저격선을 발사",
    apply: (hero) => {
      hero.ultimate = true;
      hero.ultimateCharge = hero.ultimateEvery - 2;
      state.shake = 0.7;
      addRing(tower().x, tower().y, hero.color, 18, 0.56);
    },
  },
  {
    id: "warrior_growth_wall",
    heroId: "warrior",
    tier: "성장",
    title: "성벽 처형",
    text: "타워를 공격 중인 적에게 주는 전사 피해 증가",
    apply: (hero) => {
      hero.towerBonus += 0.45;
    },
  },
  {
    id: "warrior_growth_push",
    heroId: "warrior",
    tier: "성장",
    title: "방패 밀치기",
    text: "전사 기본 공격이 적을 바깥으로 밀어냄",
    apply: (hero) => {
      hero.push += 14;
    },
  },
  {
    id: "warrior_growth_sweep",
    heroId: "warrior",
    tier: "성장",
    title: "연속 베기",
    text: "전사 기본 공격 타격 수 +1",
    apply: (hero) => {
      hero.targets += 1;
    },
  },
  {
    id: "warrior_basic_power",
    heroId: "warrior",
    tier: "기본",
    maxRank: 5,
    title: "강철 완력",
    text: "전사 공격력 +5",
    apply: (hero) => {
      hero.damage += 5;
    },
  },
  {
    id: "warrior_basic_tempo",
    heroId: "warrior",
    tier: "기본",
    maxRank: 4,
    title: "검술 호흡",
    text: "전사 공격 간격 -6%",
    apply: (hero) => {
      hero.cooldown = Math.max(0.62, hero.cooldown * 0.94);
    },
  },
  {
    id: "warrior_basic_lunge",
    heroId: "warrior",
    tier: "기본",
    maxRank: 3,
    title: "짧은 전진",
    text: "전사 사거리 +4",
    apply: (hero) => {
      hero.range += 4;
    },
  },
  {
    id: "warrior_break",
    heroId: "warrior",
    tier: "돌파",
    title: "철벽 돌진",
    text: "다수 베기, 밀침, 성벽 처형이 강화된 전방 충격파로 전환",
    apply: (hero) => {
      hero.breakthrough = true;
      hero.targets += 1;
      hero.push += 14;
      hero.towerBonus += 0.25;
      hero.range += 8;
      state.shake = 0.5;
      addRing(tower().x, tower().y, hero.color, 14, 0.48);
    },
  },
  {
    id: "warrior_advanced_sweep",
    heroId: "warrior",
    tier: "고급",
    title: "압도 베기",
    text: "전사 타격 수 +1, 공격각 소폭 증가",
    apply: (hero) => {
      hero.targets += 1;
      hero.angle += 6;
    },
  },
  {
    id: "warrior_advanced_bulwark",
    heroId: "warrior",
    tier: "고급",
    title: "수문장",
    text: "타워를 공격 중인 적에게 주는 전사 피해 추가 증가",
    apply: (hero) => {
      hero.towerBonus += 0.38;
      hero.damage += 3;
    },
  },
  {
    id: "warrior_advanced_bash",
    heroId: "warrior",
    tier: "고급",
    title: "파쇄 돌진",
    text: "전사 밀침 증가, 돌파 충격파 사거리 증가",
    apply: (hero) => {
      hero.push += 18;
      hero.range += 6;
    },
  },
  {
    id: "warrior_ultimate",
    heroId: "warrior",
    tier: "궁극",
    title: "성벽 분쇄",
    text: "일정 공격마다 현재 방향의 타워 근처 적에게 거대 충격파",
    apply: (hero) => {
      hero.ultimate = true;
      hero.ultimateCharge = hero.ultimateEvery - 2;
      state.shake = 0.7;
      addRing(tower().x, tower().y, hero.color, 18, 0.56);
    },
  },
  {
    id: "mage_growth_residue",
    heroId: "mage",
    tier: "성장",
    title: "잔류 마력",
    text: "마법진 폭발 후 짧은 지속 피해 장판 생성",
    apply: (hero) => {
      hero.zoneDuration += 0.9;
      hero.zoneDps += 2;
    },
  },
  {
    id: "mage_growth_chain",
    heroId: "mage",
    tier: "성장",
    title: "연쇄 룬",
    text: "마법진 폭발 후 가까운 적 1명에게 보조 마법진 생성",
    apply: (hero) => {
      hero.chainCount += 1;
    },
  },
  {
    id: "mage_growth_echo",
    heroId: "mage",
    tier: "성장",
    title: "메아리 룬",
    text: "마법진 폭발 후 같은 위치에 작은 2차 폭발",
    apply: (hero) => {
      hero.echoCount += 1;
    },
  },
  {
    id: "mage_basic_damage",
    heroId: "mage",
    tier: "기본",
    maxRank: 5,
    title: "응축 마력",
    text: "마법사 공격력 +3",
    apply: (hero) => {
      hero.damage += 3;
    },
  },
  {
    id: "mage_basic_radius",
    heroId: "mage",
    tier: "기본",
    maxRank: 4,
    title: "확산 마법진",
    text: "마법사 폭발 반경 +6",
    apply: (hero) => {
      hero.blastRadius += 6;
    },
  },
  {
    id: "mage_basic_chant",
    heroId: "mage",
    tier: "기본",
    maxRank: 4,
    title: "빠른 영창",
    text: "마법사 공격 간격 -7%",
    apply: (hero) => {
      hero.cooldown = Math.max(0.55, hero.cooldown * 0.93);
    },
  },
  {
    id: "mage_break",
    heroId: "mage",
    tier: "돌파",
    title: "균열 마법진",
    text: "잔류, 연쇄, 메아리가 강화된 균열 마법진으로 전환",
    apply: (hero) => {
      hero.breakthrough = true;
      hero.chainCount = Math.max(hero.chainCount + 1, 2);
      hero.echoCount += 1;
      hero.zoneDuration += 0.45;
      hero.zoneDps += 2;
      hero.blastRadius += 6;
      state.shake = 0.5;
      addRing(tower().x, tower().y, hero.color, 14, 0.48);
    },
  },
  {
    id: "mage_advanced_chain",
    heroId: "mage",
    tier: "고급",
    title: "균열 증식",
    text: "보조 마법진 연쇄 대상 +1",
    apply: (hero) => {
      hero.chainCount += 1;
    },
  },
  {
    id: "mage_advanced_zone",
    heroId: "mage",
    tier: "고급",
    title: "긴 여운",
    text: "잔류 장판 지속시간과 피해 증가",
    apply: (hero) => {
      hero.zoneDuration += 0.8;
      hero.zoneDps += 3;
    },
  },
  {
    id: "mage_advanced_echo",
    heroId: "mage",
    tier: "고급",
    title: "중첩 메아리",
    text: "2차 폭발 횟수 +1, 폭발 반경 증가",
    apply: (hero) => {
      hero.echoCount += 1;
      hero.blastRadius += 4;
    },
  },
  {
    id: "mage_ultimate",
    heroId: "mage",
    tier: "궁극",
    title: "대마법진 붕괴",
    text: "일정 공격마다 거대 마법진으로 큰 피해와 균열 장판 생성",
    apply: (hero) => {
      hero.ultimate = true;
      hero.ultimateCharge = hero.ultimateEvery - 2;
      state.shake = 0.7;
      addRing(tower().x, tower().y, hero.color, 18, 0.56);
    },
  },
];

const BOSS_REWARD_CONFIG = {
  mid: {
    eyebrow: "MID BOSS DOWN",
    title: "랜덤 강화 보상",
    countWeights: [
      { count: 1, weight: 78 },
      { count: 2, weight: 22 },
    ],
  },
  boss: {
    eyebrow: "BOSS DOWN",
    title: "랜덤 강화 보상",
    countWeights: [
      { count: 1, weight: 30 },
      { count: 2, weight: 50 },
      { count: 3, weight: 20 },
    ],
  },
};

let state;
let lastTime = 0;
let dpr = 1;
let cssWidth = 0;
let cssHeight = 0;
let toastTimer = 0;
let bossBannerTimer = 0;
let rewardRevealTimers = [];
let upgradeUnlockTimer = 0;
let upgradeUnlockNeedsRelease = false;
let enemyId = 1;

function spawn(time, edge, pos, type) {
  return { time, edge, pos, type };
}

function createState() {
  enemyId = 1;
  return {
    phase: "playing",
    time: 0,
    waveIndex: 0,
    waveTime: 0,
    nextSpawn: 0,
    hp: 180,
    maxHp: 180,
    xp: 0,
    xpNeeded: xpRequirementForLevel(1),
    level: 1,
    killCount: 0,
    shake: 0,
    waveBanner: 0,
    rotationInput: 0,
    rotationVelocity: 0,
    rotationPointerId: null,
    rotationCount: 0,
    enemies: [],
    projectiles: [],
    magicCircles: [],
    zones: [],
    skyStrikes: [],
    effects: [],
    particles: [],
    xpOrbs: [],
    floatingTexts: [],
    heroes: STARTING_HERO_IDS.map((id, index) => createHero(heroBlueprintById(id), index)),
  };
}

function heroBlueprintById(id) {
  return HERO_BLUEPRINTS.find((hero) => hero.id === id);
}

function createHero(blueprint, index) {
  const slot = blueprint.initialSlot ?? index;
  return {
    ...blueprint,
    slot,
    aimAngle: HERO_ANGLES[slot],
    rotateT: 1,
    attackTimer: index * 0.18,
    growthPicked: {},
    basicRanks: {},
    advancedPicked: {},
    growthPicks: 0,
    basicPicks: 0,
    advancedPicks: 0,
    totalPicks: 0,
    breakthrough: false,
    ultimate: false,
    ultimateCharge: 0,
  };
}

function resizeCanvas() {
  const rect = frame.getBoundingClientRect();
  cssWidth = Math.max(1, rect.width);
  cssHeight = Math.max(1, rect.height);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function tower() {
  return {
    x: cssWidth * 0.5,
    y: cssHeight * 0.49,
    r: Math.min(cssWidth, cssHeight) * 0.034,
  };
}

function heroAim(hero) {
  const t = tower();
  return {
    x: t.x,
    y: t.y,
    angle: hero.aimAngle,
  };
}

function heroVisualPosition(hero, distance = 0) {
  const t = tower();
  const aim = heroAim(hero);
  const angle = aim.angle * DEG;
  const radius = t.r * 0.95 + distance;
  return {
    x: t.x + Math.cos(angle) * radius,
    y: t.y + Math.sin(angle) * radius,
    angle: aim.angle,
  };
}

function isRotating() {
  return Math.abs(state.rotationVelocity) > 0.5 || state.rotationInput !== 0;
}

function update(dt) {
  if (state.phase !== "playing") {
    updateParticles(dt);
    updateFloatingTexts(dt);
    return;
  }

  state.time += dt;
  state.waveTime += dt;
  state.shake = Math.max(0, state.shake - dt * 10);
  state.waveBanner = Math.max(0, state.waveBanner - dt);

  updateRotation(dt);
  spawnWaveEnemies();
  updateEnemies(dt);
  updateHeroes(dt);
  updateProjectiles(dt);
  updateMagicCircles(dt);
  updateZones(dt);
  updateSkyStrikes(dt);
  updateXpOrbs(dt);
  updateEffects(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
  if (state.phase !== "playing") return;
  checkWaveClear();
}

function updateRotation(dt) {
  const targetVelocity = state.rotationInput * ROTATION_SPEED;
  const rate = state.rotationInput === 0 ? ROTATION_DECEL : ROTATION_ACCEL;
  state.rotationVelocity = approach(state.rotationVelocity, targetVelocity, rate * dt);
  if (state.rotationInput === 0 && Math.abs(state.rotationVelocity) < 0.5) state.rotationVelocity = 0;

  const rotating = Math.abs(state.rotationVelocity) > 0;
  if (rotating) {
    const delta = state.rotationVelocity * dt;
    for (const hero of state.heroes) {
      hero.aimAngle = normalizeAngle(hero.aimAngle + delta);
      hero.rotateT = 0;
      hero.attackTimer = Math.max(hero.attackTimer, ROTATION_ATTACK_LOCK);
    }
    state.rotationCount += Math.abs(delta) / 360;
    return;
  }

  for (const hero of state.heroes) hero.rotateT = 1;
}

function spawnWaveEnemies() {
  const wave = WAVES[state.waveIndex];
  while (wave && state.nextSpawn < wave.length && state.waveTime >= wave[state.nextSpawn].time) {
    createEnemy(wave[state.nextSpawn]);
    state.nextSpawn += 1;
  }
}

function createEnemy(plan) {
  const type = TYPES[plan.type];
  const pad = 6;
  let x = cssWidth * 0.5;
  let y = cssHeight * 0.5;

  if (plan.edge === "top") {
    x = cssWidth * plan.pos;
    y = pad;
  } else if (plan.edge === "bottom") {
    x = cssWidth * plan.pos;
    y = cssHeight - pad;
  } else if (plan.edge === "left") {
    x = pad;
    y = cssHeight * plan.pos;
  } else {
    x = cssWidth - pad;
    y = cssHeight * plan.pos;
  }

  const hp = type.hp + state.waveIndex * (type.hpGrowth ?? 9);
  state.enemies.push({
    id: enemyId,
    x,
    y,
    hp,
    maxHp: hp,
    speed: type.speed + state.waveIndex * 0.35,
    radius: type.radius * ENEMY_SCALE,
    damage: type.damage,
    attackInterval: type.attackInterval,
    attackTimer: type.attackInterval * 0.45,
    attackFlash: 0,
    attacking: false,
    xp: type.xp,
    color: type.color,
    core: type.core,
    type: plan.type,
    hit: 0,
    dead: false,
  });
  if (type.reward) showBossBanner(type);
  enemyId += 1;
}

function updateEnemies(dt) {
  const t = tower();
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    if (e.dead) continue;
    const dx = t.x - e.x;
    const dy = t.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    e.hit = Math.max(0, e.hit - dt * 6);
    e.attackFlash = Math.max(0, e.attackFlash - dt * 5);
    const stopDist = t.r + e.radius * 1.05;

    if (dist > stopDist) {
      e.attacking = false;
      const step = Math.min(e.speed * dt, dist - stopDist);
      e.x += (dx / dist) * step;
      e.y += (dy / dist) * step;
      continue;
    }

    e.attacking = true;
    e.x = t.x - (dx / dist) * stopDist;
    e.y = t.y - (dy / dist) * stopDist;
    e.attackTimer -= dt;

    if (e.attackTimer <= 0) {
      e.attackTimer += e.attackInterval;
      e.attackFlash = 1;
      state.hp = Math.max(0, state.hp - e.damage);
      state.shake = 0.75;
      addBurst(e.x, e.y, "#ff6b6b", 9);
      addFloat(t.x, t.y - t.r - 8, "-" + e.damage, "#ff8d8d");
      if (state.hp <= 0) {
        finish(false);
        return;
      }
    }
  }
}

function updateHeroes(dt) {
  const rotating = isRotating();
  for (const hero of state.heroes) {
    hero.attackTimer = Math.max(0, hero.attackTimer - dt);
    if (rotating || hero.attackTimer > 0) continue;

    const attacked = attackWithHero(hero);
    if (attacked) hero.attackTimer = hero.cooldown;
  }
}

function attackWithHero(hero) {
  if (hero.id === "sniper") return attackSniper(hero);
  if (hero.id === "archer") return attackArcher(hero);
  if (hero.id === "warrior") return attackWarrior(hero);
  if (hero.id === "mage") return attackMage(hero);
  return false;
}

function attackSniper(hero) {
  const targets = findTargets(hero, 1);
  if (!targets.length) return false;

  const aim = heroAim(hero);
  const target = targets[0];
  const baseAngle = Math.atan2(target.y - aim.y, target.x - aim.x);
  const count = Math.max(1, hero.projectileCount);
  const spread = count > 1 ? 3 * DEG : 0;
  const damage = prepareHeroDamage(hero);

  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * spread;
    fireProjectile(hero, aim.x, aim.y, baseAngle + offset, damage, hero.pierce);
  }

  state.effects.push({
    type: "muzzle",
    x: aim.x,
    y: aim.y,
    angle: aim.angle,
    color: hero.breakthrough ? "#fff4a8" : hero.color,
    life: 0.12,
    maxLife: 0.12,
  });

  chargeUltimate(hero, () => triggerSniperUltimate(hero));
  return true;
}

function attackArcher(hero) {
  const targets = findTargets(hero, 1);
  if (!targets.length) return false;

  const aim = heroAim(hero);
  const target = targets[0];
  const baseAngle = Math.atan2(target.y - aim.y, target.x - aim.x);
  const count = Math.max(1, hero.projectileCount);
  const spread = count > 1 ? 7 * DEG : 0;
  const damage = prepareHeroDamage(hero);

  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * spread;
    fireProjectile(hero, aim.x, aim.y, baseAngle + offset, damage, hero.pierce);
  }

  state.effects.push({
    type: "muzzle",
    x: aim.x,
    y: aim.y,
    angle: aim.angle,
    color: hero.color,
    life: 0.16,
    maxLife: 0.16,
  });

  chargeUltimate(hero, () => triggerArrowRain(hero));
  return true;
}

function fireProjectile(hero, x, y, angle, damage, pierce) {
  state.projectiles.push({
    heroId: hero.id,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: Math.cos(angle) * hero.projectileSpeed,
    vy: Math.sin(angle) * hero.projectileSpeed,
    damage,
    pierceLeft: pierce,
    rangeLeft: hero.range,
    radius: hero.projectileRadius || 4,
    color: projectileColor(hero),
    splashRadius: hero.splashRadius || 0,
    splashRatio: hero.splashRatio || 0,
    hitIds: [],
  });
}

function attackWarrior(hero) {
  const range = hero.range + (hero.breakthrough ? 8 : 0);
  const angle = hero.angle + (hero.breakthrough ? 8 : 0);
  const targets = findTargets(hero, hero.targets, range, angle);
  if (!targets.length) return false;

  const aim = heroAim(hero);
  const baseDamage = prepareHeroDamage(hero);
  for (const enemy of targets) {
    let amount = baseDamage;
    if (enemy.attacking && hero.towerBonus > 0) amount += Math.round(baseDamage * hero.towerBonus);
    hitEnemy(enemy, amount, { x: aim.x, y: aim.y, color: hero.color });
    if (hero.push > 0) pushEnemyOutward(enemy, hero.push);
  }

  state.effects.push({
    type: "slash",
    x: aim.x,
    y: aim.y,
    angle: aim.angle,
    arc: angle,
    range,
    color: hero.color,
    heavy: hero.breakthrough,
    life: 0.18,
    maxLife: 0.18,
  });

  chargeUltimate(hero, () => triggerWarriorUltimate(hero));
  return true;
}

function attackMage(hero) {
  const targets = findTargets(hero, 1);
  if (!targets.length) return false;

  const target = targets[0];
  const aim = heroAim(hero);
  const damage = prepareHeroDamage(hero);
  addMagicCircle({
    x: target.x,
    y: target.y,
    radius: hero.blastRadius,
    delay: hero.castDelay,
    damage,
    color: hero.breakthrough ? "#dcb6ff" : hero.color,
    heroId: hero.id,
    angle: aim.angle,
    range: hero.range,
    chainCount: hero.chainCount,
    zoneDuration: hero.zoneDuration,
    zoneDps: hero.zoneDps,
    echoCount: hero.echoCount,
    big: false,
  });

  chargeUltimate(hero, () => triggerMageUltimate(hero, target));
  return true;
}

function prepareHeroDamage(hero) {
  return hero.damage;
}

function projectileColor(hero) {
  if (!hero.breakthrough) return hero.color;
  if (hero.id === "sniper") return "#fff4a8";
  if (hero.id === "archer") return "#9ee7ff";
  return hero.color;
}

function chargeUltimate(hero, trigger) {
  if (!hero.ultimate) return;
  hero.ultimateCharge += 1;
  if (hero.ultimateCharge < hero.ultimateEvery) return;
  hero.ultimateCharge = 0;
  trigger();
}

function triggerArrowRain(hero) {
  const aim = heroAim(hero);
  state.skyStrikes.push({
    heroId: hero.id,
    angle: aim.angle,
    range: hero.range,
    arc: hero.angle + 18,
    delay: 0.38,
    maxDelay: 0.38,
    damage: Math.round(hero.damage * 1.55),
    color: hero.color,
  });
  state.effects.push({
    type: "mark",
    x: aim.x,
    y: aim.y,
    angle: aim.angle,
    arc: hero.angle + 18,
    range: hero.range,
    color: hero.color,
    life: 0.38,
    maxLife: 0.38,
  });
}

function triggerSniperUltimate(hero) {
  const aim = heroAim(hero);
  const t = tower();
  const lineWidth = hero.breakthrough ? 9 : 7;
  const damage = Math.round(hero.damage * 2.85);
  let hits = 0;

  for (const enemy of [...state.enemies]) {
    if (enemy.dead || !enemyInLine(enemy, aim.x, aim.y, aim.angle, hero.range + 34, lineWidth)) continue;
    hitEnemy(enemy, damage, { x: t.x, y: t.y, color: hero.color });
    hits += 1;
  }

  state.effects.push({
    type: "laser",
    x: aim.x,
    y: aim.y,
    angle: aim.angle,
    range: hero.range + 34,
    width: lineWidth,
    color: hero.color,
    life: 0.22,
    maxLife: 0.22,
  });
  state.shake = Math.max(state.shake, hits > 0 ? 0.85 : 0.45);
}

function triggerWarriorUltimate(hero) {
  const aim = heroAim(hero);
  const t = tower();
  const radius = t.r + 122;
  const targets = state.enemies.filter((enemy) => {
    const dx = enemy.x - t.x;
    const dy = enemy.y - t.y;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) return false;
    const enemyAngle = Math.atan2(dy, dx) / DEG;
    return Math.abs(angleDiff(enemyAngle, aim.angle)) <= hero.angle / 2;
  });

  for (const enemy of targets) {
    const damage = Math.round(hero.damage * (enemy.attacking ? 2.3 : 1.55));
    hitEnemy(enemy, damage, { x: t.x, y: t.y, color: hero.color });
    pushEnemyOutward(enemy, 30);
  }

  state.shake = Math.max(state.shake, 1);
  state.effects.push({
    type: "shield",
    x: t.x,
    y: t.y,
    angle: aim.angle,
    arc: hero.angle,
    range: radius,
    color: hero.color,
    life: 0.42,
    maxLife: 0.42,
  });
  addBurst(t.x, t.y, hero.color, 24);
}

function triggerMageUltimate(hero, target) {
  const aim = heroAim(hero);
  const t = tower();
  const fallbackDistance = Math.min(hero.range * 0.68, Math.min(cssWidth, cssHeight) * 0.31);
  const x = target ? target.x : t.x + Math.cos(aim.angle * DEG) * fallbackDistance;
  const y = target ? target.y : t.y + Math.sin(aim.angle * DEG) * fallbackDistance;

  addMagicCircle({
    x,
    y,
    radius: hero.blastRadius + 44,
    delay: 0.6,
    damage: Math.round(hero.damage * 3.3),
    color: "#e6c8ff",
    heroId: hero.id,
    angle: aim.angle,
    range: hero.range,
    chainCount: 0,
    zoneDuration: Math.max(2.1, hero.zoneDuration + 0.8),
    zoneDps: hero.zoneDps + 7,
    big: true,
  });

  state.effects.push({
    type: "rune",
    x,
    y,
    radius: hero.blastRadius + 44,
    color: hero.color,
    life: 0.6,
    maxLife: 0.6,
  });
}

function findTargets(hero, limit, rangeOverride, angleOverride) {
  const aim = heroAim(hero);
  const range = rangeOverride ?? hero.range;
  const angle = angleOverride ?? hero.angle;
  const candidates = [];
  const t = tower();

  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - aim.x;
    const dy = enemy.y - aim.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) continue;
    const enemyAngle = Math.atan2(dy, dx) / DEG;
    const diff = Math.abs(angleDiff(enemyAngle, aim.angle));
    if (diff <= angle / 2) {
      candidates.push({
        enemy,
        danger: Math.hypot(enemy.x - t.x, enemy.y - t.y),
      });
    }
  }

  candidates.sort((a, b) => a.danger - b.danger);
  return candidates.slice(0, limit).map((item) => item.enemy);
}

function enemyInCastCone(circle, enemy) {
  const t = tower();
  const dx = enemy.x - t.x;
  const dy = enemy.y - t.y;
  const dist = Math.hypot(dx, dy);
  if (dist > circle.range) return false;
  const enemyAngle = Math.atan2(dy, dx) / DEG;
  return Math.abs(angleDiff(enemyAngle, circle.angle)) <= 55;
}

function updateProjectiles(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i];
    p.prevX = p.x;
    p.prevY = p.y;
    const step = Math.hypot(p.vx * dt, p.vy * dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rangeLeft -= step;

    let consumed = false;
    for (const enemy of [...state.enemies]) {
      if (enemy.dead || p.hitIds.includes(enemy.id)) continue;
      const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (dist > enemy.radius + p.radius) continue;

      p.hitIds.push(enemy.id);
      hitEnemy(enemy, p.damage, { x: p.prevX, y: p.prevY, color: p.color });
      if (p.splashRadius > 0 && p.splashRatio > 0) triggerProjectileSplash(p, enemy);
      addBurst(enemy.x, enemy.y, p.color, 5);
      if (p.pierceLeft <= 0) {
        consumed = true;
        break;
      }
      p.pierceLeft -= 1;
    }

    if (consumed || p.rangeLeft <= 0 || p.x < -20 || p.y < -20 || p.x > cssWidth + 20 || p.y > cssHeight + 20) {
      state.projectiles.splice(i, 1);
    }
  }
}

function enemyInLine(enemy, x, y, angleDeg, range, width) {
  const angle = angleDeg * DEG;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const dx = enemy.x - x;
  const dy = enemy.y - y;
  const forward = dx * ux + dy * uy;
  if (forward < 0 || forward > range) return false;
  const side = Math.abs(dx * uy - dy * ux);
  return side <= width + enemy.radius;
}

function triggerProjectileSplash(projectile, origin) {
  const damage = Math.max(1, Math.round(projectile.damage * projectile.splashRatio));
  let hitCount = 0;
  for (const enemy of [...state.enemies]) {
    if (enemy.dead || enemy.id === origin.id || projectile.hitIds.includes(enemy.id)) continue;
    const dist = Math.hypot(enemy.x - origin.x, enemy.y - origin.y);
    if (dist > projectile.splashRadius + enemy.radius) continue;
    projectile.hitIds.push(enemy.id);
    hitEnemy(enemy, damage, { x: origin.x, y: origin.y, color: projectile.color }, { quiet: true });
    hitCount += 1;
  }

  if (hitCount > 0) {
    state.effects.push({
      type: "shock",
      x: origin.x,
      y: origin.y,
      radius: projectile.splashRadius,
      color: projectile.color,
      life: 0.18,
      maxLife: 0.18,
    });
  }
}

function addMagicCircle(config) {
  state.magicCircles.push({
    ...config,
    life: config.delay,
    maxLife: config.delay,
  });
}

function updateMagicCircles(dt) {
  for (let i = state.magicCircles.length - 1; i >= 0; i -= 1) {
    const circle = state.magicCircles[i];
    circle.life -= dt;
    if (circle.life > 0) continue;
    explodeMagicCircle(circle);
    state.magicCircles.splice(i, 1);
  }
}

function explodeMagicCircle(circle) {
  const hits = [];
  for (const enemy of [...state.enemies]) {
    if (enemy.dead) continue;
    const dist = Math.hypot(enemy.x - circle.x, enemy.y - circle.y);
    if (dist <= circle.radius + enemy.radius) {
      hits.push(enemy);
      hitEnemy(enemy, circle.damage, { x: circle.x, y: circle.y, color: circle.color });
    }
  }

  state.effects.push({
    type: "shock",
    x: circle.x,
    y: circle.y,
    radius: circle.radius,
    color: circle.color,
    life: circle.big ? 0.48 : 0.28,
    maxLife: circle.big ? 0.48 : 0.28,
  });
  addBurst(circle.x, circle.y, circle.color, circle.big ? 26 : 14);
  if (circle.big) state.shake = Math.max(state.shake, 0.9);

  if (circle.zoneDuration > 0) {
    state.zones.push({
      x: circle.x,
      y: circle.y,
      radius: circle.radius * (circle.big ? 0.95 : 0.82),
      color: circle.color,
      life: circle.zoneDuration,
      maxLife: circle.zoneDuration,
      dps: circle.zoneDps,
      tick: 0.22,
      interval: 0.42,
    });
  }

  if (circle.echoCount > 0) {
    addMagicCircle({
      x: circle.x,
      y: circle.y,
      radius: Math.max(28, circle.radius * 0.68),
      delay: 0.2,
      damage: Math.max(1, Math.round(circle.damage * 0.48)),
      color: circle.color,
      heroId: circle.heroId,
      angle: circle.angle,
      range: circle.range,
      chainCount: 0,
      zoneDuration: 0,
      zoneDps: circle.zoneDps,
      echoCount: circle.echoCount - 1,
      big: false,
    });
  }

  if (circle.chainCount > 0) {
    const candidates = state.enemies
      .filter((enemy) => !enemy.dead && !hits.includes(enemy) && enemyInCastCone(circle, enemy))
      .sort((a, b) => Math.hypot(a.x - circle.x, a.y - circle.y) - Math.hypot(b.x - circle.x, b.y - circle.y))
      .slice(0, circle.chainCount);

    for (const enemy of candidates) {
      addMagicCircle({
        x: enemy.x,
        y: enemy.y,
        radius: Math.max(34, circle.radius * 0.64),
        delay: 0.22,
        damage: Math.round(circle.damage * 0.66),
        color: circle.color,
        heroId: circle.heroId,
        angle: circle.angle,
        range: circle.range,
        chainCount: 0,
        zoneDuration: Math.min(0.7, circle.zoneDuration * 0.45),
        zoneDps: circle.zoneDps,
        echoCount: 0,
        big: false,
      });
    }
  }
}

function updateZones(dt) {
  for (let i = state.zones.length - 1; i >= 0; i -= 1) {
    const zone = state.zones[i];
    zone.life -= dt;
    zone.tick -= dt;
    if (zone.tick <= 0) {
      zone.tick += zone.interval;
      const damage = Math.max(1, Math.round(zone.dps * zone.interval));
      for (const enemy of [...state.enemies]) {
        if (enemy.dead) continue;
        const dist = Math.hypot(enemy.x - zone.x, enemy.y - zone.y);
        if (dist <= zone.radius + enemy.radius) {
          hitEnemy(enemy, damage, { x: zone.x, y: zone.y, color: zone.color }, { quiet: true });
        }
      }
    }
    if (zone.life <= 0) state.zones.splice(i, 1);
  }
}

function updateSkyStrikes(dt) {
  for (let i = state.skyStrikes.length - 1; i >= 0; i -= 1) {
    const strike = state.skyStrikes[i];
    strike.delay -= dt;
    if (strike.delay > 0) continue;

    const t = tower();
    const targets = state.enemies.filter((enemy) => {
      if (enemy.dead) return false;
      const dx = enemy.x - t.x;
      const dy = enemy.y - t.y;
      const dist = Math.hypot(dx, dy);
      if (dist > strike.range) return false;
      const enemyAngle = Math.atan2(dy, dx) / DEG;
      return Math.abs(angleDiff(enemyAngle, strike.angle)) <= strike.arc / 2;
    });

    for (const enemy of targets) {
      const damage = strike.damage + (enemy.attacking ? Math.round(strike.damage * 0.45) : 0);
      hitEnemy(enemy, damage, { x: t.x, y: t.y, color: strike.color });
    }

    state.effects.push({
      type: "rain",
      x: t.x,
      y: t.y,
      angle: strike.angle,
      arc: strike.arc,
      range: strike.range,
      color: strike.color,
      life: 0.42,
      maxLife: 0.42,
    });
    state.shake = Math.max(state.shake, 0.85);
    state.skyStrikes.splice(i, 1);
  }
}

function hitEnemy(enemy, amount, source, options = {}) {
  if (!enemy || enemy.dead) return;
  enemy.hp -= amount;
  enemy.hit = 1;

  if (!options.quiet) {
    addBurst(enemy.x, enemy.y, source?.color || "#ffd166", 5);
    addFloat(enemy.x, enemy.y - enemy.radius - 5, amount.toString(), source?.color || "#ffe19a");
  }

  if (enemy.hp <= 0) killEnemy(enemy);
}

function killEnemy(enemy) {
  if (enemy.dead) return;
  const type = TYPES[enemy.type];
  enemy.dead = true;
  const idx = state.enemies.indexOf(enemy);
  if (idx >= 0) state.enemies.splice(idx, 1);
  state.killCount += 1;
  addBurst(enemy.x, enemy.y, enemy.color, 18);
  addXpOrb(enemy.x, enemy.y, enemy.xp);
  if (type?.reward) openBossReward(type.reward);
}

function pushEnemyOutward(enemy, amount) {
  if (!enemy || enemy.dead || amount <= 0) return;
  const t = tower();
  const dx = enemy.x - t.x;
  const dy = enemy.y - t.y;
  const dist = Math.hypot(dx, dy) || 1;
  const resistance = enemy.type === "boss" ? 0.18 : enemy.type === "midboss" ? 0.28 : enemy.type === "brute" ? 0.42 : enemy.type === "tank" ? 0.58 : 1;
  const push = amount * resistance;
  enemy.x = clamp(enemy.x + (dx / dist) * push, 8, cssWidth - 8);
  enemy.y = clamp(enemy.y + (dy / dist) * push, 8, cssHeight - 8);
  enemy.attacking = false;
  enemy.attackTimer = Math.max(enemy.attackTimer, enemy.attackInterval * 0.35);
}

function addXpOrb(x, y, amount) {
  state.xpOrbs.push({
    x,
    y,
    amount,
    life: 0,
  });
}

function updateXpOrbs(dt) {
  const targetX = cssWidth * 0.76;
  const targetY = 18;
  for (let i = state.xpOrbs.length - 1; i >= 0; i -= 1) {
    const orb = state.xpOrbs[i];
    orb.life += dt;
    const speed = 420 + orb.life * 260;
    const dx = targetX - orb.x;
    const dy = targetY - orb.y;
    const dist = Math.hypot(dx, dy) || 1;
    orb.x += (dx / dist) * speed * dt;
    orb.y += (dy / dist) * speed * dt;
    if (dist < 16 || orb.life > 1.2) {
      gainXp(orb.amount);
      state.xpOrbs.splice(i, 1);
    }
  }
}

function xpRequirementForLevel(level) {
  const completedLevelUps = Math.max(0, level - 1);
  return Math.round(
    XP_BASE_REQUIREMENT +
      completedLevelUps * XP_LINEAR_GROWTH +
      completedLevelUps * completedLevelUps * XP_QUADRATIC_GROWTH
  );
}

function gainXp(amount) {
  state.xp += amount;
  tryOpenLevelUp();
}

function tryOpenLevelUp() {
  if (state.phase !== "playing" || state.xp < state.xpNeeded) return false;
  state.xp -= state.xpNeeded;
  state.level += 1;
  state.xpNeeded = xpRequirementForLevel(state.level);
  openUpgrade();
  return true;
}

function openUpgrade() {
  clearRewardRevealTimers();
  const activePointerId = state.rotationPointerId;
  const needsPointerRelease = activePointerId !== null;
  if (activePointerId !== null) canvas.releasePointerCapture?.(activePointerId);
  clearRotationInput();
  lockUpgradeChoices(needsPointerRelease);
  state.phase = "upgrade";
  ui.choiceEyebrow.textContent = "LEVEL UP";
  ui.choiceTitle.textContent = "강화 선택";
  ui.upgradeChoices.innerHTML = "";
  ui.upgradeChoices.classList.remove("hidden");
  ui.rewardReveal.innerHTML = "";
  ui.rewardReveal.classList.add("hidden");
  ui.rewardContinue.classList.add("hidden");
  const choices = drawChoices(3);
  if (!choices.length) {
    clearUpgradeChoiceLock();
    state.phase = "playing";
    pulseToast("선택 가능한 강화 없음");
    syncUi();
    return;
  }
  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.type = "button";
    button.disabled = true;
    button.style.setProperty("--choice-color", choice.color);
    button.style.setProperty("--choice-delay", `${140 + index * 80}ms`);
    button.innerHTML = `<span class="card-meta">${choice.meta}</span><strong>${choice.title}</strong><span>${choice.text}</span>`;
    button.addEventListener("click", (event) => {
      if (isUpgradeChoiceLocked()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      clearUpgradeChoiceLock();
      choice.apply();
      ui.upgradeOverlay.classList.add("hidden");
      state.phase = "playing";
      pulseToast(choice.title);
      if (!tryOpenLevelUp()) syncUi();
    });
    ui.upgradeChoices.appendChild(button);
  });
  ui.upgradeOverlay.classList.remove("hidden");
  syncUi();
}

function openBossReward(rewardId) {
  const rewardConfig = BOSS_REWARD_CONFIG[rewardId];
  if (!rewardConfig || state.phase === "result") return;
  clearRewardRevealTimers();
  const activePointerId = state.rotationPointerId;
  const needsPointerRelease = activePointerId !== null;
  if (activePointerId !== null) canvas.releasePointerCapture?.(activePointerId);
  clearRotationInput();
  lockUpgradeChoices(needsPointerRelease);
  state.phase = "reward";
  ui.choiceEyebrow.textContent = rewardConfig.eyebrow;
  ui.choiceTitle.textContent = rewardConfig.title;
  ui.upgradeChoices.innerHTML = "";
  ui.upgradeChoices.classList.add("hidden");
  ui.rewardReveal.innerHTML = "";
  ui.rewardReveal.classList.remove("hidden");
  ui.rewardContinue.classList.add("hidden");

  const rewards = rollBossRewards(rewardConfig);
  const countRow = document.createElement("div");
  countRow.className = "reward-count";
  countRow.innerHTML = rewards.length
    ? `<strong>${rewards.length}명 강화</strong><span>랜덤 캐릭터와 업그레이드를 추첨합니다</span>`
    : `<strong>강화 없음</strong><span>선택 가능한 캐릭터 업그레이드가 없습니다</span>`;
  ui.rewardReveal.appendChild(countRow);

  rewards.forEach((reward, index) => {
    const timer = setTimeout(() => revealBossReward(reward), 520 + index * 560);
    rewardRevealTimers.push(timer);
  });
  const doneTimer = setTimeout(() => {
    ui.rewardContinue.classList.remove("hidden");
    tryUnlockUpgradeChoices();
  }, 820 + rewards.length * 560);
  rewardRevealTimers.push(doneTimer);

  ui.upgradeOverlay.classList.remove("hidden");
  syncUi();
}

function rollBossRewards(rewardConfig) {
  const count = pickWeightedCount(rewardConfig.countWeights);
  const rewards = [];
  const usedIds = new Set();
  const usedHeroIds = new Set();

  for (let i = 0; i < count; i += 1) {
    const reward = drawRandomUpgradeReward(usedIds, usedHeroIds);
    if (!reward) break;
    usedIds.add(reward.choice.id);
    usedHeroIds.add(reward.hero.id);
    rewards.push(reward);
  }

  return rewards;
}

function drawRandomUpgradeReward(usedIds, usedHeroIds) {
  const heroes = shuffle(state.heroes.filter((hero) => !usedHeroIds.has(hero.id) && hasAvailableUpgrade(hero, usedIds)));
  for (const hero of heroes) {
    const choice = selectUpgradeForHero(hero, usedIds);
    if (choice) return { hero, choice };
  }
  return null;
}

function revealBossReward(reward) {
  reward.choice.apply();
  const row = document.createElement("div");
  row.className = "reward-row";
  row.style.setProperty("--choice-color", reward.choice.color);
  row.innerHTML = `<span class="card-meta">${reward.hero.name} ${reward.choice.tier}</span><strong>${reward.choice.title}</strong><span>${reward.choice.text}</span>`;
  ui.rewardReveal.appendChild(row);
  addFloat(tower().x, tower().y - 28, `${reward.hero.name} 강화`, reward.choice.color);
  addRing(tower().x, tower().y, reward.choice.color, 16, 0.5);
  state.shake = Math.max(state.shake, 0.28);
  syncUi();
}

function pickWeightedCount(entries) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.count;
  }
  return entries[0]?.count || 1;
}

function lockUpgradeChoices(needsPointerRelease) {
  clearTimeout(upgradeUnlockTimer);
  upgradeUnlockTimer = 0;
  upgradeUnlockNeedsRelease = needsPointerRelease;
  ui.upgradeOverlay.classList.add("upgrade-locked");
  upgradeUnlockTimer = setTimeout(() => {
    upgradeUnlockTimer = 0;
    tryUnlockUpgradeChoices();
  }, UPGRADE_INPUT_LOCK_MS);
}

function clearUpgradeChoiceLock() {
  clearTimeout(upgradeUnlockTimer);
  upgradeUnlockTimer = 0;
  upgradeUnlockNeedsRelease = false;
  ui.upgradeOverlay.classList.remove("upgrade-locked");
}

function clearRewardRevealTimers() {
  for (const timer of rewardRevealTimers) clearTimeout(timer);
  rewardRevealTimers = [];
}

function closeBossReward() {
  if (!state || state.phase !== "reward" || isUpgradeChoiceLocked()) return;
  clearRewardRevealTimers();
  clearUpgradeChoiceLock();
  ui.upgradeOverlay.classList.add("hidden");
  ui.rewardContinue.classList.add("hidden");
  ui.rewardReveal.classList.add("hidden");
  state.phase = "playing";
  if (!tryOpenLevelUp()) syncUi();
}

function markUpgradePointerReleased() {
  if (!state || !isChoicePhase()) return;
  upgradeUnlockNeedsRelease = false;
  if (!upgradeUnlockTimer) tryUnlockUpgradeChoices();
}

function tryUnlockUpgradeChoices() {
  if (!state || !isChoicePhase() || upgradeUnlockNeedsRelease) return;
  ui.upgradeOverlay.classList.remove("upgrade-locked");
  for (const button of ui.upgradeChoices.querySelectorAll(".upgrade-card")) {
    button.disabled = false;
  }
}

function isUpgradeChoiceLocked() {
  return ui.upgradeOverlay.classList.contains("upgrade-locked");
}

function isChoicePhase() {
  return state.phase === "upgrade" || state.phase === "reward";
}

function drawChoices(count) {
  const out = [];
  const usedIds = new Set();

  while (out.length < count) {
    const choice = drawOneHeroChoice(usedIds);
    if (!choice) break;
    usedIds.add(choice.id);
    out.push(choice);
  }

  return out;
}

function drawOneHeroChoice(usedIds) {
  const heroes = shuffle(state.heroes.filter((hero) => hasAvailableUpgrade(hero, usedIds)));
  for (const hero of heroes) {
    const choice = selectUpgradeForHero(hero, usedIds);
    if (choice) return choice;
  }
  return null;
}

function hasAvailableUpgrade(hero, usedIds) {
  return heroUpgrades.some((upgrade) => upgrade.heroId === hero.id && canOfferUpgrade(upgrade, hero, usedIds));
}

function selectUpgradeForHero(hero, usedIds) {
  const breakthrough = heroUpgrades.find((upgrade) => upgrade.heroId === hero.id && upgrade.tier === "돌파" && canOfferUpgrade(upgrade, hero, usedIds));
  if (breakthrough) return buildChoice(breakthrough, hero);

  if (hero.breakthrough) {
    const advanced = availableUpgrades(hero, "고급", usedIds);
    const basic = availableUpgrades(hero, "기본", usedIds);
    const ultimate = heroUpgrades.find((upgrade) => upgrade.heroId === hero.id && upgrade.tier === "궁극" && canOfferUpgrade(upgrade, hero, usedIds));
    const postBreakthroughPool = pickWeightedPool([
      { weight: 55, pool: advanced },
      { weight: 30, pool: basic },
      { weight: 15, pool: ultimate ? [ultimate] : [] },
    ]);
    if (postBreakthroughPool) return buildChoice(pick(postBreakthroughPool), hero);
  }

  const growth = availableUpgrades(hero, "성장", usedIds);
  const basic = availableUpgrades(hero, "기본", usedIds);
  let pool = Math.random() < 0.7 ? growth : basic;
  if (!pool.length) pool = pool === growth ? basic : growth;
  if (!pool.length) return null;
  return buildChoice(pick(pool), hero);
}

function availableUpgrades(hero, tier, usedIds) {
  return heroUpgrades.filter((upgrade) => upgrade.heroId === hero.id && upgrade.tier === tier && canOfferUpgrade(upgrade, hero, usedIds));
}

function pickWeightedPool(entries) {
  const available = entries.filter((entry) => entry.pool.length);
  const totalWeight = available.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of available) {
    roll -= entry.weight;
    if (roll <= 0) return entry.pool;
  }
  return available[0]?.pool || null;
}

function canOfferUpgrade(upgrade, hero, usedIds) {
  if (!hero || usedIds.has(upgrade.id)) return false;
  if (upgrade.tier === "성장") return !hero.growthPicked[upgrade.id];
  if (upgrade.tier === "기본") return getBasicRank(hero, upgrade.id) < upgrade.maxRank;
  if (upgrade.tier === "고급") return hero.breakthrough && !hero.advancedPicked[upgrade.id];
  if (upgrade.tier === "돌파") return !hero.breakthrough && hasAllGrowthChoices(hero);
  if (upgrade.tier === "궁극") return canOfferUltimate(hero);
  return false;
}

function canOfferUltimate(hero) {
  return hero.breakthrough && !hero.ultimate && state.level >= 6 && hero.basicPicks >= 1 && hero.totalPicks >= 5;
}

function hasAllGrowthChoices(hero) {
  return heroUpgrades
    .filter((upgrade) => upgrade.heroId === hero.id && upgrade.tier === "성장")
    .every((upgrade) => hero.growthPicked[upgrade.id]);
}

function getBasicRank(hero, upgradeId) {
  return hero.basicRanks[upgradeId] || 0;
}

function tierColor(tier) {
  return TIER_COLORS[tier] || TIER_COLORS["기본"];
}

function buildChoice(upgrade, hero) {
  const nextRank = upgrade.tier === "기본" ? getBasicRank(hero, upgrade.id) + 1 : null;
  return {
    ...upgrade,
    hero,
    color: tierColor(upgrade.tier),
    meta: upgrade.tier === "기본" ? `${hero.name} 기본 ${nextRank}/${upgrade.maxRank}` : `${hero.name} ${upgrade.tier}`,
    apply: () => applyHeroUpgrade(upgrade, hero),
  };
}

function applyHeroUpgrade(upgrade, hero) {
  upgrade.apply(hero);
  if (upgrade.tier === "성장") {
    hero.growthPicked[upgrade.id] = true;
    hero.growthPicks += 1;
  } else if (upgrade.tier === "기본") {
    hero.basicRanks[upgrade.id] = getBasicRank(hero, upgrade.id) + 1;
    hero.basicPicks += 1;
  } else if (upgrade.tier === "고급") {
    hero.advancedPicked[upgrade.id] = true;
    hero.advancedPicks += 1;
  }
  hero.totalPicks += 1;
}

function heroById(id) {
  return state.heroes.find((hero) => hero.id === id);
}

function updateEffects(dt) {
  for (let i = state.effects.length - 1; i >= 0; i -= 1) {
    const effect = state.effects[i];
    effect.life -= dt;
    if (effect.life <= 0) state.effects.splice(i, 1);
  }
}

function addBurst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TWO_PI;
    const speed = 35 + Math.random() * 130;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 1.2 + Math.random() * 2,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
    });
  }
}

function addRing(x, y, color, size, life) {
  state.particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color,
    size,
    ring: true,
    life,
    maxLife: life,
  });
}

function addFloat(x, y, text, color) {
  state.floatingTexts.push({ x, y, text, color, life: 0.8, maxLife: 0.8 });
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updateFloatingTexts(dt) {
  for (let i = state.floatingTexts.length - 1; i >= 0; i -= 1) {
    const f = state.floatingTexts[i];
    f.life -= dt;
    f.y -= 22 * dt;
    if (f.life <= 0) state.floatingTexts.splice(i, 1);
  }
}

function checkWaveClear() {
  const wave = WAVES[state.waveIndex];
  if (!wave) return;
  if (state.nextSpawn >= wave.length && state.enemies.length === 0) {
    state.waveIndex += 1;
    if (state.waveIndex >= WAVES.length) {
      finish(true);
      return;
    }
    state.waveTime = 0;
    state.nextSpawn = 0;
    state.waveBanner = 1.2;
    pulseToast("WAVE " + (state.waveIndex + 1));
  }
}

function finish(won) {
  if (state.phase === "result") return;
  clearRotationInput();
  clearRewardRevealTimers();
  clearTimeout(bossBannerTimer);
  bossBannerTimer = 0;
  ui.bossBanner.classList.add("hidden");
  state.phase = "result";
  ui.resultEyebrow.textContent = won ? "KEEP CLEAR" : "TOWER DOWN";
  ui.resultTitle.textContent = won ? "방어 성공" : "방어 실패";
  ui.resultText.textContent = won
    ? `레벨 ${state.level}, 처치 ${state.killCount}.`
    : `웨이브 ${Math.min(state.waveIndex + 1, WAVES.length)}, 처치 ${state.killCount}.`;
  ui.resultOverlay.classList.remove("hidden");
  syncUi();
}

function draw() {
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.save();
  if (state.shake > 0) {
    const mag = state.shake * 5;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }

  drawMap();
  drawAttackCones();
  drawZones();
  drawMagicCircles();
  drawSkyStrikeMarks();
  drawTower();
  drawSlots();
  drawEnemies();
  drawProjectiles();
  drawEffects();
  drawHeroes();
  drawXpOrbs();
  drawParticles();
  drawFloatingTexts();
  drawWaveBanner();

  ctx.restore();
}

function drawMap() {
  const w = cssWidth;
  const h = cssHeight;
  const grid = Math.max(22, Math.min(w, h) * 0.068);

  ctx.save();
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#28334a");
  grd.addColorStop(0.52, "#1b2537");
  grd.addColorStop(1, "#151b29");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#f7f1dc";
  ctx.lineWidth = 1;
  for (let x = (w % grid) / 2; x <= w; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = (h % grid) / 2; y <= h; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const t = tower();
  const floor = ctx.createRadialGradient(t.x, t.y, t.r * 1.2, t.x, t.y, Math.min(w, h) * 0.42);
  floor.addColorStop(0, "rgba(247, 200, 95, 0.16)");
  floor.addColorStop(0.5, "rgba(111, 214, 255, 0.08)");
  floor.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#101522";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.restore();
}

function drawAttackCones() {
  for (const hero of state.heroes) {
    const p = heroAim(hero);
    const start = (p.angle - hero.angle / 2) * DEG;
    const end = (p.angle + hero.angle / 2) * DEG;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, hero.range);
    grad.addColorStop(0, rgba(hero.color, 0.2));
    grad.addColorStop(0.7, rgba(hero.color, hero.rotateT < 1 ? 0.1 : 0.07));
    grad.addColorStop(1, rgba(hero.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, hero.range, start, end);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = hero.rotateT < 1 ? 0.18 : 0.36;
    ctx.strokeStyle = hero.color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, hero.range, start, end);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSlots() {
  const t = tower();
  for (let i = 0; i < HERO_ANGLES.length; i += 1) {
    const angle = HERO_ANGLES[i] * DEG;
    const inner = t.r + 4;
    const outer = t.r + 17;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "rgba(247, 241, 220, 0.78)";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(t.x + Math.cos(angle) * inner, t.y + Math.sin(angle) * inner);
    ctx.lineTo(t.x + Math.cos(angle) * outer, t.y + Math.sin(angle) * outer);
    ctx.stroke();
    ctx.restore();
  }

  for (const hero of state.heroes) {
    const p = heroVisualPosition(hero, 5);
    const angle = p.angle * DEG;
    const inner = t.r + 5;
    const outer = t.r + 22;
    ctx.save();
    ctx.globalAlpha = hero.rotateT < 1 ? 0.38 : 0.82;
    ctx.strokeStyle = hero.color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(t.x + Math.cos(angle) * inner, t.y + Math.sin(angle) * inner);
    ctx.lineTo(t.x + Math.cos(angle) * outer, t.y + Math.sin(angle) * outer);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, TWO_PI);
    ctx.fillStyle = hero.color;
    ctx.fill();
    ctx.restore();
  }
}

function drawEnemyAttackLine(enemy) {
  if (!enemy.attacking) return;
  const t = tower();
  const pulse = 0.32 + enemy.attackFlash * 0.68;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = "#ff6b6b";
  ctx.lineWidth = 1.2 + enemy.attackFlash * 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(enemy.x, enemy.y);
  ctx.lineTo(t.x, t.y);
  ctx.stroke();
  ctx.restore();
}

function drawTower() {
  const t = tower();
  ctx.save();
  ctx.shadowColor = "rgba(247, 200, 95, 0.55)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#38445e";
  roundPoly(t.x, t.y, t.r * 1.42, 8, -Math.PI / 8);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f7c85f";
  roundPoly(t.x, t.y - t.r * 0.2, t.r * 0.82, 6, Math.PI / 6);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(t.x, t.y - t.r * 1.15);
  ctx.lineTo(t.x, t.y + t.r * 1.05);
  ctx.moveTo(t.x - t.r * 0.9, t.y);
  ctx.lineTo(t.x + t.r * 0.9, t.y);
  ctx.stroke();
  ctx.restore();
}

function drawHeroes() {
  for (const hero of state.heroes) {
    const p = heroVisualPosition(hero);
    const rotating = hero.rotateT < 1;
    const unit = Math.max(6, Math.min(cssWidth, cssHeight) * 0.029 * HERO_SCALE);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle * DEG + Math.PI / 2);

    ctx.fillStyle = rotating ? rgba(hero.color, 0.24) : rgba(hero.color, 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, unit * 1.4, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = "#151d2c";
    ctx.strokeStyle = hero.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-unit * 0.68, -unit * 0.5, unit * 1.36, unit * 1.28, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f7f1dc";
    ctx.beginPath();
    ctx.arc(0, -unit * 0.98, unit * 0.48, 0, TWO_PI);
    ctx.fill();

    ctx.strokeStyle = hero.color;
    ctx.lineWidth = hero.breakthrough ? 2.8 : 2.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (hero.id === "archer") {
      ctx.arc(0, -unit * 0.42, unit * 0.72, -Math.PI * 0.75, Math.PI * 0.75);
    } else if (hero.id === "warrior") {
      ctx.moveTo(-unit * 0.55, -unit * 0.1);
      ctx.lineTo(unit * 0.58, -unit * 1.5);
    } else {
      ctx.arc(0, -unit * 0.5, unit * 0.58, 0, TWO_PI);
    }
    ctx.stroke();

    ctx.restore();
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(1 + e.hit * 0.08, 1 + e.hit * 0.08);
    ctx.fillStyle = e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 8;
    if (e.type === "boss" || e.type === "midboss") {
      roundPoly(0, 0, e.radius * (e.type === "boss" ? 1.42 : 1.28), e.type === "boss" ? 8 : 7, Math.PI / 8);
      ctx.fill();
      ctx.strokeStyle = e.core;
      ctx.lineWidth = e.type === "boss" ? 2.4 : 1.8;
      ctx.stroke();
    } else if (e.type === "swarm") {
      ctx.beginPath();
      ctx.moveTo(0, -e.radius * 1.28);
      ctx.lineTo(e.radius * 1.12, 0);
      ctx.lineTo(0, e.radius * 1.28);
      ctx.lineTo(-e.radius * 1.12, 0);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "runner") {
      ctx.beginPath();
      ctx.moveTo(0, -e.radius * 1.35);
      ctx.lineTo(e.radius * 1.25, e.radius * 0.95);
      ctx.lineTo(-e.radius * 1.25, e.radius * 0.95);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "tank" || e.type === "brute") {
      roundPoly(0, 0, e.radius * (e.type === "brute" ? 1.32 : 1.24), e.type === "brute" ? 7 : 6, Math.PI / 6);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, TWO_PI);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = e.core;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.36, 0, TWO_PI);
    ctx.fill();

    const bw = Math.max(10, e.radius * 2.3);
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(-bw / 2, -e.radius - 7, bw, 3);
    ctx.fillStyle = "#79e28e";
    ctx.fillRect(-bw / 2, -e.radius - 7, bw * Math.max(0, e.hp / e.maxHp), 3);
    ctx.restore();
    drawEnemyAttackLine(e);
  }
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.prevX, p.prevY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
  }
}

function drawMagicCircles() {
  for (const circle of state.magicCircles) {
    const progress = 1 - circle.life / circle.maxLife;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.32 + progress * 0.42;
    ctx.strokeStyle = circle.color;
    ctx.lineWidth = circle.big ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius * (0.42 + progress * 0.58), 0, TWO_PI);
    ctx.stroke();
    ctx.globalAlpha = 0.16 + progress * 0.18;
    ctx.fillStyle = circle.color;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
}

function drawZones() {
  for (const zone of state.zones) {
    const a = Math.max(0, zone.life / zone.maxLife);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.12 + a * 0.18;
    ctx.fillStyle = zone.color;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, TWO_PI);
    ctx.fill();
    ctx.globalAlpha = 0.2 + a * 0.26;
    ctx.strokeStyle = zone.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius * (0.94 + Math.sin(state.time * 7) * 0.03), 0, TWO_PI);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSkyStrikeMarks() {
  const t = tower();
  for (const strike of state.skyStrikes) {
    const a = clamp(1 - strike.delay / strike.maxDelay, 0, 1);
    const start = (strike.angle - strike.arc / 2) * DEG;
    const end = (strike.angle + strike.arc / 2) * DEG;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.18 + a * 0.28;
    ctx.fillStyle = strike.color;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.arc(t.x, t.y, strike.range, start, end);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawEffects() {
  for (const effect of state.effects) {
    const a = Math.max(0, effect.life / effect.maxLife);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a;
    ctx.strokeStyle = effect.color;
    ctx.fillStyle = effect.color;

    if (effect.type === "slash") {
      const start = (effect.angle - effect.arc / 2) * DEG;
      const end = (effect.angle + effect.arc / 2) * DEG;
      ctx.lineWidth = effect.heavy ? 6 : 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.range * (0.55 + (1 - a) * 0.45), start, end);
      ctx.stroke();
    } else if (effect.type === "shock") {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (0.48 + (1 - a) * 0.58), 0, TWO_PI);
      ctx.stroke();
    } else if (effect.type === "shield") {
      const start = (effect.angle - effect.arc / 2) * DEG;
      const end = (effect.angle + effect.arc / 2) * DEG;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.range * (0.45 + (1 - a) * 0.55), start, end);
      ctx.stroke();
      ctx.globalAlpha = a * 0.18;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.arc(effect.x, effect.y, effect.range, start, end);
      ctx.closePath();
      ctx.fill();
    } else if (effect.type === "rain") {
      drawRainEffect(effect, a);
    } else if (effect.type === "mark") {
      const start = (effect.angle - effect.arc / 2) * DEG;
      const end = (effect.angle + effect.arc / 2) * DEG;
      ctx.globalAlpha = a * 0.2;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.arc(effect.x, effect.y, effect.range, start, end);
      ctx.closePath();
      ctx.fill();
    } else if (effect.type === "rune") {
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (0.72 + (1 - a) * 0.28), 0, TWO_PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * 0.44, 0, TWO_PI);
      ctx.stroke();
    } else if (effect.type === "laser") {
      const angle = effect.angle * DEG;
      const endX = effect.x + Math.cos(angle) * effect.range;
      const endY = effect.y + Math.sin(angle) * effect.range;
      ctx.lineCap = "round";
      ctx.lineWidth = effect.width * (0.8 + a * 0.8);
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.globalAlpha = a * 0.75;
      ctx.lineWidth = Math.max(1.2, effect.width * 0.26);
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else if (effect.type === "muzzle") {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(effect.x + Math.cos(effect.angle * DEG) * 34, effect.y + Math.sin(effect.angle * DEG) * 34);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawRainEffect(effect, alpha) {
  const t = tower();
  const base = effect.angle * DEG;
  const count = 9;
  for (let i = 0; i < count; i += 1) {
    const spread = ((i / (count - 1)) - 0.5) * effect.arc * DEG;
    const dist = effect.range * (0.32 + (i % 3) * 0.22);
    const x = t.x + Math.cos(base + spread) * dist;
    const y = t.y + Math.sin(base + spread) * dist;
    ctx.globalAlpha = alpha * (0.48 + (i % 2) * 0.28);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 26);
    ctx.lineTo(x + 8, y + 14);
    ctx.stroke();
  }
}

function drawXpOrbs() {
  for (const orb of state.xpOrbs) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "#7fe2ff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#85eeff";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 3.2, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    if (p.ring) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + (1 - a) * 4), 0, TWO_PI);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawFloatingTexts() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "800 13px ui-sans-serif, system-ui";
  for (const f of state.floatingTexts) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

function drawWaveBanner() {
  if (state.waveBanner <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.waveBanner);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, cssHeight * 0.43, cssWidth, 44);
  ctx.fillStyle = "#f7f1dc";
  ctx.textAlign = "center";
  ctx.font = "900 22px ui-sans-serif, system-ui";
  ctx.fillText("WAVE " + (state.waveIndex + 1), cssWidth * 0.5, cssHeight * 0.43 + 29);
  ctx.restore();
}

function syncUi() {
  ui.wave.textContent = `${Math.min(state.waveIndex + 1, WAVES.length)}/${WAVES.length}`;
  ui.hp.textContent = `${Math.ceil(state.hp)}/${state.maxHp}`;
  ui.hpFill.style.width = `${clamp((state.hp / state.maxHp) * 100, 0, 100)}%`;
  ui.xp.textContent = `${state.xp}/${state.xpNeeded}`;
  ui.xpFill.style.width = `${clamp((state.xp / state.xpNeeded) * 100, 0, 100)}%`;
  ui.heroLevel.textContent = `Lv.${state.level} / ${VERSION_LABEL}`;
  ui.damage.textContent = String(teamPower());
  ui.speed.textContent = rotationLabel();
  ui.range.textContent = String(state.killCount);
  renderTeamList();
}

function teamPower() {
  return state.heroes.reduce(
    (sum, hero) =>
      sum + hero.damage + hero.growthPicks * 5 + hero.basicPicks * 2 + hero.advancedPicks * 7 + (hero.breakthrough ? 14 : 0) + (hero.ultimate ? 20 : 0),
    0,
  );
}

function renderTeamList() {
  if (!ui.teamList) return;
  ui.teamList.innerHTML = state.heroes
    .map((hero) => {
      const aim = Math.round(heroAim(hero).angle);
      const badges = `${hero.breakthrough ? "D" : "-"}${hero.ultimate ? "U" : "-"}`;
      return `
        <div class="team-card" style="--hero-color: ${hero.color}">
          <b>${hero.glyph}</b>
          <span>${hero.name}</span>
          <em>${aim}도 G${hero.growthPicks}/3 B${hero.basicPicks} A${hero.advancedPicks}/3 ${badges}</em>
        </div>
      `;
    })
    .join("");
}

function pulseToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.add("hidden"), 650);
}

function showBossBanner(type) {
  ui.bossBanner.style.setProperty("--boss-color", type.color);
  ui.bossBannerKicker.textContent = type.bannerKicker || "WARNING";
  ui.bossBannerTitle.textContent = type.bannerTitle || "BOSS";
  ui.bossBannerText.textContent = type.bannerText || "거대한 적이 접근합니다";
  ui.bossBanner.classList.remove("hidden");
  state.shake = Math.max(state.shake, 0.95);
  clearTimeout(bossBannerTimer);
  bossBannerTimer = setTimeout(() => ui.bossBanner.classList.add("hidden"), 1560);
}

function restart() {
  clearUpgradeChoiceLock();
  clearRewardRevealTimers();
  clearTimeout(bossBannerTimer);
  bossBannerTimer = 0;
  state = createState();
  ui.upgradeOverlay.classList.add("hidden");
  ui.resultOverlay.classList.add("hidden");
  ui.bossBanner.classList.add("hidden");
  ui.rewardReveal.classList.add("hidden");
  ui.rewardContinue.classList.add("hidden");
  pulseToast("WAVE 1");
  syncUi();
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  draw();
  syncUi();
  requestAnimationFrame(loop);
}

function roundPoly(x, y, radius, sides, rotation) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i / sides) * TWO_PI;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function angleDiff(a, b) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

function normalizeAngle(angle) {
  return angleDiff(angle, 0);
}

function approach(value, target, step) {
  if (value < target) return Math.min(value + step, target);
  if (value > target) return Math.max(value - step, target);
  return target;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = out[i];
    out[i] = out[j];
    out[j] = temp;
  }
  return out;
}

function rgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (state.phase !== "playing") return;
  state.rotationPointerId = event.pointerId;
  canvas.setPointerCapture?.(event.pointerId);
  setRotationInput(pointerRotationDirection(event));
});

canvas.addEventListener("pointermove", (event) => {
  if (state.rotationPointerId !== event.pointerId) return;
  event.preventDefault();
  setRotationInput(pointerRotationDirection(event));
});

canvas.addEventListener("pointerup", stopPointerRotation);
canvas.addEventListener("pointercancel", stopPointerRotation);
canvas.addEventListener("pointerleave", stopPointerRotation);

function pointerRotationDirection(event) {
  const rect = canvas.getBoundingClientRect();
  return event.clientX - rect.left >= rect.width / 2 ? 1 : -1;
}

function setRotationInput(direction) {
  if (!state || state.phase !== "playing") {
    if (state) state.rotationInput = 0;
    return;
  }

  const next = Math.sign(direction);
  if (state.rotationInput === next) return;
  state.rotationInput = next;

  if (next !== 0) {
    const t = tower();
    addRing(t.x, t.y, next > 0 ? "#ffd166" : "#6fd6ff", 8, 0.28);
    pulseToast(next > 0 ? "CLOCKWISE" : "COUNTER");
  }
}

function clearRotationInput() {
  state.rotationInput = 0;
  state.rotationVelocity = 0;
  state.rotationPointerId = null;
  for (const hero of state.heroes) hero.rotateT = 1;
}

function stopPointerRotation(event) {
  if (state.rotationPointerId !== event.pointerId) return;
  event.preventDefault();
  canvas.releasePointerCapture?.(event.pointerId);
  state.rotationPointerId = null;
  setRotationInput(0);
}

function rotationLabel() {
  if (state.rotationInput > 0 || state.rotationVelocity > 3) return "CW";
  if (state.rotationInput < 0 || state.rotationVelocity < -3) return "CCW";
  return "0";
}

function preventZoomGesture(event) {
  event.preventDefault();
}

let lastTouchEnd = 0;
document.addEventListener("gesturestart", preventZoomGesture, { passive: false });
document.addEventListener("gesturechange", preventZoomGesture, { passive: false });
document.addEventListener("gestureend", preventZoomGesture, { passive: false });
document.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length > 1) event.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  "touchend",
  (event) => {
    markUpgradePointerReleased();
    const now = Date.now();
    if (now - lastTouchEnd < 320) event.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false },
);
document.addEventListener("pointerup", markUpgradePointerReleased);
document.addEventListener("pointercancel", markUpgradePointerReleased);
document.addEventListener("dblclick", preventZoomGesture, { passive: false });
document.addEventListener("contextmenu", preventZoomGesture);

ui.restart.addEventListener("click", (event) => {
  event.stopPropagation();
  restart();
});

ui.resultButton.addEventListener("click", restart);
ui.rewardContinue.addEventListener("click", closeBossReward);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + width, y, x + width, y + height, r);
    this.arcTo(x + width, y + height, x, y + height, r);
    this.arcTo(x, y + height, x, y, r);
    this.arcTo(x, y, x + width, y, r);
    this.closePath();
    return this;
  };
}

resizeCanvas();
restart();
requestAnimationFrame((time) => {
  lastTime = time;
  requestAnimationFrame(loop);
});
