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
  upgradeChoices: document.getElementById("upgradeChoices"),
  resultOverlay: document.getElementById("resultOverlay"),
  resultEyebrow: document.getElementById("resultEyebrow"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  resultButton: document.getElementById("resultButton"),
  restart: document.getElementById("restartButton"),
};

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const HERO_ANGLES = [-90, 30, 150];
const POSITION_SECTOR_ANGLE = 120;
const ENEMY_SCALE = 0.72;
const VERSION_LABEL = "TRI-KEEPERS";

const HERO_BLUEPRINTS = [
  {
    id: "archer",
    name: "궁수",
    role: "장거리 관통",
    glyph: "궁",
    color: "#6fd6ff",
    glow: "rgba(111, 214, 255, 0.42)",
    damage: 26,
    range: 320,
    angle: 55,
    cooldown: 0.82,
    projectileSpeed: 560,
    pierce: 0,
    projectileCount: 1,
    ultimateEvery: 8,
  },
  {
    id: "warrior",
    name: "전사",
    role: "초근접 강타",
    glyph: "전",
    color: "#ff8d62",
    glow: "rgba(255, 141, 98, 0.42)",
    damage: 34,
    range: 118,
    angle: 95,
    cooldown: 0.92,
    targets: 1,
    towerBonus: 0,
    push: 0,
    ultimateEvery: 6,
  },
  {
    id: "mage",
    name: "마법사",
    role: "지연 광역",
    glyph: "마",
    color: "#c89bff",
    glow: "rgba(200, 155, 255, 0.42)",
    damage: 16,
    range: 260,
    angle: 80,
    cooldown: 1.15,
    blastRadius: 52,
    castDelay: 0.35,
    zoneDuration: 0,
    zoneDps: 7,
    chainCount: 0,
    ultimateEvery: 5,
  },
];

const WAVES = [
  [
    spawn(0.4, "top", 0.5, "grunt"),
    spawn(1.0, "left", 0.42, "grunt"),
    spawn(1.2, "right", 0.58, "grunt"),
    spawn(2.0, "top", 0.24, "runner"),
    spawn(2.2, "top", 0.76, "runner"),
    spawn(3.2, "bottom", 0.38, "grunt"),
    spawn(3.4, "bottom", 0.62, "grunt"),
    spawn(4.8, "left", 0.55, "grunt"),
  ],
  [
    spawn(0.2, "left", 0.22, "runner"),
    spawn(0.45, "left", 0.4, "runner"),
    spawn(0.8, "right", 0.74, "runner"),
    spawn(1.3, "top", 0.4, "grunt"),
    spawn(1.45, "top", 0.5, "grunt"),
    spawn(1.6, "top", 0.6, "grunt"),
    spawn(2.5, "bottom", 0.35, "grunt"),
    spawn(2.7, "bottom", 0.5, "grunt"),
    spawn(2.9, "bottom", 0.65, "grunt"),
    spawn(4.2, "right", 0.26, "runner"),
  ],
  [
    spawn(0.25, "right", 0.22, "tank"),
    spawn(0.85, "right", 0.36, "grunt"),
    spawn(1.2, "right", 0.5, "grunt"),
    spawn(1.7, "bottom", 0.45, "grunt"),
    spawn(1.9, "bottom", 0.55, "runner"),
    spawn(2.6, "top", 0.25, "grunt"),
    spawn(2.8, "top", 0.5, "grunt"),
    spawn(3.0, "top", 0.75, "grunt"),
    spawn(4.6, "left", 0.5, "tank"),
    spawn(5.2, "left", 0.34, "runner"),
  ],
  [
    spawn(0.15, "top", 0.16, "runner"),
    spawn(0.3, "top", 0.31, "runner"),
    spawn(0.45, "top", 0.46, "runner"),
    spawn(0.6, "top", 0.61, "runner"),
    spawn(0.75, "top", 0.76, "runner"),
    spawn(1.5, "left", 0.4, "grunt"),
    spawn(1.65, "right", 0.6, "grunt"),
    spawn(2.4, "bottom", 0.25, "tank"),
    spawn(2.6, "bottom", 0.75, "tank"),
    spawn(3.8, "left", 0.18, "runner"),
    spawn(4.0, "right", 0.82, "runner"),
    spawn(4.5, "bottom", 0.5, "grunt"),
  ],
  [
    spawn(0.25, "top", 0.5, "tank"),
    spawn(0.55, "left", 0.5, "grunt"),
    spawn(0.85, "right", 0.5, "grunt"),
    spawn(1.3, "bottom", 0.5, "runner"),
    spawn(1.8, "top", 0.25, "grunt"),
    spawn(2.0, "top", 0.75, "grunt"),
    spawn(2.7, "left", 0.28, "tank"),
    spawn(2.9, "right", 0.72, "tank"),
    spawn(3.8, "bottom", 0.33, "runner"),
    spawn(3.95, "bottom", 0.5, "runner"),
    spawn(4.1, "bottom", 0.67, "runner"),
    spawn(5.2, "top", 0.5, "brute"),
  ],
  [
    spawn(0.2, "left", 0.2, "runner"),
    spawn(0.35, "right", 0.8, "runner"),
    spawn(0.6, "top", 0.5, "tank"),
    spawn(0.95, "bottom", 0.5, "tank"),
    spawn(1.35, "top", 0.2, "grunt"),
    spawn(1.5, "top", 0.4, "grunt"),
    spawn(1.65, "top", 0.6, "grunt"),
    spawn(1.8, "top", 0.8, "grunt"),
    spawn(2.5, "left", 0.5, "brute"),
    spawn(3.1, "right", 0.5, "brute"),
    spawn(3.8, "bottom", 0.2, "runner"),
    spawn(3.95, "bottom", 0.4, "runner"),
    spawn(4.1, "bottom", 0.6, "runner"),
    spawn(4.25, "bottom", 0.8, "runner"),
  ],
];

const TYPES = {
  grunt: { hp: 52, speed: 18, radius: 11, damage: 6, attackInterval: 1.05, xp: 6, color: "#dc765e", core: "#ffcf7d" },
  runner: { hp: 34, speed: 31, radius: 9, damage: 5, attackInterval: 0.82, xp: 7, color: "#72d8ff", core: "#e7fbff" },
  tank: { hp: 132, speed: 12, radius: 14, damage: 13, attackInterval: 1.38, xp: 15, color: "#a88cff", core: "#f0d9ff" },
  brute: { hp: 205, speed: 10, radius: 16, damage: 18, attackInterval: 1.52, xp: 24, color: "#ff5f85", core: "#ffd6e0" },
};

const commonUpgrades = [
  {
    id: "tower_guard",
    meta: "공용",
    title: "석심 보강",
    text: "타워 최대 체력 +22, 즉시 22 회복",
    color: "#f7c85f",
    apply: () => {
      state.maxHp += 22;
      state.hp = Math.min(state.maxHp, state.hp + 22);
    },
  },
  {
    id: "combat_sense",
    meta: "공용",
    title: "전투 감각",
    text: "획득 경험치 +16%",
    color: "#87e6ff",
    apply: () => {
      state.xpBonus += 0.16;
    },
  },
  {
    id: "first_strike",
    meta: "공용",
    title: "재배치 일격",
    text: "로테이션 직후 각 캐릭터의 첫 공격 +35%",
    color: "#b4f17a",
    apply: () => {
      for (const hero of state.heroes) hero.firstStrike += 0.35;
    },
  },
  {
    id: "tower_pulse",
    meta: "공용",
    title: "수호 파동",
    text: "로테이션 한 바퀴마다 타워 주변에 작은 피해",
    color: "#ffe19a",
    apply: () => {
      state.rotationPulse += 1;
    },
  },
];

const heroUpgrades = [
  {
    id: "archer_range",
    heroId: "archer",
    tier: "기본",
    title: "장궁 숙련",
    text: "궁수 사거리 +36",
    canOffer: () => true,
    apply: (hero) => {
      hero.range += 36;
      hero.basicPicks += 1;
    },
  },
  {
    id: "archer_speed",
    heroId: "archer",
    tier: "기본",
    title: "빠른 장전",
    text: "궁수 공격 간격 -12%",
    canOffer: () => true,
    apply: (hero) => {
      hero.cooldown = Math.max(0.34, hero.cooldown * 0.88);
      hero.basicPicks += 1;
    },
  },
  {
    id: "archer_pierce",
    heroId: "archer",
    tier: "기본",
    title: "관통 화살",
    text: "궁수 화살 관통 +1",
    canOffer: () => true,
    apply: (hero) => {
      hero.pierce += 1;
      hero.basicPicks += 1;
    },
  },
  {
    id: "archer_break",
    heroId: "archer",
    tier: "돌파",
    title: "천공 연사",
    text: "궁수가 3발을 빠르게 연사하고, 각 화살이 추가 관통",
    canOffer: (hero) => hero.basicPicks >= 2 && !hero.breakthrough,
    apply: (hero) => {
      hero.breakthrough = true;
      hero.projectileCount = 3;
      hero.pierce += 1;
      state.shake = 0.5;
      addRing(tower().x, tower().y, hero.color, 14, 0.48);
    },
  },
  {
    id: "archer_ultimate",
    heroId: "archer",
    tier: "궁극",
    title: "별비 사격",
    text: "일정 공격마다 현재 방향에 화살비를 예고 후 투하",
    canOffer: (hero) => hero.breakthrough && !hero.ultimate && state.level >= 5,
    apply: (hero) => {
      hero.ultimate = true;
      hero.ultimateCharge = hero.ultimateEvery - 2;
      state.shake = 0.7;
      addRing(tower().x, tower().y, hero.color, 18, 0.56);
    },
  },
  {
    id: "warrior_sweep",
    heroId: "warrior",
    tier: "기본",
    title: "넓은 휩쓸기",
    text: "전사 기본 공격 타격 수 +1",
    canOffer: () => true,
    apply: (hero) => {
      hero.targets += 1;
      hero.basicPicks += 1;
    },
  },
  {
    id: "warrior_wall",
    heroId: "warrior",
    tier: "기본",
    title: "성벽 베기",
    text: "타워를 공격 중인 적에게 주는 피해 증가",
    canOffer: () => true,
    apply: (hero) => {
      hero.towerBonus += 0.38;
      hero.basicPicks += 1;
    },
  },
  {
    id: "warrior_push",
    heroId: "warrior",
    tier: "기본",
    title: "방패 밀치기",
    text: "전사 기본 공격이 적을 바깥으로 밀어냄",
    canOffer: () => true,
    apply: (hero) => {
      hero.push += 16;
      hero.basicPicks += 1;
    },
  },
  {
    id: "warrior_break",
    heroId: "warrior",
    tier: "돌파",
    title: "철벽 돌진",
    text: "전사 베기가 짧은 근접 충격파로 변해 적을 밀어냄",
    canOffer: (hero) => hero.basicPicks >= 2 && !hero.breakthrough,
    apply: (hero) => {
      hero.breakthrough = true;
      hero.targets += 1;
      hero.push += 14;
      hero.range += 12;
      state.shake = 0.5;
      addRing(tower().x, tower().y, hero.color, 14, 0.48);
    },
  },
  {
    id: "warrior_ultimate",
    heroId: "warrior",
    tier: "궁극",
    title: "성벽 분쇄",
    text: "일정 공격마다 현재 방향의 타워 근처 적에게 거대 충격파",
    canOffer: (hero) => hero.breakthrough && !hero.ultimate && state.level >= 5,
    apply: (hero) => {
      hero.ultimate = true;
      hero.ultimateCharge = hero.ultimateEvery - 2;
      state.shake = 0.7;
      addRing(tower().x, tower().y, hero.color, 18, 0.56);
    },
  },
  {
    id: "mage_radius",
    heroId: "mage",
    tier: "기본",
    title: "확산 마법진",
    text: "마법사 폭발 반경 +15",
    canOffer: () => true,
    apply: (hero) => {
      hero.blastRadius += 15;
      hero.basicPicks += 1;
    },
  },
  {
    id: "mage_speed",
    heroId: "mage",
    tier: "기본",
    title: "빠른 영창",
    text: "마법사 공격 간격 -13%",
    canOffer: () => true,
    apply: (hero) => {
      hero.cooldown = Math.max(0.48, hero.cooldown * 0.87);
      hero.basicPicks += 1;
    },
  },
  {
    id: "mage_zone",
    heroId: "mage",
    tier: "기본",
    title: "잔류 마력",
    text: "폭발 후 짧은 지속 피해 장판 생성",
    canOffer: () => true,
    apply: (hero) => {
      hero.zoneDuration += 0.9;
      hero.zoneDps += 2;
      hero.basicPicks += 1;
    },
  },
  {
    id: "mage_break",
    heroId: "mage",
    tier: "돌파",
    title: "균열 마법진",
    text: "폭발 후 가까운 적 최대 2명에게 보조 마법진 연쇄 생성",
    canOffer: (hero) => hero.basicPicks >= 2 && !hero.breakthrough,
    apply: (hero) => {
      hero.breakthrough = true;
      hero.chainCount = 2;
      hero.blastRadius += 8;
      state.shake = 0.5;
      addRing(tower().x, tower().y, hero.color, 14, 0.48);
    },
  },
  {
    id: "mage_ultimate",
    heroId: "mage",
    tier: "궁극",
    title: "대마법진 붕괴",
    text: "일정 공격마다 거대 마법진으로 큰 피해와 균열 장판 생성",
    canOffer: (hero) => hero.breakthrough && !hero.ultimate && state.level >= 5,
    apply: (hero) => {
      hero.ultimate = true;
      hero.ultimateCharge = hero.ultimateEvery - 2;
      state.shake = 0.7;
      addRing(tower().x, tower().y, hero.color, 18, 0.56);
    },
  },
];

let state;
let lastTime = 0;
let dpr = 1;
let cssWidth = 0;
let cssHeight = 0;
let toastTimer = 0;
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
    xpNeeded: 20,
    xpBonus: 0,
    level: 1,
    killCount: 0,
    shake: 0,
    waveBanner: 0,
    rotationQueue: 0,
    rotationCount: 0,
    rotationPulse: 0,
    enemies: [],
    projectiles: [],
    magicCircles: [],
    zones: [],
    skyStrikes: [],
    effects: [],
    particles: [],
    xpOrbs: [],
    floatingTexts: [],
    heroes: HERO_BLUEPRINTS.map(createHero),
  };
}

function createHero(blueprint, index) {
  return {
    ...blueprint,
    slot: index,
    fromSlot: index,
    toSlot: index,
    rotateT: 1,
    rotateDuration: 0.14,
    attackTimer: index * 0.18,
    basicPicks: 0,
    breakthrough: false,
    ultimate: false,
    ultimateCharge: 0,
    firstStrike: 0,
    firstStrikeReady: false,
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
    r: Math.min(cssWidth, cssHeight) * 0.045,
  };
}

function heroAim(hero) {
  const t = tower();
  if (hero.rotateT >= 1) {
    return { x: t.x, y: t.y, angle: HERO_ANGLES[hero.slot] };
  }

  const eased = easeInOut(hero.rotateT);
  const from = HERO_ANGLES[hero.fromSlot];
  const to = HERO_ANGLES[hero.toSlot];
  return {
    x: t.x,
    y: t.y,
    angle: lerpAngle(from, to, eased),
  };
}

function heroVisualPosition(hero, distance = 0) {
  const t = tower();
  const aim = heroAim(hero);
  const angle = aim.angle * DEG;
  const radius = t.r * 0.78 + distance;
  return {
    x: t.x + Math.cos(angle) * radius,
    y: t.y + Math.sin(angle) * radius,
    angle: aim.angle,
  };
}

function isRotating() {
  return state.heroes.some((hero) => hero.rotateT < 1);
}

function queueRotation() {
  if (state.phase !== "playing") return;
  if (isRotating()) {
    state.rotationQueue += 1;
    pulseToast("ROTATION x" + (state.rotationQueue + 1));
    return;
  }
  startRotation();
}

function startRotation() {
  for (const hero of state.heroes) {
    hero.fromSlot = hero.slot;
    hero.toSlot = (hero.slot + 1) % 3;
    hero.slot = hero.toSlot;
    hero.rotateT = 0;
    hero.attackTimer = Math.max(hero.attackTimer, hero.rotateDuration);
    hero.firstStrikeReady = hero.firstStrike > 0;
  }

  state.rotationCount += 1;
  const t = tower();
  addRing(t.x, t.y, "#ffd166", 8, 0.34);
  if (state.rotationPulse > 0 && state.rotationCount % 3 === 0) triggerRotationPulse();
}

function triggerRotationPulse() {
  const t = tower();
  const radius = t.r + 92;
  const damage = 10 + state.rotationPulse * 4;
  for (const enemy of [...state.enemies]) {
    const dist = Math.hypot(enemy.x - t.x, enemy.y - t.y);
    if (dist <= radius) hitEnemy(enemy, damage, { x: t.x, y: t.y, color: "#ffe19a" });
  }
  state.effects.push({ type: "shock", x: t.x, y: t.y, radius, color: "#ffe19a", life: 0.32, maxLife: 0.32 });
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
  let wasRotating = false;
  for (const hero of state.heroes) {
    if (hero.rotateT >= 1) continue;
    wasRotating = true;
    hero.rotateT += dt / hero.rotateDuration;
    if (hero.rotateT >= 1) hero.rotateT = 1;
  }

  if (wasRotating && !isRotating() && state.rotationQueue > 0) {
    state.rotationQueue -= 1;
    startRotation();
  }
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
  const pad = 9;
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

  const hp = type.hp + state.waveIndex * 9;
  state.enemies.push({
    id: enemyId,
    x,
    y,
    hp,
    maxHp: hp,
    speed: type.speed + state.waveIndex * 0.8,
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
  if (hero.id === "archer") return attackArcher(hero);
  if (hero.id === "warrior") return attackWarrior(hero);
  if (hero.id === "mage") return attackMage(hero);
  return false;
}

function attackArcher(hero) {
  const targets = findSectorTargets(hero, 1);
  if (!targets.length) return false;

  const aim = heroAim(hero);
  const target = targets[0];
  const baseAngle = Math.atan2(target.y - aim.y, target.x - aim.x);
  const attackAngle = baseAngle / DEG;
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
    angle: attackAngle,
    color: hero.color,
    life: 0.16,
    maxLife: 0.16,
  });

  chargeUltimate(hero, () => triggerArrowRain(hero, attackAngle));
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
    radius: clamp(3.4 + hero.angle * 0.028, 3.8, 7.2),
    color: hero.breakthrough ? "#9ee7ff" : hero.color,
    hitIds: [],
  });
}

function attackWarrior(hero) {
  const range = hero.range + (hero.breakthrough ? 12 : 0);
  const angle = hero.angle + (hero.breakthrough ? 8 : 0);
  const primaryTargets = findSectorTargets(hero, 1, range);
  if (!primaryTargets.length) return false;

  const aim = heroAim(hero);
  const primary = primaryTargets[0];
  const attackAngle = Math.atan2(primary.y - aim.y, primary.x - aim.x) / DEG;
  const targets = findArcTargets(aim.x, aim.y, range, attackAngle, angle, hero.targets);
  if (!targets.length) return false;

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
    angle: attackAngle,
    arc: angle,
    range,
    color: hero.color,
    heavy: hero.breakthrough,
    life: 0.18,
    maxLife: 0.18,
  });

  chargeUltimate(hero, () => triggerWarriorUltimate(hero, attackAngle));
  return true;
}

function attackMage(hero) {
  const targets = findSectorTargets(hero, 1);
  if (!targets.length) return false;

  const target = targets[0];
  const aim = heroAim(hero);
  const attackAngle = Math.atan2(target.y - aim.y, target.x - aim.x) / DEG;
  const damage = prepareHeroDamage(hero);
  addMagicCircle({
    x: target.x,
    y: target.y,
    radius: hero.blastRadius,
    delay: hero.castDelay,
    damage,
    color: hero.breakthrough ? "#dcb6ff" : hero.color,
    heroId: hero.id,
    angle: attackAngle,
    arc: hero.angle,
    range: hero.range,
    chainCount: hero.chainCount,
    zoneDuration: hero.zoneDuration,
    zoneDps: hero.zoneDps,
    big: false,
  });

  chargeUltimate(hero, () => triggerMageUltimate(hero, target, attackAngle));
  return true;
}

function prepareHeroDamage(hero) {
  let damage = hero.damage;
  if (hero.firstStrikeReady) {
    damage = Math.round(damage * (1 + hero.firstStrike));
    hero.firstStrikeReady = false;
  }
  return damage;
}

function chargeUltimate(hero, trigger) {
  if (!hero.ultimate) return;
  hero.ultimateCharge += 1;
  if (hero.ultimateCharge < hero.ultimateEvery) return;
  hero.ultimateCharge = 0;
  trigger();
}

function triggerArrowRain(hero, attackAngle = heroAim(hero).angle) {
  const aim = heroAim(hero);
  state.skyStrikes.push({
    heroId: hero.id,
    angle: attackAngle,
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
    angle: attackAngle,
    arc: hero.angle + 18,
    range: hero.range,
    color: hero.color,
    life: 0.38,
    maxLife: 0.38,
  });
}

function triggerWarriorUltimate(hero, attackAngle = heroAim(hero).angle) {
  const t = tower();
  const radius = t.r + 122;
  const targets = state.enemies.filter((enemy) => {
    const dx = enemy.x - t.x;
    const dy = enemy.y - t.y;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) return false;
    const enemyAngle = Math.atan2(dy, dx) / DEG;
    return Math.abs(angleDiff(enemyAngle, attackAngle)) <= hero.angle / 2;
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
    angle: attackAngle,
    arc: hero.angle,
    range: radius,
    color: hero.color,
    life: 0.42,
    maxLife: 0.42,
  });
  addBurst(t.x, t.y, hero.color, 24);
}

function triggerMageUltimate(hero, target, attackAngle = heroAim(hero).angle) {
  const t = tower();
  const fallbackDistance = Math.min(hero.range * 0.68, Math.min(cssWidth, cssHeight) * 0.31);
  const x = target ? target.x : t.x + Math.cos(attackAngle * DEG) * fallbackDistance;
  const y = target ? target.y : t.y + Math.sin(attackAngle * DEG) * fallbackDistance;

  addMagicCircle({
    x,
    y,
    radius: hero.blastRadius + 44,
    delay: 0.6,
    damage: Math.round(hero.damage * 3.3),
    color: "#e6c8ff",
    heroId: hero.id,
    angle: attackAngle,
    arc: hero.angle,
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

function findSectorTargets(hero, limit, rangeOverride) {
  const aim = heroAim(hero);
  const range = rangeOverride ?? hero.range;
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
    if (diff <= POSITION_SECTOR_ANGLE / 2) {
      candidates.push({
        enemy,
        danger: Math.hypot(enemy.x - t.x, enemy.y - t.y),
      });
    }
  }

  candidates.sort((a, b) => a.danger - b.danger);
  return candidates.slice(0, limit).map((item) => item.enemy);
}

function findArcTargets(x, y, range, centerAngle, arc, limit) {
  const t = tower();
  const candidates = [];
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) continue;
    const enemyAngle = Math.atan2(dy, dx) / DEG;
    if (Math.abs(angleDiff(enemyAngle, centerAngle)) <= arc / 2) {
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
  return Math.abs(angleDiff(enemyAngle, circle.angle)) <= (circle.arc ?? POSITION_SECTOR_ANGLE) / 2;
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
        arc: circle.arc,
        range: circle.range,
        chainCount: 0,
        zoneDuration: Math.min(0.7, circle.zoneDuration * 0.45),
        zoneDps: circle.zoneDps,
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
  enemy.dead = true;
  const idx = state.enemies.indexOf(enemy);
  if (idx >= 0) state.enemies.splice(idx, 1);
  state.killCount += 1;
  addBurst(enemy.x, enemy.y, enemy.color, 18);
  addXpOrb(enemy.x, enemy.y, enemy.xp);
}

function pushEnemyOutward(enemy, amount) {
  if (!enemy || enemy.dead || amount <= 0) return;
  const t = tower();
  const dx = enemy.x - t.x;
  const dy = enemy.y - t.y;
  const dist = Math.hypot(dx, dy) || 1;
  const resistance = enemy.type === "brute" ? 0.42 : enemy.type === "tank" ? 0.58 : 1;
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
    amount: Math.round(amount * (1 + state.xpBonus)),
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

function gainXp(amount) {
  state.xp += amount;
  if (state.xp >= state.xpNeeded && state.phase === "playing") {
    state.xp -= state.xpNeeded;
    state.level += 1;
    state.xpNeeded = Math.round(state.xpNeeded * 1.28 + 10);
    openUpgrade();
  }
}

function openUpgrade() {
  state.phase = "upgrade";
  ui.upgradeChoices.innerHTML = "";
  const choices = drawChoices(3);
  for (const choice of choices) {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.type = "button";
    button.style.setProperty("--choice-color", choice.color);
    button.innerHTML = `<span class="card-meta">${choice.meta}</span><strong>${choice.title}</strong><span>${choice.text}</span>`;
    button.addEventListener("click", () => {
      choice.apply();
      ui.upgradeOverlay.classList.add("hidden");
      state.phase = "playing";
      pulseToast(choice.title);
      syncUi();
    });
    ui.upgradeChoices.appendChild(button);
  }
  ui.upgradeOverlay.classList.remove("hidden");
  syncUi();
}

function drawChoices(count) {
  const out = [];
  const heroCandidates = heroUpgrades
    .map((upgrade) => {
      const hero = heroById(upgrade.heroId);
      return {
        ...upgrade,
        hero,
        meta: `${hero.name} ${upgrade.tier}`,
        color: hero.color,
        apply: () => upgrade.apply(hero),
      };
    })
    .filter((upgrade) => upgrade.canOffer(upgrade.hero));

  const highTier = heroCandidates.filter((upgrade) => upgrade.tier !== "기본");
  if (highTier.length) out.push(pick(highTier));

  while (out.length < Math.min(2, count) && heroCandidates.length) {
    const candidate = pick(heroCandidates);
    if (!out.some((choice) => choice.id === candidate.id)) out.push(candidate);
  }

  const common = commonUpgrades.filter((upgrade) => !out.some((choice) => choice.id === upgrade.id));
  if (out.length < count && common.length) {
    const selected = pick(common);
    out.push({
      ...selected,
      apply: selected.apply,
    });
  }

  while (out.length < count && heroCandidates.length) {
    const candidate = pick(heroCandidates);
    if (!out.some((choice) => choice.id === candidate.id)) out.push(candidate);
    else break;
  }

  return shuffle(out).slice(0, count);
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
      size: 2 + Math.random() * 3,
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
    const sectorStart = (p.angle - POSITION_SECTOR_ANGLE / 2) * DEG;
    const sectorEnd = (p.angle + POSITION_SECTOR_ANGLE / 2) * DEG;
    const start = (p.angle - hero.angle / 2) * DEG;
    const end = (p.angle + hero.angle / 2) * DEG;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sectorGrad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, hero.range);
    sectorGrad.addColorStop(0, rgba(hero.color, 0.08));
    sectorGrad.addColorStop(0.78, rgba(hero.color, 0.035));
    sectorGrad.addColorStop(1, rgba(hero.color, 0));
    ctx.fillStyle = sectorGrad;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, hero.range, sectorStart, sectorEnd);
    ctx.closePath();
    ctx.fill();

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
    ctx.arc(p.x, p.y, hero.range, sectorStart, sectorEnd);
    ctx.stroke();

    ctx.globalAlpha = hero.rotateT < 1 ? 0.34 : 0.68;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, hero.range, start, end);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSlots() {
  const t = tower();
  for (const hero of state.heroes) {
    const p = heroVisualPosition(hero, 8);
    const angle = p.angle * DEG;
    const inner = t.r + 7;
    const outer = t.r + 30;
    ctx.save();
    ctx.globalAlpha = hero.rotateT < 1 ? 0.38 : 0.82;
    ctx.strokeStyle = hero.color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(t.x + Math.cos(angle) * inner, t.y + Math.sin(angle) * inner);
    ctx.lineTo(t.x + Math.cos(angle) * outer, t.y + Math.sin(angle) * outer);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2, 0, TWO_PI);
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
  ctx.lineWidth = 2 + enemy.attackFlash * 2;
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
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#38445e";
  roundPoly(t.x, t.y, t.r * 1.42, 8, -Math.PI / 8);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f7c85f";
  roundPoly(t.x, t.y - t.r * 0.2, t.r * 0.82, 6, Math.PI / 6);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;
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
    const unit = Math.max(9, Math.min(cssWidth, cssHeight) * 0.029);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle * DEG + Math.PI / 2);

    ctx.fillStyle = rotating ? rgba(hero.color, 0.24) : rgba(hero.color, 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, unit * 1.4, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = "#151d2c";
    ctx.strokeStyle = hero.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-unit * 0.68, -unit * 0.5, unit * 1.36, unit * 1.28, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f7f1dc";
    ctx.beginPath();
    ctx.arc(0, -unit * 0.98, unit * 0.48, 0, TWO_PI);
    ctx.fill();

    ctx.strokeStyle = hero.color;
    ctx.lineWidth = hero.breakthrough ? 4 : 3;
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
    ctx.shadowBlur = 12;
    if (e.type === "runner") {
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

    const bw = e.radius * 2.2;
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(-bw / 2, -e.radius - 10, bw, 4);
    ctx.fillStyle = "#79e28e";
    ctx.fillRect(-bw / 2, -e.radius - 10, bw * Math.max(0, e.hp / e.maxHp), 4);
    ctx.restore();
    drawEnemyAttackLine(e);
  }
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.prevX, p.prevY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
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
    ctx.lineWidth = circle.big ? 3 : 2;
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
    ctx.lineWidth = 2;
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
      ctx.lineWidth = effect.heavy ? 9 : 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.range * (0.55 + (1 - a) * 0.45), start, end);
      ctx.stroke();
    } else if (effect.type === "shock") {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (0.48 + (1 - a) * 0.58), 0, TWO_PI);
      ctx.stroke();
    } else if (effect.type === "shield") {
      const start = (effect.angle - effect.arc / 2) * DEG;
      const end = (effect.angle + effect.arc / 2) * DEG;
      ctx.lineWidth = 8;
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
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (0.72 + (1 - a) * 0.28), 0, TWO_PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * 0.44, 0, TWO_PI);
      ctx.stroke();
    } else if (effect.type === "muzzle") {
      ctx.lineWidth = 3;
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
    ctx.lineWidth = 3;
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
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#85eeff";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 4.5, 0, TWO_PI);
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
  ui.speed.textContent = state.rotationQueue > 0 ? String(state.rotationQueue + 1) : "0";
  ui.range.textContent = String(state.killCount);
  renderTeamList();
}

function teamPower() {
  return state.heroes.reduce((sum, hero) => sum + hero.damage + hero.basicPicks * 3 + (hero.breakthrough ? 12 : 0) + (hero.ultimate ? 18 : 0), 0);
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
          <em>${aim}도 ${badges}</em>
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

function restart() {
  state = createState();
  ui.upgradeOverlay.classList.add("hidden");
  ui.resultOverlay.classList.add("hidden");
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

function easeInOut(t) {
  const v = clamp(t, 0, 1);
  return v * v * (3 - 2 * v);
}

function angleDiff(a, b) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

function lerpAngle(a, b, t) {
  return a + angleDiff(b, a) * t;
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
  queueRotation();
});

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
    const now = Date.now();
    if (now - lastTouchEnd < 320) event.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false },
);
document.addEventListener("dblclick", preventZoomGesture, { passive: false });
document.addEventListener("contextmenu", preventZoomGesture);

ui.restart.addEventListener("click", (event) => {
  event.stopPropagation();
  restart();
});

ui.resultButton.addEventListener("click", restart);
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
