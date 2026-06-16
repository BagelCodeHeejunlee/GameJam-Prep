const MAX_LEVEL = 20;
const STORAGE_KEY = "gamejam-prep-meta-levels-v2";
const SELECTED_CHARACTER_STORAGE_KEY = "gamejam-prep-selected-character-v1";
const EQUIPMENT_STORAGE_KEY = "gamejam-prep-meta-equipment-v1";
const SELECTED_STAGE_STORAGE_KEY = "gamejam-prep-selected-stage-v1";

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

const equipmentOptions = {
  weapon: [
    { id: "training-bow", name: "훈련 활", icon: "활", power: 18 },
    { id: "iron-sword", name: "낡은 검", icon: "검", power: 16 },
    { id: "spark-staff", name: "불꽃 지팡이", icon: "봉", power: 20 },
  ],
  armor: [
    { id: "leather-vest", name: "가죽 조끼", icon: "갑", power: 24 },
    { id: "guard-mail", name: "수비 갑옷", icon: "방", power: 30 },
    { id: "silk-robe", name: "마력 로브", icon: "포", power: 22 },
  ],
  boots: [
    { id: "light-boots", name: "가벼운 신발", icon: "신", power: 10 },
    { id: "runner-boots", name: "질주 신발", icon: "속", power: 13 },
    { id: "focus-boots", name: "집중 장화", icon: "집", power: 12 },
  ],
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
  equipmentButtons: [...document.querySelectorAll("[data-equipment-slot]")],
  stageButtons: [...document.querySelectorAll("[data-stage]")],
  tabButtons: [...document.querySelectorAll("[data-tab]")],
  tabPanels: [...document.querySelectorAll("[data-panel]")],
  equipment: {
    weapon: {
      icon: document.querySelector("#weaponIcon"),
      name: document.querySelector("#weaponName"),
    },
    armor: {
      icon: document.querySelector("#armorIcon"),
      name: document.querySelector("#armorName"),
    },
    boots: {
      icon: document.querySelector("#bootsIcon"),
      name: document.querySelector("#bootsName"),
    },
  },
};

let selectedCharacterId = loadSelectedCharacterId();
let selectedStageId = loadSelectedStageId();
let equipment = loadEquipment();
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

function loadSelectedStageId() {
  try {
    const saved = localStorage.getItem(SELECTED_STAGE_STORAGE_KEY);
    return saved === "1" ? saved : "1";
  } catch {
    return "1";
  }
}

function saveSelectedStageId(id) {
  try {
    localStorage.setItem(SELECTED_STAGE_STORAGE_KEY, id);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function defaultEquipment() {
  return {
    weapon: "training-bow",
    armor: "leather-vest",
    boots: "light-boots",
  };
}

function loadEquipment() {
  try {
    const saved = JSON.parse(localStorage.getItem(EQUIPMENT_STORAGE_KEY));
    return { ...defaultEquipment(), ...saved };
  } catch {
    return defaultEquipment();
  }
}

function saveEquipment() {
  try {
    localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(equipment));
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

function selectStage(id) {
  selectedStageId = id;
  saveSelectedStageId(id);
  renderStage();
  renderStartLink();
}

function cycleEquipment(slot) {
  const options = equipmentOptions[slot] ?? [];
  const currentIndex = Math.max(0, options.findIndex((item) => item.id === equipment[slot]));
  const next = options[(currentIndex + 1) % options.length];
  if (!next) return;

  equipment = { ...equipment, [slot]: next.id };
  saveEquipment();
  render();
  showToast(`${next.name}<br>${slotLabel(slot)} 장착`);
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
  elements.powerText.textContent = `전투력 ${state.power + equipmentPower()}`;
  elements.atkValue.textContent = state.atk;
  elements.hpValue.textContent = state.hp;
  elements.levelBadge.textContent = `Lv. ${state.level}`;
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

  renderEquipment();
  renderStage();
  renderStartLink();
  renderTabs();
}

function equipmentPower() {
  return Object.entries(equipment).reduce((total, [slot, itemId]) => {
    const item = equipmentOptions[slot]?.find((option) => option.id === itemId);
    return total + (item?.power ?? 0);
  }, 0);
}

function renderEquipment() {
  Object.entries(elements.equipment).forEach(([slot, nodes]) => {
    const item = equipmentOptions[slot]?.find((option) => option.id === equipment[slot]) ?? equipmentOptions[slot]?.[0];
    if (!item) return;
    nodes.icon.textContent = item.icon;
    nodes.name.textContent = item.name;
  });
}

function renderStage() {
  elements.stageButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.stage === selectedStageId);
  });
}

function renderStartLink() {
  const params = new URLSearchParams({
    character: selectedCharacterId,
    stage: selectedStageId,
  });
  elements.startButton.href = `index.html?${params.toString()}`;
}

function slotLabel(slot) {
  return {
    weapon: "무기",
    armor: "갑옷",
    boots: "신발",
  }[slot] ?? "장비";
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

elements.equipmentButtons.forEach((button) => {
  button.addEventListener("click", () => cycleEquipment(button.dataset.equipmentSlot));
});

elements.stageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!button.disabled) selectStage(button.dataset.stage);
  });
});

elements.gainSmallButton.addEventListener("click", () => addXp(45));
elements.gainBossButton.addEventListener("click", () => addXp(120));
elements.levelUpButton.addEventListener("click", levelUp);
elements.resetButton.addEventListener("click", resetGrowth);

render();
