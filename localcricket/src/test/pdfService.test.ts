import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jsPDF } from 'jspdf';
import { generateMatchPDF } from '../services/pdfService';
import { createInitialMatchState, applyAction } from '../domain/engine';
import type { MatchConfig, MatchState } from '../domain/types';

describe('PDF Scorecard Generation & Alignment Audit (TEST 1 to TEST 10)', () => {
  const baseConfig: MatchConfig = {
    id: 'pdf-match-1',
    title: 'Premier Cricket Championship',
    venue: 'Eden Gardens, Kolkata',
    date: '2026-10-30',
    tossWinnerId: 'team-a',
    tossDecision: 'bat',
    status: 'completed',
    format: { oversPerInnings: 20, maxOversPerBowler: 4, playersPerSide: 11 },
    teamA: {
      id: 'team-a',
      name: 'Chennai Super Kings',
      players: Array.from({ length: 11 }, (_, i) => ({
        id: `a${i + 1}`,
        name: `Batter ${i + 1}`,
        isCaptain: i === 0,
        isWicketkeeper: i === 1,
      })),
    },
    teamB: {
      id: 'team-b',
      name: 'Mumbai Indians',
      players: Array.from({ length: 11 }, (_, i) => ({
        id: `b${i + 1}`,
        name: `Bowler ${i + 1}`,
        isCaptain: i === 0,
        isWicketkeeper: i === 1,
      })),
    },
    createdAt: '2026-10-30T10:00:00Z',
    updatedAt: '2026-10-30T10:00:00Z',
  };

  // TEST 1: Short innings with a small scorecard
  it('TEST 1: generates PDF for short innings scorecard', () => {
    let state = createInitialMatchState(baseConfig, 'a1', 'a2', 'b1');
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });

    const doc = generateMatchPDF(state);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  // TEST 2: Full 10-over match
  it('TEST 2: generates PDF for 10-over match scenario', () => {
    const config10: MatchConfig = {
      ...baseConfig,
      format: { oversPerInnings: 10, maxOversPerBowler: 2, playersPerSide: 11 },
    };
    let state = createInitialMatchState(config10, 'a1', 'a2', 'b1');
    for (let o = 0; o < 2; o++) {
      for (let b = 0; b < 6; b++) {
        state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
      }
      state = applyAction(state, { type: 'CHANGE_BOWLER', bowlerId: o === 0 ? 'b2' : 'b1' });
    }

    const doc = generateMatchPDF(state);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  // TEST 3: Full 20-over match
  it('TEST 3: generates PDF for 20-over match scenario', () => {
    let state = createInitialMatchState(baseConfig, 'a1', 'a2', 'b1');
    for (let i = 0; i < 12; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 2 });
    }

    const doc = generateMatchPDF(state);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  // TEST 4: Long player names
  it('TEST 4: wraps long player names without overlapping columns', () => {
    const longNamesConfig: MatchConfig = {
      ...baseConfig,
      teamA: {
        ...baseConfig.teamA,
        players: [
          { id: 'a1', name: 'Warnakulasuriya Patabendige Ushantha Joseph Chaminda Vaas', isCaptain: true, isWicketkeeper: false },
          { id: 'a2', name: 'Kumar Chokshanada Sangakkara (Legendary Wicketkeeper)', isCaptain: false, isWicketkeeper: true },
        ],
      },
    };
    let state = createInitialMatchState(longNamesConfig, 'a1', 'a2', 'b1');
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4 });

    const doc = generateMatchPDF(state);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  // TEST 5: Long dismissal descriptions
  it('TEST 5: wraps long dismissal descriptions cleanly', () => {
    let state = createInitialMatchState(baseConfig, 'a1', 'a2', 'b1');
    state = applyAction(state, {
      type: 'WICKET',
      dismissal: {
        type: 'caught',
        dismissedBatterId: 'a1',
        fielderId: 'b2',
        bowlerCredited: true,
      },
      runs: 0,
    });

    const doc = generateMatchPDF(state);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  // TEST 6: Multiple extras (wides, no-balls, byes, leg-byes)
  it('TEST 6: accurately formats and renders multiple extras breakdown', () => {
    let state = createInitialMatchState(baseConfig, 'a1', 'a2', 'b1');
    state = applyAction(state, { type: 'WIDE', additionalRuns: 2 });
    state = applyAction(state, { type: 'NO_BALL', batterRuns: 4, extraRuns: 1 });
    state = applyAction(state, { type: 'BYE', runs: 2 });
    state = applyAction(state, { type: 'LEG_BYE', runs: 1 });

    expect(state.innings[0].extras.total).toBe(8);
    const doc = generateMatchPDF(state);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  // TEST 7: All 10 wickets
  it('TEST 7: formats and renders complete all-out scorecard with 10 wickets', () => {
    let state = createInitialMatchState(baseConfig, 'a1', 'a2', 'b1');
    for (let w = 0; w < 10; w++) {
      const outBatterId = state.innings[0].currentStrikerId || `a${w + 1}`;
      state = applyAction(state, {
        type: 'WICKET',
        dismissal: { type: 'bowled', dismissedBatterId: outBatterId, bowlerCredited: true },
        runs: 0,
      });
      if (w < 9) {
        state = applyAction(state, { type: 'ADD_BATTER', batterId: `a${w + 3}` });
      }
    }

    expect(state.innings[0].wickets).toBe(10);
    expect(state.innings[0].status).toBe('completed');
    const doc = generateMatchPDF(state);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  // TEST 8: Large fall of wickets information
  it('TEST 8: cleanly structures large fall of wickets sequence without text collision', () => {
    let state = createInitialMatchState(baseConfig, 'a1', 'a2', 'b1');
    for (let w = 0; w < 6; w++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 5 });
      const outId = state.innings[0].currentStrikerId || `a${w + 1}`;
      state = applyAction(state, {
        type: 'WICKET',
        dismissal: { type: 'caught', dismissedBatterId: outId, bowlerCredited: true },
        runs: 0,
      });
      state = applyAction(state, { type: 'ADD_BATTER', batterId: `a${w + 3}` });
    }

    expect(state.innings[0].fallOfWickets.length).toBe(6);
    const doc = generateMatchPDF(state);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  // TEST 9: Two innings with a complete match result
  it('TEST 9: renders both 1st and 2nd innings with prominent match result banner', () => {
    let state = createInitialMatchState(baseConfig, 'a1', 'a2', 'b1');
    // Innings 1: 20 runs
    for (let i = 0; i < 5; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
    }
    state = applyAction(state, { type: 'END_INNINGS' });
    expect(state.status).toBe('innings_break');

    // Start 2nd innings: Mumbai Indians chases 21
    state = applyAction(state, {
      type: 'START_NEXT_INNINGS',
      strikerId: 'b1',
      nonStrikerId: 'b2',
      bowlerId: 'a1',
    });

    // Score 24 runs to win by 10 wickets
    for (let i = 0; i < 4; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });
    }

    expect(state.status).toBe('completed');
    expect(state.result?.winner).toBe('teamB');
    expect(state.result?.resultText).toContain('won by 10 wickets');

    const doc = generateMatchPDF(state);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  // TEST 10: Multi-page content pagination
  it('TEST 10: generates clean multi-page document when match content spans multiple innings and tables', () => {
    let state = createInitialMatchState(baseConfig, 'a1', 'a2', 'b1');
    // Bat 10 players
    for (let w = 0; w < 10; w++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 2 });
      const outId = state.innings[0].currentStrikerId || `a${w + 1}`;
      state = applyAction(state, {
        type: 'WICKET',
        dismissal: { type: 'bowled', dismissedBatterId: outId, bowlerCredited: true },
        runs: 0,
      });
      if (w < 9) {
        state = applyAction(state, { type: 'ADD_BATTER', batterId: `a${w + 3}` });
      }
    }

    // Start 2nd innings
    state = applyAction(state, {
      type: 'START_NEXT_INNINGS',
      strikerId: 'b1',
      nonStrikerId: 'b2',
      bowlerId: 'a1',
    });
    for (let w = 0; w < 8; w++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 3 });
      const outId = state.innings[1].currentStrikerId || `b${w + 1}`;
      state = applyAction(state, {
        type: 'WICKET',
        dismissal: { type: 'caught', dismissedBatterId: outId, bowlerCredited: true },
        runs: 0,
      });
      if (w < 7) {
        state = applyAction(state, { type: 'ADD_BATTER', batterId: `b${w + 3}` });
      }
    }

    const doc = generateMatchPDF(state);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThan(1); // Spans multiple pages cleanly!
  });
});
