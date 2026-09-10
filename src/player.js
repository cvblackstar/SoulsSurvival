import { WEAPONS, LEGENDARY_WEAPONS, TIERS, ELEMENTS, getWeaponDamage } from './weapons.js';
import { joyMove, keys } from './controls.js';

export const player = {
  x: 180, y: 320, r: 18,
  hp: 100, max: 100,
  atkCooldown: 0, dodge: 0, inv: 0,
  weaponKey: "sword",
  tierKey: "common",
  elementKey: "none",
  meleeSwingAngle: 0
};

export function resetPlayer(W, H) {
  player.x = W / 2;
  player.y = H / 2;
  player.hp = 100;
  player.max = 100;
  player.atkCooldown = 0;
  player.dodge = 0;
  player.inv = 0;
  player.weaponKey = "sword";
  player.tierKey = "common";
  player.elementKey = "none";
  player.meleeSwingAngle = 0;
}

export function applyDamageAndStatus(e, dmg, elem) {
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

export function attack(enemies, projectiles) {
  if (player.atkCooldown > 0) return;

  let w = WEAPONS[player.weaponKey] || LEGENDARY_WEAPONS[player.weaponKey] || WEAPONS.sword;
  let elem = ELEMENTS[player.elementKey] || ELEMENTS.none;
  let dmg = getWeaponDamage(player.weaponKey, player.tierKey);
  
  player.atkCooldown = w.cooldown;

  if (w.type === "melee") {
    // Melee animation: swing from -0.5 to 0.5 radians
    player.meleeSwingAngle = -0.5;
    
    enemies.forEach(e => {
      let dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist < (w.range + e.r)) {
        applyDamageAndStatus(e, dmg, elem);
      }
    });
    return;
  }

  let nearest = null, minDist = Infinity;
  enemies.forEach(e => {
    let d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < minDist) { minDist = d; nearest = e; }
  });

  let baseAngle = nearest ? Math.atan2(nearest.y - player.y, nearest.x - player.x) : 0;

  if (w.type === "shotgun") {
    for (let i = 0; i < w.count; i++) {
      let spreadAngle = baseAngle + (Math.random() - 0.5) * w.spread;
      projectiles.push({
        x: player.x, y: player.y, r: 5,
        vx: Math.cos(spreadAngle) * w.speed,
        vy: Math.sin(spreadAngle) * w.speed,
        life: w.range / w.speed,
        dmg: dmg,
        element: elem,
        color: elem.color,
        pierce: false
      });
    }
  }

  if (w.type === "pierce") {
    projectiles.push({
      x: player.x, y: player.y, r: 7,
      vx: Math.cos(baseAngle) * w.speed,
      vy: Math.sin(baseAngle) * w.speed,
      life: w.range / w.speed,
      dmg: dmg,
      element: elem,
      color: elem.color,
      pierce: true,
      hitList: []
    });
  }

  if (w.type === "homing") {
    projectiles.push({
      x: player.x, y: player.y, r: 8,
      vx: Math.cos(baseAngle) * w.speed,
      vy: Math.sin(baseAngle) * w.speed,
      speed: w.speed,
      turnRate: w.turnRate,
      life: w.range / w.speed,
      dmg: dmg,
      element: elem,
      color: elem.color,
      isHoming: true,
      pierce: false
    });
  }
}

export function updatePlayer(dt, W, H, enemies, projectiles, handleEnemyDeath) {
  if (player.atkCooldown > 0) player.atkCooldown -= dt;
  if (player.inv > 0) player.inv -= dt;
  if (player.dodge > 0) player.dodge -= dt;

  // Melee swing animation
  if (player.meleeSwingAngle !== 0) {
    player.meleeSwingAngle += 3.5 * dt; // Swing speed
    if (player.meleeSwingAngle > 0.5) player.meleeSwingAngle = 0;
  }

  // Movement from joystick or keyboard
  let moveX = joyMove.x;
  let moveY = joyMove.y;
  
  if (keys['w'] || keys['W']) moveY -= 1;
  if (keys['s'] || keys['S']) moveY += 1;
  if (keys['a'] || keys['A']) moveX -= 1;
  if (keys['d'] || keys['D']) moveX += 1;
  
  // Increased speed by 40%: was 195/130, now 273/182
  let speed = player.dodge > 0 ? 273 : 182;
  let distance = Math.hypot(moveX, moveY);
  
  if (distance > 0) {
    moveX /= distance;
    moveY /= distance;
  }
  
  player.x += moveX * speed * dt;
  player.y += moveY * speed * dt;
  
  // Keep player in bounds
  player.x = Math.max(player.r, Math.min(W - player.r, player.x));
  player.y = Math.max(player.r, Math.min(H - player.r, player.y));
}

export function dodge() {
  if (player.dodge <= 0) {
    player.dodge = 1.2;
    player.inv = 0.4;
  }
}

export function drawPlayer(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fillStyle = player.inv > 0 ? "#3498db" : "#2ecc71";
  ctx.fill();
  ctx.restore();

  // Draw melee weapon swing animation
  let w = WEAPONS[player.weaponKey] || LEGENDARY_WEAPONS[player.weaponKey] || WEAPONS.sword;
  if (w.type === "melee" && player.meleeSwingAngle !== 0) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.meleeSwingAngle);
    
    let ELEMENTS_MAP = { none: "#cccccc", fire: "#ff4500", ice: "#00bfff", lightning: "#ffd700" };
    ctx.strokeStyle = ELEMENTS_MAP[player.elementKey] || "#cccccc";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w.range, 0);
    ctx.stroke();
    
    ctx.restore();
  }
}
