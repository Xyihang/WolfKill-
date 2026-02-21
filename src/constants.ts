import { GameConfig, RoleConfig, ChineseNames, CORSConfig } from './types';

export const GAME_CONFIG: GameConfig = {
  MIN_PLAYERS: 5,
  MAX_PLAYERS: 10,
  ROOM_ID_LENGTH: 6,
  DISCUSSION_TIME: 60,
  VOTE_TIME: 30,
  WEREWOLF_DISCUSS_TIME: 15,
  HUNTER_SHOOT_TIME: 15,
  RECONNECT_TIMEOUT: 15000,
  DAY_ANNOUNCEMENT_DELAY: 3000,
  PHASE_TRANSITION_DELAY: 1000,
  GAME_START_DELAY: 2000,
  SOCKET_PING_TIMEOUT: 60000,
  SOCKET_PING_INTERVAL: 25000,
  NAME_GENERATION_MAX_ATTEMPTS: 50,
  RANDOM_NAME_SUFFIX_MIN: 1000,
  RANDOM_NAME_SUFFIX_MAX: 9000,
  TOAST_DURATION: 3000
};

export const CORS_CONFIG: CORSConfig = {
  ORIGIN: '*',
  METHODS: ['GET', 'POST']
};

export const ROLE_CONFIG: RoleConfig = {
  5: {
    werewolf: 1,
    whiteWolf: 0,
    seer: 1,
    witch: 1,
    hunter: 0,
    guard: 0,
    idiot: 0,
    knight: 0,
    villager: 2
  },
  6: {
    werewolf: 2,
    whiteWolf: 0,
    seer: 1,
    witch: 1,
    hunter: 0,
    guard: 0,
    idiot: 0,
    knight: 0,
    villager: 2
  },
  7: {
    werewolf: 2,
    whiteWolf: 0,
    seer: 1,
    witch: 1,
    hunter: 1,
    guard: 0,
    idiot: 0,
    knight: 0,
    villager: 2
  },
  8: {
    werewolf: 2,
    whiteWolf: 0,
    seer: 1,
    witch: 1,
    hunter: 1,
    guard: 1,
    idiot: 0,
    knight: 0,
    villager: 2
  },
  9: {
    werewolf: 2,
    whiteWolf: 0,
    seer: 1,
    witch: 1,
    hunter: 1,
    guard: 1,
    idiot: 1,
    knight: 0,
    villager: 2
  },
  10: {
    werewolf: 2,
    whiteWolf: 0,
    seer: 1,
    witch: 1,
    hunter: 1,
    guard: 1,
    idiot: 1,
    knight: 1,
    villager: 2
  }
};

export const CHINESE_NAMES: ChineseNames = {
  werewolf: '狼人',
  white_wolf: '白狼王',
  villager: '村民',
  seer: '预言家',
  witch: '女巫',
  hunter: '猎人',
  guard: '守卫',
  idiot: '白痴',
  knight: '骑士'
};

export const ROLES = {
  WEREWOLF: 'werewolf',
  WHITE_WOLF: 'white_wolf',
  VILLAGER: 'villager',
  SEER: 'seer',
  WITCH: 'witch',
  HUNTER: 'hunter',
  GUARD: 'guard',
  IDIOT: 'idiot',
  KNIGHT: 'knight'
} as const;

export const GAME_PHASES = {
  WAITING: 'waiting',
  NIGHT: 'night',
  NIGHT_WEREWOLF_DISCUSS: 'night_werewolf_discuss',
  NIGHT_WEREWOLF: 'night_werewolf',
  NIGHT_GUARD: 'night_guard',
  NIGHT_SEER: 'night_seer',
  NIGHT_WITCH: 'night_witch',
  DAY: 'day',
  DISCUSSION: 'discussion',
  VOTE: 'vote',
  VOTE_RESULT: 'vote_result',
  HUNTER_SHOOT: 'hunter_shoot',
  GAME_OVER: 'game_over'
} as const;
