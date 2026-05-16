import { Component, useState } from 'react';
import { BarChart3, HeartPulse, ShieldCheck } from 'lucide-react';
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
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function SanteV7(props) {
  const [showAdvancedHealth, setShowAdvancedHealth] = useState(false);
  const animauxCrud = useCrudModule('animaux');
  const avicoleCrud = useCrudModule('avicole');
  const onUpdateAnimal = props.onUpdateAnimal || animauxCrud.update;
  const onUpdateLot = props.onUpdateLot || avicoleCrud.update;
  const onRefreshAnimals = props.onRefreshAnimals || animauxCrud.refresh;
  const onRefreshLots = props.onRefreshLots || avicoleCrud.refresh;
  const animaux = props.animaux || animauxCrud.rows || [];
  const lots = props.lots || avicoleCrud.rows || [];

  return <div className={`space-y-6 sante-mobile-structured ${showAdvancedHealth ? 'sante-advanced-mode' : 'sante-simple-mode'}`}>
    <style>{`@media (max-width: 640px){.sante-mobile-structured .rounded-2xl{border-radius:18px}.sante-mobile-structured table{font-size:12px}.sante-mobile-structured th,.sante-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.sante-mobile-structured .text-2xl{font-size:1.35rem}.sante-mobile-structured .grid{gap:.75rem}.sante-mobile-structured .overflow-x-auto{max-width:100vw}}
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(5),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(6),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(7),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(13),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(15),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(16),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(17),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(18),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(21),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(22),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(23),
    .sante-simple-mode .sante-health-compact [class*="md:grid-cols-3"][class*="gap-3"] > :nth-child(24){display:none!important}`}</style>

    <ModuleSection icon={HeartPulse} title="Soins et vaccins" subtitle="Créer et suivre les soins, vaccins, visites vétérinaires et actions de prévention.">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
        <div>
          <p className="font-black text-[#2f2415]">Mode de saisie santé</p>
          <p className="text-xs text-[#8a7456]">Simple par défaut pour éviter le bruit. Les champs avancés restent disponibles au besoin.</p>
        </div>
        <button type="button" onClick={() => setShowAdvancedHealth((value) => !value)} className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white hover:bg-[#3d2f1d]">
          {showAdvancedHealth ? 'Masquer options avancées' : 'Afficher options avancées'}
        </button>
      </div>
      <SafeHealthBlock title="Soins et vaccins"><div className="sante-health-compact"><SanteV6 {...props} animaux={animaux} lots={lots} /></div></SafeHealthBlock>
    </ModuleSection>

    <ModuleSection icon={ShieldCheck} title="Contrôle santé" subtitle="Voir les soins en retard, les produits utilisés et les points à vérifier.">
      <SafeHealthBlock title="Contrôle santé"><HealthQualityControl rows={props.rows || []} stocks={props.stocks || []} transactions={props.transactions || []} animaux={animaux} lots={lots} onUpdate={props.onUpdate} onUpdateAnimal={onUpdateAnimal} onUpdateLot={onUpdateLot} onRefresh={props.onRefresh} onRefreshAnimals={onRefreshAnimals} onRefreshLots={onRefreshLots} /></SafeHealthBlock>
    </ModuleSection>

    <ModuleSection icon={BarChart3} title="Évolution santé" subtitle="Suivre les retards, soins réalisés, coûts et tendances santé.">
      <SafeHealthBlock title="Évolution santé"><SanteEvolution rows={props.rows || []} onNavigate={props.onNavigate} /></SafeHealthBlock>
    </ModuleSection>
  </div>;
}
