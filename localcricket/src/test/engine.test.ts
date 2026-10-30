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

  function createTestMatch(): MatchState {
    return createInitialMatchState(sampleConfig, 'p1', 'p2', 'b1');
  }

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
      expect(inn.batterStats['p1'].dismissalText).toBe('b Bumrah');
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

    it('rotates strike at the end of an over on a single (batter running odd run retains strike)', () => {
      // 5 dot balls
      for (let b = 0; b < 5; b++) {
        state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
      }
      // 6th ball is a single:
      // Striker p1 runs to the opposite end (now bowler's end).
      // Over ends: bowling end shifts to that end.
      // Therefore, p1 is now facing the next over! Strike does not swap to p2.
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
      expect(state.innings[0].legalBalls).toBe(6);
      expect(state.innings[0].currentStrikerId).toBe('p1');
      expect(state.innings[0].currentNonStrikerId).toBe('p2');
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

      // Titans score 6 (total 6, target 11) -> still live
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6 });
      expect(state.status).toBe('live');

      // Titans score another 6 (total 12, target 11) -> automatically completes match!
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 6 });

      expect(checkTargetReached(state)).toBe(true);
      expect(state.status).toBe('completed');
      expect(state.result?.winner).toBe('teamB');
      expect(state.result?.resultText).toContain('Titans won');
    });
  });

  // ============================================================
  // 11. Advanced Run Out & Crease Resolution
  // ============================================================
  describe('11. Advanced Run Out & Crease Resolution', () => {
    it('striker run out without crossing leaves non-striker at non-striker end', () => {
      let state = createTestMatch();
      const dismissal: DismissalInfo = {
        type: 'run_out',
        dismissedBatterId: 'p1', // Striker
        crossingOccurred: false,
        bowlerCredited: false,
      };
      state = applyAction(state, { type: 'WICKET', dismissal, runs: 0 });
      const inn = state.innings[0];
      // p1 is out; slot for new batter is striker end; non-striker p2 stays at non-striker end
      expect(inn.currentStrikerId).toBe('');
      expect(inn.currentNonStrikerId).toBe('p2');

      // Add new batter p3
      state = addNewBatter(state, 'p3');
      expect(state.innings[0].currentStrikerId).toBe('p3');
      expect(state.innings[0].currentNonStrikerId).toBe('p2');
    });

    it('striker run out WITH crossing moves non-striker to striker end', () => {
      let state = createTestMatch();
      const dismissal: DismissalInfo = {
        type: 'run_out',
        dismissedBatterId: 'p1', // Striker
        crossingOccurred: true, // crossed!
        bowlerCredited: false,
      };
      state = applyAction(state, { type: 'WICKET', dismissal, runs: 1 });
      const inn = state.innings[0];
      // Batters crossed, so surviving non-striker p2 is now at striker end!
      // New batter enters at non-striker end
      expect(inn.currentStrikerId).toBe('p2');
      expect(inn.currentNonStrikerId).toBe('');

      // Add new batter p3
      state = addNewBatter(state, 'p3');
      expect(state.innings[0].currentStrikerId).toBe('p2');
      expect(state.innings[0].currentNonStrikerId).toBe('p3');
    });

    it('non-striker run out WITH crossing leaves striker at non-striker end', () => {
      let state = createTestMatch();
      const dismissal: DismissalInfo = {
        type: 'run_out',
        dismissedBatterId: 'p2', // Non-striker
        crossingOccurred: true, // crossed!
        bowlerCredited: false,
      };
      state = applyAction(state, { type: 'WICKET', dismissal, runs: 1 });
      const inn = state.innings[0];
      // Batters crossed: striker p1 is now at non-striker end. New batter at striker end.
      expect(inn.currentStrikerId).toBe('');
      expect(inn.currentNonStrikerId).toBe('p1');

      state = addNewBatter(state, 'p3');
      expect(state.innings[0].currentStrikerId).toBe('p3');
      expect(state.innings[0].currentNonStrikerId).toBe('p1');
    });

    it('run out on 6th ball (end of over) swaps ends appropriately', () => {
      let state = createTestMatch();
      // Bowl 5 dot balls
      for (let i = 0; i < 5; i++) {
        state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
      }
      expect(state.innings[0].legalBalls).toBe(5);

      // 6th ball: Striker run out, didn't cross
      const dismissal: DismissalInfo = {
        type: 'run_out',
        dismissedBatterId: 'p1',
        crossingOccurred: false,
        bowlerCredited: false,
      };
      state = applyAction(state, { type: 'WICKET', dismissal, runs: 0 });
      const inn = state.innings[0];
      expect(inn.legalBalls).toBe(6);

      // Over ended, so bowling end changes!
      // Surviving batter p2 moves to striker end to face next over
      // New batter will enter at non-striker end
      expect(inn.currentStrikerId).toBe('p2');
      expect(inn.currentNonStrikerId).toBe('');

      state = addNewBatter(state, 'p3');
      expect(state.innings[0].currentStrikerId).toBe('p2');
      expect(state.innings[0].currentNonStrikerId).toBe('p3');
    });
  });

  // ============================================================
  // 12. Maiden Over Rules
  // ============================================================
  describe('12. Maiden Over Rules', () => {
    it('credits maiden over when runs are scored only off byes (not off bowler)', () => {
      let state = createTestMatch();
      // 5 dot balls
      for (let i = 0; i < 5; i++) {
        state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 0 });
      }
      // 6th ball: 2 byes
      state = applyAction(state, { type: 'BYE', runs: 2 });

      const inn = state.innings[0];
      expect(inn.legalBalls).toBe(6);
      expect(inn.totalRuns).toBe(2);
      expect(inn.extras.byes).toBe(2);
      expect(inn.bowlerStats['b1'].runs).toBe(0); // Bowler conceded 0
      expect(inn.bowlerStats['b1'].maidens).toBe(1); // MAIDEN credited!
    });
  });

  // ============================================================
  // 13. Retired Hurt & Return to Crease
  // ============================================================
  describe('13. Retired Hurt', () => {
    it('retires a batter hurt and allows substitution without adding to wickets', () => {
      let state = createTestMatch();
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 4 });
      state = applyAction(state, { type: 'RETIRED_HURT', batterId: 'p1', replacementId: 'p3' });

      const inn = state.innings[0];
      expect(inn.wickets).toBe(0); // not a dismissal
      expect(inn.batterStats['p1'].isRetiredHurt).toBe(true);
      expect(inn.retiredHurtIds).toContain('p1');
      expect(inn.currentStrikerId).toBe('p3');
    });
  });

  // ============================================================
  // 14. Delivery Editing and Score Correction
  // ============================================================
  describe('14. Delivery Editing & Innings Recalculation', () => {
    it('edits a past delivery and recalculates totalRuns and batterStats correctly', () => {
      let state = createTestMatch();
      // Delivery 1: 1 run
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 1 });
      // Delivery 2: 2 runs
      state = applyAction(state, { type: 'NORMAL_DELIVERY', runs: 2 });

      expect(state.innings[0].totalRuns).toBe(3);
      const firstDeliveryId = state.innings[0].deliveries[0].id;

      // Edit delivery 1: change from 1 run to a boundary 4!
      state = applyAction(state, {
        type: 'EDIT_DELIVERY',
        deliveryId: firstDeliveryId,
        updatedDelivery: { batterRuns: 4, totalRuns: 4, isBoundary: true, boundaryType: 4 },
      });

      const inn = state.innings[0];
      // Total runs should now be 4 + 2 = 6
      expect(inn.totalRuns).toBe(6);
      expect(inn.deliveries[0].batterRuns).toBe(4);
      // Because delivery 1 became a 4 (boundary), strike was NOT rotated.
      // Rohit (p1) remained on strike and faced delivery 2, scoring 2 more runs.
      // Total for Rohit (p1) is 4 + 2 = 6 runs!
      expect(inn.batterStats['p1'].runs).toBe(6);
      expect(inn.batterStats['p1'].fours).toBe(1);
      expect(inn.batterStats['p2'].runs).toBe(0);
    });
  });

  // ============================================================
  // 15. Dynamic Player Entry & Progressive Lineup Expansion
  // ============================================================
  describe('15. Dynamic Player Entry Mode', () => {
    it('starts match with only 2 opening batters and adds 3rd batter on wicket without errors', () => {
      // Create config with only 2 players in Team A, but 11 players per side format
      const dynamicConfig: MatchConfig = {
        ...sampleConfig,
        format: { oversPerInnings: 20, maxOversPerBowler: 4, playersPerSide: 11 },
        teamA: {
          id: 'team-a',
          name: 'Chennai Super Stars',
          players: [
            { id: 'siva', name: 'Siva', isCaptain: true, isWicketkeeper: false },
            { id: 'kumar', name: 'Kumar', isCaptain: false, isWicketkeeper: false },
          ],
        },
      };

      let dynamicState = createInitialMatchState(dynamicConfig, 'siva', 'kumar', 'b1');
      expect(dynamicState.config.teamA.players.length).toBe(2);

      // Score 20 runs (e.g. two 6s, two 4s = 4 balls)
      dynamicState = applyAction(dynamicState, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });
      dynamicState = applyAction(dynamicState, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });
      dynamicState = applyAction(dynamicState, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
      dynamicState = applyAction(dynamicState, { type: 'NORMAL_DELIVERY', runs: 4, isBoundary: true, boundaryType: 4 });
      expect(dynamicState.innings[0].totalRuns).toBe(20);
      expect(dynamicState.innings[0].batterStats['siva'].runs).toBe(20);

      // Dismiss striker Siva on ball 5 (mid-over)
      dynamicState = applyAction(dynamicState, {
        type: 'WICKET',
        dismissal: { type: 'bowled', dismissedBatterId: 'siva', bowlerCredited: true },
        runs: 0,
      });

      expect(dynamicState.innings[0].wickets).toBe(1);
      expect(dynamicState.innings[0].currentStrikerId).toBe('');
      expect(dynamicState.innings[0].currentNonStrikerId).toBe('kumar');

      // Add dynamic 3rd batter "Ravi"
      dynamicState = applyAction(dynamicState, {
        type: 'ADD_BATTER',
        batterId: 'ravi',
        newPlayerName: 'Ravi',
      });

      const inn = dynamicState.innings[0];
      // Team A now has 3 registered players
      expect(dynamicState.config.teamA.players.length).toBe(3);
      expect(dynamicState.config.teamA.players.find(p => p.id === 'ravi')?.name).toBe('Ravi');
      expect(inn.currentStrikerId).toBe('ravi');
      expect(inn.currentNonStrikerId).toBe('kumar');
      expect(inn.battingOrder).toEqual(['siva', 'kumar', 'ravi']);
      expect(inn.batterStats['ravi'].playerName).toBe('Ravi');
      expect(inn.batterStats['ravi'].runs).toBe(0);

      // Ravi scores a single
      dynamicState = applyAction(dynamicState, { type: 'NORMAL_DELIVERY', runs: 1 });
      expect(dynamicState.innings[0].totalRuns).toBe(21);
      expect(dynamicState.innings[0].batterStats['ravi'].runs).toBe(1);
      expect(dynamicState.innings[0].batterStats['ravi'].balls).toBe(1);
    });

    it('progressively adds 5 successive new batters on wickets without prematurely ending innings', () => {
      const dynamicConfig: MatchConfig = {
        ...sampleConfig,
        format: { oversPerInnings: 20, maxOversPerBowler: 4, playersPerSide: 11 },
        teamA: {
          id: 'team-a',
          name: 'Warriors',
          players: [
            { id: 'p1', name: 'Siva', isCaptain: true, isWicketkeeper: false },
            { id: 'p2', name: 'Kumar', isCaptain: false, isWicketkeeper: false },
          ],
        },
      };

      let dynState = createInitialMatchState(dynamicConfig, 'p1', 'p2', 'b1');
      const incomingBatters = [
        { id: 'p3', name: 'Ravi' },
        { id: 'p4', name: 'Arun' },
        { id: 'p5', name: 'Praveen' },
        { id: 'p6', name: 'Karthik' },
        { id: 'p7', name: 'Manoj' },
      ];

      for (let w = 0; w < incomingBatters.length; w++) {
        const outBatterId = dynState.innings[0].currentStrikerId;
        dynState = applyAction(dynState, {
          type: 'WICKET',
          dismissal: { type: 'caught', dismissedBatterId: outBatterId, bowlerCredited: true },
          runs: 0,
        });

        expect(dynState.innings[0].wickets).toBe(w + 1);
        expect(dynState.status).toBe('live'); // Never prematurely completed!

        dynState = applyAction(dynState, {
          type: 'ADD_BATTER',
          batterId: incomingBatters[w].id,
          newPlayerName: incomingBatters[w].name,
        });

        expect(dynState.innings[0].batterStats[incomingBatters[w].id].playerName).toBe(incomingBatters[w].name);
      }

      expect(dynState.innings[0].wickets).toBe(5);
      expect(dynState.config.teamA.players.length).toBe(7); // 2 original + 5 dynamic
      expect(dynState.status).toBe('live');
    });
  });

  // ============================================================
  // 16. Player Name Editing with Complete Data Integrity
  // ============================================================
  describe('16. Player Name Editing & Data Integrity', () => {
    it('updates player name everywhere without resetting runs, balls, boundaries, or bowling figures', () => {
      let testState = createTestMatch();
      // p1 (Rohit) scores 30 runs (five 6s = 5 balls)
      for (let i = 0; i < 5; i++) {
        testState = applyAction(testState, { type: 'NORMAL_DELIVERY', runs: 6, isBoundary: true, boundaryType: 6 });
      }

      expect(testState.innings[0].batterStats['p1'].runs).toBe(30);
      expect(testState.innings[0].batterStats['p1'].sixes).toBe(5);
      expect(testState.innings[0].batterStats['p1'].fours).toBe(0);
      expect(testState.innings[0].bowlerStats['b1'].runs).toBe(30);

      // Dismiss p1 on ball 6 (completing 6 balls for p1)
      testState = applyAction(testState, {
        type: 'WICKET',
        dismissal: { type: 'bowled', dismissedBatterId: 'p1', bowlerCredited: true },
        runs: 0,
      });

      expect(testState.innings[0].fallOfWickets[0].batterName).toBe('Rohit');

      // Edit p1's name from "Rohit" to "Rohit Sharma (Captain)"
      testState = applyAction(testState, {
        type: 'UPDATE_PLAYER_NAME',
        playerId: 'p1',
        newName: 'Rohit Sharma (Captain)',
      });

      // Verify name is updated in config
      expect(testState.config.teamA.players.find(p => p.id === 'p1')?.name).toBe('Rohit Sharma (Captain)');

      // Verify stats are 100% PRESERVED
      const p1Stat = testState.innings[0].batterStats['p1'];
      expect(p1Stat.playerName).toBe('Rohit Sharma (Captain)');
      expect(p1Stat.runs).toBe(30);
      expect(p1Stat.balls).toBe(6);
      expect(p1Stat.sixes).toBe(5);
      expect(p1Stat.fours).toBe(0);
      expect(p1Stat.isOut).toBe(true);

      // Verify fall of wickets updated
      expect(testState.innings[0].fallOfWickets[0].batterName).toBe('Rohit Sharma (Captain)');

      // Also edit bowler b1's name from "Bumrah" to "Jasprit Bumrah"
      testState = applyAction(testState, {
        type: 'UPDATE_PLAYER_NAME',
        playerId: 'b1',
        newName: 'Jasprit Bumrah',
      });

      const b1Stat = testState.innings[0].bowlerStats['b1'];
      expect(b1Stat.playerName).toBe('Jasprit Bumrah');
      expect(b1Stat.runs).toBe(30);
      expect(b1Stat.wickets).toBe(1);
    });

    it('preserves player name edit across undo operations', () => {
      let testState = createTestMatch();
      testState = applyAction(testState, { type: 'NORMAL_DELIVERY', runs: 2 });

      // Correct player name spelling
      testState = applyAction(testState, {
        type: 'UPDATE_PLAYER_NAME',
        playerId: 'p1',
        newName: 'Ro-Hitman',
      });
      expect(testState.innings[0].batterStats['p1'].playerName).toBe('Ro-Hitman');

      // Score another delivery
      testState = applyAction(testState, { type: 'NORMAL_DELIVERY', runs: 4 });
      expect(testState.innings[0].totalRuns).toBe(6);

      // Undo the last delivery
      testState = applyAction(testState, { type: 'UNDO' });
      expect(testState.innings[0].totalRuns).toBe(2);

      // Crucial: The name correction is NOT undone!
      expect(testState.innings[0].batterStats['p1'].playerName).toBe('Ro-Hitman');
      expect(testState.config.teamA.players.find(p => p.id === 'p1')?.name).toBe('Ro-Hitman');
    });
  });

  // ============================================================
  // 17. Non-Striker Run Out Attribution
  // ============================================================
  describe('17. Run Out Attribution Rules', () => {
    it('credits balls faced and completed runs to the striker when non-striker is run out', () => {
      let testState = createTestMatch();
      // Striker p1 faces the ball, completed 1 run, non-striker p2 is run out
      const dismissal: DismissalInfo = {
        type: 'run_out',
        dismissedBatterId: 'p2', // Non-striker out!
        crossingOccurred: false,
        bowlerCredited: false,
      };

      testState = applyAction(testState, { type: 'WICKET', dismissal, runs: 1 });

      const inn = testState.innings[0];
      // Striker p1 faced the ball and completed 1 run
      expect(inn.batterStats['p1'].balls).toBe(1);
      expect(inn.batterStats['p1'].runs).toBe(1);
      expect(inn.batterStats['p1'].isOut).toBe(false);

      // Non-striker p2 was dismissed, faced 0 balls!
      expect(inn.batterStats['p2'].balls).toBe(0);
      expect(inn.batterStats['p2'].runs).toBe(0);
      expect(inn.batterStats['p2'].isOut).toBe(true);
    });
  });

  // ============================================================
  // 18. All-Out Condition for 11 Players
  // ============================================================
  describe('18. 11-Player All Out Rule', () => {
    it('ends innings automatically on the 10th wicket and does not request an 11th replacement', () => {
      const fullSquadConfig: MatchConfig = {
        ...sampleConfig,
        format: { oversPerInnings: 20, maxOversPerBowler: 4, playersPerSide: 11 },
        teamA: {
          id: 'team-a',
          name: 'Warriors',
          players: Array.from({ length: 11 }, (_, i) => ({
            id: `player-${i + 1}`,
            name: `Player ${i + 1}`,
            isCaptain: i === 0,
            isWicketkeeper: i === 1,
          })),
        },
      };

      let matchState = createInitialMatchState(fullSquadConfig, 'player-1', 'player-2', 'b1');

      // Dismiss 9 wickets successively, bringing in players 3 through 11
      for (let w = 0; w < 9; w++) {
        const outId = matchState.innings[0].currentStrikerId;
        matchState = applyAction(matchState, {
          type: 'WICKET',
          dismissal: { type: 'bowled', dismissedBatterId: outId, bowlerCredited: true },
          runs: 0,
        });
        matchState = applyAction(matchState, {
          type: 'ADD_BATTER',
          batterId: `player-${w + 3}`,
        });
      }

      expect(matchState.innings[0].wickets).toBe(9);
      expect(matchState.status).toBe('live');

      // 10th wicket falls: All out!
      const lastOutId = matchState.innings[0].currentStrikerId;
      matchState = applyAction(matchState, {
        type: 'WICKET',
        dismissal: { type: 'bowled', dismissedBatterId: lastOutId, bowlerCredited: true },
        runs: 0,
      });

      expect(matchState.innings[0].wickets).toBe(10);
      expect(matchState.innings[0].status).toBe('completed');
      expect(matchState.status).toBe('innings_break'); // Transitioned to innings break, no new batter requested!
    });
  });
});
