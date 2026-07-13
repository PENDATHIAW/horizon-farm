import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, MoreHorizontal } from 'lucide-react';
import { BP_LINE_STATUS } from '../../utils/bpLineConcretization.js';
import { resolveBpLineActions } from '../../utils/bpLineLinkage.js';

const toneCls = {
  primary: 'bg-earth text-white border-earth',
  secondary: 'border-line bg-white text-earth',
  warn: 'border-vigilance bg-vigilance-bg text-horizon-dark',
  danger: 'border-urgent bg-urgent-bg text-urgent',
};

export function BpLineLinkageAlert({ linkage }) {
  if (!linkage?.linkageIssue || !linkage?.linkageMessage) return null;
  return (
    <p className="mt-1 flex items-start gap-1 text-meta text-urgent">
      <AlertTriangle size={11} className="shrink-0 mt-1" />
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
        <button type="button" onClick={() => run('concretize')} className={`rounded-lg border px-2 py-1 text-meta font-semibold ${toneCls.primary}`}>
          Concrétiser
        </button>
        <button type="button" onClick={() => run('edit')} className={`rounded-lg border px-2 py-1 text-meta font-semibold ${toneCls.secondary}`}>
          Modifier
        </button>
        <button type="button" onClick={() => run('postpone')} className={`rounded-lg border px-2 py-1 text-meta font-semibold ${toneCls.warn}`}>
          Reporter
        </button>
        <button type="button" onClick={() => run('cancel')} className={`rounded-lg border px-2 py-1 text-meta font-semibold ${toneCls.danger}`}>
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
            className={`rounded-lg border px-2 py-1 text-meta font-semibold ${toneCls[action.tone] || toneCls.secondary}`}
          >
            {action.label}
          </button>
        ))}
        {repair.length ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg border border-line bg-card px-2 py-1 text-meta font-semibold text-slate"
              title="Réparer · actions avancées"
            >
              <MoreHorizontal size={12} className="inline" />
            </button>
            {open ? (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[220px] rounded-xl border border-line bg-white py-1 shadow-float">
                <p className="px-3 py-1 text-meta font-semibold uppercase tracking-normal text-slate">Réparer</p>
                {repair.map((item) => (
                  <button
                    key={`${item.id}-${item.label}`}
                    type="button"
                    onClick={() => run(item.id, item)}
                    className={`block w-full px-3 py-2 text-left text-xs hover:bg-card ${item.advanced ? 'text-slate' : 'font-semibold text-earth'}`}
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
