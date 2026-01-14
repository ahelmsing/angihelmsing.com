const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ---------------------
// ASSETS
// ---------------------
const ASSET_LIST = [
  ["background", "assets/nuggs-background.png"],
  ["nuggsSober", "assets/nuggs-player-sober.png"],
  ["nuggsStoned", "assets/nuggs-player-stoned.png"],
  ["snazzers", "assets/nuggs-snazzers.png"],
  ["donut", "assets/nuggs-donut.png"],
  ["pizza", "assets/nuggs-pizza.png"],
  ["gummy", "assets/nuggs-gummy.png"],
];

const img = {};
const assetStatus = {}; // name -> "LOADING" | "OK" | "FAIL"
for (const [name, src] of ASSET_LIST) {
  img[name] = new Image();
  img[name].src = src;
  assetStatus[name] = "LOADING";
}

// We start the game loop no matter what.
// But Nuggs will be a placeholder until sober sprite loads.
let started = false;

// ---------------------
// TUNING
// ---------------------
const nuggsScale = 0.15;
const snackScale = 0.18;

const SPEED_SOBER = 200;
const SPEED_STONED = 80;
const STONED_DURATION = 10000;

const TARGET_SNACKS = 6;
const SPAWN_COOLDOWN_MS = 300; // (tweak)
const WAVY_AMPLITUDE = 30;     // (tweak)
const WAVY_FREQUENCY = 0.9;    // (tweak)

const MIN_SNACK_SPACING = 110;
const MIN_PLAYER_SPACING = 130;
const SEPARATION_STRENGTH = 45;

// ---------------------
// INPUT
// ---------------------
const keys = { up: false, down: false, left: false, right: false };

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "arrowup" || k === "w") keys.up = true;
  if (k === "arrowdown" || k === "s") keys.down = true;
  if (k === "arrowleft" || k === "a") keys.left = true;
  if (k === "arrowright" || k === "d") keys.right = true;
});

window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (k === "arrowup" || k === "w") keys.up = false;
  if (k === "arrowdown" || k === "s") keys.down = false;
  if (k === "arrowleft" || k === "a") keys.left = false;
  if (k === "arrowright" || k === "d") keys.right = false;
});

// ---------------------
// GAME STATE
// ---------------------
let score = 0;
let stonedUntil = 0;
let lastSpawnTime = 0;
const snacks = [];

let nuggsX = canvas.width * 0.35;
let nuggsY = canvas.height * 0.5;
let nuggsW = 90;
let nuggsH = 90;
let facing = 1;

// ---------------------
// LOAD HANDLERS (start loop ASAP)
// ---------------------
let loadedCount = 0;
let failedCount = 0;

function maybeStart() {
  if (started) return;
  started = true;
  requestAnimationFrame(loop);
}

for (const [name] of ASSET_LIST) {
  img[name].onload = () => {
    assetStatus[name] = "OK";
    loadedCount++;

    // If sober sprite loads, compute real nuggs size + center
    if (name === "nuggsSober") {
      nuggsW = img.nuggsSober.width * nuggsScale;
      nuggsH = img.nuggsSober.height * nuggsScale;
      nuggsX = canvas.width * 0.35 - nuggsW / 2;
      nuggsY = canvas.height * 0.5 - nuggsH / 2;
    }

    maybeStart();
  };

  img[name].onerror = () => {
    assetStatus[name] = "FAIL";
    failedCount++;
    maybeStart();
  };
}

// Start even before loads finish (so you never get “blank blue” again)
maybeStart();

// ---------------------
// SNACK TYPES
// ---------------------
const goodSnackTypes = [
  { name: "snazzers", imgKey: "snazzers", points: 10 },
  { name: "donut", imgKey: "donut", points: 15 },
  { name: "pizza", imgKey: "pizza", points: 20 },
];

function rollSnackType() {
  // only spawn gummy if its image loaded (prevents invisible gummy bug)
  const gummyChance = 0.12;
  if (assetStatus.gummy === "OK" && Math.random() < gummyChance) {
    return { name: "gummy", imgKey: "gummy", points: 1, isGummy: true };
  }
  const pick = goodSnackTypes[Math.floor(Math.random() * goodSnackTypes.length)];
  return { ...pick, isGummy: false };
}

function spawnSnack(nowMs) {
  const t = rollSnackType();

  // if the chosen snack image isn't loaded yet, skip spawning for now
  if (assetStatus[t.imgKey] !== "OK") return;

  const image = img[t.imgKey];
  const w = image.width * snackScale;
  const h = image.height * snackScale;

  const MAX_TRIES = 40;
  let x = 0, y = 0;
  let ok = false;

  for (let tries = 0; tries < MAX_TRIES; tries++) {
    x = rand(0, canvas.width - w);
    y = rand(0, canvas.height - h);
    if (isSpawnSpotGood(x, y, w, h)) {
      ok = true;
      break;
    }
  }

  if (!ok) {
    x = rand(0, canvas.width - w);
    y = rand(0, canvas.height - h);
  }

  snacks.push({
    type: t.name,
    points: t.points,
    isGummy: t.isGummy,
    imgKey: t.imgKey,
    x, y, w, h,
    vx: rand(-18, 18), // slower base drift
    vy: rand(-14, 14),
    phase: rand(0, Math.PI * 2),
    born: nowMs,
  });
}

function isSpawnSpotGood(x, y, w, h) {
  const sx = x + w / 2;
  const sy = y + h / 2;

  const px = nuggsX + nuggsW / 2;
  const py = nuggsY + nuggsH / 2;

  if (dist(sx, sy, px, py) < MIN_PLAYER_SPACING) return false;

  for (const s of snacks) {
    const ox = s.x + s.w / 2;
    const oy = s.y + s.h / 2;
    if (dist(sx, sy, ox, oy) < MIN_SNACK_SPACING) return false;
  }
  return true;
}

// ---------------------
// LOOP
// ---------------------
let lastTime = 0;

function loop(ts) {
  const dt = Math.min(((ts - lastTime) / 1000) || 0, 0.05);
  lastTime = ts;

  update(ts, dt);
  draw(ts);

  requestAnimationFrame(loop);
}

function update(ts, dt) {
  const nowMs = performance.now();

  // Only run “real game” once we at least have Nuggs sober image OR we’ll still allow movement with placeholder.
  const isStoned = nowMs < stonedUntil;
  const speed = isStoned ? SPEED_STONED : SPEED_SOBER;

  // movement
  let dx = 0, dy = 0;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;

  if (dx < 0) facing = -1;
  if (dx > 0) facing = 1;

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv; dy *= inv;
  }

  if (isStoned) {
    dx += Math.sin(ts * 0.004) * 0.15;
    dy += Math.cos(ts * 0.003) * 0.15;
  }

  nuggsX += dx * speed * dt;
  nuggsY += dy * speed * dt;
  nuggsX = clamp(nuggsX, 0, canvas.width - nuggsW);
  nuggsY = clamp(nuggsY, 0, canvas.height - nuggsH);

  // spawn snacks gradually
  if (snacks.length < TARGET_SNACKS && (nowMs - lastSpawnTime) > SPAWN_COOLDOWN_MS) {
    spawnSnack(nowMs);
    lastSpawnTime = nowMs;
  }

  // move snacks
  for (const s of snacks) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    if (s.x < 0) { s.x = 0; s.vx *= -1; }
    if (s.y < 0) { s.y = 0; s.vy *= -1; }
    if (s.x > canvas.width - s.w) { s.x = canvas.width - s.w; s.vx *= -1; }
    if (s.y > canvas.height - s.h) { s.y = canvas.height - s.h; s.vy *= -1; }
  }

  // anti-clump
  if (SEPARATION_STRENGTH > 0) separateSnacks(dt);

  // collisions (use the same wobble offset as drawing)
  for (let i = snacks.length - 1; i >= 0; i--) {
    const s = snacks[i];
    const wobble = Math.sin((ts * 0.001 * WAVY_FREQUENCY) + s.phase) * WAVY_AMPLITUDE;

    if (rectsOverlap(nuggsX, nuggsY, nuggsW, nuggsH, s.x + wobble, s.y, s.w, s.h)) {
      score += s.points;

      if (s.isGummy) {
        stonedUntil = nowMs + STONED_DURATION;
      }

      snacks.splice(i, 1);
    }
  }
}

function separateSnacks(dt) {
  for (let i = 0; i < snacks.length; i++) {
    for (let j = i + 1; j < snacks.length; j++) {
      const a = snacks[i];
      const b = snacks[j];

      const ax = a.x + a.w / 2;
      const ay = a.y + a.h / 2;
      const bx = b.x + b.w / 2;
      const by = b.y + b.h / 2;

      const d = dist(ax, ay, bx, by);
      const minD = MIN_SNACK_SPACING * 0.85;

      if (d > 0 && d < minD) {
        const push = (minD - d) / minD;
        const nx = (ax - bx) / d;
        const ny = (ay - by) / d;
        const amt = SEPARATION_STRENGTH * push * dt;

        a.x += nx * amt; a.y += ny * amt;
        b.x -= nx * amt; b.y -= ny * amt;

        a.x = clamp(a.x, 0, canvas.width - a.w);
        a.y = clamp(a.y, 0, canvas.height - a.h);
        b.x = clamp(b.x, 0, canvas.width - b.w);
        b.y = clamp(b.y, 0, canvas.height - b.h);
      }
    }
  }
}

function draw(ts) {
  // background (fallback if missing)
  if (assetStatus.background === "OK") {
    ctx.drawImage(img.background, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#1a1f3d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // choose nuggs sprite (fallback rectangle if missing)
  const nowMs = performance.now();
  const isStoned = nowMs < stonedUntil;
  const useKey = isStoned ? "nuggsStoned" : "nuggsSober";

  if (assetStatus[useKey] === "OK") {
    drawFlipped(img[useKey], nuggsX, nuggsY, nuggsW, nuggsH, facing);
  } else {
    ctx.fillStyle = isStoned ? "#ff66cc" : "#ffffff";
    ctx.fillRect(nuggsX, nuggsY, nuggsW, nuggsH);
  }

  // snacks (only draw ones that have images)
  for (const s of snacks) {
    if (assetStatus[s.imgKey] !== "OK") continue;
    const wobble = Math.sin((ts * 0.001 * WAVY_FREQUENCY) + s.phase) * WAVY_AMPLITUDE;
    ctx.drawImage(img[s.imgKey], s.x + wobble, s.y, s.w, s.h);
  }

  // HUD + on-screen debug so you can see what failed without console
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);

  if (isStoned) {
    const remaining = Math.ceil((stonedUntil - nowMs) / 1000);
    ctx.fillText(`STONED: ${remaining}s`, 20, 52);
  }

  ctx.font = "12px Arial";
  const statusLine = `Assets OK:${loadedCount}  FAIL:${failedCount}  (if FAIL>0, check assets folder names)`;
  ctx.fillText(statusLine, 20, canvas.height - 20);

  // show which ones failed (if any)
  let y = canvas.height - 38;
  for (const [name] of ASSET_LIST) {
    if (assetStatus[name] === "FAIL") {
      ctx.fillText(`MISSING: ${img[name].src}`, 20, y);
      y -= 14;
    }
  }
}

function drawFlipped(image, x, y, w, h, dir) {
  if (dir === 1) {
    ctx.drawImage(image, x, y, w, h);
    return;
  }
  ctx.save();
  ctx.translate(x + w, y);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0, w, h);
  ctx.restore();
}

// ---------------------
// HELPERS
// ---------------------
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw &&
    ax + aw > bx &&
    ay < by + bh &&
    ay + ah > by;
}

function dist(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}
