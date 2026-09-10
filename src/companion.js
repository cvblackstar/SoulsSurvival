export const wolf = { x: 0, y: 0, r: 15, hp: 100, max: 100, shootTimer: 0 };

export function resetCompanion(px, py) {
  wolf.x = px - 40;
  wolf.y = py;
  wolf.hp = 100;
  wolf.max = 100;
  wolf.shootTimer = 0;
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function norm(x, y) { let n = Math.hypot(x, y) || 1; return [x / n, y / n]; }

export function updateCompanion(dt, player, enemies, projectiles) {
  wolf.shootTimer = Math.max(0, wolf.shootTimer - dt);

  let nearestEnemy = null;
  let minDist = Infinity;
  enemies.forEach(e => {
    let d = dist(wolf, e);
    if (d < minDist) { minDist = d; nearestEnemy = e; }
  });

  if (nearestEnemy && minDist < 340) {
    if (wolf.shootTimer <= 0) {
      wolf.shootTimer = 0.80;
      let [px, py] = norm(nearestEnemy.x - wolf.x, nearestEnemy.y - wolf.y);
      projectiles.push({
        x: wolf.x, y: wolf.y,
        vx: px * 420, vy: py * 420,
        r: 6, life: 1.5, isPlayer: false,
        dmg: 30, color: "#70e0ff"
      });
    }

    if (minDist < 110) {
      let [kx, ky] = norm(wolf.x - nearestEnemy.x, wolf.y - nearestEnemy.y);
      wolf.x += kx * 125 * dt;
      wolf.y += ky * 125 * dt;
    }
  } else {
    let dPlayer = dist(wolf, player);
    if (dPlayer > 60) {
      let [x, y] = norm(player.x - wolf.x, player.y - wolf.y);
      wolf.x += x * 155 * dt;
      wolf.y += y * 155 * dt;
    }
  }
}

export function drawCompanion(ctx) {
  ctx.fillStyle = "#b58b5a";
  ctx.beginPath();
  ctx.arc(wolf.x, wolf.y, wolf.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#70e0ff";
  ctx.beginPath();
  ctx.arc(wolf.x, wolf.y, 4, 0, Math.PI * 2);
  ctx.fill();
}
