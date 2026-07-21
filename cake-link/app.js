(() => {
  "use strict";

  const Engine = window.CakeLinkEngine;
  const Stages = window.CakeLinkStages;
  const Mechanics = window.CakeLinkMechanics;
  const Motion = window.CakeLinkMotion;
  const CAKES = {
    berry: { name: "딸기", emoji: "🍓", color: "#f07483" },
    blueberry: { name: "블루베리", emoji: "🫐", color: "#8b78c7" },
    lemon: { name: "레몬", emoji: "🍋", color: "#f2c85a" },
    matcha: { name: "말차", emoji: "🍵", color: "#79a86d" },
    choco: { name: "초코", emoji: "🍫", color: "#8b5945" },
    rainbow: { name: "무지개", emoji: "🌈", color: "#dda6d1" },
    mystery: { name: "미스테리", emoji: "?", color: "#c8b8d8" },
  };
  const PIECE_ORDER = [...Engine.CAKE_ORDER, "rainbow"];
  const EMPTY_COLOR = "#eee4d6";
  const RAINBOW_COLORS = ["#ef6678", "#f59d51", "#f4d45d", "#74bd74", "#61aade", "#9577d5"];
  const BEST_KEY = "cakeLink.v1.bestScore";
  const STAGE_KEY = "cakeLink.v1.currentStage";
  const MAX_VISIBLE_ROUTE_CELLS = 5;

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    home: $("#homeScreen"), gameShell: $("#gameShell"), play: $("#playButton"),
    debugReset: $("#debugResetButton"), debugStage: $("#debugStageSelect"),
    homeButton: $("#homeButton"), homeSound: $("#homeSoundButton"),
    guideButton: $("#guideButton"), guide: $("#guideOverlay"),
    guideClose: $("#guideCloseButton"), guidePlay: $("#guidePlayButton"),
    guideCapacityNumber: $("#guideCapacityNumber"), guideCapacityText: $("#guideCapacityText"),
    stageTitle: $("#currentStageTitle"), stageDifficulty: $("#stageDifficulty"),
    stageGimmick: $("#stageGimmickPreview"),
    stageGoalPreview: $("#stageGoalPreview"), goalProgress: $("#goalProgress"),
    movesCounter: $("#movesCounter"), movesRemaining: $("#movesRemaining"),
    board: $("#board"), rack: $("#rack"),
    hint: $("#boardHint"), toast: $("#toast"), sound: $("#soundButton"),
    restart: $("#restartButton"), result: $("#resultOverlay"), retry: $("#retryButton"),
    resultEyebrow: $("#resultEyebrow"), resultTitle: $("#resultTitle"),
    resultMessage: $("#resultMessage"), resultCompleted: $("#resultCompleted"),
    resultScore: $("#resultScore"),
  };

  let currentStage = Stages.getStage(Number(localStorage.getItem(STAGE_KEY) || 1));
  let state;
  let toastTimer;
  let audioContext;
  let sessionId = 0;
  let dragGesture = null;
  let resultAction = "retry";
  const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  function mulberry32(seed) {
    return function random() {
      let value = seed += 0x6D2B79F5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function newState() {
    const random = mulberry32(currentStage.seed);
    const board = Array(Engine.BOARD_SIZE ** 2).fill(null);
    let nextId = 1;
    for (const initial of currentStage.initialPlates) {
      board[initial.index] = plateFromSpec(initial, nextId++);
    }
    return {
      board,
      rack: [], batch: 0, deckIndex: 0, nextId,
      completed: 0, completedByType: {}, score: 0,
      movesRemaining: currentStage.moveLimit, busy: false,
      sound: true, random, activeCells: new Set(), completeCells: new Set(), emptyCells: new Set(),
      transitionCells: new Set(), effectCells: new Map(), mechanics: Mechanics.createRuntime(currentStage),
      best: Number(localStorage.getItem(BEST_KEY) || 0),
    };
  }

  function cloneLayer(layer) {
    return {
      ...layer,
      capacity: layer?.capacity || Stages.stageCapacity?.(currentStage) || Engine.PLATE_CAPACITY,
      pieces: { ...(layer?.pieces || {}) },
    };
  }

  function plateFromSpec(spec, id) {
    const normalized = spec?.pieces ? spec : { pieces: spec || {} };
    return {
      ...normalized,
      id,
      capacity: normalized.capacity || Stages.stageCapacity?.(currentStage) || Engine.PLATE_CAPACITY,
      pieces: { ...(normalized.pieces || {}) },
      ...(normalized.layers ? { layers: normalized.layers.map(cloneLayer) } : {}),
      ...(normalized.hiddenColors ? { hiddenColors: [...normalized.hiddenColors] } : {}),
    };
  }

  function plate(spec) {
    return plateFromSpec(spec, state.nextId++);
  }

  function generatedPlate(slot) {
    if (state.deckIndex < currentStage.openingRack.length) {
      const index = state.deckIndex++;
      const spec = Stages.createOpeningPlateData
        ? Stages.createOpeningPlateData(currentStage, index, state.random)
        : Stages.createPlateData
          ? Stages.createPlateData(currentStage, currentStage.openingRack[index], currentStage.openingModifiers?.[index], state.random)
          : { pieces: currentStage.openingRack[index] };
      return plate(spec);
    }
    const spec = Stages.createWeightedPlateData
      ? Stages.createWeightedPlateData(currentStage, state.random)
      : { pieces: Stages.createWeightedPlate(currentStage, state.random) };
    state.deckIndex += 1;
    return plate(spec);
  }

  function refillRack(announce = true) {
    state.batch += 1;
    state.rack = [0, 1, 2].map((slot) => generatedPlate(slot));
    if (announce) showToast(`${state.batch}번째 판 묶음이 도착했어요`);
  }

  function slotsFor(plateData) {
    const slots = [];
    for (const type of PIECE_ORDER) {
      for (let count = 0; count < (plateData?.pieces[type] || 0); count += 1) slots.push(type);
    }
    for (let count = 0; count < (plateData?.hiddenColors?.length || 0); count += 1) slots.push("mystery");
    const capacity = Engine.capacityOf ? Engine.capacityOf(plateData) : Engine.PLATE_CAPACITY;
    while (slots.length < capacity) slots.push(null);
    return slots.slice(0, capacity);
  }

  function gradientForSlots(slots) {
    const angle = 360 / Math.max(1, slots.length);
    return `conic-gradient(from ${-angle / 2}deg, ${slots.map((type, index) => {
      const start = index * angle;
      if (type === "rainbow") {
        const stripeAngle = angle / RAINBOW_COLORS.length;
        return RAINBOW_COLORS.map((color, stripeIndex) => {
          const stripeStart = start + stripeIndex * stripeAngle;
          const stripeEnd = stripeStart + stripeAngle;
          return `${color} ${stripeStart}deg ${stripeEnd}deg`;
        }).join(", ");
      }
      return `${type ? CAKES[type]?.color || EMPTY_COLOR : EMPTY_COLOR} ${start}deg ${start + angle}deg`;
    }).join(", ")})`;
  }

  function sliceMarks(slots) {
    const angle = 360 / Math.max(1, slots.length);
    return slots.map((type, index) => {
      if (type !== "mystery") return "";
      const radians = (index * angle * Math.PI) / 180;
      const x = 50 + Math.sin(radians) * 31;
      const y = 50 - Math.cos(radians) * 31;
      return `<span class="mystery-slice-mark" style="--mark-x:${x.toFixed(3)}%;--mark-y:${y.toFixed(3)}%">?</span>`;
    }).join("");
  }

  function singlePlateMarkup(plateData, rotation = 0, className = "", active = true) {
    const slots = slotsFor(plateData);
    const gradient = gradientForSlots(slots);
    const counts = Object.entries(plateData?.pieces || {})
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `<span title="${CAKES[type]?.name || type} ${count}개">${CAKES[type]?.emoji || "?"}${count}</span>`)
      .join("");
    const capacity = Engine.capacityOf ? Engine.capacityOf(plateData) : Engine.PLATE_CAPACITY;
    const emptyClass = Engine.totalPieces(plateData) ? "" : " empty-plate";
    const colorClass = plateData?.allowedColor ? " color-plate" : "";
    const collectorClass = plateData?.collectorOnly ? " collector-plate" : "";
    const accent = plateData?.allowedColor ? CAKES[plateData.allowedColor]?.color : null;
    const mysteryCount = plateData?.hiddenColors?.length || 0;
    return `<div class="cake-plate${emptyClass}${colorClass}${collectorClass}${className ? ` ${className}` : ""}"${accent ? ` style="--plate-accent:${accent}"` : ""} aria-hidden="true">
      <div class="cake-wheel" data-capacity="${capacity}" data-active-layer="${active}" style="--cake-gradient:${gradient};--wheel-rotation:${rotation}deg;--slice-angle:${360 / capacity}deg">${sliceMarks(slots)}</div>
      <div class="plate-counts">${counts}</div>
      ${plateData?.allowedColor ? `<span class="plate-color-badge">${CAKES[plateData.allowedColor]?.emoji || "●"}</span>` : ""}
      ${plateData?.collectorOnly ? `<span class="collector-badge" title="인접한 판에서 같은 색 조각을 모아요">⇣</span>` : ""}
      ${capacity === 8 ? `<span class="capacity-badge">8</span>` : ""}
      ${mysteryCount ? `<span class="mystery-count">?${mysteryCount}</span>` : ""}
      ${plateData?.pieces?.rainbow ? `<span class="rainbow-count">🌈${plateData.pieces.rainbow}</span>` : ""}
    </div>`;
  }

  function plateMarkup(plateData, rotation = 0, className = "") {
    if (plateData?.layers?.length) {
      const lower = { ...plateData.layers[0], id: plateData.id };
      return `<div class="layered-cake-plate${className ? ` ${className}` : ""}">${singlePlateMarkup(lower, rotation, "layer-bottom", false)}${singlePlateMarkup(plateData, rotation, "layer-top", true)}</div>`;
    }
    return singlePlateMarkup(plateData, rotation, className);
  }

  function plateLabel(plateData) {
    const visible = Object.entries(plateData.pieces || {})
      .filter(([type, count]) => type !== "mystery" && count > 0)
      .map(([type, count]) => `${CAKES[type]?.name || type} ${count}개`);
    if (plateData.hiddenColors?.length) visible.push(`미스테리 ${plateData.hiddenColors.length}개`);
    if (plateData.collectorOnly) {
      const colorName = CAKES[plateData.allowedColor]?.name || plateData.allowedColor || "지정 색깔";
      visible.push(`${colorName} 고정 수집 접시`);
      visible.push(`인접하게 놓은 판의 ${colorName} 조각만 가져오며 조각을 내보내지 않음`);
    } else {
      if (plateData.allowedColor) visible.push(`${CAKES[plateData.allowedColor]?.name || plateData.allowedColor} 전용 접시`);
      if (plateData.receiveOnly) visible.push("받기 전용");
    }
    if ((Engine.capacityOf?.(plateData) || Engine.PLATE_CAPACITY) === 8) visible.push("8조각 완성 판");
    if (plateData.layers?.length) visible.push("이층 케이크");
    return visible.join(", ");
  }

  function isPlayableCell(index) {
    const row = Math.floor(index / Engine.BOARD_SIZE);
    const column = index % Engine.BOARD_SIZE;
    return currentStage.boardMask[row]?.[column] === "1";
  }

  function runtimeHas(collection, index) {
    return Array.isArray(collection) ? collection.includes(index) : Boolean(collection?.[index]);
  }

  function configHasIndex(entries, index) {
    return (entries || []).some((entry) => (Number.isInteger(entry) ? entry : entry?.index) === index);
  }

  function serviceCellEntries(stage = currentStage) {
    if (stage?.mechanics?.serviceCells?.length) return stage.mechanics.serviceCells;
    if (stage?.objective?.type === "fragile") return stage?.mechanics?.fragileCells || [];
    return [];
  }

  function isServiceStage(stage = currentStage) {
    return stage?.objective?.type === "service" || serviceCellEntries(stage).length > 0;
  }

  function hasServiceGoal(stage = currentStage) {
    return ["service", "fragile"].includes(stage?.objective?.type);
  }

  function isServedCell(index) {
    return runtimeHas(state?.mechanics?.servedCells, index) ||
      (currentStage.objective?.type === "fragile" && runtimeHas(state?.mechanics?.brokenCells, index));
  }

  function servedOrderCount() {
    return Math.max(
      0,
      Number(state?.mechanics?.servedCount) || 0,
      currentStage.objective?.type === "fragile" ? Number(state?.mechanics?.fragileBrokenCount) || 0 : 0
    );
  }

  function coloredPlateGoalEntries(stage = currentStage) {
    if (stage?.objective?.type !== "coloredPlates") return [];
    return Object.entries(stage.objective.targets || {})
      .filter(([type, target]) => CAKES[type] && Number(target) > 0)
      .map(([type, target]) => [type, Math.max(1, Math.floor(Number(target)))]);
  }

  function collectedColoredPlateCount(type, runtime = state?.mechanics) {
    return Math.max(0, Math.floor(Number(runtime?.collectedColoredPlates?.[type]) || 0));
  }

  function gimmickPresentation(stage = currentStage) {
    if (isServiceStage(stage)) return { label: "주문대", icon: "🛎️" };
    return stage?.gimmick || {};
  }

  function isBoardFull() {
    return Mechanics.legalPlacementIndexes(currentStage, state.mechanics, state.board).length === 0;
  }

  function renderBoard() {
    elements.board.classList.remove("ready");
    elements.board.classList.toggle("shaped", currentStage.boardMask.some((row) => row.includes("0")));
    elements.board.innerHTML = state.board.map((plateData, index) => {
      const row = Math.floor(index / 4) + 1;
      const col = index % 4 + 1;
      if (!isPlayableCell(index)) {
        return `<div class="cell blocked" role="gridcell" data-cell="${index}" aria-label="${row}행 ${col}열, 사용할 수 없는 칸"></div>`;
      }
      const iceLocked = runtimeHas(state.mechanics.iceCells, index);
      const keyLocked = runtimeHas(state.mechanics.lockedCells, index);
      const serviceConfigured = configHasIndex(serviceCellEntries(), index);
      const serviceServed = serviceConfigured && isServedCell(index);
      const collapsed = !serviceConfigured && runtimeHas(state.mechanics.brokenCells, index);
      const hasFrog = state.mechanics.frogIndex === index;
      const frogIsActive = Number.isInteger(state.mechanics.frogIndex) && !state.mechanics.frogReached;
      const frogGoal = frogIsActive && currentStage.mechanics?.frog?.goalIndex === index;
      const collector = Boolean(plateData?.collectorOnly);
      const dropAllowed = !plateData && Mechanics.isCellAvailable(currentStage, state.mechanics, index, state.board);
      const classes = ["cell", plateData ? "occupied" : "empty"];
      if (state.activeCells.has(index)) classes.push("active");
      if (state.completeCells.has(index)) classes.push("complete");
      if (state.emptyCells.has(index)) classes.push("emptying");
      if (state.transitionCells.has(index)) classes.push("sorting");
      if (iceLocked) classes.push("ice-locked");
      if (keyLocked) classes.push("key-locked");
      if (collapsed) classes.push("collapsed");
      if (serviceConfigured) classes.push("service-station");
      if (serviceServed) classes.push("service-served");
      if (hasFrog) classes.push("frog-cell");
      if (frogGoal) classes.push("frog-goal-cell");
      if (collector) classes.push("collector-cell");
      const effectClass = state.effectCells.get(index);
      if (effectClass) classes.push(effectClass);
      const lock = currentStage.mechanics?.locks?.find((item) =>
        item.index === index || item.indexes?.includes(index)
      );
      const keyColor = lock?.keyColor || lock?.color || lock?.trigger?.color;
      const lockCount = Math.max(1, Math.floor(Number(lock?.count || lock?.required || lock?.tier) || 1));
      const keyId = lock?.keyId || `${lock?.color || "any"}:${lockCount}`;
      const lockProgress = Math.min(lockCount, Math.max(0, Number(state.mechanics.keyProgress?.[keyId]) || 0));
      const lockCountLabel = lockCount > 1 ? `<b class="lock-count-badge">${lockProgress}/${lockCount}</b>` : "";
      const reason = iceLocked ? "얼음을 먼저 깨야 해요"
        : keyLocked ? (lockCount > 1 ? `열쇠 조건 ${lockProgress}/${lockCount} 완료` : "열쇠 조건을 먼저 완료해야 해요")
          : collapsed ? "사용할 수 없는 칸이에요"
            : hasFrog ? "개구리가 있는 칸이에요"
              : plateData ? "이미 접시가 있어요" : "";
      const goalDescription = frogGoal ? ", 개구리 목표 칸" : "";
      const serviceDescription = serviceConfigured
        ? serviceServed ? ", 주문을 완료한 주문대, 다시 사용할 수 있음" : ", 이 자리에서 케이크를 완성하면 주문 처리"
        : "";
      const label = plateData ? `${row}행 ${col}열, ${plateLabel(plateData)}${serviceDescription}${iceLocked ? ", 반투명 얼음 안에 갇혀 있어 현재 사용할 수 없음" : ""}${goalDescription}`
        : `${row}행 ${col}열, ${reason || `빈칸${serviceDescription}${goalDescription}${frogGoal ? ", 판을 놓을 수 있음" : ""}`}`;
      const fixtures = [
        serviceConfigured ? `<span class="cell-fixture service-station-pad" aria-hidden="true"><span class="service-station-label"><i></i></span></span>` : "",
        effectClass === "order-served" ? `<span class="order-served-burst" aria-hidden="true"><i>✓</i><b>주문 완료!</b></span>` : "",
        effectClass === "colored-plate-collected" ? `<span class="colored-plate-collected-burst" aria-hidden="true"><i>✓</i></span>` : "",
        frogGoal ? `<span class="frog-goal" aria-hidden="true"></span>` : "",
        iceLocked ? `<span class="cell-fixture ice-cover" aria-hidden="true"></span>` : "",
        keyLocked ? `<span class="cell-fixture lock-cover" aria-hidden="true">${keyColor ? `<i class="lock-key-dot" style="--key-color:${CAKES[keyColor]?.color || "#999"}"></i>` : ""}${lockCountLabel}</span>` : "",
        hasFrog ? `<span class="frog-token" aria-hidden="true"></span>` : "",
      ].join("");
      return `<div class="${classes.join(" ")}" role="gridcell" data-cell="${index}" data-drop-allowed="${dropAllowed}" data-block-reason="${reason}" aria-label="${label}">${plateData ? plateMarkup(plateData) : ""}${fixtures}</div>`;
    }).join("");
  }

  function renderRack() {
    elements.rack.innerHTML = state.rack.map((plateData, index) => {
      if (!plateData) return `<div class="rack-card used" aria-label="사용한 자리"><span>사용 완료</span></div>`;
      return `<div class="rack-card" role="group" data-rack="${index}" aria-label="${plateLabel(plateData)} 판. 빈칸으로 끌어서 놓으세요.">${plateMarkup(plateData)}</div>`;
    }).join("");

    elements.rack.querySelectorAll(".rack-card[data-rack]").forEach((card) => {
      card.addEventListener("pointerdown", (event) => beginDrag(event, Number(card.dataset.rack), card));
    });
  }

  function goalMarkup(showProgress) {
    const sequence = currentStage.mechanics?.orderedGoal?.sequence || currentStage.objective?.sequence;
    if (sequence?.length) {
      const cursor = showProgress ? state?.mechanics?.orderIndex || 0 : 0;
      const visible = sequence.length <= 5 ? sequence : sequence.slice(Math.max(0, cursor - 1), cursor + 3);
      return `<span class="goal-sequence" title="순서대로 케이크 완성">${visible.map((type, index) => {
        const actualIndex = sequence.length <= 5 ? index : Math.max(0, cursor - 1) + index;
        const className = actualIndex < cursor ? " done" : actualIndex === cursor ? " current" : "";
        return `${index ? `<i class="sequence-arrow">›</i>` : ""}<span class="sequence-chip${className}">${CAKES[type]?.emoji || "?"}</span>`;
      }).join("")}${sequence.length > visible.length ? `<b>+${sequence.length - visible.length}</b>` : ""}</span>`;
    }
    const chips = Stages.goalEntries(currentStage).filter(([type]) => CAKES[type]).map(([type, target]) => {
      const completed = Math.min(state?.completedByType[type] || 0, target);
      const count = showProgress ? `${completed}/${target}` : `${target}판`;
      return `<span class="goal-chip" title="${CAKES[type].name} 케이크 ${target}판"><span aria-hidden="true">${CAKES[type].emoji}</span><b>${count}</b></span>`;
    });
    const coloredPlateGoals = coloredPlateGoalEntries();
    if (coloredPlateGoals.length) {
      const title = coloredPlateGoals.map(([type, target]) => `${CAKES[type].name} 색깔 접시 ${target}개`).join(", ");
      const items = coloredPlateGoals.map(([type, target]) => {
        const completed = Math.min(target, collectedColoredPlateCount(type));
        const count = showProgress ? `${completed}/${target}` : `${target}`;
        return `<span class="colored-plate-goal-item"><span class="colored-plate-goal-icon" style="--goal-plate-color:${CAKES[type].color}" aria-hidden="true"><i>${CAKES[type].emoji}</i></span><em>${count}</em></span>`;
      }).join("");
      chips.push(`<span class="goal-chip colored-plate-goal-chip" title="${title} 모으기">${items}</span>`);
    }
    if (hasServiceGoal()) {
      const target = Math.max(1, Math.floor(Number(currentStage.objective.target) || 1));
      const completed = Math.min(target, servedOrderCount());
      const count = showProgress ? `주문 ${completed}/${target}` : `주문대 ${target}곳에서 완성`;
      chips.push(`<span class="goal-chip service-goal-chip" title="주문대 ${target}곳에서 케이크 완성"><span class="service-goal-icon" aria-hidden="true"></span><b>${count}</b></span>`);
    }
    if (currentStage.mechanics?.frog) {
      const reached = Boolean(state?.mechanics?.frogReached);
      const distance = state ? Mechanics.frogDistance(currentStage, state.mechanics, state.board) : null;
      const count = showProgress ? (reached ? "도착!" : Number.isFinite(distance) ? `${distance}칸` : "대기") : "목표 도착";
      chips.push(`<span class="goal-chip" title="개구리를 목표 칸까지 이동"><span aria-hidden="true">🐸</span><b>${count}</b></span>`);
    }
    return chips.join("");
  }

  function renderGoals() {
    elements.stageGoalPreview.innerHTML = goalMarkup(false);
    elements.goalProgress.innerHTML = goalMarkup(true);
  }

  function render() {
    renderBoard();
    renderRack();
    renderGoals();
    elements.movesRemaining.textContent = state.movesRemaining;
    elements.movesCounter.classList.toggle("danger", state.movesRemaining <= 3);
    elements.hint.textContent = state.busy ? "케이크를 정렬하고 있어요" : "판을 위로 끌어 빈칸에 놓으세요";
  }

  function dragLift(pointerType) {
    return pointerType === "touch" || pointerType === "pen" ? Math.min(112, window.innerHeight * .17) : 76;
  }

  function beginDrag(event, rackIndex, card) {
    if (event.button !== 0 || state.busy || !state.rack[rackIndex] || dragGesture) return;
    event.preventDefault();
    const lift = dragLift(event.pointerType);
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.innerHTML = plateMarkup(state.rack[rackIndex]);
    document.body.appendChild(ghost);

    dragGesture = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      rackIndex,
      card,
      ghost,
      lift,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      targetCell: null,
      collectorPreviewCell: null,
    };
    card.setPointerCapture?.(event.pointerId);
    card.classList.add("dragging");
    document.body.classList.add("is-dragging");
    elements.board.classList.add("ready");
    positionDrag(event.clientX, event.clientY);
    playTone(420, .05, "sine");
  }

  function positionDrag(clientX, clientY) {
    if (!dragGesture) return;
    const ghostX = Math.max(52, Math.min(window.innerWidth - 52, clientX));
    const ghostY = Math.max(52, clientY - dragGesture.lift);
    dragGesture.ghost.style.left = `${ghostX}px`;
    dragGesture.ghost.style.top = `${ghostY}px`;

    document.querySelector(".cell.drop-target")?.classList.remove("drop-target");
    const hoveredCell = document.elementFromPoint(ghostX, ghostY)?.closest(".cell");
    const candidate = hoveredCell?.dataset.dropAllowed === "true" ? hoveredCell : null;
    dragGesture.targetCell = candidate ? Number(candidate.dataset.cell) : null;
    candidate?.classList.add("drop-target");
    const collectorSummary = updateCollectorPreview(dragGesture.targetCell);
    elements.hint.textContent = candidate
      ? collectorSummary || "여기에 놓을까요?"
      : hoveredCell?.dataset.blockReason || "판을 빈칸 위까지 끌어주세요";
  }

  function moveDrag(event) {
    if (!dragGesture || event.pointerId !== dragGesture.pointerId) return;
    event.preventDefault();
    const distance = Math.hypot(event.clientX - dragGesture.startX, event.clientY - dragGesture.startY);
    if (distance > 5) dragGesture.moved = true;
    positionDrag(event.clientX, event.clientY);
  }

  function finishDrag(event) {
    if (!dragGesture || event.pointerId !== dragGesture.pointerId) return;
    event.preventDefault();
    const distance = Math.hypot(event.clientX - dragGesture.startX, event.clientY - dragGesture.startY);
    if (distance > 5) dragGesture.moved = true;
    positionDrag(event.clientX, event.clientY);
    const { rackIndex, targetCell, moved } = dragGesture;
    clearDrag();
    if (moved && targetCell !== null) placeRackAt(rackIndex, targetCell);
    else showToast("판을 끌어서 빈칸 위에 놓아주세요");
  }

  function clearDrag() {
    if (!dragGesture) return;
    clearCollectorPreview();
    document.querySelector(".cell.drop-target")?.classList.remove("drop-target");
    dragGesture.card.classList.remove("dragging");
    dragGesture.ghost.remove();
    dragGesture = null;
    document.body.classList.remove("is-dragging");
    elements.board.classList.remove("ready");
    elements.hint.textContent = "판을 위로 끌어 빈칸에 놓으세요";
  }

  function collectorPullPreview(centerIndex) {
    if (!Number.isInteger(centerIndex) || !dragGesture) return [];
    const source = state.rack[dragGesture.rackIndex];
    if (!source || source.receiveOnly) return [];
    const neighborOrder = Engine.getNeighbors(centerIndex);
    const byType = new Map();
    neighborOrder.forEach((index, directionOrder) => {
      const collector = state.board[index];
      const type = collector?.allowedColor;
      if (
        !collector?.collectorOnly || collector.kind !== "colored" || !type ||
        runtimeHas(state.mechanics.iceCells, index) || Engine.isFrozen?.(collector) ||
        !(source.pieces?.[type] > 0)
      ) return;
      const free = Math.max(0, (Engine.capacityOf?.(collector) || Engine.PLATE_CAPACITY) - Engine.totalPieces(collector));
      if (!free) return;
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type).push({ index, type, free, deficit: free, directionOrder });
    });

    const previews = [];
    for (const [type, collectors] of byType) {
      let remaining = source.pieces[type] || 0;
      collectors.sort((first, second) =>
        first.deficit - second.deficit || first.directionOrder - second.directionOrder
      );
      for (const collector of collectors) {
        if (remaining <= 0) break;
        const count = Math.min(remaining, collector.free);
        if (count <= 0) continue;
        previews.push({ index: collector.index, type, count });
        remaining -= count;
      }
    }
    return previews;
  }

  function clearCollectorPreview() {
    document.querySelectorAll(".cell.collector-preview-target").forEach((cell) => {
      cell.classList.remove("collector-preview-target");
      cell.style.removeProperty("--collector-preview-color");
      if (cell.dataset.baseAriaLabel) {
        cell.setAttribute("aria-label", cell.dataset.baseAriaLabel);
        delete cell.dataset.baseAriaLabel;
      }
    });
    document.querySelectorAll(".collector-preview-bubble, .collector-drag-preview").forEach((item) => item.remove());
    document.querySelector(".cell.collector-source-preview")?.classList.remove("collector-source-preview");
    if (dragGesture) dragGesture.collectorPreviewCell = null;
  }

  function updateCollectorPreview(centerIndex) {
    if (!dragGesture) return "";
    if (dragGesture.collectorPreviewCell === centerIndex) {
      return dragGesture.collectorPreviewSummary || "";
    }
    clearCollectorPreview();
    dragGesture.collectorPreviewCell = centerIndex;
    dragGesture.collectorPreviewSummary = "";
    const previews = collectorPullPreview(centerIndex);
    if (!previews.length) return "";

    const sourceCell = elements.board.querySelector(`.cell[data-cell="${centerIndex}"]`);
    sourceCell?.classList.add("collector-source-preview");
    for (const preview of previews) {
      const target = elements.board.querySelector(`.cell[data-cell="${preview.index}"]`);
      if (!target) continue;
      target.classList.add("collector-preview-target");
      target.dataset.baseAriaLabel = target.getAttribute("aria-label") || "";
      const colorName = CAKES[preview.type]?.name || preview.type;
      target.style.setProperty("--collector-preview-color", CAKES[preview.type]?.color || "#999");
      target.setAttribute("aria-label", `${target.dataset.baseAriaLabel}, 여기에 놓으면 ${colorName} ${preview.count}개 수집 예정`);
      target.insertAdjacentHTML("beforeend", `<span class="collector-preview-bubble" style="--preview-color:${CAKES[preview.type]?.color || "#999"}" aria-hidden="true"><b>+${preview.count}</b>${CAKES[preview.type]?.emoji || "●"}</span>`);
    }

    const totals = [];
    for (const type of PIECE_ORDER) {
      const count = previews.filter((preview) => preview.type === type)
        .reduce((sum, preview) => sum + preview.count, 0);
      if (count) totals.push(`${CAKES[type]?.emoji || "●"}${count}`);
    }
    const summary = `${totals.join(" · ")} 조각이 색깔 접시로 이동해요`;
    dragGesture.collectorPreviewSummary = summary;
    dragGesture.ghost.insertAdjacentHTML("beforeend", `<span class="collector-drag-preview" aria-hidden="true">${totals.join(" · ")} → 수집</span>`);
    return summary;
  }

  function nearestRotation(current, desired) {
    let result = desired;
    while (result - current > 180) result -= 360;
    while (result - current < -180) result += 360;
    return result;
  }

  function slotIndexFor(plateData, type) {
    return slotsFor(plateData).lastIndexOf(type);
  }

  function reducedMotion() {
    return Boolean(reducedMotionQuery?.matches);
  }

  function layoutRect(element) {
    const bounds = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    const width = Number.parseFloat(computed.width) || element.offsetWidth || bounds.width;
    const height = Number.parseFloat(computed.height) || element.offsetHeight || bounds.height;
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    return {
      left: centerX - width / 2,
      top: centerY - height / 2,
      width,
      height,
    };
  }

  function setLayerRect(layer, rect) {
    layer.style.left = `${rect.left}px`;
    layer.style.top = `${rect.top}px`;
    layer.style.width = `${rect.width}px`;
    layer.style.height = `${rect.height}px`;
  }

  function createMovingSlice(sourceWheel, lastSlot, count, className = "") {
    const capacity = Number(sourceWheel?.dataset.capacity) || Engine.PLATE_CAPACITY;
    const geometry = Motion.createSliceGroupGeometry({ lastSlot, count, capacity });
    const movingSlice = document.createElement("div");
    movingSlice.className = `moving-slice ${className}`.trim();
    movingSlice.setAttribute("aria-hidden", "true");

    const visual = sourceWheel.cloneNode(false);
    visual.classList.add("moving-slice-visual");
    visual.style.setProperty("--slice-mask-start", `${geometry.maskStart}deg`);
    visual.style.setProperty("--slice-mask-span", `${geometry.maskSpan}deg`);
    movingSlice.dataset.visualRotation = String(
      Number.parseFloat(visual.style.getPropertyValue("--wheel-rotation")) || 0,
    );
    movingSlice.appendChild(visual);
    return movingSlice;
  }

  function nextPaint() {
    if (reducedMotion()) return Promise.resolve();
    return new Promise((resolve) => window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    }));
  }

  function removeOnePiece(board, fromIndex, type) {
    const from = board[fromIndex];
    if (!from?.pieces[type]) throw new Error(`${type} 조각 출발 상태가 일치하지 않습니다.`);
    from.pieces[type] -= 1;
    if (from.pieces[type] === 0) delete from.pieces[type];
  }

  function addOnePiece(board, toIndex, type) {
    const to = board[toIndex];
    if (!to) throw new Error(`${type} 조각 도착 상태가 일치하지 않습니다.`);
    to.pieces[type] = (to.pieces[type] || 0) + 1;
  }

  function transferRoute(beforeBoard, fromIndex, toIndex) {
    return Motion.findGridRoute({
      fromIndex,
      toIndex,
      columns: Engine.BOARD_SIZE,
      cellCount: beforeBoard.length,
      isPlayable: isPlayableCell,
      isOccupied: (index) => Boolean(beforeBoard[index] && Engine.totalPieces(beforeBoard[index]) > 0),
    });
  }

  function rectAtCell(index, width, height) {
    const cell = elements.board.querySelector(`[data-cell="${index}"]`);
    const bounds = cell?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      left: bounds.left + (bounds.width - width) / 2,
      top: bounds.top + (bounds.height - height) / 2,
      width,
      height,
    };
  }

  function curvedMidpointRect(fromRect, toRect, offset) {
    const fromCenter = { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 };
    const toCenter = { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 };
    const deltaX = toCenter.x - fromCenter.x;
    const deltaY = toCenter.y - fromCenter.y;
    const distance = Math.hypot(deltaX, deltaY) || 1;
    const centerX = (fromCenter.x + toCenter.x) / 2 - deltaY / distance * offset;
    const centerY = (fromCenter.y + toCenter.y) / 2 + deltaX / distance * offset;
    return {
      left: centerX - fromRect.width / 2,
      top: centerY - fromRect.height / 2,
      width: fromRect.width,
      height: fromRect.height,
    };
  }

  function routeRects(route, fromRect, toRect, laneOffset = 0) {
    if (!route) {
      const distance = Math.hypot(toRect.left - fromRect.left, toRect.top - fromRect.top);
      const detour = Math.max(fromRect.width * 1.15, distance * .28);
      return [fromRect, curvedMidpointRect(fromRect, toRect, detour), toRect];
    }
    if (route.length === 2 && laneOffset) {
      return [fromRect, curvedMidpointRect(fromRect, toRect, laneOffset), toRect];
    }
    return route.map((index, position) => {
      if (position === 0) return fromRect;
      if (position === route.length - 1) return toRect;
      return rectAtCell(index, fromRect.width, fromRect.height) || fromRect;
    });
  }

  function applyTransfers(board, transfers) {
    for (const transfer of transfers) {
      for (let count = 0; count < transfer.count; count += 1) {
        removeOnePiece(board, transfer.from, transfer.type);
      }
    }
    for (const transfer of transfers) {
      for (let count = 0; count < transfer.count; count += 1) {
        addOnePiece(board, transfer.to, transfer.targetType || transfer.asType || transfer.type);
      }
    }
  }

  function buildTransferPlans(transfers, beforeBoard, afterBoard) {
    const sourceTotals = new Map();
    const targetTotals = new Map();
    const sourceOffsets = new Map();
    const targetOffsets = new Map();
    const slotKey = (index, type) => `${index}:${type}`;
    for (const transfer of transfers) {
      const targetType = transfer.targetType || transfer.asType || transfer.type;
      const sourceKey = slotKey(transfer.from, transfer.type);
      const targetKey = slotKey(transfer.to, targetType);
      sourceTotals.set(sourceKey, (sourceTotals.get(sourceKey) || 0) + transfer.count);
      targetTotals.set(targetKey, (targetTotals.get(targetKey) || 0) + transfer.count);
    }

    const groupedPlans = transfers.map((transfer) => {
      const fromCell = elements.board.querySelector(`[data-cell="${transfer.from}"]`);
      const toCell = elements.board.querySelector(`[data-cell="${transfer.to}"]`);
      const sourceWheel = fromCell?.querySelector('.cake-wheel[data-active-layer="true"]') || fromCell?.querySelector(".cake-wheel");
      const targetWheel = toCell?.querySelector('.cake-wheel[data-active-layer="true"]') || toCell?.querySelector(".cake-wheel");
      const targetType = transfer.targetType || transfer.asType || transfer.type;
      const sourceKey = slotKey(transfer.from, transfer.type);
      const targetKey = slotKey(transfer.to, targetType);
      const sourceBlockLast = slotIndexFor(beforeBoard[transfer.from], transfer.type);
      const targetBlockLast = slotIndexFor(afterBoard[transfer.to], targetType);
      const sourceOffset = sourceOffsets.get(sourceKey) || 0;
      const targetOffset = targetOffsets.get(targetKey) || 0;
      const sourceFirst = sourceBlockLast - sourceTotals.get(sourceKey) + 1 + sourceOffset;
      const targetFirst = targetBlockLast - targetTotals.get(targetKey) + 1 + targetOffset;
      const sourceLast = sourceFirst + transfer.count - 1;
      const targetLast = targetFirst + transfer.count - 1;
      sourceOffsets.set(sourceKey, sourceOffset + transfer.count);
      targetOffsets.set(targetKey, targetOffset + transfer.count);
      // Arm-to-arm consolidation always uses the placed center as a visual
      // hand-off. Empty-cell routes are only a fallback for transfers without
      // center metadata, so slices never appear to land on unrelated blanks.
      const emptyRoute = Number.isInteger(transfer.via)
        ? null
        : transferRoute(beforeBoard, transfer.from, transfer.to);
      const { route, portalRelay } = Motion.createTransferRoutePlan({
        emptyRoute,
        fromIndex: transfer.from,
        viaIndex: transfer.via,
        toIndex: transfer.to,
        maxCells: MAX_VISIBLE_ROUTE_CELLS,
      });
      const rowDistance = Math.abs(
        Math.floor(transfer.from / Engine.BOARD_SIZE) - Math.floor(transfer.to / Engine.BOARD_SIZE),
      );
      const columnDistance = Math.abs(
        (transfer.from % Engine.BOARD_SIZE) - (transfer.to % Engine.BOARD_SIZE),
      );
      return {
        ...transfer,
        targetType,
        sourceCapacity: Engine.capacityOf ? Engine.capacityOf(beforeBoard[transfer.from]) : Engine.PLATE_CAPACITY,
        targetCapacity: Engine.capacityOf ? Engine.capacityOf(afterBoard[transfer.to]) : Engine.PLATE_CAPACITY,
        sourceWheel,
        targetWheel,
        sourceLast,
        sourceFirst,
        targetLast,
        targetFirst,
        route,
        portalRelay,
        multiHop: Boolean(route?.length > 2 || rowDistance + columnDistance > 1),
        reciprocal: false,
      };
    });
    for (let first = 0; first < groupedPlans.length; first += 1) {
      for (let second = first + 1; second < groupedPlans.length; second += 1) {
        if (
          groupedPlans[first].from === groupedPlans[second].to &&
          groupedPlans[first].to === groupedPlans[second].from
        ) {
          groupedPlans[first].reciprocal = true;
          groupedPlans[second].reciprocal = true;
        }
      }
    }
    return Motion.orderDisplacedTransfersFirst(groupedPlans).flatMap((plan) =>
      Motion.createPieceTransferSequence({
        count: plan.count,
        sourceFirst: plan.sourceFirst,
        targetFirst: plan.targetFirst,
        sourceCapacity: plan.sourceCapacity,
        targetCapacity: plan.targetCapacity,
      }).map(({ sourceSlot, targetSlot }) => ({
        ...plan,
        count: 1,
        sourceFirst: sourceSlot,
        sourceLast: sourceSlot,
        targetFirst: targetSlot,
        targetLast: targetSlot,
      }))
    );
  }

  function playTimedRotation(element, current, target, duration, easing) {
    const finalRotation = nearestRotation(current, target);
    element.style.setProperty("--wheel-rotation", `${finalRotation}deg`);
    if (duration <= 1 || Math.abs(finalRotation - current) < .001) return Promise.resolve();
    const animation = element.animate([
      { transform: `rotate(${current}deg)` },
      { transform: `rotate(${finalRotation}deg)` },
    ], {
      duration,
      easing,
      fill: "both",
    });
    return animation.finished.catch(() => {}).finally(() => animation.cancel());
  }

  function playSlotReflow(element, current, target, duration, holdRatio) {
    const finalRotation = target;
    element.style.setProperty("--wheel-rotation", `${finalRotation}deg`);
    if (duration <= 1 || Math.abs(finalRotation - current) < .001) return Promise.resolve();
    const keyframes = [{ transform: `rotate(${current}deg)`, offset: 0 }];
    if (holdRatio > 0) keyframes.push({ transform: `rotate(${current}deg)`, offset: holdRatio });
    keyframes.push({ transform: `rotate(${finalRotation}deg)`, offset: 1 });
    const animation = element.animate(keyframes, {
      duration,
      easing: "cubic-bezier(.33,0,.2,1)",
      fill: "both",
    });
    return animation.finished.catch(() => {}).finally(() => animation.cancel());
  }

  function createEmptyBackdrop(sourceWheel, rect, capacity = Engine.PLATE_CAPACITY) {
    const layer = document.createElement("div");
    layer.className = "moving-slice plate-transition-backdrop";
    layer.setAttribute("aria-hidden", "true");
    setLayerRect(layer, rect);
    const visual = sourceWheel.cloneNode(false);
    visual.classList.add("plate-transition-wheel");
    visual.style.setProperty("--cake-gradient", gradientForSlots(Array(capacity).fill(null)));
    visual.style.setProperty("--wheel-rotation", "0deg");
    layer.appendChild(visual);
    document.body.appendChild(layer);
    return { layer };
  }

  function createPlatePreparation(index, beforePlate, afterPlate, hasOutgoing) {
    const wheel = elements.board.querySelector(`[data-cell="${index}"] .cake-wheel[data-active-layer="true"]`)
      || elements.board.querySelector(`[data-cell="${index}"] .cake-wheel`);
    if (!wheel) {
      return { index, layers: [], align: () => Promise.resolve(), reflow: () => Promise.resolve() };
    }
    const rect = layoutRect(wheel);
    const transition = Motion.createSlotTransition({
      beforeSlots: slotsFor(beforePlate),
      afterSlots: slotsFor(afterPlate),
    });
    const backdrop = createEmptyBackdrop(wheel, rect, Engine.capacityOf ? Engine.capacityOf(beforePlate) : Engine.PLATE_CAPACITY);
    const retained = transition.retained.map((group) => {
      const layer = createMovingSlice(wheel, group.fromLast, group.count, "plate-transition-retained");
      setLayerRect(layer, rect);
      document.body.appendChild(layer);
      const visual = layer.querySelector(".moving-slice-visual");
      const baseRotation = 0;
      const targetRotation = nearestRotation(baseRotation, Motion.createSlotReflowRotation({
        baseRotation,
        fromFirst: group.fromFirst,
        toFirst: group.toFirst,
        capacity: Engine.capacityOf ? Engine.capacityOf(beforePlate) : Engine.PLATE_CAPACITY,
      }));
      return {
        layer,
        align: () => {
          visual.style.setProperty("--wheel-rotation", `${baseRotation}deg`);
          return Promise.resolve();
        },
        reflow: (duration) => playSlotReflow(
          visual,
          baseRotation,
          targetRotation,
          reducedMotion() ? 1 : duration,
          hasOutgoing ? .18 : 0,
        ),
      };
    });
    return {
      index,
      layers: [backdrop.layer, ...retained.map((item) => item.layer)],
      align: () => Promise.all(retained.map((item) => item.align())),
      reflow: (duration) => Promise.all(retained.map((item) => item.reflow(duration))),
    };
  }

  function createTransferVisual(plan, activeSession) {
    if (plan.from === plan.to) return null;
    if (!plan.sourceWheel || !plan.targetWheel || plan.sourceLast < 0 || plan.targetLast < 0) return null;
    const fromRect = layoutRect(plan.sourceWheel);
    const toRect = layoutRect(plan.targetWheel);
    const reciprocalOffset = plan.reciprocal ? Motion.reciprocalLaneOffset(fromRect.width) : 0;
    const rects = routeRects(plan.route, fromRect, toRect, reciprocalOffset);
    let flight = plan.multiHop
      ? Motion.createHopFlightMotion({ rects, reducedMotion: reducedMotion() })
      : Motion.createRoutedFlightMotion({ rects, reducedMotion: reducedMotion() });
    const layer = createMovingSlice(plan.sourceWheel, plan.sourceLast, plan.count, "flying-transfer");
    setLayerRect(layer, fromRect);
    document.body.appendChild(layer);
    const visual = layer.querySelector(".moving-slice-visual");
    const sourceRotation = 0;
    const rawLandingRotation = Motion.createPieceLandingRotation({
      sourceSlot: plan.sourceFirst,
      targetSlot: plan.targetFirst,
      targetRotation: 0,
      sourceCapacity: plan.sourceCapacity,
      targetCapacity: plan.targetCapacity,
    });
    const landingRotation = nearestRotation(sourceRotation, rawLandingRotation);
    let launchDelay = 0;
    layer.dataset.fromCell = String(plan.from);
    layer.dataset.toCell = String(plan.to);
    layer.dataset.cakeType = plan.targetType || plan.type;
    layer.dataset.sourceSlot = String(plan.sourceFirst);
    layer.dataset.targetSlot = String(plan.targetFirst);
    return {
      from: plan.from,
      to: plan.to,
      sourceSlot: plan.sourceFirst,
      targetSlot: plan.targetFirst,
      distance: flight.distance,
      get duration() { return launchDelay + flight.duration; },
      layer,
      setTiming: (timing) => {
        launchDelay = timing.delay;
        flight = Motion.retimeFlightMotion(flight, timing.duration);
        layer.dataset.flightDelay = String(launchDelay);
        layer.dataset.flightDuration = String(flight.duration);
        layer.dataset.startRotation = String(sourceRotation);
        layer.dataset.landingRotation = String(landingRotation);
      },
      align: () => {
        visual.style.setProperty("--wheel-rotation", `${sourceRotation}deg`);
        layer.dataset.visualRotation = String(sourceRotation);
        return Promise.resolve();
      },
      fly: async () => {
        if (launchDelay > 0) await wait(launchDelay);
        if (activeSession !== sessionId) return;
        const travel = async () => {
          if (flight.segments) {
            for (let index = 0; index < flight.segments.length; index += 1) {
              if (activeSession !== sessionId) return;
              const segment = flight.segments[index];
              const startTransform = `translate3d(${segment.start.x - flight.start.x}px, ${segment.start.y - flight.start.y}px, 0)`;
              const endTransform = `translate3d(${segment.end.x - flight.start.x}px, ${segment.end.y - flight.start.y}px, 0)`;
              const hop = layer.animate([
                { transform: startTransform, opacity: 1 },
                { transform: endTransform, opacity: 1 },
              ], {
                duration: segment.duration,
                easing: segment.easing,
                fill: "both",
              });
              await hop.finished.catch(() => {});
              layer.style.transform = endTransform;
              layer.style.opacity = "1";
              hop.cancel();
              if (activeSession !== sessionId) return;
              if (index < flight.segments.length - 1) {
                const relayIndex = plan.route?.[index + 1];
                if (Number.isInteger(relayIndex)) {
                  const relayCell = elements.board.querySelector(`[data-cell="${relayIndex}"]`);
                  relayCell?.classList.add("relaying");
                  if (plan.portalRelay) relayCell?.classList.add("portal-relaying");
                }
                playTone(470, .025, "sine");
                await wait(flight.holdDuration);
              }
            }
            return;
          }
          const animation = layer.animate(flight.points.map((point) => ({
            transform: `translate3d(${point.x - flight.start.x}px, ${point.y - flight.start.y}px, 0)`,
            offset: point.offset,
          })), {
            duration: flight.duration,
            easing: flight.easing,
            fill: "forwards",
          });
          await animation.finished.catch(() => {});
        };
        const turn = playTimedRotation(
          visual,
          sourceRotation,
          landingRotation,
          flight.duration,
          flight.easing,
        );
        await Promise.all([travel(), turn]);
      },
    };
  }

  async function animateTransferBatch(transfers, activeSession) {
    const beforeBoard = Engine.cloneBoard(state.board);
    const afterBoard = Engine.cloneBoard(state.board);
    applyTransfers(afterBoard, transfers);
    const plans = buildTransferPlans(transfers, beforeBoard, afterBoard);
    const involved = new Set(transfers.flatMap((transfer) => [transfer.from, transfer.to]));
    const outgoing = new Set(transfers.map((transfer) => transfer.from));
    const visuals = plans.map((plan) => createTransferVisual(plan, activeSession)).filter(Boolean);
    const baseSchedule = Motion.createPieceFlightSchedule({
      distances: visuals.map((visual) => visual.distance),
      reducedMotion: reducedMotion(),
    });
    const schedule = Motion.ensurePieceFlightClearance({
      schedule: baseSchedule,
      transfers: visuals,
      reducedMotion: reducedMotion(),
    });
    visuals.forEach((visual, index) => visual.setTiming(schedule.pieces[index]));
    const preparations = [...involved].map((index) => createPlatePreparation(
      index,
      beforeBoard[index],
      afterBoard[index],
      outgoing.has(index),
    ));
    const layers = [
      ...visuals.map((visual) => visual.layer),
      ...preparations.flatMap((preparation) => preparation.layers),
    ];

    state.transitionCells = involved;
    state.board = afterBoard;
    renderBoard();

    try {
      await Promise.all([
        ...preparations.map((preparation) => preparation.align()),
        ...visuals.map((visual) => visual.align()),
      ]);
      if (activeSession !== sessionId) return false;
      await nextPaint();
      await Promise.all([
        ...visuals.map((visual) => visual.fly()),
        ...preparations.map((preparation) => {
          const durations = visuals
            .filter((visual) => visual.from === preparation.index || visual.to === preparation.index)
            .map((visual) => visual.duration);
          const incomingDurations = visuals
            .filter((visual) => visual.to === preparation.index)
            .map((visual) => visual.duration);
          const firstArrival = incomingDurations.length
            ? Math.min(...incomingDurations)
            : (durations.length ? Math.min(...durations) : 1);
          return preparation.reflow(reducedMotion() ? 1 : Math.max(1, firstArrival - 24));
        }),
      ]);
      if (activeSession !== sessionId) return false;
      playTone(590, .045, "sine");
      await nextPaint();
      return true;
    } finally {
      layers.forEach((layer) => layer.remove());
      if (activeSession === sessionId) {
        state.transitionCells.clear();
        renderBoard();
      }
    }
  }

  async function animateResolution(events, activeSession) {
    const batches = Engine.buildAnimationBatches(events);
    state.activeCells.clear();
    renderBoard();
    for (const transfers of batches) {
      if (activeSession !== sessionId) return false;
      const finished = await animateTransferBatch(transfers, activeSession);
      if (!finished || activeSession !== sessionId) return false;
      await wait(reducedMotion() ? 0 : 10);
    }
    return true;
  }

  function completionType(record, phase) {
    if (record?.type || record?.color) return record.type || record.color;
    const plateData = phase?.settledBoard?.[record?.index];
    const capacity = Engine.capacityOf ? Engine.capacityOf(plateData) : Engine.PLATE_CAPACITY;
    return Object.keys(plateData?.pieces || {}).find((type) => plateData.pieces[type] === capacity) || null;
  }

  async function playResolutionPhase(phase, activeSession) {
    if (phase.events?.length) {
      const animationFinished = await animateResolution(phase.events, activeSession);
      if (!animationFinished || activeSession !== sessionId) return [];
    }
    state.board = phase.settledBoard || phase.board;
    state.activeCells.clear();
    const records = phase.completionEvents || (phase.completed || []).map((index) => ({ index }));
    const completedIndexes = records.map((record) => record.index);
    state.completeCells = new Set(completedIndexes);
    state.emptyCells = new Set(phase.emptied || []);

    if (records.length) {
      playTone(510, .09, "sine");
      render();
      const combo = records.length;
      playComplete(combo);
      showToast(combo > 1 ? `${combo}판 연쇄 완성!` : "케이크 한 판 완성!");
      await wait(reducedMotion() ? 0 : 520);
      if (activeSession !== sessionId) return [];
    } else if (phase.emptied?.length) {
      render();
      showToast("빈 판이 정리됐어요");
      await wait(reducedMotion() ? 0 : 300);
      if (activeSession !== sessionId) return [];
    }

    state.board = phase.board;
    state.completeCells.clear();
    state.emptyCells.clear();
    const promotedLayers = phase.layerRevealed || [];
    if (promotedLayers.length) {
      for (const index of promotedLayers) state.effectCells.set(index, "layer-promoting");
      renderBoard();
      showToast("아래층 케이크가 열렸어요");
      await wait(reducedMotion() ? 0 : 340);
      promotedLayers.forEach((index) => state.effectCells.delete(index));
    }
    return records.map((record) => ({ ...record, type: completionType(record, phase) })).filter((record) => record.type);
  }

  async function animateSpecialEvents(events, nextRuntime, activeSession) {
    const passiveKinds = new Set([
      "frogMove", "frog-move", "mysteryReveal", "mystery-reveal",
      "layerOpen", "layer-open", "orderProgress", "order-progress",
    ]);
    const terrainEvents = (events || []).filter((event) => !passiveKinds.has(event.kind));
    const classByKind = {
      iceBreak: "ice-breaking", iceBroken: "ice-breaking", unlock: "unlocking",
      "ice-break": "ice-breaking", lockOpen: "unlocking",
      orderServed: "order-served", "order-served": "order-served",
      coloredPlateCollected: "colored-plate-collected", "colored-plate-collected": "colored-plate-collected",
    };
    for (const event of terrainEvents) {
      const indexes = event.indexes || [event.index ?? event.to].filter(Number.isInteger);
      const legacyServiceEvent = isServiceStage() && ["fragileBreak", "cellBreak", "cell-break"].includes(event.kind);
      const effectClass = legacyServiceEvent ? "order-served" : classByKind[event.kind] || "gimmick-pulse";
      indexes.forEach((index) => state.effectCells.set(index, effectClass));
    }
    if (terrainEvents.length) {
      renderBoard();
      const servedEvent = [...terrainEvents].reverse().find((event) =>
        ["orderServed", "order-served", "fragileBreak"].includes(event.kind)
      );
      if (servedEvent && isServiceStage()) {
        const progress = Math.max(1, Number(servedEvent.progress) || servedOrderCount() + 1);
        const target = Math.max(1, Number(servedEvent.target) || Number(currentStage.objective?.target) || 1);
        playTone(progress >= target ? 880 : 720, .12, "sine");
        showToast(progress >= target ? "모든 주문을 완료했어요!" : `주문 ${Math.min(progress, target)}/${target} 완료!`);
      } else {
        const collectedEvents = terrainEvents.filter((event) =>
          event.kind === "coloredPlateCollected" || event.kind === "colored-plate-collected"
        );
        if (collectedEvents.length) {
          const event = collectedEvents.at(-1);
          const type = event.color || event.cakeType || event.plateColor || event.type;
          const cake = CAKES[type];
          const target = coloredPlateGoalEntries().find(([goalType]) => goalType === type)?.[1] || Number(event.target) || 1;
          const progress = Math.min(target, Math.max(1,
            Number(event.progress) || collectedColoredPlateCount(type, nextRuntime)
          ));
          const allCollected = coloredPlateGoalEntries().every(([goalType, goalTarget]) =>
            collectedColoredPlateCount(goalType, nextRuntime) >= goalTarget
          );
          playTone(allCollected ? 880 : 720, .12, "sine");
          if (collectedEvents.length > 1) {
            showToast(`색깔 접시 ${collectedEvents.length}개 수집!`);
          } else if (cake) {
            showToast(allCollected ? "색깔 접시 목표를 완료했어요!" : `${cake.name} 접시 ${progress}/${target} 수집!`);
          } else {
            showToast("색깔 접시를 수집했어요!");
          }
        }
      }
      await wait(reducedMotion() ? 0 : 360);
      if (activeSession !== sessionId) return false;
      state.effectCells.clear();
    }

    const frogMove = (events || []).find((event) => event.kind === "frogMove" || event.kind === "frog-move");
    const sourceFrog = frogMove
      ? elements.board.querySelector(`.cell[data-cell="${frogMove.from}"] .frog-token`)
      : null;
    const sourceRect = sourceFrog?.getBoundingClientRect();
    const movingFrog = sourceFrog?.cloneNode(true);
    state.mechanics = nextRuntime;
    renderBoard();
    if (frogMove) {
      const targetFrog = elements.board.querySelector(`.cell[data-cell="${frogMove.to}"] .frog-token`);
      const targetCell = elements.board.querySelector(`.cell[data-cell="${frogMove.to}"]`);
      const targetBounds = targetFrog?.getBoundingClientRect() || targetCell?.getBoundingClientRect();
      const targetRect = targetBounds && sourceRect ? {
        left: targetBounds.left + (targetBounds.width - sourceRect.width) / 2,
        top: targetBounds.top + (targetBounds.height - sourceRect.height) / 2,
      } : null;
      if (movingFrog && sourceRect && targetRect && !reducedMotion()) {
        movingFrog.classList.add("moving-frog");
        movingFrog.style.left = `${sourceRect.left}px`;
        movingFrog.style.top = `${sourceRect.top}px`;
        movingFrog.style.width = `${sourceRect.width}px`;
        movingFrog.style.height = `${sourceRect.height}px`;
        if (targetFrog) targetFrog.style.visibility = "hidden";
        document.body.appendChild(movingFrog);
        await nextPaint();
        movingFrog.style.transform = `translate3d(${targetRect.left - sourceRect.left}px, ${targetRect.top - sourceRect.top}px, 0)`;
        await wait(300);
        if (frogMove.reached) {
          movingFrog.classList.add("frog-vanishing");
          await wait(150);
        }
        movingFrog.remove();
        if (activeSession !== sessionId) return false;
      }
      state.effectCells.set(frogMove.to, "frog-arrived");
      renderBoard();
      playTone(frogMove.reached ? 780 : 430, .1, "sine");
      await wait(reducedMotion() ? 0 : 320);
      state.effectCells.delete(frogMove.to);
      if (frogMove.reached) showToast("개구리가 목표에 도착했어요!");
    }
    return activeSession === sessionId;
  }

  async function placeRackAt(rackIndex, cellIndex) {
    if (
      state.busy || state.movesRemaining <= 0 || state.board[cellIndex] ||
      !Mechanics.isCellAvailable(currentStage, state.mechanics, cellIndex, state.board)
    ) return;
    const chosen = state.rack[rackIndex];
    if (!chosen) return;
    const activeSession = sessionId;
    const revealResult = Mechanics.revealPlate(chosen);
    const placedPlate = revealResult?.plate || revealResult;
    const revealedCount = revealResult?.types?.length || revealResult?.revealedColors?.length || (Array.isArray(revealResult?.revealed) ? revealResult.revealed.length : 0);

    state.busy = true;
    state.board[cellIndex] = placedPlate;
    state.rack[rackIndex] = null;
    state.movesRemaining -= 1;
    state.score += 10;
    state.activeCells = new Set([cellIndex]);
    playTone(245, .08, "sine");
    render();
    if (revealedCount) {
      showToast(`미스테리 조각 ${revealedCount}개 공개!`);
      await wait(reducedMotion() ? 0 : 300);
    } else {
      await wait(120);
    }
    if (activeSession !== sessionId) return;

    let turn;
    try {
      turn = Mechanics.resolveTurn(currentStage, state.mechanics, state.board, cellIndex);
    } catch (error) {
      console.error(error);
      const fallback = Engine.resolvePlacement(state.board, cellIndex);
      turn = { board: fallback.board, runtime: state.mechanics, phases: [fallback], specialEvents: [] };
    }

    const completionRecords = [];
    for (const phase of turn.phases || []) {
      const records = await playResolutionPhase(phase, activeSession);
      if (activeSession !== sessionId) return;
      completionRecords.push(...records);
    }

    state.board = turn.board;
    state.activeCells.clear();
    state.completeCells.clear();
    state.emptyCells.clear();
    for (const record of completionRecords) {
      state.completed += 1;
      state.completedByType[record.type] = (state.completedByType[record.type] || 0) + 1;
    }
    if (completionRecords.length) {
      state.score += 240 * completionRecords.length + 90 * Math.max(0, completionRecords.length - 1);
    }
    const effectsFinished = await animateSpecialEvents(turn.specialEvents, turn.runtime, activeSession);
    if (!effectsFinished) return;

    const goalMet = Mechanics.isStageComplete(currentStage, state.completedByType, state.mechanics);
    if (!goalMet && state.movesRemaining > 0 && state.rack.every((item) => !item)) refillRack();
    state.best = Math.max(state.best, state.score);
    localStorage.setItem(BEST_KEY, String(state.best));
    state.busy = false;
    render();

    if (goalMet) completeStage();
    else if (state.movesRemaining <= 0) endGame("moves");
    else if (isBoardFull()) endGame("board");
  }

  function endGame(reason = "moves") {
    resultAction = "retry";
    elements.resultEyebrow.textContent = "STAGE FAILED";
    elements.resultTitle.textContent = reason === "board" ? "진열대가 가득 찼어요" : "배치 횟수를 모두 썼어요";
    elements.resultMessage.textContent = reason === "board"
      ? "목표를 완료하기 전에 빈칸이 모두 사라졌어요."
      : "목표에 가까운 색을 먼저 모아 다시 도전해보세요.";
    elements.resultCompleted.textContent = `${state.completed}판`;
    elements.resultScore.textContent = state.score.toLocaleString("ko-KR");
    elements.retry.textContent = "다시 도전";
    elements.result.classList.remove("hidden");
    playTone(190, .25, "triangle");
    elements.retry.focus();
  }

  function completeStage() {
    state.busy = true;
    resultAction = "homeAfterClear";
    elements.resultEyebrow.textContent = "STAGE CLEAR";
    elements.resultTitle.textContent = `${currentStage.title} 완료!`;
    elements.resultMessage.textContent = "스테이지 목표를 모두 달성했어요.";
    elements.resultCompleted.textContent = `${state.completed}판`;
    elements.resultScore.textContent = state.score.toLocaleString("ko-KR");
    elements.retry.textContent = "메인으로";
    elements.result.classList.remove("hidden");
    playComplete(2);
    elements.retry.focus();
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 1600);
  }

  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  function playTone(frequency, duration, wave) {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = wave;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) { /* Audio is optional. */ }
  }

  function playComplete(combo) {
    [660, 820, combo > 1 ? 1040 : 920].forEach((frequency, index) => {
      setTimeout(() => playTone(frequency, .14, "sine"), index * 80);
    });
  }

  function syncSoundButtons() {
    [elements.sound, elements.homeSound].forEach((button) => {
      button.setAttribute("aria-pressed", String(state.sound));
      button.setAttribute("aria-label", state.sound ? "소리 끄기" : "소리 켜기");
    });
  }

  function syncStageInfo() {
    elements.stageTitle.textContent = currentStage.title;
    elements.stageDifficulty.textContent = currentStage.difficulty;
    elements.stageDifficulty.dataset.difficulty = currentStage.difficulty;
    if (elements.stageGimmick) {
      const gimmick = gimmickPresentation();
      const label = gimmick.label;
      elements.stageGimmick.textContent = label ? `${gimmick.icon || "✦"} ${label}` : "";
      elements.stageGimmick.classList.toggle("hidden", !label);
    }
    if (elements.debugStage) elements.debugStage.value = String(currentStage.id);
    const capacity = Stages.stageCapacity?.(currentStage) || Engine.PLATE_CAPACITY;
    if (elements.guideCapacityNumber) elements.guideCapacityNumber.textContent = capacity;
    if (elements.guideCapacityText) elements.guideCapacityText.textContent = `${capacity}개`;
  }

  function selectStage(stageId) {
    currentStage = Stages.getStage(stageId);
    localStorage.setItem(STAGE_KEY, String(currentStage.id));
  }

  function restart(announce = true) {
    clearDrag();
    document.querySelectorAll(".moving-slice, .moving-frog").forEach((movingElement) => movingElement.remove());
    sessionId += 1;
    const sound = state?.sound ?? true;
    state = newState();
    state.sound = sound;
    elements.result.classList.add("hidden");
    syncStageInfo();
    syncSoundButtons();
    refillRack(announce);
    render();
  }

  function toggleSound() {
    state.sound = !state.sound;
    syncSoundButtons();
    if (state.sound) playTone(520, .08, "sine");
  }

  function startGame() {
    elements.guide.classList.add("hidden");
    elements.home.classList.add("screen-hidden");
    elements.gameShell.classList.remove("screen-hidden");
    document.body.classList.remove("menu-open");
    playTone(520, .08, "sine");
    elements.homeButton.focus();
  }

  function showHome(focusPlay = false) {
    elements.guide.classList.add("hidden");
    elements.result.classList.add("hidden");
    elements.toast.classList.remove("show");
    elements.gameShell.classList.add("screen-hidden");
    elements.home.classList.remove("screen-hidden");
    document.body.classList.add("menu-open");
    if (focusPlay) elements.play.focus();
  }

  function openGuide() {
    elements.guide.classList.remove("hidden");
    elements.guideClose.focus();
  }

  function closeGuide() {
    elements.guide.classList.add("hidden");
    elements.guideButton.focus();
  }

  function handleResultAction() {
    if (resultAction === "homeAfterClear") {
      if (currentStage.nextStageId) selectStage(currentStage.nextStageId);
      restart(false);
      showHome(true);
      return;
    }
    restart(true);
  }

  function resetDebugData() {
    const confirmed = window.confirm("스테이지 진행도, 최고 점수, 편집기 저장 데이터를 모두 초기화할까요?");
    if (!confirmed) return;

    const cakeLinkKeys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("cakeLink.")) cakeLinkKeys.push(key);
    }
    cakeLinkKeys.forEach((key) => localStorage.removeItem(key));
    currentStage = Stages.getStage(1);
    resultAction = "retry";
    restart(false);
    showHome(true);
    showToast("케이크 링크 데이터를 초기화했어요");
  }

  function setupDebugStageSelect() {
    if (!elements.debugStage) return;
    elements.debugStage.innerHTML = Object.values(Stages.STAGES).map((stage) => {
      const gimmick = gimmickPresentation(stage);
      const suffix = gimmick.label ? ` · ${gimmick.label}` : "";
      return `<option value="${stage.id}">${stage.id}${suffix}</option>`;
    }).join("");
    elements.debugStage.value = String(currentStage.id);
    elements.debugStage.addEventListener("change", () => {
      selectStage(Number(elements.debugStage.value));
      resultAction = "retry";
      restart(false);
      showHome(true);
      showToast(`${currentStage.title}로 이동했어요`);
    });
  }

  elements.restart.addEventListener("click", () => restart(true));
  elements.retry.addEventListener("click", handleResultAction);
  elements.sound.addEventListener("click", toggleSound);
  elements.homeSound.addEventListener("click", toggleSound);
  elements.play.addEventListener("click", startGame);
  elements.debugReset.addEventListener("click", resetDebugData);
  elements.guidePlay.addEventListener("click", startGame);
  elements.guideButton.addEventListener("click", openGuide);
  elements.guideClose.addEventListener("click", closeGuide);
  elements.guide.addEventListener("click", (event) => {
    if (event.target === elements.guide) closeGuide();
  });
  elements.homeButton.addEventListener("click", () => {
    restart(false);
    showHome(true);
  });

  document.addEventListener("pointermove", moveDrag, { passive: false });
  document.addEventListener("pointerup", finishDrag, { passive: false });
  document.addEventListener("pointercancel", clearDrag);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.guide.classList.contains("hidden")) closeGuide();
  });
  window.addEventListener("blur", clearDrag);

  setupDebugStageSelect();
  restart(false);
  showHome();
})();
