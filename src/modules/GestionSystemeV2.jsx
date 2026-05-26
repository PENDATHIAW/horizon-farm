import InternalResourcesHealth from './InternalResourcesHealth.jsx';
import GestionSysteme from './GestionSysteme.jsx';
import SystemDataResetPanel from './SystemDataResetPanel.jsx';
import { useAuth } from '../context/AuthContext';
import { canPerformSystemAction } from '../utils/systemAccessWorkflows';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export default function GestionSystemeV2(props) {
  const { role } = useAuth();
  const canManageSystem = canPerformSystemAction(role, 'modifier');
  return <div className="space-y-6">
    <section className={`rounded-3xl border p-5 shadow-sm ${canManageSystem ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <p className={`text-xs uppercase tracking-widest font-black flex items-center gap-2 ${canManageSystem ? 'text-emerald-800' : 'text-amber-800'}`}>{canManageSystem ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />} Sécurité des accès</p>
      <h3 className="mt-2 text-xl font-black text-[#2f2415]">{canManageSystem ? 'Actions admin autorisées' : 'Lecture seule pour ce rôle'}</h3>
      <p className={`mt-1 text-sm ${canManageSystem ? 'text-emerald-800' : 'text-amber-800'}`}>Les permissions affichées guident l’interface. La sécurité définitive doit rester confirmée côté Supabase/RBAC pour les données réelles.</p>
    </section>
    <InternalResourcesHealth
      equipements={props.equipements || []}
      transactions={props.transactions || []}
      documents={props.documents || []}
      tasks={props.tasks || []}
      onNavigate={props.onNavigate}
    />
    <GestionSysteme {...props} />
    <SystemDataResetPanel canManageSystem={canManageSystem} />
  </div>;
}
