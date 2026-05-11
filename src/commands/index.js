// ═══════════════════════════════════════════════════════════
//  COMMANDS — Pokézap
// ═══════════════════════════════════════════════════════════

const db = require('../database/db');
const { getRandomWildPokemon, getStartersByRegion, buildPokemon, getPokemonById } = require('../game/pokemon');
const { calcDamage, calcCatchRate, levelUpCheck, xpGain, effectivenessMessage } = require('../game/battle');
const { setEncounter, getEncounter, updateEncounterHp, clearEncounter } = require('../game/encounters');
const { getRegion, canTravel, getRegionList, TRAVEL_COST } = require('../game/regions');
const { canEvolveByLevel, canEvolveByStone, canEvolveByHappiness, getEvolveInfo, STONES } = require('../game/evolution');
const { trackEvent, formatCompletedMissions, applyMissionRewards } = require('../game/missions');
const { hpBar, rarityEmoji, capitalize, formatTrainerStatus, formatCollection } = require('../utils/format');
const { STICKER_HELP, MIN_VIDEO_DURATION, MAX_VIDEO_DURATION } = require('../utils/sticker');

// Starters aguardando escolha (em memória)
const pendingStarters = new Map();

async function handleCommand(text, senderId, chatId, isGroup) {
  const parts = text.trim().split(/\s+/);
  const cmd   = parts[0].toLowerCase();
  const args  = parts.slice(1);

  switch (cmd) {
    case '!start':          return cmdStart(senderId, args);
    case '!escolher':       return cmdChooseStarter(senderId, args);
    case '!status':         return cmdStatus(senderId);
    case '!explorar':       return cmdExplore(senderId);
    case '!atacar':         return cmdAttack(senderId);
    case '!capturar':       return cmdCatch(senderId, args);
    case '!fugir':          return cmdFlee(senderId);
    case '!mochila':        return cmdBag(senderId);
    case '!ativar':         return cmdActivate(senderId, args);
    case '!curar':          return cmdHeal(senderId);
    case '!viajar':         return cmdTravel(senderId, args);
    case '!regioes':
    case '!regiões':        return cmdRegions(senderId);
    case '!evoluir':        return cmdEvolve(senderId, args);
    case '!evolucoes':
    case '!evoluções':      return cmdShowEvolutions(senderId);
    case '!pedras':         return cmdStones();
    case '!loja':           return cmdShop(senderId);
    case '!comprar':        return cmdBuy(senderId, args);
    case '!batalha':        return cmdChallenge(senderId, args, chatId, isGroup);
    case '!aceitar':        return cmdAcceptBattle(senderId);
    case '!recusar':        return cmdDeclineBattle(senderId);
    case '!pvpataque':
    case '!pa':             return cmdPvpAttack(senderId);
    case '!pvpfugir':
    case '!pf':             return cmdPvpFlee(senderId);
    case '!ranking':        return cmdRanking();
    case '!missoes':
    case '!missões':        return cmdMyMissions(senderId);
    case '!missoes_disp':
    case '!md':             return cmdAvailableMissions(senderId, args);
    case '!aceitar_missao':
    case '!am':             return cmdAcceptMission(senderId, args);
    case '!figurinha':
    case '!sticker':        return STICKER_HELP;
    case '!ajuda':
    case '!help':           return cmdHelp();
    default:                return null;
  }
}

// ══════════════════════════════════════
//  INÍCIO / REGISTRO
// ══════════════════════════════════════
async function cmdStart(id, args) {
  if (db.getTrainer(id)) return `⚠️ Você já tem uma conta! Use *!status* para ver seu perfil.`;

  const name = args.join(' ').trim();
  if (!name) return `👋 Bem-vindo ao mundo Pokémon!\n\nUse *!start [seu nome]* para criar sua conta.\nExemplo: *!start Ash*`;

  db.createTrainer(id, name);
  const starters = getStartersByRegion('kanto');
  pendingStarters.set(id, { starters });

  return (
    `🎉 *Olá, ${name}!* Bem-vindo ao mundo Pokémon!\n\n` +
    `Escolha seu Pokémon inicial de Kanto:\n\n` +
    starters.map((p, i) =>
      `*${i + 1}.* ${p.emoji} *${p.name}* (${p.type.join('/')})\n` +
      `   ❤️${p.hp}  ⚔️${p.attack}  🛡️${p.defense}  💨${p.speed}`
    ).join('\n\n') +
    `\n\nResponda com *!escolher 1*, *!escolher 2* ou *!escolher 3*`
  );
}

async function cmdChooseStarter(id, args) {
  const trainer = db.getTrainer(id);
  if (!trainer) return '❌ Use *!start [nome]* primeiro!';

  const pending = pendingStarters.get(id);
  if (!pending) return '❌ Nenhuma escolha pendente. Você já tem um Pokémon inicial!';

  const n = parseInt(args[0]);
  if (!n || n < 1 || n > 3) return '❌ Use *!escolher 1*, *!escolher 2* ou *!escolher 3*.';

  const chosen = pending.starters[n - 1];
  db.addPokemon(id, chosen);
  pendingStarters.delete(id);

  return (
    `🎊 *${chosen.emoji} ${chosen.name}* será seu parceiro!\n\n` +
    `Dicas para começar:\n` +
    `🌿 *!explorar* — encontrar Pokémon selvagens\n` +
    `📊 *!status* — ver seu perfil\n` +
    `🎒 *!mochila* — ver seus Pokémon\n` +
    `❓ *!ajuda* — todos os comandos\n\n` +
    `Boa sorte, Treinador!`
  );
}

// ══════════════════════════════════════
//  STATUS & MOCHILA
// ══════════════════════════════════════
async function cmdStatus(id) {
  const t = db.getTrainer(id);
  if (!t) return '❌ Use *!start [nome]* primeiro!';

  const active = db.getActivePokemon(id);
  const total  = db.getTrainerPokemon(id).length;
  const done   = db.countCompletedMissions(id);

  let msg = formatTrainerStatus(t, active);
  msg += `\n📦 Pokémon: ${total}/30  |  ✅ Missões: ${done} concluídas`;
  return msg;
}

async function cmdBag(id) {
  const t = db.getTrainer(id);
  if (!t) return '❌ Use *!start [nome]* primeiro!';

  const list = db.getTrainerPokemon(id);
  if (!list.length) return '📦 Mochila vazia! Use *!explorar* para capturar Pokémon.';

  return (
    `🎒 *Mochila de ${t.name}*\n━━━━━━━━━━\n` +
    formatCollection(list) +
    `\n\nTotal: ${list.length}/30  |  Trocar ativo: *!ativar [nº]*`
  );
}

async function cmdActivate(id, args) {
  const list = db.getTrainerPokemon(id);
  if (!list.length) return '❌ Você não tem Pokémon! Use *!explorar*.';

  const idx = parseInt(args[0]) - 1;
  if (isNaN(idx) || idx < 0 || idx >= list.length) {
    return `❌ Número inválido. Você tem ${list.length} Pokémon (1–${list.length}).`;
  }

  const p = list[idx];
  if (p.hp <= 0) return `❌ *${p.name}* está desmaiado! Use *!curar* primeiro.`;

  db.setPokemonActive(id, p.id);
  return `✅ *${p.emoji || '🔴'} ${p.name}* Lv.${p.level} agora é seu Pokémon ativo!`;
}

// ══════════════════════════════════════
//  EXPLORAÇÃO & BATALHA SELVAGEM
// ══════════════════════════════════════
async function cmdExplore(trainerId) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';

  const active = db.getActivePokemon(trainerId);
  if (!active) return '❌ Sem Pokémon ativo! Use *!mochila* e depois *!ativar [nº]*.';
  if (active.hp <= 0) return '💔 Seu Pokémon ativo está desmaiado! Use *!curar*.';
  if (getEncounter(trainerId)) {
    return `⚠️ Você já está em batalha!\n\n⚔️ *!atacar*  🎯 *!capturar [pokebola/great/ultra]*  🏃 *!fugir*`;
  }

  const wild = getRandomWildPokemon(t.region, t.level);
  if (!wild) return '🌿 Nenhum Pokémon apareceu por aqui... Tente novamente!';

  setEncounter(trainerId, wild);

  const completed = trackEvent(trainerId, 'explore', { region: t.region });
  applyMissionRewards(trainerId, completed);

  const region = getRegion(t.region);
  return (
    `🌿 *Explorando ${region?.name || capitalize(t.region)}...*\n\n` +
    `⚠️ Um Pokémon selvagem apareceu!\n\n` +
    `${wild.emoji} *${wild.name}* ${rarityEmoji(wild.rarity)} Lv.${wild.level}\n` +
    `🏷️ ${wild.type.join(' / ')}\n` +
    `❤️ ${hpBar(wild.hp, wild.hp)}\n\n` +
    `⚔️ *!atacar*  🎯 *!capturar [pokebola/great/ultra]*  🏃 *!fugir*` +
    formatCompletedMissions(completed)
  );
}

async function cmdAttack(trainerId) {
  const enc = getEncounter(trainerId);
  if (!enc) return '❌ Sem encontro ativo! Use *!explorar* primeiro.';

  const active = db.getActivePokemon(trainerId);
  if (!active || active.hp <= 0) return '💔 Seu Pokémon está desmaiado! Use *!curar*.';

  // Ataque do jogador
  const { damage: myDmg, effectiveness } = calcDamage(active, enc.pokemon);
  const wildHpAfter = Math.max(0, enc.pokemon.hp - myDmg);
  updateEncounterHp(trainerId, wildHpAfter);

  const effMsg = effectivenessMessage(effectiveness);
  let msg = `⚔️ *${active.name}* atacou *${enc.pokemon.name}*!\n💥 Dano: *${myDmg}*${effMsg}\n\n`;

  // Pokémon selvagem derrotado
  if (wildHpAfter <= 0) {
    clearEncounter(trainerId);
    const xp    = xpGain(enc.pokemon.level);
    const newXp = active.xp + xp;
    const lvl   = levelUpCheck({ ...active, xp: newXp });

    if (lvl.leveledUp) {
      db.updatePokemon(active.id, { xp: lvl.newXp, level: lvl.newLevel });
      msg += `🏆 *${enc.pokemon.name}* foi derrotado!\n✨ +${xp} XP\n🎉 *LEVEL UP!* ${active.name} → Lv.${lvl.newLevel}!`;

      // Verificar possível evolução
      const updatedPoke = { ...active, level: lvl.newLevel, pokemon_id: active.pokemon_id };
      const evoCheck = canEvolveByLevel(updatedPoke);
      if (evoCheck) msg += `\n💡 *${active.name}* pode evoluir! Use *!evoluir*`;
    } else {
      db.updatePokemon(active.id, { xp: newXp });
      msg += `🏆 *${enc.pokemon.name}* foi derrotado! ✨ +${xp} XP`;
    }

    // Atualizar XP do treinador
    const trainer = db.getTrainer(trainerId);
    const newTrainerXp = trainer.xp + Math.floor(xp / 2);
    const lvlXp = trainer.level * 150;
    if (newTrainerXp >= lvlXp) {
      db.updateTrainer(trainerId, { xp: newTrainerXp - lvlXp, level: trainer.level + 1, wins: trainer.wins + 1 });
      msg += `\n⭐ *Level Up de Treinador!* → Nível ${trainer.level + 1}!`;
    } else {
      db.updateTrainer(trainerId, { xp: newTrainerXp, wins: trainer.wins + 1 });
    }

    const comp = trackEvent(trainerId, 'defeat');
    applyMissionRewards(trainerId, comp);
    msg += formatCompletedMissions(comp);

  } else {
    // Contra-ataque do selvagem
    const { damage: wildDmg } = calcDamage(enc.pokemon, active);
    const myHpAfter = Math.max(0, active.hp - wildDmg);
    db.updatePokemon(active.id, { hp: myHpAfter });

    msg += `${enc.pokemon.emoji} *${enc.pokemon.name}* contra-atacou! 💥 Dano: *${wildDmg}*\n\n`;

    if (myHpAfter <= 0) {
      clearEncounter(trainerId);
      db.updateTrainer(trainerId, { losses: db.getTrainer(trainerId).losses + 1 });
      msg += `💔 *${active.name}* desmaiou!\nUse *!curar* para recuperá-lo.`;
    } else {
      msg += `Seu: ❤️ ${hpBar(myHpAfter, active.max_hp)}\n`;
      msg += `${enc.pokemon.name}: ❤️ ${hpBar(wildHpAfter, enc.pokemon.max_hp)}\n\n`;
      msg += `⚔️ *!atacar*  🎯 *!capturar [pokebola/great/ultra]*  🏃 *!fugir*`;
    }
  }

  return msg;
}

async function cmdCatch(trainerId, args) {
  const enc = getEncounter(trainerId);
  if (!enc) return '❌ Sem Pokémon selvagem! Use *!explorar*.';

  const t = db.getTrainer(trainerId);

  const ballMap = {
    pokebola: { field: 'pokeballs',   mult: 1,   emoji: '🔴', label: 'Pokébola' },
    great:    { field: 'great_balls', mult: 1.5, emoji: '🔵', label: 'Great Ball' },
    ultra:    { field: 'ultra_balls', mult: 2,   emoji: '⚫', label: 'Ultra Ball' },
  };

  const ballType = args[0]?.toLowerCase() || 'pokebola';
  const ball = ballMap[ballType] || ballMap.pokebola;

  if (t[ball.field] <= 0) {
    return `❌ Sem ${ball.label}! Use *!loja* para comprar ou *!comprar ${ballType} [qtd]*.`;
  }

  db.updateTrainer(trainerId, { [ball.field]: t[ball.field] - 1 });

  const rate = calcCatchRate(enc.pokemon, ball.mult);

  if (Math.random() < rate) {
    if (db.getTrainerPokemon(trainerId).length >= 30) {
      clearEncounter(trainerId);
      return `❌ Mochila cheia (máx 30 Pokémon)! Use *!mochila* para ver sua coleção.`;
    }

    db.addPokemon(trainerId, enc.pokemon);
    clearEncounter(trainerId);

    const comp = trackEvent(trainerId, 'capture', { rarity: enc.pokemon.rarity });
    applyMissionRewards(trainerId, comp);

    return (
      `${ball.emoji} Você jogou uma *${ball.label}*...\n\n` +
      `🎊 *${enc.pokemon.emoji} ${enc.pokemon.name}* foi capturado!\n` +
      `${rarityEmoji(enc.pokemon.rarity)} ${capitalize(enc.pokemon.rarity)} | Lv.${enc.pokemon.level}` +
      formatCompletedMissions(comp)
    );
  }

  return (
    `${ball.emoji} Você jogou uma *${ball.label}*...\n\n` +
    `💨 *${enc.pokemon.name}* escapou! (chance: ${Math.round(rate * 100)}%)\n\n` +
    `❤️ ${hpBar(enc.pokemon.hp, enc.pokemon.max_hp)}\n\n` +
    `⚔️ *!atacar*  🎯 *!capturar*  🏃 *!fugir*`
  );
}

async function cmdFlee(trainerId) {
  const enc = getEncounter(trainerId);
  if (!enc) return '❌ Você não está em batalha!';
  clearEncounter(trainerId);
  return `🏃 Você fugiu de *${enc.pokemon.name}*!`;
}

// ══════════════════════════════════════
//  CURA & LOJA
// ══════════════════════════════════════
async function cmdHeal(trainerId) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';

  if (t.coins < 50) return `❌ Cura custa *50 moedas*. Você tem ${t.coins} moedas.`;

  const list = db.getTrainerPokemon(trainerId);
  if (!list.length) return '❌ Você não tem Pokémon!';

  const desmaiados = list.filter(p => p.hp < p.max_hp).length;
  if (desmaiados === 0) return '✅ Todos os seus Pokémon já estão com HP cheio!';

  for (const p of list) db.updatePokemon(p.id, { hp: p.max_hp });
  db.updateTrainer(trainerId, { coins: t.coins - 50 });

  return `💊 *Centro Pokémon!*\nTodos os ${list.length} Pokémon foram curados! (-50 moedas)\n💰 Saldo: ${t.coins - 50} moedas`;
}

async function cmdShop(trainerId) {
  const t = db.getTrainer(trainerId);
  const coins = t?.coins ?? '?';

  const stoneList = Object.entries(STONES)
    .map(([name, s]) => `  ${s.emoji} Pedra ${name} — ${s.price} moedas`)
    .join('\n');

  return (
    `🏪 *Loja Pokémon*\n💰 Suas moedas: *${coins}*\n━━━━━━━━━━\n` +
    `🔴 *pokebola* — 50 moedas\n` +
    `🔵 *great* — 100 moedas\n` +
    `⚫ *ultra* — 200 moedas\n` +
    `💊 *pocao* — 80 moedas (cura 50 HP)\n` +
    `💊 *superpocao* — 150 moedas (cura total)\n\n` +
    `🪨 *Pedras Evolutivas:*\n${stoneList}\n\n` +
    `Usar: *!comprar [item] [qtd]*\n` +
    `Ex: *!comprar pokebola 5* | *!comprar pedra_trovao 1*`
  );
}

async function cmdBuy(trainerId, args) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';

  const item = args[0]?.toLowerCase();
  const qty  = Math.max(1, parseInt(args[1]) || 1);

  if (!item) return '❌ Especifique o item. Veja *!loja*.';

  // Pedras evolutivas
  if (item.startsWith('pedra_')) {
    const stoneName = capitalize(item.replace('pedra_', ''));
    const stone = STONES[stoneName];
    if (!stone) return `❌ Pedra desconhecida. Use *!pedras* para ver as disponíveis.`;

    const total = stone.price * qty;
    if (t.coins < total) return `❌ Precisa de *${total} moedas*. Você tem ${t.coins}.`;

    db.updateTrainer(trainerId, { coins: t.coins - total });
    return `✅ Comprado! ${stone.emoji} *${qty}x Pedra ${stoneName}* por ${total} moedas.\nUse *!evoluir pedra_${stoneName.toLowerCase()}* para evoluir seu Pokémon.`;
  }

  const shop = {
    pokebola:   { field: 'pokeballs',   price: 50,  type: 'ball',      emoji: '🔴', label: 'Pokébola'   },
    great:      { field: 'great_balls', price: 100, type: 'ball',      emoji: '🔵', label: 'Great Ball'  },
    ultra:      { field: 'ultra_balls', price: 200, type: 'ball',      emoji: '⚫', label: 'Ultra Ball'  },
    pocao:      { field: null,          price: 80,  type: 'heal',      heal: 50,    label: 'Poção'       },
    superpocao: { field: null,          price: 150, type: 'superheal', heal: 99999, label: 'Super Poção' },
  };

  const product = shop[item];
  if (!product) return `❌ Item *${item}* não encontrado! Veja *!loja*.`;

  const total = product.price * qty;
  if (t.coins < total) return `❌ Precisa de *${total} moedas*. Você tem ${t.coins}.`;

  if (product.type === 'ball') {
    db.updateTrainer(trainerId, {
      coins: t.coins - total,
      [product.field]: t[product.field] + qty,
    });
    return `✅ ${product.emoji} *${qty}x ${product.label}* comprada(s) por ${total} moedas.\n💰 Saldo: ${t.coins - total} moedas`;
  }

  // Poções
  const active = db.getActivePokemon(trainerId);
  if (!active) return '❌ Sem Pokémon ativo para usar a poção!';
  if (active.hp >= active.max_hp) return `✅ *${active.name}* já está com HP cheio!`;

  const healed = Math.min(active.max_hp, active.hp + product.heal * qty) - active.hp;
  db.updatePokemon(active.id, { hp: active.hp + healed });
  db.updateTrainer(trainerId, { coins: t.coins - total });

  return (
    `💊 *${active.name}* recuperou *${healed} HP*!\n` +
    `❤️ ${hpBar(active.hp + healed, active.max_hp)}\n` +
    `💰 Saldo: ${t.coins - total} moedas`
  );
}

// ══════════════════════════════════════
//  EVOLUÇÃO
// ══════════════════════════════════════
async function cmdEvolve(trainerId, args) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';

  const active = db.getActivePokemon(trainerId);
  if (!active) return '❌ Sem Pokémon ativo!';

  const stoneArg = args[0]?.toLowerCase();
  let evo = null;

  if (stoneArg?.startsWith('pedra_')) {
    const stoneName = capitalize(stoneArg.replace('pedra_', ''));
    evo = canEvolveByStone(active, stoneName);
    if (!evo) return `❌ *${active.name}* não evolui com Pedra ${stoneName}.\nUse *!evolucoes* para ver as evoluções disponíveis.`;
  } else {
    evo = canEvolveByLevel(active) || canEvolveByHappiness(active);
    if (!evo) {
      const info = getEvolveInfo(active.pokemon_id);
      if (info) {
        return `❌ *${active.name}* ainda não pode evoluir.\n📋 Requisito: ${info.description} (atual: Lv.${active.level})`;
      }
      return `❌ *${active.name}* não tem evolução conhecida.`;
    }
  }

  const nextBase = getPokemonById(evo.into);
  if (!nextBase) return `❌ Dados da evolução não encontrados.`;

  const newPoke  = buildPokemon(nextBase, active.level);
  const oldName  = active.name;
  const oldEmoji = active.emoji || '🔴';

  db.updatePokemon(active.id, {
    pokemon_id: newPoke.id,
    name:       newPoke.name,
    max_hp:     newPoke.hp,
    hp:         newPoke.hp,
    attack:     newPoke.attack,
    defense:    newPoke.defense,
    speed:      newPoke.speed,
  });

  const comp = trackEvent(trainerId, 'evolve');
  applyMissionRewards(trainerId, comp);

  return (
    `✨ *${oldName}* está evoluindo...\n\n` +
    `🌟 *${oldEmoji} ${oldName}* evoluiu para *${newPoke.emoji} ${newPoke.name}*!\n\n` +
    `❤️ ${newPoke.hp}  ⚔️ ${newPoke.attack}  🛡️ ${newPoke.defense}  💨 ${newPoke.speed}` +
    formatCompletedMissions(comp)
  );
}

async function cmdShowEvolutions(trainerId) {
  const list = db.getTrainerPokemon(trainerId);
  if (!list.length) return '❌ Você não tem Pokémon!';

  const lines = list.map(p => {
    const info = getEvolveInfo(p.pokemon_id);
    if (!info || info.value === 999) return `⭐ ${p.emoji || '🔴'} ${p.name} — forma final`;

    const next = getPokemonById(info.into);
    const ready = info.method === 'level'
      ? p.level >= info.value
      : info.method === 'happiness'
      ? p.level >= 20
      : false; // stone: always ready if has stone

    const status = info.method === 'stone' ? '💎' : (ready ? '✅' : '⏳');
    return `${status} ${p.emoji || '🔴'} ${p.name} Lv.${p.level} → ${next?.name || '?'}\n   📋 ${info.description}`;
  });

  return `🔬 *Evoluções do seu time*\n━━━━━━━━━━\n` + lines.join('\n\n');
}

async function cmdStones() {
  const lines = Object.entries(STONES).map(([n, s]) =>
    `${s.emoji} *Pedra ${n}* — ${s.price} moedas\n   !comprar pedra_${n.toLowerCase()} 1`
  );
  return `💎 *Pedras Evolutivas*\n━━━━━━━━━━\n` + lines.join('\n\n');
}

// ══════════════════════════════════════
//  VIAGEM / REGIÕES
// ══════════════════════════════════════
async function cmdTravel(trainerId, args) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';

  const dest = args[0]?.toLowerCase();
  if (!dest) return cmdRegions(trainerId);

  const region = getRegion(dest);
  if (!region) return `❌ Região *${dest}* desconhecida.\nUse *!regioes* para ver as disponíveis.`;

  if (t.region === dest) return `📍 Você já está em *${region.name}*!`;

  if (!canTravel(dest, t.level)) {
    return `🔒 Precisa de Nível *${region.unlockLevel}* para ir a *${region.name}*.\nSeu nível atual: ${t.level}`;
  }

  const cost = TRAVEL_COST[dest] || 0;
  if (cost > 0 && t.coins < cost) {
    return `❌ Precisa de *${cost} moedas* para viajar para *${region.name}*.\nVocê tem ${t.coins} moedas.`;
  }

  db.updateTrainer(trainerId, { region: dest, coins: t.coins - cost });

  const comp = trackEvent(trainerId, 'travel');
  applyMissionRewards(trainerId, comp);

  return (
    `${region.emoji} *Viagem para ${region.name}!*\n\n` +
    `${region.description}\n\n` +
    `💰 Custo: ${cost > 0 ? `${cost} moedas` : 'Grátis'}\n\n` +
    `Use *!explorar* para começar a aventura!` +
    formatCompletedMissions(comp)
  );
}

async function cmdRegions(trainerId) {
  const t    = db.getTrainer(trainerId);
  const list = getRegionList();

  let msg = `🗺️ *Regiões Disponíveis*\n━━━━━━━━━━\n`;

  for (const r of list) {
    const locked = t && t.level < r.unlockLevel;
    const isCurrent = t?.region === r.key;
    const cost = TRAVEL_COST[r.key];

    msg += `\n${r.emoji} *${r.name}*${isCurrent ? ' ◄ ATUAL' : ''}\n`;
    if (locked) {
      msg += `  🔒 Nível ${r.unlockLevel} necessário\n`;
    } else if (cost > 0) {
      msg += `  💰 ${cost} moedas para viajar\n`;
    } else {
      msg += `  ✅ Disponível gratuitamente\n`;
    }
  }

  msg += `\nViajar: *!viajar [kanto/johto/hoenn/sinnoh]*`;
  return msg;
}

// ══════════════════════════════════════
//  PvP
// ══════════════════════════════════════
async function cmdChallenge(challengerId, args, chatId, isGroup) {
  const challenger = db.getTrainer(challengerId);
  if (!challenger) return '❌ Use *!start [nome]* primeiro!';

  if (getEncounter(challengerId)) return '❌ Você está em batalha selvagem! Use *!fugir* primeiro.';
  if (db.getActivePvpBattle(challengerId)) return '❌ Você já está em uma batalha PvP!';

  const tag = args[0];
  if (!tag) return `❌ Use *!batalha @usuário* ou *!batalha [número]*\nEx: *!batalha 5511999999999*`;

  const raw = tag.replace('@', '').replace(/\D/g, '');
  const opponentId = raw + '@s.whatsapp.net';

  if (opponentId === challengerId) return `❌ Você não pode batalhar consigo mesmo!`;

  const opponent = db.getTrainer(opponentId);
  if (!opponent) return `❌ Oponente não encontrado. Ele precisa ter criado conta com *!start*.`;
  if (db.getActivePvpBattle(opponentId)) return `❌ *${opponent.name}* já está em batalha!`;

  const myPoke    = db.getActivePokemon(challengerId);
  const theirPoke = db.getActivePokemon(opponentId);

  if (!myPoke || myPoke.hp <= 0) return '❌ Seu Pokémon ativo está desmaiado! Use *!curar*.';
  if (!theirPoke) return `❌ *${opponent.name}* não tem Pokémon ativo.`;

  db.createPvpBattle(
    challengerId, challenger.name,
    opponentId,   opponent.name,
    myPoke.id,    theirPoke.id,
    myPoke.hp,    theirPoke.hp
  );

  return (
    `⚔️ *${challenger.name}* desafiou *${opponent.name}* para uma batalha!\n\n` +
    `${myPoke.emoji || '🔴'} ${myPoke.name} Lv.${myPoke.level} *vs* ` +
    `${theirPoke.emoji || '🔴'} ${theirPoke.name} Lv.${theirPoke.level}\n\n` +
    `*${opponent.name}*, responda:\n✅ *!aceitar* para batalhar\n❌ *!recusar* para declinar`
  );
}

async function cmdAcceptBattle(opponentId) {
  const battle = db.getPendingPvpChallenge(opponentId);
  if (!battle) return '❌ Sem desafio PvP pendente para você.';

  db.updatePvpBattle(battle.id, { status: 'active' });

  const myPoke    = db.getTrainerPokemon(opponentId).find(p => p.id === battle.opponent_pokemon_id);
  const theirPoke = db.getTrainerPokemon(battle.challenger_id).find(p => p.id === battle.challenger_pokemon_id);

  return (
    `⚔️ *BATALHA PvP INICIADA!*\n\n` +
    `🔴 *${battle.challenger_name}*: ${theirPoke?.name || '?'} Lv.${theirPoke?.level || '?'}\n` +
    `🔵 *${battle.opponent_name}*: ${myPoke?.name || '?'} Lv.${myPoke?.level || '?'}\n\n` +
    `*${battle.challenger_name}* ataca primeiro! Use *!pa* para atacar.`
  );
}

async function cmdDeclineBattle(opponentId) {
  const battle = db.getPendingPvpChallenge(opponentId);
  if (!battle) return '❌ Sem desafio PvP pendente.';

  db.updatePvpBattle(battle.id, { status: 'recusada' });
  return `❌ *${battle.opponent_name}* recusou o desafio de *${battle.challenger_name}*.`;
}

async function cmdPvpAttack(trainerId) {
  const battle = db.getActivePvpBattle(trainerId);
  if (!battle || battle.status !== 'active') return '❌ Você não está em batalha PvP ativa. Use *!batalha [número]*.';

  if (battle.turn_id !== trainerId) {
    const turnName = battle.turn_id === battle.challenger_id ? battle.challenger_name : battle.opponent_name;
    return `⏳ Aguarde a vez de *${turnName}* atacar!`;
  }

  const isChallenger = battle.challenger_id === trainerId;
  const defenderId   = isChallenger ? battle.opponent_id   : battle.challenger_id;
  const myPokeId     = isChallenger ? battle.challenger_pokemon_id : battle.opponent_pokemon_id;
  const theirPokeId  = isChallenger ? battle.opponent_pokemon_id  : battle.challenger_pokemon_id;
  const myHp         = isChallenger ? battle.challenger_current_hp : battle.opponent_current_hp;
  const theirHp      = isChallenger ? battle.opponent_current_hp   : battle.challenger_current_hp;

  const myPokeList    = db.getTrainerPokemon(trainerId);
  const theirPokeList = db.getTrainerPokemon(defenderId);
  const attacker      = myPokeList.find(p => p.id === myPokeId);
  const defender      = theirPokeList.find(p => p.id === theirPokeId);

  if (!attacker || !defender) return '❌ Erro nos dados da batalha.';

  const { damage, effectiveness } = calcDamage(
    { ...attacker, hp: myHp },
    { ...defender, hp: theirHp }
  );
  const effMsg   = effectivenessMessage(effectiveness);
  const newDefHp = Math.max(0, theirHp - damage);

  let msg = `⚔️ *${attacker.name}* atacou *${defender.name}*!\n💥 Dano: *${damage}*${effMsg}\n\n`;

  if (newDefHp <= 0) {
    // Fim da batalha
    const winner = db.getTrainer(trainerId);
    const loser  = db.getTrainer(defenderId);

    db.updatePvpBattle(battle.id, { status: 'finalizada', winner_id: trainerId });
    db.updateTrainer(trainerId, {
      wins:       winner.wins + 1,
      pvp_rating: (winner.pvp_rating || 1000) + 25,
      coins:      winner.coins + 200,
    });
    db.updateTrainer(defenderId, {
      losses:     loser.losses + 1,
      pvp_rating: Math.max(100, (loser.pvp_rating || 1000) - 20),
    });

    const comp = trackEvent(trainerId, 'pvp_win');
    applyMissionRewards(trainerId, comp);

    msg += `💀 *${defender.name}* desmaiou!\n🏆 *${winner.name}* venceu!\n+25 ELO | +200 moedas`;
    msg += formatCompletedMissions(comp);
  } else {
    // Continua a batalha
    const newChalHp = isChallenger ? myHp     : newDefHp;
    const newOppHp  = isChallenger ? newDefHp : myHp;

    db.updatePvpBattle(battle.id, {
      challenger_current_hp: newChalHp,
      opponent_current_hp:   newOppHp,
      turn_id:               defenderId,
    });

    const defenderName = isChallenger ? battle.opponent_name : battle.challenger_name;
    msg += `${attacker.name}: ❤️ ${hpBar(myHp, attacker.max_hp)}\n`;
    msg += `${defender.name}: ❤️ ${hpBar(newDefHp, defender.max_hp)}\n\n`;
    msg += `Vez de *${defenderName}*! Use *!pa*.`;
  }

  return msg;
}

async function cmdPvpFlee(trainerId) {
  const battle = db.getActivePvpBattle(trainerId);
  if (!battle || battle.status !== 'active') return '❌ Você não está em batalha PvP.';

  const winnerId = trainerId === battle.challenger_id ? battle.opponent_id : battle.challenger_id;
  db.updatePvpBattle(battle.id, { status: 'finalizada', winner_id: winnerId });
  db.updateTrainer(trainerId, { losses: db.getTrainer(trainerId).losses + 1 });

  return `🏃 Você fugiu da batalha PvP e perdeu o confronto!`;
}

async function cmdRanking() {
  const top = db.getPvpRanking(10);
  if (!top.length) return '📊 Nenhum treinador no ranking ainda.';

  const medals = ['🥇', '🥈', '🥉'];
  const lines = top.map((t, i) =>
    `${medals[i] || `${i + 1}.`} *${t.name}* — ${t.pvp_rating} ELO (${t.wins}V/${t.losses}D)`
  );

  return `🏆 *Ranking PvP — Top 10*\n━━━━━━━━━━\n` + lines.join('\n');
}

// ══════════════════════════════════════
//  MISSÕES
// ══════════════════════════════════════
async function cmdMyMissions(trainerId) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';

  const missions = db.getTrainerMissions(trainerId);
  if (!missions.length) {
    return `📋 Sem missões ativas!\nUse *!md* para ver missões disponíveis e *!am [ID]* para aceitar.`;
  }

  const diffEmoji = { facil: '🟢', medio: '🟡', dificil: '🔴' };

  const lines = missions.map(m => {
    const pct = Math.min(10, Math.round((m.progress / m.target_value) * 10));
    const bar = `[${'█'.repeat(pct)}${'░'.repeat(10 - pct)}]`;
    return (
      `${diffEmoji[m.difficulty] || '⚪'} *${m.title}*\n` +
      `  ${m.description}\n` +
      `  ${m.progress}/${m.target_value} ${bar}`
    );
  });

  return `📋 *Suas Missões Ativas*\n━━━━━━━━━━\n` + lines.join('\n\n');
}

async function cmdAvailableMissions(trainerId, args) {
  const diff   = args[0]?.toLowerCase();
  const all    = db.getMissionTemplates(diff || null);
  const active = db.getTrainerMissions(trainerId).map(m => m.mission_id);
  const list   = all.filter(m => !active.includes(m.id));

  if (!list.length) {
    return `❌ Nenhuma missão disponível${diff ? ` (${diff})` : ''}.\nConclua suas missões atuais!`;
  }

  const diffEmoji = { facil: '🟢', medio: '🟡', dificil: '🔴' };

  const lines = list.map(m =>
    `${diffEmoji[m.difficulty] || '⚪'} *[ID:${m.id}]* ${m.title}\n` +
    `  ${m.description}\n` +
    `  💰 ${m.reward_coins} moedas  ✨ ${m.reward_xp} XP`
  );

  return (
    `📋 *Missões Disponíveis*${diff ? ` — ${capitalize(diff)}` : ''}\n━━━━━━━━━━\n` +
    lines.join('\n\n') +
    `\n\n🔍 Filtrar: *!md facil* | *!md medio* | *!md dificil*\n✅ Aceitar: *!am [ID]*`
  );
}

async function cmdAcceptMission(trainerId, args) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';

  const missionId = parseInt(args[0]);
  if (!missionId) return '❌ Use *!am [ID da missão]*. Veja *!md* para ver as missões.';

  const mission = db.getMissionTemplate(missionId);
  if (!mission) return `❌ Missão #${missionId} não encontrada. Veja *!md*.`;

  const active = db.getTrainerMissions(trainerId);
  if (active.length >= 5) return '❌ Você já tem 5 missões ativas! Conclua algumas primeiro.';
  if (active.find(m => m.mission_id === missionId)) return '❌ Você já tem esta missão ativa.';

  db.acceptMission(trainerId, missionId);

  const diffEmoji = { facil: '🟢', medio: '🟡', dificil: '🔴' };
  let rewards = `💰 +${mission.reward_coins} moedas  ✨ +${mission.reward_xp} XP`;
  if (mission.reward_pokeballs   > 0) rewards += `  🔴 +${mission.reward_pokeballs}`;
  if (mission.reward_great_balls > 0) rewards += `  🔵 +${mission.reward_great_balls}`;
  if (mission.reward_ultra_balls > 0) rewards += `  ⚫ +${mission.reward_ultra_balls}`;

  return (
    `✅ *Missão aceita!*\n` +
    `${diffEmoji[mission.difficulty] || '⚪'} *${mission.title}*\n` +
    `📝 ${mission.description}\n\n` +
    `🎁 Recompensas: ${rewards}\n\n` +
    `Acompanhe com *!missoes*`
  );
}

// ══════════════════════════════════════
//  AJUDA
// ══════════════════════════════════════
function cmdHelp() {
  return (
    `🎮 *Pokézap — Comandos*\n━━━━━━━━━━\n\n` +

    `*📋 INÍCIO*\n` +
    `!start [nome] — Criar conta\n` +
    `!escolher [1-3] — Escolher starter\n` +
    `!status — Ver perfil\n\n` +

    `*🌿 EXPLORAÇÃO*\n` +
    `!explorar — Encontrar Pokémon\n` +
    `!atacar — Atacar selvagem\n` +
    `!capturar [pokebola/great/ultra]\n` +
    `!fugir — Escapar da batalha\n\n` +

    `*🎒 TIME*\n` +
    `!mochila — Ver Pokémon\n` +
    `!ativar [nº] — Trocar ativo\n` +
    `!curar — Curar todos (50 💰)\n` +
    `!evolucoes — Ver evoluções\n` +
    `!evoluir [pedra?] — Evoluir\n\n` +

    `*🗺️ REGIÕES*\n` +
    `!regioes — Ver regiões\n` +
    `!viajar [kanto/johto/hoenn/sinnoh]\n\n` +

    `*⚔️ PvP*\n` +
    `!batalha [número] — Desafiar\n` +
    `!aceitar / !recusar — Responder\n` +
    `!pa — Atacar no PvP\n` +
    `!pf — Fugir do PvP\n` +
    `!ranking — Top 10\n\n` +

    `*📋 MISSÕES*\n` +
    `!missoes — Minhas missões\n` +
    `!md [facil/medio/dificil]\n` +
    `!am [ID] — Aceitar missão\n\n` +

    `*🏪 LOJA*\n` +
    `!loja — Ver itens\n` +
    `!comprar [item] [qtd]\n` +
    `!pedras — Pedras evolutivas\n\n` +

    `*🖼️ FIGURINHAS*\n` +
    `*/s* — Figurinha quadrada\n` +
    `*/s 2* — Aspecto original\n` +
    `_Envie ou responda uma mídia com /s_`
  );
}

module.exports = { handleCommand };