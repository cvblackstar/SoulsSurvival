import { player, updatePlayer, attack, dodge, drawPlayer, applyDamageAndStatus, resetPlayer } from './player.js';
import { wolf, updateCompanion, drawCompanion, resetCompanion } from './companion.js';
import { enemies, drops, activeBoss, spawnEnemy, spawnMiniBoss, spawnMajorBoss, spawnDrop, updateEnemies, updateDrops, drawEnemiesAndDrops, setDifficulty, resetEnemies } from './enemies.js';
import { WEAPONS, LEGENDARY_WEAPONS, TIERS, ELEMENTS, getWeaponDamage } from './weapons.js';
import { initControls } from './controls.js';

const c = document.getElementById('game'), ctx = c.getContext('2d');
let W = 360, H = 640, dpr = 1, last = 0;

// 1. Declare state variables FIRST before initControls
let projectiles = [];
let spawnTimer = 0;
let score = 0;
let killsToBoss = 10;
let msg = "Prepare for battle! Defeat enemies to loot Tiered & Legendary weapons!";
let msgT = 4.5;

// Game state machine: 'menu' | 'playing' | 'gameover'
let gameState = 'menu';
let selectedDifficulty = 'hard';

function setMsg(text, duration) { msg = text; msgT = duration; }

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth || 360; 
  H = window.innerHeight || 640;
  
  c.width = W * dpr; 
  c.height = H * dpr;
  
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  if (!player.x || player.x === 0) { player.x = W / 2; player.y = H / 2; }
  if (!wolf.x || wolf.x === 0) { wolf.x = W / 2 - 45; wolf.y = H / 2 + 20; }
}

// 2. Initialize controls safely
initControls(
  () => attack(enemies, projectiles),
  () => dodge()
);

addEventListener('resize', resize);
resize();

// --- Menu / Game Over / Difficulty wiring ---
const menuScreen = document.getElementById('menu-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const gameoverStats = document.getElementById('gameover-stats');
const diffNormalBtn = document.getElementById('diff-normal');
const diffHardBtn = document.getElementById('diff-hard');
const startBtn = document.getElementById('start-btn');
const respawnBtn = document.getElementById('respawn-btn');
const pauseBtn = document.getElementById('pause-btn');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const quitBtn = document.getElementById('quit-btn');

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  pauseScreen.classList.remove('hidden');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  pauseScreen.classList.add('hidden');
}

pauseBtn.addEventListener('click', pauseGame);
resumeBtn.addEventListener('click', resumeGame);
quitBtn.addEventListener('click', () => {
  pauseScreen.classList.add('hidden');
  gameState = 'menu';
  menuScreen.classList.remove('hidden');
});

function selectDifficulty(d) {
  selectedDifficulty = d;
  diffNormalBtn.classList.toggle('selected', d === 'normal');
  diffHardBtn.classList.toggle('selected', d === 'hard');
}

diffNormalBtn.addEventListener('click', () => selectDifficulty('normal'));
diffHardBtn.addEventListener('click', () => selectDifficulty('hard'));
startBtn.addEventListener('click', () => { menuScreen.classList.add('hidden'); startGame(); });
respawnBtn.addEventListener('click', () => { gameoverScreen.classList.add('hidden'); startGame(); });

function startGame() {
  setDifficulty(selectedDifficulty);
  resetEnemies();
  resetPlayer(W, H);
  resetCompanion(player.x, player.y);
  projectiles = [];
  spawnTimer = 0;
  score = 0;
  killsToBoss = 10;
  setMsg("Prepare for battle! Defeat enemies to loot Tiered & Legendary weapons!", 4.5);
  gameState = 'playing';
}

function gameOver() {
  gameState = 'gameover';
  gameoverStats.textContent = `Kills: ${score}`;
  gameoverScreen.classList.remove('hidden');
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

function update(dt) {
  if (msgT > 0) msgT -= dt;

  if (!activeBoss) {
    spawnTimer -= dt;
    let currentSpawnRate = Math.max(0.5, 2.3 - (score * 0.08));
    if (spawnTimer <= 0) {
      spawnEnemy(W, H, score);
      spawnTimer = currentSpawnRate;
    }
  }

  updatePlayer(dt, W, H, enemies, projectiles, handleEnemyDeath);
  updateCompanion(dt, player, enemies, projectiles);

  // Pickups
  const MAGNET_RADIUS = 110;
  const MAGNET_SPEED = 260;
  for (let i = drops.length - 1; i >= 0; i--) {
    let d = drops[i];
    let pdist = Math.hypot(player.x - d.x, player.y - d.y);

    if (d.type === "health" && pdist < MAGNET_RADIUS && pdist > (player.r + d.r)) {
      let ang = Math.atan2(player.y - d.y, player.x - d.x);
      d.x += Math.cos(ang) * MAGNET_SPEED * dt;
      d.y += Math.sin(ang) * MAGNET_SPEED * dt;
      pdist = Math.hypot(player.x - d.x, player.y - d.y);
    }

    if (pdist < (player.r + d.r)) {
      if (d.type === "health") {
        player.hp = Math.min(player.max, player.hp + 35);
        setMsg("Healed +35 HP!", 2);
      } else if (d.type === "weapon") {
        player.weaponKey = d.weaponKey;
        player.tierKey = d.tierKey;
        player.elementKey = d.elementKey || "none";
        let w = WEAPONS[d.weaponKey] || LEGENDARY_WEAPONS[d.weaponKey];
        let t = TIERS[d.tierKey];
        let elem = ELEMENTS[player.elementKey];
        let dmg = getWeaponDamage(d.weaponKey, d.tierKey);
        let msg = d.isLegendary ? 
          `🔥 LEGENDARY! [${elem.name}] [${t.name}] ${w.name} (${dmg} DMG)!` :
          `Equipped [${elem.name}] [${t.name}] ${w.name} (${dmg} DMG)!`;
        setMsg(msg, 2.5);
      }
      drops.splice(i, 1);
    }
  }

  // Update drop deprecation timers
  updateDrops(dt);

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];

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

    if (remove || p.life <= 0) projectiles.splice(i, 1);
  }

  updateEnemies(
    dt, player,
    (dmg) => {
      player.hp = Math.max(0, player.hp - dmg);
      if (player.hp <= 0 && gameState === 'playing') gameOver();
    },
    handleEnemyDeath
  );
}

function bar(x, y, w, h, val, max, label, color) {
  ctx.fillStyle = "#000a"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color || (label === "PLAYER" ? "#57b56a" : "#d9a24c");
  ctx.fillRect(x, y, Math.max(0, w * (val / max)), h);
  ctx.strokeStyle = "#fff6"; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#fff"; ctx.font = "11px system-ui"; ctx.fillText(label, x + 4, y + h - 3);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#18231e"; ctx.fillRect(0, 0, W, H);

  drawEnemiesAndDrops(ctx);
  drawCompanion(ctx);
  drawPlayer(ctx);

  projectiles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  });

  let curW = WEAPONS[player.weaponKey] || LEGENDARY_WEAPONS[player.weaponKey];
  let curT = TIERS[player.tierKey];
  let curE = ELEMENTS[player.elementKey] || ELEMENTS.none;
  let curDmg = getWeaponDamage(player.weaponKey, player.tierKey);

  ctx.fillStyle = "#111"; ctx.fillRect(0, 0, W, 82);
  ctx.fillStyle = "#fff"; ctx.font = "bold 15px system-ui"; ctx.fillText("DARK COMPANION RPG", 14, 22);
  ctx.font = "12px system-ui"; ctx.fillStyle = "#aaa"; 
  ctx.fillText(`Kills: ${score}  |  Boss In: ${activeBoss ? "ACTIVE" : killsToBoss}  |  `, 14, 38);
  ctx.fillStyle = curE.color;
  ctx.fillText(`[${curE.name}] `, 180, 38);
  ctx.fillStyle = curT.color;
  ctx.fillText(`[${curT.name}] ${curW.name} (${curDmg} DMG)`, 235, 38);

  bar(14, 52, 120, 16, player.hp, player.max, "PLAYER");
  bar(142, 52, 120, 16, wolf.hp, wolf.max, "COMPANION");

  if (activeBoss) {
    bar(W - 170, 52, 156, 16, activeBoss.hp, activeBoss.max, "MINI BOSS", "#e74c3c");
  }

  if (msgT > 0) {
    ctx.fillStyle = "#000c"; ctx.fillRect(10, H - 70, W - 20, 42);
    ctx.fillStyle = "#fff"; ctx.font = "13px system-ui"; ctx.fillText(msg, 20, H - 44);
  }
}

function loop(t) {
  let dt = Math.min(0.033, (t - last) / 1000 || 0.016);
  last = t;
  if (gameState === 'playing' && player.hp > 0) update(dt);
  if (gameState !== 'menu') draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
