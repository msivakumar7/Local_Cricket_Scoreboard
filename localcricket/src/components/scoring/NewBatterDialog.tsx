import { useState } from 'react';
import type { InningsState, Team } from '../../domain/types';
import { Modal, Button } from '../common/index';

interface Props {
  isOpen: boolean;
  onConfirm: (batterId: string) => void;
  innings: InningsState;
  battingTeam: Team;
}

export default function NewBatterDialog({ isOpen, onConfirm, innings, battingTeam }: Props) {
  const [selected, setSelected] = useState('');

  // Players who haven't batted yet and aren't retired hurt
  const availablePlayers = battingTeam.players.filter(p =>
    !innings.battingOrder.includes(p.id) ||
    (innings.battingOrder.includes(p.id) && innings.retiredHurtIds.includes(p.id))
  ).filter(p =>
    p.id !== innings.currentStrikerId && p.id !== innings.currentNonStrikerId
  );

  if (!isOpen) return null;

  return (
    <Modal isOpen={true} onClose={() => {}} title="New Batter Required">
      <p className="text-sm text-[#60758A] mb-4">
        A wicket has fallen. Select the next batter to arrive at the crease.
      </p>
      <div className="space-y-2 mb-5 max-h-72 overflow-y-auto">
        {availablePlayers.length === 0 ? (
          <p className="text-[#60758A] text-sm text-center py-4">No more batters available</p>
        ) : (
          availablePlayers.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors min-h-[56px] text-left
                ${selected === p.id ? 'border-[#1565C0] bg-[#E3F2FD]' : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm
                ${selected === p.id ? 'bg-[#1565C0] text-white' : 'bg-[#E3F2FD] text-[#1565C0]'}`}>
                {p.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-semibold text-[#172B4D]">{p.name}</p>
                {innings.retiredHurtIds.includes(p.id) && (
                  <p className="text-xs text-amber-600">Retired hurt — returning</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
      <Button
        variant="primary"
        fullWidth
        disabled={!selected}
        onClick={() => { if (selected) { onConfirm(selected); setSelected(''); } }}
      >
        Send to Crease
      </Button>
    </Modal>
  );
}
