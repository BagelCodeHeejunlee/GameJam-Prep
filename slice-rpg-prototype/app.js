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
  const DRAG_GHOST_MARGIN = 8;
  const DRAG_GHOST_LIFT = 76;

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
    monsterGrid: document.querySelector("#monsterGrid"),
    materialBoard: document.querySelector("#materialBoard"),
    materialGrid: document.querySelector("#materialGrid"),
    cutLayer: document.querySelector("#cutLayer"),
    knifeLayer: document.querySelector("#knifeLayer"),
    cutButton: document.querySelector("#cutButton"),
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
    playerHp: MAX_HP,
    monsterCells: new Map(),
    materialCols: 5,
    materialRows: 4,
    materialOrigin: { x: 0, y: 0 },
    materialPieces: [],
    missingCells: new Set(),
    spoiledCells: new Set(),
    knives: [],
    blocked: new Set(),
    coverOrder: [],
    log: [],
    resultMode: null,
    nextPieceId: 1,
    initialMaterialTotal: 0,
    draggingPieceId: null,
    dropPreview: null,
    drag: null,
  };

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
    state.blocked = new Set();
    state.coverOrder = [];
    state.log = [];
    state.resultMode = null;
    state.nextPieceId = 1;
    state.draggingPieceId = null;
    state.dropPreview = null;
    state.drag = null;

    monster.cells.forEach((cell) => {
      state.monsterCells.set(key(cell.x, cell.y), {
        x: cell.x,
        y: cell.y,
        icon: cell.icon,
        covered: false,
      });
    });

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

    addLog(`${monster.name} 등장. 칼을 움직여 절단선을 만들고 분리된 재료를 옮겨라.`);
    hideResult();
    render();
  }

  function addLog(text) {
    state.log.unshift(text);
    state.log = state.log.slice(0, 8);
  }

  function render() {
    renderStatus();
    renderActionCard();
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
    const title = { attack: "공격", heal: "회복", defense: "갑피 전개", special: "특수 공격" }[action];
    const descriptions = {
      attack: `기본 ${monster.baseAttack} + 남은 공격 표식 수만큼 피해.`,
      heal: "남은 회복 표식 수만큼 최근 일반 칸을 다시 비움.",
      defense: "남은 방어 표식마다 다음 턴 갑피 칸 생성.",
      special: "몬스터 고유 행동. 특수 표식을 덮으면 약화.",
    };
    const chips = {
      attack: [`피해 ${monster.baseAttack + attackIcons}`, `공격 ${attackIcons}`],
      heal: [`회복 ${healIcons}`, `해제 ${healTargets.length}`],
      defense: [`방어 ${defenseIcons}`, `갑피 ${armorBlocks.length}`],
      special: [`특수 ${specialIcons}`],
    };
    const blockNotice = state.blocked.size
      ? `<p>갑피 ${state.blocked.size}칸은 이번 턴 배치 불가.</p>`
      : "";

    els.actionCard.innerHTML = `
      <strong>${title}</strong>
      <p>${descriptions[action]}</p>
      ${blockNotice}
      <div class="chips">${chips[action].map((chip) => `<span class="chip">${chip}</span>`).join("")}</div>
    `;
  }

  function renderMonster() {
    const monster = currentMonster();
    const armorPreview = new Set(currentAction() === "defense" ? chooseArmorBlocks() : []);
    const healPreview = new Set(currentAction() === "heal" ? chooseHealTargets(uncoveredIconCount("heal")) : []);
    const dropPreview = state.dropPreview?.zone === "monster" ? state.dropPreview : null;
    const dropPreviewCells = new Set(dropPreview?.cells || []);
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
        if (monsterCell.covered) button.classList.add("covered");
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
    renderKnives();
    els.knifeHint.textContent = "칼은 격자선 사이에서만 움직입니다. 자르기 후 분리된 재료를 드래그하세요.";
  }

  function renderCutMarks() {
    const rendered = new Set();
    state.materialPieces.forEach((piece) => {
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

  function boardPos(value) {
    const cell = getMaterialCellSize();
    return `${getBoardPad() + value * (cell + BOARD_GAP)}px`;
  }

  function knifeLeft(knife) {
    const type = KNIFE_TYPES[knife.type];
    const base = parseFloat(boardPos(knife.x));
    return `${base - (type.orientation === "v" ? getKnifeThick() / 2 : 0)}px`;
  }

  function knifeTop(knife) {
    const type = KNIFE_TYPES[knife.type];
    const base = parseFloat(boardPos(knife.y));
    return `${base - (type.orientation === "h" ? getKnifeThick() / 2 : 0)}px`;
  }

  function lengthSize(length) {
    const cell = getMaterialCellSize();
    return `${length * cell + Math.max(0, length - 1) * BOARD_GAP}px`;
  }

  function beginKnifeDrag(event, index) {
    event.preventDefault();
    state.drag = { type: "knife", index };
    window.addEventListener("pointermove", onKnifeMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }

  function onKnifeMove(event) {
    if (!state.drag || state.drag.type !== "knife") return;
    moveKnifeToPoint(state.drag.index, event.clientX, event.clientY);
    renderMaterialBoard();
  }

  function moveKnifeToPoint(index, clientX, clientY) {
    const knife = state.knives[index];
    const type = KNIFE_TYPES[knife.type];
    const rect = els.materialBoard.getBoundingClientRect();
    const cell = getMaterialCellSize();
    const step = cell + BOARD_GAP;
    const localX = clientX - rect.left - getBoardPad();
    const localY = clientY - rect.top - getBoardPad();
    const span = type.length * cell + Math.max(0, type.length - 1) * BOARD_GAP;

    if (type.orientation === "h") {
      knife.x = clamp(Math.round((localX - span / 2) / step), 0, state.materialCols - type.length);
      knife.y = clamp(Math.round(localY / step), 1, state.materialRows - 1);
    } else {
      knife.x = clamp(Math.round(localX / step), 1, state.materialCols - 1);
      knife.y = clamp(Math.round((localY - span / 2) / step), 0, state.materialRows - type.length);
    }
  }

  function onPointerUp() {
    window.removeEventListener("pointermove", onKnifeMove);
    hideDragGhost();
    state.drag = null;
    render();
  }

  function applyCuts() {
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
    addLog(added ? `절단선 ${added}개를 냈다. ${separated ? `${separated}개 조각이 새로 분리됐다.` : "아직 흠집만 남아 있다."}` : "새로 잘린 선이 없다.");
    render();
  }

  function beginPieceDrag(event, pieceId, grabbedX, grabbedY) {
    const piece = getPiece(pieceId);
    if (!piece) return;
    event.preventDefault();
    const min = minCell(piece.cells);
    const offset = { x: grabbedX - min.x, y: grabbedY - min.y };
    state.drag = { type: "piece", pieceId, offset, cells: normalizeCells(piece.cells) };
    state.draggingPieceId = pieceId;
    state.dropPreview = null;
    renderMaterialBoard();
    showDragGhost(state.drag.cells, event.clientX, event.clientY);
    updateDropPreview(event.clientX, event.clientY);
    window.addEventListener("pointermove", onPieceMove);
    window.addEventListener("pointerup", onPieceUp, { once: true });
  }

  function onPieceMove(event) {
    if (!state.drag || state.drag.type !== "piece") return;
    moveDragGhost(event.clientX, event.clientY);
    updateDropPreview(event.clientX, event.clientY);
  }

  function onPieceUp(event) {
    window.removeEventListener("pointermove", onPieceMove);
    const drag = state.drag;
    const dropPreview = getDropPreview(event.clientX, event.clientY);
    state.drag = null;
    state.draggingPieceId = null;
    state.dropPreview = null;
    hideDragGhost();
    if (!drag) return;

    if (dropPreview?.zone === "monster") {
      tryPlacePieceOnMonster(drag.pieceId, dropPreview.anchorX, dropPreview.anchorY);
      return;
    }

    if (dropPreview?.zone === "material") {
      tryMovePieceOnBoard(drag.pieceId, dropPreview.anchorX, dropPreview.anchorY);
      return;
    }

    render();
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
      state.coverOrder = state.coverOrder.filter((coveredKey) => coveredKey !== cellKey);
      state.coverOrder.push(cellKey);
    });
    state.materialPieces = state.materialPieces.filter((pieceItem) => pieceItem.id !== pieceId);
    addLog(`${placement.cells.length}칸 조각을 몬스터에 채웠다.`);

    if (isMonsterComplete()) {
      render();
      showStageClear();
      return;
    }

    finishPlayerTurn();
  }

  function finishPlayerTurn() {
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

    if (remainingCoverPotential() < uncoveredCount()) {
      render();
      showLoss("재료가 부족하다.", "남은 재료 칸으로는 몬스터의 모든 칸을 덮을 수 없다.");
      return;
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
      targets.forEach((cellKey) => {
        state.monsterCells.get(cellKey).covered = false;
      });
      state.coverOrder = state.coverOrder.filter((cellKey) => !targets.includes(cellKey));
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

  function getMaterialCellSize() {
    const cell = els.materialGrid.querySelector(".material-cell");
    return cell ? cell.getBoundingClientRect().width : 22;
  }

  function getBoardPad() {
    return parseFloat(getComputedStyle(els.materialBoard).getPropertyValue("--board-pad")) || 14;
  }

  function getKnifeThick() {
    return parseFloat(getComputedStyle(els.materialBoard).getPropertyValue("--knife-thick")) || 12;
  }

  function showDragGhost(cells, x, y) {
    els.dragGhost.className = "drag-ghost";
    els.dragGhost.innerHTML = "";
    els.dragGhost.append(renderBoardPieceGrid(cells));
    moveDragGhost(x, y);
  }

  function moveDragGhost(x, y) {
    const rect = els.dragGhost.getBoundingClientRect();
    const right = window.innerWidth - rect.width - DRAG_GHOST_MARGIN;
    const bottom = window.innerHeight - rect.height - DRAG_GHOST_MARGIN;
    let nextX = x + 18;
    let nextY = y - rect.height - DRAG_GHOST_LIFT;

    if (nextY < DRAG_GHOST_MARGIN) nextY = y + 24;
    nextX = clamp(nextX, DRAG_GHOST_MARGIN, Math.max(DRAG_GHOST_MARGIN, right));
    nextY = clamp(nextY, DRAG_GHOST_MARGIN, Math.max(DRAG_GHOST_MARGIN, bottom));
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

  function renderBoardPieceGrid(cells) {
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

    const monsterPoint = getMonsterCellFromPoint(x, y);
    if (monsterPoint) {
      const cell = monsterPoint;
      return buildMonsterDropPreview(state.drag.pieceId, cell.x - state.drag.offset.x, cell.y - state.drag.offset.y, state.drag.cells);
    }

    const materialPoint = getMaterialCellFromPoint(x, y);
    if (materialPoint) {
      const cell = materialPoint;
      return buildMaterialDropPreview(state.drag.pieceId, cell.x - state.drag.offset.x, cell.y - state.drag.offset.y, state.drag.cells);
    }

    return null;
  }

  function buildMaterialDropPreview(pieceId, anchorX, anchorY, normalizedCells) {
    const piece = getPiece(pieceId);
    if (!piece) return null;
    const placement = getBoardPlacement(piece, anchorX, anchorY, normalizedCells);
    return {
      zone: "material",
      anchorX,
      anchorY,
      cells: placement.cells.map((cell) => key(cell.x, cell.y)),
      valid: placement.valid,
    };
  }

  function buildMonsterDropPreview(pieceId, anchorX, anchorY, normalizedCells) {
    const piece = getPiece(pieceId);
    if (!piece) return null;
    const placement = getMonsterPlacement(piece, anchorX, anchorY, normalizedCells);
    return {
      zone: "monster",
      anchorX,
      anchorY,
      cells: placement.cells.map((cell) => key(cell.x, cell.y)),
      valid: placement.valid,
    };
  }

  function getBoardPlacement(piece, anchorX, anchorY, normalizedCells = normalizeCells(piece.cells)) {
    const cells = normalizedCells.map((cell) => ({ x: anchorX + cell.x, y: anchorY + cell.y }));
    const occupied = buildPieceByCell({ skipPieceId: piece.id });
    const valid = cells.every((cell) => {
      const cellKey = key(cell.x, cell.y);
      if (cell.x < 0 || cell.y < 0 || cell.x >= state.materialCols || cell.y >= state.materialRows) return false;
      if (state.missingCells.has(cellKey) || state.spoiledCells.has(cellKey)) return false;
      return !occupied.has(cellKey);
    });
    return { cells, valid };
  }

  function getMonsterPlacement(piece, anchorX, anchorY, normalizedCells = normalizeCells(piece.cells)) {
    const cells = normalizedCells.map((cell) => ({ x: anchorX + cell.x, y: anchorY + cell.y }));
    const valid = cells.every((cell) => {
      const cellKey = key(cell.x, cell.y);
      const monsterCell = state.monsterCells.get(cellKey);
      return monsterCell && !monsterCell.covered && !state.blocked.has(cellKey);
    });
    return { cells, valid };
  }

  function getMaterialCellFromPoint(x, y) {
    return getGridCellFromPoint(x, y, els.materialGrid, state.materialCols, state.materialRows, getMaterialCellSize());
  }

  function getMonsterCellFromPoint(x, y) {
    const monster = currentMonster();
    return getGridCellFromPoint(x, y, els.monsterGrid, monster.cols, monster.rows, getMonsterCellSize());
  }

  function getGridCellFromPoint(x, y, gridEl, cols, rows, cellSize) {
    const rect = gridEl.getBoundingClientRect();
    const localX = x - rect.left;
    const localY = y - rect.top;
    if (localX < -BOARD_GAP || localY < -BOARD_GAP || localX > rect.width + BOARD_GAP || localY > rect.height + BOARD_GAP) return null;

    const step = cellSize + BOARD_GAP;
    return {
      x: clamp(Math.round((localX - cellSize / 2) / step), 0, cols - 1),
      y: clamp(Math.round((localY - cellSize / 2) / step), 0, rows - 1),
    };
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

  function remainingCoverPotential() {
    return availableMaterialCount();
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
      ? "한 마리씩 전부 덮는 퍼즐 전투 프로토타입을 클리어했다."
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

  els.restartButton.addEventListener("click", startGame);
  els.cutButton.addEventListener("click", applyCuts);
  els.resultButton.addEventListener("click", handleResultButton);

  startGame();
})();
