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

function showModal(title, message, actions = [], isHtml = false) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const modalActions = document.getElementById('modalActions');
  
  modalTitle.textContent = title;
  if (isHtml) {
    modalMessage.innerHTML = message;
  } else {
    modalMessage.textContent = message;
  }
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

export { showScreen, showToast, showModal, hideModal, addLog, addChatMessage };
