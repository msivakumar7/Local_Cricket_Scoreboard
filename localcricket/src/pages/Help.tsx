import { useState } from 'react';
import { Card } from '../components/common/index';
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';

const FAQ = [
  {
    q: 'How do I start scoring a match?',
    a: 'Tap "New Match" on the Home dashboard or History screen. Follow the 5-step setup wizard to enter team names, player rosters, toss outcome, and opening striker, non-striker, and opening bowler.',
  },
  {
    q: 'How does strike rotation work?',
    a: 'Strike rotation follows official cricket laws: single and three runs rotate strike between batters; odd runs on no-balls/wides rotate strike; at the end of each 6-ball legal over, the strike automatically rotates to the other end. You can also manually use "Swap Batters" if players ran a short run or batting positions need correction.',
  },
  {
    q: 'How do I record a run-out?',
    a: 'Tap "Wicket", then select "Run Out". LocalCricket will prompt you to explicitly select which batter was dismissed (Striker or Non-striker), how many completed runs were taken before the bails were dislodged, and whether the batters had crossed. The engine assigns wickets and strike ends accurately.',
  },
  {
    q: 'How do extras count towards team and bowler statistics?',
    a: 'Wides and No-balls add penalty runs to the team total and are charged to the bowler without incrementing the legal ball count. Byes and Leg-byes add to the team total and consume legal deliveries, but are not charged against the bowler and not credited to the batter.',
  },
  {
    q: 'Can I undo accidental taps during scoring?',
    a: 'Yes. The UNDO button (↩) reverses the match state back to the previous snapshot, restoring overs, balls, batter runs, bowler figures, partnerships, and fall of wickets without losing data integrity.',
  },
  {
    q: 'How do I download a PDF scorecard or share match JSON?',
    a: 'Go to the match Scorecard or History screen and tap the Download PDF icon or Export JSON icon. The PDF is generated entirely on your device with complete batting, bowling, extras, and fall-of-wicket tables.',
  },
  {
    q: 'Does LocalCricket require an internet connection or login?',
    a: 'No. LocalCricket is 100% offline-first. It caches the application code and stores match databases locally in your browser IndexedDB.',
  },
];

export default function Help() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 sm:ml-56 pb-20">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle size={24} className="text-[#1565C0]" />
        <h1 className="text-2xl font-bold text-[#172B4D]">Help & Rules Guide</h1>
      </div>
      <p className="text-[#60758A] text-sm mb-6 leading-relaxed">
        Quick reference guide for operating LocalCricket during live matches.
      </p>

      <div className="space-y-3">
        {FAQ.map((item, i) => (
          <Card key={i} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left min-h-[56px] hover:bg-[#F5F9FF] transition-colors"
              aria-expanded={open === i}
            >
              <span className="font-semibold text-[#172B4D] text-sm pr-3">{item.q}</span>
              {open === i ? (
                <ChevronDown size={18} className="text-[#1565C0] flex-shrink-0" />
              ) : (
                <ChevronRight size={18} className="text-[#60758A] flex-shrink-0" />
              )}
            </button>
            {open === i && (
              <div className="px-4 pb-4 text-sm text-[#60758A] leading-relaxed border-t border-[#DCE7F5] pt-3 bg-[#F5F9FF]/40">
                {item.a}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
