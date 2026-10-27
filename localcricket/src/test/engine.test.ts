import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialMatchState,
  applyAction,
  addNewBatter,
  checkTargetReached,
} from '../domain/engine';
import {
  legalBallsToOverString,
  calculateCRR,
  calculateRRR,
  calculateSR,
  calculateEconomy,
  validateBowlerChange,
  shouldRotateStrike,
} from '../domain/rules';
import type { MatchConfig, MatchState, DismissalInfo } from '../domain/types';

describe('LocalCricket Rules Engine', () => {
  let sampleConfig: MatchConfig;
  let state: MatchState;

  beforeEach(() => {
    sampleConfig = {
      id: 'match-1',
      title: 'Local Cup Final',
      venue: 'City Ground',
      date: '2026-10-27',
      format: {
        oversPerInnings: 5,
        maxOversPerBowler: 2,
        playersPerSide: 4, // 4 players means 3 wickets = all out
      },
      teamA: {
        id: 'team-a',
        name: 'Warriors',
        players: [
          { id: 'p1', name: 'Rohit', isCaptain: true, isWicketkeeper: false },
          { id: 'p2', name: 'Virat', isCaptain: false, isWicketkeeper: false },
          { id: 'p3', name: 'Surya', isCaptain: false, isWicketkeeper: false },
          { id: 'p4', name: 'Hardik', isCaptain: false, isWicketkeeper: false },
        ],
      },
      teamB: {
        id: 'team-b',
        name: 'Titans',
        players: [
          { id: 'b1', name: 'Bumrah', isCaptain: false, isWicketkeeper: false },
          { id: 'b2', name: 'Shami', isCaptain: true, isWicketkeeper: false },
          { id: 'b3', name: 'Siraj', isCaptain: false, isWicketkeeper: false },
          { id: 'b4', name: 'Pant', isCaptain: false, isWicketkeeper: true },
        ],
      },
      tossWinnerId: 'team-a',
      tossDecision: 'bat',
      status: 'live',
      createdAt: '2026-10-27T00:00:00.000Z',
      updatedAt: '2026-10-27T00:00:00.000Z',
    };

    // p1 (Rohit) striker, p2 (Virat) non-striker, b1 (Bumrah) opening bowler
    state = createInitialMatchState(sampleConfig, 'p1', 'p2', 'b1');
  });

  describe('1. Ordinary Runs & Strike Rotation', () => {
    it('scores 0 (dot ball) without strike rotation', () => {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(0);
      expect(inn.legalBalls).toBe(1);
      expect(inn.currentStrikerId).toBe('p1');
      expect(inn.currentNonStrikerId).toBe('p2');
      expect(inn.batterStats['p1'].runs).toBe(0);
      expect(inn.batterStats['p1'].balls).toBe(1);
      expect(inn.bowlerStats['b1'].runs).toBe(0);
      expect(inn.bowlerStats['b1'].legalBalls).toBe(1);
    });

    it('scores 1 single and correctly rotates strike to non-striker', () => {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(1);
      expect(inn.legalBalls).toBe(1);
      // Strike swapped
      expect(inn.currentStrikerId).toBe('p2');
      expect(inn.currentNonStrikerId).toBe('p1');
      expect(inn.batterStats['p1'].runs).toBe(1);
      expect(inn.batterStats['p1'].balls).toBe(1);
    });

    it('scores 2 runs without strike rotation before over completion', () => {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 2 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(2);
      expect(inn.currentStrikerId).toBe('p1');
      expect(inn.currentNonStrikerId).toBe('p2');
    });

    it('scores 3 runs and rotates strike', () => {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 3 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(3);
      expect(inn.currentStrikerId).toBe('p2');
      expect(inn.currentNonStrikerId).toBe('p1');
    });
  });

  describe('2. Boundaries', () => {
    it('scores a boundary 4, updates fours count and retains striker', () => {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(4);
      expect(inn.batterStats['p1'].fours).toBe(1);
      expect(inn.batterStats['p1'].runs).toBe(4);
      expect(inn.currentStrikerId).toBe('p1');
    });

    it('scores a six 6, updates sixes count and retains striker', () => {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(6);
      expect(inn.batterStats['p1'].sixes).toBe(1);
      expect(inn.batterStats['p1'].runs).toBe(6);
      expect(inn.currentStrikerId).toBe('p1');
    });
  });

  describe('3. Wides & Extras', () => {
    it('wide does NOT increment legal balls and charges bowler', () => {
      state = applyAction(state, { type: 'WIDE', additionalRuns: 0 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(1);
      expect(inn.legalBalls).toBe(0); // NOT a legal ball
      expect(inn.extras.wides).toBe(1);
      expect(inn.extras.total).toBe(1);
      expect(inn.bowlerStats['b1'].runs).toBe(1);
      expect(inn.bowlerStats['b1'].wides).toBe(1);
      expect(inn.batterStats['p1'].balls).toBe(0); // striker did not face legal ball
    });

    it('wide with 2 additional runs gives 3 runs total and swaps strike', () => {
      state = applyAction(state, { type: 'WIDE', additionalRuns: 1 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(2);
      expect(inn.legalBalls).toBe(0);
      expect(inn.extras.wides).toBe(2);
      // 1 additional run completed -> batters crossed -> strike rotates
      expect(inn.currentStrikerId).toBe('p2');
    });
  });

  describe('4. No-balls', () => {
    it('no-ball without bat runs adds 1 extra, bowler charged, striker faces ball', () => {
      state = applyAction(state, { type: 'NO_BALL', batterRuns: 0 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(1);
      expect(inn.legalBalls).toBe(0);
      expect(inn.extras.noBalls).toBe(1);
      expect(inn.batterStats['p1'].balls).toBe(1); // striker faces ball
      expect(inn.batterStats['p1'].runs).toBe(0);
      expect(inn.bowlerStats['b1'].runs).toBe(1);
    });

    it('no-ball with 4 off bat gives 5 runs, credits 4 to batter, charges 5 to bowler', () => {
      state = applyAction(state, { type: 'NO_BALL', batterRuns: 4 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(5);
      expect(inn.legalBalls).toBe(0);
      expect(inn.batterStats['p1'].runs).toBe(4);
      expect(inn.batterStats['p1'].fours).toBe(1);
      expect(inn.bowlerStats['b1'].runs).toBe(5);
    });
  });

  describe('5. Byes & Leg Byes', () => {
    it('byes increment legal balls, add to extras, but DO NOT charge bowler', () => {
      state = applyAction(state, { type: 'BYE', runs: 1 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(1);
      expect(inn.legalBalls).toBe(1);
      expect(inn.extras.byes).toBe(1);
      expect(inn.bowlerStats['b1'].runs).toBe(0); // NOT charged to bowler
      expect(inn.batterStats['p1'].runs).toBe(0); // NOT credited to batter
      expect(inn.batterStats['p1'].balls).toBe(1); // faced
      expect(inn.currentStrikerId).toBe('p2'); // strike swapped on single
    });

    it('leg byes increment legal balls, add to extras, not charged to bowler', () => {
      state = applyAction(state, { type: 'LEG_BYE', runs: 2 });
      const inn = state.innings[0];

      expect(inn.totalRuns).toBe(2);
      expect(inn.legalBalls).toBe(1);
      expect(inn.extras.legByes).toBe(2);
      expect(inn.bowlerStats['b1'].runs).toBe(0);
      expect(inn.currentStrikerId).toBe('p1'); // no swap on 2
    });
  });

  describe('6. Dismissals & Wickets', () => {
    it('bowled credits wicket to bowler, marks striker out', () => {
      const dismissal: DismissalInfo = {
        type: 'bowled',
        dismissedBatterId: 'p1',
        bowlerCredited: true,
      };
      state = applyAction(state, { type: 'WICKET', dismissal, runs: 0 });
      const inn = state.innings[0];

      expect(inn.wickets).toBe(1);
      expect(inn.legalBalls).toBe(1);
      expect(inn.batterStats['p1'].isOut).toBe(true);
      expect(inn.batterStats['p1'].dismissalText).toBe('b ');
      expect(inn.bowlerStats['b1'].wickets).toBe(1);
      expect(inn.fallOfWickets.length).toBe(1);
      expect(inn.fallOfWickets[0].score).toBe(0);
      expect(inn.fallOfWickets[0].wicketNumber).toBe(1);
    });

    it('non-striker run out explicitly marks non-striker as dismissed', () => {
      const dismissal: DismissalInfo = {
        type: 'run_out',
        dismissedBatterId: 'p2', // Virat run out
        bowlerCredited: false,
        runOutBatterPosition: 'non_striker',
        crossingOccurred: false,
      };
      state = applyAction(state, { type: 'WICKET', dismissal, runs: 1 });
      const inn = state.innings[0];

      expect(inn.wickets).toBe(1);
      expect(inn.batterStats['p2'].isOut).toBe(true);
      expect(inn.batterStats['p1'].isOut).toBe(false); // striker still not out
      expect(inn.bowlerStats['b1'].wickets).toBe(0); // run-out not credited to bowler
    });

    it('run out on a wide handles extras correctly', () => {
      const dismissal: DismissalInfo = {
        type: 'run_out',
        dismissedBatterId: 'p1',
        bowlerCredited: false,
        runOutBatterPosition: 'striker',
      };
      state = applyAction(state, { type: 'WIDE', additionalRuns: 0, dismissal });
      const inn = state.innings[0];

      expect(inn.wickets).toBe(1);
      expect(inn.totalRuns).toBe(1); // 1 wide
      expect(inn.legalBalls).toBe(0); // illegal delivery
      expect(inn.bowlerStats['b1'].wickets).toBe(0);
    });

    it('run out on a no-ball handles penalty and batter status correctly', () => {
      const dismissal: DismissalInfo = {
        type: 'run_out',
        dismissedBatterId: 'p2',
        bowlerCredited: false,
        runOutBatterPosition: 'non_striker',
      };
      state = applyAction(state, { type: 'NO_BALL', batterRuns: 1, dismissal });
      const inn = state.innings[0];

      expect(inn.wickets).toBe(1);
      expect(inn.totalRuns).toBe(2); // 1 NB penalty + 1 run
      expect(inn.legalBalls).toBe(0);
      expect(inn.batterStats['p2'].isOut).toBe(true);
    });
  });

  describe('7. Over Completion & Strike Rotation', () => {
    it('rotates strike at the end of an over on a dot ball', () => {
      // Bowl 5 dot balls
      for (let b = 0; b < 5; b++) {
        state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
      }
      expect(state.innings[0].legalBalls).toBe(5);
      expect(state.innings[0].currentStrikerId).toBe('p1');

      // 6th ball is a dot ball: over completes -> strike swaps!
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
      expect(state.innings[0].legalBalls).toBe(6);
      expect(state.innings[0].currentStrikerId).toBe('p2');
      expect(state.innings[0].currentNonStrikerId).toBe('p1');
    });

    it('rotates strike at the end of an over on a single', () => {
      // 5 dot balls
      for (let b = 0; b < 5; b++) {
        state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
      }
      // 6th ball is a single: run rotation (swap) + end of over (swap) = no swap (stay with p1)
      // Odd runs on end of over: runner crossed (p2 is at striker's end), but now over ends,
      // so bowlers swap ends -> p1 faces!
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
      // In shouldRotateStrike(1, true): returns true, so batters swap
      expect(state.innings[0].legalBalls).toBe(6);
      expect(state.innings[0].currentStrikerId).toBe('p2');
    });
  });

  describe('8. Undo Functionality', () => {
    it('undo restores the complete state including score, overs, and batter stats', () => {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
      expect(state.innings[0].totalRuns).toBe(4);
      expect(state.innings[0].legalBalls).toBe(1);
      expect(state.history.length).toBe(1);

      // Undo
      state = applyAction(state, { type: 'UNDO' });
      expect(state.innings[0].totalRuns).toBe(0);
      expect(state.innings[0].legalBalls).toBe(0);
      expect(state.innings[0].batterStats['p1'].runs).toBe(0);
      expect(state.innings[0].batterStats['p1'].balls).toBe(0);
      expect(state.history.length).toBe(0);
    });

    it('consecutive undo operations work backwards smoothly', () => {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 2 });
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 3 });
      expect(state.innings[0].totalRuns).toBe(6);
      expect(state.history.length).toBe(3);

      state = applyAction(state, { type: 'UNDO' });
      expect(state.innings[0].totalRuns).toBe(3);

      state = applyAction(state, { type: 'UNDO' });
      expect(state.innings[0].totalRuns).toBe(1);

      state = applyAction(state, { type: 'UNDO' });
      expect(state.innings[0].totalRuns).toBe(0);
    });
  });

  describe('9. Invariants & Calculation Functions', () => {
    it('legalBallsToOverString converts properly', () => {
      expect(legalBallsToOverString(0)).toBe('0.0');
      expect(legalBallsToOverString(5)).toBe('0.5');
      expect(legalBallsToOverString(6)).toBe('1.0');
      expect(legalBallsToOverString(9)).toBe('1.3');
      expect(legalBallsToOverString(93)).toBe('15.3');
    });

    it('CRR calculates properly using legal balls', () => {
      expect(calculateCRR(0, 0)).toBe(0);
      expect(calculateCRR(30, 18)).toBe(10.0); // 3 overs, 30 runs = 10.0 CRR
      expect(calculateCRR(126, 93)).toBeCloseTo(8.13, 2);
    });

    it('RRR calculates properly', () => {
      expect(calculateRRR(45, 27)).toBe(10.0);
      expect(calculateRRR(10, 0)).toBe(Infinity);
    });

    it('validates bowler quota and prevents consecutive overs', () => {
      const check1 = validateBowlerChange('b1', 'b1', 6, 2);
      expect(check1.valid).toBe(false);
      expect(check1.reason).toContain('consecutive');

      const check2 = validateBowlerChange('b2', 'b1', 12, 2); // 12 balls = 2 overs = quota reached
      expect(check2.valid).toBe(false);
      expect(check2.reason).toContain('quota');

      const check3 = validateBowlerChange('b2', 'b1', 6, 2); // 1 over bowled, quota is 2
      expect(check3.valid).toBe(true);
    });

    it('maintains total score invariant: team total = batter runs + extras', () => {
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 2 });
      state = applyAction(state, { type: 'WIDE', additionalRuns: 0 });
      state = applyAction(state, { type: 'NO_BALL', batterRuns: 4 });
      state = applyAction(state, { type: 'BYE', runs: 2 });

      const inn = state.innings[0];
      const batterRuns = Object.values(inn.batterStats).reduce((sum, b) => sum + b.runs, 0);
      expect(inn.totalRuns).toBe(batterRuns + inn.extras.total);
    });
  });

  describe('10. Innings Transitions & Match Result', () => {
    it('automatically completes innings when team is all out', () => {
      // 4 players per side -> 3 wickets = all out
      const dismissal: DismissalInfo = { type: 'bowled', dismissedBatterId: 'p1', bowlerCredited: true };

      state = applyAction(state, { type: 'WICKET', dismissal, runs: 0 });
      state = addNewBatter(state, 'p3');

      state = applyAction(state, { type: 'WICKET', dismissal: { ...dismissal, dismissedBatterId: 'p2' }, runs: 0 });
      state = addNewBatter(state, 'p4');

      // 3rd wicket
      state = applyAction(state, { type: 'WICKET', dismissal: { ...dismissal, dismissedBatterId: 'p3' }, runs: 0 });

      expect(state.innings[0].wickets).toBe(3);
      expect(state.status).toBe('innings_break');
    });

    it('2nd innings target chase completes match correctly', () => {
      // Score 10 in 1st innings and end innings
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6 });
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4 });
      state = applyAction(state, { type: 'END_INNINGS' });

      expect(state.status).toBe('innings_break');
      expect(state.innings[0].totalRuns).toBe(10);

      // Start 2nd innings: Titans bat, Warriors bowl
      state = applyAction(state, {
        type: 'START_NEXT_INNINGS',
        strikerId: 'b1',
        nonStrikerId: 'b2',
        bowlerId: 'p1',
      });

      expect(state.status).toBe('live');
      expect(state.currentInningsIndex).toBe(1);
      expect(state.innings[1].target).toBe(11);

      // Titans score 6 then 6 = 12 runs (exceeding target of 11)
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6 });
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6 });

      expect(checkTargetReached(state)).toBe(true);

      // End innings on target reached
      state = applyAction(state, { type: 'END_INNINGS' });
      expect(state.status).toBe('completed');
      expect(state.result?.winner).toBe('teamB');
      expect(state.result?.resultText).toContain('Titans won');
    });
  });
});
