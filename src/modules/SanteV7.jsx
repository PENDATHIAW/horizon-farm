import { Component } from 'react';
import { AlertTriangle, BarChart3, HeartPulse, RefreshCw, ShieldCheck } from 'lucide-react';
import useCrudModule from '../hooks/useCrudModule';
import HealthQualityControl from './HealthQualityControl.jsx';
import SanteSmartInterventions from './SanteV6.jsx';
import SanteEvolution from './SanteEvolution.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} aria-hidden="true" /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function HealthBlockError({ title, message, onRetry }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-black"><AlertTriangle size={17} aria-hidden="true" /> Bloc santé indisponible</p>
          <p className="mt-1 text-sm leading-relaxed">La section <b>{title}</b> n’a pas pu être chargée. Les autres parties du module restent utilisables.</p>
          {message ? <p className="mt-2 rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-xs text-amber-800">Détail technique : {message}</p> : null}
        </div>
        <button type="button" onClick={onRetry} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/25">
          <RefreshCw size={15} aria-hidden="true" /> Réessayer
        </button>
      </div>
    </div>
  );
}

class SafeHealthBlock extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || '' };
  }

  componentDidCatch(error) {
    console.warn(`Bloc santé indisponible: ${this.props.title}`, error?.message || error);
  }

  retry = () => this.setState({ hasError: false, message: '' });

  render() {
    if (this.state.hasError) {
      return <HealthBlockError title={this.props.title} message={this.state.message} onRetry={this.retry} />;
    }
    return this.props.children;
  }
}

export default function SanteV7(props) {
  const animauxCrud = useCrudModule('animaux');
  const avicoleCrud = useCrudModule('avicole');
  const stockCrud = useCrudModule('stock');
  const financesCrud = useCrudModule('finances');
  const documentsCrud = useCrudModule('documents');
  const tachesCrud = useCrudModule('taches');
  const alertesCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');
  const onUpdateAnimal = props.onUpdateAnimal || animauxCrud.update;
  const onUpdateLot = props.onUpdateLot || avicoleCrud.update;
  const onRefreshAnimals = props.onRefreshAnimals || animauxCrud.refresh;
  const onRefreshLots = props.onRefreshLots || avicoleCrud.refresh;
  const animaux = props.animaux || animauxCrud.rows || [];
  const lots = props.lots || avicoleCrud.rows || [];
  const stocks = props.stocks || stockCrud.rows || [];
  const transactions = props.transactions || financesCrud.rows || [];
  const healthInterconnectionProps = {
    animaux,
    lots,
    stocks,
    transactions,
    onUpdateAnimal,
    onUpdateLot,
    onRefreshAnimals,
    onRefreshLots,
    onUpdateStock: props.onUpdateStock || stockCrud.update,
    onRefreshStock: props.onRefreshStock || stockCrud.refresh,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onRefreshFinances: props.onRefreshFinances || financesCrud.refresh,
    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh,
    onCreateTask: props.onCreateTask || tachesCrud.create,
    onRefreshTasks: props.onRefreshTasks || tachesCrud.refresh,
    onCreateAlert: props.onCreateAlert || alertesCrud.create,
    onRefreshAlertes: props.onRefreshAlertes || alertesCrud.refresh,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
  };

  return <div className="space-y-6 sante-mobile-structured">
    <style>{`@media (max-width: 640px){.sante-mobile-structured .rounded-2xl{border-radius:18px}.sante-mobile-structured table{font-size:12px}.sante-mobile-structured th,.sante-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.sante-mobile-structured .text-2xl{font-size:1.35rem}.sante-mobile-structured .grid{gap:.75rem}.sante-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

    <ModuleSection icon={HeartPulse} title="Soins et vaccins" subtitle="Créer et suivre les soins, vaccins, visites vétérinaires et actions de prévention. La fiche s’adapte au type d’intervention choisi.">
      <SafeHealthBlock title="Soins et vaccins"><SanteSmartInterventions {...props} {...healthInterconnectionProps} /></SafeHealthBlock>
    </ModuleSection>

    <ModuleSection icon={ShieldCheck} title="Contrôle santé" subtitle="Voir les soins en retard, les produits utilisés et les points à vérifier.">
      <SafeHealthBlock title="Contrôle santé"><HealthQualityControl rows={props.rows || []} stocks={stocks} transactions={transactions} animaux={animaux} lots={lots} onUpdate={props.onUpdate} onUpdateAnimal={onUpdateAnimal} onUpdateLot={onUpdateLot} onRefresh={props.onRefresh} onRefreshAnimals={onRefreshAnimals} onRefreshLots={onRefreshLots} /></SafeHealthBlock>
    </ModuleSection>

    <ModuleSection icon={BarChart3} title="Évolution santé" subtitle="Suivre les retards, soins réalisés, coûts et tendances santé.">
      <SafeHealthBlock title="Évolution santé"><SanteEvolution rows={props.rows || []} transactions={transactions} onNavigate={props.onNavigate} /></SafeHealthBlock>
    </ModuleSection>
  </div>;
}
