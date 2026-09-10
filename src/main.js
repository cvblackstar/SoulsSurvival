import { applyDamageAndStatus } from './player.js';
import { spawnMiniBoss, spawnMajorBoss } from './enemies.js';

// Inside handleEnemyDeath(e):
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

// Inside Projectile Loop in update(dt):
for (let i = projectiles.length - 1; i >= 0; i--) {
  let p = projectiles[i];

  // Homing Tracking Logic
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
