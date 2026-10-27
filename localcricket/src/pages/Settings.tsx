import { useState } from 'react';
import { Trash2, Database, ShieldCheck, HardDrive } from 'lucide-react';
import { Button, Card, ConfirmDialog } from '../components/common/index';
import { db } from '../db/schema';

export default function Settings() {
  const [clearConfirm, setClearConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  async function clearAllData() {
    await db.matches.clear();
    setCleared(true);
    setClearConfirm(false);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 sm:ml-56 pb-20">
      <h1 className="text-2xl font-bold text-[#172B4D] mb-6">Settings</h1>

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Database size={20} className="text-[#1565C0]" />
          <h2 className="font-bold text-[#172B4D]">Local Data Storage</h2>
        </div>
        <p className="text-sm text-[#60758A] mb-4 leading-relaxed">
          All match data is stored entirely on your device using browser IndexedDB.
          No personal information or scoring data is sent to external cloud servers.
        </p>
        {cleared && <p className="text-green-700 text-sm font-semibold mb-3">✓ All saved matches have been wiped.</p>}
        <Button variant="danger" size="sm" onClick={() => setClearConfirm(true)}>
          <Trash2 size={14} className="mr-1.5" />
          Clear All Match Data
        </Button>
      </Card>

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <HardDrive size={20} className="text-[#1565C0]" />
          <h2 className="font-bold text-[#172B4D]">Offline & PWA</h2>
        </div>
        <p className="text-sm text-[#60758A] leading-relaxed">
          LocalCricket is an offline-capable Progressive Web App. You can install it on your home screen
          and use it without internet access at grounds and pitches.
        </p>
      </Card>

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={20} className="text-[#16803C]" />
          <h2 className="font-bold text-[#172B4D]">About LocalCricket</h2>
        </div>
        <p className="text-sm font-semibold text-[#172B4D]">Version 1.0.0 (Production)</p>
        <p className="text-sm text-[#60758A] mt-1 leading-relaxed">
          Built for grassroots cricket teams, weekend friend matches, and local tournaments.
          Compliant with standard cricket laws including explicit run-out victims, legal delivery counters,
          extras classifications, and strike-rotation mechanics.
        </p>
      </Card>

      <ConfirmDialog
        isOpen={clearConfirm}
        onClose={() => setClearConfirm(false)}
        onConfirm={clearAllData}
        title="Clear All Data"
        message="This will permanently delete all saved matches and statistics from this device. Are you sure?"
        confirmLabel="Clear Everything"
        confirmVariant="danger"
      />
    </div>
  );
}
