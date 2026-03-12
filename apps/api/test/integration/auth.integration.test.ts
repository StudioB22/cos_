import { afterEach, describe, expect, it } from 'vitest';

import { createTestHarness } from '../helpers/create-test-harness.js';

describe('auth and alias flows', () => {
  const harnesses: Array<ReturnType<typeof createTestHarness>> = [];

  afterEach(async () => {
    await Promise.all(harnesses.splice(0).map((harness) => harness.close()));
  });

  it('covers happy and sad auth paths plus the three-alias limit', async () => {
    const harness = createTestHarness();
    harnesses.push(harness);

    await harness.request.get('/auth/me').expect(401);
    await harness.request.post('/auth/session').send({ email: 'bad-email' }).expect(400);

    const authResponse = await harness.request
      .post('/auth/session')
      .send({ email: 'BENOIT@StudioB22.dev ' })
      .expect(201);

    const cookie = authResponse.headers['set-cookie'];
    expect(cookie?.[0]).toContain('cos_session=');
    expect(authResponse.body.user.email).toBe('benoit@studiob22.dev');

    const meResponse = await harness.request.get('/auth/me').set('Cookie', cookie).expect(200);
    expect(meResponse.body.user.aliases).toEqual([]);

    await harness.request.post('/aliases').set('Cookie', cookie).send({ pseudo: 'Benoit' }).expect(201);
    await harness.request.post('/aliases').set('Cookie', cookie).send({ pseudo: 'Bremaud' }).expect(201);
    await harness.request.post('/aliases').set('Cookie', cookie).send({ pseudo: 'COSMaster' }).expect(201);

    const limitResponse = await harness.request
      .post('/aliases')
      .set('Cookie', cookie)
      .send({ pseudo: 'FourthAlias' })
      .expect(400);

    expect(limitResponse.body.code).toBe('ALIAS_LIMIT_REACHED');
  });
});
