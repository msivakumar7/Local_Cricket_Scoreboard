import type { MatchState } from '../domain/types';
import { matchRepository } from '../db/repository';

export function exportMatchJSON(state: MatchState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fname = `${state.config.teamA.name}_vs_${state.config.teamB.name}_${state.config.date}.json`
    .replace(/\s+/g, '_');
  a.download = fname;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importMatchJSON(jsonText: string): Promise<boolean> {
  try {
    const state = JSON.parse(jsonText) as MatchState;
    // Basic validation
    if (!state.config?.id || !state.innings || !Array.isArray(state.innings)) {
      return false;
    }
    if (!state.config.teamA || !state.config.teamB) return false;
    // Save to DB
    await matchRepository.save(state);
    return true;
  } catch {
    return false;
  }
}
