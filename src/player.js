import { WEAPONS, TIERS, getWeaponDamage } from './weapons.js';
import { joyMove, keys } from './controls.js';

export const player = {
  x: 0, y: 0, r: 18,
  hp: 100, max: 100,
  atk: 0, dodge: 0, inv: 0,
  weaponKey: "sword",
  tierKey: "common"
};

function norm(x, y) {
  let n = Math.hypot(x, y) || 1;
  return [x / n, y / n];
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function updatePlayer(dt, W, H, enemies, projectiles, handleEnemyDeath) {
  player.atk = Math.max(0, player.atk - dt);
  player.dodge = Math.max(0, player.dodge - dt);
  player.inv = Math.max(0, player.inv - dt);

  let kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  let ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);

  let dx = joyMove.x || kx;
  let dy = joyMove.y || ky;

  if (joyMove.x === 0 && joyMove.y === 0 && (kx || ky)) {
    [dx, dy] = norm(kx, ky);
  }

  let speed = player.dodge > 0 ? 360 : 190;
  if (dx || dy) {
    player.x += dx * speed * dt;
    player.y += dy * speed * dt;
  }

  player.x = Math.max(30, Math.min(W - 30, player.x));
  player.y = Math.max(100, Math.min(H - 30, player.y));
}

export function attack(enemies, projectiles) {
  if (player.atk > 0 || player.hp <= 0) return;
  let w = WEAPONS[player.weaponKey];
  let dmg = getWeaponDamage(player.weaponKey, player.tierKey);
  player.atk = w.cooldown;

  if (w.type === "melee") {
    enemies.forEach(e => {
      if (dist(player, e) < w.range + e.r) {
        e.hp -= dmg;
        e.hit = 0.12;
      }
    });
  } else if (w.type === "ranged") {
    let targetX = player.x + 100, targetY = player.y;
    let nearest = null, minDist = Infinity;
    enemies.forEach(e => {
      let d = dist(player, e);
      if (d < minDist) { minDist = d; nearest = e; }
    });
    if (nearest) { targetX = nearest.x; targetY = nearest.y; }

    let [px, py] = norm(targetX - player.x, targetY - player.y);
    projectiles.push({
      x: player.x, y: player.y,
      vx: px * 560, vy: py * 560,
      r: w.name === "Longbow" ? 5 : 8,
      life: 1.4, isPlayer: true,
      dmg: dmg, color: w.color
    });
  }
}

export function dodge() {
  if (player.dodge > 0 || player.hp <= 0) return;
  player.dodge = 0.55;
  player.inv = 0.38;
}

export function drawPlayer(ctx) {
  let curW = WEAPONS[player.weaponKey];
  let curT = TIERS[player.tierKey];

  ctx.save();
  ctx.globalAlpha = player.inv > 0 ? 0.45 : 1;
  ctx.fillStyle = "#4d79b8";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = curT.color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + 24, player.y - 8);
  ctx.stroke();
  ctx.restore();

  if (player.atk > 0 && curW.type === "melee") {
    ctx.strokeStyle = curT.color;
    ctx.lineWidth = player.tierKey === "legendary" ? 7 : 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y, curW.range, -0.7, 0.7);
    ctx.stroke();
  }
}
