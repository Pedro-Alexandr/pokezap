// ═══════════════════════════════════════════════
//  ENCOUNTER MANAGER — Batalhas selvagens em memória
// ═══════════════════════════════════════════════

const encounters = new Map();

/**
 * Registra um encontro com Pokémon selvagem.
 * @param {string} trainerId
 * @param {object} pokemon - Pokémon selvagem com todos os atributos
 */
function setEncounter(trainerId, pokemon) {
  encounters.set(trainerId, {
    pokemon: { ...pokemon, max_hp: pokemon.hp },
  });
}

/**
 * Retorna o encontro ativo de um treinador.
 * @param {string} trainerId
 * @returns {object|null}
 */
function getEncounter(trainerId) {
  return encounters.get(trainerId) || null;
}

/**
 * Atualiza o HP do Pokémon selvagem no encontro.
 */
function updateEncounterHp(trainerId, hp) {
  const enc = encounters.get(trainerId);
  if (enc) enc.pokemon.hp = hp;
}

/**
 * Remove o encontro ativo.
 */
function clearEncounter(trainerId) {
  encounters.delete(trainerId);
}

module.exports = { setEncounter, getEncounter, updateEncounterHp, clearEncounter };