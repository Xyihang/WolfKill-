# 局域网狼人杀游戏

一个基于 Node.js + Socket.IO 的局域网狼人杀游戏，支持多人在线对战。
目前已经上云到replit平台(https://wolf-kill--xiyihang360.replit.app/)
V1.3Beta -- 增加2个新角色，优化了一些功能
## 目录
- [功能特性](#功能特性)
- [技术架构](#技术架构)
- [核心代码实现](#核心代码实现)
- [数据结构](#数据结构)
- [API 接口](#api-接口)
- [游戏流程](#游戏流程)
- [安装运行](#安装运行)
- [配置说明](#配置说明)
- [常见问题](#常见问题)

## 功能特性

### 核心功能
- ✅ 自动分配随机中文名字
- ✅ 房间人数限制 5-10 人
- ✅ 游戏开始后禁止新玩家加入
- ✅ 夜间阶段禁言
- ✅ 女巫解药机制（首夜可救）
- ✅ 玩家状态高亮显示
- ✅ 上帝视角（密码保护）
- ✅ 自动获取局域网 IP 地址
- ✅ 连接稳定性优化（心跳检测）
- ✅ 断线重连（15秒等待）
- ✅ SessionStorage 独立会话
- ✅ 防止重复发送重连请求

### 角色配置
- 🐺 **狼人（1-2人）**：每晚可以选择杀死一名玩家
- 🐺‍❄️ **白狼王（0-1人）**：狼人阵营，白天发言阶段可自爆带走一人
- 👤 **村民（0-2人）**：普通村民，没有特殊能力
- 🔮 **预言家（1人）**：每晚可以查验一名玩家的身份
- 🧙 **女巫（1人）**：拥有一瓶解药和一瓶毒药
- 🔫 **猎人（0-1人）**：死亡时可以开枪带走一名玩家
- 🛡️ **守卫（1人）**：每晚可以守护一名玩家免受狼刀，不能连续两晚守同一人
- 🤪 **白痴（0-1人）**：被投票放逐时强制翻牌免死，失去投票权与被投票权，当天直接进黑夜
- ⚔️ **骑士（0-1人）**：白天发言阶段可决斗一人，整局只能发动一次。目标是狼人则狼人出局，目标是好人则骑士出局

### 技能优先级
骑士决斗 > 白狼王自爆 > 白痴翻牌

### 角色分布（5-10人局）
| 人数 | 狼人 | 白狼王 | 预言家 | 女巫 | 猎人 | 守卫 | 白痴 | 骑士 | 村民 |
|------|------|--------|--------|------|------|------|------|------|------|
| 5人  | 1    | 0      | 1      | 1    | 0    | 1    | 1    | 0    | 0    |
| 6人  | 1    | 0      | 1      | 1    | 1    | 1    | 1    | 0    | 0    |
| 7人  | 1    | 1      | 1      | 1    | 1    | 1    | 1    | 1    | 0    |
| 8人  | 1    | 1      | 1      | 1    | 1    | 1    | 1    | 1    | 1    |
| 9人  | 2    | 1      | 1      | 1    | 1    | 1    | 1    | 1    | 1    |
| 10人 | 2    | 1      | 1      | 1    | 1    | 1    | 1    | 1    | 2    |

### 游戏流程
1. **等待阶段**：玩家加入房间，房主点击开始游戏
2. **发牌阶段**：系统自动分配角色，玩家查看自己的身份
3. **夜间阶段**：
   - 狼人（含白狼王）商讨并选择击杀目标
   - 守卫选择守护目标
   - 预言家查验一名玩家
   - 女巫决定是否使用解药/毒药
4. **天亮阶段**：公布昨晚死亡信息
5. **讨论阶段**：存活玩家自由发言讨论
   - 白狼王可选择自爆带走一人（自爆后直接进黑夜）
   - 骑士可选择决斗一人（整局一次）
6. **投票阶段**：玩家投票处决一名嫌疑人
7. **投票结果**：公布投票结果
   - 白痴被投票放逐时可翻牌免死，失去投票权
   - 猎人死亡时可开枪带走一人
8. **循环**：回到夜间阶段，直到一方获胜

### 胜利条件
- 🐺 **狼人阵营胜利**：狼人数量 ≥ 好人数量
- 👥 **好人阵营胜利**：所有狼人被淘汰（含白狼王）

## 技术架构

### 技术栈
- **后端**：Node.js + Express + Socket.IO
- **前端**：原生 HTML/CSS/JavaScript
- **通信**：WebSocket (Socket.IO)
- **存储**：SessionStorage（会话管理）

### 架构设计
```
┌─────────────────┐
│   Browser     │
│  (game.js)   │
└──────┬────────┘
       │ WebSocket
       │
┌──────▼────────┐
│  Server       │
│ (server.js)   │
│  ┌────────┐  │
│  │ Game   │  │
│  │ Class  │  │
│  └────────┘  │
└───────────────┘
```

### Socket.IO 配置
```javascript
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,        // 60秒无响应断开
  pingInterval: 25000,       // 每25秒发送心跳
  transports: ['websocket', 'polling']
});
```

## 核心代码实现

### 1. 游戏类 (Game)

#### 初始化
```javascript
class Game {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();              // 玩家列表
    this.disconnectedPlayers = new Map();     // 断线玩家
    this.phase = GAME_PHASES.WAITING;       // 当前阶段
    this.day = 0;                         // 天数
    this.nightActions = {};                // 夜间行动
    this.votes = {};                       // 投票
    this.witchPotions = { antidote: true, poison: true };
    this.lastNightDeaths = [];             // 昨晚死亡
    this.winner = null;                     // 胜者
  }
}
```

#### 玩家管理
```javascript
// 添加玩家
addPlayer(playerId, playerName) {
  if (this.phase !== GAME_PHASES.WAITING) {
    return { success: false, message: '游戏已开始，无法加入' };
  }
  if (this.players.size >= 10) {
    return { success: false, message: '房间已满' };
  }
  this.players.set(playerId, {
    id: playerId,
    name: playerName,
    role: null,
    alive: true,
    isHost: this.players.size === 0
  });
}

// 断线处理
disconnectPlayer(playerId) {
  const player = this.players.get(playerId);
  player.disconnected = true;
  player.disconnectTime = Date.now();
  this.disconnectedPlayers.set(playerId, {
    id: playerId,
    name: player.name,
    role: player.role,
    alive: player.alive
  });
}

// 重连处理
reconnectPlayer(oldPlayerId, newPlayerId) {
  const player = this.players.get(oldPlayerId);
  player.id = newPlayerId;
  player.disconnected = false;
  this.players.delete(oldPlayerId);
  this.players.set(newPlayerId, player);
  this.disconnectedPlayers.delete(oldPlayerId);
  return player;
}
```

### 2. 角色分配算法

```javascript
function getRoleConfig(playerCount) {
  const configs = {
    5:  { werewolf: 1, seer: 1, witch: 1, hunter: 0, guard: 1, villager: 1 },
    6:  { werewolf: 2, seer: 1, witch: 1, hunter: 0, guard: 1, villager: 1 },
    7:  { werewolf: 2, seer: 1, witch: 1, hunter: 1, guard: 1, villager: 1 },
    8:  { werewolf: 2, seer: 1, witch: 1, hunter: 1, guard: 1, villager: 2 },
    9:  { werewolf: 3, seer: 1, witch: 1, hunter: 1, guard: 1, villager: 2 },
    10: { werewolf: 3, seer: 1, witch: 1, hunter: 1, guard: 1, villager: 3 }
  };
  return configs[playerCount];
}

function generateRoles(playerCount) {
  const config = getRoleConfig(playerCount);
  const roles = [];
  // 根据配置生成角色数组
  for (let i = 0; i < config.werewolf; i++) roles.push(ROLES.WEREWOLF);
  // ... 其他角色
  // Fisher-Yates 洗牌算法
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}
```

### 3. 狼人投票算法

```javascript
function resolveWerewolfVote(game) {
  const votes = game.nightActions.werewolfVotes || {};
  const voteCount = {};
  
  // 统计每个目标的票数
  for (const targetId of Object.values(votes)) {
    voteCount[targetId] = (voteCount[targetId] || 0) + 1;
  }
  
  let maxVotes = 0;
  let topTargets = [];  // 收集所有最高票目标
  
  for (const [targetId, count] of Object.entries(voteCount)) {
    if (count > maxVotes) {
      maxVotes = count;
      topTargets = [targetId];       // 新的最高票，重置列表
    } else if (count === maxVotes) {
      topTargets.push(targetId);     // 平票，加入列表
    }
  }
  
  // 平票时随机选择
  if (topTargets.length === 1) {
    game.nightActions.werewolfKill = topTargets[0];
  } else if (topTargets.length > 1) {
    const randomIndex = Math.floor(Math.random() * topTargets.length);
    game.nightActions.werewolfKill = topTargets[randomIndex];
  }
}
```

### 4. 夜间处理逻辑

```javascript
processNight() {
  this.lastNightDeaths = [];
  
  const werewolfKillTarget = this.nightActions.werewolfKill;
  const guardProtectTarget = this.nightActions.guardProtect;
  const witchSave = this.nightActions.witchSave;
  
  // 判断是否守卫成功
  const isGuarded = guardProtectTarget && guardProtectTarget === werewolfKillTarget;
  const isSaved = witchSave;
  const isNaichuan = isGuarded && isSaved;
  
  if (werewolfKillTarget) {
    const killedPlayer = this.players.get(werewolfKillTarget);
    if (killedPlayer) {
      if (isNaichuan) {
        // 守卫+女巫都救了，双重保护
        killedPlayer.alive = false;
        this.lastNightDeaths.push({
          id: killedPlayer.id,
          name: killedPlayer.name,
          role: killedPlayer.role,
          cause: 'naichuan'  // 奶穿（双重保护）
        });
      } else if (!isGuarded && !isSaved) {
        // 没人救，死亡
        killedPlayer.alive = false;
        this.lastNightDeaths.push({
          id: killedPlayer.id,
          name: killedPlayer.name,
          role: killedPlayer.role,
          cause: 'werewolf'
        });
      }
    }
  }
  
  // 处理女巫毒药
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
    }
  }
}
```

### 5. 投票算法

```javascript
processVote() {
  this.phase = GAME_PHASES.VOTE_RESULT;
  
  const voteCount = {};
  // 统计票数
  for (const targetId of Object.values(this.votes)) {
    if (targetId !== 'skip') {
      voteCount[targetId] = (voteCount[targetId] || 0) + 1;
    }
  }
  
  // 找出票数最高的
  let maxVotes = 0;
  let eliminated = null;
  let tie = false;
  
  for (const [playerId, count] of Object.entries(voteCount)) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminated = playerId;
      tie = false;
    } else if (count === maxVotes) {
      tie = true;  // 平票
    }
  }
  
  if (tie || !eliminated) {
    return { eliminated: null, voteCount, tie: true };
  }
  
  // 处决玩家
  const eliminatedPlayer = this.players.get(eliminated);
  if (eliminatedPlayer) {
    eliminatedPlayer.alive = false;
    if (eliminatedPlayer.role === ROLES.HUNTER) {
      this.hunterCanShoot = true;
      this.pendingHunterShoot = eliminatedPlayer.id;
    }
  }
  
  return { eliminated, eliminatedPlayer, voteCount, tie: false };
}
```

### 6. 胜利检测

```javascript
checkWinCondition() {
  const aliveWerewolves = this.getAliveWerewolves().length;
  const aliveGood = this.getAliveGoodPlayers().length;
  
  if (aliveWerewolves === 0) {
    this.winner = 'good';
    this.phase = GAME_PHASES.GAME_OVER;
    return 'good';  // 好人胜利
  }
  
  if (aliveWerewolves >= aliveGood) {
    this.winner = 'werewolf';
    this.phase = GAME_PHASES.GAME_OVER;
    return 'werewolf';  // 狼人胜利
  }
  
  return null;  // 游戏继续
}
```

## 数据结构

### 玩家对象
```javascript
{
  id: 'socket_id',           // Socket 连接 ID
  name: '玩家名字',           // 中文名字
  role: 'werewolf',         // 角色类型
  alive: true,               // 存活状态
  isHost: false,             // 是否房主
  disconnected: false,         // 是否断线
  disconnectTime: null        // 断线时间
}
```

### 游戏状态
```javascript
{
  roomId: 'ABC123',           // 房间号
  phase: 'waiting',          // 当前阶段
  phaseName: '等待开始',     // 阶段名称
  day: 1,                   // 天数
  players: [...],             // 玩家列表
  winner: null,               // 胜者
  lastNightDeaths: [...],     // 昨晚死亡
  myRole: 'werewolf',        // 我的角色
  isAlive: true,             // 我是否存活
  isHost: false              // 我是否房主
}
```

## API 接口

### 客户端 → 服务器

| 事件 | 参数 | 说明 |
|------|------|------|
| `createRoom` | - | 创建新房间 |
| `joinRoom` | `{ roomId, playerName? }` | 加入/重连房间 |
| `startGame` | - | 开始游戏 |
| `leaveRoom` | - | 离开房间 |
| `werewolfKill` | `{ targetId }` | 狼人击杀 |
| `seerCheck` | `{ targetId }` | 预言家查验 |
| `witchSave` | - | 女巫使用解药 |
| `witchPoison` | `{ targetId }` | 女巫使用毒药 |
| `guardProtect` | `{ targetId? }` | 守卫守护 |
| `vote` | `{ targetId }` | 投票 |
| `skipVote` | - | 弃票 |
| `hunterShoot` | `{ targetId }` | 猎人开枪 |
| `hunterSkipShoot` | - | 猎人放弃开枪 |
| `godJoin` | `{ roomId, password }` | 上帝视角加入 |
| `sendChat` | `{ message }` | 发送聊天 |

### 服务器 → 客户端

| 事件 | 参数 | 说明 |
|------|------|------|
| `roomCreated` | `{ roomId, player, gameState }` | 房间创建成功 |
| `roomJoined` | `{ roomId, player, gameState }` | 加入房间成功 |
| `reconnected` | `{ roomId, player, gameState }` | 重连成功 |
| `gameStarted` | `{ gameState }` | 游戏开始 |
| `gameStateUpdate` | `{ gameState }` | 游戏状态更新 |
| `playerJoined` | `{ player, playerCount }` | 玩家加入 |
| `playerLeft` | `{ playerId, playerName, playerCount, timeout? }` | 玩家离开 |
| `playerDisconnected` | `{ playerId, playerName, reconnectTimeout }` | 玩家断线 |
| `playerReconnected` | `{ playerName, playerCount }` | 玩家重连 |
| `seerResult` | `{ targetName, isWerewolf }` | 查验结果 |
| `witchInfo` | `{ killedId, killedName, hasAntidote, hasPoison }` | 女巫信息 |
| `timerUpdate` | `{ timeLeft }` | 计时器更新 |
| `chat` | `{ playerName, message }` | 聊天消息 |
| `werewolfChat` | `{ playerName, message }` | 狼人聊天 |
| `gameOver` | `{ winner }` | 游戏结束 |
| `error` | `{ message }` | 错误信息 |

## 游戏流程

### 阶段流转图
```
waiting → night → night_werewolf_discuss → night_werewolf → night_seer → night_witch → night_guard
    ↓
day → discussion → vote → vote_result
    ↓ (检查胜利条件)
    ↓ (未结束)
night → ...
    ↓ (已结束)
game_over
```

### 断线重连流程
```
1. 玩家断线
   ↓
2. 服务器标记为 disconnected，启动 15 秒计时器
   ↓
3. 15 秒内重连
   ↓
4. 客户端发送 joinRoom { playerName: '我的名字' }
   ↓
5. 服务器通过名字匹配断线玩家
   ↓
6. 更新玩家 ID，清除 disconnected 状态
   ↓
7. 发送 reconnected 事件，恢复游戏状态
   ↓
8. 15 秒后未重连
   ↓
9. 计时器触发，移除玩家
```

### SessionStorage 管理
```javascript
// 保存会话
function saveSession() {
  if (currentRoomId) sessionStorage.setItem('lrs_roomId', currentRoomId);
  if (currentPlayerName) sessionStorage.setItem('lrs_playerName', currentPlayerName);
}

// 清除会话
function clearSession() {
  sessionStorage.removeItem('lrs_roomId');
  sessionStorage.removeItem('lrs_playerName');
  currentRoomId = null;
  currentPlayerName = null;
}

// 页面加载时恢复
let currentRoomId = sessionStorage.getItem('lrs_roomId') || null;
let currentPlayerName = sessionStorage.getItem('lrs_playerName') || null;

if (currentRoomId && currentPlayerName) {
  socket.emit('joinRoom', { roomId: currentRoomId, playerName: currentPlayerName });
}
```

## 安装运行

### 环境要求
- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装步骤
```bash
# 克隆或下载项目
cd lrs

# 安装依赖
npm install

# 启动服务器
npm start
```

### 访问游戏
服务器启动后会显示访问地址：
```
=================================
   狼人杀游戏服务器已启动
=================================
本机访问: http://localhost:3000
局域网访问: http://localIP:3000
=================================
其他设备请使用局域网地址访问
=================================
```

- **本机访问**：使用 `http://localhost:3000`
- **局域网访问**：其他设备使用显示的局域网 IP 地址

## 配置说明

### 修改端口
在 `server.js` 末尾修改：
```javascript
const PORT = process.env.PORT || 3000;  // 修改端口号
```

### 修改上帝密码
在 `server.js` 中搜索 `GOD_PASSWORD`：
```javascript
const GOD_PASSWORD = 'godview';  // 修改密码
```

### 修改重连等待时间
在 `server.js` 中修改：
```javascript
const RECONNECT_TIMEOUT = 15000;  // 毫秒，默认15秒
```

### 修改心跳配置
在 `server.js` 中修改：
```javascript
const io = new Server(server, {
  pingTimeout: 60000,      // 心跳超时（毫秒）
  pingInterval: 25000,      // 心跳间隔（毫秒）
  reconnectionDelay: 1000,   // 重连延迟
  reconnectionDelayMax: 5000  // 最大重连延迟1
});
```

## 常见问题

### Q: 为什么无法连接？
A: 检查防火墙设置，确保端口 3000 未被阻止。

### Q: 为什么重连后显示"游戏已开始，无法加入"？
A: 请确保只打开一个标签页，或清除 SessionStorage 后重试。

### Q: 如何查看服务器日志？
A: 运行 `npm start` 的终端会显示所有游戏日志。

### Q: 可以修改角色配置吗？
A: 可以修改 `game.js` 中的 `getRoleConfig()` 方法。

### Q: 如何调整游戏时间？
A: 在 `game.js` 中修改：
```javascript
this.discussionTime = 60;   // 讨论时间（秒）
this.voteTime = 30;         // 投票时间（秒）
this.werewolfDiscussTime = 15;  // 狼人讨论时间（秒）
```
### Q: 如何不局限于局域网？
A: 使用内网穿透工具穿透本地3000端口（如 openfrp）将本地服务器暴露到公网。

### Q: 如何添加更多中文名字？
A: 在 `server.js` 中修改 `CHINESE_NAMES` 数组。

### Q: 如何调试重连问题？
A: 打开浏览器控制台（F12），查看日志：
```
Page load, session from sessionStorage: { currentRoomId: '...', currentPlayerName: '...' }
检测到保存的会话，尝试自动重连...
Socket connected, sending joinRoom
reconnected event received: { roomId: '...', player: {...} }
```

## 项目结构
```
lrs/
├── server.js          # 服务器端代码（Socket.IO + Express）
├── game.js           # 游戏逻辑类（Game 类）
├── package.json       # 项目配置和依赖
├── public/
│   ├── index.html     # 主页面（大厅）
│   ├── game.js       # 客户端游戏逻辑
│   ├── god.html      # 上帝视角页面
│   └── style.css     # 样式文件
└── README.md         # 项目文档
```

## 开发者信息
- 版本：1.0.0
- 作者：Xyihang and GLM-5 / 由 Xyihang 和 GLM-5 制作
- 开发工具：Trae IDE
- 技术支持：Socket.IO 官方文档

## 许可证
MIT License
