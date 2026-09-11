// A single hand-designed side-scrolling stage: start -> gauntlet -> mini-boss gate -> gauntlet -> boss -> goal.
export const GROUND_Y = 480;
export const LEVEL_WIDTH = 3600;
export const LEVEL_HEIGHT = 640;
export const GRAVITY = 1500;

// Solid rectangles the player/enemies collide with (ground + floating platforms).
// x, y = top-left. Ground segments have gaps (pits) the player must jump across.
export const platforms = [
  // Starting ground
  { x: 0, y: GROUND_Y, w: 620, h: 160 },
  // Gap (pit) here: 620 -> 760
  { x: 760, y: GROUND_Y, w: 420, h: 160 },
  // Floating step up
  { x: 1000, y: GROUND_Y - 90, w: 140, h: 20 },
  { x: 1220, y: GROUND_Y, w: 380, h: 160 },
  // Gap: 1600 -> 1720
  { x: 1720, y: GROUND_Y, w: 260, h: 160 },
  // Mini-boss arena (solid, flat)
  { x: 1980, y: GROUND_Y, w: 520, h: 160 },
  { x: 2500, y: GROUND_Y, w: 200, h: 160 },
  // Gap: 2700 -> 2820
  { x: 2820, y: GROUND_Y, w: 200, h: 160 },
  { x: 3020, y: GROUND_Y - 90, w: 160, h: 20 },
  // Boss arena
  { x: 3220, y: GROUND_Y, w: 380, h: 160 },
];

// Fixed enemy placements (id used so we don't respawn a killed enemy on scroll-back).
export const enemySpawns = [
  { id: "w1", type: "walker", x: 420, y: GROUND_Y - 40 },
  { id: "s1", type: "shooter", x: 900, y: GROUND_Y - 40 },
  { id: "w2", type: "walker", x: 1300, y: GROUND_Y - 40 },
  { id: "w3", type: "walker", x: 1480, y: GROUND_Y - 40 },
  { id: "s2", type: "shooter", x: 1800, y: GROUND_Y - 40 },
  { id: "miniboss", type: "miniboss", x: 2200, y: GROUND_Y - 60, trigger: 2020 },
  { id: "w4", type: "walker", x: 2560, y: GROUND_Y - 40 },
  { id: "s3", type: "shooter", x: 2870, y: GROUND_Y - 40 },
  { id: "w5", type: "walker", x: 3080, y: GROUND_Y - 40 },
  { id: "boss", type: "boss", x: 3480, y: GROUND_Y - 80, trigger: 3260 },
];

export const goal = { x: LEVEL_WIDTH - 60, y: GROUND_Y - 100, w: 40, h: 100 };
export const playerStart = { x: 60, y: GROUND_Y - 40 };

// Resolve an axis-aligned box (x,y,w,h,vx,vy) against all platforms.
// Mutates the entity's x/y/vx/vy and returns { onGround }.
export function resolveCollisions(ent, dt) {
  let onGround = false;

  // Horizontal move + resolve
  ent.x += ent.vx * dt;
  for (const p of platforms) {
    if (ent.x < p.x + p.w && ent.x + ent.w > p.x && ent.y < p.y + p.h && ent.y + ent.h > p.y) {
      if (ent.vx > 0) ent.x = p.x - ent.w;
      else if (ent.vx < 0) ent.x = p.x + p.w;
      ent.vx = 0;
    }
  }

  // Vertical move + resolve
  ent.y += ent.vy * dt;
  for (const p of platforms) {
    if (ent.x < p.x + p.w && ent.x + ent.w > p.x && ent.y < p.y + p.h && ent.y + ent.h > p.y) {
      if (ent.vy > 0) {
        ent.y = p.y - ent.h;
        ent.vy = 0;
        onGround = true;
      } else if (ent.vy < 0) {
        ent.y = p.y + p.h;
        ent.vy = 0;
      }
    }
  }

  return onGround;
}

export function isOverPit(x, w) {
  // True if there is no platform under the given horizontal span at ground level.
  for (const p of platforms) {
    if (x + w > p.x && x < p.x + p.w) return false;
  }
  return true;
}
