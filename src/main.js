import { player, updatePlayer, attack, jump, dash, drawPlayer, applyDamageAndStatus, resetPlayer } from './player.js';
import { wolf, updateCompanion, drawCompanion, resetCompanion } from './companion.js';
import { enemies, drops, bossActive, resetEnemies, updateEnemies, updateDrops, drawEnemiesAndDrops, spawnDrop, setDifficulty, applyHitToEnemy } from './enemies.js';
import { WEAPONS, LEGENDARY_WEAPONS, TIERS, ELEMENTS, getWeaponDamage } from './weapons.js';
import { LEVEL_WIDTH, LEVEL_HEIGHT, GROUND_Y, platforms, goal } from './level.js';
import { initControls } from './controls.js';

const c = document.getElementById('game'), ctx = c.getContext('2d');
let W = 360, H = 640, dpr = 1, last = 0;
let camX = 0;

// Orientation & rendering state
let isLandscape = true;
let canvasRotated = false;

let projectiles = [];
let msg = "Reach the end of the stage and defeat the boss!";
let msgT = 4.5;

let gameState = 'menu'; // menu | playing | paused | gameover | transition
let selectedDifficulty = 'hard';
let bossDefeated = false;

let stage = 1;
let pendingStage = 1;
const TRANSITION_DURATION = 1.8;
let transitionTimer = 0;
let transitionSwitched = false;

function setMsg(text, duration) { msg = text; msgT = duration; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Try to lock landscape where supported; falls back to JavaScript resize handling.
try {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
} catch (e) { /* not supported - JS fallback handles it */ }

function isPortraitViewport() {
  return window.matchMedia('(orientation: portrait)').matches;
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const inPortrait = isPortraitViewport();
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (inPortrait) {
    // Portrait Viewport Layout
    const targetHeight = Math.min(viewportHeight, 800);
    const targetWidth = Math.min(viewportWidth, 600);
    const aspectRatio = 360 / 640;
    
    let finalW = targetWidth;
    let finalH = targetWidth / aspectRatio;
    
    if (finalH > targetHeight) {
      finalH = targetHeight;
      finalW = targetHeight * aspectRatio;
    }
    
    W = Math.max(320, Math.floor(finalW));
    H = Math.max(568, Math.floor(finalH));
    isLandscape = false;
  } else {
    // Landscape Viewport Layout: Adapt to dynamic aspect ratio
    const baselineHeight = 450; // Logical vertical height for 2D view
    const aspectRatio = viewportWidth / viewportHeight;
    
    H = baselineHeight;
    W = Math.floor(baselineHeight * aspectRatio);
    isLandscape = true;
  }

  // Set physical rendering canvas resolution
  c.width = viewportWidth * dpr;
  c.height = viewportHeight * dpr;
  
  // Stretch canvas display size to fit entire viewport
  c.style.width = viewportWidth + 'px';
  c.style.height = viewportHeight + 'px';
  
  // Scale render context mapping logical coordinates (W x H) to device screen pixels
  if (ctx) {
    ctx.setTransform(
      (viewportWidth / W) * dpr, 0, 0,
      (viewportHeight / H) * dpr, 0, 0
    );
  }
}

initControls(
  () => attack(enemies, projectiles),
  () => jump(),
  () => dash(),
  (axis) => { player.moveAxis = axis; }
);

addEventListener('resize', resize);
addEventListener('orientationchange', resize);
resize();

// --- Menu / Pause / Game Over wiring ---
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
  stage = 1;
  setDifficulty(selectedDifficulty);
  resetEnemies(1);
  resetPlayer();
  resetCompanion(player.x, player.y);
  projectiles = [];
  camX = 0;
  bossDefeated = false;
  setMsg("Reach the end of the stage and defeat the boss!", 4);
  gameState = 'playing';
}

function gameOver() {
  gameState = 'gameover';
  const pct = Math.floor((player.x / LEVEL_WIDTH) * 100);
  gameoverStats.textContent = `Stage ${stage} - you reached ${pct}% of the way through`;
  gameoverScreen.classList.remove('hidden');
}

function startTransition() {
  gameState = 'transition';
  pendingStage = stage + 1;
  transitionTimer = TRANSITION_DURATION;
  transitionSwitched = false;
}

function advanceStage() {
  stage = pendingStage;
  const stageMult = Math.pow(1.05, stage - 1);
  resetEnemies(stageMult);
  resetPlayer();
  resetCompanion(player.x, player.y);
  projectiles = [];
  camX = 0;
  bossDefeated = false;
  const pct = Math.round((stageMult - 1) * 100);
  setMsg(`Stage ${stage} - enemies are ${pct}% stronger!`, 4);
}

function handleEnemyDeath(e) {
  if (e.type === 'boss') {
    bossDefeated = true;
    setMsg("BOSS DEFEATED! The path ahead is open - reach the portal!", 4);
    spawnDrop(e.x, e.y, true, false, false);
  } else if (e.type === 'miniboss') {
    setMsg("Mini-boss defeated! Rare loot dropped!", 2.5);
    spawnDrop(e.x, e.y, false, true, false);
  } else {
    spawnDrop(e.x, e.y, false, false, e.isElite);
  }
}

function update(dt) {
  if (msgT > 0) msgT -= dt;

  updatePlayer(dt, enemies, projectiles, () => { if (gameState === 'playing') gameOver(); });
  updateCompanion(dt, player, enemies, projectiles);

  // Pickups (health orbs fly to the player when nearby)
  const MAGNET_RADIUS = 110;
  const MAGNET_SPEED = 260;
  const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    let pdist = Math.hypot(pcx - d.x, pcy - d.y);
    const pickupDist = player.w / 2 + d.w / 2;

    if (d.type === "health" && pdist < MAGNET_RADIUS && pdist > pickupDist) {
      const ang = Math.atan2(pcy - d.y, pcx - d.x);
      d.x += Math.cos(ang) * MAGNET_SPEED * dt;
      d.y += Math.sin(ang) * MAGNET_SPEED * dt;
      pdist = Math.hypot(pcx - d.x, pcy - d.y);
    }

    if (pdist < pickupDist) {
      if (d.type === "health") {
        player.hp = Math.min(player.max, player.hp + 35);
        setMsg("Healed +35 HP!", 2);
      } else if (d.type === "weapon") {
        player.weaponKey = d.weaponKey;
        player.tierKey = d.tierKey;
        player.elementKey = d.elementKey || "none";
        const w = WEAPONS[d.weaponKey] || LEGENDARY_WEAPONS[d.weaponKey];
        const t = TIERS[d.tierKey];
        const elem = ELEMENTS[player.elementKey];
        const dmg = getWeaponDamage(d.weaponKey, d.tierKey);
        const equipMsg = d.isLegendary
          ? `LEGENDARY! [${elem.name}] [${t.name}] ${w.name} (${dmg} DMG)!`
          : `Equipped [${elem.name}] [${t.name}] ${w.name} (${dmg} DMG)!`;
        setMsg(equipMsg, 2.5);
      }
      drops.splice(i, 1);
    }
  }
  updateDrops(dt);

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    if (p.homing && p.from === 'player' && enemies.length) {
      let nearest = null, minDist = Infinity;
      for (const e of enemies) {
        const d = Math.hypot((e.x + e.w / 2) - p.x, (e.y + e.h / 2) - p.y);
        if (d < minDist) { minDist = d; nearest = e; }
      }
      if (nearest) {
        const targetAngle = Math.atan2((nearest.y + nearest.h / 2) - p.y, (nearest.x + nearest.w / 2) - p.x);
        const currentAngle = Math.atan2(p.vy, p.vx);
        let diff = targetAngle - currentAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const newAngle = currentAngle + diff * p.turnRate * dt;
        const speed = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(newAngle) * speed;
        p.vy = Math.sin(newAngle) * speed;
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    let remove = false;
    if (p.from === 'enemy') {
      if (p.x > player.x - p.r && p.x < player.x + player.w + p.r &&
          p.y > player.y - p.r && p.y < player.y + player.h + p.r) {
        applyDamageAndStatus(p.dmg);
        remove = true;
      }
    } else {
      for (const e of enemies) {
        if (p.x > e.x - p.r && p.x < e.x + e.w + p.r &&
            p.y > e.y - p.r && p.y < e.y + e.h + p.r) {
          if (p.pierce) {
            if (!p.hitList.includes(e)) { applyHitToEnemy(e, p.dmg, p.elem); p.hitList.push(e); }
          } else {
            applyHitToEnemy(e, p.dmg, p.elem);
            remove = true;
            break;
          }
        }
      }
    }

    if (remove || p.life <= 0) projectiles.splice(i, 1);
  }

  updateEnemies(dt, player, projectiles, (dmg) => applyDamageAndStatus(dmg), handleEnemyDeath);

  // Camera follows player, clamped to level bounds
  camX = clamp(player.x + player.w / 2 - W / 2, 0, Math.max(0, LEVEL_WIDTH - W));

  // Goal check (only "opens" once the boss is dead) -> triggers the stage transition
  if (bossDefeated &&
      player.x + player.w > goal.x && player.x < goal.x + goal.w &&
      player.y + player.h > goal.y && player.y < goal.y + goal.h) {
    startTransition();
  }
}

function bar(x, y, w, h, val, max, label, color) {
  ctx.fillStyle = "#000a"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color || (label === "PLAYER" ? "#57b56a" : "#d9a24c");
  ctx.fillRect(x, y, Math.max(0, w * (val / max)), h);
  ctx.strokeStyle = "#fff6"; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#fff"; ctx.font = "11px system-ui"; ctx.fillText(label, x + 4, y + h - 3);
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1b2a3a");
  g.addColorStop(1, "#0e1620");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Simple parallax hill silhouettes
  ctx.fillStyle = "#16222f";
  const parX = -((camX * 0.3) % 400);
  for (let x = parX - 400; x < W + 400; x += 400) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.quadraticCurveTo(x + 200, GROUND_Y - 160, x + 400, GROUND_Y);
    ctx.lineTo(x + 400, H);
    ctx.lineTo(x, H);
    ctx.fill();
  }
}

function drawLevel() {
  for (const p of platforms) {
    if (p.invisible) continue;
    const sx = p.x - camX;
    if (sx + p.w < 0 || sx > W) continue;

    ctx.fillStyle = "#3d5a3d";
    ctx.fillRect(sx, p.y, p.w, 10);
    ctx.fillStyle = "#2a3f2a";
    ctx.fillRect(sx, p.y + 10, p.w, p.h - 10);

    // World-space aligned texture so it visibly streams past as the camera scrolls.
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, p.y, p.w, Math.min(p.h, H - p.y));
    ctx.clip();

    ctx.fillStyle = "#5c8a5c";
    const tuftSpacing = 14;
    for (let wx = Math.floor(p.x / tuftSpacing) * tuftSpacing; wx < p.x + p.w; wx += tuftSpacing) {
      ctx.fillRect(wx - camX, p.y, 3, 5);
    }

    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 2;
    const tickSpacing = 22;
    for (let wx = Math.floor((p.x - 20) / tickSpacing) * tickSpacing; wx < p.x + p.w + 20; wx += tickSpacing) {
      const sxT = wx - camX;
      ctx.beginPath();
      ctx.moveTo(sxT, p.y + 16);
      ctx.lineTo(sxT + 12, p.y + p.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Goal flag
  const gsx = goal.x - camX;
  if (gsx + goal.w > 0 && gsx < W) {
    ctx.fillStyle = bossDefeated ? "#f1c40f" : "#555";
    ctx.fillRect(gsx, goal.y, 6, goal.h);
    ctx.beginPath();
    ctx.moveTo(gsx + 6, goal.y);
    ctx.lineTo(gsx + 34, goal.y + 14);
    ctx.lineTo(gsx + 6, goal.y + 28);
    ctx.fill();
  }
}

function drawTransitionOverlay(progress) {
  const coverage = Math.sin(Math.min(1, Math.max(0, progress)) * Math.PI); // 0 -> 1 -> 0
  if (coverage <= 0.01) return;
  const cx = W / 2, cy = H / 2;
  const maxR = Math.hypot(W, H) / 2 + 40;

  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * coverage);
  grad.addColorStop(0, "#1a0a3a");
  grad.addColorStop(0.65, "#0a0620");
  grad.addColorStop(1, "#000000");
  ctx.globalAlpha = Math.min(1, coverage * 1.3);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR * coverage, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#8ecbff";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const r = maxR * coverage * (0.3 + 0.25 * i);
    ctx.globalAlpha = coverage * 0.5;
    const spin = progress * 6 + i * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, spin, spin + Math.PI * 1.4);
    ctx.stroke();
  }

  ctx.globalAlpha = coverage;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(`ENTERING STAGE ${pendingStage}`, cx, cy);
  ctx.font = "13px system-ui";
  ctx.fillStyle = "#cddfff";
  ctx.fillText("Difficulty rising...", cx, cy + 26);
  ctx.textAlign = "left";
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawLevel();

  drawEnemiesAndDrops(ctx, camX);
  drawCompanion(ctx, camX);
  drawPlayer(ctx, camX);

  projectiles.forEach(p => {
    ctx.fillStyle = p.from === 'enemy' ? "#e74c3c" : "#ffd54a";
    ctx.beginPath(); ctx.arc(p.x - camX, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  });

  const curW = WEAPONS[player.weaponKey] || LEGENDARY_WEAPONS[player.weaponKey];
  const curT = TIERS[player.tierKey];
  const curE = ELEMENTS[player.elementKey] || ELEMENTS.none;
  const curDmg = getWeaponDamage(player.weaponKey, player.tierKey);

  // HUD Bar dimensions adjusted dynamically for screen width W
  const hudH = player.shieldMax > 0 ? 90 : 75;
  ctx.fillStyle = "#111c"; ctx.fillRect(0, 0, W, hudH);
  
  ctx.fillStyle = "#fff"; ctx.font = "bold 14px system-ui"; ctx.fillText("SOULS SURVIVAL", 12, 20);
  ctx.font = "11px system-ui";
  ctx.fillStyle = curE.color;
  ctx.fillText(`[${curE.name}] `, 12, 35);
  ctx.fillStyle = curT.color;
  ctx.fillText(`[${curT.name}] ${curW.name} (${curDmg} DMG)`, 68, 35);

  const barW = Math.min(120, Math.floor(W * 0.22));
  bar(12, 44, barW, 14, player.hp, player.max, "PLAYER");
  bar(18 + barW, 44, barW, 14, wolf.hp, wolf.max, "COMPANION");
  
  if (player.shieldMax > 0) {
    bar(12, 62, barW * 2 + 6, 12, player.shield, player.shieldMax, "SHIELD", "#4fc3f7");
  }

  // Stage progress aligned dynamically to the right side
  ctx.fillStyle = "#9db4d9"; ctx.font = "11px system-ui"; ctx.textAlign = "right";
  ctx.fillText(`STAGE ${stage}`, W - 12, 16);
  ctx.textAlign = "left";
  
  const progress = clamp(player.x / LEVEL_WIDTH, 0, 1);
  const progressBarW = Math.min(130, Math.floor(W * 0.25));
  ctx.fillStyle = "#000a"; ctx.fillRect(W - progressBarW - 12, 22, progressBarW, 8);
  ctx.fillStyle = "#3498db"; ctx.fillRect(W - progressBarW - 12, 22, progressBarW * progress, 8);
  ctx.strokeStyle = "#fff6"; ctx.strokeRect(W - progressBarW - 12, 22, progressBarW, 8);

  if (bossActive) {
    bar(W - progressBarW - 12, 36, progressBarW, 14, bossActive.hp, bossActive.max,
      bossActive.type === 'boss' ? "BOSS" : "MINI BOSS", "#e74c3c");
  }

  if (msgT > 0) {
    ctx.fillStyle = "#000c"; ctx.fillRect(10, H - 52, W - 20, 36);
    ctx.fillStyle = "#fff"; ctx.font = "12px system-ui"; ctx.fillText(msg, 18, H - 30);
  }

  if (gameState === 'transition') {
    drawTransitionOverlay(1 - transitionTimer / TRANSITION_DURATION);
  }
}

function loop(t) {
  const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
  last = t;

  if (gameState === 'playing' && player.hp > 0) update(dt);

  if (gameState === 'transition') {
    transitionTimer -= dt;
    const progress = 1 - transitionTimer / TRANSITION_DURATION;
    if (!transitionSwitched && progress >= 0.5) {
      advanceStage();
      transitionSwitched = true;
    }
    if (transitionTimer <= 0) gameState = 'playing';
  }

  if (gameState !== 'menu') draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
