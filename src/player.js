import { WEAPONS, LEGENDARY_WEAPONS, TIERS, ELEMENTS, getWeaponDamage } from './weapons.js';
import { GRAVITY, resolveCollisions, playerStart } from './level.js';

const MOVE_SPEED = 220;
const JUMP_VELOCITY = -600;
const MAX_FALL = 900;
const DASH_SPEED = 520;
const DASH_TIME = 0.16;
const DASH_COOLDOWN = 0.55;
const COYOTE_TIME = 0.1;

export const player = {
  x: playerStart.x, y: playerStart.y, w: 28, h: 40,
  vx: 0, vy: 0,
  facing: 1,
  onGround: false,
  coyote: 0,
  hp: 100, max: 100,
  atkCooldown: 0,
  meleeSwingAngle: 0,
  dashTimer: 0, dashCooldown: 0, invuln: 0,
  weaponKey: "sword", tierKey: "common", elementKey: "none",
  moveLeft: false, moveRight: false
};

export function resetPlayer() {
  player.x = playerStart.x;
  player.y = playerStart.y;
  player.vx = 0; player.vy = 0;
  player.facing = 1;
  player.onGround = false;
  player.coyote = 0;
  player.hp = 100;
  player.max = 100;
  player.atkCooldown = 0;
  player.meleeSwingAngle = 0;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.invuln = 1.0;
  player.weaponKey = "sword";
  player.tierKey = "common";
  player.elementKey = "none";
  player.moveLeft = false;
  player.moveRight = false;
}

export function jump() {
  if (player.onGround || player.coyote > 0) {
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
    player.coyote = 0;
  }
}

export function dash() {
  if (player.dashCooldown <= 0 && player.dashTimer <= 0) {
    player.dashTimer = DASH_TIME;
    player.dashCooldown = DASH_COOLDOWN;
    player.invuln = Math.max(player.invuln, DASH_TIME + 0.1);
  }
}

function currentWeapon() {
  return WEAPONS[player.weaponKey] || LEGENDARY_WEAPONS[player.weaponKey] || WEAPONS.sword;
}

export function attack(enemies, projectiles) {
  if (player.atkCooldown > 0) return;
  let w = currentWeapon();
  let elem = ELEMENTS[player.elementKey] || ELEMENTS.none;
  let dmg = getWeaponDamage(player.weaponKey, player.tierKey);
  player.atkCooldown = w.cooldown;

  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const dir = player.facing;

  if (w.type === "melee") {
    player.meleeSwingAngle = -0.7 * dir;
    for (const e of enemies) {
      const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
      const inFront = (ex - cx) * dir > -10;
      const dist = Math.hypot(ex - cx, ey - cy);
      if (inFront && dist < w.range) {
        e.hp -= dmg;
        e.hitFlash = 0.12;
        if (elem.effect === "burn") e.burn = 2.0;
        if (elem.effect === "slow") e.slow = 2.0;
        if (elem.effect === "stun") e.stun = 0.8;
      }
    }
  } else if (w.type === "shotgun") {
    for (let i = 0; i < w.count; i++) {
      const spread = (i - (w.count - 1) / 2) * (w.spread / w.count) * 2;
      projectiles.push({
        x: cx, y: cy,
        vx: Math.cos(spread) * w.speed * dir,
        vy: Math.sin(spread) * w.speed,
        r: 4, dmg, elem: player.elementKey, life: 1.2, from: "player"
      });
    }
  } else if (w.type === "pierce") {
    projectiles.push({
      x: cx, y: cy, vx: w.speed * dir, vy: 0, r: 5, dmg,
      elem: player.elementKey, life: 1.5, pierce: true, hitList: [], from: "player"
    });
  } else if (w.type === "homing") {
    projectiles.push({
      x: cx, y: cy, vx: w.speed * dir, vy: 0, r: 5, dmg,
      elem: player.elementKey, life: 2.0, homing: true, turnRate: w.turnRate, from: "player"
    });
  }
}

export function applyDamageAndStatus(dmg) {
  if (player.invuln > 0) return;
  player.hp = Math.max(0, player.hp - dmg);
  player.invuln = 0.6;
}

export function updatePlayer(dt, enemies, projectiles, onDeath) {
  if (player.atkCooldown > 0) player.atkCooldown -= dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.dashCooldown > 0) player.dashCooldown -= dt;

  if (player.meleeSwingAngle !== 0) {
    const step = 4.5 * dt;
    if (player.meleeSwingAngle > 0) player.meleeSwingAngle = Math.max(0, player.meleeSwingAngle - step);
    else player.meleeSwingAngle = Math.min(0, player.meleeSwingAngle + step);
  }

  // Horizontal movement
  let moveDir = 0;
  if (player.moveLeft) moveDir -= 1;
  if (player.moveRight) moveDir += 1;
  if (moveDir !== 0) player.facing = moveDir;

  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    player.vx = player.facing * DASH_SPEED;
  } else {
    player.vx = moveDir * MOVE_SPEED;
  }

  // Gravity
  player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * dt);

  const wasOnGround = player.onGround;
  player.onGround = resolveCollisions(player, dt);
  if (wasOnGround && !player.onGround) player.coyote = COYOTE_TIME;
  else if (player.coyote > 0) player.coyote -= dt;

  // Fall into a pit = instant death
  if (player.y > 900) {
    player.hp = 0;
  }

  if (player.hp <= 0 && onDeath) onDeath();
}

export function drawPlayer(ctx, camX) {
  const sx = player.x - camX;
  ctx.save();

  if (player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  ctx.fillStyle = "#e0d8c0";
  ctx.fillRect(sx, player.y, player.w, player.h);
  ctx.fillStyle = "#5a4632";
  ctx.fillRect(sx, player.y, player.w, 10);

  // Melee swing arc
  const w = currentWeapon();
  if (w.type === "melee" && player.meleeSwingAngle !== 0) {
    const cx = sx + player.w / 2, cy = player.y + player.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.meleeSwingAngle);
    const elem = ELEMENTS[player.elementKey] || ELEMENTS.none;
    ctx.strokeStyle = elem.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w.range * player.facing, 0);
    ctx.stroke();
    ctx.restore();
  } else if (w.type !== "melee") {
    ctx.fillStyle = "#ffcc66";
    ctx.fillRect(sx + (player.facing > 0 ? player.w : -6), player.y + player.h / 2 - 2, 6, 4);
  }

  ctx.restore();
}
