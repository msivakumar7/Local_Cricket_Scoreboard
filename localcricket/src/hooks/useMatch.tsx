// ============================================================
// LocalCricket — Match Context & Hook
// ============================================================

import React, {
  createContext, useContext, useReducer, useCallback, useEffect, useState, useRef,
} from 'react';
import type { MatchState, ScoringAction, MatchConfig } from '../domain/types';
import { applyAction, createInitialMatchState, addNewBatter } from '../domain/engine';
import { matchRepository } from '../db/repository';

type InternalAction =
  | ScoringAction
  | { type: '_LOAD_STATE'; payload: MatchState };

interface MatchContextValue {
  state: MatchState | null;
  dispatch: (action: ScoringAction) => void;
  addBatter: (batterId: string, newPlayerName?: string) => void;
  updatePlayerName: (playerId: string, newName: string) => void;
  addBowler: (bowlerId: string, bowlerName: string) => void;
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
  if (!state) return state;
  return applyAction(state, action as ScoringAction);
}

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch_] = useReducer(reducer, null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save
  useEffect(() => {
    if (!state) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      matchRepository
        .save(state)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const dispatch = useCallback((action: ScoringAction) => {
    dispatch_(action);
  }, []);

  const addBatter = useCallback((batterId: string, newPlayerName?: string) => {
    dispatch_({ type: 'ADD_BATTER', batterId, newPlayerName });
  }, []);

  const updatePlayerName = useCallback((playerId: string, newName: string) => {
    dispatch_({ type: 'UPDATE_PLAYER_NAME', playerId, newName });
  }, []);

  const addBowler = useCallback((bowlerId: string, bowlerName: string) => {
    dispatch_({ type: 'ADD_BOWLER', bowlerId, bowlerName });
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
    <MatchContext.Provider value={{ state, dispatch, addBatter, updatePlayerName, addBowler, initMatch, loadMatch, saveStatus }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error('useMatch must be used within MatchProvider');
  return ctx;
}
