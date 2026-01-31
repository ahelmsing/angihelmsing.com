(function () {
  const panel = document.getElementById("tttPanel");
  const boardEl = document.getElementById("tttBoard");
  const statusEl = document.getElementById("tttStatus");
  const resetBtn = document.getElementById("tttReset");

  if (!panel || !boardEl || !statusEl) return;

  let cells = [];
  let board = Array(9).fill("");
  let player = "X";
  let ai = "O";
  let gameOver = false;

  function openPanel() {
    panel.hidden = false;
  }

  function closePanel() {
    panel.hidden = true;
  }

  function showIfHash() {
    const isTTT = window.location.hash === "#ttt";
    if (isTTT) {
      openPanel();
      resetGame();
    } else {
      closePanel();
    }
  }

  function buildBoard() {
    boardEl.innerHTML = "";
    cells = [];

    for (let i = 0; i < 9; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ttt-cell";
      btn.dataset.i = String(i);
      btn.setAttribute("role", "gridcell");
      btn.setAttribute("aria-label", "Cell " + (i + 1));

      btn.addEventListener("click", () => onPlayerMove(i));

      boardEl.appendChild(btn);
      cells.push(btn);
    }
  }

  function resetGame() {
    board = Array(9).fill("");
    gameOver = false;
    statusEl.textContent = "Your turn.";
    cells.forEach((c) => (c.textContent = ""));
  }

  function winnerFor(b) {
    const wins = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, c, d] of wins) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return null;
  }

  function firstEmpty(b) {
    for (let i = 0; i < b.length; i++) {
      if (!b[i]) return i;
    }
    return -1;
  }

  function onPlayerMove(i) {
    if (gameOver) return;
    if (board[i]) return;

    board[i] = player;
    cells[i].textContent = player;

    const w = winnerFor(board);
    if (w) {
      gameOver = true;
      statusEl.textContent = "VERIFIED. Access unlocked.";
      localStorage.setItem("hf_prickles_unlocked", "1");
      setTimeout(() => {
        window.location.href = "prickles.html";
      }, 650);
      return;
    }

    if (!board.includes("")) {
      gameOver = true;
      statusEl.textContent = "DRAW. Reset and try again.";
      return;
    }

    statusEl.textContent = "System turn.";
    setTimeout(aiMove, 350);
  }

  function aiMove() {
    if (gameOver) return;

    const idx = firstEmpty(board);
    if (idx === -1) return;

    board[idx] = ai;
    cells[idx].textContent = ai;

    const w = winnerFor(board);
    if (w) {
      gameOver = true;
      statusEl.textContent = "ACCESS DENIED. Reset and try again.";
      return;
    }

    if (!board.includes("")) {
      gameOver = true;
      statusEl.textContent = "DRAW. Reset and try again.";
      return;
    }

    statusEl.textContent = "Your turn.";
  }

  buildBoard();
  showIfHash();
  window.addEventListener("hashchange", showIfHash);
  if (resetBtn) resetBtn.addEventListener("click", resetGame);
})();
