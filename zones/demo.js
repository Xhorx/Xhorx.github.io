    /************************************************************
     * 1. Basic game settings
     ************************************************************/

    // The board is 7×7 and the game ends after 15 rounds.
    const BOARD_SIZE = 7;
    const MAX_ROUNDS = 15;

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
      redeemNormalBtn: document.getElementById("redeemNormalBtn"),
      redeemShadowBtn: document.getElementById("redeemShadowBtn"),
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
      currentAction = null;
      selectedCells = new Set();
      previewCells = new Set();
      actionDone = false;
      gameOver = false;
      availableCards = {
        normal: [...cardPiles.normal],
        shadow: [...cardPiles.shadow],
      };
      redeemDone = false;
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
      if (gameOver || actionDone || currentAction !== "occupy" || selectedCells.size < 1) return;
      const player = currentPlayer();
      for (const key of selectedCells) {
        const [r, c] = parseKey(key);
        board[r][c] = player.id;
      }
      player.lastPower = selectedCells.size;
      addLog(`${player.name} occupied ${selectedCells.size} tile${selectedCells.size > 1 ? "s" : ""}. Power spent: ${player.lastPower}.`);
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
      previewCells.clear();
      render();
    }

    // Move from one player to the next player, or finish the round.
    function endTurn() {
      if (gameOver || !actionDone) return;
      turnIndex += 1;
      currentAction = null;
      selectedCells.clear();
      previewCells.clear();
      actionDone = false;
      redeemDone = false;

      if (turnIndex >= turnOrder.length) {
        finishRound();
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

    // Search the board for a matching shape for the given player.
    function findMatch(card, playerId) {
      if (card.baseId && !players[playerId].redeemed.includes(card.baseId)) {
        return null;
      }

      const enemyId = enemyOf(playerId);
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
              const expectedOwner = cell.type === "own" ? playerId : enemyId;
              if (board[r][c] !== expectedOwner) {
                ok = false;
                break;
              }
              matched.push({ r, c });
            }
            if (ok) return matched;
          }
        }
      }
      return null;
    }

    // The public card is the first remaining card in that pile.
    function activeCard(kind) {
      return availableCards[kind][0] ?? null;
    }

    // After redemption, remove that public card permanently.
    function removeActiveCard(kind) {
      availableCards[kind].shift();
    }

    // Try to redeem one normal or shadowed ZONE card.
    // redeemDone enforces the rule: at most one redemption per turn.
    function redeem(kind) {
      if (gameOver || redeemDone) return;
      const player = currentPlayer();
      const card = activeCard(kind);
      if (!card) {
        addLog(`There are no ${kind} ZONE cards left in the public pile.`);
        render();
        return;
      }
      const matched = findMatch(card, player.id);

      if (!matched) {
        previewCells.clear();
        const missingBase = card.baseId && !player.redeemed.includes(card.baseId);
        addLog(`${player.name} cannot redeem ${card.title}${missingBase ? ` because they have not redeemed ${card.baseId.toUpperCase()} yet` : " because no matching shape exists"}.`);
        render();
        return;
      }

      player.zoneScore += card.points;
      player.redeemed.push(card.id);
      redeemDone = true;
      previewCells = new Set(matched.map(cell => keyOf(cell.r, cell.c)));

      if (card.removeOnRedeem) {
        for (const cell of matched) {
          board[cell.r][cell.c] = null;
        }
        addLog(`${player.name} redeemed ${card.title} for +${card.points} pts and removed ${matched.length} tile${matched.length > 1 ? "s" : ""}.`);
      } else {
        addLog(`${player.name} redeemed ${card.title} for +${card.points} pts.`);
      }

      removeActiveCard(kind);
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
            : "Choose one action. You may also redeem one card before acting.";

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
      els.occupyBtn.disabled = !canAct;
      els.tiltBtn.disabled = !canAct;
      els.confirmOccupyBtn.disabled = !(canAct && currentAction === "occupy" && selectedCells.size >= 1);
      els.confirmTiltBtn.disabled = !(canAct && currentAction === "tilt");
      els.clearSelectBtn.disabled = !(canAct && selectedCells.size > 0);
      els.endTurnBtn.disabled = gameOver || !actionDone;
      els.redeemNormalBtn.disabled = gameOver || redeemDone || !activeCard("normal");
      els.redeemShadowBtn.disabled = gameOver || redeemDone || !activeCard("shadow");

      els.occupyBox.classList.toggle("active-action", currentAction === "occupy");
      els.tiltBox.classList.toggle("active-action", currentAction === "tilt");
    }

    // Update the score panel.
    function renderScores() {
      els.scoreGrid.innerHTML = "";
      for (const player of players) {
        const row = document.createElement("div");
        row.className = "player-score";
        row.innerHTML = `
          <div class="swatch ${player.css}"></div>
          <div>
            <strong>${player.name}</strong>
            <div class="score-small">Board ${boardTileCount(player.id)} + Temp ${player.tempScore} + ZONE ${player.zoneScore}</div>
          </div>
          <strong>${totalScore(player)}</strong>
        `;
        els.scoreGrid.appendChild(row);
      }
      els.finalPanel.classList.toggle("game-over", gameOver);
    }

    // Update one public card box.
    function renderCard(el, card) {
      if (!card) {
        el.innerHTML = `
          <h4>No cards left</h4>
          <p>This public ZONE pile has been exhausted.</p>
        `;
        return;
      }

      const baseText = card.baseId ? `<p><strong>Requirement:</strong> player has already redeemed ${card.baseId.toUpperCase()}.</p>` : "";
      el.innerHTML = `
        <h4>${card.title} · +${card.points} pts</h4>
        <p>${card.description}</p>
        ${baseText}
      `;
    }

    // Update both public card boxes.
    function renderCards() {
      renderCard(els.normalCard, activeCard("normal"));
      renderCard(els.shadowCard, activeCard("shadow"));
    }

    // Show which cards each player has redeemed.
    function renderRedeemed() {
      const lines = players.map(player => {
        if (player.redeemed.length === 0) return `<strong>${player.name}:</strong> none`;
        const names = player.redeemed.map(id => cardNameById(id)).join(", ");
        return `<strong>${player.name}:</strong> ${names}`;
      });
      els.redeemedList.innerHTML = lines.join("<br />");
    }

    // Convert an internal card id like "tankRemoval" into a display title.
    function cardNameById(id) {
      const allCards = [...cardPiles.normal, ...cardPiles.shadow];
      return allCards.find(card => card.id === id)?.title ?? id;
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
    els.clearSelectBtn.addEventListener("click", clearSelection);
    els.endTurnBtn.addEventListener("click", endTurn);
    els.restartBtn.addEventListener("click", initGame);
    els.redeemNormalBtn.addEventListener("click", () => redeem("normal"));
    els.redeemShadowBtn.addEventListener("click", () => redeem("shadow"));

    // Start the first game as soon as the script loads.
    initGame();