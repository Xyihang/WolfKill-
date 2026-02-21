/**
 * 局域网狼人杀游戏 - 游戏逻辑类
 * Made by Xyihang and GLM-5 / 由 Xyihang 和 GLM-5 制作
 */
const ROLES = {
  WEREWOLF: 'werewolf',
  WHITE_WOLF: 'white_wolf',
  VILLAGER: 'villager',
  SEER: 'seer',
  WITCH: 'witch',
  HUNTER: 'hunter',
  GUARD: 'guard',
  IDIOT: 'idiot',
  KNIGHT: 'knight'
};

const ROLE_NAMES = {
  [ROLES.WEREWOLF]: '狼人',
  [ROLES.WHITE_WOLF]: '白狼王',
  [ROLES.VILLAGER]: '村民',
  [ROLES.SEER]: '预言家',
  [ROLES.WITCH]: '女巫',
  [ROLES.HUNTER]: '猎人',
  [ROLES.GUARD]: '守卫',
  [ROLES.IDIOT]: '白痴',
  [ROLES.KNIGHT]: '骑士'
};

const ROLE_DESCRIPTIONS = {
  [ROLES.WEREWOLF]: '每晚可以选择杀死一名玩家',
  [ROLES.WHITE_WOLF]: '白天发言阶段可自爆并带走一名玩家',
  [ROLES.VILLAGER]: '普通村民，没有特殊能力',
  [ROLES.SEER]: '每晚可以查验一名玩家的身份',
  [ROLES.WITCH]: '拥有一瓶解药和一瓶毒药',
  [ROLES.HUNTER]: '死亡时可以开枪带走一名玩家',
  [ROLES.GUARD]: '每晚可以守护一名玩家免受狼刀，不能连续两晚守同一人',
  [ROLES.IDIOT]: '被投票放逐时可翻牌免死，但失去投票权',
  [ROLES.KNIGHT]: '白天发言阶段可决斗一名玩家，整局只能发动一次'
};

const GAME_PHASES = {
  WAITING: 'waiting',
  NIGHT: 'night',
  NIGHT_WEREWOLF_DISCUSS: 'night_werewolf_discuss',
  NIGHT_WEREWOLF: 'night_werewolf',
  NIGHT_SEER: 'night_seer',
  NIGHT_WITCH: 'night_witch',
  NIGHT_GUARD: 'night_guard',
  DAY: 'day',
  DISCUSSION: 'discussion',
  VOTE: 'vote',
  VOTE_RESULT: 'vote_result',
  HUNTER_SHOOT: 'hunter_shoot',
  WHITE_WOLF_EXPLODE: 'white_wolf_explode',
  KNIGHT_DUEL: 'knight_duel',
  GAME_OVER: 'game_over'
};

const PHASE_NAMES = {
  [GAME_PHASES.WAITING]: '等待开始',
  [GAME_PHASES.NIGHT]: '天黑请闭眼',
  [GAME_PHASES.NIGHT_WEREWOLF_DISCUSS]: '狼人讨论',
  [GAME_PHASES.NIGHT_WEREWOLF]: '狼人请睁眼',
  [GAME_PHASES.NIGHT_SEER]: '预言家请睁眼',
  [GAME_PHASES.NIGHT_WITCH]: '女巫请睁眼',
  [GAME_PHASES.NIGHT_GUARD]: '守卫请睁眼',
  [GAME_PHASES.DAY]: '天亮了',
  [GAME_PHASES.DISCUSSION]: '发言阶段',
  [GAME_PHASES.VOTE]: '投票阶段',
  [GAME_PHASES.VOTE_RESULT]: '投票结果',
  [GAME_PHASES.HUNTER_SHOOT]: '猎人开枪',
  [GAME_PHASES.WHITE_WOLF_EXPLODE]: '白狼王自爆',
  [GAME_PHASES.KNIGHT_DUEL]: '骑士决斗',
  [GAME_PHASES.GAME_OVER]: '游戏结束'
};

function getRoleConfig(playerCount) {
  const configs = {
    5: { werewolf: 1, whiteWolf: 0, seer: 1, witch: 1, hunter: 0, guard: 1, idiot: 1, knight: 0, villager: 0 },
    6: { werewolf: 1, whiteWolf: 0, seer: 1, witch: 1, hunter: 1, guard: 1, idiot: 1, knight: 0, villager: 0 },
    7: { werewolf: 1, whiteWolf: 1, seer: 1, witch: 1, hunter: 1, guard: 1, idiot: 1, knight: 0, villager: 0 },
    8: { werewolf: 1, whiteWolf: 1, seer: 1, witch: 1, hunter: 1, guard: 1, idiot: 1, knight: 1, villager: 0 },
    9: { werewolf: 2, whiteWolf: 1, seer: 1, witch: 1, hunter: 1, guard: 1, idiot: 1, knight: 0, villager: 1 },
    10: { werewolf: 2, whiteWolf: 1, seer: 1, witch: 1, hunter: 1, guard: 1, idiot: 1, knight: 1, villager: 1 }
  };
  return configs[playerCount] || configs[5];
}

function generateRoles(playerCount) {
  const config = getRoleConfig(playerCount);
  const roles = [];
  
  for (let i = 0; i < config.werewolf; i++) roles.push(ROLES.WEREWOLF);
  for (let i = 0; i < config.whiteWolf; i++) roles.push(ROLES.WHITE_WOLF);
  for (let i = 0; i < config.seer; i++) roles.push(ROLES.SEER);
  for (let i = 0; i < config.witch; i++) roles.push(ROLES.WITCH);
  for (let i = 0; i < config.hunter; i++) roles.push(ROLES.HUNTER);
  for (let i = 0; i < config.guard; i++) roles.push(ROLES.GUARD);
  for (let i = 0; i < config.idiot; i++) roles.push(ROLES.IDIOT);
  for (let i = 0; i < config.knight; i++) roles.push(ROLES.KNIGHT);
  for (let i = 0; i < config.villager; i++) roles.push(ROLES.VILLAGER);
  
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  return roles;
}

class Game {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.disconnectedPlayers = new Map();
    this.phase = GAME_PHASES.WAITING;
    this.day = 0;
    this.nightActions = {};
    this.votes = {};
    this.witchPotions = { antidote: true, poison: true };
    this.lastNightDeaths = [];
    this.winner = null;
    this.currentSpeakerIndex = 0;
    this.speakerOrder = [];
    this.discussionTime = 60;
    this.voteTime = 30;
    this.werewolfDiscussTime = 15;
    this.seerResults = [];
    this.hunterCanShoot = false;
    this.pendingHunterShoot = null;
    this.lastGuardedPlayer = null;
    this.idiotRevealed = new Map();
    this.knightDuelUsed = false;
    this.whiteWolfExploded = false;
    this.actionInProgress = false;
  }

  disconnectPlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;
    
    player.disconnected = true;
    player.disconnectTime = Date.now();
    this.disconnectedPlayers.set(playerId, {
      id: playerId,
      name: player.name,
      role: player.role,
      alive: player.alive,
      isHost: player.isHost,
      disconnectTime: Date.now()
    });
    
    return player;
  }

  reconnectPlayer(oldPlayerId, newPlayerId) {
    const disconnectedPlayer = this.disconnectedPlayers.get(oldPlayerId);
    if (!disconnectedPlayer) return null;
    
    const player = this.players.get(oldPlayerId);
    if (!player) return null;
    
    player.id = newPlayerId;
    player.disconnected = false;
    player.disconnectTime = null;
    
    this.players.delete(oldPlayerId);
    this.players.set(newPlayerId, player);
    this.disconnectedPlayers.delete(oldPlayerId);
    
    return player;
  }

  removeDisconnectedPlayer(playerId) {
    const disconnectedPlayer = this.disconnectedPlayers.get(playerId);
    if (!disconnectedPlayer) return null;
    
    this.disconnectedPlayers.delete(playerId);
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      if (player.isHost && this.players.size > 0) {
        const newHost = this.players.values().next().value;
        newHost.isHost = true;
      }
    }
    
    return disconnectedPlayer;
  }

  getDisconnectedPlayerByName(playerName) {
    for (const [id, player] of this.disconnectedPlayers) {
      if (player.name === playerName) {
        return { oldPlayerId: id, player };
      }
    }
    return null;
  }

  addPlayer(playerId, playerName) {
    if (this.phase !== GAME_PHASES.WAITING) {
      return { success: false, message: '游戏已开始，无法加入' };
    }
    
    if (this.players.size >= 10) {
      return { success: false, message: '房间已满' };
    }
    
    for (const player of this.players.values()) {
      if (player.name === playerName) {
        return { success: false, message: '该昵称已被使用' };
      }
    }
    
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      role: null,
      alive: true,
      isHost: this.players.size === 0
    });
    
    return { success: true, player: this.players.get(playerId) };
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;
    
    this.players.delete(playerId);
    
    if (player.isHost && this.players.size > 0) {
      const newHost = this.players.values().next().value;
      newHost.isHost = true;
    }
    
    return player;
  }

  canStart() {
    return this.players.size >= 5 && this.players.size <= 10;
  }

  start() {
    if (!this.canStart()) {
      return { success: false, message: `需要5-10名玩家，当前${this.players.size}人` };
    }
    
    const roles = generateRoles(this.players.size);
    const playerArray = Array.from(this.players.values());
    
    playerArray.forEach((player, index) => {
      player.role = roles[index];
      player.alive = true;
    });
    
    this.phase = GAME_PHASES.NIGHT;
    this.day = 1;
    this.nightActions = {};
    this.votes = {};
    this.voteResult = null;
    this.witchPotions = { antidote: true, poison: true };
    this.lastNightDeaths = [];
    this.winner = null;
    this.seerResults = [];
    
    return { success: true };
  }

  getPlayers() {
    return Array.from(this.players.values());
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getAlivePlayers() {
    return Array.from(this.players.values()).filter(p => p.alive);
  }

  getAliveWerewolves() {
    return this.getAlivePlayers().filter(p => p.role === ROLES.WEREWOLF || p.role === ROLES.WHITE_WOLF);
  }

  getAliveVillagers() {
    return this.getAlivePlayers().filter(p => p.role !== ROLES.WEREWOLF && p.role !== ROLES.WHITE_WOLF);
  }

  getAliveGoodPlayers() {
    return this.getAlivePlayers().filter(p => p.role !== ROLES.WEREWOLF && p.role !== ROLES.WHITE_WOLF);
  }

  checkWinCondition() {
    const aliveWerewolves = this.getAliveWerewolves().length;
    const aliveGood = this.getAliveGoodPlayers().length;
    
    if (aliveWerewolves === 0) {
      this.winner = 'good';
      this.phase = GAME_PHASES.GAME_OVER;
      return 'good';
    }
    
    if (aliveWerewolves >= aliveGood) {
      this.winner = 'werewolf';
      this.phase = GAME_PHASES.GAME_OVER;
      return 'werewolf';
    }
    
    return null;
  }

  startNight() {
    this.phase = GAME_PHASES.NIGHT_WEREWOLF_DISCUSS;
    this.nightActions = {
      werewolfKill: null,
      werewolfVotes: {},
      seerCheck: null,
      seerChecked: false,
      witchSave: false,
      witchPoison: null,
      witchActed: false,
      guardProtect: null,
      guardActed: false
    };
    this.lastNightDeaths = [];
    return this.phase;
  }
  
  startWerewolfKill() {
    this.phase = GAME_PHASES.NIGHT_WEREWOLF;
    return this.phase;
  }

  werewolfKill(playerId, targetId) {
    const player = this.players.get(playerId);
    const target = this.players.get(targetId);
    
    if (!player || !target) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.WEREWOLF && player.role !== ROLES.WHITE_WOLF) return { success: false, message: '你不是狼人' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    if (!target.alive) return { success: false, message: '目标已死亡' };
    
    this.nightActions.werewolfKill = targetId;
    return { success: true };
  }

  seerCheck(playerId, targetId) {
    const player = this.players.get(playerId);
    const target = this.players.get(targetId);
    
    if (!player || !target) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.SEER) return { success: false, message: '你不是预言家' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    if (!target.alive) return { success: false, message: '目标已死亡' };
    
    this.nightActions.seerCheck = targetId;
    const isWerewolf = target.role === ROLES.WEREWOLF || target.role === ROLES.WHITE_WOLF;
    this.seerResults.push({ seerId: playerId, targetId, isWerewolf });
    
    return { success: true, isWerewolf };
  }

  witchSave(playerId) {
    const player = this.players.get(playerId);
    
    if (!player) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.WITCH) return { success: false, message: '你不是女巫' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    if (!this.witchPotions.antidote) return { success: false, message: '解药已使用' };
    if (!this.nightActions.werewolfKill) return { success: false, message: '今晚无人被杀' };
    
    this.nightActions.witchSave = true;
    this.witchPotions.antidote = false;
    return { success: true };
  }

  witchPoison(playerId, targetId) {
    const player = this.players.get(playerId);
    const target = this.players.get(targetId);
    
    if (!player || !target) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.WITCH) return { success: false, message: '你不是女巫' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    if (!this.witchPotions.poison) return { success: false, message: '毒药已使用' };
    if (!target.alive) return { success: false, message: '目标已死亡' };
    if (targetId === playerId) return { success: false, message: '不能毒自己' };
    
    this.nightActions.witchPoison = targetId;
    this.witchPotions.poison = false;
    return { success: true };
  }

  guardProtect(playerId, targetId) {
    const player = this.players.get(playerId);
    const target = targetId ? this.players.get(targetId) : null;
    
    if (!player) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.GUARD) return { success: false, message: '你不是守卫' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    
    if (targetId && target) {
      if (!target.alive) return { success: false, message: '目标已死亡' };
      if (targetId === this.lastGuardedPlayer) {
        return { success: false, message: '不能连续两晚守护同一人' };
      }
      this.nightActions.guardProtect = targetId;
      this.nightActions.guardActed = true;
    } else {
      this.nightActions.guardProtect = null;
      this.nightActions.guardActed = true;
    }
    
    return { success: true };
  }

  getGuardInfo() {
    return {
      lastGuardedPlayer: this.lastGuardedPlayer,
      lastGuardedPlayerName: this.lastGuardedPlayer ? this.players.get(this.lastGuardedPlayer)?.name : null
    };
  }

  getWitchInfo(forAntidote = false) {
    const killedId = this.nightActions.werewolfKill;
    const killedPlayer = killedId ? this.players.get(killedId) : null;
    return {
      killedId: forAntidote ? killedId : null,
      killedName: forAntidote && killedPlayer ? killedPlayer.name : null,
      hasAntidote: this.witchPotions.antidote,
      hasPoison: this.witchPotions.poison
    };
  }

  processNight() {
    this.lastNightDeaths = [];
    
    const werewolfKillTarget = this.nightActions.werewolfKill;
    const guardProtectTarget = this.nightActions.guardProtect;
    const witchSave = this.nightActions.witchSave;
    const witchPoisonTarget = this.nightActions.witchPoison;
    
    const isGuarded = guardProtectTarget && guardProtectTarget === werewolfKillTarget;
    const isSaved = witchSave;
    const isNaichuan = isGuarded && isSaved;
    
    if (werewolfKillTarget) {
      const killedPlayer = this.players.get(werewolfKillTarget);
      if (killedPlayer) {
        if (isNaichuan) {
          killedPlayer.alive = false;
          this.lastNightDeaths.push({
            id: killedPlayer.id,
            name: killedPlayer.name,
            role: killedPlayer.role,
            cause: 'naichuan'
          });
          
          if (killedPlayer.role === ROLES.HUNTER) {
            this.hunterCanShoot = true;
            this.pendingHunterShoot = killedPlayer.id;
          }
        } else if (!isGuarded && !isSaved) {
          killedPlayer.alive = false;
          this.lastNightDeaths.push({
            id: killedPlayer.id,
            name: killedPlayer.name,
            role: killedPlayer.role,
            cause: 'werewolf'
          });
          
          if (killedPlayer.role === ROLES.HUNTER) {
            this.hunterCanShoot = true;
            this.pendingHunterShoot = killedPlayer.id;
          }
        }
      }
    }
    
    if (witchPoisonTarget) {
      const poisonedPlayer = this.players.get(witchPoisonTarget);
      if (poisonedPlayer && poisonedPlayer.alive) {
        poisonedPlayer.alive = false;
        this.lastNightDeaths.push({
          id: poisonedPlayer.id,
          name: poisonedPlayer.name,
          role: poisonedPlayer.role,
          cause: 'poison'
        });
        
        if (poisonedPlayer.role === ROLES.HUNTER) {
          this.hunterCanShoot = true;
          this.pendingHunterShoot = poisonedPlayer.id;
        }
      }
    }
    
    if (guardProtectTarget) {
      this.lastGuardedPlayer = guardProtectTarget;
    } else {
      this.lastGuardedPlayer = null;
    }
    
    return this.lastNightDeaths;
  }

  startDiscussion() {
    this.phase = GAME_PHASES.DISCUSSION;
    this.speakerOrder = this.getAlivePlayers().map(p => p.id);
    this.currentSpeakerIndex = 0;
    return this.phase;
  }

  nextSpeaker() {
    this.currentSpeakerIndex++;
    if (this.currentSpeakerIndex >= this.speakerOrder.length) {
      return null;
    }
    return this.speakerOrder[this.currentSpeakerIndex];
  }

  getCurrentSpeaker() {
    if (this.currentSpeakerIndex >= this.speakerOrder.length) return null;
    return this.players.get(this.speakerOrder[this.currentSpeakerIndex]);
  }

  startVote() {
    this.phase = GAME_PHASES.VOTE;
    this.votes = {};
    return this.phase;
  }

  vote(playerId, targetId) {
    const player = this.players.get(playerId);
    const target = this.players.get(targetId);
    
    if (!player || !target) return { success: false, message: '玩家不存在' };
    if (!player.alive) return { success: false, message: '你已死亡，无法投票' };
    if (this.idiotRevealed.get(playerId)) return { success: false, message: '你已翻牌，无法投票' };
    if (!target.alive) return { success: false, message: '目标已死亡' };
    if (this.idiotRevealed.get(targetId)) return { success: false, message: '目标已翻牌，不能被投票' };
    
    this.votes[playerId] = targetId;
    return { success: true };
  }

  skipVote(playerId) {
    const player = this.players.get(playerId);
    if (!player) return { success: false, message: '玩家不存在' };
    if (!player.alive) return { success: false, message: '你已死亡，无法投票' };
    if (this.idiotRevealed.get(playerId)) return { success: false, message: '你已翻牌，无法投票' };
    
    this.votes[playerId] = 'skip';
    return { success: true };
  }

  processVote() {
    this.phase = GAME_PHASES.VOTE_RESULT;
    
    const voteCount = {};
    for (const targetId of Object.values(this.votes)) {
      if (targetId !== 'skip') {
        voteCount[targetId] = (voteCount[targetId] || 0) + 1;
      }
    }
    
    let maxVotes = 0;
    let eliminated = null;
    let tie = false;
    
    for (const [playerId, count] of Object.entries(voteCount)) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminated = playerId;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    }
    
    if (tie || !eliminated) {
      return { eliminated: null, voteCount, tie: true };
    }
    
    const eliminatedPlayer = this.players.get(eliminated);
    if (eliminatedPlayer) {
      if (eliminatedPlayer.role === ROLES.IDIOT && !this.idiotRevealed.get(eliminated)) {
        this.idiotRevealed.set(eliminated, true);
        return { 
          eliminated: null, 
          voteCount, 
          tie: false, 
          idiotRevealed: true,
          idiotPlayer: { id: eliminatedPlayer.id, name: eliminatedPlayer.name }
        };
      }
      
      eliminatedPlayer.alive = false;
      
      if (eliminatedPlayer.role === ROLES.HUNTER) {
        this.hunterCanShoot = true;
        this.pendingHunterShoot = eliminatedPlayer.id;
      }
    }
    
    return { eliminated, eliminatedPlayer, voteCount, tie: false };
  }

  hunterShoot(playerId, targetId) {
    const player = this.players.get(playerId);
    const target = this.players.get(targetId);
    
    if (!player || !target) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.HUNTER) return { success: false, message: '你不是猎人' };
    if (!target.alive) return { success: false, message: '目标已死亡' };
    if (targetId === playerId) return { success: false, message: '不能射自己' };
    
    target.alive = false;
    this.hunterCanShoot = false;
    this.pendingHunterShoot = null;
    
    return { 
      success: true, 
      target: { id: target.id, name: target.name, role: target.role }
    };
  }

  hunterSkipShoot(playerId) {
    const player = this.players.get(playerId);
    if (!player || player.role !== ROLES.HUNTER) {
      return { success: false, message: '无效操作' };
    }
    
    this.hunterCanShoot = false;
    this.pendingHunterShoot = null;
    return { success: true };
  }

  whiteWolfExplode(playerId, targetId) {
    const player = this.players.get(playerId);
    const target = this.players.get(targetId);
    
    if (!player || !target) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.WHITE_WOLF) return { success: false, message: '你不是白狼王' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    if (!target.alive) return { success: false, message: '目标已死亡' };
    if (targetId === playerId) return { success: false, message: '不能带自己' };
    if (this.phase !== GAME_PHASES.DISCUSSION) return { success: false, message: '只能在发言阶段自爆' };
    if (this.actionInProgress) return { success: false, message: '有其他操作正在进行' };
    
    this.actionInProgress = true;
    player.alive = false;
    target.alive = false;
    this.whiteWolfExploded = true;
    
    return { 
      success: true, 
      whiteWolf: { id: player.id, name: player.name },
      target: { id: target.id, name: target.name, role: target.role }
    };
  }

  knightDuel(playerId, targetId) {
    const player = this.players.get(playerId);
    const target = this.players.get(targetId);
    
    if (!player || !target) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.KNIGHT) return { success: false, message: '你不是骑士' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    if (!target.alive) return { success: false, message: '目标已死亡' };
    if (targetId === playerId) return { success: false, message: '不能决斗自己' };
    if (this.knightDuelUsed) return { success: false, message: '决斗技能已使用' };
    if (this.phase !== GAME_PHASES.DISCUSSION) return { success: false, message: '只能在发言阶段决斗' };
    if (this.actionInProgress) return { success: false, message: '有其他操作正在进行' };
    
    this.actionInProgress = true;
    this.knightDuelUsed = true;
    
    const isWerewolf = target.role === ROLES.WEREWOLF || target.role === ROLES.WHITE_WOLF;
    
    if (isWerewolf) {
      target.alive = false;
      return { 
        success: true, 
        duelSuccess: true,
        knight: { id: player.id, name: player.name },
        target: { id: target.id, name: target.name, role: target.role }
      };
    } else {
      player.alive = false;
      return { 
        success: true, 
        duelSuccess: false,
        knight: { id: player.id, name: player.name },
        target: { id: target.id, name: target.name, role: target.role }
      };
    }
  }

  nextPhase() {
    const winResult = this.checkWinCondition();
    if (winResult) {
      return { phase: GAME_PHASES.GAME_OVER, winner: winResult };
    }
    
    switch (this.phase) {
      case GAME_PHASES.NIGHT:
        return { phase: this.startNight() };
      
      case GAME_PHASES.NIGHT_WEREWOLF_DISCUSS:
        return { phase: this.startWerewolfKill() };
      
      case GAME_PHASES.NIGHT_WEREWOLF:
        this.phase = GAME_PHASES.NIGHT_GUARD;
        return { phase: this.phase, guardInfo: this.getGuardInfo() };
      
      case GAME_PHASES.NIGHT_GUARD:
        this.phase = GAME_PHASES.NIGHT_SEER;
        return { phase: this.phase };
      
      case GAME_PHASES.NIGHT_SEER:
        this.phase = GAME_PHASES.NIGHT_WITCH;
        return { phase: this.phase, witchInfo: this.getWitchInfo(this.witchPotions.antidote) };
      
      case GAME_PHASES.NIGHT_WITCH:
        const deaths = this.processNight();
        this.phase = GAME_PHASES.DAY;
        this.day++;
        return { phase: this.phase, deaths };
      
      case GAME_PHASES.DAY:
        return { phase: this.startDiscussion() };
      
      case GAME_PHASES.DISCUSSION:
        return { phase: this.startVote() };
      
      case GAME_PHASES.VOTE:
        const voteResult = this.processVote();
        if (this.hunterCanShoot) {
          this.phase = GAME_PHASES.HUNTER_SHOOT;
          return { phase: this.phase, voteResult, hunterShoot: true };
        }
        return { phase: this.phase, voteResult };
      
      case GAME_PHASES.VOTE_RESULT:
      case GAME_PHASES.HUNTER_SHOOT:
        const win = this.checkWinCondition();
        if (win) {
          return { phase: GAME_PHASES.GAME_OVER, winner: win };
        }
        return { phase: this.startNight() };
      
      default:
        return { phase: this.phase };
    }
  }

  getGameState(forPlayerId = null) {
    const player = forPlayerId ? this.players.get(forPlayerId) : null;
    
    const state = {
      roomId: this.roomId,
      phase: this.phase,
      phaseName: PHASE_NAMES[this.phase],
      day: this.day,
      players: this.getPlayers().map(p => ({
        id: p.id,
        name: p.name,
        alive: p.alive,
        isHost: p.isHost,
        role: null,
        disconnected: p.disconnected || false,
        idiotRevealed: this.idiotRevealed.get(p.id) || false
      })),
      winner: this.winner,
      lastNightDeaths: this.lastNightDeaths,
      discussionTime: this.discussionTime,
      voteTime: this.voteTime,
      werewolfDiscussTime: this.werewolfDiscussTime,
      canStart: this.canStart(),
      knightDuelUsed: this.knightDuelUsed
    };
    
    if (player) {
      state.myRole = player.role;
      state.myRoleName = ROLE_NAMES[player.role];
      state.myRoleDescription = ROLE_DESCRIPTIONS[player.role];
      state.isAlive = player.alive;
      state.isHost = player.isHost;
      
      if (player.role === ROLES.WEREWOLF || player.role === ROLES.WHITE_WOLF) {
        state.werewolfTeammates = this.getPlayers()
          .filter(p => (p.role === ROLES.WEREWOLF || p.role === ROLES.WHITE_WOLF) && p.id !== player.id)
          .map(p => ({ id: p.id, name: p.name, role: p.role }));
      }
      
      if (player.role === ROLES.SEER && this.seerResults.length > 0) {
        state.seerResults = this.seerResults
          .filter(r => r.seerId === player.id)
          .map(r => ({
            targetId: r.targetId,
            targetName: this.players.get(r.targetId)?.name,
            isWerewolf: r.isWerewolf
          }));
      }
      
      if (player.role === ROLES.WITCH) {
        state.witchPotions = this.witchPotions;
      }
      
      if (player.role === ROLES.GUARD) {
        state.guardInfo = this.getGuardInfo();
      }
      
      if (player.role === ROLES.IDIOT) {
        state.idiotRevealed = this.idiotRevealed.get(player.id) || false;
      }
      
      if (player.role === ROLES.KNIGHT) {
        state.knightDuelUsed = this.knightDuelUsed;
      }
      
      if (player.role === ROLES.WHITE_WOLF) {
        state.canExplode = player.alive && this.phase === GAME_PHASES.DISCUSSION;
      }
      
      if (this.phase === GAME_PHASES.NIGHT_WITCH && player.role === ROLES.WITCH) {
        state.witchInfo = this.getWitchInfo(this.witchPotions.antidote);
      }
      
      if (this.phase === GAME_PHASES.NIGHT_GUARD && player.role === ROLES.GUARD) {
        state.guardInfo = this.getGuardInfo();
      }
      
      if (this.phase === GAME_PHASES.HUNTER_SHOOT && player.role === ROLES.HUNTER && this.hunterCanShoot) {
        state.canShoot = true;
      }
      
      if (this.phase === GAME_PHASES.DISCUSSION && player.role === ROLES.KNIGHT && !this.knightDuelUsed && player.alive) {
        state.canDuel = true;
      }
      
      if (this.phase === GAME_PHASES.DISCUSSION && player.role === ROLES.WHITE_WOLF && player.alive) {
        state.canExplode = true;
      }
    }
    
    if (this.phase === GAME_PHASES.DISCUSSION) {
      state.currentSpeaker = this.getCurrentSpeaker();
      state.speakerOrder = this.speakerOrder.map(id => ({
        id,
        name: this.players.get(id)?.name
      }));
    }
    
    if (this.phase === GAME_PHASES.VOTE || this.phase === GAME_PHASES.VOTE_RESULT) {
      state.votes = this.votes;
      state.alivePlayers = this.getAlivePlayers().map(p => ({
        id: p.id,
        name: p.name
      }));
    }
    
    if (this.phase === GAME_PHASES.VOTE_RESULT && this.voteResult) {
      state.voteResult = this.voteResult;
    }
    
    if (this.phase === GAME_PHASES.GAME_OVER) {
      state.players = this.getPlayers().map(p => ({
        id: p.id,
        name: p.name,
        alive: p.alive,
        isHost: p.isHost,
        role: p.role,
        roleName: ROLE_NAMES[p.role]
      }));
    }
    
    return state;
  }

  reset() {
    this.phase = GAME_PHASES.WAITING;
    this.day = 0;
    this.nightActions = {};
    this.votes = {};
    this.voteResult = null;
    this.witchPotions = { antidote: true, poison: true };
    this.lastNightDeaths = [];
    this.winner = null;
    this.currentSpeakerIndex = 0;
    this.speakerOrder = [];
    this.seerResults = [];
    this.hunterCanShoot = false;
    this.pendingHunterShoot = null;
    this.hunterShootContext = null;
    this.lastGuardedPlayer = null;
    this.idiotRevealed = new Map();
    this.knightDuelUsed = false;
    this.whiteWolfExploded = false;
    this.actionInProgress = false;
    
    for (const player of this.players.values()) {
      player.role = null;
      player.alive = true;
    }
  }
}

module.exports = {
  Game,
  ROLES,
  ROLE_NAMES,
  ROLE_DESCRIPTIONS,
  GAME_PHASES,
  PHASE_NAMES,
  getRoleConfig,
  generateRoles
};
