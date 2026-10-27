import { useState } from 'react';
import type { InningsState, Team } from '../../domain/types';
import { Modal, Button } from '../common/index';
import { legalBallsToOverString, validateBowlerChange } from '../../domain/rules';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bowlerId: string) => void;
  innings: InningsState;
  bowlingTeam: Team;
  maxOversPerBowler: number;
}

export default function ChangeBowlerDialog({ isOpen, onClose, onConfirm, innings, bowlingTeam, maxOversPerBowler }: Props) {
  const [selected, setSelected] = useState('');

  // Last over bowler (should not bowl consecutive overs)
  const currentOverIndex = Math.floor(innings.legalBalls / 6);
  const lastOverDeliveries = innings.deliveries.filter(d => d.overNumber === currentOverIndex - 1);
  const lastOverBowlerId = lastOverDeliveries.length > 0 ? lastOverDeliveries[lastOverDeliveries.length - 1].bowlerId : null;

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
    setSelected('');
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setSelected(''); }} title="Change Bowler">
      <div className="space-y-2 mb-5 max-h-72 overflow-y-auto">
        {bowlingTeam.players.map(p => {
          const stats = innings.bowlerStats[p.id];
          const validation = validateBowlerChange(p.id, lastOverBowlerId, stats?.legalBalls, maxOversPerBowler);
          const isInvalid = !validation.valid;
          return (
            <button
              key={p.id}
              onClick={() => !isInvalid && setSelected(p.id)}
              disabled={isInvalid}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors min-h-[56px]
                ${p.id === innings.currentBowlerId ? 'border-[#42A5F5] bg-[#E3F2FD]' :
                  selected === p.id ? 'border-[#1565C0] bg-[#E3F2FD]' :
                  isInvalid ? 'border-[#DCE7F5] bg-gray-50 opacity-50 cursor-not-allowed' :
                  'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-[#172B4D]">{p.name}</p>
                {stats && (
                  <p className="text-xs text-[#60758A]">
                    {legalBallsToOverString(stats.legalBalls)} ov · {stats.runs}R · {stats.wickets}W
                  </p>
                )}
                {isInvalid && <p className="text-xs text-red-500 mt-0.5">{validation.reason}</p>}
              </div>
              {p.id === innings.currentBowlerId && (
                <span className="text-xs bg-[#E3F2FD] text-[#1565C0] px-2 py-0.5 rounded-full font-semibold">Current</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => { onClose(); setSelected(''); }} fullWidth>Cancel</Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!selected || selected === innings.currentBowlerId} fullWidth>
          Change Bowler
        </Button>
      </div>
    </Modal>
  );
}
