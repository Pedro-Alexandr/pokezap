// ═══════════════════════════════════════════════
//  DADOS DE POKÉMON - 4 REGIÕES
//  Cada Pokémon tem: id, name, type, region,
//  baseHp, baseAtk, baseDef, baseSpd, rarity,
//  moves[]
// ═══════════════════════════════════════════════

const POKEMON_DATA = {
  // ── KANTO (Gen 1) ─────────────────────────────
  1:   { id: 1,   name: 'Bulbasaur',   type: ['Grass','Poison'],   region: 'kanto',  baseHp: 45, baseAtk: 49, baseDef: 49, baseSpd: 45, rarity: 'incomum',  emoji: '🌿' },
  2:   { id: 2,   name: 'Ivysaur',     type: ['Grass','Poison'],   region: 'kanto',  baseHp: 60, baseAtk: 62, baseDef: 63, baseSpd: 60, rarity: 'raro',     emoji: '🌿' },
  3:   { id: 3,   name: 'Venusaur',    type: ['Grass','Poison'],   region: 'kanto',  baseHp: 80, baseAtk: 82, baseDef: 83, baseSpd: 80, rarity: 'épico',    emoji: '🌿' },
  4:   { id: 4,   name: 'Charmander',  type: ['Fire'],             region: 'kanto',  baseHp: 39, baseAtk: 52, baseDef: 43, baseSpd: 65, rarity: 'incomum',  emoji: '🔥' },
  5:   { id: 5,   name: 'Charmeleon',  type: ['Fire'],             region: 'kanto',  baseHp: 58, baseAtk: 64, baseDef: 58, baseSpd: 80, rarity: 'raro',     emoji: '🔥' },
  6:   { id: 6,   name: 'Charizard',   type: ['Fire','Flying'],    region: 'kanto',  baseHp: 78, baseAtk: 84, baseDef: 78, baseSpd: 100, rarity: 'épico',   emoji: '🔥' },
  7:   { id: 7,   name: 'Squirtle',    type: ['Water'],            region: 'kanto',  baseHp: 44, baseAtk: 48, baseDef: 65, baseSpd: 43, rarity: 'incomum',  emoji: '💧' },
  8:   { id: 8,   name: 'Wartortle',   type: ['Water'],            region: 'kanto',  baseHp: 59, baseAtk: 63, baseDef: 80, baseSpd: 58, rarity: 'raro',     emoji: '💧' },
  9:   { id: 9,   name: 'Blastoise',   type: ['Water'],            region: 'kanto',  baseHp: 79, baseAtk: 83, baseDef: 100, baseSpd: 78, rarity: 'épico',   emoji: '💧' },
  25:  { id: 25,  name: 'Pikachu',     type: ['Electric'],         region: 'kanto',  baseHp: 35, baseAtk: 55, baseDef: 40, baseSpd: 90, rarity: 'incomum',  emoji: '⚡' },
  26:  { id: 26,  name: 'Raichu',      type: ['Electric'],         region: 'kanto',  baseHp: 60, baseAtk: 90, baseDef: 55, baseSpd: 110, rarity: 'raro',    emoji: '⚡' },
  39:  { id: 39,  name: 'Jigglypuff',  type: ['Normal','Fairy'],   region: 'kanto',  baseHp: 115, baseAtk: 45, baseDef: 20, baseSpd: 20, rarity: 'comum',   emoji: '🌸' },
  52:  { id: 52,  name: 'Meowth',      type: ['Normal'],           region: 'kanto',  baseHp: 40, baseAtk: 45, baseDef: 35, baseSpd: 90, rarity: 'comum',    emoji: '😸' },
  54:  { id: 54,  name: 'Psyduck',     type: ['Water'],            region: 'kanto',  baseHp: 50, baseAtk: 52, baseDef: 48, baseSpd: 55, rarity: 'comum',    emoji: '🦆' },
  58:  { id: 58,  name: 'Growlithe',   type: ['Fire'],             region: 'kanto',  baseHp: 55, baseAtk: 70, baseDef: 45, baseSpd: 60, rarity: 'incomum',  emoji: '🔥' },
  63:  { id: 63,  name: 'Abra',        type: ['Psychic'],          region: 'kanto',  baseHp: 25, baseAtk: 20, baseDef: 15, baseSpd: 90, rarity: 'incomum',  emoji: '🔮' },
  66:  { id: 66,  name: 'Machop',      type: ['Fighting'],         region: 'kanto',  baseHp: 70, baseAtk: 80, baseDef: 50, baseSpd: 35, rarity: 'comum',    emoji: '🥊' },
  74:  { id: 74,  name: 'Geodude',     type: ['Rock','Ground'],    region: 'kanto',  baseHp: 40, baseAtk: 80, baseDef: 100, baseSpd: 20, rarity: 'comum',   emoji: '🪨' },
  92:  { id: 92,  name: 'Gastly',      type: ['Ghost','Poison'],   region: 'kanto',  baseHp: 30, baseAtk: 35, baseDef: 30, baseSpd: 80, rarity: 'incomum',  emoji: '👻' },
  143: { id: 143, name: 'Snorlax',     type: ['Normal'],           region: 'kanto',  baseHp: 160, baseAtk: 110, baseDef: 65, baseSpd: 30, rarity: 'raro',   emoji: '😴' },
  144: { id: 144, name: 'Articuno',    type: ['Ice','Flying'],     region: 'kanto',  baseHp: 90, baseAtk: 85, baseDef: 100, baseSpd: 85, rarity: 'lendário', emoji: '❄️' },
  145: { id: 145, name: 'Zapdos',      type: ['Electric','Flying'],region: 'kanto',  baseHp: 90, baseAtk: 90, baseDef: 85, baseSpd: 100, rarity: 'lendário', emoji: '⚡' },
  146: { id: 146, name: 'Moltres',     type: ['Fire','Flying'],    region: 'kanto',  baseHp: 90, baseAtk: 100, baseDef: 90, baseSpd: 90, rarity: 'lendário', emoji: '🔥' },
  150: { id: 150, name: 'Mewtwo',      type: ['Psychic'],          region: 'kanto',  baseHp: 106, baseAtk: 110, baseDef: 90, baseSpd: 130, rarity: 'mítico', emoji: '🌀' },

  // ── JOHTO (Gen 2) ─────────────────────────────
  152: { id: 152, name: 'Chikorita',   type: ['Grass'],            region: 'johto',  baseHp: 45, baseAtk: 49, baseDef: 65, baseSpd: 45, rarity: 'incomum',  emoji: '🍃' },
  153: { id: 153, name: 'Bayleef',     type: ['Grass'],            region: 'johto',  baseHp: 60, baseAtk: 62, baseDef: 80, baseSpd: 60, rarity: 'raro',     emoji: '🍃' },
  154: { id: 154, name: 'Meganium',    type: ['Grass'],            region: 'johto',  baseHp: 80, baseAtk: 82, baseDef: 100, baseSpd: 80, rarity: 'épico',   emoji: '🌺' },
  155: { id: 155, name: 'Cyndaquil',   type: ['Fire'],             region: 'johto',  baseHp: 39, baseAtk: 52, baseDef: 43, baseSpd: 65, rarity: 'incomum',  emoji: '🔥' },
  156: { id: 156, name: 'Quilava',     type: ['Fire'],             region: 'johto',  baseHp: 58, baseAtk: 64, baseDef: 58, baseSpd: 80, rarity: 'raro',     emoji: '🔥' },
  157: { id: 157, name: 'Typhlosion',  type: ['Fire'],             region: 'johto',  baseHp: 78, baseAtk: 84, baseDef: 78, baseSpd: 100, rarity: 'épico',   emoji: '🔥' },
  158: { id: 158, name: 'Totodile',    type: ['Water'],            region: 'johto',  baseHp: 50, baseAtk: 65, baseDef: 64, baseSpd: 43, rarity: 'incomum',  emoji: '🐊' },
  159: { id: 159, name: 'Croconaw',    type: ['Water'],            region: 'johto',  baseHp: 65, baseAtk: 80, baseDef: 80, baseSpd: 58, rarity: 'raro',     emoji: '🐊' },
  160: { id: 160, name: 'Feraligatr',  type: ['Water'],            region: 'johto',  baseHp: 85, baseAtk: 105, baseDef: 100, baseSpd: 78, rarity: 'épico',  emoji: '🐊' },
  175: { id: 175, name: 'Togepi',      type: ['Fairy'],            region: 'johto',  baseHp: 35, baseAtk: 20, baseDef: 65, baseSpd: 20, rarity: 'raro',     emoji: '🥚' },
  183: { id: 183, name: 'Marill',      type: ['Water','Fairy'],    region: 'johto',  baseHp: 70, baseAtk: 20, baseDef: 50, baseSpd: 40, rarity: 'comum',    emoji: '💧' },
  196: { id: 196, name: 'Espeon',      type: ['Psychic'],          region: 'johto',  baseHp: 65, baseAtk: 65, baseDef: 60, baseSpd: 110, rarity: 'raro',    emoji: '🔮' },
  197: { id: 197, name: 'Umbreon',     type: ['Dark'],             region: 'johto',  baseHp: 95, baseAtk: 65, baseDef: 110, baseSpd: 65, rarity: 'raro',    emoji: '🌑' },
  212: { id: 212, name: 'Scizor',      type: ['Bug','Steel'],      region: 'johto',  baseHp: 70, baseAtk: 130, baseDef: 100, baseSpd: 65, rarity: 'raro',   emoji: '✂️' },
  214: { id: 214, name: 'Heracross',   type: ['Bug','Fighting'],   region: 'johto',  baseHp: 80, baseAtk: 125, baseDef: 75, baseSpd: 85, rarity: 'raro',    emoji: '🦖' },
  245: { id: 245, name: 'Suicune',     type: ['Water'],            region: 'johto',  baseHp: 100, baseAtk: 75, baseDef: 115, baseSpd: 85, rarity: 'lendário', emoji: '💧' },
  243: { id: 243, name: 'Raikou',      type: ['Electric'],         region: 'johto',  baseHp: 90, baseAtk: 85, baseDef: 75, baseSpd: 115, rarity: 'lendário', emoji: '⚡' },
  244: { id: 244, name: 'Entei',       type: ['Fire'],             region: 'johto',  baseHp: 115, baseAtk: 115, baseDef: 85, baseSpd: 100, rarity: 'lendário', emoji: '🔥' },
  249: { id: 249, name: 'Lugia',       type: ['Psychic','Flying'], region: 'johto',  baseHp: 106, baseAtk: 90, baseDef: 130, baseSpd: 110, rarity: 'mítico', emoji: '🌊' },
  250: { id: 250, name: 'Ho-Oh',       type: ['Fire','Flying'],    region: 'johto',  baseHp: 106, baseAtk: 130, baseDef: 90, baseSpd: 90, rarity: 'mítico', emoji: '🌈' },

  // ── HOENN (Gen 3) ─────────────────────────────
  252: { id: 252, name: 'Treecko',     type: ['Grass'],            region: 'hoenn',  baseHp: 40, baseAtk: 45, baseDef: 35, baseSpd: 70, rarity: 'incomum',  emoji: '🦎' },
  253: { id: 253, name: 'Grovyle',     type: ['Grass'],            region: 'hoenn',  baseHp: 50, baseAtk: 65, baseDef: 45, baseSpd: 95, rarity: 'raro',     emoji: '🦎' },
  254: { id: 254, name: 'Sceptile',    type: ['Grass'],            region: 'hoenn',  baseHp: 70, baseAtk: 85, baseDef: 65, baseSpd: 120, rarity: 'épico',   emoji: '🦎' },
  255: { id: 255, name: 'Torchic',     type: ['Fire'],             region: 'hoenn',  baseHp: 45, baseAtk: 60, baseDef: 40, baseSpd: 45, rarity: 'incomum',  emoji: '🐥' },
  256: { id: 256, name: 'Combusken',   type: ['Fire','Fighting'],  region: 'hoenn',  baseHp: 60, baseAtk: 85, baseDef: 60, baseSpd: 55, rarity: 'raro',     emoji: '🐓' },
  257: { id: 257, name: 'Blaziken',    type: ['Fire','Fighting'],  region: 'hoenn',  baseHp: 80, baseAtk: 120, baseDef: 70, baseSpd: 80, rarity: 'épico',   emoji: '🔥' },
  258: { id: 258, name: 'Mudkip',      type: ['Water'],            region: 'hoenn',  baseHp: 50, baseAtk: 70, baseDef: 50, baseSpd: 40, rarity: 'incomum',  emoji: '🌊' },
  259: { id: 259, name: 'Marshtomp',   type: ['Water','Ground'],   region: 'hoenn',  baseHp: 70, baseAtk: 85, baseDef: 70, baseSpd: 50, rarity: 'raro',     emoji: '🌊' },
  260: { id: 260, name: 'Swampert',    type: ['Water','Ground'],   region: 'hoenn',  baseHp: 100, baseAtk: 110, baseDef: 90, baseSpd: 60, rarity: 'épico',  emoji: '🌊' },
  280: { id: 280, name: 'Ralts',       type: ['Psychic','Fairy'],  region: 'hoenn',  baseHp: 28, baseAtk: 25, baseDef: 25, baseSpd: 40, rarity: 'incomum',  emoji: '🔮' },
  282: { id: 282, name: 'Gardevoir',   type: ['Psychic','Fairy'],  region: 'hoenn',  baseHp: 68, baseAtk: 65, baseDef: 65, baseSpd: 80, rarity: 'raro',     emoji: '🔮' },
  302: { id: 302, name: 'Sableye',     type: ['Dark','Ghost'],     region: 'hoenn',  baseHp: 50, baseAtk: 75, baseDef: 75, baseSpd: 50, rarity: 'raro',     emoji: '👁️' },
  334: { id: 334, name: 'Altaria',     type: ['Dragon','Flying'],  region: 'hoenn',  baseHp: 75, baseAtk: 70, baseDef: 90, baseSpd: 80, rarity: 'raro',     emoji: '🐉' },
  350: { id: 350, name: 'Milotic',     type: ['Water'],            region: 'hoenn',  baseHp: 95, baseAtk: 60, baseDef: 79, baseSpd: 81, rarity: 'raro',     emoji: '🐍' },
  373: { id: 373, name: 'Salamence',   type: ['Dragon','Flying'],  region: 'hoenn',  baseHp: 95, baseAtk: 135, baseDef: 80, baseSpd: 100, rarity: 'épico',  emoji: '🐉' },
  380: { id: 380, name: 'Latias',      type: ['Dragon','Psychic'], region: 'hoenn',  baseHp: 80, baseAtk: 80, baseDef: 90, baseSpd: 110, rarity: 'lendário', emoji: '🌸' },
  381: { id: 381, name: 'Latios',      type: ['Dragon','Psychic'], region: 'hoenn',  baseHp: 80, baseAtk: 90, baseDef: 80, baseSpd: 110, rarity: 'lendário', emoji: '💙' },
  382: { id: 382, name: 'Kyogre',      type: ['Water'],            region: 'hoenn',  baseHp: 100, baseAtk: 100, baseDef: 90, baseSpd: 90, rarity: 'mítico', emoji: '🌊' },
  383: { id: 383, name: 'Groudon',     type: ['Ground'],           region: 'hoenn',  baseHp: 100, baseAtk: 150, baseDef: 140, baseSpd: 90, rarity: 'mítico', emoji: '🌋' },
  384: { id: 384, name: 'Rayquaza',    type: ['Dragon','Flying'],  region: 'hoenn',  baseHp: 105, baseAtk: 150, baseDef: 90, baseSpd: 95, rarity: 'mítico', emoji: '🐲' },

  // ── SINNOH (Gen 4) ─────────────────────────────
  387: { id: 387, name: 'Turtwig',     type: ['Grass'],            region: 'sinnoh', baseHp: 55, baseAtk: 68, baseDef: 64, baseSpd: 31, rarity: 'incomum',  emoji: '🐢' },
  388: { id: 388, name: 'Grotle',      type: ['Grass'],            region: 'sinnoh', baseHp: 75, baseAtk: 89, baseDef: 85, baseSpd: 36, rarity: 'raro',     emoji: '🐢' },
  389: { id: 389, name: 'Torterra',    type: ['Grass','Ground'],   region: 'sinnoh', baseHp: 95, baseAtk: 109, baseDef: 105, baseSpd: 56, rarity: 'épico',  emoji: '🌍' },
  390: { id: 390, name: 'Chimchar',    type: ['Fire'],             region: 'sinnoh', baseHp: 44, baseAtk: 58, baseDef: 44, baseSpd: 61, rarity: 'incomum',  emoji: '🐒' },
  391: { id: 391, name: 'Monferno',    type: ['Fire','Fighting'],  region: 'sinnoh', baseHp: 64, baseAtk: 78, baseDef: 52, baseSpd: 81, rarity: 'raro',     emoji: '🐒' },
  392: { id: 392, name: 'Infernape',   type: ['Fire','Fighting'],  region: 'sinnoh', baseHp: 76, baseAtk: 104, baseDef: 71, baseSpd: 108, rarity: 'épico',  emoji: '🔥' },
  393: { id: 393, name: 'Piplup',      type: ['Water'],            region: 'sinnoh', baseHp: 53, baseAtk: 51, baseDef: 53, baseSpd: 40, rarity: 'incomum',  emoji: '🐧' },
  394: { id: 394, name: 'Prinplup',    type: ['Water'],            region: 'sinnoh', baseHp: 64, baseAtk: 66, baseDef: 68, baseSpd: 50, rarity: 'raro',     emoji: '🐧' },
  395: { id: 395, name: 'Empoleon',    type: ['Water','Steel'],    region: 'sinnoh', baseHp: 84, baseAtk: 86, baseDef: 88, baseSpd: 60, rarity: 'épico',    emoji: '👑' },
  403: { id: 403, name: 'Shinx',       type: ['Electric'],         region: 'sinnoh', baseHp: 45, baseAtk: 65, baseDef: 34, baseSpd: 45, rarity: 'comum',    emoji: '⚡' },
  405: { id: 405, name: 'Luxray',      type: ['Electric'],         region: 'sinnoh', baseHp: 80, baseAtk: 120, baseDef: 79, baseSpd: 70, rarity: 'raro',    emoji: '⚡' },
  443: { id: 443, name: 'Gible',       type: ['Dragon','Ground'],  region: 'sinnoh', baseHp: 58, baseAtk: 70, baseDef: 45, baseSpd: 42, rarity: 'raro',     emoji: '🐉' },
  445: { id: 445, name: 'Garchomp',    type: ['Dragon','Ground'],  region: 'sinnoh', baseHp: 108, baseAtk: 130, baseDef: 95, baseSpd: 102, rarity: 'épico', emoji: '🐉' },
  448: { id: 448, name: 'Lucario',     type: ['Fighting','Steel'], region: 'sinnoh', baseHp: 70, baseAtk: 110, baseDef: 70, baseSpd: 90, rarity: 'raro',    emoji: '🐺' },
  461: { id: 461, name: 'Weavile',     type: ['Dark','Ice'],       region: 'sinnoh', baseHp: 70, baseAtk: 120, baseDef: 65, baseSpd: 125, rarity: 'raro',   emoji: '❄️' },
  470: { id: 470, name: 'Leafeon',     type: ['Grass'],            region: 'sinnoh', baseHp: 65, baseAtk: 110, baseDef: 130, baseSpd: 95, rarity: 'raro',   emoji: '🍃' },
  471: { id: 471, name: 'Glaceon',     type: ['Ice'],              region: 'sinnoh', baseHp: 65, baseAtk: 60, baseDef: 110, baseSpd: 65, rarity: 'raro',    emoji: '❄️' },
  480: { id: 480, name: 'Uxie',        type: ['Psychic'],          region: 'sinnoh', baseHp: 75, baseAtk: 75, baseDef: 130, baseSpd: 95, rarity: 'lendário', emoji: '🔮' },
  481: { id: 481, name: 'Mesprit',     type: ['Psychic'],          region: 'sinnoh', baseHp: 80, baseAtk: 105, baseDef: 105, baseSpd: 80, rarity: 'lendário', emoji: '💜' },
  482: { id: 482, name: 'Azelf',       type: ['Psychic'],          region: 'sinnoh', baseHp: 75, baseAtk: 125, baseDef: 70, baseSpd: 115, rarity: 'lendário', emoji: '💙' },
  483: { id: 483, name: 'Dialga',      type: ['Steel','Dragon'],   region: 'sinnoh', baseHp: 100, baseAtk: 120, baseDef: 120, baseSpd: 90, rarity: 'mítico', emoji: '💎' },
  484: { id: 484, name: 'Palkia',      type: ['Water','Dragon'],   region: 'sinnoh', baseHp: 90, baseAtk: 120, baseDef: 100, baseSpd: 100, rarity: 'mítico', emoji: '🌀' },
  487: { id: 487, name: 'Giratina',    type: ['Ghost','Dragon'],   region: 'sinnoh', baseHp: 150, baseAtk: 100, baseDef: 120, baseSpd: 90, rarity: 'mítico', emoji: '👻' },
};

// Pokémon por região
const POKEMON_BY_REGION = {
  kanto:  Object.values(POKEMON_DATA).filter(p => p.region === 'kanto'),
  johto:  Object.values(POKEMON_DATA).filter(p => p.region === 'johto'),
  hoenn:  Object.values(POKEMON_DATA).filter(p => p.region === 'hoenn'),
  sinnoh: Object.values(POKEMON_DATA).filter(p => p.region === 'sinnoh'),
};

// Pesos de raridade (quanto menor, mais difícil de aparecer)
const RARITY_WEIGHT = {
  comum:    50,
  incomum:  30,
  raro:     15,
  épico:    4,
  lendário: 0.8,
  mítico:   0.2,
};

function getRandomWildPokemon(region, trainerLevel = 1) {
  const pool = POKEMON_BY_REGION[region];
  if (!pool || pool.length === 0) return null;

  // Selecionar por peso de raridade
  const weighted = [];
  for (const p of pool) {
    const weight = RARITY_WEIGHT[p.rarity] || 1;
    for (let i = 0; i < weight; i++) weighted.push(p);
  }

  const base = weighted[Math.floor(Math.random() * weighted.length)];
  const wildLevel = Math.max(1, Math.min(trainerLevel + Math.floor(Math.random() * 5) - 2, 100));

  return buildPokemon(base, wildLevel);
}

function buildPokemon(base, level = 1) {
  const multiplier = 1 + (level - 1) * 0.05;
  return {
    id: base.id,
    name: base.name,
    emoji: base.emoji,
    type: base.type,
    region: base.region,
    rarity: base.rarity,
    level,
    hp:      Math.floor(base.baseHp * multiplier),
    attack:  Math.floor(base.baseAtk * multiplier),
    defense: Math.floor(base.baseDef * multiplier),
    speed:   Math.floor(base.baseSpd * multiplier),
  };
}

function getPokemonById(id) {
  return POKEMON_DATA[id] || null;
}

function getStartersByRegion(region) {
  const starters = {
    kanto:  [1, 4, 7],
    johto:  [152, 155, 158],
    hoenn:  [252, 255, 258],
    sinnoh: [387, 390, 393],
  };
  return (starters[region] || starters.kanto).map(id => buildPokemon(POKEMON_DATA[id], 5));
}

// Tipo emoji
const TYPE_EMOJI = {
  Grass: '🌿', Fire: '🔥', Water: '💧', Electric: '⚡',
  Psychic: '🔮', Rock: '🪨', Ground: '🌍', Ice: '❄️',
  Fighting: '🥊', Ghost: '👻', Dragon: '🐉', Dark: '🌑',
  Steel: '⚙️', Fairy: '🌸', Poison: '☠️', Flying: '🌬️',
  Normal: '⭐', Bug: '🐛',
};

module.exports = {
  POKEMON_DATA,
  POKEMON_BY_REGION,
  getRandomWildPokemon,
  buildPokemon,
  getPokemonById,
  getStartersByRegion,
  TYPE_EMOJI,
  RARITY_WEIGHT,
};
