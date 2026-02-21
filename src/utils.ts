import * as os from 'os';
import { GAME_CONFIG } from './constants';

export function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (nets) {
      for (const iface of nets) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
}

export function generateRoomId(existingRooms: Map<string, unknown>): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomId: string;
  let attempts = 0;
  
  do {
    roomId = '';
    for (let i = 0; i < GAME_CONFIG.ROOM_ID_LENGTH; i++) {
      roomId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    attempts++;
    if (attempts > GAME_CONFIG.NAME_GENERATION_MAX_ATTEMPTS) {
      throw new Error('无法生成唯一的房间ID');
    }
  } while (existingRooms.has(roomId));
  
  return roomId;
}

export function generateRandomName(usedNames: Set<string>): string {
  const adjectives = ['聪明的', '勇敢的', '机智的', '神秘的', '冷静的', '热情的', '温柔的', '坚强的'];
  const nouns = ['狼人', '村民', '预言家', '女巫', '猎人', '守卫', '骑士', '白痴'];
  
  let name: string;
  let attempts = 0;
  
  do {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const suffix = Math.floor(
      Math.random() * (GAME_CONFIG.RANDOM_NAME_SUFFIX_MAX - GAME_CONFIG.RANDOM_NAME_SUFFIX_MIN) + 
      GAME_CONFIG.RANDOM_NAME_SUFFIX_MIN
    );
    name = `${adj}${noun}${suffix}`;
    attempts++;
    if (attempts > GAME_CONFIG.NAME_GENERATION_MAX_ATTEMPTS) {
      throw new Error('无法生成唯一的玩家名称');
    }
  } while (usedNames.has(name));
  
  return name;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
