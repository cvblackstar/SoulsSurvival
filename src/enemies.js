import { WEAPONS, LEGENDARY_WEAPONS, TIERS, ELEMENTS } from './weapons.js';
import { GRAVITY, resolveCollisions, enemySpawns } from './level.js';

export let enemies = [];
export let drops = [];
export let bossActive = null; // set to the miniboss/boss enemy object while it's alive

export let difficulty = 'hard';
export function setDifficulty(d) { difficulty = d === 'normal' ? 'normal' : 'hard'; }
function diffMult() { return difficulty === 'normal' ? 0.5 : 1; }

let stageMult = 1; // set via resetEnemies(extraMult); grows 5% per stage

const TYPE_DEFS = {
  walker: { w: 26, h: 34, hp: 40, speed: 55, chaseSpeed: 95, aggro: 240, contactDmg: 8 },
  shooter: { w: 24, h: 30, hp: 30, speed: 0, chaseSpeed: 0, aggro: 520, contactDmg: 6, shootRange: 480, shootInterval: 1.6 },
  miniboss: { w: 46, h: 54, hp: 300, speed: 40, chaseSpeed: 70, aggro: 400, contactDmg: 14, shootRange: 400, shootInterval: 1.2 },
  boss: { w: 60, h: 70, hp: 700, speed: 45, chaseSpeed: 90, aggro: 700, contactDmg: 20, shootRange: 460, shootInterval: 1.0 }
};

export function resetEnemies(extraMult = 1) {
  stageMult = extraMult;
  enemies.length = 0;
  drops.length = 0;
  bossActive = null;
  for (const spawn of enemySpawns) {
    const def = TYPE_DEFS[spawn.type];
    const isBossType = spawn.type === 'miniboss' || spawn.type === 'boss';
    const hp = def.hp * diffMult() * stageMult;
    enemies.push({
      id: spawn.id,
      type: spawn.type,
      x: spawn.x, y: spawn.y, w: def.w, h: def.h,
      vx: 0, vy: 0,
      hp, max: hp,
      onGround: false,
      patrolDir: Math.random() < 0.5 ? -1 : 1,
      patrolTimer: 1 + Math.random() * 2,
      shootTimer: Math.random() * (def.shootInterval || 1),
      hitFlash: 0,
      burn: 0, slow: 0, stun: 0,
      isBossType,
      isElite: spawn.type === 'walker' && Math.random() < 0.2
    });
  }
}

function distXY(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

export function applyHitToEnemy(e, dmg, elemKey) {
  e.hp -= dmg;
  e.hitFlash = 0.12;
  const elem = ELEMENTS[elemKey] || ELEMENTS.none;
  if (elem.effect === "burn") e.burn = 2.0;
  if (elem.effect === "slow") e.slow = 2.0;
  if (elem.effect === "stun") e.stun = 0.8;
}

// Ranged weapons drop noticeably more often than melee weapons.
function pickWeightedWeaponKey(pool) {
  const keys = Object.keys(pool);
  const weighted = [];
  for (const k of keys) {
    const weight = pool[k].type === "melee" ? 1 : 3;
    for (let i = 0; i < weight; i++) weighted.push(k);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export function updateEnemies(dt, player, projectiles, onPlayerDamage, onDeath) {
  bossActive = enemies.find(e => e.isBossType) || null;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const def = TYPE_DEFS[e.type];

    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.burn > 0) { e.burn -= dt; e.hp -= 6 * dt; }
    if (e.slow > 0) e.slow -= dt;
    if (e.stun > 0) e.stun -= dt;

    if (e.hp <= 0) {
      enemies.splice(i, 1);
      if (onDeath) onDeath(e);
      continue;
    }

    const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
    const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
    const d = distXY(ecx, ecy, pcx, pcy);
    const slowMult = e.slow > 0 ? 0.4 : 1;

    if (e.stun > 0) {
      e.vx = 0;
    } else if (d < def.aggro && Math.abs(ecy - pcy) < 90) {
      // Chase horizontally
      const dir = pcx > ecx ? 1 : -1;
      e.vx = dir * def.chaseSpeed * slowMult;
      e.facing = dir;
    } else if (def.speed > 0) {
      // Patrol
      e.patrolTimer -= dt;
      if (e.patrolTimer <= 0) {
        e.patrolDir *= -1;
        e.patrolTimer = 1.5 + Math.random() * 2;
      }
      e.vx = e.patrolDir * def.speed * slowMult;
      e.facing = e.patrolDir;
    } else {
      e.vx = 0;
    }

    // Ranged attack
    if (def.shootRange && e.stun <= 0) {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < def.shootRange && Math.abs(ecy - pcy) < 70) {
        e.shootTimer = def.shootInterval;
        const dir = pcx > ecx ? 1 : -1;
        const speed = 240;
        const shotDmg = Math.round(10 * stageMult);
        if (e.type === 'boss') {
          for (let s = -1; s <= 1; s++) {
            projectiles.push({ x: ecx, y: ecy, vx: dir * speed, vy: s * 90, r: 5, dmg: Math.round(12 * stageMult), elem: 'none', life: 2, from: 'enemy' });
          }
        } else {
          projectiles.push({ x: ecx, y: ecy, vx: dir * speed, vy: 0, r: 4, dmg: shotDmg, elem: 'none', life: 2, from: 'enemy' });
        }
      }
    }

    // Gravity + collision
    e.vy = Math.min(900, e.vy + GRAVITY * dt);
    e.onGround = resolveCollisions(e, dt);

    // Contact damage with player (player's invuln window rate-limits repeat hits)
    if (e.x < player.x + player.w && e.x + e.w > player.x && e.y < player.y + player.h && e.y + e.h > player.y) {
      onPlayerDamage(def.contactDmg * stageMult);
    }
  }
}

export function spawnDrop(x, y, isBoss, isMiniBoss, isElite) {
  // Health drop chance
  if (Math.random() < 0.45) {
    drops.push({ x, y, w: 16, h: 16, type: "health", deprecationTimer: Infinity });
    return;
  }

  let isLegendary = false;
  let weaponKey, tierKey;
  let rand = Math.random();

  if (isBoss) {
    if (Math.random() < 0.10) {
      isLegendary = true;
      weaponKey = pickWeightedWeaponKey(LEGENDARY_WEAPONS);
      tierKey = "legendary";
    } else {
      weaponKey = pickWeightedWeaponKey(WEAPONS);
      tierKey = rand < 0.6 ? "epic" : "legendary";
    }
  } else if (isMiniBoss) {
    if (Math.random() < 0.05) {
      isLegendary = true;
      weaponKey = pickWeightedWeaponKey(LEGENDARY_WEAPONS);
      tierKey = "legendary";
    } else {
      weaponKey = pickWeightedWeaponKey(WEAPONS);
      tierKey = rand < 0.5 ? "rare" : "epic";
    }
  } else if (isElite) {
    if (Math.random() < 0.05) {
      isLegendary = true;
      weaponKey = pickWeightedWeaponKey(LEGENDARY_WEAPONS);
      tierKey = "legendary";
    } else {
      weaponKey = pickWeightedWeaponKey(WEAPONS);
      tierKey = rand < 0.7 ? "rare" : "epic";
    }
  } else {
    if (Math.random() < 0.03) {
      isLegendary = true;
      weaponKey = pickWeightedWeaponKey(LEGENDARY_WEAPONS);
      tierKey = "legendary";
    } else {
      weaponKey = pickWeightedWeaponKey(WEAPONS);
      tierKey = rand < 0.25 ? "rare" : "common";
    }
  }

  const elemKeys = Object.keys(ELEMENTS);
  const elementKey = elemKeys[Math.floor(Math.random() * elemKeys.length)];

  drops.push({
    x, y, w: 16, h: 16, type: "weapon", weaponKey, tierKey, elementKey, isLegendary,
    deprecationTimer: 10
  });
}

export function updateDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (d.deprecationTimer === Infinity) continue;
    d.deprecationTimer -= dt;
    if (d.deprecationTimer <= 0) drops.splice(i, 1);
  }
}

export function drawEnemiesAndDrops(ctx, camX) {
  for (const e of enemies) {
    const sx = e.x - camX;
    ctx.save();
    if (e.hitFlash > 0) ctx.fillStyle = "#fff";
    else if (e.type === 'boss') ctx.fillStyle = "#7a1f1f";
    else if (e.type === 'miniboss') ctx.fillStyle = "#a1451f";
    else if (e.type === 'shooter') ctx.fillStyle = "#5a3f8a";
    else ctx.fillStyle = e.isElite ? "#c0392b" : "#8b5a2b";
    ctx.fillRect(sx, e.y, e.w, e.h);

    // HP sliver above
    ctx.fillStyle = "#000a";
    ctx.fillRect(sx, e.y - 8, e.w, 4);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(sx, e.y - 8, e.w * Math.max(0, e.hp / e.max), 4);
    ctx.restore();
  }

  for (const d of drops) {
    const sx = d.x - camX;
    ctx.save();
    if (d.type === "health") {
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.arc(sx, d.y, d.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    } else {
      const tier = TIERS[d.tierKey];
      ctx.beginPath();
      ctx.arc(sx, d.y, d.w / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#f39c12";
      ctx.fill();
      if (tier) {
        ctx.strokeStyle = tier.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = tier.color;
        ctx.font = "bold 9px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d.isLegendary ? "L" : d.tierKey.charAt(0).toUpperCase(), sx, d.y);
      }
      if (d.deprecationTimer < 2.0 && d.deprecationTimer !== Infinity) {
        ctx.globalAlpha = Math.max(0, d.deprecationTimer / 2.0);
      }
    }
    ctx.restore();
  }
}
