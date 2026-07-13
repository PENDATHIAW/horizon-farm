import { Mic, Paperclip, Send } from 'lucide-react';
import { HORIZON_DESIGN as D } from './horizonDesignTokens.js';
import { HORIZON_OFFICIAL_LOGO } from './horizonBrandAssets.js';

/** Surface de conversation compacte, adaptée au bureau comme au mobile. */
export default function HorizonPhoneShell({ children, className = '' }) {
  return (
    <div
      className={`horizon-device-stage flex h-full min-h-0 w-full flex-1 items-center justify-center bg-mist p-3 ${className}`}
      style={{
        fontFamily: D.fontFamily,
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
      }}
    >
      <div
        className="horizon-iphone-17 relative flex h-full w-full max-w-[430px] flex-col overflow-hidden rounded-card border border-line bg-card shadow-card"
        style={{
          maxHeight: 'min(932px, calc(100vh - 1.5rem))',
          minHeight: 'min(720px, calc(100vh - 1.5rem))',
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
      className="relative z-10 flex shrink-0 items-center gap-3 border-b border-line bg-pure px-4 py-3 md:px-6"
      style={{
        borderColor: D.borderSoft,
      }}
    >
      <img
        src={HORIZON_OFFICIAL_LOGO.header}
        alt={HORIZON_OFFICIAL_LOGO.alt}
        className="h-11 w-auto shrink-0 object-contain"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-data font-semibold leading-tight" style={{ color: D.text }}>
          Horizon
        </p>
        <p className="truncate text-label leading-snug" style={{ color: D.textMuted }}>
          Connecté à votre exploitation
        </p>
      </div>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-positive shadow-card"
        aria-label="Connecté"
      />
    </header>
  );
}

/** Zone de discussion avec logo Horizon en arrière-plan. */
export function HorizonChatCanvas({ children, className = '', scrollRef, onScroll }) {
  return (
    <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${className}`}>
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
        ref={scrollRef}
        onScroll={onScroll}
        className="relative z-[1] min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain py-3"
        style={{ background: D.pageBg, WebkitOverflowScrolling: 'touch' }}
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
        className="max-w-[88%] rounded-card rounded-br-control bg-earth px-4 py-3 text-body leading-relaxed shadow-card"
        style={{
          color: D.userBubbleText,
        }}
      >
        <div className="whitespace-pre-wrap break-words">{children}</div>
        {time ? (
          <p className="mt-1 text-right text-meta opacity-75">{time}</p>
        ) : null}
      </div>
    </div>
  );
}

export function HorizonAssistantBubble({ children, time }) {
  return (
    <div className="flex justify-start px-3 py-1 md:px-4">
      <div
        className="max-w-[88%] rounded-card rounded-bl-control border border-line bg-pure px-4 py-3 text-body leading-relaxed shadow-card"
        style={{
          color: D.assistantBubbleText,
          borderColor: D.borderSoft,
        }}
      >
        <div className="whitespace-pre-wrap break-words">{children}</div>
        {time ? (
          <p className="mt-1 text-meta" style={{ color: D.textSoft }}>
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
      className="relative z-10 shrink-0 border-t border-line bg-pure px-3 py-3 md:px-4"
      style={{
        borderColor: D.borderSoft,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
      }}
    >
      <div
        className="flex items-end gap-2 rounded-control border px-2 py-2"
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
          <Paperclip size={21} aria-hidden="true" />
        </button>
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder}
          className="max-h-28 min-h-[40px] flex-1 resize-none border-0 bg-transparent py-3 text-body leading-snug outline-none focus:ring-0 placeholder:text-slate disabled:opacity-50"
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
          <Mic size={21} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !String(value || '').trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40"
          style={{ background: D.accent }}
          aria-label="Envoyer"
        >
          <Send size={19} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
