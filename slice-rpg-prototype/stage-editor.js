(() => {
  const STORAGE_KEY = "bento-stage-editor-data-v1";
  const BOARD_COLS = 8;
  const BOARD_ROWS = 6;
  const WAVES_PER_STAGE = 5;
  const BOSS_MONSTER_ID = "stone-ogre";
  const MONSTER_ROTATION = ["tiny-berry-imp", "tiny-jelly-block", "iron-goblin", "swamp-slime"];

  const MONSTERS = [
    {
      id: "tiny-berry-imp",
      name: "외눈 베리 임프",
      short: "베",
      cols: 2,
      rows: 2,
      cells: [c(1, 0), c(0, 1), c(1, 1)],
    },
    {
      id: "tiny-jelly-block",
      name: "젤리 블록",
      short: "젤",
      cols: 2,
      rows: 2,
      cells: [c(0, 0), c(1, 0), c(0, 1), c(1, 1)],
    },
    {
      id: "iron-goblin",
      name: "철갑 고블린",
      short: "고",
      cols: 3,
      rows: 3,
      cells: [c(1, 0), c(0, 1), c(1, 1), c(2, 1), c(0, 2), c(1, 2), c(2, 2)],
    },
    {
      id: "swamp-slime",
      name: "늪지 점액술사",
      short: "슬",
      cols: 4,
      rows: 4,
      cells: [c(1, 0), c(2, 0), c(0, 1), c(1, 1), c(2, 1), c(3, 1), c(1, 2), c(2, 2), c(3, 2), c(1, 3), c(2, 3)],
    },
    {
      id: "stone-ogre",
      name: "돌껍질 오우거",
      short: "오",
      cols: 5,
      rows: 4,
      cells: [c(2, 0), c(1, 1), c(2, 1), c(3, 1), c(0, 2), c(1, 2), c(2, 2), c(3, 2), c(4, 2), c(1, 3), c(2, 3), c(3, 3)],
    },
  ];

  const STAGES = [
    { id: "forest-1-1", title: "도시락 숲 1-1", rotationOffset: 0 },
    { id: "forest-1-2", title: "도시락 숲 1-2", rotationOffset: 1 },
    { id: "forest-1-3", title: "도시락 숲 1-3", rotationOffset: 2 },
  ];

  const MONSTERS_BY_ID = new Map(MONSTERS.map((monster) => [monster.id, monster]));
  const STAGES_BY_ID = new Map(STAGES.map((stage) => [stage.id, stage]));

  const els = {
    stageSelect: document.querySelector("#stageSelect"),
    addWaveButton: document.querySelector("#addWaveButton"),
    saveButton: document.querySelector("#saveButton"),
    copyButton: document.querySelector("#copyButton"),
    resetButton: document.querySelector("#resetButton"),
    saveStatus: document.querySelector("#saveStatus"),
    waveList: document.querySelector("#waveList"),
    waveEyebrow: document.querySelector("#waveEyebrow"),
    waveTitle: document.querySelector("#waveTitle"),
    deleteWaveButton: document.querySelector("#deleteWaveButton"),
    waveNameInput: document.querySelector("#waveNameInput"),
    bossCheckbox: document.querySelector("#bossCheckbox"),
    monsterSelect: document.querySelector("#monsterSelect"),
    addMonsterButton: document.querySelector("#addMonsterButton"),
    boardGrid: document.querySelector("#boardGrid"),
    boardSummary: document.querySelector("#boardSummary"),
    monsterList: document.querySelector("#monsterList"),
    jsonOutput: document.querySelector("#jsonOutput"),
  };

  const editorState = {
    stageId: STAGES[0].id,
    waveIndex: 0,
    monsterIndex: 0,
  };

  let data = loadData();

  fillSelects();
  bindEvents();
  render();

  function c(x, y) {
    return { x, y };
  }

  function key(x, y) {
    return `${x},${y}`;
  }

  function loadData() {
    const defaults = createDefaultData();
    let saved = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      saved = null;
    }
    if (!saved?.stages) return defaults;

    STAGES.forEach((stage) => {
      const savedWaves = saved.stages?.[stage.id]?.waves;
      if (!Array.isArray(savedWaves)) return;
      const waves = normalizeWaves(savedWaves, stage.id);
      if (waves.length) defaults.stages[stage.id].waves = waves;
    });
    return defaults;
  }

  function createDefaultData() {
    return {
      version: 1,
      stages: Object.fromEntries(STAGES.map((stage) => [
        stage.id,
        {
          title: stage.title,
          waves: createStageWaves(stage.id, stage.rotationOffset),
        },
      ])),
    };
  }

  function createStageWaves(stageId, rotationOffset = 0) {
    return Array.from({ length: WAVES_PER_STAGE }, (_, waveIndex) => {
      const boss = waveIndex === WAVES_PER_STAGE - 1;
      const rotationIndex = (rotationOffset + waveIndex) % MONSTER_ROTATION.length;
      const monsterId = boss ? BOSS_MONSTER_ID : MONSTER_ROTATION[rotationIndex];
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
    const layouts = [
      [{ monsterId, x: 3, y: 3 }],
      [{ monsterId, x: 2, y: 3 }, { monsterId: "tiny-jelly-block", x: 5, y: 3 }],
      [{ monsterId, x: 1, y: 2 }, { monsterId: "tiny-berry-imp", x: 6, y: 4 }],
      [{ monsterId, x: 0, y: 2 }, { monsterId: "tiny-jelly-block", x: 4, y: 1 }, { monsterId: "tiny-berry-imp", x: 6, y: 4 }],
    ];
    return layouts[waveIndex % layouts.length].map((entry) => ({ ...entry }));
  }

  function normalizeWaves(waves, stageId) {
    return waves.map((wave, index) => {
      const normalized = {
        id: typeof wave?.id === "string" && wave.id ? wave.id : `${stageId}-w${index + 1}`,
        name: typeof wave?.name === "string" && wave.name.trim() ? wave.name.trim() : `웨이브 ${index + 1}`,
        boss: Boolean(wave?.boss),
        monsters: [],
      };
      normalized.monsters = normalizeMonsters(wave?.monsters);
      return normalized;
    }).filter((wave) => wave.monsters.length);
  }

  function normalizeMonsters(monsters) {
    const normalized = [];
    (Array.isArray(monsters) ? monsters : []).forEach((entry) => {
      const monsterId = MONSTERS_BY_ID.has(entry?.monsterId) ? entry.monsterId : MONSTERS[0].id;
      const monster = MONSTERS_BY_ID.get(monsterId);
      const x = clampInteger(entry?.x, 0, BOARD_COLS - monster.cols, 0);
      const y = clampInteger(entry?.y, 0, BOARD_ROWS - monster.rows, 0);
      if (!isPlacementValidInList(normalized, monsterId, x, y, -1)) return;
      normalized.push({ monsterId, x, y });
    });
    return normalized;
  }

  function fillSelects() {
    els.stageSelect.innerHTML = "";
    STAGES.forEach((stage) => {
      const option = document.createElement("option");
      option.value = stage.id;
      option.textContent = stage.title;
      els.stageSelect.append(option);
    });

    els.monsterSelect.innerHTML = "";
    MONSTERS.forEach((monster) => {
      const option = document.createElement("option");
      option.value = monster.id;
      option.textContent = monster.name;
      els.monsterSelect.append(option);
    });
  }

  function bindEvents() {
    els.stageSelect.addEventListener("change", () => {
      editorState.stageId = els.stageSelect.value;
      editorState.waveIndex = 0;
      editorState.monsterIndex = 0;
      render();
    });
    els.addWaveButton.addEventListener("click", addWave);
    els.saveButton.addEventListener("click", saveData);
    els.copyButton.addEventListener("click", copyJson);
    els.resetButton.addEventListener("click", resetData);
    els.deleteWaveButton.addEventListener("click", deleteWave);
    els.waveNameInput.addEventListener("input", () => {
      currentWave().name = els.waveNameInput.value.trim() || "웨이브";
      renderWaveList();
      renderJson();
    });
    els.bossCheckbox.addEventListener("change", () => {
      currentWave().boss = els.bossCheckbox.checked;
      renderWaveList();
      renderJson();
    });
    els.addMonsterButton.addEventListener("click", addMonster);
  }

  function render() {
    ensureCurrentWave();
    els.stageSelect.value = editorState.stageId;
    renderWaveList();
    renderWaveFields();
    renderBoard();
    renderMonsterList();
    renderJson();
  }

  function ensureCurrentWave() {
    const stage = currentStageData();
    if (!stage.waves.length) stage.waves.push(createEmptyWave(0));
    editorState.waveIndex = clamp(editorState.waveIndex, 0, stage.waves.length - 1);
    const wave = currentWave();
    if (!wave.monsters.length) wave.monsters.push({ monsterId: MONSTERS[0].id, x: 3, y: 3 });
    editorState.monsterIndex = clamp(editorState.monsterIndex, 0, wave.monsters.length - 1);
  }

  function currentStageData() {
    return data.stages[editorState.stageId] || data.stages[STAGES[0].id];
  }

  function currentWave() {
    return currentStageData().waves[editorState.waveIndex];
  }

  function renderWaveList() {
    const stage = currentStageData();
    els.waveList.innerHTML = "";
    stage.waves.forEach((wave, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `wave-button${index === editorState.waveIndex ? " active" : ""}`;
      button.innerHTML = `
        <strong>${escapeHtml(wave.name)}</strong>
        <span>${wave.monsters.length}마리${wave.boss ? " · 보스" : ""}</span>
      `;
      button.addEventListener("click", () => {
        editorState.waveIndex = index;
        editorState.monsterIndex = 0;
        render();
      });
      els.waveList.append(button);
    });
  }

  function renderWaveFields() {
    const wave = currentWave();
    els.waveEyebrow.textContent = `WAVE ${editorState.waveIndex + 1}`;
    els.waveTitle.textContent = wave.name;
    els.waveNameInput.value = wave.name;
    els.bossCheckbox.checked = wave.boss;
    els.deleteWaveButton.disabled = currentStageData().waves.length <= 1;
  }

  function renderBoard() {
    const wave = currentWave();
    const cellMap = buildBoardCellMap(wave);
    els.boardGrid.innerHTML = "";

    for (let y = 0; y < BOARD_ROWS; y += 1) {
      for (let x = 0; x < BOARD_COLS; x += 1) {
        const cellKey = key(x, y);
        const occupant = cellMap.get(cellKey);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stage-cell";
        button.dataset.x = String(x);
        button.dataset.y = String(y);

        if (occupant) {
          button.classList.add("occupied", `monster-tone-${occupant.index % 5}`);
          if (occupant.index === editorState.monsterIndex) button.classList.add("selected");
          const number = document.createElement("span");
          number.className = "cell-number";
          number.textContent = String(occupant.index + 1);
          button.append(number);
          button.append(document.createTextNode(occupant.monster.short));
        }

        button.addEventListener("click", () => handleBoardCellClick(x, y, occupant));
        els.boardGrid.append(button);
      }
    }

    const occupied = new Set([...cellMap.keys()]).size;
    els.boardSummary.textContent = `${wave.monsters.length}마리 · ${occupied}/${BOARD_COLS * BOARD_ROWS}칸 사용`;
  }

  function renderMonsterList() {
    const wave = currentWave();
    els.monsterList.innerHTML = "";

    wave.monsters.forEach((entry, index) => {
      const monster = MONSTERS_BY_ID.get(entry.monsterId) || MONSTERS[0];
      const item = document.createElement("section");
      item.className = `monster-item${index === editorState.monsterIndex ? " active" : ""}`;

      const head = document.createElement("div");
      head.className = "monster-item-head";
      const number = document.createElement("strong");
      number.textContent = String(index + 1);
      const select = document.createElement("select");
      MONSTERS.forEach((candidate) => {
        const option = document.createElement("option");
        option.value = candidate.id;
        option.textContent = candidate.name;
        select.append(option);
      });
      select.value = monster.id;
      select.addEventListener("change", () => changeMonsterType(index, select.value));
      head.append(number, select);

      const coords = document.createElement("div");
      coords.className = "coord-row";
      coords.append(createCoordInput("X", entry.x, (value) => moveMonster(index, value, entry.y)));
      coords.append(createCoordInput("Y", entry.y, (value) => moveMonster(index, entry.x, value)));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-monster-button";
      remove.textContent = "삭제";
      remove.disabled = wave.monsters.length <= 1;
      remove.addEventListener("click", () => removeMonster(index));

      item.addEventListener("click", (event) => {
        if (["INPUT", "SELECT", "BUTTON"].includes(event.target.tagName)) return;
        editorState.monsterIndex = index;
        render();
      });
      item.append(head, coords, remove);
      els.monsterList.append(item);
    });
  }

  function createCoordInput(labelText, value, onChange) {
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = labelText;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = labelText === "X" ? String(BOARD_COLS - 1) : String(BOARD_ROWS - 1);
    input.value = String(value);
    input.addEventListener("change", () => onChange(Number.parseInt(input.value, 10)));
    label.append(span, input);
    return label;
  }

  function renderJson() {
    els.jsonOutput.value = JSON.stringify(exportData(), null, 2);
  }

  function handleBoardCellClick(x, y, occupant) {
    if (occupant) {
      editorState.monsterIndex = occupant.index;
      render();
      return;
    }
    moveMonster(editorState.monsterIndex, x, y);
  }

  function addWave() {
    const stage = currentStageData();
    stage.waves.push(createEmptyWave(stage.waves.length));
    editorState.waveIndex = stage.waves.length - 1;
    editorState.monsterIndex = 0;
    setStatus("웨이브 추가됨");
    render();
  }

  function createEmptyWave(index) {
    const id = nextWaveId(index);
    return {
      id,
      name: `웨이브 ${index + 1}`,
      boss: false,
      monsters: [{ monsterId: MONSTERS[0].id, x: 3, y: 3 }],
    };
  }

  function nextWaveId(index) {
    const base = `${editorState.stageId}-w${index + 1}`;
    const existing = new Set(currentStageData().waves.map((wave) => wave.id));
    if (!existing.has(base)) return base;
    let suffix = 2;
    while (existing.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }

  function deleteWave() {
    const stage = currentStageData();
    if (stage.waves.length <= 1) return;
    stage.waves.splice(editorState.waveIndex, 1);
    editorState.waveIndex = clamp(editorState.waveIndex, 0, stage.waves.length - 1);
    editorState.monsterIndex = 0;
    setStatus("웨이브 삭제됨");
    render();
  }

  function addMonster() {
    const wave = currentWave();
    const monsterId = els.monsterSelect.value;
    const spot = findFreeSpot(wave.monsters, monsterId);
    if (!spot) {
      setStatus("빈 공간 없음", true);
      return;
    }
    wave.monsters.push({ monsterId, x: spot.x, y: spot.y });
    editorState.monsterIndex = wave.monsters.length - 1;
    setStatus("몬스터 추가됨");
    render();
  }

  function removeMonster(index) {
    const wave = currentWave();
    if (wave.monsters.length <= 1) return;
    wave.monsters.splice(index, 1);
    editorState.monsterIndex = clamp(editorState.monsterIndex, 0, wave.monsters.length - 1);
    setStatus("몬스터 삭제됨");
    render();
  }

  function changeMonsterType(index, monsterId) {
    const wave = currentWave();
    const entry = wave.monsters[index];
    if (!entry || !MONSTERS_BY_ID.has(monsterId)) return;
    if (isPlacementValid(wave, monsterId, entry.x, entry.y, index)) {
      entry.monsterId = monsterId;
    } else {
      const spot = findFreeSpot(wave.monsters, monsterId, index);
      if (!spot) {
        setStatus("변경할 공간 없음", true);
        render();
        return;
      }
      entry.monsterId = monsterId;
      entry.x = spot.x;
      entry.y = spot.y;
    }
    editorState.monsterIndex = index;
    setStatus("몬스터 변경됨");
    render();
  }

  function moveMonster(index, x, y) {
    const wave = currentWave();
    const entry = wave.monsters[index];
    if (!entry) return;
    const monster = MONSTERS_BY_ID.get(entry.monsterId) || MONSTERS[0];
    const nextX = clampInteger(x, 0, BOARD_COLS - monster.cols, entry.x);
    const nextY = clampInteger(y, 0, BOARD_ROWS - monster.rows, entry.y);
    if (!isPlacementValid(wave, entry.monsterId, nextX, nextY, index)) {
      setStatus("배치 불가", true);
      render();
      return;
    }
    entry.x = nextX;
    entry.y = nextY;
    editorState.monsterIndex = index;
    setStatus("배치 이동됨");
    render();
  }

  function findFreeSpot(monsters, monsterId, exceptIndex = -1) {
    const monster = MONSTERS_BY_ID.get(monsterId) || MONSTERS[0];
    for (let y = 0; y <= BOARD_ROWS - monster.rows; y += 1) {
      for (let x = 0; x <= BOARD_COLS - monster.cols; x += 1) {
        if (isPlacementValidInList(monsters, monsterId, x, y, exceptIndex)) return { x, y };
      }
    }
    return null;
  }

  function isPlacementValid(wave, monsterId, x, y, exceptIndex = -1) {
    return isPlacementValidInList(wave.monsters, monsterId, x, y, exceptIndex);
  }

  function isPlacementValidInList(monsters, monsterId, x, y, exceptIndex = -1) {
    const monster = MONSTERS_BY_ID.get(monsterId) || MONSTERS[0];
    if (x < 0 || y < 0 || x + monster.cols > BOARD_COLS || y + monster.rows > BOARD_ROWS) return false;
    const occupied = new Set();
    monsters.forEach((entry, index) => {
      if (index === exceptIndex) return;
      const other = MONSTERS_BY_ID.get(entry.monsterId) || MONSTERS[0];
      other.cells.forEach((cell) => occupied.add(key(entry.x + cell.x, entry.y + cell.y)));
    });
    return monster.cells.every((cell) => !occupied.has(key(x + cell.x, y + cell.y)));
  }

  function buildBoardCellMap(wave) {
    const map = new Map();
    wave.monsters.forEach((entry, index) => {
      const monster = MONSTERS_BY_ID.get(entry.monsterId) || MONSTERS[0];
      monster.cells.forEach((cell) => {
        map.set(key(entry.x + cell.x, entry.y + cell.y), { index, monster });
      });
    });
    return map;
  }

  function saveData() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exportData()));
    setStatus("저장됨");
  }

  function copyJson() {
    const json = JSON.stringify(exportData(), null, 2);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json).then(
        () => setStatus("복사됨"),
        () => fallbackCopyJson(),
      );
      return;
    }
    fallbackCopyJson();
  }

  function fallbackCopyJson() {
    els.jsonOutput.focus();
    els.jsonOutput.select();
    try {
      document.execCommand("copy");
      setStatus("복사됨");
    } catch {
      setStatus("복사 실패", true);
    }
  }

  function resetData() {
    data = createDefaultData();
    window.localStorage.removeItem(STORAGE_KEY);
    editorState.stageId = STAGES[0].id;
    editorState.waveIndex = 0;
    editorState.monsterIndex = 0;
    setStatus("초기화됨");
    render();
  }

  function exportData() {
    return {
      version: 1,
      stages: Object.fromEntries(STAGES.map((stage) => {
        const stageData = data.stages[stage.id];
        return [stage.id, {
          title: STAGES_BY_ID.get(stage.id)?.title || stage.id,
          waves: stageData.waves.map((wave, index) => ({
            id: wave.id || `${stage.id}-w${index + 1}`,
            name: wave.name,
            boss: Boolean(wave.boss),
            monsters: wave.monsters.map((entry) => ({
              monsterId: entry.monsterId,
              x: entry.x,
              y: entry.y,
            })),
          })),
        }];
      })),
    };
  }

  function setStatus(text, isError = false) {
    els.saveStatus.textContent = text;
    els.saveStatus.style.color = isError ? "#b73f34" : "var(--ok)";
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      if (els.saveStatus.textContent === text) els.saveStatus.textContent = "";
    }, 1600);
  }

  function clampInteger(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
