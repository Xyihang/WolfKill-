/**
 * 局域网狼人杀游戏 - 服务器端
 * Made by Xyihang and GLM-5 / 由 Xyihang 和 GLM-5 制作
 */
const express = require('express');
const http = require('http');
const os = require('os');
const { Server } = require('socket.io');
const { Game, GAME_PHASES, ROLES } = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

app.use(express.static('public'));

const rooms = new Map();
const playerRooms = new Map();
const playerNames = new Map();
const disconnectTimers = new Map();
const RECONNECT_TIMEOUT = 15000;

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

function generateRoomId() {
  let roomId;
  do {
    roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (rooms.has(roomId));
  return roomId;
}

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

function generateRandomName() {
  const usedNames = new Set();
  rooms.forEach(game => {
    game.players.forEach(player => {
      usedNames.add(player.name);
    });
  });

  let maxAttempts = 50;
  for (let i = 0; i < maxAttempts; i++) {
    const randomIndex = Math.floor(Math.random() * CHINESE_NAMES.length);
    const name = CHINESE_NAMES[randomIndex];
    if (!usedNames.has(name)) {
      return name;
    }
  }

  return `玩家${Math.floor(Math.random() * 9000) + 1000}`;
}

function getLocalIP() {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function broadcastGameState(game) {
  game.players.forEach((player, id) => {
    io.to(id).emit('gameStateUpdate', game.getGameState(id));
  });
  broadcastGodUpdate(game);
}

function getGodViewState(game) {
  return {
    roomId: game.roomId,
    phase: game.phase,
    day: game.day,
    players: game.getPlayers().map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      alive: p.alive,
      isHost: p.isHost,
      disconnected: p.disconnected || false
    })),
    nightActions: game.nightActions,
    witchPotions: game.witchPotions,
    guardInfo: game.getGuardInfo ? game.getGuardInfo() : null,
    winner: game.winner,
    lastNightDeaths: game.lastNightDeaths
  };
}

function broadcastGodUpdate(game) {
  io.to(`god_${game.roomId}`).emit('godUpdate', getGodViewState(game));
}

function checkAllWerewolvesActed(game) {
  const aliveWerewolves = game.getAliveWerewolves();
  if (aliveWerewolves.length === 0) return true;
  if (!game.nightActions.werewolfVotes) return false;
  return aliveWerewolves.every(w => game.nightActions.werewolfVotes[w.id]);
}

function resolveWerewolfVote(game) {
  const votes = game.nightActions.werewolfVotes || {};
  const voteCount = {};
  
  for (const targetId of Object.values(votes)) {
    voteCount[targetId] = (voteCount[targetId] || 0) + 1;
  }
  
  let maxVotes = 0;
  let topTargets = [];
  
  for (const [targetId, count] of Object.entries(voteCount)) {
    if (count > maxVotes) {
      maxVotes = count;
      topTargets = [targetId];
    } else if (count === maxVotes) {
      topTargets.push(targetId);
    }
  }
  
  if (topTargets.length === 1) {
    game.nightActions.werewolfKill = topTargets[0];
  } else if (topTargets.length > 1) {
    const randomIndex = Math.floor(Math.random() * topTargets.length);
    game.nightActions.werewolfKill = topTargets[randomIndex];
  }
}

function checkAllSeersActed(game) {
  const aliveSeers = game.getAlivePlayers().filter(p => p.role === ROLES.SEER);
  return aliveSeers.length === 0 || game.nightActions.seerChecked;
}

function checkAllWitchesActed(game) {
  const aliveWitches = game.getAlivePlayers().filter(p => p.role === ROLES.WITCH);
  return aliveWitches.length === 0 || game.nightActions.witchActed;
}

function checkAllGuardsActed(game) {
  const aliveGuards = game.getAlivePlayers().filter(p => p.role === ROLES.GUARD);
  return aliveGuards.length === 0 || game.nightActions.guardActed;
}

function processNightPhase(game, roomId) {
  const deaths = game.processNight();
  game.phase = GAME_PHASES.DAY;
  game.day++;
  
  broadcastGameState(game);
  io.to(roomId).emit('nightResult', { deaths });
  
  const win = game.checkWinCondition();
  if (win) {
    io.to(roomId).emit('gameOver', { winner: win });
    return;
  }
  
  if (game.hunterCanShoot) {
    game.phase = GAME_PHASES.HUNTER_SHOOT;
    game.hunterShootContext = 'night';
    broadcastGameState(game);
    
    setTimeout(() => {
      if (game.hunterCanShoot) {
        game.hunterCanShoot = false;
        proceedToDiscussion(game, roomId);
      }
    }, 10000);
    return;
  }
  
  setTimeout(() => {
    proceedToDiscussion(game, roomId);
  }, 3000);
}

function proceedToDiscussion(game, roomId) {
  const win = game.checkWinCondition();
  if (win) {
    broadcastGameState(game);
    io.to(roomId).emit('gameOver', { winner: win });
    return;
  }
  
  game.phase = GAME_PHASES.DISCUSSION;
  game.speakerOrder = game.getAlivePlayers().map(p => p.id);
  game.currentSpeakerIndex = 0;
  broadcastGameState(game);
  
  startDiscussionTimer(game, roomId);
}

function startDiscussionTimer(game, roomId) {
  let timeLeft = game.discussionTime;
  
  const timer = setInterval(() => {
    timeLeft--;
    io.to(roomId).emit('timerUpdate', { timeLeft, phase: 'discussion' });
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      startVotePhase(game, roomId);
    }
  }, 1000);
  
  if (!game.timers) game.timers = {};
  game.timers.discussion = timer;
}

function startVotePhase(game, roomId) {
  game.phase = GAME_PHASES.VOTE;
  game.votes = {};
  broadcastGameState(game);
  
  let timeLeft = game.voteTime;
  
  const timer = setInterval(() => {
    timeLeft--;
    io.to(roomId).emit('timerUpdate', { timeLeft, phase: 'vote' });
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      processVoteResult(game, roomId);
    }
  }, 1000);
  
  if (!game.timers) game.timers = {};
  game.timers.vote = timer;
}

function processVoteResult(game, roomId) {
  const voteResult = game.processVote();
  game.voteResult = voteResult;
  game.phase = GAME_PHASES.VOTE_RESULT;
  
  broadcastGameState(game);
  io.to(roomId).emit('voteResult', voteResult);
  
  const win = game.checkWinCondition();
  if (win) {
    io.to(roomId).emit('gameOver', { winner: win });
    return;
  }
  
  if (game.hunterCanShoot) {
    game.phase = GAME_PHASES.HUNTER_SHOOT;
    game.hunterShootContext = 'vote';
    broadcastGameState(game);
    
    setTimeout(() => {
      if (game.hunterCanShoot) {
        game.hunterCanShoot = false;
        proceedToNextNight(game, roomId);
      }
    }, 10000);
  } else {
    setTimeout(() => {
      proceedToNextNight(game, roomId);
    }, 3000);
  }
}

function proceedToNextNight(game, roomId) {
  const win = game.checkWinCondition();
  if (win) {
    broadcastGameState(game);
    io.to(roomId).emit('gameOver', { winner: win });
    return;
  }
  
  game.startNight();
  broadcastGameState(game);
  startWerewolfDiscussTimer(game, roomId);
}

function checkNightPhaseComplete(game, roomId) {
  switch (game.phase) {
    case GAME_PHASES.NIGHT_WEREWOLF_DISCUSS:
      break;
    
    case GAME_PHASES.NIGHT_WEREWOLF:
      if (checkAllWerewolvesActed(game)) {
        resolveWerewolfVote(game);
        game.phase = GAME_PHASES.NIGHT_GUARD;
        broadcastGameState(game);
        setTimeout(() => checkNightPhaseComplete(game, roomId), 1000);
      }
      break;
    
    case GAME_PHASES.NIGHT_GUARD:
      if (checkAllGuardsActed(game)) {
        game.phase = GAME_PHASES.NIGHT_SEER;
        broadcastGameState(game);
        setTimeout(() => checkNightPhaseComplete(game, roomId), 1000);
      }
      break;
    
    case GAME_PHASES.NIGHT_SEER:
      if (checkAllSeersActed(game)) {
        game.phase = GAME_PHASES.NIGHT_WITCH;
        broadcastGameState(game);
        setTimeout(() => checkNightPhaseComplete(game, roomId), 1000);
      }
      break;
    
    case GAME_PHASES.NIGHT_WITCH:
      if (checkAllWitchesActed(game)) {
        processNightPhase(game, roomId);
      }
      break;
  }
}

function startWerewolfDiscussTimer(game, roomId) {
  let timeLeft = game.werewolfDiscussTime;
  
  game.players.forEach((player, id) => {
    if (player.role === ROLES.WEREWOLF && player.alive) {
      io.to(id).emit('werewolfDiscussTimer', { timeLeft });
    }
  });
  
  if (!game.timers) game.timers = {};
  game.timers.werewolfDiscuss = setInterval(() => {
    timeLeft--;
    
    game.players.forEach((player, id) => {
      if (player.role === ROLES.WEREWOLF && player.alive) {
        io.to(id).emit('werewolfDiscussTimer', { timeLeft });
      }
    });
    
    if (timeLeft <= 0) {
      clearInterval(game.timers.werewolfDiscuss);
      game.phase = GAME_PHASES.NIGHT_WEREWOLF;
      broadcastGameState(game);
      setTimeout(() => checkNightPhaseComplete(game, roomId), 1000);
    }
  }, 1000);
}

io.on('connection', (socket) => {
  console.log(`玩家连接: ${socket.id}`);

  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    const game = new Game(roomId);
    const playerName = generateRandomName();
    const result = game.addPlayer(socket.id, playerName);
    
    if (result.success) {
      rooms.set(roomId, game);
      playerRooms.set(socket.id, roomId);
      playerNames.set(socket.id, playerName);
      socket.join(roomId);
      
      socket.emit('roomCreated', {
        roomId,
        player: result.player,
        gameState: game.getGameState(socket.id)
      });
      
      io.to(roomId).emit('gameStateUpdate', game.getGameState());
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  socket.on('joinRoom', (data) => {
    const { roomId, playerName: reconnectName } = data;
    console.log('joinRoom event:', { roomId, reconnectName, socketId: socket.id });
    
    const game = rooms.get(roomId.toUpperCase());
    
    if (!game) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    if (reconnectName) {
      console.log('Checking for disconnected player:', reconnectName);
      console.log('Disconnected players:', Array.from(game.disconnectedPlayers.entries()));
      
      const disconnectedInfo = game.getDisconnectedPlayerByName(reconnectName);
      console.log('Disconnected info found:', disconnectedInfo);
      
      if (disconnectedInfo) {
        if (disconnectTimers.has(disconnectedInfo.oldPlayerId)) {
          clearTimeout(disconnectTimers.get(disconnectedInfo.oldPlayerId));
          disconnectTimers.delete(disconnectedInfo.oldPlayerId);
        }
        
        const reconnectedPlayer = game.reconnectPlayer(disconnectedInfo.oldPlayerId, socket.id);
        console.log('Reconnected player:', reconnectedPlayer);
        
        if (reconnectedPlayer) {
          playerRooms.set(socket.id, roomId.toUpperCase());
          playerNames.set(socket.id, reconnectName);
          socket.join(roomId.toUpperCase());
          
          socket.emit('reconnected', {
            roomId: roomId.toUpperCase(),
            player: reconnectedPlayer,
            gameState: game.getGameState(socket.id)
          });
          
          io.to(roomId.toUpperCase()).emit('playerReconnected', {
            playerName: reconnectName,
            playerCount: game.players.size
          });
          
          broadcastGameState(game);
          return;
        }
      } else {
        if (game.phase !== GAME_PHASES.WAITING) {
          socket.emit('error', { 
            message: '游戏已开始，无法加入。如果你是断线玩家，请等待15秒后重试或联系房主。' 
          });
          return;
        }
      }
    }

    if (game.players.size >= 10) {
      socket.emit('error', { message: '房间已满' });
      return;
    }
    
    const playerName = generateRandomName();
    const result = game.addPlayer(socket.id, playerName);
    
    if (result.success) {
      playerRooms.set(socket.id, roomId.toUpperCase());
      playerNames.set(socket.id, playerName);
      socket.join(roomId.toUpperCase());
      
      socket.emit('roomJoined', {
        roomId: roomId.toUpperCase(),
        player: result.player,
        gameState: game.getGameState(socket.id)
      });
      
      io.to(roomId.toUpperCase()).emit('gameStateUpdate', game.getGameState());
      io.to(roomId.toUpperCase()).emit('playerJoined', {
        player: result.player,
        playerCount: game.players.size
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  socket.on('startGame', () => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (!game) {
      socket.emit('error', { message: '游戏不存在' });
      return;
    }
    
    const player = game.getPlayer(socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', { message: '只有房主可以开始游戏' });
      return;
    }
    
    const result = game.start();
    if (result.success) {
      game.players.forEach((p, id) => {
        io.to(id).emit('gameStarted', game.getGameState(id));
      });
      
      setTimeout(() => {
        game.startNight();
        broadcastGameState(game);
        startWerewolfDiscussTimer(game, roomId);
      }, 2000);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  socket.on('nightAction', (data) => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (!game) return;
    
    const player = game.getPlayer(socket.id);
    if (!player || !player.alive) return;
    
    switch (game.phase) {
      case GAME_PHASES.NIGHT_WEREWOLF:
        if (player.role === ROLES.WEREWOLF) {
          if (!game.nightActions.werewolfVotes) {
            game.nightActions.werewolfVotes = {};
          }
          game.nightActions.werewolfVotes[socket.id] = data.targetId;
          
          const target = game.getPlayer(data.targetId);
          socket.emit('actionSuccess', { message: `你选择击杀 ${target?.name}` });
          
          checkNightPhaseComplete(game, roomId);
        }
        break;
      
      case GAME_PHASES.NIGHT_GUARD:
        if (player.role === ROLES.GUARD) {
          const result = game.guardProtect(socket.id, data.targetId);
          if (result.success) {
            if (data.targetId) {
              const targetPlayer = game.getPlayer(data.targetId);
              socket.emit('actionSuccess', { message: `你选择守护 ${targetPlayer?.name}` });
            } else {
              socket.emit('actionSuccess', { message: '你选择空守' });
            }
            checkNightPhaseComplete(game, roomId);
          } else {
            socket.emit('error', { message: result.message });
          }
        }
        break;
      
      case GAME_PHASES.NIGHT_SEER:
        if (player.role === ROLES.SEER) {
          const result = game.seerCheck(socket.id, data.targetId);
          if (result.success) {
            socket.emit('seerResult', {
              targetId: data.targetId,
              targetName: game.getPlayer(data.targetId)?.name,
              isWerewolf: result.isWerewolf
            });
            game.nightActions.seerChecked = true;
            checkNightPhaseComplete(game, roomId);
          }
        }
        break;
      
      case GAME_PHASES.NIGHT_WITCH:
        if (player.role === ROLES.WITCH) {
          if (data.action === 'save') {
            const result = game.witchSave(socket.id);
            if (result.success) {
              socket.emit('actionSuccess', { message: '你使用了解药' });
              game.nightActions.witchActed = true;
              checkNightPhaseComplete(game, roomId);
            } else {
              socket.emit('error', { message: result.message });
            }
          } else if (data.action === 'poison') {
            const result = game.witchPoison(socket.id, data.targetId);
            if (result.success) {
              socket.emit('actionSuccess', { message: '你使用了毒药' });
              game.nightActions.witchActed = true;
              checkNightPhaseComplete(game, roomId);
            } else {
              socket.emit('error', { message: result.message });
            }
          } else if (data.action === 'skip') {
            socket.emit('actionSuccess', { message: '你选择不使用药水' });
            game.nightActions.witchActed = true;
            checkNightPhaseComplete(game, roomId);
          }
        }
        break;
    }
  });

  socket.on('vote', (data) => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (!game || game.phase !== GAME_PHASES.VOTE) return;
    
    const result = data.targetId === 'skip' 
      ? game.skipVote(socket.id)
      : game.vote(socket.id, data.targetId);
    
    if (result.success) {
      broadcastGameState(game);
      
      const aliveCount = game.getAlivePlayers().length;
      const voteCount = Object.keys(game.votes).length;
      
      if (voteCount >= aliveCount) {
        if (game.timers && game.timers.vote) {
          clearInterval(game.timers.vote);
        }
        processVoteResult(game, roomId);
      }
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  socket.on('hunterShoot', (data) => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (!game || game.phase !== GAME_PHASES.HUNTER_SHOOT) return;
    
    const context = game.hunterShootContext || 'vote';
    
    if (data.skip) {
      const result = game.hunterSkipShoot(socket.id);
      if (result.success) {
        broadcastGameState(game);
        if (context === 'night') {
          proceedToDiscussion(game, roomId);
        } else {
          proceedToNextNight(game, roomId);
        }
      }
    } else {
      const result = game.hunterShoot(socket.id, data.targetId);
      if (result.success) {
        io.to(roomId).emit('hunterShot', result.target);
        broadcastGameState(game);
        
        const win = game.checkWinCondition();
        if (win) {
          io.to(roomId).emit('gameOver', { winner: win });
        } else {
          setTimeout(() => {
            if (context === 'night') {
              proceedToDiscussion(game, roomId);
            } else {
              proceedToNextNight(game, roomId);
            }
          }, 2000);
        }
      } else {
        socket.emit('error', { message: result.message });
      }
    }
  });

  socket.on('chat', (message) => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (!game) return;
    
    const player = game.getPlayer(socket.id);
    if (!player) return;
    
    if (!player.alive) {
      socket.emit('error', { message: '你已死亡，无法发言' });
      return;
    }
    
    io.to(roomId).emit('chat', {
      playerId: socket.id,
      playerName: player.name,
      message,
      timestamp: Date.now()
    });
  });

  socket.on('werewolfChat', (message) => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (!game) return;
    if (game.phase !== GAME_PHASES.NIGHT_WEREWOLF_DISCUSS) return;
    
    const player = game.getPlayer(socket.id);
    if (!player || player.role !== ROLES.WEREWOLF || !player.alive) return;
    
    game.players.forEach((p, id) => {
      if (p.role === ROLES.WEREWOLF && p.alive) {
        io.to(id).emit('werewolfChat', {
          playerId: socket.id,
          playerName: player.name,
          message,
          timestamp: Date.now()
        });
      }
    });
  });

  socket.on('resetGame', () => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (!game) return;
    
    const player = game.getPlayer(socket.id);
    if (!player || !player.isHost) return;
    
    if (game.timers) {
      Object.values(game.timers).forEach(timer => clearInterval(timer));
    }
    
    game.reset();
    broadcastGameState(game);
    io.to(roomId).emit('gameReset');
  });

  socket.on('leaveRoom', () => {
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const game = rooms.get(roomId);
      if (game) {
        const player = game.removePlayer(socket.id);
        if (player) {
          io.to(roomId).emit('playerLeft', {
            playerId: socket.id,
            playerName: player.name,
            playerCount: game.players.size
          });
          
          if (game.players.size === 0) {
            if (game.timers) {
              Object.values(game.timers).forEach(timer => clearInterval(timer));
            }
            rooms.delete(roomId);
          } else {
            broadcastGameState(game);
          }
        }
      }
      playerRooms.delete(socket.id);
      playerNames.delete(socket.id);
      socket.leave(roomId);
    }
  });

  socket.on('getRooms', () => {
    const roomsList = [];
    rooms.forEach((game, roomId) => {
      roomsList.push({
        roomId,
        playerCount: game.players.size,
        phase: game.phase
      });
    });
    socket.emit('roomsList', roomsList);
  });

  socket.on('godJoin', (data) => {
    const { roomId } = data;
    const game = rooms.get(roomId.toUpperCase());
    
    if (!game) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }
    
    socket.join(`god_${roomId.toUpperCase()}`);
    socket.emit('godJoined', getGodViewState(game));
  });

  socket.on('godLeave', () => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith('god_')) {
        socket.leave(room);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`玩家断开连接: ${socket.id}`);
    
    const roomId = playerRooms.get(socket.id);
    const playerName = playerNames.get(socket.id);
    
    if (roomId) {
      const game = rooms.get(roomId);
      if (game) {
        if (game.phase === GAME_PHASES.WAITING) {
          const player = game.removePlayer(socket.id);
          if (player) {
            io.to(roomId).emit('playerLeft', {
              playerId: socket.id,
              playerName: player.name,
              playerCount: game.players.size
            });
            
            if (game.players.size === 0) {
              if (game.timers) {
                Object.values(game.timers).forEach(timer => clearInterval(timer));
              }
              rooms.delete(roomId);
            } else {
              broadcastGameState(game);
            }
          }
        } else {
          const player = game.disconnectPlayer(socket.id);
          if (player) {
            io.to(roomId).emit('playerDisconnected', {
              playerId: socket.id,
              playerName: player.name,
              reconnectTimeout: RECONNECT_TIMEOUT / 1000
            });
            
            const timer = setTimeout(() => {
              const removedPlayer = game.removeDisconnectedPlayer(socket.id);
              if (removedPlayer) {
                io.to(roomId).emit('playerLeft', {
                  playerId: socket.id,
                  playerName: removedPlayer.name,
                  playerCount: game.players.size,
                  timeout: true
                });
                
                if (game.players.size === 0) {
                  if (game.timers) {
                    Object.values(game.timers).forEach(timer => clearInterval(timer));
                  }
                  rooms.delete(roomId);
                } else {
                  broadcastGameState(game);
                }
              }
              disconnectTimers.delete(socket.id);
            }, RECONNECT_TIMEOUT);
            
            disconnectTimers.set(socket.id, timer);
          }
        }
      }
      playerRooms.delete(socket.id);
      playerNames.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
const localIP = getLocalIP();

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('=================================');
  console.log('   狼人杀游戏服务器已启动');
  console.log('=================================');
  console.log(`本机访问: http://localhost:${PORT}`);
  console.log(`局域网访问: http://${localIP}:${PORT}`);
  console.log('=================================');
  console.log('其他设备请使用局域网地址访问');
  console.log('=================================');
});
