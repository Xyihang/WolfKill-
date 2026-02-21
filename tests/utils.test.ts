import { generateRoomId, generateRandomName, getLocalIP } from '../src/utils';

describe('Utils', () => {
  describe('generateRoomId', () => {
    it('should generate a room ID with correct length', () => {
      const rooms = new Map();
      const roomId = generateRoomId(rooms);
      expect(roomId.length).toBe(6);
    });

    it('should generate uppercase alphanumeric room ID', () => {
      const rooms = new Map();
      const roomId = generateRoomId(rooms);
      expect(roomId).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate unique room IDs', () => {
      const rooms = new Map();
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        const roomId = generateRoomId(rooms);
        expect(ids.has(roomId)).toBe(false);
        ids.add(roomId);
        rooms.set(roomId, {});
      }
    });
  });

  describe('generateRandomName', () => {
    it('should generate a name with correct format', () => {
      const usedNames = new Set<string>();
      const name = generateRandomName(usedNames);
      expect(name).toMatch(/^.+\d{4}$/);
    });

    it('should not generate duplicate names', () => {
      const usedNames = new Set<string>();
      const names = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const name = generateRandomName(usedNames);
        expect(names.has(name)).toBe(false);
        names.add(name);
        usedNames.add(name);
      }
    });

    it('should respect used names', () => {
      const usedNames = new Set<string>();
      usedNames.add('聪明的狼人1234');
      const name = generateRandomName(usedNames);
      expect(name).not.toBe('聪明的狼人1234');
    });
  });

  describe('getLocalIP', () => {
    it('should return a string', () => {
      const ip = getLocalIP();
      expect(typeof ip).toBe('string');
    });

    it('should return valid IP or localhost', () => {
      const ip = getLocalIP();
      expect(
        ip === 'localhost' || 
        /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)
      ).toBe(true);
    });
  });
});
