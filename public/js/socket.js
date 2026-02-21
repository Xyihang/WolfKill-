import { SOCKET_CONFIG } from './config.js';

const socket = io(SOCKET_CONFIG);

export default socket;
