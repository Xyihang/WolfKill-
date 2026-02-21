/**
 * 局域网狼人杀游戏 - 工具函数
 * Made by Xyihang and GLM-5 / 由 Xyihang 和 GLM-5 制作
 */

const os = require('os');
const { GAME_CONFIG, CHINESE_NAMES } = require('./constants');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function generateRoomId(existingRooms) {
  let roomId;
  do {
    roomId = Math.random().toString(36).substring(2, 2 + GAME_CONFIG.ROOM_ID_LENGTH).toUpperCase();
  } while (existingRooms && existingRooms.has(roomId));
  return roomId;
}

function generateRandomName(usedNames) {
  for (let i = 0; i < GAME_CONFIG.NAME_GENERATION_MAX_ATTEMPTS; i++) {
    const randomIndex = Math.floor(Math.random() * CHINESE_NAMES.length);
    const name = CHINESE_NAMES[randomIndex];
    if (!usedNames || !usedNames.has(name)) {
      return name;
    }
  }
  
  const suffix = Math.floor(Math.random() * GAME_CONFIG.RANDOM_NAME_SUFFIX_MAX) + GAME_CONFIG.RANDOM_NAME_SUFFIX_MIN;
  return `玩家${suffix}`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

module.exports = {
  getLocalIP,
  generateRoomId,
  generateRandomName,
  delay,
  clamp
};
