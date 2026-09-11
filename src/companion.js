// The wolf companion hovers/floats beside the player (ignores gravity & platforms)
// so it can keep up during jumps and gaps, and auto-fires at the nearest enemy.
export const wolf = { x: 0, y: 0, w: 26, h: 22, hp: 100, max: 100, shootTimer: 0 };

export function resetCompanion(px, py) {
  wolf.x = px - 40;
  wolf.y = py;
  wolf.hp = 100;
  wolf.max = 100;
  wolf.shootTimer = 0;
}

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

export function updateCompanion(dt, player, enemies, projectiles) {
  // Follow: hover near the player, offset behind their facing direction.
  const targetX = player.x - player.facing * 45;
  const targetY = player.y - 10;
  wolf.x += (targetX - wolf.x) * Math.min(1, dt * 4);
  wolf.y += (targetY - wolf.y) * Math.min(1, dt * 4);

  wolf.shootTimer -= dt;
  if (wolf.shootTimer <= 0 && enemies.length) {
    let nearest = null, best = Infinity;
    for (const e of enemies) {
      const d = dist(wolf.x, wolf.y, e.x + e.w / 2, e.y + e.h / 2);
      if (d < best && d < 420) { best = d; nearest = e; }
    }
    if (nearest) {
      const ang = Math.atan2((nearest.y + nearest.h / 2) - wolf.y, (nearest.x + nearest.w / 2) - wolf.x);
      const speed = 300;
      projectiles.push({
        x: wolf.x, y: wolf.y,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        r: 4, dmg: 8, elem: "none", life: 1.5, from: "companion"
      });
      wolf.shootTimer = 0.9;
    }
  }
}

export function drawCompanion(ctx, camX) {
  if (wolf.hp <= 0) return;
  const sx = wolf.x - camX;
  ctx.save();
  ctx.fillStyle = "#8899aa";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(sx, wolf.y + wolf.h / 2, wolf.w / 2, wolf.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cde";
  ctx.beginPath();
  ctx.arc(sx, wolf.y + 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
