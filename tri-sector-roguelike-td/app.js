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
const WAVES = [
  [
    spawn(0.4, "top", 0.5, "grunt"),
    spawn(1.2, "left", 0.42, "grunt"),
    spawn(2.0, "right", 0.58, "grunt"),
    spawn(3.1, "top", 0.25, "grunt"),
    spawn(3.7, "top", 0.75, "grunt"),
    spawn(5.0, "bottom", 0.5, "grunt"),
  ],
  [
    spawn(0.2, "left", 0.25, "runner"),
    spawn(0.8, "right", 0.75, "runner"),
    spawn(1.5, "top", 0.4, "grunt"),
    spawn(1.8, "top", 0.6, "grunt"),
    spawn(2.5, "bottom", 0.35, "grunt"),
    spawn(3.1, "bottom", 0.65, "grunt"),
    spawn(4.5, "left", 0.62, "runner"),
  ],
  [
    spawn(0.3, "right", 0.2, "tank"),
    spawn(0.8, "right", 0.36, "grunt"),
    spawn(1.4, "bottom", 0.45, "grunt"),
    spawn(2.0, "bottom", 0.55, "runner"),
    spawn(3.0, "top", 0.25, "grunt"),
    spawn(3.2, "top", 0.5, "grunt"),
    spawn(3.4, "top", 0.75, "grunt"),
    spawn(5.2, "left", 0.5, "tank"),
  ],
  [
    spawn(0.2, "top", 0.16, "runner"),
    spawn(0.4, "top", 0.34, "runner"),
    spawn(0.6, "top", 0.52, "runner"),
    spawn(0.8, "top", 0.7, "runner"),
    spawn(1.7, "left", 0.4, "grunt"),
    spawn(1.9, "right", 0.6, "grunt"),
    spawn(2.5, "bottom", 0.25, "tank"),
    spawn(2.7, "bottom", 0.75, "tank"),
    spawn(4.4, "left", 0.18, "runner"),
    spawn(4.8, "right", 0.82, "runner"),
  ],
  [
    spawn(0.4, "top", 0.5, "tank"),
    spawn(0.8, "left", 0.5, "grunt"),
    spawn(1.2, "right", 0.5, "grunt"),
    spawn(1.8, "bottom", 0.5, "runner"),
    spawn(2.4, "top", 0.25, "grunt"),
    spawn(2.6, "top", 0.75, "grunt"),
    spawn(3.6, "left", 0.28, "tank"),
    spawn(3.8, "right", 0.72, "tank"),
    spawn(5.2, "bottom", 0.33, "runner"),
    spawn(5.4, "bottom", 0.5, "runner"),
    spawn(5.6, "bottom", 0.67, "runner"),
  ],
];

const TYPES = {
  grunt: { hp: 34, speed: 34, radius: 11, damage: 8, xp: 6, color: "#dc765e", core: "#ffcf7d" },
  runner: { hp: 22, speed: 56, radius: 9, damage: 7, xp: 7, color: "#72d8ff", core: "#e7fbff" },
  tank: { hp: 78, speed: 22, radius: 14, damage: 16, xp: 15, color: "#a88cff", core: "#f0d9ff" },
};

const upgradePool = [
  {
    id: "power",
    title: "예리한 일격",
    text: "공격력 +7",
    apply: () => {
      state.hero.damage += 7;
    },
  },
  {
    id: "tempo",
    title: "빠른 호흡",
    text: "공격 간격 -12%",
    apply: () => {
      state.hero.cooldown = Math.max(0.22, state.hero.cooldown * 0.88);
    },
  },
  {
    id: "range",
    title: "전방 압박",
    text: "사거리 +24",
    apply: () => {
      state.hero.range += 24;
    },
  },
  {
    id: "angle",
    title: "넓은 검풍",
    text: "공격 범위 +12도",
    apply: () => {
      state.hero.angle += 12;
    },
  },
  {
    id: "guard",
    title: "석심 보강",
    text: "타워 최대 체력 +18",
    apply: () => {
      state.maxHp += 18;
      state.hp = Math.min(state.maxHp, state.hp + 18);
    },
  },
  {
    id: "cleave",
    title: "파동 베기",
    text: "동시에 타격하는 적 +1",
    apply: () => {
      state.hero.targets += 1;
    },
  },
  {
    id: "xp",
    title: "전투 감각",
    text: "획득 경험치 +18%",
    apply: () => {
      state.xpBonus += 0.18;
    },
  },
  {
    id: "first",
    title: "선제 타격",
    text: "로테이션 직후 첫 공격 강화",
    apply: () => {
      state.hero.firstStrike += 0.45;
    },
  },
];

let state;
let lastTime = 0;
let dpr = 1;
let cssWidth = 0;
let cssHeight = 0;
let toastTimer = 0;

function spawn(time, edge, pos, type) {
  return { time, edge, pos, type };
}

function createState() {
  return {
    phase: "playing",
    time: 0,
    waveIndex: 0,
    waveTime: 0,
    nextSpawn: 0,
    hp: 100,
    maxHp: 100,
    xp: 0,
    xpNeeded: 18,
    xpBonus: 0,
    level: 1,
    killCount: 0,
    shake: 0,
    waveBanner: 0,
    rotationQueue: 0,
    enemies: [],
    shots: [],
    particles: [],
    xpOrbs: [],
    floatingTexts: [],
    hero: {
      slot: 0,
      fromSlot: 0,
      toSlot: 0,
      rotateT: 1,
      rotateDuration: 0.14,
      angle: 120,
      range: 210,
      damage: 18,
      cooldown: 0.5,
      attackTimer: 0,
      targets: 1,
      firstStrike: 0,
      firstStrikeReady: false,
    },
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
    r: Math.min(cssWidth, cssHeight) * 0.062,
  };
}

function slotPosition(slot, extraRadius = 0) {
  const t = tower();
  const angle = HERO_ANGLES[slot] * DEG;
  const orbit = Math.min(cssWidth, cssHeight) * 0.18 + extraRadius;
  return {
    x: t.x + Math.cos(angle) * orbit,
    y: t.y + Math.sin(angle) * orbit,
    angle: HERO_ANGLES[slot],
  };
}

function heroPosition() {
  const h = state.hero;
  if (h.rotateT >= 1) return slotPosition(h.slot);

  const eased = easeInOut(h.rotateT);
  const from = slotPosition(h.fromSlot);
  const to = slotPosition(h.toSlot);
  const angle = lerpAngle(from.angle, to.angle, eased);
  return {
    x: mix(from.x, to.x, eased),
    y: mix(from.y, to.y, eased),
    angle,
  };
}

function queueRotation() {
  if (state.phase !== "playing") return;
  if (state.hero.rotateT < 1) {
    state.rotationQueue += 1;
    pulseToast("ROTATION x" + (state.rotationQueue + 1));
    return;
  }
  startRotation();
}

function startRotation() {
  const h = state.hero;
  h.fromSlot = h.slot;
  h.toSlot = (h.slot + 1) % 3;
  h.slot = h.toSlot;
  h.rotateT = 0;
  h.attackTimer = Math.max(h.attackTimer, h.rotateDuration);
  h.firstStrikeReady = h.firstStrike > 0;
  addRing(heroPosition().x, heroPosition().y, "#ffd166", 8, 0.34);
}

function update(dt) {
  if (state.phase !== "playing") {
    updateParticles(dt);
    return;
  }

  state.time += dt;
  state.waveTime += dt;
  state.shake = Math.max(0, state.shake - dt * 10);
  state.waveBanner = Math.max(0, state.waveBanner - dt);

  updateRotation(dt);
  spawnWaveEnemies();
  updateEnemies(dt);
  updateHero(dt);
  updateShots(dt);
  updateXpOrbs(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
  if (state.phase !== "playing") return;
  checkWaveClear();
}

function updateRotation(dt) {
  const h = state.hero;
  if (h.rotateT >= 1) return;
  h.rotateT += dt / h.rotateDuration;
  if (h.rotateT >= 1) {
    h.rotateT = 1;
    if (state.rotationQueue > 0) {
      state.rotationQueue -= 1;
      startRotation();
    }
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
  const pad = 24;
  let x = cssWidth * 0.5;
  let y = cssHeight * 0.5;

  if (plan.edge === "top") {
    x = cssWidth * plan.pos;
    y = -pad;
  } else if (plan.edge === "bottom") {
    x = cssWidth * plan.pos;
    y = cssHeight + pad;
  } else if (plan.edge === "left") {
    x = -pad;
    y = cssHeight * plan.pos;
  } else {
    x = cssWidth + pad;
    y = cssHeight * plan.pos;
  }

  state.enemies.push({
    x,
    y,
    hp: type.hp + state.waveIndex * 4,
    maxHp: type.hp + state.waveIndex * 4,
    speed: type.speed + state.waveIndex * 2,
    radius: type.radius,
    damage: type.damage,
    xp: type.xp,
    color: type.color,
    core: type.core,
    type: plan.type,
    hit: 0,
  });
}

function updateEnemies(dt) {
  const t = tower();
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    const dx = t.x - e.x;
    const dy = t.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    e.x += (dx / dist) * e.speed * dt;
    e.y += (dy / dist) * e.speed * dt;
    e.hit = Math.max(0, e.hit - dt * 6);

    if (dist < t.r + e.radius * 0.88) {
      state.enemies.splice(i, 1);
      state.hp = Math.max(0, state.hp - e.damage);
      state.shake = 1;
      addBurst(e.x, e.y, "#ff6b6b", 16);
      addFloat(t.x, t.y - t.r - 8, "-" + e.damage, "#ff8d8d");
      if (state.hp <= 0) finish(false);
    }
  }
}

function updateHero(dt) {
  const h = state.hero;
  h.attackTimer = Math.max(0, h.attackTimer - dt);
  if (h.rotateT < 1 || h.attackTimer > 0) return;

  const targets = findTargets();
  if (!targets.length) return;

  const hero = heroPosition();
  let damage = h.damage;
  if (h.firstStrikeReady) {
    damage = Math.round(damage * (1 + h.firstStrike));
    h.firstStrikeReady = false;
  }

  for (const target of targets) {
    hitEnemy(target, damage, hero);
  }
  h.attackTimer = h.cooldown;
}

function findTargets() {
  const h = state.hero;
  const hero = heroPosition();
  const candidates = [];
  for (const enemy of state.enemies) {
    const dx = enemy.x - hero.x;
    const dy = enemy.y - hero.y;
    const dist = Math.hypot(dx, dy);
    if (dist > h.range) continue;
    const enemyAngle = Math.atan2(dy, dx) / DEG;
    const diff = Math.abs(angleDiff(enemyAngle, hero.angle));
    if (diff <= h.angle / 2) {
      const t = tower();
      candidates.push({ enemy, danger: Math.hypot(enemy.x - t.x, enemy.y - t.y) });
    }
  }
  candidates.sort((a, b) => a.danger - b.danger);
  return candidates.slice(0, h.targets).map((item) => item.enemy);
}

function hitEnemy(enemy, amount, hero) {
  enemy.hp -= amount;
  enemy.hit = 1;
  state.shots.push({
    x1: hero.x,
    y1: hero.y,
    x2: enemy.x,
    y2: enemy.y,
    life: 0.16,
    maxLife: 0.16,
  });
  addBurst(enemy.x, enemy.y, "#ffd166", 6);
  addFloat(enemy.x, enemy.y - enemy.radius - 5, amount.toString(), "#ffe19a");

  if (enemy.hp <= 0) {
    const idx = state.enemies.indexOf(enemy);
    if (idx >= 0) state.enemies.splice(idx, 1);
    state.killCount += 1;
    addBurst(enemy.x, enemy.y, enemy.color, 18);
    addXpOrb(enemy.x, enemy.y, enemy.xp);
  }
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
    state.xpNeeded = Math.round(state.xpNeeded * 1.32 + 8);
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
    button.innerHTML = `<strong>${choice.title}</strong><span>${choice.text}</span>`;
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
  const pool = [...upgradePool];
  const out = [];
  while (out.length < count && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(index, 1)[0]);
  }
  return out;
}

function updateShots(dt) {
  for (let i = state.shots.length - 1; i >= 0; i -= 1) {
    const shot = state.shots[i];
    shot.life -= dt;
    if (shot.life <= 0) state.shots.splice(i, 1);
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
  drawAttackCone();
  drawTower();
  drawSlots();
  drawEnemies();
  drawShots();
  drawHero();
  drawXpOrbs();
  drawParticles();
  drawFloatingTexts();
  drawWaveBanner();

  ctx.restore();
}

function drawMap() {
  const w = cssWidth;
  const h = cssHeight;
  const grid = Math.max(28, Math.min(w, h) * 0.09);

  ctx.save();
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#28334a");
  grd.addColorStop(1, "#171e2d");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.18;
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

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#101522";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.restore();
}

function drawSlots() {
  for (let i = 0; i < 3; i += 1) {
    const p = slotPosition(i);
    ctx.save();
    ctx.globalAlpha = i === state.hero.slot && state.hero.rotateT >= 1 ? 0.55 : 0.24;
    ctx.strokeStyle = "#f7c85f";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, TWO_PI);
    ctx.stroke();
    ctx.restore();
  }
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

function drawAttackCone() {
  const h = state.hero;
  const p = heroPosition();
  const start = (p.angle - h.angle / 2) * DEG;
  const end = (p.angle + h.angle / 2) * DEG;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, h.range);
  grad.addColorStop(0, "rgba(247, 200, 95, 0.28)");
  grad.addColorStop(0.72, "rgba(247, 200, 95, 0.11)");
  grad.addColorStop(1, "rgba(247, 200, 95, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.arc(p.x, p.y, h.range, start, end);
  ctx.closePath();
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.38;
  ctx.strokeStyle = "#f7c85f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, h.range, start, end);
  ctx.stroke();
  ctx.restore();
}

function drawHero() {
  const p = heroPosition();
  const rotating = state.hero.rotateT < 1;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle * DEG + Math.PI / 2);

  ctx.fillStyle = rotating ? "rgba(255, 209, 102, 0.24)" : "rgba(255, 209, 102, 0.16)";
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, TWO_PI);
  ctx.fill();

  ctx.fillStyle = "#1a2233";
  ctx.strokeStyle = "#f7f1dc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-13, -9, 26, 28, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f7c85f";
  ctx.beginPath();
  ctx.arc(0, -15, 9, 0, TWO_PI);
  ctx.fill();

  ctx.strokeStyle = rotating ? "#ffdf8a" : "#9fe7ad";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(0, -30);
  ctx.stroke();

  ctx.restore();
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
    } else if (e.type === "tank") {
      roundPoly(0, 0, e.radius * 1.24, 6, Math.PI / 6);
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
  }
}

function drawShots() {
  for (const s of state.shots) {
    const a = Math.max(0, s.life / s.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = "#ffe19a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
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
  ui.heroLevel.textContent = `Lv.${state.level} / ${Math.round(state.hero.angle)}도`;
  ui.damage.textContent = String(state.hero.damage);
  ui.speed.textContent = (1 / state.hero.cooldown).toFixed(1);
  ui.range.textContent = String(Math.round(state.hero.range));
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

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  queueRotation();
});

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
