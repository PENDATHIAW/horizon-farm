import { X } from 'lucide-react';

export default function BaseModal({ open, title, children, onClose, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-earth/30 backdrop-blur-[2px] flex items-center justify-center p-3">
      <div className="w-full max-w-2xl bg-pure border border-line rounded-2xl shadow-float">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h3 className="text-lg font-semibold text-earth">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate hover:text-earth transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-auto">{children}</div>
        {footer ? <div className="px-6 py-4 border-t border-line">{footer}</div> : null}
      </div>
    </div>
  );
}


