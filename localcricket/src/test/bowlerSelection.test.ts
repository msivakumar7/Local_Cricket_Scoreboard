import { describe, it, expect } from 'vitest';
import { createInitialMatchState, applyAction } from '../domain/engine';
import { isAwaitingNextBowler, getMaxOversPerBowler, validateBowlerChange, shouldRotateStrike } from '../domain/rules';
import type { MatchConfig, MatchState } from '../domain/types';

const baseConfig: MatchConfig = {
  id: 'test-bowler-match',
  title: 'Championship Match',
  venue: 'National Stadium',
  date: '2026-10-30',
  tossWinnerId: 'team-a',
  tossDecision: 'bat',
  status: 'live',
  teamA: {
    id: 'team-a',
    name: 'India',
    players: [
      { id: 'p1', name: 'Rohit', isCaptain: true, isWicketkeeper: false },
      { id: 'p2', name: 'Kohli', isCaptain: false, isWicketkeeper: false },
      { id: 'p3', name: 'Surya', isCaptain: false, isWicketkeeper: false },
      { id: 'p4', name: 'Hardik', isCaptain: false, isWicketkeeper: false },
    ],
  },
  teamB: {
    id: 'team-b',
    name: 'Australia',
    players: [
      { id: 'b1', name: 'Starc', isCaptain: false, isWicketkeeper: false },
      { id: 'b2', name: 'Cummins', isCaptain: true, isWicketkeeper: false },
      { id: 'b3', name: 'Hazlewood', isCaptain: false, isWicketkeeper: false },
    ],
  },
  format: {
    oversPerInnings: 20,
    maxOversPerBowler: 4,
    playersPerSide: 4, // 4 players per side = 3 wickets is all out
  },
  createdAt: '2026-10-30T10:00:00Z',
  updatedAt: '2026-10-30T10:00:00Z',
};

function initMatch(customConfig = baseConfig): MatchState {
  return createInitialMatchState(customConfig, 'p1', 'p2', 'b1');
}

describe('Automatic Next Bowler Selection & Cricket Rules Audit (TEST 1 to TEST 15)', () => {
  // TEST 1: Complete six legal deliveries and verify that the next bowler popup opens
  it('TEST 1: completes six legal deliveries and detects that next bowler is required', () => {
    let state = initMatch();
    for (let i = 0; i < 6; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
    }

    const inn = state.innings[0];
    expect(inn.legalBalls).toBe(6);
    expect(isAwaitingNextBowler(inn, state.config.format.oversPerInnings, false)).toBe(true);
  });

  // TEST 2: Enter five legal deliveries and one wide. Verify that next bowler does not open
  it('TEST 2: enters 5 legal deliveries and 1 wide; verify next bowler popup does NOT open', () => {
    let state = initMatch();
    // 5 legal deliveries
    for (let i = 0; i < 5; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }
    // 1 wide
    state = applyAction(state, { type: 'WIDE', additionalRuns: 0 });

    const inn = state.innings[0];
    expect(inn.legalBalls).toBe(5); // Wide is not legal
    expect(inn.deliveries.length).toBe(6); // 6 deliveries bowled, but only 5 legal
    expect(isAwaitingNextBowler(inn, state.config.format.oversPerInnings, false)).toBe(false);
  });

  // TEST 3: Enter five legal deliveries and one no-ball. Verify that next bowler does not open
  it('TEST 3: enters 5 legal deliveries and 1 no-ball; verify next bowler popup does NOT open', () => {
    let state = initMatch();
    for (let i = 0; i < 5; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }
    // 1 no-ball
    state = applyAction(state, { type: 'NO_BALL', batterRuns: 0, extraRuns: 1 });

    const inn = state.innings[0];
    expect(inn.legalBalls).toBe(5); // No-ball is not legal
    expect(isAwaitingNextBowler(inn, state.config.format.oversPerInnings, false)).toBe(false);
  });

  // TEST 4: Complete six legal deliveries with a wicket on the sixth delivery
  it('TEST 4: handles wicket on 6th delivery, requires new batter first, then next bowler', () => {
    let state = initMatch();
    for (let i = 0; i < 5; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }
    // Ball 6: striker p1 is dismissed
    state = applyAction(state, {
      type: 'WICKET',
      dismissal: { type: 'bowled', dismissedBatterId: 'p1', bowlerCredited: true },
      runs: 0,
    });

    const inn = state.innings[0];
    expect(inn.legalBalls).toBe(6);
    expect(inn.wickets).toBe(1);

    // Batter slot is vacant -> needs new batter
    const needsNewBatter = !inn.currentStrikerId || !inn.currentNonStrikerId;
    expect(needsNewBatter).toBe(true);

    // Over is complete, but UI coordinates by prompting new batter first
    expect(isAwaitingNextBowler(inn, state.config.format.oversPerInnings, false)).toBe(true);

    // Scorer enters replacement batter p3 (Surya)
    state = applyAction(state, {
      type: 'ADD_BATTER',
      batterId: 'p3',
    });

    const innAfterBatter = state.innings[0];
    expect(innAfterBatter.currentStrikerId).toBeTruthy();
    expect(innAfterBatter.currentNonStrikerId).toBeTruthy();
    // Now waiting for next bowler
    expect(isAwaitingNextBowler(innAfterBatter, state.config.format.oversPerInnings, false)).toBe(true);
  });

  // TEST 5: Verify that the previous over's bowler is not available for the immediately following over
  it('TEST 5: prevents previous over bowler from bowling consecutive overs', () => {
    let state = initMatch();
    for (let i = 0; i < 6; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }

    const lastBowlerId = 'b1'; // Starc
    const validationStarc = validateBowlerChange('b1', lastBowlerId, 6, 4);
    expect(validationStarc.valid).toBe(false);
    expect(validationStarc.reason).toContain('consecutive');

    const validationCummins = validateBowlerChange('b2', lastBowlerId, 0, 4);
    expect(validationCummins.valid).toBe(true);
  });

  // TEST 6: Verify that a bowler who has reached maximum overs is unavailable
  it('TEST 6: prevents bowler who has reached max overs limit from bowling again', () => {
    const maxOvers = 4;
    // Bowler has bowled 24 legal balls (4 overs)
    const validation = validateBowlerChange('b2', 'b1', 24, maxOvers);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('quota');
  });

  // TEST 7: Verify that a bowler becomes eligible again after an intervening over
  it('TEST 7: allows bowler to bowl again after another bowler completes an intervening over', () => {
    let state = initMatch();
    // Over 1 bowled by b1 (Starc)
    for (let i = 0; i < 6; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }
    // Switch to b2 (Cummins) for Over 2
    state = applyAction(state, { type: 'CHANGE_BOWLER', bowlerId: 'b2' });
    expect(state.innings[0].currentBowlerId).toBe('b2');

    // Over 2 bowled by b2 (Cummins)
    for (let i = 0; i < 6; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }

    // Now after Over 2, lastBowlerId is b2 (Cummins).
    // Starc (b1) has bowled 1 over (6 balls), max is 4.
    const validationStarc = validateBowlerChange('b1', 'b2', 6, 4);
    expect(validationStarc.valid).toBe(true);

    // Cummins (b2) is ineligible due to consecutive over rule
    const validationCummins = validateBowlerChange('b2', 'b2', 6, 4);
    expect(validationCummins.valid).toBe(false);
  });

  // TEST 8: Verify that the correct batter faces the first delivery of the next over
  it('TEST 8: correctly determines who faces the first delivery of the next over', () => {
    let state = initMatch();
    // Ball 1 to 5: 0 runs each -> p1 remains on strike
    for (let i = 0; i < 5; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }
    expect(state.innings[0].currentStrikerId).toBe('p1');
    expect(state.innings[0].currentNonStrikerId).toBe('p2');

    // Case A: Dot ball on ball 6 -> strike rotates for new over (ends swap)
    // Non-striker p2 will face over 2 ball 1
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    expect(state.innings[0].currentStrikerId).toBe('p2');
    expect(state.innings[0].currentNonStrikerId).toBe('p1');

    // Change bowler to b2 and bowl ball 1 of over 2
    state = applyAction(state, { type: 'CHANGE_BOWLER', bowlerId: 'b2' });
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 }); // p2 takes single
    expect(state.innings[0].batterStats['p2'].balls).toBe(1);
    expect(state.innings[0].batterStats['p2'].runs).toBe(1);
  });

  // TEST 9: Verify that state is pure and bottom sheet condition is idempotent across multiple calls
  it('TEST 9: ensures isAwaitingNextBowler is pure, deterministic and stable across re-renders', () => {
    let state = initMatch();
    for (let i = 0; i < 6; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }

    // Multiple calls return exact same value without mutating state
    const call1 = isAwaitingNextBowler(state.innings[0], 20, false);
    const call2 = isAwaitingNextBowler(state.innings[0], 20, false);
    const call3 = isAwaitingNextBowler(state.innings[0], 20, false);
    expect(call1).toBe(true);
    expect(call2).toBe(true);
    expect(call3).toBe(true);
  });

  // TEST 10: Refresh the browser while the bowler selection popup is open. Verify pending selection is restored
  it('TEST 10: restores pending bowler selection state after simulated browser refresh / reload', () => {
    let state = initMatch();
    for (let i = 0; i < 6; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }

    // Serialize to JSON (simulating IndexedDB save) and deserialize (simulating browser reload)
    const serialized = JSON.stringify(state);
    const restoredState: MatchState = JSON.parse(serialized);

    expect(restoredState.innings[0].legalBalls).toBe(6);
    expect(isAwaitingNextBowler(restoredState.innings[0], 20, false)).toBe(true);
  });

  // TEST 11: Verify Undo after selecting a new bowler
  it('TEST 11: handles Undo cleanly after selecting a new bowler and after bowling the next ball', () => {
    let state = initMatch();
    // Over 1: 6 balls with bowler b1
    for (let i = 0; i < 6; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
    }
    expect(isAwaitingNextBowler(state.innings[0], 20, false)).toBe(true);

    // Select new bowler b2
    state = applyAction(state, { type: 'CHANGE_BOWLER', bowlerId: 'b2' });
    expect(state.innings[0].currentBowlerId).toBe('b2');
    expect(isAwaitingNextBowler(state.innings[0], 20, false)).toBe(false);

    // Undo the CHANGE_BOWLER action
    state = applyAction(state, { type: 'UNDO' });
    expect(state.innings[0].currentBowlerId).toBe('b1');
    expect(isAwaitingNextBowler(state.innings[0], 20, false)).toBe(true);

    // Select b2 again and bowl ball 1 of Over 2
    state = applyAction(state, { type: 'CHANGE_BOWLER', bowlerId: 'b2' });
    state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
    expect(state.innings[0].legalBalls).toBe(7);
    expect(state.innings[0].bowlerStats['b2'].runs).toBe(4);

    // Undo ball 1 of Over 2
    state = applyAction(state, { type: 'UNDO' });
    expect(state.innings[0].legalBalls).toBe(6);
    expect(state.innings[0].currentBowlerId).toBe('b2');
  });

  // TEST 12: Verify that an innings ending after the final wicket does not request another bowler
  it('TEST 12: does not request another bowler when team is all-out on ball 6', () => {
    let state = initMatch();
    // Team has 4 players -> 3 wickets = all out
    // Wicket 1 & 2 mid-over
    state = applyAction(state, {
      type: 'WICKET',
      dismissal: { type: 'bowled', dismissedBatterId: 'p1', bowlerCredited: true },
      runs: 0,
    });
    state = applyAction(state, { type: 'ADD_BATTER', batterId: 'p3' });

    state = applyAction(state, {
      type: 'WICKET',
      dismissal: { type: 'bowled', dismissedBatterId: 'p2', bowlerCredited: true },
      runs: 0,
    });
    state = applyAction(state, { type: 'ADD_BATTER', batterId: 'p4' });

    // 3 dot balls
    for (let i = 0; i < 3; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }
    expect(state.innings[0].legalBalls).toBe(5);

    // Ball 6 is the final wicket (3rd wicket = all out for 4 players)
    state = applyAction(state, {
      type: 'WICKET',
      dismissal: { type: 'bowled', dismissedBatterId: 'p3', bowlerCredited: true },
      runs: 0,
    });

    const inn = state.innings[0];
    expect(inn.wickets).toBe(3);
    expect(inn.status).toBe('completed');
    expect(state.status).toBe('innings_break');
    // Does NOT request bowler
    expect(isAwaitingNextBowler(inn, state.config.format.oversPerInnings, true)).toBe(false);
  });

  // TEST 13: Verify that reaching the configured maximum innings overs ends innings without requesting bowler
  it('TEST 13: does not request another bowler when innings overs limit is reached', () => {
    // 1-over match
    const oneOverConfig: MatchConfig = {
      ...baseConfig,
      format: { oversPerInnings: 1, maxOversPerBowler: 1, playersPerSide: 4 },
    };
    let state = initMatch(oneOverConfig);
    for (let i = 0; i < 6; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
    }

    const inn = state.innings[0];
    expect(inn.legalBalls).toBe(6);
    expect(inn.status).toBe('completed');
    expect(inn.completionReason).toBe('overs_complete');
    // Does NOT request another bowler
    expect(isAwaitingNextBowler(inn, 1, false)).toBe(false);
  });

  // TEST 14: Verify that selecting a bowler updates scorecard and bowling figures correctly
  it('TEST 14: updates scorecard and bowler stats accurately after bowler selection', () => {
    let state = initMatch();
    // Over 1 by b1
    for (let i = 0; i < 6; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 2 });
    }
    expect(state.innings[0].bowlerStats['b1'].runs).toBe(12);
    expect(state.innings[0].bowlerStats['b1'].legalBalls).toBe(6);

    // Select b2
    state = applyAction(state, { type: 'CHANGE_BOWLER', bowlerId: 'b2' });
    expect(state.innings[0].bowlerStats['b2']).toBeDefined();
    expect(state.innings[0].bowlerStats['b2'].runs).toBe(0);
    expect(state.innings[0].bowlerStats['b2'].legalBalls).toBe(0);

    // b2 bowls ball 1 and takes a wicket
    state = applyAction(state, {
      type: 'WICKET',
      dismissal: { type: 'bowled', dismissedBatterId: state.innings[0].currentStrikerId, bowlerCredited: true },
      runs: 0,
    });
    expect(state.innings[0].bowlerStats['b2'].wickets).toBe(1);
    expect(state.innings[0].bowlerStats['b2'].legalBalls).toBe(1);
  });

  // TEST 15: Verify all existing player-entry and name-editing features still work cleanly
  it('TEST 15: preserves player-entry and inline name edits alongside bowler changes', () => {
    let state = initMatch();
    // Add dynamic bowler 'b4'
    state = applyAction(state, {
      type: 'ADD_BOWLER',
      bowlerId: 'b4',
      bowlerName: 'Nathan Lyon',
    });
    expect(state.config.teamB.players.find(p => p.id === 'b4')?.name).toBe('Nathan Lyon');

    // Over 1 by b1
    for (let i = 0; i < 6; i++) {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
    }

    // Select dynamic bowler b4
    state = applyAction(state, { type: 'CHANGE_BOWLER', bowlerId: 'b4' });
    expect(state.innings[0].currentBowlerId).toBe('b4');

    // Edit b4's name
    state = applyAction(state, {
      type: 'UPDATE_PLAYER_NAME',
      playerId: 'b4',
      newName: 'Nathan Lyon (GOAT)',
    });
    expect(state.config.teamB.players.find(p => p.id === 'b4')?.name).toBe('Nathan Lyon (GOAT)');
    expect(state.innings[0].bowlerStats['b4'].playerName).toBe('Nathan Lyon (GOAT)');
  });
});
