// ============================================================
// LocalCricket — Match Context & Hook
// ============================================================

import React, {
  createContext, useContext, useReducer, useCallback, useEffect, useState,
} from 'react';
import type { MatchState, ScoringAction, MatchConfig } from '../domain/types';
import { applyAction, createInitialMatchState, addNewBatter } from '../domain/engine';
import { matchRepository } from '../db/repository';

type InternalAction =
  | ScoringAction
  | { type: '_LOAD_STATE'; payload: MatchState }
  | { type: '_ADD_BATTER'; batterId: string };

interface MatchContextValue {
  state: MatchState | null;
  dispatch: (action: ScoringAction) => void;
  addBatter: (batterId: string) => void;
  initMatch: (
    config: MatchConfig,
    openingStrikerId: string,
    openingNonStrikerId: string,
    openingBowlerId: string,
  ) => void;
  loadMatch: (id: string) => Promise<boolean>;
  saveStatus: 'saved' | 'saving' | 'error' | 'idle';
}

const MatchContext = createContext<MatchContextValue | null>(null);

function reducer(state: MatchState | null, action: InternalAction): MatchState | null {
  if (action.type === '_LOAD_STATE') return action.payload;
  if (action.type === '_ADD_BATTER') {
    if (!state) return state;
    return addNewBatter(state, action.batterId);
  }
  if (!state) return state;
  return applyAction(state, action as ScoringAction);
}

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch_] = useReducer(reducer, null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save
  useEffect(() => {
    if (!state) return;
    if (saveTimer) clearTimeout(saveTimer);
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      matchRepository
        .save(state)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 500);
    setSaveTimer(timer);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const dispatch = useCallback((action: ScoringAction) => {
    dispatch_(action);
  }, []);

  const addBatter = useCallback((batterId: string) => {
    dispatch_({ type: '_ADD_BATTER', batterId });
  }, []);

  const initMatch = useCallback((
    config: MatchConfig,
    strikerId: string,
    nonStrikerId: string,
    bowlerId: string,
  ) => {
    const initialState = createInitialMatchState(config, strikerId, nonStrikerId, bowlerId);
    dispatch_({ type: '_LOAD_STATE', payload: initialState });
  }, []);

  const loadMatch = useCallback(async (id: string): Promise<boolean> => {
    const stored = await matchRepository.getById(id);
    if (stored) {
      dispatch_({ type: '_LOAD_STATE', payload: stored.state });
      return true;
    }
    return false;
  }, []);

  return (
    <MatchContext.Provider value={{ state, dispatch, addBatter, initMatch, loadMatch, saveStatus }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error('useMatch must be used within MatchProvider');
  return ctx;
}
