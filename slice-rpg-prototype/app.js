(() => {
  window.scrollTo(0, 0);

  const ICONS = {
    attack: { label: "공격", mark: "공", className: "icon-attack" },
    heal: { label: "회복", mark: "회", className: "icon-heal" },
    defense: { label: "방어", mark: "갑", className: "icon-defense" },
    special: { label: "특수", mark: "특", className: "icon-special" },
  };

  const KNIFE_TYPES = {
    h3: { label: "가로 3", orientation: "h", length: 3 },
    v3: { label: "세로 3", orientation: "v", length: 3 },
    h2: { label: "가로 2", orientation: "h", length: 2 },
  };

  const MAX_HP = 24;
  const BOARD_GAP = 3;
  const CUT_BOARD_COLS = 8;
  const CUT_BOARD_ROWS = 6;
  const DRAG_POINTER_OFFSET = 44;
  const MAX_CUTS_PER_TURN = 2;
  const MIN_CELL_SIZE = 22;
  const MAX_CELL_SIZE = 42;
  const COMPACT_HEIGHT = 760;
  const TINY_HEIGHT = 680;

  const monsters = [
    {
      name: "철갑 고블린",
      sub: "갑피를 먼저 막아라",
      cols: 5,
      rows: 5,
      baseAttack: 2,
      actions: ["attack", "defense", "attack", "heal", "special"],
      material: { cols: 5, rows: 4, holes: [] },
      knives: [
        { type: "h3", x: 1, y: 1 },
        { type: "v3", x: 3, y: 0 },
        { type: "h2", x: 0, y: 3 },
      ],
      cells: [
        c(2, 0),
        c(1, 1, "attack"),
        c(2, 1),
        c(3, 1, "defense"),
        c(0, 2, "attack"),
        c(1, 2),
        c(2, 2),
        c(3, 2),
        c(4, 2, "attack"),
        c(1, 3, "heal"),
        c(2, 3),
        c(3, 3, "defense"),
        c(4, 3),
        c(2, 4),
        c(3, 4),
        c(4, 4, "special"),
      ],
      special(state, count) {
        const damage = count + 1;
        state.playerHp -= damage;
        addLog(`고블린이 위협 공격을 했다. 특수 표식 ${count}개로 ${damage} 피해.`);
      },
    },
    {
      name: "늪지 점액술사",
      sub: "회복 표식을 방치하면 재료가 말린다",
      cols: 5,
      rows: 5,
      baseAttack: 1,
      actions: ["heal", "attack", "defense", "special", "attack"],
      material: { cols: 5, rows: 5, holes: [key(0, 0), key(4, 0), key(0, 4), key(4, 4)] },
      knives: [
        { type: "v3", x: 2, y: 1 },
        { type: "h3", x: 1, y: 2 },
        { type: "h2", x: 2, y: 4 },
      ],
      cells: [
        c(1, 0, "attack"),
        c(2, 0),
        c(3, 0, "heal"),
        c(0, 1),
        c(1, 1, "defense"),
        c(2, 1),
        c(3, 1, "attack"),
        c(4, 1),
        c(0, 2, "special"),
        c(1, 2),
        c(2, 2, "heal"),
        c(3, 2),
        c(4, 2, "attack"),
        c(1, 3),
        c(2, 3, "defense"),
        c(3, 3),
        c(2, 4),
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
      cols: 6,
      rows: 5,
      baseAttack: 3,
      actions: ["attack", "defense", "special", "attack", "heal"],
      material: { cols: 5, rows: 5, holes: [] },
      knives: [
        { type: "h3", x: 0, y: 2 },
        { type: "v3", x: 4, y: 1 },
        { type: "h2", x: 2, y: 4 },
      ],
      cells: [
        c(2, 0, "defense"),
        c(3, 0, "attack"),
        c(1, 1),
        c(2, 1),
        c(3, 1, "heal"),
        c(4, 1),
        c(0, 2, "attack"),
        c(1, 2),
        c(2, 2, "special"),
        c(3, 2),
        c(4, 2),
        c(5, 2, "attack"),
        c(0, 3),
        c(1, 3, "defense"),
        c(2, 3),
        c(3, 3, "special"),
        c(4, 3),
        c(5, 3, "attack"),
        c(2, 4),
        c(3, 4),
      ],
      special(state, count) {
        const spoiled = spoilMaterial(count + 1);
        if (spoiled > 0) {
          addLog(`오우거가 재료 ${spoiled}칸을 짓눌렀다.`);
        } else {
          const damage = count + 2;
          state.playerHp -= damage;
          addLog(`짓누를 재료가 없어 충격파로 ${damage} 피해를 받았다.`);
        }
      },
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
    resultEyebrow: document.querySelector("#resultEyebrow"),
    resultTitle: document.querySelector("#resultTitle"),
    resultText: document.querySelector("#resultText"),
    resultButton: document.querySelector("#resultButton"),
    dragGhost: document.querySelector("#dragGhost"),
  };

  const state = {
    stageIndex: 0,
    turn: 1,
    actionIndex: 0,
    cutsUsed: 0,
    playerHp: MAX_HP,
    monsterCells: new Map(),
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
    resultMode: null,
    nextPieceId: 1,
    nextPlacementId: 1,
    initialMaterialTotal: 0,
    draggingPieceId: null,
    draggingPlacementId: null,
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

  function currentMonster() {
    return monsters[state.stageIndex];
  }

  function currentAction() {
    const monster = currentMonster();
    return monster.actions[state.actionIndex % monster.actions.length];
  }

  function startGame() {
    state.stageIndex = 0;
    state.playerHp = MAX_HP;
    startStage(0);
  }

  function startStage(index) {
    const monster = monsters[index];
    state.stageIndex = index;
    state.turn = 1;
    state.actionIndex = 0;
    state.cutsUsed = 0;
    state.monsterCells = new Map();
    state.materialCols = CUT_BOARD_COLS;
    state.materialRows = CUT_BOARD_ROWS;
    state.materialOrigin = {
      x: Math.floor((CUT_BOARD_COLS - monster.material.cols) / 2),
      y: Math.floor((CUT_BOARD_ROWS - monster.material.rows) / 2),
    };
    state.missingCells = new Set();
    state.spoiledCells = new Set();
    state.knives = monster.knives.map((knife, index) => ({
      ...knife,
      x: knife.x + state.materialOrigin.x,
      y: knife.y + state.materialOrigin.y,
      id: `knife-${index}`,
    }));
    state.placedPieces = [];
    state.blocked = new Set();
    state.coverOrder = [];
    state.log = [];
    state.resultMode = null;
    state.nextPieceId = 1;
    state.nextPlacementId = 1;
    state.draggingPieceId = null;
    state.draggingPlacementId = null;
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

    addLog(`${monster.name} 등장. 칼을 움직여 절단선을 만들고 분리된 재료를 옮겨라.`);
    hideResult();
    render();
  }

  function resetMaterialBoard() {
    const monster = currentMonster();
    state.materialCols = CUT_BOARD_COLS;
    state.materialRows = CUT_BOARD_ROWS;
    state.materialOrigin = {
      x: Math.floor((CUT_BOARD_COLS - monster.material.cols) / 2),
      y: Math.floor((CUT_BOARD_ROWS - monster.material.rows) / 2),
    };
    state.missingCells = new Set();
    state.spoiledCells = new Set();
    state.knives = monster.knives.map((knife, index) => ({
      ...knife,
      x: knife.x + state.materialOrigin.x,
      y: knife.y + state.materialOrigin.y,
      id: `knife-${index}`,
    }));

    const cells = [];
    const materialHoles = new Set(monster.material.holes);
    for (let y = 0; y < monster.material.rows; y += 1) {
      for (let x = 0; x < monster.material.cols; x += 1) {
        if (!materialHoles.has(key(x, y))) {
          cells.push({ x: x + state.materialOrigin.x, y: y + state.materialOrigin.y });
        }
      }
    }

    state.initialMaterialTotal = cells.length;
    state.materialPieces = [{ id: state.nextPieceId, cells, cutEdges: new Set() }];
    state.nextPieceId += 1;
  }

  function addLog(text) {
    state.log.unshift(text);
    state.log = state.log.slice(0, 8);
  }

  function render() {
    syncSelectedPlacement();
    renderStatus();
    renderActionCard();
    updateLayoutMode();
    updateAdaptiveCellSize();
    renderMonster();
    renderMaterialBoard();
    renderLog();
  }

  function renderStatus() {
    const covered = coveredCount();
    const total = state.monsterCells.size;
    els.stageLabel.textContent = `${state.stageIndex + 1} / ${monsters.length}`;
    els.hpLabel.textContent = `${Math.max(0, state.playerHp)} / ${MAX_HP}`;
    els.materialLabel.textContent = `${availableMaterialCount()} / ${state.initialMaterialTotal}`;
    els.pieceCountLabel.textContent = `${state.materialPieces.length}개`;
    els.monsterSub.textContent = currentMonster().sub;
    els.monsterName.textContent = currentMonster().name;
    els.completionLabel.textContent = `${covered} / ${total}`;
    els.completionFill.style.width = `${(covered / total) * 100}%`;
    const selectedPlacement = getPlacement(state.selectedPlacementId);
    els.cutButton.textContent = selectedPlacement ? "회수" : "자르기";
    els.cutButton.classList.toggle("recover-mode", Boolean(selectedPlacement));
    els.cutButton.disabled = state.cutsUsed >= MAX_CUTS_PER_TURN || Boolean(state.resultMode);
    if (els.newBoardButton) els.newBoardButton.disabled = Boolean(state.resultMode);
    if (els.endTurnButton) els.endTurnButton.disabled = Boolean(state.resultMode);
    if (els.hpControlLabel) els.hpControlLabel.textContent = `${Math.max(0, state.playerHp)}/${MAX_HP}`;
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
      <span class="action-kicker">몬스터 턴</span>
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
    const dropPreview = state.dropPreview?.zone === "material" ? state.dropPreview : null;
    const dropPreviewCells = new Set(dropPreview?.cells || []);
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

        if (state.missingCells.has(cellKey)) {
          button.classList.add("used");
          button.disabled = true;
        } else if (state.spoiledCells.has(cellKey)) {
          button.classList.add("spoiled");
          button.disabled = true;
        } else if (pieceByCell.has(cellKey)) {
          const pieceId = pieceByCell.get(cellKey);
          button.dataset.pieceId = String(pieceId);
          button.classList.add(`piece-tone-${pieceId % 5}`);
          button.addEventListener("pointerdown", (event) => beginPieceDrag(event, pieceId, x, y));
        } else {
          button.classList.add("empty-material");
        }

        if (dropPreviewCells.has(cellKey)) {
          button.classList.add(dropPreview.valid ? "preview-place" : "preview-invalid");
        }

        els.materialGrid.append(button);
      }
    }

    renderCutMarks();
    renderKnifeGuide();
    renderKnives();
    renderWorkbenchHint();
  }

  function renderWorkbenchHint() {
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
    state.knives.forEach((knife, index) => {
      if (state.drag?.type === "knife" && state.drag.index === index) return;
      const type = KNIFE_TYPES[knife.type];
      const el = document.createElement("button");
      el.type = "button";
      el.className = `board-knife ${type.orientation}`;
      el.dataset.knifeIndex = String(index);
      el.textContent = type.label;
      el.style.left = knifeLeft(knife);
      el.style.top = knifeTop(knife);
      if (type.orientation === "h") {
        el.style.width = lengthSize(type.length);
      } else {
        el.style.height = lengthSize(type.length);
      }
      el.addEventListener("pointerdown", (event) => beginKnifeDrag(event, index));
      els.knifeLayer.append(el);
    });
  }

  function renderKnifeGuide() {
    if (!state.knifePreview) return;
    const type = KNIFE_TYPES[state.knifePreview.type];
    const el = document.createElement("span");
    el.className = `knife-guide ${type.orientation}`;
    el.style.left = knifeLeft(state.knifePreview);
    el.style.top = knifeTop(state.knifePreview);
    if (type.orientation === "h") {
      el.style.width = lengthSize(type.length);
    } else {
      el.style.height = lengthSize(type.length);
    }
    els.knifeLayer.append(el);
  }

  function boardPos(value) {
    const cell = getMaterialCellSize();
    return `${getBoardPad() + value * (cell + BOARD_GAP)}px`;
  }

  function knifeLeft(knife) {
    const type = KNIFE_TYPES[knife.type];
    const base = parseFloat(boardPos(knife.x));
    return `${base - (type.orientation === "v" ? getKnifeHitSize() / 2 : 0)}px`;
  }

  function knifeTop(knife) {
    const type = KNIFE_TYPES[knife.type];
    const base = parseFloat(boardPos(knife.y));
    return `${base - (type.orientation === "h" ? getKnifeHitSize() / 2 : 0)}px`;
  }

  function lengthSize(length) {
    const cell = getMaterialCellSize();
    return `${length * cell + Math.max(0, length - 1) * BOARD_GAP}px`;
  }

  function beginKnifeDrag(event, index) {
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
    const span = type.length * cell + Math.max(0, type.length - 1) * BOARD_GAP;

    if (type.orientation === "h") {
      return {
        x: clamp(Math.round((localX - span / 2) / step), 0, state.materialCols - type.length),
        y: clamp(Math.round(localY / step), 1, state.materialRows - 1),
      };
    }

    return {
      x: clamp(Math.round(localX / step), 1, state.materialCols - 1),
      y: clamp(Math.round((localY - span / 2) / step), 0, state.materialRows - type.length),
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
    state.knives.forEach((knife) => {
      const type = KNIFE_TYPES[knife.type];
      for (let i = 0; i < type.length; i += 1) {
        const edge = type.orientation === "h"
          ? edgeKey(key(knife.x + i, knife.y - 1), key(knife.x + i, knife.y))
          : edgeKey(key(knife.x - 1, knife.y + i), key(knife.x, knife.y + i));

        state.materialPieces.forEach((piece) => {
          if (isPieceEdge(edge, piece) && !piece.cutEdges.has(edge)) {
            piece.cutEdges.add(edge);
            added += 1;
          }
        });
      }
    });

    const before = state.materialPieces.length;
    rebuildPiecesFromCuts();
    const separated = Math.max(0, state.materialPieces.length - before);
    const cutSuffix = `남은 자르기 ${remainingCuts()}회.`;
    addLog(added ? `절단선 ${added}개를 냈다. ${separated ? `${separated}개 조각이 새로 분리됐다.` : "아직 흠집만 남아 있다."} ${cutSuffix}` : `새로 잘린 선이 없다. ${cutSuffix}`);
    render();
  }

  function beginPieceDrag(event, pieceId, grabbedX, grabbedY) {
    const piece = getPiece(pieceId);
    if (!piece) return;
    event.preventDefault();
    const min = minCell(piece.cells);
    const cells = normalizeCells(piece.cells);
    const offset = getGrabbedCellOffset(min, grabbedX, grabbedY);
    state.selectedPlacementId = null;
    state.drag = { type: "piece", pieceId, offset, cells };
    state.drag.cutEdges = normalizeCutEdges(piece.cutEdges, min);
    state.drag.source = "material";
    state.draggingPieceId = pieceId;
    state.dropPreview = null;
    renderMaterialBoard();
    showDragGhost(state.drag.cells, state.drag.cutEdges, event.clientX, event.clientY);
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

  function selectLockedPlacement(event, placementId) {
    event.preventDefault();
    const placement = getPlacement(placementId);
    if (!placement || isCurrentTurnPlacement(placement)) return;
    state.selectedPlacementId = state.selectedPlacementId === placementId ? null : placementId;
    state.dropPreview = null;
    render();
  }

  function beginPlacedPieceDrag(event, placementId, grabbedX, grabbedY) {
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
    };
    state.draggingPlacementId = placementId;
    state.dropPreview = null;
    renderMonster();
    showDragGhost(state.drag.cells, state.drag.cutEdges, event.clientX, event.clientY);
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
    piece.cells = placement.cells;
    piece.cutEdges = translateCutEdges(piece.cutEdges, anchorX - currentMin.x, anchorY - currentMin.y);
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
    removePlacementCoverage(placement);
    placement.cells = monsterPlacement.cells;
    placement.cutEdges = translateCutEdges(placement.cutEdges, nextMin.x - currentMin.x, nextMin.y - currentMin.y);
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

    executeMonsterAction();

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
      state.playerHp -= damage;
      addLog(`공격 실행. 기본 ${monster.baseAttack} + 공격 표식 ${attackIcons} = ${damage} 피해.`);
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
        });
        return;
      }

      components.forEach((cells, index) => {
        const componentKeys = new Set(cells.map((cell) => key(cell.x, cell.y)));
        nextPieces.push({
          id: index === 0 ? piece.id : state.nextPieceId,
          cells,
          cutEdges: keepCutEdgesForCells(piece.cutEdges, componentKeys),
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
      placement.cutEdges = keepCutEdgesForCells(placement.cutEdges, new Set(placement.cells.map((cell) => key(cell.x, cell.y))));
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

  function showDragGhost(cells, cutEdges, x, y) {
    els.dragGhost.className = "drag-ghost";
    els.dragGhost.innerHTML = "";
    els.dragGhost.append(renderBoardPieceGrid(cells, cutEdges));
    moveDragGhost(x, y);
  }

  function showKnifeGhost(index, x, y) {
    const knife = state.knives[index];
    const type = KNIFE_TYPES[knife.type];
    const el = document.createElement("div");
    el.className = `knife-drag-ghost ${type.orientation}`;
    el.textContent = type.label;
    if (type.orientation === "h") {
      el.style.width = lengthSize(type.length);
    } else {
      el.style.height = lengthSize(type.length);
    }
    els.dragGhost.className = "drag-ghost knife-ghost";
    els.dragGhost.innerHTML = "";
    els.dragGhost.append(el);
    moveKnifeGhost(x, y);
  }

  function moveDragGhost(x, y) {
    const cell = getMaterialCellSize();
    const step = cell + BOARD_GAP;
    const dragOffset = state.drag?.type === "piece" ? state.drag.offset : { x: 0, y: 0 };
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

  function renderBoardPieceGrid(cells, cutEdges = new Set()) {
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
        if (!occupied.has(key(x, y))) cell.classList.add("empty");
        grid.append(cell);
      }
    }

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
      piece.cutEdges = keepCutEdgesForCells(piece.cutEdges, new Set(piece.cells.map((item) => key(item.x, item.y))));
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

  function showStageClear() {
    const isFinal = state.stageIndex === monsters.length - 1;
    state.resultMode = isFinal ? "complete" : "stage";
    els.resultEyebrow.textContent = isFinal ? "RUN CLEAR" : "STAGE CLEAR";
    els.resultTitle.textContent = isFinal ? "모든 몬스터 포장 완료" : "몬스터 포장 완료";
    els.resultText.textContent = isFinal
      ? "한 마리씩 전부 덮는 퍼즐 전투를 클리어했다."
      : "다음 몬스터로 넘어간다. 남은 체력은 일부 회복된다.";
    els.resultButton.textContent = isFinal ? "다시 시작" : "다음 몬스터";
    els.overlay.classList.remove("hidden");
  }

  function showLoss(title, text) {
    state.resultMode = "loss";
    els.resultEyebrow.textContent = "DEFEAT";
    els.resultTitle.textContent = title;
    els.resultText.textContent = text;
    els.resultButton.textContent = "다시 시작";
    els.overlay.classList.remove("hidden");
  }

  function hideResult() {
    els.overlay.classList.add("hidden");
  }

  function handleResultButton() {
    if (state.resultMode === "stage") {
      state.playerHp = Math.min(MAX_HP, state.playerHp + 6);
      startStage(state.stageIndex + 1);
      return;
    }
    startGame();
  }

  function handleCutButton() {
    if (state.resultMode) return;
    if (getPlacement(state.selectedPlacementId)) {
      recoverSelectedPlacement();
      return;
    }
    applyCuts();
  }

  function handleNewBoard() {
    if (state.resultMode) return;
    finishPlayerTurn({ discardMaterial: true, refillBoard: true });
  }

  function handleEndTurn() {
    if (state.resultMode) return;
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
  els.resultButton.addEventListener("click", handleResultButton);
  window.addEventListener("resize", scheduleResponsiveRender);
  window.visualViewport?.addEventListener("resize", scheduleResponsiveRender);

  startGame();
})();
