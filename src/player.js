import { LEVEL_WIDTH, GROUND_Y, platforms } from './level.js';
import { WEAPONS, LEGENDARY_WEAPONS, TIERS, getWeaponDamage } from './weapons.js';

export const player = {
  x: 50,
  y: 300,
  w: 24,
  h: 36,
  vx: 0,
  vy: 0,
  speed: 180,
  jumpForce: 420,
  grounded: false,
  hp: 100,
  max: 100,
  shield: 0,
  shieldMax: 0,
  weaponKey: 'broadsword',
  tierKey: 'common',
  elementKey: 'none',
  moveAxis: 0,
  isDashing: false,
  dashTimer: 0,
  dashCooldown: 0,
  attackCooldown: 0,
  facing: 1, // 1 = Right, -1 = Left
  animTimer: 0
};

export function resetPlayer() {
  player.x = 50;
  player.y = 300;
  player.vx = 0;
  player.vy = 0;
  player.hp = player.max;
  player.shield = player.shieldMax;
  player.grounded = false;
  player.isDashing = false;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.attackCooldown = 0;
  player.moveAxis = 0;
  player.facing = 1;
  player.animTimer = 0;
}

export function updatePlayer(dt, enemies, projectiles, onGameOver) {
  // Update Cooldowns
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;

  // Handle Dashing vs Normal Movement
  if (player.isDashing) {
    player.dashTimer -= dt;
    player.vx = player.facing * player.speed * 2.5;
    if (player.dashTimer <= 0) {
      player.isDashing = false;
    }
  } else {
    // Normal X Movement & Facing direction
    if (player.moveAxis !== 0) {
      player.facing = player.moveAxis > 0 ? 1 : -1;
      player.vx = player.moveAxis * player.speed;
      player.animTimer += dt * 10;
    } else {
      player.vx = 0;
      player.animTimer = 0;
    }
  }

  // Gravity integration
  player.vy += 1200 * dt;
  
  // Positional update
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Level horizontal bounds check
  player.x = Math.max(0, Math.min(LEVEL_WIDTH - player.w, player.x));

  // Platform collisions
  player.grounded = false;
  for (const p of platforms) {
    if (player.x + player.w > p.x && player.x < p.x + p.w) {
      if (player.y + player.h >= p.y && player.y + player.h - player.vy * dt <= p.y + 14) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.grounded = true;
      }
    }
  }

  // Floor collision
  if (player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.grounded = true;
  }

  // Check Game Over condition
  if (player.hp <= 0 && onGameOver) {
    onGameOver();
  }
}

export function attack(enemies, projectiles) {
  if (player.attackCooldown > 0) return;

  const w = WEAPONS[player.weaponKey] || LEGENDARY_WEAPONS[player.weaponKey];
  if (!w) return;

  const dmg = getWeaponDamage(player.weaponKey, player.tierKey);
  player.attackCooldown = w.cooldown || 0.35;

  if (w.type === 'ranged') {
    // Ranged projectile creation
    projectiles.push({
      x: player.x + (player.facing === 1 ? player.w + 4 : -10),
      y: player.y + player.h / 2 - 4,
      vx: player.facing * (w.projSpeed || 400),
      vy: 0,
      r: 5,
      dmg: dmg,
      elem: player.elementKey,
      from: 'player',
      life: 2.0,
      pierce: w.pierce || false,
      homing: w.homing || false,
      turnRate: w.turnRate || 0,
      hitList: []
    });
  } else {
    // Melee attack hitbox check
    const range = w.range || 40;
    const atkX = player.facing === 1 ? player.x + player.w : player.x - range;
    const atkY = player.y;
    const atkW = range;
    const atkH = player.h;

    for (const e of enemies) {
      if (atkX < e.x + e.w && atkX + atkW > e.x &&
          atkY < e.y + e.h && atkY + atkH > e.y) {
        if (typeof e.takeDamage === 'function') {
          e.takeDamage(dmg, player.elementKey);
        } else {
          e.hp -= dmg;
        }
      }
    }
  }
}

export function jump() {
  if (player.grounded) {
    player.vy = -player.jumpForce;
    player.grounded = false;
  }
}

export function dash() {
  if (player.dashCooldown <= 0 && !player.isDashing) {
    player.isDashing = true;
    player.dashTimer = 0.2;
    player.dashCooldown = 1.0;
  }
}

export function applyDamageAndStatus(dmg) {
  if (player.isDashing) return; // Invulnerable during dash

  if (player.shield > 0) {
    player.shield -= dmg;
    if (player.shield < 0) {
      player.hp += player.shield;
      player.shield = 0;
    }
  } else {
    player.hp -= dmg;
  }
  player.hp = Math.max(0, player.hp);
}

export function drawPlayer(ctx, camX, camY = 0) {
  const sx = player.x - camX;
  const sy = player.y - camY;

  ctx.save();
  ctx.translate(sx + player.w / 2, sy + player.h / 2);

  // Dash visual ghost effect
  if (player.isDashing) {
    ctx.fillStyle = "rgba(52, 152, 219, 0.4)";
    ctx.fillRect(-player.w / 2 - player.facing * 14, -player.h / 2, player.w, player.h);
  }

  // Horizontal flip for movement direction
  if (player.facing === -1) {
    ctx.scale(-1, 1);
  }

  // Main Body
  ctx.fillStyle = "#3498db";
  ctx.fillRect(-player.w / 2, -player.h / 2 + 8, player.w, player.h - 14);

  // Helmet Visor
  ctx.fillStyle = "#ecf0f1";
  ctx.fillRect(-player.w / 2 + 2, -player.h / 2, player.w - 4, 10);
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(1, -player.h / 2 + 3, 7, 3);

  // Animated Legs (Stretching stride based on movement speed)
  const isMoving = Math.abs(player.vx) > 5;
  const stride = isMoving ? Math.sin(player.animTimer) * 7 : 0;

  ctx.fillStyle = "#2c3e50";
  // Left & Right Leg Strides
  ctx.fillRect(-player.w / 2 + 3, player.h / 2 - 8, 5, 8 + (isMoving ? stride : 0));
  ctx.fillRect(player.w / 2 - 8, player.h / 2 - 8, 5, 8 - (isMoving ? stride : 0));

  // Animated Arm / Weapon Stance
  ctx.fillStyle = "#2980b9";
  ctx.fillRect(2, -2 - (isMoving ? stride * 0.5 : 0), 6, 10);

  ctx.restore();
}
