import { WEAPONS, LEGENDARY_WEAPONS, TIERS, ELEMENTS, getWeaponDamage } from './weapons.js';
import { GROUND_Y, platforms, LEVEL_WIDTH } from './level.js';

export const player = {
  x: 60,
  y: 0,
  w: 28,
  h: 38,
  vx: 0,
  vy: 0,
  speed: 220,
  
  // Physics & Mechanics
  jumpForce: -520,             // Boosted jump power
  gravity: 1200,               // Smooth arcade gravity
  maxFallSpeed: 600,
  grounded: false,
  doubleJumpAvailable: true,   // Mid-air double jump for high platforms
  
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
  swingTimer: 0                // For melee slash FX
};

export function resetPlayer() {
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
}

export function jump() {
  // Ground jump
  if (player.grounded) {
    player.vy = player.jumpForce;
    player.grounded = false;
    player.doubleJumpAvailable = true;
  } 
  // Mid-air double jump
  else if (player.doubleJumpAvailable) {
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
  player.invulnTimer = 0.6; // i-frames duration
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
  // Cooldown & Timers
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.dashTimer > 0) player.dashTimer -= dt;
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;
  if (player.swingTimer > 0) player.swingTimer -= dt;

  // Horizontal Movement
  let currentSpeed = player.speed;
  if (player.dashTimer > 0) {
    currentSpeed *= 2.6;
  }

  player.vx = player.moveAxis * currentSpeed;
  if (player.moveAxis !== 0) {
    player.facing = player.moveAxis > 0 ? 1 : -1;
  }

  // Gravity
  player.vy += player.gravity * dt;
  if (player.vy > player.maxFallSpeed) {
    player.vy = player.maxFallSpeed;
  }

  // Predict position using prevY for precise collision detection
  const prevY = player.y;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Level Bound Clamping
  player.x = Math.max(0, Math.min(LEVEL_WIDTH - player.w, player.x));

  // Reset grounded status each frame
  player.grounded = false;

  // Platform Top Collisions (Only triggers when falling downwards)
  if (player.vy >= 0 && platforms && Array.isArray(platforms)) {
    for (const p of platforms) {
      if (
        player.x + player.w > p.x &&
        player.x < p.x + p.w &&
        prevY + player.h <= p.y + 4 &&
        player.y + player.h >= p.y
      ) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.grounded = true;
        player.doubleJumpAvailable = true;
        break;
      }
    }
  }

  // Ground Collision
  if (player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.grounded = true;
    player.doubleJumpAvailable = true;
  }

  // Game over check
  if (player.hp <= 0) {
    onGameOver();
  }
}

export function drawPlayer(ctx, camX, camY) {
  const sx = player.x - camX;
  const sy = player.y - camY;

  ctx.save();

  // Flashing effect on invulnerability
  if (player.invulnTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // Dash ghost trail
  if (player.dashTimer > 0) {
    ctx.fillStyle = "rgba(231, 76, 60, 0.35)";
    ctx.fillRect(sx - player.facing * 12, sy, player.w, player.h);
  }

  // Character Body
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(sx, sy, player.w, player.h);

  // Facing Eye
  ctx.fillStyle = "#ffffff";
  const eyeX = player.facing === 1 ? sx + player.w - 8 : sx + 2;
  ctx.fillRect(eyeX, sy + 8, 6, 6);

  // Melee Swing Visual Effect
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
