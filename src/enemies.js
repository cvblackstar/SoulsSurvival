import { WEAPONS, TIERS } from './weapons.js';

export let enemies = [];
export let drops = [];
export let activeBoss = null;

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function norm(x, y) { let n = Math.hypot(x, y) || 1; return [x / n, y / n]; }

export function spawnEnemy(W, H, score) {
  let side = Math.floor(Math.random() * 4);
  let ex, ey;
  if (side === 0) { ex = Math.random() * W; ey = 90; }
  else if (side === 1) { ex = Math.random() * W; ey = H - 20; }
  else if (side === 2) { ex = 20; ey = 90 + Math.random() * (H - 110); }
  else { ex = W - 20; ey = 90 + Math.random() * (H - 110); }

  enemies.push({
    x: ex, y: ey, r: 18,
    hp: 70 + (score * 4), max: 70 + (score * 4),
    speed: 95 + Math.random() * 35,
    atkTimer: 0, atk: 0, hit: 0, isBoss: false
  });
}

export function spawnBoss(W, setMsg) {
  activeBoss = {
    x: W / 2, y: 130, r: 35,
    hp: 250, max: 250,
    speed: 50,
    atkTimer: 0, atk: 0, hit: 0, isBoss: true
  };
  enemies.push(activeBoss);
  setMsg("⚠️ BOSS WARNING: Mini Giant Spawned! Defeat for Legendary Loot!", 4);
}

export function spawnDrop(x, y, isBossDrop = false) {
  if (isBossDrop) {
    drops.push({ x: x - 20, y: y, type: "health", r: 14 });
    let tier = Math.random() < 0.65 ? "legendary" : "epic";
    let wKeys = tier === "legendary" 
      ? ["excalibur", "mjolnir", "voidScythe", "axe", "bow"]
      : ["sword", "wand", "axe", "daggers", "bow", "ice"];

    let chosenW = wKeys[Math.floor(Math.random() * wKeys.length)];
    drops.push({ x: x + 20, y: y, type: "weapon", weaponKey: chosenW, tierKey: tier, r: 16 });
    return;
  }

  let roll = Math.random();
  if (roll < 0.20) {
    drops.push({ x, y, type: "health", r: 12 });
  } else if (roll < 0.45) {
    let tRoll = Math.random();
    let tier = "common";
    if (tRoll < 0.05) tier = "legendary";
    else if (tRoll < 0.20) tier = "epic";
    else if (tRoll < 0.50) tier = "rare";

    let wKeys = tier === "legendary" 
      ? ["excalibur", "mjolnir", "voidScythe"]
      : ["sword", "wand", "axe", "daggers", "bow", "ice"];

    let chosenW = wKeys[Math.floor(Math.random() * wKeys.length)];
    drops.push({ x, y, type: "weapon", weaponKey: chosenW, tierKey: tier, r: 14 });
  }
}

export function updateEnemies(dt, player, onPlayerHit, onEnemyDeath) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    if (e.hp <= 0) {
      if (e === activeBoss) activeBoss = null;
      onEnemyDeath(e);
      enemies.splice(i, 1);
      continue;
    }

    e.hit = Math.max(0, e.hit - dt);
    e.atk = Math.max(0, e.atk - dt);
    e.atkTimer = Math.max(0, e.atkTimer - dt);

    let dPlayer = dist(e, player);
    let [ex, ey] = norm(player.x - e.x, player.y - e.y);
    e.x += ex * e.speed * dt;
    e.y += ey * e.speed * dt;

    let atkRange = e.isBoss ? 55 : 42;
    if (dPlayer <= atkRange && e.atkTimer <= 0) {
      e.atkTimer = e.isBoss ? 2.0 : 1.2;
      e.atk = 0.35;
      if (player.inv <= 0) {
        onPlayerHit(e.isBoss ? 24 : 18);
      }
    }
  }
}

export function drawEnemiesAndDrops(ctx) {
  drops.forEach(d => {
    if (d.type === "health") {
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui"; ctx.fillText("+HP", d.x - 10, d.y + 4);
    } else if (d.type === "weapon") {
      let t = TIERS[d.tierKey];
      ctx.shadowColor = t.color;
      ctx.shadowBlur = d.tierKey === "legendary" ? 18 : 8;
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#000"; ctx.font = "bold 9px system-ui"; ctx.fillText("WPN", d.x - 10, d.y + 3);
    }
  });

  enemies.forEach(e => {
    ctx.fillStyle = e.hit > 0 ? "#fff" : (e.isBoss ? "#d32f2f" : "#8f3d49");
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
    
    if (e.isBoss) {
      ctx.strokeStyle = "#ff1744"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "bold 12px system-ui"; ctx.fillText("BOSS", e.x - 16, e.y - e.r - 8);
    }

    if (e.atk > 0) {
      ctx.strokeStyle = e.isBoss ? "#ff1744" : "#ff4444";
      ctx.lineWidth = e.isBoss ? 5 : 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 15, 0, Math.PI * 2); ctx.stroke();
    }
  });
}
