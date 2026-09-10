import { initControls, joyMove } from './controls.js';
import { player, attack, dodge, drawPlayer, updatePlayer } from './player.js';
import { wolf, updateCompanion, drawCompanion } from './companion.js';
import { enemies, drops, spawnEnemy, spawnMiniBoss, spawnMajorBoss, updateEnemies, drawEnemiesAndDrops, spawnDrop } from './enemies.js';

// ==================== CANVAS & DISPLAY ====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = window.innerWidth;
let H = window.innerHeight;

function resizeCanvas() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ==================== GAME STATE ====================
let score = 0;
let killsToBoss = 10;
let projectiles = [];
let msgText = "";
let msgTimer = 0;
let lastSpawnTime = 0;
let spawnInterval = 1.5; // Spawn enemy every 1.5 seconds
let gameRunning = true;

// ==================== HELPER FUNCTIONS ====================
function setMsg(text, duration = 2.0) {
  msgText = text;
  msgTimer = duration;
}

function handleEnemyDeath(e) {
  score++;
  if (e.isBoss) {
    setMsg("MAJOR BOSS DEFEATED! Legendary Weapon Dropped!", 3.5);
    spawnDrop(e.x, e.y, true, false, false);
  } else if (e.isMiniBoss) {
    setMsg("Mini Boss Defeated! Rare loot dropped!", 2.5);
    spawnDrop(e.x, e.y, false, true, false);
  } else {
    spawnDrop(e.x, e.y, false, false, e.isElite);
    killsToBoss--;
    if (killsToBoss <= 0) {
      killsToBoss = 10;
      if (score % 30 === 0) {
        spawnMajorBoss(W, H, setMsg);
      } else {
        spawnMiniBoss(W, H, setMsg);
      }
    }
  }
}

function onPlayerDamage(dmg) {
  player.hp -= dmg;
  if (player.hp <= 0) {
    gameRunning = false;
    setMsg("GAME OVER! Score: " + score, 5.0);
  }
}

// ==================== PICKUP LOGIC ====================
function updatePickups(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    let d = drops[i];
    let dist = Math.hypot(d.x - player.x, d.y - player.y);
    
    if (dist < 50) { // Pickup radius
      if (d.type === "health") {
        player.hp = Math.min(player.hp + 30, player.max);
      } else if (d.type === "weapon") {
        player.weaponKey = d.weaponKey;
        player.tierKey = d.tierKey;
        player.elementKey = d.elementKey;
        setMsg(`Equipped: ${d.weaponKey} (${d.tierKey})`, 1.5);
      }
      drops.splice(i, 1);
    }
  }
}

// ==================== PLAYER MOVEMENT ====================
function updatePlayerMovement(dt) {
  const moveSpeed = 280;
  let dx = 0, dy = 0;

  // Joystick input
  if (Math.abs(joyMove.x) > 0.1) dx += joyMove.x;
  if (Math.abs(joyMove.y) > 0.1) dy += joyMove.y;

  // Keyboard input
  if (typeof keys !== 'undefined') {
    if (keys['w'] || keys['W'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['S'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['D'] || keys['ArrowRight']) dx += 1;
  }

  // Normalize diagonal movement
  let dist = Math.hypot(dx, dy);
  if (dist > 0) {
    dx = (dx / dist) * moveSpeed * dt;
    dy = (dy / dist) * moveSpeed * dt;
    
    player.x += dx;
    player.y += dy;
  }

  // Clamp player to screen
  player.x = Math.max(player.r, Math.min(W - player.r, player.x));
  player.y = Math.max(player.r, Math.min(H - player.r, player.y));
}

// ==================== PROJECTILE UPDATES ====================
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];

    // Homing tracking
    if (p.isHoming) {
      let nearest = null, minDist = Infinity;
      enemies.forEach(e => {
        let d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < minDist) { minDist = d; nearest = e; }
      });

      if (nearest) {
        let targetAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
        let currentAngle = Math.atan2(p.vy, p.vx);
        let newAngle = currentAngle + (targetAngle - currentAngle) * p.turnRate * dt;
        p.vx = Math.cos(newAngle) * p.speed;
        p.vy = Math.sin(newAngle) * p.speed;
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    let remove = false;
    for (let e of enemies) {
      if (Math.hypot(p.x - e.x, p.y - e.y) < (p.r + e.r)) {
        if (p.pierce) {
          if (!p.hitList.includes(e)) {
            applyDamageAndStatus(e, p.dmg, p.element);
            p.hitList.push(e);
          }
        } else {
          applyDamageAndStatus(e, p.dmg, p.element);
          remove = true;
          break;
        }
      }
    }

    if (remove || p.life <= 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
      projectiles.splice(i, 1);
    }
  }
}

function applyDamageAndStatus(e, dmg, elem) {
  e.hp -= dmg;
  e.hit = 0.1;

  if (!elem || elem.effect === null) return;

  if (elem.effect === "burn") {
    e.burnTimer = 3.0;
    e.burnDmg = dmg * 0.15;
  } else if (elem.effect === "slow") {
    e.slowTimer = 3.0;
  } else if (elem.effect === "stun") {
    e.stunTimer = 1.0;
  }
}

// ==================== DRAWING ====================
function drawUI() {
  ctx.fillStyle = "#fff";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 20, 40);
  ctx.fillText("HP: " + Math.max(0, player.hp.toFixed(0)) + " / " + player.max, 20, 70);
  ctx.fillText("Weapon: " + player.weaponKey.toUpperCase(), 20, 100);
  ctx.fillText("Tier: " + player.tierKey.toUpperCase(), 20, 130);

  if (msgTimer > 0) {
    ctx.fillStyle = "rgba(255, 255, 255, " + Math.min(1, msgTimer) + ")";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText(msgText, W / 2, H / 2);
    ctx.textAlign = "left";
  }
}

function drawProjectiles() {
  projectiles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color || "#fff";
    ctx.fill();
  });
}

// ==================== MAIN GAME LOOP ====================
let lastTime = Date.now();

function gameLoop() {
  const now = Date.now();
  const dt = Math.min((now - lastTime) / 1000, 0.033); // Cap at 30ms
  lastTime = now;

  if (!gameRunning) {
    // Draw game over screen
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText(msgText, W / 2, H / 2);
    ctx.textAlign = "left";
    requestAnimationFrame(gameLoop);
    return;
  }

  // Update
  lastSpawnTime += dt;
  if (lastSpawnTime >= spawnInterval) {
    spawnEnemy(W, H, score);
    lastSpawnTime = 0;
  }

  updatePlayerMovement(dt);
  updatePlayer(dt, W, H, enemies, projectiles, handleEnemyDeath);
  updateEnemies(dt, player, onPlayerDamage, handleEnemyDeath);
  updateCompanion(dt, player, enemies, projectiles);
  updateProjectiles(dt);
  updatePickups(dt);

  // Update messages
  if (msgTimer > 0) msgTimer -= dt;

  // Draw
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  drawEnemiesAndDrops(ctx);
  drawProjectiles();
  drawCompanion(ctx);
  drawPlayer(ctx);
  drawUI();

  requestAnimationFrame(gameLoop);
}

// ==================== INITIALIZE ====================
initControls(
  () => attack(enemies, projectiles),
  () => dodge()
);

setMsg("Dark Companion RPG - Survive!", 2.0);
spawnEnemy(W, H, score);
wolf.x = W / 2;
wolf.y = H / 2;

requestAnimationFrame(gameLoop);
