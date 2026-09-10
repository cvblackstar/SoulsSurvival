export const ELEMENTS = {
  none: { name: "Physical", color: "#cccccc", effect: null },
  fire: { name: "Fire", color: "#ff4500", effect: "burn" },
  ice: { name: "Ice", color: "#00bfff", effect: "slow" },
  lightning: { name: "Lightning", color: "#ffd700", effect: "stun" }
};

export const TIERS = {
  common: { name: "Common", color: "#ffffff", mult: 1.0 },
  rare: { name: "Rare", color: "#1e90ff", mult: 1.4 },
  epic: { name: "Epic", color: "#9370db", mult: 1.9 },
  legendary: { name: "Legendary", color: "#ffa500", mult: 2.6 }
};

export const WEAPONS = {
  sword: { name: "Broadsword", type: "melee", baseDmg: 25, range: 45, cooldown: 0.4 },
  shotgun: { name: "Blunderbuss", type: "shotgun", baseDmg: 12, count: 4, range: 140, spread: 0.45, speed: 380, cooldown: 0.8 },
  pierce: { name: "Arbalest", type: "pierce", baseDmg: 40, range: 600, speed: 650, cooldown: 1.1 },
  homing: { name: "Spirit Orb", type: "homing", baseDmg: 18, range: 450, speed: 220, turnRate: 4.5, cooldown: 0.6 }
};

export function getWeaponDamage(weaponKey, tierKey) {
  let w = WEAPONS[weaponKey] || WEAPONS.sword;
  let t = TIERS[tierKey] || TIERS.common;
  return Math.round(w.baseDmg * t.mult);
}
