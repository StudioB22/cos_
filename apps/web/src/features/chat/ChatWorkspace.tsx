import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { type DirectMessage, type RoomMessage, type RoomState, smileyCodes } from '@cos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

import { api, ApiClientError } from '@/lib/api';
import { createCosSocket, emitWithAck, SocketClientError } from '@/lib/socket';

import { AliasOnboarding } from '../auth/AliasOnboarding';
import { AuthPanel } from '../auth/AuthPanel';
import { RetroButton } from '../ui/RetroButton';
import { RetroPanel } from '../ui/RetroPanel';

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const humanizeError = (error: unknown) => {
  if (error instanceof ApiClientError || error instanceof SocketClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Une erreur inconnue est survenue.';
};

const conversationKey = (left: string, right: string) => [left, right].sort().join('::');

export const ChatWorkspace = () => {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const [activeAliasPseudo, setActiveAliasPseudo] = useState('');
  const [selectedRoomName, setSelectedRoomName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSmiley, setSelectedSmiley] = useState<(typeof smileyCodes)[number] | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [ignoredAliases, setIgnoredAliases] = useState<string[]>([]);
  const [privateRoomName, setPrivateRoomName] = useState('');
  const [privateRoomDesc, setPrivateRoomDesc] = useState('');
  const [inviteQuery, setInviteQuery] = useState('');
  const [selectedInviteAlias, setSelectedInviteAlias] = useState('');
  const [activeDmAlias, setActiveDmAlias] = useState<string | null>(null);
  const [dmDraft, setDmDraft] = useState('');
  const [dmThreads, setDmThreads] = useState<Record<string, DirectMessage[]>>({});
  const [socketRevision, setSocketRevision] = useState(0);

  const deferredInviteQuery = useDeferredValue(inviteQuery);

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: () => api.getSession(),
  });

  const session = sessionQuery.data;
  const aliases = session?.user.aliases ?? [];
  const activeAlias =
    aliases.find((alias) => alias.pseudo === activeAliasPseudo) ?? aliases[0] ?? null;

  useEffect(() => {
    if (!aliases.length) {
      setActiveAliasPseudo('');
      return;
    }

    if (!aliases.some((alias) => alias.pseudo === activeAliasPseudo)) {
      setActiveAliasPseudo(aliases[0]?.pseudo ?? '');
    }
  }, [activeAliasPseudo, aliases]);

  const roomsQuery = useQuery({
    queryKey: ['rooms', activeAliasPseudo],
    queryFn: () => api.listRooms(activeAliasPseudo),
    enabled: Boolean(activeAliasPseudo),
  });

  const rooms = roomsQuery.data?.rooms ?? [];
  const selectedRoom = rooms.find((room) => room.nom === selectedRoomName) ?? null;

  useEffect(() => {
    if (!rooms.length) {
      setSelectedRoomName('');
      return;
    }

    const preferred =
      activeAlias?.salonFavori && rooms.some((room) => room.nom === activeAlias.salonFavori)
        ? activeAlias.salonFavori
        : rooms[0]?.nom;

    if (!rooms.some((room) => room.nom === selectedRoomName) && preferred) {
      setSelectedRoomName(preferred);
    }
  }, [activeAlias?.salonFavori, rooms, selectedRoomName]);

  useEffect(() => {
    if (!activeAliasPseudo) {
      return;
    }

    const socket = createCosSocket();
    socketRef.current = socket;
    socket.connect();

    socket.on('connect', () => {
      setSocketRevision((current) => current + 1);
      void emitWithAck<{ ignoredAliases: string[] }>(socket, 'ignore:list', {
        alias: activeAliasPseudo,
      })
        .then((result) => setIgnoredAliases(result.ignoredAliases))
        .catch((error: unknown) => setWorkspaceError(humanizeError(error)));
    });

    socket.on('room:state', (nextState: RoomState) => {
      setRoomState(nextState);
    });

    socket.on('presence:update', (occupants: RoomState['occupants']) => {
      setRoomState((current) => (current ? { ...current, occupants } : current));
    });

    socket.on('chat:new', (nextMessage: RoomMessage) => {
      setRoomState((current) =>
        current && current.roomName === nextMessage.roomName
          ? { ...current, messages: [...current.messages, nextMessage] }
          : current,
      );
    });

    socket.on('dm:new', (nextMessage: DirectMessage) => {
      const key = conversationKey(nextMessage.fromAlias, nextMessage.toAlias);
      setDmThreads((current) => ({
        ...current,
        [key]: [...(current[key] ?? []), nextMessage],
      }));
    });

    socket.on('connect_error', (error) => {
      setWorkspaceError(error.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setRoomState(null);
      setIgnoredAliases([]);
    };
  }, [activeAliasPseudo]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeAliasPseudo || !selectedRoomName) {
      return;
    }

    emitWithAck<RoomState>(socket, 'room:join', {
      alias: activeAliasPseudo,
      roomName: selectedRoomName,
    })
      .then((nextState) => {
        setRoomState(nextState);
        setWorkspaceError(null);
      })
      .catch((error: unknown) => {
        setWorkspaceError(humanizeError(error));
      });
  }, [activeAliasPseudo, selectedRoomName, roomsQuery.dataUpdatedAt, socketRevision]);

  const aliasDirectoryQuery = useQuery({
    queryKey: ['alias-directory', deferredInviteQuery],
    queryFn: () => api.searchAliases(deferredInviteQuery),
    enabled: deferredInviteQuery.trim().length >= 2,
  });

  const loginMutation = useMutation({
    mutationFn: (email: string) => api.createSession(email),
    onSuccess: (nextSession) => {
      queryClient.setQueryData(['session'], nextSession);
      setWorkspaceError(null);
    },
    onError: (error) => setWorkspaceError(humanizeError(error)),
  });

  const createAliasMutation = useMutation({
    mutationFn: (pseudo: string) => api.createAlias(pseudo),
    onSuccess: (nextSession) => {
      queryClient.setQueryData(['session'], nextSession);
      setWorkspaceError(null);
    },
    onError: (error) => setWorkspaceError(humanizeError(error)),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['session'], null);
      setActiveAliasPseudo('');
      setSelectedRoomName('');
      setRoomState(null);
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: (payload: { pseudo: string; salonFavori: string }) =>
      api.updateFavorite(payload.pseudo, payload.salonFavori),
    onSuccess: ({ aliases: nextAliases }) => {
      queryClient.setQueryData(['session'], (current: typeof session) =>
        current
          ? {
              user: {
                ...current.user,
                aliases: nextAliases,
              },
            }
          : current,
      );
    },
    onError: (error) => setWorkspaceError(humanizeError(error)),
  });

  const createPrivateRoomMutation = useMutation({
    mutationFn: (payload: { alias: string; nom: string; desc: string }) =>
      api.createPrivateRoom({
        alias: payload.alias,
        nom: payload.nom,
        desc: payload.desc,
        type: 'private',
      }),
    onSuccess: ({ room }) => {
      void queryClient.invalidateQueries({ queryKey: ['rooms', activeAliasPseudo] });
      setSelectedRoomName(room.nom);
      setPrivateRoomName('');
      setPrivateRoomDesc('');
      setWorkspaceError(null);
    },
    onError: (error) => setWorkspaceError(humanizeError(error)),
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: { roomName: string; inviterAlias: string; invitedAlias: string }) =>
      api.inviteAlias(payload.roomName, payload.inviterAlias, payload.invitedAlias),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rooms', activeAliasPseudo] });
      setSelectedInviteAlias('');
      setInviteQuery('');
      setWorkspaceError(null);
    },
    onError: (error) => setWorkspaceError(humanizeError(error)),
  });

  const filteredMessages = useMemo(
    () =>
      (roomState?.messages ?? []).filter((entry) => !ignoredAliases.includes(entry.authorAlias)),
    [ignoredAliases, roomState?.messages],
  );

  const directMessages = activeDmAlias
    ? dmThreads[conversationKey(activeAliasPseudo, activeDmAlias)] ?? []
    : [];

  const handleToggleIgnore = async (targetAlias: string) => {
    const socket = socketRef.current;
    if (!socket || !activeAliasPseudo) {
      return;
    }

    try {
      const event = ignoredAliases.includes(targetAlias) ? 'ignore:remove' : 'ignore:add';
      const result = await emitWithAck<{ ignoredAliases: string[] }>(socket, event, {
        alias: activeAliasPseudo,
        ignoredAlias: targetAlias,
      });

      setIgnoredAliases(result.ignoredAliases);
      setWorkspaceError(null);
    } catch (error) {
      setWorkspaceError(humanizeError(error));
    }
  };

  const handleSendMessage = async () => {
    const socket = socketRef.current;
    if (!socket || !activeAliasPseudo || !selectedRoomName || !message.trim()) {
      return;
    }

    try {
      await emitWithAck(socket, 'chat:send', {
        alias: activeAliasPseudo,
        roomName: selectedRoomName,
        content: message,
        smiley: selectedSmiley,
      });
      setMessage('');
      setSelectedSmiley(null);
      setWorkspaceError(null);
    } catch (error) {
      setWorkspaceError(humanizeError(error));
    }
  };

  const handleSendDm = async () => {
    const socket = socketRef.current;
    if (!socket || !activeAliasPseudo || !activeDmAlias || !dmDraft.trim()) {
      return;
    }

    try {
      await emitWithAck(socket, 'dm:send', {
        fromAlias: activeAliasPseudo,
        toAlias: activeDmAlias,
        content: dmDraft,
        smiley: selectedSmiley,
      });
      setDmDraft('');
      setWorkspaceError(null);
    } catch (error) {
      setWorkspaceError(humanizeError(error));
    }
  };

  if (sessionQuery.isLoading) {
    return <div className="grid min-h-screen place-items-center bg-cos-bg text-cos-ink">Chargement...</div>;
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-cos-bg bg-grid bg-[size:26px_26px] px-4 py-8 text-cos-ink">
        <div className="mx-auto grid max-w-4xl gap-6">
          <AuthPanel
            isPending={loginMutation.isPending}
            onSubmit={(email) => loginMutation.mutate(email)}
            error={workspaceError}
          />
        </div>
      </main>
    );
  }

  if (aliases.length === 0) {
    return (
      <main className="min-h-screen bg-cos-bg bg-grid bg-[size:26px_26px] px-4 py-8 text-cos-ink">
        <div className="mx-auto grid max-w-4xl gap-6">
          <AliasOnboarding
            aliases={aliases}
            isPending={createAliasMutation.isPending}
            onCreate={(pseudo) => createAliasMutation.mutate(pseudo)}
            error={workspaceError}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cos-bg bg-grid bg-[size:26px_26px] px-3 py-4 text-cos-ink md:px-6">
      <div className="mx-auto grid max-w-[1600px] gap-4">
        <RetroPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cos-sky/80">Chat Old School</p>
              <h1 className="font-pixel text-4xl text-cos-neon">COS_</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="retro-input min-w-48"
                value={activeAliasPseudo}
                onChange={(event) => {
                  setActiveAliasPseudo(event.target.value);
                  setIgnoredAliases([]);
                }}
              >
                {aliases.map((alias) => (
                  <option key={alias.id} value={alias.pseudo}>
                    {alias.pseudo}
                  </option>
                ))}
              </select>
              <RetroButton
                variant="secondary"
                onClick={() => {
                  if (activeAlias && selectedRoomName) {
                    favoriteMutation.mutate({
                      pseudo: activeAlias.pseudo,
                      salonFavori: selectedRoomName,
                    });
                  }
                }}
              >
                Favori
              </RetroButton>
              <RetroButton variant="danger" onClick={() => logoutMutation.mutate()}>
                Sortir
              </RetroButton>
            </div>
          </div>
          {workspaceError ? <p className="mt-3 text-cos-danger">{workspaceError}</p> : null}
        </RetroPanel>

        <div className="grid gap-4 xl:grid-cols-[300px_1fr_340px]">
          <RetroPanel title="Salons">
            <div className="grid gap-4">
              <div className="grid gap-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    className={`room-link ${
                      room.nom === selectedRoomName ? 'room-link--active' : ''
                    }`}
                    onClick={() => setSelectedRoomName(room.nom)}
                  >
                    <span className="font-pixel text-2xl">{room.nom}</span>
                    <span className="text-sm text-cos-ink/70">{room.desc}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-cos-sky">
                      {room.type === 'public' ? 'public' : `prive • admin ${room.ownerAlias ?? '?'}`}
                    </span>
                  </button>
                ))}
              </div>

              <form
                className="grid gap-2 border border-cos-sky/30 bg-cos-sky/5 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!activeAliasPseudo) {
                    return;
                  }
                  createPrivateRoomMutation.mutate({
                    alias: activeAliasPseudo,
                    nom: privateRoomName,
                    desc: privateRoomDesc,
                  });
                }}
              >
                <h2 className="font-pixel text-2xl text-cos-neon">Creer un prive</h2>
                <input
                  className="retro-input"
                  placeholder="nom salon-prive"
                  value={privateRoomName}
                  onChange={(event) => setPrivateRoomName(event.target.value)}
                />
                <textarea
                  className="retro-input min-h-24"
                  placeholder="Description du salon prive"
                  value={privateRoomDesc}
                  onChange={(event) => setPrivateRoomDesc(event.target.value)}
                />
                <RetroButton type="submit" disabled={createPrivateRoomMutation.isPending}>
                  {createPrivateRoomMutation.isPending ? 'Creation...' : 'Creer'}
                </RetroButton>
              </form>

              {selectedRoom?.type === 'private' && selectedRoom.ownerAlias === activeAliasPseudo ? (
                <form
                  className="grid gap-2 border border-cos-neon/30 bg-cos-neon/5 p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!selectedInviteAlias || !selectedRoomName) {
                      return;
                    }

                    inviteMutation.mutate({
                      roomName: selectedRoomName,
                      inviterAlias: activeAliasPseudo,
                      invitedAlias: selectedInviteAlias,
                    });
                  }}
                >
                  <h2 className="font-pixel text-2xl text-cos-neon">Inviter un profil</h2>
                  <input
                    className="retro-input"
                    placeholder="Chercher un pseudo"
                    value={inviteQuery}
                    onChange={(event) => setInviteQuery(event.target.value)}
                  />
                  <div className="grid max-h-40 gap-2 overflow-y-auto">
                    {(aliasDirectoryQuery.data?.aliases ?? [])
                      .filter((alias) => alias.pseudo !== activeAliasPseudo)
                      .map((alias) => (
                        <button
                          key={alias.id}
                          type="button"
                          className={`room-link ${
                            selectedInviteAlias === alias.pseudo ? 'room-link--active' : ''
                          }`}
                          onClick={() => setSelectedInviteAlias(alias.pseudo)}
                        >
                          {alias.pseudo}
                        </button>
                      ))}
                  </div>
                  <RetroButton type="submit" disabled={!selectedInviteAlias || inviteMutation.isPending}>
                    {inviteMutation.isPending ? 'Invitation...' : 'Inviter'}
                  </RetroButton>
                </form>
              ) : null}
            </div>
          </RetroPanel>

          <RetroPanel title={selectedRoom ? `Salon #${selectedRoom.nom}` : 'Salon'}>
            <div className="grid gap-3">
              <div className="chat-history">
                {filteredMessages.map((entry) => (
                  <article
                    key={entry.id}
                    className={`chat-line ${entry.kind === 'system' ? 'chat-line--system' : ''}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-pixel text-2xl text-cos-neon">{entry.authorAlias}</span>
                      <span className="text-xs uppercase tracking-[0.2em] text-cos-sky/80">
                        {formatTime(entry.createdAt)}
                      </span>
                      {entry.kind !== 'system' ? (
                        <>
                          <RetroButton
                            type="button"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => setActiveDmAlias(entry.authorAlias)}
                          >
                            MP
                          </RetroButton>
                          {entry.authorAlias !== activeAliasPseudo ? (
                            <RetroButton
                              type="button"
                              variant={ignoredAliases.includes(entry.authorAlias) ? 'danger' : 'secondary'}
                              className="!px-2 !py-1 text-xs"
                              onClick={() => void handleToggleIgnore(entry.authorAlias)}
                            >
                              {ignoredAliases.includes(entry.authorAlias) ? 'Unignore' : 'Ignore'}
                            </RetroButton>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    <p className="text-base text-cos-ink/90">
                      {entry.content}
                      {entry.smiley ? <span className="ml-2 text-cos-warning">{entry.smiley}</span> : null}
                    </p>
                  </article>
                ))}
              </div>

              <div className="grid gap-3 border border-cos-sky/20 bg-cos-panel/70 p-3">
                <div className="flex flex-wrap gap-2">
                  {smileyCodes.map((smiley) => (
                    <button
                      key={smiley}
                      type="button"
                      className={`smiley-chip ${selectedSmiley === smiley ? 'smiley-chip--active' : ''}`}
                      onClick={() => setSelectedSmiley(smiley)}
                    >
                      {smiley}
                    </button>
                  ))}
                </div>
                <textarea
                  className="retro-input min-h-28"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tape ton message old school..."
                />
                <div className="flex flex-wrap gap-2">
                  <RetroButton onClick={() => void handleSendMessage()}>Envoyer</RetroButton>
                  <RetroButton
                    variant="secondary"
                    onClick={() => {
                      setMessage('');
                      setSelectedSmiley(null);
                    }}
                  >
                    Effacer
                  </RetroButton>
                </div>
              </div>
            </div>
          </RetroPanel>

          <div className="grid gap-4">
            <RetroPanel title="Profils presents">
              <div className="grid gap-2">
                {(roomState?.occupants ?? []).map((occupant) => (
                  <div key={occupant.alias} className="border border-cos-sky/20 bg-cos-sky/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-pixel text-2xl text-cos-neon">{occupant.alias}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-cos-sky/70">
                          {occupant.socketCount} connexion(s)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <RetroButton
                          className="!px-2 !py-1 text-xs"
                          onClick={() => setActiveDmAlias(occupant.alias)}
                        >
                          MP
                        </RetroButton>
                        {occupant.alias !== activeAliasPseudo ? (
                          <RetroButton
                            variant={ignoredAliases.includes(occupant.alias) ? 'danger' : 'secondary'}
                            className="!px-2 !py-1 text-xs"
                            onClick={() => void handleToggleIgnore(occupant.alias)}
                          >
                            {ignoredAliases.includes(occupant.alias) ? 'Unignore' : 'Ignore'}
                          </RetroButton>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </RetroPanel>

            <RetroPanel title={activeDmAlias ? `MP avec ${activeDmAlias}` : 'Messagerie privee'}>
              <div className="grid gap-3">
                <div className="chat-history max-h-72 min-h-52">
                  {activeDmAlias ? (
                    directMessages.length ? (
                      directMessages.map((entry) => (
                        <article key={entry.id} className="chat-line">
                          <div className="flex items-center gap-2">
                            <span className="font-pixel text-2xl text-cos-neon">{entry.fromAlias}</span>
                            <span className="text-xs uppercase tracking-[0.2em] text-cos-sky/80">
                              {formatTime(entry.createdAt)}
                            </span>
                          </div>
                          <p>
                            {entry.content}
                            {entry.smiley ? <span className="ml-2 text-cos-warning">{entry.smiley}</span> : null}
                          </p>
                        </article>
                      ))
                    ) : (
                      <p className="text-cos-ink/70">Aucun message prive pour le moment.</p>
                    )
                  ) : (
                    <p className="text-cos-ink/70">Choisis un profil dans la liste ou les messages.</p>
                  )}
                </div>
                <textarea
                  className="retro-input min-h-24"
                  value={dmDraft}
                  onChange={(event) => setDmDraft(event.target.value)}
                  placeholder="Message prive..."
                  disabled={!activeDmAlias}
                />
                <div className="flex flex-wrap gap-2">
                  <RetroButton disabled={!activeDmAlias} onClick={() => void handleSendDm()}>
                    Envoyer MP
                  </RetroButton>
                  <RetroButton variant="secondary" onClick={() => setActiveDmAlias(null)}>
                    Fermer
                  </RetroButton>
                </div>
              </div>
            </RetroPanel>
          </div>
        </div>
      </div>
    </main>
  );
};
