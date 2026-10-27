import { useState } from 'react';
import type { InningsState, Team } from '../../domain/types';
import { Modal, Button } from '../common/index';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (batterId: string, replacementId: string) => void;
  innings: InningsState;
  battingTeam: Team;
}

export default function RetiredHurtDialog({ isOpen, onClose, onConfirm, innings, battingTeam }: Props) {
  const [retiringId, setRetiringId] = useState<string>('');
  const [replacementId, setReplacementId] = useState<string>('');

  const striker = battingTeam.players.find(p => p.id === innings.currentStrikerId);
  const nonStriker = battingTeam.players.find(p => p.id === innings.currentNonStrikerId);

  // Available replacements: players who have not batted yet (not in battingOrder, or were retired hurt earlier)
  const availableReplacements = battingTeam.players.filter(p =>
    p.id !== innings.currentStrikerId &&
    p.id !== innings.currentNonStrikerId &&
    (!innings.battingOrder.includes(p.id) || innings.retiredHurtIds.includes(p.id)) &&
    !innings.batterStats[p.id]?.isOut
  );

  function reset() {
    setRetiringId('');
    setReplacementId('');
  }

  function handleConfirm() {
    if (!retiringId || !replacementId) return;
    onConfirm(retiringId, replacementId);
    reset();
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }} title="Batter Retired Hurt">
      <p className="text-xs text-[#60758A] mb-4">
        A retired hurt batter leaves the field without being dismissed and may return later if permitted.
      </p>

      {/* Select Retiring Batter */}
      <div className="mb-4">
        <label className="text-sm font-bold text-[#172B4D] block mb-2">Which batter is retiring hurt?</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: innings.currentStrikerId, name: striker?.name ?? 'Striker', label: 'Striker ★' },
            { id: innings.currentNonStrikerId, name: nonStriker?.name ?? 'Non-striker', label: 'Non-striker' },
          ].map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => setRetiringId(b.id)}
              className={`p-3 rounded-xl border-2 text-left transition-colors min-h-[56px]
                ${retiringId === b.id ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold' : 'border-[#DCE7F5] bg-white hover:border-amber-400'}`}
            >
              <p className="text-sm truncate">{b.name}</p>
              <p className="text-[10px] text-[#60758A]">{b.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Select Replacement Batter */}
      {retiringId && (
        <div className="mb-5">
          <label className="text-sm font-bold text-[#172B4D] block mb-2">Replacement Batter</label>
          {availableReplacements.length === 0 ? (
            <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">No more batters available in squad.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {availableReplacements.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setReplacementId(p.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm font-medium min-h-[48px] transition-colors
                    ${replacementId === p.id ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]' : 'border-[#DCE7F5] hover:border-[#1565C0]'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => { onClose(); reset(); }} fullWidth>Cancel</Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!retiringId || !replacementId} fullWidth>
          Confirm Replacement
        </Button>
      </div>
    </Modal>
  );
}
