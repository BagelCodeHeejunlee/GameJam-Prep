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
    c(2, 1),
    c(3, 1),
    c(2, 2),
    c(4, 2),
    c(2, 3),
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

  const MAX_HP = 24;
  const BOARD_GAP = 3;
  const CUT_BOARD_COLS = 8;
  const CUT_BOARD_ROWS = 6;
  const DRAG_POINTER_OFFSET = 44;
  const MAX_CUTS_PER_TURN = 2;
  const LINK_TRIGGER_LIMIT_PER_CUT = 2;
  const MIN_CELL_SIZE = 22;
  const MAX_CELL_SIZE = 42;
  const COMPACT_HEIGHT = 760;
  const TINY_HEIGHT = 680;

  const monsters = [
    {
      name: "철갑 고블린",
      sub: "작은 몸통의 주먹부터 막아라",
      cols: 3,
      rows: 3,
      baseAttack: 2,
      actions: ["attack", "defense", "attack", "heal"],
      cells: [
        c(1, 0, "attack"),
        c(0, 1),
        c(1, 1, "defense"),
        c(2, 1),
        c(0, 2, "heal"),
        c(1, 2),
        c(2, 2, "attack"),
      ],
      special(state, count) {
        const damage = takeDamage(count + 1);
        addLog(`고블린이 위협 공격을 했다. 특수 표식 ${count}개로 ${damage} 피해.`);
      },
    },
    {
      name: "늪지 점액술사",
      sub: "회복 표식을 방치하면 재료가 말린다",
      cols: 4,
      rows: 4,
      baseAttack: 1,
      actions: ["heal", "attack", "defense", "special", "attack"],
      cells: [
        c(1, 0, "attack"),
        c(2, 0, "heal"),
        c(0, 1),
        c(1, 1, "defense"),
        c(2, 1),
        c(3, 1, "attack"),
        c(1, 2),
        c(2, 2, "special"),
        c(3, 2),
        c(1, 3),
        c(2, 3, "heal"),
      ],
      special(state, count) {
        const blocks = chooseOpenCells(count + 1);
        blocks.forEach((cellKey) => state.blocked.add(cellKey));
        addLog(`점액이 굳어 다음 턴 ${blocks.length}칸을 막았다.`);
      },
    },
    {
      name: "돌껍질 오우거",
      sub: "큰 몸이지만 낭비할 재료는 적다",
      cols: 5,
      rows: 4,
      baseAttack: 3,
      actions: ["attack", "defense", "special", "attack", "heal"],
      cells: [
        c(2, 0, "defense"),
        c(1, 1),
        c(2, 1),
        c(3, 1, "heal"),
        c(0, 2, "attack"),
        c(1, 2),
        c(2, 2, "special"),
        c(3, 2),
        c(4, 2, "attack"),
        c(1, 3, "defense"),
        c(2, 3),
        c(3, 3, "special"),
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
  ];

  const stages = [
    {
      name: "도시락 숲",
      waves: [
        { name: "웨이브 1", rounds: [0, 1] },
        { name: "웨이브 2", rounds: [1, 2] },
        { name: "웨이브 3", rounds: [0, 2] },
      ],
    },
  ];

  const els = {
    appShell: document.querySelector(".app-shell"),
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

  const state = {
    stageIndex: 0,
    waveIndex: 0,
    roundIndex: 0,
    turn: 1,
    actionIndex: 0,
    cutsUsed: 0,
    playerHp: MAX_HP,
    monsterCells: new Map(),
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
    coverOrder: [],
    log: [],
    pendingLogs: [],
    boardEffects: [],
    resultMode: null,
    rewardOptions: [],
    boardEdit: null,
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

  function currentStage() {
    return stages[state.stageIndex] || stages[0];
  }

  function currentWave() {
    const stage = currentStage();
    return stage.waves[state.waveIndex] || stage.waves[0];
  }

  function currentMonsterIndex() {
    const wave = currentWave();
    return wave.rounds[state.roundIndex] ?? wave.rounds[0];
  }

  function currentMonster() {
    return monsters[currentMonsterIndex()] || monsters[0];
  }

  function currentAction() {
    const monster = currentMonster();
    return monster.actions[state.actionIndex % monster.actions.length];
  }

  function waveCount() {
    return currentStage().waves.length;
  }

  function roundCount() {
    return currentWave().rounds.length;
  }

  function hasNextRound() {
    return state.roundIndex < roundCount() - 1;
  }

  function hasNextWave() {
    return state.waveIndex < waveCount() - 1;
  }

  function hasNextStage() {
    return state.stageIndex < stages.length - 1;
  }

  function isRunComplete() {
    return !hasNextRound() && !hasNextWave() && !hasNextStage();
  }

  function progressionLabel() {
    return `W${state.waveIndex + 1}/${waveCount()} M${state.roundIndex + 1}/${roundCount()}`;
  }

  function startGame() {
    state.stageIndex = 0;
    state.waveIndex = 0;
    state.roundIndex = 0;
    state.playerHp = MAX_HP;
    state.boardCells = new Set(BASE_BOARD_CELLS.map((cell) => key(cell.x, cell.y)));
    state.boardCellTypes = new Map();
    state.boardLinks = new Map();
    state.knifeLoadout = BASE_KNIVES.map((knife) => ({ ...knife }));
    state.silentRefillUpgrades = 0;
    state.silentRefills = 0;
    state.shield = 0;
    state.rewardOptions = [];
    state.boardEdit = null;
    state.pendingLogs = [];
    state.boardEffects = [];
    startStage(0);
  }

  function startStage(index) {
    state.stageIndex = index;
    state.waveIndex = 0;
    state.roundIndex = 0;
    startRound(index, 0, 0);
  }

  function startRound(stageIndex = state.stageIndex, waveIndex = state.waveIndex, roundIndex = state.roundIndex) {
    const pendingLogs = state.pendingLogs;
    state.stageIndex = stageIndex;
    state.waveIndex = waveIndex;
    state.roundIndex = roundIndex;
    const monster = currentMonster();
    state.turn = 1;
    state.actionIndex = 0;
    state.cutsUsed = 0;
    state.monsterCells = new Map();
    state.materialCols = CUT_BOARD_COLS;
    state.materialRows = CUT_BOARD_ROWS;
    state.materialOrigin = { x: 0, y: 0 };
    state.missingCells = new Set();
    state.spoiledCells = new Set();
    state.knives = [];
    state.placedPieces = [];
    state.blocked = new Set();
    state.coverOrder = [];
    state.log = [];
    state.pendingLogs = [];
    state.boardEffects = [];
    state.resultMode = null;
    state.rewardOptions = [];
    state.boardEdit = null;
    state.shield = 0;
    state.silentRefills = state.silentRefillUpgrades;
    state.nextPieceId = 1;
    state.nextPlacementId = 1;
    state.draggingPieceId = null;
    state.draggingPlacementId = null;
    state.draggingRewardItemId = null;
    state.selectedPlacementId = null;
    state.dropPreview = null;
    state.knifePreview = null;
    state.drag = null;

    monster.cells.forEach((cell) => {
      state.monsterCells.set(key(cell.x, cell.y), {
        x: cell.x,
        y: cell.y,
        icon: cell.icon,
        covered: false,
      });
    });

    resetMaterialBoard();

    addLog(`${currentWave().name} ${state.roundIndex + 1}/${currentWave().rounds.length}. ${monster.name} 등장.`);
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

  function render() {
    syncSelectedPlacement();
    renderSceneMode();
    renderStatus();
    renderActionCard();
    updateLayoutMode();
    updateAdaptiveCellSize();
    renderMonster();
    renderMaterialBoard();
    renderLog();
  }

  function renderSceneMode() {
    els.appShell.classList.toggle("reward-edit-mode", Boolean(state.boardEdit));
    els.appShell.classList.toggle("reward-edit-closing", Boolean(state.boardEdit?.closing));
  }

  function renderStatus() {
    const covered = coveredCount();
    const total = state.monsterCells.size;
    const shieldText = state.shield ? ` +${state.shield}` : "";
    els.stageLabel.textContent = progressionLabel();
    els.hpLabel.textContent = `${Math.max(0, state.playerHp)} / ${MAX_HP}${shieldText}`;
    els.materialLabel.textContent = `${availableMaterialCount()} / ${state.initialMaterialTotal}`;
    els.pieceCountLabel.textContent = `${state.materialPieces.length}개`;
    els.monsterSub.textContent = currentMonster().sub;
    els.monsterName.textContent = currentMonster().name;
    els.completionLabel.textContent = `${covered} / ${total}`;
    els.completionFill.style.width = `${(covered / total) * 100}%`;
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
    if (els.hpControlLabel) els.hpControlLabel.textContent = `${Math.max(0, state.playerHp)}/${MAX_HP}${shieldText}`;
    if (els.cutCountLabel) els.cutCountLabel.textContent = `${remainingCuts()}/${MAX_CUTS_PER_TURN}`;
  }

  function renderActionCard() {
    const action = currentAction();
    const attackIcons = uncoveredIconCount("attack");
    const healIcons = uncoveredIconCount("heal");
    const defenseIcons = uncoveredIconCount("defense");
    const specialIcons = uncoveredIconCount("special");
    const armorBlocks = action === "defense" ? chooseArmorBlocks() : [];
    const healTargets = action === "heal" ? chooseHealTargets(healIcons) : [];
    const monster = currentMonster();
    const actionView = {
      attack: {
        mark: ICONS.attack.mark,
        label: "공격",
        main: `피해 ${monster.baseAttack + attackIcons}`,
        sub: `기본 ${monster.baseAttack} + 공격 표식 ${attackIcons}`,
      },
      heal: {
        mark: ICONS.heal.mark,
        label: "회복",
        main: `회복 ${healTargets.length}칸`,
        sub: `회복 표식 ${healIcons}`,
      },
      defense: {
        mark: ICONS.defense.mark,
        label: "방어",
        main: `갑피 ${armorBlocks.length}칸`,
        sub: `방어 표식 ${defenseIcons}`,
      },
      special: {
        mark: ICONS.special.mark,
        label: "특수",
        main: specialIcons ? "고유 행동" : "행동 실패",
        sub: `특수 표식 ${specialIcons}`,
      },
    }[action];
    const blockedText = state.blocked.size ? `갑피 ${state.blocked.size}칸 배치 불가` : actionView.sub;

    els.actionCard.className = `action-card action-${action}`;
    els.actionCard.innerHTML = `
      <span class="action-kicker">${currentWave().name} · 몬스터 ${state.roundIndex + 1}/${roundCount()}</span>
      <span class="action-chip"><i>${actionView.mark}</i>${actionView.label}</span>
      <strong class="action-main">${actionView.main}</strong>
      <span class="action-sub">${blockedText}</span>
    `;
  }

  function updateLayoutMode() {
    const height = viewportHeight();
    els.appShell.classList.toggle("compact-layout", height < COMPACT_HEIGHT);
    els.appShell.classList.toggle("tiny-layout", height < TINY_HEIGHT);
  }

  function updateAdaptiveCellSize() {
    lastViewportSize = { width: viewportWidth(), height: viewportHeight() };
    const nextSize = calculateAdaptiveCellSize();
    if (!Number.isFinite(nextSize) || Math.abs(nextSize - state.cellSize) < 0.1) return;
    state.cellSize = nextSize;
    document.documentElement.style.setProperty("--small-cell", `${nextSize}px`);
    document.documentElement.style.setProperty("--cell", `${nextSize}px`);
  }

  function calculateAdaptiveCellSize() {
    const monster = currentMonster();
    const shellWidth = Math.min(viewportWidth(), 440);
    const preferredSize = shellWidth <= 370 ? 31 : clamp(shellWidth * 0.09, 34, MAX_CELL_SIZE);
    const limits = [preferredSize];
    const boardPad = getBoardPad();

    const monsterSectionRect = els.monsterSection.getBoundingClientRect();
    const monsterSectionStyle = getComputedStyle(els.monsterSection);
    const monsterInnerWidth = monsterSectionRect.width - horizontalPadding(monsterSectionStyle) - 2;
    const monsterGridHeight = monsterAvailableHeight(monsterSectionRect, monsterSectionStyle);
    limits.push(cellLimit(monsterInnerWidth, monster.cols));
    limits.push(cellLimit(monsterGridHeight, monster.rows));

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
    const monster = currentMonster();
    const armorPreview = new Set(currentAction() === "defense" ? chooseArmorBlocks() : []);
    const healPreview = new Set(currentAction() === "heal" ? chooseHealTargets(uncoveredIconCount("heal")) : []);
    const dropPreview = state.dropPreview?.zone === "monster" ? state.dropPreview : null;
    const dropPreviewCells = new Set(dropPreview?.cells || []);
    const draggingPlacedCells = getDraggingPlacedCells();
    els.monsterGrid.style.gridTemplateColumns = `repeat(${monster.cols}, var(--cell))`;
    els.monsterGrid.innerHTML = "";

    for (let y = 0; y < monster.rows; y += 1) {
      for (let x = 0; x < monster.cols; x += 1) {
        const cellKey = key(x, y);
        const monsterCell = state.monsterCells.get(cellKey);
        if (!monsterCell) {
          const empty = document.createElement("div");
          empty.className = "monster-cell empty";
          els.monsterGrid.append(empty);
          continue;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "monster-cell";
        button.dataset.key = cellKey;
        const isDraggingPlacedCell = draggingPlacedCells.has(cellKey);
        const isSelectedPlacement = monsterCell.placementId && monsterCell.placementId === state.selectedPlacementId;
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
        if (armorPreview.has(cellKey)) button.classList.add("preview-block");
        if (healPreview.has(cellKey)) button.classList.add("heal-target");
        if (dropPreviewCells.has(cellKey)) {
          button.classList.add(dropPreview.valid ? "preview-place" : "preview-invalid");
        }

        if (monsterCell.icon) {
          const icon = document.createElement("span");
          const iconMeta = ICONS[monsterCell.icon];
          icon.className = `cell-icon ${iconMeta.className}`;
          icon.textContent = iconMeta.mark;
          icon.title = iconMeta.label;
          button.append(icon);
        }

        els.monsterGrid.append(button);
      }
    }
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
    if (state.boardEdit) return;
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
      state.playerHp = Math.min(MAX_HP, state.playerHp + linkRewards.heal);
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
    if (state.boardEdit) return;
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
    const placement = getPlacement(placementId);
    if (!placement || isCurrentTurnPlacement(placement)) return;
    state.selectedPlacementId = state.selectedPlacementId === placementId ? null : placementId;
    state.dropPreview = null;
    render();
  }

  function beginPlacedPieceDrag(event, placementId, grabbedX, grabbedY) {
    if (state.boardEdit) return;
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

    render();
  }

  function executeMonsterAction() {
    const action = currentAction();
    const monster = currentMonster();

    if (action === "attack") {
      const attackIcons = uncoveredIconCount("attack");
      const damage = monster.baseAttack + attackIcons;
      const taken = takeDamage(damage);
      const shielded = damage - taken;
      addLog(`공격 실행. 기본 ${monster.baseAttack} + 공격 표식 ${attackIcons} = ${taken} 피해${shielded ? `, 쉴드 ${shielded} 흡수` : ""}.`);
      return;
    }

    if (action === "heal") {
      const healIcons = uncoveredIconCount("heal");
      const targets = chooseHealTargets(healIcons);
      targets.forEach((cellKey) => uncoverMonsterCell(cellKey));
      state.coverOrder = state.coverOrder.filter((cellKey) => !targets.includes(cellKey));
      prunePlacedPieces();
      addLog(targets.length ? `회복 실행. 일반 칸 ${targets.length}개가 다시 비었다.` : "회복 표식이 막혀 아무 칸도 되돌리지 못했다.");
      return;
    }

    if (action === "defense") {
      const blocks = chooseArmorBlocks();
      state.blocked = new Set(blocks);
      addLog(blocks.length ? `갑피 전개. 다음 턴 ${blocks.length}칸은 배치할 수 없다.` : "방어 표식이 막혀 갑피가 생기지 않았다.");
      return;
    }

    if (action === "special") {
      const specialIcons = uncoveredIconCount("special");
      if (!specialIcons) {
        addLog("특수 표식이 모두 막혀 특수 공격이 실패했다.");
        return;
      }
      monster.special(state, specialIcons);
    }
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
    const monster = currentMonster();
    return getGridCellFromAnchorPoint(point, els.monsterGrid, monster.cols, monster.rows, cellSize);
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

  function chooseArmorBlocks() {
    const blocks = [];
    const used = new Set();
    const defenseCells = [...state.monsterCells.values()].filter((cell) => cell.icon === "defense" && !cell.covered);

    defenseCells.forEach((cell) => {
      const ordinary = monsterNeighbors(cell.x, cell.y).find((cellKey) => {
        const target = state.monsterCells.get(cellKey);
        return target && !target.covered && !target.icon && !used.has(cellKey);
      });
      const fallback = monsterNeighbors(cell.x, cell.y).find((cellKey) => {
        const target = state.monsterCells.get(cellKey);
        return target && !target.covered && !used.has(cellKey);
      });
      const chosen = ordinary || fallback;
      if (chosen) {
        used.add(chosen);
        blocks.push(chosen);
      }
    });

    return blocks;
  }

  function chooseHealTargets(amount) {
    if (!amount) return [];
    const targets = [];
    [...state.coverOrder].reverse().forEach((cellKey) => {
      const cell = state.monsterCells.get(cellKey);
      if (targets.length < amount && cell && cell.covered && !cell.icon) targets.push(cellKey);
    });
    if (targets.length < amount) {
      [...state.monsterCells.entries()].forEach(([cellKey, cell]) => {
        if (targets.length < amount && cell.covered && !cell.icon && !targets.includes(cellKey)) targets.push(cellKey);
      });
    }
    return targets;
  }

  function chooseOpenCells(amount) {
    return [...state.monsterCells.entries()]
      .filter(([cellKey, cell]) => !cell.covered && !state.blocked.has(cellKey))
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

  function uncoveredIconCount(icon) {
    return [...state.monsterCells.values()].filter((cell) => cell.icon === icon && !cell.covered).length;
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
    state.rewardOptions = [...preferred, ...fallback].slice(0, 3);
    return state.rewardOptions;
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
      const left = document.createElement("span");
      left.className = "reward-icon-rice";
      const right = document.createElement("span");
      right.className = "reward-icon-rice";
      const bridge = document.createElement("span");
      bridge.className = `reward-icon-link ${meta.className}`;
      const mark = document.createElement("span");
      mark.className = `reward-icon-mark ${meta.className}`;
      mark.textContent = meta.mark;
      wrap.append(left, bridge, mark, right);
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
    if (reward.id === "linkHeal") return "자르면 체력 +1";
    if (reward.id === "linkAttack") return "자르면 1칸 조각 생성";
    if (reward.id === "linkDefense") return "자르면 쉴드 +1";
    if (reward.id === "growH") return "가로 2칸 -> 3칸";
    if (reward.id === "growV") return "세로 2칸 -> 3칸";
    if (reward.id === "bendL") return "직선 칼 -> ㄱ자 칼";
    if (reward.id === "growL") return "ㄱ자 칼 더 길게";
    if (reward.id === "silentRefill") return "새 판 요청 1회 안전";
    return reward.text;
  }

  function applyReward(rewardId) {
    const reward = REWARDS[rewardId];
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
      shape: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
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
    state.playerHp = Math.min(MAX_HP, state.playerHp + 6);
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

      if (!item.placed && item.shape.length > 1) {
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
    if (!item || item.placed || item.shape.length < 2) return;
    item.shape = rotateShape(item.shape);
    render();
  }

  function rewardItemSpecialCells(item) {
    if (item.type !== "link") return new Map();
    return new Map(item.shape.map((cell) => [key(cell.x, cell.y), item.linkType]));
  }

  function rewardItemSpecialLinks(item) {
    if (item.type !== "link" || item.shape.length < 2) return new Map();
    const [a, b] = item.shape;
    return new Map([[edgeKey(key(a.x, a.y), key(b.x, b.y)), { type: item.linkType, active: true }]]);
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
      state.resultMode = "round";
      els.resultModal?.classList.remove("reward-modal");
      els.resultEyebrow.textContent = "ROUND CLEAR";
      els.resultTitle.textContent = `${currentMonster().name} 포장 완료`;
      els.resultText.textContent = `보상은 ${currentWave().name}의 모든 몬스터를 정리한 뒤 제공됩니다.`;
      els.resultButton.textContent = "다음 몬스터";
      els.resultButton.classList.remove("hidden");
      renderRewardChoices([]);
      els.overlay.classList.remove("hidden");
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
    els.resultButton.textContent = isFinal ? "다시 시작" : "다음 웨이브";
    els.resultButton.classList.toggle("hidden", !isFinal);
    renderRewardChoices(isFinal ? [] : dealRewardOptions());
    els.overlay.classList.remove("hidden");
  }

  function showLoss(title, text) {
    state.resultMode = "loss";
    els.resultModal?.classList.remove("reward-modal");
    els.resultEyebrow.textContent = "DEFEAT";
    els.resultTitle.textContent = title;
    els.resultText.textContent = text;
    els.resultButton.textContent = "다시 시작";
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
    if (state.resultMode === "round") {
      startRound(state.stageIndex, state.waveIndex, state.roundIndex + 1);
      return;
    }
    if (state.resultMode === "complete" || state.resultMode === "loss") {
      startGame();
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
        render();
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
  window.addEventListener("resize", scheduleResponsiveRender);
  window.visualViewport?.addEventListener("resize", scheduleResponsiveRender);

  startGame();
})();
