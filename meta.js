const MAX_LEVEL = 20;
const STORAGE_KEY = "gamejam-prep-meta-levels-v1";

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
  heroPanel: document.querySelector(".hero-panel"),
  heroPortrait: document.querySelector("#heroPortrait"),
  heroClass: document.querySelector("#heroClass"),
  heroName: document.querySelector("#heroName"),
  levelValue: document.querySelector("#levelValue"),
  levelCap: document.querySelector("#levelCap"),
  xpText: document.querySelector("#xpText"),
  xpFill: document.querySelector("#xpFill"),
  hpValue: document.querySelector("#hpValue"),
  atkValue: document.querySelector("#atkValue"),
  hpGain: document.querySelector("#hpGain"),
  atkGain: document.querySelector("#atkGain"),
  gainSmallButton: document.querySelector("#gainSmallButton"),
  gainBossButton: document.querySelector("#gainBossButton"),
  levelUpButton: document.querySelector("#levelUpButton"),
  resetButton: document.querySelector("#resetButton"),
  toast: document.querySelector("#levelToast"),
  characterButtons: [...document.querySelectorAll("[data-character]")],
};

let selectedCharacterId = "archer";
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

function xpRequired(level) {
  if (level >= MAX_LEVEL) return 0;
  return 80 + (level - 1) * 35;
}

function characterState(id) {
  const character = characters[id];
  const saved = profile[id] ?? { level: 1, xp: 0 };
  const level = Math.min(Math.max(saved.level, 1), MAX_LEVEL);
  const xp = level >= MAX_LEVEL ? 0 : Math.max(saved.xp, 0);

  return {
    ...saved,
    level,
    xp,
    hp: character.baseHp + (level - 1) * character.hpPerLevel,
    atk: character.baseAtk + (level - 1) * character.atkPerLevel,
  };
}

function addXp(amount) {
  const state = characterState(selectedCharacterId);
  if (state.level >= MAX_LEVEL) return;

  profile[selectedCharacterId] = {
    level: state.level,
    xp: state.xp + amount,
  };

  saveProfile();
  render();
}

function levelUp() {
  const state = characterState(selectedCharacterId);
  const required = xpRequired(state.level);
  if (state.level >= MAX_LEVEL || state.xp < required) return;

  const nextLevel = state.level + 1;
  profile[selectedCharacterId] = {
    level: nextLevel,
    xp: nextLevel >= MAX_LEVEL ? 0 : state.xp - required,
  };

  saveProfile();
  render();
  showToast(`${characters[selectedCharacterId].name} Lv. ${nextLevel}!<br>체력과 공격력이 상승했습니다`);
}

function showToast(message) {
  elements.toast.innerHTML = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 1250);
}

function resetGrowth() {
  profile = defaultProfile();
  saveProfile();
  render();
  showToast("성장 정보 초기화");
}

function selectCharacter(id) {
  selectedCharacterId = id;
  render();
}

function render() {
  const character = characters[selectedCharacterId];
  const state = characterState(selectedCharacterId);
  const required = xpRequired(state.level);
  const xpRatio = state.level >= MAX_LEVEL ? 1 : Math.min(state.xp / required, 1);

  elements.heroPanel.dataset.character = character.id;
  elements.heroPortrait.textContent = character.shortLabel;
  elements.heroClass.textContent = character.role;
  elements.heroName.textContent = character.name;
  elements.levelValue.textContent = `Lv. ${state.level}`;
  elements.levelCap.textContent = `MAX ${MAX_LEVEL}`;
  elements.xpText.textContent = state.level >= MAX_LEVEL ? "최대 레벨" : `${state.xp} / ${required}`;
  elements.xpFill.style.width = `${Math.round(xpRatio * 100)}%`;
  elements.hpValue.textContent = state.hp;
  elements.atkValue.textContent = state.atk;
  elements.hpGain.textContent = `+${character.hpPerLevel} / Lv`;
  elements.atkGain.textContent = `+${character.atkPerLevel} / Lv`;
  elements.levelUpButton.disabled = state.level >= MAX_LEVEL || state.xp < required;

  elements.characterButtons.forEach((button) => {
    const id = button.dataset.character;
    const buttonState = characterState(id);
    button.classList.toggle("active", id === selectedCharacterId);
    const levelBadge = document.querySelector(`#${id}Level`);
    if (levelBadge) levelBadge.textContent = `Lv. ${buttonState.level}`;
  });
}

elements.characterButtons.forEach((button) => {
  button.addEventListener("click", () => selectCharacter(button.dataset.character));
});

elements.gainSmallButton.addEventListener("click", () => addXp(45));
elements.gainBossButton.addEventListener("click", () => addXp(120));
elements.levelUpButton.addEventListener("click", levelUp);
elements.resetButton.addEventListener("click", resetGrowth);

render();
