/**
 * 局域网狼人杀游戏 - 客户端逻辑
 * Made by Xyihang and GLM-5 / 由 Xyihang 和 GLM-5 制作
 */
const socket = io({
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

let currentRoomId = sessionStorage.getItem('lrs_roomId') || null;
let currentPlayerName = sessionStorage.getItem('lrs_playerName') || null;
let reconnectAttempted = false;
console.log('Page load, session from sessionStorage:', { currentRoomId, currentPlayerName });
let gameState = null;
let selectedTarget = null;

function saveSession() {
  if (currentRoomId) sessionStorage.setItem('lrs_roomId', currentRoomId);
  if (currentPlayerName) {
    sessionStorage.setItem('lrs_playerName', currentPlayerName);
    console.log('Session saved:', { currentRoomId, currentPlayerName });
  }
}

function clearSession() {
  sessionStorage.removeItem('lrs_roomId');
  sessionStorage.removeItem('lrs_playerName');
  currentRoomId = null;
  currentPlayerName = null;
}

const screens = {
  lobby: document.getElementById('lobby'),
  waitingRoom: document.getElementById('waitingRoom'),
  gameRoom: document.getElementById('gameRoom')
};

function showScreen(screenName) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenName].classList.add('active');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showModal(title, message, actions = []) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const modalActions = document.getElementById('modalActions');
  
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalActions.innerHTML = '';
  
  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.className = `btn ${action.class || 'btn-primary'}`;
    btn.textContent = action.text;
    btn.onclick = () => {
      modal.classList.remove('active');
      if (action.callback) action.callback();
    };
    modalActions.appendChild(btn);
  });
  
  modal.classList.add('active');
}

function hideModal() {
  document.getElementById('modal').classList.remove('active');
}

function addLog(message, important = false) {
  const logContent = document.getElementById('gameLog');
  const logItem = document.createElement('div');
  logItem.className = `log-item${important ? ' important' : ''}`;
  logItem.textContent = message;
  logContent.appendChild(logItem);
  logContent.scrollTop = logContent.scrollHeight;
}

function addChatMessage(data) {
  const chatMessages = document.getElementById('chatMessages');
  const messageEl = document.createElement('div');
  messageEl.className = 'chat-message';
  
  if (data.system) {
    messageEl.classList.add('system');
    messageEl.innerHTML = `<span class="text">${data.message}</span>`;
  } else {
    messageEl.innerHTML = `<span class="sender">${data.playerName}:</span><span class="text">${data.message}</span>`;
  }
  
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updatePlayersList() {
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
      const roleIcon = getRoleIcon(player.role);
      
      playerItem.innerHTML = `
        <span class="player-status-icon">${statusIcon}</span>
        <span class="player-name">${player.name}${player.id === socket.id ? ' (我)' : ''}${player.disconnected ? ' (断线)' : ''}</span>
        ${gameState.phase === 'game_over' && player.role ? `<span class="role-icon">${roleIcon}</span>` : ''}
      `;
      
      gamePlayersList.appendChild(playerItem);
    });
  }
}

function getRoleIcon(role) {
  const icons = {
    werewolf: '🐺',
    villager: '👤',
    seer: '👁️',
    witch: '🧙',
    hunter: '🎯',
    guard: '🛡️'
  };
  return icons[role] || '❓';
}

function updateRoleCard() {
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
  } else {
    roleIcon.textContent = '❓';
    roleName.textContent = '???';
    roleStatus.textContent = '等待分配';
    roleDescription.textContent = '游戏开始后将获得身份';
    roleExtra.innerHTML = '';
  }
}

function updatePhaseInfo() {
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

function updateActionPanel() {
  if (!gameState) return;
  
  const actionContent = document.getElementById('actionContent');
  const resetGameBtn = document.getElementById('resetGameBtn');
  
  resetGameBtn.style.display = 'none';
  
  switch (gameState.phase) {
    case 'waiting':
      actionContent.innerHTML = '<p class="waiting-text">等待游戏开始...</p>';
      break;
      
    case 'night':
      actionContent.innerHTML = `
        <div class="action-title">🌙 天黑请闭眼</div>
        <p class="action-description">夜幕降临，请等待...</p>
      `;
      break;
      
    case 'night_werewolf_discuss':
      if (gameState.myRole === 'werewolf' && gameState.isAlive) {
        renderWerewolfDiscuss(actionContent);
      } else {
        actionContent.innerHTML = `
          <div class="action-title">🐺 狼人请睁眼</div>
          <p class="action-description">狼人正在商讨...</p>
        `;
      }
      break;
      
    case 'night_werewolf':
      if (gameState.myRole === 'werewolf' && gameState.isAlive) {
        renderWerewolfAction(actionContent);
      } else {
        actionContent.innerHTML = `
          <div class="action-title">🐺 狼人请睁眼</div>
          <p class="action-description">狼人正在选择目标...</p>
        `;
      }
      break;
      
    case 'night_guard':
      if (gameState.myRole === 'guard' && gameState.isAlive) {
        renderGuardAction(actionContent);
      } else {
        actionContent.innerHTML = `
          <div class="action-title">🛡️ 守卫请睁眼</div>
          <p class="action-description">守卫正在选择守护目标...</p>
        `;
      }
      break;
      
    case 'night_seer':
      if (gameState.myRole === 'seer' && gameState.isAlive) {
        renderSeerAction(actionContent);
      } else {
        actionContent.innerHTML = `
          <div class="action-title">👁️ 预言家请睁眼</div>
          <p class="action-description">预言家正在查验身份...</p>
        `;
      }
      break;
      
    case 'night_witch':
      if (gameState.myRole === 'witch' && gameState.isAlive) {
        renderWitchAction(actionContent);
      } else {
        actionContent.innerHTML = `
          <div class="action-title">🧙 女巫请睁眼</div>
          <p class="action-description">女巫正在决定...</p>
        `;
      }
      break;
      
    case 'day':
      let deathHtml = '';
      if (gameState.lastNightDeaths && gameState.lastNightDeaths.length > 0) {
        deathHtml = gameState.lastNightDeaths.map(d => `
          <div class="death-announcement">
            <span class="name">${d.name}</span> 死亡
          </div>
        `).join('');
      } else {
        deathHtml = '<p>昨晚是平安夜，无人死亡</p>';
      }
      
      actionContent.innerHTML = `
        <div class="action-title">☀️ 天亮了</div>
        ${deathHtml}
      `;
      break;
      
    case 'discussion':
      actionContent.innerHTML = `
        <div class="action-title">💬 发言阶段</div>
        <p class="action-description">请自由发言讨论</p>
        <div class="timer-display" id="timerDisplay">⏱️ <span id="timerValue">60</span>秒</div>
      `;
      break;
      
    case 'vote':
      if (gameState.isAlive) {
        renderVoteAction(actionContent);
      } else {
        actionContent.innerHTML = `
          <div class="action-title">🗳️ 投票阶段</div>
          <p class="action-description">你已死亡，无法投票</p>
          <div class="timer-display">⏱️ <span id="timerValue">30</span>秒</div>
        `;
      }
      break;
      
    case 'vote_result':
      renderVoteResult(actionContent);
      break;
      
    case 'hunter_shoot':
      if (gameState.canShoot) {
        renderHunterAction(actionContent);
      } else {
        actionContent.innerHTML = `
          <div class="action-title">🎯 猎人开枪</div>
          <p class="action-description">猎人正在决定...</p>
        `;
      }
      break;
      
    case 'game_over':
      renderGameOver(actionContent);
      if (gameState.isHost) resetGameBtn.style.display = 'inline-block';
      document.getElementById('leaveGameRoomBtn').style.display = 'inline-block';
      break;
  }
}

function renderWerewolfDiscuss(container) {
  const werewolfTeammates = gameState.werewolfTeammates || [];
  
  container.innerHTML = `
    <div class="action-title">🐺 狼人商讨</div>
    <p class="action-description">与队友商讨击杀目标</p>
    <div class="werewolf-info">
      <p>你的狼人队友：${werewolfTeammates.length > 0 ? werewolfTeammates.map(w => w.name).join('、') : '无'}</p>
    </div>
    <div class="timer-display">⏱️ <span id="werewolfTimerValue">${gameState.werewolfDiscussTime || 30}</span>秒</div>
    <div class="werewolf-chat-panel">
      <div id="werewolfChatMessages" class="werewolf-chat-messages"></div>
      <div class="werewolf-chat-input">
        <input type="text" id="werewolfChatInput" placeholder="输入消息与队友交流..." />
        <button id="sendWerewolfChatBtn" class="btn btn-primary btn-small">发送</button>
      </div>
    </div>
  `;
  
  document.getElementById('sendWerewolfChatBtn').addEventListener('click', sendWerewolfChat);
  document.getElementById('werewolfChatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendWerewolfChat();
  });
}

function sendWerewolfChat() {
  const input = document.getElementById('werewolfChatInput');
  const message = input.value.trim();
  if (message) {
    socket.emit('werewolfChat', message);
    input.value = '';
  }
}

function addWerewolfChatMessage(data) {
  const container = document.getElementById('werewolfChatMessages');
  if (!container) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = 'werewolf-chat-message';
  msgDiv.innerHTML = `<span class="name">${data.playerName}:</span> ${data.message}`;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function renderWerewolfAction(container) {
  const alivePlayers = gameState.players.filter(p => p.alive);
  
  container.innerHTML = `
    <div class="action-title">🐺 选择击杀目标</div>
    <p class="action-description">选择一名玩家进行击杀（可自刀/刀队友）</p>
    <div class="target-list">
      ${alivePlayers.map(p => `
        <button class="target-btn" data-id="${p.id}" data-name="${p.name}">
          ${p.name}${p.id === socket.id ? ' (自己)' : ''}
        </button>
      `).join('')}
    </div>
    <div class="action-buttons">
      <button id="confirmKillBtn" class="btn btn-primary" disabled>确认击杀</button>
    </div>
  `;
  
  let selectedName = '';
  container.querySelectorAll('.target-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.target-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTarget = btn.dataset.id;
      selectedName = btn.dataset.name;
      document.getElementById('confirmKillBtn').disabled = false;
      document.getElementById('confirmKillBtn').textContent = `确认击杀: ${selectedName}`;
    });
  });
  
  document.getElementById('confirmKillBtn').addEventListener('click', () => {
    if (selectedTarget) {
      showToast(`已选择击杀 ${selectedName}`);
      socket.emit('nightAction', { targetId: selectedTarget });
      selectedTarget = null;
      document.getElementById('confirmKillBtn').textContent = '确认击杀';
      document.getElementById('confirmKillBtn').disabled = true;
    }
  });
}

function renderSeerAction(container) {
  const alivePlayers = gameState.players.filter(p => p.alive && p.id !== socket.id);
  
  container.innerHTML = `
    <div class="action-title">👁️ 选择查验目标</div>
    <p class="action-description">选择一名玩家查验其身份</p>
    <div class="target-list">
      ${alivePlayers.map(p => `
        <button class="target-btn" data-id="${p.id}" data-name="${p.name}">
          ${p.name}
        </button>
      `).join('')}
    </div>
    <div class="action-buttons">
      <button id="confirmCheckBtn" class="btn btn-primary" disabled>确认查验</button>
    </div>
  `;
  
  let selectedName = '';
  container.querySelectorAll('.target-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.target-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTarget = btn.dataset.id;
      selectedName = btn.dataset.name;
      document.getElementById('confirmCheckBtn').disabled = false;
      document.getElementById('confirmCheckBtn').textContent = `查验: ${selectedName}`;
    });
  });
  
  document.getElementById('confirmCheckBtn').addEventListener('click', () => {
    if (selectedTarget) {
      showToast(`正在查验 ${selectedName}...`);
      socket.emit('nightAction', { targetId: selectedTarget });
      selectedTarget = null;
      document.getElementById('confirmCheckBtn').textContent = '确认查验';
      document.getElementById('confirmCheckBtn').disabled = true;
    }
  });
}

function renderGuardAction(container) {
  const guardInfo = gameState.guardInfo || {};
  const alivePlayers = gameState.players.filter(p => p.alive);
  const lastGuardedId = guardInfo.lastGuardedPlayer;
  
  let warningHtml = '';
  if (lastGuardedId) {
    const lastGuardedPlayer = alivePlayers.find(p => p.id === lastGuardedId);
    if (lastGuardedPlayer) {
      warningHtml = `<p class="guard-warning">⚠️ 上回合守护了 <strong>${lastGuardedPlayer.name}</strong>，本回合不能守护同一人</p>`;
    }
  }
  
  const targetablePlayers = alivePlayers.filter(p => p.id !== lastGuardedId);
  
  container.innerHTML = `
    <div class="action-title">🛡️ 守卫行动</div>
    <p class="action-description">选择一名玩家进行守护（可守自己）</p>
    ${warningHtml}
    <div class="target-list">
      ${targetablePlayers.map(p => `
        <button class="target-btn" data-id="${p.id}" data-name="${p.name}">
          ${p.name}${p.id === socket.id ? ' (自己)' : ''}
        </button>
      `).join('')}
    </div>
    <div class="action-buttons">
      <button id="confirmGuardBtn" class="btn btn-primary" disabled>确认守护</button>
      <button id="skipGuardBtn" class="btn btn-secondary">空守</button>
    </div>
  `;
  
  let selectedName = '';
  container.querySelectorAll('.target-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.target-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTarget = btn.dataset.id;
      selectedName = btn.dataset.name;
      document.getElementById('confirmGuardBtn').disabled = false;
      document.getElementById('confirmGuardBtn').textContent = `守护: ${selectedName}`;
    });
  });
  
  document.getElementById('confirmGuardBtn').addEventListener('click', () => {
    if (selectedTarget) {
      showToast(`已选择守护 ${selectedName}`);
      socket.emit('nightAction', { targetId: selectedTarget });
      selectedTarget = null;
      document.getElementById('confirmGuardBtn').textContent = '确认守护';
      document.getElementById('confirmGuardBtn').disabled = true;
    }
  });
  
  document.getElementById('skipGuardBtn').addEventListener('click', () => {
    showToast('选择空守');
    socket.emit('nightAction', { targetId: null });
    selectedTarget = null;
  });
}

function renderWitchAction(container) {
  const witchInfo = gameState.witchInfo;
  const alivePlayers = gameState.players.filter(p => p.alive && p.id !== socket.id);
  
  let html = `
    <div class="action-title">🧙 女巫行动</div>
    <div class="witch-panel">
  `;
  
  if (witchInfo.killedName) {
    html += `
      <div class="witch-info">
        <p>今晚 <strong>${witchInfo.killedName}</strong> 被狼人杀害</p>
      </div>
    `;
  } else {
    html += `
      <div class="witch-info">
        <p>今晚无人被杀</p>
      </div>
    `;
  }
  
  html += `<div class="witch-potions">`;
  
  if (witchInfo.hasAntidote && witchInfo.killedName) {
    html += `
      <button class="potion-btn save" id="useAntidoteBtn">
        💚 使用解药救人
      </button>
    `;
  }
  
  if (witchInfo.hasPoison) {
    html += `
      <button class="potion-btn poison" id="usePoisonBtn">
        💜 使用毒药
      </button>
    `;
  }
  
  html += `
      <button class="btn btn-secondary" id="skipWitchBtn">跳过</button>
    </div>
  </div>
  `;
  
  container.innerHTML = html;
  
  const antidoteBtn = document.getElementById('useAntidoteBtn');
  if (antidoteBtn) {
    antidoteBtn.addEventListener('click', () => {
      showToast(`使用解药救了 ${witchInfo.killedName}`);
      socket.emit('nightAction', { action: 'save' });
    });
  }
  
  const poisonBtn = document.getElementById('usePoisonBtn');
  if (poisonBtn) {
    poisonBtn.addEventListener('click', () => {
      const poisonTargets = alivePlayers.filter(p => p.id !== socket.id);
      container.innerHTML = `
        <div class="action-title">🧙 选择毒杀目标</div>
        <p class="action-description">选择一名玩家使用毒药</p>
        <div class="target-list">
          ${poisonTargets.map(p => `
            <button class="target-btn" data-id="${p.id}" data-name="${p.name}">
              ${p.name}
            </button>
          `).join('')}
        </div>
        <div class="action-buttons">
          <button id="cancelPoisonBtn" class="btn btn-secondary">取消</button>
          <button id="confirmPoisonBtn" class="btn btn-primary" disabled>确认毒杀</button>
        </div>
      `;
      
      let selectedName = '';
      container.querySelectorAll('.target-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.target-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedTarget = btn.dataset.id;
          selectedName = btn.dataset.name;
          document.getElementById('confirmPoisonBtn').disabled = false;
          document.getElementById('confirmPoisonBtn').textContent = `毒杀: ${selectedName}`;
        });
      });
      
      document.getElementById('confirmPoisonBtn').addEventListener('click', () => {
        if (selectedTarget) {
          showToast(`使用毒药毒杀 ${selectedName}`);
          socket.emit('nightAction', { action: 'poison', targetId: selectedTarget });
          selectedTarget = null;
        }
      });
      
      document.getElementById('cancelPoisonBtn').addEventListener('click', () => {
        renderWitchAction(container);
      });
    });
  }
  
  document.getElementById('skipWitchBtn').addEventListener('click', () => {
    showToast('跳过女巫行动');
    socket.emit('nightAction', { action: 'skip' });
  });
}

function renderVoteAction(container) {
  const alivePlayers = gameState.players.filter(p => p.alive);
  
  container.innerHTML = `
    <div class="action-title">🗳️ 投票阶段</div>
    <p class="action-description">点击选择要放逐的玩家</p>
    <div class="timer-display">⏱️ <span id="timerValue">30</span>秒</div>
    <div class="target-list compact-vote">
      ${alivePlayers.map(p => `
        <button class="target-btn vote-btn ${p.id === socket.id ? 'self-vote' : ''}" data-id="${p.id}" data-name="${p.name}">
          <span class="vote-name">${p.name}</span>
          ${p.id === socket.id ? '<span class="vote-self-tag">自己</span>' : ''}
        </button>
      `).join('')}
    </div>
    <div class="action-buttons">
      <button id="skipVoteBtn" class="btn btn-secondary">弃票</button>
      <button id="confirmVoteBtn" class="btn btn-primary" disabled>确认投票</button>
    </div>
  `;
  
  let selectedName = '';
  container.querySelectorAll('.target-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.target-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTarget = btn.dataset.id;
      selectedName = btn.dataset.name;
      document.getElementById('confirmVoteBtn').disabled = false;
      document.getElementById('confirmVoteBtn').textContent = `投票: ${selectedName}`;
    });
  });
  
  document.getElementById('confirmVoteBtn').addEventListener('click', () => {
    if (selectedTarget) {
      showToast(`已投票给 ${selectedName}`);
      socket.emit('vote', { targetId: selectedTarget });
      selectedTarget = null;
      container.querySelectorAll('.target-btn').forEach(b => b.classList.remove('selected'));
      document.getElementById('confirmVoteBtn').textContent = '确认投票';
      document.getElementById('confirmVoteBtn').disabled = true;
    }
  });
  
  document.getElementById('skipVoteBtn').addEventListener('click', () => {
    showToast('已选择弃票');
    socket.emit('vote', { targetId: 'skip' });
  });
}

function renderVoteResult(container) {
  const voteResult = gameState.voteResult || {};
  const voteCount = voteResult.voteCount || {};
  
  let html = `
    <div class="vote-result-panel">
      <div class="vote-result-title">投票结果</div>
      <div class="vote-list">
  `;
  
  Object.entries(voteCount).forEach(([playerId, count]) => {
    const player = gameState.players.find(p => p.id === playerId);
    if (player) {
      html += `
        <div class="vote-item">
          <span>${player.name}</span>
          <span class="vote-count">${count} 票</span>
        </div>
      `;
    }
  });
  
  if (voteResult.tie) {
    html += `
      </div>
      <p class="action-description">平票！无人被放逐</p>
    `;
  } else if (voteResult.eliminatedPlayer) {
    html += `
      </div>
      <div class="death-announcement">
        <span class="name">${voteResult.eliminatedPlayer.name}</span> 被放逐
      </div>
    `;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

function renderHunterAction(container) {
  const alivePlayers = gameState.players.filter(p => p.alive && p.id !== socket.id);
  
  container.innerHTML = `
    <div class="action-title">🎯 猎人开枪</div>
    <p class="action-description">你已死亡，可以开枪带走一名玩家</p>
    <div class="target-list">
      ${alivePlayers.map(p => `
        <button class="target-btn" data-id="${p.id}" data-name="${p.name}">
          ${p.name}
        </button>
      `).join('')}
    </div>
    <div class="action-buttons">
      <button id="skipShootBtn" class="btn btn-secondary">不开枪</button>
      <button id="confirmShootBtn" class="btn btn-primary" disabled>开枪</button>
    </div>
  `;
  
  let selectedName = '';
  container.querySelectorAll('.target-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.target-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTarget = btn.dataset.id;
      selectedName = btn.dataset.name;
      document.getElementById('confirmShootBtn').disabled = false;
      document.getElementById('confirmShootBtn').textContent = `开枪: ${selectedName}`;
    });
  });
  
  document.getElementById('confirmShootBtn').addEventListener('click', () => {
    if (selectedTarget) {
      showToast(`开枪带走 ${selectedName}`);
      socket.emit('hunterShoot', { targetId: selectedTarget });
      selectedTarget = null;
    }
  });
  
  document.getElementById('skipShootBtn').addEventListener('click', () => {
    showToast('选择不开枪');
    socket.emit('hunterShoot', { skip: true });
  });
}

function renderGameOver(container) {
  const winner = gameState.winner;
  const winnerText = winner === 'werewolf' ? '🐺 狼人阵营胜利！' : '👥 好人阵营胜利！';
  
  let html = `
    <div class="game-over-panel">
      <div class="winner-announcement ${winner}">
        ${winnerText}
      </div>
      <div class="role-reveal">
  `;
  
  gameState.players.forEach(player => {
    html += `
      <div class="role-reveal-item">
        <div class="name">${player.name}</div>
        <div class="role">${player.roleName || ''}</div>
      </div>
    `;
  });
  
  html += '</div></div>';
  container.innerHTML = html;
}

function updateUI() {
  updatePlayersList();
  updateRoleCard();
  updatePhaseInfo();
  updateActionPanel();
  updateStartButton();
  updateChatInput();
}

function updateChatInput() {
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

function updateStartButton() {
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
  navigator.clipboard.writeText(currentRoomId).then(() => {
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

function sendChat() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (message) {
    socket.emit('chat', message);
    input.value = '';
  }
}

socket.on('roomCreated', (data) => {
  console.log('roomCreated event:', data);
  currentRoomId = data.roomId;
  currentPlayerName = data.player.name;
  saveSession();
  document.getElementById('displayRoomId').textContent = data.roomId;
  document.getElementById('gameRoomId').textContent = data.roomId;
  gameState = data.gameState;
  showScreen('waitingRoom');
  updateUI();
  addLog(`你创建了房间 ${data.roomId}`);
});

socket.on('roomJoined', (data) => {
  console.log('roomJoined event:', data);
  currentRoomId = data.roomId;
  currentPlayerName = data.player.name;
  saveSession();
  document.getElementById('displayRoomId').textContent = data.roomId;
  document.getElementById('gameRoomId').textContent = data.roomId;
  gameState = data.gameState;
  showScreen('waitingRoom');
  updateUI();
  addLog(`你加入了房间 ${data.roomId}`);
});

socket.on('reconnected', (data) => {
  console.log('reconnected event received:', data);
  currentRoomId = data.roomId;
  currentPlayerName = data.player.name;
  saveSession();
  document.getElementById('displayRoomId').textContent = data.roomId;
  document.getElementById('gameRoomId').textContent = data.roomId;
  gameState = data.gameState;
  showScreen('gameRoom');
  updateUI();
  showToast('重连成功！');
  addLog('你已重新连接到游戏', true);
});

socket.on('gameStateUpdate', (state) => {
  gameState = state;
  if (currentPlayerName && state.players) {
    const me = state.players.find(p => p.name === currentPlayerName);
    if (me) {
      currentPlayerName = me.name;
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
  gameState = state;
  if (state.myRoleName && currentPlayerName) {
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
  gameState.voteResult = data;
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

socket.on('gameOver', (data) => {
  const winnerText = data.winner === 'werewolf' ? '狼人阵营' : '好人阵营';
  addLog(`游戏结束！${winnerText}胜利！`, true);
  addChatMessage({ system: true, message: `游戏结束！${winnerText}胜利！` });
  clearSession();
  if (gameState) {
    gameState.phase = 'game_over';
    gameState.winner = data.winner;
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
  if (currentRoomId && currentPlayerName && !reconnectAttempted) {
    reconnectAttempted = true;
    socket.emit('joinRoom', { 
      roomId: currentRoomId, 
      playerName: currentPlayerName 
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

if (currentRoomId && currentPlayerName && !reconnectAttempted) {
  console.log('检测到保存的会话，尝试自动重连...', { currentRoomId, currentPlayerName });
  reconnectAttempted = true;
  
  if (socket.connected) {
    console.log('Socket already connected, sending joinRoom immediately');
    socket.emit('joinRoom', { 
      roomId: currentRoomId, 
      playerName: currentPlayerName 
    });
  } else {
    socket.on('connect', function autoReconnect() {
      console.log('Socket connected, sending joinRoom');
      socket.emit('joinRoom', { 
        roomId: currentRoomId, 
        playerName: currentPlayerName 
      });
      socket.off('connect', autoReconnect);
    });
  }
}
