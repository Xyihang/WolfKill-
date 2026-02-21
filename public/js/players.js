import { ROLE_ICONS, ROLE_NAMES, ROLE_CAMP } from './config.js';
import { getState } from './state.js';
import socket from './socket.js';

function getRoleIcon(role) {
  return ROLE_ICONS[role] || '❓';
}

function updatePlayersList() {
  const gameState = getState();
  if (!gameState) return;
  
  const playersList = document.getElementById('playersList');
  const gamePlayersList = document.getElementById('gamePlayersList');
  
  if (playersList) {
    playersList.innerHTML = '';
    gameState.players.forEach(player => {
      const playerItem = document.createElement('div');
      playerItem.className = 'player-item compact';
      if (player.isHost) playerItem.classList.add('host');
      if (player.id === socket.id) playerItem.classList.add('current');
      playerItem.style.position = 'relative';
      
      playerItem.innerHTML = `
        <div class="player-avatar">👤</div>
        <span class="player-name">${player.name}</span>
        ${player.isHost ? '<span class="player-badge">👑</span>' : ''}
      `;
      
      playersList.appendChild(playerItem);
    });
    
    document.getElementById('playerCount').textContent = gameState.players.length;
    
    const hostBadge = document.getElementById('hostBadge');
    const currentPlayer = gameState.players.find(p => p.id === socket.id);
    if (hostBadge && currentPlayer && currentPlayer.isHost) {
      hostBadge.style.display = 'block';
    } else if (hostBadge) {
      hostBadge.style.display = 'none';
    }
  }
  
  if (gamePlayersList) {
    gamePlayersList.innerHTML = '';
    gameState.players.forEach(player => {
      const playerItem = document.createElement('div');
      playerItem.className = 'game-player-item';
      if (!player.alive) playerItem.classList.add('dead');
      if (player.disconnected) playerItem.classList.add('disconnected');
      if (player.id === socket.id) playerItem.classList.add('current-player');
      if (gameState.myRole === 'werewolf' && player.role === 'werewolf') {
        playerItem.classList.add('werewolf');
      }
      
      let statusIcon = player.alive ? '💚' : '💀';
      if (player.disconnected) statusIcon = '⚠️';
      if (player.idiotRevealed) statusIcon = '🤪';
      const roleIcon = getRoleIcon(player.role);
      
      playerItem.innerHTML = `
        <span class="player-status-icon">${statusIcon}</span>
        <span class="player-name">${player.name}${player.id === socket.id ? ' (我)' : ''}${player.disconnected ? ' (断线)' : ''}${player.idiotRevealed ? ' (已翻牌)' : ''}</span>
        ${gameState.phase === 'game_over' && player.role ? `<span class="role-icon">${roleIcon}</span>` : ''}
      `;
      
      gamePlayersList.appendChild(playerItem);
    });
  }
}

function updateRoleCard() {
  const gameState = getState();
  if (!gameState) return;
  
  const roleIcon = document.getElementById('roleIcon');
  const roleName = document.getElementById('roleName');
  const roleStatus = document.getElementById('roleStatus');
  const roleDescription = document.getElementById('roleDescription');
  const roleExtra = document.getElementById('roleExtra');
  
  if (gameState.myRole) {
    roleIcon.textContent = getRoleIcon(gameState.myRole);
    roleName.textContent = gameState.myRoleName;
    roleStatus.textContent = gameState.isAlive ? '存活' : '已死亡';
    roleStatus.className = `role-status ${gameState.isAlive ? '' : 'dead'}`;
    roleDescription.textContent = gameState.myRoleDescription;
    
    roleExtra.innerHTML = '';
    
    if (gameState.werewolfTeammates && gameState.werewolfTeammates.length > 0) {
      const teammatesDiv = document.createElement('div');
      teammatesDiv.innerHTML = `<strong>你的狼队友：</strong>${gameState.werewolfTeammates.map(t => t.name).join('、')}`;
      roleExtra.appendChild(teammatesDiv);
    }
    
    if (gameState.witchPotions) {
      const potionsDiv = document.createElement('div');
      potionsDiv.innerHTML = `
        <div>解药: ${gameState.witchPotions.antidote ? '✅ 可用' : '❌ 已使用'}</div>
        <div>毒药: ${gameState.witchPotions.poison ? '✅ 可用' : '❌ 已使用'}</div>
      `;
      roleExtra.appendChild(potionsDiv);
    }
    
    if (gameState.seerResults && gameState.seerResults.length > 0) {
      const resultsDiv = document.createElement('div');
      resultsDiv.innerHTML = '<strong>查验记录：</strong><br>';
      gameState.seerResults.forEach(r => {
        resultsDiv.innerHTML += `${r.targetName}: ${r.isWerewolf ? '🐺 狼人' : '👤 好人'}<br>`;
      });
      roleExtra.appendChild(resultsDiv);
    }
    
    if (gameState.myRole === 'idiot') {
      const idiotDiv = document.createElement('div');
      idiotDiv.innerHTML = gameState.idiotRevealed 
        ? '🤪 已翻牌，无法投票' 
        : '翻牌后可免死，但失去投票权';
      roleExtra.appendChild(idiotDiv);
    }
    
    if (gameState.myRole === 'knight') {
      const knightDiv = document.createElement('div');
      knightDiv.innerHTML = gameState.knightDuelUsed 
        ? '⚔️ 决斗技能已使用' 
        : '⚔️ 决斗技能可用';
      roleExtra.appendChild(knightDiv);
    }
    
    if (gameState.myRole === 'white_wolf') {
      const whiteWolfDiv = document.createElement('div');
      whiteWolfDiv.innerHTML = gameState.canExplode 
        ? '💥 可在发言阶段自爆带人' 
        : '自爆技能已使用或不可用';
      roleExtra.appendChild(whiteWolfDiv);
    }
  } else {
    roleIcon.textContent = '❓';
    roleName.textContent = '???';
    roleStatus.textContent = '等待分配';
    roleDescription.textContent = '游戏开始后将获得身份';
    roleExtra.innerHTML = '';
  }
}

function updatePhaseInfo() {
  const gameState = getState();
  if (!gameState) return;
  
  const phaseName = document.getElementById('phaseName');
  const dayCount = document.getElementById('dayCount');
  
  phaseName.textContent = gameState.phaseName;
  
  if (gameState.day > 0) {
    dayCount.textContent = `第 ${gameState.day} 天`;
  } else {
    dayCount.textContent = '';
  }
}

function updateStartButton() {
  const gameState = getState();
  const startBtn = document.getElementById('startGameBtn');
  const startHint = document.getElementById('startHint');
  
  if (!startBtn || !gameState) return;
  
  const playerCount = gameState.players.length;
  const canStart = playerCount >= 5 && playerCount <= 10;
  const isHost = gameState.players.find(p => p.id === socket.id)?.isHost;
  
  startBtn.disabled = !canStart || !isHost;
  
  if (startHint) {
    if (playerCount < 5) {
      startHint.textContent = `还需要 ${5 - playerCount} 名玩家才能开始游戏`;
    } else if (playerCount > 10) {
      startHint.textContent = '玩家数量超出上限（最多10人）';
    } else {
      startHint.textContent = isHost ? '可以开始游戏了' : '等待房主开始游戏';
    }
  }
}

function updateChatInput() {
  const gameState = getState();
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatBtn');
  
  if (!chatInput || !gameState) return;
  
  const isDead = gameState.isAlive === false;
  const isGameOver = gameState.phase === 'game_over';
  const isNight = gameState.phase === 'night' || 
                  gameState.phase === 'night_werewolf' || 
                  gameState.phase === 'night_guard' || 
                  gameState.phase === 'night_seer' || 
                  gameState.phase === 'night_witch';
  const isWaiting = gameState.phase === 'waiting';
  
  if (isDead && !isGameOver) {
    chatInput.disabled = true;
    chatInput.placeholder = '你已死亡，无法发言';
    if (sendChatBtn) sendChatBtn.disabled = true;
  } else if (isNight) {
    chatInput.disabled = true;
    chatInput.placeholder = '夜间无法发言';
    if (sendChatBtn) sendChatBtn.disabled = true;
  } else {
    chatInput.disabled = false;
    chatInput.placeholder = '输入消息...';
    if (sendChatBtn) sendChatBtn.disabled = false;
  }
}

export { 
  getRoleIcon, 
  updatePlayersList, 
  updateRoleCard, 
  updatePhaseInfo, 
  updateStartButton,
  updateChatInput 
};
