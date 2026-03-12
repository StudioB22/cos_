import { describe, expect, it } from 'vitest';

import { InMemoryRealtimeStore } from '../../src/features/realtime/infrastructure/in-memory-realtime-store.js';

describe('InMemoryRealtimeStore', () => {
  it('keeps only the latest eighty room messages as an edge-case guard', () => {
    const store = new InMemoryRealtimeStore();

    for (let index = 0; index < 100; index += 1) {
      store.appendRoomMessage('general', {
        id: String(index),
        roomName: 'general',
        authorAlias: 'Neo',
        content: `message-${index}`,
        smiley: null,
        createdAt: new Date().toISOString(),
        kind: 'message',
      });
    }

    const messages = store.getRoomMessages('general');

    expect(messages).toHaveLength(80);
    expect(messages[0]?.content).toBe('message-20');
    expect(messages.at(-1)?.content).toBe('message-99');
  });

  it('adds and removes ignore rules for the current alias', () => {
    const store = new InMemoryRealtimeStore();

    expect(store.addIgnore('Benoit', 'SpamBot')).toEqual(['SpamBot']);
    expect(store.isIgnoring('Benoit', 'SpamBot')).toBe(true);
    expect(store.removeIgnore('Benoit', 'SpamBot')).toEqual([]);
    expect(store.isIgnoring('Benoit', 'SpamBot')).toBe(false);
  });
});
