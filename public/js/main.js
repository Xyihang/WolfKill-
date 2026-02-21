import { 
  saveSession, 
  clearSession, 
  getState, 
  setState, 
  getRoomId, 
  setRoomId, 
  getPlayerName, 
  setPlayerName,
  isReconnectAttempted,
  setReconnectAttempted
} from './state.js';
import { showScreen, showToast, showModal, addLog, addChatMessage } from './ui.js';
import { updatePlayersList, updateRoleCard, updatePhaseInfo, updateStartButton, updateChatInput } from './players.js';
import { updateActionPanel, addWerewolfChatMessage } from './actions.js';
import socket from './socket.js';

function updateUI() {
  updatePlayersList();
  updateRoleCard();
  updatePhaseInfo();
  updateActionPanel();
  updateStartButton();
  updateChatInput();
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (message) {
    socket.emit('chat', message);
    input.value = '';
  }
}

document.getElementById('createRoomBtn').addEventListener('click', () => {
  socket.emit('createRoom');
});

document.getElementById('joinRoomBtn').addEventListener('click', () => {
  const roomId = document.getElementById('roomIdInput').value.trim();
  
  if (!roomId) {
    showToast('请输入房间号');
    return;
  }
  
  socket.emit('joinRoom', { roomId });
});

document.getElementById('startGameBtn').addEventListener('click', () => {
  socket.emit('startGame');
});

document.getElementById('leaveWaitingRoomBtn').addEventListener('click', () => {
  showModal('离开房间', '确定要退出房间吗？', [
    { text: '取消', class: 'btn-secondary' },
    { text: '确定', callback: () => {
      socket.emit('leaveRoom');
      clearSession();
      location.reload();
    }}
  ]);
});

document.getElementById('copyRoomIdBtn').addEventListener('click', () => {
  const roomId = getRoomId();
  navigator.clipboard.writeText(roomId).then(() => {
    showToast('房间号已复制');
  });
});

document.getElementById('resetGameBtn').addEventListener('click', () => {
  showModal('重新开始', '确定要重新开始游戏吗？', [
    { text: '取消', class: 'btn-secondary' },
    { text: '确定', callback: () => socket.emit('resetGame') }
  ]);
});

document.getElementById('leaveGameRoomBtn').addEventListener('click', () => {
  showModal('返回大厅', '确定要退出房间吗？', [
    { text: '取消', class: 'btn-secondary' },
    { text: '确定', callback: () => {
      socket.emit('leaveRoom');
      clearSession();
      location.reload();
    }}
  ]);
});

document.getElementById('sendChatBtn').addEventListener('click', sendChat);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChat();
});

socket.on('roomCreated', (data) => {
  console.log('roomCreated event:', data);
  setRoomId(data.roomId);
  setPlayerName(data.player.name);
  saveSession();
  document.getElementById('displayRoomId').textContent = data.roomId;
  document.getElementById('gameRoomId').textContent = data.roomId;
  setState(data.gameState);
  showScreen('waitingRoom');
  updateUI();
  addLog(`你创建了房间 ${data.roomId}`);
});

socket.on('roomJoined', (data) => {
  console.log('roomJoined event:', data);
  setRoomId(data.roomId);
  setPlayerName(data.player.name);
  saveSession();
  document.getElementById('displayRoomId').textContent = data.roomId;
  document.getElementById('gameRoomId').textContent = data.roomId;
  setState(data.gameState);
  showScreen('waitingRoom');
  updateUI();
  addLog(`你加入了房间 ${data.roomId}`);
});

socket.on('reconnected', (data) => {
  console.log('reconnected event received:', data);
  setRoomId(data.roomId);
  setPlayerName(data.player.name);
  saveSession();
  document.getElementById('displayRoomId').textContent = data.roomId;
  document.getElementById('gameRoomId').textContent = data.roomId;
  setState(data.gameState);
  showScreen('gameRoom');
  updateUI();
  showToast('重连成功！');
  addLog('你已重新连接到游戏', true);
});

socket.on('gameStateUpdate', (state) => {
  setState(state);
  const playerName = getPlayerName();
  if (playerName && state.players) {
    const me = state.players.find(p => p.name === playerName);
    if (me) {
      setPlayerName(me.name);
      saveSession();
    }
  }
  updateUI();
});

socket.on('playerJoined', (data) => {
  addLog(`${data.player.name} 加入了房间`);
  showToast(`${data.player.name} 加入了房间`);
});

socket.on('playerDisconnected', (data) => {
  addLog(`${data.playerName} 断开连接，等待重连... (${data.reconnectTimeout}秒)`);
  showToast(`${data.playerName} 断开连接`);
});

socket.on('playerReconnected', (data) => {
  addLog(`${data.playerName} 已重新连接`);
  showToast(`${data.playerName} 重新连接`);
});

socket.on('playerLeft', (data) => {
  addLog(`${data.playerName} 离开了房间`);
  showToast(`${data.playerName} 离开了房间`);
});

socket.on('gameStarted', (state) => {
  setState(state);
  if (state.myRoleName && getPlayerName()) {
    saveSession();
  }
  showScreen('gameRoom');
  updateUI();
  addLog('游戏开始！', true);
  addChatMessage({ system: true, message: '游戏开始！' });
  
  showModal('你的身份', `你是 ${state.myRoleName}\n${state.myRoleDescription}`, [
    { text: '知道了', class: 'btn-primary' }
  ]);
});

socket.on('seerResult', (data) => {
  const result = data.isWerewolf ? '🐺 狼人' : '👤 好人';
  showModal('查验结果', `${data.targetName} 是 ${result}`, [
    { text: '确定', class: 'btn-primary' }
  ]);
  addLog(`你查验了 ${data.targetName}，是${result}`);
});

socket.on('actionSuccess', (data) => {
  showToast(data.message);
  addLog(data.message);
});

socket.on('nightResult', (data) => {
  if (data.deaths && data.deaths.length > 0) {
    data.deaths.forEach(d => {
      addLog(`${d.name} 死亡`, true);
      addChatMessage({ system: true, message: `${d.name} 死亡` });
    });
  } else {
    addLog('昨晚是平安夜');
    addChatMessage({ system: true, message: '昨晚是平安夜' });
  }
});

socket.on('voteResult', (data) => {
  const gameState = getState();
  gameState.voteResult = data;
  setState(gameState);
  if (data.eliminatedPlayer) {
    addLog(`${data.eliminatedPlayer.name} 被投票放逐`, true);
    addChatMessage({ system: true, message: `${data.eliminatedPlayer.name} 被投票放逐` });
  } else {
    addLog('投票平票，无人被放逐');
    addChatMessage({ system: true, message: '投票平票，无人被放逐' });
  }
  updateUI();
});

socket.on('hunterShot', (data) => {
  addLog(`猎人开枪带走了 ${data.name}`, true);
  addChatMessage({ system: true, message: `猎人开枪带走了 ${data.name}` });
  showToast(`猎人开枪带走了 ${data.name}`);
});

socket.on('whiteWolfExploded', (data) => {
  addLog(`白狼王 ${data.whiteWolf.name} 自爆带走了 ${data.target.name}`, true);
  addChatMessage({ system: true, message: `白狼王 ${data.whiteWolf.name} 自爆带走了 ${data.target.name}` });
  showToast(`白狼王自爆带走了 ${data.target.name}`);
});

socket.on('knightDueled', (data) => {
  if (data.duelSuccess) {
    addLog(`骑士 ${data.knight.name} 决斗成功，${data.target.name} 是狼人！`, true);
    addChatMessage({ system: true, message: `骑士 ${data.knight.name} 决斗成功！${data.target.name} 是狼人，直接出局！` });
    showToast(`决斗成功！${data.target.name} 是狼人`);
  } else {
    addLog(`骑士 ${data.knight.name} 决斗失败，${data.target.name} 是好人`, true);
    addChatMessage({ system: true, message: `骑士 ${data.knight.name} 决斗失败，${data.target.name} 是好人，骑士出局！` });
    showToast(`决斗失败，骑士出局`);
  }
});

socket.on('gameOver', (data) => {
  const winnerText = data.winner === 'werewolf' ? '狼人阵营' : '好人阵营';
  addLog(`游戏结束！${winnerText}胜利！`, true);
  addChatMessage({ system: true, message: `游戏结束！${winnerText}胜利！` });
  clearSession();
  let gameState = getState();
  if (gameState) {
    gameState.phase = 'game_over';
    gameState.winner = data.winner;
    gameState.finalPlayers = data.players;
    gameState.players = gameState.players.map(p => {
      const finalPlayer = data.players.find(fp => fp.id === p.id);
      if (finalPlayer) {
        return { ...p, role: finalPlayer.role, alive: finalPlayer.alive };
      }
      return p;
    });
    setState(gameState);
    updateUI();
  }
});

socket.on('gameReset', () => {
  addLog('游戏已重置', true);
  addChatMessage({ system: true, message: '游戏已重置' });
  document.getElementById('leaveGameRoomBtn').style.display = 'none';
  showScreen('waitingRoom');
});

socket.on('timerUpdate', (data) => {
  const timerValue = document.getElementById('timerValue');
  if (timerValue) {
    timerValue.textContent = data.timeLeft;
  }
});

socket.on('chat', (data) => {
  addChatMessage(data);
});

socket.on('werewolfChat', (data) => {
  addWerewolfChatMessage(data);
});

socket.on('werewolfDiscussTimer', (data) => {
  const timerValue = document.getElementById('werewolfTimerValue');
  if (timerValue) {
    timerValue.textContent = data.timeLeft;
  }
});

socket.on('error', (data) => {
  showToast(data.message);
});

socket.on('connect', () => {
  console.log('已连接到服务器');
});

socket.on('disconnect', () => {
  console.log('与服务器断开连接');
  showToast('连接断开，正在重连...');
});

socket.on('reconnect', (attemptNumber) => {
  console.log('重连成功', attemptNumber);
  const roomId = getRoomId();
  const playerName = getPlayerName();
  if (roomId && playerName && !isReconnectAttempted()) {
    setReconnectAttempted(true);
    socket.emit('joinRoom', { 
      roomId: roomId, 
      playerName: playerName 
    });
  }
});

socket.on('reconnect_error', (error) => {
  console.log('重连失败', error);
});

socket.on('reconnect_failed', () => {
  console.log('重连失败，请刷新页面');
  showToast('重连失败，请刷新页面');
});

const roomId = getRoomId();
const playerName = getPlayerName();
if (roomId && playerName && !isReconnectAttempted()) {
  console.log('检测到保存的会话，尝试自动重连...', { roomId, playerName });
  setReconnectAttempted(true);
  
  if (socket.connected) {
    console.log('Socket already connected, sending joinRoom immediately');
    socket.emit('joinRoom', { 
      roomId: roomId, 
      playerName: playerName 
    });
  } else {
    socket.on('connect', function autoReconnect() {
      console.log('Socket connected, sending joinRoom');
      socket.emit('joinRoom', { 
        roomId: roomId, 
        playerName: playerName 
      });
      socket.off('connect', autoReconnect);
    });
  }
}
