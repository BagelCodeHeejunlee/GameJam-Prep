(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CakeLinkEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BOARD_SIZE = 4;
  const PLATE_CAPACITY = 6;
  const CAKE_ORDER = ["berry", "blueberry", "lemon", "matcha", "choco"];
  const RAINBOW_TYPE = "rainbow";
  const MYSTERY_TYPE = "mystery";

  function deepClone(value) {
    if (Array.isArray(value)) return value.map(deepClone);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepClone(item)]));
  }

  function capacityOf(plate) {
    const capacity = Number(plate?.capacity);
    return Number.isInteger(capacity) && capacity > 0 ? capacity : PLATE_CAPACITY;
  }

  function totalPieces(plate) {
    if (!plate) return 0;
    return Object.values(plate.pieces || {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  }

  function cloneBoard(board) {
    return board.map((plate) => plate ? deepClone(plate) : null);
  }

  function canReceive(plate, type, targetType = type) {
    if (!plate || totalPieces(plate) >= capacityOf(plate)) return false;
    const resolvedType = targetType === RAINBOW_TYPE ? type : targetType;
    return !plate.allowedColor || plate.allowedColor === resolvedType;
  }

  function canGive(plate, type) {
    return Boolean(plate && !plate.receiveOnly && (plate.pieces?.[type] || 0) > 0);
  }

  function revealPlate(inputPlate) {
    if (!inputPlate) return { plate: null, revealed: [], revealedColors: [], types: [], didReveal: false };
    const plate = deepClone(inputPlate);
    const hidden = Array.isArray(plate.hiddenColors) ? [...plate.hiddenColors] : [];
    let remaining = Math.max(0, Number(plate.pieces?.[MYSTERY_TYPE]) || 0);
    const types = [];
    const waiting = [];
    for (const type of hidden) {
      if (remaining <= 0 || !CAKE_ORDER.includes(type)) {
        waiting.push(type);
        continue;
      }
      plate.pieces[type] = (plate.pieces[type] || 0) + 1;
      remaining -= 1;
      types.push(type);
    }
    if (remaining > 0) plate.pieces[MYSTERY_TYPE] = remaining;
    else delete plate.pieces[MYSTERY_TYPE];
    plate.hiddenColors = waiting;
    return {
      plate,
      revealed: types,
      revealedColors: types,
      types,
      didReveal: types.length > 0,
    };
  }

  function cleanPieces(plate) {
    for (const [type, count] of Object.entries(plate.pieces || {})) {
      if (count <= 0) delete plate.pieces[type];
    }
  }

  function getNeighbors(index) {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const result = [];
    if (row > 0) result.push(index - BOARD_SIZE);
    if (col < BOARD_SIZE - 1) result.push(index + 1);
    if (row < BOARD_SIZE - 1) result.push(index + BOARD_SIZE);
    if (col > 0) result.push(index - 1);
    return result;
  }

  function isComplete(plate) {
    const capacity = capacityOf(plate);
    if (!plate || totalPieces(plate) !== capacity) return false;
    const types = Object.keys(plate.pieces).filter((type) => plate.pieces[type] > 0);
    return types.length === 1 && CAKE_ORDER.includes(types[0]) && plate.pieces[types[0]] === capacity;
  }

  function completionType(plate) {
    return isComplete(plate)
      ? Object.keys(plate.pieces).find((type) => plate.pieces[type] === capacityOf(plate)) || null
      : null;
  }

  function receivedKey(index, type) {
    return `${index}:${type}`;
  }

  function choosePullType(board, index, locked, received = new Set()) {
    const plate = board[index];
    if (!plate) return null;
    const capacity = capacityOf(plate);
    const free = capacity - totalPieces(plate);
    const candidateTypes = [...new Set([
      ...Object.keys(plate.pieces || {}),
      ...(plate.allowedColor ? [plate.allowedColor] : []),
    ])].filter((type) =>
      CAKE_ORDER.includes(type) && (!plate.allowedColor || plate.allowedColor === type)
    );
    const candidates = candidateTypes.map((type) => {
      const incoming = getNeighbors(index).reduce((sum, neighborIndex) => {
        if (
          locked.has(neighborIndex) ||
          !canGive(board[neighborIndex], type) ||
          received.has(receivedKey(neighborIndex, type))
        ) return sum;
        return sum + (board[neighborIndex].pieces[type] || 0);
      }, 0);
      const own = plate.pieces[type] || 0;
      const completionPossible = own + incoming >= capacity;
      const movable = completionPossible
        ? Math.min(incoming, capacity - own)
        : Math.min(incoming, free);
      return { type, incoming, own, total: own + incoming, movable };
    }).filter((candidate) => candidate.movable > 0 && candidate.own < capacity);

    candidates.sort((a, b) =>
      b.total - a.total ||
      b.incoming - a.incoming ||
      b.own - a.own ||
      CAKE_ORDER.indexOf(a.type) - CAKE_ORDER.indexOf(b.type)
    );
    return candidates[0]?.type || null;
  }

  function removeOtherPieces(plate, keepType, amount) {
    let remaining = amount;
    const removed = {};
    const types = Object.keys(plate.pieces)
      .filter((type) => type !== keepType && plate.pieces[type] > 0)
      .sort((a, b) => plate.pieces[a] - plate.pieces[b] || CAKE_ORDER.indexOf(a) - CAKE_ORDER.indexOf(b));

    for (const type of types) {
      if (remaining <= 0) break;
      const count = Math.min(plate.pieces[type], remaining);
      plate.pieces[type] -= count;
      removed[type] = (removed[type] || 0) + count;
      remaining -= count;
    }
    cleanPieces(plate);
    return removed;
  }

  function addToPlate(plate, type, count) {
    if (!canReceive(plate, type)) return 0;
    const accepted = Math.min(count, capacityOf(plate) - totalPieces(plate));
    if (accepted > 0) plate.pieces[type] = (plate.pieces[type] || 0) + accepted;
    return accepted;
  }

  function spreadPieces(board, centerIndex, displaced, origins, locked, received) {
    const moves = [];
    const recipients = [];
    const neighborOrder = getNeighbors(centerIndex);

    for (const type of CAKE_ORDER) {
      let remaining = displaced[type] || 0;
      if (!remaining) continue;

      const matching = neighborOrder
        .filter((index) =>
          !locked.has(index) &&
          board[index]?.pieces[type] > 0 &&
          canReceive(board[index], type)
        )
        .sort((a, b) => board[b].pieces[type] - board[a].pieces[type] || neighborOrder.indexOf(a) - neighborOrder.indexOf(b));
      const fallback = origins.map((origin) => origin.index)
        .filter((index, position, list) =>
          list.indexOf(index) === position &&
          !locked.has(index) &&
          canReceive(board[index], type) &&
          !matching.includes(index)
        );
      const lastResort = neighborOrder.filter((index) =>
        !locked.has(index) &&
        canReceive(board[index], type) &&
        !matching.includes(index) &&
        !fallback.includes(index)
      );

      for (const destination of [...matching, ...fallback, ...lastResort]) {
        if (remaining <= 0) break;
        const accepted = addToPlate(board[destination], type, remaining);
        if (!accepted) continue;
        remaining -= accepted;
        received.add(receivedKey(destination, type));
        moves.push({ type, count: accepted, to: destination });
        recipients.push({ index: destination, preferredType: type });
      }

      if (remaining > 0) {
        throw new Error(`조각 ${type} ${remaining}개를 이동할 공간이 없습니다.`);
      }
    }
    return { moves, recipients };
  }

  function spreadMatchingRemainders(board, sourceIndex, keepType, locked, received) {
    const source = board[sourceIndex];
    const events = [];
    const recipients = [];
    const touched = [sourceIndex];
    const neighborOrder = getNeighbors(sourceIndex);

    if (!source || source.receiveOnly) return { events, recipients, touched };

    for (const type of CAKE_ORDER) {
      if (type === keepType || !source.pieces[type]) continue;
      let remaining = source.pieces[type];
      const matching = neighborOrder
        .filter((index) =>
          !locked.has(index) &&
          board[index]?.pieces[type] > 0 &&
          canReceive(board[index], type)
        )
        .sort((a, b) => board[b].pieces[type] - board[a].pieces[type] || neighborOrder.indexOf(a) - neighborOrder.indexOf(b));
      const moves = [];

      for (const destination of matching) {
        if (remaining <= 0) break;
        const accepted = addToPlate(board[destination], type, remaining);
        if (!accepted) continue;
        source.pieces[type] -= accepted;
        remaining -= accepted;
        received.add(receivedKey(destination, type));
        moves.push({ type, count: accepted, to: destination });
        recipients.push({ index: destination, preferredType: type });
        touched.push(destination);
      }

      if (moves.length) {
        events.push({
          kind: "spread",
          source: sourceIndex,
          type,
          count: moves.reduce((sum, move) => sum + move.count, 0),
          moves,
        });
      }
    }
    cleanPieces(source);
    return { events, recipients, touched };
  }

  function consolidateLocalColors(board, centerIndex, locked) {
    const events = [];
    const touched = new Set();
    const localOrder = [centerIndex, ...getNeighbors(centerIndex)];
    const collectorByType = new Map();
    let changed = true;
    let passes = 0;

    // After the primary pull, moving one color can open room that lets another
    // split color consolidate. Repeat only inside the placed plate's local cross.
    while (changed && passes < CAKE_ORDER.length * 2) {
      changed = false;
      passes += 1;
      const localIndexes = localOrder.filter((index) =>
        board[index] && totalPieces(board[index]) > 0 && !locked.has(index) && !isComplete(board[index])
      );
      const colorTotals = Object.fromEntries(CAKE_ORDER.map((type) => [
        type,
        localIndexes.reduce((sum, index) => sum + (board[index].pieces[type] || 0), 0),
      ]));
      const colorOrder = [...CAKE_ORDER].sort((a, b) =>
        colorTotals[b] - colorTotals[a] || CAKE_ORDER.indexOf(a) - CAKE_ORDER.indexOf(b)
      );

      for (const type of colorOrder) {
        const holders = localIndexes.filter((index) => board[index]?.pieces[type] > 0 && !locked.has(index));
        const donors = holders.filter((index) => canGive(board[index], type));
        const collectorIndexes = localIndexes.filter((index) =>
          !locked.has(index) &&
          canReceive(board[index], type) &&
          (board[index]?.pieces[type] > 0 || board[index]?.allowedColor === type)
        );
        if (!donors.length || !collectorIndexes.length) continue;

        const total = donors.reduce((sum, index) => sum + board[index].pieces[type], 0);
        const collectors = collectorIndexes.map((index) => {
          const own = board[index].pieces[type] || 0;
          const free = capacityOf(board[index]) - totalPieces(board[index]);
          const donorSupply = total - (canGive(board[index], type) ? own : 0);
          const resultCount = own + Math.min(donorSupply, free);
          const otherPieces = totalPieces(board[index]) - own;
          return { index, own, free, resultCount, otherPieces };
        }).filter((candidate) => candidate.free > 0 && candidate.resultCount > candidate.own);
        collectors.sort((a, b) =>
          b.resultCount - a.resultCount ||
          a.otherPieces - b.otherPieces ||
          b.own - a.own ||
          localOrder.indexOf(a.index) - localOrder.indexOf(b.index)
        );
        let collector = null;
        const assignedIndex = collectorByType.get(type);
        if (
          assignedIndex !== undefined &&
          !locked.has(assignedIndex) &&
          board[assignedIndex] &&
          (board[assignedIndex].pieces[type] > 0 || board[assignedIndex].allowedColor === type)
        ) {
          const own = board[assignedIndex].pieces[type] || 0;
          const free = capacityOf(board[assignedIndex]) - totalPieces(board[assignedIndex]);
          const donorSupply = total - (canGive(board[assignedIndex], type) ? own : 0);
          collector = {
            index: assignedIndex,
            own,
            free,
            resultCount: own + Math.min(donorSupply, free),
            otherPieces: totalPieces(board[assignedIndex]) - own,
          };
        } else if (collectors[0]) {
          collector = collectors[0];
          collectorByType.set(type, collector.index);
        }
        if (!collector) continue;

        const sortedDonors = donors.filter((index) => index !== collector.index).sort((a, b) => {
          const otherA = totalPieces(board[a]) - board[a].pieces[type];
          const otherB = totalPieces(board[b]) - board[b].pieces[type];
          return otherB - otherA || board[b].pieces[type] - board[a].pieces[type] || localOrder.indexOf(a) - localOrder.indexOf(b);
        });

        for (const donorIndex of sortedDonors) {
          const free = capacityOf(board[collector.index]) - totalPieces(board[collector.index]);
          if (free <= 0) break;
          const count = Math.min(board[donorIndex].pieces[type], free);
          if (count <= 0) continue;
          board[donorIndex].pieces[type] -= count;
          cleanPieces(board[donorIndex]);
          board[collector.index].pieces[type] = (board[collector.index].pieces[type] || 0) + count;
          const spreadEvent = {
            kind: "spread",
            source: donorIndex,
            type,
            count,
            moves: [{ type, count, to: collector.index }],
          };
          // Arm-to-arm consolidation is caused by the newly placed center.
          // Keep that relationship as metadata so a crowded board can show a
          // clear center hand-off without changing the atomic game result.
          if (!getNeighbors(donorIndex).includes(collector.index)) {
            spreadEvent.via = centerIndex;
          }
          events.push(spreadEvent);
          touched.add(donorIndex);
          touched.add(collector.index);
          changed = true;
        }

        if (isComplete(board[collector.index])) locked.add(collector.index);
      }
    }

    return { events, touched: [...touched], safetyLimitReached: changed };
  }

  function pullType(board, index, type, locked, received) {
    const target = board[index];
    if (
      !target ||
      locked.has(index) ||
      (target.allowedColor && target.allowedColor !== type)
    ) return null;

    const sourceIndexes = getNeighbors(index).filter((neighborIndex) =>
      !locked.has(neighborIndex) &&
      canGive(board[neighborIndex], type) &&
      !received.has(receivedKey(neighborIndex, type))
    );
    // A source plate may contain several cake types. Pulling one matching type
    // must never remove the other types from that source plate.
    const sourceNonMatching = new Map(sourceIndexes.map((sourceIndex) => [
      sourceIndex,
      Object.fromEntries(Object.entries(board[sourceIndex].pieces).filter(([sourceType]) => sourceType !== type)),
    ]));
    const supply = sourceIndexes.reduce((sum, sourceIndex) => sum + board[sourceIndex].pieces[type], 0);
    const capacity = capacityOf(target);
    const own = target.pieces[type] || 0;
    const free = capacity - totalPieces(target);
    const completionPossible = own + supply >= capacity;
    const displaceable = CAKE_ORDER.reduce((sum, candidate) =>
      candidate === type ? sum : sum + (target.pieces[candidate] || 0), 0
    );
    // A newly placed plate with at least one free slot gathers the chosen type
    // up to its capacity, even when that means moving its other types aside.
    // A plate that started full may exchange pieces only to complete a cake.
    const wanted = free > 0 || completionPossible
      ? Math.min(supply, capacity - own, free + displaceable)
      : 0;
    if (wanted <= 0) return null;

    const displaced = removeOtherPieces(target, type, Math.max(0, wanted - free));
    let remaining = wanted;
    const origins = [];

    for (const sourceIndex of sourceIndexes) {
      if (remaining <= 0) break;
      const source = board[sourceIndex];
      const count = Math.min(source.pieces[type], remaining);
      source.pieces[type] -= count;
      cleanPieces(source);
      target.pieces[type] = (target.pieces[type] || 0) + count;
      received.add(receivedKey(index, type));
      origins.push({ index: sourceIndex, count });
      remaining -= count;
    }

    for (const [sourceIndex, expected] of sourceNonMatching) {
      for (const [sourceType, count] of Object.entries(expected)) {
        if (board[sourceIndex].pieces[sourceType] !== count) {
          throw new Error(`일치하지 않는 ${sourceType} 조각이 함께 이동했습니다.`);
        }
      }
    }

    const spread = spreadPieces(board, index, displaced, origins, locked, received);
    const remainderSpread = spreadMatchingRemainders(board, index, type, locked, received);
    return {
      events: [
        { kind: "pull", target: index, type, count: wanted, origins, displaced, spread: spread.moves },
        ...remainderSpread.events,
      ],
      recipients: [...spread.recipients, ...remainderSpread.recipients],
      touched: [
        index,
        ...origins.map((origin) => origin.index),
        ...spread.moves.map((move) => move.to),
        ...remainderSpread.touched,
      ],
    };
  }

  function resolveRainbowCompletions(board, centerIndex, locked) {
    const events = [];
    const touched = new Set();
    const localOrder = [centerIndex, ...getNeighbors(centerIndex)];
    let changed = true;

    while (changed) {
      changed = false;
      const availableIndexes = localOrder.filter((index) => board[index] && !locked.has(index));
      const candidates = [];

      for (const index of availableIndexes) {
        const plate = board[index];
        for (const type of CAKE_ORDER) {
          const own = plate.pieces[type] || 0;
          if (own <= 0 || (plate.allowedColor && plate.allowedColor !== type)) continue;
          const incompatible = Object.entries(plate.pieces).some(([pieceType, count]) =>
            count > 0 && pieceType !== type && pieceType !== RAINBOW_TYPE
          );
          if (incompatible) continue;
          const deficit = capacityOf(plate) - own;
          if (deficit <= 0) continue;
          const ownRainbow = plate.pieces[RAINBOW_TYPE] || 0;
          const externalRainbow = availableIndexes.reduce((sum, sourceIndex) => {
            if (sourceIndex === index || !canGive(board[sourceIndex], RAINBOW_TYPE)) return sum;
            return sum + (board[sourceIndex].pieces[RAINBOW_TYPE] || 0);
          }, 0);
          if (ownRainbow + externalRainbow < deficit) continue;
          candidates.push({ index, type, own, deficit });
        }
      }

      candidates.sort((a, b) =>
        a.deficit - b.deficit ||
        b.own - a.own ||
        CAKE_ORDER.indexOf(a.type) - CAKE_ORDER.indexOf(b.type) ||
        localOrder.indexOf(a.index) - localOrder.indexOf(b.index)
      );
      const candidate = candidates[0];
      if (!candidate) break;

      const moves = [];
      let remaining = candidate.deficit;
      const sources = [candidate.index, ...availableIndexes.filter((index) => index !== candidate.index)];
      for (const sourceIndex of sources) {
        if (remaining <= 0) break;
        const source = board[sourceIndex];
        if (!source?.pieces[RAINBOW_TYPE]) continue;
        if (sourceIndex !== candidate.index && !canGive(source, RAINBOW_TYPE)) continue;
        const count = Math.min(source.pieces[RAINBOW_TYPE], remaining);
        source.pieces[RAINBOW_TYPE] -= count;
        cleanPieces(source);
        board[candidate.index].pieces[candidate.type] =
          (board[candidate.index].pieces[candidate.type] || 0) + count;
        moves.push({
          from: sourceIndex,
          to: candidate.index,
          type: RAINBOW_TYPE,
          targetType: candidate.type,
          count,
        });
        touched.add(sourceIndex);
        touched.add(candidate.index);
        remaining -= count;
      }

      if (remaining > 0) throw new Error(`무지개 조각 ${remaining}개의 이동 출발지가 없습니다.`);
      events.push({
        kind: "wildcard",
        target: candidate.index,
        type: RAINBOW_TYPE,
        targetType: candidate.type,
        count: candidate.deficit,
        moves,
      });
      locked.add(candidate.index);
      changed = true;
    }

    return { events, touched: [...touched] };
  }

  function promoteLayer(plate) {
    if (!plate?.layers?.length) return false;
    const [nextLayer, ...remainingLayers] = plate.layers;
    plate.pieces = deepClone(nextLayer.pieces || {});
    plate.layers = deepClone(remainingLayers);
    for (const key of ["capacity", "allowedColor", "receiveOnly"]) delete plate[key];
    if (nextLayer.capacity !== undefined) plate.capacity = nextLayer.capacity;
    if (nextLayer.allowedColor !== undefined) plate.allowedColor = nextLayer.allowedColor;
    if (nextLayer.receiveOnly !== undefined) plate.receiveOnly = nextLayer.receiveOnly;
    return true;
  }

  function resolvePlacement(inputBoard, placedIndex) {
    const board = cloneBoard(inputBoard);
    const locked = new Set();
    const events = [];
    const received = new Set();
    const mysteryRevealed = [];

    if (board[placedIndex]?.hiddenColors?.length && board[placedIndex]?.pieces?.[MYSTERY_TYPE]) {
      const reveal = revealPlate(board[placedIndex]);
      board[placedIndex] = reveal.plate;
      if (reveal.didReveal) mysteryRevealed.push(placedIndex);
    }

    // Only the newly placed plate initiates sorting. Its four direct neighbors
    // may receive pieces, but they do not start another pull from a second ring.
    const type = choosePullType(board, placedIndex, locked, received);
    const result = type ? pullType(board, placedIndex, type, locked, received) : null;
    if (result) {
      events.push(...result.events);

      const uniqueTouched = [...new Set(result.touched)];
      for (const touchedIndex of uniqueTouched) {
        if (isComplete(board[touchedIndex])) locked.add(touchedIndex);
      }
    }

    const consolidation = consolidateLocalColors(board, placedIndex, locked);
    events.push(...consolidation.events);
    for (const touchedIndex of consolidation.touched) {
      if (isComplete(board[touchedIndex])) locked.add(touchedIndex);
    }

    // Rainbow slices never participate in ordinary sorting. Once all normal
    // movement has settled, they fill only an exact remaining deficit.
    const rainbow = resolveRainbowCompletions(board, placedIndex, locked);
    events.push(...rainbow.events);

    for (const index of [placedIndex, ...getNeighbors(placedIndex)]) {
      if (isComplete(board[index])) locked.add(index);
    }

    const completed = [];
    const completionEvents = [];
    const layerRevealed = [];
    for (const index of locked) {
      const plate = board[index];
      const type = completionType(plate);
      if (!type) continue;
      const layered = Boolean(plate.layers?.length);
      completionEvents.push({
        index,
        type,
        capacity: capacityOf(plate),
        layered,
        removed: !layered,
      });
      if (layered) layerRevealed.push(index);
      else completed.push(index);
    }
    completed.sort((a, b) => a - b);
    const emptied = [];
    for (let index = 0; index < board.length; index += 1) {
      if (
        board[index] &&
        totalPieces(board[index]) === 0 &&
        !board[index].receiveOnly &&
        !board[index].layers?.length
      ) emptied.push(index);
    }
    const settledBoard = cloneBoard(board);
    for (const index of layerRevealed) promoteLayer(board[index]);
    for (const index of [...completed, ...emptied]) board[index] = null;
    const removed = [...new Set([...completed, ...emptied])].sort((a, b) => a - b);

    return {
      board,
      settledBoard,
      events,
      completionEvents,
      completed,
      emptied,
      removed,
      revealed: layerRevealed,
      mysteryRevealed,
      layerRevealed,
      safetyLimitReached: consolidation.safetyLimitReached,
    };
  }

  function buildAnimationSteps(events) {
    const steps = [];
    for (const event of events) {
      if (event.kind === "wildcard") {
        for (const move of event.moves) {
          for (let count = 0; count < move.count; count += 1) {
            steps.push({
              from: move.from,
              to: move.to,
              type: move.type,
              targetType: move.targetType,
              displaced: null,
            });
          }
        }
        continue;
      }
      if (event.kind === "spread") {
        for (const move of event.moves) {
          for (let count = 0; count < move.count; count += 1) {
            steps.push({ from: event.source, to: move.to, type: event.type, displaced: null });
          }
        }
        continue;
      }
      const origins = event.origins.flatMap((origin) =>
        Array.from({ length: origin.count }, () => origin.index)
      );
      const displaced = CAKE_ORDER.flatMap((type) =>
        Array.from({ length: event.displaced[type] || 0 }, () => type)
      );
      const destinations = event.spread.flatMap((move) =>
        Array.from({ length: move.count }, () => ({ type: move.type, to: move.to }))
      );

      for (const origin of origins) {
        const displacedType = displaced.shift() || null;
        let displacedMove = null;
        if (displacedType) {
          const destinationIndex = destinations.findIndex((move) => move.type === displacedType);
          if (destinationIndex < 0) throw new Error(`${displacedType} 조각의 이동 목적지가 없습니다.`);
          const destination = destinations.splice(destinationIndex, 1)[0];
          displacedMove = { from: event.target, to: destination.to, type: displacedType };
        }
        steps.push({ from: origin, to: event.target, type: event.type, displaced: displacedMove });
      }
    }
    return steps;
  }

  function buildAnimationBatches(events) {
    return events.map((event) => {
      const transfers = event.kind === "wildcard"
        ? event.moves.map((move) => ({ ...move }))
        : event.kind === "spread"
        ? event.moves.map((move) => ({
          from: event.source,
          to: move.to,
          type: event.type,
          count: move.count,
          ...(event.via === undefined ? {} : { via: event.via }),
        }))
        : [
          ...event.origins.map((origin) => ({
            from: origin.index,
            to: event.target,
            type: event.type,
            count: origin.count,
          })),
          ...event.spread.map((move) => ({
            from: event.target,
            to: move.to,
            type: move.type,
            count: move.count,
          })),
        ];
      const grouped = [];
      for (const transfer of transfers) {
        const existing = grouped.find((candidate) =>
          candidate.from === transfer.from &&
          candidate.to === transfer.to &&
          candidate.type === transfer.type &&
          candidate.targetType === transfer.targetType &&
          candidate.via === transfer.via
        );
        if (existing) existing.count += transfer.count;
        else grouped.push({ ...transfer });
      }
      return grouped;
    }).filter((batch) => batch.length > 0);
  }

  return {
    BOARD_SIZE,
    PLATE_CAPACITY,
    CAKE_ORDER,
    RAINBOW_TYPE,
    MYSTERY_TYPE,
    deepClone,
    capacityOf,
    totalPieces,
    cloneBoard,
    canReceive,
    canGive,
    revealPlate,
    getNeighbors,
    isComplete,
    completionType,
    choosePullType,
    consolidateLocalColors,
    resolveRainbowCompletions,
    resolvePlacement,
    buildAnimationBatches,
    buildAnimationSteps,
  };
});
