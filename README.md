# 局域网狼人杀游戏

一个基于 Node.js + Socket.IO + TypeScript 的局域网狼人杀游戏，支持多人在线对战。

目前已经上云到 replit 平台 (https://wolf-kill--xiyihang360.replit.app)

**当前版本**：V2.0 - TypeScript 重构版

## 目录

- [功能特性](#功能特性)
- [技术架构](#技术架构)
- [项目结构](#项目结构)
- [核心代码实现](#核心代码实现)
- [数据类型定义](#数据类型定义)
- [API 接口](#api-接口)
- [游戏流程](#游戏流程)
- [安装运行](#安装运行)
- [测试](#测试)
- [配置说明](#配置说明)
- [常见问题](#常见问题)
- [更新日志](#更新日志)

## 功能特性

### 核心功能

- ✅ 自动分配随机中文名字（带形容词）
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
- ✅ 完整的单元测试覆盖
- ✅ TypeScript 类型安全

### 角色配置

| 角色 | 阵营 | 数量 | 说明 |
|------|------|------|------|
| 🐺 狼人 | 狼人 | 1-2 | 每晚可以选择杀死一名玩家 |
| 🐺‍❄️ 白狼王 | 狼人 | 0-1 | 白天发言阶段可自爆带走一人 |
| 👤 村民 | 好人 | 0-2 | 普通村民，没有特殊能力 |
| 🔮 预言家 | 好人 | 1 | 每晚可以查验一名玩家的身份 |
| 🧙 女巫 | 好人 | 1 | 拥有一瓶解药和一瓶毒药 |
| 🔫 猎人 | 好人 | 0-1 | 死亡时可以开枪带走一名玩家 |
| 🛡️ 守卫 | 好人 | 1 | 每晚可以守护一名玩家免受狼刀，不能连续两晚守同一人 |
| 🤪 白痴 | 好人 | 0-1 | 被投票放逐时可翻牌免死，失去投票权与被投票权 |
| ⚔️ 骑士 | 好人 | 0-1 | 白天发言阶段可决斗一人，整局只能发动一次 |

### 技能优先级

骑士决斗 > 白狼王自爆 > 白痴翻牌

### 角色分布（5-10人局）

| 人数 | 狼人 | 白狼王 | 预言家 | 女巫 | 猎人 | 守卫 | 白痴 | 骑士 | 村民 |
|------|------|--------|--------|------|------|------|------|------|------|
| 5人  | 1    | 0      | 1      | 1    | 0    | 0    | 0    | 0    | 2    |
| 6人  | 2    | 0      | 1      | 1    | 0    | 0    | 0    | 0    | 2    |
| 7人  | 2    | 0      | 1      | 1    | 1    | 0    | 0    | 0    | 2    |
| 8人  | 2    | 0      | 1      | 1    | 1    | 1    | 0    | 0    | 2    |
| 9人  | 2    | 0      | 1      | 1    | 1    | 1    | 1    | 0    | 2    |
| 10人 | 2    | 0      | 1      | 1    | 1    | 1    | 1    | 1    | 2    |

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
   - 白狼王可选择自爆带走一人
   - 骑士可选择决斗一人
6. **投票阶段**：玩家投票处决一名嫌疑人
7. **投票结果**：公布投票结果
   - 白痴被投票放逐时可翻牌免死
   - 猎人死亡时可开枪带走一人
8. **循环**：回到夜间阶段，直到一方获胜

### 胜利条件

- 🐺 **狼人阵营胜利**：狼人数量 ≥ 好人数量
- 👥 **好人阵营胜利**：所有狼人被淘汰（含白狼王）

## 技术架构

### 技术栈

- **后端**：Node.js + Express + Socket.IO + TypeScript
- **前端**：原生 HTML/CSS/JavaScript (ES6 Modules)
- **通信**：WebSocket (Socket.IO)
- **测试**：Jest + ts-jest
- **存储**：内存存储（可扩展为数据库）

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  config.js  │  │  state.js   │  │      main.js       │ │
│  │  (配置)     │  │  (状态)     │  │   (主入口)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          │ Socket.IO                        │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    Server                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   server.ts                         │   │
│  │              (Socket.IO 事件处理)                   │   │
│  └─────────────────────────┬───────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼───────────────────────────┐   │
│  │                     game.ts                        │   │
│  │                   (游戏逻辑)                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │  │  types.ts   │  │constants.ts │  │  utils.ts │  │   │
│  │  │  (类型定义)  │  │  (常量配置)  │  │ (工具函数) │  │   │
│  │  └─────────────┘  └─────────────┘  └───────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Socket.IO 配置

```typescript
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,      // 60秒无响应断开
  pingInterval: 25000,     // 每25秒发送心跳
  transports: ['websocket', 'polling']
});
```

## 项目结构

```
werewolf-game/
├── src/                          # TypeScript 源码
│   ├── types.ts                  # 类型定义 (Role, GameState, Player 等)
│   ├── constants.ts               # 游戏常量 (配置、角色、游戏阶段)
│   ├── utils.ts                   # 工具函数 (生成房间ID、随机名字等)
│   ├── game.ts                   # 游戏逻辑类 (Game Class)
│   └── server.ts                  # 服务器入口 (Socket.IO 处理)
├── tests/                        # 单元测试
│   ├── game.test.ts              # 游戏逻辑测试
│   └── utils.test.ts             # 工具函数测试
├── public/                       # 前端静态资源
│   ├── index.html                # 游戏主页面
│   ├── god.html                  # 上帝视角页面
│   ├── style.css                 # 样式文件
│   └── js/                       # 前端模块化 JavaScript
│       ├── config.js             # 前端配置
│       ├── state.js              # 状态管理
│       ├── socket.js             # Socket 连接
│       ├── ui.js                 # UI 渲染
│       ├── players.js            # 玩家列表管理
│       ├── actions.js             # 游戏操作
│       └── main.js                # 主入口
├── dist/                         # 编译输出 (由 tsc 生成)
├── jest.config.js               # Jest 测试配置
├── tsconfig.json                 # TypeScript 配置
├── package.json                  # 项目配置和依赖
└── README.md                     # 项目文档
```

## 核心代码实现

### 1. 类型定义 (types.ts)

```typescript
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

export interface GameState {
  roomId: string;
  phase: GamePhase;
  day: number;
  players: Player[];
  nightActions: NightActions;
  // ... 更多字段
}
```

### 2. 游戏类 (game.ts)

```typescript
export class Game {
  roomId: string;
  players: Map<string, Player>;
  phase: GamePhase;
  day: number;
  nightActions: NightActions;
  votes: Record<string, string>;
  witchPotions: WitchPotions;
  lastNightDeaths: DeathInfo[];
  winner: Camp | null;
  
  constructor(roomId: string) {
    this.roomId = roomId;
    this.players = new Map();
    this.phase = GAME_PHASES.WAITING;
    this.day = 0;
    this.nightActions = {};
    this.votes = {};
    this.witchPotions = { antidote: true, poison: true };
    this.lastNightDeaths = [];
    this.winner = null;
  }
  
  addPlayer(playerId: string, playerName: string): AddPlayerResult { /* ... */ }
  removePlayer(playerId: string): void { /* ... */ }
  start(): StartResult { /* ... */ }
  vote(voterId: string, targetId: string): VoteResult { /* ... */ }
  checkWinCondition(): Camp | null { /* ... */ }
  // ... 更多方法
}
```

### 3. 角色分配算法

```typescript
function generateRoles(playerCount: number): Role[] {
  const config = getRoleConfig(playerCount);
  const roles: Role[] = [];
  
  for (let i = 0; i < config.werewolf; i++) roles.push(ROLES.WEREWOLF);
  for (let i = 0; i < config.whiteWolf; i++) roles.push(ROLES.WHITE_WOLF);
  for (let i = 0; i < config.seer; i++) roles.push(ROLES.SEER);
  // ... 其他角色
  
  // Fisher-Yates 洗牌
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  return roles;
}
```

### 4. 夜间处理逻辑

```typescript
processNight(): void {
  this.lastNightDeaths = [];
  
  const werewolfKillTarget = this.nightActions.werewolfKill;
  const guardProtectTarget = this.nightActions.guardProtect;
  const witchSave = this.nightActions.witchSave;
  
  const isGuarded = guardProtectTarget === werewolfKillTarget;
  const isNaichuan = isGuarded && witchSave;
  
  if (werewolfKillTarget && !isNaichuan) {
    const killedPlayer = this.players.get(werewolfKillTarget);
    if (killedPlayer) {
      killedPlayer.alive = false;
      this.lastNightDeaths.push({
        id: killedPlayer.id,
        name: killedPlayer.name,
        role: killedPlayer.role,
        cause: isGuarded ? 'werewolf' : 'werewolf'
      });
    }
  }
  
  // 处理女巫毒药
  if (this.nightActions.witchPoison) {
    const poisonedPlayer = this.players.get(this.nightActions.witchPoison);
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

## 数据类型定义

### 玩家对象 (Player)

```typescript
interface Player {
  id: string;           // Socket 连接 ID
  name: string;        // 玩家名字
  role: Role | null;   // 角色类型
  alive: boolean;      // 存活状态
  isHost: boolean;     // 是否房主
  disconnected?: boolean;      // 是否断线
  idiotRevealed?: boolean;     // 是否已翻牌
  knightDuelUsed?: boolean;    // 骑士是否已发动技能
}
```

### 游戏状态 (GameState)

```typescript
interface GameState {
  roomId: string;           // 房间号
  phase: GamePhase;         // 当前阶段
  day: number;              // 天数
  players: Player[];        // 玩家列表
  nightActions: NightActions;   // 夜间行动
  witchPotions: WitchPotions;   // 女巫药水
  lastNightDeaths: DeathInfo[]; // 昨晚死亡
  winner: Camp | null;      // 胜者阵营
  votes: Record<string, string>;  // 投票记录
  voteResult: VoteResult | null; // 投票结果
  // 玩家个人信息
  myRole?: Role;
  myRoleName?: string;
  myRoleDescription?: string;
  isAlive?: boolean;
  isHost?: boolean;
}
```

### 夜间行动 (NightActions)

```typescript
interface NightActions {
  werewolfVotes?: Record<string, string>;  // 狼人投票
  werewolfKill?: string;                   // 狼人击杀目标
  guardProtect?: string;                   // 守卫守护目标
  seerChecked?: boolean;                   // 预言家是否已查验
  witchSave?: boolean;                     // 女巫是否使用解药
  witchPoison?: string;                    // 女巫毒药目标
  witchActed?: boolean;                    // 女巫是否已行动
  guardActed?: boolean;                    // 守卫是否已行动
}
```

## API 接口

### 客户端 → 服务器事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `createRoom` | - | 创建新房间 |
| `joinRoom` | `{ roomId: string; playerName?: string }` | 加入/重连房间 |
| `startGame` | - | 开始游戏 |
| `nightAction` | `{ targetId?: string; action?: string }` | 夜间行动 |
| `vote` | `{ targetId: string }` | 投票 |
| `hunterShoot` | `{ targetId: string; skip?: boolean }` | 猎人开枪 |
| `whiteWolfExplode` | `{ targetId: string }` | 白狼王自爆 |
| `knightDuel` | `{ targetId: string }` | 骑士决斗 |
| `chat` | `string` | 发送聊天消息 |
| `werewolfChat` | `string` | 狼人夜间聊天 |
| `leaveRoom` | - | 离开房间 |
| `resetGame` | - | 重置游戏 (房主) |
| `godView` | `{ roomId: string; password: string }` | 上帝视角 |

### 服务器 → 客户端事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `roomCreated` | `{ roomId, player, gameState }` | 房间创建成功 |
| `roomJoined` | `{ roomId, player, gameState }` | 加入房间成功 |
| `reconnected` | `{ roomId, player, gameState }` | 重连成功 |
| `gameStarted` | `{ gameState }` | 游戏开始 |
| `gameStateUpdate` | `{ gameState }` | 游戏状态更新 |
| `playerJoined` | `{ player, playerCount }` | 玩家加入 |
| `playerLeft` | `{ playerName, playerCount }` | 玩家离开 |
| `playerDisconnected` | `{ playerName, reconnectTimeout }` | 玩家断线 |
| `playerReconnected` | `{ playerName, playerCount }` | 玩家重连 |
| `seerResult` | `{ targetId, targetName, isWerewolf }` | 查验结果 |
| `nightResult` | `{ deaths }` | 夜间结果 |
| `voteResult` | `{ voteResult }` | 投票结果 |
| `timerUpdate` | `{ timeLeft, phase }` | 计时器更新 |
| `chat` | `{ playerId, playerName, message }` | 聊天消息 |
| `werewolfChat` | `{ playerId, playerName, message }` | 狼人聊天 |
| `hunterShot` | `{ target }` | 猎人开枪 |
| `whiteWolfExploded` | `{ whiteWolf, target }` | 白狼王自爆 |
| `knightDueled` | `{ knight, target, duelSuccess }` | 骑士决斗 |
| `gameOver` | `{ winner, players }` | 游戏结束 |
| `error` | `{ message }` | 错误信息 |
| `godUpdate` | `{ gameState }` | 上帝视角更新 |

## 游戏流程

### 阶段流转图

```
waiting
    │
    ▼
night (天黑请闭眼)
    │
    ├─► night_werewolf_discuss (狼人讨论)
    │         │
    │         ▼
    │    night_werewolf (狼人击杀)
    │         │
    │         ▼
    ├─► night_guard (守卫行动)
    │         │
    │         ▼
    ├─► night_seer (预言家查验)
    │         │
    │         ▼
    ├─► night_witch (女巫行动)
    │         │
    ▼         ▼
day (天亮)
    │
    ▼
discussion (发言阶段)
    │
    ├─► whiteWolfExplode (白狼王自爆)
    │         │
    ├─► knightDuel (骑士决斗)
    │         │
    ▼         ▼
vote (投票)
    │
    ▼
vote_result (投票结果)
    │
    ├─► hunter_shoot (猎人开枪)
    │         │
    ▼         ▼
night → ... (循环)
    │
    ▼
game_over (游戏结束)
```

### 断线重连流程

```
1. 玩家断线
   ↓
2. 服务器标记为 disconnected，启动 15 秒计时器
   ↓
3. 客户端检测到断线，尝试自动重连
   ↓
4. 15 秒内发送 joinRoom { playerName: '我的名字' }
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

# 编译 TypeScript
npm run build

# 启动服务器
npm start
```

### 开发模式

```bash
# 使用 ts-node 运行（无需编译）
npm run dev

# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 类型检查
npm run typecheck
```

### 访问游戏

服务器启动后会显示访问地址：

```
狼人杀游戏服务器已启动！
本地访问: http://localhost:3000
局域网访问: http://192.168.x.x:3000
```

- **本机访问**：使用 `http://localhost:3000`
- **局域网访问**：其他设备使用显示的局域网 IP 地址

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并显示覆盖率
npm run test:coverage
```

### 测试覆盖范围

- **工具函数测试** (`tests/utils.test.ts`)
  - 房间 ID 生成
  - 随机名称生成
  - 本地 IP 获取

- **游戏逻辑测试** (`tests/game.test.ts`)
  - 玩家添加/删除
  - 游戏开始/重置
  - 投票功能
  - 断线/重连
  - 胜利条件检测

### 测试结果示例

```
Test Suites: 2 passed, 2 total
Tests:       31 passed, 31 total
Time:        3.256 s
```

## 配置说明

### 游戏常量 (src/constants.ts)

```typescript
export const GAME_CONFIG: GameConfig = {
  MIN_PLAYERS: 5,              // 最少玩家数
  MAX_PLAYERS: 10,             // 最多玩家数
  ROOM_ID_LENGTH: 6,           // 房间ID长度
  DISCUSSION_TIME: 60,         // 讨论时间（秒）
  VOTE_TIME: 30,               // 投票时间（秒）
  WEREWOLF_DISCUSS_TIME: 15,   // 狼人讨论时间（秒）
  HUNTER_SHOOT_TIME: 15,       // 猎人开枪时间（秒）
  RECONNECT_TIMEOUT: 15000,    // 重连超时（毫秒）
  // ... 更多配置
};
```

### 修改端口

在 `src/server.ts` 末尾修改：

```typescript
const PORT = process.env.PORT || 3000;
```

### 修改上帝密码

在环境变量中设置：

```bash
export GOD_PASSWORD=your_password
```

或修改 `src/server.ts` 中的默认值：

```typescript
const godPassword = process.env.GOD_PASSWORD || '123456';
```

## 常见问题

### Q: 为什么无法连接？

A: 检查防火墙设置，确保端口 3000 未被阻止。

### Q: 为什么重连后显示"游戏已开始，无法加入"？

A: 请确保只打开一个标签页，或清除 SessionStorage 后重试。

### Q: 如何查看服务器日志？

A: 运行 `npm start` 的终端会显示所有游戏日志。

### Q: 可以修改角色配置吗？

A: 可以修改 `src/constants.ts` 中的 `ROLE_CONFIG` 对象。

### Q: 如何调整游戏时间？

A: 在 `src/constants.ts` 中修改 `GAME_CONFIG`：

```typescript
DISCUSSION_TIME: 60,    // 讨论时间（秒）
VOTE_TIME: 30,          // 投票时间（秒）
```

### Q: 如何不局限于局域网？

A: 使用内网穿透工具（如 ngrok、frp）将本地服务器暴露到公网。

### Q: 服务器重启后游戏数据会丢失吗？

A: 是的，当前版本数据存储在内存中。服务器重启后所有游戏数据会清空。如需持久化存储，可以扩展数据库支持。

### Q: 如何调试重连问题？

A: 打开浏览器控制台（F12），查看日志：

```
Page load, session from sessionStorage
检测到保存的会话，尝试自动重连...
Socket connected, sending joinRoom
reconnected event received
```

## 更新日志

### V2.0 (当前版本)(重构)

- ✅ 完整的 TypeScript 重构
- ✅ 添加单元测试 (Jest)
- ✅ 类型安全提升
- ✅ 模块化前端代码
- ✅ 代码组织和可维护性提升

### V1.3 Beta

- ✅ 增加白狼王、骑士新角色
- ✅ 优化部分游戏功能

### V1.0

- ✅ 初始版本
- ✅ 基础狼人杀游戏功能

## 开发者信息

- **版本**：2.0.0
- **作者**：Xyihang / GLM-5
- **开发工具**：Trae IDE
- **技术栈**：Node.js + Express + Socket.IO + TypeScript + Jest

## 许可证

MIT License
