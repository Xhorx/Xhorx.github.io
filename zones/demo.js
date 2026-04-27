/************************************************************
 * 1. Basic game settings
 ************************************************************/

// The board is 7×7 and the game ends after 15 rounds.
const BOARD_SIZE = 7;
const MAX_ROUNDS = 15;

// The number of ZONE cards.
const PUBLIC_NORMAL_COUNT = 3;
const PUBLIC_SHADOW_COUNT = 2;

/************************************************************
 * 2. Player data
 ************************************************************/

// Each player has an id, display name, CSS class, scores, and redeemed cards.
const players = [
  { id: 0, name: "Ventrix", css: "ventrix", tempScore: 0, zoneScore: 0, lastPower: 0, redeemed: [] },
  { id: 1, name: "Gemsdig", css: "gemsdig", tempScore: 0, zoneScore: 0, lastPower: 0, redeemed: [] },
];

/************************************************************
 * 3. Public ZONE card piles
 ************************************************************/

// own = cells that must be occupied by the current player.
// enemy = cells that must be occupied by the opponent.
// Coordinates are shape coordinates, not fixed board coordinates.
// The matching code later tries all translations and rotations.
const cardPiles = {
  normal: [
    {
      id: "tank",
      title: "TANK",
      points: 5,
      kind: "normal",
      description: "+5 pts if you occupy the TANK shape. Rotations allowed, mirror images not allowed.",
      own: [[0,0], [0,1], [1,1], [1,2], [2,0], [2,1]],
      enemy: [],
      removeOnRedeem: false,
    },
    {
      id: "tankRemoval",
      // baseId: "tank",
      title: "TANK (REMOVAL)",
      points: 13,
      kind: "normal",
      description: "+13 pts if you currently occupy a TANK shape. Removes those TANK tiles.",
      own: [[0,0], [0,1], [1,1], [1,2], [2,0], [2,1]],
      enemy: [],
      removeOnRedeem: true,
    },
    {
      id: "star",
      title: "STAR",
      points: 5,
      kind: "normal",
      description: "+5 pts if you occupy the four arms of STAR and the center is empty.",
      own: [[0,1], [1,0], [1,2], [2,1]],
      enemy: [],
      empty: [[1,1]],
      removeOnRedeem: false,
    },
    {
      id: "starRemoval",
      title: "STAR (REMOVAL)",
      points: 10,
      kind: "normal",
      description: "+10 pts if you have the STAR shape. The center must be empty. Removes the four occupied STAR tiles.",
      own: [[0,1], [1,0], [1,2], [2,1]],
      enemy: [],
      empty: [[1,1]],
      removeOnRedeem: true,
    },
    {
      id: "rtni",
      title: "RTNI",
      points: 5,
      kind: "normal",
      description: "+5 pts if you occupy the RTNI shape.",
      own: [[0,2], [0,3], [1,1], [1,2], [2,0], [2,1]],
      enemy: [],
      empty: [],
      removeOnRedeem: false,
    },
    {
      id: "rtniRemoval",
      title: "RTNI (REMOVAL)",
      points: 13,
      kind: "normal",
      description: "+13 pts if you have the RTNI shape. Removes those RTNI tiles.",
      own: [[0,2], [0,3], [1,1], [1,2], [2,0], [2,1]],
      enemy: [],
      empty: [],
      removeOnRedeem: true,
    },
    {
      id: "angl",
      title: "ANGL",
      points: 4,
      kind: "normal",
      description: "+4 pts if you occupy the ANGL shape.",
      own: [[0,0], [1,1], [2,0], [2,1], [2,2]],
      enemy: [],
      empty: [],
      removeOnRedeem: false,
    },
    {
      id: "anglRemoval",
      title: "ANGL (REMOVAL)",
      points: 11,
      kind: "normal",
      description: "+11 pts if you have the ANGL shape. Removes those ANGL tiles.",
      own: [[0,0], [1,1], [2,0], [2,1], [2,2]],
      enemy: [],
      empty: [],
      removeOnRedeem: true,
    },
    {
      id: "ufot",
      title: "UFOT",
      points: 4,
      kind: "normal",
      description: "+4 pts if you occupy the UFOT shape.",
      own: [[0,1], [1,0], [1,1], [1,2], [3,1]],
      enemy: [],
      empty: [],
      removeOnRedeem: false,
    },
    {
      id: "ufotRemoval",
      title: "UFOT (REMOVAL)",
      points: 11,
      kind: "normal",
      description: "+11 pts if you have the UFOT shape. Removes those UFOT tiles.",
      own: [[0,1], [1,0], [1,1], [1,2], [3,1]],
      enemy: [],
      empty: [],
      removeOnRedeem: true,
    },
  ],
  shadow: [
    {
      id: "dblp",
      title: "DBLP",
      points: 10,
      kind: "shadow",
      description: "+10 pts if your 4 tiles and the enemy's 4 tiles form the DBLP shadowed shape.",
      own: [[0,2], [0,4], [1,2], [1,3]],
      enemy: [[3,0], [2,1], [2,2], [3,2]],
      removeOnRedeem: false,
    },
    {
      id: "dblpRemoval",
      // baseId: "dblp",
      title: "DBLP (REMOVAL)",
      points: 14,
      kind: "shadow",
      description: "+14 pts if you already have DBLP and the DBLP shape exists. Removes all 8 tiles in the shape.",
      own: [[0,2], [0,4], [1,2], [1,3]],
      enemy: [[3,0], [2,1], [2,2], [3,2]],
      removeOnRedeem: true,
    },
  ],
};

/************************************************************
 * 4. Game state variables
 ************************************************************/

// These variables change as the game progresses.
let board;
let hotZones;
let round;
let turnOrder;
let turnIndex;
let currentAction;
let selectedCells;
let actionDone;
let gameOver;
let availableCards;
let redeemDone;
let redeemMode;
let pendingRedeem;
let logEntries;
let previewCells;

/************************************************************
 * 5. HTML element shortcuts
 ************************************************************/

// Instead of repeatedly writing document.getElementById(...),
// we store all important page elements in this object.
const els = {
  board: document.getElementById("board"),
  roundLabel: document.getElementById("roundLabel"),
  turnOrderLabel: document.getElementById("turnOrderLabel"),
  activePlayerLabel: document.getElementById("activePlayerLabel"),
  activeHint: document.getElementById("activeHint"),
  actionLabel: document.getElementById("actionLabel"),
  selectionLabel: document.getElementById("selectionLabel"),
  hotZoneLabel: document.getElementById("hotZoneLabel"),
  occupyBox: document.getElementById("occupyBox"),
  tiltBox: document.getElementById("tiltBox"),
  occupyBtn: document.getElementById("occupyBtn"),
  confirmOccupyBtn: document.getElementById("confirmOccupyBtn"),
  clearSelectBtn: document.getElementById("clearSelectBtn"),
  tiltBtn: document.getElementById("tiltBtn"),
  confirmTiltBtn: document.getElementById("confirmTiltBtn"),
  redeemCardBtn: document.getElementById("redeemCardBtn"),
  endTurnBtn: document.getElementById("endTurnBtn"),
  restartBtn: document.getElementById("restartBtn"),
  scoreGrid: document.getElementById("scoreGrid"),
  normalCard: document.getElementById("normalCard"),
  shadowCard: document.getElementById("shadowCard"),
  redeemedList: document.getElementById("redeemedList"),
  log: document.getElementById("log"),
  finalPanel: document.getElementById("finalPanel"),
};

/************************************************************
 * 6. Small helper functions
 ************************************************************/

// Convert row/column into a string key, useful for JavaScript Sets.
function keyOf(r, c) {
  return `${r},${c}`;
}

// Convert a string key like "2,5" back into [2, 5].
function parseKey(key) {
  return key.split(",").map(Number);
}

// Return the player whose turn it currently is.
function currentPlayer() {
  return players[turnOrder[turnIndex]];
}

// In this 2-player demo, the enemy is simply the other player.
function enemyOf(playerId) {
  return playerId === 0 ? 1 : 0;
}

// Create a 7×7 array filled with null, meaning every cell is empty.
function makeEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

// Add a message to the top of the game log.
function addLog(text) {
  logEntries.unshift(text);
  logEntries = logEntries.slice(0, 80);
}

function shuffledCopy(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

/************************************************************
 * 7. Game setup and round/hot-zone logic
 ************************************************************/

// Reset everything and start a new game.
function initGame() {
  board = makeEmptyBoard();
  hotZones = new Set();
  round = 1;
  turnOrder = [0, 1];
  turnIndex = 0;
  currentAction = "occupy";
  selectedCells = new Set();
  previewCells = new Set();
  actionDone = false;
  gameOver = false;
  availableCards = {
    normal: shuffledCopy(cardPiles.normal),
    shadow: shuffledCopy(cardPiles.shadow),
  };
  redeemDone = false;
  redeemMode = false;
  pendingRedeem = null;
  logEntries = [];

  for (const player of players) {
    player.tempScore = 0;
    player.zoneScore = 0;
    player.lastPower = 0;
    player.redeemed = [];
  }

  generateHotZones();
  addLog("Game started. Initial 3 hot-zone tiles generated.");
  render();
}

// Add 3 new hot-zone tiles. Old hot zones stay on the board.
function generateHotZones() {
  const targetSize = Math.min(BOARD_SIZE * BOARD_SIZE, hotZones.size + 3);
  while (hotZones.size < targetSize) {
    const r = Math.floor(Math.random() * BOARD_SIZE);
    const c = Math.floor(Math.random() * BOARD_SIZE);
    hotZones.add(keyOf(r, c));
  }
}

// Every occupied hot zone gives +2 temporary score to its owner.
function scoreHotZones() {
  let parts = [];
  for (const key of hotZones) {
    const [r, c] = parseKey(key);
    const owner = board[r][c];
    if (owner !== null) {
      players[owner].tempScore += 2;
      parts.push(`${players[owner].name} +2`);
    }
  }
  if (parts.length === 0) {
    addLog(`Round ${round} hot-zone scoring: no occupied hot zones.`);
  } else {
    addLog(`Round ${round} hot-zone scoring: ${parts.join(", ")}.`);
  }
}

/************************************************************
 * 8. Player actions: Occupy and Tilt
 ************************************************************/

// Called when the player clicks "Choose Occupy" or "Choose Tilt".
function chooseAction(action) {
  if (gameOver || actionDone) return;
  currentAction = action;
  selectedCells.clear();
  redeemMode = false;
  pendingRedeem = null;
  // If the player starts choosing an action, remove any old redeem-choice UI.
  previewCells.clear();
  render();
}

// Called whenever the player clicks a board cell.
// What it does depends on the currently selected action.
function handleCellClick(r, c) {
  if (gameOver || actionDone || !currentAction) return;
  const player = currentPlayer();
  const key = keyOf(r, c);

  if (currentAction === "occupy") {
    if (board[r][c] !== null) return;
    if (selectedCells.has(key)) {
      selectedCells.delete(key);
    } else if (selectedCells.size < 3) {
      selectedCells.add(key);
    }
  }

  if (currentAction === "tilt") {
    if (board[r][c] !== enemyOf(player.id)) return;
    selectedCells.clear();
    selectedCells.add(key);
  }

  render();
}

// Apply the Occupy action to the selected empty cells.
function confirmOccupy() {
  if (gameOver || actionDone || currentAction !== "occupy") return;
  const player = currentPlayer();
  for (const key of selectedCells) {
    const [r, c] = parseKey(key);
    board[r][c] = player.id;
  }
  player.lastPower = selectedCells.size;
  addLog(`${player.name} occupied ${selectedCells.size} tile${selectedCells.size === 1 ? "" : "s"}. Power spent: ${player.lastPower}.`);
  finishAction();
}

// Apply the Tilt action to at most one selected enemy cell.
function confirmTilt() {
  if (gameOver || actionDone || currentAction !== "tilt") return;
  const player = currentPlayer();
  if (selectedCells.size === 1) {
    const [r, c] = parseKey([...selectedCells][0]);
    board[r][c] = player.id;
    addLog(`${player.name} tilted 1 enemy tile. Power spent: 2.`);
  } else {
    addLog(`${player.name} chose Tilt but converted no tile. Power spent: 2.`);
  }
  player.lastPower = 2;
  finishAction();
}

// Mark that this player has completed their one action for the turn.
function finishAction() {
  actionDone = true;
  currentAction = null;
  selectedCells.clear();
  redeemMode = false;
  pendingRedeem = null;
  previewCells.clear();
  render();
}

// Move from one player to the next player, or finish the round.
function endTurn() {
  if (gameOver || !actionDone) return;
  turnIndex += 1;
  currentAction = "occupy";
  selectedCells.clear();

  // Clear any unfinished ZONE-card choice UI from the previous player.
  previewCells.clear();
  actionDone = false;
  redeemDone = false;
  redeemMode = false;
  pendingRedeem = null;
  if (turnIndex >= turnOrder.length) {
    finishRound();
  }

  if (gameOver) {
    currentAction = null;
  }

  render();
}

// End-of-round logic: hot-zone scoring, new hot zones, game over, and next turn order.
function finishRound() {
  if (round % 5 === 0) {
    scoreHotZones();
    if (round < MAX_ROUNDS) {
      generateHotZones();
      addLog(`3 more hot-zone tiles were generated for rounds ${round + 1}-${Math.min(round + 5, MAX_ROUNDS)}.`);
    }
  }

  if (round >= MAX_ROUNDS) {
    gameOver = true;
    addLog("Game over. Final score = final board tiles + temporary score + redeemed ZONE card points.");
    return;
  }

  const oldOrder = [...turnOrder];
  turnOrder = [...turnOrder].sort((a, b) => {
    const diff = players[a].lastPower - players[b].lastPower;
    if (diff !== 0) return diff;
    return oldOrder.indexOf(a) - oldOrder.indexOf(b);
  });
  round += 1;
  turnIndex = 0;
  addLog(`Round ${round} begins. Turn order: ${turnOrder.map(id => players[id].name).join(" → ")}.`);
}

/************************************************************
 * 9. ZONE card shape matching
 ************************************************************/

// Rotate a shape coordinate by 0, 90, 180, or 270 degrees.
// This allows rotations but not mirror images.
function transformPoint(point, rotation) {
  const [r, c] = point;
  if (rotation === 0) return [r, c];
  if (rotation === 1) return [c, -r];
  if (rotation === 2) return [-r, -c];
  return [-c, r];
}

// Generate all distinct rotated versions of a card shape.
function orientationsFor(card) {
  const rawCells = [
    ...card.own.map(p => ({ type: "own", point: p })),
    ...card.enemy.map(p => ({ type: "enemy", point: p })),
    ...(card.empty ?? []).map(p => ({ type: "empty", point: p })),
  ];
  const seen = new Set();
  const result = [];

  for (let rot = 0; rot < 4; rot++) {
    let cells = rawCells.map(cell => {
      const [r, c] = transformPoint(cell.point, rot);
      return { type: cell.type, r, c };
    });
    const minR = Math.min(...cells.map(cell => cell.r));
    const minC = Math.min(...cells.map(cell => cell.c));
    cells = cells.map(cell => ({ ...cell, r: cell.r - minR, c: cell.c - minC }));
    cells.sort((a, b) => a.r - b.r || a.c - b.c || a.type.localeCompare(b.type));
    const signature = cells.map(cell => `${cell.type}:${cell.r},${cell.c}`).join("|");
    if (!seen.has(signature)) {
      seen.add(signature);
      result.push(cells);
    }
  }
  return result;
}

// Search the board for a matching shapes for the given player.
function findMatches(card, playerId) {
  if (card.baseId && !players[playerId].redeemed.includes(card.baseId)) {
    return [];
  }

  const enemyId = enemyOf(playerId);
  const matches = [];
  const seenMatches = new Set();

  for (const orientation of orientationsFor(card)) {
    const maxR = Math.max(...orientation.map(cell => cell.r));
    const maxC = Math.max(...orientation.map(cell => cell.c));

    for (let anchorR = 0; anchorR <= BOARD_SIZE - 1 - maxR; anchorR++) {
      for (let anchorC = 0; anchorC <= BOARD_SIZE - 1 - maxC; anchorC++) {
        let ok = true;
        const matched = [];

        for (const cell of orientation) {
          const r = anchorR + cell.r;
          const c = anchorC + cell.c;
          let expectedOwner;

          if (cell.type === "own") {
            expectedOwner = playerId;
          } else if (cell.type === "enemy") {
            expectedOwner = enemyId;
          } else {
            expectedOwner = null;
          }

          if (board[r][c] !== expectedOwner) {
            ok = false;
            break;
          }

          matched.push({ r, c, type: cell.type });
        }

        if (ok) {
          const signature = matched
            .map(cell => `${cell.r},${cell.c}`)
            .sort()
            .join("|");

          if (!seenMatches.has(signature)) {
            seenMatches.add(signature);
            matches.push(matched);
          }
        }
      }
    }
  }

  return matches;
}

// The public card is the first remaining card in that pile.
function publicCardCount(kind) {
  return kind === "normal" ? PUBLIC_NORMAL_COUNT : PUBLIC_SHADOW_COUNT;
}

function publicCards(kind) {
  return availableCards[kind].slice(0, publicCardCount(kind));
}

function hasAnyPublicCard() {
  return publicCards("normal").length > 0 || publicCards("shadow").length > 0;
}

// After redemption, remove that public card permanently.
function removeRedeemedCard(kind, card) {
  const index = availableCards[kind].findIndex(candidate => candidate.id === card.id);

  if (index !== -1) {
    availableCards[kind].splice(index, 1);
  }
}

// Try to redeem one normal or shadowed ZONE card.
// redeemDone enforces the rule: at most one redemption per turn.

function previewMatchedShape(matched) {
  previewCells = new Set(matched.map(cell => keyOf(cell.r, cell.c)));

  // We only need to redraw the board, not the whole page.
  // This keeps the choice buttons from being rebuilt.
  renderBoard();
}

function completeRedeem(kind, card, player, matched) {
  player.zoneScore += card.points;
  player.redeemed.push(card.id);
  redeemDone = true;
  if (card.removeOnRedeem) {
    let removedCount = 0;
    for (const cell of matched) {
      // Empty requirement cells are part of the shape check,
      // but they are not occupied tiles and should not be counted as removed.
      if (cell.type !== "empty") {
        board[cell.r][cell.c] = null;
        removedCount += 1;
      }
    }

    addLog(`${player.name} redeemed ${card.title} for +${card.points} pts and removed ${removedCount} tile${removedCount === 1 ? "" : "s"}.`);
  } else {
    addLog(`${player.name} redeemed ${card.title} for +${card.points} pts.`);
  }

  removeRedeemedCard(kind, card);
  // After redemption, clear the choice UI and remove the preview highlight.
  redeemMode = false;
  pendingRedeem = null;
  previewCells.clear();
  render();
}

function isPendingRedeemCard(kind, card) {
  return (
    pendingRedeem &&
    pendingRedeem.kind === kind &&
    pendingRedeem.cardId === card.id
  );
}

function setPendingRedeemLocation(index) {
  if (!pendingRedeem) return;

  pendingRedeem.selectedIndex = index;
  previewMatchedShape(pendingRedeem.matches[index]);

  // Re-render cards so the selected radio row updates.
  renderCards();
}

function renderInlineRedeemPanel(card, kind) {
  if (!isPendingRedeemCard(kind, card)) {
    return null;
  }

  const panel = document.createElement("div");
  panel.className = "inline-redeem-panel";

  const title = document.createElement("p");
  title.className = "help";
  title.innerHTML = `<strong>${card.title}</strong> selected.`;

  panel.appendChild(title);

  // Only removal cards need a location list.
  // Non-removal cards just show the confirm button.
  if (card.removeOnRedeem) {
    const list = document.createElement("div");
    list.className = "redeem-location-list";

    pendingRedeem.matches.forEach((matched, index) => {
      const row = document.createElement("label");
      row.className = "redeem-location-row";
      row.classList.toggle("is-previewing", index === pendingRedeem.selectedIndex);

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `redeemLocation-${card.id}`;
      radio.checked = index === pendingRedeem.selectedIndex;

      const text = document.createElement("span");
      text.textContent = `Location ${index + 1}: ${matched.map(cell => {
        const extra = cell.type === "empty" ? " empty" : "";
        return `(${cell.r},${cell.c}${extra})`;
      }).join(" ")}`;

      row.appendChild(radio);
      row.appendChild(text);

      row.addEventListener("click", event => {
        event.stopPropagation();
        setPendingRedeemLocation(index);
      });

      row.addEventListener("mouseenter", () => {
        previewMatchedShape(matched);
      });

      list.appendChild(row);
    });

    panel.appendChild(list);
  }

  const confirmButton = document.createElement("button");
  confirmButton.className = "redeem-confirm-btn";
  confirmButton.textContent = `Confirm Redeem ${card.title}`;

  confirmButton.addEventListener("click", event => {
    event.stopPropagation();

    const player = currentPlayer();
    const selectedMatch = pendingRedeem.matches[pendingRedeem.selectedIndex];

    completeRedeem(kind, card, player, selectedMatch);
  });

  panel.appendChild(confirmButton);

  return panel;
}

function redeem() {
  if (gameOver || redeemDone) return;

  redeemMode = true;
  pendingRedeem = null;
  selectedCells.clear();
  previewCells.clear();

  addLog("Pick a public ZONE card that you want to redeem.");

  render();
}

function selectRedeemCard(kind, card) {
  if (gameOver || redeemDone || !redeemMode) return;

  const player = currentPlayer();
  const matches = findMatches(card, player.id);

  if (matches.length === 0) {
    addLog(`${player.name} cannot redeem ${card.title} because no matching shape exists.`);
    render();
    return;
  }
  pendingRedeem = {
    kind,
    cardId: card.id,
    matches,
    selectedIndex: 0,
  };

  // Preview the first possible location by default.
  previewCells = new Set(matches[0].map(cell => keyOf(cell.r, cell.c)));

  addLog(`${player.name} selected ${card.title}. Confirm inside the selected card.`);

  render();
}

/************************************************************
 * 10. Scoring helpers
 ************************************************************/

function clearSelection() {
  selectedCells.clear();
  render();
}

// Count how many board cells are occupied by one player.
function boardTileCount(playerId) {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === playerId) count++;
    }
  }
  return count;
}

// Final/current score = board tiles + temporary hot-zone score + ZONE card score.
function bankedScore(player) {
  return player.tempScore + player.zoneScore;
}

function totalScore(player) {
  return boardTileCount(player.id) + player.tempScore + player.zoneScore;
}

/************************************************************
 * 11. Rendering: update the visible page from game state
 ************************************************************/

// Rebuild the 7×7 board in HTML.
function renderBoard() {
  els.board.innerHTML = "";
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      const owner = board[r][c];
      if (owner !== null) cell.classList.add(players[owner].css);
      if (hotZones.has(keyOf(r, c))) cell.classList.add("hot");
      if (selectedCells.has(keyOf(r, c))) cell.classList.add("selected");
      if (previewCells.has(keyOf(r, c))) cell.classList.add("match-preview");
      cell.title = `(${r}, ${c})${owner !== null ? " · " + players[owner].name : ""}${hotZones.has(keyOf(r, c)) ? " · hot zone" : ""}`;
      cell.addEventListener("click", () => handleCellClick(r, c));
      els.board.appendChild(cell);
    }
  }
}

// Update the four status boxes above the board.
function renderStatus() {
  const player = currentPlayer();
  els.roundLabel.textContent = gameOver ? "Game over" : `Round ${round} / ${MAX_ROUNDS}`;
  els.turnOrderLabel.textContent = `Order: ${turnOrder.map(id => players[id].name).join(" → ")}`;
  els.activePlayerLabel.textContent = gameOver ? winnerText() : `${player.name} turn`;
  els.activeHint.textContent = gameOver
    ? "Refresh or restart to play again."
    : redeemDone
      ? "ZONE card redeemed this turn. Complete/end your action."
      : actionDone
        ? "Action completed. You may redeem one card, then end turn."
        : "Occupy is selected by default. Click empty cells, or choose Tilt instead.";

  if (!currentAction) {
    els.actionLabel.textContent = actionDone ? "Action completed" : "No action selected";
  } else {
    els.actionLabel.textContent = currentAction === "occupy" ? "Occupy selected" : "Tilt selected";
  }

  if (currentAction === "occupy") {
    els.selectionLabel.textContent = `${selectedCells.size}/3 empty cells selected.`;
  } else if (currentAction === "tilt") {
    els.selectionLabel.textContent = `${selectedCells.size}/1 enemy tile selected.`;
  } else {
    els.selectionLabel.textContent = actionDone ? `Power spent: ${player.lastPower}.` : "Select Occupy or Tilt.";
  }

  els.hotZoneLabel.textContent = `${hotZones.size} tiles marked ★. Scored after rounds 5, 10, and 15.`;
}

// Enable/disable buttons depending on what the player is allowed to do now.
function renderButtons() {
  const canAct = !gameOver && !actionDone;

  // Disable the button for the action that is already selected.
  // The other action button is still clickable, so the player can switch actions.
  els.occupyBtn.disabled = !canAct || currentAction === "occupy";
  els.tiltBtn.disabled = !canAct || currentAction === "tilt";

  els.confirmOccupyBtn.disabled = !(canAct && currentAction === "occupy");
  els.confirmTiltBtn.disabled = !(canAct && currentAction === "tilt");
  // els.clearSelectBtn.disabled = !(canAct && selectedCells.size > 0);
  els.endTurnBtn.disabled = gameOver || !actionDone;
  els.redeemCardBtn.disabled = gameOver || redeemDone || redeemMode || !hasAnyPublicCard();
  els.occupyBox.classList.toggle("active-action", currentAction === "occupy");
  els.tiltBox.classList.toggle("active-action", currentAction === "tilt");
}

// Update the score panel.
function renderScores() {
  els.scoreGrid.innerHTML = "";

  for (const player of players) {
    const occupied = boardTileCount(player.id);
    const banked = bankedScore(player);
    const finalPreview = totalScore(player);

    const row = document.createElement("div");
    row.className = "player-score";

    row.innerHTML = `
      <div class="swatch ${player.css}"></div>
      <div>
        <strong>${player.name}</strong>
        <div class="score-small">Current score: ${banked}</div>
        <div class="score-small">Occupied tiles: ${occupied} / final-board bonus</div>
        <div class="score-small">Final-score preview: ${finalPreview}</div>
      </div>
      <strong>${banked}</strong>
    `;

    els.scoreGrid.appendChild(row);
  }

  els.finalPanel.classList.toggle("game-over", gameOver);
}

// Update one public card box.
function renderCardElement(card, kind) {
  const cardEl = document.createElement("div");

  cardEl.className = `zone-card${kind === "shadow" ? " shadowed" : ""}`;

  const player = currentPlayer();
  const matches = findMatches(card, player.id);
  const canRedeemThisCard = matches.length > 0;

  if (redeemMode) {
    cardEl.classList.add("pick-mode");

    if (canRedeemThisCard) {
      cardEl.classList.add("redeemable-card", "card-clickable");
      cardEl.title = "Click to choose this card for redemption.";

      cardEl.addEventListener("click", () => {
        selectRedeemCard(kind, card);
      });
    } else {
      cardEl.classList.add("unredeemable-card");
      cardEl.title = "You cannot currently redeem this card.";
    }
  }

  const baseText = card.baseId
    ? `<p><strong>Requirement:</strong> player has already redeemed ${card.baseId.toUpperCase()}.</p>`
    : "";

  cardEl.innerHTML = `
    <h4>${card.title} · +${card.points} pts</h4>
    <p>${card.description}</p>
    ${baseText}
  `;

  if (isPendingRedeemCard(kind, card)) {
    cardEl.classList.add("selected-redeem-card");

    const inlinePanel = renderInlineRedeemPanel(card, kind);
    if (inlinePanel) {
      cardEl.appendChild(inlinePanel);
    }
  }

  return cardEl;
}

function renderCardList(el, kind) {
  const cards = publicCards(kind);

  el.innerHTML = "";

  if (cards.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = `zone-card${kind === "shadow" ? " shadowed" : ""}`;
    emptyCard.innerHTML = `
      <h4>No cards left</h4>
      <p>This public ZONE pile has been exhausted.</p>
    `;
    el.appendChild(emptyCard);
    return;
  }

  for (const card of cards) {
    el.appendChild(renderCardElement(card, kind));
  }
}

function renderCards() {
  renderCardList(els.normalCard, "normal");
  renderCardList(els.shadowCard, "shadow");
}

// Show which cards each player has redeemed.
function renderRedeemed() {
  const lines = players.map(player => {
    if (player.redeemed.length === 0) {
      return `<strong>${player.name}:</strong> none<br><span class="score-small">ZONE card score: 0</span>`;
    }

    const cards = player.redeemed
      .map(id => cardById(id))
      .filter(card => card !== null);

    const names = cards
      .map(card => `${card.title} (+${card.points})`)
      .join(", ");

    return `
      <strong>${player.name}:</strong> ${names}
      <br>
      <span class="score-small">ZONE card score: ${player.zoneScore}</span>
    `;
  });

  els.redeemedList.innerHTML = lines.join("<br><br>");
}


// Convert an internal card id like "tankRemoval" into a display title.
function cardById(id) {
  const allCards = [...cardPiles.normal, ...cardPiles.shadow];
  return allCards.find(card => card.id === id) ?? null;
}

// Update the game log panel.
function renderLog() {
  els.log.innerHTML = logEntries.map(entry => `<div class="log-entry">${entry}</div>`).join("");
}

// Decide who is currently winning after the game ends.
function winnerText() {
  const a = totalScore(players[0]);
  const b = totalScore(players[1]);
  if (a === b) return `Tie: ${a}-${b}`;
  return a > b ? `${players[0].name} wins` : `${players[1].name} wins`;
}

// Main render function: whenever game state changes, call this.
function render() {
  renderBoard();
  renderStatus();
  renderButtons();
  renderScores();
  renderCards();
  renderRedeemed();
  renderLog();
}

/************************************************************
 * 12. Button click listeners
 ************************************************************/

// These lines connect HTML buttons to JavaScript functions.
els.occupyBtn.addEventListener("click", () => chooseAction("occupy"));
els.tiltBtn.addEventListener("click", () => chooseAction("tilt"));
els.confirmOccupyBtn.addEventListener("click", confirmOccupy);
els.confirmTiltBtn.addEventListener("click", confirmTilt);
// els.clearSelectBtn.addEventListener("click", clearSelection);
els.endTurnBtn.addEventListener("click", endTurn);
els.restartBtn.addEventListener("click", initGame);
els.redeemCardBtn.addEventListener("click", redeem);

// Start the first game as soon as the script loads.
initGame();