// game.js
// Dank Memory (Canvas 2D) — v1

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hintBtn = document.getElementById("hintBtn");

// -------------------------
// ASSETS (filenames from your screenshot)
// -------------------------
const ASSET = {
  bg: "assets/Dank-game-bk-room.png",
  dankNeutral: "assets/Dank-game-dank-neutral.png",
  dankSmile: "assets/Dank-game-dank-smile.png",
  bubble: "assets/Dank-game-speech-bubble.png",

  tileBack: "assets/Dank-game-leaf.png",

  faces: [
    "assets/Dank-game-bong.png",
    "assets/Dank-game-cacti.png",
    "assets/Dank-game-chronic.png",
    "assets/Dank-game-couch.png",
    "assets/Dank-game-hat.png",
    "assets/Dank-game-prickles.png",
    "assets/Dank-game-tv.png",
    "assets/Dank-game-ufo.png",
  ],
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load: " + src));
    img.src = src;
  });
}

const IMAGES = {};

// -------------------------
// GAME CONFIG
// -------------------------
const GRID_COLS = 4;
const GRID_ROWS = 4;
const TOTAL_TILES = GRID_COLS * GRID_ROWS; // 16
const TOTAL_PAIRS = TOTAL_TILES / 2;       // 8

// Layout (tuned for 960x540)
const UI = {
  dankAreaX: 0,
  dankAreaW: 340,

  gridX: 470,
  gridY: 70,

  tileSize: 90,
  tileGap: 14,

  bubbleX: 170,
  bubbleY: 40,
};

// Game state
let tiles = [];               // tile objects
let firstPick = null;         // index
let secondPick = null;        // index
let lockInput = false;

let score = 0;
let matchesFound = 0;

let helpsLeft = 3;
let helpsUsed = 0;

let bubbleText = "";
let bubbleUntilMs = 0;

let matchBounceUntilMs = 0;   // for Dank bounce

// -------------------------
// TILE SETUP
// -------------------------
function makeDeck() {
  // 8 unique faces -> make pairs -> shuffle -> assign to 16 tiles
  const pairIds = [];
  for (let i = 0; i < TOTAL_PAIRS; i++) {
    pairIds.push(i, i);
  }
  shuffle(pairIds);

  tiles = pairIds.map((pairId, idx) => {
    const col = idx % GRID_COLS;
    const row = Math.floor(idx / GRID_COLS);

    const x = UI.gridX + col * (UI.tileSize + UI.tileGap);
    const y = UI.gridY + row * (UI.tileSize + UI.tileGap);

    return {
      pairId,
      x, y,
      w: UI.tileSize,
      h: UI.tileSize,
      faceImg: IMAGES.faceImgs[pairId],
      isFlipped: false,
      isMatched: false,

      // hint glow effect timer
      glowUntilMs: 0,
    };
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// -------------------------
// INPUT
// -------------------------
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  onClick(mx, my);
});

function onClick(mx, my) {
  if (lockInput) return;

  // If game over, click to restart
  if (matchesFound === TOTAL_PAIRS) {
    resetGame();
    return;
  }

  const idx = tiles.findIndex(t => pointInRect(mx, my, t));
  if (idx === -1) return;

  const t = tiles[idx];
  if (t.isMatched || t.isFlipped) return;

  flipTile(idx);
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// -------------------------
// MATCH LOGIC
// -------------------------
function flipTile(idx) {
  const t = tiles[idx];
  t.isFlipped = true;

  if (firstPick === null) {
    firstPick = idx;
    return;
  }

  // second pick
  secondPick = idx;
  lockInput = true;

  const a = tiles[firstPick];
  const b = tiles[secondPick];

  const isMatch = (a.pairId === b.pairId);

  if (isMatch) {
    a.isMatched = true;
    b.isMatched = true;
    matchesFound++;
    score += 10;

    // Dank "bounce" moment
    matchBounceUntilMs = performance.now() + 1800;

    clearPicksSoon(250);
  } else {
    score = Math.max(0, score - 2);
    // flip them back after a short pause
    setTimeout(() => {
      a.isFlipped = false;
      b.isFlipped = false;
      clearPicks();
    }, 650);
  }
}

function clearPicksSoon(ms) {
  setTimeout(() => clearPicks(), ms);
}

function clearPicks() {
  firstPick = null;
  secondPick = null;
  lockInput = false;
}

// -------------------------
// DANK HELP ("ASK DANK")
// -------------------------
hintBtn.addEventListener("click", () => {
  if (helpsLeft <= 0) return;
  if (matchesFound === TOTAL_PAIRS) return;
  if (lockInput) return; // don’t hint mid-flip

  useDankHelp();
});

function useDankHelp() {
  helpsLeft--;
  helpsUsed++;

  hintBtn.textContent = `Ask Dank (${helpsLeft})`;
  if (helpsLeft <= 0) hintBtn.disabled = true;

  // Find all unmatched tiles
  const available = tiles
    .map((t, i) => ({ t, i }))
    .filter(o => !o.t.isMatched && !o.t.isFlipped);

  if (available.length < 2) {
    showBubble("Nothing left to help with, babe.");
    return;
  }

  // Decide if hint is correct
  // Rule: first hint ALWAYS correct. After that: 30% correct.
  const now = performance.now();
  const correct = (helpsUsed === 1) ? true : (Math.random() < 0.30);

  let i1, i2;

  if (correct) {
    // Pick a real pair that still exists and not already matched
    const pairMap = new Map();
    for (const o of available) {
      const pid = o.t.pairId;
      if (!pairMap.has(pid)) pairMap.set(pid, []);
      pairMap.get(pid).push(o.i);
    }
    const candidates = [...pairMap.entries()].filter(([pid, arr]) => arr.length >= 2);

    if (candidates.length === 0) {
      // fallback: pick two random tiles
      [i1, i2] = pickTwoRandom(available);
    } else {
      const [pid, arr] = candidates[Math.floor(Math.random() * candidates.length)];
      shuffle(arr);
      i1 = arr[0];
      i2 = arr[1];
    }

    showBubble(randomLine(true));
  } else {
    // Wrong on purpose: pick two tiles with different pairId
    let tries = 0;
    while (tries < 50) {
      const a = available[Math.floor(Math.random() * available.length)];
      const b = available[Math.floor(Math.random() * available.length)];
      if (a.i !== b.i && a.t.pairId !== b.t.pairId) {
        i1 = a.i; i2 = b.i;
        break;
      }
      tries++;
    }
    if (i1 === undefined) {
      [i1, i2] = pickTwoRandom(available);
    }

    showBubble(randomLine(false));
  }

  // Glow those two tiles (visual hint)
  const glowMs = now + 2000;
  tiles[i1].glowUntilMs = glowMs;
  tiles[i2].glowUntilMs = glowMs;
}

function pickTwoRandom(available) {
  const a = available[Math.floor(Math.random() * available.length)].i;
  let b = a;
  while (b === a) {
    b = available[Math.floor(Math.random() * available.length)].i;
  }
  return [a, b];
}

function randomLine(correct) {
  const good = [
    "Trust me. Those two.",
    "Easy match. Lock it in.",
    "I gotchu. That pair’s clean.",
  ];
  const bad = [
    "Relax… I’m 90% sure.",
    "Trust me. Worst case? Funny.",
    "I’ve rolled us outta worse situations.",
    "Do it. I feel it in my spine.",
  ];
  const pool = correct ? good : bad;
  return pool[Math.floor(Math.random() * pool.length)];
}

function showBubble(text) {
  bubbleText = text;
  bubbleUntilMs = performance.now() + 5000;
}

// -------------------------
// DRAW LOOP
// -------------------------
function draw() {
  const now = performance.now();

  // Background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(IMAGES.bg, 0, 0, canvas.width, canvas.height);

  // Grid panel (subtle dark overlay behind tiles)
  // drawGridPanel();

  // Tiles
  for (const t of tiles) {
    drawTile(t, now);
  }

  // Dank
  drawDank(now);

  // HUD
  drawHUD(now);

  // Win overlay
  if (matchesFound === TOTAL_PAIRS) {
    drawWin();
  }

  requestAnimationFrame(draw);
}

function drawGridPanel() {
  const panelX = UI.gridX - 18;
  const panelY = UI.gridY - 18;
  const panelW = GRID_COLS * UI.tileSize + (GRID_COLS - 1) * UI.tileGap + 36;
  const panelH = GRID_ROWS * UI.tileSize + (GRID_ROWS - 1) * UI.tileGap + 36;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, panelX, panelY, panelW, panelH, 22);
  ctx.fill();
  ctx.restore();
}

function drawTile(t, now) {
  // glow hint
  if (now < t.glowUntilMs) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 6;
    roundRect(ctx, t.x - 4, t.y - 4, t.w + 8, t.h + 8, 18);
    ctx.stroke();
    ctx.restore();
  }

  const img = (t.isFlipped || t.isMatched) ? t.faceImg : IMAGES.tileBack;
  ctx.drawImage(img, t.x, t.y, t.w, t.h);

  // matched dim / badge
  if (t.isMatched) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.restore();
  }
}

function drawDank(now) {
  // simple bounce when match occurs
  const bouncing = now < matchBounceUntilMs;
  const bounceT = bouncing ? (1 - (matchBounceUntilMs - now) / 400) : 0;
  const bounce = bouncing ? Math.sin(bounceT * Math.PI) * 10 : 0;

  // use smile for a moment when matched
  const dankImg = bouncing ? IMAGES.dankSmile : IMAGES.dankNeutral;

  // Place Dank on left
  const targetH = 420;
  const scale = targetH / dankImg.height;
  const w = dankImg.width * scale;
  const h = dankImg.height * scale;

  const x = 60;
  const y = canvas.height - h - 100 - bounce;

  ctx.drawImage(dankImg, x, y, w, h);

  // Bubble
  if (now < bubbleUntilMs) {
    drawSpeechBubble(now);
  }
}

function drawSpeechBubble(now) {
  // draw bubble image
  const img = IMAGES.bubble;

  const bw = 260;
  const bh = 140;

  const bx = UI.bubbleX;
  const by = UI.bubbleY;

  ctx.drawImage(img, bx, by, bw, bh);

  // text
  ctx.save();
  ctx.fillStyle = "#111";
  ctx.font = "16px Arial";
  ctx.textBaseline = "top";

  const padding = 35;
  wrapText(ctx, bubbleText, bx + padding, by + padding + 8, bw - padding * 2, 18);

  ctx.restore();
}

function drawHUD(now) {
  ctx.save();
  ctx.fillStyle = "#2e3b2e";
  ctx.font = "18px Arial";
  ctx.fillText(`Score: ${score}`, 18, 28);
  ctx.fillText(`Matches: ${matchesFound}/${TOTAL_PAIRS}`, 18, 52);
  ctx.restore();
}

function drawWin() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.font = "36px Arial";
  ctx.fillText("You matched everything!", 250, 230);

  ctx.font = "18px Arial";
  ctx.fillText("Click anywhere to play again.", 340, 270);

  ctx.restore();
}

// -------------------------
// TEXT WRAP + ROUNDRECT
// -------------------------
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = (text || "").split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// -------------------------
// RESET / START
// -------------------------
function resetGame() {
  score = 0;
  matchesFound = 0;
  firstPick = null;
  secondPick = null;
  lockInput = false;

  helpsLeft = 3;
  helpsUsed = 0;
  hintBtn.disabled = false;
  hintBtn.textContent = `Ask Dank (${helpsLeft})`;

  bubbleText = "";
  bubbleUntilMs = 0;

  makeDeck();
}

// -------------------------
// BOOT
// -------------------------
async function boot() {
  try {
    IMAGES.bg = await loadImage(ASSET.bg);
    IMAGES.dankNeutral = await loadImage(ASSET.dankNeutral);
    IMAGES.dankSmile = await loadImage(ASSET.dankSmile);
    IMAGES.bubble = await loadImage(ASSET.bubble);
    IMAGES.tileBack = await loadImage(ASSET.tileBack);

    IMAGES.faceImgs = [];
    for (const f of ASSET.faces) {
      IMAGES.faceImgs.push(await loadImage(f));
    }

    resetGame();
    requestAnimationFrame(draw);
  } catch (err) {
    console.error(err);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "18px Arial";
    ctx.fillText("Asset load failed. Check filenames + paths.", 20, 30);
    ctx.fillText(String(err), 20, 60);
  }
}

boot();
