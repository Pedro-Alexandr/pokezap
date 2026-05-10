# 🎮 Pokémon WhatsApp RPG Bot

Bot para WhatsApp com sistema de RPG baseado no universo Pokémon, com **4 regiões**, batalhas, captura e progressão.

---

## ✨ Funcionalidades

- 🗾 **4 Regiões**: Kanto, Johto, Hoenn e Sinnoh (desbloqueáveis por nível)
- 🎯 **Sistema de Captura**: Pokébola, Great Ball e Ultra Ball com taxa real de captura
- ⚔️ **Batalhas**: Contra Pokémon selvagens com efetividade de tipos
- 📈 **Progressão**: XP, níveis, evolução de Pokémon
- 🏪 **Loja**: Compra de itens com moedas
- 💊 **Centro Pokémon**: Cura completa do time
- 🎒 **Coleção**: Até 30 Pokémon por treinador
- 80+ Pokémon com raridades (comum, incomum, raro, épico, lendário, mítico)

---

## 📋 Pré-requisitos

- Node.js 18+
- npm
- Um número de WhatsApp dedicado (recomendado)

---

## 🚀 Instalação

```bash
# 1. Clone ou extraia o projeto
cd pokemon-whatsapp-bot

# 2. Instale as dependências
npm install

# 3. Inicie o bot
npm start
```

Na primeira execução, um **QR Code** será exibido no terminal.
Escaneie-o com o WhatsApp do número que será o bot:
`WhatsApp > Dispositivos Vinculados > Vincular Dispositivo`

---

## 🎮 Comandos

| Comando | Descrição |
|---|---|
| `!start [nome]` | Criar sua conta de treinador |
| `!escolher [1-3]` | Escolher Pokémon inicial |
| `!status` | Ver perfil e estatísticas |
| `!explorar` | Encontrar Pokémon selvagens |
| `!atacar` | Atacar Pokémon selvagem |
| `!capturar [tipo]` | Usar pokébola (pokebola/great/ultra) |
| `!fugir` | Escapar da batalha |
| `!mochila` | Ver sua coleção |
| `!ativar [nº]` | Trocar Pokémon ativo |
| `!curar` | Curar todos os Pokémon (50 moedas) |
| `!regioes` | Ver regiões disponíveis |
| `!viajar [região]` | Viajar para outra região |
| `!loja` | Ver itens da loja |
| `!comprar [item] [qtd]` | Comprar itens |
| `!ajuda` | Ver todos os comandos |

---

## 🗺️ Regiões e Requisitos

| Região | Nível Mínimo | Custo de Viagem |
|---|---|---|
| Kanto 🗾 | 1 (inicial) | Grátis |
| Johto 🏯 | 10 | 200 moedas |
| Hoenn 🏝️ | 20 | 500 moedas |
| Sinnoh 🏔️ | 30 | 800 moedas |

---

## ⭐ Raridades de Pokémon

| Raridade | Cor | Chance de Encontro |
|---|---|---|
| Comum  | ⚪ | ~50% |
| Incomum  | 🟢 | ~30% |
| Raro  | 🔵 | ~15% |
| Épico  | 🟣 | ~4% |
| Lendário  | 🟡 | ~0.8% |
| Mítico  | 🔴 | ~0.2% |

---

## ☁️ Deploy no Railway (Gratuito)

1. Crie conta em [railway.app](https://railway.app)
2. Novo projeto → Deploy from GitHub
3. Suba o código no GitHub e conecte ao Railway
4. Na aba **Variables**, não é necessário configurar nada por padrão
5. **Importante**: Após o deploy, as credenciais do WhatsApp ficam em `auth_info/`. 
   Use **Railway Volumes** ou persista essa pasta para não precisar re-escanear o QR.

---

## 🏗️ Estrutura do Projeto

```
pokemon-whatsapp-bot/
├── src/
│   ├── index.js          # Entry point
│   ├── bot.js            # Conexão Baileys
│   ├── commands/
│   │   └── index.js      # Todos os comandos
│   ├── game/
│   │   ├── pokemon.js    # Dados dos 80+ Pokémon
│   │   ├── battle.js     # Sistema de batalha
│   │   ├── encounters.js # Encontros selvagens
│   │   └── regions.js    # Dados das regiões
│   ├── database/
│   │   └── db.js         # SQLite (treinadores, coleção)
│   └── utils/
│       └── format.js     # Formatação de mensagens
├── data/                 # Banco SQLite (gerado em runtime)
├── auth_info/            # Credenciais WhatsApp (gerado em runtime)
└── package.json
```

---

## 💡 Dicas de Expansão

- **Batalhas PvP**: Já tem estrutura no `db.js` para batalhas entre jogadores
- **Evolução de Pokémon**: Adicionar tabela de evoluções e gatilho por nível
- **Missões/Histórias**: Adicionar tabela de missões por região
- **Ranking**: Tabela de placar geral por vitórias
- **Clima**: Alterar encontros por horário do dia (dia/noite)

---

## ⚠️ Avisos

- Use um número **dedicado** para o bot (não o seu número pessoal)
- O Baileys é uma biblioteca não oficial; respeite os Termos de Serviço do WhatsApp
- Para uso em grupos, o bot responde a qualquer membro

---

## 📄 Licença

MIT — use, modifique e distribua livremente.
