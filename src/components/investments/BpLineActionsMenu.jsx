import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, MoreHorizontal } from 'lucide-react';
import { BP_LINE_STATUS } from '../../utils/bpLineConcretization.js';
import { resolveBpLineActions } from '../../utils/bpLineLinkage.js';

const toneCls = {
  primary: 'bg-[#2f2415] text-white border-[#2f2415]',
  secondary: 'border-[#eadcc2] bg-white text-[#2f2415]',
  warn: 'border-amber-300 bg-amber-50 text-amber-900',
  danger: 'border-red-300 bg-red-50 text-red-800',
};

export function BpLineLinkageAlert({ linkage }) {
  if (!linkage?.linkageIssue || !linkage?.linkageMessage) return null;
  return (
    <p className="mt-1 flex items-start gap-1 text-[10px] text-red-700">
      <AlertTriangle size={11} className="shrink-0 mt-0.5" />
      {linkage.linkageMessage}
    </p>
  );
}

export default function BpLineActionsMenu({
  line,
  kind = 'investment',
  transactions = [],
  onAction,
  compact = false,
  allowPreviewActions = false,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { linkage, primary, repair, editable } = resolveBpLineActions(line, { kind, transactions });
  const showPreviewMenu = allowPreviewActions && !editable && !linkage.showViewOperation;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!editable && !linkage.showViewOperation && !showPreviewMenu) return null;

  const run = (actionId, extra = {}) => {
    setOpen(false);
    onAction?.(actionId, { line, kind, ...extra });
  };

  if (showPreviewMenu) {
    return (
      <div className={`flex flex-wrap gap-1 justify-end ${compact ? '' : 'min-w-[200px]'}`}>
        <button type="button" onClick={() => run('concretize')} className={`rounded-lg border px-2 py-1 text-[10px] font-black ${toneCls.primary}`}>
          Concrétiser
        </button>
        <button type="button" onClick={() => run('edit')} className={`rounded-lg border px-2 py-1 text-[10px] font-black ${toneCls.secondary}`}>
          Modifier
        </button>
        <button type="button" onClick={() => run('postpone')} className={`rounded-lg border px-2 py-1 text-[10px] font-black ${toneCls.warn}`}>
          Reporter
        </button>
        <button type="button" onClick={() => run('cancel')} className={`rounded-lg border px-2 py-1 text-[10px] font-black ${toneCls.danger}`}>
          Annuler
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-end gap-1 ${compact ? '' : 'min-w-[200px]'}`} ref={menuRef}>
      <div className="flex flex-wrap gap-1 justify-end">
        {primary.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => run(action.id)}
            className={`rounded-lg border px-2 py-1 text-[10px] font-black ${toneCls[action.tone] || toneCls.secondary}`}
          >
            {action.label}
          </button>
        ))}
        {repair.length ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg border border-[#eadcc2] bg-[#fffdf8] px-2 py-1 text-[10px] font-black text-[#7d6a4a]"
              title="Réparer · actions avancées"
            >
              <MoreHorizontal size={12} className="inline" />
            </button>
            {open ? (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[220px] rounded-xl border border-[#d6c3a0] bg-white py-1 shadow-lg">
                <p className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#8a7456]">Réparer</p>
                {repair.map((item) => (
                  <button
                    key={`${item.id}-${item.label}`}
                    type="button"
                    onClick={() => run(item.id, item)}
                    className={`block w-full px-3 py-2 text-left text-xs hover:bg-[#fffdf8] ${item.advanced ? 'text-[#7d6a4a]' : 'font-bold text-[#2f2415]'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <BpLineLinkageAlert linkage={linkage} />
    </div>
  );
}

export function useBpLineActionHandlers({
  onConcretize,
  onComplete,
  onEdit,
  onStatusChange,
  onNavigate,
  onLinkRepair,
  onAutoLinkRepair,
  onJoinProof,
  onViewOperation,
}) {
  return (actionId, ctx = {}) => {
    const { line, transaction } = ctx;
    switch (actionId) {
      case 'concretize':
        onConcretize?.(line, ctx);
        break;
      case 'complete':
        onComplete?.(line, ctx);
        break;
      case 'proof':
        onJoinProof?.(line, ctx);
        break;
      case 'view_op':
        onViewOperation?.(line, ctx);
        break;
      case 'view_block':
        onViewOperation?.(line, ctx);
        break;
      case 'repair':
        onLinkRepair?.(line, ctx);
        break;
      case 'edit':
        onEdit?.(line);
        break;
      case 'postpone':
        onStatusChange?.(line, BP_LINE_STATUS.REPORTE, ctx);
        break;
      case 'cancel':
        onStatusChange?.(line, BP_LINE_STATUS.ANNULE, ctx);
        break;
      case 'link_existing':
        onLinkRepair?.(line, ctx);
        break;
      case 'auto_link':
        onAutoLinkRepair?.(line, transaction, ctx);
        break;
      default:
        break;
    }
  };
}
