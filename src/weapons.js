export const TIERS = {
  common:    { name: "Common",    mult: 1.0, color: "#a0a0a0" },
  rare:      { name: "Rare",      mult: 1.4, color: "#00b0ff" },
  epic:      { name: "Epic",      mult: 1.9, color: "#aa00ff" },
  legendary: { name: "Legendary", mult: 2.6, color: "#ffd700" }
};

export const WEAPONS = {
  sword:     { name: "Broadsword",     baseDmg: 30, range: 75,  cooldown: 0.30, color: "#d9d9d9", type: "melee" },
  wand:      { name: "Magic Wand",    baseDmg: 20, range: 280, cooldown: 0.18, color: "#00e5ff", type: "ranged" },
  axe:       { name: "Heavy Axe",     baseDmg: 60, range: 90,  cooldown: 0.55, color: "#ff9100", type: "melee" },
  daggers:   { name: "Shadow Daggers",baseDmg: 24, range: 50,  cooldown: 0.12, color: "#b388ff", type: "melee" },
  bow:       { name: "Longbow",        baseDmg: 42, range: 450, cooldown: 0.45, color: "#c0ca33", type: "ranged" },
  ice:       { name: "Ice Staff",      baseDmg: 35, range: 320, cooldown: 0.32, color: "#80d8ff", type: "ranged" },
  excalibur: { name: "Excalibur",      baseDmg: 110, range: 130, cooldown: 0.35, color: "#ffee58", type: "melee", isLegendaryOnly: true },
  mjolnir:   { name: "Mjolnir Bolt",   baseDmg: 95,  range: 500, cooldown: 0.28, color: "#ffea00", type: "ranged", isLegendaryOnly: true },
  voidScythe:{ name: "Void Reaper",    baseDmg: 85,  range: 110, cooldown: 0.20, color: "#e040fb", type: "melee", isLegendaryOnly: true }
};

export function getWeaponDamage(wKey, tKey) {
  let base = WEAPONS[wKey].baseDmg;
  let mult = TIERS[tKey].mult;
  return Math.round(base * mult);
}
