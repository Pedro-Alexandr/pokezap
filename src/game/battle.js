// ═══════════════════════════════════════════════
//  BATTLE SYSTEM — Efetividade de Tipos + Dano
// ═══════════════════════════════════════════════

// Tabela de efetividade de tipos (ataque → defesa → multiplicador)
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

/**
 * Calcula o multiplicador de efetividade de tipo.
 * @param {string} attackType - Tipo do ataque
 * @param {string[]} defenderTypes - Tipos do defensor
 */
function getEffectiveness(attackType, defenderTypes) {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    multiplier *= TYPE_CHART[attackType]?.[defType] ?? 1;
  }
  return multiplier;
}

/**
 * Retorna a mensagem de efetividade.
 */
function effectivenessMessage(mult) {
  if (mult >= 4)  return '\n🔥 É SUPER EFETIVO x4!!';
  if (mult >= 2)  return '\n✨ É super efetivo!';
  if (mult === 0) return '\n❌ Não surtiu efeito...';
  if (mult < 1)   return '\n😓 Não é muito efetivo...';
  return '';
}

/**
 * Calcula o dano de um ataque.
 * @param {object} attacker - { level, attack, type: string[] }
 * @param {object} defender - { defense, type: string[] }
 */
function calcDamage(attacker, defender) {
  const atkType = Array.isArray(attacker.type)
    ? attacker.type[0]
    : (typeof attacker.type === 'string' ? JSON.parse(attacker.type || '["Normal"]')[0] : 'Normal');

  const defTypes = Array.isArray(defender.type)
    ? defender.type
    : (typeof defender.type === 'string' ? JSON.parse(defender.type || '["Normal"]') : ['Normal']);

  const base    = Math.floor(((2 * attacker.level / 5 + 2) * attacker.attack / Math.max(1, defender.defense)) / 50 + 2);
  const eff     = getEffectiveness(atkType, defTypes);
  const rand    = (Math.floor(Math.random() * 16) + 85) / 100;
  const damage  = Math.max(1, Math.floor(base * eff * rand));

  return { damage, effectiveness: eff };
}

/**
 * Calcula a taxa de captura de um Pokémon selvagem.
 * @param {object} pokemon - { rarity, hp, max_hp }
 * @param {number} ballMultiplier - Multiplicador da Pokébola
 */
function calcCatchRate(pokemon, ballMultiplier = 1) {
  const baseRates = {
    comum:    0.85,
    incomum:  0.65,
    raro:     0.40,
    épico:    0.20,
    lendário: 0.05,
    mítico:   0.02,
  };
  const base = baseRates[pokemon.rarity] || 0.5;
  const maxHp = pokemon.max_hp || pokemon.hp;
  const hpFactor = 1 - (pokemon.hp / maxHp) * 0.5;
  return Math.min(0.99, base * hpFactor * ballMultiplier);
}

/**
 * Verifica se um Pokémon subiu de nível.
 */
function levelUpCheck(pokemon) {
  const neededXp = pokemon.level * 100;
  if (pokemon.xp >= neededXp) {
    return { leveledUp: true, newLevel: pokemon.level + 1, newXp: pokemon.xp - neededXp };
  }
  return { leveledUp: false };
}

/**
 * Calcula o XP ganho ao derrotar um Pokémon.
 */
function xpGain(level) {
  return Math.floor(level * 15 + 20);
}

module.exports = {
  TYPE_CHART,
  calcDamage,
  calcCatchRate,
  levelUpCheck,
  xpGain,
  effectivenessMessage,
  getEffectiveness,
};