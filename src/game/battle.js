// ═══════════════════════════════════════════════
//  SISTEMA DE BATALHA
// ═══════════════════════════════════════════════

const {
  getActiveBattleForTrainer,
  getActivePokemon,
  createBattle,
  updateBattle,
  updatePokemon,
  updateTrainer,
  getTrainer,
} = require('../database/db');

// Efetividade de tipos
const TYPE_CHART = {
  Fire:     { Grass: 2, Ice: 2, Bug: 2, Steel: 2, Water: 0.5, Fire: 0.5, Rock: 0.5, Dragon: 0.5 },
  Water:    { Fire: 2, Ground: 2, Rock: 2, Water: 0.5, Grass: 0.5, Dragon: 0.5 },
  Grass:    { Water: 2, Ground: 2, Rock: 2, Fire: 0.5, Grass: 0.5, Poison: 0.5, Flying: 0.5, Bug: 0.5, Dragon: 0.5, Steel: 0.5 },
  Electric: { Water: 2, Flying: 2, Electric: 0.5, Grass: 0.5, Dragon: 0.5, Ground: 0 },
  Psychic:  { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5, Dark: 0 },
  Fighting: { Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2, Psychic: 0.5, Flying: 0.5, Poison: 0.5, Bug: 0.5, Fairy: 0.5, Ghost: 0 },
  Rock:     { Fire: 2, Ice: 2, Flying: 2, Bug: 2, Fighting: 0.5, Ground: 0.5, Steel: 0.5 },
  Ground:   { Fire: 2, Electric: 2, Poison: 2, Rock: 2, Steel: 2, Grass: 0.5, Bug: 0.5, Flying: 0 },
  Ice:      { Grass: 2, Ground: 2, Flying: 2, Dragon: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 },
  Dragon:   { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark:     { Psychic: 2, Ghost: 2, Fighting: 0.5, Dark: 0.5, Fairy: 0.5 },
  Ghost:    { Psychic: 2, Ghost: 2, Normal: 0, Fighting: 0 },
  Steel:    { Ice: 2, Rock: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Electric: 0.5, Steel: 0.5 },
  Fairy:    { Fighting: 2, Dragon: 2, Dark: 2, Fire: 0.5, Poison: 0.5, Steel: 0.5 },
  Poison:   { Grass: 2, Fairy: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 },
  Flying:   { Grass: 2, Fighting: 2, Bug: 2, Electric: 0.5, Rock: 0.5, Steel: 0.5 },
  Bug:      { Grass: 2, Psychic: 2, Dark: 2, Fire: 0.5, Fighting: 0.5, Flying: 0.5, Ghost: 0.5, Steel: 0.5, Fairy: 0.5 },
  Normal:   { Rock: 0.5, Steel: 0.5, Ghost: 0 },
};

function getEffectiveness(attackType, defenderTypes) {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    const chart = TYPE_CHART[attackType] || {};
    multiplier *= chart[defType] ?? 1;
  }
  return multiplier;
}

function effectivenessMessage(mult) {
  if (mult >= 4)   return '🔥 É SUPER EFETIVO x4!!';
  if (mult >= 2)   return '✨ É super efetivo!';
  if (mult === 0)  return '❌ Não surtiu efeito...';
  if (mult < 1)    return '😓 Não é muito efetivo...';
  return '';
}

function calcDamage(attacker, defender) {
  // Fórmula simplificada inspirada nos jogos
  const baseDmg = Math.floor(
    ((2 * attacker.level / 5 + 2) * attacker.attack / (defender.defense || 1)) / 50 + 2
  );

  const effectiveness = getEffectiveness(
    attacker.type ? attacker.type[0] : 'Normal',
    defender.type || ['Normal']
  );

  // Random entre 85%-100%
  const random = (Math.floor(Math.random() * 16) + 85) / 100;

  return {
    damage: Math.max(1, Math.floor(baseDmg * effectiveness * random)),
    effectiveness,
  };
}

function calcCatchRate(pokemon, ballMultiplier = 1) {
  const rarityBase = {
    comum:    0.85,
    incomum:  0.65,
    raro:     0.40,
    épico:    0.20,
    lendário: 0.05,
    mítico:   0.02,
  };

  const base = rarityBase[pokemon.rarity] || 0.5;
  const hpRatio = pokemon.hp / (pokemon.max_hp || pokemon.hp);
  const hpBonus = 1 - hpRatio * 0.5; // menor HP = mais fácil capturar

  return Math.min(0.99, base * hpBonus * ballMultiplier);
}

function levelUpCheck(pokemon) {
  const xpNeeded = pokemon.level * 100;
  if (pokemon.xp >= xpNeeded) {
    return {
      leveledUp: true,
      newLevel: pokemon.level + 1,
      newXp: pokemon.xp - xpNeeded,
    };
  }
  return { leveledUp: false };
}

function xpGain(defeatedLevel) {
  return Math.floor(defeatedLevel * 15 + 20);
}

function trainerXpGain(result) {
  return result === 'win' ? 50 : 10;
}

// ── Batalha PvE (contra selvagem) ─────────────
function wildBattleAttack(trainerPokemon, wildPokemon) {
  const { damage, effectiveness } = calcDamage(
    { ...trainerPokemon, type: ['Normal'] },
    wildPokemon
  );

  const wildHpAfter = Math.max(0, wildPokemon.hp - damage);

  // Contra-ataque do selvagem
  const { damage: wildDamage } = calcDamage(
    { level: wildPokemon.level, attack: wildPokemon.attack, type: wildPokemon.type },
    trainerPokemon
  );
  const trainerHpAfter = Math.max(0, trainerPokemon.hp - wildDamage);

  return {
    playerDamage: damage,
    wildDamage,
    effectiveness,
    wildHpAfter,
    trainerHpAfter,
  };
}

module.exports = {
  calcDamage,
  calcCatchRate,
  levelUpCheck,
  xpGain,
  trainerXpGain,
  wildBattleAttack,
  effectivenessMessage,
  getEffectiveness,
};
