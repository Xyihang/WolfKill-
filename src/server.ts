import express from 'express';
import * as http from 'http';
import { Server } from 'socket.io';
import { Game, GAME_PHASES, ROLES } from './game';
import { GAME_CONFIG, CORS_CONFIG } from './constants';
import { getLocalIP, generateRoomId, generateRandomName } from './utils';
import { Player, Camp, Role } from './types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CORS_CONFIG.ORIGIN,
    methods: CORS_CONFIG.METHODS
  },
  pingTimeout: GAME_CONFIG.SOCKET_PING_TIMEOUT,
  pingInterval: GAME_CONFIG.SOCKET_PING_INTERVAL,
  transports: ['websocket', 'polling']
});

app.use(express.static('public'));

const rooms = new Map<string, Game>();
const playerRooms = new Map<string, string>();
const playerNames = new Map<string, string>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();

interface GameOverData {
  winner: Camp;
  players: Array<{ id: string; name: string; role: Role | null; alive: boolean }>;
}

function getGameOverData(game: Game, winner: Camp): GameOverData {
  const players = game.getPlayers().map(p => ({
    id: p.id,
    name: p.name,
    role: p.role,
    alive: p.alive
  }));
  
  return { winner, players };
}

function broadcastGameState(game: Game): void {
  game.players.forEach((player, id) => {
    io.to(id).emit('gameStateUpdate', game.getGameState(id));
  });
  broadcastGodUpdate(game);
}

function getGodViewState(game: Game) {
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
    guardInfo: game.getGuardInfo(),
    winner: game.winner,
    lastNightDeaths: game.lastNightDeaths
  };
}

function broadcastGodUpdate(game: Game): void {
  io.to(`god_${game.roomId}`).emit('godUpdate', getGodViewState(game));
}

function checkAllWerewolvesActed(game: Game): boolean {
  const aliveWerewolves = game.getAliveWerewolves();
  if (aliveWerewolves.length === 0) return true;
  if (!game.nightActions.werewolfVotes) return false;
  return aliveWerewolves.every(w => game.nightActions.werewolfVotes![w.id]);
}

function resolveWerewolfVote(game: Game): void {
  const votes = game.nightActions.werewolfVotes || {};
  const voteCount: Record<string, number> = {};
  
  for (const targetId of Object.values(votes)) {
    voteCount[targetId] = (voteCount[targetId] || 0) + 1;
  }
  
  let maxVotes = 0;
  let topTargets: string[] = [];
  
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

function checkAllSeersActed(game: Game): boolean {
  const aliveSeers = game.getAlivePlayers().filter(p => p.role === ROLES.SEER);
  return aliveSeers.length === 0 || !!game.nightActions.seerChecked;
}

function checkAllWitchesActed(game: Game): boolean {
  const aliveWitches = game.getAlivePlayers().filter(p => p.role === ROLES.WITCH);
  return aliveWitches.length === 0 || !!game.nightActions.witchActed;
}

function checkAllGuardsActed(game: Game): boolean {
  const aliveGuards = game.getAlivePlayers().filter(p => p.role === ROLES.GUARD);
  return aliveGuards.length === 0 || !!game.nightActions.guardActed;
}

function processNightPhase(game: Game, roomId: string): void {
  game.processNight();
  game.phase = GAME_PHASES.DAY;
  game.day++;
  
  broadcastGameState(game);
  io.to(roomId).emit('nightResult', { deaths: game.lastNightDeaths });
  
  const win = game.checkWinCondition();
  if (win) {
    io.to(roomId).emit('gameOver', getGameOverData(game, win));
    return;
  }
  
  if (game.hunterCanShoot) {
    game.phase = GAME_PHASES.HUNTER_SHOOT;
    (game as any).hunterShootContext = 'night';
    broadcastGameState(game);
    
    setTimeout(() => {
      if (game.hunterCanShoot) {
        game.hunterCanShoot = false;
        proceedToDiscussion(game, roomId);
      }
    }, GAME_CONFIG.HUNTER_SHOOT_TIME);
    return;
  }
  
  setTimeout(() => {
    proceedToDiscussion(game, roomId);
  }, GAME_CONFIG.DAY_ANNOUNCEMENT_DELAY);
}

function proceedToDiscussion(game: Game, roomId: string): void {
  const win = game.checkWinCondition();
  if (win) {
    broadcastGameState(game);
    io.to(roomId).emit('gameOver', getGameOverData(game, win));
    return;
  }
  
  game.phase = GAME_PHASES.DISCUSSION;
  game.speakerOrder = game.getAlivePlayers().map(p => p.id);
  game.currentSpeakerIndex = 0;
  broadcastGameState(game);
  
  startDiscussionTimer(game, roomId);
}

function startDiscussionTimer(game: Game, roomId: string): void {
  let timeLeft = game.discussionTime;
  
  const timer = setInterval(() => {
    timeLeft--;
    io.to(roomId).emit('timerUpdate', { timeLeft, phase: 'discussion' });
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      startVotePhase(game, roomId);
    }
  }, 1000);
  
  game.timers.discussion = timer;
}

function startVotePhase(game: Game, roomId: string): void {
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
  
  game.timers.vote = timer;
}

function processVoteResult(game: Game, roomId: string): void {
  const voteResult = game.processVote();
  game.voteResult = voteResult;
  game.phase = GAME_PHASES.VOTE_RESULT;
  
  broadcastGameState(game);
  io.to(roomId).emit('voteResult', voteResult);
  
  if (voteResult.idiotRevealed) {
    const win = game.checkWinCondition();
    if (win) {
      io.to(roomId).emit('gameOver', getGameOverData(game, win));
      return;
    }
    setTimeout(() => {
      proceedToNextNight(game, roomId);
    }, GAME_CONFIG.DAY_ANNOUNCEMENT_DELAY);
    return;
  }
  
  const win = game.checkWinCondition();
  if (win) {
    io.to(roomId).emit('gameOver', getGameOverData(game, win));
    return;
  }
  
  if (game.hunterCanShoot) {
    game.phase = GAME_PHASES.HUNTER_SHOOT;
    (game as any).hunterShootContext = 'vote';
    broadcastGameState(game);
    
    setTimeout(() => {
      if (game.hunterCanShoot) {
        game.hunterCanShoot = false;
        proceedToNextNight(game, roomId);
      }
    }, GAME_CONFIG.HUNTER_SHOOT_TIME);
  } else {
    setTimeout(() => {
      proceedToNextNight(game, roomId);
    }, GAME_CONFIG.DAY_ANNOUNCEMENT_DELAY);
  }
}

function proceedToNextNight(game: Game, roomId: string): void {
  const win = game.checkWinCondition();
  if (win) {
    broadcastGameState(game);
    io.to(roomId).emit('gameOver', getGameOverData(game, win));
    return;
  }
  
  game.startNight();
  broadcastGameState(game);
  startWerewolfDiscussTimer(game, roomId);
}

function checkNightPhaseComplete(game: Game, roomId: string): void {
  switch (game.phase) {
    case GAME_PHASES.NIGHT_WEREWOLF_DISCUSS:
      break;
    
    case GAME_PHASES.NIGHT_WEREWOLF:
      if (checkAllWerewolvesActed(game)) {
        resolveWerewolfVote(game);
        game.phase = GAME_PHASES.NIGHT_GUARD;
        broadcastGameState(game);
        setTimeout(() => checkNightPhaseComplete(game, roomId), GAME_CONFIG.PHASE_TRANSITION_DELAY);
      }
      break;
    
    case GAME_PHASES.NIGHT_GUARD:
      if (checkAllGuardsActed(game)) {
        game.phase = GAME_PHASES.NIGHT_SEER;
        broadcastGameState(game);
        setTimeout(() => checkNightPhaseComplete(game, roomId), GAME_CONFIG.PHASE_TRANSITION_DELAY);
      }
      break;
    
    case GAME_PHASES.NIGHT_SEER:
      if (checkAllSeersActed(game)) {
        game.phase = GAME_PHASES.NIGHT_WITCH;
        broadcastGameState(game);
        setTimeout(() => checkNightPhaseComplete(game, roomId), GAME_CONFIG.PHASE_TRANSITION_DELAY);
      }
      break;
    
    case GAME_PHASES.NIGHT_WITCH:
      if (checkAllWitchesActed(game)) {
        processNightPhase(game, roomId);
      }
      break;
  }
}

function startWerewolfDiscussTimer(game: Game, roomId: string): void {
  let timeLeft = game.werewolfDiscussTime;
  
  game.players.forEach((player, id) => {
    if (player.role === ROLES.WEREWOLF && player.alive) {
      io.to(id).emit('werewolfDiscussTimer', { timeLeft });
    }
  });
  
  const timer = setInterval(() => {
    timeLeft--;
    
    game.players.forEach((player, id) => {
      if (player.role === ROLES.WEREWOLF && player.alive) {
        io.to(id).emit('werewolfDiscussTimer', { timeLeft });
      }
    });
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      game.phase = GAME_PHASES.NIGHT_WEREWOLF;
      broadcastGameState(game);
      setTimeout(() => checkNightPhaseComplete(game, roomId), GAME_CONFIG.PHASE_TRANSITION_DELAY);
    }
  }, 1000);
  
  game.timers.werewolfDiscuss = timer;
}

function getUsedNames(): Set<string> {
  const usedNames = new Set<string>();
  rooms.forEach(game => {
    game.players.forEach(player => {
      usedNames.add(player.name);
    });
  });
  return usedNames;
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('createRoom', () => {
    const roomId = generateRoomId(rooms);
    const game = new Game(roomId);
    const playerName = generateRandomName(getUsedNames());
    const result = game.addPlayer(socket.id, playerName);
    
    if (result.success && result.player) {
      rooms.set(roomId, game);
      playerRooms.set(socket.id, roomId);
      playerNames.set(socket.id, playerName);
      socket.join(roomId);
      
      socket.emit('roomCreated', {
        roomId,
        player: result.player,
        gameState: game.getGameState(socket.id)
      });
      
      io.to(roomId).emit('gameStateUpdate', game.getGameState(socket.id));
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  socket.on('joinRoom', (data: { roomId: string; playerName?: string }) => {
    const { roomId, playerName: reconnectName } = data;
    
    const game = rooms.get(roomId.toUpperCase());
    
    if (!game) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    if (reconnectName) {
      const disconnectedInfo = game.getDisconnectedPlayerByName(reconnectName);
      
      if (disconnectedInfo) {
        const timer = disconnectTimers.get(disconnectedInfo.oldPlayerId);
        if (timer) {
          clearTimeout(timer);
          disconnectTimers.delete(disconnectedInfo.oldPlayerId);
        }
        
        const reconnectedPlayer = game.reconnectPlayer(disconnectedInfo.oldPlayerId, socket.id);
        
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
            message: '游戏已开始，无法加入。如果你是断线玩家，请等待后重试或联系房主。' 
          });
          return;
        }
      }
    }

    if (game.players.size >= GAME_CONFIG.MAX_PLAYERS) {
      socket.emit('error', { message: '房间已满' });
      return;
    }
    
    const playerName = generateRandomName(getUsedNames());
    const result = game.addPlayer(socket.id, playerName);
    
    if (result.success && result.player) {
      playerRooms.set(socket.id, roomId.toUpperCase());
      playerNames.set(socket.id, playerName);
      socket.join(roomId.toUpperCase());
      
      socket.emit('roomJoined', {
        roomId: roomId.toUpperCase(),
        player: result.player,
        gameState: game.getGameState(socket.id)
      });
      
      io.to(roomId.toUpperCase()).emit('gameStateUpdate', game.getGameState(socket.id));
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
    if (!roomId) return;
    
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
      }, GAME_CONFIG.GAME_START_DELAY);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  socket.on('nightAction', (data: { targetId?: string; action?: string }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
    const game = rooms.get(roomId);
    if (!game) return;
    
    const player = game.getPlayer(socket.id);
    if (!player || !player.alive) return;
    
    switch (game.phase) {
      case GAME_PHASES.NIGHT_WEREWOLF:
        if ((player.role === ROLES.WEREWOLF || player.role === ROLES.WHITE_WOLF) && data.targetId) {
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
          const result = game.guardProtect(socket.id, data.targetId || null);
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
        if (player.role === ROLES.SEER && data.targetId) {
          const result = game.seerCheck(socket.id, data.targetId);
          if (result.success) {
            socket.emit('seerResult', {
              targetId: data.targetId,
              targetName: game.getPlayer(data.targetId)?.name,
              isWerewolf: result.isWerewolf
            });
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
          } else if (data.action === 'poison' && data.targetId) {
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

  socket.on('vote', (data: { targetId: string }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
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
        if (game.timers.vote) {
          clearInterval(game.timers.vote);
        }
        processVoteResult(game, roomId);
      }
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  socket.on('hunterShoot', (data: { targetId: string; skip?: boolean }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
    const game = rooms.get(roomId);
    if (!game || game.phase !== GAME_PHASES.HUNTER_SHOOT) return;
    
    if (data.skip) {
      const result = game.hunterSkipShoot(socket.id);
      if (result.success) {
        const context = (game as any).hunterShootContext;
        if (context === 'night') {
          setTimeout(() => proceedToDiscussion(game, roomId), GAME_CONFIG.DAY_ANNOUNCEMENT_DELAY);
        } else {
          setTimeout(() => proceedToNextNight(game, roomId), GAME_CONFIG.DAY_ANNOUNCEMENT_DELAY);
        }
      }
      return;
    }
    
    const result = game.hunterShoot(socket.id, data.targetId);
    
    if (result.success && result.target) {
      io.to(roomId).emit('hunterShot', result.target);
      
      const win = game.checkWinCondition();
      if (win) {
        io.to(roomId).emit('gameOver', getGameOverData(game, win));
        return;
      }
      
      const context = (game as any).hunterShootContext;
      if (context === 'night') {
        setTimeout(() => proceedToDiscussion(game, roomId), GAME_CONFIG.DAY_ANNOUNCEMENT_DELAY);
      } else {
        setTimeout(() => proceedToNextNight(game, roomId), GAME_CONFIG.DAY_ANNOUNCEMENT_DELAY);
      }
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  socket.on('whiteWolfExplode', (data: { targetId: string }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
    const game = rooms.get(roomId);
    if (!game || game.phase !== GAME_PHASES.DISCUSSION) return;
    
    const result = game.whiteWolfExplode(socket.id, data.targetId);
    
    if (result.success && result.whiteWolf && result.target) {
      io.to(roomId).emit('whiteWolfExploded', result);
      
      const win = game.checkWinCondition();
      if (win) {
        io.to(roomId).emit('gameOver', getGameOverData(game, win));
        return;
      }
      
      if (game.timers.discussion) {
        clearInterval(game.timers.discussion);
      }
      
      setTimeout(() => proceedToNextNight(game, roomId), GAME_CONFIG.DAY_ANNOUNCEMENT_DELAY);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  socket.on('knightDuel', (data: { targetId: string }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
    const game = rooms.get(roomId);
    if (!game || game.phase !== GAME_PHASES.DISCUSSION) return;
    
    const result = game.knightDuel(socket.id, data.targetId);
    
    if (result.success && result.knight && result.target) {
      io.to(roomId).emit('knightDueled', result);
      
      const win = game.checkWinCondition();
      if (win) {
        io.to(roomId).emit('gameOver', getGameOverData(game, win));
        return;
      }
      
      if (result.duelSuccess) {
        if (game.timers.discussion) {
          clearInterval(game.timers.discussion);
        }
        setTimeout(() => proceedToNextNight(game, roomId), GAME_CONFIG.DAY_ANNOUNCEMENT_DELAY);
      }
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  socket.on('werewolfChat', (message: string) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
    const game = rooms.get(roomId);
    if (!game) return;
    
    const player = game.getPlayer(socket.id);
    if (!player || (player.role !== ROLES.WEREWOLF && player.role !== ROLES.WHITE_WOLF)) return;
    
    game.players.forEach((p, id) => {
      if ((p.role === ROLES.WEREWOLF || p.role === ROLES.WHITE_WOLF) && p.alive) {
        io.to(id).emit('werewolfChat', {
          playerId: socket.id,
          playerName: player.name,
          message
        });
      }
    });
  });

  socket.on('chat', (message: string) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
    const game = rooms.get(roomId);
    if (!game) return;
    
    const player = game.getPlayer(socket.id);
    if (!player) return;
    
    if (game.phase === GAME_PHASES.NIGHT || 
        game.phase === GAME_PHASES.NIGHT_WEREWOLF_DISCUSS ||
        game.phase === GAME_PHASES.NIGHT_WEREWOLF ||
        game.phase === GAME_PHASES.NIGHT_SEER ||
        game.phase === GAME_PHASES.NIGHT_WITCH ||
        game.phase === GAME_PHASES.NIGHT_GUARD) {
      return;
    }
    
    io.to(roomId).emit('chat', {
      playerId: socket.id,
      playerName: player.name,
      message
    });
  });

  socket.on('leaveRoom', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
    const game = rooms.get(roomId);
    
    if (game) {
      const player = game.getPlayer(socket.id);
      if (player) {
        game.removePlayer(socket.id);
        io.to(roomId).emit('playerLeft', {
          playerName: player.name,
          playerCount: game.players.size
        });
        
        if (game.players.size === 0) {
          game.clearTimers();
          rooms.delete(roomId);
        }
      }
    }
    
    playerRooms.delete(socket.id);
    playerNames.delete(socket.id);
  });

  socket.on('resetGame', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
    const game = rooms.get(roomId);
    if (!game) return;
    
    const player = game.getPlayer(socket.id);
    if (!player || !player.isHost) return;
    
    game.reset();
    io.to(roomId).emit('gameReset');
    broadcastGameState(game);
  });

  socket.on('godView', (data: { roomId: string; password: string }) => {
    const { roomId, password } = data;
    const game = rooms.get(roomId.toUpperCase());
    
    if (!game) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }
    
    const godPassword = process.env.GOD_PASSWORD || '123456';
    if (password !== godPassword) {
      socket.emit('error', { message: '密码错误' });
      return;
    }
    
    socket.join(`god_${roomId.toUpperCase()}`);
    socket.emit('godUpdate', getGodViewState(game));
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
    const game = rooms.get(roomId);
    
    if (game) {
      const player = game.disconnectPlayer(socket.id);
      
      if (player) {
        io.to(roomId).emit('playerDisconnected', {
          playerName: player.name,
          reconnectTimeout: Math.floor(GAME_CONFIG.RECONNECT_TIMEOUT / 1000)
        });
        
        const timer = setTimeout(() => {
          game.removeDisconnectedPlayer(socket.id);
          disconnectTimers.delete(socket.id);
          
          if (game.players.size === 0) {
            game.clearTimers();
            rooms.delete(roomId);
          }
        }, GAME_CONFIG.RECONNECT_TIMEOUT);
        
        disconnectTimers.set(socket.id, timer);
      }
    }
    
    playerRooms.delete(socket.id);
    playerNames.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT as number, () => {
  const localIP = getLocalIP();
  console.log(`狼人杀游戏服务器已启动！`);
  console.log(`本地访问: http://localhost:${PORT}`);
  console.log(`局域网访问: http://${localIP}:${PORT}`);
});
