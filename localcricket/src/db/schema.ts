// ============================================================
// LocalCricket — IndexedDB Schema (Dexie.js)
// ============================================================

import Dexie, { type Table } from 'dexie';
import type { MatchState } from '../domain/types';

export interface StoredMatch {
  id: string;
  title: string;
  teamAName: string;
  teamBName: string;
  state: MatchState;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class LocalCricketDB extends Dexie {
  matches!: Table<StoredMatch>;

  constructor() {
    super('LocalCricketDB');
    this.version(1).stores({
      matches: 'id, status, createdAt, updatedAt',
    });
  }
}

export const db = new LocalCricketDB();
