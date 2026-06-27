const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const roman = ["", "I", "II", "III", "IV", "V"];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randItem = (items) => items[Math.floor(Math.random() * items.length)];
const keyOf = (type, grade) => `${type}_${grade}`;
const parseFaceKey = (key) => {
  const [type, grade] = key.split("_");
  return { type, grade: Number(grade) };
};

const FACE_CATALOG = {
  slash: {
    name: "베기",
    kind: "attack",
    base: 9,
    color: "#d85f45",
    icon: "slash",
  },
  guard: {
    name: "수비",
    kind: "guard",
    base: 8,
    color: "#20887c",
    icon: "guard",
  },
  heal: {
    name: "치유",
    kind: "heal",
    base: 7,
    color: "#4f9b63",
    icon: "heal",
  },
  ember: {
    name: "불꽃",
    kind: "magic",
    base: 10,
    color: "#e26a2c",
    icon: "ember",
  },
  focus: {
    name: "집중",
    kind: "focus",
    base: 6,
    color: "#6e63b6",
    icon: "focus",
  },
  venom: {
    name: "독침",
    kind: "poison",
    base: 7,
    color: "#7d9b42",
    icon: "venom",
  },
};

const DICE_HEROES = [
  {
    id: "taran",
    name: "방벽 기사 타란",
    short: "타란",
    accent: "#20887c",
    role: "수비 연계",
    maxHp: 86,
    slots: ["slash_1", "guard_1", "guard_1", "heal_1", "focus_1", "slash_2"],
    passive: "수비 면이 다음 공격을 키움",
    art: "knight",
  },
  {
    id: "riph",
    name: "그림자 도적 리프",
    short: "리프",
    accent: "#d85f45",
    role: "연속 공격",
    maxHp: 64,
    slots: ["slash_1", "slash_1", "venom_1", "focus_1", "heal_1", "slash_2"],
    passive: "공격이 이어지면 추가타",
    art: "rogue",
  },
  {
    id: "noa",
    name: "룬 마법사 노아",
    short: "노아",
    accent: "#6e63b6",
    role: "집중 폭발",
    maxHp: 58,
    slots: ["ember_1", "focus_1", "ember_1", "guard_1", "heal_1", "ember_2"],
    passive: "집중 뒤 속성 면 강화",
    art: "mage",
  },
];

const DICE_ENEMIES = [
  { name: "수련 골렘", maxHp: 160, attack: 16, color: "#756c5a" },
  { name: "붉은 투사", maxHp: 205, attack: 20, color: "#b45a48" },
  { name: "고대 심판자", maxHp: 260, attack: 24, color: "#4f5f87" },
  { name: "검은 주사위", maxHp: 315, attack: 29, color: "#333333" },
];

const ENEMY_FACE_CATALOG = {
  strike: {
    name: "강타",
    kind: "enemyAttack",
    base: 1,
    color: "#252525",
    icon: "claw",
  },
  guard: {
    name: "암석 방어",
    kind: "enemyGuard",
    base: 0.85,
    color: "#756c5a",
    icon: "guard",
  },
  crush: {
    name: "분쇄",
    kind: "enemyAttack",
    base: 1.35,
    color: "#b45a48",
    icon: "crush",
  },
  rage: {
    name: "분노",
    kind: "enemyRage",
    base: 0.65,
    color: "#d99a2b",
    icon: "rage",
  },
  curse: {
    name: "저주 파동",
    kind: "enemyCurse",
    base: 0.7,
    color: "#6e63b6",
    icon: "curse",
  },
};

const MONSTERS = [
  {
    id: "wolf",
    name: "송곳니 늑대",
    type: "야수",
    base: 28,
    color: "#d85f45",
    skill: "이기면 힘 증가",
    effect: "wolf",
  },
  {
    id: "slime",
    name: "청록 슬라임",
    type: "점액",
    base: 17,
    color: "#45a68e",
    skill: "지면 다음 아군 강화",
    effect: "slime",
  },
  {
    id: "golem",
    name: "바위 골렘",
    type: "고대",
    base: 42,
    color: "#827b68",
    skill: "한 번 버팀",
    effect: "golem",
  },
  {
    id: "bat",
    name: "밤날개 박쥐",
    type: "비행",
    base: 20,
    color: "#6e63b6",
    skill: "상대와 후속열 약화",
    effect: "bat",
  },
  {
    id: "ogre",
    name: "거친 오우거",
    type: "거인",
    base: 56,
    color: "#b36b35",
    skill: "강하지만 승리 후 지침",
    effect: "ogre",
  },
  {
    id: "goblin",
    name: "초록 고블린",
    type: "무리",
    base: 15,
    color: "#79a441",
    skill: "고블린 수만큼 강화",
    effect: "goblin",
  },
  {
    id: "dragon",
    name: "어린 드래곤",
    type: "용",
    base: 48,
    color: "#d66a2e",
    skill: "입장 시 화염 피해",
    effect: "dragon",
  },
  {
    id: "manticore",
    name: "독꼬리 만티코어",
    type: "야수",
    base: 35,
    color: "#7d9b42",
    skill: "승리하면 다음 적 약화",
    effect: "manticore",
  },
  {
    id: "skeleton",
    name: "해골 기사",
    type: "언데드",
    base: 31,
    color: "#b5aa92",
    skill: "패배 직전 뼈갑옷",
    effect: "skeleton",
  },
  {
    id: "ghost",
    name: "흐린 유령",
    type: "언데드",
    base: 24,
    color: "#8ca7b8",
    skill: "첫 상대 힘 흡수",
    effect: "ghost",
  },
  {
    id: "mimic",
    name: "웃는 미믹",
    type: "기묘",
    base: 26,
    color: "#c18b42",
    skill: "상대 힘 일부 복사",
    effect: "mimic",
  },
  {
    id: "shaman",
    name: "버섯 주술사",
    type: "주술",
    base: 22,
    color: "#9a6fb0",
    skill: "양옆 아군 강화",
    effect: "shaman",
  },
  {
    id: "bear",
    name: "겨울 곰",
    type: "야수",
    base: 44,
    color: "#8c6f54",
    skill: "아군이 지면 분노",
    effect: "bear",
  },
  {
    id: "medusa",
    name: "비늘 메두사",
    type: "저주",
    base: 33,
    color: "#548f72",
    skill: "입장 시 석화",
    effect: "medusa",
  },
  {
    id: "phoenix",
    name: "작은 피닉스",
    type: "비행",
    base: 30,
    color: "#df7a33",
    skill: "지면 다음 아군 점화",
    effect: "phoenix",
  },
  {
    id: "scorpion",
    name: "사막 전갈",
    type: "독",
    base: 29,
    color: "#b4812f",
    skill: "지면 상대 힘 감소",
    effect: "scorpion",
  },
  {
    id: "harpy",
    name: "갈고리 하피",
    type: "비행",
    base: 27,
    color: "#4777b8",
    skill: "상대 힘을 훔침",
    effect: "harpy",
  },
  {
    id: "treant",
    name: "묵은 트렌트",
    type: "숲",
    base: 38,
    color: "#4f9b63",
    skill: "뒤 두 칸 보호",
    effect: "treant",
  },
  {
    id: "orc",
    name: "오크 대장",
    type: "무리",
    base: 36,
    color: "#5f9243",
    skill: "근접 몬스터 강화",
    effect: "orc",
  },
  {
    id: "kraken",
    name: "새끼 크라켄",
    type: "심해",
    base: 40,
    color: "#426bb0",
    skill: "큰 상대를 묶음",
    effect: "kraken",
  },
];

const monsterById = Object.fromEntries(MONSTERS.map((monster) => [monster.id, monster]));

const LEAGUE_GEAR = {
  fang: {
    name: "날카로운 송곳니",
    slot: "부적",
    bonus: 9,
    color: "#d85f45",
    mark: "F",
    desc: "기본 힘 증가",
  },
  shell: {
    name: "두꺼운 등갑",
    slot: "갑주",
    bonus: 11,
    color: "#20887c",
    mark: "S",
    desc: "선봉 몬스터에게 안정적",
  },
  banner: {
    name: "무리 깃발",
    slot: "부적",
    bonus: 7,
    color: "#6e63b6",
    mark: "B",
    desc: "시너지 몬스터에 적합",
  },
  core: {
    name: "고대 핵",
    slot: "갑주",
    bonus: 14,
    color: "#d99a2b",
    mark: "C",
    desc: "느린 고화력 몬스터 강화",
  },
};

const state = {
  activeGame: "dice",
  currentView: "home",
  dice: {
    gold: 180,
    selectedHero: "taran",
    selectedSlot: 0,
    detailTab: "level",
    stage: 0,
    heroes: DICE_HEROES.map((hero) => ({
      ...hero,
      level: 1,
      xp: 0,
      hp: hero.maxHp,
      shield: 0,
      focus: 0,
      attackBoost: 0,
      lastOffense: false,
      slots: [...hero.slots],
    })),
    inventory: {
      slash_1: 5,
      guard_1: 5,
      heal_1: 4,
      ember_1: 4,
      focus_1: 4,
      venom_1: 3,
      slash_2: 1,
      guard_2: 1,
    },
    enemy: null,
    round: 0,
    activeBattle: false,
    rolling: false,
    resolving: false,
    resolveIndex: 0,
    activeRollId: null,
    rolls: [],
    effects: [],
    effectSeq: 0,
    reward: null,
    log: ["타란의 주사위 슬롯을 선택하고 면을 장착할 수 있습니다."],
  },
  league: {
    gold: 260,
    leagueStage: 1,
    selectedSlot: 0,
    selectedMonster: "wolf",
    selectedGearSlot: 0,
    detailTab: "level",
    team: ["wolf", "slime", "golem", "bat", "ogre", "goblin"],
    roster: Object.fromEntries(
      MONSTERS.map((monster, index) => [
        monster.id,
        {
          level: index < 6 ? 3 : 1,
          shards: index < 6 ? 18 : 10 + (index % 4) * 4,
          gear: index < 6 && index % 2 === 0 ? ["fang", null] : [null, null],
        },
      ]),
    ),
    gearInventory: {
      fang: 3,
      shell: 2,
      banner: 2,
      core: 1,
    },
    opponent: [],
    reward: null,
    log: ["6마리 순서가 그대로 자동 전투 순서가 됩니다."],
  },
};

function faceInfo(key) {
  const parsed = parseFaceKey(key);
  const catalog = FACE_CATALOG[parsed.type];
  return {
    ...catalog,
    type: parsed.type,
    grade: parsed.grade,
    key,
    label: `${catalog.name} ${roman[parsed.grade]}`,
    value: catalog.base + (parsed.grade - 1) * 6,
  };
}

function enemyFaceInfo(type, enemy = state.dice.enemy) {
  const catalog = ENEMY_FACE_CATALOG[type];
  const value = Math.max(1, Math.ceil((enemy?.attack || 12) * catalog.base));
  return {
    ...catalog,
    type,
    grade: 1,
    key: `enemy_${type}`,
    label: catalog.name,
    value,
  };
}

function enemyDiceTypes(enemy = state.dice.enemy) {
  if (!enemy) return ["strike", "guard", "strike", "rage", "crush", "strike"];
  if (enemy.name.includes("붉은")) return ["strike", "crush", "rage", "strike", "crush", "guard"];
  if (enemy.name.includes("심판자")) return ["curse", "strike", "guard", "rage", "crush", "curse"];
  if (enemy.name.includes("검은")) return ["curse", "rage", "crush", "strike", "curse", "guard"];
  return ["strike", "guard", "strike", "rage", "crush", "guard"];
}

function faceIcon(face) {
  const paths = {
    slash: '<path d="M18 4 7 24l8-3 5-11 2 2-4 9 7-12z" fill="currentColor"/>',
    guard:
      '<path d="M14 3 5 7v6c0 6 4 10 9 12 5-2 9-6 9-12V7z" fill="currentColor"/><path d="M14 7v13" stroke="rgba(255,255,255,.55)" stroke-width="2"/>',
    heal:
      '<path d="M11 5h6v6h6v6h-6v6h-6v-6H5v-6h6z" fill="currentColor"/>',
    ember:
      '<path d="M15 3c3 4-1 5 3 9 2 2 3 4 3 7 0 4-3 7-7 7s-7-3-7-7c0-4 4-7 8-16z" fill="currentColor"/>',
    focus:
      '<path d="M14 4 18 12l8 2-8 2-4 8-4-8-8-2 8-2z" fill="currentColor"/>',
    venom:
      '<path d="M14 3c6 5 8 10 8 14a8 8 0 0 1-16 0c0-4 2-9 8-14z" fill="currentColor"/><circle cx="11" cy="17" r="1.6" fill="rgba(255,255,255,.65)"/><circle cx="17" cy="17" r="1.6" fill="rgba(255,255,255,.65)"/>',
    claw:
      '<path d="M8 23c3-8 3-14 2-20 4 6 5 13 2 21zm7 0c2-8 2-14 0-21 5 6 6 14 3 22zm7 0c2-7 1-13-1-19 5 5 6 12 4 19z" fill="currentColor"/>',
    crush:
      '<path d="M7 6h14l4 6-11 11L3 12z" fill="currentColor"/><path d="M9 10h10M12 14h8" stroke="rgba(255,255,255,.55)" stroke-width="2"/>',
    rage:
      '<path d="M14 3 24 14l-6 2 4 9L9 13l6-1z" fill="currentColor"/>',
    curse:
      '<path d="M14 4c6 0 10 4 10 10s-4 10-10 10S4 20 4 14 8 4 14 4z" fill="currentColor"/><path d="M10 11h8M10 17h8" stroke="rgba(255,255,255,.6)" stroke-width="2"/>',
  };
  return `<span class="face-icon" style="--face-color:${face.color}"><svg viewBox="0 0 28 28" aria-hidden="true">${paths[face.icon] || paths.slash}</svg></span>`;
}

function heroArt(kind) {
  const bodies = {
    knight:
      '<path d="M46 25 65 38v33H27V38z" fill="#f5f0de"/><path d="M31 43h30v22H31z" fill="#20887c"/><path d="M36 24h20l7 13H29z" fill="#252525"/><path d="M40 45h12v20H40z" fill="#f5c96b"/>',
    rogue:
      '<path d="M25 61c8-26 15-38 25-38s16 12 22 38z" fill="#252525"/><path d="M36 42h28l-6 14H42z" fill="#d85f45"/><path d="M37 29h27l-8 10H30z" fill="#f6efe2"/>',
    mage:
      '<path d="M48 20 70 67H26z" fill="#6e63b6"/><path d="M33 40h30l-7 26H40z" fill="#f6efe2"/><circle cx="48" cy="28" r="10" fill="#f5c96b"/><path d="M48 4 53 17H43z" fill="#252525"/>',
  };
  return `<svg viewBox="0 0 96 96" aria-hidden="true">${bodies[kind]}</svg>`;
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

function selectedDiceHero() {
  return state.dice.heroes.find((hero) => hero.id === state.dice.selectedHero);
}

function selectedLeagueMonsterId() {
  return state.league.selectedMonster || state.league.team[state.league.selectedSlot] || MONSTERS[0].id;
}

function selectedLeagueMonster() {
  const id = selectedLeagueMonsterId();
  return {
    id,
    ...monsterById[id],
    ...state.league.roster[id],
  };
}

function gearBonus(gear = []) {
  return gear.reduce((sum, key) => sum + (key ? LEAGUE_GEAR[key].bonus : 0), 0);
}

function diceTrainCost(hero) {
  return 70 + hero.level * 45;
}

function addDiceLog(text) {
  state.dice.log.unshift(text);
  state.dice.log = state.dice.log.slice(0, 22);
}

function addDiceEffect(kind, text, target = "enemy", heroId = null) {
  const heroIndex = heroId ? state.dice.heroes.findIndex((hero) => hero.id === heroId) : -1;
  const heroX = heroIndex >= 0 ? 17 + heroIndex * 33 : 50;
  state.dice.effects.push({
    id: state.dice.effectSeq,
    kind,
    text,
    x: target === "hero" ? heroX : 50,
    y: target === "hero" ? 70 : 18,
  });
  state.dice.effectSeq += 1;
  state.dice.effects = state.dice.effects.slice(-8);
}

function addLeagueLog(text) {
  state.league.log.unshift(text);
  state.league.log = state.league.log.slice(0, 28);
}

function renderApp() {
  $("#screenTitle").textContent = state.activeGame === "dice" ? "다이스 크루" : "몬스터 넘버 리그";
  $("#dailyHook").textContent = state.activeGame === "dice" ? "희귀 면 제작 중" : "내일 조각 상자";
  $("#showDice").classList.toggle("active", state.activeGame === "dice");
  $("#showLeague").classList.toggle("active", state.activeGame === "league");
  $("#diceGame").classList.toggle("active", state.activeGame === "dice");
  $("#leagueGame").classList.toggle("active", state.activeGame === "league");
  $("#navHome").classList.toggle("active", state.currentView === "home");
  $("#navHeroes").classList.toggle("active", state.currentView === "heroes");
  $("#navBattle").classList.toggle("active", state.currentView === "battle");
  ["dice", "league"].forEach((game) => {
    ["Home", "Heroes", "Battle"].forEach((view) => {
      const element = $(`#${game}${view}View`);
      if (!element) return;
      element.classList.toggle("active", state.currentView === view.toLowerCase());
    });
  });
  renderDice();
  renderLeague();
}

function renderDice() {
  $("#diceGold").textContent = state.dice.gold;
  $("#diceFaceTotal").textContent = Object.values(state.dice.inventory).reduce((sum, count) => sum + count, 0);
  $("#diceStage").textContent = `1-${(state.dice.stage % DICE_ENEMIES.length) + 1}`;
  renderDiceHome();
  renderDiceParty();
  renderDiceDetail();
  renderDiceBuilder();
  renderDiceBattle();
}

function renderDiceHome() {
  $("#diceHomeTeam").innerHTML = state.dice.heroes
    .map(
      (hero) => `
        <article class="compact-unit" style="--accent:${hero.accent}">
          <div class="portrait">${heroArt(hero.art)}</div>
          <strong>${hero.short} Lv.${hero.level}</strong>
          <span class="unit-meta">${hero.role}</span>
        </article>
      `,
    )
    .join("");
}

function renderDiceParty() {
  $("#diceParty").innerHTML = state.dice.heroes
    .map((hero) => {
      const hp = Math.max(0, hero.hp);
      const maxHp = hero.maxHp + (hero.level - 1) * 7;
      return `
        <button class="hero-card ${hero.id === state.dice.selectedHero ? "active" : ""}" data-hero="${hero.id}" type="button" style="--accent:${hero.accent}">
          <div class="portrait">${heroArt(hero.art)}</div>
          <h3>${hero.name}</h3>
          <div class="unit-stat-row">
            <span class="level-pill">Lv.${hero.level}</span>
            <span class="power-pill">${hp}/${maxHp}</span>
          </div>
          <p class="unit-meta">${hero.passive}</p>
        </button>
      `;
    })
    .join("");

  $$("#diceParty .hero-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.dice.selectedHero = button.dataset.hero;
      state.dice.selectedSlot = 0;
      renderDice();
    });
  });
}

function renderDiceDetail() {
  const hero = selectedDiceHero();
  const maxHp = hero.maxHp + (hero.level - 1) * 7;
  const cost = diceTrainCost(hero);
  $("#diceHeroDetailHead").innerHTML = `
    <div class="portrait" style="--accent:${hero.accent}">${heroArt(hero.art)}</div>
    <div class="detail-copy">
      <h2>${hero.name}</h2>
      <p class="unit-meta">${hero.passive}</p>
      <div class="detail-stats">
        <span class="level-pill">Lv.${hero.level}</span>
        <span class="power-pill">HP ${maxHp}</span>
        <span class="power-pill">${hero.role}</span>
      </div>
    </div>
  `;
  $("#diceLevelTab").classList.toggle("active", state.dice.detailTab === "level");
  $("#diceEquipTab").classList.toggle("active", state.dice.detailTab === "equip");
  $("#diceLevelPanel").classList.toggle("active", state.dice.detailTab === "level");
  $("#diceEquipPanel").classList.toggle("active", state.dice.detailTab === "equip");
  $("#diceLevelInfo").innerHTML = `
    <div class="level-row">
      <span>현재 전투 체력</span>
      <strong>${Math.max(0, Math.ceil(hero.hp))} / ${maxHp}</strong>
    </div>
    <div class="level-row">
      <span>경험치</span>
      <strong>${hero.xp} / ${34 + hero.level * 12}</strong>
    </div>
    <div class="level-row">
      <span>훈련 비용</span>
      <strong>${cost}G</strong>
    </div>
  `;
  $("#trainDiceHero").disabled = state.dice.gold < cost;
}

function renderDiceBuilder() {
  const hero = selectedDiceHero();
  $("#diceBuilderTitle").textContent = `${hero.short} 주사위`;
  $("#diceSlots").innerHTML = hero.slots
    .map((key, index) => {
      const face = faceInfo(key);
      return `
        <button class="die-slot ${state.dice.selectedSlot === index ? "selected" : ""}" data-slot="${index}" type="button">
          <span class="slot-number"><b>${index + 1}</b><span>${face.value}</span></span>
          ${faceIcon(face)}
          <strong class="face-name">${face.label}</strong>
        </button>
      `;
    })
    .join("");

  $$("#diceSlots .die-slot").forEach((button) => {
    button.addEventListener("click", () => {
      state.dice.selectedSlot = Number(button.dataset.slot);
      renderDiceBuilder();
    });
  });

  const inventoryKeys = Object.keys(state.dice.inventory)
    .filter((key) => state.dice.inventory[key] > 0)
    .sort((a, b) => {
      const faceA = faceInfo(a);
      const faceB = faceInfo(b);
      if (faceA.type === faceB.type) return faceA.grade - faceB.grade;
      return faceA.name.localeCompare(faceB.name, "ko");
    });

  $("#faceInventory").innerHTML = inventoryKeys
    .map((key) => {
      const face = faceInfo(key);
      const count = state.dice.inventory[key];
      return `
        <article class="face-card" style="--face-color:${face.color}">
          ${faceIcon(face)}
          <div>
            <strong class="face-name">${face.label}</strong>
            <span>보유 ${count} / 위력 ${face.value}</span>
            <div class="face-actions">
              <button class="mini-action equip-face" data-face="${key}" type="button">장착</button>
              <button class="mini-action alt synth-face" data-face="${key}" type="button" ${count < 3 || face.grade >= 5 ? "disabled" : ""}>합성</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  $$(".equip-face").forEach((button) => {
    button.addEventListener("click", () => equipFace(button.dataset.face));
  });

  $$(".synth-face").forEach((button) => {
    button.addEventListener("click", () => synthFace(button.dataset.face));
  });
}

function renderDiceBattle() {
  const enemy = state.dice.enemy || makeDiceEnemy();
  const hpPercent = clamp((enemy.hp / enemy.maxHp) * 100, 0, 100);
  $("#diceEnemyName").textContent = enemy.name;
  $("#diceEnemyHp").textContent = `${Math.max(0, Math.ceil(enemy.hp))}/${enemy.maxHp} · 보호 ${Math.ceil(enemy.shield || 0)}`;
  $("#diceEnemyHpBar").style.width = `${hpPercent}%`;
  $("#diceEnemyArt").style.background = `linear-gradient(145deg, ${enemy.color}, #252525)`;
  $("#diceEnemyArt").innerHTML = monsterArt({
    type: "고대",
    color: enemy.color,
  });

  $("#diceCombatants").innerHTML = state.dice.heroes
    .map((hero) => {
      const maxHp = hero.maxHp + (hero.level - 1) * 7;
      return `
        <div class="combatant-pill">
          <strong>${hero.short}</strong>
          <span>HP ${Math.max(0, Math.ceil(hero.hp))}/${maxHp} · 보호 ${Math.ceil(hero.shield || 0)}</span>
        </div>
      `;
    })
    .join("");

  renderDiceRollStage();
  $("#startDiceBattle").disabled = state.dice.activeBattle || Boolean(state.dice.reward);
  $("#rollDiceRound").disabled = !state.dice.activeBattle || state.dice.rolling || state.dice.resolving || Boolean(state.dice.reward);
  $("#rollDiceRound").textContent = state.dice.rolling ? "굴리는 중..." : state.dice.resolving ? "행동 중..." : "라운드 굴리기";


  if (state.dice.reward) {
    $("#diceReward").classList.remove("hidden");
    $("#diceReward").innerHTML = state.dice.reward
      .map((key) => {
        const face = faceInfo(key);
        return `
          <button class="reward-card dice-reward-card" data-face="${key}" type="button">
            ${faceIcon(face)}
            <strong class="face-name">${face.label}</strong>
            <span class="unit-meta">보상 면 획득</span>
          </button>
        `;
      })
      .join("");
    $$(".dice-reward-card").forEach((button) => {
      button.addEventListener("click", () => claimDiceReward(button.dataset.face));
    });
  } else {
    $("#diceReward").classList.add("hidden");
    $("#diceReward").innerHTML = "";
  }

  $("#diceLog").innerHTML = state.dice.log.map((line) => `<li>${line}</li>`).join("");
}

function renderDiceRollStage() {
  const rollByHero = Object.fromEntries(state.dice.rolls.map((roll) => [roll.heroId, roll]));
  const enemyRoll = state.dice.rolls.find((roll) => roll.actorType === "enemy");
  const enemy = state.dice.enemy || makeDiceEnemy();
  const hasFx = state.dice.effects.length > 0;
  $("#diceRollStage").classList.toggle("has-fx", hasFx);
  $("#diceRollStage").innerHTML =
    [
      (() => {
        const face = enemyRoll ? enemyRoll.face : enemyFaceInfo(enemyDiceTypes(enemy)[0], enemy);
        const active = Boolean(enemyRoll);
        const statusClass = state.dice.rolling && active ? "rolling" : active ? "result" : "";
        const activeTurn = state.dice.activeRollId === enemyRoll?.id;
        return `
          <article class="battle-die enemy-die ${active ? "active" : ""} ${statusClass} ${activeTurn ? "active-turn" : ""}" style="--face-color:${face.color}">
            <div class="die-owner">
              <strong>몬스터</strong>
              <span>${activeTurn ? "행동 중" : enemyRoll ? `${enemyRoll.slot + 1}번` : "대기"}</span>
            </div>
            <div class="die-cube">${faceIcon(face)}</div>
            <div class="die-result-copy">
              <strong>${enemyRoll ? face.label : "몬스터 주사위"}</strong>
              <span>${enemyRoll ? `위력 ${face.value}` : "라운드 시작 전"}</span>
            </div>
          </article>
        `;
      })(),
      ...state.dice.heroes.map((hero, index) => {
        const roll = rollByHero[hero.id];
        const face = roll ? roll.face : faceInfo(hero.slots[index % hero.slots.length]);
        const active = Boolean(roll);
        const statusClass = state.dice.rolling && active ? "rolling" : active ? "result" : "";
        const activeTurn = state.dice.activeRollId === roll?.id;
        return `
          <article class="battle-die ${active ? "active" : ""} ${statusClass} ${activeTurn ? "active-turn" : ""}" style="--face-color:${face.color}">
            <div class="die-owner">
              <strong>${hero.short}</strong>
              <span>${activeTurn ? "행동 중" : roll ? `${roll.slot + 1}번` : "대기"}</span>
            </div>
            <div class="die-cube">${faceIcon(face)}</div>
            <div class="die-result-copy">
              <strong>${roll ? face.label : "주사위 대기"}</strong>
              <span>${roll ? `위력 ${face.value}` : "라운드 시작 전"}</span>
            </div>
          </article>
        `;
      }),
    ].join("") +
    state.dice.effects
      .map(
        (effect, index) => `
          <span class="fx-float ${effect.kind}" style="--fx-x:${effect.x}%; --fx-y:${effect.y + index * 2}%">${effect.text}</span>
        `,
      )
      .join("");
}

function makeDiceEnemy() {
  const template = DICE_ENEMIES[state.dice.stage % DICE_ENEMIES.length];
  const loop = Math.floor(state.dice.stage / DICE_ENEMIES.length);
  return {
    ...template,
    maxHp: template.maxHp + loop * 70,
    hp: template.maxHp + loop * 70,
    attack: template.attack + loop * 5,
    shield: 0,
    rage: 0,
    poison: 0,
  };
}

function equipFace(key) {
  if (!state.dice.inventory[key]) return;
  const hero = selectedDiceHero();
  const oldKey = hero.slots[state.dice.selectedSlot];
  state.dice.inventory[key] -= 1;
  state.dice.inventory[oldKey] = (state.dice.inventory[oldKey] || 0) + 1;
  hero.slots[state.dice.selectedSlot] = key;
  addDiceLog(`${hero.short} ${state.dice.selectedSlot + 1}번 슬롯에 ${faceInfo(key).label} 장착.`);
  renderDice();
}

function trainDiceHero() {
  const hero = selectedDiceHero();
  const cost = diceTrainCost(hero);
  if (state.dice.gold < cost) return;
  state.dice.gold -= cost;
  hero.level += 1;
  hero.hp = hero.maxHp + (hero.level - 1) * 7;
  addDiceLog(`${hero.short} 훈련 완료. Lv.${hero.level}.`);
  renderDice();
}

function synthFace(key) {
  const face = faceInfo(key);
  if ((state.dice.inventory[key] || 0) < 3 || face.grade >= 5) return;
  const nextKey = keyOf(face.type, face.grade + 1);
  state.dice.inventory[key] -= 3;
  state.dice.inventory[nextKey] = (state.dice.inventory[nextKey] || 0) + 1;
  addDiceLog(`${face.label} 3개를 ${faceInfo(nextKey).label}로 합성.`);
  renderDice();
}

function autoEquipDice() {
  const hero = selectedDiceHero();
  const preference = {
    taran: ["guard", "guard", "slash", "heal", "focus", "guard"],
    riph: ["slash", "venom", "slash", "focus", "heal", "slash"],
    noa: ["ember", "focus", "ember", "guard", "heal", "ember"],
  }[hero.id];

  preference.forEach((type, slot) => {
    const candidate = Object.keys(state.dice.inventory)
      .map(faceInfo)
      .filter((face) => face.type === type && state.dice.inventory[face.key] > 0)
      .sort((a, b) => b.grade - a.grade)[0];
    if (!candidate) return;
    state.dice.selectedSlot = slot;
    equipFace(candidate.key);
  });
}

function startDiceBattle() {
  state.dice.enemy = makeDiceEnemy();
  state.dice.activeBattle = true;
  state.dice.reward = null;
  state.dice.round = 0;
  state.dice.rolling = false;
  state.dice.resolving = false;
  state.dice.resolveIndex = 0;
  state.dice.activeRollId = null;
  state.dice.rolls = [];
  state.dice.effects = [];
  state.dice.heroes.forEach((hero) => {
    hero.hp = hero.maxHp + (hero.level - 1) * 7;
    hero.shield = 0;
    hero.focus = 0;
    hero.attackBoost = 0;
    hero.lastOffense = false;
    if (hero.id === "taran") {
      const guards = hero.slots.filter((key) => faceInfo(key).kind === "guard").length;
      if (guards >= 2) {
        hero.shield = 8 + hero.level * 3;
        addDiceLog(`타란이 수비 면 ${guards}개로 시작 보호막 ${hero.shield} 획득.`);
      }
    }
  });
  addDiceLog(`${state.dice.enemy.name} 전투 시작.`);
  renderDice();
}

function rollDiceRound() {
  const enemy = state.dice.enemy;
  if (!enemy || !state.dice.activeBattle || state.dice.rolling || state.dice.resolving) return;
  state.dice.round += 1;
  state.dice.rolling = true;
  state.dice.resolving = false;
  state.dice.resolveIndex = 0;
  state.dice.activeRollId = null;
  state.dice.effects = [];
  const heroRolls = state.dice.heroes
    .filter((hero) => hero.hp > 0 && enemy.hp > 0)
    .map((hero) => {
      const slot = Math.floor(Math.random() * 6);
      return {
        id: `hero-${hero.id}`,
        actorType: "hero",
        heroId: hero.id,
        slot,
        face: faceInfo(hero.slots[slot]),
      };
    });
  const enemyDice = enemyDiceTypes(enemy);
  const enemySlot = Math.floor(Math.random() * enemyDice.length);
  const enemyRoll = {
    id: "enemy",
    actorType: "enemy",
    heroId: null,
    slot: enemySlot,
    face: enemyFaceInfo(enemyDice[enemySlot], enemy),
  };
  state.dice.rolls = [...heroRolls, enemyRoll];
  addDiceLog(`라운드 ${state.dice.round}: 주사위 굴림.`);
  renderDice();

  window.setTimeout(() => {
    state.dice.rolling = false;
    state.dice.resolving = true;
    state.dice.activeRollId = null;
    addDiceLog("결과 공개. 순서대로 행동합니다.");
    renderDice();
    window.setTimeout(resolveNextDiceRoll, 520);
  }, 680);
}

function resolveNextDiceRoll() {
  if (!state.dice.resolving || !state.dice.activeBattle) return;
  const roll = state.dice.rolls[state.dice.resolveIndex];
  if (!roll) {
    finishDiceRound();
    return;
  }

  state.dice.activeRollId = roll.id;
  state.dice.effects = [];

  if (roll.actorType === "hero") {
    const hero = state.dice.heroes.find((entry) => entry.id === roll.heroId);
    if (hero && hero.hp > 0 && state.dice.enemy.hp > 0) {
      resolveFace(hero, roll.face, roll.slot, state.dice.enemy);
    }
  } else if (state.dice.enemy.hp > 0) {
    resolveEnemyFace(roll.face);
  }

  renderDice();

  if (state.dice.enemy.hp <= 0) {
    state.dice.resolving = false;
    state.dice.activeRollId = null;
    winDiceBattle();
    renderDice();
    queueDiceEffectClear();
    return;
  }

  if (state.dice.heroes.every((hero) => hero.hp <= 0)) {
    state.dice.resolving = false;
    state.dice.activeBattle = false;
    state.dice.gold += 25;
    state.dice.activeRollId = null;
    addDiceLog("원정 실패. 보험금 25골드 획득.");
    renderDice();
    queueDiceEffectClear();
    return;
  }

  state.dice.resolveIndex += 1;
  window.setTimeout(resolveNextDiceRoll, 900);
}

function finishDiceRound() {
  const enemy = state.dice.enemy;
  state.dice.effects = [];
  if (enemy.hp > 0 && enemy.poison > 0) {
    const poisonDamage = enemy.poison * 3;
    enemy.hp -= poisonDamage;
    addDiceEffect("poison", `-${poisonDamage}`, "enemy");
    addDiceLog(`${enemy.name}이 독으로 ${poisonDamage} 피해.`);
  }

  state.dice.resolving = false;
  state.dice.activeRollId = null;

  if (enemy.hp <= 0) {
    winDiceBattle();
  }

  renderDice();
  queueDiceEffectClear();
}

function queueDiceEffectClear() {
  const effectSeq = state.dice.effectSeq;
  window.setTimeout(() => {
    if (state.dice.effectSeq !== effectSeq || state.dice.rolling || state.dice.resolving) return;
    state.dice.effects = [];
    renderDiceBattle();
  }, 980);
}

function resolveFace(hero, face, slot, enemy) {
  const amount = face.value + hero.level * 2;

  if (face.kind === "guard") {
    let shield = amount;
    hero.shield += shield;
    addDiceEffect("guard", `+${shield}`, "hero", hero.id);
    hero.lastOffense = false;
    if (hero.id === "taran") {
      hero.attackBoost += Math.ceil(shield * 0.55);
      if (slot === 5) {
        state.dice.heroes.forEach((ally) => {
          if (ally.hp > 0) {
            const allyShield = Math.ceil(shield * 0.35);
            ally.shield += allyShield;
            addDiceEffect("guard", `+${allyShield}`, "hero", ally.id);
          }
        });
        addDiceLog(`${hero.short}: 6번 수비로 전원 보호막.`);
      }
    }
    addDiceLog(`${hero.short}: ${face.label}으로 보호막 ${shield}.`);
    return;
  }

  if (face.kind === "heal") {
    const target = state.dice.heroes
      .filter((ally) => ally.hp > 0)
      .sort((a, b) => a.hp / (a.maxHp + (a.level - 1) * 7) - b.hp / (b.maxHp + (b.level - 1) * 7))[0];
    if (target) {
      const maxHp = target.maxHp + (target.level - 1) * 7;
      target.hp = Math.min(maxHp, target.hp + amount);
      addDiceEffect("heal", `+${amount}`, "hero", target.id);
      addDiceLog(`${hero.short}: ${target.short} 회복 ${amount}.`);
    }
    hero.lastOffense = false;
    return;
  }

  if (face.kind === "focus") {
    hero.focus += face.grade + 1;
    if (hero.id === "noa") hero.focus += 1;
    addDiceEffect("focus", `집중 +${face.grade + 1}`, "hero", hero.id);
    addDiceLog(`${hero.short}: 집중 ${hero.focus} 축적.`);
    hero.lastOffense = false;
    return;
  }

  let damage = amount;
  if (hero.id === "taran" && hero.attackBoost > 0) {
    damage += hero.attackBoost;
    addDiceLog(`타란의 방벽 연계 +${hero.attackBoost}.`);
    hero.attackBoost = 0;
  }

  if (hero.id === "riph") {
    if (hero.lastOffense) {
      const extra = 5 + face.grade * 4;
      damage += extra;
      addDiceLog(`리프의 연속 공격 +${extra}.`);
    }
    if (slot === 0) damage += 5;
  }

  if (hero.id === "noa" && face.kind === "magic") {
    if (hero.focus > 0) {
      damage += hero.focus * 8;
      addDiceLog(`노아의 집중 폭발 +${hero.focus * 8}.`);
      hero.focus = 0;
    }
    if (slot === 5) damage = Math.ceil(damage * 1.3);
  }

  if (face.kind === "poison") {
    enemy.poison += face.grade + 1;
    addDiceEffect("poison", `독 +${face.grade + 1}`, "enemy");
    addDiceLog(`${hero.short}: 독 ${face.grade + 1} 누적.`);
  }

  damageEnemy(damage, face.kind === "magic" ? "focus" : "damage");
  hero.lastOffense = true;
  addDiceLog(`${hero.short}: ${face.label}으로 ${damage} 피해.`);
}

function damageEnemy(amount, kind = "damage") {
  const enemy = state.dice.enemy;
  const blocked = Math.min(enemy.shield || 0, amount);
  enemy.shield = Math.max(0, (enemy.shield || 0) - blocked);
  const damage = amount - blocked;
  if (blocked > 0) addDiceEffect("guard", `방어 ${blocked}`, "enemy");
  if (damage > 0) {
    enemy.hp -= damage;
    addDiceEffect(kind, `-${damage}`, "enemy");
  }
  return damage;
}

function resolveEnemyFace(face) {
  const enemy = state.dice.enemy;
  if (!enemy) return;
  if (face.kind === "enemyGuard") {
    const shield = face.value + Math.floor(state.dice.round * 2);
    enemy.shield = (enemy.shield || 0) + shield;
    addDiceEffect("guard", `+${shield}`, "enemy");
    addDiceLog(`${enemy.name}: ${face.label}로 보호막 ${shield}.`);
    return;
  }

  if (face.kind === "enemyRage") {
    const rage = Math.max(4, face.value);
    enemy.rage = (enemy.rage || 0) + rage;
    addDiceEffect("focus", `분노 +${rage}`, "enemy");
    addDiceLog(`${enemy.name}: 분노를 모아 다음 공격 +${rage}.`);
    return;
  }

  if (face.kind === "enemyCurse") {
    const damage = Math.max(3, face.value);
    state.dice.heroes.forEach((hero) => {
      if (hero.hp <= 0) return;
      const blocked = Math.min(hero.shield, damage);
      hero.shield -= blocked;
      const finalDamage = damage - blocked;
      hero.hp -= finalDamage;
      if (blocked > 0) addDiceEffect("guard", `방어 ${blocked}`, "hero", hero.id);
      if (finalDamage > 0) addDiceEffect("enemy", `-${finalDamage}`, "hero", hero.id);
    });
    addDiceLog(`${enemy.name}: ${face.label}으로 전원 피해 ${damage}.`);
    return;
  }

  enemyAttack(face.value, face.label);
}

function enemyAttack(rawDamage = state.dice.enemy?.attack || 0, label = state.dice.enemy?.name || "몬스터") {
  const enemy = state.dice.enemy;
  const target = state.dice.heroes
    .filter((hero) => hero.hp > 0)
    .sort((a, b) => a.hp - b.hp)[0];
  if (!target) return;
  let damage = rawDamage + state.dice.round * 2 + (enemy.rage || 0);
  if (enemy.rage > 0) {
    addDiceEffect("focus", `분노 +${enemy.rage}`, "enemy");
    enemy.rage = 0;
  }
  const blocked = Math.min(target.shield, damage);
  target.shield -= blocked;
  damage -= blocked;
  target.hp -= damage;
  if (blocked > 0) addDiceEffect("guard", `방어 ${blocked}`, "hero", target.id);
  if (damage > 0) addDiceEffect("enemy", `-${damage}`, "hero", target.id);
  addDiceLog(`${enemy.name}: ${label}로 ${target.short} 공격. 피해 ${damage}, 방어 ${blocked}.`);
}

function winDiceBattle() {
  state.dice.activeBattle = false;
  state.dice.gold += 65;
  addDiceLog(`${state.dice.enemy.name} 격파. 65골드 획득.`);
  state.dice.heroes.forEach((hero) => {
    hero.xp += 24;
    const needed = 34 + hero.level * 12;
    if (hero.xp >= needed) {
      hero.xp -= needed;
      hero.level += 1;
      addDiceLog(`${hero.short} Lv.${hero.level} 달성.`);
    }
  });
  state.dice.reward = makeDiceRewards();
}

function makeDiceRewards() {
  const types = Object.keys(FACE_CATALOG);
  const reward = new Set();
  while (reward.size < 3) {
    const type = randItem(types);
    const grade = Math.random() < 0.18 ? 2 : 1;
    reward.add(keyOf(type, grade));
  }
  return [...reward];
}

function claimDiceReward(key) {
  state.dice.inventory[key] = (state.dice.inventory[key] || 0) + 1;
  state.dice.stage += 1;
  state.dice.reward = null;
  state.dice.enemy = makeDiceEnemy();
  addDiceLog(`${faceInfo(key).label} 획득. 다음 원정 개방.`);
  renderDice();
}

function monsterLevel(id) {
  return state.league.roster[id].level;
}

function monsterPower(id, level = monsterLevel(id), gear = state.league.roster[id]?.gear) {
  const monster = monsterById[id];
  return monster.base + (level - 1) * 5 + Math.floor((level - 1) / 5) * 8 + gearBonus(gear || []);
}

function levelCost(id) {
  const level = monsterLevel(id);
  return {
    shards: 5 + level * 3,
    gold: 28 + level * 12,
  };
}

function renderLeague() {
  ensureOpponent();
  $("#leagueGold").textContent = state.league.gold;
  $("#leagueStage").textContent = `브론즈 ${state.league.leagueStage}`;
  $("#teamSlotHint").textContent = `${state.league.selectedSlot + 1}번 슬롯 선택됨`;
  renderLeagueHome();
  renderLeagueTeam();
  renderLeagueDetail();
  renderLeagueBattle();
  renderMonsterRoster();
}

function renderLeagueHome() {
  $("#leagueHomeTeam").innerHTML = state.league.team
    .slice(0, 6)
    .map((id) => {
      const monster = monsterById[id];
      return `
        <article class="compact-unit" style="--accent:${monster.color}">
          <div class="monster-avatar">${monsterArt(monster)}</div>
          <strong>${monster.name}</strong>
          <span class="unit-meta">Lv.${monsterLevel(id)} · ${monsterPower(id)}</span>
        </article>
      `;
    })
    .join("");
}

function renderLeagueTeam() {
  $("#leagueTeam").innerHTML = state.league.team
    .map((id, index) => {
      const monster = monsterById[id];
      const level = monsterLevel(id);
      return `
        <button class="team-slot ${state.league.selectedSlot === index ? "selected" : ""}" data-slot="${index}" type="button" style="--accent:${monster.color}">
          <span class="slot-tag">${index + 1}</span>
          <div class="monster-avatar">${monsterArt(monster)}</div>
          <h3>${monster.name}</h3>
          <div class="unit-stat-row">
            <span class="level-pill">Lv.${level}</span>
            <span class="power-pill">${monsterPower(id, level)}</span>
          </div>
        </button>
      `;
    })
    .join("");

  $$("#leagueTeam .team-slot").forEach((button) => {
    button.addEventListener("click", () => {
      state.league.selectedSlot = Number(button.dataset.slot);
      state.league.selectedMonster = state.league.team[state.league.selectedSlot];
      renderLeague();
    });
  });
}

function renderLeagueDetail() {
  const selected = selectedLeagueMonster();
  const monster = monsterById[selected.id];
  const cost = levelCost(selected.id);
  const canLevel = selected.shards >= cost.shards && state.league.gold >= cost.gold;
  $("#leagueHeroDetailHead").innerHTML = `
    <div class="monster-avatar" style="--accent:${monster.color}">${monsterArt(monster)}</div>
    <div class="detail-copy">
      <h2>${monster.name}</h2>
      <p class="unit-meta">${monster.type} · ${monster.skill}</p>
      <div class="detail-stats">
        <span class="level-pill">Lv.${selected.level}</span>
        <span class="power-pill">힘 ${monsterPower(selected.id)}</span>
        <span class="power-pill">장비 +${gearBonus(selected.gear)}</span>
      </div>
    </div>
  `;
  $("#leagueLevelTab").classList.toggle("active", state.league.detailTab === "level");
  $("#leagueEquipTab").classList.toggle("active", state.league.detailTab === "equip");
  $("#leagueLevelPanel").classList.toggle("active", state.league.detailTab === "level");
  $("#leagueEquipPanel").classList.toggle("active", state.league.detailTab === "equip");
  $("#leagueLevelInfo").innerHTML = `
    <div class="level-row">
      <span>현재 힘</span>
      <strong>${monsterPower(selected.id)}</strong>
    </div>
    <div class="level-row">
      <span>보유 조각</span>
      <strong>${selected.shards} / ${cost.shards}</strong>
    </div>
    <div class="level-row">
      <span>강화 비용</span>
      <strong>${cost.gold}G</strong>
    </div>
  `;
  $("#levelSelectedMonster").disabled = !canLevel;
  renderLeagueGear();
}

function renderLeagueGear() {
  const selected = selectedLeagueMonster();
  $("#leagueGearSlots").innerHTML = selected.gear
    .map((key, index) => {
      const gear = key ? LEAGUE_GEAR[key] : null;
      return `
        <button class="gear-slot ${state.league.selectedGearSlot === index ? "selected" : ""}" data-slot="${index}" type="button">
          <span class="slot-number"><b>${index === 0 ? "부적" : "갑주"}</b><span>${gear ? `+${gear.bonus}` : "비어있음"}</span></span>
          ${gear ? gearIcon(gear) : '<span class="gear-icon" style="--gear-color:#b9b0a0">+</span>'}
          <strong class="face-name">${gear ? gear.name : "장비 없음"}</strong>
        </button>
      `;
    })
    .join("");

  $("#leagueGearInventory").innerHTML = Object.entries(LEAGUE_GEAR)
    .map(([key, gear]) => {
      const count = state.league.gearInventory[key] || 0;
      return `
        <article class="gear-card">
          ${gearIcon(gear)}
          <strong class="face-name">${gear.name}</strong>
          <span class="unit-meta">${gear.slot} · 힘 +${gear.bonus} · 보유 ${count}</span>
          <button class="mini-action equip-gear" data-gear="${key}" type="button" ${count <= 0 ? "disabled" : ""}>장착</button>
        </article>
      `;
    })
    .join("");

  $$("#leagueGearSlots .gear-slot").forEach((button) => {
    button.addEventListener("click", () => {
      state.league.selectedGearSlot = Number(button.dataset.slot);
      renderLeagueDetail();
    });
  });

  $$(".equip-gear").forEach((button) => {
    button.addEventListener("click", () => equipLeagueGear(button.dataset.gear));
  });
}

function gearIcon(gear) {
  return `<span class="gear-icon" style="--gear-color:${gear.color}">${gear.mark}</span>`;
}

function renderLeagueBattle() {
  $("#myLineup").innerHTML = state.league.team.map((id) => lineupMarkup(id, monsterLevel(id))).join("");
  $("#enemyLineup").innerHTML = state.league.opponent.map((entry) => lineupMarkup(entry.id, entry.level, null)).join("");
  $("#startLeagueBattle").disabled = Boolean(state.league.reward);
  $("#nextOpponent").disabled = Boolean(state.league.reward);

  if (state.league.reward) {
    $("#leagueReward").classList.remove("hidden");
    $("#leagueReward").innerHTML = state.league.reward.ids
      .map((id) => {
        const monster = monsterById[id];
        return `
          <button class="reward-card league-reward-card" data-monster="${id}" type="button" style="--accent:${monster.color}">
            <div class="monster-avatar">${monsterArt(monster)}</div>
            <strong class="face-name">${monster.name}</strong>
            <span class="unit-meta">조각 +${state.league.reward.amount}</span>
          </button>
        `;
      })
      .join("");
    $$(".league-reward-card").forEach((button) => {
      button.addEventListener("click", () => claimLeagueReward(button.dataset.monster));
    });
  } else {
    $("#leagueReward").classList.add("hidden");
    $("#leagueReward").innerHTML = "";
  }

  $("#leagueLog").innerHTML = state.league.log.map((line) => `<li>${line}</li>`).join("");
}

function lineupMarkup(id, level, gear = state.league.roster[id]?.gear) {
  const monster = monsterById[id];
  return `
    <div class="lineup-unit">
      <strong>${monster.name} Lv.${level}</strong>
      <span>${monsterPower(id, level, gear)}</span>
    </div>
  `;
}

function renderMonsterRoster() {
  $("#monsterRoster").innerHTML = MONSTERS.map((monster) => {
    const info = state.league.roster[monster.id];
    const inTeam = state.league.team.includes(monster.id);
    const selected = state.league.selectedMonster === monster.id;
    return `
      <article class="monster-card ${inTeam ? "in-team" : ""} ${selected ? "selected" : ""}" style="--accent:${monster.color}">
        <div class="monster-avatar">${monsterArt(monster)}</div>
        <h3>${monster.name}</h3>
        <div class="unit-stat-row">
          <span class="level-pill">Lv.${info.level}</span>
          <span class="power-pill">${monsterPower(monster.id, info.level)}</span>
        </div>
        <p class="skill">${monster.skill}</p>
        <span class="unit-meta">조각 ${info.shards} · 장비 +${gearBonus(info.gear)}</span>
        <div class="card-actions">
          <button class="mini-action view-monster" data-monster="${monster.id}" type="button">상세</button>
          <button class="mini-action assign-monster" data-monster="${monster.id}" type="button">${inTeam ? "이동" : "편성"}</button>
        </div>
      </article>
    `;
  }).join("");

  $$(".view-monster").forEach((button) => {
    button.addEventListener("click", () => {
      state.league.selectedMonster = button.dataset.monster;
      state.league.detailTab = "level";
      renderLeague();
    });
  });

  $$(".assign-monster").forEach((button) => {
    button.addEventListener("click", () => assignMonster(button.dataset.monster));
  });
}

function assignMonster(id) {
  const currentIndex = state.league.team.indexOf(id);
  const selectedIndex = state.league.selectedSlot;
  if (currentIndex >= 0) {
    const old = state.league.team[selectedIndex];
    state.league.team[selectedIndex] = id;
    state.league.team[currentIndex] = old;
  } else {
    state.league.team[selectedIndex] = id;
  }
  state.league.selectedMonster = id;
  addLeagueLog(`${selectedIndex + 1}번 슬롯에 ${monsterById[id].name} 편성.`);
  renderLeague();
}

function levelMonster(id) {
  const cost = levelCost(id);
  const info = state.league.roster[id];
  if (info.shards < cost.shards || state.league.gold < cost.gold) return;
  info.shards -= cost.shards;
  info.level += 1;
  state.league.gold -= cost.gold;
  addLeagueLog(`${monsterById[id].name} Lv.${info.level} 강화.`);
  renderLeague();
}

function equipLeagueGear(key) {
  const id = selectedLeagueMonsterId();
  const info = state.league.roster[id];
  const slot = state.league.selectedGearSlot;
  if ((state.league.gearInventory[key] || 0) <= 0) return;
  const oldKey = info.gear[slot];
  if (oldKey) state.league.gearInventory[oldKey] = (state.league.gearInventory[oldKey] || 0) + 1;
  state.league.gearInventory[key] -= 1;
  info.gear[slot] = key;
  addLeagueLog(`${monsterById[id].name}에게 ${LEAGUE_GEAR[key].name} 장착.`);
  renderLeague();
}

function autoTeam() {
  state.league.team = [...MONSTERS]
    .sort((a, b) => monsterPower(b.id) - monsterPower(a.id))
    .slice(0, 6)
    .map((monster) => monster.id);
  state.league.selectedSlot = 0;
  addLeagueLog("전투력 상위 6마리로 재편성.");
  renderLeague();
}

function ensureOpponent() {
  if (state.league.opponent.length) return;
  generateOpponent();
}

function generateOpponent() {
  const offset = state.league.leagueStage % MONSTERS.length;
  const ids = [];
  for (let index = 0; index < 6; index += 1) {
    ids.push(MONSTERS[(offset + index * 3) % MONSTERS.length].id);
  }
  state.league.opponent = ids.map((id, index) => ({
    id,
    level: Math.max(1, state.league.leagueStage + (index % 3)),
  }));
  addLeagueLog("새 상대 팀이 등록됨.");
}

function startLeagueBattle() {
  if (state.league.reward) return;
  const result = simulateLeagueBattle();
  state.league.gold += result.win ? 80 : 32;
  if (result.win) state.league.leagueStage += 1;
  state.league.reward = {
    amount: result.win ? 12 : 6,
    ids: makeMonsterRewards(),
    win: result.win,
  };
  addLeagueLog(result.win ? "승리 보상 80골드." : "패배 보상 32골드.");
  renderLeague();
}

function makeMonsterRewards() {
  const reward = new Set();
  while (reward.size < 3) {
    const weighted = Math.random() < 0.62 ? state.league.team : MONSTERS.map((monster) => monster.id);
    reward.add(randItem(weighted));
  }
  return [...reward];
}

function claimLeagueReward(id) {
  state.league.roster[id].shards += state.league.reward.amount;
  addLeagueLog(`${monsterById[id].name} 조각 +${state.league.reward.amount}.`);
  state.league.reward = null;
  state.league.opponent = [];
  ensureOpponent();
  renderLeague();
}

function buildBattleTeam(entries, side) {
  const fighters = entries.map((entry, index) => {
    const id = typeof entry === "string" ? entry : entry.id;
    const level = typeof entry === "string" ? monsterLevel(id) : entry.level;
    const gear = typeof entry === "string" ? state.league.roster[id]?.gear : null;
    return {
      id,
      side,
      index,
      level,
      name: monsterById[id].name,
      effect: monsterById[id].effect,
      power: monsterPower(id, level, gear),
      entered: false,
      used: false,
    };
  });

  const goblinCount = fighters.filter((fighter) => fighter.effect === "goblin").length;
  fighters.forEach((fighter, index) => {
    if (fighter.effect === "goblin" && goblinCount > 1) {
      const gain = goblinCount * scaleValue(fighter, 4);
      fighter.power += gain;
      addLeagueLog(`${fighter.name}: 무리 보너스 +${gain}.`);
    }
    if (fighter.effect === "shaman") {
      [fighters[index - 1], fighters[index + 1]].filter(Boolean).forEach((ally) => {
        const gain = scaleValue(fighter, 5);
        ally.power += gain;
        addLeagueLog(`${fighter.name}: ${ally.name} 주술 +${gain}.`);
      });
    }
    if (fighter.effect === "treant") {
      [fighters[index + 1], fighters[index + 2]].filter(Boolean).forEach((ally) => {
        const gain = scaleValue(fighter, 6);
        ally.power += gain;
        addLeagueLog(`${fighter.name}: ${ally.name} 나무껍질 +${gain}.`);
      });
    }
    if (fighter.effect === "orc") {
      fighters
        .filter((ally) => ["wolf", "ogre", "goblin", "bear", "scorpion"].includes(ally.effect))
        .forEach((ally) => {
          const gain = scaleValue(fighter, 4);
          ally.power += gain;
        });
      addLeagueLog(`${fighter.name}: 근접 몬스터 지휘.`);
    }
  });

  return fighters;
}

function simulateLeagueBattle() {
  state.league.log = [];
  addLeagueLog("리그전 시작.");
  const myQueue = buildBattleTeam(state.league.team, "my");
  const enemyQueue = buildBattleTeam(state.league.opponent, "enemy");
  let mine = null;
  let enemy = null;
  let steps = 0;

  while ((mine || myQueue.length) && (enemy || enemyQueue.length) && steps < 80) {
    steps += 1;
    if (!mine) mine = myQueue.shift();
    if (!enemy) enemy = enemyQueue.shift();
    if (!mine || !enemy) break;

    if (!mine.entered) {
      applyEntryEffect(mine, enemy, myQueue, enemyQueue);
      mine.entered = true;
    }
    if (!enemy.entered) {
      applyEntryEffect(enemy, mine, enemyQueue, myQueue);
      enemy.entered = true;
    }

    applyLastStand(mine, enemy);
    applyLastStand(enemy, mine);

    const minePower = Math.max(1, Math.floor(mine.power));
    const enemyPower = Math.max(1, Math.floor(enemy.power));
    addLeagueLog(`${mine.name} ${minePower} vs ${enemy.name} ${enemyPower}`);

    if (minePower === enemyPower) {
      addLeagueLog("동점. 둘 다 퇴장.");
      mine = null;
      enemy = null;
      continue;
    }

    if (minePower > enemyPower) {
      mine.power = minePower - enemyPower;
      onWin(mine, enemy, myQueue, enemyQueue);
      onLose(enemy, mine, enemyQueue, myQueue);
      empowerReserveOnAllyLose(enemyQueue, enemy.side);
      enemy = null;
    } else {
      enemy.power = enemyPower - minePower;
      onWin(enemy, mine, enemyQueue, myQueue);
      onLose(mine, enemy, myQueue, enemyQueue);
      empowerReserveOnAllyLose(myQueue, mine.side);
      mine = null;
    }
  }

  const win = Boolean(mine || myQueue.length) && !(enemy || enemyQueue.length);
  addLeagueLog(win ? "내 팀 승리." : "상대 팀 승리.");
  return { win };
}

function scaleValue(fighter, base) {
  return base + Math.floor(fighter.level / 3);
}

function lowerPower(target, amount, label) {
  const before = target.power;
  target.power = Math.max(1, target.power - amount);
  if (before !== target.power) addLeagueLog(`${label}: ${target.name} -${before - target.power}.`);
}

function applyEntryEffect(fighter, opponent, ownQueue, opponentQueue) {
  switch (fighter.effect) {
    case "bat": {
      lowerPower(opponent, scaleValue(fighter, 8), fighter.name);
      if (opponentQueue[0]) lowerPower(opponentQueue[0], scaleValue(fighter, 4), fighter.name);
      break;
    }
    case "dragon": {
      lowerPower(opponent, scaleValue(fighter, 12), fighter.name);
      if (opponentQueue[0]) lowerPower(opponentQueue[0], scaleValue(fighter, 6), fighter.name);
      break;
    }
    case "ghost": {
      lowerPower(opponent, scaleValue(fighter, 10), fighter.name);
      fighter.power += scaleValue(fighter, 4);
      break;
    }
    case "mimic": {
      const copy = Math.floor(opponent.power * 0.28);
      fighter.power += copy;
      addLeagueLog(`${fighter.name}: 상대 힘 복사 +${copy}.`);
      break;
    }
    case "medusa": {
      const amount = Math.floor(opponent.power * 0.18);
      lowerPower(opponent, amount, fighter.name);
      break;
    }
    case "harpy": {
      const steal = Math.min(scaleValue(fighter, 9), Math.max(0, opponent.power - 1));
      opponent.power -= steal;
      fighter.power += steal;
      addLeagueLog(`${fighter.name}: 힘 훔치기 ${steal}.`);
      break;
    }
    case "kraken": {
      const cap = 48 + fighter.level * 3;
      if (opponent.power > cap) {
        const amount = opponent.power - cap;
        lowerPower(opponent, amount, fighter.name);
      }
      break;
    }
    default:
      break;
  }
}

function applyLastStand(fighter, opponent) {
  if (fighter.used || fighter.power >= opponent.power) return;
  if (fighter.effect === "golem") {
    const gain = Math.floor(monsterPower(fighter.id, fighter.level) * 0.45);
    fighter.power += gain;
    fighter.used = true;
    addLeagueLog(`${fighter.name}: 버티기 +${gain}.`);
  }
  if (fighter.effect === "skeleton") {
    const gain = scaleValue(fighter, 14);
    fighter.power += gain;
    fighter.used = true;
    addLeagueLog(`${fighter.name}: 뼈갑옷 +${gain}.`);
  }
}

function onWin(winner, loser, winnerQueue, loserQueue) {
  switch (winner.effect) {
    case "wolf": {
      const gain = scaleValue(winner, 7);
      winner.power += gain;
      addLeagueLog(`${winner.name}: 사냥 본능 +${gain}.`);
      break;
    }
    case "manticore": {
      if (loserQueue[0]) lowerPower(loserQueue[0], scaleValue(winner, 9), winner.name);
      break;
    }
    case "ogre": {
      const fatigue = Math.max(8, 18 - Math.floor(winner.level / 2));
      lowerPower(winner, fatigue, winner.name);
      break;
    }
    default:
      break;
  }
}

function onLose(loser, winner, loserQueue) {
  switch (loser.effect) {
    case "slime": {
      if (loserQueue[0]) {
        const gain = scaleValue(loser, 13);
        loserQueue[0].power += gain;
        addLeagueLog(`${loser.name}: ${loserQueue[0].name}에게 점액 +${gain}.`);
      }
      break;
    }
    case "phoenix": {
      if (loserQueue[0]) {
        const gain = scaleValue(loser, 12);
        loserQueue[0].power += gain;
        addLeagueLog(`${loser.name}: ${loserQueue[0].name} 점화 +${gain}.`);
      }
      break;
    }
    case "scorpion": {
      lowerPower(winner, scaleValue(loser, 11), loser.name);
      break;
    }
    default:
      break;
  }
}

function empowerReserveOnAllyLose(queue) {
  queue.forEach((fighter) => {
    if (fighter.effect === "bear") {
      const gain = scaleValue(fighter, 8);
      fighter.power += gain;
      addLeagueLog(`${fighter.name}: 분노 +${gain}.`);
    }
  });
}

$("#showDice").addEventListener("click", () => {
  state.activeGame = "dice";
  state.currentView = "home";
  renderApp();
});

$("#showLeague").addEventListener("click", () => {
  state.activeGame = "league";
  state.currentView = "home";
  renderApp();
});

$("#navHome").addEventListener("click", () => {
  state.currentView = "home";
  renderApp();
});

$("#navHeroes").addEventListener("click", () => {
  state.currentView = "heroes";
  renderApp();
});

$("#navBattle").addEventListener("click", () => {
  state.currentView = "battle";
  renderApp();
});

$$(".go-heroes").forEach((button) => {
  button.addEventListener("click", () => {
    state.currentView = "heroes";
    renderApp();
  });
});

$$(".go-battle").forEach((button) => {
  button.addEventListener("click", () => {
    state.currentView = "battle";
    renderApp();
  });
});

$("#diceLevelTab").addEventListener("click", () => {
  state.dice.detailTab = "level";
  renderDice();
});

$("#diceEquipTab").addEventListener("click", () => {
  state.dice.detailTab = "equip";
  renderDice();
});

$("#leagueLevelTab").addEventListener("click", () => {
  state.league.detailTab = "level";
  renderLeague();
});

$("#leagueEquipTab").addEventListener("click", () => {
  state.league.detailTab = "equip";
  renderLeague();
});

$("#autoEquipDice").addEventListener("click", autoEquipDice);
$("#trainDiceHero").addEventListener("click", trainDiceHero);
$("#startDiceBattle").addEventListener("click", startDiceBattle);
$("#rollDiceRound").addEventListener("click", rollDiceRound);
$("#autoTeam").addEventListener("click", autoTeam);
$("#levelSelectedMonster").addEventListener("click", () => levelMonster(selectedLeagueMonsterId()));
$("#startLeagueBattle").addEventListener("click", startLeagueBattle);
$("#nextOpponent").addEventListener("click", () => {
  state.league.opponent = [];
  generateOpponent();
  renderLeague();
});

state.dice.enemy = makeDiceEnemy();
ensureOpponent();
renderApp();
