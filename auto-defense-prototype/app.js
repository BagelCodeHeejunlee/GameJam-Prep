const ROWS = 7;
const COLS = 5;
const MAX_GATE = 30;
const MAX_WAVE = 6;
const TICK_MS = 180;

const elements = {
  board: document.querySelector("#board"),
  waveLabel: document.querySelector("#waveLabel"),
  gateLabel: document.querySelector("#gateLabel"),
  killLabel: document.querySelector("#killLabel"),
  gateGuardLabel: document.querySelector("#gateGuardLabel"),
  archerBuild: document.querySelector("#archerBuild"),
  warriorBuild: document.querySelector("#warriorBuild"),
  mageBuild: document.querySelector("#mageBuild"),
  upgradeChips: document.querySelector("#upgradeChips"),
  battleLog: document.querySelector("#battleLog"),
  rewardOverlay: document.querySelector("#rewardOverlay"),
  rewardChoices: document.querySelector("#rewardChoices"),
  resultOverlay: document.querySelector("#resultOverlay"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  restartButton: document.querySelector("#restartButton"),
  retryButton: document.querySelector("#retryButton"),
};

const enemyTypes = {
  grunt: { name: "졸개", label: "졸", className: "grunt", hp: 8, speed: 0.55, gateDamage: 1 },
  fast: { name: "돌격병", label: "돌", className: "fast", hp: 7, speed: 0.82, gateDamage: 2 },
  tank: { name: "방패병", label: "방", className: "tank", hp: 14, speed: 0.42, gateDamage: 2 },
  swarm: { name: "무리", label: "무", className: "swarm", hp: 5, speed: 0.68, gateDamage: 1 },
};

const upgradeCatalog = [
  {
    id: "archer-quick-shot",
    hero: "archer",
    tree: "공용",
    name: "빠른 사격",
    chips: ["궁수", "공속 +18%"],
    text: "궁수가 더 자주 공격한다.",
    apply(state) {
      state.heroes.archer.cooldown *= 0.82;
    },
  },
  {
    id: "archer-mark-arrow",
    hero: "archer",
    tree: "표식",
    name: "약점 표식",
    chips: ["궁수", "표식"],
    text: "궁수 공격이 표식을 남긴다.",
    apply(state) {
      state.heroes.archer.markOnHit += 1;
    },
  },
  {
    id: "archer-mark-hunt",
    hero: "archer",
    tree: "표식",
    name: "표식 사냥",
    chips: ["표식", "피해 +2"],
    text: "궁수가 표식 적에게 추가 피해를 준다.",
    apply(state) {
      state.heroes.archer.markBonus += 2;
    },
  },
  {
    id: "archer-repeat-shot",
    hero: "archer",
    tree: "연타",
    name: "연속 사격",
    chips: ["궁수", "연타 +1"],
    text: "궁수가 한 번 더 쏜다.",
    apply(state) {
      state.heroes.archer.shots += 1;
    },
  },
  {
    id: "archer-rhythm",
    hero: "archer",
    tree: "연타",
    name: "반복 리듬",
    chips: ["연타", "누적피해"],
    text: "같은 적을 다시 맞히면 피해가 오른다.",
    apply(state) {
      state.heroes.archer.repeatBonus += 1;
    },
  },
  {
    id: "archer-triple",
    hero: "archer",
    tree: "연타",
    name: "삼연사",
    chips: ["궁수", "연타 +2"],
    text: "궁수의 추가 탄이 크게 늘어난다.",
    apply(state) {
      state.heroes.archer.shots += 2;
    },
  },
  {
    id: "archer-trap",
    hero: "archer",
    tree: "함정",
    name: "공격 함정",
    chips: ["함정", "설치"],
    text: "위험한 줄에 함정을 설치한다.",
    apply(state) {
      state.heroes.archer.trapEnabled = true;
    },
  },
  {
    id: "archer-trap-tune",
    hero: "archer",
    tree: "함정",
    name: "함정 손질",
    chips: ["함정", "피해 +3"],
    text: "함정 피해가 증가한다.",
    apply(state) {
      state.heroes.archer.trapEnabled = true;
      state.heroes.archer.trapDamage += 3;
    },
  },
  {
    id: "archer-thorn-path",
    hero: "archer",
    tree: "함정",
    name: "가시 길목",
    chips: ["함정", "둔화"],
    text: "함정이 적을 느리게 한다.",
    apply(state) {
      state.heroes.archer.trapEnabled = true;
      state.heroes.archer.trapSlow = true;
    },
  },
  {
    id: "archer-chain-trap",
    hero: "archer",
    tree: "함정",
    name: "연쇄 함정",
    chips: ["함정", "주변피해"],
    text: "함정이 주변 적도 공격한다.",
    apply(state) {
      state.heroes.archer.trapEnabled = true;
      state.heroes.archer.trapChain = true;
    },
  },
  {
    id: "warrior-heavy-slash",
    hero: "warrior",
    tree: "공용",
    name: "강한 베기",
    chips: ["전사", "피해 +2"],
    text: "전사 기본 피해가 증가한다.",
    apply(state) {
      state.heroes.warrior.damage += 2;
    },
  },
  {
    id: "warrior-shield-push",
    hero: "warrior",
    tree: "돌진",
    name: "방패 밀치기",
    chips: ["전사", "밀침"],
    text: "전사가 주기적으로 적을 밀어낸다.",
    apply(state) {
      state.heroes.warrior.pushEnabled = true;
    },
  },
  {
    id: "warrior-breakthrough",
    hero: "warrior",
    tree: "돌진",
    name: "돌파",
    chips: ["밀침", "피해 +3"],
    text: "밀침 피해가 증가한다.",
    apply(state) {
      state.heroes.warrior.pushEnabled = true;
      state.heroes.warrior.pushDamage += 3;
    },
  },
  {
    id: "warrior-comet",
    hero: "warrior",
    tree: "돌진",
    name: "전장의 혜성",
    chips: ["돌진", "쿨감"],
    text: "밀침 발동이 빨라진다.",
    apply(state) {
      state.heroes.warrior.pushEnabled = true;
      state.heroes.warrior.pushCooldown *= 0.68;
    },
  },
  {
    id: "warrior-wide-cleave",
    hero: "warrior",
    tree: "범위 공격",
    name: "넓은 휩쓸기",
    chips: ["전사", "행공격"],
    text: "전사 공격이 같은 행에도 피해를 준다.",
    apply(state) {
      state.heroes.warrior.splash += 1;
    },
  },
  {
    id: "warrior-line-collapse",
    hero: "warrior",
    tree: "범위 공격",
    name: "전열 붕괴",
    chips: ["밀침", "주변피해"],
    text: "밀린 적 주변에 피해를 준다.",
    apply(state) {
      state.heroes.warrior.pushSplash = true;
    },
  },
  {
    id: "warrior-domination",
    hero: "warrior",
    tree: "범위 공격",
    name: "전장 장악",
    chips: ["범위", "피해 +1"],
    text: "전사의 범위 피해가 증가한다.",
    apply(state) {
      state.heroes.warrior.splashDamage += 1;
    },
  },
  {
    id: "warrior-blood-rhythm",
    hero: "warrior",
    tree: "광전",
    name: "피의 박자",
    chips: ["광전", "피해상승"],
    text: "성문 피해를 받을수록 전사가 강해진다.",
    apply(state) {
      state.heroes.warrior.berserkDamage += 0.45;
    },
  },
  {
    id: "warrior-berserk-stance",
    hero: "warrior",
    tree: "광전",
    name: "광전 태세",
    chips: ["광전", "공속"],
    text: "성문 체력이 낮으면 전사가 빨라진다.",
    apply(state) {
      state.heroes.warrior.berserkSpeed = true;
    },
  },
  {
    id: "warrior-blood-storm",
    hero: "warrior",
    tree: "광전",
    name: "피의 폭풍",
    chips: ["광전", "다중타격"],
    text: "전사가 일정 주기로 여러 번 공격한다.",
    apply(state) {
      state.heroes.warrior.stormEnabled = true;
    },
  },
  {
    id: "mage-stable",
    hero: "mage",
    tree: "공용",
    name: "안정된 마력",
    chips: ["마법", "피해 +2"],
    text: "마법사 기본 피해가 증가한다.",
    apply(state) {
      state.heroes.mage.damage += 2;
    },
  },
  {
    id: "mage-chain-bolt",
    hero: "mage",
    tree: "연쇄",
    name: "연쇄 마력탄",
    chips: ["연쇄", "전이"],
    text: "마법이 다른 적에게 전이된다.",
    apply(state) {
      state.heroes.mage.chain += 1;
    },
  },
  {
    id: "mage-triple-lightning",
    hero: "mage",
    tree: "연쇄",
    name: "세 갈래 번개",
    chips: ["연쇄", "+2"],
    text: "전이 횟수가 증가한다.",
    apply(state) {
      state.heroes.mage.chain += 2;
    },
  },
  {
    id: "mage-infinite-circuit",
    hero: "mage",
    tree: "연쇄",
    name: "무한 회로",
    chips: ["연쇄", "피해 +1"],
    text: "전이 피해가 증가한다.",
    apply(state) {
      state.heroes.mage.chainDamage += 1;
    },
  },
  {
    id: "mage-rune",
    hero: "mage",
    tree: "룬",
    name: "폭발 룬",
    chips: ["룬", "설치"],
    text: "위험한 줄에 룬을 설치한다.",
    apply(state) {
      state.heroes.mage.runeEnabled = true;
    },
  },
  {
    id: "mage-rune-tune",
    hero: "mage",
    tree: "룬",
    name: "룬 조율",
    chips: ["룬", "피해 +3"],
    text: "룬 피해가 증가한다.",
    apply(state) {
      state.heroes.mage.runeEnabled = true;
      state.heroes.mage.runeDamage += 3;
    },
  },
  {
    id: "mage-rune-chain",
    hero: "mage",
    tree: "룬",
    name: "룬 연동",
    chips: ["룬", "연쇄"],
    text: "룬이 발동하면 주변 룬도 발동한다.",
    apply(state) {
      state.heroes.mage.runeEnabled = true;
      state.heroes.mage.runeChain = true;
    },
  },
  {
    id: "mage-meteor",
    hero: "mage",
    tree: "운석",
    name: "운석 예고",
    chips: ["운석", "낙하"],
    text: "주기적으로 운석이 떨어진다.",
    apply(state) {
      state.heroes.mage.meteorEnabled = true;
    },
  },
  {
    id: "mage-shard-recovery",
    hero: "mage",
    tree: "운석",
    name: "파편 회수",
    chips: ["운석", "쿨감"],
    text: "운석 처치가 다음 운석을 앞당긴다.",
    apply(state) {
      state.heroes.mage.meteorEnabled = true;
      state.heroes.mage.meteorRefund = true;
    },
  },
  {
    id: "mage-sky-collapse",
    hero: "mage",
    tree: "운석",
    name: "하늘 붕괴",
    chips: ["운석", "범위 +1"],
    text: "운석 피해와 범위가 증가한다.",
    apply(state) {
      state.heroes.mage.meteorEnabled = true;
      state.heroes.mage.meteorDamage += 4;
      state.heroes.mage.meteorRadius = 2;
    },
  },
  {
    id: "party-mark-break",
    hero: "party",
    tree: "궁수+전사",
    name: "표식 돌파",
    chips: ["표식", "밀침"],
    text: "전사가 표식 적을 밀면 추가 피해.",
    apply(state) {
      state.synergy.markPush = true;
    },
  },
  {
    id: "party-mark-conduct",
    hero: "party",
    tree: "궁수+마법사",
    name: "표식 전도",
    chips: ["표식", "연쇄"],
    text: "마법 연쇄가 표식을 복사한다.",
    apply(state) {
      state.synergy.markConduct = true;
    },
  },
  {
    id: "party-burning-trap",
    hero: "party",
    tree: "궁수+마법사",
    name: "불타는 함정",
    chips: ["함정", "화상"],
    text: "함정이 화상을 남긴다.",
    apply(state) {
      state.synergy.burningTrap = true;
    },
  },
  {
    id: "party-collision-burst",
    hero: "party",
    tree: "전사+마법사",
    name: "충돌 폭발",
    chips: ["밀침", "폭발"],
    text: "밀린 적에게 마법 폭발.",
    apply(state) {
      state.synergy.collisionBurst = true;
    },
  },
  {
    id: "party-front-hunt",
    hero: "party",
    tree: "궁수+전사",
    name: "전선 사냥",
    chips: ["성문", "추가사격"],
    text: "성문 가까운 표식 적에게 추가 사격.",
    apply(state) {
      state.synergy.frontHunt = true;
    },
  },
  {
    id: "party-rune-shield",
    hero: "party",
    tree: "전사+마법사",
    name: "룬 방패",
    chips: ["밀침", "룬"],
    text: "전사 밀침 지점에 룬 생성.",
    apply(state) {
      state.synergy.runeShield = true;
      state.heroes.mage.runeEnabled = true;
    },
  },
  {
    id: "party-encircle",
    hero: "party",
    tree: "3인",
    name: "완성된 포위",
    chips: ["3인", "폭발"],
    text: "표식/밀침/마법이 겹치면 폭발.",
    apply(state) {
      state.synergy.encircle = true;
    },
  },
];

let state;
let loopId = 0;
let enemySeq = 0;

function newRun() {
  stopLoop();
  enemySeq = 0;
  state = {
    wave: 1,
    gate: MAX_GATE,
    kills: 0,
    spawned: 0,
    waveTarget: 9,
    spawnTimer: 0,
    moveTimer: 0,
    running: true,
    rewardPending: false,
    finished: false,
    enemies: [],
    traps: [],
    runes: [],
    meteors: [],
    log: ["자동 방어 시작"],
    ownedUpgrades: [],
    rewardChoices: [],
    heroes: createHeroes(),
    synergy: {},
  };
  spawnEnemy("grunt");
  spawnEnemy("fast");
  render();
  startLoop();
}

function createHeroes() {
  return {
    archer: {
      damage: 3,
      cooldown: 780,
      timer: 180,
      shots: 1,
      markOnHit: 0,
      markBonus: 0,
      repeatBonus: 0,
      lastTargetId: "",
      trapEnabled: false,
      trapCooldown: 4400,
      trapTimer: 1400,
      trapDamage: 4,
      trapSlow: false,
      trapChain: false,
    },
    warrior: {
      damage: 4,
      cooldown: 1040,
      timer: 280,
      pushEnabled: false,
      pushCooldown: 3900,
      pushTimer: 1200,
      pushDamage: 2,
      pushDistance: 1,
      splash: 0,
      splashDamage: 1,
      pushSplash: false,
      berserkDamage: 0,
      berserkSpeed: false,
      stormEnabled: false,
      stormCooldown: 5600,
      stormTimer: 2600,
    },
    mage: {
      damage: 3,
      cooldown: 1160,
      timer: 460,
      chain: 0,
      chainDamage: 1,
      runeEnabled: false,
      runeCooldown: 5200,
      runeTimer: 1800,
      runeDamage: 4,
      runeChain: false,
      meteorEnabled: false,
      meteorCooldown: 7800,
      meteorTimer: 2200,
      meteorDamage: 7,
      meteorRadius: 1,
      meteorRefund: false,
    },
  };
}

function startLoop() {
  loopId = window.setInterval(() => tick(TICK_MS), TICK_MS);
}

function stopLoop() {
  if (loopId) window.clearInterval(loopId);
  loopId = 0;
}

function tick(dt) {
  if (!state?.running || state.rewardPending || state.finished) return;
  state.spawnTimer -= dt;
  state.moveTimer -= dt;
  tickHero("archer", dt, archerAction);
  tickHero("warrior", dt, warriorAction);
  tickHero("mage", dt, mageAction);
  tickSpecials(dt);
  if (state.moveTimer <= 0) {
    state.moveTimer += 760;
    moveEnemies();
  }
  if (state.spawned < state.waveTarget && state.spawnTimer <= 0) {
    state.spawnTimer += Math.max(520, 1300 - state.wave * 85);
    spawnEnemyForWave();
  }
  resolveBurn();
  cleanup();
  if (state.gate <= 0) {
    finishRun(false);
  } else if (state.spawned >= state.waveTarget && !state.enemies.length) {
    clearWave();
  }
  render();
}

function tickHero(heroId, dt, action) {
  const hero = state.heroes[heroId];
  hero.timer -= dt;
  if (hero.timer > 0) return;
  hero.timer += effectiveCooldown(heroId);
  action();
}

function effectiveCooldown(heroId) {
  if (heroId !== "warrior" || !state.heroes.warrior.berserkSpeed) return state.heroes[heroId].cooldown;
  const lostRatio = 1 - state.gate / MAX_GATE;
  return state.heroes.warrior.cooldown * (1 - lostRatio * 0.38);
}

function archerAction() {
  const hero = state.heroes.archer;
  for (let shot = 0; shot < hero.shots; shot += 1) {
    const target = markedEnemy() ?? dangerousEnemy();
    if (!target) return;
    let damage = hero.damage + (target.mark ?? 0) * hero.markBonus;
    if (hero.lastTargetId === target.id) damage += hero.repeatBonus;
    hero.lastTargetId = target.id;
    hitEnemy(target, damage, "궁수");
    const live = enemyById(target.id);
    if (live) live.mark = (live.mark ?? 0) + hero.markOnHit;
  }
  if (state.synergy.frontHunt) {
    const target = state.enemies.filter((enemy) => enemy.mark > 0 && enemy.row >= ROWS - 3).sort((a, b) => b.row - a.row)[0];
    if (target) hitEnemy(target, 2, "전선 사냥");
  }
}

function warriorAction() {
  const hero = state.heroes.warrior;
  const target = closestEnemy();
  if (!target) return;
  hitEnemy(target, warriorDamage(), "전사");
  const live = enemyById(target.id);
  if (live && hero.splash > 0) {
    enemiesInRow(live.row)
      .filter((enemy) => enemy.id !== live.id)
      .slice(0, hero.splash)
      .forEach((enemy) => hitEnemy(enemy, hero.splashDamage, "휩쓸기"));
  }
}

function warriorDamage() {
  const hero = state.heroes.warrior;
  const lostRatio = 1 - state.gate / MAX_GATE;
  return Math.round(hero.damage * (1 + lostRatio * hero.berserkDamage));
}

function mageAction() {
  const hero = state.heroes.mage;
  const target = densestEnemy() ?? dangerousEnemy();
  if (!target) return;
  hitEnemy(target, hero.damage, "마법사");
  const bounced = new Set([target.id]);
  for (let index = 0; index < hero.chain; index += 1) {
    const next = state.enemies
      .filter((enemy) => !bounced.has(enemy.id))
      .sort((a, b) => scoreEnemy(b) - scoreEnemy(a))[0];
    if (!next) break;
    bounced.add(next.id);
    if (state.synergy.markConduct && target.mark > 0) next.mark = (next.mark ?? 0) + 1;
    hitEnemy(next, hero.chainDamage, "연쇄");
  }
}

function tickSpecials(dt) {
  tickArcherTrap(dt);
  tickWarriorPush(dt);
  tickWarriorStorm(dt);
  tickMageRune(dt);
  tickMageMeteor(dt);
}

function tickArcherTrap(dt) {
  const hero = state.heroes.archer;
  if (!hero.trapEnabled) return;
  hero.trapTimer -= dt;
  if (hero.trapTimer > 0) return;
  hero.trapTimer += hero.trapCooldown;
  const col = dangerousColumn();
  if (col < 0) return;
  placeTrap(col, Math.max(1, ROWS - 3));
  log("궁수 함정");
}

function tickWarriorPush(dt) {
  const hero = state.heroes.warrior;
  if (!hero.pushEnabled) return;
  hero.pushTimer -= dt;
  if (hero.pushTimer > 0) return;
  hero.pushTimer += hero.pushCooldown;
  const target = closestEnemy();
  if (!target) return;
  hitEnemy(target, hero.pushDamage, "전사 돌진");
  pushEnemy(target);
}

function tickWarriorStorm(dt) {
  const hero = state.heroes.warrior;
  if (!hero.stormEnabled) return;
  hero.stormTimer -= dt;
  if (hero.stormTimer > 0) return;
  hero.stormTimer += hero.stormCooldown;
  state.enemies
    .sort((a, b) => scoreEnemy(b) - scoreEnemy(a))
    .slice(0, 4)
    .forEach((enemy) => hitEnemy(enemy, Math.max(1, Math.round(warriorDamage() * 0.7)), "피의 폭풍"));
  log("전사 피의 폭풍");
}

function tickMageRune(dt) {
  const hero = state.heroes.mage;
  if (!hero.runeEnabled) return;
  hero.runeTimer -= dt;
  if (hero.runeTimer > 0) return;
  hero.runeTimer += hero.runeCooldown;
  const col = dangerousColumn();
  if (col < 0) return;
  placeRune(col, Math.max(1, ROWS - 4));
  log("마법사 룬");
}

function tickMageMeteor(dt) {
  const hero = state.heroes.mage;
  if (!hero.meteorEnabled) return;
  hero.meteorTimer -= dt;
  if (hero.meteorTimer > 0) return;
  hero.meteorTimer += hero.meteorCooldown;
  const target = densestEnemy() ?? dangerousEnemy();
  if (!target) return;
  state.meteors.push({ col: target.col, row: target.row, life: 360 });
  enemiesAround(target.col, target.row, hero.meteorRadius).forEach((enemy) => {
    const died = hitEnemy(enemy, hero.meteorDamage, "운석");
    if (died && hero.meteorRefund) hero.meteorTimer -= 900;
  });
  log("마법사 운석");
}

function spawnEnemyForWave() {
  const roll = Math.random();
  if (state.wave >= 5 && roll < 0.18) spawnEnemy("tank");
  else if (state.wave >= 4 && roll < 0.36) spawnEnemy("swarm");
  else if (state.wave >= 2 && roll < 0.62) spawnEnemy("fast");
  else spawnEnemy("grunt");
}

function spawnEnemy(typeId) {
  const open = range(COLS).filter((col) => !enemyAt(col, 0));
  if (!open.length) {
    state.gate -= 1;
    return;
  }
  const type = enemyTypes[typeId];
  const col = open[Math.floor(Math.random() * open.length)];
  const maxHp = type.hp + Math.floor(state.wave * 1.7);
  state.enemies.push({
    id: `enemy-${enemySeq++}`,
    type: typeId,
    col,
    row: 0,
    progress: 0,
    hp: maxHp,
    maxHp,
    mark: 0,
    burn: 0,
    slow: 0,
  });
  state.spawned += 1;
}

function moveEnemies() {
  state.enemies
    .sort((a, b) => b.row - a.row)
    .forEach((enemy) => {
      const type = enemyTypes[enemy.type];
      const speed = Math.max(0.25, type.speed - (enemy.slow ?? 0));
      enemy.progress += speed;
      enemy.slow = 0;
      while (enemy.progress >= 1) {
        enemy.progress -= 1;
        if (!moveEnemyDown(enemy)) break;
      }
    });
}

function moveEnemyDown(enemy) {
  if (!enemyById(enemy.id)) return false;
  const nextRow = enemy.row + 1;
  if (nextRow >= ROWS) {
    breach(enemy);
    return false;
  }
  if (enemyAt(enemy.col, nextRow)) return false;
  enemy.row = nextRow;
  triggerTiles(enemy);
  return true;
}

function breach(enemy) {
  const type = enemyTypes[enemy.type];
  state.gate -= type.gateDamage;
  removeEnemy(enemy.id);
  log(`${type.name} 돌파`);
}

function placeTrap(col, row) {
  state.traps = state.traps.filter((trap) => !(trap.col === col && trap.row === row));
  state.traps.push({ col, row, damage: state.heroes.archer.trapDamage });
}

function placeRune(col, row) {
  state.runes = state.runes.filter((rune) => !(rune.col === col && rune.row === row));
  state.runes.push({ col, row, damage: state.heroes.mage.runeDamage });
}

function triggerTiles(enemy) {
  const trap = state.traps.find((item) => item.col === enemy.col && item.row === enemy.row);
  if (trap) {
    state.traps = state.traps.filter((item) => item !== trap);
    hitEnemy(enemy, trap.damage, "함정");
    if (state.synergy.burningTrap) enemy.burn = (enemy.burn ?? 0) + 1;
    if (state.heroes.archer.trapSlow) enemy.slow += 0.45;
    if (state.heroes.archer.trapChain) enemiesAround(enemy.col, enemy.row, 1).forEach((target) => {
      if (target.id !== enemy.id) hitEnemy(target, 2, "연쇄 함정");
    });
  }
  const rune = state.runes.find((item) => item.col === enemy.col && item.row === enemy.row);
  if (rune) {
    triggerRune(rune);
  }
}

function triggerRune(rune) {
  state.runes = state.runes.filter((item) => item !== rune);
  enemiesAround(rune.col, rune.row, 1).forEach((enemy) => hitEnemy(enemy, rune.damage, "룬"));
  if (state.heroes.mage.runeChain) {
    const nearby = [...state.runes].filter((item) => Math.abs(item.col - rune.col) + Math.abs(item.row - rune.row) <= 1);
    nearby.forEach((item) => triggerRune(item));
  }
}

function pushEnemy(enemy) {
  const target = enemyById(enemy.id);
  if (!target) return;
  const nextRow = Math.max(0, target.row - state.heroes.warrior.pushDistance);
  if (!enemyAt(target.col, nextRow)) target.row = nextRow;
  if (state.synergy.markPush && target.mark > 0) hitEnemy(target, 3, "표식 돌파");
  if (state.heroes.warrior.pushSplash) enemiesAround(target.col, target.row, 1).forEach((enemy) => {
    if (enemy.id !== target.id) hitEnemy(enemy, 2, "전열 붕괴");
  });
  if (state.synergy.collisionBurst) enemiesAround(target.col, target.row, 1).forEach((enemy) => hitEnemy(enemy, 2, "충돌 폭발"));
  if (state.synergy.runeShield) placeRune(target.col, target.row);
  if (state.synergy.encircle && target.mark > 0) hitEnemy(target, 4, "포위 폭발");
}

function resolveBurn() {
  state.enemies.forEach((enemy) => {
    if (enemy.burn > 0) hitEnemy(enemy, enemy.burn, "화상");
  });
}

function hitEnemy(enemy, damage, source) {
  const target = enemyById(enemy.id);
  if (!target) return false;
  target.hp -= Math.max(1, Math.round(damage));
  if (target.hp > 0) return false;
  removeEnemy(target.id);
  state.kills += 1;
  log(`${source} 처치`);
  return true;
}

function clearWave() {
  if (state.wave >= MAX_WAVE) {
    finishRun(true);
    return;
  }
  state.running = false;
  state.rewardPending = true;
  state.rewardChoices = drawRewards();
  render();
}

function pickReward(id) {
  const reward = state.rewardChoices.find((item) => item.id === id);
  if (!reward) return;
  reward.apply(state);
  state.ownedUpgrades.push(reward.id);
  log(`선택: ${reward.name}`);
  state.wave += 1;
  state.spawned = 0;
  state.waveTarget = 8 + state.wave * 3;
  state.spawnTimer = 0;
  state.moveTimer = 0;
  state.rewardPending = false;
  state.rewardChoices = [];
  state.running = true;
  state.gate = Math.min(MAX_GATE, state.gate + 4);
  spawnEnemyForWave();
  render();
}

function drawRewards() {
  const owned = new Set(state.ownedUpgrades);
  const available = upgradeCatalog.filter((item) => !owned.has(item.id));
  const heroMix = [
    ...shuffle(available.filter((item) => item.hero === "archer")).slice(0, 1),
    ...shuffle(available.filter((item) => item.hero === "warrior")).slice(0, 1),
    ...shuffle(available.filter((item) => item.hero === "mage")).slice(0, 1),
    ...shuffle(available.filter((item) => item.hero === "party")).slice(0, 2),
  ];
  return shuffle(heroMix).slice(0, 3);
}

function finishRun(win) {
  state.finished = true;
  state.running = false;
  state.rewardPending = false;
  stopLoop();
  render();
  elements.resultOverlay.classList.remove("hidden");
  elements.resultTitle.textContent = win ? "방어 성공" : "성문 붕괴";
  elements.resultText.textContent = win
    ? `${MAX_WAVE}웨이브 방어 · 처치 ${state.kills}`
    : `${state.wave}웨이브에서 붕괴 · 처치 ${state.kills}`;
}

function cleanup() {
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  state.meteors.forEach((meteor) => { meteor.life -= TICK_MS; });
  state.meteors = state.meteors.filter((meteor) => meteor.life > 0);
}

function render() {
  renderHud();
  renderBoard();
  renderParty();
  renderUpgrades();
  renderRewards();
}

function renderHud() {
  elements.waveLabel.textContent = `${state.wave}/${MAX_WAVE}`;
  elements.gateLabel.textContent = Math.max(0, state.gate);
  elements.killLabel.textContent = state.kills;
  elements.gateGuardLabel.textContent = state.gate > 12 ? "방어선 유지" : "위험";
}

function renderBoard() {
  elements.board.innerHTML = "";
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = document.createElement("div");
      cell.className = `cell ${row >= ROWS - 2 ? "threat" : ""}`;
      const enemy = enemyAt(col, row);
      const trap = state.traps.find((item) => item.col === col && item.row === row);
      const rune = state.runes.find((item) => item.col === col && item.row === row);
      const meteor = state.meteors.find((item) => item.col === col && item.row === row);
      if (enemy) cell.append(renderEnemy(enemy));
      if (trap) cell.append(token("trap", "함"));
      if (rune) cell.append(token("rune", "룬"));
      if (meteor) cell.append(token("meteor", "운"));
      elements.board.append(cell);
    }
  }
}

function renderEnemy(enemy) {
  const type = enemyTypes[enemy.type];
  const node = document.createElement("article");
  node.className = `enemy ${type.className}`;
  node.innerHTML = `
    <span class="symbol">${type.label}</span>
    <strong class="hp">${Math.max(0, Math.ceil(enemy.hp))}</strong>
    <div class="badges">${enemyBadges(enemy)}</div>
  `;
  return node;
}

function enemyBadges(enemy) {
  const badges = [];
  if (enemy.mark > 0) badges.push(`<span class="badge">표${enemy.mark}</span>`);
  if (enemy.burn > 0) badges.push(`<span class="badge">화${enemy.burn}</span>`);
  if (enemy.slow > 0) badges.push(`<span class="badge">감</span>`);
  return badges.join("");
}

function token(className, text) {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

function renderParty() {
  elements.archerBuild.textContent = archerBuildLabel();
  elements.warriorBuild.textContent = warriorBuildLabel();
  elements.mageBuild.textContent = mageBuildLabel();
}

function archerBuildLabel() {
  const hero = state.heroes.archer;
  return [`연타 ${hero.shots}`, hero.trapEnabled ? "함정" : "", hero.markOnHit ? "표식" : ""].filter(Boolean).join(" · ");
}

function warriorBuildLabel() {
  const hero = state.heroes.warrior;
  return [hero.pushEnabled ? "돌진" : "베기", hero.splash ? "범위" : "", hero.berserkDamage || hero.berserkSpeed ? "광전" : ""].filter(Boolean).join(" · ");
}

function mageBuildLabel() {
  const hero = state.heroes.mage;
  return [hero.chain ? `연쇄 ${hero.chain}` : "마력", hero.runeEnabled ? "룬" : "", hero.meteorEnabled ? "운석" : ""].filter(Boolean).join(" · ");
}

function renderUpgrades() {
  elements.upgradeChips.innerHTML = "";
  if (!state.ownedUpgrades.length) {
    elements.upgradeChips.append(chip("업그레이드 없음"));
  } else {
    state.ownedUpgrades.slice(-8).forEach((id) => {
      const reward = upgradeCatalog.find((item) => item.id === id);
      if (reward) elements.upgradeChips.append(chip(reward.name));
    });
  }
  elements.battleLog.textContent = state.log.slice(-3).join(" · ");
}

function chip(text) {
  const node = document.createElement("span");
  node.className = "chip";
  node.textContent = text;
  return node;
}

function renderRewards() {
  elements.rewardOverlay.classList.toggle("hidden", !state.rewardPending);
  if (!state.rewardPending) return;
  elements.rewardChoices.innerHTML = "";
  state.rewardChoices.forEach((reward) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `reward-choice ${reward.hero}`;
    button.innerHTML = `
      <strong>${reward.name}</strong>
      <div class="chips">${reward.chips.map((item) => `<span class="chip">${item}</span>`).join("")}</div>
      <p>${reward.tree} · ${reward.text}</p>
    `;
    button.addEventListener("click", () => pickReward(reward.id));
    elements.rewardChoices.append(button);
  });
}

function log(message) {
  state.log.push(message);
  if (state.log.length > 8) state.log.shift();
}

function enemyAt(col, row) {
  return state.enemies.find((enemy) => enemy.col === col && enemy.row === row) ?? null;
}

function enemyById(id) {
  return state.enemies.find((enemy) => enemy.id === id) ?? null;
}

function removeEnemy(id) {
  state.enemies = state.enemies.filter((enemy) => enemy.id !== id);
}

function closestEnemy() {
  return state.enemies.sort((a, b) => scoreEnemy(b) - scoreEnemy(a))[0] ?? null;
}

function dangerousEnemy() {
  return state.enemies.sort((a, b) => scoreEnemy(b) - scoreEnemy(a))[0] ?? null;
}

function markedEnemy() {
  return state.enemies.filter((enemy) => enemy.mark > 0).sort((a, b) => b.mark - a.mark || scoreEnemy(b) - scoreEnemy(a))[0] ?? null;
}

function densestEnemy() {
  const col = dangerousColumn();
  if (col < 0) return null;
  return state.enemies.filter((enemy) => enemy.col === col).sort((a, b) => b.row - a.row)[0] ?? null;
}

function dangerousColumn() {
  let bestCol = -1;
  let bestScore = -1;
  for (let col = 0; col < COLS; col += 1) {
    const score = state.enemies
      .filter((enemy) => enemy.col === col)
      .reduce((sum, enemy) => sum + scoreEnemy(enemy), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }
  return bestScore > 0 ? bestCol : -1;
}

function enemiesInRow(row) {
  return state.enemies.filter((enemy) => enemy.row === row);
}

function enemiesAround(col, row, radius) {
  return state.enemies.filter((enemy) => Math.abs(enemy.col - col) + Math.abs(enemy.row - row) <= radius);
}

function scoreEnemy(enemy) {
  const type = enemyTypes[enemy.type];
  return enemy.row * 12 + type.speed * 8 + type.gateDamage * 5 + (enemy.mark ?? 0) * 2 - enemy.hp * 0.15;
}

function range(count) {
  return Array.from({ length: count }, (_, index) => index);
}

function shuffle(items) {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [array[index], array[target]] = [array[target], array[index]];
  }
  return array;
}

elements.restartButton.addEventListener("click", newRun);
elements.retryButton.addEventListener("click", () => {
  elements.resultOverlay.classList.add("hidden");
  newRun();
});

newRun();
