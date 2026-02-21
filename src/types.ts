export type Role = 
  | 'werewolf' 
  | 'white_wolf' 
  | 'villager' 
  | 'seer' 
  | 'witch' 
  | 'hunter' 
  | 'guard' 
  | 'idiot' 
  | 'knight';

export type GamePhase = 
  | 'waiting' 
  | 'night' 
  | 'night_werewolf_discuss' 
  | 'night_werewolf' 
  | 'night_guard' 
  | 'night_seer' 
  | 'night_witch' 
  | 'day' 
  | 'discussion' 
  | 'vote' 
  | 'vote_result' 
  | 'hunter_shoot' 
  | 'game_over';

export type Camp = 'werewolf' | 'good';

export interface Player {
  id: string;
  name: string;
  role: Role | null;
  alive: boolean;
  isHost: boolean;
  disconnected?: boolean;
  idiotRevealed?: boolean;
  knightDuelUsed?: boolean;
}

export interface DisconnectedPlayerInfo {
  oldPlayerId: string;
  player: Player;
  disconnectedAt: number;
}

export interface NightActions {
  werewolfVotes?: Record<string, string>;
  werewolfKill?: string;
  guardProtect?: string;
  seerChecked?: boolean;
  witchSave?: boolean;
  witchPoison?: string;
  witchActed?: boolean;
  guardActed?: boolean;
}

export interface WitchPotions {
  antidote: boolean;
  poison: boolean;
}

export interface DeathInfo {
  id: string;
  name: string;
  role: Role | null;
  cause: 'werewolf' | 'poison' | 'naichuan';
}

export interface VoteResult {
  voteCount: Record<string, number>;
  eliminatedPlayer?: Player;
  tie?: boolean;
  idiotRevealed?: boolean;
  idiotPlayer?: { id: string; name: string };
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  day: number;
  players: Player[];
  nightActions: NightActions;
  witchPotions: WitchPotions;
  lastNightDeaths: DeathInfo[];
  winner: Camp | null;
  votes: Record<string, string>;
  voteResult: VoteResult | null;
  myRole?: Role;
  myRoleName?: string;
  myRoleDescription?: string;
  isAlive?: boolean;
  isHost?: boolean;
  werewolfTeammates?: Player[];
  seerResults?: Array<{ targetName: string; isWerewolf: boolean }>;
  witchInfo?: {
    killedName: string | null;
    hasAntidote: boolean;
    hasPoison: boolean;
  };
  guardInfo?: {
    lastGuardedPlayer: string | null;
  };
  idiotRevealed?: boolean;
  canShoot?: boolean;
  canExplode?: boolean;
  canDuel?: boolean;
  finalPlayers?: Player[];
  phaseName?: string;
  werewolfDiscussTime?: number;
}

export interface GameConfig {
  MIN_PLAYERS: number;
  MAX_PLAYERS: number;
  ROOM_ID_LENGTH: number;
  DISCUSSION_TIME: number;
  VOTE_TIME: number;
  WEREWOLF_DISCUSS_TIME: number;
  HUNTER_SHOOT_TIME: number;
  RECONNECT_TIMEOUT: number;
  DAY_ANNOUNCEMENT_DELAY: number;
  PHASE_TRANSITION_DELAY: number;
  GAME_START_DELAY: number;
  SOCKET_PING_TIMEOUT: number;
  SOCKET_PING_INTERVAL: number;
  NAME_GENERATION_MAX_ATTEMPTS: number;
  RANDOM_NAME_SUFFIX_MIN: number;
  RANDOM_NAME_SUFFIX_MAX: number;
  TOAST_DURATION: number;
}

export interface RoleCountConfig {
  werewolf: number;
  whiteWolf: number;
  seer: number;
  witch: number;
  hunter: number;
  guard: number;
  idiot: number;
  knight: number;
  villager: number;
}

export interface RoleConfig {
  [playerCount: number]: RoleCountConfig;
}

export interface ChineseNames {
  [key: string]: string;
}

export interface CORSConfig {
  ORIGIN: string;
  METHODS: string[];
}
