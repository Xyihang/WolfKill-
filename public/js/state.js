import { STORAGE_KEYS } from './config.js';

let currentRoomId = sessionStorage.getItem(STORAGE_KEYS.ROOM_ID) || null;
let currentPlayerName = sessionStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || null;
let gameState = null;
let selectedTarget = null;
let reconnectAttempted = false;

function saveSession() {
  if (currentRoomId) sessionStorage.setItem(STORAGE_KEYS.ROOM_ID, currentRoomId);
  if (currentPlayerName) {
    sessionStorage.setItem(STORAGE_KEYS.PLAYER_NAME, currentPlayerName);
    console.log('Session saved:', { currentRoomId, currentPlayerName });
  }
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEYS.ROOM_ID);
  sessionStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
  currentRoomId = null;
  currentPlayerName = null;
}

function getState() {
  return gameState;
}

function setState(state) {
  gameState = state;
}

function getRoomId() {
  return currentRoomId;
}

function setRoomId(roomId) {
  currentRoomId = roomId;
}

function getPlayerName() {
  return currentPlayerName;
}

function setPlayerName(name) {
  currentPlayerName = name;
}

function getSelectedTarget() {
  return selectedTarget;
}

function setSelectedTarget(target) {
  selectedTarget = target;
}

function isReconnectAttempted() {
  return reconnectAttempted;
}

function setReconnectAttempted(value) {
  reconnectAttempted = value;
}

export {
  saveSession,
  clearSession,
  getState,
  setState,
  getRoomId,
  setRoomId,
  getPlayerName,
  setPlayerName,
  getSelectedTarget,
  setSelectedTarget,
  isReconnectAttempted,
  setReconnectAttempted
};
