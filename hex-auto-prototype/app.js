(() => {
  const GRID_RADIUS = 3;
  const MAX_WAVE = 5;
  const TURN_MS = 850;
  const DIRS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    board: $("#board"),
    waveLabel: $("#waveLabel"),
    turnLabel: $("#turnLabel"),
    enemyLabel: $("#enemyLabel"),
    restartButton: $("#restartButton"),
    retryButton: $("#retryButton"),
    rewardOverlay: $("#rewardOverlay"),
    rewardChoices: $("#rewardChoices"),
    resultOverlay: $("#resultOverlay"),
    resultTitle: $("#resultTitle"),
    resultText: $("#resultText"),
    upgradeChips: $("#upgradeChips"),
    battleLog: $("#battleLog"),
    archerStatus: $("#archerStatus"),
    warriorStatus: $("#warriorStatus"),
    mageStatus: $("#mageStatus"),
  };

  const tiles = makeTiles();
  const tileKeys = new Set(tiles.map(tileKey));
  let loopId = null;
  let state = null;

  const enemyTypes = {
    grunt: { name: "보병", label: "졸", hp: 8, damage: 2, move: 1, range: 1, threat: 1, className: "" },
    fast: { name: "돌격병", label: "속", hp: 7, damage: 2, move: 2, range: 1, threat: 3, className: "fast" },
    tank: { name: "방패병", label: "방", hp: 15, damage: 3, move: 1, range: 1, threat: 4, className: "tank" },
    shooter: { name: "사수", label: "사", hp: 7, damage: 2, move: 1, range: 2, threat: 3, className: "" },
    brute: { name: "정예병", label: "장", hp: 24, damage: 4, move: 1, range: 1, threat: 6, className: "tank" },
  };

  const waveTable = [
    [
      enemy("grunt", -2, -2),
      enemy("grunt", 1, -3),
      enemy("fast", 3, -3),
    ],
    [
      enemy("grunt", -3, 0),
      enemy("fast", -1, -2),
      enemy("tank", 2, -3),
      enemy("shooter", 3, -2),
    ],
    [
      enemy("tank", -3, 1),
      enemy("fast", -2, -1),
      enemy("fast", 1, -3),
      enemy("shooter", 3, -3),
      enemy("grunt", 2, -2),
    ],
    [
      enemy("tank", -3, 0),
      enemy("tank", 0, -3),
      enemy("fast", 2, -3),
      enemy("shooter", 3, -2),
      enemy("shooter", -1, -2),
    ],
    [
      enemy("brute", 0, -3),
      enemy("tank", -3, 1),
      enemy("tank", 3, -3),
      enemy("fast", -2, -1),
      enemy("fast", 2, -2),
      enemy("shooter", 1, -3),
    ],
  ];

  const upgradeCatalog = [
    {
      id: "archer-damage",
      owner: "archer",
      route: "공용",
      name: "안정 사격",
      desc: "궁수 기본 피해 +1. 가장 단순하지만 모든 연타, 표식, 함정 빌드에 깔리는 선택지.",
      apply: () => hero("archer").damage += 1,
    },
    {
      id: "archer-range",
      owner: "archer",
      route: "공용",
      name: "사거리 확보",
      desc: "궁수 사거리 +1. 궁수가 안전 거리를 유지하면서 먼저 때릴 확률이 올라간다.",
      apply: () => hero("archer").range += 1,
    },
    {
      id: "archer-mark",
      owner: "archer",
      route: "표식",
      name: "약점 표식",
      desc: "궁수 공격이 표식 1을 부여한다. 표식은 전사와 마법사 시너지의 출발점이다.",
      apply: () => hero("archer").markOnHit = true,
    },
    {
      id: "archer-mark-hunt",
      owner: "archer",
      route: "표식",
      name: "표식 사냥",
      desc: "궁수가 표식 적을 공격하면 피해 +2. 한 대상을 녹이는 방향.",
      requires: ["archer-mark"],
      apply: () => hero("archer").markBonus += 2,
    },
    {
      id: "archer-mark-transfer",
      owner: "archer",
      route: "표식",
      name: "표식 전이",
      desc: "표식 적이 죽으면 가장 위험한 적에게 표식을 옮긴다.",
      requires: ["archer-mark-hunt"],
      apply: () => hero("archer").markTransfer = true,
    },
    {
      id: "archer-repeat",
      owner: "archer",
      route: "연타",
      name: "반복 리듬",
      desc: "같은 적을 다시 공격하면 추가 피해 +1. 순수 자동 전투에서도 집중 화력이 생긴다.",
      apply: () => hero("archer").repeatBonus += 1,
    },
    {
      id: "archer-double",
      owner: "archer",
      route: "연타",
      name: "연속 사격",
      desc: "궁수가 매 턴 2회 공격한다.",
      requiresAny: ["archer-repeat", "archer-damage", "archer-mark"],
      apply: () => hero("archer").shots = Math.max(hero("archer").shots, 2),
    },
    {
      id: "archer-triple",
      owner: "archer",
      route: "연타",
      name: "삼연사",
      desc: "궁수가 매 턴 3회 공격한다. 표식 빌드와 결합하면 보스 처리력이 커진다.",
      requires: ["archer-double"],
      apply: () => hero("archer").shots = Math.max(hero("archer").shots, 3),
    },
    {
      id: "archer-trap",
      owner: "archer",
      route: "함정",
      name: "공격 함정",
      desc: "궁수가 3턴마다 적의 진입 경로에 함정을 설치한다.",
      apply: () => hero("archer").trapEnabled = true,
    },
    {
      id: "archer-trap-damage",
      owner: "archer",
      route: "함정",
      name: "함정 손질",
      desc: "함정 피해 +2. 함정이 단순 견제가 아니라 처치 수단이 된다.",
      requires: ["archer-trap"],
      apply: () => hero("archer").trapDamage += 2,
    },
    {
      id: "archer-trap-slow",
      owner: "archer",
      route: "함정",
      name: "가시 길목",
      desc: "함정을 밟은 적의 다음 이동력이 1 감소한다.",
      requires: ["archer-trap"],
      apply: () => hero("archer").trapSlow = true,
    },
    {
      id: "archer-trap-chain",
      owner: "archer",
      route: "함정",
      name: "연쇄 함정",
      desc: "함정 발동 시 인접 적에게도 피해를 준다.",
      requires: ["archer-trap-damage"],
      apply: () => hero("archer").trapChain = true,
    },
    {
      id: "warrior-damage",
      owner: "warrior",
      route: "공용",
      name: "강한 베기",
      desc: "전사 기본 피해 +1. 전사가 실제로 적을 마무리하는 힘을 얻는다.",
      apply: () => hero("warrior").damage += 1,
    },
    {
      id: "warrior-protect",
      owner: "warrior",
      route: "공용",
      name: "전열 유지",
      desc: "전사가 체력이 낮은 아군에게 붙은 적을 우선 공격한다.",
      apply: () => hero("warrior").protect = true,
    },
    {
      id: "warrior-push",
      owner: "warrior",
      route: "돌진",
      name: "방패 밀치기",
      desc: "전사 공격이 적을 1칸 밀친다. 위치 변화 시너지의 핵심.",
      apply: () => hero("warrior").push += 1,
    },
    {
      id: "warrior-breakthrough",
      owner: "warrior",
      route: "돌진",
      name: "돌파",
      desc: "전사가 이동 후 공격하면 피해 +1. 많이 움직일수록 강해진다.",
      apply: () => hero("warrior").chargeBonus += 1,
    },
    {
      id: "warrior-comet",
      owner: "warrior",
      route: "돌진",
      name: "전장의 혜성",
      desc: "전사가 3칸 이상 이동 후 공격하면 추가 피해 +2와 밀침 +1.",
      requiresAny: ["warrior-push", "warrior-breakthrough"],
      apply: () => hero("warrior").comet = true,
    },
    {
      id: "warrior-cleave",
      owner: "warrior",
      route: "범위 공격",
      name: "넓은 휩쓸기",
      desc: "전사 공격이 대상 주변 인접 적에게 1 피해를 준다.",
      apply: () => hero("warrior").cleaveDamage += 1,
    },
    {
      id: "warrior-collapse",
      owner: "warrior",
      route: "범위 공격",
      name: "전열 붕괴",
      desc: "밀린 적 주변에 2 피해. 밀치기가 피해 엔진으로 바뀐다.",
      requires: ["warrior-push"],
      apply: () => hero("warrior").pushSplash += 2,
    },
    {
      id: "warrior-control",
      owner: "warrior",
      route: "범위 공격",
      name: "전장 장악",
      desc: "전사의 휩쓸기와 전열 붕괴 피해 +1.",
      requiresAny: ["warrior-cleave", "warrior-collapse"],
      apply: () => {
        hero("warrior").cleaveDamage += 1;
        hero("warrior").pushSplash += 1;
      },
    },
    {
      id: "warrior-blood",
      owner: "warrior",
      route: "광전",
      name: "피의 박자",
      desc: "전사 체력이 낮을수록 공격 피해가 증가한다.",
      apply: () => hero("warrior").berserkDamage = true,
    },
    {
      id: "warrior-berserk",
      owner: "warrior",
      route: "광전",
      name: "광전 태세",
      desc: "전사 체력이 절반 이하이면 2턴마다 한 번 더 행동한다.",
      requires: ["warrior-blood"],
      apply: () => hero("warrior").extraEvery = 2,
    },
    {
      id: "warrior-storm",
      owner: "warrior",
      route: "광전",
      name: "피의 폭풍",
      desc: "4턴마다 전사 주변 모든 적에게 피해 3.",
      requiresAny: ["warrior-berserk", "warrior-cleave"],
      apply: () => hero("warrior").bloodStorm = true,
    },
    {
      id: "mage-damage",
      owner: "mage",
      route: "공용",
      name: "안정된 마력",
      desc: "마법사 기본 피해 +1. 연쇄, 룬, 운석 전부에 깔리는 성장.",
      apply: () => hero("mage").damage += 1,
    },
    {
      id: "mage-retreat",
      owner: "mage",
      route: "공용",
      name: "마력 거리두기",
      desc: "마법사가 위험할 때 최대 2칸 후퇴한다.",
      apply: () => hero("mage").retreat = 2,
    },
    {
      id: "mage-chain",
      owner: "mage",
      route: "연쇄",
      name: "연쇄 마력탄",
      desc: "마법 공격이 다른 적 1명에게 전이된다.",
      apply: () => hero("mage").chainCount += 1,
    },
    {
      id: "mage-three-chain",
      owner: "mage",
      route: "연쇄",
      name: "세 갈래 번개",
      desc: "마법 전이 대상 +1.",
      requires: ["mage-chain"],
      apply: () => hero("mage").chainCount += 1,
    },
    {
      id: "mage-circuit",
      owner: "mage",
      route: "연쇄",
      name: "무한 회로",
      desc: "마법 전이 피해 +1. 여러 적이 있을수록 효율이 오른다.",
      requires: ["mage-three-chain"],
      apply: () => hero("mage").chainDamage += 1,
    },
    {
      id: "mage-rune",
      owner: "mage",
      route: "룬",
      name: "폭발 룬",
      desc: "마법사가 3턴마다 적 밀집 위치에 룬을 설치한다.",
      apply: () => hero("mage").runeEnabled = true,
    },
    {
      id: "mage-rune-damage",
      owner: "mage",
      route: "룬",
      name: "룬 조율",
      desc: "룬 피해 +2.",
      requires: ["mage-rune"],
      apply: () => hero("mage").runeDamage += 2,
    },
    {
      id: "mage-rune-link",
      owner: "mage",
      route: "룬",
      name: "룬 연동",
      desc: "룬 발동 시 인접 룬도 함께 폭발한다.",
      requires: ["mage-rune-damage"],
      apply: () => hero("mage").runeLink = true,
    },
    {
      id: "mage-meteor",
      owner: "mage",
      route: "운석",
      name: "운석 예고",
      desc: "4턴마다 밀집 지역에 다음 턴 폭발하는 운석을 예고한다.",
      apply: () => hero("mage").meteorEnabled = true,
    },
    {
      id: "mage-shard",
      owner: "mage",
      route: "운석",
      name: "파편 회수",
      desc: "운석으로 적을 처치하면 다음 운석 대기 시간이 줄어든다.",
      requires: ["mage-meteor"],
      apply: () => hero("mage").meteorRefund = true,
    },
    {
      id: "mage-sky",
      owner: "mage",
      route: "운석",
      name: "하늘 붕괴",
      desc: "운석 피해 +2, 주변 피해 범위가 더 넓어진다.",
      requires: ["mage-shard"],
      apply: () => {
        hero("mage").meteorDamage += 2;
        hero("mage").meteorRadius = 2;
      },
    },
    {
      id: "party-mark-push",
      owner: "party",
      route: "궁수+전사",
      name: "표식 돌파",
      desc: "전사가 표식 적을 공격하면 피해 +2, 밀침 +1.",
      requires: ["archer-mark", "warrior-push"],
      apply: () => state.synergy.markPush = true,
    },
    {
      id: "party-mark-chain",
      owner: "party",
      route: "궁수+마법사",
      name: "표식 전도",
      desc: "마법 연쇄가 표식을 함께 복사한다.",
      requires: ["archer-mark", "mage-chain"],
      apply: () => state.synergy.markConduct = true,
    },
    {
      id: "party-burning-trap",
      owner: "party",
      route: "궁수+마법사",
      name: "불타는 함정",
      desc: "함정과 룬이 적에게 화상 2턴을 부여한다.",
      requiresAny: ["archer-trap", "mage-rune"],
      apply: () => state.synergy.burningTrap = true,
    },
    {
      id: "party-collision",
      owner: "party",
      route: "전사+마법사",
      name: "충돌 폭발",
      desc: "전사가 밀친 적 주변에 마법 피해 2.",
      requires: ["warrior-push"],
      apply: () => state.synergy.collisionBurst = true,
    },
    {
      id: "party-rune-dash",
      owner: "party",
      route: "전사+마법사",
      name: "룬 돌진",
      desc: "전사가 적을 밀친 위치에 룬을 남긴다.",
      requires: ["warrior-push", "mage-rune"],
      apply: () => state.synergy.runeDash = true,
    },
    {
      id: "party-encircle",
      owner: "party",
      route: "3인",
      name: "포위 완성",
      desc: "이번 턴에 밀린 표식 적이 마법 피해를 받으면 주변 폭발이 일어난다.",
      requiresAny: ["party-mark-push", "party-mark-chain", "party-rune-dash"],
      apply: () => state.synergy.encircle = true,
    },
  ];

  function makeTiles() {
    const list = [];
    for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q += 1) {
      for (let r = -GRID_RADIUS; r <= GRID_RADIUS; r += 1) {
        if (Math.abs(q + r) <= GRID_RADIUS) list.push({ q, r });
      }
    }
    return list;
  }

  function enemy(kind, q, r) {
    return { kind, q, r };
  }

  function startGame() {
    stopLoop();
    state = {
      wave: 1,
      turn: 1,
      nextId: 1,
      heroes: createHeroes(),
      enemies: [],
      markers: [],
      meteors: [],
      chosenIds: new Set(),
      upgrades: [],
      log: [],
      synergy: {},
      waitingReward: false,
      finished: false,
    };
    elements.rewardOverlay.classList.add("hidden");
    elements.resultOverlay.classList.add("hidden");
    spawnWave();
    log("전투 시작. 영웅들이 자동 루틴을 수행합니다.");
    render();
    loopId = window.setInterval(advanceTurn, TURN_MS);
  }

  function stopLoop() {
    if (loopId) window.clearInterval(loopId);
    loopId = null;
  }

  function createHeroes() {
    return [
      {
        id: "archer",
        side: "hero",
        name: "궁수",
        label: "궁",
        q: -1,
        r: 2,
        hp: 22,
        maxHp: 22,
        move: 2,
        range: 3,
        damage: 3,
        shots: 1,
        repeatBonus: 0,
        markBonus: 0,
        trapDamage: 4,
        className: "archer",
        lastTargetId: null,
      },
      {
        id: "warrior",
        side: "hero",
        name: "전사",
        label: "전",
        q: 0,
        r: 2,
        hp: 34,
        maxHp: 34,
        move: 3,
        range: 1,
        damage: 4,
        push: 0,
        chargeBonus: 0,
        cleaveDamage: 0,
        pushSplash: 0,
        className: "warrior",
      },
      {
        id: "mage",
        side: "hero",
        name: "마법사",
        label: "법",
        q: 1,
        r: 1,
        hp: 22,
        maxHp: 22,
        move: 1,
        retreat: 1,
        range: 3,
        damage: 3,
        chainCount: 0,
        chainDamage: 2,
        runeDamage: 4,
        meteorDamage: 5,
        meteorRadius: 1,
        className: "mage",
      },
    ];
  }

  function spawnWave() {
    state.turn = 1;
    state.markers = [];
    state.meteors = [];
    state.enemies = waveTable[state.wave - 1].map((spawn) => {
      const def = enemyTypes[spawn.kind];
      return {
        id: `enemy-${state.nextId++}`,
        side: "enemy",
        kind: spawn.kind,
        className: def.className,
        name: def.name,
        label: def.label,
        q: spawn.q,
        r: spawn.r,
        hp: def.hp + Math.max(0, state.wave - 2),
        maxHp: def.hp + Math.max(0, state.wave - 2),
        damage: def.damage + Math.floor((state.wave - 1) / 3),
        move: def.move,
        range: def.range,
        threat: def.threat,
      };
    });
    log(`${state.wave} 웨이브 진입. 적 ${state.enemies.length}명.`);
  }

  function advanceTurn() {
    if (!state || state.finished || state.waitingReward) return;
    aliveEnemies().forEach((unit) => {
      unit.pushedThisTurn = false;
      unit.triggeredEncircle = false;
    });
    resolveMeteors();
    applyBurns();
    heroesAct();
    if (checkWaveClear()) return;
    enemiesAct();
    if (checkDefeat()) return;
    if (checkWaveClear()) return;
    state.turn += 1;
    render();
  }

  function heroesAct() {
    actArcher(hero("archer"));
    actWarrior(hero("warrior"));
    actMage(hero("mage"));
  }

  function actArcher(unit) {
    if (!isAlive(unit)) return;
    const nearest = nearestEnemy(unit);
    if (!nearest) return;

    if (distance(unit, nearest) <= 2) {
      moveToBest(unit, unit.move, (pos) => minEnemyDistance(pos) * 10 - distance(pos, center()));
    } else if (!pickArcherTarget(unit)) {
      moveToBest(unit, unit.move, (pos) => -distance(pos, nearest) * 10 + minEnemyDistance(pos));
    }

    if (unit.trapEnabled && state.turn % 3 === 1) placeTrap(unit);

    for (let shot = 0; shot < unit.shots; shot += 1) {
      const target = pickArcherTarget(unit);
      if (!target) {
        if (shot === 0) log("궁수: 사거리 안의 적 없음");
        break;
      }
      const repeat = unit.lastTargetId === target.id ? unit.repeatBonus : 0;
      const markBonus = target.marked ? unit.markBonus : 0;
      const damage = unit.damage + repeat + markBonus;
      const hadMark = target.marked;
      const killed = hit(unit, target, damage, "사격", { kind: "arrow" });
      if (!killed && unit.markOnHit) {
        target.marked = Math.min(3, (target.marked ?? 0) + 1);
        log(`궁수: ${target.name} 표식 ${target.marked}`);
      }
      if (killed && hadMark && unit.markTransfer) transferMark(target);
      unit.lastTargetId = target.id;
    }
  }

  function actWarrior(unit) {
    if (!isAlive(unit)) return;
    const times = unit.extraEvery && unit.hp <= unit.maxHp / 2 && state.turn % unit.extraEvery === 0 ? 2 : 1;
    for (let i = 0; i < times; i += 1) {
      warriorRoutine(unit, i > 0);
      if (!aliveEnemies().length) break;
    }
    if (unit.bloodStorm && state.turn % 4 === 0) {
      const targets = aliveEnemies().filter((enemyUnit) => distance(unit, enemyUnit) <= 1);
      targets.forEach((target) => hit(unit, target, 3, "피의 폭풍", { kind: "melee" }));
      if (targets.length) log(`전사: 피의 폭풍 ${targets.length}명 타격`);
    }
  }

  function warriorRoutine(unit, extraAction = false) {
    const target = pickWarriorTarget(unit);
    if (!target) return;
    const moved = moveToBest(unit, unit.move, (pos) => -Math.abs(distance(pos, target) - 1) * 20 - distance(pos, target));
    const attackTarget = pickWarriorTarget(unit, 1);
    if (!attackTarget) {
      if (!extraAction) log("전사: 아직 근접 대상 없음");
      return;
    }
    const lostHpRatio = (unit.maxHp - unit.hp) / unit.maxHp;
    const berserk = unit.berserkDamage ? Math.floor(lostHpRatio * 4) : 0;
    const charge = moved > 0 ? unit.chargeBonus : 0;
    const cometDamage = unit.comet && moved >= 3 ? 2 : 0;
    const markDamage = state.synergy.markPush && attackTarget.marked ? 2 : 0;
    const damage = unit.damage + berserk + charge + cometDamage + markDamage;
    const killed = hit(unit, attackTarget, damage, extraAction ? "광전 추가 베기" : "베기", { kind: "melee" });
    if (!killed) {
      const pushAmount = unit.push + (unit.comet && moved >= 3 ? 1 : 0) + (state.synergy.markPush && attackTarget.marked ? 1 : 0);
      if (pushAmount > 0) pushEnemy(unit, attackTarget, pushAmount);
    }
    if (unit.cleaveDamage > 0) {
      aliveEnemies()
        .filter((enemyUnit) => enemyUnit.id !== attackTarget.id && distance(attackTarget, enemyUnit) <= 1)
        .forEach((enemyUnit) => hit(unit, enemyUnit, unit.cleaveDamage, "휩쓸기", { kind: "melee" }));
    }
  }

  function actMage(unit) {
    if (!isAlive(unit)) return;
    const nearest = nearestEnemy(unit);
    if (!nearest) return;

    if (distance(unit, nearest) <= 1) {
      moveToBest(unit, unit.retreat, (pos) => minEnemyDistance(pos) * 10 - distance(pos, center()));
    } else if (!pickMageTarget(unit)) {
      moveToBest(unit, unit.move, (pos) => -distance(pos, nearest) * 10 + clusterScore(pos));
    }

    if (unit.runeEnabled && state.turn % 3 === 2) placeRune(unit);
    if (unit.meteorEnabled && state.turn % 4 === 0) callMeteor(unit);

    const first = pickMageTarget(unit);
    if (!first) {
      log("마법사: 사거리 안의 적 없음");
      return;
    }
    mageHit(unit, first, unit.damage, "마력탄");
    let previous = first;
    const chained = new Set([first.id]);
    for (let i = 0; i < unit.chainCount; i += 1) {
      const target = aliveEnemies()
        .filter((enemyUnit) => !chained.has(enemyUnit.id))
        .filter((enemyUnit) => distance(previous, enemyUnit) <= 2 || distance(unit, enemyUnit) <= unit.range)
        .sort((a, b) => enemyScore(b) - enemyScore(a))[0];
      if (!target) break;
      if (state.synergy.markConduct && previous.marked) target.marked = Math.max(target.marked ?? 0, 1);
      mageHit(unit, target, unit.chainDamage, "연쇄");
      chained.add(target.id);
      previous = target;
    }
  }

  function enemiesAct() {
    for (const unit of aliveEnemies()) {
      const target = nearestHero(unit);
      if (!target) continue;
      if (distance(unit, target) > unit.range) {
        const move = Math.max(0, unit.move - (unit.slow ? 1 : 0));
        moveToBest(unit, move, (pos) => -distance(pos, target) * 10);
        if (unit.slow) unit.slow -= 1;
      }
      const attackTarget = nearestHero(unit);
      if (attackTarget && distance(unit, attackTarget) <= unit.range) {
        hit(unit, attackTarget, unit.damage, "공격", { kind: "enemy" });
      }
      triggerMarkersOn(unit);
    }
  }

  function moveToBest(unit, steps, scoreFn) {
    if (steps <= 0) return 0;
    const candidates = reachable(unit, steps, unit);
    const originKey = tileKey(unit);
    const best = candidates
      .map((pos) => ({ pos, score: scoreFn(pos), dist: distance(unit, pos) }))
      .sort((a, b) => b.score - a.score || b.dist - a.dist)[0];
    if (!best || tileKey(best.pos) === originKey) return 0;
    unit.q = best.pos.q;
    unit.r = best.pos.r;
    triggerMarkersOn(unit);
    return best.dist;
  }

  function reachable(origin, steps, movingUnit) {
    const seen = new Map([[tileKey(origin), { q: origin.q, r: origin.r, step: 0 }]]);
    const queue = [{ q: origin.q, r: origin.r, step: 0 }];
    while (queue.length) {
      const current = queue.shift();
      if (current.step >= steps) continue;
      for (const next of neighbors(current)) {
        const nextKey = tileKey(next);
        if (seen.has(nextKey)) continue;
        if (isOccupied(next, movingUnit)) continue;
        seen.set(nextKey, { ...next, step: current.step + 1 });
        queue.push({ ...next, step: current.step + 1 });
      }
    }
    return [...seen.values()].map(({ q, r }) => ({ q, r }));
  }

  function placeTrap(owner) {
    const target = nearestEnemy(owner);
    if (!target) return;
    const tile = bestLaneTile(target, nearestHero(target) ?? owner);
    addMarker({
      kind: "trap",
      ownerId: owner.id,
      q: tile.q,
      r: tile.r,
      damage: owner.trapDamage,
      slow: owner.trapSlow,
      chain: owner.trapChain,
      burn: state.synergy.burningTrap ? 2 : 0,
    });
    log(`궁수: 함정 설치 (${tile.q}, ${tile.r})`);
  }

  function placeRune(owner, tileOverride = null) {
    const tile = tileOverride ?? densestEnemyTile();
    if (!tile) return;
    addMarker({
      kind: "rune",
      ownerId: owner.id,
      q: tile.q,
      r: tile.r,
      damage: owner.runeDamage,
      chain: owner.runeLink,
      burn: state.synergy.burningTrap ? 2 : 0,
    });
    log(`마법사: 룬 설치 (${tile.q}, ${tile.r})`);
  }

  function addMarker(marker) {
    const sameTile = state.markers.find((item) => item.kind === marker.kind && item.q === marker.q && item.r === marker.r);
    if (sameTile) {
      sameTile.damage = Math.max(sameTile.damage, marker.damage);
      sameTile.burn = Math.max(sameTile.burn ?? 0, marker.burn ?? 0);
      return;
    }
    state.markers.push({ id: `marker-${state.nextId++}`, ...marker });
  }

  function callMeteor(owner) {
    const tile = densestEnemyTile();
    if (!tile) return;
    state.meteors.push({
      id: `meteor-${state.nextId++}`,
      ownerId: owner.id,
      q: tile.q,
      r: tile.r,
      timer: 1,
      damage: owner.meteorDamage,
      radius: owner.meteorRadius,
    });
    log(`마법사: 운석 예고 (${tile.q}, ${tile.r})`);
  }

  function resolveMeteors() {
    if (!state.meteors.length) return;
    const remaining = [];
    for (const meteor of state.meteors) {
      meteor.timer -= 1;
      if (meteor.timer > 0) {
        remaining.push(meteor);
        continue;
      }
      const owner = hero(meteor.ownerId);
      const targets = aliveEnemies().filter((enemyUnit) => distance(meteor, enemyUnit) <= meteor.radius);
      let killed = 0;
      targets.forEach((target) => {
        const died = mageHit(owner, target, meteor.damage, "운석");
        if (died) killed += 1;
      });
      if (targets.length) log(`운석: ${targets.length}명 타격`);
      if (killed && owner.meteorRefund) {
        const nextMeteor = state.meteors.find((item) => item.ownerId === owner.id);
        if (nextMeteor) nextMeteor.timer = 0;
      }
    }
    state.meteors = remaining;
  }

  function triggerMarkersOn(unit, alreadyTriggered = new Set()) {
    if (!unit || unit.side !== "enemy" || !isAlive(unit)) return;
    const markers = state.markers.filter((marker) => marker.q === unit.q && marker.r === unit.r && !alreadyTriggered.has(marker.id));
    for (const marker of markers) {
      alreadyTriggered.add(marker.id);
      const owner = hero(marker.ownerId);
      const kindLabel = marker.kind === "trap" ? "함정" : "룬";
      hit(owner, unit, marker.damage, kindLabel, { kind: marker.kind });
      if (marker.slow && isAlive(unit)) unit.slow = Math.max(unit.slow ?? 0, 1);
      if (marker.burn && isAlive(unit)) unit.burn = Math.max(unit.burn ?? 0, marker.burn);
      if (marker.chain) {
        aliveEnemies()
          .filter((enemyUnit) => enemyUnit.id !== unit.id && distance(marker, enemyUnit) <= 1)
          .forEach((enemyUnit) => hit(owner, enemyUnit, Math.max(1, Math.floor(marker.damage / 2)), `${kindLabel} 연쇄`, { kind: marker.kind }));
      }
      if (marker.kind === "rune" && owner.runeLink) {
        state.markers
          .filter((item) => item.kind === "rune" && item.id !== marker.id && distance(marker, item) <= 1)
          .forEach((linked) => {
            aliveEnemies()
              .filter((enemyUnit) => distance(linked, enemyUnit) <= 0)
              .forEach((enemyUnit) => triggerMarkersOn(enemyUnit, alreadyTriggered));
          });
      }
      state.markers = state.markers.filter((item) => item.id !== marker.id);
    }
  }

  function applyBurns() {
    aliveEnemies().forEach((unit) => {
      if (!unit.burn) return;
      hit(hero("mage") ?? hero("archer"), unit, 1, "화상", { kind: "burn" });
      unit.burn -= 1;
    });
  }

  function hit(source, target, amount, label, meta = {}) {
    if (!source || !target || !isAlive(target)) return false;
    const damage = Math.max(1, Math.round(amount));
    target.hp = Math.max(0, target.hp - damage);
    log(`${source.name} ${label}: ${target.name} ${damage} 피해`);
    if (meta.kind === "magic" && state.synergy.encircle && target.marked && target.pushedThisTurn && !target.triggeredEncircle) {
      target.triggeredEncircle = true;
      aliveEnemies()
        .filter((enemyUnit) => enemyUnit.id !== target.id && distance(target, enemyUnit) <= 1)
        .forEach((enemyUnit) => hit(source, enemyUnit, 3, "포위 폭발", { kind: "magic" }));
    }
    if (target.hp <= 0) {
      log(`${target.name} 처치`);
      return true;
    }
    return false;
  }

  function mageHit(source, target, amount, label) {
    return hit(source, target, amount, label, { kind: "magic" });
  }

  function pushEnemy(source, target, steps) {
    if (!isAlive(target)) return;
    let moved = 0;
    for (let i = 0; i < steps; i += 1) {
      const next = neighbors(target)
        .filter((pos) => !isOccupied(pos, target))
        .sort((a, b) => distance(b, source) - distance(a, source))[0];
      if (!next || distance(next, source) <= distance(target, source)) break;
      target.q = next.q;
      target.r = next.r;
      moved += 1;
      target.pushedThisTurn = true;
      triggerMarkersOn(target);
      if (state.synergy.runeDash && hero("mage")?.runeEnabled) placeRune(hero("mage"), target);
    }
    if (moved) {
      log(`전사: ${target.name} ${moved}칸 밀침`);
      const splash = hero("warrior").pushSplash + (state.synergy.collisionBurst ? 2 : 0);
      if (splash > 0) {
        aliveEnemies()
          .filter((enemyUnit) => enemyUnit.id !== target.id && distance(target, enemyUnit) <= 1)
          .forEach((enemyUnit) => hit(source, enemyUnit, splash, "충돌", { kind: "melee" }));
      }
    }
  }

  function transferMark(defeatedTarget) {
    const target = aliveEnemies()
      .filter((enemyUnit) => enemyUnit.id !== defeatedTarget.id)
      .sort((a, b) => enemyScore(b) - enemyScore(a))[0];
    if (!target) return;
    target.marked = Math.max(target.marked ?? 0, 1);
    log(`표식 전이: ${target.name}`);
  }

  function checkWaveClear() {
    if (aliveEnemies().length) return false;
    render();
    if (state.wave >= MAX_WAVE) {
      showResult(true);
      return true;
    }
    state.waitingReward = true;
    stopLoop();
    recoverHeroes();
    render();
    showRewards();
    return true;
  }

  function checkDefeat() {
    if (aliveHeroes().length) return false;
    showResult(false);
    return true;
  }

  function recoverHeroes() {
    state.heroes.forEach((unit) => {
      if (unit.hp <= 0) unit.hp = Math.max(1, Math.floor(unit.maxHp * 0.5));
      else unit.hp = Math.min(unit.maxHp, unit.hp + Math.ceil(unit.maxHp * 0.4));
    });
  }

  function showRewards() {
    const rewards = drawRewards();
    elements.rewardChoices.innerHTML = rewards.map((upgrade) => `
      <button class="reward-choice ${upgrade.owner}" type="button" data-upgrade="${upgrade.id}">
        <strong>${upgrade.name}</strong>
        <span class="chip">${ownerLabel(upgrade.owner)} · ${upgrade.route}</span>
        <p>${upgrade.desc}</p>
      </button>
    `).join("");
    elements.rewardChoices.querySelectorAll("[data-upgrade]").forEach((button) => {
      button.addEventListener("click", () => pickUpgrade(button.dataset.upgrade));
    });
    elements.rewardOverlay.classList.remove("hidden");
  }

  function drawRewards() {
    const pool = upgradeCatalog.filter((upgrade) => isUpgradeAvailable(upgrade));
    const byOwner = ["archer", "warrior", "mage", "party"].flatMap((owner) => {
      const owned = pool.filter((upgrade) => upgrade.owner === owner);
      return shuffle(owned).slice(0, 1);
    });
    const rest = shuffle(pool.filter((upgrade) => !byOwner.includes(upgrade)));
    return [...byOwner, ...rest].slice(0, 3);
  }

  function isUpgradeAvailable(upgrade) {
    if (state.chosenIds.has(upgrade.id)) return false;
    if (upgrade.requires?.some((id) => !state.chosenIds.has(id))) return false;
    if (upgrade.requiresAny?.length && !upgrade.requiresAny.some((id) => state.chosenIds.has(id))) return false;
    return true;
  }

  function pickUpgrade(id) {
    const upgrade = upgradeCatalog.find((item) => item.id === id);
    if (!upgrade) return;
    state.chosenIds.add(upgrade.id);
    state.upgrades.push(upgrade);
    upgrade.apply();
    log(`성장 선택: ${upgrade.name}`);
    elements.rewardOverlay.classList.add("hidden");
    state.waitingReward = false;
    state.wave += 1;
    spawnWave();
    render();
    loopId = window.setInterval(advanceTurn, TURN_MS);
  }

  function showResult(win) {
    state.finished = true;
    stopLoop();
    render();
    elements.resultTitle.textContent = win ? "클리어" : "패배";
    elements.resultText.textContent = win
      ? "자동 루틴과 성장 선택지만으로 마지막 웨이브를 넘겼습니다."
      : "파티가 쓰러졌습니다. 성장 선택의 방향을 바꿔 다시 테스트해보세요.";
    elements.resultOverlay.classList.remove("hidden");
  }

  function render() {
    if (!state) return;
    elements.waveLabel.textContent = `${state.wave}/${MAX_WAVE}`;
    elements.turnLabel.textContent = state.waitingReward || state.finished ? "-" : String(state.turn);
    elements.enemyLabel.textContent = String(aliveEnemies().length);
    renderBoard();
    renderStatus();
    renderUpgrades();
    renderLog();
  }

  function renderBoard() {
    const layout = boardLayout();
    elements.board.style.setProperty("--hex-w", `${layout.hexWidth}px`);
    elements.board.style.setProperty("--hex-h", `${layout.hexHeight}px`);

    const tileHtml = tiles.map((tile) => {
      const point = tilePoint(tile, layout);
      const classes = ["hex", (tile.q + tile.r) % 2 === 0 ? "alt" : "", tile.r >= 1 ? "focus" : ""].filter(Boolean).join(" ");
      return `<div class="${classes}" style="left:${point.x}px;top:${point.y}px"></div>`;
    }).join("");

    const markerHtml = [
      ...state.markers.map((marker) => {
        const point = tilePoint(marker, layout);
        const label = marker.kind === "trap" ? "함" : "룬";
        return `<div class="marker ${marker.kind}" style="--x:${point.x}px;--y:${point.y}px">${label}</div>`;
      }),
      ...state.meteors.map((meteor) => {
        const point = tilePoint(meteor, layout);
        return `<div class="marker meteor" style="--x:${point.x}px;--y:${point.y}px">${meteor.timer}</div>`;
      }),
    ].join("");

    const unitHtml = [...aliveEnemies(), ...aliveHeroes()].map((unit) => {
      const point = tilePoint(unit, layout);
      const status = statusBadges(unit);
      const enemyClass = unit.side === "enemy" ? `enemy ${unit.className ?? ""}` : unit.className;
      return `
        <div class="unit ${enemyClass}" style="--x:${point.x}px;--y:${point.y}px">
          ${status ? `<span class="status">${status}</span>` : ""}
          <span>${unit.label}</span>
          <span class="hp">${unit.hp}</span>
        </div>
      `;
    }).join("");

    elements.board.innerHTML = `${tileHtml}${markerHtml}${unitHtml}`;
  }

  function renderStatus() {
    const archer = hero("archer");
    const warrior = hero("warrior");
    const mage = hero("mage");
    elements.archerStatus.textContent = `HP ${archer.hp}/${archer.maxHp} · 이동${archer.move} · 사거리${archer.range} · ${archer.shots}회`;
    elements.warriorStatus.textContent = `HP ${warrior.hp}/${warrior.maxHp} · 이동${warrior.move} · 피해${warrior.damage}${warrior.push ? ` · 밀침${warrior.push}` : ""}`;
    elements.mageStatus.textContent = `HP ${mage.hp}/${mage.maxHp} · 후퇴${mage.retreat} · 사거리${mage.range}${mage.chainCount ? ` · 연쇄${mage.chainCount}` : ""}`;
  }

  function renderUpgrades() {
    if (!state.upgrades.length) {
      elements.upgradeChips.innerHTML = `<span class="chip">아직 없음</span>`;
      return;
    }
    elements.upgradeChips.innerHTML = state.upgrades
      .slice(-8)
      .map((upgrade) => `<span class="chip">${upgrade.name}</span>`)
      .join("");
  }

  function renderLog() {
    elements.battleLog.innerHTML = state.log.slice(-4).map((line) => `<div>${line}</div>`).join("");
  }

  function boardLayout() {
    const width = elements.board.clientWidth || 380;
    const height = elements.board.clientHeight || 430;
    const size = Math.min(width / 12.4, height / 10.8);
    return {
      width,
      height,
      size,
      hexWidth: Math.sqrt(3) * size * 0.96,
      hexHeight: size * 1.92,
      cx: width / 2,
      cy: height / 2 + 10,
    };
  }

  function tilePoint(pos, layout) {
    return {
      x: layout.cx + layout.size * Math.sqrt(3) * (pos.q + pos.r / 2),
      y: layout.cy + layout.size * 1.5 * pos.r,
    };
  }

  function statusBadges(unit) {
    const badges = [];
    if (unit.marked) badges.push(`<span class="badge">표${unit.marked}</span>`);
    if (unit.burn) badges.push(`<span class="badge">화${unit.burn}</span>`);
    if (unit.slow) badges.push(`<span class="badge">느</span>`);
    return badges.join("");
  }

  function pickArcherTarget(unit) {
    return aliveEnemies()
      .filter((enemyUnit) => distance(unit, enemyUnit) <= unit.range)
      .sort((a, b) => enemyScore(b) - enemyScore(a) || a.hp - b.hp)[0];
  }

  function pickWarriorTarget(unit, range = Infinity) {
    let candidates = aliveEnemies().filter((enemyUnit) => distance(unit, enemyUnit) <= range);
    if (unit.protect) {
      const weakHero = aliveHeroes().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      const threats = candidates.filter((enemyUnit) => weakHero && distance(enemyUnit, weakHero) <= 1);
      if (threats.length) candidates = threats;
    }
    return candidates.sort((a, b) => distance(unit, a) - distance(unit, b) || enemyScore(b) - enemyScore(a))[0];
  }

  function pickMageTarget(unit) {
    return aliveEnemies()
      .filter((enemyUnit) => distance(unit, enemyUnit) <= unit.range)
      .sort((a, b) => clusterScore(b) - clusterScore(a) || enemyScore(b) - enemyScore(a))[0];
  }

  function densestEnemyTile() {
    return aliveEnemies()
      .map((enemyUnit) => ({ q: enemyUnit.q, r: enemyUnit.r, score: clusterScore(enemyUnit) + enemyScore(enemyUnit) }))
      .sort((a, b) => b.score - a.score)[0];
  }

  function bestLaneTile(from, to) {
    return neighbors(from)
      .filter((pos) => !isOccupied(pos))
      .sort((a, b) => distance(a, to) - distance(b, to))[0] ?? { q: from.q, r: from.r };
  }

  function clusterScore(pos) {
    return aliveEnemies().filter((enemyUnit) => distance(pos, enemyUnit) <= 1).length;
  }

  function enemyScore(unit) {
    return (unit.threat ?? 1) * 4 + (unit.marked ? 6 : 0) + (unit.burn ? 2 : 0) + (unit.maxHp - unit.hp);
  }

  function minEnemyDistance(pos) {
    const distances = aliveEnemies().map((enemyUnit) => distance(pos, enemyUnit));
    return distances.length ? Math.min(...distances) : 0;
  }

  function aliveHeroes() {
    return state.heroes.filter(isAlive);
  }

  function aliveEnemies() {
    return state.enemies.filter(isAlive);
  }

  function hero(id) {
    return state.heroes.find((unit) => unit.id === id);
  }

  function nearestEnemy(unit) {
    return aliveEnemies().sort((a, b) => distance(unit, a) - distance(unit, b) || enemyScore(b) - enemyScore(a))[0];
  }

  function nearestHero(unit) {
    return aliveHeroes().sort((a, b) => distance(unit, a) - distance(unit, b) || a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }

  function isAlive(unit) {
    return unit && unit.hp > 0;
  }

  function isOccupied(pos, except = null) {
    return [...aliveHeroes(), ...aliveEnemies()].some((unit) => unit !== except && unit.q === pos.q && unit.r === pos.r);
  }

  function neighbors(pos) {
    return DIRS
      .map((dir) => ({ q: pos.q + dir.q, r: pos.r + dir.r }))
      .filter((next) => tileKeys.has(tileKey(next)));
  }

  function center() {
    return { q: 0, r: 0 };
  }

  function distance(a, b) {
    const aq = a.q;
    const ar = a.r;
    const as = -aq - ar;
    const bq = b.q;
    const br = b.r;
    const bs = -bq - br;
    return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs(as - bs));
  }

  function tileKey(pos) {
    return `${pos.q},${pos.r}`;
  }

  function ownerLabel(owner) {
    return {
      archer: "궁수",
      warrior: "전사",
      mage: "마법사",
      party: "파티",
    }[owner] ?? owner;
  }

  function shuffle(items) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  function log(message) {
    state.log.push(message);
    if (state.log.length > 24) state.log.shift();
  }

  elements.restartButton.addEventListener("click", startGame);
  elements.retryButton.addEventListener("click", startGame);
  window.addEventListener("resize", render);
  startGame();
})();
