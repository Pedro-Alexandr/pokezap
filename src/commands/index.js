const db = require('../database/db');
const { getRandomWildPokemon, getStartersByRegion, buildPokemon, getPokemonById, TYPE_EMOJI } = require('../game/pokemon');
const { calcCatchRate, wildBattleAttack, levelUpCheck, xpGain, trainerXpGain, effectivenessMessage } = require('../game/battle');
const { setEncounter, getEncounter, updateEncounterHp, incrementAttempts, clearEncounter } = require('../game/encounters');
const { getRegion, canTravelToRegion, getRegionList } = require('../game/regions');
const { formatTrainerStatus, formatPokemonInfo, rarityEmoji, formatCollection, hpBar, capitalize } = require('../utils/format');

// Mapa de escolha de starter pendente: trainerId -> { starters, name }
const pendingStarters = new Map();

async function handleCommand(text, senderId, chatId, isGroup) {
  const parts = text.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case '!start':      return cmdStart(senderId, args);
    case '!escolher':   return cmdChooseStarter(senderId, args);
    case '!status':     return cmdStatus(senderId);
    case '!explorar':   return cmdExplore(senderId);
    case '!atacar':     return cmdAttack(senderId);
    case '!capturar':   return cmdCatch(senderId, args);
    case '!fugir':      return cmdFlee(senderId);
    case '!mochila':    return cmdBag(senderId);
    case '!ativar':     return cmdActivate(senderId, args);
    case '!viajar':     return cmdTravel(senderId, args);
    case '!regioes':    return cmdRegions(senderId);
    case '!loja':       return cmdShop(senderId);
    case '!comprar':    return cmdBuy(senderId, args);
    case '!curar':      return cmdHeal(senderId);
    case '!ajuda':
    case '!help':       return cmdHelp();
    default:            return null;
  }
}

// ── !start ─────────────────────────────────────
async function cmdStart(trainerId, args) {
  const existing = db.getTrainer(trainerId);
  if (existing) {
    return `⚠️ Você já é um treinador, ${existing.name}!\nUse *!status* para ver seu perfil.`;
  }

  const name = args.join(' ').trim();
  if (!name) {
    return `👋 Bem-vindo ao mundo Pokémon!\n\nUse *!start [seu nome]* para começar sua aventura.\nExemplo: *!start Ash*`;
  }

  // Criar treinador
  db.createTrainer(trainerId, name);

  // Mostrar starters de Kanto
  const starters = getStartersByRegion('kanto');
  pendingStarters.set(trainerId, { starters });

  return (
    `🎉 *Olá, ${name}!* Bem-vindo ao mundo Pokémon!\n\n` +
    `O Professor Carvalho está esperando você.\n` +
    `Escolha seu Pokémon inicial da região de *Kanto*:\n\n` +
    starters.map((p, i) =>
      `*${i + 1}.* ${p.emoji} ${p.name} (${p.type.join('/')})\n` +
      `   ❤️ ${p.hp} | ⚔️ ${p.attack} | 🛡️ ${p.defense}`
    ).join('\n\n') +
    `\n\nResponda com *!escolher 1*, *!escolher 2* ou *!escolher 3*`
  );
}

// ── !escolher ──────────────────────────────────
async function cmdChooseStarter(trainerId, args) {
  const trainer = db.getTrainer(trainerId);
  if (!trainer) return '❌ Use *!start [nome]* primeiro!';

  const pending = pendingStarters.get(trainerId);
  if (!pending) return '❌ Não há escolha de starter pendente.';

  const choice = parseInt(args[0]);
  if (!choice || choice < 1 || choice > 3) {
    return '❌ Escolha inválida! Use *!escolher 1*, *!escolher 2* ou *!escolher 3*.';
  }

  const chosen = pending.starters[choice - 1];
  db.addPokemon(trainerId, chosen);
  pendingStarters.delete(trainerId);

  return (
    `🎊 Excelente escolha!\n\n` +
    `${chosen.emoji} *${chosen.name}* te escolheu como parceiro!\n\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `Agora você pode:\n` +
    `🌿 *!explorar* - Encontrar Pokémon selvagens\n` +
    `📊 *!status* - Ver seu perfil\n` +
    `🎒 *!mochila* - Ver seus Pokémon\n` +
    `❓ *!ajuda* - Ver todos os comandos\n\n` +
    `Sua aventura começa agora! Boa sorte, ${trainer.name}! 🚀`
  );
}

// ── !status ────────────────────────────────────
async function cmdStatus(trainerId) {
  const trainer = db.getTrainer(trainerId);
  if (!trainer) return '❌ Você ainda não começou! Use *!start [nome]*';

  const activePokemon = db.getActivePokemon(trainerId);
  const collection = db.getTrainerPokemon(trainerId);

  let msg = formatTrainerStatus(trainer, activePokemon);
  msg += `\n📦 Pokémon capturados: ${collection.length}`;
  return msg;
}

// ── !explorar ──────────────────────────────────
async function cmdExplore(trainerId) {
  const trainer = db.getTrainer(trainerId);
  if (!trainer) return '❌ Use *!start [nome]* primeiro!';

  const active = db.getActivePokemon(trainerId);
  if (!active) return '❌ Você não tem Pokémon ativo! Use *!mochila* e *!ativar [número]*.';
  if (active.hp <= 0) return '💔 Seu Pokémon está desmaiado! Use *!curar* para recuperá-lo.';

  // Verificar se já tem encontro ativo
  const existing = getEncounter(trainerId);
  if (existing) {
    return `⚠️ Você já está em batalha com ${existing.pokemon.name}!\nUse *!atacar*, *!capturar* ou *!fugir*.`;
  }

  const wild = getRandomWildPokemon(trainer.region, trainer.level);
  if (!wild) return '🌿 Nenhum Pokémon encontrado por aqui...';

  setEncounter(trainerId, wild);

  const region = getRegion(trainer.region);
  return (
    `🌿 *Explorando ${region?.name || trainer.region}...*\n\n` +
    `⚠️ Um Pokémon selvagem apareceu!\n\n` +
    `${wild.emoji} *${wild.name}* ${rarityEmoji(wild.rarity)} Lv.${wild.level}\n` +
    `🏷️ Tipo: ${wild.type.join(' / ')}\n` +
    `❤️ HP: ${hpBar(wild.hp, wild.hp)}\n\n` +
    `O que você vai fazer?\n` +
    `⚔️ *!atacar* - Atacar\n` +
    `🎯 *!capturar* - Usar Pokébola [pokebola/great/ultra]\n` +
    `🏃 *!fugir* - Fugir`
  );
}

// ── !atacar ────────────────────────────────────
async function cmdAttack(trainerId) {
  const enc = getEncounter(trainerId);
  if (!enc) return '❌ Não há Pokémon selvagem! Use *!explorar*.';

  const active = db.getActivePokemon(trainerId);
  if (!active || active.hp <= 0) return '💔 Seu Pokémon está desmaiado!';

  const result = wildBattleAttack(active, enc.pokemon);
  updateEncounterHp(trainerId, result.wildHpAfter);

  // Atualiza HP do Pokémon do jogador no banco
  db.updatePokemon(active.id, { hp: result.trainerHpAfter });

  const effMsg = effectivenessMessage(result.effectiveness);
  let msg = `⚔️ *${active.name}* atacou *${enc.pokemon.name}*!\n`;
  msg += `💥 Dano causado: *${result.playerDamage}*${effMsg ? '\n' + effMsg : ''}\n\n`;

  if (result.wildHpAfter <= 0) {
    // Pokémon selvagem derrotado
    clearEncounter(trainerId);

    const xp = xpGain(enc.pokemon.level);
    const newXp = active.xp + xp;
    const lvlUp = levelUpCheck({ ...active, xp: newXp });

    if (lvlUp.leveledUp) {
      db.updatePokemon(active.id, { xp: lvlUp.newXp, level: lvlUp.newLevel });
      msg += `🏆 *${enc.pokemon.name}* foi derrotado!\n`;
      msg += `✨ +${xp} XP\n`;
      msg += `🎉 *LEVEL UP!* ${active.name} chegou ao Lv.${lvlUp.newLevel}!`;
    } else {
      db.updatePokemon(active.id, { xp: newXp });
      msg += `🏆 *${enc.pokemon.name}* foi derrotado!\n`;
      msg += `✨ +${xp} XP (${newXp}/${active.level * 100} XP)`;
    }
  } else {
    // Pokémon selvagem contra-ataca
    msg += `${enc.pokemon.emoji} *${enc.pokemon.name}* contra-atacou!\n`;
    msg += `💥 Dano recebido: *${result.wildDamage}*\n\n`;

    if (result.trainerHpAfter <= 0) {
      clearEncounter(trainerId);
      msg += `💔 *${active.name}* desmaiou!\nUse *!curar* para recuperá-lo.`;
    } else {
      msg += `${active.name} ❤️ ${hpBar(result.trainerHpAfter, active.max_hp)}\n`;
      msg += `${enc.pokemon.name} ❤️ ${hpBar(result.wildHpAfter, enc.pokemon.max_hp)}\n\n`;
      msg += `O que fazer agora?\n⚔️ *!atacar* | 🎯 *!capturar* | 🏃 *!fugir*`;
    }
  }

  return msg;
}

// ── !capturar ──────────────────────────────────
async function cmdCatch(trainerId, args) {
  const enc = getEncounter(trainerId);
  if (!enc) return '❌ Não há Pokémon selvagem! Use *!explorar*.';

  const trainer = db.getTrainer(trainerId);
  const ballType = args[0]?.toLowerCase() || 'pokebola';

  const ballMap = {
    pokebola: { field: 'pokeballs', mult: 1, emoji: '🔴' },
    great:    { field: 'great_balls', mult: 1.5, emoji: '🔵' },
    ultra:    { field: 'ultra_balls', mult: 2, emoji: '⚫' },
  };

  const ball = ballMap[ballType] || ballMap.pokebola;

  if (trainer[ball.field] <= 0) {
    return `❌ Você não tem ${ballType}! Use *!loja* para comprar mais.`;
  }

  // Descontar pokébola
  db.updateTrainer(trainerId, { [ball.field]: trainer[ball.field] - 1 });

  incrementAttempts(trainerId);
  const catchRate = calcCatchRate(enc.pokemon, ball.mult);
  const caught = Math.random() < catchRate;

  if (caught) {
    const collection = db.getTrainerPokemon(trainerId);
    if (collection.length >= 30) {
      clearEncounter(trainerId);
      return `❌ Sua mochila está cheia! (máx. 30 Pokémon)\nLibere espaço antes de capturar mais.`;
    }

    db.addPokemon(trainerId, {
      id: enc.pokemon.id,
      name: enc.pokemon.name,
      level: enc.pokemon.level,
      hp: enc.pokemon.hp,
      attack: enc.pokemon.attack,
      defense: enc.pokemon.defense,
      speed: enc.pokemon.speed,
    });

    clearEncounter(trainerId);
    return (
      `${ball.emoji} Você jogou uma ${ballType}...\n\n` +
      `🎊 *Capturado!* ${enc.pokemon.emoji} *${enc.pokemon.name}* foi capturado!\n` +
      `${rarityEmoji(enc.pokemon.rarity)} Raridade: ${enc.pokemon.rarity}\n\n` +
      `Use *!mochila* para ver seu time!`
    );
  } else {
    const active = db.getActivePokemon(trainerId);
    return (
      `${ball.emoji} Você jogou uma ${ballType}...\n\n` +
      `💨 *${enc.pokemon.name}* escapou! (${Math.round(catchRate * 100)}% de chance)\n\n` +
      `${enc.pokemon.emoji} HP: ${hpBar(enc.pokemon.hp, enc.pokemon.max_hp)}\n\n` +
      `Tente novamente: *!capturar* [pokebola/great/ultra]\n` +
      `Ou enfraqueça mais: *!atacar* | *!fugir*`
    );
  }
}

// ── !fugir ─────────────────────────────────────
async function cmdFlee(trainerId) {
  const enc = getEncounter(trainerId);
  if (!enc) return '❌ Você não está em batalha!';

  clearEncounter(trainerId);
  return `🏃 Você fugiu de *${enc.pokemon.name}*!\nUse *!explorar* para continuar sua aventura.`;
}

// ── !mochila ───────────────────────────────────
async function cmdBag(trainerId) {
  const trainer = db.getTrainer(trainerId);
  if (!trainer) return '❌ Use *!start [nome]* primeiro!';

  const pokemon = db.getTrainerPokemon(trainerId);
  if (!pokemon.length) return '📦 Sua mochila está vazia! Use *!explorar* para capturar Pokémon.';

  let msg = `🎒 *Mochila de ${trainer.name}*\n━━━━━━━━━━━━\n`;
  msg += pokemon.map((p, i) => {
    const active = p.is_active ? ' ◄' : '';
    const hpInfo = `❤️ ${p.hp}/${p.max_hp}`;
    return `*${i + 1}.* ${p.name} Lv.${p.level} ${hpInfo}${active}`;
  }).join('\n');
  msg += `\n\nPara trocar o Pokémon ativo: *!ativar [número]*`;
  return msg;
}

// ── !ativar ────────────────────────────────────
async function cmdActivate(trainerId, args) {
  const index = parseInt(args[0]) - 1;
  const pokemon = db.getTrainerPokemon(trainerId);

  if (isNaN(index) || index < 0 || index >= pokemon.length) {
    return `❌ Número inválido. Você tem ${pokemon.length} Pokémon.`;
  }

  const chosen = pokemon[index];
  if (chosen.hp <= 0) return `❌ ${chosen.name} está desmaiado! Use *!curar* primeiro.`;

  db.setPokemonActive(trainerId, chosen.id);
  return `✅ *${chosen.name}* Lv.${chosen.level} agora é seu Pokémon ativo!`;
}

// ── !viajar ────────────────────────────────────
async function cmdTravel(trainerId, args) {
  const trainer = db.getTrainer(trainerId);
  if (!trainer) return '❌ Use *!start [nome]* primeiro!';

  const destination = args[0]?.toLowerCase();
  if (!destination) return cmdRegions(trainerId);

  const region = getRegion(destination);
  if (!region) {
    return `❌ Região desconhecida! Regiões disponíveis: *kanto, johto, hoenn, sinnoh*`;
  }

  if (trainer.region === destination) {
    return `📍 Você já está em *${region.name}*!`;
  }

  if (!canTravelToRegion(destination, trainer.level)) {
    return (
      `🔒 Você precisa ser Nível *${region.unlockLevel}* para viajar para *${region.name}*!\n` +
      `Seu nível atual: ${trainer.level}\n\n` +
      `Continue explorando para ganhar XP!`
    );
  }

  // Custo de viagem
  const TRAVEL_COST = { johto: 200, hoenn: 500, sinnoh: 800 };
  const cost = TRAVEL_COST[destination] || 0;

  if (cost > 0 && trainer.coins < cost) {
    return `❌ Você precisa de *${cost} moedas* para viajar para ${region.name}. Você tem ${trainer.coins}.`;
  }

  db.updateTrainer(trainerId, {
    region: destination,
    coins: trainer.coins - cost,
  });

  return (
    `${region.emoji} *Viajando para ${region.name}!*\n\n` +
    `${region.description}\n\n` +
    `🗺️ Áreas disponíveis:\n` +
    region.areas.map(a => `  • ${a}`).join('\n') +
    `\n\n💰 Custo: ${cost} moedas\nUse *!explorar* para encontrar novos Pokémon!`
  );
}

// ── !regioes ───────────────────────────────────
async function cmdRegions(trainerId) {
  const trainer = db.getTrainer(trainerId);
  const regions = getRegionList();

  let msg = `🗺️ *Regiões Disponíveis*\n━━━━━━━━━━━━\n`;
  for (const r of regions) {
    const locked = trainer && trainer.level < r.unlockLevel;
    const current = trainer?.region === r.key ? ' ◄ ATUAL' : '';
    msg += `${r.emoji} *${r.name}*${current}\n`;
    if (locked) {
      msg += `  🔒 Nível ${r.unlockLevel} necessário\n`;
    } else {
      const costs = { johto: 200, hoenn: 500, sinnoh: 800 };
      const cost = costs[r.key];
      if (cost) msg += `  💰 Custo: ${cost} moedas\n`;
    }
  }
  msg += `\nPara viajar: *!viajar [região]*`;
  return msg;
}

// ── !loja ──────────────────────────────────────
async function cmdShop(trainerId) {
  const trainer = db.getTrainer(trainerId);
  if (!trainer) return '❌ Use *!start [nome]* primeiro!';

  return (
    `🏪 *Loja Pokémon*\n━━━━━━━━━━━━\n` +
    `💰 Suas moedas: *${trainer.coins}*\n\n` +
    `*1.* 🔴 Pokébola - *50 moedas*\n` +
    `*2.* 🔵 Great Ball - *100 moedas*\n` +
    `*3.* ⚫ Ultra Ball - *200 moedas*\n` +
    `*4.* 💊 Poção - *80 moedas* (cura 50 HP)\n` +
    `*5.* 💊 Super Poção - *150 moedas* (cura HP total)\n\n` +
    `Para comprar: *!comprar [item] [quantidade]*\n` +
    `Exemplo: *!comprar pokebola 3*`
  );
}

// ── !comprar ───────────────────────────────────
async function cmdBuy(trainerId, args) {
  const trainer = db.getTrainer(trainerId);
  if (!trainer) return '❌ Use *!start [nome]* primeiro!';

  const item = args[0]?.toLowerCase();
  const qty = Math.max(1, Math.min(99, parseInt(args[1]) || 1));

  const shop = {
    pokebola:   { field: 'pokeballs',    price: 50,  emoji: '🔴' },
    great:      { field: 'great_balls',  price: 100, emoji: '🔵' },
    ultra:      { field: 'ultra_balls',  price: 200, emoji: '⚫' },
  };

  const product = shop[item];
  if (!product) return `❌ Item inválido! Use *!loja* para ver os itens.`;

  const total = product.price * qty;
  if (trainer.coins < total) {
    return `❌ Moedas insuficientes! Você precisa de *${total}* moedas e tem *${trainer.coins}*.`;
  }

  db.updateTrainer(trainerId, {
    coins: trainer.coins - total,
    [product.field]: trainer[product.field] + qty,
  });

  return `✅ Comprado! ${product.emoji} *${qty}x ${item}* por *${total} moedas*.\nSaldo restante: ${trainer.coins - total} moedas.`;
}

// ── !curar ─────────────────────────────────────
async function cmdHeal(trainerId) {
  const trainer = db.getTrainer(trainerId);
  if (!trainer) return '❌ Use *!start [nome]* primeiro!';

  const HEAL_COST = 50;
  if (trainer.coins < HEAL_COST) {
    return `❌ Cura custa *${HEAL_COST} moedas*. Você tem ${trainer.coins}.`;
  }

  const pokemon = db.getTrainerPokemon(trainerId);
  if (!pokemon.length) return '❌ Você não tem Pokémon!';

  for (const p of pokemon) {
    db.updatePokemon(p.id, { hp: p.max_hp });
  }
  db.updateTrainer(trainerId, { coins: trainer.coins - HEAL_COST });

  return `💊 *Centro Pokémon!*\nTodos os seus Pokémon foram curados por *${HEAL_COST} moedas*! 🏥\nSaldo: ${trainer.coins - HEAL_COST} moedas.`;
}

// ── !ajuda ─────────────────────────────────────
function cmdHelp() {
  return (
    `🎮 *Pokémon WhatsApp RPG*\n━━━━━━━━━━━━\n\n` +
    `*📋 INÍCIO*\n` +
    `!start [nome] — Criar treinador\n` +
    `!escolher [1-3] — Escolher starter\n` +
    `!status — Ver seu perfil\n\n` +
    `*🌿 EXPLORAÇÃO*\n` +
    `!explorar — Encontrar Pokémon\n` +
    `!atacar — Atacar Pokémon selvagem\n` +
    `!capturar [tipo] — Usar pokébola\n` +
    `!fugir — Escapar da batalha\n\n` +
    `*🎒 EQUIPE*\n` +
    `!mochila — Ver seus Pokémon\n` +
    `!ativar [nº] — Trocar Pokémon ativo\n` +
    `!curar — Curar todos (50 moedas)\n\n` +
    `*🗺️ REGIÕES*\n` +
    `!regioes — Ver regiões disponíveis\n` +
    `!viajar [região] — Viajar\n\n` +
    `*🏪 LOJA*\n` +
    `!loja — Ver itens disponíveis\n` +
    `!comprar [item] [qtd] — Comprar\n\n` +
    `_Pokébola: !capturar pokebola_\n` +
    `_Great Ball: !capturar great_\n` +
    `_Ultra Ball: !capturar ultra_`
  );
}

module.exports = { handleCommand };
