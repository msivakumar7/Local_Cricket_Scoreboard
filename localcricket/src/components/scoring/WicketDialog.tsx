import { useState } from 'react';
import type { DismissalInfo, DismissalType, InningsState, Team } from '../../domain/types';
import { isBowlerCredited } from '../../domain/rules';
import { Modal, Button } from '../common/index';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dismissal: DismissalInfo) => void;
  innings: InningsState;
  battingTeam: Team;
  bowlingTeam: Team;
}

const DISMISSAL_TYPES: { type: DismissalType; label: string; emoji: string }[] = [
  { type: 'bowled', label: 'Bowled', emoji: '🎯' },
  { type: 'caught', label: 'Caught', emoji: '🤲' },
  { type: 'caught_and_bowled', label: 'Caught & Bowled', emoji: '🤲🎯' },
  { type: 'lbw', label: 'LBW', emoji: '🦵' },
  { type: 'stumped', label: 'Stumped', emoji: '🥅' },
  { type: 'run_out', label: 'Run Out', emoji: '🏃' },
  { type: 'hit_wicket', label: 'Hit Wicket', emoji: '💥' },
  { type: 'hit_ball_twice', label: 'Hit Ball Twice', emoji: '2️⃣' },
  { type: 'obstructing_field', label: 'Obstructing Field', emoji: '🚫' },
  { type: 'retired_out', label: 'Retired Out', emoji: '👋' },
  { type: 'timed_out', label: 'Timed Out', emoji: '⏱️' },
  { type: 'handled_ball', label: 'Handled Ball', emoji: '🖐️' },
];

export default function WicketDialog({ isOpen, onClose, onConfirm, innings, battingTeam, bowlingTeam }: Props) {
  const [selectedType, setSelectedType] = useState<DismissalType | null>(null);
  const [fielderId, setFielderId] = useState('');

  const striker = battingTeam.players.find(p => p.id === innings.currentStrikerId);

  function handleConfirm() {
    if (!selectedType) return;
    const dismissal: DismissalInfo = {
      type: selectedType,
      dismissedBatterId: innings.currentStrikerId, // default - run-out overrides via RunOutDialog
      fielderId: fielderId || undefined,
      bowlerCredited: isBowlerCredited(selectedType),
    };
    onConfirm(dismissal);
    setSelectedType(null);
    setFielderId('');
  }

  const needsFielder = selectedType === 'caught' || selectedType === 'stumped';

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setSelectedType(null); setFielderId(''); }} title="Wicket">
      <p className="text-sm text-[#60758A] mb-4">
        Striker: <strong className="text-[#172B4D]">{striker?.name}</strong>
      </p>

      {/* Dismissal type grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {DISMISSAL_TYPES.map(({ type, label, emoji }) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-colors min-h-[52px]
              ${selectedType === type
                ? 'border-[#D32F2F] bg-red-50 text-[#D32F2F]'
                : 'border-[#DCE7F5] bg-white text-[#172B4D] hover:border-[#D32F2F] hover:bg-red-50'
              }`}
          >
            <span>{emoji}</span>
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {/* Fielder selection for caught/stumped */}
      {needsFielder && (
        <div className="mb-4">
          <label className="text-sm font-bold text-[#172B4D] block mb-2">
            {selectedType === 'caught' ? 'Caught by' : 'Stumped by'} (optional)
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {bowlingTeam.players.map(p => (
              <button
                key={p.id}
                onClick={() => setFielderId(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm font-medium min-h-[48px] transition-colors
                  ${fielderId === p.id ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]' : 'border-[#DCE7F5] hover:border-[#1565C0]'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => { onClose(); setSelectedType(null); setFielderId(''); }} fullWidth>Cancel</Button>
        <Button variant="danger" onClick={handleConfirm} disabled={!selectedType} fullWidth>Confirm Wicket</Button>
      </div>
    </Modal>
  );
}
