import { ROLE_NAMES, ROLE_CAMP } from './config.js';
import { getState, getSelectedTarget, setSelectedTarget } from './state.js';
import { showToast, showModal, hideModal } from './ui.js';
import { getRoleIcon } from './players.js';
import socket from './socket.js';

function renderWerewolfDiscuss(container) {
  const gameState = getState();
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
  const gameState = getState();
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
      setSelectedTarget(btn.dataset.id);
      selectedName = btn.dataset.name;
      document.getElementById('confirmKillBtn').disabled = false;
      document.getElementById('confirmKillBtn').textContent = `确认击杀: ${selectedName}`;
    });
  });
  
  document.getElementById('confirmKillBtn').addEventListener('click', () => {
    const selectedTarget = getSelectedTarget();
    if (selectedTarget) {
      showToast(`已选择击杀 ${selectedName}`);
      socket.emit('nightAction', { targetId: selectedTarget });
      setSelectedTarget(null);
      document.getElementById('confirmKillBtn').textContent = '确认击杀';
      document.getElementById('confirmKillBtn').disabled = true;
    }
  });
}

function renderSeerAction(container) {
  const gameState = getState();
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
      setSelectedTarget(btn.dataset.id);
      selectedName = btn.dataset.name;
      document.getElementById('confirmCheckBtn').disabled = false;
      document.getElementById('confirmCheckBtn').textContent = `查验: ${selectedName}`;
    });
  });
  
  document.getElementById('confirmCheckBtn').addEventListener('click', () => {
    const selectedTarget = getSelectedTarget();
    if (selectedTarget) {
      showToast(`正在查验 ${selectedName}...`);
      socket.emit('nightAction', { targetId: selectedTarget });
      setSelectedTarget(null);
      document.getElementById('confirmCheckBtn').textContent = '确认查验';
      document.getElementById('confirmCheckBtn').disabled = true;
    }
  });
}

function renderGuardAction(container) {
  const gameState = getState();
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
      setSelectedTarget(btn.dataset.id);
      selectedName = btn.dataset.name;
      document.getElementById('confirmGuardBtn').disabled = false;
      document.getElementById('confirmGuardBtn').textContent = `守护: ${selectedName}`;
    });
  });
  
  document.getElementById('confirmGuardBtn').addEventListener('click', () => {
    const selectedTarget = getSelectedTarget();
    if (selectedTarget) {
      showToast(`已选择守护 ${selectedName}`);
      socket.emit('nightAction', { targetId: selectedTarget });
      setSelectedTarget(null);
      document.getElementById('confirmGuardBtn').textContent = '确认守护';
      document.getElementById('confirmGuardBtn').disabled = true;
    }
  });
  
  document.getElementById('skipGuardBtn').addEventListener('click', () => {
    showToast('选择空守');
    socket.emit('nightAction', { targetId: null });
    setSelectedTarget(null);
  });
}

function renderWitchAction(container) {
  const gameState = getState();
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
          setSelectedTarget(btn.dataset.id);
          selectedName = btn.dataset.name;
          document.getElementById('confirmPoisonBtn').disabled = false;
          document.getElementById('confirmPoisonBtn').textContent = `毒杀: ${selectedName}`;
        });
      });
      
      document.getElementById('confirmPoisonBtn').addEventListener('click', () => {
        const selectedTarget = getSelectedTarget();
        if (selectedTarget) {
          showToast(`使用毒药毒杀 ${selectedName}`);
          socket.emit('nightAction', { action: 'poison', targetId: selectedTarget });
          setSelectedTarget(null);
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
  const gameState = getState();
  const alivePlayers = gameState.players.filter(p => p.alive && !p.idiotRevealed);
  
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
      setSelectedTarget(btn.dataset.id);
      selectedName = btn.dataset.name;
      document.getElementById('confirmVoteBtn').disabled = false;
      document.getElementById('confirmVoteBtn').textContent = `投票: ${selectedName}`;
    });
  });
  
  document.getElementById('confirmVoteBtn').addEventListener('click', () => {
    const selectedTarget = getSelectedTarget();
    if (selectedTarget) {
      showToast(`已投票给 ${selectedName}`);
      socket.emit('vote', { targetId: selectedTarget });
      setSelectedTarget(null);
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
  const gameState = getState();
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
  
  if (voteResult.idiotRevealed) {
    html += `
      </div>
      <div class="idiot-reveal-announcement">
        <span class="name">${voteResult.idiotPlayer.name}</span> 🤪 翻牌亮明白痴身份，免于放逐！
      </div>
      <p class="action-description">白痴失去投票权与被投票权，即将进入黑夜...</p>
    `;
  } else if (voteResult.tie) {
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
  const gameState = getState();
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
      setSelectedTarget(btn.dataset.id);
      selectedName = btn.dataset.name;
      document.getElementById('confirmShootBtn').disabled = false;
      document.getElementById('confirmShootBtn').textContent = `开枪: ${selectedName}`;
    });
  });
  
  document.getElementById('confirmShootBtn').addEventListener('click', () => {
    const selectedTarget = getSelectedTarget();
    if (selectedTarget) {
      showToast(`开枪带走 ${selectedName}`);
      socket.emit('hunterShoot', { targetId: selectedTarget });
      setSelectedTarget(null);
    }
  });
  
  document.getElementById('skipShootBtn').addEventListener('click', () => {
    showToast('选择不开枪');
    socket.emit('hunterShoot', { skip: true });
  });
}

function renderGameOver(container) {
  const gameState = getState();
  const winner = gameState.winner;
  const winnerText = winner === 'werewolf' ? '🐺 狼人阵营胜利！' : '👥 好人阵营胜利！';
  
  const players = gameState.finalPlayers || gameState.players || [];
  
  const werewolfPlayers = players.filter(p => p && ROLE_CAMP[p.role] === 'werewolf');
  const goodPlayers = players.filter(p => p && ROLE_CAMP[p.role] === 'good');
  
  let html = `
    <div class="game-over-panel">
      <div class="winner-announcement ${winner}">
        ${winnerText}
      </div>
      <div class="role-reveal">
        <div class="camp-section">
          <div class="camp-title werewolf-camp">🐺 狼人阵营</div>
          <div class="camp-players">
            ${werewolfPlayers.length > 0 ? werewolfPlayers.map(player => `
              <div class="role-reveal-item ${player.alive ? '' : 'dead'}">
                <div class="name">${player.name} ${!player.alive ? '💀' : ''}</div>
                <div class="role">${ROLE_NAMES[player.role] || player.role}</div>
              </div>
            `).join('') : '<div class="no-players">无</div>'}
          </div>
        </div>
        <div class="camp-section">
          <div class="camp-title good-camp">👥 好人阵营</div>
          <div class="camp-players">
            ${goodPlayers.length > 0 ? goodPlayers.map(player => `
              <div class="role-reveal-item ${player.alive ? '' : 'dead'}">
                <div class="name">${player.name} ${!player.alive ? '💀' : ''}</div>
                <div class="role">${ROLE_NAMES[player.role] || player.role}</div>
              </div>
            `).join('') : '<div class="no-players">无</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = html;
}

function updateActionPanel() {
  const gameState = getState();
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
      if ((gameState.myRole === 'werewolf' || gameState.myRole === 'white_wolf') && gameState.isAlive) {
        renderWerewolfDiscuss(actionContent);
      } else {
        actionContent.innerHTML = `
          <div class="action-title">🐺 狼人请睁眼</div>
          <p class="action-description">狼人正在商讨...</p>
        `;
      }
      break;
      
    case 'night_werewolf':
      if ((gameState.myRole === 'werewolf' || gameState.myRole === 'white_wolf') && gameState.isAlive) {
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
      let discussionExtra = '';
      if (gameState.canExplode) {
        discussionExtra += `<button id="whiteWolfExplodeBtn" class="btn btn-danger btn-small" style="margin-top: 10px;">💥 自爆带人</button>`;
      }
      if (gameState.canDuel) {
        discussionExtra += `<button id="knightDuelBtn" class="btn btn-primary btn-small" style="margin-top: 10px;">⚔️ 发动决斗</button>`;
      }
      actionContent.innerHTML = `
        <div class="action-title">💬 发言阶段</div>
        <p class="action-description">请自由发言讨论</p>
        <div class="timer-display" id="timerDisplay">⏱️ <span id="timerValue">60</span>秒</div>
        <div class="special-actions">${discussionExtra}</div>
      `;
      
      if (gameState.canExplode) {
        document.getElementById('whiteWolfExplodeBtn').addEventListener('click', () => {
          showWhiteWolfExplodeModal();
        });
      }
      if (gameState.canDuel) {
        document.getElementById('knightDuelBtn').addEventListener('click', () => {
          showKnightDuelModal();
        });
      }
      break;
      
    case 'vote':
      if (gameState.isAlive && !gameState.idiotRevealed) {
        renderVoteAction(actionContent);
      } else if (gameState.idiotRevealed) {
        actionContent.innerHTML = `
          <div class="action-title">🗳️ 投票阶段</div>
          <p class="action-description">你已翻牌，无法投票</p>
          <div class="timer-display">⏱️ <span id="timerValue">30</span>秒</div>
        `;
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

function showWhiteWolfExplodeModal() {
  const gameState = getState();
  const alivePlayers = gameState.players.filter(p => p.alive && p.id !== socket.id);
  
  const content = `
    <div class="modal-target-list">
      <p style="margin-bottom: 15px; color: #fbbf24;">⚠️ 自爆后你将死亡，并带走一名玩家</p>
      <div class="target-list">
        ${alivePlayers.map(p => `
          <button class="target-btn explode-target" data-id="${p.id}" data-name="${p.name}">
            ${p.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  showModal('💥 白狼王自爆', content, [
    { text: '取消', class: 'btn-secondary' }
  ], true);
  
  setTimeout(() => {
    document.querySelectorAll('.explode-target').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.id;
        const targetName = btn.dataset.name;
        hideModal();
        showModal('确认自爆', `确定要自爆并带走 ${targetName} 吗？`, [
          { text: '取消', class: 'btn-secondary' },
          { text: '确认自爆', class: 'btn-danger', callback: () => {
            socket.emit('whiteWolfExplode', { targetId });
          }}
        ]);
      });
    });
  }, 100);
}

function showKnightDuelModal() {
  const gameState = getState();
  const alivePlayers = gameState.players.filter(p => p.alive && p.id !== socket.id);
  
  const content = `
    <div class="modal-target-list">
      <p style="margin-bottom: 15px; color: #4ade80;">⚔️ 决斗技能整局只能发动一次！</p>
      <p style="margin-bottom: 15px; color: #aaa; font-size: 0.9rem;">目标是狼人：狼人出局，直接进黑夜<br>目标是好人：骑士出局，继续发言投票</p>
      <div class="target-list">
        ${alivePlayers.map(p => `
          <button class="target-btn duel-target" data-id="${p.id}" data-name="${p.name}">
            ${p.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  showModal('⚔️ 骑士决斗', content, [
    { text: '取消', class: 'btn-secondary' }
  ], true);
  
  setTimeout(() => {
    document.querySelectorAll('.duel-target').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.id;
        const targetName = btn.dataset.name;
        hideModal();
        showModal('确认决斗', `确定要对 ${targetName} 发动决斗吗？`, [
          { text: '取消', class: 'btn-secondary' },
          { text: '确认决斗', class: 'btn-primary', callback: () => {
            socket.emit('knightDuel', { targetId });
          }}
        ]);
      });
    });
  }, 100);
}

export {
  renderWerewolfDiscuss,
  sendWerewolfChat,
  addWerewolfChatMessage,
  renderWerewolfAction,
  renderSeerAction,
  renderGuardAction,
  renderWitchAction,
  renderVoteAction,
  renderVoteResult,
  renderHunterAction,
  renderGameOver,
  updateActionPanel,
  showWhiteWolfExplodeModal,
  showKnightDuelModal
};
