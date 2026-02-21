/**
 * 局域网狼人杀游戏 - 常量配置
 * Made by Xyihang and GLM-5 / 由 Xyihang 和 GLM-5 制作
 */

const GAME_CONFIG = {
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

const CORS_CONFIG = {
  ORIGIN: process.env.CORS_ORIGIN || '*',
  METHODS: ['GET', 'POST']
};

const ROLE_CONFIG = {
  5: { werewolf: 1, whiteWolf: 0, seer: 1, witch: 1, hunter: 0, guard: 1, idiot: 1, knight: 0, villager: 0 },
  6: { werewolf: 1, whiteWolf: 0, seer: 1, witch: 1, hunter: 1, guard: 1, idiot: 1, knight: 0, villager: 0 },
  7: { werewolf: 1, whiteWolf: 1, seer: 1, witch: 1, hunter: 1, guard: 1, idiot: 1, knight: 0, villager: 0 },
  8: { werewolf: 1, whiteWolf: 1, seer: 1, witch: 1, hunter: 1, guard: 1, idiot: 1, knight: 1, villager: 0 },
  9: { werewolf: 2, whiteWolf: 1, seer: 1, witch: 1, hunter: 1, guard: 1, idiot: 1, knight: 0, villager: 1 },
  10: { werewolf: 2, whiteWolf: 1, seer: 1, witch: 1, hunter: 1, guard: 1, idiot: 1, knight: 1, villager: 1 }
};

const CHINESE_NAMES = [
  '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
  '郑十一', '冯十二', '陈十三', '褚十四', '卫十五', '蒋十六', '沈十七', '韩十八',
  '杨十九', '朱二十', '秦二十一', '尤二十二', '许二十三', '何二十四', '吕二十五', '施二十六',
  '张二十七', '孔二十八', '曹二十九', '严三十', '华三十一', '金三十二', '魏三十四', '陶三十五',
  '姜三十六', '戚三十七', '谢三十八', '邹三十九', '喻四十', '柏四十一', '水四十二', '窦四十三',
  '章四十四', '云四十五', '苏四十六', '潘四十七', '葛四十八', '奚四十九', '范五十', '彭五十一',
  '郎五十二', '鲁五十三', '韦五十四', '昌五十五', '马五十六', '苗五十七', '凤五十八', '花五十九',
  '俞六十', '任六十一', '袁六十二', '柳六十三', '邓六十四', '邱六十五', '侯六十六', '骆六十七',
  '夏六十八', '林六十九', '徐七十', '余七十一', '杜七十二', '席七十三', '包七十四', '余七十五',
  '易七十六', '郭七十七', '梅七十八', '盛七十九', '习八十', '卜八十一', '顾八十二', '孟八十三',
  '黄八十四', '穆八十五', '萧八十六', '尹八十七', '姚八十八', '汪八十九', '芦九十', '房九十一',
  '小白', '小黑', '阿大', '阿二', '阿三', '阿四', '阿五', '阿六',
  '阿七', '阿八', '阿九', '阿十', '阿花', '阿草', '阿木', '阿水',
  '阿火', '阿土', '阿金', '铜锤', '铁锤', '锤子', '锅盖', '锅铲',
  '瓢泼', '大雨', '小雨', '大风', '小风', '闪电', '雷鸣', '白云',
  '乌云', '蓝天', '星星', '月亮', '太阳', '高山', '流水', '大树',
  '小草', '鲜花', '果实', '老虎', '狮子', '熊猫', '猴子', '兔子',
  '狐狸', '狼', '豹子', '老鹰', '小鱼', '大鱼', '小虾', '大虾',
  '海龟', '海豚'
];

module.exports = {
  GAME_CONFIG,
  CORS_CONFIG,
  ROLE_CONFIG,
  CHINESE_NAMES
};
