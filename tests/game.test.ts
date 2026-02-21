import { Game, GAME_PHASES, ROLES } from '../src/game';
import { GAME_CONFIG } from '../src/constants';

describe('Game', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game('TEST01');
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(game.roomId).toBe('TEST01');
      expect(game.phase).toBe(GAME_PHASES.WAITING);
      expect(game.day).toBe(0);
      expect(game.players.size).toBe(0);
      expect(game.winner).toBeNull();
    });

    it('should initialize empty night actions', () => {
      expect(game.nightActions).toEqual({});
    });

    it('should initialize witch potions', () => {
      expect(game.witchPotions).toEqual({ antidote: true, poison: true });
    });
  });

  describe('addPlayer', () => {
    it('should add a player successfully', () => {
      const result = game.addPlayer('player1', 'TestPlayer');
      expect(result.success).toBe(true);
      expect(result.player).toBeDefined();
      expect(result.player?.name).toBe('TestPlayer');
      expect(result.player?.isHost).toBe(true);
    });

    it('should set first player as host', () => {
      const result1 = game.addPlayer('player1', 'Player1');
      expect(result1.player?.isHost).toBe(true);

      const result2 = game.addPlayer('player2', 'Player2');
      expect(result2.player?.isHost).toBe(false);
    });

    it('should not add player with duplicate name', () => {
      game.addPlayer('player1', 'TestPlayer');
      const result = game.addPlayer('player2', 'TestPlayer');
      expect(result.success).toBe(false);
      expect(result.message).toContain('已被使用');
    });

    it('should not exceed max players', () => {
      for (let i = 0; i < GAME_CONFIG.MAX_PLAYERS; i++) {
        game.addPlayer(`player${i}`, `Player${i}`);
      }
      const result = game.addPlayer('extra', 'ExtraPlayer');
      expect(result.success).toBe(false);
      expect(result.message).toContain('已满');
    });
  });

  describe('removePlayer', () => {
    it('should remove player successfully', () => {
      game.addPlayer('player1', 'Player1');
      game.addPlayer('player2', 'Player2');
      
      game.removePlayer('player1');
      expect(game.players.has('player1')).toBe(false);
      expect(game.players.size).toBe(1);
    });

    it('should transfer host when host leaves', () => {
      game.addPlayer('player1', 'Player1');
      game.addPlayer('player2', 'Player2');
      
      game.removePlayer('player1');
      const remainingPlayer = game.getPlayer('player2');
      expect(remainingPlayer?.isHost).toBe(true);
    });
  });

  describe('start', () => {
    it('should fail with insufficient players', () => {
      game.addPlayer('player1', 'Player1');
      const result = game.start();
      expect(result.success).toBe(false);
      expect(result.message).toContain('需要');
    });

    it('should succeed with minimum players', () => {
      for (let i = 0; i < GAME_CONFIG.MIN_PLAYERS; i++) {
        game.addPlayer(`player${i}`, `Player${i}`);
      }
      const result = game.start();
      expect(result.success).toBe(true);
    });

    it('should assign roles to all players', () => {
      for (let i = 0; i < GAME_CONFIG.MIN_PLAYERS; i++) {
        game.addPlayer(`player${i}`, `Player${i}`);
      }
      game.start();
      
      game.players.forEach(player => {
        expect(player.role).not.toBeNull();
      });
    });
  });

  describe('getPlayer', () => {
    it('should return player if exists', () => {
      game.addPlayer('player1', 'TestPlayer');
      const player = game.getPlayer('player1');
      expect(player).toBeDefined();
      expect(player?.name).toBe('TestPlayer');
    });

    it('should return undefined if player does not exist', () => {
      const player = game.getPlayer('nonexistent');
      expect(player).toBeUndefined();
    });
  });

  describe('getPlayers', () => {
    it('should return all players as array', () => {
      game.addPlayer('player1', 'Player1');
      game.addPlayer('player2', 'Player2');
      
      const players = game.getPlayers();
      expect(players.length).toBe(2);
    });
  });

  describe('getAlivePlayers', () => {
    it('should return only alive players', () => {
      game.addPlayer('player1', 'Player1');
      game.addPlayer('player2', 'Player2');
      
      const player1 = game.getPlayer('player1');
      if (player1) player1.alive = false;
      
      const alivePlayers = game.getAlivePlayers();
      expect(alivePlayers.length).toBe(1);
      expect(alivePlayers[0].id).toBe('player2');
    });
  });

  describe('vote', () => {
    beforeEach(() => {
      for (let i = 0; i < GAME_CONFIG.MIN_PLAYERS; i++) {
        game.addPlayer(`player${i}`, `Player${i}`);
      }
      game.start();
      game.phase = GAME_PHASES.VOTE;
    });

    it('should record vote successfully', () => {
      const result = game.vote('player0', 'player1');
      expect(result.success).toBe(true);
      expect(game.votes['player0']).toBe('player1');
    });

    it('should not allow dead player to vote', () => {
      const player = game.getPlayer('player0');
      if (player) player.alive = false;
      
      const result = game.vote('player0', 'player1');
      expect(result.success).toBe(false);
    });

    it('should not allow voting for dead player', () => {
      const player = game.getPlayer('player1');
      if (player) player.alive = false;
      
      const result = game.vote('player0', 'player1');
      expect(result.success).toBe(false);
    });
  });

  describe('checkWinCondition', () => {
    it('should return null when game is ongoing', () => {
      for (let i = 0; i < GAME_CONFIG.MIN_PLAYERS; i++) {
        game.addPlayer(`player${i}`, `Player${i}`);
      }
      game.start();
      
      const winner = game.checkWinCondition();
      expect(winner).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset game to initial state', () => {
      game.addPlayer('player1', 'Player1');
      game.addPlayer('player2', 'Player2');
      game.addPlayer('player3', 'Player3');
      game.addPlayer('player4', 'Player4');
      game.addPlayer('player5', 'Player5');
      game.start();
      
      game.reset();
      
      expect(game.phase).toBe(GAME_PHASES.WAITING);
      expect(game.day).toBe(0);
      expect(game.winner).toBeNull();
      expect(game.nightActions).toEqual({});
      expect(game.witchPotions).toEqual({ antidote: true, poison: true });
      
      game.players.forEach(player => {
        expect(player.role).toBeNull();
        expect(player.alive).toBe(true);
      });
    });
  });

  describe('disconnectPlayer', () => {
    it('should mark player as disconnected', () => {
      game.addPlayer('player1', 'Player1');
      const player = game.disconnectPlayer('player1');
      
      expect(player).toBeDefined();
      expect(player?.disconnected).toBe(true);
      expect(game.disconnectedPlayers.has('player1')).toBe(true);
    });
  });

  describe('reconnectPlayer', () => {
    it('should reconnect disconnected player', () => {
      game.addPlayer('player1', 'Player1');
      game.disconnectPlayer('player1');
      
      const reconnectedPlayer = game.reconnectPlayer('player1', 'newSocketId');
      
      expect(reconnectedPlayer).toBeDefined();
      expect(reconnectedPlayer?.disconnected).toBeFalsy();
      expect(game.players.has('newSocketId')).toBe(true);
    });
  });
});
