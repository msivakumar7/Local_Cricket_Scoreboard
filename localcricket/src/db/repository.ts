// ============================================================
// LocalCricket — Match Repository
// ============================================================

import { db, type StoredMatch } from './schema';
import type { MatchState } from '../domain/types';

export type { StoredMatch };

export const matchRepository = {
  async save(state: MatchState): Promise<void> {
    const stored: StoredMatch = {
      id: state.config.id,
      title: state.config.title,
      teamAName: state.config.teamA.name,
      teamBName: state.config.teamB.name,
      state,
      status: state.status,
      createdAt: state.config.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await db.matches.put(stored);
  },

  async getAll(): Promise<StoredMatch[]> {
    return db.matches.orderBy('updatedAt').reverse().toArray();
  },

  async getById(id: string): Promise<StoredMatch | undefined> {
    return db.matches.get(id);
  },

  async delete(id: string): Promise<void> {
    await db.matches.delete(id);
  },

  async getLiveMatches(): Promise<StoredMatch[]> {
    return db.matches.where('status').anyOf(['live', 'innings_break']).toArray();
  },

  async getStats(): Promise<{ total: number; completed: number; totalRuns: number }> {
    const all = await db.matches.toArray();
    const completed = all.filter(m => m.status === 'completed').length;
    const totalRuns = all.reduce((sum, m) => {
      const state = m.state;
      return sum + state.innings.reduce((s, inn) => s + inn.totalRuns, 0);
    }, 0);
    return { total: all.length, completed, totalRuns };
  },
};
