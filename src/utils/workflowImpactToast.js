import toast from 'react-hot-toast';
import { createElement } from 'react';
import WorkflowImpactToast from '../components/workflow/WorkflowImpactToast.jsx';

export function showWorkflowImpactToast(journal) {
  if (!journal) return;
  toast.custom(
    (t) => createElement(WorkflowImpactToast, { journal, toastId: t.id }),
    {
      duration: 6000,
      style: { maxWidth: 'min(92vw, 460px)' },
    },
  );
}
