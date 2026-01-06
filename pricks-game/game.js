// --- Kush gravity (stoner-friendly) ---
const player = document.querySelector(".player");
const obstacle = document.querySelector(".obstacle");
const game = document.querySelector(".game");
const scoreEl = document.querySelector(".score");

let score = 0;
let hasScoredThisPass = false; // prevents double-scoring

let isGameOver = false;
let gameOverMsg = null;

// --- Player physics ---
let y = 200;          // starting Y position (px)
let velocity = 0;     // current falling speed
const gravity = 0.2;  // smaller = slower fall
const lift = -6;      // jump strength (more negative = stronger hop)

// --- Obstacle motion ---
let obstacleX = 800;        // start off to the right
const obstacleSpeed = 2;    // smaller = slower
let obstacleY = 180;        // base height
let waveOffset = 0;         // time counter for wave

// --- Start values for reset ---
const START_Y = 200;
const START_VELOCITY = 0;
const START_OBSTACLE_X = 800;
const START_WAVE_OFFSET = 0;

// --- Collision (with smaller hitboxes) ---
function isOverlapping(a, b) {
  const paddingA = 10; // Kush hitbox shrink
  const paddingB = 15; // Chip bag hitbox shrink

  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();

  const aRect = {
    left: r1.left + paddingA,
    right: r1.right - paddingA,
    top: r1.top + paddingA,
    bottom: r1.bottom - paddingA
  };

  const bRect = {
    left: r2.left + paddingB,
    right: r2.right - paddingB,
    top: r2.top + paddingB,
    bottom: r2.bottom - paddingB
  };

  return !(
    aRect.right < bRect.left ||
    aRect.left > bRect.right ||
    aRect.bottom < bRect.top ||
    aRect.top > bRect.bottom
  );
}

// --- Score display ---
function updateScore() {
  if (scoreEl) scoreEl.textContent = `Score: ${score}`;
}

// --- Game over + reset ---
function gameOver() {
  isGameOver = true;

  const msg = document.createElement("div");
  msg.textContent = "GAME OVER — Prickles are Satan. (Space/Click to restart)";
  msg.style.position = "absolute";
  msg.style.left = "50%";
  msg.style.top = "50%";
  msg.style.transform = "translate(-50%, -50%)";
  msg.style.padding = "12px 16px";
  msg.style.background = "rgba(0,0,0,0.7)";
  msg.style.color = "white";
  msg.style.fontFamily = "sans-serif";
  msg.style.borderRadius = "10px";
  msg.style.zIndex = "10";

  game.appendChild(msg);
  gameOverMsg = msg;
}

function resetGame() {
  isGameOver = false;

  if (gameOverMsg) {
    gameOverMsg.remove();
    gameOverMsg = null;
  }

  // reset player
  y = START_Y;
  velocity = START_VELOCITY;
  player.style.top = y + "px";

  // reset obstacle
  obstacleX = START_OBSTACLE_X;
  obstacle.style.left = obstacleX + "px";

  // reset wave
  waveOffset = START_WAVE_OFFSET;
  obstacleY = 180;
  obstacle.style.top = obstacleY + "px";

  // reset score
  score = 0;
  hasScoredThisPass = false;
  updateScore();

  requestAnimationFrame(loop);
}

// --- Input ---
function flap() {
  velocity = lift;
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    if (isGameOver) {
      resetGame();
      return;
    }
    flap();
  }
});

game.addEventListener("click", () => {
  if (isGameOver) {
    resetGame();
    return;
  }
  flap();
});

// --- Main loop ---
function loop() {
  if (isGameOver) return;

  // player gravity
  velocity += gravity;
  y += velocity;

  // keep Kush inside the box for now
  if (y < 0) {
    y = 0;
    velocity = 0;
  }
  if (y > 420) {
    y = 420;
    velocity = 0;
  }
  player.style.top = y + "px";
  player.style.transform = `rotate(${velocity * 2}deg)`;


  // obstacle movement
  obstacleX -= obstacleSpeed;
  obstacle.style.left = obstacleX + "px";

  // score when obstacle passes Kush (once per pass)
  const playerX = player.offsetLeft; // fixed X
  if (!hasScoredThisPass && obstacleX < playerX) {
    score++;
    hasScoredThisPass = true;
    updateScore();
  }

  // reset obstacle when off screen
  if (obstacleX < -100) {
    obstacleX = 800;
    hasScoredThisPass = false;
  }

  // wave bobbing (THIS MUST STAY INSIDE LOOP)
  waveOffset += 0.03;
  obstacleY = 180 + Math.sin(waveOffset) * 40;
  obstacle.style.top = obstacleY + "px";

  // collision check (THIS MUST STAY INSIDE LOOP)
  if (isOverlapping(player, obstacle)) {
    gameOver();
    return;
  }

  requestAnimationFrame(loop);
}

// initialize score text
updateScore();

// start the game
loop();
