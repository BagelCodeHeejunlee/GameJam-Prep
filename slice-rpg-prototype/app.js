(() => {
  window.scrollTo(0, 0);

  const ICONS = {
    attack: { label: "공격", mark: "공", className: "icon-attack" },
    heal: { label: "회복", mark: "회", className: "icon-heal" },
    defense: { label: "방어", mark: "갑", className: "icon-defense" },
    special: { label: "특수", mark: "특", className: "icon-special" },
  };

  const ACTIONS = {
    attack: { title: "공격" },
    heal: { title: "회복" },
    defense: { title: "갑피 전개" },
    special: { title: "특수 공격" },
  };

  const KNIVES = [
    { id: "h2", label: "가로 2", cells: [p(0, 0), p(1, 0)] },
    { id: "h3", label: "가로 3", cells: [p(0, 0), p(1, 0), p(2, 0)] },
    { id: "h4", label: "가로 4", cells: [p(0, 0), p(1, 0), p(2, 0), p(3, 0)] },
    { id: "v2", label: "세로 2", cells: [p(0, 0), p(0, 1)] },
    { id: "v3", label: "세로 3", cells: [p(0, 0), p(0, 1), p(0, 2)] },
    { id: "v4", label: "세로 4", cells: [p(0, 0), p(0, 1), p(0, 2), p(0, 3)] },
  ];

  const STASH_LIMIT = 2;
  const MAX_HP = 24;

  const monsters = [
    {
      name: "철갑 고블린",
      sub: "갑피를 먼저 막아라",
      cols: 5,
      rows: 5,
      baseAttack: 2,
      actions: ["attack", "defense", "attack", "heal", "special"],
      knifeHands: [
        ["h3", "v3", "h2"],
        ["h4", "v2", "h3"],
        ["v4", "h2", "v3"],
      ],
      material: { cols: 5, rows: 4, holes: [] },
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
      knifeHands: [
        ["v3", "h2", "v2"],
        ["h3", "v4", "h2"],
        ["h4", "v2", "v3"],
      ],
      material: { cols: 5, rows: 5, holes: [key(0, 0), key(4, 0), key(0, 4), key(4, 4)] },
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
      knifeHands: [
        ["h4", "v3", "h2"],
        ["v4", "h3", "v2"],
        ["h2", "v3", "h3"],
      ],
      material: { cols: 5, rows: 5, holes: [] },
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
          addLog(`오우거가 재료판을 짓눌러 ${spoiled}칸을 못 쓰게 만들었다.`);
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
    knifeLimitLabel: document.querySelector("#knifeLimitLabel"),
    monsterSub: document.querySelector("#monsterSub"),
    monsterName: document.querySelector("#monsterName"),
    completionLabel: document.querySelector("#completionLabel"),
    completionFill: document.querySelector("#completionFill"),
    actionCard: document.querySelector("#actionCard"),
    monsterGrid: document.querySelector("#monsterGrid"),
    knifeRack: document.querySelector("#knifeRack"),
    materialGrid: document.querySelector("#materialGrid"),
    knifeHint: document.querySelector("#knifeHint"),
    pieceSizeLabel: document.querySelector("#pieceSizeLabel"),
    piecePreview: document.querySelector("#piecePreview"),
    cancelPieceButton: document.querySelector("#cancelPieceButton"),
    stashPieceButton: document.querySelector("#stashPieceButton"),
    stashCount: document.querySelector("#stashCount"),
    stashSlots: document.querySelector("#stashSlots"),
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
    material: new Map(),
    materialCols: 5,
    materialRows: 4,
    selectedKnifeId: null,
    hoverMaterialKey: null,
    currentPiece: null,
    selectedStashIndex: null,
    stash: [],
    blocked: new Set(),
    coverOrder: [],
    log: [],
    resultMode: null,
    drag: null,
  };

  function p(x, y) {
    return { x, y };
  }

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

  function getKnife(id) {
    return KNIVES.find((knife) => knife.id === id);
  }

  function currentMonster() {
    return monsters[state.stageIndex];
  }

  function currentAction() {
    const monster = currentMonster();
    return monster.actions[state.actionIndex % monster.actions.length];
  }

  function currentKnifeIds() {
    const monster = currentMonster();
    return monster.knifeHands[(state.turn - 1) % monster.knifeHands.length];
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
    state.material = new Map();
    state.selectedKnifeId = null;
    state.hoverMaterialKey = null;
    state.currentPiece = null;
    state.selectedStashIndex = null;
    state.stash = [];
    state.blocked = new Set();
    state.coverOrder = [];
    state.log = [];
    state.resultMode = null;
    state.drag = null;

    monster.cells.forEach((cell) => {
      state.monsterCells.set(key(cell.x, cell.y), {
        x: cell.x,
        y: cell.y,
        icon: cell.icon,
        covered: false,
      });
    });

    state.materialCols = monster.material.cols;
    state.materialRows = monster.material.rows;
    const holes = new Set(monster.material.holes);
    for (let y = 0; y < state.materialRows; y += 1) {
      for (let x = 0; x < state.materialCols; x += 1) {
        const cellKey = key(x, y);
        state.material.set(cellKey, holes.has(cellKey) ? "missing" : "available");
      }
    }

    addLog(`${monster.name} 등장. 칼을 재료 위에 놓아 블록을 만들고 몸 전체를 덮어라.`);
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
    renderKnifeRack();
    renderMaterial();
    renderCurrentPiece();
    renderStash();
    renderLog();
    renderButtons();
  }

  function renderStatus() {
    const monster = currentMonster();
    const covered = coveredCount();
    const total = state.monsterCells.size;
    const selectedKnife = state.selectedKnifeId ? getKnife(state.selectedKnifeId) : null;
    els.stageLabel.textContent = `${state.stageIndex + 1} / ${monsters.length}`;
    els.hpLabel.textContent = `${Math.max(0, state.playerHp)} / ${MAX_HP}`;
    els.materialLabel.textContent = `${availableMaterialCount()} / ${usableMaterialTotal()}`;
    els.knifeLimitLabel.textContent = selectedKnife ? selectedKnife.label : `${currentKnifeIds().length}개`;
    els.monsterSub.textContent = monster.sub;
    els.monsterName.textContent = monster.name;
    els.completionLabel.textContent = `${covered} / ${total}`;
    els.completionFill.style.width = `${(covered / total) * 100}%`;
  }

  function renderActionCard() {
    const action = currentAction();
    const meta = ACTIONS[action];
    const attackIcons = uncoveredIconCount("attack");
    const healIcons = uncoveredIconCount("heal");
    const defenseIcons = uncoveredIconCount("defense");
    const specialIcons = uncoveredIconCount("special");
    const armorBlocks = action === "defense" ? chooseArmorBlocks() : [];
    const healTargets = action === "heal" ? chooseHealTargets(healIcons) : [];
    const monster = currentMonster();

    const descriptions = {
      attack: `기본 공격력 ${monster.baseAttack} + 아직 덮이지 않은 공격 표식 수만큼 피해를 준다.`,
      heal: "아직 덮이지 않은 회복 표식 수만큼, 최근에 덮인 일반 칸을 다시 비운다.",
      defense: "아직 덮이지 않은 방어 표식마다 주변 빈칸에 갑피를 만든다. 갑피는 다음 턴 배치 불가.",
      special: "몬스터 고유 행동. 특수 표식을 덮을수록 효과가 약해진다.",
    };

    const chips = {
      attack: [`기본 ${monster.baseAttack}`, `공격 표식 ${attackIcons}`, `피해 ${monster.baseAttack + attackIcons}`],
      heal: [`회복 표식 ${healIcons}`, `해제 예정 ${healTargets.length}`],
      defense: [`방어 표식 ${defenseIcons}`, `갑피 예정 ${armorBlocks.length}`],
      special: [`특수 표식 ${specialIcons}`],
    };

    const blockNotice = state.blocked.size
      ? `<p>현재 갑피 ${state.blocked.size}칸은 이번 턴 동안 배치할 수 없다.</p>`
      : "";

    els.actionCard.innerHTML = `
      <strong>${meta.title}</strong>
      <p>${descriptions[action]}</p>
      ${blockNotice}
      <div class="chips">${chips[action].map((chip) => `<span class="chip">${chip}</span>`).join("")}</div>
    `;
  }

  function renderMonster() {
    const monster = currentMonster();
    const armorPreview = new Set(currentAction() === "defense" ? chooseArmorBlocks() : []);
    const healPreview = new Set(currentAction() === "heal" ? chooseHealTargets(uncoveredIconCount("heal")) : []);
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
        button.title = "블록 배치";
        if (monsterCell.covered) button.classList.add("covered");
        if (state.blocked.has(cellKey)) button.classList.add("blocked");
        if (armorPreview.has(cellKey)) button.classList.add("preview-block");
        if (healPreview.has(cellKey)) button.classList.add("heal-target");
        if (state.currentPiece && canPlaceAt(x, y)) button.classList.add("can-place");

        if (monsterCell.icon) {
          const icon = document.createElement("span");
          const iconMeta = ICONS[monsterCell.icon];
          icon.className = `cell-icon ${iconMeta.className}`;
          icon.textContent = iconMeta.mark;
          icon.title = iconMeta.label;
          button.append(icon);
        }

        button.addEventListener("click", () => tryPlaceAt(x, y));
        els.monsterGrid.append(button);
      }
    }
  }

  function renderKnifeRack() {
    els.knifeRack.innerHTML = "";

    currentKnifeIds().forEach((knifeId) => {
      const knife = getKnife(knifeId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "knife-card";
      button.dataset.knifeId = knife.id;
      button.title = `${knife.label} 칼`;
      if (state.selectedKnifeId === knife.id) button.classList.add("selected");

      const label = document.createElement("span");
      label.textContent = knife.label;
      button.append(renderPieceGrid(knife.cells, "knife"));
      button.append(label);

      button.addEventListener("click", () => selectKnife(knife.id));
      button.addEventListener("pointerdown", (event) => beginDrag(event, { type: "knife", knifeId: knife.id }));
      els.knifeRack.append(button);
    });
  }

  function renderMaterial() {
    const preview = new Set(getKnifePreviewKeys());
    els.materialGrid.style.gridTemplateColumns = `repeat(${state.materialCols}, var(--small-cell))`;
    els.materialGrid.innerHTML = "";

    for (let y = 0; y < state.materialRows; y += 1) {
      for (let x = 0; x < state.materialCols; x += 1) {
        const cellKey = key(x, y);
        const status = state.material.get(cellKey);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "material-cell";
        button.dataset.key = cellKey;
        button.title = "칼 놓기";

        if (status === "missing") {
          button.classList.add("used");
          button.disabled = true;
        } else if (status === "used") {
          button.classList.add("used");
          button.disabled = true;
        } else if (status === "spoiled") {
          button.classList.add("spoiled");
          button.disabled = true;
        } else if (preview.has(cellKey)) {
          button.classList.add(canCutAt(x, y) ? "cut-preview" : "bad-preview");
        }

        button.addEventListener("click", () => {
          if (state.selectedKnifeId) tryCutAt(x, y, state.selectedKnifeId);
        });
        button.addEventListener("pointerenter", () => {
          state.hoverMaterialKey = cellKey;
          renderMaterial();
        });
        els.materialGrid.append(button);
      }
    }

    const selectedKnife = state.selectedKnifeId ? getKnife(state.selectedKnifeId) : null;
    els.knifeHint.textContent = selectedKnife
      ? `${selectedKnife.label} 칼을 재료판에 놓을 위치를 고르세요.`
      : "칼을 드래그하거나 선택한 뒤 재료판에 놓으세요.";
  }

  function renderCurrentPiece() {
    const size = state.currentPiece ? state.currentPiece.cells.length : 0;
    els.pieceSizeLabel.textContent = `${size}칸`;

    if (!state.currentPiece) {
      els.piecePreview.className = "piece-preview empty";
      els.piecePreview.textContent = "칼을 놓아 블록을 자르세요";
      delete els.piecePreview.dataset.pieceSource;
      return;
    }

    els.piecePreview.className = "piece-preview draggable-piece";
    els.piecePreview.textContent = "";
    els.piecePreview.dataset.pieceSource = "current";
    els.piecePreview.append(renderPieceGrid(state.currentPiece.cells, "piece"));
    els.piecePreview.addEventListener("pointerdown", (event) => beginDrag(event, { type: "piece", source: "current" }));
  }

  function renderStash() {
    els.stashCount.textContent = `${state.stash.length} / ${STASH_LIMIT}`;
    els.stashSlots.innerHTML = "";

    for (let i = 0; i < STASH_LIMIT; i += 1) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "stash-slot";
      slot.title = "보관 블록 선택";

      if (state.stash[i]) {
        slot.dataset.stashIndex = String(i);
        slot.append(renderPieceGrid(state.stash[i].cells, "piece"));
        slot.addEventListener("click", () => selectStashPiece(i));
        slot.addEventListener("pointerdown", (event) => beginDrag(event, { type: "piece", source: "stash", index: i }));
      } else {
        slot.textContent = "빈 칸";
        slot.disabled = true;
      }

      if (state.selectedStashIndex === i) slot.classList.add("selected");
      els.stashSlots.append(slot);
    }
  }

  function renderPieceGrid(cells, mode = "piece") {
    const normalized = normalizeCells(cells);
    const maxX = Math.max(...normalized.map((cell) => cell.x));
    const maxY = Math.max(...normalized.map((cell) => cell.y));
    const occupied = new Set(normalized.map((cell) => key(cell.x, cell.y)));
    const grid = document.createElement("div");
    grid.className = `piece-mini-grid ${mode === "knife" ? "knife-mini-grid" : ""}`;
    const trackSize = mode === "knife" ? 10 : 12;
    grid.style.gridTemplateColumns = `repeat(${maxX + 1}, ${trackSize}px)`;

    for (let y = 0; y <= maxY; y += 1) {
      for (let x = 0; x <= maxX; x += 1) {
        const cell = document.createElement("span");
        cell.className = `piece-mini-cell ${mode === "knife" ? "knife-mini-cell" : ""}`;
        if (!occupied.has(key(x, y))) cell.classList.add("empty");
        grid.append(cell);
      }
    }

    return grid;
  }

  function renderLog() {
    els.battleLog.innerHTML = state.log.map((line) => `<p>${line}</p>`).join("");
  }

  function renderButtons() {
    els.cancelPieceButton.disabled = state.currentPiece === null;
    els.stashPieceButton.disabled =
      state.currentPiece === null ||
      state.currentPiece.origin !== "cut" ||
      state.stash.length >= STASH_LIMIT;
  }

  function selectKnife(knifeId) {
    if (state.currentPiece) {
      addLog("현재 블록을 먼저 배치하거나 보관해야 새 칼을 쓸 수 있다.");
      render();
      return;
    }
    state.selectedKnifeId = state.selectedKnifeId === knifeId ? null : knifeId;
    render();
  }

  function getKnifePreviewKeys() {
    if (!state.selectedKnifeId || !state.hoverMaterialKey) return [];
    const anchor = fromKey(state.hoverMaterialKey);
    return getKnife(state.selectedKnifeId).cells.map((cell) => key(anchor.x + cell.x, anchor.y + cell.y));
  }

  function tryCutAt(anchorX, anchorY, knifeId) {
    if (state.currentPiece) {
      addLog("현재 블록을 먼저 배치하거나 보관해야 한다.");
      render();
      return;
    }

    if (!canCutAt(anchorX, anchorY, knifeId)) {
      addLog("칼이 재료 밖으로 나가거나 이미 빈 칸을 지난다.");
      render();
      return;
    }

    const knife = getKnife(knifeId);
    const sourceKeys = knife.cells.map((cell) => key(anchorX + cell.x, anchorY + cell.y));
    sourceKeys.forEach((cellKey) => state.material.set(cellKey, "used"));
    state.currentPiece = {
      cells: cloneCells(knife.cells),
      origin: "cut",
    };
    state.selectedKnifeId = null;
    state.hoverMaterialKey = null;
    addLog(`${knife.label} 칼로 ${sourceKeys.length}칸 블록을 잘랐다. 블록을 드래그해 몬스터에 놓을 수 있다.`);
    render();
  }

  function canCutAt(anchorX, anchorY, knifeId = state.selectedKnifeId) {
    if (!knifeId) return false;
    const knife = getKnife(knifeId);
    return knife.cells.every((cell) => {
      const cellKey = key(anchorX + cell.x, anchorY + cell.y);
      return state.material.get(cellKey) === "available";
    });
  }

  function cancelCurrentPiece() {
    if (!state.currentPiece) return;

    if (state.currentPiece.origin === "stash") {
      state.currentPiece = null;
      state.selectedStashIndex = null;
      addLog("보관 블록 선택을 취소했다.");
      render();
      return;
    }

    const size = state.currentPiece.cells.length;
    state.currentPiece = null;
    state.playerHp -= 1;
    addLog(`${size}칸 블록을 버렸다. 재료 낭비로 1 피해를 받았다.`);
    finishPlayerTurn();
  }

  function stashCurrentPiece() {
    if (!state.currentPiece || state.currentPiece.origin !== "cut") return;
    if (state.stash.length >= STASH_LIMIT) return;

    state.stash.push({ cells: cloneCells(state.currentPiece.cells) });
    state.currentPiece = null;
    state.selectedStashIndex = null;
    addLog("블록을 보관했다. 이번 턴은 배치 없이 넘어간다.");
    finishPlayerTurn();
  }

  function selectStashPiece(index) {
    const piece = state.stash[index];
    if (!piece) return;
    state.currentPiece = {
      cells: cloneCells(piece.cells),
      origin: "stash",
      stashIndex: index,
    };
    state.selectedStashIndex = index;
    state.selectedKnifeId = null;
    render();
  }

  function tryPlaceAt(anchorX, anchorY) {
    if (!state.currentPiece) {
      addLog("먼저 재료 블록을 자르거나 보관함 블록을 선택해야 한다.");
      render();
      return;
    }

    if (!canPlaceAt(anchorX, anchorY)) {
      flashInvalid(anchorX, anchorY);
      addLog("그 위치에는 블록이 맞지 않는다.");
      return;
    }

    const mapped = mappedPieceCells(anchorX, anchorY);
    if (state.currentPiece.origin === "stash") {
      state.stash.splice(state.currentPiece.stashIndex, 1);
    }

    mapped.forEach((cell) => {
      const cellKey = key(cell.x, cell.y);
      const monsterCell = state.monsterCells.get(cellKey);
      monsterCell.covered = true;
      state.coverOrder = state.coverOrder.filter((coveredKey) => coveredKey !== cellKey);
      state.coverOrder.push(cellKey);
    });

    addLog(`${mapped.length}칸 블록을 옮겨 놓았다.`);
    state.currentPiece = null;
    state.selectedStashIndex = null;

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
    state.selectedKnifeId = null;
    state.hoverMaterialKey = null;

    if (remainingCoverPotential() < uncoveredCount()) {
      render();
      showLoss("재료가 부족하다.", "남은 블록 수로는 몬스터의 모든 칸을 덮을 수 없다.");
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
        const monsterCell = state.monsterCells.get(cellKey);
        monsterCell.covered = false;
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

  function mappedPieceCells(anchorX, anchorY) {
    return state.currentPiece.cells.map((cell) => ({
      x: anchorX + cell.x,
      y: anchorY + cell.y,
    }));
  }

  function canPlaceAt(anchorX, anchorY) {
    if (!state.currentPiece) return false;
    return mappedPieceCells(anchorX, anchorY).every((cell) => {
      const cellKey = key(cell.x, cell.y);
      const monsterCell = state.monsterCells.get(cellKey);
      return monsterCell && !monsterCell.covered && !state.blocked.has(cellKey);
    });
  }

  function flashInvalid(anchorX, anchorY) {
    const cell = els.monsterGrid.querySelector(`[data-key="${key(anchorX, anchorY)}"]`);
    if (!cell) return;
    cell.classList.add("invalid-flash");
    window.setTimeout(() => cell.classList.remove("invalid-flash"), 220);
  }

  function beginDrag(event, payload) {
    if (event.button !== undefined && event.button !== 0) return;
    if (payload.type === "knife" && state.currentPiece) {
      addLog("현재 블록을 먼저 배치하거나 보관해야 새 칼을 쓸 수 있다.");
      render();
      return;
    }
    if (payload.type === "piece" && payload.source === "current" && !state.currentPiece) return;
    if (payload.type === "piece" && payload.source === "stash" && !state.stash[payload.index]) return;

    event.preventDefault();
    const cells = payload.type === "knife"
      ? getKnife(payload.knifeId).cells
      : payload.source === "stash"
        ? state.stash[payload.index].cells
        : state.currentPiece.cells;

    state.drag = {
      ...payload,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
    };

    showDragGhost(cells, event.clientX, event.clientY, payload.type);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }

  function onPointerMove(event) {
    if (!state.drag) return;
    const dx = Math.abs(event.clientX - state.drag.startX);
    const dy = Math.abs(event.clientY - state.drag.startY);
    if (dx + dy > 5) state.drag.moved = true;
    moveDragGhost(event.clientX, event.clientY);
  }

  function onPointerUp(event) {
    window.removeEventListener("pointermove", onPointerMove);
    hideDragGhost();
    const drag = state.drag;
    state.drag = null;
    if (!drag || !drag.moved) return;

    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;

    if (drag.type === "knife") {
      const materialCell = target.closest("#materialGrid .material-cell");
      if (!materialCell) return;
      const { x, y } = fromKey(materialCell.dataset.key);
      tryCutAt(x, y, drag.knifeId);
      return;
    }

    const monsterCell = target.closest("#monsterGrid .monster-cell");
    if (!monsterCell || !monsterCell.dataset.key) return;
    if (drag.source === "stash") selectStashPiece(drag.index);
    const { x, y } = fromKey(monsterCell.dataset.key);
    tryPlaceAt(x, y);
  }

  function showDragGhost(cells, x, y, type) {
    els.dragGhost.className = `drag-ghost ${type === "knife" ? "knife-ghost" : ""}`;
    els.dragGhost.innerHTML = "";
    els.dragGhost.append(renderPieceGrid(cells, type === "knife" ? "knife" : "piece"));
    moveDragGhost(x, y);
  }

  function moveDragGhost(x, y) {
    els.dragGhost.style.transform = `translate(${x + 12}px, ${y + 12}px)`;
  }

  function hideDragGhost() {
    els.dragGhost.className = "drag-ghost hidden";
    els.dragGhost.innerHTML = "";
  }

  function normalizeCells(cells) {
    const minX = Math.min(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    return cells
      .map((cell) => ({ x: cell.x - minX, y: cell.y - minY }))
      .sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function cloneCells(cells) {
    return cells.map((cell) => ({ x: cell.x, y: cell.y }));
  }

  function chooseArmorBlocks() {
    const blocks = [];
    const used = new Set();
    const defenseCells = [...state.monsterCells.values()].filter(
      (cell) => cell.icon === "defense" && !cell.covered,
    );

    defenseCells.forEach((cell) => {
      const ordinary = neighbors(cell.x, cell.y).find((cellKey) => {
        const target = state.monsterCells.get(cellKey);
        return target && !target.covered && !target.icon && !used.has(cellKey);
      });
      const fallback = neighbors(cell.x, cell.y).find((cellKey) => {
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
    const recent = [...state.coverOrder].reverse();

    recent.forEach((cellKey) => {
      const cell = state.monsterCells.get(cellKey);
      if (targets.length < amount && cell && cell.covered && !cell.icon) {
        targets.push(cellKey);
      }
    });

    if (targets.length < amount) {
      [...state.monsterCells.entries()].forEach(([cellKey, cell]) => {
        if (targets.length < amount && cell.covered && !cell.icon && !targets.includes(cellKey)) {
          targets.push(cellKey);
        }
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
    const available = [...state.material.entries()]
      .filter(([, status]) => status === "available")
      .map(([cellKey]) => cellKey)
      .reverse()
      .slice(0, amount);
    available.forEach((cellKey) => state.material.set(cellKey, "spoiled"));
    return available.length;
  }

  function neighbors(x, y) {
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
    return [...state.material.values()].filter((status) => status === "available").length;
  }

  function usableMaterialTotal() {
    return [...state.material.values()].filter((status) => status !== "missing").length;
  }

  function remainingCoverPotential() {
    const stashCells = state.stash.reduce((sum, piece) => sum + piece.cells.length, 0);
    const currentCells = state.currentPiece ? state.currentPiece.cells.length : 0;
    return availableMaterialCount() + stashCells + currentCells;
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
  els.cancelPieceButton.addEventListener("click", cancelCurrentPiece);
  els.stashPieceButton.addEventListener("click", stashCurrentPiece);
  els.resultButton.addEventListener("click", handleResultButton);

  startGame();
})();
