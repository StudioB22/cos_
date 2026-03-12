import type { AliasRecord } from '../domain/alias-record.js';

export interface AliasRepository {
  findByUserId(userId: string): AliasRecord[];
  countByUserId(userId: string): number;
  findByPseudo(pseudo: string): AliasRecord | null;
  findById(id: string): AliasRecord | null;
  create(userId: string, pseudo: string): AliasRecord;
  setFavorite(aliasId: string, salonFavori: string | null): AliasRecord;
  search(query: string): AliasRecord[];
}
