// ═══════════════════════════════════════════════
//  REGIÕES DO JOGO
// ═══════════════════════════════════════════════

const REGIONS = {
  kanto: {
    name: 'Kanto',
    emoji: '🗾',
    description: 'A região original. Lar do Professor Carvalho e do Ginásio de Pewter City.',
    unlockLevel: 1,
    areas: ['Floresta Viridian', 'Caverna Pewter', 'S.S. Anne', 'Torre Pokémon', 'Ilha Cinnabar'],
  },
  johto: {
    name: 'Johto',
    emoji: '🏯',
    description: 'Terra de tradição e mistério. Ruínas de Alph e a sombria Torre Foguete.',
    unlockLevel: 10,
    areas: ['Floresta Ilex', 'Torre Fantasma', 'Monte de Prata', 'Lago de Eusine'],
  },
  hoenn: {
    name: 'Hoenn',
    emoji: '🏝️',
    description: 'Região tropical rodeada de mar. Confronto épico entre Time Magma e Aqua.',
    unlockLevel: 20,
    areas: ['Selva Safari', 'Sky Pillar', 'Ilha Mirage', 'Cidade Mossdeep'],
  },
  sinnoh: {
    name: 'Sinnoh',
    emoji: '🏔️',
    description: 'A região mais fria e mística. Monte Coroa guarda segredos do tempo e espaço.',
    unlockLevel: 30,
    areas: ['Monte Coroa', 'Sinnoh Underground', 'Templo Distortion', 'Lago Verity'],
  },
};

const TRAVEL_COST = {
  kanto:  0,
  johto:  200,
  hoenn:  500,
  sinnoh: 800,
};

function getRegion(name) {
  return REGIONS[name?.toLowerCase()] || null;
}

function canTravel(regionName, trainerLevel) {
  const region = REGIONS[regionName?.toLowerCase()];
  if (!region) return false;
  return trainerLevel >= region.unlockLevel;
}

function getRegionList() {
  return Object.entries(REGIONS).map(([key, r]) => ({ key, ...r }));
}

module.exports = { REGIONS, TRAVEL_COST, getRegion, canTravel, getRegionList };