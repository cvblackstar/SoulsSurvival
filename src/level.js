import { WEAPONS, LEGENDARY_WEAPONS, TIERS, ELEMENTS, getWeaponDamage } from './weapons.js';
import { GROUND_Y, LEVEL_WIDTH, LEVEL_HEIGHT, GRAVITY, resolveCollisions } from './level.js';

export const player = {
  x: 60,
  y: GROUND_Y - 40,
  w: 28,
  h: 38,
  vx: 0,
  vy: 0,
  speed: 220,
  
  // Physics & Mechanics
  jumpForce: -550,             // Jump power scaled for GRAVITY = 1500
  maxFallSpeed: 700,
  grounded: false,
  doubleJumpAvailable: true,   // Mid-air double jump for wide gaps
  
  // Safe position tracking for pit respawns
  lastSafeX: 60,
  lastSafeY: GROUND_Y - 40,
  
  // Stats
  hp: 100,
  max: 100,
  shield: 0,
  shieldMax: 0,
  
  // Controls & Direction
  moveAxis: 0,
  facing: 1,
  
  // Equipment
  weaponKey: 'sword',
  tierKey: 'common',
  elementKey: 'none',
  
  // Timers & State
  attackCooldown: 0,
  dashTimer: 0,
  dashCooldown: 0,
  invulnTimer: 0,
  swingTimer: 0
};

export function resetPlayer() {
  player.x = 60;
  player.y = GROUND_Y - 40;
  player.hp = player.max;
  player.shield = player.shieldMax;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.doubleJumpAvailable = true;
  player.attackCooldown = 0;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.invulnTimer = 0;
  player.swingTimer = 0;
  player.lastSafeX = 60;
  player.lastSafeY = GROUND_Y - 40;
}

export function jump() {
  if (player.grounded) {
    player.vy = player.jumpForce;
    player.grounded = false;
    player.doubleJumpAvailable = true;
  } else if (player.doubleJumpAvailable) {
    player.vy = player.jumpForce * 0.88;
    player.doubleJumpAvailable = false;
  }
}

export function dash() {
  if (player.dashCooldown <= 0) {
    player.dashTimer = 0.18;
    player.dashCooldown = 0.8;
  }
}

export function applyDamageAndStatus(dmg) {
  if (player.invulnTimer > 0) return;
  
  let remaining = dmg;
  if (player.shield > 0) {
    if (player.shield >= remaining) {
      player.shield -= remaining;
      remaining = 0;
    } else {
      remaining -= player.shield;
      player.shield = 0;
    }
  }
  
  player.hp = Math.max(0, player.hp - remaining);
  player.invulnTimer = 0.6;
}

export function attack(enemies, projectiles) {
  if (player.attackCooldown > 0) return;

  const w = WEAPONS[player.weaponKey] || LEGENDARY_WEAPONS[player.weaponKey] || WEAPONS.sword;
  const dmg = getWeaponDamage(player.weaponKey, player.tierKey);
  const elem = player.elementKey || "none";

  player.attackCooldown = w.cooldown || 0.4;

  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;

  if (w.type === "melee") {
    player.swingTimer = 0.18;
    const hitBoxW = w.range || 45;
    const hitX = player.facing === 1 ? player.x + player.w : player.x - hitBoxW;
    const hitY = player.y - 10;
    const hitH = player.h + 20;

    for (const e of enemies) {
      if (e.x < hitX + hitBoxW && e.x + e.w > hitX &&
          e.y < hitY + hitH && e.y + e.h > hitY) {
        if (typeof e.hp === 'number') {
          e.hp -= dmg;
          if (e.hp <= 0 && e.onDeath) e.onDeath();
        }
      }
    }
  } 
  else if (w.type === "shotgun") {
    const count = w.count || 4;
    const spread = w.spread || 0.45;
    const baseAngle = player.facing === 1 ? 0 : Math.PI;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = w.speed || 380;
      projectiles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 4,
        dmg: dmg,
        elem: elem,
        from: 'player',
        life: (w.range || 140) / speed
      });
    }
  } 
  else if (w.type === "pierce") {
    const vx = player.facing * (w.speed || 650);
    projectiles.push({
      x: px,
      y: py,
      vx: vx,
      vy: 0,
      r: 6,
      dmg: dmg,
      elem: elem,
      from: 'player',
      pierce: true,
      hitList: [],
      life: (w.range || 600) / (w.speed || 650)
    });
  } 
  else if (w.type === "homing") {
    const speed = w.speed || 220;
    const vx = player.facing * speed;
    projectiles.push({
      x: px,
      y: py,
      vx: vx,
      vy: -50,
      r: 7,
      dmg: dmg,
      elem: elem,
      from: 'player',
      homing: true,
      turnRate: w.turnRate || 4.5,
      life: (w.range || 450) / speed
    });
  }
}

export function updatePlayer(dt, enemies, projectiles, onGameOver) {
  // Timers
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.dashTimer > 0) player.dashTimer -= dt;
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;
  if (player.swingTimer > 0) player.swingTimer -= dt;

  // Horizontal Speed
  let currentSpeed = player.speed;
  if (player.dashTimer > 0) {
    currentSpeed *= 2.6;
  }

  player.vx = player.moveAxis * currentSpeed;
  if (player.moveAxis !== 0) {
    player.facing = player.moveAxis > 0 ? 1 : -1;
  }

  // Apply Gravity from level.js
  player.vy += GRAVITY * dt;
  if (player.vy > player.maxFallSpeed) {
    player.vy = player.maxFallSpeed;
  }

  // Unified Physics Resolution (Handles X movement, Y movement, and AABB platform collisions)
  const isGrounded = resolveCollisions(player, dt);
  
  if (isGrounded) {
    player.grounded = true;
    player.doubleJumpAvailable = true;
    
    // Save standing position for pit respawns
    player.lastSafeX = player.x;
    player.lastSafeY = player.y;
  } else {
    player.grounded = false;
  }

  // Fall Pit Detection (Fell beneath the level floor)
  const bottomThreshold = LEVEL_HEIGHT + 100;
  if (player.y > bottomThreshold) {
    applyDamageAndStatus(25); // Fall damage
    
    // Respawn at last safe platform position
    player.x = player.lastSafeX;
    player.y = player.lastSafeY - 20;
    player.vx = 0;
    player.vy = 0;
  }

  // Trigger game over if health drops to 0
  if (player.hp <= 0) {
    onGameOver();
  }
}

export function drawPlayer(ctx, camX, camY) {
  const sx = player.x - camX;
  const sy = player.y - camY;

  ctx.save();

  // Flashing effect during invulnerability
  if (player.invulnTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // Dash ghost trail
  if (player.dashTimer > 0) {
    ctx.fillStyle = "rgba(231, 76, 60, 0.35)";
    ctx.fillRect(sx - player.facing * 12, sy, player.w, player.h);
  }

  // Body
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(sx, sy, player.w, player.h);

  // Direction Eye
  ctx.fillStyle = "#ffffff";
  const eyeX = player.facing === 1 ? sx + player.w - 8 : sx + 2;
  ctx.fillRect(eyeX, sy + 8, 6, 6);

  // Melee Attack Swing Arc
  if (player.swingTimer > 0) {
    const w = WEAPONS[player.weaponKey] || LEGENDARY_WEAPONS[player.weaponKey] || WEAPONS.sword;
    const range = w.range || 45;
    const elemColor = ELEMENTS[player.elementKey]?.color || "#ffffff";

    ctx.strokeStyle = elemColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    const arcX = player.facing === 1 ? sx + player.w : sx;
    ctx.arc(
      arcX,
      sy + player.h / 2,
      range,
      player.facing === 1 ? -Math.PI / 3 : Math.PI - Math.PI / 3,
      player.facing === 1 ? Math.PI / 3 : Math.PI + Math.PI / 3
    );
    ctx.stroke();
  }

  ctx.restore();
}
