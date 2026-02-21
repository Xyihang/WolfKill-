const ROLE_NAMES = {
  'werewolf': '狼人',
  'white_wolf': '白狼王',
  'villager': '村民',
  'seer': '预言家',
  'witch': '女巫',
  'hunter': '猎人',
  'guard': '守卫',
  'idiot': '白痴',
  'knight': '骑士'
};

const ROLE_CAMP = {
  'werewolf': 'werewolf',
  'white_wolf': 'werewolf',
  'villager': 'good',
  'seer': 'good',
  'witch': 'good',
  'hunter': 'good',
  'guard': 'good',
  'idiot': 'good',
  'knight': 'good'
};

const ROLE_ICONS = {
  werewolf: '🐺',
  white_wolf: '🐺‍❄️',
  villager: '👤',
  seer: '👁️',
  witch: '🧙',
  hunter: '🎯',
  guard: '🛡️',
  idiot: '🤪',
  knight: '⚔️'
};

const SOCKET_CONFIG = {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
};

const STORAGE_KEYS = {
  ROOM_ID: 'lrs_roomId',
  PLAYER_NAME: 'lrs_playerName'
};

export { ROLE_NAMES, ROLE_CAMP, ROLE_ICONS, SOCKET_CONFIG, STORAGE_KEYS };
