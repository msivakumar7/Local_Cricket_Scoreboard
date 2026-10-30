// ============================================================
// LocalCricket — Layout & Navigation
// ============================================================

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, History, Settings, HelpCircle } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/history', label: 'History', icon: History, exact: false },
  { to: '/settings', label: 'Settings', icon: Settings, exact: false },
  { to: '/help', label: 'Help', icon: HelpCircle, exact: false },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  // Hide bottom nav and sidebar during active match, setup, scorecard, and analysis views
  const hideNav =
    location.pathname.startsWith('/scoring') ||
    location.pathname.startsWith('/setup') ||
    location.pathname.startsWith('/scorecard') ||
    location.pathname.startsWith('/analysis');

  return (
    <div className="min-h-screen bg-[#F5F9FF] flex flex-col">
      {/* Main content */}
      <main className={`flex-1 ${hideNav ? '' : 'pb-20 sm:pb-0'}`}>
        {children}
      </main>

      {/* Bottom navigation (mobile) */}
      {!hideNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#DCE7F5] safe-area-pb sm:hidden z-40"
          aria-label="Main navigation"
        >
          <div className="flex items-stretch h-16">
            {navItems.map(({ to, label, icon: Icon, exact }) => {
              const isActive = exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/';
              const active = to === '/' ? location.pathname === '/' : isActive;
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors
                    ${active ? 'text-[#1565C0]' : 'text-[#60758A] hover:text-[#1565C0]'}`}
                  aria-label={label}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                  <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {/* Sidebar (desktop) */}
      {!hideNav && (
        <aside className="hidden sm:flex fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-[#DCE7F5] flex-col py-6 z-40">
          <div className="px-4 mb-8">
            <div className="flex items-center gap-2.5">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="LocalCricket Logo"
                className="w-9 h-9 object-contain rounded-lg drop-shadow-sm"
              />
              <span className="font-bold text-[#172B4D] text-lg tracking-tight">LocalCricket</span>
            </div>
          </div>
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg transition-colors mb-1 min-h-[44px]
                  ${active
                    ? 'bg-[#E3F2FD] text-[#1565C0] font-semibold'
                    : 'text-[#60758A] hover:bg-[#F5F9FF] hover:text-[#1565C0]'}`}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-sm font-medium">{label}</span>
              </NavLink>
            );
          })}
        </aside>
      )}
    </div>
  );
}
