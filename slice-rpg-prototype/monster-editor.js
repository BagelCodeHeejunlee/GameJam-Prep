(() => {
  const STORAGE_KEY = "bento-monster-editor-data-v1";
  const ICONS = {
    attack: { label: "공격", mark: "공" },
    heal: { label: "회복", mark: "회" },
    defense: { label: "방어", mark: "갑" },
    special: { label: "특수", mark: "특" },
  };

  const c = (x, y, icon = undefined) => (icon ? { x, y, icon } : { x, y });

  const DEFAULT_MONSTERS = [
    {
      id: "tiny-berry-imp",
      name: "외눈 베리 임프",
      sub: "작은 몸이지만 공격 표식은 먼저 막아라",
      image: "assets/monsters/tiny-berry-imp-3cell.png",
      cols: 2,
      rows: 2,
      baseAttack: 1,
      actions: ["attack", "attack", "special"],
      levels: [
        { minLevel: 1, attack: 1 },
        { minLevel: 4, attack: 2, note: "공격 표식 증가", boardConditions: { icons: [c(1, 1, "attack")] } },
        { minLevel: 8, attack: 3, note: "특수 표식 개방", boardConditions: { icons: [c(1, 0, "special")] } },
      ],
      cells: [c(1, 0, "attack"), c(0, 1), c(1, 1)],
    },
    {
      id: "tiny-jelly-block",
      name: "젤리 블록",
      sub: "작은 사각 몸통을 깔끔하게 채워라",
      image: "assets/monsters/tiny-jelly-block-4cell.png",
      cols: 2,
      rows: 2,
      baseAttack: 1,
      actions: ["heal", "attack", "defense"],
      levels: [
        { minLevel: 1, attack: 1 },
        { minLevel: 4, attack: 2, note: "회복 표식 증가", boardConditions: { icons: [c(0, 1, "heal")] } },
        { minLevel: 8, attack: 3, note: "갑피 표식 개방", boardConditions: { icons: [c(1, 0, "defense")] } },
      ],
      cells: [c(0, 0, "heal"), c(1, 0), c(0, 1), c(1, 1, "attack")],
    },
    {
      id: "iron-goblin",
      name: "철갑 고블린",
      sub: "작은 몸통의 주먹부터 막아라",
      image: "assets/monsters/iron-goblin.png",
      cols: 3,
      rows: 3,
      baseAttack: 2,
      actions: ["attack", "defense", "attack", "heal"],
      levels: [
        { minLevel: 1, attack: 2 },
        { minLevel: 3, attack: 3, note: "공격 표식 증가", boardConditions: { icons: [c(2, 1, "attack")] } },
        { minLevel: 5, attack: 4, note: "갑피 표식 증가", boardConditions: { icons: [c(1, 2, "defense")] } },
        { minLevel: 8, attack: 5, note: "특수 표식 개방", boardConditions: { icons: [c(0, 1, "special")] } },
        { minLevel: 11, attack: 6, note: "공격 표식 강화", boardConditions: { icons: [c(1, 2, "attack")] } },
      ],
      cells: [c(1, 0, "attack"), c(0, 1), c(1, 1, "defense"), c(2, 1), c(0, 2, "heal"), c(1, 2), c(2, 2, "attack")],
    },
    {
      id: "swamp-slime",
      name: "늪지 점액술사",
      sub: "회복 표식을 방치하면 재료가 말린다",
      image: "assets/monsters/swamp-slime.png",
      cols: 4,
      rows: 4,
      baseAttack: 1,
      actions: ["heal", "attack", "defense", "special", "attack"],
      levels: [
        { minLevel: 1, attack: 1 },
        { minLevel: 3, attack: 2, note: "회복 표식 증가", boardConditions: { icons: [c(0, 1, "heal")] } },
        { minLevel: 5, attack: 3, note: "갑피 표식 증가", boardConditions: { icons: [c(3, 2, "defense")] } },
        { minLevel: 8, attack: 4, note: "특수 표식 증가", boardConditions: { icons: [c(1, 3, "special")] } },
        { minLevel: 11, attack: 5, note: "공격 표식 추가", boardConditions: { icons: [c(0, 2, "attack")] } },
      ],
      cells: [c(1, 0, "attack"), c(2, 0, "heal"), c(0, 1), c(1, 1, "defense"), c(2, 1), c(3, 1, "attack"), c(1, 2), c(2, 2, "special"), c(3, 2), c(1, 3), c(2, 3, "heal")],
    },
    {
      id: "stone-ogre",
      name: "돌껍질 오우거",
      sub: "큰 몸이지만 낭비할 재료는 적다",
      image: "assets/monsters/stone-ogre.png",
      cols: 5,
      rows: 4,
      baseAttack: 3,
      actions: ["attack", "defense", "special", "attack", "heal"],
      levels: [
        { minLevel: 1, attack: 3 },
        { minLevel: 3, attack: 4, note: "공격 표식 증가", boardConditions: { icons: [c(1, 1, "attack")] } },
        { minLevel: 5, attack: 5, note: "갑피 표식 증가", boardConditions: { icons: [c(2, 1, "defense")] } },
        { minLevel: 8, attack: 6, note: "특수 표식 증가", boardConditions: { icons: [c(4, 2, "special")] } },
        { minLevel: 11, attack: 7, note: "공격 표식 추가", boardConditions: { icons: [c(2, 3, "attack")] } },
      ],
      cells: [c(2, 0, "defense"), c(1, 1), c(2, 1), c(3, 1, "heal"), c(0, 2, "attack"), c(1, 2), c(2, 2, "special"), c(3, 2), c(4, 2, "attack"), c(1, 3, "defense"), c(2, 3), c(3, 3, "special")],
    },
  ];

  const els = {
    list: document.querySelector("#monsterList"),
    title: document.querySelector("#editorTitle"),
    modeLabel: document.querySelector("#editModeLabel"),
    name: document.querySelector("#monsterNameInput"),
    sub: document.querySelector("#monsterSubInput"),
    cols: document.querySelector("#colsInput"),
    rows: document.querySelector("#rowsInput"),
    baseAttack: document.querySelector("#baseAttackInput"),
    levelTabs: document.querySelector("#levelTabs"),
    levelFields: document.querySelector("#levelFields"),
    addLevel: document.querySelector("#addLevelButton"),
    tools: [...document.querySelectorAll(".tool-button")],
    board: document.querySelector("#boardGrid"),
    summary: document.querySelector("#boardSummary"),
    help: document.querySelector("#boardHelpText"),
    json: document.querySelector("#jsonOutput"),
    save: document.querySelector("#saveButton"),
    copy: document.querySelector("#copyButton"),
    import: document.querySelector("#importButton"),
    reset: document.querySelector("#resetButton"),
  };

  const state = {
    monsters: loadMonsters(),
    monsterId: null,
    levelIndex: -1,
    tool: "body",
  };
  state.monsterId = state.monsters[0]?.id || null;

  function loadMonsters() {
    try {
      const saved = JSON.parse(storageGet(STORAGE_KEY) || "null");
      if (Array.isArray(saved?.monsters)) return mergeWithDefaultMonsters(saved.monsters);
    } catch {
      return clone(DEFAULT_MONSTERS);
    }
    return clone(DEFAULT_MONSTERS);
  }

  function mergeWithDefaultMonsters(savedMonsters) {
    const saved = normalizeMonsters(savedMonsters);
    const savedById = new Map(saved.map((monster) => [monster.id, monster]));
    const merged = DEFAULT_MONSTERS.map((defaultMonster) => {
      const savedMonster = savedById.get(defaultMonster.id);
      if (!savedMonster) return clone(defaultMonster);
      return { ...clone(defaultMonster), ...savedMonster, image: savedMonster.image || defaultMonster.image };
    });
    saved.forEach((monster) => {
      if (!DEFAULT_MONSTERS.some((defaultMonster) => defaultMonster.id === monster.id)) merged.push(monster);
    });
    return normalizeMonsters(merged);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function currentMonster() {
    return state.monsters.find((monster) => monster.id === state.monsterId) || state.monsters[0];
  }

  function currentLevel(monster = currentMonster()) {
    return state.levelIndex >= 0 ? monster.levels[state.levelIndex] : null;
  }

  function render() {
    const monster = currentMonster();
    if (!monster) return;
    renderMonsterList(monster);
    renderFields(monster);
    renderLevels(monster);
    renderTools();
    renderBoard(monster);
    renderJson();
  }

  function renderMonsterList(activeMonster) {
    els.list.innerHTML = "";
    state.monsters.forEach((monster) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = monster.id === activeMonster.id ? "active" : "";
      button.innerHTML = `
        <i class="monster-thumb" style="${monster.image ? `background-image: url('${escapeAttr(monster.image)}')` : ""}"></i>
        <span><strong>${monster.name}</strong><small>${monster.id}</small></span>
        <small>${monster.cols}x${monster.rows} · ${monster.cells.length}칸</small>
      `;
      button.addEventListener("click", () => {
        state.monsterId = monster.id;
        state.levelIndex = -1;
        render();
      });
      els.list.append(button);
    });
  }

  function renderFields(monster) {
    els.title.textContent = monster.name;
    els.modeLabel.textContent = state.levelIndex < 0 ? "BASE BOARD" : `LEVEL ${currentLevel(monster).minLevel}`;
    els.name.value = monster.name;
    els.sub.value = monster.sub;
    els.cols.value = monster.cols;
    els.rows.value = monster.rows;
    els.baseAttack.value = monster.baseAttack;
  }

  function renderLevels(monster) {
    els.levelTabs.innerHTML = "";
    const base = document.createElement("button");
    base.type = "button";
    base.dataset.levelIndex = "-1";
    base.className = state.levelIndex < 0 ? "active" : "";
    base.textContent = "기본 보드";
    base.addEventListener("click", () => {
      state.levelIndex = -1;
      render();
    });
    els.levelTabs.append(base);

    monster.levels.forEach((level, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.levelIndex = String(index);
      button.className = index === state.levelIndex ? "active" : "";
      button.textContent = `Lv.${level.minLevel}`;
      button.addEventListener("click", () => {
        state.levelIndex = index;
        render();
      });
      els.levelTabs.append(button);
    });

    if (state.levelIndex < 0) {
      els.levelFields.innerHTML = "";
      return;
    }

    const level = currentLevel(monster);
    els.levelFields.innerHTML = `
      <label><span>시작 레벨</span><input id="levelMinInput" min="1" max="99" type="number" value="${level.minLevel}" /></label>
      <label><span>공격력</span><input id="levelAttackInput" min="0" max="99" type="number" value="${level.attack}" /></label>
      <label><span>메모</span><input id="levelNoteInput" type="text" value="${escapeAttr(level.note || "")}" /></label>
      <button id="deleteLevelButton" class="ghost-button" type="button">레벨 삭제</button>
    `;
    document.querySelector("#levelMinInput").addEventListener("change", (event) => {
      level.minLevel = clampNumber(event.target.value, 1, 99, level.minLevel);
      sortLevels(monster, level);
      render();
    });
    document.querySelector("#levelAttackInput").addEventListener("input", (event) => {
      level.attack = clampNumber(event.target.value, 0, 99, level.attack);
      renderJson();
    });
    document.querySelector("#levelNoteInput").addEventListener("input", (event) => {
      level.note = event.target.value;
      renderJson();
    });
    document.querySelector("#deleteLevelButton").addEventListener("click", () => {
      if (monster.levels.length <= 1) return;
      monster.levels.splice(state.levelIndex, 1);
      state.levelIndex = Math.min(state.levelIndex, monster.levels.length - 1);
      render();
    });
  }

  function renderTools() {
    els.tools.forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === state.tool);
    });
  }

  function renderBoard(monster) {
    const activeLevel = currentLevel(monster);
    const effective = effectiveCellMap(monster, state.levelIndex);
    const current = activeLevel ? levelConditionMap(activeLevel) : new Map();
    els.board.style.gridTemplateColumns = `repeat(${monster.cols}, var(--editor-cell))`;
    els.board.style.setProperty("--monster-art", monster.image ? `url("${monster.image}")` : "none");
    els.board.classList.toggle("has-monster-art", Boolean(monster.image));
    els.board.innerHTML = "";

    for (let y = 0; y < monster.rows; y += 1) {
      for (let x = 0; x < monster.cols; x += 1) {
        const cellKey = key(x, y);
        const cell = effective.get(cellKey);
        const currentCell = current.get(cellKey);
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.x = String(x);
        button.dataset.y = String(y);
        button.className = cellClass(cell, currentCell);
        const mark = cell?.icon ? ICONS[cell.icon].mark : currentCell?.removed ? "x" : "";
        if (mark) {
          const markEl = document.createElement("span");
          markEl.className = "board-cell-mark";
          markEl.textContent = mark;
          button.append(markEl);
        }
        button.title = `${x},${y}`;
        button.addEventListener("click", () => editCell(monster, x, y));
        els.board.append(button);
      }
    }

    const baseCount = monster.cells.length;
    const effectiveCount = effective.size;
    els.summary.textContent = state.levelIndex < 0 ? `기본 ${baseCount}칸` : `Lv.${activeLevel.minLevel} ${effectiveCount}칸`;
    els.help.textContent = state.levelIndex < 0
      ? "기본 보드는 몬스터의 원래 몸체입니다. 칸을 추가하거나 삭제하면 모든 레벨에 영향을 줍니다."
      : "레벨 보드는 조건만 편집합니다. 노란 테두리는 현재 레벨에서 추가/변경된 칸이고, 흐린 칸은 이전 레벨에서 상속된 칸입니다.";
  }

  function cellClass(cell, currentCell) {
    const classes = ["board-cell"];
    if (cell) classes.push("body");
    if (cell?.icon) classes.push(cell.icon);
    if (state.levelIndex >= 0 && cell && !currentCell) classes.push("inherited");
    if (currentCell) classes.push("current");
    if (currentCell?.removed && !cell) classes.push("removed");
    return classes.join(" ");
  }

  function editCell(monster, x, y) {
    if (state.levelIndex < 0) {
      editBaseCell(monster, x, y);
    } else {
      editLevelCell(currentLevel(monster), x, y);
    }
    trimMonster(monster);
    render();
  }

  function editBaseCell(monster, x, y) {
    const cellKey = key(x, y);
    const cells = new Map(monster.cells.map((cell) => [key(cell.x, cell.y), { ...cell }]));
    if (state.tool === "erase") cells.delete(cellKey);
    if (state.tool === "body") cells.set(cellKey, { x, y });
    if (state.tool === "clear" && cells.has(cellKey)) cells.set(cellKey, { x, y });
    if (ICONS[state.tool]) cells.set(cellKey, { x, y, icon: state.tool });
    monster.cells = [...cells.values()].sort(sortCells);
  }

  function editLevelCell(level, x, y) {
    ensureBoardConditions(level);
    removeFromConditions(level, x, y);
    if (state.tool === "erase") {
      level.boardConditions.removeCells.push({ x, y });
    } else if (state.tool === "body") {
      level.boardConditions.extraCells.push({ x, y });
    } else if (state.tool === "clear") {
      level.boardConditions.icons.push({ x, y });
    } else if (ICONS[state.tool]) {
      level.boardConditions.icons.push({ x, y, icon: state.tool });
    }
  }

  function ensureBoardConditions(level) {
    level.boardConditions ||= {};
    level.boardConditions.icons ||= [];
    level.boardConditions.extraCells ||= [];
    level.boardConditions.removeCells ||= [];
  }

  function removeFromConditions(level, x, y) {
    ensureBoardConditions(level);
    const remove = (cells) => cells.filter((cell) => cell.x !== x || cell.y !== y);
    level.boardConditions.icons = remove(level.boardConditions.icons);
    level.boardConditions.extraCells = remove(level.boardConditions.extraCells);
    level.boardConditions.removeCells = remove(level.boardConditions.removeCells);
  }

  function levelConditionMap(level) {
    ensureBoardConditions(level);
    const map = new Map();
    level.boardConditions.removeCells.forEach((cell) => map.set(key(cell.x, cell.y), { ...cell, removed: true }));
    level.boardConditions.extraCells.forEach((cell) => map.set(key(cell.x, cell.y), { ...cell }));
    level.boardConditions.icons.forEach((cell) => map.set(key(cell.x, cell.y), { ...cell }));
    return map;
  }

  function effectiveCellMap(monster, levelIndex) {
    const map = new Map(monster.cells.map((cell) => [key(cell.x, cell.y), { ...cell }]));
    if (levelIndex < 0) return map;
    monster.levels.slice(0, levelIndex + 1).forEach((level) => {
      ensureBoardConditions(level);
      level.boardConditions.removeCells.forEach((cell) => map.delete(key(cell.x, cell.y)));
      level.boardConditions.extraCells.forEach((cell) => map.set(key(cell.x, cell.y), { ...cell }));
      level.boardConditions.icons.forEach((cell) => map.set(key(cell.x, cell.y), { ...cell }));
    });
    return map;
  }

  function renderJson() {
    els.json.value = JSON.stringify(createPayload(), null, 2);
  }

  function createPayload() {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      monsters: normalizeMonsters(state.monsters),
    };
  }

  function normalizeMonsters(monsters) {
    return monsters.map((monster) => {
      const cols = clampNumber(monster.cols, 1, 8, 3);
      const rows = clampNumber(monster.rows, 1, 8, 3);
      return {
        id: String(monster.id || "monster").trim(),
        name: String(monster.name || monster.id || "Monster").trim(),
        sub: String(monster.sub || "").trim(),
        image: String(monster.image || "").trim(),
        cols,
        rows,
        baseAttack: clampNumber(monster.baseAttack, 0, 99, 1),
        actions: normalizeActions(monster.actions),
        levels: normalizeLevels(monster.levels, cols, rows, monster.baseAttack),
        cells: normalizeCells(monster.cells, cols, rows),
      };
    });
  }

  function normalizeLevels(levels, cols, rows, fallbackAttack) {
    const normalized = (Array.isArray(levels) ? levels : []).map((level) => {
      const conditions = level.boardConditions || {};
      return cleanLevel({
        minLevel: clampNumber(level.minLevel, 1, 99, 1),
        attack: clampNumber(level.attack, 0, 99, fallbackAttack || 1),
        note: String(level.note || "").trim(),
        boardConditions: {
          icons: normalizeCells(conditions.icons, cols, rows),
          extraCells: normalizeCells(conditions.extraCells, cols, rows),
          removeCells: normalizeCells(conditions.removeCells, cols, rows).map((cell) => ({ x: cell.x, y: cell.y })),
        },
      });
    }).sort((a, b) => a.minLevel - b.minLevel);
    return normalized.length ? normalized : [{ minLevel: 1, attack: fallbackAttack || 1 }];
  }

  function cleanLevel(level) {
    const conditions = level.boardConditions;
    const cleanConditions = {};
    if (conditions.icons.length) cleanConditions.icons = conditions.icons;
    if (conditions.extraCells.length) cleanConditions.extraCells = conditions.extraCells;
    if (conditions.removeCells.length) cleanConditions.removeCells = conditions.removeCells;
    const clean = { minLevel: level.minLevel, attack: level.attack };
    if (level.note) clean.note = level.note;
    if (Object.keys(cleanConditions).length) clean.boardConditions = cleanConditions;
    return clean;
  }

  function normalizeCells(cells, cols, rows) {
    const map = new Map();
    (Array.isArray(cells) ? cells : []).forEach((cell) => {
      const x = clampNumber(cell.x, 0, cols - 1, null);
      const y = clampNumber(cell.y, 0, rows - 1, null);
      if (x === null || y === null) return;
      const clean = { x, y };
      if (ICONS[cell.icon]) clean.icon = cell.icon;
      map.set(key(x, y), clean);
    });
    return [...map.values()].sort(sortCells);
  }

  function normalizeActions(actions) {
    const allowed = new Set(Object.keys(ICONS));
    const clean = (Array.isArray(actions) ? actions : []).filter((action) => allowed.has(action));
    return clean.length ? clean : ["attack"];
  }

  function trimMonster(monster) {
    monster.cells = normalizeCells(monster.cells, monster.cols, monster.rows);
    monster.levels = normalizeLevels(monster.levels, monster.cols, monster.rows, monster.baseAttack);
  }

  function sortLevels(monster, selectedLevel) {
    monster.levels.sort((a, b) => a.minLevel - b.minLevel);
    state.levelIndex = Math.max(0, monster.levels.indexOf(selectedLevel));
  }

  function key(x, y) {
    return `${x},${y}`;
  }

  function sortCells(a, b) {
    return a.y - b.y || a.x - b.x;
  }

  function clampNumber(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  }

  function escapeAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
  }

  function storageGet(keyName) {
    try {
      return window.localStorage?.getItem(keyName) || "";
    } catch {
      return "";
    }
  }

  function storageSet(keyName, value) {
    try {
      window.localStorage?.setItem(keyName, value);
      return true;
    } catch {
      return false;
    }
  }

  function storageRemove(keyName) {
    try {
      window.localStorage?.removeItem(keyName);
      return true;
    } catch {
      return false;
    }
  }

  function bindEvents() {
    els.name.addEventListener("input", () => {
      currentMonster().name = els.name.value;
      render();
    });
    els.sub.addEventListener("input", () => {
      currentMonster().sub = els.sub.value;
      renderJson();
    });
    els.cols.addEventListener("change", () => {
      const monster = currentMonster();
      monster.cols = clampNumber(els.cols.value, 1, 8, monster.cols);
      trimMonster(monster);
      render();
    });
    els.rows.addEventListener("change", () => {
      const monster = currentMonster();
      monster.rows = clampNumber(els.rows.value, 1, 8, monster.rows);
      trimMonster(monster);
      render();
    });
    els.baseAttack.addEventListener("change", () => {
      const monster = currentMonster();
      monster.baseAttack = clampNumber(els.baseAttack.value, 0, 99, monster.baseAttack);
      renderJson();
    });
    els.tools.forEach((button) => {
      button.addEventListener("click", () => {
        state.tool = button.dataset.tool;
        renderTools();
      });
    });
    els.addLevel.addEventListener("click", () => {
      const monster = currentMonster();
      const maxLevel = monster.levels.reduce((max, level) => Math.max(max, level.minLevel), 0);
      monster.levels.push({ minLevel: Math.min(99, maxLevel + 2), attack: monster.baseAttack, note: "", boardConditions: {} });
      monster.levels.sort((a, b) => a.minLevel - b.minLevel);
      state.levelIndex = monster.levels.length - 1;
      render();
    });
    els.save.addEventListener("click", () => {
      const saved = storageSet(STORAGE_KEY, JSON.stringify(createPayload()));
      els.save.textContent = saved ? "저장됨" : "저장 불가";
      window.setTimeout(() => {
        els.save.textContent = "저장";
      }, 900);
    });
    els.copy.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(els.json.value);
      els.copy.textContent = "복사됨";
      window.setTimeout(() => {
        els.copy.textContent = "JSON 복사";
      }, 900);
    });
    els.import.addEventListener("click", () => {
      try {
        const parsed = JSON.parse(els.json.value);
        if (!Array.isArray(parsed.monsters)) return;
        state.monsters = normalizeMonsters(parsed.monsters);
        state.monsterId = state.monsters[0]?.id || null;
        state.levelIndex = -1;
        render();
      } catch {
        els.import.textContent = "JSON 오류";
        window.setTimeout(() => {
          els.import.textContent = "가져오기";
        }, 900);
      }
    });
    els.reset.addEventListener("click", () => {
      storageRemove(STORAGE_KEY);
      state.monsters = clone(DEFAULT_MONSTERS);
      state.monsterId = state.monsters[0]?.id || null;
      state.levelIndex = -1;
      render();
    });
  }

  bindEvents();
  render();
})();
