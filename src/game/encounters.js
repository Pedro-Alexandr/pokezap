// Gerencia encontros selvagens ativos (em memória)
// Estrutura: Map<trainerId, { pokemon, attempts }>

const encounters = new Map();

function setEncounter(trainerId, pokemon) {
  encounters.set(trainerId, { pokemon: { ...pokemon, max_hp: pokemon.hp }, attempts: 0 });
}

function getEncounter(trainerId) {
  return encounters.get(trainerId) || null;
}

function updateEncounterHp(trainerId, newHp) {
  const enc = encounters.get(trainerId);
  if (enc) enc.pokemon.hp = newHp;
}

function incrementAttempts(trainerId) {
  const enc = encounters.get(trainerId);
  if (enc) enc.attempts += 1;
}

function clearEncounter(trainerId) {
  encounters.delete(trainerId);
}

module.exports = {
  setEncounter,
  getEncounter,
  updateEncounterHp,
  incrementAttempts,
  clearEncounter,
};
