(() => {
  "use strict";

  const Engine = window.CakeLinkEngine;
  const Stages = window.CakeLinkStages;
  const Motion = window.CakeLinkMotion;
  const CAKES = {
    berry: { name: "딸기", emoji: "🍓", color: "#f07483" },
    blueberry: { name: "블루베리", emoji: "🫐", color: "#8b78c7" },
    lemon: { name: "레몬", emoji: "🍋", color: "#f2c85a" },
    matcha: { name: "말차", emoji: "🍵", color: "#79a86d" },
    choco: { name: "초코", emoji: "🍫", color: "#8b5945" },
  };
  const EMPTY_COLOR = "#eee4d6";
  const BEST_KEY = "cakeLink.v1.bestScore";
  const STAGE_KEY = "cakeLink.v1.currentStage";

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    home: $("#homeScreen"), gameShell: $("#gameShell"), play: $("#playButton"),
    debugReset: $("#debugResetButton"),
    homeButton: $("#homeButton"), homeSound: $("#homeSoundButton"),
    guideButton: $("#guideButton"), guide: $("#guideOverlay"),
    guideClose: $("#guideCloseButton"), guidePlay: $("#guidePlayButton"),
    stageTitle: $("#currentStageTitle"), stageDifficulty: $("#stageDifficulty"),
    stageGoalPreview: $("#stageGoalPreview"), goalProgress: $("#goalProgress"),
    movesCounter: $("#movesCounter"), movesRemaining: $("#movesRemaining"),
    board: $("#board"), rack: $("#rack"), swap: $("#swapLabel"),
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
      board[initial.index] = { id: nextId++, pieces: { ...initial.pieces } };
    }
    return {
      board,
      rack: [], batch: 0, deckIndex: 0, nextId,
      completed: 0, completedByType: {}, score: 0, swaps: currentStage.swaps,
      movesRemaining: currentStage.moveLimit, busy: false,
      sound: true, random, activeCells: new Set(), completeCells: new Set(), emptyCells: new Set(),
      transitionCells: new Set(),
      rotations: Array(Engine.BOARD_SIZE ** 2).fill(0),
      best: Number(localStorage.getItem(BEST_KEY) || 0),
    };
  }

  function plate(pieces) {
    return { id: state.nextId++, pieces: { ...pieces } };
  }

  function generatedPlate(slot) {
    if (state.deckIndex < currentStage.openingRack.length) {
      return plate(currentStage.openingRack[state.deckIndex++]);
    }
    const pieces = Stages.createWeightedPlate(currentStage, state.random);
    state.deckIndex += 1;
    return plate(pieces);
  }

  function refillRack(announce = true) {
    state.batch += 1;
    state.rack = [0, 1, 2].map((slot) => generatedPlate(slot));
    if (announce) showToast(`${state.batch}번째 판 묶음이 도착했어요`);
  }

  function slotsFor(plateData) {
    const slots = [];
    for (const type of Engine.CAKE_ORDER) {
      for (let count = 0; count < (plateData?.pieces[type] || 0); count += 1) slots.push(type);
    }
    while (slots.length < Engine.PLATE_CAPACITY) slots.push(null);
    return slots.slice(0, Engine.PLATE_CAPACITY);
  }

  function gradientForSlots(slots) {
    return `conic-gradient(from -30deg, ${slots.map((type, index) => {
      const start = index * 60;
      return `${type ? CAKES[type].color : EMPTY_COLOR} ${start}deg ${start + 60}deg`;
    }).join(", ")})`;
  }

  function plateMarkup(plateData, rotation = 0) {
    const slots = slotsFor(plateData);
    const gradient = gradientForSlots(slots);
    const counts = Object.entries(plateData?.pieces || {})
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `<span title="${CAKES[type].name} ${count}개">${CAKES[type].emoji}${count}</span>`)
      .join("");
    const emptyClass = Engine.totalPieces(plateData) ? "" : " empty-plate";
    return `<div class="cake-plate${emptyClass}" aria-hidden="true"><div class="cake-wheel" style="--cake-gradient:${gradient};--wheel-rotation:${rotation}deg"></div><div class="plate-counts">${counts}</div></div>`;
  }

  function plateLabel(plateData) {
    return Object.entries(plateData.pieces)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${CAKES[type].name} ${count}개`)
      .join(", ");
  }

  function isPlayableCell(index) {
    const row = Math.floor(index / Engine.BOARD_SIZE);
    const column = index % Engine.BOARD_SIZE;
    return currentStage.boardMask[row]?.[column] === "1";
  }

  function isBoardFull() {
    return state.board.every((plateData, index) => !isPlayableCell(index) || Boolean(plateData));
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
      const classes = ["cell", plateData ? "occupied" : "empty"];
      if (state.activeCells.has(index)) classes.push("active");
      if (state.completeCells.has(index)) classes.push("complete");
      if (state.emptyCells.has(index)) classes.push("emptying");
      if (state.transitionCells.has(index)) classes.push("sorting");
      const label = plateData ? `${row}행 ${col}열, ${plateLabel(plateData)}` : `${row}행 ${col}열, 빈칸`;
      return `<div class="${classes.join(" ")}" role="gridcell" data-cell="${index}" aria-label="${label}">${plateData ? plateMarkup(plateData, state.rotations[index]) : ""}</div>`;
    }).join("");
  }

  function renderRack() {
    elements.rack.innerHTML = state.rack.map((plateData, index) => {
      if (!plateData) return `<div class="rack-card used" aria-label="사용한 자리"><span>사용 완료</span></div>`;
      return `<div class="rack-card" role="group" data-rack="${index}" aria-label="${plateLabel(plateData)} 판. 빈칸으로 끌어서 놓으세요.">${plateMarkup(plateData)}<button class="swap-button" type="button" data-swap="${index}" ${state.swaps <= 0 || state.busy ? "disabled" : ""} aria-label="이 판 교체">↻</button></div>`;
    }).join("");

    elements.rack.querySelectorAll(".rack-card[data-rack]").forEach((card) => {
      card.addEventListener("pointerdown", (event) => beginDrag(event, Number(card.dataset.rack), card));
    });
    elements.rack.querySelectorAll(".swap-button").forEach((button) => {
      button.addEventListener("pointerdown", (event) => event.stopPropagation());
      button.addEventListener("click", (event) => { event.stopPropagation(); swapPlate(Number(button.dataset.swap)); });
    });
  }

  function goalMarkup(showProgress) {
    return Stages.goalEntries(currentStage).map(([type, target]) => {
      const completed = Math.min(state?.completedByType[type] || 0, target);
      const count = showProgress ? `${completed}/${target}` : `${target}판`;
      return `<span class="goal-chip" title="${CAKES[type].name} 케이크 ${target}판"><span aria-hidden="true">${CAKES[type].emoji}</span><b>${count}</b></span>`;
    }).join("");
  }

  function renderGoals() {
    elements.stageGoalPreview.innerHTML = goalMarkup(false);
    elements.goalProgress.innerHTML = goalMarkup(true);
  }

  function render() {
    renderBoard();
    renderRack();
    renderGoals();
    elements.swap.textContent = state.swaps;
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
    const candidate = document.elementFromPoint(ghostX, ghostY)?.closest(".cell.empty");
    dragGesture.targetCell = candidate ? Number(candidate.dataset.cell) : null;
    candidate?.classList.add("drop-target");
    elements.hint.textContent = candidate ? "여기에 놓을까요?" : "판을 빈칸 위까지 끌어주세요";
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
    document.querySelector(".cell.drop-target")?.classList.remove("drop-target");
    dragGesture.card.classList.remove("dragging");
    dragGesture.ghost.remove();
    dragGesture = null;
    document.body.classList.remove("is-dragging");
    elements.board.classList.remove("ready");
    elements.hint.textContent = "판을 위로 끌어 빈칸에 놓으세요";
  }

  function nearestRotation(current, desired) {
    let result = desired;
    while (result - current > 180) result -= 360;
    while (result - current < -180) result += 360;
    return result;
  }

  function directionDegrees(fromIndex, toIndex) {
    const fromRow = Math.floor(fromIndex / Engine.BOARD_SIZE);
    const fromColumn = fromIndex % Engine.BOARD_SIZE;
    const toRow = Math.floor(toIndex / Engine.BOARD_SIZE);
    const toColumn = toIndex % Engine.BOARD_SIZE;
    // CSS conic gradients start at twelve o'clock, while atan2 starts at three.
    return Math.atan2(toRow - fromRow, toColumn - fromColumn) * 180 / Math.PI + 90;
  }

  function slotIndexFor(plateData, type) {
    return slotsFor(plateData).lastIndexOf(type);
  }

  function playRotation(element, turn) {
    if (!element || turn.duration <= 1) return Promise.resolve();
    const animation = element.animate(turn.points.map((point) => ({
      transform: `rotate(${point.angle}deg)`,
      offset: point.offset,
      easing: point.easing,
    })), {
      duration: turn.duration,
      easing: "linear",
      fill: "both",
    });
    return animation.finished.catch(() => {}).finally(() => animation.cancel());
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
    const geometry = Motion.createSliceGroupGeometry({ lastSlot, count });
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
        addOnePiece(board, transfer.to, transfer.type);
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
      const sourceKey = slotKey(transfer.from, transfer.type);
      const targetKey = slotKey(transfer.to, transfer.type);
      sourceTotals.set(sourceKey, (sourceTotals.get(sourceKey) || 0) + transfer.count);
      targetTotals.set(targetKey, (targetTotals.get(targetKey) || 0) + transfer.count);
    }

    const plans = transfers.map((transfer) => {
      const fromCell = elements.board.querySelector(`[data-cell="${transfer.from}"]`);
      const toCell = elements.board.querySelector(`[data-cell="${transfer.to}"]`);
      const sourceWheel = fromCell?.querySelector(".cake-wheel");
      const targetWheel = toCell?.querySelector(".cake-wheel");
      const sourceKey = slotKey(transfer.from, transfer.type);
      const targetKey = slotKey(transfer.to, transfer.type);
      const sourceBlockLast = slotIndexFor(beforeBoard[transfer.from], transfer.type);
      const targetBlockLast = slotIndexFor(afterBoard[transfer.to], transfer.type);
      const sourceOffset = sourceOffsets.get(sourceKey) || 0;
      const targetOffset = targetOffsets.get(targetKey) || 0;
      const sourceFirst = sourceBlockLast - sourceTotals.get(sourceKey) + 1 + sourceOffset;
      const targetFirst = targetBlockLast - targetTotals.get(targetKey) + 1 + targetOffset;
      const sourceLast = sourceFirst + transfer.count - 1;
      const targetLast = targetFirst + transfer.count - 1;
      sourceOffsets.set(sourceKey, sourceOffset + transfer.count);
      targetOffsets.set(targetKey, targetOffset + transfer.count);
      const route = transferRoute(beforeBoard, transfer.from, transfer.to);
      return {
        ...transfer,
        sourceWheel,
        targetWheel,
        sourceLast,
        sourceFirst,
        targetLast,
        targetFirst,
        route,
        laneOffset: 0,
      };
    });
    for (let first = 0; first < plans.length; first += 1) {
      for (let second = first + 1; second < plans.length; second += 1) {
        if (plans[first].from === plans[second].to && plans[first].to === plans[second].from) {
          plans[first].laneOffset = .55;
          plans[second].laneOffset = .55;
        }
      }
    }
    return plans;
  }

  function desiredPlateRotations(plans) {
    const outgoing = new Set(plans.map((plan) => plan.from));
    const rotations = new Map();

    for (const plan of plans) {
      if (rotations.has(plan.from)) continue;
      const firstHop = plan.route?.[1] ?? plan.to;
      const desired = directionDegrees(plan.from, firstHop) - plan.sourceLast * 60;
      rotations.set(plan.from, nearestRotation(state.rotations[plan.from] || 0, desired));
    }
    for (const plan of plans) {
      if (outgoing.has(plan.to) || rotations.has(plan.to)) continue;
      const sourceRotation = rotations.get(plan.from) ?? state.rotations[plan.from] ?? 0;
      const sourcePhysicalAngle = sourceRotation + plan.sourceLast * 60;
      const desired = sourcePhysicalAngle - plan.targetLast * 60;
      rotations.set(plan.to, nearestRotation(state.rotations[plan.to] || 0, desired));
    }
    for (const plan of plans) {
      if (!rotations.has(plan.to)) rotations.set(plan.to, state.rotations[plan.to] || 0);
    }
    return rotations;
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

  function createEmptyBackdrop(sourceWheel, rect, currentRotation, desiredRotation) {
    const layer = document.createElement("div");
    layer.className = "moving-slice plate-transition-backdrop";
    layer.setAttribute("aria-hidden", "true");
    setLayerRect(layer, rect);
    const visual = sourceWheel.cloneNode(false);
    visual.classList.add("plate-transition-wheel");
    visual.style.setProperty("--cake-gradient", gradientForSlots(Array(Engine.PLATE_CAPACITY).fill(null)));
    layer.appendChild(visual);
    document.body.appendChild(layer);
    const target = nearestRotation(currentRotation, desiredRotation);
    return {
      layer,
      start: () => {
        visual.style.setProperty("--wheel-rotation", `${target}deg`);
        return playRotation(visual, Motion.createRotationMotion({
          current: currentRotation,
          target,
          reducedMotion: reducedMotion(),
        }));
      },
    };
  }

  function createPlatePreparation(index, beforePlate, afterPlate, desiredRotation, hasOutgoing) {
    const wheel = elements.board.querySelector(`[data-cell="${index}"] .cake-wheel`);
    if (!wheel) {
      return { index, layers: [], align: () => Promise.resolve(), reflow: () => Promise.resolve() };
    }
    const rect = layoutRect(wheel);
    const currentRotation = state.rotations[index] || 0;
    const transition = Motion.createSlotTransition({
      beforeSlots: slotsFor(beforePlate),
      afterSlots: slotsFor(afterPlate),
    });
    const backdrop = createEmptyBackdrop(wheel, rect, currentRotation, desiredRotation);
    const retained = transition.retained.map((group) => {
      const layer = createMovingSlice(wheel, group.fromLast, group.count, "plate-transition-retained");
      setLayerRect(layer, rect);
      document.body.appendChild(layer);
      const visual = layer.querySelector(".moving-slice-visual");
      const baseRotation = nearestRotation(currentRotation, desiredRotation);
      const targetRotation = Motion.createSlotReflowRotation({
        baseRotation,
        fromFirst: group.fromFirst,
        toFirst: group.toFirst,
      });
      return {
        layer,
        align: () => {
          visual.style.setProperty("--wheel-rotation", `${baseRotation}deg`);
          return playRotation(visual, Motion.createRotationMotion({
            current: currentRotation,
            target: baseRotation,
            reducedMotion: reducedMotion(),
          }));
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
      align: () => Promise.all([backdrop.start(), ...retained.map((item) => item.align())]),
      reflow: (duration) => Promise.all(retained.map((item) => item.reflow(duration))),
    };
  }

  function createTransferVisual(plan, rotations) {
    if (!plan.sourceWheel || !plan.targetWheel || plan.sourceLast < 0 || plan.targetLast < 0) return null;
    const fromRect = layoutRect(plan.sourceWheel);
    const toRect = layoutRect(plan.targetWheel);
    const rects = routeRects(plan.route, fromRect, toRect, fromRect.width * plan.laneOffset);
    const flight = Motion.createRoutedFlightMotion({ rects, reducedMotion: reducedMotion() });
    const layer = createMovingSlice(plan.sourceWheel, plan.sourceLast, plan.count, "flying-transfer");
    setLayerRect(layer, fromRect);
    document.body.appendChild(layer);
    const visual = layer.querySelector(".moving-slice-visual");
    const currentRotation = state.rotations[plan.from] || 0;
    const sourceRotation = rotations.get(plan.from) ?? currentRotation;
    const rawLandingRotation = (rotations.get(plan.to) || 0) + (plan.targetFirst - plan.sourceFirst) * 60;
    const landingRotation = nearestRotation(sourceRotation, rawLandingRotation);
    return {
      from: plan.from,
      to: plan.to,
      duration: flight.duration,
      layer,
      align: () => {
        visual.style.setProperty("--wheel-rotation", `${sourceRotation}deg`);
        layer.dataset.visualRotation = String(sourceRotation);
        return playRotation(visual, Motion.createRotationMotion({
          current: currentRotation,
          target: sourceRotation,
          reducedMotion: reducedMotion(),
        }));
      },
      fly: async () => {
        const travel = layer.animate(flight.points.map((point) => ({
          transform: `translate3d(${point.x - flight.start.x}px, ${point.y - flight.start.y}px, 0)`,
          offset: point.offset,
        })), {
          duration: flight.duration,
          delay: flight.delay,
          easing: flight.easing,
          fill: "forwards",
        });
        const turn = playTimedRotation(
          visual,
          sourceRotation,
          landingRotation,
          flight.duration,
          flight.easing,
        );
        await Promise.all([travel.finished.catch(() => {}), turn]);
      },
    };
  }

  async function animateTransferBatch(transfers, activeSession) {
    const beforeBoard = Engine.cloneBoard(state.board);
    const afterBoard = Engine.cloneBoard(state.board);
    applyTransfers(afterBoard, transfers);
    const plans = buildTransferPlans(transfers, beforeBoard, afterBoard);
    const rotations = desiredPlateRotations(plans);
    const involved = new Set(transfers.flatMap((transfer) => [transfer.from, transfer.to]));
    const outgoing = new Set(transfers.map((transfer) => transfer.from));
    const visuals = plans.map((plan) => createTransferVisual(plan, rotations)).filter(Boolean);
    const preparations = [...involved].map((index) => createPlatePreparation(
      index,
      beforeBoard[index],
      afterBoard[index],
      rotations.get(index) ?? state.rotations[index] ?? 0,
      outgoing.has(index),
    ));
    const layers = [
      ...visuals.map((visual) => visual.layer),
      ...preparations.flatMap((preparation) => preparation.layers),
    ];

    state.transitionCells = involved;
    state.board = afterBoard;
    for (const [index, rotation] of rotations) state.rotations[index] = rotation;
    renderBoard();

    try {
      await Promise.all([
        ...preparations.map((preparation) => preparation.align()),
        ...visuals.map((visual) => visual.align()),
      ]);
      if (activeSession !== sessionId) return false;
      await Promise.all([
        ...visuals.map((visual) => visual.fly()),
        ...preparations.map((preparation) => {
          const durations = visuals
            .filter((visual) => visual.from === preparation.index || visual.to === preparation.index)
            .map((visual) => visual.duration);
          return preparation.reflow(durations.length ? Math.min(...durations) : 1);
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

  function swapPlate(index) {
    if (state.busy || state.swaps <= 0 || !state.rack[index]) return;
    state.swaps -= 1;
    state.rack[index] = generatedPlate(index);
    playTone(330, .08, "triangle");
    showToast("새로운 판으로 교체했어요");
    render();
  }

  async function placeRackAt(rackIndex, cellIndex) {
    if (state.busy || state.movesRemaining <= 0 || !isPlayableCell(cellIndex) || state.board[cellIndex]) return;
    const chosen = state.rack[rackIndex];
    if (!chosen) return;
    const activeSession = sessionId;

    state.busy = true;
    state.board[cellIndex] = chosen;
    state.rotations[cellIndex] = 0;
    state.rack[rackIndex] = null;
    state.movesRemaining -= 1;
    state.score += 10;
    state.activeCells = new Set([cellIndex]);
    playTone(245, .08, "sine");
    render();
    await wait(120);
    if (activeSession !== sessionId) return;

    let result;
    try {
      result = Engine.resolvePlacement(state.board, cellIndex);
    } catch (error) {
      console.error(error);
      result = { board: state.board, settledBoard: state.board, events: [], completed: [], emptied: [] };
    }

    if (result.events.length) {
      const animationFinished = await animateResolution(result.events, activeSession);
      if (!animationFinished || activeSession !== sessionId) return;
      state.board = result.settledBoard;
      state.activeCells.clear();
      playTone(510, .09, "sine");
      renderBoard();
      await wait(45);
    }

    state.emptyCells = new Set(result.emptied);
    if (result.completed.length) {
      state.completeCells = new Set(result.completed);
      state.completed += result.completed.length;
      for (const completedIndex of result.completed) {
        const completedPlate = result.settledBoard[completedIndex];
        const completedType = Object.keys(completedPlate?.pieces || {})
          .find((type) => completedPlate.pieces[type] === Engine.PLATE_CAPACITY);
        if (completedType) {
          state.completedByType[completedType] = (state.completedByType[completedType] || 0) + 1;
        }
      }
      const combo = result.completed.length;
      state.score += 240 * combo + 90 * Math.max(0, combo - 1);
      playComplete(combo);
      render();
      showToast(combo > 1 ? `${combo}판 연쇄 완성!` : "케이크 한 판 완성!");
      await wait(reducedMotion() ? 0 : 520);
      if (activeSession !== sessionId) return;
    } else if (result.emptied.length) {
      render();
      showToast("빈 판이 정리됐어요");
      await wait(reducedMotion() ? 0 : 380);
      if (activeSession !== sessionId) return;
    }

    state.board = result.board;
    state.board.forEach((plateData, index) => { if (!plateData) state.rotations[index] = 0; });
    state.activeCells.clear();
    state.completeCells.clear();
    state.emptyCells.clear();

    const goalMet = Stages.isComplete(currentStage, state.completedByType);
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
    elements.resultMessage.textContent = "모든 케이크 목표를 달성했어요.";
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
  }

  function selectStage(stageId) {
    currentStage = Stages.getStage(stageId);
    localStorage.setItem(STAGE_KEY, String(currentStage.id));
  }

  function restart(announce = true) {
    clearDrag();
    document.querySelectorAll(".moving-slice").forEach((slice) => slice.remove());
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

  restart(false);
  showHome();
})();
