const $game = document.querySelector("#game");
let mode = "tree";

const tagNames = {
  strike: "타격",
  shield: "방패",
  summon: "소환",
  poison: "독",
  spark: "주문",
  echo: "반복",
  league: "리그",
  tactic: "전술"
};

const artColors = {
  strike: "#b95045",
  shield: "#3e6f9d",
  summon: "#3d7b48",
  poison: "#7557a6",
  spark: "#bd8124",
  echo: "#147d7a",
  league: "#6f6558",
  tactic: "#7a5f2d"
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function sample(list, count) {
  const copy = [...list];
  const out = [];
  while (copy.length && out.length < count) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function tagPills(tags) {
  return `<div class="tag-row">${tags.map((tag) => `<span class="tag ${tag}">${tagNames[tag] || tag}</span>`).join("")}</div>`;
}

function cardMarkup(card, level = 1) {
  const color = artColors[card.tags[0]] || "#147d7a";
  return `
    <div class="card-name">
      <span>${card.name}</span>
      <span class="level">Lv.${level}</span>
    </div>
    <div class="card-art" style="--art-color:${color}"></div>
    <p class="muted">${card.text}</p>
    ${tagPills(card.tags)}
  `;
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  render();
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const value = target.dataset.value;
  const index = Number(target.dataset.index);

  if (action === "reset-tree") resetTree();
  if (action === "tree-battle") runTreeBattle();
  if (action === "tree-reward") chooseTreeReward(index);
  if (action === "tree-remove") removeTreeCard(index);
  if (action === "tree-node") chooseTreeNode(value);

  if (action === "reset-league") resetLeague();
  if (action === "league-pick") pickLeagueCard(index);
  if (action === "league-remove") removeLeagueCard(index);
  if (action === "league-battle") runLeagueBattle();
  if (action === "league-final") runLeagueFinal();

  if (action === "reset-tactic") resetTactic();
  if (action === "tactic-select-card") selectTacticCard(value);
  if (action === "tactic-slot") assignTacticSlot(value);
  if (action === "tactic-clear-slot") clearTacticSlot(value);
  if (action === "tactic-battle") runTacticBattle();
  if (action === "tactic-reward") chooseTacticReward(index);
});

const treeCards = [
  { id: "blade", name: "거리의 검객", tags: ["strike"], atk: 7, text: "피해 7. 타격 트리의 기본 엔진." },
  { id: "hammer", name: "망치 경비대", tags: ["strike", "shield"], atk: 5, shield: 3, text: "피해 5, 방어막 3." },
  { id: "bulwark", name: "방벽 기사", tags: ["shield"], shield: 9, text: "방어막 9." },
  { id: "mirror", name: "거울 수련생", tags: ["echo"], atk: 3, text: "피해 3. 반복 노드가 있으면 직전 카드를 복사." },
  { id: "nest", name: "새끼 둥지", tags: ["summon"], summon: 2, text: "동료 2명을 부른다. 동료는 매 턴 피해 1." },
  { id: "banner", name: "응원 깃발", tags: ["summon", "shield"], summon: 1, shield: 4, text: "동료 1명, 방어막 4." },
  { id: "venom", name: "독초 투척수", tags: ["poison"], poison: 4, text: "독 4 부여. 독은 턴 시작마다 피해." },
  { id: "plague", name: "역병 병", tags: ["poison", "spark"], poison: 2, atk: 4, text: "피해 4, 독 2." },
  { id: "sparkbolt", name: "불꽃 주문", tags: ["spark"], atk: 8, text: "피해 8. 주문 노드와 잘 맞는다." },
  { id: "relay", name: "마력 중계기", tags: ["spark", "echo"], atk: 4, shield: 2, text: "피해 4, 방어막 2." },
  { id: "captain", name: "전열 지휘관", tags: ["strike", "summon"], atk: 4, summon: 1, text: "피해 4, 동료 1명." },
  { id: "cleanse", name: "정화 사제", tags: ["shield", "spark"], shield: 6, heal: 3, text: "방어막 6, 체력 3 회복." }
];

const treeById = Object.fromEntries(treeCards.map((card) => [card.id, card]));

const treeNodes = [
  { id: "strike-2", tag: "strike", count: 2, title: "타격 2", text: "첫 타격 카드가 피해 +4." },
  { id: "strike-5", tag: "strike", count: 5, title: "타격 5", text: "세 번째 타격마다 추가 피해 6." },
  { id: "shield-2", tag: "shield", count: 2, title: "방패 2", text: "전투 시작 방어막 +5." },
  { id: "shield-5", tag: "shield", count: 5, title: "방패 5", text: "남은 방어막 4마다 피해 1로 전환." },
  { id: "summon-2", tag: "summon", count: 2, title: "소환 2", text: "처음 부르는 동료 +1." },
  { id: "summon-5", tag: "summon", count: 5, title: "소환 5", text: "동료 공격 피해 +1." },
  { id: "poison-2", tag: "poison", count: 2, title: "독 2", text: "독 피해가 매 턴 +1." },
  { id: "poison-5", tag: "poison", count: 5, title: "독 5", text: "독을 6 이상 가진 적에게 즉시 피해 5." },
  { id: "spark-2", tag: "spark", count: 2, title: "주문 2", text: "주문 카드 피해 +2." },
  { id: "spark-5", tag: "spark", count: 5, title: "주문 5", text: "전투 시작 시 적에게 피해 6." },
  { id: "echo-2", tag: "echo", count: 2, title: "반복 2", text: "네 번째 카드가 한 번 더 발동." },
  { id: "echo-5", tag: "echo", count: 5, title: "반복 5", text: "반복 카드가 직전 카드 피해의 절반을 더한다." }
];

let tree;

function makeTreeCard(id, level = 1) {
  return { uid: uid("tree"), id, level };
}

function resetTree() {
  tree = {
    round: 1,
    maxRound: 8,
    morale: 24,
    phase: "battle",
    deck: [
      makeTreeCard("blade"),
      makeTreeCard("bulwark"),
      makeTreeCard("venom"),
      makeTreeCard("nest"),
      makeTreeCard("sparkbolt"),
      makeTreeCard("hammer")
    ],
    nodes: [],
    enemy: makeTreeEnemy(1),
    rewards: [],
    last: null,
    log: ["런 시작. 첫 상대가 등장했다."]
  };
  render();
}

function makeTreeEnemy(round) {
  const names = ["훈련 로봇", "골목 싸움꾼", "늪지 감시자", "철갑 멧돼지", "마녀의 파수꾼", "깃발 기사", "심연의 계약자", "결승 수호자"];
  return {
    name: names[round - 1] || "도전자",
    hp: 24 + round * 7,
    atk: 4 + Math.floor(round * 1.6),
    armor: round > 4 ? 3 : 0
  };
}

function treeTagCounts() {
  const counts = {};
  tree.deck.forEach((inst) => {
    treeById[inst.id].tags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + inst.level;
    });
  });
  return counts;
}

function availableTreeNodes() {
  const counts = treeTagCounts();
  return treeNodes.filter((node) => counts[node.tag] >= node.count && !tree.nodes.includes(node.id));
}

function runTreeBattle() {
  const result = simulateTreeBattle();
  tree.last = result;
  tree.log = result.log;
  if (result.win) {
    if (tree.round >= tree.maxRound) {
      tree.phase = "ended";
      tree.log.unshift("최종 상대를 쓰러뜨렸다. 트리 드래프트 클리어.");
    } else {
      tree.phase = "reward";
      tree.rewards = makeTreeRewards();
    }
  } else {
    tree.morale -= 5 + Math.floor(tree.round / 2);
    if (tree.morale <= 0) {
      tree.phase = "ended";
      tree.log.unshift("사기가 바닥났다. 런 종료.");
    } else {
      tree.phase = "reward";
      tree.rewards = makeTreeRewards();
    }
  }
  render();
}

function simulateTreeBattle() {
  const enemy = { ...tree.enemy };
  const player = {
    hp: 31,
    shield: tree.nodes.includes("shield-2") ? 5 : 0,
    allies: 0,
    poison: 0,
    attackCount: 0,
    cardCount: 0,
    lastDamage: 0
  };
  if (tree.nodes.includes("spark-5")) enemy.hp -= 6;
  const deck = shuffle(tree.deck);
  const log = [`${tree.enemy.name} 체력 ${tree.enemy.hp}, 공격 ${tree.enemy.atk}.`];
  if (tree.nodes.includes("spark-5")) log.push("주문 5: 시작 피해 6.");

  for (let turn = 1; turn <= 8; turn += 1) {
    if (player.poison > 0) {
      const poisonDamage = player.poison + (tree.nodes.includes("poison-2") ? 1 : 0);
      enemy.hp -= poisonDamage;
      log.push(`턴 ${turn}: 독 피해 ${poisonDamage}. 적 체력 ${Math.max(0, enemy.hp)}.`);
    }
    if (enemy.hp <= 0) return { win: true, playerHp: player.hp, enemyHp: 0, log };

    const inst = deck[(turn - 1) % deck.length];
    const card = treeById[inst.id];
    resolveTreeCard(card, inst.level, player, enemy, log);
    if (player.allies > 0) {
      const allyDamage = player.allies * (tree.nodes.includes("summon-5") ? 2 : 1);
      enemy.hp -= allyDamage;
      log.push(`동료 ${player.allies}명이 피해 ${allyDamage}.`);
    }
    if (tree.nodes.includes("shield-5") && player.shield >= 4) {
      const converted = Math.floor(player.shield / 4);
      enemy.hp -= converted;
      log.push(`방패 5: 방어막을 피해 ${converted}로 전환.`);
    }
    if (enemy.hp <= 0) return { win: true, playerHp: player.hp, enemyHp: 0, log };

    let incoming = enemy.atk + Math.floor(Math.random() * 3);
    const blocked = Math.min(player.shield, incoming);
    player.shield -= blocked;
    incoming -= blocked;
    player.hp -= incoming;
    log.push(`적 반격 ${incoming}${blocked ? `, 방어 ${blocked}` : ""}. 내 체력 ${Math.max(0, player.hp)}.`);
    if (player.hp <= 0) return { win: false, playerHp: 0, enemyHp: enemy.hp, log };
  }
  return { win: enemy.hp <= player.hp, playerHp: player.hp, enemyHp: enemy.hp, log };
}

function resolveTreeCard(card, level, player, enemy, log) {
  player.cardCount += 1;
  const levelBonus = level - 1;
  let damage = (card.atk || 0) + levelBonus * 2;
  if (card.tags.includes("spark") && tree.nodes.includes("spark-2")) damage += 2;
  if (card.tags.includes("strike")) {
    player.attackCount += 1;
    if (player.attackCount === 1 && tree.nodes.includes("strike-2")) damage += 4;
    if (player.attackCount % 3 === 0 && tree.nodes.includes("strike-5")) damage += 6;
  }
  if (card.id === "mirror" && tree.nodes.includes("echo-5")) {
    damage += Math.floor(player.lastDamage / 2);
  }
  if (damage > 0) {
    const finalDamage = Math.max(0, damage - enemy.armor);
    enemy.hp -= finalDamage;
    player.lastDamage = finalDamage;
    log.push(`${card.name} Lv.${level}: 피해 ${finalDamage}. 적 체력 ${Math.max(0, enemy.hp)}.`);
  }
  if (card.shield) {
    const shield = card.shield + levelBonus * 2;
    player.shield += shield;
    log.push(`${card.name}: 방어막 +${shield}.`);
  }
  if (card.heal) {
    const heal = card.heal + levelBonus;
    player.hp = Math.min(36, player.hp + heal);
    log.push(`${card.name}: 체력 +${heal}.`);
  }
  if (card.poison) {
    const poison = card.poison + levelBonus;
    player.poison += poison;
    log.push(`${card.name}: 독 +${poison}.`);
    if (tree.nodes.includes("poison-5") && player.poison >= 6) {
      enemy.hp -= 5;
      log.push("독 5: 즉시 피해 5.");
    }
  }
  if (card.summon) {
    let summon = card.summon + (tree.nodes.includes("summon-2") && player.allies === 0 ? 1 : 0);
    player.allies += summon;
    log.push(`${card.name}: 동료 +${summon}.`);
  }
  if (tree.nodes.includes("echo-2") && player.cardCount % 4 === 0) {
    const echoDamage = Math.max(2, Math.floor((damage || 4) / 2));
    enemy.hp -= echoDamage;
    log.push(`반복 2: 추가 피해 ${echoDamage}.`);
  }
}

function makeTreeRewards() {
  const tierPool = treeCards.filter((card) => tree.round < 4 || card.tags.length > 1 || card.id !== "blade");
  const cards = sample(tierPool, 3).map((card) => ({ type: "add", id: card.id, title: `${card.name} 추가`, text: card.text }));
  const upgradeTarget = pick(tree.deck);
  cards.push({ type: "upgrade", uid: upgradeTarget.uid, title: `${treeById[upgradeTarget.id].name} 강화`, text: "해당 카드 레벨 +1." });
  if (tree.deck.length > 7) cards.push({ type: "remove", title: "덱 압축", text: "카드 1장을 제거한다." });
  return cards;
}

function chooseTreeReward(index) {
  const reward = tree.rewards[index];
  if (!reward) return;
  if (reward.type === "add") {
    tree.deck.push(makeTreeCard(reward.id));
    tree.log = [`${treeById[reward.id].name}을 덱에 추가했다.`];
    advanceTreeAfterChoice();
  }
  if (reward.type === "upgrade") {
    const target = tree.deck.find((card) => card.uid === reward.uid);
    if (target) target.level += 1;
    tree.log = [`${treeById[target.id].name}이 Lv.${target.level}이 되었다.`];
    advanceTreeAfterChoice();
  }
  if (reward.type === "remove") {
    tree.phase = "remove";
    tree.log = ["제거할 카드를 고른다."];
    render();
  }
}

function removeTreeCard(index) {
  if (tree.deck.length <= 3) return;
  const [removed] = tree.deck.splice(index, 1);
  tree.log = [`${treeById[removed.id].name}을 제거했다.`];
  advanceTreeAfterChoice();
}

function advanceTreeAfterChoice() {
  const nodes = availableTreeNodes();
  if (nodes.length) {
    tree.phase = "tree";
  } else {
    if (!tree.last || tree.last.win) tree.round += 1;
    tree.enemy = makeTreeEnemy(tree.round);
    tree.phase = "battle";
  }
  render();
}

function chooseTreeNode(id) {
  tree.nodes.push(id);
  const node = treeNodes.find((item) => item.id === id);
  tree.log = [`${node.title} 노드를 열었다.`];
  if (!tree.last || tree.last.win) tree.round += 1;
  tree.enemy = makeTreeEnemy(tree.round);
  tree.phase = "battle";
  render();
}

function renderTree() {
  const counts = treeTagCounts();
  const nodes = availableTreeNodes();
  const result = tree.last ? `<div class="result-banner"><b>${tree.last.win ? "승리" : "패배"}</b><span>내 체력 ${Math.max(0, tree.last.playerHp)} · 적 체력 ${Math.max(0, tree.last.enemyHp)}</span></div>` : "";
  const controls = {
    battle: `<button class="primary" type="button" data-action="tree-battle">전투 시작</button>`,
    reward: "",
    remove: "",
    tree: "",
    ended: `<button class="primary" type="button" data-action="reset-tree">새 런</button>`
  };

  if (tree.phase === "reward") {
    controls.reward = `<div class="choices">${tree.rewards.map((reward, i) => `
      <button class="choice" type="button" data-action="tree-reward" data-index="${i}">
        <div class="card-name"><span>${reward.title}</span></div>
        <p class="muted">${reward.text}</p>
      </button>
    `).join("")}</div>`;
  }

  if (tree.phase === "remove") {
    controls.remove = `<div class="cards">${tree.deck.map((inst, i) => {
      const card = treeById[inst.id];
      return `<button class="card-button" type="button" data-action="tree-remove" data-index="${i}">${cardMarkup(card, inst.level)}</button>`;
    }).join("")}</div>`;
  }

  if (tree.phase === "tree") {
    controls.tree = `<div class="choices">${nodes.map((node) => `
      <button class="choice" type="button" data-action="tree-node" data-value="${node.id}">
        <div class="card-name"><span>${node.title}</span></div>
        <p class="muted">${node.text}</p>
      </button>
    `).join("")}</div>`;
  }

  $game.innerHTML = `
    <div class="game-grid">
      <aside class="side">
        <div class="section-title">
          <h2>트리 드래프트</h2>
          <button class="mini" type="button" data-action="reset-tree">리셋</button>
        </div>
        <div class="stat-grid">
          <div class="stat"><span>라운드</span><b>${tree.round}/${tree.maxRound}</b></div>
          <div class="stat"><span>사기</span><b>${Math.max(0, tree.morale)}</b></div>
        </div>
        <h3>시너지</h3>
        <div class="tree-row">
          ${Object.keys(tagNames).filter((tag) => counts[tag]).map((tag) => `
            <div class="tree-node">
              <b>${tagNames[tag]}</b>
              <div class="meter"><span style="--value:${clamp((counts[tag] / 6) * 100, 8, 100)}%"></span></div>
              <span class="muted">${counts[tag]} 포인트</span>
            </div>
          `).join("")}
        </div>
        <h3 style="margin-top:16px">열린 노드</h3>
        <div class="tree-row">
          ${tree.nodes.length ? tree.nodes.map((id) => {
            const node = treeNodes.find((item) => item.id === id);
            return `<div class="tree-node active"><b>${node.title}</b><p class="muted">${node.text}</p></div>`;
          }).join("") : `<p class="muted">아직 없음</p>`}
        </div>
      </aside>
      <section class="stage">
        ${result}
        <div class="battlefield">
          <div class="fighter">
            <h3>내 덱</h3>
            <p class="muted">${tree.deck.length}장 · 평균 Lv.${(tree.deck.reduce((sum, card) => sum + card.level, 0) / tree.deck.length).toFixed(1)}</p>
          </div>
          <div class="fighter enemy">
            <h3>${tree.enemy.name}</h3>
            <p class="muted">체력 ${tree.enemy.hp} · 공격 ${tree.enemy.atk} · 방어 ${tree.enemy.armor}</p>
          </div>
        </div>
        <div class="actions">${controls[tree.phase] || ""}</div>
        ${controls.reward}${controls.remove}${controls.tree}
        <h3 style="margin-top:18px">덱</h3>
        <div class="cards">${tree.deck.map((inst) => cardMarkup(treeById[inst.id], inst.level)).map((html) => `<div class="card">${html}</div>`).join("")}</div>
        <h3 style="margin-top:18px">전투 로그</h3>
        <div class="log">${tree.log.map((line) => `<p>${line}</p>`).join("")}</div>
      </section>
    </div>
  `;
}

const leagueCards = [
  { id: "rookie", name: "신입 도전자", tier: 1, strength: 3, tags: ["league"], text: "힘 3." },
  { id: "runner", name: "깃발 러너", tier: 1, strength: 2, tags: ["league", "strike"], text: "공격 중이면 힘 +3." },
  { id: "keeper", name: "공원 수비수", tier: 1, strength: 4, tags: ["league", "shield"], text: "깃발 보유 중이면 힘 +2." },
  { id: "fanclub", name: "팬클럽", tier: 1, strength: 1, tags: ["league", "summon"], text: "벤치가 2칸 이상 차면 힘 +5." },
  { id: "scout", name: "정찰병", tier: 1, strength: 2, tags: ["league", "echo"], text: "이번 스택의 첫 카드면 힘 +2." },
  { id: "giant", name: "풍선 거인", tier: 2, strength: 7, tags: ["league"], text: "힘 7. 무겁지만 확실하다." },
  { id: "double", name: "쌍둥이 선수", tier: 2, strength: 3, tags: ["league", "summon"], text: "스택에 카드가 2장 이상이면 힘 +3." },
  { id: "coach", name: "전술 코치", tier: 2, strength: 2, tags: ["league", "spark"], text: "다음 공개 카드 힘 +2." },
  { id: "mascot", name: "마스코트", tier: 2, strength: 0, tags: ["league", "echo"], text: "현재 스택 총합을 +4." },
  { id: "wall", name: "철문 골키퍼", tier: 2, strength: 5, tags: ["league", "shield"], text: "벤치 한도 +1." },
  { id: "ace", name: "결승 에이스", tier: 3, strength: 8, tags: ["league", "strike"], text: "공격 중이면 힘 +4." },
  { id: "captain2", name: "팀 캡틴", tier: 3, strength: 5, tags: ["league", "summon"], text: "벤치가 비어 있으면 힘 +5." },
  { id: "comeback", name: "역전 전문가", tier: 3, strength: 4, tags: ["league", "echo"], text: "상대 깃발 힘이 높을수록 강해진다." },
  { id: "legend", name: "동네 전설", tier: 3, strength: 10, tags: ["league"], text: "힘 10." }
];

const leagueById = Object.fromEntries(leagueCards.map((card) => [card.id, card]));
let league;

function makeLeagueCard(id) {
  return { uid: uid("league"), id };
}

function resetLeague() {
  league = {
    round: 1,
    phase: "draft",
    fans: 0,
    trimLeft: 2,
    selected: [],
    pack: makeLeaguePack(1),
    deck: ["rookie", "rookie", "runner", "keeper", "fanclub", "scout"].map(makeLeagueCard),
    opponents: ["서부", "북문", "상점가", "해변", "철교", "옥상", "중앙"].map((name, i) => ({
      name: `${name} 팀`,
      fans: i % 2,
      power: 6 + i
    })),
    currentOpponent: null,
    log: ["첫 드래프트가 열렸다."],
    last: null
  };
  league.currentOpponent = makeLeagueOpponent();
  render();
}

function makeLeaguePack(round) {
  const maxTier = round >= 6 ? 3 : round >= 3 ? 2 : 1;
  return sample(leagueCards.filter((card) => card.tier <= maxTier), 5);
}

function makeLeagueOpponent() {
  const base = pick(league.opponents);
  const round = league.round;
  const pool = leagueCards.filter((card) => card.tier <= (round >= 6 ? 3 : round >= 3 ? 2 : 1));
  return {
    name: `${base.name} R${round}`,
    deck: sample(pool, 7 + Math.floor(round / 3)).map((card) => makeLeagueCard(card.id)),
    fans: base.fans,
    power: base.power + round
  };
}

function pickLeagueCard(index) {
  if (league.phase !== "draft") return;
  if (league.selected.includes(index)) return;
  league.selected.push(index);
  if (league.selected.length >= 2) {
    league.selected.forEach((packIndex) => league.deck.push(makeLeagueCard(league.pack[packIndex].id)));
    league.phase = "trim";
    league.trimLeft = 2;
    league.log = ["선택한 2장이 덱에 들어왔다."];
  }
  render();
}

function removeLeagueCard(index) {
  if (league.phase !== "trim" || league.trimLeft <= 0 || league.deck.length <= 5) return;
  const [removed] = league.deck.splice(index, 1);
  league.trimLeft -= 1;
  league.log = [`${leagueById[removed.id].name}을 벤치 밖으로 보냈다.`];
  render();
}

function runLeagueBattle() {
  const result = simulateLeagueBattle(league.deck, league.currentOpponent.deck);
  league.last = result;
  if (result.win) {
    const gain = 2 + league.round + Math.floor(Math.random() * 2);
    league.fans += gain;
    league.log = [`승리. 팬 +${gain}.`, ...result.log];
  } else {
    const gain = 1 + Math.floor(league.round / 2);
    league.fans += gain;
    league.log = [`패배. 위로 팬 +${gain}.`, ...result.log];
  }
  league.opponents.forEach((team) => {
    team.fans += Math.floor(Math.random() * 3) + (team.power > 11 ? 1 : 0);
  });
  if (league.round >= 7) {
    const sorted = leagueStandings();
    league.phase = sorted.findIndex((team) => team.me) <= 1 ? "final" : "ended";
    if (league.phase === "ended") league.log.unshift("상위 2팀 진입 실패. 리그 종료.");
  } else {
    league.round += 1;
    league.pack = makeLeaguePack(league.round);
    league.selected = [];
    league.currentOpponent = makeLeagueOpponent();
    league.phase = "draft";
  }
  render();
}

function leagueStandings() {
  return [{ name: "내 팀", fans: league.fans, me: true }, ...league.opponents]
    .sort((a, b) => b.fans - a.fans);
}

function leagueStrength(card, ctx) {
  let value = card.strength;
  if (card.id === "runner" && ctx.attacking) value += 3;
  if (card.id === "keeper" && !ctx.attacking) value += 2;
  if (card.id === "fanclub" && ctx.bench >= 2) value += 5;
  if (card.id === "scout" && ctx.stackSize === 0) value += 2;
  if (card.id === "double" && ctx.stackSize >= 1) value += 3;
  if (card.id === "mascot") value += 4;
  if (card.id === "ace" && ctx.attacking) value += 4;
  if (card.id === "captain2" && ctx.bench === 0) value += 5;
  if (card.id === "comeback") value += Math.floor(ctx.target / 4);
  return value + (ctx.coach || 0);
}

function simulateLeagueBattle(playerDeck, opponentDeck) {
  const decks = {
    player: shuffle(playerDeck.map((inst) => leagueById[inst.id])),
    opponent: shuffle(opponentDeck.map((inst) => leagueById[inst.id]))
  };
  let holder = Math.random() > 0.5 ? "player" : "opponent";
  let first = decks[holder].shift();
  let flag = leagueStrength(first, { attacking: false, bench: 0, stackSize: 0, target: 0 });
  const bench = { player: 0, opponent: 0 };
  const benchLimit = { player: 5, opponent: 5 };
  const log = [`${holder === "player" ? "내 팀" : "상대"}이 ${first.name} 힘 ${flag}로 깃발을 잡았다.`];

  for (let step = 0; step < 24; step += 1) {
    const attacker = holder === "player" ? "opponent" : "player";
    let total = 0;
    let coach = 0;
    const names = [];
    while (total < flag) {
      const next = decks[attacker].shift();
      if (!next) {
        const win = holder === "player";
        log.push(`${attacker === "player" ? "내 팀" : "상대"} 덱 고갈.`);
        return { win, log };
      }
      const add = leagueStrength(next, {
        attacking: true,
        bench: bench[attacker],
        stackSize: names.length,
        target: flag,
        coach
      });
      total += add;
      names.push(`${next.name}(${add})`);
      coach = next.id === "coach" ? 2 : 0;
      if (next.id === "wall") benchLimit[attacker] += 1;
    }
    bench[holder] += 1;
    log.push(`${attacker === "player" ? "내 팀" : "상대"} ${names.join(", ")}로 힘 ${total}. ${holder === "player" ? "내" : "상대"} 벤치 ${bench[holder]}/${benchLimit[holder]}.`);
    if (bench[holder] > benchLimit[holder]) {
      return { win: attacker === "player", log };
    }
    holder = attacker;
    flag = total;
  }
  return { win: holder === "player", log };
}

function runLeagueFinal() {
  const finalist = leagueStandings().find((team) => !team.me) || league.opponents[0];
  const finalOpponent = {
    deck: sample(leagueCards, 10).map((card) => makeLeagueCard(card.id))
  };
  const result = simulateLeagueBattle(league.deck, finalOpponent.deck);
  league.phase = "ended";
  league.last = result;
  league.log = [`결승 상대: ${finalist.name}. ${result.win ? "우승" : "준우승"}.`, ...result.log];
  render();
}

function renderLeague() {
  const standings = leagueStandings();
  const phaseControls = {
    draft: `<div class="choices">${league.pack.map((card, i) => `
      <button class="choice ${league.selected.includes(i) ? "selected" : ""}" type="button" data-action="league-pick" data-index="${i}">
        ${cardMarkup(card, card.tier)}
      </button>
    `).join("")}</div>`,
    trim: `
      <div class="actions"><button class="primary" type="button" data-action="league-battle">매치 시작</button></div>
      <p class="muted">버릴 수 있는 카드 ${league.trimLeft}장</p>
      <div class="cards">${league.deck.map((inst, i) => `
        <button class="card-button" type="button" data-action="league-remove" data-index="${i}">
          ${cardMarkup(leagueById[inst.id], leagueById[inst.id].tier)}
        </button>
      `).join("")}</div>
    `,
    final: `<div class="result-banner"><b>결승 진출</b><span>최종 덱으로 마지막 매치를 진행한다.</span></div><button class="primary" type="button" data-action="league-final">결승 시작</button>`,
    ended: `<button class="primary" type="button" data-action="reset-league">새 리그</button>`
  };

  $game.innerHTML = `
    <div class="game-grid">
      <aside class="side">
        <div class="section-title">
          <h2>카드 리그</h2>
          <button class="mini" type="button" data-action="reset-league">리셋</button>
        </div>
        <div class="stat-grid">
          <div class="stat"><span>라운드</span><b>${Math.min(league.round, 7)}/7</b></div>
          <div class="stat"><span>팬</span><b>${league.fans}</b></div>
        </div>
        <h3>순위</h3>
        <div class="standings">${standings.map((team, i) => `
          <div class="standing ${team.me ? "me" : ""}">
            <span>${i + 1}. ${team.name}</span>
            <b>${team.fans}</b>
          </div>
        `).join("")}</div>
      </aside>
      <section class="stage">
        <div class="battlefield">
          <div class="fighter">
            <h3>내 팀</h3>
            <p class="muted">${league.deck.length}장 · 벤치 한도 5</p>
          </div>
          <div class="fighter enemy">
            <h3>${league.currentOpponent ? league.currentOpponent.name : "결승 상대"}</h3>
            <p class="muted">${league.currentOpponent ? `${league.currentOpponent.deck.length}장 · 팬 ${league.currentOpponent.fans}` : "상위권 덱"}</p>
          </div>
        </div>
        ${phaseControls[league.phase]}
        <h3 style="margin-top:18px">현재 덱</h3>
        <div class="deck-list">${league.deck.map((inst) => `<div class="card">${cardMarkup(leagueById[inst.id], leagueById[inst.id].tier)}</div>`).join("")}</div>
        <h3 style="margin-top:18px">매치 로그</h3>
        <div class="log">${league.log.map((line) => `<p>${line}</p>`).join("")}</div>
      </section>
    </div>
  `;
}

const tacticCards = [
  { id: "slash", name: "절단검", tags: ["tactic", "strike"], dmg: 8, text: "피해 8." },
  { id: "barrier", name: "방호막", tags: ["tactic", "shield"], shield: 10, text: "방어막 10." },
  { id: "drone", name: "지원 드론", tags: ["tactic", "summon"], drone: 2, text: "드론 2. 드론은 매 턴 피해 2." },
  { id: "acid", name: "산성탄", tags: ["tactic", "poison"], poison: 4, text: "독 4." },
  { id: "meteor", name: "소형 운석", tags: ["tactic", "spark"], dmg: 13, text: "피해 13." },
  { id: "repair", name: "응급 수리", tags: ["tactic", "shield"], heal: 8, shield: 3, text: "체력 8, 방어막 3." },
  { id: "counter", name: "반격 태세", tags: ["tactic", "echo"], dmg: 5, shield: 4, text: "피해 5, 방어막 4." },
  { id: "amplify", name: "증폭 룬", tags: ["tactic", "spark", "echo"], boost: 3, text: "다음 피해 카드 +3." },
  { id: "sniper", name: "마무리 사격", tags: ["tactic", "strike"], dmg: 6, execute: 7, text: "피해 6. 결정타 슬롯에서 추가 피해." }
];

const tacticById = Object.fromEntries(tacticCards.map((card) => [card.id, card]));
let tactic;

function makeTacticCard(id, level = 1) {
  return { uid: uid("tactic"), id, level };
}

function resetTactic() {
  tactic = {
    round: 1,
    maxRound: 7,
    integrity: 26,
    phase: "setup",
    selectedUid: null,
    collection: [
      makeTacticCard("slash"),
      makeTacticCard("barrier"),
      makeTacticCard("drone"),
      makeTacticCard("acid"),
      makeTacticCard("counter")
    ],
    slots: {
      lead: null,
      engine: null,
      reaction: null,
      finisher: null,
      reserve: null
    },
    enemy: makeTacticEnemy(1),
    rewards: [],
    last: null,
    log: ["작전 보드가 준비됐다."]
  };
  tactic.slots.lead = tactic.collection[0].uid;
  tactic.slots.engine = tactic.collection[2].uid;
  tactic.slots.reaction = tactic.collection[4].uid;
  render();
}

function makeTacticEnemy(round) {
  const names = ["고철 척후병", "암시장 투사", "유리 방패병", "독 안개 술사", "쌍검 챔피언", "태엽 용병", "보스: 황금 장갑"];
  return {
    name: names[round - 1],
    hp: 32 + round * 9,
    atk: 5 + round * 2
  };
}

function selectTacticCard(uidValue) {
  tactic.selectedUid = tactic.selectedUid === uidValue ? null : uidValue;
  render();
}

function assignTacticSlot(slot) {
  if (!tactic.selectedUid) return;
  tactic.slots[slot] = tactic.selectedUid;
  tactic.log = [`${slotName(slot)} 슬롯에 장착했다.`];
  render();
}

function clearTacticSlot(slot) {
  tactic.slots[slot] = null;
  render();
}

function slotName(slot) {
  return {
    lead: "선봉",
    engine: "엔진",
    reaction: "반응",
    finisher: "결정타",
    reserve: "예비"
  }[slot];
}

function runTacticBattle() {
  const result = simulateTacticBattle();
  tactic.last = result;
  tactic.log = result.log;
  if (!result.win) tactic.integrity -= 6;
  if (tactic.integrity <= 0 || tactic.round >= tactic.maxRound) {
    tactic.phase = "ended";
    tactic.log.unshift(result.win ? "최종 보스를 격파했다." : "기체가 파손됐다.");
  } else {
    tactic.phase = "reward";
    tactic.rewards = makeTacticRewards();
  }
  render();
}

function simulateTacticBattle() {
  const enemy = { ...tactic.enemy };
  const ctx = {
    hp: 38,
    shield: 0,
    poison: 0,
    drones: 0,
    boost: 0,
    finisherUsed: false,
    reserveUsed: false
  };
  const log = [`${enemy.name} 체력 ${enemy.hp}, 공격 ${enemy.atk}.`];
  triggerSlot("lead", ctx, enemy, log);

  for (let turn = 1; turn <= 8; turn += 1) {
    if (ctx.poison > 0) {
      enemy.hp -= ctx.poison;
      log.push(`턴 ${turn}: 독 피해 ${ctx.poison}.`);
    }
    if (ctx.drones > 0) {
      const droneDamage = ctx.drones * 2;
      enemy.hp -= droneDamage;
      log.push(`드론 피해 ${droneDamage}.`);
    }
    if (turn % 2 === 0) triggerSlot("engine", ctx, enemy, log);
    if (!ctx.finisherUsed && (enemy.hp <= tactic.enemy.hp * 0.42 || turn >= 6)) {
      triggerSlot("finisher", ctx, enemy, log);
      ctx.finisherUsed = true;
    }
    if (enemy.hp <= 0) return { win: true, playerHp: ctx.hp, enemyHp: 0, log };

    let incoming = enemy.atk + Math.floor(Math.random() * 4);
    const blocked = Math.min(ctx.shield, incoming);
    ctx.shield -= blocked;
    incoming -= blocked;
    ctx.hp -= incoming;
    log.push(`적 공격 ${incoming}${blocked ? `, 방어 ${blocked}` : ""}. 내 체력 ${Math.max(0, ctx.hp)}.`);
    if (incoming > 0) triggerSlot("reaction", ctx, enemy, log);
    if (!ctx.reserveUsed && ctx.hp <= 18) {
      triggerSlot("reserve", ctx, enemy, log);
      ctx.reserveUsed = true;
    }
    if (ctx.hp <= 0) return { win: false, playerHp: 0, enemyHp: enemy.hp, log };
  }
  return { win: enemy.hp <= ctx.hp, playerHp: ctx.hp, enemyHp: enemy.hp, log };
}

function triggerSlot(slot, ctx, enemy, log) {
  const uidValue = tactic.slots[slot];
  if (!uidValue) return;
  const inst = tactic.collection.find((card) => card.uid === uidValue);
  if (!inst) return;
  const card = tacticById[inst.id];
  const level = inst.level;
  let scale = 1 + (level - 1) * 0.25;
  if (slot === "lead") scale += 0.2;
  if (slot === "finisher") scale += 0.55;
  if (slot === "reserve" && (card.heal || card.shield)) scale += 0.45;

  let damage = Math.floor((card.dmg || 0) * scale) + ctx.boost;
  if (slot === "finisher" && card.execute) damage += card.execute;
  if (damage > 0) {
    enemy.hp -= damage;
    log.push(`${slotName(slot)} ${card.name}: 피해 ${damage}. 적 체력 ${Math.max(0, enemy.hp)}.`);
    ctx.boost = 0;
  }
  if (card.shield) {
    const shield = Math.floor(card.shield * scale);
    ctx.shield += shield;
    log.push(`${slotName(slot)} ${card.name}: 방어막 +${shield}.`);
  }
  if (card.heal) {
    const heal = Math.floor(card.heal * scale);
    ctx.hp = Math.min(40, ctx.hp + heal);
    log.push(`${slotName(slot)} ${card.name}: 체력 +${heal}.`);
  }
  if (card.poison) {
    const poison = Math.floor(card.poison * scale);
    ctx.poison += poison;
    log.push(`${slotName(slot)} ${card.name}: 독 +${poison}.`);
  }
  if (card.drone) {
    const drones = Math.max(1, Math.floor(card.drone * scale));
    ctx.drones += drones;
    log.push(`${slotName(slot)} ${card.name}: 드론 +${drones}.`);
  }
  if (card.boost) {
    ctx.boost += card.boost + level;
    log.push(`${slotName(slot)} ${card.name}: 다음 피해 +${ctx.boost}.`);
  }
}

function makeTacticRewards() {
  const rewards = sample(tacticCards, 3).map((card) => ({ type: "add", id: card.id, title: `${card.name} 획득`, text: card.text }));
  const assigned = Object.values(tactic.slots).filter(Boolean);
  const targetUid = assigned.length ? pick(assigned) : tactic.collection[0].uid;
  const target = tactic.collection.find((card) => card.uid === targetUid);
  rewards.push({ type: "upgrade", uid: target.uid, title: `${tacticById[target.id].name} 강화`, text: "카드 레벨 +1." });
  return rewards;
}

function chooseTacticReward(index) {
  const reward = tactic.rewards[index];
  if (!reward) return;
  if (reward.type === "add") {
    tactic.collection.push(makeTacticCard(reward.id));
    tactic.log = [`${tacticById[reward.id].name}을 획득했다.`];
  }
  if (reward.type === "upgrade") {
    const target = tactic.collection.find((card) => card.uid === reward.uid);
    target.level += 1;
    tactic.log = [`${tacticById[target.id].name}이 Lv.${target.level}이 되었다.`];
  }
  tactic.round += 1;
  tactic.enemy = makeTacticEnemy(tactic.round);
  tactic.phase = "setup";
  render();
}

function renderSlot(slot) {
  const uidValue = tactic.slots[slot];
  const inst = tactic.collection.find((card) => card.uid === uidValue);
  return `
    <button class="slot ${tactic.selectedUid && tactic.selectedUid === uidValue ? "selected" : ""}" type="button" data-action="tactic-slot" data-value="${slot}">
      <small>${slotName(slot)}</small>
      ${inst ? cardMarkup(tacticById[inst.id], inst.level) : `<div class="empty-slot">빈 슬롯</div>`}
    </button>
  `;
}

function renderTactic() {
  const result = tactic.last ? `<div class="result-banner"><b>${tactic.last.win ? "승리" : "패배"}</b><span>내 체력 ${Math.max(0, tactic.last.playerHp)} · 적 체력 ${Math.max(0, tactic.last.enemyHp)}</span></div>` : "";
  const controls = {
    setup: `<button class="primary" type="button" data-action="tactic-battle">전투 시작</button>`,
    reward: `<div class="choices">${tactic.rewards.map((reward, i) => `
      <button class="choice" type="button" data-action="tactic-reward" data-index="${i}">
        <div class="card-name"><span>${reward.title}</span></div>
        <p class="muted">${reward.text}</p>
      </button>
    `).join("")}</div>`,
    ended: `<button class="primary" type="button" data-action="reset-tactic">새 작전</button>`
  };

  $game.innerHTML = `
    <div class="game-grid">
      <aside class="side">
        <div class="section-title">
          <h2>작전 슬롯</h2>
          <button class="mini" type="button" data-action="reset-tactic">리셋</button>
        </div>
        <div class="stat-grid">
          <div class="stat"><span>라운드</span><b>${tactic.round}/${tactic.maxRound}</b></div>
          <div class="stat"><span>기체</span><b>${Math.max(0, tactic.integrity)}</b></div>
        </div>
        <h3>카드 풀</h3>
        <div class="cards">${tactic.collection.map((inst) => `
          <button class="card-button ${tactic.selectedUid === inst.uid ? "selected" : ""}" type="button" data-action="tactic-select-card" data-value="${inst.uid}">
            ${cardMarkup(tacticById[inst.id], inst.level)}
          </button>
        `).join("")}</div>
      </aside>
      <section class="stage">
        ${result}
        <div class="battlefield">
          <div class="fighter">
            <h3>내 작전</h3>
            <p class="muted">${Object.values(tactic.slots).filter(Boolean).length}/5 슬롯 장착</p>
          </div>
          <div class="fighter enemy">
            <h3>${tactic.enemy.name}</h3>
            <p class="muted">체력 ${tactic.enemy.hp} · 공격 ${tactic.enemy.atk}</p>
          </div>
        </div>
        <div class="slot-grid">
          ${["lead", "engine", "reaction", "finisher", "reserve"].map(renderSlot).join("")}
        </div>
        <div class="actions">${controls[tactic.phase] || ""}</div>
        <h3 style="margin-top:18px">전투 로그</h3>
        <div class="log">${tactic.log.map((line) => `<p>${line}</p>`).join("")}</div>
      </section>
    </div>
  `;
}

function render() {
  $game.className = `game-shell mode-${mode}`;
  if (mode === "tree") renderTree();
  if (mode === "league") renderLeague();
  if (mode === "tactic") renderTactic();
}

resetTree();
resetLeague();
resetTactic();
render();
