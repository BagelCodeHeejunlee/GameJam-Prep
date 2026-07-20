(() => {
  "use strict";

  const Engine = window.CakeLinkEngine;
  const CAKES = {
    berry: { name: "딸기", emoji: "🍓", color: "#f07483" },
    blueberry: { name: "블루베리", emoji: "🫐", color: "#8b78c7" },
    lemon: { name: "레몬", emoji: "🍋", color: "#f2c85a" },
    matcha: { name: "말차", emoji: "🍵", color: "#79a86d" },
    choco: { name: "초코", emoji: "🍫", color: "#8b5945" },
  };
  const EMPTY_COLOR = "#eee4d6";
  const BEST_KEY = "cakeLink.v1.bestScore";
  const MAX_SWAPS = 3;
  const STAGE_CONFIG = Object.freeze({
    1: Object.freeze({ id: 1, title: "스테이지 1", difficulty: "쉬움", seed: 4416 }),
  });
  const CURRENT_STAGE_ID = 1;
  const currentStage = STAGE_CONFIG[CURRENT_STAGE_ID];
  const STARTER_DECK = [
    { berry: 3 }, { berry: 2, blueberry: 1 }, { matcha: 3 },
    { berry: 2, lemon: 1 }, { matcha: 2, choco: 1 }, { blueberry: 3 },
    { lemon: 3 }, { berry: 1, blueberry: 2 }, { matcha: 2, lemon: 1 },
    { choco: 3 }, { lemon: 2, berry: 1 }, { blueberry: 2, choco: 1 },
    { matcha: 3 }, { choco: 2, lemon: 1 }, { berry: 3 },
    { blueberry: 3 }, { matcha: 2, berry: 1 }, { lemon: 3 },
  ];

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    home: $("#homeScreen"), gameShell: $("#gameShell"), play: $("#playButton"),
    homeButton: $("#homeButton"), homeSound: $("#homeSoundButton"),
    guideButton: $("#guideButton"), guide: $("#guideOverlay"),
    guideClose: $("#guideCloseButton"), guidePlay: $("#guidePlayButton"),
    stageTitle: $("#currentStageTitle"), stageDifficulty: $("#stageDifficulty"),
    board: $("#board"), rack: $("#rack"), swap: $("#swapLabel"),
    hint: $("#boardHint"), toast: $("#toast"), sound: $("#soundButton"),
    restart: $("#restartButton"), result: $("#resultOverlay"), retry: $("#retryButton"),
    resultCompleted: $("#resultCompleted"), resultScore: $("#resultScore"),
  };

  let state;
  let toastTimer;
  let audioContext;
  let sessionId = 0;
  let dragGesture = null;

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
    return {
      board: Array(Engine.BOARD_SIZE ** 2).fill(null),
      rack: [], batch: 0, deckIndex: 0, nextId: 1,
      completed: 0, score: 0, swaps: MAX_SWAPS, busy: false,
      sound: true, random, activeCells: new Set(), completeCells: new Set(),
      rotations: Array(Engine.BOARD_SIZE ** 2).fill(0),
      best: Number(localStorage.getItem(BEST_KEY) || 0),
    };
  }

  function plate(pieces) {
    return { id: state.nextId++, pieces: { ...pieces } };
  }

  function generatedPlate(slot) {
    if (state.deckIndex < STARTER_DECK.length) return plate(STARTER_DECK[state.deckIndex++]);
    const order = Engine.CAKE_ORDER;
    const primary = order[(state.batch + Math.floor(slot / 2)) % order.length];
    const secondary = order[(order.indexOf(primary) + 1 + Math.floor(state.random() * 3)) % order.length];
    const mainCount = 2 + Math.floor(state.random() * 3);
    const pieces = { [primary]: mainCount };
    if (mainCount < 5 && state.random() < .52) pieces[secondary] = 1;
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

  function plateMarkup(plateData, rotation = 0) {
    const slots = slotsFor(plateData);
    const gradient = `conic-gradient(from -30deg, ${slots.map((type, index) => {
      const start = index * 60;
      return `${type ? CAKES[type].color : EMPTY_COLOR} ${start}deg ${start + 60}deg`;
    }).join(", ")})`;
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

  function renderBoard() {
    elements.board.classList.remove("ready");
    elements.board.innerHTML = state.board.map((plateData, index) => {
      const row = Math.floor(index / 4) + 1;
      const col = index % 4 + 1;
      const classes = ["cell", plateData ? "occupied" : "empty"];
      if (state.activeCells.has(index)) classes.push("active");
      if (state.completeCells.has(index)) classes.push("complete");
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

  function render() {
    renderBoard();
    renderRack();
    elements.swap.textContent = state.swaps;
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
    const difference = toIndex - fromIndex;
    if (difference === 1) return 0;
    if (difference === Engine.BOARD_SIZE) return 90;
    if (difference === -1) return 180;
    return -90;
  }

  function slotIndexFor(plateData, type) {
    return slotsFor(plateData).lastIndexOf(type);
  }

  function receivingSlotIndex(plateData, openType) {
    const slots = slotsFor(plateData);
    const emptyIndex = slots.findIndex((type) => type === null);
    if (emptyIndex >= 0) return emptyIndex;
    if (openType) return slots.findIndex((type) => type === openType);
    return 0;
  }

  function rotatePlateToward(index, slotIndex, direction) {
    if (slotIndex < 0) return;
    const current = state.rotations[index] || 0;
    const desired = direction - slotIndex * 60;
    const rotation = nearestRotation(current, desired);
    state.rotations[index] = rotation;
    const wheel = elements.board.querySelector(`[data-cell="${index}"] .cake-wheel`);
    if (wheel) wheel.style.setProperty("--wheel-rotation", `${rotation}deg`);
  }

  async function alignPlates(fromIndex, toIndex, type, receiverOpenType) {
    const direction = directionDegrees(fromIndex, toIndex);
    rotatePlateToward(fromIndex, slotIndexFor(state.board[fromIndex], type), direction);
    rotatePlateToward(toIndex, receivingSlotIndex(state.board[toIndex], receiverOpenType), direction + 180);
    state.activeCells = new Set([fromIndex, toIndex]);
    elements.board.querySelector(`[data-cell="${fromIndex}"]`)?.classList.add("transferring");
    elements.board.querySelector(`[data-cell="${toIndex}"]`)?.classList.add("receiving");
    await wait(125);
  }

  async function flySlice(fromIndex, toIndex, type, laneIndex = 0, laneCount = 1) {
    const fromCell = elements.board.querySelector(`[data-cell="${fromIndex}"]`);
    const toCell = elements.board.querySelector(`[data-cell="${toIndex}"]`);
    if (!fromCell || !toCell) return;
    const fromRect = fromCell.getBoundingClientRect();
    const toRect = toCell.getBoundingClientRect();
    const fromX = fromRect.left + fromRect.width / 2;
    const fromY = fromRect.top + fromRect.height / 2;
    const toX = toRect.left + toRect.width / 2;
    const toY = toRect.top + toRect.height / 2;
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const distance = Math.hypot(deltaX, deltaY) || 1;
    const travelAngle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const edgeOffset = Math.min(fromRect.width, fromRect.height) * .27;
    const laneOffset = (laneIndex - (laneCount - 1) / 2) * Math.min(9, fromRect.width * .09);
    const perpendicularX = -unitY;
    const perpendicularY = unitX;
    const startX = fromX + unitX * edgeOffset + perpendicularX * laneOffset;
    const startY = fromY + unitY * edgeOffset + perpendicularY * laneOffset;
    const endX = toX - unitX * edgeOffset + perpendicularX * laneOffset;
    const endY = toY - unitY * edgeOffset + perpendicularY * laneOffset;
    const middleX = (startX + endX) / 2;
    const middleY = (startY + endY) / 2 - 10;

    const movingSlice = document.createElement("div");
    movingSlice.className = "moving-slice";
    movingSlice.style.setProperty("--slice-color", CAKES[type].color);
    movingSlice.dataset.emoji = CAKES[type].emoji;
    movingSlice.style.left = `${startX}px`;
    movingSlice.style.top = `${startY}px`;
    document.body.appendChild(movingSlice);

    const travel = movingSlice.animate([
      { transform: `translate(-50%, -50%) scale(.92) rotate(${travelAngle - 4}deg)`, left: `${startX}px`, top: `${startY}px` },
      { transform: `translate(-50%, -72%) scale(1.08) rotate(${travelAngle + 3}deg)`, left: `${middleX}px`, top: `${middleY}px`, offset: .52 },
      { transform: `translate(-50%, -50%) scale(.92) rotate(${travelAngle}deg)`, left: `${endX}px`, top: `${endY}px` },
    ], { duration: 150, easing: "cubic-bezier(.3,.7,.25,1)", fill: "forwards" });
    await travel.finished.catch(() => {});
    movingSlice.remove();
  }

  async function flySliceGroup(fromIndex, toIndex, type, count) {
    playTone(560, .06, "sine");
    await Promise.all(Array.from({ length: count }, (_, index) =>
      flySlice(fromIndex, toIndex, type, index, count)
    ));
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

  function moveOnePiece(board, fromIndex, toIndex, type) {
    removeOnePiece(board, fromIndex, type);
    addOnePiece(board, toIndex, type);
  }

  function transferSignature(step) {
    const displaced = step.displaced
      ? `${step.displaced.from}>${step.displaced.to}:${step.displaced.type}`
      : "none";
    return `${step.from}>${step.to}:${step.type}|${displaced}`;
  }

  function groupAnimationSteps(steps) {
    const groups = [];
    for (const step of steps) {
      const previous = groups.at(-1);
      if (previous && transferSignature(previous[0]) === transferSignature(step)) previous.push(step);
      else groups.push([step]);
    }
    return groups;
  }

  async function animateResolution(events, activeSession) {
    const groups = groupAnimationSteps(Engine.buildAnimationSteps(events));
    for (const group of groups) {
      const step = group[0];
      if (activeSession !== sessionId) return false;
      await alignPlates(step.from, step.to, step.type, step.displaced?.type || null);
      if (activeSession !== sessionId) return false;

      if (step.displaced) {
        await flySliceGroup(step.from, step.to, step.type, group.length);
        const destinationIsFull = Engine.totalPieces(state.board[step.displaced.to]) >= Engine.PLATE_CAPACITY;
        await alignPlates(step.displaced.from, step.displaced.to, step.displaced.type, destinationIsFull ? step.type : null);
        if (activeSession !== sessionId) return false;
        await flySliceGroup(step.displaced.from, step.displaced.to, step.displaced.type, group.length);
        for (const groupedStep of group) {
          moveOnePiece(state.board, groupedStep.from, groupedStep.to, groupedStep.type);
          moveOnePiece(state.board, groupedStep.displaced.from, groupedStep.displaced.to, groupedStep.displaced.type);
        }
      } else {
        for (const groupedStep of group) removeOnePiece(state.board, groupedStep.from, groupedStep.type);
        renderBoard();
        await wait(8);
        await flySliceGroup(step.from, step.to, step.type, group.length);
        for (const groupedStep of group) addOnePiece(state.board, groupedStep.to, groupedStep.type);
      }

      renderBoard();
      await wait(12);
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
    if (state.busy || state.board[cellIndex]) return;
    const chosen = state.rack[rackIndex];
    if (!chosen) return;
    const activeSession = sessionId;

    state.busy = true;
    state.board[cellIndex] = chosen;
    state.rotations[cellIndex] = 0;
    state.rack[rackIndex] = null;
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

    if (result.completed.length) {
      state.completeCells = new Set(result.completed);
      state.completed += result.completed.length;
      const combo = result.completed.length;
      state.score += 240 * combo + 90 * Math.max(0, combo - 1);
      playComplete(combo);
      render();
      showToast(combo > 1 ? `${combo}판 연쇄 완성!` : "케이크 한 판 완성!");
      await wait(420);
      if (activeSession !== sessionId) return;
    } else if (result.emptied.length) {
      showToast("빈 판이 정리됐어요");
    }

    state.board = result.board;
    state.board.forEach((plateData, index) => { if (!plateData) state.rotations[index] = 0; });
    state.activeCells.clear();
    state.completeCells.clear();

    if (state.rack.every((item) => !item)) refillRack();
    state.best = Math.max(state.best, state.score);
    localStorage.setItem(BEST_KEY, String(state.best));
    state.busy = false;
    render();

    if (state.board.every(Boolean)) endGame();
  }

  function endGame() {
    elements.resultCompleted.textContent = `${state.completed}판`;
    elements.resultScore.textContent = state.score.toLocaleString("ko-KR");
    elements.result.classList.remove("hidden");
    playTone(190, .25, "triangle");
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

  function restart(announce = true) {
    clearDrag();
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

  elements.restart.addEventListener("click", () => restart(true));
  elements.retry.addEventListener("click", () => restart(true));
  elements.sound.addEventListener("click", toggleSound);
  elements.homeSound.addEventListener("click", toggleSound);
  elements.play.addEventListener("click", startGame);
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
