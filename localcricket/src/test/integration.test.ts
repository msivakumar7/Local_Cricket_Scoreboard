import { describe, it, expect, vi } from 'vitest';
import {
  createInitialMatchState,
  applyAction,
  addNewBatter,
  checkTargetReached,
} from '../domain/engine';
import { exportMatchJSON, importMatchJSON } from '../services/exportService';
import type { MatchConfig, MatchState, DismissalInfo } from '../domain/types';

describe('LocalCricket Full Lifecycle Integration', () => {
  it('simulates a complete 2-innings match, verifies stats, result, and export', async () => {
    // 1. Create a 2-over match with 3 players per side (2 wickets = all out)
    const config: MatchConfig = {
      id: 'match-integration-1',
      title: 'Championship Final',
      venue: 'Lord\'s Recreation Ground',
      date: '2026-10-27',
      format: {
        oversPerInnings: 2, // 2 overs
        maxOversPerBowler: 1,
        playersPerSide: 3, // 2 wickets = all out
      },
      teamA: {
        id: 'team-a',
        name: 'Thunder',
        players: [
          { id: 't1', name: 'Alex Hales', isCaptain: true, isWicketkeeper: false },
          { id: 't2', name: 'Jos Buttler', isCaptain: false, isWicketkeeper: true },
          { id: 't3', name: 'Ben Stokes', isCaptain: false, isWicketkeeper: false },
        ],
      },
      teamB: {
        id: 'team-b',
        name: 'Lightning',
        players: [
          { id: 'l1', name: 'Mitchell Starc', isCaptain: false, isWicketkeeper: false },
          { id: 'l2', name: 'Pat Cummins', isCaptain: true, isWicketkeeper: false },
          { id: 'l3', name: 'Glenn Maxwell', isCaptain: false, isWicketkeeper: false },
        ],
      },
      tossWinnerId: 'team-a',
      tossDecision: 'bat',
      status: 'live',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Thunder bats first: t1 (striker), t2 (non-striker), l1 (bowler)
    let state = createInitialMatchState(config, 't1', 't2', 'l1');
    expect(state.status).toBe('live');
    expect(state.currentInningsIndex).toBe(0);

    // ==========================================
    // OVER 1 (bowled by Mitchell Starc l1)
    // Ball 1: 4 runs (Alex Hales hits a boundary)
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
    expect(state.innings[0].totalRuns).toBe(4);
    expect(state.innings[0].currentStrikerId).toBe('t1'); // retains strike

    // Ball 2: 1 wide
    state = applyAction(state, { type: 'WIDE', additionalRuns: 0 });
    expect(state.innings[0].totalRuns).toBe(5);
    expect(state.innings[0].legalBalls).toBe(1); // wide doesn't increment legal balls

    // Ball 2 (legal): 1 single (Alex Hales takes single, strike rotates to Jos Buttler)
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
    expect(state.innings[0].totalRuns).toBe(6);
    expect(state.innings[0].legalBalls).toBe(2);
    expect(state.innings[0].currentStrikerId).toBe('t2'); // Buttler on strike

    // Ball 3: 6 runs (Jos Buttler hits a six)
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });
    expect(state.innings[0].totalRuns).toBe(12);

    // Ball 4: Wicket! Jos Buttler is bowled by Starc
    const bowledDismissal: DismissalInfo = {
      type: 'bowled',
      dismissedBatterId: 't2',
      bowlerCredited: true,
    };
    state = applyAction(state, { type: 'WICKET', dismissal: bowledDismissal, runs: 0 });
    expect(state.innings[0].wickets).toBe(1);
    expect(state.innings[0].bowlerStats['l1'].wickets).toBe(1);
    // New batter comes in to face next ball: slot for new batter is currentStrikerId
    expect(state.innings[0].currentStrikerId).toBe('');
    expect(state.innings[0].currentNonStrikerId).toBe('t1'); // Hales at non-striker

    // Ben Stokes arrives at crease
    state = addNewBatter(state, 't3');
    expect(state.innings[0].currentStrikerId).toBe('t3');

    // Ball 5: 0 dot ball
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });

    // Ball 6: 1 single by Ben Stokes (end of over!)
    // Odd run on ball 6: Stokes runs to far end, bowling changes to that end,
    // so Stokes retains strike for over 2!
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
    expect(state.innings[0].legalBalls).toBe(6);
    expect(state.innings[0].totalRuns).toBe(13);
    expect(state.innings[0].currentStrikerId).toBe('t3'); // Stokes retains strike!

    // ==========================================
    // OVER 2 (bowler change to Pat Cummins l2)
    state = applyAction(state, { type: 'CHANGE_BOWLER', bowlerId: 'l2' });
    expect(state.innings[0].currentBowlerId).toBe('l2');

    // Ball 1: 2 runs
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 2 });
    // Ball 2: 4 runs
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
    // Ball 3: 0 dot
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    // Ball 4: 1 run (rotates strike to Hales t1)
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
    expect(state.innings[0].currentStrikerId).toBe('t1');

    // Ball 5: 6 runs by Hales
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });

    // Ball 6: Wicket! Hales is caught off Cummins
    const caughtDismissal: DismissalInfo = {
      type: 'caught',
      dismissedBatterId: 't1',
      fielderId: 'l3',
      bowlerCredited: true,
    };
    state = applyAction(state, { type: 'WICKET', dismissal: caughtDismissal, runs: 0 });

    // 2 overs complete and 2 wickets down (all out for 3-player team)
    // Innings 1 completes automatically!
    expect(state.status).toBe('innings_break');
    const inn1 = state.innings[0];
    expect(inn1.status).toBe('completed');
    expect(inn1.totalRuns).toBe(26);
    expect(inn1.wickets).toBe(2);

    // ==========================================
    // INNINGS 2: Lightning chases 27 to win
    state = applyAction(state, {
      type: 'START_NEXT_INNINGS',
      strikerId: 'l1',
      nonStrikerId: 'l2',
      bowlerId: 't1',
    });

    expect(state.status).toBe('live');
    expect(state.currentInningsIndex).toBe(1);
    expect(state.innings[1].target).toBe(27);

    // Over 1 (bowled by t1)
    // 6, 6, 6, 4, 4, 1 = 27 runs scored off 6 balls!
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
    expect(state.status).toBe('live'); // 26 runs, need 27

    // Winning hit: 1 single on 6th ball to reach target 27!
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });

    // Target reached immediately!
    expect(checkTargetReached(state)).toBe(true);
    expect(state.status).toBe('completed');
    expect(state.result?.winner).toBe('teamB');
    expect(state.result?.winnerName).toBe('Lightning');
    expect(state.result?.resultText).toContain('Lightning won by 2 wickets (with 6 balls remaining)');

    // ==========================================
    // Verify JSON export and import
    const jsonString = JSON.stringify(state);
    expect(jsonString).toBeDefined();

    // Verify import validation rejects bad input
    const badImport = await importMatchJSON('{"bad": true}');
    expect(badImport).toBe(false);
  });
});
