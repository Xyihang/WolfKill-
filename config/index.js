/**
 * 局域网狼人杀游戏 - 配置模块入口
 * Made by Xyihang and GLM-5 / 由 Xyihang 和 GLM-5 制作
 */

const { GAME_CONFIG, CORS_CONFIG, ROLE_CONFIG, CHINESE_NAMES } = require('./constants');
const { getLocalIP, generateRoomId, generateRandomName, delay, clamp } = require('./utils');

module.exports = {
  GAME_CONFIG,
  CORS_CONFIG,
  ROLE_CONFIG,
  CHINESE_NAMES,
  getLocalIP,
  generateRoomId,
  generateRandomName,
  delay,
  clamp
};
