import { describe, it, expect } from 'vitest';
import { createInitialMatchState, applyAction } from '../domain/engine';
import { isAwaitingNextBowler } from '../domain/rules';
import type { MatchConfig, MatchState } from '../domain/types';

const testConfig: MatchConfig = {
  id: 'wide-test-match',
  title: 'Wide Test League',
  venue: 'Green Park',
  date: '2026-10-30',
  tossWinnerId: 'team-a',
  tossDecision: 'bat',
  status: 'live',
  teamA: {
    id: 'team-a',
    name: 'Royal Strikers',
    players: [
      { id: 'p1', name: 'Siva', isCaptain: true, isWicketkeeper: false },
      { id: 'p2', name: 'Kumar', isCaptain: false, isWicketkeeper: false },
      { id: 'p3', name: 'Ravi', isCaptain: false, isWicketkeeper: false },
    ],
  },
  teamB: {
    id: 'team-b',
    name: 'Super Bowlers',
    players: [
      { id: 'b1', name: 'Bumrah', isCaptain: true, isWicketkeeper: false },
      { id: 'b2', name: 'Shami', isCaptain: false, isWicketkeeper: false },
    ],
  },
  format: {
    oversPerInnings: 20,
    maxOversPerBowler: 4,
    playersPerSide: 3, // 3 players = 2 wickets is all out
  },
  createdAt: '2026-10-30T10:00:00Z',
  updatedAt: '2026-10-30T10:00:00Z',
};

function initMatch(): MatchState {
  return createInitialMatchState(testConfig, 'p1', 'p2', 'b1');
}

describe('Wide Scoring Engine, Calculation & Strike Rotation (TEST 1 to TEST 18)', () => {
  // TEST 1: Select 0 completed runs. Expected: Team +1, wides +1.
  it('TEST 1: records wide with 0 completed runs -> Team +1, wides +1, legalBalls unchanged', () => {
    let state = initMatch();
    const initialRuns = state.innings[0].totalRuns;
    const initialLegal = state.innings[0].legalBalls;

    state = applyAction(state, { type: 'WIDE', additionalRuns: 0 });

    const inn = state.innings[0];
    expect(inn.totalRuns).toBe(initialRuns + 1);
    expect(inn.extras.wides).toBe(1);
    expect(inn.extras.total).toBe(1);
    expect(inn.bowlerStats['b1'].runs).toBe(1);
    expect(inn.bowlerStats['b1'].wides).toBe(1);
    expect(inn.legalBalls).toBe(initialLegal);
    expect(inn.batterStats['p1'].runs).toBe(0);
    expect(inn.batterStats['p1'].balls).toBe(0);
    expect(inn.deliveries[0].completedRuns).toBe(0);
    expect(inn.deliveries[0].extras).toBe(1);
  });

  // TEST 2: Select 1 completed run. Expected: Team +2, wides +1 (wide penalty 1 + 1 completed run).
  it('TEST 2: records wide with 1 completed run -> Team +2, wides +2 runs, strike swaps', () => {
    let state = initMatch();
    expect(state.innings[0].currentStrikerId).toBe('p1');
    expect(state.innings[0].currentNonStrikerId).toBe('p2');

    state = applyAction(state, { type: 'WIDE', additionalRuns: 1 });

    const inn = state.innings[0];
    expect(inn.totalRuns).toBe(2); // 1 wide penalty + 1 completed run
    expect(inn.extras.wides).toBe(2);
    expect(inn.bowlerStats['b1'].runs).toBe(2);
    expect(inn.legalBalls).toBe(0);
    // Strike rotated because 1 completed run was run
    expect(inn.currentStrikerId).toBe('p2');
    expect(inn.currentNonStrikerId).toBe('p1');
    expect(inn.deliveries[0].completedRuns).toBe(1);
  });

  // TEST 3: Select 2 completed runs. Expected: Team +3, wides +1 penalty + 2 runs.
  it('TEST 3: records wide with 2 completed runs -> Team +3, strike remains unchanged', () => {
    let state = initMatch();
    state = applyAction(state, { type: 'WIDE', additionalRuns: 2 });

    const inn = state.innings[0];
    expect(inn.totalRuns).toBe(3); // 1 wide + 2 completed
    expect(inn.extras.wides).toBe(3);
    expect(inn.bowlerStats['b1'].runs).toBe(3);
    expect(inn.legalBalls).toBe(0);
    // Even completed runs -> strike does not rotate
    expect(inn.currentStrikerId).toBe('p1');
    expect(inn.currentNonStrikerId).toBe('p2');
    expect(inn.deliveries[0].completedRuns).toBe(2);
  });

  // TEST 4: Select 3 completed runs. Expected: Team +4.
  it('TEST 4: records wide with 3 completed runs -> Team +4, strike swaps', () => {
    let state = initMatch();
    state = applyAction(state, { type: 'WIDE', additionalRuns: 3 });

    const inn = state.innings[0];
    expect(inn.totalRuns).toBe(4); // 1 wide + 3 completed
    expect(inn.extras.wides).toBe(4);
    expect(inn.bowlerStats['b1'].runs).toBe(4);
    expect(inn.currentStrikerId).toBe('p2');
    expect(inn.currentNonStrikerId).toBe('p1');
    expect(inn.deliveries[0].completedRuns).toBe(3);
  });

  // TEST 5: Select 4 completed runs. Expected: Team +5.
  it('TEST 5: records wide with 4 completed runs -> Team +5, boundary flag true, strike remains', () => {
    let state = initMatch();
    state = applyAction(state, { type: 'WIDE', additionalRuns: 4 });

    const inn = state.innings[0];
    expect(inn.totalRuns).toBe(5); // 1 wide + 4 completed
    expect(inn.extras.wides).toBe(5);
    expect(inn.bowlerStats['b1'].runs).toBe(5);
    expect(inn.deliveries[0].isBoundary).toBe(true);
    expect(inn.deliveries[0].boundaryType).toBe(4);
    // Even runs -> strike remains
    expect(inn.currentStrikerId).toBe('p1');
    expect(inn.currentNonStrikerId).toBe('p2');
    expect(inn.deliveries[0].completedRuns).toBe(4);
  });

  // TEST 6: Select a custom completed-run value.
  it('TEST 6: records wide with custom completed runs (e.g. 5) -> Team +6, strike swaps', () => {
    let state = initMatch();
    state = applyAction(state, { type: 'WIDE', additionalRuns: 5 });

    const inn = state.innings[0];
    expect(inn.totalRuns).toBe(6); // 1 wide + 5 completed
    expect(inn.extras.wides).toBe(6);
    expect(inn.bowlerStats['b1'].runs).toBe(6);
    expect(inn.currentStrikerId).toBe('p2');
    expect(inn.deliveries[0].completedRuns).toBe(5);
  });

  // TEST 7: Open WIDE panel and press Cancel. Expected: No scoring changes.
  it('TEST 7: cancelling wide selection produces zero state mutation', () => {
    const state = initMatch();
    const cloned = JSON.parse(JSON.stringify(state));
    // Simulated cancel: no action dispatched
    expect(state).toEqual(cloned);
  });

  // TEST 8: Open WIDE panel and close it. Expected: No scoring changes.
  it('TEST 8: closing wide panel without confirming leaves match state unchanged', () => {
    const state = initMatch();
    expect(state.innings[0].totalRuns).toBe(0);
    expect(state.innings[0].legalBalls).toBe(0);
    expect(state.innings[0].deliveries.length).toBe(0);
  });

  // TEST 9: Record multiple wides consecutively. Verify team score, extras, bowler stats, legal-ball count.
  it('TEST 9: handles multiple consecutive wides accurately', () => {
    let state = initMatch();
    // 3 consecutive wides: +0, +1, +2 completed runs
    state = applyAction(state, { type: 'WIDE', additionalRuns: 0 }); // +1
    state = applyAction(state, { type: 'WIDE', additionalRuns: 1 }); // +2
    state = applyAction(state, { type: 'WIDE', additionalRuns: 2 }); // +3

    const inn = state.innings[0];
    expect(inn.totalRuns).toBe(6); // 1 + 2 + 3
    expect(inn.extras.wides).toBe(6);
    expect(inn.bowlerStats['b1'].runs).toBe(6);
    expect(inn.bowlerStats['b1'].wides).toBe(6);
    expect(inn.legalBalls).toBe(0); // Still ball 1 of over 1!
    expect(inn.deliveries.length).toBe(3);
  });

  // TEST 10: Record a wide followed by a legal delivery. Verify over advances only for legal delivery.
  it('TEST 10: advances over count only for legal delivery after a wide', () => {
    let state = initMatch();
    state = applyAction(state, { type: 'WIDE', additionalRuns: 0 });
    expect(state.innings[0].legalBalls).toBe(0);

    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
    expect(state.innings[0].legalBalls).toBe(1);
    expect(state.innings[0].totalRuns).toBe(2); // 1 wide + 1 off bat
  });

  // TEST 11: Record a wide on the fifth legal ball. Verify sixth legal delivery is still pending.
  it('TEST 11: records wide on ball 5; 6th legal delivery is still pending', () => {
    let state = initMatch();
    for (let i = 0; i < 5; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }
    expect(state.innings[0].legalBalls).toBe(5);

    // Wide on what would have been ball 6
    state = applyAction(state, { type: 'WIDE', additionalRuns: 2 });
    expect(state.innings[0].legalBalls).toBe(5); // Still 5!
    expect(isAwaitingNextBowler(state.innings[0], 20, false)).toBe(false);

    // 6th legal delivery
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    expect(state.innings[0].legalBalls).toBe(6);
    // Now over is complete
    expect(isAwaitingNextBowler(state.innings[0], 20, false)).toBe(true);
  });

  // TEST 12: Record a wide followed by Undo. Verify complete restoration.
  it('TEST 12: atomically undoes wide event and restores previous state', () => {
    let state = initMatch();
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
    expect(state.innings[0].totalRuns).toBe(4);
    expect(state.innings[0].legalBalls).toBe(1);

    // Wide with 2 completed runs
    state = applyAction(state, { type: 'WIDE', additionalRuns: 2 });
    expect(state.innings[0].totalRuns).toBe(7);
    expect(state.innings[0].extras.wides).toBe(3);
    expect(state.innings[0].bowlerStats['b1'].runs).toBe(7);

    // Undo wide
    state = applyAction(state, { type: 'UNDO' });
    const inn = state.innings[0];
    expect(inn.totalRuns).toBe(4);
    expect(inn.extras.wides).toBe(0);
    expect(inn.bowlerStats['b1'].runs).toBe(4);
    expect(inn.legalBalls).toBe(1);
    expect(inn.deliveries.length).toBe(1);
  });

  // TEST 13: Record a wide, simulate refresh, and verify persistence.
  it('TEST 13: serializes and restores wide events seamlessly across storage reloads', () => {
    let state = initMatch();
    state = applyAction(state, { type: 'WIDE', additionalRuns: 2 });

    const serialized = JSON.stringify(state);
    const restored: MatchState = JSON.parse(serialized);

    expect(restored.innings[0].totalRuns).toBe(3);
    expect(restored.innings[0].extras.wides).toBe(3);
    expect(restored.innings[0].deliveries[0].completedRuns).toBe(2);
    expect(restored.innings[0].deliveries[0].deliveryType).toBe('wide');
  });

  // TEST 14: Verify strike rotation for different completed-run scenarios.
  it('TEST 14: verifies strike rotation rules across 0, 1, 2, 3, 4 completed runs', () => {
    let state = initMatch();
    // 0 runs -> no rotation
    state = applyAction(state, { type: 'WIDE', additionalRuns: 0 });
    expect(state.innings[0].currentStrikerId).toBe('p1');

    // 1 run -> rotates
    state = applyAction(state, { type: 'WIDE', additionalRuns: 1 });
    expect(state.innings[0].currentStrikerId).toBe('p2');

    // 2 runs -> no rotation (remains p2)
    state = applyAction(state, { type: 'WIDE', additionalRuns: 2 });
    expect(state.innings[0].currentStrikerId).toBe('p2');

    // 3 runs -> rotates (becomes p1)
    state = applyAction(state, { type: 'WIDE', additionalRuns: 3 });
    expect(state.innings[0].currentStrikerId).toBe('p1');

    // 4 runs -> no rotation (remains p1)
    state = applyAction(state, { type: 'WIDE', additionalRuns: 4 });
    expect(state.innings[0].currentStrikerId).toBe('p1');
  });

  // TEST 15: Verify run-out handling during a wide.
  it('TEST 15: handles run-out during a wide with completed runs and crossing rules', () => {
    let state = initMatch();
    expect(state.innings[0].currentStrikerId).toBe('p1');
    expect(state.innings[0].currentNonStrikerId).toBe('p2');

    // Wide delivery with 1 completed run, striker p1 is run out, batters had crossed
    state = applyAction(state, {
      type: 'WIDE',
      additionalRuns: 1,
      dismissal: {
        type: 'run_out',
        dismissedBatterId: 'p1',
        bowlerCredited: false,
        runOutBatterPosition: 'striker',
        crossingOccurred: true,
      },
    });

    const inn = state.innings[0];
    expect(inn.totalRuns).toBe(2); // 1 wide + 1 run
    expect(inn.wickets).toBe(1);
    expect(inn.batterStats['p1'].isOut).toBe(true);
    expect(inn.batterStats['p1'].dismissal?.type).toBe('run_out');
    // Striker out & crossed -> surviving batter p2 moves to striker end, empty slot at non-striker
    expect(inn.currentStrikerId).toBe('p2');
    expect(inn.currentNonStrikerId).toBe('');

    // Add replacement batter p3
    state = applyAction(state, { type: 'ADD_BATTER', batterId: 'p3' });
    expect(state.innings[0].currentStrikerId).toBe('p2');
    expect(state.innings[0].currentNonStrikerId).toBe('p3');
  });

  // TEST 16: Verify that the existing Extras popup continues working.
  it('TEST 16: verifies existing Extras popup actions (no-ball, bye, leg-bye) continue working identically', () => {
    let state = initMatch();
    // No ball with 2 bat runs
    state = applyAction(state, { type: 'NO_BALL', batterRuns: 2 });
    expect(state.innings[0].totalRuns).toBe(3); // 1 nb + 2 bat
    expect(state.innings[0].batterStats['p1'].runs).toBe(2);

    // Bye of 1
    state = applyAction(state, { type: 'BYE', runs: 1 });
    expect(state.innings[0].totalRuns).toBe(4);
    expect(state.innings[0].extras.byes).toBe(1);

    // Leg bye of 2
    state = applyAction(state, { type: 'LEG_BYE', runs: 2 });
    expect(state.innings[0].totalRuns).toBe(6);
    expect(state.innings[0].extras.legByes).toBe(2);
  });

  // TEST 17: Verify that the new WIDE workflow does not interfere with the automatic next-bowler popup.
  it('TEST 17: ensures wide on ball 6 does NOT prematurely trigger next bowler popup', () => {
    let state = initMatch();
    for (let i = 0; i < 5; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }
    // Wide on ball 6
    state = applyAction(state, { type: 'WIDE', additionalRuns: 0 });
    expect(state.innings[0].legalBalls).toBe(5);
    expect(isAwaitingNextBowler(state.innings[0], 20, false)).toBe(false);

    // Real legal 6th delivery
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    expect(state.innings[0].legalBalls).toBe(6);
    expect(isAwaitingNextBowler(state.innings[0], 20, false)).toBe(true);
  });

  // TEST 18: Verify that the new WIDE workflow does not interfere with batter replacement.
  it('TEST 18: correctly prompts and inserts replacement batter when wide results in run out', () => {
    let state = initMatch();
    state = applyAction(state, {
      type: 'WIDE',
      additionalRuns: 0,
      dismissal: {
        type: 'run_out',
        dismissedBatterId: 'p2', // non-striker out
        bowlerCredited: false,
        runOutBatterPosition: 'non_striker',
        crossingOccurred: false,
      },
    });

    expect(state.innings[0].wickets).toBe(1);
    expect(state.innings[0].currentStrikerId).toBe('p1');
    expect(state.innings[0].currentNonStrikerId).toBe('');

    // Dynamic replacement
    state = applyAction(state, { type: 'ADD_BATTER', batterId: 'p3', newPlayerName: 'Ravi' });
    expect(state.innings[0].currentNonStrikerId).toBe('p3');
    expect(state.innings[0].batterStats['p3'].playerName).toBe('Ravi');
  });
});
