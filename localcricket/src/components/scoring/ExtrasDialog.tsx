import { useState } from 'react';
import type { InningsState, ScoringAction, Team } from '../../domain/types';
import { Modal, Button } from '../common/index';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: ScoringAction) => void;
  innings: InningsState;
  battingTeam: Team;
  bowlingTeam: Team;
}

type ExtrasTab = 'wide' | 'no_ball' | 'bye' | 'leg_bye';

export default function ExtrasDialog({ isOpen, onClose, onConfirm }: Props) {
  const [tab, setTab] = useState<ExtrasTab>('wide');
  const [additionalRuns, setAdditionalRuns] = useState(0);
  const [noBallBatRuns, setNoBallBatRuns] = useState(0);
  const [noBallExtraType, setNoBallExtraType] = useState<'none' | 'bye' | 'leg_bye'>('none');
  const [noBallExtraRuns, setNoBallExtraRuns] = useState(0);
  const [byeRuns, setByeRuns] = useState(1);

  function reset() {
    setAdditionalRuns(0);
    setNoBallBatRuns(0);
    setNoBallExtraType('none');
    setNoBallExtraRuns(0);
    setByeRuns(1);
  }

  function handleConfirm() {
    let action: ScoringAction;
    if (tab === 'wide') {
      action = { type: 'WIDE', additionalRuns };
    } else if (tab === 'no_ball') {
      action = {
        type: 'NO_BALL',
        batterRuns: noBallBatRuns,
        extraType: noBallExtraType !== 'none' ? noBallExtraType : undefined,
        extraRuns: noBallExtraType !== 'none' ? noBallExtraRuns : 0,
      };
    } else if (tab === 'bye') {
      action = { type: 'BYE', runs: byeRuns };
    } else {
      action = { type: 'LEG_BYE', runs: byeRuns };
    }
    onConfirm(action);
    reset();
  }

  const TABS: { id: ExtrasTab; label: string }[] = [
    { id: 'wide', label: 'Wide' },
    { id: 'no_ball', label: 'No-ball' },
    { id: 'bye', label: 'Bye' },
    { id: 'leg_bye', label: 'Leg Bye' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }} title="Extras">
      {/* Tabs */}
      <div className="flex gap-1 bg-[#E3F2FD] p-1 rounded-xl mb-5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); reset(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[40px]
              ${tab === t.id ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-[#60758A] hover:text-[#1565C0]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Wide */}
      {tab === 'wide' && (
        <div>
          <p className="text-sm text-[#60758A] mb-3">
            1 extra wide + any completed runs
          </p>
          <label className="text-sm font-bold text-[#172B4D] block mb-2">Additional runs (on top of 1 wide)</label>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map(r => (
              <button
                key={r}
                onClick={() => setAdditionalRuns(r)}
                className={`py-3 rounded-xl border-2 text-xl font-extrabold transition-colors min-h-[56px]
                  ${additionalRuns === r ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]' : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-center text-sm font-bold text-[#172B4D] mt-3">
            Total: {1 + additionalRuns} extra{1 + additionalRuns !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* No-ball */}
      {tab === 'no_ball' && (
        <div className="space-y-4">
          <p className="text-sm text-[#60758A]">1 no-ball penalty + bat runs or additional extras</p>
          <div>
            <label className="text-sm font-bold text-[#172B4D] block mb-2">Bat runs (off the bat)</label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button
                  key={r}
                  onClick={() => setNoBallBatRuns(r)}
                  className={`py-3 rounded-xl border-2 text-lg font-extrabold transition-colors min-h-[52px]
                    ${noBallBatRuns === r ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]' : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-[#172B4D] block mb-2">Additional extras type</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { id: 'none', label: 'None' },
                { id: 'bye', label: 'Bye' },
                { id: 'leg_bye', label: 'Leg bye' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setNoBallExtraType(opt.id as any)}
                  className={`py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors min-h-[48px]
                    ${noBallExtraType === opt.id ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]' : 'border-[#DCE7F5] bg-white'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {noBallExtraType !== 'none' && (
              <div>
                <label className="text-sm font-bold text-[#172B4D] block mb-2">Extra runs</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(r => (
                    <button
                      key={r}
                      onClick={() => setNoBallExtraRuns(r)}
                      className={`py-3 rounded-xl border-2 text-lg font-extrabold transition-colors min-h-[52px]
                        ${noBallExtraRuns === r ? 'border-[#1565C0] bg-[#E3F2FD]' : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-center text-sm font-bold text-[#172B4D]">
            Total: {1 + noBallBatRuns + (noBallExtraType !== 'none' ? noBallExtraRuns : 0)} runs
          </p>
        </div>
      )}

      {/* Bye / Leg Bye */}
      {(tab === 'bye' || tab === 'leg_bye') && (
        <div>
          <label className="text-sm font-bold text-[#172B4D] block mb-3">
            {tab === 'bye' ? 'Bye' : 'Leg bye'} runs
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(r => (
              <button
                key={r}
                onClick={() => setByeRuns(r)}
                className={`py-4 rounded-xl border-2 text-2xl font-extrabold transition-colors min-h-[64px]
                  ${byeRuns === r ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]' : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#60758A] mt-3 text-center">
            {tab === 'bye' ? 'Byes' : 'Leg byes'} count as legal deliveries. Not credited to batter or bowler's runs.
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-5">
        <Button variant="secondary" onClick={() => { onClose(); reset(); }} fullWidth>Cancel</Button>
        <Button variant="primary" onClick={handleConfirm} fullWidth>Confirm</Button>
      </div>
    </Modal>
  );
}
