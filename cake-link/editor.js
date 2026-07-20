(() => {
  "use strict";

  const Stages = window.CakeLinkStages;
  const Simulator = window.CakeLinkSimulator;
  const STORAGE_KEY = "cakeLink.stageEditor.v1";
  const COLORS = [
    { id: "berry", name: "딸기", emoji: "🍓", color: "#e86e81" },
    { id: "lemon", name: "레몬", emoji: "🍋", color: "#d6a934" },
    { id: "matcha", name: "말차", emoji: "🍵", color: "#64a274" },
    { id: "choco", name: "초코", emoji: "🍫", color: "#805643" },
    { id: "blueberry", name: "블루베리", emoji: "🫐", color: "#826fc1" },
  ];
  const COLOR_BY_ID = Object.fromEntries(COLORS.map((color) => [color.id, color]));
  const sourceStages = deepClone(Stages.STAGES);
  let drafts = loadDrafts();
  let selectedId = 1;
  let selectedCell = 0;
  let lastResult = null;
  let toastTimer;

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    stageList: $("#stageList"), savedState: $("#savedState"), title: $("#editorTitle"), validation: $("#validationSummary"),
    stageId: $("#stageIdInput"), difficulty: $("#difficultyInput"), moveLimit: $("#moveLimitInput"), swaps: $("#swapsInput"),
    seed: $("#seedInput"), nextStage: $("#nextStageInput"), totalGoals: $("#totalGoalsValue"), movesPerGoal: $("#movesPerGoalValue"),
    playableCells: $("#playableCellsValue"), colorBody: $("#colorTableBody"), colorTotal: $("#colorWeightTotal"),
    board: $("#boardEditor"), cellLabel: $("#selectedCellLabel"), cellActive: $("#cellActiveInput"),
    initialInputs: $("#initialPieceInputs"), initialCapacity: $("#initialCapacity"), opening: $("#openingRackEditor"),
    patternBody: $("#patternTableBody"), patternTotal: $("#patternWeightTotal"), addPattern: $("#addPatternButton"),
    json: $("#jsonEditor"), applyJson: $("#applyJsonButton"), copyStage: $("#copyStageButton"),
    reset: $("#resetStageButton"), save: $("#saveButton"), copyAll: $("#copyAllButton"), toast: $("#toast"),
    skill: $("#skillInput"), runs: $("#runsInput"), runsValue: $("#runsValue"), simulate: $("#simulateButton"),
    simEmpty: $("#simEmpty"), simResults: $("#simResults"), simDifficulty: $("#simDifficulty"),
    clearRate: $("#clearRateValue"), averageMoves: $("#averageMovesValue"), averageProgress: $("#averageProgressValue"),
    clearBar: $("#clearBar"), limitBar: $("#limitBar"), lockedBar: $("#lockedBar"),
    clearLegend: $("#clearLegend"), limitLegend: $("#limitLegend"), lockedLegend: $("#lockedLegend"),
    simInsight: $("#simInsight"), applyDifficulty: $("#applyDifficultyButton"), simulateAll: $("#simulateAllButton"),
    curveBody: $("#curveTableBody"),
  };

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadDrafts() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Object.keys(saved).length === 7) return saved;
    } catch (_) { /* Invalid saved data falls back to source. */ }
    return deepClone(sourceStages);
  }

  function stage() {
    return drafts[selectedId];
  }

  function sum(values) {
    return Object.values(values || {}).reduce((total, value) => total + Number(value || 0), 0);
  }

  function percent(value) {
    return `${(value * 100).toFixed(1)}%`;
  }

  function goalCount(data = stage()) {
    return sum(data.goals);
  }

  function playableCount(data = stage()) {
    return data.boardMask.join("").split("").filter((value) => value === "1").length;
  }

  function initialAt(index, data = stage()) {
    return data.initialPlates.find((plate) => plate.index === index) || null;
  }

  function setCellActive(index, active) {
    const rowIndex = Math.floor(index / 4);
    const columnIndex = index % 4;
    const row = stage().boardMask[rowIndex].split("");
    row[columnIndex] = active ? "1" : "0";
    stage().boardMask[rowIndex] = row.join("");
    if (!active) stage().initialPlates = stage().initialPlates.filter((plate) => plate.index !== index);
  }

  function setInitialPiece(index, color, count) {
    let initial = initialAt(index);
    if (!initial && count > 0) {
      initial = { index, pieces: {} };
      stage().initialPlates.push(initial);
      stage().initialPlates.sort((a, b) => a.index - b.index);
    }
    if (!initial) return;
    if (count > 0) initial.pieces[color] = count;
    else delete initial.pieces[color];
    if (!sum(initial.pieces)) stage().initialPlates = stage().initialPlates.filter((plate) => plate.index !== index);
  }

  function validateStage(data) {
    const errors = [];
    if (!Number.isInteger(data.moveLimit) || data.moveLimit < 1) errors.push("횟수 제한은 1 이상이어야 합니다.");
    const validBoard = Array.isArray(data.boardMask) && data.boardMask.length === 4 && data.boardMask.every((row) => /^[01]{4}$/.test(row));
    if (!validBoard) errors.push("보드 모양은 4×4여야 합니다.");
    if (!data.colors?.length) errors.push("등장 색이 하나 이상 필요합니다.");
    if (validBoard && !playableCount(data)) errors.push("사용 가능한 보드 칸이 하나 이상 필요합니다.");
    if (Math.abs(sum(data.colorWeights) - 100) > .001) errors.push("색상 웨이트 합이 100%가 아닙니다.");
    if (Math.abs(sum(data.platePatternWeights) - 100) > .001) errors.push("판 웨이트 합이 100%가 아닙니다.");
    for (const color of data.colors || []) {
      if (!Object.hasOwn(data.colorWeights, color)) errors.push(`${color} 색상 웨이트가 없습니다.`);
    }
    for (const color of Object.keys(data.colorWeights || {})) {
      if (!data.colors.includes(color)) errors.push(`미등장 색 ${color}의 웨이트가 남아 있습니다.`);
    }

    for (const color of Object.keys(data.goals || {})) {
      if (!data.colors.includes(color)) errors.push(`목표색 ${color}가 등장 색에 없습니다.`);
    }
    for (const initial of data.initialPlates || []) {
      const row = Math.floor(initial.index / 4);
      const column = initial.index % 4;
      if (data.boardMask[row]?.[column] !== "1") errors.push(`${initial.index}번 시작 판이 막힌 칸에 있습니다.`);
      if (sum(initial.pieces) > 6) errors.push(`${initial.index}번 시작 판이 6조각을 넘습니다.`);
      for (const color of Object.keys(initial.pieces)) {
        if (!data.colors.includes(color)) errors.push(`${initial.index}번 시작 판에 미등장 색 ${color}가 있습니다.`);
      }
    }
    for (const [index, plate] of (data.openingRack || []).entries()) {
      if (sum(plate) < 1 || sum(plate) > 6) errors.push(`첫 하단 ${index + 1}번 판은 1~6조각이어야 합니다.`);
      for (const color of Object.keys(plate)) {
        if (!data.colors.includes(color)) errors.push(`첫 하단 ${index + 1}번 판에 미등장 색 ${color}가 있습니다.`);
      }
    }
    if (data.openingRack?.length !== 3) errors.push("첫 하단 판은 정확히 3개여야 합니다.");

    for (const pattern of Object.keys(data.platePatternWeights || {})) {
      if (!/^(?:[a-z][1-6])+$/.test(pattern)) {
        errors.push(`${pattern} 패턴 표기가 올바르지 않습니다.`);
        continue;
      }
      const parsed = Stages.parsePlatePattern(pattern);
      const letterCount = (pattern.match(/[a-z]/g) || []).length;
      if (Object.keys(parsed).length !== letterCount) errors.push(`${pattern}에 같은 문자가 반복됩니다.`);
      if (sum(parsed) > 6) errors.push(`${pattern}은 6조각을 넘습니다.`);
      if (Object.keys(parsed).length > data.colors.length) errors.push(`${pattern}에 배정할 등장 색이 부족합니다.`);
    }
    return errors;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 1800);
  }

  function markChanged() {
    elements.savedState.textContent = "저장 안 됨";
    lastResult = null;
    elements.simEmpty.classList.remove("hidden");
    elements.simResults.classList.add("hidden");
    syncSummary();
    syncJson();
    renderStageList();
  }

  function renderStageList() {
    elements.stageList.innerHTML = Object.values(drafts).map((data) => `
      <button class="stage-select${data.id === selectedId ? " active" : ""}" type="button" data-stage="${data.id}">
        <span><b>스테이지 ${data.id}</b><small>${data.difficulty} · ${goalCount(data)}판</small></span><em>${data.moveLimit}</em>
      </button>
    `).join("");
    elements.stageList.querySelectorAll("[data-stage]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedId = Number(button.dataset.stage);
        selectedCell = 0;
        lastResult = null;
        renderAll();
      });
    });
  }

  function renderBasics() {
    const data = stage();
    elements.title.textContent = data.title;
    elements.stageId.value = data.id;
    elements.difficulty.value = data.difficulty;
    elements.moveLimit.value = data.moveLimit;
    elements.swaps.value = data.swaps;
    elements.seed.value = data.seed;
    elements.nextStage.value = data.nextStageId ?? "";
  }

  function renderColors() {
    const data = stage();
    elements.colorBody.innerHTML = COLORS.map((color) => {
      const active = data.colors.includes(color.id);
      return `<tr>
        <td><span class="color-name"><i class="color-swatch" style="background:${color.color}"></i>${color.emoji} ${color.name}</span></td>
        <td><input class="color-check" type="checkbox" data-color-active="${color.id}" ${active ? "checked" : ""} aria-label="${color.name} 등장"></td>
        <td><input type="number" min="0" max="20" step="1" value="${data.goals[color.id] || 0}" data-goal="${color.id}" aria-label="${color.name} 목표 판"></td>
        <td><input type="number" min="0" max="100" step="0.1" value="${data.colorWeights[color.id] ?? 0}" data-color-weight="${color.id}" ${active ? "" : "disabled"} aria-label="${color.name} 웨이트"></td>
      </tr>`;
    }).join("");

    elements.colorBody.querySelectorAll("[data-color-active]").forEach((input) => {
      input.addEventListener("change", () => {
        const color = input.dataset.colorActive;
        if (input.checked) {
          if (!stage().colors.includes(color)) stage().colors.push(color);
          stage().colorWeights[color] ??= 0;
        } else {
          stage().colors = stage().colors.filter((value) => value !== color);
          delete stage().colorWeights[color];
          delete stage().goals[color];
          stage().initialPlates.forEach((plate) => delete plate.pieces[color]);
          stage().initialPlates = stage().initialPlates.filter((plate) => sum(plate.pieces) > 0);
          stage().openingRack.forEach((plate) => delete plate[color]);
        }
        markChanged();
        renderAll();
      });
    });
    elements.colorBody.querySelectorAll("[data-goal]").forEach((input) => {
      input.addEventListener("change", () => {
        const color = input.dataset.goal;
        const value = Math.max(0, Number(input.value) || 0);
        if (value) {
          stage().goals[color] = value;
          if (!stage().colors.includes(color)) {
            stage().colors.push(color);
            stage().colorWeights[color] ??= 0;
          }
        } else delete stage().goals[color];
        markChanged();
        renderAll();
      });
    });
    elements.colorBody.querySelectorAll("[data-color-weight]").forEach((input) => {
      input.addEventListener("change", () => {
        stage().colorWeights[input.dataset.colorWeight] = Math.max(0, Number(input.value) || 0);
        markChanged();
        renderColors();
      });
    });
  }

  function piecesMarkup(pieces) {
    const entries = Object.entries(pieces || {}).filter(([, count]) => count > 0);
    if (!entries.length) return `<span class="empty-cell-mark">＋</span>`;
    return `<span class="board-cell-pieces">${entries.map(([color, count]) => `<span>${COLOR_BY_ID[color]?.emoji || color}${count}</span>`).join("")}</span>`;
  }

  function renderBoard() {
    const data = stage();
    elements.board.innerHTML = Array.from({ length: 16 }, (_, index) => {
      const row = Math.floor(index / 4);
      const column = index % 4;
      const active = data.boardMask[row][column] === "1";
      const initial = initialAt(index);
      return `<button class="board-cell${active ? "" : " blocked"}${selectedCell === index ? " selected" : ""}" type="button" data-cell="${index}" role="gridcell" aria-label="${index}번 칸, ${active ? "사용" : "막힘"}"><b>${index}</b>${active ? piecesMarkup(initial?.pieces) : "×"}</button>`;
    }).join("");
    elements.board.querySelectorAll("[data-cell]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedCell = Number(button.dataset.cell);
        renderBoard();
        renderCellInspector();
      });
    });
  }

  function renderCellInspector() {
    const row = Math.floor(selectedCell / 4);
    const column = selectedCell % 4;
    const active = stage().boardMask[row][column] === "1";
    const initial = initialAt(selectedCell);
    elements.cellLabel.textContent = `${selectedCell}번 칸`;
    elements.cellActive.checked = active;
    elements.initialInputs.innerHTML = COLORS.map((color) => `
      <label><span>${color.emoji} ${color.name}</span><input type="number" min="0" max="6" step="1" value="${initial?.pieces[color.id] || 0}" data-initial-color="${color.id}" ${active && stage().colors.includes(color.id) ? "" : "disabled"}></label>
    `).join("");
    const count = sum(initial?.pieces);
    elements.initialCapacity.textContent = `${count} / 6`;
    elements.initialCapacity.classList.toggle("over", count > 6);
    elements.initialInputs.querySelectorAll("[data-initial-color]").forEach((input) => {
      input.addEventListener("change", () => {
        setInitialPiece(selectedCell, input.dataset.initialColor, Math.max(0, Math.min(6, Number(input.value) || 0)));
        markChanged();
        renderBoard();
        renderCellInspector();
      });
    });
  }

  function renderOpeningRack() {
    elements.opening.innerHTML = stage().openingRack.map((plate, plateIndex) => `
      <div class="opening-row"><b>${plateIndex + 1}번 판</b>${COLORS.map((color) => `
        <label>${color.emoji} ${color.name}<input type="number" min="0" max="6" step="1" value="${plate[color.id] || 0}" data-opening-index="${plateIndex}" data-opening-color="${color.id}" ${stage().colors.includes(color.id) ? "" : "disabled"}></label>
      `).join("")}</div>
    `).join("");
    elements.opening.querySelectorAll("[data-opening-index]").forEach((input) => {
      input.addEventListener("change", () => {
        const plate = stage().openingRack[Number(input.dataset.openingIndex)];
        const value = Math.max(0, Math.min(6, Number(input.value) || 0));
        if (value) plate[input.dataset.openingColor] = value;
        else delete plate[input.dataset.openingColor];
        markChanged();
        renderOpeningRack();
      });
    });
  }

  function patternMeaning(pattern) {
    const pieces = Stages.parsePlatePattern(pattern);
    const counts = Object.values(pieces);
    return counts.length ? `서로 다른 ${counts.length}색 · ${counts.join("+")}조각` : "표기 오류";
  }

  function renderPatterns() {
    elements.patternBody.innerHTML = Object.entries(stage().platePatternWeights).map(([pattern, weight], index) => `
      <tr><td><input type="text" value="${pattern}" data-pattern-name="${index}" aria-label="판 패턴"></td><td>${patternMeaning(pattern)}</td><td><input type="number" min="0" max="100" step="0.1" value="${weight}" data-pattern-weight="${pattern}" aria-label="${pattern} 웨이트"></td><td><button class="row-delete" type="button" data-pattern-delete="${pattern}" aria-label="${pattern} 삭제">×</button></td></tr>
    `).join("");
    elements.patternBody.querySelectorAll("[data-pattern-name]").forEach((input) => {
      input.addEventListener("change", () => {
        const entries = Object.entries(stage().platePatternWeights);
        const oldPattern = entries[Number(input.dataset.patternName)][0];
        const newPattern = input.value.trim().toLowerCase();
        if (!newPattern || (newPattern !== oldPattern && Object.hasOwn(stage().platePatternWeights, newPattern))) {
          showToast("비어 있거나 중복된 패턴은 사용할 수 없어요.");
          renderPatterns();
          return;
        }
        const updated = {};
        for (const [pattern, weight] of entries) updated[pattern === oldPattern ? newPattern : pattern] = weight;
        stage().platePatternWeights = updated;
        markChanged();
        renderPatterns();
      });
    });
    elements.patternBody.querySelectorAll("[data-pattern-weight]").forEach((input) => {
      input.addEventListener("change", () => {
        stage().platePatternWeights[input.dataset.patternWeight] = Math.max(0, Number(input.value) || 0);
        markChanged();
        renderPatterns();
      });
    });
    elements.patternBody.querySelectorAll("[data-pattern-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        delete stage().platePatternWeights[button.dataset.patternDelete];
        markChanged();
        renderPatterns();
      });
    });
  }

  function syncSummary() {
    const data = stage();
    const totalGoals = goalCount(data);
    const colorTotal = sum(data.colorWeights);
    const patternTotal = sum(data.platePatternWeights);
    const errors = validateStage(data);
    elements.totalGoals.textContent = `${totalGoals}판`;
    elements.movesPerGoal.textContent = totalGoals ? `${(data.moveLimit / totalGoals).toFixed(2)}회` : "-";
    elements.playableCells.textContent = `${playableCount(data)}칸`;
    elements.colorTotal.textContent = `${colorTotal.toFixed(1).replace(".0", "")}%`;
    elements.patternTotal.textContent = `${patternTotal.toFixed(1).replace(".0", "")}%`;
    elements.colorTotal.classList.toggle("invalid", Math.abs(colorTotal - 100) > .001);
    elements.patternTotal.classList.toggle("invalid", Math.abs(patternTotal - 100) > .001);
    elements.validation.textContent = errors.length ? `${errors.length}개 설정을 확인해주세요` : "모든 데이터가 유효합니다";
    elements.validation.classList.toggle("error", errors.length > 0);
    elements.simulate.disabled = errors.length > 0;
  }

  function syncJson() {
    elements.json.value = JSON.stringify(stage(), null, 2);
  }

  function renderCurveTable(results = {}) {
    elements.curveBody.innerHTML = Object.values(drafts).map((data) => {
      const result = results[data.id];
      const perGoal = goalCount(data) ? data.moveLimit / goalCount(data) : 0;
      return `<tr><td><b>${data.id}</b></td><td>${data.moveLimit}</td><td>${perGoal.toFixed(2)}</td><td class="curve-rate">${result ? percent(result.clearRate) : "-"}</td><td>${result ? percent(result.lockedRate) : "-"}</td></tr>`;
    }).join("");
  }

  function renderAll() {
    renderStageList();
    renderBasics();
    renderColors();
    renderBoard();
    renderCellInspector();
    renderOpeningRack();
    renderPatterns();
    syncSummary();
    syncJson();
    renderCurveTable();
    elements.simEmpty.classList.remove("hidden");
    elements.simResults.classList.add("hidden");
  }

  function bindBasicInput(element, key, transform = Number) {
    element.addEventListener("change", () => {
      stage()[key] = transform(element.value);
      markChanged();
      renderBasics();
    });
  }

  function renderSimulation(result) {
    lastResult = result;
    elements.simEmpty.classList.add("hidden");
    elements.simResults.classList.remove("hidden");
    elements.simDifficulty.textContent = result.difficulty;
    elements.clearRate.textContent = percent(result.clearRate);
    elements.averageMoves.textContent = result.averageClearMoves === null ? "-" : `${result.averageClearMoves.toFixed(1)}회`;
    elements.averageProgress.textContent = percent(result.averageProgress);
    elements.clearBar.style.width = percent(result.clearRate);
    elements.limitBar.style.width = percent(result.limitRate);
    elements.lockedBar.style.width = percent(result.lockedRate);
    elements.clearLegend.textContent = percent(result.clearRate);
    elements.limitLegend.textContent = percent(result.limitRate);
    elements.lockedLegend.textContent = percent(result.lockedRate);
    if (result.lockedRate >= .35) {
      elements.simInsight.textContent = "실패의 중심이 횟수보다 보드 잠김입니다. 보드 가득 참 처리 규칙에 따라 실제 난이도가 크게 달라질 수 있어요.";
    } else if (result.clearRate >= .85) {
      elements.simInsight.textContent = "클리어 여유가 큰 편입니다. 제한을 줄이거나 방해색·혼합 판 비중을 높여도 됩니다.";
    } else if (result.limitRate >= .55) {
      elements.simInsight.textContent = "주요 실패 원인은 횟수 소진입니다. 목표 1판당 허용 횟수를 조금씩 조절해보세요.";
    } else {
      elements.simInsight.textContent = "횟수 소진과 보드 압박이 함께 작동합니다. 목표한 플레이어 숙련도와 비교해 조정하세요.";
    }
  }

  async function simulateSelected() {
    const errors = validateStage(stage());
    if (errors.length) {
      showToast(errors[0]);
      return;
    }
    elements.simulate.disabled = true;
    elements.simulate.textContent = "분석 중…";
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    const result = Simulator.simulateStage(deepClone(stage()), {
      runs: Number(elements.runs.value),
      skill: elements.skill.value,
    });
    renderSimulation(result);
    elements.simulate.disabled = false;
    elements.simulate.textContent = "선택 스테이지 분석";
  }

  async function simulateAll() {
    const invalid = Object.values(drafts).find((data) => validateStage(data).length);
    if (invalid) {
      showToast(`${invalid.title} 설정을 먼저 확인해주세요.`);
      return;
    }
    elements.simulateAll.disabled = true;
    const originalText = elements.simulateAll.textContent;
    const results = {};
    for (const data of Object.values(drafts)) {
      elements.simulateAll.textContent = `${data.id}/7 분석 중…`;
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
      results[data.id] = Simulator.simulateStage(deepClone(data), {
        runs: Number(elements.runs.value),
        skill: elements.skill.value,
      });
      renderCurveTable(results);
    }
    elements.simulateAll.disabled = false;
    elements.simulateAll.textContent = originalText;
    showToast("전체 난이도 곡선 분석이 끝났어요.");
  }

  bindBasicInput(elements.moveLimit, "moveLimit", (value) => Math.max(1, Number(value) || 1));
  bindBasicInput(elements.swaps, "swaps", (value) => Math.max(0, Number(value) || 0));
  bindBasicInput(elements.seed, "seed", (value) => Math.max(1, Number(value) || 1));
  bindBasicInput(elements.nextStage, "nextStageId", (value) => value === "" ? null : Math.max(1, Number(value) || 1));
  elements.difficulty.addEventListener("change", () => {
    stage().difficulty = elements.difficulty.value;
    markChanged();
    renderStageList();
  });
  elements.cellActive.addEventListener("change", () => {
    setCellActive(selectedCell, elements.cellActive.checked);
    markChanged();
    renderBoard();
    renderCellInspector();
  });
  elements.addPattern.addEventListener("click", () => {
    const candidates = ["a1", "a2", "a3", "a4", "a5", "a6", "a1b1", "a2b1", "a2b2", "a1b1c1"];
    const pattern = candidates.find((candidate) => !Object.hasOwn(stage().platePatternWeights, candidate));
    if (!pattern) {
      showToast("기존 패턴 이름을 바꾼 뒤 새 패턴을 추가해주세요.");
      return;
    }
    stage().platePatternWeights[pattern] = 0;
    markChanged();
    renderPatterns();
  });
  elements.runs.addEventListener("input", () => { elements.runsValue.textContent = `${elements.runs.value}회`; });
  elements.simulate.addEventListener("click", simulateSelected);
  elements.simulateAll.addEventListener("click", simulateAll);
  elements.applyDifficulty.addEventListener("click", () => {
    if (!lastResult) return;
    stage().difficulty = lastResult.difficulty;
    elements.difficulty.value = lastResult.difficulty;
    markChanged();
    renderStageList();
    showToast("추정 난이도를 적용했어요.");
  });
  elements.reset.addEventListener("click", () => {
    drafts[selectedId] = deepClone(sourceStages[selectedId]);
    selectedCell = 0;
    markChanged();
    renderAll();
    showToast("현재 스테이지를 원본으로 되돌렸어요.");
  });
  elements.save.addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    elements.savedState.textContent = "브라우저 저장됨";
    showToast("이 브라우저에 편집 데이터를 저장했어요.");
  });

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message);
    } catch (_) {
      showToast("복사 권한이 없어 JSON 영역에서 직접 복사해주세요.");
    }
  }

  elements.copyAll.addEventListener("click", () => copyText(JSON.stringify(drafts, null, 2), "1~7 전체 JSON을 복사했어요."));
  elements.copyStage.addEventListener("click", () => copyText(JSON.stringify(stage(), null, 2), "선택 스테이지 JSON을 복사했어요."));
  elements.applyJson.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(elements.json.value);
      if (!Array.isArray(parsed.colors) || !Array.isArray(parsed.boardMask) || !Array.isArray(parsed.initialPlates) || !Array.isArray(parsed.openingRack) || !parsed.goals || !parsed.colorWeights || !parsed.platePatternWeights) {
        throw new Error("stage schema");
      }
      parsed.id = selectedId;
      parsed.title ||= `스테이지 ${selectedId}`;
      drafts[selectedId] = parsed;
      markChanged();
      renderAll();
      showToast("JSON을 편집기에 적용했어요.");
    } catch (_) {
      showToast("JSON 문법을 확인해주세요.");
    }
  });

  renderAll();
})();
