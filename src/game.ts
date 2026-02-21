import { 
  Player, 
  DisconnectedPlayerInfo, 
  NightActions, 
  WitchPotions, 
  VoteResult, 
  GameState, 
  Role, 
  GamePhase, 
  Camp,
  RoleCountConfig,
  DeathInfo
} from './types';
import { GAME_CONFIG, ROLE_CONFIG, ROLES, GAME_PHASES, CHINESE_NAMES } from './constants';

const ROLE_NAMES: Record<Role, string> = {
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

const ROLE_DESCRIPTIONS: Record<Role, string> = {
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

const PHASE_NAMES: Record<GamePhase, string> = {
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
  [GAME_PHASES.GAME_OVER]: '游戏结束'
};

interface SeerResult {
  seerId: string;
  targetId: string;
  isWerewolf: boolean;
}

interface TimerMap {
  [key: string]: NodeJS.Timeout | undefined;
}

function getRoleConfig(playerCount: number): RoleCountConfig {
  const config = ROLE_CONFIG[playerCount];
  if (!config) {
    return {
      werewolf: 2,
      whiteWolf: 0,
      seer: 1,
      witch: 1,
      hunter: 1,
      guard: 1,
      idiot: 0,
      knight: 0,
      villager: 2
    };
  }
  return {
    werewolf: config.werewolf || 0,
    whiteWolf: config.whiteWolf || 0,
    seer: config.seer || 0,
    witch: config.witch || 0,
    hunter: config.hunter || 0,
    guard: config.guard || 0,
    idiot: config.idiot || 0,
    knight: config.knight || 0,
    villager: config.villager || 0
  };
}

function generateRoles(playerCount: number): Role[] {
  const config = getRoleConfig(playerCount);
  const roles: Role[] = [];
  
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
  roomId: string;
  players: Map<string, Player>;
  disconnectedPlayers: Map<string, DisconnectedPlayerInfo>;
  phase: GamePhase;
  day: number;
  nightActions: NightActions;
  votes: Record<string, string>;
  witchPotions: WitchPotions;
  lastNightDeaths: DeathInfo[];
  winner: Camp | null;
  currentSpeakerIndex: number;
  speakerOrder: string[];
  discussionTime: number;
  voteTime: number;
  werewolfDiscussTime: number;
  seerResults: SeerResult[];
  hunterCanShoot: boolean;
  pendingHunterShoot: string | null;
  lastGuardedPlayer: string | null;
  idiotRevealed: Map<string, boolean>;
  knightDuelUsed: boolean;
  whiteWolfExploded: boolean;
  actionInProgress: boolean;
  timers: TimerMap;
  voteResult: VoteResult | null;

  constructor(roomId: string) {
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
    this.discussionTime = GAME_CONFIG.DISCUSSION_TIME;
    this.voteTime = GAME_CONFIG.VOTE_TIME;
    this.werewolfDiscussTime = GAME_CONFIG.WEREWOLF_DISCUSS_TIME;
    this.seerResults = [];
    this.hunterCanShoot = false;
    this.pendingHunterShoot = null;
    this.lastGuardedPlayer = null;
    this.idiotRevealed = new Map();
    this.knightDuelUsed = false;
    this.whiteWolfExploded = false;
    this.actionInProgress = false;
    this.timers = {};
    this.voteResult = null;
  }

  disconnectPlayer(playerId: string): Player | null {
    const player = this.players.get(playerId);
    if (!player) return null;
    
    player.disconnected = true;
    this.disconnectedPlayers.set(playerId, {
      oldPlayerId: playerId,
      player: { ...player },
      disconnectedAt: Date.now()
    });
    
    return player;
  }

  reconnectPlayer(oldPlayerId: string, newPlayerId: string): Player | null {
    const disconnectedInfo = this.disconnectedPlayers.get(oldPlayerId);
    if (!disconnectedInfo) return null;
    
    const player = this.players.get(oldPlayerId);
    if (!player) return null;
    
    player.id = newPlayerId;
    player.disconnected = false;
    
    this.players.delete(oldPlayerId);
    this.players.set(newPlayerId, player);
    this.disconnectedPlayers.delete(oldPlayerId);
    
    return player;
  }

  removeDisconnectedPlayer(playerId: string): DisconnectedPlayerInfo | null {
    const disconnectedInfo = this.disconnectedPlayers.get(playerId);
    if (!disconnectedInfo) return null;
    
    this.disconnectedPlayers.delete(playerId);
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      if (player.isHost && this.players.size > 0) {
        const newHost = this.players.values().next().value;
        if (newHost) newHost.isHost = true;
      }
    }
    
    return disconnectedInfo;
  }

  getDisconnectedPlayerByName(playerName: string): { oldPlayerId: string; player: DisconnectedPlayerInfo['player'] } | null {
    for (const [id, info] of this.disconnectedPlayers) {
      if (info.player.name === playerName) {
        return { oldPlayerId: id, player: info.player };
      }
    }
    return null;
  }

  addPlayer(playerId: string, playerName: string): { success: boolean; message?: string; player?: Player } {
    if (this.phase !== GAME_PHASES.WAITING) {
      return { success: false, message: '游戏已开始，无法加入' };
    }
    
    if (this.players.size >= GAME_CONFIG.MAX_PLAYERS) {
      return { success: false, message: '房间已满' };
    }
    
    for (const player of this.players.values()) {
      if (player.name === playerName) {
        return { success: false, message: '该昵称已被使用' };
      }
    }
    
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      role: null,
      alive: true,
      isHost: this.players.size === 0
    };
    
    this.players.set(playerId, newPlayer);
    
    return { success: true, player: newPlayer };
  }

  removePlayer(playerId: string): Player | null {
    const player = this.players.get(playerId);
    if (!player) return null;
    
    this.players.delete(playerId);
    
    if (player.isHost && this.players.size > 0) {
      const newHost = this.players.values().next().value;
      if (newHost) newHost.isHost = true;
    }
    
    return player;
  }

  canStart(): boolean {
    return this.players.size >= GAME_CONFIG.MIN_PLAYERS && this.players.size <= GAME_CONFIG.MAX_PLAYERS;
  }

  start(): { success: boolean; message?: string } {
    if (!this.canStart()) {
      return { success: false, message: `需要${GAME_CONFIG.MIN_PLAYERS}-${GAME_CONFIG.MAX_PLAYERS}名玩家，当前${this.players.size}人` };
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

  getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  getAlivePlayers(): Player[] {
    return this.getPlayers().filter(p => p.alive);
  }

  getAliveWerewolves(): Player[] {
    return this.getAlivePlayers().filter(p => p.role === ROLES.WEREWOLF || p.role === ROLES.WHITE_WOLF);
  }

  getAliveGoodPlayers(): Player[] {
    return this.getAlivePlayers().filter(p => p.role !== ROLES.WEREWOLF && p.role !== ROLES.WHITE_WOLF);
  }

  checkWinCondition(): Camp | null {
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

  startNight(): GamePhase {
    this.phase = GAME_PHASES.NIGHT_WEREWOLF_DISCUSS;
    this.nightActions = {
      werewolfKill: undefined,
      werewolfVotes: {},
      seerChecked: false,
      witchActed: false,
      guardActed: false
    };
    this.lastNightDeaths = [];
    return this.phase;
  }

  seerCheck(playerId: string, targetId: string): { success: boolean; message?: string; isWerewolf?: boolean } {
    const player = this.players.get(playerId);
    const target = this.players.get(targetId);
    
    if (!player || !target) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.SEER) return { success: false, message: '你不是预言家' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    if (!target.alive) return { success: false, message: '目标已死亡' };
    
    const isWerewolf = target.role === ROLES.WEREWOLF || target.role === ROLES.WHITE_WOLF;
    this.seerResults.push({ seerId: playerId, targetId, isWerewolf });
    this.nightActions.seerChecked = true;
    
    return { success: true, isWerewolf };
  }

  witchSave(playerId: string): { success: boolean; message?: string } {
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

  witchPoison(playerId: string, targetId: string): { success: boolean; message?: string } {
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

  guardProtect(playerId: string, targetId: string | null): { success: boolean; message?: string } {
    const player = this.players.get(playerId);
    
    if (!player) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.GUARD) return { success: false, message: '你不是守卫' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    
    if (targetId) {
      const target = this.players.get(targetId);
      if (!target) return { success: false, message: '目标不存在' };
      if (!target.alive) return { success: false, message: '目标已死亡' };
      if (targetId === this.lastGuardedPlayer) {
        return { success: false, message: '不能连续两晚守护同一人' };
      }
      this.nightActions.guardProtect = targetId;
    }
    
    this.nightActions.guardActed = true;
    return { success: true };
  }

  getGuardInfo(): { lastGuardedPlayer: string | null; lastGuardedPlayerName: string | null } {
    return {
      lastGuardedPlayer: this.lastGuardedPlayer,
      lastGuardedPlayerName: this.lastGuardedPlayer ? this.players.get(this.lastGuardedPlayer)?.name || null : null
    };
  }

  getWitchInfo(): { killedName: string | null; hasAntidote: boolean; hasPoison: boolean } {
    const killedId = this.nightActions.werewolfKill;
    const killedPlayer = killedId ? this.players.get(killedId) : null;
    return {
      killedName: killedPlayer ? killedPlayer.name : null,
      hasAntidote: this.witchPotions.antidote,
      hasPoison: this.witchPotions.poison
    };
  }

  processNight(): DeathInfo[] {
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
    
    this.lastGuardedPlayer = guardProtectTarget || null;
    
    return this.lastNightDeaths;
  }

  vote(playerId: string, targetId: string): { success: boolean; message?: string } {
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

  skipVote(playerId: string): { success: boolean; message?: string } {
    const player = this.players.get(playerId);
    if (!player) return { success: false, message: '玩家不存在' };
    if (!player.alive) return { success: false, message: '你已死亡，无法投票' };
    if (this.idiotRevealed.get(playerId)) return { success: false, message: '你已翻牌，无法投票' };
    
    this.votes[playerId] = 'skip';
    return { success: true };
  }

  processVote(): VoteResult {
    this.phase = GAME_PHASES.VOTE_RESULT;
    
    const voteCount: Record<string, number> = {};
    for (const targetId of Object.values(this.votes)) {
      if (targetId !== 'skip') {
        voteCount[targetId] = (voteCount[targetId] || 0) + 1;
      }
    }
    
    let maxVotes = 0;
    let eliminated: string | null = null;
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
      return { voteCount, tie: true };
    }
    
    const eliminatedPlayer = this.players.get(eliminated);
    if (eliminatedPlayer) {
      if (eliminatedPlayer.role === ROLES.IDIOT && !this.idiotRevealed.get(eliminated)) {
        this.idiotRevealed.set(eliminated, true);
        return { 
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
      
      return { eliminatedPlayer, voteCount, tie: false };
    }
    
    return { voteCount, tie: true };
  }

  hunterShoot(playerId: string, targetId: string): { success: boolean; message?: string; target?: { id: string; name: string; role: Role | null } } {
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

  hunterSkipShoot(playerId: string): { success: boolean; message?: string } {
    const player = this.players.get(playerId);
    if (!player || player.role !== ROLES.HUNTER) {
      return { success: false, message: '无效操作' };
    }
    
    this.hunterCanShoot = false;
    this.pendingHunterShoot = null;
    
    return { success: true };
  }

  whiteWolfExplode(playerId: string, targetId: string): { success: boolean; message?: string; whiteWolf?: { id: string; name: string }; target?: { id: string; name: string; role: Role | null } } {
    const player = this.players.get(playerId);
    const target = this.players.get(targetId);
    
    if (!player || !target) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.WHITE_WOLF) return { success: false, message: '你不是白狼王' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    if (!target.alive) return { success: false, message: '目标已死亡' };
    if (targetId === playerId) return { success: false, message: '不能带自己' };
    if (this.whiteWolfExploded) return { success: false, message: '已经自爆过了' };
    
    player.alive = false;
    target.alive = false;
    this.whiteWolfExploded = true;
    
    return { 
      success: true, 
      whiteWolf: { id: player.id, name: player.name },
      target: { id: target.id, name: target.name, role: target.role }
    };
  }

  knightDuel(playerId: string, targetId: string): { success: boolean; message?: string; duelSuccess?: boolean; knight?: { id: string; name: string }; target?: { id: string; name: string; role: Role | null } } {
    const player = this.players.get(playerId);
    const target = this.players.get(targetId);
    
    if (!player || !target) return { success: false, message: '玩家不存在' };
    if (player.role !== ROLES.KNIGHT) return { success: false, message: '你不是骑士' };
    if (!player.alive) return { success: false, message: '你已死亡' };
    if (!target.alive) return { success: false, message: '目标已死亡' };
    if (targetId === playerId) return { success: false, message: '不能决斗自己' };
    if (this.knightDuelUsed) return { success: false, message: '决斗技能已使用' };
    
    this.knightDuelUsed = true;
    
    const targetIsWerewolf = target.role === ROLES.WEREWOLF || target.role === ROLES.WHITE_WOLF;
    
    if (targetIsWerewolf) {
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

  getGameState(playerId: string): GameState {
    const player = this.players.get(playerId);
    const players = this.getPlayers();
    
    const state: GameState = {
      roomId: this.roomId,
      phase: this.phase,
      phaseName: PHASE_NAMES[this.phase],
      day: this.day,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        alive: p.alive,
        isHost: p.isHost,
        disconnected: p.disconnected || false,
        idiotRevealed: this.idiotRevealed.get(p.id) || false
      })),
      nightActions: this.nightActions,
      witchPotions: this.witchPotions,
      lastNightDeaths: this.lastNightDeaths,
      winner: this.winner,
      votes: this.votes,
      voteResult: this.voteResult
    };
    
    if (player && player.role) {
      state.myRole = player.role;
      state.myRoleName = ROLE_NAMES[player.role];
      state.myRoleDescription = ROLE_DESCRIPTIONS[player.role];
      state.isAlive = player.alive;
      state.isHost = player.isHost;
      state.idiotRevealed = this.idiotRevealed.get(playerId) || false;
      
      if (player.role === ROLES.WEREWOLF || player.role === ROLES.WHITE_WOLF) {
        state.werewolfTeammates = players
          .filter(p => (p.role === ROLES.WEREWOLF || p.role === ROLES.WHITE_WOLF) && p.id !== playerId)
          .map(p => ({ id: p.id, name: p.name, role: p.role, alive: p.alive, isHost: p.isHost }));
      }
      
      if (player.role === ROLES.WITCH) {
        state.witchPotions = { ...this.witchPotions };
      }
      
      if (player.role === ROLES.SEER) {
        state.seerResults = this.seerResults.map(r => ({
          targetName: this.players.get(r.targetId)?.name || '',
          isWerewolf: r.isWerewolf
        }));
      }
      
      if (player.role === ROLES.GUARD) {
        state.guardInfo = this.getGuardInfo();
      }
      
      if (player.role === ROLES.KNIGHT) {
        state.canDuel = !this.knightDuelUsed && player.alive && this.phase === GAME_PHASES.DISCUSSION;
      }
      
      if (player.role === ROLES.WHITE_WOLF) {
        state.canExplode = !this.whiteWolfExploded && player.alive && this.phase === GAME_PHASES.DISCUSSION;
      }
      
      if (this.phase === GAME_PHASES.NIGHT_WITCH && player.role === ROLES.WITCH) {
        state.witchInfo = this.getWitchInfo();
      }
      
      if (this.phase === GAME_PHASES.HUNTER_SHOOT && this.pendingHunterShoot === playerId) {
        state.canShoot = this.hunterCanShoot;
      }
      
      state.werewolfDiscussTime = this.werewolfDiscussTime;
    }
    
    return state;
  }

  reset(): { success: boolean } {
    this.phase = GAME_PHASES.WAITING;
    this.day = 0;
    this.nightActions = {};
    this.votes = {};
    this.voteResult = null;
    this.witchPotions = { antidote: true, poison: true };
    this.lastNightDeaths = [];
    this.winner = null;
    this.seerResults = [];
    this.hunterCanShoot = false;
    this.pendingHunterShoot = null;
    this.lastGuardedPlayer = null;
    this.idiotRevealed = new Map();
    this.knightDuelUsed = false;
    this.whiteWolfExploded = false;
    this.actionInProgress = false;
    
    this.players.forEach(player => {
      player.role = null;
      player.alive = true;
      player.disconnected = false;
    });
    
    Object.values(this.timers).forEach(timer => {
      if (timer) clearInterval(timer);
    });
    this.timers = {};
    
    return { success: true };
  }

  clearTimers(): void {
    Object.values(this.timers).forEach(timer => {
      if (timer) clearInterval(timer);
    });
    this.timers = {};
  }
}

export { Game, GAME_PHASES, ROLES };
