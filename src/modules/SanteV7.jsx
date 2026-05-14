import { Component } from 'react';
import { AlertTriangle, BarChart3, HeartPulse, ShieldCheck } from 'lucide-react';
import useCrudModule from '../hooks/useCrudModule';
import HealthQualityControl from './HealthQualityControl.jsx';
import SanteV6 from './SanteV6.jsx';
import SanteEvolution from './SanteEvolution.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

class SafeHealthBlock extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn(`Bloc santé indisponible: ${this.props.title}`, error?.message || error);
  }

  render() {
    if (this.state.hasError) {
      return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle size={16} className="inline" /> Cette partie demande une mise à jour. Tu peux continuer à utiliser les autres informations santé.</div>;
    }
    return this.props.children;
  }
}

export default function SanteV7(props) {
  const animauxCrud = useCrudModule('animaux');
  const avicoleCrud = useCrudModule('avicole');
  const onUpdateAnimal = props.onUpdateAnimal || animauxCrud.update;
  const onUpdateLot = props.onUpdateLot || avicoleCrud.update;
  const onRefreshAnimals = props.onRefreshAnimals || animauxCrud.refresh;
  const onRefreshLots = props.onRefreshLots || avicoleCrud.refresh;
  const animaux = props.animaux || animauxCrud.rows || [];
  const lots = props.lots || avicoleCrud.rows || [];

  return <div className="space-y-6 sante-mobile-structured">
    <style>{`@media (max-width: 640px){.sante-mobile-structured .rounded-2xl{border-radius:18px}.sante-mobile-structured table{font-size:12px}.sante-mobile-structured th,.sante-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.sante-mobile-structured .text-2xl{font-size:1.35rem}.sante-mobile-structured .grid{gap:.75rem}.sante-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

    <ModuleSection icon={HeartPulse} title="Soins et vaccins" subtitle="Créer et suivre les soins, vaccins, visites vétérinaires et actions de prévention.">
      <SafeHealthBlock title="Soins et vaccins"><SanteV6 {...props} animaux={animaux} lots={lots} /></SafeHealthBlock>
    </ModuleSection>

    <ModuleSection icon={ShieldCheck} title="Contrôle santé" subtitle="Voir les soins en retard, les produits utilisés et les points à vérifier.">
      <SafeHealthBlock title="Contrôle santé"><HealthQualityControl rows={props.rows || []} stocks={props.stocks || []} transactions={props.transactions || []} animaux={animaux} lots={lots} onUpdate={props.onUpdate} onUpdateAnimal={onUpdateAnimal} onUpdateLot={onUpdateLot} onRefresh={props.onRefresh} onRefreshAnimals={onRefreshAnimals} onRefreshLots={onRefreshLots} /></SafeHealthBlock>
    </ModuleSection>

    <ModuleSection icon={BarChart3} title="Évolution santé" subtitle="Suivre les retards, soins réalisés, coûts et tendances santé.">
      <SafeHealthBlock title="Évolution santé"><SanteEvolution rows={props.rows || []} onNavigate={props.onNavigate} /></SafeHealthBlock>
    </ModuleSection>
  </div>;
}
