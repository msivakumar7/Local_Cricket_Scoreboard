// ============================================================
// LocalCricket — Reusable UI Components
// ============================================================

import React from 'react';
import { X } from 'lucide-react';

// ---- Button ------------------------------------------------

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', fullWidth, children, className = '', ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variantClasses: Record<string, string> = {
    primary: 'bg-[#1565C0] text-white hover:bg-[#0D47A1] focus-visible:ring-[#42A5F5] active:bg-[#0D47A1]',
    secondary: 'bg-[#E3F2FD] text-[#1565C0] hover:bg-[#BBDEFB] focus-visible:ring-[#42A5F5] border border-[#DCE7F5]',
    danger: 'bg-[#D32F2F] text-white hover:bg-[#B71C1C] focus-visible:ring-[#EF9A9A] active:bg-[#B71C1C]',
    ghost: 'bg-transparent text-[#1565C0] hover:bg-[#E3F2FD] focus-visible:ring-[#42A5F5]',
    success: 'bg-[#16803C] text-white hover:bg-[#125E2E] focus-visible:ring-[#4CAF50] active:bg-[#125E2E]',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    md: 'px-4 py-3 text-base min-h-[48px]',
    lg: 'px-6 py-3.5 text-lg min-h-[52px]',
  };

  return (
    <button
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---- Card --------------------------------------------------

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-[#DCE7F5] shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {children}
    </div>
  );
}

// ---- Modal / Dialog ----------------------------------------

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect_(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fixed inset-0 bg-[#0D47A1]/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClass} mx-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DCE7F5]">
          <h2 className="text-lg font-bold text-[#172B4D]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#60758A] hover:bg-[#F5F9FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#42A5F5] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

// Alias for useEffect to avoid the import
import { useEffect as useEffect_ } from 'react';

// ---- Confirm Dialog ----------------------------------------

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', confirmVariant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-[#172B4D] mb-6 text-base leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
        <Button variant={confirmVariant} onClick={onConfirm} fullWidth>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ---- Badge --------------------------------------------------

interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'gray';
}

export function Badge({ children, color = 'blue' }: BadgeProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-[#E3F2FD] text-[#1565C0]',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorClasses[color]}`}>
      {children}
    </span>
  );
}

// ---- Tab Strip ---------------------------------------------

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabStripProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TabStrip({ tabs, activeTab, onTabChange }: TabStripProps) {
  return (
    <div className="flex overflow-x-auto gap-1 p-1 bg-[#E3F2FD] rounded-xl scrollbar-none">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap min-h-[40px]
            ${activeTab === tab.id
              ? 'bg-white text-[#0D47A1] shadow-sm'
              : 'text-[#60758A] hover:text-[#1565C0] hover:bg-white/50'
            }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ---- Empty State -------------------------------------------

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="mb-4 text-[#42A5F5]">{icon}</div>}
      <h3 className="text-lg font-bold text-[#172B4D] mb-2">{title}</h3>
      {message && <p className="text-[#60758A] text-sm max-w-xs mb-6">{message}</p>}
      {action}
    </div>
  );
}

// ---- Save Status Indicator ----------------------------------

interface SaveStatusProps {
  status: 'saved' | 'saving' | 'error' | 'idle';
}

export function SaveStatus({ status }: SaveStatusProps) {
  if (status === 'idle') return null;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full
      ${status === 'saved' ? 'text-green-700 bg-green-100' :
        status === 'saving' ? 'text-amber-700 bg-amber-100' :
        'text-red-700 bg-red-100'}`}
      aria-live="polite"
    >
      {status === 'saved' ? '✓ Saved' : status === 'saving' ? 'Saving…' : 'Save error'}
    </span>
  );
}

// ---- Ball Chip (over-by-over display) ---------------------

interface BallChipProps {
  value: string;
  type: 'dot' | 'runs' | 'four' | 'six' | 'wicket' | 'wide' | 'noball' | 'bye' | 'legbye';
}

export function BallChip({ value, type }: BallChipProps) {
  const typeClasses: Record<string, string> = {
    dot: 'bg-[#E3F2FD] text-[#60758A] border border-transparent',
    runs: 'bg-white text-[#172B4D] border border-[#DCE7F5]',
    four: 'bg-[#EBF7EE] text-[#16803C] border border-[#16803C] font-extrabold',
    six: 'bg-[#16803C] text-white border-0 font-extrabold',
    wicket: 'bg-[#D32F2F] text-white border-0 font-extrabold',
    wide: 'bg-amber-100 text-amber-800 border border-amber-400',
    noball: 'bg-orange-100 text-orange-800 border border-orange-400',
    bye: 'bg-[#E3F2FD] text-[#60758A] border border-[#DCE7F5]',
    legbye: 'bg-[#E3F2FD] text-[#60758A] border border-[#DCE7F5]',
  };
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold tabular-nums ${typeClasses[type]}`}
      aria-label={`${type}: ${value}`}
    >
      {value}
    </span>
  );
}
