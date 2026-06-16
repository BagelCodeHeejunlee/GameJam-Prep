const MAX_LEVEL = 20;
const STORAGE_KEY = "gamejam-prep-meta-levels-v2";
const SELECTED_CHARACTER_STORAGE_KEY = "gamejam-prep-selected-character-v1";

const characters = {
  archer: {
    id: "archer",
    name: "궁수",
    shortLabel: "궁",
    role: "원거리 딜러",
    baseHp: 70,
    baseAtk: 10,
    hpPerLevel: 6,
    atkPerLevel: 1,
  },
  warrior: {
    id: "warrior",
    name: "전사",
    shortLabel: "전",
    role: "근접 탱커",
    baseHp: 100,
    baseAtk: 8,
    hpPerLevel: 10,
    atkPerLevel: 1,
  },
  mage: {
    id: "mage",
    name: "마법사",
    shortLabel: "마",
    role: "광역 마법",
    baseHp: 55,
    baseAtk: 12,
    hpPerLevel: 5,
    atkPerLevel: 1,
  },
};

const elements = {
  accountLevel: document.querySelector("#accountLevel"),
  heroStage: document.querySelector(".hero-stage"),
  heroPortrait: document.querySelector("#heroPortrait"),
  heroRole: document.querySelector("#heroRole"),
  heroName: document.querySelector("#heroName"),
  powerText: document.querySelector("#powerText"),
  atkValue: document.querySelector("#atkValue"),
  hpValue: document.querySelector("#hpValue"),
  levelBadge: document.querySelector("#levelBadge"),
  xpText: document.querySelector("#xpText"),
  xpFill: document.querySelector("#xpFill"),
  gainSmallButton: document.querySelector("#gainSmallButton"),
  gainBossButton: document.querySelector("#gainBossButton"),
  levelUpButton: document.querySelector("#levelUpButton"),
  startButton: document.querySelector("#startButton"),
  resetButton: document.querySelector("#resetButton"),
  toast: document.querySelector("#levelToast"),
  heroButtons: [...document.querySelectorAll("[data-character]")],
  tabButtons: [...document.querySelectorAll("[data-tab]")],
  tabPanels: [...document.querySelectorAll("[data-panel]")],
};

let selectedCharacterId = loadSelectedCharacterId();
let activeTab = "hero";
let profile = loadProfile();

function defaultProfile() {
  return Object.fromEntries(Object.keys(characters).map((id) => [id, { level: 1, xp: 0 }]));
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultProfile(), ...saved };
  } catch {
    return defaultProfile();
  }
}

function saveProfile() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function loadSelectedCharacterId() {
  try {
    const saved = localStorage.getItem(SELECTED_CHARACTER_STORAGE_KEY);
    return characters[saved] ? saved : "archer";
  } catch {
    return "archer";
  }
}

function saveSelectedCharacterId(id) {
  try {
    localStorage.setItem(SELECTED_CHARACTER_STORAGE_KEY, id);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function xpRequired(level) {
  if (level >= MAX_LEVEL) return 0;
  return 80 + (level - 1) * 35;
}

function getCharacterState(id) {
  const character = characters[id];
  const saved = profile[id] ?? { level: 1, xp: 0 };
  const level = Math.min(Math.max(saved.level, 1), MAX_LEVEL);
  const xp = level >= MAX_LEVEL ? 0 : Math.max(saved.xp, 0);
  const hp = character.baseHp + (level - 1) * character.hpPerLevel;
  const atk = character.baseAtk + (level - 1) * character.atkPerLevel;

  return {
    level,
    xp,
    hp,
    atk,
    power: hp + atk * 10,
  };
}

function addXp(amount) {
  const state = getCharacterState(selectedCharacterId);
  if (state.level >= MAX_LEVEL) return;

  profile[selectedCharacterId] = {
    level: state.level,
    xp: state.xp + amount,
  };

  saveProfile();
  render();
}

function levelUp() {
  const state = getCharacterState(selectedCharacterId);
  const required = xpRequired(state.level);
  if (state.level >= MAX_LEVEL || state.xp < required) return;

  const nextLevel = state.level + 1;
  profile[selectedCharacterId] = {
    level: nextLevel,
    xp: nextLevel >= MAX_LEVEL ? 0 : state.xp - required,
  };

  saveProfile();
  render();
  showToast(`${characters[selectedCharacterId].name} Lv. ${nextLevel}!<br>ATK +1 / HP 상승`);
}

function resetGrowth() {
  profile = defaultProfile();
  saveProfile();
  render();
  showToast("성장 정보 초기화");
}

function selectCharacter(id) {
  selectedCharacterId = id;
  saveSelectedCharacterId(id);
  activeTab = "hero";
  render();
}

function selectTab(id) {
  activeTab = id;
  renderTabs();
}

function showToast(message) {
  elements.toast.innerHTML = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 1250);
}

function render() {
  const character = characters[selectedCharacterId];
  const state = getCharacterState(selectedCharacterId);
  const required = xpRequired(state.level);
  const xpRatio = state.level >= MAX_LEVEL ? 1 : Math.min(state.xp / required, 1);
  const highestLevel = Math.max(...Object.keys(characters).map((id) => getCharacterState(id).level));

  elements.accountLevel.textContent = `Lv. ${highestLevel}`;
  elements.heroStage.dataset.character = character.id;
  elements.heroPortrait.textContent = character.shortLabel;
  elements.heroRole.textContent = character.role;
  elements.heroName.textContent = character.name;
  elements.powerText.textContent = `전투력 ${state.power}`;
  elements.atkValue.textContent = state.atk;
  elements.hpValue.textContent = state.hp;
  elements.levelBadge.textContent = `Lv. ${state.level}`;
  elements.startButton.href = `index.html?character=${encodeURIComponent(character.id)}`;
  elements.xpText.textContent = state.level >= MAX_LEVEL ? "MAX" : `${state.xp} / ${required}`;
  elements.xpFill.style.width = `${Math.round(xpRatio * 100)}%`;
  elements.levelUpButton.disabled = state.level >= MAX_LEVEL || state.xp < required;

  elements.heroButtons.forEach((button) => {
    const id = button.dataset.character;
    if (!id) return;
    const heroState = getCharacterState(id);
    button.classList.toggle("active", id === selectedCharacterId);
    const levelBadge = document.querySelector(`#${id}Level`);
    if (levelBadge) levelBadge.textContent = `Lv. ${heroState.level}`;
  });

  renderTabs();
}

function renderTabs() {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === activeTab);
  });
  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === activeTab);
  });
}

elements.heroButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.character) selectCharacter(button.dataset.character);
  });
});

elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => selectTab(button.dataset.tab));
});

elements.gainSmallButton.addEventListener("click", () => addXp(45));
elements.gainBossButton.addEventListener("click", () => addXp(120));
elements.levelUpButton.addEventListener("click", levelUp);
elements.resetButton.addEventListener("click", resetGrowth);

render();
