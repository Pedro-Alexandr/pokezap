// ═══════════════════════════════════════════════════════
//  EVOLUTION SYSTEM
//  Suporta evoluções por: nível, pedra e felicidade
// ═══════════════════════════════════════════════════════

// Pedras evolutivas disponíveis na loja
const STONES = {
  Trovao:  { emoji: '⚡', price: 300, description: 'Pedra Trovão'      },
  Fogo:    { emoji: '🔥', price: 300, description: 'Pedra Fogo'        },
  Agua:    { emoji: '💧', price: 300, description: 'Pedra Água'        },
  Folha:   { emoji: '🌿', price: 300, description: 'Pedra Folha'       },
  Lua:     { emoji: '🌙', price: 300, description: 'Pedra Lua'         },
  Sol:     { emoji: '☀️', price: 400, description: 'Pedra Sol'         },
  Alvore:  { emoji: '✨', price: 500, description: 'Pedra Alvorada'    },
  Brilho:  { emoji: '💎', price: 500, description: 'Pedra Brilho'      },
  Lusco:   { emoji: '🌑', price: 500, description: 'Pedra Lusco-Fusco' },
};

// Cadeia de evoluções: pokemonId -> { into, method, value, description }
// method: 'level' | 'stone' | 'happiness'
// value:  nível mínimo (level) | nome da pedra (stone) | nível de felicidade (happiness)
const EVOLUTION_CHAIN = {
  // ── KANTO ────────────────────────────────────────────
  1:   { into: 2,   method: 'level',    value: 16,       description: 'Nível 16'        },
  2:   { into: 3,   method: 'level',    value: 32,       description: 'Nível 32'        },
  4:   { into: 5,   method: 'level',    value: 16,       description: 'Nível 16'        },
  5:   { into: 6,   method: 'level',    value: 36,       description: 'Nível 36'        },
  7:   { into: 8,   method: 'level',    value: 16,       description: 'Nível 16'        },
  8:   { into: 9,   method: 'level',    value: 36,       description: 'Nível 36'        },
  25:  { into: 26,  method: 'stone',    value: 'Trovao', description: 'Pedra Trovão'    },
  39:  { into: 40,  method: 'stone',    value: 'Lua',    description: 'Pedra Lua'       }, // Wigglytuff (não no dataset, ok falhar)
  52:  { into: 53,  method: 'level',    value: 28,       description: 'Nível 28'        },
  54:  { into: 55,  method: 'level',    value: 33,       description: 'Nível 33'        },
  58:  { into: 59,  method: 'stone',    value: 'Fogo',   description: 'Pedra Fogo'      },
  66:  { into: 67,  method: 'level',    value: 28,       description: 'Nível 28'        },
  74:  { into: 75,  method: 'level',    value: 25,       description: 'Nível 25'        },
  92:  { into: 93,  method: 'level',    value: 25,       description: 'Nível 25'        },

  // ── JOHTO ────────────────────────────────────────────
  152: { into: 153, method: 'level',    value: 18,       description: 'Nível 18'        },
  153: { into: 154, method: 'level',    value: 32,       description: 'Nível 32'        },
  155: { into: 156, method: 'level',    value: 14,       description: 'Nível 14'        },
  156: { into: 157, method: 'level',    value: 36,       description: 'Nível 36'        },
  158: { into: 159, method: 'level',    value: 18,       description: 'Nível 18'        },
  159: { into: 160, method: 'level',    value: 30,       description: 'Nível 30'        },
  175: { into: 176, method: 'happiness',value: 220,      description: 'Felicidade alta' },
  183: { into: 184, method: 'happiness',value: 220,      description: 'Felicidade alta' },
  196: { into: 196, method: 'level',    value: 999,      description: 'Forma final'     }, // Espeon não evolui
  197: { into: 197, method: 'level',    value: 999,      description: 'Forma final'     }, // Umbreon não evolui

  // ── HOENN ─────────────────────────────────────────────
  252: { into: 253, method: 'level',    value: 16,       description: 'Nível 16'        },
  253: { into: 254, method: 'level',    value: 36,       description: 'Nível 36'        },
  255: { into: 256, method: 'level',    value: 16,       description: 'Nível 16'        },
  256: { into: 257, method: 'level',    value: 36,       description: 'Nível 36'        },
  258: { into: 259, method: 'level',    value: 16,       description: 'Nível 16'        },
  259: { into: 260, method: 'level',    value: 36,       description: 'Nível 36'        },
  280: { into: 281, method: 'level',    value: 20,       description: 'Nível 20'        },

  // ── SINNOH ────────────────────────────────────────────
  387: { into: 388, method: 'level',    value: 18,       description: 'Nível 18'        },
  388: { into: 389, method: 'level',    value: 32,       description: 'Nível 32'        },
  390: { into: 391, method: 'level',    value: 14,       description: 'Nível 14'        },
  391: { into: 392, method: 'level',    value: 36,       description: 'Nível 36'        },
  393: { into: 394, method: 'level',    value: 16,       description: 'Nível 16'        },
  394: { into: 395, method: 'level',    value: 36,       description: 'Nível 36'        },
  403: { into: 405, method: 'level',    value: 30,       description: 'Nível 30 (via Luxio)' },
  443: { into: 445, method: 'level',    value: 48,       description: 'Nível 48 (via Gabite)' },
  470: { into: 470, method: 'level',    value: 999,      description: 'Forma final'     }, // Leafeon não evolui
  471: { into: 471, method: 'level',    value: 999,      description: 'Forma final'     }, // Glaceon não evolui
};

/**
 * Verifica se o Pokémon pode evoluir por nível.
 * @param {object} pokemon - Pokémon da DB (tem pokemon_id e level)
 * @returns {object|null} Info da evolução ou null
 */
function canEvolveByLevel(pokemon) {
  const id = pokemon.pokemon_id ?? pokemon.id;
  const evo = EVOLUTION_CHAIN[id];
  if (!evo || evo.method !== 'level') return null;
  if (pokemon.level < evo.value) return null;
  return evo;
}

/**
 * Verifica se o Pokémon pode evoluir com uma pedra específica.
 * @param {object} pokemon - Pokémon da DB
 * @param {string} stoneName - Nome capitalizado da pedra (ex: 'Trovao')
 * @returns {object|null}
 */
function canEvolveByStone(pokemon, stoneName) {
  const id = pokemon.pokemon_id ?? pokemon.id;
  const evo = EVOLUTION_CHAIN[id];
  if (!evo || evo.method !== 'stone') return null;
  if (evo.value !== stoneName) return null;
  return evo;
}

/**
 * Verifica se o Pokémon pode evoluir por felicidade.
 * Para simplificar, qualquer Pokémon nivel >= 20 com método happiness pode evoluir.
 * @param {object} pokemon
 * @returns {object|null}
 */
function canEvolveByHappiness(pokemon) {
  const id = pokemon.pokemon_id ?? pokemon.id;
  const evo = EVOLUTION_CHAIN[id];
  if (!evo || evo.method !== 'happiness') return null;
  if (pokemon.level < 20) return null; // Mínimo de nível para felicidade
  return evo;
}

/**
 * Retorna as informações de evolução de um Pokémon pelo ID base..
 * @param {number} pokemonId
 * @returns {object|null}
 */
function getEvolveInfo(pokemonId) {
  return EVOLUTION_CHAIN[pokemonId] || null;
}

module.exports = {
  STONES,
  EVOLUTION_CHAIN,
  canEvolveByLevel,
  canEvolveByStone,
  canEvolveByHappiness,
  getEvolveInfo,
};