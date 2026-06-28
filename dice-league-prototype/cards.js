const DATA = window.LEAGUE_CARD_DATA || {};
const STORAGE_KEY = DATA.storageKey || "dice-league-monster-card-overrides-v1";
const BASE_MONSTERS = Array.isArray(DATA.baseMonsters) ? DATA.baseMonsters : [];
const EFFECTS = Array.isArray(DATA.effects) ? DATA.effects : [];
const EFFECT_BY_KEY = Object.fromEntries(EFFECTS.map((effect) => [effect.key, effect]));
const BASE_BY_ID = Object.fromEntries(BASE_MONSTERS.map((monster) => [monster.id, monster]));
const VALID_EFFECTS = new Set(EFFECTS.map((effect) => effect.key));

const els = {
  summary: document.querySelector("#librarySummary"),
  editor: document.querySelector("#editorPanel"),
  search: document.querySelector("#cardSearch"),
  typeFilter: document.querySelector("#typeFilter"),
  timingFilter: document.querySelector("#timingFilter"),
  visibleCount: document.querySelector("#visibleCount"),
  grid: document.querySelector("#cardGrid"),
  dataBox: document.querySelector("#cardDataBox"),
  exportButton: document.querySelector("#exportCards"),
  importButton: document.querySelector("#importCards"),
  resetAllButton: document.querySelector("#resetAllCards"),
};

const state = {
  edits: loadCardEdits(),
  selectedId: new URLSearchParams(window.location.search).get("card") || BASE_MONSTERS[0]?.id || "",
  search: "",
  type: "all",
  timing: "all",
  message: null,
};

init();

function init() {
  if (!BASE_MONSTERS.length) {
    els.editor.innerHTML = `<div class="empty-library">카드 데이터를 불러오지 못했습니다.</div>`;
    return;
  }
  if (!BASE_BY_ID[state.selectedId]) state.selectedId = BASE_MONSTERS[0].id;
  bindControls();
  renderFilters();
  render();
}

function bindControls() {
  els.search.addEventListener("input", () => {
    state.search = els.search.value.trim().toLowerCase();
    renderGrid();
  });

  els.typeFilter.addEventListener("change", () => {
    state.type = els.typeFilter.value;
    renderGrid();
  });

  els.timingFilter.addEventListener("change", () => {
    state.timing = els.timingFilter.value;
    renderGrid();
  });

  els.grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-card-id]");
    if (!button) return;
    selectCard(button.dataset.cardId);
    els.editor.scrollIntoView({ block: "start", behavior: "smooth" });
  });

  els.editor.addEventListener("input", (event) => {
    if (!event.target.closest("#cardEditForm")) return;
    updateLivePreview();
  });

  els.editor.addEventListener("change", (event) => {
    if (!event.target.closest("#cardEditForm")) return;
    updateLivePreview();
  });

  els.editor.addEventListener("click", (event) => {
    const resetButton = event.target.closest("[data-reset-card]");
    if (!resetButton) return;
    delete state.edits[state.selectedId];
    saveCardEdits();
    state.message = { text: "이 카드의 편집값을 초기화했습니다.", tone: "ok" };
    render();
  });

  els.editor.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target.closest("#cardEditForm");
    if (!form) return;
    try {
      const monster = monsterFromForm(form);
      const base = BASE_BY_ID[monster.id];
      const diff = diffFromBase(base, monster);
      if (Object.keys(diff).length) {
        state.edits[monster.id] = diff;
      } else {
        delete state.edits[monster.id];
      }
      saveCardEdits();
      state.message = { text: "저장했습니다. 전투 화면으로 돌아가면 반영됩니다.", tone: "ok" };
      render();
    } catch (error) {
      state.message = { text: error.message || "저장할 수 없습니다.", tone: "error" };
      renderEditor();
    }
  });

  els.exportButton.addEventListener("click", () => {
    els.dataBox.value = JSON.stringify(state.edits, null, 2);
    state.message = { text: "현재 편집 JSON을 내보냈습니다.", tone: "ok" };
    renderEditor();
  });

  els.importButton.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(els.dataBox.value || "{}");
      state.edits = sanitizeEditMap(parsed);
      saveCardEdits();
      state.message = { text: "가져온 편집값을 저장했습니다.", tone: "ok" };
      render();
    } catch {
      state.message = { text: "JSON 형식을 확인해주세요.", tone: "error" };
      renderEditor();
    }
  });

  els.resetAllButton.addEventListener("click", () => {
    if (!window.confirm("모든 몬스터 카드 편집값을 초기화할까요?")) return;
    state.edits = {};
    saveCardEdits();
    els.dataBox.value = "";
    state.message = { text: "전체 편집값을 초기화했습니다.", tone: "ok" };
    render();
  });
}

function renderFilters() {
  const types = ["all", ...new Set(BASE_MONSTERS.map((monster) => monster.type))];
  const timings = ["all", ...new Set(EFFECTS.map((effect) => effect.timing))];
  els.typeFilter.innerHTML = types
    .map((type) => `<option value="${escapeHtml(type)}">${type === "all" ? "전체" : escapeHtml(type)}</option>`)
    .join("");
  els.timingFilter.innerHTML = timings
    .map((timing) => `<option value="${escapeHtml(timing)}">${timing === "all" ? "전체" : escapeHtml(timing)}</option>`)
    .join("");
}

function render() {
  renderSummary();
  renderEditor();
  renderGrid();
}

function renderSummary() {
  const cards = currentMonsters();
  const averagePower = Math.round(cards.reduce((sum, monster) => sum + monster.base, 0) / cards.length);
  els.summary.innerHTML = `
    <article class="summary-chip">
      <span>총 카드</span>
      <strong>${cards.length}</strong>
    </article>
    <article class="summary-chip">
      <span>수정됨</span>
      <strong>${Object.keys(state.edits).length}</strong>
    </article>
    <article class="summary-chip">
      <span>평균 힘</span>
      <strong>${averagePower}</strong>
    </article>
  `;
}

function renderEditor() {
  const monster = monsterById(state.selectedId);
  const isEdited = Boolean(state.edits[state.selectedId]);
  els.editor.innerHTML = `
    <div class="section-title">
      <h2>${escapeHtml(monster.name)} 편집</h2>
      <span>${isEdited ? "수정됨" : "기본값"}</span>
    </div>
    <div class="editor-layout">
      <div id="livePreview" class="editor-card-preview">
        ${cardMarkup(monster, { large: true })}
      </div>
      <form id="cardEditForm" class="card-edit-form">
        <input name="id" type="hidden" value="${escapeHtml(monster.id)}" />
        <div class="field-grid">
          ${field("name", "이름", monster.name)}
          ${field("type", "타입", monster.type)}
          ${field("base", "기본 힘", monster.base, "number")}
          ${field("color", "색", monster.color, "color")}
          ${effectField(monster.effect)}
        </div>
        <p id="editorStatus" class="editor-status" data-tone="${state.message?.tone || ""}">${escapeHtml(state.message?.text || "")}</p>
        <div class="editor-actions">
          <button class="mini-action" type="button" data-reset-card>초기화</button>
          <button class="primary-button" type="submit">저장</button>
        </div>
      </form>
    </div>
  `;
  state.message = null;
}

function renderGrid() {
  const cards = filteredMonsters();
  els.visibleCount.textContent = `${cards.length}장`;
  els.grid.innerHTML = cards.length
    ? cards.map((monster) => cardButtonMarkup(monster)).join("")
    : `<div class="empty-library">조건에 맞는 카드가 없습니다.</div>`;
}

function cardButtonMarkup(monster) {
  const selected = monster.id === state.selectedId;
  const edited = Boolean(state.edits[monster.id]);
  return `
    <button
      class="library-card ${selected ? "selected" : ""} ${edited ? "edited" : ""}"
      type="button"
      data-card-id="${escapeHtml(monster.id)}"
      style="--accent:${escapeHtml(monster.color)}"
      aria-pressed="${selected ? "true" : "false"}"
    >
      ${cardInnerMarkup(monster)}
    </button>
  `;
}

function cardMarkup(monster, options = {}) {
  return `
    <article class="library-card ${options.large ? "large" : ""}" style="--accent:${escapeHtml(monster.color)}">
      ${cardInnerMarkup(monster)}
    </article>
  `;
}

function cardInnerMarkup(monster) {
  const skill = monsterSkillParts(monster);
  return `
    <div class="monster-avatar" style="--accent:${escapeHtml(monster.color)}">${monsterArt(monster)}</div>
    <h3>${escapeHtml(monster.name)}</h3>
    <div class="card-tag-row">
      <span class="type-badge">${escapeHtml(monster.type)}</span>
      <span class="timing-badge">${escapeHtml(skill.timing)}</span>
    </div>
    <p class="effect-text"><b>${escapeHtml(skill.timing)}:</b> ${escapeHtml(skill.effect)}</p>
    <div class="card-stat-row">
      <span class="power-pill">힘 ${monster.base}</span>
      <span class="card-id">${escapeHtml(monster.id)}</span>
    </div>
  `;
}

function field(name, label, value, type = "text") {
  return `
    <label class="editor-field">
      <span>${label}</span>
      <input name="${name}" type="${type}" value="${escapeHtml(value)}" ${type === "number" ? 'min="1" max="120" step="1"' : ""} />
    </label>
  `;
}

function effectField(value) {
  return `
    <label class="editor-field wide-field">
      <span>효과 규칙</span>
      <select name="effect">
        ${EFFECTS.map((effect) => `
          <option value="${escapeHtml(effect.key)}" ${effect.key === value ? "selected" : ""}>
            ${escapeHtml(`${effect.timing}: ${effect.name} - ${effect.summary}`)}
          </option>
        `).join("")}
      </select>
    </label>
  `;
}

function updateLivePreview() {
  const form = document.querySelector("#cardEditForm");
  const preview = document.querySelector("#livePreview");
  if (!form || !preview) return;
  try {
    preview.innerHTML = cardMarkup(monsterFromForm(form), { large: true });
    const status = document.querySelector("#editorStatus");
    if (status) {
      status.textContent = "";
      status.dataset.tone = "";
    }
  } catch {
    // Keep the last valid preview while the user is midway through editing.
  }
}

function monsterFromForm(form) {
  const data = new FormData(form);
  const id = cleanText(data.get("id"));
  const base = BASE_BY_ID[id];
  if (!base) throw new Error("카드 ID를 찾을 수 없습니다.");

  const power = Number(data.get("base"));
  const color = cleanText(data.get("color"));
  const effect = cleanText(data.get("effect"));
  if (!Number.isFinite(power)) throw new Error("기본 힘은 숫자로 입력해주세요.");
  if (power < 1 || power > 120) throw new Error("기본 힘은 1부터 120 사이여야 합니다.");
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("색상 값이 올바르지 않습니다.");
  if (!VALID_EFFECTS.has(effect)) throw new Error("효과 규칙을 선택해주세요.");

  const effectMeta = EFFECT_BY_KEY[effect];
  return {
    ...base,
    name: cleanText(data.get("name")).slice(0, 18) || base.name,
    type: cleanText(data.get("type")).slice(0, 8) || base.type,
    base: Math.round(power),
    color,
    effect,
    skill: effectMeta?.summary || base.skill,
  };
}

function diffFromBase(base, monster) {
  const keys = ["name", "type", "base", "color", "effect"];
  return keys.reduce((diff, key) => {
    if (monster[key] !== base[key]) diff[key] = monster[key];
    return diff;
  }, {});
}

function filteredMonsters() {
  return currentMonsters().filter((monster) => {
    const skill = monsterSkillParts(monster);
    const haystack = [
      monster.name,
      monster.type,
      monster.id,
      skill.timing,
      skill.effect,
      EFFECT_BY_KEY[monster.effect]?.name || "",
    ].join(" ").toLowerCase();
    if (state.search && !haystack.includes(state.search)) return false;
    if (state.type !== "all" && monster.type !== state.type) return false;
    if (state.timing !== "all" && skill.timing !== state.timing) return false;
    return true;
  });
}

function currentMonsters() {
  return BASE_MONSTERS.map((monster) => monsterById(monster.id));
}

function monsterById(id) {
  const base = BASE_BY_ID[id];
  if (!base) return null;
  const edit = state.edits[id] || {};
  const monster = {
    ...base,
    ...edit,
  };
  const effectMeta = EFFECT_BY_KEY[monster.effect];
  if (effectMeta && monster.effect !== base.effect) monster.skill = effectMeta.summary;
  return monster;
}

function selectCard(id) {
  if (!BASE_BY_ID[id]) return;
  state.selectedId = id;
  const url = new URL(window.location.href);
  url.searchParams.set("card", id);
  window.history.replaceState({}, "", url);
  render();
}

function loadCardEdits() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return sanitizeEditMap(parsed);
  } catch {
    return {};
  }
}

function saveCardEdits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.edits));
}

function sanitizeEditMap(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  return Object.entries(source).reduce((result, [id, edit]) => {
    const base = BASE_BY_ID[id];
    if (!base) return result;
    const monster = {
      ...base,
      ...sanitizeOverride(edit),
    };
    const diff = diffFromBase(base, monster);
    if (Object.keys(diff).length) result[id] = diff;
    return result;
  }, {});
}

function sanitizeOverride(edit) {
  if (!edit || typeof edit !== "object" || Array.isArray(edit)) return {};
  const next = {};
  const name = cleanText(edit.name);
  const type = cleanText(edit.type);
  const base = Number(edit.base);
  const color = cleanText(edit.color);
  const effect = cleanText(edit.effect);
  if (name) next.name = name.slice(0, 18);
  if (type) next.type = type.slice(0, 8);
  if (Number.isFinite(base)) next.base = Math.max(1, Math.min(120, Math.round(base)));
  if (/^#[0-9a-f]{6}$/i.test(color)) next.color = color;
  if (VALID_EFFECTS.has(effect)) next.effect = effect;
  return next;
}

function monsterSkillParts(monster, level = 3) {
  switch (monster.effect) {
    case "wolf":
      return { timing: "전투 종료", effect: `처치 후 힘 +${scaled(level, 7)}` };
    case "slime":
      return { timing: "전투 종료", effect: `패배 시 다음 아군 +${scaled(level, 13)}` };
    case "golem":
      return { timing: "전투", effect: `패배 직전 1회 힘 +${Math.floor(monsterPower(monster, level) * 0.45)}` };
    case "bat":
      return { timing: "전투 시작", effect: `상대 -${scaled(level, 8)}, 다음 적 -${scaled(level, 4)}` };
    case "ogre":
      return { timing: "전투 종료", effect: `처치 후 자기 힘 -${Math.max(8, 18 - Math.floor(level / 2))}` };
    case "goblin":
      return { timing: "전투 시작", effect: `고블린 1장당 +${scaled(level, 4)}` };
    case "dragon":
      return { timing: "전투 시작", effect: `상대 -${scaled(level, 12)}, 다음 적 -${scaled(level, 6)}` };
    case "manticore":
      return { timing: "전투 종료", effect: `처치 후 다음 적 -${scaled(level, 9)}` };
    case "skeleton":
      return { timing: "전투", effect: `패배 직전 1회 힘 +${scaled(level, 14)}` };
    case "ghost":
      return { timing: "전투 시작", effect: `상대 -${scaled(level, 10)}, 자신 +${scaled(level, 4)}` };
    case "mimic":
      return { timing: "전투 시작", effect: "상대 힘 28% 복사" };
    case "shaman":
      return { timing: "전투 시작", effect: `양옆 아군 +${scaled(level, 5)}` };
    case "bear":
      return { timing: "전투 종료", effect: `아군 패배 때마다 힘 +${scaled(level, 8)}` };
    case "medusa":
      return { timing: "전투 시작", effect: "상대 힘 18% 감소" };
    case "phoenix":
      return { timing: "전투 종료", effect: `패배 시 다음 아군 +${scaled(level, 12)}` };
    case "scorpion":
      return { timing: "전투 종료", effect: `패배 시 승자 힘 -${scaled(level, 11)}` };
    case "harpy":
      return { timing: "전투 시작", effect: `최대 ${scaled(level, 9)} 힘 훔침` };
    case "treant":
      return { timing: "전투 시작", effect: `뒤 2장 +${scaled(level, 6)}` };
    case "orc":
      return { timing: "전투 시작", effect: `근접 아군 +${scaled(level, 4)}` };
    case "kraken":
      return { timing: "전투 시작", effect: `상대 힘 최대 ${48 + level * 3}로 제한` };
    default:
      return { timing: "효과", effect: monster.skill || "효과 없음" };
  }
}

function scaled(level, base) {
  return base + Math.floor(level / 3);
}

function monsterPower(monster, level = 3) {
  return monster.base + (level - 1) * 5 + Math.floor((level - 1) / 5) * 8;
}

function monsterArt(monster) {
  const shape = {
    야수: '<path d="M22 58 35 26h26l13 32-11 18H33z" fill="rgba(255,255,255,.86)"/><path d="M32 30 22 15l2 25zm32 0 10-15-2 25z" fill="rgba(37,37,37,.22)"/>',
    점액: '<path d="M20 64c0-26 18-42 28-42s28 16 28 42c0 10-13 16-28 16s-28-6-28-16z" fill="rgba(255,255,255,.82)"/>',
    고대: '<path d="M25 34 48 18l23 16v34L48 82 25 68z" fill="rgba(255,255,255,.78)"/><path d="M35 42h26v21H35z" fill="rgba(37,37,37,.18)"/>',
    비행: '<path d="M48 33 25 22l8 30-13 15 28-9 28 9-13-15 8-30z" fill="rgba(255,255,255,.82)"/>',
    거인: '<path d="M26 61 34 23h28l8 38-12 18H38z" fill="rgba(255,255,255,.82)"/><path d="M36 34h24v11H36z" fill="rgba(37,37,37,.2)"/>',
    무리: '<path d="M25 38 48 20l23 18-8 34H33z" fill="rgba(255,255,255,.82)"/><path d="M33 31 22 19l3 20zm30 0 11-12-3 20z" fill="rgba(37,37,37,.18)"/>',
    용: '<path d="M24 67 41 22l20 13 13 32-16 13H38z" fill="rgba(255,255,255,.84)"/><path d="M44 23 52 8l4 22z" fill="rgba(37,37,37,.22)"/>',
    언데드: '<path d="M26 42c0-14 10-23 22-23s22 9 22 23v35H26z" fill="rgba(255,255,255,.82)"/><circle cx="40" cy="43" r="5" fill="rgba(37,37,37,.28)"/><circle cx="56" cy="43" r="5" fill="rgba(37,37,37,.28)"/>',
    기묘: '<path d="M22 35h52v36H22z" fill="rgba(255,255,255,.82)"/><path d="M27 35 36 22h24l9 13z" fill="rgba(37,37,37,.2)"/>',
    주술: '<path d="M23 35c7-15 43-15 50 0l-9 13H32z" fill="rgba(255,255,255,.85)"/><path d="M35 48h26l7 27H28z" fill="rgba(255,255,255,.75)"/>',
    저주: '<path d="M28 68 36 24h24l8 44-20 12z" fill="rgba(255,255,255,.82)"/><path d="M34 26 24 16m38 10 10-10" stroke="rgba(37,37,37,.25)" stroke-width="6"/>',
    독: '<path d="M48 18 70 42 60 76H36L26 42z" fill="rgba(255,255,255,.82)"/><path d="M48 18v58" stroke="rgba(37,37,37,.18)" stroke-width="6"/>',
    숲: '<path d="M29 77V40l19-22 19 22v37z" fill="rgba(255,255,255,.78)"/><path d="M35 53h26" stroke="rgba(37,37,37,.18)" stroke-width="8"/>',
    심해: '<path d="M28 44c0-15 9-24 20-24s20 9 20 24c0 18-9 33-20 33S28 62 28 44z" fill="rgba(255,255,255,.82)"/><path d="M28 63c-8 7-8 15 0 20m40-20c8 7 8 15 0 20" stroke="rgba(255,255,255,.82)" stroke-width="7" fill="none"/>',
  };
  return `<svg viewBox="0 0 96 96" aria-hidden="true">${shape[monster.type] || shape.야수}<circle cx="39" cy="47" r="3" fill="#252525"/><circle cx="57" cy="47" r="3" fill="#252525"/></svg>`;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
