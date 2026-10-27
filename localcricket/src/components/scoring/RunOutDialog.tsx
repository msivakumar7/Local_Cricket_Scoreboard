import { useState } from 'react';
import type { DismissalInfo, InningsState, Team } from '../../domain/types';
import { Modal, Button, Card } from '../common/index';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dismissal: DismissalInfo, runs: number) => void;
  innings: InningsState;
  battingTeam: Team;
}

export default function RunOutDialog({ isOpen, onClose, onConfirm, innings, battingTeam }: Props) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [completedRuns, setCompletedRuns] = useState(0);
  const [crossingOccurred, setCrossingOccurred] = useState<boolean | null>(null);
  const [step, setStep] = useState<'who' | 'runs' | 'crossing' | 'confirm'>('who');

  const striker = battingTeam.players.find(p => p.id === innings.currentStrikerId);
  const nonStriker = battingTeam.players.find(p => p.id === innings.currentNonStrikerId);
  const dismissedPlayer = battingTeam.players.find(p => p.id === dismissedId);
  const strikerStats = innings.batterStats[innings.currentStrikerId];
  const nonStrikerStats = innings.batterStats[innings.currentNonStrikerId];

  function reset() {
    setDismissedId(null);
    setCompletedRuns(0);
    setCrossingOccurred(null);
    setStep('who');
  }

  function handleConfirm() {
    if (!dismissedId) return;
    const dismissal: DismissalInfo = {
      type: 'run_out',
      dismissedBatterId: dismissedId,
      bowlerCredited: false,
      runOutBatterPosition: dismissedId === innings.currentStrikerId ? 'striker' : 'non_striker',
      crossingOccurred: crossingOccurred ?? false,
    };
    onConfirm(dismissal, completedRuns);
    reset();
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }} title="Run Out">
      {step === 'who' && (
        <div>
          <p className="text-base font-semibold text-[#172B4D] mb-4">Who was dismissed?</p>
          <div className="space-y-3">
            {[
              { player: striker, stats: strikerStats, id: innings.currentStrikerId, role: 'Striker ★' },
              { player: nonStriker, stats: nonStrikerStats, id: innings.currentNonStrikerId, role: 'Non-striker' },
            ].map(({ player, stats, id, role }) => (
              <button
                key={id}
                onClick={() => { setDismissedId(id); setStep('runs'); }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors min-h-[72px]
                  ${dismissedId === id ? 'border-[#D32F2F] bg-red-50' : 'border-[#DCE7F5] bg-white hover:border-[#D32F2F] hover:bg-red-50'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold flex-shrink-0
                  ${dismissedId === id ? 'bg-[#D32F2F] text-white' : 'bg-[#E3F2FD] text-[#1565C0]'}`}>
                  {player?.name ? player.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#172B4D]">{player?.name ?? '—'}</p>
                  <p className="text-xs text-[#60758A]">{role}</p>
                  <p className="text-sm tabular-nums text-[#60758A]">
                    {stats?.runs ?? 0} runs off {stats?.balls ?? 0} balls
                  </p>
                </div>
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => { onClose(); reset(); }} fullWidth className="mt-4">Cancel</Button>
        </div>
      )}

      {step === 'runs' && (
        <div>
          <p className="text-sm text-[#60758A] mb-1">Runs completed before run-out?</p>
          <p className="text-base font-semibold text-[#172B4D] mb-4">
            <strong>{dismissedPlayer?.name}</strong> run out
          </p>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[0, 1, 2, 3].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setCompletedRuns(r)}
                className={`py-3 rounded-xl border-2 text-xl font-extrabold transition-colors min-h-[56px]
                  ${completedRuns === r ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]' : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const val = prompt('Enter completed runs:', '4');
                if (val !== null) setCompletedRuns(Math.max(0, parseInt(val, 10) || 0));
              }}
              className={`py-3 rounded-xl border-2 text-xs font-bold transition-colors min-h-[56px]
                ${completedRuns > 3 ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]' : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
            >
              {completedRuns > 3 ? completedRuns : 'Custom'}
            </button>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('who')}>Back</Button>
            <Button variant="primary" fullWidth onClick={() => setStep('crossing')}>Next</Button>
          </div>
        </div>
      )}

      {step === 'crossing' && (
        <div>
          <p className="text-base font-semibold text-[#172B4D] mb-2">Did the batters cross?</p>
          <p className="text-xs text-[#60758A] mb-4">
            "Crossed" means both batters had passed each other when the wicket fell.
            This determines who faces the next delivery.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: 'Yes — crossed', value: true },
              { label: 'No — not crossed', value: false },
            ].map(({ label, value }) => (
              <button
                key={String(value)}
                onClick={() => { setCrossingOccurred(value); setStep('confirm'); }}
                className={`p-4 rounded-xl border-2 font-semibold text-sm transition-colors min-h-[64px]
                  ${crossingOccurred === value ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]' : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setStep('runs')} fullWidth>Back</Button>
        </div>
      )}

      {step === 'confirm' && (
        <div>
          <p className="text-base font-bold text-[#172B4D] mb-4">Confirm Run Out</p>
          <Card className="p-4 mb-5 space-y-2 bg-[#F5F9FF]">
            <Row label="Dismissed Batter" value={dismissedPlayer?.name ?? '—'} highlight />
            <Row label="Dismissed Position" value={dismissedId === innings.currentStrikerId ? 'Striker' : 'Non-striker'} />
            <Row label="Completed Runs" value={String(completedRuns)} />
            <Row label="Delivery Legality" value="Legal delivery" />
            <Row label="Batters Crossed" value={crossingOccurred ? 'Yes (crossed)' : 'No (did not cross)'} />
            <div className="pt-2 border-t border-[#DCE7F5]">
              <Row label="Team Total After Event" value={`${innings.totalRuns + completedRuns}/${innings.wickets + 1}`} />
              <Row label="Wickets After Event" value={`${innings.wickets + 1}`} />
            </div>
          </Card>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('crossing')}>Back</Button>
            <Button variant="danger" fullWidth onClick={handleConfirm}>Confirm Run Out</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#60758A]">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-[#D32F2F]' : 'text-[#172B4D]'}`}>{value}</span>
    </div>
  );
}
