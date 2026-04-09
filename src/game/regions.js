const REGIONS = {
  kanto: {
    name: 'Kanto',
    emoji: '🗾',
    description: 'A região original dos Pokémon. Lar do Professor Carvalho e do Ginásio de Cinnabar.',
    unlockLevel: 1,
    specialPokemon: [144, 145, 146, 150],
    areas: ['Floresta de Viridian', 'Caverna Pewter', 'S.S. Anne', 'Torre Pokémon', 'Ilha Cinnabar'],
  },
  johto: {
    name: 'Johto',
    emoji: '🏯',
    description: 'Terra de tradição e mistério, lar das ruínas de Alph e da Torre Foguete.',
    unlockLevel: 10,
    specialPokemon: [243, 244, 245, 249, 250],
    areas: ['Floresta Ilex', 'Lago Ragecandybar', 'Torre Fantasma', 'Monte de Prata', 'Lago de Eusine'],
  },
  hoenn: {
    name: 'Hoenn',
    emoji: '🏝️',
    description: 'Região tropical repleta de água, ilhas e os mistérios do time Magma e Aqua.',
    unlockLevel: 20,
    specialPokemon: [380, 381, 382, 383, 384],
    areas: ['Selva Safari', 'Cidade Submarine', 'Sky Pillar', 'Ilha Mirage', 'Rota Aquática'],
  },
  sinnoh: {
    name: 'Sinnoh',
    emoji: '🏔️',
    description: 'A região mais fria, lar do Monte Coroa e dos segredos do espaço e do tempo.',
    unlockLevel: 30,
    specialPokemon: [480, 481, 482, 483, 484, 487],
    areas: ['Monte Coroa', 'Mansão Chateau', 'Sinoh Underground', 'Templo Distortion', 'Lago Verity'],
  },
};

function getRegion(name) {
  return REGIONS[name.toLowerCase()] || null;
}

function canTravelToRegion(region, trainerLevel) {
  const r = REGIONS[region];
  if (!r) return false;
  return trainerLevel >= r.unlockLevel;
}

function getRegionList() {
  return Object.entries(REGIONS).map(([key, r]) => ({
    key,
    name: r.name,
    emoji: r.emoji,
    unlockLevel: r.unlockLevel,
  }));
}

module.exports = { REGIONS, getRegion, canTravelToRegion, getRegionList };
