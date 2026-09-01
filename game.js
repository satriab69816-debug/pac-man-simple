// ===== Project Gabut: Pac-Man Simple =====
// Maze legend: 0 = tembok, 1 = jalan + dot, 2 = jalan kosong, 3 = power pellet

const TILE = 40;
const maze = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,1,1,1,1,1,1,1,1,1,3,0],
  [0,1,0,0,1,0,0,0,0,1,0,0,1,0],
  [0,1,0,0,1,0,1,1,0,1,0,0,1,0],
  [0,1,1,1,1,0,1,1,0,1,1,1,1,0],
  [0,1,0,0,1,1,1,1,1,1,0,0,1,0],
  [0,1,0,0,0,0,1,1,0,0,0,0,1,0],
  [0,1,1,1,1,0,2,2,0,1,1,1,1,0],
  [0,0,0,0,1,0,0,0,0,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,0,0,0,1,0,0,1,0],
  [0,1,0,0,1,0,1,1,0,1,0,0,1,0],
  [0,1,1,0,1,1,1,1,1,1,0,1,1,0],
  [0,3,1,1,1,1,1,1,1,1,1,1,3,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const ROWS = maze.length;
const COLS = maze[0].length;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const statusEl = document.getElementById("status");

let score = 0;
let lives = 3;
let gameOver = false;
let gameWon = false;
let powerMode = 0; // frame counter untuk mode kebal

// Salinan maze yang bisa berubah (dot dimakan dsb)
let grid;

function resetGrid() {
  grid = maze.map(row => row.slice());
}

// ===== Player =====
const player = {
  x: 1, y: 1, // posisi grid
  dir: { x: 0, y: 0 },
  nextDir: { x: 0, y: 0 },
  mouth: 0,
};

// ===== Ghosts =====
const ghostColors = ["#ff5555", "#55ffff", "#ff9955", "#ff55ff"];
let ghosts = [];

function resetGhosts() {
  const spots = [
    { x: 6, y: 7 },
    { x: 7, y: 7 },
    { x: 6, y: 4 },
    { x: 7, y: 10 },
  ];
  ghosts = spots.map((s, i) => ({
    x: s.x,
    y: s.y,
    dir: { x: 0, y: -1 },
    color: ghostColors[i],
    scared: false,
  }));
}

function isWall(x, y) {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return true;
  return grid[y][x] === 0;
}

function canMove(x, y, dx, dy) {
  return !isWall(x + dx, y + dy);
}

function resetGame() {
  resetGrid();
  player.x = 1;
  player.y = 1;
  player.dir = { x: 0, y: 0 };
  player.nextDir = { x: 0, y: 0 };
  resetGhosts();
  score = 0;
  lives = 3;
  gameOver = false;
  gameWon = false;
  powerMode = 0;
  statusEl.textContent = "";
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
}

// ===== Input =====
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === "r") {
    resetGame();
    return;
  }
  if (["arrowup", "w"].includes(key)) player.nextDir = { x: 0, y: -1 };
  else if (["arrowdown", "s"].includes(key)) player.nextDir = { x: 0, y: 1 };
  else if (["arrowleft", "a"].includes(key)) player.nextDir = { x: -1, y: 0 };
  else if (["arrowright", "d"].includes(key)) player.nextDir = { x: 1, y: 0 };
});

// ===== Update logic =====
let frame = 0;

function updatePlayer() {
  // Coba belok ke arah yang diinginkan kalau memungkinkan
  if (canMove(player.x, player.y, player.nextDir.x, player.nextDir.y)) {
    player.dir = player.nextDir;
  }
  if (canMove(player.x, player.y, player.dir.x, player.dir.y)) {
    player.x += player.dir.x;
    player.y += player.dir.y;
  }

  // Makan dot / power pellet
  const cell = grid[player.y][player.x];
  if (cell === 1) {
    grid[player.y][player.x] = 2;
    score += 10;
  } else if (cell === 3) {
    grid[player.y][player.x] = 2;
    score += 50;
    powerMode = 300; // ~5 detik di 60fps
    ghosts.forEach(g => (g.scared = true));
  }
  updateHud();

  if (checkWin()) {
    gameWon = true;
    statusEl.textContent = "🎉 Kamu menang! Tekan R untuk main lagi.";
  }
}

function checkWin() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] === 1 || grid[y][x] === 3) return false;
    }
  }
  return true;
}

function updateGhosts() {
  ghosts.forEach(g => {
    const options = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ].filter(d => canMove(g.x, g.y, d.x, d.y) && !(d.x === -g.dir.x && d.y === -g.dir.y));

    let choice;
    if (options.length === 0) {
      choice = { x: -g.dir.x, y: -g.dir.y }; // buntu, balik arah
    } else {
      // Sebagian besar waktu kejar/lari dari player, kadang random biar nggak predictable
      const chase = Math.random() < 0.6;
      if (chase) {
        options.sort((a, b) => {
          const da = Math.hypot(g.x + a.x - player.x, g.y + a.y - player.y);
          const db = Math.hypot(g.x + b.x - player.x, g.y + b.y - player.y);
          return g.scared ? db - da : da - db; // kalau scared, menjauh
        });
        choice = options[0];
      } else {
        choice = options[Math.floor(Math.random() * options.length)];
      }
    }
    g.dir = choice;
    g.x += choice.x;
    g.y += choice.y;
  });

  if (powerMode > 0) {
    powerMode--;
    if (powerMode === 0) ghosts.forEach(g => (g.scared = false));
  }
}

function checkCollisions() {
  ghosts.forEach(g => {
    if (g.x === player.x && g.y === player.y) {
      if (g.scared) {
        // Makan hantu, kirim balik ke "kandang"
        g.x = 6;
        g.y = 7;
        g.scared = false;
        score += 200;
        updateHud();
      } else if (!gameOver) {
        lives--;
        updateHud();
        if (lives <= 0) {
          gameOver = true;
          statusEl.textContent = "💀 Game Over. Tekan R untuk coba lagi.";
        } else {
          // reset posisi
          player.x = 1;
          player.y = 1;
          player.dir = { x: 0, y: 0 };
          resetGhosts();
        }
      }
    }
  });
}

// ===== Drawing =====
function drawMaze() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = grid[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (cell === 0) {
        ctx.fillStyle = "#1a1aff";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = "#3333ff";
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
      } else if (cell === 1) {
        ctx.fillStyle = "#ffd93d";
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (cell === 3) {
        ctx.fillStyle = "#ffd93d";
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 8 + Math.sin(frame * 0.2) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawPlayer() {
  const px = player.x * TILE + TILE / 2;
  const py = player.y * TILE + TILE / 2;
  const angle = Math.atan2(player.dir.y, player.dir.x) || 0;

  player.mouth = (player.mouth + 0.15) % (Math.PI / 2);
  const mouthOpen = Math.abs(Math.sin(frame * 0.2)) * 0.25 + 0.05;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.fillStyle = "#ffd93d";
  ctx.beginPath();
  ctx.arc(0, 0, TILE / 2 - 4, mouthOpen * Math.PI, (2 - mouthOpen) * Math.PI);
  ctx.lineTo(0, 0);
  ctx.fill();
  ctx.restore();
}

function drawGhosts() {
  ghosts.forEach(g => {
    const px = g.x * TILE + TILE / 2;
    const py = g.y * TILE + TILE / 2;
    ctx.fillStyle = g.scared ? (powerMode < 100 && frame % 20 < 10 ? "#fff" : "#3355ff") : g.color;
    ctx.beginPath();
    ctx.arc(px, py, TILE / 2 - 4, Math.PI, 0);
    ctx.lineTo(px + TILE / 2 - 4, py + TILE / 2 - 4);
    for (let i = 0; i < 3; i++) {
      ctx.lineTo(px + TILE / 2 - 4 - ((i + 0.5) * (TILE - 8)) / 3, py + TILE / 2 - 4 - (i % 2 === 0 ? 6 : 0));
    }
    ctx.lineTo(px - TILE / 2 + 4, py + TILE / 2 - 4);
    ctx.closePath();
    ctx.fill();

    // mata
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px - 6, py - 4, 4, 0, Math.PI * 2);
    ctx.arc(px + 6, py - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(px - 6 + g.dir.x * 2, py - 4 + g.dir.y * 2, 2, 0, Math.PI * 2);
    ctx.arc(px + 6 + g.dir.x * 2, py - 4 + g.dir.y * 2, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMaze();
  drawPlayer();
  drawGhosts();
}

// ===== Main loop =====
function loop() {
  frame++;
  if (!gameOver && !gameWon) {
    if (frame % 8 === 0) updatePlayer();
    if (frame % 10 === 0) updateGhosts();
    checkCollisions();
  }
  draw();
  requestAnimationFrame(loop);
}

resetGame();
loop();
