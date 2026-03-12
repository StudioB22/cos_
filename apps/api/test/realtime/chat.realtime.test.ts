import { io as createClient } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';

import { createTestHarness } from '../helpers/create-test-harness.js';

const getCookieHeader = (setCookie: string[]) =>
  setCookie.map((entry) => entry.split(';')[0]).join('; ');

describe('realtime chat and private-room sad path', () => {
  const harnesses: Array<ReturnType<typeof createTestHarness>> = [];

  afterEach(async () => {
    await Promise.all(harnesses.splice(0).map((harness) => harness.close()));
  });

  it('broadcasts public room messages and rejects unauthorized private joins', async () => {
    const harness = createTestHarness();
    harnesses.push(harness);

    const port = await harness.listen();
    const baseUrl = `http://127.0.0.1:${port}`;

    const alphaSession = await harness.request
      .post('/auth/session')
      .send({ email: 'alpha@cos.dev' })
      .expect(201);
    const betaSession = await harness.request
      .post('/auth/session')
      .send({ email: 'beta@cos.dev' })
      .expect(201);

    const alphaCookie = getCookieHeader(alphaSession.headers['set-cookie']);
    const betaCookie = getCookieHeader(betaSession.headers['set-cookie']);

    await harness.request.post('/aliases').set('Cookie', alphaCookie).send({ pseudo: 'Alpha' }).expect(201);
    await harness.request.post('/aliases').set('Cookie', betaCookie).send({ pseudo: 'Beta' }).expect(201);

    await harness.request
      .post('/salons')
      .set('Cookie', alphaCookie)
      .send({
        alias: 'Alpha',
        nom: 'alpha-prive',
        desc: 'Private room for realtime test',
        type: 'private',
      })
      .expect(201);

    const alphaSocket = createClient(baseUrl, {
      transports: ['websocket'],
      extraHeaders: { Cookie: alphaCookie },
    });

    const betaSocket = createClient(baseUrl, {
      transports: ['websocket'],
      extraHeaders: { Cookie: betaCookie },
    });

    await new Promise<void>((resolve, reject) => {
      alphaSocket.on('connect', () => resolve());
      alphaSocket.on('connect_error', reject);
    });

    await new Promise<void>((resolve, reject) => {
      betaSocket.on('connect', () => resolve());
      betaSocket.on('connect_error', reject);
    });

    const joinGeneral = await new Promise<{
      ok: boolean;
      data?: { messages: Array<{ kind: string; content: string }> };
    }>((resolve) => {
      alphaSocket.emit('room:join', { alias: 'Alpha', roomName: 'general' }, resolve);
    });
    expect(joinGeneral.ok).toBe(true);
    expect(joinGeneral.data?.messages.at(-1)).toMatchObject({
      kind: 'system',
      content: 'Alpha entre dans le salon.',
    });

    const betaJoin = await new Promise<{
      ok: boolean;
      data?: { messages: Array<{ kind: string; content: string }> };
    }>((resolve) => {
      betaSocket.emit('room:join', { alias: 'Beta', roomName: 'general' }, resolve);
    });
    expect(betaJoin.ok).toBe(true);
    expect(betaJoin.data?.messages.at(-1)).toMatchObject({
      kind: 'system',
      content: 'Beta entre dans le salon.',
    });

    const messagePromise = new Promise<{ content: string }>((resolve) => {
      betaSocket.once('chat:new', resolve);
    });

    const sendResult = await new Promise<{ ok: boolean }>((resolve) => {
      alphaSocket.emit(
        'chat:send',
        {
          alias: 'Alpha',
          roomName: 'general',
          content: 'hello public room',
          smiley: ':-D',
        },
        resolve,
      );
    });

    expect(sendResult.ok).toBe(true);
    await expect(messagePromise).resolves.toMatchObject({ content: 'hello public room' });

    const unauthorizedIgnoreList = await new Promise<{
      ok: boolean;
      error?: { code: string };
    }>((resolve) => {
      alphaSocket.emit('ignore:list', { alias: 'Beta' }, resolve);
    });

    expect(unauthorizedIgnoreList.ok).toBe(false);
    expect(unauthorizedIgnoreList.error?.code).toBe('ALIAS_NOT_FOUND');

    const privateJoin = await new Promise<{
      ok: boolean;
      error?: { code: string };
    }>((resolve) => {
      betaSocket.emit('room:join', { alias: 'Beta', roomName: 'alpha-prive' }, resolve);
    });

    expect(privateJoin.ok).toBe(false);
    expect(privateJoin.error?.code).toBe('ROOM_FORBIDDEN');

    const leaveState = new Promise<{ messages: Array<{ kind: string; content: string }> }>((resolve) => {
      alphaSocket.on('room:state', (payload) => {
        const lastMessage = payload.messages.at(-1);
        if (lastMessage?.kind === 'system' && lastMessage.content === 'Beta a quitte le salon.') {
          resolve(payload);
        }
      });
    });

    betaSocket.disconnect();

    await expect(leaveState).resolves.toMatchObject({
      messages: expect.arrayContaining([
        expect.objectContaining({
          kind: 'system',
          content: 'Beta a quitte le salon.',
        }),
      ]),
    });

    alphaSocket.disconnect();
  });
});
