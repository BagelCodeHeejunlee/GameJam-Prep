const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const touchSurface = document.querySelector("#touchSurface");
const joystick = document.querySelector("#joystick");
const stick = document.querySelector("#stick");

const ui = {
  startOverlay: document.querySelector("#startOverlay"),
  upgradeOverlay: document.querySelector("#upgradeOverlay"),
  gameOverOverlay: document.querySelector("#gameOverOverlay"),
  startButton: document.querySelector("#startButton"),
  againButton: document.querySelector("#againButton"),
  restartButton: document.querySelector("#restartButton"),
  upgradeChoices: document.querySelector("#upgradeChoices"),
  coreBar: document.querySelector("#coreBar"),
  heroBar: document.querySelector("#heroBar"),
  xpBar: document.querySelector("#xpBar"),
  coreText: document.querySelector("#coreText"),
  heroText: document.querySelector("#heroText"),
  waveText: document.querySelector("#waveText"),
  levelText: document.querySelector("#levelText"),
  timerText: document.querySelector("#timerText"),
  killText: document.querySelector("#killText"),
  perkList: document.querySelector("#perkList"),
  buildTitle: document.querySelector("#buildTitle"),
  buildText: document.querySelector("#buildText"),
  gameOverTitle: document.querySelector("#gameOverTitle"),
  gameOverText: document.querySelector("#gameOverText")
};

const keys = new Set();
const pointer = {
  active: false,
  id: null,
  originX: 0,
  originY: 0,
  x: 0,
  y: 0
};

const upgradePool = [
  {
    id: "rapid",
    icon: "속",
    name: "속사 모듈",
    text: "자동 사격 간격이 짧아진다.",
    apply: (s) => {
      s.stats.fireDelay = Math.max(0.13, s.stats.fireDelay * 0.84);
      s.perks.rapid = (s.perks.rapid || 0) + 1;
    }
  },
  {
    id: "damage",
    icon: "탄",
    name: "고압 탄환",
    text: "탄환 피해가 증가한다.",
    apply: (s) => {
      s.stats.damage += 5;
      s.perks.damage = (s.perks.damage || 0) + 1;
    }
  },
  {
    id: "multi",
    icon: "쌍",
    name: "쌍열 발사",
    text: "한 번에 발사하는 탄환이 늘어난다.",
    apply: (s) => {
      s.stats.projectiles = Math.min(5, s.stats.projectiles + 1);
      s.perks.multi = (s.perks.multi || 0) + 1;
    }
  },
  {
    id: "pierce",
    icon: "관",
    name: "관통 화살",
    text: "탄환이 적을 더 뚫고 지나간다.",
    apply: (s) => {
      s.stats.pierce += 1;
      s.perks.pierce = (s.perks.pierce || 0) + 1;
    }
  },
  {
    id: "orb",
    icon: "궤",
    name: "수호 궤도검",
    text: "주위를 도는 검이 근접한 적을 베어낸다.",
    apply: (s) => {
      s.stats.orbs = Math.min(5, s.stats.orbs + 1);
      s.perks.orb = (s.perks.orb || 0) + 1;
    }
  },
  {
    id: "turret",
    icon: "탑",
    name: "코어 포탑",
    text: "코어가 가장 가까운 적을 자동 공격한다.",
    apply: (s) => {
      s.stats.turrets = Math.min(4, s.stats.turrets + 1);
      s.perks.turret = (s.perks.turret || 0) + 1;
    }
  },
  {
    id: "frost",
    icon: "냉",
    name: "냉기장",
    text: "주변 적을 느리게 만들고 지속 피해를 준다.",
    apply: (s) => {
      s.stats.frost += 1;
      s.perks.frost = (s.perks.frost || 0) + 1;
    }
  },
  {
    id: "repair",
    icon: "수",
    name: "긴급 수리",
    text: "영웅과 코어 체력이 회복되고 최대치가 오른다.",
    apply: (s) => {
      s.player.maxHp += 18;
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + 42);
      s.core.maxHp += 22;
      s.core.hp = Math.min(s.core.maxHp, s.core.hp + 48);
      s.perks.repair = (s.perks.repair || 0) + 1;
    }
  },
  {
    id: "magnet",
    icon: "흡",
    name: "경험치 자석",
    text: "경험치 코어를 더 먼 거리에서 끌어당긴다.",
    apply: (s) => {
      s.stats.magnet += 55;
      s.perks.magnet = (s.perks.magnet || 0) + 1;
    }
  },
  {
    id: "speed",
    icon: "신",
    name: "기동 부츠",
    text: "이동 속도가 오르고 적 사이를 빠르게 빠져나간다.",
    apply: (s) => {
      s.player.speed += 34;
      s.perks.speed = (s.perks.speed || 0) + 1;
    }
  },
  {
    id: "dash",
    icon: "돌",
    name: "자동 대시",
    text: "이동 중 주기적으로 짧게 돌진하며 경로의 적을 밀친다.",
    apply: (s) => {
      s.stats.dash += 1;
      s.player.speed += 10;
      s.perks.dash = (s.perks.dash || 0) + 1;
    }
  },
  {
    id: "trail",
    icon: "잔",
    name: "플라즈마 잔상",
    text: "움직인 자리에 잠시 남는 피해 장판을 만든다.",
    apply: (s) => {
      s.stats.trail += 1;
      s.perks.trail = (s.perks.trail || 0) + 1;
    }
  },
  {
    id: "repel",
    icon: "파",
    name: "충격 파동",
    text: "이동 중 일정 시간마다 주변 적을 밀어내고 피해를 준다.",
    apply: (s) => {
      s.stats.repel += 1;
      s.perks.repel = (s.perks.repel || 0) + 1;
    }
  }
];

const perkLabels = {
  rapid: ["속사", "발사 간격 감소"],
  damage: ["고압탄", "피해 증가"],
  multi: ["쌍열", "탄환 수 증가"],
  pierce: ["관통", "관통 횟수 증가"],
  orb: ["궤도검", "근접 자동 공격"],
  turret: ["포탑", "코어 자동 공격"],
  frost: ["냉기장", "둔화와 지속 피해"],
  repair: ["수리", "체력과 코어 보강"],
  magnet: ["자석", "경험치 흡수 범위"],
  speed: ["기동", "기본 이동 속도 증가"],
  dash: ["대시", "주기적 돌진과 넉백"],
  trail: ["잔상", "이동 경로 피해 장판"],
  repel: ["파동", "이동 중 광역 밀치기"]
};

let state;
let lastTime = 0;

function resetGame() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(320, rect.width || 900);
  const h = Math.max(360, rect.height || 600);
  state = {
    running: false,
    paused: true,
    ended: false,
    time: 0,
    wave: 1,
    waveClock: 0,
    spawnTimer: 0,
    fireTimer: 0,
    turretTimer: 0,
    dashCooldown: 0,
    trailTimer: 0,
    repelTimer: 0,
    level: 1,
    xp: 0,
    nextXp: 12,
    kills: 0,
    width: w,
    height: h,
    player: {
      x: w * 0.5,
      y: h * 0.58,
      r: 15,
      hp: 150,
      maxHp: 150,
      speed: 210,
      invuln: 0
    },
    core: {
      x: w * 0.5,
      y: h * 0.5,
      r: 30,
      hp: 320,
      maxHp: 320
    },
    stats: {
      damage: 20,
      fireDelay: 0.32,
      projectiles: 1,
      pierce: 0,
      orbs: 0,
      turrets: 1,
      frost: 0,
      magnet: 165,
      dash: 0,
      trail: 0,
      repel: 0
    },
    perks: {},
    enemies: [],
    bullets: [],
    gems: [],
    trails: [],
    particles: [],
    messages: [{ text: "WAVE 1", time: 1.6 }]
  };
  updateUi();
  renderPerks();
  ui.gameOverOverlay.classList.add("hidden");
  ui.upgradeOverlay.classList.add("hidden");
}

function startGame() {
  if (!state) resetGame();
  state.running = true;
  state.paused = false;
  state.ended = false;
  ui.startOverlay.classList.add("hidden");
  ui.gameOverOverlay.classList.add("hidden");
  lastTime = performance.now();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state) {
    const oldW = state.width || rect.width;
    const oldH = state.height || rect.height;
    state.width = rect.width;
    state.height = rect.height;
    const sx = rect.width / oldW;
    const sy = rect.height / oldH;
    [state.player, state.core, ...state.enemies, ...state.bullets, ...state.gems].forEach((item) => {
      item.x *= sx;
      item.y *= sy;
    });
  }
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(x, y) {
  const len = Math.hypot(x, y);
  if (!len) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  const pad = 30;
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = rand(-pad, state.width + pad);
    y = -pad;
  } else if (side === 1) {
    x = state.width + pad;
    y = rand(-pad, state.height + pad);
  } else if (side === 2) {
    x = rand(-pad, state.width + pad);
    y = state.height + pad;
  } else {
    x = -pad;
    y = rand(-pad, state.height + pad);
  }

  const roll = Math.random();
  const boss = state.wave % 5 === 0 && state.enemies.filter((e) => e.boss).length < 1 && roll > 0.78;
  const runner = !boss && roll < 0.22;
  const brute = !boss && roll > 0.78;
  const scale = 1 + state.wave * 0.13;
  state.enemies.push({
    x,
    y,
    r: boss ? 34 : brute ? 23 : runner ? 13 : 17,
    hp: boss ? 180 * scale : brute ? 55 * scale : runner ? 18 * scale : 30 * scale,
    maxHp: boss ? 180 * scale : brute ? 55 * scale : runner ? 18 * scale : 30 * scale,
    speed: boss ? 45 : brute ? 54 : runner ? 105 : 72,
    damage: boss ? 14 : brute ? 8 : runner ? 3 : 5,
    hitTimer: 0,
    slow: 0,
    boss,
    runner,
    brute
  });
}

function findNearestEnemy(origin, maxRange = Infinity) {
  let best = null;
  let bestDistance = maxRange;
  for (const enemy of state.enemies) {
    const d = dist(origin, enemy);
    if (d < bestDistance) {
      best = enemy;
      bestDistance = d;
    }
  }
  return best;
}

function shootFrom(origin, target, source = "player") {
  if (!target) return;
  const aim = normalize(target.x - origin.x, target.y - origin.y);
  const count = source === "player" ? state.stats.projectiles : 1;
  const spread = count > 1 ? 0.18 : 0;
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * spread;
    const angle = Math.atan2(aim.y, aim.x) + offset;
    state.bullets.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * (source === "player" ? 520 : 430),
      vy: Math.sin(angle) * (source === "player" ? 520 : 430),
      r: source === "player" ? 5 : 6,
      damage: source === "player" ? state.stats.damage : 9 + state.wave * 1.5,
      life: 1.25,
      pierce: source === "player" ? state.stats.pierce : 0,
      source
    });
  }
}

function getMoveVector() {
  let x = 0;
  let y = 0;
  let manual = false;
  if (keys.has("ArrowLeft") || keys.has("a")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) x += 1;
  if (keys.has("ArrowUp") || keys.has("w")) y -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) y += 1;
  if (x || y) manual = true;
  if (pointer.active) {
    x += pointer.x;
    y += pointer.y;
    manual = true;
  }
  if (!manual) return getAutoMoveVector();
  return normalize(x, y);
}

function getAutoMoveVector() {
  const p = state.player;
  const c = state.core;
  const nearest = findNearestEnemy(p, 240);
  const fromCore = normalize(p.x - c.x, p.y - c.y);
  const toCore = normalize(c.x - p.x, c.y - p.y);
  const orbit = { x: -fromCore.y || 1, y: fromCore.x || 0 };
  const coreDistance = dist(p, c);
  let x = orbit.x * 0.48;
  let y = orbit.y * 0.48;

  if (nearest) {
    const away = normalize(p.x - nearest.x, p.y - nearest.y);
    x += away.x * 0.95;
    y += away.y * 0.95;
  }

  if (coreDistance > 180) {
    x += toCore.x * 1.25;
    y += toCore.y * 1.25;
  } else if (coreDistance < 74) {
    x += fromCore.x * 0.8;
    y += fromCore.y * 0.8;
  }

  if (state.stats.dash > 0) {
    x += orbit.x * 0.25;
    y += orbit.y * 0.25;
  }
  if (state.stats.trail > 0) {
    x += orbit.x * 0.2;
    y += orbit.y * 0.2;
  }
  if (state.stats.repel > 0 && nearest) {
    const toward = normalize(nearest.x - p.x, nearest.y - p.y);
    x += toward.x * 0.18;
    y += toward.y * 0.18;
  }

  return normalize(x, y);
}

function update(dt) {
  if (!state.running || state.paused || state.ended) return;

  state.time += dt;
  state.waveClock += dt;
  state.wave = Math.max(1, Math.floor(state.time / 28) + 1);
  if (state.waveClock >= 28) {
    state.waveClock = 0;
    state.messages.push({ text: `WAVE ${state.wave}`, time: 1.7 });
    state.core.hp = Math.min(state.core.maxHp, state.core.hp + 10);
  }

  const move = getMoveVector();
  state.player.x = clamp(state.player.x + move.x * state.player.speed * dt, state.player.r, state.width - state.player.r);
  state.player.y = clamp(state.player.y + move.y * state.player.speed * dt, state.player.r, state.height - state.player.r);
  state.player.invuln = Math.max(0, state.player.invuln - dt);
  updateMovementTech(dt, move);

  state.spawnTimer -= dt;
  const spawnDelay = Math.max(0.24, 1.48 - state.wave * 0.075);
  if (state.spawnTimer <= 0) {
    const amount = state.wave > 4 && Math.random() > 0.72 ? 2 : 1;
    for (let i = 0; i < amount; i += 1) spawnEnemy();
    state.spawnTimer = spawnDelay;
  }

  state.fireTimer -= dt;
  if (state.fireTimer <= 0) {
    shootFrom(state.player, findNearestEnemy(state.player, 520), "player");
    state.fireTimer = state.stats.fireDelay;
  }

  state.turretTimer -= dt;
  if (state.stats.turrets && state.turretTimer <= 0) {
    for (let i = 0; i < state.stats.turrets; i += 1) {
      const angle = (Math.PI * 2 * i) / state.stats.turrets + state.time * 0.7;
      const origin = {
        x: state.core.x + Math.cos(angle) * 36,
        y: state.core.y + Math.sin(angle) * 36
      };
      shootFrom(origin, findNearestEnemy(origin, 460), "core");
    }
    state.turretTimer = Math.max(0.28, 0.85 - state.stats.turrets * 0.06);
  }

  updateEnemies(dt);
  updateBullets(dt);
  updateTrails(dt);
  updateGems(dt);
  updateOrbs(dt);
  updateParticles(dt);
  state.messages.forEach((message) => { message.time -= dt; });
  state.messages = state.messages.filter((message) => message.time > 0);

  if (state.core.hp <= 0 || state.player.hp <= 0) {
    endGame(false);
  } else if (state.time >= 180) {
    endGame(true);
  }
  updateUi();
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    enemy.hitTimer = Math.max(0, enemy.hitTimer - dt);
    enemy.slow = Math.max(0, enemy.slow - dt);
    const playerDistance = dist(enemy, state.player);
    const coreDistance = dist(enemy, state.core);
    const target = playerDistance < 86 && playerDistance + 18 < coreDistance ? state.player : state.core;
    const dir = normalize(target.x - enemy.x, target.y - enemy.y);
    const speedFactor = enemy.slow > 0 ? 0.5 : 1;
    enemy.x += dir.x * enemy.speed * speedFactor * dt;
    enemy.y += dir.y * enemy.speed * speedFactor * dt;

    if (state.stats.frost > 0 && dist(enemy, state.player) < 82 + state.stats.frost * 18) {
      enemy.slow = 0.4;
      enemy.hp -= state.stats.frost * 5 * dt;
      if (Math.random() < 0.06) {
        state.particles.push({ x: enemy.x, y: enemy.y, r: 4, life: 0.32, color: "#8ce8ff" });
      }
    }

    if (dist(enemy, target) < enemy.r + target.r) {
      enemy.hitTimer -= dt;
      if (enemy.hitTimer <= 0) {
        target.hp -= enemy.damage;
        enemy.hitTimer = 0.55;
        state.particles.push({ x: target.x, y: target.y, r: 16, life: 0.22, color: target === state.core ? "#ffd166" : "#ff6b6b" });
      }
    }
  }
  state.enemies = state.enemies.filter((enemy) => {
    if (enemy.hp > 0) return true;
    killEnemy(enemy);
    return false;
  });
}

function updateMovementTech(dt, move) {
  const moving = Math.abs(move.x) + Math.abs(move.y) > 0.1;
  state.dashCooldown = Math.max(0, state.dashCooldown - dt);
  state.trailTimer = Math.max(0, state.trailTimer - dt);
  state.repelTimer = Math.max(0, state.repelTimer - dt);

  if (state.stats.trail > 0 && moving && state.trailTimer <= 0) {
    state.trails.push({
      x: state.player.x,
      y: state.player.y,
      r: 34 + state.stats.trail * 7,
      damage: 10 + state.stats.trail * 4,
      life: 1,
      maxLife: 1
    });
    state.trailTimer = Math.max(0.08, 0.16 - state.stats.trail * 0.015);
  }

  if (state.stats.dash > 0 && moving && state.dashCooldown <= 0) {
    const distance = 74 + state.stats.dash * 24;
    state.player.x = clamp(state.player.x + move.x * distance, state.player.r, state.width - state.player.r);
    state.player.y = clamp(state.player.y + move.y * distance, state.player.r, state.height - state.player.r);
    state.dashCooldown = Math.max(1.35, 3.2 - state.stats.dash * 0.36);
    state.particles.push({ x: state.player.x, y: state.player.y, r: 28 + state.stats.dash * 5, life: 0.35, color: "#ffd166" });
    for (const enemy of state.enemies) {
      if (dist(enemy, state.player) > 72 + state.stats.dash * 12) continue;
      const push = normalize(enemy.x - state.player.x, enemy.y - state.player.y);
      enemy.x += push.x * (34 + state.stats.dash * 11);
      enemy.y += push.y * (34 + state.stats.dash * 11);
      enemy.hp -= 18 + state.stats.dash * 7;
      enemy.slow = 0.32;
    }
  }

  if (state.stats.repel > 0 && moving && state.repelTimer <= 0) {
    const radius = 96 + state.stats.repel * 18;
    for (const enemy of state.enemies) {
      if (dist(enemy, state.player) > radius) continue;
      const push = normalize(enemy.x - state.player.x, enemy.y - state.player.y);
      enemy.x += push.x * (46 + state.stats.repel * 10);
      enemy.y += push.y * (46 + state.stats.repel * 10);
      enemy.hp -= 15 + state.stats.repel * 5;
      enemy.slow = 0.38;
    }
    state.particles.push({ x: state.player.x, y: state.player.y, r: radius, life: 0.28, color: "#53d7ff" });
    state.repelTimer = Math.max(1.25, 2.9 - state.stats.repel * 0.28);
  }
}

function updateTrails(dt) {
  for (const trail of state.trails) {
    trail.life -= dt;
    for (const enemy of state.enemies) {
      if (dist(enemy, trail) > enemy.r + trail.r) continue;
      enemy.hp -= trail.damage * dt;
      enemy.slow = 0.2;
    }
  }
  state.trails = state.trails.filter((trail) => trail.life > 0);
}

function updateBullets(dt) {
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || dist(bullet, enemy) > bullet.r + enemy.r) continue;
      enemy.hp -= bullet.damage;
      enemy.slow = bullet.source === "core" ? 0.18 : enemy.slow;
      bullet.pierce -= 1;
      bullet.life = bullet.pierce >= 0 ? bullet.life : -1;
      state.particles.push({ x: enemy.x, y: enemy.y, r: 10, life: 0.18, color: bullet.source === "core" ? "#ffd166" : "#53d7ff" });
      break;
    }
  }
  state.bullets = state.bullets.filter((bullet) => bullet.life > 0 && bullet.x > -40 && bullet.x < state.width + 40 && bullet.y > -40 && bullet.y < state.height + 40);
}

function updateGems(dt) {
  for (const gem of state.gems) {
    const d = dist(gem, state.player);
    if (d < state.stats.magnet) {
      const dir = normalize(state.player.x - gem.x, state.player.y - gem.y);
      gem.x += dir.x * (280 + state.stats.magnet) * dt;
      gem.y += dir.y * (280 + state.stats.magnet) * dt;
    }
    if (d < state.player.r + 12) {
      gem.collected = true;
      gainXp(gem.value);
      state.particles.push({ x: gem.x, y: gem.y, r: 12, life: 0.28, color: "#a980ff" });
    }
  }
  state.gems = state.gems.filter((gem) => !gem.collected);
}

function updateOrbs(dt) {
  if (!state.stats.orbs) return;
  for (let i = 0; i < state.stats.orbs; i += 1) {
    const angle = state.time * 2.5 + (Math.PI * 2 * i) / state.stats.orbs;
    const orb = {
      x: state.player.x + Math.cos(angle) * 56,
      y: state.player.y + Math.sin(angle) * 56,
      r: 12
    };
    for (const enemy of state.enemies) {
      if (dist(orb, enemy) < orb.r + enemy.r) {
        enemy.hp -= (28 + state.stats.damage * 0.6) * dt;
        enemy.slow = 0.16;
      }
    }
  }
}

function updateParticles(dt) {
  state.particles.forEach((p) => {
    p.life -= dt;
    p.r += 28 * dt;
  });
  state.particles = state.particles.filter((p) => p.life > 0);
}

function killEnemy(enemy) {
  state.kills += 1;
  const value = enemy.boss ? 12 : enemy.brute ? 5 : enemy.runner ? 2 : 3;
  for (let i = 0; i < (enemy.boss ? 7 : enemy.brute ? 3 : 1); i += 1) {
    state.gems.push({
      x: enemy.x + rand(-12, 12),
      y: enemy.y + rand(-12, 12),
      r: 5,
      value
    });
  }
  state.particles.push({ x: enemy.x, y: enemy.y, r: enemy.r, life: 0.35, color: enemy.boss ? "#ffd166" : "#ff6b6b" });
}

function gainXp(value) {
  state.xp += value;
  while (state.xp >= state.nextXp) {
    state.xp -= state.nextXp;
    state.level += 1;
    state.nextXp = Math.floor(state.nextXp * 1.23 + 5);
    openUpgrade();
  }
}

function openUpgrade() {
  state.paused = true;
  const choices = sampleUpgrades(3);
  ui.upgradeChoices.innerHTML = choices.map((upgrade, index) => `
    <button class="upgrade-button" type="button" data-index="${index}">
      <i>${upgrade.icon}</i>
      <b>${upgrade.name}</b>
      <span>${upgrade.text}</span>
    </button>
  `).join("");
  ui.upgradeChoices.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      choices[Number(button.dataset.index)].apply(state);
      state.paused = false;
      ui.upgradeOverlay.classList.add("hidden");
      renderPerks();
      updateUi();
    });
  });
  ui.upgradeOverlay.classList.remove("hidden");
}

function sampleUpgrades(count) {
  const pool = upgradePool.filter((upgrade) => {
    if (upgrade.id === "multi" && state.stats.projectiles >= 5) return false;
    if (upgrade.id === "orb" && state.stats.orbs >= 5) return false;
    if (upgrade.id === "turret" && state.stats.turrets >= 4) return false;
    return true;
  });
  const movementIds = new Set(["speed", "dash", "trail", "repel", "magnet"]);
  const attackIds = new Set(["rapid", "damage", "multi", "pierce", "orb", "turret", "frost"]);
  const out = [];
  const movementPool = pool.filter((upgrade) => movementIds.has(upgrade.id));
  const attackPool = pool.filter((upgrade) => attackIds.has(upgrade.id));
  if (movementPool.length) out.push(movementPool[Math.floor(Math.random() * movementPool.length)]);
  if (attackPool.length) out.push(attackPool[Math.floor(Math.random() * attackPool.length)]);
  while (pool.length && out.length < count) {
    const [next] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    if (!out.some((upgrade) => upgrade.id === next.id)) out.push(next);
  }
  return out;
}

function endGame(win) {
  state.ended = true;
  state.running = false;
  state.paused = true;
  ui.gameOverTitle.textContent = win ? "코어 방어 성공" : "코어 붕괴";
  ui.gameOverText.textContent = `${formatTime(state.time)} · ${state.kills} KOs · Wave ${state.wave}`;
  ui.gameOverOverlay.classList.remove("hidden");
}

function updateUi() {
  if (!state) return;
  const corePct = clamp(state.core.hp / state.core.maxHp, 0, 1);
  const heroPct = clamp(state.player.hp / state.player.maxHp, 0, 1);
  const xpPct = clamp(state.xp / state.nextXp, 0, 1);
  ui.coreBar.style.width = `${corePct * 100}%`;
  ui.heroBar.style.width = `${heroPct * 100}%`;
  ui.xpBar.style.width = `${xpPct * 100}%`;
  ui.coreText.textContent = `${Math.ceil(Math.max(0, state.core.hp))}/${state.core.maxHp}`;
  ui.heroText.textContent = `${Math.ceil(Math.max(0, state.player.hp))}/${state.player.maxHp}`;
  ui.waveText.textContent = state.wave;
  ui.levelText.textContent = state.level;
  ui.timerText.textContent = formatTime(state.time);
  ui.killText.textContent = `${state.kills} KOs`;
  const build = buildName();
  ui.buildTitle.textContent = build.title;
  ui.buildText.textContent = build.text;
}

function buildName() {
  const perks = state.perks;
  if ((perks.turret || 0) >= 2 && (perks.frost || 0) >= 1) return { title: "빙결 포탑 수비대", text: "코어 사격과 둔화장으로 길목을 잠근다." };
  if ((perks.orb || 0) >= 2 && (perks.multi || 0) >= 2) return { title: "근접 탄막 레인저", text: "궤도검과 다중 탄환으로 밀집 웨이브를 정리한다." };
  if ((perks.dash || 0) >= 1 && (perks.trail || 0) >= 1) return { title: "잔상 돌격자", text: "대시와 피해 장판으로 전장을 가로지른다." };
  if ((perks.repel || 0) >= 2) return { title: "파동 수호자", text: "움직임 자체가 광역 방어 수단이 된다." };
  if ((perks.damage || 0) >= 2 && (perks.pierce || 0) >= 1) return { title: "관통 저격수", text: "한 줄로 몰려오는 적을 뚫어낸다." };
  return { title: "루키 레인저", text: "자동 사격 · 코어 방어 · 웨이브 생존" };
}

function renderPerks() {
  const entries = Object.entries(state.perks);
  if (!entries.length) {
    ui.perkList.innerHTML = `<div class="perk"><div class="perk-icon">0</div><div><b>강화 없음</b><span>레벨업 후 빌드가 열린다.</span></div></div>`;
    return;
  }
  ui.perkList.innerHTML = entries.map(([id, count]) => {
    const [name, text] = perkLabels[id] || [id, "강화됨"];
    return `<div class="perk"><div class="perk-icon">${count}</div><div><b>${name}</b><span>${text}</span></div></div>`;
  }).join("");
}

function draw() {
  if (!state) return;
  ctx.clearRect(0, 0, state.width, state.height);
  drawGrid();
  drawCore();
  drawFrost();
  drawTrails();
  drawOrbs();
  drawGems();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawMessages();
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  const step = 44;
  const offset = (state.time * 14) % step;
  for (let x = -step + offset; x < state.width + step; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.height);
    ctx.stroke();
  }
  for (let y = -step + offset; y < state.height + step; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCore() {
  const c = state.core;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(state.time * 0.45);
  ctx.fillStyle = "rgba(255, 209, 102, 0.12)";
  ctx.beginPath();
  ctx.arc(0, 0, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 209, 102, 0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffd166";
  crystal(0, 0, c.r);
  ctx.restore();
}

function crystal(x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.74, y - r * 0.22);
  ctx.lineTo(x + r * 0.48, y + r * 0.9);
  ctx.lineTo(x - r * 0.48, y + r * 0.9);
  ctx.lineTo(x - r * 0.74, y - r * 0.22);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = "#53d7ff";
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f0dc";
  ctx.beginPath();
  ctx.moveTo(0, -p.r - 8);
  ctx.lineTo(8, -2);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawEnemies() {
  for (const e of state.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.boss ? "#ffd166" : e.runner ? "#ff9f45" : e.brute ? "#a980ff" : "#ff6b6b";
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.36)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillRect(-e.r * 0.42, -e.r * 0.18, e.r * 0.26, e.r * 0.22);
    ctx.fillRect(e.r * 0.16, -e.r * 0.18, e.r * 0.26, e.r * 0.22);
    ctx.restore();
    if (e.hp < e.maxHp) {
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 4);
      ctx.fillStyle = "#73e08f";
      ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2 * clamp(e.hp / e.maxHp, 0, 1), 4);
    }
  }
}

function drawBullets() {
  for (const b of state.bullets) {
    ctx.fillStyle = b.source === "core" ? "#ffd166" : "#8ce8ff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGems() {
  for (const g of state.gems) {
    ctx.fillStyle = "#a980ff";
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.stroke();
  }
}

function drawOrbs() {
  if (!state.stats.orbs) return;
  for (let i = 0; i < state.stats.orbs; i += 1) {
    const angle = state.time * 2.5 + (Math.PI * 2 * i) / state.stats.orbs;
    const x = state.player.x + Math.cos(angle) * 56;
    const y = state.player.y + Math.sin(angle) * 56;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFrost() {
  if (!state.stats.frost) return;
  ctx.save();
  ctx.strokeStyle = "rgba(83,215,255,0.2)";
  ctx.fillStyle = "rgba(83,215,255,0.055)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, 82 + state.stats.frost * 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTrails() {
  for (const trail of state.trails) {
    ctx.save();
    ctx.globalAlpha = clamp(trail.life / trail.maxLife, 0, 1) * 0.58;
    ctx.fillStyle = "#a980ff";
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life * 3, 0, 1);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawMessages() {
  if (!state.messages.length) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 34px system-ui, sans-serif";
  for (const message of state.messages) {
    ctx.globalAlpha = clamp(message.time, 0, 1);
    ctx.fillStyle = "#ffd166";
    ctx.strokeStyle = "rgba(0,0,0,0.48)";
    ctx.lineWidth = 6;
    ctx.strokeText(message.text, state.width / 2, 84);
    ctx.fillText(message.text, state.width / 2, 84);
  }
  ctx.restore();
}

function loop(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function setPointerVector(clientX, clientY) {
  const dx = clientX - pointer.originX;
  const dy = clientY - pointer.originY;
  const max = 42;
  const len = Math.hypot(dx, dy);
  const scale = len > max ? max / len : 1;
  const sx = dx * scale;
  const sy = dy * scale;
  pointer.x = sx / max;
  pointer.y = sy / max;
  stick.style.setProperty("--stick-x", `${sx}px`);
  stick.style.setProperty("--stick-y", `${sy}px`);
}

touchSurface.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  pointer.id = event.pointerId;
  pointer.originX = event.clientX;
  pointer.originY = event.clientY;
  setPointerVector(event.clientX, event.clientY);
  touchSurface.setPointerCapture(event.pointerId);
});

touchSurface.addEventListener("pointermove", (event) => {
  if (!pointer.active || pointer.id !== event.pointerId) return;
  setPointerVector(event.clientX, event.clientY);
});

function releasePointer(event) {
  if (pointer.id !== event.pointerId) return;
  pointer.active = false;
  pointer.id = null;
  pointer.x = 0;
  pointer.y = 0;
  stick.style.setProperty("--stick-x", "0px");
  stick.style.setProperty("--stick-y", "0px");
}

touchSurface.addEventListener("pointerup", releasePointer);
touchSurface.addEventListener("pointercancel", releasePointer);

window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("resize", () => {
  resizeCanvas();
  updateUi();
});

ui.startButton.addEventListener("click", startGame);
ui.againButton.addEventListener("click", () => {
  resetGame();
  startGame();
});
ui.restartButton.addEventListener("click", () => {
  resetGame();
  startGame();
});

function init() {
  resizeCanvas();
  resetGame();
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function sample(list, count) {
  const copy = [...list];
  const out = [];
  while (copy.length && out.length < count) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

init();
