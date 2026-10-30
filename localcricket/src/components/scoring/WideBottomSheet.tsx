import React, { useState, useEffect } from 'react';
import type { DismissalInfo, Player } from '../../domain/types';
import { Button } from '../common/index';
import { AlertTriangle, UserMinus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (additionalRuns: number, dismissal?: DismissalInfo) => void;
  striker?: Player;
  nonStriker?: Player;
}

export default function WideBottomSheet({
  isOpen,
  onClose,
  onConfirm,
  striker,
  nonStriker,
}: Props) {
  const [selectedRuns, setSelectedRuns] = useState<number | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customError, setCustomError] = useState('');

  // Optional Run Out state
  const [hasRunOut, setHasRunOut] = useState(false);
  const [runOutPosition, setRunOutPosition] = useState<'striker' | 'non_striker'>('striker');
  const [crossingOccurred, setCrossingOccurred] = useState(false);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset state whenever sheet is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedRuns(null);
      setIsCustom(false);
      setCustomValue('');
      setCustomError('');
      setHasRunOut(false);
      setRunOutPosition('striker');
      setCrossingOccurred(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSelectRuns(runs: number) {
    setIsCustom(false);
    setSelectedRuns(runs);
    setCustomValue('');
    setCustomError('');
  }

  function handleSelectCustom() {
    setIsCustom(true);
    setSelectedRuns(null);
  }

  function handleCustomChange(val: string) {
    setCustomValue(val);
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 0) {
      setSelectedRuns(null);
      setCustomError('Enter a valid number (0 or more)');
    } else {
      setSelectedRuns(parsed);
      setCustomError('');
    }
  }

  function handleConfirm() {
    if (selectedRuns === null) return;

    let dismissal: DismissalInfo | undefined = undefined;
    if (hasRunOut) {
      const dismissedBatterId = runOutPosition === 'striker' ? striker?.id : nonStriker?.id;
      if (dismissedBatterId) {
        dismissal = {
          type: 'run_out',
          dismissedBatterId,
          bowlerCredited: false,
          runOutBatterPosition: runOutPosition,
          crossingOccurred,
        };
      }
    }

    onConfirm(selectedRuns, dismissal);
  }

  const completedRuns = selectedRuns ?? 0;
  const totalTeamRuns = 1 + completedRuns;
  const isSelectionMade = selectedRuns !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Wide Delivery Run Selection"
    >
      {/* Translucent overlay: live scoreboard remains visible in background */}
      <div
        className="fixed inset-0 bg-[#0D47A1]/20 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modern Half-Screen Bottom Sheet (covers ~48-55% of viewport) */}
      <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl h-[52vh] max-h-[55vh] min-h-[46vh] flex flex-col z-50 animate-slide-up border-t-2 border-[#DCE7F5] safe-area-pb">
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-12 h-1.5 bg-[#DCE7F5] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-2 border-b border-[#DCE7F5] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
              Wide Delivery
            </span>
            <h2 className="text-base font-extrabold text-[#172B4D]">
              Completed Runs
            </h2>
          </div>
          <p className="text-xs font-medium text-[#60758A] mt-1">
            How many runs did the batters complete?
          </p>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          {/* Quick Select Buttons: 0, 1, 2, 3, 4, Custom */}
          <div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4].map(r => {
                const isSelected = !isCustom && selectedRuns === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSelectRuns(r)}
                    className={`py-2.5 rounded-xl border-2 text-lg font-black transition-all min-h-[48px] select-none
                      ${isSelected
                        ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0] shadow-sm ring-2 ring-[#42A5F5]/30'
                        : 'border-[#DCE7F5] bg-white text-[#172B4D] hover:border-[#1565C0] active:bg-[#F5F9FF]'}`}
                  >
                    {r} {r === 0 ? 'runs' : r === 1 ? 'run' : 'runs'}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleSelectCustom}
                className={`py-2.5 rounded-xl border-2 text-base font-bold transition-all min-h-[48px] select-none
                  ${isCustom
                    ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0] shadow-sm ring-2 ring-[#42A5F5]/30'
                    : 'border-[#DCE7F5] bg-white text-[#172B4D] hover:border-[#1565C0] active:bg-[#F5F9FF]'}`}
              >
                Custom
              </button>
            </div>

            {/* Custom Input field */}
            {isCustom && (
              <div className="mt-2.5 bg-[#F5F9FF] border border-[#DCE7F5] p-2.5 rounded-xl animate-fade-in">
                <label className="text-[11px] font-bold text-[#172B4D] uppercase tracking-wider block mb-1">
                  Enter Completed Runs
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  autoFocus
                  placeholder="e.g. 5"
                  value={customValue}
                  onChange={e => handleCustomChange(e.target.value)}
                  className="input-field !min-h-[40px] !py-2 text-base font-bold"
                />
                {customError && (
                  <p className="text-xs text-red-600 font-semibold mt-1">{customError}</p>
                )}
              </div>
            )}
          </div>

          {/* Real-Time Score Breakdown */}
          <div className="bg-[#F5F9FF] border border-[#DCE7F5] rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#DCE7F5]">
              <span className="text-[11px] font-bold text-[#60758A] uppercase tracking-wider">
                Score Breakdown
              </span>
              <span className="text-xs text-[#60758A]">
                {isSelectionMade ? 'Calculated automatically' : 'Select completed runs above'}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center text-[#172B4D]">
                <span>Wide penalty:</span>
                <span className="font-bold tabular-nums text-[#1565C0]">+1</span>
              </div>
              <div className="flex justify-between items-center text-[#172B4D]">
                <span>Completed runs:</span>
                <span className="font-bold tabular-nums">
                  {isSelectionMade ? `+${completedRuns}` : '—'}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-[#DCE7F5] flex justify-between items-center">
              <span className="text-xs font-black text-[#172B4D] uppercase tracking-wide">
                Total Team Runs:
              </span>
              <span className="text-xl font-black tabular-nums text-[#1565C0]">
                {isSelectionMade ? totalTeamRuns : '—'}
              </span>
            </div>
          </div>

          {/* Run Out on Wide Toggle (Cricket dismissal on wide) */}
          <div className="border border-[#DCE7F5] rounded-xl p-3 bg-white">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasRunOut}
                onChange={e => setHasRunOut(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#D32F2F] focus:ring-red-400"
              />
              <span className="text-xs font-bold text-[#172B4D] flex items-center gap-1">
                <UserMinus size={14} className="text-[#D32F2F]" />
                Run-out occurred on this delivery?
              </span>
            </label>

            {hasRunOut && (
              <div className="mt-3 pt-2.5 border-t border-[#DCE7F5] space-y-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#60758A] uppercase tracking-wider block mb-1">
                    Dismissed Batter:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRunOutPosition('striker')}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold truncate min-h-[36px]
                        ${runOutPosition === 'striker'
                          ? 'border-[#D32F2F] bg-red-50 text-[#D32F2F]'
                          : 'border-[#DCE7F5] text-[#172B4D]'}`}
                    >
                      Striker ({striker?.name ?? 'Striker'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRunOutPosition('non_striker')}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold truncate min-h-[36px]
                        ${runOutPosition === 'non_striker'
                          ? 'border-[#D32F2F] bg-red-50 text-[#D32F2F]'
                          : 'border-[#DCE7F5] text-[#172B4D]'}`}
                    >
                      Non-Striker ({nonStriker?.name ?? 'Non-Striker'})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#60758A] uppercase tracking-wider block mb-1">
                    Did batters cross before dismissal?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCrossingOccurred(true)}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-bold min-h-[34px]
                        ${crossingOccurred
                          ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                          : 'border-[#DCE7F5] text-[#172B4D]'}`}
                    >
                      Yes, crossed
                    </button>
                    <button
                      type="button"
                      onClick={() => setCrossingOccurred(false)}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-bold min-h-[34px]
                        ${!crossingOccurred
                          ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                          : 'border-[#DCE7F5] text-[#172B4D]'}`}
                    >
                      No, did not cross
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#DCE7F5] bg-white flex gap-3 flex-shrink-0">
          <Button
            variant="secondary"
            onClick={onClose}
            className="!min-h-[48px] px-4 font-bold flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!isSelectionMade}
            className="!min-h-[48px] font-extrabold text-base shadow-md flex-1 tracking-wide"
          >
            Confirm Wide {isSelectionMade ? `(${totalTeamRuns})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
