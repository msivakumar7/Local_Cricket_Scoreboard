import React, { useState, useEffect } from 'react';
import type { DeliveryEvent, MatchConfig, InningsState, DismissalType } from '../../domain/types';
import { Modal, Button, Card } from '../common/index';
import { getPlayerNameById } from '../../domain/engine';
import { isBowlerCredited } from '../../domain/rules';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  delivery: DeliveryEvent | null;
  config: MatchConfig;
  innings: InningsState;
  onSave: (deliveryId: string, updated: Partial<DeliveryEvent>) => void;
}

export default function EditDeliveryDialog({
  isOpen,
  onClose,
  delivery,
  config,
  innings,
  onSave,
}: Props) {
  const [outcomeType, setOutcomeType] = useState<'normal' | 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'wicket'>('normal');
  const [runs, setRuns] = useState(0);
  const [wicketType, setWicketType] = useState<DismissalType>('bowled');

  useEffect(() => {
    if (delivery) {
      if (delivery.dismissal) {
        setOutcomeType('wicket');
        setWicketType(delivery.dismissal.type);
        setRuns(delivery.batterRuns);
      } else if (delivery.deliveryType === 'wide') {
        setOutcomeType('wide');
        setRuns(Math.max(0, delivery.extras - 1));
      } else if (delivery.deliveryType === 'no_ball') {
        setOutcomeType('no_ball');
        setRuns(delivery.batterRuns);
      } else if (delivery.deliveryType === 'bye') {
        setOutcomeType('bye');
        setRuns(delivery.extras);
      } else if (delivery.deliveryType === 'leg_bye') {
        setOutcomeType('leg_bye');
        setRuns(delivery.extras);
      } else {
        setOutcomeType('normal');
        setRuns(delivery.batterRuns);
      }
    }
  }, [delivery]);

  if (!isOpen || !delivery) return null;

  const strikerName = getPlayerNameById(config, delivery.strikerId);
  const bowlerName = getPlayerNameById(config, delivery.bowlerId);

  function handleConfirm() {
    if (!delivery) return;

    let updated: Partial<DeliveryEvent> = {};

    if (outcomeType === 'normal') {
      const isBoundary = runs === 4 || runs === 6;
      updated = {
        deliveryType: 'normal',
        batterRuns: runs,
        extras: 0,
        totalRuns: runs,
        isLegal: true,
        isBoundary,
        boundaryType: isBoundary ? (runs === 4 ? 4 : 6) : undefined,
        dismissal: undefined,
      };
    } else if (outcomeType === 'wide') {
      const totalExtras = 1 + runs;
      updated = {
        deliveryType: 'wide',
        batterRuns: 0,
        extras: totalExtras,
        totalRuns: totalExtras,
        isLegal: false,
        isBoundary: runs === 4,
        boundaryType: runs === 4 ? 4 : undefined,
        dismissal: undefined,
      };
    } else if (outcomeType === 'no_ball') {
      const totalRuns = 1 + runs;
      const isBoundary = runs === 4 || runs === 6;
      updated = {
        deliveryType: 'no_ball',
        batterRuns: runs,
        extras: 1,
        totalRuns,
        isLegal: false,
        isBoundary,
        boundaryType: isBoundary ? (runs === 4 ? 4 : 6) : undefined,
        dismissal: undefined,
      };
    } else if (outcomeType === 'bye') {
      updated = {
        deliveryType: 'bye',
        batterRuns: 0,
        extras: runs,
        totalRuns: runs,
        isLegal: true,
        isBoundary: false,
        boundaryType: undefined,
        dismissal: undefined,
      };
    } else if (outcomeType === 'leg_bye') {
      updated = {
        deliveryType: 'leg_bye',
        batterRuns: 0,
        extras: runs,
        totalRuns: runs,
        isLegal: true,
        isBoundary: false,
        boundaryType: undefined,
        dismissal: undefined,
      };
    } else if (outcomeType === 'wicket') {
      updated = {
        deliveryType: 'normal',
        batterRuns: 0,
        extras: 0,
        totalRuns: 0,
        isLegal: true,
        isBoundary: false,
        boundaryType: undefined,
        dismissal: {
          type: wicketType,
          dismissedBatterId: delivery.strikerId,
          bowlerCredited: isBowlerCredited(wicketType),
        },
      };
    }

    onSave(delivery.id, updated);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Delivery ${delivery.overNumber + 1}.${delivery.ballInOver + 1}`}
    >
      <div className="space-y-4">
        {/* Context card */}
        <Card className="p-3 bg-[#F5F9FF] border border-[#DCE7F5] space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[#60758A]">Striker:</span>
            <span className="font-semibold text-[#172B4D]">{strikerName}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#60758A]">Bowler:</span>
            <span className="font-semibold text-[#172B4D]">{bowlerName}</span>
          </div>
        </Card>

        {/* Outcome Category Tabs */}
        <div>
          <label className="text-xs font-bold text-[#60758A] uppercase tracking-wider block mb-1.5">
            Delivery Outcome
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-[#E3F2FD] p-1 rounded-xl">
            {[
              { id: 'normal', label: 'Runs' },
              { id: 'wide', label: 'Wide' },
              { id: 'no_ball', label: 'No-ball' },
              { id: 'bye', label: 'Bye' },
              { id: 'leg_bye', label: 'Leg bye' },
              { id: 'wicket', label: 'Wicket' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setOutcomeType(tab.id as any); setRuns(0); }}
                className={`py-2 rounded-lg text-xs font-bold transition-colors min-h-[36px]
                  ${outcomeType === tab.id
                    ? 'bg-white text-[#1565C0] shadow-sm'
                    : 'text-[#60758A] hover:text-[#1565C0]'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Runs Selection */}
        {outcomeType === 'normal' && (
          <div>
            <label className="text-xs font-bold text-[#60758A] uppercase tracking-wider block mb-2">
              Runs Scored
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRuns(r)}
                  className={`py-3 rounded-xl border-2 text-lg font-bold min-h-[50px] transition-colors
                    ${runs === r
                      ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                      : 'border-[#DCE7F5] bg-white text-[#172B4D] hover:border-[#1565C0]'}`}
                >
                  {r === 0 ? '· (dot)' : r === 4 ? '4 (Four)' : r === 6 ? '6 (Six)' : r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wide Selection */}
        {outcomeType === 'wide' && (
          <div>
            <label className="text-xs font-bold text-[#60758A] uppercase tracking-wider block mb-2">
              Additional Runs (plus 1 wide extra)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRuns(r)}
                  className={`py-3 rounded-xl border-2 text-lg font-bold min-h-[50px] transition-colors
                    ${runs === r
                      ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                      : 'border-[#DCE7F5] bg-white text-[#172B4D] hover:border-[#1565C0]'}`}
                >
                  +{r}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#60758A] text-center mt-2 font-medium">Total extras: {1 + runs}</p>
          </div>
        )}

        {/* No-ball Selection */}
        {outcomeType === 'no_ball' && (
          <div>
            <label className="text-xs font-bold text-[#60758A] uppercase tracking-wider block mb-2">
              Runs off the Bat (plus 1 no-ball extra)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRuns(r)}
                  className={`py-3 rounded-xl border-2 text-lg font-bold min-h-[50px] transition-colors
                    ${runs === r
                      ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                      : 'border-[#DCE7F5] bg-white text-[#172B4D] hover:border-[#1565C0]'}`}
                >
                  {r === 4 ? '4 (Four)' : r === 6 ? '6 (Six)' : r}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#60758A] text-center mt-2 font-medium">Total: {1 + runs} runs</p>
          </div>
        )}

        {/* Byes / Leg Byes Selection */}
        {(outcomeType === 'bye' || outcomeType === 'leg_bye') && (
          <div>
            <label className="text-xs font-bold text-[#60758A] uppercase tracking-wider block mb-2">
              {outcomeType === 'bye' ? 'Bye' : 'Leg bye'} Runs
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRuns(r)}
                  className={`py-3 rounded-xl border-2 text-lg font-bold min-h-[50px] transition-colors
                    ${runs === r
                      ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                      : 'border-[#DCE7F5] bg-white text-[#172B4D] hover:border-[#1565C0]'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wicket Selection */}
        {outcomeType === 'wicket' && (
          <div>
            <label className="text-xs font-bold text-[#60758A] uppercase tracking-wider block mb-2">
              Dismissal Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'bowled', label: '🎯 Bowled' },
                { type: 'caught', label: '🤲 Caught' },
                { type: 'lbw', label: '🦵 LBW' },
                { type: 'stumped', label: '🥅 Stumped' },
                { type: 'hit_wicket', label: '💥 Hit Wicket' },
                { type: 'run_out', label: '🏃 Run Out' },
              ].map(w => (
                <button
                  key={w.type}
                  type="button"
                  onClick={() => setWicketType(w.type as any)}
                  className={`p-3 rounded-xl border-2 text-sm font-bold min-h-[48px] text-left transition-colors
                    ${wicketType === w.type
                      ? 'border-[#D32F2F] bg-red-50 text-[#D32F2F]'
                      : 'border-[#DCE7F5] bg-white text-[#172B4D] hover:border-[#D32F2F]'}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notice */}
        <p className="text-[11px] text-[#60758A] bg-[#F5F9FF] p-2.5 rounded-lg border border-[#DCE7F5]">
          Saving this edit will recalculate team totals, batter strike rates, and bowling figures from this delivery onward.
        </p>

        {/* Action buttons */}
        <div className="flex gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} fullWidth>
            Save & Recalculate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
