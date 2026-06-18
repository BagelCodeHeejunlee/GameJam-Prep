const DATA_START_MARKER = "const baseArcherCards = [";
const DATA_END_MARKER = "selectedCharacterId = initialSelectedCharacterId();";
const CHARACTER_ORDER = ["archer", "warrior", "mage"];
const RARITY_ORDER = ["기본", "노말", "레어", "에픽", "전설"];
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
};

const state = {
  data: null,
  characterId: new URLSearchParams(window.location.search).get("character") || "archer",
};

init();

async function init() {
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
    return `
      <button class="character-button ${id === state.characterId ? "active" : ""}" type="button" data-character-id="${id}">
        <span class="portrait"><img src="${character.image}" alt="" /></span>
        <span>
          <strong>${escapeHtml(character.name)}</strong>
          <span>기본 ${sumCopies(character.baseCards)}장 · 트리 ${character.rewardPool.length}종</span>
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
    return `
      <article class="route-chip">
        <span>${escapeHtml(route)}</span>
        <strong>${cards.length}</strong>
      </article>
    `;
  }).join("");
}

function renderCardSections() {
  const character = currentCharacter();
  const grouped = groupedCards(character);
  const sections = routeNames(character)
    .map((route) => {
      const cards = grouped.get(route) || [];
      if (!cards.length) return "";
      const countLabel = route === "기본" ? `${cards.length}장` : `${cards.length}종`;
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

function renderCard(cardData) {
  return `
    <article class="manager-card">
      ${cardMount(cardData)}
    </article>
  `;
}

function currentCharacter() {
  return state.data.characterDefinitions[state.characterId];
}

function groupedCards(character) {
  const grouped = new Map();
  [...expandedBaseCards(character.baseCards), ...character.rewardPool].forEach((cardData) => {
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
  const actual = new Set([...expandedBaseCards(character.baseCards), ...character.rewardPool].map((cardData) => cardData.route));
  const ordered = preferred.filter((route) => actual.has(route));
  [...actual].sort((a, b) => a.localeCompare(b, "ko")).forEach((route) => {
    if (!ordered.includes(route)) ordered.push(route);
  });
  return ordered;
}

function expandedBaseCards(cards) {
  return cards.flatMap((cardData) => {
    const copies = Math.max(1, cardData.copies || 1);
    return Array.from({ length: copies }, (_, index) => ({
      ...cardData,
      id: index ? `${cardData.id}-${index + 1}` : cardData.id,
      copies: 1,
    }));
  });
}

function statTile(label, value) {
  return `<div class="stat-tile"><span>${label}</span><strong>${value}</strong></div>`;
}

function sumCopies(cards) {
  return cards.reduce((sum, cardData) => sum + (cardData.copies || 1), 0);
}

function cardMount(cardData) {
  return `<div class="card-mount">${cardPrefab(cardData)}</div>`;
}

function cardPrefab(cardData) {
  const typeLabel = isPassiveCard(cardData) ? "패시브" : isTurnSustainCard(cardData) ? "턴 지속" : "";
  const footerLabel = typeLabel ? `<div class="cp-type-label">${typeLabel}</div>` : "";
  return `
    <div class="card-prefab ${rarityClass(cardData.rarity)}">
      <div class="cp-bg"></div>
      <div class="cp-banner"></div>
      <div class="cp-priority">${cardData.priority}</div>
      <div class="cp-name">${escapeHtml(cardData.name)}</div>
      <div class="cp-actions">${renderActionList(cardData)}</div>
      ${footerLabel}
    </div>
  `;
}

function rarityClass(rarity) {
  return {
    "기본": "rarity-normal",
    "노말": "rarity-normal",
    "레어": "rarity-rare",
    "에픽": "rarity-epic",
    "전설": "rarity-legendary",
  }[rarity] ?? "rarity-normal";
}

function renderActionList(cardData) {
  return `<span class="action-list">${cardData.actions.map(renderActionLine).join("")}</span>`;
}

function isPassiveCard(cardData) {
  return cardData.actions.some((action) => action.type === "passive");
}

function isTurnSustainCard(cardData) {
  return cardData.actions.some((action) => action.type === "applyEffect");
}

function isPassiveAction(action) {
  return action.type === "passive";
}

function renderActionLine(action) {
  if (action.type === "move") {
    return `<span class="action-line">${actionGroup("move", [actionStat("move", "이동", action.amount)])}</span>`;
  }
  if (action.type === "flee") {
    return `<span class="action-line">${actionGroup("move", [actionStat("move-flee", "후퇴", action.amount)])}</span>`;
  }
  if (action.type === "fleeToRune") {
    return `<span class="action-line">${actionGroup("move", [
      actionStat("move-flee", "룬 쪽 후퇴", action.amount),
      actionStat("rune", "룬", 1),
    ])}</span>`;
  }
  if (action.type === "attack") {
    const attackKind = action.melee || action.range <= 1 ? "melee" : "ranged";
    const parts = [actionStat(attackKind, attackKind === "melee" ? "근거리 공격" : "원거리 공격", action.mult)];
    if (attackKind !== "melee") parts.push(actionStat("range", "사거리", action.range));
    if (action.targets) parts.push(actionStat("target", "타겟 수", action.targets));
    if (action.push) parts.push(actionNote(`밀기 ${action.push}`));
    if (action.pull) parts.push(actionNote(`당기기 ${action.pull}`));
    return `<span class="action-line">${actionGroup("attack", parts)}</span>`;
  }
  if (action.type === "momentumAttack") {
    return `<span class="action-line">${actionGroup("attack", [
      actionStat("move", "이동", action.amount),
      actionStat("melee", "근거리 공격", action.mult),
      actionNote(`남은 이동 공격 x${action.perUnusedMoveBonus ?? 1}`),
    ])}</span>`;
  }
  if (action.type === "patternAttack") {
    const attackKind = action.melee ? "melee" : "ranged";
    return `<span class="action-line">${actionGroup("attack", [
      patternIcon(action.pattern),
      actionStat(attackKind, attackKind === "melee" ? "근거리 공격" : "원거리 공격", action.mult),
      ...(attackKind === "melee" ? [] : [actionStat("range", "사거리", action.range)]),
    ])}</span>`;
  }
  if (action.type === "charge") {
    return `<span class="action-line">${actionGroup("special", [actionStat("charge", "차지", action.amount)])}</span>`;
  }
  if (isPassiveAction(action)) {
    return `<span class="action-line">${actionGroup("special", [
      actionNote(passiveLabel(action), passiveLabel(action)),
    ])}</span>`;
  }
  if (action.type === "placeTrap" || action.type === "placeObstacle") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat(trapIconKind(action), trapLabel(action), action.count ?? 1),
      actionStat("range", "사거리", action.range),
    ])}</span>`;
  }
  if (action.type === "placeTrapBehindTarget") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat(trapIconKind(action), `${trapLabel(action)} 후방 설치`, action.count ?? 1),
      actionStat("range", "사거리", action.range),
    ])}</span>`;
  }
  if (action.type === "pushTowardTrap") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat("trap-burst", "함정 유도", action.amount ?? 1),
      actionStat("range", "사거리", action.range),
    ])}</span>`;
  }
  if (action.type === "detonateTrap") {
    return `<span class="action-line">${actionGroup("attack", [
      actionStat("trap-burst", "함정 폭파", action.radius ?? 1),
      actionStat("ranged", "원거리 공격", action.mult),
    ])}</span>`;
  }
  if (action.type === "placeRune") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat("rune", "룬", action.count ?? 1),
      actionStat("range", "사거리", action.range),
    ])}</span>`;
  }
  if (action.type === "runeAttack") {
    return `<span class="action-line">${actionGroup("attack", [
      actionStat("rune", "룬 주변", action.radius ?? 1),
      actionStat("ranged", "원거리 공격", action.mult),
    ])}</span>`;
  }
  if (action.type === "detonateRune") {
    return `<span class="action-line">${actionGroup("attack", [
      actionStat("rune-burst", "룬 폭파", action.radius ?? 1),
      actionStat("ranged", "원거리 공격", action.mult),
    ])}</span>`;
  }
  if (action.type === "placeMeteor") {
    return `<span class="action-line">${actionGroup("attack", [
      actionStat("meteor", "운석 예고", action.delay ?? 1),
      actionStat("range", "사거리", action.range),
      actionStat("area", "범위", action.radius ?? 1),
      actionStat("ranged", "원거리 공격", action.mult),
    ])}</span>`;
  }
  if (action.type === "selfDamagePercent") {
    return `<span class="action-line">${actionGroup("special", [actionStat("self-damage", "체력 감소", `${Math.round(action.percent * 100)}%`)])}</span>`;
  }
  if (action.type === "healPercent") {
    return `<span class="action-line">${actionGroup("special", [actionStat("heal", "회복", `${Math.round(action.percent * 100)}%`)])}</span>`;
  }
  if (action.type === "applyEffect") {
    return `<span class="action-line">${actionGroup("special", [
      actionStat("effect", "일시 효과", 1),
      actionNote(effectLabel(action), effectLabel(action)),
    ])}</span>`;
  }
  return `<span class="action-line">${actionGroup("special", [actionNote(action.type)])}</span>`;
}

function actionGroup(kind, parts) {
  return `<span class="action-group ${kind}">${parts.join("")}</span>`;
}

function actionStat(kind, label, value) {
  return `<span class="action-stat" title="${label}"><span class="action-icon ${kind.replaceAll(" ", "-")}">${actionIcon(kind)}</span><b>${value}</b></span>`;
}

function actionNote(text, title = text) {
  return `<span class="action-note" title="${escapeHtml(title)}">${escapeHtml(text)}</span>`;
}

function actionIcon(kind) {
  const icons = {
    melee: `<svg viewBox="0 0 32 32" aria-hidden="true"><path class="fill" d="M22.8 3.2h6L14 19l-4-4L22.8 3.2Z"/><path d="m11.2 18.5-5.8 5.8"/><path d="m6.5 17.1 8.4 8.4"/><path d="m4.5 27.5 3.4-3.4"/></svg>`,
    ranged: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 4.5c8 3.2 8 19.8 0 23"/><path d="M11.2 7c4.9 4.2 4.9 13.8 0 18"/><path d="M4.5 16h22"/><path d="m21.6 10.8 5 5.2-5 5.2"/></svg>`,
    move: `<svg viewBox="0 0 32 32" aria-hidden="true"><path class="fill" d="M9.2 4.8h7.1l1.3 7.1 7.1 4.1c1.6.9 2.6 2.6 2.6 4.5v2.4H6.5v-5.2l3.6-5.3-.9-7.6Z"/><path d="M7.2 22.9h19.9"/><path d="M11.2 10h6"/></svg>`,
    "move-flee": `<svg viewBox="0 0 32 32" aria-hidden="true"><path class="fill" d="M9.2 4.8h7.1l1.3 7.1 7.1 4.1c1.6.9 2.6 2.6 2.6 4.5v2.4H6.5v-5.2l3.6-5.3-.9-7.6Z"/><path d="M7.2 22.9h19.9"/><path d="M11.2 10h6"/><path d="M24.5 7.5h-7"/><path d="m20 4 4.5 3.5L20 11"/></svg>`,
    range: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 23.5C9.1 14 16.5 8.9 26 8.5"/><path d="m22.4 4.8 3.9 3.7-4.1 3.8"/><circle cx="6" cy="23.5" r="2.2"/><circle cx="26" cy="8.5" r="4.2"/></svg>`,
    charge: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 6v20"/><path d="M6 16h20"/></svg>`,
    target: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="4.4"/></svg>`,
    "trap-attack": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 20c2-8.5 18-8.5 20 0"/><path d="M8.5 20h15"/><path d="m8.8 13.2 2.2 4.2"/><path d="m14 11.8.8 4.8"/><path d="m18 11.8-.8 4.8"/><path d="m23.2 13.2-2.2 4.2"/><circle cx="16" cy="21" r="3.3"/></svg>`,
    "trap-block": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 20c2-8.5 18-8.5 20 0"/><path d="M8.5 20h15"/><path d="M11 12v7"/><path d="M16 11v8"/><path d="M21 12v7"/><path d="M9 24h14"/></svg>`,
    "trap-burst": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 20c2-8.5 18-8.5 20 0"/><path d="M8.5 20h15"/><path d="m16 5 1.9 6.2L24 9l-3.1 5.7L27 17l-6.1 1.8L24 25l-6.1-3.1L16 28l-1.9-6.1L8 25l3.1-6.2L5 17l6.1-2.3L8 9l6.1 2.2L16 5Z"/></svg>`,
    rune: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 4 9 12-9 12L7 16 16 4Z"/><path d="M16 9v14"/><path d="M11 16h10"/></svg>`,
    "rune-burst": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 4 2.3 8.3L26 8l-4.3 7.7L30 18l-8.3 2.3L26 28l-7.7-4.3L16 32l-2.3-8.3L6 28l4.3-7.7L2 18l8.3-2.3L6 8l7.7 4.3L16 4Z"/></svg>`,
    meteor: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 5c5 2.3 8.8 5.5 11.3 9.8"/><path d="M4 12c4.4 1.5 7.8 4.2 10.2 8.1"/><circle cx="21.5" cy="22" r="5.8"/></svg>`,
    area: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="4"/><circle cx="16" cy="16" r="10"/><path d="M16 2v4"/><path d="M16 26v4"/><path d="M2 16h4"/><path d="M26 16h4"/></svg>`,
    "self-damage": `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27S6 21 6 12.7c0-4 2.6-6.7 6.1-6.7 2 0 3.3 1 3.9 2.1.6-1.1 1.9-2.1 3.9-2.1 3.5 0 6.1 2.7 6.1 6.7C26 21 16 27 16 27Z"/><path d="M10 16h12"/></svg>`,
    heal: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27S6 21 6 12.7c0-4 2.6-6.7 6.1-6.7 2 0 3.3 1 3.9 2.1.6-1.1 1.9-2.1 3.9-2.1 3.5 0 6.1 2.7 6.1 6.7C26 21 16 27 16 27Z"/><path d="M16 11v10"/><path d="M11 16h10"/></svg>`,
    permanent: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 20 12l8 1.2-5.9 5.7 1.4 8.1L16 23l-7.5 4 1.4-8.1L4 13.2 12 12 16 4Z"/></svg>`,
    effect: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 20 12l8 1.2-5.9 5.7 1.4 8.1L16 23l-7.5 4 1.4-8.1L4 13.2 12 12 16 4Z"/><path d="M16 9v7"/><path d="M16 20v1"/></svg>`,
  };
  return icons[kind] ?? "?";
}

function trapIconKind(action) {
  return (action.trap ?? action.obstacle ?? action.trapType) === "block" ? "trap-block" : "trap-attack";
}

function trapLabel(action) {
  if ((action.trap ?? action.obstacle ?? action.trapType) === "block") return "봉쇄 함정";
  if (action.type === "placeObstacle") return "장애물";
  return "공격 함정";
}

function patternLabel(pattern) {
  return {
    "adjacent-pair": "붙은 두 칸",
    "adjacent-triple": "붙은 세 칸",
    "front-pair": "전방 두 칸",
  }[pattern] || pattern || "패턴";
}

function patternIcon(pattern) {
  if (pattern === "adjacent-pair") {
    return `<span class="pattern-icon adjacent-pair" title="붙은 두 칸"><i></i><i></i></span>`;
  }
  if (pattern === "adjacent-triple") {
    return `<span class="pattern-icon adjacent-triple" title="붙은 세 칸"><i></i><i></i><i></i></span>`;
  }
  return "";
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
  return labels[action.effect] || action.label || modifierLabel(action.modifiers) || "영구 효과";
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
