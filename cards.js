const DATA_START_MARKER = "const baseArcherCards = [";
const DATA_END_MARKER = "selectedCharacterId = initialSelectedCharacterId();";
const CHARACTER_ORDER = ["archer", "warrior", "mage"];
const RARITY_ORDER = ["기본", "노말", "레어", "에픽", "전설"];
const RARITY_FILTERS = ["전체", ...RARITY_ORDER];
const ROUTE_ORDER = {
  archer: ["기본", "공용", "다단중첩", "함정", "차지"],
  warrior: ["기본", "공용", "광전", "돌진", "범위 공격"],
  mage: ["기본", "공용", "연쇄", "룬", "운석"],
};

const els = {
  characterList: document.querySelector("#characterList"),
  characterHero: document.querySelector("#characterHero"),
  routeSummary: document.querySelector("#routeSummary"),
  cardSections: document.querySelector("#cardSections"),
  cardSearch: document.querySelector("#cardSearch"),
  rarityFilters: document.querySelector("#rarityFilters"),
};

const state = {
  data: null,
  characterId: new URLSearchParams(window.location.search).get("character") || "archer",
  rarity: "전체",
  search: "",
};

init();

async function init() {
  renderRarityFilters();
  els.cardSearch.addEventListener("input", () => {
    state.search = els.cardSearch.value.trim();
    render();
  });

  try {
    state.data = await loadCardData();
    if (!state.data.characterDefinitions[state.characterId]) state.characterId = "archer";
    render();
  } catch (error) {
    console.error(error);
    els.cardSections.innerHTML = `<div class="load-error">카드 데이터를 불러오지 못했습니다.</div>`;
  }
}

async function loadCardData() {
  const response = await fetch(`app.js?v=${Date.now()}`);
  if (!response.ok) throw new Error(`app.js ${response.status}`);
  const source = await response.text();
  const start = source.indexOf(DATA_START_MARKER);
  const end = source.indexOf(DATA_END_MARKER);
  if (start < 0 || end < 0 || end <= start) throw new Error("card data markers not found");
  const segment = source.slice(start, end);
  const evaluate = new Function(
    "card",
    `${segment}
    return {
      characterDefinitions,
      archerRewardUnlockRules,
    };`,
  );
  return evaluate(card);
}

function card(id, name, route, rarity, priority, actions, copies = 1) {
  return { id, name, route, rarity, type: "기본", priority, actions, copies };
}

function render() {
  renderCharacters();
  renderHero();
  renderRouteSummary();
  renderCardSections();
}

function renderCharacters() {
  const characters = state.data.characterDefinitions;
  els.characterList.innerHTML = CHARACTER_ORDER.map((id) => {
    const character = characters[id];
    if (!character) return "";
    const totalCards = character.baseCards.length + character.rewardPool.length;
    return `
      <button class="character-button ${id === state.characterId ? "active" : ""}" type="button" data-character-id="${id}">
        <span class="portrait"><img src="${character.image}" alt="" /></span>
        <span>
          <strong>${escapeHtml(character.name)}</strong>
          <span>기본 ${sumCopies(character.baseCards)}장 · 풀 ${totalCards}종</span>
        </span>
      </button>
    `;
  }).join("");

  els.characterList.querySelectorAll("[data-character-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.characterId = button.dataset.characterId;
      const url = new URL(window.location.href);
      url.searchParams.set("character", state.characterId);
      window.history.replaceState({}, "", url);
      render();
    });
  });
}

function renderHero() {
  const character = currentCharacter();
  els.characterHero.innerHTML = `
    <div class="hero-portrait"><img src="${character.image}" alt="" /></div>
    <div class="hero-copy">
      <h2>${escapeHtml(character.name)}</h2>
      <p>${escapeHtml(routeNames(character).filter((route) => route !== "기본").join(" · "))}</p>
      <div class="stat-grid">
        ${statTile("체력", character.maxHp)}
        ${statTile("공격", character.baseAtk)}
        ${statTile("사거리", character.baseRange)}
        ${statTile("이동", character.baseMove)}
      </div>
    </div>
  `;
}

function renderRouteSummary() {
  const character = currentCharacter();
  const grouped = groupedCards(character);
  els.routeSummary.innerHTML = routeNames(character).map((route) => {
    const cards = grouped.get(route) || [];
    const copyCount = route === "기본" ? sumCopies(cards) : cards.length;
    return `
      <article class="route-chip">
        <span>${escapeHtml(route)}</span>
        <strong>${copyCount}</strong>
      </article>
    `;
  }).join("");
}

function renderCardSections() {
  const character = currentCharacter();
  const grouped = groupedCards(character);
  const sections = routeNames(character)
    .map((route) => {
      const cards = filterCards(grouped.get(route) || []);
      if (!cards.length) return "";
      const countLabel = route === "기본" ? `${sumCopies(cards)}장` : `${cards.length}종`;
      return `
        <section class="route-section">
          <div class="section-header">
            <h2>${escapeHtml(route)}</h2>
            <span>${countLabel}</span>
          </div>
          <div class="card-grid">
            ${cards.map(renderCard).join("")}
          </div>
        </section>
      `;
    })
    .filter(Boolean)
    .join("");

  els.cardSections.innerHTML = sections || `<div class="empty-state">조건에 맞는 카드가 없습니다.</div>`;
}

function renderRarityFilters() {
  els.rarityFilters.innerHTML = RARITY_FILTERS.map((rarity) => `
    <button class="${rarity === state.rarity ? "active" : ""}" type="button" data-rarity="${rarity}">${rarity}</button>
  `).join("");

  els.rarityFilters.querySelectorAll("[data-rarity]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rarity = button.dataset.rarity;
      renderRarityFilters();
      renderCardSections();
    });
  });
}

function renderCard(cardData) {
  const rarityClass = raritySlug(cardData.rarity);
  const typeLabel = cardTypeLabel(cardData);
  const copyLabel = cardData.copies > 1 ? `<span class="copy-badge">x${cardData.copies}</span>` : "";
  return `
    <article class="manager-card ${rarityClass}">
      <div class="card-topline">
        <span class="rarity-badge">${escapeHtml(cardData.rarity)}</span>
        <span>
          ${copyLabel}
          <span class="priority-badge">PRI ${cardData.priority}</span>
        </span>
      </div>
      <h3>${escapeHtml(cardData.name)}</h3>
      <div class="action-list">
        ${cardData.actions.map((action) => `<div class="action-line">${escapeHtml(describeAction(action))}</div>`).join("")}
      </div>
      <div class="card-footer">
        <span class="meta-pill">${escapeHtml(cardData.route)}</span>
        <span class="meta-pill">${typeLabel}</span>
      </div>
    </article>
  `;
}

function currentCharacter() {
  return state.data.characterDefinitions[state.characterId];
}

function groupedCards(character) {
  const grouped = new Map();
  [...character.baseCards, ...character.rewardPool].forEach((cardData) => {
    if (!grouped.has(cardData.route)) grouped.set(cardData.route, []);
    grouped.get(cardData.route).push(cardData);
  });

  grouped.forEach((cards) => {
    cards.sort((a, b) => (
      RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
      || a.priority - b.priority
      || a.name.localeCompare(b.name, "ko")
    ));
  });

  return grouped;
}

function routeNames(character) {
  const preferred = ROUTE_ORDER[character.id] || [];
  const actual = new Set([...character.baseCards, ...character.rewardPool].map((cardData) => cardData.route));
  const ordered = preferred.filter((route) => actual.has(route));
  [...actual].sort((a, b) => a.localeCompare(b, "ko")).forEach((route) => {
    if (!ordered.includes(route)) ordered.push(route);
  });
  return ordered;
}

function filterCards(cards) {
  const query = state.search.toLocaleLowerCase("ko");
  return cards.filter((cardData) => {
    if (state.rarity !== "전체" && cardData.rarity !== state.rarity) return false;
    if (!query) return true;
    const haystack = [
      cardData.name,
      cardData.route,
      cardData.rarity,
      cardData.priority,
      ...cardData.actions.map(describeAction),
    ].join(" ").toLocaleLowerCase("ko");
    return haystack.includes(query);
  });
}

function statTile(label, value) {
  return `<div class="stat-tile"><span>${label}</span><strong>${value}</strong></div>`;
}

function sumCopies(cards) {
  return cards.reduce((sum, cardData) => sum + (cardData.copies || 1), 0);
}

function cardTypeLabel(cardData) {
  if (cardData.actions.some((action) => action.type === "passive")) return "영구";
  if (cardData.actions.some((action) => action.type === "applyEffect")) return "지속";
  return "기본";
}

function raritySlug(rarity) {
  return {
    "기본": "basic",
    "노말": "normal",
    "레어": "rare",
    "에픽": "epic",
    "전설": "legendary",
  }[rarity] || "normal";
}

function describeAction(action) {
  if (action.type === "move") return `${action.jump ? "점프 " : ""}이동 ${action.amount}`;
  if (action.type === "flee") return `후퇴 ${action.amount}`;
  if (action.type === "fleeToRune") return `룬 쪽으로 후퇴 ${action.amount}`;
  if (action.type === "attack") return describeAttack(action);
  if (action.type === "patternAttack") return `${patternLabel(action.pattern)} ${action.melee ? "근거리" : "원거리"} 공격 ${action.mult}${action.range ? `, 사거리 ${action.range}` : ""}${action.perTargetBonus ? `, 타겟당 +${action.perTargetBonus}` : ""}`;
  if (action.type === "momentumAttack") return `이동 ${action.amount} 후 남은 이동력만큼 근거리 공격 ${action.mult} 강화`;
  if (action.type === "charge") return `차지 ${action.amount}`;
  if (action.type === "placeTrap") return `${trapLabel(action)} ${action.count || 1}개 설치, 사거리 ${action.range}`;
  if (action.type === "placeObstacle") return `장애물 ${action.count || 1}개 설치, 사거리 ${action.range}`;
  if (action.type === "placeTrapBehindTarget") return `${trapLabel(action)} 후방 설치, 사거리 ${action.range}`;
  if (action.type === "pushTowardTrap") return `함정 쪽으로 ${action.amount || 1}칸 유도`;
  if (action.type === "detonateTrap") return `함정 폭파 공격 ${action.mult}, 반경 ${action.radius || 1}`;
  if (action.type === "placeRune") return `룬 ${action.count || 1}개 설치, 사거리 ${action.range}, 위력 ${action.power || 1}`;
  if (action.type === "runeAttack") return `룬 주변 공격 ${action.mult}, 반경 ${action.radius || 1}`;
  if (action.type === "detonateRune") return `룬 폭파 공격 ${action.mult}, 반경 ${action.radius || 1}`;
  if (action.type === "placeMeteor") return `운석 예고, 사거리 ${action.range}, 공격 ${action.mult}, 반경 ${action.radius || 1}, 지연 ${action.delay || 1}`;
  if (action.type === "selfDamagePercent") return `최대 체력 ${percent(action.percent)} 감소`;
  if (action.type === "healPercent") return `최대 체력 ${percent(action.percent)} 회복`;
  if (action.type === "passive") return passiveLabel(action);
  if (action.type === "applyEffect") return effectLabel(action);
  return action.type;
}

function describeAttack(action) {
  const kind = action.melee || action.range <= 1 ? "근거리" : "원거리";
  const parts = [`${kind} 공격 ${action.mult}`];
  if (action.range && kind !== "근거리") parts.push(`사거리 ${action.range}`);
  if (action.targets) parts.push(`타겟 ${action.targets}`);
  if (action.push) parts.push(`밀기 ${action.push}`);
  if (action.pull) parts.push(`당기기 ${action.pull}`);
  if (action.preferPreviousTarget) parts.push("이전 대상 우선");
  if (action.sameTargetBonus) parts.push(`같은 대상 +${percent(action.sameTargetBonus)}`);
  if (action.thirdHitBonus) parts.push(`세 번째 공격 +${percent(action.thirdHitBonus)}`);
  return parts.join(", ");
}

function trapLabel(action) {
  if (action.trapType === "block") return "봉쇄 함정";
  if (action.trapType === "spike") return "공격 함정";
  if (action.type === "placeObstacle") return "장애물";
  return "함정";
}

function patternLabel(pattern) {
  return {
    "adjacent-pair": "붙은 두 칸",
    "adjacent-triple": "붙은 세 칸",
    "front-pair": "전방 두 칸",
  }[pattern] || pattern || "패턴";
}

function passiveLabel(action) {
  const labels = {
    afterAttackMove: `공격 카드 사용 후 이동 ${action.amount || 1}`,
    ignoreAdjacentPenalty: "인접 패널티 제거",
    comboDamage: `반복 공격 피해 +${percent(action.amount)}`,
    thirdHitDamage: `세 번째 공격 피해 +${percent(action.amount)}`,
    berserkLostHpDamage: `잃은 체력 비례 피해 +${percent(action.amount)}`,
    lowHpDamage: `낮은 체력 피해 +${percent(action.amount)}`,
    chargeStackMultiplier: `차지 스택 ${action.amount}배`,
  };
  return labels[action.effect] || modifierLabel(action.modifiers) || "영구 효과";
}

function effectLabel(action) {
  const base = action.label || "지속 효과";
  const mods = modifierLabel(action.modifiers);
  const extras = [];
  if (action.afterHitFlee) extras.push(`피격 후 후퇴 ${action.afterHitFlee}`);
  return [base, mods, ...extras].filter(Boolean).join(", ");
}

function modifierLabel(modifiers = []) {
  if (!modifiers.length) return "";
  return modifiers.map((modifier) => {
    const stat = {
      range: "사거리",
      damageTaken: "받는 피해",
      damageDealt: "주는 피해",
      ignoreAdjacentPenalty: "인접 패널티 무시",
    }[modifier.stat] || modifier.stat;
    const value = Math.abs(modifier.amount) < 1 ? percent(modifier.amount) : modifier.amount;
    return `${stat} ${modifier.amount > 0 ? "+" : ""}${value}`;
  }).join(", ");
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
