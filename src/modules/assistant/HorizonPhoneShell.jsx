import React from 'react';
import { HORIZON_DESIGN as D } from './horizonDesignTokens.js';

/**
 * Horizon Chat Native V7 — coque premium responsive (mobile, tablette, desktop).
 */
export default function HorizonPhoneShell({ children, className = '' }) {
  return (
    <div
      className={`horizon-phone-shell flex min-h-0 w-full flex-1 flex-col overflow-hidden ${className}`}
      style={{
        fontFamily: D.fontFamily,
        background: D.pageBg,
        color: D.text,
      }}
    >
      <div
        className="mx-auto flex h-full min-h-0 w-full max-w-[720px] flex-1 flex-col overflow-hidden md:my-4 md:max-h-[min(920px,calc(100vh-2rem))] md:rounded-[28px] md:border md:shadow-md"
        style={{
          background: D.surface,
          borderColor: D.borderSoft,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function HorizonPhoneHeader() {
  return (
    <header
      className="flex shrink-0 items-center gap-3 border-b px-4 py-3.5 md:px-5"
      style={{
        borderColor: D.borderSoft,
        background: D.surface,
      }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold shadow-sm"
        style={{
          background: `linear-gradient(145deg, ${D.accent} 0%, ${D.accentDeep} 100%)`,
          color: '#fff',
        }}
        aria-hidden
      >
        H
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold leading-tight" style={{ color: D.text }}>
          Horizon
        </p>
        <p className="truncate text-[13px] leading-snug" style={{ color: D.textMuted }}>
          Connecté à votre exploitation
        </p>
      </div>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: '#22C55E', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }}
        aria-label="Connecté"
      />
    </header>
  );
}

export function HorizonUserBubble({ children, time }) {
  return (
    <div className="flex justify-end px-3 py-1 md:px-4">
      <div
        className="max-w-[88%] rounded-[18px] rounded-br-[6px] px-4 py-2.5 text-[15px] leading-relaxed shadow-sm"
        style={{
          background: D.userBubble,
          color: D.userBubbleText,
          boxShadow: D.shadowBubble,
        }}
      >
        <div className="whitespace-pre-wrap break-words">{children}</div>
        {time ? (
          <p className="mt-1 text-right text-[11px] opacity-75">{time}</p>
        ) : null}
      </div>
    </div>
  );
}

export function HorizonAssistantBubble({ children, time }) {
  return (
    <div className="flex justify-start px-3 py-1 md:px-4">
      <div
        className="max-w-[88%] rounded-[18px] rounded-bl-[6px] border px-4 py-2.5 text-[15px] leading-relaxed"
        style={{
          background: D.assistantBubble,
          color: D.assistantBubbleText,
          borderColor: D.borderSoft,
          boxShadow: D.shadowBubble,
        }}
      >
        <div className="whitespace-pre-wrap break-words">{children}</div>
        {time ? (
          <p className="mt-1 text-[11px]" style={{ color: D.textSoft }}>
            {time}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function HorizonChatComposer({
  value,
  onChange,
  onSubmit,
  onAttach,
  onMic,
  disabled,
  placeholder = 'Parlez à votre ferme...',
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div
      className="shrink-0 border-t px-3 py-3 md:px-4"
      style={{
        borderColor: D.borderSoft,
        background: D.surface,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
      }}
    >
      <div
        className="flex items-end gap-2 rounded-[24px] border px-2 py-1.5"
        style={{
          background: D.inputBg,
          borderColor: D.border,
          boxShadow: D.shadowSoft,
        }}
      >
        <button
          type="button"
          onClick={onAttach}
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:opacity-80 disabled:opacity-40"
          style={{ color: D.accent }}
          aria-label="Pièce jointe"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder}
          className="max-h-28 min-h-[40px] flex-1 resize-none border-0 bg-transparent py-2.5 text-[15px] leading-snug outline-none focus:ring-0 placeholder:text-[#7A9488] disabled:opacity-50"
          style={{ color: D.text }}
        />
        <button
          type="button"
          onClick={onMic}
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:opacity-80 disabled:opacity-40"
          style={{ color: D.accent }}
          aria-label="Micro"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-1 4v2h3v2H7v-2h3v-2H7v-2h10v2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !String(value || '').trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40"
          style={{ background: D.accent }}
          aria-label="Envoyer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
