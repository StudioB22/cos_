import type { RoomMembershipRole, RoomType } from '@cos/shared';

export interface RoomRecord {
  id: string;
  nom: string;
  desc: string;
  type: RoomType;
  ownerAliasId: string | null;
  ownerAlias: string | null;
  memberAliases: string[];
  createdAt: string;
}

export interface RoomMembershipRecord {
  aliasId: string;
  alias: string;
  role: RoomMembershipRole;
}
