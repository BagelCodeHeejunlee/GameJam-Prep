(() => {
  "use strict";

  const Stages = window.CakeLinkStages;
  const Simulator = window.CakeLinkSimulator;
  const STORAGE_KEY = "cakeLink.stageEditor.v2";
  const LEGACY_STORAGE_KEY = "cakeLink.stageEditor.v1";
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
  let selectedId = Number(Object.keys(sourceStages)[0] || 1);
  let selectedCell = 0;
  let lastResult = null;
  let lastComparison = null;
  let toastTimer;

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    stageList: $("#stageList"), savedState: $("#savedState"), title: $("#editorTitle"), validation: $("#validationSummary"),
    stageId: $("#stageIdInput"), difficulty: $("#difficultyInput"), moveLimit: $("#moveLimitInput"),
    seed: $("#seedInput"), nextStage: $("#nextStageInput"), totalGoals: $("#totalGoalsValue"), movesPerGoal: $("#movesPerGoalValue"),
    playableCells: $("#playableCellsValue"), colorBody: $("#colorTableBody"), colorTotal: $("#colorWeightTotal"),
    board: $("#boardEditor"), cellLabel: $("#selectedCellLabel"), cellActive: $("#cellActiveInput"),
    initialInputs: $("#initialPieceInputs"), initialCapacity: $("#initialCapacity"), opening: $("#openingRackEditor"),
    patternBody: $("#patternTableBody"), patternTotal: $("#patternWeightTotal"), addPattern: $("#addPatternButton"),
    mechanicsSummary: $("#mechanicsSummary"), mechanicsJson: $("#mechanicsJsonEditor"),
    applyMechanics: $("#applyMechanicsButton"),
    json: $("#jsonEditor"), applyJson: $("#applyJsonButton"), copyStage: $("#copyStageButton"),
    reset: $("#resetStageButton"), save: $("#saveButton"), copyAll: $("#copyAllButton"), toast: $("#toast"),
    style: $("#styleInput"), skill: $("#skillInput"), styleDescription: $("#styleDescription"),
    runs: $("#runsInput"), runsValue: $("#runsValue"), simulate: $("#simulateButton"),
    simEmpty: $("#simEmpty"), simResults: $("#simResults"), simDifficulty: $("#simDifficulty"),
    simResultProfile: $("#simResultProfile"), simComparisonMeta: $("#simComparisonMeta"),
    styleComparisonBody: $("#styleComparisonBody"), outcomeChart: $("#outcomeChart"),
    clearRate: $("#clearRateValue"), averageMoves: $("#averageMovesValue"), averageProgress: $("#averageProgressValue"),
    clearBar: $("#clearBar"), limitBar: $("#limitBar"), lockedBar: $("#lockedBar"),
    clearLegend: $("#clearLegend"), limitLegend: $("#limitLegend"), lockedLegend: $("#lockedLegend"),
    simInsight: $("#simInsight"), applyDifficulty: $("#applyDifficultyButton"), simulateAll: $("#simulateAllButton"),
    curveBody: $("#curveTableBody"), curveProfile: $("#curveProfile"),
  };

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadDrafts() {
    const defaults = deepClone(sourceStages);
    for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
      try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (!saved || typeof saved !== "object") continue;
        for (const id of Object.keys(defaults)) {
          if (!saved[id] || typeof saved[id] !== "object") continue;
          const base = defaults[id];
          defaults[id] = {
            ...base,
            ...saved[id],
            rules: { ...base.rules, ...(saved[id].rules || {}) },
            mechanics: saved[id].mechanics || base.mechanics,
            openingModifiers: saved[id].openingModifiers || base.openingModifiers,
          };
          if (key === LEGACY_STORAGE_KEY && Number(id) === 7) defaults[id].nextStageId = 8;
        }
        return defaults;
      } catch (_) { /* Invalid saved data falls through to the next source. */ }
    }
    return defaults;
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

  function styleIds() {
    return Simulator.PLAYER_STYLE_IDS || Object.keys(Simulator.PLAYER_STYLES || {});
  }

  function styleInfo(styleId) {
    return Simulator.PLAYER_STYLES?.[styleId] || { id: styleId, label: styleId, description: "" };
  }

  function skillInfo(skillId) {
    return Simulator.SKILL_LEVELS?.[skillId] || { id: skillId, label: skillId, description: "" };
  }

  function profileLabel(styleId = elements.style.value, skillId = elements.skill.value) {
    return `${styleInfo(styleId).label} · ${skillInfo(skillId).label}`;
  }

  function formatDelta(value) {
    const percentagePoints = value * 100;
    if (Math.abs(percentagePoints) < .05) return "0.0%p";
    return `${percentagePoints > 0 ? "+" : ""}${percentagePoints.toFixed(1)}%p`;
  }

  function comparisonResults(comparison = lastComparison) {
    if (!comparison) return {};
    const results = comparison.results || comparison.styles || {};
    if (Array.isArray(results)) {
      return Object.fromEntries(results.map((result) => [result.style, result]));
    }
    return results;
  }

  function goalCount(data = stage()) {
    return Stages.totalGoalCount(data);
  }

  function stageGoalSummary(data) {
    if (data.objective?.type === "frog") return `${sum(data.goals)}판 + 개구리`;
    if (data.objective?.type === "ordered") return `${data.mechanics?.orderedGoal?.sequence?.length || 0}단계`;
    if (["fragile", "breakPlates"].includes(data.objective?.type)) {
      return `깨지는 판 ${data.mechanics?.fragileGoal?.target || data.objective?.target || 0}개`;
    }
    return `${sum(data.goals)}판`;
  }

  function capacity(data = stage()) {
    return Stages.stageCapacity?.(data) || Number(data.rules?.capacity) || 6;
  }

  function specialPieceCount(modifier = {}) {
    // Mystery pieces are additional hidden slices in the current data model.
    // Rainbow modifiers replace normal slices and therefore add no capacity.
    return modifier.hiddenColors?.length || 0;
  }

  function playableCount(data = stage()) {
    return data.boardMask.join("").split("").filter((value) => value === "1").length;
  }

  function initialAt(index, data = stage()) {
    return data.initialPlates.find((plate) => plate.index === index) || null;
  }

  function featureAt(index, data = stage()) {
    const initial = initialAt(index, data);
    if (initial?.kind === "colored" || initial?.allowedColor) return { icon: "●", label: "색깔 접시" };
    if (initial?.kind === "layered" || initial?.layers?.length) return { icon: "Ⅱ", label: "이층 케이크" };
    if (data.mechanics?.iceCells?.some((cell) => Number(cell.index ?? cell) === index)) return { icon: "❄", label: "얼음 판" };
    if (data.mechanics?.locks?.some((lock) => Number(lock.index) === index)) return { icon: "🔒", label: "잠긴 칸" };
    if (data.mechanics?.fragileCells?.some((cell) => Number(cell.index ?? cell) === index)) return { icon: "💥", label: "깨지는 판" };
    if (Number(data.mechanics?.frog?.startIndex) === index) return { icon: "🐸", label: "개구리 시작" };
    if (Number(data.mechanics?.frog?.goalIndex) === index) return { icon: "🏁", label: "개구리 목표" };
    return null;
  }

  function mechanicsPayload(data = stage()) {
    return {
      gimmick: data.gimmick || null,
      rules: data.rules || { capacity: 6 },
      ...(data.objective ? { objective: data.objective } : {}),
      mechanics: data.mechanics || {},
      openingModifiers: data.openingModifiers || data.openingRack.map(() => ({})),
    };
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
    const plateCapacity = capacity(data);
    if (!Number.isInteger(data.moveLimit) || data.moveLimit < 1) errors.push("횟수 제한은 1 이상이어야 합니다.");
    if (![6, 8].includes(plateCapacity)) errors.push("케이크 완성 조각 수는 6 또는 8이어야 합니다.");
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
    const initialIndexes = new Set();
    for (const initial of data.initialPlates || []) {
      const row = Math.floor(initial.index / 4);
      const column = initial.index % 4;
      if (!Number.isInteger(initial.index) || initial.index < 0 || initial.index >= 16) errors.push("시작 판 위치는 0~15여야 합니다.");
      if (initialIndexes.has(initial.index)) errors.push(`${initial.index}번 시작 판 위치가 중복됩니다.`);
      initialIndexes.add(initial.index);
      if (data.boardMask[row]?.[column] !== "1") errors.push(`${initial.index}번 시작 판이 막힌 칸에 있습니다.`);
      if (sum(initial.pieces) > (initial.capacity || plateCapacity)) errors.push(`${initial.index}번 시작 판이 ${initial.capacity || plateCapacity}조각을 넘습니다.`);
      for (const color of Object.keys(initial.pieces || {})) {
        if (!data.colors.includes(color)) errors.push(`${initial.index}번 시작 판에 미등장 색 ${color}가 있습니다.`);
      }
      if (initial.allowedColor && !data.colors.includes(initial.allowedColor)) errors.push(`${initial.index}번 색깔 접시의 색이 등장 색에 없습니다.`);
      if (initial.allowedColor && Object.keys(initial.pieces || {}).some((color) => color !== initial.allowedColor)) {
        errors.push(`${initial.index}번 색깔 접시에 다른 색 조각이 있습니다.`);
      }
      if (initial.kind === "colored" && (!initial.collectorOnly || !initial.receiveOnly)) {
        errors.push(`${initial.index}번 색깔 접시는 고정 수집·받기 전용이어야 합니다.`);
      }
      for (const layer of initial.layers || []) {
        if (sum(layer.pieces) > (layer.capacity || plateCapacity)) errors.push(`${initial.index}번 아래층이 용량을 넘습니다.`);
        for (const color of Object.keys(layer.pieces || {})) {
          if (!data.colors.includes(color)) errors.push(`${initial.index}번 아래층에 미등장 색 ${color}가 있습니다.`);
        }
      }
    }
    for (const [index, plate] of (data.openingRack || []).entries()) {
      const modifier = data.openingModifiers?.[index] || {};
      const plateCount = sum(plate) + specialPieceCount(modifier);
      if (plateCount < 1 || plateCount > plateCapacity) errors.push(`첫 하단 ${index + 1}번 판은 1~${plateCapacity}조각이어야 합니다.`);
      for (const color of Object.keys(plate)) {
        if (!data.colors.includes(color)) errors.push(`첫 하단 ${index + 1}번 판에 미등장 색 ${color}가 있습니다.`);
      }
      for (const color of modifier.hiddenColors || []) {
        if (!data.colors.includes(color)) errors.push(`첫 하단 ${index + 1}번 미스테리 실제 색이 등장 색에 없습니다.`);
      }
      const rainbowCount = Math.max(0, Math.floor(Number(modifier.rainbow) || 0));
      if (rainbowCount > sum(plate)) {
        errors.push(`첫 하단 ${index + 1}번 무지개 교체 수가 기존 조각 수를 넘습니다.`);
      }
    }
    if (data.openingRack?.length !== 3) errors.push("첫 하단 판은 정확히 3개여야 합니다.");
    if (!Array.isArray(data.openingModifiers) || data.openingModifiers.length !== data.openingRack?.length) {
      errors.push("첫 하단 판과 특수 조각 설정 수가 같아야 합니다.");
    }

    for (const pattern of Object.keys(data.platePatternWeights || {})) {
      if (!/^(?:[a-z][1-8])+$/.test(pattern)) {
        errors.push(`${pattern} 패턴 표기가 올바르지 않습니다.`);
        continue;
      }
      const parsed = Stages.parsePlatePattern(pattern);
      const letterCount = (pattern.match(/[a-z]/g) || []).length;
      if (Object.keys(parsed).length !== letterCount) errors.push(`${pattern}에 같은 문자가 반복됩니다.`);
      if (sum(parsed) > plateCapacity) errors.push(`${pattern}은 ${plateCapacity}조각을 넘습니다.`);
      if (Object.keys(parsed).length > data.colors.length) errors.push(`${pattern}에 배정할 등장 색이 부족합니다.`);
    }

    const cells = [
      ...(data.mechanics?.iceCells || []).map((cell) => ({ type: "얼음", index: Number(cell.index ?? cell) })),
      ...(data.mechanics?.locks || []).map((cell) => ({ type: "잠금", index: Number(cell.index) })),
    ];
    for (const cell of cells) {
      const row = Math.floor(cell.index / 4);
      const column = cell.index % 4;
      if (!Number.isInteger(cell.index) || data.boardMask[row]?.[column] !== "1") errors.push(`${cell.type} 칸 위치가 보드 밖이거나 막혀 있습니다.`);
      // 얼음은 시작 판과 조각을 안에 가둬 보여주는 기믹이므로 겹침을
      // 허용한다. 잠긴 칸은 열리기 전까지 판 자체가 없어야 한다.
      if (cell.type === "잠금" && initialIndexes.has(cell.index)) {
        errors.push(`${cell.index}번 칸에 시작 판과 ${cell.type} 기믹이 겹칩니다.`);
      }
    }
    const initialByIndex = new Map((data.initialPlates || []).map((initial) => [initial.index, initial]));
    for (const entry of data.mechanics?.iceCells || []) {
      const index = Number.isInteger(entry) ? entry : Number(entry?.index);
      const initial = initialByIndex.get(index);
      if (!initial || sum(initial.pieces) <= 0) {
        errors.push(`${index}번 얼음 안에는 조각이 있는 시작 판이 필요합니다.`);
      }
    }
    const frog = data.mechanics?.frog;
    if (frog) {
      for (const [label, index] of [["시작", frog.startIndex], ["목표", frog.goalIndex]]) {
        const row = Math.floor(index / 4);
        const column = index % 4;
        if (!Number.isInteger(index) || data.boardMask[row]?.[column] !== "1") errors.push(`개구리 ${label} 칸이 보드 밖이거나 막혀 있습니다.`);
        if (label === "시작" && initialIndexes.has(index)) errors.push(`개구리 ${label} 칸에 시작 판이 있습니다.`);
      }
      if (frog.startIndex === frog.goalIndex) errors.push("개구리 시작과 목표 칸은 달라야 합니다.");
    }
    const sequence = data.mechanics?.orderedGoal?.sequence;
    if (data.gimmick?.id === "ordered" && (!Array.isArray(sequence) || !sequence.length)) errors.push("순서 목표 색 목록이 필요합니다.");
    for (const color of sequence || []) {
      if (!data.colors.includes(color)) errors.push(`순서 목표에 미등장 색 ${color}가 있습니다.`);
    }
    if (data.objective?.type === "fragile") {
      const target = Math.floor(Number(data.objective.target) || 0);
      const fragileCount = (data.mechanics?.fragileCells || []).length;
      if (target < 1) errors.push("깨지는 판 목표는 1개 이상이어야 합니다.");
      if (target > fragileCount) errors.push("깨지는 판 목표가 지정된 깨지는 판 수보다 많습니다.");
    }
    for (const lock of data.mechanics?.locks || []) {
      if (!Number.isInteger(Number(lock.count)) || Number(lock.count) < 1) {
        errors.push(`${lock.index}번 잠금의 필요 완성 횟수는 1 이상의 정수여야 합니다.`);
      }
    }
    return errors;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 1800);
  }

  function clearSelectedSimulation() {
    lastResult = null;
    lastComparison = null;
    elements.simEmpty.classList.remove("hidden");
    elements.simResults.classList.add("hidden");
    elements.styleComparisonBody.innerHTML = "";
  }

  function updateProfileCopy() {
    const style = styleInfo(elements.style.value);
    const skill = skillInfo(elements.skill.value);
    const styleDescription = style.description || "선택한 플레이 방식으로 후보 수를 평가합니다.";
    elements.styleDescription.textContent = `${styleDescription} ${skill.description || ""}`.trim();
    elements.curveProfile.textContent = `${profileLabel()} 기준`;
  }

  function markChanged() {
    elements.savedState.textContent = "저장 안 됨";
    clearSelectedSimulation();
    syncSummary();
    syncJson();
    renderStageList();
  }

  function renderStageList() {
    elements.stageList.innerHTML = Object.values(drafts).map((data) => `
      <button class="stage-select${data.id === selectedId ? " active" : ""}" type="button" data-stage="${data.id}">
        <span><b>스테이지 ${data.id}</b><small>${data.difficulty} · ${stageGoalSummary(data)}${data.gimmick ? ` · ${data.gimmick.label}` : ""}</small></span><em>${data.moveLimit}</em>
      </button>
    `).join("");
    elements.stageList.querySelectorAll("[data-stage]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedId = Number(button.dataset.stage);
        selectedCell = 0;
        clearSelectedSimulation();
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
          stage().initialPlates.forEach((plate) => {
            delete plate.pieces[color];
            plate.layers?.forEach((layer) => delete layer.pieces[color]);
          });
          stage().initialPlates = stage().initialPlates.filter((plate) => sum(plate.pieces) > 0);
          stage().openingRack.forEach((plate) => delete plate[color]);
          stage().openingModifiers?.forEach((modifier) => {
            if (modifier.hiddenColors) modifier.hiddenColors = modifier.hiddenColors.filter((value) => value !== color);
          });
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
      const feature = featureAt(index, data);
      return `<button class="board-cell${active ? "" : " blocked"}${feature ? " featured" : ""}${selectedCell === index ? " selected" : ""}" type="button" data-cell="${index}" role="gridcell" aria-label="${index}번 칸, ${active ? "사용" : "막힘"}${feature ? `, ${feature.label}` : ""}"><b>${index}</b>${feature ? `<i class="cell-feature" title="${feature.label}">${feature.icon}</i>` : ""}${active ? piecesMarkup(initial?.pieces) : "×"}</button>`;
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
      <label><span>${color.emoji} ${color.name}</span><input type="number" min="0" max="${capacity()}" step="1" value="${initial?.pieces[color.id] || 0}" data-initial-color="${color.id}" ${active && stage().colors.includes(color.id) ? "" : "disabled"}></label>
    `).join("");
    const count = sum(initial?.pieces);
    elements.initialCapacity.textContent = `${count} / ${capacity()}`;
    elements.initialCapacity.classList.toggle("over", count > capacity());
    elements.initialInputs.querySelectorAll("[data-initial-color]").forEach((input) => {
      input.addEventListener("change", () => {
        setInitialPiece(selectedCell, input.dataset.initialColor, Math.max(0, Math.min(capacity(), Number(input.value) || 0)));
        markChanged();
        renderBoard();
        renderCellInspector();
      });
    });
  }

  function renderOpeningRack() {
    elements.opening.innerHTML = stage().openingRack.map((plate, plateIndex) => `
      <div class="opening-row"><b>${plateIndex + 1}번 판</b>${COLORS.map((color) => `
        <label>${color.emoji} ${color.name}<input type="number" min="0" max="${capacity()}" step="1" value="${plate[color.id] || 0}" data-opening-index="${plateIndex}" data-opening-color="${color.id}" ${stage().colors.includes(color.id) ? "" : "disabled"}></label>
      `).join("")}</div>
    `).join("");
    elements.opening.querySelectorAll("[data-opening-index]").forEach((input) => {
      input.addEventListener("change", () => {
        const plate = stage().openingRack[Number(input.dataset.openingIndex)];
        const value = Math.max(0, Math.min(capacity(), Number(input.value) || 0));
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

  function mechanicDescription(data = stage()) {
    const id = data.gimmick?.id;
    if (!id) return "기본 정렬 규칙만 사용하는 스테이지입니다.";
    const descriptions = {
      colored: "옆에 새로 놓은 판에서 지정 색을 먼저 가져가며, 완성 전에는 내보내지 않는 고정 수집 접시입니다.",
      ice: `얼음 속 시작 판 ${(data.mechanics?.iceCells || []).length}개가 보이며, 인접 판 제거 후 사용할 수 있습니다.`,
      frog: `개구리가 ${data.mechanics?.frog?.startIndex ?? "?"}번에서 ${data.mechanics?.frog?.goalIndex ?? "?"}번 칸으로 이동한 뒤 사라집니다. 개구리가 없는 목표 칸에는 판을 놓을 수 있습니다.`,
      mystery: `생성 판의 ${data.mechanics?.mystery?.plateChance || 0}%에 미스테리 조각이 들어갈 수 있습니다.`,
      capacity8: "같은 색 조각 8개를 모아야 한 판이 완성됩니다.",
      locks: `색깔별 완성 횟수에 따라 잠긴 칸 ${(data.mechanics?.locks || []).length}개를 단계적으로 엽니다.`,
      ordered: `지정된 ${(data.mechanics?.orderedGoal?.sequence || []).length}개 색 순서대로 완성합니다.`,
      rainbow: `생성 판의 ${data.mechanics?.rainbow?.plateChance || 0}%에서 기존 조각 1~2개가 자동 완성용 무지개 조각으로 바뀝니다.`,
      fragile: `완성하면 판 자체가 깨지는 위치 ${(data.mechanics?.fragileCells || []).length}개가 있습니다. 목표는 ${data.mechanics?.fragileGoal?.target || data.objective?.target || 0}개 깨기입니다.`,
      layered: `위층을 먼저 완성해야 아래층을 사용할 수 있는 판 ${data.initialPlates.filter((plate) => plate.layers?.length).length}개가 있습니다.`,
    };
    return descriptions[id] || "JSON에 설정된 스테이지 기믹을 사용합니다.";
  }

  function renderMechanics() {
    const data = stage();
    const label = data.gimmick?.label || "기본 규칙";
    elements.mechanicsSummary.innerHTML = `<b>${label}</b><span>${mechanicDescription(data)}</span><em>${capacity(data)}조각 완성</em>`;
    elements.mechanicsJson.value = JSON.stringify(mechanicsPayload(data), null, 2);
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
    renderMechanics();
    syncSummary();
    syncJson();
    updateProfileCopy();
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
    const resultStyle = result.style || elements.style.value;
    const resultSkill = result.skill || elements.skill.value;
    elements.simResultProfile.textContent = profileLabel(resultStyle, resultSkill);
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
    elements.outcomeChart.setAttribute(
      "aria-label",
      `${profileLabel(resultStyle, resultSkill)} 결과: 클리어 ${percent(result.clearRate)}, 횟수 소진 ${percent(result.limitRate)}, 보드 잠김 ${percent(result.lockedRate)}`,
    );
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

  function renderComparisonRows(activeStyle) {
    const results = comparisonResults();
    const plannerResult = results.planner;
    const selectedResult = results[activeStyle];
    const resultList = Object.values(results);
    const totalRuns = Number(lastComparison?.runs) || resultList.reduce((total, result) => total + Number(result.runs || 0), 0);
    elements.simComparisonMeta.textContent = selectedResult
      ? `총 ${totalRuns.toLocaleString("ko-KR")}회 비교 · 선택 결과 ${Number(selectedResult.runs || 0).toLocaleString("ko-KR")}회`
      : `총 ${totalRuns.toLocaleString("ko-KR")}회 비교`;
    elements.styleComparisonBody.innerHTML = styleIds().filter((styleId) => results[styleId]).map((styleId) => {
      const result = results[styleId];
      const active = styleId === activeStyle;
      const delta = plannerResult ? result.clearRate - plannerResult.clearRate : 0;
      return `<tr class="${active ? "active" : ""}" data-style-result="${styleId}">
        <th scope="row"><button type="button" aria-pressed="${active}" aria-label="${styleInfo(styleId).label} 상세 보기, 클리어율 ${percent(result.clearRate)}">${styleInfo(styleId).label}</button></th>
        <td>${percent(result.clearRate)}</td>
        <td class="compare-delta${delta > .0005 ? " positive" : delta < -.0005 ? " negative" : ""}">${formatDelta(delta)}</td>
        <td>${percent(result.lockedRate)}</td>
      </tr>`;
    }).join("");
    elements.styleComparisonBody.querySelectorAll("[data-style-result]").forEach((row) => {
      row.addEventListener("click", () => selectComparisonStyle(row.dataset.styleResult));
    });
  }

  function selectComparisonStyle(styleId) {
    const result = comparisonResults()[styleId];
    if (!result) return;
    elements.style.value = styleId;
    updateProfileCopy();
    renderComparisonRows(styleId);
    renderSimulation(result);
  }

  function renderComparison(comparison) {
    lastComparison = comparison;
    const results = comparisonResults(comparison);
    const preferredStyle = results[elements.style.value]
      ? elements.style.value
      : (results.planner ? "planner" : Object.keys(results)[0]);
    if (!preferredStyle) {
      clearSelectedSimulation();
      showToast("비교할 시뮬레이션 결과가 없습니다.");
      return;
    }
    selectComparisonStyle(preferredStyle);
  }

  async function simulateSelected() {
    const errors = validateStage(stage());
    if (errors.length) {
      showToast(errors[0]);
      return;
    }
    elements.simulate.disabled = true;
    elements.simulate.textContent = "분석 중…";
    try {
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
      const comparison = Simulator.simulateStyles(deepClone(stage()), {
        runs: Number(elements.runs.value),
        skill: elements.skill.value,
      });
      renderComparison(comparison);
    } catch (error) {
      console.error(error);
      showToast("시뮬레이션 중 문제가 생겼어요.");
    } finally {
      elements.simulate.disabled = false;
      elements.simulate.textContent = "선택 스테이지 4방식 비교";
    }
  }

  async function simulateAll() {
    const invalid = Object.values(drafts).find((data) => validateStage(data).length);
    if (invalid) {
      showToast(`${invalid.title} 설정을 먼저 확인해주세요.`);
      return;
    }
    elements.simulateAll.disabled = true;
    const originalText = elements.simulateAll.textContent;
    const style = elements.style.value;
    const skill = elements.skill.value;
    const results = {};
    try {
      for (const data of Object.values(drafts)) {
        elements.simulateAll.textContent = `${data.id}/${Object.keys(drafts).length} 분석 중…`;
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        results[data.id] = Simulator.simulateStage(deepClone(data), {
          runs: Number(elements.runs.value),
          skill,
          style,
        });
        renderCurveTable(results);
      }
      showToast(`${profileLabel(style, skill)} 전체 분석이 끝났어요.`);
    } catch (error) {
      console.error(error);
      showToast("전체 시뮬레이션 중 문제가 생겼어요.");
    } finally {
      elements.simulateAll.disabled = false;
      elements.simulateAll.textContent = originalText;
    }
  }

  bindBasicInput(elements.moveLimit, "moveLimit", (value) => Math.max(1, Number(value) || 1));
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
  elements.runs.addEventListener("input", () => {
    elements.runsValue.textContent = `${Number(elements.runs.value).toLocaleString("ko-KR")}회`;
    clearSelectedSimulation();
    renderCurveTable();
  });
  elements.style.addEventListener("change", () => {
    updateProfileCopy();
    renderCurveTable();
    if (lastComparison && comparisonResults()[elements.style.value]) {
      selectComparisonStyle(elements.style.value);
    }
  });
  elements.skill.addEventListener("change", () => {
    updateProfileCopy();
    clearSelectedSimulation();
    renderCurveTable();
  });
  elements.simulate.addEventListener("click", simulateSelected);
  elements.simulateAll.addEventListener("click", simulateAll);
  elements.applyDifficulty.addEventListener("click", () => {
    if (!lastResult) return;
    const appliedProfile = profileLabel(lastResult.style || elements.style.value, lastResult.skill || elements.skill.value);
    stage().difficulty = lastResult.difficulty;
    elements.difficulty.value = lastResult.difficulty;
    markChanged();
    renderStageList();
    showToast(`${appliedProfile} 추정 난이도를 적용했어요.`);
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

  elements.copyAll.addEventListener("click", () => copyText(JSON.stringify(drafts, null, 2), `1~${Object.keys(drafts).length} 전체 JSON을 복사했어요.`));
  elements.copyStage.addEventListener("click", () => copyText(JSON.stringify(stage(), null, 2), "선택 스테이지 JSON을 복사했어요."));
  elements.applyMechanics.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(elements.mechanicsJson.value);
      if (!parsed || typeof parsed !== "object" || !parsed.rules || !parsed.mechanics) throw new Error("mechanics schema");
      stage().gimmick = parsed.gimmick || null;
      stage().rules = parsed.rules;
      stage().mechanics = parsed.mechanics;
      if (parsed.objective) stage().objective = parsed.objective;
      else delete stage().objective;
      stage().openingModifiers = parsed.openingModifiers || stage().openingRack.map(() => ({}));
      markChanged();
      renderAll();
      showToast("기믹 JSON을 적용했어요.");
    } catch (_) {
      showToast("기믹 JSON 문법과 필수 필드를 확인해주세요.");
    }
  });
  elements.applyJson.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(elements.json.value);
      if (!Array.isArray(parsed.colors) || !Array.isArray(parsed.boardMask) || !Array.isArray(parsed.initialPlates) || !Array.isArray(parsed.openingRack) || !parsed.goals || !parsed.colorWeights || !parsed.platePatternWeights) {
        throw new Error("stage schema");
      }
      parsed.id = selectedId;
      parsed.title ||= `스테이지 ${selectedId}`;
      parsed.gimmick ||= null;
      parsed.rules ||= { capacity: 6 };
      parsed.mechanics ||= {};
      parsed.openingModifiers ||= parsed.openingRack.map(() => ({}));
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
