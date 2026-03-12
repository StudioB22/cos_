import { createRoomInputSchema, smileyCodes } from '@cos/shared';
import { describe, expect, it } from 'vitest';

describe('shared frontend contracts', () => {
  it('exposes a retro smiley palette larger than twenty entries', () => {
    expect(smileyCodes.length).toBeGreaterThanOrEqual(20);
  });

  it('defaults new room creation payloads to private rooms', () => {
    const parsed = createRoomInputSchema.parse({
      alias: 'Benoit',
      nom: 'portfolio-prive',
      desc: 'Salon prive de test',
    });

    expect(parsed.type).toBe('private');
  });
});
