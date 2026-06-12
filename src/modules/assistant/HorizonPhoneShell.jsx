import React from 'react';
import { HORIZON_DESIGN as D } from './horizonDesignTokens.js';
import { HORIZON_OFFICIAL_LOGO } from './horizonBrandAssets.js';

/**
 * Horizon Chat — coque iPhone 17 Pro Max (430×932) avec logo en filigrane.
 */
export default function HorizonPhoneShell({ children, className = '' }) {
  return (
    <div
      className={`horizon-device-stage flex min-h-0 w-full flex-1 items-center justify-center ${className}`}
      style={{
        fontFamily: D.fontFamily,
        background: 'linear-gradient(165deg, #EEF5F1 0%, #D8E8DF 100%)',
        padding: 'max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left))',
      }}
    >
      <div
        className="horizon-iphone-17 relative flex h-full w-full max-w-[430px] flex-col overflow-hidden"
        style={{
          maxHeight: 'min(932px, calc(100vh - 1.5rem))',
          minHeight: 'min(720px, calc(100vh - 1.5rem))',
          borderRadius: '55px',
          border: '11px solid #1A1A1A',
          boxShadow: '0 32px 80px rgba(15, 36, 25, 0.28), inset 0 0 0 1px rgba(255,255,255,0.08)',
          background: D.surface,
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-2 z-20 h-[30px] w-[126px] -translate-x-1/2 rounded-full"
          style={{ background: '#0A0A0A' }}
          aria-hidden
        />
        {children}
      </div>
    </div>
  );
}

export function HorizonPhoneHeader() {
  return (
    <header
      className="relative z-10 flex shrink-0 items-center gap-3 border-b px-4 pb-3 pt-10 md:px-5"
      style={{
        borderColor: D.borderSoft,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <img
        src={HORIZON_OFFICIAL_LOGO.header}
        alt={HORIZON_OFFICIAL_LOGO.alt}
        className="h-11 w-auto shrink-0 object-contain"
      />
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

/** Zone de discussion avec logo Horizon en arrière-plan. */
export function HorizonChatCanvas({ children, className = '' }) {
  return (
    <div className={`relative min-h-0 flex-1 overflow-hidden ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <img
          src={HORIZON_OFFICIAL_LOGO.watermark}
          alt=""
          className="max-h-[48%] w-[78%] object-contain opacity-[0.09]"
          style={{ filter: 'saturate(0.92)' }}
        />
      </div>
      <div
        className="relative z-[1] h-full overflow-y-auto py-3"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(244,248,246,0.35) 100%)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function HorizonUserBubble({ children, time }) {
  return (
    <div className="flex justify-end px-3 py-1 md:px-4">
      <div
        className="max-w-[88%] rounded-[18px] rounded-br-[6px] px-4 py-2.5 text-[15px] leading-relaxed shadow-sm"
        style={{
          background: `linear-gradient(145deg, ${D.accent} 0%, ${D.accentDeep} 100%)`,
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
        className="max-w-[88%] rounded-[18px] rounded-bl-[6px] border px-4 py-2.5 text-[15px] leading-relaxed backdrop-blur-sm"
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
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
      className="relative z-10 shrink-0 border-t px-3 py-3 md:px-4"
      style={{
        borderColor: D.borderSoft,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
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
