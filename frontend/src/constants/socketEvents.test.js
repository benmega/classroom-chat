import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { SOCKET_EVENTS, SERVER_DISCONNECT_REASON } from './socketEvents';

// The names the backend sends and listens for (backend/application/socket_events.py and the routes that emit)
const SERVER_EVENTS = [
  SOCKET_EVENTS.SEND_MESSAGE,
  SOCKET_EVENTS.MESSAGE_RECEIVED,
  SOCKET_EVENTS.MESSAGE_DELETED,
  SOCKET_EVENTS.CLASSROOM_ENROLLED,
  SOCKET_EVENTS.ACTIVITY_RESOLVED,
  SOCKET_EVENTS.ACHIEVEMENT_UNLOCKED,
  SOCKET_EVENTS.SANDBOX_STATUS_CHANGED,
];

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../backend/application');

const pythonSources = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pythonSources(full);
    return entry.name.endsWith('.py') ? [fs.readFileSync(full, 'utf8')] : [];
  });

describe('socket event names', () => {
  it('are plain strings that nobody can change at run time', () => {
    expect(Object.isFrozen(SOCKET_EVENTS)).toBe(true);
    expect(Object.values(SOCKET_EVENTS).every((name) => typeof name === 'string' && name.length > 0)).toBe(true);
  });

  it('are unique', () => {
    const names = Object.values(SOCKET_EVENTS);
    expect(new Set(names).size).toBe(names.length);
  });

  it('keep the names socket.io itself uses for the connection lifecycle', () => {
    expect(SOCKET_EVENTS.CONNECT).toBe('connect');
    expect(SOCKET_EVENTS.DISCONNECT).toBe('disconnect');
    expect(SOCKET_EVENTS.CONNECT_ERROR).toBe('connect_error');
    expect(SERVER_DISCONNECT_REASON).toBe('io server disconnect');
  });

  it('no longer include the conversation lifecycle events the backend never emitted', () => {
    expect(Object.values(SOCKET_EVENTS).filter((name) => name.startsWith('conversation_'))).toEqual([]);
  });

  // The backend is not renamed from here: if either side changes a name, this is where it shows
  describe.skipIf(!fs.existsSync(backendDir))('against the backend sources', () => {
    const sources = fs.existsSync(backendDir) ? pythonSources(backendDir).join('\n') : '';

    it.each(SERVER_EVENTS)('%s is a name the backend uses', (name) => {
      expect(sources).toMatch(new RegExp(`["']${name}["']`));
    });
  });
});
