import { X } from 'lucide-react';

export default function BaseModal({ open, title, children, onClose, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-3">
      <div className="w-full max-w-2xl bg-[#ffffff] border border-[#d6c3a0] rounded-2xl shadow-2xl">
        <div className="px-5 py-4 border-b border-[#d6c3a0] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#2f2415]">{title}</h3>
          <button type="button" onClick={onClose} className="text-[#8a7456] hover:text-[#2f2415] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-auto">{children}</div>
        {footer ? <div className="px-5 py-4 border-t border-[#d6c3a0]">{footer}</div> : null}
      </div>
    </div>
  );
}


