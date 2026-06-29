const CHARACTER_DATA_START_MARKER = "const baseArcherCards = [";
const CHARACTER_DATA_END_MARKER = "selectedCharacterId = initialSelectedCharacterId();";
const UPGRADE_DATA_START_MARKER = "const testPlayerPartyIds =";
const UPGRADE_DATA_END_MARKER = "let state;";
const AUTO_UPGRADE_RULES_STORAGE_KEY = "gamejam-prep-auto-upgrade-rules-v1";
const META_PROGRESS_STORAGE_KEY = "gamejam-prep-meta-growth-v1";
const META_LEVEL_MIN = 1;
const META_LEVEL_MAX = 8;
const ROUTE_ORDER = {
  archer: ["공용", "표식", "연타", "함정"],
  warrior: ["공용", "돌진", "범위 공격", "광전"],
  mage: ["공용", "연쇄", "룬", "운석"],
};

const elements = {
  characterList: document.querySelector("#characterList"),
  sideSummary: document.querySelector("#sideSummary"),
  upgradeHeader: document.querySelector("#upgradeHeader"),
  routeSections: document.querySelector("#routeSections"),
  setRootLevelOneButton: document.querySelector("#setRootLevelOneButton"),
  resetCharacterButton: document.querySelector("#resetCharacterButton"),
  resetAllButton: document.querySelector("#resetAllButton"),
  toast: document.querySelector("#toast"),
};

const state = {
  data: null,
  rules: loadUpgradeRules(),
  metaProgress: null,
  characterId: new URLSearchParams(window.location.search).get("character") || "archer",
};

init();

async function init() {
  bindStaticActions();
  try {
    state.data = await loadUpgradeData();
    state.metaProgress = loadMetaProgress();
    if (!state.data.characterDefinitions[state.characterId]) {
      state.characterId = state.data.characterIds[0] ?? "archer";
    }
    render();
  } catch (error) {
    console.error(error);
    elements.routeSections.innerHTML = `<div class="load-error">선택지 데이터를 불러오지 못했습니다.</div>`;
  }
}

async function loadUpgradeData() {
  const response = await fetch(`app.js?v=${Date.now()}`);
  if (!response.ok) throw new Error(`app.js ${response.status}`);
  const source = await response.text();
  const characterDefinitions = loadCharacterDefinitions(source);
  const { autoUpgradeCatalog, testPlayerPartyIds } = loadAutoUpgradeCatalog(source);
  const characterIds = orderedCharacterIds(characterDefinitions, testPlayerPartyIds, autoUpgradeCatalog);
  return { characterDefinitions, autoUpgradeCatalog, characterIds };
}

function loadCharacterDefinitions(source) {
  const start = source.indexOf(CHARACTER_DATA_START_MARKER);
  const end = source.indexOf(CHARACTER_DATA_END_MARKER);
  if (start < 0 || end < 0 || end <= start) throw new Error("character data markers not found");
  const segment = source.slice(start, end);
  const evaluate = new Function(
    "card",
    `${segment}
    return { characterDefinitions };`,
  );
  return evaluate(card).characterDefinitions;
}

function loadAutoUpgradeCatalog(source) {
  const start = source.indexOf(UPGRADE_DATA_START_MARKER);
  const end = source.indexOf(UPGRADE_DATA_END_MARKER, start);
  if (start < 0 || end < 0 || end <= start) throw new Error("upgrade data markers not found");
  const segment = source.slice(start, end);
  const evaluate = new Function(
    "autoUpgrade",
    `${segment}
    return { autoUpgradeCatalog, testPlayerPartyIds };`,
  );
  return evaluate(autoUpgrade);
}

function card(id, name, route, rarity, priority, actions, copies = 1) {
  return { id, name, route, rarity, type: "기본", priority, actions, copies };
}

function autoUpgrade(id, owner, route, name, desc, apply, options = {}) {
  return { id, owner, route, name, desc, apply, ...options };
}

function orderedCharacterIds(characterDefinitions, testPlayerPartyIds, upgrades) {
  const ordered = [];
  [...(testPlayerPartyIds ?? []), ...Object.keys(characterDefinitions)].forEach((id) => {
    if (!ordered.includes(id) && characterDefinitions[id]) ordered.push(id);
  });
  upgrades.forEach((upgrade) => {
    if (upgrade.owner !== "party" && characterDefinitions[upgrade.owner] && !ordered.includes(upgrade.owner)) {
      ordered.push(upgrade.owner);
    }
  });
  return ordered;
}

function bindStaticActions() {
  elements.characterList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-character-id]");
    if (!button) return;
    state.characterId = button.dataset.characterId;
    const url = new URL(window.location.href);
    url.searchParams.set("character", state.characterId);
    window.history.replaceState({}, "", url);
    render();
  });

  elements.routeSections.addEventListener("change", (event) => {
    const input = event.target.closest("[data-requirement-input]");
    if (input) {
      updateRequirement(input.dataset.upgradeId, input.value);
      return;
    }

    const levelInput = event.target.closest("[data-meta-level-input]");
    if (levelInput) updateCharacterLevel(levelInput.value);
  });

  elements.routeSections.addEventListener("click", (event) => {
    const resetButton = event.target.closest("[data-reset-requirement]");
    if (!resetButton) return;
    delete state.rules.levelRequirements[resetButton.dataset.upgradeId];
    saveUpgradeRules();
    render();
    showToast("기본 요구 레벨로 되돌렸습니다.");
  });

  elements.setRootLevelOneButton.addEventListener("click", setCurrentTreeRootsToLevelOne);
  elements.resetCharacterButton.addEventListener("click", resetCurrentCharacterRules);
  elements.resetAllButton.addEventListener("click", resetAllRules);
}

function render() {
  renderCharacters();
  renderHeader();
  renderSideSummary();
  renderRouteSections();
}

function renderCharacters() {
  elements.characterList.innerHTML = state.data.characterIds.map((id) => {
    const character = state.data.characterDefinitions[id];
    const upgrades = characterUpgrades(id);
    const routeCount = new Set(upgrades.map((upgrade) => upgrade.route)).size;
    const active = id === state.characterId;
    return `
      <button class="character-button ${active ? "active" : ""}" type="button" data-character-id="${escapeHtml(id)}">
        <span class="portrait">${character.image ? `<img src="${escapeHtml(character.image)}" alt="" />` : escapeHtml(character.shortLabel ?? character.name)}</span>
        <span>
          <strong>${escapeHtml(character.name)}</strong>
          <span>Lv.${characterMetaLevel(id)} · 트리 ${routeCount}개 · 선택지 ${upgrades.length}개</span>
        </span>
      </button>
    `;
  }).join("");
}

function renderHeader() {
  const character = currentCharacter();
  const routes = routeNames(state.characterId);
  elements.upgradeHeader.innerHTML = `
    <div class="hero-portrait">${character.image ? `<img src="${escapeHtml(character.image)}" alt="" />` : escapeHtml(character.shortLabel ?? character.name)}</div>
    <div class="hero-copy">
      <span>CHARACTER REWARD TREE</span>
      <h2>${escapeHtml(character.name)}</h2>
      <p>${routes.map(escapeHtml).join(" · ")}</p>
    </div>
    <label class="level-preview">
      <span>현재 캐릭터 Lv.</span>
      <input type="number" min="${META_LEVEL_MIN}" max="${META_LEVEL_MAX}" step="1" value="${characterMetaLevel(state.characterId)}" data-meta-level-input />
    </label>
  `;
}

function renderSideSummary() {
  const upgrades = characterUpgrades(state.characterId);
  const customCount = upgrades.filter((upgrade) => hasCustomRequirement(upgrade)).length;
  const rootCount = upgrades.filter(isTreeRootUpgrade).length;
  const unlockedCount = upgrades.filter((upgrade) => isUnlockedForCurrentLevel(upgrade)).length;
  elements.sideSummary.innerHTML = `
    <article>
      <span>해금 상태</span>
      <strong>${unlockedCount} / ${upgrades.length}</strong>
    </article>
    <article>
      <span>트리 첫 선택지</span>
      <strong>${rootCount}</strong>
    </article>
    <article>
      <span>수동 제한</span>
      <strong>${customCount}</strong>
    </article>
  `;
}

function renderRouteSections() {
  const routes = routeNames(state.characterId);
  elements.routeSections.innerHTML = routes.map((route) => {
    const upgrades = sortedRouteUpgrades(state.characterId, route);
    if (!upgrades.length) return "";
    const unlocked = upgrades.filter((upgrade) => isUnlockedForCurrentLevel(upgrade)).length;
    return `
      <section class="route-section">
        <header class="route-header">
          <div>
            <span>${escapeHtml(currentCharacter().name)}</span>
            <h2>${escapeHtml(route)}</h2>
          </div>
          <strong>${unlocked} / ${upgrades.length} 해금</strong>
        </header>
        <div class="upgrade-grid">
          ${upgrades.map(upgradeCardMarkup).join("")}
        </div>
      </section>
    `;
  }).join("") || `<div class="load-error">표시할 선택지가 없습니다.</div>`;
}

function upgradeCardMarkup(upgrade) {
  const defaultLevel = defaultAutoUpgradeMetaRequirement(upgrade);
  const effectiveLevel = autoUpgradeMetaRequirement(upgrade);
  const custom = hasCustomRequirement(upgrade);
  const unlocked = isUnlockedForCurrentLevel(upgrade);
  const root = isTreeRootUpgrade(upgrade);
  return `
    <article class="upgrade-card ${unlocked ? "unlocked" : "locked"} ${custom ? "custom" : ""} ${root ? "root" : ""}">
      <div class="upgrade-topline">
        <span>${root ? "트리 첫 선택지" : `깊이 ${autoUpgradeDepth(upgrade)}`}</span>
        <b>${unlocked ? "해금" : `Lv.${effectiveLevel} 필요`}</b>
      </div>
      <h3>${escapeHtml(upgrade.name)}</h3>
      <p>${escapeHtml(upgrade.desc)}</p>
      ${prerequisiteMarkup(upgrade)}
      <div class="requirement-row">
        <label>
          <span>요구 Lv.</span>
          <input type="number" min="${META_LEVEL_MIN}" max="${META_LEVEL_MAX}" step="1" value="${effectiveLevel}" data-requirement-input data-upgrade-id="${escapeHtml(upgrade.id)}" />
        </label>
        <button type="button" data-reset-requirement data-upgrade-id="${escapeHtml(upgrade.id)}" ${custom ? "" : "disabled"}>기본값</button>
      </div>
      <div class="requirement-note">
        <span>기본 Lv.${defaultLevel}</span>
        ${custom ? "<strong>수동 설정</strong>" : "<em>기본 규칙</em>"}
      </div>
    </article>
  `;
}

function prerequisiteMarkup(upgrade) {
  const required = [
    ...(upgrade.requires ?? []).map((id) => requirementName(id)),
    ...(upgrade.requiresAny ?? []).map((id) => `${requirementName(id)} 중 하나`),
  ];
  if (!required.length) return `<div class="prereq empty">선행 없음</div>`;
  return `<div class="prereq">선행: ${required.map(escapeHtml).join(" / ")}</div>`;
}

function updateRequirement(upgradeId, value) {
  const upgrade = findUpgrade(upgradeId);
  if (!upgrade) return;
  const level = clampMetaLevel(value);
  const defaultLevel = defaultAutoUpgradeMetaRequirement(upgrade);
  if (level === defaultLevel) {
    delete state.rules.levelRequirements[upgrade.id];
  } else {
    state.rules.levelRequirements[upgrade.id] = level;
  }
  saveUpgradeRules();
  render();
  showToast(`${upgrade.name} 요구 Lv.${level}`);
}

function updateCharacterLevel(value) {
  state.metaProgress.levels[state.characterId] = clampMetaLevel(value);
  saveMetaProgress();
  render();
  showToast(`${currentCharacter().name} Lv.${characterMetaLevel(state.characterId)} 기준`);
}

function setCurrentTreeRootsToLevelOne() {
  const roots = characterUpgrades(state.characterId).filter(isTreeRootUpgrade);
  roots.forEach((upgrade) => {
    if (defaultAutoUpgradeMetaRequirement(upgrade) === META_LEVEL_MIN) {
      delete state.rules.levelRequirements[upgrade.id];
    } else {
      state.rules.levelRequirements[upgrade.id] = META_LEVEL_MIN;
    }
  });
  saveUpgradeRules();
  render();
  showToast(`${currentCharacter().name} 트리 첫 선택지를 Lv.1로 설정했습니다.`);
}

function resetCurrentCharacterRules() {
  characterUpgrades(state.characterId).forEach((upgrade) => {
    delete state.rules.levelRequirements[upgrade.id];
  });
  saveUpgradeRules();
  render();
  showToast(`${currentCharacter().name} 제한을 기본값으로 되돌렸습니다.`);
}

function resetAllRules() {
  state.rules = defaultUpgradeRules();
  saveUpgradeRules();
  render();
  showToast("모든 선택지 제한을 기본값으로 되돌렸습니다.");
}

function characterUpgrades(characterId) {
  return state.data.autoUpgradeCatalog.filter((upgrade) => upgrade.owner === characterId);
}

function routeNames(characterId) {
  const preferred = ROUTE_ORDER[characterId] ?? [];
  const actual = [...new Set(characterUpgrades(characterId).map((upgrade) => upgrade.route))];
  const ordered = preferred.filter((route) => actual.includes(route));
  actual.sort((a, b) => a.localeCompare(b, "ko")).forEach((route) => {
    if (!ordered.includes(route)) ordered.push(route);
  });
  return ordered;
}

function sortedRouteUpgrades(characterId, route) {
  return characterUpgrades(characterId)
    .filter((upgrade) => upgrade.route === route)
    .sort((a, b) => (
      autoUpgradeDepth(a) - autoUpgradeDepth(b)
      || defaultAutoUpgradeMetaRequirement(a) - defaultAutoUpgradeMetaRequirement(b)
      || a.name.localeCompare(b.name, "ko")
    ));
}

function currentCharacter() {
  return state.data.characterDefinitions[state.characterId];
}

function findUpgrade(upgradeId) {
  return state.data.autoUpgradeCatalog.find((upgrade) => upgrade.id === upgradeId);
}

function requirementName(upgradeId) {
  return findUpgrade(upgradeId)?.name ?? upgradeId;
}

function isTreeRootUpgrade(upgrade) {
  return upgrade.route !== "공용" && !(upgrade.requires?.length) && !(upgrade.requiresAny?.length);
}

function isUnlockedForCurrentLevel(upgrade) {
  return characterMetaLevel(upgrade.owner) >= autoUpgradeMetaRequirement(upgrade);
}

function hasCustomRequirement(upgrade) {
  return Object.hasOwn(state.rules.levelRequirements, upgrade.id);
}

function autoUpgradeMetaRequirement(upgrade) {
  const customLevel = sanitizeMetaRequirement(state.rules.levelRequirements[upgrade.id]);
  return customLevel ?? defaultAutoUpgradeMetaRequirement(upgrade);
}

function defaultAutoUpgradeMetaRequirement(upgrade) {
  const depth = autoUpgradeDepth(upgrade);
  if (upgrade.owner === "party") return Math.min(META_LEVEL_MAX, 4 + depth * 2);
  if (upgrade.route === "공용") return Math.min(META_LEVEL_MAX, 1 + depth);
  if (depth === 0) return 2;
  if (depth === 1) return 4;
  if (depth === 2) return 6;
  return META_LEVEL_MAX;
}

function autoUpgradeDepth(upgrade, seen = new Set()) {
  if (!upgrade || seen.has(upgrade.id)) return 0;
  const requirements = [...(upgrade.requires ?? []), ...(upgrade.requiresAny ?? [])];
  if (!requirements.length) return 0;
  seen.add(upgrade.id);
  const depths = requirements.map((id) => autoUpgradeDepth(findUpgrade(id), new Set(seen)));
  return 1 + Math.max(0, ...depths);
}

function defaultUpgradeRules() {
  return { levelRequirements: {} };
}

function loadUpgradeRules() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTO_UPGRADE_RULES_STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return defaultUpgradeRules();
    const levelRequirements = Object.entries(saved.levelRequirements ?? {}).reduce((result, [id, value]) => {
      const level = sanitizeMetaRequirement(value);
      if (level) result[id] = level;
      return result;
    }, {});
    return { levelRequirements };
  } catch {
    return defaultUpgradeRules();
  }
}

function saveUpgradeRules() {
  localStorage.setItem(AUTO_UPGRADE_RULES_STORAGE_KEY, JSON.stringify(state.rules));
}

function defaultMetaProgress() {
  const levels = Object.fromEntries((state.data?.characterIds ?? []).map((id) => [id, META_LEVEL_MIN]));
  return { levels };
}

function loadMetaProgress() {
  const fallback = defaultMetaProgress();
  try {
    const saved = JSON.parse(localStorage.getItem(META_PROGRESS_STORAGE_KEY) || "null");
    const levels = { ...fallback.levels, ...(saved?.levels ?? {}) };
    Object.keys(levels).forEach((id) => {
      levels[id] = clampMetaLevel(levels[id]);
    });
    return { levels };
  } catch {
    return fallback;
  }
}

function saveMetaProgress() {
  localStorage.setItem(META_PROGRESS_STORAGE_KEY, JSON.stringify(state.metaProgress));
}

function characterMetaLevel(id) {
  return clampMetaLevel(state.metaProgress?.levels?.[id] ?? META_LEVEL_MIN);
}

function sanitizeMetaRequirement(value) {
  if (String(value ?? "").trim() === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return clampMetaLevel(numeric);
}

function clampMetaLevel(value) {
  const numeric = Number(value);
  const level = Number.isFinite(numeric) ? numeric : META_LEVEL_MIN;
  return Math.max(META_LEVEL_MIN, Math.min(META_LEVEL_MAX, Math.round(level)));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 1300);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
