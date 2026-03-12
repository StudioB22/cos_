import { z } from 'zod';

export const roomTypeSchema = z.enum(['public', 'private']);
export const roomMembershipRoleSchema = z.enum(['owner', 'member']);

export const smileyCodes = [
  ':-)',
  ';-)',
  ':-D',
  ':-P',
  ':-O',
  ':-(',
  ':-|',
  'B-)',
  '8-)',
  ':-*',
  ':-/',
  ':-X',
  ':-$',
  ':-@',
  ':-!',
  ':-?',
  '<3',
  '^_^',
  'o_O',
  'crotte',
  'yo',
  'retro',
] as const;

export const smileyCodeSchema = z.enum(smileyCodes);

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const aliasSchema = z.object({
  id: z.string(),
  pseudo: z.string(),
  salonFavori: z.string().nullable(),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
  aliases: z.array(aliasSchema),
});

export const sessionIdentitySchema = z.object({
  user: userSchema,
});

export const roomSchema = z.object({
  id: z.string(),
  nom: z.string(),
  desc: z.string(),
  type: roomTypeSchema,
  ownerAliasId: z.string().nullable(),
  ownerAlias: z.string().nullable(),
  memberAliases: z.array(z.string()),
  isMember: z.boolean(),
});

export const roomStateMemberSchema = z.object({
  alias: z.string(),
  socketCount: z.number().int().nonnegative(),
});

export const roomMessageSchema = z.object({
  id: z.string(),
  roomName: z.string(),
  authorAlias: z.string(),
  content: z.string(),
  smiley: smileyCodeSchema.nullable(),
  createdAt: z.string(),
  kind: z.enum(['message', 'system']),
});

export const directMessageSchema = z.object({
  id: z.string(),
  fromAlias: z.string(),
  toAlias: z.string(),
  content: z.string(),
  smiley: smileyCodeSchema.nullable(),
  createdAt: z.string(),
});

export const roomStateSchema = z.object({
  roomName: z.string(),
  messages: z.array(roomMessageSchema),
  occupants: z.array(roomStateMemberSchema),
});

export const authSessionInputSchema = z.object({
  email: z.string().trim().email().max(120),
});

export const createAliasInputSchema = z.object({
  pseudo: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[A-Za-z0-9_\-À-ÿ]+$/, 'Pseudo contains unsupported characters'),
});

export const updateFavoriteInputSchema = z.object({
  pseudo: z.string().trim().min(2).max(24),
  salonFavori: z.string().trim().min(2).max(32),
});

export const createRoomInputSchema = z.object({
  alias: z.string().trim().min(2).max(24),
  nom: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9<>\-_]+$/i, 'Room name format is invalid'),
  desc: z.string().trim().min(4).max(120),
  type: roomTypeSchema.default('private'),
});

export const inviteAliasInputSchema = z.object({
  inviterAlias: z.string().trim().min(2).max(24),
  invitedAlias: z.string().trim().min(2).max(24),
});

export const listRoomsQuerySchema = z.object({
  alias: z.string().trim().min(2).max(24),
});

export const joinRoomSocketSchema = z.object({
  alias: z.string().trim().min(2).max(24),
  roomName: z.string().trim().min(2).max(32),
});

export const chatSendSocketSchema = z.object({
  alias: z.string().trim().min(2).max(24),
  roomName: z.string().trim().min(2).max(32),
  content: z.string().trim().min(1).max(240),
  smiley: smileyCodeSchema.nullable().optional(),
});

export const dmSendSocketSchema = z.object({
  fromAlias: z.string().trim().min(2).max(24),
  toAlias: z.string().trim().min(2).max(24),
  content: z.string().trim().min(1).max(240),
  smiley: smileyCodeSchema.nullable().optional(),
});

export const ignoreSocketSchema = z.object({
  alias: z.string().trim().min(2).max(24),
  ignoredAlias: z.string().trim().min(2).max(24),
});

export const ignoreStateSocketSchema = z.object({
  alias: z.string().trim().min(2).max(24),
});

export type RoomType = z.infer<typeof roomTypeSchema>;
export type RoomMembershipRole = z.infer<typeof roomMembershipRoleSchema>;
export type SmileyCode = z.infer<typeof smileyCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type Alias = z.infer<typeof aliasSchema>;
export type User = z.infer<typeof userSchema>;
export type SessionIdentity = z.infer<typeof sessionIdentitySchema>;
export type Salon = z.infer<typeof roomSchema>;
export type RoomStateMember = z.infer<typeof roomStateMemberSchema>;
export type RoomMessage = z.infer<typeof roomMessageSchema>;
export type DirectMessage = z.infer<typeof directMessageSchema>;
export type RoomState = z.infer<typeof roomStateSchema>;
export type AuthSessionInput = z.infer<typeof authSessionInputSchema>;
export type CreateAliasInput = z.infer<typeof createAliasInputSchema>;
export type UpdateFavoriteInput = z.infer<typeof updateFavoriteInputSchema>;
export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;
export type InviteAliasInput = z.infer<typeof inviteAliasInputSchema>;
export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema>;
export type JoinRoomSocket = z.infer<typeof joinRoomSocketSchema>;
export type ChatSendSocket = z.infer<typeof chatSendSocketSchema>;
export type DmSendSocket = z.infer<typeof dmSendSocketSchema>;
export type IgnoreSocket = z.infer<typeof ignoreSocketSchema>;
export type IgnoreStateSocket = z.infer<typeof ignoreStateSocketSchema>;
