import { afterEach, describe, expect, it } from 'vitest';

import { createTestHarness } from '../helpers/create-test-harness.js';

describe('room access and invitations', () => {
  const harnesses: Array<ReturnType<typeof createTestHarness>> = [];

  afterEach(async () => {
    await Promise.all(harnesses.splice(0).map((harness) => harness.close()));
  });

  it('allows public access and owner-only invitations for private rooms', async () => {
    const harness = createTestHarness();
    harnesses.push(harness);

    const ownerSession = await harness.request
      .post('/auth/session')
      .send({ email: 'owner@cos.dev' })
      .expect(201);
    const ownerCookie = ownerSession.headers['set-cookie'];

    await harness.request.post('/aliases').set('Cookie', ownerCookie).send({ pseudo: 'Owner' }).expect(201);

    const invitedSession = await harness.request
      .post('/auth/session')
      .send({ email: 'guest@cos.dev' })
      .expect(201);
    const invitedCookie = invitedSession.headers['set-cookie'];

    await harness.request.post('/aliases').set('Cookie', invitedCookie).send({ pseudo: 'Guest' }).expect(201);

    const privateRoomResponse = await harness.request
      .post('/salons')
      .set('Cookie', ownerCookie)
      .send({
        alias: 'Owner',
        nom: 'atelier-prive',
        desc: 'Room for selected profiles only',
        type: 'private',
      })
      .expect(201);

    expect(privateRoomResponse.body.room.ownerAlias).toBe('Owner');

    const ownerRooms = await harness.request.get('/salons?alias=Owner').set('Cookie', ownerCookie).expect(200);
    expect(ownerRooms.body.rooms.some((room: { nom: string }) => room.nom === 'general')).toBe(true);
    expect(ownerRooms.body.rooms.some((room: { nom: string }) => room.nom === 'atelier-prive')).toBe(true);

    const invitedBefore = await harness.request
      .get('/salons?alias=Guest')
      .set('Cookie', invitedCookie)
      .expect(200);

    expect(invitedBefore.body.rooms.some((room: { nom: string }) => room.nom === 'atelier-prive')).toBe(
      false,
    );

    await harness.request
      .post('/salons/atelier-prive/invitations')
      .set('Cookie', ownerCookie)
      .send({ inviterAlias: 'Owner', invitedAlias: 'Guest' })
      .expect(201);

    const invitedAfter = await harness.request
      .get('/salons?alias=Guest')
      .set('Cookie', invitedCookie)
      .expect(200);

    const privateRoom = invitedAfter.body.rooms.find(
      (room: { nom: string; memberAliases: string[] }) => room.nom === 'atelier-prive',
    );

    expect(privateRoom.memberAliases).toContain('Guest');

    const forbiddenInvite = await harness.request
      .post('/salons/atelier-prive/invitations')
      .set('Cookie', invitedCookie)
      .send({ inviterAlias: 'Guest', invitedAlias: 'Owner' })
      .expect(403);

    expect(forbiddenInvite.body.code).toBe('ROOM_FORBIDDEN');
  });
});
