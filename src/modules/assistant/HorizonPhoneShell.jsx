import { HORIZON } from './horizonDesignTokens.js';

/** Coque plein écran — inspiration iPhone 17 Pro Max, conversation WhatsApp Horizon */
export default function HorizonPhoneShell({ header, children, footer }) {
  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden"
      style={{ background: HORIZON.wallpaper }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-[env(safe-area-inset-top,0px)]"
        aria-hidden="true"
      >
        <div
          className="mt-2 h-[34px] w-[126px] rounded-full"
          style={{ background: HORIZON.island }}
        />
      </div>

      <header
        className="relative z-10 shrink-0 px-4 pb-3 text-white"
        style={{
          background: HORIZON.header,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)',
        }}
      >
        {header}
      </header>

      <div className="relative z-0 min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {children}
      </div>

      <footer
        className="relative z-10 shrink-0 px-3 pt-2"
        style={{
          background: HORIZON.wallpaper,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
        }}
      >
        {footer}
      </footer>
    </div>
  );
}
