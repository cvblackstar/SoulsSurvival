import { WEAPONS, TIERS, ELEMENTS } from './weapons.js';

export let enemies = [];
export let drops = [];
export let activeBoss = null;

export let difficulty = 'hard';

export function setDifficulty(d) {
  difficulty = d === 'normal' ? 'normal' : 'hard';
}

function diffMult() {
  return difficulty === 'normal' ? 0.5 : 1;
}

export function resetEnemies() {
  enemies.length = 0;
  drops.length = 0;
  activeBoss = null;
}

export function spawnEnemy(W, H, score) {
  let isElite = Math.random() < 0.20 && score >= 3;
  let angle = Math.random() * Math.PI * 2;
  let dist = Math.max(W, H) * 0.6;
  let hp = (25 + score * 4) * (isElite ? 2.5 : 1) * diffMult();

  enemies.push({
    x: W / 2 + Math.cos(angle) * dist,
    y: H / 2 + Math.sin(angle) * dist,
    r: isElite ? 22 : 14,
    hp: hp,
    max: hp,
    baseSpeed: (70 + Math.random() * 30) * (isElite ? 0.85 : 1),
    speed: 70,
    dmg: isElite ? 18 : 10,
    isElite: isElite,
    isMiniBoss: false,
    isBoss: false,
    color: isElite ? "#f1c40f" : "#e74c3c",
    burnTimer: 0,
    burnDmg: 0,
    slowTimer: 0,
    stunTimer: 0,
    hit: 0
  });
}

export function spawnMiniBoss(W, H, setMsg) {
  setMsg("WARNING: Mini Boss Appeared!", 3.0);
  let hp = 250 * diffMult();
  let enemy = {
    x: W / 2,
    y: 80,
    r: 28,
    hp: hp,
    max: hp,
    baseSpeed: 55,
    speed: 55,
    dmg: 22,
    isElite: false,
    isMiniBoss: true,
    isBoss: false,
    color: "#e67e22",
    burnTimer: 0, burnDmg: 0, slowTimer: 0, stunTimer: 0, hit: 0
  };
  enemies.push(enemy);
  return enemy;
}

export function spawnMajorBoss(W, H, setMsg) {
  setMsg("MAJOR BOSS DESCENT! Defeat it for Legendary Elemental Weapons!", 4.0);
  let hp = 650 * diffMult();
  activeBoss = {
    x: W / 2,
    y: 70,
    r: 38,
    hp: hp,
    max: hp,
    baseSpeed: 45,
    speed: 45,
    dmg: 35,
    isElite: false,
    isMiniBoss: false,
    isBoss: true,
    color: "#8e44ad",
    burnTimer: 0, burnDmg: 0, slowTimer: 0, stunTimer: 0, hit: 0
  };
  enemies.push(activeBoss);
  return activeBoss;
}

export function spawnDrop(x, y, isBoss, isMiniBoss, isElite) {
  if (Math.random() < 0.45) {
    drops.push({ x, y, r: 8, type: "health" });
    return;
  }

  let keys = Object.keys(WEAPONS);
  let weaponKey = keys[Math.floor(Math.random() * keys.length)];
  
  let tierKey = "common";
  let rand = Math.random();
  
  if (isBoss) {
    tierKey = rand < 0.6 ? "epic" : "legendary";
  } else if (isMiniBoss) {
    tierKey = rand < 0.5 ? "rare" : "epic";
  } else if (isElite) {
    tierKey = rand < 0.7 ? "rare" : "epic";
  } else {
    if (rand < 0.25) tierKey = "rare";
  }

  let elemKeys = ["none", "fire", "ice", "lightning"];
  let elemChance = isBoss ? 1.0 : (isMiniBoss ? 0.8 : (isElite ? 0.6 : 0.25));
  let elementKey = Math.random() < elemChance ? elemKeys[Math.floor(Math.random() * (elemKeys.length - 1)) + 1] : "none";

  drops.push({
    x, y, r: 10,
    type: "weapon",
    weaponKey,
    tierKey,
    elementKey
  });
}

export function updateEnemies(dt, player, onPlayerDamage, onEnemyDeath) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];

    if (e.stunTimer > 0) {
      e.stunTimer -= dt;
      e.speed = 0;
    } else if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      e.speed = e.baseSpeed * 0.6;
    } else {
      e.speed = e.baseSpeed;
    }

    if (e.burnTimer > 0) {
      e.burnTimer -= dt;
      e.hp -= e.burnDmg * dt;
      e.hit = 0.05;
    }

    if (e.hit > 0) e.hit -= dt;

    if (e.speed > 0) {
      let dx = player.x - e.x;
      let dy = player.y - e.y;
      let dist = Math.hypot(dx, dy) || 1;
      e.x += (dx / dist) * e.speed * dt;
      e.y += (dy / dist) * e.speed * dt;

      if (dist < (e.r + player.r) && player.inv <= 0) {
        onPlayerDamage(e.dmg);
      }
    }

    if (e.hp <= 0) {
      if (e.isBoss) activeBoss = null;
      onEnemyDeath(e);
      enemies.splice(i, 1);
    }
  }
}

export function drawEnemiesAndDrops(ctx) {
  drops.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = d.type === "health" ? "#2ecc71" : "#f39c12";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  });

  enemies.forEach(e => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fillStyle = e.hit > 0 ? "#ffffff" : e.color;
    ctx.fill();

    if (e.stunTimer > 0) {
      ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 4; ctx.stroke();
    } else if (e.slowTimer > 0) {
      ctx.strokeStyle = "#00bfff"; ctx.lineWidth = 3; ctx.stroke();
    } else if (e.burnTimer > 0) {
      ctx.strokeStyle = "#ff4500"; ctx.lineWidth = 3; ctx.stroke();
    }

    if (e.isElite || e.isMiniBoss || e.isBoss) {
      let bw = e.r * 2;
      ctx.fillStyle = "#000a";
      ctx.fillRect(e.x - e.r, e.y - e.r - 10, bw, 5);
      ctx.fillStyle = e.isBoss ? "#9b59b6" : "#e67e22";
      ctx.fillRect(e.x - e.r, e.y - e.r - 10, bw * Math.max(0, e.hp / e.max), 5);
    }

    ctx.restore();
  });
}
