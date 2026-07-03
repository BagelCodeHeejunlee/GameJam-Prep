(() => {
  window.scrollTo(0, 0);

  const ICONS = {
    attack: { label: "공격", mark: "공", className: "icon-attack" },
    heal: { label: "회복", mark: "회", className: "icon-heal" },
    defense: { label: "방어", mark: "갑", className: "icon-defense" },
    special: { label: "특수", mark: "특", className: "icon-special" },
  };

  const KNIFE_TYPES = {
    h2: {
      label: "가로 2",
      segments: [
        { orientation: "h", x: 0, y: 0 },
        { orientation: "h", x: 1, y: 0 },
      ],
    },
    h3: {
      label: "가로 3",
      segments: [
        { orientation: "h", x: 0, y: 0 },
        { orientation: "h", x: 1, y: 0 },
        { orientation: "h", x: 2, y: 0 },
      ],
    },
    v2: {
      label: "세로 2",
      segments: [
        { orientation: "v", x: 0, y: 0 },
        { orientation: "v", x: 0, y: 1 },
      ],
    },
    v3: {
      label: "세로 3",
      segments: [
        { orientation: "v", x: 0, y: 0 },
        { orientation: "v", x: 0, y: 1 },
        { orientation: "v", x: 0, y: 2 },
      ],
    },
    l3: {
      label: "ㄱ 3",
      segments: [
        { orientation: "h", x: 0, y: 0 },
        { orientation: "h", x: 1, y: 0 },
        { orientation: "v", x: 2, y: 0 },
      ],
    },
    l4: {
      label: "ㄱ 4",
      segments: [
        { orientation: "h", x: 0, y: 0 },
        { orientation: "h", x: 1, y: 0 },
        { orientation: "v", x: 2, y: 0 },
        { orientation: "v", x: 2, y: 1 },
      ],
    },
  };

  const BASE_BOARD_CELLS = [
    c(3, 2),
    c(4, 2),
    c(3, 3),
    c(4, 3),
  ];

  const BASE_KNIVES = [
    { type: "h2", x: 2, y: 2 },
    { type: "v2", x: 4, y: 2 },
  ];

  const LINK_META = {
    heal: { label: "회복", mark: "회", className: "link-heal" },
    attack: { label: "공격", mark: "공", className: "link-attack" },
    defense: { label: "방어", mark: "방", className: "link-defense" },
  };

  const REWARDS = {
    expand1: { id: "expand1", title: "한 칸 추가", text: "1칸 재료를 도시락 판에 직접 붙입니다.", type: "expand", shape: [{ x: 0, y: 0 }] },
    expand2: { id: "expand2", title: "두 칸 추가", text: "2칸 직선 재료를 회전해 붙입니다.", type: "expand", shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
    linkHeal: { id: "linkHeal", title: "회복 링크", text: "인접한 2칸을 회복 링크로 바꿉니다. 링크를 자르면 체력 1 회복.", type: "link", linkType: "heal" },
    linkAttack: { id: "linkAttack", title: "공격 링크", text: "인접한 2칸을 공격 링크로 바꿉니다. 링크를 자르면 1칸 조각 생성.", type: "link", linkType: "attack" },
    linkDefense: { id: "linkDefense", title: "방어 링크", text: "인접한 2칸을 방어 링크로 바꿉니다. 링크를 자르면 쉴드 1 획득.", type: "link", linkType: "defense" },
    growH: { id: "growH", title: "가로 칼 성장", text: "가로 칼 하나의 길이를 2에서 3으로 늘립니다.", type: "knife", from: "h2", to: "h3" },
    growV: { id: "growV", title: "세로 칼 성장", text: "세로 칼 하나의 길이를 2에서 3으로 늘립니다.", type: "knife", from: "v2", to: "v3" },
    bendL: { id: "bendL", title: "ㄱ자 칼 변형", text: "직선 칼 하나를 짧은 ㄱ자 칼로 바꿉니다.", type: "knifeAny", to: "l3" },
    growL: { id: "growL", title: "ㄱ자 칼 성장", text: "ㄱ자 칼을 더 긴 ㄱ자 칼로 늘립니다.", type: "knife", from: "l3", to: "l4" },
    silentRefill: { id: "silentRefill", title: "무음 재충전", text: "전투당 1회 새 판 요청 시 몬스터 액션을 무시합니다.", type: "silentRefill", rarity: "rare" },
  };

  const BASE_MAX_HP = 24;
  const BOARD_GAP = 3;
  const MONSTER_BOARD_COLS = 8;
  const MONSTER_BOARD_ROWS = 6;
  const CUT_BOARD_COLS = 8;
  const CUT_BOARD_ROWS = 6;
  const DRAG_POINTER_OFFSET = 44;
  const MAX_CUTS_PER_TURN = 1;
  const MONSTER_HEAL_PER_ACTION = 1;
  const MONSTER_ARMOR_PER_ACTION = 1;
  const LINK_TRIGGER_LIMIT_PER_CUT = 2;
  const MIN_CELL_SIZE = 22;
  const MAX_CELL_SIZE = 42;
  const COMPACT_HEIGHT = 760;
  const TINY_HEIGHT = 680;
  const WAVES_PER_STAGE = 5;
  const BOSS_MONSTER_ID = "stone-ogre";
  const MONSTER_ROTATION = ["tiny-berry-imp", "tiny-jelly-block", "iron-goblin", "swamp-slime"];
  const ADVANCED_MONSTER_ROTATION = ["hook-mantis", "hollow-mask", "spine-serpent", "patchwork-crab", "rune-bulwark"];
  const MONSTER_EDITOR_STORAGE_KEY = "bento-monster-editor-data-v2";
  const STAGE_EDITOR_STORAGE_KEY = "bento-stage-editor-data-v1";

  const HERO_LEVEL_RULES = {
    default: {
      maxLevel: 50,
      specialEvery: 10,
      hp: { base: BASE_MAX_HP, perLevel: 2 },
      goldCost: {
        normalBase: 450,
        normalPerLevel: 85,
        specialBase: 2000,
        specialPerLevel: 120,
      },
      shardCost: {
        specialBase: 30,
        specialPerTier: 20,
      },
      fallbackShardMilestone: 30,
    },
  };

  const MONSTER_DEFS = [
    {
      id: "tiny-berry-imp",
      name: "외눈 베리 임프",
      sub: "작은 몸이지만 공격 표식은 먼저 막아라",
      image: "assets/monsters/tiny-berry-imp-3cell.png",
      cols: 2,
      rows: 2,
      baseAttack: 1,
      levels: monsterLevelTrack(1, {
        1: { actions: ["attack"] },
        2: { note: "공격 표식 개방", actions: ["attack", "attack"], boardConditions: { icons: [c(1, 0, "attack")] } },
        5: { note: "공격 표식 증가", boardConditions: { icons: [c(1, 1, "attack")] } },
        9: { note: "회복 표식 개방", actions: ["attack", "heal", "attack"], boardConditions: { icons: [c(0, 1, "heal")] } },
      }),
      actions: ["attack"],
      cells: [
        c(1, 0),
        c(0, 1),
        c(1, 1),
      ],
      special(state, count) {
        const damage = takeDamage(count + 1);
        addLog(`베리 임프가 눈빛으로 ${damage} 피해를 줬다.`);
      },
    },
    {
      id: "tiny-jelly-block",
      name: "젤리 블록",
      sub: "작은 사각 몸통을 깔끔하게 채워라",
      image: "assets/monsters/tiny-jelly-block-4cell.png",
      cols: 2,
      rows: 2,
      baseAttack: 1,
      levels: monsterLevelTrack(1, {
        1: { actions: ["attack"] },
        2: { note: "회복 표식 개방", actions: ["attack", "heal"], boardConditions: { icons: [c(0, 0, "heal")] } },
        4: { note: "공격 표식 개방", actions: ["heal", "attack"], boardConditions: { icons: [c(1, 1, "attack")] } },
        7: { note: "갑피 표식 개방", actions: ["heal", "attack", "defense"], boardConditions: { icons: [c(1, 0, "defense")] } },
      }),
      actions: ["attack"],
      cells: [
        c(0, 0),
        c(1, 0),
        c(0, 1),
        c(1, 1),
      ],
      special(state, count) {
        const blocks = chooseOpenCells(count);
        blocks.forEach((cellKey) => state.blocked.add(cellKey));
        addLog(`젤리 블록이 ${blocks.length}칸을 말랑하게 막았다.`);
      },
    },
    {
      id: "iron-goblin",
      name: "철갑 고블린",
      sub: "작은 몸통의 주먹부터 막아라",
      image: "assets/monsters/iron-goblin.png",
      cols: 3,
      rows: 3,
      baseAttack: 2,
      levels: monsterLevelTrack(2, {
        1: { actions: ["attack"] },
        2: { note: "공격 표식 개방", actions: ["attack", "attack"], boardConditions: { icons: [c(1, 0, "attack")] } },
        3: { note: "갑피 표식 개방", actions: ["attack", "defense", "attack"], boardConditions: { icons: [c(1, 1, "defense")] } },
        5: { note: "회복 표식 개방", actions: ["attack", "defense", "attack", "heal"], boardConditions: { icons: [c(0, 2, "heal")] } },
        7: { note: "공격 표식 증가", boardConditions: { icons: [c(2, 2, "attack")] } },
        10: { note: "갑피 표식 증가", boardConditions: { icons: [c(1, 2, "defense")] } },
        13: { note: "공격 표식 강화", boardConditions: { icons: [c(2, 1, "attack")] } },
      }),
      actions: ["attack"],
      cells: [
        c(1, 0),
        c(0, 1),
        c(1, 1),
        c(2, 1),
        c(0, 2),
        c(1, 2),
        c(2, 2),
      ],
      special(state, count) {
        const damage = takeDamage(count + 1);
        addLog(`고블린이 위협 공격을 했다. 특수 표식 ${count}개로 ${damage} 피해.`);
      },
    },
    {
      id: "swamp-slime",
      name: "늪지 점액술사",
      sub: "회복 표식을 방치하면 재료가 말린다",
      image: "assets/monsters/swamp-slime.png",
      cols: 4,
      rows: 4,
      baseAttack: 1,
      levels: monsterLevelTrack(1, {
        1: { actions: ["attack"] },
        2: { note: "회복 표식 개방", actions: ["attack", "heal"], boardConditions: { icons: [c(2, 0, "heal")] } },
        3: { note: "공격 표식 개방", actions: ["heal", "attack"], boardConditions: { icons: [c(1, 0, "attack")] } },
        4: { note: "갑피 표식 개방", actions: ["heal", "attack", "defense"], boardConditions: { icons: [c(1, 1, "defense")] } },
        6: { note: "공격 표식 증가", boardConditions: { icons: [c(3, 1, "attack")] } },
        8: { note: "회복 표식 증가", boardConditions: { icons: [c(2, 3, "heal")] } },
        11: { note: "갑피 표식 증가", boardConditions: { icons: [c(3, 2, "defense")] } },
        14: { note: "공격 표식 추가", boardConditions: { icons: [c(0, 2, "attack")] } },
      }),
      actions: ["attack"],
      cells: [
        c(1, 0),
        c(2, 0),
        c(0, 1),
        c(1, 1),
        c(2, 1),
        c(3, 1),
        c(1, 2),
        c(2, 2),
        c(3, 2),
        c(1, 3),
        c(2, 3),
      ],
      special(state, count) {
        const blocks = chooseOpenCells(count + 1);
        blocks.forEach((cellKey) => state.blocked.add(cellKey));
        addLog(`점액이 굳어 다음 턴 ${blocks.length}칸을 막았다.`);
      },
    },
    {
      id: "stone-ogre",
      name: "돌껍질 오우거",
      sub: "큰 몸이지만 낭비할 재료는 적다",
      image: "assets/monsters/stone-ogre.png",
      cols: 5,
      rows: 4,
      baseAttack: 3,
      levels: monsterLevelTrack(3, {
        1: { actions: ["attack"] },
        2: { note: "갑피 표식 개방", actions: ["attack", "defense"], boardConditions: { icons: [c(2, 0, "defense")] } },
        3: { note: "공격 표식 개방", actions: ["attack", "defense", "attack"], boardConditions: { icons: [c(0, 2, "attack")] } },
        4: { note: "회복 표식 개방", actions: ["attack", "defense", "attack", "heal"], boardConditions: { icons: [c(3, 1, "heal")] } },
        5: { note: "보스 특수 표식 개방", actions: ["attack", "defense", "special", "attack", "heal"], boardConditions: { icons: [c(2, 2, "special")] } },
        7: { note: "공격 표식 증가", boardConditions: { icons: [c(4, 2, "attack")] } },
        9: { note: "갑피 표식 증가", boardConditions: { icons: [c(1, 3, "defense")] } },
        11: { note: "특수 표식 증가", boardConditions: { icons: [c(3, 3, "special")] } },
        14: { note: "공격 표식 추가", boardConditions: { icons: [c(2, 3, "attack")] } },
      }),
      actions: ["attack"],
      cells: [
        c(2, 0),
        c(1, 1),
        c(2, 1),
        c(3, 1),
        c(0, 2),
        c(1, 2),
        c(2, 2),
        c(3, 2),
        c(4, 2),
        c(1, 3),
        c(2, 3),
        c(3, 3),
      ],
      special(state, count) {
        const spoiled = spoilMaterial(count + 1);
        if (spoiled > 0) {
          addLog(`오우거가 재료 ${spoiled}칸을 짓눌렀다.`);
        } else {
          const damage = takeDamage(count + 2);
          addLog(`짓누를 재료가 없어 충격파로 ${damage} 피해를 받았다.`);
        }
      },
    },
    {
      id: "hook-mantis",
      name: "갈고리 사마귀",
      sub: "꺾인 팔과 떨어진 발톱이 작은 조각을 요구한다",
      image: "assets/monsters/hook-mantis.png",
      cols: 3,
      rows: 4,
      baseAttack: 2,
      levels: monsterLevelTrack(2, {
        1: { actions: ["attack"] },
        3: { note: "갈고리 공격 표식", actions: ["attack", "attack"], boardConditions: { icons: [c(2, 0, "attack")] } },
        5: { note: "떨어진 발톱 갑피", actions: ["attack", "defense", "attack"], boardConditions: { icons: [c(0, 2, "defense")] } },
        8: { note: "갈고리 묶기", actions: ["attack", "special", "attack"], boardConditions: { icons: [c(1, 3, "special")] } },
        12: { note: "공격 표식 추가", boardConditions: { icons: [c(2, 2, "attack")] } },
      }),
      actions: ["attack"],
      cells: [
        c(0, 0),
        c(1, 0),
        c(2, 0),
        c(2, 1),
        c(0, 2),
        c(2, 2),
        c(1, 3),
        c(2, 3),
      ],
      special(state, count, monster) {
        const blocks = chooseArmorBlocks(count + 1, monster.instanceId);
        blocks.forEach((cellKey) => state.blocked.add(cellKey));
        addLog(`갈고리 사마귀가 ${blocks.length}칸을 걸어 잠갔다.`);
      },
    },
    {
      id: "hollow-mask",
      name: "공허 가면",
      sub: "가운데 빈 고리 몸체가 큰 조각을 낭비하게 만든다",
      image: "assets/monsters/hollow-mask.png",
      cols: 4,
      rows: 4,
      baseAttack: 2,
      levels: monsterLevelTrack(2, {
        1: { actions: ["attack"] },
        3: { note: "회복 표식 개방", actions: ["attack", "heal"], boardConditions: { icons: [c(0, 1, "heal")] } },
        5: { note: "고리 공격 표식", actions: ["heal", "attack", "attack"], boardConditions: { icons: [c(3, 2, "attack")] } },
        8: { note: "공허 되감기", actions: ["attack", "special", "heal"], boardConditions: { icons: [c(2, 3, "special")] } },
        12: { note: "회복 표식 증가", boardConditions: { icons: [c(1, 0, "heal")] } },
      }),
      actions: ["attack"],
      cells: [
        c(1, 0),
        c(2, 0),
        c(0, 1),
        c(3, 1),
        c(0, 2),
        c(3, 2),
        c(1, 3),
        c(2, 3),
      ],
      special(state, count, monster) {
        const targets = chooseHealTargets(count + 1, monster.instanceId);
        targets.forEach((cellKey) => uncoverMonsterCell(cellKey));
        state.coverOrder = state.coverOrder.filter((cellKey) => !targets.includes(cellKey));
        prunePlacedPieces();
        addLog(`공허 가면이 ${targets.length}칸을 다시 비웠다.`);
      },
    },
    {
      id: "spine-serpent",
      name: "가시 등뼈 뱀",
      sub: "대각으로 이어진 몸통이 길쭉한 조각을 흔든다",
      image: "assets/monsters/spine-serpent.png",
      cols: 5,
      rows: 5,
      baseAttack: 2,
      levels: monsterLevelTrack(2, {
        1: { actions: ["attack"] },
        3: { note: "머리 공격 표식", actions: ["attack", "attack"], boardConditions: { icons: [c(0, 0, "attack")] } },
        5: { note: "꼬리 회복 표식", actions: ["attack", "heal", "attack"], boardConditions: { icons: [c(4, 4, "heal")] } },
        8: { note: "가시 털기", actions: ["attack", "special", "attack"], boardConditions: { icons: [c(2, 2, "special")] } },
        12: { note: "중앙 갑피 표식", boardConditions: { icons: [c(3, 2, "defense")] } },
      }),
      actions: ["attack"],
      cells: [
        c(0, 0),
        c(1, 0),
        c(1, 1),
        c(2, 2),
        c(3, 2),
        c(3, 3),
        c(4, 4),
      ],
      special(state, count) {
        const spoiled = spoilMaterial(count + 1);
        if (spoiled > 0) {
          addLog(`가시 등뼈 뱀이 재료 ${spoiled}칸을 긁어냈다.`);
        } else {
          const damage = takeDamage(count + 2);
          addLog(`긁을 재료가 없어 가시로 ${damage} 피해를 줬다.`);
        }
      },
    },
    {
      id: "patchwork-crab",
      name: "조각게",
      sub: "넓게 흩어진 등껍질이 남는 조각을 만든다",
      image: "assets/monsters/patchwork-crab.png",
      cols: 5,
      rows: 3,
      baseAttack: 2,
      levels: monsterLevelTrack(2, {
        1: { actions: ["attack"] },
        3: { note: "집게 공격 표식", actions: ["attack", "attack"], boardConditions: { icons: [c(0, 1, "attack")] } },
        5: { note: "껍질 갑피 표식", actions: ["attack", "defense", "attack"], boardConditions: { icons: [c(2, 1, "defense")] } },
        8: { note: "조각 고정", actions: ["defense", "special", "attack"], boardConditions: { icons: [c(4, 1, "special")] } },
        12: { note: "회복 표식 추가", boardConditions: { icons: [c(2, 2, "heal")] } },
      }),
      actions: ["attack"],
      cells: [
        c(1, 0),
        c(3, 0),
        c(0, 1),
        c(1, 1),
        c(2, 1),
        c(3, 1),
        c(4, 1),
        c(0, 2),
        c(2, 2),
        c(4, 2),
      ],
      special(state, count, monster) {
        const blocks = chooseArmorBlocks(count + 2, monster.instanceId);
        blocks.forEach((cellKey) => state.blocked.add(cellKey));
        addLog(`조각게가 등껍질을 세워 ${blocks.length}칸을 막았다.`);
      },
    },
    {
      id: "rune-bulwark",
      name: "룬 갑피수",
      sub: "두꺼운 룬 껍질과 빈틈이 회수 타이밍을 압박한다",
      image: "assets/monsters/rune-bulwark.png",
      cols: 4,
      rows: 4,
      baseAttack: 3,
      levels: monsterLevelTrack(3, {
        1: { actions: ["attack"] },
        3: { note: "갑피 표식 개방", actions: ["attack", "defense"], boardConditions: { icons: [c(2, 1, "defense")] } },
        5: { note: "룬 공격 표식", actions: ["defense", "attack", "attack"], boardConditions: { icons: [c(0, 2, "attack")] } },
        8: { note: "룬 봉인", actions: ["attack", "special", "defense"], boardConditions: { icons: [c(1, 3, "special")] } },
        12: { note: "갑피 표식 증가", boardConditions: { icons: [c(3, 2, "defense")] } },
      }),
      actions: ["attack"],
      cells: [
        c(1, 0),
        c(2, 0),
        c(0, 1),
        c(1, 1),
        c(2, 1),
        c(3, 1),
        c(0, 2),
        c(2, 2),
        c(3, 2),
        c(1, 3),
        c(2, 3),
      ],
      special(state, count, monster) {
        const blocks = chooseArmorBlocks(count + 2, monster.instanceId);
        if (blocks.length) {
          blocks.forEach((cellKey) => state.blocked.add(cellKey));
          addLog(`룬 갑피수가 룬으로 ${blocks.length}칸을 봉인했다.`);
          return;
        }
        const damage = takeDamage(count + 2);
        addLog(`막을 칸이 없어 룬 충격으로 ${damage} 피해를 줬다.`);
      },
    },
  ];

  applyMonsterEditorOverrides(MONSTER_DEFS);

  const MONSTERS_BY_ID = new Map(MONSTER_DEFS.map((monster) => [monster.id, monster]));

  const STAGE_DEFS = [
    {
      id: "forest-1-1",
      name: "도시락 숲",
      title: "도시락 숲 1-1",
      chapter: 1,
      stage: 1,
      recommendedLevel: 1,
      staminaCost: 1,
      clearReward: { gold: 1200, heroShards: 2 },
      waves: createStageWaves("forest-1-1", 0),
    },
    {
      id: "forest-1-2",
      name: "도시락 숲",
      title: "도시락 숲 1-2",
      chapter: 1,
      stage: 2,
      recommendedLevel: 2,
      staminaCost: 1,
      clearReward: { gold: 1400, heroShards: 2 },
      waves: createStageWaves("forest-1-2", 1),
    },
    {
      id: "forest-1-3",
      name: "도시락 숲",
      title: "도시락 숲 1-3",
      chapter: 1,
      stage: 3,
      recommendedLevel: 3,
      staminaCost: 1,
      clearReward: { gold: 1600, heroShards: 3 },
      waves: createStageWaves("forest-1-3", 2),
    },
    {
      id: "forest-1-4",
      name: "도시락 숲",
      title: "도시락 숲 1-4",
      chapter: 1,
      stage: 4,
      recommendedLevel: 4,
      staminaCost: 1,
      clearReward: { gold: 1800, heroShards: 3 },
      waves: createStageWaves("forest-1-4", MONSTER_ROTATION.length),
    },
    {
      id: "forest-1-5",
      name: "도시락 숲",
      title: "도시락 숲 1-5",
      chapter: 1,
      stage: 5,
      recommendedLevel: 5,
      staminaCost: 1,
      clearReward: { gold: 2000, heroShards: 3 },
      waves: createStageWaves("forest-1-5", MONSTER_ROTATION.length + 1),
    },
  ];

  applyStageEditorOverrides(STAGE_DEFS);

  const STAGES_BY_ID = new Map(STAGE_DEFS.map((stage) => [stage.id, stage]));

  const HERO_DEFS = [
    {
      id: "mina",
      name: "Mina",
      icon: "🍱",
      grade: 3,
      levelRule: "default",
      unlockShardCost: 50,
      tag: "균형",
      board: {
        baseCells: BASE_BOARD_CELLS,
        growth: [
          { level: 10, cells: [c(2, 2), c(5, 3)] },
          { level: 20, cells: [c(1, 2), c(3, 4)] },
        ],
      },
      knives: { base: [{ type: "h2" }, { type: "v2" }] },
    },
    {
      id: "taro",
      name: "Taro",
      icon: "🥢",
      grade: 2,
      levelRule: "default",
      unlockShardCost: 50,
      tag: "직선",
      board: {
        baseCells: [c(2, 2), c(3, 2), c(4, 2), c(3, 3)],
        growth: [{ level: 10, cells: [c(4, 1), c(3, 4)] }],
      },
      knives: { base: [{ type: "h2" }, { type: "h2" }] },
    },
    {
      id: "luna",
      name: "Luna",
      icon: "🍙",
      grade: 3,
      levelRule: "default",
      unlockShardCost: 50,
      tag: "링크",
      board: {
        baseCells: [c(2, 2), c(3, 2), c(4, 2), c(2, 3)],
        growth: [{ level: 10, cells: [c(3, 1), c(4, 3)] }],
      },
      knives: { base: [{ type: "v2" }, { type: "l3" }] },
    },
    {
      id: "bori",
      name: "Bori",
      icon: "🍚",
      grade: 1,
      levelRule: "default",
      unlockShardCost: 50,
      tag: "작은 판",
      board: {
        baseCells: [c(3, 2), c(4, 2), c(3, 3), c(4, 3)],
        growth: [{ level: 10, cells: [c(2, 2), c(5, 3)] }],
      },
      knives: { base: [{ type: "h2" }, { type: "v2" }] },
    },
    {
      id: "nori",
      name: "Nori",
      icon: "?",
      grade: 4,
      levelRule: "default",
      unlockShardCost: 50,
      tag: "잠김",
      board: {
        baseCells: [c(3, 2), c(4, 2), c(3, 3), c(4, 3)],
        growth: [{ level: 10, cells: [c(2, 3), c(5, 3)] }],
      },
      knives: { base: [{ type: "h2" }, { type: "v2" }] },
    },
  ];

  const HERO_PROGRESS_INITIAL = {
    mina: { level: 1, shards: 24, unlocked: true },
    taro: { level: 1, shards: 18, unlocked: true },
    luna: { level: 1, shards: 31, unlocked: true },
    bori: { level: 1, shards: 8, unlocked: true },
    nori: { level: 1, shards: 12, unlocked: false },
  };

  const META_INITIAL = {
    gold: 12400,
    gems: 320,
    stamina: 18,
    maxStamina: 20,
    selectedStageId: "forest-1-1",
    unlockedStageIds: ["forest-1-1", "forest-1-2", "forest-1-3", "forest-1-4", "forest-1-5"],
    rewardReadyByStageId: {},
  };

  const els = {
    appShell: document.querySelector(".app-shell"),
    metaScreen: document.querySelector("#metaScreen"),
    metaContent: document.querySelector("#metaContent"),
    goldLabel: document.querySelector("#goldLabel"),
    gemLabel: document.querySelector("#gemLabel"),
    staminaLabel: document.querySelector("#staminaLabel"),
    metaSettingsButton: document.querySelector("#metaSettingsButton"),
    metaTabs: [...document.querySelectorAll(".meta-tab")],
    restartButton: document.querySelector("#restartButton"),
    stageLabel: document.querySelector("#stageLabel"),
    hpLabel: document.querySelector("#hpLabel"),
    materialLabel: document.querySelector("#materialLabel"),
    pieceCountLabel: document.querySelector("#pieceCountLabel"),
    monsterSub: document.querySelector("#monsterSub"),
    monsterName: document.querySelector("#monsterName"),
    completionLabel: document.querySelector("#completionLabel"),
    completionFill: document.querySelector("#completionFill"),
    actionCard: document.querySelector("#actionCard"),
    monsterSection: document.querySelector(".monster-section"),
    monsterGrid: document.querySelector("#monsterGrid"),
    waveTracker: document.querySelector("#waveTracker"),
    workbench: document.querySelector(".workbench"),
    materialBoard: document.querySelector("#materialBoard"),
    materialGrid: document.querySelector("#materialGrid"),
    cutLayer: document.querySelector("#cutLayer"),
    knifeLayer: document.querySelector("#knifeLayer"),
    cutButton: document.querySelector("#cutButton"),
    newBoardButton: document.querySelector("#newBoardButton"),
    endTurnButton: document.querySelector("#endTurnButton"),
    hpControlLabel: document.querySelector("#hpControlLabel"),
    cutCountLabel: document.querySelector("#cutCountLabel"),
    knifeHint: document.querySelector("#knifeHint"),
    battleLog: document.querySelector("#battleLog"),
    overlay: document.querySelector("#overlay"),
    resultModal: document.querySelector(".result-modal"),
    resultEyebrow: document.querySelector("#resultEyebrow"),
    resultTitle: document.querySelector("#resultTitle"),
    resultText: document.querySelector("#resultText"),
    rewardChoices: document.querySelector("#rewardChoices"),
    resultButton: document.querySelector("#resultButton"),
    rewardTray: document.querySelector("#rewardTray"),
    rewardItems: document.querySelector("#rewardItems"),
    rewardDoneButton: document.querySelector("#rewardDoneButton"),
    dragGhost: document.querySelector("#dragGhost"),
  };

  const metaState = {
    activeTab: "main",
    view: "main",
    heroes: HERO_DEFS.map(createHeroInstance),
    deployedHeroId: "mina",
    selectedHeroId: "mina",
    resources: createInitialResources(),
  };

  const state = {
    stageIndex: 0,
    waveIndex: 0,
    roundIndex: 0,
    turn: 1,
    actionIndex: 0,
    cutsUsed: 0,
    playerHp: BASE_MAX_HP,
    monsterCells: new Map(),
    monsterInstances: [],
    boardCells: new Set(),
    boardCellTypes: new Map(),
    boardLinks: new Map(),
    knifeLoadout: [],
    silentRefillUpgrades: 0,
    silentRefills: 0,
    shield: 0,
    materialCols: 5,
    materialRows: 4,
    materialOrigin: { x: 0, y: 0 },
    materialPieces: [],
    missingCells: new Set(),
    spoiledCells: new Set(),
    knives: [],
    placedPieces: [],
    blocked: new Set(),
    turnActions: new Map(),
    coverOrder: [],
    log: [],
    pendingLogs: [],
    boardEffects: [],
    resultMode: null,
    rewardOptions: [],
    boardEdit: null,
    roundTransition: null,
    nextPieceId: 1,
    nextPlacementId: 1,
    initialMaterialTotal: 0,
    draggingPieceId: null,
    draggingPlacementId: null,
    draggingRewardItemId: null,
    selectedPlacementId: null,
    dropPreview: null,
    knifePreview: null,
    drag: null,
    cellSize: 0,
  };

  let resizeFrame = null;
  let resizeTimer = null;
  let layoutStabilizeFrame = null;
  let layoutStabilizePasses = 0;
  let inputActive = false;
  let pendingResponsiveRender = false;
  let lastViewportSize = { width: 0, height: 0 };

  function c(x, y, icon = null) {
    return { x, y, icon };
  }

  function key(x, y) {
    return `${x},${y}`;
  }

  function fromKey(cellKey) {
    const [x, y] = cellKey.split(",").map(Number);
    return { x, y };
  }

  function uniqueValues(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function monsterLevelTrack(baseAttack, events = {}, maxLevel = 16) {
    const levels = [];
    let actions = ["attack"];
    for (let level = 1; level <= maxLevel; level += 1) {
      const event = events[level] || {};
      if (Array.isArray(event.actions) && event.actions.length) actions = [...event.actions];
      const profile = {
        minLevel: level,
        attack: Number.isFinite(event.attack) ? event.attack : baseAttack + Math.floor((level - 1) / 3),
        actions: [...actions],
      };
      if (event.note) profile.note = event.note;
      if (event.boardConditions) profile.boardConditions = event.boardConditions;
      levels.push(profile);
    }
    return levels;
  }

  function applyMonsterEditorOverrides(monsters) {
    let saved;
    try {
      saved = JSON.parse(window.localStorage?.getItem(MONSTER_EDITOR_STORAGE_KEY) || "null");
    } catch {
      return;
    }
    if (!Array.isArray(saved?.monsters)) return;

    saved.monsters.forEach((editedMonster) => {
      const monster = monsters.find((item) => item.id === editedMonster.id);
      if (!monster) return;
      monster.name = cleanMonsterText(editedMonster.name, monster.name);
      monster.sub = cleanMonsterText(editedMonster.sub, monster.sub);
      monster.cols = clampInteger(editedMonster.cols, 1, 8, monster.cols);
      monster.rows = clampInteger(editedMonster.rows, 1, 8, monster.rows);
      monster.baseAttack = clampInteger(editedMonster.baseAttack, 0, 99, monster.baseAttack);
      monster.actions = normalizeMonsterActions(editedMonster.actions, monster.actions);
      monster.cells = normalizeMonsterCells(editedMonster.cells, monster.cols, monster.rows);
      monster.levels = normalizeMonsterLevels(editedMonster.levels, monster.cols, monster.rows, monster.baseAttack);
    });
  }

  function applyStageEditorOverrides(stages) {
    let saved;
    try {
      saved = JSON.parse(window.localStorage?.getItem(STAGE_EDITOR_STORAGE_KEY) || "null");
    } catch {
      return;
    }
    const stageMap = saved?.stages || {};
    stages.forEach((stage) => {
      const savedStage = stageMap[stage.id];
      if (!Array.isArray(savedStage?.waves)) return;
      const waves = normalizeStageEditorWaves(savedStage.waves, stage.id);
      if (waves.length) stage.waves = waves;
      stage.title = cleanMonsterText(savedStage.title, stage.title);
    });
    Object.entries(stageMap).forEach(([stageId, savedStage]) => {
      if (stages.some((stage) => stage.id === stageId) || !Array.isArray(savedStage?.waves)) return;
      const waves = normalizeStageEditorWaves(savedStage.waves, stageId);
      if (!waves.length) return;
      const stageNumber = stages.length + 1;
      stages.push({
        id: stageId,
        name: cleanMonsterText(savedStage.name, "커스텀 스테이지"),
        title: cleanMonsterText(savedStage.title, `커스텀 스테이지 ${stageNumber}`),
        chapter: 1,
        stage: stageNumber,
        recommendedLevel: clampInteger(savedStage.recommendedLevel, 1, 99, stageNumber),
        staminaCost: clampInteger(savedStage.staminaCost, 0, 99, 1),
        clearReward: {
          gold: clampInteger(savedStage.clearReward?.gold, 0, 999999, 1200),
          heroShards: clampInteger(savedStage.clearReward?.heroShards, 0, 999, 2),
        },
        custom: true,
        waves,
      });
    });
  }

  function normalizeStageEditorWaves(waves, stageId) {
    return waves.map((wave, index) => {
      const monsters = normalizeWaveMonsters(wave?.monsters);
      return {
        id: String(wave?.id || `${stageId}-w${index + 1}`),
        name: cleanMonsterText(wave?.name, `웨이브 ${index + 1}`),
        boss: Boolean(wave?.boss),
        monsters,
      };
    }).filter((wave) => wave.monsters.length);
  }

  function normalizeWaveMonsters(monsters) {
    const occupied = new Set();
    const normalized = [];
    (Array.isArray(monsters) ? monsters : []).forEach((entry, index) => {
      const monsterId = typeof entry?.monsterId === "string" && MONSTERS_BY_ID.has(entry.monsterId) ? entry.monsterId : MONSTER_DEFS[0].id;
      const baseMonster = MONSTERS_BY_ID.get(monsterId) || MONSTER_DEFS[0];
      const level = Number.isFinite(Number.parseInt(entry?.level, 10)) ? clampInteger(entry.level, 1, 99, 1) : null;
      const levelCells = level ? monsterCellsForLevel(baseMonster, level) : baseMonster.cells;
      const x = clampInteger(entry?.x, 0, MONSTER_BOARD_COLS - 1, index % MONSTER_BOARD_COLS);
      const y = clampInteger(entry?.y, 0, MONSTER_BOARD_ROWS - 1, Math.floor(index / MONSTER_BOARD_COLS));
      const placement = { monsterId, x, y };
      if (level) placement.level = level;
      if (!isWaveMonsterPlacementValid(placement, { ...baseMonster, cells: levelCells }, occupied)) return;
      levelCells.forEach((cell) => occupied.add(key(x + cell.x, y + cell.y)));
      normalized.push(placement);
    });
    return normalized;
  }

  function isWaveMonsterPlacementValid(placement, monster, occupied = new Set()) {
    return monster.cells.every((cell) => {
      const x = placement.x + cell.x;
      const y = placement.y + cell.y;
      const cellKey = key(x, y);
      return x >= 0 && y >= 0 && x < MONSTER_BOARD_COLS && y < MONSTER_BOARD_ROWS && !occupied.has(cellKey);
    });
  }

  function cleanMonsterText(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function clampInteger(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
  }

  function normalizeMonsterActions(actions, fallback = []) {
    const allowed = new Set(Object.keys(ICONS));
    const normalized = Array.isArray(actions) ? actions.filter((action) => allowed.has(action)) : [];
    return normalized.length ? normalized : [...fallback];
  }

  function normalizeMonsterCells(cells, cols, rows) {
    const seen = new Map();
    (Array.isArray(cells) ? cells : []).forEach((cell) => {
      const normalized = normalizeMonsterCell(cell, cols, rows);
      if (normalized) seen.set(key(normalized.x, normalized.y), normalized);
    });
    return [...seen.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function normalizeMonsterCell(cell, cols, rows) {
    const x = Number.parseInt(cell?.x, 10);
    const y = Number.parseInt(cell?.y, 10);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= cols || y >= rows) return null;
    const icon = Object.prototype.hasOwnProperty.call(cell, "icon") ? cell.icon : undefined;
    return Object.keys(ICONS).includes(icon) ? { x, y, icon } : { x, y };
  }

  function normalizeMonsterLevels(levels, cols, rows, fallbackAttack) {
    const normalized = (Array.isArray(levels) ? levels : []).map((level) => {
      const minLevel = clampInteger(level?.minLevel, 1, 99, 1);
      const boardConditions = level?.boardConditions || {};
      const actions = normalizeMonsterActions(level?.actions);
      const normalizedLevel = {
        minLevel,
        attack: clampInteger(level?.attack, 0, 99, fallbackAttack),
        note: cleanMonsterText(level?.note, ""),
        boardConditions: {
          icons: normalizeMonsterCells(boardConditions.icons, cols, rows),
          extraCells: normalizeMonsterCells(boardConditions.extraCells, cols, rows),
          removeCells: normalizeMonsterCells(boardConditions.removeCells, cols, rows).map((cell) => ({ x: cell.x, y: cell.y })),
        },
      };
      if (actions.length) normalizedLevel.actions = actions;
      return normalizedLevel;
    });
    return normalized.length ? normalized.sort((a, b) => a.minLevel - b.minLevel) : [{ minLevel: 1, attack: fallbackAttack }];
  }

  function createStageWaves(stageId, rotationOffset = 0) {
    return Array.from({ length: WAVES_PER_STAGE }, (_, waveIndex) => {
      const boss = waveIndex === WAVES_PER_STAGE - 1;
      const usesAdvancedRotation = rotationOffset >= MONSTER_ROTATION.length;
      const rotation = usesAdvancedRotation ? ADVANCED_MONSTER_ROTATION : MONSTER_ROTATION;
      const localOffset = usesAdvancedRotation ? rotationOffset - MONSTER_ROTATION.length : rotationOffset;
      const rotationIndex = (localOffset + waveIndex) % rotation.length;
      const monsterId = boss ? BOSS_MONSTER_ID : rotation[rotationIndex];
      return {
        id: `${stageId}-w${waveIndex + 1}`,
        name: boss ? `보스 ${waveIndex + 1}` : `웨이브 ${waveIndex + 1}`,
        boss,
        monsters: defaultWaveMonsters(waveIndex, monsterId, boss),
      };
    });
  }

  function defaultWaveMonsters(waveIndex, monsterId, boss) {
    if (boss) {
      return [
        { monsterId: BOSS_MONSTER_ID, x: 1, y: 1 },
        { monsterId: "tiny-berry-imp", x: 6, y: 3 },
      ];
    }
    if (ADVANCED_MONSTER_ROTATION.includes(monsterId)) {
      const focused = centeredMonsterEntry(monsterId);
      const layouts = [
        [focused],
        [focused, { monsterId: "tiny-berry-imp", x: 6, y: 0 }],
        [focused, { monsterId: "tiny-berry-imp", x: 0, y: 4 }],
        [focused, { monsterId: "tiny-berry-imp", x: 6, y: 0 }, { monsterId: "tiny-berry-imp", x: 0, y: 4 }],
      ];
      return layouts[waveIndex % layouts.length].map((entry) => ({ ...entry }));
    }
    const layouts = [
      [centeredMonsterEntry(monsterId)],
      [{ monsterId, x: 2, y: 3 }, { monsterId: "tiny-jelly-block", x: 5, y: 3 }],
      [{ monsterId, x: 1, y: 2 }, { monsterId: "tiny-berry-imp", x: 6, y: 4 }],
      [{ monsterId, x: 0, y: 2 }, { monsterId: "tiny-jelly-block", x: 4, y: 1 }, { monsterId: "tiny-berry-imp", x: 6, y: 4 }],
    ];
    return layouts[waveIndex % layouts.length].map((entry) => ({ ...entry }));
  }

  function centeredMonsterEntry(monsterId) {
    const monster = MONSTERS_BY_ID.get(monsterId) || MONSTER_DEFS[0];
    return {
      monsterId,
      x: Math.max(0, Math.floor((MONSTER_BOARD_COLS - monster.cols) / 2)),
      y: Math.max(0, Math.floor((MONSTER_BOARD_ROWS - monster.rows) / 2)),
    };
  }

  function createHeroInstance(def) {
    const progress = HERO_PROGRESS_INITIAL[def.id] || {};
    return {
      ...def,
      level: progress.level ?? 1,
      shards: progress.shards ?? 0,
      unlocked: progress.unlocked ?? false,
    };
  }

  function createInitialResources() {
    const unlockedStageIds = uniqueValues([
      ...META_INITIAL.unlockedStageIds,
      ...STAGE_DEFS.filter((stage) => stage.custom).map((stage) => stage.id),
    ]);
    return {
      gold: META_INITIAL.gold,
      gems: META_INITIAL.gems,
      stamina: META_INITIAL.stamina,
      maxStamina: META_INITIAL.maxStamina,
      selectedStageId: STAGES_BY_ID.has(META_INITIAL.selectedStageId) ? META_INITIAL.selectedStageId : unlockedStageIds[0],
      unlockedStageIds,
      rewardReadyByStageId: { ...META_INITIAL.rewardReadyByStageId },
    };
  }

  function stageIndexById(stageId) {
    return Math.max(0, STAGE_DEFS.findIndex((stage) => stage.id === stageId));
  }

  function selectedStageDef() {
    return STAGES_BY_ID.get(metaState.resources.selectedStageId) || STAGE_DEFS[0];
  }

  function unlockedStageDefs() {
    return metaState.resources.unlockedStageIds
      .map((stageId) => STAGES_BY_ID.get(stageId))
      .filter(Boolean);
  }

  function selectNextStage() {
    const unlockedStages = unlockedStageDefs();
    if (unlockedStages.length <= 1) return;
    const currentIndex = Math.max(0, unlockedStages.findIndex((stage) => stage.id === metaState.resources.selectedStageId));
    metaState.resources.selectedStageId = unlockedStages[(currentIndex + 1) % unlockedStages.length].id;
  }

  function stageRewardReady(stageId = selectedStageDef().id) {
    return Boolean(metaState.resources.rewardReadyByStageId[stageId]);
  }

  function setStageRewardReady(stageId, ready) {
    if (ready) {
      metaState.resources.rewardReadyByStageId[stageId] = true;
      return;
    }
    delete metaState.resources.rewardReadyByStageId[stageId];
  }

  function heroLevelRule(hero = selectedHero()) {
    return HERO_LEVEL_RULES[hero?.levelRule || "default"] || HERO_LEVEL_RULES.default;
  }

  function currentStage() {
    return STAGE_DEFS[state.stageIndex] || selectedStageDef() || STAGE_DEFS[0];
  }

  function currentWave() {
    const stage = currentStage();
    return stage.waves[state.waveIndex] || stage.waves[0];
  }

  function currentMonster() {
    return aliveMonsterInstances()[0] || state.monsterInstances[0] || monsterInstanceForWaveEntry({ monsterId: MONSTER_DEFS[0].id, x: 0, y: 0 }, 0);
  }

  function aliveMonsterInstances() {
    return state.monsterInstances.filter((monster) => !isMonsterInstanceSealed(monster));
  }

  function monsterInstanceById(instanceId) {
    return state.monsterInstances.find((monster) => monster.instanceId === instanceId) || null;
  }

  function isMonsterInstanceSealed(monster) {
    return Boolean(monster?.cellKeys?.length) && monster.cellKeys.every((cellKey) => state.monsterCells.get(cellKey)?.covered);
  }

  function monsterForRound(roundIndex) {
    const entry = waveMonsterEntries(currentWave())[roundIndex] || waveMonsterEntries(currentWave())[0];
    return monsterInstanceForWaveEntry(entry || { monsterId: MONSTER_DEFS[0].id, x: 0, y: 0 }, roundIndex);
  }

  function scaledMonster(monster, roundIndex = state.roundIndex, level = monsterPowerLevel(roundIndex)) {
    const profile = monsterLevelProfile(monster, level);
    const cells = monsterCellsForLevel(monster, level);
    const note = profile.note ? ` · ${profile.note}` : level > 1 ? ` · 위험도 ${level}` : "";
    return {
      ...monster,
      level,
      cells,
      actions: profile.actions?.length ? profile.actions : monster.actions,
      levelProfile: profile,
      baseAttack: profile.attack ?? monster.baseAttack,
      displayName: `${monster.name} Lv.${level}`,
      sub: `${monster.sub}${note}`,
    };
  }

  function waveMonsterEntries(wave = currentWave()) {
    if (Array.isArray(wave?.monsters) && wave.monsters.length) return wave.monsters;
    const monsterIds = wave?.monsterIds || wave?.rounds || [];
    return monsterIds.map((monsterId, index) => {
      const baseMonster = typeof monsterId === "number" ? MONSTER_DEFS[monsterId] || MONSTER_DEFS[0] : MONSTERS_BY_ID.get(monsterId) || MONSTER_DEFS[0];
      const x = index === 0 ? Math.max(0, Math.floor((MONSTER_BOARD_COLS - baseMonster.cols) / 2)) : (index * 3) % MONSTER_BOARD_COLS;
      const y = index === 0 ? Math.max(0, MONSTER_BOARD_ROWS - baseMonster.rows - 1) : Math.floor(index / 2) * 2;
      return { monsterId: baseMonster.id, x, y };
    });
  }

  function monsterInstanceForWaveEntry(entry, index) {
    const baseMonster = MONSTERS_BY_ID.get(entry?.monsterId) || MONSTER_DEFS[0];
    const level = clampInteger(entry?.level, 1, 99, monsterPowerLevel(index));
    const monster = scaledMonster(baseMonster, index, level);
    const maxX = Math.max(0, MONSTER_BOARD_COLS - monster.cols);
    const maxY = Math.max(0, MONSTER_BOARD_ROWS - monster.rows);
    return {
      ...monster,
      id: `m${index + 1}`,
      instanceId: `m${index + 1}`,
      monsterId: baseMonster.id,
      boardX: clampInteger(entry?.x, 0, maxX, 0),
      boardY: clampInteger(entry?.y, 0, maxY, 0),
      order: index,
      tone: index % 5,
      cellKeys: [],
    };
  }

  function monsterPowerLevel(roundIndex = state.roundIndex) {
    return 1 + state.stageIndex * 3 + state.waveIndex + Math.floor(roundIndex / 2);
  }

  function monsterLevelProfile(monster, level) {
    const levels = [...(monster.levels || [])].sort((a, b) => a.minLevel - b.minLevel);
    return levels.filter((profile) => level >= profile.minLevel).pop() || levels[0] || { minLevel: 1, attack: monster.baseAttack };
  }

  function monsterLevelProfiles(monster, level) {
    return [...(monster.levels || [])]
      .filter((profile) => level >= profile.minLevel)
      .sort((a, b) => a.minLevel - b.minLevel);
  }

  function monsterCellsForLevel(monster, level) {
    const cellMap = new Map(monster.cells.map((cell) => [key(cell.x, cell.y), { ...cell }]));
    monsterLevelProfiles(monster, level).forEach((profile) => {
      applyMonsterBoardConditionRemovals(cellMap, profile.boardConditions?.removeCells);
      applyMonsterBoardConditionCells(cellMap, profile.boardConditions?.icons, monster);
      applyMonsterBoardConditionCells(cellMap, profile.boardConditions?.extraCells, monster);
    });
    return [...cellMap.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function applyMonsterBoardConditionRemovals(cellMap, cells = []) {
    cells.forEach((cell) => {
      cellMap.delete(key(cell.x, cell.y));
    });
  }

  function applyMonsterBoardConditionCells(cellMap, cells = [], monster) {
    cells.forEach((cell) => {
      if (cell.x < 0 || cell.y < 0 || cell.x >= monster.cols || cell.y >= monster.rows) return;
      cellMap.set(key(cell.x, cell.y), { ...cell });
    });
  }

  function currentAction() {
    const monster = currentMonster();
    return plannedMonsterAction(monster);
  }

  function monsterAction(monster) {
    const actions = monster?.actions?.length ? monster.actions : ["attack"];
    return actions[state.actionIndex % actions.length];
  }

  function plannedMonsterAction(monster) {
    if (!monster) return "attack";
    return state.turnActions.get(monster.instanceId) || monsterAction(monster);
  }

  function lockTurnActions() {
    state.turnActions = new Map();
    aliveMonsterInstances().forEach((monster) => {
      state.turnActions.set(monster.instanceId, monsterAction(monster));
    });
  }

  function deployedHero() {
    return getHero(metaState.deployedHeroId) || metaState.heroes.find((hero) => hero.unlocked);
  }

  function selectedHero() {
    return getHero(metaState.selectedHeroId) || deployedHero();
  }

  function getHero(heroId) {
    return metaState.heroes.find((hero) => hero.id === heroId) || null;
  }

  function heroMaxHp(hero = deployedHero()) {
    const rule = heroLevelRule(hero);
    return rule.hp.base + Math.max(0, (hero?.level || 1) - 1) * rule.hp.perLevel;
  }

  function isSpecialLevelUp(hero) {
    const rule = heroLevelRule(hero);
    return (hero.level + 1) % rule.specialEvery === 0;
  }

  function levelGoldCost(hero) {
    const rule = heroLevelRule(hero);
    const cost = rule.goldCost;
    return isSpecialLevelUp(hero) ? cost.specialBase + hero.level * cost.specialPerLevel : cost.normalBase + hero.level * cost.normalPerLevel;
  }

  function shardCost(hero) {
    if (!isSpecialLevelUp(hero)) return 0;
    const rule = heroLevelRule(hero);
    const tier = Math.floor(hero.level / rule.specialEvery);
    return rule.shardCost.specialBase + tier * rule.shardCost.specialPerTier;
  }

  function canLevelUp(hero) {
    return hero.level < heroLevelRule(hero).maxLevel && metaState.resources.gold >= levelGoldCost(hero) && hero.shards >= shardCost(hero);
  }

  function waveCount() {
    return currentStage().waves.length;
  }

  function roundCount() {
    return waveMonsterEntries(currentWave()).length;
  }

  function hasNextRound() {
    return false;
  }

  function hasNextWave() {
    return state.waveIndex < waveCount() - 1;
  }

  function hasNextStage() {
    return false;
  }

  function isRunComplete() {
    return !hasNextRound() && !hasNextWave() && !hasNextStage();
  }

  function progressionLabel() {
    const total = Math.max(1, state.monsterInstances.length || roundCount());
    const alive = state.monsterInstances.length ? aliveMonsterInstances().length : total;
    return `W${state.waveIndex + 1}/${waveCount()} · ${alive}/${total}`;
  }

  function startGame() {
    enterBattleMode();
    const hero = deployedHero();
    const maxHp = heroMaxHp(hero);
    state.stageIndex = stageIndexById(metaState.resources.selectedStageId);
    state.waveIndex = 0;
    state.roundIndex = 0;
    state.playerHp = maxHp;
    state.boardCells = new Set(heroBoardCells(hero.level, hero).map((cell) => key(cell.x, cell.y)));
    state.boardCellTypes = new Map();
    state.boardLinks = new Map();
    state.knifeLoadout = heroKnives(hero).map((knife) => ({ ...knife }));
    state.silentRefillUpgrades = 0;
    state.silentRefills = 0;
    state.shield = 0;
    state.rewardOptions = [];
    state.boardEdit = null;
    state.roundTransition = null;
    state.pendingLogs = [];
    state.boardEffects = [];
    startStage(state.stageIndex);
  }

  function startStage(index) {
    state.stageIndex = index;
    state.waveIndex = 0;
    state.roundIndex = 0;
    startRound(index, 0, 0);
  }

  function startRound(stageIndex = state.stageIndex, waveIndex = state.waveIndex, roundIndex = state.roundIndex, options = {}) {
    const resetMaterial = options.resetMaterial !== false;
    const pendingLogs = state.pendingLogs;
    state.stageIndex = stageIndex;
    state.waveIndex = waveIndex;
    state.roundIndex = roundIndex;
    const monsterEntries = waveMonsterEntries(currentWave());
    state.monsterInstances = monsterEntries.map((entry, index) => monsterInstanceForWaveEntry(entry, index));
    state.turn = 1;
    state.actionIndex = 0;
    state.cutsUsed = 0;
    state.monsterCells = new Map();
    state.placedPieces = [];
    state.blocked = new Set();
    state.coverOrder = [];
    state.log = [];
    state.pendingLogs = [];
    state.boardEffects = [];
    state.resultMode = null;
    state.rewardOptions = [];
    state.boardEdit = null;
    state.roundTransition = options.transition || null;
    if (resetMaterial) {
      state.materialCols = CUT_BOARD_COLS;
      state.materialRows = CUT_BOARD_ROWS;
      state.materialOrigin = { x: 0, y: 0 };
      state.missingCells = new Set();
      state.spoiledCells = new Set();
      state.knives = [];
      state.shield = 0;
      state.silentRefills = state.silentRefillUpgrades;
      state.nextPieceId = 1;
    }
    state.nextPlacementId = 1;
    state.draggingPieceId = null;
    state.draggingPlacementId = null;
    state.draggingRewardItemId = null;
    state.selectedPlacementId = null;
    state.dropPreview = null;
    state.knifePreview = null;
    state.drag = null;

    state.monsterInstances.forEach((monster) => {
      monster.cellKeys = [];
      monster.cells.forEach((cell) => {
        const x = monster.boardX + cell.x;
        const y = monster.boardY + cell.y;
        const cellKey = key(x, y);
        if (x < 0 || y < 0 || x >= MONSTER_BOARD_COLS || y >= MONSTER_BOARD_ROWS || state.monsterCells.has(cellKey)) return;
        state.monsterCells.set(cellKey, {
          x,
          y,
          localX: cell.x,
          localY: cell.y,
          icon: cell.icon,
          sourceIcon: cell.icon,
          covered: false,
          monsterInstanceId: monster.instanceId,
          monsterId: monster.monsterId,
          monsterName: monster.name,
          monsterOrder: monster.order,
          tone: monster.tone,
        });
        monster.cellKeys.push(cellKey);
      });
    });
    state.monsterInstances = state.monsterInstances.filter((monster) => monster.cellKeys.length);
    lockTurnActions();

    if (resetMaterial) resetMaterialBoard();

    addLog(`${currentWave().name}. 몬스터 ${state.monsterInstances.length}마리가 보드에 등장했다.`);
    if (!resetMaterial) addLog("이전 몬스터에서 남긴 재료판을 그대로 이어간다.");
    addLog("칼을 움직여 절단선을 만들고 분리된 재료를 옮겨라.");
    pendingLogs.forEach((line) => addLog(line));
    hideResult();
    render();
  }

  function resetMaterialBoard() {
    state.materialCols = CUT_BOARD_COLS;
    state.materialRows = CUT_BOARD_ROWS;
    state.materialOrigin = { x: 0, y: 0 };
    state.missingCells = new Set();
    state.spoiledCells = new Set();
    state.knives = state.knifeLoadout.map((knife, index) => ({
      ...knife,
      id: `knife-${index}`,
    }));

    const cells = [...state.boardCells].map(fromKey).sort((a, b) => a.y - b.y || a.x - b.x);

    state.initialMaterialTotal = cells.length;
    state.materialPieces = [{
      id: state.nextPieceId,
      cells,
      cutEdges: new Set(),
      specialCells: cloneSpecialCells(state.boardCellTypes),
      specialLinks: cloneSpecialLinks(state.boardLinks),
    }];
    state.nextPieceId += 1;
  }

  function addLog(text) {
    state.log.unshift(text);
    state.log = state.log.slice(0, 8);
  }

  function enterBattleMode() {
    els.appShell.classList.remove("meta-mode");
    els.appShell.classList.add("battle-mode");
  }

  function enterMetaMode(tab = "main", view = tab) {
    state.resultMode = null;
    state.boardEdit = null;
    hideResult();
    els.appShell.classList.remove("battle-mode", "reward-edit-mode", "reward-edit-closing");
    els.appShell.classList.add("meta-mode");
    metaState.activeTab = tab;
    metaState.view = view;
    renderMeta();
  }

  function renderMeta() {
    renderMetaResources();
    renderMetaTabs();
    if (metaState.activeTab === "main") {
      renderHomeMeta();
      return;
    }
    if (metaState.activeTab === "heroes") {
      if (metaState.view === "hero-detail") {
        renderHeroDetailMeta();
      } else {
        renderHeroListMeta();
      }
      return;
    }
    renderPlaceholderMeta(metaState.activeTab);
  }

  function renderMetaResources() {
    els.goldLabel.textContent = formatNumber(metaState.resources.gold);
    els.gemLabel.textContent = formatNumber(metaState.resources.gems);
    els.staminaLabel.textContent = `${metaState.resources.stamina}/${metaState.resources.maxStamina}`;
  }

  function renderMetaTabs() {
    els.metaTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === metaState.activeTab);
    });
  }

  function renderHomeMeta() {
    const hero = deployedHero();
    const stage = selectedStageDef();
    const rewardReady = stageRewardReady(stage.id);
    els.metaContent.innerHTML = `
      <section class="meta-page meta-page-main">
        ${floatingActionsHtml()}
        ${heroHomeCardHtml(hero)}
        <article class="stage-card">
          <div class="stage-row">
            <div>
              <p class="eyebrow">MAIN STAGE</p>
              <h2>${stage.title}</h2>
            </div>
            <button class="meta-small-button" data-action="stage-change" type="button">스테이지 변경</button>
          </div>
          <div class="stage-meta">
            <span>${stage.waves.length} Waves</span>
            <span>Recommended Lv. ${stage.recommendedLevel}</span>
          </div>
          <div class="stage-row">
            <div class="monster-icons" aria-label="등장 몬스터">
              <i class="round-icon">고</i>
              <i class="round-icon">점</i>
              <i class="round-icon">오</i>
            </div>
            <div class="reward-icons" aria-label="보상">
              <i class="round-icon">골</i>
              <i class="round-icon">조</i>
              <i class="round-icon">상</i>
            </div>
          </div>
        </article>
        <article class="claim-card">
          <div>
            <strong>클리어 보상</strong>
            <small>${rewardReady ? "받을 보상이 있습니다." : "현재 받을 보상이 없습니다."}</small>
          </div>
          <button class="meta-action-button" data-action="claim-stage-reward" type="button" ${rewardReady ? "" : "disabled"}>수령</button>
        </article>
        <button class="start-button" data-action="start-battle" type="button">도전 시작</button>
      </section>
    `;
    bindMetaContentActions();
  }

  function renderHeroListMeta() {
    const hero = deployedHero();
    els.metaContent.innerHTML = `
      <section class="meta-page meta-page-heroes">
        <div class="meta-section-title">
          <div>
            <p class="eyebrow">HERO</p>
            <h2>영웅</h2>
          </div>
          <span class="progress-chip">보유 ${ownedHeroCount()}/${metaState.heroes.length}</span>
        </div>
        ${deployedHeroCardHtml(hero)}
        <section class="hero-roster" aria-label="영웅 목록">
          ${metaState.heroes.map(heroListCardHtml).join("")}
        </section>
      </section>
    `;
    bindMetaContentActions();
  }

  function renderHeroDetailMeta() {
    const hero = selectedHero();
    const special = isSpecialLevelUp(hero);
    const nextLevel = hero.level + 1;
    const goldCost = levelGoldCost(hero);
    const neededShards = shardCost(hero);
    const currentCells = heroBoardCells(hero.level, hero);
    const nextCells = heroBoardCells(nextLevel, hero);
    const nextOnly = new Set(nextCells.map((cell) => key(cell.x, cell.y)).filter((cellKey) => !new Set(currentCells.map((cell) => key(cell.x, cell.y))).has(cellKey)));
    els.metaContent.innerHTML = `
      <section class="meta-page meta-page-hero-detail">
        <div class="hero-detail-head">
          <button class="back-button" data-action="hero-list" type="button">‹</button>
          <div>
            <p class="eyebrow">HERO DETAIL</p>
            <h2>${hero.name}</h2>
          </div>
          <span class="tag">${hero.id === metaState.deployedHeroId ? "출전 중" : hero.unlocked ? "대기" : "잠김"}</span>
        </div>
        <article class="hero-detail-summary meta-card">
          <div class="hero-avatar">${hero.icon}</div>
          <div class="hero-summary">
            <div class="hero-name-row"><strong>${hero.name}</strong><span class="tag">Lv. ${hero.level}</span>${starsHtml(hero.grade)}</div>
            <span class="progress-chip">체력 ${heroMaxHp(hero)}</span>
            <span class="progress-chip">조각 ${hero.shards}/${neededShards || nextShardMilestone(hero)}</span>
          </div>
          ${hero.unlocked && hero.id !== metaState.deployedHeroId ? `<button class="deploy-button" data-action="deploy-hero" data-hero-id="${hero.id}" type="button">출전</button>` : ""}
        </article>
        <section class="level-panel">
          <div class="meta-section-title">
            <div>
              <p class="eyebrow">${special ? "SPECIAL" : "LEVEL UP"}</p>
              <h3>${special ? "스페셜 레벨업" : "레벨업"}</h3>
            </div>
            <span class="progress-chip">다음 Lv. ${nextLevel}</span>
          </div>
          ${special ? growthCompareHtml(currentCells, nextCells, nextOnly) : regularLevelHtml(hero)}
          <div class="hero-knife-strip">
            ${heroKnives(hero).map((knife) => knifeMiniCardHtml(knife.type)).join("")}
          </div>
          <div class="detail-cost-row">
            <div class="cost-list">
              <span class="cost-chip">골드 ${formatNumber(goldCost)}</span>
              ${neededShards ? `<span class="cost-chip">조각 ${neededShards}</span>` : ""}
            </div>
            <button class="level-button" data-action="level-up" data-hero-id="${hero.id}" type="button" ${canLevelUp(hero) ? "" : "disabled"}>${special ? "스페셜 레벨업" : "레벨업"}</button>
          </div>
        </section>
        <p class="detail-note">${special ? "스페셜 레벨업은 판과 체력이 함께 성장합니다." : "일반 레벨업은 체력만 증가합니다."}</p>
      </section>
    `;
    bindMetaContentActions();
  }

  function renderPlaceholderMeta(tab) {
    const labels = { summon: "소환", dungeon: "던전", shop: "상점" };
    const copy = {
      summon: "영웅 소환과 픽업 배너가 들어갈 자리입니다.",
      dungeon: "요일 던전, 특수 퍼즐, 보스전이 열릴 자리입니다.",
      shop: "무료 보상, 성장 재료, 패키지가 들어갈 자리입니다.",
    };
    els.metaContent.innerHTML = `
      <section class="meta-page">
        <article class="placeholder-panel">
          <p class="eyebrow">COMING SOON</p>
          <h2>${labels[tab]}</h2>
          <p>${copy[tab]}</p>
        </article>
      </section>
    `;
  }

  function bindMetaContentActions() {
    els.metaContent.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", handleMetaAction);
    });
  }

  function handleMetaAction(event) {
    const action = event.currentTarget.dataset.action;
    const heroId = event.currentTarget.dataset.heroId;
    if (action === "start-battle") {
      startGame();
      return;
    }
    if (action === "stage-change") {
      selectNextStage();
      renderMeta();
      return;
    }
    if (action === "claim-stage-reward") {
      const stage = selectedStageDef();
      if (!stageRewardReady(stage.id)) return;
      setStageRewardReady(stage.id, false);
      metaState.resources.gold += stage.clearReward?.gold || 0;
      const hero = deployedHero();
      hero.shards += stage.clearReward?.heroShards || 0;
      renderMeta();
      return;
    }
    if (action === "hero-detail") {
      metaState.selectedHeroId = heroId;
      metaState.activeTab = "heroes";
      metaState.view = "hero-detail";
      renderMeta();
      return;
    }
    if (action === "hero-list") {
      metaState.view = "heroes";
      renderMeta();
      return;
    }
    if (action === "deploy-hero") {
      const hero = getHero(heroId);
      if (!hero?.unlocked) return;
      metaState.deployedHeroId = heroId;
      metaState.selectedHeroId = heroId;
      renderMeta();
      return;
    }
    if (action === "level-up") {
      levelUpHero(heroId);
    }
  }

  function levelUpHero(heroId) {
    const hero = getHero(heroId);
    if (!hero || !hero.unlocked || !canLevelUp(hero)) return;
    const special = isSpecialLevelUp(hero);
    metaState.resources.gold -= levelGoldCost(hero);
    if (special) hero.shards -= shardCost(hero);
    hero.level += 1;
    renderMeta();
  }

  function ownedHeroCount() {
    return metaState.heroes.filter((hero) => hero.unlocked).length;
  }

  function nextShardMilestone(hero) {
    return shardCost(hero) || hero.unlockShardCost || heroLevelRule(hero).fallbackShardMilestone;
  }

  function heroBoardCells(level, hero = selectedHero()) {
    const cells = hero.board.baseCells.map((cell) => ({ ...cell }));
    hero.board.growth.forEach((growth) => {
      if (level >= growth.level) growth.cells.forEach((cell) => cells.push({ ...cell }));
    });
    return uniqueCells(cells);
  }

  function uniqueCells(cells) {
    const result = new Map();
    cells.forEach((cell) => result.set(key(cell.x, cell.y), cell));
    return [...result.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function heroKnives(hero = selectedHero()) {
    return hero.knives.base.map((knife, index) => ({
      ...BASE_KNIVES[index % BASE_KNIVES.length],
      ...knife,
    }));
  }

  function floatingActionsHtml() {
    return `
      <div class="floating-actions" aria-label="빠른 메뉴">
        <button type="button" title="미션">✓</button>
        <button type="button" title="우편">✉</button>
        <button type="button" title="이벤트">★</button>
        <button type="button" title="보상">▣</button>
      </div>
    `;
  }

  function heroHomeCardHtml(hero) {
    return `
      <article class="hero-home-card meta-card">
        <div class="hero-avatar">${hero.icon}</div>
        <div class="hero-summary">
          <div class="hero-name-row"><strong>${hero.name}</strong><span class="tag">Lv. ${hero.level}</span><span class="tag">출전 중</span></div>
          <div class="mini-loadout-row">
            ${miniBoardCardHtml("시작 판", heroBoardCells(hero.level, hero))}
            ${heroKnives(hero).map((knife) => knifeMiniCardHtml(knife.type)).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function deployedHeroCardHtml(hero) {
    return `
      <article class="hero-home-card meta-card">
        <div class="hero-avatar">${hero.icon}</div>
        <div class="hero-summary">
          <div class="hero-name-row"><strong>${hero.name}</strong><span class="tag">Lv. ${hero.level}</span><span class="tag">출전 중</span></div>
          <div class="mini-loadout-row">
            ${miniBoardCardHtml("시작 판", heroBoardCells(hero.level, hero))}
            ${heroKnives(hero).map((knife) => knifeMiniCardHtml(knife.type)).join("")}
          </div>
        </div>
        <button class="detail-button" data-action="hero-detail" data-hero-id="${hero.id}" type="button">상세</button>
      </article>
    `;
  }

  function heroListCardHtml(hero) {
    const unlocked = hero.unlocked;
    const deployed = hero.id === metaState.deployedHeroId;
    return `
      <article class="hero-list-card ${deployed ? "selected" : ""} ${unlocked ? "" : "locked"}">
        <button class="hero-list-main" data-action="hero-detail" data-hero-id="${hero.id}" type="button" ${unlocked ? "" : "disabled"}>
          <div class="hero-avatar small">${unlocked ? hero.icon : "?"}</div>
          <div>
            <strong>${unlocked ? hero.name : "잠김"}</strong>
            <span>${unlocked ? `Lv. ${hero.level}` : `조각 ${hero.shards}/50`}</span>
          </div>
          ${unlocked && canLevelUp(hero) ? `<i class="notice-dot"></i>` : ""}
        </button>
        <div class="hero-list-side">
          <span class="progress-chip">${unlocked ? `조각 ${hero.shards}/${nextShardMilestone(hero)}` : "잠김"}</span>
          ${unlocked ? `<button class="deploy-button" data-action="deploy-hero" data-hero-id="${hero.id}" type="button" ${deployed ? "disabled" : ""}>${deployed ? "출전 중" : "출전"}</button>` : ""}
        </div>
      </article>
    `;
  }

  function miniBoardCardHtml(label, cells) {
    return `
      <div class="mini-loadout-card">
        <span>${label}</span>
        ${boardPreviewHtml(cells, "mini-board", "mini-cell")}
      </div>
    `;
  }

  function knifeMiniCardHtml(type) {
    const knife = KNIFE_TYPES[type];
    const primary = knife.segments[0]?.orientation || "h";
    return `
      <div class="mini-loadout-card">
        <span>${knife.label}</span>
        <i class="mini-knife ${primary}" aria-hidden="true"></i>
      </div>
    `;
  }

  function boardPreviewHtml(cells, gridClass, cellClass, nextKeys = new Set()) {
    const min = minCell(cells);
    const normalized = normalizeCells(cells);
    const maxX = Math.max(...normalized.map((cell) => cell.x));
    const maxY = Math.max(...normalized.map((cell) => cell.y));
    const occupied = new Set(normalized.map((cell) => key(cell.x, cell.y)));
    let html = `<div class="${gridClass}" style="grid-template-columns: repeat(${maxX + 1}, auto)">`;
    for (let y = 0; y <= maxY; y += 1) {
      for (let x = 0; x <= maxX; x += 1) {
        const cellKey = key(x, y);
        const sourceKey = key(x + min.x, y + min.y);
        const extra = occupied.has(cellKey) ? (nextKeys.has(sourceKey) ? " next" : "") : " empty";
        html += `<i class="${cellClass}${extra}"></i>`;
      }
    }
    html += "</div>";
    return html;
  }

  function growthCompareHtml(currentCells, nextCells, nextOnly) {
    return `
      <div class="growth-compare">
        <div>
          <span>현재 시작 판</span>
          ${boardPreviewHtml(currentCells, "growth-board", "growth-cell")}
        </div>
        <b>→</b>
        <div>
          <span>Lv. ${selectedHero().level + 1} 시작 판</span>
          ${boardPreviewHtml(nextCells, "growth-board", "growth-cell", nextOnly)}
        </div>
      </div>
      <strong class="growth-copy">판 +${Math.max(0, nextCells.length - currentCells.length)}칸 확장</strong>
    `;
  }

  function regularLevelHtml(hero) {
    return `
      <div class="regular-level-card">
        <strong>체력 +2</strong>
        <span>Lv. ${hero.level} → Lv. ${hero.level + 1}</span>
        <small>일반 레벨업은 체력만 증가합니다.</small>
      </div>
    `;
  }

  function starsHtml(count) {
    return `<span class="stars">${"★".repeat(count)}</span>`;
  }

  function formatNumber(value) {
    return Number(value).toLocaleString("ko-KR");
  }

  function render() {
    syncSelectedPlacement();
    renderSceneMode();
    renderStatus();
    renderActionCard();
    renderWaveTracker();
    updateLayoutMode();
    updateAdaptiveCellSize();
    renderMonster();
    renderMaterialBoard();
    renderLog();
    scheduleLayoutStabilization();
  }

  function renderSceneMode() {
    els.appShell.classList.toggle("reward-edit-mode", Boolean(state.boardEdit));
    els.appShell.classList.toggle("reward-edit-closing", Boolean(state.boardEdit?.closing));
    els.appShell.classList.toggle("monster-transition-mode", state.roundTransition?.phase === "out");
    els.appShell.classList.toggle("monster-enter-mode", state.roundTransition?.phase === "in");
  }

  function renderStatus() {
    const covered = coveredCount();
    const total = state.monsterCells.size;
    const shieldText = state.shield ? ` +${state.shield}` : "";
    els.stageLabel.textContent = progressionLabel();
    const maxHp = heroMaxHp();
    els.hpLabel.textContent = `${Math.max(0, state.playerHp)} / ${maxHp}${shieldText}`;
    els.materialLabel.textContent = `${availableMaterialCount()} / ${state.initialMaterialTotal}`;
    els.pieceCountLabel.textContent = `${state.materialPieces.length}개`;
    const totalMonsters = Math.max(1, state.monsterInstances.length);
    const aliveMonsters = aliveMonsterInstances().length;
    els.monsterSub.textContent = currentWave().boss ? `보스 웨이브 · ${aliveMonsters}/${totalMonsters} 남음` : `몬스터 ${aliveMonsters}/${totalMonsters} 남음`;
    els.monsterName.textContent = currentWave().name;
    els.completionLabel.textContent = `${covered} / ${total}`;
    els.completionFill.style.width = `${total ? (covered / total) * 100 : 0}%`;
    const selectedPlacement = getPlacement(state.selectedPlacementId);
    if (state.boardEdit) {
      els.cutButton.textContent = "보상";
    } else {
      els.cutButton.textContent = selectedPlacement ? "회수" : "자르기";
    }
    els.cutButton.classList.toggle("recover-mode", Boolean(selectedPlacement));
    els.cutButton.disabled = state.boardEdit ? true : state.cutsUsed >= MAX_CUTS_PER_TURN || Boolean(state.resultMode);
    if (els.newBoardButton) els.newBoardButton.disabled = Boolean(state.resultMode || state.boardEdit);
    if (els.endTurnButton) els.endTurnButton.disabled = Boolean(state.resultMode || state.boardEdit);
    if (els.hpControlLabel) els.hpControlLabel.textContent = `${Math.max(0, state.playerHp)}/${maxHp}${shieldText}`;
    if (els.cutCountLabel) els.cutCountLabel.textContent = `${remainingCuts()}/${MAX_CUTS_PER_TURN}`;
  }

  function actionViewForMonster(monster, action) {
    const plannedAction = action || plannedMonsterAction(monster);
    const attackIcons = uncoveredIconCount("attack", monster.instanceId);
    const healIcons = uncoveredIconCount("heal", monster.instanceId);
    const defenseIcons = uncoveredIconCount("defense", monster.instanceId);
    const specialIcons = uncoveredIconCount("special", monster.instanceId);
    const views = {
      attack: {
        action: "attack",
        mark: ICONS.attack.mark,
        label: "공격",
        main: `피해 ${monster.baseAttack + attackIcons}`,
        badge: `공격 피해 ${monster.baseAttack + attackIcons}`,
        sub: `기본 ${monster.baseAttack} + 공격 표식 ${attackIcons}`,
      },
      heal: {
        action: "heal",
        mark: ICONS.heal.mark,
        label: "회복",
        main: healIcons ? `회복 ${MONSTER_HEAL_PER_ACTION}칸` : "막힘",
        badge: healIcons ? `회복 ${MONSTER_HEAL_PER_ACTION}칸` : "회복 막힘",
        sub: healIcons ? `턴 종료 시 덮인 칸 회복 · 회복 표식 ${healIcons}` : "회복 표식이 막혀 행동하지 않음",
      },
      defense: {
        action: "defense",
        mark: ICONS.defense.mark,
        label: "방어",
        main: defenseIcons ? `갑피 ${MONSTER_ARMOR_PER_ACTION}칸` : "막힘",
        badge: defenseIcons ? `갑피 ${MONSTER_ARMOR_PER_ACTION}칸` : "갑피 막힘",
        sub: defenseIcons ? `무작위 빈 칸 · 방어 표식 ${defenseIcons}` : "방어 표식이 막혀 행동하지 않음",
      },
      special: {
        action: "special",
        mark: ICONS.special.mark,
        label: "특수",
        main: specialIcons ? "고유 행동" : "막힘",
        badge: specialIcons ? "특수 행동" : "특수 막힘",
        sub: specialIcons ? `특수 표식 ${specialIcons}` : "특수 표식이 막혀 행동하지 않음",
      },
    };
    return views[plannedAction] || {
      action: "attack",
      mark: ICONS.attack.mark,
      label: "공격",
      main: `피해 ${monster.baseAttack + attackIcons}`,
      badge: `공격 피해 ${monster.baseAttack + attackIcons}`,
      sub: `기본 ${monster.baseAttack} + 공격 표식 ${attackIcons}`,
    };
  }

  function renderActionCard() {
    const aliveMonsters = aliveMonsterInstances();
    const actionRows = state.monsterInstances.map((monster) => {
      if (isMonsterInstanceSealed(monster)) {
        return {
          monster,
          action: "defeated",
          defeated: true,
          view: {
            mark: "✓",
            main: "처치",
          },
        };
      }
      const action = plannedMonsterAction(monster);
      const view = actionViewForMonster(monster, action);
      return { monster, action: view.action, view };
    });
    const rowsHtml = actionRows.length
      ? actionRows.map((row, index) => `
        <span class="action-mini action-${row.action}${row.defeated ? " defeated" : ""} monster-tone-${row.monster.tone}">
          <i>${index + 1}</i>
          <strong>${row.view.label || row.view.main}</strong>
          <em>${row.defeated ? "행동 없음" : row.view.main}</em>
          <small>${row.monster.name}</small>
        </span>
      `).join("")
      : `<span class="action-mini action-attack"><i>1</i><strong>완료</strong><em>행동 없음</em><small>몬스터 없음</small></span>`;
    const actionCount = Math.max(1, Math.min(3, actionRows.length || 1));
    const blockedText = state.blocked.size ? `갑피 ${state.blocked.size}칸 배치 불가` : "색상은 보드 칸과 연결";

    els.actionCard.className = "action-card action-multi";
    els.actionCard.innerHTML = `
      <span class="action-kicker">${currentWave().name} · 생존 ${aliveMonsters.length}/${Math.max(1, state.monsterInstances.length)}</span>
      <span class="action-sub">${blockedText}</span>
      <div class="action-list" style="--action-count: ${actionCount}">${rowsHtml}</div>
    `;
  }

  function renderWaveTracker() {
    if (!els.waveTracker) return;
    const transition = state.roundTransition;
    const monsters = state.monsterInstances.length
      ? state.monsterInstances
      : waveMonsterEntries(currentWave()).map((entry, index) => monsterInstanceForWaveEntry(entry, index));
    const cards = monsters.map((monster, index) => {
      const stateClass = isMonsterInstanceSealed(monster) ? "done" : "active";
      const transitionClass = transition && index === transition.fromIndex && transition.phase === "out"
        ? " exiting"
        : transition && index === transition.toIndex
          ? ` entering ${transition.phase === "in" ? "open" : ""}`
          : "";
      const label = monster?.displayName || monster?.name || "몬스터";
      return `
        <div class="monster-queue-card monster-tone-${monster.tone} ${stateClass}${transitionClass}" aria-label="${index + 1}번째 ${label}">
          <span>${monsterQueueLabel(monster)}</span>
        </div>
      `;
    }).join("");

    els.waveTracker.innerHTML = `
      <div class="wave-count">
        <span>웨이브</span>
        <strong>${state.waveIndex + 1}/${waveCount()}</strong>
      </div>
      <div class="monster-queue" aria-label="웨이브 몬스터 순서">${cards}</div>
    `;
  }

  function monsterQueueLabel(monster) {
    return (monster?.name || "몬").replace(/\s/g, "").slice(0, 1) || "몬";
  }

  function updateLayoutMode() {
    const height = viewportHeight();
    els.appShell.classList.toggle("compact-layout", height < COMPACT_HEIGHT);
    els.appShell.classList.toggle("tiny-layout", height < TINY_HEIGHT);
  }

  function updateAdaptiveCellSize() {
    lastViewportSize = { width: viewportWidth(), height: viewportHeight() };
    const nextSize = calculateAdaptiveCellSize();
    if (!applyAdaptiveCellSize(nextSize)) return;
  }

  function applyAdaptiveCellSize(nextSize) {
    if (!Number.isFinite(nextSize) || Math.abs(nextSize - state.cellSize) < 0.1) return false;
    state.cellSize = nextSize;
    document.documentElement.style.setProperty("--small-cell", `${nextSize}px`);
    document.documentElement.style.setProperty("--cell", `${nextSize}px`);
    return true;
  }

  function scheduleLayoutStabilization() {
    if (els.appShell.classList.contains("meta-mode")) return;
    layoutStabilizePasses = Math.max(layoutStabilizePasses, 8);
    if (layoutStabilizeFrame) return;
    layoutStabilizeFrame = requestAnimationFrame(runLayoutStabilization);
  }

  function runLayoutStabilization() {
    layoutStabilizeFrame = null;
    if (els.appShell.classList.contains("meta-mode")) {
      layoutStabilizePasses = 0;
      return;
    }
    layoutStabilizePasses = Math.max(0, layoutStabilizePasses - 1);
    const nextSize = calculateAdaptiveCellSize();
    if (applyAdaptiveCellSize(nextSize)) {
      render();
      return;
    }
    if (layoutStabilizePasses > 0) {
      layoutStabilizeFrame = requestAnimationFrame(runLayoutStabilization);
    }
  }

  function calculateAdaptiveCellSize() {
    const shellWidth = Math.min(viewportWidth(), 440);
    const preferredSize = shellWidth <= 370 ? 31 : clamp(shellWidth * 0.09, 34, MAX_CELL_SIZE);
    const limits = [preferredSize];
    const boardPad = getBoardPad();

    const monsterSectionRect = els.monsterSection.getBoundingClientRect();
    const monsterSectionStyle = getComputedStyle(els.monsterSection);
    const monsterInnerWidth = monsterSectionRect.width - horizontalPadding(monsterSectionStyle) - 2;
    const monsterGridHeight = monsterAvailableHeight(monsterSectionRect, monsterSectionStyle);
    limits.push(cellLimit(monsterInnerWidth, MONSTER_BOARD_COLS));
    limits.push(cellLimit(monsterGridHeight, MONSTER_BOARD_ROWS));

    const workbenchRect = els.workbench.getBoundingClientRect();
    const workbenchStyle = getComputedStyle(els.workbench);
    const workbenchInnerWidth = workbenchRect.width - horizontalPadding(workbenchStyle) - 2;
    const materialGridWidth = workbenchInnerWidth - boardPad * 2;
    const materialGridHeight = materialAvailableHeight() - boardPad * 2;
    limits.push(cellLimit(materialGridWidth, state.materialCols));
    limits.push(cellLimit(materialGridHeight, state.materialRows));

    const safeSize = Math.min(...limits.filter((value) => Number.isFinite(value) && value > 0));
    return Math.floor(clamp(safeSize, MIN_CELL_SIZE, preferredSize) * 10) / 10;
  }

  function monsterAvailableHeight(sectionRect, sectionStyle) {
    const actionRect = els.actionCard.getBoundingClientRect();
    const headRect = els.monsterSection.querySelector(".monster-head").getBoundingClientRect();
    const bottomPadding = cssPx(sectionStyle.paddingBottom);
    const contentBottom = Math.max(actionRect.bottom, headRect.bottom);
    return Math.max(0, sectionRect.bottom - bottomPadding - contentBottom - 2);
  }

  function materialAvailableHeight() {
    const header = els.workbench.querySelector(".section-head");
    const headerRect = header.getBoundingClientRect();
    const workbenchRect = els.workbench.getBoundingClientRect();
    const workbenchStyle = getComputedStyle(els.workbench);
    const headerHidden = getComputedStyle(header).display === "none";
    const controls = els.workbench.querySelector(".turn-controls");
    const controlsRect = controls.getBoundingClientRect();
    const controlsHidden = getComputedStyle(controls).display === "none";
    const top = headerHidden ? workbenchRect.top + cssPx(workbenchStyle.paddingTop) : headerRect.bottom;
    const bottom = controlsHidden ? workbenchRect.bottom - cssPx(workbenchStyle.paddingBottom) : controlsRect.top;
    return Math.max(0, bottom - top - 2);
  }

  function cellLimit(available, count) {
    return (available - BOARD_GAP * Math.max(0, count - 1)) / count;
  }

  function horizontalPadding(style) {
    return cssPx(style.paddingLeft) + cssPx(style.paddingRight);
  }

  function cssPx(value) {
    return Number.parseFloat(value) || 0;
  }

  function viewportWidth() {
    return window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 390;
  }

  function viewportHeight() {
    return window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 740;
  }

  function renderMonster() {
    const dropPreview = state.dropPreview?.zone === "monster" ? state.dropPreview : null;
    const dropPreviewCells = new Set(dropPreview?.cells || []);
    const draggingPlacedCells = getDraggingPlacedCells();
    els.monsterGrid.style.gridTemplateColumns = `repeat(${MONSTER_BOARD_COLS}, var(--cell))`;
    els.monsterGrid.style.gridTemplateRows = `repeat(${MONSTER_BOARD_ROWS}, var(--cell))`;
    els.monsterGrid.style.setProperty("--monster-art", "none");
    els.monsterGrid.classList.remove("has-monster-art");
    els.monsterGrid.innerHTML = "";

    state.monsterInstances.forEach((monster) => {
      if (!monster.image) return;
      const image = document.createElement("img");
      image.className = "monster-board-image";
      image.src = monster.image;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      image.style.left = monsterBoardPos(monster.boardX);
      image.style.top = monsterBoardPos(monster.boardY);
      image.style.width = monsterBoardSpan(monster.cols);
      image.style.height = monsterBoardSpan(monster.rows);
      els.monsterGrid.append(image);
    });

    for (let y = 0; y < MONSTER_BOARD_ROWS; y += 1) {
      for (let x = 0; x < MONSTER_BOARD_COLS; x += 1) {
        const cellKey = key(x, y);
        const monsterCell = state.monsterCells.get(cellKey);
        if (!monsterCell) {
          const empty = document.createElement("div");
          empty.className = "monster-cell empty";
          empty.style.gridColumn = String(x + 1);
          empty.style.gridRow = String(y + 1);
          els.monsterGrid.append(empty);
          continue;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = `monster-cell monster-tone-${monsterCell.tone}`;
        button.dataset.key = cellKey;
        button.style.gridColumn = String(x + 1);
        button.style.gridRow = String(y + 1);
        const owner = monsterInstanceById(monsterCell.monsterInstanceId);
        const isDraggingPlacedCell = draggingPlacedCells.has(cellKey);
        const isSelectedPlacement = monsterCell.placementId && monsterCell.placementId === state.selectedPlacementId;
        if (owner && isMonsterInstanceSealed(owner)) button.classList.add("sealed");
        if (monsterCell.covered && !isDraggingPlacedCell) {
          button.classList.add("covered");
          if (monsterCell.placementId) {
            const placement = getPlacement(monsterCell.placementId);
            if (isCurrentTurnPlacement(placement)) {
              button.dataset.placementId = String(monsterCell.placementId);
              button.addEventListener("pointerdown", (event) => beginPlacedPieceDrag(event, monsterCell.placementId, x, y));
            } else {
              button.classList.add("locked");
              button.dataset.placementId = String(monsterCell.placementId);
              button.addEventListener("pointerdown", (event) => selectLockedPlacement(event, monsterCell.placementId));
            }
          }
        }
        if (isSelectedPlacement) button.classList.add("selected-recall");
        if (state.blocked.has(cellKey)) button.classList.add("blocked");
        if (dropPreviewCells.has(cellKey)) {
          button.classList.add(dropPreview.valid ? "preview-place" : "preview-invalid");
        }

        if (monsterCell.icon && (!monsterCell.covered || isDraggingPlacedCell)) {
          const icon = document.createElement("span");
          const iconMeta = ICONS[monsterCell.icon];
          icon.className = `cell-icon monster-cell-icon ${iconMeta.className}`;
          icon.textContent = iconMeta.mark;
          icon.title = iconMeta.label;
          icon.style.left = monsterBoardPos(x + 0.5);
          icon.style.top = monsterBoardPos(y + 0.5);
          els.monsterGrid.append(icon);
        }

        els.monsterGrid.append(button);
      }
    }
  }

  function monsterBoardPos(value) {
    const cell = state.cellSize || getMonsterCellSize();
    return `${value * (cell + BOARD_GAP)}px`;
  }

  function monsterBoardSpan(count) {
    const cell = state.cellSize || getMonsterCellSize();
    return `${count * cell + Math.max(0, count - 1) * BOARD_GAP}px`;
  }

  function renderMaterialBoard() {
    const pieceByCell = buildPieceByCell({ skipDragging: true });
    const specialByCell = buildSpecialByCell({ skipDragging: true });
    const dropPreview = state.dropPreview?.zone === "material" ? state.dropPreview : null;
    const dropPreviewCells = new Set(dropPreview?.cells || []);
    const editPreview = state.boardEdit ? getBoardEditPreview() : null;
    const editPreviewCells = editPreview?.previewCells || new Set();
    const rewardEditByCell = state.boardEdit ? getBoardEditPlacedRewardByCell({ skipDragging: true }) : new Map();
    els.materialGrid.style.gridTemplateColumns = `repeat(${state.materialCols}, var(--small-cell))`;
    els.materialGrid.innerHTML = "";
    els.cutLayer.innerHTML = "";
    els.knifeLayer.innerHTML = "";

    for (let y = 0; y < state.materialRows; y += 1) {
      for (let x = 0; x < state.materialCols; x += 1) {
        const cellKey = key(x, y);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "material-cell";
        button.dataset.key = cellKey;
        const rewardEditItem = rewardEditByCell.get(cellKey);

        if (state.boardEdit) {
          if (state.boardCells.has(cellKey)) button.classList.add("board-source-cell");
          if (editPreview?.placedCells?.has(cellKey)) button.classList.add("edit-selected");
          if (editPreview?.validCells?.has(cellKey)) button.classList.add("edit-valid");
          if (editPreviewCells.has(cellKey)) {
            button.classList.add(editPreview.previewValid ? "preview-place" : "preview-invalid");
          }
        }

        if (state.missingCells.has(cellKey)) {
          button.classList.add("used");
          button.disabled = true;
        } else if (state.spoiledCells.has(cellKey)) {
          button.classList.add("spoiled");
          button.disabled = true;
        } else if (rewardEditItem) {
          button.classList.add("reward-temp-cell", "edit-selected");
          button.dataset.rewardItemId = rewardEditItem.id;
          renderRewardEditCellMark(button, rewardEditItem);
          button.addEventListener("pointerdown", (event) => beginPlacedRewardDrag(event, rewardEditItem.id, x, y));
        } else if (pieceByCell.has(cellKey)) {
          const pieceId = pieceByCell.get(cellKey);
          const piece = getPiece(pieceId);
          button.dataset.pieceId = String(pieceId);
          button.classList.add(`piece-tone-${pieceId % 5}`);
          if (piece?.spawnType) button.classList.add("spawn-piece", `spawn-${piece.spawnType}`);
          const specialType = specialByCell.get(cellKey);
          if (specialType) {
            const meta = LINK_META[specialType];
            button.classList.add("special-cell", meta.className);
            const badge = document.createElement("span");
            badge.className = "special-cell-mark";
            badge.textContent = meta.mark;
            button.append(badge);
          }
          if (!state.boardEdit) {
            button.addEventListener("pointerdown", (event) => beginPieceDrag(event, pieceId, x, y));
          }
        } else {
          button.classList.add("empty-material");
        }

        if (dropPreviewCells.has(cellKey)) {
          button.classList.add(dropPreview.valid ? "preview-place" : "preview-invalid");
        }

        els.materialGrid.append(button);
      }
    }

    renderSpecialLinks();
    renderCutMarks();
    renderBoardEffects();
    renderKnifeGuide();
    renderKnives();
    renderRewardTray();
    renderWorkbenchHint();
  }

  function renderWorkbenchHint() {
    if (state.boardEdit) {
      els.knifeHint.textContent = "보상 조각을 드래그해서 판에 붙인 뒤 완료하세요.";
      return;
    }
    if (getPlacement(state.selectedPlacementId)) {
      els.knifeHint.textContent = "회수는 칼질 1회를 써서 고정된 조각을 재료판으로 되돌립니다.";
      return;
    }
    if (!availableMaterialCount()) {
      els.knifeHint.textContent = "남은 조각이 없습니다. 몬스터 행동 후 새 재료판을 받습니다.";
      return;
    }
    els.knifeHint.textContent = "새 판은 남은 조각을 버리고 몬스터 행동 후 새 재료판을 받습니다.";
  }

  function renderCutMarks() {
    const rendered = new Set();
    state.materialPieces.forEach((piece) => {
      if (piece.id === state.draggingPieceId) return;
      piece.cutEdges.forEach((edge) => rendered.add(edge));
    });

    rendered.forEach((edge) => {
      const mark = edgeToMark(edge);
      if (!mark) return;
      const el = document.createElement("span");
      el.className = `cut-mark ${mark.orientation}`;
      el.style.left = boardPos(mark.x);
      el.style.top = boardPos(mark.y);
      if (mark.orientation === "h") {
        el.style.width = "var(--small-cell)";
      } else {
        el.style.height = "var(--small-cell)";
      }
      els.cutLayer.append(el);
    });
  }

  function renderKnives() {
    if (state.boardEdit) return;
    state.knives.forEach((knife, index) => {
      if (state.drag?.type === "knife" && state.drag.index === index) return;
      const el = renderKnifeShape(knife, "board-knife", true);
      el.type = "button";
      el.dataset.knifeIndex = String(index);
      el.addEventListener("pointerdown", (event) => beginKnifeDrag(event, index));
      els.knifeLayer.append(el);
    });
  }

  function renderKnifeGuide() {
    if (!state.knifePreview) return;
    const el = renderKnifeShape(state.knifePreview, "knife-guide", true);
    els.knifeLayer.append(el);
  }

  function boardPos(value) {
    const cell = getMaterialCellSize();
    return `${getBoardPad() + value * (cell + BOARD_GAP)}px`;
  }

  function boardLinePx(value) {
    return getBoardPad() + value * (getMaterialCellSize() + BOARD_GAP);
  }

  function renderKnifeShape(knife, className, absolute) {
    const type = KNIFE_TYPES[knife.type];
    const box = knifeBox(knife);
    const el = document.createElement(absolute && className === "board-knife" ? "button" : "span");
    el.className = className;
    el.setAttribute("aria-label", type.label);
    el.title = type.label;
    el.style.width = `${box.width}px`;
    el.style.height = `${box.height}px`;
    if (absolute) {
      el.style.left = `${box.left}px`;
      el.style.top = `${box.top}px`;
    }

    knifeBladeRuns(knife).forEach((run) => {
      const rect = knifeBladeRect(run);
      const blade = document.createElement("span");
      blade.className = `knife-blade ${run.orientation}`;
      blade.style.left = `${rect.left - box.left}px`;
      blade.style.top = `${rect.top - box.top}px`;
      blade.style.width = `${rect.width}px`;
      blade.style.height = `${rect.height}px`;
      el.append(blade);
    });
    return el;
  }

  function knifeBox(knife) {
    const rects = knifeBladeRuns(knife).map(knifeBladeRect);
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.left + rect.width));
    const bottom = Math.max(...rects.map((rect) => rect.top + rect.height));
    return { left, top, width: right - left, height: bottom - top };
  }

  function knifeSegments(knife) {
    return KNIFE_TYPES[knife.type].segments.map((segment) => ({
      orientation: segment.orientation,
      x: knife.x + segment.x,
      y: knife.y + segment.y,
    }));
  }

  function knifeBladeRuns(knife) {
    return segmentsToBladeRuns(knifeSegments(knife));
  }

  function segmentsToBladeRuns(segments) {
    const runs = [];
    const horizontal = segments.filter((segment) => segment.orientation === "h").sort((a, b) => a.y - b.y || a.x - b.x);
    const vertical = segments.filter((segment) => segment.orientation === "v").sort((a, b) => a.x - b.x || a.y - b.y);

    horizontal.forEach((segment) => {
      const last = runs[runs.length - 1];
      if (last?.orientation === "h" && last.y === segment.y && last.x + last.length === segment.x) {
        last.length += 1;
        return;
      }
      runs.push({ orientation: "h", x: segment.x, y: segment.y, length: 1 });
    });

    vertical.forEach((segment) => {
      const last = runs[runs.length - 1];
      if (last?.orientation === "v" && last.x === segment.x && last.y + last.length === segment.y) {
        last.length += 1;
        return;
      }
      runs.push({ orientation: "v", x: segment.x, y: segment.y, length: 1 });
    });

    return runs;
  }

  function knifeBladeRect(run) {
    const cell = getMaterialCellSize();
    const hit = getKnifeHitSize();
    const span = run.length * cell + Math.max(0, run.length - 1) * BOARD_GAP;
    const lineX = boardLinePx(run.x);
    const lineY = boardLinePx(run.y);
    if (run.orientation === "h") {
      return { left: lineX, top: lineY - hit / 2, width: span, height: hit };
    }
    return { left: lineX - hit / 2, top: lineY, width: hit, height: span };
  }

  function beginKnifeDrag(event, index) {
    if (state.boardEdit || state.resultMode) return;
    event.preventDefault();
    state.selectedPlacementId = null;
    state.drag = { type: "knife", index };
    state.knifePreview = getKnifePreview(index, event.clientX, event.clientY);
    renderMaterialBoard();
    showKnifeGhost(index, event.clientX, event.clientY);
    window.addEventListener("pointermove", onKnifeMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onKnifeCancel);
  }

  function onKnifeMove(event) {
    if (!state.drag || state.drag.type !== "knife") return;
    state.knifePreview = getKnifePreview(state.drag.index, event.clientX, event.clientY);
    moveKnifeGhost(event.clientX, event.clientY);
    renderMaterialBoard();
  }

  function getKnifePreview(index, clientX, clientY) {
    const knife = state.knives[index];
    const guidePoint = getDragGuidePoint(clientX, clientY);
    return {
      ...knife,
      ...getKnifePositionFromPoint(knife.type, guidePoint.x, guidePoint.y),
    };
  }

  function getKnifePositionFromPoint(knifeType, clientX, clientY) {
    const type = KNIFE_TYPES[knifeType];
    const rect = els.materialBoard.getBoundingClientRect();
    const cell = getMaterialCellSize();
    const step = cell + BOARD_GAP;
    const localX = clientX - rect.left - getBoardPad();
    const localY = clientY - rect.top - getBoardPad();
    const relativeCenter = knifeRelativeCenter(type);
    const range = knifeAnchorRange(type);

    return {
      x: clamp(Math.round((localX - relativeCenter.x) / step), range.minX, range.maxX),
      y: clamp(Math.round((localY - relativeCenter.y) / step), range.minY, range.maxY),
    };
  }

  function knifeRelativeCenter(type) {
    const cell = getMaterialCellSize();
    const step = cell + BOARD_GAP;
    const hit = getKnifeHitSize();
    const rects = segmentsToBladeRuns(type.segments).map((run) => {
      const span = run.length * cell + Math.max(0, run.length - 1) * BOARD_GAP;
      if (run.orientation === "h") {
        return { left: run.x * step, top: run.y * step - hit / 2, right: run.x * step + span, bottom: run.y * step + hit / 2 };
      }
      return { left: run.x * step - hit / 2, top: run.y * step, right: run.x * step + hit / 2, bottom: run.y * step + span };
    });
    const left = Math.min(...rects.map((item) => item.left));
    const top = Math.min(...rects.map((item) => item.top));
    const right = Math.max(...rects.map((item) => item.right));
    const bottom = Math.max(...rects.map((item) => item.bottom));
    return { x: (left + right) / 2, y: (top + bottom) / 2 };
  }

  function knifeAnchorRange(type) {
    let minX = -Infinity;
    let minY = -Infinity;
    let maxX = Infinity;
    let maxY = Infinity;

    type.segments.forEach((segment) => {
      if (segment.orientation === "h") {
        minX = Math.max(minX, -segment.x);
        maxX = Math.min(maxX, state.materialCols - 1 - segment.x);
        minY = Math.max(minY, 1 - segment.y);
        maxY = Math.min(maxY, state.materialRows - 1 - segment.y);
      } else {
        minX = Math.max(minX, 1 - segment.x);
        maxX = Math.min(maxX, state.materialCols - 1 - segment.x);
        minY = Math.max(minY, -segment.y);
        maxY = Math.min(maxY, state.materialRows - 1 - segment.y);
      }
    });

    return {
      minX: Number.isFinite(minX) ? minX : 0,
      minY: Number.isFinite(minY) ? minY : 0,
      maxX: Number.isFinite(maxX) ? maxX : 0,
      maxY: Number.isFinite(maxY) ? maxY : 0,
    };
  }

  function onPointerUp() {
    removeKnifeDragListeners();
    if (state.drag?.type === "knife" && state.knifePreview) {
      const knife = state.knives[state.drag.index];
      knife.x = state.knifePreview.x;
      knife.y = state.knifePreview.y;
    }
    hideDragGhost();
    state.knifePreview = null;
    state.drag = null;
    render();
  }

  function onKnifeCancel() {
    removeKnifeDragListeners();
    hideDragGhost();
    state.knifePreview = null;
    state.drag = null;
    render();
  }

  function removeKnifeDragListeners() {
    window.removeEventListener("pointermove", onKnifeMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onKnifeCancel);
  }

  function applyCuts() {
    if (state.cutsUsed >= MAX_CUTS_PER_TURN) {
      addLog("이번 턴에는 더 자를 수 없다.");
      render();
      return;
    }

    state.cutsUsed += 1;
    state.selectedPlacementId = null;
    let added = 0;
    let triggered = 0;
    const linkRewards = { heal: 0, attack: 0, defense: 0 };
    state.knives.forEach((knife) => {
      knifeCutEdges(knife).forEach((edge) => {
        state.materialPieces.forEach((piece) => {
          if (isPieceEdge(edge, piece) && !piece.cutEdges.has(edge)) {
            piece.cutEdges.add(edge);
            added += 1;
            const link = piece.specialLinks?.get(edge);
            if (link?.active && triggered < LINK_TRIGGER_LIMIT_PER_CUT) {
              link.active = false;
              const [left, right] = edge.split("|");
              piece.specialCells?.delete(left);
              piece.specialCells?.delete(right);
              triggered += 1;
              linkRewards[link.type] += 1;
            }
          }
        });
      });
    });

    if (linkRewards.heal) {
      state.playerHp = Math.min(heroMaxHp(), state.playerHp + linkRewards.heal);
    }
    if (linkRewards.defense) {
      state.shield += linkRewards.defense;
    }
    const before = state.materialPieces.length;
    rebuildPiecesFromCuts();
    if (linkRewards.attack) spawnSingleCellPieces(linkRewards.attack);
    const separated = Math.max(0, state.materialPieces.length - before);
    const cutSuffix = `남은 자르기 ${remainingCuts()}회.`;
    const linkText = formatLinkRewardLog(linkRewards);
    addLog(added ? `절단선 ${added}개를 냈다. ${separated ? `${separated}개 조각이 새로 분리됐다.` : "아직 흠집만 남아 있다."}${linkText} ${cutSuffix}` : `새로 잘린 선이 없다. ${cutSuffix}`);
    render();
  }

  function knifeCutEdges(knife) {
    return knifeSegments(knife).map((segment) => {
      if (segment.orientation === "h") {
        return edgeKey(key(segment.x, segment.y - 1), key(segment.x, segment.y));
      }
      return edgeKey(key(segment.x - 1, segment.y), key(segment.x, segment.y));
    });
  }

  function beginPieceDrag(event, pieceId, grabbedX, grabbedY) {
    if (state.boardEdit || state.resultMode) return;
    const piece = getPiece(pieceId);
    if (!piece) return;
    event.preventDefault();
    const min = minCell(piece.cells);
    const cells = normalizeCells(piece.cells);
    const offset = getGrabbedCellOffset(min, grabbedX, grabbedY);
    state.selectedPlacementId = null;
    state.drag = { type: "piece", pieceId, offset, cells };
    state.drag.cutEdges = normalizeCutEdges(piece.cutEdges, min);
    state.drag.specialCells = normalizeSpecialCells(piece.specialCells, min);
    state.drag.specialLinks = normalizeSpecialLinks(piece.specialLinks, min);
    state.drag.source = "material";
    state.draggingPieceId = pieceId;
    state.dropPreview = null;
    renderMaterialBoard();
    showDragGhost(state.drag.cells, state.drag.cutEdges, event.clientX, event.clientY, state.drag.specialCells, state.drag.specialLinks);
    updateDropPreview(event.clientX, event.clientY);
    window.addEventListener("pointermove", onPieceMove);
    window.addEventListener("pointerup", onPieceUp);
    window.addEventListener("pointercancel", onPieceCancel);
  }

  function onPieceMove(event) {
    if (!state.drag || state.drag.type !== "piece") return;
    moveDragGhost(event.clientX, event.clientY);
    updateDropPreview(event.clientX, event.clientY);
  }

  function onPieceUp(event) {
    removePieceDragListeners();
    const drag = state.drag;
    const dropPreview = getDropPreview(event.clientX, event.clientY);
    state.drag = null;
    state.draggingPieceId = null;
    state.draggingPlacementId = null;
    state.dropPreview = null;
    hideDragGhost();
    if (!drag) return;

    if (drag.source === "monster" && dropPreview?.zone === "material") {
      tryReturnPlacedPieceToBoard(drag.placementId, dropPreview.anchorX, dropPreview.anchorY);
      return;
    }

    if (drag.source === "monster" && dropPreview?.zone === "monster") {
      tryMovePlacedPieceOnMonster(drag.placementId, dropPreview.anchorX, dropPreview.anchorY);
      return;
    }

    if (drag.source === "material" && dropPreview?.zone === "monster") {
      tryPlacePieceOnMonster(drag.pieceId, dropPreview.anchorX, dropPreview.anchorY);
      return;
    }

    if (drag.source === "material" && dropPreview?.zone === "material") {
      tryMovePieceOnBoard(drag.pieceId, dropPreview.anchorX, dropPreview.anchorY);
      return;
    }

    render();
  }

  function onPieceCancel() {
    removePieceDragListeners();
    state.drag = null;
    state.draggingPieceId = null;
    state.draggingPlacementId = null;
    state.dropPreview = null;
    hideDragGhost();
    render();
  }

  function removePieceDragListeners() {
    window.removeEventListener("pointermove", onPieceMove);
    window.removeEventListener("pointerup", onPieceUp);
    window.removeEventListener("pointercancel", onPieceCancel);
  }

  function beginRewardDrag(event, itemId, grabbedX, grabbedY) {
    const item = getBoardEditItem(itemId);
    if (!item || state.boardEdit?.closing) return;
    event.preventDefault();
    const min = minCell(item.shape);
    const cells = normalizeCells(item.shape);
    const offset = getGrabbedCellOffset(min, grabbedX, grabbedY);
    state.drag = {
      type: "reward",
      rewardItemId: item.id,
      offset,
      cells,
      specialCells: rewardItemSpecialCells(item),
      specialLinks: rewardItemSpecialLinks(item),
    };
    state.draggingRewardItemId = item.id;
    state.dropPreview = null;
    renderRewardTray();
    showDragGhost(state.drag.cells, new Set(), event.clientX, event.clientY, state.drag.specialCells, state.drag.specialLinks);
    updateRewardDropPreview(event.clientX, event.clientY);
    window.addEventListener("pointermove", onRewardMove);
    window.addEventListener("pointerup", onRewardUp);
    window.addEventListener("pointercancel", onRewardCancel);
  }

  function beginPlacedRewardDrag(event, itemId, boardX, boardY) {
    const item = getBoardEditItem(itemId);
    if (!item || !item.placed || state.boardEdit?.closing) return;
    event.preventDefault();
    const min = minCell(item.cells);
    const offset = getGrabbedCellOffset(min, boardX, boardY);
    state.drag = {
      type: "reward",
      rewardItemId: item.id,
      offset,
      cells: normalizeCells(item.cells),
      specialCells: rewardItemSpecialCells(item),
      specialLinks: rewardItemSpecialLinks(item),
    };
    state.draggingRewardItemId = item.id;
    state.dropPreview = null;
    renderMaterialBoard();
    renderRewardTray();
    showDragGhost(state.drag.cells, new Set(), event.clientX, event.clientY, state.drag.specialCells, state.drag.specialLinks);
    updateRewardDropPreview(event.clientX, event.clientY);
    window.addEventListener("pointermove", onRewardMove);
    window.addEventListener("pointerup", onRewardUp);
    window.addEventListener("pointercancel", onRewardCancel);
  }

  function onRewardMove(event) {
    if (!state.drag || state.drag.type !== "reward") return;
    moveDragGhost(event.clientX, event.clientY);
    updateRewardDropPreview(event.clientX, event.clientY);
  }

  function onRewardUp(event) {
    removeRewardDragListeners();
    const drag = state.drag;
    const preview = getRewardDropPreview(event.clientX, event.clientY);
    state.drag = null;
    state.draggingRewardItemId = null;
    state.dropPreview = null;
    hideDragGhost();
    if (!drag) return;

    if (preview?.valid) {
      placeRewardItem(drag.rewardItemId, preview.anchorX, preview.anchorY);
      return;
    }

    addLog("그 위치에는 보상을 붙일 수 없다.");
    render();
  }

  function onRewardCancel() {
    removeRewardDragListeners();
    state.drag = null;
    state.draggingRewardItemId = null;
    state.dropPreview = null;
    hideDragGhost();
    render();
  }

  function removeRewardDragListeners() {
    window.removeEventListener("pointermove", onRewardMove);
    window.removeEventListener("pointerup", onRewardUp);
    window.removeEventListener("pointercancel", onRewardCancel);
  }

  function selectLockedPlacement(event, placementId) {
    event.preventDefault();
    if (state.resultMode) return;
    const placement = getPlacement(placementId);
    if (!placement || isCurrentTurnPlacement(placement)) return;
    state.selectedPlacementId = state.selectedPlacementId === placementId ? null : placementId;
    state.dropPreview = null;
    render();
  }

  function beginPlacedPieceDrag(event, placementId, grabbedX, grabbedY) {
    if (state.boardEdit || state.resultMode) return;
    const placement = getPlacement(placementId);
    if (!isCurrentTurnPlacement(placement)) return;
    event.preventDefault();
    const min = minCell(placement.cells);
    const cells = normalizeCells(placement.cells);
    const offset = getGrabbedCellOffset(min, grabbedX, grabbedY);
    state.selectedPlacementId = null;
    state.drag = {
      type: "piece",
      source: "monster",
      placementId,
      offset,
      cells,
      cutEdges: normalizeCutEdges(placement.cutEdges, min),
      specialCells: normalizeSpecialCells(placement.specialCells, min),
      specialLinks: normalizeSpecialLinks(placement.specialLinks, min),
    };
    state.draggingPlacementId = placementId;
    state.dropPreview = null;
    renderMonster();
    showDragGhost(state.drag.cells, state.drag.cutEdges, event.clientX, event.clientY, state.drag.specialCells, state.drag.specialLinks);
    updateDropPreview(event.clientX, event.clientY);
    window.addEventListener("pointermove", onPieceMove);
    window.addEventListener("pointerup", onPieceUp);
    window.addEventListener("pointercancel", onPieceCancel);
  }

  function tryMovePieceOnBoard(pieceId, anchorX, anchorY) {
    const piece = getPiece(pieceId);
    if (!piece) return;
    const placement = getBoardPlacement(piece, anchorX, anchorY);

    if (!placement.valid) {
      addLog("그 위치에는 재료 조각을 옮길 수 없다.");
      render();
      return;
    }

    const currentMin = minCell(piece.cells);
    const dx = anchorX - currentMin.x;
    const dy = anchorY - currentMin.y;
    piece.cells = placement.cells;
    piece.cutEdges = translateCutEdges(piece.cutEdges, dx, dy);
    piece.specialCells = translateSpecialCells(piece.specialCells, dx, dy);
    piece.specialLinks = translateSpecialLinks(piece.specialLinks, dx, dy);
    addLog(`${placement.cells.length}칸 조각을 재료판 안에서 옮겼다.`);
    render();
  }

  function tryPlacePieceOnMonster(pieceId, anchorX, anchorY) {
    const piece = getPiece(pieceId);
    if (!piece) return;
    const placement = getMonsterPlacement(piece, anchorX, anchorY);

    if (!placement.valid) {
      addLog("그 위치에는 재료 조각이 맞지 않는다.");
      render();
      return;
    }

    placement.cells.forEach((cell) => {
      const cellKey = key(cell.x, cell.y);
      const monsterCell = state.monsterCells.get(cellKey);
      monsterCell.covered = true;
      monsterCell.placementId = state.nextPlacementId;
      state.coverOrder = state.coverOrder.filter((coveredKey) => coveredKey !== cellKey);
      state.coverOrder.push(cellKey);
    });
    const pieceMin = minCell(piece.cells);
    const placementMin = minCell(placement.cells);
    state.placedPieces.push({
      id: state.nextPlacementId,
      turn: state.turn,
      cells: placement.cells,
      cutEdges: translateCutEdges(piece.cutEdges, placementMin.x - pieceMin.x, placementMin.y - pieceMin.y),
      specialCells: translateSpecialCells(piece.specialCells, placementMin.x - pieceMin.x, placementMin.y - pieceMin.y),
      specialLinks: translateSpecialLinks(piece.specialLinks, placementMin.x - pieceMin.x, placementMin.y - pieceMin.y),
    });
    state.nextPlacementId += 1;
    state.materialPieces = state.materialPieces.filter((pieceItem) => pieceItem.id !== pieceId);
    addLog(`${placement.cells.length}칸 조각을 몬스터에 채웠다.`);

    if (isMonsterComplete()) {
      render();
      showStageClear();
      return;
    }

    render();
  }

  function tryReturnPlacedPieceToBoard(placementId, anchorX, anchorY) {
    const placement = getPlacement(placementId);
    if (!isCurrentTurnPlacement(placement)) {
      addLog("이전 턴에 놓은 조각은 더 이상 움직일 수 없다.");
      render();
      return;
    }
    const boardPlacement = getBoardPlacementFromCells(normalizeCells(placement.cells), anchorX, anchorY);

    if (!boardPlacement.valid) {
      addLog("그 위치에는 회수한 조각을 놓을 수 없다.");
      render();
      return;
    }

    removePlacementCoverage(placement);
    state.placedPieces = state.placedPieces.filter((item) => item.id !== placementId);
    state.materialPieces.push({
      id: state.nextPieceId,
      cells: boardPlacement.cells,
      cutEdges: translateCutEdges(placement.cutEdges, anchorX - minCell(placement.cells).x, anchorY - minCell(placement.cells).y),
      specialCells: translateSpecialCells(placement.specialCells, anchorX - minCell(placement.cells).x, anchorY - minCell(placement.cells).y),
      specialLinks: translateSpecialLinks(placement.specialLinks, anchorX - minCell(placement.cells).x, anchorY - minCell(placement.cells).y),
    });
    state.nextPieceId += 1;
    addLog(`${boardPlacement.cells.length}칸 조각을 다시 재료판으로 가져왔다.`);
    render();
  }

  function tryMovePlacedPieceOnMonster(placementId, anchorX, anchorY) {
    const placement = getPlacement(placementId);
    if (!isCurrentTurnPlacement(placement)) {
      addLog("이전 턴에 놓은 조각은 더 이상 움직일 수 없다.");
      render();
      return;
    }
    const monsterPlacement = getMonsterPlacementFromCells(normalizeCells(placement.cells), anchorX, anchorY, placementId);

    if (!monsterPlacement.valid) {
      addLog("그 위치에는 조각을 다시 놓을 수 없다.");
      render();
      return;
    }

    const currentMin = minCell(placement.cells);
    const nextMin = minCell(monsterPlacement.cells);
    const dx = nextMin.x - currentMin.x;
    const dy = nextMin.y - currentMin.y;
    removePlacementCoverage(placement);
    placement.cells = monsterPlacement.cells;
    placement.cutEdges = translateCutEdges(placement.cutEdges, dx, dy);
    placement.specialCells = translateSpecialCells(placement.specialCells, dx, dy);
    placement.specialLinks = translateSpecialLinks(placement.specialLinks, dx, dy);
    placement.cells.forEach((cell) => {
      const cellKey = key(cell.x, cell.y);
      const monsterCell = state.monsterCells.get(cellKey);
      monsterCell.covered = true;
      monsterCell.placementId = placement.id;
      state.coverOrder = state.coverOrder.filter((coveredKey) => coveredKey !== cellKey);
      state.coverOrder.push(cellKey);
    });
    addLog(`${placement.cells.length}칸 조각을 몬스터 위에서 옮겼다.`);
    render();
  }

  function recoverSelectedPlacement() {
    const placement = getPlacement(state.selectedPlacementId);
    if (!placement) {
      state.selectedPlacementId = null;
      render();
      return;
    }
    if (state.cutsUsed >= MAX_CUTS_PER_TURN) {
      addLog("회수하려면 남은 칼질이 필요하다.");
      render();
      return;
    }

    const normalized = normalizeCells(placement.cells);
    const boardPlacement = findBoardPlacementForCells(normalized);
    if (!boardPlacement) {
      addLog("재료판에 회수할 공간이 없다.");
      render();
      return;
    }

    const placementMin = minCell(placement.cells);
    removePlacementCoverage(placement);
    state.placedPieces = state.placedPieces.filter((item) => item.id !== placement.id);
    state.materialPieces.push({
      id: state.nextPieceId,
      cells: boardPlacement.cells,
      cutEdges: translateCutEdges(placement.cutEdges, boardPlacement.anchorX - placementMin.x, boardPlacement.anchorY - placementMin.y),
      specialCells: translateSpecialCells(placement.specialCells, boardPlacement.anchorX - placementMin.x, boardPlacement.anchorY - placementMin.y),
      specialLinks: translateSpecialLinks(placement.specialLinks, boardPlacement.anchorX - placementMin.x, boardPlacement.anchorY - placementMin.y),
    });
    state.nextPieceId += 1;
    state.cutsUsed += 1;
    state.selectedPlacementId = null;
    addLog(`${boardPlacement.cells.length}칸 조각을 회수했다. 칼질 1회를 사용했다.`);
    render();
  }

  function findBoardPlacementForCells(normalizedCells) {
    const anchors = [];
    const centerX = (state.materialCols - 1) / 2;
    const centerY = (state.materialRows - 1) / 2;
    const maxX = Math.max(...normalizedCells.map((cell) => cell.x));
    const maxY = Math.max(...normalizedCells.map((cell) => cell.y));

    for (let y = 0; y <= state.materialRows - maxY - 1; y += 1) {
      for (let x = 0; x <= state.materialCols - maxX - 1; x += 1) {
        const placement = getBoardPlacementFromCells(normalizedCells, x, y);
        if (!placement.valid) continue;
        const pieceCenterX = x + maxX / 2;
        const pieceCenterY = y + maxY / 2;
        anchors.push({
          ...placement,
          anchorX: x,
          anchorY: y,
          distance: Math.hypot(pieceCenterX - centerX, pieceCenterY - centerY),
        });
      }
    }

    anchors.sort((a, b) => a.distance - b.distance || a.anchorY - b.anchorY || a.anchorX - b.anchorX);
    return anchors[0] || null;
  }

  function finishPlayerTurn(options = {}) {
    const { discardMaterial = false, refillBoard = false } = options;
    state.selectedPlacementId = null;

    if (discardMaterial) {
      const discarded = availableMaterialCount();
      state.materialPieces = [];
      state.missingCells = new Set();
      state.spoiledCells = new Set();
      addLog(discarded ? `남은 재료 ${discarded}칸을 버리고 새 판을 요청했다.` : "새 판을 요청했다.");
    } else {
      addLog("턴 종료. 몬스터가 예고한 행동을 실행한다.");
    }

    const oldBlocks = state.blocked.size;
    state.blocked = new Set();
    if (oldBlocks) addLog("이번 턴을 막던 갑피가 떨어졌다.");

    const skipsMonsterAction = discardMaterial && refillBoard && state.silentRefills > 0;
    if (skipsMonsterAction) {
      state.silentRefills -= 1;
      addLog("무음 재충전으로 몬스터 행동을 1회 무시했다.");
    } else {
      executeMonsterAction();
    }

    if (state.playerHp <= 0) {
      render();
      showLoss("파티가 쓰러졌다.", "몬스터의 행동을 줄일 아이콘부터 덮어야 한다.");
      return;
    }

    state.actionIndex += 1;
    state.turn += 1;
    state.cutsUsed = 0;

    if (refillBoard || !availableMaterialCount()) {
      resetMaterialBoard();
      addLog("새 재료판을 받았다.");
    }

    lockTurnActions();
    render();
  }

  function executeMonsterAction() {
    const monsters = aliveMonsterInstances();
    if (!monsters.length) return;
    monsters.forEach((monster) => {
      if (state.playerHp <= 0) return;
      executeMonsterInstanceAction(monster, plannedMonsterAction(monster));
    });
  }

  function executeMonsterInstanceAction(monster, action) {
    if (action === "attack") {
      executeBasicMonsterAttack(`${monsterActionName(monster)} 공격 실행`, monster);
      return;
    }

    if (action === "heal") {
      if (!uncoveredIconCount("heal", monster.instanceId)) {
        addLog(`${monsterActionName(monster)} 회복 표식이 막혀 행동하지 않았다.`);
        return;
      }
      const targets = chooseHealTargets(MONSTER_HEAL_PER_ACTION, monster.instanceId);
      if (!targets.length) {
        addLog(`${monsterActionName(monster)} 회복할 칸이 없어 행동하지 않았다.`);
        return;
      }
      targets.forEach((cellKey) => uncoverMonsterCell(cellKey));
      state.coverOrder = state.coverOrder.filter((cellKey) => !targets.includes(cellKey));
      prunePlacedPieces();
      addLog(`${monsterActionName(monster)} 회복 실행. 무작위 ${targets.length}칸이 다시 비었다.`);
      return;
    }

    if (action === "defense") {
      if (!uncoveredIconCount("defense", monster.instanceId)) {
        addLog(`${monsterActionName(monster)} 방어 표식이 막혀 행동하지 않았다.`);
        return;
      }
      const blocks = chooseArmorBlocks(MONSTER_ARMOR_PER_ACTION, monster.instanceId);
      if (!blocks.length) {
        addLog(`${monsterActionName(monster)} 갑피를 놓을 칸이 없어 행동하지 않았다.`);
        return;
      }
      blocks.forEach((cellKey) => state.blocked.add(cellKey));
      addLog(`${monsterActionName(monster)} 갑피 전개. 다음 턴 무작위 ${blocks.length}칸은 배치할 수 없다.`);
      return;
    }

    if (action === "special") {
      const specialIcons = uncoveredIconCount("special", monster.instanceId);
      if (!specialIcons) {
        addLog(`${monsterActionName(monster)} 특수 표식이 막혀 행동하지 않았다.`);
        return;
      }
      monster.special(state, specialIcons, monster);
    }
  }

  function executeBasicMonsterAttack(prefix, monster = currentMonster()) {
    const attackIcons = uncoveredIconCount("attack", monster.instanceId);
    const damage = monster.baseAttack + attackIcons;
    const taken = takeDamage(damage);
    const shielded = damage - taken;
    addLog(`${prefix}. 기본 ${monster.baseAttack} + 공격 표식 ${attackIcons} = ${taken} 피해${shielded ? `, 쉴드 ${shielded} 흡수` : ""}.`);
  }

  function monsterActionName(monster) {
    return `${monster.order + 1}번 ${monster.name}`;
  }

  function takeDamage(amount) {
    const shielded = Math.min(state.shield, amount);
    state.shield -= shielded;
    const damage = amount - shielded;
    state.playerHp -= damage;
    return damage;
  }

  function rebuildPiecesFromCuts() {
    const nextPieces = [];

    state.materialPieces.forEach((piece) => {
      const pieceKeys = new Set(piece.cells.map((cell) => key(cell.x, cell.y)));
      const unseen = new Set(pieceKeys);
      const components = [];

      while (unseen.size) {
        const start = unseen.values().next().value;
        const queue = [start];
        const cells = [];
        unseen.delete(start);

        while (queue.length) {
          const current = queue.shift();
          const { x, y } = fromKey(current);
          cells.push({ x, y });
          neighbors(x, y).forEach((next) => {
            if (!unseen.has(next) || !pieceKeys.has(next)) return;
            if (piece.cutEdges.has(edgeKey(current, next))) return;
            unseen.delete(next);
            queue.push(next);
          });
        }

        components.push(cells);
      }

      if (components.length === 1) {
        const componentKeys = new Set(components[0].map((cell) => key(cell.x, cell.y)));
        nextPieces.push({
          id: piece.id,
          cells: components[0],
          cutEdges: keepCutEdgesForCells(piece.cutEdges, componentKeys),
          specialCells: keepSpecialCellsForCells(piece.specialCells, componentKeys),
          specialLinks: keepSpecialLinksForCells(piece.specialLinks, componentKeys),
        });
        return;
      }

      components.forEach((cells, index) => {
        const componentKeys = new Set(cells.map((cell) => key(cell.x, cell.y)));
        nextPieces.push({
          id: index === 0 ? piece.id : state.nextPieceId,
          cells,
          cutEdges: keepCutEdgesForCells(piece.cutEdges, componentKeys),
          specialCells: keepSpecialCellsForCells(piece.specialCells, componentKeys),
          specialLinks: keepSpecialLinksForCells(piece.specialLinks, componentKeys),
        });
        if (index !== 0) state.nextPieceId += 1;
      });
    });

    state.materialPieces = nextPieces;
  }

  function buildPieceByCell(options = {}) {
    const map = new Map();
    state.materialPieces.forEach((piece) => {
      if (options.skipDragging && piece.id === state.draggingPieceId) return;
      if (options.skipPieceId && piece.id === options.skipPieceId) return;
      piece.cells.forEach((cell) => map.set(key(cell.x, cell.y), piece.id));
    });
    return map;
  }

  function getPiece(pieceId) {
    return state.materialPieces.find((piece) => piece.id === pieceId);
  }

  function getPlacement(placementId) {
    return state.placedPieces.find((placement) => placement.id === placementId);
  }

  function syncSelectedPlacement() {
    const placement = getPlacement(state.selectedPlacementId);
    if (!placement || isCurrentTurnPlacement(placement) || state.resultMode) {
      state.selectedPlacementId = null;
    }
  }

  function isCurrentTurnPlacement(placement) {
    return Boolean(placement) && placement.turn === state.turn && !state.resultMode;
  }

  function getDraggingPlacedCells() {
    const placement = state.draggingPlacementId ? getPlacement(state.draggingPlacementId) : null;
    return new Set(placement ? placement.cells.map((cell) => key(cell.x, cell.y)) : []);
  }

  function removePlacementCoverage(placement) {
    const removed = new Set(placement.cells.map((cell) => key(cell.x, cell.y)));
    placement.cells.forEach((cell) => {
      const monsterCell = state.monsterCells.get(key(cell.x, cell.y));
      if (!monsterCell || monsterCell.placementId !== placement.id) return;
      monsterCell.covered = false;
      delete monsterCell.placementId;
    });
    state.coverOrder = state.coverOrder.filter((cellKey) => !removed.has(cellKey));
  }

  function uncoverMonsterCell(cellKey) {
    const monsterCell = state.monsterCells.get(cellKey);
    if (!monsterCell) return;
    monsterCell.covered = false;
    delete monsterCell.placementId;
  }

  function prunePlacedPieces() {
    state.placedPieces.forEach((placement) => {
      placement.cells = placement.cells.filter((cell) => {
        const monsterCell = state.monsterCells.get(key(cell.x, cell.y));
        return monsterCell?.covered && monsterCell.placementId === placement.id;
      });
      const cellKeys = new Set(placement.cells.map((cell) => key(cell.x, cell.y)));
      placement.cutEdges = keepCutEdgesForCells(placement.cutEdges, cellKeys);
      placement.specialCells = keepSpecialCellsForCells(placement.specialCells, cellKeys);
      placement.specialLinks = keepSpecialLinksForCells(placement.specialLinks, cellKeys);
    });
    state.placedPieces = state.placedPieces.filter((placement) => placement.cells.length > 0);
  }

  function getMaterialCellSize() {
    const cell = els.materialGrid.querySelector(".material-cell");
    return cell ? cell.getBoundingClientRect().width : 22;
  }

  function getBoardPad() {
    return parseFloat(getComputedStyle(els.materialBoard).getPropertyValue("--board-pad")) || 14;
  }

  function getKnifeHitSize() {
    return parseFloat(getComputedStyle(els.materialBoard).getPropertyValue("--knife-hit")) || 38;
  }

  function showDragGhost(cells, cutEdges, x, y, specialCells = new Map(), specialLinks = new Map()) {
    els.dragGhost.className = "drag-ghost";
    els.dragGhost.innerHTML = "";
    els.dragGhost.append(renderBoardPieceGrid(cells, cutEdges, specialCells, specialLinks));
    moveDragGhost(x, y);
  }

  function showKnifeGhost(index, x, y) {
    const knife = state.knives[index];
    const el = renderKnifeShape(knife, "knife-drag-ghost", false);
    els.dragGhost.className = "drag-ghost knife-ghost";
    els.dragGhost.innerHTML = "";
    els.dragGhost.append(el);
    moveKnifeGhost(x, y);
  }

  function moveDragGhost(x, y) {
    const cell = getMaterialCellSize();
    const step = cell + BOARD_GAP;
    const dragOffset = state.drag?.type === "piece" || state.drag?.type === "reward" ? state.drag.offset : { x: 0, y: 0 };
    const nextX = x - dragOffset.x * step - cell / 2;
    const nextY = y - dragOffset.y * step - cell / 2 - DRAG_POINTER_OFFSET;
    els.dragGhost.style.transform = `translate(${nextX}px, ${nextY}px)`;
  }

  function moveKnifeGhost(x, y) {
    const rect = els.dragGhost.getBoundingClientRect();
    const nextX = x - rect.width / 2;
    const nextY = y - rect.height / 2 - DRAG_POINTER_OFFSET;
    els.dragGhost.style.transform = `translate(${nextX}px, ${nextY}px)`;
  }

  function hideDragGhost() {
    els.dragGhost.className = "drag-ghost hidden";
    els.dragGhost.innerHTML = "";
  }

  function renderPieceGrid(cells) {
    const normalized = normalizeCells(cells);
    const maxX = Math.max(...normalized.map((cell) => cell.x));
    const maxY = Math.max(...normalized.map((cell) => cell.y));
    const occupied = new Set(normalized.map((cell) => key(cell.x, cell.y)));
    const grid = document.createElement("div");
    grid.className = "piece-mini-grid";
    grid.style.gridTemplateColumns = `repeat(${maxX + 1}, 12px)`;

    for (let y = 0; y <= maxY; y += 1) {
      for (let x = 0; x <= maxX; x += 1) {
        const cell = document.createElement("span");
        cell.className = "piece-mini-cell";
        if (!occupied.has(key(x, y))) cell.classList.add("empty");
        grid.append(cell);
      }
    }
    return grid;
  }

  function renderBoardPieceGrid(cells, cutEdges = new Set(), specialCells = new Map(), specialLinks = new Map()) {
    const normalized = normalizeCells(cells);
    const maxX = Math.max(...normalized.map((cell) => cell.x));
    const maxY = Math.max(...normalized.map((cell) => cell.y));
    const occupied = new Set(normalized.map((cell) => key(cell.x, cell.y)));
    const grid = document.createElement("div");
    grid.className = "drag-piece-grid";
    grid.style.gridTemplateColumns = `repeat(${maxX + 1}, var(--small-cell))`;

    for (let y = 0; y <= maxY; y += 1) {
      for (let x = 0; x <= maxX; x += 1) {
        const cell = document.createElement("span");
        cell.className = "drag-piece-cell";
        const cellKey = key(x, y);
        if (!occupied.has(cellKey)) {
          cell.classList.add("empty");
        } else if (specialCells.has(cellKey)) {
          const type = specialCells.get(cellKey);
          const meta = LINK_META[type];
          cell.classList.add("special-cell", meta.className);
          const badge = document.createElement("span");
          badge.className = "special-cell-mark";
          badge.textContent = meta.mark;
          cell.append(badge);
        }
        grid.append(cell);
      }
    }

    specialLinks.forEach((link, edge) => {
      if (!link.active) return;
      const mark = edgeToMark(edge);
      if (!mark) return;
      const el = document.createElement("span");
      el.className = `drag-special-link ${mark.orientation} ${LINK_META[link.type].className}`;
      el.style.left = dragGridPos(mark.x);
      el.style.top = dragGridPos(mark.y);
      if (mark.orientation === "h") {
        el.style.width = "var(--small-cell)";
      } else {
        el.style.height = "var(--small-cell)";
      }
      grid.append(el);
    });

    cutEdges.forEach((edge) => {
      const mark = edgeToMark(edge);
      if (!mark) return;
      const el = document.createElement("span");
      el.className = `drag-cut-mark ${mark.orientation}`;
      el.style.left = dragGridPos(mark.x);
      el.style.top = dragGridPos(mark.y);
      if (mark.orientation === "h") {
        el.style.width = "var(--small-cell)";
      } else {
        el.style.height = "var(--small-cell)";
      }
      grid.append(el);
    });
    return grid;
  }

  function updateDropPreview(x, y) {
    const nextPreview = getDropPreview(x, y);
    const nextSignature = dropPreviewSignature(nextPreview);
    const currentSignature = dropPreviewSignature(state.dropPreview);
    if (nextSignature === currentSignature) return;
    state.dropPreview = nextPreview;
    renderMonster();
    renderMaterialBoard();
  }

  function getDropPreview(x, y) {
    if (!state.drag || state.drag.type !== "piece") return null;

    const guidePoint = getDragGuidePoint(x, y);
    const monsterCell = getMonsterCellFromAnchorPoint(guidePoint);
    if (monsterCell) {
      return buildMonsterDropPreview(monsterCell.x - state.drag.offset.x, monsterCell.y - state.drag.offset.y, state.drag.cells);
    }

    const materialCell = getGridCellFromAnchorPoint(guidePoint, els.materialGrid, state.materialCols, state.materialRows, getMaterialCellSize());
    if (materialCell) {
      return buildMaterialDropPreview(materialCell.x - state.drag.offset.x, materialCell.y - state.drag.offset.y, state.drag.cells);
    }

    return null;
  }

  function getDragGuidePoint(x, y) {
    return {
      x,
      y: y - DRAG_POINTER_OFFSET,
    };
  }

  function getMonsterCellFromAnchorPoint(point) {
    const cellSize = getMonsterCellSize();
    return getGridCellFromAnchorPoint(point, els.monsterGrid, MONSTER_BOARD_COLS, MONSTER_BOARD_ROWS, cellSize);
  }

  function getGridCellFromAnchorPoint(point, gridEl, cols, rows, cellSize) {
    const gridRect = gridEl.getBoundingClientRect();
    const step = cellSize + BOARD_GAP;
    const width = cols * cellSize + Math.max(0, cols - 1) * BOARD_GAP;
    const height = rows * cellSize + Math.max(0, rows - 1) * BOARD_GAP;
    const contentLeft = Math.max(0, (gridRect.width - width) / 2);
    const contentTop = Math.max(0, (gridRect.height - height) / 2);
    const localX = point.x - gridRect.left - contentLeft;
    const localY = point.y - gridRect.top - contentTop;

    if (
      localX < -BOARD_GAP / 2
      || localY < -BOARD_GAP / 2
      || localX > width + BOARD_GAP / 2
      || localY > height + BOARD_GAP / 2
    ) {
      return null;
    }

    return {
      x: clamp(Math.round((localX - cellSize / 2) / step), 0, cols - 1),
      y: clamp(Math.round((localY - cellSize / 2) / step), 0, rows - 1),
    };
  }

  function buildMaterialDropPreview(anchorX, anchorY, normalizedCells) {
    const skipPieceId = state.drag?.source === "material" ? state.drag.pieceId : null;
    const placement = getBoardPlacementFromCells(normalizedCells, anchorX, anchorY, skipPieceId);
    return {
      zone: "material",
      anchorX,
      anchorY,
      cells: placement.cells.map((cell) => key(cell.x, cell.y)),
      valid: placement.valid,
    };
  }

  function buildMonsterDropPreview(anchorX, anchorY, normalizedCells) {
    const skipPlacementId = state.drag?.source === "monster" ? state.drag.placementId : null;
    const placement = getMonsterPlacementFromCells(normalizedCells, anchorX, anchorY, skipPlacementId);
    return {
      zone: "monster",
      anchorX,
      anchorY,
      cells: placement.cells.map((cell) => key(cell.x, cell.y)),
      valid: placement.valid,
    };
  }

  function getBoardPlacement(piece, anchorX, anchorY, normalizedCells = normalizeCells(piece.cells)) {
    return getBoardPlacementFromCells(normalizedCells, anchorX, anchorY, piece.id);
  }

  function getBoardPlacementFromCells(normalizedCells, anchorX, anchorY, skipPieceId = null) {
    const cells = normalizedCells.map((cell) => ({ x: anchorX + cell.x, y: anchorY + cell.y }));
    const occupied = buildPieceByCell(skipPieceId ? { skipPieceId } : {});
    const valid = cells.every((cell) => {
      const cellKey = key(cell.x, cell.y);
      if (cell.x < 0 || cell.y < 0 || cell.x >= state.materialCols || cell.y >= state.materialRows) return false;
      if (state.missingCells.has(cellKey) || state.spoiledCells.has(cellKey)) return false;
      return !occupied.has(cellKey);
    });
    return { cells, valid };
  }

  function getMonsterPlacement(piece, anchorX, anchorY, normalizedCells = normalizeCells(piece.cells)) {
    return getMonsterPlacementFromCells(normalizedCells, anchorX, anchorY);
  }

  function getMonsterPlacementFromCells(normalizedCells, anchorX, anchorY, skipPlacementId = null) {
    const cells = normalizedCells.map((cell) => ({ x: anchorX + cell.x, y: anchorY + cell.y }));
    const valid = cells.every((cell) => {
      const cellKey = key(cell.x, cell.y);
      const monsterCell = state.monsterCells.get(cellKey);
      const ownCoveredCell = skipPlacementId && monsterCell?.placementId === skipPlacementId;
      return monsterCell && (!monsterCell.covered || ownCoveredCell) && !state.blocked.has(cellKey);
    });
    return { cells, valid };
  }

  function dragGridPos(value) {
    return `calc(${value} * (var(--small-cell) + ${BOARD_GAP}px))`;
  }

  function getMonsterCellSize() {
    const cell = els.monsterGrid.querySelector(".monster-cell");
    return cell ? cell.getBoundingClientRect().width : 25;
  }

  function dropPreviewSignature(preview) {
    if (!preview) return "";
    return `${preview.zone}:${preview.anchorX},${preview.anchorY}:${preview.valid}:${preview.cells.join(";")}`;
  }

  function normalizeCells(cells) {
    const min = minCell(cells);
    return cells
      .map((cell) => ({ x: cell.x - min.x, y: cell.y - min.y }))
      .sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function getGrabbedCellOffset(min, grabbedX, grabbedY) {
    return {
      x: grabbedX - min.x,
      y: grabbedY - min.y,
    };
  }

  function normalizeCutEdges(edges, min) {
    return new Set([...edges].map((edge) => {
      const [a, b] = edge.split("|").map(fromKey);
      return edgeKey(key(a.x - min.x, a.y - min.y), key(b.x - min.x, b.y - min.y));
    }));
  }

  function minCell(cells) {
    return {
      x: Math.min(...cells.map((cell) => cell.x)),
      y: Math.min(...cells.map((cell) => cell.y)),
    };
  }

  function edgeKey(a, b) {
    return [a, b].sort().join("|");
  }

  function isPieceEdge(edge, piece) {
    const [a, b] = edge.split("|");
    const pieceKeys = new Set(piece.cells.map((cell) => key(cell.x, cell.y)));
    return pieceKeys.has(a) && pieceKeys.has(b);
  }

  function keepCutEdgesForCells(edges, cellKeys) {
    return new Set([...edges].filter((edge) => {
      const [a, b] = edge.split("|");
      return cellKeys.has(a) && cellKeys.has(b);
    }));
  }

  function translateCutEdges(edges, dx, dy) {
    return new Set([...edges].map((edge) => {
      const [a, b] = edge.split("|").map(fromKey);
      return edgeKey(key(a.x + dx, a.y + dy), key(b.x + dx, b.y + dy));
    }));
  }

  function cloneSpecialCells(cells = new Map()) {
    return new Map(cells);
  }

  function cloneSpecialLinks(links = new Map()) {
    return new Map([...links].map(([edge, link]) => [edge, { ...link }]));
  }

  function normalizeSpecialCells(cells = new Map(), min) {
    return new Map([...cells].map(([cellKey, type]) => {
      const cell = fromKey(cellKey);
      return [key(cell.x - min.x, cell.y - min.y), type];
    }));
  }

  function normalizeSpecialLinks(links = new Map(), min) {
    return new Map([...links].map(([edge, link]) => {
      const [a, b] = edge.split("|").map(fromKey);
      return [edgeKey(key(a.x - min.x, a.y - min.y), key(b.x - min.x, b.y - min.y)), { ...link }];
    }));
  }

  function translateSpecialCells(cells = new Map(), dx, dy) {
    return new Map([...cells].map(([cellKey, type]) => {
      const cell = fromKey(cellKey);
      return [key(cell.x + dx, cell.y + dy), type];
    }));
  }

  function translateSpecialLinks(links = new Map(), dx, dy) {
    return new Map([...links].map(([edge, link]) => {
      const [a, b] = edge.split("|").map(fromKey);
      return [edgeKey(key(a.x + dx, a.y + dy), key(b.x + dx, b.y + dy)), { ...link }];
    }));
  }

  function keepSpecialCellsForCells(cells = new Map(), cellKeys) {
    return new Map([...cells].filter(([cellKey]) => cellKeys.has(cellKey)));
  }

  function keepSpecialLinksForCells(links = new Map(), cellKeys) {
    return new Map([...links].filter(([edge]) => {
      const [a, b] = edge.split("|");
      return cellKeys.has(a) && cellKeys.has(b);
    }));
  }

  function buildSpecialByCell(options = {}) {
    const map = new Map();
    state.materialPieces.forEach((piece) => {
      if (options.skipDragging && piece.id === state.draggingPieceId) return;
      piece.specialCells?.forEach((type, cellKey) => map.set(cellKey, type));
    });
    return map;
  }

  function renderSpecialLinks() {
    const rendered = new Set();
    state.materialPieces.forEach((piece) => {
      if (piece.id === state.draggingPieceId) return;
      piece.specialLinks?.forEach((link, edge) => {
        if (!link.active || rendered.has(edge)) return;
        const mark = edgeToMark(edge);
        if (!mark) return;
        rendered.add(edge);
        const el = document.createElement("span");
        el.className = `special-link ${mark.orientation} ${LINK_META[link.type].className}`;
        el.style.left = boardPos(mark.x);
        el.style.top = boardPos(mark.y);
        if (mark.orientation === "h") {
          el.style.width = "var(--small-cell)";
        } else {
          el.style.height = "var(--small-cell)";
        }
        els.cutLayer.append(el);
      });
    });
  }

  function renderBoardEffects() {
    state.boardEffects.forEach((effect) => {
      const el = document.createElement("span");
      el.className = `board-effect ${effect.type}`;
      el.textContent = effect.text;
      el.style.left = boardPos(effect.x + 0.5);
      el.style.top = boardPos(effect.y + 0.5);
      els.cutLayer.append(el);
    });
  }

  function spawnSingleCellPieces(amount) {
    let spawned = 0;
    const effects = [];
    for (let i = 0; i < amount; i += 1) {
      const spot = findSingleCellSpot();
      if (!spot) break;
      const pieceId = state.nextPieceId;
      state.materialPieces.push({
        id: pieceId,
        cells: [{ x: spot.x, y: spot.y }],
        cutEdges: new Set(),
        specialCells: new Map(),
        specialLinks: new Map(),
        spawnType: "attack",
      });
      state.nextPieceId += 1;
      spawned += 1;
      effects.push({ id: `attack-${Date.now()}-${i}`, type: "attack-link", text: "+1", x: spot.x, y: spot.y, pieceId });
    }
    if (effects.length) {
      state.boardEffects.push(...effects);
      window.setTimeout(() => {
        effects.forEach((effect) => {
          const piece = getPiece(effect.pieceId);
          if (piece) delete piece.spawnType;
        });
        const effectIds = new Set(effects.map((effect) => effect.id));
        state.boardEffects = state.boardEffects.filter((effect) => !effectIds.has(effect.id));
        renderMaterialBoard();
      }, 760);
    }
    if (spawned < amount) addLog(`공격 링크 보너스 ${amount - spawned}개는 놓을 빈칸이 없어 사라졌다.`);
  }

  function findSingleCellSpot() {
    const occupied = buildPieceByCell();
    const centerX = (state.materialCols - 1) / 2;
    const centerY = (state.materialRows - 1) / 2;
    const spots = [];
    for (let y = 0; y < state.materialRows; y += 1) {
      for (let x = 0; x < state.materialCols; x += 1) {
        const cellKey = key(x, y);
        if (occupied.has(cellKey) || state.missingCells.has(cellKey) || state.spoiledCells.has(cellKey)) continue;
        spots.push({ x, y, distance: Math.hypot(x - centerX, y - centerY) });
      }
    }
    spots.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
    return spots[0] || null;
  }

  function formatLinkRewardLog(rewards) {
    const parts = [];
    if (rewards.heal) parts.push(`회복 ${rewards.heal}`);
    if (rewards.attack) parts.push(`1칸 생성 ${rewards.attack}`);
    if (rewards.defense) parts.push(`쉴드 ${rewards.defense}`);
    return parts.length ? ` 링크 보상: ${parts.join(", ")}.` : "";
  }

  function edgeToMark(edge) {
    const [a, b] = edge.split("|").map(fromKey);
    if (a.x === b.x) {
      return { orientation: "h", x: a.x, y: Math.max(a.y, b.y) };
    }
    if (a.y === b.y) {
      return { orientation: "v", x: Math.max(a.x, b.x), y: a.y };
    }
    return null;
  }

  function neighbors(x, y) {
    return [key(x, y - 1), key(x + 1, y), key(x, y + 1), key(x - 1, y)].filter((cellKey) => {
      const cell = fromKey(cellKey);
      return cell.x >= 0 && cell.y >= 0 && cell.x < state.materialCols && cell.y < state.materialRows;
    });
  }

  function chooseArmorBlocks(amount = 1, monsterInstanceId = null) {
    return takeRandomCellKeys(openMonsterCellKeys(monsterInstanceId), amount);
  }

  function chooseHealTargets(amount = 1, monsterInstanceId = null) {
    if (!amount) return [];
    const targets = [];
    const used = new Set();
    const priorityGroups = [
      coveredMonsterCellKeys("heal", monsterInstanceId),
      coveredMonsterCellKeys("special", monsterInstanceId),
      coveredMonsterCellKeys(null, monsterInstanceId),
    ];

    priorityGroups.forEach((group) => {
      const candidates = group.filter((cellKey) => !used.has(cellKey));
      takeRandomCellKeys(candidates, amount - targets.length).forEach((cellKey) => {
        used.add(cellKey);
        targets.push(cellKey);
      });
    });

    return targets.slice(0, amount);
  }

  function openMonsterCellKeys(monsterInstanceId = null) {
    return [...state.monsterCells.entries()]
      .filter(([cellKey, cell]) => monsterCellInScope(cell, monsterInstanceId) && !cell.covered && !state.blocked.has(cellKey))
      .map(([cellKey]) => cellKey);
  }

  function openMonsterCellCount(monsterInstanceId = null) {
    return openMonsterCellKeys(monsterInstanceId).length;
  }

  function coveredMonsterCellKeys(icon = null, monsterInstanceId = null) {
    return [...state.monsterCells.entries()]
      .filter(([, cell]) => monsterCellInScope(cell, monsterInstanceId) && cell.covered && (!icon || cell.icon === icon))
      .map(([cellKey]) => cellKey);
  }

  function takeRandomCellKeys(cellKeys, amount) {
    const pool = [...cellKeys];
    const picked = [];
    while (picked.length < amount && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
  }

  function chooseOpenCells(amount) {
    return [...state.monsterCells.entries()]
      .filter(([cellKey, cell]) => monsterCellInScope(cell) && !cell.covered && !state.blocked.has(cellKey))
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, amount)
      .map(([cellKey]) => cellKey);
  }

  function spoilMaterial(amount) {
    const cells = [];
    state.materialPieces.forEach((piece) => {
      piece.cells.forEach((cell) => cells.push({ piece, cell }));
    });
    const targets = cells.slice(-amount);
    targets.forEach(({ piece, cell }) => {
      const cellKey = key(cell.x, cell.y);
      state.spoiledCells.add(cellKey);
      piece.cells = piece.cells.filter((item) => key(item.x, item.y) !== cellKey);
      const cellKeys = new Set(piece.cells.map((item) => key(item.x, item.y)));
      piece.cutEdges = keepCutEdgesForCells(piece.cutEdges, cellKeys);
      piece.specialCells = keepSpecialCellsForCells(piece.specialCells, cellKeys);
      piece.specialLinks = keepSpecialLinksForCells(piece.specialLinks, cellKeys);
    });
    state.materialPieces = state.materialPieces.filter((piece) => piece.cells.length > 0);
    return targets.length;
  }

  function monsterNeighbors(x, y) {
    return [key(x, y - 1), key(x + 1, y), key(x, y + 1), key(x - 1, y)];
  }

  function uncoveredIconCount(icon, monsterInstanceId = null) {
    return [...state.monsterCells.values()].filter((cell) => monsterCellInScope(cell, monsterInstanceId) && cell.icon === icon && !cell.covered).length;
  }

  function monsterCellInScope(cell, monsterInstanceId = null) {
    if (monsterInstanceId) return cell.monsterInstanceId === monsterInstanceId;
    const owner = monsterInstanceById(cell.monsterInstanceId);
    return !owner || !isMonsterInstanceSealed(owner);
  }

  function coveredCount() {
    return [...state.monsterCells.values()].filter((cell) => cell.covered).length;
  }

  function uncoveredCount() {
    return state.monsterCells.size - coveredCount();
  }

  function isMonsterComplete() {
    return uncoveredCount() === 0;
  }

  function availableMaterialCount() {
    return state.materialPieces.reduce((sum, piece) => sum + piece.cells.length, 0);
  }

  function remainingCuts() {
    return Math.max(0, MAX_CUTS_PER_TURN - state.cutsUsed);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function renderLog() {
    els.battleLog.innerHTML = state.log.map((line) => `<p>${line}</p>`).join("");
  }

  function dealRewardOptions() {
    const rewardSets = [
      ["expand1", "linkHeal", "growH", "bendL"],
      ["expand2", "linkAttack", "linkDefense", "growV", "silentRefill"],
      ["expand1", "growL", "linkDefense", "silentRefill"],
    ];
    const preferred = rewardSets[(state.stageIndex + state.waveIndex) % rewardSets.length]
      .map((id) => REWARDS[id])
      .filter((reward) => reward && isRewardAvailable(reward));
    const fallback = Object.values(REWARDS).filter((reward) => isRewardAvailable(reward) && !preferred.includes(reward));
    state.rewardOptions = [...preferred, ...fallback].slice(0, 3).map((reward, index) => createRewardOption(reward, index));
    return state.rewardOptions;
  }

  function createRewardOption(reward, index) {
    if (reward.type !== "link") return reward;
    return {
      ...reward,
      shape: linkRewardShape(reward, index),
    };
  }

  function linkRewardShape(reward, index) {
    const vertical = (state.stageIndex + state.waveIndex + index + reward.id.length) % 2 === 1;
    return vertical
      ? [{ x: 0, y: 0 }, { x: 0, y: 1 }]
      : [{ x: 0, y: 0 }, { x: 1, y: 0 }];
  }

  function isRewardAvailable(reward) {
    if (reward.type === "knife") {
      return state.knifeLoadout.some((knife) => knife.type === reward.from);
    }
    if (reward.type === "knifeAny") {
      return state.knifeLoadout.some((knife) => knife.type !== reward.to);
    }
    if (reward.type === "silentRefill") {
      return state.silentRefillUpgrades < 1;
    }
    if (reward.type === "link") {
      return hasBoardLinkSpot();
    }
    if (reward.type === "expand") {
      return hasExpansionSpot(reward.shape);
    }
    return true;
  }

  function renderRewardChoices(rewards) {
    if (!els.rewardChoices) return;
    els.rewardChoices.innerHTML = "";
    els.rewardChoices.classList.toggle("hidden", rewards.length === 0);
    rewards.forEach((reward) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `reward-card reward-${rewardVisualType(reward)}${reward.rarity === "rare" ? " rare" : ""}`;
      const label = reward.rarity === "rare" ? "희귀" : rewardLabel(reward);
      const icon = renderRewardChoiceIcon(reward);
      const copy = document.createElement("span");
      copy.className = "reward-card-copy";
      const labelEl = document.createElement("span");
      labelEl.className = "reward-card-label";
      labelEl.textContent = label;
      const title = document.createElement("strong");
      title.textContent = reward.title;
      const text = document.createElement("em");
      text.textContent = rewardChoiceText(reward);
      copy.append(labelEl, title, text);
      button.append(icon, copy);
      button.addEventListener("click", () => applyReward(reward.id));
      els.rewardChoices.append(button);
    });
  }

  function renderRewardChoiceIcon(reward) {
    const wrap = document.createElement("span");
    wrap.className = `reward-choice-icon reward-choice-${rewardVisualType(reward)}`;

    if (reward.type === "expand") {
      const cells = normalizeCells(reward.shape);
      const maxX = Math.max(...cells.map((cell) => cell.x));
      const maxY = Math.max(...cells.map((cell) => cell.y));
      const occupied = new Set(cells.map((cell) => key(cell.x, cell.y)));
      const grid = document.createElement("span");
      grid.className = "reward-icon-grid";
      grid.style.gridTemplateColumns = `repeat(${maxX + 1}, 24px)`;
      for (let y = 0; y <= maxY; y += 1) {
        for (let x = 0; x <= maxX; x += 1) {
          const cell = document.createElement("span");
          cell.className = "reward-icon-rice";
          if (!occupied.has(key(x, y))) cell.classList.add("empty");
          grid.append(cell);
        }
      }
      wrap.append(grid);
      return wrap;
    }

    if (reward.type === "link") {
      const meta = LINK_META[reward.linkType];
      const cells = normalizeCells(reward.shape || defaultLinkShape());
      const maxX = Math.max(...cells.map((cell) => cell.x));
      const maxY = Math.max(...cells.map((cell) => cell.y));
      const occupied = new Set(cells.map((cell) => key(cell.x, cell.y)));
      const grid = document.createElement("span");
      grid.className = "reward-icon-grid reward-icon-link-grid";
      grid.style.gridTemplateColumns = `repeat(${maxX + 1}, 24px)`;
      for (let y = 0; y <= maxY; y += 1) {
        for (let x = 0; x <= maxX; x += 1) {
          const cell = document.createElement("span");
          cell.className = "reward-icon-rice";
          if (!occupied.has(key(x, y))) cell.classList.add("empty");
          grid.append(cell);
        }
      }
      rewardShapeSpecialLinks({ shape: cells, linkType: reward.linkType }).forEach((link, edge) => {
        const linkMark = edgeToMark(edge);
        if (!linkMark) return;
        const bridge = document.createElement("span");
        bridge.className = `reward-icon-link ${linkMark.orientation} ${meta.className}`;
        bridge.style.left = `calc(${linkMark.x} * (24px + 3px))`;
        bridge.style.top = `calc(${linkMark.y} * (24px + 3px))`;
        grid.append(bridge);
      });
      const mark = document.createElement("span");
      mark.className = `reward-icon-mark ${meta.className}`;
      mark.textContent = meta.mark;
      wrap.append(grid, mark);
      return wrap;
    }

    if (reward.type === "knife" || reward.type === "knifeAny") {
      const knife = document.createElement("span");
      knife.className = "reward-icon-knife";
      wrap.append(knife);
      return wrap;
    }

    const badge = document.createElement("span");
    badge.className = "reward-icon-badge";
    badge.textContent = "무";
    wrap.append(badge);
    return wrap;
  }

  function rewardLabel(reward) {
    if (reward.type === "expand") return "판 확장";
    if (reward.type === "link") return LINK_META[reward.linkType].label;
    if (reward.type === "knife" || reward.type === "knifeAny") return "칼 성장";
    return "보정";
  }

  function rewardVisualType(reward) {
    if (reward.type === "expand") return "expand";
    if (reward.type === "link") return reward.linkType;
    if (reward.type === "knife" || reward.type === "knifeAny") return "knife";
    return "rare";
  }

  function rewardChoiceText(reward) {
    if (reward.id === "expand1") return "도시락 판에 직접 붙이기";
    if (reward.id === "expand2") return "2칸 조각을 회전해 붙이기";
    if (reward.id === "linkHeal") return `${linkDirectionLabel(reward.shape)} 링크 · 자르면 체력 +1`;
    if (reward.id === "linkAttack") return `${linkDirectionLabel(reward.shape)} 링크 · 자르면 1칸 조각 생성`;
    if (reward.id === "linkDefense") return `${linkDirectionLabel(reward.shape)} 링크 · 자르면 쉴드 +1`;
    if (reward.id === "growH") return "가로 2칸 -> 3칸";
    if (reward.id === "growV") return "세로 2칸 -> 3칸";
    if (reward.id === "bendL") return "직선 칼 -> ㄱ자 칼";
    if (reward.id === "growL") return "ㄱ자 칼 더 길게";
    if (reward.id === "silentRefill") return "새 판 요청 1회 안전";
    return reward.text;
  }

  function applyReward(rewardId) {
    const reward = state.rewardOptions.find((option) => option.id === rewardId) || REWARDS[rewardId];
    if (!reward || !isRewardAvailable(reward)) return;

    if (reward.type === "expand" || reward.type === "link") {
      enterBoardEdit([createBoardEditItem(reward)]);
      return;
    }

    applyImmediateReward(reward);
    advanceAfterReward();
  }

  function applyImmediateReward(reward) {
    if (reward.type === "knife") {
      const knife = state.knifeLoadout.find((item) => item.type === reward.from);
      if (knife) {
        knife.type = reward.to;
        state.pendingLogs.push(`${reward.title} 적용. ${KNIFE_TYPES[reward.to].label} 사용 가능.`);
      }
      return;
    }
    if (reward.type === "knifeAny") {
      const knife = state.knifeLoadout.find((item) => item.type !== reward.to);
      if (knife) {
        knife.type = reward.to;
        state.pendingLogs.push(`${reward.title} 적용. 칼 하나가 ${KNIFE_TYPES[reward.to].label}이 됐다.`);
      }
      return;
    }
    if (reward.type === "silentRefill") {
      state.silentRefillUpgrades += 1;
      state.pendingLogs.push("무음 재충전 획득. 전투마다 새 판 요청 1회가 안전해진다.");
    }
  }

  function createBoardEditItem(reward) {
    const base = {
      id: `reward-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      rewardId: reward.id,
      reward,
      title: reward.title,
      text: reward.text,
      type: reward.type,
      linkType: reward.linkType || null,
      placed: false,
      cells: [],
    };

    if (reward.type === "expand") {
      return {
        ...base,
        shape: normalizeCells(reward.shape.map((cell) => ({ ...cell }))),
      };
    }

    return {
      ...base,
      shape: normalizeCells((reward.shape || defaultLinkShape()).map((cell) => ({ ...cell }))),
    };
  }

  function enterBoardEdit(items) {
    state.resultMode = null;
    state.boardEdit = {
      items,
      closing: false,
    };
    resetMaterialBoard();
    hideResult();
    addLog("보상 작업대가 열렸다. 하단 보상을 드래그해서 판에 붙이자.");
    render();
  }

  function handleBoardEditToolButton() {
    if (!state.boardEdit) return;
    addLog("보상은 하단 트레이에서 직접 드래그해 붙입니다.");
    render();
  }

  function advanceAfterReward() {
    state.playerHp = Math.min(heroMaxHp(), state.playerHp + 6);
    if (hasNextWave()) {
      startRound(state.stageIndex, state.waveIndex + 1, 0);
      return;
    }
    if (hasNextStage()) {
      startStage(state.stageIndex + 1);
      return;
    }
    startGame();
  }

  function getBoardEditPreview() {
    if (!state.boardEdit) return null;
    const validCells = new Set();
    const placedCells = new Set();
    const draggingRewardId = state.drag?.type === "reward" ? state.drag.rewardItemId : null;
    state.boardEdit.items.forEach((item) => {
      if (item.placed && item.id !== draggingRewardId) item.cells.forEach((cell) => placedCells.add(key(cell.x, cell.y)));
    });

    const drag = state.drag?.type === "reward" ? state.drag : null;
    const item = drag ? getBoardEditItem(drag.rewardItemId) : null;
    if (item) {
      for (let y = 0; y < state.materialRows; y += 1) {
        for (let x = 0; x < state.materialCols; x += 1) {
          if (getRewardItemPlacement(item, x, y).valid) validCells.add(key(x, y));
        }
      }
    }

    const preview = state.dropPreview?.zone === "reward-board" ? state.dropPreview : null;
    return {
      validCells,
      placedCells,
      previewCells: new Set(preview?.cells || []),
      previewValid: Boolean(preview?.valid),
    };
  }

  function getBoardEditPlacedRewardByCell({ skipDragging = false } = {}) {
    const result = new Map();
    const draggingRewardId = skipDragging && state.drag?.type === "reward" ? state.drag.rewardItemId : null;
    state.boardEdit?.items.forEach((item) => {
      if (!item.placed || item.id === draggingRewardId) return;
      item.cells.forEach((cell) => result.set(key(cell.x, cell.y), item));
    });
    return result;
  }

  function renderRewardEditCellMark(cellElement, item) {
    if (item.type !== "link") return;
    const meta = LINK_META[item.linkType];
    cellElement.classList.add("special-cell", meta.className);
    const mark = document.createElement("span");
    mark.className = "special-cell-mark";
    mark.textContent = meta.mark;
    cellElement.append(mark);
  }

  function renderRewardTray() {
    if (!els.rewardTray || !els.rewardItems) return;
    const active = Boolean(state.boardEdit);
    els.rewardTray.classList.toggle("hidden", !active);
    if (!active) {
      els.rewardItems.innerHTML = "";
      return;
    }

    els.rewardItems.innerHTML = "";
    state.boardEdit.items.forEach((item) => {
      const card = document.createElement("article");
      card.className = `reward-board-item${item.placed ? " placed" : ""}${item.id === state.draggingRewardItemId ? " dragging" : ""}`;

      const label = document.createElement("span");
      label.className = "reward-board-label";
      label.textContent = item.type === "link" ? LINK_META[item.linkType].label : "판 확장";

      const title = document.createElement("strong");
      title.textContent = item.title;

      const grid = renderRewardItemGrid(item);
      card.append(label, grid, title);

      if (canRotateRewardItem(item)) {
        const rotate = document.createElement("button");
        rotate.type = "button";
        rotate.className = "reward-rotate-button";
        rotate.textContent = "회전";
        rotate.addEventListener("click", (event) => {
          event.stopPropagation();
          rotateRewardItem(item.id);
        });
        card.append(rotate);
      }

      els.rewardItems.append(card);
    });

    if (els.rewardDoneButton) {
      const complete = isBoardEditComplete();
      els.rewardDoneButton.disabled = !complete || state.boardEdit.closing;
      els.rewardDoneButton.textContent = complete ? "완료" : "배치 필요";
    }
  }

  function renderRewardItemGrid(item) {
    const normalized = normalizeCells(item.shape);
    const maxX = Math.max(...normalized.map((cell) => cell.x));
    const maxY = Math.max(...normalized.map((cell) => cell.y));
    const occupied = new Set(normalized.map((cell) => key(cell.x, cell.y)));
    const grid = document.createElement("div");
    grid.className = "reward-item-grid";
    grid.style.gridTemplateColumns = `repeat(${maxX + 1}, var(--small-cell))`;

    for (let y = 0; y <= maxY; y += 1) {
      for (let x = 0; x <= maxX; x += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "reward-item-cell";
        const cellKey = key(x, y);
        if (!occupied.has(cellKey)) {
          cell.classList.add("empty");
        } else {
          if (item.type === "link") {
            const meta = LINK_META[item.linkType];
            cell.classList.add("special-cell", meta.className);
            const mark = document.createElement("span");
            mark.className = "special-cell-mark";
            mark.textContent = meta.mark;
            cell.append(mark);
          }
          cell.addEventListener("pointerdown", (event) => beginRewardDrag(event, item.id, x, y));
        }
        grid.append(cell);
      }
    }

    if (item.type === "link") {
      const links = rewardItemSpecialLinks(item);
      links.forEach((link, edge) => {
        const mark = edgeToMark(edge);
        if (!mark) return;
        const el = document.createElement("span");
        el.className = `reward-item-link ${mark.orientation} ${LINK_META[link.type].className}`;
        el.style.left = `calc(${mark.x} * (var(--small-cell) + ${BOARD_GAP}px))`;
        el.style.top = `calc(${mark.y} * (var(--small-cell) + ${BOARD_GAP}px))`;
        if (mark.orientation === "h") {
          el.style.width = "var(--small-cell)";
        } else {
          el.style.height = "var(--small-cell)";
        }
        grid.append(el);
      });
    }

    return grid;
  }

  function getBoardEditItem(itemId) {
    return state.boardEdit?.items.find((item) => item.id === itemId) || null;
  }

  function rotateRewardItem(itemId) {
    const item = getBoardEditItem(itemId);
    if (!canRotateRewardItem(item)) return;
    item.shape = rotateShape(item.shape);
    render();
  }

  function canRotateRewardItem(item) {
    return Boolean(item) && item.type === "expand" && !item.placed && item.shape.length > 1;
  }

  function rewardItemSpecialCells(item) {
    if (item.type !== "link") return new Map();
    return new Map(item.shape.map((cell) => [key(cell.x, cell.y), item.linkType]));
  }

  function rewardItemSpecialLinks(item) {
    if (item.type !== "link" || item.shape.length < 2) return new Map();
    return rewardShapeSpecialLinks(item);
  }

  function rewardShapeSpecialLinks(item) {
    if (item.shape.length < 2) return new Map();
    const [a, b] = item.shape;
    return new Map([[edgeKey(key(a.x, a.y), key(b.x, b.y)), { type: item.linkType, active: true }]]);
  }

  function defaultLinkShape() {
    return [{ x: 0, y: 0 }, { x: 1, y: 0 }];
  }

  function linkDirectionLabel(shape = defaultLinkShape()) {
    const cells = normalizeCells(shape);
    return cells.length >= 2 && cells[0].x === cells[1].x ? "세로" : "가로";
  }

  function updateRewardDropPreview(x, y) {
    const nextPreview = getRewardDropPreview(x, y);
    const nextSignature = dropPreviewSignature(nextPreview);
    const currentSignature = dropPreviewSignature(state.dropPreview);
    if (nextSignature === currentSignature) return;
    state.dropPreview = nextPreview;
    renderMaterialBoard();
  }

  function getRewardDropPreview(x, y) {
    if (!state.drag || state.drag.type !== "reward") return null;
    const item = getBoardEditItem(state.drag.rewardItemId);
    if (!item) return null;
    const guidePoint = getDragGuidePoint(x, y);
    const materialCell = getGridCellFromAnchorPoint(guidePoint, els.materialGrid, state.materialCols, state.materialRows, getMaterialCellSize());
    if (!materialCell) return null;
    const anchorX = materialCell.x - state.drag.offset.x;
    const anchorY = materialCell.y - state.drag.offset.y;
    const placement = getRewardItemPlacement(item, anchorX, anchorY);
    return {
      zone: "reward-board",
      anchorX,
      anchorY,
      cells: placement.cells.map((cell) => key(cell.x, cell.y)),
      valid: placement.valid,
    };
  }

  function getRewardItemPlacement(item, anchorX, anchorY) {
    if (item.type === "expand") {
      return getBoardEditExpansionPlacement(item, anchorX, anchorY);
    }

    const cells = item.shape.map((cell) => ({ x: anchorX + cell.x, y: anchorY + cell.y }));
    const validBoardCells = getBoardEditBoardLikeCells(item.id);
    const valid = cells.every((cell) => {
      const cellKey = key(cell.x, cell.y);
      return cell.x >= 0
        && cell.y >= 0
        && cell.x < state.materialCols
        && cell.y < state.materialRows
        && validBoardCells.has(cellKey);
    }) && cells.length === 2 && areAdjacentKeys(key(cells[0].x, cells[0].y), key(cells[1].x, cells[1].y));
    return { cells, valid };
  }

  function getBoardEditExpansionPlacement(item, anchorX, anchorY) {
    const cells = item.shape.map((cell) => ({ x: anchorX + cell.x, y: anchorY + cell.y }));
    const temporaryExpansionCells = getBoardEditExpansionCells(item.id);
    const validBoardCells = getBoardEditBoardLikeCells(item.id);
    const valid = cells.every((cell) => {
      const cellKey = key(cell.x, cell.y);
      return cell.x >= 0
        && cell.y >= 0
        && cell.x < state.materialCols
        && cell.y < state.materialRows
        && !state.boardCells.has(cellKey)
        && !temporaryExpansionCells.has(cellKey);
    }) && cells.some((cell) => monsterNeighbors(cell.x, cell.y).some((neighbor) => validBoardCells.has(neighbor)));
    return { cells, valid };
  }

  function getBoardEditBoardLikeCells(exceptItemId = null) {
    const cells = new Set(state.boardCells);
    getBoardEditExpansionCells(exceptItemId).forEach((cellKey) => cells.add(cellKey));
    return cells;
  }

  function getBoardEditExpansionCells(exceptItemId = null) {
    const cells = new Set();
    state.boardEdit?.items.forEach((item) => {
      if (!item.placed || item.id === exceptItemId || item.type !== "expand") return;
      item.cells.forEach((cell) => cells.add(key(cell.x, cell.y)));
    });
    return cells;
  }

  function placeRewardItem(itemId, anchorX, anchorY) {
    const item = getBoardEditItem(itemId);
    if (!item) return;
    const placement = getRewardItemPlacement(item, anchorX, anchorY);
    if (!placement.valid) {
      addLog("그 위치에는 보상을 붙일 수 없다.");
      render();
      return;
    }

    item.placed = true;
    item.cells = placement.cells;
    addLog(`${item.title} 위치 지정. 완료 전까지 다시 옮길 수 있다.`);
    render();
  }

  function isBoardEditComplete() {
    return Boolean(state.boardEdit) && state.boardEdit.items.every((item) => item.placed);
  }

  function finishBoardEdit() {
    if (!state.boardEdit || state.boardEdit.closing) return;
    if (!isBoardEditComplete()) {
      addLog("모든 보상을 판에 붙여야 완료할 수 있다.");
      render();
      return;
    }
    state.boardEdit.closing = true;
    render();
    window.setTimeout(() => {
      commitBoardEditItems(state.boardEdit.items);
      state.boardEdit = null;
      advanceAfterReward();
    }, 260);
  }

  function commitBoardEditItems(items) {
    items
      .filter((item) => item.type === "expand")
      .forEach((item) => {
        item.cells.forEach((cell) => state.boardCells.add(key(cell.x, cell.y)));
        state.pendingLogs.push(`${item.cells.length}칸 판을 확장했다.`);
      });

    items
      .filter((item) => item.type === "link")
      .forEach((item) => {
        installBoardLink(item.linkType, key(item.cells[0].x, item.cells[0].y), key(item.cells[1].x, item.cells[1].y));
        state.pendingLogs.push(`${LINK_META[item.linkType].label} 링크를 설치했다.`);
      });
  }

  function hasExpansionSpot(shape) {
    for (let y = 0; y < state.materialRows; y += 1) {
      for (let x = 0; x < state.materialCols; x += 1) {
        if (getExpansionPlacement(x, y, shape).valid) return true;
      }
    }
    return false;
  }

  function getExpansionPlacement(anchorX, anchorY, shape) {
    const cells = shape.map((cell) => ({ x: anchorX + cell.x, y: anchorY + cell.y }));
    const valid = cells.every((cell) => {
      const cellKey = key(cell.x, cell.y);
      return cell.x >= 0
        && cell.y >= 0
        && cell.x < state.materialCols
        && cell.y < state.materialRows
        && !state.boardCells.has(cellKey);
    }) && cells.some((cell) => monsterNeighbors(cell.x, cell.y).some((neighbor) => state.boardCells.has(neighbor)));
    return { cells, valid };
  }

  function hasBoardLinkSpot() {
    return [...state.boardCells].some((cellKey) => {
      const cell = fromKey(cellKey);
      return monsterNeighbors(cell.x, cell.y).some((neighbor) => state.boardCells.has(neighbor));
    });
  }

  function installBoardLink(type, a, b) {
    const affected = new Set([a, b]);
    state.boardLinks.forEach((link, edge) => {
      const [left, right] = edge.split("|");
      if (affected.has(left) || affected.has(right)) {
        state.boardLinks.delete(edge);
        state.boardCellTypes.delete(left);
        state.boardCellTypes.delete(right);
      }
    });
    state.boardCellTypes.set(a, type);
    state.boardCellTypes.set(b, type);
    state.boardLinks.set(edgeKey(a, b), { type, active: true });
  }

  function rotateShape(shape) {
    const rotated = shape.map((cell) => ({ x: -cell.y, y: cell.x }));
    return normalizeCells(rotated);
  }

  function areAdjacentKeys(a, b) {
    const left = fromKey(a);
    const right = fromKey(b);
    return Math.abs(left.x - right.x) + Math.abs(left.y - right.y) === 1;
  }

  function showStageClear() {
    if (hasNextRound()) {
      transitionToNextMonster();
      return;
    }

    const isFinal = isRunComplete();
    state.resultMode = isFinal ? "complete" : "reward";
    els.resultModal?.classList.toggle("reward-modal", !isFinal);
    els.resultEyebrow.textContent = isFinal ? "RUN CLEAR" : "WAVE CLEAR";
    els.resultTitle.textContent = isFinal ? "스테이지 클리어" : "보상 선택";
    els.resultText.textContent = isFinal
      ? "모든 웨이브의 몬스터를 전부 덮어 클리어했다."
      : `${currentWave().name} 클리어. 다음 웨이브를 위해 도시락을 강화하세요.`;
    els.resultButton.textContent = isFinal ? "메인으로" : "다음 웨이브";
    els.resultButton.classList.toggle("hidden", !isFinal);
    renderRewardChoices(isFinal ? [] : dealRewardOptions());
    els.overlay.classList.remove("hidden");
  }

  function transitionToNextMonster() {
    const fromIndex = state.roundIndex;
    const toIndex = state.roundIndex + 1;
    const fromMonster = currentMonster();
    const nextMonster = monsterForRound(toIndex);
    state.resultMode = "round-transition";
    state.roundTransition = { fromIndex, toIndex, phase: "out" };
    addLog(`${fromMonster.name} 정리 완료. ${nextMonster.name} 카드가 펼쳐진다.`);
    render();

    window.setTimeout(() => {
      const transition = { fromIndex, toIndex, phase: "in" };
      startRound(state.stageIndex, state.waveIndex, toIndex, { resetMaterial: false, transition });
      window.setTimeout(() => {
        if (state.roundTransition?.phase === "in" && state.roundIndex === toIndex) {
          state.roundTransition = null;
          render();
        }
      }, 360);
    }, 360);
  }

  function showLoss(title, text) {
    state.resultMode = "loss";
    els.resultModal?.classList.remove("reward-modal");
    els.resultEyebrow.textContent = "DEFEAT";
    els.resultTitle.textContent = title;
    els.resultText.textContent = text;
    els.resultButton.textContent = "메인으로";
    els.resultButton.classList.remove("hidden");
    renderRewardChoices([]);
    els.overlay.classList.remove("hidden");
  }

  function hideResult() {
    els.overlay.classList.add("hidden");
    els.resultModal?.classList.remove("reward-modal");
    els.resultButton.classList.remove("hidden");
    renderRewardChoices([]);
  }

  function handleResultButton() {
    if (state.resultMode === "complete") {
      setStageRewardReady(currentStage().id, true);
      enterMetaMode("main", "main");
      return;
    }
    if (state.resultMode === "loss") {
      enterMetaMode("main", "main");
    }
  }

  function handleCutButton() {
    if (state.boardEdit) {
      handleBoardEditToolButton();
      return;
    }
    if (state.resultMode) return;
    if (getPlacement(state.selectedPlacementId)) {
      recoverSelectedPlacement();
      return;
    }
    applyCuts();
  }

  function handleNewBoard() {
    if (state.resultMode || state.boardEdit) return;
    finishPlayerTurn({ discardMaterial: true, refillBoard: true });
  }

  function handleEndTurn() {
    if (state.resultMode || state.boardEdit) return;
    finishPlayerTurn();
  }

  function markInputStart() {
    inputActive = true;
  }

  function markInputEnd() {
    window.setTimeout(() => {
      inputActive = false;
      if (!pendingResponsiveRender) return;
      pendingResponsiveRender = false;
      scheduleResponsiveRender();
    }, 140);
  }

  function scheduleResponsiveRender() {
    const nextSize = { width: viewportWidth(), height: viewportHeight() };
    const changed = Math.abs(nextSize.width - lastViewportSize.width) > 0.5
      || Math.abs(nextSize.height - lastViewportSize.height) > 0.5;
    if (!changed) return;

    if (inputActive) {
      pendingResponsiveRender = true;
      return;
    }

    lastViewportSize = nextSize;
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeTimer = null;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
      if (els.appShell.classList.contains("meta-mode")) {
        renderMeta();
      } else {
        render();
      }
      });
    }, 80);
  }

  window.addEventListener("pointerdown", markInputStart, { capture: true, passive: true });
  window.addEventListener("pointerup", markInputEnd, { capture: true, passive: true });
  window.addEventListener("pointercancel", markInputEnd, { capture: true, passive: true });
  els.restartButton.addEventListener("click", startGame);
  els.cutButton.addEventListener("click", handleCutButton);
  els.newBoardButton?.addEventListener("click", handleNewBoard);
  els.endTurnButton?.addEventListener("click", handleEndTurn);
  els.rewardDoneButton?.addEventListener("click", finishBoardEdit);
  els.resultButton.addEventListener("click", handleResultButton);
  els.metaTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const nextTab = tab.dataset.tab;
      metaState.activeTab = nextTab;
      metaState.view = nextTab === "heroes" ? "heroes" : nextTab;
      renderMeta();
    });
  });
  window.addEventListener("resize", scheduleResponsiveRender);
  window.visualViewport?.addEventListener("resize", scheduleResponsiveRender);

  enterMetaMode("main", "main");
})();
