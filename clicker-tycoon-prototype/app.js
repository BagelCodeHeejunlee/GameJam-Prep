(() => {
  const $ = (selector) => document.querySelector(selector);

  const elements = {
    dayLabel: $("#dayLabel"),
    cashLabel: $("#cashLabel"),
    repLabel: $("#repLabel"),
    guidePanel: $("#guidePanel"),
    guideTitle: $("#guideTitle"),
    guideText: $("#guideText"),
    skipGuideButton: $("#skipGuideButton"),
    exploreTab: $("#exploreTab"),
    shopTab: $("#shopTab"),
    explorePanel: $("#explorePanel"),
    shopPanel: $("#shopPanel"),
    goalLabel: $("#goalLabel"),
    newDayButton: $("#newDayButton"),
    oxygenLabel: $("#oxygenLabel"),
    bagLabel: $("#bagLabel"),
    dangerLabel: $("#dangerLabel"),
    mineBoard: $("#mineBoard"),
    scannerButton: $("#scannerButton"),
    bombButton: $("#bombButton"),
    scannerCount: $("#scannerCount"),
    bombCount: $("#bombCount"),
    returnButton: $("#returnButton"),
    incomeLabel: $("#incomeLabel"),
    queueLabel: $("#queueLabel"),
    staffLabel: $("#staffLabel"),
    shopMap: $("#shopMap"),
    warehouseList: $("#warehouseList"),
    stationList: $("#stationList"),
    collectAllButton: $("#collectAllButton"),
    restartButton: $("#restartButton"),
    logList: $("#logList"),
  };

  const resources = {
    clam: { name: "조개", short: "조", color: "clam" },
    ore: { name: "광석", short: "광", color: "ore" },
    coral: { name: "산호", short: "산", color: "coral" },
    pearl: { name: "진주", short: "진", color: "pearl" },
    relic: { name: "유물", short: "유", color: "relic" },
  };

  const tileTypes = {
    clam: { name: "푸른 조개", hp: 1, resource: "clam", amount: 2, weight: 2 },
    ore: { name: "청동 광맥", hp: 2, resource: "ore", amount: 2, weight: 2 },
    coral: { name: "발광 산호", hp: 1, resource: "coral", amount: 2, weight: 2 },
    pearl: { name: "심해 진주", hp: 3, resource: "pearl", amount: 1, weight: 2 },
    relic: { name: "고대 유물", hp: 3, resource: "relic", amount: 1, weight: 3 },
    danger: { name: "불안정 암반", hp: 2, resource: "ore", amount: 1, weight: 1, danger: 16 },
    empty: { name: "빈 암반", hp: 1, resource: null, amount: 0, weight: 0 },
  };

  const stationDefs = {
    grill: {
      name: "조개 구이대",
      desc: "가장 빠르게 회전하는 기본 매대입니다.",
      resource: "clam",
      x: 18,
      y: 22,
      basePrice: 18,
      baseSpeed: 1.4,
      baseCapacity: 4,
      unlockCost: 0,
    },
    oreStand: {
      name: "광석 진열대",
      desc: "탐험에서 얻은 광석을 바로 현금화합니다.",
      resource: "ore",
      x: 58,
      y: 20,
      basePrice: 25,
      baseSpeed: 1.9,
      baseCapacity: 3,
      unlockCost: 0,
    },
    souvenir: {
      name: "기념품 선반",
      desc: "산호와 부산물로 관광객 매출을 만듭니다.",
      resource: "coral",
      x: 18,
      y: 56,
      basePrice: 42,
      baseSpeed: 3.2,
      baseCapacity: 3,
      unlockCost: 170,
    },
    relicShow: {
      name: "유물 전시대",
      desc: "느리지만 객단가가 높은 후반 스테이션입니다.",
      resource: "relic",
      x: 58,
      y: 56,
      basePrice: 90,
      baseSpeed: 4.2,
      baseCapacity: 2,
      unlockCost: 330,
    },
  };

  const guideSteps = [
    {
      id: "mine",
      title: "첫 재료 캐기",
      text: "빛나는 조개 타일을 탭해서 첫 재료를 캐세요. 채굴은 탭만으로 진행됩니다.",
      target: '[data-tile-id="0"]',
      done: (state) => state.stats.mined > 0,
    },
    {
      id: "return",
      title: "가게로 귀환",
      text: "재료를 얻었습니다. 귀환 버튼을 눌러 상점 운영을 시작하세요.",
      target: "#returnButton",
      done: (state) => state.phase === "shop",
    },
    {
      id: "stock",
      title: "스테이션 보충",
      text: "조개 구이대의 보충 버튼을 눌러 창고 재료를 매대에 올리세요.",
      target: '[data-action="restock"][data-station="grill"]',
      done: (state) => state.stations.grill.stock > 0,
    },
    {
      id: "collect",
      title: "돈 수거",
      text: "손님이 자동으로 구매하면 돈 더미가 쌓입니다. 돈 더미나 전부 수거 버튼을 눌러 회수하세요.",
      target: "#collectAllButton",
      done: (state) => state.stats.collected > 0,
    },
    {
      id: "upgrade",
      title: "병목 업그레이드",
      text: "가격, 속도, 재고 중 하나를 업그레이드해 매출이 빨라지는지 확인하세요.",
      target: '[data-action="upgrade-price"][data-station="grill"]',
      done: (state) => Object.values(state.stations).some((station) => station.priceLevel > 1 || station.speedLevel > 1 || station.capacityLevel > 1),
    },
    {
      id: "hire",
      title: "직원 자동화",
      text: "보충 직원을 고용하세요. 직접 하던 재고 보충이 자동화되면서 타이쿤 성장감이 시작됩니다.",
      target: "#hireRestockerButton",
      done: (state) => state.staff.restocker,
    },
    {
      id: "done",
      title: "이제 운영 시작",
      text: "탐험으로 재료를 얻고, 가게에서 병목을 업그레이드하세요. 다음 목표는 유물 전시대 해금입니다.",
      target: null,
      done: () => false,
    },
  ];

  let state = null;
  let shopTimer = null;
  let customerTimer = null;
  let restockerTimer = null;

  function createInitialState() {
    return {
      day: 1,
      phase: "explore",
      cash: 130,
      rep: 1,
      goal: "조개 구이대 재고 채우기",
      oxygen: 42,
      danger: 0,
      bagMax: 14,
      bagUsed: 0,
      bag: makeResourceBag(),
      warehouse: { clam: 0, ore: 0, coral: 0, pearl: 0, relic: 0 },
      tools: { scanner: 2, bomb: 1 },
      mine: makeMine(),
      stations: makeStations(),
      staff: { restocker: false },
      tutorialIndex: 0,
      tutorialHidden: false,
      stats: { mined: 0, collected: 0, totalEarned: 0 },
      incomeSamples: [],
      logs: [],
    };
  }

  function makeResourceBag() {
    return { clam: 0, ore: 0, coral: 0, pearl: 0, relic: 0 };
  }

  function makeStations() {
    return Object.fromEntries(
      Object.entries(stationDefs).map(([id, def]) => [
        id,
        {
          id,
          unlocked: def.unlockCost === 0,
          stock: 0,
          queue: 0,
          cashPile: 0,
          progress: 0,
          priceLevel: 1,
          speedLevel: 1,
          capacityLevel: 1,
        },
      ]),
    );
  }

  function makeMine() {
    const layout = [
      "clam", "ore", "empty", "clam", "coral",
      "empty", "ore", "clam", "danger", "empty",
      "coral", "empty", "ore", "clam", "pearl",
      "danger", "ore", "empty", "coral", "ore",
      "empty", "pearl", "danger", "relic", "empty",
      "ore", "coral", "empty", "pearl", "danger",
      "relic", "empty", "ore", "coral", "pearl",
    ];

    return layout.map((type, index) => ({
      id: index,
      type,
      hp: tileTypes[type].hp,
      maxHp: tileTypes[type].hp,
      revealed: index < 10,
      mined: false,
      scanned: false,
    }));
  }

  function setPhase(phase) {
    state.phase = phase;
    elements.explorePanel.classList.toggle("active", phase === "explore");
    elements.shopPanel.classList.toggle("active", phase === "shop");
    elements.exploreTab.classList.toggle("active", phase === "explore");
    elements.shopTab.classList.toggle("active", phase === "shop");
    updateTutorial();
    render();
  }

  function render() {
    renderHud();
    renderMine();
    renderWarehouse();
    renderShopMap();
    renderStations();
    renderLogs();
    updateTutorial();
  }

  function renderHud() {
    const totalQueue = Object.values(state.stations).reduce((sum, station) => sum + station.queue, 0);
    const staffCount = state.staff.restocker ? 1 : 0;
    const income = Math.round(state.incomeSamples.reduce((sum, value) => sum + value, 0) * 6);

    elements.dayLabel.textContent = state.day;
    elements.cashLabel.textContent = formatNumber(state.cash);
    elements.repLabel.textContent = state.rep;
    elements.goalLabel.textContent = state.goal;
    elements.oxygenLabel.textContent = state.oxygen;
    elements.bagLabel.textContent = `${state.bagUsed}/${state.bagMax}`;
    elements.dangerLabel.textContent = `${state.danger}%`;
    elements.scannerCount.textContent = state.tools.scanner;
    elements.bombCount.textContent = state.tools.bomb;
    elements.incomeLabel.textContent = formatNumber(income);
    elements.queueLabel.textContent = totalQueue;
    elements.staffLabel.textContent = staffCount;
    elements.newDayButton.disabled = state.phase !== "shop";
  }

  function renderMine() {
    elements.mineBoard.innerHTML = state.mine.map((tile) => {
      const type = tileTypes[tile.type];
      const hidden = !tile.revealed;
      const classNames = [
        "tile",
        tile.type,
        hidden ? "hidden-tile" : "",
        tile.mined ? "empty" : "",
        tile.type === "danger" ? "danger-tile" : "",
      ].filter(Boolean).join(" ");
      const label = hidden ? "?" : tile.mined ? "빈칸" : type.name;
      const hpText = tile.mined ? "완료" : hidden ? "숨김" : `${tile.hp}/${tile.maxHp}`;

      return `
        <button class="${classNames}" type="button" data-tile-id="${tile.id}" aria-label="${label}">
          <span class="tile-content">
            <span class="tile-icon"></span>
            <small>${hpText}</small>
          </span>
        </button>
      `;
    }).join("");
  }

  function renderWarehouse() {
    elements.warehouseList.innerHTML = Object.entries(resources).map(([id, resource]) => `
      <div class="resource-token">
        <span class="tile-icon ${resource.color}"></span>
        <strong>${resource.name} ${state.warehouse[id]}</strong>
      </div>
    `).join("");
  }

  function renderShopMap() {
    const stationNodes = Object.entries(stationDefs).map(([id, def]) => {
      const station = state.stations[id];
      const capacity = stationCapacity(id);
      const fill = station.unlocked ? Math.round((station.stock / capacity) * 100) : 0;
      const queueDots = Array.from({ length: Math.min(station.queue, 5) }, (_, index) => {
        const left = def.x + 3 + index * 7;
        const top = def.y + 27 + index * 2;
        return `<span class="customer" style="left:${left}%;top:${top}%">${index + 1}</span>`;
      }).join("");
      const cash = station.cashPile > 0 ? `<button class="money-pile" type="button" data-action="collect" data-station="${id}">${formatNumber(station.cashPile)}</button>` : "";
      const locked = station.unlocked ? "" : "locked";
      const title = station.unlocked ? def.name : `${def.name} 잠김`;

      return `
        <article class="station-node ${locked}" style="left:${def.x}%;top:${def.y}%">
          ${cash}
          <h3>${title}</h3>
          <div class="station-meter" style="--fill:${fill}%"><span></span></div>
          <div class="station-meta">
            <span>재고 ${station.stock}/${capacity}</span>
            <span>줄 ${station.queue}</span>
          </div>
        </article>
        ${queueDots}
      `;
    }).join("");

    const worker = state.staff.restocker ? '<span class="worker" style="left:42%;top:76%">보</span>' : "";

    elements.shopMap.innerHTML = `
      ${stationNodes}
      <div class="counter-line"></div>
      <span class="entry-label">입구</span>
      ${worker}
    `;
  }

  function renderStations() {
    const cards = Object.entries(stationDefs).map(([id, def]) => {
      const station = state.stations[id];
      const capacity = stationCapacity(id);
      const price = stationPrice(id);
      const speed = stationSpeed(id);
      const resource = resources[def.resource];
      const locked = station.unlocked ? "" : "locked";
      const unlockButton = station.unlocked
        ? ""
        : `<button type="button" data-action="unlock" data-station="${id}" ${state.cash < def.unlockCost ? "disabled" : ""}>해금 ${def.unlockCost}</button>`;

      return `
        <article class="station-card ${locked}">
          <div>
            <div class="station-title">
              <h3>${def.name}</h3>
              <span>${resource.name}</span>
            </div>
            <p>${def.desc}</p>
            <div class="station-actions">
              ${station.unlocked ? `<button type="button" data-action="restock" data-station="${id}" ${canRestock(id) ? "" : "disabled"}>보충</button>` : unlockButton}
              <button type="button" data-action="upgrade-price" data-station="${id}" ${station.unlocked && state.cash >= upgradeCost(station.priceLevel, 80) ? "" : "disabled"}>가격 ${upgradeCost(station.priceLevel, 80)}</button>
              <button type="button" data-action="upgrade-speed" data-station="${id}" ${station.unlocked && state.cash >= upgradeCost(station.speedLevel, 90) ? "" : "disabled"}>속도 ${upgradeCost(station.speedLevel, 90)}</button>
            </div>
          </div>
          <div class="station-side">
            <div class="mini-stat">재고<strong>${station.stock}/${capacity}</strong></div>
            <div class="mini-stat">판매<strong>${formatNumber(price)}</strong></div>
            <div class="mini-stat">처리<strong>${speed.toFixed(1)}s</strong></div>
          </div>
        </article>
      `;
    }).join("");

    const hireCost = 60;
    const hireRow = `
      <section class="warehouse-panel hire-row">
        <p><strong>보충 직원</strong><br />가장 재고가 낮은 스테이션에 창고 재료를 자동으로 옮깁니다.</p>
        <button id="hireRestockerButton" class="hire-button" type="button" ${state.staff.restocker || state.cash < hireCost ? "disabled" : ""}>
          ${state.staff.restocker ? "고용됨" : `고용 ${hireCost}`}
        </button>
      </section>
    `;

    elements.stationList.innerHTML = cards + hireRow;
  }

  function renderLogs() {
    elements.logList.innerHTML = state.logs.slice(0, 4).map((text) => `<div class="log-item">${text}</div>`).join("");
  }

  function mineTile(tileId, power = 1) {
    const tile = state.mine[tileId];
    if (!tile || tile.mined || !tile.revealed || state.oxygen <= 0) return;

    const type = tileTypes[tile.type];
    tile.hp = Math.max(0, tile.hp - power);
    state.oxygen = Math.max(0, state.oxygen - 1);

    if (type.danger) {
      state.danger = Math.min(100, state.danger + type.danger);
    }

    if (tile.hp === 0) {
      tile.mined = true;
      state.stats.mined += 1;
      collectFromTile(tile);
      revealNeighbors(tile.id);
    }

    if (state.oxygen === 0 || state.danger >= 100 || state.bagUsed >= state.bagMax) {
      log("탐험 한계에 도달했습니다. 귀환해서 재고를 정리하세요.");
    }

    render();
  }

  function collectFromTile(tile) {
    const type = tileTypes[tile.type];
    if (!type.resource) {
      log(`${type.name}을 정리했습니다.`);
      return;
    }

    const capacityLeft = state.bagMax - state.bagUsed;
    if (capacityLeft < type.weight) {
      log("가방이 가득 차서 재료를 더 담을 수 없습니다.");
      return;
    }

    state.bag[type.resource] += type.amount;
    state.bagUsed += type.weight;
    log(`${type.name}에서 ${resources[type.resource].name} ${type.amount}개 획득.`);
  }

  function revealNeighbors(tileId) {
    const row = Math.floor(tileId / 5);
    const col = tileId % 5;
    const neighborIds = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ].filter(([r, c]) => r >= 0 && r < 7 && c >= 0 && c < 5).map(([r, c]) => r * 5 + c);

    neighborIds.forEach((id) => {
      state.mine[id].revealed = true;
    });
  }

  function scanTiles() {
    if (state.tools.scanner <= 0) return;
    state.tools.scanner -= 1;
    const hiddenRare = state.mine.filter((tile) => !tile.revealed && ["pearl", "relic", "danger"].includes(tile.type));
    hiddenRare.slice(0, 4).forEach((tile) => {
      tile.revealed = true;
      tile.scanned = true;
    });
    log("스캐너가 깊은 곳의 희귀 타일을 드러냈습니다.");
    render();
  }

  function useBomb() {
    if (state.tools.bomb <= 0) return;
    const target = state.mine.find((tile) => tile.revealed && !tile.mined && tile.type !== "empty");
    if (!target) return;
    state.tools.bomb -= 1;
    mineTile(target.id, 3);
    revealNeighbors(target.id);
    log("폭탄으로 단단한 타일을 한 번에 정리했습니다.");
    render();
  }

  function returnToShop() {
    Object.keys(resources).forEach((id) => {
      state.warehouse[id] += state.bag[id];
      state.bag[id] = 0;
    });
    state.bagUsed = 0;
    state.goal = "스테이션 재고와 계산대 병목 관리";
    log("탐험 재료를 창고로 옮겼습니다. 이제 가게를 운영하세요.");
    setPhase("shop");
  }

  function startNewDay() {
    state.day += 1;
    state.oxygen = 42 + Math.min(10, state.day * 2);
    state.danger = 0;
    state.mine = makeMine();
    state.tools.scanner = 2;
    state.tools.bomb = 1;
    state.goal = state.day >= 3 ? "기념품 선반 해금하기" : "조개 구이대 재고 채우기";
    log(`${state.day}일차가 시작됐습니다. 새 탐험지가 열렸습니다.`);
    setPhase("explore");
  }

  function runShopTick() {
    const earnedThisTick = [];
    Object.keys(stationDefs).forEach((id) => {
      const station = state.stations[id];
      if (!station.unlocked) return;

      if (station.queue > 0 && station.stock > 0) {
        station.progress += 0.5;
        if (station.progress >= stationSpeed(id)) {
          station.progress = 0;
          station.queue -= 1;
          station.stock -= 1;
          const earned = stationPrice(id);
          station.cashPile += earned;
          earnedThisTick.push(earned);
        }
      } else if (station.queue > 4 && station.stock === 0) {
        station.queue -= 1;
        state.rep = Math.max(1, state.rep - 1);
        log(`${stationDefs[id].name} 품절로 손님이 떠났습니다.`);
      } else {
        station.progress = 0;
      }
    });

    const earned = earnedThisTick.reduce((sum, value) => sum + value, 0);
    state.incomeSamples.unshift(earned);
    state.incomeSamples = state.incomeSamples.slice(0, 12);
    render();
  }

  function addCustomer() {
    const unlocked = Object.keys(stationDefs).filter((id) => state.stations[id].unlocked);
    if (!unlocked.length) return;
    const sorted = unlocked.sort((a, b) => state.stations[a].queue - state.stations[b].queue);
    const target = sorted[Math.random() < 0.72 ? 0 : Math.floor(Math.random() * sorted.length)];
    state.stations[target].queue += 1;
    render();
  }

  function runRestocker() {
    if (!state.staff.restocker) return;
    const candidates = Object.keys(stationDefs)
      .filter((id) => state.stations[id].unlocked && canRestock(id))
      .sort((a, b) => {
        const aRatio = state.stations[a].stock / stationCapacity(a);
        const bRatio = state.stations[b].stock / stationCapacity(b);
        return aRatio - bRatio;
      });

    if (candidates[0]) {
      restockStation(candidates[0], true);
    }
  }

  function restockStation(id, silent = false) {
    const def = stationDefs[id];
    const station = state.stations[id];
    const capacity = stationCapacity(id);
    const available = state.warehouse[def.resource];
    if (!station.unlocked || station.stock >= capacity || available <= 0) return;

    const amount = Math.min(capacity - station.stock, available, state.staff.restocker && silent ? 2 : 3);
    station.stock += amount;
    state.warehouse[def.resource] -= amount;
    if (!silent) log(`${def.name} 재고를 ${amount}개 보충했습니다.`);
    render();
  }

  function collectCash(id) {
    const station = state.stations[id];
    if (!station || station.cashPile <= 0) return;
    const amount = station.cashPile;
    station.cashPile = 0;
    state.cash += amount;
    state.stats.collected += amount;
    state.stats.totalEarned += amount;
    log(`${stationDefs[id].name}에서 ${formatNumber(amount)} 코인을 수거했습니다.`);
    render();
  }

  function collectAllCash() {
    Object.keys(stationDefs).forEach(collectCash);
  }

  function upgradeStation(id, type) {
    const station = state.stations[id];
    if (!station || !station.unlocked) return;
    const key = `${type}Level`;
    const base = type === "price" ? 80 : type === "speed" ? 90 : 100;
    const cost = upgradeCost(station[key], base);
    if (state.cash < cost) return;
    state.cash -= cost;
    station[key] += 1;
    log(`${stationDefs[id].name} ${type === "price" ? "가격" : type === "speed" ? "속도" : "재고"} Lv.${station[key]} 업그레이드.`);
    render();
  }

  function unlockStation(id) {
    const def = stationDefs[id];
    const station = state.stations[id];
    if (station.unlocked || state.cash < def.unlockCost) return;
    state.cash -= def.unlockCost;
    station.unlocked = true;
    log(`${def.name}을 열었습니다. 새 손님 흐름이 생깁니다.`);
    render();
  }

  function hireRestocker() {
    const cost = 60;
    if (state.staff.restocker || state.cash < cost) return;
    state.cash -= cost;
    state.staff.restocker = true;
    log("보충 직원을 고용했습니다. 비어 있는 스테이션을 자동으로 채웁니다.");
    render();
  }

  function stationCapacity(id) {
    const station = state.stations[id];
    return stationDefs[id].baseCapacity + (station.capacityLevel - 1) * 3;
  }

  function stationSpeed(id) {
    const station = state.stations[id];
    return Math.max(1.0, stationDefs[id].baseSpeed - (station.speedLevel - 1) * 0.35);
  }

  function stationPrice(id) {
    const station = state.stations[id];
    const def = stationDefs[id];
    const demand = state.day % 3 === 0 && ["souvenir", "relicShow"].includes(id) ? 1.3 : 1;
    return Math.round(def.basePrice * (1 + (station.priceLevel - 1) * 0.35) * demand);
  }

  function upgradeCost(level, base) {
    return Math.round(base * Math.pow(1.7, level - 1));
  }

  function canRestock(id) {
    const def = stationDefs[id];
    const station = state.stations[id];
    return station.unlocked && station.stock < stationCapacity(id) && state.warehouse[def.resource] > 0;
  }

  function updateTutorial() {
    document.querySelectorAll(".tutorial-focus").forEach((node) => node.classList.remove("tutorial-focus"));

    if (state.tutorialHidden) {
      elements.guidePanel.classList.add("hidden");
      return;
    }

    while (guideSteps[state.tutorialIndex] && guideSteps[state.tutorialIndex].done(state)) {
      state.tutorialIndex += 1;
    }

    const step = guideSteps[state.tutorialIndex] || guideSteps[guideSteps.length - 1];
    elements.guidePanel.classList.remove("hidden");
    elements.guideTitle.textContent = step.title;
    elements.guideText.textContent = step.text;

    if (step.target) {
      const target = document.querySelector(step.target);
      if (target) target.classList.add("tutorial-focus");
    }
  }

  function log(message) {
    state.logs.unshift(message);
    state.logs = state.logs.slice(0, 10);
  }

  function formatNumber(value) {
    if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
    return `${Math.round(value)}`;
  }

  function bindEvents() {
    elements.mineBoard.addEventListener("click", (event) => {
      const tileButton = event.target.closest("[data-tile-id]");
      if (!tileButton) return;
      mineTile(Number(tileButton.dataset.tileId));
    });

    elements.scannerButton.addEventListener("click", scanTiles);
    elements.bombButton.addEventListener("click", useBomb);
    elements.returnButton.addEventListener("click", returnToShop);
    elements.newDayButton.addEventListener("click", startNewDay);
    elements.exploreTab.addEventListener("click", () => setPhase("explore"));
    elements.shopTab.addEventListener("click", () => setPhase("shop"));
    elements.collectAllButton.addEventListener("click", collectAllCash);
    elements.skipGuideButton.addEventListener("click", () => {
      state.tutorialHidden = true;
      render();
    });
    elements.restartButton.addEventListener("click", () => {
      stopLoops();
      init();
    });

    elements.shopMap.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='collect']");
      if (button) collectCash(button.dataset.station);
    });

    elements.stationList.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      if (button.id === "hireRestockerButton") {
        hireRestocker();
        return;
      }

      const action = button.dataset.action;
      const station = button.dataset.station;
      if (!action || !station) return;

      if (action === "restock") restockStation(station);
      if (action === "unlock") unlockStation(station);
      if (action === "upgrade-price") upgradeStation(station, "price");
      if (action === "upgrade-speed") upgradeStation(station, "speed");
    });
  }

  function startLoops() {
    shopTimer = window.setInterval(runShopTick, 500);
    customerTimer = window.setInterval(addCustomer, 1200);
    restockerTimer = window.setInterval(runRestocker, 1300);
  }

  function stopLoops() {
    [shopTimer, customerTimer, restockerTimer].forEach((timer) => {
      if (timer) window.clearInterval(timer);
    });
  }

  function init() {
    state = createInitialState();
    log("새 상점이 열렸습니다. 먼저 탐험에서 재료를 캐세요.");
    render();
    startLoops();
  }

  bindEvents();
  init();
})();
